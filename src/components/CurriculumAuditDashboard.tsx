import React, { useState, useMemo } from 'react';
import {
  ShieldCheck,
  AlertTriangle,
  CheckCircle2,
  Clock,
  ExternalLink,
  Search,
  Filter,
  Printer,
  Calendar,
  Layers,
  FileCheck,
  AlertCircle,
  FileText,
  Building,
  CheckCircle,
  XCircle,
  RefreshCw,
} from 'lucide-react';
import {
  ClassroomCourse,
  CurriculumAuditCourse,
  StudentClearanceRecord,
  TeacherClearanceRecord,
} from '../types';
import {
  buildCurriculumAuditCourses,
  checkScheduleCompliance,
  DEFAULT_STANDARD_CLASSES,
  DEFAULT_STANDARD_SUBJECTS,
} from '../utils/curriculumAudit';

interface CurriculumAuditDashboardProps {
  courses: ClassroomCourse[];
  teacherRecords: TeacherClearanceRecord[];
  studentRecords: StudentClearanceRecord[];
}

export const CurriculumAuditDashboard: React.FC<CurriculumAuditDashboardProps> = ({
  courses,
  teacherRecords,
  studentRecords,
}) => {
  const [activeSubTab, setActiveSubTab] = useState<'audit' | 'schedule'>('audit');
  const [searchQuery, setSearchQuery] = useState('');
  const [filterRpp, setFilterRpp] = useState<'ALL' | 'COMPLIANT' | 'NON_COMPLIANT'>('ALL');
  const [filterActivity, setFilterActivity] = useState<'ALL' | 'ACTIVE' | 'WARNING' | 'DORMANT'>('ALL');

  // Build audit courses
  const auditCourses = useMemo(() => {
    return buildCurriculumAuditCourses(courses, teacherRecords, studentRecords);
  }, [courses, teacherRecords, studentRecords]);

  // Schedule compliance check
  const scheduleCheck = useMemo(() => {
    return checkScheduleCompliance(courses, DEFAULT_STANDARD_SUBJECTS, DEFAULT_STANDARD_CLASSES);
  }, [courses]);

  // Overall KPIs
  const kpis = useMemo(() => {
    const total = auditCourses.length;
    const compliantRpp = auditCourses.filter((c) => c.hasSyllabusOrRpp).length;
    const rppComplianceRate = total > 0 ? Math.round((compliantRpp / total) * 100) : 0;

    const activeClasses = auditCourses.filter((c) => c.activityStatus === 'ACTIVE').length;
    const warningClasses = auditCourses.filter((c) => c.activityStatus === 'WARNING').length;
    const dormantClasses = auditCourses.filter((c) => c.activityStatus === 'DORMANT').length;

    const readyClasses = auditCourses.filter((c) => c.readinessStatus === 'SIAP').length;

    return {
      total,
      compliantRpp,
      nonCompliantRpp: total - compliantRpp,
      rppComplianceRate,
      activeClasses,
      warningClasses,
      dormantClasses,
      readyClasses,
    };
  }, [auditCourses]);

  // Filtered audit courses
  const filteredCourses = useMemo(() => {
    return auditCourses.filter((course) => {
      const matchSearch =
        course.courseName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        course.className.toLowerCase().includes(searchQuery.toLowerCase()) ||
        course.teacherNames.some((t) => t.toLowerCase().includes(searchQuery.toLowerCase()));

      const matchRpp =
        filterRpp === 'ALL' ||
        (filterRpp === 'COMPLIANT' && course.hasSyllabusOrRpp) ||
        (filterRpp === 'NON_COMPLIANT' && !course.hasSyllabusOrRpp);

      const matchActivity =
        filterActivity === 'ALL' || course.activityStatus === filterActivity;

      return matchSearch && matchRpp && matchActivity;
    });
  }, [auditCourses, searchQuery, filterRpp, filterActivity]);

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="space-y-6">
      {/* Top Banner & Header */}
      <div className="bg-white border border-amber-200 rounded-2xl p-5 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-start space-x-3.5">
          <div className="w-12 h-12 rounded-2xl bg-[#FFC800] border border-amber-400 flex items-center justify-center font-black text-slate-950 shrink-0 shadow-2xs">
            <ShieldCheck className="w-6 h-6 text-slate-950" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <h2 className="text-lg font-black text-slate-900">Curriculum Audit & Readiness Hub</h2>
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black bg-amber-100 text-amber-950 border border-amber-300">
                Waka Kurikulum
              </span>
            </div>
            <p className="text-xs text-slate-600 mt-0.5">
              Audit kepatuhan pengunggahan Modul Ajar/RPP, pemantau aktivitas mingguan guru, dan pencocokan jadwal kelas Google Classroom.
            </p>
          </div>
        </div>

        <div className="flex items-center space-x-2.5 shrink-0">
          <button
            onClick={handlePrint}
            className="inline-flex items-center space-x-1.5 px-3.5 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold shadow-2xs transition-all active:scale-95 cursor-pointer"
            title="Cetak Laporan Audit Kurikulum Resmi"
          >
            <Printer className="w-4 h-4 text-[#FFC800]" />
            <span>Cetak Audit (A4)</span>
          </button>
        </div>
      </div>

      {/* KPI Cards Bento Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5">
        {/* RPP Compliance */}
        <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-xs">
          <div className="flex items-center justify-between text-xs font-bold text-slate-500 mb-1">
            <span>Kepatuhan Modul Ajar / RPP</span>
            <FileCheck className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="flex items-baseline space-x-2">
            <span className="text-2xl font-black text-slate-900">{kpis.rppComplianceRate}%</span>
            <span className="text-xs font-bold text-emerald-700">
              {kpis.compliantRpp} / {kpis.total} Kelas
            </span>
          </div>
          <div className="w-full bg-slate-100 rounded-full h-1.5 mt-3 overflow-hidden">
            <div
              className="bg-emerald-500 h-1.5 rounded-full"
              style={{ width: `${kpis.rppComplianceRate}%` }}
            />
          </div>
          <p className="text-[10px] text-slate-400 mt-2">
            {kpis.nonCompliantRpp > 0 ? (
              <span className="text-rose-600 font-bold">{kpis.nonCompliantRpp} kelas belum mengunggah silabus</span>
            ) : (
              'Seluruh kelas telah patuh'
            )}
          </p>
        </div>

        {/* Weekly Activity Health */}
        <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-xs">
          <div className="flex items-center justify-between text-xs font-bold text-slate-500 mb-1">
            <span>Aktivitas Minggu Berjalan</span>
            <Clock className="w-4 h-4 text-amber-600" />
          </div>
          <div className="flex items-baseline space-x-2">
            <span className="text-2xl font-black text-slate-900">{kpis.activeClasses}</span>
            <span className="text-xs font-bold text-slate-500">Kelas Aktif &lt;7 Hari</span>
          </div>
          <div className="flex items-center space-x-1.5 mt-3 text-[10px] font-bold">
            <span className="px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-800 border border-emerald-200">
              {kpis.activeClasses} Aktif
            </span>
            <span className="px-2 py-0.5 rounded-md bg-amber-50 text-amber-800 border border-amber-200">
              {kpis.warningClasses} Waspada
            </span>
            <span className="px-2 py-0.5 rounded-md bg-rose-50 text-rose-800 border border-rose-200">
              {kpis.dormantClasses} Dormant
            </span>
          </div>
        </div>

        {/* Schedule Fulfillment */}
        <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-xs">
          <div className="flex items-center justify-between text-xs font-bold text-slate-500 mb-1">
            <span>Kesesuaian Jadwal Sekolah</span>
            <Layers className="w-4 h-4 text-indigo-600" />
          </div>
          <div className="flex items-baseline space-x-2">
            <span className="text-2xl font-black text-slate-900">{scheduleCheck.compliancePercentage}%</span>
            <span className="text-xs font-bold text-slate-500">
              {scheduleCheck.totalCreated} / {scheduleCheck.totalExpected} Roster
            </span>
          </div>
          <div className="w-full bg-slate-100 rounded-full h-1.5 mt-3 overflow-hidden">
            <div
              className="bg-indigo-500 h-1.5 rounded-full"
              style={{ width: `${scheduleCheck.compliancePercentage}%` }}
            />
          </div>
          <p className="text-[10px] text-slate-400 mt-2">
            {scheduleCheck.missingCount > 0 ? (
              <span className="text-rose-600 font-bold">{scheduleCheck.missingCount} mapel di jadwal belum ada di GC</span>
            ) : (
              'Semua mata pelajaran telah dibuat di GC'
            )}
          </p>
        </div>

        {/* Total Class Readiness */}
        <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-xs">
          <div className="flex items-center justify-between text-xs font-bold text-slate-500 mb-1">
            <span>Kesiapan Kelas (Readiness)</span>
            <Building className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="flex items-baseline space-x-2">
            <span className="text-2xl font-black text-emerald-700">{kpis.readyClasses}</span>
            <span className="text-xs font-bold text-slate-500">dari {kpis.total} Kelas Siap</span>
          </div>
          <div className="mt-3 text-[10px] text-slate-500 flex items-center justify-between">
            <span>Kriteria: RPP + Tugas + Aktif</span>
            <span className="font-bold text-emerald-700">
              {kpis.total > 0 ? Math.round((kpis.readyClasses / kpis.total) * 100) : 0}% Siap
            </span>
          </div>
        </div>
      </div>

      {/* Sub-tab Navigation */}
      <div className="flex items-center space-x-2 border-b border-slate-200 pb-2">
        <button
          onClick={() => setActiveSubTab('audit')}
          className={`inline-flex items-center space-x-2 px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
            activeSubTab === 'audit'
              ? 'bg-amber-500 text-slate-950 font-black shadow-xs'
              : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          <FileCheck className="w-4 h-4" />
          <span>Audit Kepatuhan & Aktivitas Kelas ({auditCourses.length})</span>
        </button>

        <button
          onClick={() => setActiveSubTab('schedule')}
          className={`inline-flex items-center space-x-2 px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
            activeSubTab === 'schedule'
              ? 'bg-amber-500 text-slate-950 font-black shadow-xs'
              : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          <Calendar className="w-4 h-4" />
          <span>Pencocokan Jadwal Pelajaran Resmi ({scheduleCheck.totalExpected})</span>
          {scheduleCheck.missingCount > 0 && (
            <span className="px-1.5 py-0.2 rounded-full text-[10px] font-black bg-rose-600 text-white">
              {scheduleCheck.missingCount}
            </span>
          )}
        </button>
      </div>

      {/* SUB-TAB 1: AUDIT KEPATUHAN & AKTIVITAS */}
      {activeSubTab === 'audit' && (
        <div className="bg-white border border-slate-200 rounded-2xl shadow-xs overflow-hidden">
          {/* Filter Bar */}
          <div className="p-4 border-b border-slate-100 bg-slate-50/60 flex flex-col md:flex-row items-center justify-between gap-3">
            <div className="relative w-full md:w-80">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="Cari nama kelas, mapel, atau guru..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-3 py-2 bg-white border border-slate-200 rounded-xl text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:border-amber-500 shadow-2xs"
              />
            </div>

            <div className="flex flex-wrap items-center gap-2.5 w-full md:w-auto">
              <select
                value={filterRpp}
                onChange={(e) => setFilterRpp(e.target.value as any)}
                className="bg-white border border-slate-200 rounded-xl px-3 py-1.5 text-xs font-bold text-slate-700 focus:outline-none focus:border-amber-500 shadow-2xs"
              >
                <option value="ALL">Status RPP: Semua ({auditCourses.length})</option>
                <option value="COMPLIANT">Patuh (Ada RPP / Silabus)</option>
                <option value="NON_COMPLIANT">Belum Ada RPP / Silabus</option>
              </select>

              <select
                value={filterActivity}
                onChange={(e) => setFilterActivity(e.target.value as any)}
                className="bg-white border border-slate-200 rounded-xl px-3 py-1.5 text-xs font-bold text-slate-700 focus:outline-none focus:border-amber-500 shadow-2xs"
              >
                <option value="ALL">Aktivitas: Semua Status</option>
                <option value="ACTIVE">Aktif (&lt; 7 Hari)</option>
                <option value="WARNING">Perlu Perhatian (7-14 Hari)</option>
                <option value="DORMANT">Dormant / Vakum (&gt; 14 Hari)</option>
              </select>
            </div>
          </div>

          {/* Table */}
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead className="bg-slate-100 text-slate-700 font-extrabold text-[10px] uppercase tracking-wider border-b border-slate-200">
                <tr>
                  <th className="py-3 px-3 text-center w-8">No</th>
                  <th className="py-3 px-3">Mata Pelajaran & Kelas</th>
                  <th className="py-3 px-3">Guru Pengampu</th>
                  <th className="py-3 px-3 text-center">Kepatuhan RPP / Silabus</th>
                  <th className="py-3 px-3 text-center">Aktivitas Terakhir</th>
                  <th className="py-3 px-3 text-center">Beban Materi / Tugas</th>
                  <th className="py-3 px-3 text-center">Status Kesiapan</th>
                  <th className="py-3 px-3 text-center">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredCourses.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="py-10 text-center text-slate-500 font-semibold">
                      Tidak ada kelas yang memenuhi filter pencarian.
                    </td>
                  </tr>
                ) : (
                  filteredCourses.map((c, idx) => (
                    <tr key={c.courseId} className="hover:bg-amber-50/20 transition-colors">
                      <td className="py-3 px-3 text-center text-slate-400 font-mono text-[10px]">{idx + 1}</td>
                      <td className="py-3 px-3">
                        <div className="font-extrabold text-slate-900">{c.courseName}</div>
                        <div className="text-[10px] text-slate-500 font-medium">
                          {c.className} • {c.enrollmentStudentCount} Siswa
                        </div>
                      </td>
                      <td className="py-3 px-3">
                        <div className="font-bold text-slate-800">{c.teacherNames.join(', ')}</div>
                        <div className="text-[10px] text-slate-400">{c.teacherEmails.join(', ')}</div>
                      </td>
                      <td className="py-3 px-3 text-center">
                        {c.hasSyllabusOrRpp ? (
                          <div className="inline-flex flex-col items-center">
                            <span className="inline-flex items-center space-x-1 px-2.5 py-0.5 rounded-full text-[10px] font-black bg-emerald-100 text-emerald-800 border border-emerald-300">
                              <CheckCircle className="w-3 h-3 text-emerald-600" />
                              <span>PATUH</span>
                            </span>
                            {c.syllabusMatchDetail && (
                              <span className="text-[9px] text-emerald-700 mt-0.5 truncate max-w-[140px]" title={c.syllabusMatchDetail}>
                                {c.syllabusMatchDetail}
                              </span>
                            )}
                          </div>
                        ) : (
                          <span className="inline-flex items-center space-x-1 px-2.5 py-0.5 rounded-full text-[10px] font-black bg-rose-100 text-rose-800 border border-rose-300">
                            <XCircle className="w-3 h-3 text-rose-600" />
                            <span>BELUM ADA RPP</span>
                          </span>
                        )}
                      </td>
                      <td className="py-3 px-3 text-center">
                        <div className="inline-flex flex-col items-center">
                          {c.activityStatus === 'ACTIVE' && (
                            <span className="inline-flex items-center space-x-1 px-2.5 py-0.5 rounded-full text-[10px] font-black bg-emerald-100 text-emerald-800 border border-emerald-300">
                              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                              <span>Aktif ({c.daysSinceLastActivity}h lalu)</span>
                            </span>
                          )}
                          {c.activityStatus === 'WARNING' && (
                            <span className="inline-flex items-center space-x-1 px-2.5 py-0.5 rounded-full text-[10px] font-black bg-amber-100 text-amber-900 border border-amber-300">
                              <AlertTriangle className="w-3 h-3 text-amber-600" />
                              <span>{c.daysSinceLastActivity}h lalu</span>
                            </span>
                          )}
                          {c.activityStatus === 'DORMANT' && (
                            <span className="inline-flex items-center space-x-1 px-2.5 py-0.5 rounded-full text-[10px] font-black bg-rose-100 text-rose-800 border border-rose-300">
                              <AlertCircle className="w-3 h-3 text-rose-600" />
                              <span>Dormant (&gt;14h)</span>
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="py-3 px-3 text-center font-bold text-slate-700">
                        <div>{c.totalTasks} Tugas</div>
                        <div className="text-[10px] text-slate-400 font-normal">
                          {c.totalMaterials} Materi • {c.totalTopics} Topik
                        </div>
                      </td>
                      <td className="py-3 px-3 text-center">
                        {c.readinessStatus === 'SIAP' ? (
                          <span className="px-2 py-0.5 rounded-md text-[10px] font-black bg-emerald-50 text-emerald-800 border border-emerald-300">
                            SIAP (100%)
                          </span>
                        ) : c.readinessStatus === 'PERLU_PERHATIAN' ? (
                          <span className="px-2 py-0.5 rounded-md text-[10px] font-black bg-amber-50 text-amber-900 border border-amber-300">
                            PERLU PERHATIAN
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 rounded-md text-[10px] font-black bg-rose-50 text-rose-800 border border-rose-300">
                            BELUM LENGKAP
                          </span>
                        )}
                      </td>
                      <td className="py-3 px-3 text-center">
                        {c.courseLink ? (
                          <a
                            href={c.courseLink}
                            target="_blank"
                            rel="noreferrer"
                            className="inline-flex items-center space-x-1 px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-lg text-[11px] font-bold transition-all cursor-pointer"
                          >
                            <span>Buka</span>
                            <ExternalLink className="w-3 h-3 text-slate-500" />
                          </a>
                        ) : (
                          <span className="text-slate-300">-</span>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* SUB-TAB 2: PENCOCOKAN JADWAL PELAJARAN (SCHEDULE MATCHER) */}
      {activeSubTab === 'schedule' && (
        <div className="bg-white border border-slate-200 rounded-2xl shadow-xs overflow-hidden">
          <div className="p-4 border-b border-slate-100 bg-amber-50/40 flex items-center justify-between">
            <div>
              <h4 className="font-extrabold text-sm text-slate-900">
                Pemeriksa Ketersediaan Kelas Sesuai Roster Resmi Sekolah
              </h4>
              <p className="text-xs text-slate-500 mt-0.5">
                Memastikan setiap mata pelajaran wajib kurikulum telah memiliki kelas aktif di Google Classroom.
              </p>
            </div>
            <div className="text-right">
              <span className="text-xs font-bold text-slate-600">Ketuntasan Roster: </span>
              <span className="font-black text-sm text-emerald-700">
                {scheduleCheck.totalCreated} dari {scheduleCheck.totalExpected} Terpenuhi
              </span>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead className="bg-slate-100 text-slate-700 font-extrabold text-[10px] uppercase tracking-wider border-b border-slate-200">
                <tr>
                  <th className="py-3 px-3 text-center w-8">No</th>
                  <th className="py-3 px-3">Mata Pelajaran (Roster Resmi)</th>
                  <th className="py-3 px-3 text-center">Kelas Target</th>
                  <th className="py-3 px-3 text-center">Status di Google Classroom</th>
                  <th className="py-3 px-3">Nama Kelas Terdeteksi</th>
                  <th className="py-3 px-3 text-center">Tindakan Waka</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {scheduleCheck.results.map((res, idx) => (
                  <tr
                    key={`${res.className}_${res.subjectName}`}
                    className={`transition-colors ${
                      res.isCreatedInClassroom ? 'hover:bg-slate-50' : 'bg-rose-50/30 hover:bg-rose-50/60'
                    }`}
                  >
                    <td className="py-3 px-3 text-center text-slate-400 font-mono text-[10px]">{idx + 1}</td>
                    <td className="py-3 px-3 font-bold text-slate-900">{res.subjectName}</td>
                    <td className="py-3 px-3 text-center font-extrabold text-slate-800">{res.className}</td>
                    <td className="py-3 px-3 text-center">
                      {res.isCreatedInClassroom ? (
                        <span className="inline-flex items-center space-x-1 px-2.5 py-0.5 rounded-full text-[10px] font-black bg-emerald-100 text-emerald-800 border border-emerald-300">
                          <CheckCircle className="w-3 h-3 text-emerald-600" />
                          <span>TERSEDIA</span>
                        </span>
                      ) : (
                        <span className="inline-flex items-center space-x-1 px-2.5 py-0.5 rounded-full text-[10px] font-black bg-rose-100 text-rose-800 border border-rose-300 animate-pulse">
                          <AlertTriangle className="w-3 h-3 text-rose-600" />
                          <span>BELUM DIBUAT</span>
                        </span>
                      )}
                    </td>
                    <td className="py-3 px-3">
                      {res.isCreatedInClassroom ? (
                        <span className="font-bold text-slate-800">{res.matchedCourseName}</span>
                      ) : (
                        <span className="text-rose-600 font-bold text-[11px]">
                          ⚠️ Kelas belum terdaftar di Google Classroom
                        </span>
                      )}
                    </td>
                    <td className="py-3 px-3 text-center">
                      {!res.isCreatedInClassroom ? (
                        <a
                          href="https://classroom.google.com"
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex items-center space-x-1 px-2.5 py-1 bg-rose-600 hover:bg-rose-700 text-white rounded-lg text-[10px] font-bold transition-all shadow-2xs cursor-pointer"
                        >
                          <span>Buat Kelas</span>
                          <ExternalLink className="w-3 h-3" />
                        </a>
                      ) : (
                        <span className="text-emerald-700 font-bold text-[11px]">Siap Digunakan</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};
