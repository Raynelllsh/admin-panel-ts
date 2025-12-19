// src/components/dashboard/EnrollmentTab.tsx
"use client";

import React, { useState, FormEvent, useEffect } from "react";
import { doc, setDoc, getDoc } from "firebase/firestore";
import { db } from "@/firebase";
import { Course, Student, PersonalInfo } from "@/types";

interface EnrollmentTabProps {
  allStudents: Student[];
  allCourses: Course[];
  setAllStudents: React.Dispatch<React.SetStateAction<Student[]>>;
  enrollStudentToCourse: (courseId: string, studentId: string) => Promise<{ success: boolean; msg?: string }>;
  onEnroll: (courseId: string, studentId: string) => Promise<{ success: boolean; msg?: string }>;
}

export default function EnrollmentTab({
  allStudents,
  allCourses,
  setAllStudents,
  onEnroll,
}: EnrollmentTabProps) {
  // --- FORM STATE ---
  
  // 1. Identification
  const [enrollId, setEnrollId] = useState("");
  const [isExistingStudent, setIsExistingStudent] = useState(false);
  
  // 2. New Student Details (Only used if !isExistingStudent)
  const [enrollName, setEnrollName] = useState("");
  const [enrollChiName, setEnrollChiName] = useState("");
  const [enrollSex, setEnrollSex] = useState("M");
  const [enrollLevel, setEnrollLevel] = useState("K3");
  const [enrollLang, setEnrollLang] = useState("Cantonese");
  
  // 3. Medical / Personal (Only used if !isExistingStudent)
  const [enrollCondition, setEnrollCondition] = useState("");
  const [enrollAllergies, setEnrollAllergies] = useState("NIL");
  const [enrollFavChar, setEnrollFavChar] = useState("");
  const [enrollComfort, setEnrollComfort] = useState("");
  
  // 4. Parent Info (Only used if !isExistingStudent)
  const [enrollParentName, setEnrollParentName] = useState("");
  const [enrollParentContact, setEnrollParentContact] = useState("");

  // 5. Course Selection (Manual Inputs)
  const [courseInput, setCourseInput] = useState("");
  const [roundInput, setRoundInput] = useState("");

  // Status
  const [statusMsg, setStatusMsg] = useState("");
  const [statusType, setStatusType] = useState<"idle" | "success" | "error">("idle");

  // --- EFFECT: Check if student exists when ID changes ---
  useEffect(() => {
    const timer = setTimeout(() => {
      if (!enrollId) {
        setIsExistingStudent(false);
        return;
      }
      const found = allStudents.find((s) => s.id === enrollId);
      if (found) {
        setIsExistingStudent(true);
        setEnrollName(found.name); // Auto-fill name for display
      } else {
        setIsExistingStudent(false);
        setEnrollName(""); // Clear name to allow input
      }
    }, 500); // 500ms debounce
    return () => clearTimeout(timer);
  }, [enrollId, allStudents]);

  // --- SUBMIT HANDLER ---
  const handleEnroll = async (e: FormEvent) => {
    e.preventDefault();
    setStatusMsg("Processing...");
    setStatusType("idle");

    if (!enrollId || !courseInput || !roundInput) {
      setStatusMsg("Missing required fields (ID, Course, Round).");
      setStatusType("error");
      return;
    }

    // 1. Construct Target Course ID
    // Assumption: System uses "Name + Round" as ID (e.g. "English" + "round001" = "Englishround001")
    const targetCourseId = courseInput.trim() + roundInput.trim();
    
    // Verify course exists locally before trying
    const courseExists = allCourses.some((c) => c.id === targetCourseId);
    if (!courseExists) {
      setStatusMsg(`Course not found with ID: ${targetCourseId}. Check Course Name and Round.`);
      setStatusType("error");
      return;
    }

    try {
      // 2. Create Student if NEW
      if (!isExistingStudent) {
        if (!enrollName) {
            setStatusMsg("Name is required for new students.");
            setStatusType("error");
            return;
        }

        const newPersonalInfo: PersonalInfo = {
          name: enrollName,
          chineseName: enrollChiName,
          preferredLanguage: enrollLang,
          condition: enrollCondition,
          sex: enrollSex,
          level: enrollLevel,
          favChar: enrollFavChar,
          allergies: enrollAllergies,
          comfortMethod: enrollComfort,
          parentName: enrollParentName,
          parentContact: enrollParentContact,
        };
        const newStudent: Student = {
          id: enrollId,
          name: enrollName,
          personalInfo: newPersonalInfo,
          enrollment: [],
        };
        
        const studentRef = doc(db, "students", enrollId);
        await setDoc(studentRef, newStudent);
        await setDoc(studentRef, newStudent);

        // Optimistically add to local list
        setAllStudents((prev) => [...prev, newStudent]);
      }

      // 3. Enroll (API Call)
      const result = await onEnroll(targetCourseId, enrollId);

      if (result.success) {
        setStatusMsg(`Success! ${enrollName} enrolled in ${courseInput}.`);
        setStatusType("success");
        // Reset Form
        setEnrollId("");
        setEnrollName("");
        setIsExistingStudent(false);
      } else {
        setStatusMsg(`Enrollment Failed: ${result.msg}`);
        setStatusType("error");
      }

    } catch (err) {
      console.error(err);
      setStatusMsg("An unexpected error occurred.");
      setStatusType("error");
    }
  };

  return (
    <div className="max-w-4xl mx-auto p-6 bg-white rounded-lg shadow-md">
      <h2 className="text-2xl font-bold mb-6 text-gray-800 border-b pb-2">
        New Student Enrollment
      </h2>

      <form onSubmit={handleEnroll} className="space-y-6">
        
        {/* SECTION 1: IDENTITY */}
        <div className="bg-gray-50 p-4 rounded-md border border-gray-100">
          <h3 className="text-md font-semibold text-blue-800 mb-3">Student Identity</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700">Student ID *</label>
              <input
                type="text"
                value={enrollId}
                onChange={(e) => setEnrollId(e.target.value)}
                className="w-full rounded border p-2 focus:border-blue-500 focus:outline-none"
                placeholder="e.g. STU001"
                required
              />
              {enrollId && (
                <p className={`mt-1 text-xs ${isExistingStudent ? "text-green-600" : "text-amber-600"}`}>
                  {isExistingStudent 
                    ? `Found existing: ${enrollName}` 
                    : "New student (will be created)"}
                </p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">English Name *</label>
              <input
                type="text"
                value={courseInput}
                onChange={(e) => setCourseInput(e.target.value)}
                className="w-full rounded border p-2 focus:border-blue-500 focus:outline-none"
                placeholder="e.g. English_A"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">Chinese Name</label>
              <input
                type="text"
                value={roundInput}
                onChange={(e) => setRoundInput(e.target.value)}
                className="w-full rounded border p-2 focus:border-blue-500 focus:outline-none"
                placeholder="e.g. round001"
                required
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
              <input
                type="text"
                className="block w-full border border-gray-300 rounded-md p-3 focus:ring-blue-500 focus:border-blue-500"
                value={courseInput}
                onChange={(e) => setCourseInput(e.target.value)}
                placeholder="e.g. English"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Round / Iteration</label>
              <input
                type="text"
                className="block w-full border border-gray-300 rounded-md p-3 focus:ring-blue-500 focus:border-blue-500"
                value={roundInput}
                onChange={(e) => setRoundInput(e.target.value)}
                placeholder="e.g. round001"
                required
              />
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
        {statusMsg && (
          <div
            className={`p-4 rounded text-center font-medium ${
              statusType === "success"
                ? "bg-green-100 text-green-800 border border-green-200"
                : "bg-red-100 text-red-800 border border-red-200"
            }`}
          >
            {statusMsg}
          </div>
        )}
      </form>
    </div>
  );
}
