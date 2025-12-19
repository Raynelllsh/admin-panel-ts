// src/components/dashboard/EnrollmentTab.tsx
"use client";

import React, { useState, FormEvent, useEffect } from "react";
import { doc, setDoc, getDoc } from "firebase/firestore";
import { db } from "@/firebase";
import { Course, Student, PersonalInfo } from "@/types";

interface EnrollmentTabProps {
  allStudents: Student[];
  allCourses: Course[];
  // If you are using local state update for students in parent, keep this:
  setAllStudents?: React.Dispatch<React.SetStateAction<Student[]>>;
  onEnroll: (courseId: string, studentId: string) => Promise<{ success: boolean; msg?: string }>;
  onReschedule?: any; // Keeping for interface compatibility if needed
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

        // Save to Firebase
        await setDoc(doc(db, "students", enrollId), newStudent);
        
        // Update local state if setter provided
        if (setAllStudents) {
          setAllStudents((prev) => [...prev, newStudent]);
        }
      }

      // 3. Enroll (API Call)
      const result = await onEnroll(targetCourseId, enrollId);

      if (result.success) {
        setStatusMsg(`Successfully enrolled ${enrollName} into ${targetCourseId}`);
        setStatusType("success");
        // Clear inputs? Maybe keep them for rapid entry, just clear student ID
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
    <div className="mx-auto max-w-4xl space-y-6">
      <div className="rounded-lg bg-white p-6 shadow">
        <h2 className="mb-4 text-xl font-bold text-gray-800">
          Manual Enrollment
        </h2>
        
        <form onSubmit={handleEnroll} className="space-y-6">
          
          {/* --- SECTION 1: IDENTIFIERS --- */}
          <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
            <div>
              <label className="mb-1 block text-sm font-semibold text-gray-700">
                Student ID
              </label>
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
              <label className="mb-1 block text-sm font-semibold text-gray-700">
                Course Name / ID
              </label>
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
              <label className="mb-1 block text-sm font-semibold text-gray-700">
                Round ID
              </label>
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

          {/* --- SECTION 2: NEW STUDENT DETAILS (Conditional) --- */}
          {!isExistingStudent && enrollId && (
            <div className="rounded-lg border-2 border-dashed border-amber-200 bg-amber-50 p-4">
              <h3 className="mb-3 font-semibold text-amber-800">New Student Details</h3>
              
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <div>
                  <label className="block text-xs font-medium text-gray-600">Full Name *</label>
                  <input
                    type="text"
                    value={enrollName}
                    onChange={(e) => setEnrollName(e.target.value)}
                    className="mt-1 w-full rounded border p-2 text-sm"
                    placeholder="Student Name"
                    required={!isExistingStudent}
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600">Chinese Name</label>
                  <input
                    type="text"
                    value={enrollChiName}
                    onChange={(e) => setEnrollChiName(e.target.value)}
                    className="mt-1 w-full rounded border p-2 text-sm"
                    placeholder="Optional"
                  />
                </div>
                <div>
                   <label className="block text-xs font-medium text-gray-600">Level</label>
                   <select 
                      value={enrollLevel} 
                      onChange={(e) => setEnrollLevel(e.target.value)}
                      className="mt-1 w-full rounded border p-2 text-sm"
                   >
                      <option value="K1">K1</option>
                      <option value="K2">K2</option>
                      <option value="K3">K3</option>
                      <option value="P1">P1</option>
                   </select>
                </div>
                <div>
                   <label className="block text-xs font-medium text-gray-600">Sex</label>
                   <select 
                      value={enrollSex} 
                      onChange={(e) => setEnrollSex(e.target.value)}
                      className="mt-1 w-full rounded border p-2 text-sm"
                   >
                      <option value="M">Male</option>
                      <option value="F">Female</option>
                   </select>
                </div>
                {/* Expand other fields if necessary, kept minimal for "Quick" feel */}
                <div className="md:col-span-2">
                    <label className="block text-xs font-medium text-gray-600">Parent Contact</label>
                    <input
                        type="text"
                        value={enrollParentContact}
                        onChange={(e) => setEnrollParentContact(e.target.value)}
                        className="mt-1 w-full rounded border p-2 text-sm"
                        placeholder="Phone Number"
                    />
                </div>
              </div>
            </div>
          )}

          {/* --- SUBMIT --- */}
          <div className="flex items-center justify-end space-x-4">
             {statusMsg && (
                <span className={`text-sm font-medium ${
                    statusType === "success" ? "text-green-600" : 
                    statusType === "error" ? "text-red-600" : "text-gray-600"
                }`}>
                    {statusMsg}
                </span>
             )}
            <button
              type="submit"
              className="rounded-lg bg-blue-600 px-6 py-2 font-semibold text-white transition hover:bg-blue-700 shadow-sm"
            >
              {isExistingStudent ? "Enroll Existing Student" : "Create & Enroll Student"}
            </button>
          </div>

        </form>
      </div>
    </div>
  );
}
