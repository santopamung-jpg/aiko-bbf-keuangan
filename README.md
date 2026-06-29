# 🌸 AIKO BBF — Keuangan Dashboard

Web app pencatatan keuangan pribadi yang terhubung langsung ke **Google Sheets AIKO BBF**.

## ✨ Fitur

- 📊 Dashboard ringkasan pemasukan & pengeluaran
- 📈 Grafik tren bulanan
- 🏷️ Pengeluaran per kategori
- 📋 Transaksi terbaru dengan filter
- 📱 Mobile friendly
- 🔄 Auto update dari Google Sheets

## 🛠️ Cara Setup

### 1. Deploy Google Apps Script (Backend API)

1. Buka [script.google.com](https://script.google.com)
2. Buat project baru
3. Copy isi `apps-script/Code.gs` ke editor
4. Simpan (Ctrl+S)
5. **Deploy > New deployment > Web app**
   - Execute as: `Me`
   - Who has access: `Anyone`
6. Copy URL web app-nya

### 2. Set URL di Frontend

Buka `script.js`, cari `CONFIG.apiUrl`, isi dengan URL dari langkah 1.

### 3. Deploy ke GitHub Pages

Repo ini otomatis di-deploy ke GitHub Pages.
Akses di: `https://santopamung-jpg.github.io/aiko-bbf-keuangan/`

## 📊 Data Source

Google Sheet: **AIKO BBF (bismilah bebas finansial) 2026**
- Sheet: `Rekap pengeluaran 2026`
- Sheet: `Rekap income 2026`

## 👤 Dibuat untuk

Santo Pamungkas — PNS Analisis Pakan & Kesehatan Hewan

---

🌸 *Bismillah Bebas Finansial 2026*
