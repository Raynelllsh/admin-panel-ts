// src/app/admin/page.tsx
"use client";

import React, { useState } from "react";
import { useAdminData } from "@/hooks/useAdminData";
import TimetableTab from "@/components/dashboard/TimetableTab";
import StudentsTab from "@/components/dashboard/StudentsTab";
import EnrollmentTab from "@/components/dashboard/EnrollmentTab";
import PDFTab from "@/components/dashboard/PDFTab";
import { AdminDataHook } from "@/types";

export default function AdminDashboard() {
  const {
    allCourses,
    setAllCourses,
    allStudents,
    setAllStudents,
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
    enrollStudentToCourse,
    rescheduleStudent,
  } = useAdminData() as AdminDataHook;

  const [activeTab, setActiveTab] = useState<
    "TIMETABLE" | "STUDENTS" | "ENROLLMENT" | "PDF MANAGER"
  >("TIMETABLE");

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-xl font-semibold text-gray-600">
          Loading Dashboard...
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="z-100 fixed top-0 w-full px-8 h-20 flex justify-between items-center bg-sky-950 text-white">
        <h1 className="text-2xl font-bold">Siuroma Kids Admin Dashboard</h1>
        <div className="text-xl flex gap-5 font-medium">
          <button
            onClick={() => setActiveTab("TIMETABLE")}
            className="cursor-pointer hover:opacity-80 transition"
          >
            Timetable
          </button>
          <button
            onClick={() => setActiveTab("STUDENTS")}
            className="cursor-pointer hover:opacity-80 transition"
          >
            Students
          </button>
          <button
            onClick={() => setActiveTab("ENROLLMENT")}
            className="cursor-pointer hover:opacity-80 transition"
          >
            Enrollment
          </button>
          <button
            onClick={() => setActiveTab("PDF MANAGER")}
            className="cursor-pointer hover:opacity-80 transition"
          >
            PDF Manager
          </button>
        </div>
      </nav>

      <div className="h-20"></div>

      {/* Content */}
      {activeTab === "TIMETABLE" && (
        <TimetableTab
          allCourses={allCourses}
          allStudents={allStudents}
          loading={loading}
          availableCategories={availableCategories}
          availableRounds={availableRounds}
          createCourse={createCourse}
          deleteCourse={deleteCourse}
          addStudentToLesson={addStudentToLesson}
          removeStudentFromLesson={removeStudentFromLesson}
          toggleLessonCompletion={toggleLessonCompletion}
          shiftCourseDates={shiftCourseDates}
          saveCourseToFirebase={saveCourseToFirebase}
          rescheduleStudent={rescheduleStudent}
        />
      )}

      {activeTab === "STUDENTS" && (
        <StudentsTab
          allStudents={allStudents}
          allCourses={allCourses}
          setAllStudents={setAllStudents}
          onCourseSave={saveCourseToFirebase}
          rescheduleStudent={rescheduleStudent}
        />
      )}

      {activeTab === "ENROLLMENT" && (
        <EnrollmentTab
          allCourses={allCourses}
          setAllStudents={setAllStudents}
          enrollStudentToCourse={enrollStudentToCourse}
        />
      )}

      {activeTab === "PDF MANAGER" && <PDFTab />}
    </div>
  );
}
