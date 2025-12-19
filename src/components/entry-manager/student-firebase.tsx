// student-firebase.tsx
"use client";

import { FormDataType } from "@/types";
import { db } from "@/lib/firebase";
import {
  collection,
  doc,
  getDoc,
  getDocs,
  limit as limitQuery,
  query,
  setDoc,
  updateDoc,
  where,
} from "firebase/firestore";

/**
 * Helper: build the editor's dateTime string from Firestore dateStr + timeSlot.
 */
function formatLessonDate(dateStr: string, timeSlot?: string) {
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
      if (singleMatch) start = singleMatch[1];
    }
  }

  return end ? `${dateStr}T${start}-${end}` : `${dateStr}T${start}`;
}

function getLocalYYYYMMDD(d = new Date()) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

/**
 * NEW FORMAT:
 * students/{studentId}:
 *  - personalInfo: {...}
 *  - enrollment: FirebaseEnrollmentItem[]   (each item is a lesson row)
 */
export type FirebaseEnrollmentItem = {
  id?: number;
  name?: string;
  dateStr?: string;
  timeSlot?: string;
  completed?: boolean;

  // New field shown in your doc:
  // e.g. "SPEC_C001round001"
  courseId?: string;
};

export type FirebaseStudent = {
  enrollment?: FirebaseEnrollmentItem[];
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
};

export const DEFAULT_STUDENT_ID_OPTIONS_LIMIT = 300;

export async function fetchStudentIdOptions(
  limitCount: number = DEFAULT_STUDENT_ID_OPTIONS_LIMIT
): Promise<string[]> {
  const q = query(collection(db, "students"), limitQuery(limitCount));
  const snap = await getDocs(q);
  const ids = snap.docs.map((d) => d.id).filter(Boolean);
  ids.sort();
  return ids;
}

export async function fetchStudentDoc(
  studentId: string
): Promise<FirebaseStudent | null> {
  const ref = doc(db, "students", studentId);
  const snap = await getDoc(ref);
  if (!snap.exists()) return null;
  return snap.data() as FirebaseStudent;
}

function suffixToIndex(s: string) {
  let n = 0;
  for (const ch of s) n = n * 26 + (ch.charCodeAt(0) - 97 + 1);
  return n - 1;
}

function indexToSuffix(i: number) {
  let n = i + 1;
  let out = "";
  while (n > 0) {
    n -= 1;
    out = String.fromCharCode(97 + (n % 26)) + out;
    n = Math.floor(n / 26);
  }
  return out;
}

export async function getNextReceiptNo(studentId: string) {
  const prefix = `KIDS_${studentId}`;

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

    const m = receiptNo.match(new RegExp(`^${prefix}([a-z]+)$`, "i"));
    if (!m) continue;

    const idx = suffixToIndex(m[1].toLowerCase());
    if (idx > maxIdx) maxIdx = idx;
  }

  return `${prefix}${indexToSuffix(maxIdx + 1)}`;
}

/**
 * If you still need courseName/courseCode for the form:
 * - In the new format you only have courseId.
 * - This keeps backward compatibility by setting courseCode=courseId
 *   and leaving courseName empty (or you can add a resolver later).
 */
export function mapStudentDocToFormData(
  studentId: string,
  raw: FirebaseStudent
): Partial<FormDataType> {
  const personal = raw.personalInfo ?? {};

  // NEW: enrollment is already a flat list of lessons
  const lessons: FirebaseEnrollmentItem[] = Array.isArray(raw.enrollment)
    ? raw.enrollment
    : [];

  const lessonsSorted = [...lessons].sort((a, b) => {
    const da = a?.dateStr ?? "";
    const dbb = b?.dateStr ?? "";
    if (da !== dbb) return da.localeCompare(dbb);
    return (a?.id ?? 0) - (b?.id ?? 0);
  });

  const firstCourseId = lessonsSorted.find((l) => l?.courseId)?.courseId ?? "";

  const mappedLessons = lessonsSorted.map((l) => {
    const dateStr = l?.dateStr ?? "";
    const timeSlot = l?.timeSlot ?? "";
    return {
      id: l?.id ?? undefined,
      name: l?.name ?? "",
      // Old fields no longer exist in the new format:
      courseName: "", // or resolve via a courseId->courseName mapping elsewhere
      completed: !!l?.completed,
      timeSlot,
      dateTime: formatLessonDate(dateStr, timeSlot),
      // Optional: if your FormDataType supports it, you can also pass courseId through.
      // courseId: l?.courseId ?? "",
    };
  });

  const issueDate = getLocalYYYYMMDD();

  return {
    issueDate: issueDate as any,

    studentId: studentId as any,
    studentName: (personal.name ?? "") as any,
    sex: (personal.sex ?? "") as any,
    studyLevel: (personal.level ?? "") as any,
    allergies: (personal.allergies ?? "") as any,
    favChar: (personal.favChar ?? "") as any,
    parentName: (personal.parentName ?? "") as any,
    parentContact: (personal.parentContact ?? "") as any,
    waysToComfort: (personal.comfortMethod ?? "") as any,

    // New reality: only have courseId (so store into courseCode)
    courseCode: firstCourseId as any,
    courseName: "" as any,

    lessons: mappedLessons as any,
  } as Partial<FormDataType>;
}

export async function fetchStudentFormData(
  studentId: string
): Promise<Partial<FormDataType> | null> {
  const raw = await fetchStudentDoc(studentId);
  if (!raw) return null;

  const base = mapStudentDocToFormData(studentId, raw);
  const receiptNo = await getNextReceiptNo(studentId);

  return { ...base, receiptNo: receiptNo as any };
}

export async function upsertStudentDoc(
  studentId: string,
  patch: Partial<FirebaseStudent>
): Promise<void> {
  const ref = doc(db, "students", studentId);
  await setDoc(ref, patch as any, { merge: true });
}

export async function updateStudentDoc(
  studentId: string,
  patch: Partial<FirebaseStudent>
): Promise<void> {
  const ref = doc(db, "students", studentId);
  await updateDoc(ref, patch as any);
}
