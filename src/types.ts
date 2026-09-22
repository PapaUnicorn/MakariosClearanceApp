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
  // Google Classroom Official Statuses
  | 'ASSIGNED'        // Ditugaskan (belum diserahkan, batas waktu belum lewat/tanpa deadline)
  | 'MISSING'         // Tidak Ada (belum diserahkan, batas waktu sudah terlewati)
  | 'TURNED_IN'       // Diserahkan (sudah diserahkan tepat waktu, belum dinilai)
  | 'TURNED_IN_LATE'  // Diserahkan Terlambat (diserahkan melewati batas waktu, belum dinilai)
  | 'GRADED'          // Dinilai (sudah dinilai & dikembalikan guru)
  | 'RETURNED'        // Dikembalikan (dikembalikan guru tanpa nilai)
  | 'RECLAIMED'       // Ditarik Kembali (unsubmitted oleh siswa)
  // Legacy / fallback compatibility
  | 'NOT_SUBMITTED'
  | 'WAITING_GRADE'
  | 'COMPLETED';

export interface TaskStatusInfo {
  code: TaskStatusType;
  label: string; // Nama status resmi Google Classroom (Bahasa Indonesia)
  enLabel: string;
  badgeClass: string;
  dotColor: string;
  isClear: boolean; // Selesai / clear
  isPendingTeacher: boolean; // Menunggu aksi guru (grading)
  isMissingOrAssigned: boolean; // Belum diserahkan oleh siswa
}

export function getTaskStatusInfo(status: TaskStatusType, assignedGrade?: number, maxPoints?: number): TaskStatusInfo {
  switch (status) {
    case 'GRADED':
      return {
        code: 'GRADED',
        label: assignedGrade !== undefined ? `Dinilai (${assignedGrade}/${maxPoints || 100})` : 'Dinilai',
        enLabel: 'Graded',
        badgeClass: 'bg-emerald-100 text-emerald-800 border-emerald-300',
        dotColor: 'bg-emerald-500',
        isClear: true,
        isPendingTeacher: false,
        isMissingOrAssigned: false,
      };
    case 'RETURNED':
      return {
        code: 'RETURNED',
        label: 'Dikembalikan (Tanpa Nilai)',
        enLabel: 'Returned',
        badgeClass: 'bg-teal-100 text-teal-800 border-teal-300',
        dotColor: 'bg-teal-500',
        isClear: true,
        isPendingTeacher: false,
        isMissingOrAssigned: false,
      };
    case 'TURNED_IN_LATE':
      return {
        code: 'TURNED_IN_LATE',
        label: 'Diserahkan Terlambat',
        enLabel: 'Done late',
        badgeClass: 'bg-amber-100 text-amber-800 border-amber-300',
        dotColor: 'bg-amber-500',
        isClear: false,
        isPendingTeacher: true,
        isMissingOrAssigned: false,
      };
    case 'TURNED_IN':
    case 'WAITING_GRADE':
      return {
        code: 'TURNED_IN',
        label: 'Diserahkan',
        enLabel: 'Turned in',
        badgeClass: 'bg-blue-100 text-blue-800 border-blue-300',
        dotColor: 'bg-blue-500',
        isClear: false,
        isPendingTeacher: true,
        isMissingOrAssigned: false,
      };
    case 'MISSING':
      return {
        code: 'MISSING',
        label: 'Tidak Ada (Missing)',
        enLabel: 'Missing',
        badgeClass: 'bg-rose-100 text-rose-800 border-rose-300',
        dotColor: 'bg-rose-500',
        isClear: false,
        isPendingTeacher: false,
        isMissingOrAssigned: true,
      };
    case 'RECLAIMED':
      return {
        code: 'RECLAIMED',
        label: 'Ditarik Kembali (Unsubmitted)',
        enLabel: 'Unsubmitted',
        badgeClass: 'bg-purple-100 text-purple-800 border-purple-300',
        dotColor: 'bg-purple-500',
        isClear: false,
        isPendingTeacher: false,
        isMissingOrAssigned: true,
      };
    case 'ASSIGNED':
    case 'NOT_SUBMITTED':
    default:
      return {
        code: 'ASSIGNED',
        label: 'Ditugaskan',
        enLabel: 'Assigned',
        badgeClass: 'bg-slate-100 text-slate-700 border-slate-300',
        dotColor: 'bg-slate-400',
        isClear: false,
        isPendingTeacher: false,
        isMissingOrAssigned: true,
      };
  }
}

export interface StudentTaskItem {
  courseWorkId: string;
  title: string;
  courseId: string;
  courseName: string;
  section?: string;
  alternateLink?: string;
  dueDateStr?: string;
  dueYear?: number;
  dueMonth?: number; // 1-12
  dueDay?: number;
  creationTime?: string;
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

export interface FlattenedTeacherTaskRow {
  rowId: string;
  teacherId: string;
  teacherName: string;
  teacherEmail: string;
  teacherPhoto?: string;
  className: string;
  courseId: string;
  courseName: string;
  courseLink?: string;
  courseWorkId: string;
  courseWorkTitle: string;
  courseWorkLink?: string;
  dueDateStr?: string;
  ungradedCount: number;
  ungradedStudents: {
    studentId: string;
    studentName: string;
    studentEmail: string;
    submissionLink?: string;
  }[];
  isClear: boolean;
  parentRecord: TeacherSummaryRecord;
}

export interface SyncProgressState {
  isSyncing: boolean;
  totalCourses: number;
  currentCourseIndex: number;
  currentCourseName: string;
  stepMessage: string;
  error?: string;
}

// ==========================================
// A. CURRICULUM AUDIT & READINESS TYPES
// ==========================================
export interface CurriculumAuditCourse {
  courseId: string;
  courseName: string;
  className: string;
  courseLink?: string;
  teacherNames: string[];
  teacherEmails: string[];
  creationTime?: string;
  totalTasks: number;
  totalMaterials: number;
  totalTopics: number;
  topicNames: string[];
  lastActivityTime?: string;
  daysSinceLastActivity: number; // e.g. 2 days ago, 15 days ago
  activityStatus: 'ACTIVE' | 'WARNING' | 'DORMANT'; // <7 days, 7-14 days, >14 days
  hasSyllabusOrRpp: boolean;
  syllabusMatchDetail?: string; // Topic or material title that matched (e.g. "Modul Ajar Bab 1", "Silabus 2025/2026")
  enrollmentStudentCount: number;
  readinessScore: number; // 0-100% score based on RPP presence, activity in last 7 days, coursework created
  readinessStatus: 'SIAP' | 'PERLU_PERHATIAN' | 'BELUM_LENGKAP';
}

export interface ExpectedScheduleSubject {
  id: string;
  subjectName: string;
  targetClasses: string[]; // e.g. ["7A", "7B", "8A", "8B", "9A", "9B"]
}

export interface ScheduleComplianceCheckResult {
  subjectName: string;
  className: string;
  isCreatedInClassroom: boolean;
  matchedCourseId?: string;
  matchedCourseName?: string;
  teacherName?: string;
}

// ==========================================
// B. ACADEMIC PROGRESS & GRADEBOOK TYPES
// ==========================================
export interface CourseStudentGradeDetail {
  courseId: string;
  courseName: string;
  averageScore: number; // 0-100 scale
  totalTasks: number;
  gradedTasks: number;
  missingTasks: number;
  lateTasks: number;
  unsubmittedTasks: number;
}

export interface AggregatedStudentGradebook {
  studentId: string;
  studentName: string;
  studentEmail: string;
  studentPhoto?: string;
  className: string;
  courseGrades: Record<string, CourseStudentGradeDetail>;
  overallGPA: number; // 0-100 average of all graded subjects
  letterGrade: 'A' | 'B' | 'C' | 'D' | 'E';
  totalAssignedTasks: number;
  totalCompletedTasks: number;
  totalMissingTasks: number;
  totalLateTasks: number;
  riskLevel: 'HIGH_RISK' | 'MEDIUM_RISK' | 'SAFE'; // Early warning status
  riskReasons: string[];
}

export interface AssessmentWeightSummary {
  category: 'FORMATIF_HARIAN' | 'KUIS_ULANGAN' | 'SUMATIF_UJIAN' | 'PRAKTIK_PROYEK' | 'LAINNYA';
  label: string;
  count: number;
  percentage: number;
  averageMaxPoints: number;
}

// ==========================================
// C. TEACHER WORKLOAD & ENGAGEMENT TYPES
// ==========================================
export interface TeacherWorkloadMetric {
  teacherId: string;
  teacherName: string;
  teacherEmail: string;
  teacherPhoto?: string;
  coursesCount: number;
  coursesList: { courseId: string; courseName: string; className: string }[];
  totalStudentsTaught: number;
  totalTasksGiven: number;
  totalMaterialsUploaded: number;
  totalSubmissionsReceived: number;
  totalSubmissionsGraded: number;
  totalUngradedPending: number;
  averageGradingTurnaroundDays: number; // Rata-rata hari SLA pengembalian nilai
  slaStatus: 'EXCELLENT' | 'STANDARD' | 'OVERDUE'; // <3 days, 3-7 days, >7 days
  pedagogicalRatio: number; // Materials vs Assignments (e.g. 1.2 or 0.4)
  pedagogicalStatus: 'BALANCED' | 'ASSIGNMENT_HEAVY' | 'MATERIAL_HEAVY';
  lastActivityDate?: string;
  daysSinceLastPost: number;
}

