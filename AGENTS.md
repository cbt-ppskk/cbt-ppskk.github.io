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
  **Repo ini AWAM** — apa sahaja yang di-commit boleh dibaca sesiapa.
- Semua data rasmi datang dari backend. `const DATA` dalam `index.html` kini
  **objek kosong** (`{"log":[],...}`). Sebelum ini ia ialah snapshot ~1 juta
  aksara (2/3 saiz fail) yang mengandungi nama, nombor personel, e-mel akaun,
  tarikh lahir dan 1113 baris audit — semuanya terbaca oleh sesiapa di repo awam.
  Snapshot itu dibuang (lihat "Pembersihan PII"). `LOG_BASE` / `PER` diisi dari
  backend (`fetchLogData`, `getPersonnelList`) pada setiap muat; aplikasi disahkan
  berfungsi penuh tanpa snapshot (12/12 ujian daya maju).
- `PROF_DATES` (tarikh lahir) juga dikosongkan; `getProfileDates`/`Range` mengisinya.
- **Kesan luar talian:** snapshot juga berfungsi sebagai cache luar talian. Kini
  pengguna luar talian melihat rekod sendiri (`cbt_records_v7`) + draf, tetapi
  **bukan** log penuh server. `mergeServerIntoLocal` hanya menyimpan rekod yang
  belum sync; rekod server tidak dicache. Ini pertukaran privasi vs kemudahan
  yang disengajakan — jangan tambah cache log server ke localStorage.
- Kebergantungan CDN: Chart.js, jsPDF, jspdf-autotable (kini dengan SRI), dan
  Tesseract.js (dimuatkan secara dinamik semasa OCR).

## Pembersihan PII (audit keselamatan)

Repo ini **awam** dan laman **hidup**. `index.html` dahulunya membawa snapshot
data sebenar dalam fail yang boleh dimuat turun sesiapa. Yang dibuang:

| Item | Isi | Cara diperbetulkan |
|---|---|---|
| `const DATA` | 282 log, 17 personel, 16 akaun, 1113 baris audit (129 e-mel), 19 penyelia | Objek kosong; diisi oleh `fetchLogData` / `getPersonnelList` |
| `const PROF_DATES` | Tarikh lahir 17 warga | Objek kosong; diisi oleh `getProfileDatesRange` |
| Placeholder UI | E-mel sebenar, nama penuh sebenar, nombor personel sebenar | Nilai sintetik jelas palsu |

Guna `python3 tools/scrub-pii.py` untuk menyemak, `--write` untuk membetulkan.
Alat ini mengimbas `DATA`, `PROF_DATES` dan senarai `REPLACEMENTS`; ia **tidak**
pernah menulis nilai asal ke fail lain (rollback melalui `git revert`).

### Baki risiko (perlu tindakan pemilik sistem)

1. **`SALT` masih dalam repo.** `const SALT='cbt_mpdrmkl_2026'` ialah pepper
   kata laluan, bukan data peribadi, jadi alat scrub **tidak** menyentuhnya.
   Risiko: dengan `SALT` awam, penyerang yang memperoleh `passHash` boleh mencuba
   kamus dengan lebih murah. Mitigasi tanpa menukar SALT: pastikan kata laluan
   kukuh (min 8 aksara) dan kekalkan had kadar OTP.
   **JANGAN tukar nilai SALT** tanpa mengesahkan `Code.gs` membandingkan
   `passHash` sahaja (bukan mengira semula salt) — menukarnya menjadikan SEMUA
   kata laluan sedia ada tidak sah.
2. **PII kekal dalam sejarah git.** Membuang dari commit terbaharu TIDAK
   memadamnya daripada commit lama. Repo awam yang di-klon selepas ini masih
   mengandungi snapshot penuh. Tindakan perlu:
   - **Putarkan semula** kredensial yang terjejas (kata laluan akaun sistem),
     kerana ia lebih penting daripada cuba memadam sejarah.
   - Jika pemadaman sejarah perlu: `git filter-repo` + force-push, dan faham
     bahawa ia mengganggu sesiapa yang sudah meng-klon.
3. **Kebenaran peranan (RBAC) tidak dapat diuji sepenuhnya.** Pengesahan token
   disahkan kuat (lihat di bawah), tetapi sama ada `upsertPersonel`,
   `adminUpdateUser`, `deleteLog` menyemak **peranan** selain token memerlukan
   kelayakan akaun sebenar. Semak `Code.gs` untuk pengesahan peranan
   (`admin`/`superadmin` sahaja untuk tindakan pentadbir).

### Pengesahan backend (disahkan secara empirik, 18 tindakan)

Diuji dengan token tiada/palsu — semua ditolak dengan
`"Sesi tidak sah atau telah tamat"`:
`fetchLogData`, `fetchLogCounts`, `getPersonnelList`, `getValidasiRekod`,
`getStagingPenugasan`, `getDeletedLogs`, `getMasterPersonel`, `getSettings`,
`adminListUsers`, `findDuplicates`, `deleteLog`, `restoreLog`,
`updateStatusValidasi`, `saveSetting`, `upsertPersonel`, `adminResetAccess`,
`adminUpdateUser`. `ping` sahaja awam (sengaja).

Pra-log masuk (`loginUser`, `verifyOTP`, `registerUser`) tidak perlukan token
sesi tetapi mengesahkan input sendiri. **Kesimpulan: pengesahan kuat; tindakan
tulis tidak boleh dijalankan tanpa sesi sah.**

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
   boleh diuji sepenuhnya di sini. Pengesahan token **sudah disahkan** kuat
   (rujuk "Pengesahan backend"), tetapi kebenaran **peranan** belum disahkan —
   semak `Code.gs` dengan pemilik sistem.
4. **Jangan tambah semula data peribadi tertanam.** `DATA` dan `PROF_DATES` kini
   kosong dan diisi dari backend. Jangan pulihkan snapshot sebenar (nama, no.
   personel, e-mel, tarikh lahir) ke dalam `index.html` — repo ini **awam**.
   Guna `tools/scrub-pii.py` untuk menyemak.
5. **RBAC dikuatkuasa di klien.** `SESSION` disimpan di `localStorage` dan boleh
   disunting melalui DevTools. Token sesi disahkan di backend, tetapi UI
   (butang admin, tab super-admin) hanya disekat di klien — jangan anggap UI
   sebagai kawalan keselamatan. Pastikan `Code.gs` menyemak peranan untuk
   `upsertPersonel`, `adminUpdateUser`, `deleteLog`.

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

### Ujian yang bergantung pada snapshot tertanam

Beberapa ujian lama menganggap `DATA.log.length > 0`. Itu tidak lagi benar —
snapshot PII telah dibuang. Ujian tersebut mesti menuntut sebaliknya:

```js
DATA.log.length === 0            // tiada snapshot tertanam
typeof LOG_BASE !== 'undefined'  // lapisan data wujud untuk diisi backend
```

Untuk ujian yang memerlukan data, tiru respons backend (`fetchLogData`,
`getPersonnelList`, ...) dalam `evaluateOnNewDocument`. Ingat `gasCall` menggunakan
`res.json()`, jadi tiruan `fetch` mesti menyediakan `json()`, bukan hanya `text()`.
Jangan sekali-kali memulihkan snapshot sebenar ke dalam repo untuk memenuhi ujian.

## Konvensyen kod

- Komen dan mesej UI dalam Bahasa Melayu; pengecam kod dalam Bahasa Inggeris.
- Elak `eval` / `new Function`. Guna `esc()` untuk sebarang data sebelum `innerHTML`.
- Bungkus panggilan pilihan dengan `try{}catch(e){}`; corak sedia ada menggunakan
  `safe_()` / `safe()` pada but.

## Pejabat Maya (`office.html`)

Modul paparan tambahan, **satu fail**. `office.html` sendiri **baca sahaja** —
ia tidak pernah menulis data kerja.

Satu-satunya perubahan dalam `index.html` bagi menyokongnya ialah satu baris
dalam `switchTab()` yang menulis isyarat tab (`cbt_office_tab_v1`), dibungkus
dalam `try{}catch(e){}`. Jangan tambah tulisan lain dari `office.html`.

### Kontrak backend GAS (disahkan secara empirik)

- `ping` — berfungsi **tanpa** sesi.
- `fetchLogData`, `fetchLogCounts`, `getPersonnelList`, `getValidasiRekod`,
  `getStagingPenugasan` — **memerlukan** token sesi; tanpa token balas
  `{ok:false, error:"Sesi tidak sah atau telah tamat"}`.
- **Tiada** endpoint audit. Jangan reka angka untuk AUDIT LOG.

### Medan respons sebenar (jangan teka)

- `fetchLogCounts` -> `{all, inPeriod, periodStart}`. Tiada `total`/`belum`/`selesai`.
- `getValidasiRekod` -> peta kunci -> `{status, by, ts}`. Rekod divalidasi hanya
  apabila `status` **mengandungi `SELESAI`** (rujuk `applyValidasiMap_`).
- Kunci validasi sama seperti index.html: `id`, `r<row>`, `#<bil>`
  (rujuk `v95RecId` / `v95RowKey` / `v95BilKey`).
- `petugas_detail` = satu baris setiap orang, format `"PANGKAT NAMA (Peranan)"`.
  Peranan ialah `Admin` / `PA System` / `Photographer` / `Juruvideo` — **bukan**
  nombor personel. Nombor personel ada dalam `petugas` (array) sahaja.
- Kunci storan setempat index.html: `cbt_records_v7` (`ADD_KEY`, ditulis oleh
  `saveAdded`), `cbt_draf_local_v87`, `cbt_validated_v27`, `cbt_session_v7`.

### Integrasi dengan index.html

`office.html` mengesan butang ditekan dengan **membaca** `cbt_records_v7` dan
`cbt_draf_local_v87` (kitaran 700 ms), dan **membaca** `cbt_session_v7` untuk
sesi. Ia tidak pernah menulis kunci tersebut — hanya `cbt_office_ui_v1`.

**Isyarat tab** (`cbt_office_tab_v1`): ditulis oleh `switchTab()` dalam
`index.html` sebagai `"<namaTab>|<capMasa>"`. `office.html` memetakannya melalui
`TAB_TO_STATION` dan memanggil `activateModule()`, yang menyebabkan ejen modul
itu berdiri, berjalan ke ruang kongsi dan memaparkan peranannya selama 9 saat.
Cap masa wajib ada: peristiwa `storage` tidak berlaku apabila nilai tidak berubah,
jadi menekan tab yang sama dua kali memerlukan nilai baharu. Huraikan dengan
`String(signal).split('|')[0]`.

Setiap workstation mempunyai peranan modul sendiri dalam `MODULE_ROLES`; avatar
meja memainkannya. Tab `admin-only` (valbelum/valselesai/draf) disekat oleh
RBAC `switchTab()` sebelum tulisan berlaku — jadi tiada isyarat dihantar tanpa
sesi yang berhak. Ini betul, bukan pepijat.

### Perangkap

- **CSP berasaskan hash**: mengedit mana-mana blok `<script>` inline dalam
  `index.html` (termasuk menambah satu baris dalam `switchTab()`) akan
  menyebabkan pelayar menyekat skrip itu **sepenuhnya** — halaman nampak
  separuh mati (`safe is not defined`). Selepas setiap suntingan skrip inline,
  jalankan `python3 tools/csp-hash.py --write` dan sahkan dengan `--check`.
- **Jangan naikkan `APP_VER`** untuk perubahan frontend sahaja (rujuk peraturan 1
  di atas). Untuk memaksa peranti memuat aset baharu, naikkan cache `sw.js`
  **dan** `register('sw.js?v=<ver>')` bersama-sama, kekalkan `APP_VER`.
- **Jangan campurkan `performance.now()` dengan `Date.now()`.** `frame()` menerima
  masa rAF; semua perbandingan keadaan mesti guna `Date.now()`.
- Jangan lapor `LIVE` apabila semua permintaan gagal. Bezakah sesi-tamat
  (`NOAUTH`) daripada rangkaian-putus.
- `syncMeeting` mesti memeriksa rekod setempat dahulu — rekod baharu hanya
  muncul dalam senarai pelayan pada kitaran muat semula seterusnya.
- Jangan ganti kiraan sah dengan `null` apabila respons cacat.

## CSP dan backend GAS — perangkap kritikal

`index.html` memakai CSP berasaskan hash (`tools/csp-hash.py`). Jangan edit
`<meta Content-Security-Policy>` dengan tangan; jalankan
`python3 tools/csp-hash.py --write` selepas mengubah mana-mana blok `<script>`
inline, dan sahkan dengan `--check`.

**Apps Script membalas melalui ubah hala.** Permintaan ke `script.google.com`
dijawab melalui `script.googleusercontent.com`. Oleh itu `connect-src` **mesti**
menyenaraikan kedua-dua hos. Jika hanya `script.google.com` disenaraikan,
pelayar menghalang ubah hala dan **setiap** panggilan backend gagal dengan
`Failed to fetch` — termasuk `ping`. Ralat ini senyap dan hanya kelihatan di
konsol sebagai pelanggaran CSP.

Sumber yang dibenarkan dan sebabnya:

| Hos | Arahan | Sebab |
|---|---|---|
| `script.google.com` | `connect-src` | endpoint GAS |
| `script.googleusercontent.com` | `connect-src` | hos ubah hala GAS — wajib |
| `docs.google.com` | `connect-src` | eksport |
| `cdn.jsdelivr.net`, `cdnjs.cloudflare.com` | `script-src` | Chart.js, jspdf |
| `'unsafe-inline'` | `style-src` sahaja | gaya dalam talian; **jangan** tambah ke `script-src` |

### Ujian CSP mesti guna rangkaian sebenar

Suite integrasi menggantikan `window.fetch` dengan stub. Stub itu memintas
pelayar sepenuhnya, jadi **CSP tidak pernah diuji** — satu CSP yang menyekat
semua trafik boleh lulus 132 ujian. Sentiasa tambah satu ujian yang memanggil
`gasCall('ping')` sebenar melalui pelayar dan mengira pelanggaran CSP.

### Service worker

`sw.js` menggunakan strategi **rangkaian-dahulu** untuk HTML. Pembetulan HTML
sampai pada muat seterusnya tanpa naikkan `APP_VER`. Jangan naikkan `APP_VER`
untuk pembetulan semata-mata — ia mencetuskan amaran ketidakpadanan versi
frontend/backend yang mengelirukan pengguna.
