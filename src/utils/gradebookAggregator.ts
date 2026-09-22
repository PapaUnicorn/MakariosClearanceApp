import {
  AggregatedStudentGradebook,
  AssessmentWeightSummary,
  CourseStudentGradeDetail,
  StudentClearanceRecord,
  StudentTaskItem,
} from '../types';

/**
 * Builds cross-course aggregated gradebook records for all students
 */
export function buildAggregatedGradebook(
  records: StudentClearanceRecord[]
): {
  students: AggregatedStudentGradebook[];
  allSubjectNames: string[];
} {
  const studentMap = new Map<
    string,
    {
      studentId: string;
      studentName: string;
      studentEmail: string;
      studentPhoto?: string;
      className: string;
      courseGrades: Record<string, CourseStudentGradeDetail>;
      totalAssignedTasks: number;
      totalCompletedTasks: number;
      totalMissingTasks: number;
      totalLateTasks: number;
      totalUnsubmittedTasks: number;
      sumScores: number;
      gradedSubjectCount: number;
    }
  >();

  const subjectNameSet = new Set<string>();

  records.forEach((record) => {
    subjectNameSet.add(record.courseName);

    if (!studentMap.has(record.studentId)) {
      studentMap.set(record.studentId, {
        studentId: record.studentId,
        studentName: record.studentName,
        studentEmail: record.studentEmail,
        studentPhoto: record.studentPhoto,
        className: record.className,
        courseGrades: {},
        totalAssignedTasks: 0,
        totalCompletedTasks: 0,
        totalMissingTasks: 0,
        totalLateTasks: 0,
        totalUnsubmittedTasks: 0,
        sumScores: 0,
        gradedSubjectCount: 0,
      });
    }

    const s = studentMap.get(record.studentId)!;

    // Calculate average score for this specific course
    let courseScore = 0;
    const gradedTasks = record.allTasks.filter((t) => t.status === 'GRADED');
    let gradedScoreSum = 0;
    let gradedMaxSum = 0;

    gradedTasks.forEach((t) => {
      if (t.assignedGrade !== undefined && t.maxPoints && t.maxPoints > 0) {
        gradedScoreSum += (t.assignedGrade / t.maxPoints) * 100;
        gradedMaxSum += 1;
      } else if (t.assignedGrade !== undefined) {
        gradedScoreSum += t.assignedGrade;
        gradedMaxSum += 1;
      }
    });

    if (gradedMaxSum > 0) {
      courseScore = Math.round((gradedScoreSum / gradedMaxSum) * 10) / 10;
    } else if (record.overallScore !== undefined) {
      courseScore = record.overallScore;
    }

    const missingCount = record.allTasks.filter((t) => t.status === 'MISSING').length;
    const lateCount = record.allTasks.filter((t) => t.status === 'TURNED_IN_LATE' || t.late).length;
    const unsubmittedCount = record.pendingUnsubmittedTasks.length;

    s.courseGrades[record.courseName] = {
      courseId: record.courseId,
      courseName: record.courseName,
      averageScore: courseScore,
      totalTasks: record.totalTasks,
      gradedTasks: gradedTasks.length,
      missingTasks: missingCount,
      lateTasks: lateCount,
      unsubmittedTasks: unsubmittedCount,
    };

    s.totalAssignedTasks += record.totalTasks;
    s.totalCompletedTasks += record.completedTasks;
    s.totalMissingTasks += missingCount;
    s.totalLateTasks += lateCount;
    s.totalUnsubmittedTasks += unsubmittedCount;

    if (courseScore > 0 || gradedTasks.length > 0) {
      s.sumScores += courseScore;
      s.gradedSubjectCount += 1;
    }
  });

  const students: AggregatedStudentGradebook[] = [];

  studentMap.forEach((s) => {
    const overallGPA =
      s.gradedSubjectCount > 0 ? Math.round((s.sumScores / s.gradedSubjectCount) * 10) / 10 : 80;

    // Determine Letter Grade
    let letterGrade: 'A' | 'B' | 'C' | 'D' | 'E' = 'B';
    if (overallGPA >= 90) letterGrade = 'A';
    else if (overallGPA >= 80) letterGrade = 'B';
    else if (overallGPA >= 70) letterGrade = 'C';
    else if (overallGPA >= 60) letterGrade = 'D';
    else letterGrade = 'E';

    // Determine Early Warning Risk Level
    const riskReasons: string[] = [];
    if (s.totalMissingTasks >= 4) {
      riskReasons.push(`${s.totalMissingTasks} tugas berstatus MISSING (terlewat tenggat)`);
    }
    if (s.totalLateTasks >= 5) {
      riskReasons.push(`${s.totalLateTasks} tugas diserahkan terlambat`);
    }
    if (overallGPA < 70) {
      riskReasons.push(`Nilai rata-rata ${overallGPA} di bawah standar KKM (75)`);
    }
    if (s.totalUnsubmittedTasks >= 6) {
      riskReasons.push(`${s.totalUnsubmittedTasks} tugas belum dikumpulkan sama sekali`);
    }

    let riskLevel: 'HIGH_RISK' | 'MEDIUM_RISK' | 'SAFE' = 'SAFE';
    if (s.totalMissingTasks >= 4 || overallGPA < 65 || s.totalUnsubmittedTasks >= 6) {
      riskLevel = 'HIGH_RISK';
    } else if (s.totalMissingTasks >= 2 || s.totalLateTasks >= 3 || overallGPA < 75 || s.totalUnsubmittedTasks >= 3) {
      riskLevel = 'MEDIUM_RISK';
    }

    students.push({
      studentId: s.studentId,
      studentName: s.studentName,
      studentEmail: s.studentEmail,
      studentPhoto: s.studentPhoto,
      className: s.className,
      courseGrades: s.courseGrades,
      overallGPA,
      letterGrade,
      totalAssignedTasks: s.totalAssignedTasks,
      totalCompletedTasks: s.totalCompletedTasks,
      totalMissingTasks: s.totalMissingTasks,
      totalLateTasks: s.totalLateTasks,
      riskLevel,
      riskReasons: riskReasons.length > 0 ? riskReasons : ['Semua tugas dan nilai terpantau lancar dan aman.'],
    });
  });

  const sortedStudents = students.sort((a, b) => {
    // Sort highest risk first, then by class, then by name
    const riskWeight = { HIGH_RISK: 3, MEDIUM_RISK: 2, SAFE: 1 };
    if (riskWeight[b.riskLevel] !== riskWeight[a.riskLevel]) {
      return riskWeight[b.riskLevel] - riskWeight[a.riskLevel];
    }
    const clsCmp = a.className.localeCompare(b.className);
    if (clsCmp !== 0) return clsCmp;
    return a.studentName.localeCompare(b.studentName);
  });

  return {
    students: sortedStudents,
    allSubjectNames: Array.from(subjectNameSet).sort(),
  };
}

/**
 * Categorizes coursework to analyze assessment balance and weight distribution
 */
export function calculateAssessmentWeightDistribution(
  records: StudentClearanceRecord[]
): AssessmentWeightSummary[] {
  // Collect unique tasks across courses
  const taskMap = new Map<string, StudentTaskItem>();

  records.forEach((r) => {
    r.allTasks.forEach((t) => {
      if (!taskMap.has(t.courseWorkId)) {
        taskMap.set(t.courseWorkId, t);
      }
    });
  });

  const tasks = Array.from(taskMap.values());
  const total = tasks.length;
  if (total === 0) return [];

  const counts: Record<AssessmentWeightSummary['category'], { count: number; totalMaxPoints: number }> = {
    FORMATIF_HARIAN: { count: 0, totalMaxPoints: 0 },
    KUIS_ULANGAN: { count: 0, totalMaxPoints: 0 },
    SUMATIF_UJIAN: { count: 0, totalMaxPoints: 0 },
    PRAKTIK_PROYEK: { count: 0, totalMaxPoints: 0 },
    LAINNYA: { count: 0, totalMaxPoints: 0 },
  };

  tasks.forEach((t) => {
    const title = t.title.toLowerCase();
    const maxP = t.maxPoints || 100;

    if (
      title.includes('sumatif') ||
      title.includes('pts') ||
      title.includes('pas') ||
      title.includes('pat') ||
      title.includes('uas') ||
      title.includes('uts') ||
      title.includes('ujian')
    ) {
      counts.SUMATIF_UJIAN.count += 1;
      counts.SUMATIF_UJIAN.totalMaxPoints += maxP;
    } else if (
      title.includes('kuis') ||
      title.includes('quiz') ||
      title.includes('ulangan harian') ||
      title.includes('uh')
    ) {
      counts.KUIS_ULANGAN.count += 1;
      counts.KUIS_ULANGAN.totalMaxPoints += maxP;
    } else if (
      title.includes('proyek') ||
      title.includes('project') ||
      title.includes('praktik') ||
      title.includes('praktikum') ||
      title.includes('portofolio') ||
      title.includes('presentasi') ||
      title.includes('video')
    ) {
      counts.PRAKTIK_PROYEK.count += 1;
      counts.PRAKTIK_PROYEK.totalMaxPoints += maxP;
    } else if (
      title.includes('tugas') ||
      title.includes('latihan') ||
      title.includes('lkpd') ||
      title.includes('pr') ||
      title.includes('formatif')
    ) {
      counts.FORMATIF_HARIAN.count += 1;
      counts.FORMATIF_HARIAN.totalMaxPoints += maxP;
    } else {
      counts.LAINNYA.count += 1;
      counts.LAINNYA.totalMaxPoints += maxP;
    }
  });

  const categories: { category: AssessmentWeightSummary['category']; label: string }[] = [
    { category: 'FORMATIF_HARIAN', label: 'Tugas Harian / Formatif / LKPD' },
    { category: 'KUIS_ULANGAN', label: 'Kuis & Ulangan Harian (UH)' },
    { category: 'SUMATIF_UJIAN', label: 'Sumatif / PTS / PAS / Ujian' },
    { category: 'PRAKTIK_PROYEK', label: 'Praktik, Proyek & Portofolio' },
    { category: 'LAINNYA', label: 'Aktivitas / Penugasan Lainnya' },
  ];

  return categories.map((cat) => {
    const item = counts[cat.category];
    const percentage = total > 0 ? Math.round((item.count / total) * 100) : 0;
    const averageMaxPoints = item.count > 0 ? Math.round(item.totalMaxPoints / item.count) : 100;

    return {
      category: cat.category,
      label: cat.label,
      count: item.count,
      percentage,
      averageMaxPoints,
    };
  });
}

/**
 * Exports gradebook table matrix to CSV
 */
export function exportGradebookToCSV(students: AggregatedStudentGradebook[], subjects: string[]): void {
  const headers = ['No', 'Nama Siswa', 'Email', 'Kelas', ...subjects, 'Rata-rata Nilai (GPA)', 'Predikat', 'Status Risiko', 'Alasan Peringatan'];

  const rows = students.map((s, idx) => {
    const subjectScores = subjects.map((subj) => {
      const g = s.courseGrades[subj];
      return g && g.averageScore > 0 ? g.averageScore.toString() : '-';
    });

    return [
      (idx + 1).toString(),
      `"${s.studentName.replace(/"/g, '""')}"`,
      `"${s.studentEmail}"`,
      `"${s.className}"`,
      ...subjectScores,
      s.overallGPA.toString(),
      s.letterGrade,
      s.riskLevel === 'HIGH_RISK' ? 'RISIKO TINGGI' : s.riskLevel === 'MEDIUM_RISK' ? 'RISIKO SEDANG' : 'AMAN',
      `"${s.riskReasons.join('; ').replace(/"/g, '""')}"`,
    ];
  });

  const csvContent = '\uFEFF' + [headers.join(','), ...rows.map((r) => r.join(','))].join('\r\n');
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', `Rekap_Nilai_Lintas_Kelas_${new Date().toISOString().slice(0, 10)}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
