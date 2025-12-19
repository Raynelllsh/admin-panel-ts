// src/components/dashboard/EnrollmentTab.tsx
"use client";

import React, {
  useState,
  FormEvent,
  useMemo,
  useRef,
  useEffect,
  useCallback,
} from "react";
import { doc, setDoc, getDoc } from "firebase/firestore";
import { db } from "@/firebase";
import { Course, Student, PersonalInfo } from "@/types";
import {
  FileWarning,
  Loader2,
  CheckCircle2,
  ArrowLeft,
  Send,
  User,
  Languages,
  HeartPulse,
  Phone,
  GraduationCap,
  Hash,
  BookOpen,
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

const cx = (...classes: Array<string | false | null | undefined>) =>
  classes.filter(Boolean).join(" ");

const inputClass =
  "h-10 w-full rounded-lg border border-gray-200 bg-white/70 px-3 text-sm outline-none transition focus:ring-2 focus:ring-blue-500/15 focus:border-blue-500";

const disabledInputClass =
  "h-10 w-full rounded-lg border border-gray-200 bg-gray-100 px-3 text-sm text-gray-500 cursor-not-allowed select-none";

function Chip({
  children,
  className = "",
  title,
}: {
  children: React.ReactNode;
  className?: string;
  title?: string;
}) {
  return (
    <span
      title={title}
      className={cx(
        "inline-flex items-center rounded-lg px-2 py-0.5 text-[11px] font-semibold",
        className
      )}
    >
      {children}
    </span>
  );
}

function SectionCard({
  title,
  subtitle,
  icon,
  children,
}: {
  title: string;
  subtitle?: string;
  icon?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div className="bg-white rounded-lg border shadow-sm">
      <div className="px-4 py-3 border-b border-gray-200 bg-gray-50/70">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-2 min-w-0">
            {icon ? (
              <span className="h-9 w-9 grid place-items-center rounded-lg bg-gray-100 border border-gray-200 text-gray-600">
                {icon}
              </span>
            ) : null}
            <div className="min-w-0">
              <div className="text-sm font-semibold text-gray-900 truncate">
                {title}
              </div>
              {subtitle ? (
                <div className="text-xs text-gray-500 mt-0.5">{subtitle}</div>
              ) : null}
            </div>
          </div>
        </div>
      </div>

      <div className="p-4">{children}</div>
    </div>
  );
}

function KeyValueRow({
  label,
  value,
  valueClassName = "",
}: {
  label: string;
  value: React.ReactNode;
  valueClassName?: string;
}) {
  return (
    <div className="grid grid-cols-2 gap-3 py-1">
      <div className="text-xs text-gray-500">{label}</div>
      <div className={cx("text-sm text-gray-900", valueClassName)}>{value}</div>
    </div>
  );
}

export default function EnrollmentTab({
  allStudents,
  allCourses,
  setAllStudents,
  onEnroll,
}: EnrollmentTabProps) {
  // UI State
  const [step, setStep] = useState<"form" | "review">("form");
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Identification
  const [enrollId, setEnrollId] = useState("Generating...");

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

  const statusChip =
    statusType === "error"
      ? "bg-red-50 text-red-700 border border-red-100"
      : statusType === "success"
      ? "bg-emerald-50 text-emerald-700 border border-emerald-100"
      : "bg-gray-100 text-gray-700";

  // --- DERIVED DATA (FIXED) ---
  // Calculate available rounds from existing courses to fix ReferenceError
  const roundOptions = useMemo(() => {
    const s = new Set<string>();
    allCourses.forEach((c) => {
      // Assuming 'path' exists on Course and has a 'round' property
      // Adjust if your type definition is strictly 'round' at top level
      const r = c.path?.round || "";
      if (r) s.add(r);
    });
    return Array.from(s).sort();
  }, [allCourses]);

  // --- ID Generation Logic ---
  const generateNextId = useCallback(async () => {
    const now = new Date();
    const yy = String(now.getFullYear()).slice(-2);
    const mm = String(now.getMonth() + 1).padStart(2, "0");
    const dd = String(now.getDate()).padStart(2, "0");
    const datePrefix = `${yy}${mm}${dd}`;

    let sequence = 1;
    let foundUnique = false;
    let candidateId = "";

    while (!foundUnique) {
      const suffix = String(sequence).padStart(2, "0");
      candidateId = `${datePrefix}${suffix}`;

      try {
        const docRef = doc(db, "students", candidateId);
        const docSnap = await getDoc(docRef);

        if (!docSnap.exists()) {
          foundUnique = true;
        } else {
          sequence++;
        }
      } catch (error) {
        console.error("Error checking ID availability", error);
        break;
      }
    }
    return candidateId;
  }, []);

  useEffect(() => {
    let isMounted = true;
    if (step === "form") {
      generateNextId().then((id) => {
        if (isMounted && id) setEnrollId(id);
      });
    }
    return () => {
      isMounted = false;
    };
  }, [generateNextId, step]);

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

  const computedCourseId = useMemo(
    () => courseInput.trim() + roundInput.trim(),
    [courseInput, roundInput]
  );

  const resetForm = () => {
    setStep("form");
    setIsSubmitting(false);

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

    setStatusMsg("");
    setStatusType("idle");
  };

  // 1. Initial Review Step (Validates form)
  const handleReview = (e: FormEvent) => {
    e.preventDefault();
    setStatusMsg("");
    setStatusType("idle");

    const effectiveRound = roundInput.trim();
    if (!courseInput && !effectiveRound) {
      setStatusMsg("Missing required fields (Course Name).");
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

    if (!enrollName) {
      setStatusMsg("Name is required.");
      setStatusType("error");
      return;
    }

    setStep("review");
  };

  // 2. Final Submission Step (Writes to DB)
  const handleFinalSubmit = async () => {
    setIsSubmitting(true);
    setStatusMsg("Finalizing enrollment...");
    setStatusType("idle");

    const targetCourseId = courseInput.trim() + roundInput.trim();

    try {
      // Final Safety Check for ID Collision
      let finalId = enrollId;
      const checkRef = doc(db, "students", finalId);
      const checkSnap = await getDoc(checkRef);

      if (checkSnap.exists()) {
        finalId = await generateNextId();
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
        id: finalId,
        name: enrollName,
        personalInfo: newPersonalInfo,
        enrollment: [],
      };

      await setDoc(doc(db, "students", finalId), newStudent);

      if (setAllStudents) {
        setAllStudents((prev) => [...prev, newStudent]);
      }

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

  // --- REVIEW VIEW ---
  if (step === "review") {
    return (
      <div className="m-8 h-[calc(100vh-144px)] overflow-auto">
        <div className="max-w-4xl mx-auto">
          <div className="mb-4 flex items-center justify-between gap-3">
            <div className="min-w-0">
              <div className="text-base font-semibold text-gray-900">
                Confirm enrollment
              </div>
              <div className="text-xs text-gray-500 mt-0.5">
                Review details before writing to Firebase.
              </div>
            </div>

            <Chip className="bg-sky-100 text-sky-700">Step 2 / 2</Chip>
          </div>

          {statusMsg ? (
            <div className="mb-4">
              <Chip className={statusChip}>{statusMsg}</Chip>
            </div>
          ) : null}

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <SectionCard
              title="Core info"
              subtitle="Student + course target"
              icon={<CheckCircle2 className="h-4 w-4" />}
            >
              <div className="space-y-1">
                <KeyValueRow
                  label="Student ID"
                  value={
                    <span className="font-mono font-semibold">{enrollId}</span>
                  }
                />
                <KeyValueRow
                  label="Name"
                  value={
                    <span className="font-medium">
                      {enrollName} {enrollChiName ? `(${enrollChiName})` : ""}
                    </span>
                  }
                />
                <KeyValueRow
                  label="Course"
                  value={
                    <span className="font-mono font-semibold text-sky-700">
                      {computedCourseId}
                    </span>
                  }
                />
              </div>
            </SectionCard>

            <SectionCard
              title="Personal details"
              subtitle="Level, language, medical notes"
              icon={<User className="h-4 w-4" />}
            >
              <div className="space-y-1">
                <KeyValueRow
                  label="Level / Sex"
                  value={`${enrollLevel} / ${enrollSex}`}
                />
                <KeyValueRow label="Preferred language" value={enrollLang} />
                <KeyValueRow
                  label="Allergies"
                  value={enrollAllergies || "N/A"}
                  valueClassName={
                    enrollAllergies && enrollAllergies !== "NIL"
                      ? "text-red-700 font-semibold"
                      : ""
                  }
                />
                <KeyValueRow
                  label="Condition"
                  value={enrollCondition || "N/A"}
                />
                <KeyValueRow
                  label="Parent info"
                  value={
                    enrollParentName || enrollParentContact
                      ? `${enrollParentName} (${enrollParentContact})`
                      : "N/A"
                  }
                />
              </div>
            </SectionCard>
          </div>

          <div className="mt-4 bg-white rounded-lg border border-gray-200 shadow-sm p-4 flex items-center justify-between gap-3">
            <button
              type="button"
              onClick={() => setStep("form")}
              disabled={isSubmitting}
              className="h-10 px-4 rounded-lg border border-gray-200 text-gray-700 hover:bg-gray-50 transition active:scale-[0.99] cursor-pointer disabled:opacity-50"
            >
              <span className="inline-flex items-center gap-2">
                <ArrowLeft className="h-4 w-4" />
                Back to edit
              </span>
            </button>

            <button
              type="button"
              onClick={handleFinalSubmit}
              disabled={isSubmitting}
              className="h-10 px-4 rounded-lg bg-emerald-600 text-white hover:bg-emerald-700 transition active:scale-[0.99] cursor-pointer disabled:opacity-70 disabled:cursor-not-allowed"
            >
              {isSubmitting ? (
                <span className="inline-flex items-center gap-2">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Submitting…
                </span>
              ) : (
                <span className="inline-flex items-center gap-2">
                  <Send className="h-4 w-4" />
                  Confirm & submit
                </span>
              )}
            </button>
          </div>
        </div>
      </div>
    );
  }

  // --- FORM VIEW ---
  return (
    <div className="p-8 overflow-auto">
      <div className="max-w-5xl mx-auto">
        <div className="mb-4 flex items-center justify-between gap-3">
          <div className="min-w-0">
            <div className="text-base font-semibold text-gray-900">
              Manual student enrollment
            </div>
            <div className="text-xs text-gray-500 mt-0.5">
              Enter student details and pick the target course.
            </div>
          </div>

          <Chip className="bg-sky-100 text-sky-700">Step 1 / 2</Chip>
        </div>

        <form onSubmit={handleReview} className="space-y-4">
          {/* Core + Course */}
          <SectionCard
            title="Student ID & Course"
            subtitle="SID is auto-generated"
            icon={<Hash className="h-4 w-4" />}
          >
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <div>
                <label className="mb-1 block text-xs font-semibold text-gray-600">
                  Student ID (Auto-generated)
                </label>
                <div className="relative">
                  <input
                    type="text"
                    value={enrollId}
                    readOnly
                    disabled
                    className={disabledInputClass}
                  />
                  {enrollId === "Generating..." && (
                    <div className="absolute right-3 top-3">
                      <Loader2 className="h-4 w-4 animate-spin text-gray-400" />
                    </div>
                  )}
                </div>
              </div>

              <div ref={courseWrapperRef} className="relative">
                <label className="mb-1 block text-xs font-semibold text-gray-600">
                  Course ID *
                </label>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-2 items-start">
                  <div className="md:col-span-2">
                    <div className="relative">
                      <BookOpen className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                      <input
                        type="text"
                        value={courseInput}
                        onChange={(e) => {
                          setCourseInput(e.target.value);
                          setIsCourseOpen(true);
                        }}
                        onFocus={() => setIsCourseOpen(true)}
                        placeholder="e.g. SPEC_C001_round001"
                        className={cx(inputClass, "pl-9")}
                        autoComplete="off"
                      />
                    </div>

                    {isCourseOpen && (
                      <div className="z-50 absolute top-full left-0 mt-2 w-full bg-white rounded-lg shadow-lg border border-gray-200 max-h-64">
                        {courseSuggestions.length > 0 ? (
                          courseSuggestions.map((id) => (
                            <button
                              key={id}
                              type="button"
                              onMouseDown={(e) => {
                                e.preventDefault();
                                pickCourseSuggestion(id);
                              }}
                              className="w-full text-left px-3 py-2 text-sm hover:bg-gray-50 transition-colors border-b border-gray-100 last:border-0 cursor-pointer"
                              title="Pick course"
                            >
                              <span className="text-gray-800">{id}</span>
                            </button>
                          ))
                        ) : courseInput ? (
                          <div className="px-3 py-2 text-sm text-gray-500 flex items-center gap-2">
                            <FileWarning className="h-4 w-4" />
                            No matches found
                          </div>
                        ) : null}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </SectionCard>

          {/* Names */}
          <SectionCard
            title="Student name"
            subtitle="Required full name + optional Chinese name"
            icon={<User className="h-4 w-4" />}
          >
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="mb-1 block text-xs font-semibold text-gray-600">
                  Full name *
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
                  Chinese name
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
          </SectionCard>

          {/* Profile */}
          <SectionCard
            title="Profile"
            subtitle="Level, sex, and preferred language"
            icon={<GraduationCap className="h-4 w-4" />}
          >
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
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
                  Preferred language
                </label>
                <div className="relative">
                  <Languages className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <select
                    value={enrollLang}
                    onChange={(e) => setEnrollLang(e.target.value)}
                    className={cx(inputClass, "pl-9")}
                  >
                    <option value="Cantonese">Cantonese</option>
                    <option value="English">English</option>
                    <option value="Mandarin">Mandarin</option>
                  </select>
                </div>
              </div>
            </div>
          </SectionCard>

          {/* Medical / personal */}
          <SectionCard
            title="Medical + personal notes"
            subtitle="Optional notes to help teachers"
            icon={<HeartPulse className="h-4 w-4" />}
          >
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="mb-1 block text-xs font-semibold text-gray-600">
                  Condition (medical / behavioral)
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

              <div>
                <label className="mb-1 block text-xs font-semibold text-gray-600">
                  Comfort method
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
                  Favourite character
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
          </SectionCard>

          {/* Parent */}
          <SectionCard
            title="Parent / guardian"
            subtitle="Optional contact for follow-up"
            icon={<Phone className="h-4 w-4" />}
          >
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="mb-1 block text-xs font-semibold text-gray-600">
                  Parent name
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
                  Parent contact
                </label>
                <input
                  type="text"
                  value={enrollParentContact}
                  onChange={(e) => setEnrollParentContact(e.target.value)}
                  placeholder="Phone number"
                  className={inputClass}
                />
              </div>
            </div>
          </SectionCard>

          {/* Footer */}
          <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-4 flex items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <Chip
                className="bg-gray-100 text-gray-700"
                title="Students loaded"
              >
                {allStudents.length} students
              </Chip>
              <Chip
                className="bg-gray-100 text-gray-700"
                title="Courses loaded"
              >
                {allCourses.length} courses
              </Chip>

              {statusMsg ? (
                <Chip className={statusChip}>{statusMsg}</Chip>
              ) : null}
            </div>

            <button
              type="submit"
              className="h-10 px-4 rounded-lg bg-sky-500 text-white hover:opacity-90 transition active:scale-[0.99] cursor-pointer"
            >
              Next: Review Details
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
