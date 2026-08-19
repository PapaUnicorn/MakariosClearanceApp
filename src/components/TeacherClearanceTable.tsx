import React, { useState, useMemo } from 'react';
import {
  Search,
  Filter,
  FileText,
  CheckCircle,
  AlertTriangle,
  ExternalLink,
  BookOpen,
  Eye,
  Clock,
  User,
  GraduationCap,
} from 'lucide-react';
import { TeacherSummaryRecord } from '../types';
import { exportTeachersToPDF } from '../utils/pdfExport';

interface TeacherClearanceTableProps {
  records: TeacherSummaryRecord[];
  onSelectTeacherRecord: (record: TeacherSummaryRecord) => void;
}

export const TeacherClearanceTable: React.FC<TeacherClearanceTableProps> = ({
  records,
  onSelectTeacherRecord,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'NEED_GRADING' | 'CLEAR'>('ALL');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 15;

  const filteredRecords = useMemo(() => {
    return records.filter((r) => {
      const courseNames = r.assignedCourses.map((c) => `${c.courseName} ${c.className}`).join(' ');
      const matchesSearch =
        searchTerm === '' ||
        r.teacherName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        r.teacherEmail.toLowerCase().includes(searchTerm.toLowerCase()) ||
        courseNames.toLowerCase().includes(searchTerm.toLowerCase());

      if (!matchesSearch) return false;

      if (statusFilter === 'NEED_GRADING' && r.isClear) return false;
      if (statusFilter === 'CLEAR' && !r.isClear) return false;

      return true;
    });
  }, [records, searchTerm, statusFilter]);

  const totalPages = Math.ceil(filteredRecords.length / itemsPerPage) || 1;
  const paginatedRecords = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return filteredRecords.slice(start, start + itemsPerPage);
  }, [filteredRecords, currentPage, itemsPerPage]);

  const handleExportPDF = () => {
    if (filteredRecords.length === 0) return;
    exportTeachersToPDF(filteredRecords);
  };

  return (
    <div id="teacher-clearance-bento" className="space-y-4">
      {/* Bento Controls Card with Maybank theme */}
      <div className="bg-white border border-amber-200/80 rounded-2xl p-4 sm:p-5 shadow-xs space-y-3.5">
        <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center justify-between">
          {/* Search */}
          <div className="relative flex-1 min-w-[240px]">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              id="teacher-search-input"
              type="text"
              placeholder="Cari berdasarkan nama guru, email, kelas, atau mapel..."
              value={searchTerm}
              onChange={(e) => {
                setSearchTerm(e.target.value);
                setCurrentPage(1);
              }}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-9 pr-4 py-2 text-xs sm:text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:border-amber-500 focus:bg-white transition-all"
            />
            {searchTerm && (
              <button
                onClick={() => setSearchTerm('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-slate-400 hover:text-slate-600 font-bold cursor-pointer"
              >
                Clear
              </button>
            )}
          </div>

          {/* Filter Status & Exports */}
          <div className="flex items-center space-x-2">
            <select
              id="filter-teacher-status"
              value={statusFilter}
              onChange={(e) => {
                setStatusFilter(e.target.value as any);
                setCurrentPage(1);
              }}
              className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-700 font-medium focus:outline-none focus:border-amber-500 focus:bg-white cursor-pointer"
            >
              <option value="ALL">Semua Guru ({records.length} Guru)</option>
              <option value="NEED_GRADING">Ada Tugas Belum Digrading ({records.filter(r => !r.isClear).length})</option>
              <option value="CLEAR">Semua Selesai Digrading ({records.filter(r => r.isClear).length})</option>
            </select>

            <button
              id="btn-export-teacher-pdf"
              onClick={handleExportPDF}
              disabled={filteredRecords.length === 0}
              className="inline-flex items-center justify-center space-x-1.5 px-4 py-2 bg-slate-900 hover:bg-slate-800 disabled:opacity-50 text-white rounded-xl text-xs font-bold shadow-xs transition-all whitespace-nowrap active:scale-95 cursor-pointer border border-slate-800"
              title="Unduh Laporan PDF Guru"
            >
              <FileText className="w-4 h-4 text-[#FFC800]" />
              <span>Ekspor PDF Rekap</span>
            </button>
          </div>
        </div>
      </div>

      {/* Main Bento Table (Upper Left Aligned) */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs flex flex-col overflow-hidden">
        {/* Table Bento Header */}
        <div className="p-4 border-b border-amber-100 bg-amber-50/30 flex justify-between items-center">
          <h2 className="font-bold text-slate-800 text-sm">Daftar Grading Guru (Teacher Grading Hub)</h2>
          <span className="text-xs text-slate-500 font-medium">
            Menampilkan {paginatedRecords.length} dari {filteredRecords.length} guru
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm border-collapse">
            <thead className="bg-slate-50 text-slate-600 font-bold uppercase text-[10px] tracking-widest border-b border-slate-200">
              <tr>
                <th className="px-4 py-3 text-left align-top">Nama Guru</th>
                <th className="px-4 py-3 text-left align-top">Mata Pelajaran & Kelas</th>
                <th className="px-4 py-3 text-left align-top">Tugas Belum Dinilai</th>
                <th className="px-4 py-3 text-left align-top">Jumlah Siswa Belum Dinilai</th>
                <th className="px-4 py-3 text-left align-top">Status Grading</th>
                <th className="px-4 py-3 text-left align-top">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-xs">
              {paginatedRecords.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-slate-500">
                    <div className="flex flex-col items-center justify-center space-y-2">
                      <CheckCircle className="w-8 h-8 text-emerald-500" />
                      <span className="text-sm font-bold text-slate-700">Tidak ada data guru yang perlu ditampilkan</span>
                      <span className="text-xs text-slate-400">Semua tugas mungkin sudah dinilai atau ubah filter pencarian</span>
                    </div>
                  </td>
                </tr>
              ) : (
                paginatedRecords.map((teacher) => {
                  return (
                    <tr
                      key={teacher.teacherId}
                      className="hover:bg-amber-50/30 transition-colors cursor-pointer group"
                      onClick={() => onSelectTeacherRecord(teacher)}
                    >
                      {/* 1. Nama Guru (Upper Left Aligned) */}
                      <td className="px-4 py-3.5 align-top text-left">
                        <div className="flex items-start space-x-2.5">
                          {teacher.teacherPhoto ? (
                            <img
                              src={teacher.teacherPhoto}
                              alt={teacher.teacherName}
                              className="w-7 h-7 rounded-full border border-amber-300 object-cover shrink-0 mt-0.5"
                              referrerPolicy="no-referrer"
                            />
                          ) : (
                            <div className="w-7 h-7 rounded-full bg-amber-100 text-slate-900 font-bold flex items-center justify-center text-xs border border-amber-300 shrink-0 mt-0.5">
                              {teacher.teacherName.charAt(0)}
                            </div>
                          )}
                          <div className="min-w-0">
                            <div className="font-bold text-slate-900 group-hover:text-amber-800 transition-colors">
                              {teacher.teacherName}
                            </div>
                            {teacher.teacherEmail && (
                              <div className="text-[11px] text-slate-400 truncate max-w-[170px]">
                                {teacher.teacherEmail}
                              </div>
                            )}
                          </div>
                        </div>
                      </td>

                      {/* 2. Mata Pelajaran & Kelas Diampu (Upper Left Aligned) */}
                      <td className="px-4 py-3.5 align-top text-left">
                        <div className="space-y-1">
                          {teacher.assignedCourses.slice(0, 3).map((c, i) => (
                            <div key={i} className="flex items-center space-x-1 text-slate-700">
                              <BookOpen className="w-3 h-3 text-amber-600 shrink-0" />
                              <span className="font-medium truncate max-w-[200px]">{c.courseName}</span>
                              <span className="px-1.5 py-0.2 rounded text-[10px] font-semibold bg-slate-100 text-slate-600 border border-slate-200">
                                {c.className}
                              </span>
                            </div>
                          ))}
                          {teacher.assignedCourses.length > 3 && (
                            <div className="text-[10px] font-bold text-slate-400">
                              +{teacher.assignedCourses.length - 3} kelas lainnya
                            </div>
                          )}
                        </div>
                      </td>

                      {/* 3. Tugas Belum Dinilai (Upper Left Aligned) */}
                      <td className="px-4 py-3.5 align-top text-left">
                        {teacher.ungradedTasksList.length === 0 ? (
                          <div className="text-emerald-600 font-bold flex items-center space-x-1">
                            <CheckCircle className="w-3.5 h-3.5" />
                            <span>Semua Tugas Dinilai</span>
                          </div>
                        ) : (
                          <div className="space-y-1">
                            {teacher.ungradedTasksList.slice(0, 2).map((t, idx) => (
                              <div key={idx} className="text-slate-800 font-medium">
                                <span className="text-rose-500 font-bold">• </span>
                                {t.courseWorkTitle}
                              </div>
                            ))}
                            {teacher.ungradedTasksList.length > 2 && (
                              <div className="text-[10px] text-slate-400 font-bold">
                                +{teacher.ungradedTasksList.length - 2} tugas lainnya
                              </div>
                            )}
                          </div>
                        )}
                      </td>

                      {/* 4. Jumlah Siswa Belum Dinilai (Upper Left Aligned) */}
                      <td className="px-4 py-3.5 align-top text-left whitespace-nowrap">
                        {teacher.totalUngradedCount > 0 ? (
                          <span className="inline-flex items-center space-x-1 px-2.5 py-1 rounded-lg text-xs font-black bg-rose-50 text-rose-700 border border-rose-200">
                            <Clock className="w-3 h-3 text-rose-500" />
                            <span>{teacher.totalUngradedCount} Pengumpulan</span>
                          </span>
                        ) : (
                          <span className="inline-flex items-center space-x-1 px-2.5 py-1 rounded-lg text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                            <CheckCircle className="w-3 h-3 text-emerald-600" />
                            <span>0 Belum Dinilai</span>
                          </span>
                        )}
                      </td>

                      {/* 5. Status Grading (Upper Left Aligned) */}
                      <td className="px-4 py-3.5 align-top text-left whitespace-nowrap">
                        <span
                          className={`inline-block px-2.5 py-0.5 rounded-full text-xs font-bold ${
                            teacher.isClear
                              ? 'bg-emerald-100 text-emerald-700 border border-emerald-200'
                              : 'bg-rose-100 text-rose-700 border border-rose-200'
                          }`}
                        >
                          {teacher.isClear ? 'CLEAR (SELESAI)' : 'PERLU GRADING'}
                        </span>
                      </td>

                      {/* 6. Aksi */}
                      <td className="px-4 py-3.5 align-top text-left whitespace-nowrap">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            onSelectTeacherRecord(teacher);
                          }}
                          className="inline-flex items-center space-x-1 px-2.5 py-1 bg-slate-900 hover:bg-slate-800 text-amber-300 rounded-lg text-xs font-bold border border-slate-800 transition-colors cursor-pointer"
                        >
                          <Eye className="w-3.5 h-3.5 text-[#FFC800]" />
                          <span>Rincian</span>
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Table Footer */}
        {filteredRecords.length > 0 && (
          <div className="p-4 bg-slate-50/80 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
            <div>
              Menampilkan {Math.min(filteredRecords.length, (currentPage - 1) * itemsPerPage + 1)} -{' '}
              {Math.min(filteredRecords.length, currentPage * itemsPerPage)} dari {filteredRecords.length} guru
            </div>
            <div className="flex items-center space-x-1.5">
              <button
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                disabled={currentPage === 1}
                className="px-3 py-1 rounded-lg bg-white hover:bg-amber-50 disabled:opacity-40 text-slate-700 text-xs font-bold border border-slate-200 shadow-2xs cursor-pointer"
              >
                Sebelumnya
              </button>
              <span className="px-2 font-bold text-slate-700">
                {currentPage} / {totalPages}
              </span>
              <button
                onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages}
                className="px-3 py-1 rounded-lg bg-white hover:bg-amber-50 disabled:opacity-40 text-slate-700 text-xs font-bold border border-slate-200 shadow-2xs cursor-pointer"
              >
                Selanjutnya
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
