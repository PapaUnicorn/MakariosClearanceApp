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
  X,
  RotateCcw,
  Users,
  Layers,
} from 'lucide-react';
import { TeacherSummaryRecord } from '../types';
import { exportTeachersToPDF } from '../utils/pdfExport';
import { ExcelMultiSelectFilter } from './ExcelMultiSelectFilter';

interface TeacherClearanceTableProps {
  records: TeacherSummaryRecord[];
  onSelectTeacherRecord: (record: TeacherSummaryRecord) => void;
}

export const TeacherClearanceTable: React.FC<TeacherClearanceTableProps> = ({
  records,
  onSelectTeacherRecord,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedClasses, setSelectedClasses] = useState<string[]>([]);
  const [selectedCourses, setSelectedCourses] = useState<string[]>([]);
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'NEED_GRADING' | 'CLEAR'>('ALL');
  const [workloadFilter, setWorkloadFilter] = useState<'ALL' | 'HEAVY' | 'MEDIUM' | 'ZERO'>('ALL');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 15;

  // Extract unique classes across all teachers
  const availableClasses = useMemo(() => {
    const classSet = new Set<string>();
    records.forEach((teacher) => {
      teacher.assignedCourses.forEach((c) => {
        if (c.className && c.className.trim()) {
          classSet.add(c.className.trim());
        }
      });
    });
    return Array.from(classSet).sort((a, b) => a.localeCompare(b, undefined, { numeric: true }));
  }, [records]);

  // Extract unique course names across all teachers
  const availableCourses = useMemo(() => {
    const courseSet = new Set<string>();
    records.forEach((teacher) => {
      teacher.assignedCourses.forEach((c) => {
        if (c.courseName && c.courseName.trim()) {
          courseSet.add(c.courseName.trim());
        }
      });
    });
    return Array.from(courseSet).sort();
  }, [records]);

  // Calculate counts for class options
  const classCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    availableClasses.forEach((cls) => {
      counts[cls] = records.filter((t) => t.assignedCourses.some((c) => c.className === cls)).length;
    });
    return counts;
  }, [records, availableClasses]);

  // Calculate counts for course options
  const courseCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    availableCourses.forEach((crs) => {
      counts[crs] = records.filter((t) => t.assignedCourses.some((c) => c.courseName === crs)).length;
    });
    return counts;
  }, [records, availableCourses]);

  // Main Filtering Logic
  const filteredRecords = useMemo(() => {
    return records.filter((r) => {
      const courseNames = r.assignedCourses.map((c) => `${c.courseName} ${c.className}`).join(' ');
      const ungradedTaskNames = r.ungradedTasksList.map((t) => t.courseWorkTitle).join(' ');

      // 1. Text Search
      const matchesSearch =
        searchTerm === '' ||
        r.teacherName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        r.teacherEmail.toLowerCase().includes(searchTerm.toLowerCase()) ||
        courseNames.toLowerCase().includes(searchTerm.toLowerCase()) ||
        ungradedTaskNames.toLowerCase().includes(searchTerm.toLowerCase());

      if (!matchesSearch) return false;

      // 2. Class Filter (if any selected)
      if (selectedClasses.length > 0) {
        const teachesSelectedClass = r.assignedCourses.some((c) =>
          selectedClasses.includes(c.className)
        );
        if (!teachesSelectedClass) return false;
      }

      // 3. Course Filter (if any selected)
      if (selectedCourses.length > 0) {
        const teachesSelectedCourse = r.assignedCourses.some((c) =>
          selectedCourses.includes(c.courseName)
        );
        if (!teachesSelectedCourse) return false;
      }

      // 4. Status Filter
      if (statusFilter === 'NEED_GRADING' && r.isClear) return false;
      if (statusFilter === 'CLEAR' && !r.isClear) return false;

      // 5. Workload Filter
      const ungradedCount = r.totalUngradedSubmissions || 0;
      if (workloadFilter === 'HEAVY' && ungradedCount <= 15) return false;
      if (workloadFilter === 'MEDIUM' && (ungradedCount === 0 || ungradedCount > 15)) return false;
      if (workloadFilter === 'ZERO' && ungradedCount > 0) return false;

      return true;
    });
  }, [records, searchTerm, selectedClasses, selectedCourses, statusFilter, workloadFilter]);

  // KPI calculations on filtered records
  const kpiStats = useMemo(() => {
    const totalTeachers = filteredRecords.length;
    const needGrading = filteredRecords.filter((r) => !r.isClear).length;
    const clear = filteredRecords.filter((r) => r.isClear).length;
    const totalUngradedSubmissions = filteredRecords.reduce(
      (acc, r) => acc + (r.totalUngradedSubmissions || 0),
      0
    );
    return { totalTeachers, needGrading, clear, totalUngradedSubmissions };
  }, [filteredRecords]);

  const hasActiveFilters =
    searchTerm !== '' ||
    selectedClasses.length > 0 ||
    selectedCourses.length > 0 ||
    statusFilter !== 'ALL' ||
    workloadFilter !== 'ALL';

  const handleResetFilters = () => {
    setSearchTerm('');
    setSelectedClasses([]);
    setSelectedCourses([]);
    setStatusFilter('ALL');
    setWorkloadFilter('ALL');
    setCurrentPage(1);
  };

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
    <div id="teacher-clearance-container" className="space-y-4">
      {/* KPI Stats Strip for Teacher Grading Hub */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="bg-white border border-amber-200/80 rounded-2xl p-3.5 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Total Guru</span>
            <Users className="w-4 h-4 text-amber-500" />
          </div>
          <div className="text-xl font-black text-slate-900 mt-1">
            {kpiStats.totalTeachers} <span className="text-xs font-normal text-slate-400">Guru</span>
          </div>
        </div>

        <div className="bg-white border border-rose-200 rounded-2xl p-3.5 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-rose-700 uppercase tracking-wider">Ada Antrean Grading</span>
            <Clock className="w-4 h-4 text-rose-500" />
          </div>
          <div className="text-xl font-black text-rose-700 mt-1">
            {kpiStats.needGrading} <span className="text-xs font-normal text-rose-400">Guru</span>
          </div>
        </div>

        <div className="bg-white border border-emerald-200 rounded-2xl p-3.5 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-emerald-700 uppercase tracking-wider">Grading Tuntas</span>
            <CheckCircle className="w-4 h-4 text-emerald-500" />
          </div>
          <div className="text-xl font-black text-emerald-700 mt-1">
            {kpiStats.clear} <span className="text-xs font-normal text-emerald-500">Guru</span>
          </div>
        </div>

        <div className="bg-white border border-amber-300 rounded-2xl p-3.5 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-amber-800 uppercase tracking-wider">Total Tugas Belum Dinilai</span>
            <BookOpen className="w-4 h-4 text-amber-600" />
          </div>
          <div className="text-xl font-black text-amber-900 mt-1">
            {kpiStats.totalUngradedSubmissions} <span className="text-xs font-normal text-amber-700">Pengumpulan</span>
          </div>
        </div>
      </div>

      {/* Controls & Filter Card */}
      <div className="bg-white border border-amber-200/80 rounded-2xl p-4 sm:p-5 shadow-xs space-y-3.5">
        {/* Row 1: Search & Action Buttons */}
        <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center justify-between">
          {/* Search */}
          <div className="relative flex-1 min-w-[240px]">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              id="teacher-search-input"
              type="text"
              placeholder="Cari nama guru, email, mata pelajaran, kelas, atau judul tugas..."
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

          {/* Export PDF Button */}
          <div className="flex items-center space-x-2 shrink-0">
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

        {/* Row 2: Filters Grid (Class, Subject, Status, Workload, Reset) */}
        <div className="pt-2 border-t border-slate-100 flex flex-wrap items-center gap-2.5">
          <div className="flex items-center space-x-1.5 text-xs font-bold text-slate-600 mr-1">
            <Filter className="w-3.5 h-3.5 text-amber-600" />
            <span>Filter:</span>
          </div>

          {/* 1. Multi-Select Class Filter */}
          {availableClasses.length > 0 && (
            <ExcelMultiSelectFilter
              id="teacher-filter-class"
              label="Kelas"
              options={availableClasses}
              selectedValues={selectedClasses}
              onChange={(selected) => {
                setSelectedClasses(selected);
                setCurrentPage(1);
              }}
              counts={classCounts}
              placeholder="Cari kelas..."
            />
          )}

          {/* 2. Multi-Select Course/Subject Filter */}
          {availableCourses.length > 0 && (
            <ExcelMultiSelectFilter
              id="teacher-filter-course"
              label="Mata Pelajaran"
              options={availableCourses}
              selectedValues={selectedCourses}
              onChange={(selected) => {
                setSelectedCourses(selected);
                setCurrentPage(1);
              }}
              counts={courseCounts}
              placeholder="Cari mata pelajaran..."
            />
          )}

          {/* 3. Status Grading Filter */}
          <div className="relative">
            <select
              id="filter-teacher-status"
              value={statusFilter}
              onChange={(e) => {
                setStatusFilter(e.target.value as any);
                setCurrentPage(1);
              }}
              className="bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-xl px-3 py-1.5 text-xs text-slate-700 font-semibold focus:outline-none focus:border-amber-500 focus:bg-white cursor-pointer transition-colors"
            >
              <option value="ALL">Semua Status Grading ({records.length})</option>
              <option value="NEED_GRADING">Ada Tugas Belum Dinilai ({records.filter((r) => !r.isClear).length})</option>
              <option value="CLEAR">Tuntas Clear ({records.filter((r) => r.isClear).length})</option>
            </select>
          </div>

          {/* 4. Workload / Antrean Grading Filter */}
          <div className="relative">
            <select
              id="filter-teacher-workload"
              value={workloadFilter}
              onChange={(e) => {
                setWorkloadFilter(e.target.value as any);
                setCurrentPage(1);
              }}
              className="bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-xl px-3 py-1.5 text-xs text-slate-700 font-semibold focus:outline-none focus:border-amber-500 focus:bg-white cursor-pointer transition-colors"
            >
              <option value="ALL">Semua Beban Antrean</option>
              <option value="HEAVY">Antrean Tinggi (&gt; 15 tugas)</option>
              <option value="MEDIUM">Antrean Ringan/Sedang (1 - 15)</option>
              <option value="ZERO">0 Antrean (Tuntas)</option>
            </select>
          </div>

          {/* Reset Filters Button */}
          {hasActiveFilters && (
            <button
              type="button"
              onClick={handleResetFilters}
              className="inline-flex items-center space-x-1 px-3 py-1.5 rounded-xl bg-amber-50 hover:bg-amber-100 border border-amber-300 text-amber-900 text-xs font-bold transition-all cursor-pointer shadow-2xs"
              title="Kembalikan semua filter ke awal"
            >
              <RotateCcw className="w-3.5 h-3.5 text-amber-700" />
              <span>Reset Filter</span>
            </button>
          )}
        </div>

        {/* Active Filters Pill Chips */}
        {hasActiveFilters && (
          <div className="flex flex-wrap items-center gap-1.5 pt-1 text-xs">
            <span className="text-[11px] font-bold text-slate-400">Filter Aktif:</span>

            {searchTerm && (
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-800 font-medium text-[11px] border border-slate-200">
                <span>Cari: "{searchTerm}"</span>
                <button
                  type="button"
                  onClick={() => setSearchTerm('')}
                  className="hover:text-rose-600 cursor-pointer"
                >
                  <X className="w-3 h-3" />
                </button>
              </span>
            )}

            {selectedClasses.length > 0 && (
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-amber-100 text-amber-900 font-semibold text-[11px] border border-amber-300">
                <span>Kelas: {selectedClasses.join(', ')}</span>
                <button
                  type="button"
                  onClick={() => setSelectedClasses([])}
                  className="hover:text-rose-700 cursor-pointer"
                >
                  <X className="w-3 h-3" />
                </button>
              </span>
            )}

            {selectedCourses.length > 0 && (
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-blue-100 text-blue-900 font-semibold text-[11px] border border-blue-300">
                <span>Mapel: {selectedCourses.join(', ')}</span>
                <button
                  type="button"
                  onClick={() => setSelectedCourses([])}
                  className="hover:text-rose-700 cursor-pointer"
                >
                  <X className="w-3 h-3" />
                </button>
              </span>
            )}

            {statusFilter !== 'ALL' && (
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-rose-100 text-rose-900 font-semibold text-[11px] border border-rose-300">
                <span>Status: {statusFilter === 'NEED_GRADING' ? 'Ada Tugas Belum Dinilai' : 'Tuntas Clear'}</span>
                <button
                  type="button"
                  onClick={() => setStatusFilter('ALL')}
                  className="hover:text-rose-700 cursor-pointer"
                >
                  <X className="w-3 h-3" />
                </button>
              </span>
            )}

            {workloadFilter !== 'ALL' && (
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-purple-100 text-purple-900 font-semibold text-[11px] border border-purple-300">
                <span>
                  Beban:{' '}
                  {workloadFilter === 'HEAVY'
                    ? '> 15 tugas'
                    : workloadFilter === 'MEDIUM'
                    ? '1 - 15 tugas'
                    : '0 Antrean'}
                </span>
                <button
                  type="button"
                  onClick={() => setWorkloadFilter('ALL')}
                  className="hover:text-rose-700 cursor-pointer"
                >
                  <X className="w-3 h-3" />
                </button>
              </span>
            )}
          </div>
        )}
      </div>

      {/* Main Table Card (Upper Left Aligned) */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs flex flex-col overflow-hidden">
        {/* Table Header */}
        <div className="p-4 border-b border-amber-100 bg-amber-50/30 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
          <div>
            <h2 className="font-bold text-slate-800 text-sm">Daftar Grading Guru (Teacher Grading Hub)</h2>
            <p className="text-[11px] text-slate-500">
              Monitoring antrean penilaian tugas siswa berdasarkan guru pengampu mata pelajaran
            </p>
          </div>
          <span className="text-xs font-bold text-slate-600 bg-white px-2.5 py-1 rounded-lg border border-amber-200 shadow-2xs">
            Menampilkan {paginatedRecords.length} dari {filteredRecords.length} guru
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm border-collapse">
            <thead className="bg-slate-50 text-slate-600 font-bold uppercase text-[10px] tracking-widest border-b border-slate-200">
              <tr>
                <th className="px-4 py-3 text-left align-top">Nama Guru</th>
                <th className="px-4 py-3 text-left align-top">Mata Pelajaran &amp; Kelas</th>
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
                      <span className="text-sm font-bold text-slate-700">Tidak ada data guru yang cocok</span>
                      <span className="text-xs text-slate-400">
                        Coba sesuaikan filter pencarian, kelas, mata pelajaran, atau status grading
                      </span>
                      {hasActiveFilters && (
                        <button
                          type="button"
                          onClick={handleResetFilters}
                          className="mt-2 inline-flex items-center space-x-1 px-3 py-1 bg-amber-100 text-amber-900 rounded-lg text-xs font-bold hover:bg-amber-200 transition-colors"
                        >
                          <RotateCcw className="w-3.5 h-3.5" />
                          <span>Reset Semua Filter</span>
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ) : (
                paginatedRecords.map((teacher) => {
                  const ungradedCount = teacher.totalUngradedSubmissions || 0;
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
                        {ungradedCount > 0 ? (
                          <span className="inline-flex items-center space-x-1 px-2.5 py-1 rounded-lg text-xs font-black bg-rose-50 text-rose-700 border border-rose-200">
                            <Clock className="w-3 h-3 text-rose-500" />
                            <span>{ungradedCount} Pengumpulan</span>
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
