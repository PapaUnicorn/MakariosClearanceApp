import React, { useState, useMemo } from 'react';
import {
  GraduationCap,
  AlertTriangle,
  ShieldAlert,
  Search,
  Download,
  Printer,
  ChevronDown,
  ChevronRight,
  PieChart,
  BarChart3,
  Award,
  BookOpen,
  FileText,
  UserX,
  CheckCircle,
} from 'lucide-react';
import { AggregatedStudentGradebook, StudentClearanceRecord, CourseStudentGradeDetail } from '../types';
import {
  buildAggregatedGradebook,
  calculateAssessmentWeightDistribution,
  exportGradebookToCSV,
} from '../utils/gradebookAggregator';
import { EarlyWarningLetterModal } from './EarlyWarningLetterModal';

interface GradebookDashboardProps {
  studentRecords: StudentClearanceRecord[];
}

export const GradebookDashboard: React.FC<GradebookDashboardProps> = ({ studentRecords }) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedClass, setSelectedClass] = useState<string>('ALL');
  const [selectedRisk, setSelectedRisk] = useState<'ALL' | 'HIGH_RISK' | 'MEDIUM_RISK' | 'SAFE'>('ALL');
  const [expandedStudentId, setExpandedStudentId] = useState<string | null>(null);
  const [letterStudent, setLetterStudent] = useState<AggregatedStudentGradebook | null>(null);

  // Compute aggregated gradebook and subjects
  const { students, allSubjectNames } = useMemo(() => {
    return buildAggregatedGradebook(studentRecords);
  }, [studentRecords]);

  // Assessment weights distribution
  const assessmentWeights = useMemo(() => {
    return calculateAssessmentWeightDistribution(studentRecords);
  }, [studentRecords]);

  // Unique classes for filter
  const classList = useMemo(() => {
    const set = new Set<string>();
    students.forEach((s) => set.add(s.className));
    return Array.from(set).sort();
  }, [students]);

  // KPIs
  const kpis = useMemo(() => {
    const total = students.length;
    const highRisk = students.filter((s) => s.riskLevel === 'HIGH_RISK').length;
    const mediumRisk = students.filter((s) => s.riskLevel === 'MEDIUM_RISK').length;
    const safe = students.filter((s) => s.riskLevel === 'SAFE').length;

    const avgGPA =
      total > 0
        ? Math.round((students.reduce((acc, s) => acc + s.overallGPA, 0) / total) * 10) / 10
        : 0;

    return {
      total,
      highRisk,
      mediumRisk,
      safe,
      avgGPA,
    };
  }, [students]);

  // Filtered Students
  const filteredStudents = useMemo(() => {
    return students.filter((s) => {
      const matchSearch =
        s.studentName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        s.studentEmail.toLowerCase().includes(searchQuery.toLowerCase()) ||
        s.className.toLowerCase().includes(searchQuery.toLowerCase());

      const matchClass = selectedClass === 'ALL' || s.className === selectedClass;
      const matchRisk = selectedRisk === 'ALL' || s.riskLevel === selectedRisk;

      return matchSearch && matchClass && matchRisk;
    });
  }, [students, searchQuery, selectedClass, selectedRisk]);

  const handleExportCSV = () => {
    exportGradebookToCSV(filteredStudents, allSubjectNames);
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="space-y-6">
      {/* Early Warning Letter Modal */}
      {letterStudent && (
        <EarlyWarningLetterModal
          student={letterStudent}
          onClose={() => setLetterStudent(null)}
        />
      )}

      {/* Header Banner */}
      <div className="bg-white border border-indigo-200 rounded-2xl p-5 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-start space-x-3.5">
          <div className="w-12 h-12 rounded-2xl bg-indigo-600 border border-indigo-700 flex items-center justify-center font-black text-white shrink-0 shadow-2xs">
            <GraduationCap className="w-6 h-6 text-white" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <h2 className="text-lg font-black text-slate-900">Academic Progress & Gradebook Aggregator</h2>
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black bg-indigo-100 text-indigo-900 border border-indigo-200">
                Lintas Kelas
              </span>
            </div>
            <p className="text-xs text-slate-600 mt-0.5">
              Perekap nilai terpadu seluruh mata pelajaran Google Classroom, Early Warning System siswa tertunggak, dan analisis bobot asesmen.
            </p>
          </div>
        </div>

        <div className="flex items-center space-x-2 shrink-0">
          <button
            onClick={handleExportCSV}
            className="inline-flex items-center space-x-1.5 px-3 py-2 bg-emerald-700 hover:bg-emerald-800 text-white rounded-xl text-xs font-bold shadow-2xs transition-all active:scale-95 cursor-pointer"
            title="Ekspor seluruh rekap nilai ke format Excel / CSV"
          >
            <Download className="w-4 h-4" />
            <span>Ekspor CSV (Excel)</span>
          </button>
          <button
            onClick={handlePrint}
            className="inline-flex items-center space-x-1.5 px-3 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold shadow-2xs transition-all active:scale-95 cursor-pointer"
            title="Cetak Buku Nilai Rapor"
          >
            <Printer className="w-4 h-4 text-indigo-400" />
            <span>Cetak Rekap (A4)</span>
          </button>
        </div>
      </div>

      {/* KPI Cards & Early Warning Highlights */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5">
        {/* Total Siswa */}
        <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-xs">
          <div className="flex items-center justify-between text-xs font-bold text-slate-500 mb-1">
            <span>Total Siswa Terdata</span>
            <BookOpen className="w-4 h-4 text-indigo-600" />
          </div>
          <div className="flex items-baseline space-x-2">
            <span className="text-2xl font-black text-slate-900">{kpis.total}</span>
            <span className="text-xs font-bold text-slate-500">Siswa Aktif</span>
          </div>
          <p className="text-[10px] text-slate-400 mt-3">
            Mencakup {allSubjectNames.length} mata pelajaran di Google Classroom
          </p>
        </div>

        {/* High Risk Early Warning */}
        <div
          onClick={() => setSelectedRisk(selectedRisk === 'HIGH_RISK' ? 'ALL' : 'HIGH_RISK')}
          className={`border rounded-2xl p-4 shadow-xs cursor-pointer transition-all ${
            selectedRisk === 'HIGH_RISK'
              ? 'bg-rose-50 border-rose-400 ring-2 ring-rose-400'
              : 'bg-white border-slate-200 hover:border-rose-300'
          }`}
        >
          <div className="flex items-center justify-between text-xs font-bold text-rose-700 mb-1">
            <span>Peringatan Dini: Risiko Tinggi</span>
            <ShieldAlert className="w-4 h-4 text-rose-600 animate-bounce" />
          </div>
          <div className="flex items-baseline space-x-2">
            <span className="text-2xl font-black text-rose-600">{kpis.highRisk}</span>
            <span className="text-xs font-bold text-rose-600">Siswa Butuh Konseling</span>
          </div>
          <p className="text-[10px] text-rose-700 mt-3">
            &gt; 4 tugas missing atau nilai rata-rata &lt; 65
          </p>
        </div>

        {/* Medium Risk */}
        <div
          onClick={() => setSelectedRisk(selectedRisk === 'MEDIUM_RISK' ? 'ALL' : 'MEDIUM_RISK')}
          className={`border rounded-2xl p-4 shadow-xs cursor-pointer transition-all ${
            selectedRisk === 'MEDIUM_RISK'
              ? 'bg-amber-50 border-amber-400 ring-2 ring-amber-400'
              : 'bg-white border-slate-200 hover:border-amber-300'
          }`}
        >
          <div className="flex items-center justify-between text-xs font-bold text-amber-700 mb-1">
            <span>Perhatian: Risiko Sedang</span>
            <AlertTriangle className="w-4 h-4 text-amber-600" />
          </div>
          <div className="flex items-baseline space-x-2">
            <span className="text-2xl font-black text-amber-600">{kpis.mediumRisk}</span>
            <span className="text-xs font-bold text-slate-500">Siswa Perlu Follow-up</span>
          </div>
          <p className="text-[10px] text-amber-700 mt-3">
            2 - 4 tugas missing atau terlambat
          </p>
        </div>

        {/* School-wide Average GPA */}
        <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-xs">
          <div className="flex items-center justify-between text-xs font-bold text-slate-500 mb-1">
            <span>Rata-Rata Nilai Sekolah</span>
            <Award className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="flex items-baseline space-x-2">
            <span className="text-2xl font-black text-emerald-700">{kpis.avgGPA}</span>
            <span className="text-xs font-bold text-emerald-600">Skala 100</span>
          </div>
          <p className="text-[10px] text-slate-400 mt-3">
            {kpis.safe} siswa ({kpis.total > 0 ? Math.round((kpis.safe / kpis.total) * 100) : 0}%) berada dalam status AMAN
          </p>
        </div>
      </div>

      {/* Assessment Weights & Pedagogical Distribution Bar */}
      {assessmentWeights.length > 0 && (
        <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-xs">
          <div className="flex items-center justify-between mb-2.5">
            <div className="flex items-center space-x-2">
              <PieChart className="w-4 h-4 text-indigo-600" />
              <h4 className="text-xs font-black text-slate-900">
                Analisis Bobot & Distribusi Penilaian (Assessment Balance)
              </h4>
            </div>
            <span className="text-[11px] font-bold text-slate-500">
              Total {assessmentWeights.reduce((a, b) => a + b.count, 0)} Tugas Dianalisis
            </span>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-5 gap-2.5">
            {assessmentWeights.map((aw) => (
              <div
                key={aw.category}
                className="bg-slate-50 border border-slate-200/80 rounded-xl p-2.5 text-xs"
              >
                <div className="flex items-center justify-between text-[11px] font-bold text-slate-700 mb-1">
                  <span className="truncate" title={aw.label}>{aw.label}</span>
                  <span className="font-black text-indigo-600">{aw.percentage}%</span>
                </div>
                <div className="w-full bg-slate-200 rounded-full h-1.5 overflow-hidden">
                  <div
                    className="bg-indigo-600 h-1.5 rounded-full"
                    style={{ width: `${aw.percentage}%` }}
                  />
                </div>
                <div className="text-[10px] text-slate-500 mt-1.5 flex justify-between">
                  <span>{aw.count} tugas</span>
                  <span>Rata-rata {aw.averageMaxPoints} Poin</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Main Gradebook Matrix */}
      <div className="bg-white border border-slate-200 rounded-2xl shadow-xs overflow-hidden">
        {/* Controls & Filter Bar */}
        <div className="p-4 border-b border-slate-100 bg-slate-50/60 flex flex-col md:flex-row items-center justify-between gap-3">
          <div className="relative w-full md:w-80">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Cari siswa, email, atau kelas..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-2 bg-white border border-slate-200 rounded-xl text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:border-indigo-500 shadow-2xs"
            />
          </div>

          <div className="flex flex-wrap items-center gap-2.5 w-full md:w-auto">
            <select
              value={selectedClass}
              onChange={(e) => setSelectedClass(e.target.value)}
              className="bg-white border border-slate-200 rounded-xl px-3 py-1.5 text-xs font-bold text-slate-700 focus:outline-none focus:border-indigo-500 shadow-2xs"
            >
              <option value="ALL">Semua Kelas ({classList.length})</option>
              {classList.map((c) => (
                <option key={c} value={c}>
                  Kelas {c}
                </option>
              ))}
            </select>

            <select
              value={selectedRisk}
              onChange={(e) => setSelectedRisk(e.target.value as any)}
              className="bg-white border border-slate-200 rounded-xl px-3 py-1.5 text-xs font-bold text-slate-700 focus:outline-none focus:border-indigo-500 shadow-2xs"
            >
              <option value="ALL">Status Risiko: Semua ({students.length})</option>
              <option value="HIGH_RISK">🔴 Risiko Tinggi ({kpis.highRisk})</option>
              <option value="MEDIUM_RISK">🟡 Risiko Sedang ({kpis.mediumRisk})</option>
              <option value="SAFE">🟢 Aman ({kpis.safe})</option>
            </select>
          </div>
        </div>

        {/* Matrix Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left">
            <thead className="bg-slate-100 text-slate-700 font-extrabold text-[10px] uppercase tracking-wider border-b border-slate-200">
              <tr>
                <th className="py-3 px-3 text-center w-8">No</th>
                <th className="py-3 px-3 min-w-[200px]">Nama Siswa & Kelas</th>
                {allSubjectNames.map((subj) => (
                  <th key={subj} className="py-3 px-2 text-center min-w-[90px]" title={subj}>
                    <div className="truncate max-w-[110px] mx-auto">{subj}</div>
                  </th>
                ))}
                <th className="py-3 px-3 text-center min-w-[80px]">Rata-Rata</th>
                <th className="py-3 px-3 text-center min-w-[60px]">Predikat</th>
                <th className="py-3 px-3 text-center min-w-[120px]">Early Warning</th>
                <th className="py-3 px-3 text-center min-w-[100px]">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredStudents.length === 0 ? (
                <tr>
                  <td colSpan={allSubjectNames.length + 6} className="py-10 text-center text-slate-500 font-semibold">
                    Tidak ada data siswa yang memenuhi filter yang dipilih.
                  </td>
                </tr>
              ) : (
                filteredStudents.map((s, idx) => {
                  const isExpanded = expandedStudentId === s.studentId;

                  return (
                    <React.Fragment key={s.studentId}>
                      <tr className={`hover:bg-indigo-50/20 transition-colors ${s.riskLevel === 'HIGH_RISK' ? 'bg-rose-50/20' : ''}`}>
                        <td className="py-3 px-3 text-center text-slate-400 font-mono text-[10px]">{idx + 1}</td>
                        <td className="py-3 px-3">
                          <div className="flex items-center space-x-2.5">
                            {s.studentPhoto ? (
                              <img
                                src={s.studentPhoto}
                                alt={s.studentName}
                                className="w-7 h-7 rounded-full object-cover border border-slate-200 shrink-0"
                                referrerPolicy="no-referrer"
                              />
                            ) : (
                              <div className="w-7 h-7 rounded-full bg-slate-200 flex items-center justify-center font-black text-slate-600 text-[10px] shrink-0">
                                {s.studentName.slice(0, 2).toUpperCase()}
                              </div>
                            )}
                            <div>
                              <div className="font-extrabold text-slate-900">{s.studentName}</div>
                              <div className="text-[10px] text-slate-500">
                                {s.className} • {s.studentEmail}
                              </div>
                            </div>
                          </div>
                        </td>

                        {/* Subject Score Columns */}
                        {allSubjectNames.map((subj) => {
                          const g = s.courseGrades[subj];
                          if (!g || (g.averageScore === 0 && g.gradedTasks === 0)) {
                            return (
                              <td key={subj} className="py-3 px-2 text-center text-slate-300 font-mono">
                                -
                              </td>
                            );
                          }

                          const score = g.averageScore;
                          const scoreColor =
                            score >= 85
                              ? 'text-emerald-700 bg-emerald-50'
                              : score >= 75
                              ? 'text-blue-700 bg-blue-50'
                              : score >= 60
                              ? 'text-amber-700 bg-amber-50'
                              : 'text-rose-700 bg-rose-50 font-black';

                          return (
                            <td key={subj} className="py-3 px-2 text-center">
                              <span
                                className={`inline-block px-1.5 py-0.5 rounded font-bold font-mono text-[11px] ${scoreColor}`}
                                title={`${subj}: ${score} (Selesai ${g.gradedTasks}/${g.totalTasks}, Missing: ${g.missingTasks})`}
                              >
                                {score}
                              </span>
                            </td>
                          );
                        })}

                        {/* GPA Column */}
                        <td className="py-3 px-3 text-center">
                          <span className="font-black text-slate-900 font-mono text-sm">
                            {s.overallGPA}
                          </span>
                        </td>

                        {/* Predikat */}
                        <td className="py-3 px-3 text-center">
                          <span
                            className={`px-2 py-0.5 rounded-md font-black text-[10px] ${
                              s.letterGrade === 'A'
                                ? 'bg-emerald-100 text-emerald-800'
                                : s.letterGrade === 'B'
                                ? 'bg-blue-100 text-blue-800'
                                : s.letterGrade === 'C'
                                ? 'bg-amber-100 text-amber-800'
                                : 'bg-rose-100 text-rose-800'
                            }`}
                          >
                            {s.letterGrade}
                          </span>
                        </td>

                        {/* Early Warning Status */}
                        <td className="py-3 px-3 text-center">
                          {s.riskLevel === 'HIGH_RISK' ? (
                            <span className="inline-flex items-center space-x-1 px-2.5 py-0.5 rounded-full text-[10px] font-black bg-rose-100 text-rose-800 border border-rose-300 animate-pulse">
                              <ShieldAlert className="w-3 h-3 text-rose-600" />
                              <span>RISIKO TINGGI</span>
                            </span>
                          ) : s.riskLevel === 'MEDIUM_RISK' ? (
                            <span className="inline-flex items-center space-x-1 px-2.5 py-0.5 rounded-full text-[10px] font-black bg-amber-100 text-amber-900 border border-amber-300">
                              <AlertTriangle className="w-3 h-3 text-amber-600" />
                              <span>SEDANG</span>
                            </span>
                          ) : (
                            <span className="inline-flex items-center space-x-1 px-2.5 py-0.5 rounded-full text-[10px] font-black bg-emerald-100 text-emerald-800 border border-emerald-300">
                              <CheckCircle className="w-3 h-3 text-emerald-600" />
                              <span>AMAN</span>
                            </span>
                          )}
                        </td>

                        {/* Action Buttons */}
                        <td className="py-3 px-3 text-center">
                          <div className="inline-flex items-center space-x-1.5">
                            {s.riskLevel !== 'SAFE' && (
                              <button
                                onClick={() => setLetterStudent(s)}
                                className="px-2 py-1 bg-rose-600 hover:bg-rose-700 text-white rounded-lg text-[10px] font-bold transition-all shadow-2xs cursor-pointer flex items-center space-x-1"
                                title="Buat & Cetak Surat Panggilan / Konseling"
                              >
                                <FileText className="w-3 h-3" />
                                <span>Surat SP</span>
                              </button>
                            )}

                            <button
                              onClick={() => setExpandedStudentId(isExpanded ? null : s.studentId)}
                              className="p-1 hover:bg-slate-200 text-slate-600 rounded-lg transition-colors cursor-pointer"
                              title="Lihat detail tugas per mapel"
                            >
                              {isExpanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                            </button>
                          </div>
                        </td>
                      </tr>

                      {/* Expanded Row Detail */}
                      {isExpanded && (
                        <tr className="bg-slate-50 border-y border-slate-200">
                          <td colSpan={allSubjectNames.length + 6} className="p-4">
                            <div className="bg-white border border-slate-200 rounded-xl p-3.5 shadow-2xs">
                              <div className="flex items-center justify-between mb-2">
                                <h5 className="font-extrabold text-xs text-slate-800">
                                  Rincian Penugasan & Masalah Siswa: {s.studentName} ({s.className})
                                </h5>
                                <span className="text-[11px] font-bold text-slate-500">
                                  Total Tugas: {s.totalCompletedTasks} Tuntas / {s.totalAssignedTasks} Diberikan
                                </span>
                              </div>

                              <div className="text-xs text-rose-700 mb-3 font-medium">
                                <span className="font-bold">Indikator Peringatan: </span>
                                {s.riskReasons.join(' • ')}
                              </div>

                              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                                {(Object.entries(s.courseGrades) as [string, CourseStudentGradeDetail][]).map(([cName, g]) => (
                                  <div
                                    key={cName}
                                    className="p-2.5 rounded-lg border border-slate-100 bg-slate-50/70 text-xs flex justify-between items-center"
                                  >
                                    <div>
                                      <div className="font-bold text-slate-900 truncate max-w-[150px]">{cName}</div>
                                      <div className="text-[10px] text-slate-500">
                                        Tuntas: {g.gradedTasks}/{g.totalTasks} tugas
                                      </div>
                                    </div>
                                    <div className="text-right">
                                      <div className="font-mono font-bold text-slate-800">{g.averageScore}</div>
                                      {g.missingTasks > 0 ? (
                                        <div className="text-[10px] text-rose-600 font-bold">
                                          {g.missingTasks} Missing
                                        </div>
                                      ) : (
                                        <div className="text-[10px] text-emerald-600 font-bold">Lancar</div>
                                      )}
                                    </div>
                                  </div>
                                ))}
                              </div>
                            </div>
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
