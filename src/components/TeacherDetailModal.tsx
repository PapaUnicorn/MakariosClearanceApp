import React from 'react';
import { X, ExternalLink, BookOpen, Clock, User, CheckCircle2, Award } from 'lucide-react';
import { TeacherSummaryRecord } from '../types';

interface TeacherDetailModalProps {
  record: TeacherSummaryRecord | null;
  onClose: () => void;
}

export const TeacherDetailModal: React.FC<TeacherDetailModalProps> = ({ record, onClose }) => {
  if (!record) return null;

  return (
    <div
      id="teacher-detail-modal-backdrop"
      className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto"
      onClick={onClose}
    >
      <div
        id="teacher-detail-modal"
        className="bg-white border border-amber-300 rounded-2xl w-full max-w-2xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="p-5 sm:p-6 border-b border-amber-100 flex items-start justify-between bg-amber-50/40">
          <div className="flex items-start space-x-3">
            {record.teacherPhoto ? (
              <img
                src={record.teacherPhoto}
                alt={record.teacherName}
                className="w-12 h-12 rounded-full border border-amber-300 object-cover mt-0.5 shrink-0"
                referrerPolicy="no-referrer"
              />
            ) : (
              <div className="w-12 h-12 rounded-full bg-amber-100 text-slate-950 font-black flex items-center justify-center text-xl border border-amber-300 mt-0.5 shrink-0">
                {record.teacherName.charAt(0)}
              </div>
            )}
            <div>
              <div className="flex items-center space-x-2">
                <h3 className="text-lg font-black text-slate-900">{record.teacherName}</h3>
                <span
                  className={`px-2.5 py-0.5 rounded-full text-xs font-bold ${
                    record.isClear
                      ? 'bg-emerald-100 text-emerald-700 border border-emerald-200'
                      : 'bg-rose-100 text-rose-700 border border-rose-200'
                  }`}
                >
                  {record.isClear ? 'GRADING CLEAR' : `${record.totalUngradedSubmissions} SUBMISI BELUM DINILAI`}
                </span>
              </div>
              <div className="text-xs text-slate-500 mt-0.5">
                {record.teacherEmail || 'Email tidak tersedia'}
              </div>
              <div className="flex flex-wrap gap-1.5 mt-2">
                {record.assignedCourses.map((c, i) => (
                  <span
                    key={c.courseId || i}
                    className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-slate-100 text-slate-700 border border-slate-200"
                  >
                    {c.courseName} ({c.className})
                  </span>
                ))}
              </div>
            </div>
          </div>
          <button
            id="close-teacher-modal-btn"
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Stats */}
        <div className="grid grid-cols-2 gap-3 p-4 bg-slate-50 border-b border-slate-100 text-center">
          <div className="p-2.5 rounded-xl bg-white border border-slate-200/80 shadow-2xs">
            <div className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Total Kelas Diampu</div>
            <div className="text-xl font-black text-slate-900 mt-0.5">{record.assignedCourses.length}</div>
          </div>
          <div className="p-2.5 rounded-xl bg-white border border-slate-200/80 shadow-2xs">
            <div className="text-[11px] font-bold uppercase tracking-wider text-rose-500">Antrean Grading</div>
            <div className="text-xl font-black text-rose-500 mt-0.5">{record.totalUngradedSubmissions} Submisi</div>
          </div>
        </div>

        {/* Modal Content */}
        <div className="p-5 sm:p-6 overflow-y-auto flex-1 space-y-3.5">
          <div className="text-[11px] font-bold text-slate-400 uppercase tracking-widest">
            Daftar Tugas Yang Perlu Digrading ({record.ungradedTasksList.length})
          </div>

          {record.ungradedTasksList.length === 0 ? (
            <div className="text-center py-10 bg-slate-50 rounded-xl border border-slate-200/80">
              <CheckCircle2 className="w-10 h-10 text-emerald-500 mx-auto mb-2" />
              <div className="text-sm font-bold text-slate-800">Semua Submisi Sudah Dinilai!</div>
              <p className="text-xs text-slate-500 mt-1">
                Tidak ada tugas yang sedang menunggu grading untuk guru ini.
              </p>
            </div>
          ) : (
            record.ungradedTasksList.map((item, idx) => (
              <div
                key={item.courseWorkId || idx}
                className="p-4 bg-slate-50 border border-slate-200/80 rounded-xl space-y-3"
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-start space-x-2.5">
                    <Clock className="w-4 h-4 text-rose-500 mt-0.5 shrink-0" />
                    <div>
                      <div className="font-bold text-sm text-slate-900">{item.courseWorkTitle}</div>
                      <div className="text-xs text-slate-500 mt-0.5">
                        <span className="font-semibold text-slate-700">{item.courseName} ({item.className})</span> • Batas: {item.dueDateStr}
                      </div>
                    </div>
                  </div>
                  {item.courseWorkLink && (
                    <a
                      href={item.courseWorkLink}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center space-x-1 px-3 py-1 text-xs font-bold bg-[#FFC800] hover:bg-amber-400 text-slate-950 rounded-lg transition-colors shadow-2xs border border-amber-400"
                    >
                      <span>Buka Tugas</span>
                      <ExternalLink className="w-3 h-3" />
                    </a>
                  )}
                </div>

                {/* Students waiting list */}
                <div className="bg-white rounded-xl p-3 border border-slate-200">
                  <div className="text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-2 flex items-center justify-between">
                    <span>Siswa Menunggu Nilai ({item.ungradedCount}):</span>
                    <span className="text-rose-600 font-bold bg-rose-50 px-2 py-0.5 rounded border border-rose-200 text-[10px]">
                      Perlu Grading
                    </span>
                  </div>
                  <div className="space-y-1.5 max-h-36 overflow-y-auto pr-1">
                    {item.ungradedStudents.map((st, sIdx) => (
                      <div
                        key={st.studentId || sIdx}
                        className="flex items-center justify-between text-xs py-1.5 px-2.5 rounded-lg bg-slate-50 border border-slate-200/60"
                      >
                        <div className="flex items-center space-x-2">
                          <User className="w-3.5 h-3.5 text-slate-400" />
                          <span className="font-semibold text-slate-800">{st.studentName}</span>
                          {st.studentEmail && (
                            <span className="text-[11px] text-slate-400">({st.studentEmail})</span>
                          )}
                        </div>
                        {st.submissionLink && (
                          <a
                            href={st.submissionLink}
                            target="_blank"
                            rel="noreferrer"
                            className="text-amber-700 hover:text-amber-800 font-bold text-xs flex items-center space-x-0.5"
                          >
                            <span>Nilai</span>
                            <ExternalLink className="w-3 h-3" />
                          </a>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Modal Footer */}
        <div className="p-4 bg-slate-50 border-t border-slate-100 flex justify-end">
          <button
            id="btn-close-teacher-detail"
            onClick={onClose}
            className="px-4 py-2 bg-white hover:bg-slate-100 text-slate-700 text-xs font-bold rounded-xl border border-slate-200 shadow-2xs transition-colors cursor-pointer"
          >
            Tutup
          </button>
        </div>
      </div>
    </div>
  );
};
