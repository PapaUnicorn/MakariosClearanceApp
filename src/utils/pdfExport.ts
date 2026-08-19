import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { StudentClearanceRecord, TeacherSummaryRecord } from '../types';

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
  monthYearStr?: string
) {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'pt',
    format: 'a4',
  });

  const now = new Date();
  const currentMonth = monthYearStr || now.toLocaleDateString('en-US', {
    month: 'long',
    year: 'numeric',
  }).toUpperCase();

  const pageWidth = doc.internal.pageSize.width;

  // 1. Maybank Yellow Header Banner for School Titles
  doc.setFillColor(255, 200, 0); // Maybank Yellow (#FFC800)
  doc.roundedRect(40, 30, pageWidth - 80, 56, 4, 4, 'F');

  // Text inside Yellow Banner
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(15, 23, 42); // Slate 900 / Black

  doc.setFontSize(11);
  doc.text('MAKARIOS CHRISTIAN SCHOOL', pageWidth / 2, 46, { align: 'center' });

  doc.setFontSize(14);
  doc.text(schoolLevel.toUpperCase(), pageWidth / 2, 62, { align: 'center' });

  doc.setFontSize(10);
  doc.text('STUDENT MONTHLY LEARNING PROGRESS REPORT', pageWidth / 2, 77, { align: 'center' });

  // 2. Student Name (Blue) & Month (Black) below yellow banner - strictly nothing else
  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(37, 99, 235); // Blue 600
  doc.text(studentName.toUpperCase(), pageWidth / 2, 106, { align: 'center' });

  doc.setFontSize(11);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(15, 23, 42); // Black
  doc.text(currentMonth, pageWidth / 2, 122, { align: 'center' });

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

    // Missing assignments formatting in clean list (without bullets or numbering)
    let missingText = 'None';
    if (record.unfinishedTasks.length > 0) {
      missingText = record.unfinishedTasks
        .map((t) => {
          const status = t.status === 'NOT_SUBMITTED' ? '(Belum Dikumpul)' : '(Menunggu Nilai)';
          const due = t.dueDateStr && t.dueDateStr !== 'Tanpa Batas Waktu' ? ` [${t.dueDateStr}]` : '';
          return `${t.title} ${status}${due}`;
        })
        .join('\n');
    }

    return [
      (index + 1).toString(),
      record.courseName,
      overallScoreDisplay,
      missingText,
    ];
  });

  autoTable(doc, {
    startY: 136,
    head: [['No.', 'Subject', 'Overall\nScore', 'Missing Assignments']],
    body: tableData,
    theme: 'grid',
    headStyles: {
      fillColor: [255, 200, 0], // Maybank Vibrant Yellow (#FFC800)
      textColor: [15, 23, 42], // Slate 900 / Charcoal (High contrast)
      fontSize: 10,
      fontStyle: 'bold',
      halign: 'center',
      valign: 'middle',
      lineColor: [202, 138, 4], // Amber 600 border
      lineWidth: 1,
      cellPadding: 8,
    },
    styles: {
      fontSize: 9,
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
      0: { cellWidth: 30, halign: 'center', valign: 'top' },
      1: { cellWidth: 125, halign: 'left', valign: 'top', fontStyle: 'bold' },
      2: { cellWidth: 65, halign: 'center', valign: 'top', fontStyle: 'bold', fontSize: 10 },
      3: { cellWidth: 'auto', halign: 'left', valign: 'top' },
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
  let footerY = finalY + 30;

  // If there's not enough room for the footer on current page, create a new page
  if (footerY + 70 > pageHeight) {
    doc.addPage();
    footerY = 50;
  }

  // Left Footer Info
  doc.setFont('helvetica', 'italic');
  doc.setFontSize(8.5);
  doc.setTextColor(100, 116, 139); // Slate 500
  doc.text('Dicetak secara otomatis melalui Makarios Clearance App.', 40, footerY);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(148, 163, 184); // Slate 400
  doc.text(
    `Tanggal Cetak: ${now.toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}`,
    40,
    footerY + 12
  );

  // Right Footer Signature Box (Wali Kelas / Guru)
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9.5);
  doc.setTextColor(15, 23, 42); // Slate 900
  doc.text('Wali Kelas / Guru', pageWidth - 130, footerY, { align: 'center' });

  // Signature underline
  doc.setDrawColor(148, 163, 184);
  doc.setLineWidth(0.75);
  doc.line(pageWidth - 200, footerY + 45, pageWidth - 60, footerY + 45);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(100, 116, 139);
  doc.text('( ..................................................... )', pageWidth - 130, footerY + 56, {
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
        const taskStatus =
          t.status === 'NOT_SUBMITTED' ? 'Belum Dikumpulkan' : 'Menunggu Nilai Guru';
        flattenedRows.push({
          studentName: r.studentName,
          studentEmail: r.studentEmail,
          className: r.className,
          courseName: r.courseName,
          taskTitle: t.title,
          deadline: t.dueDateStr || 'Tanpa Batas Waktu',
          taskStatus,
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

export function exportTeachersToPDF(
  records: TeacherSummaryRecord[],
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
  const totalUngradedSubmissions = records.reduce((acc, r) => acc + r.totalUngradedSubmissions, 0);

  // Flatten rows: 1 line 1 data per teacher task
  const flattenedRows: {
    teacherName: string;
    teacherEmail: string;
    courseName: string;
    className: string;
    taskTitle: string;
    ungradedCount: number;
    ungradedStudentNames: string;
    status: string;
  }[] = [];

  records.forEach((r) => {
    if (r.ungradedTasksList.length > 0) {
      r.ungradedTasksList.forEach((u) => {
        const studentNames = u.ungradedStudents.map((s) => s.studentName).join(', ');
        flattenedRows.push({
          teacherName: r.teacherName,
          teacherEmail: r.teacherEmail,
          courseName: u.courseName,
          className: u.className,
          taskTitle: u.dueDateStr ? `${u.courseWorkTitle} (Batas: ${u.dueDateStr})` : u.courseWorkTitle,
          ungradedCount: u.ungradedCount,
          ungradedStudentNames: studentNames,
          status: `PERLU GRADING (${u.ungradedCount} siswa)`,
        });
      });
    } else {
      const allCourseNames = r.assignedCourses.map((c) => `${c.courseName} (${c.className})`).join(', ');
      flattenedRows.push({
        teacherName: r.teacherName,
        teacherEmail: r.teacherEmail,
        courseName: allCourseNames || '-',
        className: '-',
        taskTitle: 'Semua submisi tugas telah dinilai',
        ungradedCount: 0,
        ungradedStudentNames: '-',
        status: 'CLEAR',
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
  doc.text('Laporan Status Grading Guru (1 Baris per Tugas)', 40, 42);

  doc.setFontSize(8.5);
  doc.text(`Dicetak: ${dateStr}, ${timeStr}`, doc.internal.pageSize.width - 40, 34, { align: 'right' });

  // Summary Stat
  doc.setTextColor(51, 65, 85);
  doc.setFontSize(8.5);
  doc.setFont('helvetica', 'bold');
  doc.text(
    `Total Guru: ${records.length}  |  Grading Tuntas: ${clearCount} Guru  |  Perlu Grading: ${pendingCount} Guru (${totalUngradedSubmissions} Total Submisi) ${titleSuffix ? ` | ${titleSuffix}` : ''}`,
    40,
    72
  );

  // Prepare table data
  const tableData = flattenedRows.map((row, index) => [
    (index + 1).toString(),
    row.teacherEmail ? `${row.teacherName}\n(${row.teacherEmail})` : row.teacherName,
    row.className !== '-' ? `${row.courseName}\n(${row.className})` : row.courseName,
    row.taskTitle,
    row.ungradedCount > 0 ? `${row.ungradedCount} siswa:\n${row.ungradedStudentNames}` : 'Tidak ada',
    row.status,
  ]);

  autoTable(doc, {
    startY: 84,
    head: [['No', 'Nama Guru', 'Mata Pelajaran & Kelas', 'Nama Tugas', 'Siswa Belum Dinilai', 'Status']],
    body: tableData,
    theme: 'grid',
    headStyles: {
      fillColor: [30, 41, 59],
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
      2: { cellWidth: 120, halign: 'left', valign: 'top' },
      3: { cellWidth: 140, halign: 'left', valign: 'top' },
      4: { cellWidth: 'auto', halign: 'left', valign: 'top' },
      5: { cellWidth: 90, halign: 'left', valign: 'top', fontStyle: 'bold' },
    },
    didParseCell: (data) => {
      if (data.section === 'body' && data.column.index === 5) {
        if (data.cell.raw === 'CLEAR') {
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
        doc.internal.pageSize.width / 2,
        doc.internal.pageSize.height - 18,
        { align: 'center' }
      );
    },
  });

  const fileName = `Makarios_Clearance_Guru_${now.toISOString().slice(0, 10)}.pdf`;
  doc.save(fileName);
}
