"use client";

import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  ReactNode,
} from "react";
import {
  Save,
  Loader2,
  Download,
  FileWarning,
  RotateCcw,
  ArrowLeft,
} from "lucide-react";
import html2canvas from "html2canvas-pro";
import jsPDF from "jspdf";
import logo from "@/assets/logo.png";
import { FormDataType } from "@/types";

import {
  fetchStudentFormData,
  fetchStudentIdOptions,
  DEFAULT_STUDENT_ID_OPTIONS_LIMIT,
} from "./student-firebase";

// --- DATE FORMATTING HELPER ---
export const formatLessonDate = (dateStr: string, timeSlot?: string) => {
  let start = "00:00";
  let end: string | undefined;

  if (timeSlot) {
    const rangeMatch = timeSlot.match(/(\d{2}:\d{2})\s*-\s*(\d{2}:\d{2})/);
    if (rangeMatch) {
      start = rangeMatch[1];
      end = rangeMatch[2];
    } else {
      const singleMatch = timeSlot.match(/(\d{2}:\d{2})/);
      if (singleMatch) start = singleMatch[1];
    }
  }

  return end ? `${dateStr}T${start}-${end}` : `${dateStr}T${start}`;
};

const PAGE_WIDTH = 794;
const PAGE_HEIGHT = 1123;
const PAGE_PADDING = 48;
const MEASURE_WIDTH = 698;

export const formatDisplayDate = (val: string) => {
  if (!val) return "";

  const monthNames = [
    "Jan",
    "Feb",
    "Mar",
    "Apr",
    "May",
    "Jun",
    "Jul",
    "Aug",
    "Sep",
    "Oct",
    "Nov",
    "Dec",
  ];

  const formatTimeHHmm = (hhmm: string) => {
    const [hours, minutes] = hhmm.split(":");
    const hour = parseInt(hours, 10);
    const period = hour >= 12 ? "PM" : "AM";
    const displayHour = hour % 12 || 12;
    return `${displayHour}:${minutes} ${period}`;
  };

  const formatDaySuffix = (dayNum: number) =>
    dayNum % 10 === 1 && dayNum !== 11
      ? "st"
      : dayNum % 10 === 2 && dayNum !== 12
      ? "nd"
      : dayNum % 10 === 3 && dayNum !== 13
      ? "rd"
      : "th";

  if (val.includes("T")) {
    const [datePart, timePartRaw] = val.split("T");
    const [year, month, day] = datePart.split("-");
    const dayNum = parseInt(day, 10);
    const suffix = formatDaySuffix(dayNum);
    const monthName = monthNames[parseInt(month, 10) - 1];

    if (timePartRaw.includes("-")) {
      const [startHHmm, endHHmm] = timePartRaw.split("-");
      return `${dayNum}${suffix} ${monthName} ${year}, ${formatTimeHHmm(
        startHHmm
      )} - ${formatTimeHHmm(endHHmm)}`;
    }

    return `${dayNum}${suffix} ${monthName} ${year}, ${formatTimeHHmm(
      timePartRaw
    )}`;
  }

  if (val.includes("-")) {
    const [year, month, day] = val.split("-");
    const dayNum = parseInt(day, 10);
    const suffix = formatDaySuffix(dayNum);
    const monthName = monthNames[parseInt(month, 10) - 1];
    return `${dayNum}${suffix} ${monthName} ${year}`;
  }

  return val;
};

interface DocContextType {
  data: FormDataType;
  setData: React.Dispatch<React.SetStateAction<FormDataType>>;
  updateField: (field: keyof FormDataType, value: any) => void;
  isExporting: boolean;
  initialData: FormDataType;
}

const DocumentContext = createContext<DocContextType | null>(null);

export function useDoc() {
  const ctx = useContext(DocumentContext);
  if (!ctx) throw new Error("useDoc must be used within DocumentEditor");
  return ctx;
}

// Display-only Input used inside document body
export function Input({
  name,
  type = "text",
  className = "",
  options = [],
}: {
  name: string;
  type?: string;
  className?: string;
  options?: Array<string | { label: string; value: string }>;
}) {
  const { data } = useDoc();

  const displayValue = useMemo(() => {
    const rawValue = (data as any)[name] || "";

    if (type === "dropdown" || type === "select") {
      const selectedOption = options.find((opt) =>
        typeof opt === "string" ? opt === rawValue : opt.value === rawValue
      );
      if (selectedOption) {
        return typeof selectedOption === "string"
          ? selectedOption
          : selectedOption.label;
      }
    }

    if (type === "date" || type === "datetime-local")
      return formatDisplayDate(rawValue);
    return rawValue;
  }, [data, name, type, options]);

  const isChinese = useMemo(
    () => /[\u4e00-\u9fff]/.test(displayValue),
    [displayValue]
  );

  return (
    <span
      className={`${className} ${
        isChinese ? "font-noto-sans-tc" : ""
      } text-right`}
    >
      {displayValue || "..."}
    </span>
  );
}

function wipeDeep(value: any): any {
  if (Array.isArray(value)) return [];
  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.keys(value).map((k) => [k, wipeDeep(value[k])])
    );
  }
  return "";
}

// Reusable pill container
const Pill = ({
  children,
  className = "",
}: {
  children: React.ReactNode;
  className?: string;
}) => (
  <div
    className={`rounded-full shadow-sm border border-gray-200 bg-white ${className}`}
  >
    {children}
  </div>
);

const IconAction = ({
  icon: Icon,
  onClick,
  disabled,
  spin,
  title,
}: {
  icon: React.ComponentType<{ className?: string }>;
  onClick: () => void;
  disabled?: boolean;
  spin?: boolean;
  title: string;
}) => (
  <button
    type="button"
    onClick={onClick}
    disabled={disabled}
    title={title}
    className="h-9 w-9 grid place-items-center rounded-full text-gray-700 hover:bg-gray-100 hover:text-blue-600 disabled:opacity-50 transition active:scale-95 cursor-pointer"
  >
    <Icon className={`w-4.5 h-4.5 ${spin ? "animate-spin" : ""}`} />
  </button>
);

/** Autocomplete + Generate + Reset (fixed + overflow-safe). */
function DocumentRibbon({
  setData,
}: {
  setData: React.Dispatch<React.SetStateAction<FormDataType>>;
}) {
  const [studentId, setStudentId] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const [studentIdOptions, setStudentIdOptions] = useState<string[]>([]);
  const [isLoadingOptions, setIsLoadingOptions] = useState(false);

  const [isOpen, setIsOpen] = useState(false);
  const wrapperRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let cancelled = false;

    const loadOptions = async () => {
      setIsLoadingOptions(true);
      try {
        const ids = await fetchStudentIdOptions(
          DEFAULT_STUDENT_ID_OPTIONS_LIMIT
        );
        if (!cancelled) setStudentIdOptions(ids);
      } catch (e) {
        console.error("Failed to load student id options:", e);
        if (!cancelled) setStudentIdOptions([]);
      } finally {
        if (!cancelled) setIsLoadingOptions(false);
      }
    };

    loadOptions();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    const onDown = (e: MouseEvent) => {
      if (!wrapperRef.current) return;
      if (!wrapperRef.current.contains(e.target as Node)) setIsOpen(false);
    };
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, []);

  const canGenerate = useMemo(() => studentId.trim().length > 0, [studentId]);

  const suggestions = useMemo(() => {
    const q = studentId.trim().toLowerCase();
    const base = studentIdOptions;

    if (!q) return base.slice(0, 10);

    const starts = base.filter((id) => id.toLowerCase().startsWith(q));
    const contains = base.filter(
      (id) => !starts.includes(id) && id.toLowerCase().includes(q)
    );

    return [...starts, ...contains].slice(0, 10);
  }, [studentId, studentIdOptions]);

  const handleGenerate = async () => {
    const id = studentId.trim();
    if (!id) return;

    setIsLoading(true);
    setErrorMsg(null);

    try {
      const patch = await fetchStudentFormData(id);
      if (!patch) {
        setErrorMsg(`Student not found: ${id}`);
        return;
      }

      setData((prev) => ({ ...prev, ...patch } as FormDataType));
      setIsOpen(false);
    } catch (e: any) {
      setErrorMsg(e?.message ?? "Failed to load student");
    } finally {
      setIsLoading(false);
    }
  };

  const handleReset = () => {
    setData((prev) => wipeDeep(prev) as FormDataType);
    setStudentId("");
    setErrorMsg(null);
    setIsOpen(false);
  };

  const pickSuggestion = (id: string) => {
    setStudentId(id);
    setIsOpen(false);
  };

  return (
    <div className="flex items-center gap-2 overflow-visible">
      <div ref={wrapperRef} className="relative shrink-0 overflow-visible">
        <input
          value={studentId}
          onChange={(e) => {
            setStudentId(e.target.value);
            setIsOpen(true);
          }}
          onFocus={() => setIsOpen(true)}
          placeholder={isLoadingOptions ? "Loading..." : "Student ID"}
          autoComplete="off"
          className="h-9 w-32 md:w-44 rounded-lg border border-gray-200 bg-gray-50 px-3 text-xs outline-none focus:ring-2 focus:ring-blue-500/15 focus:border-blue-500 transition focus:bg-white"
        />

        {isOpen && suggestions.length > 0 && (
          <div className="absolute top-full left-0 mt-2 w-full bg-white rounded-xl shadow-lg border border-gray-100 max-h-64 overflow-y-auto z-9999">
            {suggestions.map((id) => (
              <button
                key={id}
                type="button"
                onMouseDown={(e) => {
                  e.preventDefault();
                  pickSuggestion(id);
                }}
                className="w-full text-left px-3 py-2 text-xs hover:bg-blue-50 text-gray-900 transition-colors border-b border-gray-50 last:border-0 cursor-pointer"
              >
                {id}
              </button>
            ))}
          </div>
        )}

        {isOpen &&
          !isLoadingOptions &&
          studentIdOptions.length > 0 &&
          suggestions.length === 0 && (
            <div className="absolute top-full left-0 mt-2 w-full bg-white rounded-xl shadow-lg border border-gray-100 z-[9999]">
              <div className="px-3 py-2 text-xs text-gray-500 flex items-center gap-2">
                <FileWarning className="w-3 h-3" /> No matches
              </div>
            </div>
          )}
      </div>

      <button
        type="button"
        onClick={handleGenerate}
        disabled={!canGenerate || isLoading}
        className="h-9 w-20 rounded-lg bg-sky-950 text-white px-3 text-xs font-semibold disabled:opacity-50 hover:bg-sky-900 transition-all active:scale-[0.98] cursor-pointer"
      >
        {isLoading ? (
          <div className="w-full flex items-center justify-center">
            <Loader2 className="w-3 h-3 animate-spin" />
          </div>
        ) : (
          "Generate"
        )}
      </button>

      <IconAction
        icon={RotateCcw}
        onClick={handleReset}
        disabled={isLoading}
        title="Reset / wipe data"
      />

      {errorMsg && (
        <div className="hidden md:flex items-center gap-1 text-xs text-red-600 max-w-65 overflow-hidden">
          <FileWarning className="w-4 h-4 shrink-0" />
          <span className="truncate">{errorMsg}</span>
        </div>
      )}
    </div>
  );
}

interface DocumentEditorProps {
  initialData: FormDataType;
  title: string;
  children: ReactNode;
  onChange?: (data: FormDataType) => void;
  onSaveClick?: () => void;
  autoExportToken?: string | number;
  onExportDone?: () => void;

  // NEW: Props for unified navigation
  onBack?: () => void;
  status?: ReactNode;
}

export function DocumentEditor({
  initialData,
  title,
  children,
  onChange,
  onSaveClick,
  autoExportToken,
  onExportDone,
  onBack,
  status,
}: DocumentEditorProps) {
  const initialDataRef = useRef<FormDataType>(
    initialData && Object.keys(initialData).length > 0
      ? initialData
      : ({} as FormDataType)
  );

  const [data, setData] = useState<FormDataType>(initialDataRef.current);
  const [isExporting, setIsExporting] = useState(false);
  const [pages, setPages] = useState<ReactNode[][]>([]);

  const contentRef = useRef<HTMLDivElement>(null);
  const pagesContainerRef = useRef<HTMLDivElement>(null);

  const handleSaveClick = onSaveClick ?? (() => {});

  const onChangeRef = useRef(onChange);
  useEffect(() => {
    onChangeRef.current = onChange;
  }, [onChange]);

  const isFirstDataRender = useRef(true);
  useEffect(() => {
    if (isFirstDataRender.current) {
      isFirstDataRender.current = false;
      return;
    }
    onChangeRef.current?.(data);
  }, [data]);

  const updateField = useCallback((field: keyof FormDataType, val: any) => {
    setData((prev) => {
      if ((prev as any)[field] === val) return prev;
      return { ...prev, [field]: val };
    });
  }, []);

  // --- Pagination (fixed) ---
  useEffect(() => {
    const container = contentRef.current;
    if (!container) return;

    const px = (v: string) => {
      const n = parseFloat(v || "0");
      return Number.isFinite(n) ? n : 0;
    };

    const outerHeight = (el: HTMLElement) => {
      const rect = el.getBoundingClientRect();
      const style = window.getComputedStyle(el);
      return rect.height + px(style.marginTop) + px(style.marginBottom);
    };

    const runPagination = () => {
      if (!contentRef.current) return;

      const elements = Array.from(contentRef.current.children) as HTMLElement[];
      const headerEl = elements[0];
      const bodyElements = elements.slice(1);

      const headerH = headerEl ? outerHeight(headerEl) : 0;
      const innerHeight = PAGE_HEIGHT - PAGE_PADDING * 2;
      const FOOTER_RESERVE = 32;
      const maxBodyHeight = innerHeight - headerH - FOOTER_RESERVE;

      const newPages: ReactNode[][] = [];
      let currentPageNodes: ReactNode[] = [];
      let currentHeight = 0;

      const startNewPage = () => {
        currentPageNodes = [<Header key={`header-${newPages.length}`} />];
        currentHeight = 0;
      };

      startNewPage();

      bodyElements.forEach((el, index) => {
        const h = outerHeight(el);

        if (currentPageNodes.length > 1 && currentHeight + h > maxBodyHeight) {
          newPages.push(currentPageNodes);
          startNewPage();
        }

        currentPageNodes.push(
          <div
            key={`node-${newPages.length}-${index}`}
            dangerouslySetInnerHTML={{ __html: el.outerHTML }}
            className="w-full"
          />
        );

        currentHeight += h;
      });

      if (currentPageNodes.length > 0) newPages.push(currentPageNodes);
      if (newPages.length === 0) newPages.push([<Header key="header-0" />]);

      setPages(newPages);
    };

    let raf1 = 0;
    let raf2 = 0;

    const schedule = () => {
      cancelAnimationFrame(raf1);
      cancelAnimationFrame(raf2);
      raf1 = requestAnimationFrame(() => {
        raf2 = requestAnimationFrame(runPagination);
      });
    };

    schedule();

    const ro = new ResizeObserver(() => schedule());
    ro.observe(container);

    return () => {
      cancelAnimationFrame(raf1);
      cancelAnimationFrame(raf2);
      ro.disconnect();
    };
  }, [children, data]);

  const generatePdf = useCallback(async () => {
    if (!pagesContainerRef.current) return;

    const pageElements =
      pagesContainerRef.current.querySelectorAll(".pdf-page-content");

    if (!pageElements.length) {
      console.warn("No .pdf-page-content elements found");
      return;
    }

    setIsExporting(true);

    try {
      const pdf = new jsPDF({
        orientation: "portrait",
        unit: "px",
        format: [PAGE_WIDTH, PAGE_HEIGHT],
      });

      for (let i = 0; i < pageElements.length; i++) {
        const pageElement = pageElements[i] as HTMLElement;

        const canvas = await html2canvas(pageElement, {
          scale: 2,
          useCORS: true,
          allowTaint: true,
          logging: false,
          backgroundColor: "#ffffff",
          scrollX: 0,
          scrollY: -window.scrollY,
          windowWidth: pageElement.scrollWidth,
          windowHeight: pageElement.scrollHeight,
        });

        const imgData = canvas.toDataURL("image/png");
        const pdfWidth = pdf.internal.pageSize.getWidth();
        const imgProps = pdf.getImageProperties(imgData);
        const pdfHeight = (imgProps.height * pdfWidth) / imgProps.width;

        if (i > 0) pdf.addPage();
        pdf.addImage(imgData, "PNG", 0, 0, pdfWidth, pdfHeight);
      }

      const timestamp = new Date().toISOString().split("T")[0];
      const keyField =
        (data as any).receiptNo ||
        (data as any).studentName ||
        (data as any).studentId ||
        "doc";
      const filename = `${title}-${keyField}-${timestamp}.pdf`;
      pdf.save(filename);
    } catch (error) {
      console.error("PDF generation failed:", error);
      alert("Export failed. Please check console.");
    } finally {
      setIsExporting(false);
      onExportDone?.();
    }
  }, [title, data, onExportDone]);

  useEffect(() => {
    if (!autoExportToken) return;
    if (!pagesContainerRef.current) return;
    if (pages.length === 0) return;
    const id = window.setTimeout(() => {
      generatePdf();
    }, 0);
    return () => window.clearTimeout(id);
  }, [autoExportToken, pages, generatePdf]);

  const contextValue = useMemo(
    () => ({
      data,
      setData,
      updateField,
      isExporting,
      initialData: initialDataRef.current,
    }),
    [data, updateField, isExporting]
  );

  return (
    <DocumentContext.Provider value={contextValue}>
      <div className="flex flex-col overflow-hidden bg-gray-50/50 text-neutral-900">
        {/* UNIFIED TOOLBAR: Sticky and centralized */}
        <div className="fixed top-25 left-0 right-0 z-50 flex justify-center pointer-events-none">
          <Pill className="pointer-events-auto flex items-center gap-1 p-1.5 pr-2 bg-white/90 backdrop-blur shadow-sm border border-gray-200/60">
            {/* Left: Back & Status */}
            {onBack && (
              <>
                <IconAction
                  title="Back to Explorer"
                  onClick={onBack}
                  icon={ArrowLeft}
                />
                <div className="px-3 text-xs font-medium text-gray-500 whitespace-nowrap min-w-15">
                  {status}
                </div>
                <div className="h-4 w-px bg-gray-200 mx-1" />
              </>
            )}

            {/* Middle: Student Data Controls */}
            <DocumentRibbon setData={setData} />

            <div className="h-4 w-px bg-gray-200 mx-1" />

            {/* Right: Actions */}
            <IconAction
              icon={Save}
              onClick={handleSaveClick}
              title="Save Changes"
            />
            <IconAction
              icon={isExporting ? Loader2 : Download}
              onClick={generatePdf}
              disabled={isExporting}
              spin={isExporting}
              title={isExporting ? "Exporting..." : "Export PDF"}
            />
          </Pill>
        </div>

        {/* Hidden measuring container */}
        <div
          ref={contentRef}
          style={{
            position: "absolute",
            left: "-9999px",
            top: 0,
            width: `${MEASURE_WIDTH}px`,
          }}
          className="invisible"
        >
          <Header />
          {children}
        </div>

        {/* Scroll area */}
        <div className="flex-1 overflow-auto overscroll-none pt-24 px-4 flex flex-col items-center gap-8 font-sans">
          <div ref={pagesContainerRef} className="flex flex-col gap-8">
            {pages.map((pageContent, i) => (
              <div
                key={`page-${i}`}
                className="pdf-page-content bg-white ring ring-neutral-200 shadow-xl"
                style={{
                  width: `${PAGE_WIDTH}px`,
                  height: `${PAGE_HEIGHT}px`,
                  padding: `${PAGE_PADDING}px`,
                  position: "relative",
                  overflow: "hidden",
                }}
              >
                <div className="flex flex-col h-full">
                  <div className="flex-1">{pageContent}</div>
                  <div className="absolute bottom-6 right-8 text-[10px] text-gray-400">
                    Page {i + 1} / {pages.length}
                  </div>
                </div>
              </div>
            ))}
            <div className="h-20"></div>
          </div>
        </div>
      </div>
    </DocumentContext.Provider>
  );
}

export function Section({
  title,
  children,
}: {
  title: string;
  children: ReactNode;
}) {
  return (
    <div className="mb-4">
      <h2 className="font-bold text-base mb-2 border-b border-gray-300 pb-1">
        {title}
      </h2>
      {children}
    </div>
  );
}

export const Stack = ({ children }: { children: ReactNode }) => (
  <div className="space-y-1 text-sm">{children}</div>
);

export const Grid2Col = ({ children }: { children: ReactNode }) => (
  <div className="grid grid-cols-2 gap-4 mb-2">{children}</div>
);

export const Title = ({ children }: { children: ReactNode }) => (
  <h1 className="text-4xl font-semibold text-center">{children}</h1>
);

export function InfoRow({
  label,
  children,
  bold,
  strikethrough,
}: {
  label?: string;
  children: ReactNode;
  bold?: boolean;
  strikethrough?: boolean;
}) {
  if (!label) return <div>{children}</div>;
  return (
    <div className={`flex gap-2 ${bold ? "font-semibold" : ""}`}>
      <span className="min-w-30">{label}:</span>
      <span className="flex-1">
        {strikethrough ? (
          <>
            <span className="line-through text-gray-400 mr-2">{children}</span>
            <span>(Waived)</span>
          </>
        ) : (
          <span>{children}</span>
        )}
      </span>
    </div>
  );
}

export function LessonList({
  fieldName = "lessons",
  lessonsOverride,
  startIndex = 0,
  emptyCount = 12,
}: {
  fieldName?: string;
  lessonsOverride?: any[];
  startIndex?: number;
  emptyCount?: number;
}) {
  const { data } = useDoc();
  const lessons = lessonsOverride ?? (data as any)[fieldName] ?? [];

  const displayLessons =
    lessons.length > 0
      ? lessons
      : Array.from({ length: emptyCount }, () => ({
          name: "",
          dateTime: "",
        }));

  return (
    <div className="mt-2 flex">
      <div className="text-sm min-w-32">Lesson Schedule:</div>

      <div className="columns-1 md:columns-2 gap-8 space-y-2">
        {displayLessons.map((lesson: any, index: number) => {
          const lessonNumber = startIndex + index + 1;
          const name = lesson?.name || "";
          const dateTime = lesson?.dateTime || "";

          return (
            <div
              key={`lesson-${lessonNumber}`}
              className="flex items-center gap-4 break-inside-avoid"
            >
              <span className="text-gray-300 min-w-10 text-3xl -mr-2">
                {lessonNumber.toString().padStart(2, "0")}
              </span>

              <div className="flex-col min-w-0">
                <span className="font-medium flex text-sm min-h-[1.25rem]">
                  {name || "\u00A0"}
                </span>

                <span className="text-gray-600 whitespace-nowrap text-sm min-h-5">
                  {dateTime ? formatDisplayDate(dateTime) : "—"}
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

const Header = React.memo(() => (
  <div className="flex w-full justify-between items-start mb-8 shrink-0">
    <img
      src={logo.src}
      alt="Logo"
      className="h-22 w-auto object-contain"
      crossOrigin="anonymous"
    />
    <div className="flex flex-col text-[10px] text-neutral-600">
      <p className="font-medium text-neutral-900 mb-0.5">
        Unicorn Vision Design Limited
      </p>
      <p>No.903, 1202, Vogue Centre,</p>
      <p>696 Castle Peak Road,</p>
      <p>KL, HK</p>
      <div className="flex justify-between mt-0.5 text-[9px]">
        <span>Tel: 3168 6878</span>
        <span>Fax: 3168 6879</span>
      </div>
    </div>
  </div>
));
Header.displayName = "Header";
