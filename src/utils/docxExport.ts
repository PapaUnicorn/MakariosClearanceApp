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
import { StudentClearanceRecord } from '../types';

export async function exportStudentMonthlyReportDocx(
  studentName: string,
  records: StudentClearanceRecord[],
  schoolLevel: string = 'JUNIOR HIGH SCHOOL',
  monthYearStr?: string
) {
  const now = new Date();
  const currentMonth = monthYearStr || now.toLocaleDateString('en-US', {
    month: 'long',
    year: 'numeric',
  }).toUpperCase();

  // Group records by course for this student
  const tableRows: TableRow[] = [];

  // Table Header Row with Maybank Yellow theme (#FFC800 background, Slate 900 bold text)
  tableRows.push(
    new TableRow({
      tableHeader: true,
      children: [
        new TableCell({
          width: { size: 6, type: WidthType.PERCENTAGE },
          verticalAlign: VerticalAlign.CENTER,
          shading: {
            fill: 'FFC800', // Maybank Yellow
            type: ShadingType.CLEAR,
          },
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
          shading: {
            fill: 'FFC800', // Maybank Yellow
            type: ShadingType.CLEAR,
          },
          children: [
            new Paragraph({
              alignment: AlignmentType.LEFT,
              children: [new TextRun({ text: 'Subject', bold: true, size: 20, color: '0F172A', font: 'Calibri' })],
            }),
          ],
        }),
        new TableCell({
          width: { size: 14, type: WidthType.PERCENTAGE },
          verticalAlign: VerticalAlign.CENTER,
          shading: {
            fill: 'FFC800', // Maybank Yellow
            type: ShadingType.CLEAR,
          },
          children: [
            new Paragraph({
              alignment: AlignmentType.CENTER,
              children: [
                new TextRun({ text: 'Overall\nScore', bold: true, size: 20, color: '0F172A', font: 'Calibri' }),
              ],
            }),
          ],
        }),
        new TableCell({
          width: { size: 56, type: WidthType.PERCENTAGE },
          verticalAlign: VerticalAlign.CENTER,
          shading: {
            fill: 'FFC800', // Maybank Yellow
            type: ShadingType.CLEAR,
          },
          children: [
            new Paragraph({
              alignment: AlignmentType.LEFT,
              children: [
                new TextRun({ text: 'Missing Assignments', bold: true, size: 20, color: '0F172A', font: 'Calibri' }),
              ],
            }),
          ],
        }),
      ],
    })
  );

  // Table Body Rows
  records.forEach((record, index) => {
    // Missing assignments (clean list format without bullets/numbering)
    const missingTasks = record.unfinishedTasks;
    const missingParagraphs: Paragraph[] = [];

    if (missingTasks.length === 0) {
      missingParagraphs.push(
        new Paragraph({
          children: [
            new TextRun({
              text: 'None',
              italics: true,
              color: '16A34A',
              size: 20,
              font: 'Calibri',
            }),
          ],
        })
      );
    } else {
      missingTasks.forEach((task) => {
        const statusLabel =
          task.status === 'NOT_SUBMITTED' ? '(Belum Dikumpul)' : '(Menunggu Nilai)';
        const dueText =
          task.dueDateStr && task.dueDateStr !== 'Tanpa Batas Waktu' ? ` [${task.dueDateStr}]` : '';

        missingParagraphs.push(
          new Paragraph({
            spacing: { after: 80 },
            children: [
              new TextRun({
                text: `${task.title} `,
                bold: true,
                size: 20,
                color: '0F172A',
                font: 'Calibri',
              }),
              new TextRun({
                text: `${statusLabel}${dueText}`,
                size: 18,
                color: task.status === 'NOT_SUBMITTED' ? 'E11D48' : 'D97706',
                font: 'Calibri',
              }),
            ],
          })
        );
      });
    }

    // Overall Score text
    let overallScoreDisplay = '-';
    if (record.overallScore !== undefined && record.overallScore !== null) {
      overallScoreDisplay = `${record.overallScore}`;
    } else {
      // Calculate from graded tasks if available
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

    tableRows.push(
      new TableRow({
        children: [
          new TableCell({
            verticalAlign: VerticalAlign.TOP,
            children: [
              new Paragraph({
                alignment: AlignmentType.CENTER,
                children: [
                  new TextRun({
                    text: `${index + 1}.`,
                    size: 20,
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
                children: [
                  new TextRun({
                    text: record.courseName,
                    bold: true,
                    size: 20,
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
                    text: overallScoreDisplay,
                    bold: true,
                    size: 22,
                    font: 'Calibri',
                  }),
                ],
              }),
            ],
          }),
          new TableCell({
            verticalAlign: VerticalAlign.TOP,
            children: missingParagraphs,
          }),
        ],
      })
    );
  });

  // Footer / Signature Section in Word (2-column layout)
  const borderNone = {
    top: { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' },
    bottom: { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' },
    left: { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' },
    right: { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' },
  };

  const footerTable = new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    borders: borderNone,
    rows: [
      new TableRow({
        children: [
          // Left side: Automatic generation notice & print date
          new TableCell({
            width: { size: 60, type: WidthType.PERCENTAGE },
            verticalAlign: VerticalAlign.BOTTOM,
            borders: borderNone,
            children: [
              new Paragraph({
                children: [
                  new TextRun({
                    text: 'Dicetak secara otomatis melalui Makarios Clearance App.',
                    italics: true,
                    size: 18,
                    color: '64748B',
                    font: 'Calibri',
                  }),
                ],
              }),
              new Paragraph({
                children: [
                  new TextRun({
                    text: `Tanggal Cetak: ${now.toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}`,
                    size: 18,
                    color: '94A3B8',
                    font: 'Calibri',
                  }),
                ],
              }),
            ],
          }),
          // Right side: Teacher signature block
          new TableCell({
            width: { size: 40, type: WidthType.PERCENTAGE },
            verticalAlign: VerticalAlign.BOTTOM,
            borders: borderNone,
            children: [
              new Paragraph({
                alignment: AlignmentType.CENTER,
                children: [
                  new TextRun({
                    text: 'Wali Kelas / Guru',
                    bold: true,
                    size: 20,
                    color: '0F172A',
                    font: 'Calibri',
                  }),
                ],
              }),
              new Paragraph({ text: '' }),
              new Paragraph({ text: '' }),
              new Paragraph({ text: '' }),
              new Paragraph({
                alignment: AlignmentType.CENTER,
                children: [
                  new TextRun({
                    text: '( ..................................................... )',
                    size: 18,
                    color: '64748B',
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

  // Maybank Yellow Header Banner Table
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
            shading: {
              fill: 'FFC800', // Maybank Yellow
              type: ShadingType.CLEAR,
            },
            children: [
              new Paragraph({
                alignment: AlignmentType.CENTER,
                children: [
                  new TextRun({
                    text: 'MAKARIOS CHRISTIAN SCHOOL',
                    bold: true,
                    size: 24,
                    color: '0F172A',
                    font: 'Calibri',
                  }),
                ],
              }),
              new Paragraph({
                alignment: AlignmentType.CENTER,
                children: [
                  new TextRun({
                    text: schoolLevel.toUpperCase(),
                    bold: true,
                    size: 30,
                    color: '0F172A',
                    font: 'Calibri',
                  }),
                ],
              }),
              new Paragraph({
                alignment: AlignmentType.CENTER,
                children: [
                  new TextRun({
                    text: 'STUDENT MONTHLY LEARNING PROGRESS REPORT',
                    bold: true,
                    size: 20,
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
            margin: {
              top: 720,
              bottom: 720,
              left: 720,
              right: 720,
            },
          },
        },
        children: [
          // Yellow Header Banner
          headerBannerTable,

          new Paragraph({ text: '' }), // Spacer

          // Student Name (Blue)
          new Paragraph({
            alignment: AlignmentType.CENTER,
            children: [
              new TextRun({
                text: studentName.toUpperCase(),
                bold: true,
                color: '2563EB', // Blue
                size: 28,
                font: 'Calibri',
              }),
            ],
          }),

          // Month (Black)
          new Paragraph({
            alignment: AlignmentType.CENTER,
            children: [
              new TextRun({
                text: currentMonth,
                bold: true,
                color: '0F172A', // Black
                size: 22,
                font: 'Calibri',
              }),
            ],
          }),

          new Paragraph({ text: '' }), // Spacer

          // The Report Table
          new Table({
            width: {
              size: 100,
              type: WidthType.PERCENTAGE,
            },
            rows: tableRows,
          }),

          new Paragraph({ text: '' }), // Spacer
          new Paragraph({ text: '' }), // Spacer

          // Footer & Signature Section
          footerTable,
        ],
      },
    ],
  });

  const blob = await Packer.toBlob(doc);
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  const sanitized = studentName.replace(/[^a-zA-Z0-9_-]/g, '_');
  link.download = `Progress_Report_${sanitized}_${currentMonth.replace(/\s+/g, '_')}.docx`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
