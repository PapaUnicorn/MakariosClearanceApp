import { getAccessToken } from './firebase';
import { StudentClearanceRecord, TeacherSummaryRecord, StudentTaskItem } from '../types';

export interface GoogleSheetDatabaseMeta {
  spreadsheetId: string;
  spreadsheetUrl: string;
  title: string;
  lastSyncedAt?: string;
  totalStudentsRecorded?: number;
  totalTasksRecorded?: number;
  totalTeachersRecorded?: number;
}

export interface DriveSpreadsheetItem {
  id: string;
  name: string;
  webViewLink?: string;
  modifiedTime?: string;
}

const STORAGE_KEY_DB_ID = 'clearance_sheets_db_id';
const STORAGE_KEY_DB_META = 'clearance_sheets_db_meta';

export function getSavedDatabaseMeta(): GoogleSheetDatabaseMeta | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_DB_META);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

export function saveDatabaseMeta(meta: GoogleSheetDatabaseMeta | null) {
  if (!meta) {
    localStorage.removeItem(STORAGE_KEY_DB_ID);
    localStorage.removeItem(STORAGE_KEY_DB_META);
  } else {
    localStorage.setItem(STORAGE_KEY_DB_ID, meta.spreadsheetId);
    localStorage.setItem(STORAGE_KEY_DB_META, JSON.stringify(meta));
  }
}

/**
 * Searches user's Google Drive for spreadsheets that can be used or linked as a database.
 */
export async function listUserSpreadsheets(): Promise<DriveSpreadsheetItem[]> {
  const token = await getAccessToken();
  if (!token) throw new Error('Token akses Google tidak tersedia. Silakan login kembali.');

  const query = encodeURIComponent("mimeType = 'application/vnd.google-apps.spreadsheet' and trashed = false");
  const url = `https://www.googleapis.com/drive/v3/files?q=${query}&orderBy=modifiedTime desc&pageSize=25&fields=files(id,name,webViewLink,modifiedTime)`;

  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${token}` },
  });

  if (!res.ok) {
    const errData = await res.json().catch(() => ({}));
    throw new Error(errData.error?.message || `Gagal mengambil daftar spreadsheet dari Google Drive (${res.status})`);
  }

  const data = await res.json();
  return (data.files || []).map((f: any) => ({
    id: f.id,
    name: f.name,
    webViewLink: f.webViewLink || `https://docs.google.com/spreadsheets/d/${f.id}`,
    modifiedTime: f.modifiedTime,
  }));
}

/**
 * Creates a brand new Google Spreadsheet configured as a relational clearance database.
 */
export async function createDatabaseSpreadsheet(title = 'Clearance_System_Database'): Promise<GoogleSheetDatabaseMeta> {
  const token = await getAccessToken();
  if (!token) throw new Error('Token akses Google tidak tersedia. Silakan login kembali.');

  const requestBody = {
    properties: {
      title,
      locale: 'id_ID',
      autoRecalc: 'ON_CHANGE',
    },
    sheets: [
      {
        properties: {
          title: 'Siswa_Clearance_Summary',
          gridProperties: { frozenRowCount: 1 },
          tabColorStyle: { rgbColor: { red: 0.1, green: 0.5, blue: 0.9 } },
        },
      },
      {
        properties: {
          title: 'Detail_Tugas_Siswa',
          gridProperties: { frozenRowCount: 1 },
          tabColorStyle: { rgbColor: { red: 0.95, green: 0.6, blue: 0.0 } },
        },
      },
      {
        properties: {
          title: 'Guru_Clearance_Summary',
          gridProperties: { frozenRowCount: 1 },
          tabColorStyle: { rgbColor: { red: 0.2, green: 0.7, blue: 0.4 } },
        },
      },
      {
        properties: {
          title: 'Metadata_Database',
          gridProperties: { frozenRowCount: 1 },
          tabColorStyle: { rgbColor: { red: 0.5, green: 0.5, blue: 0.5 } },
        },
      },
    ],
  };

  const res = await fetch('https://sheets.googleapis.com/v4/spreadsheets', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(requestBody),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error?.message || `Gagal membuat spreadsheet baru di Google Drive (${res.status})`);
  }

  const data = await res.json();
  const spreadsheetId = data.spreadsheetId;
  const spreadsheetUrl = data.spreadsheetUrl || `https://docs.google.com/spreadsheets/d/${spreadsheetId}`;

  const meta: GoogleSheetDatabaseMeta = {
    spreadsheetId,
    spreadsheetUrl,
    title: data.properties?.title || title,
    lastSyncedAt: undefined,
    totalStudentsRecorded: 0,
    totalTasksRecorded: 0,
    totalTeachersRecorded: 0,
  };

  saveDatabaseMeta(meta);
  return meta;
}

/**
 * Verifies if an existing spreadsheet ID is accessible and contains required tables or can be initialized.
 */
export async function verifyAndSetupSpreadsheet(spreadsheetId: string): Promise<GoogleSheetDatabaseMeta> {
  const token = await getAccessToken();
  if (!token) throw new Error('Token akses Google tidak tersedia.');

  const res = await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}`, {
    headers: { Authorization: `Bearer ${token}` },
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error?.message || `Spreadsheet dengan ID "${spreadsheetId}" tidak ditemukan atau tidak memiliki izin akses.`);
  }

  const data = await res.json();
  const existingSheets: string[] = (data.sheets || []).map((s: any) => s.properties?.title);

  // Check required sheets and add missing ones
  const requiredSheets = ['Siswa_Clearance_Summary', 'Detail_Tugas_Siswa', 'Guru_Clearance_Summary', 'Metadata_Database'];
  const missingSheets = requiredSheets.filter((s) => !existingSheets.includes(s));

  if (missingSheets.length > 0) {
    const requests = missingSheets.map((title) => ({
      addSheet: {
        properties: {
          title,
          gridProperties: { frozenRowCount: 1 },
        },
      },
    }));

    await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}:batchUpdate`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ requests }),
    });
  }

  const meta: GoogleSheetDatabaseMeta = {
    spreadsheetId,
    spreadsheetUrl: data.spreadsheetUrl || `https://docs.google.com/spreadsheets/d/${spreadsheetId}`,
    title: data.properties?.title || 'Clearance Database',
    lastSyncedAt: undefined,
  };

  saveDatabaseMeta(meta);
  return meta;
}

/**
 * Synchronizes and stores all Student and Teacher Clearance records to the connected Google Sheets database.
 */
export async function syncRecordsToGoogleSheets(
  spreadsheetId: string,
  studentRecords: StudentClearanceRecord[],
  teacherRecords: TeacherSummaryRecord[]
): Promise<GoogleSheetDatabaseMeta> {
  const token = await getAccessToken();
  if (!token) throw new Error('Token akses Google tidak tersedia.');

  const nowStr = new Date().toLocaleString('id-ID', {
    dateStyle: 'full',
    timeStyle: 'medium',
  });

  // 1. Prepare Siswa_Clearance_Summary rows
  const siswaHeader = [
    'ID Record',
    'ID Siswa',
    'Nama Siswa',
    'Email Siswa',
    'Kelas',
    'Mata Pelajaran',
    'Status Clearance',
    'Skor Kelulusan (%)',
    'Total Tugas',
    'Tugas Selesai / Dinilai',
    'Tugas Belum Selesai',
    'Missing (Overdue)',
    'Diserahkan Terlambat',
    'Terakhir Sinkron',
  ];

  const siswaRows = studentRecords.map((r) => {
    const overdueCount = r.allTasks.filter((t) => t.status === 'MISSING').length;
    const lateCount = r.allTasks.filter((t) => t.status === 'TURNED_IN_LATE' || t.late).length;
    return [
      r.id,
      r.studentId,
      r.studentName,
      r.studentEmail,
      r.className,
      r.courseName,
      r.isClear ? 'CLEAR (LUNAS)' : 'BELUM CLEAR',
      Math.round(r.clearanceScore || 0),
      r.totalTasks,
      r.completedTasks,
      r.unfinishedTasks.length,
      overdueCount,
      lateCount,
      nowStr,
    ];
  });

  // 2. Prepare Detail_Tugas_Siswa rows
  const detailHeader = [
    'ID Record Siswa',
    'ID Siswa',
    'Nama Siswa',
    'Email Siswa',
    'Kelas',
    'Mata Pelajaran',
    'Judul Tugas',
    'ID Tugas',
    'Status Tugas',
    'Tenggat Waktu',
    'Bulan Deadline',
    'Tahun Deadline',
    'Terlambat',
    'Nilai / Poin',
    'Link Classroom',
    'Terakhir Sinkron',
  ];

  const detailRows: any[][] = [];
  studentRecords.forEach((r) => {
    r.allTasks.forEach((t) => {
      const monthNames = [
        'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
        'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'
      ];
      const monthName = t.dueMonth ? monthNames[t.dueMonth - 1] : '-';
      const scoreStr = t.assignedGrade !== undefined ? `${t.assignedGrade} / ${t.maxPoints || 100}` : '-';

      detailRows.push([
        r.id,
        r.studentId,
        r.studentName,
        r.studentEmail,
        r.className,
        r.courseName,
        t.title,
        t.courseWorkId,
        t.status,
        t.dueDateStr || 'Tanpa Tenggat',
        monthName,
        t.dueYear || '-',
        t.status === 'TURNED_IN_LATE' || t.late ? 'YA' : 'TIDAK',
        scoreStr,
        t.alternateLink || '-',
        nowStr,
      ]);
    });
  });

  // 3. Prepare Guru_Clearance_Summary rows
  const guruHeader = [
    'ID Guru',
    'Nama Guru',
    'Email Guru',
    'Kelas & Mapel Diampu',
    'Status Clearance Guru',
    'Tugas Menunggu Nilai',
    'Total Kelas Diampu',
    'Terakhir Sinkron',
  ];

  const guruRows = teacherRecords.map((g) => {
    const coursesStr = g.assignedCourses.map((c) => `${c.courseName} (${c.className})`).join('; ');
    return [
      g.teacherId,
      g.teacherName,
      g.teacherEmail,
      coursesStr,
      g.isClear ? 'CLEAR (SELESAI MENILAI)' : 'MEMERLUKAN PENILAIAN',
      g.totalUngradedSubmissions,
      g.assignedCourses.length,
      nowStr,
    ];
  });

  // 4. Prepare Metadata_Database rows
  const metaRows = [
    ['PARAMETER SISTEM', 'NILAI / KETERANGAN'],
    ['Nama Database', 'Sistem Monitoring Clearance Siswa & Guru - Google Classroom'],
    ['ID Spreadsheet', spreadsheetId],
    ['Waktu Sinkronisasi Terakhir', nowStr],
    ['Total Baris Siswa (Summary)', studentRecords.length],
    ['Total Baris Detail Tugas Siswa', detailRows.length],
    ['Total Guru Tercatat', teacherRecords.length],
    ['Status Database', 'AKTIF & TERSINKRON'],
  ];

  // First, clear old contents to avoid residual ghost rows
  const clearRanges = [
    'Siswa_Clearance_Summary!A1:Z',
    'Detail_Tugas_Siswa!A1:Z',
    'Guru_Clearance_Summary!A1:Z',
    'Metadata_Database!A1:Z',
  ];

  await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values:batchClear`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ ranges: clearRanges }),
  });

  // Next, batch write updated data with USER_ENTERED formatting
  const batchData = [
    {
      range: 'Siswa_Clearance_Summary!A1',
      values: [siswaHeader, ...siswaRows],
    },
    {
      range: 'Detail_Tugas_Siswa!A1',
      values: [detailHeader, ...detailRows],
    },
    {
      range: 'Guru_Clearance_Summary!A1',
      values: [guruHeader, ...guruRows],
    },
    {
      range: 'Metadata_Database!A1',
      values: metaRows,
    },
  ];

  const updateRes = await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values:batchUpdate`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      valueInputOption: 'USER_ENTERED',
      data: batchData,
    }),
  });

  if (!updateRes.ok) {
    const err = await updateRes.json().catch(() => ({}));
    throw new Error(err.error?.message || `Gagal menulis data ke Google Sheets (${updateRes.status})`);
  }

  // Save new metadata
  const meta: GoogleSheetDatabaseMeta = {
    spreadsheetId,
    spreadsheetUrl: `https://docs.google.com/spreadsheets/d/${spreadsheetId}`,
    title: 'Clearance_System_Database',
    lastSyncedAt: nowStr,
    totalStudentsRecorded: studentRecords.length,
    totalTasksRecorded: detailRows.length,
    totalTeachersRecorded: teacherRecords.length,
  };

  saveDatabaseMeta(meta);
  return meta;
}

/**
 * Loads and reconstructs Student Clearance and Teacher Clearance records from the Google Sheet database.
 */
export async function loadRecordsFromGoogleSheets(spreadsheetId: string): Promise<{
  studentRecords: StudentClearanceRecord[];
  teacherRecords: TeacherSummaryRecord[];
  lastSyncedAt?: string;
}> {
  const token = await getAccessToken();
  if (!token) throw new Error('Token akses Google tidak tersedia.');

  const ranges = [
    'Siswa_Clearance_Summary!A1:N',
    'Detail_Tugas_Siswa!A1:P',
    'Guru_Clearance_Summary!A1:H',
    'Metadata_Database!A1:B',
  ];

  const queryParams = ranges.map((r) => `ranges=${encodeURIComponent(r)}`).join('&');
  const res = await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values:batchGet?${queryParams}`, {
    headers: { Authorization: `Bearer ${token}` },
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error?.message || `Gagal membaca database Google Sheets (${res.status})`);
  }

  const data = await res.json();
  const valueRanges = data.valueRanges || [];

  const siswaValues: any[][] = valueRanges[0]?.values || [];
  const detailValues: any[][] = valueRanges[1]?.values || [];
  const guruValues: any[][] = valueRanges[2]?.values || [];
  const metaValues: any[][] = valueRanges[3]?.values || [];

  let lastSyncedAt: string | undefined;
  for (const row of metaValues) {
    if (row[0] === 'Waktu Sinkronisasi Terakhir') {
      lastSyncedAt = row[1];
    }
  }

  // Parse tasks map by record ID
  const tasksByRecordId: Record<string, StudentTaskItem[]> = {};

  const detailRows = detailValues.slice(1); // skip header
  detailRows.forEach((row) => {
    const [
      recordId,
      _studentId,
      _studentName,
      _studentEmail,
      _className,
      courseName,
      title,
      courseWorkId,
      status,
      dueDateStr,
      _monthName,
      dueYearStr,
      lateStr,
      scoreStr,
      alternateLink,
    ] = row;

    if (!recordId) return;

    let assignedGrade: number | undefined;
    let maxPoints: number | undefined;
    if (scoreStr && scoreStr.includes('/')) {
      const parts = scoreStr.split('/');
      const g = parseFloat(parts[0].trim());
      const m = parseFloat(parts[1].trim());
      if (!isNaN(g)) assignedGrade = g;
      if (!isNaN(m)) maxPoints = m;
    }

    const taskItem: StudentTaskItem = {
      courseWorkId: courseWorkId || `task_${Math.random()}`,
      title: title || 'Tugas Tanpa Judul',
      courseId: '',
      courseName: courseName || '',
      alternateLink: alternateLink !== '-' ? alternateLink : undefined,
      dueDateStr: dueDateStr !== 'Tanpa Tenggat' ? dueDateStr : undefined,
      dueYear: dueYearStr !== '-' ? parseInt(dueYearStr, 10) : undefined,
      status: (status as any) || 'ASSIGNED',
      submissionState: status || 'CREATED',
      assignedGrade,
      maxPoints,
      late: lateStr === 'YA',
    };

    if (!tasksByRecordId[recordId]) {
      tasksByRecordId[recordId] = [];
    }
    tasksByRecordId[recordId].push(taskItem);
  });

  // Reconstruct student records
  const siswaRows = siswaValues.slice(1);
  const studentRecords: StudentClearanceRecord[] = siswaRows.map((row) => {
    const [
      id,
      studentId,
      studentName,
      studentEmail,
      className,
      courseName,
      _clearStatus,
      clearanceScoreVal,
      totalTasksVal,
      completedTasksVal,
    ] = row;

    const allTasks = tasksByRecordId[id] || [];
    const totalTasks = parseInt(totalTasksVal, 10) || allTasks.length;
    const completedTasks = parseInt(completedTasksVal, 10) || allTasks.filter((t) => t.status === 'GRADED').length;
    const pendingUnsubmittedTasks = allTasks.filter((t) => t.status === 'ASSIGNED' || t.status === 'MISSING');
    const pendingUngradedTasks = allTasks.filter((t) => t.status === 'TURNED_IN' || t.status === 'TURNED_IN_LATE');
    const unfinishedTasks = allTasks.filter((t) => t.status !== 'GRADED' && t.status !== 'RETURNED');
    const isClear = unfinishedTasks.length === 0 && totalTasks > 0;
    const clearanceScore = parseFloat(clearanceScoreVal) || (totalTasks > 0 ? (completedTasks / totalTasks) * 100 : 100);

    return {
      id: id || `rec_${studentId}_${className}`,
      studentId: studentId || '',
      studentName: studentName || 'Siswa',
      studentEmail: studentEmail || '',
      className: className || '',
      courseId: '',
      courseName: courseName || '',
      totalTasks,
      completedTasks,
      pendingUnsubmittedTasks,
      pendingUngradedTasks,
      unfinishedTasks,
      allTasks,
      isClear,
      clearanceScore,
    };
  });

  // Reconstruct teacher records
  const guruRows = guruValues.slice(1);
  const teacherRecords: TeacherSummaryRecord[] = guruRows.map((row) => {
    const [
      teacherId,
      teacherName,
      teacherEmail,
      coursesStr,
      clearStatus,
      totalUngradedVal,
    ] = row;

    const assignedCourses: any[] = (coursesStr || '').split(';').map((item: string) => {
      const trimmed = item.trim();
      return {
        courseId: '',
        courseName: trimmed,
        className: '',
        totalTasks: 0,
      };
    });

    const isClear = clearStatus ? clearStatus.includes('CLEAR') : false;
    const totalUngradedSubmissions = parseInt(totalUngradedVal, 10) || 0;

    return {
      teacherId: teacherId || '',
      teacherName: teacherName || '',
      teacherEmail: teacherEmail || '',
      assignedCourses,
      totalUngradedSubmissions,
      ungradedTasksList: [],
      isClear,
    };
  });

  return {
    studentRecords,
    teacherRecords,
    lastSyncedAt,
  };
}
