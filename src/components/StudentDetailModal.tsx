import React, { useState } from 'react';
import { X, ExternalLink, CheckCircle2, Clock, AlertTriangle, Printer, FileDown, FileText } from 'lucide-react';
import { StudentClearanceRecord } from '../types';
import { exportStudentMonthlyProgressReportPDF } from '../utils/pdfExport';
import { exportStudentMonthlyReportDocx } from '../utils/docxExport';
import { StudentMonthlyReportModal } from './StudentMonthlyReportModal';

interface StudentDetailModalProps {
  record: StudentClearanceRecord | null;
  allRecords?: StudentClearanceRecord[];
  onClose: () => void;
}

export const StudentDetailModal: React.FC<StudentDetailModalProps> = ({
  record,
  allRecords = [],
  onClose,
}) => {
  const [showReportModal, setShowReportModal] = useState(false);
  const [isExportingDocx, setIsExportingDocx] = useState(false);

  if (!record) return null;

  // Find all course records for this student
  const studentRecords = allRecords.length > 0
    ? allRecords.filter((r) => r.studentId === record.studentId || r.studentName.toLowerCase() === record.studentName.toLowerCase())
    : [record];

  const schoolLevel = record.className.toUpperCase().includes('10') ||
    record.className.toUpperCase().includes('11') ||
    record.className.toUpperCase().includes('12')
      ? 'SENIOR HIGH SCHOOL'
      : 'JUNIOR HIGH SCHOOL';

  const handlePrintPDF = () => {
    exportStudentMonthlyProgressReportPDF(record.studentName, studentRecords, schoolLevel);
  };

  const handleExportDocx = async () => {
    setIsExportingDocx(true);
    try {
      await exportStudentMonthlyReportDocx(record.studentName, studentRecords, schoolLevel);
    } catch (err) {
      console.error('Gagal mengekspor DOCX:', err);
    } finally {
      setIsExportingDocx(false);
    }
  };

  return (
    <>
      <div
        id="student-detail-modal-backdrop"
        className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto"
        onClick={onClose}
      >
        <div
          id="student-detail-modal"
          className="bg-white border border-amber-300 rounded-2xl w-full max-w-2xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Modal Header */}
          <div className="p-5 sm:p-6 border-b border-amber-100 flex items-start justify-between bg-amber-50/40">
            <div className="flex items-start space-x-3">
              {record.studentPhoto ? (
                <img
                  src={record.studentPhoto}
                  alt={record.studentName}
                  className="w-12 h-12 rounded-full border border-amber-300 object-cover mt-0.5"
                  referrerPolicy="no-referrer"
                />
              ) : (
                <div className="w-12 h-12 rounded-full bg-amber-100 text-slate-950 font-black flex items-center justify-center text-lg border border-amber-300 mt-0.5">
                  {record.studentName.charAt(0)}
                </div>
              )}
              <div>
                <div className="flex items-center space-x-2">
                  <h3 className="text-lg font-black text-slate-900">{record.studentName}</h3>
                  <span
                    className={`px-2.5 py-0.5 rounded-full text-xs font-bold ${
                      record.isClear
                        ? 'bg-emerald-100 text-emerald-700 border border-emerald-200'
                        : 'bg-rose-100 text-rose-700 border border-rose-200'
                    }`}
                  >
                    {record.isClear ? 'CLEAR' : 'BELUM CLEAR'}
                  </span>
                </div>
                <p className="text-xs text-slate-500 mt-0.5">{record.studentEmail || 'Tidak ada email terdaftar'}</p>
                <div className="flex flex-wrap gap-2 mt-2">
                  <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-slate-100 text-slate-700 border border-slate-200">
                    Kelas: {record.className}
                  </span>
                  <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-bold bg-[#FFC800] text-slate-950 border border-amber-400">
                    Mapel: {record.courseName}
                  </span>
                  {record.overallScoreStr && record.overallScoreStr !== '-' && (
                    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-bold bg-amber-100 text-amber-900 border border-amber-300">
                      Overall Score: {record.overallScoreStr}
                    </span>
                  )}
                </div>
              </div>
            </div>
            <button
              id="close-student-modal-btn"
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Modal Stats Bar */}
          <div className="grid grid-cols-3 gap-3 p-4 bg-slate-50 border-b border-slate-100 text-center">
            <div className="p-2.5 rounded-xl bg-white border border-slate-200/80 shadow-2xs">
              <div className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Total Tugas</div>
              <div className="text-xl font-black text-slate-900 mt-0.5">{record.totalTasks}</div>
            </div>
            <div className="p-2.5 rounded-xl bg-white border border-slate-200/80 shadow-2xs">
              <div className="text-[11px] font-bold uppercase tracking-wider text-rose-500">Belum Dikumpul</div>
              <div className="text-xl font-black text-rose-500 mt-0.5">
                {record.pendingUnsubmittedTasks.length}
              </div>
            </div>
            <div className="p-2.5 rounded-xl bg-white border border-slate-200/80 shadow-2xs">
              <div className="text-[11px] font-bold uppercase tracking-wider text-amber-600">Menunggu Grading</div>
              <div className="text-xl font-black text-amber-600 mt-0.5">
                {record.pendingUngradedTasks.length}
              </div>
            </div>
          </div>

          {/* Modal Task List */}
          <div className="p-5 sm:p-6 overflow-y-auto flex-1 space-y-2.5">
            <div className="text-[11px] font-bold text-slate-400 uppercase tracking-widest mb-1">
              Daftar Penugasan ({record.allTasks.length})
            </div>

            {record.allTasks.length === 0 ? (
              <div className="text-center py-8 text-slate-400 text-sm">
                Belum ada tugas yang dipublikasikan di kelas ini.
              </div>
            ) : (
              record.allTasks.map((task, idx) => {
                let badgeColor = 'bg-slate-100 text-slate-700 border-slate-200';
                let badgeLabel = 'Belum Dikumpulkan';
                let icon = <AlertTriangle className="w-4 h-4 text-rose-500" />;

                if (task.status === 'GRADED') {
                  badgeColor = 'bg-emerald-100 text-emerald-800 border-emerald-200';
                  badgeLabel = `Dinilai (${task.assignedGrade !== undefined ? task.assignedGrade : 'OK'}/${task.maxPoints || 100})`;
                  icon = <CheckCircle2 className="w-4 h-4 text-emerald-600" />;
                } else if (task.status === 'WAITING_GRADE') {
                  badgeColor = 'bg-amber-100 text-amber-800 border-amber-200';
                  badgeLabel = 'Sudah Dikumpul (Menunggu Grading)';
                  icon = <Clock className="w-4 h-4 text-amber-600" />;
                } else {
                  badgeColor = 'bg-rose-100 text-rose-800 border-rose-200';
                  badgeLabel = 'Missing / Belum Dikumpul';
                  icon = <AlertTriangle className="w-4 h-4 text-rose-600" />;
                }

                return (
                  <div
                    key={task.courseWorkId || idx}
                    className="p-3 bg-slate-50 border border-slate-200/80 rounded-xl flex items-center justify-between hover:border-amber-300 transition-colors"
                  >
                    <div className="flex items-start space-x-3">
                      <div className="p-2 bg-white rounded-lg border border-slate-200 mt-0.5 shrink-0 shadow-2xs">
                        {icon}
                      </div>
                      <div>
                        <div className="font-bold text-xs sm:text-sm text-slate-900">{task.title}</div>
                        <div className="text-[11px] text-slate-500 mt-0.5 flex flex-wrap items-center gap-2">
                          <span>Deadline: {task.dueDateStr}</span>
                          {task.maxPoints !== undefined && (
                            <span>• Maks Poin: {task.maxPoints}</span>
                          )}
                          {task.late && (
                            <span className="text-amber-600 font-bold">• Terlambat</span>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center space-x-2 ml-3 shrink-0">
                      <span className={`px-2 py-0.5 rounded text-[11px] font-bold border ${badgeColor} whitespace-nowrap`}>
                        {badgeLabel}
                      </span>
                      {task.alternateLink && (
                        <a
                          href={task.alternateLink}
                          target="_blank"
                          rel="noreferrer"
                          className="p-1 text-slate-400 hover:text-amber-600 hover:bg-amber-50 rounded-md transition-colors"
                          title="Buka di Google Classroom"
                        >
                          <ExternalLink className="w-3.5 h-3.5" />
                        </a>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {/* Modal Footer with Actions */}
          <div className="p-4 bg-slate-50 border-t border-slate-100 flex flex-wrap items-center justify-between gap-2.5">
            <div className="flex items-center space-x-2">
              <button
                onClick={() => setShowReportModal(true)}
                className="inline-flex items-center space-x-1.5 px-3 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold shadow-2xs transition-all active:scale-95 cursor-pointer border border-slate-800"
                title="Buka Pratinjau Rapor Bulanan"
              >
                <FileText className="w-3.5 h-3.5 text-[#FFC800]" />
                <span>Lihat Template Rapor</span>
              </button>

              <button
                onClick={handlePrintPDF}
                className="inline-flex items-center space-x-1.5 px-3 py-2 bg-[#FFC800] hover:bg-amber-400 text-slate-950 rounded-xl text-xs font-black shadow-2xs border border-amber-400 transition-all active:scale-95 cursor-pointer"
                title="Unduh format PDF"
              >
                <FileDown className="w-3.5 h-3.5" />
                <span>PDF Rapor</span>
              </button>

              <button
                onClick={handleExportDocx}
                disabled={isExportingDocx}
                className="inline-flex items-center space-x-1.5 px-3 py-2 bg-amber-50 hover:bg-amber-100 text-amber-950 rounded-xl text-xs font-bold border border-amber-300 shadow-2xs transition-all active:scale-95 cursor-pointer disabled:opacity-50"
                title="Unduh format Word .docx"
              >
                <FileDown className="w-3.5 h-3.5 text-amber-700" />
                <span>{isExportingDocx ? 'Docx...' : '.DOCX'}</span>
              </button>
            </div>

            <button
              id="btn-close-student-detail"
              onClick={onClose}
              className="px-4 py-2 bg-white hover:bg-slate-100 text-slate-700 text-xs font-bold rounded-xl border border-slate-200 shadow-2xs transition-colors cursor-pointer"
            >
              Tutup
            </button>
          </div>
        </div>
      </div>

      {/* Monthly Report Modal */}
      {showReportModal && (
        <StudentMonthlyReportModal
          studentName={record.studentName}
          className={record.className}
          records={studentRecords}
          isOpen={showReportModal}
          onClose={() => setShowReportModal(false)}
        />
      )}
    </>
  );
};
