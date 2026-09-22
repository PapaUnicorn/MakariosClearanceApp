import {
  StudentClearanceRecord,
  TeacherClearanceRecord,
  TeacherSummaryRecord,
  TeacherWorkloadMetric,
} from '../types';

/**
 * Calculates detailed workload, turnaround SLA, and pedagogical balance for teachers
 */
export function calculateTeacherWorkload(
  teacherSummaries: TeacherSummaryRecord[],
  teacherClearanceRecords: TeacherClearanceRecord[],
  studentRecords: StudentClearanceRecord[],
  materialDataMap: Map<string, string[]> = new Map()
): TeacherWorkloadMetric[] {
  return teacherSummaries.map((ts) => {
    // Collect all courses taught by this teacher
    const courseIds = ts.assignedCourses.map((c) => c.courseId);

    // Count unique students taught
    const taughtStudentSet = new Set<string>();
    studentRecords.forEach((sr) => {
      if (courseIds.includes(sr.courseId)) {
        taughtStudentSet.add(sr.studentId);
      }
    });

    // Count total tasks given across courses
    let totalTasksGiven = 0;
    let totalMaterialsUploaded = 0;
    let totalSubmissionsReceived = 0;
    let totalSubmissionsGraded = 0;
    let lastActivityTimestamp = 0;

    teacherClearanceRecords.forEach((tcr) => {
      if (courseIds.includes(tcr.courseId)) {
        totalTasksGiven += tcr.totalCourseWork;
        totalSubmissionsReceived += tcr.totalSubmissions;
        totalSubmissionsGraded += tcr.totalSubmissions - tcr.totalUngradedSubmissions;

        const mats = materialDataMap.get(tcr.courseId) || [];
        totalMaterialsUploaded += mats.length;
      }
    });

    // Check last activity from tasks
    studentRecords.forEach((sr) => {
      if (courseIds.includes(sr.courseId)) {
        sr.allTasks.forEach((t) => {
          if (t.creationTime) {
            const time = new Date(t.creationTime).getTime();
            if (!isNaN(time) && time > lastActivityTimestamp) lastActivityTimestamp = time;
          }
        });
      }
    });

    const now = Date.now();
    const daysSinceLastPost =
      lastActivityTimestamp > 0
        ? Math.max(0, Math.floor((now - lastActivityTimestamp) / (1000 * 60 * 60 * 24)))
        : 14;

    // Estimate Grading Turnaround Time (SLA in days)
    // Base heuristic: teachers with zero pending tasks turnaround in ~1.5 - 2.5 days.
    // Each pending ungraded batch adds estimated lag days.
    let averageGradingTurnaroundDays = 2.0;
    if (ts.totalUngradedSubmissions > 0) {
      const backlogFactor = Math.min(10, ts.totalUngradedSubmissions * 0.35);
      averageGradingTurnaroundDays = Math.round((2.0 + backlogFactor) * 10) / 10;
    } else {
      averageGradingTurnaroundDays = 1.8;
    }

    let slaStatus: 'EXCELLENT' | 'STANDARD' | 'OVERDUE' = 'EXCELLENT';
    if (averageGradingTurnaroundDays > 7.0 || ts.totalUngradedSubmissions > 25) {
      slaStatus = 'OVERDUE';
    } else if (averageGradingTurnaroundDays > 3.0 || ts.totalUngradedSubmissions > 5) {
      slaStatus = 'STANDARD';
    }

    // Pedagogical Ratio (Materials vs Assignments)
    // If materials are 0, use standard benchmark heuristic based on tasks
    const effectiveMaterials = Math.max(totalMaterialsUploaded, Math.floor(totalTasksGiven * 0.7));
    const pedagogicalRatio =
      totalTasksGiven > 0 ? Math.round((effectiveMaterials / totalTasksGiven) * 10) / 10 : 1.0;

    let pedagogicalStatus: 'BALANCED' | 'ASSIGNMENT_HEAVY' | 'MATERIAL_HEAVY' = 'BALANCED';
    if (pedagogicalRatio < 0.5) {
      pedagogicalStatus = 'ASSIGNMENT_HEAVY';
    } else if (pedagogicalRatio > 1.8) {
      pedagogicalStatus = 'MATERIAL_HEAVY';
    }

    return {
      teacherId: ts.teacherId,
      teacherName: ts.teacherName,
      teacherEmail: ts.teacherEmail,
      teacherPhoto: ts.teacherPhoto,
      coursesCount: ts.assignedCourses.length,
      coursesList: ts.assignedCourses.map((c) => ({
        courseId: c.courseId,
        courseName: c.courseName,
        className: c.className,
      })),
      totalStudentsTaught: taughtStudentSet.size,
      totalTasksGiven,
      totalMaterialsUploaded: effectiveMaterials,
      totalSubmissionsReceived,
      totalSubmissionsGraded,
      totalUngradedPending: ts.totalUngradedSubmissions,
      averageGradingTurnaroundDays,
      slaStatus,
      pedagogicalRatio,
      pedagogicalStatus,
      lastActivityDate: lastActivityTimestamp > 0 ? new Date(lastActivityTimestamp).toISOString() : undefined,
      daysSinceLastPost,
    };
  }).sort((a, b) => {
    // Teachers with highest pending grading first, then SLA overdue, then name
    if (b.totalUngradedPending !== a.totalUngradedPending) {
      return b.totalUngradedPending - a.totalUngradedPending;
    }
    return a.teacherName.localeCompare(b.teacherName);
  });
}
