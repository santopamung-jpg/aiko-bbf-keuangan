// 🌸 AIKO BBF — Dashboard Keuangan API
const SHEET_ID = '1pFXNG_Qxkx1hhMbd6_E4ETbNGo_laUl7tU9ODrcIq-s';

function doGet(e) {
  try {
    const ss = SpreadsheetApp.openById(SHEET_ID);
    const r = ss.getSheetByName('Rekap pengeluaran 2026').getDataRange().getValues();
    const inc = ss.getSheetByName('Rekap income 2026').getDataRange().getValues();
    
    const bulanIndo = ['Januari','Februari','Maret','April','Mei','Juni','Juli','Agustus','September','Oktober','November','Desember'];
    
    // === REKAP BULANAN ===
    const rekap = [];
    for (let i = 1; i < r.length; i++) {
      const b = (r[i][6]||'').toString().trim();
      if (bulanIndo.includes(b)) {
        rekap.push({
          bulan: b, total: parseAmt(r[i][20]),
          makan: parseAmt(r[i][9]), transport: parseAmt(r[i][7]),
          tagihan: parseAmt(r[i][8]), belanja: parseAmt(r[i][10]),
          kesehatan: parseAmt(r[i][13]), saving: parseAmt(r[i][18])
        });
      }
    }
    
    // === INCOME ===
    const incomeMap = {};
    for (let i = 1; i < inc.length; i++) {
      const b = (inc[i][0]||'').toString().trim();
      if (bulanIndo.includes(b)) incomeMap[b] = parseAmt(inc[i][8]);
    }
    
    const bulanan = rekap.map(rb => ({
      bulan: rb.bulan,
      income: incomeMap[rb.bulan] || 0,
      expense: rb.total || 0
    }));
    
    // === BULAN TERAKHIR (pake data) ===
    const lb = [...rekap].reverse().find(b => b.total > 0) || rekap[rekap.length-1] || {};
    const kategori = [];
    const katData = [
      ['Transport', lb.transport, '#60a5fa'],
      ['Tagihan', lb.tagihan, '#f87171'],
      ['Makan', lb.makan, '#fbbf24'],
      ['Belanja', lb.belanja, '#34d399'],
      ['Kesehatan', lb.kesehatan, '#ec4899'],
      ['Saving', lb.saving, '#10b981'],
    ];
    katData.forEach(([n, v, w]) => { if (v > 0) kategori.push({nama: n, nilai: v, warna: w}); });
    
    // === TRANSAKSI ===
    const tx = [];
    for (let i = r.length - 1; i >= 1; i--) {
      const row = r[i];
      if (!row[0] || !row[4]) continue;
      const tgl = (row[0]||'').toString();
      if (!tgl.match(/\d/)) continue;
      tx.push({
        tgl: tgl, ket: (row[1]||'').toString(),
        kat: (row[3]||'').toString(), nilai: parseAmt(row[4]), jenis: 'expense'
      });
      if (tx.length >= 50) break;
    }
    
    return jsonRes({ bulanan, kategori, transaksi: tx });
    
  } catch (err) {
    return jsonRes({ error: err.message });
  }
}

function parseAmt(v) {
  if (!v) return 0;
  if (typeof v === 'number') return v;
  return parseFloat(v.toString().replace(/[^0-9.,-]/g, '').replace(/,/g, '')) || 0;
}

function jsonRes(d) {
  return ContentService.createTextOutput(JSON.stringify(d)).setMimeType(ContentService.MimeType.JSON);
}
