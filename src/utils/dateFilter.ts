import { StudentTaskItem } from '../types';

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

export const INDONESIAN_MONTH_MAP: Record<string, number> = {
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

export interface TaskDateExtractable {
  dueYear?: number;
  dueMonth?: number;
  dueDay?: number;
  dueDateStr?: string;
  creationTime?: string;
}

/**
 * Returns formatted ISO date string YYYY-MM-DD for a task (based on dueDate, falling back to creationTime)
 */
export function getTaskDateString(task: TaskDateExtractable): string | null {
  if (task.dueYear && task.dueMonth) {
    const day = task.dueDay ? String(task.dueDay).padStart(2, '0') : '01';
    return `${task.dueYear}-${String(task.dueMonth).padStart(2, '0')}-${day}`;
  }

  if (task.dueDateStr) {
    const parsed = parseIndonesianDate(task.dueDateStr);
    if (parsed?.year && parsed?.month) {
      const day = parsed.day ? String(parsed.day).padStart(2, '0') : '01';
      return `${parsed.year}-${String(parsed.month).padStart(2, '0')}-${day}`;
    }
  }

  if (task.creationTime) {
    const cd = new Date(task.creationTime);
    if (!isNaN(cd.getTime())) {
      const y = cd.getFullYear();
      const m = String(cd.getMonth() + 1).padStart(2, '0');
      const d = String(cd.getDate()).padStart(2, '0');
      return `${y}-${m}-${d}`;
    }
  }

  return null;
}

/**
 * Checks whether a task falls within a given [startDate, endDate] range.
 * If neither is specified, returns true.
 * If task has no resolvable date and date range is specified, returns false.
 */
export function isTaskInDateRange(
  task: TaskDateExtractable,
  startDate?: string, // YYYY-MM-DD
  endDate?: string    // YYYY-MM-DD
): boolean {
  if (!startDate && !endDate) return true;

  const taskDateStr = getTaskDateString(task);
  if (!taskDateStr) return false;

  if (startDate && taskDateStr < startDate) {
    return false;
  }
  if (endDate && taskDateStr > endDate) {
    return false;
  }

  return true;
}

/**
 * Format YYYY-MM-DD to Indonesian human readable date "28 Sep 2026" or "28 September 2026"
 */
export function formatIndonesianDateStr(dateStr?: string, shortMonth: boolean = false): string {
  if (!dateStr) return '';
  const parts = dateStr.split('-');
  if (parts.length !== 3) return dateStr;
  const y = parseInt(parts[0], 10);
  const m = parseInt(parts[1], 10);
  const d = parseInt(parts[2], 10);
  if (isNaN(y) || isNaN(m) || isNaN(d)) return dateStr;
  const mName = INDONESIAN_MONTH_NAMES[m - 1] || `Bulan ${m}`;
  return `${d} ${shortMonth ? mName.slice(0, 3) : mName} ${y}`;
}

/**
 * Checks if a task's deadline is on or before a given target year and month.
 * If targetMonth is August (8) of 2026:
 * - Tasks due in August 2026, July 2026, January 2026, or any 2025 date -> INCLUDED (true)
 * - Tasks due in September 2026, October 2026, or 2027 -> EXCLUDED (false)
 * - Tasks with no deadline: check creation date if available (or include if created on/before month)
 */
export function isTaskDueOnOrBeforeMonth(
  task: StudentTaskItem,
  targetYear: number,
  targetMonth: number // 1-12 (1 = Jan, 8 = Aug, 12 = Dec)
): boolean {
  // If task has explicit due date (year and month)
  if (task.dueYear && task.dueMonth) {
    if (task.dueYear < targetYear) return true;
    if (task.dueYear > targetYear) return false;
    // Same year: check month
    return task.dueMonth <= targetMonth;
  }

  // If task has creation time but no due date
  if (task.creationTime) {
    const createdDate = new Date(task.creationTime);
    const cYear = createdDate.getFullYear();
    const cMonth = createdDate.getMonth() + 1; // 1-12
    if (cYear < targetYear) return true;
    if (cYear > targetYear) return false;
    return cMonth <= targetMonth;
  }

  // Fallback: If no date metadata exists at all, include it
  return true;
}

/**
 * Filter an array of tasks so that only tasks that are unsubmitted / missing (Belum Dikumpul / Tidak Ada)
 * and whose deadline is up to the given month/year are included.
 */
export function filterTasksUpToMonth(
  tasks: StudentTaskItem[],
  targetYear: number,
  targetMonth: number,
  onlyNotSubmitted: boolean = true
): StudentTaskItem[] {
  return tasks.filter((t) => {
    // Only include tasks that are unsubmitted / missing
    if (onlyNotSubmitted) {
      const isUnsubmitted =
        t.status === 'MISSING' ||
        t.status === 'ASSIGNED' ||
        t.status === 'RECLAIMED' ||
        t.status === 'NOT_SUBMITTED';
      if (!isUnsubmitted) return false;
    }
    return isTaskDueOnOrBeforeMonth(t, targetYear, targetMonth);
  });
}


