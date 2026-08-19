import React, { useState } from 'react';
import { X, FileDown, Printer, FileText, CheckCircle2 } from 'lucide-react';
import { StudentClearanceRecord } from '../types';
import { exportStudentMonthlyProgressReportPDF } from '../utils/pdfExport';
import { exportStudentMonthlyReportDocx } from '../utils/docxExport';

interface StudentMonthlyReportModalProps {
  studentName: string;
  className: string;
  records: StudentClearanceRecord[];
  isOpen: boolean;
  onClose: () => void;
}

export const StudentMonthlyReportModal: React.FC<StudentMonthlyReportModalProps> = ({
  studentName,
  className,
  records,
  isOpen,
  onClose,
}) => {
  const [schoolLevel, setSchoolLevel] = useState<string>(
    className.toUpperCase().includes('10') ||
    className.toUpperCase().includes('11') ||
    className.toUpperCase().includes('12')
      ? 'SENIOR HIGH SCHOOL'
      : 'JUNIOR HIGH SCHOOL'
  );

  const now = new Date();
  const currentMonthStr = now
    .toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
    .toUpperCase();

  const [isExportingDocx, setIsExportingDocx] = useState(false);

  if (!isOpen || !studentName) return null;

  const handleExportPDF = () => {
    exportStudentMonthlyProgressReportPDF(studentName, records, schoolLevel, currentMonthStr);
  };

  const handleExportDocx = async () => {
    setIsExportingDocx(true);
    try {
      await exportStudentMonthlyReportDocx(studentName, records, schoolLevel, currentMonthStr);
    } catch (err) {
      console.error('Gagal mengekspor DOCX:', err);
    } finally {
      setIsExportingDocx(false);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div
      id="monthly-report-modal-backdrop"
      className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-2 sm:p-4 overflow-y-auto"
      onClick={onClose}
    >
      <div
        id="monthly-report-modal"
        className="bg-white border border-amber-300 rounded-2xl w-full max-w-4xl max-h-[92vh] flex flex-col shadow-2xl overflow-hidden my-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Top Control Bar - Maybank Signature Yellow & Slate */}
        <div className="px-5 py-3.5 bg-slate-950 text-white flex flex-wrap items-center justify-between gap-3 shrink-0 border-b-2 border-[#FFC800]">
          <div className="flex items-center space-x-2.5">
            <div className="p-1.5 bg-[#FFC800] text-slate-950 font-black rounded-lg shadow-xs">
              <FileText className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold leading-tight">Student Monthly Learning Progress Report</h3>
              <p className="text-[11px] text-amber-300/90 font-medium">Template Resmi Makarios Christian School</p>
            </div>
          </div>

          <div className="flex items-center space-x-2">
            <select
              value={schoolLevel}
              onChange={(e) => setSchoolLevel(e.target.value)}
              className="bg-slate-900 hover:bg-slate-800 text-amber-300 text-xs font-semibold px-2.5 py-1.5 rounded-lg border border-amber-500/40 focus:outline-none transition-colors cursor-pointer shadow-2xs"
            >
              <option value="JUNIOR HIGH SCHOOL">JUNIOR HIGH SCHOOL</option>
              <option value="SENIOR HIGH SCHOOL">SENIOR HIGH SCHOOL</option>
              <option value="ELEMENTARY SCHOOL">ELEMENTARY SCHOOL</option>
            </select>

            <button
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors cursor-pointer"
              title="Tutup"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Printable Report Document (Styled with HTML & Tailwind CSS - Maybank Golden Theme) */}
        <div className="p-4 sm:p-8 overflow-y-auto flex-1 bg-amber-50/30">
          <div
            id="printable-report-sheet"
            className="bg-white p-6 sm:p-10 border border-slate-200 rounded-xl shadow-xs max-w-3xl mx-auto font-sans text-slate-900"
          >
            {/* Header section with Maybank Yellow full-width banner */}
            <div className="mb-6">
              {/* Maybank Yellow Banner for School Titles */}
              <div className="bg-[#FFC800] text-slate-950 px-4 py-4 rounded-xl text-center shadow-xs space-y-0.5 border border-amber-400">
                <h1 className="text-sm sm:text-base font-extrabold tracking-widest uppercase">
                  MAKARIOS CHRISTIAN SCHOOL
                </h1>
                <h2 className="text-lg sm:text-xl font-black tracking-tight">
                  {schoolLevel}
                </h2>
                <h3 className="text-xs sm:text-sm font-black tracking-wider uppercase pt-0.5">
                  STUDENT MONTHLY LEARNING PROGRESS REPORT
                </h3>
              </div>

              {/* Student Name (Blue) & Month (Black) - Strictly nothing else */}
              <div className="text-center pt-5 space-y-1">
                <div className="text-xl sm:text-2xl font-black text-blue-600 tracking-wide uppercase">
                  {studentName}
                </div>
                <div className="text-sm sm:text-base font-black text-slate-950 tracking-wider">
                  {currentMonthStr}
                </div>
              </div>
            </div>

            {/* The Report Table with Maybank Yellow Header */}
            <div className="border border-slate-300 rounded-lg overflow-hidden shadow-2xs">
              <table className="w-full text-left border-collapse">
                <thead>
                  {/* Maybank Theme Distinct Table Header */}
                  <tr className="bg-[#FFC800] text-slate-950 text-xs uppercase tracking-wider font-black divide-x divide-amber-500/40 border-b border-amber-500">
                    <th className="py-3 px-3 w-[8%] text-center align-middle">No.</th>
                    <th className="py-3 px-3.5 w-[24%] text-left align-middle">Subject</th>
                    <th className="py-3 px-3 w-[14%] text-center align-middle leading-tight">
                      Overall<br />Score
                    </th>
                    <th className="py-3 px-4 w-[54%] text-left align-middle">Missing Assignments</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 text-xs bg-white">
                  {records.length === 0 ? (
                    <tr>
                      <td colSpan={4} className="py-8 text-center text-slate-400 italic">
                        Tidak ada data mata pelajaran untuk siswa ini.
                      </td>
                    </tr>
                  ) : (
                    records.map((rec, idx) => {
                      // Calculate overall score for subject
                      let overallScoreDisplay = '-';
                      if (rec.overallScore !== undefined && rec.overallScore !== null) {
                        overallScoreDisplay = `${rec.overallScore}`;
                      } else if (rec.overallScoreStr && rec.overallScoreStr !== '-') {
                        overallScoreDisplay = rec.overallScoreStr;
                      } else {
                        const graded = rec.allTasks.filter(
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

                      const missingTasks = rec.unfinishedTasks;

                      return (
                        <tr
                          key={rec.id || idx}
                          className={`divide-x divide-slate-200 align-top transition-colors ${
                            idx % 2 === 1 ? 'bg-amber-50/20' : 'bg-white'
                          }`}
                        >
                          {/* 1. No. */}
                          <td className="py-3 px-3 text-center font-bold text-slate-700 align-top">
                            {idx + 1}.
                          </td>

                          {/* 2. Compact Subject */}
                          <td className="py-3 px-3.5 font-bold text-slate-900 align-top leading-snug">
                            {rec.courseName}
                          </td>

                          {/* 3. Compact Overall Score */}
                          <td className="py-3 px-3 text-center align-top">
                            <span className="inline-block px-2.5 py-0.5 rounded-md font-black text-slate-950 bg-amber-100/80 border border-amber-200 text-xs sm:text-sm">
                              {overallScoreDisplay}
                            </span>
                          </td>

                          {/* 4. Expanded Missing Assignments (List format without bullets / numbering) */}
                          <td className="py-3 px-4 align-top">
                            {missingTasks.length === 0 ? (
                              <div className="text-emerald-700 font-semibold italic flex items-center space-x-1.5">
                                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                                <span>None</span>
                              </div>
                            ) : (
                              <div className="flex flex-col space-y-2">
                                {missingTasks.map((t, tIdx) => (
                                  <div
                                    key={t.courseWorkId || tIdx}
                                    className="p-2 rounded-lg bg-slate-50 border border-slate-200/80 flex flex-wrap items-center justify-between gap-1.5 text-slate-900"
                                  >
                                    <div className="font-semibold text-xs text-slate-900 leading-snug flex-1 min-w-[160px]">
                                      {t.title}
                                    </div>
                                    <div className="flex items-center space-x-1.5 shrink-0">
                                      {t.dueDateStr && t.dueDateStr !== 'Tanpa Batas Waktu' && (
                                        <span className="text-[10px] text-slate-500 font-medium bg-white px-1.5 py-0.5 rounded border border-slate-200">
                                          {t.dueDateStr}
                                        </span>
                                      )}
                                      <span
                                        className={`text-[10px] font-bold px-2 py-0.5 rounded-md border ${
                                          t.status === 'NOT_SUBMITTED'
                                            ? 'text-rose-700 bg-rose-50 border-rose-200'
                                            : 'text-amber-800 bg-amber-50 border-amber-200'
                                        }`}
                                      >
                                        {t.status === 'NOT_SUBMITTED'
                                          ? 'Belum Kumpul'
                                          : 'Menunggu Nilai'}
                                      </span>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            )}
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>

            {/* Report Footer / Signature Area & Automatic Print Notice */}
            <div className="mt-10 pt-4 border-t border-slate-200 flex justify-between items-end text-xs text-slate-500">
              <div>
                <p className="italic font-medium text-slate-600">
                  Dicetak secara otomatis melalui Makarios Clearance App.
                </p>
                <p className="text-[11px] text-slate-400 mt-0.5">
                  Tanggal Cetak: {now.toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}
                </p>
              </div>
              <div className="text-center w-44">
                <p className="font-bold text-slate-900 mb-12">Wali Kelas / Guru</p>
                <div className="border-b border-slate-400 mb-1"></div>
                <p className="text-[11px] text-slate-400 font-medium">( ..................................................... )</p>
              </div>
            </div>
          </div>
        </div>

        {/* Modal Bottom Action Buttons with Maybank Yellow theme */}
        <div className="p-4 bg-slate-50 border-t border-slate-200 flex flex-wrap items-center justify-between gap-3 shrink-0">
          <div className="text-xs text-slate-500 hidden sm:block">
            Ekspor laporan progres bulanan siswa dalam format PDF atau Word (.docx).
          </div>

          <div className="flex items-center space-x-2.5 ml-auto">
            <button
              onClick={handlePrint}
              className="inline-flex items-center space-x-1.5 px-3.5 py-2 bg-white hover:bg-amber-50 text-slate-800 text-xs font-bold rounded-xl border border-slate-200 shadow-2xs transition-all active:scale-95 cursor-pointer"
            >
              <Printer className="w-3.5 h-3.5 text-slate-600" />
              <span>Print Preview</span>
            </button>

            <button
              onClick={handleExportDocx}
              disabled={isExportingDocx}
              className="inline-flex items-center space-x-1.5 px-3.5 py-2 bg-amber-50 hover:bg-amber-100 text-amber-950 text-xs font-bold rounded-xl border border-amber-300 shadow-2xs transition-all active:scale-95 cursor-pointer disabled:opacity-50"
            >
              <FileDown className="w-3.5 h-3.5 text-amber-700" />
              <span>{isExportingDocx ? 'Membuat DOCX...' : 'Ekspor Word (.docx)'}</span>
            </button>

            <button
              onClick={handleExportPDF}
              className="inline-flex items-center space-x-1.5 px-4 py-2 bg-[#FFC800] hover:bg-amber-400 text-slate-950 text-xs font-black rounded-xl border border-amber-400 shadow-2xs transition-all active:scale-95 cursor-pointer"
            >
              <FileDown className="w-3.5 h-3.5 text-slate-950" />
              <span>Ekspor PDF</span>
            </button>

            <button
              onClick={onClose}
              className="px-3.5 py-2 bg-slate-200 hover:bg-slate-300 text-slate-700 text-xs font-bold rounded-xl transition-colors cursor-pointer"
            >
              Tutup
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
