// src/components/dashboard/StudentsTab.tsx

"use client";

import React, { useMemo, useState } from "react";
import {
  Search,
  Users,
  CalendarClock,
  CheckCircle2,
  Clock3,
  Info,
  AlertCircle,
  Plus,
  Link as LinkIcon,
  UserPlus,
  UserCheck,
} from "lucide-react";
import { Student, Course, StudentLesson } from "@/types";

// --- INTERFACES ---

export interface PotentialStudent {
  id: string;
  name: string;
  possibleCourseId: string;
  enrollment: StudentLesson[];
  createdAt: any;
  status: "potential";
}

interface StudentsTabProps {
  allStudents: Student[];
  allCourses: Course[];
  potentialStudents?: PotentialStudent[]; // Data from Firestore 'potential_students'
  setAllStudents: React.Dispatch<React.SetStateAction<Student[]>>;
  
  // Enrolled Student Actions
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

  // NEW: Potential Student Actions
  reschedulePotentialStudent?: (
    studentId: string,
    oldLesson: { lessonId: string },
    newLesson: {
      courseId: string;
      lessonId: string;
      dateStr: string;
      timeSlot: string;
    }
  ) => Promise<{ success: boolean; msg?: string }>;

  addStudentToLesson: (
    courseId: string,
    lessonId: string,
    studentId: string
  ) => Promise<{ success: boolean; msg?: string }>;

  findMissingLessons: (studentId: string) => {
    lessonId: string;
    lessonName: string;
    availableSlots: {
      courseId: string;
      courseName: string;
      dateStr: string;
      timeSlot: string;
      lessonId: string;
    }[];
  }[];
  
  // Kept for backward compatibility if needed
  onCourseSave?: (course: Course) => void;
}

interface EnrollmentGroup {
  courseId: string;
  courseName: string;
  round: string;
  lessons: StudentLesson[];
}

interface RescheduleOption {
  courseId: string;
  round: string;
  lessonId: string;
  name: string;
  dateStr: string;
  timeSlot: string;
  label: string;
  path: any;
}

// --- HELPERS ---

const cx = (...classes: Array<string | boolean | null | undefined>) =>
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
        className="h-10 w-full rounded-lg border border-gray-200 bg-white/70 pl-9 pr-3 text-sm outline-none transition focus:ring-2 focus:ring-blue-500/15 focus:border-blue-500"
      />
    </div>
  );
}

function EmptyState({ title, subtitle }: { title: string; subtitle: string }) {
  return (
    <div className="h-full grid place-items-center">
      <div className="text-center py-16 text-gray-400">
        <Users className="h-12 w-12 mx-auto mb-3 opacity-20" />
        <p className="text-sm font-medium text-gray-500">{title}</p>
        <p className="text-xs text-gray-400 mt-1">{subtitle}</p>
      </div>
    </div>
  );
}

const formatLabel = (key: string) => {
  const result = key.replace(/([A-Z])/g, " $1");
  return result.charAt(0).toUpperCase() + result.slice(1);
};

// --- COMPONENT ---

export default function StudentsTab({
  allStudents,
  allCourses,
  potentialStudents = [], 
  setAllStudents,
  onCourseSave,
  rescheduleStudent,
  reschedulePotentialStudent, // New function passed from hook
  addStudentToLesson,
  findMissingLessons,
}: StudentsTabProps) {
  
  // STATE
  const [activeTab, setActiveTab] = useState<"enrolled" | "potential">("enrolled");
  const [viewingStudent, setViewingStudent] = useState<Student | null>(null);
  const [studentSearch, setStudentSearch] = useState("");
  const [reschedulingLesson, setReschedulingLesson] = useState<{
    student: Student;
    lesson: StudentLesson;
    options: RescheduleOption[];
  } | null>(null);

  // LOGIC: Filter students based on active tab
  const currentTabStudents = useMemo<Student[]>(() => {
    if (activeTab === "enrolled") {
      return allStudents;
    } else {
      // READ FROM POTENTIAL DB -> Adapt to Student Interface
      return potentialStudents.map(p => ({
        id: p.id,
        name: p.name,
        enrollment: p.enrollment || [], 
        personalInfo: {
          name: p.name,
          chineseName: "",
          preferredLanguage: "Cantonese",
          sex: "M",
          level: "Potential",
          allergies: "NIL",
          parentContact: "",
          comfortMethod: "",
          condition: "",
          favChar: "",
          parentName: "",
        }
      }));
    }
  }, [activeTab, allStudents, potentialStudents]);

  const filteredStudents = useMemo(() => {
    const q = studentSearch.trim().toLowerCase();
    if (!q) return currentTabStudents;
    return currentTabStudents.filter(
      (s) => s.name.toLowerCase().includes(q) || s.id.toLowerCase().includes(q)
    );
  }, [currentTabStudents, studentSearch]);

  const viewingStudentEnrollmentGroups = useMemo<EnrollmentGroup[]>(() => {
    if (!viewingStudent || !viewingStudent.enrollment) return [];

    const groups: Record<string, EnrollmentGroup> = {};

    viewingStudent.enrollment.forEach((lesson) => {
      // Group by courseId. For potential students, courseId might change per lesson if rescheduled,
      // so this grouping shows the final proposed schedule nicely.
      const key = lesson.courseId;
      const courseDetails = allCourses.find((c) => c.id === key);
      
      if (!groups[key]) {
        groups[key] = {
          courseId: key,
          courseName: courseDetails ? courseDetails.name : (lesson.courseName || key),
          round: courseDetails ? courseDetails.path?.round : "",
          lessons: [],
        };
      }
      groups[key].lessons.push(lesson);
    });

    return Object.values(groups).sort((a, b) =>
      a.courseName.localeCompare(b.courseName)
    );
  }, [viewingStudent, allCourses]);

  // Only calculate missing lessons for enrolled students
  const missingLessons = useMemo(() => {
    if (!viewingStudent || !findMissingLessons || activeTab === 'potential') return [];
    return findMissingLessons(viewingStudent.id);
  }, [viewingStudent, allCourses, activeTab]);

  // ACTIONS

  const handleOpenReschedule = (
    student: Student,
    currentLesson: StudentLesson
  ) => {
    const options: RescheduleOption[] = [];

    allCourses.forEach((c) => {
      const matchingLesson = c.lessons.find(
        (l) => String(l.id) === String(currentLesson.lessonId)
      );
      if (matchingLesson) {
        options.push({
          courseId: c.id,
          round: c.path?.round,
          lessonId: matchingLesson.id,
          name: matchingLesson.name,
          dateStr: matchingLesson.dateStr,
          timeSlot: c.timeSlot,
          label: `${c.id} (${c.path?.round})`.replace("round", " Round "),
          path: c.path,
        });
      }
    });

    options.sort((a, b) => a.dateStr.localeCompare(b.dateStr));

    setReschedulingLesson({
      student,
      lesson: currentLesson,
      options,
    });
  };

  const confirmReschedule = async (targetOption: RescheduleOption) => {
    if (!reschedulingLesson) return;
    
    const { student, lesson } = reschedulingLesson;

    const oldLessonObj = {
      courseId: lesson.courseId,
      lessonId: lesson.lessonId,
    };

    const newLessonObj = {
      courseId: targetOption.courseId,
      lessonId: targetOption.lessonId,
      dateStr: targetOption.dateStr,
      timeSlot: targetOption.timeSlot,
    };

    let res;

    // --- LOGIC SPLIT: POTENTIAL VS ENROLLED ---
    if (activeTab === "potential") {
       if (!reschedulePotentialStudent) {
         alert("Error: Reschedule function for potential students is missing. Check parent component.");
         return;
       }
       res = await reschedulePotentialStudent(student.id, { lessonId: lesson.lessonId }, newLessonObj);
    } else {
       res = await rescheduleStudent(student.id, oldLessonObj, newLessonObj);
    }

    if (res.success) {
      alert(`${activeTab === 'potential' ? 'Proposal' : 'Lesson'} rescheduled successfully!`);
      setReschedulingLesson(null);
      
      // For enrolled students, we often need to trigger a refresh or let the hook updates propagate.
      // Since viewingStudent is a local copy from the memo, it should update automatically when props change.
      if (activeTab === 'enrolled') {
          // Additional safety: update local viewing student immediately if needed
          // but React props usually handle this.
      } else {
          // For potential, update immediately if possible or wait for parent
          // The hook update (setPotentialStudents) will trigger a re-render here.
      }
    } else {
      alert("Error: " + (res.msg || "Unknown error"));
    }
  };

  const handleAddMissing = async (courseId: string, lessonId: string) => {
    if (!viewingStudent) return;
    const res = await addStudentToLesson(courseId, lessonId, viewingStudent.id);
    if (res.success) {
      const updated = allStudents.find((s) => s.id === viewingStudent.id);
      if (updated) setViewingStudent(updated);
    } else {
      alert(res.msg || "Failed to add lesson");
    }
  };

  const selectedId = viewingStudent?.id ?? null;
  const personalInfo = (viewingStudent as any)?.personalInfo || null;

  return (
    <div className="m-8 h-[calc(100vh-144px)] overflow-hidden flex rounded-xl border border-gray-200 bg-white shadow-sm">
      {/* LEFT: Student List */}
      <div className="w-[360px] shrink-0 border-r border-gray-200 bg-gray-50 flex flex-col">
        <div className="p-4 space-y-3">
          {/* Header */}
          <div className="flex items-center justify-between gap-2">
            <div className="text-sm font-semibold text-gray-900">Students</div>
            <Chip className="bg-gray-100 text-gray-700" title="Count">
              {filteredStudents.length}
            </Chip>
          </div>

          {/* TAB SWITCHER */}
          <div className="flex p-1 bg-gray-200/50 rounded-lg">
            <button
              onClick={() => { setActiveTab("enrolled"); setViewingStudent(null); }}
              className={`flex-1 flex items-center justify-center gap-2 py-1.5 text-xs font-medium rounded-md transition-all ${
                activeTab === "enrolled"
                  ? "bg-white text-blue-600 shadow-sm"
                  : "text-gray-500 hover:text-gray-700"
              }`}
            >
              <UserCheck size={14} />
              Enrolled
            </button>
            <button
              onClick={() => { setActiveTab("potential"); setViewingStudent(null); }}
              className={`flex-1 flex items-center justify-center gap-2 py-1.5 text-xs font-medium rounded-md transition-all ${
                activeTab === "potential"
                  ? "bg-white text-amber-600 shadow-sm"
                  : "text-gray-500 hover:text-gray-700"
              }`}
            >
              <UserPlus size={14} />
              Potential
            </button>
          </div>

          {/* Search */}
          <IconInput
            value={studentSearch}
            onChange={setStudentSearch}
            placeholder={activeTab === 'potential' ? "Search potential..." : "Search name or ID..."}
          />
        </div>

        {/* List */}
        <div className="flex-1 overflow-auto">
          {filteredStudents.length === 0 ? (
            <div className="px-4 py-10 text-center text-gray-400">
              <p className="text-sm">No {activeTab} students found</p>
              <p className="text-xs mt-1">
                {activeTab === 'potential' 
                 ? "Add potential students in Enrollment tab." 
                 : "Try a different keyword."}
              </p>
            </div>
          ) : (
            <div className="px-2 pb-3 pt-1 space-y-0.5">
              {filteredStudents.map((s) => {
                const active = selectedId === s.id;
                return (
                  <button
                    key={s.id}
                    type="button"
                    onClick={() => setViewingStudent(s)}
                    className={cx(
                      "w-full text-left px-3 py-2 rounded-lg transition cursor-pointer",
                      "hover:bg-white hover:shadow-sm hover:border hover:border-gray-200",
                      "focus:outline-none focus:ring-2 focus:ring-blue-500/15",
                      active && "bg-white shadow-sm border border-gray-200",
                      active && activeTab === 'potential' && "border-amber-200 bg-amber-50/30"
                    )}
                    title="View student"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <div className="text-sm font-medium text-gray-900 truncate">
                          {s.name}
                        </div>
                        <div className="text-xs text-gray-500 mt-0.5 font-mono">
                          {s.id}
                        </div>
                      </div>
                      <div className="flex flex-col items-end gap-1">
                        {active && (
                          <Chip className={activeTab === 'potential' ? "bg-amber-100 text-amber-700" : "bg-sky-100 text-sky-700"}>
                            Viewing
                          </Chip>
                        )}
                        {activeTab === 'potential' && (
                           <span className="w-1.5 h-1.5 rounded-full bg-amber-400"></span>
                        )}
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* RIGHT: Details */}
      <div className="flex-1 min-w-0 bg-white overflow-hidden">
        {!viewingStudent ? (
          <EmptyState
            title={`Select a ${activeTab} student`}
            subtitle="Choose a student on the left to view enrollments."
          />
        ) : (
          <div className="h-full overflow-auto">
            {/* Header */}
            <div className="sticky top-0 z-10 bg-white/85 backdrop-blur border-b border-gray-200">
              <div className="p-5 flex items-start justify-between gap-4">
                <div>
                  <div className="flex items-center gap-2 min-w-0">
                    <h2 className="text-lg font-semibold text-gray-900 truncate">
                      {viewingStudent.name}
                    </h2>
                    <Chip className={cx(
                      "font-mono",
                      activeTab === 'potential' ? "bg-amber-50 text-amber-700 border border-amber-100" : "bg-gray-100 text-gray-700"
                    )}>
                      {activeTab === 'potential' ? "POTENTIAL" : viewingStudent.id}
                    </Chip>
                  </div>
                  
                  {activeTab === 'enrolled' && (
                    <div className="mt-2">
                      <CopyLinkButton studentId={viewingStudent.id} />
                    </div>
                  )}
                  <p className="text-xs text-gray-500 mt-1">
                    {activeTab === 'potential' 
                      ? "Customizing proposed timetable."
                      : "Click a lesson date to reschedule."
                    }
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <Chip
                    className="bg-gray-100 text-gray-700"
                    title="Enrollments"
                  >
                    {viewingStudentEnrollmentGroups.length} courses
                  </Chip>
                </div>
              </div>
            </div>

            {/* Info Section */}
            <div className="p-6 border-b border-gray-200 bg-gray-50/40">
              <div className="flex items-center gap-2 mb-4">
                <Info className="h-4 w-4 text-gray-400" />
                <h3 className="text-sm font-semibold text-gray-900">
                  {activeTab === 'potential' ? "Student Status" : "Personal Information"}
                </h3>
              </div>
              
              {activeTab === 'potential' ? (
                 <div className="text-sm text-gray-600 italic bg-amber-50 p-3 rounded-lg border border-amber-100">
                    <p><strong>Status:</strong> Potential Student</p>
                    <p className="mt-1">
                      You are editing a proposed timetable. Changes here are saved to the potential student record but do not affect course capacity until enrollment.
                    </p>
                 </div>
              ) : (
                personalInfo && Object.keys(personalInfo).length > 0 ? (
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-y-4 gap-x-8">
                    {Object.entries(personalInfo).map(([key, value]) => {
                      if (key === "name") return null;
                      
                      const label = formatLabel(key);
                      const displayValue = 
                          typeof value === "object" ? JSON.stringify(value) : String(value || "-");

                      return (
                        <div key={key} className="min-w-0">
                          <dt className="text-xs font-medium text-gray-500 mb-0.5">
                            {label}
                          </dt>
                          <dd className="text-sm text-gray-900 truncate" title={displayValue}>
                            {displayValue}
                          </dd>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="text-sm text-gray-400 italic">
                    No additional personal information recorded.
                  </div>
                )
              )}
            </div>

            {/* Missing Lessons (Enrolled Only) */}
            {missingLessons.length > 0 && (
              <div className="p-5 border-b border-gray-200 bg-red-50/30">
                <div className="flex items-center gap-2 mb-3">
                  <AlertCircle className="h-4 w-4 text-red-500" />
                  <h3 className="text-sm font-semibold text-red-900">
                    Missing Lessons
                  </h3>
                </div>
                <div className="space-y-3">
                  {missingLessons.map((item) => (
                    <div
                      key={item.lessonId}
                      className="bg-white border border-red-100 rounded-lg p-3 shadow-sm"
                    >
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                        <div className="text-sm font-medium text-gray-800">
                          <span className="text-gray-500 font-normal mr-2">
                            L{item.lessonId}
                          </span>
                          {item.lessonName}
                        </div>
                        <div className="flex items-center gap-2 flex-wrap">
                          {item.availableSlots.map((slot) => (
                            <button
                              key={`${slot.courseId}-${slot.lessonId}`}
                              onClick={() => handleAddMissing(slot.courseId, slot.lessonId)}
                              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium bg-red-50 text-red-700 hover:bg-red-100 border border-red-200 transition"
                              title={`Add to ${slot.courseName}`}
                            >
                              <Plus className="h-3 w-3" />
                              {slot.dateStr} <span className="opacity-75">({slot.timeSlot})</span>
                            </button>
                          ))}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Timetable */}
            <div className="p-5">
              {viewingStudentEnrollmentGroups.length === 0 ? (
                <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-6">
                  <div className="flex items-center gap-2 text-gray-900 font-semibold">
                    <CalendarClock className="h-4 w-4 text-gray-500" />
                    No active enrollments
                  </div>
                  <p className="text-sm text-gray-500 mt-2">
                    This student currently has no lessons enrolled.
                  </p>
                </div>
              ) : (
                <div className="space-y-4">
                  {viewingStudentEnrollmentGroups.map((group) => (
                    <div
                      key={group.courseId}
                      className="bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden"
                    >
                      <div className="px-4 py-3 border-b border-gray-200 bg-gray-50 flex items-center justify-between gap-3">
                        <div className="min-w-0">
                          <div className="text-sm font-semibold text-gray-900 truncate">
                            {group.courseName}
                          </div>
                          <div className="text-xs text-gray-500 mt-0.5">
                            {group.round ? group.round : "—"}
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <Chip
                            className="bg-gray-100 text-gray-700"
                            title="Lessons in this course"
                          >
                            {group.lessons.length} lessons
                          </Chip>
                        </div>
                      </div>

                      <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                          <thead className="text-xs text-gray-500">
                            <tr className="border-b border-gray-200">
                              <th className="py-2 px-4 text-left font-medium w-[70px]">
                                Lesson
                              </th>
                              <th className="py-2 px-4 text-left font-medium">
                                Date
                              </th>
                              <th className="py-2 px-4 text-left font-medium w-[120px]">
                                Time
                              </th>
                              <th className="py-2 px-4 text-left font-medium w-[140px]">
                                Status
                              </th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-gray-100">
                            {group.lessons.map((l) => {
                              const isMakeup = l.courseId !== group.courseId;
                              const dateLabel = l.dateStr
                                ? l.dateStr.split("-").slice(1).join("-")
                                : "-";

                              return (
                                <tr
                                  key={l.id}
                                  className="hover:bg-gray-50 transition"
                                >
                                  <td className="py-2.5 px-4 text-gray-700 font-medium">
                                    L{l.id}
                                  </td>
                                  <td className="py-2.5 px-4">
                                    <button
                                      type="button"
                                      className={cx(
                                        "inline-flex items-center gap-2 rounded-lg px-2 py-1 -ml-2",
                                        "text-sky-700 hover:bg-sky-50 transition",
                                        "focus:outline-none focus:ring-2 focus:ring-blue-500/15"
                                      )}
                                      onClick={() =>
                                        handleOpenReschedule(viewingStudent, l)
                                      }
                                      title={activeTab === 'potential' ? "Edit Proposal" : "Reschedule"}
                                    >
                                      <CalendarClock className="h-4 w-4" />
                                      <span className="font-medium">
                                        {dateLabel}
                                      </span>
                                      {isMakeup && (
                                        <Chip
                                          className="bg-yellow-100 text-yellow-800"
                                          title="Makeup lesson"
                                        >
                                          Makeup
                                        </Chip>
                                      )}
                                    </button>
                                  </td>
                                  <td className="py-2.5 px-4 text-gray-700">
                                    {l.timeSlot || "-"}
                                  </td>
                                  <td className="py-2.5 px-4">
                                    {l.completed ? (
                                      <span className="inline-flex items-center gap-2">
                                        <span className="h-8 px-3 inline-flex items-center gap-2 rounded-lg bg-emerald-50 text-emerald-700 border border-emerald-100 text-xs font-semibold">
                                          <CheckCircle2 className="h-4 w-4" />
                                          Completed
                                        </span>
                                      </span>
                                    ) : (
                                      <span className="inline-flex items-center gap-2">
                                        <span className="h-8 px-3 inline-flex items-center gap-2 rounded-lg bg-amber-50 text-amber-700 border border-amber-100 text-xs font-semibold">
                                          <Clock3 className="h-4 w-4" />
                                          Pending
                                        </span>
                                      </span>
                                    )}
                                  </td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* RESCHEDULE MODAL */}
      {reschedulingLesson && (
        <div
          className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm grid place-items-center p-4"
          onMouseDown={() => setReschedulingLesson(null)}
        >
          <div
            className="w-full max-w-lg max-h-[80vh] overflow-auto bg-white rounded-lg border border-gray-200 shadow-lg"
            onMouseDown={(e) => e.stopPropagation()}
          >
            <div className="p-5 border-b border-gray-200">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="text-sm font-semibold text-gray-900">
                    {activeTab === 'potential' ? "Modify Proposal: " : "Reschedule lesson "} 
                    L{reschedulingLesson.lesson.id}
                  </div>
                  <div className="text-xs text-gray-500 mt-1">
                    Current:{" "}
                    <span className="font-mono">
                      {reschedulingLesson.lesson.dateStr || "—"}
                    </span>
                    {" "}
                    {reschedulingLesson.lesson.timeSlot
                      ? `(${reschedulingLesson.lesson.timeSlot})`
                      : ""}
                  </div>
                </div>
                <button
                  type="button"
                  className="h-9 px-3 rounded-lg text-sm text-gray-700 hover:bg-gray-900/5 transition active:scale-95 cursor-pointer"
                  onClick={() => setReschedulingLesson(null)}
                  title="Close"
                >
                  Close
                </button>
              </div>
            </div>

            <div className="p-5">
              <div className="text-xs font-semibold text-gray-700 mb-2">
                Available sessions
              </div>
              {reschedulingLesson.options.length === 0 ? (
                <div className="rounded-lg border border-gray-200 bg-gray-50 p-4 text-sm text-gray-600">
                  No other courses found for this lesson.
                </div>
              ) : (
                <div className="space-y-2">
                  {reschedulingLesson.options.map((opt, i) => (
                    <button
                      key={`${opt.courseId}-${opt.lessonId}-${i}`}
                      type="button"
                      className={cx(
                        "w-full text-left rounded-lg border border-gray-200 bg-white px-3 py-2",
                        "hover:bg-gray-50 hover:shadow-sm transition",
                        "focus:outline-none focus:ring-2 focus:ring-blue-500/15"
                      )}
                      onClick={() => confirmReschedule(opt)}
                      title="Confirm reschedule"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <div className="text-sm font-medium text-gray-900">
                            {opt.dateStr}{" "}
                            <span className="text-gray-500 font-normal">
                              ({opt.timeSlot})
                            </span>
                          </div>
                          <div className="text-xs text-gray-500 mt-0.5 truncate">
                            {opt.name || "Lesson"} • {opt.label}
                          </div>
                        </div>
                        <Chip className="bg-sky-100 text-sky-700">Select</Chip>
                      </div>
                    </button>
                  ))}
                </div>
              )}
              <button
                type="button"
                className="mt-4 w-full h-10 rounded-lg border border-gray-200 text-gray-700 hover:bg-gray-50 transition active:scale-[0.99] cursor-pointer"
                onClick={() => setReschedulingLesson(null)}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// Helper Component: Copy Link Button
function CopyLinkButton({ studentId }: { studentId: string }) {
  const [copied, setCopied] = useState(false);
  const link = `http://192.168.56.1:3000/login?studentId=${studentId}`;

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(link);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error("Failed to copy:", err);
      prompt("Copy this link:", link);
    }
  };

  return (
    <button
      onClick={handleCopy}
      className={`
        flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-full transition-all border
        ${copied 
          ? "bg-green-50 text-green-700 border-green-200" 
          : "bg-white text-gray-600 border-gray-200 hover:border-blue-300 hover:text-blue-600"}
      `}
      title="Copy Parent Portal Link"
    >
      {copied ? (
        <>
          <CheckCircle2 size={14} />
          <span>Copied</span>
        </>
      ) : (
        <>
          <LinkIcon size={14} />
          <span>Copy Link</span>
        </>
      )}
    </button>
  );
}
