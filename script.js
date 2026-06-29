// ============================================
// 🌸 AIKO BBF — Dashboard Keuangan
// ============================================

// === KONFIGURASI ===
const CONFIG = {
  // Ganti URL ini setelah deploy Google Apps Script
  apiUrl: '',  // Contoh: 'https://script.google.com/macros/s/.../exec'
  
  // Fallback: Google Sheets API (kalau Apps Script belum ready)
  sheetId: '1pFXNG_Qxkx1hhMbd6_E4ETbNGo_laUl7tU9ODrcIq-s',
};

// === FORMAT RUPIAH ===
const fmtRp = (num) => {
  if (num === undefined || num === null || isNaN(num)) return '-';
  return 'Rp' + Math.round(num).toLocaleString('id-ID');
};

const parseAmount = (v) => {
  if (!v) return 0;
  return parseFloat(v.toString().replace(/[^0-9.,-]/g, '').replace(/,/g, '')) || 0;
};

// === DATA SAMPLE (untuk development) ===
const SAMPLE_DATA = {
  bulanan: [
    { bulan: 'April', income: 8804500, expense: 8020100 },
    { bulan: 'Mei', income: 8283500, expense: 6761362 },
    { bulan: 'Juni', income: 12343500, expense: 7323700 },
    { bulan: 'Juli', income: 0, expense: 0 },
  ],
  kategori: [
    { nama: 'Transport', nilai: 251000, warna: '#60a5fa' },
    { nama: 'Tagihan', nilai: 2695700, warna: '#f87171' },
    { nama: 'Makan', nilai: 55000, warna: '#fbbf24' },
    { nama: 'Belanja', nilai: 1227100, warna: '#34d399' },
    { nama: 'Rokok & Kopi', nilai: 264500, warna: '#a78bfa' },
    { nama: 'Lain-lain', nilai: 513000, warna: '#6b7280' },
    { nama: 'Kesehatan', nilai: 797900, warna: '#ec4899' },
    { nama: 'Service', nilai: 95000, warna: '#f97316' },
    { nama: 'Pakaian', nilai: 99500, warna: '#8b5cf6' },
    { nama: 'Modal', nilai: 425000, warna: '#14b8a6' },
    { nama: 'Rekreasi', nilai: 100000, warna: '#06b6d4' },
    { nama: 'Saving', nilai: 500000, warna: '#10b981' },
    { nama: 'Saham', nilai: 300000, warna: '#6366f1' },
  ],
  transaksi: [
    { tgl: '28/06/2026', ket: 'Jajan sate, sushi, es potong', kat: 'Makan diluar', nilai: 65000, jenis: 'expense' },
    { tgl: '27/06/2026', ket: 'Benecol', kat: 'Makan diluar', nilai: 9000, jenis: 'expense' },
    { tgl: '26/06/2026', ket: 'Jajan Popmie + Le Mineral', kat: 'Makan diluar', nilai: 24000, jenis: 'expense' },
    { tgl: '25/06/2026', ket: 'Cilot 2 bgks dan sotong', kat: 'Makan diluar', nilai: 15000, jenis: 'expense' },
    { tgl: '25/06/2026', ket: 'Roti', kat: 'Makan diluar', nilai: 20000, jenis: 'expense' },
    { tgl: '24/06/2026', ket: 'Martabak', kat: 'Makan diluar', nilai: 25000, jenis: 'expense' },
    { tgl: '21/06/2026', ket: 'Gaji Suami', kat: 'Gaji', nilai: 7868500, jenis: 'income' },
    { tgl: '21/06/2026', ket: 'makan es kolak ketan', kat: 'Makan diluar', nilai: 46200, jenis: 'expense' },
    { tgl: '20/06/2026', ket: 'Lotek sabtu', kat: 'Makan diluar', nilai: 33000, jenis: 'expense' },
    { tgl: '20/06/2026', ket: 'Dawet', kat: 'Makan diluar', nilai: 18000, jenis: 'expense' },
  ]
};

// === STATE ===
let chartInstance = null;
let dataTransaksi = [];

// === LOAD DATA ===
async function loadData() {
  showLoading(true);
  hideError();
  
  try {
    let data;
    if (CONFIG.apiUrl) {
      data = await fetchApi();
    } else {
      // Pakai sample data + hitung total dari kategori
      data = await fetchGoogleSheets();
      if (!data) data = SAMPLE_DATA;
    }
    
    render(data);
    showLoading(false);
  } catch (e) {
    console.error(e);
    // Fallback ke sample data
    render(SAMPLE_DATA);
    showLoading(false);
    showError('⚠️ Gagal ambil data dari server, pakai data demo. ' + e.message);
  }
}

// === FETCH DARI GOOGLE SHEETS API ===
async function fetchGoogleSheets() {
  try {
    // Coba ambil data dari Google Sheets via public export (CSV)
    const url = `https://docs.google.com/spreadsheets/d/${CONFIG.sheetId}/gviz/tq?tqx=out:json&sheet=Rekap+pengeluaran+2026`;
    const res = await fetch(url, { mode: 'cors' });
    if (!res.ok) throw new Error('Gagal fetch');
    
    const text = await res.text();
    // Parse google visualization response
    const jsonStr = text.match(/google\.visualization\.Query\.setResponse\((.*)\)/s);
    if (!jsonStr) throw new Error('Format tidak dikenali');
    
    const json = JSON.parse(jsonStr[1]);
    return parseGvizData(json);
  } catch (e) {
    console.warn('Gagal fetch Google Sheets:', e.message);
    return null;
  }
}

function parseGvizData(json) {
  if (!json.table || !json.table.rows) return null;
  
  const cols = json.table.cols.map(c => c.label);
  const rows = json.table.rows.map(r => r.c.map(c => c ? c.v : ''));
  
  // Filter transaksi (baris dengan tanggal)
  const transaksi = [];
  for (let i = 1; i < rows.length; i++) {
    const row = rows[i];
    if (!row[0] || !row[4]) continue;
    const tgl = row[0];
    if (!tgl.toString().match(/\d/)) continue; // skip baris non-transaksi
    
    const nilai = parseAmount(row[4]);
    if (nilai === 0) continue;
    
    transaksi.push({
      tgl: tgl.toString(),
      ket: row[1] || '-',
      kat: row[3] || 'Lain-lain',
      nilai: nilai,
      jenis: 'expense'
    });
  }
  
  return {
    ...SAMPLE_DATA,
    transaksi: transaksi.slice(0, 50),
    totalTransaksi: transaksi.length
  };
}

// === FETCH DARI APPS SCRIPT ===
async function fetchApi() {
  const res = await fetch(CONFIG.apiUrl);
  if (!res.ok) throw new Error('HTTP ' + res.status);
  return await res.json();
}

// === RENDER ===
function render(data) {
  // Ambil bulan terakhir yang ada datanya
  const bulanTerakhir = data.bulanan.filter(b => b.income > 0 || b.expense > 0);
  const bulanAktif = bulanTerakhir[bulanTerakhir.length - 1] || data.bulanan[0];
  
  // Hitung ringkasan
  const income = bulanAktif.income;
  const expense = bulanAktif.expense;
  const sisa = income - expense;
  const rate = income > 0 ? (sisa / income * 100) : 0;
  
  // Update ringkasan
  document.getElementById('totalIncome').textContent = fmtRp(income);
  document.getElementById('totalExpense').textContent = fmtRp(expense);
  document.getElementById('totalSisa').textContent = fmtRp(sisa);
  document.getElementById('savingRate').textContent = rate > 0 ? rate.toFixed(1) + '%' : '-';
  
  // Badge bulan
  const bulanNames = ['','Januari','Februari','Maret','April','Mei','Juni','Juli','Agustus','September','Oktober','November','Desember'];
  const d = new Date();
  document.getElementById('bulanSekarang').textContent = bulanNames[d.getMonth()] + ' ' + d.getFullYear();
  
  // Chart
  renderChart(data.bulanan);
  
  // Kategori
  renderKategori(data.kategori);
  
  // Filter bulan
  renderFilter(data);
  
  // Transaksi
  dataTransaksi = data.transaksi || [];
  renderTransaksi(dataTransaksi);
}

// === CHART ===
function renderChart(data) {
  const ctx = document.getElementById('grafikBulanan').getContext('2d');
  
  if (chartInstance) chartInstance.destroy();
  
  const labels = data.map(d => d.bulan);
  const incomeData = data.map(d => d.income);
  const expenseData = data.map(d => d.expense);
  
  chartInstance = new Chart(ctx, {
    type: 'bar',
    data: {
      labels,
      datasets: [
        {
          label: 'Pemasukan',
          data: incomeData,
          backgroundColor: 'rgba(52, 211, 153, 0.7)',
          borderColor: '#34d399',
          borderWidth: 1,
          borderRadius: 4,
        },
        {
          label: 'Pengeluaran',
          data: expenseData,
          backgroundColor: 'rgba(248, 113, 113, 0.7)',
          borderColor: '#f87171',
          borderWidth: 1,
          borderRadius: 4,
        }
      ]
    },
    options: {
      responsive: true,
      plugins: {
        legend: {
          position: 'top',
          labels: { font: { size: 12 } }
        }
      },
      scales: {
        y: {
          beginAtZero: true,
          ticks: {
            callback: (v) => 'Rp' + (v / 1000).toFixed(0) + 'rb'
          }
        }
      }
    }
  });
}

// === KATEGORI ===
function renderKategori(data) {
  const grid = document.getElementById('kategoriGrid');
  grid.innerHTML = '';
  
  const total = data.reduce((s, d) => s + d.nilai, 0);
  
  data.filter(d => d.nilai > 0).forEach(d => {
    const pct = total > 0 ? (d.nilai / total * 100) : 0;
    const el = document.createElement('div');
    el.className = 'kat-item';
    el.innerHTML = `
      <div>
        <div class="kat-nama">${d.nama}</div>
        <div style="font-size:10px;color:#9ca3af;">${pct.toFixed(1)}%</div>
      </div>
      <div class="kat-nilai" style="color:${d.warna}">${fmtRp(d.nilai)}</div>
    `;
    grid.appendChild(el);
  });
}

// === FILTER ===
function renderFilter(data) {
  const bulanSet = new Set();
  const katSet = new Set();
  
  (data.transaksi || []).forEach(t => {
    if (t.tgl) {
      const parts = t.tgl.split(/[/-]/);
      if (parts.length >= 2) {
        const bln = ['','Jan','Feb','Mar','Apr','Mei','Jun','Jul','Agu','Sep','Okt','Nov','Des'][parseInt(parts[1])];
        if (bln) bulanSet.add(bln);
      }
    }
    if (t.kat) katSet.add(t.kat);
  });
  
  const filterBulan = document.getElementById('filterBulan');
  const filterKat = document.getElementById('filterKategori');
  
  // Simpan selected values
  const selectedBulan = filterBulan.value;
  const selectedKat = filterKat.value;
  
  filterBulan.innerHTML = '<option value="all">Semua Bulan</option>' +
    [...bulanSet].map(b => `<option value="${b}" ${b === selectedBulan ? 'selected' : ''}>${b}</option>`).join('');
  
  filterKat.innerHTML = '<option value="all">Semua Kategori</option>' +
    [...katSet].sort().map(k => `<option value="${k}" ${k === selectedKat ? 'selected' : ''}>${k}</option>`).join('');
}

// === TRANSAKSI ===
function renderTransaksi(data) {
  const list = document.getElementById('transaksiList');
  list.innerHTML = '';
  
  const filterBulan = document.getElementById('filterBulan').value;
  const filterKat = document.getElementById('filterKategori').value;
  
  let filtered = [...data];
  
  if (filterBulan !== 'all') {
    filtered = filtered.filter(t => {
      const parts = t.tgl.split(/[/-]/);
      const bln = ['','Jan','Feb','Mar','Apr','Mei','Jun','Jul','Agu','Sep','Okt','Nov','Des'][parseInt(parts[1])];
      return bln === filterBulan;
    });
  }
  
  if (filterKat !== 'all') {
    filtered = filtered.filter(t => t.kat === filterKat);
  }
  
  if (filtered.length === 0) {
    list.innerHTML = '<div class="tx-item" style="justify-content:center;color:var(--text-light);">Tidak ada transaksi</div>';
    return;
  }
  
  filtered.forEach(t => {
    const isIncome = t.jenis === 'income';
    const el = document.createElement('div');
    el.className = 'tx-item';
    el.innerHTML = `
      <div class="tx-left">
        <div class="tx-tanggal">${t.tgl}</div>
        <div class="tx-ket">${t.ket}</div>
        <span class="tx-kategori">${t.kat}</span>
      </div>
      <div class="tx-nilai ${t.jenis}">${isIncome ? '+' : '-'}${fmtRp(t.nilai)}</div>
    `;
    list.appendChild(el);
  });
}

// === UI HELPERS ===
function showLoading(v) {
  document.getElementById('loading').classList.toggle('hidden', !v);
}

function showError(msg) {
  const el = document.getElementById('error');
  el.textContent = msg;
  el.classList.remove('hidden');
}

function hideError() {
  document.getElementById('error').classList.add('hidden');
}

// === INIT ===
document.addEventListener('DOMContentLoaded', loadData);
