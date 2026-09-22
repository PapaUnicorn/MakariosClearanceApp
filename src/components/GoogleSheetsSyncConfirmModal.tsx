import React from 'react';
import { Table, AlertTriangle, CheckCircle, X, ShieldAlert, ArrowRight } from 'lucide-react';
import { GoogleSheetDatabaseMeta } from '../services/googleSheetsDatabase';

interface GoogleSheetsSyncConfirmModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  isProcessing: boolean;
  meta: GoogleSheetDatabaseMeta | null;
  studentCount: number;
  taskCount: number;
  teacherCount: number;
}

export const GoogleSheetsSyncConfirmModal: React.FC<GoogleSheetsSyncConfirmModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
  isProcessing,
  meta,
  studentCount,
  taskCount,
  teacherCount,
}) => {
  if (!isOpen || !meta) return null;

  return (
    <div
      id="sheets-sync-confirm-modal"
      className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto animate-in fade-in duration-200"
    >
      <div className="bg-white rounded-2xl max-w-lg w-full shadow-2xl border border-amber-200 overflow-hidden">
        {/* Header */}
        <div className="bg-amber-500/10 border-b border-amber-200 px-6 py-4 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-amber-500 text-white flex items-center justify-center shadow-xs">
              <Table className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-extrabold text-slate-900 text-base">Konfirmasi Sinkronisasi Database</h3>
              <p className="text-xs text-slate-500">Google Sheets Clearance Hub</p>
            </div>
          </div>
          <button
            onClick={onClose}
            disabled={isProcessing}
            className="text-slate-400 hover:text-slate-600 p-1.5 rounded-lg hover:bg-slate-100 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-4">
          <div className="bg-amber-50 border border-amber-200 rounded-xl p-3.5 flex items-start space-x-3">
            <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
            <div className="text-xs text-amber-900 space-y-1">
              <p className="font-bold">Pemberitahuan Pembaruan Data Spreadsheet:</p>
              <p>
                Operasi ini akan memperbarui dan menyegarkan lembar kerja database di Google Sheets Anda dengan data terbaru dari Google Classroom.
              </p>
            </div>
          </div>

          {/* Target Spreadsheet details */}
          <div className="border border-slate-200 rounded-xl p-3.5 bg-slate-50/50 space-y-2">
            <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Spreadsheet Tujuan:</div>
            <div className="flex items-center justify-between">
              <span className="font-bold text-sm text-slate-800 truncate mr-2">{meta.title}</span>
              <a
                href={meta.spreadsheetUrl}
                target="_blank"
                rel="noreferrer"
                className="text-xs font-bold text-emerald-700 hover:underline inline-flex items-center space-x-1 shrink-0"
              >
                <span>Buka Sheet</span>
                <ArrowRight className="w-3 h-3" />
              </a>
            </div>
            <div className="text-[11px] text-slate-400 font-mono truncate">ID: {meta.spreadsheetId}</div>
          </div>

          {/* Data to be written breakdown */}
          <div className="space-y-2">
            <div className="text-xs font-bold text-slate-700">Rincian Data yang Akan Ditulis ke Database:</div>
            <div className="grid grid-cols-3 gap-2.5">
              <div className="bg-blue-50 border border-blue-200 rounded-xl p-2.5 text-center">
                <div className="text-lg font-black text-blue-700">{studentCount}</div>
                <div className="text-[11px] font-semibold text-blue-900">Rekap Siswa</div>
                <div className="text-[9px] text-blue-500">Sheet: Siswa_Summary</div>
              </div>
              <div className="bg-amber-50 border border-amber-200 rounded-xl p-2.5 text-center">
                <div className="text-lg font-black text-amber-700">{taskCount}</div>
                <div className="text-[11px] font-semibold text-amber-900">Detail Tugas</div>
                <div className="text-[9px] text-amber-500">Sheet: Detail_Tugas</div>
              </div>
              <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-2.5 text-center">
                <div className="text-lg font-black text-emerald-700">{teacherCount}</div>
                <div className="text-[11px] font-semibold text-emerald-900">Rekap Guru</div>
                <div className="text-[9px] text-emerald-500">Sheet: Guru_Summary</div>
              </div>
            </div>
          </div>

          <div className="text-[11px] text-slate-500 leading-relaxed">
            Data pada sheet terkait akan diselaraskan dengan aman menggunakan API resmi Google Sheets. Pastikan koneksi internet stabil saat proses penulisan berlangsung.
          </div>
        </div>

        {/* Footer Actions */}
        <div className="bg-slate-50 border-t border-slate-200 px-6 py-4 flex items-center justify-end space-x-3">
          <button
            type="button"
            onClick={onClose}
            disabled={isProcessing}
            className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 hover:text-slate-800 hover:bg-slate-200 transition-colors"
          >
            Batal
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={isProcessing}
            className="inline-flex items-center space-x-2 px-5 py-2.5 rounded-xl text-xs font-bold text-white bg-emerald-700 hover:bg-emerald-800 shadow-sm active:scale-95 transition-all disabled:opacity-50 cursor-pointer"
          >
            {isProcessing ? (
              <>
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                <span>Menyimpan ke Sheets...</span>
              </>
            ) : (
              <>
                <CheckCircle className="w-4 h-4" />
                <span>Ya, Simpan & Sinkronkan</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
