"use client";

import React, {
  useState,
  useEffect,
  useMemo,
  useCallback,
  useRef,
} from "react";
import {
  Search,
  Grid,
  List,
  Trash2,
  Copy,
  FileText,
  Plus,
  Calendar,
  ArrowLeft,
  Download,
} from "lucide-react";
import {
  collection,
  query,
  orderBy,
  getDocs,
  setDoc,
  deleteDoc,
  doc,
} from "firebase/firestore";
import isEqual from "react-fast-compare";

import { db } from "@/lib/firebase";
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
  AlertDialogAction,
} from "@/components/ui/alert-dialog";

import {
  FormDataType,
  SavedFile,
  NEW_COURSE_PLAN_TEMPLATE,
  NEW_RECEIPT_TEMPLATE,
} from "@/types";

import { DocumentEditor } from "@/components/entry-manager/document-editor";
import { getNextReceiptNo } from "@/components/entry-manager/student-firebase";

const WORKSPACE_STATE_KEY = "rc_workspace_state_single_autosave_v1";

const getStudentNameTitle = (data: any, fallback?: string) => {
  const name = String(data?.studentName ?? "").trim();
  return name || fallback || "Untitled";
};

const getReceiptNo = (data: any) => String(data?.receiptNo ?? "").trim();

const deepClone = <T,>(value: T): T => {
  const sc = (globalThis as any)?.structuredClone;
  if (typeof sc === "function") return sc(value);
  return JSON.parse(JSON.stringify(value));
};

function useFileSystem() {
  const [savedFiles, setSavedFiles] = useState<SavedFile[]>([]);

  const persistFiles = useCallback((files: SavedFile[]) => {
    setSavedFiles(files);
    if (typeof window !== "undefined") {
      localStorage.setItem("rc_saved_files", JSON.stringify(files));
    }
  }, []);

  useEffect(() => {
    if (typeof window !== "undefined") {
      const stored = localStorage.getItem("rc_saved_files");
      if (stored) {
        try {
          setSavedFiles(JSON.parse(stored));
        } catch (e) {
          console.error("Local load failed", e);
        }
      }
    }

    const fetchFromFirestore = async () => {
      try {
        const q = query(
          collection(db, "entries"),
          orderBy("lastModified", "desc")
        );
        const snap = await getDocs(q);
        const files: SavedFile[] = snap.docs.map((d) => {
          const data = d.data() as Omit<SavedFile, "id">;
          return { id: d.id, ...data };
        });
        persistFiles(files);
      } catch (e) {
        console.error("Firestore load failed", e);
      }
    };

    fetchFromFirestore();
  }, [persistFiles]);

  const saveFile = useCallback(
    async (file: SavedFile) => {
      const existingIdx = savedFiles.findIndex((f) => f.id === file.id);
      const next = [...savedFiles];
      if (existingIdx >= 0) next[existingIdx] = file;
      else next.unshift(file);

      persistFiles(next);

      try {
        await setDoc(doc(collection(db, "entries"), file.id), {
          title: file.title,
          lastModified: file.lastModified,
          data: file.data,
        });
      } catch (e) {
        console.error("Firestore save failed", e);
      }
    },
    [savedFiles, persistFiles]
  );

  const deleteFile = useCallback(
    async (id: string) => {
      const next = savedFiles.filter((f) => f.id !== id);
      persistFiles(next);
      try {
        await deleteDoc(doc(db, "entries", id));
      } catch (e) {
        console.error("Failed to delete from Firestore", e);
      }
    },
    [savedFiles, persistFiles]
  );

  const duplicateFile = useCallback(
    async (file: SavedFile) => {
      const d: any = file.data;
      const isReceipt = d?.type !== "course_plan";
      const studentId = String(d?.studentId ?? "").trim();

      if (!isReceipt || !studentId) {
        const newId = crypto.randomUUID();
        const newFile: SavedFile = {
          ...file,
          id: newId,
          title: getStudentNameTitle(file.data, file.title),
          lastModified: Date.now(),
          data: { ...file.data },
        };
        await saveFile(newFile);
        return;
      }

      const nextReceiptNo = await getNextReceiptNo(studentId);

      const newFile: SavedFile = {
        ...file,
        id: nextReceiptNo,
        title: getStudentNameTitle(file.data, file.title),
        lastModified: Date.now(),
        data: { ...file.data, receiptNo: nextReceiptNo },
      };

      await saveFile(newFile);
    },
    [saveFile]
  );

  return { savedFiles, saveFile, deleteFile, duplicateFile };
}

type WorkspaceDoc = {
  sessionId: string;
  title: string;
  data: FormDataType;
  savedFileId?: string;
};

interface EntriesWorkspaceProps {
  ReceiptContent: React.ComponentType;
  CoursePlanContent: React.ComponentType;
}

const Pill = ({
  children,
  className = "",
  onWheel,
}: {
  children: React.ReactNode;
  className?: string;
  onWheel?: (e: React.WheelEvent) => void;
}) => (
  <div onWheel={onWheel} className={className}>
    {children}
  </div>
);

const ActionIconButton = ({
  title,
  onClick,
  children,
}: {
  title: string;
  onClick: () => void;
  children: React.ReactNode;
}) => (
  <button
    type="button"
    onClick={(e) => {
      e.stopPropagation();
      onClick();
    }}
    className="h-9 w-9 grid place-items-center rounded-lg text-gray-700 hover:bg-gray-900/5 transition active:scale-95 cursor-pointer"
    title={title}
  >
    {children}
  </button>
);

function DeleteConfirm({ onConfirm }: { onConfirm: () => void }) {
  const [open, setOpen] = useState(false);

  return (
    <AlertDialog open={open} onOpenChange={setOpen}>
      <AlertDialogTrigger asChild>
        <button
          type="button"
          onPointerDown={(e) => e.stopPropagation()}
          onClick={(e) => {
            e.stopPropagation();
            setOpen(true);
          }}
          className="h-9 w-9 grid place-items-center rounded-lg text-gray-700 hover:bg-red-50 hover:text-red-600 transition active:scale-95 cursor-pointer"
          title="Delete"
        >
          <Trash2 className="h-[18px] w-[18px]" />
        </button>
      </AlertDialogTrigger>

      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Delete Entry?</AlertDialogTitle>
          <AlertDialogDescription>
            This action cannot be undone.
          </AlertDialogDescription>
        </AlertDialogHeader>

        <AlertDialogFooter>
          <AlertDialogCancel
            className="cursor-pointer"
            onPointerDown={(e) => e.stopPropagation()}
            onClick={(e) => e.stopPropagation()}
          >
            Cancel
          </AlertDialogCancel>

          <AlertDialogAction
            className="bg-red-600 hover:bg-red-700 cursor-pointer"
            onPointerDown={(e) => {
              e.preventDefault();
              e.stopPropagation();
            }}
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              onConfirm();
              requestAnimationFrame(() => setOpen(false));
            }}
          >
            Delete
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

const getTypeMeta = (type?: string) =>
  type === "course_plan"
    ? {
        label: "Course Plan",
        chip: "bg-purple-100 text-purple-700",
        icon: Calendar,
      }
    : { label: "Receipt", chip: "bg-blue-100 text-blue-700", icon: FileText };

function FileCard({
  file,
  onOpen,
  onDelete,
  onDuplicate,
  onDownload,
}: {
  file: SavedFile;
  onOpen: (file: SavedFile) => void;
  onDelete: (id: string) => void;
  onDuplicate: (file: SavedFile) => void;
  onDownload: (file: SavedFile) => void;
}) {
  const data: any = file.data;
  const meta = getTypeMeta(data?.type);
  const Icon = meta.icon;
  const isPlan = data?.type === "course_plan";
  const displayTitle = getStudentNameTitle(data, file.title);
  const receiptNo = getReceiptNo(data);

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={() => onOpen(file)}
      title="Open"
      className="group relative bg-white rounded-lg border border-gray-200 shadow-sm hover:shadow-md transition overflow-hidden cursor-pointer focus:outline-none focus:ring-2 focus:ring-blue-500/20"
    >
      <div className="p-3 flex items-start justify-between gap-2">
        <div className="min-w-0 text-left">
          <div className="flex items-center gap-2">
            <span
              className={`text-[10px] px-2 py-0.5 rounded-lg font-semibold ${meta.chip}`}
            >
              {meta.label}
            </span>
            {!isPlan && (
              <span className="text-[10px] px-2 py-0.5 rounded-lg bg-gray-100 text-gray-700 font-medium">
                {receiptNo || "—"}
              </span>
            )}
          </div>

          <div className="mt-2 font-semibold text-sm text-gray-900 truncate">
            {displayTitle}
          </div>
          <div className="mt-1 text-xs text-gray-500">
            {new Date(file.lastModified).toLocaleDateString()}
          </div>
        </div>

        <div className="h-9 w-9 grid place-items-center rounded-lg bg-gray-50 border border-gray-100 text-gray-600">
          <Icon className="h-4 w-4" />
        </div>
      </div>

      <div className="px-3 pb-3 flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
        <ActionIconButton title="Export PDF" onClick={() => onDownload(file)}>
          <Download className="h-[18px] w-[18px]" />
        </ActionIconButton>

        <ActionIconButton title="Duplicate" onClick={() => onDuplicate(file)}>
          <Copy className="h-[18px] w-[18px]" />
        </ActionIconButton>

        <DeleteConfirm onConfirm={() => onDelete(file.id)} />
      </div>
    </div>
  );
}

function FileRow({
  file,
  onOpen,
  onDelete,
  onDuplicate,
  onDownload,
}: {
  file: SavedFile;
  onOpen: (file: SavedFile) => void;
  onDelete: (id: string) => void;
  onDuplicate: (file: SavedFile) => void;
  onDownload: (file: SavedFile) => void;
}) {
  const data: any = file.data;
  const meta = getTypeMeta(data?.type);
  const Icon = meta.icon;
  const isPlan = data?.type === "course_plan";
  const displayTitle = getStudentNameTitle(data, file.title);
  const receiptNo = getReceiptNo(data);

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={() => onOpen(file)}
      className="flex items-center gap-3 px-3 py-2 hover:bg-gray-50 cursor-pointer focus:outline-none focus:ring-2 focus:ring-blue-500/15"
      title="Open"
    >
      <div
        className={`h-9 w-9 rounded-lg grid place-items-center ${meta.chip}`}
      >
        <Icon className="h-4 w-4" />
      </div>

      <div className="flex-1 min-w-0 text-left">
        <div className="flex items-center gap-2 min-w-0">
          <div className="font-medium text-sm text-gray-900 truncate">
            {displayTitle}
          </div>
          <span
            className={`text-[10px] px-2 py-0.5 rounded-lg font-semibold ${meta.chip}`}
          >
            {meta.label}
          </span>
          {!isPlan && (
            <span className="text-[10px] px-2 py-0.5 rounded-lg bg-gray-100 text-gray-700 font-medium">
              {receiptNo || "—"}
            </span>
          )}
        </div>
        <div className="text-xs text-gray-500 mt-0.5">
          {new Date(file.lastModified).toLocaleDateString()}
        </div>
      </div>

      <div
        className="flex items-center gap-1"
        onClick={(e) => e.stopPropagation()}
      >
        <ActionIconButton title="Export PDF" onClick={() => onDownload(file)}>
          <Download className="h-[18px] w-[18px]" />
        </ActionIconButton>

        <ActionIconButton title="Duplicate" onClick={() => onDuplicate(file)}>
          <Copy className="h-[18px] w-[18px]" />
        </ActionIconButton>

        <DeleteConfirm onConfirm={() => onDelete(file.id)} />
      </div>
    </div>
  );
}

interface FileExplorerProps {
  files: SavedFile[];
  onOpen: (file: SavedFile) => void;
  onDelete: (id: string) => void;
  onDuplicate: (file: SavedFile) => void;
  onNewEntry: () => void;
  onDownload: (file: SavedFile) => void;
}

function FileExplorer({
  files,
  onOpen,
  onDelete,
  onDuplicate,
  onNewEntry,
  onDownload,
}: FileExplorerProps) {
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [search, setSearch] = useState("");
  const scrollRef = useRef<HTMLDivElement>(null);

  const forwardWheelToScroll = (e: React.WheelEvent) => {
    scrollRef.current?.scrollBy({ top: e.deltaY, left: e.deltaX });
  };

  const filteredFiles = useMemo(() => {
    const q = search.toLowerCase();
    return files.filter((f) => {
      const data: any = f.data;
      const receiptNo = getReceiptNo(data);
      const courseCode = String(data?.courseCode || "");
      const studentName = String(data?.studentName || "");
      const titleFallback = String(f.title || "");
      return (
        titleFallback.toLowerCase().includes(q) ||
        studentName.toLowerCase().includes(q) ||
        courseCode.toLowerCase().includes(q) ||
        receiptNo.toLowerCase().includes(q)
      );
    });
  }, [files, search]);

  return (
    <div className="p-8 overflow-hidden">
      <Pill onWheel={forwardWheelToScroll} className="flex items-center gap-2">
        <button
          onClick={onNewEntry}
          className="px-3 py-2 bg-sky-950 cursor-pointer flex items-center gap-2 rounded-lg text-white hover:bg-sky-950/85 transition"
        >
          <Plus /> Add New PDF
        </button>

        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search name, code, receipt…"
            className="h-9 w-64 rounded-lg border border-gray-200 bg-white/70 pl-9 pr-3 text-xs outline-none focus:ring-2 focus:ring-blue-500/15 focus:border-blue-500 transition"
          />
        </div>

        <div className="flex items-center">
          <button
            type="button"
            onClick={() => setViewMode("grid")}
            className={`h-8 w-8 grid place-items-center rounded-lg transition active:scale-95 cursor-pointer ${
              viewMode === "grid"
                ? "bg-gray-900/5 text-blue-600"
                : "text-gray-700 hover:bg-gray-900/5"
            }`}
            title="Grid"
          >
            <Grid className="h-4 w-4" />
          </button>
          <button
            type="button"
            onClick={() => setViewMode("list")}
            className={`h-8 w-8 grid place-items-center rounded-lg transition active:scale-95 cursor-pointer ${
              viewMode === "list"
                ? "bg-gray-900/5 text-blue-600"
                : "text-gray-700 hover:bg-gray-900/5"
            }`}
            title="List"
          >
            <List className="h-4 w-4" />
          </button>
        </div>
      </Pill>

      <div ref={scrollRef} className="h-full overflow-auto">
        <div className="py-6">
          {filteredFiles.length === 0 ? (
            <div className="text-center py-20 text-gray-400">
              <FileText className="h-12 w-12 mx-auto mb-3 opacity-20" />
              <p className="text-sm">No saved files found</p>
            </div>
          ) : viewMode === "grid" ? (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
              {filteredFiles.map((file) => (
                <FileCard
                  key={file.id}
                  file={file}
                  onOpen={onOpen}
                  onDelete={onDelete}
                  onDuplicate={onDuplicate}
                  onDownload={onDownload}
                />
              ))}
            </div>
          ) : (
            <div className="bg-white rounded-lg border border-gray-200 shadow-sm divide-y overflow-hidden">
              {filteredFiles.map((file) => (
                <FileRow
                  key={file.id}
                  file={file}
                  onOpen={onOpen}
                  onDelete={onDelete}
                  onDuplicate={onDuplicate}
                  onDownload={onDownload}
                />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export function EntriesWorkspace({
  ReceiptContent,
  CoursePlanContent,
}: EntriesWorkspaceProps) {
  const { savedFiles, saveFile, deleteFile, duplicateFile } = useFileSystem();

  const [isFilesView, setIsFilesView] = useState(true);
  const [currentDoc, setCurrentDoc] = useState<WorkspaceDoc | null>(null);

  const [isNewEntryDialogOpen, setIsNewEntryDialogOpen] = useState(false);
  const [pendingExportSessionId, setPendingExportSessionId] = useState<
    string | null
  >(null);

  const [isManualSaving, setIsManualSaving] = useState(false);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [lastSavedAt, setLastSavedAt] = useState<number | null>(null);

  const baselineDataRef = useRef<FormDataType | null>(null);

  const [isLeaveConfirmOpen, setIsLeaveConfirmOpen] = useState(false);
  const pendingLeaveActionRef = useRef<null | (() => void)>(null);

  const [isSaveConfirmOpen, setIsSaveConfirmOpen] = useState(false);

  const requestLeave = useCallback(
    (action: () => void) => {
      if (!isFilesView && hasUnsavedChanges) {
        pendingLeaveActionRef.current = action;
        setIsLeaveConfirmOpen(true);
        return;
      }
      action();
    },
    [hasUnsavedChanges, isFilesView]
  );

  const goToExplorerNow = useCallback(() => {
    setIsFilesView(true);
    setPendingExportSessionId(null);
  }, []);

  const goToExplorer = useCallback(() => {
    requestLeave(goToExplorerNow);
  }, [requestLeave, goToExplorerNow]);

  useEffect(() => {
    if (typeof window === "undefined") return;

    try {
      const raw = localStorage.getItem(WORKSPACE_STATE_KEY);
      if (!raw) return;

      const parsed = JSON.parse(raw) as {
        isFilesView?: boolean;
        currentDoc?: WorkspaceDoc | null;
      };

      if (typeof parsed.isFilesView === "boolean")
        setIsFilesView(parsed.isFilesView);

      if (parsed.currentDoc) {
        setCurrentDoc(parsed.currentDoc);
        baselineDataRef.current = deepClone(parsed.currentDoc.data);
        setHasUnsavedChanges(false);
        setLastSavedAt(null);
      }
    } catch (e) {
      console.error("Failed to load workspace state", e);
    }
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      localStorage.setItem(
        WORKSPACE_STATE_KEY,
        JSON.stringify({ isFilesView, currentDoc })
      );
    } catch (e) {
      console.error("Failed to save workspace state", e);
    }
  }, [isFilesView, currentDoc]);

  const openFromFile = useCallback(
    (file: SavedFile, opts?: { autoExport?: boolean }) => {
      const d: any = file.data;

      baselineDataRef.current = deepClone(file.data as FormDataType);

      const docRow: WorkspaceDoc = {
        sessionId: Date.now().toString(),
        title: getStudentNameTitle(d, file.title),
        data: file.data as FormDataType,
        savedFileId: file.id,
      };

      setCurrentDoc(docRow);
      setIsFilesView(false);
      setPendingExportSessionId(opts?.autoExport ? docRow.sessionId : null);
      setHasUnsavedChanges(false);
      setLastSavedAt(file.lastModified);
    },
    []
  );

  const createEntry = useCallback((type: "receipt" | "course_plan") => {
    const template =
      type === "course_plan"
        ? ({ ...NEW_COURSE_PLAN_TEMPLATE } as FormDataType)
        : ({ ...NEW_RECEIPT_TEMPLATE } as FormDataType);

    baselineDataRef.current = deepClone(template);

    const doc: WorkspaceDoc = {
      sessionId: Date.now().toString(),
      title: "Untitled",
      data: template,
      savedFileId: undefined,
    };

    setCurrentDoc(doc);
    setIsFilesView(false);
    setIsNewEntryDialogOpen(false);
    setPendingExportSessionId(null);

    setHasUnsavedChanges(true);
    setLastSavedAt(null);
  }, []);

  useEffect(() => {
    const shouldBlock = !isFilesView && hasUnsavedChanges;
    if (!shouldBlock) return;

    const onBeforeUnload = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = "";
    };

    window.addEventListener("beforeunload", onBeforeUnload);
    return () => window.removeEventListener("beforeunload", onBeforeUnload);
  }, [hasUnsavedChanges, isFilesView]);

  const handleEditorChange = useCallback((nextData: FormDataType) => {
    setCurrentDoc((prev) => {
      if (!prev) return prev;
      if (isEqual(prev.data, nextData)) return prev;
      return { ...prev, data: nextData };
    });

    const baseline = baselineDataRef.current;
    if (!baseline) {
      setHasUnsavedChanges(true);
      return;
    }

    setHasUnsavedChanges(!isEqual(baseline, nextData));
  }, []);

  const saveNow = useCallback(async () => {
    if (!currentDoc) return;

    const d: any = currentDoc.data;
    const isCoursePlan = d?.type === "course_plan";
    const receiptNo = getReceiptNo(d);

    const canSave = isCoursePlan || !!receiptNo;
    if (!canSave) {
      alert(
        "Receipt cannot be saved yet (missing receiptNo). Generate/load a student first."
      );
      return;
    }

    setIsManualSaving(true);
    try {
      const now = Date.now();
      let fileId = currentDoc.savedFileId;

      if (!fileId) {
        fileId = isCoursePlan ? crypto.randomUUID() : receiptNo;
        setCurrentDoc((prev) =>
          prev ? { ...prev, savedFileId: fileId } : prev
        );
      }

      const baseTitle = getStudentNameTitle(d, currentDoc.title);

      const newFile: SavedFile = {
        id: fileId!,
        title: baseTitle,
        lastModified: now,
        data: currentDoc.data,
      };

      await saveFile(newFile);

      setCurrentDoc((prev) =>
        prev ? { ...prev, title: baseTitle, savedFileId: fileId } : prev
      );

      baselineDataRef.current = deepClone(currentDoc.data);
      setHasUnsavedChanges(false);
      setLastSavedAt(now);
    } finally {
      setIsManualSaving(false);
    }
  }, [currentDoc, saveFile]);

  const requestSave = useCallback(() => {
    if (!currentDoc) return;
    setIsSaveConfirmOpen(true);
  }, [currentDoc]);

  const statusText = isManualSaving
    ? "Saving…"
    : hasUnsavedChanges
    ? "Unsaved changes"
    : "Saved";

  const renderEditor = () => {
    if (!currentDoc) return null;

    const isCoursePlan = (currentDoc.data as any)?.type === "course_plan";
    const shouldAutoExport = currentDoc.sessionId === pendingExportSessionId;

    const d: any = currentDoc.data;
    const autoExportToken = shouldAutoExport
      ? `${currentDoc.sessionId}-${d?.receiptNo || ""}-${d?.studentName || ""}`
      : undefined;

    return (
      <DocumentEditor
        key={currentDoc.sessionId}
        initialData={currentDoc.data}
        title={isCoursePlan ? "Course Plan" : "Receipt"}
        onChange={handleEditorChange}
        onSaveClick={requestSave}
        autoExportToken={autoExportToken}
        onExportDone={() => setPendingExportSessionId(null)}
        // NEW: Pass navigation props to unified toolbar
        onBack={goToExplorer}
        status={
          <span
            className={hasUnsavedChanges ? "text-amber-600" : "text-gray-400"}
          >
            {statusText}
          </span>
        }
      >
        {isCoursePlan ? <CoursePlanContent /> : <ReceiptContent />}
      </DocumentEditor>
    );
  };

  const saveDialogDescription = currentDoc?.savedFileId
    ? "This will update the existing saved entry."
    : "This will create a new saved entry.";

  return (
    <div className="overflow-hidden">
      {isFilesView || !currentDoc ? (
        <FileExplorer
          files={savedFiles}
          onOpen={(file) => openFromFile(file)}
          onDelete={deleteFile}
          onDuplicate={duplicateFile}
          onNewEntry={() => setIsNewEntryDialogOpen(true)}
          onDownload={(file) => openFromFile(file, { autoExport: true })}
        />
      ) : (
        <div className="bg-white h-full overflow-hidden relative">
          {/* REMOVED: Top bar <Pill> is now gone. Unified toolbar is inside DocumentEditor. */}
          {renderEditor()}
        </div>
      )}

      {/* New entry dialog */}
      <AlertDialog
        open={isNewEntryDialogOpen}
        onOpenChange={(open) => {
          if (open) setIsNewEntryDialogOpen(true);
          else setIsNewEntryDialogOpen(false);
        }}
      >
        <AlertDialogContent className="max-w-md">
          <AlertDialogHeader>
            <AlertDialogTitle>Create New Entry</AlertDialogTitle>
            <AlertDialogDescription>
              Select document type.
            </AlertDialogDescription>
          </AlertDialogHeader>

          <div className="flex gap-4 py-4 justify-center">
            <button
              onClick={() => createEntry("receipt")}
              className="flex flex-col items-center justify-center p-6 bg-gray-50 border border-dashed border-gray-300 hover:border-blue-500 hover:bg-blue-50 rounded-lg transition-all w-36 h-36 group cursor-pointer"
            >
              <FileText className="w-8 h-8 text-gray-400 group-hover:text-blue-600 mb-2" />
              <span className="text-sm font-medium text-gray-700 group-hover:text-blue-700">
                Receipt
              </span>
            </button>

            <button
              onClick={() => createEntry("course_plan")}
              className="flex flex-col items-center justify-center p-6 bg-gray-50 border border-dashed border-gray-300 hover:border-purple-500 hover:bg-purple-50 rounded-lg transition-all w-36 h-36 group cursor-pointer"
            >
              <Calendar className="w-8 h-8 text-gray-400 group-hover:text-purple-600 mb-2" />
              <span className="text-sm font-medium text-gray-700 group-hover:text-purple-700">
                Course Plan
              </span>
            </button>
          </div>

          <AlertDialogFooter>
            <AlertDialogCancel className="cursor-pointer">
              Cancel
            </AlertDialogCancel>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Leave confirm dialog */}
      <AlertDialog
        open={isLeaveConfirmOpen}
        onOpenChange={setIsLeaveConfirmOpen}
      >
        <AlertDialogContent className="max-w-md">
          <AlertDialogHeader>
            <AlertDialogTitle>Leave without saving?</AlertDialogTitle>
            <AlertDialogDescription>
              You have unsaved changes. Leaving now will discard them.
            </AlertDialogDescription>
          </AlertDialogHeader>

          <AlertDialogFooter>
            <AlertDialogCancel className="cursor-pointer">
              Stay
            </AlertDialogCancel>
            <AlertDialogAction
              className="bg-red-600 hover:bg-red-700 cursor-pointer"
              onClick={() => {
                setIsLeaveConfirmOpen(false);
                const action = pendingLeaveActionRef.current;
                pendingLeaveActionRef.current = null;
                action?.();
              }}
            >
              Leave
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Save confirm dialog */}
      <AlertDialog open={isSaveConfirmOpen} onOpenChange={setIsSaveConfirmOpen}>
        <AlertDialogContent className="max-w-md">
          <AlertDialogHeader>
            <AlertDialogTitle>Save changes?</AlertDialogTitle>
            <AlertDialogDescription>
              {saveDialogDescription}
            </AlertDialogDescription>
          </AlertDialogHeader>

          <AlertDialogFooter>
            <AlertDialogCancel
              className="cursor-pointer"
              disabled={isManualSaving}
            >
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              className="cursor-pointer"
              disabled={isManualSaving}
              onClick={async () => {
                setIsSaveConfirmOpen(false);
                await saveNow();
              }}
            >
              Save
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
