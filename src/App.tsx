import React, { useState, useEffect } from 'react';
import { 
  Calendar, 
  Upload, 
  FileText, 
  Clock, 
  CheckCircle, 
  AlertCircle, 
  User, 
  LogOut,
  PlusCircle,
  Paperclip,
  RefreshCw,
  Loader2,
  Filter,
  Eye,
  EyeOff,
  ClipboardList,
  ExternalLink
} from 'lucide-react';

export default function App() {
  // State untuk Log Masuk
  const [userRole, setUserRole] = useState<null | 'student' | 'teacher'>(null); // 'student' atau 'teacher'
  const [loginTab, setLoginTab] = useState<'student' | 'teacher'>('student'); // Tab aktif
  const [icInput, setIcInput] = useState('');
  const [passwordInput, setPasswordInput] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loginError, setLoginError] = useState('');
  const [loggedInStudent, setLoggedInStudent] = useState<any>(null);

  // State untuk Tapisan Guru
  const [filterTingkatan, setFilterTingkatan] = useState('Semua');
  const [filterKelas, setFilterKelas] = useState('Semua');
  const [searchName, setSearchName] = useState('');
  const [showReport, setShowReport] = useState(false);

  // State untuk foom
  const [date, setDate] = useState('');
  const [reason, setReason] = useState('');
  const [notes, setNotes] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // State data murid dari Google Sheets
  const [students, setStudents] = useState<any[]>([]);
  const [isLoadingData, setIsLoadingData] = useState(true);

  // State rekod ketidakhadiran (Data Contoh)
  const [records, setRecords] = useState<any[]>([]);

  // Fungsi Parser CSV
  const parseCSVLine = (text: string) => {
    let ret = [];
    let inQuote = false;
    let value = '';
    for (let i = 0; i < text.length; i++) {
      let char = text[i];
      if (inQuote) {
        if (char === '"') {
          if (i + 1 < text.length && text[i + 1] === '"') {
            value += '"';
            i++;
          } else {
            inQuote = false;
          }
        } else {
          value += char;
        }
      } else {
        if (char === '"') {
          inQuote = true;
        } else if (char === ',') {
          ret.push(value.trim());
          value = '';
        } else {
          value += char;
        }
      }
    }
    ret.push(value.trim());
    return ret;
  };

  // Ambil data murid & rekod ketidakhadiran dari Google Sheets
  const fetchData = async () => {
    setIsLoadingData(true);
    try {
      // 1. Ambil Data Murid
      const studentResponse = await fetch('https://docs.google.com/spreadsheets/d/e/2PACX-1vRGSHpGt_BccanOQU6g-zAy4c4KqF1OQsc4z78VUTq9_-yiU0DIy5dGE7z8hz6qmIPBQ7Fd-yOTECzw/pub?gid=576926888&single=true&output=csv');
      const studentCsvText = await studentResponse.text();
      const studentLines = studentCsvText.split('\n').filter(line => line.trim() !== '');
      
      let parsedStudents: any[] = [];
      if (studentLines.length > 1) {
        const headers = parseCSVLine(studentLines[0]).map(h => h.toUpperCase());
        const findHeaderIndex = (keywords: string[]) => {
          let idx = headers.findIndex(h => keywords.some(k => h === k));
          if (idx !== -1) return idx;
          return headers.findIndex(h => keywords.some(k => h.includes(k)));
        };

        const nameIdx = findHeaderIndex(['NAMA', 'NAMA MURID', 'NAMA PENUH']);
        const tingkatanIdx = findHeaderIndex(['TAHUN / TINGKATAN', 'TAHUN', 'TINGKATAN', 'FORM']);
        const namaKelasIdx = findHeaderIndex(['NAMA KELAS', 'KELAS']);
        const icIdx = findHeaderIndex(['IC', 'K/P', 'KP', 'NO. KAD PENGENALAN', 'PENGENALAN']);

        parsedStudents = studentLines.slice(1).map((line, idx) => {
          const cols = parseCSVLine(line);
          const rawIC = icIdx !== -1 ? cols[icIdx] || '' : '';
          const cleanIC = rawIC.replace(/[-\s]/g, '');
          const dateRegex = /\b\d{1,2}[-/]\d{1,2}[-/]\d{2,4}\b/g;
          const tingkatanVal = tingkatanIdx !== -1 && cols[tingkatanIdx] ? cols[tingkatanIdx].replace(dateRegex, '').trim() : '';
          const namaKelasVal = namaKelasIdx !== -1 && cols[namaKelasIdx] ? cols[namaKelasIdx].replace(dateRegex, '').trim() : '';
          
          const tMap: Record<string, string> = {
            'TINGKATAN SATU': '1', 'TINGKATAN DUA': '2', 'TINGKATAN TIGA': '3',
            'TINGKATAN EMPAT': '4', 'TINGKATAN LIMA': '5', 'TINGKATAN ENAM': '6',
            'SATU': '1', 'DUA': '2', 'TIGA': '3', 'EMPAT': '4', 'LIMA': '5', 'ENAM': '6'
          };
          const tShort = tMap[tingkatanVal.toUpperCase()] || tingkatanVal;
          const fullClassName = `${tShort} ${namaKelasVal}`.replace(/\s+/g, ' ').trim();

          return {
            id: idx,
            name: nameIdx !== -1 ? cols[nameIdx] || `Murid ${idx + 1}` : `Murid ${idx + 1}`,
            className: fullClassName || (namaKelasIdx !== -1 ? cols[namaKelasIdx] : ''), 
            tingkatan: tingkatanVal,
            kelas: namaKelasVal,
            ic: cleanIC,
            rawIC: rawIC
          };
        });
        setStudents(parsedStudents);
      }

      // 2. Ambil Rekod Ketidakhadiran (Sheet: DATA - gid=0)
      const recordUrl = `https://docs.google.com/spreadsheets/d/e/2PACX-1vRGSHpGt_BccanOQU6g-zAy4c4KqF1OQsc4z78VUTq9_-yiU0DIy5dGE7z8hz6qmIPBQ7Fd-yOTECzw/pub?gid=0&single=true&output=csv&t=${new Date().getTime()}`;
      const recordResponse = await fetch(recordUrl);
      const recordCsvText = await recordResponse.text();
      const recordLines = recordCsvText.split('\n').filter(line => line.trim() !== '');

      if (recordLines.length > 1) {
        const headers = parseCSVLine(recordLines[0]).map(h => h.toUpperCase());
        
        const findHeaderIndex = (keywords: string[]) => {
          let idx = headers.findIndex(h => keywords.some(k => h === k));
          if (idx !== -1) return idx;
          return headers.findIndex(h => keywords.some(k => h.includes(k)));
        };

        const idIdx = findHeaderIndex(['ID']);
        const tarikhIdx = findHeaderIndex(['TARIKH']);
        const namaIdx = findHeaderIndex(['NAMA MURID', 'NAMA_MURID']);
        const sebabIdx = findHeaderIndex(['SEBAB']);
        const buktiIdx = findHeaderIndex(['BUKTI']);
        const kelasIdx = findHeaderIndex(['KELAS', 'NAMA KELAS']); // Cuba cari kelas dalam rekod jika ada

        const parsedRecords = recordLines.slice(1).map((line, idx) => {
          const cols = parseCSVLine(line);
          const studentName = (namaIdx !== -1 ? cols[namaIdx] : '').trim();
          
          // Cari data murid untuk dapatkan IC dan Kelas
          const student = parsedStudents.find(s => s.name && s.name.trim().toUpperCase() === studentName.toUpperCase());

          return {
            id: idIdx !== -1 ? cols[idIdx] : idx,
            date: tarikhIdx !== -1 ? cols[tarikhIdx] : '',
            studentName: studentName,
            ic: student ? student.ic : '',
            className: student ? student.className : (kelasIdx !== -1 ? cols[kelasIdx] : ''),
            reason: sebabIdx !== -1 ? cols[sebabIdx] : '',
            proof: buktiIdx !== -1 ? cols[buktiIdx] : 'Tiada Bukti'
          };
        }).filter(r => {
          // Hanya ambil rekod yang mempunyai Nama Murid dan Tarikh yang sah
          const isValidName = r.studentName && 
                             r.studentName !== '' && 
                             r.studentName.toUpperCase() !== 'NAMA MURID';
          
          const isValidDate = r.date && r.date.trim() !== '';
          
          return isValidName && isValidDate;
        });
        setRecords(parsedRecords.reverse()); // Rekod terbaru di atas
      } else {
        // Jika tiada data baru, pastikan records tidak dikosongkan secara tidak sengaja jika asalnya ada data
        // Namun biasanya fetch akan kembalikan sekurang-kurangnya header
        setRecords([]);
      }

    } catch (error) {
      console.error('Ralat ketika mengambil data Google Sheets:', error);
    } finally {
      setIsLoadingData(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // Fungsi Log Masuk Murid
  const handleStudentLogin = (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError('');

    // Bersihkan input IC (buang dash/jarak untuk perbandingan tepat)
    const cleanInputIC = icInput.replace(/[-\s]/g, '');

    const studentFound = students.find(s => s.ic === cleanInputIC);

    if (studentFound) {
      setLoggedInStudent(studentFound);
      setUserRole('student');
      setIcInput('');
    } else {
      setLoginError('No Kad Pengenalan tidak dijumpai di dalam pangkalan data. Sila pastikan format betul.');
    }
  };

  // Fungsi Log Masuk Guru
  const handleTeacherLogin = (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError('');

    if (passwordInput === 'smkk2026') {
      setUserRole('teacher');
      setPasswordInput('');
    } else {
      setLoginError('Kata laluan salah. Sila cuba lagi.');
    }
  };

  // Fungsi Log Keluar
  const handleLogout = () => {
    setUserRole(null);
    setLoggedInStudent(null);
    setLoginTab('student');
    setLoginError('');
    setPasswordInput('');
    setShowPassword(false);
    setIcInput('');
    setFilterTingkatan('Semua');
    setFilterKelas('Semua');
  };

  // Fungsi Hantar Borang
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const selectedFile = e.target.files[0];
      const maxSize = 50 * 1024 * 1024; // 50MB

      if (selectedFile.size > maxSize) {
        alert('Saiz fail terlalu besar. Sila muat naik fail di bawah 50MB.');
        e.target.value = ''; // Reset input
        setFile(null);
        return;
      }
      setFile(selectedFile);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!date || !reason || !loggedInStudent) {
      alert('Sila lengkapkan tarikh dan sebab!');
      return;
    }

    setIsSubmitting(true);

    // Sediakan format data untuk dihantar ke Google Sheets (Sheet: DATA)
    const payload = {
      id: Date.now().toString(), // Jana ID unik berdasarkan masa
      tarikh: date,
      nama_murid: loggedInStudent.name,
      sebab: notes ? `${reason} - ${notes}` : reason,
      bukti: file ? file.name : 'Tiada Bukti' // Nota: Menyimpan nama fail ke dalam database
    };

    try {
      // PERHATIAN: Masukkan URL Google Apps Script anda di sini (Web App URL)
      const scriptUrl: string = 'https://script.google.com/macros/s/AKfycbxYrx7srwwTRG-7pq7jmYBtbt8ZBEbpMzFAFlJRlgOBhpA4yVD1A-4cVG1QFm5NgGxtFQ/exec';
      const placeholder: string = 'GANTIKAN_DENGAN_URL_WEB_APP_APPS_SCRIPT_ANDA';

      if (scriptUrl !== placeholder) {
        // Hantar data ke Google Sheets menggunakan POST request
        await fetch(scriptUrl, {
          method: 'POST',
          mode: 'no-cors', // Penting untuk mengelakkan isu CORS dengan Google Script
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(payload)
        });
      } else {
        // Simulasi masa memuatkan jika URL Web App belum dimasukkan
      console.log("Sila masukkan URL Web App untuk simpan data:", payload);
      await new Promise(resolve => setTimeout(resolve, 1500));
    }

    // Kemaskini paparan rekod tempatan pada skrin (Local state)
    const newRecord = {
      id: records.length + 1,
      date: date,
      ic: loggedInStudent.ic,
      studentName: loggedInStudent.name,
      className: loggedInStudent.className,
      reason: reason,
      notes: notes,
      proof: file ? file.name : 'Tiada Bukti',
      file: file // Simpan objek fail untuk tujuan muat turun dalam sesi ini
    };

    setRecords([newRecord, ...records]);
    
    // Reset borang
      setDate('');
      setReason('');
      setNotes('');
      setFile(null);
      alert('Makluman ketidakhadiran berjaya dihantar ke pangkalan data!');
    } catch (error) {
      console.error('Ralat ketika menghantar data:', error);
      alert('Ralat berlaku ketika menyimpan data. Sila cuba lagi.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Fungsi Muat Turun / Papar Bukti
  const handleDownload = (record: any) => {
    if (record.file) {
      // Jika fail ada dalam state (baru dimuat naik dalam sesi ini)
      const url = URL.createObjectURL(record.file);
      window.open(url, '_blank');
      // Juga benarkan muat turun jika perlu
      const a = document.createElement('a');
      a.href = url;
      a.download = record.proof;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      setTimeout(() => URL.revokeObjectURL(url), 100);
    } else if (record.proof && (record.proof.startsWith('http') || record.proof.startsWith('www'))) {
      // Jika bukti adalah pautan (URL)
      const url = record.proof.startsWith('www') ? `https://${record.proof}` : record.proof;
      window.open(url, '_blank');
    } else if (record.proof && record.proof !== 'Tiada Bukti') {
      // Jika ada nama fail tetapi bukan URL (biasanya dalam sistem sebenar ini adalah ID fail Drive)
      // Untuk demo, kita cuba cari jika ia adalah pautan yang tidak lengkap atau beritahu pengguna
      alert(`Fail "${record.proof}" dikesan. Jika ini adalah pautan Google Drive, pastikan ia bermula dengan http/https. Dalam sistem penuh, ini akan membuka dokumen berkaitan.`);
    } else {
      alert('Tiada bukti dilampirkan untuk rekod ini.');
    }
  };

  // Paparan Skrin Memuatkan Data
  if (isLoadingData) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center font-sans">
        <RefreshCw className="w-8 h-8 text-blue-600 animate-spin mb-4" />
        <p className="text-slate-600 font-medium">Memuat turun pangkalan data murid...</p>
      </div>
    );
  }

  // Paparan Skrin Log Masuk
  if (!userRole) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4 font-sans">
        <div className="max-w-md w-full bg-white rounded-2xl shadow-lg border border-slate-100 p-8">
          <div className="flex flex-col items-center justify-center mb-6">
            <img 
              src="https://i.postimg.cc/J75gkh3v/500-PX.png" 
              alt="Logo SMK Kolombong" 
              className="w-24 h-24 object-contain mb-4 drop-shadow-sm"
              onError={(e: any) => {
                e.target.onerror = null;
                e.target.src = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='100' height='100' viewBox='0 0 24 24' fill='none' stroke='%23cbd5e1' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpath d='M12 2L2 7l10 5 10-5-10-5z'/%3E%3Cpath d='M2 17l10 5 10-5'/%3E%3Cpath d='M2 12l10 5 10-5'/%3E%3C/svg%3E";
              }}
            />
            <h2 className="text-2xl font-bold text-center text-slate-800">SMK Kolombong</h2>
            <p className="text-center text-slate-500 mt-1 text-sm font-medium">Sistem Ketidakhadiran</p>
          </div>
          
          <div className="flex mb-6 bg-slate-100 p-1 rounded-lg">
            <button 
              onClick={() => {setLoginTab('student'); setLoginError('');}} 
              className={`flex-1 py-2 text-sm font-medium rounded-md transition-all ${loginTab === 'student' ? 'bg-white shadow-sm text-blue-600' : 'text-slate-500 hover:text-slate-700'}`}
            >
              Murid
            </button>
            <button 
              onClick={() => {setLoginTab('teacher'); setLoginError('');}} 
              className={`flex-1 py-2 text-sm font-medium rounded-md transition-all ${loginTab === 'teacher' ? 'bg-white shadow-sm text-blue-600' : 'text-slate-500 hover:text-slate-700'}`}
            >
              Guru
            </button>
          </div>

          {loginTab === 'student' ? (
            <form onSubmit={handleStudentLogin} className="space-y-5">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">No. Kad Pengenalan (IC)</label>
                <input 
                  type="text" 
                  value={icInput}
                  onChange={(e) => setIcInput(e.target.value)}
                  placeholder="Contoh: 040101145678"
                  className="w-full px-4 py-3 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all"
                  required
                />
              </div>
              
              {loginError && (
                <div className="p-3 bg-red-50 border border-red-100 text-red-600 text-sm rounded-lg flex items-start">
                  <AlertCircle className="w-4 h-4 mr-2 mt-0.5 shrink-0" />
                  <p>{loginError}</p>
                </div>
              )}
              
              <button 
                type="submit"
                className="w-full flex justify-center py-3 px-4 border border-transparent rounded-lg shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors mt-2"
              >
                Log Masuk Murid
              </button>
            </form>
          ) : (
            <form onSubmit={handleTeacherLogin} className="space-y-5">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Kata Laluan Guru</label>
                <div className="relative">
                  <input 
                    type={showPassword ? "text" : "password"} 
                    value={passwordInput}
                    onChange={(e) => setPasswordInput(e.target.value)}
                    placeholder="Masukkan kata laluan"
                    className="w-full px-4 py-3 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all pr-12"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors p-1"
                    title={showPassword ? "Sembunyi kata laluan" : "Lihat kata laluan"}
                  >
                    {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                  </button>
                </div>
              </div>
              
              {loginError && (
                <div className="p-3 bg-red-50 border border-red-100 text-red-600 text-sm rounded-lg flex items-start">
                  <AlertCircle className="w-4 h-4 mr-2 mt-0.5 shrink-0" />
                  <p>{loginError}</p>
                </div>
              )}
              
              <button 
                type="submit"
                className="w-full flex justify-center py-3 px-4 border border-transparent rounded-lg shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 transition-colors mt-2"
              >
                Log Masuk Guru
              </button>
            </form>
          )}

          <div className="mt-6 border-t border-slate-100 pt-6 text-center">
            <p className="text-xs text-slate-400">Pangkalan data disambungkan ke Google Sheets Sekolah.</p>
          </div>
        </div>
      </div>
    );
  }

  // Senarai unik untuk dropdown Tingkatan & Kelas berdasarkan data murid
  const uniqueTingkatan: string[] = [...new Set(students.map(s => s.tingkatan))]
    .filter((t): t is string => typeof t === 'string' && t !== '' && !['TINGKATAN', 'KELAS', 'NAMA', 'TAHUN', 'TAHUN / TINGKATAN'].includes(t.toUpperCase()))
    .sort((a, b) => {
      const order = [
        'TINGKATAN SATU',
        'TINGKATAN DUA',
        'TINGKATAN TIGA',
        'TINGKATAN EMPAT',
        'TINGKATAN LIMA',
        'KELAS KHAS'
      ];
      const indexA = order.indexOf(a.toUpperCase());
      const indexB = order.indexOf(b.toUpperCase());
      
      if (indexA !== -1 && indexB !== -1) return indexA - indexB;
      if (indexA !== -1) return -1;
      if (indexB !== -1) return 1;
      return a.localeCompare(b);
    });
    
  const uniqueKelas: string[] = [...new Set(students.map(s => s.kelas))]
    .filter((k): k is string => typeof k === 'string' && k.trim() !== '' && !['NAMA KELAS', 'KELAS', 'NAMA', 'NULL', 'UNDEFINED'].includes(k.toUpperCase()))
    .sort();

  // Tapis rekod: Jika murid, tunjuk rekod dia sahaja. Jika guru, tunjuk semua atau ikut tapisan.
  const displayedRecords = userRole === 'teacher' 
    ? records.filter(r => {
        // Cari data murid asal untuk dapatkan tingkatan/kelas yang tepat
        const student = students.find(s => s.ic === r.ic);
        
        // Gunakan data dari rekod jika student lookup gagal (untuk ketahanan data)
        const rTingkatan = student ? student.tingkatan : (r.className ? r.className.split(' ')[0] : '');
        const rKelas = student ? student.kelas : (r.className ? r.className.split(' ').slice(1).join(' ') : '');
        
        const matchTingkatan = filterTingkatan === 'Semua' || rTingkatan === filterTingkatan;
        const matchKelas = filterKelas === 'Semua' || rKelas === filterKelas;
        const matchName = searchName === '' || (r.studentName && r.studentName.toLowerCase().includes(searchName.toLowerCase()));
        
        return matchTingkatan && matchKelas && matchName;
      })
    : records.filter(r => r.ic === loggedInStudent?.ic);

  // Statistik Ringkas (Untuk Guru)
  const stats = {
    totalAbsences: displayedRecords.length,
    todayAbsences: displayedRecords.filter(r => {
      const rDate = new Date(r.date).toDateString();
      const todayDate = new Date().toDateString();
      return rDate === todayDate;
    }).length,
    topReason: Object.entries(displayedRecords.reduce((acc: any, r) => {
      acc[r.reason] = (acc[r.reason] || 0) + 1;
      return acc;
    }, {})).sort((a: any, b: any) => b[1] - a[1])[0]?.[0] || '-'
  };

  // Analisa Guru (Kekerapan Sebab & Kekerapan Murid)
  const reasonFrequency = displayedRecords.reduce((acc: any, record) => {
    acc[record.reason] = (acc[record.reason] || 0) + 1;
    return acc;
  }, {});

  const studentAbsenceFrequency = displayedRecords.reduce((acc: any, record) => {
    const key = `${record.studentName} (${record.className})`;
    acc[key] = (acc[key] || 0) + 1;
    return acc;
  }, {});

  // Paparan Dashboard Utama
  return (
    <div className="min-h-screen bg-slate-50 font-sans text-slate-800">
      <nav className="bg-white border-b border-slate-200 px-6 py-4 flex justify-between items-center sticky top-0 z-10 shadow-sm">
        <div className="flex items-center space-x-3">
          <img 
            src="https://i.postimg.cc/J75gkh3v/500-PX.png" 
            alt="Logo SMK Kolombong" 
            className="w-10 h-10 object-contain"
            onError={(e: any) => {
              e.target.onerror = null;
              e.target.src = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='40' height='40' viewBox='0 0 24 24' fill='none' stroke='%23cbd5e1' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpath d='M12 2L2 7l10 5 10-5-10-5z'/%3E%3Cpath d='M2 17l10 5 10-5'/%3E%3Cpath d='M2 12l10 5 10-5'/%3E%3C/svg%3E";
            }}
          />
          <div>
            <h1 className="text-base sm:text-xl font-bold text-slate-800 leading-tight">SMK Kolombong</h1>
            <p className="text-[10px] sm:text-xs font-medium text-slate-500">
              E-Hadir Murid
            </p>
          </div>
        </div>
        
        <div className="flex items-center space-x-2 sm:space-x-4">
          <button 
            onClick={fetchData}
            disabled={isLoadingData}
            className="flex items-center text-slate-500 hover:text-blue-600 transition-colors p-2 rounded-lg hover:bg-blue-50 text-sm font-medium disabled:opacity-50" 
            title="Segarkan Data"
          >
            <RefreshCw className={`w-5 h-5 mr-1.5 ${isLoadingData ? 'animate-spin' : ''}`} />
            <span className="hidden md:inline">Segarkan Data</span>
          </button>
          <button 
            onClick={handleLogout}
            className="flex items-center text-slate-500 hover:text-red-600 transition-colors p-2 rounded-lg hover:bg-red-50 text-sm font-medium" 
            title="Log Keluar"
          >
            <LogOut className="w-5 h-5 mr-1.5" />
            <span className="hidden md:inline">Log Keluar</span>
          </button>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        
        {/* Bahagian Profil & Statistik */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
          {/* Profil */}
          <div className="lg:col-span-2 bg-white rounded-xl shadow-sm border border-slate-100 p-6 flex flex-col sm:flex-row items-start sm:items-center justify-between">
            <div className="flex items-center space-x-5">
              <div className="w-16 h-16 bg-blue-50 border border-blue-100 rounded-full flex items-center justify-center shrink-0">
                <User className="w-8 h-8 text-blue-600" />
              </div>
              <div>
                <h2 className="text-lg sm:text-xl font-bold text-slate-800 uppercase tracking-wide">
                  {userRole === 'teacher' ? 'GURU KELAS' : loggedInStudent?.name}
                </h2>
                {userRole === 'student' ? (
                  <div className="flex flex-col sm:flex-row sm:space-x-6 mt-2 text-sm text-slate-600">
                    <span className="flex items-center mt-1 sm:mt-0">
                      <span className="px-2 py-0.5 bg-slate-100 text-slate-600 rounded text-[10px] font-bold mr-2">KELAS</span> 
                      <span className="font-medium">{loggedInStudent?.className}</span>
                    </span>
                    <span className="flex items-center mt-2 sm:mt-0">
                      <span className="px-2 py-0.5 bg-slate-100 text-slate-600 rounded text-[10px] font-bold mr-2">NO. IC</span> 
                      <span className="font-medium">{loggedInStudent?.rawIC}</span>
                    </span>
                  </div>
                ) : (
                  <div className="mt-2 text-xs sm:text-sm text-slate-600 font-medium">
                    Pengurusan Ketidakhadiran Sekolah
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Statistik Ringkas (Guru Sahaja) */}
          {userRole === 'teacher' && (
            <div className="bg-indigo-600 rounded-xl shadow-md p-6 text-white flex flex-col justify-center">
              <div className="flex items-center justify-between mb-2">
                <span className="text-indigo-100 text-xs font-bold uppercase tracking-wider">Rumusan Kes</span>
                <AlertCircle className="w-4 h-4 text-indigo-200" />
              </div>
              <div className="flex items-end space-x-4">
                <div>
                  <p className="text-3xl font-black">{stats.totalAbsences}</p>
                  <p className="text-[10px] text-indigo-200 uppercase font-bold">Jumlah Kes</p>
                </div>
                <div className="border-l border-indigo-500 pl-4">
                  <p className="text-3xl font-black">{stats.todayAbsences}</p>
                  <p className="text-[10px] text-indigo-200 uppercase font-bold">Hari Ini</p>
                </div>
                <div className="border-l border-indigo-500 pl-4 hidden sm:block">
                  <p className="text-sm font-bold truncate max-w-[150px]">{stats.topReason}</p>
                  <p className="text-[10px] text-indigo-200 uppercase font-bold">Sebab Utama</p>
                </div>
              </div>
            </div>
          )}
        </div>


        {/* Penapisan Rekod Untuk Guru */}
        {userRole === 'teacher' && (
          <div className="bg-white rounded-xl shadow-sm border border-slate-100 p-6 mb-8">
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
              <div className="flex items-center justify-between w-full lg:w-auto">
                <h3 className="text-base sm:text-lg font-bold text-slate-800 flex items-center">
                   <Filter className="w-5 h-5 mr-2 text-indigo-600" /> Penapisan
                </h3>
                <button 
                  onClick={() => setShowReport(!showReport)}
                  className={`px-3 sm:px-4 py-2 rounded-lg text-xs sm:text-sm font-bold transition-all flex items-center ${
                    showReport 
                    ? 'bg-indigo-600 text-white shadow-md shadow-indigo-200' 
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  <FileText className="w-4 h-4 mr-1.5" />
                  {showReport ? 'Tutup' : 'Analisa'}
                </button>
              </div>
              
              {/* Penapis Tingkatan, Kelas & Nama */}
              <div className="flex flex-col sm:flex-row space-y-3 sm:space-y-0 sm:space-x-3 w-full lg:w-auto">
                <div className="flex items-center bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 flex-1 lg:w-64">
                  <User className="w-4 h-4 text-slate-400 mr-2 shrink-0" />
                  <input 
                    type="text"
                    placeholder="Cari Nama Murid..."
                    value={searchName}
                    onChange={(e) => setSearchName(e.target.value)}
                    className="bg-transparent text-sm text-slate-700 outline-none w-full"
                  />
                </div>
                <div className="flex items-center bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 flex-1 lg:w-48">
                  <Filter className="w-4 h-4 text-slate-400 mr-2 shrink-0" />
                  <select 
                    value={filterTingkatan}
                    onChange={(e) => {
                      setFilterTingkatan(e.target.value);
                      setFilterKelas('Semua'); // Reset kelas bila tingkatan berubah
                    }}
                    className="bg-transparent text-sm text-slate-700 outline-none cursor-pointer w-full"
                  >
                    <option value="Semua">Semua Tingkatan</option>
                    {uniqueTingkatan.map(t => (
                      <option key={t} value={t}>
                        {t}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="flex items-center bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 flex-1 lg:w-48">
                  <Filter className="w-4 h-4 text-slate-400 mr-2 shrink-0" />
                  <select 
                    value={filterKelas}
                    onChange={(e) => setFilterKelas(e.target.value)}
                    className="bg-transparent text-sm text-slate-700 outline-none cursor-pointer w-full"
                  >
                    <option value="Semua">Semua Kelas</option>
                    {uniqueKelas
                      .filter(k => {
                        if (filterTingkatan === 'Semua') return true;
                        // Tapis kelas berdasarkan tingkatan yang dipilih
                        return students.some(s => s.tingkatan === filterTingkatan && s.kelas === k);
                      })
                      .map(k => <option key={k} value={k}>{k}</option>)
                    }
                  </select>
                </div>
              </div>
            </div>

            {/* Paparan Laporan Ringkas & Analisa */}
            {showReport && (
              <div className="mt-6 pt-6 border-t border-slate-100">
                <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
                  
                  {/* 1. Laporan Ringkas (Grouping by Date) */}
                  <div className="xl:col-span-2 order-2 xl:order-1">
                    <div className="bg-slate-50 rounded-xl p-4 sm:p-6 border border-slate-200 h-full">
                      <h4 className="text-[10px] sm:text-xs font-bold text-slate-400 uppercase tracking-wider mb-4 flex items-center">
                        <ClipboardList className="w-4 h-4 mr-2" /> Format Laporan Ringkas
                      </h4>
                      <div className="space-y-4 max-h-[500px] overflow-y-auto pr-2 custom-scrollbar">
                        {Object.entries(
                          displayedRecords.reduce((acc: any, record) => {
                            const dateStr = new Date(record.date).toLocaleDateString('ms-MY', { day: 'numeric', month: 'short', year: 'numeric' });
                            if (!acc[dateStr]) acc[dateStr] = {};
                            if (!acc[dateStr][record.reason]) acc[dateStr][record.reason] = [];
                            acc[dateStr][record.reason].push(record.studentName);
                            return acc;
                          }, {})
                        ).map(([date, reasons]: [string, any]) => (
                          <div key={date} className="bg-white p-3 sm:p-4 rounded-lg border border-slate-200 shadow-sm">
                            <p className="text-indigo-600 font-bold text-base sm:text-lg mb-2">{date}</p>
                            <div className="space-y-3">
                              {Object.entries(reasons).map(([reason, names]: [string, any]) => (
                                <div key={reason}>
                                  <p className="text-slate-800 font-bold text-xs bg-slate-100 px-2 py-1 rounded inline-block mb-2">
                                    {reason}
                                  </p>
                                  <ul className="space-y-1 ml-3">
                                    {names.map((name: string, i: number) => (
                                      <li key={i} className="text-slate-600 text-xs sm:text-sm flex items-center">
                                        <span className="w-1 h-1 bg-slate-300 rounded-full mr-2"></span>
                                        {name}
                                      </li>
                                    ))}
                                  </ul>
                                </div>
                              ))}
                            </div>
                          </div>
                        ))}
                        {displayedRecords.length === 0 && (
                          <p className="text-center text-slate-400 py-4 italic text-sm">Tiada rekod untuk dipaparkan.</p>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* 2. Analisa Kekerapan */}
                  <div className="space-y-6 order-1 xl:order-2">
                    {/* Kekerapan Sebab */}
                    <div className="bg-white rounded-xl p-4 sm:p-6 border border-slate-200 shadow-sm">
                      <h4 className="text-[10px] sm:text-xs font-bold text-slate-400 uppercase tracking-wider mb-4 flex items-center">
                        <AlertCircle className="w-4 h-4 mr-2 text-orange-500" /> Kekerapan Sebab
                      </h4>
                      <div className="space-y-3">
                        {Object.entries(reasonFrequency)
                          .sort((a: any, b: any) => b[1] - a[1])
                          .map(([reason, count]: [string, any]) => (
                            <div key={reason} className="flex items-center justify-between">
                              <span className="text-xs sm:text-sm text-slate-600 truncate mr-2" title={reason}>{reason}</span>
                              <span className="px-2 py-0.5 bg-orange-50 text-orange-600 text-[10px] sm:text-xs font-bold rounded-full shrink-0">
                                {count} Kes
                              </span>
                            </div>
                          ))}
                        {Object.keys(reasonFrequency).length === 0 && (
                          <p className="text-xs text-slate-400 italic">Tiada data.</p>
                        )}
                      </div>
                    </div>

                    {/* Kekerapan Murid Tidak Hadir */}
                    <div className="bg-white rounded-xl p-4 sm:p-6 border border-slate-200 shadow-sm">
                      <h4 className="text-[10px] sm:text-xs font-bold text-slate-400 uppercase tracking-wider mb-4 flex items-center">
                        <User className="w-4 h-4 mr-2 text-blue-500" /> Kekerapan Murid
                      </h4>
                      <div className="space-y-3 max-h-[250px] overflow-y-auto pr-2 custom-scrollbar">
                        {Object.entries(studentAbsenceFrequency)
                          .sort((a: any, b: any) => b[1] - a[1])
                          .slice(0, 10) // Top 10
                          .map(([student, count]: [string, any]) => (
                            <div key={student} className="flex items-center justify-between">
                              <span className="text-xs sm:text-sm text-slate-600 truncate mr-2" title={student}>{student}</span>
                              <span className="px-2 py-0.5 bg-blue-50 text-blue-600 text-[10px] sm:text-xs font-bold rounded-full shrink-0">
                                {count} Kali
                              </span>
                            </div>
                          ))}
                        {Object.keys(studentAbsenceFrequency).length === 0 && (
                          <p className="text-xs text-slate-400 italic">Tiada data.</p>
                        )}
                      </div>
                      {Object.keys(studentAbsenceFrequency).length > 10 && (
                        <p className="text-[9px] text-slate-400 mt-3 text-center italic">* Menunjukkan 10 murid teratas sahaja</p>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        <div className={`grid grid-cols-1 ${userRole === 'teacher' ? '' : 'lg:grid-cols-3'} gap-8`}>
          {userRole === 'student' && (
            <div className="lg:col-span-1">
              <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
                <div className="px-6 py-5 border-b border-slate-100 bg-slate-50/50 flex items-center justify-between">
                  <h2 className="text-lg font-semibold text-slate-800 flex items-center">
                    <PlusCircle className="w-5 h-5 mr-2 text-blue-600" />
                    Maklumkan Ketidakhadiran
                  </h2>
                </div>
                <form onSubmit={handleSubmit} className="p-6 space-y-5">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Tarikh Tidak Hadir <span className="text-red-500">*</span></label>
                    <input 
                      type="date" 
                      value={date}
                      onChange={(e) => setDate(e.target.value)}
                      className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all text-sm"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Sebab <span className="text-red-500">*</span></label>
                    <select 
                      value={reason}
                      onChange={(e) => setReason(e.target.value)}
                      className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all text-sm bg-white"
                      required
                    >
                      <option value="" disabled>Pilih sebab...</option>
                      <optgroup label="AKTIVITI LUAR SEKOLAH">
                        <option value="AKTIVITI LUAR SEKOLAH - Wakil sekolah (rasmi)">Wakil sekolah (rasmi)</option>
                      </optgroup>
                      <optgroup label="BENCANA ALAM">
                        <option value="BENCANA ALAM - Jerebu">Jerebu</option>
                        <option value="BENCANA ALAM - Kemalangan">Kemalangan</option>
                        <option value="BENCANA ALAM - Banjir">Banjir</option>
                        <option value="BENCANA ALAM - Gempa bumi">Gempa bumi</option>
                        <option value="BENCANA ALAM - Hujan lebat / ribut taufan">Hujan lebat / ribut taufan</option>
                        <option value="BENCANA ALAM - Pencemaran udara">Pencemaran udara</option>
                        <option value="BENCANA ALAM - Kemarau">Kemarau</option>
                        <option value="BENCANA ALAM - Cuaca panas El Nino">Cuaca panas El Nino</option>
                        <option value="BENCANA ALAM - Pencemaran sisa kimia">Pencemaran sisa kimia</option>
                        <option value="BENCANA ALAM - Pencemaran alam">Pencemaran alam</option>
                        <option value="BENCANA ALAM - Tanah runtuh">Tanah runtuh</option>
                      </optgroup>
                      <optgroup label="ANCAMAN KESELAMATAN">
                        <option value="ANCAMAN KESELAMATAN - Binatang liar / bisa / berbisa">Binatang liar / bisa / berbisa</option>
                        <option value="ANCAMAN KESELAMATAN - Diculik">Diculik</option>
                        <option value="ANCAMAN KESELAMATAN - Gangguan mistik / makhluk halus">Gangguan mistik / makhluk halus</option>
                        <option value="ANCAMAN KESELAMATAN - Gangguan kumpulan kongsi gelap">Gangguan kumpulan kongsi gelap</option>
                        <option value="ANCAMAN KESELAMATAN - Kebakaran">Kebakaran</option>
                        <option value="ANCAMAN KESELAMATAN - Pengganas / samun">Pengganas / samun</option>
                        <option value="ANCAMAN KESELAMATAN - Rusuhan di luar kawasan sekolah">Rusuhan di luar kawasan sekolah</option>
                        <option value="ANCAMAN KESELAMATAN - Ugutan daripada pihak luar">Ugutan daripada pihak luar</option>
                        <option value="ANCAMAN KESELAMATAN - Mangsa buli">Mangsa buli</option>
                        <option value="ANCAMAN KESELAMATAN - Mangsa seksual">Mangsa seksual</option>
                        <option value="ANCAMAN KESELAMATAN - Tidak dapat dikesan / hilang">Tidak dapat dikesan / hilang</option>
                      </optgroup>
                      <optgroup label="MASALAH KELUARGA">
                        <option value="MASALAH KELUARGA - Bekerja">Bekerja</option>
                        <option value="MASALAH KELUARGA - Berpindah randah">Berpindah randah</option>
                        <option value="MASALAH KELUARGA - Perebutan hak">Perebutan hak</option>
                        <option value="MASALAH KELUARGA - Penjagaan anak">Penjagaan anak</option>
                        <option value="MASALAH KELUARGA - Mengikut keluarga bercuti / berkursus">Mengikut keluarga bercuti / berkursus</option>
                        <option value="MASALAH KELUARGA - Menjaga / menguruskan ahli keluarga">Menjaga / menguruskan ahli keluarga</option>
                        <option value="MASALAH KELUARGA - Menjaga ahli keluarga yang sakit">Menjaga ahli keluarga yang sakit</option>
                        <option value="MASALAH KELUARGA - Kematian ahli keluarga terdekat">Kematian ahli keluarga terdekat</option>
                        <option value="MASALAH KELUARGA - Kesempitan hidup">Kesempitan hidup</option>
                        <option value="MASALAH KELUARGA - Masalah pengangkutan">Masalah pengangkutan</option>
                        <option value="MASALAH KELUARGA - Menziarahi keluarga sakit">Menziarahi keluarga sakit</option>
                        <option value="MASALAH KELUARGA - Balik kampung">Balik kampung</option>
                        <option value="MASALAH KELUARGA - Berpindah ke luar negara">Berpindah ke luar negara</option>
                        <option value="MASALAH KELUARGA - Krisis keluarga">Krisis keluarga</option>
                        <option value="MASALAH KELUARGA - Lari dari rumah">Lari dari rumah</option>
                      </optgroup>
                      <optgroup label="MASALAH PERIBADI">
                        <option value="MASALAH PERIBADI - Tekanan perasaan / trauma">Tekanan perasaan / trauma</option>
                        <option value="MASALAH PERIBADI - Kesakitan akibat haid / permulaan haid">Kesakitan akibat haid / permulaan haid</option>
                      </optgroup>
                      <optgroup label="PONTENG">
                        <option value="PONTENG - Bangun lewat">Bangun lewat</option>
                        <option value="PONTENG - Malas ke sekolah">Malas ke sekolah</option>
                        <option value="PONTENG - Ketagihan gajet">Ketagihan gajet</option>
                        <option value="PONTENG - Tidak menyiapkan kerja sekolah">Tidak menyiapkan kerja sekolah</option>
                        <option value="PONTENG - Malas ke aktiviti kokurikulum">Malas ke aktiviti kokurikulum</option>
                      </optgroup>
                      <optgroup label="KEBENARAN GURU BESAR">
                        <option value="KEBENARAN GURU BESAR - Haji / Umrah / kegiatan agama">Haji / Umrah / kegiatan agama</option>
                        <option value="KEBENARAN GURU BESAR - Peperiksaan / ujian selain KPM">Peperiksaan / ujian selain KPM</option>
                        <option value="KEBENARAN GURU BESAR - Pertandingan / aktiviti selain KPM">Pertandingan / aktiviti selain KPM</option>
                        <option value="KEBENARAN GURU BESAR - Proses perpindahan sekolah">Proses perpindahan sekolah</option>
                        <option value="KEBENARAN GURU BESAR - Terlibat kes jenayah">Terlibat kes jenayah</option>
                        <option value="KEBENARAN GURU BESAR - Terlibat kes trafik">Terlibat kes trafik</option>
                        <option value="KEBENARAN GURU BESAR - Urusan rasmi agensi kerajaan">Urusan rasmi agensi kerajaan</option>
                        <option value="KEBENARAN GURU BESAR - Latihan / ujian lesen memandu">Latihan / ujian lesen memandu</option>
                        <option value="KEBENARAN GURU BESAR - Tahanan pihak berkuasa">Tahanan pihak berkuasa</option>
                        <option value="KEBENARAN GURU BESAR - Terlibat prosiding mahkamah">Terlibat prosiding mahkamah</option>
                        <option value="KEBENARAN GURU BESAR - Perlindungan Jabatan Kebajikan Masyarakat">Perlindungan Jabatan Kebajikan Masyarakat</option>
                      </optgroup>
                      <optgroup label="MASALAH KESIHATAN">
                        <option value="MASALAH KESIHATAN - Demam">Demam</option>
                        <option value="MASALAH KESIHATAN - Batuk / selesema">Batuk / selesema</option>
                        <option value="MASALAH KESIHATAN - Covid-19">Covid-19</option>
                        <option value="MASALAH KESIHATAN - Influenza">Influenza</option>
                        <option value="MASALAH KESIHATAN - HFMD">HFMD</option>
                        <option value="MASALAH KESIHATAN - Denggi">Denggi</option>
                        <option value="MASALAH KESIHATAN - Malaria">Malaria</option>
                        <option value="MASALAH KESIHATAN - Sakit perut">Sakit perut</option>
                        <option value="MASALAH KESIHATAN - Migrain">Migrain</option>
                        <option value="MASALAH KESIHATAN - Asma">Asma</option>
                        <option value="MASALAH KESIHATAN - Sakit mata">Sakit mata</option>
                        <option value="MASALAH KESIHATAN - Cirit-birit">Cirit-birit</option>
                        <option value="MASALAH KESIHATAN - Penyakit berjangkit lain">Penyakit berjangkit lain</option>
                      </optgroup>
                    </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Catatan Tambahan</label>
                  <textarea 
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    rows={3}
                    placeholder="Contoh: Demam denggi, warded..."
                    className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all text-sm resize-none"
                  ></textarea>
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Muat Naik Bukti (MC/Surat)</label>
                  <div className="mt-1 flex justify-center px-6 pt-5 pb-6 border-2 border-slate-300 border-dashed rounded-lg hover:border-blue-500 hover:bg-blue-50 transition-colors relative group">
                    <div className="space-y-1 text-center">
                      <Upload className="mx-auto h-12 w-12 text-slate-400 group-hover:text-blue-500 transition-colors" />
                      <div className="flex text-sm text-slate-600 justify-center">
                        <label htmlFor="file-upload" className="relative cursor-pointer bg-white rounded-md font-medium text-blue-600 hover:text-blue-500 focus-within:outline-none focus-within:ring-2 focus-within:ring-offset-2 focus-within:ring-blue-500 px-1">
                          <span>Pilih fail</span>
                          <input id="file-upload" name="file-upload" type="file" className="sr-only" onChange={handleFileChange} accept=".jpg,.jpeg,.png,.pdf" />
                        </label>
                      </div>
                      <p className="text-xs text-slate-500">PNG, JPG, PDF sehingga 50MB</p>
                    </div>
                  </div>
                  {file && (
                    <div className="mt-3 flex items-center p-2 bg-blue-50 rounded-lg border border-blue-100">
                      <Paperclip className="w-4 h-4 text-blue-500 mr-2 shrink-0" />
                      <span className="text-sm text-blue-700 truncate">{file.name}</span>
                      <button type="button" onClick={() => setFile(null)} className="ml-auto text-blue-400 hover:text-red-500">
                         <AlertCircle className="w-4 h-4 rotate-45" />
                      </button>
                    </div>
                  )}
                </div>

                <button 
                  type="submit"
                  disabled={isSubmitting}
                  className={`w-full flex justify-center py-2.5 px-4 border border-transparent rounded-lg shadow-sm text-sm font-medium text-white transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 ${isSubmitting ? 'bg-blue-400 cursor-not-allowed' : 'bg-blue-600 hover:bg-blue-700'}`}
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                      Menghantar...
                    </>
                  ) : (
                    'Hantar Makluman'
                  )}
                </button>
              </form>
            </div>
          </div>
          )}

          <div className={userRole === 'teacher' ? '' : 'lg:col-span-2'}>
            <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden h-full">
               <div className="px-6 py-5 border-b border-slate-100 bg-slate-50/50">
                <h2 className="text-lg font-semibold text-slate-800 flex items-center">
                  <FileText className="w-5 h-5 mr-2 text-blue-600" />
                  {userRole === 'teacher' ? 'Semua Rekod Ketidakhadiran' : 'Rekod Ketidakhadiran Saya'}
                </h2>
              </div>
              
              <div className="overflow-x-auto">
                <table className="w-full text-sm text-left text-slate-600">
                  <thead className="text-xs text-slate-500 uppercase bg-slate-50 border-b border-slate-200">
                    <tr>
                      <th scope="col" className="px-6 py-4 font-medium">Tarikh</th>
                      {userRole === 'teacher' && <th scope="col" className="px-6 py-4 font-medium">Nama Murid & Kelas</th>}
                      <th scope="col" className="px-6 py-4 font-medium">Sebab & Catatan</th>
                      <th scope="col" className="px-6 py-4 font-medium">Bukti</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {displayedRecords.length === 0 ? (
                      <tr>
                        <td colSpan={userRole === 'teacher' ? 4 : 3} className="px-6 py-8 text-center text-slate-400">
                          Tiada rekod ketidakhadiran ditemui.
                        </td>
                      </tr>
                    ) : (
                      displayedRecords.map((record) => (
                        <tr key={record.id} className="hover:bg-slate-50/80 transition-colors">
                          <td className="px-6 py-4 whitespace-nowrap font-medium text-slate-800">
                            {new Date(record.date).toLocaleDateString('ms-MY', { day: 'numeric', month: 'short', year: 'numeric' })}
                          </td>
                          {userRole === 'teacher' && (
                            <td className="px-6 py-4">
                              <div className="font-medium text-slate-800">{record.studentName}</div>
                              <div className="text-slate-500 text-xs mt-0.5">{record.className}</div>
                            </td>
                          )}
                          <td className="px-6 py-4">
                            <div className="font-medium text-slate-800">{record.reason}</div>
                            {record.notes && <div className="text-slate-500 text-xs mt-0.5 line-clamp-1">{record.notes}</div>}
                          </td>
                          <td className="px-6 py-4">
                            {record.proof && record.proof !== 'Tiada Bukti' ? (
                              <button 
                                onClick={() => handleDownload(record)}
                                className="flex items-center text-blue-600 hover:text-blue-800 hover:underline transition-colors group"
                              >
                                <Paperclip className="w-4 h-4 mr-1 text-slate-400 group-hover:text-blue-600" />
                                <span className="truncate max-w-[120px]" title={record.proof}>
                                  {record.proof.startsWith('http') ? 'Lihat Bukti' : record.proof}
                                </span>
                                <ExternalLink className="w-3 h-3 ml-1 opacity-0 group-hover:opacity-100 transition-opacity" />
                              </button>
                            ) : (
                              <span className="text-slate-400 text-xs italic">Tiada Bukti</span>
                            )}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>

        </div>
      </main>
    </div>
  );
}
