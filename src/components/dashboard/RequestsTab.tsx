// src/components/dashboard/RequestsTab.tsx
"use client";

import React from "react";
import {
  FileText,
  User,
  Clock,
  CalendarDays,
  ArrowRight,
  Check,
  X,
} from "lucide-react";
import { LessonChangeRequest } from "@/types";

interface RequestsTabProps {
  requests: LessonChangeRequest[];
  onHandleRequest: (
    req: LessonChangeRequest,
    action: "approve" | "reject"
  ) => void;
}

const cx = (...classes: Array<string | false | null | undefined>) =>
  classes.filter(Boolean).join(" ");

function Chip({
  children,
  className = "",
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <span
      className={cx(
        "inline-flex items-center rounded-lg px-2 py-0.5 text-[11px] font-semibold",
        className
      )}
    >
      {children}
    </span>
  );
}

function EmptyState({ title, subtitle }: { title: string; subtitle: string }) {
  return (
    <div className="h-full grid place-items-center bg-white rounded-xl border border-gray-200 shadow-sm">
      <div className="text-center py-20 text-gray-400">
        <FileText className="h-12 w-12 mx-auto mb-3 opacity-20" />
        <p className="text-sm font-medium text-gray-500">{title}</p>
        <p className="text-xs text-gray-400 mt-1">{subtitle}</p>
      </div>
    </div>
  );
}

function RequestDetailBlock({
  title,
  lessonName,
  date,
  timeSlot,
  variant,
}: {
  title: string;
  lessonName: string;
  date: string;
  timeSlot: string;
  variant: "red" | "green";
}) {
  const colors =
    variant === "red"
      ? {
          bg: "bg-red-50",
          text: "text-red-800",
          border: "border-red-200",
          icon: "text-red-600",
        }
      : {
          bg: "bg-green-50",
          text: "text-green-800",
          border: "border-green-200",
          icon: "text-green-600",
        };

  return (
    <div
      className={cx(
        "p-3 rounded-lg border flex-1 min-w-0",
        colors.bg,
        colors.border
      )}
    >
      <div className={cx("text-xs font-semibold mb-2", colors.text)}>
        {title}
      </div>
      <div className="space-y-1">
        <div className="flex items-center gap-2">
          <CalendarDays className={cx("h-4 w-4 shrink-0", colors.icon)} />
          <div className="text-sm font-medium text-gray-900 truncate">
            {lessonName}
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Clock className={cx("h-4 w-4 shrink-0", colors.icon)} />
          <div className="text-sm text-gray-700 font-mono">
            {date} ({timeSlot})
          </div>
        </div>
      </div>
    </div>
  );
}

function RequestCard({
  req,
  onHandleRequest,
}: {
  req: LessonChangeRequest;
  onHandleRequest: (
    req: LessonChangeRequest,
    action: "approve" | "reject"
  ) => void;
}) {
  return (
    <div className="bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden flex flex-col">
      {/* Header */}
      <div className="p-4 border-b border-gray-200 bg-gray-50/70">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <div className="h-9 w-9 grid place-items-center rounded-lg bg-sky-100 text-sky-700 border border-sky-200">
              <User className="h-4 w-4" />
            </div>
            <div className="min-w-0">
              <div className="text-sm font-semibold text-gray-900 truncate">
                {req.studentName}
              </div>
              <div className="text-xs text-gray-500 font-mono mt-0.5">
                {req.studentId}
              </div>
            </div>
          </div>
          <Chip className="bg-gray-100 text-gray-700 shrink-0">
            {req.submitTime.split(" ")[0]}
          </Chip>
        </div>
        <div className="mt-3 text-sm text-gray-700 p-2 bg-white rounded-md border border-gray-200">
          <span className="font-semibold text-gray-500">Reason: </span>
          {req.reason}
        </div>
      </div>

      {/* Body */}
      <div className="p-4 flex-1">
        <div className="flex items-center gap-3">
          <RequestDetailBlock
            title="From (Old Lesson)"
            lessonName={req.lesson.name}
            date={req.lesson.dateStr}
            timeSlot={req.lesson.timeSlot}
            variant="red"
          />

          <div className="p-2 rounded-full bg-gray-100 border border-gray-200">
            <ArrowRight className="h-4 w-4 text-gray-500" />
          </div>

          <RequestDetailBlock
            title="To (New Lesson)"
            lessonName={req.selectedTimeSlot.name}
            date={req.selectedTimeSlot.date}
            timeSlot={req.selectedTimeSlot.time}
            variant="green"
          />
        </div>
      </div>

      {/* Footer */}
      <div className="p-4 border-t border-gray-200 bg-gray-50 flex items-center justify-end gap-2">
        <button
          type="button"
          onClick={() => onHandleRequest(req, "reject")}
          className="h-10 px-4 rounded-lg border border-gray-200 bg-white text-gray-700 hover:bg-gray-50 transition active:scale-[0.99] cursor-pointer inline-flex items-center gap-2 text-sm font-semibold"
        >
          <X className="h-4 w-4 text-red-600" />
          Reject
        </button>
        <button
          type="button"
          onClick={() => onHandleRequest(req, "approve")}
          className="h-10 px-4 rounded-lg bg-green-600 text-white hover:bg-green-700 transition active:scale-[0.99] cursor-pointer inline-flex items-center gap-2 text-sm font-semibold"
        >
          <Check className="h-4 w-4" />
          Approve
        </button>
      </div>
    </div>
  );
}

export default function RequestsTab({
  requests,
  onHandleRequest,
}: RequestsTabProps) {
  return (
    <div className="m-8 h-[calc(100vh-144px)] overflow-hidden flex flex-col gap-4">
      {/* Header */}
      <div className="flex items-center justify-between gap-2">
        <h2 className="text-base font-semibold text-gray-900">
          Pending Lesson Change Requests
        </h2>
        <Chip className="bg-sky-100 text-sky-700">
          {requests.length} request(s)
        </Chip>
      </div>

      {/* Content */}
      <div className="flex-1 min-h-0 overflow-auto">
        {requests.length === 0 ? (
          <EmptyState
            title="No pending requests"
            subtitle="The request queue is currently empty."
          />
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 pb-4">
            {requests.map((req) => (
              <RequestCard
                key={req.id}
                req={req}
                onHandleRequest={onHandleRequest}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
