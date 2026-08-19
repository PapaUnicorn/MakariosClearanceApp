import {
  ClassroomCourse,
  ClassroomTeacher,
  ClassroomStudent,
  ClassroomCourseWork,
  ClassroomSubmission,
  StudentClearanceRecord,
  TeacherClearanceRecord,
  TeacherSummaryRecord,
  TeacherUngradedTaskItem,
  StudentTaskItem,
  TaskStatusType,
} from '../types';

const BASE_URL = 'https://classroom.googleapis.com/v1';

async function fetchGoogleApi<T>(url: string, token: string): Promise<T> {
  const response = await fetch(url, {
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: 'application/json',
    },
  });

  if (!response.ok) {
    if (response.status === 401) {
      throw new Error('Sesi Google telah kedaluwarsa. Silakan login kembali.');
    }
    if (response.status === 403) {
      throw new Error('Izin akses Google Classroom ditolak. Pastikan akun memiliki hak akses ke Classroom.');
    }
    const errorData = await response.json().catch(() => ({}));
    throw new Error(
      errorData?.error?.message || `Gagal mengambil data dari Google Classroom (${response.status})`
    );
  }

  return response.json();
}

/**
 * Fetch authenticated user's profile from Google Classroom
 */
export async function getUserProfile(token: string): Promise<{ id: string; name?: { fullName?: string }; emailAddress?: string; photoUrl?: string } | null> {
  try {
    const data = await fetchGoogleApi<{ id: string; name?: { fullName?: string }; emailAddress?: string; photoUrl?: string }>(
      `${BASE_URL}/userProfiles/me`,
      token
    );
    return data;
  } catch (err) {
    console.warn('Gagal mengambil user profile me:', err);
    return null;
  }
}

/**
 * Fetch all active courses for the authenticated user
 */
export async function getCourses(token: string): Promise<ClassroomCourse[]> {
  const courses: ClassroomCourse[] = [];
  const courseIdSet = new Set<string>();

  // 1. Fetch accessible courses
  try {
    let pageToken: string | undefined = undefined;
    do {
      const query = new URLSearchParams({
        pageSize: '50',
        courseStates: 'ACTIVE',
      });
      if (pageToken) query.set('pageToken', pageToken);

      const data: { courses?: ClassroomCourse[]; nextPageToken?: string } = await fetchGoogleApi(
        `${BASE_URL}/courses?${query.toString()}`,
        token
      );

      if (data.courses && Array.isArray(data.courses)) {
        data.courses.forEach((c) => {
          if (!courseIdSet.has(c.id)) {
            courseIdSet.add(c.id);
            courses.push(c);
          }
        });
      }
      pageToken = data.nextPageToken;
    } while (pageToken);
  } catch (err) {
    console.warn('Error fetching courses list, attempting teacher/student queries:', err);
  }

  // 2. If no courses found, try teacherId=me & studentId=me
  if (courses.length === 0) {
    for (const roleParam of [{ studentId: 'me' }, { teacherId: 'me' }]) {
      try {
        let pageToken: string | undefined = undefined;
        do {
          const query = new URLSearchParams({
            pageSize: '50',
            courseStates: 'ACTIVE',
            ...roleParam,
          });
          if (pageToken) query.set('pageToken', pageToken);

          const data: { courses?: ClassroomCourse[]; nextPageToken?: string } = await fetchGoogleApi(
            `${BASE_URL}/courses?${query.toString()}`,
            token
          );

          if (data.courses && Array.isArray(data.courses)) {
            data.courses.forEach((c) => {
              if (!courseIdSet.has(c.id)) {
                courseIdSet.add(c.id);
                courses.push(c);
              }
            });
          }
          pageToken = data.nextPageToken;
        } while (pageToken);
      } catch (e) {
        console.warn(`Error fetching courses with ${JSON.stringify(roleParam)}:`, e);
      }
    }
  }

  return courses;
}

/**
 * Fetch teachers for a course
 */
export async function getCourseTeachers(courseId: string, token: string): Promise<ClassroomTeacher[]> {
  try {
    const data: { teachers?: ClassroomTeacher[] } = await fetchGoogleApi(
      `${BASE_URL}/courses/${courseId}/teachers`,
      token
    );
    return data.teachers || [];
  } catch (err) {
    console.warn(`Gagal mengambil data guru untuk kelas ${courseId}`, err);
    return [];
  }
}

/**
 * Fetch students for a course
 */
export async function getCourseStudents(courseId: string, token: string): Promise<ClassroomStudent[]> {
  try {
    const students: ClassroomStudent[] = [];
    let pageToken: string | undefined = undefined;

    do {
      const query = new URLSearchParams({ pageSize: '100' });
      if (pageToken) query.set('pageToken', pageToken);

      const data: { students?: ClassroomStudent[]; nextPageToken?: string } = await fetchGoogleApi(
        `${BASE_URL}/courses/${courseId}/students?${query.toString()}`,
        token
      );

      if (data.students && Array.isArray(data.students)) {
        students.push(...data.students);
      }
      pageToken = data.nextPageToken;
    } while (pageToken);

    return students;
  } catch (err) {
    console.warn(`Gagal mengambil data siswa untuk kelas ${courseId}`, err);
    return [];
  }
}

/**
 * Fetch coursework (assignments, questions) for a course
 */
export async function getCourseWork(courseId: string, token: string): Promise<ClassroomCourseWork[]> {
  try {
    const courseWorks: ClassroomCourseWork[] = [];
    let pageToken: string | undefined = undefined;

    do {
      const query = new URLSearchParams({
        pageSize: '100',
        courseWorkStates: 'PUBLISHED',
      });
      if (pageToken) query.set('pageToken', pageToken);

      const data: { courseWork?: ClassroomCourseWork[]; nextPageToken?: string } = await fetchGoogleApi(
        `${BASE_URL}/courses/${courseId}/courseWork?${query.toString()}`,
        token
      );

      if (data.courseWork && Array.isArray(data.courseWork)) {
        courseWorks.push(...data.courseWork);
      }
      pageToken = data.nextPageToken;
    } while (pageToken);

    return courseWorks;
  } catch (err) {
    console.warn(`Gagal mengambil daftar tugas untuk kelas ${courseId}`, err);
    return [];
  }
}

/**
 * Fetch student submissions for a course
 */
export async function getCourseSubmissions(
  courseId: string,
  token: string
): Promise<ClassroomSubmission[]> {
  const submissions: ClassroomSubmission[] = [];

  // Attempt 1: Teacher/all submissions query
  try {
    let pageToken: string | undefined = undefined;
    do {
      const query = new URLSearchParams({ pageSize: '100' });
      if (pageToken) query.set('pageToken', pageToken);

      const data: { studentSubmissions?: ClassroomSubmission[]; nextPageToken?: string } =
        await fetchGoogleApi(
          `${BASE_URL}/courses/${courseId}/courseWork/-/studentSubmissions?${query.toString()}`,
          token
        );

      if (data.studentSubmissions && Array.isArray(data.studentSubmissions)) {
        submissions.push(...data.studentSubmissions);
      }
      pageToken = data.nextPageToken;
    } while (pageToken);

    return submissions;
  } catch (err) {
    console.warn(`Attempting student submissions query (userId=me) for class ${courseId}...`);
  }

  // Attempt 2: Student self submissions query
  try {
    let pageToken: string | undefined = undefined;
    do {
      const query = new URLSearchParams({ pageSize: '100', userId: 'me' });
      if (pageToken) query.set('pageToken', pageToken);

      const data: { studentSubmissions?: ClassroomSubmission[]; nextPageToken?: string } =
        await fetchGoogleApi(
          `${BASE_URL}/courses/${courseId}/courseWork/-/studentSubmissions?${query.toString()}`,
          token
        );

      if (data.studentSubmissions && Array.isArray(data.studentSubmissions)) {
        submissions.push(...data.studentSubmissions);
      }
      pageToken = data.nextPageToken;
    } while (pageToken);

    return submissions;
  } catch (err) {
    console.warn(`Gagal mengambil submissions untuk kelas ${courseId}:`, err);
    return [];
  }
}

function formatDueDate(dueDate?: { year: number; month: number; day: number }, dueTime?: { hours?: number; minutes?: number }): string {
  if (!dueDate || !dueDate.year || !dueDate.month || !dueDate.day) {
    return 'Tanpa batas waktu';
  }
  const d = new Date(dueDate.year, dueDate.month - 1, dueDate.day);
  const dateStr = d.toLocaleDateString('id-ID', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
  if (dueTime && dueTime.hours !== undefined) {
    const hours = String(dueTime.hours).padStart(2, '0');
    const mins = String(dueTime.minutes || 0).padStart(2, '0');
    return `${dateStr} ${hours}:${mins}`;
  }
  return dateStr;
}

/**
 * Orchestrates collecting and aggregating real data directly from Google Classroom API
 */
export async function compileClearanceData(
  token: string,
  onProgress?: (index: number, total: number, courseName: string, step: string) => void
): Promise<{
  studentRecords: StudentClearanceRecord[];
  teacherRecords: TeacherClearanceRecord[];
  teacherSummaryRecords: TeacherSummaryRecord[];
  courses: ClassroomCourse[];
}> {
  if (onProgress) onProgress(0, 1, 'Inisialisasi', 'Mengambil daftar kelas Google Classroom...');

  const [courses, myProfile] = await Promise.all([
    getCourses(token),
    getUserProfile(token),
  ]);

  const studentRecords: StudentClearanceRecord[] = [];
  const teacherRecords: TeacherClearanceRecord[] = [];
  const teacherMap = new Map<string, TeacherSummaryRecord>();

  const totalCourses = courses.length;

  for (let i = 0; i < totalCourses; i++) {
    const course = courses[i];
    const courseDisplayName = course.name || 'Kelas Tanpa Nama';
    const sectionName = course.section || course.room || 'Reguler';

    if (onProgress) {
      onProgress(
        i + 1,
        totalCourses,
        courseDisplayName,
        `Memproses kelas real ${i + 1} dari ${totalCourses}: ${courseDisplayName}`
      );
    }

    // Parallel fetch within the course
    const [teachers, rawStudents, courseWorks, submissions] = await Promise.all([
      getCourseTeachers(course.id, token),
      getCourseStudents(course.id, token),
      getCourseWork(course.id, token),
      getCourseSubmissions(course.id, token),
    ]);

    let students = rawStudents;
    if (students.length === 0 && myProfile) {
      students = [
        {
          courseId: course.id,
          userId: myProfile.id,
          profile: {
            id: myProfile.id,
            name: myProfile.name,
            emailAddress: myProfile.emailAddress,
            photoUrl: myProfile.photoUrl,
          },
        },
      ];
    }

    // Map of student submissions: key = `${userId}_${courseWorkId}`
    const submissionMap = new Map<string, ClassroomSubmission>();
    submissions.forEach((sub) => {
      submissionMap.set(`${sub.userId}_${sub.courseWorkId}`, sub);
    });

    // Map of students by userId
    const studentMap = new Map<string, ClassroomStudent>();
    students.forEach((st) => {
      studentMap.set(st.userId, st);
    });

    // 1. Process Student Clearance Records
    for (const student of students) {
      const studentName = student.profile?.name?.fullName || student.profile?.emailAddress || 'Siswa Tanpa Nama';
      const studentEmail = student.profile?.emailAddress || '';
      const studentPhoto = student.profile?.photoUrl || '';

      const pendingUnsubmittedTasks: StudentTaskItem[] = [];
      const pendingUngradedTasks: StudentTaskItem[] = [];
      const unfinishedTasks: StudentTaskItem[] = [];
      const allTasks: StudentTaskItem[] = [];

      for (const cw of courseWorks) {
        let sub = submissionMap.get(`${student.userId}_${cw.id}`);
        if (!sub && submissions.length > 0) {
          sub = submissions.find((s) => s.courseWorkId === cw.id);
        }

        let status: TaskStatusType = 'NOT_SUBMITTED';
        const subState = sub ? sub.state : 'NEW';

        if (subState === 'RETURNED' || (sub && sub.assignedGrade !== undefined && sub.assignedGrade !== null)) {
          status = 'GRADED';
        } else if (subState === 'TURNED_IN') {
          status = 'WAITING_GRADE';
        } else {
          status = 'NOT_SUBMITTED';
        }

        const taskItem: StudentTaskItem = {
          courseWorkId: cw.id,
          title: cw.title || 'Tugas Tanpa Judul',
          courseId: course.id,
          courseName: courseDisplayName,
          section: sectionName,
          alternateLink: sub?.alternateLink || cw.alternateLink || course.alternateLink,
          dueDateStr: formatDueDate(cw.dueDate, cw.dueTime),
          maxPoints: cw.maxPoints,
          status,
          submissionState: subState,
          assignedGrade: sub?.assignedGrade,
          late: sub?.late,
        };

        allTasks.push(taskItem);

        if (status === 'NOT_SUBMITTED') {
          pendingUnsubmittedTasks.push(taskItem);
          unfinishedTasks.push(taskItem);
        } else if (status === 'WAITING_GRADE') {
          pendingUngradedTasks.push(taskItem);
          unfinishedTasks.push(taskItem);
        }
      }

      const totalTasks = courseWorks.length;
      const completedTasks = allTasks.filter((t) => t.status === 'GRADED').length;
      const isClear = unfinishedTasks.length === 0;
      const clearanceScore = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 100;

      // Calculate overall score for this course
      const gradedTasks = allTasks.filter((t) => t.status === 'GRADED' && t.assignedGrade !== undefined);
      let overallScore: number | undefined = undefined;
      let overallScoreStr = '-';
      if (gradedTasks.length > 0) {
        const totalWeighted = gradedTasks.reduce((acc, t) => {
          const max = t.maxPoints || 100;
          return acc + ((t.assignedGrade || 0) / max) * 100;
        }, 0);
        overallScore = Math.round((totalWeighted / gradedTasks.length) * 10) / 10;
        overallScoreStr = overallScore.toFixed(1);
      }

      studentRecords.push({
        id: `${student.userId}_${course.id}`,
        studentId: student.userId,
        studentName,
        studentEmail,
        studentPhoto,
        className: sectionName,
        courseId: course.id,
        courseName: courseDisplayName,
        courseLink: course.alternateLink,
        totalTasks,
        completedTasks,
        pendingUnsubmittedTasks,
        pendingUngradedTasks,
        unfinishedTasks,
        allTasks,
        overallScore,
        overallScoreStr,
        isClear,
        clearanceScore,
      });
    }

    // 2. Process Teacher Course Breakdown
    const ungradedTasksBreakdown: TeacherClearanceRecord['ungradedTasksBreakdown'] = [];
    const courseUngradedTaskItems: TeacherUngradedTaskItem[] = [];
    let totalUngradedInCourse = 0;
    let totalTurnedInInCourse = 0;

    for (const cw of courseWorks) {
      const ungrSubmissionsForCw = submissions.filter(
        (s) => s.courseWorkId === cw.id && s.state === 'TURNED_IN' && s.assignedGrade === undefined
      );

      const turnedInCount = submissions.filter(
        (s) => s.courseWorkId === cw.id && (s.state === 'TURNED_IN' || s.state === 'RETURNED')
      ).length;
      totalTurnedInInCourse += turnedInCount;

      if (ungrSubmissionsForCw.length > 0) {
        totalUngradedInCourse += ungrSubmissionsForCw.length;

        const ungradedStudents = ungrSubmissionsForCw.map((sub) => {
          const st = studentMap.get(sub.userId);
          return {
            studentId: sub.userId,
            studentName: st?.profile?.name?.fullName || st?.profile?.emailAddress || sub.userId,
            studentEmail: st?.profile?.emailAddress || '',
            submissionLink: sub.alternateLink || cw.alternateLink,
          };
        });

        const ungradedItem = {
          courseId: course.id,
          courseName: courseDisplayName,
          className: sectionName,
          courseWorkId: cw.id,
          courseWorkTitle: cw.title || 'Tugas Tanpa Judul',
          courseWorkLink: cw.alternateLink,
          dueDateStr: formatDueDate(cw.dueDate, cw.dueTime),
          maxPoints: cw.maxPoints,
          ungradedCount: ungrSubmissionsForCw.length,
          ungradedStudents,
        };

        ungradedTasksBreakdown.push(ungradedItem);
        courseUngradedTaskItems.push(ungradedItem);
      }
    }

    const teacherList = teachers.map((t) => ({
      id: t.userId,
      name: t.profile?.name?.fullName || t.profile?.emailAddress || 'Guru Kelas',
      email: t.profile?.emailAddress || '',
      photo: t.profile?.photoUrl,
    }));

    teacherRecords.push({
      id: course.id,
      courseId: course.id,
      courseName: courseDisplayName,
      className: sectionName,
      courseLink: course.alternateLink,
      teachers: teacherList.length > 0 ? teacherList : [{ id: 'unknown', name: 'Belum Ditugaskan', email: '' }],
      totalCourseWork: courseWorks.length,
      totalSubmissions: submissions.length,
      totalTurnedIn: totalTurnedInInCourse,
      totalUngradedSubmissions: totalUngradedInCourse,
      ungradedTasksBreakdown,
      isClear: totalUngradedInCourse === 0,
    });

    // 3. Aggregate into Teacher-Centric Map (grouped by Teacher Name)
    const effectiveTeachers = teacherList.length > 0 ? teacherList : [{ id: `unknown_${course.id}`, name: 'Guru Pengampu', email: '', photo: undefined }];

    for (const t of effectiveTeachers) {
      const key = t.email || t.name;
      let existing = teacherMap.get(key);

      if (!existing) {
        existing = {
          teacherId: t.id,
          teacherName: t.name,
          teacherEmail: t.email,
          teacherPhoto: t.photo,
          assignedCourses: [],
          totalUngradedSubmissions: 0,
          ungradedTasksList: [],
          isClear: true,
        };
        teacherMap.set(key, existing);
      }

      existing.assignedCourses.push({
        courseId: course.id,
        courseName: courseDisplayName,
        className: sectionName,
        courseLink: course.alternateLink,
        totalTasks: courseWorks.length,
      });

      existing.totalUngradedSubmissions += totalUngradedInCourse;
      existing.ungradedTasksList.push(...courseUngradedTaskItems);
      existing.isClear = existing.totalUngradedSubmissions === 0;
    }
  }

  const teacherSummaryRecords = Array.from(teacherMap.values()).sort((a, b) => {
    // Sort teachers with pending grading first, then by name
    if (b.totalUngradedSubmissions !== a.totalUngradedSubmissions) {
      return b.totalUngradedSubmissions - a.totalUngradedSubmissions;
    }
    return a.teacherName.localeCompare(b.teacherName);
  });

  return {
    studentRecords,
    teacherRecords,
    teacherSummaryRecords,
    courses,
  };
}
