// src/hooks/useAdminData.ts

"use client";

import { useState, useEffect } from "react";
import { db } from "@/firebase";
import {
  collection,
  doc,
  setDoc,
  getDoc,
  getDocs,
  addDoc,
  updateDoc,
  deleteDoc,
  query,
  where,
  onSnapshot,
  Timestamp,
} from "firebase/firestore";
import {
  DEFAULT_LESSON_NAMES,
  addDays,
  getCategoryFromId,
  MAX_STUDENTS,
} from "@/utils/adminConstants";
import { Course, Student, Lesson, StudentLesson } from "@/types";

// --- NEW INTERFACE FOR POTENTIAL STUDENTS ---
export interface PotentialStudent {
  id: string;
  name: string;
  possibleCourseId: string;
  enrollment: StudentLesson[]; // Changed to Array to match Student
  createdAt: any;
  status: "potential";
}

// --- NEW INTERFACE FOR REQUESTS ---
export interface LessonChangeRequest {
  id: string;
  studentId: string;
  studentName: string;
  courseCode: string;
  courseName: string;
  reason: string;
  status: "pending" | "approved" | "rejected";
  submitTime: string;
  makeupOption: string;
  lesson: {
    courseId: string;
    dateStr: string;
    id: number | string;
    name: string;
    timeSlot: string;
  };
  selectedTimeSlot: {
    courseId: string;
    date: string;
    lessonId: string;
    name: string;
    time: string;
  };
}

// Helper Interface for payload handling
type SyncAction = "enroll_course" | "add_lesson" | "remove_lesson";
type SyncPayload =
  | StudentLesson[]
  | StudentLesson
  | { courseId: string; id: string | number };

export function useAdminData() {
  // --- GLOBAL STATE ---
  const [allCourses, setAllCourses] = useState<Course[]>([]);
  const [allStudents, setAllStudents] = useState<Student[]>([]);
  const [loading, setLoading] = useState(true);

  // --- NEW STATE: REQUESTS ---
  const [requests, setRequests] = useState<LessonChangeRequest[]>([]);

  // --- NEW STATE: POTENTIAL STUDENTS ---
  const [potentialStudents, setPotentialStudents] = useState<PotentialStudent[]>([]);

  // --- FILTER STATE ---
  const [availableCategories, setAvailableCategories] = useState<string[]>([]);
  const [availableRounds, setAvailableRounds] = useState<string[]>([]);

  // --- HELPER: Save Course to DB ---
  const saveCourseToFirebase = async (course: Course) => {
    try {
      const category = course.id.split("_")[0] || "Uncategorized";

      // Include 'students' array in the saved data
      const lessonsToSave = course.lessons.map((l) => ({
        id: String(l.id),
        name: l.name,
        dateStr: l.dateStr,
        completed: l.completed || false,
        students: l.students || [], // Persist student list in course doc
      }));

      const docId = course.id;
      const docRef = doc(db, "courses", docId);

      await setDoc(docRef, {
        id: docId,
        category, // Store category for filtering
        timeSlot: course.timeSlot,
        lessons: lessonsToSave,
      });
    } catch (e) {
      console.error("Error saving course:", e);
    }
  };

  const reschedulePotentialStudent = async (
    studentId: string,
    oldLesson: { lessonId: string },
    newLesson: {
      courseId: string;
      lessonId: string;
      dateStr: string;
      timeSlot: string;
    }
  ) => {
    try {
      const studentRef = doc(db, "potential_students", studentId);
      const studentSnap = await getDoc(studentRef);

      if (!studentSnap.exists()) {
        return { success: false, msg: "Potential student not found" };
      }

      const data = studentSnap.data();
      let updatedEnrollment = data.enrollment || [];

      // Find the target course details to update names if needed
      const newCourse = allCourses.find((c) => c.id === newLesson.courseId);
      const newCourseName = newCourse ? newCourse.name : "";

      // Update the specific lesson in the array
      updatedEnrollment = updatedEnrollment.map((l: any) => {
        // Match by Lesson ID (e.g. "1", "2")
        if (String(l.id) === String(oldLesson.lessonId)) {
          return {
            ...l,
            courseId: newLesson.courseId,
            courseName: newCourseName || l.courseName, // Update course name
            dateStr: newLesson.dateStr,
            timeSlot: newLesson.timeSlot,
            // We do NOT change the 'completed' status
          };
        }
        return l;
      });

      // Save to Firestore
      await updateDoc(studentRef, {
        enrollment: updatedEnrollment,
      });

      // Update Local State
      setPotentialStudents((prev) =>
        prev.map((s) =>
          s.id === studentId ? { ...s, enrollment: updatedEnrollment } : s
        )
      );

      return { success: true };
    } catch (error: any) {
      console.error("Error rescheduling potential student:", error);
      return { success: false, msg: error.message };
    }
  };

  // --- HELPER: Sync Student Profile ---
  const syncStudentProfile = async (
    studentCode: string,
    action: SyncAction,
    payload: SyncPayload
  ) => {
    try {
      const studentRef = doc(db, "students", studentCode);
      const studentSnap = await getDoc(studentRef);
      if (!studentSnap.exists()) return;

      const data = studentSnap.data();
      const rawEnrollment = data.enrollment || [];
      let flatEnrollment: StudentLesson[] = [];

      // 1. Normalize Enrollment Data
      const currentArray = Array.isArray(rawEnrollment)
        ? rawEnrollment
        : Object.values(rawEnrollment);

      currentArray.forEach((item: any) => {
        const fallbackId = (item.courseName || "") + (item.round || "");
        const itemCourseName = item.courseName || "";

        if (item.lessons && Array.isArray(item.lessons)) {
          flatEnrollment.push(
            ...item.lessons.map((l: any) => ({
              id: String(l.id),
              lessonId: String(l.id),
              name: l.name,
              dateStr: l.dateStr,
              timeSlot: l.timeSlot || "",
              completed: l.completed || false,
              courseId: l.courseId || item.courseId || fallbackId,
              courseName: l.courseName || itemCourseName || "",
            }))
          );
        } else {
          flatEnrollment.push({
            ...item,
            id: String(item.id),
            lessonId: String(item.id),
            courseId: item.courseId || item.actualCourseId || fallbackId,
            courseName: itemCourseName || "",
          });
        }
      });

      // 2. Perform Action
      const getKey = (
        l: StudentLesson | { courseId: string; id: string | number }
      ) => `${l.courseId}_${l.id || (l as any).lessonId}`;

      if (action === "enroll_course") {
        const newLessons = payload as StudentLesson[];
        const newKeys = new Set(newLessons.map((l) => getKey(l)));
        flatEnrollment = flatEnrollment.filter((l) => !newKeys.has(getKey(l)));
        flatEnrollment.push(...newLessons);
      } else if (action === "add_lesson") {
        const newLesson = payload as StudentLesson;
        // UPDATED: Remove ANY existing lesson with the same lessonId (swapping logic)
        // This prevents a student from being in "Lesson 1" in two different courses simultaneously
        flatEnrollment = flatEnrollment.filter(
          (l) => l.lessonId !== newLesson.lessonId
        );
        flatEnrollment.push(newLesson);
      } else if (action === "remove_lesson") {
        const target = payload as { courseId: string; id: string };
        flatEnrollment = flatEnrollment.filter(
          (l) => getKey(l) !== getKey(target)
        );
      }

      // 3. Sort & Save
      flatEnrollment.sort(
        (a, b) => a.dateStr?.localeCompare(b.dateStr || "") || 0
      );

      await updateDoc(studentRef, {
        enrollment: flatEnrollment,
      });

      setAllStudents((prev) =>
        prev.map((s) =>
          s.id === studentCode ? { ...s, enrollment: flatEnrollment } : s
        )
      );

      return flatEnrollment;
    } catch (e) {
      console.error("Sync error:", e);
    }
  };

  // --- NEW LISTENER: Fetch Requests (Real-time) ---
  useEffect(() => {
    const q = query(
      collection(db, "requests"),
      where("status", "==", "pending")
    );
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const reqs: LessonChangeRequest[] = [];
      snapshot.forEach((doc) => {
        reqs.push({ id: doc.id, ...doc.data() } as LessonChangeRequest);
      });
      // Sort by submit time (newest first)
      reqs.sort(
        (a, b) =>
          new Date(b.submitTime).getTime() - new Date(a.submitTime).getTime()
      );
      setRequests(reqs);
    });
    return () => unsubscribe();
  }, []);

  // --- NEW LISTENER: Potential Students (Real-time) ---
  useEffect(() => {
    const q = query(collection(db, "potential_students"));
    const unsub = onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      })) as PotentialStudent[];
      setPotentialStudents(data);
    });
    return () => unsub();
  }, []);

  // --- NEW FUNCTION: Add Potential Student ---
  // src/hooks/useAdminData.ts

const addPotentialStudent = async (
  name: string,
  courseId: string,
  // We keep this argument for backward compatibility, but we won't strictly need it 
  // if we find the course in allCourses.
  trialLessonInfo?: any 
) => {
  try {
    // 1. Find the course object to get the full schedule
    const course = allCourses.find((c) => c.id === courseId);

    let fullEnrollment: any[] = [];

    if (course) {
      // 2. Extract all 12 lessons from the course
      fullEnrollment = course.lessons.map((lesson) => ({
        id: lesson.id,
        lessonId: lesson.id,
        name: lesson.name,
        dateStr: lesson.dateStr,
        timeSlot: course.timeSlot, // Use course time for all lessons
        courseId: course.id,
        courseName: course.name,
        completed: false,
      }));
    } else if (trialLessonInfo) {
      // Fallback: If course not found (rare), use the single trial lesson info
      fullEnrollment = [trialLessonInfo];
    }

    // 3. Save to Firestore with the full enrollment array
    await addDoc(collection(db, "potential_students"), {
      name,
      possibleCourseId: courseId,
      enrollment: fullEnrollment, // <--- SAVING ALL 12 LESSONS HERE
      status: "potential",
      createdAt: Timestamp.now(),
    });

    return { success: true };
  } catch (error: any) {
    console.error("Error adding potential student:", error);
    return { success: false, msg: error.message };
  }
};


  // --- NEW FUNCTION: Remove Potential Student ---
  const removePotentialStudent = async (id: string) => {
    try {
      await deleteDoc(doc(db, "potential_students", id));
      // Optimistic update
      setPotentialStudents((prev) => prev.filter((s) => s.id !== id));
      return { success: true };
    } catch (error: any) {
      console.error("Error removing potential student:", error);
      return { success: false, msg: error.message };
    }
  };

  // --- LOAD INITIAL DATA ---
  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);

        // 1. Load ALL Courses
        const loadedCourses: Course[] = [];
        const coursesSnap = await getDocs(collection(db, "courses"));

        coursesSnap.forEach((snap) => {
          const data = snap.data();
          const docId = snap.id;
          const match = docId.match(/(.*)(round\d+)$/);
          const parsedName = match ? match[1].replace(/_$/, "") : docId;
          const parsedRound = match ? match[2] : "round001";

          const sanitizedLessons: Lesson[] = (data.lessons || []).map(
            (l: any) => ({
              id: String(l.id),
              name: l.name,
              dateStr: l.dateStr,
              completed: !!l.completed,
              students: l.students || [], // Load students from DB
            })
          );

          loadedCourses.push({
            id: docId,
            name: parsedName,
            timeSlot: data.timeSlot,
            lessons: sanitizedLessons,
            path: {
              category: data.category || "Uncategorized",
              round: parsedRound,
            },
          });
        });

        loadedCourses.sort((a, b) => a.name.localeCompare(b.name));

        // 2. Load Students & Hydrate
        const studentsSnapshot = await getDocs(collection(db, "students"));
        const loadedStudents: Student[] = [];

        studentsSnapshot.forEach((docSnap) => {
          const studentId = docSnap.id;
          const studentData = docSnap.data();
          let finalEnrollment: StudentLesson[] = [];

          const raw = studentData.enrollment;
          if (raw) {
            const list = Array.isArray(raw) ? raw : Object.values(raw);
            list.forEach((item: any) => {
              const cId =
                item.courseId ||
                item.actualCourseId ||
                (item.courseName || "") + (item.round || "");

              const lId = String(item.id || item.lessonId);

              // Hydration: Get details from course definition
              const sourceCourse = loadedCourses.find((c) => c.id === cId);
              const sourceLesson = sourceCourse?.lessons.find(
                (l) => l.id === lId
              );

              finalEnrollment.push({
                id: lId,
                lessonId: lId,
                courseId: cId || "Unknown",
                name: sourceLesson?.name || item.name || "Unknown Lesson",
                dateStr: sourceLesson?.dateStr || item.dateStr || "",
                timeSlot: sourceCourse?.timeSlot || item.timeSlot || "",
                completed: item.completed || false,
                courseName: sourceCourse?.name || item.courseName || "",
              });
            });
          }

          loadedStudents.push({
            id: studentId,
            name: studentData.personalInfo?.name || "Unknown",
            personalInfo: studentData.personalInfo || {},
            enrollment: finalEnrollment,
          });
        });

        loadedStudents.sort((a, b) => a.id.localeCompare(b.id));

        // 3. Populate Timetable (Reverse sync check)
        loadedStudents.forEach((student) => {
          student.enrollment.forEach((enrollmentItem) => {
            const targetCourse = loadedCourses.find(
              (c) => c.id === enrollmentItem.courseId
            );
            if (targetCourse) {
              const targetLesson = targetCourse.lessons.find(
                (l) => l.id === enrollmentItem.id
              );
              if (targetLesson) {
                if (!targetLesson.students.includes(student.id)) {
                  targetLesson.students.push(student.id);
                }
              }
            }
          });
        });

        setAllCourses(loadedCourses);
        setAllStudents(loadedStudents);

        const uniqueCats = Array.from(
          new Set(
            loadedCourses.map((c) => c.path?.category || "Uncategorized")
          )
        ).sort();

        const uniqueRounds = Array.from(
          new Set(loadedCourses.map((c) => c.path?.round || "round001"))
        ).sort();

        setAvailableCategories(uniqueCats);
        setAvailableRounds(uniqueRounds);
      } catch (e) {
        console.error("Error loading data:", e);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  // --- ACTIONS ---

  const createCourse = async (
    name: string,
    time: string,
    date: string,
    roundNumber: string
  ): Promise<string | undefined> => {
    const lessons: Lesson[] = Array.from({ length: 12 }, (_, i) => ({
      id: String(i + 1),
      name: DEFAULT_LESSON_NAMES[i],
      dateStr: addDays(date, i * 7),
      completed: false,
      students: [],
    }));

    const category = getCategoryFromId(name);
    const roundName = roundNumber.startsWith("round")
      ? roundNumber
      : "round" + String(roundNumber).padStart(3, "0");

    const compositeId = `${name}_${roundName}`;

    const newCourse: Course = {
      id: compositeId,
      name: name,
      timeSlot: time,
      lessons: lessons,
      path: { category, round: roundName },
    };

    // 1. UPDATE LOCAL STATE
    setAllCourses((prev) => [...prev, newCourse]);
    if (!availableCategories.includes(category)) {
      setAvailableCategories((prev) => [...prev, category].sort());
    }
    if (!availableRounds.includes(roundName)) {
      setAvailableRounds((prev) => [...prev, roundName].sort());
    }

    // 2. SAVE TO FIREBASE (Moved outside the IF blocks)
    await saveCourseToFirebase(newCourse);
    return category;
  };

  const deleteCourse = async (courseId: string) => {
    try {
      await deleteDoc(doc(db, "courses", courseId));
      setAllCourses((prev) => prev.filter((c) => c.id !== courseId));
    } catch (e) {
      console.error(e);
    }
  };

  const enrollStudentToCourse = async (courseId: string, studentId: string) => {
    const course = allCourses.find((c) => c.id === courseId);
    if (!course) return { success: false, msg: "Course not found" };

    const lessonsForStudent: StudentLesson[] = course.lessons.map(
      (l) =>
        ({
          completed: false,
          courseId: course.id,
          courseName: course.name, // Save Course Name
          lessonId: l.id,
          id: l.id,
          name: l.name, // Save Lesson Name
          dateStr: l.dateStr, // Save Lesson Date
          timeSlot: course.timeSlot, // Save Time Slot
        } as StudentLesson)
    );

    await syncStudentProfile(studentId, "enroll_course", lessonsForStudent);

    const updatedCourse = {
      ...course,
      lessons: course.lessons.map((l) => ({
        ...l,
        students: [...new Set([...l.students, studentId])],
      })),
    };

    setAllCourses((prev) =>
      prev.map((c) => (c.id === courseId ? updatedCourse : c))
    );

    await saveCourseToFirebase(updatedCourse);
    return { success: true };
  };

  // --- NEW FUNCTION: Promote Potential to Enrolled ---
  const promotePotentialStudent = async (
    potentialId: string,
    targetStudentId: string,
    name: string,
    courseId: string
  ) => {
    try {
      // 1. Check/Create Student Profile
      const studentRef = doc(db, "students", targetStudentId);
      const studentSnap = await getDoc(studentRef);

      if (!studentSnap.exists()) {
        const newStudent: Student = {
          id: targetStudentId,
          name: name,
          personalInfo: {
            name: name,
            chineseName: "",
            preferredLanguage: "Cantonese",
            sex: "M",
            level: "K1",
            allergies: "NIL",
            parentContact: "",
            comfortMethod: "",
            condition: "",
            favChar: "",
            parentName: "",
          },
          enrollment: [],
        };
        await setDoc(studentRef, newStudent);
        setAllStudents((prev) => [...prev, newStudent]);
      }

      // 2. Enroll in Course (reuse existing logic)
      const enrollResult = await enrollStudentToCourse(courseId, targetStudentId);
      if (!enrollResult.success) {
        throw new Error(enrollResult.msg || "Enrollment failed");
      }

      // 3. Remove from Potential List
      await removePotentialStudent(potentialId);
      return { success: true };
    } catch (error: any) {
      console.error("Error promoting student:", error);
      return { success: false, msg: error.message };
    }
  };

  const addStudentToLesson = async (
    courseId: string,
    lessonId: string,
    studentId: string
  ) => {
    // 1. Fetch Fresh Course & Student Data
    // We fetch the student directly to ensure we have their latest enrollment
    const studentRef = doc(db, "students", studentId);
    const studentSnap = await getDoc(studentRef);
    
    // Safety check: if student doesn't exist in DB
    if (!studentSnap.exists()) {
      return { success: false, msg: "Student not found" };
    }

    const studentData = studentSnap.data();
    // Normalize enrollment to an array
    const currentEnrollment = Array.isArray(studentData.enrollment) 
      ? studentData.enrollment 
      : Object.values(studentData.enrollment || {});

    const course = allCourses.find((c) => c.id === courseId);
    if (!course) return { success: false, msg: "Course not found" };

    const lesson = course.lessons.find((l) => l.id === lessonId);
    if (!lesson) return { success: false, msg: "Lesson not found" };
    // 1. Check Capacity
    if (lesson.students.length >= MAX_STUDENTS)
      return { success: false, msg: "Class full" };

    // 2. Check Capacity
    if (lesson.students.length >= MAX_STUDENTS) {
      return { success: false, msg: "Class full" };
    }

    // 3. Strict Check for Existing Student in THIS lesson
    const isAlreadyIn = lesson.students.some(
      (id) => String(id) === String(studentId)
    );
    if (isAlreadyIn) {
      return { success: false, msg: "Already in lesson" };
    }

    // 4. AUTO-SWAP: Check if student is in the SAME lesson ID but DIFFERENT course
    // We use the FRESH 'currentEnrollment' here, not the local state
    let oldCourseToUpdate: Course | null = null;

    const conflictingLesson = currentEnrollment.find(
      (enr: any) => String(enr.lessonId) === String(lessonId) && enr.courseId !== courseId
    );

    if (conflictingLesson) {
      // Find the old course to remove the student from
      const oldCourse = allCourses.find((c) => c.id === conflictingLesson.courseId);

      if (oldCourse) {
        oldCourseToUpdate = {
          ...oldCourse,
          lessons: oldCourse.lessons.map((l) =>
            String(l.id) === String(lessonId)
              ? { ...l, students: l.students.filter((id) => String(id) !== String(studentId)) }
              : l
          ),
        };
      }
    }

    // 5. Update Student Profile (Sync)
    const lessonData: StudentLesson = {
      completed: false,
      courseId: course.id,
      courseName: course.name,
      lessonId: lesson.id,
      id: lesson.id,
      name: lesson.name,
      dateStr: lesson.dateStr,
      timeSlot: course.timeSlot,
    } as StudentLesson;

    // This handles the student-side removal/addition
    await syncStudentProfile(studentId, "add_lesson", lessonData);

    // 6. Update Course State (New Course)
    const updatedNewCourse = {
      ...course,
      lessons: course.lessons.map((l) =>
        l.id === lessonId
          ? { ...l, students: Array.from(new Set([...l.students, studentId])) }
          : l
      ),
    };

    // Update ALL courses in local state (New + potential Old one)
    setAllCourses((prev) =>
      prev.map((c) => {
        if (c.id === updatedNewCourse.id) return updatedNewCourse;
        if (oldCourseToUpdate && c.id === oldCourseToUpdate.id) return oldCourseToUpdate;
        return c;
      })
    );

    // 7. Persist to Firebase
    await saveCourseToFirebase(updatedNewCourse);
    if (oldCourseToUpdate) {
      await saveCourseToFirebase(oldCourseToUpdate);
    }

    return { success: true };
  };


  const removeStudentFromLesson = async (
    courseId: string,
    lessonId: string,
    studentCode: string
  ) => {
    const course = allCourses.find((c) => c.id === courseId);
    if (!course) return;

    const target = { courseId: course.id, id: lessonId };
    await syncStudentProfile(studentCode, "remove_lesson", target);

    const updatedCourse = {
      ...course,
      lessons: course.lessons.map((l) =>
        l.id === lessonId
          ? { ...l, students: l.students.filter((s) => s !== studentCode) }
          : l
      ),
    };

    setAllCourses((prev) =>
      prev.map((c) => (c.id === courseId ? updatedCourse : c))
    );

    await saveCourseToFirebase(updatedCourse);
  };

  const rescheduleStudent = async (
    studentId: string,
    oldLesson: { courseId: string; lessonId: string },
    newLesson: {
      courseId: string;
      lessonId: string;
      dateStr: string;
      timeSlot: string;
    }
  ) => {
    const oldCourseId = oldLesson.courseId;
    const oldLessonId = oldLesson.lessonId;
    const newCourseId = newLesson.courseId;
    const newLessonId = newLesson.lessonId;
    const newDate = newLesson.dateStr;
    const newTime = newLesson.timeSlot;

    const studentRef = doc(db, "students", studentId);
    const studentSnap = await getDoc(studentRef);

    if (!studentSnap.exists())
      return { success: false, msg: "Student not found" };

    const data = studentSnap.data();
    let updatedEnrollment = (data.enrollment || []) as StudentLesson[];

    updatedEnrollment = updatedEnrollment.map((enr: any) => {
      const enrId = String(enr.id);
      const enrCourseId = enr.courseId || enr.courseName + enr.round;
      if (enrCourseId === oldCourseId && enrId === oldLessonId) {
        return {
          ...enr,
          dateStr: newDate,
          timeSlot: newTime,
          courseId: newCourseId,
        };
      }
      return enr;
    });

    await updateDoc(studentRef, { enrollment: updatedEnrollment });
    setAllStudents((prev) =>
      prev.map((s) =>
        s.id === studentId ? { ...s, enrollment: updatedEnrollment } : s
      )
    );

    let updatedOldCourse: Course | undefined;
    let updatedNewCourse: Course | undefined;

    setAllCourses((prev) =>
      prev.map((course) => {
        let updatedLessons = course.lessons;
        let isModified = false;

        if (course.id === oldCourseId) {
          updatedLessons = updatedLessons.map((l) =>
            l.id === oldLessonId
              ? { ...l, students: l.students.filter((id) => id !== studentId) }
              : l
          );
          isModified = true;
        }

        if (course.id === newCourseId) {
          updatedLessons = updatedLessons.map((l) =>
            l.id === newLessonId
              ? { ...l, students: [...new Set([...l.students, studentId])] }
              : l
          );
          isModified = true;
        }

        const newCourseObj = { ...course, lessons: updatedLessons };

        if (course.id === oldCourseId) updatedOldCourse = newCourseObj;
        if (course.id === newCourseId) updatedNewCourse = newCourseObj;

        return isModified ? newCourseObj : course;
      })
    );

    if (updatedOldCourse) await saveCourseToFirebase(updatedOldCourse);
    if (updatedNewCourse && newCourseId !== oldCourseId) {
      await saveCourseToFirebase(updatedNewCourse);
    }

    return { success: true };
  };

  const toggleLessonCompletion = async (
    courseId: string,
    lessonId: string,
    isComplete: boolean
  ) => {
    const course = allCourses.find((c) => c.id === courseId);
    if (!course) return;

    const updated = {
      ...course,
      lessons: course.lessons.map((l) =>
        l.id === lessonId ? { ...l, completed: isComplete } : l
      ),
    };

    setAllCourses((prev) =>
      prev.map((c) => (c.id === updated.id ? updated : c))
    );

    await saveCourseToFirebase(updated);
  };

  const shiftCourseDates = async (
    courseId: string,
    startLessonId: string,
    direction: number
  ) => {
    const course = allCourses.find((c) => c.id === courseId);
    if (!course) return;

    const startIndex = course.lessons.findIndex(
      (l) => l.id === startLessonId
    );

    if (startIndex === -1) return;

    const updatedLessons = course.lessons.map((lesson, index) => {
      if (index >= startIndex) {
        return {
          ...lesson,
          dateStr: addDays(lesson.dateStr, direction * 7),
        };
      }
      return lesson;
    });

    const updated = {
      ...course,
      lessons: updatedLessons,
    };

    setAllCourses((prev) =>
      prev.map((c) => (c.id === updated.id ? updated : c))
    );

    await saveCourseToFirebase(updated);
  };

  // --- NEW HELPER: Find Missing Lessons & Available Slots ---
  const findMissingLessons = (studentId: string) => {
    const student = allStudents.find((s) => s.id === studentId);
    if (!student) return [];

    // 1. Get IDs of lessons the student is currently enrolled in
    const enrolledLessonIds = new Set(
      student.enrollment.map((e) => String(e.lessonId))
    );

    const missingOptions: {
      lessonId: string;
      lessonName: string;
      availableSlots: {
        courseId: string;
        courseName: string;
        dateStr: string;
        timeSlot: string;
        lessonId: string;
      }[];
    }[] = [];

    // 2. Iterate through standard lessons
    DEFAULT_LESSON_NAMES.forEach((name, index) => {
      const targetId = String(index + 1);

      // If the student does NOT have this lesson ID in their enrollment
      if (!enrolledLessonIds.has(targetId)) {
        const slots: typeof missingOptions[0]["availableSlots"] = [];

        // 3. Find all courses that contain this specific lesson
        allCourses.forEach((course) => {
          const lesson = course.lessons.find((l) => String(l.id) === targetId);
          if (lesson) {
            // Check availability
            const isFull = lesson.students.length >= MAX_STUDENTS;
            if (!isFull) {
              slots.push({
                courseId: course.id,
                courseName: course.name,
                dateStr: lesson.dateStr,
                timeSlot: course.timeSlot,
                lessonId: targetId,
              });
            }
          }
        });

        // Sort slots by date (earliest first)
        slots.sort((a, b) => new Date(a.dateStr).getTime() - new Date(b.dateStr).getTime());

        if (slots.length > 0) {
          missingOptions.push({
            lessonId: targetId,
            lessonName: name,
            availableSlots: slots,
          });
        }
      }
    });

    return missingOptions;
  };

  // --- NEW FUNCTION: Handle Request Approval ---
  const handleRequest = async (
    request: LessonChangeRequest,
    action: "approve" | "reject"
  ) => {
    try {
      if (action === "reject") {
        const reqRef = doc(db, "requests", request.id);
        await updateDoc(reqRef, { status: "rejected" });
        return;
      }

      if (action === "approve") {
        const studentObj = allStudents.find(
          (s) => s.id === request.studentId
        );

        if (!studentObj) {
          alert("Error: Student not found in database.");
          return;
        }

        // 1. Remove from OLD lesson
        await removeStudentFromLesson(
          request.lesson.courseId,
          request.lesson.id.toString(),
          request.studentId
        );

        // 2. Add to NEW lesson
        await addStudentToLesson(
          request.selectedTimeSlot.courseId,
          request.selectedTimeSlot.lessonId,
          request.studentId
        );

        // 3. Mark request as approved
        const reqRef = doc(db, "requests", request.id);
        await updateDoc(reqRef, {
          status: "approved",
          reviewTime: new Date().toISOString(),
          reviewNote: "Approved via Admin Panel",
        });
      }
    } catch (error) {
      console.error("Error processing request:", error);
      alert("Failed to process request. Check console.");
    }
  };

  return {
    allCourses,
    setAllCourses,
    allStudents, 
    setAllStudents,
    loading,
    availableCategories,
    availableRounds,
    requests,
    potentialStudents,
    addPotentialStudent,
    removePotentialStudent,
    promotePotentialStudent,
    handleRequest,
    createCourse,
    deleteCourse,
    enrollStudentToCourse,
    addStudentToLesson,
    removeStudentFromLesson,
    toggleLessonCompletion,
    shiftCourseDates,
    saveCourseToFirebase,
    rescheduleStudent,
    findMissingLessons,
    reschedulePotentialStudent,
  };
}
