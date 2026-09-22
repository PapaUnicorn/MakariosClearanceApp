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
  ChevronDown,
  ChevronUp,
  FileCheck,
  Calendar,
  FileSpreadsheet,
  Printer,
} from 'lucide-react';
import { TeacherSummaryRecord, FlattenedTeacherTaskRow } from '../types';
import { exportFilteredTeacherTasksToPDF, exportSingleTeacherRecordToPDF, exportTeachersToPDF } from '../utils/pdfExport';
import { exportFilteredTeacherTasksToXLSX } from '../utils/excelExport';
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
  const [selectedTeachers, setSelectedTeachers] = useState<string[]>([]);
  const [selectedClasses, setSelectedClasses] = useState<string[]>([]);
  const [selectedCourses, setSelectedCourses] = useState<string[]>([]);
  const [statusFilter, setStatusFilter] = useState<'PENDING_ONLY' | 'ALL' | 'CLEAR_ONLY'>('PENDING_ONLY');
  const [studentCountFilter, setStudentCountFilter] = useState<'ALL' | 'HIGH' | 'MEDIUM' | 'LOW'>('ALL');
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(15);
  const [expandedStudentsRowId, setExpandedStudentsRowId] = useState<string | null>(null);

  // 1. Flatten records into: 1 baris per 1 tugas belum dinilai
  const allFlattenedRows = useMemo(() => {
    const rows: FlattenedTeacherTaskRow[] = [];

    records.forEach((teacher) => {
      if (teacher.ungradedTasksList && teacher.ungradedTasksList.length > 0) {
        teacher.ungradedTasksList.forEach((task, idx) => {
          // Find matching course for link if available
          const courseMatch = teacher.assignedCourses.find((c) => c.courseId === task.courseId);

          rows.push({
            rowId: `${teacher.teacherId}-${task.courseId}-${task.courseWorkId || idx}`,
            teacherId: teacher.teacherId,
            teacherName: teacher.teacherName,
            teacherEmail: teacher.teacherEmail,
            teacherPhoto: teacher.teacherPhoto,
            className: task.className || '-',
            courseId: task.courseId,
            courseName: task.courseName,
            courseLink: courseMatch?.courseLink,
            courseWorkId: task.courseWorkId,
            courseWorkTitle: task.courseWorkTitle,
            courseWorkLink: task.courseWorkLink,
            dueDateStr: task.dueDateStr,
            ungradedCount: task.ungradedCount || 0,
            ungradedStudents: task.ungradedStudents || [],
            isClear: false,
            parentRecord: teacher,
          });
        });
      } else {
        // Teacher has 0 ungraded tasks (all clear)
        const primaryClass = teacher.assignedCourses.map((c) => c.className).filter(Boolean).join(', ') || '-';
        const primaryCourse = teacher.assignedCourses.map((c) => c.courseName).filter(Boolean).join(', ') || 'Semua Mata Pelajaran';

        rows.push({
          rowId: `${teacher.teacherId}-cleared`,
          teacherId: teacher.teacherId,
          teacherName: teacher.teacherName,
          teacherEmail: teacher.teacherEmail,
          teacherPhoto: teacher.teacherPhoto,
          className: primaryClass,
          courseId: 'all-clear',
          courseName: primaryCourse,
          courseWorkId: 'clear',
          courseWorkTitle: 'Semua submisi tugas telah dinilai (Tuntas)',
          ungradedCount: 0,
          ungradedStudents: [],
          isClear: true,
          parentRecord: teacher,
        });
      }
    });

    return rows;
  }, [records]);

  // Unique options for filters based on all rows
  const availableTeachers = useMemo(() => {
    const set = new Set<string>();
    records.forEach((r) => {
      if (r.teacherName) set.add(r.teacherName);
    });
    return Array.from(set).sort();
  }, [records]);

  const availableClasses = useMemo(() => {
    const set = new Set<string>();
    allFlattenedRows.forEach((row) => {
      if (row.className && row.className !== '-') {
        set.add(row.className);
      }
    });
    return Array.from(set).sort((a, b) => a.localeCompare(b, undefined, { numeric: true }));
  }, [allFlattenedRows]);

  const availableCourses = useMemo(() => {
    const set = new Set<string>();
    allFlattenedRows.forEach((row) => {
      if (row.courseName && row.courseName !== 'Semua Mata Pelajaran') {
        set.add(row.courseName);
      }
    });
    return Array.from(set).sort();
  }, [allFlattenedRows]);

  // Counts for filters
  const teacherCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    availableTeachers.forEach((t) => {
      counts[t] = allFlattenedRows.filter((r) => r.teacherName === t && !r.isClear).length;
    });
    return counts;
  }, [availableTeachers, allFlattenedRows]);

  const classCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    availableClasses.forEach((cls) => {
      counts[cls] = allFlattenedRows.filter((r) => r.className === cls && !r.isClear).length;
    });
    return counts;
  }, [availableClasses, allFlattenedRows]);

  const courseCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    availableCourses.forEach((crs) => {
      counts[crs] = allFlattenedRows.filter((r) => r.courseName === crs && !r.isClear).length;
    });
    return counts;
  }, [availableCourses, allFlattenedRows]);

  // 2. Filter rows
  const filteredRows = useMemo(() => {
    return allFlattenedRows.filter((row) => {
      // Status Filter
      if (statusFilter === 'PENDING_ONLY' && row.isClear) return false;
      if (statusFilter === 'CLEAR_ONLY' && !row.isClear) return false;

      // Teacher Filter
      if (selectedTeachers.length > 0 && !selectedTeachers.includes(row.teacherName)) {
        return false;
      }

      // Class Filter
      if (selectedClasses.length > 0 && !selectedClasses.includes(row.className)) {
        return false;
      }

      // Course Filter
      if (selectedCourses.length > 0 && !selectedCourses.includes(row.courseName)) {
        return false;
      }

      // Student Count / Workload Filter
      if (studentCountFilter === 'HIGH' && row.ungradedCount < 10) return false;
      if (studentCountFilter === 'MEDIUM' && (row.ungradedCount < 5 || row.ungradedCount >= 10)) return false;
      if (studentCountFilter === 'LOW' && (row.ungradedCount < 1 || row.ungradedCount >= 5)) return false;

      // Text Search: nama guru, kelas, mata pelajaran, tugas belum dinilai, atau nama siswa
      if (searchTerm.trim() !== '') {
        const term = searchTerm.toLowerCase();
        const studentNames = row.ungradedStudents.map((s) => s.studentName).join(' ').toLowerCase();
        const matches =
          row.teacherName.toLowerCase().includes(term) ||
          row.teacherEmail.toLowerCase().includes(term) ||
          row.className.toLowerCase().includes(term) ||
          row.courseName.toLowerCase().includes(term) ||
          row.courseWorkTitle.toLowerCase().includes(term) ||
          studentNames.includes(term);

        if (!matches) return false;
      }

      return true;
    });
  }, [
    allFlattenedRows,
    statusFilter,
    selectedTeachers,
    selectedClasses,
    selectedCourses,
    studentCountFilter,
    searchTerm,
  ]);

  // Stats on filtered rows
  const stats = useMemo(() => {
    const pendingTasksCount = filteredRows.filter((r) => !r.isClear).length;
    const totalUngradedSubmissions = filteredRows.reduce((acc, r) => acc + (r.ungradedCount || 0), 0);
    const uniqueTeachers = new Set(filteredRows.filter((r) => !r.isClear).map((r) => r.teacherId)).size;
    const uniqueClasses = new Set(filteredRows.filter((r) => !r.isClear && r.className !== '-').map((r) => r.className)).size;

    return {
      pendingTasksCount,
      totalUngradedSubmissions,
      uniqueTeachers,
      uniqueClasses,
    };
  }, [filteredRows]);

  const hasActiveFilters =
    searchTerm !== '' ||
    selectedTeachers.length > 0 ||
    selectedClasses.length > 0 ||
    selectedCourses.length > 0 ||
    statusFilter !== 'PENDING_ONLY' ||
    studentCountFilter !== 'ALL';

  const handleResetFilters = () => {
    setSearchTerm('');
    setSelectedTeachers([]);
    setSelectedClasses([]);
    setSelectedCourses([]);
    setStatusFilter('PENDING_ONLY');
    setStudentCountFilter('ALL');
    setCurrentPage(1);
  };

  // Pagination
  const totalPages = Math.ceil(filteredRows.length / itemsPerPage) || 1;
  const paginatedRows = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return filteredRows.slice(start, start + itemsPerPage);
  }, [filteredRows, currentPage, itemsPerPage]);

  // Determine if single teacher is currently filtered
  const uniqueTeachersInFiltered = useMemo(() => {
    return Array.from(new Set(filteredRows.map((r) => r.teacherName)));
  }, [filteredRows]);

  const isSingleTeacherFiltered =
    (selectedTeachers.length === 1 && filteredRows.length > 0) ||
    (filteredRows.length > 0 && uniqueTeachersInFiltered.length === 1);

  const singleTeacherName = isSingleTeacherFiltered
    ? selectedTeachers.length === 1
      ? selectedTeachers[0]
      : uniqueTeachersInFiltered[0]
    : undefined;

  const [exportFeedback, setExportFeedback] = useState<string | null>(null);

  const handleExportPDF = () => {
    if (filteredRows.length === 0) return;

    try {
      exportFilteredTeacherTasksToPDF(filteredRows, {
        singleTeacherName,
        selectedTeachers,
        selectedClasses,
        selectedCourses,
        statusFilter,
        searchTerm,
      });
      setExportFeedback('PDF berhasil dicetak!');
      setTimeout(() => setExportFeedback(null), 3500);
    } catch (err) {
      console.error('Export PDF error:', err);
      setExportFeedback('Gagal mencetak PDF. Silakan coba lagi.');
      setTimeout(() => setExportFeedback(null), 3500);
    }
  };

  const handleExportXLSX = () => {
    if (filteredRows.length === 0) return;

    try {
      exportFilteredTeacherTasksToXLSX(filteredRows, {
        singleTeacherName,
        selectedTeachers,
        selectedClasses,
        selectedCourses,
        statusFilter,
        searchTerm,
      });
      setExportFeedback('File XLSX berhasil diunduh!');
      setTimeout(() => setExportFeedback(null), 3500);
    } catch (err) {
      console.error('Export XLSX error:', err);
      setExportFeedback('Gagal mengunduh XLSX. Silakan coba lagi.');
      setTimeout(() => setExportFeedback(null), 3500);
    }
  };

  const handleExportSingleTeacher = (record: TeacherSummaryRecord) => {
    exportSingleTeacherRecordToPDF(record);
  };

  const toggleExpandStudents = (rowId: string) => {
    setExpandedStudentsRowId((prev) => (prev === rowId ? null : rowId));
  };

  return (
    <div id="teacher-clearance-hub" className="space-y-4">
      {/* KPI Cards Strip */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="bg-white border border-rose-200 rounded-2xl p-3.5 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-rose-700 uppercase tracking-wider">Tugas Belum Dinilai</span>
            <Clock className="w-4 h-4 text-rose-500" />
          </div>
          <div className="text-xl font-black text-rose-700 mt-1">
            {stats.pendingTasksCount} <span className="text-xs font-normal text-rose-400">Tugas</span>
          </div>
          <div className="text-[11px] text-rose-600 font-medium mt-0.5">
            Satu baris per satu tugas
          </div>
        </div>

        <div className="bg-white border border-amber-300 rounded-2xl p-3.5 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-amber-800 uppercase tracking-wider">Total Antrean Siswa</span>
            <Users className="w-4 h-4 text-amber-600" />
          </div>
          <div className="text-xl font-black text-amber-900 mt-1">
            {stats.totalUngradedSubmissions} <span className="text-xs font-normal text-amber-700">Submisi</span>
          </div>
          <div className="text-[11px] text-slate-500 font-medium mt-0.5">
            Menunggu penilaian guru
          </div>
        </div>

        <div className="bg-white border border-blue-200 rounded-2xl p-3.5 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-blue-800 uppercase tracking-wider">Guru Terlibat</span>
            <GraduationCap className="w-4 h-4 text-blue-600" />
          </div>
          <div className="text-xl font-black text-blue-900 mt-1">
            {stats.uniqueTeachers} <span className="text-xs font-normal text-blue-500">Guru</span>
          </div>
          <div className="text-[11px] text-slate-500 font-medium mt-0.5">
            Dari {availableTeachers.length} guru terdaftar
          </div>
        </div>

        <div className="bg-white border border-slate-200 rounded-2xl p-3.5 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-slate-600 uppercase tracking-wider">Kelas Terdata</span>
            <BookOpen className="w-4 h-4 text-slate-500" />
          </div>
          <div className="text-xl font-black text-slate-900 mt-1">
            {stats.uniqueClasses} <span className="text-xs font-normal text-slate-400">Kelas</span>
          </div>
          <div className="text-[11px] text-slate-500 font-medium mt-0.5">
            {availableCourses.length} Mata Pelajaran
          </div>
        </div>
      </div>

      {/* Bento Controls Card with Maybank theme */}
      <div className="bg-white border border-amber-200/80 rounded-2xl p-4 sm:p-5 shadow-xs space-y-3.5">
        {/* Row 1: Search & Action Buttons */}
        <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center justify-between">
          {/* Search */}
          <div className="relative flex-1 min-w-[240px]">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              id="teacher-search-input"
              type="text"
              placeholder="Cari nama guru, kelas, mata pelajaran, atau judul tugas..."
              value={searchTerm}
              onChange={(e) => {
                setSearchTerm(e.target.value);
                setCurrentPage(1);
              }}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-9 pr-4 py-2 text-xs sm:text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:border-amber-500 focus:bg-white transition-all"
            />
            {searchTerm && (
              <button
                type="button"
                onClick={() => setSearchTerm('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-slate-400 hover:text-slate-600 font-bold cursor-pointer"
              >
                Clear
              </button>
            )}
          </div>

          {/* Action Buttons: Export to XLSX & Cetak PDF */}
          <div className="flex items-center space-x-2 shrink-0">
            {exportFeedback && (
              <span className="text-[11px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-1 rounded-lg animate-fade-in">
                {exportFeedback}
              </span>
            )}

            {/* Export to XLSX */}
            <button
              id="btn-export-teacher-xlsx"
              type="button"
              onClick={handleExportXLSX}
              disabled={filteredRows.length === 0}
              className="inline-flex items-center justify-center space-x-1.5 px-3.5 py-2 rounded-xl text-xs font-bold shadow-xs transition-all whitespace-nowrap active:scale-95 cursor-pointer border bg-emerald-700 hover:bg-emerald-800 text-white border-emerald-800 disabled:opacity-50"
              title={`Unduh data terfilter (${filteredRows.length} baris tugas) dalam format Microsoft Excel (.xlsx)`}
            >
              <FileSpreadsheet className="w-4 h-4 text-emerald-200" />
              <span>Export to XLSX ({filteredRows.length})</span>
            </button>

            {/* Cetak PDF */}
            <button
              id="btn-export-teacher-pdf"
              type="button"
              onClick={handleExportPDF}
              disabled={filteredRows.length === 0}
              className="inline-flex items-center justify-center space-x-1.5 px-3.5 py-2 rounded-xl text-xs font-bold shadow-xs transition-all whitespace-nowrap active:scale-95 cursor-pointer border bg-slate-900 hover:bg-slate-800 text-white border-slate-800 disabled:opacity-50"
              title={`Cetak atau unduh laporan data terfilter (${filteredRows.length} baris tugas) dalam format PDF`}
            >
              <Printer className="w-4 h-4 text-[#FFC800]" />
              <span>Cetak PDF ({filteredRows.length})</span>
            </button>
          </div>
        </div>

        {/* Row 2: Comprehensive Filters */}
        <div className="pt-2 border-t border-slate-100 flex flex-wrap items-center gap-2.5">
          <div className="flex items-center space-x-1.5 text-xs font-bold text-slate-600 mr-1">
            <Filter className="w-3.5 h-3.5 text-amber-600" />
            <span>Filter:</span>
          </div>

          {/* 1. Filter Guru */}
          {availableTeachers.length > 0 && (
            <ExcelMultiSelectFilter
              id="filter-teacher-name"
              label="Guru"
              options={availableTeachers}
              selectedValues={selectedTeachers}
              onChange={(selected) => {
                setSelectedTeachers(selected);
                setCurrentPage(1);
              }}
              counts={teacherCounts}
              placeholder="Cari guru..."
            />
          )}

          {/* 2. Filter Kelas */}
          {availableClasses.length > 0 && (
            <ExcelMultiSelectFilter
              id="filter-teacher-class"
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

          {/* 3. Filter Mata Pelajaran */}
          {availableCourses.length > 0 && (
            <ExcelMultiSelectFilter
              id="filter-teacher-course"
              label="Mata Pelajaran"
              options={availableCourses}
              selectedValues={selectedCourses}
              onChange={(selected) => {
                setSelectedCourses(selected);
                setCurrentPage(1);
              }}
              counts={courseCounts}
              placeholder="Cari mapel..."
            />
          )}

          {/* 4. Filter Status Tampilan */}
          <div className="relative">
            <select
              id="filter-task-status"
              value={statusFilter}
              onChange={(e) => {
                setStatusFilter(e.target.value as any);
                setCurrentPage(1);
              }}
              className="bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-xl px-3 py-1.5 text-xs text-slate-700 font-semibold focus:outline-none focus:border-amber-500 focus:bg-white cursor-pointer transition-colors"
            >
              <option value="PENDING_ONLY">Hanya Tugas Belum Dinilai ({allFlattenedRows.filter((r) => !r.isClear).length})</option>
              <option value="ALL">Semua Baris (Termasuk Tuntas)</option>
              <option value="CLEAR_ONLY">Guru Tuntas Saja ({allFlattenedRows.filter((r) => r.isClear).length})</option>
            </select>
          </div>

          {/* 5. Filter Jumlah Siswa Menunggu */}
          <div className="relative">
            <select
              id="filter-student-count"
              value={studentCountFilter}
              onChange={(e) => {
                setStudentCountFilter(e.target.value as any);
                setCurrentPage(1);
              }}
              className="bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-xl px-3 py-1.5 text-xs text-slate-700 font-semibold focus:outline-none focus:border-amber-500 focus:bg-white cursor-pointer transition-colors"
            >
              <option value="ALL">Semua Jumlah Siswa</option>
              <option value="HIGH">Banyak (≥ 10 Siswa Menunggu)</option>
              <option value="MEDIUM">Sedang (5 - 9 Siswa)</option>
              <option value="LOW">Sedikit (1 - 4 Siswa)</option>
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

        {/* Active Filter Chips */}
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

            {selectedTeachers.length > 0 && (
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-purple-100 text-purple-900 font-semibold text-[11px] border border-purple-300">
                <span>Guru: {selectedTeachers.join(', ')}</span>
                <button
                  type="button"
                  onClick={() => setSelectedTeachers([])}
                  className="hover:text-rose-700 cursor-pointer"
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

            {statusFilter !== 'PENDING_ONLY' && (
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-900 font-semibold text-[11px] border border-emerald-300">
                <span>Tampilan: {statusFilter === 'CLEAR_ONLY' ? 'Guru Tuntas Saja' : 'Semua Termasuk Tuntas'}</span>
                <button
                  type="button"
                  onClick={() => setStatusFilter('PENDING_ONLY')}
                  className="hover:text-rose-700 cursor-pointer"
                >
                  <X className="w-3 h-3" />
                </button>
              </span>
            )}

            {studentCountFilter !== 'ALL' && (
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-rose-100 text-rose-900 font-semibold text-[11px] border border-rose-300">
                <span>
                  Siswa:{' '}
                  {studentCountFilter === 'HIGH'
                    ? '≥ 10 Siswa'
                    : studentCountFilter === 'MEDIUM'
                    ? '5 - 9 Siswa'
                    : '1 - 4 Siswa'}
                </span>
                <button
                  type="button"
                  onClick={() => setStudentCountFilter('ALL')}
                  className="hover:text-rose-700 cursor-pointer"
                >
                  <X className="w-3 h-3" />
                </button>
              </span>
            )}
          </div>
        )}
      </div>

      {/* Main Table Card (Exact 4 Columns in Requested Order) */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs flex flex-col overflow-hidden">
        {/* Table Header */}
        <div className="p-4 border-b border-amber-100 bg-amber-50/30 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
          <div>
            <h2 className="font-bold text-slate-800 text-sm">Daftar Grading Guru (1 Baris per Tugas)</h2>
            <p className="text-[11px] text-slate-500">
              Format baris per tugas: Nama Guru • Kelas • Mata Pelajaran • Tugas Belum Dinilai
            </p>
          </div>
          <div className="flex items-center space-x-2">
            <span className="text-xs font-bold text-slate-700 bg-white px-2.5 py-1 rounded-lg border border-amber-200 shadow-2xs">
              Menampilkan {paginatedRows.length} dari {filteredRows.length} baris tugas
            </span>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm border-collapse">
            <thead className="bg-slate-50 text-slate-700 font-extrabold uppercase text-[10px] tracking-wider border-b border-slate-200">
              <tr>
                <th className="px-4 py-3.5 text-left align-top w-[24%]">Nama Guru</th>
                <th className="px-4 py-3.5 text-left align-top w-[14%]">Kelas</th>
                <th className="px-4 py-3.5 text-left align-top w-[22%]">Mata Pelajaran</th>
                <th className="px-4 py-3.5 text-left align-top w-[40%]">Tugas Belum Dinilai</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-xs">
              {paginatedRows.length === 0 ? (
                <tr>
                  <td colSpan={4} className="py-14 text-center text-slate-500">
                    <div className="flex flex-col items-center justify-center space-y-2">
                      <CheckCircle className="w-9 h-9 text-emerald-500" />
                      <span className="text-sm font-bold text-slate-800">
                        Tidak ada tugas belum dinilai yang cocok
                      </span>
                      <span className="text-xs text-slate-400 max-w-md">
                        Semua tugas mungkin telah dinilai atau coba sesuaikan filter pencarian, kelas, dan mata pelajaran di atas.
                      </span>
                      {hasActiveFilters && (
                        <button
                          type="button"
                          onClick={handleResetFilters}
                          className="mt-2 inline-flex items-center space-x-1 px-3 py-1.5 bg-amber-100 hover:bg-amber-200 text-amber-900 rounded-lg text-xs font-bold transition-colors cursor-pointer"
                        >
                          <RotateCcw className="w-3.5 h-3.5" />
                          <span>Reset Semua Filter</span>
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ) : (
                paginatedRows.map((row) => {
                  const isExpanded = expandedStudentsRowId === row.rowId;

                  return (
                    <tr
                      key={row.rowId}
                      className={`hover:bg-amber-50/20 transition-colors ${
                        row.isClear ? 'bg-emerald-50/20' : ''
                      }`}
                    >
                      {/* 1. NAMA GURU */}
                      <td className="px-4 py-3.5 align-top text-left">
                        <div className="flex items-start space-x-2.5">
                          {row.teacherPhoto ? (
                            <img
                              src={row.teacherPhoto}
                              alt={row.teacherName}
                              className="w-7 h-7 rounded-full border border-amber-300 object-cover shrink-0 mt-0.5"
                              referrerPolicy="no-referrer"
                            />
                          ) : (
                            <div className="w-7 h-7 rounded-full bg-amber-100 text-slate-900 font-bold flex items-center justify-center text-xs border border-amber-300 shrink-0 mt-0.5">
                              {row.teacherName.charAt(0)}
                            </div>
                          )}
                          <div className="min-w-0">
                            <button
                              type="button"
                              onClick={() => onSelectTeacherRecord(row.parentRecord)}
                              className="text-left font-bold text-slate-900 hover:text-amber-800 transition-colors cursor-pointer block truncate"
                              title="Klik untuk melihat seluruh riwayat penilaian guru ini"
                            >
                              {row.teacherName}
                            </button>
                            {row.teacherEmail && (
                              <div className="text-[11px] text-slate-400 truncate max-w-[200px]">
                                {row.teacherEmail}
                              </div>
                            )}
                          </div>
                        </div>
                      </td>

                      {/* 2. KELAS */}
                      <td className="px-4 py-3.5 align-top text-left">
                        <span className="inline-block px-2.5 py-1 rounded-lg text-xs font-extrabold bg-slate-100 text-slate-800 border border-slate-200">
                          {row.className}
                        </span>
                      </td>

                      {/* 3. MATA PELAJARAN */}
                      <td className="px-4 py-3.5 align-top text-left">
                        <div className="flex items-start space-x-1.5">
                          <BookOpen className="w-3.5 h-3.5 text-amber-600 shrink-0 mt-0.5" />
                          <div className="min-w-0">
                            <span className="font-bold text-slate-800 block">
                              {row.courseName}
                            </span>
                            {row.courseLink && (
                              <a
                                href={row.courseLink}
                                target="_blank"
                                rel="noreferrer"
                                className="inline-flex items-center space-x-0.5 text-[11px] text-blue-600 hover:text-blue-800 font-medium mt-0.5"
                              >
                                <span>Buka Kelas</span>
                                <ExternalLink className="w-2.5 h-2.5" />
                              </a>
                            )}
                          </div>
                        </div>
                      </td>

                      {/* 4. TUGAS BELUM DINILAI */}
                      <td className="px-4 py-3.5 align-top text-left">
                        {row.isClear ? (
                          <div className="inline-flex items-center space-x-1 px-2.5 py-1 rounded-lg text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                            <CheckCircle className="w-3.5 h-3.5 text-emerald-600" />
                            <span>Semua Tugas Sudah Dinilai (Clear)</span>
                          </div>
                        ) : (
                          <div className="space-y-2">
                            {/* Task title & Direct link to Classroom */}
                            <div className="flex flex-wrap items-start justify-between gap-1.5">
                              <div className="font-bold text-slate-900 text-xs sm:text-[13px] leading-snug">
                                {row.courseWorkTitle}
                              </div>

                              {row.courseWorkLink && (
                                <a
                                  href={row.courseWorkLink}
                                  target="_blank"
                                  rel="noreferrer"
                                  className="inline-flex items-center space-x-1 px-2 py-0.5 bg-amber-50 hover:bg-amber-100 text-amber-900 rounded-md text-[11px] font-bold border border-amber-300 transition-colors shrink-0"
                                  title="Buka tugas ini langsung di Google Classroom untuk menilai siswa"
                                >
                                  <span>Nilai di Classroom</span>
                                  <ExternalLink className="w-3 h-3" />
                                </a>
                              )}
                            </div>

                            {/* Task Meta (Deadline + Waiting Submissions Count Badge) */}
                            <div className="flex flex-wrap items-center gap-2 text-xs">
                              <span className="inline-flex items-center space-x-1 px-2.5 py-0.5 rounded-md font-extrabold text-[11px] bg-rose-50 text-rose-700 border border-rose-200">
                                <Clock className="w-3 h-3 text-rose-500" />
                                <span>{row.ungradedCount} Siswa Belum Dinilai</span>
                              </span>

                              {row.dueDateStr && (
                                <span className="inline-flex items-center space-x-1 text-[11px] text-slate-500">
                                  <Calendar className="w-3 h-3 text-slate-400" />
                                  <span>Batas: {row.dueDateStr}</span>
                                </span>
                              )}

                              {/* Interactive Button to View List of Students */}
                              {row.ungradedStudents.length > 0 && (
                                <button
                                  type="button"
                                  onClick={() => toggleExpandStudents(row.rowId)}
                                  className="inline-flex items-center space-x-1 px-2 py-0.5 rounded-md text-[11px] font-bold text-slate-600 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 transition-colors cursor-pointer"
                                >
                                  <span>{isExpanded ? 'Tutup Daftar Siswa' : 'Lihat Nama Siswa'}</span>
                                  {isExpanded ? (
                                    <ChevronUp className="w-3 h-3" />
                                  ) : (
                                    <ChevronDown className="w-3 h-3" />
                                  )}
                                </button>
                              )}
                            </div>

                            {/* Expanded Students List */}
                            {isExpanded && row.ungradedStudents.length > 0 && (
                              <div className="mt-2.5 p-2.5 bg-slate-50 border border-slate-200 rounded-xl space-y-1.5">
                                <div className="text-[11px] font-bold text-slate-600 flex items-center justify-between">
                                  <span>Siswa yang menyerahkan &amp; menunggu nilai:</span>
                                  <span className="text-slate-400">{row.ungradedStudents.length} siswa</span>
                                </div>
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 pt-1">
                                  {row.ungradedStudents.map((student) => (
                                    <div
                                      key={student.studentId}
                                      className="flex items-center justify-between px-2 py-1 bg-white border border-slate-200 rounded-lg text-[11px]"
                                    >
                                      <div className="truncate mr-1">
                                        <span className="font-bold text-slate-800">{student.studentName}</span>
                                        {student.studentEmail && (
                                          <span className="text-slate-400 text-[10px] block truncate">
                                            {student.studentEmail}
                                          </span>
                                        )}
                                      </div>
                                      {student.submissionLink && (
                                        <a
                                          href={student.submissionLink}
                                          target="_blank"
                                          rel="noreferrer"
                                          className="text-blue-600 hover:text-blue-800 font-bold shrink-0 text-[10px] inline-flex items-center space-x-0.5"
                                        >
                                          <span>Nilai</span>
                                          <ExternalLink className="w-2.5 h-2.5" />
                                        </a>
                                      )}
                                    </div>
                                  ))}
                                </div>
                              </div>
                            )}
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

        {/* Table Footer with Pagination */}
        {filteredRows.length > 0 && (
          <div className="p-4 bg-slate-50/80 border-t border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-500">
            <div className="flex items-center space-x-2">
              <span>
                Menampilkan {Math.min(filteredRows.length, (currentPage - 1) * itemsPerPage + 1)} -{' '}
                {Math.min(filteredRows.length, currentPage * itemsPerPage)} dari {filteredRows.length} baris tugas
              </span>
              <span className="text-slate-300">|</span>
              <label className="flex items-center space-x-1">
                <span>Per halaman:</span>
                <select
                  value={itemsPerPage}
                  onChange={(e) => {
                    setItemsPerPage(Number(e.target.value));
                    setCurrentPage(1);
                  }}
                  className="bg-white border border-slate-200 rounded-md px-1.5 py-0.5 text-xs font-semibold text-slate-700 cursor-pointer"
                >
                  <option value={10}>10</option>
                  <option value={15}>15</option>
                  <option value={25}>25</option>
                  <option value={50}>50</option>
                </select>
              </label>
            </div>

            <div className="flex items-center space-x-1.5">
              <button
                type="button"
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
                type="button"
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
