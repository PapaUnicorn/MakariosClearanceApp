import React from 'react';
import { RefreshCw, BookOpen } from 'lucide-react';
import { SyncProgressState } from '../types';

interface LoadingProgressProps {
  progress: SyncProgressState;
}

export const LoadingProgress: React.FC<LoadingProgressProps> = ({ progress }) => {
  const percentage =
    progress.totalCourses > 0
      ? Math.min(100, Math.round((progress.currentCourseIndex / progress.totalCourses) * 100))
      : 0;

  return (
    <div id="sync-progress-overlay" className="bg-white border border-slate-200 rounded-2xl p-6 sm:p-7 max-w-xl mx-auto my-6 shadow-xs">
      <div className="flex items-center space-x-3 mb-4">
        <div className="p-2.5 bg-blue-50 text-blue-600 rounded-xl border border-blue-200">
          <RefreshCw className="w-5 h-5 animate-spin" />
        </div>
        <div>
          <h3 className="text-sm font-bold text-slate-900">Menyinkronkan Google Classroom</h3>
          <p className="text-xs text-slate-500">
            Mengambil data kelas, daftar siswa, penugasan, dan status submisi...
          </p>
        </div>
      </div>

      {/* Progress Bar */}
      <div className="w-full bg-slate-100 rounded-full h-2.5 mb-2.5 overflow-hidden">
        <div
          className="bg-blue-600 h-2.5 rounded-full transition-all duration-300 ease-out"
          style={{ width: `${percentage}%` }}
        />
      </div>

      <div className="flex justify-between items-center text-xs text-slate-500 font-semibold mb-3">
        <span>
          {progress.totalCourses > 0
            ? `Memproses Kelas ${progress.currentCourseIndex} dari ${progress.totalCourses}`
            : 'Menghubungkan ke API...'}
        </span>
        <span className="font-bold text-blue-600">{percentage}%</span>
      </div>

      {/* Step message */}
      <div className="bg-slate-50 rounded-xl p-3 border border-slate-200/80 flex items-start space-x-2.5">
        <BookOpen className="w-4 h-4 text-slate-400 mt-0.5 shrink-0" />
        <div className="text-xs text-slate-600">
          <span className="font-bold text-slate-800">Aktivitas:</span>{' '}
          {progress.stepMessage || 'Memproses data...'}
        </div>
      </div>
    </div>
  );
};
