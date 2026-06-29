// 🌸 AIKO BBF — Fetch data dari Google Sheets untuk GitHub Action
const fs = require('fs');

async function main() {
  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
  const refreshToken = process.env.GOOGLE_REFRESH_TOKEN;
  const sid = process.env.SHEET_ID;

  if (!clientId || !clientSecret || !refreshToken) {
    console.log('ERROR: Google credentials not set in environment');
    process.exit(1);
  }

  // Refresh token OAuth
  const r1 = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: {'Content-Type': 'application/x-www-form-urlencoded'},
    body: new URLSearchParams({
      client_id: clientId,
      client_secret: clientSecret,
      refresh_token: refreshToken,
      grant_type: 'refresh_token'
    })
  });
  const auth = await r1.json();
  if (!auth.access_token) {
    console.log('ERROR: Failed to refresh token');
    process.exit(1);
  }
  const bearer = 'Bearer ' + auth.access_token;

  const pa = v => { if (!v) return 0; if (typeof v === 'number') return v; return parseFloat(v.toString().replace(/[^0-9.,-]/g,'').replace(/,/g,''))||0; };
  const bln = ['Januari','Februari','Maret','April','Mei','Juni','Juli','Agustus','September','Oktober','November','Desember'];
  const bln3 = ['Jan','Feb','Mar','Apr','Mei','Jun','Jul','Agu','Sep','Okt','Nov','Des'];

  // Baca pengeluaran
  const r2 = await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${sid}/values/Rekap%20pengeluaran%202026?majorDimension=ROWS`, {
    headers: { 'Authorization': bearer }
  });
  const {values: rows} = await r2.json();

  // Baca income
  const r3 = await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${sid}/values/Rekap%20income%202026?valueRenderOption=UNFORMATTED_VALUE&majorDimension=ROWS`, {
    headers: { 'Authorization': bearer }
  });
  const {values: incRows} = await r3.json();

  // Parsing income
  const income = {};
  for (let i = 0; i < incRows.length; i++) {
    const row = incRows[i];
    if (!row) continue;
    if (row[12]) {
      const b = (row[12]||'').toString().trim();
      if (bln.includes(b) && row[18]) income[b] = pa(row[18]);
    }
  }

  // Parsing rekap pengeluaran
  const rekap = [];
  for (let i = 1; i < rows.length; i++) {
    const b = (rows[i][6]||'').toString().trim();
    if (bln.includes(b)) {
      const bi = bln.indexOf(b);
      rekap.push({
        bulan: bln3[bi], expense: pa(rows[i][20]),
        transport: pa(rows[i][7]), tagihan: pa(rows[i][8]),
        makan: pa(rows[i][9]), belanja: pa(rows[i][10]),
        rokok: pa(rows[i][11]), lain: pa(rows[i][12]),
        kesehatan: pa(rows[i][13]), service: pa(rows[i][14]),
        pakaian: pa(rows[i][15]), modal: pa(rows[i][16]),
        rekreasi: pa(rows[i][17]), saving: pa(rows[i][18]),
        saham: pa(rows[i][19])
      });
    }
  }

  // Gabung
  const bulanan = rekap.map(rb => {
    const blnFull = bln[bln3.indexOf(rb.bulan)];
    return {
      bulan: rb.bulan, income: income[blnFull] || 0, expense: rb.expense || 0,
      detail: { transport: rb.transport, tagihan: rb.tagihan, makan: rb.makan,
        belanja: rb.belanja, rokok: rb.rokok, lain: rb.lain,
        kesehatan: rb.kesehatan, service: rb.service, pakaian: rb.pakaian,
        modal: rb.modal, rekreasi: rb.rekreasi, saving: rb.saving, saham: rb.saham }
    };
  });

  // Transaksi terbaru
  const tx = [];
  for (let i = rows.length-1; i >= 1; i--) {
    const row = rows[i];
    if (!row[0] || !row[4]) continue;
    const tgl = (row[0]||'').toString();
    if (!tgl.match(/\d/)) continue;
    tx.push({ tgl, ket: (row[1]||'').toString(), kat: (row[3]||'').toString(), nilai: pa(row[4]), jenis: 'expense' });
    if (tx.length >= 100) break;
  }

  // Kategori
  const wMap = { transport:'#60a5fa', tagihan:'#f87171', makan:'#fbbf24', belanja:'#34d399', rokok:'#a78bfa', lain:'#6b7280', kesehatan:'#ec4899', service:'#f97316', pakaian:'#8b5cf6', modal:'#14b8a6', rekreasi:'#06b6d4', saving:'#10b981', saham:'#6366f1' };
  const nMap = { transport:'Transport', tagihan:'Tagihan', makan:'Makan', belanja:'Belanja', rokok:'Rokok & Kopi', lain:'Lain-lain', kesehatan:'Kesehatan', service:'Service', pakaian:'Pakaian', modal:'Modal', rekreasi:'Rekreasi', saving:'Saving', saham:'Saham' };
  const lb = [...rekap].reverse().find(b => b.expense > 0) || rekap[rekap.length-1] || {};
  const kategori = Object.entries(nMap).map(([k,n]) => ({ nama: n, nilai: lb[k] || 0, warna: wMap[k] })).filter(k => k.nilai > 0);

  // Simpan
  const result = { bulanan, kategori, transaksi: tx };
  fs.writeFileSync('data/data.json', JSON.stringify(result, null, 2));
  console.log('✅ Data updated successfully!');
  console.log(`Bulanan: ${bulanan.length} | Kategori: ${kategori.length} | Transaksi: ${tx.length}`);
}

main().catch(e => { console.error('ERR:', e.message); process.exit(1); });
