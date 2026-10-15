# AGENTS.md — CBT PPSKK (Sistem Pengurusan Penugasan)

Pengetahuan operasi untuk ejen/penyelenggara. Rujuk fail ini dahulu sebelum mengubah kod.

## Seni bina

```
index.html (SPA monolitik, ~1.5 MB, ~8000 baris)
        |  POST JSON {action, token, ...}  (Content-Type: text/plain)
        v
Google Apps Script Web App  (Code.gs — TIDAK disimpan dalam repo ini)
        v
Google Sheets  (sumber kebenaran tunggal: Log_Penugasan, Master_Personel,
                Pengguna_Akses, Staging_Penugasan, Log_Deleted, Tetapan)
```

- Frontend dihoskan oleh GitHub Pages daripada cawangan `main` (build_type: legacy).
- Semua data rasmi datang dari backend. `const DATA = {...}` dalam `index.html`
  hanyalah **sandaran luar talian** dan diganti sebaik `fetchLogData` menjawab.
- Kebergantungan CDN: Chart.js, jsPDF, jspdf-autotable (kini dengan SRI), dan
  Tesseract.js (dimuatkan secara dinamik semasa OCR).

## Perkara penting yang mudah tersalah

1. **JANGAN naikkan `APP_VER` / `data-app-version` tanpa menaikkan backend.**
   `bootVersionGuard()` membandingkan versi frontend dan backend. Jika frontend
   lebih tinggi daripada `Code.gs`, ia memaparkan sepanduk merah
   "VERSI TIDAK PADAN". Perubahan frontend sahaja sepatutnya dikekalkan pada
   versi yang sama (label seperti `v103b` digunakan untuk perubahan frontend sahaja).
2. **`sw.js` mesti dinaikkan cache-nya** (`CACHE="cbt-penugasan-<ver>-..."`) setiap
   kali aset berubah, dan `register('sw.js?v=<ver>')` dalam `index.html` mesti
   sepadan. Jika tidak, pelanggan akan terus menerima aset lama.
3. **`Code.gs` tiada dalam repo.** Perubahan yang memerlukan sokongan backend tidak
   boleh diuji sepenuhnya di sini. Jangan anggap backend menguatkuasakan kebenaran —
   sahkan dengan pemilik sistem.
4. **Data peribadi tertanam**: `DATA` mengandungi nama pegawai, no. personel dan
   e-mel (termasuk akaun admin). Ini repo **awam**. Jangan tambah lagi data sebenar;
   idealnya data ini dipindahkan ke backend sepenuhnya.
5. **RBAC dikuatkuasa di klien.** `SESSION` disimpan di `localStorage` dan boleh
   disunting melalui DevTools. Kebenaran sebenar mesti disahkan di `Code.gs`.

## Content-Security-Policy (v103b)

`index.html` mempunyai `<meta http-equiv="Content-Security-Policy">`. Kerana beberapa
skrip adalah **inline**, polisi menggunakan **hash SHA-256**, bukan `'unsafe-inline'`.

**Jika anda mengubah mana-mana blok `<script>` inline, hash akan rosak dan skrip
tersebut akan disekat (app akan pecah separuh).** Selepas sebarang perubahan pada
skrip inline, WAJIB jalankan:

```bash
python3 tools/csp-hash.py --write     # kira semula hash + kemas kini meta
python3 tools/csp-hash.py --check     # sahkan meta sepadan (gagal = hash basi)
python3 tools/csp-hash.py             # paparkan polisi sahaja
```

Dua pengendali inline telah dibuang supaya `'unsafe-inline'` tidak diperlukan:
`onsubmit` pada `#ki-form` dan `onerror` pada logo splash. Kedua-duanya kini
diikat melalui `initV103bGuard()`.

Polisi tidak membenarkan `'unsafe-eval'` — jangan perkenalkan `eval()` atau
`new Function()`.

## Aliran auto-logout (v103b)

- `cbt_sess_token_v103b` dalam **sessionStorage** (skop tab). Pelayar memadamnya
  apabila tab/aplikasi ditutup -> log keluar pada pembukaan berikutnya.
- `cbt_logout_next` dalam localStorage: bendera sementara semasa `pagehide`.
  `bootAliveGuard_()` membatalkannya jika token masih ada (kes muat semula / tab lain).
- `cbt_logout_signal`: isyarat log keluar **sengaja** (butang Log Keluar) kepada tab lain.
- Semua reload yang sengaja mesti memanggil `markIntentionalReload_()`.

## Cara menguji

Tiada rangka kerja ujian dalam repo. Ujian dijalankan dengan Chromium tanpa kepala
dan `puppeteer-core` (perkhidmatan HTTP setempat):

```bash
# 1. salin laman ke direktori ujian, pasang hook sesi (lihat nota di bawah)
# 2. python3 -m http.server 8099
# 3. node <skrip-ujian>.js
```

Nota: `SESSION` diisytiharkan dengan `let` dalam skop blok skrip, jadi ia **tidak**
boleh diubah melalui `window.SESSION` dari luar. Untuk menguji, sediakan salinan
berasingan `index.html` dan tambah hook sebelum `initV103b()`:

```js
window.__tSetSession=function(v){SESSION=v;};
window.__tGetSession=function(){return SESSION;};
```

Jangan sekali-kali tambah hook ujian ke `index.html` yang dihantar.

## Konvensyen kod

- Komen dan mesej UI dalam Bahasa Melayu; pengecam kod dalam Bahasa Inggeris.
- Elak `eval` / `new Function`. Guna `esc()` untuk sebarang data sebelum `innerHTML`.
- Bungkus panggilan pilihan dengan `try{}catch(e){}`; corak sedia ada menggunakan
  `safe_()` / `safe()` pada but.
