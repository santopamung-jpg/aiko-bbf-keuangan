// 🌸 AIKO BBF — Google Apps Script API
// Template ini akan di-copy ke Google Apps Script Editor
// 
// Cara deploy:
// 1. Buka https://script.google.com
// 2. Buat project baru
// 3. Paste kode ini
// 4. Simpan & Deploy > Web App
// 5. Copy URL-nya ke config.js

const SPREADSHEET_ID = '1pFXNG_Qxkx1hhMbd6_E4ETbNGo_laUl7tU9ODrcIq-s';

// =============================================
// ENDPOINT UTAMA — dipanggil dari frontend
// =============================================
function doGet(e) {
  try {
    const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
    const action = e.parameter.action || 'dashboard';
    
    if (action === 'dashboard') {
      return jsonResponse(getDashboardData(ss));
    } else if (action === 'transaksi') {
      const bulan = e.parameter.bulan || '';
      return jsonResponse(getTransaksi(ss, bulan));
    } else if (action === 'rekap_bulanan') {
      return jsonResponse(getRekapBulanan(ss));
    }
    
    return jsonResponse({ error: 'Action tidak dikenal' });
  } catch (err) {
    return jsonResponse({ error: err.message });
  }
}

// =============================================
// AMBIL DATA DASHBOARD
// =============================================
function getDashboardData(ss) {
  const rekapSheet = ss.getSheetByName('Rekap pengeluaran 2026');
  const incomeSheet = ss.getSheetByName('Rekap income 2026');
  
  // === REKAP BULANAN ===
  const rekapData = rekapSheet.getRange(1, 1, rekapSheet.getLastRow(), 21).getValues();
  const header = rekapData[0];
  
  // Cari baris rekap bulanan (kolom G = nama bulan)
  const bulanIndo = ['Januari','Februari','Maret','April','Mei','Juni','Juli','Agustus','September','Oktober','November','Desember'];
  const rekapBulanan = [];
  
  for (let i = 1; i < rekapData.length; i++) {
    const row = rekapData[i];
    const bulan = (row[6] || '').toString().trim();
    if (bulanIndo.includes(bulan)) {
      rekapBulanan.push({
        bulan: bulan,
        transport: parseAmount(row[7]),
        tagihan: parseAmount(row[8]),
        makan: parseAmount(row[9]),
        belanja: parseAmount(row[10]),
        rokok: parseAmount(row[11]),
        lain: parseAmount(row[12]),
        kesehatan: parseAmount(row[13]),
        service: parseAmount(row[14]),
        pakaian: parseAmount(row[15]),
        modal: parseAmount(row[16]),
        rekreasi: parseAmount(row[17]),
        saving: parseAmount(row[18]),
        saham: parseAmount(row[19]),
        total: parseAmount(row[20])
      });
    }
  }
  
  // === INCOME BULANAN ===
  const incomeData = incomeSheet.getRange(1, 1, incomeSheet.getLastRow(), 22).getValues();
  const incomeBulanan = [];
  let currentIncomeRow = null;
  
  for (let i = 1; i < incomeData.length; i++) {
    const row = incomeData[i];
    if (!row[0]) continue;
    
    const val = row[0].toString().trim();
    if (bulanIndo.includes(val)) {
      currentIncomeRow = {
        bulan: val,
        ringkasan: {
          suami: parseAmount(row[6]),
          istri: parseAmount(row[7]),
          total: parseAmount(row[8])
        }
      };
      incomeBulanan.push(currentIncomeRow);
    }
  }
  
  // === GABUNG Income + Expense per bulan ===
  const bulanGabung = rekapBulanan.map(rb => {
    const income = incomeBulanan.find(ib => ib.bulan === rb.bulan);
    return {
      bulan: rb.bulan,
      income: income ? income.ringkasan.total : 0,
      expense: rb.total || 0
    };
  });
  
  // === TRANSAKSI TERBARU ===
  const transaksi = [];
  for (let i = rekapData.length - 1; i >= 1; i--) {
    const row = rekapData[i];
    if (!row[0] || !row[4]) continue;
    const tgl = (row[0] || '').toString().trim();
    if (!tgl.match(/\d/)) continue;
    
    const nilai = parseAmount(row[4]);
    if (nilai === 0) continue;
    
    transaksi.push({
      tgl: tgl,
      ket: (row[1] || '-').toString(),
      kat: (row[3] || 'Lain-lain').toString(),
      nilai: nilai,
      jenis: 'expense'
    });
    if (transaksi.length >= 100) break;
  }
  
  // === KATEGORI (dari bulan terakhir) ===
  const lastBulan = rekapBulanan[rekapBulanan.length - 1] || {};
  const kategori = [
    { nama: 'Transport', nilai: lastBulan.transport || 0, warna: '#60a5fa' },
    { nama: 'Tagihan', nilai: lastBulan.tagihan || 0, warna: '#f87171' },
    { nama: 'Makan', nilai: lastBulan.makan || 0, warna: '#fbbf24' },
    { nama: 'Belanja', nilai: lastBulan.belanja || 0, warna: '#34d399' },
    { nama: 'Rokok & Kopi', nilai: lastBulan.rokok || 0, warna: '#a78bfa' },
    { nama: 'Lain-lain', nilai: lastBulan.lain || 0, warna: '#6b7280' },
    { nama: 'Kesehatan', nilai: lastBulan.kesehatan || 0, warna: '#ec4899' },
    { nama: 'Service', nilai: lastBulan.service || 0, warna: '#f97316' },
    { nama: 'Pakaian', nilai: lastBulan.pakaian || 0, warna: '#8b5cf6' },
    { nama: 'Modal', nilai: lastBulan.modal || 0, warna: '#14b8a6' },
    { nama: 'Rekreasi', nilai: lastBulan.rekreasi || 0, warna: '#06b6d4' },
    { nama: 'Saving', nilai: lastBulan.saving || 0, warna: '#10b981' },
    { nama: 'Saham', nilai: lastBulan.saham || 0, warna: '#6366f1' },
  ].filter(k => k.nilai > 0);
  
  return {
    bulanan: bulanGabung,
    kategori: kategori,
    transaksi: transaksi
  };
}

// =============================================
// HELPER
// =============================================
function parseAmount(v) {
  if (!v) return 0;
  if (typeof v === 'number') return v;
  return parseFloat(v.toString().replace(/[^0-9.,-]/g, '').replace(/,/g, '')) || 0;
}

function jsonResponse(data) {
  return ContentService
    .createTextOutput(JSON.stringify(data))
    .setMimeType(ContentService.MimeType.JSON);
}
