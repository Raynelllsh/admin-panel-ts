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
  ListPlus,
  Trash2,
  UserPlus,
  X,
  Check,
} from "lucide-react";

export interface PotentialStudent {
  id: string;
  name: string;
  possibleCourseId: string;
  lessonInfo: {
    courseId: string;
    lessonId: string;
    name: string;
    dateStr: string;
    timeSlot: string;
  };
  createdAt: any;
  status: "potential";
}

interface EnrollmentTabProps {
  allStudents: Student[];
  allCourses: Course[];
  potentialStudents?: PotentialStudent[];
  setAllStudents?: React.Dispatch<React.SetStateAction<Student[]>>;
  
  onEnroll: (
    courseId: string,
    studentId: string
  ) => Promise<{ success: boolean; msg?: string }>;
  
  onAddPotential?: (
    name: string,
    courseId: string,
    lessonInfo: any,
    studentId?: string
  ) => Promise<{ success: boolean; msg?: string }>;
  
  onRemovePotential?: (id: string) => Promise<{ success: boolean; msg?: string }>;
  
  onPromotePotential?: (
    id: string,
    studentId: string,
    name: string,
    courseId: string
  ) => Promise<{ success: boolean; msg?: string }>;
}

const cx = (...classes: Array<string | false | null | undefined>) =>
  classes.filter(Boolean).join(" ");

const inputClass =
  "h-10 w-full rounded-lg border border-gray-200 bg-white/70 px-3 text-sm outline-none transition focus:ring-2 focus:ring-blue-500/15 focus:border-blue-500";

export default function EnrollmentTab({
  allStudents,
  allCourses,
  potentialStudents = [],
  setAllStudents,
  onEnroll,
  onAddPotential,
  onRemovePotential,
  onPromotePotential,
}: EnrollmentTabProps) {
  // UI State
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Inputs
  const [studentInput, setStudentInput] = useState("");
  const [studentNameInput, setStudentNameInput] = useState("");
  const [courseInput, setCourseInput] = useState("");
  const [roundInput, setRoundInput] = useState("");

  // Potential Student Management State
  const [promoteModeId, setPromoteModeId] = useState<string | null>(null);
  const [newStudentId, setNewStudentId] = useState("");

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
      if (
        !courseWrapperRef.current.contains(e.target as Node) &&
        (e.target as HTMLElement).id !== "course-input"
      ) {
        setIsCourseOpen(false);
      }
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
    setStudentNameInput("");
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
        const displayName = studentNameInput.trim() || finalId;
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

  // --- HANDLER: Save as Potential ---
const handleSavePotential = async (e: React.MouseEvent) => {
  e.preventDefault();
  if (!onAddPotential) return;

  const effectiveRound = roundInput.trim();
  const targetCourseId = courseInput.trim() + effectiveRound;
  
  // Existing logic to determine name
  const nameToSave = studentNameInput.trim() || studentInput.trim();

  if (!targetCourseId || !nameToSave) {
    setStatusMsg("Name (or Student ID) and Course ID are required for potential list.");
    setStatusType("error");
    return;
  }

  const course = allCourses.find((c) => c.id === targetCourseId);
  if (!course) {
    setStatusMsg("Course not found.");
    setStatusType("error");
    return;
  }

  const firstLesson =
    course.lessons && course.lessons.length > 0 ? course.lessons[0] : null;

  const lessonInfo = firstLesson
    ? {
        courseId: course.id,
        lessonId: firstLesson.id,
        name: firstLesson.name,
        dateStr: firstLesson.dateStr,
        timeSlot: course.timeSlot,
      }
    : { courseId: course.id, note: "No lessons defined" };

  setIsSubmitting(true);
  setStatusMsg("Saving to potential list...");

  try {
    // CAPTURE THE STUDENT ID INPUT HERE
    const potentialId = studentInput.trim(); 

    // Pass it as the 4th argument
    const result = await onAddPotential(nameToSave, targetCourseId, lessonInfo, potentialId);

    if (result.success) {
      setStatusMsg("Saved to Potential Students!");
      setStatusType("success");
      setTimeout(() => {
        resetForm();
      }, 1500);
    } else {
      setStatusMsg("Error: " + result.msg);
      setStatusType("error");
    }
  } catch (err) {
    setStatusMsg("Error saving potential student.");
    setStatusType("error");
  } finally {
    setIsSubmitting(false);
  }
};

  // --- HANDLER: Promote Potential Student ---
  const handlePromoteConfirm = async (ps: PotentialStudent) => {
    if (!newStudentId.trim() || !onPromotePotential) return;
    try {
      const res = await onPromotePotential(
        ps.id,
        newStudentId.trim(),
        ps.name,
        ps.possibleCourseId
      );
      if (res.success) {
        setPromoteModeId(null);
        setNewStudentId("");
      } else {
        alert("Promotion failed: " + res.msg);
      }
    } catch (e) {
      console.error(e);
      alert("Error promoting student");
    }
  };

  const handleRemovePotential = async (id: string) => {
    if (!onRemovePotential) return;
    if (confirm("Remove from potential list?")) {
      await onRemovePotential(id);
    }
  };

  return (
    // UPDATED LAYOUT: Vertical Stack (max-w-3xl for better reading width)
    <div className="max-w-3xl mx-auto p-6 flex flex-col gap-8">
      
      {/* 1. MAIN ENROLLMENT FORM */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        <div className="border-b border-gray-200 bg-gray-50/50 px-6 py-4">
          <h2 className="text-lg font-bold text-gray-800 flex items-center gap-2">
            <UserPlus className="h-5 w-5 text-sky-500" />
            Quick Enrollment
          </h2>
          <p className="text-sm text-gray-500 mt-1">
            Enter Student details and Course ID to enroll immediately.
          </p>
        </div>

        <form onSubmit={handleEnroll} className="p-6 grid gap-5">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-gray-600 uppercase tracking-wide">
                Student ID *
              </label>
              <div className="relative">
                <User className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
                <input
                  value={studentInput}
                  onChange={(e) => setStudentInput(e.target.value)}
                  placeholder="e.g. 231201"
                  className={cx(inputClass, "pl-10 font-mono")}
                  autoComplete="off"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-gray-600 uppercase tracking-wide">
                Student Name
              </label>
              <div className="relative">
                <Smile className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
                <input
                  value={studentNameInput}
                  onChange={(e) => setStudentNameInput(e.target.value)}
                  placeholder="e.g. Alice"
                  className={cx(inputClass, "pl-10")}
                  autoComplete="off"
                />
              </div>
            </div>
          </div>

          <div className="space-y-1.5 relative">
            <label className="text-xs font-semibold text-gray-600 uppercase tracking-wide">
              Course ID *
            </label>
            <div className="relative">
              <BookOpen className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
              <input
                id="course-input"
                value={courseInput}
                onChange={(e) => {
                  setCourseInput(e.target.value);
                  setIsCourseOpen(true);
                }}
                onFocus={() => setIsCourseOpen(true)}
                placeholder="e.g. SPEC_C001"
                className={cx(inputClass, "pl-10 font-mono")}
                autoComplete="off"
              />
            </div>

            {isCourseOpen && (
              <div
                ref={courseWrapperRef}
                className="absolute left-0 right-0 top-full mt-1 max-h-48 overflow-auto rounded-lg border border-gray-200 bg-white shadow-xl z-50"
              >
                {courseSuggestions.length > 0 ? (
                  courseSuggestions.map((id) => (
                    <div
                      key={id}
                      onMouseDown={(e) => {
                        e.preventDefault();
                        pickCourseSuggestion(id);
                      }}
                      className="cursor-pointer border-b border-gray-50 px-3 py-2 text-left font-mono text-xs text-gray-700 hover:bg-blue-50"
                    >
                      {id}
                    </div>
                  ))
                ) : courseInput ? (
                  <div className="px-3 py-2 text-xs text-gray-400 italic">
                    No matches found
                  </div>
                ) : null}
              </div>
            )}
          </div>

          {statusMsg && (
            <div
              className={cx(
                "rounded-lg px-4 py-3 text-sm flex items-center gap-2",
                statusChip
              )}
            >
              {statusType === "error" ? (
                <X className="h-4 w-4" />
              ) : statusType === "success" ? (
                <Check className="h-4 w-4" />
              ) : (
                <Loader2 className="h-4 w-4 animate-spin" />
              )}
              {statusMsg}
            </div>
          )}

          <div className="pt-2 flex flex-col sm:flex-row gap-3">
            <button
              type="submit"
              disabled={isSubmitting}
              className="flex-1 h-10 rounded-lg bg-sky-500 text-white font-semibold hover:bg-sky-600 transition active:scale-[0.99] disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
              {isSubmitting ? "Processing..." : "Enroll Student"}
            </button>

            {onAddPotential && (
              <button
                type="button"
                onClick={handleSavePotential}
                disabled={isSubmitting}
                className="flex-1 h-10 rounded-lg border border-sky-200 text-sky-700 font-semibold hover:bg-sky-50 transition active:scale-[0.99] disabled:opacity-50 flex items-center justify-center gap-2"
              >
                <ListPlus className="h-4 w-4" />
                Add to Potential List
              </button>
            )}
          </div>
        </form>
      </div>

      {/* 2. POTENTIAL STUDENTS LIST (Now Below the Form) */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        <div className="border-b border-gray-200 bg-amber-50/50 px-6 py-4">
          <h2 className="text-lg font-bold text-gray-800 flex items-center gap-2">
            <ListPlus className="h-5 w-5 text-amber-500" />
            Pending Enrollments ({potentialStudents.length})
          </h2>
          <p className="text-sm text-gray-500 mt-1">
            Students waiting to be assigned an ID and enrolled.
          </p>
        </div>

        <div className="p-4 grid gap-3 grid-cols-1 md:grid-cols-2">
          {potentialStudents.length === 0 ? (
            <div className="col-span-full text-center py-10 text-gray-400 text-sm">
              No potential students currently pending.
            </div>
          ) : (
            potentialStudents.map((ps) => (
              <div
                key={ps.id}
                className="group relative rounded-lg border border-gray-100 bg-white p-4 shadow-sm hover:border-blue-200 hover:shadow-md transition-all"
              >
                <div className="flex justify-between items-start mb-3">
                  <div>
                    <div className="font-bold text-gray-900">
                      {ps.name}
                    </div>
                    <div className="text-xs text-gray-500 font-mono mt-0.5 bg-gray-100 px-1.5 py-0.5 rounded inline-block">
                      {ps.possibleCourseId}
                    </div>
                  </div>
                  {promoteModeId !== ps.id && (
                    <button
                      onClick={() => handleRemovePotential(ps.id)}
                      className="text-gray-300 hover:text-red-500 transition-colors p-1.5 hover:bg-red-50 rounded"
                      title="Remove"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  )}
                </div>

                {promoteModeId === ps.id ? (
                  // PROMOTE MODE: Input for ID
                  <div className="mt-2 space-y-2 bg-blue-50/50 p-3 rounded-lg border border-blue-100">
                    <div className="text-[10px] font-semibold text-blue-800 uppercase tracking-wide">
                      Assign Student ID:
                    </div>
                    <div className="flex gap-2">
                      <input
                        value={newStudentId}
                        onChange={(e) => setNewStudentId(e.target.value)}
                        placeholder="e.g. 240101"
                        className="flex-1 min-w-0 rounded border border-blue-200 px-2 py-1.5 text-sm font-mono focus:border-blue-500 focus:outline-none"
                        autoFocus
                      />
                      <button
                        onClick={() => handlePromoteConfirm(ps)}
                        className="rounded bg-blue-600 px-3 text-white hover:bg-blue-700 flex items-center justify-center"
                        title="Confirm Enrollment"
                      >
                        <Check className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => {
                          setPromoteModeId(null);
                          setNewStudentId("");
                        }}
                        className="rounded bg-white px-3 text-gray-500 ring-1 ring-gray-200 hover:bg-gray-100 flex items-center justify-center"
                        title="Cancel"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                ) : (
                  // VIEW MODE: Action Button
                  <div className="mt-2">
                    <button
                      onClick={() => {
                        setPromoteModeId(ps.id);
                        setNewStudentId("");
                      }}
                      className="flex w-full items-center justify-center gap-2 rounded-lg border border-dashed border-gray-300 bg-gray-50 py-2.5 text-xs font-semibold text-gray-600 transition-colors hover:border-blue-400 hover:bg-blue-50 hover:text-blue-700"
                    >
                      <UserPlus className="h-3.5 w-3.5" />
                      Finalize Enrollment
                    </button>
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
