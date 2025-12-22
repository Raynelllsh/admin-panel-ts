// src/components/dashboard/EnrollmentTab.tsx

"use client";

import React, {
  useState,
  FormEvent,
  useMemo,
  useRef,
  useEffect,
} from "react";
import { doc, setDoc, getDoc } from "firebase/firestore";
import { db } from "@/firebase";
import { Course, Student, PersonalInfo } from "@/types";
import {
  Loader2,
  CheckCircle2,
  BookOpen,
  User,
  Smile,
} from "lucide-react";

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

const cx = (...classes: Array<string | boolean | undefined | null>) =>
  classes.filter(Boolean).join(" ");

const inputClass =
  "h-10 w-full rounded-lg border border-gray-200 bg-white/70 px-3 text-sm outline-none transition focus:ring-2 focus:ring-blue-500/15 focus:border-blue-500";

export default function EnrollmentTab({
  allStudents,
  allCourses,
  setAllStudents,
  onEnroll,
}: EnrollmentTabProps) {
  // UI State
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Inputs
  const [studentInput, setStudentInput] = useState("");
  const [studentNameInput, setStudentNameInput] = useState(""); // New state for Name
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

  const statusChip =
    statusType === "error"
      ? "bg-red-50 text-red-700 border border-red-100"
      : statusType === "success"
      ? "bg-emerald-50 text-emerald-700 border border-emerald-100"
      : "bg-gray-100 text-gray-700";

  // --- Autocomplete Logic ---
  useEffect(() => {
    const onDown = (e: MouseEvent) => {
      if (!courseWrapperRef.current) return;
      if (!courseWrapperRef.current.contains(e.target as Node))
        setIsCourseOpen(false);
    };
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, []);

  const courseSuggestions = useMemo(() => {
    const q = courseInput.trim().toLowerCase();
    const base = allCourses.map((c) => c.id);
    if (!q) return base.slice(0, 10);
    const starts = base.filter((id) => id.toLowerCase().startsWith(q));
    const contains = base.filter(
      (id) => !starts.includes(id) && id.toLowerCase().includes(q)
    );
    return [...starts, ...contains].slice(0, 10);
  }, [courseInput, allCourses]);

  const pickCourseSuggestion = (id: string) => {
    setCourseInput(id);
    setRoundInput("");
    setIsCourseOpen(false);
  };
  // --- End Autocomplete Logic ---

  const resetForm = () => {
    setIsSubmitting(false);
    setStudentInput("");
    setStudentNameInput(""); // Reset name
    setCourseInput("");
    setRoundInput("");
    setIsCourseOpen(false);
    setStatusMsg("");
    setStatusType("idle");
  };

  const handleEnroll = async (e: FormEvent) => {
    e.preventDefault();
    setStatusMsg("");
    setStatusType("idle");

    const effectiveRound = roundInput.trim();
    if (!courseInput && !effectiveRound) {
      setStatusMsg("Missing required fields (Course ID).");
      setStatusType("error");
      return;
    }
    if (!studentInput.trim()) {
      setStatusMsg("Student ID is required.");
      setStatusType("error");
      return;
    }
    // Optional: You can enforce name is required if you want, 
    // or fallback to ID if empty. Currently allows empty name.
    // if (!studentNameInput.trim()) { ... }

    const targetCourseId = courseInput.trim() + effectiveRound;
    const courseExists = allCourses.some((c) => c.id === targetCourseId);

    if (!courseExists) {
      setStatusMsg(`Course not found: ${targetCourseId}`);
      setStatusType("error");
      return;
    }

    setIsSubmitting(true);
    setStatusMsg("Processing enrollment...");

    try {
      const finalId = studentInput.trim();
      const checkRef = doc(db, "students", finalId);
      const checkSnap = await getDoc(checkRef);

      // If student doesn't exist, create a new record
      if (!checkSnap.exists()) {
        const displayName = studentNameInput.trim() || finalId; // Use Name or fallback to ID

        const newPersonalInfo: PersonalInfo = {
          name: displayName,
          chineseName: "",
          preferredLanguage: "Cantonese",
          condition: "",
          sex: "M",
          level: "K1",
          favChar: "",
          allergies: "NIL",
          comfortMethod: "",
          parentName: "",
          parentContact: "",
        };

        const newStudent: Student = {
          id: finalId,
          name: displayName,
          personalInfo: newPersonalInfo,
          enrollment: [],
        };

        await setDoc(doc(db, "students", finalId), newStudent);
        if (setAllStudents) {
          setAllStudents((prev) => [...prev, newStudent]);
        }
      } 
      // Optional: Update name if student exists but we want to overwrite?
      // For now, we only set name on creation to be safe.

      // Perform enrollment
      const result = await onEnroll(targetCourseId, finalId);

      if (result.success) {
        setStatusMsg(`Successfully enrolled ${finalId}!`);
        setStatusType("success");
        setTimeout(() => resetForm(), 1500);
      } else {
        setStatusMsg(`Error: ${result.msg}`);
        setStatusType("error");
        setIsSubmitting(false);
      }
    } catch (err) {
      console.error(err);
      setStatusMsg("An unexpected error occurred.");
      setStatusType("error");
      setIsSubmitting(false);
    }
  };

  return (
    <div className="mx-auto w-full max-w-2xl p-6">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">
          Quick Enrollment
        </h1>
        <p className="mt-2 text-sm text-gray-500">
          Enter Student details and Course ID. If the student ID is new, a profile will be created with the provided Name.
        </p>
      </div>

      <form onSubmit={handleEnroll} className="space-y-6">
        
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
          {/* Student ID Input */}
          <div className="space-y-2">
            <label className="text-xs font-bold uppercase tracking-wider text-gray-500">
              Student ID *
            </label>
            <div className="relative">
              <User className="absolute left-3 top-2.5 h-5 w-5 text-gray-400" />
              <input
                type="text"
                value={studentInput}
                onChange={(e) => setStudentInput(e.target.value)}
                placeholder="e.g. 231201"
                className={cx(inputClass, "pl-10 font-mono")}
                autoComplete="off"
              />
            </div>
          </div>

          {/* Student Name Input */}
          <div className="space-y-2">
            <label className="text-xs font-bold uppercase tracking-wider text-gray-500">
              Student Name
            </label>
            <div className="relative">
              <Smile className="absolute left-3 top-2.5 h-5 w-5 text-gray-400" />
              <input
                type="text"
                value={studentNameInput}
                onChange={(e) => setStudentNameInput(e.target.value)}
                placeholder="e.g. Alice"
                className={cx(inputClass, "pl-10")}
                autoComplete="off"
              />
            </div>
          </div>
        </div>

        {/* Course ID Input */}
        <div className="space-y-2 relative" ref={courseWrapperRef}>
          <label className="text-xs font-bold uppercase tracking-wider text-gray-500">
            Course ID *
          </label>
          <div className="relative">
            <BookOpen className="absolute left-3 top-2.5 h-5 w-5 text-gray-400" />
            <input
              type="text"
              value={courseInput}
              onChange={(e) => {
                setCourseInput(e.target.value);
                setIsCourseOpen(true);
              }}
              onFocus={() => setIsCourseOpen(true)}
              placeholder="e.g. SPEC_C001_round001"
              className={cx(inputClass, "pl-10 font-mono")}
              autoComplete="off"
            />
          </div>
          
          {/* Autocomplete Dropdown */}
          {isCourseOpen && (
            <div className="absolute left-0 top-full z-10 mt-1 max-h-60 w-full overflow-auto rounded-lg border border-gray-100 bg-white py-1 shadow-lg">
              {courseSuggestions.length > 0 ? (
                courseSuggestions.map((id) => (
                  <button
                    key={id}
                    type="button"
                    onClick={(e) => {
                      e.preventDefault();
                      pickCourseSuggestion(id);
                    }}
                    className="w-full text-left px-3 py-2 text-sm hover:bg-gray-50 transition-colors border-b border-gray-100 last:border-0 cursor-pointer font-mono text-gray-700"
                    title="Pick course"
                  >
                    {id}
                  </button>
                ))
              ) : courseInput ? (
                <div className="px-3 py-2 text-xs text-gray-400 italic">
                  No matches found
                </div>
              ) : null}
            </div>
          )}
        </div>

        {/* Status Message */}
        {statusMsg && (
          <div
            className={cx(
              "flex items-center gap-2 rounded-lg px-4 py-3 text-sm font-medium transition-all",
              statusChip
            )}
          >
            {statusType === "error" ? (
              <div className="h-2 w-2 rounded-full bg-red-500" />
            ) : statusType === "success" ? (
              <CheckCircle2 className="h-4 w-4" />
            ) : (
              <Loader2 className="h-4 w-4 animate-spin" />
            )}
            {statusMsg}
          </div>
        )}

        {/* Submit Button */}
        <button
          type="submit"
          disabled={isSubmitting}
          className="flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-sky-500 font-semibold text-white shadow-sm transition hover:bg-sky-400 active:scale-[0.99] disabled:opacity-70 disabled:cursor-not-allowed"
        >
          {isSubmitting ? (
            <>
              <Loader2 className="h-5 w-5 animate-spin" />
              Processing...
            </>
          ) : (
            "Enroll Student"
          )}
        </button>
      </form>
      
      <div className="mt-8 pt-6 border-t border-gray-100 flex gap-4 text-xs text-gray-400">
         <div>Total Students: {allStudents.length}</div>
         <div>Total Courses: {allCourses.length}</div>
      </div>
    </div>
  );
}
