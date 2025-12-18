// src/app/admin/page.tsx
"use client";

import React, { useState } from "react";
import { useAdminData } from "@/hooks/useAdminData";
import TimetableTab from "@/components/dashboard/TimetableTab";
import StudentsTab from "@/components/dashboard/StudentsTab";
import EnrollmentTab from "@/components/dashboard/EnrollmentTab";
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

  const [activeTab, setActiveTab] = useState<"TIMETABLE" | "STUDENTS" | "ENROLLMENT">("TIMETABLE");

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-xl font-semibold text-gray-600">Loading Dashboard...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex justify-between items-center">
          <h1 className="text-3xl font-bold text-gray-800">Admin Dashboard</h1>
          <div className="flex gap-2">
            <button
              onClick={() => setActiveTab("TIMETABLE")}
              className={`px-4 py-2 rounded-lg transition-colors ${
                activeTab === "TIMETABLE"
                  ? "bg-blue-600 text-white"
                  : "bg-white text-gray-600 hover:bg-gray-100"
              }`}
            >
              Timetable
            </button>
            <button
              onClick={() => setActiveTab("STUDENTS")}
              className={`px-4 py-2 rounded-lg transition-colors ${
                activeTab === "STUDENTS"
                  ? "bg-blue-600 text-white"
                  : "bg-white text-gray-600 hover:bg-gray-100"
              }`}
            >
              Students
            </button>
            <button
              onClick={() => setActiveTab("ENROLLMENT")}
              className={`px-4 py-2 rounded-lg transition-colors ${
                activeTab === "ENROLLMENT"
                  ? "bg-blue-600 text-white"
                  : "bg-white text-gray-600 hover:bg-gray-100"
              }`}
            >
              Enrollment
            </button>
          </div>
        </div>

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
      </div>
    </div>
  );
}
