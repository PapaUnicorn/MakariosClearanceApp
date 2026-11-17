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
  PageOrientation,
} from 'docx';
import * as XLSX from 'xlsx';
import { StudentClearanceRecord, StudentTaskItem } from '../types';
import { parseIndonesianDate } from './dateFilter';

export type TrackerDateFilter = 'ALL' | 'THIS_MONTH';
export type TrackerStatusCategory =
  | 'BELUM_DIKERJAKAN'
  | 'DISERAHKAN'
  | 'DINILAI'
  | 'TERLAMBAT';
export type TrackerStatusFilter = 'ALL' | TrackerStatusCategory;
export type TrackerSortOrder = 'RECENT_FIRST' | 'OLDEST_FIRST';

export interface TrackerAssignmentItem {
  id: string;
  subject: string;
  title: string;
  shortDescription: string;
  externalLink?: string;
  deadlineDate: string;
  deadlineTime: string;
  statusCategory: TrackerStatusCategory;
  statusLabel: string;
  hasDeadline: boolean;
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

function mapTaskToStatus(task: StudentTaskItem): {
  statusCategory: Exclude<TrackerStatusFilter, 'ALL'>;
  statusLabel: string;
} {
  if (task.status === 'GRADED' || task.status === 'RETURNED') {
    const scoreText =
      task.assignedGrade !== undefined && task.assignedGrade !== null
        ? `Dinilai (${task.assignedGrade}/${task.maxPoints || 100})`
        : 'Dinilai';
    return {
      statusCategory: 'DINILAI',
      statusLabel: scoreText,
    };
  }

  if (task.status === 'TURNED_IN_LATE' || (task.status === 'TURNED_IN' && task.late)) {
    return {
      statusCategory: 'TERLAMBAT',
      statusLabel: 'Terlambat',
    };
  }

  if (task.status === 'TURNED_IN' || task.status === 'WAITING_GRADE') {
    return {
      statusCategory: 'DISERAHKAN',
      statusLabel: 'Diserahkan',
    };
  }

  return {
    statusCategory: 'BELUM_DIKERJAKAN',
    statusLabel: 'Belum Dikerjakan',
  };
}

function extractDeadlineParts(task: StudentTaskItem): {
  deadlineDate: string;
  deadlineTime: string;
  hasDeadline: boolean;
  timestamp: number;
  year?: number;
  month?: number;
} {
  if (task.dueYear && task.dueMonth && task.dueDay) {
    const d = new Date(task.dueYear, task.dueMonth - 1, task.dueDay);
    const deadlineDate = d.toLocaleDateString('id-ID', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });

    let hours = task.dueHour;
    let mins = task.dueMinute;
    if (hours === undefined && task.dueDateStr) {
      const timeMatch = task.dueDateStr.match(/\b(\d{1,2}):(\d{2})\b/);
      if (timeMatch) {
        hours = parseInt(timeMatch[1], 10);
        mins = parseInt(timeMatch[2], 10);
      }
    }

    const deadlineTime =
      hours !== undefined
        ? `${String(hours).padStart(2, '0')}:${String(mins || 0).padStart(2, '0')}`
        : '-';

    const ts = new Date(
      task.dueYear,
      task.dueMonth - 1,
      task.dueDay,
      hours !== undefined ? hours : 23,
      mins !== undefined ? mins : 59,
      0
    ).getTime();

    return {
      deadlineDate,
      deadlineTime,
      hasDeadline: true,
      timestamp: ts,
      year: task.dueYear,
      month: task.dueMonth,
    };
  }

  if (task.dueDateStr && task.dueDateStr !== 'Tanpa batas waktu' && task.dueDateStr !== 'Tanpa Batas Waktu') {
    const timeMatch = task.dueDateStr.match(/\b(\d{1,2}):(\d{2})\b/);
    const deadlineTime = timeMatch
      ? `${timeMatch[1].padStart(2, '0')}:${timeMatch[2]}`
      : '-';
    const deadlineDate = task.dueDateStr.replace(/\b\d{1,2}:\d{2}\b/, '').trim();
    const parsed = parseIndonesianDate(task.dueDateStr);

    if (parsed?.year && parsed?.month) {
      const h = timeMatch ? parseInt(timeMatch[1], 10) : 23;
      const m = timeMatch ? parseInt(timeMatch[2], 10) : 59;
      return {
        deadlineDate: deadlineDate || task.dueDateStr,
        deadlineTime,
        hasDeadline: true,
        timestamp: new Date(parsed.year, parsed.month - 1, parsed.day || 1, h, m, 0).getTime(),
        year: parsed.year,
        month: parsed.month,
      };
    }

    return {
      deadlineDate: deadlineDate || task.dueDateStr,
      deadlineTime,
      hasDeadline: false,
      timestamp: 0,
    };
  }

  let fallbackYear: number | undefined;
  let fallbackMonth: number | undefined;
  if (task.creationTime) {
    const cd = new Date(task.creationTime);
    if (!isNaN(cd.getTime())) {
      fallbackYear = cd.getFullYear();
      fallbackMonth = cd.getMonth() + 1;
    }
  }

  return {
    deadlineDate: 'Tanpa batas waktu',
    deadlineTime: '-',
    hasDeadline: false,
    timestamp: 0,
    year: fallbackYear,
    month: fallbackMonth,
  };
}

function summarizeDescription(desc?: string): string {
  if (!desc) return '';
  const cleaned = desc.replace(/\s+/g, ' ').trim();
  if (cleaned.length <= 140) return cleaned;
  return `${cleaned.slice(0, 137)}...`;
}

export function buildTrackerAssignments(
  studentRecords: StudentClearanceRecord[],
  dateFilter: TrackerDateFilter,
  selectedStatuses: TrackerStatusCategory[],
  sortOrder: TrackerSortOrder
): TrackerAssignmentItem[] {
  const now = new Date();
  const currentYear = now.getFullYear();
  const currentMonth = now.getMonth() + 1;

  const items: TrackerAssignmentItem[] = [];

  studentRecords.forEach((rec) => {
    rec.allTasks.forEach((task, idx) => {
      const { deadlineDate, deadlineTime, hasDeadline, timestamp, year, month } =
        extractDeadlineParts(task);

      if (dateFilter === 'THIS_MONTH') {
        if (year !== currentYear || month !== currentMonth) {
          return;
        }
      }

      const { statusCategory, statusLabel } = mapTaskToStatus(task);

      if (!selectedStatuses.includes(statusCategory)) {
        return;
      }

      items.push({
        id: `${rec.courseId}_${task.courseWorkId}_${idx}`,
        subject: rec.courseName,
        title: task.title,
        shortDescription: summarizeDescription(task.description),
        externalLink: task.alternateLink || rec.courseLink,
        deadlineDate,
        deadlineTime,
        statusCategory,
        statusLabel,
        hasDeadline,
        timestamp,
      });
    });
  });

  items.sort((a, b) => {
    if (a.hasDeadline && !b.hasDeadline) return -1;
    if (!a.hasDeadline && b.hasDeadline) return 1;
    if (!a.hasDeadline && !b.hasDeadline) {
      return a.subject.localeCompare(b.subject);
    }

    if (sortOrder === 'RECENT_FIRST') {
      return b.timestamp - a.timestamp;
    }
    return a.timestamp - b.timestamp;
  });

  return items;
}

/**
 * 1. Export Classroom Assignment Tracker to PDF (A4 Portrait, Clean White Design, No Links)
 */
export function exportTrackerToPDF(
  studentName: string,
  className: string,
  items: TrackerAssignmentItem[]
) {
  const doc = initJsPDF({
    orientation: 'portrait',
    unit: 'pt',
    format: 'a4',
  });

  const pageWidth = doc.internal.pageSize.width;
  const pageHeight = doc.internal.pageSize.height;

  // Title & Identity
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(15);
  doc.setTextColor(15, 23, 42);
  doc.text('Classroom Assignment Tracker', 32, 38);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10.5);
  doc.setTextColor(30, 41, 59);
  const nameLine = className ? `Name: ${studentName} (${className})` : `Name: ${studentName}`;
  doc.text(nameLine, 32, 56);

  const tableData = items.map((item) => {
    const descParts = [item.title];
    if (item.shortDescription) descParts.push(item.shortDescription);

    return [
      item.subject,
      descParts.join('\n'),
      item.deadlineDate,
      item.deadlineTime,
      item.statusLabel,
      '', // Paraf Guru Mata Pelajaran
      '', // Paraf Orangtua
    ];
  });

  runAutoTable(doc, {
    startY: 70,
    head: [
      [
        'Subject',
        'Description',
        'Deadline Tanggal',
        'Deadline Waktu',
        'Assignment Status',
        'Paraf Guru Mata Pelajaran',
        'Paraf Orangtua',
      ],
    ],
    body:
      tableData.length > 0
        ? tableData
        : [['-', 'Tidak ada assignment untuk filter yang dipilih', '-', '-', '-', '', '']],
    theme: 'grid',
    rowPageBreak: 'avoid',
    showHead: 'everyPage',
    headStyles: {
      fillColor: [248, 250, 252], // Slate 50
      textColor: [15, 23, 42],
      fontSize: 8,
      fontStyle: 'bold',
      halign: 'left',
      valign: 'middle',
      lineColor: [148, 163, 184],
      lineWidth: 0.7,
      cellPadding: 5,
    },
    styles: {
      fontSize: 8,
      cellPadding: 5,
      overflow: 'linebreak',
      valign: 'top',
      halign: 'left',
      lineColor: [203, 213, 225],
      lineWidth: 0.6,
      textColor: [15, 23, 42],
    },
    columnStyles: {
      0: { cellWidth: 74, fontStyle: 'bold' },
      1: { cellWidth: 165 },
      2: { cellWidth: 64, halign: 'center' },
      3: { cellWidth: 48, halign: 'center' },
      4: { cellWidth: 74, halign: 'center', fontStyle: 'bold' },
      5: { cellWidth: 56, halign: 'center' },
      6: { cellWidth: 50, halign: 'center' },
    },
    margin: { left: 32, right: 32, bottom: 32 },
  });

  // Signatures Area (Student & Homeroom Teacher) directly under the table
  const finalY = (doc as any).lastAutoTable?.finalY || 130;
  let sigY = finalY + 30;

  if (sigY + 85 > pageHeight) {
    doc.addPage();
    sigY = 48;
  }

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9.5);
  doc.setTextColor(15, 23, 42);

  // Left: Student Signature
  const leftCenterX = 135;
  doc.text('Student Signature', leftCenterX, sigY, { align: 'center' });
  doc.setDrawColor(148, 163, 184);
  doc.line(leftCenterX - 70, sigY + 50, leftCenterX + 70, sigY + 50);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.text(`( ${studentName} )`, leftCenterX, sigY + 64, { align: 'center' });

  // Right: Homeroom Teacher Signature
  const rightCenterX = pageWidth - 135;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9.5);
  doc.text('Homeroom Teacher Signature', rightCenterX, sigY, { align: 'center' });
  doc.line(rightCenterX - 70, sigY + 50, rightCenterX + 70, sigY + 50);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.text('( ........................................... )', rightCenterX, sigY + 64, {
    align: 'center',
  });

  const cleanName = studentName.replace(/[^a-zA-Z0-9_-]/g, '_');
  savePdfDocument(doc, `Assignment_Tracker_${cleanName}.pdf`);
}

/**
 * 2. Export Classroom Assignment Tracker to Word (.docx)
 */
export async function exportTrackerToDocx(
  studentName: string,
  className: string,
  items: TrackerAssignmentItem[]
) {
  const headerTitles = [
    { text: 'Subject', pct: 15 },
    { text: 'Description', pct: 31 },
    { text: 'Deadline Tanggal', pct: 12 },
    { text: 'Deadline Waktu', pct: 9 },
    { text: 'Assignment Status', pct: 13 },
    { text: 'Paraf Guru Mata Pelajaran', pct: 10 },
    { text: 'Paraf Orangtua', pct: 10 },
  ];

  const tableRows: TableRow[] = [];

  tableRows.push(
    new TableRow({
      tableHeader: true,
      cantSplit: true,
      children: headerTitles.map(
        (h) =>
          new TableCell({
            width: { size: h.pct, type: WidthType.PERCENTAGE },
            verticalAlign: VerticalAlign.CENTER,
            shading: { fill: 'F8FAFC', type: ShadingType.CLEAR },
            children: [
              new Paragraph({
                alignment: AlignmentType.LEFT,
                children: [
                  new TextRun({
                    text: h.text,
                    bold: true,
                    size: 17,
                    color: '0F172A',
                    font: 'Calibri',
                  }),
                ],
              }),
            ],
          })
      ),
    })
  );

  if (items.length === 0) {
    tableRows.push(
      new TableRow({
        children: [
          new TableCell({
            columnSpan: 7,
            children: [
              new Paragraph({
                alignment: AlignmentType.CENTER,
                children: [
                  new TextRun({
                    text: 'Tidak ada assignment untuk filter yang dipilih.',
                    italics: true,
                    size: 18,
                    color: '64748B',
                    font: 'Calibri',
                  }),
                ],
              }),
            ],
          }),
        ],
      })
    );
  } else {
    items.forEach((item) => {
      const descChildren: Paragraph[] = [
        new Paragraph({
          children: [
            new TextRun({
              text: item.title,
              bold: true,
              size: 17,
              color: '0F172A',
              font: 'Calibri',
            }),
          ],
        }),
      ];

      if (item.shortDescription) {
        descChildren.push(
          new Paragraph({
            spacing: { before: 40 },
            children: [
              new TextRun({
                text: item.shortDescription,
                size: 15,
                color: '475569',
                font: 'Calibri',
              }),
            ],
          })
        );
      }

      tableRows.push(
        new TableRow({
          cantSplit: true,
          children: [
            new TableCell({
              verticalAlign: VerticalAlign.TOP,
              children: [
                new Paragraph({
                  children: [
                    new TextRun({
                      text: item.subject,
                      bold: true,
                      size: 18,
                      color: '0F172A',
                      font: 'Calibri',
                    }),
                  ],
                }),
              ],
            }),
            new TableCell({
              verticalAlign: VerticalAlign.TOP,
              children: descChildren,
            }),
            new TableCell({
              verticalAlign: VerticalAlign.TOP,
              children: [
                new Paragraph({
                  alignment: AlignmentType.CENTER,
                  children: [
                    new TextRun({
                      text: item.deadlineDate,
                      size: 18,
                      color: '334155',
                      font: 'Calibri',
                    }),
                  ],
                }),
              ],
            }),
            new TableCell({
              verticalAlign: VerticalAlign.TOP,
              children: [
                new Paragraph({
                  alignment: AlignmentType.CENTER,
                  children: [
                    new TextRun({
                      text: item.deadlineTime,
                      size: 18,
                      color: '334155',
                      font: 'Calibri',
                    }),
                  ],
                }),
              ],
            }),
            new TableCell({
              verticalAlign: VerticalAlign.TOP,
              children: [
                new Paragraph({
                  alignment: AlignmentType.CENTER,
                  children: [
                    new TextRun({
                      text: item.statusLabel,
                      bold: true,
                      size: 18,
                      color: '0F172A',
                      font: 'Calibri',
                    }),
                  ],
                }),
              ],
            }),
            new TableCell({
              verticalAlign: VerticalAlign.CENTER,
              children: [new Paragraph({ text: '' })],
            }),
            new TableCell({
              verticalAlign: VerticalAlign.CENTER,
              children: [new Paragraph({ text: '' })],
            }),
          ],
        })
      );
    });
  }

  // Signature table underneath (Student & Homeroom Teacher)
  const signatureTable = new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    borders: {
      top: { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' },
      bottom: { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' },
      left: { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' },
      right: { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' },
      insideHorizontal: { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' },
      insideVertical: { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' },
    },
    rows: [
      new TableRow({
        children: [
          new TableCell({
            width: { size: 50, type: WidthType.PERCENTAGE },
            children: [
              new Paragraph({
                alignment: AlignmentType.CENTER,
                children: [
                  new TextRun({
                    text: 'Student Signature',
                    bold: true,
                    size: 20,
                    font: 'Calibri',
                    color: '0F172A',
                  }),
                ],
              }),
              new Paragraph({ text: '' }),
              new Paragraph({ text: '' }),
              new Paragraph({
                alignment: AlignmentType.CENTER,
                children: [
                  new TextRun({
                    text: '______________________________',
                    size: 18,
                    color: '64748B',
                    font: 'Calibri',
                  }),
                ],
              }),
              new Paragraph({
                alignment: AlignmentType.CENTER,
                children: [
                  new TextRun({
                    text: `( ${studentName} )`,
                    size: 18,
                    color: '334155',
                    font: 'Calibri',
                  }),
                ],
              }),
            ],
          }),
          new TableCell({
            width: { size: 50, type: WidthType.PERCENTAGE },
            children: [
              new Paragraph({
                alignment: AlignmentType.CENTER,
                children: [
                  new TextRun({
                    text: 'Homeroom Teacher Signature',
                    bold: true,
                    size: 20,
                    font: 'Calibri',
                    color: '0F172A',
                  }),
                ],
              }),
              new Paragraph({ text: '' }),
              new Paragraph({ text: '' }),
              new Paragraph({
                alignment: AlignmentType.CENTER,
                children: [
                  new TextRun({
                    text: '______________________________',
                    size: 18,
                    color: '64748B',
                    font: 'Calibri',
                  }),
                ],
              }),
              new Paragraph({
                alignment: AlignmentType.CENTER,
                children: [
                  new TextRun({
                    text: '( ........................................... )',
                    size: 18,
                    color: '334155',
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
            size: {
              orientation: PageOrientation.PORTRAIT,
            },
            margin: { top: 600, bottom: 600, left: 540, right: 540 },
          },
        },
        children: [
          new Paragraph({
            spacing: { after: 80 },
            children: [
              new TextRun({
                text: 'Classroom Assignment Tracker',
                bold: true,
                size: 32,
                color: '0F172A',
                font: 'Calibri',
              }),
            ],
          }),
          new Paragraph({
            spacing: { after: 200 },
            children: [
              new TextRun({
                text: className ? `Name: ${studentName} (${className})` : `Name: ${studentName}`,
                bold: true,
                size: 22,
                color: '334155',
                font: 'Calibri',
              }),
            ],
          }),
          new Table({
            width: { size: 100, type: WidthType.PERCENTAGE },
            borders: {
              top: { style: BorderStyle.SINGLE, size: 6, color: 'CBD5E1' },
              bottom: { style: BorderStyle.SINGLE, size: 6, color: 'CBD5E1' },
              left: { style: BorderStyle.SINGLE, size: 6, color: 'CBD5E1' },
              right: { style: BorderStyle.SINGLE, size: 6, color: 'CBD5E1' },
              insideHorizontal: { style: BorderStyle.SINGLE, size: 6, color: 'E2E8F0' },
              insideVertical: { style: BorderStyle.SINGLE, size: 6, color: 'E2E8F0' },
            },
            rows: tableRows,
          }),
          new Paragraph({ text: '' }),
          new Paragraph({ text: '' }),
          signatureTable,
        ],
      },
    ],
  });

  const blob = await Packer.toBlob(doc);
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  const cleanName = studentName.replace(/[^a-zA-Z0-9_-]/g, '_');
  link.download = `Assignment_Tracker_${cleanName}.docx`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/**
 * 3. Export Classroom Assignment Tracker to Excel (.xlsx)
 */
export function exportTrackerToXLSX(
  studentName: string,
  className: string,
  items: TrackerAssignmentItem[]
) {
  const wb = XLSX.utils.book_new();

  const rows: any[][] = [
    ['Classroom Assignment Tracker'],
    [className ? `Name: ${studentName} (${className})` : `Name: ${studentName}`],
    [],
    [
      'Subject',
      'Description',
      'Deadline Tanggal',
      'Deadline Waktu',
      'Assignment Status',
      'Paraf Guru Mata Pelajaran',
      'Paraf Orangtua',
    ],
  ];

  items.forEach((item) => {
    const descParts = [item.title];
    if (item.shortDescription) descParts.push(item.shortDescription);
    if (item.externalLink) descParts.push(`Link: ${item.externalLink}`);

    rows.push([
      item.subject,
      descParts.join(' — '),
      item.deadlineDate,
      item.deadlineTime,
      item.statusLabel,
      '', // Paraf Guru Mata Pelajaran
      '', // Paraf Orangtua
    ]);
  });

  rows.push([]);
  rows.push([]);
  rows.push(['Student Signature', '', '', '', 'Homeroom Teacher Signature']);
  rows.push([]);
  rows.push([`( ${studentName} )`, '', '', '', '( ........................................ )']);

  const ws = XLSX.utils.aoa_to_sheet(rows);
  ws['!cols'] = [
    { wch: 24 }, // Subject
    { wch: 48 }, // Description
    { wch: 18 }, // Deadline Tanggal
    { wch: 15 }, // Deadline Waktu
    { wch: 20 }, // Assignment Status
    { wch: 24 }, // Paraf Guru Mata Pelajaran
    { wch: 18 }, // Paraf Orangtua
  ];

  XLSX.utils.book_append_sheet(wb, ws, 'Assignment Tracker');

  const cleanName = studentName.replace(/[^a-zA-Z0-9_-]/g, '_');
  XLSX.writeFile(wb, `Assignment_Tracker_${cleanName}.xlsx`);
}
