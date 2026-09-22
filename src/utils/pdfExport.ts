import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { StudentClearanceRecord, TeacherSummaryRecord, FlattenedTeacherTaskRow, getTaskStatusInfo } from '../types';
import { filterTasksUpToMonth } from './dateFilter';

/**
 * Export Student Monthly Learning Progress Report (PDF format)
 * Matching exact template:
 * MAKARIOS CHRISTIAN SCHOOL
 * JUNIOR HIGH SCHOOL
 * STUDENT MONTHLY LEARNING PROGRESS REPORT
 * [MONTH] (in RED)
 * [NAMA] (in RED)
 * Table: No. | Subject | Overall Score | Missing Assignments
 */
export function exportStudentMonthlyProgressReportPDF(
  studentName: string,
  records: StudentClearanceRecord[],
  schoolLevel: string = 'JUNIOR HIGH SCHOOL',
  monthYearStr?: string,
  targetYear?: number,
  targetMonth?: number
) {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'pt',
    format: 'a4',
  });

  const now = new Date();
  const filterYear = targetYear || now.getFullYear();
  const filterMonth = targetMonth || now.getMonth() + 1; // 1-12

  const currentMonth = monthYearStr || now.toLocaleDateString('en-US', {
    month: 'long',
    year: 'numeric',
  }).toUpperCase();

  const pageWidth = doc.internal.pageSize.width;

  // 1. Maybank Yellow Header Banner for School Titles - 10pt font
  const bannerY = 30;
  const bannerHeight = 44;
  doc.setFillColor(255, 200, 0); // Maybank Yellow (#FFC800)
  doc.roundedRect(40, bannerY, pageWidth - 80, bannerHeight, 4, 4, 'F');

  // Text inside Yellow Banner
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(15, 23, 42); // Slate 900 / Black
  doc.setFontSize(10); // Strictly 10pt

  const schoolTitle = schoolLevel ? `MAKARIOS ${schoolLevel.toUpperCase()}` : 'MAKARIOS JUNIOR HIGH SCHOOL';
  doc.text(schoolTitle, pageWidth / 2, bannerY + 17, { align: 'center' });
  doc.text('Student Monthly Learning Progress Report', pageWidth / 2, bannerY + 31, { align: 'center' });

  // 2. Student Name (Blue) & Month (Black) below yellow banner - strictly 10pt
  const nameY = bannerY + bannerHeight + 18;
  doc.setFontSize(10); // Strictly 10pt
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(37, 99, 235); // Blue 600
  doc.text(studentName.toUpperCase(), pageWidth / 2, nameY, { align: 'center' });

  const monthY = nameY + 15;
  doc.setFontSize(10); // Strictly 10pt
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(15, 23, 42); // Black
  doc.text(currentMonth, pageWidth / 2, monthY, { align: 'center' });

  // Prepare table rows: No. | Subject | Overall Score | Missing Assignments
  const tableData = records.map((record, index) => {
    // Calculate overall score
    let overallScoreDisplay = '-';
    if (record.overallScore !== undefined && record.overallScore !== null) {
      overallScoreDisplay = `${record.overallScore}`;
    } else if (record.overallScoreStr && record.overallScoreStr !== '-') {
      overallScoreDisplay = record.overallScoreStr;
    } else {
      const graded = record.allTasks.filter(
        (t) => t.status === 'GRADED' && t.assignedGrade !== undefined
      );
      if (graded.length > 0) {
        const total = graded.reduce((acc, t) => {
          const max = t.maxPoints || 100;
          return acc + ((t.assignedGrade || 0) / max) * 100;
        }, 0);
        overallScoreDisplay = (total / graded.length).toFixed(1);
      }
    }

    // Missing assignments formatting: Filter only unsubmitted tasks due in this month or earlier
    const filteredUnfinished = filterTasksUpToMonth(record.unfinishedTasks, filterYear, filterMonth, true);
    let missingText = 'None';
    if (filteredUnfinished.length > 0) {
      missingText = filteredUnfinished
        .map((t) => {
          const statusInfo = getTaskStatusInfo(t.status, t.assignedGrade, t.maxPoints);
          const due = t.dueDateStr && t.dueDateStr !== 'Tanpa Batas Waktu' ? t.dueDateStr : 'Tanpa batas waktu';
          return `• ${t.title} (${statusInfo.label})\n   Deadline: ${due}`;
        })
        .join('\n\n');
    }

    return [
      (index + 1).toString(),
      record.courseName,
      overallScoreDisplay,
      missingText,
    ];
  });

  autoTable(doc, {
    startY: monthY + 16,
    head: [['No.', 'Subject', 'Overall\nScore', 'Missing Assignments']],
    body: tableData,
    theme: 'grid',
    rowPageBreak: 'avoid',
    showHead: 'everyPage',
    headStyles: {
      fillColor: [255, 200, 0], // Maybank Vibrant Yellow (#FFC800)
      textColor: [15, 23, 42], // Slate 900 / Charcoal (High contrast)
      fontSize: 10,
      fontStyle: 'bold',
      halign: 'center',
      valign: 'middle',
      lineColor: [202, 138, 4], // Amber 600 border
      lineWidth: 1,
      cellPadding: 7,
    },
    styles: {
      fontSize: 10,
      cellPadding: 7,
      overflow: 'linebreak',
      valign: 'top',
      halign: 'left',
      lineColor: [226, 232, 240], // Slate 200
      lineWidth: 0.75,
      textColor: [15, 23, 42],
    },
    alternateRowStyles: {
      fillColor: [255, 251, 235], // Warm amber-50 light background
    },
    columnStyles: {
      0: { cellWidth: 30, halign: 'center', valign: 'top', fontSize: 10 },
      1: { cellWidth: 125, halign: 'left', valign: 'top', fontStyle: 'bold', fontSize: 10 },
      2: { cellWidth: 65, halign: 'center', valign: 'top', fontStyle: 'bold', fontSize: 10 },
      3: { cellWidth: 'auto', halign: 'left', valign: 'top', fontSize: 10 },
    },
    didParseCell: (data) => {
      if (data.section === 'body' && data.column.index === 3) {
        if (data.cell.raw === 'None') {
          data.cell.styles.textColor = [22, 101, 52];
          data.cell.styles.fontStyle = 'italic';
        }
      }
    },
    margin: { left: 40, right: 40, bottom: 40 },
    didDrawPage: (data) => {
      const pageNumber = doc.getNumberOfPages();
      doc.setFontSize(8);
      doc.setTextColor(148, 163, 184);
      doc.text(
        `Makarios Christian School • Monthly Learning Progress Report • Halaman ${data.pageNumber} dari ${pageNumber}`,
        doc.internal.pageSize.width / 2,
        doc.internal.pageSize.height - 15,
        { align: 'center' }
      );
    },
  });

  // Calculate final Y position after table to render footer & signature
  const finalY = (doc as any).lastAutoTable?.finalY || 160;
  const pageHeight = doc.internal.pageSize.height;
  let footerY = finalY + 28;

  // If there's not enough room for the footer on current page, create a new page
  if (footerY + 70 > pageHeight) {
    doc.addPage();
    footerY = 50;
  }

  // Left Footer Info - Strictly 10pt
  doc.setFont('helvetica', 'italic');
  doc.setFontSize(10);
  doc.setTextColor(100, 116, 139); // Slate 500
  doc.text('Dicetak secara otomatis melalui Makarios Clearance App.', 40, footerY);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  doc.setTextColor(148, 163, 184); // Slate 400
  doc.text(
    `Tanggal Cetak: ${now.toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}`,
    40,
    footerY + 14
  );

  // Right Footer Signature Box (Wali Kelas / Guru) - Strictly 10pt
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.setTextColor(15, 23, 42); // Slate 900
  doc.text('Wali Kelas / Guru', pageWidth - 130, footerY, { align: 'center' });

  // Signature underline
  doc.setDrawColor(148, 163, 184);
  doc.setLineWidth(0.75);
  doc.line(pageWidth - 200, footerY + 45, pageWidth - 60, footerY + 45);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  doc.setTextColor(100, 116, 139);
  doc.text('( ..................................................... )', pageWidth - 130, footerY + 58, {
    align: 'center',
  });

  const sanitized = studentName.replace(/[^a-zA-Z0-9_-]/g, '_');
  const fileName = `Progress_Report_${sanitized}_${currentMonth.replace(/\s+/g, '_')}.pdf`;
  doc.save(fileName);
}

/**
 * Alias for backward compatibility
 */
export function exportIndividualStudentReportPDF(
  studentName: string,
  className: string,
  records: StudentClearanceRecord[]
) {
  const schoolLevel = className.toUpperCase().includes('10') || className.toUpperCase().includes('11') || className.toUpperCase().includes('12')
    ? 'SENIOR HIGH SCHOOL'
    : 'JUNIOR HIGH SCHOOL';
  exportStudentMonthlyProgressReportPDF(studentName, records, schoolLevel);
}

/**
 * Export All Filtered Students to PDF (1 line 1 data with separated Deadline column)
 */
export function exportStudentsToPDF(
  records: StudentClearanceRecord[],
  titleSuffix: string = ''
) {
  const doc = new jsPDF({
    orientation: 'landscape',
    unit: 'pt',
    format: 'a4',
  });

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

  const clearCount = records.filter((r) => r.isClear).length;
  const pendingCount = records.length - clearCount;
  const clearPercent = records.length > 0 ? Math.round((clearCount / records.length) * 100) : 0;

  // Flatten records: 1 line 1 data with separate Deadline
  const flattenedRows: {
    studentName: string;
    studentEmail: string;
    className: string;
    courseName: string;
    taskTitle: string;
    deadline: string;
    taskStatus: string;
    clearanceStatus: string;
    isClear: boolean;
  }[] = [];

  records.forEach((r) => {
    if (r.unfinishedTasks.length > 0) {
      r.unfinishedTasks.forEach((t) => {
        const statusInfo = getTaskStatusInfo(t.status, t.assignedGrade, t.maxPoints);
        flattenedRows.push({
          studentName: r.studentName,
          studentEmail: r.studentEmail,
          className: r.className,
          courseName: r.courseName,
          taskTitle: t.title,
          deadline: t.dueDateStr || 'Tanpa Batas Waktu',
          taskStatus: statusInfo.label,
          clearanceStatus: 'BELUM CLEAR',
          isClear: false,
        });
      });
    } else {
      flattenedRows.push({
        studentName: r.studentName,
        studentEmail: r.studentEmail,
        className: r.className,
        courseName: r.courseName,
        taskTitle: 'Semua Tugas Selesai & Dinilai',
        deadline: '-',
        taskStatus: 'Selesai',
        clearanceStatus: 'CLEAR',
        isClear: true,
      });
    }
  });

  // Header Banner
  doc.setFillColor(37, 99, 235); // Blue 600
  doc.rect(0, 0, doc.internal.pageSize.width, 54, 'F');

  doc.setTextColor(255, 255, 255);
  doc.setFontSize(15);
  doc.setFont('helvetica', 'bold');
  doc.text('MAKARIOS CLEARANCE APP', 40, 26);

  doc.setFontSize(9.5);
  doc.setFont('helvetica', 'normal');
  doc.text('Laporan Rekapitulasi Clearance Siswa (1 Baris per Tugas)', 40, 42);

  doc.setFontSize(8.5);
  doc.text(`Dicetak: ${dateStr}, ${timeStr}`, doc.internal.pageSize.width - 40, 34, { align: 'right' });

  // Summary Stat Pills
  doc.setTextColor(51, 65, 85);
  doc.setFontSize(8.5);
  doc.setFont('helvetica', 'bold');
  doc.text(
    `Total Baris Tugas: ${flattenedRows.length}  |  Siswa Clear: ${clearCount} (${clearPercent}%)  |  Siswa Belum Clear: ${pendingCount} (${100 - clearPercent}%) ${titleSuffix ? ` | ${titleSuffix}` : ''}`,
    40,
    72
  );

  // Prepare table data with separated Deadline column
  const tableData = flattenedRows.map((row, index) => [
    (index + 1).toString(),
    row.studentEmail ? `${row.studentName}\n(${row.studentEmail})` : row.studentName,
    row.className,
    row.courseName,
    row.taskTitle,
    row.deadline,
    row.taskStatus,
    row.clearanceStatus,
  ]);

  autoTable(doc, {
    startY: 84,
    head: [['No', 'Nama Siswa', 'Kelas', 'Mata Pelajaran', 'Nama Tugas', 'Deadline', 'Status Tugas', 'Status']],
    body: tableData,
    theme: 'grid',
    headStyles: {
      fillColor: [30, 41, 59], // Slate 800
      textColor: [255, 255, 255],
      fontSize: 8.5,
      fontStyle: 'bold',
      halign: 'left',
      valign: 'top',
      cellPadding: 5,
    },
    styles: {
      fontSize: 8,
      cellPadding: 5,
      overflow: 'linebreak',
      valign: 'top',
      halign: 'left',
      lineColor: [226, 232, 240],
      lineWidth: 0.5,
    },
    columnStyles: {
      0: { cellWidth: 26, halign: 'left', valign: 'top' },
      1: { cellWidth: 130, halign: 'left', valign: 'top' },
      2: { cellWidth: 45, halign: 'left', valign: 'top' },
      3: { cellWidth: 110, halign: 'left', valign: 'top' },
      4: { cellWidth: 'auto', halign: 'left', valign: 'top' },
      5: { cellWidth: 95, halign: 'left', valign: 'top' },
      6: { cellWidth: 95, halign: 'left', valign: 'top' },
      7: { cellWidth: 65, halign: 'left', valign: 'top', fontStyle: 'bold' },
    },
    didParseCell: (data) => {
      // Color-code the Status column
      if (data.section === 'body' && data.column.index === 7) {
        if (data.cell.raw === 'CLEAR') {
          data.cell.styles.textColor = [22, 101, 52]; // Emerald 800
          data.cell.styles.fillColor = [240, 253, 244]; // Emerald 50
        } else {
          data.cell.styles.textColor = [159, 18, 57]; // Rose 800
          data.cell.styles.fillColor = [255, 241, 242]; // Rose 50
        }
      }
      if (data.section === 'body' && data.column.index === 6) {
        if (data.cell.raw === 'Belum Dikumpulkan') {
          data.cell.styles.textColor = [190, 18, 60];
        } else if (data.cell.raw === 'Menunggu Nilai Guru') {
          data.cell.styles.textColor = [180, 83, 9];
        } else {
          data.cell.styles.textColor = [22, 101, 52];
        }
      }
    },
    margin: { left: 40, right: 40, bottom: 40 },
    didDrawPage: (data) => {
      const pageNumber = doc.getNumberOfPages();
      doc.setFontSize(8);
      doc.setTextColor(148, 163, 184); // Slate 400
      doc.text(
        `Makarios Clearance App • Halaman ${data.pageNumber} dari ${pageNumber}`,
        doc.internal.pageSize.width / 2,
        doc.internal.pageSize.height - 18,
        { align: 'center' }
      );
    },
  });

  const fileName = `Makarios_Clearance_Siswa_${now.toISOString().slice(0, 10)}.pdf`;
  doc.save(fileName);
}

export interface TeacherExportFilterOptions {
  singleTeacherName?: string;
  selectedTeachers?: string[];
  selectedClasses?: string[];
  selectedCourses?: string[];
  statusFilter?: string;
  searchTerm?: string;
}

/**
 * Export Teacher Grading Tasks Report (PDF format)
 * Exact columns: Nama Guru, Kelas, Mata Pelajaran, Tugas Belum Dinilai (1 baris per tugas)
 * If filtered to 1 teacher (or single teacher selected), generates specific single-teacher PDF report.
 */
export function exportFilteredTeacherTasksToPDF(
  rows: FlattenedTeacherTaskRow[],
  filterOptions: TeacherExportFilterOptions = {}
) {
  if (!rows || rows.length === 0) return;

  const doc = new jsPDF({
    orientation: 'landscape',
    unit: 'pt',
    format: 'a4',
  });

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

  const pageWidth = doc.internal.pageSize.width;

  // Determine if this export represents a single teacher
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

  const singleTeacherRecord = rows.find((r) => r.teacherName === targetTeacherName);
  const teacherEmail = isSingleTeacher && singleTeacherRecord ? singleTeacherRecord.teacherEmail : '';

  const totalUngradedSubmissions = rows.reduce((acc, r) => acc + (r.ungradedCount || 0), 0);
  const pendingTasksCount = rows.filter((r) => !r.isClear).length;
  const isAllClear = rows.every((r) => r.isClear);

  // 1. Header Banner with Makarios / Maybank slate & gold theme
  const bannerHeight = 52;
  doc.setFillColor(15, 23, 42); // Slate 900
  doc.rect(0, 0, pageWidth, bannerHeight, 'F');

  // Accent Gold Line
  doc.setFillColor(255, 200, 0); // Maybank Yellow (#FFC800)
  doc.rect(0, bannerHeight - 4, pageWidth, 4, 'F');

  // Header Titles
  doc.setTextColor(255, 200, 0);
  doc.setFontSize(13);
  doc.setFont('helvetica', 'bold');
  doc.text('MAKARIOS CHRISTIAN SCHOOL', 40, 23);

  doc.setTextColor(255, 255, 255);
  doc.setFontSize(9.5);
  doc.setFont('helvetica', 'normal');
  if (isSingleTeacher && targetTeacherName) {
    doc.text(`Laporan Tugas Belum Dinilai: ${targetTeacherName.toUpperCase()}`, 40, 39);
  } else {
    doc.text('Laporan Status Grading Guru (Hasil Filter Terpilih)', 40, 39);
  }

  doc.setFontSize(8);
  doc.setTextColor(203, 213, 225); // Slate 300
  doc.text(`Dicetak: ${dateStr}, ${timeStr}`, pageWidth - 40, 31, { align: 'right' });

  // 2. Summary Card Section
  const summaryBoxY = 66;
  const summaryBoxHeight = 44;
  doc.setFillColor(248, 250, 252); // Slate 50
  doc.roundedRect(40, summaryBoxY, pageWidth - 80, summaryBoxHeight, 4, 4, 'F');
  doc.setDrawColor(226, 232, 240);
  doc.roundedRect(40, summaryBoxY, pageWidth - 80, summaryBoxHeight, 4, 4, 'S');

  if (isSingleTeacher && targetTeacherName) {
    // Left: Teacher info
    doc.setTextColor(15, 23, 42);
    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    doc.text(`Nama Guru: ${targetTeacherName}`, 52, summaryBoxY + 17);

    doc.setFontSize(8.5);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(100, 116, 139);
    doc.text(teacherEmail ? `Email: ${teacherEmail}` : 'Akun Google Classroom Terhubung', 52, summaryBoxY + 32);

    // Right: Status & count
    const statusText = isAllClear
      ? 'STATUS: CLEAR (Semua Tugas Telah Dinilai)'
      : `STATUS: PERLU GRADING (${pendingTasksCount} Tugas • ${totalUngradedSubmissions} Siswa Menunggu Nilai)`;

    doc.setFont('helvetica', 'bold');
    if (isAllClear) {
      doc.setTextColor(22, 101, 52); // Emerald 800
    } else {
      doc.setTextColor(190, 24, 93); // Rose 700
    }
    doc.text(statusText, pageWidth - 52, summaryBoxY + 17, { align: 'right' });

    // Filter subtitle if extra filters applied
    const extraFilterTags: string[] = [];
    if (filterOptions.selectedClasses && filterOptions.selectedClasses.length > 0) {
      extraFilterTags.push(`Kelas: ${filterOptions.selectedClasses.join(', ')}`);
    }
    if (filterOptions.selectedCourses && filterOptions.selectedCourses.length > 0) {
      extraFilterTags.push(`Mapel: ${filterOptions.selectedCourses.join(', ')}`);
    }
    if (filterOptions.searchTerm) {
      extraFilterTags.push(`Cari: "${filterOptions.searchTerm}"`);
    }

    doc.setFontSize(8);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(100, 116, 139);
    const filterDesc = extraFilterTags.length > 0
      ? `Filter Tambahan: ${extraFilterTags.join(' • ')}`
      : `Menampilkan ${rows.length} tugas terdata untuk guru ini`;
    doc.text(filterDesc, pageWidth - 52, summaryBoxY + 32, { align: 'right' });
  } else {
    // Multi-teacher filter summary
    doc.setTextColor(15, 23, 42);
    doc.setFontSize(9.5);
    doc.setFont('helvetica', 'bold');
    doc.text(
      `Hasil Filter: ${uniqueTeachers.length} Guru  |  ${rows.length} Baris Tugas  |  ${totalUngradedSubmissions} Total Siswa Menunggu`,
      52,
      summaryBoxY + 17
    );

    const filterTags: string[] = [];
    if (filterOptions.selectedTeachers && filterOptions.selectedTeachers.length > 0) {
      filterTags.push(`Guru (${filterOptions.selectedTeachers.length}): ${filterOptions.selectedTeachers.slice(0, 3).join(', ')}${filterOptions.selectedTeachers.length > 3 ? '...' : ''}`);
    }
    if (filterOptions.selectedClasses && filterOptions.selectedClasses.length > 0) {
      filterTags.push(`Kelas: ${filterOptions.selectedClasses.join(', ')}`);
    }
    if (filterOptions.selectedCourses && filterOptions.selectedCourses.length > 0) {
      filterTags.push(`Mapel: ${filterOptions.selectedCourses.join(', ')}`);
    }
    if (filterOptions.searchTerm) {
      filterTags.push(`Pencarian: "${filterOptions.searchTerm}"`);
    }

    doc.setFontSize(8);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(100, 116, 139);
    const filterDesc = filterTags.length > 0 ? filterTags.join(' • ') : 'Menampilkan seluruh antrean tugas';
    doc.text(filterDesc, 52, summaryBoxY + 32);
  }

  // 3. Prepare Table Data (Order: Nama Guru, Kelas, Mata Pelajaran, Tugas Belum Dinilai)
  const tableData = rows.map((row, index) => {
    let taskText = row.courseWorkTitle || 'Tugas';
    if (row.dueDateStr && row.dueDateStr !== 'Tanpa Batas Waktu') {
      taskText += `\n(Batas Pengumpulan: ${row.dueDateStr})`;
    }
    if (row.ungradedStudents && row.ungradedStudents.length > 0) {
      const studentNames = row.ungradedStudents.map((s) => s.studentName).join(', ');
      taskText += `\n\nSiswa Belum Dinilai (${row.ungradedCount}):\n${studentNames}`;
    }

    const statusText = row.isClear
      ? 'CLEAR'
      : `PERLU GRADING\n(${row.ungradedCount} siswa)`;

    return [
      (index + 1).toString(),
      row.teacherEmail ? `${row.teacherName}\n(${row.teacherEmail})` : row.teacherName,
      row.className || '-',
      row.courseName || '-',
      taskText,
      statusText,
    ];
  });

  autoTable(doc, {
    startY: summaryBoxY + summaryBoxHeight + 14,
    head: [['No', 'Nama Guru', 'Kelas', 'Mata Pelajaran', 'Tugas Belum Dinilai', 'Status']],
    body: tableData,
    theme: 'grid',
    headStyles: {
      fillColor: [15, 23, 42],
      textColor: [255, 255, 255],
      fontSize: 8.5,
      fontStyle: 'bold',
      halign: 'left',
      valign: 'middle',
      cellPadding: 6,
    },
    styles: {
      fontSize: 8,
      cellPadding: 6,
      overflow: 'linebreak',
      valign: 'top',
      halign: 'left',
      lineColor: [226, 232, 240],
      lineWidth: 0.5,
    },
    columnStyles: {
      0: { cellWidth: 26, halign: 'center' },
      1: { cellWidth: 125 },
      2: { cellWidth: 70 },
      3: { cellWidth: 135 },
      4: { cellWidth: 'auto' },
      5: { cellWidth: 85, fontStyle: 'bold', halign: 'center' },
    },
    didParseCell: (data) => {
      if (data.section === 'body' && data.column.index === 5) {
        if (typeof data.cell.raw === 'string' && data.cell.raw.includes('CLEAR')) {
          data.cell.styles.textColor = [22, 101, 52];
          data.cell.styles.fillColor = [240, 253, 244];
        } else {
          data.cell.styles.textColor = [159, 18, 57];
          data.cell.styles.fillColor = [255, 241, 242];
        }
      }
    },
    margin: { left: 40, right: 40, bottom: 40 },
    didDrawPage: (data) => {
      const pageNumber = doc.getNumberOfPages();
      doc.setFontSize(8);
      doc.setTextColor(148, 163, 184);
      doc.text(
        `Makarios Clearance App • Halaman ${data.pageNumber} dari ${pageNumber}`,
        pageWidth / 2,
        doc.internal.pageSize.height - 18,
        { align: 'center' }
      );
    },
  });

  // Descriptive Filename
  let fileName: string;
  const cleanDate = now.toISOString().slice(0, 10);
  if (isSingleTeacher && targetTeacherName) {
    const cleanTeacherName = targetTeacherName.replace(/[^a-zA-Z0-9]/g, '_');
    fileName = `Makarios_Grading_${cleanTeacherName}_${cleanDate}.pdf`;
  } else {
    fileName = `Makarios_Grading_Guru_Terfilter_${cleanDate}.pdf`;
  }

  doc.save(fileName);
}

/**
 * Export a single teacher's clearance record directly to PDF
 */
export function exportSingleTeacherRecordToPDF(record: TeacherSummaryRecord) {
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

  exportFilteredTeacherTasksToPDF(rows, {
    singleTeacherName: record.teacherName,
  });
}

export function exportTeachersToPDF(
  records: TeacherSummaryRecord[],
  titleSuffix: string = ''
) {
  const flattenedRows: FlattenedTeacherTaskRow[] = [];

  records.forEach((r) => {
    if (r.ungradedTasksList.length > 0) {
      r.ungradedTasksList.forEach((u, uIdx) => {
        const courseMatch = r.assignedCourses?.find((c) => c.courseId === u.courseId);
        flattenedRows.push({
          rowId: `${r.teacherId}-${u.courseId}-${u.courseWorkId || uIdx}`,
          teacherId: r.teacherId,
          teacherName: r.teacherName,
          teacherEmail: r.teacherEmail,
          teacherPhoto: r.teacherPhoto,
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
          parentRecord: r,
        });
      });
    } else {
      const allCourseNames = r.assignedCourses.map((c) => `${c.courseName} (${c.className})`).join(', ');
      flattenedRows.push({
        rowId: `${r.teacherId}-clear`,
        teacherId: r.teacherId,
        teacherName: r.teacherName,
        teacherEmail: r.teacherEmail,
        teacherPhoto: r.teacherPhoto,
        className: '-',
        courseId: '',
        courseName: allCourseNames || '-',
        courseWorkId: '',
        courseWorkTitle: 'Semua submisi tugas telah dinilai',
        ungradedCount: 0,
        ungradedStudents: [],
        isClear: true,
        parentRecord: r,
      });
    }
  });

  exportFilteredTeacherTasksToPDF(flattenedRows, {
    searchTerm: titleSuffix,
  });
}
