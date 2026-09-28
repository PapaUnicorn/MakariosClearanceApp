import React, { useState, useMemo, useEffect } from 'react';
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
import { DateRangeFilter } from './DateRangeFilter';
import { isTaskInDateRange, formatIndonesianDateStr } from '../utils/dateFilter';

export const INDONESIAN_MONTH_NAMES = [
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

const INDONESIAN_MONTH_MAP: Record<string, number> = {
  jan: 1, januari: 1,
  feb: 2, februari: 2,
  mar: 3, maret: 3,
  apr: 4, april: 4,
  mei: 5,
  jun: 6, juni: 6,
  jul: 7, juli: 7,
  agu: 8, ags: 8, agt: 8, agustus: 8,
  sep: 9, september: 9,
  okt: 10, oktober: 10,
  nov: 11, nop: 11, november: 11,
  des: 12, desember: 12,
};

export function parseIndonesianDate(str?: string): { year?: number; month?: number; day?: number } | null {
  if (!str || str.toLowerCase().includes('tanpa')) return null;
  const isoMatch = str.match(/(\d{4})-(\d{1,2})-(\d{1,2})/);
  if (isoMatch) {
    return {
      year: parseInt(isoMatch[1], 10),
      month: parseInt(isoMatch[2], 10),
      day: parseInt(isoMatch[3], 10),
    };
  }
  const parts = str.trim().split(/[\s,\-\/]+/);
  if (parts.length >= 3) {
    const day = parseInt(parts[0], 10);
    const mStr = parts[1].toLowerCase();
    const year = parseInt(parts[2], 10);
    const m = INDONESIAN_MONTH_MAP[mStr];
    if (m && !isNaN(year) && year > 2000) {
      return { year, month: m, day: isNaN(day) ? undefined : day };
    }
  }
  return null;
}

export interface MonthFilterOption {
  key: string;
  year: number;
  month: number;
  label: string;
}

export const ALL_TEACHER_STATUS_OPTIONS = [
  'UNFINISHED',
  'MISSING',
  'TURNED_IN',
  'CLEAR',
  'HIGH_QUEUE',
  'LOW_QUEUE',
];

export const TEACHER_STATUS_LABELS: Record<string, string> = {
  UNFINISHED: '❌ Belum Dinilai (Perlu Grading)',
  MISSING: '⚠️ Lewat Batas Waktu (Overdue)',
  TURNED_IN: '📥 Ada Submisi Siswa (Turned In)',
  CLEAR: '✨ Sudah Clear (Tuntas)',
  HIGH_QUEUE: '🔥 Antrean Tinggi (≥ 10 Siswa)',
  LOW_QUEUE: '📝 Antrean Ringan (1 - 9 Siswa)',
};

export const matchesTeacherStatus = (r: FlattenedTeacherTaskRow, statusKey: string): boolean => {
  switch (statusKey) {
    case 'UNFINISHED':
    case 'PENDING':
      return !r.isClear;
    case 'MISSING':
    case 'OVERDUE': {
      if (r.isClear) return false;
      if (r.dueYear && r.dueMonth && r.dueDay) {
        const due = new Date(r.dueYear, r.dueMonth - 1, r.dueDay, 23, 59, 59);
        return Date.now() > due.getTime();
      }
      if (r.dueDateStr && r.dueDateStr !== 'Tanpa batas waktu') {
        const parsed = parseIndonesianDate(r.dueDateStr);
        if (parsed?.year && parsed?.month) {
          const due = new Date(parsed.year, parsed.month - 1, parsed.day || 28, 23, 59, 59);
          return Date.now() > due.getTime();
        }
      }
      return false;
    }
    case 'TURNED_IN':
    case 'WAITING_GRADE':
      return !r.isClear && (r.ungradedCount || 0) > 0;
    case 'CLEAR':
    case 'GRADED':
      return r.isClear;
    case 'ASSIGNED':
      return !r.isClear;
    case 'HIGH_QUEUE':
      return !r.isClear && (r.ungradedCount || 0) >= 10;
    case 'LOW_QUEUE':
      return !r.isClear && (r.ungradedCount || 0) > 0 && (r.ungradedCount || 0) < 10;
    default:
      return false;
  }
};

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
  const [selectedMonth, setSelectedMonth] = useState<string>('ALL');
  const [monthScopeMode, setMonthScopeMode] = useState<'EXACT' | 'CUMULATIVE'>('EXACT');
  const [selectedStatuses, setSelectedStatuses] = useState<string[]>(ALL_TEACHER_STATUS_OPTIONS);
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');
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
            dueYear: task.dueYear,
            dueMonth: task.dueMonth,
            dueDay: task.dueDay,
            creationTime: task.creationTime,
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

  // Auto-sync multi-select selections with available options
  useEffect(() => {
    if (availableTeachers.length > 0) {
      setSelectedTeachers((prev) => {
        if (prev.length === 0) return availableTeachers;
        const valid = prev.filter((t) => availableTeachers.includes(t));
        return valid.length > 0 ? valid : availableTeachers;
      });
    }
  }, [availableTeachers]);

  useEffect(() => {
    if (availableClasses.length > 0) {
      setSelectedClasses((prev) => {
        if (prev.length === 0) return availableClasses;
        const valid = prev.filter((c) => availableClasses.includes(c));
        return valid.length > 0 ? valid : availableClasses;
      });
    }
  }, [availableClasses]);

  useEffect(() => {
    if (availableCourses.length > 0) {
      setSelectedCourses((prev) => {
        if (prev.length === 0) return availableCourses;
        const valid = prev.filter((c) => availableCourses.includes(c));
        return valid.length > 0 ? valid : availableCourses;
      });
    }
  }, [availableCourses]);

  // Month selector options
  const monthOptions = useMemo<MonthFilterOption[]>(() => {
    const map = new Map<string, { year: number; month: number }>();
    const now = new Date();
    const curYear = now.getFullYear();
    const curMonth = now.getMonth() + 1;
    const curKey = `${curYear}-${String(curMonth).padStart(2, '0')}`;

    // Always include current month
    map.set(curKey, { year: curYear, month: curMonth });

    // Collect all task dates from allFlattenedRows
    allFlattenedRows.forEach((row) => {
      let y = row.dueYear;
      let m = row.dueMonth;
      if (!y && row.dueDateStr) {
        const parsed = parseIndonesianDate(row.dueDateStr);
        if (parsed?.year && parsed?.month) {
          y = parsed.year;
          m = parsed.month;
        }
      }
      if (!y && row.creationTime) {
        const d = new Date(row.creationTime);
        if (!isNaN(d.getTime())) {
          y = d.getFullYear();
          m = d.getMonth() + 1;
        }
      }
      if (y && m) {
        const key = `${y}-${String(m).padStart(2, '0')}`;
        if (!map.has(key)) {
          map.set(key, { year: y, month: m });
        }
      }
    });

    // Also include previous 3 months for convenience
    for (let i = 1; i <= 3; i++) {
      let m = curMonth - i;
      let y = curYear;
      if (m <= 0) {
        m += 12;
        y -= 1;
      }
      const key = `${y}-${String(m).padStart(2, '0')}`;
      if (!map.has(key)) {
        map.set(key, { year: y, month: m });
      }
    }

    const sortedKeys = Array.from(map.keys()).sort((a, b) => b.localeCompare(a));
    return sortedKeys.map((k) => {
      const { year, month } = map.get(k)!;
      const mName = INDONESIAN_MONTH_NAMES[month - 1] || `Bulan ${month}`;
      const isCur = k === curKey;
      return {
        key: k,
        year,
        month,
        label: `${mName} ${year}${isCur ? ' (Bulan Ini)' : ''}`,
      };
    });
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

  const statusCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    ALL_TEACHER_STATUS_OPTIONS.forEach((st) => {
      counts[st] = allFlattenedRows.filter((r) => matchesTeacherStatus(r, st)).length;
    });
    return counts;
  }, [allFlattenedRows]);

  // 2. Filter rows
  const filteredRows = useMemo(() => {
    return allFlattenedRows.filter((row) => {
      // 1. Teacher Filter
      if (selectedTeachers.length > 0 && selectedTeachers.length < availableTeachers.length) {
        if (!selectedTeachers.includes(row.teacherName)) {
          return false;
        }
      }

      // 2. Class Filter
      if (selectedClasses.length > 0 && selectedClasses.length < availableClasses.length) {
        if (!selectedClasses.includes(row.className)) {
          return false;
        }
      }

      // 3. Course Filter
      if (selectedCourses.length > 0 && selectedCourses.length < availableCourses.length) {
        if (!selectedCourses.includes(row.courseName)) {
          return false;
        }
      }

      // 4. Date Range Filter (Start Date & End Date)
      if (startDate || endDate) {
        if (row.isClear) return false;
        if (!isTaskInDateRange(row, startDate, endDate)) {
          return false;
        }
      }

      // 5. Month filter (exact or cumulative)
      if (selectedMonth !== 'ALL') {
        const [targetYearStr, targetMonthStr] = selectedMonth.split('-');
        const targetYear = parseInt(targetYearStr, 10);
        const targetMonth = parseInt(targetMonthStr, 10);

        let tYear = row.dueYear;
        let tMonth = row.dueMonth;
        if (!tYear && row.dueDateStr) {
          const parsed = parseIndonesianDate(row.dueDateStr);
          if (parsed?.year && parsed?.month) {
            tYear = parsed.year;
            tMonth = parsed.month;
          }
        }
        if (!tYear && row.creationTime) {
          const d = new Date(row.creationTime);
          if (!isNaN(d.getTime())) {
            tYear = d.getFullYear();
            tMonth = d.getMonth() + 1;
          }
        }

        if (tYear && tMonth) {
          if (monthScopeMode === 'EXACT') {
            if (tYear !== targetYear || tMonth !== targetMonth) return false;
          } else {
            if (tYear > targetYear) return false;
            if (tYear === targetYear && tMonth > targetMonth) return false;
          }
        } else {
          // If task has no date: exclude in EXACT mode, keep in CUMULATIVE mode
          if (monthScopeMode === 'EXACT') return false;
        }
      }

      // 5. Status Multi-Select filter (like Excel checkbox in students tab)
      if (selectedStatuses.length < ALL_TEACHER_STATUS_OPTIONS.length) {
        if (selectedStatuses.length === 0) return false;
        const matched = selectedStatuses.some((stKey) => matchesTeacherStatus(row, stKey));
        if (!matched) return false;
      }

      // 6. Text Search: nama guru, kelas, mata pelajaran, tugas belum dinilai, atau nama siswa
      if (searchTerm.trim() !== '') {
        const term = searchTerm.toLowerCase();
        const studentNames = row.ungradedStudents.map((s) => s.studentName).join(' ').toLowerCase();
        const matches =
          row.teacherName.toLowerCase().includes(term) ||
          row.teacherEmail.toLowerCase().includes(term) ||
          row.className.toLowerCase().includes(term) ||
          row.courseName.toLowerCase().includes(term) ||
          row.courseWorkTitle.toLowerCase().includes(term) ||
          (row.dueDateStr || '').toLowerCase().includes(term) ||
          studentNames.includes(term);

        if (!matches) return false;
      }

      return true;
    });
  }, [
    allFlattenedRows,
    selectedTeachers,
    availableTeachers.length,
    selectedClasses,
    availableClasses.length,
    selectedCourses,
    availableCourses.length,
    startDate,
    endDate,
    selectedMonth,
    monthScopeMode,
    selectedStatuses,
    searchTerm,
  ]);

  const hasActiveFilters =
    Boolean(startDate || endDate) ||
    searchTerm !== '' ||
    (selectedTeachers.length > 0 && selectedTeachers.length < availableTeachers.length) ||
    (selectedClasses.length > 0 && selectedClasses.length < availableClasses.length) ||
    (selectedCourses.length > 0 && selectedCourses.length < availableCourses.length) ||
    selectedMonth !== 'ALL' ||
    selectedStatuses.length < ALL_TEACHER_STATUS_OPTIONS.length;

  const handleResetFilters = () => {
    setStartDate('');
    setEndDate('');
    setSearchTerm('');
    setSelectedTeachers(availableTeachers);
    setSelectedClasses(availableClasses);
    setSelectedCourses(availableCourses);
    setSelectedMonth('ALL');
    setMonthScopeMode('EXACT');
    setSelectedStatuses(ALL_TEACHER_STATUS_OPTIONS);
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

  const selectedMonthLabel = selectedMonth !== 'ALL'
    ? monthOptions.find((m) => m.key === selectedMonth)?.label || selectedMonth
    : undefined;

  const handleExportPDF = () => {
    if (filteredRows.length === 0) return;

    try {
      const dateRangeLabel = (startDate || endDate)
        ? `${startDate ? formatIndonesianDateStr(startDate, true) : 'Awal'} s/d ${endDate ? formatIndonesianDateStr(endDate, true) : 'Sekarang'}`
        : undefined;

      exportFilteredTeacherTasksToPDF(filteredRows, {
        singleTeacherName,
        selectedTeachers: selectedTeachers.length < availableTeachers.length ? selectedTeachers : undefined,
        selectedClasses: selectedClasses.length < availableClasses.length ? selectedClasses : undefined,
        selectedCourses: selectedCourses.length < availableCourses.length ? selectedCourses : undefined,
        dateRangeFilter: dateRangeLabel,
        startDate: startDate || undefined,
        endDate: endDate || undefined,
        selectedMonth: selectedMonth !== 'ALL' ? selectedMonth : undefined,
        monthFilter: selectedMonthLabel,
        selectedStatuses: selectedStatuses.length < ALL_TEACHER_STATUS_OPTIONS.length
          ? selectedStatuses.map((k) => TEACHER_STATUS_LABELS[k] || k)
          : undefined,
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
      const dateRangeLabel = (startDate || endDate)
        ? `${startDate ? formatIndonesianDateStr(startDate, true) : 'Awal'} s/d ${endDate ? formatIndonesianDateStr(endDate, true) : 'Sekarang'}`
        : undefined;

      exportFilteredTeacherTasksToXLSX(filteredRows, {
        singleTeacherName,
        selectedTeachers: selectedTeachers.length < availableTeachers.length ? selectedTeachers : undefined,
        selectedClasses: selectedClasses.length < availableClasses.length ? selectedClasses : undefined,
        selectedCourses: selectedCourses.length < availableCourses.length ? selectedCourses : undefined,
        dateRangeFilter: dateRangeLabel,
        startDate: startDate || undefined,
        endDate: endDate || undefined,
        selectedMonth: selectedMonth !== 'ALL' ? selectedMonth : undefined,
        monthFilter: selectedMonthLabel,
        selectedStatuses: selectedStatuses.length < ALL_TEACHER_STATUS_OPTIONS.length
          ? selectedStatuses.map((k) => TEACHER_STATUS_LABELS[k] || k)
          : undefined,
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

        {/* Row 2: Comprehensive Excel Filters */}
        <div className="pt-3 border-t border-slate-100 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
          {/* 1. Filter Guru */}
          <div>
            <ExcelMultiSelectFilter
              id="filter-teacher-name"
              label="Filter Guru"
              options={availableTeachers}
              selectedValues={selectedTeachers}
              onChange={(selected) => {
                setSelectedTeachers(selected);
                setCurrentPage(1);
              }}
              counts={teacherCounts}
              placeholder="Cari guru..."
            />
          </div>

          {/* 2. Filter Kelas */}
          <div>
            <ExcelMultiSelectFilter
              id="filter-teacher-class"
              label="Filter Kelas"
              options={availableClasses}
              selectedValues={selectedClasses}
              onChange={(selected) => {
                setSelectedClasses(selected);
                setCurrentPage(1);
              }}
              counts={classCounts}
              placeholder="Cari kelas..."
            />
          </div>

          {/* 3. Filter Mata Pelajaran */}
          <div>
            <ExcelMultiSelectFilter
              id="filter-teacher-course"
              label="Filter Mata Pelajaran"
              options={availableCourses}
              selectedValues={selectedCourses}
              onChange={(selected) => {
                setSelectedCourses(selected);
                setCurrentPage(1);
              }}
              counts={courseCounts}
              placeholder="Cari mapel..."
            />
          </div>

          {/* 4. Filter Bulan Tugas */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider flex items-center space-x-1">
                <Calendar className="w-3.5 h-3.5 text-amber-500" />
                <span>Bulan Tugas</span>
              </label>
              {selectedMonth !== 'ALL' && (
                <span className="text-[10px] text-amber-700 font-extrabold normal-case bg-amber-100 px-1.5 py-0.2 rounded border border-amber-300">
                  {monthScopeMode === 'EXACT' ? 'Tepat Bulan' : 's/d Bulan'}
                </span>
              )}
            </div>
            <div className="flex space-x-1.5">
              <select
                id="filter-teacher-task-month"
                value={selectedMonth}
                onChange={(e) => {
                  setSelectedMonth(e.target.value);
                  setCurrentPage(1);
                }}
                className="w-full bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs text-slate-800 font-semibold focus:outline-none focus:border-amber-500 focus:bg-white cursor-pointer shadow-2xs transition-colors"
              >
                <option value="ALL">Semua Bulan (Keseluruhan)</option>
                {monthOptions.map((opt) => (
                  <option key={opt.key} value={opt.key}>
                    {opt.label}
                  </option>
                ))}
              </select>

              {selectedMonth !== 'ALL' && (
                <select
                  value={monthScopeMode}
                  onChange={(e) => {
                    setMonthScopeMode(e.target.value as 'EXACT' | 'CUMULATIVE');
                    setCurrentPage(1);
                  }}
                  className="bg-amber-50 border border-amber-300 rounded-lg px-1.5 py-1.5 text-[10px] font-bold text-amber-900 focus:outline-none cursor-pointer shrink-0"
                  title="Pilih mode rentang filter bulan"
                >
                  <option value="EXACT">Tepat</option>
                  <option value="CUMULATIVE">s/d Bulan</option>
                </select>
              )}
            </div>
          </div>

          {/* 5. Filter Status Tugas (Excel Multi-Select Checkboxes) */}
          <div>
            <ExcelMultiSelectFilter
              id="filter-excel-teacher-status"
              label="Filter Status Tugas"
              options={ALL_TEACHER_STATUS_OPTIONS}
              selectedValues={selectedStatuses}
              onChange={(vals) => {
                setSelectedStatuses(vals);
                setCurrentPage(1);
              }}
              counts={statusCounts}
              optionLabels={TEACHER_STATUS_LABELS}
              placeholder="Cari status tugas..."
            />
          </div>
        </div>

        {/* Row 3: Rentang Waktu Tugas (Start Date & End Date) */}
        <div className="pt-3 border-t border-slate-100 bg-amber-50/40 p-3 rounded-xl border border-amber-200/60">
          <DateRangeFilter
            idPrefix="teacher-date-filter"
            startDate={startDate}
            endDate={endDate}
            onChangeStartDate={(d) => {
              setStartDate(d);
              setCurrentPage(1);
            }}
            onChangeEndDate={(d) => {
              setEndDate(d);
              setCurrentPage(1);
            }}
            onReset={() => {
              setStartDate('');
              setEndDate('');
              setCurrentPage(1);
            }}
          />
        </div>

        {/* Reset All Filters button */}
        {hasActiveFilters && (
          <div className="pt-2 flex justify-end">
            <button
              type="button"
              id="btn-reset-teacher-filters"
              onClick={handleResetFilters}
              className="inline-flex items-center space-x-1 px-3 py-1.5 rounded-xl bg-amber-50 hover:bg-amber-100 border border-amber-300 text-amber-900 text-xs font-bold transition-all cursor-pointer shadow-2xs"
              title="Kembalikan semua filter ke awal"
            >
              <RotateCcw className="w-3.5 h-3.5 text-amber-700" />
              <span>Reset Semua Filter</span>
            </button>
          </div>
        )}
      </div>

      {/* Main Table Card (Exact 4 Columns in Requested Order) */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs flex flex-col overflow-hidden">
        {/* Table Header */}
        <div className="p-4 border-b border-amber-100 bg-amber-50/30 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="font-bold text-slate-800 text-sm">Daftar Grading Guru (1 Baris per Tugas)</h2>
              {selectedMonth !== 'ALL' && (
                <span className="text-[10px] font-extrabold bg-amber-200 text-amber-950 px-2 py-0.5 rounded-full border border-amber-300">
                  Bulan: {selectedMonthLabel} ({monthScopeMode === 'EXACT' ? 'Tepat Bulan' : 's/d Bulan Ini'})
                </span>
              )}
              {(startDate || endDate) && (
                <span className="text-[10px] font-extrabold bg-amber-200 text-amber-950 px-2.5 py-0.5 rounded-full border border-amber-300 flex items-center space-x-1">
                  <Calendar className="w-3 h-3 text-amber-800" />
                  <span>
                    Rentang: {startDate ? formatIndonesianDateStr(startDate, true) : 'Awal'} s/d {endDate ? formatIndonesianDateStr(endDate, true) : 'Sekarang'}
                  </span>
                </span>
              )}
            </div>
            <p className="text-[11px] text-slate-500 mt-0.5">
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
