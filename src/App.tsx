import React, { useState, useEffect, useCallback } from 'react';
import { User } from 'firebase/auth';
import {
  initAuth,
  googleSignIn,
  logout,
} from './services/firebase';
import { compileClearanceData } from './services/classroom';
import {
  StudentClearanceRecord,
  TeacherClearanceRecord,
  TeacherSummaryRecord,
  ClassroomCourse,
  SyncProgressState,
} from './types';
import { Navbar } from './components/Navbar';
import { LoginScreen } from './components/LoginScreen';
import { LoadingProgress } from './components/LoadingProgress';
import { StudentClearanceTable } from './components/StudentClearanceTable';
import { TeacherClearanceTable } from './components/TeacherClearanceTable';
import { SummaryStats } from './components/SummaryStats';
import { StudentDetailModal } from './components/StudentDetailModal';
import { TeacherDetailModal } from './components/TeacherDetailModal';
import { AlertCircle, RefreshCw, GraduationCap } from 'lucide-react';

export default function App() {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isAuthChecking, setIsAuthChecking] = useState(true);
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const [loginError, setLoginError] = useState<string | null>(null);
  const [lastSyncTime, setLastSyncTime] = useState<string>('');

  // Clearance Data
  const [studentRecords, setStudentRecords] = useState<StudentClearanceRecord[]>([]);
  const [teacherRecords, setTeacherRecords] = useState<TeacherClearanceRecord[]>([]);
  const [teacherSummaryRecords, setTeacherSummaryRecords] = useState<TeacherSummaryRecord[]>([]);
  const [courses, setCourses] = useState<ClassroomCourse[]>([]);

  // Navigation & Modals
  const [activeTab, setActiveTab] = useState<'students' | 'teachers' | 'stats'>('students');
  const [selectedStudentRecord, setSelectedStudentRecord] = useState<StudentClearanceRecord | null>(null);
  const [selectedTeacherRecord, setSelectedTeacherRecord] = useState<TeacherSummaryRecord | null>(null);

  // Sync state
  const [syncProgress, setSyncProgress] = useState<SyncProgressState>({
    isSyncing: false,
    totalCourses: 0,
    currentCourseIndex: 0,
    currentCourseName: '',
    stepMessage: '',
  });
  const [syncError, setSyncError] = useState<string | null>(null);

  // Listen to Firebase Auth state
  useEffect(() => {
    const unsubscribe = initAuth(
      (currentUser, accessToken) => {
        setUser(currentUser);
        setToken(accessToken);
        setIsAuthChecking(false);
      },
      () => {
        setUser(null);
        setToken(null);
        setIsAuthChecking(false);
      }
    );
    return () => unsubscribe();
  }, []);

  // Fetch Classroom Data
  const loadClassroomData = useCallback(async (authToken: string) => {
    setSyncError(null);
    setSyncProgress({
      isSyncing: true,
      totalCourses: 0,
      currentCourseIndex: 0,
      currentCourseName: '',
      stepMessage: 'Menghubungi Google Classroom API...',
    });

    try {
      const data = await compileClearanceData(authToken, (idx, total, courseName, step) => {
        setSyncProgress({
          isSyncing: true,
          totalCourses: total,
          currentCourseIndex: idx,
          currentCourseName: courseName,
          stepMessage: step,
        });
      });

      setStudentRecords(data.studentRecords);
      setTeacherRecords(data.teacherRecords);
      setTeacherSummaryRecords(data.teacherSummaryRecords);
      setCourses(data.courses);
      const now = new Date();
      setLastSyncTime(
        `Hari ini, ${now.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}`
      );
    } catch (err: any) {
      console.error('Error fetching Google Classroom data:', err);
      setSyncError(err.message || 'Gagal memuat data dari Google Classroom.');
    } finally {
      setSyncProgress((prev) => ({ ...prev, isSyncing: false }));
    }
  }, []);

  // Trigger load whenever token changes
  useEffect(() => {
    if (token) {
      loadClassroomData(token);
    }
  }, [token, loadClassroomData]);

  // Handle Login
  const handleLogin = async () => {
    setIsLoggingIn(true);
    setLoginError(null);
    try {
      const res = await googleSignIn();
      if (res) {
        setUser(res.user);
        setToken(res.accessToken);
      }
    } catch (err: any) {
      console.error('Login failed:', err);
      setLoginError(err.message || 'Login dengan Google gagal. Silakan coba lagi.');
    } finally {
      setIsLoggingIn(false);
    }
  };

  // Handle Logout
  const handleLogout = async () => {
    await logout();
    setUser(null);
    setToken(null);
    setStudentRecords([]);
    setTeacherRecords([]);
    setTeacherSummaryRecords([]);
    setCourses([]);
    setSelectedStudentRecord(null);
    setSelectedTeacherRecord(null);
  };

  // Handle Refresh Data
  const handleRefresh = () => {
    if (token) {
      loadClassroomData(token);
    }
  };

  // If initial auth check in progress
  if (isAuthChecking) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center text-slate-700">
        <div className="w-10 h-10 border-3 border-amber-500 border-t-transparent rounded-full animate-spin mb-3" />
        <div className="text-xs font-bold uppercase tracking-wider text-slate-500">Memeriksa Sesi Google...</div>
      </div>
    );
  }

  // If not logged in
  if (!user || !token) {
    return <LoginScreen onLogin={handleLogin} isLoading={isLoggingIn} error={loginError} />;
  }

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 flex flex-col font-sans">
      {/* App Header & Bento Navbar */}
      <Navbar
        user={user}
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        onRefresh={handleRefresh}
        onLogout={handleLogout}
        isSyncing={syncProgress.isSyncing}
        totalStudentsCount={studentRecords.length}
        totalTeachersCount={teacherSummaryRecords.length}
      />

      {/* Main Container */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-5 sm:py-6">
        {/* Bento Top Banner (Google Classroom Sync Bar) with Maybank Theme */}
        {!syncProgress.isSyncing && courses.length > 0 && (
          <div className="mb-5 bg-slate-900 border border-amber-400/40 rounded-2xl p-4 sm:p-5 text-white shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <div className="flex items-center space-x-2">
                <span className="inline-block w-2.5 h-2.5 rounded-full bg-[#FFC800] animate-pulse" />
                <p className="text-xs font-medium text-amber-200">Tersinkronisasi dengan Google Classroom</p>
              </div>
              <p className="text-base sm:text-lg font-black mt-0.5 text-white">
                {courses.length} Kelas Aktif • {teacherSummaryRecords.length} Guru • {lastSyncTime || 'Baru Saja'}
              </p>
            </div>
            <button
              onClick={handleRefresh}
              className="inline-flex items-center justify-center space-x-1.5 bg-[#FFC800] hover:bg-amber-400 text-slate-950 active:scale-95 px-4 py-2 rounded-xl font-black text-xs transition-all shrink-0 cursor-pointer shadow-xs"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>Refresh Data Manual</span>
            </button>
          </div>
        )}

        {/* Sync Progress Indicator */}
        {syncProgress.isSyncing && <LoadingProgress progress={syncProgress} />}

        {/* Sync Error Notice */}
        {syncError && !syncProgress.isSyncing && (
          <div className="mb-5 p-4 bg-rose-50 border border-rose-200 rounded-2xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-xs">
            <div className="flex items-start space-x-3">
              <AlertCircle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
              <div>
                <h4 className="text-xs font-bold text-rose-900">Terjadi Kesalahan Saat Mengambil Data</h4>
                <p className="text-xs text-rose-700 mt-0.5">{syncError}</p>
              </div>
            </div>
            <button
              onClick={handleRefresh}
              className="inline-flex items-center space-x-1.5 px-3 py-1.5 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-bold shrink-0 transition-colors shadow-2xs cursor-pointer"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>Coba Lagi</span>
            </button>
          </div>
        )}

        {/* Empty courses state */}
        {!syncProgress.isSyncing && !syncError && courses.length === 0 && (
          <div className="bg-white border border-amber-200 rounded-2xl p-10 text-center max-w-lg mx-auto shadow-xs my-8">
            <div className="w-12 h-12 rounded-2xl bg-amber-100 text-slate-950 flex items-center justify-center mx-auto mb-3 border border-amber-300">
              <GraduationCap className="w-6 h-6" />
            </div>
            <h3 className="text-base font-bold text-slate-900 mb-1">Tidak Ada Kelas Google Classroom</h3>
            <p className="text-xs text-slate-500 mb-5">
              Akun Google Anda ({user.email}) belum memiliki atau terdaftar di kelas aktif Google Classroom.
            </p>
            <button
              onClick={handleRefresh}
              className="inline-flex items-center space-x-2 px-4 py-2 bg-[#FFC800] hover:bg-amber-400 text-slate-950 text-xs font-black rounded-xl transition-all shadow-xs cursor-pointer border border-amber-400"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>Muat Ulang Data</span>
            </button>
          </div>
        )}

        {/* Tab Contents */}
        {!syncProgress.isSyncing && courses.length > 0 && (
          <div>
            {activeTab === 'students' && (
              <StudentClearanceTable
                records={studentRecords}
                onSelectStudent={(record) => setSelectedStudentRecord(record)}
              />
            )}

            {activeTab === 'teachers' && (
              <TeacherClearanceTable
                records={teacherSummaryRecords}
                onSelectTeacherRecord={(record) => setSelectedTeacherRecord(record)}
              />
            )}

            {activeTab === 'stats' && (
              <SummaryStats
                studentRecords={studentRecords}
                teacherRecords={teacherRecords}
                teacherSummaryRecords={teacherSummaryRecords}
              />
            )}
          </div>
        )}
      </main>

      {/* Modals */}
      <StudentDetailModal
        record={selectedStudentRecord}
        allRecords={studentRecords}
        onClose={() => setSelectedStudentRecord(null)}
      />

      <TeacherDetailModal
        record={selectedTeacherRecord}
        onClose={() => setSelectedTeacherRecord(null)}
      />
    </div>
  );
}
