// src/types/index.ts
import React from "react";

export interface PersonalInfo {
  name: string;
  chineseName: string;
  preferredLanguage: string;
  condition: string;
  sex: string;
  level: string;
  favChar: string;
  allergies: string;
  comfortMethod: string;
  parentName: string;
  parentContact: string;
}

export interface StudentLesson {
  courseId: string;
  lessonId: string;
  dateStr: string;
  timeSlot?: string;
  completed: boolean;
  name?: string;
  id?: string;
}

export interface Student {
  id: string;
  name: string;
  personalInfo: PersonalInfo;
  enrollment: StudentLesson[];
}

export interface Lesson {
  id: string;
  name: string;
  dateStr: string;
  students: string[];
  completed?: boolean;
}

export interface CoursePath {
  category: string;
  round: string;
}

export interface Course {
  id: string;
  name: string;
  timeSlot: string;
  path: CoursePath;
  lessons: Lesson[];
}

// --- NEW: Request Interface ---
export interface LessonChangeRequest {
  id: string; // Firebase Document ID
  studentId: string;
  studentName: string;
  courseCode: string;
  courseName: string;
  reason: string;
  status: "pending" | "approved" | "rejected";
  submitTime: string;
  makeupOption: string;
  
  // The lesson they want to LEAVE
  lesson: {
    courseId: string;
    dateStr: string;
    id: number | string;
    name: string;
    timeSlot: string;
  };
  
  // The lesson they want to JOIN
  selectedTimeSlot: {
    courseId: string;
    date: string;
    lessonId: string;
    name: string;
    time: string;
  };
}

export interface AdminDataHook {
  allCourses: Course[];
  setAllCourses: React.Dispatch<React.SetStateAction<Course[]>>;
  allStudents: Student[];
  setAllStudents: React.Dispatch<React.SetStateAction<Student[]>>;
  loading: boolean;
  availableCategories: string[];
  availableRounds: string[];

  // --- NEW: Added Requests & Handler ---
  requests: LessonChangeRequest[];
  handleRequest: (
    req: LessonChangeRequest, 
    action: "approve" | "reject"
  ) => Promise<void>;

  // Existing Actions
  createCourse: (name: string, time: string, date: string, roundNum: string) => Promise<string>;
  
  deleteCourse: (courseId: string) => Promise<void>;
  
  addStudentToLesson: (
    courseId: string, 
    lessonId: string, 
    studentId: string
  ) => Promise<{ success: boolean; msg?: string }>;
  
  removeStudentFromLesson: (
    courseId: string, 
    lessonId: string, 
    studentId: string
  ) => Promise<void>;
  
  toggleLessonCompletion: (
    courseId: string, 
    lessonId: string, 
    isComplete: boolean
  ) => Promise<void>;
  
  shiftCourseDates: (
    courseId: string, 
    startLessonId: string, 
    direction: number
  ) => Promise<void>;
  
  saveCourseToFirebase: (course: Course) => Promise<void>;
  
  enrollStudentToCourse: (
    courseId: string, 
    studentId: string
  ) => Promise<{ success: boolean; msg?: string }>;
  
  rescheduleStudent: (
    studentId: string,
    oldLesson: { courseId: string; lessonId: string },
    newLesson: { courseId: string; lessonId: string; dateStr: string; timeSlot: string }
  ) => Promise<{ success: boolean; msg?: string }>;
}
