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

export interface AdminDataHook {
  allCourses: Course[];
  setAllCourses: React.Dispatch<React.SetStateAction<Course[]>>;
  allStudents: Student[];
  setAllStudents: React.Dispatch<React.SetStateAction<Student[]>>;
  loading: boolean;
  availableCategories: string[];
  availableRounds: string[];

  // Must return Promise<string> to satisfy TimetableTab
  createCourse: (
    name: string,
    time: string,
    date: string,
    roundNum: string
  ) => Promise<string>;

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

  // Must have 3 arguments to match useAdminData implementation
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
    newLesson: {
      courseId: string;
      lessonId: string;
      dateStr: string;
      timeSlot: string;
    }
  ) => Promise<{ success: boolean; msg?: string }>;
}

export interface Lesson {
  name: string;
  dateTime: string;
}

export interface FormDataType {
  type?: "receipt" | "course_plan";
  receiptNo?: string;
  studentName: string;
  studentCode: string;
  gender: string;
  parentContact: string;
  issueDate: string;
  courseCode: string;
  lessons: Lesson[];
  paymentMethod: string;
  paymentDate: string;
}

export interface Tab {
  id: string;
  title: string;
}

export interface ReceiptTab extends Tab {
  data: FormDataType;
  savedFileId?: string;
  zoom: number;
  scrollTop: number;
}

export interface SavedFile {
  id: string;
  title: string;
  lastModified: number;
  data: FormDataType;
}

export const DEFAULT_LESSONS = Array(12).fill({ name: "", dateTime: "" });

export const NEW_RECEIPT_TEMPLATE: FormDataType = {
  type: "receipt",
  receiptNo: "",
  studentName: "",
  studentCode: "",
  gender: "",
  parentContact: "",
  issueDate: new Date().toISOString().split("T")[0],
  courseCode: "",
  lessons: DEFAULT_LESSONS,
  paymentMethod: "",
  paymentDate: "",
};

export const NEW_COURSE_PLAN_TEMPLATE: FormDataType = {
  type: "course_plan",
  studentName: "",
  studentCode: "",
  gender: "",
  parentContact: "",
  issueDate: new Date().toISOString().split("T")[0],
  courseCode: "",
  lessons: DEFAULT_LESSONS,
  paymentMethod: "",
  paymentDate: "",
};
