// ============================================
// 🌸 AIKO BBF — Dashboard Keuangan
// ============================================

// === KONFIGURASI ===
const CONFIG = {
  apiUrl: 'https://script.google.com/macros/s/AKfycbwcank1DonC7SeupXIf3dXxwqNuh1WvaSXppUphiyjICrcTj5SVuPldCYCJPTQgbInzgQ/exec',
};

// === FORMAT RUPIAH ===
const fmtRp = (num) => {
  if (num === undefined || num === null || isNaN(num)) return '-';
  return 'Rp' + Math.round(num).toLocaleString('id-ID');
};

// === STATE ===
let chartInstance = null;
let dataTransaksi = [];

// === LOAD DATA ===
async function loadData() {
  showLoading(true);
  hideError();
  
  try {
    const data = await fetchApi();
    if (data && data.bulanan) {
      render(data);
    } else {
      showLoading(false);
      showError('⚠️ API Apps Script belum diupdate dengan kode lengkap. Kirim ulang kode lengkap dari repo, lalu deploy ulang.');
    }
    showLoading(false);
  } catch (e) {
    console.error(e);
    showLoading(false);
    showError('⚠️ Gagal ambil data: ' + e.message);
  }
}

// === FETCH DARI APPS SCRIPT ===
async function fetchApi() {
  const res = await fetch(CONFIG.apiUrl);
  if (!res.ok) throw new Error('Gagal konek ke server (HTTP ' + res.status + ')');
  const data = await res.json();
  if (data.error) throw new Error(data.error);
  return data;
}

// === RENDER ===
function render(data) {
  const bulanTerakhir = data.bulanan.filter(b => b.income > 0 || b.expense > 0);
  const bulanAktif = bulanTerakhir[bulanTerakhir.length - 1] || data.bulanan[0] || {};
  
  const income = bulanAktif.income || 0;
  const expense = bulanAktif.expense || 0;
  const sisa = income - expense;
  const rate = income > 0 ? (sisa / income * 100) : 0;
  
  document.getElementById('totalIncome').textContent = fmtRp(income);
  document.getElementById('totalExpense').textContent = fmtRp(expense);
  document.getElementById('totalSisa').textContent = fmtRp(sisa);
  document.getElementById('savingRate').textContent = rate > 0 ? rate.toFixed(1) + '%' : '-';
  
  const bulanNames = ['','Januari','Februari','Maret','April','Mei','Juni','Juli','Agustus','September','Oktober','November','Desember'];
  const d = new Date();
  document.getElementById('bulanSekarang').textContent = bulanNames[d.getMonth()] + ' ' + d.getFullYear();
  
  renderChart(data.bulanan);
  
  // Kategori: hitung dari transaksi yang ada
  const kategori = (data.kategori || []).length > 0 ? data.kategori : hitungKategoriDariTransaksi(dataTransaksi);
  renderKategori(kategori);
  
  dataTransaksi = data.transaksi || [];
  renderTransaksi(dataTransaksi);
  renderFilter(data);
}

// Hitung kategori dari data transaksi (akurat!)
function hitungKategoriDariTransaksi(tx) {
  const map = {};
  tx.forEach(t => {
    const kat = t.kat || 'Lain-lain';
    const nama = kat.replace(/^Makan.*/,'Makan').replace(/^Belanja.*/,'Belanja');
    map[nama] = (map[nama] || 0) + (t.nilai || 0);
  });
  const warnaMap = {
    'Makan':'#fbbf24','Transport':'#60a5fa','Tagihan':'#f87171',
    'Belanja':'#34d399','Kesehatan':'#ec4899','Saving':'#10b981',
    'Rokok & Kopi':'#a78bfa','Lain-lain':'#6b7280','Service':'#f97316',
    'Pakaian':'#8b5cf6','Rekreasi':'#06b6d4','Saham':'#6366f1','Modal':'#14b8a6'
  };
  return Object.entries(map)
    .filter(([_,v]) => v > 0)
    .map(([nama, nilai]) => ({ nama, nilai, warna: warnaMap[nama] || '#6b7280' }))
    .sort((a,b) => b.nilai - a.nilai);
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
          borderColor: '#34d399', borderWidth: 1, borderRadius: 4,
        },
        {
          label: 'Pengeluaran',
          data: expenseData,
          backgroundColor: 'rgba(248, 113, 113, 0.7)',
          borderColor: '#f87171', borderWidth: 1, borderRadius: 4,
        }
      ]
    },
    options: {
      responsive: true,
      plugins: { legend: { position: 'top', labels: { font: { size: 12 } } } },
      scales: { y: { beginAtZero: true, ticks: { callback: (v) => 'Rp' + (v / 1000).toFixed(0) + 'rb' } } }
    }
  });
}

// === KATEGORI ===
function renderKategori(data) {
  const grid = document.getElementById('kategoriGrid');
  grid.innerHTML = '';
  
  if (!data || data.length === 0) {
    grid.innerHTML = '<div class="tx-item" style="justify-content:center;color:var(--text-light);">Belum ada data kategori</div>';
    return;
  }
  
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
      <div class="kat-nilai" style="color:${d.warna || '#6b7280'}">${fmtRp(d.nilai)}</div>
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
}

// === TRANSAKSI ===
function renderTransaksi(data) {
  const list = document.getElementById('transaksiList');
  list.innerHTML = '';
  
  if (!data || data.length === 0) {
    list.innerHTML = '<div class="tx-item" style="justify-content:center;color:var(--text-light);">Belum ada transaksi</div>';
    return;
  }
  
  data.slice(0, 30).forEach(t => {
    const isIncome = t.jenis === 'income';
    const el = document.createElement('div');
    el.className = 'tx-item';
    el.innerHTML = `
      <div class="tx-left">
        <div class="tx-tanggal">${t.tgl || '-'}</div>
        <div class="tx-ket">${t.ket || '-'}</div>
        <span class="tx-kategori">${t.kat || '-'}</span>
      </div>
      <div class="tx-nilai ${t.jenis || 'expense'}">${isIncome ? '+' : '-'}${fmtRp(t.nilai)}</div>
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
