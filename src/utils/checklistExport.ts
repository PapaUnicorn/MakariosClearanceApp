import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import {
  Document,
  Packer,
  Paragraph,
  TextRun,
  Table,
  TableRow,
  TableCell,
  WidthType,
  AlignmentType,
  BorderStyle,
  VerticalAlign,
  ShadingType,
} from 'docx';
import * as XLSX from 'xlsx';
import { StudentClearanceRecord, StudentTaskItem } from '../types';
import { parseIndonesianDate } from './dateFilter';

export interface ClearanceChecklistItem {
  no: number;
  courseName: string;
  taskTitle: string;
  dueDateStr: string;
  timestamp: number;
}

function initJsPDF(options?: any): jsPDF {
  if (typeof jsPDF === 'function') {
    return new jsPDF(options);
  }
  const anyJsPDF = jsPDF as any;
  if (typeof anyJsPDF.jsPDF === 'function') {
    return new anyJsPDF.jsPDF(options);
  }
  if (typeof anyJsPDF.default === 'function') {
    return new anyJsPDF.default(options);
  }
  return new (window as any).jspdf.jsPDF(options);
}

function runAutoTable(doc: any, options: any) {
  if (typeof (doc as any).autoTable === 'function') {
    (doc as any).autoTable(options);
  } else if (typeof autoTable === 'function') {
    autoTable(doc, options);
  } else if (typeof (autoTable as any).default === 'function') {
    (autoTable as any).default(doc, options);
  } else if (typeof (autoTable as any).applyPlugin === 'function') {
    (autoTable as any).applyPlugin(doc);
    (doc as any).autoTable(options);
  }
}

function savePdfDocument(doc: jsPDF, fileName: string) {
  try {
    doc.save(fileName);
  } catch (err) {
    console.warn('doc.save failed, using fallback blob download:', err);
    try {
      const blob = doc.output('blob');
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = fileName;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      setTimeout(() => URL.revokeObjectURL(url), 10000);
    } catch (fallbackErr) {
      console.error('All PDF download mechanisms failed:', fallbackErr);
    }
  }
}

export function getTaskDueTimestamp(task: StudentTaskItem): number {
  if (task.dueYear && task.dueMonth) {
    const day = task.dueDay || 1;
    return new Date(task.dueYear, task.dueMonth - 1, day, 23, 59, 59).getTime();
  }
  if (task.dueDateStr) {
    const parsed = parseIndonesianDate(task.dueDateStr);
    if (parsed?.year && parsed?.month) {
      return new Date(parsed.year, parsed.month - 1, parsed.day || 1, 23, 59, 59).getTime();
    }
  }
  if (task.creationTime) {
    const cd = new Date(task.creationTime).getTime();
    if (!isNaN(cd)) return cd;
  }
  return Number.MAX_SAFE_INTEGER;
}

/**
 * Collects and filters all tasks for a student across all subjects for a given month,
 * sorted ascending: earliest deadline (termuda) to latest deadline (tertua).
 */
export function getClearanceChecklistItems(
  records: StudentClearanceRecord[],
  selectedYear?: number,
  selectedMonth?: number // 1-12 or undefined for all
): ClearanceChecklistItem[] {
  const items: ClearanceChecklistItem[] = [];

  records.forEach((rec) => {
    rec.allTasks.forEach((t) => {
      let matches = true;
      if (selectedYear && selectedMonth && selectedMonth >= 1 && selectedMonth <= 12) {
        if (t.dueYear && t.dueMonth) {
          matches = t.dueYear === selectedYear && t.dueMonth === selectedMonth;
        } else if (t.dueDateStr) {
          const parsed = parseIndonesianDate(t.dueDateStr);
          if (parsed?.year && parsed?.month) {
            matches = parsed.year === selectedYear && parsed.month === selectedMonth;
          } else {
            matches = false;
          }
        } else if (t.creationTime) {
          const cd = new Date(t.creationTime);
          matches = cd.getFullYear() === selectedYear && cd.getMonth() + 1 === selectedMonth;
        } else {
          matches = false;
        }
      }

      if (matches) {
        items.push({
          no: 0,
          courseName: rec.courseName,
          taskTitle: t.title,
          dueDateStr: t.dueDateStr && t.dueDateStr !== 'Tanpa Batas Waktu' ? t.dueDateStr : 'Tanpa batas waktu',
          timestamp: getTaskDueTimestamp(t),
        });
      }
    });
  });

  // Sort ascending: tanggal termuda sampai tanggal tertua
  items.sort((a, b) => a.timestamp - b.timestamp);

  // Assign 1-indexed numbering
  return items.map((item, idx) => ({
    ...item,
    no: idx + 1,
  }));
}

/**
 * 1. Export Clearance Checklist to PDF
 */
export function exportClearanceChecklistToPDF(
  studentName: string,
  className: string,
  items: ClearanceChecklistItem[],
  monthStr: string,
  schoolLevel: string = 'JUNIOR HIGH SCHOOL'
) {
  const doc = initJsPDF({
    orientation: 'portrait',
    unit: 'pt',
    format: 'a4',
  });

  const pageWidth = doc.internal.pageSize.width;
  const pageHeight = doc.internal.pageSize.height;

  // 1. Maybank Yellow Header Banner
  const bannerY = 30;
  const bannerHeight = 44;
  doc.setFillColor(255, 200, 0); // Maybank Yellow (#FFC800)
  doc.roundedRect(40, bannerY, pageWidth - 80, bannerHeight, 4, 4, 'F');

  // Text inside Yellow Banner
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(15, 23, 42); // Slate 900
  doc.setFontSize(11);
  const schoolTitle = schoolLevel ? `MAKARIOS ${schoolLevel.toUpperCase()}` : 'MAKARIOS JUNIOR HIGH SCHOOL';
  doc.text(schoolTitle, pageWidth / 2, bannerY + 17, { align: 'center' });
  doc.setFontSize(13);
  doc.text('Clearance Checklist', pageWidth / 2, bannerY + 33, { align: 'center' });

  // 2. Student Name & Period details
  const nameY = bannerY + bannerHeight + 20;
  doc.setFontSize(15);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(37, 99, 235); // Blue 600
  doc.text(studentName.toUpperCase(), pageWidth / 2, nameY, { align: 'center' });

  const infoY = nameY + 16;
  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(15, 23, 42); // Slate 900
  const subInfo = className ? `Kelas: ${className}   |   Periode: ${monthStr}` : `Periode: ${monthStr}`;
  doc.text(subInfo, pageWidth / 2, infoY, { align: 'center' });

  // 3. Table Rows: No. | Mata Pelajaran | Deskripsi Tugas | Deadline | Paraf Guru
  const tableData = items.map((item) => [
    item.no.toString(),
    item.courseName,
    item.taskTitle,
    item.dueDateStr,
    '', // Paraf Guru - Leave blank for signature
  ]);

  runAutoTable(doc, {
    startY: infoY + 18,
    head: [['No.', 'Mata Pelajaran', 'Deskripsi Tugas', 'Deadline', 'Paraf Guru']],
    body: tableData.length > 0 ? tableData : [['-', 'Tidak ada tugas yang terdaftar pada bulan ini', '-', '-', '']],
    theme: 'grid',
    rowPageBreak: 'avoid',
    showHead: 'everyPage',
    headStyles: {
      fillColor: [255, 200, 0], // Maybank Yellow (#FFC800)
      textColor: [15, 23, 42],
      fontSize: 10,
      fontStyle: 'bold',
      halign: 'center',
      valign: 'middle',
      lineColor: [202, 138, 4],
      lineWidth: 1.2,
      cellPadding: 6,
    },
    styles: {
      fontSize: 9.5,
      cellPadding: 7,
      overflow: 'linebreak',
      valign: 'middle',
      halign: 'left',
      lineColor: [148, 163, 184], // Slate 400
      lineWidth: 1.1,
      textColor: [15, 23, 42],
    },
    alternateRowStyles: {
      fillColor: [255, 251, 235], // Light amber-50
    },
    columnStyles: {
      0: { cellWidth: 28, halign: 'center' },
      1: { cellWidth: 125, fontStyle: 'bold' },
      2: { cellWidth: 'auto' },
      3: { cellWidth: 110, halign: 'center', fontSize: 9 },
      4: { cellWidth: 75, halign: 'center' }, // Blank Paraf Guru column
    },
    margin: { left: 40, right: 40, bottom: 40 },
    didDrawPage: (data: any) => {
      const pageNumber = doc.getNumberOfPages();
      doc.setFontSize(8);
      doc.setTextColor(148, 163, 184);
      doc.text(
        `Sekolah Kristen Makarios • Clearance Checklist • Halaman ${data.pageNumber} dari ${pageNumber}`,
        doc.internal.pageSize.width / 2,
        pageHeight - 15,
        { align: 'center' }
      );
    },
  });

  // Footer / Signatures
  const finalY = (doc as any).lastAutoTable?.finalY || 200;
  let footerY = finalY + 24;

  if (footerY + 70 > pageHeight) {
    doc.addPage();
    footerY = 50;
  }

  doc.setFontSize(9);
  doc.setTextColor(100, 116, 139);
  doc.setFont('helvetica', 'italic');
  doc.text(
    'Catatan: Lembar Clearance Checklist ini digunakan sebagai bukti verifikasi dan paraf penyelesaian tugas oleh guru mata pelajaran.',
    40,
    footerY
  );

  doc.setFont('helvetica', 'normal');
  doc.text(`Tanggal Cetak: ${new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}`, 40, footerY + 14);

  // Signature line
  const sigX = pageWidth - 180;
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(15, 23, 42);
  doc.text('Wali Kelas / Koordinator', sigX + 20, footerY + 14);
  doc.line(sigX, footerY + 50, sigX + 130, footerY + 50);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(100, 116, 139);
  doc.text('( ......................................... )', sigX + 15, footerY + 62);

  const cleanName = studentName.replace(/[^a-zA-Z0-9_-]/g, '_');
  const cleanMonth = monthStr.replace(/[^a-zA-Z0-9_-]/g, '_');
  savePdfDocument(doc, `Clearance_Checklist_${cleanName}_${cleanMonth}.pdf`);
}

/**
 * 2. Export Clearance Checklist to Word (.docx)
 */
export async function exportClearanceChecklistToDocx(
  studentName: string,
  className: string,
  items: ClearanceChecklistItem[],
  monthStr: string,
  schoolLevel: string = 'JUNIOR HIGH SCHOOL'
) {
  const tableRows: TableRow[] = [];

  // Header Row
  tableRows.push(
    new TableRow({
      tableHeader: true,
      cantSplit: true,
      children: [
        new TableCell({
          width: { size: 6, type: WidthType.PERCENTAGE },
          verticalAlign: VerticalAlign.CENTER,
          shading: { fill: 'FFC800', type: ShadingType.CLEAR },
          children: [
            new Paragraph({
              alignment: AlignmentType.CENTER,
              children: [new TextRun({ text: 'No.', bold: true, size: 20, color: '0F172A', font: 'Calibri' })],
            }),
          ],
        }),
        new TableCell({
          width: { size: 24, type: WidthType.PERCENTAGE },
          verticalAlign: VerticalAlign.CENTER,
          shading: { fill: 'FFC800', type: ShadingType.CLEAR },
          children: [
            new Paragraph({
              alignment: AlignmentType.LEFT,
              children: [new TextRun({ text: 'Mata Pelajaran', bold: true, size: 20, color: '0F172A', font: 'Calibri' })],
            }),
          ],
        }),
        new TableCell({
          width: { size: 36, type: WidthType.PERCENTAGE },
          verticalAlign: VerticalAlign.CENTER,
          shading: { fill: 'FFC800', type: ShadingType.CLEAR },
          children: [
            new Paragraph({
              alignment: AlignmentType.LEFT,
              children: [new TextRun({ text: 'Deskripsi Tugas', bold: true, size: 20, color: '0F172A', font: 'Calibri' })],
            }),
          ],
        }),
        new TableCell({
          width: { size: 20, type: WidthType.PERCENTAGE },
          verticalAlign: VerticalAlign.CENTER,
          shading: { fill: 'FFC800', type: ShadingType.CLEAR },
          children: [
            new Paragraph({
              alignment: AlignmentType.CENTER,
              children: [new TextRun({ text: 'Deadline', bold: true, size: 20, color: '0F172A', font: 'Calibri' })],
            }),
          ],
        }),
        new TableCell({
          width: { size: 14, type: WidthType.PERCENTAGE },
          verticalAlign: VerticalAlign.CENTER,
          shading: { fill: 'FFC800', type: ShadingType.CLEAR },
          children: [
            new Paragraph({
              alignment: AlignmentType.CENTER,
              children: [new TextRun({ text: 'Paraf Guru', bold: true, size: 20, color: '0F172A', font: 'Calibri' })],
            }),
          ],
        }),
      ],
    })
  );

  // Body Rows
  items.forEach((item, index) => {
    tableRows.push(
      new TableRow({
        cantSplit: true,
        children: [
          new TableCell({
            verticalAlign: VerticalAlign.CENTER,
            children: [
              new Paragraph({
                alignment: AlignmentType.CENTER,
                children: [new TextRun({ text: `${index + 1}.`, size: 20, font: 'Calibri' })],
              }),
            ],
          }),
          new TableCell({
            verticalAlign: VerticalAlign.CENTER,
            children: [
              new Paragraph({
                children: [new TextRun({ text: item.courseName, bold: true, size: 20, color: '0F172A', font: 'Calibri' })],
              }),
            ],
          }),
          new TableCell({
            verticalAlign: VerticalAlign.CENTER,
            children: [
              new Paragraph({
                children: [new TextRun({ text: item.taskTitle, size: 19, color: '0F172A', font: 'Calibri' })],
              }),
            ],
          }),
          new TableCell({
            verticalAlign: VerticalAlign.CENTER,
            children: [
              new Paragraph({
                alignment: AlignmentType.CENTER,
                children: [new TextRun({ text: item.dueDateStr, size: 18, color: '475569', font: 'Calibri' })],
              }),
            ],
          }),
          new TableCell({
            verticalAlign: VerticalAlign.CENTER,
            children: [
              new Paragraph({
                alignment: AlignmentType.CENTER,
                children: [new TextRun({ text: '', size: 20, font: 'Calibri' })], // Leave blank
              }),
            ],
          }),
        ],
      })
    );
  });

  const headerBannerTable = new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    borders: {
      top: { style: BorderStyle.SINGLE, size: 8, color: 'EAB308' },
      bottom: { style: BorderStyle.SINGLE, size: 8, color: 'EAB308' },
      left: { style: BorderStyle.SINGLE, size: 8, color: 'EAB308' },
      right: { style: BorderStyle.SINGLE, size: 8, color: 'EAB308' },
    },
    rows: [
      new TableRow({
        children: [
          new TableCell({
            width: { size: 100, type: WidthType.PERCENTAGE },
            verticalAlign: VerticalAlign.CENTER,
            shading: { fill: 'FFC800', type: ShadingType.CLEAR },
            children: [
              new Paragraph({
                alignment: AlignmentType.CENTER,
                children: [
                  new TextRun({
                    text: schoolLevel ? `MAKARIOS ${schoolLevel.toUpperCase()}` : 'MAKARIOS JUNIOR HIGH SCHOOL',
                    bold: true,
                    size: 20,
                    color: '0F172A',
                    font: 'Calibri',
                  }),
                ],
              }),
              new Paragraph({
                alignment: AlignmentType.CENTER,
                children: [
                  new TextRun({
                    text: 'Clearance Checklist',
                    bold: true,
                    size: 24,
                    color: '0F172A',
                    font: 'Calibri',
                  }),
                ],
              }),
            ],
          }),
        ],
      }),
    ],
  });

  const doc = new Document({
    sections: [
      {
        properties: {
          page: {
            margin: { top: 720, bottom: 720, left: 720, right: 720 },
          },
        },
        children: [
          headerBannerTable,
          new Paragraph({ text: '' }),
          new Paragraph({
            alignment: AlignmentType.CENTER,
            children: [
              new TextRun({
                text: studentName.toUpperCase(),
                bold: true,
                color: '2563EB',
                size: 28, // 14pt
                font: 'Calibri',
              }),
            ],
          }),
          new Paragraph({
            alignment: AlignmentType.CENTER,
            children: [
              new TextRun({
                text: className ? `Kelas: ${className}   |   Periode: ${monthStr}` : `Periode: ${monthStr}`,
                bold: true,
                color: '0F172A',
                size: 20,
                font: 'Calibri',
              }),
            ],
          }),
          new Paragraph({ text: '' }),
          new Table({
            width: { size: 100, type: WidthType.PERCENTAGE },
            borders: {
              top: { style: BorderStyle.SINGLE, size: 12, color: '64748B' },
              bottom: { style: BorderStyle.SINGLE, size: 12, color: '64748B' },
              left: { style: BorderStyle.SINGLE, size: 12, color: '64748B' },
              right: { style: BorderStyle.SINGLE, size: 12, color: '64748B' },
              insideHorizontal: { style: BorderStyle.SINGLE, size: 12, color: '94A3B8' },
              insideVertical: { style: BorderStyle.SINGLE, size: 6, color: 'CBD5E1' },
            },
            rows: tableRows,
          }),
          new Paragraph({ text: '' }),
          new Paragraph({
            children: [
              new TextRun({
                text: 'Catatan: Lembar Clearance Checklist ini digunakan sebagai bukti verifikasi dan paraf penyelesaian tugas oleh guru mata pelajaran.',
                italics: true,
                size: 18,
                color: '64748B',
                font: 'Calibri',
              }),
            ],
          }),
        ],
      },
    ],
  });

  const blob = await Packer.toBlob(doc);
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  const cleanName = studentName.replace(/[^a-zA-Z0-9_-]/g, '_');
  const cleanMonth = monthStr.replace(/[^a-zA-Z0-9_-]/g, '_');
  link.download = `Clearance_Checklist_${cleanName}_${cleanMonth}.docx`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/**
 * 3. Export Clearance Checklist to Excel (.xlsx)
 */
export function exportClearanceChecklistToXLSX(
  studentName: string,
  className: string,
  items: ClearanceChecklistItem[],
  monthStr: string
) {
  const wb = XLSX.utils.book_new();

  const excelRows: any[][] = [
    ['SEKOLAH KRISTEN MAKARIOS'],
    ['CLEARANCE CHECKLIST'],
    [`Nama: ${studentName}`, `Kelas: ${className || '-'}`, `Periode: ${monthStr}`],
    [], // Blank separator
    ['No', 'Mata Pelajaran', 'Deskripsi Tugas', 'Deadline', 'Paraf Guru'],
  ];

  items.forEach((item) => {
    excelRows.push([
      item.no,
      item.courseName,
      item.taskTitle,
      item.dueDateStr,
      '', // Leave blank for Paraf Guru
    ]);
  });

  excelRows.push([]);
  excelRows.push(['Catatan: Dokumen Clearance Checklist ini digunakan untuk verifikasi dan paraf guru mata pelajaran.']);

  const ws = XLSX.utils.aoa_to_sheet(excelRows);

  // Set column widths
  ws['!cols'] = [
    { wch: 6 },  // No
    { wch: 25 }, // Mata Pelajaran
    { wch: 45 }, // Deskripsi Tugas
    { wch: 22 }, // Deadline
    { wch: 15 }, // Paraf Guru
  ];

  XLSX.utils.book_append_sheet(wb, ws, 'Clearance Checklist');

  const cleanName = studentName.replace(/[^a-zA-Z0-9_-]/g, '_');
  const cleanMonth = monthStr.replace(/[^a-zA-Z0-9_-]/g, '_');
  XLSX.writeFile(wb, `Clearance_Checklist_${cleanName}_${cleanMonth}.xlsx`);
}
