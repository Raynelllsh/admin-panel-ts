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
    newLesson: { courseId: string; lessonId: string; dateStr: string; timeSlot: string }
  ) => Promise<{ success: boolean; msg?: string }>;
}
