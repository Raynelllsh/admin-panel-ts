// src/components/entry-manager/student-firebase.tsx

"use client";

import { FormDataType } from "@/types";
// CHECK THIS IMPORT: Ensure it matches your project structure (e.g. "@/firebase" or "@/lib/firebase")
import { db } from "@/firebase"; 
import {
  collection,
  doc,
  getDoc,
  getDocs,
  limit as limitQuery,
  query,
  where,
  orderBy,
} from "firebase/firestore";

// --- Types ---

export interface FirebaseEnrollmentItem {
  id?: number | string;
  name?: string;
  dateStr?: string;
  timeSlot?: string;
  completed?: boolean;
  courseId?: string;
  courseName?: string;
  // Legacy support
  lessonId?: string;
  round?: string;
}

export interface FirebaseStudent {
  enrollment?: FirebaseEnrollmentItem[] | Record<string, any>;
  personalInfo?: {
    name?: string;
    sex?: string;
    level?: string;
    allergies?: string;
    favChar?: string;
    parentContact?: string;
    parentName?: string;
    comfortMethod?: string;
    chineseName?: string;
    preferredLanguage?: string;
    condition?: string;
  };
}

export interface PotentialStudentData {
  name: string;
  possibleCourseId: string;
  studentId?: string;
  // Support both new array format and old single object format
  enrollment?: any[]; 
  lessonInfo?: {
    name: string;
    dateStr: string;
    timeSlot: string;
    courseId?: string;
    lessonId?: string;
  };
  status?: string;
}

// --- Helpers ---

export const DEFAULT_STUDENT_ID_OPTIONS_LIMIT = 300;

export const formatLessonDate = (dateStr: string, timeSlot?: string) => {
  if (!dateStr) return "";
  let start = "00:00";
  let end: string | undefined;

  if (timeSlot) {
    const rangeMatch = timeSlot.match(/(\d{2}:\d{2})\s*-\s*(\d{2}:\d{2})/);
    if (rangeMatch) {
      start = rangeMatch[1];
      end = rangeMatch[2];
    } else {
      const singleMatch = timeSlot.match(/(\d{2}:\d{2})/);
      if (singleMatch) {
        start = singleMatch[1];
      }
    }
  }
  return end ? `${dateStr}T${start}-${end}` : `${dateStr}T${start}`;
};

function getLocalYYYYMMDD(d: Date) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function suffixToIndex(s: string): number {
  let n = 0;
  for (const ch of s) {
    n = n * 26 + (ch.charCodeAt(0) - 97 + 1);
  }
  return n - 1;
}

function indexToSuffix(i: number): string {
  let n = i + 1;
  let out = "";
  while (n > 0) {
    n = n - 1;
    out = String.fromCharCode(97 + (n % 26)) + out;
    n = Math.floor(n / 26);
  }
  return out;
}

// --- Main Functions ---

/**
 * Fetches existing Student IDs AND Potential Student Names for autocomplete.
 */
export async function fetchStudentIdOptions(
  limitCount: number = DEFAULT_STUDENT_ID_OPTIONS_LIMIT
): Promise<string[]> {
  try {
    // 1. Fetch Real Student IDs
    const qStudents = query(collection(db, "students"), limitQuery(limitCount));
    const snapStudents = await getDocs(qStudents);
    const studentIds = snapStudents.docs.map((d) => d.id).filter(Boolean);

    // 2. Fetch Potential Student Names
    // FIXED: Query "potential_students" (with underscore)
    // ADDED: Order by 'createdAt' desc to show newest students first
    const qPotential = query(
      collection(db, "potential_students"), 
      orderBy("createdAt", "desc"), 
      limitQuery(limitCount)
    );
    const snapPotential = await getDocs(qPotential);

    const potentialNames = snapPotential.docs.map(
      (d) => `${d.data().name} (Potential)`
    );

    // 3. Combine
    // Note: We don't strictly sort the final list alphabetically because 
    // we want you to see the options. The UI ribbon filters them anyway.
    const allOptions = [...studentIds, ...potentialNames];
    
    return allOptions;
  } catch (e) {
    console.error("Error loading options:", e);
    // Fallback: return empty list so the app doesn't crash
    return [];
  }
}

/**
 * Low-level fetch for a real student document
 */
export async function fetchStudentDoc(
  studentId: string
): Promise<FirebaseStudent | null> {
  try {
    const ref = doc(db, "students", studentId);
    const snap = await getDoc(ref);
    if (!snap.exists()) return null;
    return snap.data() as FirebaseStudent;
  } catch (e) {
    console.error("Error fetching real student doc:", e);
    return null;
  }
}

/**
 * Generates the next receipt number based on previous receipts
 */
export async function getNextReceiptNo(studentId: string): Promise<string> {
  try {
    const prefix = `KIDS${studentId}`;
    const q = query(
      collection(db, "entries"),
      where("data.type", "==", "receipt"),
      where("data.studentId", "==", studentId)
    );
    const snap = await getDocs(q);

    let maxIdx = -1;
    for (const docSnap of snap.docs) {
      const row = docSnap.data() as any;
      const receiptNo = String(row?.data?.receiptNo ?? docSnap.id ?? "");
      const m = receiptNo.match(new RegExp(`${prefix}([a-z]*)`, "i"));
      if (!m) continue;
      const idx = suffixToIndex(m[1].toLowerCase());
      if (idx > maxIdx) maxIdx = idx;
    }
    return `${prefix}${indexToSuffix(maxIdx + 1)}`;
  } catch (e) {
    console.warn("Error generating receipt number:", e);
    return `KIDS${studentId}a`;
  }
}

/**
 * Maps a raw Firestore Student document to FormDataType
 */
export function mapStudentDocToFormData(
  studentId: string,
  raw: FirebaseStudent
): Partial<FormDataType> {
  const personal = raw.personalInfo ?? {};

  // Normalize enrollment to array
  let lessons: FirebaseEnrollmentItem[] = [];
  if (Array.isArray(raw.enrollment)) {
    lessons = raw.enrollment;
  } else if (raw.enrollment && typeof raw.enrollment === "object") {
    lessons = Object.values(raw.enrollment);
  }

  // Sort lessons by date
  const lessonsSorted = [...lessons].sort((a, b) => {
    const da = a?.dateStr ?? "";
    const db = b?.dateStr ?? "";
    if (da !== db) return da.localeCompare(db);
    return (Number(a?.id) || 0) - (Number(b?.id) || 0);
  });

  const firstCourseId = lessonsSorted.find((l) => l?.courseId)?.courseId ?? "";
  const firstCourseName =
    lessonsSorted.find((l) => l?.courseName)?.courseName ?? "";

  const mappedLessons = lessonsSorted.map((l) => {
    const dateStr = l?.dateStr ?? "";
    const timeSlot = l?.timeSlot ?? "";
    return {
      id: l?.id ?? undefined,
      name: l?.name ?? "",
      courseName: l?.courseName ?? "",
      completed: !!l?.completed,
      timeSlot,
      dateTime: formatLessonDate(dateStr, timeSlot),
      courseId: l?.courseId ?? "",
    };
  });

  const issueDate = getLocalYYYYMMDD(new Date());

  return {
    issueDate: issueDate as any,
    studentId: studentId as any,
    studentName: personal.name ?? ("" as any),
    sex: personal.sex ?? ("" as any),
    studyLevel: personal.level ?? ("" as any),
    allergies: personal.allergies ?? ("" as any),
    favChar: personal.favChar ?? ("" as any),
    parentName: personal.parentName ?? ("" as any),
    parentContact: personal.parentContact ?? ("" as any),
    waysToComfort: personal.comfortMethod ?? ("" as any),
    courseCode: firstCourseId as any,
    courseName: firstCourseName as any,
    lessons: mappedLessons as any,
  } as Partial<FormDataType>;
}

/**
 * Main entry point: Fetches student data for the form.
 */
export async function fetchStudentFormData(
  studentIdInput: string
): Promise<Partial<FormDataType> | null> {
  if (!studentIdInput) return null;

  // 1. CLEANUP INPUT
  // This removes the " (Potential)" suffix so we can search the DB by name
  const cleanInput = studentIdInput.replace(" (Potential)", "").trim();
  console.log("Fetching data for:", cleanInput);

  // --- A. TRY REAL STUDENT FIRST ---
  const rawStudent = await fetchStudentDoc(cleanInput);
  if (rawStudent) {
    console.log("Found real student:", cleanInput);
    const base = mapStudentDocToFormData(cleanInput, rawStudent);
    const receiptNo = await getNextReceiptNo(cleanInput);
    return { ...base, receiptNo: receiptNo as any };
  }

  // --- B. TRY POTENTIAL STUDENT ---
  try {
    const q = query(
      collection(db, "potential_students"),
      where("name", "==", cleanInput)
    );
    const snap = await getDocs(q);

    if (!snap.empty) {
      console.log("Found potential student:", cleanInput);
      const ps = snap.docs[0].data() as PotentialStudentData;
      
      let lessons = [];

      // 1. CHECK FOR NEW ARRAY FORMAT
      if (ps.enrollment && Array.isArray(ps.enrollment)) {
        lessons = ps.enrollment.map((l: any) => ({
          id: l.id,
          name: l.name,
          dateStr: l.dateStr,
          timeSlot: l.timeSlot,
          dateTime: formatLessonDate(l.dateStr, l.timeSlot),
          courseId: l.courseId,
          courseName: l.courseName || ps.possibleCourseId,
          completed: !!l.completed,
        }));
      } 
      // 2. FALLBACK TO OLD SINGLE OBJECT FORMAT
      else if (ps.lessonInfo) {
        lessons = [
          {
            name: ps.lessonInfo.name,
            dateStr: ps.lessonInfo.dateStr,
            timeSlot: ps.lessonInfo.timeSlot,
            dateTime: formatLessonDate(
              ps.lessonInfo.dateStr,
              ps.lessonInfo.timeSlot
            ),
            courseId: ps.possibleCourseId,
            courseName: ps.possibleCourseId,
          },
        ];
      }

      // Use name as ID since potential students don't have a real Student ID yet
      const virtualId = ps.studentId || ps.name;

      return {
        studentId: virtualId as any,
        studentName: ps.name as any,
        courseCode: ps.possibleCourseId as any,
        lessons: lessons as any,
        // Fill defaults for missing info
        sex: "M",
        studyLevel: "K1",
        allergies: "NIL",
        issueDate: getLocalYYYYMMDD(new Date()) as any,
        receiptNo: "" as any,
      } as Partial<FormDataType>;
    } else {
      console.log("No potential student found for name:", cleanInput);
    }
  } catch (e) {
    console.error("Error fetching potential student:", e);
  }

  return null;
}
