import React, { useState, useMemo, useEffect } from 'react';
import {
  Printer,
  X,
  Calendar,
  FileDown,
  CheckCircle2,
  AlertTriangle,
  Clock,
  Building,
  GraduationCap,
  Filter,
  CheckCircle,
  HelpCircle,
} from 'lucide-react';
import { StudentClearanceRecord, StudentTaskItem } from '../types';
import { exportStudentsToPDF } from '../utils/pdfExport';

interface MonthlyReportProps {
  isOpen: boolean;
  onClose: () => void;
  records: StudentClearanceRecord[];
  initialMonth?: number;
  initialYear?: number;
  autoTriggerPrint?: boolean;
}

const MONTH_NAMES = [
  'Januari',
  'Februari',
  'Maret',
  'April',
  'Mei',
  'Juni',
  'Juli',
  'Agustus',
  'September',
  'Oktober',
  'November',
  'Desember',
];

export interface AggregatedStudentMonthlyData {
  studentId: string;
  studentName: string;
  studentEmail: string;
  className: string;
  coursesCount: number;
  totalMonthTasks: number;
  completedMonthTasks: number;
  unfinishedMonthTasks: number;
  missingMonthTasks: number;
  lateMonthTasks: number;
  monthlyScore: number;
  isClear: boolean;
}

export const MonthlyReport: React.FC<MonthlyReportProps> = ({
  isOpen,
  onClose,
  records,
  initialMonth,
  initialYear,
  autoTriggerPrint = false,
}) => {
  const now = new Date();
  const [selectedMonth, setSelectedMonth] = useState<number>(initialMonth || now.getMonth() + 1);
  const [selectedYear, setSelectedYear] = useState<number>(initialYear || now.getFullYear());
  const [scopeMode, setScopeMode] = useState<'EXACT' | 'CUMULATIVE'>('EXACT');
  const [selectedClass, setSelectedClass] = useState<string>('ALL');
  const [selectedStatus, setSelectedStatus] = useState<'ALL' | 'CLEAR' | 'INCOMPLETE' | 'MISSING'>('ALL');

  useEffect(() => {
    if (isOpen) {
      if (initialMonth) setSelectedMonth(initialMonth);
      if (initialYear) setSelectedYear(initialYear);
      if (autoTriggerPrint) {
        const timer = setTimeout(() => {
          window.print();
        }, 600);
        return () => clearTimeout(timer);
      }
    }
  }, [isOpen, initialMonth, initialYear, autoTriggerPrint]);

  // Unique classes in records
  const classOptions = useMemo(() => {
    const set = new Set<string>();
    records.forEach((r) => {
      if (r.className) set.add(r.className);
    });
    return Array.from(set).sort();
  }, [records]);

  // Helper to determine if a task belongs to the selected month & year
  const isTaskInSelectedMonth = (task: StudentTaskItem): boolean => {
    let tYear = task.dueYear;
    let tMonth = task.dueMonth;

    if (!tYear && task.creationTime) {
      const d = new Date(task.creationTime);
      if (!isNaN(d.getTime())) {
        tYear = d.getFullYear();
        tMonth = d.getMonth() + 1;
      }
    }

    // If still no date, include in cumulative mode, exclude in exact mode
    if (!tYear || !tMonth) {
      return scopeMode === 'CUMULATIVE';
    }

    if (scopeMode === 'EXACT') {
      return tYear === selectedYear && tMonth === selectedMonth;
    } else {
      // Cumulative up to selected month
      if (tYear < selectedYear) return true;
      if (tYear > selectedYear) return false;
      return tMonth <= selectedMonth;
    }
  };

  // Aggregate monthly student clearance data
  const aggregatedStudents = useMemo<AggregatedStudentMonthlyData[]>(() => {
    // Group records by student
    const studentMap = new Map<
      string,
      {
        studentId: string;
        studentName: string;
        studentEmail: string;
        className: string;
        coursesCount: number;
        tasks: StudentTaskItem[];
      }
    >();

    records.forEach((record) => {
      if (!studentMap.has(record.studentId)) {
        studentMap.set(record.studentId, {
          studentId: record.studentId,
          studentName: record.studentName,
          studentEmail: record.studentEmail,
          className: record.className,
          coursesCount: 1,
          tasks: [],
        });
      } else {
        const existing = studentMap.get(record.studentId)!;
        existing.coursesCount += 1;
      }

      const current = studentMap.get(record.studentId)!;
      // Filter tasks for this month
      const relevantTasks = record.allTasks.filter(isTaskInSelectedMonth);
      current.tasks.push(...relevantTasks);
    });

    const result: AggregatedStudentMonthlyData[] = [];

    studentMap.forEach((entry) => {
      // Class filter
      if (selectedClass !== 'ALL' && entry.className !== selectedClass) {
        return;
      }

      const totalMonthTasks = entry.tasks.length;
      const completedMonthTasks = entry.tasks.filter((t) => t.status === 'GRADED' || t.status === 'RETURNED').length;
      const unfinishedMonthTasks = entry.tasks.filter(
        (t) => t.status !== 'GRADED' && t.status !== 'RETURNED'
      ).length;
      const missingMonthTasks = entry.tasks.filter((t) => t.status === 'MISSING').length;
      const lateMonthTasks = entry.tasks.filter((t) => t.status === 'TURNED_IN_LATE' || t.late).length;

      const monthlyScore =
        totalMonthTasks > 0 ? Math.round((completedMonthTasks / totalMonthTasks) * 100) : 100;
      const isClear = unfinishedMonthTasks === 0 && totalMonthTasks > 0;

      // Status filter
      if (selectedStatus === 'CLEAR' && !isClear) return;
      if (selectedStatus === 'INCOMPLETE' && isClear) return;
      if (selectedStatus === 'MISSING' && missingMonthTasks === 0) return;

      result.push({
        studentId: entry.studentId,
        studentName: entry.studentName,
        studentEmail: entry.studentEmail,
        className: entry.className,
        coursesCount: entry.coursesCount,
        totalMonthTasks,
        completedMonthTasks,
        unfinishedMonthTasks,
        missingMonthTasks,
        lateMonthTasks,
        monthlyScore,
        isClear,
      });
    });

    return result.sort((a, b) => {
      // Sort by class then by name
      const classCmp = a.className.localeCompare(b.className);
      if (classCmp !== 0) return classCmp;
      return a.studentName.localeCompare(b.studentName);
    });
  }, [records, selectedMonth, selectedYear, scopeMode, selectedClass, selectedStatus]);

  // School-wide Monthly Metrics
  const summaryMetrics = useMemo(() => {
    const totalStudents = aggregatedStudents.length;
    const clearStudents = aggregatedStudents.filter((s) => s.isClear).length;
    const incompleteStudents = aggregatedStudents.filter((s) => !s.isClear && s.totalMonthTasks > 0).length;
    const zeroTaskStudents = aggregatedStudents.filter((s) => s.totalMonthTasks === 0).length;

    const totalTasksAssigned = aggregatedStudents.reduce((acc, s) => acc + s.totalMonthTasks, 0);
    const totalTasksCompleted = aggregatedStudents.reduce((acc, s) => acc + s.completedMonthTasks, 0);
    const totalTasksMissing = aggregatedStudents.reduce((acc, s) => acc + s.missingMonthTasks, 0);
    const totalTasksLate = aggregatedStudents.reduce((acc, s) => acc + s.lateMonthTasks, 0);

    const schoolClearanceRate =
      totalTasksAssigned > 0 ? Math.round((totalTasksCompleted / totalTasksAssigned) * 100) : 100;
    const studentClearanceRate =
      totalStudents > 0 ? Math.round((clearStudents / totalStudents) * 100) : 100;

    // Per-class breakdown
    const classMap = new Map<
      string,
      { className: string; total: number; clear: number; incomplete: number; missing: number }
    >();

    aggregatedStudents.forEach((s) => {
      if (!classMap.has(s.className)) {
        classMap.set(s.className, {
          className: s.className,
          total: 0,
          clear: 0,
          incomplete: 0,
          missing: 0,
        });
      }
      const c = classMap.get(s.className)!;
      c.total += 1;
      if (s.isClear) c.clear += 1;
      else c.incomplete += 1;
      c.missing += s.missingMonthTasks;
    });

    const classSummaries = Array.from(classMap.values()).sort((a, b) =>
      a.className.localeCompare(b.className)
    );

    return {
      totalStudents,
      clearStudents,
      incompleteStudents,
      zeroTaskStudents,
      totalTasksAssigned,
      totalTasksCompleted,
      totalTasksMissing,
      totalTasksLate,
      schoolClearanceRate,
      studentClearanceRate,
      classSummaries,
    };
  }, [aggregatedStudents]);

  if (!isOpen) return null;

  const currentMonthLabel = `${MONTH_NAMES[selectedMonth - 1]} ${selectedYear}`;
  const printDateStr = new Date().toLocaleDateString('id-ID', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });

  const handlePrint = () => {
    window.print();
  };

  const handleExportPDF = () => {
    exportStudentsToPDF(
      records,
      `Laporan Bulanan: ${currentMonthLabel} (${scopeMode === 'EXACT' ? 'Tepat Bulan' : 'Kumulatif'})`
    );
  };

  return (
    <div
      id="monthly-report-modal-backdrop"
      className="fixed inset-0 z-50 bg-slate-900/70 backdrop-blur-xs flex flex-col items-center justify-start p-2 sm:p-4 overflow-y-auto print:p-0 print:bg-white print:static"
    >
      {/* Interactive Toolbar (Screen only, hidden in print) */}
      <div className="w-full max-w-[210mm] bg-white rounded-2xl shadow-xl border border-amber-200 mb-4 p-4 shrink-0 print:hidden space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-3">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-amber-500 text-white flex items-center justify-center font-black shadow-xs">
              <Calendar className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h3 className="font-extrabold text-slate-900 text-base">Laporan Bulanan Clearance Siswa</h3>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-amber-100 text-amber-900 border border-amber-300">
                  Format Siap Cetak A4
                </span>
              </div>
              <p className="text-xs text-slate-500">
                Rekapitulasi seluruh siswa untuk evaluasi bulanan bidang kurikulum
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-2">
            <button
              onClick={handlePrint}
              className="inline-flex items-center space-x-2 px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs rounded-xl shadow-xs transition-all active:scale-95 cursor-pointer"
              title="Buka dialog cetak browser dengan pengaturan margin A4 dan page-break otomatis"
            >
              <Printer className="w-4 h-4 text-[#FFC800]" />
              <span>Cetak / Print Preview (A4)</span>
            </button>

            <button
              onClick={handleExportPDF}
              className="inline-flex items-center space-x-1.5 px-3 py-2 bg-amber-50 hover:bg-amber-100 text-amber-950 border border-amber-300 font-bold text-xs rounded-xl shadow-2xs transition-all cursor-pointer"
              title="Unduh versi dokumen PDF"
            >
              <FileDown className="w-3.5 h-3.5 text-amber-700" />
              <span className="hidden sm:inline">PDF</span>
            </button>

            <button
              onClick={onClose}
              className="p-2 text-slate-400 hover:text-slate-700 rounded-xl hover:bg-slate-100 transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Filter Controls Bar */}
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-2.5 text-xs">
          {/* Month Selector */}
          <div>
            <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Bulan Tugas</label>
            <select
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(parseInt(e.target.value, 10))}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-2.5 py-1.5 font-bold text-slate-800 focus:outline-none focus:border-amber-500"
            >
              {MONTH_NAMES.map((m, idx) => (
                <option key={idx + 1} value={idx + 1}>
                  {m}
                </option>
              ))}
            </select>
          </div>

          {/* Year Selector */}
          <div>
            <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Tahun</label>
            <select
              value={selectedYear}
              onChange={(e) => setSelectedYear(parseInt(e.target.value, 10))}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-2.5 py-1.5 font-bold text-slate-800 focus:outline-none focus:border-amber-500"
            >
              <option value={2025}>2025</option>
              <option value={2026}>2026</option>
              <option value={2027}>2027</option>
            </select>
          </div>

          {/* Scope Mode */}
          <div>
            <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Cakupan Deadline</label>
            <select
              value={scopeMode}
              onChange={(e) => setScopeMode(e.target.value as any)}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-2.5 py-1.5 font-bold text-slate-800 focus:outline-none focus:border-amber-500"
            >
              <option value="EXACT">Khusus Bulan Ini</option>
              <option value="CUMULATIVE">Kumulatif (s/d Bulan Ini)</option>
            </select>
          </div>

          {/* Class Filter */}
          <div>
            <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Filter Kelas</label>
            <select
              value={selectedClass}
              onChange={(e) => setSelectedClass(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-2.5 py-1.5 font-bold text-slate-800 focus:outline-none focus:border-amber-500"
            >
              <option value="ALL">Semua Kelas ({classOptions.length})</option>
              {classOptions.map((c) => (
                <option key={c} value={c}>
                  Kelas {c}
                </option>
              ))}
            </select>
          </div>

          {/* Status Filter */}
          <div>
            <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Filter Status</label>
            <select
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value as any)}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-2.5 py-1.5 font-bold text-slate-800 focus:outline-none focus:border-amber-500"
            >
              <option value="ALL">Semua Siswa</option>
              <option value="CLEAR">Hanya 100% Clear</option>
              <option value="INCOMPLETE">Belum Selesai (Tunggakan)</option>
              <option value="MISSING">Ada Overdue / Missing</option>
            </select>
          </div>
        </div>
      </div>

      {/* A4 Printable Document Container */}
      <div
        id="printable-report-sheet"
        className="w-full max-w-[210mm] bg-white rounded-2xl sm:rounded-3xl shadow-2xl border border-slate-200 p-8 sm:p-10 text-slate-900 print:p-0 print:border-none print:shadow-none print:rounded-none print:max-w-full"
      >
        {/* Formal Institutional Header */}
        <div className="border-b-2 border-slate-900 pb-4 mb-5 flex items-start justify-between">
          <div className="flex items-center space-x-4">
            <div className="w-14 h-14 rounded-2xl bg-[#FFC800] border-2 border-slate-900 flex items-center justify-center font-black text-2xl text-slate-950 shadow-xs print:border-slate-800">
              M
            </div>
            <div>
              <h1 className="font-black text-xl tracking-tight text-slate-950 uppercase leading-none">
                Sekolah Kristen Makarios
              </h1>
              <h2 className="text-xs font-bold text-slate-700 tracking-wider uppercase mt-1">
                Bidang Kurikulum & Evaluasi Pembelajaran Siswa
              </h2>
              <p className="text-[11px] text-slate-500 mt-0.5">
                Sistem Monitoring Clearance Google Classroom Hub
              </p>
            </div>
          </div>

          <div className="text-right">
            <div className="inline-block px-3 py-1 rounded-lg bg-slate-100 border border-slate-300 text-[11px] font-black text-slate-800 uppercase tracking-wider mb-1">
              Dokumen Resmi Kurikulum
            </div>
            <p className="text-[11px] text-slate-500">Tanggal Cetak: {printDateStr}</p>
          </div>
        </div>

        {/* Report Title & Metadata Banner */}
        <div className="bg-amber-50/70 border border-amber-200 rounded-xl p-4 mb-6 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <div className="text-[10px] font-black text-amber-800 uppercase tracking-widest">
              Laporan Rekapitulasi Clearance
            </div>
            <h3 className="text-lg font-black text-slate-900 mt-0.5">
              Periode Bulan: <span className="text-amber-700">{currentMonthLabel.toUpperCase()}</span>
            </h3>
            <p className="text-xs text-slate-600 mt-0.5">
              Cakupan:{' '}
              {scopeMode === 'EXACT'
                ? 'Tugas dengan tenggat tepat pada bulan ini'
                : 'Tugas kumulatif sampai dengan bulan ini'}
              {selectedClass !== 'ALL' && ` • Kelas: ${selectedClass}`}
            </p>
          </div>

          <div className="text-left sm:text-right shrink-0">
            <div className="text-[10px] text-slate-500 font-bold uppercase">Tingkat Ketuntasan Sekolah</div>
            <div className="text-2xl font-black text-slate-900">
              <span className={summaryMetrics.schoolClearanceRate >= 80 ? 'text-emerald-700' : 'text-amber-600'}>
                {summaryMetrics.schoolClearanceRate}%
              </span>
            </div>
            <div className="text-[10px] text-slate-500">
              {summaryMetrics.clearStudents} dari {summaryMetrics.totalStudents} Siswa Clear
            </div>
          </div>
        </div>

        {/* Executive KPI Cards (Bento Metric Boxes) */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6 page-break-avoid">
          <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 text-center">
            <div className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Total Siswa</div>
            <div className="text-xl font-black text-slate-900 mt-0.5">{summaryMetrics.totalStudents}</div>
            <div className="text-[10px] text-slate-400">Siswa Aktif Terpantau</div>
          </div>

          <div className="bg-emerald-50/80 border border-emerald-200 rounded-xl p-3 text-center">
            <div className="text-[10px] font-bold text-emerald-800 uppercase tracking-wider">Siswa Clear (100%)</div>
            <div className="text-xl font-black text-emerald-700 mt-0.5">{summaryMetrics.clearStudents}</div>
            <div className="text-[10px] text-emerald-600">{summaryMetrics.studentClearanceRate}% dari Populasi</div>
          </div>

          <div className="bg-rose-50/80 border border-rose-200 rounded-xl p-3 text-center">
            <div className="text-[10px] font-bold text-rose-800 uppercase tracking-wider">Tugas Missing / Overdue</div>
            <div className="text-xl font-black text-rose-700 mt-0.5">{summaryMetrics.totalTasksMissing}</div>
            <div className="text-[10px] text-rose-600">Perlu Penagihan Segera</div>
          </div>

          <div className="bg-amber-50/80 border border-amber-200 rounded-xl p-3 text-center">
            <div className="text-[10px] font-bold text-amber-800 uppercase tracking-wider">Total Beban Tugas</div>
            <div className="text-xl font-black text-amber-800 mt-0.5">{summaryMetrics.totalTasksAssigned}</div>
            <div className="text-[10px] text-amber-700">{summaryMetrics.totalTasksCompleted} Selesai Dinilai</div>
          </div>
        </div>

        {/* Ringkasan Progres Per Kelas */}
        {summaryMetrics.classSummaries.length > 1 && (
          <div className="mb-6 border border-slate-200 rounded-xl overflow-hidden page-break-avoid">
            <div className="bg-slate-100 px-4 py-2 border-b border-slate-200 font-extrabold text-xs text-slate-800 uppercase tracking-wider">
              Ringkasan Ketuntasan Per Kelas
            </div>
            <table className="w-full text-xs">
              <thead className="bg-slate-50 text-slate-600 border-b border-slate-200 font-bold text-[10px] uppercase">
                <tr>
                  <th className="px-3 py-2 text-left">Kelas</th>
                  <th className="px-3 py-2 text-center">Total Siswa</th>
                  <th className="px-3 py-2 text-center">Siswa Clear</th>
                  <th className="px-3 py-2 text-center">Belum Tuntas</th>
                  <th className="px-3 py-2 text-center">Total Missing</th>
                  <th className="px-3 py-2 text-center">% Ketuntasan</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {summaryMetrics.classSummaries.map((cls) => {
                  const rate = cls.total > 0 ? Math.round((cls.clear / cls.total) * 100) : 100;
                  return (
                    <tr key={cls.className} className="hover:bg-slate-50/50">
                      <td className="px-3 py-2 font-bold text-slate-900">{cls.className}</td>
                      <td className="px-3 py-2 text-center">{cls.total}</td>
                      <td className="px-3 py-2 text-center text-emerald-700 font-bold">{cls.clear}</td>
                      <td className="px-3 py-2 text-center text-rose-700 font-bold">{cls.incomplete}</td>
                      <td className="px-3 py-2 text-center text-rose-600">{cls.missing}</td>
                      <td className="px-3 py-2 text-center font-bold">
                        <span
                          className={`px-2 py-0.5 rounded-full text-[10px] ${
                            rate >= 80 ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-900'
                          }`}
                        >
                          {rate}%
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* Main Aggregated Student Table */}
        <div className="mb-6">
          <div className="flex items-center justify-between mb-2">
            <h4 className="font-extrabold text-xs uppercase tracking-wider text-slate-800">
              Daftar Rekapitulasi Clearance Seluruh Siswa ({aggregatedStudents.length} Siswa)
            </h4>
            <span className="text-[10px] text-slate-400">Halaman Laporan Bulanan</span>
          </div>

          <table className="w-full text-left text-xs border border-slate-200 rounded-xl overflow-hidden border-collapse">
            <thead className="bg-slate-100 text-slate-700 font-bold text-[10px] uppercase tracking-wider border-b border-slate-300">
              <tr>
                <th className="px-2.5 py-2.5 text-center w-8">No</th>
                <th className="px-3 py-2.5 text-left">Nama Siswa</th>
                <th className="px-2.5 py-2.5 text-center w-16">Kelas</th>
                <th className="px-2 py-2.5 text-center">Total Tugas</th>
                <th className="px-2 py-2.5 text-center text-emerald-800">Selesai (Dinilai)</th>
                <th className="px-2 py-2.5 text-center text-rose-800">Belum Tuntas</th>
                <th className="px-2 py-2.5 text-center text-rose-700">Missing</th>
                <th className="px-2 py-2.5 text-center text-amber-800">Terlambat</th>
                <th className="px-2.5 py-2.5 text-center">Skor %</th>
                <th className="px-3 py-2.5 text-center">Status Clearance</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {aggregatedStudents.length === 0 ? (
                <tr>
                  <td colSpan={10} className="py-8 text-center text-slate-500 font-semibold">
                    Tidak ada data siswa yang memenuhi filter bulan/kelas yang dipilih.
                  </td>
                </tr>
              ) : (
                aggregatedStudents.map((s, idx) => (
                  <tr
                    key={s.studentId}
                    className="hover:bg-amber-50/20 break-inside-avoid page-break-avoid transition-colors"
                  >
                    <td className="px-2.5 py-2 text-center text-slate-400 font-mono text-[10px]">{idx + 1}</td>
                    <td className="px-3 py-2 font-bold text-slate-900">
                      <div>{s.studentName}</div>
                      <div className="text-[9px] text-slate-400 font-normal">{s.studentEmail}</div>
                    </td>
                    <td className="px-2.5 py-2 text-center font-bold text-slate-700">{s.className}</td>
                    <td className="px-2 py-2 text-center font-semibold text-slate-800">{s.totalMonthTasks}</td>
                    <td className="px-2 py-2 text-center text-emerald-700 font-bold">{s.completedMonthTasks}</td>
                    <td className="px-2 py-2 text-center text-rose-700 font-bold">{s.unfinishedMonthTasks}</td>
                    <td className="px-2 py-2 text-center text-rose-600 font-bold">
                      {s.missingMonthTasks > 0 ? (
                        <span className="text-rose-600 font-black">{s.missingMonthTasks}</span>
                      ) : (
                        <span className="text-slate-300">-</span>
                      )}
                    </td>
                    <td className="px-2 py-2 text-center text-amber-800">
                      {s.lateMonthTasks > 0 ? s.lateMonthTasks : <span className="text-slate-300">-</span>}
                    </td>
                    <td className="px-2.5 py-2 text-center font-extrabold text-slate-800">{s.monthlyScore}%</td>
                    <td className="px-3 py-2 text-center">
                      {s.isClear ? (
                        <span className="inline-flex items-center space-x-1 px-2 py-0.5 rounded-full text-[10px] font-black bg-emerald-100 text-emerald-800 border border-emerald-300">
                          <CheckCircle className="w-3 h-3 text-emerald-600" />
                          <span>CLEAR</span>
                        </span>
                      ) : s.missingMonthTasks > 0 ? (
                        <span className="inline-flex items-center space-x-1 px-2 py-0.5 rounded-full text-[10px] font-black bg-rose-100 text-rose-800 border border-rose-300">
                          <AlertTriangle className="w-3 h-3 text-rose-600" />
                          <span>MISSING</span>
                        </span>
                      ) : (
                        <span className="inline-flex items-center space-x-1 px-2 py-0.5 rounded-full text-[10px] font-black bg-amber-100 text-amber-900 border border-amber-300">
                          <Clock className="w-3 h-3 text-amber-700" />
                          <span>BELUM TUNTAS</span>
                        </span>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Formal Institutional Signatures Section (Strictly Kept Together with Page-Break Avoid) */}
        <div className="report-footer-signature pt-6 border-t-2 border-slate-300 page-break-avoid break-inside-avoid">
          <div className="flex justify-between items-start text-xs text-slate-800">
            <div className="text-left w-56">
              <p className="font-semibold text-slate-500">Mengetahui,</p>
              <p className="font-extrabold text-slate-900 mt-0.5">Kepala Sekolah Makarios</p>
              <div className="h-20" />
              <div className="border-b border-slate-800 w-44" />
              <p className="text-[11px] text-slate-500 mt-1">NIP / NIK:</p>
            </div>

            <div className="text-right w-56">
              <p className="font-semibold text-slate-500">Jakarta, {printDateStr}</p>
              <p className="font-extrabold text-slate-900 mt-0.5">Waka. Bidang Kurikulum</p>
              <div className="h-20" />
              <div className="border-b border-slate-800 w-44 ml-auto" />
              <p className="text-[11px] text-slate-500 mt-1">NIP / NIK:</p>
            </div>
          </div>

          <div className="text-center text-[9px] text-slate-400 mt-6 pt-2 border-t border-slate-100">
            Dokumen ini dihasilkan secara otomatis oleh Makarios Classroom Clearance Hub • Standar Dokumen A4 Resmi
          </div>
        </div>
      </div>
    </div>
  );
};
