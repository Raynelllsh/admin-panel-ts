// src/components/dashboard/StudentsTab.tsx
"use client";

import React, { useState, useMemo } from "react";
import { Student, Course, StudentLesson } from "@/types";

interface StudentsTabProps {
  allStudents: Student[];
  allCourses: Course[];
  setAllStudents: React.Dispatch<React.SetStateAction<Student[]>>;
  onCourseSave?: (course: Course) => void; // Optional based on original
  rescheduleStudent: (
    studentId: string, 
    oldLesson: { courseId: string; lessonId: string }, 
    newLesson: { courseId: string; lessonId: string; dateStr: string; timeSlot: string }
  ) => Promise<{ success: boolean; msg?: string }>;
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

export default function StudentsTab({
  allStudents,
  allCourses,
  setAllStudents,
  onCourseSave,
  rescheduleStudent,
}: StudentsTabProps) {
  const [viewingStudent, setViewingStudent] = useState<Student | null>(null);
  const [studentSearch, setStudentSearch] = useState<string>("");
  const [reschedulingLesson, setReschedulingLesson] = useState<{
    student: Student;
    lesson: StudentLesson;
    options: RescheduleOption[];
  } | null>(null);

  const filteredStudents = allStudents.filter(
    (s) =>
      s.name.toLowerCase().includes(studentSearch.toLowerCase()) ||
      s.id.toLowerCase().includes(studentSearch.toLowerCase())
  );

  // --- DATA TRANSFORMATION ---
  const viewingStudentEnrollmentGroups = useMemo<EnrollmentGroup[]>(() => {
    if (!viewingStudent || !viewingStudent.enrollment) return [];

    const groups: Record<string, EnrollmentGroup> = {};

    viewingStudent.enrollment.forEach((lesson) => {
      const key = lesson.courseId;
      if (!groups[key]) {
        const courseDetails = allCourses.find((c) => c.id === key);
        groups[key] = {
          courseId: key,
          courseName: courseDetails ? courseDetails.name : key,
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

  // --- RESCHEDULE LOGIC ---
  const handleOpenReschedule = (student: Student, currentLesson: StudentLesson) => {
    const options: RescheduleOption[] = [];

    allCourses.forEach((c) => {
      const matchingLesson = c.lessons.find((l) => l.id === currentLesson.lessonId); // Note: using lessonId to match generic lesson index (1-12)
      
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
      lessonId: lesson.lessonId, // Use lessonId property
    };

    const newLessonObj = {
      courseId: targetOption.courseId,
      lessonId: targetOption.lessonId,
      dateStr: targetOption.dateStr,
      timeSlot: targetOption.timeSlot,
    };

    const res = await rescheduleStudent(student.id, oldLessonObj, newLessonObj);

    if (res.success) {
      const updatedStudent = allStudents.find((s) => s.id === student.id);
      if (updatedStudent) {
        setViewingStudent(updatedStudent);
      }
    } else {
      alert("Error: " + res.msg);
    }
    setReschedulingLesson(null);
  };

  // Return JSX (Use original JSX structure)
  return (
    <div className="flex gap-4 h-[calc(100vh-100px)]">
      {/* LEFT: Student List */}
      <div className="w-1/3 border-r pr-4 overflow-y-auto">
        <input
          className="w-full border p-2 rounded mb-4 placeholder:text-gray-400"
          placeholder="Search students..."
          value={studentSearch}
          onChange={(e) => setStudentSearch(e.target.value)}
        />
        <table className="w-full text-sm text-left">
          <thead className="sticky top-0 bg-white">
            <tr className="border-b">
              <th className="p-2">ID</th>
              <th className="p-2">Name</th>
            </tr>
          </thead>
          <tbody>
            {filteredStudents.map((s) => (
              <tr
                key={s.id}
                className={`cursor-pointer hover:bg-blue-50 ${
                  viewingStudent?.id === s.id ? "bg-blue-100" : ""
                }`}
                onClick={() => setViewingStudent(s)}
              >
                <td className="p-2 border-b">{s.id}</td>
                <td className="p-2 border-b">{s.name}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* RIGHT: Student Detail */}
      <div className="w-2/3 overflow-y-auto">
        {viewingStudent ? (
          <div>
            <h2 className="text-2xl font-bold mb-2">
              {viewingStudent.name}{" "}
              <span className="text-gray-400 text-sm">({viewingStudent.id})</span>
            </h2>

            {viewingStudentEnrollmentGroups.length === 0 && (
              <p>No active enrollments.</p>
            )}

            {viewingStudentEnrollmentGroups.map((group, idx) => (
              <div key={idx} className="mb-6 border p-4 rounded shadow-sm">
                <h3 className="font-bold text-lg mb-2">
                  {group.courseName} -{" "}
                  <span className="text-gray-500 text-sm">{group.round}</span>
                </h3>
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-gray-100">
                      <th className="p-2 text-left">#</th>
                      <th className="p-2 text-left">Date (Click to Reschedule)</th>
                      <th className="p-2 text-left">Time</th>
                      <th className="p-2 text-left">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {group.lessons.map((l) => (
                      <tr key={l.id} className="border-b">
                        <td className="p-2">L{l.id}</td>
                        <td
                          className="p-2 text-blue-600 cursor-pointer hover:underline"
                          onClick={() => handleOpenReschedule(viewingStudent, l)}
                        >
                          {l.dateStr ? l.dateStr.split("-").slice(1).join("-") : "-"}
                          
                          {/* CHANGED: Check if lesson courseId differs from group courseId */}
                          {l.courseId !== group.courseId && (
                             <span className="ml-2 text-xs bg-yellow-100 px-1 rounded">
                               Makeup
                             </span>
                          )}
                        </td>
                        <td className="p-2">{l.timeSlot || "-"}</td>
                        <td className="p-2">
                          {l.completed ? "✅" : "⏳"}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ))}
          </div>
        ) : (
          <div className="flex items-center justify-center h-full">
            <p className="text-gray-500">Select a student to view details.</p>
          </div>
        )}
      </div>

      {/* RESCHEDULE MODAL */}
      {reschedulingLesson && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded shadow-lg w-[500px] max-h-[80vh] overflow-y-auto">
            <h3 className="font-bold text-lg mb-4">
              Reschedule Lesson {reschedulingLesson.lesson.id}
            </h3>
            <p className="mb-4">
              Current: <span className="font-mono">{reschedulingLesson.lesson.dateStr}</span> ({reschedulingLesson.lesson.timeSlot})
            </p>

            <h4 className="font-semibold mb-2">Available Sessions:</h4>
            <div className="space-y-2">
              {reschedulingLesson.options.map((opt, i) => (
                <button
                  key={i}
                  className="w-full border p-2 rounded hover:bg-blue-50 text-left flex justify-between"
                  onClick={() => confirmReschedule(opt)}
                >
                  <span>
                    {opt.dateStr} ({opt.timeSlot})
                  </span>
                  <span className="text-xs text-gray-500">{opt.label}</span>
                </button>
              ))}
              {reschedulingLesson.options.length === 0 && (
                <p className="text-red-500">No other courses found.</p>
              )}
            </div>
            <button
              className="mt-4 text-gray-500 underline text-sm w-full text-center"
              onClick={() => setReschedulingLesson(null)}
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
