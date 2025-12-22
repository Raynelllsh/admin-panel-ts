// src/app/admin/page.tsx

"use client";

import { useState } from "react";
import { useAdminData } from "@/hooks/useAdminData";
import TimetableTab from "@/components/dashboard/TimetableTab";
import StudentsTab from "@/components/dashboard/StudentsTab";
import EnrollmentTab from "@/components/dashboard/EnrollmentTab";
import RequestsTab from "@/components/dashboard/RequestsTab";
import PDFTab from "@/components/dashboard/PDFTab";
import { AdminDataHook } from "@/types";
import logo from "@/assets/logo.png";

export default function AdminDashboard() {
  const {
    allCourses,
    allStudents,
    loading,
    availableCategories,
    availableRounds,
    requests,
    handleRequest,
    createCourse,
    deleteCourse,
    addStudentToLesson,
    removeStudentFromLesson,
    toggleLessonCompletion,
    shiftCourseDates,
    saveCourseToFirebase,
    enrollStudentToCourse,
    rescheduleStudent,
    // Add the new updateCourse function here
    // updateCourse,
  } = useAdminData() as AdminDataHook;

  const [activeTab, setActiveTab] = useState<
    "TIMETABLE" | "STUDENTS" | "ENROLLMENT" | "PDF MANAGER" | "REQUESTS"
  >("TIMETABLE");
  const [students, setStudents] = useState(allStudents);

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
    <div className="min-h-screen bg-gray-50 font-sans">
      <nav className="z-100 fixed top-0 w-full px-8 h-20 flex justify-between items-center bg-white border-b shadow">
        <div className="flex gap-5 items-center cursor-pointer">
          <img
            src={logo.src}
            alt="Logo"
            className="h-15 w-auto object-contain"
            crossOrigin="anonymous"
          />
          <h1 className="text-2xl font-semibold">Admin Panel</h1>
        </div>
        <div className="text-lg flex gap-8">
          <button
            onClick={() => setActiveTab("TIMETABLE")}
            className="cursor-pointer hover:opacity-80 active:scale-95 transition"
          >
            Timetable
          </button>
          <button
            onClick={() => setActiveTab("STUDENTS")}
            className="cursor-pointer hover:opacity-80 active:scale-95 transition"
          >
            Students
          </button>
          <button
            onClick={() => setActiveTab("ENROLLMENT")}
            className="cursor-pointer hover:opacity-80 active:scale-95 transition"
          >
            Enrollment
          </button>
          <button
            onClick={() => setActiveTab("PDF MANAGER")}
            className="cursor-pointer hover:opacity-80 active:scale-95 transition"
          >
            PDF Manager
          </button>
          <button
            onClick={() => setActiveTab("REQUESTS")}
            className="cursor-pointer hover:opacity-80 active:scale-95 transition"
          >
            Requests
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
          onToggleCompletion={toggleLessonCompletion}
          shiftCourseDates={shiftCourseDates}
          saveCourseToFirebase={saveCourseToFirebase}
          rescheduleStudent={rescheduleStudent}
        />
      )}

      {activeTab === "STUDENTS" && (
        <StudentsTab
          allStudents={allStudents}
          allCourses={allCourses}
          rescheduleStudent={rescheduleStudent}
        />
      )}

      {activeTab === "ENROLLMENT" && (
        <EnrollmentTab
          allStudents={allStudents}
          allCourses={allCourses}
          onEnroll={enrollStudentToCourse}
        />
      )}

      {activeTab === "PDF MANAGER" && <PDFTab />}

      {activeTab === "REQUESTS" && (
        <RequestsTab requests={requests} onHandleRequest={handleRequest} />
      )}
    </div>
  );
}
