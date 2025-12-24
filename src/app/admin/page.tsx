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
import Image from "next/image";

export default function AdminDashboard() {
  const {
    allCourses,
    allStudents,
    setAllStudents,
    loading,
    availableCategories,
    availableRounds,
    requests,
    potentialStudents,
    reschedulePotentialStudent,
    // Functions
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
    // New Helper Function (Make sure this is destructured)
    findMissingLessons, 
    // Potential Student Functions
    addPotentialStudent,
    removePotentialStudent,
    promotePotentialStudent,
  } = useAdminData() as unknown as AdminDataHook;

  const [activeTab, setActiveTab] = useState<
    "TIMETABLE" | "STUDENTS" | "ENROLLMENT" | "PDF MANAGER" | "REQUESTS"
  >("TIMETABLE");

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50">
        <div className="text-xl font-semibold text-gray-600 animate-pulse">
          Loading Admin Dashboard...
        </div>
      </div>
    );
  }

  // Fallback for safety if hook isn't updated yet
  const safeAllStudents = allStudents || [];

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col font-sans text-gray-900">
      {/* HEADER */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-50 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center gap-3">
              <Image
                src={logo}
                alt="Logo"
                width={40}
                height={40}
                className="object-contain"
              />
              <h1 className="text-xl font-bold text-gray-800 tracking-tight">
                Admin Panel
              </h1>
            </div>
            <nav className="flex space-x-1">
              {[
                "TIMETABLE",
                "STUDENTS",
                "ENROLLMENT",
                "REQUESTS",
                "PDF MANAGER",
              ].map((tab) => (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab as any)}
                  className={`px-4 py-2 rounded-md text-sm font-medium transition-colors duration-150 ${
                    activeTab === tab
                      ? "bg-blue-600 text-white shadow-md"
                      : "text-gray-600 hover:bg-gray-100 hover:text-gray-900"
                  }`}
                >
                  {tab === "REQUESTS" && requests.length > 0
                    ? `REQUESTS (${requests.length})`
                    : tab}
                </button>
              ))}
            </nav>
          </div>
        </div>
      </header>

      {/* MAIN CONTENT */}
      <main className="flex-1 max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-8">
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 min-h-[600px] overflow-hidden">
          {activeTab === "TIMETABLE" && (
            <TimetableTab
              allCourses={allCourses}
              allStudents={safeAllStudents}
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
              allStudents={safeAllStudents}
              setAllStudents={setAllStudents}
              allCourses={allCourses}
              // --- UPDATED PROPS BELOW ---
              potentialStudents={potentialStudents}
              rescheduleStudent={rescheduleStudent}
              reschedulePotentialStudent={reschedulePotentialStudent}
              addStudentToLesson={addStudentToLesson}
              findMissingLessons={findMissingLessons}
            />
          )}

          {activeTab === "ENROLLMENT" && (
            <EnrollmentTab
              allStudents={safeAllStudents}
              allCourses={allCourses}
              potentialStudents={potentialStudents}
              setAllStudents={setAllStudents}
              onEnroll={enrollStudentToCourse}
              onAddPotential={addPotentialStudent}
              onRemovePotential={removePotentialStudent}
              onPromotePotential={promotePotentialStudent}
            />
          )}

          {activeTab === "REQUESTS" && (
            <RequestsTab 
              requests={requests} 
              onHandleRequest={handleRequest} 
            />
          )}

          {activeTab === "PDF MANAGER" && <PDFTab />}
        </div>
      </main>
    </div>
  );
}
