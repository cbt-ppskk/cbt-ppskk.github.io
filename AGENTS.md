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

## Backend GAS (`gas/`) — kawalan versi

Kod backend (`Code.gs`) kini dijejak dalam folder `gas/`. Sebelum ini ia hanya
wujud dalam editor Apps Script: tiada sejarah, tiada cara kembali ke versi
lama, dan tiada cara menyemak keselamatan kod itu.

Aliran kerja penuh: `gas/README.md`. Ringkasnya:

```bash
./gas/clasp.sh login     # sekali sahaja — buka pelayar (langkah MANUAL)
# isi scriptId dalam gas/.clasp.json
./gas/clasp.sh pull      # tarik Code.gs dari editor Apps Script
./gas/clasp.sh scan      # imbas rahsia SEBELUM commit
./gas/clasp.sh push      # hantar ke editor Apps Script
./gas/clasp.sh deploy "nota"   # deploy semula supaya frontend nampak perubahan
```

`clasp` dipasang setempat dalam `/tmp/clasptool` (pemasangan global disekat
dalam persekitaran ini). `gas/clasp.sh` menyelesaikan laluan binari itu.

### Pengawal dalam `clasp.sh`

- `push` **berhenti** jika tiada fail `.gs` dalam `gas/`. Tanpanya,
  `clasp push` akan **memadam** fail dalam projek Apps Script — ini berlaku
  jika `pull` belum dijalankan.
- `push` menjalankan `scan-secrets.py` dan gagal jika ada rahsia tahap tinggi.
- `pull` menjalankan pengimbas secara automatik selepas menarik kod, kerana
  kod sedia ada mungkin mengandungi rahsia yang belum pernah dilihat git.

### `.claspignore`

clasp 3.x guna **micromatch**, bukan semantik gitignore. Corak yang disahkan
menghantar hanya `appsscript.json` + `*.gs`, dan mengabaikan `README.md`,
`*.py`, `hooks/`, `.clasp.json`, `.claspignore`:

```
**/**
!appsscript.json
!**/*.gs
```

Disahkan dengan enjin sebenar clasp (`micromatch.not`), bukan diandaikan.

### Rahsia dalam `Code.gs`

Repo ini **AWAM**. Jangan commit ID spreadsheet, e-mel pengguna, `SALT`,
kunci API atau kata laluan. Guna `PropertiesService`:

```javascript
PropertiesService.getScriptProperties().setProperty('SPREADSHEET_ID', '...');
```

`scan-secrets.py` menangkap: kunci Google/AWS/Slack/Stripe, token GitHub,
kunci persendirian, ID Spreadsheet, `SALT`, kata laluan dikod keras, e-mel,
no. telefon, no. kad pengenalan. Nilai ditemui dipaparkan **terpotong** supaya
output skrip sendiri tidak bocor.

`~/.clasprc.json` mengandungi token penyegar OAuth clasp — sudah disenaraikan
dalam `.gitignore`. **Jangan** commit.

### `push` != deploy

`clasp push` menulis ke **draf** projek. Frontend memanggil URL `/exec` yang
terikat pada **deployment**. Tanpa `clasp deploy`, perubahan tidak berkuat
kuasa untuk pengguna. Ini punca biasa "kod sudah diubah tetapi sistem tidak
berubah".

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
3. **Kebenaran peranan (RBAC) — SUDAH DIAUDIT (v104).** `Code.gs` sudah ada
   dalam repo (`gas/Code.gs`) dan setiap tindakan pentadbir disemak: ia
   menggunakan `guardAdmin_`, bukan sekadar token sah. Sesi yang disunting
   melalui DevTools **tidak** boleh menaikkan peranan, kerana peranan
   diambil daripada `Pengguna_Akses`/`Master Personel` di sisi pelayan.
   Peranan dari klien diabaikan sepenuhnya mulai v104.

### Perkongsian Sheet — SUDAH DIKUNCI

`Laporan Penugasan` (`1Vm3fWQzZeHOHHaBY1ZLYjz2KlwTx7M0dexIyJllIe-c`) dahulunya
`anyone: reader`. Ia kini `restricted`: `/export` dan `/gviz/tq` memulangkan
**401** (disahkan 2026-10-15).

Jangan kelirukan dengan spreadsheet `testing` (`14fy3vzIscryufczcb4XBAjSu_v3owIrgNgkMRx8fTao`)
— ia juga wujud dan juga sudah dikunci, tetapi **sistem tidak menggunakannya**.
Semasa mengunci, sahkan `export?format=csv` memulangkan 401 untuk ID yang
**betul**, bukan sekadar spreadsheet yang kelihatan serupa.

Backend **tidak** terjejas oleh penguncian ini: `SpreadsheetApp.openById()`
berjalan sebagai pemilik (lencana OAuth pemilik), bukan sebagai pemanggil
`/exec`. Jadi mengunci Sheet menutup akses CSV awam tanpa memerlukan
sebarang perubahan kod. Jangan "betulkan" dengan berkongsi semula Sheet.

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

### Audit v104 (6 tindakan berpengawal ditambah)

Audit penuh `Code.gs` pada v104 mendapati 6 tindakan **tidak** berpengawal,
walaupun senarai 18 tindakan di atas lulus. Semua kini berpengawal:
`getProfileDates`, `getProfileDatesToday`, `getProfileDatesRange` (nama, No.
Personel, tarikh lahir, e-mel), `getLeadershipData`, `setupSheets`
(pentadbir — ia mencipta tab), `diagnoseSheet` (sesi sah; ID Sheet hanya
untuk pentadbir).

`ping` kekal awam dengan sengaja: `office.html` memanggilnya **sebelum**
menyemak sesi, jadi ia mesti boleh dicapai tanpa token. Ia tidak lagi
memulangkan `spreadsheetId` kepada pemanggil tanpa sesi — ID itu memberi
pautan terus kepada `Pengguna_Akses` (hash+salt) dan `OTP_Requests`.

**Pelajaran:** senarai tindakan yang "sudah diuji" tidak menggantikan
semakan penuh router. Uji dengan mengira `guard_`/`guardAdmin_` dalam
`doPost` berbanding jumlah `case`.

### Perangkap: `getRoleFromMasterPersonel_` pulangkan `''` untuk tiga keadaan

Tiada rekod, rekod ada tetapi lajur Peranan kosong, dan ralat Sheet —
ketiga-tiganya `''`. Jangan sekali-kali guna fungsi itu sebagai semakan
keahlian: staf sah yang peranannya belum diisi akan tersekat. Guna
`findPersonelRecord_` (v104) yang membezakan ketiga-tiganya dan **dilempar**
pada ralat Sheet supaya pemanggil boleh pulangkan ralat cuba-semula.

### Perangkap: susunan semakan dalam `registerUser`

`freeEmailForReuse_` **mengosongkan** lajur e-mel milik No. Personel LAIN.
Ia mesti berjalan **selepas** pemohon disahkan warga, jika tidak pemohon
yang ditolak pun sudah mengubah data pengguna sedia ada. Begitu juga
`killSessionsFor_` (memutuskan sesi orang lain).

### Reka bentuk: staf beri e-mel sendiri semasa pendaftaran

Lajur E-mel `Master Personel` **sengaja kosong** bagi staf yang belum mendaftar —
e-mel itu baru diketahui semasa pendaftaran. Jangan isi lajur itu secara pukal
"supaya selamat", dan jangan ikat e-mel pendaftaran padanya: berbuat begitu
menyekat staf sah daripada mendaftar.

Bukti keahlian ialah **No. Personel**, bukan e-mel. Setiap staf tahu No.
Personel sendiri, dan orang luar tidak. (Nota: No. Personel juga muncul dalam
log sistem, jadi ia **bukan** rahsia yang kuat — jangan anggap ia kredensial.)

Pagar sebenar terhadap pengambilalihan akaun ialah **Kod Matrik Pemulihan
Akaun** (tarikh lahir) yang disimpan pada pendaftaran pertama. Selepas itu,
sesiapa yang cuba mendaftar semula untuk No. Personel yang sama mesti padan
`MM-DD` dengan rekod sedia ada. Sebelum v104 perbandingan ini tidak wujud.

Implikasi penting: pada pendaftaran **pertama**, tiada apa untuk dipadankan.
Itulah reka bentuknya. Jangan "betulkan" dengan menambah pagar yang menyekat
staf sah.

### Perangkap: "Kod Matrik Pemulihan Akaun" mesti dipadankan, bukan hanya disemak format

Medan `birthDate` disimpan dalam `Pengguna_Akses` (lajur 9) dan ditulis
semula oleh `writeAccessUser_` setiap kali `verifyOTP` berjaya. Sebelum
v104 ia **hanya** disemak format ISO — tidak pernah dibandingkan dengan
rekod sedia ada. Akibatnya sesiapa yang tahu No. Personel seseorang boleh
mendaftar semula dengan tarikh lahir rekaan dan **menimpa kata laluan**
orang itu. v104 membandingkan `MM-DD` (guna `mdPartsFromAny_`) dengan
rekod sedia ada; akaun yang belum wujud tiada apa untuk dipadankan.

Nota: padanan hanya `MM-DD`, bukan tahun penuh, kerana `Hari Jadi` menyimpan
`MM-DD` sahaja dan `normBirthdayForStore_` boleh menggugurkan tahun. Ini
kekal bermakna dari segi keselamatan tetapi **bukan** pengesahan identiti
yang kukuh — jangan bergantung padanya sebagai satu-satunya faktor.

## Menolak (push) perubahan ke GitHub

Repo ini awam (`cbt-ppskk/cbt-ppskk.github.io`). `git push` memerlukan
**PAT klasik dengan skop `repo`** — jangan andaikan `$GITHUB_TOKEN` yang
disediakan dalam sesi ini boleh menulis.

**Perangkap yang berulang:** `$GITHUB_TOKEN` dalam persekitaran ini ialah
token integrasi/GitHub App bagi akaun lain. Gejalanya mengelirukan:

- `git ls-remote` **berjaya** (repo awam, jadi bacaan dibenarkan tanpa token)
- API `GET /repos/...` melaporkan `permissions: {push: true, admin: true}`
  — tetapi itu kebenaran **akaun**, bukan kebenaran yang dimiliki token
- `git push` gagal: `403 Permission to ... denied to <akaun-lain>`

Jangan cuba lagi dengan format `x-access-token:` — sama sahaja gagal.

**Cara menolak dengan selamat** (jangan simpan token dalam `.git/config`):

```bash
git remote set-url origin "https://<PAT>@github.com/cbt-ppskk/cbt-ppskk.github.io.git"
git push origin main
git remote set-url origin https://github.com/cbt-ppskk/cbt-ppskk.github.io.git
```

Sentiasa pulihkan URL remote selepas push, dan sahkan:

```bash
grep -cE "ghp_|github_pat_|x-access-token" .git/config   # mesti 0
```

**Selepas push, sahkan tapak langsung** — GitHub Pages mengambil masa ~30-60
saat. Yang paling penting ialah memastikan **CSP tidak menyekat** skrip baharu:
selepas menukar blok `<script>` inline, buka tapak dalam Chromium dan pastikan
**0 pelanggaran CSP** dalam konsol. Hash yang salah akan mematikan seluruh
aplikasi untuk semua pengguna, bukan sekadar ciri baharu.

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

   **Akibat yang mudah terlepas pandang:** membuang snapshot bermakna setiap
   tempat yang membaca `PER` / `DATA.*` semasa boot kini membaca senarai
   KOSONG. Sebarang lukisan UI yang berlaku sebelum backend membalas mesti
   dilukis SEMULA selepas data tiba. Kes sebenar: `initStaffMarquee()` hanya
   dipanggil sekali semasa boot, jadi banner staff kekal "Tiada data personel."
   selama-lamanya. Bila membuang snapshot, cari setiap `safe(init…)` yang
   bergantung pada `PER`/`DATA` dan pastikan ia dipanggil semula dalam
   `loadPersonelFromServer()` / `loadLogFromServer()`.
5. **RBAC dikuatkuasa di klien.** `SESSION` disimpan di `localStorage` dan boleh
   disunting melalui DevTools. Token sesi disahkan di backend, tetapi UI
   (butang admin, tab super-admin) hanya disekat di klien — jangan anggap UI
   sebagai kawalan keselamatan. Pastikan `Code.gs` menyemak peranan untuk
   `upsertPersonel`, `adminUpdateUser`, `deleteLog`.

## Submodul Key In Penugasan (v105)

Dropdown **➕ Key In Penugasan** mempunyai **tiga** halaman (`index.html`):

| Submodul | `data-tab` | Untuk apa |
|---|---|---|
| 1 | `keyin-wa` | Tampal laporan **WhatsApp** (senarai bernombor 1., 2., …) |
| 2 | `keyin-manual` | Borang **manual** satu-satu |
| 3 | `keyin-email` | Tampal teks **e-mel** (termasuk tugasan 2–3 minggu lebih awal) |

### Submodul 3 — input PDF (v106)

Fail e-mel selalunya **PDF** (eksport e-mel, surat rasmi), bukan screenshot.
Menghantar PDF ke OCR **memusnahkan** teks yang sebenarnya sudah boleh dibaca:

| Input | Laluan | Ketepatan |
|---|---|---|
| PDF teks | pdf.js `getTextContent()` — **teks terus** | Tepat (sifar ralat) |
| PDF imbas | jatuh ke OCR (Tesseract) | Perlu semak |
| Imej/screenshot | OCR (Tesseract) | Perlu semak |

Butang itu **auto-mengesan**: jika jumlah teks sesebuah PDF kurang 8 aksara
bukan-ruang, ia dianggap **diimbas** dan OCR dijalankan automatik. Mesej status
mesti menyatakan yang mana satu berlaku — pengguna perlu tahu sama ada teks itu
tepat atau hasil tebakan OCR.

pdf.js (`3.11.174`) dimuat dari **cdnjs**, yang sudah dibenarkan CSP. Jangan
tambah domain CDN baharu tanpa mengemas kini `tools/csp-hash.py`.
`worker-src 'self' blob: data:` sudah membenarkan pekerja pdf.js.

Baris PDF disusun mengikut koordinat **y** (baris) dahulu, kemudian **x**;
tanpa ini, teks e-mel bertaburan dan parser gagal mengenal pasti baris
`Tarikh:`/`Tempat:`.

**Jangan** jadikan OCR laluan lalai untuk PDF — ia lebih perlahan dan
memperkenalkan ralat pada teks yang asalnya tepat.

### Tajuk: Subject e-mel mengalahkan tajuk generik

`buildAdminV56_()` menetapkan `rec.tajuk='Tugasan Admin'` untuk blok admin.
Tajuk generik itu **bukan** `normTxt()`-kosong, jadi semakan lama
(`if(!normTxt(r.tajuk))`) tidak pernah menggantikannya dengan Subject sebenar.
`v106` menambah corak `/^Tugasan\s+(Admin|Umum|Lain)/i` supaya Subject menang.

### Submodul 3 — enjin dua lapis (penting)

`smartParseLaporan()` (v56) **hanya** memproses laporan **berformat bernombor**
(`1. …`, `2. …`, `ADMIN`, `TUGASAN`). Ia memulangkan `assignments: []` untuk
e-mel berbentuk prosa. Sebab itu `v105` menggunakan **dua lapis**:

1. `smartParseLaporan(feed)` — laporan bernombor.
2. Jika kosong → `parseWhatsMulti()` / `parseWhats()` (enjin v55) — satu rekod bebas.
3. `fillProseFields()` mengisi medan yang parser terlepas daripada ayat biasa:
   `extractProseDate()`, `extractProseTimes()`, `extractProsePlace()`.

**Perangkap masa:** `extractProseTimes()` membuang tarikh **dahulu**
(`15.10.2026`) sebelum mencari jam, jika tidak "15.10" dibaca sebagai jam 15:10.
Tanpa penanda pagi/petang, jam `< 7` dianggap petang (`+12`).

**Perangkap status:** `newUserRecord()` menetapkan `status:'Aktif ✅'` secara
lalai, jadi semakan `!r.status` **tidak pernah** tercetus. Untuk menanda
"Akan Datang", mesti tulis semula status bila ia bermula dengan `Aktif`.

### Status "Akan Datang" (keputusan reka bentuk 2026-10)

Rekod bertarikh **masa hadapan** disimpan dalam log tetapi **tidak** dikira
sebagai penugasan selesai:

- **Backend** (`fetchLogCounts_`): medan baharu `future`; rekod `tarikh_mula > hari ini`
  dilangkau daripada `inPeriod` dan `jenis`.
- **Frontend** (`v105`): `buildDashboard` dibalut untuk menapis rekod masa hadapan;
  kad & baris jadual mendapat lencana **⏳ Akan Datang**; `#period-count` menyebut
  bilangan rekod akan datang yang dikecualikan.
- **Sempadan:** tarikh **hari ini** masih dikira; hanya `> hari ini` dikecualikan.
- `todayYmd_()` menggunakan zon `Asia/Kuala_Lumpur` (bukan UTC).

### Amaran: `inPeriod` mesti ditapis di KEDUA-DUA tempat

`inPeriod` datang dari `fetchLogCounts` (Sheet) **dan** daripada fallback tempatan
`dispCount()` (`LOG_BASE.filter(...)`). Menapis hanya satu daripadanya akan
menyebabkan KPI berbeza antara mod dalam talian dan luar talian.

### KPI kini tahan backend lama (v105b)

**Masalahnya:** backend produksi dimiliki akaun Google lain
(`mpdrmkl.it.event@gmail.com`) yang pemilik repo tiada akses. Menunggu deploy
backend bermakna KPI terus membengkak.

**Penyelesaian:** `v105` membalut `window.buildDashboard` supaya rekod masa hadapan
dibuang dari carta dan jumlah. `v105b` menambah `window.dispCount` — kerana
`dispCount()` dan `buildDashboard` ialah *function declaration* pada skop global,
`window.*` mentakrifkan semula kedua-duanya.

Kelakuan `dispCount()`:

| Keadaan backend | Sumber kiraan | Label |
|---|---|---|
| Lapor medan `future` (v105+) | `_COUNTS.inPeriod` dari Sheet | `sumber: Google Sheet` |
| Tiada medan `future` (v103 lama) | `LOG` ditapis `!isFuture()` | `sumber: tempatan` + amaran |

Rangkaian keselamatan ini **tidak** menggantikan deploy backend. Ia mengekalkan
KPI betul sehingga deploy dibuat, dan selepas itu kiraan Sheet rasmi diambil alih
secara automatik.

**Jangan** guna semula `window.dispCount` sebagai corak umum — pembalutan
berlapis menyukarkan penyahpepijatan. Ia dibenarkan di sini kerana backend tidak
boleh diubah.

### Amaran: `saveStageAll` membina rekod log SEBENAR

Submodul 3 menggunakan semula `saveStageAll()` yang sama seperti Submodul 1 —
ia menghantar ke `commitLogPenugasan` dan menulis ke **Log_Penugasan** (rekod rasmi),
bukan `Staging_Penugasan`. Butang **🟡 Simpan Draf** pada kad pula memanggil
`saveStagingPenugasan`. Pastikan setiap kad benar-benar disemak sebelum menyimpan.

## Gambar staff + kepimpinan (SEDANG BERJALAN)

Pengguna mahu gambar muncul dalam **banner marquee staff** dan **karusel
Kepimpinan MPDRMKL**. Kerja ini **belum siap** — kod papar belum ditulis.

### Keadaan sekarang (2026-10-18)

| Perkara | Status |
|---|---|
| Folder `img/staff/` + `img/kepimpinan/` | Siap, commit `38a23ed` **belum push** |
| Kod papar gambar | **Belum ditulis** |
| Gambar sebenar | Pengguna kumpul, muat naik Selasa 20 Okt |
| Sistem live | v106 — **tidak berubah** |

### Empat penyekat yang mesti diatasi

**1. Backend tidak hantar medan `gambar` untuk personel.**
`getPersonnelList()` di `Code.gs` pulangkan `pangkat, nama, no, team, status,
email, role` sahaja. Lajur gambar **tiada** dalam `PERSONEL_HEADERS`:

```
['No Personel','Nama','Pangkat','Unit','Team','Status','E-mel','Peranan']
```

Jadi `p.gambar` (dibaca di `initStaffMarquee`) sentiasa kosong. Penyelesaian
yang dipilih: **cari gambar ikut nama fail** `img/staff/<no>.jpg` — langsung
tidak perlukan backend, dan pengguna tiada akses akaun backend.

**2. Kepimpinan membaca sumber yang tidak pernah wujud.**
`tetHeaderMap()` membaca `DATA.tetapanHeader`, tetapi `DATA` **tidak pernah**
ada kunci itu — `tetapanHeader` muncul **satu kali sahaja** dalam seluruh repo,
iaitu di tempat membacanya. Jadi `leadCard()` sentiasa jatuh ke
`LEADERS_DEFAULT` dan kad papar teks generik ("Komandan MPDRMKL", "Penaung
Program") selama-lamanya.

Backend **sudah ada** `getLeadershipData()` (tab `Master_Kepimpinan`, lajur
`Nama/Jawatan/URL Gambar/Susunan`) dan **sudah didaftarkan** di router
(`Code.gs` baris 315), tetapi `index.html` **tidak pernah memanggilnya** —
sifar rujukan. Penyelesaian yang dipilih: baca `img/kepimpinan/kepimpinan.json`
+ `img/kepimpinan/<KEY>.jpg`.

**3. CSP menghalang imej luar.**
`img-src 'self' blob: data:` — hanya imej dari repo sendiri dibenarkan. URL
Google Drive **akan disekat**. Sebab itu gambar mesti berada dalam repo.

**4. URL Google Drive biasa tidak boleh render dalam `<img>`.**
`https://drive.google.com/file/d/XXX/view` **tidak** berfungsi. Kalau kemudian
mahu guna Drive, perlu `lh3.googleusercontent.com/d/XXX` atau
`thumbnail?id=XXX&sz=w400`.

### Penamaan fail (dikawal kod)

```
img/staff/R1234567.jpg          <- No. Personel
img/kepimpinan/KOMANDAN.jpg     <- kunci tetap
img/kepimpinan/kepimpinan.json  <- nama + jawatan sebenar
```

Kunci kepimpinan: `KOMANDAN`, `KETUA_PUSAT_1` … `KETUA_PUSAT_5`.

### Pelajaran: pelayan muat naik sesi adalah sementara

Satu pelayan muat naik gambar (port 12000) dibina dalam sesi 2026-10-18 dengan
27/27 ujian keselamatan + 10/10 ujian UI. Ia **tidak berguna untuk kerja
sebenar** kerana pautan sesi (`work-1-*.prod-runtime.all-hands.dev`) mati
sebaik sesi tamat. Untuk kerja berjadual, arahkan pengguna ke **GitHub
`Add file → Upload files`** — ia kekal.

### Bila gambar sudah dimuat naik

1. Tulis kod papar: `initStaffMarquee` cuba `img/staff/<no>.jpg`, `buildLeaders`
   baca `kepimpinan.json` + `img/kepimpinan/<KEY>.jpg`
2. Tambah `img/` ke `ASSETS` dalam `sw.js` supaya PWA simpan luar talian
3. Uji: gambar muncul, nama betul, 0 pelanggaran CSP
4. Naik `APP_VER` + cache `sw.js`

## Folder `demo/` — kajian reka bentuk (bukan aplikasi)

`demo/` mengandungi halaman HTML **berdiri sendiri** untuk kajian reka bentuk UI.
Ia **tidak** sebahagian daripada aplikasi dan **tidak** menjejaskan sistem live:

- Tiada perubahan pada `index.html`, `office.html`, `sw.js`, atau logik GAS.
- **Tidak** disenaraikan dalam `ASSETS` (`sw.js`) — PWA tidak cache ini.
- CSP `index.html` tidak terjejas (fail berasingan, bukan skrip inline baharu).
- Merujuk logo sebenar melalui laluan relatif `../icons/`.

**Perangkap laluan:** fail demo asal dibina di luar repo dan merujuk `icons/...`.
Bila disalin ke `demo/`, laluan mesti jadi `../icons/...`. Kalau tidak, semua
logo rosak (200 → 404 senyap).

Halaman: `index.html` (senarai), `susunan.html`, `realistik.html`, `depth.html`,
`fokus.html`, `skeu.html`, `clay.html`, `SKOP-DEPTH.md`.

### Keputusan reka bentuk sidebar (dari kajian `susunan.html`)

Pengguna mahu **6 kotak bersusun ke bawah** di **KIRI** (kedudukan semasa,
`grid-template-columns:300px minmax(0,1fr)` — kolum pertama = kiri):

1. Komandan MPDRMKL — gambar **nisbah 2:3** penuh
2. Ketua Pusat Pengajian — **morph**, bukan scroll
3. Menarik Hari Ini — acara **hari ini**
4. Menarik Akan Datang — acara **akan datang**
5. Masa Semasa
6. Kalendar Khas

**Kotak 3 dan 4 ialah kriteria BERBEZA**, bukan dua salinan data sama. Sistem
sekarang hanya ada satu kotak "Acara Akan Datang" (`acara-card`); "Menarik Hari
Ini" ialah fungsi **baharu** yang perlu menapis acara mengikut tarikh hari ini.

**Morph (kotak 2):** semua kad bertindan `position:absolute`, hanya satu
`.on`. Peralihan guna `opacity` + `scale` + `blur` (1.15s) — bukan scroll.
Ketinggian bekas mesti **stabil** (disahkan 440px) supaya tiada lompatan;
kad `.on` dapat `position:relative` untuk menetapkan tinggi.

**Kedudukan kiri/kanan:** `susunan.html` ada togol. Lalai = **kiri** =
tiada perubahan susun atur. Ini penting: menukar ke kanan ialah perubahan besar
(seluruh sidebar berpindah).

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

### Suite backend (pantas, tiada pelayar)

```bash
node gas/tests/run-tests.js
```

Logik `Code.gs` dijalankan **sebenar** di bawah `vm` Node; hanya lapisan Google
(`SpreadsheetApp`, `MailApp`, `PropertiesService`, `ContentService`,
`LockService`, `Utilities`, `CacheService`) dipalsukan. Uji versi lain dengan
`CODE_GS=<fail> node gas/tests/run-tests.js`.

Suite ini **tidak** membuktikan kod lama baik-baik saja: terhadap `Code.gs`
v103 asal ia melaporkan 20 gagal, termasuk pendaftaran penyerang diterima,
`devOtp` dipulangkan, dan e-mel pengguna lain dikosongkan. Bila menambah
ujian, sahkan ia gagal dahulu terhadap kod yang belum dibetulkan — ujian yang
tidak pernah gagal tidak menguji apa-apa.

Titik yang mudah terlepas: `doPost` mengembalikan objek `ContentService`, jadi
palsu mesti menyediakan `_text` dan `setMimeType()`.

### Ujian frontend (Chromium tanpa kepala)

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

### Bilik Kuota — endpoint KEDUA (dokumentasi)

Seksyen "Bilik Kuota" memanggil endpoint **berasingan** daripada sistem
penugasan: `CONFIG.quotaUrl` (projek GAS `cbt-ingest`, sheet `Uso_Claude`).
Ia menghantar satu tindakan baca `getUsage` dengan token sesi sedia ada; ia
**tidak** melalui `callRead`/`READ_ONLY_ACTIONS` kerana URL berbeza. Pengesahan
sesi **didelegasi** kepada endpoint penugasan (`whoami`) — token disimpan di
projek penugasan, bukan di sini. Kosongkan `CONFIG.quotaUrl` untuk melumpuhkan
panel tanpa menjejaskan sistem penugasan.

- `getUsage` tanpa token sah -> `{ok:false, code:"NO_SESSION"}`; bukan admin
  menerima ringkasan (`tertinggi`) tanpa nama akaun.
- Panel mesti had masa (~20s): GAS boleh sejuk; tanpa had masa panel tersekat
  "Memuatkan…" selama-lamanya. Had masa + `AbortController` wajib dikekalkan.
- Tetingkap kuota `resets_at` (Habblaud) ialah **saat** epoch. Tetingkap yang
  sudah tamat dipaparkan "diperbaharui", **bukan** angka lama — angka lama
  mengelirukan (97% daripada tetingkap lepas).

Dua tindakan ops pada endpoint `cbt-ingest`, **berpagar kunci ingest** (bukan
sesi) — jadi ia berkongsi sempadan kepercayaan yang sama seperti `ingestUsage`
dan tidak menambah permukaan awam:

- `diagUsage` — ringkasan storan (bilangan rekod, akaun unik, masa tertua/
  terbaru, status). Berguna untuk membezakan "Habblaud belum hantar" daripada
  "sheet hilang".
- `resetUsage` — buang semua baris data (kekalkan header). Kunci ingest sudah
  membenarkan suntikan data sewenang-wenangnya, jadi ia tidak menambah kuasa.

**Amaran ujian:** `e2e.mjs` dalam projek `cbt-ingest` menulis ke URL `/exec`
**produksi**, bukan pasir. Selepas menjalankannya, sheet mengandungi akaun
ujian (`.claude`, `.claude-opus`, `semak`, `=IMPORTXML(...)`). Jalankan
`resetUsage` selepas ujian supaya angka sebenar Habblaud tidak bercampur dengan
data ujian. (Nilai formula seperti `=IMPORTXML` **dilindungi**: `sanitize_`
menambah awalan `'` menjadikannya teks, bukan formula aktif.)

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

### Avatar ejen: bentuk licin, bukan blok piksel

`drawAgent()` dalam `office.html` melukis setiap ejen dengan bentuk licin
(`arc`/`ellipse`/`roundRect`) — kepala bulat, mata besar berkilau, kening,
senyuman, leher, bahu dan tangan bulat. Jangan kembali kepada blok
`fillRect` berasaskan grid: pada saiz skrin sebenar kepala 4x5 piksel
(16x20px) kelihatan seperti **kotak**, bukan orang.

Cara mengesahkan bentuk tanpa meneka: tangkap skrin, tandakan piksel kulit
(palet `SKIN`), kemudian kira nisbah isi dalam kotak sempadan.
Bulatan isi ~66% (atau kurang bila rambut menutupi sisi); segi empat isi
~100%. Warna meja (`deskTop #a86f3a`) dahulunya hampir sama dengan kulit
(`#e3b58a`) dan menyebabkan ukuran tersalah; ia kini digelapkan supaya
perbezaan jelas.

#### Rambut tidak boleh menutupi muka

Jisim rambut mesti dilukis **di belakang** muka, dan bahagian depan mesti
berbentuk "topi" (lengkok atas `ellipse` + garisan lurus sebagai garis
rambut) melalui `capPath()`. Elips PENUH sebagai rambut akan menutupi
seluruh muka — hanya celah mata kelihatan. Garis rambut (`cut`) mesti cukup
tinggi (kini `-1.95 * s`) supaya kening tidak tertimbus; ciri muka (`ey`,
hidung, senyuman) pula diletak di bawah tengah kepala supaya dahi lapang.
Semasa menguji, ukur bilangan piksel kulit muka: jika < ~60px untuk satu
avatar, rambut berkemungkinan besar sedang menutupi muka.

#### Interaksi antara ejen

`updateSocial()` memilih sepasang ejen berdekatan secara berkala dan memberi
dialog daripada `CHAT`: gelembung dilukis oleh `drawBubbles()` (dipanggil
selepas semua avatar dalam `draw()`), avatar berpaling melalui `a.look`, dan
melambai apabila `a.chatUntil` masih aktif. Kadangkala ejen berjalan
menghampiri rakan (`walkNear()`, ditandakan `a.social`) lalu pulang ke tempat
duduk. Hadkan kepada 2 perjalanan serentak (`office.socialWalks`) supaya
pejabat tidak menjadi huru-hara, dan hormati `reduceMotion()` serta
`document.hidden`. Gelembung disimpan dalam `office.bubbles` dan direset
dalam `office.start()`.
