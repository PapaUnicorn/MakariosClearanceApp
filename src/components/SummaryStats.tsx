import React from 'react';
import {
  Users,
  BookOpen,
  CheckCircle2,
  AlertTriangle,
  Clock,
  Award,
  Layers,
  Sparkles,
} from 'lucide-react';
import { StudentClearanceRecord, TeacherClearanceRecord, TeacherSummaryRecord } from '../types';

interface SummaryStatsProps {
  studentRecords: StudentClearanceRecord[];
  teacherRecords: TeacherClearanceRecord[];
  teacherSummaryRecords: TeacherSummaryRecord[];
}

export const SummaryStats: React.FC<SummaryStatsProps> = ({
  studentRecords,
  teacherRecords,
  teacherSummaryRecords,
}) => {
  const uniqueStudents = new Set(studentRecords.map((s) => s.studentId)).size;
  const totalClasses = teacherRecords.length;
  const totalTeachers = teacherSummaryRecords.length;

  const totalTasksUnsubmitted = studentRecords.reduce(
    (acc, s) => acc + s.pendingUnsubmittedTasks.length,
    0
  );
  const totalTasksUngraded = teacherSummaryRecords.reduce(
    (acc, t) => acc + t.totalUngradedSubmissions,
    0
  );

  const clearStudentsCount = studentRecords.filter((s) => s.isClear).length;
  const clearRate =
    studentRecords.length > 0
      ? Math.round((clearStudentsCount / studentRecords.length) * 100)
      : 0;

  return (
    <div id="bento-analytics-container" className="space-y-4">
      {/* 4-Column Bento Metric Cards with Maybank Golden Yellow Theme */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Students */}
        <div className="bg-white rounded-2xl border border-amber-200/80 p-5 flex flex-col justify-center shadow-xs">
          <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
            Total Record Siswa
          </span>
          <span className="text-3xl font-black text-slate-900 mt-1">
            {studentRecords.length}
          </span>
          <span className="text-[11px] text-slate-500 mt-1">
            {uniqueStudents} siswa terdaftar di {totalClasses} kelas
          </span>
        </div>

        {/* Pending Student Tasks */}
        <div className="bg-white rounded-2xl border border-amber-200/80 p-5 flex flex-col justify-center shadow-xs">
          <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
            Tugas Belum Dikumpul
          </span>
          <span className="text-3xl font-black text-rose-500 mt-1">
            {totalTasksUnsubmitted}
          </span>
          <span className="text-[11px] text-slate-500 mt-1">
            Perlu diserahkan oleh siswa
          </span>
        </div>

        {/* Ungraded Tasks */}
        <div className="bg-white rounded-2xl border border-amber-200/80 p-5 flex flex-col justify-center shadow-xs">
          <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
            Antrean Grading Guru
          </span>
          <span className="text-3xl font-black text-amber-600 mt-1">
            {totalTasksUngraded}
          </span>
          <span className="text-[11px] text-slate-500 mt-1">
            Submisi diserahkan menunggu nilai ({totalTeachers} guru)
          </span>
        </div>

        {/* Clearance Rate */}
        <div className="bg-white rounded-2xl border border-amber-200/80 p-5 flex flex-col justify-center shadow-xs">
          <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
            Clearance Rate Siswa
          </span>
          <span className="text-3xl font-black text-emerald-600 mt-1">
            {clearRate}%
          </span>
          <span className="text-[11px] text-slate-500 mt-1">
            {clearStudentsCount} dari {studentRecords.length} tuntas 100%
          </span>
        </div>
      </div>

      {/* Bento Main Grid Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        {/* Left Bento: Student Breakdown (8 cols) */}
        <div className="lg:col-span-8 bg-white rounded-2xl border border-slate-200 shadow-xs flex flex-col overflow-hidden">
          <div className="p-4 border-b border-amber-100 bg-amber-50/40 flex justify-between items-center">
            <h2 className="font-bold text-slate-800 text-sm">Distribusi Status Clearance Siswa</h2>
            <span className="text-xs text-slate-500 font-semibold">{studentRecords.length} entri aktif</span>
          </div>

          <div className="p-5 space-y-5">
            <div>
              <div className="flex justify-between text-xs mb-1.5 font-bold">
                <span className="text-emerald-600 flex items-center gap-1.5">
                  <CheckCircle2 className="w-4 h-4" />
                  Siswa Status Clear (Tugas Lengkap & Dinilai)
                </span>
                <span className="text-slate-800">{clearStudentsCount} Siswa ({clearRate}%)</span>
              </div>
              <div className="w-full bg-slate-100 h-2.5 rounded-full overflow-hidden">
                <div
                  className="bg-emerald-500 h-2.5 rounded-full transition-all"
                  style={{ width: `${clearRate}%` }}
                />
              </div>
            </div>

            <div>
              <div className="flex justify-between text-xs mb-1.5 font-bold">
                <span className="text-rose-600 flex items-center gap-1.5">
                  <AlertTriangle className="w-4 h-4" />
                  Siswa Belum Clear (Terdapat Tugas Belum Selesai)
                </span>
                <span className="text-slate-800">
                  {studentRecords.length - clearStudentsCount} Siswa ({100 - clearRate}%)
                </span>
              </div>
              <div className="w-full bg-slate-100 h-2.5 rounded-full overflow-hidden">
                <div
                  className="bg-rose-500 h-2.5 rounded-full transition-all"
                  style={{ width: `${100 - clearRate}%` }}
                />
              </div>
            </div>

            <div className="p-4 bg-amber-50/50 rounded-xl border border-amber-200/80 text-xs text-slate-700">
              <span className="font-bold text-slate-900">Kriteria Clearance:</span> Siswa dinyatakan berstatus{' '}
              <span className="text-emerald-700 font-bold bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-200">
                CLEAR
              </span>{' '}
              apabila seluruh tugas yang dipublikasikan di Google Classroom telah diserahkan dan nilai telah diberikan/dikembalikan oleh guru.
            </div>
          </div>
        </div>

        {/* Right Bento: Teacher Performance Overview (4 cols) */}
        <div className="lg:col-span-4 bg-white rounded-2xl border border-slate-200 shadow-xs flex flex-col overflow-hidden">
          <div className="p-4 border-b border-amber-100 bg-amber-50/40 flex justify-between items-center">
            <h2 className="font-bold text-slate-800 text-sm">Teacher Grading Overview</h2>
            <span className="text-xs bg-[#FFC800] px-2 py-0.5 rounded-full font-black text-slate-950">
              {totalTeachers} Guru
            </span>
          </div>

          <div className="divide-y divide-slate-100 overflow-y-auto max-h-[380px]">
            {teacherSummaryRecords.slice(0, 5).map((tRecord) => {
              const ungraded = tRecord.totalUngradedSubmissions;
              const isDone = ungraded === 0;

              return (
                <div key={tRecord.teacherId} className="p-4 flex flex-col gap-1 hover:bg-amber-50/30 transition-colors">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-800 truncate max-w-[170px]" title={tRecord.teacherName}>
                      {tRecord.teacherName}
                    </span>
                    <span className="text-[10px] bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full font-semibold">
                      {tRecord.assignedCourses.length} Kelas
                    </span>
                  </div>

                  <div className="text-[11px] text-slate-500 truncate">
                    {tRecord.assignedCourses.map((c) => c.courseName).join(', ')}
                  </div>

                  <div className="flex justify-between items-end mt-1">
                    <span className="text-[10px] uppercase font-bold text-slate-400">Submisi Belum Digrading</span>
                    <span
                      className={`text-sm font-black ${
                        isDone ? 'text-emerald-600' : ungraded > 5 ? 'text-rose-600' : 'text-amber-600'
                      }`}
                    >
                      {ungraded}
                    </span>
                  </div>

                  <div className="w-full bg-slate-100 h-1.5 rounded-full mt-1 overflow-hidden">
                    <div
                      className={`h-1.5 rounded-full ${
                        isDone ? 'bg-emerald-500 w-full' : 'bg-[#FFC800]'
                      }`}
                      style={{ width: isDone ? '100%' : `${Math.min(100, Math.max(15, ungraded * 10))}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>

          <div className="mt-auto p-3 bg-amber-50/50 text-[10px] text-center text-slate-500 font-bold uppercase tracking-wider border-t border-amber-100">
            Google Classroom Sync • Real-time Data
          </div>
        </div>
      </div>
    </div>
  );
};
