import React from 'react';
import { LogOut, RefreshCw, GraduationCap, Users, ShieldCheck, BookOpen } from 'lucide-react';
import { User } from 'firebase/auth';

interface NavbarProps {
  user: User | null;
  activeTab: 'students' | 'teachers' | 'stats';
  setActiveTab: (tab: 'students' | 'teachers' | 'stats') => void;
  onRefresh: () => void;
  onLogout: () => void;
  isSyncing: boolean;
  totalStudentsCount: number;
  totalTeachersCount: number;
}

export const Navbar: React.FC<NavbarProps> = ({
  user,
  activeTab,
  setActiveTab,
  onRefresh,
  onLogout,
  isSyncing,
  totalStudentsCount,
  totalTeachersCount,
}) => {
  return (
    <header id="main-header" className="bg-white border-b border-amber-200 sticky top-0 z-30 shadow-xs">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo & App Title with Maybank Yellow Theme */}
          <div className="flex items-center space-x-3">
            <div className="w-9 h-9 bg-[#FFC800] border border-amber-400 rounded-xl flex items-center justify-center text-slate-950 font-black text-lg shadow-xs">
              M
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <span className="font-black text-lg tracking-tight text-slate-900">
                  Makarios <span className="text-amber-600">Clearance</span>
                </span>
                <span className="hidden md:inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-amber-50 text-amber-900 border border-amber-300">
                  Classroom Hub
                </span>
              </div>
            </div>
          </div>

          {/* Right Action & Profile */}
          <div className="flex items-center space-x-2 sm:space-x-3">
            <button
              id="btn-sync-data"
              onClick={onRefresh}
              disabled={isSyncing}
              className={`inline-flex items-center space-x-1.5 px-3.5 py-1.5 text-xs sm:text-sm font-bold rounded-xl border transition-all ${
                isSyncing
                  ? 'bg-slate-100 text-slate-400 border-slate-200 cursor-not-allowed'
                  : 'bg-amber-50/70 hover:bg-amber-100 text-amber-950 border-amber-300 shadow-2xs active:scale-95'
              }`}
              title="Perbarui data Google Classroom"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isSyncing ? 'animate-spin text-amber-600' : 'text-amber-700'}`} />
              <span className="hidden sm:inline">{isSyncing ? 'Sinkronisasi...' : 'Sinkronkan Data'}</span>
            </button>

            {user && (
              <div className="flex items-center pl-2 border-l border-slate-200 space-x-2">
                <div className="flex items-center gap-2 bg-slate-100 px-2.5 py-1 sm:px-3 sm:py-1.5 rounded-full border border-slate-200">
                  {user.photoURL ? (
                    <img
                      src={user.photoURL}
                      alt={user.displayName || 'Avatar'}
                      className="w-5 h-5 rounded-full border border-white object-cover"
                      referrerPolicy="no-referrer"
                    />
                  ) : (
                    <div className="w-5 h-5 rounded-full bg-[#FFC800] text-slate-950 flex items-center justify-center font-black text-[10px]">
                      {user.displayName?.charAt(0) || user.email?.charAt(0) || 'U'}
                    </div>
                  )}
                  <span className="text-xs font-semibold text-slate-700 max-w-[120px] sm:max-w-[180px] truncate">
                    {user.displayName || user.email}
                  </span>
                </div>

                <button
                  id="btn-logout"
                  onClick={onLogout}
                  className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                  title="Keluar"
                >
                  <LogOut className="w-4 h-4" />
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Tab Navigation (Bento Nav with Maybank Yellow highlights) */}
        <div className="flex space-x-1 sm:space-x-6 border-t border-slate-100 overflow-x-auto scrollbar-none">
          <button
            id="tab-students-btn"
            onClick={() => setActiveTab('students')}
            className={`inline-flex items-center space-x-2 py-3 px-2 sm:px-1 text-xs sm:text-sm font-bold border-b-2 transition-all whitespace-nowrap cursor-pointer ${
              activeTab === 'students'
                ? 'border-amber-500 text-amber-700'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <Users className="w-4 h-4" />
            <span>Student Clearance</span>
            {totalStudentsCount > 0 && (
              <span className={`ml-1.5 px-2 py-0.5 rounded-full text-[10px] font-bold ${
                activeTab === 'students' ? 'bg-[#FFC800] text-slate-950 font-black' : 'bg-slate-100 text-slate-600'
              }`}>
                {totalStudentsCount}
              </span>
            )}
          </button>

          <button
            id="tab-teachers-btn"
            onClick={() => setActiveTab('teachers')}
            className={`inline-flex items-center space-x-2 py-3 px-2 sm:px-1 text-xs sm:text-sm font-bold border-b-2 transition-all whitespace-nowrap cursor-pointer ${
              activeTab === 'teachers'
                ? 'border-amber-500 text-amber-700'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <BookOpen className="w-4 h-4" />
            <span>Teacher Grading Hub</span>
            {totalTeachersCount > 0 && (
              <span className={`ml-1.5 px-2 py-0.5 rounded-full text-[10px] font-bold ${
                activeTab === 'teachers' ? 'bg-[#FFC800] text-slate-950 font-black' : 'bg-slate-100 text-slate-600'
              }`}>
                {totalTeachersCount}
              </span>
            )}
          </button>

          <button
            id="tab-stats-btn"
            onClick={() => setActiveTab('stats')}
            className={`inline-flex items-center space-x-2 py-3 px-2 sm:px-1 text-xs sm:text-sm font-bold border-b-2 transition-all whitespace-nowrap cursor-pointer ${
              activeTab === 'stats'
                ? 'border-amber-500 text-amber-700'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <ShieldCheck className="w-4 h-4" />
            <span>Bento Analytics</span>
          </button>
        </div>
      </div>
    </header>
  );
};
