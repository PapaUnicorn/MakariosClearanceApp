import React, { useState } from 'react';
import {
  GraduationCap,
  ShieldCheck,
  CheckCircle,
  FileSpreadsheet,
  Sparkles,
  BookOpen,
  AlertTriangle,
  Copy,
  Check,
  ExternalLink,
  Globe,
} from 'lucide-react';

interface LoginScreenProps {
  onLogin: () => void;
  isLoading: boolean;
  error?: string | null;
}

export const LoginScreen: React.FC<LoginScreenProps> = ({ onLogin, isLoading, error }) => {
  const [copied, setCopied] = useState(false);
  const currentHostname = typeof window !== 'undefined' ? window.location.hostname : '';
  const isUnauthorizedDomain =
    error && (error.includes('unauthorized-domain') || error.includes('auth/unauthorized-domain'));

  const handleCopyDomain = () => {
    if (currentHostname) {
      navigator.clipboard.writeText(currentHostname);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    }
  };

  return (
    <div id="login-container" className="min-h-screen bg-slate-50 flex flex-col justify-center items-center px-4 sm:px-6 lg:px-8 py-10">
      <div className="w-full max-w-lg bg-white border border-amber-300 rounded-3xl p-6 sm:p-8 shadow-sm relative overflow-hidden">
        {/* Header Branding with Maybank Yellow */}
        <div className="text-center relative z-10 mb-6">
          <div className="mx-auto w-14 h-14 bg-[#FFC800] border border-amber-400 rounded-2xl flex items-center justify-center text-slate-950 font-black text-2xl shadow-sm mb-4">
            M
          </div>
          <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-slate-900 mb-2">
            Makarios <span className="text-amber-500">Clearance</span>
          </h1>
          <p className="text-xs sm:text-sm text-slate-600 font-medium">
            Sistem monitoring kelulusan administrasi tugas siswa & grading guru berbasis Google Classroom.
          </p>
        </div>

        {/* Detailed Unauthorized Domain Helper */}
        {isUnauthorizedDomain ? (
          <div className="mb-6 p-4 bg-amber-50/80 border border-amber-300 rounded-2xl text-slate-800 text-xs shadow-xs space-y-3">
            <div className="flex items-start space-x-2.5">
              <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
              <div>
                <h3 className="font-black text-slate-900 text-sm">
                  Domain Belum Diizinkan di Firebase (auth/unauthorized-domain)
                </h3>
                <p className="text-slate-600 mt-1 leading-relaxed">
                  Firebase Authentication memblokir login popup demi keamanan karena alamat domain web ini belum terdaftar di whitelist <strong>Authorized Domains</strong>.
                </p>
              </div>
            </div>

            {/* Current Hostname Display & Copy */}
            <div className="bg-white border border-amber-200 rounded-xl p-2.5 flex items-center justify-between gap-2">
              <div className="flex items-center space-x-2 truncate">
                <Globe className="w-4 h-4 text-amber-600 shrink-0" />
                <span className="font-mono text-xs font-bold text-slate-800 select-all truncate">
                  {currentHostname || 'Domain saat ini'}
                </span>
              </div>
              <button
                type="button"
                onClick={handleCopyDomain}
                className="inline-flex items-center space-x-1 px-2.5 py-1 rounded-lg bg-amber-100 hover:bg-amber-200 text-slate-900 font-bold text-[11px] transition-colors shrink-0 cursor-pointer"
                title="Salin domain untuk didaftarkan ke Firebase"
              >
                {copied ? (
                  <>
                    <Check className="w-3.5 h-3.5 text-emerald-600" />
                    <span className="text-emerald-700">Tersalin!</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5 text-slate-700" />
                    <span>Salin Domain</span>
                  </>
                )}
              </button>
            </div>

            {/* Step by step instructions */}
            <div className="bg-amber-100/60 rounded-xl p-3 space-y-1.5 text-slate-700">
              <p className="font-bold text-slate-900 text-[11px] uppercase tracking-wider">
                Cara Mengatasi:
              </p>
              <ol className="list-decimal list-inside space-y-1 text-[11px] leading-relaxed pl-1">
                <li>
                  Buka{' '}
                  <a
                    href="https://console.firebase.google.com/"
                    target="_blank"
                    rel="noreferrer"
                    className="text-amber-800 font-bold underline inline-flex items-center gap-0.5"
                  >
                    Firebase Console <ExternalLink className="w-3 h-3" />
                  </a>{' '}
                  dan pilih project Firebase Anda.
                </li>
                <li>
                  Buka menu <strong>Authentication</strong> &gt; tab <strong>Settings</strong> &gt; <strong>Authorized domains</strong>.
                </li>
                <li>
                  Klik <strong>Add domain</strong>, tempelkan domain yang disalin di atas (<code className="bg-white/80 px-1 py-0.5 rounded font-mono text-[10px]">{currentHostname}</code>), lalu klik <strong>Save</strong>.
                </li>
                <li>Setelah disimpan, coba klik tombol login di bawah kembali.</li>
              </ol>
            </div>
          </div>
        ) : error ? (
          <div className="mb-6 p-3.5 bg-rose-50 border border-rose-200 rounded-xl text-rose-700 text-xs font-medium flex items-start space-x-2">
            <div className="w-1.5 h-1.5 rounded-full bg-rose-500 mt-1.5 shrink-0" />
            <span>{error}</span>
          </div>
        ) : null}

        {/* Features preview (Bento Mini Grid) */}
        <div className="bg-amber-50/50 border border-amber-200/80 rounded-2xl p-4 mb-6 space-y-2.5">
          <div className="text-[11px] font-black text-slate-900 uppercase tracking-widest mb-1">
            Fitur Utama Aplikasi:
          </div>
          <div className="flex items-center space-x-2 text-xs font-semibold text-slate-700">
            <CheckCircle className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>Rekapitulasi otomatis tugas belum selesai & belum dinilai</span>
          </div>
          <div className="flex items-center space-x-2 text-xs font-semibold text-slate-700">
            <CheckCircle className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>Teacher Grading Hub untuk monitoring antrean periksa tugas</span>
          </div>
          <div className="flex items-center space-x-2 text-xs font-semibold text-slate-700">
            <CheckCircle className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>Ekspor rapor kemajuan belajar siswa format Word (.docx) & PDF</span>
          </div>
        </div>

        {/* Sign in with Google Button */}
        <div className="relative z-10">
          <button
            id="btn-google-login"
            onClick={onLogin}
            disabled={isLoading}
            className={`w-full flex items-center justify-center px-4 py-3.5 border border-slate-200 hover:border-amber-400 rounded-xl font-bold text-slate-800 bg-white hover:bg-amber-50/40 transition-all shadow-2xs group cursor-pointer ${
              isLoading ? 'opacity-70 cursor-wait' : 'active:scale-[0.99]'
            }`}
          >
            {isLoading ? (
              <div className="flex items-center space-x-3">
                <div className="w-5 h-5 border-2 border-amber-500 border-t-transparent rounded-full animate-spin" />
                <span className="text-sm font-bold text-slate-800">Menghubungkan ke Google...</span>
              </div>
            ) : (
              <div className="flex items-center space-x-3">
                {/* Official Google 'G' logo SVG */}
                <svg className="w-5 h-5 shrink-0" viewBox="0 0 24 24">
                  <path
                    fill="#4285F4"
                    d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.8-2.4 3.66v3.05h3.88c2.27-2.09 3.66-5.17 3.66-9.15z"
                  />
                  <path
                    fill="#34A853"
                    d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.05c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.1-6.72-4.94H1.24v3.15C3.26 21.36 7.33 24 12 24z"
                  />
                  <path
                    fill="#FBBC05"
                    d="M5.28 14.26c-.25-.72-.38-1.49-.38-2.26s.13-1.54.38-2.26V6.59H1.24C.45 8.16 0 9.97 0 12s.45 3.84 1.24 5.41l4.04-3.15z"
                  />
                  <path
                    fill="#EA4335"
                    d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.33 0 3.26 2.64 1.24 6.59l4.04 3.15c.95-2.84 3.6-4.99 6.72-4.99z"
                  />
                </svg>
                <span className="text-sm font-bold text-slate-900 group-hover:text-amber-900 transition-colors">
                  Masuk dengan Akun Google
                </span>
              </div>
            )}
          </button>
        </div>

        {/* Security footer */}
        <div className="mt-6 pt-4 border-t border-slate-100 text-center">
          <div className="flex items-center justify-center space-x-1.5 text-slate-400 text-xs font-medium">
            <ShieldCheck className="w-3.5 h-3.5 text-amber-600" />
            <span>Koneksi aman langsung ke Google Classroom API</span>
          </div>
        </div>
      </div>
    </div>
  );
};

