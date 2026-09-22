import React, { useState, useMemo, useEffect } from 'react';
import {
  Search,
  Filter,
  FileText,
  CheckCircle,
  AlertCircle,
  ExternalLink,
  Eye,
  Clock,
  Printer,
  Calendar,
  FileDown,
  UserCheck,
} from 'lucide-react';
import { StudentClearanceRecord, TaskStatusType, getTaskStatusInfo } from '../types';
import { exportStudentsToPDF, exportStudentMonthlyProgressReportPDF } from '../utils/pdfExport';
import { exportStudentMonthlyReportDocx } from '../utils/docxExport';
import { StudentMonthlyReportModal } from './StudentMonthlyReportModal';
import { ExcelMultiSelectFilter } from './ExcelMultiSelectFilter';

interface StudentClearanceTableProps {
  records: StudentClearanceRecord[];
  onSelectStudent: (record: StudentClearanceRecord) => void;
}

export interface FlattenedStudentTaskRow {
  rowId: string;
  studentId: string;
  studentName: string;
  studentEmail: string;
  studentPhoto?: string;
  className: string;
  courseId: string;
  courseName: string;
  courseLink?: string;
  taskTitle: string;
  taskLink?: string;
  dueDateStr: string;
  dueYear?: number;
  dueMonth?: number;
  dueDay?: number;
  creationTime?: string;
  maxPoints?: number;
  assignedGrade?: number;
  late?: boolean;
  taskStatus: TaskStatusType | 'ALL_CLEARED';
  statusLabel: string;
  statusBadgeClass: string;
  isClear: boolean;
  overallScore?: number;
  overallScoreStr?: string;
  parentRecord: StudentClearanceRecord;
}

const INDONESIAN_MONTH_NAMES = [
  'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
  'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'
];

export interface MonthFilterOption {
  key: string;
  year: number;
  month: number;
  label: string;
}

export const StudentClearanceTable: React.FC<StudentClearanceTableProps> = ({
  records,
  onSelectStudent,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedClasses, setSelectedClasses] = useState<string[]>([]);
  const [selectedCourses, setSelectedCourses] = useState<string[]>([]);
  const [selectedMonth, setSelectedMonth] = useState<string>('ALL');
  const [monthScopeMode, setMonthScopeMode] = useState<'EXACT' | 'CUMULATIVE'>('EXACT');
  const [selectedStatus, setSelectedStatus] = useState<string>('ALL');
  const [selectedStudentId, setSelectedStudentId] = useState<string>('ALL');
  const [currentPage, setCurrentPage] = useState(1);
  const [isExportingDocx, setIsExportingDocx] = useState(false);
  const itemsPerPage = 20;

  // Monthly Report Modal State
  const [reportModal, setReportModal] = useState<{
    isOpen: boolean;
    studentName: string;
    className: string;
    studentRecords: StudentClearanceRecord[];
  }>({
    isOpen: false,
    studentName: '',
    className: '',
    studentRecords: [],
  });

  // Unique list of students for single user selection dropdown
  const uniqueStudents = useMemo(() => {
    const map = new Map<string, { id: string; name: string; email: string; className: string }>();
    records.forEach((r) => {
      if (!map.has(r.studentId)) {
        map.set(r.studentId, {
          id: r.studentId,
          name: r.studentName,
          email: r.studentEmail,
          className: r.className,
        });
      }
    });
    return Array.from(map.values()).sort((a, b) => a.name.localeCompare(b.name));
  }, [records]);

  // Selected student object if a single student is chosen from dropdown
  const activeSelectedStudent = useMemo(() => {
    if (selectedStudentId === 'ALL') return null;
    return uniqueStudents.find((s) => s.id === selectedStudentId) || null;
  }, [selectedStudentId, uniqueStudents]);

  // Flatten records into 1 line 1 data (1 task per row with separate deadline & date metadata)
  const allFlattenedRows = useMemo<FlattenedStudentTaskRow[]>(() => {
    const rows: FlattenedStudentTaskRow[] = [];

    records.forEach((record) => {
      if (record.unfinishedTasks.length > 0) {
        record.unfinishedTasks.forEach((task, tIdx) => {
          const statusInfo = getTaskStatusInfo(task.status, task.assignedGrade, task.maxPoints);
          let taskYear = task.dueYear;
          let taskMonth = task.dueMonth;
          if (!taskYear && task.creationTime) {
            const cd = new Date(task.creationTime);
            if (!isNaN(cd.getTime())) {
              taskYear = cd.getFullYear();
              taskMonth = cd.getMonth() + 1;
            }
          }

          rows.push({
            rowId: `${record.id}_task_${task.courseWorkId || tIdx}`,
            studentId: record.studentId,
            studentName: record.studentName,
            studentEmail: record.studentEmail,
            studentPhoto: record.studentPhoto,
            className: record.className,
            courseId: record.courseId,
            courseName: record.courseName,
            courseLink: record.courseLink,
            taskTitle: task.title,
            taskLink: task.alternateLink,
            dueDateStr: task.dueDateStr || 'Tanpa Batas Waktu',
            dueYear: taskYear,
            dueMonth: taskMonth,
            dueDay: task.dueDay,
            creationTime: task.creationTime,
            maxPoints: task.maxPoints,
            assignedGrade: task.assignedGrade,
            late: task.late,
            taskStatus: task.status,
            statusLabel: statusInfo.label,
            statusBadgeClass: statusInfo.badgeClass,
            isClear: false,
            overallScore: record.overallScore,
            overallScoreStr: record.overallScoreStr,
            parentRecord: record,
          });
        });
      } else {
        rows.push({
          rowId: `${record.id}_cleared`,
          studentId: record.studentId,
          studentName: record.studentName,
          studentEmail: record.studentEmail,
          studentPhoto: record.studentPhoto,
          className: record.className,
          courseId: record.courseId,
          courseName: record.courseName,
          courseLink: record.courseLink,
          taskTitle: 'Semua Tugas Selesai & Dinilai',
          dueDateStr: '-',
          taskStatus: 'ALL_CLEARED',
          statusLabel: 'Selesai & Dinilai',
          statusBadgeClass: 'bg-emerald-100 text-emerald-800 border-emerald-200',
          isClear: true,
          overallScore: record.overallScore,
          overallScoreStr: record.overallScoreStr,
          parentRecord: record,
        });
      }
    });

    return rows;
  }, [records]);

  // Unique options for filters
  const classOptions = useMemo(() => {
    const set = new Set<string>();
    records.forEach((r) => {
      if (r.className) set.add(r.className);
    });
    return Array.from(set).sort();
  }, [records]);

  const courseOptions = useMemo(() => {
    const set = new Set<string>();
    records.forEach((r) => {
      if (r.courseName) set.add(r.courseName);
    });
    return Array.from(set).sort();
  }, [records]);

  // Synchronize multi-select selections with available options
  useEffect(() => {
    if (classOptions.length > 0) {
      setSelectedClasses((prev) => {
        if (prev.length === 0) return classOptions;
        const valid = prev.filter((c) => classOptions.includes(c));
        return valid.length > 0 ? valid : classOptions;
      });
    }
  }, [classOptions]);

  useEffect(() => {
    if (courseOptions.length > 0) {
      setSelectedCourses((prev) => {
        if (prev.length === 0) return courseOptions;
        const valid = prev.filter((c) => courseOptions.includes(c));
        return valid.length > 0 ? valid : courseOptions;
      });
    }
  }, [courseOptions]);

  // Counts of rows per class and course for Excel dropdown badges
  const classCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    allFlattenedRows.forEach((r) => {
      if (r.className) {
        counts[r.className] = (counts[r.className] || 0) + 1;
      }
    });
    return counts;
  }, [allFlattenedRows]);

  const courseCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    allFlattenedRows.forEach((r) => {
      if (r.courseName) {
        counts[r.courseName] = (counts[r.courseName] || 0) + 1;
      }
    });
    return counts;
  }, [allFlattenedRows]);

  // Collect unique months from records and flat rows for Month selector
  const monthOptions = useMemo<MonthFilterOption[]>(() => {
    const map = new Map<string, { year: number; month: number }>();
    const now = new Date();
    const curYear = now.getFullYear();
    const curMonth = now.getMonth() + 1;
    const curKey = `${curYear}-${String(curMonth).padStart(2, '0')}`;

    // Always include current month
    map.set(curKey, { year: curYear, month: curMonth });

    // Collect all task dates
    records.forEach((rec) => {
      rec.allTasks?.forEach((task) => {
        let y = task.dueYear;
        let m = task.dueMonth;
        if (!y && task.creationTime) {
          const d = new Date(task.creationTime);
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
  }, [records]);

  // Filtered rows
  const filteredRows = useMemo(() => {
    return allFlattenedRows.filter((r) => {
      if (selectedStudentId !== 'ALL' && r.studentId !== selectedStudentId) {
        return false;
      }

      const matchesSearch =
        r.studentName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        r.studentEmail.toLowerCase().includes(searchTerm.toLowerCase()) ||
        r.className.toLowerCase().includes(searchTerm.toLowerCase()) ||
        r.courseName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        r.taskTitle.toLowerCase().includes(searchTerm.toLowerCase()) ||
        r.dueDateStr.toLowerCase().includes(searchTerm.toLowerCase()) ||
        r.statusLabel.toLowerCase().includes(searchTerm.toLowerCase());

      if (!matchesSearch) return false;

      // Class Multi-Select filter (like Excel checkbox)
      if (classOptions.length > 0 && !selectedClasses.includes(r.className)) {
        return false;
      }

      // Course Multi-Select filter (like Excel checkbox)
      if (courseOptions.length > 0 && !selectedCourses.includes(r.courseName)) {
        return false;
      }

      // Month Filter (Bulan Tugas)
      if (selectedMonth !== 'ALL') {
        const [targetYearStr, targetMonthStr] = selectedMonth.split('-');
        const targetYear = parseInt(targetYearStr, 10);
        const targetMonth = parseInt(targetMonthStr, 10);

        if (r.taskStatus === 'ALL_CLEARED') {
          if (selectedStatus !== 'CLEAR' && selectedStatus !== 'ALL') return false;
        } else {
          const tYear = r.dueYear;
          const tMonth = r.dueMonth;

          if (tYear && tMonth) {
            if (monthScopeMode === 'EXACT') {
              if (tYear !== targetYear || tMonth !== targetMonth) return false;
            } else {
              // CUMULATIVE: due on or before target year and month
              if (tYear > targetYear) return false;
              if (tYear === targetYear && tMonth > targetMonth) return false;
            }
          } else {
            // Task without date: in EXACT mode omit, in CUMULATIVE mode keep
            if (monthScopeMode === 'EXACT') return false;
          }
        }
      }

      // Status filter with authentic Google Classroom statuses + Wakasek Kurikulum focus
      if (selectedStatus === 'CLEAR' && !r.isClear) return false;
      if (selectedStatus === 'PENDING' && r.isClear) return false;
      if (selectedStatus === 'UNFINISHED' && r.isClear) return false;
      if ((selectedStatus === 'OVERDUE' || selectedStatus === 'MISSING') && r.taskStatus !== 'MISSING') return false;
      if ((selectedStatus === 'LATE' || selectedStatus === 'TURNED_IN_LATE') && r.taskStatus !== 'TURNED_IN_LATE' && !r.late) return false;
      if (selectedStatus === 'ASSIGNED' && r.taskStatus !== 'ASSIGNED' && r.taskStatus !== 'NOT_SUBMITTED') return false;
      if (selectedStatus === 'TURNED_IN' && r.taskStatus !== 'TURNED_IN' && r.taskStatus !== 'WAITING_GRADE') return false;
      if (selectedStatus === 'GRADED' && r.taskStatus !== 'GRADED') return false;
      if (selectedStatus === 'RETURNED' && r.taskStatus !== 'RETURNED') return false;
      if (selectedStatus === 'RECLAIMED' && r.taskStatus !== 'RECLAIMED') return false;

      return true;
    });
  }, [
    allFlattenedRows,
    searchTerm,
    selectedClasses,
    selectedCourses,
    selectedMonth,
    monthScopeMode,
    selectedStatus,
    selectedStudentId,
    classOptions.length,
    courseOptions.length,
  ]);

  // Statistics for Wakasek Kurikulum Quick Filter Pills (All Statuses)
  // Scoped to selected Classes, Courses, and Month
  const kurikulumStats = useMemo(() => {
    const baseRows = allFlattenedRows.filter((r) => {
      if (selectedStudentId !== 'ALL' && r.studentId !== selectedStudentId) return false;
      if (classOptions.length > 0 && !selectedClasses.includes(r.className)) return false;
      if (courseOptions.length > 0 && !selectedCourses.includes(r.courseName)) return false;

      if (selectedMonth !== 'ALL') {
        const [targetYearStr, targetMonthStr] = selectedMonth.split('-');
        const targetYear = parseInt(targetYearStr, 10);
        const targetMonth = parseInt(targetMonthStr, 10);

        if (r.taskStatus === 'ALL_CLEARED') return false;

        const tYear = r.dueYear;
        const tMonth = r.dueMonth;
        if (tYear && tMonth) {
          if (monthScopeMode === 'EXACT') {
            if (tYear !== targetYear || tMonth !== targetMonth) return false;
          } else {
            if (tYear > targetYear) return false;
            if (tYear === targetYear && tMonth > targetMonth) return false;
          }
        } else {
          if (monthScopeMode === 'EXACT') return false;
        }
      }

      return true;
    });

    const totalTasks = baseRows.length;
    const assignedCount = baseRows.filter((r) => r.taskStatus === 'ASSIGNED' || r.taskStatus === 'NOT_SUBMITTED').length;
    const missingCount = baseRows.filter((r) => r.taskStatus === 'MISSING').length;
    const turnedInCount = baseRows.filter((r) => r.taskStatus === 'TURNED_IN' || r.taskStatus === 'WAITING_GRADE').length;
    const lateCount = baseRows.filter((r) => r.taskStatus === 'TURNED_IN_LATE' || r.late).length;
    const gradedCount = baseRows.filter((r) => r.taskStatus === 'GRADED').length;
    const returnedCount = baseRows.filter((r) => r.taskStatus === 'RETURNED').length;
    const reclaimedCount = baseRows.filter((r) => r.taskStatus === 'RECLAIMED').length;
    const clearCount = baseRows.filter((r) => r.isClear).length;
    const unfinishedCount = baseRows.filter((r) => !r.isClear).length;

    return {
      totalTasks,
      assignedCount,
      missingCount,
      turnedInCount,
      lateCount,
      gradedCount,
      returnedCount,
      reclaimedCount,
      clearCount,
      unfinishedCount,
    };
  }, [
    allFlattenedRows,
    selectedClasses,
    selectedCourses,
    selectedMonth,
    monthScopeMode,
    selectedStudentId,
    classOptions.length,
    courseOptions.length,
  ]);

  // Filtered source records (for PDF generator)
  const filteredSourceRecords = useMemo(() => {
    const relevantIds = new Set(filteredRows.map((r) => r.parentRecord.id));
    return records.filter((r) => relevantIds.has(r.id));
  }, [records, filteredRows]);

  // Pagination
  const totalPages = Math.ceil(filteredRows.length / itemsPerPage) || 1;
  const paginatedRows = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return filteredRows.slice(start, start + itemsPerPage);
  }, [filteredRows, currentPage, itemsPerPage]);

  // Open Monthly Learning Progress Report Modal for a student
  const handleOpenStudentReportModal = (studentName: string, className: string, studentId: string) => {
    const studentRecords = records.filter(
      (r) => r.studentId === studentId || r.studentName.toLowerCase() === studentName.toLowerCase()
    );
    setReportModal({
      isOpen: true,
      studentName,
      className,
      studentRecords,
    });
  };

  // Direct export PDF for a single selected student
  const handleDirectExportPDF = (studentName: string, className: string, studentId: string) => {
    const studentRecords = records.filter(
      (r) => r.studentId === studentId || r.studentName.toLowerCase() === studentName.toLowerCase()
    );
    const schoolLevel = className.toUpperCase().includes('10') ||
      className.toUpperCase().includes('11') ||
      className.toUpperCase().includes('12')
        ? 'SENIOR HIGH SCHOOL'
        : 'JUNIOR HIGH SCHOOL';
    exportStudentMonthlyProgressReportPDF(studentName, studentRecords, schoolLevel);
  };

  // Direct export DOCX for a single selected student
  const handleDirectExportDocx = async (studentName: string, className: string, studentId: string) => {
    setIsExportingDocx(true);
    try {
      const studentRecords = records.filter(
        (r) => r.studentId === studentId || r.studentName.toLowerCase() === studentName.toLowerCase()
      );
      const schoolLevel = className.toUpperCase().includes('10') ||
        className.toUpperCase().includes('11') ||
        className.toUpperCase().includes('12')
          ? 'SENIOR HIGH SCHOOL'
          : 'JUNIOR HIGH SCHOOL';
      await exportStudentMonthlyReportDocx(studentName, studentRecords, schoolLevel);
    } catch (err) {
      console.error('Gagal mengekspor DOCX:', err);
    } finally {
      setIsExportingDocx(false);
    }
  };

  // PDF Export All / Rekapitulasi
  const handleExportAllPDF = () => {
    if (filteredSourceRecords.length === 0) return;
    const filterInfoParts: string[] = [];
    if (selectedClasses.length < classOptions.length) {
      filterInfoParts.push(`Kelas: ${selectedClasses.join(', ')}`);
    }
    if (selectedCourses.length < courseOptions.length) {
      filterInfoParts.push(`Mapel: ${selectedCourses.join(', ')}`);
    }
    if (selectedMonth !== 'ALL') {
      const found = monthOptions.find((m) => m.key === selectedMonth);
      if (found) {
        filterInfoParts.push(`Bulan: ${found.label} (${monthScopeMode === 'EXACT' ? 'Tepat Bulan' : 'Kumulatif'})`);
      }
    }
    if (selectedStatus !== 'ALL') {
      const statusLabels: Record<string, string> = {
        ASSIGNED: 'Ditugaskan',
        MISSING: 'Missing (Lewat Batas)',
        OVERDUE: 'Overdue (Lewat Batas)',
        TURNED_IN: 'Diserahkan',
        TURNED_IN_LATE: 'Diserahkan Terlambat',
        LATE: 'Diserahkan Terlambat',
        GRADED: 'Sudah Dinilai',
        RETURNED: 'Dikembalikan',
        RECLAIMED: 'Ditarik Siswa',
        CLEAR: 'Sudah Clear',
        UNFINISHED: 'Belum Selesai',
        PENDING: 'Belum Selesai',
      };
      filterInfoParts.push(`Status: ${statusLabels[selectedStatus] || selectedStatus}`);
    }
    const filterInfo = filterInfoParts.join(' | ');
    exportStudentsToPDF(filteredSourceRecords, filterInfo);
  };

  return (
    <div id="student-clearance-bento" className="space-y-4">
      {/* Bento Controls Card */}
      <div className="bg-white border border-amber-200/80 rounded-2xl p-4 sm:p-5 shadow-xs space-y-4">
        {/* Search & Global Action Bar */}
        <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center justify-between">
          {/* Search Input */}
          <div className="relative flex-1 min-w-[240px]">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              id="student-search-input"
              type="text"
              placeholder="Cari nama siswa, email, kelas, mapel, tugas, atau deadline..."
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

          {/* Export Rekapitulasi PDF */}
          <div className="flex items-center space-x-2">
            <button
              id="btn-export-student-pdf"
              onClick={handleExportAllPDF}
              disabled={filteredRows.length === 0}
              className="inline-flex items-center justify-center space-x-1.5 px-4 py-2 bg-slate-900 hover:bg-slate-800 disabled:opacity-50 text-white rounded-xl text-xs font-bold shadow-xs transition-all whitespace-nowrap active:scale-95 cursor-pointer border border-slate-800"
              title="Unduh Rekapitulasi PDF (Semua Siswa Terfilter)"
            >
              <FileText className="w-4 h-4 text-[#FFC800]" />
              <span>Ekspor Rekap PDF</span>
            </button>
          </div>
        </div>

        {/* Dedicated Single Student Selector & Export Bar with Maybank Yellow styling */}
        <div className="p-3.5 bg-amber-50/70 border border-amber-200 rounded-xl flex flex-col md:flex-row md:items-center justify-between gap-3">
          <div className="flex items-center space-x-2.5 flex-1 min-w-[260px]">
            <div className="p-2 bg-[#FFC800] text-slate-950 font-black rounded-lg shadow-2xs shrink-0 border border-amber-400">
              <UserCheck className="w-4 h-4" />
            </div>
            <div className="flex-1">
              <label className="block text-[10px] font-black text-slate-900 uppercase tracking-wider mb-0.5">
                Pilih Satu Siswa untuk Ekspor Rapor (.DOCX / .PDF)
              </label>
              <select
                id="select-single-student"
                value={selectedStudentId}
                onChange={(e) => {
                  setSelectedStudentId(e.target.value);
                  setCurrentPage(1);
                }}
                className="w-full bg-white border border-amber-300 rounded-lg px-2.5 py-1.5 text-xs font-bold text-slate-900 focus:outline-none focus:border-amber-500 cursor-pointer shadow-2xs"
              >
                <option value="ALL">-- Pilih Siswa Tertentu ({uniqueStudents.length} Siswa) --</option>
                {uniqueStudents.map((st) => (
                  <option key={st.id} value={st.id}>
                    {st.name} ({st.className})
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Action buttons if single user is selected */}
          {activeSelectedStudent ? (
            <div className="flex items-center space-x-2 shrink-0 self-end md:self-center">
              <button
                onClick={() =>
                  handleOpenStudentReportModal(
                    activeSelectedStudent.name,
                    activeSelectedStudent.className,
                    activeSelectedStudent.id
                  )
                }
                className="inline-flex items-center space-x-1.5 px-3 py-1.5 bg-white hover:bg-amber-50 text-slate-900 text-xs font-bold rounded-lg border border-amber-300 shadow-2xs transition-all active:scale-95 cursor-pointer"
                title="Lihat Pratinjau Rapor Siswa Terpilih"
              >
                <Eye className="w-3.5 h-3.5 text-slate-700" />
                <span>Pratinjau Rapor</span>
              </button>

              <button
                onClick={() =>
                  handleDirectExportPDF(
                    activeSelectedStudent.name,
                    activeSelectedStudent.className,
                    activeSelectedStudent.id
                  )
                }
                className="inline-flex items-center space-x-1.5 px-3.5 py-1.5 bg-[#FFC800] hover:bg-amber-400 text-slate-950 text-xs font-black rounded-lg shadow-2xs border border-amber-400 transition-all active:scale-95 cursor-pointer"
                title="Unduh Rapor PDF Siswa Terpilih"
              >
                <FileDown className="w-3.5 h-3.5" />
                <span>Ekspor PDF ({activeSelectedStudent.name.split(' ')[0]})</span>
              </button>

              <button
                onClick={() =>
                  handleDirectExportDocx(
                    activeSelectedStudent.name,
                    activeSelectedStudent.className,
                    activeSelectedStudent.id
                  )
                }
                disabled={isExportingDocx}
                className="inline-flex items-center space-x-1.5 px-3.5 py-1.5 bg-slate-900 hover:bg-slate-800 disabled:opacity-50 text-amber-300 text-xs font-bold rounded-lg shadow-2xs border border-slate-800 transition-all active:scale-95 cursor-pointer"
                title="Unduh Rapor Word DOCX Siswa Terpilih"
              >
                <FileDown className="w-3.5 h-3.5 text-[#FFC800]" />
                <span>{isExportingDocx ? 'Membuat DOCX...' : `Ekspor .DOCX (${activeSelectedStudent.name.split(' ')[0]})`}</span>
              </button>
            </div>
          ) : (
            <div className="text-[11px] text-amber-900/80 font-medium italic hidden md:block">
              Pilih siswa di atas atau klik tombol <b>PDF</b> / <b>DOCX</b> pada baris tabel di bawah.
            </div>
          )}
        </div>

        {/* Filter Controls with Excel Multi-Select Checkboxes & Month Selector */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 pt-3 border-t border-amber-100">
          <div>
            <ExcelMultiSelectFilter
              id="filter-excel-class"
              label="Filter Kelas (Pilih Multiple / Checkbox)"
              options={classOptions}
              selectedValues={selectedClasses}
              onChange={(vals) => {
                setSelectedClasses(vals);
                setCurrentPage(1);
              }}
              counts={classCounts}
              placeholder="Cari kelas (mis. X-A)..."
            />
          </div>

          <div>
            <ExcelMultiSelectFilter
              id="filter-excel-course"
              label="Filter Mata Pelajaran"
              options={courseOptions}
              selectedValues={selectedCourses}
              onChange={(vals) => {
                setSelectedCourses(vals);
                setCurrentPage(1);
              }}
              counts={courseCounts}
              placeholder="Cari mata pelajaran..."
            />
          </div>

          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider flex items-center space-x-1">
                <Calendar className="w-3.5 h-3.5 text-amber-500" />
                <span>Bulan Tugas</span>
              </label>
              {selectedMonth !== 'ALL' && (
                <span className="text-[10px] text-amber-700 font-extrabold normal-case bg-amber-100 px-1.5 py-0.2 rounded border border-amber-300">
                  {monthScopeMode === 'EXACT' ? 'Tepat Bulan' : 's/d Bulan Ini'}
                </span>
              )}
            </div>
            <div className="flex space-x-1.5">
              <select
                id="filter-task-month"
                value={selectedMonth}
                onChange={(e) => {
                  setSelectedMonth(e.target.value);
                  setCurrentPage(1);
                }}
                className="w-full bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs text-slate-800 font-semibold focus:outline-none focus:border-amber-500 focus:bg-white cursor-pointer shadow-2xs"
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

          <div>
            <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1 flex items-center justify-between">
              <span>Filter Status Tugas</span>
              {selectedStatus !== 'ALL' && (
                <span className="text-[10px] text-amber-600 font-extrabold normal-case bg-amber-50 px-1.5 py-0.2 rounded border border-amber-200">
                  Filter Aktif
                </span>
              )}
            </label>
            <select
              id="filter-student-status"
              value={selectedStatus}
              onChange={(e) => {
                setSelectedStatus(e.target.value);
                setCurrentPage(1);
              }}
              className="w-full bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs text-slate-800 font-semibold focus:outline-none focus:border-amber-500 focus:bg-white cursor-pointer shadow-2xs"
            >
              <option value="ALL">Semua Status Tugas ({kurikulumStats.totalTasks})</option>
              <option value="ASSIGNED">⏳ Ditugaskan / Assigned ({kurikulumStats.assignedCount})</option>
              <option value="MISSING">⚠️ Tidak Ada / Missing - Lewat Batas ({kurikulumStats.missingCount})</option>
              <option value="TURNED_IN">📥 Diserahkan / Turned In ({kurikulumStats.turnedInCount})</option>
              <option value="TURNED_IN_LATE">⏰ Diserahkan Terlambat / Late ({kurikulumStats.lateCount})</option>
              <option value="GRADED">✅ Sudah Dinilai / Graded ({kurikulumStats.gradedCount})</option>
              <option value="RETURNED">↩️ Dikembalikan / Returned ({kurikulumStats.returnedCount})</option>
              {kurikulumStats.reclaimedCount > 0 && (
                <option value="RECLAIMED">🟣 Ditarik Kembali / Reclaimed ({kurikulumStats.reclaimedCount})</option>
              )}
              <option value="CLEAR">✨ Sudah Clear / Tuntas ({kurikulumStats.clearCount})</option>
              <option value="UNFINISHED">❌ Belum Selesai / Semua Tunggakan ({kurikulumStats.unfinishedCount})</option>
            </select>
          </div>
        </div>

        {/* Display ALL Status Types as Quick Filter Chips */}
        <div className="pt-3 border-t border-amber-100 flex flex-wrap items-center gap-1.5 sm:gap-2">
          <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider mr-1 flex items-center space-x-1">
            <span>Filter Status:</span>
          </span>

          {/* 1. Semua Status */}
          <button
            type="button"
            onClick={() => {
              setSelectedStatus('ALL');
              setCurrentPage(1);
            }}
            className={`inline-flex items-center space-x-1.5 px-2.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
              selectedStatus === 'ALL'
                ? 'bg-slate-900 text-white shadow-xs ring-2 ring-slate-900/20'
                : 'bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200'
            }`}
          >
            <span>Semua Status</span>
            <span
              className={`px-1.5 py-0.2 rounded-full text-[10px] ${
                selectedStatus === 'ALL' ? 'bg-slate-800 text-[#FFC800]' : 'bg-slate-200 text-slate-700'
              }`}
            >
              {kurikulumStats.totalTasks}
            </span>
          </button>

          {/* 2. Ditugaskan / Assigned */}
          <button
            type="button"
            onClick={() => {
              setSelectedStatus('ASSIGNED');
              setCurrentPage(1);
            }}
            className={`inline-flex items-center space-x-1.5 px-2.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
              selectedStatus === 'ASSIGNED'
                ? 'bg-slate-700 text-white shadow-xs ring-2 ring-slate-700/30'
                : 'bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200'
            }`}
            title="Tugas yang diberikan namun belum diserahkan oleh siswa"
          >
            <span>⏳ Ditugaskan</span>
            <span
              className={`px-1.5 py-0.2 rounded-full text-[10px] ${
                selectedStatus === 'ASSIGNED' ? 'bg-slate-800 text-white' : 'bg-slate-200 text-slate-700'
              }`}
            >
              {kurikulumStats.assignedCount}
            </span>
          </button>

          {/* 3. Missing / Overdue */}
          <button
            type="button"
            onClick={() => {
              setSelectedStatus('MISSING');
              setCurrentPage(1);
            }}
            className={`inline-flex items-center space-x-1.5 px-2.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
              selectedStatus === 'MISSING' || selectedStatus === 'OVERDUE'
                ? 'bg-rose-600 text-white shadow-xs ring-2 ring-rose-600/30'
                : 'bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200'
            }`}
            title="Tugas yang belum diserahkan dan sudah melewati batas waktu (Missing)"
          >
            <span>⚠️ Missing (Lewat Batas)</span>
            <span
              className={`px-1.5 py-0.2 rounded-full text-[10px] ${
                selectedStatus === 'MISSING' || selectedStatus === 'OVERDUE'
                  ? 'bg-rose-700 text-white'
                  : 'bg-rose-200 text-rose-800'
              }`}
            >
              {kurikulumStats.missingCount}
            </span>
          </button>

          {/* 4. Diserahkan / Turned In */}
          <button
            type="button"
            onClick={() => {
              setSelectedStatus('TURNED_IN');
              setCurrentPage(1);
            }}
            className={`inline-flex items-center space-x-1.5 px-2.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
              selectedStatus === 'TURNED_IN'
                ? 'bg-blue-600 text-white shadow-xs ring-2 ring-blue-600/30'
                : 'bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200'
            }`}
            title="Tugas yang sudah diserahkan siswa dan sedang menunggu penilaian guru"
          >
            <span>📥 Diserahkan</span>
            <span
              className={`px-1.5 py-0.2 rounded-full text-[10px] ${
                selectedStatus === 'TURNED_IN' ? 'bg-blue-700 text-white' : 'bg-blue-200 text-blue-800'
              }`}
            >
              {kurikulumStats.turnedInCount}
            </span>
          </button>

          {/* 5. Diserahkan Terlambat / Late */}
          <button
            type="button"
            onClick={() => {
              setSelectedStatus('TURNED_IN_LATE');
              setCurrentPage(1);
            }}
            className={`inline-flex items-center space-x-1.5 px-2.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
              selectedStatus === 'TURNED_IN_LATE' || selectedStatus === 'LATE'
                ? 'bg-amber-600 text-white shadow-xs ring-2 ring-amber-600/30'
                : 'bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-200'
            }`}
            title="Tugas yang diserahkan siswa melewati batas waktu deadline"
          >
            <span>⏰ Diserahkan Terlambat</span>
            <span
              className={`px-1.5 py-0.2 rounded-full text-[10px] ${
                selectedStatus === 'TURNED_IN_LATE' || selectedStatus === 'LATE'
                  ? 'bg-amber-700 text-white'
                  : 'bg-amber-200 text-amber-900'
              }`}
            >
              {kurikulumStats.lateCount}
            </span>
          </button>

          {/* 6. Sudah Dinilai / Graded */}
          <button
            type="button"
            onClick={() => {
              setSelectedStatus('GRADED');
              setCurrentPage(1);
            }}
            className={`inline-flex items-center space-x-1.5 px-2.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
              selectedStatus === 'GRADED'
                ? 'bg-emerald-700 text-white shadow-xs ring-2 ring-emerald-700/30'
                : 'bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200'
            }`}
            title="Tugas yang telah selesai diperiksa dan diberi nilai oleh guru"
          >
            <span>✅ Sudah Dinilai</span>
            <span
              className={`px-1.5 py-0.2 rounded-full text-[10px] ${
                selectedStatus === 'GRADED' ? 'bg-emerald-800 text-white' : 'bg-emerald-200 text-emerald-900'
              }`}
            >
              {kurikulumStats.gradedCount}
            </span>
          </button>

          {/* 7. Dikembalikan / Returned */}
          <button
            type="button"
            onClick={() => {
              setSelectedStatus('RETURNED');
              setCurrentPage(1);
            }}
            className={`inline-flex items-center space-x-1.5 px-2.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
              selectedStatus === 'RETURNED'
                ? 'bg-teal-700 text-white shadow-xs ring-2 ring-teal-700/30'
                : 'bg-teal-50 hover:bg-teal-100 text-teal-800 border border-teal-200'
            }`}
            title="Tugas yang dikembalikan oleh guru"
          >
            <span>↩️ Dikembalikan</span>
            <span
              className={`px-1.5 py-0.2 rounded-full text-[10px] ${
                selectedStatus === 'RETURNED' ? 'bg-teal-800 text-white' : 'bg-teal-200 text-teal-900'
              }`}
            >
              {kurikulumStats.returnedCount}
            </span>
          </button>

          {/* 8. Ditarik Kembali / Reclaimed (if any) */}
          {kurikulumStats.reclaimedCount > 0 && (
            <button
              type="button"
              onClick={() => {
                setSelectedStatus('RECLAIMED');
                setCurrentPage(1);
              }}
              className={`inline-flex items-center space-x-1.5 px-2.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                selectedStatus === 'RECLAIMED'
                  ? 'bg-purple-700 text-white shadow-xs ring-2 ring-purple-700/30'
                  : 'bg-purple-50 hover:bg-purple-100 text-purple-800 border border-purple-200'
              }`}
              title="Tugas yang dibatalkan penyerahannya oleh siswa (unsubmitted)"
            >
              <span>🟣 Ditarik Kembali</span>
              <span
                className={`px-1.5 py-0.2 rounded-full text-[10px] ${
                  selectedStatus === 'RECLAIMED' ? 'bg-purple-800 text-white' : 'bg-purple-200 text-purple-900'
                }`}
              >
                {kurikulumStats.reclaimedCount}
              </span>
            </button>
          )}

          {/* 9. Sudah Clear (Tuntas) */}
          <button
            type="button"
            onClick={() => {
              setSelectedStatus('CLEAR');
              setCurrentPage(1);
            }}
            className={`inline-flex items-center space-x-1.5 px-2.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
              selectedStatus === 'CLEAR'
                ? 'bg-green-700 text-white shadow-xs ring-2 ring-green-700/30'
                : 'bg-green-50 hover:bg-green-100 text-green-800 border border-green-200'
            }`}
            title="Siswa yang sudah menuntaskan semua tugas dan dinyatakan Clear"
          >
            <span>✨ Sudah Clear</span>
            <span
              className={`px-1.5 py-0.2 rounded-full text-[10px] ${
                selectedStatus === 'CLEAR' ? 'bg-green-800 text-white' : 'bg-green-200 text-green-900'
              }`}
            >
              {kurikulumStats.clearCount}
            </span>
          </button>

          {/* 10. Belum Selesai (Semua Tunggakan) */}
          <button
            type="button"
            onClick={() => {
              setSelectedStatus('UNFINISHED');
              setCurrentPage(1);
            }}
            className={`inline-flex items-center space-x-1.5 px-2.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
              selectedStatus === 'UNFINISHED'
                ? 'bg-rose-800 text-white shadow-xs ring-2 ring-rose-800/30'
                : 'bg-rose-50 hover:bg-rose-100 text-rose-800 border border-rose-200'
            }`}
            title="Semua tugas yang masih menjadi beban tunggakan siswa"
          >
            <span>❌ Belum Selesai</span>
            <span
              className={`px-1.5 py-0.2 rounded-full text-[10px] ${
                selectedStatus === 'UNFINISHED' ? 'bg-rose-900 text-white' : 'bg-rose-200 text-rose-900'
              }`}
            >
              {kurikulumStats.unfinishedCount}
            </span>
          </button>

          {/* Reset Filters button */}
          {(selectedMonth !== 'ALL' ||
            selectedStatus !== 'ALL' ||
            selectedClasses.length < classOptions.length ||
            selectedCourses.length < courseOptions.length ||
            searchTerm ||
            selectedStudentId !== 'ALL') && (
            <button
              type="button"
              onClick={() => {
                setSelectedMonth('ALL');
                setSelectedStatus('ALL');
                setSelectedClasses(classOptions);
                setSelectedCourses(courseOptions);
                setSearchTerm('');
                setSelectedStudentId('ALL');
                setCurrentPage(1);
              }}
              className="ml-auto text-xs font-bold text-slate-500 hover:text-slate-800 underline cursor-pointer"
            >
              Reset Semua Filter
            </button>
          )}
        </div>
      </div>

      {/* Main Bento Table Card (Upper Left Aligned) */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs flex flex-col overflow-hidden">
        {/* Table Bento Header */}
        <div className="p-4 border-b border-amber-100 bg-amber-50/30 flex flex-col sm:flex-row sm:justify-between sm:items-center gap-2">
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="font-bold text-slate-800 text-sm">Daftar Rekapitulasi Tugas Siswa</h2>
            {selectedMonth !== 'ALL' && (
              <span className="text-[10px] font-black bg-amber-200 text-amber-950 px-2 py-0.5 rounded-full border border-amber-300">
                Bulan: {monthOptions.find((m) => m.key === selectedMonth)?.label || selectedMonth} (
                {monthScopeMode === 'EXACT' ? 'Tepat Bulan' : 's/d Bulan Ini'})
              </span>
            )}
            <span className="text-[10px] font-black bg-[#FFC800] text-slate-950 px-2 py-0.5 rounded-full border border-amber-400">
              Monitoring Kurikulum
            </span>
          </div>
          <span className="text-xs text-slate-500 font-medium">
            Menampilkan {paginatedRows.length} dari {filteredRows.length} baris tugas
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm border-collapse">
            <thead className="bg-slate-50 text-slate-600 font-bold uppercase text-[10px] tracking-widest border-b border-slate-200">
              <tr>
                <th className="px-4 py-3 text-left align-top">Nama Siswa</th>
                <th className="px-3 py-3 text-left align-top">Kelas</th>
                <th className="px-4 py-3 text-left align-top">Nama Mata Pelajaran</th>
                <th className="px-3 py-3 text-left align-top">Overall Score</th>
                <th className="px-4 py-3 text-left align-top min-w-[220px]">Nama Tugas</th>
                <th className="px-3.5 py-3 text-left align-top min-w-[130px]">Deadline</th>
                <th className="px-3.5 py-3 text-left align-top min-w-[150px]">Status Tugas</th>
                <th className="px-3.5 py-3 text-left align-top">Clearance</th>
                <th className="px-4 py-3 text-left align-top min-w-[210px]">Ekspor Siswa (PDF / DOCX)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-xs">
              {paginatedRows.length === 0 ? (
                <tr>
                  <td colSpan={9} className="py-12 text-center text-slate-500">
                    <div className="flex flex-col items-center justify-center space-y-2">
                      <AlertCircle className="w-8 h-8 text-slate-400" />
                      <span className="text-sm font-bold text-slate-700">Tidak ada data tugas yang cocok</span>
                      <span className="text-xs text-slate-400">Silakan sesuaikan filter atau kata kunci pencarian</span>
                    </div>
                  </td>
                </tr>
              ) : (
                paginatedRows.map((row) => {
                  return (
                    <tr
                      key={row.rowId}
                      className="hover:bg-amber-50/30 transition-colors cursor-pointer group"
                      onClick={() => onSelectStudent(row.parentRecord)}
                    >
                      {/* 1. Nama Siswa (Upper Left Aligned) */}
                      <td className="px-4 py-3.5 align-top text-left">
                        <div className="flex items-start space-x-2.5">
                          {row.studentPhoto ? (
                            <img
                              src={row.studentPhoto}
                              alt={row.studentName}
                              className="w-7 h-7 rounded-full border border-amber-300 object-cover shrink-0 mt-0.5"
                              referrerPolicy="no-referrer"
                            />
                          ) : (
                            <div className="w-7 h-7 rounded-full bg-amber-100 text-slate-900 font-bold flex items-center justify-center text-xs border border-amber-300 shrink-0 mt-0.5">
                              {row.studentName.charAt(0)}
                            </div>
                          )}
                          <div className="min-w-0">
                            <div className="font-bold text-slate-900 group-hover:text-amber-800 transition-colors">
                              {row.studentName}
                            </div>
                            {row.studentEmail && (
                              <div className="text-[11px] text-slate-400 truncate max-w-[170px]">
                                {row.studentEmail}
                              </div>
                            )}
                          </div>
                        </div>
                      </td>

                      {/* 2. Kelas (Upper Left Aligned) */}
                      <td className="px-3 py-3.5 align-top text-left whitespace-nowrap">
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-slate-100 text-slate-700 border border-slate-200">
                          {row.className}
                        </span>
                      </td>

                      {/* 3. Nama Mata Pelajaran (Upper Left Aligned) */}
                      <td className="px-4 py-3.5 align-top text-left">
                        <div className="flex items-center space-x-1.5">
                          <span className="font-bold text-slate-800">{row.courseName}</span>
                          {row.courseLink && (
                            <a
                              href={row.courseLink}
                              target="_blank"
                              rel="noreferrer"
                              onClick={(e) => e.stopPropagation()}
                              className="text-slate-400 hover:text-amber-600 p-0.5"
                              title="Buka Kelas di Google Classroom"
                            >
                              <ExternalLink className="w-3.5 h-3.5" />
                            </a>
                          )}
                        </div>
                      </td>

                      {/* 4. Overall Score */}
                      <td className="px-3 py-3.5 align-top text-left whitespace-nowrap">
                        <span className="inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-black bg-amber-100/90 text-slate-950 border border-amber-300">
                          {row.overallScoreStr || '-'}
                        </span>
                      </td>

                      {/* 5. Nama Tugas (Upper Left Aligned) */}
                      <td className="px-4 py-3.5 align-top text-left">
                        {row.taskStatus === 'ALL_CLEARED' ? (
                          <div className="flex items-center space-x-1.5 text-emerald-700 font-bold">
                            <CheckCircle className="w-4 h-4 text-emerald-600 shrink-0" />
                            <span>{row.taskTitle}</span>
                          </div>
                        ) : (
                          <div className="flex items-start space-x-1.5">
                            <span className="text-rose-500 font-black shrink-0 mt-0.5">•</span>
                            <span className="font-bold text-slate-900 leading-snug">{row.taskTitle}</span>
                          </div>
                        )}
                      </td>

                      {/* 6. Kolom Deadline Terpisah (Upper Left Aligned) */}
                      <td className="px-3.5 py-3.5 align-top text-left whitespace-nowrap">
                        {row.dueDateStr === '-' ? (
                          <span className="text-slate-400 font-medium">-</span>
                        ) : row.taskStatus === 'MISSING' ? (
                          <div className="inline-flex items-center space-x-1.5 text-rose-700 font-bold bg-rose-50 px-2 py-0.5 rounded-md text-[11px] border border-rose-200">
                            <AlertCircle className="w-3 h-3 text-rose-600 shrink-0" />
                            <span>{row.dueDateStr}</span>
                            <span className="text-[9px] bg-rose-600 text-white px-1 py-0.2 rounded font-black">
                              Overdue
                            </span>
                          </div>
                        ) : row.taskStatus === 'TURNED_IN_LATE' || row.late ? (
                          <div className="inline-flex items-center space-x-1.5 text-amber-800 font-bold bg-amber-50 px-2 py-0.5 rounded-md text-[11px] border border-amber-200">
                            <Clock className="w-3 h-3 text-amber-600 shrink-0" />
                            <span>{row.dueDateStr}</span>
                            <span className="text-[9px] bg-amber-500 text-white px-1 py-0.2 rounded font-black">
                              Terlambat
                            </span>
                          </div>
                        ) : (
                          <div className="inline-flex items-center space-x-1 text-slate-600 font-medium bg-slate-100/70 px-2 py-0.5 rounded-md text-[11px] border border-slate-200">
                            <Calendar className="w-3 h-3 text-slate-400 shrink-0" />
                            <span>{row.dueDateStr}</span>
                          </div>
                        )}
                      </td>

                      {/* 7. Status Tugas (Upper Left Aligned) */}
                      <td className="px-3.5 py-3.5 align-top text-left whitespace-nowrap">
                        {row.taskStatus === 'ALL_CLEARED' ? (
                          <span className="inline-flex items-center space-x-1 px-2.5 py-1 rounded-lg text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                            <CheckCircle className="w-3.5 h-3.5 text-emerald-600" />
                            <span>Selesai & Dinilai</span>
                          </span>
                        ) : (
                          <span
                            className={`inline-flex items-center space-x-1.5 px-2.5 py-1 rounded-lg text-xs font-bold border shadow-2xs ${row.statusBadgeClass}`}
                          >
                            <span className="w-1.5 h-1.5 rounded-full bg-current opacity-80 shrink-0"></span>
                            <span>{row.statusLabel}</span>
                          </span>
                        )}
                      </td>

                      {/* 8. Status Clearance (Upper Left Aligned) */}
                      <td className="px-3.5 py-3.5 align-top text-left whitespace-nowrap">
                        <span
                          className={`inline-block px-2.5 py-0.5 rounded-full text-xs font-bold ${
                            row.isClear
                              ? 'bg-emerald-100 text-emerald-700 border border-emerald-200'
                              : 'bg-rose-100 text-rose-700 border border-rose-200'
                          }`}
                        >
                          {row.isClear ? 'CLEAR' : 'BELUM CLEAR'}
                        </span>
                      </td>

                      {/* 9. Ekspor Rapor Siswa (PDF / DOCX) */}
                      <td className="px-4 py-3.5 align-top text-left whitespace-nowrap">
                        <div className="flex items-center space-x-1.5">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleOpenStudentReportModal(row.studentName, row.className, row.studentId);
                            }}
                            className="inline-flex items-center space-x-1 px-2.5 py-1 bg-slate-900 hover:bg-slate-800 text-white rounded-lg text-xs font-bold shadow-2xs transition-all active:scale-95 cursor-pointer border border-slate-800"
                            title="Buka Template Rapor Bulanan"
                          >
                            <FileText className="w-3.5 h-3.5 text-[#FFC800]" />
                            <span>Rapor</span>
                          </button>

                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDirectExportPDF(row.studentName, row.className, row.studentId);
                            }}
                            className="inline-flex items-center space-x-1 px-2 py-1 bg-[#FFC800] hover:bg-amber-400 text-slate-950 rounded-lg text-xs font-black border border-amber-400 transition-colors active:scale-95 cursor-pointer shadow-2xs"
                            title="Unduh Rapor PDF Siswa Ini"
                          >
                            <FileDown className="w-3.5 h-3.5" />
                            <span>PDF</span>
                          </button>

                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDirectExportDocx(row.studentName, row.className, row.studentId);
                            }}
                            className="inline-flex items-center space-x-1 px-2 py-1 bg-amber-50 hover:bg-amber-100 text-amber-950 rounded-lg text-xs font-bold border border-amber-300 transition-colors active:scale-95 cursor-pointer shadow-2xs"
                            title="Unduh Rapor Word .docx Siswa Ini"
                          >
                            <FileDown className="w-3.5 h-3.5 text-amber-700" />
                            <span>DOCX</span>
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Bento Table Footer */}
        {filteredRows.length > 0 && (
          <div className="p-4 bg-slate-50/80 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
            <div>
              Menampilkan {Math.min(filteredRows.length, (currentPage - 1) * itemsPerPage + 1)} -{' '}
              {Math.min(filteredRows.length, currentPage * itemsPerPage)} dari {filteredRows.length} baris tugas
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

      {/* Monthly Report Preview Modal */}
      {reportModal.isOpen && (
        <StudentMonthlyReportModal
          studentName={reportModal.studentName}
          className={reportModal.className}
          records={reportModal.studentRecords}
          isOpen={reportModal.isOpen}
          initialYear={selectedMonth !== 'ALL' ? parseInt(selectedMonth.split('-')[0], 10) : undefined}
          initialMonth={selectedMonth !== 'ALL' ? parseInt(selectedMonth.split('-')[1], 10) : undefined}
          onClose={() =>
            setReportModal({
              isOpen: false,
              studentName: '',
              className: '',
              studentRecords: [],
            })
          }
        />
      )}
    </div>
  );
};
