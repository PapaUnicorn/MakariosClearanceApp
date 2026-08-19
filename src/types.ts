export interface GoogleUserProfile {
  id: string;
  name: {
    fullName?: string;
    givenName?: string;
    familyName?: string;
  };
  emailAddress?: string;
  photoUrl?: string;
}

export interface ClassroomCourse {
  id: string;
  name: string;
  section?: string;
  descriptionHeading?: string;
  room?: string;
  alternateLink?: string;
  courseState?: string;
  teacherGroupEmail?: string;
  courseGroupEmail?: string;
  creationTime?: string;
}

export interface ClassroomTeacher {
  courseId: string;
  userId: string;
  profile: GoogleUserProfile;
}

export interface ClassroomStudent {
  courseId: string;
  userId: string;
  profile: GoogleUserProfile;
}

export interface ClassroomCourseWork {
  id: string;
  courseId: string;
  title: string;
  description?: string;
  state?: string;
  alternateLink?: string;
  creationTime?: string;
  updateTime?: string;
  dueDate?: {
    year: number;
    month: number;
    day: number;
  };
  dueTime?: {
    hours?: number;
    minutes?: number;
    seconds?: number;
  };
  maxPoints?: number;
  workType?: string;
}

export interface ClassroomSubmission {
  id: string;
  courseId: string;
  courseWorkId: string;
  userId: string;
  state: 'NEW' | 'CREATED' | 'TURNED_IN' | 'RETURNED' | 'RECLAIMED_BY_STUDENT' | string;
  late?: boolean;
  draftGrade?: number;
  assignedGrade?: number;
  alternateLink?: string;
  updateTime?: string;
}

export type TaskStatusType = 
  | 'NOT_SUBMITTED' // Belum dikumpulkan (NEW, CREATED, RECLAIMED_BY_STUDENT)
  | 'WAITING_GRADE' // Sudah dikumpulkan, belum dinilai/dikembalikan (TURNED_IN without assigned grade/returned)
  | 'GRADED'        // Sudah dinilai / dikembalikan guru (RETURNED / assignedGrade present)
  | 'COMPLETED';    // Selesai

export interface StudentTaskItem {
  courseWorkId: string;
  title: string;
  courseId: string;
  courseName: string;
  section?: string;
  alternateLink?: string;
  dueDateStr?: string;
  maxPoints?: number;
  status: TaskStatusType;
  submissionState: string;
  assignedGrade?: number;
  late?: boolean;
}

export interface StudentClearanceRecord {
  id: string;
  studentId: string;
  studentName: string;
  studentEmail: string;
  studentPhoto?: string;
  className: string; // Kelas / Section
  courseId: string;
  courseName: string; // Nama Mata Pelajaran
  courseLink?: string;
  totalTasks: number;
  completedTasks: number;
  pendingUnsubmittedTasks: StudentTaskItem[];
  pendingUngradedTasks: StudentTaskItem[];
  unfinishedTasks: StudentTaskItem[]; // Flat list of all unfinished tasks (not submitted + waiting grade)
  allTasks: StudentTaskItem[];
  overallScore?: number;
  overallScoreStr?: string;
  isClear: boolean;
  clearanceScore: number;
}

export interface TeacherUngradedTaskItem {
  courseId: string;
  courseName: string;
  className: string;
  courseWorkId: string;
  courseWorkTitle: string;
  courseWorkLink?: string;
  dueDateStr?: string;
  maxPoints?: number;
  ungradedCount: number;
  ungradedStudents: {
    studentId: string;
    studentName: string;
    studentEmail: string;
    submissionLink?: string;
  }[];
}

export interface TeacherClearanceRecord {
  id: string;
  courseId: string;
  courseName: string;
  className: string;
  courseLink?: string;
  teachers: {
    id: string;
    name: string;
    email: string;
    photo?: string;
  }[];
  totalCourseWork: number;
  totalSubmissions: number;
  totalTurnedIn: number;
  totalUngradedSubmissions: number;
  ungradedTasksBreakdown: {
    courseWorkId: string;
    courseWorkTitle: string;
    courseWorkLink?: string;
    dueDateStr?: string;
    maxPoints?: number;
    ungradedCount: number;
    ungradedStudents: {
      studentId: string;
      studentName: string;
      studentEmail: string;
      submissionLink?: string;
    }[];
  }[];
  isClear: boolean;
}

export interface TeacherSummaryRecord {
  teacherId: string;
  teacherName: string;
  teacherEmail: string;
  teacherPhoto?: string;
  assignedCourses: {
    courseId: string;
    courseName: string;
    className: string;
    courseLink?: string;
    totalTasks: number;
  }[];
  totalUngradedSubmissions: number;
  ungradedTasksList: TeacherUngradedTaskItem[];
  isClear: boolean;
}

export interface SyncProgressState {
  isSyncing: boolean;
  totalCourses: number;
  currentCourseIndex: number;
  currentCourseName: string;
  stepMessage: string;
  error?: string;
}
