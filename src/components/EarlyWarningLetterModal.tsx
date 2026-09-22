import React from 'react';
import { X, Printer, AlertTriangle, ShieldAlert, CheckCircle2 } from 'lucide-react';
import { AggregatedStudentGradebook, CourseStudentGradeDetail } from '../types';

interface EarlyWarningLetterModalProps {
  student: AggregatedStudentGradebook;
  onClose: () => void;
}

export const EarlyWarningLetterModal: React.FC<EarlyWarningLetterModalProps> = ({
  student,
  onClose,
}) => {
  const currentDate = new Date().toLocaleDateString('id-ID', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs">
      <div className="bg-white rounded-2xl shadow-2xl max-w-3xl w-full max-h-[90vh] flex flex-col overflow-hidden border border-slate-200">
        {/* Modal Controls - Hidden during print */}
        <div className="px-5 py-3.5 bg-slate-900 text-white flex items-center justify-between shrink-0 print:hidden">
          <div className="flex items-center space-x-2">
            <ShieldAlert className="w-5 h-5 text-amber-400" />
            <h3 className="font-extrabold text-sm">
              Surat Peringatan Dini Akademik (Early Warning Letter)
            </h3>
          </div>
          <div className="flex items-center space-x-2">
            <button
              onClick={handlePrint}
              className="inline-flex items-center space-x-1.5 px-3 py-1.5 bg-[#FFC800] hover:bg-amber-400 text-slate-950 rounded-xl text-xs font-black shadow-xs transition-all active:scale-95 cursor-pointer"
            >
              <Printer className="w-4 h-4 text-slate-950" />
              <span>Cetak Surat (A4)</span>
            </button>
            <button
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Printable Letter Body */}
        <div className="p-8 overflow-y-auto bg-white text-slate-900 print:p-0 print:overflow-visible">
          {/* Letterhead (Kop Surat) */}
          <div className="border-b-2 border-slate-900 pb-3 mb-5 text-center">
            <h2 className="text-base font-black uppercase tracking-wider text-slate-900">
              SEKOLAH MAKARIOS / SATUAN PENDIDIKAN
            </h2>
            <h3 className="text-xs font-bold text-slate-700">
              BIDANG KURIKULUM & BIMBINGAN KONSELING (BK)
            </h3>
            <p className="text-[10px] text-slate-500 mt-0.5">
              Sistem Pemantauan Akademik & Penuntasan Tugas Google Classroom
            </p>
          </div>

          {/* Letter Info */}
          <div className="flex justify-between text-xs mb-5">
            <div>
              <p><span className="font-bold">Nomor:</span> SP-AKD/{new Date().getFullYear()}/{student.studentId.slice(-4)}</p>
              <p><span className="font-bold">Hal:</span> Peringatan Akademik & Panggilan Konseling Siswa</p>
              <p><span className="font-bold">Lampiran:</span> Rekapitulasi Tugas Tertunggak</p>
            </div>
            <div className="text-right">
              <p>Jakarta, {currentDate}</p>
              <p className="font-bold text-rose-600">STATUS: PERINGATAN DINI</p>
            </div>
          </div>

          {/* Greeting */}
          <div className="text-xs mb-4">
            <p>Kepada Yth.</p>
            <p className="font-bold">Orang Tua / Wali Murid dari:</p>
            <p className="font-extrabold text-slate-900 text-sm">{student.studentName}</p>
            <p>Kelas: {student.className} • Email: {student.studentEmail}</p>
            <p>di Tempat</p>
          </div>

          <p className="text-xs leading-relaxed mb-4 text-justify">
            Dengan hormat, berdasarkan hasil audit pemantauan aktivitas belajar dan penilaian berkala di Google Classroom semester berjalan, kami menginformasikan bahwa siswa yang bersangkutan saat ini berada dalam status <span className="font-bold text-rose-600 underline">RISIKO AKADEMIK ({student.riskLevel === 'HIGH_RISK' ? 'TINGGI' : 'SEDANG'})</span> karena adanya sejumlah penugasan yang belum diselesaikan atau terlewat batas waktu.
          </p>

          {/* Issue Summary Box */}
          <div className="bg-rose-50 border border-rose-200 rounded-xl p-3.5 mb-4 text-xs">
            <p className="font-bold text-rose-900 mb-1.5 flex items-center space-x-1.5">
              <AlertTriangle className="w-4 h-4 text-rose-600" />
              <span>Rincian Indikator Masalah:</span>
            </p>
            <ul className="list-disc list-inside space-y-1 text-rose-800">
              {student.riskReasons.map((r, i) => (
                <li key={i}>{r}</li>
              ))}
              <li>Total Tugas Ditugaskan: {student.totalAssignedTasks} tugas (Selesai: {student.totalCompletedTasks}, Tertunggak/Missing: {student.totalMissingTasks})</li>
              <li>Rata-rata Nilai Sementara (GPA): <span className="font-bold">{student.overallGPA} (Predikat {student.letterGrade})</span></li>
            </ul>
          </div>

          {/* Per-Course Table Breakdown */}
          <div className="mb-6">
            <p className="text-xs font-bold text-slate-800 mb-2">
              Daftar Mata Pelajaran & Status Penuntasan Tugas:
            </p>
            <table className="w-full text-[11px] border border-slate-300 border-collapse">
              <thead className="bg-slate-100 text-slate-800 font-extrabold">
                <tr>
                  <th className="border border-slate-300 py-1.5 px-2 text-left">Mata Pelajaran</th>
                  <th className="border border-slate-300 py-1.5 px-2 text-center">Nilai Rata-rata</th>
                  <th className="border border-slate-300 py-1.5 px-2 text-center">Tugas Selesai</th>
                  <th className="border border-slate-300 py-1.5 px-2 text-center">Tugas Terlewat (Missing)</th>
                  <th className="border border-slate-300 py-1.5 px-2 text-center">Status</th>
                </tr>
              </thead>
              <tbody>
                {(Object.entries(student.courseGrades) as [string, CourseStudentGradeDetail][]).map(([cName, g]) => (
                  <tr key={cName}>
                    <td className="border border-slate-300 py-1.5 px-2 font-medium">{cName}</td>
                    <td className="border border-slate-300 py-1.5 px-2 text-center font-bold">
                      {g.averageScore > 0 ? g.averageScore : '-'}
                    </td>
                    <td className="border border-slate-300 py-1.5 px-2 text-center">{g.gradedTasks} / {g.totalTasks}</td>
                    <td className={`border border-slate-300 py-1.5 px-2 text-center font-bold ${g.missingTasks > 0 ? 'text-rose-600 bg-rose-50' : 'text-slate-600'}`}>
                      {g.missingTasks}
                    </td>
                    <td className="border border-slate-300 py-1.5 px-2 text-center">
                      {g.missingTasks === 0 ? (
                        <span className="text-emerald-700 font-bold">Tuntas</span>
                      ) : (
                        <span className="text-rose-600 font-bold">Perlu Perbaikan</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <p className="text-xs leading-relaxed mb-6 text-justify">
            Sehubungan dengan hal tersebut, kami menghimbau agar Bapak/Ibu Wali Murid dapat mendampingi putra/putri untuk segera menuntaskan seluruh tugas di Google Classroom sebelum penutupan batas nilai rapor.
          </p>

          {/* Signatures */}
          <div className="grid grid-cols-3 gap-4 text-center text-xs mt-8 pt-4 border-t border-slate-200">
            <div>
              <p className="text-slate-600">Mengetahui,</p>
              <p className="font-bold text-slate-800">Wali Kelas {student.className}</p>
              <div className="h-14" />
              <p className="font-bold underline text-slate-900">( ............................................ )</p>
            </div>
            <div>
              <p className="text-slate-600">Guru Pembimbing,</p>
              <p className="font-bold text-slate-800">Bimbingan Konseling (BK)</p>
              <div className="h-14" />
              <p className="font-bold underline text-slate-900">( ............................................ )</p>
            </div>
            <div>
              <p className="text-slate-600">Mengesahkan,</p>
              <p className="font-bold text-slate-800">Waka Bidang Kurikulum</p>
              <div className="h-14" />
              <p className="font-bold underline text-slate-900">( ............................................ )</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
