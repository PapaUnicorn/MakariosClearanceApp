import {
  ClassroomCourse,
  CurriculumAuditCourse,
  ScheduleComplianceCheckResult,
  StudentClearanceRecord,
  TeacherClearanceRecord,
} from '../types';

export const SYLLABUS_KEYWORDS = [
  'modul ajar',
  'rpp',
  'silabus',
  'syllabus',
  'capaian pembelajaran',
  'atp',
  'perangkat ajar',
  'kurikulum',
  'prosem',
  'prota',
  'kontrak belajar',
  'rencana pembelajaran',
  'materi pokok',
  'kisi-kisi',
];

export const DEFAULT_STANDARD_SUBJECTS = [
  'Matematika',
  'Bahasa Indonesia',
  'Bahasa Inggris',
  'Ilmu Pengetahuan Alam (IPA)',
  'Ilmu Pengetahuan Sosial (IPS)',
  'Pendidikan Agama & Budi Pekerti',
  'Pendidikan Pancasila (PPKn)',
  'PJOK (Penjas)',
  'Seni Budaya',
  'Informatika / Prakarya',
  'Bimbingan Konseling (BK)',
];

export const DEFAULT_STANDARD_CLASSES = ['7A', '7B', '8A', '8B', '9A', '9B', 'X-1', 'XI-IPA', 'XII-IPA'];

/**
 * Detects whether a course contains Modul Ajar, RPP, or Syllabus based on topic names, materials, and titles
 */
export function detectRppOrSyllabus(
  courseName: string,
  topics: string[] = [],
  courseworkTitles: string[] = [],
  materialTitles: string[] = []
): { hasSyllabus: boolean; matchedKeyword?: string; matchedTitle?: string } {
  // Check topics first
  for (const topic of topics) {
    const lower = topic.toLowerCase();
    for (const kw of SYLLABUS_KEYWORDS) {
      if (lower.includes(kw)) {
        return {
          hasSyllabus: true,
          matchedKeyword: kw.toUpperCase(),
          matchedTitle: `Topik: "${topic}"`,
        };
      }
    }
  }

  // Check material titles
  for (const mat of materialTitles) {
    const lower = mat.toLowerCase();
    for (const kw of SYLLABUS_KEYWORDS) {
      if (lower.includes(kw)) {
        return {
          hasSyllabus: true,
          matchedKeyword: kw.toUpperCase(),
          matchedTitle: `Materi: "${mat}"`,
        };
      }
    }
  }

  // Check coursework titles
  for (const cw of courseworkTitles) {
    const lower = cw.toLowerCase();
    for (const kw of SYLLABUS_KEYWORDS) {
      if (lower.includes(kw)) {
        return {
          hasSyllabus: true,
          matchedKeyword: kw.toUpperCase(),
          matchedTitle: `Postingan: "${cw}"`,
        };
      }
    }
  }

  return { hasSyllabus: false };
}

/**
 * Calculates days since last activity and classifies into ACTIVE, WARNING, DORMANT
 */
export function calculateActivityStatus(lastActivityTime?: string): {
  daysSinceLastActivity: number;
  activityStatus: 'ACTIVE' | 'WARNING' | 'DORMANT';
} {
  if (!lastActivityTime) {
    return { daysSinceLastActivity: 999, activityStatus: 'DORMANT' };
  }

  const actDate = new Date(lastActivityTime);
  if (isNaN(actDate.getTime())) {
    return { daysSinceLastActivity: 999, activityStatus: 'DORMANT' };
  }

  const diffMs = Date.now() - actDate.getTime();
  const days = Math.max(0, Math.floor(diffMs / (1000 * 60 * 60 * 24)));

  if (days <= 7) {
    return { daysSinceLastActivity: days, activityStatus: 'ACTIVE' };
  } else if (days <= 14) {
    return { daysSinceLastActivity: days, activityStatus: 'WARNING' };
  } else {
    return { daysSinceLastActivity: days, activityStatus: 'DORMANT' };
  }
}

/**
 * Compares official standard schedule / subject roster with active Classroom courses
 */
export function checkScheduleCompliance(
  activeCourses: ClassroomCourse[],
  expectedSubjects: string[] = DEFAULT_STANDARD_SUBJECTS,
  expectedClasses: string[] = DEFAULT_STANDARD_CLASSES
): {
  results: ScheduleComplianceCheckResult[];
  compliancePercentage: number;
  totalExpected: number;
  totalCreated: number;
  missingCount: number;
} {
  const results: ScheduleComplianceCheckResult[] = [];

  expectedClasses.forEach((className) => {
    expectedSubjects.forEach((subjectName) => {
      // Find matching active course
      const matched = activeCourses.find((c) => {
        const cName = (c.name || '').toLowerCase();
        const cSection = (c.section || c.room || '').toLowerCase();
        const sName = subjectName.toLowerCase();
        const clsLower = className.toLowerCase();

        const matchClass =
          cSection.includes(clsLower) || cName.includes(clsLower) || cName.includes(`kelas ${clsLower}`);

        // Fuzzy match subject name or keyword (e.g. Matematika -> mtk / matematika)
        const matchSubject =
          cName.includes(sName) ||
          (sName.includes('ipa') && (cName.includes('ipa') || cName.includes('sains') || cName.includes('biologi') || cName.includes('fisika'))) ||
          (sName.includes('ips') && (cName.includes('ips') || cName.includes('sosial') || cName.includes('sejarah') || cName.includes('geografi'))) ||
          (sName.includes('agama') && (cName.includes('agama') || cName.includes('pak') || cName.includes('kristen'))) ||
          (sName.includes('penjas') && (cName.includes('pjok') || cName.includes('penjas') || cName.includes('olahraga'))) ||
          (sName.includes('pancasila') && (cName.includes('ppkn') || cName.includes('pkn') || cName.includes('pancasila')));

        return matchClass && matchSubject;
      });

      results.push({
        subjectName,
        className,
        isCreatedInClassroom: !!matched,
        matchedCourseId: matched?.id,
        matchedCourseName: matched?.name,
      });
    });
  });

  const totalExpected = results.length;
  const totalCreated = results.filter((r) => r.isCreatedInClassroom).length;
  const missingCount = totalExpected - totalCreated;
  const compliancePercentage = totalExpected > 0 ? Math.round((totalCreated / totalExpected) * 100) : 100;

  return {
    results,
    compliancePercentage,
    totalExpected,
    totalCreated,
    missingCount,
  };
}

/**
 * Builds CurriculumAuditCourse records from student/teacher records and courses
 */
export function buildCurriculumAuditCourses(
  courses: ClassroomCourse[],
  teacherRecords: TeacherClearanceRecord[],
  studentRecords: StudentClearanceRecord[],
  topicDataMap: Map<string, string[]> = new Map(),
  materialDataMap: Map<string, string[]> = new Map()
): CurriculumAuditCourse[] {
  return courses.map((course) => {
    const courseDisplayName = course.name || 'Kelas Tanpa Nama';
    const sectionName = course.section || course.room || 'Reguler';

    // Find teacher record
    const tr = teacherRecords.find((t) => t.courseId === course.id);
    const teacherNames = tr ? tr.teachers.map((t) => t.name) : ['Belum Ditugaskan'];
    const teacherEmails = tr ? tr.teachers.map((t) => t.email) : [];

    // Find students enrolled in this course
    const enrolledStudents = studentRecords.filter((s) => s.courseId === course.id);
    const enrollmentStudentCount = enrolledStudents.length;

    // Collect all task titles and latest activity
    const courseTasks = enrolledStudents.length > 0 ? enrolledStudents[0].allTasks : [];
    const taskTitles = courseTasks.map((t) => t.title);

    // Retrieve topics and materials
    const topics = topicDataMap.get(course.id) || [];
    const materials = materialDataMap.get(course.id) || [];

    // Find latest activity time among tasks, materials, or course creation
    let latestTimestamp = course.creationTime ? new Date(course.creationTime).getTime() : 0;
    courseTasks.forEach((t) => {
      if (t.creationTime) {
        const time = new Date(t.creationTime).getTime();
        if (!isNaN(time) && time > latestTimestamp) latestTimestamp = time;
      }
    });

    const lastActivityTime = latestTimestamp > 0 ? new Date(latestTimestamp).toISOString() : undefined;
    const { daysSinceLastActivity, activityStatus } = calculateActivityStatus(lastActivityTime);

    // Check syllabus / RPP presence
    const syllabusDetection = detectRppOrSyllabus(courseDisplayName, topics, taskTitles, materials);

    // Calculate readiness score
    let score = 0;
    if (syllabusDetection.hasSyllabus) score += 40;
    if (courseTasks.length >= 1) score += 30;
    if (activityStatus === 'ACTIVE') score += 30;
    else if (activityStatus === 'WARNING') score += 15;

    let readinessStatus: 'SIAP' | 'PERLU_PERHATIAN' | 'BELUM_LENGKAP' = 'SIAP';
    if (score < 40 || !syllabusDetection.hasSyllabus) {
      readinessStatus = 'BELUM_LENGKAP';
    } else if (score < 70 || activityStatus === 'DORMANT') {
      readinessStatus = 'PERLU_PERHATIAN';
    }

    return {
      courseId: course.id,
      courseName: courseDisplayName,
      className: sectionName,
      courseLink: course.alternateLink,
      teacherNames,
      teacherEmails,
      creationTime: course.creationTime,
      totalTasks: courseTasks.length,
      totalMaterials: materials.length,
      totalTopics: topics.length,
      topicNames: topics,
      lastActivityTime,
      daysSinceLastActivity,
      activityStatus,
      hasSyllabusOrRpp: syllabusDetection.hasSyllabus,
      syllabusMatchDetail: syllabusDetection.matchedTitle,
      enrollmentStudentCount,
      readinessScore: score,
      readinessStatus,
    };
  });
}
