import React from "react";
import { LessonChangeRequest } from "@/types";

interface RequestsTabProps {
  requests: LessonChangeRequest[];
  onHandleRequest: (req: LessonChangeRequest, action: "approve" | "reject") => void;
}

export default function RequestsTab({ requests, onHandleRequest }: RequestsTabProps) {
  if (requests.length === 0) {
    return (
      <div className="p-8 text-center text-gray-500 bg-white rounded-lg shadow">
        No pending requests found.
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow overflow-hidden">
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Student</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Reason</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-red-500 uppercase tracking-wider">From (Old)</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-green-600 uppercase tracking-wider">To (New)</th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {requests.map((req) => (
              <tr key={req.id} className="hover:bg-gray-50">
                {/* Student Info */}
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="text-sm font-medium text-gray-900">{req.studentName}</div>
                  <div className="text-xs text-gray-500">ID: {req.studentId}</div>
                  <div className="text-xs text-gray-400 mt-1">{req.submitTime.split(' ')[0]}</div>
                </td>

                {/* Reason */}
                <td className="px-6 py-4">
                  <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-yellow-100 text-yellow-800">
                    {req.reason}
                  </span>
                </td>

                {/* Old Lesson */}
                <td className="px-6 py-4">
                  <div className="text-sm text-gray-900">{req.lesson.name}</div>
                  <div className="text-xs text-red-500 font-medium">
                    {req.lesson.dateStr}
                  </div>
                  <div className="text-xs text-gray-500">{req.lesson.timeSlot}</div>
                </td>

                {/* New Lesson */}
                <td className="px-6 py-4">
                  <div className="text-sm text-gray-900">{req.selectedTimeSlot.name}</div>
                  <div className="text-xs text-green-600 font-medium">
                    {req.selectedTimeSlot.date}
                  </div>
                  <div className="text-xs text-gray-500">{req.selectedTimeSlot.time}</div>
                </td>

                {/* Actions */}
                <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                  <button
                    onClick={() => onHandleRequest(req, "approve")}
                    className="text-white bg-green-600 hover:bg-green-700 px-3 py-1 rounded-md text-xs mr-2 transition-colors"
                  >
                    Approve
                  </button>
                  <button
                    onClick={() => onHandleRequest(req, "reject")}
                    className="text-white bg-red-500 hover:bg-red-600 px-3 py-1 rounded-md text-xs transition-colors"
                  >
                    Reject
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
