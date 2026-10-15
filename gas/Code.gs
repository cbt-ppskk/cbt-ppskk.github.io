/**
 * ============================================================================
 *  SISTEM PENGURUSAN PENUGASAN — CAWANGAN BANTUAN TEKNIK PPSKK (MPDRMKL)
 *  Code.gs  —  Google Apps Script backend  (v48 / API v48)
 * ============================================================================
 *  PERUBAHAN v48 (FIX 'sambungan Google Sheet gagal' + ping + diagnostik tahan lasak):
 *   1) Fungsi baharu ping() — tindakan AWAM yang sentiasa wujud untuk ujian sambungan
 *      asas (pulangkan ok, service, version, spreadsheetId, sheetName, sheetOk).
 *      Tindakan router 'ping' + menu Apps Script '🩺 Uji Sambungan (Ping)'.
 *   2) diagnoseSheet() kini TAhan LASak — kod ralat spesifik: SHEET_NOT_FOUND /
 *      PERMISSION_DENIED / SHEET_ERROR / MISSING_TABS, mesej Bahasa Melayu boleh
 *      tindak, + bilangan baris setiap tab utama (counts).
 *   3) doGet() pulangkan version 'v48'.
 * ============================================================================
 *  PERUBAHAN v47 (Sheet ID boleh dikonfigurasi + diagnostik Sheet):
 *   1) Sheet ID TIDAK lagi hardcode sahaja — dibaca dari Script Properties
 *      ('SPREADSHEET_ID') dahulu, jika tiada guna DEFAULT_SPREADSHEET_ID.
 *   2) Fungsi baharu getSpreadsheetId() / setSpreadsheetId(id) + menu Apps Script
 *      '⚙️ Tetapkan Sheet ID' — tukar Sheet sasaran TANPA edit kod.
 *   3) Fungsi baharu diagnoseSheet() — laporkan Sheet ID, nama, senarai tab &
 *      tab wajib yang hilang. Tindakan router 'diagnoseSheet' + menu '🔎 Diagnostik Sheet'.
 * ============================================================================
 *  PERUBAHAN v46 (FIX ralat 'Tiada permintaan OTP. Sila daftar semula.'):
 *   1) STORAN OTP TAHAN LASAK: permintaan OTP kini disimpan dalam tab Google Sheet
 *      'OTP_Requests' (E-mel, No Personel, Kod, Jenis, Masa Luput, Status, Cubaan,
 *      Cap Masa, Nama, Hash, Salt, Peranan, Tarikh Lahir) — BUKAN hanya
 *      PropertiesService/CacheService yang boleh luput/hilang.
 *   2) verifyOTP() mencari permintaan ikut No. Personel ATAU e-mel (Sheet dahulu,
 *      PropertiesService sebagai sandaran) — padanan e-mel dinormalkan (trim+lowercase).
 *   3) Mesej ralat BOLEH TINDAK: 'Sila minta kod OTP baharu' + tindakan baharu
 *      resendOTP() untuk hantar semula kod (kod lama dibatalkan, kod baharu sah).
 *   4) requestPasswordReset()/resetPassword() turut guna storan Sheet yang sama.
 * ============================================================================
 *  PERUBAHAN v50 (MODUL HARI JADI / TARIKH PROFIL — BETUL & BERULANG SETIAP TAHUN):
 *   1) Parser tarikh TAHAN LASA (mdPartsFromAny_): menyokong objek Date sel
 *      Google Sheet, 'YYYY-MM-DD', 'DD-MM-YYYY', 'DD/MM/YYYY', 'YYYY/MM/DD',
 *      'D.M.YYYY' dan sisa ISO. Objek Date guna masa tempatan (elak alih sehari).
 *   2) getProfileDatesRange(year) — semua tarikh profil bagi TAHUN diminta;
 *      tarikh BERULANG setiap tahun (padan bulan+harian, abaikan tahun).
 *   3) Setiap rekod pulangkan {name,no,md,day,month,year,email} untuk penanda
 *      kalendar + pop-up butiran (BUKAN banner satu skrin).
 * ============================================================================
 *  PERUBAHAN v49 (PANTAU & BERSIH OTP UNTUK PENTADBIR):
 *   1) listActiveOtp() — senarai permintaan OTP dari tab 'OTP_Requests' dengan
 *      status Aktif / Luput / Telah Digunakan + baki saat + kiraan ringkas.
 *   2) purgeExpiredOtp() — padam rekod OTP yang sudah luput/telah digunakan
 *      (rekod aktif dikekalkan).
 *   3) guardAdmin_() — penegakan PERANAN di SISI-PELAYAN: kedua-dua tindakan di atas
 *      hanya untuk SUPER_ADMIN / ADMIN (bukan sekadar menyembunyikan UI).
 *   4) Menu Apps Script: '🔐 Senarai OTP Aktif' + '🗑️ Padam OTP Luput'.
 * ============================================================================
 *  PERUBAHAN v45 (FIX ralat 'E-mel ini telah didaftarkan'):
 *   1) registerUser() kini IDEMPOTENT — e-mel TIDAK PERNAH memblok pendaftaran.
 *      Tiada lagi semakan keunikan e-mel; e-mel sedia ada boleh didaftarkan semula.
 *   2) Padanan e-mel dinormalkan (trim + lowercase) di SEMUA fungsi melalui
 *      normEmail_(): registerUser / verifyOTP / requestPasswordReset /
 *      resetPassword / findAccessRow_ / freeEmailForReuse_ / resetUserRegistration.
 *   3) Tindakan baharu resetRegistrationByEmail(emailOrNoPersonel) — reset SATU e-mel
 *      (tambah pada menu Apps Script: 'Reset Pendaftaran Satu E-mel').
 * ============================================================================
 *  PERUBAHAN v27 (berbanding v25):
 *   1) SPREADSHEET_ID pusat ditetapkan (lihat KONFIGURASI).
 *   2) Model 4 PERANAN berasingan: SUPER_ADMIN / ADMIN / PENYELIA / STAF.
 *   3) SESI BERToken di pelayan (PropertiesService) + penegakan kebenaran
 *      sisi-pelayan pada SETIAP tindakan istimewa (bukan sekadar UI).
 *   4) PUSAT KAWALAN AKSES: adminListUsers / adminUpdateUser (tukar peranan,
 *      aktif/nyahaktif) / adminResetAccess — hanya SUPER ADMIN.
 *   5) AUDIT LOG append-only (tab Audit_Log) + endPoint getAuditLog.
 *   6) TETAPAN SISTEM (tab Tetapan_Sistem): getSettings / saveSetting.
 *   7) ALIRAN KELULUSAN: submitPenugasan / approvePenugasan / (hanya
 *      SUPER ADMIN + ADMIN dibenarkan melulus; PENYELIA tidak).
 *   8) ensureSheets()/setupSheets(): bina & selaras SEMUA tab secara automatik
 *      tanpa memadam data sedia ada.
 *   9) PELINDUNG: akaun SUPER ADMIN terakhir tidak boleh dinyahaktif/diturunkan.
 *
 *  KESELAMATAN:
 *   - Kata laluan di-hash SHA-256 + salt (tidak pernah disimpan asal).
 *   - OTP 6 digit, luput 5 minit, had 5 cubaan.
 *   - Mesej set semula GENERIK (tidak dedah kewujudan e-mel).
 *   - Sanitasi formula-injection.
 *   - Kebenaran dikuatkuasa di pelayan; peranan bagi pelayar TIDAK dipercayai.
 * ============================================================================
 */

/* ----------------------------- KONFIGURASI ------------------------------ */
/* v47: Sheet ID boleh dikonfigurasi. Keutamaan:
 *   1) Script Properties 'SPREADSHEET_ID' (ditetapkan via menu '⚙️ Tetapkan Sheet ID')
 *   2) Nilai lalai di bawah (DEFAULT_SPREADSHEET_ID)
 * Ini membolehkan tukar Sheet sasaran TANPA edit kod. */
var DEFAULT_SPREADSHEET_ID = '1Vm3fWQzZeHOHHaBY1ZLYjz2KlwTx7M0dexIyJllIe-c';
var SPREADSHEET_ID = DEFAULT_SPREADSHEET_ID; /* kekal untuk keserasian rujukan lama */

/** v47: baca Sheet ID aktif (Script Properties dahulu, jika tiada guna lalai). */
function getSpreadsheetId() {
  try {
    var v = PropertiesService.getScriptProperties().getProperty('SPREADSHEET_ID');
    if (v && String(v).trim()) return String(v).trim();
  } catch (e) { }
  return DEFAULT_SPREADSHEET_ID;
}

/** v47: tetapkan Sheet ID sasaran (disimpan dalam Script Properties). Terima URL penuh juga. */
function setSpreadsheetId(id) {
  id = String(id == null ? '' : id).trim();
  var m = id.match(/\/spreadsheets\/d\/([a-zA-Z0-9-_]+)/);
  if (m) id = m[1];
  if (!id) return { ok: false, error: 'Sheet ID kosong.' };
  try {
    var ss = SpreadsheetApp.openById(id); /* sahkan boleh dibuka */
    PropertiesService.getScriptProperties().setProperty('SPREADSHEET_ID', id);
    return { ok: true, id: id, name: ss.getName() };
  } catch (e) {
    return { ok: false, error: 'Tidak dapat membuka Sheet ID ini: ' + (e && e.message ? e.message : String(e)) };
  }
}

/** v47: diagnostik Sheet — laporkan Sheet ID, nama, senarai tab & tab wajib yang hilang.
 *  v48: tahan lasak — kod ralat spesifik (SHEET_NOT_FOUND / PERMISSION_DENIED /
 *  SHEET_ERROR / MISSING_TABS), mesej Bahasa Melayu boleh tindak, + bilangan baris tab utama. */
function diagnoseSheet(revealId) {
  var id = getSpreadsheetId();
  var out = { ok: true, source: 'lalai (DEFAULT_SPREADSHEET_ID)', name: '', url: '', tabs: [], required: [], missing: [], counts: {}, code: '', message: '' };
  /* v104: ID/URL Sheet hanya untuk pentadbir — ia pautan terus kepada data peribadi. */
  if (revealId) { out.spreadsheetId = id; out.url = 'https://docs.google.com/spreadsheets/d/' + id + '/edit'; }
  try {
    var props = PropertiesService.getScriptProperties().getProperty('SPREADSHEET_ID');
    if (props && String(props).trim()) out.source = 'Script Properties';
  } catch (e) { }
  var reqDefs = [
    { label: 'Pengguna_Akses', cands: [SHEET_AKSES] },
    { label: 'Master_Personel', cands: CAND_PERSONEL },
    { label: 'Hari_Lahir', cands: [SHEET_HARIJADI] },
    { label: 'Log_Penugasan', cands: CAND_LOG },
    { label: 'Staging_Penugasan', cands: [SHEET_STAGING] },
    { label: 'Master_Kepimpinan', cands: CAND_KEPIMPINAN },
    { label: 'OTP_Requests', cands: [SHEET_OTP] }
  ];
  for (var r = 0; r < reqDefs.length; r++) out.required.push(reqDefs[r].label);
  var ss = null;
  try {
    ss = SpreadsheetApp.openById(id);
  } catch (openErr) {
    var om = (openErr && openErr.message ? openErr.message : String(openErr));
    out.ok = false;
    out.code = /not found|cannot find|no item with the given id|not exist|invalid/i.test(om) ? 'SHEET_NOT_FOUND'
      : /permission|denied|authoriz|forbidden|access/i.test(om) ? 'PERMISSION_DENIED' : 'SHEET_ERROR';
    out.error = om;
    out.message = mapSheetErr_(out.code, om);
    return out;
  }
  try {
    out.name = ss.getName();
    var sheets = ss.getSheets();
    for (var i = 0; i < sheets.length; i++) out.tabs.push(sheets[i].getName());
    for (var j = 0; j < reqDefs.length; j++) {
      var found = false;
      for (var k = 0; k < reqDefs[j].cands.length; k++) {
        if (out.tabs.indexOf(reqDefs[j].cands[k]) !== -1) { found = true; break; }
      }
      if (!found) out.missing.push(reqDefs[j].label);
    }
    /* v48: bilangan baris setiap tab utama yang WUJUD. */
    try {
      var cntNames = [SHEET_AKSES, SHEET_PERSONEL, SHEET_HARIJADI, SHEET_LOG, SHEET_STAGING, SHEET_KEPIMPINAN, SHEET_OTP];
      for (var c = 0; c < cntNames.length; c++) {
        var t = ss.getSheetByName(cntNames[c]);
        if (t) out.counts[cntNames[c]] = Math.max(0, t.getLastRow() - 1);
      }
    } catch (ce) { }
    out.ok = out.missing.length === 0;
    if (!out.ok) { out.code = 'MISSING_TABS'; out.message = 'Tab wajib hilang: ' + out.missing.join(', ') + ' — jalankan menu Setup / Kemaskini Semua Tab.'; }
  } catch (e) {
    out.ok = false;
    out.code = 'SHEET_ERROR';
    out.error = (e && e.message ? e.message : String(e));
    out.message = mapSheetErr_('SHEET_ERROR', out.error);
  }
  return out;
}

/** v48: peta kod ralat Sheet -> mesej Bahasa Melayu yang jelas & boleh tindak. */
function mapSheetErr_(code, msg) {
  if (code === 'SHEET_NOT_FOUND') return 'Sheet ID tidak dijumpai. Sahkan ID atau gunakan menu Tetapkan Sheet ID.';
  if (code === 'PERMISSION_DENIED') return 'Tiada kebenaran akses Sheet. Pastikan akaun pelaksana deployment mempunyai akses Edit pada Sheet tersebut.';
  return 'Ralat membuka Sheet: ' + (msg || 'tidak diketahui');
}

/** v48: ping ringan — sentiasa wujud untuk ujian sambungan asas (awam, tanpa sesi). */
/* v104: ID Sheet TIDAK dipulangkan kepada pemanggil tanpa sesi. Ia memberi pautan
   terus kepada data peribadi (Pengguna_Akses, OTP_Requests). Menu Apps Script
   memanggil ping(true) kerana ia berjalan sebagai pemilik dengan UI sendiri. */
function ping(includeId) {
  var out = { ok: true, service: 'CBT MPDRMKL Backend', version: 'v103', api: 'v103', minAppVer: 'v103', time: new Date().toISOString(), sheetName: '', sheetOk: false };
  if (includeId) out.spreadsheetId = getSpreadsheetId();
  try {
    var ss = SpreadsheetApp.openById(getSpreadsheetId());
    out.sheetName = ss.getName();
    out.sheetOk = true;
  } catch (e) {
    out.sheetOk = false;
    out.sheetError = (e && e.message ? e.message : String(e));
  }
  return out;
}

/* Nama kanonik + senarai calon (untuk keserasian tab lama/berbeza). */
var SHEET_AKSES      = 'Pengguna_Akses';
var SHEET_PERSONEL   = 'Master Personel';
var SHEET_HARIJADI   = 'Hari Jadi';
var SHEET_LOG        = 'Log_Penugasan';
var SHEET_STAGING    = 'Staging_Penugasan';
var SHEET_KEPIMPINAN = 'Master_Kepimpinan';
var SHEET_VALIDASI   = 'Validasi_Rekod';
var SHEET_AUDIT      = 'Audit_Log';
var SHEET_TETAPAN    = 'Tetapan_Sistem';
var SHEET_KELULUSAN  = 'Kelulusan_Penugasan';
var SHEET_PENYELIA   = 'Mapping Penyelia';
var SHEET_OTP        = 'OTP_Requests';
var SHEET_LOG_DELETED = 'Log_Deleted';

/* Calon nama tab (fallback kepada struktur sedia ada). */
var CAND_LOG        = ['Log_Penugasan', 'LogPenugasan', 'Log'];
var CAND_KEPIMPINAN = ['Master_Kepimpinan', 'Kepimpinan'];
var CAND_PERSONEL   = ['Master Personel', 'Master_Personel'];

/* v51: peta singkatan bulan (untuk parse format Date.toString() Google Sheet). */
var MONTH_ABBR_ = { jan: 1, feb: 2, mar: 3, apr: 4, may: 5, jun: 6, jul: 7, aug: 8, sep: 9, oct: 10, nov: 11, dec: 12 };

var OTP_TTL_MS       = 5 * 60 * 1000;   // 5 minit
var OTP_MAX_ATTEMPTS = 5;
var SESSION_TTL_MS   = 8 * 60 * 60 * 1000; // 8 jam
var OTP_PROP_PREFIX  = 'OTP_';
var OTP_RESET_PREFIX = 'OTP_RESET_';
var SESSION_PREFIX   = 'SESS_';
var SENDER_NAME      = 'Sistem Penugasan CBT MPDRMKL';

/* Header kanonik setiap tab. */
var AKSES_HEADERS = ['E-mel', 'Nama', 'No Personel', 'Peranan', 'Status', 'Tarikh Daftar', 'Hash', 'Salt', 'Tarikh Lahir', 'Log Masuk Terakhir'];
var PERSONEL_HEADERS = ['No Personel', 'Nama', 'Pangkat', 'Unit', 'Team', 'Status', 'E-mel', 'Peranan'];
var HARIJADI_HEADERS = ['Emel', 'Nama', 'No_Personel', 'Tarikh_Lahir', 'Cap_Masa'];
var LOG_HEADERS = ['Bil', 'ID Penugasan', 'Tarikh Mula', 'Tarikh Tamat', 'Tajuk', 'Masa Mula', 'Masa Tamat', 'Team', 'Petugas', 'Tempat', 'Direkod Oleh', 'Tarikh Rekod', 'Jenis', 'Fasa', 'Jumlah Jam', 'Jam-Orang', 'Status', 'Diluluskan Oleh', 'Tarikh Lulus', 'Penyelia', 'Raw WhatsApp Log'];
/* v95: 3 lajur status validasi DITAMBAH DI HUJUNG supaya indeks lajur sedia ada
   (0..20) TIDAK berubah langsung. Rekod lama tanpa lajur ini dianggap 'Belum
   Validasi' secara lalai (rujuk statusValidasiOf_). getSheet_ mengembangkan baris
   header apabila getLastColumn() < LOG_HEADERS.length. */
var LOG_HEADERS_V95_EXTRA = ['Status Validasi', 'Divalidasi Oleh', 'Tarikh Validasi'];
var LOG_STATUS_VALIDASI_COL_IDX = 21; /* 0-based: lajur ke-22 */
var STAGING_HEADERS = ['Bil', 'Tarikh Mula', 'Tarikh Tamat', 'Tajuk', 'Masa Mula', 'Masa Tamat', 'Jenis', 'Fasa', 'Tempat', 'Petugas', 'Jumlah Jam', 'Jam-Orang', 'Status', 'Direkod Oleh', 'Tarikh Rekod', 'ID Draf']; /* v92: +lajur 'ID Draf' supaya simpan draf = UPSERT, bukan append */
var KEPIMPINAN_HEADERS = ['Nama', 'Jawatan', 'URL Gambar', 'Susunan'];
var VALIDASI_HEADERS = ['Bil', 'Status', 'Oleh', 'Cap Masa'];
var AUDIT_HEADERS = ['Cap Masa', 'ID Pelaku', 'Nama Pelaku', 'Tindakan', 'Modul', 'ID Sasaran', 'Nilai Lama', 'Nilai Baharu', 'Keputusan'];
var TETAPAN_HEADERS = ['Kunci', 'Nilai', 'Dikemas Kini Oleh', 'Cap Masa'];
var KELULUSAN_HEADERS = ['ID Penugasan', 'Status', 'Dihantar Oleh', 'Tarikh Hantar', 'Diluluskan Oleh', 'Tarikh Lulus', 'Catatan'];
var PENYELIA_HEADERS = ['No Personel', 'Nama', 'Team', 'Penyelia', 'E-mel', 'Status'];
/* v74: helaian jejak SOFT DELETE Log_Penugasan (rekod asal KEKAL dalam Log_Penugasan). */
var LOG_DELETED_HEADERS = ['Kunci', 'ID Penugasan', 'Bil', 'Tarikh Mula', 'Tajuk', 'Dipadam Oleh', 'Cap Masa', 'Sebab', 'Salinan Baris'];
/* v46: storan OTP tahan lasak (Sheet) — 13 lajur. */
var OTP_HEADERS = ['E-mel', 'No Personel', 'Kod', 'Jenis', 'Masa Luput', 'Status', 'Cubaan', 'Cap Masa', 'Nama', 'Hash', 'Salt', 'Peranan', 'Tarikh Lahir'];

/* ------------------------------- PERANAN -------------------------------- */
var ROLE_SUPER = 'SUPER_ADMIN';
var ROLE_ADMIN = 'ADMIN';
var ROLE_PENYELIA = 'PENYELIA';
var ROLE_STAF = 'STAF';

/* Normalisasi label peranan daripada pelbagai ejaan → salah satu daripada 4. */
function normRole_(v) {
  var s = String(v == null ? '' : v).trim().toUpperCase().replace(/[\s\-]+/g, '_');
  if (s === 'SUPER_ADMIN' || s === 'SUPERADMIN' || s === 'SUPER' || s === 'SUPER_ADMINISTRATOR') return ROLE_SUPER;
  if (s === 'ADMIN' || s === 'PENTADBIR' || s === 'PENTADBIR_SISTEM' || s === 'ADMINISTRATOR') return ROLE_ADMIN;
  if (s === 'PENYELIA' || s === 'SUPERVISOR' || s === 'PENYELIA_AM') return ROLE_PENYELIA;
  return ROLE_STAF;
}

/* Matriks kebenaran lalai (boleh diubah oleh SUPER ADMIN via Tetapan_Sistem). */
function defaultPerms_() {
  return {
    'SUPER_ADMIN': { dashboard: 1, log: 1, personel: 1, laporan: 1, analitik: 1, audit: 1, kawalan_akses: 1, tetapan: 1, penugasan_cipta: 1, kelulusan: 1, eksport: 1, urus: 1 },
    'ADMIN':       { dashboard: 1, log: 1, personel: 1, laporan: 1, analitik: 1, audit: 1, kawalan_akses: 1, tetapan: 0, penugasan_cipta: 1, kelulusan: 1, eksport: 1, urus: 1 },
    'PENYELIA':    { dashboard: 1, log: 1, personel: 1, laporan: 1, analitik: 1, audit: 0, kawalan_akses: 0, tetapan: 0, penugasan_cipta: 1, kelulusan: 0, eksport: 1, urus: 0 },
    'STAF':        { dashboard: 1, log: 1, personel: 0, laporan: 1, analitik: 0, audit: 0, kawalan_akses: 0, tetapan: 0, penugasan_cipta: 0, kelulusan: 0, eksport: 0, urus: 0 }
  };
}

/* ------------------------------- ROUTER --------------------------------- */
function doGet(e) {
  return json_({ ok: true, service: 'CBT MPDRMKL Backend', version: 'v103', api: 'v103', minAppVer: 'v103', time: new Date().toISOString() });
}

function doPost(e) {
  var body = {};
  try {
    if (e && e.postData && e.postData.contents) body = JSON.parse(e.postData.contents);
  } catch (parseErr) {
    return json_({ ok: false, error: 'Permintaan tidak sah (JSON).' });
  }
  var action = String(body.action || '');
  try {
    switch (action) {
      /* Awam / auth */
      case 'registerUser':         return json_(registerUser(body));
      case 'verifyOTP':            return json_(verifyOTP(body.email, body.code, body.no));
      case 'resendOTP':            return json_(resendOTP(body));
      case 'loginUser':            return json_(loginUser(body));
      case 'requestPasswordReset': return json_(requestPasswordReset(body));
      case 'resetPassword':        return json_(resetPassword(body));
      case 'whoami':               return json_(whoami(body));
      case 'logout':               return json_(logout(body));

      /* Data umum (perlu sesi sah) */
      case 'cariPengguna':         return json_(guard_(body, null, function () { return cariPengguna(body); }));
      case 'getValidasiRekod':     return json_(guard_(body, null, function () { return { ok: true, data: getValidasiRekod() }; }));
      case 'validasiRekod':        return json_(guard_(body, ['kelulusan', 'urus'], function (s) { return validasiRekod(body, s); }));
      /* v104: perlu sesi sah — data kepimpinan mengandungi nama & e-mel pegawai. */
      case 'getLeadershipData':    return json_(guard_(body, null, function () { return { ok: true, data: getLeadershipData() }; }));
      case 'getPersonnelList':     return json_(guard_(body, null, function () { return { ok: true, data: getPersonnelList() }; }));
      case 'getMasterPersonel':    return json_(guard_(body, null, function () { return { ok: true, data: getPersonnelList() }; }));
      case 'upsertPersonel':       return json_(guardAdmin_(body, function (s) { return upsertPersonel(body, s); }));
      case 'saveBatchTasks':       return json_(guard_(body, ['penugasan_cipta', 'urus'], function (s) { return saveBatchTasks(body.tasks || [], s); }));
      case 'fetchLogData':         return json_(guard_(body, null, function () { return { ok: true, data: fetchLogData(body.startDate, body.endDate) }; }));
      /* v73: KIRAAN rasmi dari backend (Sheet) — sumber tunggal kebenaran merentas peranti. */
      case 'fetchLogCounts':       return json_(guard_(body, null, function () { return { ok: true, data: fetchLogCounts_(body.periodStart) }; }));
      /* v63: EDIT FASA rekod Log_Penugasan (hanya Admin/Pentadbir; sumber = Google Sheet). */
      case 'updateLogFasa':        return json_(guard_(body, ['penugasan_cipta', 'urus'], function (s) { return updateLogFasa_(body, s); }));
      case 'updateLogPenuh':       return json_(guard_(body, ['penugasan_cipta', 'urus'], function (s) { return updateLogPenuh_(body, s); }));
      /* v75: PADAM log = HARD DELETE (salin ke Log_Deleted dahulu) — admin sahaja. */
      case 'deleteLog':            return json_(guardAdmin_(body, function (s) { return deleteLog_(body, s); }));
      /* v75: kesan & bersihkan rekod log yang BERULANG — admin sahaja. */
      case 'findDuplicates':       return json_(guardAdmin_(body, function (s) { return findDuplicates_(body, s); }));
      /* v75: susun semula No. Log ikut turutan kronologi (tanpa lompang) — admin sahaja. */
      case 'renumberLog':          return json_(guardAdmin_(body, function (s) { return renumberLog_(body, s); }));
      /* v92: beri ID unik & kekal kepada baris format BAHARU yang ID-nya pendua/tiada
         (elak edit tersasar & pendua). Baris LEGACY tidak diubah. Admin sahaja. */
      case 'backfillLogIds':       return json_(guardAdmin_(body, function (s) { return { ok: true, stats: backfillLogIds_(s) }; }));
      /* v93: RESTORE rekod dipadam (Log_Deleted -> Log_Penugasan) \u2014 admin sahaja. */
      case 'getDeletedLogs':       return json_(guardAdmin_(body, function (s) { return getDeletedLogs_(s); }));
      case 'restoreLog':           return json_(guardAdmin_(body, function (s) { return restoreLog_(body, s); }));
      /* v95: PULIH PUKAL — senarai kunci arkib. */
      case 'restoreLogs':          return json_(guardAdmin_(body, function (s) { return restoreLogs_(body, s); }));
      /* v104: perlu sesi sah — nama, No. Personel, tarikh lahir & e-mel.
         Dipanggil hanya selepas log masuk (initProfileDates), jadi tiada kesan UI. */
      case 'getProfileDatesToday': return json_(guard_(body, null, function () { return { ok: true, data: getProfileDatesToday() }; }));
      case 'getProfileDates':      return json_(guard_(body, null, function () { return { ok: true, data: getProfileDates() }; }));
      /* v50: semua tarikh profil bagi TAHUN yang diminta (kalendar boleh navigasi tahun). */
      case 'getProfileDatesRange': return json_(guard_(body, null, function () { return { ok: true, data: getProfileDatesRange(body.year) }; }));
      case 'getUserProfile':       return json_(guard_(body, null, function (s) { return getUserProfile(s); }));
      case 'updateStatusValidasi': return json_(guard_(body, ['kelulusan', 'urus'], function (s) { return updateStatusValidasi(body, s); }));
      /* v95: validasi penugasan (2 halaman: Belum Validasi / Selesai Validasi) */
      case 'validateLogs':         return json_(guardAdmin_(body, function (s) { return validateLogs_(body, s); }));
      case 'unvalidateLogs':       return json_(guardAdmin_(body, function (s) { return unvalidateLogs_(body, s); }));
      case 'resetUserRegistration':return json_(guard_(body, ['kawalan_akses', 'urus'], function (s) { return resetUserRegistration(body, s); }));
      case 'resetRegistrationByEmail':return json_(guard_(body, ['kawalan_akses', 'urus'], function (s) { return resetRegistrationByEmail(body.emailOrNoPersonel || body.email || body.no, s); }));
      case 'clearAllRegistrations':return json_(guard_(body, ['kawalan_akses'], function (s) { return clearAllRegistrations(s); }));
      case 'clearAllAccessRegistrations':return json_(guard_(body, ['kawalan_akses'], function (s) { return clearAllAccessRegistrations(s); }));
      case 'saveStagingPenugasan': return json_(guard_(body, ['penugasan_cipta', 'urus'], function (s) { return saveStagingPenugasan(body.record || {}, s); }));
      /* v61: senarai & padam draf (Staging_Penugasan) untuk tab Draf. */
      case 'getStagingPenugasan':  return json_(guard_(body, ['penugasan_cipta', 'urus'], function () { return { ok: true, data: getStagingPenugasan() }; }));
      case 'deleteStagingPenugasan': return json_(guard_(body, ['penugasan_cipta', 'urus'], function (s) { return deleteStagingPenugasan(body, s); }));
      case 'commitLogPenugasan':   return json_(guard_(body, ['penugasan_cipta', 'urus'], function (s) { return commitLogPenugasan(body.records || [], s); }));

      /* Kelulusan penugasan (SUPER ADMIN + ADMIN sahaja) */
      case 'submitPenugasan':      return json_(guard_(body, ['penugasan_cipta', 'urus'], function (s) { return submitPenugasan(body.record || {}, s); }));
      case 'approvePenugasan':     return json_(guard_(body, ['kelulusan'], function (s) { return approvePenugasan(body, s); }));
      case 'listKelulusan':        return json_(guard_(body, ['kelulusan'], function () { return { ok: true, data: listKelulusan() }; }));

      /* Pusat Kawalan Akses (SUPER ADMIN sahaja) */
      case 'adminListUsers':       return json_(guard_(body, ['kawalan_akses'], function () { return { ok: true, data: adminListUsers() }; }));
      case 'adminUpdateUser':      return json_(guard_(body, ['kawalan_akses'], function (s) { return adminUpdateUser(body, s); }));
      case 'adminResetAccess':     return json_(guard_(body, ['kawalan_akses'], function (s) { return adminResetAccess(body, s); }));
      /* v49: PANTAU & BERSIH OTP — peranan disemak di PELAYAN (bukan sekadar sembunyi UI). */
      case 'listActiveOtp':        return json_(guardAdmin_(body, function () { return listActiveOtp(); }));
      case 'purgeExpiredOtp':      return json_(guardAdmin_(body, function (s) { return purgeExpiredOtp(s); }));
      case 'requestDeactivate':    return json_(requestDeactivate(body));

      /* Audit (baca: pengguna berpermission audit) */
      case 'getAuditLog':          return json_(guard_(body, ['audit'], function () { return { ok: true, data: getAuditLog(body.limit) }; }));

      /* Tetapan Sistem (SUPER ADMIN sahaja) */
      case 'getSettings':          return json_(guard_(body, ['tetapan', 'kawalan_akses'], function () { return { ok: true, data: getSettings(), perms: getPermissionMatrix() }; }));
      case 'saveSetting':          return json_(guard_(body, ['tetapan'], function (s) { return saveSetting(body, s); }));

      /* Utiliti setup — v104: setupSheets mengubah STRUKTUR Sheet (cipta tab/header),
         jadi ia HANYA untuk pentadbir. ping/diagnoseSheet boleh dicapai dengan sesi sah. */
      case 'setupSheets':          return json_(guardAdmin_(body, function () { return setupSheets(); }));
      case 'ping':                 return json_(ping());
      /* v104: JANGAN dedahkan spreadsheetId/URL kepada awam — ia memberi pautan terus
         kepada data peribadi. Perlu sesi sah; ID hanya untuk pentadbir. */
      case 'diagnoseSheet':        return json_(guard_(body, null, function (s) { return diagnoseSheet(isAdminRole_(s.role)); }));
      /* v51: baiki tarikh lahir dalam tab 'Hari Jadi' (admin sahaja). */
      case 'repairHariJadiDates':  return json_(guardAdmin_(body, function () { return repairHariJadiDates(); }));
      /* v62: baiki nilai Peranan Master Personel -> kod kanonik (admin sahaja). */
      case 'repairPersonelRoles':  return json_(guardAdmin_(body, function (s) { return repairPersonelRoles(s); }));

      default: return json_({ ok: false, error: 'Tindakan tidak dikenali: ' + action });
    }
  } catch (err) {
    return json_({ ok: false, error: 'Ralat pelayan: ' + (err && err.message ? err.message : String(err)) });
  }
}

/* --------------------------- SESI & KEBENARAN --------------------------- */
/**
 * guard_(body, requiredPerms, fn) — penegakan sisi-pelayan.
 * Sesi disahkan melalui token (SESSION_PREFIX+token). Jika `requiredPerms`
 * diberi, pengguna mesti memiliki sekurang-kurangnya satu kebenaran itu.
 */
function guard_(body, requiredPerms, fn) {
  body = body || {};
  var s = auth_(body.token || body.session);
  /* v84: bentuk kiraan SERAGAM supaya UI memapar jumlah sebenar (bukan 0/0). */
  if (!s) return { ok: false, error: 'Sesi tidak sah atau telah tamat. Sila log masuk semula.', code: 'NO_SESSION', results: [], successCount: 0, failureCount: 0 };
  if (requiredPerms && requiredPerms.length) {
    var allowed = false;
    for (var i = 0; i < requiredPerms.length; i++) {
      if (hasPerm_(s.role, requiredPerms[i])) { allowed = true; break; }
    }
    if (!allowed) {
      auditLog_(s, 'AKSES_DITOLAK', 'Kebenaran', '', '', '', 'GAGAL');
      return { ok: false, error: 'Akses ditolak: peranan ' + s.role + ' tiada kebenaran untuk tindakan ini.', code: 'FORBIDDEN', results: [], successCount: 0, failureCount: 0 };
    }
  }
  return fn(s);
}

/**
 * v49: guardAdmin_(body, fn) — penegakan PERANAN di sisi-pelayan untuk tindakan pentadbir.
 * Tindakan seperti senarai OTP / bersih OTP hanya dibenarkan untuk Pentadbir Sistem atau Admin.
 * Ini BUKAN sekadar menyembunyikan UI — permintaan tanpa sesi sah ATAU peranan bukan-admin DITOLAK.
 */
function isAdminRole_(role) { var r = normRole_(role); return r === ROLE_SUPER || r === ROLE_ADMIN; }
function guardAdmin_(body, fn) {
  body = body || {};
  var s = auth_(body.token || body.session);
  if (!s) return { ok: false, error: 'Sesi tidak sah atau telah tamat. Sila log masuk semula.', code: 'NO_SESSION' };
  if (!isAdminRole_(s.role)) {
    try { auditLog_(s, 'AKSES_DITOLAK', 'OTP Aktif', '', '', '', 'GAGAL'); } catch (e) { }
    return { ok: false, error: 'Akses ditolak: tindakan ini hanya untuk Pentadbir Sistem / Admin.', code: 'FORBIDDEN' };
  }
  return fn(s);
}

function auth_(token) {
  token = String(token || '').trim();
  if (!token) return null;
  try {
    var raw = PropertiesService.getScriptProperties().getProperty(SESSION_PREFIX + token);
    if (!raw) return null;
    var s = JSON.parse(raw);
    if (Date.now() > Number(s.exp || 0)) return null;
    return s; // {email,name,no,role,exp}
  } catch (e) { return null; }
}

function hasPerm_(role, perm) {
  var r = normRole_(role);
  var m = getPermissionMatrix();
  return !!(m && m[r] && m[r][perm]);
}

function getPermissionMatrix() {
  try {
    var raw = readSetting_('PERMISSION_MATRIX');
    if (raw) { var m = JSON.parse(raw); if (m && m[ROLE_SUPER]) return m; }
  } catch (e) { }
  return defaultPerms_();
}

/* --------------------------- PENDAFTARAN + OTP -------------------------- */
function registerUser(data) {
  data = data || {};
  var email = String(data.email || '').trim().toLowerCase();
  var no    = sanitize_(String(data.no || '').trim());
  var name  = sanitize_(String(data.name || '').trim());
  var passHash = String(data.passHash || '');
  var salt  = String(data.salt || '');
  /* v104: peranan dari KLIEN TIDAK dipercayai. Nilai ini hanya cadangan; peranan
     sebenar ditentukan di sisi-pelayan (Master Personel, atau ROLE_STAF lalai). */
  var role  = ROLE_STAF;
  var label = labelFor_(ROLE_STAF);
  var birthDate = String(data.birthDate || '').trim();
  /* v28/v44: pendaftaran/log masuk HANYA memerlukan No. Personel + kata laluan.
     v44: E-mel TIDAK disemak keunikannya — jika e-mel sudah digunakan oleh No. Personel LAIN,
     padanan emel lama itu dibebaskan (dikosongkan) secara automatik supaya pendaftaran semula
     menggunakan emel sedia ada TIDAK mengeluarkan ralat 'emel dah didaftarkan'. */
  /* v45 FIX: pendaftaran dinormalkan (trim + lowercase) dan IDEMPOTENT.
     E-mel TIDAK PERNAH memblok pendaftaran — ralat 'E-mel ini telah didaftarkan' dibuang terus.
     Jika e-mel sudah ada pada No. Personel LAIN, e-mel lama itu dibebaskan (dikosongkan),
     jadi e-mel sedia ada boleh didaftarkan semula tanpa ralat. */
  if (!email || !isGmail_(email)) return { ok: false, error: 'Sila gunakan alamat Gmail (@gmail.com) yang sah.' };
  if (!no || !passHash) return { ok: false, error: 'Data tidak lengkap. Sila isi No. Personel dan kata laluan.' };
  if (birthDate && !isIsoDate_(birthDate)) return { ok: false, error: 'Kod Matrik Pemulihan Akaun tidak sah. Sila semak semula.' };

  /* v104: KEAHLIAN DIWAJIBKAN — dan disemak SEBELUM sebarang tulisan.
     Hanya No. Personel yang wujud dalam 'Master Personel' boleh mendaftar.
     Susunan ini penting: freeEmailForReuse_ mengosongkan e-mel pengguna LAIN, jadi ia
     tidak boleh berjalan sebelum pemohon disahkan warga. */
  var rec;
  try {
    rec = findPersonelRecord_(no);
  } catch (e) {
    return { ok: false, error: 'Sistem tidak dapat menyemak daftar warga buat masa ini. Sila cuba sebentar lagi.' };
  }
  if (!rec.found) {
    return { ok: false, error: 'No. Personel tidak dijumpai dalam daftar warga CBT. Sila hubungi Pentadbir Sistem untuk pendaftaran.' };
  }
  /* Peranan ditentukan SEPENUHNYA oleh Sheet. Lajur Peranan kosong = STAF. */
  role = rec.role || ROLE_STAF;
  label = labelFor_(role);

  /* v104: "Kod Matrik Pemulihan Akaun" mesti PADAN dengan rekod sedia ada. Sebelum ini
     nilai ini hanya disemak formatnya, tidak pernah dibandingkan — jadi sesiapa yang tahu
     No. Personel seseorang boleh mendaftar semula dengan tarikh lahir rekaan dan
     MENIMPA kata laluan orang itu. Akaun belum wujud = tiada apa untuk dipadankan. */
  var existing = readAccessByNo_(no);
  if (existing && existing.birthDate) {
    if (!birthDate) return { ok: false, error: 'Kod Matrik Pemulihan Akaun diperlukan untuk akaun ini.' };
    var given = mdPartsFromAny_(birthDate), stored = mdPartsFromAny_(existing.birthDate);
    if (!given || !stored || given.md !== stored.md) {
      /* Puncanya mungkin bukan salah taip: seseorang sedang cuba mengambil alih akaun
         ini. Beritahu pemilik sebenar supaya dia dapat bertindak, bukan sekadar
         "cuba lagi". */
      return { ok: false, error: 'Kod Matrik Pemulihan Akaun tidak padan dengan rekod akaun ini. Jika anda pemilik akaun ini dan yakin Kod Matrik betul, akaun anda mungkin sedang diceroboh — sila hubungi Pentadbir Sistem dengan segera.' };
    }
  }

  try { freeEmailForReuse_(email, no); } catch (e) { }
  try { killSessionsFor_(no, email); } catch (e) { }

  var code = String(Math.floor(100000 + Math.random() * 900000));
  var payload = { code: code, expiry: Date.now() + OTP_TTL_MS, attempts: 0, no: no, name: name, passHash: passHash, salt: salt, role: role, label: label, birthDate: birthDate };
  /* Kunci OTP mengikut No. Personel (bukan e-mel) supaya pendaftaran semula menimpa. */
  PropertiesService.getScriptProperties().setProperty(OTP_PROP_PREFIX + normNo_(no), JSON.stringify(payload));
  /* v46: simpan juga dalam tab 'OTP_Requests' (tahan lasak). */
  try { saveOtpRequest_(email, no, code, 'REG', { name: name, hash: passHash, salt: salt, role: role, birthDate: birthDate }); } catch (e) { }

  if (email) {
    try {
      sendOtpEmail_(email, code, name, 'pendaftaran');
    } catch (mailErr) {
      PropertiesService.getScriptProperties().deleteProperty(OTP_PROP_PREFIX + normNo_(no));
      return { ok: false, error: 'E-mel OTP gagal dihantar: ' + (mailErr && mailErr.message ? mailErr.message : String(mailErr)) };
    }
  }
  try { syncBirthdayPending_(email, no, name); } catch (ignore) { }
  /* v104: JANGAN pulangkan kod OTP dalam respons. Ia membolehkan sesiapa yang
     memanggil registerUser membaca kod itu terus — mematikan seluruh perlindungan OTP.
     Kod hanya dihantar melalui e-mel. */
  return { ok: true, message: 'Kod OTP telah dihantar' + (email ? (' ke ' + email) : '') + '. Kod sah selama 5 minit.' };
}

function verifyOTP(email, code, no) {
  email = normEmail_(email);
  code  = String(code || '').trim();
  no    = String(no || '').trim();
  if (!code) return { ok: false, error: 'Kod OTP diperlukan.' };

  /* v46: cari permintaan OTP (Sheet 'OTP_Requests' dahulu, PropertiesService sandaran). */
  var req = findOtpRequest_(email, no, 'REG');
  if (!req) return { ok: false, error: 'Tiada permintaan OTP untuk e-mel/nombor ini. Sila minta kod OTP baharu (tekan "Hantar Semula Kod OTP").', code: 'NO_OTP' };
  if (Date.now() > new Date(req.expiry).getTime()) { updateOtpRow_(req, 'EXPIRED', req.attempts); return { ok: false, error: 'Kod OTP telah tamat tempoh (5 minit). Sila minta kod baharu.', code: 'OTP_EXPIRED' }; }
  if (String(req.code) !== code) {
    var att = Number(req.attempts || 0) + 1;
    if (att >= OTP_MAX_ATTEMPTS) { updateOtpRow_(req, 'LOCKED', att); return { ok: false, error: 'Terlalu banyak cubaan salah. Sila minta kod baharu.', code: 'OTP_LOCKED' }; }
    updateOtpRow_(req, 'PENDING', att);
    return { ok: false, error: 'Kod OTP tidak sah. Sila cuba lagi (' + att + '/' + OTP_MAX_ATTEMPTS + ').', code: 'OTP_WRONG' };
  }
  /* Sah — ambil muatan pendaftaran (Sheet atau PropertiesService). */
  var p = req.payload || { no: req.no, name: req.name, passHash: req.hash, salt: req.salt, role: req.role, label: labelFor_(req.role), birthDate: req.birthDate };
  var useEmail = email || req.email || '';
  try {
    /* v44: AUTO-INSERT ke 'Pengguna Akses' (No. Personel, E-mel, Peranan) — status 'Aktif'. */
    writeAccessUser_({ email: useEmail, no: p.no, name: p.name, role: p.role, label: p.label, hash: p.passHash, salt: p.salt, birthDate: p.birthDate });
    /* v44: kemas kini padanan ke 'Master Personel' (E-mel + Peranan) */
    syncPersonnel_(p.no, p.name, useEmail, p.role);
    /* v44: AUTO-UPDATE tarikh lahir ke tab 'Hari Lahir' */
    syncBirthday_(useEmail, p.no, p.name, p.birthDate);
    /* v44: AUTO-MAPPING padanan penyelia ke tab 'Mapping Penyelia' */
    try { syncPenyeliaMapping_(p.no, p.name, useEmail); } catch (ignorePen) { }
  } catch (sheetErr) {
    return { ok: false, error: 'OTP sah tetapi gagal menyimpan akaun: ' + (sheetErr && sheetErr.message ? sheetErr.message : String(sheetErr)) };
  }
  updateOtpRow_(req, 'USED', req.attempts);
  try { auditLog_({ email: useEmail, name: p.name, no: p.no, role: normRole_(p.role) }, 'DAFTAR_AKAUN', 'Pusat Kawalan Akses', p.no, '', normRole_(p.role), 'BERJAYA'); } catch (e) { }
  return { ok: true, message: 'Akaun berjaya diaktifkan.', user: { email: useEmail, name: p.name, role: normRole_(p.role), label: p.label } };
}

/* --------------------- STORAN OTP TAHAN LASAK (SHEET) ------------------- */
/** v46: simpan permintaan OTP dalam tab 'OTP_Requests' (tahan lasak). */
function saveOtpRequest_(email, no, code, kind, extra) {
  extra = extra || {};
  var sh = getSheet_(SHEET_OTP, OTP_HEADERS);
  var em = normEmail_(email), nk = normNo_(no);
  var expiry = new Date(Date.now() + OTP_TTL_MS);
  var row = [sanitize_(em), sanitize_(no), String(code), kind, expiry, 'PENDING', 0, new Date(), sanitize_(extra.name || ''), String(extra.hash || ''), String(extra.salt || ''), sanitize_(extra.role || ''), sanitize_(extra.birthDate || '')];
  var vals = sh.getDataRange().getValues();
  for (var i = 1; i < vals.length; i++) {
    var rowEm = normEmail_(vals[i][0]), rowNo = normNo_(vals[i][1]), rowKind = String(vals[i][3] || '');
    if (rowKind !== kind) continue;
    if ((nk && rowNo === nk) || (em && rowEm === em)) { sh.getRange(i + 1, 1, 1, OTP_HEADERS.length).setValues([row]); return; }
  }
  sh.appendRow(row);
}

/** v46: cari permintaan OTP (Sheet dahulu, PropertiesService sandaran). */
function findOtpRequest_(email, no, kind) {
  var em = normEmail_(email), nk = normNo_(no);
  try {
    var sh = getSheet_(SHEET_OTP, OTP_HEADERS);
    var vals = sh.getDataRange().getValues();
    for (var i = vals.length - 1; i >= 1; i--) {
      var rowEm = normEmail_(vals[i][0]), rowNo = normNo_(vals[i][1]), rowKind = String(vals[i][3] || '');
      if (rowKind !== kind) continue;
      if ((nk && rowNo === nk) || (em && rowEm === em)) {
        return { row: i + 1, email: rowEm, no: vals[i][1], code: String(vals[i][2] || ''), kind: rowKind, expiry: vals[i][4], status: String(vals[i][5] || ''), attempts: Number(vals[i][6] || 0), name: vals[i][8], hash: vals[i][9], salt: vals[i][10], role: vals[i][11], birthDate: vals[i][12] };
      }
    }
  } catch (e) { }
  /* Sandaran: PropertiesService (keserasian versi lama). */
  try {
    var props = PropertiesService.getScriptProperties();
    var prefix = (kind === 'RESET') ? OTP_RESET_PREFIX : OTP_PROP_PREFIX;
    var key = nk ? (prefix + nk) : (prefix + em);
    var raw = props.getProperty(key);
    if (!raw && em) { key = prefix + em; raw = props.getProperty(key); }
    if (raw) {
      var p = JSON.parse(raw);
      return { row: -1, email: em, no: p.no || no, code: String(p.code || ''), kind: kind, expiry: new Date(Number(p.expiry || 0)), status: 'PENDING', attempts: Number(p.attempts || 0), payload: p, propKey: key };
    }
  } catch (e) { }
  return null;
}

/** v46: kemas kini status/cubaan baris OTP + buang kunci PropertiesService. */
function updateOtpRow_(req, status, attempts) {
  try {
    if (req && req.row > 0) {
      var sh = getSheet_(SHEET_OTP, OTP_HEADERS);
      sh.getRange(req.row, 6).setValue(status);
      if (attempts != null) sh.getRange(req.row, 7).setValue(attempts);
    }
  } catch (e) { }
  try { if (req && req.propKey) PropertiesService.getScriptProperties().deleteProperty(req.propKey); } catch (e) { }
}

/** v46: hantar semula kod OTP (kod lama dibatalkan, kod baharu sah). */
function resendOTP(data) {
  data = data || {};
  var email = normEmail_(data.email);
  var no = String(data.no || '').trim();
  var kind = (String(data.kind || 'REG').toUpperCase() === 'RESET') ? 'RESET' : 'REG';
  if (!email && !no) return { ok: false, error: 'Sila berikan e-mel atau No. Personel.' };
  if (email && !isGmail_(email)) return { ok: false, error: 'Sila gunakan alamat Gmail (@gmail.com)' };
  var req = findOtpRequest_(email, no, kind);
  if (!req) return { ok: false, error: 'Tiada permintaan OTP untuk dimulakan semula. Sila isi semula borang pendaftaran / minta kod baharu.' };
  var code = String(Math.floor(100000 + Math.random() * 900000));
  var extra = req.payload ? { name: req.payload.name, hash: req.payload.passHash, salt: req.payload.salt, role: req.payload.role, birthDate: req.payload.birthDate } : { name: req.name, hash: req.hash, salt: req.salt, role: req.role, birthDate: req.birthDate };
  var useEmail = email || req.email, useNo = no || req.no;
  saveOtpRequest_(useEmail, useNo, code, kind, extra);
  if (kind === 'REG') {
    try {
      var payload = { code: code, expiry: Date.now() + OTP_TTL_MS, attempts: 0, no: useNo, name: extra.name, passHash: extra.hash, salt: extra.salt, role: extra.role, label: labelFor_(extra.role), birthDate: extra.birthDate };
      PropertiesService.getScriptProperties().setProperty(OTP_PROP_PREFIX + normNo_(useNo), JSON.stringify(payload));
    } catch (e) { }
  } else {
    try { PropertiesService.getScriptProperties().setProperty(OTP_RESET_PREFIX + useEmail, JSON.stringify({ code: code, expiry: Date.now() + OTP_TTL_MS, attempts: 0, email: useEmail })); } catch (e) { }
  }
  try { sendOtpEmail_(useEmail, code, extra.name || '', kind === 'RESET' ? 'set semula kata laluan' : 'pendaftaran'); }
  catch (mailErr) { return { ok: false, error: 'E-mel OTP gagal dihantar: ' + (mailErr && mailErr.message ? mailErr.message : String(mailErr)) }; }
  return { ok: true, message: 'Kod OTP baharu telah dihantar' + (useEmail ? (' ke ' + useEmail) : '') + '. Kod sah selama 5 minit.' };
}

/* ----------------- v49: PANTAU & BERSIH OTP (PENTADBIR/ADMIN) ------------ */
/** v49: peta status baris OTP -> 'Aktif' / 'Luput' / 'Telah Digunakan'. */
function otpStatus_(rawStatus, expiry) {
  var st = String(rawStatus || '').trim().toUpperCase();
  if (st === 'USED') return 'Telah Digunakan';
  var expMs = (expiry instanceof Date) ? expiry.getTime() : new Date(expiry).getTime();
  if (!expMs || isNaN(expMs) || Date.now() > expMs) return 'Luput';
  if (st === 'EXPIRED' || st === 'LOCKED') return 'Luput';
  return 'Aktif'; /* PENDING + belum luput */
}

/**
 * v49: senarai permintaan OTP daripada tab 'OTP_Requests'.
 * Pulangkan e-mel, nama, no personel, jenis, masa dijana, masa luput, BAKI SAAT,
 * cubaan dan status (Aktif / Luput / Telah Digunakan) + ringkasan kiraan.
 * Padanan e-mel dinormalkan (trim + lowercase). Hanya Pentadbir Sistem / Admin.
 */
function listActiveOtp() {
  var out = { ok: true, now: new Date().toISOString(), items: [], counts: { jumlah: 0, aktif: 0, luput: 0, digunakan: 0 } };
  var sh;
  try { sh = getSheet_(SHEET_OTP, OTP_HEADERS); }
  catch (e) { return { ok: false, error: 'Gagal membuka tab ' + SHEET_OTP + ': ' + (e && e.message ? e.message : String(e)) }; }
  var vals = sh.getDataRange().getValues();
  for (var i = 1; i < vals.length; i++) {
    var r = vals[i] || [];
    if (String(r[0] || '') === '' && String(r[1] || '') === '' && String(r[2] || '') === '') continue;
    var expiry = r[4];
    var expMs = (expiry instanceof Date) ? expiry.getTime() : new Date(expiry).getTime();
    var status = otpStatus_(r[5], expiry);
    var baki = (status === 'Aktif' && expMs) ? Math.max(0, Math.round((expMs - Date.now()) / 1000)) : 0;
    out.items.push({
      row: i + 1,
      email: normEmail_(r[0]),
      no: String(r[1] || ''),
      nama: String(r[8] || ''),
      jenis: String(r[3] || ''),
      dijana: (r[7] instanceof Date) ? r[7].toISOString() : String(r[7] || ''),
      luput: (expiry instanceof Date) ? expiry.toISOString() : String(expiry || ''),
      baki: baki,
      cubaan: Number(r[6] || 0),
      status: status
    });
    out.counts.jumlah++;
    if (status === 'Aktif') out.counts.aktif++;
    else if (status === 'Telah Digunakan') out.counts.digunakan++;
    else out.counts.luput++;
  }
  /* Susun: Aktif dahulu (baki menaik), kemudian Luput, kemudian Telah Digunakan. */
  out.items.sort(function (a, b) {
    var wa = a.status === 'Aktif' ? 0 : (a.status === 'Luput' ? 1 : 2);
    var wb = b.status === 'Aktif' ? 0 : (b.status === 'Luput' ? 1 : 2);
    if (wa !== wb) return wa - wb;
    if (a.status === 'Aktif') return a.baki - b.baki;
    return String(b.dijana).localeCompare(String(a.dijana));
  });
  return out;
}

/**
 * v49: padam rekod OTP yang sudah LUPUT atau TELAH DIGUNAKAN daripada tab 'OTP_Requests'.
 * Rekod AKTIF (belum luput, belum digunakan) TIDAK dipadam. Hanya Pentadbir Sistem / Admin.
 */
function purgeExpiredOtp(sess) {
  var sh;
  try { sh = getSheet_(SHEET_OTP, OTP_HEADERS); }
  catch (e) { return { ok: false, error: 'Gagal membuka tab ' + SHEET_OTP + ': ' + (e && e.message ? e.message : String(e)) }; }
  var vals = sh.getDataRange().getValues();
  var toDelete = [];
  for (var i = 1; i < vals.length; i++) {
    var r = vals[i] || [];
    if (String(r[0] || '') === '' && String(r[1] || '') === '' && String(r[2] || '') === '') continue;
    if (otpStatus_(r[5], r[4]) !== 'Aktif') toDelete.push(i + 1);
  }
  for (var k = toDelete.length - 1; k >= 0; k--) { try { sh.deleteRow(toDelete[k]); } catch (e) { } }
  try { auditLog_(sess || { email: 'system', name: 'Pentadbir Sistem', no: 'SYSTEM', role: ROLE_SUPER }, 'PADAM_OTP_LUPA', 'OTP Aktif', SHEET_OTP, String(toDelete.length), '', 'BERJAYA'); } catch (e) { }
  return { ok: true, deleted: toDelete.length, message: toDelete.length ? (toDelete.length + ' rekod OTP luput / telah digunakan telah dipadam.') : 'Tiada rekod OTP luput untuk dipadam.' };
}

/* --------------------- SET SEMULA KATA LALUAN (RESET) ------------------- */
function requestPasswordReset(data) {
  data = data || {};
  var email = normEmail_(data.email);
  var GENERIC = { ok: true, message: 'Jika e-mel ini berdaftar, kod OTP telah dihantar. Sila semak peti masuk Gmail anda.' };
  if (!email) return { ok: false, error: 'Sila masukkan e-mel Gmail berdaftar.' };
  if (!isGmail_(email)) return { ok: false, error: 'Sila gunakan alamat Gmail (@gmail.com)' };
  if (!accountExists_(email)) return GENERIC;

  var code = String(Math.floor(100000 + Math.random() * 900000));
  PropertiesService.getScriptProperties().setProperty(OTP_RESET_PREFIX + email, JSON.stringify({ code: code, expiry: Date.now() + OTP_TTL_MS, attempts: 0, email: email }));
  /* v46: simpan juga dalam tab 'OTP_Requests' (tahan lasak). */
  try { saveOtpRequest_(email, '', code, 'RESET', {}); } catch (e) { }
  try { sendOtpEmail_(email, code, '', 'set semula kata laluan'); }
  catch (mailErr) {
    PropertiesService.getScriptProperties().deleteProperty(OTP_RESET_PREFIX + email);
    return { ok: false, error: 'E-mel OTP gagal dihantar: ' + (mailErr && mailErr.message ? mailErr.message : String(mailErr)) };
  }
  return GENERIC;
}

function resetPassword(data) {
  data = data || {};
  var email = normEmail_(data.email);
  var code  = String(data.code || '').trim();
  var passHash = String(data.passHash || '');
  var salt  = String(data.salt || '');
  if (!email || !code || !passHash) return { ok: false, error: 'Data tidak lengkap. Sila masukkan kod OTP dan kata laluan baharu.' };
  if (!isGmail_(email)) return { ok: false, error: 'Sila gunakan alamat Gmail (@gmail.com)' };

  /* v46: cari permintaan set semula (Sheet dahulu, PropertiesService sandaran). */
  var req = findOtpRequest_(email, '', 'RESET');
  if (!req) return { ok: false, error: 'Tiada permintaan set semula untuk e-mel ini. Sila minta kod baharu.', code: 'NO_OTP' };
  if (Date.now() > new Date(req.expiry).getTime()) { updateOtpRow_(req, 'EXPIRED', req.attempts); return { ok: false, error: 'Kod OTP telah tamat tempoh (5 minit). Sila minta kod baharu.', code: 'OTP_EXPIRED' }; }
  if (String(req.code) !== code) {
    var att = Number(req.attempts || 0) + 1;
    if (att >= OTP_MAX_ATTEMPTS) { updateOtpRow_(req, 'LOCKED', att); return { ok: false, error: 'Terlalu banyak cubaan salah. Sila minta kod baharu.', code: 'OTP_LOCKED' }; }
    updateOtpRow_(req, 'PENDING', att);
    return { ok: false, error: 'Kod OTP tidak sah. Sila cuba lagi (' + att + '/' + OTP_MAX_ATTEMPTS + ').', code: 'OTP_WRONG' };
  }
  try {
    if (!updatePassword_(email, passHash, salt)) return { ok: false, error: 'Akaun tidak dijumpai dalam Pengguna_Akses. Sila daftar semula.' };
  } catch (sheetErr) {
    return { ok: false, error: 'Gagal mengemas kini kata laluan: ' + (sheetErr && sheetErr.message ? sheetErr.message : String(sheetErr)) };
  }
  updateOtpRow_(req, 'USED', req.attempts);
  return { ok: true, message: 'Kata laluan berjaya ditetapkan semula. Sila log masuk dengan kata laluan baharu.' };
}

/* ------------------------------ LOG MASUK ------------------------------- */
function loginUser(data) {
  data = data || {};
  var no   = String(data.no || data.email || '').trim();
  var pass = String(data.pass || '');
  if (!no || !pass) return { ok: false, error: 'Sila isi No. Personel dan kata laluan.' };

  var key = normNo_(no);
  var sh = getSheet_(SHEET_AKSES, AKSES_HEADERS);
  var vals = sh.getDataRange().getValues();
  for (var i = 1; i < vals.length; i++) {
    if (normNo_(vals[i][2]) !== key) continue; // lajur 3 = 'No Personel'
    var status = String(vals[i][4] || '').toLowerCase();
    if (status.indexOf('aktif') < 0) return { ok: false, error: 'Akaun belum diaktifkan atau telah dinyahaktif. Sila hubungi Pentadbir.' };
    var storedHash = String(vals[i][6] || '');
    var storedSalt = String(vals[i][7] || '');
    if (!storedHash) return { ok: false, error: 'Akaun ini belum menetapkan kata laluan. Sila gunakan "Lupa Kata Laluan".' };
    if (sha256Hex_(storedSalt + pass) !== storedHash) {
      auditLog_({ email: String(vals[i][0] || ''), name: vals[i][1], no: vals[i][2], role: normRole_(vals[i][3]) }, 'LOG_MASUK_GAGAL', 'Auth', vals[i][2], '', '', 'GAGAL');
      return { ok: false, error: 'Kata laluan tidak sah.' };
    }
    var role = normRole_(vals[i][3]);
    /* v28: AUTO-ASSIGN peranan daripada Master Personel, TETAPI kekalkan Admin/Super Admin asal. */
    if (role !== ROLE_SUPER && role !== ROLE_ADMIN) {
      var mpRole = getRoleFromMasterPersonel_(vals[i][2]);
      if (mpRole) role = mpRole;
    }
    var user = { email: String(vals[i][0] || '').trim().toLowerCase(), name: vals[i][1], no: vals[i][2], role: role, label: labelFor_(role), status: vals[i][4] };
    var sess = { email: user.email, name: user.name, no: user.no, role: role, exp: Date.now() + SESSION_TTL_MS };
    var token = Utilities.getUuid();
    PropertiesService.getScriptProperties().setProperty(SESSION_PREFIX + token, JSON.stringify(sess));
    try { sh.getRange(i + 1, 10).setValue(new Date()); } catch (e) { } // 'Log Masuk Terakhir'
    auditLog_(sess, 'LOG_MASUK', 'Auth', user.no, '', '', 'BERJAYA');
    return { ok: true, token: token, perms: getPermissionMatrix()[role] || {}, user: user };
  }
  return { ok: false, error: 'No. Personel tidak dijumpai. Sila daftar terlebih dahulu.' };
}

function whoami(body) {
  var s = auth_((body || {}).token || (body || {}).session);
  if (!s) return { ok: false, error: 'Sesi tidak sah.', code: 'NO_SESSION' };
  return { ok: true, user: { email: s.email, name: s.name, no: s.no, role: s.role, label: labelFor_(s.role) }, perms: getPermissionMatrix()[s.role] || {} };
}

function logout(body) {
  var t = String((body || {}).token || '').trim();
  if (t) { try { PropertiesService.getScriptProperties().deleteProperty(SESSION_PREFIX + t); } catch (e) { } }
  return { ok: true };
}

function labelFor_(role) {
  var r = normRole_(role);
  if (r === ROLE_SUPER) return 'Super Admin';
  if (r === ROLE_ADMIN) return 'Pentadbir Sistem';
  if (r === ROLE_PENYELIA) return 'Penyelia';
  return 'Staf Berdaftar';
}

/** cariPengguna — cari mengikut No. Personel (padanan separa). */
function cariPengguna(data) {
  data = data || {};
  var q = String(data.q || data.no || '').trim();
  if (!q) return { ok: false, error: 'Sila masukkan No. Personel untuk carian.' };
  var key = normNo_(q);
  var sh = getSheet_(SHEET_AKSES, AKSES_HEADERS);
  var vals = sh.getDataRange().getValues();
  var out = [];
  for (var i = 1; i < vals.length; i++) {
    var no = normNo_(vals[i][2]);
    if (!no || no.indexOf(key) < 0) continue;
    out.push({ email: String(vals[i][0] || '').trim().toLowerCase(), name: vals[i][1], no: vals[i][2], role: normRole_(vals[i][3]), status: vals[i][4] });
  }
  return { ok: true, data: out };
}

/* --------------------------- VALIDASI REKOD ----------------------------- */
function validasiRekod(data, sess) {
  data = data || {};
  var bil = String(data.bil || '').trim();
  var status = String(data.status || 'DIVALIDASI').trim().toUpperCase();
  var actor = sess ? (sess.email || sess.no) : String(data.actorEmail || '');
  if (!bil) return { ok: false, error: 'Bil rekod diperlukan.' };
  var sh = getSheet_(SHEET_VALIDASI, VALIDASI_HEADERS);
  var vals = sh.getDataRange().getValues();
  for (var i = 1; i < vals.length; i++) {
    if (String(vals[i][0]).trim() === bil) {
      sh.getRange(i + 1, 2, 1, 3).setValues([[status, sanitize_(actor), new Date()]]);
      auditLog_(sess, 'VALIDASI_REKOD', 'Log Penugasan', bil, String(vals[i][1] || ''), status, 'BERJAYA');
      return { ok: true, bil: bil, status: status };
    }
  }
  sh.appendRow([sanitize_(bil), status, sanitize_(actor), new Date()]);
  auditLog_(sess, 'VALIDASI_REKOD', 'Log Penugasan', bil, '', status, 'BERJAYA');
  return { ok: true, bil: bil, status: status };
}

/* ================= v95: VALIDASI PENUGASAN (2 halaman) ================= */
function appVersion_() { return 'v103'; }

/* Normalisasi teks status validasi -> 'BELUM VALIDASI' | 'SELESAI VALIDASI'. */
function normStatusValidasi_(v) {
  var s = String(v == null ? '' : v).trim().toUpperCase().replace(/\s+/g, ' ');
  if (!s) return 'BELUM VALIDASI';
  if (s.indexOf('BELUM') >= 0 || s.indexOf('TIDAK') >= 0 || s.indexOf('BATAL') >= 0) return 'BELUM VALIDASI';
  if (s.indexOf('VALIDASI') >= 0 || s.indexOf('SAH') >= 0 || s.indexOf('SYAH') >= 0) return 'SELESAI VALIDASI';
  return 'SELESAI VALIDASI';
}

/* v95: LAJUR SIMPANAN status validasi DITENTUKAN SEKALI untuk seluruh helaian.
   Log_Penugasan TIADA baris header dan baris LEGACY memakai 28 lajur manakala baris
   format baharu 21 lajur. Menulis pada indeks tetap 21 akan MENIMPA data LEGACY
   (lajur 21..27 = 'Status'..jam). Jadi lajur validasi diletakkan di HUJUNG SEBENAR
   helaian = max(lebar semua baris, tersimpan, 21). Nilai disimpan dalam Script
   Properties supaya BACA dan TULIS sentiasa sepadan; ia HANYA bertambah, tidak
   pernah mengecil, jadi data LEGACY tidak pernah ditimpa. */
function logValCol_(sh) {
  var stored = 0;
  try { stored = Number(PropertiesService.getScriptProperties().getProperty('LOG_VAL_COL')) || 0; } catch (e) { }
  var maxW = 21;
  try {
    var d = sh.getDataRange().getValues();
    for (var i = 0; i < d.length; i++) { if (d[i] && d[i].length > maxW) maxW = d[i].length; }
  } catch (e) { }
  /* PENTING: setelah lajur ditetapkan SEKALI, ia DIKUNCI dan tidak lagi naik
     mengikut lebar semasa. Sebab: menulis status pada vcol + memadankan baris hingga
     vcol+3 menjadikan lebar helaian = vcol+3, jadi jika lajur dikira semula dari
     max(lebar) ia akan bertambah +3 setiap pusingan dan BERHANYUT. Kunci = stabil. */
  if (stored > 0) return stored;
  var col = Math.max(maxW, 21);
  try { PropertiesService.getScriptProperties().setProperty('LOG_VAL_COL', String(col)); } catch (e) { }
  return col;
}

/* Status validasi pada lajur yang ditentukan (vcol). */
function statusValidasiOfAt_(row, vcol) {
  row = row || [];
  vcol = Number(vcol); if (!(vcol > 0)) vcol = 21;
  var a = String(row.length > vcol ? (row[vcol] == null ? '' : row[vcol]) : '').trim();
  if (a) return normStatusValidasi_(a);
  return 'BELUM VALIDASI';
}

/* Status validasi EFEKTIF daripada satu baris MENTAH Log_Penugasan (tanpa vcol):
   imbas mana-mana sel yang mengandungi 'VALIDASI' (menangkap 'DIVALIDASI' yang
   ditulis updateStatusValidasi versi lama) tanpa tersalah anggap 'Aktif ✅' atau
   nama petugas sebagai tervalidasi. Lain-lain -> 'BELUM VALIDASI'. */
function statusValidasiOf_(row) {
  row = row || [];
  for (var i = 0; i < row.length; i++) {
    var s = String(row[i] == null ? '' : row[i]);
    if (/VALIDASI/i.test(s)) return normStatusValidasi_(s);
  }
  return 'BELUM VALIDASI';
}

function fmtTsCell_(v) {
  try { if (v instanceof Date) return Utilities.formatDate(v, 'Asia/Kuala_Lumpur', 'yyyy-MM-dd HH:mm'); } catch (e) { }
  return String(v == null ? '' : v);
}

/* Baris MENTAH Log_Penugasan -> { bil, id, rootId } (id stabil; LEG-<bil> untuk legacy). */
function rawIdsOf_(row) {
  row = row || [];
  var idv = String(row.length > 1 ? (row[1] == null ? '' : row[1]) : '').trim();
  var isNew = /^(USR-|LP-|STG-)/i.test(idv) || (row.length > 1 && row[1] instanceof Date);
  var bil = String(row.length > 0 ? (row[0] == null ? '' : row[0]) : '').trim();
  return { bil: bil, id: isNew ? idv : ('LEG-' + bil), rootId: isNew ? idv : '', isNew: isNew };
}

/* Tulis/kemas kini baris Validasi_Rekod (keserasian dgn versi lama). */
function setValidasiRekod_(bil, status, actor) {
  try {
    var bid = String(bil == null ? '' : bil).trim();
    if (!bid) return false;
    var shv = getSheet_(SHEET_VALIDASI, VALIDASI_HEADERS);
    var vv = shv.getDataRange().getValues();
    for (var k = 1; k < vv.length; k++) {
      if (String(vv[k][0] == null ? '' : vv[k][0]).trim() === bid) {
        shv.getRange(k + 1, 2, 1, 3).setValues([[sanitize_(status), sanitize_(actor), new Date()]]);
        return true;
      }
    }
    shv.appendRow([sanitize_(bid), sanitize_(status), sanitize_(actor), new Date()]);
    return true;
  } catch (e) { return false; }
}

/* Peta bil (dan ID) -> baris (1-based) untuk Log_Penugasan. */
function logRowMaps_(vals) {
  var byId = {}, byBil = {};
  for (var i = 0; i < vals.length; i++) {
    var r = vals[i] || [];
    var idv = String(r.length > 1 ? (r[1] == null ? '' : r[1]) : '').trim();
    var bv = String(r.length > 0 ? (r[0] == null ? '' : r[0]) : '').trim();
    if (idv && !byId[idv]) byId[idv] = i + 1;
    if (bv && !byBil[bv]) byBil[bv] = i + 1;
  }
  return { byId: byId, byBil: byBil };
}

/* v95: selesaikan kunci -> baris Log_Penugasan (1-based). Fleksibel:
   - 'r<N>'   -> baris terus (kunci PENAMBAT helaian, tahan bil pendua)
   - '#<bil>' -> ikut bil (baris pertama padan)
   - '<USR-..>' -> ikut ID Penugasan
   - '<bil>'  -> ikut bil */
function valTarget_(vals, vcol, key) {
  key = String(key == null ? '' : key).trim();
  if (!key) return 0;
  if (/^r\d+$/i.test(key)) { var rr = parseInt(key.slice(1), 10); return (rr >= 1 && rr <= vals.length) ? rr : 0; }
  if (/^#\d+$/.test(key)) { var b0 = key.slice(1); for (var i = 0; i < vals.length; i++) { var r0 = vals[i] || []; if (String(r0[0] == null ? '' : r0[0]).trim() === b0) return i + 1; } return 0; }
  for (var j = 0; j < vals.length; j++) { var rj = vals[j] || []; var idv = String(rj.length > 1 ? (rj[1] == null ? '' : rj[1]) : '').trim(); if (idv && idv === key) return j + 1; }
  for (var k = 0; k < vals.length; k++) { var rk = vals[k] || []; if (String(rk[0] == null ? '' : rk[0]).trim() === key) return k + 1; }
  return 0;
}

/* v95: VALIDASI PUKAL/satu-satu. idempoten. satu gagal tidak menghalang yang lain. */
function validateLogs_(body, sess) {
  body = body || {};
  if (!isAdminRole_(sess && sess.role)) {
    try { auditLog_(sess, 'AKSES_DITOLAK', 'Log_Penugasan', '', '', '', 'GAGAL'); } catch (e) { }
    return { ok: false, error: 'Akses ditolak: hanya Pentadbir Sistem / Admin boleh membuat validasi.', code: 'FORBIDDEN' };
  }
  var ids = body.ids;
  if (typeof ids === 'string') ids = [ids];
  if (!ids || !ids.length) return { ok: false, error: 'Tiada rekod dipilih untuk divalidasi.' };
  var actor = (sess && (sess.name || sess.email || sess.no)) || String(body.by || '');
  var sh = getSheet_(SHEET_LOG, LOG_HEADERS);
  var vals = sh.getDataRange().getValues();
  var vcol = logValCol_(sh); /* v95: SATU kedudukan seragam utk seluruh helaian */
  var results = [], okN = 0, noopN = 0, failN = 0;
  for (var j = 0; j < ids.length; j++) {
    var key = String(ids[j] == null ? '' : ids[j]).trim();
    if (!key) { results.push({ key: key, status: 'fail', error: 'ID kosong' }); failN++; continue; }
    var row = valTarget_(vals, vcol, key);
    if (!row) { results.push({ key: key, status: 'fail', error: 'Rekod tidak dijumpai dalam Log_Penugasan.' }); failN++; continue; }
    try {
      var raw = (vals[row - 1] || []).slice();
      var cur = statusValidasiOfAt_(raw, vcol);
      if (cur === 'SELESAI VALIDASI') {
        results.push({ key: key, status: 'noop', id: String(raw[1] == null ? '' : raw[1]), bil: raw[0] }); noopN++; continue;
      }
      while (raw.length < vcol + 3) raw.push('');
      raw[vcol] = 'SELESAI VALIDASI';
      raw[vcol + 1] = sanitize_(actor);
      raw[vcol + 2] = new Date();
      sh.getRange(row, 1, 1, raw.length).setValues([raw]);
      setValidasiRekod_(raw[0], 'DIVALIDASI', actor);
      results.push({ key: key, status: 'ok', id: String(raw[1] == null ? '' : raw[1]), bil: raw[0] });
      okN++;
    } catch (e) {
      results.push({ key: key, status: 'fail', error: (e && e.message ? e.message : String(e)) }); failN++;
    }
  }
  try { auditLog_(sess, 'VALIDASI_LOG', 'Log_Penugasan', '', '', okN + '/' + ids.length + ' divalidasi', okN ? 'BERJAYA' : 'GAGAL'); } catch (e) { }
  return { ok: true, ok_count: okN, noop_count: noopN, fail_count: failN, total: ids.length, results: results, appVersion: appVersion_() };
}

/* v95: BATAL VALIDASI (undo) — kembalikan rekod ke halaman 'Belum Validasi'. */
function unvalidateLogs_(body, sess) {
  body = body || {};
  if (!isAdminRole_(sess && sess.role)) {
    try { auditLog_(sess, 'AKSES_DITOLAK', 'Log_Penugasan', '', '', '', 'GAGAL'); } catch (e) { }
    return { ok: false, error: 'Akses ditolak: hanya Pentadbir Sistem / Admin boleh batal validasi.', code: 'FORBIDDEN' };
  }
  var ids = body.ids;
  if (typeof ids === 'string') ids = [ids];
  if (!ids || !ids.length) return { ok: false, error: 'Tiada rekod dipilih untuk dibatalkan validasinya.' };
  var actor = (sess && (sess.name || sess.email || sess.no)) || String(body.by || '');
  var sh = getSheet_(SHEET_LOG, LOG_HEADERS);
  var vals = sh.getDataRange().getValues();
  var vcol = logValCol_(sh); /* v95 */
  var results = [], okN = 0, noopN = 0, failN = 0;
  for (var j = 0; j < ids.length; j++) {
    var key = String(ids[j] == null ? '' : ids[j]).trim();
    if (!key) { results.push({ key: key, status: 'fail', error: 'ID kosong' }); failN++; continue; }
    var row = valTarget_(vals, vcol, key);
    if (!row) { results.push({ key: key, status: 'fail', error: 'Rekod tidak dijumpai dalam Log_Penugasan.' }); failN++; continue; }
    try {
      var raw = (vals[row - 1] || []).slice();
      var cur = statusValidasiOfAt_(raw, vcol);
      if (cur === 'BELUM VALIDASI') {
        results.push({ key: key, status: 'noop', id: String(raw[1] == null ? '' : raw[1]), bil: raw[0] }); noopN++; continue;
      }
      while (raw.length < vcol + 3) raw.push('');
      raw[vcol] = 'BELUM VALIDASI';
      raw[vcol + 1] = sanitize_(actor);
      raw[vcol + 2] = new Date();
      sh.getRange(row, 1, 1, raw.length).setValues([raw]);
      setValidasiRekod_(raw[0], 'BELUM VALIDASI', actor);
      results.push({ key: key, status: 'ok', id: String(raw[1] == null ? '' : raw[1]), bil: raw[0] });
      okN++;
    } catch (e) {
      results.push({ key: key, status: 'fail', error: (e && e.message ? e.message : String(e)) }); failN++;
    }
  }
  try { auditLog_(sess, 'BATAL_VALIDASI_LOG', 'Log_Penugasan', '', '', okN + '/' + ids.length + ' dibatalkan', okN ? 'BERJAYA' : 'GAGAL'); } catch (e) { }
  return { ok: true, ok_count: okN, noop_count: noopN, fail_count: failN, total: ids.length, results: results, appVersion: appVersion_() };
}

/* v95: STATUS VALIDASI SEMUA REKOD untuk 2 halaman (Belum / Selesai Validasi).
   Kunci keluaran: ID stabil (rootId), 'LEG-<bil>', '#<bil>' dan '<bil>' — supaya
   frontend boleh mencari ikut id ATAU bil. by/ts diambil dari Validasi_Rekod. */
function getValidasiRekod() {
  var out = {};
  var vmap = {};
  try {
    var shv = getSheet_(SHEET_VALIDASI, VALIDASI_HEADERS);
    var vv = shv.getDataRange().getValues();
    for (var k = 1; k < vv.length; k++) {
      var bid = String(vv[k][0] == null ? '' : vv[k][0]).trim();
      if (!bid) continue;
      vmap[bid] = { status: normStatusValidasi_(vv[k][1]), by: String(vv[k][2] == null ? '' : vv[k][2]), ts: fmtTsCell_(vv[k][3]) };
    }
  } catch (e) { }
  try {
    var sh = getSheet_(SHEET_LOG, LOG_HEADERS);
    var vals = sh.getDataRange().getValues();
    var vcol = logValCol_(sh);
    for (var i = 0; i < vals.length; i++) {
      var r = vals[i] || [];
      if (!r.length) continue;
      var ids = rawIdsOf_(r);
      if (!ids.bil && !ids.rootId) continue;
      var vm = vmap[ids.bil] || {};
      var st = statusValidasiOfAt_(r, vcol);
      if (st === 'BELUM VALIDASI') { var legacy = statusValidasiOf_(r); if (legacy !== 'BELUM VALIDASI') st = legacy; }
      if (st === 'BELUM VALIDASI' && vm.status && vm.status !== 'BELUM VALIDASI') st = vm.status;
      var v = { status: st, by: vm.by || '', ts: vm.ts || '', bil: ids.bil, rootId: ids.rootId, row: i + 1 };
      out['r' + (i + 1)] = v; /* kunci penambat baris (tahan bil pendua) */
      if (ids.bil) { out[ids.bil] = v; out['#' + ids.bil] = v; }
      if (ids.rootId) out[ids.rootId] = v;
      if (ids.id) out[ids.id] = v;
    }
  } catch (e) { }
  return out;
}

/* ------------------------------ E-MEL OTP ------------------------------- */
function sendOtpEmail_(email, code, name, purpose) {
  var purposeTxt = purpose || 'pengesahan';
  var subject = 'Kod OTP ' + purposeTxt + ' — Sistem Penugasan CBT MPDRMKL';
  var body = 'Assalamualaikum / Salam Sejahtera,\n\n' +
    'Permintaan ' + purposeTxt + ' untuk akaun Sistem Pengurusan Penugasan CBT MPDRMKL diterima.\n\n' +
    'Kod Pengesahan OTP anda: ' + code + '\n\n' +
    'Kod ini sah selama 5 minit. Jangan kongsi kod ini dengan sesiapa.\n' +
    'Jika anda tidak membuat permintaan ini, abaikan e-mel ini.\n\nSekian,\n' + SENDER_NAME;
  MailApp.sendEmail({ to: email, subject: subject, body: body, name: SENDER_NAME });
}

/* --------------------------- PENULISAN SHEET ---------------------------- */
function writeAccessUser_(u) {
  var sh = getSheet_(SHEET_AKSES, AKSES_HEADERS);
  var no = String(u.no || '').trim();
  var key = normNo_(no);
  var vals = sh.getDataRange().getValues();
  /* v28: OVERWRITE mengikut No. Personel (benarkan pendaftaran semula). */
  for (var i = 1; i < vals.length; i++) {
    if (normNo_(vals[i][2]) !== key) continue;
    var row = i + 1;
    var oldRole = normRole_(vals[i][3]);
    /* Kekalkan hak Admin/Super Admin asal — jangan turunkan ke STAF. */
    var keepRole = (oldRole === ROLE_SUPER || oldRole === ROLE_ADMIN);
    var newRole = keepRole ? oldRole : normRole_(u.role);
    sh.getRange(row, 1, 1, 10).setValues([[
      sanitize_(u.email || vals[i][0]), sanitize_(u.name || vals[i][1]), sanitize_(no), newRole, 'Aktif',
      vals[i][5] || new Date(), String(u.hash || ''), String(u.salt || ''), sanitize_(u.birthDate || ''), ''
    ]]);
    return;
  }
  sh.appendRow([sanitize_(u.email), sanitize_(u.name), sanitize_(no), normRole_(u.role), 'Aktif', new Date(), String(u.hash || ''), String(u.salt || ''), sanitize_(u.birthDate || ''), '']);
}

/** v28: baca peranan automatik daripada tab 'Master Personel' (lajur Peranan/Role/Akses). */
/** v104: cari rekod Master Personel ikut No. Personel.
 *  Membezakan "TIADA REKOD" daripada "rekod ADA tetapi lajur Peranan kosong" —
 *  tanpa ini, staf sah yang peranannya belum diisi akan tersekat daripada mendaftar.
 *  Dilempar jika Sheet gagal dibaca, supaya pemanggil boleh pulangkan ralat cuba-semula
 *  dan bukan tersilap menganggap pemohon bukan warga. */
function findPersonelRecord_(no) {
  var sh = getSheet_(SHEET_PERSONEL, PERSONEL_HEADERS);
  var vals = sh.getDataRange().getValues();
  if (!vals || vals.length < 2) return { found: false, role: '' };
  var L = personelLayout_(vals);
  var key = normNo_(no);
  for (var i = 1; i < vals.length; i++) {
    if (normNo_(vals[i][L.no]) === key) {
      var r = String(vals[i][L.role] || '').trim();
      return { found: true, role: r ? normRole_(r) : '' };
    }
  }
  return { found: false, role: '' };
}

function getRoleFromMasterPersonel_(no) {
  try {
    var sh = getSheet_(SHEET_PERSONEL, PERSONEL_HEADERS);
    var vals = sh.getDataRange().getValues();
    if (!vals || vals.length < 2) return '';
    var L = personelLayout_(vals);
    var key = normNo_(no);
    for (var i = 1; i < vals.length; i++) {
      if (normNo_(vals[i][L.no]) === key) {
        var r = String(vals[i][L.role] || '').trim();
        return r ? normRole_(r) : '';
      }
    }
  } catch (e) { }
  return '';
}

/** v28: batalkan SEMUA sesi aktif bagi No. Personel / e-mel tertentu (sekat serta-merta). */
function killSessionsFor_(no, email) {
  try {
    var props = PropertiesService.getScriptProperties();
    var all = props.getProperties();
    var key = normNo_(no);
    var em = String(email || '').trim().toLowerCase();
    Object.keys(all).forEach(function (k) {
      if (k.indexOf(SESSION_PREFIX) !== 0) return;
      try {
        var s = JSON.parse(all[k]);
        if ((key && normNo_(s.no) === key) || (em && String(s.email || '').toLowerCase() === em)) props.deleteProperty(k);
      } catch (e) { }
    });
  } catch (e) { }
}

/** v104: baca rekod Pengguna_Akses ikut No. Personel. Pulangkan null jika tiada. */
function readAccessByNo_(no) {
  var key = normNo_(no);
  if (!key) return null;
  var sh = getSheet_(SHEET_AKSES, AKSES_HEADERS);
  var vals = sh.getDataRange().getValues();
  for (var i = 1; i < vals.length; i++) {
    if (normNo_(vals[i][2]) === key) {
      return { email: String(vals[i][0] || '').trim().toLowerCase(), name: vals[i][1], no: vals[i][2], role: normRole_(vals[i][3]), birthDate: String(vals[i][8] || '').trim() };
    }
  }
  return null;
}

function findAccessRow_(email) {
  var sh = getSheet_(SHEET_AKSES, AKSES_HEADERS);
  var data = sh.getDataRange().getValues();
  var target = String(email || '').trim().toLowerCase();
  for (var i = 1; i < data.length; i++) {
    if (String(data[i][0]).trim().toLowerCase() === target) return i + 1;
  }
  return -1;
}

function updatePassword_(email, passHash, salt) {
  var row = findAccessRow_(email);
  if (row < 0) return false;
  var sh = getSheet_(SHEET_AKSES, AKSES_HEADERS);
  sh.getRange(row, 7, 1, 2).setValues([[String(passHash || ''), String(salt || '')]]);
  return true;
}

function syncPersonnel_(no, name, email, role) {
  try {
    var sh = getSheet_(SHEET_PERSONEL, PERSONEL_HEADERS);
    var data = sh.getDataRange().getValues();
    if (!data || data.length < 1) return;
    /* v62: guna personelLayout_ (tahan susun atur tergeser) + normNo_ untuk padanan.
       Versi lama membandingkan data[i][0] (lajur "Bil" bila tergeser) dengan No. Personel
       -> sentiasa gagal padan -> baris pendua ditambah setiap kali pendaftaran. */
    var L = personelLayout_(data);
    var key = normNo_(no);
    for (var i = 1; i < data.length; i++) {
      if (normNo_(data[i][L.no]) === key) {
        if (email && !String(data[i][L.email] || '').trim()) { try { sh.getRange(i + 1, L.email + 1).setValue(sanitize_(email)); } catch (e) { } }
        /* v62: simpan KOD kanonik (bukan label) supaya padanan role kekal konsisten. */
        if (role) { try { sh.getRange(i + 1, L.role + 1).setValue(sanitize_(normRole_(role))); } catch (e) { } }
        return;
      }
    }
    sh.appendRow([sanitize_(no), sanitize_(name), '', '', '', 'Aktif', sanitize_(email || ''), (role ? sanitize_(normRole_(role)) : '')]);
  } catch (e) { }
}

/* ------------------------ TAB 'HARI JADI' ------------------------------- */
function ensureHariJadi_() {
  var ss = openSS_();
  var sh = ss.getSheetByName(SHEET_HARIJADI);
  if (!sh) { sh = ss.insertSheet(SHEET_HARIJADI); sh.appendRow(HARIJADI_HEADERS); return sh; }
  var lastRow = sh.getLastRow();
  if (lastRow === 0) { sh.appendRow(HARIJADI_HEADERS); return sh; }
  var lastCol = Math.max(1, sh.getLastColumn());
  var head = sh.getRange(1, 1, 1, lastCol).getValues()[0].map(function (v) { return String(v); });
  if (head[0] === HARIJADI_HEADERS[0]) {
    if (head.length < HARIJADI_HEADERS.length) sh.getRange(1, 1, 1, HARIJADI_HEADERS.length).setValues([HARIJADI_HEADERS]);
    return sh;
  }
  var old = lastRow > 1 ? sh.getRange(2, 1, lastRow - 1, lastCol).getValues() : [];
  ss.deleteSheet(sh);
  sh = ss.insertSheet(SHEET_HARIJADI);
  sh.appendRow(HARIJADI_HEADERS);
  var rows = [];
  for (var i = 0; i < old.length; i++) {
    var r = old[i] || [];
    if (!r[0] && !r[1]) continue;
    rows.push(['', sanitize_(r[1] == null ? '' : r[1]), sanitize_(r[0] == null ? '' : r[0]), sanitize_(r[2] == null ? '' : r[2]), '']);
  }
  if (rows.length) sh.getRange(2, 1, rows.length, HARIJADI_HEADERS.length).setValues(rows);
  return sh;
}

function syncBirthdayPending_(email, no, name) {
  var sh = ensureHariJadi_();
  var data = sh.getDataRange().getValues();
  var target = String(email || '').trim().toLowerCase();
  for (var i = 1; i < data.length; i++) if (String(data[i][0]).trim().toLowerCase() === target) return;
  sh.appendRow([sanitize_(email), sanitize_(name), sanitize_(no), '', new Date()]);
}

function syncBirthday_(email, no, name, birthDate) {
  var sh = ensureHariJadi_();
  var data = sh.getDataRange().getValues();
  var target = String(email || '').trim().toLowerCase();
  /* v51: simpan tarikh dalam bentuk BERSIH (YYYY-MM-DD atau MM-DD), bukan
     Date.toString() yang tidak boleh diparse oleh kalendar. */
  var row = [sanitize_(name), sanitize_(no), normBirthdayForStore_(birthDate), new Date()];
  for (var i = 1; i < data.length; i++) {
    if (String(data[i][0]).trim().toLowerCase() === target) { sh.getRange(i + 1, 2, 1, 4).setValues([row]); return; }
  }
  sh.appendRow([sanitize_(email)].concat(row));
}

/* v51: normalisasi tarikh lahir untuk disimpan \u2014 pulangkan 'YYYY-MM-DD' jika
   tahun diketahui, 'MM-DD' jika tidak, atau teks asal jika tidak dapat diparse. */
function normBirthdayForStore_(v) {
  var p = mdPartsFromAny_(v);
  if (!p) return sanitize_(v == null ? '' : v);
  if (p.y && p.y > 1900) return pad4_(p.y) + '-' + pad2_(p.m) + '-' + pad2_(p.d);
  return p.md;
}

/* v51: PEMBAIKAN \u2014 tulis semula semua tarikh lahir dalam tab 'Hari Jadi' kepada
   bentuk bersih (YYYY-MM-DD / MM-DD) supaya kalendar dapat memaparkannya.
   Selamat dijalankan berulang kali. */
function repairHariJadiDates() {
  var sh = ensureHariJadi_();
  var last = sh.getLastRow();
  if (last < 2) return { ok: true, fixed: 0, total: 0, note: 'Tiada baris data.' };
  var rng = sh.getRange(2, 4, last - 1, 1);
  var vals = rng.getValues();
  var fixed = 0;
  for (var i = 0; i < vals.length; i++) {
    var raw = vals[i][0];
    var norm = normBirthdayForStore_(raw);
    if (String(norm) !== String(raw == null ? '' : raw)) { vals[i][0] = norm; fixed++; }
  }
  rng.setValues(vals);
  return { ok: true, fixed: fixed, total: vals.length };
}

function accountExists_(email) { try { return findAccessRow_(email) > 0; } catch (e) { return false; } }

/* ------------------- REKOD TARIKH PROFIL KHAS (v50) --------------------- */
/* v50: PARSER TARIKH TAHAN LASA — punca utama tarikh lahir tidak muncul pada
   kalendar dahulu ialah format sel Google Sheet (objek Date) TIDAK diendahkan
   oleh parser lama (hanya regex YYYY-MM-DD / DD-MM-YYYY). Kini objek Date,
   'YYYY-MM-DD', 'DD-MM-YYYY', 'DD/MM/YYYY', 'YYYY/MM/DD', 'D.M.YYYY' dan sisa
   ISO semuanya diendahkan. Objek Date guna masa TEMPATAN supaya zon masa Google
   Sheet tidak mengalihkan tarikh sehari (cth. 29-03 jadi 28-03). */
function mdPartsFromAny_(v) {
  var d = 0, mo = 0, y = 0;
  if (v instanceof Date && !isNaN(v.getTime())) {
    d = v.getDate(); mo = v.getMonth() + 1; y = v.getFullYear();
  } else {
    var s = String(v == null ? '' : v).trim();
    if (!s) return null;
    /* v50: sudah dalam bentuk MM-DD (rekod yang dipulangkan oleh backend). */
    var m2 = s.match(/^(\d{1,2})-(\d{1,2})$/);
    if (m2) { mo = +m2[1]; d = +m2[2]; }
    else {
      var m = s.match(/^(\d{4})[-\/.](\d{1,2})[-\/.](\d{1,2})/);
      if (m) { y = +m[1]; mo = +m[2]; d = +m[3]; }
      else {
        m = s.match(/^(\d{1,2})[-\/.](\d{1,2})[-\/.](\d{2,4})/);
        if (m) { d = +m[1]; mo = +m[2]; y = +m[3]; }
      }
    }
  }
  if (!d || !mo || mo < 1 || mo > 12 || d < 1 || d > 31) return null;
  var md = pad2_(mo) + '-' + pad2_(d);
  return { d: d, m: mo, y: y, md: md };
}
function mdFromAny_(v) { var p = mdPartsFromAny_(v); return p ? p.md : ''; }
function pad4_(n) { n = Number(n); return (n < 10 ? '000' : (n < 100 ? '00' : (n < 1000 ? '0' : ''))) + n; }

/* v50: baca baris tarikh profil; yearFilter pilihan (null = semua tahun).
   PENTING: tarikh adalah BERULANG SETIAP TAHUN — yearFilter HANYA menapis tahun
   lahir yang MASA DEPAN (belum wujud pada tahun itu), BUKAN menapis tahun lahir
   yang lain. Jadi 29-03-1991 tetap ditanda pada 2026, 2027, ... */
function readProfileDateRows_(yearFilter) {
  var out = [];
  try {
    var sh = ensureHariJadi_();
    var data = sh.getDataRange().getValues();
    for (var i = 1; i < data.length; i++) {
      var r = data[i] || [];
      var p = mdPartsFromAny_(r[3]);
      if (!p) continue;
      if (yearFilter && p.y && Number(p.y) > Number(yearFilter)) continue;
      out.push({ name: String(r[1] || '').trim(), no: String(r[2] || '').trim(), md: p.md, day: p.d, month: p.m, year: p.y || 0, email: normEmail_(r[0]) });
    }
  } catch (e) { }
  return out;
}
function getProfileDates() { return readProfileDateRows_(); }
/* v50: semua tarikh profil/hari jadi bagi TAHUN yang diminta. Tarikh BERULANG
   setiap tahun (padan bulan+harian sahaja), jadi penanda kekal pada 2026, 2027,
   2028 ... tanpa kemas kini manual. */
function getProfileDatesRange(year) {
  year = parseInt(year, 10) || new Date().getFullYear();
  return { year: year, dates: readProfileDateRows_(year), recurring: true };
}
function getProfileDatesToday() {
  var all = readProfileDateRows_();
  var t = todayMd_();
  return all.filter(function (x) { return x.md === t; });
}
function todayMd_() { var d = new Date(); return pad2_(d.getMonth() + 1) + '-' + pad2_(d.getDate()); }
function pad2_(n) { n = Number(n); return (n < 10 ? '0' : '') + n; }

/* --------------------------- FUNGSI PENUGASAN --------------------------- */
function saveStagingPenugasan(record, sess) {
  /* v92: UPSERT — satu draf = SATU baris. Menyimpan draf yang SAMA (id draf
     sama) MENGEMASKINI baris asal, bukan append, jadi tiada draf pendua.
     ID draf stabil dikembalikan supaya klien menyimpan id yang SAMA. */
  record = record || {};
  var sh = getSheet_(SHEET_STAGING, STAGING_HEADERS);
  var vals = sh.getDataRange().getValues();
  var wantId = String(record.id || '').trim();
  var wantBil = String(record.bil == null ? '' : record.bil).trim();
  var foundRow = 0;
  if (wantId) {
    for (var i = 1; i < vals.length; i++) {
      if (String(vals[i][15] == null ? '' : vals[i][15]).trim() === wantId) { foundRow = i + 1; break; }
    }
  }
  if (!foundRow && wantBil) {
    /* fallback draf lama (sebelum lajur ID Draf wujud): padan ikut Bil */
    for (var j = 1; j < vals.length; j++) {
      if (!String(vals[j][15] == null ? '' : vals[j][15]).trim() && String(vals[j][0] == null ? '' : vals[j][0]).trim() === wantBil) { foundRow = j + 1; break; }
    }
  }
  var st = String(record.status || '🟡 Belum Agih Petugas');
  var rowVals = [
    foundRow ? (Number(vals[foundRow - 1][0]) || foundRow - 1) : sh.getLastRow(),
    sanitize_(record.tarikh_mula || ''), sanitize_(record.tarikh_tamat || ''),
    sanitize_(record.tajuk || ''), sanitize_(record.masa_mula || ''), sanitize_(record.masa_tamat || ''),
    sanitize_(record.jenis || ''), sanitize_(record.fasa || ''), sanitize_(record.tempat || ''),
    sanitize_(record.petugas_detail || record.petugas || ''), sanitize_(record.jumlah_jam || ''), sanitize_(record.jam_orang || ''),
    sanitize_(st), (sess && (sess.email || sess.no)) || '', new Date(), sanitize_(wantId)
  ];
  var draftId = wantId;
  if (foundRow) {
    sh.getRange(foundRow, 1, 1, rowVals.length).setValues([rowVals]);
  } else {
    if (!draftId) draftId = 'STG-' + Date.now() + '-' + sh.getLastRow();
    rowVals[15] = sanitize_(draftId);
    sh.appendRow(rowVals);
    foundRow = sh.getLastRow();
  }
  auditLog_(sess, 'SIMPAN_DRAF', 'Staging_Penugasan', draftId, '', sanitize_(record.tajuk || ''), 'BERJAYA');
  return { ok: true, recordId: draftId, id: draftId, rowIndex: foundRow, status: st };
}

/* v61: senarai SEMUA draf dalam Staging_Penugasan (untuk tab Draf). */
function getStagingPenugasan() {
  var sh = getSheet_(SHEET_STAGING, STAGING_HEADERS);
  var vals = sh.getDataRange().getValues();
  var out = [];
  for (var i = 1; i < vals.length; i++) {
    var r = vals[i];
    if (!r || (!r[3] && !r[1])) continue;
    out.push({
      rowIndex: i + 1,
      id: String(r[15] == null ? '' : r[15]), /* v92: ID draf stabil */
      bil: r[0], tarikh_mula: fmtDateCell_(r[1]), tarikh_tamat: fmtDateCell_(r[2]),
      tajuk: String(r[3] == null ? '' : r[3]), masa_mula: r[4], masa_tamat: r[5],
      jenis: String(r[6] == null ? '' : r[6]), fasa: String(r[7] == null ? '' : r[7]),
      tempat: String(r[8] == null ? '' : r[8]), petugas: String(r[9] == null ? '' : r[9]),
      jumlah_jam: r[10], jam_orang: r[11], status: String(r[12] == null ? '' : r[12]),
      direkod_oleh: String(r[13] == null ? '' : r[13])
    });
  }
  return out;
}

/* v61: padam satu draf dari Staging_Penugasan (selepas diluluskan / dibuang). */
function deleteStagingPenugasan(data, sess) {
  data = data || {};
  var sh = getSheet_(SHEET_STAGING, STAGING_HEADERS);
  var rowIndex = Number(data.rowIndex || 0);
  if (!rowIndex || rowIndex < 2 || rowIndex > sh.getLastRow()) {
    /* fallback: cari ikut ID draf (v92) atau Bil */
    var vals = sh.getDataRange().getValues();
    var bil = String(data.bil == null ? '' : data.bil).trim();
    var did = String(data.id == null ? '' : data.id).trim();
    for (var i = 1; i < vals.length; i++) {
      var vid = String(vals[i][15] == null ? '' : vals[i][15]).trim();
      if (did && vid && vid === did) { rowIndex = i + 1; break; }
      if (!did && String(vals[i][0]).trim() === bil) { rowIndex = i + 1; break; }
    }
  }
  if (!rowIndex || rowIndex < 2) return { ok: false, error: 'Draf tidak dijumpai.' };
  sh.deleteRow(rowIndex);
  auditLog_(sess, 'PADAM_DRAF', 'Staging_Penugasan', 'row' + rowIndex, '', '', 'BERJAYA');
  return { ok: true };
}

function commitLogPenugasan(records, sess) {
  /* v84: bentuk respons SERAGAM + kod sebab, supaya client tidak memapar '0 berjaya, 0 gagal'. */
  if (!records || !records.length) return { ok: false, error: 'Tiada rekod untuk disimpan.', code: 'NO_RECORDS', results: [], successCount: 0, failureCount: 0 };
  var sh = getSheet_(SHEET_LOG, LOG_HEADERS);
  var results = [];
  var vals = sh.getDataRange().getValues();
  /* v81 DB SAFETY: peta id -> no. baris sedia ada supaya EDIT mengemas kini
     baris yang sama dan TIDAK mencipta rekod pendua. */
  var idToRow = {};
  var nextBil = sh.getLastRow();
  for (var r = vals.length - 1; r >= 1; r--) {
    var rid = String(vals[r][1] == null ? '' : vals[r][1]).trim();
    if (rid) idToRow[rid] = r + 1;
    var bn = Number(vals[r][0]);
    if (!isNaN(bn) && bn > nextBil) nextBil = bn;
  }
  for (var i = 0; i < records.length; i++) {
    var t = records[i] || {};
    try {
      if (!t.tajuk || !t.tarikh_mula) { results.push({ ok: false, error: 'Tajuk/tarikh tidak lengkap.' }); continue; }
      /* v81: Unique Record ID + Status rasmi (DRAFT / CONFIRMED / COMPLETED). */
      var id = String(t.id || '').trim();
      if (!id || /^(LEG-|undefined|null)$/i.test(id)) { nextBil = nextBil + 1; id = 'LP-' + nextBil; }
      var _pen = getPenyeliaFor_(sess && sess.no);
      var _stat = String(t.status || '').trim() || 'CONFIRMED';
      var _jenisVal = String(t.status_jenis || t.jenis || '').trim();
      var rowVals = [
        0, sanitize_(id), sanitize_(t.tarikh_mula), sanitize_(t.tarikh_tamat || t.tarikh_mula), sanitize_(t.tajuk),
        sanitize_(t.masa_mula || ''), sanitize_(t.masa_tamat || ''), sanitize_(t.ringkasan_peranan || t.team || ''),
        sanitize_(t.petugas_detail || ''), sanitize_(t.tempat || ''), direkodOleh_(sess), new Date(),
        sanitize_(_jenisVal), sanitize_(t.fasa || ''), sanitize_(t.jumlah_jam || ''), sanitize_(t.jam_orang || ''),
        sanitize_(_stat), '', '', sanitize_(_pen ? _pen.penyelia : ''), sanitize_(t.raw_whatsapp_log || t.rawWA || '')
      ];
      if (idToRow[id]) {
        /* EDIT: kemas kini baris sedia ada \u2014 kekalkan bilangan asal. */
        rowVals[0] = Number(vals[idToRow[id] - 1][0]) || (idToRow[id] - 1);
        sh.getRange(idToRow[id], 1, 1, rowVals.length).setValues([rowVals]);
        results.push({ ok: true, recordId: id, updated: true, row: idToRow[id] });
      } else {
        var bil = sh.getLastRow();
        if (!bil || bil < 1) bil = 1;
        rowVals[0] = bil;
        sh.appendRow(rowVals);
        idToRow[id] = sh.getLastRow();
        results.push({ ok: true, recordId: id, updated: false, row: idToRow[id] });
      }
    } catch (e) {
      results.push({ ok: false, error: (e && e.message) ? e.message : String(e) });
    }
  }
  var okCount = results.filter(function (r) { return r.ok; }).length;
  auditLog_(sess, 'SIMPAN_LOG', 'Log_Penugasan', '', '', okCount + '/' + records.length + ' rekod', okCount ? 'BERJAYA' : 'GAGAL');
  return { ok: true, results: results, successCount: okCount, failureCount: results.length - okCount };
}

function saveBatchTasks(tasks, sess) {
  if (!tasks || !tasks.length) return { ok: false, error: 'Tiada penugasan untuk disimpan.' };
  var sh = getSheet_(SHEET_LOG, LOG_HEADERS);
  var results = [];
  for (var i = 0; i < tasks.length; i++) {
    var t = tasks[i] || {};
    try {
      if (!t.task || !t.date) { results.push({ ok: false, error: 'Tajuk/tarikh tidak lengkap.' }); continue; }
      var bil = sh.getLastRow();
      var _pen2 = getPenyeliaFor_(sess && sess.no);
      sh.appendRow([
        bil, sanitize_('LP-' + bil), sanitize_(t.date), sanitize_(t.dateEnd || t.date), sanitize_(t.task),
        sanitize_(t.start || ''), sanitize_(t.end || ''), sanitize_(t.team || ''), sanitize_((t.staff || []).join(', ')),
        sanitize_(t.place || ''), direkodOleh_(sess), new Date(), '', '', '', '', sanitize_(t.status || 'DISIMPAN'), '', '', sanitize_(_pen2 ? _pen2.penyelia : '')
      ]);
      results.push({ ok: true, recordId: 'LP-' + bil });
    } catch (e) { results.push({ ok: false, error: (e && e.message) ? e.message : String(e) }); }
  }
  var okCount = results.filter(function (r) { return r.ok; }).length;
  auditLog_(sess, 'SIMPAN_PUKAL', 'Log_Penugasan', '', '', okCount + '/' + tasks.length, okCount ? 'BERJAYA' : 'GAGAL');
  return { ok: true, results: results, successCount: okCount, failureCount: results.length - okCount };
}

/* v57: normalisasi SATU baris Log_Penugasan kepada bentuk seragam.
   Tab sebenar mengandungi DUA format bercampur:
     (a) LEGACY 28-lajur (baris lama): col1=fasa, col2=jenis, col3=tajuk, col4/5=tarikh,
         col6/7=masa, col8=tempat, col16..19=petugas admin/pa/foto/video, col20=detail,
         col23=ringkasan, col26/27=jumlah_jam/jam_orang.
     (b) BAHARU (LOG_HEADERS 20-lajur): col1=ID, col2/3=tarikh, col4=tajuk, col5/6=masa,
         col7=team, col8=petugas, col9=tempat, col12=jenis, col13=fasa, col14/15=jam.
   Tanpa normalisasi ini, fetchLogData membaca baris legacy dengan susunan BAHARU
   (col2 sebagai tarikh, col4 sebagai tajuk) lalu memulangkan data yang salah. */
function isDateLike_(v) {
  if (v instanceof Date) return true;
  var s = String(v == null ? '' : v).trim();
  return /^\d{4}-\d{2}-\d{2}/.test(s) || /^\d{1,2}\/\d{1,2}\/\d{4}/.test(s);
}
function fmtDateCell_(v) {
  if (v instanceof Date) return Utilities.formatDate(v, 'Asia/Kuala_Lumpur', 'yyyy-MM-dd');
  var s = String(v == null ? '' : v).trim();
  var m = s.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (m) return m[1] + '-' + m[2] + '-' + m[3];
  m = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})/);
  if (m) return m[3] + '-' + ('0' + m[2]).slice(-2) + '-' + ('0' + m[1]).slice(-2);
  return s;
}
function normalizeLogRow_(row, sheetRow) {
  var c = function (n) { return (row.length > n) ? row[n] : ''; };
  var idv = String(c(1) == null ? '' : c(1)).trim();
  var isNew = /^(USR-|LP-|STG-)/i.test(idv) || (c(2) instanceof Date);
  /* v92: `row` = penambat BARIS helaian (1-based). Baris LEGACY tiada lajur ID,
     jadi tanpa penambat baris banyak baris berkongsi kunci yang sama -> rekod
     tergugur dari paparan & edit tersasar ke baris yang salah. */
  var _sr = Number(sheetRow) || 0;
  if (isNew) {
    return {
      row: _sr,
      bil: c(0), id: idv, tarikh_mula: fmtDateCell_(c(2)), tarikh_tamat: fmtDateCell_(c(3)),
      tajuk: String(c(4) == null ? '' : c(4)), masa_mula: c(5), masa_tamat: c(6),
      team: String(c(7) == null ? '' : c(7)), petugas_detail: String(c(8) == null ? '' : c(8)),
      tempat: String(c(9) == null ? '' : c(9)), direkod_oleh: String(c(10) == null ? '' : c(10)),
      jenis: String(c(12) == null ? '' : c(12)), fasa: String(c(13) == null ? '' : c(13)),
      jumlah_jam: c(14), jam_orang: c(15), status: String(c(16) == null ? '' : c(16))
    };
  }
  return {
    row: _sr,
    bil: c(0), id: 'LEG-' + c(0), fasa: String(c(1) == null ? '' : c(1)), jenis: String(c(2) == null ? '' : c(2)),
    tajuk: String(c(3) == null ? '' : c(3)), tarikh_mula: fmtDateCell_(c(4)), tarikh_tamat: fmtDateCell_(c(5)),
    masa_mula: c(6), masa_tamat: c(7), tempat: String(c(8) == null ? '' : c(8)),
    keperluan: String(c(9) == null ? '' : c(9)), catatan: String(c(10) == null ? '' : c(10)),
    hari: String(c(11) == null ? '' : c(11)),
    petugas_admin: String(c(16) == null ? '' : c(16)), petugas_pa: String(c(17) == null ? '' : c(17)),
    petugas_foto: String(c(18) == null ? '' : c(18)), petugas_video: String(c(19) == null ? '' : c(19)),
    petugas_detail: String(c(20) == null ? '' : c(20)), jumlah_petugas: c(21),
    ringkasan_peranan: String(c(23) == null ? '' : c(23)), bil_hari: c(24), jam_sehari: c(25),
    jumlah_jam: c(26), jam_orang: c(27), status: 'Aktif \u2705'
  };
}
/* v63: normalisasi kategori JENIS -> 'MAJLIS' | 'TUGASAN KHAS' | '' */
function normJenisCat_(v) {
  var s = String(v == null ? '' : v).trim().toUpperCase().replace(/[\s_\-]+/g, ' ');
  if (s.indexOf('MAJLIS') >= 0) return 'MAJLIS';
  if (s.indexOf('TUGASAN') >= 0 && s.indexOf('KHAS') >= 0) return 'TUGASAN KHAS';
  return '';
}
/* v63: normalisasi nilai FASA -> 'D-DAY' | 'RAPTAI' | '' (kosong) */
function normFasa_(v) {
  var s = String(v == null ? '' : v).trim().toUpperCase().replace(/[\s_\-]+/g, '');
  if (!s) return '';
  if (s === 'DDAY') return 'D-DAY';
  if (s.indexOf('RAPTAI') >= 0) return 'RAPTAI';
  return String(v == null ? '' : v).trim().toUpperCase();
}
/* v63: EDIT FASA satu rekod Log_Penugasan (admin sahaja). Cari ikut `id` (jika diberi)
   atau `bil`. Validasi SISI-PELAYAN: JENIS MAJLIS -> fasa WAJIB D-DAY/RAPTAI;
   JENIS TUGASAN KHAS -> fasa PILIHAN (boleh kosong). Tulis pada lajur fasa
   mengikut format baris (LEGACY lajur 2 / BAHARU lajur 14) + rekod audit. */
function updateLogFasa_(body, sess) {
  body = body || {};
  if (!isAdminRole_(sess && sess.role)) {
    try { auditLog_(sess, 'AKSES_DITOLAK', 'Log_Penugasan', '', '', '', 'GAGAL'); } catch (e) { }
    return { ok: false, error: 'Akses ditolak: hanya Pentadbir Sistem / Admin boleh edit Fasa.', code: 'FORBIDDEN' };
  }
  var wantId = String(body.id == null ? '' : body.id).trim();
  var wantBil = String(body.bil == null ? '' : body.bil).trim();
  if (!wantId && !wantBil) return { ok: false, error: 'Rekod tidak dikenal pasti (id/bil tiada).' };
  var fasa = normFasa_(body.fasa);
  var sh = getSheet_(SHEET_LOG, LOG_HEADERS);
  var vals = sh.getDataRange().getValues();
  if (!vals || !vals.length) return { ok: false, error: 'Log_Penugasan kosong.' };
  var _hitF = findLogRow_(vals, wantId, wantBil, body.row);
  if (!_hitF) return { ok: false, error: 'Rekod tidak dijumpai (id/bil tidak sepadan dalam Sheet).' };
  var found = _hitF.row - 1, jenisRec = '', fasaCol = -1, fasaOld = '';
  var _rF = _hitF.raw || [];
  fasaCol = _hitF.isNew ? 13 : 1;                                              /* BAHARU: lajur 14 'Fasa' / LEGACY: lajur 2 */
  jenisRec = String(_rF[_hitF.isNew ? 12 : 2] == null ? '' : _rF[_hitF.isNew ? 12 : 2]);   /* BAHARU: lajur 13 'Jenis' / LEGACY: lajur 3 */
  fasaOld = String(_rF[fasaCol] == null ? '' : _rF[fasaCol]);
  if (normJenisCat_(jenisRec) === 'MAJLIS' && fasa === '') {
    return { ok: false, error: 'Fasa WAJIB untuk penugasan MAJLIS (D-Day atau Raptai).' };
  }
  try {
    sh.getRange(found + 1, fasaCol + 1).setValue(sanitize_(fasa));
  } catch (e) {
    return { ok: false, error: 'Gagal menulis ke Sheet: ' + (e && e.message ? e.message : String(e)) };
  }
  try { auditLog_(sess, 'EDIT_FASA', 'Log_Penugasan', (wantId || wantBil), fasaOld, fasa, 'BERJAYA'); } catch (e) { }
  return { ok: true, id: wantId, bil: wantBil, fasa: fasa, jenis: jenisRec, row: found + 1, col: fasaCol + 1 };
}
/* ============ v73: EDIT PENUH Log_Penugasan (admin sahaja) =============
   Membolehkan Pentadbir Sistem / Admin mengedit TEMPAT, MASA (AM/PM),
   PETUGAS (nama atau No. Personel -> nama Master Personel), JAM, JAM-ORANG,
   JENIS, FASA dan TARIKH satu rekod Log_Penugasan. Menulis pada lajur yang
   BETUL mengikut format baris (LEGACY 28-lajur vs BAHARU LOG_HEADERS) dan
   merekodkan perubahan dalam Audit_Log. */
var _PERSONEL_NOMAP = null;
function numOrBlank_(v) {
  var s = String(v == null ? '' : v).trim();
  if (!s) return '';
  var n = Number(s);
  return isNaN(n) ? '' : n;
}
function toHHMM_(v) {
  if (v == null || v === '') return '';
  if (Object.prototype.toString.call(v) === '[object Date]') {
    var h = v.getHours(), mi = v.getMinutes();
    return (h < 10 ? '0' : '') + h + ':' + (mi < 10 ? '0' : '') + mi;
  }
  var s = String(v).trim();
  var m = s.match(/^(\d{1,2})\s*[:.]\s*(\d{1,2})/);
  if (m) { var hh = Number(m[1]), mm = Number(m[2]); if (hh < 24 && mm < 60) return (hh < 10 ? '0' : '') + hh + ':' + (mm < 10 ? '0' : '') + mm; }
  m = s.replace(/[^0-9]/g, '').match(/^(\d{3,4})$/);
  if (m) { var t = ('0000' + m[1]).slice(-4); return t.slice(0, 2) + ':' + t.slice(2); }
  return s;
}
function personelNoToName_() {
  if (_PERSONEL_NOMAP) return _PERSONEL_NOMAP;
  var map = {};
  try {
    var sh = getSheet_(SHEET_PERSONEL, PERSONEL_HEADERS);
    var vals = sh.getDataRange().getValues();
    if (vals && vals.length > 1) {
      var L = personelLayout_(vals);
      for (var i = 1; i < vals.length; i++) {
        var no = normNo_(vals[i][L.no]);
        if (no) map[no] = String(vals[i][L.nama] == null ? '' : vals[i][L.nama]).trim();
      }
    }
  } catch (e) { }
  _PERSONEL_NOMAP = map;
  return map;
}
/* Terima senarai nama ATAU No. Personel (dipisah , ; | atau baris baharu) dan
   pulangkan NAMA kanonik dari Master Personel supaya paparan konsisten. */
function canonPetugas_(s) {
  if (!s) return '';
  var map = personelNoToName_();
  var parts = String(s).split(/[;,\u2022\n]+/);
  var out = [];
  for (var i = 0; i < parts.length; i++) {
    var t = String(parts[i] == null ? '' : parts[i]).trim();
    if (!t) continue;
    var key = normNo_(t);
    if (map[key]) { out.push(map[key]); continue; }
    var mm = t.match(/([A-Za-z]{1,3}\/?[0-9]{4,})/);
    if (mm && map[normNo_(mm[1])]) { out.push(map[normNo_(mm[1])]); continue; }
    out.push(t);
  }
  return out.join(', ');
}
function joinPetugas_(padmin, ppa, pfoto, pvideo) {
  var info = personelNameToInfo_();
  var seen = {}, out = [];
  [padmin, ppa, pfoto, pvideo].forEach(function (raw) {
    if (!raw) return;
    String(raw).split(/[;,\u2022\n]+/).forEach(function (t) {
      t = String(t == null ? '' : t).trim();
      if (!t) return;
      var key = t.toUpperCase();
      if (seen[key]) return;
      seen[key] = 1;
      var m = info[key];
      if (m) {
        out.push((m.pangkat ? m.pangkat + ' ' : '') + t + (m.no ? ' (' + m.no + ')' : ''));
      } else {
        out.push(t);
      }
    });
  });
  return out.join('\n');
}
/* v78: peta NAMA (huruf besar) -> {pangkat, no} dari Master Personel. Digunakan
   oleh joinPetugas_ untuk membina 'Petugas' dalam format "PANGKAT NAMA (NO)"
   satu baris per petugas - format yang dibaca oleh perStats() di frontend. */
var _PERSONEL_INFOMAP = null;
function personelNameToInfo_() {
  if (_PERSONEL_INFOMAP) return _PERSONEL_INFOMAP;
  var map = {};
  try {
    var sh = getSheet_(SHEET_PERSONEL, PERSONEL_HEADERS);
    var vals = sh.getDataRange().getValues();
    if (vals && vals.length > 1) {
      var L = personelLayout_(vals);
      for (var i = 1; i < vals.length; i++) {
        var nama = String(vals[i][L.nama] == null ? '' : vals[i][L.nama]).trim();
        if (!nama) continue;
        map[nama.toUpperCase()] = {
          pangkat: String(vals[i][L.pangkat] == null ? '' : vals[i][L.pangkat]).trim(),
          no: String(vals[i][L.no] == null ? '' : vals[i][L.no]).trim()
        };
      }
    }
  } catch (e) { }
  _PERSONEL_INFOMAP = map;
  return map;
}
function updateLogPenuh_(body, sess) {
  body = body || {};
  if (!isAdminRole_(sess && sess.role)) {
    try { auditLog_(sess, 'AKSES_DITOLAK', 'Log_Penugasan', '', '', '', 'GAGAL'); } catch (e) { }
    return { ok: false, error: 'Akses ditolak: hanya Pentadbir Sistem / Admin boleh edit rekod.', code: 'FORBIDDEN' };
  }
  var wantId = String(body.id == null ? '' : body.id).trim();
  var wantBil = String(body.bil == null ? '' : body.bil).trim();
  if (!wantId && !wantBil) return { ok: false, error: 'Rekod tidak dikenal pasti (id/bil tiada).' };
  var sh = getSheet_(SHEET_LOG, LOG_HEADERS);
  var vals = sh.getDataRange().getValues();
  if (!vals || !vals.length) return { ok: false, error: 'Log_Penugasan kosong.' };
  var _hit = findLogRow_(vals, wantId, wantBil, body.row);
  if (!_hit) return { ok: false, error: 'Rekod tidak dijumpai (id/bil tidak sepadan dalam Sheet).' };
  var found = _hit.row - 1, isNew = _hit.isNew;
  var rowRef = vals[found] || [];
  function g(k) { return body[k] === undefined ? null : body[k]; }
  function s(v) { return String(v == null ? '' : v).trim(); }
  function has(v) { return v !== null && v !== undefined; }
  function hhmmToHM(v) {
    var t = toHHMM_(v);
    var m = t.match(/^(\d{1,2}):(\d{2})$/);
    if (!m) return '';
    var hh = m[1].length === 1 ? ('0' + m[1]) : m[1];
    return hh + m[2];
  }
  /* jenis/fasa sebenar (guna nilai baharu jika diberi, jika tidak yang sedia ada) */
  var jenisRec = has(g('jenis')) ? s(g('jenis')) : String(rowRef[isNew ? 12 : 2] == null ? '' : rowRef[isNew ? 12 : 2]);
  if (has(g('fasa')) && normJenisCat_(jenisRec) === 'MAJLIS' && normFasa_(g('fasa')) === '') {
    return { ok: false, error: 'Fasa WAJIB untuk penugasan MAJLIS (D-Day atau Raptai).' };
  }
  var anyPetugas = has(g('petugas_admin')) || has(g('petugas_pa')) || has(g('petugas_foto')) || has(g('petugas_video'));
  var pA = canonPetugas_(s(g('petugas_admin'))),
      pP = canonPetugas_(s(g('petugas_pa'))),
      pF = canonPetugas_(s(g('petugas_foto'))),
      pV = canonPetugas_(s(g('petugas_video')));
  var nPetugas = 0;
  if (pA) nPetugas++; if (pP) nPetugas++; if (pF) nPetugas++; if (pV) nPetugas++;
  var detail = joinPetugas_(pA, pP, pF, pV);
  var ringk = [pA && 'Admin', pP && 'PA', pF && 'Foto', pV && 'Video'].filter(Boolean).join(' \u00b7 ');
  var writes = [];
  function put(col, val) { writes.push([col, val]); }
  if (isNew) {
    if (has(g('tajuk'))) put(5, s(g('tajuk')));
    if (has(g('tarikh_mula'))) put(3, s(g('tarikh_mula')));
    if (has(g('tarikh_tamat'))) put(4, s(g('tarikh_tamat')));
    if (has(g('masa_mula'))) put(6, hhmmToHM(g('masa_mula')));
    if (has(g('masa_tamat'))) put(7, hhmmToHM(g('masa_tamat')));
    if (has(g('tempat'))) put(10, s(g('tempat')));
    if (has(g('jenis'))) put(13, s(g('jenis')));
    if (has(g('fasa'))) put(14, normFasa_(g('fasa')));
    if (has(g('jumlah_jam'))) put(15, numOrBlank_(g('jumlah_jam')));
    if (has(g('jam_orang'))) put(16, numOrBlank_(g('jam_orang')));
    if (has(g('status'))) put(17, s(g('status')));
    if (anyPetugas) { put(8, ringk); put(9, detail); }
  } else {
    if (has(g('tajuk'))) put(4, s(g('tajuk')));
    if (has(g('tarikh_mula'))) put(5, s(g('tarikh_mula')));
    if (has(g('tarikh_tamat'))) put(6, s(g('tarikh_tamat')));
    if (has(g('masa_mula'))) put(7, hhmmToHM(g('masa_mula')));
    if (has(g('masa_tamat'))) put(8, hhmmToHM(g('masa_tamat')));
    if (has(g('tempat'))) put(9, s(g('tempat')));
    if (has(g('keperluan'))) put(10, s(g('keperluan')));
    if (has(g('catatan'))) put(11, s(g('catatan')));
    if (has(g('jenis'))) put(3, s(g('jenis')));
    if (has(g('fasa'))) put(2, normFasa_(g('fasa')));
    if (has(g('jumlah_jam'))) put(27, numOrBlank_(g('jumlah_jam')));
    if (has(g('jam_orang'))) put(28, numOrBlank_(g('jam_orang')));
    if (anyPetugas) {
      put(17, pA); put(18, pP); put(19, pF); put(20, pV);
      put(21, detail); put(22, nPetugas); put(24, ringk);
    }
  }
  try {
    for (var w = 0; w < writes.length; w++) {
      sh.getRange(found + 1, writes[w][0]).setValue(sanitize_(writes[w][1]));
    }
  } catch (e) {
    return { ok: false, error: 'Gagal menulis ke Sheet: ' + (e && e.message ? e.message : String(e)) };
  }
  var summary = [];
  for (var z = 0; z < writes.length && z < 5; z++) summary.push('col' + writes[z][0] + '=' + writes[z][1]);
  if (writes.length > 5) summary.push('+' + (writes.length - 5) + ' lagi');
  try { auditLog_(sess, 'EDIT_LOG', 'Log_Penugasan', (wantId || wantBil), '', summary.join('; '), 'BERJAYA'); } catch (e) { }
  return { ok: true, id: wantId, bil: wantBil, isNew: isNew, changed: writes.length, row: found + 1, jenis: jenisRec, fasa: has(g('fasa')) ? normFasa_(g('fasa')) : String(rowRef[isNew ? 13 : 1] == null ? '' : rowRef[isNew ? 13 : 1]), petugas_detail: detail, jumlah_petugas: nPetugas };
}

/* ================= v75: PADAM LOG PENUGASAN \u2014 HARD DELETE + ARKIB =================
   Butang \ud83d\uddd1 Padam kini BENAR-BENAR membuang baris dari helaian Log_Penugasan
   (bukan lagi tanda sahaja). Sebelum dibuang, SATU salinan PENUH baris itu
   ditulis ke helaian 'Log_Deleted' sebagai jaring keselamatan (boleh dipulih
   secara manual jika tersilap padam). Rekod yang PERNAH di-soft-delete pada
   versi lama (kuncinya ada dalam Log_Deleted) KEKAL ditapis keluar dari paparan
   supaya ia tidak muncul semula. Admin / Pentadbir Sistem sahaja. */
function deletedLogKeys_() {
  var set = {};
  try {
    var sh = getSheet_(SHEET_LOG_DELETED, LOG_DELETED_HEADERS);
    var vals = sh.getDataRange().getValues();
    for (var i = 1; i < vals.length; i++) {
      var k = String(vals[i][0] == null ? '' : vals[i][0]).trim();
      if (k) set[k] = 1;
    }
  } catch (e) { }
  return set;
}
function isDeletedRec_(rec, set) {
  if (!rec || !set) return false;
  var id = String(rec.id == null ? '' : rec.id).trim();
  if (id && set[id]) return true;
  var bil = String(rec.bil == null ? '' : rec.bil).trim();
  if (bil && (set['LEG-' + bil] || set['LP-' + bil] || set[bil])) return true;
  return false;
}
/* v75: kunci stabil satu rekod (utamakan ID Penugasan, jika tiada guna Bil). */
function logKey_(rec) {
  var key = String(rec && rec.id != null ? rec.id : '').trim();
  if (!key) key = 'LEG-' + String(rec && rec.bil != null ? rec.bil : '').trim();
  return key;
}
/* v75: cari baris Log_Penugasan ikut id (utamakan) atau bil. Pulangkan
   { row: 1-based, rec: normalisasi, raw: baris mentah, isNew: format baharu }. */
function findLogRow_(vals, wantId, wantBil, wantRow) {
  /* v92: keutamaan padanan = id (ID stabil sebenar) -> row (penambat baris) -> bil.
     Baris LEGACY tiada ID unik, jadi penambat BARIS yang diberi oleh klien
     digunakan supaya kemas kini pergi ke baris yang BETUL (bukan baris lain
     yang kebetulan berkongsi Bil yang sama). */
  var wr = Number(wantRow) || 0;
  var wantIsRealId = !!wantId && !/^LEG-/i.test(String(wantId));
  if (wr >= 1 && wr <= vals.length) {
    var r0 = vals[wr - 1] || [];
    var id0 = String(r0.length > 1 ? r0[1] : '').trim();
    var rowIsNew = /^(USR-|LP-|STG-)/i.test(id0) || (r0.length > 1 && r0[1] instanceof Date);
    if (!rowIsNew || !wantIsRealId || id0 === wantId) {
      return { row: wr, rec: normalizeLogRow_(r0, wr), raw: r0, isNew: rowIsNew };
    }
  }
  /* v92 TAHAP 2: padan ikut ID sebenar (bina PETA sekali sahaja — bukannya satu
     carian penuh per baris, supaya kemas kini banyak rekod kekal pantas). */
  if (wantIsRealId) {
    var _m = {};
    for (var m = 0; m < vals.length; m++) {
      var _rv = vals[m] || [];
      var _iv = String(_rv.length > 1 ? _rv[1] : '').trim();
      if (_iv && !_m[_iv]) _m[_iv] = m + 1;
    }
    if (_m[wantId]) {
      var _rr = vals[_m[wantId] - 1] || [];
      return { row: _m[wantId], rec: normalizeLogRow_(_rr, _m[wantId]), raw: _rr, isNew: /^(USR-|LP-|STG-)/i.test(String(_rr[1] == null ? '' : _rr[1]).trim()) || (_rr[1] instanceof Date) };
    }
  }
  for (var i = 0; i < vals.length; i++) {
    var row = vals[i] || [];
    if (!row || !row.length) continue;
    var idv = String(row.length > 1 ? row[1] : '').trim();
    var bilv = String(row.length > 0 ? row[0] : '').trim();
    var match = false;
    if (wantId && idv && idv === wantId) match = true;
    if (!match && wantBil && bilv === wantBil) match = true;
    if (!match) continue;
    return { row: i + 1, rec: normalizeLogRow_(row, i + 1), raw: row, isNew: /^(USR-|LP-|STG-)/i.test(idv) || (row[1] instanceof Date) };
  }
  return null;
}
/* v75: HARD DELETE satu rekod log. (1) salin baris penuh ke Log_Deleted,
   (2) deleteRow() dari Log_Penugasan. Admin / Pentadbir Sistem sahaja. */
function deleteLog_(body, sess) {
  body = body || {};
  if (!isAdminRole_(sess && sess.role)) {
    try { auditLog_(sess, 'AKSES_DITOLAK', 'Log_Penugasan', '', '', '', 'GAGAL'); } catch (e) { }
    return { ok: false, error: 'Akses ditolak: hanya Pentadbir Sistem / Admin boleh padam rekod log.', code: 'FORBIDDEN' };
  }
  var wantId = String(body.id == null ? '' : body.id).trim();
  var wantBil = String(body.bil == null ? '' : body.bil).trim();
  if (!wantId && !wantBil) return { ok: false, error: 'Rekod tidak dikenal pasti (id/bil tiada).' };
  var sh = getSheet_(SHEET_LOG, LOG_HEADERS);
  var vals = sh.getDataRange().getValues();
  if (!vals || !vals.length) return { ok: false, error: 'Log_Penugasan kosong.' };
  var hit = findLogRow_(vals, wantId, wantBil, body.row);
  if (!hit) return { ok: false, error: 'Rekod tidak dijumpai (id/bil tidak sepadan dalam Sheet).' };
  var rec = hit.rec, key = logKey_(rec);
  /* (1) ARKIB: tulis salinan penuh ke Log_Deleted SEBELUM membuang. */
  var archived = false;
  try {
    var dsh = getSheet_(SHEET_LOG_DELETED, LOG_DELETED_HEADERS);
    dsh.appendRow([
      sanitize_(key), sanitize_(rec.id || ''), sanitize_(rec.bil || ''), sanitize_(rec.tarikh_mula || ''),
      sanitize_(rec.tajuk || ''), sanitize_((sess && (sess.email || sess.no)) || ''), new Date(),
      sanitize_(body.reason || 'Rekod berulang / dibuang oleh admin'),
      sanitize_(JSON.stringify(hit.raw))
    ]);
    archived = true;
  } catch (e) {
    return { ok: false, error: 'Gagal menulis salinan arkib ke Log_Deleted (padam DIBATALKAN): ' + (e && e.message ? e.message : String(e)) };
  }
  /* (2) HARD DELETE: buang baris dari Log_Penugasan. */
  try {
    sh.deleteRow(hit.row);
  } catch (e) {
    return { ok: false, error: 'Salinan diarkibkan tetapi gagal membuang baris: ' + (e && e.message ? e.message : String(e)), archived: archived, key: key };
  }
  try { auditLog_(sess, 'PADAM_LOG', 'Log_Penugasan', (wantId || wantBil), 'baris ' + hit.row, 'HARD DELETE key=' + key + ' tajuk=' + (rec.tajuk || ''), 'BERJAYA'); } catch (e) { }
  var remaining = 0;
  try { remaining = sh.getLastRow(); } catch (e) { remaining = -1; }
  return { ok: true, hard: true, archived: true, key: key, bil: rec.bil, id: rec.id, row: hit.row, rowIndex: hit.row, remaining: remaining };
}

/* v75: KUNCI DUPLIKAT satu rekod \u2014 tarikh mula + acara(tajuk) + petugas + masa
   mula/tamat, dinormalkan (ruang & huruf besar/kecil diabaikan). */
function dupeKeyOf_(rec) {
  function norm(v) { return String(v == null ? '' : v).replace(/\s+/g, '').toUpperCase(); }
  return [
    norm(fmtDateCell_(rec.tarikh_mula)), norm(rec.tajuk), norm(rec.petugas_detail),
    norm(toHHMM_(rec.masa_mula)), norm(toHHMM_(rec.masa_tamat))
  ].join('|');
}
/* v75: KESAN DUPLIKAT \u2014 kumpulkan rekod yang mempunyai kunci SAMA dan pulangkan
   kumpulan yang berulang (>1 rekod). Admin / Pentadbir Sistem sahaja. */
function findDuplicates_(body, sess) {
  body = body || {};
  if (!isAdminRole_(sess && sess.role)) {
    try { auditLog_(sess, 'AKSES_DITOLAK', 'Log_Penugasan', '', '', '', 'GAGAL'); } catch (e) { }
    return { ok: false, error: 'Akses ditolak: hanya Pentadbir Sistem / Admin boleh kesan duplikat.', code: 'FORBIDDEN' };
  }
  var sh = getSheet_(SHEET_LOG, LOG_HEADERS);
  var vals = sh.getDataRange().getValues();
  var del = deletedLogKeys_();
  var groups = {}, order = [], total = 0;
  for (var i = 0; i < vals.length; i++) {
    var row = vals[i] || [];
    if (!row || !row.length) continue;
    var rec = normalizeLogRow_(row, i + 1); /* v92: penambat baris */
    if (!rec) continue;
    if (isDeletedRec_(rec, del)) continue;
    total++;
    var k = dupeKeyOf_(rec);
    if (!groups[k]) { groups[k] = { key: k, count: 0, records: [] }; order.push(k); }
    groups[k].count++;
    groups[k].records.push({
      row: i + 1, bil: rec.bil, id: rec.id, tarikh_mula: rec.tarikh_mula, tajuk: rec.tajuk,
      masa_mula: toHHMM_(rec.masa_mula), masa_tamat: toHHMM_(rec.masa_tamat),
      petugas_detail: rec.petugas_detail, tempat: rec.tempat, jumlah_jam: rec.jumlah_jam
    });
  }
  var out = [];
  for (var o = 0; o < order.length; o++) { if (groups[order[o]].count > 1) out.push(groups[order[o]]); }
  var dupRows = 0;
  for (var q = 0; q < out.length; q++) dupRows += (out[q].count - 1);
  try { auditLog_(sess, 'KESAN_DUPLIKAT', 'Log_Penugasan', '', '', out.length + ' kumpulan / ' + dupRows + ' baris berulang', 'BERJAYA'); } catch (e) { }
  return { ok: true, groups: out, groupCount: out.length, duplicateRows: dupRows, total: total };
}

/* v75: SUSUN SEMULA No. Log \u2014 tulis semula lajur 'Bil'/No. Log mengikut turutan
   kronologi (tarikh mula -> masa mula -> masa tamat) supaya tally berterusan
   TANPA lompang. ID/kunci rekod (lajur 'ID Penugasan') TIDAK diubah. Admin sahaja. */
function parseSortKeyNum_(rec) {
  var d = String(rec.tarikh_mula || '').replace(/[^0-9]/g, '').slice(0, 8) || '';
  if (d.length < 8) d = ('00000000' + d).slice(-8);
  var m1 = String(toHHMM_(rec.masa_mula) || '').replace(/[^0-9]/g, '');
  if (m1.length < 4) m1 = ('0000' + m1).slice(-4);
  var m2 = String(toHHMM_(rec.masa_tamat) || '').replace(/[^0-9]/g, '');
  if (m2.length < 4) m2 = ('0000' + m2).slice(-4);
  return d + m1 + m2;
}
function renumberLog_(body, sess) {
  body = body || {};
  if (!isAdminRole_(sess && sess.role)) {
    try { auditLog_(sess, 'AKSES_DITOLAK', 'Log_Penugasan', '', '', '', 'GAGAL'); } catch (e) { }
    return { ok: false, error: 'Akses ditolak: hanya Pentadbir Sistem / Admin boleh susun semula No. Log.', code: 'FORBIDDEN' };
  }
  var sh = getSheet_(SHEET_LOG, LOG_HEADERS);
  var vals = sh.getDataRange().getValues();
  if (!vals || !vals.length) return { ok: true, total: 0, changed: 0 };
  var arr = [];
  var del = deletedLogKeys_();
  for (var i = 0; i < vals.length; i++) {
    var row = vals[i] || [];
    if (!row || !row.length) continue;
    var rec = normalizeLogRow_(row, i + 1); /* v92: penambat baris */
    if (!rec) continue;
    if (isDeletedRec_(rec, del)) continue;
    arr.push({ row: i + 1, id: rec.id, keyNum: parseSortKeyNum_(rec), oldBil: String(vals[i][0] == null ? '' : vals[i][0]).trim() });
  }
  /* Susun kronologi; 'id' dijadikan penentu akhir supaya turutan TIDAK berubah-ubah. */
  arr.sort(function (a, b) {
    if (a.keyNum !== b.keyNum) return a.keyNum < b.keyNum ? -1 : 1;
    var ai = String(a.id || ''), bi = String(b.id || '');
    if (ai !== bi) return ai < bi ? -1 : 1;
    return a.row - b.row;
  });
  var changed = 0, before = [];
  for (var j = 0; j < arr.length; j++) {
    var want = j + 1;
    if (before.length < 6 && String(want) !== arr[j].oldBil) before.push(arr[j].oldBil + '->' + want);
    if (String(want) !== arr[j].oldBil) {
      try { sh.getRange(arr[j].row, 1).setValue(want); changed++; } catch (e) { }
    }
    arr[j].newBil = want;
  }
  try { auditLog_(sess, 'RENUMBER_LOG', 'Log_Penugasan', '', '', 'total=' + arr.length + ' changed=' + changed + ' [' + before.join(', ') + ']', 'BERJAYA'); } catch (e) { }
  return { ok: true, total: arr.length, changed: changed, sample: before };
}

/* ============== v92: BACKFILL ID STABIL (admin, sekali) ==============
   Masalah: baris format BAHARU ada yang dikongsi ID yang sama (contoh 3 baris
   berID 'USR-1791764053726-295-0') sebab id dijana daripada Date.now() + indeks
   baris. Bila DUA baris berkongsi ID, peta id->baris hanya menunjuk ke SATU
   baris -> edit mengemas kini baris yang SALAH dan baris lain kekal sebagai
   pendua. Fungsi ini memberi setiap baris BAHARU yang ID-nya pendua/tiada satu
   ID unik & kekal ('LP-<N>'), dan menyalin baris yang DIUBAH ke Log_Deleted
   sebelum diubah sebagai jaring keselamatan.
   Baris LEGACY (tiada lajur ID) TIDAK diubah — identiti uniknya ialah PENAMBAT
   BARIS helaian (dihantar oleh klien sebagai `row`); menulis ID ke dalam baris
   legacy akan menukar tafsiran formatnya dan merosakkan data.
   IDEMPOTEN: menjalankan semula memulangkan 0 perubahan. */
function logIdSlotOf_(vals, r) {
  var idv = String((vals[r].length > 1 ? vals[r][1] : '') == null ? '' : vals[r][1]).trim();
  var isNew = /^(USR-|LP-|STG-)/i.test(idv) || (vals[r].length > 1 && vals[r][1] instanceof Date);
  return { isNew: isNew, idv: idv };
}
function backfillLogIds_(sess) {
  var sh = getSheet_(SHEET_LOG, LOG_HEADERS);
  var vals = sh.getDataRange().getValues();
  if (!vals || !vals.length) return { ok: true, scanned: 0, changed: 0, archived: 0, note: 'Log kosong.' };
  var used = {}, maxNum = 0, rows = [];
  for (var i = 0; i < vals.length; i++) {
    var s = logIdSlotOf_(vals, i);
    var dup = !!s.idv && !!used[s.idv];
    if (s.idv && !dup) used[s.idv] = i + 1;
    if (/^LP-(\d+)$/i.test(s.idv)) { var n = Number(String(s.idv).replace(/\D/g, '')); if (n > maxNum) maxNum = n; }
    rows.push({ i: i, isNew: s.isNew, idv: s.idv, need: s.isNew && (!s.idv || dup) });
  }
  var changed = 0, archived = 0, dsh = null;
  for (var k = 0; k < rows.length; k++) {
    var w = rows[k];
    if (!w.need) continue;
    var nid;
    do { maxNum++; nid = 'LP-' + maxNum; } while (used[nid]);
    used[nid] = w.i + 1;
    try {
      if (!dsh) dsh = getSheet_(SHEET_LOG_DELETED, LOG_DELETED_HEADERS);
      dsh.appendRow([
        sanitize_('BACKFILL-' + (w.i + 1)), sanitize_(w.idv), sanitize_(vals[w.i][0]),
        sanitize_(fmtDateCell_(vals[w.i][2])), sanitize_(vals[w.i][4]),
        sanitize_((sess && (sess.email || sess.no)) || 'sistem'), new Date(),
        'v92: ID pendua/tiada digantikan dengan ID unik', sanitize_(JSON.stringify(vals[w.i]))
      ]);
      archived++;
    } catch (e) { continue; } /* arkib gagal: JANGAN ubah baris supaya tiada kehilangan data */
    sh.getRange(w.i + 1, 2).setValue(sanitize_(nid));
    changed++;
  }
  try { auditLog_(sess, 'BACKFILL_IDS', 'Log_Penugasan', '', '', 'changed=' + changed + ' archived=' + archived, 'BERJAYA'); } catch (e) { }
  return { ok: true, scanned: vals.length, changed: changed, archived: archived, ids: changed, note: changed ? 'ID unik diberikan' : 'Tiada perubahan (sudah stabil)' };
}

/* ============== v93: RESTORE REKOD DIPADAM (dari helaian Log_Deleted) ==============
   v75/v92 membuang rekod dengan HARD DELETE: SATU salinan PENUH baris asal ditulis
   ke helaian 'Log_Deleted' SEBELUM baris itu dibuang dari 'Log_Penugasan'; JSON baris
   mentah disimpan di lajur terakhir 'Salinan Baris'. Fungsi di bawah membolehkan
   rekod dipulihkan TERUS dari web app (admin sahaja) tanpa menyentuh Sheet secara manual.

   REKA BENTUK (dibetulkan selepas ujian sebenar atas 395 baris data sebenar):
   - kunciArkib_ : kunci UNIK setiap baris arkib = Kunci + Cap Masa + '#<baris>'.
     Cap masa sahaja TIDAK cukup (rekod sama boleh diarkib 2x dalam saat yang sama);
     '#<baris>' menjadikannya unik dan tetap stabil antara senarai & pulih.
   - restoreLog_ : menulis semula rekod dengan ID Penugasan yang SAMA.
       * snapshot ada  -> baris ditulis SEMULA VERBATIM (28-lajur legacy kekal 28-lajur,
                          20-lajur baharu kekal 20-lajur). Ini PENTING: menulis
                          snapshot legacy ke susun atur 20-lajur akan merosakkan rekod.
       * snapshot tiada -> baris dibina semula mengikut SUSUN ATUR yang betul untuk
                          jenis rekod (legacy vs baharu); jam DIKOSONGKAN supaya
                          kiraan jam TIDAK berganda.
     No. Log diberi nombor UNIK (max+1) supaya tiada canggah. Baris LAIN TIDAK diubah
     dan renumberLog_ TIDAK dipanggil: penomboran semula menyentuh SEMUA baris dan
     akan mengubah Bil baris legacy, yang merosakkan padanan soft-delete (kunci
     'LEG-<bil>') lalu menyebabkan rekod lain hilang dari paparan.
     IDEMPOTEN: memulihkan kunci yang sama dua kali tidak mencipta pendua. */
function kunciArkibAt_(vals, idx, startD) {
  /* v93: kunci UNIK & STABIL untuk baris arkib ke-`idx`. Guna Kunci + Cap Masa +
     nombor KEJADIAN (bukan nombor baris!) kerana nombor baris BERALIH bila baris
     arkib lain dipadam — kunci berasaskan baris akan rosak selepas pemulihan
     pertama. Nombor kejadian (1,2,3… dalam kumpulan Kunci|Cap Masa yang sama)
     kekal stabil walaupun baris kumpulan LAIN dipadam. */
  var ops = vals[idx] || [];
  var k = String((ops.length > 0 && ops[0] != null) ? ops[0] : '').trim();
  var ts = String((ops.length > 6 && ops[6] != null) ? ops[6] : '').trim();
  if (!k) k = 'ARKIB';
  var group = k + '|' + ts;
  var occ = 0;
  for (var i = startD; i <= idx; i++) {
    var o = vals[i] || [];
    var kk = String((o.length > 0 && o[0] != null) ? o[0] : '').trim();
    if (!kk) kk = 'ARKIB';
    var tt = String((o.length > 6 && o[6] != null) ? o[6] : '').trim();
    if (kk + '|' + tt === group) occ++;
  }
  return group + '|#' + occ;
}
/* v93: No. Log UNIK seterusnya (max sedia ada + 1) \u2014 tiada canggah, tiada lompang. */
function nextLogBil_(vals) {
  var max = 0;
  for (var i = 0; i < vals.length; i++) {
    var row = vals[i] || [];
    var b = Number(String(row[0] == null ? '' : row[0]).trim());
    if (!isNaN(b) && b > max) max = b;
  }
  return max + 1;
}
/* v93: SEMAK kalau baris arkib ini sudah wujud semula dalam Log_Penugasan.
   Guna normalizeLogRow_ supaya padanan SEDAR SUSUN ATUR (legacy 28-lajur vs
   baharu 20-lajur) \u2014 membandingkan indeks lajur mentah memberi hasil salah. */
function restoredAlready_(vals, idP, bil, tarikh, tajuk) {
  var wantId = String(idP == null ? '' : idP).trim();
  var realId = !!wantId && !/^LEG-/i.test(wantId);
  var wb = String(bil == null ? '' : bil).trim();
  var wt = String(tarikh == null ? '' : tarikh).trim();
  var wtj = String(tajuk == null ? '' : tajuk).trim();
  for (var i = 0; i < vals.length; i++) {
    var r = vals[i] || [];
    if (!r.length) continue;
    var rec = normalizeLogRow_(r, i + 1);
    if (!rec) continue;
    if (realId) {
      if (String(rec.id == null ? '' : rec.id).trim() === wantId) return i + 1;
    } else if (String(rec.bil == null ? '' : rec.bil).trim() === wb &&
      String(rec.tarikh_mula == null ? '' : rec.tarikh_mula).trim() === wt &&
      String(rec.tajuk == null ? '' : rec.tajuk).trim() === wtj) {
      return i + 1;
    }
  }
  return 0;
}
/* v93: senarai rekod dalam Log_Deleted (admin) \u2014 untuk UI '\u267b Rekod Dipadam'. */
function getDeletedLogs_(sess) {
  var out = [];
  try {
    var dsh = getSheet_(SHEET_LOG_DELETED, LOG_DELETED_HEADERS);
    var vals = dsh.getDataRange().getValues();
    var hdr = (vals && vals.length) ? vals[0] : [];
    var h0 = String((hdr && hdr.length) ? hdr[0] : '').trim().toLowerCase();
    var start = (h0 === 'kunci') ? 1 : 0;
    for (var i = start; i < vals.length; i++) {
      var r = vals[i] || [];
      if (!r.length) continue;
      var kunci = String(r[0] == null ? '' : r[0]).trim();
      var idP = String((r.length > 1 && r[1] != null) ? r[1] : '').trim();
      var bil = String((r.length > 2 && r[2] != null) ? r[2] : '').trim();
      var tajuk = String((r.length > 4 && r[4] != null) ? r[4] : '');
      if (!kunci && !idP && !bil && !tajuk) continue;
      var capCell = r.length > 6 ? r[6] : '';
      out.push({
        kunci: kunciArkibAt_(vals, i, start), baris: i + 1, kunci_asal: kunci,
        id: idP, bil: bil, tarikh_mula: fmtDateCell_(r.length > 3 ? r[3] : ''), tajuk: tajuk,
        dipadam_oleh: String((r.length > 5 && r[5] != null) ? r[5] : ''),
        cap_masa: (capCell instanceof Date) ? Utilities.formatDate(capCell, 'Asia/Kuala_Lumpur', 'yyyy-MM-dd HH:mm:ss') : String(capCell == null ? '' : capCell),
        sebab: String((r.length > 7 && r[7] != null) ? r[7] : ''),
        snapshot: !!((r.length > 8 && r[8] != null) ? String(r[8]).trim() : '')
      });
    }
  } catch (e) {
    return { ok: false, error: 'Gagal membaca Log_Deleted: ' + (e && e.message ? e.message : String(e)) };
  }
  return { ok: true, data: out, total: out.length };
}
/* v93: PULIHKAN satu rekod dari Log_Deleted kembali ke Log_Penugasan. Admin sahaja.
   body: { kunci:<kunciArkib_> | baris:<1-based Log_Deleted row>, id, bil } */
function restoreLog_(body, sess) {
  body = body || {};
  if (!isAdminRole_(sess && sess.role)) {
    try { auditLog_(sess, 'AKSES_DITOLAK', 'Log_Deleted', '', '', '', 'GAGAL'); } catch (e) { }
    return { ok: false, error: 'Akses ditolak: hanya Pentadbir Sistem / Admin boleh pulihkan rekod.', code: 'FORBIDDEN' };
  }
  var wantKey = String(body.kunci == null ? '' : body.kunci).trim();
  var wantRow = Number(body.baris) || 0;
  if (!wantKey && !wantRow) return { ok: false, error: 'Rekod arkib tidak dikenal pasti (kunci/baris tiada).' };
  var dsh = getSheet_(SHEET_LOG_DELETED, LOG_DELETED_HEADERS);
  var dvals = dsh.getDataRange().getValues();
  if (!dvals || dvals.length < 2) return { ok: false, error: 'Log_Deleted tiada rekod untuk dipulihkan.' };
  var hdrD = dvals[0] || [];
  var startD = (String((hdrD && hdrD.length) ? hdrD[0] : '').trim().toLowerCase() === 'kunci') ? 1 : 0;
  /* (1) cari baris arkib ikut KUNCI (autoritatif) atau nombor baris. */
  var hit = -1, hitOps = null;
  if (wantKey) {
    for (var i = startD; i < dvals.length; i++) {
      var ops = dvals[i] || [];
      if (!ops.length) continue;
      if (kunciArkibAt_(dvals, i, startD) === wantKey) { hit = i; hitOps = ops; break; }
    }
  }
  /* v93: KUNCI autoritatif. Fallback `baris` HANYA bila klien tidak menghantar
     kunci \u2014 kalau kunci yang sudah tiada dibiarkan jatuh ke fallback baris,
     baris arkib LAIN yang kini menduduki indeks itu akan dipulihkan (rekod SALAH). */
  if (hit < 0 && wantRow >= 1 && wantRow <= dvals.length) {
    /* v93: fallback `baris` yang KETAT — hanya diterima kalau baris arkib di
       indeks itu benar-benar padan dengan id/bil yang diminta (atau klien
       memang tidak menghantar kunci). Ini menghalang pemulihan rekod SALAH
       apabila senarai klien sudah lapuk. */
    var cand = dvals[wantRow - 1] || [];
    var cId = String((cand.length > 1 && cand[1] != null) ? cand[1] : '').trim();
    var cBil = String((cand.length > 2 && cand[2] != null) ? cand[2] : '').trim();
    var wIdB = String(body.id == null ? '' : body.id).trim();
    var wBilB = String(body.bil == null ? '' : body.bil).trim();
    if (!wantKey || (wIdB && cId === wIdB) || (!wIdB && wBilB && cBil === wBilB)) { hit = wantRow - 1; hitOps = cand; }
  }
  if (hit < 0) return { ok: false, error: 'Rekod arkib tidak dijumpai (kunci tidak sepadan).' };
  var idP = String((hitOps.length > 1 && hitOps[1] != null) ? hitOps[1] : '').trim();
  var bilA = String((hitOps.length > 2 && hitOps[2] != null) ? hitOps[2] : '').trim();
  var tkhA = fmtDateCell_(hitOps.length > 3 ? hitOps[3] : '');
  var tajukA = String((hitOps.length > 4 && hitOps[4] != null) ? hitOps[4] : '');
  var snapRaw = String((hitOps.length > 8 && hitOps[8] != null) ? hitOps[8] : '').trim();
  var actor = String((sess && (sess.email || sess.no)) || 'admin');
  var sh = getSheet_(SHEET_LOG, LOG_HEADERS);
  var vals = sh.getDataRange().getValues();
  /* (2) IDEMPOTEN: kalau rekod sudah ada semula, buang arkib & lapor \u2014 TIADA pendua. */
  var existing = restoredAlready_(vals, idP, bilA, tkhA, tajukA);
  if (existing) {
    try { dsh.deleteRow(hit + 1); } catch (e) { }
    try { auditLog_(sess, 'RESTORE_LOG', 'Log_Penugasan', (idP || bilA), 'sudah wujud di baris ' + existing, 'IDEMPOTEN', 'BERJAYA'); } catch (e) { }
    return { ok: true, already: true, mode: 'noop', id: idP, bil: bilA, row: existing, note: 'Rekod sudah ada dalam Log_Penugasan \u2014 tiada pendua dicipta.' };
  }
  /* (3) bina baris. Snapshot = VERBATIM (kekalkan susun atur asal 28/20 lajur). */
  var mode = 'reconstructed', outRow = null;
  if (snapRaw) {
    try {
      var raw = JSON.parse(snapRaw);
      if (raw && raw.length) {
        outRow = [];
        for (var c = 0; c < raw.length; c++) outRow.push(sanitize_(raw[c] == null ? '' : raw[c]));
        mode = 'snapshot';
      }
    } catch (e) { outRow = null; }
  }
  if (!outRow) {
    var isLeg = /^LEG-/i.test(String(idP));
    if (isLeg) {
      /* LEGACY 28-lajur: col3=tajuk, col4/5=tarikh, col16=petugas admin. */
      outRow = new Array(28);
      for (var z = 0; z < 28; z++) outRow[z] = '';
      outRow[3] = sanitize_(tajukA);
      outRow[4] = sanitize_(tkhA);
      outRow[5] = sanitize_(tkhA);
      outRow[16] = sanitize_('PULIHAN v93 (' + actor + ')');
    } else {
      /* BAHARU 20-lajur (LOG_HEADERS): col1=ID, col2/3=tarikh, col4=tajuk, col16=status. */
      outRow = new Array(LOG_HEADERS.length);
      for (var z2 = 0; z2 < outRow.length; z2++) outRow[z2] = '';
      outRow[1] = sanitize_(idP);
      outRow[2] = sanitize_(tkhA);
      outRow[3] = sanitize_(tkhA);
      outRow[4] = sanitize_(tajukA);
      outRow[10] = sanitize_('PULIHAN v93 (' + actor + ')');
      outRow[11] = new Date();
      outRow[16] = 'Ambilan Semula \u26a0\ufe0f';
      outRow[19] = sanitize_('Dipulihkan dari Log_Deleted (v93) \u00b7 snapshot tiada \u00b7 jam perlu disemak semula.');
    }
  }
  /* No. Log UNIK \u2014 tiada canggah; baris lain TIDAK disentuh. */
  var freshBil = nextLogBil_(vals);
  outRow[0] = freshBil;
  /* (4) TULIS semula ke Log_Penugasan. Kalau gagal, arkib KEKAL (tiada kehilangan data). */
  try {
    sh.appendRow(outRow);
  } catch (e) {
    return { ok: false, error: 'Gagal menulis semula ke Log_Penugasan (arkib KEKAL): ' + (e && e.message ? e.message : String(e)), mode: mode };
  }
  /* (5) BUANG baris arkib yang telah dipulihkan sahaja. */
  try { dsh.deleteRow(hit + 1); } catch (e) { }
  try { auditLog_(sess, 'RESTORE_LOG', 'Log_Penugasan', (idP || bilA), 'mode=' + mode, 'dipulihkan baris arkib ' + (hit + 1) + ' -> No. Log ' + freshBil, 'BERJAYA'); } catch (e) { }
  var rem = -1;
  try { rem = dsh.getLastRow(); } catch (e) { rem = -1; }
  return {
    ok: true, already: false, mode: mode, id: idP, bil: bilA, new_bil: freshBil,
    restored_row: sh.getLastRow(), archived_remaining: rem, snapshot: mode === 'snapshot'
  };
}

/* v95: PULIH PUKAL — pulihkan senarai kunci arkib. Setiap satu guna restoreLog_
   (ID sama, idempoten, snapshot verbatim / reconstructed). Satu gagal TIDAK
   menghalang yang lain; arkib KEKAL jika penulisan gagal (tiada kehilangan data). */
function restoreLogs_(body, sess) {
  body = body || {};
  if (!isAdminRole_(sess && sess.role)) {
    try { auditLog_(sess, 'AKSES_DITOLAK', 'Log_Deleted', '', '', '', 'GAGAL'); } catch (e) { }
    return { ok: false, error: 'Akses ditolak: hanya Pentadbir Sistem / Admin boleh pulihkan rekod.', code: 'FORBIDDEN' };
  }
  var keys = body.kunci;
  if (typeof keys === 'string') keys = [keys];
  if (!keys || !keys.length) return { ok: false, error: 'Tiada rekod dipilih untuk dipulihkan.' };
  /* v95: SELESAIKAN kunci -> baris arkib SEKALI di awal, kemudian proses MENURUN
     (baris bawah dahulu). Sebab: kunci arkib = Kunci|Cap Masa|#kejadian, dan
     #kejadian BERALIH bila baris arkib lain dalam kumpulan sama dipadam. Memproses
     menurun memastikan setiap baris yang diselesaikan masih pada indeksnya (baris
     di bawah tidak pernah beralih oleh pemadaman baris di atas). Ini menjadikan
     pulih pukal TAHAN terhadap peralihan baris. */
  var dsh = getSheet_(SHEET_LOG_DELETED, LOG_DELETED_HEADERS);
  var dvals = dsh.getDataRange().getValues();
  var hdrD = (dvals && dvals.length) ? dvals[0] : [];
  var startD = (String((hdrD && hdrD.length) ? hdrD[0] : '').trim().toLowerCase() === 'kunci') ? 1 : 0;
  var resolved = [];
  for (var i = 0; i < keys.length; i++) {
    var k = String(keys[i] == null ? '' : keys[i]).trim();
    if (!k) { resolved.push({ kunci: k, row: -1, err: 'kunci kosong' }); continue; }
    var hit = -1;
    for (var j = startD; j < dvals.length; j++) {
      var ops = dvals[j] || [];
      if (!ops.length) continue;
      if (kunciArkibAt_(dvals, j, startD) === k) { hit = j; break; }
    }
    resolved.push({ kunci: k, row: hit, err: hit < 0 ? 'Rekod arkib tidak dijumpai (kunci tidak sepadan).' : '' });
  }
  resolved.sort(function (a, b) { return b.row - a.row; });
  var results = [], okN = 0, noopN = 0, failN = 0;
  for (var m = 0; m < resolved.length; m++) {
    var it = resolved[m], kk = it.kunci;
    if (it.row < 0) { results.push({ kunci: kk, status: 'fail', error: it.err }); failN++; continue; }
    var r;
    try { r = restoreLog_({ kunci: kk, baris: it.row + 1 }, sess); }
    catch (e) { r = { ok: false, error: (e && e.message ? e.message : String(e)) }; }
    if (r && r.ok) {
      if (r.already) { results.push({ kunci: kk, status: 'noop', mod: 'noop', id: r.id, bil: r.bil }); noopN++; }
      else { results.push({ kunci: kk, status: 'ok', mod: r.mode, id: r.id, bil: r.bil, new_bil: r.new_bil }); okN++; }
    } else {
      results.push({ kunci: kk, status: 'fail', error: (r && r.error) || 'tidak diketahui' }); failN++;
    }
  }
  try { auditLog_(sess, 'RESTORE_LOG_PUKAL', 'Log_Penugasan', '', 'ok=' + okN + ' noop=' + noopN + ' fail=' + failN, '', 'BERJAYA'); } catch (e) { }
  return { ok: true, total: keys.length, ok_count: okN, noop_count: noopN, fail_count: failN, results: results };
}


function fetchLogData(startDate, endDate) {
  var sh = getSheet_(SHEET_LOG, LOG_HEADERS);
  var data = sh.getDataRange().getValues();
  var out = [];
  var del = deletedLogKeys_(); /* v74: tapis rekod yang telah di-soft-delete */
  /* v63: Log_Penugasan TIADA baris header (baris 1 ialah data LEGACY pertama).
     Versi lama bermula i=1 -> rekod PERTAMA terkeluar dari kiraan merentas peranti. */
  for (var i = 0; i < data.length; i++) {
    var row = data[i];
    if (!row || row.length === 0) continue;
    var rec = normalizeLogRow_(row, i + 1); /* v92: penambat baris */
    if (!rec) continue;
    if (isDeletedRec_(rec, del)) continue; /* v74: rekod dipadam tidak dipaparkan */
    var ds = rec.tarikh_mula || '';
    if (startDate && ds && ds < startDate) continue;
    if (endDate && ds && ds > endDate) continue;
    out.push(rec);
  }
  return out;
}

/**
 * v73: KIRAAN rasmi Log_Penugasan — dibaca TERUS dari Google Sheet supaya SEMUA
 * peranti memaparkan jumlah yang SAMA (tidak bergantung pada snapshot terbenam
 * atau localStorage peranti). `periodStart` (YYYY-MM-DD, lalai PERIOD_START_FE)
 * menapis `tarikh_mula >= periodStart` supaya padan dengan KPI "Jumlah Rekod
 * Penugasan". Mengembalikan juga `all` (jumlah baris penuh) untuk diagnostik.
 */
function fetchLogCounts_(periodStart) {
  var p = String(periodStart == null ? '' : periodStart).trim();
  if (p.length < 10) {
    try { p = String(readSetting_('PERIOD_START') || '').trim(); } catch (e) { p = ''; }
  }
  if (p.length < 10) p = '2026-10-01';
  var sh = getSheet_(SHEET_LOG, LOG_HEADERS);
  var data = sh.getDataRange().getValues();
  var all = 0, inPeriod = 0, jenis = {};
  var del = deletedLogKeys_(); /* v74: kiraan TIDAK termasuk rekod di-soft-delete */
  for (var i = 0; i < data.length; i++) {
    var row = data[i];
    if (!row || row.length === 0) continue;
    var rec = normalizeLogRow_(row);
    if (!rec) continue;
    if (isDeletedRec_(rec, del)) continue; /* v74 */
    all++;
    var ds = String(rec.tarikh_mula || '');
    if (ds && ds >= p) {
      inPeriod++;
      var j = String(rec.jenis || '') || '(kosong)';
      jenis[j] = (jenis[j] || 0) + 1;
    }
  }
  return { ok: true, all: all, inPeriod: inPeriod, periodStart: p, jenis: jenis, byDevice: false, source: 'sheet', at: new Date().toISOString() };
}

function getLeadershipData() {
  var sh = getSheet_(SHEET_KEPIMPINAN, KEPIMPINAN_HEADERS);
  var data = sh.getDataRange().getValues();
  var out = [];
  for (var i = 1; i < data.length; i++) {
    if (!data[i][0]) continue;
    out.push({ nama: data[i][0], jawatan: data[i][1], gambar: data[i][2], susunan: data[i][3] });
  }
  return out;
}

/** v60: kesan susun atur lajur Master Personel (tahan header/data tergeser). */
function personelLayout_(vals) {
  var head = (vals[0] || []).map(function (h) { return String(h == null ? '' : h).trim().toLowerCase(); });
  function findCol(names) {
    for (var a = 0; a < names.length; a++) {
      for (var c = 0; c < head.length; c++) { if (head[c].indexOf(names[a]) >= 0) return c; }
    }
    return -1;
  }
  var roleCol = findCol(['peranan', 'role', 'akses']);
  var sample = vals[1] || [];
  function noLike(v) { var s = String(v == null ? '' : v).replace(/\s+/g, ''); return /^[A-Za-z]{1,3}\/?[0-9]{4,}$/.test(s); }
  var shifted = (sample.length > 3) && !noLike(sample[0]) && noLike(sample[3]);
  if (shifted) {
    return { bil: 0, pangkat: 1, nama: 2, no: 3, team: 4, status: 5, email: 6, role: roleCol >= 0 ? roleCol : 7, shifted: true };
  }
  var noCol = findCol(['no personel', 'no. personel']);
  var namaCol = findCol(['nama']);
  var pangkatCol = findCol(['pangkat']);
  var teamCol = findCol(['team']);
  var statusCol = findCol(['status']);
  var emailCol = findCol(['e-mel', 'emel', 'email']);
  return {
    bil: -1,
    no: noCol >= 0 ? noCol : 0,
    nama: namaCol >= 0 ? namaCol : 1,
    pangkat: pangkatCol >= 0 ? pangkatCol : 2,
    team: teamCol >= 0 ? teamCol : 4,
    status: statusCol >= 0 ? statusCol : 5,
    email: emailCol >= 0 ? emailCol : 6,
    role: roleCol >= 0 ? roleCol : 7,
    shifted: false
  };
}

/** v60: kemas kini Peranan dalam Master Personel (pengguna belum berdaftar dalam Pengguna_Akses). */
function updatePersonelRole_(no, role, sess) {
  try {
    if (!no) return { ok: false, error: 'No. Personel diperlukan untuk mengemas kini Master Personel.' };
    var sh = getSheet_(SHEET_PERSONEL, PERSONEL_HEADERS);
    var vals = sh.getDataRange().getValues();
    if (!vals || vals.length < 2) return { ok: false, error: 'Master Personel kosong.' };
    var L = personelLayout_(vals);
    var key = normNo_(no);
    var newRole = normRole_(role);
    for (var i = 1; i < vals.length; i++) {
      if (normNo_(vals[i][L.no]) === key) {
        sh.getRange(i + 1, L.role + 1).setValue(newRole);
        auditLog_(sess, 'KEMASKINI_PERANAN_PERSONEL', 'Kawalan Akses', vals[i][L.no], '', newRole, 'BERJAYA');
        return { ok: true, source: 'Master Personel', user: { no: vals[i][L.no], name: vals[i][L.nama], role: newRole, status: vals[i][L.status] || 'Aktif' } };
      }
    }
    return { ok: false, error: 'No. Personel tidak dijumpai dalam Master Personel.' };
  } catch (e) {
    return { ok: false, error: 'Gagal mengemas kini Master Personel: ' + (e && e.message ? e.message : String(e)) };
  }
}

/** v73: TAMBAH / KEMASKINI / NYAHAKTIF (soft delete) personel dalam 'Master Personel'.
   - Padanan rekod oleh No. Personel (normNo_, tahan ruang/besar-kecil).
   - PADAM = SOFT DELETE: HANYA tukar Status -> 'Tidak Aktif' (baris TIDAK dipadam)
     supaya tiada rekod hilang dari helaian.
   - Penyelia ditulis ke helaian 'Mapping Penyelia' (rumah sebenar untuk medan ini).
   - Semua perubahan direkod dalam Audit_Log. */
function upsertPersonel(body, sess) {
  body = body || {};
  try {
    var no = String(body.no == null ? '' : body.no).trim();
    if (!no) return { ok: false, error: 'No. Personel wajib diisi.' };
    var sh = getSheet_(SHEET_PERSONEL, PERSONEL_HEADERS);
    var vals = sh.getDataRange().getValues();
    if (!vals || !vals.length) vals = [PERSONEL_HEADERS];
    var L = personelLayout_(vals);
    var cols = L.shifted ? 8 : Math.max(8, PERSONEL_HEADERS.length);
    var key = normNo_(no);
    var idx = -1, nextBil = 1;
    for (var i = 1; i < vals.length; i++) {
      var b = (L.bil >= 0) ? numOrBlank_(vals[i][L.bil]) : '';
      if (typeof b === 'number' && b >= nextBil) nextBil = b + 1;
      if (idx < 0 && normNo_(vals[i][L.no]) === key) idx = i;
    }
    var isNew = (idx < 0);
    var nama = String(body.nama == null ? '' : body.nama).trim();
    if (isNew && !nama) return { ok: false, error: 'Nama Penuh wajib diisi.' };
    var row;
    if (isNew) {
      row = [];
      for (var z = 0; z < cols; z++) row.push('');
    } else {
      row = vals[idx].slice(0, cols);
      while (row.length < cols) row.push('');
    }
    function setCell(ix, v) { if (ix >= 0 && ix < cols) row[ix] = sanitize_(v); }
    if (isNew && L.bil >= 0) setCell(L.bil, nextBil);
    setCell(L.no, no);
    if (nama) setCell(L.nama, nama);
    if (body.pangkat != null) setCell(L.pangkat, body.pangkat);
    if (body.team != null) setCell(L.team, body.team);
    if (body.role != null) setCell(L.role, body.role);
    if (body.email != null) setCell(L.email, body.email);
    setCell(L.status, String(body.status == null || body.status === '' ? 'Aktif' : body.status).trim());
    if (isNew) sh.appendRow(row);
    else sh.getRange(idx + 1, 1, 1, cols).setValues([row]);
    /* Penyelia -> helaian 'Mapping Penyelia' (medan ini bukan lajur Master Personel). */
    if (body.penyelia != null) {
      try { upsertPenyelia_(no, nama || String(vals[idx] && vals[idx][L.nama] || '').trim(), String(body.team == null ? '' : body.team).trim(), String(body.penyelia).trim()); } catch (e) { }
    }
    _PERSONEL_NOMAP = null;
    var rec = { nama: nama || String(vals[idx] && vals[idx][L.nama] || '').trim(), team: String(body.team == null ? '' : body.team).trim(), role: String(body.role == null ? '' : body.role).trim(), status: String(row[L.status] == null ? '' : row[L.status]) };
    try { auditLog_(sess, isNew ? 'TAMBAH_PERSONEL' : 'KEMASKINI_PERSONEL', 'Master Personel', no, '', JSON.stringify(rec), 'BERJAYA'); } catch (e) { }
    return { ok: true, saved: isNew ? 'ditambah' : 'dikemaskini', no: no, name: rec.nama, status: rec.status };
  } catch (e) {
    return { ok: false, error: 'Gagal menyimpan personel: ' + (e && e.message ? e.message : String(e)) };
  }
}

/** v73: tulis/kemaskini baris penyelia dalam 'Mapping Penyelia' (buat jika tiada). */
function upsertPenyelia_(no, nama, team, penyelia) {
  try {
    var sh = getSheet_(SHEET_PENYELIA, PENYELIA_HEADERS);
    var vals = sh.getDataRange().getValues();
    var key = normNo_(no);
    if (!key) return;
    for (var i = 1; i < vals.length; i++) {
      if (normNo_(vals[i][0]) === key) {
        sh.getRange(i + 1, 1, 1, PENYELIA_HEADERS.length).setValues([[sanitize_(no), sanitize_(nama || vals[i][1] || ''), sanitize_(team || vals[i][2] || ''), sanitize_(penyelia), sanitize_(vals[i][4] || ''), 'Aktif']]);
        return;
      }
    }
    sh.appendRow([sanitize_(no), sanitize_(nama), sanitize_(team), sanitize_(penyelia), '', 'Aktif']);
  } catch (e) { }
}

function getPersonnelList() {
  var sh = getSheet_(SHEET_PERSONEL, PERSONEL_HEADERS);
  var data = sh.getDataRange().getValues();
  var out = [];
  if (!data || data.length < 2) return out;
  var L = personelLayout_(data);
  for (var i = 1; i < data.length; i++) {
    var r = data[i];
    var no = String(r[L.no] == null ? '' : r[L.no]).trim();
    var nama = String(r[L.nama] == null ? '' : r[L.nama]).trim();
    if (!no && !nama) continue;
    out.push({
      bil: L.bil >= 0 ? r[L.bil] : i,
      pangkat: r[L.pangkat], nama: nama, no: no,
      team: r[L.team], status: r[L.status],
      email: String(r[L.email] == null ? '' : r[L.email]).trim(),
      /* v62: normalisasi Peranan -> KOD kanonik (SUPER_ADMIN/ADMIN/PENYELIA/STAF).
         Sheet menyimpan CAMPURAN kod + label ("Pentadbir Sistem", "Staf Berdaftar");
         tanpa normalisasi, <select> frontend jatuh ke opsyen pertama = "Petugas". */
      role: normRole_(r[L.role]),
      roleRaw: String(r[L.role] == null ? '' : r[L.role]).trim(),
      roleLabel: labelFor_(r[L.role])
    });
  }
  return out;
}

/** v62: baiki SEMUA nilai Peranan dalam Master Personel -> KOD kanonik.
   Menukar label lama ("Pentadbir Sistem", "Staf Berdaftar") kepada kod
   (SUPER_ADMIN/ADMIN/PENYELIA/STAF) supaya role tidak lagi jatuh ke "Petugas". */
function repairPersonelRoles(sess) {
  var sh = getSheet_(SHEET_PERSONEL, PERSONEL_HEADERS);
  var vals = sh.getDataRange().getValues();
  if (!vals || vals.length < 2) return { ok: true, changed: 0, message: 'Master Personel kosong.' };
  var L = personelLayout_(vals);
  var changed = 0, rows = [];
  for (var i = 1; i < vals.length; i++) {
    var raw = String(vals[i][L.role] == null ? '' : vals[i][L.role]).trim();
    if (!raw) continue;
    var code = normRole_(raw);
    if (code !== raw) rows.push([i + 1, code, raw]);
  }
  for (var j = 0; j < rows.length; j++) {
    sh.getRange(rows[j][0], L.role + 1).setValue(rows[j][1]);
    changed++;
  }
  try { auditLog_(sess, 'BAIKI_PERANAN_PERSONEL', 'Kawalan Akses', 'Master Personel', '', changed + ' baris', 'BERJAYA'); } catch (e) { }
  return { ok: true, changed: changed, message: changed + ' nilai Peranan dinormalkan kepada kod kanonik.' };
}

/* ------------------------ ALIRAN KELULUSAN ------------------------------ */
function submitPenugasan(record, sess) {
  record = record || {};
  if (!record.tajuk || !record.tarikh_mula) return { ok: false, error: 'Tajuk dan tarikh diperlukan.' };
  var id = String(record.id || ('LP-' + Date.now()));
  var sh = getSheet_(SHEET_KELULUSAN, KELULUSAN_HEADERS);
  sh.appendRow([sanitize_(id), 'MENUNGGU_KELULUSAN', sanitize_((sess && (sess.email || sess.no)) || ''), new Date(), '', '', sanitize_(record.catatan || '')]);
  auditLog_(sess, 'HANTAR_KELULUSAN', 'Kelulusan', id, '', 'MENUNGGU_KELULUSAN', 'BERJAYA');
  return { ok: true, id: id, status: 'MENUNGGU_KELULUSAN' };
}

function approvePenugasan(data, sess) {
  data = data || {};
  var id = String(data.id || '').trim();
  var decision = String(data.decision || 'LULUS').trim().toUpperCase();
  if (!id) return { ok: false, error: 'ID penugasan diperlukan.' };
  var status = (decision === 'TOLAK') ? 'DITOLAK' : 'DISAHKAN';
  var sh = getSheet_(SHEET_KELULUSAN, KELULUSAN_HEADERS);
  var vals = sh.getDataRange().getValues();
  for (var i = 1; i < vals.length; i++) {
    if (String(vals[i][0]).trim() === id) {
      if (String(vals[i][1]).trim().toUpperCase() === 'DISAHKAN') {
        return { ok: false, error: 'Penugasan ini sudah diluluskan (elak kelulusan berulang).' };
      }
      sh.getRange(i + 1, 2, 1, 4).setValues([[status, vals[i][2], vals[i][3], (sess && (sess.email || sess.no)) || '']]);
      if (data.catatan) sh.getRange(i + 1, 7).setValue(sanitize_(data.catatan));
      auditLog_(sess, 'KELULUSAN', 'Kelulusan', id, String(vals[i][1] || ''), status, 'BERJAYA');
      return { ok: true, id: id, status: status, approvedBy: (sess && (sess.email || sess.no)) || '' };
    }
  }
  return { ok: false, error: 'Rekod penugasan tidak dijumpai dalam senarai kelulusan.' };
}

function listKelulusan() {
  var sh = getSheet_(SHEET_KELULUSAN, KELULUSAN_HEADERS);
  var vals = sh.getDataRange().getValues();
  var out = [];
  for (var i = 1; i < vals.length; i++) {
    if (!vals[i][0]) continue;
    out.push({
      id: vals[i][0], status: vals[i][1], dihantar_oleh: vals[i][2], tarikh_hantar: vals[i][3],
      diluluskan_oleh: vals[i][4], tarikh_lulus: vals[i][5], catatan: vals[i][6]
    });
  }
  return out;
}

/* --------------------- PUSAT KAWALAN AKSES (SUPER ADMIN) ---------------- */
/** v38: Permohonan nyahaktif akaun oleh pengguna sendiri (direkod untuk kelulusan Pentadbir). */
function requestDeactivate(data) {
  data = data || {};
  var no = String(data.no || '').trim();
  var name = sanitize_(String(data.name || ''));
  var reason = sanitize_(String(data.reason || ''));
  if (!no) return { ok: false, error: 'No. Personel diperlukan.' };
  try {
    auditLog_(null, 'PERMOHONAN_NYAHAKTIF', 'Kawalan Akses', no, name, reason || '(tiada sebab)', 'MENUNGGU');
  } catch (e) {}
  return { ok: true, message: 'Permohonan nyahaktif direkodkan untuk kelulusan Pentadbir Sistem.' };
}

function adminListUsers() {
  var sh = getSheet_(SHEET_AKSES, AKSES_HEADERS);
  var vals = sh.getDataRange().getValues();
  var out = [];
  for (var i = 1; i < vals.length; i++) {
    if (!vals[i][0] && !vals[i][2]) continue;
    out.push({
      email: String(vals[i][0] || '').trim().toLowerCase(), name: vals[i][1], no: vals[i][2],
      role: normRole_(vals[i][3]), status: String(vals[i][4] || ''), daftar: vals[i][5],
      lastLogin: vals[i][9], rowIndex: i + 1
    });
  }
  return out;
}

/** Kira bilangan SUPER ADMIN aktif. */
function countActiveSuperAdmins_(exceptRow) {
  var sh = getSheet_(SHEET_AKSES, AKSES_HEADERS);
  var vals = sh.getDataRange().getValues();
  var n = 0;
  for (var i = 1; i < vals.length; i++) {
    if (exceptRow && (i + 1) === exceptRow) continue;
    if (normRole_(vals[i][3]) === ROLE_SUPER && String(vals[i][4] || '').toLowerCase().indexOf('aktif') >= 0) n++;
  }
  return n;
}

function adminUpdateUser(data, sess) {
  data = data || {};
  var no = String(data.no || '').trim();
  var email = String(data.email || '').trim().toLowerCase();
  if (!no && !email) return { ok: false, error: 'No. Personel atau e-mel diperlukan.' };
  var sh = getSheet_(SHEET_AKSES, AKSES_HEADERS);
  var vals = sh.getDataRange().getValues();
  var key = normNo_(no);
  for (var i = 1; i < vals.length; i++) {
    var match = (no && normNo_(vals[i][2]) === key) || (email && normEmail_(vals[i][0]) === email);
    if (!match) continue;
    var row = i + 1;
    var oldRole = normRole_(vals[i][3]);
    var oldStatus = String(vals[i][4] || '');
    var newRole = data.role ? normRole_(data.role) : oldRole;
    var newStatus = data.status ? String(data.status) : oldStatus;
    var newName = data.name ? sanitize_(String(data.name)) : vals[i][1];

    /* PELINDUNG: SUPER ADMIN terakhir tidak boleh diturunkan / dinyahaktif. */
    var isCurrentlySuperActive = (oldRole === ROLE_SUPER) && (oldStatus.toLowerCase().indexOf('aktif') >= 0);
    var becomingNonSuper = (newRole !== ROLE_SUPER) || (newStatus.toLowerCase().indexOf('aktif') < 0);
    if (isCurrentlySuperActive && becomingNonSuper && countActiveSuperAdmins_(row) < 1) {
      auditLog_(sess, 'PELINDUNG_SUPERADMIN', 'Kawalan Akses', vals[i][2], oldRole, newRole, 'GAGAL');
      return { ok: false, error: 'Tindakan ditolak: ini akaun SUPER ADMIN aktif yang terakhir. Sistem mesti mengekalkan sekurang-kurangnya satu SUPER ADMIN aktif.' };
    }

    sh.getRange(row, 2).setValue(newName);
    sh.getRange(row, 4).setValue(newRole);
    sh.getRange(row, 5).setValue(newStatus);
    /* v28: jika status menjadi INAKTIF, sekat SEMUA sesi pengguna serta-merta. */
    if (newStatus.toLowerCase().indexOf('aktif') < 0 || newStatus.toLowerCase().indexOf('inaktif') >= 0) {
      killSessionsFor_(vals[i][2], String(vals[i][0] || ''));
    }
    auditLog_(sess, 'KEMASKINI_PENGGUNA', 'Kawalan Akses', vals[i][2],
      oldRole + '/' + oldStatus, newRole + '/' + newStatus, 'BERJAYA');
    /* v62: selaraskan Peranan ke Master Personel juga (sumber yang dibaca getPersonnelList),
       supaya perubahan role kekal & konsisten merentas semua peranti. */
    try { updatePersonelRole_(vals[i][2], newRole, sess); } catch (e) { }
    return { ok: true, source: 'Pengguna_Akses', user: { email: String(vals[i][0]), name: newName, no: vals[i][2], role: newRole, status: newStatus } };
  }
  /* v60: jatuh balik — kemas kini Peranan dalam Master Personel (pengguna belum berdaftar). */
  var mp = updatePersonelRole_(no, data.role, sess);
  if (mp.ok) return mp;
  return { ok: false, error: 'Pengguna tidak dijumpai dalam Pengguna_Akses dan Master Personel (no/e-mel tidak sepadan).' };
}

function adminResetAccess(data, sess) {
  data = data || {};
  var email = String(data.email || '').trim().toLowerCase();
  if (!email) return { ok: false, error: 'E-mel diperlukan.' };
  var row = findAccessRow_(email);
  if (row < 0) return { ok: false, error: 'Pengguna tidak dijumpai.' };
  var sh = getSheet_(SHEET_AKSES, AKSES_HEADERS);
  /* Kosongkan hash+salt → pengguna mesti tetapkan kata laluan baharu melalui "Lupa Kata Laluan". */
  sh.getRange(row, 7, 1, 2).setValues([['', '']]);
  auditLog_(sess, 'RESET_AKSES', 'Kawalan Akses', email, 'hash', '(kosong → set semula)', 'BERJAYA');
  return { ok: true, message: 'Akses direset. Pengguna perlu menetapkan kata laluan baharu melalui "Lupa Kata Laluan".' };
}

/* ------------------- v41: PROFIL, VALIDASI, RESET, PENYELIA ------------- */
/** v41: identiti perekod — Nama Penuh + No. Personel (DILARANG KOSONG). */
function direkodOleh_(sess) {
  sess = sess || {};
  var nm = String(sess.name || '').trim();
  var no = String(sess.no || '').trim();
  if (nm && no) return sanitize_(nm + ' (' + no + ')');
  if (nm) return sanitize_(nm);
  if (no) return sanitize_(no);
  return sanitize_(String(sess.email || '').trim());
}

/** v41: profil pengguna aktif — gabungan Pengguna_Akses + Master Personel + Mapping Penyelia. */
function getUserProfile(sess) {
  sess = sess || {};
  var no = String(sess.no || '').trim();
  var email = String(sess.email || '').trim().toLowerCase();
  var out = { name: sess.name || '', no: no, role: normRole_(sess.role), label: labelFor_(sess.role), email: email, team: '', pangkat: '', status: '', lastLogin: '', penyelia: '', exp: sess.exp || 0 };
  try {
    var sh = getSheet_(SHEET_AKSES, AKSES_HEADERS);
    var vals = sh.getDataRange().getValues();
    var key = normNo_(no);
    for (var i = 1; i < vals.length; i++) {
      if ((key && normNo_(vals[i][2]) === key) || (email && String(vals[i][0]).trim().toLowerCase() === email)) {
        out.email = String(vals[i][0] || '').trim().toLowerCase() || out.email;
        out.name = vals[i][1] || out.name;
        out.no = vals[i][2] || out.no;
        out.role = normRole_(vals[i][3]);
        out.label = labelFor_(out.role);
        out.status = String(vals[i][4] || '');
        out.lastLogin = vals[i][9] ? String(vals[i][9]) : '';
        break;
      }
    }
  } catch (e) { }
  try {
    var sh2 = getSheet_(SHEET_PERSONEL, PERSONEL_HEADERS);
    var v2 = sh2.getDataRange().getValues();
    var k2 = normNo_(out.no || no);
    for (var j = 1; j < v2.length; j++) {
      if (normNo_(v2[j][0]) === k2) {
        out.pangkat = v2[j][2] || '';
        out.team = v2[j][4] || v2[j][3] || '';
        if (!out.name) out.name = v2[j][1] || '';
        break;
      }
    }
  } catch (e) { }
  try {
    var pen = getPenyeliaFor_(out.no || no);
    if (pen) { out.penyelia = pen.penyelia || ''; if (!out.team) out.team = pen.team || ''; }
  } catch (e) { }
  return { ok: true, data: out };
}

/** v41: tulis status validasi KEKAL ke lajur Status Log_Penugasan + Validasi_Rekod. */
function updateStatusValidasi(data, sess) {
  data = data || {};
  var rowId = String(data.rowId || data.bil || '').trim();
  var status = String(data.status || 'DIVALIDASI').trim().toUpperCase();
  if (!rowId) return { ok: false, error: 'ID rekod (rowId/bil) diperlukan.' };
  var actor = (sess && (sess.name || sess.email || sess.no)) || String(data.by || '');
  var wrote = false;
  try {
    var sh = getSheet_(SHEET_LOG, LOG_HEADERS);
    var vals = sh.getDataRange().getValues();
    for (var i = 1; i < vals.length; i++) {
      if (String(vals[i][0]).trim() === rowId || String(vals[i][1]).trim() === rowId) {
        sh.getRange(i + 1, 17).setValue(sanitize_(status));
        wrote = true;
        break;
      }
    }
  } catch (e) { }
  try {
    var shv = getSheet_(SHEET_VALIDASI, VALIDASI_HEADERS);
    var vv = shv.getDataRange().getValues();
    var found = false;
    for (var k = 1; k < vv.length; k++) {
      if (String(vv[k][0]).trim() === rowId) {
        shv.getRange(k + 1, 2, 1, 3).setValues([[status, sanitize_(actor), new Date()]]);
        found = true; break;
      }
    }
    if (!found) shv.appendRow([sanitize_(rowId), status, sanitize_(actor), new Date()]);
  } catch (e) { }
  auditLog_(sess, 'VALIDASI_REKOD', 'Log Penugasan', rowId, '', status, 'BERJAYA');
  return { ok: true, rowId: rowId, status: status, wroteLog: wrote };
}

/** v41: padam rekod pendaftaran (Pengguna_Akses + Hari Jadi + OTP) untuk ujian semula. */
function resetUserRegistration(data, sess) {
  data = data || {};
  var key = String(data.emailOrNoPersonel || data.no || data.email || '').trim();
  if (!key) return { ok: false, error: 'Sila berikan e-mel atau No. Personel.' };
  var nk = normNo_(key), ek = normEmail_(key);
  var removed = 0;
  try {
    var sh = getSheet_(SHEET_AKSES, AKSES_HEADERS);
    var vals = sh.getDataRange().getValues();
    for (var i = vals.length - 1; i >= 1; i--) {
      if ((nk && normNo_(vals[i][2]) === nk) || (ek && normEmail_(vals[i][0]) === ek)) { sh.deleteRow(i + 1); removed++; }
    }
  } catch (e) { }
  try {
    var sh2 = ensureHariJadi_();
    var v2 = sh2.getDataRange().getValues();
    for (var j = v2.length - 1; j >= 1; j--) {
      if ((ek && normEmail_(v2[j][0]) === ek) || (nk && normNo_(v2[j][2]) === nk)) sh2.deleteRow(j + 1);
    }
  } catch (e) { }
  try { PropertiesService.getScriptProperties().deleteProperty(OTP_PROP_PREFIX + nk); } catch (e) { }
  killSessionsFor_(key, key);
  auditLog_(sess, 'RESET_PENDAFTARAN', 'Pusat Kawalan Akses', key, '', removed + ' rekod dipadam', 'BERJAYA');
  return { ok: true, removed: removed, message: 'Pendaftaran untuk ' + key + ' telah dibersihkan (' + removed + ' rekod).' };
}

/** v45: RESET PENDAFTARAN SATU E-MEL (atau No. Personel) — untuk Admin buka semula pendaftaran.
 *  Padanan e-mel tanpa sensitif huruf besar/kecil + tiada ruang kosong. */
function resetRegistrationByEmail(emailOrNoPersonel, sess) {
  var key = String(emailOrNoPersonel || '').trim();
  if (!key) return { ok: false, error: 'Sila berikan e-mel atau No. Personel.' };
  var r = resetUserRegistration({ emailOrNoPersonel: key }, sess || { email: 'system', name: 'Pentadbir Sistem', no: 'SYSTEM', role: ROLE_SUPER });
  try { freeEmailForReuse_(key, ''); } catch (e) { }
  return r;
}

/** v44: bebas e-mel supaya boleh didaftarkan semula (buang ralat 'emel dah didaftarkan').
 *  Jika e-mel sudah ada pada baris No. Personel LAIN, kosongkan e-mel pada baris lama itu. */
function freeEmailForReuse_(email, keepNo) {
  var em = normEmail_(email);
  if (!em) return;
  var sh = getSheet_(SHEET_AKSES, AKSES_HEADERS);
  var vals = sh.getDataRange().getValues();
  var kn = normNo_(keepNo);
  for (var i = 1; i < vals.length; i++) {
    if (String(vals[i][0] || '').trim().toLowerCase() === em && normNo_(vals[i][2]) !== kn) {
      try { sh.getRange(i + 1, 1).setValue(''); } catch (e) { }
    }
  }
}

/** v44: buang SEMUA sesi log masuk & kod OTP aktif (semua staf wajib log masuk semula). */
function purgeAllSessionsAndOtp_() {
  var n = 0;
  try {
    var props = PropertiesService.getScriptProperties();
    var all = props.getProperties();
    Object.keys(all).forEach(function (k) {
      if (k.indexOf(SESSION_PREFIX) === 0 || k.indexOf(OTP_PROP_PREFIX) === 0 || k.indexOf(OTP_RESET_PREFIX) === 0) {
        props.deleteProperty(k); n++;
      }
    });
  } catch (e) { }
  return n;
}

/** v44: kosongkan SEMUA rekod pendaftaran (Pengguna_Akses + Hari Jadi + Sesi + OTP).
 *  Semua staf (termasuk Admin/Pentadbir Sistem) WAJIB mendaftar akaun semula dari awal. */
function clearAllRegistrations(sess) {
  var removed = 0;
  try {
    var sh = getSheet_(SHEET_AKSES, AKSES_HEADERS);
    var last = sh.getLastRow();
    if (last > 1) { sh.deleteRows(2, last - 1); removed = last - 1; }
  } catch (e) { }
  try {
    var sh2 = ensureHariJadi_();
    var last2 = sh2.getLastRow();
    if (last2 > 1) sh2.deleteRows(2, last2 - 1);
  } catch (e) { }
  var purged = purgeAllSessionsAndOtp_();
  auditLog_(sess, 'CLEAR_PENDAFTARAN', 'Pusat Kawalan Akses', 'SEMUA', '', removed + ' rekod, ' + purged + ' sesi/OTP', 'BERJAYA');
  return { ok: true, removed: removed, purged: purged, message: 'Semua rekod pendaftaran dibersihkan (' + removed + ' rekod, ' + purged + ' sesi/OTP dipadam). Semua staf perlu mendaftar semula.' };
}

/** v44: BERSIHKAN SEMUA DATA PENDAFTARAN — boleh dijalankan terus dari editor Apps Script
 *  (menu CBT Penugasan → Bersihkan Semua Pendaftaran). Untuk ujian pendaftaran semula. */
function clearRegistrationData() {
  var r = clearAllRegistrations({ email: 'system', name: 'Pentadbir Sistem', no: 'SYSTEM', role: ROLE_SUPER });
  try { SpreadsheetApp.getUi().alert('Bersih pendaftaran selesai: ' + r.message); } catch (e) { }
  return r;
}

/** v44: padam pendaftaran bagi SATU e-mel / No. Personel (alias mudah untuk resetUserRegistration). */
function resetRegistration(emailOrNoPersonel) {
  return resetUserRegistration({ emailOrNoPersonel: emailOrNoPersonel }, { email: 'system', name: 'Pentadbir Sistem', no: 'SYSTEM', role: ROLE_SUPER });
}

/** v44: alias untuk clearAllRegistrations — dipanggil dari mana-mana (Pentadbir Sistem / Admin).
 *  Kosongkan SEMUA baris data (kekalkan header) dalam tab 'Pengguna Akses' + 'Hari Jadi',
 *  serta buang semua sesi log masuk & OTP. Semua staf WAJIB mendaftar semula dari awal. */
function clearAllAccessRegistrations(sess) {
  return clearAllRegistrations(sess || { email: 'system', name: 'Pentadbir Sistem', no: 'SYSTEM', role: ROLE_SUPER });
}

/** v41: baca penyelia bagi No. Personel dari tab 'Mapping Penyelia'. */
function getPenyeliaFor_(no) {
  try {
    var sh = getSheet_(SHEET_PENYELIA, PENYELIA_HEADERS);
    var vals = sh.getDataRange().getValues();
    var key = normNo_(no);
    if (!key) return null;
    for (var i = 1; i < vals.length; i++) {
      if (normNo_(vals[i][0]) === key) return { no: vals[i][0], nama: vals[i][1], team: vals[i][2], penyelia: vals[i][3] };
    }
  } catch (e) { }
  return null;
}

/** v41: auto-mapping No. Personel ke tab 'Mapping Penyelia' selepas OTP sah. */
function syncPenyeliaMapping_(no, name, email) {
  try {
    var sh = getSheet_(SHEET_PENYELIA, PENYELIA_HEADERS);
    var vals = sh.getDataRange().getValues();
    var key = normNo_(no);
    if (!key) return;
    var team = '';
    var penyeliaNama = '';
    try {
      var shp = getSheet_(SHEET_PERSONEL, PERSONEL_HEADERS);
      var vp = shp.getDataRange().getValues();
      if (vp && vp.length) {
        var hp = vp[0].map(function (h) { return String(h || '').trim().toLowerCase(); });
        var penyCol = -1;
        for (var c = 0; c < hp.length; c++) { if (hp[c].indexOf('penyelia') >= 0 || hp[c].indexOf('supervisor') >= 0) { penyCol = c; break; } }
        for (var p = 1; p < vp.length; p++) {
          if (normNo_(vp[p][0]) === key) {
            team = vp[p][4] || vp[p][3] || '';
            if (penyCol >= 0) penyeliaNama = vp[p][penyCol] || '';
            break;
          }
        }
      }
    } catch (e) { }
    for (var i = 1; i < vals.length; i++) {
      if (normNo_(vals[i][0]) === key) {
        sh.getRange(i + 1, 2, 1, 5).setValues([[sanitize_(name), sanitize_(team), sanitize_(penyeliaNama || vals[i][3] || ''), sanitize_(email), 'Aktif']]);
        return;
      }
    }
    sh.appendRow([sanitize_(no), sanitize_(name), sanitize_(team), sanitize_(penyeliaNama), sanitize_(email), 'Aktif']);
  } catch (e) { }
}

/* ------------------------------- AUDIT LOG ------------------------------ */
function auditLog_(sess, action, module, target, oldVal, newVal, result) {
  try {
    var sh = getSheet_(SHEET_AUDIT, AUDIT_HEADERS);
    sh.appendRow([
      new Date(),
      sanitize_((sess && (sess.email || sess.no)) || ''),
      sanitize_((sess && sess.name) || ''),
      sanitize_(action), sanitize_(module), sanitize_(target),
      sanitize_(oldVal), sanitize_(newVal), sanitize_(result || 'BERJAYA')
    ]);
  } catch (e) { /* audit tidak boleh menggagalkan operasi utama */ }
}

function getAuditLog(limit) {
  var sh = getSheet_(SHEET_AUDIT, AUDIT_HEADERS);
  var vals = sh.getDataRange().getValues();
  var out = [];
  var lim = Number(limit) > 0 ? Number(limit) : 300;
  for (var i = 1; i < vals.length; i++) {
    if (!vals[i][0] && !vals[i][3]) continue;
    out.push({
      ts: (vals[i][0] instanceof Date) ? Utilities.formatDate(vals[i][0], 'Asia/Kuala_Lumpur', 'yyyy-MM-dd HH:mm:ss') : String(vals[i][0]),
      actor: vals[i][1], actorName: vals[i][2], action: vals[i][3], module: vals[i][4],
      target: vals[i][5], old: vals[i][6], new: vals[i][7], result: vals[i][8]
    });
  }
  return out.slice(-lim).reverse();
}

/* --------------------------- TETAPAN SISTEM ----------------------------- */
function readSetting_(key) {
  try {
    var sh = getSheet_(SHEET_TETAPAN, TETAPAN_HEADERS);
    var vals = sh.getDataRange().getValues();
    for (var i = 1; i < vals.length; i++) if (String(vals[i][0]).trim() === key) return String(vals[i][1] == null ? '' : vals[i][1]);
  } catch (e) { }
  return '';
}

function getSettings() {
  var out = { 'Nama_Paparan': 'Sistem Pengurusan Penugasan CBT', 'Nama_Organisasi': 'Cawangan Bantuan Teknik PPSKK MPDRMKL', 'Tahun_Laporan': 2026, 'Kira_Sabtu_Ahad': 'Ya' };
  try {
    var sh = getSheet_(SHEET_TETAPAN, TETAPAN_HEADERS);
    var vals = sh.getDataRange().getValues();
    for (var i = 1; i < vals.length; i++) {
      var k = String(vals[i][0] || '').trim();
      if (!k || k === 'PERMISSION_MATRIX') continue;
      out[k] = String(vals[i][1] == null ? '' : vals[i][1]);
    }
  } catch (e) { }
  return out;
}

function saveSetting(data, sess) {
  data = data || {};
  var key = String(data.key || '').trim();
  if (!key) return { ok: false, error: 'Kunci tetapan diperlukan.' };
  var val = String(data.value == null ? '' : data.value);
  var sh = getSheet_(SHEET_TETAPAN, TETAPAN_HEADERS);
  var vals = sh.getDataRange().getValues();
  for (var i = 1; i < vals.length; i++) {
    if (String(vals[i][0]).trim() === key) {
      sh.getRange(i + 1, 2, 1, 3).setValues([[sanitize_(val), sanitize_((sess && (sess.email || sess.no)) || ''), new Date()]]);
      auditLog_(sess, 'KEMASKINI_TETAPAN', 'Tetapan', key, String(vals[i][1]), val, 'BERJAYA');
      return { ok: true, key: key, value: val };
    }
  }
  sh.appendRow([sanitize_(key), sanitize_(val), sanitize_((sess && (sess.email || sess.no)) || ''), new Date()]);
  auditLog_(sess, 'KEMASKINI_TETAPAN', 'Tetapan', key, '', val, 'BERJAYA');
  return { ok: true, key: key, value: val };
}

/* ---------------------- SETUP / SELF-HEAL TAB --------------------------- */
function setupSheets() {
  var created = [], migrated = [], adjusted = [];
  var ss = openSS_();
  ensureTab_(ss, SHEET_AKSES, AKSES_HEADERS, [SHEET_AKSES], created, adjusted);
  ensureTab_(ss, SHEET_PERSONEL, PERSONEL_HEADERS, CAND_PERSONEL, created, adjusted);
  ensureTab_(ss, SHEET_HARIJADI, HARIJADI_HEADERS, [SHEET_HARIJADI], created, adjusted);
  ensureTab_(ss, SHEET_LOG, LOG_HEADERS, CAND_LOG, created, adjusted);
  ensureTab_(ss, SHEET_STAGING, STAGING_HEADERS, [SHEET_STAGING], created, adjusted);
  ensureTab_(ss, SHEET_KEPIMPINAN, KEPIMPINAN_HEADERS, CAND_KEPIMPINAN, created, adjusted);
  ensureTab_(ss, SHEET_VALIDASI, VALIDASI_HEADERS, [SHEET_VALIDASI], created, adjusted);
  ensureTab_(ss, SHEET_AUDIT, AUDIT_HEADERS, [SHEET_AUDIT], created, adjusted);
  ensureTab_(ss, SHEET_TETAPAN, TETAPAN_HEADERS, [SHEET_TETAPAN], created, adjusted);
  ensureTab_(ss, SHEET_KELULUSAN, KELULUSAN_HEADERS, [SHEET_KELULUSAN], created, adjusted);
  ensureTab_(ss, SHEET_PENYELIA, PENYELIA_HEADERS, [SHEET_PENYELIA], created, adjusted);
  ensureTab_(ss, SHEET_OTP, OTP_HEADERS, [SHEET_OTP], created, adjusted);
  return { ok: true, created: created, adjusted: adjusted };
}

function ensureTab_(ss, primaryName, headers, candidates, created, adjusted) {
  var sh = null;
  /* Cuba nama kanonik dahulu, kemudian calon fallback. */
  var names = [primaryName].concat(candidates || []);
  for (var i = 0; i < names.length; i++) {
    if (!names[i]) continue;
    var found = ss.getSheetByName(names[i]);
    if (found) { sh = found; break; }
  }
  if (!sh) { sh = ss.insertSheet(primaryName); created.push(primaryName); }
  if (sh.getLastRow() === 0) { sh.appendRow(headers); return sh; }
  if (sh.getLastColumn() < headers.length) {
    sh.getRange(1, 1, 1, headers.length).setValues([headers]);
    adjusted.push(primaryName + ' (+header)');
  }
  return sh;
}

function onOpen() {
  try {
    SpreadsheetApp.getUi().createMenu('CBT Penugasan')
      .addItem('⚙️ Setup / Kemaskini Semua Tab', 'setupSheets')
      .addItem('🔍 Sahkan Versi Backend', 'showVersion_')
      .addItem('🧹 Bersihkan Semua Pendaftaran (Reset)', 'clearRegistrationData')
      .addItem('📧 Reset Pendaftaran Satu E-mel', 'resetRegistrationPrompt_')
      .addItem('⚙️ Tetapkan Sheet ID', 'setSheetIdPrompt_')
      .addItem('🔎 Diagnostik Sheet', 'diagnoseSheetPrompt_')
      .addItem('🩺 Uji Sambungan (Ping)', 'pingPrompt_')
      .addItem('🛠️ Baiki Tarikh Hari Jadi', 'repairHariJadiPrompt_')
      .addItem('🔐 Senarai OTP Aktif', 'otpListPrompt_')
      .addItem('🗑️ Padam OTP Luput', 'otpPurgePrompt_')
      .addToUi();
  } catch (e) { }
}
function showVersion_() {
  try { SpreadsheetApp.getUi().alert('Backend CBT Penugasan: v51 (API v51)'); } catch (e) { }
}
/** v49: papar senarai OTP (aktif/luput/telah digunakan) dari menu Apps Script. */
function otpListPrompt_() {
  try {
    var d = listActiveOtp();
    if (!d.ok) { SpreadsheetApp.getUi().alert('Gagal: ' + (d.error || 'tidak diketahui')); return; }
    var lines = [];
    for (var i = 0; i < d.items.length && i < 20; i++) {
      var it = d.items[i];
      lines.push((i + 1) + '. ' + (it.email || it.no || '-') + ' — ' + it.status + (it.status === 'Aktif' ? (' (baki ' + it.baki + 's)') : ''));
    }
    var msg = 'OTP: ' + d.counts.jumlah + ' jumlah · ' + d.counts.aktif + ' aktif · ' + d.counts.luput + ' luput · ' + d.counts.digunakan + ' telah digunakan\n\n' + (lines.length ? lines.join('\n') : 'Tiada rekod OTP.');
    SpreadsheetApp.getUi().alert(msg);
  } catch (e) { }
}
/** v49: padam OTP luput / telah digunakan dari menu Apps Script. */
function otpPurgePrompt_() {
  try {
    var ui = SpreadsheetApp.getUi();
    var res = ui.alert('Padam OTP Luput', 'Padam SEMUA rekod OTP yang sudah luput atau telah digunakan? (Rekod aktif tidak dipadam)', ui.ButtonSet.YES_NO);
    if (res !== ui.Button.YES) return;
    var out = purgeExpiredOtp({ email: 'system', name: 'Pentadbir Sistem', no: 'SYSTEM', role: ROLE_SUPER });
    ui.alert(out.ok ? out.message : ('Gagal: ' + out.error));
  } catch (e) { }
}
/** v48: papar hasil ping dari menu Apps Script. */
function pingPrompt_() {
  try {
    var p = ping(true);
    var msg = 'Ping: ' + (p.ok ? 'OK' : 'GAGAL') + '\nVersi: ' + p.version + '\nSheet ID: ' + p.spreadsheetId + '\nNama Sheet: ' + (p.sheetName || '-') + '\nSheet boleh dibuka: ' + (p.sheetOk ? 'YA' : ('TIDAK — ' + (p.sheetError || 'tidak diketahui')));
    SpreadsheetApp.getUi().alert(msg);
  } catch (e) { }
}
/** v51: prompt baiki tarikh lahir dalam tab 'Hari Jadi' dari menu Apps Script. */
function repairHariJadiPrompt_() {
  try {
    var ui = SpreadsheetApp.getUi();
    var res = ui.alert('Baiki Tarikh Hari Jadi', 'Tulis semula semua tarikh lahir dalam tab "Hari Jadi" kepada format bersih (YYYY-MM-DD) supaya muncul pada kalendar. Teruskan?', ui.ButtonSet.YES_NO);
    if (res !== ui.Button.YES) return;
    var out = repairHariJadiDates();
    ui.alert('Selesai. ' + out.fixed + ' daripada ' + out.total + ' tarikh dibaiki.');
  } catch (e) { }
}
/** v47: prompt tetapkan Sheet ID dari menu Apps Script. */
function setSheetIdPrompt_() {
  try {
    var ui = SpreadsheetApp.getUi();
    var res = ui.prompt('Tetapkan Sheet ID', 'Masukkan Sheet ID atau URL Google Sheet sasaran:', ui.ButtonSet.OK_CANCEL);
    if (res.getSelectedButton() !== ui.Button.OK) return;
    var out = setSpreadsheetId(res.getResponseText());
    ui.alert(out.ok ? ('Sheet ID ditetapkan: ' + out.id + '\nNama: ' + out.name) : ('Gagal: ' + out.error));
  } catch (e) { }
}
/** v47: papar diagnostik Sheet dari menu Apps Script. */
function diagnoseSheetPrompt_() {
  try {
    var d = diagnoseSheet(true);
    var msg = 'Sheet ID: ' + d.spreadsheetId + '\nSumber: ' + d.source + '\nNama: ' + (d.name || '-') + '\n\nTab (' + d.tabs.length + '): ' + d.tabs.join(', ') + '\n\nTab wajib hilang: ' + (d.missing.length ? d.missing.join(', ') : 'TIADA ✓');
    SpreadsheetApp.getUi().alert(msg);
  } catch (e) { }
}
/** v45: prompt reset pendaftaran satu e-mel dari menu Apps Script. */
function resetRegistrationPrompt_() {
  try {
    var ui = SpreadsheetApp.getUi();
    var res = ui.prompt('Reset Pendaftaran Satu E-mel', 'Masukkan e-mel atau No. Personel:', ui.ButtonSet.OK_CANCEL);
    if (res.getSelectedButton() !== ui.Button.OK) return;
    var out = resetRegistrationByEmail(res.getResponseText(), { email: 'system', name: 'Pentadbir Sistem', no: 'SYSTEM', role: ROLE_SUPER });
    ui.alert(out && out.message ? out.message : 'Selesai.');
  } catch (e) { }
}

/* ------------------------------ UTILITI --------------------------------- */
function openSS_() {
  var id = getSpreadsheetId();
  return id ? SpreadsheetApp.openById(id) : SpreadsheetApp.getActiveSpreadsheet();
}

/** Ambil tab (cipta + header jika tiada). Guna calon nama untuk keserasian. */
function getSheet_(name, headers) {
  var ss = openSS_();
  var sh = ss.getSheetByName(name);
  if (!sh) {
    /* Cuba calon alternatif sebelum mencipta. */
    var cands = [];
    if (name === SHEET_LOG) cands = CAND_LOG;
    else if (name === SHEET_KEPIMPINAN) cands = CAND_KEPIMPINAN;
    else if (name === SHEET_PERSONEL) cands = CAND_PERSONEL;
    for (var i = 0; i < cands.length; i++) {
      if (cands[i] === name) continue;
      var alt = ss.getSheetByName(cands[i]);
      if (alt) { sh = alt; break; }
    }
  }
  if (!sh) {
    sh = ss.insertSheet(name);
    if (headers && headers.length) sh.appendRow(headers);
  } else if (headers && headers.length) {
    if (sh.getLastRow() === 0) sh.appendRow(headers);
    else if (sh.getLastColumn() < headers.length) sh.getRange(1, 1, 1, headers.length).setValues([headers]);
  }
  return sh;
}

function sha256Hex_(str) {
  var raw = Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, String(str), Utilities.Charset.UTF_8);
  var hex = '';
  for (var i = 0; i < raw.length; i++) { var b = (raw[i] + 256) % 256; hex += (b < 16 ? '0' : '') + b.toString(16); }
  return hex;
}

function isGmail_(email) { return /^[^@\s]+@(gmail|googlemail)\.com$/i.test(String(email || '').trim()); }
function normNo_(v) { return String(v == null ? '' : v).replace(/\s+/g, '').toUpperCase(); }
/** v45: normalisasi e-mel (trim + lowercase) — padanan e-mel TIDAK sensitif huruf besar/kecil. */
function normEmail_(v) { return String(v == null ? '' : v).trim().toLowerCase(); }

function isIsoDate_(s) {
  s = String(s || '').trim();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(s)) return false;
  var p = s.split('-').map(Number), y = p[0], m = p[1], d = p[2];
  if (y < 1900 || y > 2100 || m < 1 || m > 12 || d < 1 || d > 31) return false;
  var dt = new Date(Date.UTC(y, m - 1, d));
  return dt.getUTCFullYear() === y && dt.getUTCMonth() === m - 1 && dt.getUTCDate() === d;
}

function sanitize_(v) {
  var s = String(v == null ? '' : v);
  if (/^[=\+\-@]/.test(s)) return "'" + s;
  return s;
}

function json_(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON);
}