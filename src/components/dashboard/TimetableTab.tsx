// src/components/dashboard/TimetableTab.tsx
"use client";

import React, { useState, useMemo, useEffect } from "react";
import { formatDateDisplay, MAX_STUDENTS } from "../../utils/adminConstants";
import { Course, Student, Lesson } from "@/types";

// Ensure this interface in TimetableTab.tsx matches the fixed hook
interface TimetableTabProps {
  allCourses: Course[];
  allStudents: Student[];
  loading: boolean;
  availableCategories: string[];
  availableRounds: string[];
  createCourse: (name: string, time: string, date: string, roundNum: string) => Promise<string>;
  deleteCourse: (courseId: string) => Promise<void>;
  addStudentToLesson: (courseId: string, lessonId: string, studentId: string) => Promise<{ success: boolean; msg?: string }>;
  removeStudentFromLesson: (courseId: string, lessonId: string, studentId: string) => Promise<void>;
  toggleLessonCompletion: (courseId: string, lessonId: string, isComplete: boolean) => Promise<void>;
  shiftCourseDates: (courseId: string, startLessonId: string, direction: number) => Promise<void>;
  saveCourseToFirebase: (course: Course) => Promise<void>;
  rescheduleStudent: (
    studentId: string,
    oldLesson: { courseId: string; lessonId: string },
    newLesson: { courseId: string; lessonId: string; dateStr: string; timeSlot: string }
  ) => Promise<{ success: boolean; msg?: string }>;
}

interface CellData extends Lesson {
  count: number;
  isFull: boolean;
}

interface SelectedCell {
  courseId: string;
  lessonId: string;
}

export default function TimetableTab({
  allCourses,
  allStudents,
  loading,
  availableCategories,
  availableRounds,
  createCourse,
  deleteCourse,
  addStudentToLesson,
  removeStudentFromLesson,
  toggleLessonCompletion,
  shiftCourseDates,
  saveCourseToFirebase,
  rescheduleStudent,
}: TimetableTabProps) {
  // --- STATE ---
  const [filterCategory, setFilterCategory] = useState<string>("ALL");
  const [filterRound, setFilterRound] = useState<string>("ALL");
  const [selectedCell, setSelectedCell] = useState<SelectedCell | null>(null);
  const [selectedStudentToAdd, setSelectedStudentToAdd] = useState<string>("");

  // Create Form State
  const [createForm, setCreateForm] = useState({
    name: "",
    time: "",
    date: "",
    round: "round001",
  });

  // --- INITIAL FILTER SETUP ---
  useEffect(() => {
    if (availableCategories.length > 0 && filterCategory === "ALL") {
      setFilterCategory(availableCategories[0]);
    }
    if (availableRounds.length > 0 && filterRound === "ALL") {
      setFilterRound(availableRounds[0]);
    }
  }, [availableCategories, availableRounds, filterCategory, filterRound]);

  // --- DERIVED DATA ---
  const displayedCourses = useMemo(() => {
    return allCourses.filter((c) => {
      const category = c.path?.category || "Uncategorized";
      const round = c.path?.round || "round001";
      const matchCat = filterCategory === "ALL" || category === filterCategory;
      const matchRound = filterRound === "ALL" || round === filterRound;
      return matchCat && matchRound;
    });
  }, [allCourses, filterCategory, filterRound]);

  // --- HELPER WRAPPERS (Fixes Missing Functions) ---
  const onCreateCourse = async (name: string, time: string, date: string, roundNum: string) => {
    await createCourse(name, time, date, roundNum);
    // Return extracted category for the filter update
    const parts = name.split("-");
    return parts.length > 0 ? parts[0] : "Uncategorized";
  };

  const onDeleteCourse = async (course: Course) => {
    await deleteCourse(course.id);
  };

  const onAddStudent = async (cId: string, lId: string, sId: string) => {
    return await addStudentToLesson(cId, lId, sId);
  };

  const onRemoveStudent = async (cId: string, lId: string, sId: string) => {
    await removeStudentFromLesson(cId, lId, sId);
  };

  const onToggleCompletion = async (cId: string, lId: string) => {
    const course = allCourses.find((c) => c.id === cId);
    const lesson = course?.lessons.find((l) => l.id === lId);
    if (course && lesson) {
      await toggleLessonCompletion(cId, lId, !lesson.completed);
    }
  };

  const onShiftDates = async (cId: string, lId: string, direction: number) => {
    await shiftCourseDates(cId, lId, direction);
  };

  // --- HANDLERS ---
  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!createForm.name || !createForm.time || !createForm.date || !createForm.round) return;

    const roundNumber = createForm.round.replace("round", "");
    const cat = await onCreateCourse(
      createForm.name,
      createForm.time,
      createForm.date,
      roundNumber
    );

    setFilterCategory(cat);
    setFilterRound(createForm.round);
    setCreateForm({ name: "", time: "", date: "", round: "round001" });
  };

  const handleAdd = async () => {
    if (!selectedCell || !selectedStudentToAdd) return;
    const res = await onAddStudent(
      selectedCell.courseId,
      selectedCell.lessonId,
      selectedStudentToAdd
    );

    if (res?.success) {
      setSelectedStudentToAdd("");
    } else if (res?.msg) {
      alert(res.msg);
    }
  };

  // --- RENDER HELPERS ---
  const getCellData = (course: Course, lessonId: string): CellData | null => {
    const lesson = course.lessons.find((l) => l.id === lessonId);
    if (!lesson) return null;
    const count = lesson.students.length;
    const isFull = count >= MAX_STUDENTS;
    return { ...lesson, count, isFull };
  };

  const activeLessonData = useMemo(() => {
    if (!selectedCell) return null;
    const course = allCourses.find((c) => c.id === selectedCell.courseId);
    if (!course) return null;
    const lesson = course.lessons.find((l) => l.id === selectedCell.lessonId);
    if (!lesson) return null;
    return { course, lesson };
  }, [selectedCell, allCourses]);

  // Return JSX
  return (
    <div className="flex flex-col h-[calc(100vh-100px)] gap-4">
      {/* 1. TOP BAR: FILTERS & ACTIONS */}
      <div className="bg-white p-4 rounded shadow-sm border border-gray-200 flex flex-wrap gap-6 items-end justify-between shrink-0">
        {/* Filters */}
        <div className="flex gap-4">
          <div>
            <label className="block text-xs font-bold text-gray-500 uppercase mb-1">
              Category
            </label>
            <select
              className="border p-2 rounded text-sm min-w-[120px]"
              value={filterCategory}
              onChange={(e) => setFilterCategory(e.target.value)}
            >
              {availableCategories.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs font-bold text-gray-500 uppercase mb-1">
              Round
            </label>
            <select
              className="border p-2 rounded text-sm min-w-[120px]"
              value={filterRound}
              onChange={(e) => setFilterRound(e.target.value)}
            >
              <option value="ALL">ALL ROUNDS</option>
              {availableRounds.map((r) => (
                <option key={r} value={r}>
                  {r}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Quick Create Form */}
        <form
          onSubmit={handleCreate}
          className="flex gap-2 items-end border-l pl-4 border-gray-200"
        >
          <div className="flex flex-col">
            <label className="text-[10px] font-bold text-gray-400 uppercase">
              Course ID
            </label>
            <input
              className="border p-2 rounded text-sm w-24 placeholder:SPEC-C1"
              value={createForm.name}
              onChange={(e) =>
                setCreateForm({ ...createForm, name: e.target.value })
              }
            />
          </div>
          <div className="flex flex-col">
            <label className="text-[10px] font-bold text-gray-400 uppercase">
              Round
            </label>
            <select
              className="border p-2 rounded text-sm w-28"
              value={createForm.round}
              onChange={(e) =>
                setCreateForm({ ...createForm, round: e.target.value })
              }
            >
              {/* Show existing rounds plus a few future options */}
              {availableRounds.length > 0 ? (
                availableRounds.map((r) => (
                  <option key={r} value={r}>
                    {r}
                  </option>
                ))
              ) : (
                <option value="round001">round001</option>
              )}
              {/* Fallback extra rounds if array is empty or limited */}
              {!availableRounds.includes("round001") && <option value="round001">round001</option>}
              {!availableRounds.includes("round002") && <option value="round002">round002</option>}
              {!availableRounds.includes("round003") && <option value="round003">round003</option>}
            </select>
          </div>
          <div className="flex flex-col">
            <label className="text-[10px] font-bold text-gray-400 uppercase">
              Time
            </label>
            <input
              className="border p-2 rounded text-sm w-20 placeholder:10:00"
              value={createForm.time}
              onChange={(e) =>
                setCreateForm({ ...createForm, time: e.target.value })
              }
            />
          </div>
          <div className="flex flex-col">
            <label className="text-[10px] font-bold text-gray-400 uppercase">
              Start Date
            </label>
            <input
              type="date"
              className="border p-2 rounded text-sm"
              value={createForm.date}
              onChange={(e) =>
                setCreateForm({ ...createForm, date: e.target.value })
              }
            />
          </div>
          <button
            type="submit"
            className="bg-blue-600 text-white px-4 py-2 rounded text-sm font-bold hover:bg-blue-700 h-[38px]"
          >
            Create
          </button>
        </form>
      </div>

      {/* 2. MAIN TABLE AREA (Vertical Layout) */}
      <div className="flex-1 overflow-auto bg-white rounded shadow border border-gray-200 relative">
        <table className="w-full text-sm border-collapse relative">
          <thead className="sticky top-0 z-20 shadow-sm">
            <tr className="bg-gray-50 border-b">
              {/* Sticky Corner */}
              <th className="p-3 border-r bg-gray-100 text-left w-24 sticky left-0 z-30 font-bold text-gray-600">
                Lesson
              </th>
              {/* Course Headers */}
              {displayedCourses.length === 0 ? (
                <th className="p-8 text-center text-gray-400 font-normal italic">
                  No courses found for this category/round filter.
                </th>
              ) : (
                displayedCourses.map((course) => (
                  <th
                    key={course.id}
                    className="p-3 border-r min-w-[160px] align-top bg-gray-50"
                  >
                    <div className="flex justify-between items-start">
                      <div className="text-left">
                        <div className="font-bold text-gray-800 text-base">
                          {course.name}
                        </div>
                        <div className="text-xs text-gray-500 font-mono">
                          {course.timeSlot}
                        </div>
                      </div>
                      <button
                        onClick={() => {
                          if (
                            confirm(
                              `Delete course ${course.name}?`
                            )
                          ) {
                            onDeleteCourse(course);
                          }
                        }}
                        className="text-gray-300 hover:text-red-500 text-lg leading-none px-1"
                        title="Delete Course"
                      >
                        &times;
                      </button>
                    </div>
                  </th>
                ))
              )}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {Array.from({ length: 12 }).map((_, i) => {
              const lessonNum = i + 1;
              const lessonIdStr = lessonNum.toString();
              
              const refLessonName =
                displayedCourses[0]?.lessons.find((l) => l.id === lessonIdStr)
                  ?.name || `Lesson ${lessonNum}`;

              return (
                <tr key={lessonNum} className="hover:bg-gray-50/50">
                  {/* Row Header (Lesson) */}
                  <td className="p-3 border-r bg-white sticky left-0 z-10 font-medium text-gray-500 text-center shadow-[1px_0_0_0_rgba(0,0,0,0.05)]">
                    <div className="text-lg font-bold text-gray-300">
                      {lessonNum}
                    </div>
                    <div className="text-[10px] text-blue-600 leading-tight mt-1 truncate w-20 mx-auto">
                      {refLessonName}
                    </div>
                  </td>

                  {/* Course Cells */}
                  {displayedCourses.map((course) => {
                    const data = getCellData(course, lessonIdStr);
                    if (!data)
                      return (
                        <td
                          key={course.id}
                          className="border-r bg-gray-50"
                        ></td>
                      );

                    // Determine Cell Style
                    let statusColor = "bg-white";
                    if (data.completed) statusColor = "bg-green-50";
                    else if (data.isFull) statusColor = "bg-red-50";

                    return (
                      <td
                        key={course.id}
                        className={`p-2 border-r cursor-pointer transition-all hover:brightness-95 ${statusColor}`}
                        onClick={() => {
                          setSelectedCell({
                            courseId: course.id,
                            lessonId: lessonIdStr,
                          });
                          setSelectedStudentToAdd("");
                        }}
                      >
                        <div className="flex justify-between items-center mb-1">
                          <span
                            className={`text-xs font-mono font-bold ${
                              data.isFull ? "text-red-600" : "text-gray-600"
                            }`}
                          >
                            {formatDateDisplay(data.dateStr)}
                          </span>
                          {data.count > 0 && (
                            <span
                              className={`text-[10px] px-1.5 py-0.5 rounded-full font-bold ${
                                data.isFull
                                  ? "bg-red-200 text-red-800"
                                  : "bg-blue-100 text-blue-700"
                              }`}
                            >
                              {data.count}
                            </span>
                          )}
                        </div>
                        {/* Mini roster preview */}
                        <div className="flex flex-wrap gap-1">
                          {data.students.map((sid) => (
                            <div
                              key={sid}
                              className="w-1.5 h-1.5 rounded-full bg-blue-400"
                              title={sid}
                            ></div>
                          ))}
                        </div>
                      </td>
                    );
                  })}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* 3. EDIT MODAL (Overlay) */}
      {selectedCell && activeLessonData && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm"
          onClick={() => setSelectedCell(null)}
        >
          <div
            className="bg-white rounded-xl shadow-2xl w-full max-w-md overflow-hidden flex flex-col max-h-[90vh]"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="bg-gray-100 p-4 border-b flex justify-between items-center">
              <div>
                <h3 className="text-lg font-bold text-gray-800">
                  {activeLessonData.course.name}
                </h3>
                <p className="text-sm text-gray-500">
                  Lesson {activeLessonData.lesson.id} •{" "}
                  {activeLessonData.lesson.dateStr}
                </p>
              </div>
              <button
                onClick={() => setSelectedCell(null)}
                className="text-gray-400 hover:text-gray-600 text-2xl"
              >
                &times;
              </button>
            </div>

            {/* Content */}
            <div className="p-4 overflow-y-auto flex-1">
              {/* Status Toggle */}
              <div className="flex justify-between items-center bg-gray-50 p-3 rounded mb-4 border">
                <span className="text-sm font-bold text-gray-600">
                  Class Status
                </span>
                <button
                  onClick={() =>
                    onToggleCompletion(
                      activeLessonData.course.id,
                      activeLessonData.lesson.id
                    )
                  }
                  className={`px-3 py-1 rounded text-xs font-bold ${
                    activeLessonData.lesson.completed
                      ? "bg-green-500 text-white"
                      : "bg-gray-200 text-gray-600"
                  }`}
                >
                  {activeLessonData.lesson.completed ? "COMPLETED" : "PENDING"}
                </button>
              </div>

              {/* Student List */}
              <div className="space-y-2 mb-6">
                <h4 className="text-xs font-bold text-gray-400 uppercase">
                  Enrolled Students ({activeLessonData.lesson.students.length}/
                  {MAX_STUDENTS})
                </h4>
                {activeLessonData.lesson.students.length === 0 && (
                  <p className="text-sm text-gray-400 italic">
                    No students yet.
                  </p>
                )}
                {activeLessonData.lesson.students.map((sid) => {
                  const studentName =
                    allStudents.find((s) => s.id === sid)?.name || sid;
                  return (
                    <div
                      key={sid}
                      className="flex justify-between items-center p-2 hover:bg-gray-50 rounded border border-transparent hover:border-gray-200"
                    >
                      <span className="font-medium text-gray-700">
                        {studentName}
                      </span>
                      <button
                        onClick={() =>
                          onRemoveStudent(
                            activeLessonData.course.id,
                            activeLessonData.lesson.id,
                            sid
                          )
                        }
                        className="text-red-400 hover:text-red-600 text-sm font-bold px-2"
                      >
                        Remove
                      </button>
                    </div>
                  );
                })}
              </div>

              {/* Add Student */}
              <div className="border-t pt-4">
                <h4 className="text-xs font-bold text-gray-400 uppercase mb-2">
                  Add Student
                </h4>
                <div className="flex gap-2">
                  <select
                    className="flex-1 border p-2 rounded text-sm bg-white"
                    value={selectedStudentToAdd}
                    onChange={(e) => setSelectedStudentToAdd(e.target.value)}
                  >
                    <option value="">Select Student...</option>
                    {allStudents.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.name} ({s.id})
                      </option>
                    ))}
                  </select>
                  <button
                    disabled={
                      !selectedStudentToAdd ||
                      activeLessonData.lesson.students.length >= MAX_STUDENTS
                    }
                    onClick={handleAdd}
                    className="bg-blue-600 text-white px-4 py-2 rounded text-sm font-bold disabled:opacity-50 hover:bg-blue-700"
                  >
                    Add
                  </button>
                </div>
              </div>
            </div>

            {/* Footer Actions */}
            <div className="bg-gray-50 p-3 border-t flex justify-between gap-2">
              <button
                onClick={() =>
                  onShiftDates(
                    activeLessonData.course.id,
                    activeLessonData.lesson.id,
                    -1
                  )
                }
                className="flex-1 py-2 bg-white border rounded text-xs text-gray-600 hover:bg-gray-100"
              >
                Shift Date -7 Days
              </button>
              <button
                onClick={() =>
                  onShiftDates(
                    activeLessonData.course.id,
                    activeLessonData.lesson.id,
                    1
                  )
                }
                className="flex-1 py-2 bg-white border rounded text-xs text-gray-600 hover:bg-gray-100"
              >
                Shift Date +7 Days
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
