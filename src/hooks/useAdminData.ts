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
  updateDoc,
  deleteDoc,
} from "firebase/firestore";
import {
  DEFAULT_LESSON_NAMES,
  addDays,
  getCategoryFromId,
  MAX_STUDENTS,
} from "@/utils/adminConstants";
import { Course, Student, Lesson, StudentLesson, AdminDataHook } from "@/types";

// Helper Interface for payload handling
type SyncAction = "enroll_course" | "add_lesson" | "remove_lesson";
type SyncPayload = StudentLesson[] | StudentLesson | { courseId: string; id: string | number };

export function useAdminData(): AdminDataHook {
  // --- GLOBAL STATE ---
  const [allCourses, setAllCourses] = useState<Course[]>([]);
  const [allStudents, setAllStudents] = useState<Student[]>([]);
  const [loading, setLoading] = useState(true);

  // --- FILTER STATE ---
  const [availableCategories, setAvailableCategories] = useState<string[]>([]);
  const [availableRounds, setAvailableRounds] = useState<string[]>([]);

  // --- HELPER: Save Course to DB ---
  const saveCourseToFirebase = async (course: Course) => {
    try {
      const category = course.path?.category || "Uncategorized";
      const lessonsToSave = course.lessons.map((l) => ({
        id: l.id,
        name: l.name,
        dateStr: l.dateStr,
        completed: l.completed || false,
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

  // --- HELPER: Sync Student Profile ---
  const syncStudentProfile = async (studentCode: string, action: SyncAction, payload: SyncPayload) => {
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

        if (item.lessons && Array.isArray(item.lessons)) {
          flatEnrollment.push(
            ...item.lessons.map((l: any) => ({
              id: String(l.id),
              lessonId: String(l.id), // FIX: Explicitly assign lessonId
              name: l.name,
              dateStr: l.dateStr,
              timeSlot: l.timeSlot || "",
              completed: l.completed || false,
              courseId: l.courseId || item.courseId || fallbackId,
            }))
          );
        } else {
          flatEnrollment.push({
            ...item,
            id: String(item.id),
            lessonId: String(item.id), // FIX: Explicitly assign lessonId
            courseId: item.courseId || item.actualCourseId || fallbackId,
          });
        }
      });

      // 2. Perform Action
      const getKey = (l: StudentLesson | { courseId: string; id: string | number }) =>
        `${l.courseId}_${l.id || (l as any).lessonId}`;

      if (action === "enroll_course") {
        const newLessons = payload as StudentLesson[];
        const newKeys = new Set(newLessons.map((l) => getKey(l)));
        flatEnrollment = flatEnrollment.filter((l) => !newKeys.has(getKey(l)));
        flatEnrollment.push(...newLessons);
      } else if (action === "add_lesson") {
        const newLesson = payload as StudentLesson;
        flatEnrollment = flatEnrollment.filter((l) => getKey(l) !== getKey(newLesson));
        flatEnrollment.push(newLesson);
      } else if (action === "remove_lesson") {
        const target = payload as { courseId: string; id: string };
        flatEnrollment = flatEnrollment.filter((l) => getKey(l) !== getKey(target));
      }

      // 3. Sort & Save
      flatEnrollment.sort((a, b) => a.dateStr.localeCompare(b.dateStr));

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

  // --- LOAD DATA ---
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
          const parsedName = match ? match[1] : docId;
          const parsedRound = match ? match[2] : "round001";

          const sanitizedLessons: Lesson[] = (data.lessons || []).map((l: any) => ({
            id: String(l.id),
            name: l.name,
            dateStr: l.dateStr,
            completed: !!l.completed,
            students: [],
          }));

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

        // 2. Load Students
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
              
              const lId = String(item.id);

              finalEnrollment.push({
                id: lId,
                lessonId: lId, // FIX: Ensure lessonId is populated
                name: item.name,
                dateStr: item.dateStr,
                timeSlot: item.timeSlot,
                completed: item.completed,
                courseId: cId || "Unknown",
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

        // 3. Populate Timetable
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
          new Set(loadedCourses.map((c) => c.path?.category || "Uncategorized"))
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

  const createCourse = async (name: string, time: string, date: string, roundNumber: string): Promise<string> => {
    const lessons: Lesson[] = Array.from({ length: 12 }, (_, i) => ({
      id: String(i + 1),
      name: DEFAULT_LESSON_NAMES[i],
      dateStr: addDays(date, i * 7),
      completed: false,
      students: [],
    }));

    const category = getCategoryFromId(name);
    const roundName = "round" + String(roundNumber).padStart(3, "0");
    const compositeId = name + roundName;

    const newCourse: Course = {
      id: compositeId,
      name: name,
      timeSlot: time,
      lessons: lessons,
      path: { category, round: roundName },
    };

    setAllCourses((prev) => [...prev, newCourse]);

    if (!availableCategories.includes(category)) {
      setAvailableCategories((prev) => [...prev, category].sort());
    }
    if (!availableRounds.includes(roundName)) {
      setAvailableRounds((prev) => [...prev, roundName].sort());
    }

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

    const lessonsForStudent: StudentLesson[] = course.lessons.map((l) => ({
      completed: false,
      courseId: course.id,
      dateStr: l.dateStr,
      lessonId: l.id,
      id: l.id,
      name: l.name,
      timeSlot: course.timeSlot,
    }));

    await syncStudentProfile(studentId, "enroll_course", lessonsForStudent);

    setAllCourses((prev) =>
      prev.map((c) => {
        if (c.id === courseId) {
          return {
            ...c,
            lessons: c.lessons.map((l) => ({
              ...l,
              students: [...new Set([...l.students, studentId])],
            })),
          };
        }
        return c;
      })
    );

    return { success: true };
  };

  const addStudentToLesson = async (courseId: string, lessonId: string, studentId: string) => {
    const course = allCourses.find((c) => c.id === courseId);
    if (!course) return { success: false, msg: "Course not found" };

    const lesson = course.lessons.find((l) => l.id === lessonId);
    if (!lesson) return { success: false, msg: "Lesson not found" };

    if (lesson.students.length >= MAX_STUDENTS)
      return { success: false, msg: "Class full" };

    if (lesson.students.includes(studentId))
      return { success: false, msg: "Already in lesson" };

    const lessonData: StudentLesson = {
      completed: false,
      courseId: course.id,
      dateStr: lesson.dateStr,
      lessonId: lesson.id,
      id: lesson.id,
      name: lesson.name,
      timeSlot: course.timeSlot,
    };

    await syncStudentProfile(studentId, "add_lesson", lessonData);

    setAllCourses((prev) =>
      prev.map((c) => {
        if (c.id === courseId) {
          return {
            ...c,
            lessons: c.lessons.map((l) =>
              l.id === lessonId
                ? { ...l, students: [...l.students, studentId] }
                : l
            ),
          };
        }
        return c;
      })
    );

    return { success: true };
  };

  const removeStudentFromLesson = async (courseId: string, lessonId: string, studentCode: string) => {
    const course = allCourses.find((c) => c.id === courseId);
    if (!course) return;

    const target = { courseId: course.id, id: lessonId };

    await syncStudentProfile(studentCode, "remove_lesson", target);

    setAllCourses((prev) =>
      prev.map((c) => {
        if (c.id === courseId) {
          return {
            ...c,
            lessons: c.lessons.map((l) =>
              l.id === lessonId
                ? { ...l, students: l.students.filter((s) => s !== studentCode) }
                : l
            ),
          };
        }
        return c;
      })
    );
  };

  const rescheduleStudent = async (
    studentId: string,
    oldLesson: { courseId: string; lessonId: string },
    newLesson: { courseId: string; lessonId: string; dateStr: string; timeSlot: string }
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
      const enrCourseId = enr.courseId || (enr.courseName + enr.round);

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

    setAllCourses((prev) =>
      prev.map((course) => {
        let updatedLessons = course.lessons;

        if (course.id === oldCourseId) {
          updatedLessons = updatedLessons.map((l) =>
            l.id === oldLessonId
              ? { ...l, students: l.students.filter((id) => id !== studentId) }
              : l
          );
        }

        if (course.id === newCourseId) {
          updatedLessons = updatedLessons.map((l) =>
            l.id === newLessonId
              ? { ...l, students: [...new Set([...l.students, studentId])] }
              : l
          );
        }

        return { ...course, lessons: updatedLessons };
      })
    );

    return { success: true };
  };

  const toggleLessonCompletion = async (courseId: string, lessonId: string, isComplete: boolean) => {
    const course = allCourses.find((c) => c.id === courseId);
    if (!course) return;

    const updated = {
      ...course,
      lessons: course.lessons.map((l) =>
        l.id === lessonId ? { ...l, completed: isComplete } : l
      ),
    };

    setAllCourses((prev) => prev.map((c) => (c.id === updated.id ? updated : c)));
    await saveCourseToFirebase(updated);
  };

  // Fixed signature to accept startLessonId and numeric direction
  const shiftCourseDates = async (courseId: string, startLessonId: string, direction: number) => {
    const course = allCourses.find((c) => c.id === courseId);
    if (!course) return;

    const startIndex = course.lessons.findIndex(l => l.id === startLessonId);
    if (startIndex === -1) return;

    // Shift dates for the start lesson and all subsequent lessons
    const updatedLessons = course.lessons.map((lesson, index) => {
      if (index >= startIndex) {
        // Assume direction is in weeks (multiplier of 7)
        return { ...lesson, dateStr: addDays(lesson.dateStr, direction * 7) };
      }
      return lesson;
    });

    const updated = {
      ...course,
      lessons: updatedLessons,
    };

    setAllCourses((prev) => prev.map((c) => (c.id === updated.id ? updated : c)));
    await saveCourseToFirebase(updated);
  };

  return {
    allCourses,
    setAllCourses,
    allStudents,
    setAllStudents,
    loading,
    availableCategories,
    availableRounds,
    createCourse,
    deleteCourse,
    enrollStudentToCourse,
    addStudentToLesson,
    removeStudentFromLesson,
    toggleLessonCompletion,
    shiftCourseDates,
    saveCourseToFirebase,
    rescheduleStudent,
  };
}
