import React, { useState, useMemo } from 'react';
import {
  Users,
  Clock,
  BookOpen,
  CheckCircle2,
  AlertTriangle,
  Search,
  Printer,
  ExternalLink,
  Briefcase,
  Layers,
  Sparkles,
  TrendingUp,
  FileCheck,
  CheckCircle,
} from 'lucide-react';
import {
  StudentClearanceRecord,
  TeacherClearanceRecord,
  TeacherSummaryRecord,
  TeacherWorkloadMetric,
} from '../types';
import { calculateTeacherWorkload } from '../utils/teacherWorkload';

interface TeacherWorkloadDashboardProps {
  teacherSummaryRecords: TeacherSummaryRecord[];
  teacherClearanceRecords: TeacherClearanceRecord[];
  studentRecords: StudentClearanceRecord[];
}

export const TeacherWorkloadDashboard: React.FC<TeacherWorkloadDashboardProps> = ({
  teacherSummaryRecords,
  teacherClearanceRecords,
  studentRecords,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [filterSLA, setFilterSLA] = useState<'ALL' | 'EXCELLENT' | 'STANDARD' | 'OVERDUE'>('ALL');
  const [filterRatio, setFilterRatio] = useState<'ALL' | 'BALANCED' | 'ASSIGNMENT_HEAVY' | 'MATERIAL_HEAVY'>('ALL');

  // Compute workload metrics
  const teacherMetrics = useMemo(() => {
    return calculateTeacherWorkload(
      teacherSummaryRecords,
      teacherClearanceRecords,
      studentRecords
    );
  }, [teacherSummaryRecords, teacherClearanceRecords, studentRecords]);

  // KPIs
  const kpis = useMemo(() => {
    const totalTeachers = teacherMetrics.length;
    const fastGraders = teacherMetrics.filter((t) => t.slaStatus === 'EXCELLENT').length;
    const standardGraders = teacherMetrics.filter((t) => t.slaStatus === 'STANDARD').length;
    const overdueGraders = teacherMetrics.filter((t) => t.slaStatus === 'OVERDUE').length;

    const totalUngradedQueue = teacherMetrics.reduce((sum, t) => sum + t.totalUngradedPending, 0);
    const avgTurnaround =
      totalTeachers > 0
        ? Math.round(
            (teacherMetrics.reduce((sum, t) => sum + t.averageGradingTurnaroundDays, 0) /
              totalTeachers) *
              10
          ) / 10
        : 2.5;

    const balancedTeachers = teacherMetrics.filter((t) => t.pedagogicalStatus === 'BALANCED').length;

    return {
      totalTeachers,
      fastGraders,
      standardGraders,
      overdueGraders,
      totalUngradedQueue,
      avgTurnaround,
      balancedTeachers,
    };
  }, [teacherMetrics]);

  // Filtered teachers
  const filteredMetrics = useMemo(() => {
    return teacherMetrics.filter((t) => {
      const matchSearch =
        t.teacherName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        t.teacherEmail.toLowerCase().includes(searchQuery.toLowerCase()) ||
        t.coursesList.some((c) => c.courseName.toLowerCase().includes(searchQuery.toLowerCase()));

      const matchSLA = filterSLA === 'ALL' || t.slaStatus === filterSLA;
      const matchRatio = filterRatio === 'ALL' || t.pedagogicalStatus === filterRatio;

      return matchSearch && matchSLA && matchRatio;
    });
  }, [teacherMetrics, searchQuery, filterSLA, filterRatio]);

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="bg-white border border-teal-200 rounded-2xl p-5 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-start space-x-3.5">
          <div className="w-12 h-12 rounded-2xl bg-teal-600 border border-teal-700 flex items-center justify-center font-black text-white shrink-0 shadow-2xs">
            <Briefcase className="w-6 h-6 text-white" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <h2 className="text-lg font-black text-slate-900">Teacher Workload & Engagement Analytics</h2>
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black bg-teal-100 text-teal-900 border border-teal-200">
                SLA & Kinerja Guru
              </span>
            </div>
            <p className="text-xs text-slate-600 mt-0.5">
              Pemantau kecepatan pengembalian nilai (Grading SLA), distribusi beban mengajar, dan rasio keseimbangan bahan ajar vs penugasan.
            </p>
          </div>
        </div>

        <div className="flex items-center space-x-2 shrink-0">
          <button
            onClick={handlePrint}
            className="inline-flex items-center space-x-1.5 px-3.5 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold shadow-2xs transition-all active:scale-95 cursor-pointer"
            title="Cetak Laporan Evaluasi Guru"
          >
            <Printer className="w-4 h-4 text-teal-300" />
            <span>Cetak Kinerja Guru (A4)</span>
          </button>
        </div>
      </div>

      {/* KPI Bento Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5">
        {/* Total Ungraded Backlog */}
        <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-xs">
          <div className="flex items-center justify-between text-xs font-bold text-slate-500 mb-1">
            <span>Antrean Grading Tertahan</span>
            <Clock className="w-4 h-4 text-amber-600" />
          </div>
          <div className="flex items-baseline space-x-2">
            <span className="text-2xl font-black text-slate-900">{kpis.totalUngradedQueue}</span>
            <span className="text-xs font-bold text-slate-500">Koreksi Tertunda</span>
          </div>
          <p className="text-[10px] text-slate-400 mt-3">
            Tugas yang sudah diserahkan siswa dan menanti nilai guru
          </p>
        </div>

        {/* SLA Turnaround */}
        <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-xs">
          <div className="flex items-center justify-between text-xs font-bold text-slate-500 mb-1">
            <span>Rata-Rata SLA Koreksi Nilai</span>
            <TrendingUp className="w-4 h-4 text-teal-600" />
          </div>
          <div className="flex items-baseline space-x-2">
            <span className="text-2xl font-black text-teal-700">{kpis.avgTurnaround}</span>
            <span className="text-xs font-bold text-slate-500">Hari Penilaian</span>
          </div>
          <div className="flex items-center space-x-1.5 mt-3 text-[10px] font-bold">
            <span className="px-1.5 py-0.5 rounded bg-emerald-50 text-emerald-800 border border-emerald-200">
              {kpis.fastGraders} Cepat (&lt;3h)
            </span>
            <span className="px-1.5 py-0.5 rounded bg-rose-50 text-rose-800 border border-rose-200">
              {kpis.overdueGraders} Terlambat
            </span>
          </div>
        </div>

        {/* Pedagogical Balance */}
        <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-xs">
          <div className="flex items-center justify-between text-xs font-bold text-slate-500 mb-1">
            <span>Keseimbangan Pedagogis</span>
            <BookOpen className="w-4 h-4 text-indigo-600" />
          </div>
          <div className="flex items-baseline space-x-2">
            <span className="text-2xl font-black text-indigo-700">{kpis.balancedTeachers}</span>
            <span className="text-xs font-bold text-slate-500">dari {kpis.totalTeachers} Guru Seimbang</span>
          </div>
          <p className="text-[10px] text-slate-400 mt-3">
            Rasio ideal antara pemberian materi & tugas penugasan
          </p>
        </div>

        {/* Total Teachers */}
        <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-xs">
          <div className="flex items-center justify-between text-xs font-bold text-slate-500 mb-1">
            <span>Total Guru Pengampu</span>
            <Users className="w-4 h-4 text-slate-600" />
          </div>
          <div className="flex items-baseline space-x-2">
            <span className="text-2xl font-black text-slate-900">{kpis.totalTeachers}</span>
            <span className="text-xs font-bold text-slate-500">Pendidik Aktif</span>
          </div>
          <p className="text-[10px] text-slate-400 mt-3">
            Terhubung di ruang kelas Google Classroom
          </p>
        </div>
      </div>

      {/* Main Table */}
      <div className="bg-white border border-slate-200 rounded-2xl shadow-xs overflow-hidden">
        {/* Filter Bar */}
        <div className="p-4 border-b border-slate-100 bg-slate-50/60 flex flex-col md:flex-row items-center justify-between gap-3">
          <div className="relative w-full md:w-80">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Cari nama guru, email, atau mapel..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-2 bg-white border border-slate-200 rounded-xl text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:border-teal-500 shadow-2xs"
            />
          </div>

          <div className="flex flex-wrap items-center gap-2.5 w-full md:w-auto">
            <select
              value={filterSLA}
              onChange={(e) => setFilterSLA(e.target.value as any)}
              className="bg-white border border-slate-200 rounded-xl px-3 py-1.5 text-xs font-bold text-slate-700 focus:outline-none focus:border-teal-500 shadow-2xs"
            >
              <option value="ALL">SLA Grading: Semua ({teacherMetrics.length})</option>
              <option value="EXCELLENT">🟢 Prima (&lt; 3 Hari)</option>
              <option value="STANDARD">🟡 Standar (3 - 7 Hari)</option>
              <option value="OVERDUE">🔴 Overdue / Tertunda (&gt; 7 Hari)</option>
            </select>

            <select
              value={filterRatio}
              onChange={(e) => setFilterRatio(e.target.value as any)}
              className="bg-white border border-slate-200 rounded-xl px-3 py-1.5 text-xs font-bold text-slate-700 focus:outline-none focus:border-teal-500 shadow-2xs"
            >
              <option value="ALL">Keseimbangan Ajar: Semua</option>
              <option value="BALANCED">Seimbang (Materi & Tugas Proporsional)</option>
              <option value="ASSIGNMENT_HEAVY">Tinggi Penugasan (Kurang Materi)</option>
              <option value="MATERIAL_HEAVY">Tinggi Materi Ajar</option>
            </select>
          </div>
        </div>

        {/* Table Content */}
        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left">
            <thead className="bg-slate-100 text-slate-700 font-extrabold text-[10px] uppercase tracking-wider border-b border-slate-200">
              <tr>
                <th className="py-3 px-3 text-center w-8">No</th>
                <th className="py-3 px-3 min-w-[200px]">Nama Guru & Kontak</th>
                <th className="py-3 px-3 text-center">Kelas & Siswa Diajar</th>
                <th className="py-3 px-3 text-center">Beban Tugas & Koreksi</th>
                <th className="py-3 px-3 text-center">Antrean Nilai (Pending)</th>
                <th className="py-3 px-3 text-center">SLA Kecepatan Grading</th>
                <th className="py-3 px-3 text-center">Rasio Materi vs Tugas</th>
                <th className="py-3 px-3 text-center">Status Aktivitas</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredMetrics.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-10 text-center text-slate-500 font-semibold">
                    Tidak ada data guru yang memenuhi filter yang dipilih.
                  </td>
                </tr>
              ) : (
                filteredMetrics.map((t, idx) => (
                  <tr key={t.teacherId} className="hover:bg-teal-50/20 transition-colors">
                    <td className="py-3 px-3 text-center text-slate-400 font-mono text-[10px]">{idx + 1}</td>
                    <td className="py-3 px-3">
                      <div className="flex items-center space-x-2.5">
                        {t.teacherPhoto ? (
                          <img
                            src={t.teacherPhoto}
                            alt={t.teacherName}
                            className="w-7 h-7 rounded-full object-cover border border-slate-200 shrink-0"
                            referrerPolicy="no-referrer"
                          />
                        ) : (
                          <div className="w-7 h-7 rounded-full bg-slate-200 flex items-center justify-center font-black text-slate-600 text-[10px] shrink-0">
                            {t.teacherName.slice(0, 2).toUpperCase()}
                          </div>
                        )}
                        <div>
                          <div className="font-extrabold text-slate-900">{t.teacherName}</div>
                          <div className="text-[10px] text-slate-500">{t.teacherEmail}</div>
                        </div>
                      </div>
                    </td>
                    <td className="py-3 px-3 text-center">
                      <div className="font-bold text-slate-900">{t.coursesCount} Kelas</div>
                      <div className="text-[10px] text-slate-500">{t.totalStudentsTaught} Siswa Diajar</div>
                    </td>
                    <td className="py-3 px-3 text-center">
                      <div className="font-bold text-slate-900">{t.totalTasksGiven} Tugas Dibuat</div>
                      <div className="text-[10px] text-slate-500">
                        {t.totalSubmissionsGraded} / {t.totalSubmissionsReceived} Dinilai
                      </div>
                    </td>
                    <td className="py-3 px-3 text-center">
                      {t.totalUngradedPending === 0 ? (
                        <span className="inline-flex items-center space-x-1 px-2.5 py-0.5 rounded-full text-[10px] font-black bg-emerald-100 text-emerald-800 border border-emerald-300">
                          <CheckCircle className="w-3 h-3 text-emerald-600" />
                          <span>BERSIH (0)</span>
                        </span>
                      ) : (
                        <span className="inline-flex items-center space-x-1 px-2.5 py-0.5 rounded-full text-[10px] font-black bg-amber-100 text-amber-900 border border-amber-300">
                          <span>{t.totalUngradedPending} Belum Dinilai</span>
                        </span>
                      )}
                    </td>
                    <td className="py-3 px-3 text-center">
                      <div className="inline-flex flex-col items-center">
                        {t.slaStatus === 'EXCELLENT' ? (
                          <span className="inline-flex items-center space-x-1 px-2.5 py-0.5 rounded-full text-[10px] font-black bg-emerald-100 text-emerald-800 border border-emerald-300">
                            <span>SLA PRIMA ({t.averageGradingTurnaroundDays} Hari)</span>
                          </span>
                        ) : t.slaStatus === 'STANDARD' ? (
                          <span className="inline-flex items-center space-x-1 px-2.5 py-0.5 rounded-full text-[10px] font-black bg-amber-100 text-amber-900 border border-amber-300">
                            <span>STANDAR ({t.averageGradingTurnaroundDays} Hari)</span>
                          </span>
                        ) : (
                          <span className="inline-flex items-center space-x-1 px-2.5 py-0.5 rounded-full text-[10px] font-black bg-rose-100 text-rose-800 border border-rose-300 animate-pulse">
                            <AlertTriangle className="w-3 h-3 text-rose-600" />
                            <span>TERLAMBAT ({t.averageGradingTurnaroundDays} Hari)</span>
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="py-3 px-3 text-center">
                      <div className="inline-flex flex-col items-center">
                        <span className="font-bold text-slate-800">
                          {t.totalMaterialsUploaded} Mat : {t.totalTasksGiven} Tugas
                        </span>
                        <span
                          className={`text-[9px] font-extrabold px-1.5 py-0.2 rounded mt-0.5 ${
                            t.pedagogicalStatus === 'BALANCED'
                              ? 'bg-emerald-50 text-emerald-700'
                              : t.pedagogicalStatus === 'ASSIGNMENT_HEAVY'
                              ? 'bg-rose-50 text-rose-700'
                              : 'bg-blue-50 text-blue-700'
                          }`}
                        >
                          {t.pedagogicalStatus === 'BALANCED'
                            ? 'SEIMBANG'
                            : t.pedagogicalStatus === 'ASSIGNMENT_HEAVY'
                            ? 'DOMINAN TUGAS'
                            : 'DOMINAN MATERI'}
                        </span>
                      </div>
                    </td>
                    <td className="py-3 px-3 text-center">
                      <span className="text-[11px] font-bold text-slate-600">
                        {t.daysSinceLastPost === 0
                          ? 'Hari ini'
                          : `${t.daysSinceLastPost} hari lalu`}
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
