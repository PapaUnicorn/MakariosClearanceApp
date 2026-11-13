import React, { useState, useMemo } from 'react';
import { X, FileDown, Printer, FileText, Calendar, CheckSquare, FileSpreadsheet } from 'lucide-react';
import { StudentClearanceRecord } from '../types';
import {
  getClearanceChecklistItems,
  exportClearanceChecklistToPDF,
  exportClearanceChecklistToDocx,
  exportClearanceChecklistToXLSX,
  ClearanceChecklistItem,
} from '../utils/checklistExport';

interface ClearanceChecklistModalProps {
  studentName: string;
  className: string;
  records: StudentClearanceRecord[];
  isOpen: boolean;
  onClose: () => void;
  initialYear?: number;
  initialMonth?: number;
}

const MONTH_OPTIONS = [
  { value: 1, label: 'JANUARY' },
  { value: 2, label: 'FEBRUARY' },
  { value: 3, label: 'MARCH' },
  { value: 4, label: 'APRIL' },
  { value: 5, label: 'MAY' },
  { value: 6, label: 'JUNE' },
  { value: 7, label: 'JULY' },
  { value: 8, label: 'AUGUST' },
  { value: 9, label: 'SEPTEMBER' },
  { value: 10, label: 'OCTOBER' },
  { value: 11, label: 'NOVEMBER' },
  { value: 12, label: 'DECEMBER' },
];

export const ClearanceChecklistModal: React.FC<ClearanceChecklistModalProps> = ({
  studentName,
  className,
  records,
  isOpen,
  onClose,
  initialYear,
  initialMonth,
}) => {
  const [schoolLevel, setSchoolLevel] = useState<string>(
    className.toUpperCase().includes('10') ||
    className.toUpperCase().includes('11') ||
    className.toUpperCase().includes('12')
      ? 'SENIOR HIGH SCHOOL'
      : 'JUNIOR HIGH SCHOOL'
  );

  const now = new Date();
  const [selectedMonth, setSelectedMonth] = useState<number>(initialMonth || now.getMonth() + 1); // 1-12
  const [selectedYear, setSelectedYear] = useState<number>(initialYear || now.getFullYear());
  const [isExportingDocx, setIsExportingDocx] = useState(false);

  React.useEffect(() => {
    if (isOpen) {
      if (initialMonth) setSelectedMonth(initialMonth);
      if (initialYear) setSelectedYear(initialYear);
    }
  }, [isOpen, initialMonth, initialYear]);

  const currentMonthStr = `${MONTH_OPTIONS.find((m) => m.value === selectedMonth)?.label || 'NOVEMBER'} ${selectedYear}`;

  // Filter tasks for this month and sort ascending: earliest deadline (termuda) to latest deadline (tertua)
  const checklistItems: ClearanceChecklistItem[] = useMemo(() => {
    return getClearanceChecklistItems(records, selectedYear, selectedMonth);
  }, [records, selectedYear, selectedMonth]);

  if (!isOpen || !studentName) return null;

  const handlePrint = () => {
    window.print();
  };

  const handleExportPDF = () => {
    exportClearanceChecklistToPDF(
      studentName,
      className,
      checklistItems,
      currentMonthStr,
      schoolLevel
    );
  };

  const handleExportDocx = async () => {
    setIsExportingDocx(true);
    try {
      await exportClearanceChecklistToDocx(
        studentName,
        className,
        checklistItems,
        currentMonthStr,
        schoolLevel
      );
    } catch (err) {
      console.error('Gagal mengekspor DOCX Checklist:', err);
    } finally {
      setIsExportingDocx(false);
    }
  };

  const handleExportXLSX = () => {
    exportClearanceChecklistToXLSX(
      studentName,
      className,
      checklistItems,
      currentMonthStr
    );
  };

  return (
    <div
      id="clearance-checklist-modal-backdrop"
      className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-2 sm:p-4 overflow-y-auto"
      onClick={onClose}
    >
      <div
        id="clearance-checklist-modal"
        className="bg-white border border-amber-300 rounded-2xl w-full max-w-4xl max-h-[92vh] flex flex-col shadow-2xl overflow-hidden my-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Top Control Bar */}
        <div className="px-5 py-3.5 bg-slate-950 text-white flex flex-wrap items-center justify-between gap-3 shrink-0 border-b-2 border-[#FFC800]">
          <div className="flex items-center space-x-2.5">
            <div className="p-1.5 bg-[#FFC800] text-slate-950 font-black rounded-lg shadow-xs">
              <CheckSquare className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold leading-tight">Clearance Checklist</h3>
              <p className="text-[11px] text-amber-300 font-bold uppercase tracking-wider">{studentName}</p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {/* Month & Year Filter Selector */}
            <div className="flex items-center space-x-1.5 bg-slate-900 px-2.5 py-1 rounded-lg border border-amber-500/40">
              <Calendar className="w-3.5 h-3.5 text-[#FFC800]" />
              <select
                value={selectedMonth}
                onChange={(e) => setSelectedMonth(Number(e.target.value))}
                className="bg-transparent text-amber-300 text-xs font-bold focus:outline-none cursor-pointer"
                title="Pilih Bulan Checklist"
              >
                {MONTH_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value} className="bg-slate-900 text-white">
                    {opt.label}
                  </option>
                ))}
              </select>
              <select
                value={selectedYear}
                onChange={(e) => setSelectedYear(Number(e.target.value))}
                className="bg-transparent text-amber-300 text-xs font-bold focus:outline-none cursor-pointer"
                title="Pilih Tahun"
              >
                {[selectedYear - 1, selectedYear, selectedYear + 1].map((yr) => (
                  <option key={yr} value={yr} className="bg-slate-900 text-white">
                    {yr}
                  </option>
                ))}
              </select>
            </div>

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

        {/* Printable Document Container (A4 Printable) */}
        <div className="p-4 sm:p-8 overflow-y-auto flex-1 bg-amber-50/30">
          <div
            id="printable-clearance-checklist"
            style={{ fontSize: '10pt' }}
            className="bg-white p-6 sm:p-10 border border-slate-200 rounded-xl shadow-xs max-w-3xl mx-auto font-sans text-slate-900 text-[10pt]"
          >
            {/* Header Section */}
            <div className="mb-6">
              {/* Maybank Yellow Banner */}
              <div className="bg-[#FFC800] text-slate-950 px-4 py-3 rounded-xl text-center shadow-xs space-y-1 border border-amber-400">
                <h1 className="text-[10pt] font-black tracking-wide uppercase">
                  {schoolLevel ? `MAKARIOS ${schoolLevel.toUpperCase()}` : 'MAKARIOS JUNIOR HIGH SCHOOL'}
                </h1>
                <h2 className="text-[12pt] font-black uppercase tracking-wider">
                  Clearance Checklist
                </h2>
              </div>

              {/* Student Name & Details */}
              <div className="text-center pt-4 space-y-1.5">
                <div className="text-[16pt] sm:text-[18pt] font-black text-blue-600 tracking-wider uppercase leading-snug print:text-[18pt]">
                  {studentName}
                </div>
                <div className="text-[10.5pt] font-bold text-slate-950 tracking-normal">
                  {className ? `Kelas: ${className}   •   Periode: ${currentMonthStr}` : `Periode: ${currentMonthStr}`}
                </div>
              </div>
            </div>

            {/* Checklist Table */}
            <div className="border-2 border-slate-400 rounded-lg overflow-hidden shadow-2xs">
              <table className="w-full text-left border-collapse text-[10pt]">
                <thead>
                  <tr className="bg-[#FFC800] text-slate-950 text-[10pt] uppercase tracking-wider font-black divide-x-2 divide-amber-600/50 border-b-2 border-amber-600">
                    <th className="py-2.5 px-3 w-[7%] text-center align-middle text-[10pt]">No.</th>
                    <th className="py-2.5 px-3.5 w-[25%] text-left align-middle text-[10pt]">Mata Pelajaran</th>
                    <th className="py-2.5 px-4 w-[38%] text-left align-middle text-[10pt]">Deskripsi Tugas</th>
                    <th className="py-2.5 px-3 w-[18%] text-center align-middle text-[10pt]">Deadline</th>
                    <th className="py-2.5 px-3 w-[12%] text-center align-middle text-[10pt]">Paraf Guru</th>
                  </tr>
                </thead>
                <tbody className="divide-y-2 divide-slate-300 text-[10pt] bg-white">
                  {checklistItems.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="py-8 text-center text-slate-400 italic text-[10pt]">
                        Tidak ada tugas yang terdaftar pada bulan {currentMonthStr}.
                      </td>
                    </tr>
                  ) : (
                    checklistItems.map((item, idx) => (
                      <tr
                        key={idx}
                        style={{ breakInside: 'avoid', pageBreakInside: 'avoid' }}
                        className={`divide-x-2 divide-slate-300 border-b-2 border-slate-300 align-middle transition-colors break-inside-avoid ${
                          idx % 2 === 1 ? 'bg-amber-50/20' : 'bg-white'
                        }`}
                      >
                        {/* 1. No. */}
                        <td className="py-3 px-3 text-center font-bold text-slate-700 align-middle text-[10pt]">
                          {item.no}.
                        </td>

                        {/* 2. Mata Pelajaran */}
                        <td className="py-3 px-3.5 font-bold text-slate-900 align-middle leading-snug text-[10pt]">
                          {item.courseName}
                        </td>

                        {/* 3. Deskripsi Tugas */}
                        <td className="py-3 px-4 align-middle text-[10pt] text-slate-900 leading-snug font-medium">
                          • {item.taskTitle}
                        </td>

                        {/* 4. Deadline (Urut dari termuda ke tertua) */}
                        <td className="py-3 px-3 text-center align-middle text-[10pt] text-slate-700 font-semibold">
                          {item.dueDateStr}
                        </td>

                        {/* 5. Paraf Guru (Leave blank for physical signature) */}
                        <td className="py-3 px-3 text-center align-middle text-[10pt]">
                          <div className="w-12 h-8 mx-auto border border-dashed border-slate-300 rounded-md"></div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            {/* Footer / Notes & Signature */}
            <div className="report-footer-signature mt-8 pt-4 border-t border-slate-200 flex justify-between items-end text-[10pt] text-slate-500">
              <div className="max-w-[65%]">
                <p className="italic font-medium text-slate-600 text-[10pt]">
                  Catatan: Lembar Clearance Checklist ini digunakan sebagai verifikasi dan paraf penyelesaian tugas oleh guru mata pelajaran.
                </p>
                <p className="text-[10pt] text-slate-400 mt-0.5">
                  Tanggal Cetak: {now.toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}
                </p>
              </div>
              <div className="text-center w-48 shrink-0">
                <p className="font-bold text-slate-900 mb-12 text-[10pt]">Wali Kelas / Koordinator</p>
                <div className="border-b border-slate-400 mb-1"></div>
                <p className="text-[10pt] text-slate-400 font-medium">( ..................................................... )</p>
              </div>
            </div>
          </div>
        </div>

        {/* Modal Bottom Action Bar */}
        <div className="p-4 bg-slate-50 border-t border-slate-200 flex flex-wrap items-center justify-between gap-3 shrink-0">
          <div className="text-xs text-slate-500 hidden sm:block">
            Ekspor Clearance Checklist ke dalam format PDF, Word (.docx), atau Excel (.xlsx).
          </div>

          <div className="flex flex-wrap items-center gap-2 ml-auto">
            {/* Print Preview */}
            <button
              onClick={handlePrint}
              className="inline-flex items-center space-x-1.5 px-3 py-2 bg-white hover:bg-amber-50 text-slate-800 text-xs font-bold rounded-xl border border-slate-200 shadow-2xs transition-all active:scale-95 cursor-pointer"
            >
              <Printer className="w-3.5 h-3.5 text-slate-600" />
              <span>Print Preview</span>
            </button>

            {/* Export to PDF */}
            <button
              onClick={handleExportPDF}
              className="inline-flex items-center space-x-1.5 px-3.5 py-2 bg-[#FFC800] hover:bg-amber-400 text-slate-950 text-xs font-black rounded-xl border border-amber-400 shadow-2xs transition-all active:scale-95 cursor-pointer"
            >
              <FileDown className="w-3.5 h-3.5 text-slate-950" />
              <span>Export to PDF</span>
            </button>

            {/* Export to Docs */}
            <button
              onClick={handleExportDocx}
              disabled={isExportingDocx}
              className="inline-flex items-center space-x-1.5 px-3.5 py-2 bg-slate-900 hover:bg-slate-800 disabled:opacity-50 text-amber-300 text-xs font-bold rounded-xl border border-slate-800 shadow-2xs transition-all active:scale-95 cursor-pointer"
            >
              <FileText className="w-3.5 h-3.5 text-[#FFC800]" />
              <span>{isExportingDocx ? 'Membuat DOCX...' : 'Export to Docs'}</span>
            </button>

            {/* Export to Excel */}
            <button
              onClick={handleExportXLSX}
              className="inline-flex items-center space-x-1.5 px-3.5 py-2 bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-bold rounded-xl border border-emerald-800 shadow-2xs transition-all active:scale-95 cursor-pointer"
            >
              <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-200" />
              <span>Export to Excel</span>
            </button>

            {/* Tutup */}
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
