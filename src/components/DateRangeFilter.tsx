import React from 'react';
import { Calendar, X, Clock } from 'lucide-react';
import { formatIndonesianDateStr } from '../utils/dateFilter';

interface DateRangeFilterProps {
  idPrefix?: string;
  startDate: string;
  endDate: string;
  onChangeStartDate: (date: string) => void;
  onChangeEndDate: (date: string) => void;
  onReset: () => void;
  className?: string;
  compact?: boolean;
}

export const DateRangeFilter: React.FC<DateRangeFilterProps> = ({
  idPrefix = 'date-filter',
  startDate,
  endDate,
  onChangeStartDate,
  onChangeEndDate,
  onReset,
  className = '',
  compact = false,
}) => {
  const isRangeActive = Boolean(startDate || endDate);

  // Helper to format today's date in YYYY-MM-DD
  const formatISO = (d: Date) => {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
  };

  // Preset handlers
  const handleSetToday = () => {
    const today = formatISO(new Date());
    onChangeStartDate(today);
    onChangeEndDate(today);
  };

  const handleSetLast7Days = () => {
    const now = new Date();
    const past = new Date();
    past.setDate(now.getDate() - 7);
    onChangeStartDate(formatISO(past));
    onChangeEndDate(formatISO(now));
  };

  const handleSetLast30Days = () => {
    const now = new Date();
    const past = new Date();
    past.setDate(now.getDate() - 30);
    onChangeStartDate(formatISO(past));
    onChangeEndDate(formatISO(now));
  };

  const handleSetThisMonth = () => {
    const now = new Date();
    const firstDay = new Date(now.getFullYear(), now.getMonth(), 1);
    const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0);
    onChangeStartDate(formatISO(firstDay));
    onChangeEndDate(formatISO(lastDay));
  };

  return (
    <div className={`flex flex-col space-y-1.5 ${className}`}>
      {/* Header Label & Range Status */}
      <div className="flex items-center justify-between">
        <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider flex items-center space-x-1">
          <Calendar className="w-3.5 h-3.5 text-amber-500" />
          <span>Rentang Waktu Tugas</span>
        </label>
        {isRangeActive && (
          <span className="text-[10px] text-amber-700 font-extrabold normal-case bg-amber-100 px-1.5 py-0.2 rounded border border-amber-300">
            Aktif
          </span>
        )}
      </div>

      {/* Inputs for Start Date and End Date */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-1.5">
        {/* Start Date */}
        <div className="relative flex-1 min-w-[130px]">
          <div className="absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none text-[10px] font-bold text-slate-400">
            Dari:
          </div>
          <input
            id={`${idPrefix}-start-date`}
            type="date"
            value={startDate}
            onChange={(e) => onChangeStartDate(e.target.value)}
            className="w-full bg-slate-50 border border-slate-200 rounded-lg pl-11 pr-2 py-1.5 text-xs text-slate-800 font-semibold focus:outline-none focus:border-amber-500 focus:bg-white shadow-2xs cursor-pointer transition-colors"
            title="Pilih tanggal mulai"
          />
          {startDate && (
            <button
              type="button"
              onClick={() => onChangeStartDate('')}
              className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-rose-600 cursor-pointer p-0.5"
              title="Hapus tanggal mulai"
            >
              <X className="w-3 h-3" />
            </button>
          )}
        </div>

        <span className="text-xs font-bold text-slate-400 self-center hidden sm:inline">-</span>

        {/* End Date */}
        <div className="relative flex-1 min-w-[130px]">
          <div className="absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none text-[10px] font-bold text-slate-400">
            Sampai:
          </div>
          <input
            id={`${idPrefix}-end-date`}
            type="date"
            value={endDate}
            min={startDate || undefined}
            onChange={(e) => onChangeEndDate(e.target.value)}
            className="w-full bg-slate-50 border border-slate-200 rounded-lg pl-14 pr-2 py-1.5 text-xs text-slate-800 font-semibold focus:outline-none focus:border-amber-500 focus:bg-white shadow-2xs cursor-pointer transition-colors"
            title="Pilih tanggal akhir"
          />
          {endDate && (
            <button
              type="button"
              onClick={() => onChangeEndDate('')}
              className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-rose-600 cursor-pointer p-0.5"
              title="Hapus tanggal akhir"
            >
              <X className="w-3 h-3" />
            </button>
          )}
        </div>

        {/* Clear both dates button if active */}
        {isRangeActive && (
          <button
            type="button"
            onClick={onReset}
            className="p-1.5 rounded-lg bg-rose-50 text-rose-600 hover:bg-rose-100 border border-rose-200 text-xs font-bold shrink-0 transition-colors cursor-pointer"
            title="Reset rentang waktu"
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* Quick Presets */}
      {!compact && (
        <div className="flex flex-wrap items-center gap-1 pt-0.5">
          <span className="text-[10px] text-slate-400 font-semibold mr-0.5">Cepat:</span>
          <button
            type="button"
            onClick={handleSetToday}
            className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-slate-100 hover:bg-amber-100 text-slate-600 hover:text-amber-900 border border-slate-200 transition-colors cursor-pointer"
          >
            Hari Ini
          </button>
          <button
            type="button"
            onClick={handleSetLast7Days}
            className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-slate-100 hover:bg-amber-100 text-slate-600 hover:text-amber-900 border border-slate-200 transition-colors cursor-pointer"
          >
            7 Hari Terakhir
          </button>
          <button
            type="button"
            onClick={handleSetLast30Days}
            className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-slate-100 hover:bg-amber-100 text-slate-600 hover:text-amber-900 border border-slate-200 transition-colors cursor-pointer"
          >
            30 Hari Terakhir
          </button>
          <button
            type="button"
            onClick={handleSetThisMonth}
            className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-slate-100 hover:bg-amber-100 text-slate-600 hover:text-amber-900 border border-slate-200 transition-colors cursor-pointer"
          >
            Bulan Ini
          </button>
        </div>
      )}
    </div>
  );
};
