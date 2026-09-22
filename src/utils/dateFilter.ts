import { StudentTaskItem } from '../types';

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

