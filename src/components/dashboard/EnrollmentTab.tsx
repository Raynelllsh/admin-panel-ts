// src/components/dashboard/EnrollmentTab.tsx
"use client";

import React, { useState, useMemo, FormEvent } from "react";
import { doc, setDoc, getDoc } from "firebase/firestore";
import { db } from "@/firebase";
import { Course, Student, PersonalInfo } from "@/types";

interface EnrollmentTabProps {
  allCourses: Course[];
  setAllStudents: React.Dispatch<React.SetStateAction<Student[]>>;
  enrollStudentToCourse: (courseId: string, studentId: string) => Promise<{ success: boolean; msg?: string }>;
}

export default function EnrollmentTab({
  allCourses,
  setAllStudents,
  enrollStudentToCourse,
}: EnrollmentTabProps) {
  // --- FORM STATE ---
  // Identity
  const [enrollId, setEnrollId] = useState<string>("");
  const [enrollName, setEnrollName] = useState<string>("");
  const [enrollChiName, setEnrollChiName] = useState<string>("");
  const [enrollSex, setEnrollSex] = useState<string>("M");
  const [enrollLevel, setEnrollLevel] = useState<string>("K3");
  const [enrollLang, setEnrollLang] = useState<string>("Cantonese");

  // Personal / Medical
  const [enrollCondition, setEnrollCondition] = useState<string>("");
  const [enrollAllergies, setEnrollAllergies] = useState<string>("NIL");
  const [enrollFavChar, setEnrollFavChar] = useState<string>("");
  const [enrollComfort, setEnrollComfort] = useState<string>("");

  // Parent Info
  const [enrollParentName, setEnrollParentName] = useState<string>("");
  const [enrollParentContact, setEnrollParentContact] = useState<string>("");

  // Course Selection
  const [enrollCourse, setEnrollCourse] = useState<string>("");
  const [enrollRound, setEnrollRound] = useState<string>("");
  const [enrollmentStatus, setEnrollmentStatus] = useState<string>("");

  // --- DERIVED LISTS ---
  const availableCourses = useMemo(
    () => Array.from(new Set(allCourses.map((c) => c.id))).sort(),
    [allCourses]
  );

  const availableRoundsForSelectedCourse = useMemo(
    () =>
      Array.from(
        new Set(
          allCourses
            .filter((c) => c.id === enrollCourse)
            .map((c) => c.path?.round)
        )
      ).sort(),
    [allCourses, enrollCourse]
  );

  // --- SUBMIT HANDLER ---
  const handleEnrollStudent = async (e: FormEvent) => {
    e.preventDefault();
    if (!enrollId || !enrollName || !enrollCourse || !enrollRound) return;

    setEnrollmentStatus("Processing...");

    try {
      const studentRef = doc(db, "students", enrollId);
      const studentSnap = await getDoc(studentRef);

      const newPersonalInfo: PersonalInfo = {
        name: enrollName,
        chineseName: enrollChiName || "",
        preferredLanguage: enrollLang,
        condition: enrollCondition || "",
        sex: enrollSex,
        level: enrollLevel,
        favChar: enrollFavChar || "",
        allergies: enrollAllergies || "NIL",
        comfortMethod: enrollComfort || "",
        parentName: enrollParentName || "",
        parentContact: enrollParentContact || "",
      };

      // 1. Create Student if not exists
      if (!studentSnap.exists()) {
        const newStudent: Student = {
          id: enrollId,
          name: enrollName,
          personalInfo: newPersonalInfo,
          enrollment: [],
        };
        
        await setDoc(studentRef, newStudent);

        // Optimistically add to local list
        setAllStudents((prev) => [...prev, newStudent]);
      }

      // 2. Enroll in Course (Handles Roster + DB)
      const result = await enrollStudentToCourse(enrollCourse, enrollId);

      if (result.success) {
        setEnrollmentStatus(`Success! ${enrollName} enrolled in ${enrollCourse}.`);
        // Reset Form
        setEnrollId("");
        setEnrollName("");
        setEnrollChiName("");
        setEnrollCondition("");
        setEnrollFavChar("");
        setEnrollAllergies("NIL");
        setEnrollComfort("");
        setEnrollParentName("");
        setEnrollParentContact("");
        setEnrollCourse("");
        setEnrollRound("");
      } else {
        setEnrollmentStatus(`Error: ${result.msg}`);
      }
    } catch (err) {
      console.error(err);
      setEnrollmentStatus("Error enrolling student.");
    }
  };

  // Return JSX (truncated for brevity, logic remains identical)
  return (
    <div className="max-w-4xl mx-auto p-6 bg-white rounded-lg shadow-md">
      <h2 className="text-2xl font-bold mb-6 text-gray-800 border-b pb-2">
        New Student Enrollment
      </h2>

      <form onSubmit={handleEnrollStudent} className="space-y-6">
        
        {/* SECTION 1: IDENTITY */}
        <div className="bg-gray-50 p-4 rounded-md border border-gray-100">
          <h3 className="text-md font-semibold text-blue-800 mb-3">Student Identity</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700">Student ID *</label>
              <input
                className="mt-1 block w-full border border-gray-300 rounded-md p-2"
                value={enrollId}
                onChange={(e) => setEnrollId(e.target.value)}
                placeholder="e.g. STU001"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">English Name *</label>
              <input
                className="mt-1 block w-full border border-gray-300 rounded-md p-2"
                value={enrollName}
                onChange={(e) => setEnrollName(e.target.value)}
                placeholder="Full Name"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Chinese Name</label>
              <input
                className="mt-1 block w-full border border-gray-300 rounded-md p-2"
                value={enrollChiName}
                onChange={(e) => setEnrollChiName(e.target.value)}
                placeholder="Optional"
              />
            </div>
          </div>

          <div className="grid grid-cols-3 md:grid-cols-3 gap-4 mt-4">
             <div>
              <label className="block text-sm font-medium text-gray-700">Gender</label>
              <select
                className="mt-1 block w-full border border-gray-300 rounded-md p-2"
                value={enrollSex}
                onChange={(e) => setEnrollSex(e.target.value)}
              >
                <option value="M">Male</option>
                <option value="F">Female</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Level</label>
              <select
                className="mt-1 block w-full border border-gray-300 rounded-md p-2"
                value={enrollLevel}
                onChange={(e) => setEnrollLevel(e.target.value)}
              >
                <option value="K1">K1</option>
                <option value="K2">K2</option>
                <option value="K3">K3</option>
                <option value="P1">P1</option>
              </select>
            </div>
             <div>
              <label className="block text-sm font-medium text-gray-700">Language</label>
              <select
                className="mt-1 block w-full border border-gray-300 rounded-md p-2"
                value={enrollLang}
                onChange={(e) => setEnrollLang(e.target.value)}
              >
                <option value="Cantonese">Cantonese</option>
                <option value="English">English</option>
                <option value="Mandarin">Mandarin</option>
              </select>
            </div>
          </div>
        </div>

        {/* SECTION 2: PERSONAL & MEDICAL */}
        <div className="bg-gray-50 p-4 rounded-md border border-gray-100">
          <h3 className="text-md font-semibold text-blue-800 mb-3">Personal & Medical Details</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="col-span-2">
              <label className="block text-sm font-medium text-gray-700">Allergies</label>
              <input
                className="mt-1 block w-full border border-gray-300 rounded-md p-2"
                value={enrollAllergies}
                onChange={(e) => setEnrollAllergies(e.target.value)}
                placeholder="NIL if none"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Special Conditions</label>
              <input
                className="mt-1 block w-full border border-gray-300 rounded-md p-2"
                value={enrollCondition}
                onChange={(e) => setEnrollCondition(e.target.value)}
                placeholder="e.g. ADHD, Mild Autism"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Favorite Character</label>
              <input
                className="mt-1 block w-full border border-gray-300 rounded-md p-2"
                value={enrollFavChar}
                onChange={(e) => setEnrollFavChar(e.target.value)}
                placeholder="e.g. Elsa, Spiderman"
              />
            </div>
            <div className="col-span-2">
              <label className="block text-sm font-medium text-gray-700">Comfort Method</label>
              <input
                className="mt-1 block w-full border border-gray-300 rounded-md p-2"
                value={enrollComfort}
                onChange={(e) => setEnrollComfort(e.target.value)}
                placeholder="How to calm them down? (e.g. pat on back, quiet corner)"
              />
            </div>
          </div>
        </div>

        {/* SECTION 3: PARENT INFO */}
        <div className="bg-gray-50 p-4 rounded-md border border-gray-100">
          <h3 className="text-md font-semibold text-blue-800 mb-3">Parent / Guardian Information</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700">Parent Name</label>
              <input
                className="mt-1 block w-full border border-gray-300 rounded-md p-2"
                value={enrollParentName}
                onChange={(e) => setEnrollParentName(e.target.value)}
                placeholder="Parent's Name"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Contact Number</label>
              <input
                className="mt-1 block w-full border border-gray-300 rounded-md p-2"
                value={enrollParentContact}
                onChange={(e) => setEnrollParentContact(e.target.value)}
                placeholder="Phone or Email"
              />
            </div>
          </div>
        </div>

        {/* SECTION 4: COURSE SELECTION */}
        <div className="border-t pt-4 mt-2">
          <h3 className="text-lg font-bold text-gray-900 mb-4">Select Course</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Course Name</label>
              <select
                className="block w-full border border-gray-300 rounded-md p-3 focus:ring-blue-500 focus:border-blue-500"
                value={enrollCourse}
                onChange={(e) => {
                  setEnrollCourse(e.target.value);
                  setEnrollRound("");
                }}
                required
              >
                <option value="">-- Select Course --</option>
                {availableCourses.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Round / Iteration</label>
              <select
                className="block w-full border border-gray-300 rounded-md p-3 focus:ring-blue-500 focus:border-blue-500"
                value={enrollRound}
                onChange={(e) => setEnrollRound(e.target.value)}
                required
                disabled={!enrollCourse}
              >
                <option value="">-- Select Round --</option>
                {availableRoundsForSelectedCourse.map((r) => (
                  <option key={r} value={r}>
                    {r}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* SUBMIT BUTTON */}
        <button
          type="submit"
          className="w-full bg-blue-600 text-white font-bold py-3 px-4 rounded hover:bg-blue-700 transition duration-150 ease-in-out shadow-lg mt-4"
        >
          Enroll Student
        </button>

        {/* STATUS MESSAGE */}
        {enrollmentStatus && (
          <div
            className={`p-4 rounded text-center font-medium ${
              enrollmentStatus.includes("Success")
                ? "bg-green-100 text-green-800 border border-green-200"
                : "bg-red-100 text-red-800 border border-red-200"
            }`}
          >
            {enrollmentStatus}
          </div>
        )}
      </form>
    </div>
  );
}
