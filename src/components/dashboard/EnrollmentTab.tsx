// src/components/dashboard/EnrollmentTab.tsx
"use client";

import React, { useState, FormEvent, useMemo, useRef, useEffect } from "react";
import { doc, setDoc, getDoc } from "firebase/firestore";
import { db } from "@/firebase";
import { Course, Student, PersonalInfo } from "@/types";
import { FileWarning } from "lucide-react"; // Assuming you have lucide-react installed based on previous file

interface EnrollmentTabProps {
  allStudents: Student[];
  allCourses: Course[];
  setAllStudents?: React.Dispatch<React.SetStateAction<Student[]>>;
  onEnroll: (
    courseId: string,
    studentId: string
  ) => Promise<{ success: boolean; msg?: string }>;
  onReschedule?: any;
}

const inputClass =
  "h-9 w-full rounded-lg border border-gray-200 bg-white/70 px-3 text-xs outline-none focus:ring-2 focus:ring-blue-500/15 focus:border-blue-500 transition";

export default function EnrollmentTab({
  allStudents,
  allCourses,
  setAllStudents,
  onEnroll,
}: EnrollmentTabProps) {
  // Identification
  const [enrollId, setEnrollId] = useState("");

  // Student details
  const [enrollName, setEnrollName] = useState("");
  const [enrollChiName, setEnrollChiName] = useState("");
  const [enrollSex, setEnrollSex] = useState("M");
  const [enrollLevel, setEnrollLevel] = useState("K3");
  const [enrollLang, setEnrollLang] = useState("Cantonese");

  // Medical / personal
  const [enrollCondition, setEnrollCondition] = useState("");
  const [enrollAllergies, setEnrollAllergies] = useState("NIL");
  const [enrollFavChar, setEnrollFavChar] = useState("");
  const [enrollComfort, setEnrollComfort] = useState("");

  // Parent info
  const [enrollParentName, setEnrollParentName] = useState("");
  const [enrollParentContact, setEnrollParentContact] = useState("");

  // Course selection
  const [courseInput, setCourseInput] = useState("");
  const [roundInput, setRoundInput] = useState("");

  // Autocomplete State
  const [isCourseOpen, setIsCourseOpen] = useState(false);
  const courseWrapperRef = useRef<HTMLDivElement>(null);

  // Status
  const [statusMsg, setStatusMsg] = useState("");
  const [statusType, setStatusType] = useState<"idle" | "success" | "error">(
    "idle"
  );

  // --- Autocomplete Logic ---

  // Handle click outside to close dropdown
  useEffect(() => {
    const onDown = (e: MouseEvent) => {
      if (!courseWrapperRef.current) return;
      if (!courseWrapperRef.current.contains(e.target as Node))
        setIsCourseOpen(false);
    };
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, []);

  // Filter suggestions
  const courseSuggestions = useMemo(() => {
    const q = courseInput.trim().toLowerCase();
    // We map to IDs since that is what we are matching against
    const base = allCourses.map((c) => c.id);

    if (!q) return []; // Don't show everything by default, wait for type

    const starts = base.filter((id) => id.toLowerCase().startsWith(q));
    const contains = base.filter(
      (id) => !starts.includes(id) && id.toLowerCase().includes(q)
    );

    return [...starts, ...contains].slice(0, 10);
  }, [courseInput, allCourses]);

  const pickCourseSuggestion = (id: string) => {
    setCourseInput(id);
    // If we pick a full ID (which usually includes round info), we might want to clear the round input
    // to prevent double concatenation (e.g. English_R1 + R1).
    setRoundInput("");
    setIsCourseOpen(false);
  };

  // --- End Autocomplete Logic ---

  const resetForm = () => {
    setEnrollId("");
    setEnrollName("");
    setEnrollChiName("");
    setEnrollSex("M");
    setEnrollLevel("K3");
    setEnrollLang("Cantonese");
    setEnrollCondition("");
    setEnrollAllergies("NIL");
    setEnrollFavChar("");
    setEnrollComfort("");
    setEnrollParentName("");
    setEnrollParentContact("");
    setCourseInput("");
    setRoundInput("");
    setIsCourseOpen(false);
  };

  const handleEnroll = async (e: FormEvent) => {
    e.preventDefault();
    setStatusMsg("Processing...");
    setStatusType("idle");

    // Allow roundInput to be empty if the courseInput already covers the full ID
    const effectiveRound = roundInput.trim();
    if (!enrollId || (!courseInput && !effectiveRound)) {
      setStatusMsg("Missing required fields (Student ID, Course).");
      setStatusType("error");
      return;
    }

    const targetCourseId = courseInput.trim() + effectiveRound;

    const courseExists = allCourses.some((c) => c.id === targetCourseId);
    if (!courseExists) {
      setStatusMsg(
        `Course not found with ID: ${targetCourseId}. Check Course Name and Round.`
      );
      setStatusType("error");
      return;
    }

    try {
      const studentRef = doc(db, "students", enrollId);
      const studentSnap = await getDoc(studentRef);

      if (!studentSnap.exists()) {
        if (!enrollName) {
          setStatusMsg("Name is required when creating a new student.");
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

        await setDoc(studentRef, newStudent);

        if (setAllStudents) {
          setAllStudents((prev) => [...prev, newStudent]);
        }
      }

      const result = await onEnroll(targetCourseId, enrollId);

      if (result.success) {
        setStatusMsg(
          `Successfully enrolled ${
            enrollName || enrollId
          } into ${targetCourseId}`
        );
        setStatusType("success");
        resetForm();
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
    <div className="my-8 mx-auto max-w-4xl p-8 rounded-lg bg-white shadow-lg">
      <form onSubmit={handleEnroll} className="space-y-6">
        <h2 className="text-2xl font-medium text-sky-500">
          Manual Student Enrollment
        </h2>

        {/* Row 1: IDs / course */}
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <div>
            <label className="mb-1 block text-xs font-semibold text-pink-600">
              Student ID *
            </label>
            <input
              type="text"
              value={enrollId}
              onChange={(e) => setEnrollId(e.target.value)}
              placeholder="e.g. STU001"
              className={inputClass}
              required
            />
          </div>

          {/* Course Name Autocomplete Wrapper */}
          <div ref={courseWrapperRef} className="relative z-[50]">
            <label className="mb-1 block text-xs font-semibold text-pink-600">
              Course Name / ID *
            </label>
            <input
              type="text"
              value={courseInput}
              onChange={(e) => {
                setCourseInput(e.target.value);
                setIsCourseOpen(true);
              }}
              onFocus={() => setIsCourseOpen(true)}
              placeholder="e.g. English_A"
              className={inputClass}
              autoComplete="off"
              required
            />

            {/* Dropdown Suggestions */}
            {isCourseOpen && courseSuggestions.length > 0 && (
              <div className="absolute top-full left-0 mt-2 w-full bg-white rounded-xl shadow-lg border border-gray-100 max-h-64 overflow-y-auto z-[9999]">
                {courseSuggestions.map((id) => (
                  <button
                    key={id}
                    type="button"
                    onMouseDown={(e) => {
                      e.preventDefault();
                      pickCourseSuggestion(id);
                    }}
                    className="w-full text-left px-3 py-2 text-xs hover:bg-blue-50 text-gray-900 transition-colors border-b border-gray-50 last:border-0 cursor-pointer"
                  >
                    {id}
                  </button>
                ))}
              </div>
            )}

            {/* No Matches (Optional, showing only if typed) */}
            {isCourseOpen && courseInput && courseSuggestions.length === 0 && (
              <div className="absolute top-full left-0 mt-2 w-full bg-white rounded-xl shadow-lg border border-gray-100 z-[9999]">
                <div className="px-3 py-2 text-xs text-gray-500 flex items-center gap-2">
                  <FileWarning className="w-3 h-3" /> No matches
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Row 2: names */}
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <div>
            <label className="mb-1 block text-xs font-semibold text-pink-600">
              Full Name *
            </label>
            <input
              type="text"
              value={enrollName}
              onChange={(e) => setEnrollName(e.target.value)}
              placeholder="Student Name"
              className={inputClass}
            />
          </div>

          <div>
            <label className="mb-1 block text-xs font-semibold text-gray-600">
              Chinese Name
            </label>
            <input
              type="text"
              value={enrollChiName}
              onChange={(e) => setEnrollChiName(e.target.value)}
              placeholder="Optional"
              className={inputClass}
            />
          </div>
        </div>

        {/* Row 3: level / sex / language */}
        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          <div>
            <label className="mb-1 block text-xs font-semibold text-gray-600">
              Level
            </label>
            <select
              value={enrollLevel}
              onChange={(e) => setEnrollLevel(e.target.value)}
              className={inputClass}
            >
              <option value="K1">K1</option>
              <option value="K2">K2</option>
              <option value="K3">K3</option>
              <option value="P1">P1</option>
            </select>
          </div>

          <div>
            <label className="mb-1 block text-xs font-semibold text-gray-600">
              Sex
            </label>
            <select
              value={enrollSex}
              onChange={(e) => setEnrollSex(e.target.value)}
              className={inputClass}
            >
              <option value="M">Male</option>
              <option value="F">Female</option>
            </select>
          </div>

          <div>
            <label className="mb-1 block text-xs font-semibold text-gray-600">
              Preferred Language
            </label>
            <select
              value={enrollLang}
              onChange={(e) => setEnrollLang(e.target.value)}
              className={inputClass}
            >
              <option value="Cantonese">Cantonese</option>
              <option value="English">English</option>
              <option value="Mandarin">Mandarin</option>
            </select>
          </div>
        </div>

        {/* Row 4: condition / allergies */}
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <div>
            <label className="mb-1 block text-xs font-semibold text-gray-600">
              Condition (Medical/Behavioral)
            </label>
            <input
              type="text"
              value={enrollCondition}
              onChange={(e) => setEnrollCondition(e.target.value)}
              placeholder="Optional"
              className={inputClass}
            />
          </div>

          <div>
            <label className="mb-1 block text-xs font-semibold text-gray-600">
              Allergies
            </label>
            <input
              type="text"
              value={enrollAllergies}
              onChange={(e) => setEnrollAllergies(e.target.value)}
              placeholder="e.g. NIL"
              className={inputClass}
            />
          </div>
        </div>

        {/* Row 5: comfort / fav char */}
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <div>
            <label className="mb-1 block text-xs font-semibold text-gray-600">
              Comfort Method
            </label>
            <input
              type="text"
              value={enrollComfort}
              onChange={(e) => setEnrollComfort(e.target.value)}
              placeholder="Optional"
              className={inputClass}
            />
          </div>

          <div>
            <label className="mb-1 block text-xs font-semibold text-gray-600">
              Favourite Character
            </label>
            <input
              type="text"
              value={enrollFavChar}
              onChange={(e) => setEnrollFavChar(e.target.value)}
              placeholder="Optional"
              className={inputClass}
            />
          </div>
        </div>

        {/* Row 6: parent info */}
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <div>
            <label className="mb-1 block text-xs font-semibold text-gray-600">
              Parent Name
            </label>
            <input
              type="text"
              value={enrollParentName}
              onChange={(e) => setEnrollParentName(e.target.value)}
              placeholder="Optional"
              className={inputClass}
            />
          </div>

          <div>
            <label className="mb-1 block text-xs font-semibold text-gray-600">
              Parent Contact
            </label>
            <input
              type="text"
              value={enrollParentContact}
              onChange={(e) => setEnrollParentContact(e.target.value)}
              placeholder="Phone Number"
              className={inputClass}
            />
          </div>
        </div>

        {/* Submit */}
        <div className="flex items-center justify-end space-x-4">
          {statusMsg && (
            <span
              className={`text-xs font-medium ${
                statusType === "success"
                  ? "text-green-600"
                  : statusType === "error"
                  ? "text-red-600"
                  : "text-gray-600"
              }`}
            >
              {statusMsg}
            </span>
          )}
          <button
            type="submit"
            className="px-3 py-2 rounded-lg bg-sky-500 text-white cursor-pointer"
          >
            Create / Enroll Student
          </button>
        </div>
      </form>
    </div>
  );
}
