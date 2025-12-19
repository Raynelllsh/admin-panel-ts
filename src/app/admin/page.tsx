// src/app/admin/page.tsx

"use client";

import React, { useState } from "react";
import { useAdminData } from "@/hooks/useAdminData";
import TimetableTab from "@/components/dashboard/TimetableTab";
import StudentsTab from "@/components/dashboard/StudentsTab";
import EnrollmentTab from "@/components/dashboard/EnrollmentTab";
import RequestsTab from "@/components/dashboard/RequestsTab";
import { AdminDataHook } from "@/types";

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

  const [activeTab, setActiveTab] = useState<"TIMETABLE" | "STUDENTS" | "ENROLLMENT" | "REQUESTS">("TIMETABLE");

  if (loading) {
    return <div className="flex min-h-screen items-center justify-center">Loading...</div>;
  }

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="mx-auto max-w-7xl">
        <h1 className="mb-8 text-3xl font-bold text-gray-900">Admin Dashboard</h1>

        {/* Tab Navigation */}
        <div className="mb-8 flex space-x-1 rounded-xl bg-gray-200 p-1">
          <button onClick={() => setActiveTab("TIMETABLE")} className={`w-full rounded-lg py-2.5 text-sm font-medium leading-5 transition-all duration-200 ${activeTab === "TIMETABLE" ? "bg-white text-blue-700 shadow" : "text-gray-700 hover:bg-white/50"}`}>
            Timetable
          </button>
          <button onClick={() => setActiveTab("STUDENTS")} className={`w-full rounded-lg py-2.5 text-sm font-medium leading-5 transition-all duration-200 ${activeTab === "STUDENTS" ? "bg-white text-blue-700 shadow" : "text-gray-700 hover:bg-white/50"}`}>
            Students
          </button>
          <button onClick={() => setActiveTab("ENROLLMENT")} className={`w-full rounded-lg py-2.5 text-sm font-medium leading-5 transition-all duration-200 ${activeTab === "ENROLLMENT" ? "bg-white text-blue-700 shadow" : "text-gray-700 hover:bg-white/50"}`}>
            Enrollment
          </button>
          <button onClick={() => setActiveTab("REQUESTS")} className={`relative w-full rounded-lg py-2.5 text-sm font-medium leading-5 transition-all duration-200 ${activeTab === "REQUESTS" ? "bg-white text-blue-700 shadow" : "text-gray-700 hover:bg-white/50"}`}>
            Requests
            {requests && requests.length > 0 && (
              <span className="absolute right-2 top-2 flex h-5 w-5 items-center justify-center rounded-full bg-red-500 text-xs text-white">
                {requests.length}
              </span>
            )}
          </button>
        </div>

        {/* Tab Content */}
        <div className="bg-white p-6 shadow rounded-lg">
          {activeTab === "TIMETABLE" && (
            <TimetableTab
              allCourses={allCourses}
              allStudents={allStudents}
              availableCategories={availableCategories}
              availableRounds={availableRounds}
              createCourse={createCourse}
              deleteCourse={deleteCourse}
              addStudentToLesson={addStudentToLesson}
              removeStudentFromLesson={removeStudentFromLesson}
              onToggleCompletion={toggleLessonCompletion}
              onShiftDates={shiftCourseDates}
              saveCourseToFirebase={saveCourseToFirebase}
              rescheduleStudent={rescheduleStudent}
              // Pass the new updateCourse function here
              // updateCourse={updateCourse}
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
          {activeTab === "REQUESTS" && (
            <RequestsTab
              requests={requests}
              onHandleRequest={handleRequest}
            />
          )}
        </div>
      </div>
    </div>
  );
}
