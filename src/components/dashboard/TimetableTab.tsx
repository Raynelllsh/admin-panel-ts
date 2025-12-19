// src/components/dashboard/TimetableTab.tsx
"use client";

import React, { useState, useMemo, useEffect } from "react";
import {
  Search,
  Filter,
  Plus,
  X,
  Trash2,
  CalendarClock,
  ChevronLeft,
  ChevronRight,
  Users,
  CheckCircle2,
  Clock3,
} from "lucide-react";

import { formatDateDisplay, MAX_STUDENTS } from "../../utils/adminConstants";
import { Course, Student, Lesson } from "@/types";

// Ensure this interface in TimetableTab.tsx matches the fixed hook
interface TimetableTabProps {
  allCourses: Course[];
  allStudents: Student[];
  loading: boolean;
  availableCategories: string[];
  availableRounds: string[];
  createCourse: (
    name: string,
    time: string,
    date: string,
    roundNum: string
  ) => Promise<string>;
  deleteCourse: (courseId: string) => Promise<void>;
  addStudentToLesson: (
    courseId: string,
    lessonId: string,
    studentId: string
  ) => Promise<{ success: boolean; msg?: string }>;
  removeStudentFromLesson: (
    courseId: string,
    lessonId: string,
    studentId: string
  ) => Promise<void>;
  toggleLessonCompletion: (
    courseId: string,
    lessonId: string,
    isComplete: boolean
  ) => Promise<void>;
  shiftCourseDates: (
    courseId: string,
    startLessonId: string,
    direction: number
  ) => Promise<void>;
  saveCourseToFirebase: (course: Course) => Promise<void>;
  rescheduleStudent: (
    studentId: string,
    oldLesson: { courseId: string; lessonId: string },
    newLesson: {
      courseId: string;
      lessonId: string;
      dateStr: string;
      timeSlot: string;
    }
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

const cx = (...classes: Array<string | false | null | undefined>) =>
  classes.filter(Boolean).join(" ");

function Chip({
  children,
  className = "",
  title,
}: {
  children: React.ReactNode;
  className?: string;
  title?: string;
}) {
  return (
    <span
      title={title}
      className={cx(
        "inline-flex items-center rounded-lg px-2 py-0.5 text-[11px] font-semibold",
        className
      )}
    >
      {children}
    </span>
  );
}

function IconInput({
  value,
  onChange,
  placeholder,
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder: string;
}) {
  return (
    <div className="relative">
      <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="h-9 w-72 rounded-lg border border-gray-200 bg-white/70 pl-9 pr-3 text-xs outline-none transition focus:ring-2 focus:ring-blue-500/15 focus:border-blue-500"
      />
    </div>
  );
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
  saveCourseToFirebase, // kept for compatibility / future use
  rescheduleStudent, // kept for compatibility / future use
}: TimetableTabProps) {
  // --- STATE ---
  const [filterCategory, setFilterCategory] = useState<string>("ALL");
  const [filterRound, setFilterRound] = useState<string>("ALL");

  const [selectedCell, setSelectedCell] = useState<SelectedCell | null>(null);
  const [selectedStudentToAdd, setSelectedStudentToAdd] = useState<string>("");

  // UI Toggles
  const [showFilters, setShowFilters] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);

  // Search (courses)
  const [courseSearch, setCourseSearch] = useState("");

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
    const q = courseSearch.trim().toLowerCase();

    return allCourses
      .filter((c) => {
        const category = c.path?.category || "Uncategorized";
        const round = c.path?.round || "round001";
        const matchCat =
          filterCategory === "ALL" || category === filterCategory;
        const matchRound = filterRound === "ALL" || round === filterRound;
        return matchCat && matchRound;
      })
      .filter((c) => {
        if (!q) return true;
        return (
          String(c.name || "")
            .toLowerCase()
            .includes(q) ||
          String(c.id || "")
            .toLowerCase()
            .includes(q) ||
          String(c.timeSlot || "")
            .toLowerCase()
            .includes(q)
        );
      });
  }, [allCourses, filterCategory, filterRound, courseSearch]);

  // --- HELPER WRAPPERS ---
  const onCreateCourse = async (
    name: string,
    time: string,
    date: string,
    roundNum: string
  ) => {
    await createCourse(name, time, date, roundNum);
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
    if (
      !createForm.name ||
      !createForm.time ||
      !createForm.date ||
      !createForm.round
    )
      return;

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
    setShowCreateModal(false);
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

  const activeLessonCount = activeLessonData?.lesson.students.length ?? 0;
  const activeLessonIsFull = activeLessonCount >= MAX_STUDENTS;

  const availableStudentsForLesson = useMemo(() => {
    // show all students; optionally you can filter out already enrolled
    return allStudents;
  }, [allStudents]);

  // --- UI ---
  return (
    <div className="m-8 h-[calc(100vh-144px)] overflow-hidden flex flex-col gap-4">
      {/* Toolbar */}
      <div className="flex items-center gap-2 flex-wrap">
        <button
          type="button"
          onClick={() => setShowCreateModal(true)}
          className="px-3 py-2 bg-sky-500 cursor-pointer flex items-center gap-2 rounded-lg text-white hover:opacity-85 transition"
          title="Create course"
        >
          <Plus className="h-4 w-4" />
          Create Course
        </button>

        <div className="relative">
          <button
            type="button"
            onClick={() => setShowFilters((v) => !v)}
            className={cx(
              "h-9 px-3 rounded-lg border border-gray-200 bg-white text-gray-700",
              "hover:bg-gray-900/5 transition active:scale-95 cursor-pointer",
              "focus:outline-none focus:ring-2 focus:ring-blue-500/15"
            )}
            title="Filters"
          >
            <span className="inline-flex items-center gap-2 text-sm font-medium">
              <Filter className="h-4 w-4 text-gray-600" />
              Filters
            </span>
          </button>

          {showFilters && (
            <div className="absolute left-0 top-full mt-2 w-[320px] bg-white rounded-lg border border-gray-200 shadow-lg overflow-hidden z-30">
              <div className="p-4 border-b border-gray-200 flex items-start justify-between gap-2">
                <div>
                  <div className="text-sm font-semibold text-gray-900">
                    Filter options
                  </div>
                  <div className="text-xs text-gray-500 mt-0.5">
                    Narrow visible courses.
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => setShowFilters(false)}
                  className="h-9 w-9 grid place-items-center rounded-lg text-gray-700 hover:bg-gray-900/5 transition active:scale-95 cursor-pointer"
                  title="Close"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              <div className="p-4 grid gap-3">
                <div className="grid gap-1">
                  <label className="text-[11px] font-semibold text-gray-600">
                    Category
                  </label>
                  <select
                    className="h-9 rounded-lg border border-gray-200 bg-white px-2 text-sm outline-none focus:ring-2 focus:ring-blue-500/15 focus:border-blue-500 cursor-pointer"
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

                <div className="grid gap-1">
                  <label className="text-[11px] font-semibold text-gray-600">
                    Round
                  </label>
                  <select
                    className="h-9 rounded-lg border border-gray-200 bg-white px-2 text-sm outline-none focus:ring-2 focus:ring-blue-500/15 focus:border-blue-500 cursor-pointer"
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

                <div className="pt-2 border-t border-gray-200 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Chip className="bg-gray-100 text-gray-700">
                      {filterCategory}
                    </Chip>
                    <Chip className="bg-gray-100 text-gray-700">
                      {filterRound}
                    </Chip>
                  </div>

                  <button
                    type="button"
                    onClick={() => setShowFilters(false)}
                    className="text-xs font-semibold text-sky-700 hover:underline cursor-pointer"
                  >
                    Done
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>

        <IconInput
          value={courseSearch}
          onChange={setCourseSearch}
          placeholder="Search course, id, time…"
        />

        <div className="ml-auto flex items-center gap-2">
          <Chip className="bg-gray-100 text-gray-700" title="Visible courses">
            {displayedCourses.length} courses
          </Chip>
          <Chip className="bg-gray-100 text-gray-700" title="Students">
            {allStudents.length} students
          </Chip>
        </div>
      </div>

      {/* Main table shell */}
      <div className="flex-1 min-h-0 overflow-hidden bg-white rounded-xl border border-gray-200 shadow-sm">
        <div className="h-full overflow-auto">
          <table className="w-full text-sm">
            <thead className="sticky top-0 z-20 bg-white">
              <tr className="border-b border-gray-200">
                {/* Sticky corner */}
                <th className="sticky left-0 z-30 bg-gray-50 border-r border-gray-200 p-3 text-left w-[360px]">
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-2 text-gray-700 font-semibold">
                      <CalendarClock className="h-4 w-4 text-gray-500" />
                      Lessons
                    </div>
                    {loading ? (
                      <Chip className="bg-amber-50 text-amber-700 border border-amber-100">
                        Loading…
                      </Chip>
                    ) : (
                      <Chip className="bg-gray-100 text-gray-700">12 rows</Chip>
                    )}
                  </div>
                </th>

                {/* Course headers */}
                {displayedCourses.length === 0 ? (
                  <th className="p-8 text-center text-gray-400 font-normal">
                    No courses found for the selected filters.
                  </th>
                ) : (
                  displayedCourses.map((course) => (
                    <th
                      key={course.id}
                      className="p-3 border-r border-gray-200 min-w-[220px] align-top bg-white"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <div className="text-left text-sm font-semibold text-gray-900 truncate">
                            {course.name}
                          </div>
                          <div className="text-xs text-gray-500 font-mono mt-0.5">
                            {course.timeSlot || "—"}
                          </div>
                        </div>

                        <button
                          type="button"
                          onClick={() => {
                            if (confirm(`Delete course ${course.name}?`)) {
                              onDeleteCourse(course);
                            }
                          }}
                          className="h-9 w-9 grid place-items-center rounded-lg text-gray-700 hover:bg-red-50 hover:text-red-600 transition active:scale-95 cursor-pointer"
                          title="Delete course"
                        >
                          <Trash2 className="h-4 w-4" />
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
                  <tr
                    key={lessonNum}
                    className="hover:bg-gray-50/40 transition"
                  >
                    {/* Row header */}
                    <td className="sticky left-0 z-10 bg-white border-r border-gray-200 p-3">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-lg bg-gray-50 border border-gray-200 grid place-items-center">
                          <span className="text-sm font-semibold text-gray-700">
                            {lessonNum}
                          </span>
                        </div>

                        <div className="min-w-0">
                          <div className="text-sm font-semibold text-gray-900 truncate">
                            {refLessonName}
                          </div>
                          <div className="text-xs text-gray-500 mt-0.5">
                            Click a cell to manage roster
                          </div>
                        </div>
                      </div>
                    </td>

                    {/* Cells */}
                    {displayedCourses.map((course) => {
                      const data = getCellData(course, lessonIdStr);

                      if (!data) {
                        return (
                          <td
                            key={course.id}
                            className="border-r border-gray-200 bg-gray-50"
                          />
                        );
                      }

                      const isSelected =
                        selectedCell?.courseId === course.id &&
                        selectedCell?.lessonId === lessonIdStr;

                      const cellBg = data.completed
                        ? "bg-emerald-50"
                        : data.isFull
                        ? "bg-rose-50"
                        : "bg-white";

                      const countChip = data.isFull
                        ? "bg-rose-100 text-rose-700"
                        : "bg-sky-100 text-sky-700";

                      return (
                        <td
                          key={course.id}
                          className={cx(
                            "border-r border-gray-200 p-2 align-top",
                            cellBg
                          )}
                        >
                          <button
                            type="button"
                            onClick={() => {
                              setSelectedCell({
                                courseId: course.id,
                                lessonId: lessonIdStr,
                              });
                              setSelectedStudentToAdd("");
                            }}
                            className={cx(
                              "w-full text-left rounded-lg border border-transparent p-2 transition cursor-pointer",
                              "hover:bg-gray-900/5 hover:border-gray-200 hover:shadow-sm",
                              "focus:outline-none focus:ring-2 focus:ring-blue-500/15",
                              isSelected && "border-gray-200 bg-white shadow-sm"
                            )}
                            title="Open lesson"
                          >
                            <div className="flex items-start justify-between gap-2">
                              <div className="min-w-0">
                                <div className="text-xs font-mono font-semibold text-gray-700">
                                  {formatDateDisplay(data.dateStr)}
                                </div>

                                <div className="mt-1 flex items-center gap-2">
                                  {data.completed ? (
                                    <Chip className="bg-emerald-100 text-emerald-700">
                                      <span className="inline-flex items-center gap-1">
                                        <CheckCircle2 className="h-3.5 w-3.5" />
                                        Completed
                                      </span>
                                    </Chip>
                                  ) : (
                                    <Chip className="bg-amber-100 text-amber-700">
                                      <span className="inline-flex items-center gap-1">
                                        <Clock3 className="h-3.5 w-3.5" />
                                        Pending
                                      </span>
                                    </Chip>
                                  )}
                                </div>
                              </div>

                              {data.count > 0 && (
                                <Chip
                                  className={cx("shrink-0", countChip)}
                                  title="Enrolled count"
                                >
                                  {data.count}/{MAX_STUDENTS}
                                </Chip>
                              )}
                            </div>

                            {/* Mini roster preview dots */}
                            <div className="mt-2 flex flex-wrap gap-1">
                              {data.students.slice(0, 18).map((sid) => (
                                <span
                                  key={sid}
                                  className={cx(
                                    "h-1.5 w-1.5 rounded-full",
                                    data.completed
                                      ? "bg-emerald-400"
                                      : "bg-sky-400"
                                  )}
                                  title={sid}
                                />
                              ))}
                              {data.students.length > 18 && (
                                <span className="text-[10px] text-gray-500 ml-1">
                                  +{data.students.length - 18}
                                </span>
                              )}
                            </div>
                          </button>
                        </td>
                      );
                    })}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Create Course Modal */}
      {showCreateModal && (
        <div
          className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm grid place-items-center p-4"
          onMouseDown={() => setShowCreateModal(false)}
        >
          <div
            className="w-full max-w-xl bg-white rounded-lg border border-gray-200 shadow-lg overflow-hidden"
            onMouseDown={(e) => e.stopPropagation()}
          >
            <div className="p-5 border-b border-gray-200 flex items-start justify-between gap-3">
              <div>
                <div className="text-sm font-semibold text-gray-900">
                  Create course
                </div>
                <div className="text-xs text-gray-500 mt-0.5">
                  This creates a new course with a start date and round.
                </div>
              </div>

              <button
                type="button"
                className="h-9 w-9 grid place-items-center rounded-lg text-gray-700 hover:bg-gray-900/5 transition active:scale-95 cursor-pointer"
                onClick={() => setShowCreateModal(false)}
                title="Close"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <form onSubmit={handleCreate} className="p-5 grid gap-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div className="grid gap-1">
                  <label className="text-[11px] font-semibold text-gray-600">
                    Course ID / Name
                  </label>
                  <input
                    className="h-10 rounded-lg border border-gray-200 bg-white px-3 text-sm outline-none transition focus:ring-2 focus:ring-blue-500/15 focus:border-blue-500"
                    value={createForm.name}
                    placeholder="SPEC-C1"
                    onChange={(e) =>
                      setCreateForm({ ...createForm, name: e.target.value })
                    }
                  />
                </div>

                <div className="grid gap-1">
                  <label className="text-[11px] font-semibold text-gray-600">
                    Round
                  </label>
                  <select
                    className="h-10 rounded-lg border border-gray-200 bg-white px-3 text-sm outline-none transition focus:ring-2 focus:ring-blue-500/15 focus:border-blue-500 cursor-pointer"
                    value={createForm.round}
                    onChange={(e) =>
                      setCreateForm({ ...createForm, round: e.target.value })
                    }
                  >
                    {availableRounds.length > 0 ? (
                      availableRounds.map((r) => (
                        <option key={r} value={r}>
                          {r}
                        </option>
                      ))
                    ) : (
                      <option value="round001">round001</option>
                    )}
                    {!availableRounds.includes("round001") && (
                      <option value="round001">round001</option>
                    )}
                    {!availableRounds.includes("round002") && (
                      <option value="round002">round002</option>
                    )}
                    {!availableRounds.includes("round003") && (
                      <option value="round003">round003</option>
                    )}
                  </select>
                </div>

                <div className="grid gap-1">
                  <label className="text-[11px] font-semibold text-gray-600">
                    Time
                  </label>
                  <input
                    className="h-10 rounded-lg border border-gray-200 bg-white px-3 text-sm outline-none transition focus:ring-2 focus:ring-blue-500/15 focus:border-blue-500"
                    value={createForm.time}
                    placeholder="10:00"
                    onChange={(e) =>
                      setCreateForm({ ...createForm, time: e.target.value })
                    }
                  />
                </div>

                <div className="grid gap-1">
                  <label className="text-[11px] font-semibold text-gray-600">
                    Start date
                  </label>
                  <input
                    type="date"
                    className="h-10 rounded-lg border border-gray-200 bg-white px-3 text-sm outline-none transition focus:ring-2 focus:ring-blue-500/15 focus:border-blue-500"
                    value={createForm.date}
                    onChange={(e) =>
                      setCreateForm({ ...createForm, date: e.target.value })
                    }
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-gray-200">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="h-10 px-4 rounded-lg border border-gray-200 text-gray-700 hover:bg-gray-50 transition active:scale-[0.99] cursor-pointer"
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  className="h-10 px-4 rounded-lg bg-sky-500 text-white hover:opacity-90 transition active:scale-[0.99] cursor-pointer"
                >
                  Create
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Lesson Modal */}
      {selectedCell && activeLessonData && (
        <div
          className="fixed inset-0 z-1000 bg-black/50 backdrop-blur-sm grid place-items-center p-4"
          onMouseDown={() => setSelectedCell(null)}
        >
          <div
            className="w-full max-w-xl overflow-hidden bg-white rounded-lg border border-gray-200 shadow-lg flex flex-col"
            onMouseDown={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="p-5 border-b border-gray-200 flex items-start justify-between gap-3">
              <div className="min-w-0">
                <div className="flex items-center gap-2 min-w-0">
                  <div className="text-sm font-semibold text-gray-900 truncate">
                    {activeLessonData.course.name}
                  </div>
                  <Chip className="bg-gray-100 text-gray-700 font-mono">
                    {activeLessonData.course.timeSlot || "—"}
                  </Chip>
                </div>

                <div className="text-xs text-gray-500 mt-1">
                  Lesson {activeLessonData.lesson.id} •{" "}
                  <span className="font-mono">
                    {activeLessonData.lesson.dateStr || "—"}
                  </span>
                </div>
              </div>

              <button
                type="button"
                className="h-9 w-9 grid place-items-center rounded-lg text-gray-700 hover:bg-gray-900/5 transition active:scale-95 cursor-pointer"
                onClick={() => setSelectedCell(null)}
                title="Close"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Content */}
            <div className="p-5 overflow-auto flex-1 space-y-4">
              {/* Status + capacity */}
              <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-4 flex items-center justify-between gap-3">
                <div className="flex items-center gap-2 text-gray-700">
                  <Users className="h-4 w-4 text-gray-500" />
                  <div className="text-sm font-semibold">
                    {activeLessonCount}/{MAX_STUDENTS} enrolled
                  </div>
                  {activeLessonIsFull && (
                    <Chip className="bg-rose-100 text-rose-700">Full</Chip>
                  )}
                </div>

                <button
                  type="button"
                  onClick={() =>
                    onToggleCompletion(
                      activeLessonData.course.id,
                      activeLessonData.lesson.id
                    )
                  }
                  className={cx(
                    "h-9 px-3 rounded-lg text-sm font-semibold transition active:scale-95 cursor-pointer",
                    "focus:outline-none focus:ring-2 focus:ring-blue-500/15",
                    activeLessonData.lesson.completed
                      ? "bg-emerald-600 text-white hover:bg-emerald-700"
                      : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                  )}
                  title="Toggle completion"
                >
                  {activeLessonData.lesson.completed ? (
                    <span className="inline-flex items-center gap-2">
                      <CheckCircle2 className="h-4 w-4" />
                      Completed
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-2">
                      <Clock3 className="h-4 w-4" />
                      Pending
                    </span>
                  )}
                </button>
              </div>

              {/* Roster */}
              <div className="bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden">
                <div className="px-4 py-3 border-b border-gray-200 bg-gray-50">
                  <div className="text-sm font-semibold text-gray-900">
                    Enrolled students
                  </div>
                  <div className="text-xs text-gray-500 mt-0.5">
                    Remove students from this lesson.
                  </div>
                </div>

                <div className="p-4 max-h-64 overflow-auto">
                  {activeLessonData.lesson.students.length === 0 ? (
                    <div className="text-sm text-gray-400">
                      No students yet.
                    </div>
                  ) : (
                    <div className="divide-y divide-gray-100 rounded-lg border border-gray-100 overflow-hidden">
                      {activeLessonData.lesson.students.map((sid) => {
                        const studentName =
                          allStudents.find((s) => s.id === sid)?.name || sid;

                        return (
                          <div
                            key={sid}
                            className="px-3 py-2 flex items-center justify-between gap-3 bg-white hover:bg-gray-50 transition"
                          >
                            <div className="min-w-0">
                              <div className="text-sm font-medium text-gray-900 truncate">
                                {studentName}
                              </div>
                              <div className="text-xs text-gray-500 font-mono mt-0.5">
                                {sid}
                              </div>
                            </div>

                            <button
                              type="button"
                              onClick={() =>
                                onRemoveStudent(
                                  activeLessonData.course.id,
                                  activeLessonData.lesson.id,
                                  sid
                                )
                              }
                              className="h-9 px-3 rounded-lg text-sm font-semibold text-red-600 hover:bg-red-50 transition active:scale-95 cursor-pointer"
                              title="Remove"
                            >
                              Remove
                            </button>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>

              {/* Add student */}
              <div className="bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden">
                <div className="px-4 py-3 border-b border-gray-200 bg-gray-50">
                  <div className="text-sm font-semibold text-gray-900">
                    Add student
                  </div>
                  <div className="text-xs text-gray-500 mt-0.5">
                    Add a student to this lesson (if not full).
                  </div>
                </div>

                <div className="p-4 flex flex-col gap-2">
                  <div className="flex gap-2">
                    <select
                      className="flex-1 h-10 rounded-lg border border-gray-200 bg-white px-3 text-sm outline-none transition focus:ring-2 focus:ring-blue-500/15 focus:border-blue-500 cursor-pointer"
                      value={selectedStudentToAdd}
                      onChange={(e) => setSelectedStudentToAdd(e.target.value)}
                    >
                      <option value="">Select student…</option>
                      {availableStudentsForLesson.map((s) => (
                        <option key={s.id} value={s.id}>
                          {s.name} ({s.id})
                        </option>
                      ))}
                    </select>

                    <button
                      type="button"
                      disabled={!selectedStudentToAdd || activeLessonIsFull}
                      onClick={handleAdd}
                      className="h-10 px-4 rounded-lg bg-sky-500 text-white hover:opacity-90 transition active:scale-[0.99] cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      Add
                    </button>
                  </div>

                  {activeLessonIsFull && (
                    <div className="text-xs text-rose-600">
                      This lesson is full ({MAX_STUDENTS} students).
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Footer actions */}
            <div className="p-4 border-t border-gray-200 bg-gray-50 flex items-center justify-between gap-2">
              <button
                type="button"
                onClick={() =>
                  onShiftDates(
                    activeLessonData.course.id,
                    activeLessonData.lesson.id,
                    -1
                  )
                }
                className="h-10 px-3 rounded-lg border border-gray-200 bg-white text-gray-700 hover:bg-gray-50 transition active:scale-[0.99] cursor-pointer inline-flex items-center gap-2"
                title="Shift earlier"
              >
                <ChevronLeft className="h-4 w-4" />
                Shift -7 days
              </button>

              <button
                type="button"
                onClick={() =>
                  onShiftDates(
                    activeLessonData.course.id,
                    activeLessonData.lesson.id,
                    1
                  )
                }
                className="h-10 px-3 rounded-lg border border-gray-200 bg-white text-gray-700 hover:bg-gray-50 transition active:scale-[0.99] cursor-pointer inline-flex items-center gap-2"
                title="Shift later"
              >
                Shift +7 days
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
