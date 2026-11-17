import React, { useState, useMemo, useEffect, useRef } from 'react';
import {
  Eye,
  FileDown,
  FileText,
  FileSpreadsheet,
  ArrowUpDown,
  ExternalLink,
  Printer,
  X,
  CheckCircle2,
  Clock,
  AlertTriangle,
  Award,
  ChevronDown,
} from 'lucide-react';
import { StudentClearanceRecord } from '../types';
import {
  TrackerDateFilter,
  TrackerStatusCategory,
  TrackerSortOrder,
  TrackerAssignmentItem,
  buildTrackerAssignments,
  exportTrackerToPDF,
  exportTrackerToDocx,
  exportTrackerToXLSX,
} from '../utils/trackerExport';

const STATUS_OPTIONS: { value: TrackerStatusCategory; label: string }[] = [
  { value: 'BELUM_DIKERJAKAN', label: 'Belum Dikerjakan' },
  { value: 'DISERAHKAN', label: 'Diserahkan' },
  { value: 'DINILAI', label: 'Dinilai' },
  { value: 'TERLAMBAT', label: 'Terlambat' },
];

const ALL_STATUS_VALUES: TrackerStatusCategory[] = STATUS_OPTIONS.map((o) => o.value);

interface ClassroomAssignmentTrackerProps {
  records: StudentClearanceRecord[];
}

export const ClassroomAssignmentTracker: React.FC<ClassroomAssignmentTrackerProps> = ({
  records,
}) => {
  // Unique class options
  const classOptions = useMemo(() => {
    const set = new Set<string>();
    records.forEach((r) => {
      if (r.className) set.add(r.className);
    });
    return Array.from(set).sort((a, b) => a.localeCompare(b));
  }, [records]);

  const [selectedClass, setSelectedClass] = useState<string>('ALL');
  const [selectedStudentId, setSelectedStudentId] = useState<string>('');
  const [dateFilter, setDateFilter] = useState<TrackerDateFilter>('ALL');
  const [selectedStatuses, setSelectedStatuses] =
    useState<TrackerStatusCategory[]>(ALL_STATUS_VALUES);
  const [isStatusMenuOpen, setIsStatusMenuOpen] = useState(false);
  const statusPopoverRef = useRef<HTMLDivElement>(null);
  const [sortOrder, setSortOrder] = useState<TrackerSortOrder>('RECENT_FIRST');
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const [isExportingDocx, setIsExportingDocx] = useState(false);

  // Close status multi-select popover on outside click
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (statusPopoverRef.current && !statusPopoverRef.current.contains(event.target as Node)) {
        setIsStatusMenuOpen(false);
      }
    }
    if (isStatusMenuOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isStatusMenuOpen]);

  // Unique students filtered by selectedClass
  const studentOptions = useMemo(() => {
    const map = new Map<string, { id: string; name: string; className: string }>();
    records.forEach((r) => {
      if (selectedClass !== 'ALL' && r.className !== selectedClass) return;
      if (!map.has(r.studentId)) {
        map.set(r.studentId, {
          id: r.studentId,
          name: r.studentName,
          className: r.className,
        });
      }
    });
    return Array.from(map.values()).sort((a, b) => a.name.localeCompare(b.name));
  }, [records, selectedClass]);

  // Keep a valid student selected whenever class or records change
  useEffect(() => {
    if (studentOptions.length === 0) {
      setSelectedStudentId('');
      return;
    }
    const stillExists = studentOptions.some((s) => s.id === selectedStudentId);
    if (!stillExists) {
      setSelectedStudentId(studentOptions[0].id);
    }
  }, [studentOptions, selectedStudentId]);

  const activeStudent = useMemo(() => {
    return studentOptions.find((s) => s.id === selectedStudentId) || studentOptions[0] || null;
  }, [studentOptions, selectedStudentId]);

  const studentRecords = useMemo(() => {
    if (!activeStudent) return [];
    return records.filter((r) => r.studentId === activeStudent.id);
  }, [records, activeStudent]);

  // Compute per-status counts for current student & date filter
  const statusCounts = useMemo(() => {
    const allForDate = buildTrackerAssignments(
      studentRecords,
      dateFilter,
      ALL_STATUS_VALUES,
      sortOrder
    );
    const counts: Record<TrackerStatusCategory, number> = {
      BELUM_DIKERJAKAN: 0,
      DISERAHKAN: 0,
      DINILAI: 0,
      TERLAMBAT: 0,
    };
    allForDate.forEach((item) => {
      counts[item.statusCategory] += 1;
    });
    return counts;
  }, [studentRecords, dateFilter, sortOrder]);

  const assignments = useMemo<TrackerAssignmentItem[]>(() => {
    return buildTrackerAssignments(studentRecords, dateFilter, selectedStatuses, sortOrder);
  }, [studentRecords, dateFilter, selectedStatuses, sortOrder]);

  const allStatusesSelected = selectedStatuses.length === ALL_STATUS_VALUES.length;
  const isStatusIndeterminate =
    selectedStatuses.length > 0 && selectedStatuses.length < ALL_STATUS_VALUES.length;

  const statusButtonSummary = useMemo(() => {
    if (selectedStatuses.length === 0) return 'Tidak Ada Dipilih (0)';
    if (allStatusesSelected) return 'Semua Status (All)';
    if (selectedStatuses.length === 1) {
      return (
        STATUS_OPTIONS.find((opt) => opt.value === selectedStatuses[0])?.label ||
        selectedStatuses[0]
      );
    }
    return `${selectedStatuses.length} Status Dipilih`;
  }, [selectedStatuses, allStatusesSelected]);

  const handleToggleStatus = (val: TrackerStatusCategory) => {
    setSelectedStatuses((prev) =>
      prev.includes(val) ? prev.filter((item) => item !== val) : [...prev, val]
    );
  };

  const handleToggleAllStatuses = () => {
    if (allStatusesSelected) {
      setSelectedStatuses([]);
    } else {
      setSelectedStatuses(ALL_STATUS_VALUES);
    }
  };

  const studentName = activeStudent?.name || '-';
  const studentClass = activeStudent?.className || '';

  const handleExportPDF = () => {
    if (!activeStudent) return;
    exportTrackerToPDF(studentName, studentClass, assignments);
  };

  const handleExportDocx = async () => {
    if (!activeStudent || isExportingDocx) return;
    setIsExportingDocx(true);
    try {
      await exportTrackerToDocx(studentName, studentClass, assignments);
    } catch (err) {
      console.error('Failed to export Assignment Tracker DOCX:', err);
    } finally {
      setIsExportingDocx(false);
    }
  };

  const handleExportXLSX = () => {
    if (!activeStudent) return;
    exportTrackerToXLSX(studentName, studentClass, assignments);
  };

  const renderStatusBadge = (item: TrackerAssignmentItem) => {
    switch (item.statusCategory) {
      case 'DINILAI':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-semibold bg-emerald-50 text-emerald-800 border border-emerald-200 whitespace-nowrap">
            <Award className="w-3.5 h-3.5 text-emerald-700 shrink-0" />
            <span>{item.statusLabel}</span>
          </span>
        );
      case 'DISERAHKAN':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-semibold bg-blue-50 text-blue-800 border border-blue-200 whitespace-nowrap">
            <CheckCircle2 className="w-3.5 h-3.5 text-blue-700 shrink-0" />
            <span>{item.statusLabel}</span>
          </span>
        );
      case 'TERLAMBAT':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-semibold bg-amber-50 text-amber-900 border border-amber-300 whitespace-nowrap">
            <AlertTriangle className="w-3.5 h-3.5 text-amber-700 shrink-0" />
            <span>{item.statusLabel}</span>
          </span>
        );
      case 'BELUM_DIKERJAKAN':
      default:
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-semibold bg-slate-100 text-slate-800 border border-slate-300 whitespace-nowrap">
            <Clock className="w-3.5 h-3.5 text-slate-600 shrink-0" />
            <span>{item.statusLabel}</span>
          </span>
        );
    }
  };

  return (
    <div
      id="tracker-main-printable"
      className="bg-white border border-slate-200 rounded-xl p-6 sm:p-8 text-slate-900 print:p-0 print:border-none print:rounded-none"
    >
      {/* Bagian 1: Judul Utama, Name: [Nama Siswa], Pemilih Kelas & Siswa, serta Tombol Aksi Ikon */}
      <section className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 pb-6 border-b border-slate-200 print:pb-3 print:border-b print:border-slate-300">
        <div className="space-y-2 print:space-y-1">
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 print:text-xl">
            Classroom Assignment Tracker
          </h1>
          <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
            <p className="text-base font-semibold text-slate-900 whitespace-nowrap print:text-sm">
              Name: <span className="font-bold text-slate-950">{studentName}</span>
              {studentClass && (
                <span className="hidden print:inline font-semibold text-slate-700">
                  {' '}
                  ({studentClass})
                </span>
              )}
            </p>

            <div className="flex flex-wrap items-center gap-2 print:hidden">
              <select
                id="tracker-class-select"
                aria-label="Pilih Kelas"
                value={selectedClass}
                onChange={(e) => setSelectedClass(e.target.value)}
                className="h-9 px-3 bg-white border border-slate-300 rounded-lg text-xs font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-slate-900/15 cursor-pointer"
              >
                <option value="ALL">Semua Kelas</option>
                {classOptions.map((cls) => (
                  <option key={cls} value={cls}>
                    {cls}
                  </option>
                ))}
              </select>

              <select
                id="tracker-student-select"
                aria-label="Pilih Nama Siswa"
                value={selectedStudentId}
                onChange={(e) => setSelectedStudentId(e.target.value)}
                disabled={studentOptions.length === 0}
                className="h-9 px-3 bg-white border border-slate-300 rounded-lg text-xs font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-slate-900/15 cursor-pointer min-w-[210px] max-w-xs"
              >
                {studentOptions.length === 0 ? (
                  <option value="">Tidak ada siswa</option>
                ) : (
                  studentOptions.map((st) => (
                    <option key={st.id} value={st.id}>
                      {st.name} ({st.className})
                    </option>
                  ))
                )}
              </select>
            </div>
          </div>
        </div>

        {/* Icon-Only Action Buttons (Preview, Export PDF, Export Docs, Export Excel) */}
        <div className="flex items-center gap-2 shrink-0 print:hidden">
          <button
            id="btn-tracker-preview"
            type="button"
            onClick={() => setIsPreviewOpen(true)}
            disabled={!activeStudent}
            title="Preview"
            aria-label="Preview"
            className="w-10 h-10 inline-flex items-center justify-center rounded-lg border border-slate-300 bg-white text-slate-700 hover:bg-slate-100 hover:text-slate-900 disabled:opacity-40 transition-colors cursor-pointer"
          >
            <Eye className="w-4 h-4" />
          </button>

          <button
            id="btn-tracker-export-pdf"
            type="button"
            onClick={handleExportPDF}
            disabled={!activeStudent}
            title="Export as PDF"
            aria-label="Export as PDF"
            className="w-10 h-10 inline-flex items-center justify-center rounded-lg border border-slate-300 bg-white text-rose-700 hover:bg-rose-50 hover:border-rose-300 disabled:opacity-40 transition-colors cursor-pointer"
          >
            <FileDown className="w-4 h-4" />
          </button>

          <button
            id="btn-tracker-export-docs"
            type="button"
            onClick={handleExportDocx}
            disabled={!activeStudent || isExportingDocx}
            title="Export as Docs"
            aria-label="Export as Docs"
            className="w-10 h-10 inline-flex items-center justify-center rounded-lg border border-slate-300 bg-white text-blue-700 hover:bg-blue-50 hover:border-blue-300 disabled:opacity-40 transition-colors cursor-pointer"
          >
            <FileText className="w-4 h-4" />
          </button>

          <button
            id="btn-tracker-export-excel"
            type="button"
            onClick={handleExportXLSX}
            disabled={!activeStudent}
            title="Export as Excel"
            aria-label="Export as Excel"
            className="w-10 h-10 inline-flex items-center justify-center rounded-lg border border-slate-300 bg-white text-emerald-700 hover:bg-emerald-50 hover:border-emerald-300 disabled:opacity-40 transition-colors cursor-pointer"
          >
            <FileSpreadsheet className="w-4 h-4" />
          </button>
        </div>
      </section>

      {/* Bagian 2: Baris Filter & Urutan */}
      <section className="py-5 border-b border-slate-200 flex flex-wrap items-center justify-between gap-4 print:hidden">
        <div className="flex flex-wrap items-center gap-4">
          {/* Filter Tanggal: All / This Month */}
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-slate-600">Date:</span>
            <div className="inline-flex items-center p-1 bg-slate-100 rounded-lg border border-slate-200">
              <button
                id="btn-tracker-date-all"
                type="button"
                onClick={() => setDateFilter('ALL')}
                className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-colors whitespace-nowrap cursor-pointer ${
                  dateFilter === 'ALL'
                    ? 'bg-white text-slate-900 shadow-2xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                All
              </button>
              <button
                id="btn-tracker-date-month"
                type="button"
                onClick={() => setDateFilter('THIS_MONTH')}
                className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-colors whitespace-nowrap cursor-pointer ${
                  dateFilter === 'THIS_MONTH'
                    ? 'bg-white text-slate-900 shadow-2xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                This Month
              </button>
            </div>
          </div>

          {/* Filter Assignment Status (Multiple Selection) */}
          <div className="flex items-center gap-2 relative" ref={statusPopoverRef}>
            <span className="text-xs font-semibold text-slate-600">Assignment Status:</span>
            <button
              id="tracker-status-multiselect"
              type="button"
              onClick={() => setIsStatusMenuOpen((prev) => !prev)}
              aria-expanded={isStatusMenuOpen}
              aria-haspopup="listbox"
              className="h-9 px-3 bg-white hover:bg-slate-50 border border-slate-300 rounded-lg text-xs font-medium text-slate-800 inline-flex items-center justify-between gap-2 min-w-[180px] focus:outline-none focus:ring-2 focus:ring-slate-900/15 cursor-pointer"
            >
              <span className="truncate">{statusButtonSummary}</span>
              <ChevronDown
                className={`w-3.5 h-3.5 text-slate-500 shrink-0 transition-transform ${
                  isStatusMenuOpen ? 'rotate-180' : ''
                }`}
              />
            </button>

            {isStatusMenuOpen && (
              <div className="absolute left-0 sm:left-auto sm:right-0 top-full mt-1.5 z-40 w-64 bg-white border border-slate-200 rounded-xl shadow-lg overflow-hidden">
                <div className="px-3 py-2.5 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
                  <label className="flex items-center gap-2 text-xs font-semibold text-slate-900 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={allStatusesSelected}
                      ref={(input) => {
                        if (input) {
                          input.indeterminate = isStatusIndeterminate;
                        }
                      }}
                      onChange={handleToggleAllStatuses}
                      className="w-4 h-4 rounded border-slate-300 accent-slate-900 cursor-pointer"
                    />
                    <span>Semua Status (All)</span>
                  </label>
                  <span className="text-[11px] font-medium text-slate-500">
                    {selectedStatuses.length}/{ALL_STATUS_VALUES.length}
                  </span>
                </div>

                <div className="p-1.5 divide-y divide-slate-100">
                  {STATUS_OPTIONS.map((opt) => {
                    const isChecked = selectedStatuses.includes(opt.value);
                    return (
                      <label
                        key={opt.value}
                        className="flex items-center justify-between px-2.5 py-2 hover:bg-slate-50 rounded-lg cursor-pointer select-none"
                      >
                        <div className="flex items-center gap-2.5">
                          <input
                            type="checkbox"
                            checked={isChecked}
                            onChange={() => handleToggleStatus(opt.value)}
                            className="w-4 h-4 rounded border-slate-300 accent-slate-900 cursor-pointer"
                          />
                          <span
                            className={`text-xs ${
                              isChecked ? 'font-semibold text-slate-900' : 'font-medium text-slate-700'
                            }`}
                          >
                            {opt.label}
                          </span>
                        </div>
                        <span className="text-[11px] font-medium text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded">
                          {statusCounts[opt.value]}
                        </span>
                      </label>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Urutan Deadline Toggle */}
        <button
          id="btn-tracker-sort-order"
          type="button"
          onClick={() =>
            setSortOrder((prev) => (prev === 'RECENT_FIRST' ? 'OLDEST_FIRST' : 'RECENT_FIRST'))
          }
          className="inline-flex items-center gap-2 h-9 px-3.5 bg-white hover:bg-slate-50 border border-slate-300 rounded-lg text-xs font-semibold text-slate-800 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
        >
          <ArrowUpDown className="w-3.5 h-3.5 text-slate-600 shrink-0" />
          <span>
            {sortOrder === 'RECENT_FIRST'
              ? 'Paling Recent (Terdekat → Lama)'
              : 'Paling Lama (Terjauh → Recent)'}
          </span>
        </button>
      </section>

      {/* Bagian 3: Tabel Daftar Semua Assignments + Area Tanda Tangan */}
      <section className="pt-6 space-y-10 print:pt-4 print:space-y-8">
        <div className="overflow-x-auto border border-slate-200 rounded-lg print:overflow-visible print:border-none print:rounded-none">
          <table className="w-full text-left border-collapse print:text-[8.5pt]">
            <thead>
              <tr className="bg-slate-50 print:bg-slate-100 border-b border-slate-200 text-xs print:text-[8.5pt] font-semibold text-slate-700">
                <th className="py-3 px-4 print:py-2 print:px-2 w-[16%]">Subject</th>
                <th className="py-3 px-4 print:py-2 print:px-2 w-[31%]">Description</th>
                <th className="py-3 px-3 print:py-2 print:px-1.5 w-[12%] whitespace-nowrap print:whitespace-normal print:text-center">
                  Deadline Tanggal
                </th>
                <th className="py-3 px-3 print:py-2 print:px-1.5 w-[10%] whitespace-nowrap print:whitespace-normal print:text-center">
                  Deadline Waktu
                </th>
                <th className="py-3 px-3 print:py-2 print:px-1.5 w-[13%] whitespace-nowrap print:whitespace-normal print:text-center">
                  Assignment Status
                </th>
                <th className="py-3 px-3 print:py-2 print:px-1.5 w-[9%] text-center">
                  Paraf Guru Mata Pelajaran
                </th>
                <th className="py-3 px-3 print:py-2 print:px-1.5 w-[9%] text-center">
                  Paraf Orangtua
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 text-sm print:text-[8.5pt] bg-white">
              {assignments.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 px-4 text-center text-sm text-slate-500">
                    Tidak ada assignment yang sesuai dengan filter saat ini.
                  </td>
                </tr>
              ) : (
                assignments.map((item) => (
                  <tr key={item.id} className="hover:bg-slate-50/70 transition-colors align-top">
                    <td className="py-3.5 px-4 print:py-2 print:px-2 font-semibold text-slate-900 text-xs sm:text-sm print:text-[8.5pt]">
                      {item.subject}
                    </td>
                    <td className="py-3.5 px-4 print:py-2 print:px-2">
                      <div className="font-medium text-slate-900 text-xs sm:text-sm print:text-[8.5pt] leading-snug">
                        {item.title}
                      </div>
                      {item.shortDescription && (
                        <p className="text-xs print:text-[8pt] text-slate-600 mt-1 leading-relaxed">
                          {item.shortDescription}
                        </p>
                      )}
                      {item.externalLink && (
                        <a
                          href={item.externalLink}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 mt-1.5 text-xs font-medium text-blue-700 hover:text-blue-900 hover:underline print:hidden"
                        >
                          <span>Buka di Google Classroom</span>
                          <ExternalLink className="w-3 h-3 shrink-0" />
                        </a>
                      )}
                    </td>
                    <td className="py-3.5 px-3 print:py-2 print:px-1.5 text-xs print:text-[8.5pt] text-slate-700 font-medium tabular-nums whitespace-nowrap print:whitespace-normal print:text-center">
                      {item.deadlineDate}
                    </td>
                    <td className="py-3.5 px-3 print:py-2 print:px-1.5 text-xs print:text-[8.5pt] text-slate-700 font-medium tabular-nums whitespace-nowrap print:text-center">
                      {item.deadlineTime}
                    </td>
                    <td className="py-3.5 px-3 print:py-2 print:px-1.5 print:text-center">
                      <div className="print:hidden">{renderStatusBadge(item)}</div>
                      <span className="hidden print:inline font-semibold text-[8.5pt] text-slate-900">
                        {item.statusLabel}
                      </span>
                    </td>
                    <td className="py-3.5 px-3 print:py-2 print:px-1.5">
                      <div className="h-9 border border-dashed border-slate-300 rounded-md print:border-none" />
                    </td>
                    <td className="py-3.5 px-3 print:py-2 print:px-1.5">
                      <div className="h-9 border border-dashed border-slate-300 rounded-md print:border-none" />
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Signatures Area Under Table */}
        <div className="report-footer-signature grid grid-cols-1 sm:grid-cols-2 print:grid-cols-2 gap-10 pt-4 px-2 sm:px-8 print:px-4">
          <div className="text-center">
            <p className="text-sm font-semibold text-slate-900 mb-16 print:text-xs print:mb-14">
              Student Signature
            </p>
            <div className="max-w-[240px] mx-auto border-b border-slate-400 mb-2" />
            <p className="text-xs font-medium text-slate-700">( {studentName} )</p>
          </div>

          <div className="text-center">
            <p className="text-sm font-semibold text-slate-900 mb-16 print:text-xs print:mb-14">
              Homeroom Teacher Signature
            </p>
            <div className="max-w-[240px] mx-auto border-b border-slate-400 mb-2" />
            <p className="text-xs font-medium text-slate-500">
              ( ........................................ )
            </p>
          </div>
        </div>
      </section>

      {/* Preview Modal */}
      {isPreviewOpen && (
        <div
          id="tracker-preview-modal-backdrop"
          className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-2 sm:p-4 overflow-y-auto"
          onClick={() => setIsPreviewOpen(false)}
        >
          <div
            id="tracker-preview-modal"
            className="bg-white border border-slate-200 rounded-xl w-full max-w-6xl max-h-[92vh] flex flex-col shadow-xl overflow-hidden my-auto"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Preview Top Toolbar (Icon-only action buttons) */}
            <div className="px-5 py-3 bg-white border-b border-slate-200 flex items-center justify-between shrink-0 print:hidden">
              <div className="text-sm font-bold text-slate-900">
                Classroom Assignment Tracker — {studentName}
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => window.print()}
                  title="Print"
                  aria-label="Print"
                  className="w-9 h-9 inline-flex items-center justify-center rounded-lg border border-slate-300 bg-white text-slate-700 hover:bg-slate-100 cursor-pointer"
                >
                  <Printer className="w-4 h-4" />
                </button>
                <button
                  type="button"
                  onClick={handleExportPDF}
                  title="Export as PDF"
                  aria-label="Export as PDF"
                  className="w-9 h-9 inline-flex items-center justify-center rounded-lg border border-slate-300 bg-white text-rose-700 hover:bg-rose-50 cursor-pointer"
                >
                  <FileDown className="w-4 h-4" />
                </button>
                <button
                  type="button"
                  onClick={handleExportDocx}
                  disabled={isExportingDocx}
                  title="Export as Docs"
                  aria-label="Export as Docs"
                  className="w-9 h-9 inline-flex items-center justify-center rounded-lg border border-slate-300 bg-white text-blue-700 hover:bg-blue-50 disabled:opacity-40 cursor-pointer"
                >
                  <FileText className="w-4 h-4" />
                </button>
                <button
                  type="button"
                  onClick={handleExportXLSX}
                  title="Export as Excel"
                  aria-label="Export as Excel"
                  className="w-9 h-9 inline-flex items-center justify-center rounded-lg border border-slate-300 bg-white text-emerald-700 hover:bg-emerald-50 cursor-pointer"
                >
                  <FileSpreadsheet className="w-4 h-4" />
                </button>
                <button
                  type="button"
                  onClick={() => setIsPreviewOpen(false)}
                  title="Tutup"
                  aria-label="Tutup"
                  className="w-9 h-9 inline-flex items-center justify-center rounded-lg text-slate-500 hover:bg-slate-100 hover:text-slate-900 cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Printable Sheet (A4 Portrait Width) */}
            <div className="p-4 sm:p-8 overflow-y-auto flex-1 bg-slate-50 print:p-0 print:bg-white print:overflow-visible">
              <div
                id="printable-assignment-tracker"
                className="bg-white p-6 sm:p-8 border border-slate-200 rounded-lg max-w-[210mm] mx-auto text-slate-900 print:p-0 print:border-none print:rounded-none print:max-w-full"
              >
                <div className="mb-5 print:mb-3">
                  <h2 className="text-xl font-bold text-slate-900">
                    Classroom Assignment Tracker
                  </h2>
                  <p className="text-sm font-semibold text-slate-800 mt-1">
                    Name: {studentName}
                    {studentClass ? ` (${studentClass})` : ''}
                  </p>
                </div>

                <div className="border border-slate-300 rounded-md overflow-hidden print:overflow-visible print:border-none print:rounded-none">
                  <table className="w-full text-left border-collapse text-xs print:text-[8.5pt]">
                    <thead>
                      <tr className="bg-slate-50 print:bg-slate-100 border-b border-slate-300 font-semibold text-slate-800">
                        <th className="py-2.5 px-3 print:py-2 print:px-2 w-[16%] border-r border-slate-200">
                          Subject
                        </th>
                        <th className="py-2.5 px-3 print:py-2 print:px-2 w-[31%] border-r border-slate-200">
                          Description
                        </th>
                        <th className="py-2.5 px-2.5 print:py-2 print:px-1.5 w-[12%] border-r border-slate-200 text-center whitespace-nowrap print:whitespace-normal">
                          Deadline Tanggal
                        </th>
                        <th className="py-2.5 px-2.5 print:py-2 print:px-1.5 w-[10%] border-r border-slate-200 text-center whitespace-nowrap print:whitespace-normal">
                          Deadline Waktu
                        </th>
                        <th className="py-2.5 px-2.5 print:py-2 print:px-1.5 w-[13%] border-r border-slate-200 text-center whitespace-nowrap print:whitespace-normal">
                          Assignment Status
                        </th>
                        <th className="py-2.5 px-2.5 print:py-2 print:px-1.5 w-[9%] border-r border-slate-200 text-center">
                          Paraf Guru Mata Pelajaran
                        </th>
                        <th className="py-2.5 px-2.5 print:py-2 print:px-1.5 w-[9%] text-center">
                          Paraf Orangtua
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200">
                      {assignments.length === 0 ? (
                        <tr>
                          <td colSpan={7} className="py-8 text-center text-slate-500">
                            Tidak ada assignment untuk filter ini.
                          </td>
                        </tr>
                      ) : (
                        assignments.map((item) => (
                          <tr key={item.id} className="align-top break-inside-avoid">
                            <td className="py-2.5 px-3 print:py-2 print:px-2 border-r border-slate-200 font-semibold text-slate-900">
                              {item.subject}
                            </td>
                            <td className="py-2.5 px-3 print:py-2 print:px-2 border-r border-slate-200">
                              <div className="font-medium text-slate-900">{item.title}</div>
                              {item.shortDescription && (
                                <div className="text-[11px] print:text-[8pt] text-slate-600 mt-0.5">
                                  {item.shortDescription}
                                </div>
                              )}
                            </td>
                            <td className="py-2.5 px-2.5 print:py-2 print:px-1.5 border-r border-slate-200 text-center tabular-nums whitespace-nowrap print:whitespace-normal">
                              {item.deadlineDate}
                            </td>
                            <td className="py-2.5 px-2.5 print:py-2 print:px-1.5 border-r border-slate-200 text-center tabular-nums whitespace-nowrap">
                              {item.deadlineTime}
                            </td>
                            <td className="py-2.5 px-2.5 print:py-2 print:px-1.5 border-r border-slate-200 text-center font-semibold">
                              {item.statusLabel}
                            </td>
                            <td className="py-2.5 px-2.5 print:py-2 print:px-1.5 border-r border-slate-200 h-10" />
                            <td className="py-2.5 px-2.5 print:py-2 print:px-1.5 h-10" />
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>

                {/* Signatures Under Table */}
                <div className="report-footer-signature grid grid-cols-2 gap-10 mt-10 pt-4">
                  <div className="text-center">
                    <p className="text-xs font-semibold text-slate-900 mb-14">Student Signature</p>
                    <div className="max-w-[200px] mx-auto border-b border-slate-400 mb-1.5" />
                    <p className="text-xs text-slate-700">( {studentName} )</p>
                  </div>
                  <div className="text-center">
                    <p className="text-xs font-semibold text-slate-900 mb-14">
                      Homeroom Teacher Signature
                    </p>
                    <div className="max-w-[200px] mx-auto border-b border-slate-400 mb-1.5" />
                    <p className="text-xs text-slate-500">
                      ( ........................................ )
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
