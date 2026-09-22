import React, { useState, useEffect } from 'react';
import {
  Table,
  CheckCircle,
  X,
  ExternalLink,
  RefreshCw,
  PlusCircle,
  FolderOpen,
  Link2,
  Trash2,
  Download,
  Upload,
  AlertCircle,
  Database,
  Layers,
  FileSpreadsheet,
} from 'lucide-react';
import {
  GoogleSheetDatabaseMeta,
  DriveSpreadsheetItem,
  listUserSpreadsheets,
  createDatabaseSpreadsheet,
  verifyAndSetupSpreadsheet,
  getSavedDatabaseMeta,
  saveDatabaseMeta,
} from '../services/googleSheetsDatabase';

interface GoogleSheetsDatabaseModalProps {
  isOpen: boolean;
  onClose: () => void;
  databaseMeta: GoogleSheetDatabaseMeta | null;
  onDatabaseMetaChange: (meta: GoogleSheetDatabaseMeta | null) => void;
  onOpenSyncConfirm: () => void;
  onLoadFromSheets: () => void;
  isLoadingFromSheets: boolean;
  studentRecordsCount: number;
  taskRecordsCount: number;
  teacherRecordsCount: number;
}

export const GoogleSheetsDatabaseModal: React.FC<GoogleSheetsDatabaseModalProps> = ({
  isOpen,
  onClose,
  databaseMeta,
  onDatabaseMetaChange,
  onOpenSyncConfirm,
  onLoadFromSheets,
  isLoadingFromSheets,
  studentRecordsCount,
  taskRecordsCount,
  teacherRecordsCount,
}) => {
  const [activeSubTab, setActiveSubTab] = useState<'status' | 'create' | 'browse' | 'manual'>('status');
  const [driveSpreadsheets, setDriveSpreadsheets] = useState<DriveSpreadsheetItem[]>([]);
  const [isFetchingDrive, setIsFetchingDrive] = useState(false);
  const [isCreatingNew, setIsCreatingNew] = useState(false);
  const [isVerifyingManual, setIsVerifyingManual] = useState(false);
  const [newDbTitle, setNewDbTitle] = useState('Clearance_Makarios_Database');
  const [manualInput, setManualInput] = useState('');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      setErrorMessage(null);
      setSuccessMessage(null);
      if (!databaseMeta) {
        setActiveSubTab('create');
      } else {
        setActiveSubTab('status');
      }
    }
  }, [isOpen, databaseMeta]);

  // Fetch spreadsheets from Google Drive when browsing
  const handleLoadDriveSpreadsheets = async () => {
    setIsFetchingDrive(true);
    setErrorMessage(null);
    try {
      const items = await listUserSpreadsheets();
      setDriveSpreadsheets(items);
    } catch (err: any) {
      setErrorMessage(err.message || 'Gagal mengambil spreadsheet dari Google Drive');
    } finally {
      setIsFetchingDrive(false);
    }
  };

  const handleCreateNewDatabase = async () => {
    if (!newDbTitle.trim()) {
      setErrorMessage('Judul database tidak boleh kosong');
      return;
    }
    setIsCreatingNew(true);
    setErrorMessage(null);
    setSuccessMessage(null);
    try {
      const created = await createDatabaseSpreadsheet(newDbTitle.trim());
      onDatabaseMetaChange(created);
      setSuccessMessage(`Database spreadsheet "${created.title}" berhasil dibuat di Google Drive Anda!`);
      setActiveSubTab('status');
    } catch (err: any) {
      setErrorMessage(err.message || 'Gagal membuat database baru di Google Sheets');
    } finally {
      setIsCreatingNew(false);
    }
  };

  const handleConnectSpreadsheet = async (spreadsheetId: string) => {
    setErrorMessage(null);
    setSuccessMessage(null);
    try {
      const meta = await verifyAndSetupSpreadsheet(spreadsheetId);
      onDatabaseMetaChange(meta);
      setSuccessMessage(`Spreadsheet "${meta.title}" berhasil dihubungkan sebagai database!`);
      setActiveSubTab('status');
    } catch (err: any) {
      setErrorMessage(err.message || 'Gagal menghubungkan spreadsheet');
    }
  };

  const handleManualConnect = async () => {
    if (!manualInput.trim()) {
      setErrorMessage('Masukkan ID atau Link Google Sheets');
      return;
    }

    // Extract ID from URL if user pastes a full link
    let idToUse = manualInput.trim();
    const urlMatch = idToUse.match(/\/spreadsheets\/d\/([a-zA-Z0-9-_]+)/);
    if (urlMatch && urlMatch[1]) {
      idToUse = urlMatch[1];
    }

    setIsVerifyingManual(true);
    setErrorMessage(null);
    try {
      const meta = await verifyAndSetupSpreadsheet(idToUse);
      onDatabaseMetaChange(meta);
      setSuccessMessage(`Spreadsheet "${meta.title}" berhasil dihubungkan!`);
      setManualInput('');
      setActiveSubTab('status');
    } catch (err: any) {
      setErrorMessage(err.message || 'Spreadsheet tidak valid atau tidak memiliki akses.');
    } finally {
      setIsVerifyingManual(false);
    }
  };

  const handleDisconnect = () => {
    if (window.confirm('Apakah Anda yakin ingin memutuskan sambungan database Google Sheets ini? Data di dalam spreadsheet tidak akan dihapus.')) {
      saveDatabaseMeta(null);
      onDatabaseMetaChange(null);
      setSuccessMessage('Sambungan database Google Sheets telah diputuskan.');
      setActiveSubTab('create');
    }
  };

  if (!isOpen) return null;

  return (
    <div
      id="sheets-database-modal"
      className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto animate-in fade-in duration-200"
    >
      <div className="bg-white rounded-2xl max-w-2xl w-full shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[90vh]">
        {/* Modal Header */}
        <div className="bg-gradient-to-r from-emerald-800 to-teal-900 text-white px-6 py-5 flex items-center justify-between shrink-0">
          <div className="flex items-center space-x-3.5">
            <div className="w-11 h-11 rounded-xl bg-white/10 backdrop-blur-xs border border-white/20 flex items-center justify-center text-emerald-300 shadow-xs">
              <FileSpreadsheet className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h3 className="font-black text-lg text-white">Database Google Sheets</h3>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-emerald-500/20 text-emerald-200 border border-emerald-400/30">
                  {databaseMeta ? 'Terhubung' : 'Belum Terhubung'}
                </span>
              </div>
              <p className="text-xs text-emerald-100/80">
                Penyimpanan data clearance siswa & guru terpusat via Google Workspace
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-white/70 hover:text-white p-2 rounded-xl hover:bg-white/10 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Sub-Tab Navigation */}
        <div className="bg-slate-50 border-b border-slate-200 px-6 flex items-center space-x-4 shrink-0 overflow-x-auto">
          {databaseMeta && (
            <button
              onClick={() => setActiveSubTab('status')}
              className={`py-3 px-1 text-xs font-bold border-b-2 transition-all flex items-center space-x-1.5 cursor-pointer ${
                activeSubTab === 'status'
                  ? 'border-emerald-600 text-emerald-700'
                  : 'border-transparent text-slate-500 hover:text-slate-800'
              }`}
            >
              <Database className="w-4 h-4" />
              <span>Status & Operasi Database</span>
            </button>
          )}

          <button
            onClick={() => setActiveSubTab('create')}
            className={`py-3 px-1 text-xs font-bold border-b-2 transition-all flex items-center space-x-1.5 cursor-pointer ${
              activeSubTab === 'create'
                ? 'border-emerald-600 text-emerald-700'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <PlusCircle className="w-4 h-4" />
            <span>Buat Database Baru</span>
          </button>

          <button
            onClick={() => {
              setActiveSubTab('browse');
              if (driveSpreadsheets.length === 0) {
                handleLoadDriveSpreadsheets();
              }
            }}
            className={`py-3 px-1 text-xs font-bold border-b-2 transition-all flex items-center space-x-1.5 cursor-pointer ${
              activeSubTab === 'browse'
                ? 'border-emerald-600 text-emerald-700'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <FolderOpen className="w-4 h-4" />
            <span>Pilih dari Drive</span>
          </button>

          <button
            onClick={() => setActiveSubTab('manual')}
            className={`py-3 px-1 text-xs font-bold border-b-2 transition-all flex items-center space-x-1.5 cursor-pointer ${
              activeSubTab === 'manual'
                ? 'border-emerald-600 text-emerald-700'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <Link2 className="w-4 h-4" />
            <span>Tautkan ID / URL</span>
          </button>
        </div>

        {/* Content Area */}
        <div className="p-6 overflow-y-auto space-y-5">
          {/* Alerts */}
          {errorMessage && (
            <div className="bg-rose-50 border border-rose-200 text-rose-800 px-4 py-3 rounded-xl text-xs flex items-center space-x-2">
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
              <span>{errorMessage}</span>
            </div>
          )}
          {successMessage && (
            <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 px-4 py-3 rounded-xl text-xs flex items-center space-x-2">
              <CheckCircle className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>{successMessage}</span>
            </div>
          )}

          {/* TAB 1: Database Status & Operations */}
          {activeSubTab === 'status' && databaseMeta && (
            <div className="space-y-5">
              {/* Active Connection Card */}
              <div className="bg-gradient-to-br from-emerald-50 to-teal-50 border border-emerald-200 rounded-2xl p-5 space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div>
                    <div className="flex items-center space-x-2">
                      <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
                      <span className="text-xs font-bold text-emerald-800 uppercase tracking-wider">
                        Spreadsheet Aktif Terhubung
                      </span>
                    </div>
                    <h4 className="font-extrabold text-base text-slate-900 mt-1">{databaseMeta.title}</h4>
                    <p className="text-xs text-slate-500 font-mono truncate max-w-sm sm:max-w-md">
                      ID: {databaseMeta.spreadsheetId}
                    </p>
                  </div>

                  <div className="flex items-center space-x-2">
                    <a
                      href={databaseMeta.spreadsheetUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center space-x-1.5 px-3.5 py-2 rounded-xl text-xs font-bold text-white bg-emerald-700 hover:bg-emerald-800 shadow-xs transition-all cursor-pointer"
                    >
                      <span>Buka di Google Sheets</span>
                      <ExternalLink className="w-3.5 h-3.5" />
                    </a>
                  </div>
                </div>

                {/* Database Metrics Grid */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 pt-3 border-t border-emerald-200/60">
                  <div className="bg-white/80 rounded-xl p-2.5 border border-emerald-100">
                    <span className="text-[10px] text-slate-500 uppercase font-semibold">Tersinkronkan</span>
                    <p className="text-xs font-bold text-slate-800 truncate mt-0.5">
                      {databaseMeta.lastSyncedAt || 'Belum pernah'}
                    </p>
                  </div>
                  <div className="bg-white/80 rounded-xl p-2.5 border border-emerald-100">
                    <span className="text-[10px] text-slate-500 uppercase font-semibold">Rekap Siswa</span>
                    <p className="text-xs font-black text-slate-800 mt-0.5">
                      {databaseMeta.totalStudentsRecorded ?? studentRecordsCount} Siswa
                    </p>
                  </div>
                  <div className="bg-white/80 rounded-xl p-2.5 border border-emerald-100">
                    <span className="text-[10px] text-slate-500 uppercase font-semibold">Detail Tugas</span>
                    <p className="text-xs font-black text-slate-800 mt-0.5">
                      {databaseMeta.totalTasksRecorded ?? taskRecordsCount} Baris
                    </p>
                  </div>
                  <div className="bg-white/80 rounded-xl p-2.5 border border-emerald-100">
                    <span className="text-[10px] text-slate-500 uppercase font-semibold">Rekap Guru</span>
                    <p className="text-xs font-black text-slate-800 mt-0.5">
                      {databaseMeta.totalTeachersRecorded ?? teacherRecordsCount} Guru
                    </p>
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {/* 1. Sync To Sheets */}
                <div className="border border-slate-200 rounded-xl p-4 space-y-2.5 bg-slate-50/50 hover:bg-slate-50 transition-all">
                  <div className="flex items-center space-x-2 text-emerald-800 font-bold text-sm">
                    <Upload className="w-4 h-4 text-emerald-600" />
                    <span>Simpan & Sinkronkan Data</span>
                  </div>
                  <p className="text-xs text-slate-600 leading-relaxed">
                    Tulis seluruh rekap clearance siswa, detail tugas, dan status penilaian guru ke dalam Google Sheets database.
                  </p>
                  <button
                    type="button"
                    onClick={() => {
                      onOpenSyncConfirm();
                    }}
                    className="w-full inline-flex items-center justify-center space-x-2 px-4 py-2 rounded-xl text-xs font-bold text-white bg-emerald-700 hover:bg-emerald-800 shadow-2xs transition-all cursor-pointer"
                  >
                    <Upload className="w-3.5 h-3.5" />
                    <span>Sinkronkan ke Google Sheets</span>
                  </button>
                </div>

                {/* 2. Load From Sheets */}
                <div className="border border-slate-200 rounded-xl p-4 space-y-2.5 bg-slate-50/50 hover:bg-slate-50 transition-all">
                  <div className="flex items-center space-x-2 text-blue-800 font-bold text-sm">
                    <Download className="w-4 h-4 text-blue-600" />
                    <span>Muat Data dari Database Sheets</span>
                  </div>
                  <p className="text-xs text-slate-600 leading-relaxed">
                    Tampilkan data clearance langsung dari Google Sheets ke dashboard tanpa perlu memuat ulang API Google Classroom.
                  </p>
                  <button
                    type="button"
                    onClick={onLoadFromSheets}
                    disabled={isLoadingFromSheets}
                    className="w-full inline-flex items-center justify-center space-x-2 px-4 py-2 rounded-xl text-xs font-bold text-blue-700 bg-blue-50 hover:bg-blue-100 border border-blue-200 transition-all cursor-pointer disabled:opacity-50"
                  >
                    {isLoadingFromSheets ? (
                      <>
                        <div className="w-3.5 h-3.5 border-2 border-blue-700 border-t-transparent rounded-full animate-spin" />
                        <span>Membaca Data Sheets...</span>
                      </>
                    ) : (
                      <>
                        <Download className="w-3.5 h-3.5" />
                        <span>Muat dari Google Sheets</span>
                      </>
                    )}
                  </button>
                </div>
              </div>

              {/* Disconnect Option */}
              <div className="pt-3 border-t border-slate-200 flex justify-between items-center text-xs">
                <span className="text-slate-500">Ingin beralih ke spreadsheet lain?</span>
                <button
                  type="button"
                  onClick={handleDisconnect}
                  className="text-rose-600 hover:text-rose-800 font-bold inline-flex items-center space-x-1 cursor-pointer"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Putuskan Sambungan</span>
                </button>
              </div>
            </div>
          )}

          {/* TAB 2: Create New Database */}
          {activeSubTab === 'create' && (
            <div className="space-y-4">
              <div className="border border-slate-200 rounded-2xl p-5 bg-slate-50/50 space-y-3.5">
                <div className="flex items-center space-x-2.5 text-slate-900 font-extrabold text-sm">
                  <div className="w-8 h-8 rounded-lg bg-emerald-100 text-emerald-800 flex items-center justify-center">
                    <PlusCircle className="w-4 h-4" />
                  </div>
                  <div>
                    <h4>Buat Spreadsheet Database Baru</h4>
                    <p className="text-xs text-slate-500 font-normal">
                      Aplikasi akan otomatis membuat file Google Sheets baru dengan format 4 tabel siap pakai di Google Drive Anda.
                    </p>
                  </div>
                </div>

                <div className="space-y-1.5 pt-2">
                  <label className="block text-xs font-bold text-slate-700">Nama File Database Spreadsheet:</label>
                  <input
                    type="text"
                    value={newDbTitle}
                    onChange={(e) => setNewDbTitle(e.target.value)}
                    placeholder="Contoh: Clearance_Makarios_Database_2026"
                    className="w-full bg-white border border-slate-200 rounded-xl px-3.5 py-2 text-xs text-slate-800 font-semibold focus:outline-none focus:border-emerald-600 shadow-2xs"
                  />
                </div>

                {/* Structure Preview */}
                <div className="bg-white border border-slate-200 rounded-xl p-3.5 space-y-2 text-xs">
                  <span className="font-bold text-slate-700 flex items-center space-x-1.5">
                    <Layers className="w-3.5 h-3.5 text-emerald-600" />
                    <span>Tabel / Lembar Kerja yang Akan Dibuat Otomatis:</span>
                  </span>
                  <ul className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[11px] text-slate-600">
                    <li className="flex items-center space-x-2">
                      <span className="w-2 h-2 rounded-full bg-blue-500" />
                      <span><strong>Siswa_Clearance_Summary</strong> (Status Siswa)</span>
                    </li>
                    <li className="flex items-center space-x-2">
                      <span className="w-2 h-2 rounded-full bg-amber-500" />
                      <span><strong>Detail_Tugas_Siswa</strong> (Rincian Tugas)</span>
                    </li>
                    <li className="flex items-center space-x-2">
                      <span className="w-2 h-2 rounded-full bg-emerald-500" />
                      <span><strong>Guru_Clearance_Summary</strong> (Status Guru)</span>
                    </li>
                    <li className="flex items-center space-x-2">
                      <span className="w-2 h-2 rounded-full bg-slate-500" />
                      <span><strong>Metadata_Database</strong> (Info Waktu & Sistem)</span>
                    </li>
                  </ul>
                </div>

                <button
                  type="button"
                  onClick={handleCreateNewDatabase}
                  disabled={isCreatingNew}
                  className="w-full inline-flex items-center justify-center space-x-2 px-5 py-2.5 rounded-xl text-xs font-bold text-white bg-emerald-700 hover:bg-emerald-800 shadow-sm transition-all disabled:opacity-50 cursor-pointer"
                >
                  {isCreatingNew ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      <span>Membuat Spreadsheet di Google Drive...</span>
                    </>
                  ) : (
                    <>
                      <PlusCircle className="w-4 h-4" />
                      <span>Buat & Hubungkan Database Baru</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          )}

          {/* TAB 3: Browse From Google Drive */}
          {activeSubTab === 'browse' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="text-xs font-extrabold text-slate-800">Spreadsheet di Google Drive Anda</h4>
                  <p className="text-[11px] text-slate-500">Pilih spreadsheet yang ingin Anda gunakan sebagai database clearance.</p>
                </div>
                <button
                  type="button"
                  onClick={handleLoadDriveSpreadsheets}
                  disabled={isFetchingDrive}
                  className="inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-bold text-slate-700 bg-slate-100 hover:bg-slate-200 border border-slate-200 transition-colors"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${isFetchingDrive ? 'animate-spin' : ''}`} />
                  <span>Segarkan</span>
                </button>
              </div>

              {isFetchingDrive ? (
                <div className="py-8 text-center space-y-2">
                  <div className="w-6 h-6 border-2 border-emerald-600 border-t-transparent rounded-full animate-spin mx-auto" />
                  <p className="text-xs text-slate-500">Mengambil daftar spreadsheet dari Google Drive...</p>
                </div>
              ) : driveSpreadsheets.length === 0 ? (
                <div className="py-8 text-center space-y-2 border border-dashed border-slate-200 rounded-xl">
                  <FileSpreadsheet className="w-8 h-8 text-slate-400 mx-auto" />
                  <p className="text-xs text-slate-500 font-semibold">Tidak ditemukan spreadsheet di akun Google Drive ini.</p>
                  <button
                    type="button"
                    onClick={() => setActiveSubTab('create')}
                    className="text-xs text-emerald-700 font-bold hover:underline"
                  >
                    + Buat Database Spreadsheet Baru
                  </button>
                </div>
              ) : (
                <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
                  {driveSpreadsheets.map((item) => {
                    const isCurrent = databaseMeta?.spreadsheetId === item.id;
                    return (
                      <div
                        key={item.id}
                        className={`p-3 rounded-xl border flex items-center justify-between transition-all ${
                          isCurrent
                            ? 'bg-emerald-50/70 border-emerald-300'
                            : 'bg-white hover:bg-slate-50 border-slate-200'
                        }`}
                      >
                        <div className="min-w-0 pr-3">
                          <div className="flex items-center space-x-2">
                            <span className="text-xs font-bold text-slate-800 truncate">{item.name}</span>
                            {isCurrent && (
                              <span className="text-[10px] font-extrabold text-emerald-700 bg-emerald-100 px-1.5 py-0.2 rounded">
                                Terhubung
                              </span>
                            )}
                          </div>
                          <p className="text-[10px] text-slate-400 font-mono truncate">ID: {item.id}</p>
                        </div>
                        <div className="shrink-0 flex items-center space-x-2">
                          {isCurrent ? (
                            <span className="text-xs font-bold text-emerald-700 flex items-center space-x-1">
                              <CheckCircle className="w-4 h-4" />
                              <span>Aktif</span>
                            </span>
                          ) : (
                            <button
                              type="button"
                              onClick={() => handleConnectSpreadsheet(item.id)}
                              className="px-3 py-1.5 rounded-lg text-xs font-bold text-white bg-emerald-700 hover:bg-emerald-800 shadow-2xs transition-colors cursor-pointer"
                            >
                              Gunakan Sebagai Database
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* TAB 4: Manual ID / Link Input */}
          {activeSubTab === 'manual' && (
            <div className="space-y-4">
              <div className="border border-slate-200 rounded-2xl p-5 bg-slate-50/50 space-y-3.5">
                <div className="flex items-center space-x-2.5 text-slate-900 font-extrabold text-sm">
                  <div className="w-8 h-8 rounded-lg bg-teal-100 text-teal-800 flex items-center justify-center">
                    <Link2 className="w-4 h-4" />
                  </div>
                  <div>
                    <h4>Hubungkan Spreadsheet Manual</h4>
                    <p className="text-xs text-slate-500 font-normal">
                      Salin URL atau ID spreadsheet dari browser Anda dan tempel di sini.
                    </p>
                  </div>
                </div>

                <div className="space-y-1.5 pt-2">
                  <label className="block text-xs font-bold text-slate-700">Link atau ID Google Spreadsheet:</label>
                  <input
                    type="text"
                    value={manualInput}
                    onChange={(e) => setManualInput(e.target.value)}
                    placeholder="https://docs.google.com/spreadsheets/d/1aBcD.../edit atau ID Spreadsheet"
                    className="w-full bg-white border border-slate-200 rounded-xl px-3.5 py-2 text-xs text-slate-800 font-mono focus:outline-none focus:border-emerald-600 shadow-2xs"
                  />
                  <p className="text-[11px] text-slate-400">
                    Aplikasi akan memvalidasi izin akses dan menyiapkan lembar kerja yang diperlukan secara otomatis.
                  </p>
                </div>

                <button
                  type="button"
                  onClick={handleManualConnect}
                  disabled={isVerifyingManual}
                  className="w-full inline-flex items-center justify-center space-x-2 px-5 py-2.5 rounded-xl text-xs font-bold text-white bg-emerald-700 hover:bg-emerald-800 shadow-sm transition-all disabled:opacity-50 cursor-pointer"
                >
                  {isVerifyingManual ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      <span>Memverifikasi Akses Spreadsheet...</span>
                    </>
                  ) : (
                    <>
                      <CheckCircle className="w-4 h-4" />
                      <span>Verifikasi & Hubungkan</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          )}

          {/* Database Architecture Explanation Banner */}
          <div className="border border-slate-200 rounded-xl p-4 bg-slate-50/70 space-y-2 text-xs text-slate-600">
            <span className="font-bold text-slate-800 flex items-center space-x-1.5">
              <Database className="w-4 h-4 text-emerald-700" />
              <span>Cara Kerja Database Google Sheets:</span>
            </span>
            <p className="leading-relaxed text-[11px]">
              Data siswa, rekap penyerahan tugas Google Classroom, dan riwayat penilaian disimpan langsung ke dalam file Google Sheets di Google Drive Anda. Anda dapat mengolahnya lebih lanjut di Excel/Spreadsheet, membagikannya kepada sesama guru, atau mencetak laporan clearance kapan saja.
            </p>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="bg-slate-50 border-t border-slate-200 px-6 py-3.5 flex items-center justify-between shrink-0">
          <div className="text-[11px] text-slate-500">
            {databaseMeta ? `Tersambung ke: ${databaseMeta.title}` : 'Belum ada database yang tersambung'}
          </div>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl text-xs font-bold text-slate-700 bg-white hover:bg-slate-100 border border-slate-200 transition-colors cursor-pointer"
          >
            Tutup
          </button>
        </div>
      </div>
    </div>
  );
};
