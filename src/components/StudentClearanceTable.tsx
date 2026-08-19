import React, { useState, useMemo } from 'react';
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
import { StudentClearanceRecord } from '../types';
import { exportStudentsToPDF, exportStudentMonthlyProgressReportPDF } from '../utils/pdfExport';
import { exportStudentMonthlyReportDocx } from '../utils/docxExport';
import { StudentMonthlyReportModal } from './StudentMonthlyReportModal';

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
  maxPoints?: number;
  taskStatus: 'NOT_SUBMITTED' | 'WAITING_GRADE' | 'GRADED' | 'ALL_CLEARED';
  statusLabel: string;
  isClear: boolean;
  overallScore?: number;
  overallScoreStr?: string;
  parentRecord: StudentClearanceRecord;
}

export const StudentClearanceTable: React.FC<StudentClearanceTableProps> = ({
  records,
  onSelectStudent,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedClass, setSelectedClass] = useState('ALL');
  const [selectedCourse, setSelectedCourse] = useState('ALL');
  const [selectedStatus, setSelectedStatus] = useState<'ALL' | 'CLEAR' | 'PENDING' | 'UNSUBMITTED' | 'UNGRADED'>('ALL');
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

  // Flatten records into 1 line 1 data (1 task per row with separate deadline)
  const allFlattenedRows = useMemo<FlattenedStudentTaskRow[]>(() => {
    const rows: FlattenedStudentTaskRow[] = [];

    records.forEach((record) => {
      if (record.unfinishedTasks.length > 0) {
        record.unfinishedTasks.forEach((task, tIdx) => {
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
            maxPoints: task.maxPoints,
            taskStatus: task.status,
            statusLabel:
              task.status === 'NOT_SUBMITTED' ? 'Belum Dikumpulkan' : 'Menunggu Nilai Guru',
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
        r.dueDateStr.toLowerCase().includes(searchTerm.toLowerCase());

      if (!matchesSearch) return false;

      if (selectedClass !== 'ALL' && r.className !== selectedClass) return false;
      if (selectedCourse !== 'ALL' && r.courseName !== selectedCourse) return false;

      if (selectedStatus === 'CLEAR' && !r.isClear) return false;
      if (selectedStatus === 'PENDING' && r.isClear) return false;
      if (selectedStatus === 'UNSUBMITTED' && r.taskStatus !== 'NOT_SUBMITTED') return false;
      if (selectedStatus === 'UNGRADED' && r.taskStatus !== 'WAITING_GRADE') return false;

      return true;
    });
  }, [allFlattenedRows, searchTerm, selectedClass, selectedCourse, selectedStatus, selectedStudentId]);

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
    const filterInfo = selectedClass !== 'ALL' ? `Kelas: ${selectedClass}` : '';
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

        {/* Filter Dropdowns */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 pt-3 border-t border-amber-100">
          <div>
            <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1">
              Filter Kelas
            </label>
            <select
              id="filter-student-class"
              value={selectedClass}
              onChange={(e) => {
                setSelectedClass(e.target.value);
                setCurrentPage(1);
              }}
              className="w-full bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs text-slate-700 font-medium focus:outline-none focus:border-amber-500 focus:bg-white"
            >
              <option value="ALL">Semua Kelas ({classOptions.length})</option>
              {classOptions.map((cls) => (
                <option key={cls} value={cls}>
                  {cls}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1">
              Filter Mata Pelajaran
            </label>
            <select
              id="filter-student-course"
              value={selectedCourse}
              onChange={(e) => {
                setSelectedCourse(e.target.value);
                setCurrentPage(1);
              }}
              className="w-full bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs text-slate-700 font-medium focus:outline-none focus:border-amber-500 focus:bg-white"
            >
              <option value="ALL">Semua Mata Pelajaran ({courseOptions.length})</option>
              {courseOptions.map((crs) => (
                <option key={crs} value={crs}>
                  {crs}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1">
              Filter Status Tugas / Clearance
            </label>
            <select
              id="filter-student-status"
              value={selectedStatus}
              onChange={(e) => {
                setSelectedStatus(e.target.value as any);
                setCurrentPage(1);
              }}
              className="w-full bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs text-slate-700 font-medium focus:outline-none focus:border-amber-500 focus:bg-white"
            >
              <option value="ALL">Semua Status</option>
              <option value="UNSUBMITTED">Hanya Belum Dikumpulkan</option>
              <option value="UNGRADED">Hanya Menunggu Nilai Guru</option>
              <option value="PENDING">Semua Belum Clear</option>
              <option value="CLEAR">Sudah Clear (Tuntas)</option>
            </select>
          </div>
        </div>
      </div>

      {/* Main Bento Table Card (Upper Left Aligned) */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs flex flex-col overflow-hidden">
        {/* Table Bento Header */}
        <div className="p-4 border-b border-amber-100 bg-amber-50/30 flex justify-between items-center">
          <div className="flex items-center space-x-2">
            <h2 className="font-bold text-slate-800 text-sm">Daftar Rekapitulasi Tugas Siswa</h2>
            <span className="text-[10px] font-black bg-[#FFC800] text-slate-950 px-2 py-0.5 rounded-full border border-amber-400">
              1 Baris 1 Tugas • Overall Score • Ekspor PDF & DOCX per Siswa
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
                            <CheckCircle className="w-3 h-3 text-emerald-600" />
                            <span>Selesai & Dinilai</span>
                          </span>
                        ) : row.taskStatus === 'NOT_SUBMITTED' ? (
                          <span className="inline-flex items-center space-x-1 px-2.5 py-1 rounded-lg text-xs font-bold bg-rose-50 text-rose-700 border border-rose-200">
                            <AlertCircle className="w-3 h-3 text-rose-600" />
                            <span>Belum Dikumpulkan</span>
                          </span>
                        ) : (
                          <span className="inline-flex items-center space-x-1 px-2.5 py-1 rounded-lg text-xs font-bold bg-amber-50 text-amber-700 border border-amber-200">
                            <Clock className="w-3 h-3 text-amber-600" />
                            <span>Menunggu Nilai Guru</span>
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
