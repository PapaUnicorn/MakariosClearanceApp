import * as XLSX from 'xlsx';
import { FlattenedTeacherTaskRow, TeacherSummaryRecord } from '../types';

export interface TeacherExportFilterOptions {
  singleTeacherName?: string;
  selectedTeachers?: string[];
  selectedClasses?: string[];
  selectedCourses?: string[];
  statusFilter?: string;
  searchTerm?: string;
}

/**
 * Export filtered teacher task rows directly to Microsoft Excel (.xlsx)
 * Exactly matching what is displayed in the filter results.
 */
export function exportFilteredTeacherTasksToXLSX(
  rows: FlattenedTeacherTaskRow[],
  filterOptions: TeacherExportFilterOptions = {}
): void {
  if (!rows || rows.length === 0) return;

  const now = new Date();
  const dateStr = now.toLocaleDateString('id-ID', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
  const timeStr = now.toLocaleTimeString('id-ID', {
    hour: '2-digit',
    minute: '2-digit',
  });

  const uniqueTeachers = Array.from(new Set(rows.map((r) => r.teacherName)));
  const isSingleTeacher =
    uniqueTeachers.length === 1 ||
    Boolean(filterOptions.singleTeacherName) ||
    (filterOptions.selectedTeachers && filterOptions.selectedTeachers.length === 1);

  const targetTeacherName =
    filterOptions.singleTeacherName ||
    (filterOptions.selectedTeachers && filterOptions.selectedTeachers.length === 1
      ? filterOptions.selectedTeachers[0]
      : uniqueTeachers[0]);

  // Construct active filter description
  const filterDescParts: string[] = [];
  if (filterOptions.selectedTeachers && filterOptions.selectedTeachers.length > 0) {
    filterDescParts.push(`Guru: ${filterOptions.selectedTeachers.join(', ')}`);
  }
  if (filterOptions.selectedClasses && filterOptions.selectedClasses.length > 0) {
    filterDescParts.push(`Kelas: ${filterOptions.selectedClasses.join(', ')}`);
  }
  if (filterOptions.selectedCourses && filterOptions.selectedCourses.length > 0) {
    filterDescParts.push(`Mapel: ${filterOptions.selectedCourses.join(', ')}`);
  }
  if (filterOptions.statusFilter && filterOptions.statusFilter !== 'ALL') {
    filterDescParts.push(`Status: ${filterOptions.statusFilter === 'CLEAR' ? 'Clear' : 'Perlu Grading'}`);
  }
  if (filterOptions.searchTerm) {
    filterDescParts.push(`Pencarian: "${filterOptions.searchTerm}"`);
  }
  const filterSummary = filterDescParts.length > 0 ? filterDescParts.join(' | ') : 'Semua Data (Tanpa Filter)';

  const titleHeader = isSingleTeacher && targetTeacherName
    ? `LAPORAN TUGAS BELUM DINILAI - ${targetTeacherName.toUpperCase()}`
    : 'LAPORAN STATUS CLEARANCE GRADING GURU (HASIL FILTER)';

  // Build Sheet Data Array-of-Arrays
  const aoaData: (string | number)[][] = [
    ['MAKARIOS CHRISTIAN SCHOOL'],
    [titleHeader],
    [`Waktu Ekspor: ${dateStr} pukul ${timeStr}`],
    [`Filter Diterapkan: ${filterSummary}`],
    [`Total Baris Tugas: ${rows.length}`],
    [], // Blank separator
    [
      'No',
      'Nama Guru',
      'Email Guru',
      'Kelas',
      'Mata Pelajaran',
      'Judul Tugas',
      'Batas Waktu Pengumpulan',
      'Jumlah Siswa Belum Dinilai',
      'Daftar Siswa Belum Dinilai',
      'Status',
      'Link Google Classroom',
    ],
  ];

  let totalUngradedCount = 0;

  rows.forEach((r, idx) => {
    totalUngradedCount += r.ungradedCount || 0;
    const studentsStr =
      r.ungradedStudents && r.ungradedStudents.length > 0
        ? r.ungradedStudents.map((s) => s.studentName).join(', ')
        : '-';

    const statusStr = r.isClear ? 'CLEAR' : 'PERLU GRADING';
    const linkStr = r.courseWorkLink || r.courseLink || '';

    aoaData.push([
      idx + 1,
      r.teacherName,
      r.teacherEmail || '',
      r.className || '-',
      r.courseName || '-',
      r.courseWorkTitle || 'Tugas',
      r.dueDateStr && r.dueDateStr !== 'Tanpa Batas Waktu' ? r.dueDateStr : 'Tanpa Batas Waktu',
      r.ungradedCount || 0,
      studentsStr,
      statusStr,
      linkStr,
    ]);
  });

  // Summary footer
  aoaData.push([]);
  aoaData.push([
    '',
    'TOTAL',
    '',
    '',
    '',
    `${rows.length} Tugas Terdata`,
    '',
    totalUngradedCount,
    `${totalUngradedCount} Total Siswa Menunggu Penilaian`,
    '',
    '',
  ]);

  // Create Workbook & Worksheet
  const wb = XLSX.utils.book_new();
  const ws = XLSX.utils.aoa_to_sheet(aoaData);

  // Column Widths
  ws['!cols'] = [
    { wch: 6 },  // No
    { wch: 25 }, // Nama Guru
    { wch: 28 }, // Email
    { wch: 10 }, // Kelas
    { wch: 25 }, // Mata Pelajaran
    { wch: 32 }, // Judul Tugas
    { wch: 22 }, // Batas Waktu
    { wch: 16 }, // Jumlah Siswa
    { wch: 45 }, // Daftar Siswa
    { wch: 16 }, // Status
    { wch: 35 }, // Link
  ];

  XLSX.utils.book_append_sheet(wb, ws, 'Clearance_Guru');

  // File Name
  const cleanDate = now.toISOString().slice(0, 10);
  let fileName: string;
  if (isSingleTeacher && targetTeacherName) {
    const cleanTeacherName = targetTeacherName.replace(/[^a-zA-Z0-9]/g, '_');
    fileName = `Makarios_Grading_${cleanTeacherName}_${cleanDate}.xlsx`;
  } else {
    fileName = `Makarios_Grading_Guru_Terfilter_${cleanDate}.xlsx`;
  }

  // Trigger Download with fallback
  try {
    XLSX.writeFile(wb, fileName);
  } catch (err) {
    console.warn('XLSX.writeFile failed, using fallback Blob download:', err);
    try {
      const wbout = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
      const blob = new Blob([wbout], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = fileName;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      setTimeout(() => URL.revokeObjectURL(url), 10000);
    } catch (fallbackErr) {
      console.error('All XLSX export attempts failed:', fallbackErr);
    }
  }
}

/**
 * Export a single teacher's clearance record directly to Excel (.xlsx)
 */
export function exportSingleTeacherRecordToXLSX(record: TeacherSummaryRecord) {
  if (!record) return;

  const rows: FlattenedTeacherTaskRow[] = [];

  if (record.ungradedTasksList && record.ungradedTasksList.length > 0) {
    record.ungradedTasksList.forEach((u, uIdx) => {
      const courseMatch = record.assignedCourses?.find((c) => c.courseId === u.courseId);
      rows.push({
        rowId: `${record.teacherId}-${u.courseId}-${u.courseWorkId || uIdx}`,
        teacherId: record.teacherId,
        teacherName: record.teacherName,
        teacherEmail: record.teacherEmail,
        teacherPhoto: record.teacherPhoto,
        className: u.className,
        courseId: u.courseId,
        courseName: u.courseName,
        courseLink: courseMatch?.courseLink,
        courseWorkId: u.courseWorkId,
        courseWorkTitle: u.courseWorkTitle,
        courseWorkLink: u.courseWorkLink,
        dueDateStr: u.dueDateStr,
        ungradedCount: u.ungradedCount,
        ungradedStudents: u.ungradedStudents || [],
        isClear: false,
        parentRecord: record,
      });
    });
  } else {
    const courseNames = record.assignedCourses.map((c) => `${c.courseName} (${c.className})`).join(', ');
    rows.push({
      rowId: `${record.teacherId}-clear`,
      teacherId: record.teacherId,
      teacherName: record.teacherName,
      teacherEmail: record.teacherEmail,
      teacherPhoto: record.teacherPhoto,
      className: '-',
      courseId: '',
      courseName: courseNames || '-',
      courseWorkId: '',
      courseWorkTitle: 'Semua submisi tugas telah dinilai',
      ungradedCount: 0,
      ungradedStudents: [],
      isClear: true,
      parentRecord: record,
    });
  }

  exportFilteredTeacherTasksToXLSX(rows, {
    singleTeacherName: record.teacherName,
  });
}

