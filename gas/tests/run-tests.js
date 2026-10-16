/* Ujian v104 — keahlian, Kod Matrik, devOtp, peranan.
   Logik Code.gs diuji SEBENAR; hanya lapisan Google (SpreadsheetApp/MailApp/
   PropertiesService) yang dipalsukan. Jalankan: node gas/tests/run-tests.js */
'use strict';
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const CODE = fs.readFileSync(process.env.CODE_GS || path.join(__dirname, '..', 'Code.gs'), 'utf8');

let fails = 0, passes = 0;
function ok(cond, label, extra) {
  if (cond) { passes++; console.log('  \u2705 ' + label); }
  else { fails++; console.log('  \u274c ' + label + (extra ? '\n       ' + extra : '')); }
}

/* ---------- Palsu lapisan Google ---------- */
function makeSheet(rows) {
  const data = rows.map(r => r.slice());
  return {
    _d: data,
    getName: () => 'sheet',
    getLastRow: () => data.length,
    getLastColumn: () => Math.max.apply(null, data.map(r => r.length).concat([0])),
    getDataRange: () => ({ getValues: () => data.map(r => r.slice()) }),
    appendRow: r => { data.push(r.slice()); },
    getRange: (r, c, nr, nc) => ({
      setValue: v => { while (data.length < r) data.push([]); data[r - 1][c - 1] = v; },
      setValues: vs => { vs.forEach((row, i) => { while (data.length < r + i) data.push([]); row.forEach((v, j) => { data[r - 1 + i][c - 1 + j] = v; }); }); },
      getValues: () => data.slice(r - 1, r - 1 + (nr || 1)).map(x => x.slice(c - 1, c - 1 + (nc || 1)))
    }),
    deleteRow: i => { data.splice(i - 1, 1); }
  };
}

function makeEnv(tabs) {
  const sheets = {};
  Object.keys(tabs).forEach(k => { sheets[k] = makeSheet(tabs[k]); });
  const props = {};
  const sent = [];

  const SpreadsheetApp = {
    openById: () => ({
      getName: () => 'Laporan Penugasan',
      getUrl: () => 'https://docs.google.com/spreadsheets/d/FAKE/edit',
      getSheets: () => Object.keys(sheets).map(k => sheets[k]),
      getSheetByName: n => sheets[n] || null,
      insertSheet: n => { sheets[n] = makeSheet([]); return sheets[n]; }
    }),
    getActiveSpreadsheet: () => SpreadsheetApp.openById(),
    getUi: () => ({ alert: () => {}, ButtonSet: { YES: 'YES', NO: 'NO' }, Button: { YES: 'YES' } })
  };
  const MailApp = { sendEmail: o => { sent.push(o); } };
  const PropertiesService = {
    getScriptProperties: () => ({
      getProperty: k => (k in props ? props[k] : null),
      setProperty: (k, v) => { props[k] = v; },
      deleteProperty: k => { delete props[k]; }
    })
  };
  const LockService = { getScriptLock: () => ({ waitLock: () => {}, releaseLock: () => {} }) };
  const Utilities = {
    formatDate: d => new Date(d).toISOString().slice(0, 10),
    DigestAlgorithm: { SHA_256: 'SHA_256' },
    computeDigest: () => [1, 2, 3],
    base64Encode: () => 'x'
  };
  const CacheService = { getScriptCache: () => ({ get: () => null, put: () => {}, remove: () => {} }) };
  const ContentService = {
    MimeType: { JSON: 'application/json' },
    createTextOutput: t => ({ _text: t, setMimeType: function () { return this; } })
  };

  const ctx = {
    SpreadsheetApp, MailApp, PropertiesService, LockService, Utilities, CacheService, ContentService,
    console, Date, Math, JSON, String, Number, Object, Array, RegExp, Error, isNaN, parseInt, parseFloat,
    ScriptApp: { getService: () => ({ getUrl: () => 'https://script.google.com/exec' }) },
    Session: { getActiveUser: () => ({ getEmail: () => 'owner@example.com' }) },
    Logger: { log: () => {} }
  };
  vm.createContext(ctx);
  vm.runInContext(CODE, ctx, { filename: 'Code.gs' });
  ctx.__sheets = sheets;
  ctx.__props = props;
  ctx.__sent = sent;
  return ctx;
}

/* respons doPost -> objek (json_ menggunakan ContentService) */
function post(env, body) {
  const res = env.doPost({ postData: { contents: JSON.stringify(body) } });
  const txt = res && res._text !== undefined ? res._text : String(res);
  try { return JSON.parse(txt); } catch (e) { return { __raw: txt }; }
}

const PERSONEL_HEADERS = ['Bil', 'Pangkat', 'Nama', 'No Personel', 'Team', 'Status', 'E-mel', 'Peranan'];
const AKSES_HEADERS = ['E-mel', 'Nama', 'No Personel', 'Peranan', 'Status', 'Tarikh Daftar', 'Hash', 'Salt', 'Tarikh Lahir', 'Log Masuk Terakhir'];
const OTP_HEADERS = ['E-mel', 'No Personel', 'Kod', 'Jenis', 'Masa Luput', 'Status', 'Cubaan', 'Cap Masa', 'Nama', 'Hash', 'Salt', 'Peranan', 'Tarikh Lahir'];

function baseTabs(personelRows, aksesRows) {
  return {
    'Master Personel': [PERSONEL_HEADERS].concat(personelRows || []),
    'Pengguna_Akses': [AKSES_HEADERS].concat(aksesRows || []),
    'OTP_Requests': [OTP_HEADERS],
    'Hari Jadi': [['Nama', 'No Personel', 'Tarikh Lahir', 'Cap Masa']],
    'Log_Penugasan': [['Cap Masa', 'Nama', 'No Personel', 'Tugasan']]
  };
}

const KPL = [1, 'KPL', 'ALI BIN ABU', 'R3200265', 'TEAM A', 'Aktif', 'ali@gmail.com', 'STAF'];
const SU = [2, 'SUPT', 'SITI BINTI OMAR', 'R3100001', 'TEAM B', 'Aktif', 'siti@gmail.com', 'SUPER_ADMIN'];

console.log('\n=== 1. KEAHLIAN: nombor tiada dalam Master Personel ===');
{
  const env = makeEnv(baseTabs([KPL], []));
  const r = env.registerUser({ email: 'luar@gmail.com', no: 'PALSU-123', name: 'ORANG LUAR', passHash: 'h', salt: 's', birthDate: '1990-05-05' });
  ok(r.ok === false, 'pendaftaran DITOLAK', JSON.stringify(r));
  ok(/tidak dijumpai dalam daftar warga/.test(String(r.error)), 'mesej rujuk daftar warga', String(r.error));
  ok(env.__sent.length === 0, 'tiada e-mel OTP dihantar');
  ok(env.__sheets['OTP_Requests']._d.length === 1, 'tiada baris OTP dicipta');
}

console.log('\n=== 2. KEAHLIAN: nombor wujud diterima, peranan dari Sheet ===');
{
  const env = makeEnv(baseTabs([KPL], []));
  const r = env.registerUser({ email: 'ali@gmail.com', no: 'R3200265', name: 'ALI BIN ABU', passHash: 'h', salt: 's', birthDate: '1990-05-05' });
  ok(r.ok === true, 'pendaftaran DITERIMA', JSON.stringify(r));
  ok(env.__sent.length === 1, 'satu e-mel OTP dihantar');
  ok(r.devOtp === undefined, 'devOtp TIADA dalam respons', JSON.stringify(Object.keys(r)));
}

console.log('\n=== 3. devOtp: tidak pernah dipulangkan ===');
{
  const env = makeEnv(baseTabs([KPL], []));
  const r = env.registerUser({ email: 'ali@gmail.com', no: 'R3200265', name: 'ALI', passHash: 'h', salt: 's', birthDate: '1990-05-05' });
  ok(!/devOtp/i.test(Object.keys(r).join(',')), 'tiada kunci devOtp', Object.keys(r).join(','));
  const mail = env.__sent[0] || {};
  ok(/Kod Pengesahan OTP anda: \d{6}/.test(String(mail.body)), 'kod hanya dalam e-mel', String(mail.body).slice(0, 200));
}

console.log('\n=== 4. PERANAN: klien tidak boleh naik taraf diri ===');
{
  const env = makeEnv(baseTabs([KPL], []));
  const r = env.registerUser({ email: 'ali@gmail.com', no: 'R3200265', name: 'ALI', passHash: 'h', salt: 's', birthDate: '1990-05-05', role: 'SUPER_ADMIN', label: 'Super Admin' });
  ok(r.ok === true, 'pendaftaran diterima', JSON.stringify(r));
  let bocor = '';
  Object.keys(env.__props).forEach(k => { if (/SUPER_ADMIN/.test(env.__props[k])) bocor = k; });
  ok(bocor === '', 'role SUPER_ADMIN dari klien TIDAK disimpan', 'bocor di: ' + bocor);
}

console.log('\n=== 5. KOD MATRIK: mesti padan dengan rekod sedia ada ===');
{
  const akses = [['ali@gmail.com', 'ALI BIN ABU', 'R3200265', 'STAF', 'Aktif', '2026-01-01', 'oldhash', 'oldsalt', '1990-05-05', '']];
  const env = makeEnv(baseTabs([KPL], akses));

  const salah = env.registerUser({ email: 'ali@gmail.com', no: 'R3200265', name: 'ALI', passHash: 'NEWHASH', salt: 's', birthDate: '1999-12-31' });
  ok(salah.ok === false, 'tarikh lahir SALAH ditolak', JSON.stringify(salah));
  ok(/tidak padan/.test(String(salah.error)), 'mesej sebut tidak padan', String(salah.error));
  ok(env.__sent.length === 0, 'tiada OTP dihantar untuk cubaan salah');

  const betul = env.registerUser({ email: 'ali@gmail.com', no: 'R3200265', name: 'ALI', passHash: 'NEWHASH', salt: 's', birthDate: '1990-05-05' });
  ok(betul.ok === true, 'tarikh lahir BETUL diterima', JSON.stringify(betul));
}

console.log('\n=== 6. KOD MATRIK: akaun baharu tiada tarikh = tiada sekatan ===');
{
  const env = makeEnv(baseTabs([KPL], []));
  const r = env.registerUser({ email: 'ali@gmail.com', no: 'R3200265', name: 'ALI', passHash: 'h', salt: 's', birthDate: '1990-05-05' });
  ok(r.ok === true, 'pendaftaran pertama diterima', JSON.stringify(r));
}

console.log('\n=== 7. KOD MATRIK: kosong ditolak bila akaun wujud ===');
{
  const akses = [['ali@gmail.com', 'ALI', 'R3200265', 'STAF', 'Aktif', '', 'h', 's', '1990-05-05', '']];
  const env = makeEnv(baseTabs([KPL], akses));
  const r = env.registerUser({ email: 'ali@gmail.com', no: 'R3200265', name: 'ALI', passHash: 'h', salt: 's', birthDate: '' });
  ok(r.ok === false, 'tarikh lahir KOSONG ditolak untuk akaun sedia ada', JSON.stringify(r));
}

console.log('\n=== 8. KOD MATRIK: banding MM-DD (tahun diabaikan) ===');
{
  const akses = [['ali@gmail.com', 'ALI', 'R3200265', 'STAF', 'Aktif', '', 'h', 's', '05-05', '']];
  const env = makeEnv(baseTabs([KPL], akses));
  const r = env.registerUser({ email: 'ali@gmail.com', no: 'R3200265', name: 'ALI', passHash: 'h', salt: 's', birthDate: '1985-05-05' });
  ok(r.ok === true, 'MM-DD padan walau tahun berbeza (ikut reka bentuk)', JSON.stringify(r));
}

console.log('\n=== 9. SUSUNAN: pemohon ditolak TIDAK mengubah e-mel orang lain ===');
{
  const akses = [['siti@gmail.com', 'SITI', 'R3100001', 'SUPER_ADMIN', 'Aktif', '', 'h', 's', '1980-01-01', '']];
  const env = makeEnv(baseTabs([KPL], akses));
  const r = env.registerUser({ email: 'siti@gmail.com', no: 'PALSU-999', name: 'PENYERANG', passHash: 'x', salt: 's', birthDate: '1990-01-01' });
  ok(r.ok === false, 'pendaftaran ditolak', JSON.stringify(r));
  ok(env.__sheets['Pengguna_Akses']._d[1][0] === 'siti@gmail.com', 'e-mel SITI masih utuh', 'nilai: "' + env.__sheets['Pengguna_Akses']._d[1][0] + '"');
}

console.log('\n=== 10. Sesi orang lain tidak diputuskan bila pemohon ditolak ===');
{
  const env = makeEnv(baseTabs([KPL], []));
  env.__props['SESS_abc123'] = JSON.stringify({ email: 'siti@gmail.com', no: 'R3100001' });
  const r = env.registerUser({ email: 'x@gmail.com', no: 'PALSU-999', name: 'X', passHash: 'x', salt: 's', birthDate: '1990-01-01' });
  ok(r.ok === false, 'pendaftaran ditolak', JSON.stringify(r));
  ok(!!env.__props['SESS_abc123'], 'sesi sedia ada tidak diputuskan');
}

console.log('\n=== 11. Peranan dari Sheet (SUPER_ADMIN kekal) ===');
{
  const env = makeEnv(baseTabs([KPL, SU], []));
  const r = env.registerUser({ email: 'siti@gmail.com', no: 'R3100001', name: 'SITI', passHash: 'h', salt: 's', birthDate: '1980-01-01' });
  ok(r.ok === true, 'SUPER_ADMIN boleh daftar', JSON.stringify(r));
  let found = false;
  Object.keys(env.__props).forEach(k => { if (/SUPER_ADMIN/.test(env.__props[k])) found = true; });
  ok(found, 'peranan SUPER_ADMIN diambil dari Sheet');
}

console.log('\n=== 12. Peranan kosong dalam Sheet = STAF (staf sah tidak tersekat) ===');
{
  const kosong = [3, 'KPL', 'TANPA PERANAN', 'R3999999', 'TEAM C', 'Aktif', 'tp@gmail.com', ''];
  const env = makeEnv(baseTabs([kosong], []));
  const r = env.registerUser({ email: 'tp@gmail.com', no: 'R3999999', name: 'TANPA PERANAN', passHash: 'h', salt: 's', birthDate: '1990-01-01' });
  ok(r.ok === true, 'rekod ada + peranan kosong = diterima', JSON.stringify(r));
}

console.log('\n=== 13. Pengawal sesi pada tindakan sensitif ===');
{
  const env = makeEnv(baseTabs([KPL], []));
  ['getProfileDates', 'getProfileDatesToday', 'getProfileDatesRange', 'getLeadershipData', 'setupSheets'].forEach(a => {
    const r = post(env, { action: a });
    const body = JSON.stringify(r);
    ok(r.ok === false || /sesi|tidak sah|tamat/i.test(body), a + ' ditolak tanpa sesi', body.slice(0, 130));
  });
}

console.log('\n=== 14. ping: tiada spreadsheetId untuk pemanggil tanpa sesi ===');
{
  const env = makeEnv(baseTabs([KPL], []));
  ok(env.ping().spreadsheetId === undefined, 'ping() tiada spreadsheetId', JSON.stringify(env.ping()));
  ok(typeof env.ping(true).spreadsheetId === 'string', 'ping(true) pulangkan ID (menu admin)');
}

console.log('\n=== 15. diagnoseSheet: ID hanya untuk pentadbir ===');
{
  const env = makeEnv(baseTabs([KPL], []));
  ok(env.diagnoseSheet().spreadsheetId === undefined, 'diagnoseSheet() tiada ID');
  ok(typeof env.diagnoseSheet(true).spreadsheetId === 'string', 'diagnoseSheet(true) ada ID');
}

console.log('\n=== 16. Register semula: e-mel sama dibebaskan dari No. Personel LAMA ===');
{
  const SU2 = [3, 'KPL', 'ABU BIN ALI', 'R3100001', 'TEAM C', 'Aktif', 'ali@gmail.com', 'STAF'];
  /* E-mel 'ali@gmail.com' masih terikat pada No. Personel LAMA 'R3200265'. */
  const akses = [['ali@gmail.com', 'ALI', 'R3200265', 'STAF', 'Aktif', '', 'h', 's', '1990-05-05', '']];
  const env = makeEnv(baseTabs([KPL, SU2], akses));
  const r = env.registerUser({ email: 'ali@gmail.com', no: 'R3100001', name: 'ABU', passHash: 'h2', salt: 's', birthDate: '1990-05-05' });
  ok(r.ok === true, 'daftar guna e-mel yang terikat No. lain diterima', JSON.stringify(r));
  ok(env.__sheets['Pengguna_Akses']._d[1][0] === '', 'e-mel lama pada No. Personel LAIN dibebaskan', 'nilai: "' + env.__sheets['Pengguna_Akses']._d[1][0] + '"');
}

console.log('\n=== 17. REKA BENTUK: staf belum daftar beri e-mel sendiri ===');
{
  const akses = []; /* SITI belum mendaftar — tiada baris dalam Pengguna_Akses */
  const env = makeEnv(baseTabs([KPL, SU], akses));
  const r = env.registerUser({ email: 'siti@gmail.com', no: 'R3100001', name: 'SITI', passHash: 'h', salt: 's', birthDate: '1980-01-01' });
  ok(r.ok === true, 'staf belum daftar BOLEH daftar dengan e-mel sendiri', JSON.stringify(r));
  ok(r.devOtp === undefined, 'devOtp tetap tiada', JSON.stringify(Object.keys(r)));
}

console.log('\n=== 18. KOD MATRIK kekal jadi pagar selepas pendaftaran pertama ===');
{
  /* Pendaftaran pertama meletakkan tarikh lahir; cubaan kedua mesti padan. */
  const env = makeEnv(baseTabs([SU], []));
  const first = env.registerUser({ email: 'siti@gmail.com', no: 'R3100001', name: 'SITI', passHash: 'h', salt: 's', birthDate: '1980-01-01' });
  ok(first.ok === true, 'pendaftaran pertama diterima', JSON.stringify(first));
  /* Tiru verifyOTP menulis baris Pengguna_Akses. */
  env.writeAccessUser_({ email: 'siti@gmail.com', no: 'R3100001', name: 'SITI', role: 'SUPER_ADMIN', hash: 'h', salt: 's', birthDate: '1980-01-01' });
  const serang = env.registerUser({ email: 'penyerang@gmail.com', no: 'R3100001', name: 'SITI', passHash: 'jahat', salt: 's', birthDate: '1999-09-09' });
  ok(serang.ok === false, 'cubaan kedua dengan Kod Matrik salah DITOLAK', JSON.stringify(serang));
  ok(/tidak padan/.test(String(serang.error)), 'mesej sebut tidak padan', String(serang.error));
}

console.log('\n=== 19. v105: fetchLogCounts_ TIDAK kira penugasan tarikh MASA HADAPAN ===');
{
  /* Tarikh relatif kepada HARI INI supaya ujian tidak bergantung pada tarikh sebenar. */
  const ymd = n => new Date(Date.now() + n * 86400000).toISOString().slice(0, 10);
  /* Baris format BAHARU (lajur: Bil, ID, Tarikh Mula, Tarikh Tamat, Tajuk, ...) */
  function logRow(bil, id, tarikhMula, jenis) {
    const r = new Array(22).fill('');
    r[0] = bil; r[1] = id; r[2] = tarikhMula; r[3] = tarikhMula; r[4] = 'TAJUK ' + bil;
    r[12] = jenis;
    return r;
  }
  const env = makeEnv(baseTabs([KPL], []));
  env.__sheets['Log_Penugasan'] = makeSheet([
    logRow(1, 'USR-1', ymd(-10), 'MAJLIS'),   /* lampau -> KPI */
    logRow(2, 'USR-2', ymd(-3), 'MAJLIS'),    /* lampau -> KPI */
    logRow(3, 'USR-3', ymd(20), 'MAJLIS'),    /* MASA HADAPAN -> bukan KPI */
    logRow(4, 'USR-4', ymd(45), 'KURSUS')     /* MASA HADAPAN -> bukan KPI */
  ]);
  const r = env.fetchLogCounts_('2000-01-01');
  ok(r.all === 4, 'all = 4 (semua rekod)', JSON.stringify(r));
  ok(r.inPeriod === 2, 'inPeriod = 2 (masa hadapan DIKECUALI)', 'inPeriod=' + r.inPeriod);
  ok(r.future === 2, 'future = 2', 'future=' + r.future);
  ok(r.jenis && r.jenis['MAJLIS'] === 2, 'jenis hanya kira rekod lampau', JSON.stringify(r.jenis));
  ok(r.jenis && r.jenis['KURSUS'] === undefined, 'jenis TIDAK ada KURSUS (rekod hadapan)', JSON.stringify(r.jenis));
}

console.log('\n=== 20. v105: rekod masa hadapan tidak pernah masuk inPeriod (semua hadapan) ===');
{
  const ymd = n => new Date(Date.now() + n * 86400000).toISOString().slice(0, 10);
  function logRow(bil, id, tarikhMula) {
    const r = new Array(22).fill('');
    r[0] = bil; r[1] = id; r[2] = tarikhMula; r[3] = tarikhMula; r[4] = 'TAJUK';
    r[12] = 'MAJLIS';
    return r;
  }
  const env = makeEnv(baseTabs([KPL], []));
  env.__sheets['Log_Penugasan'] = makeSheet([logRow(1, 'USR-1', ymd(30)), logRow(2, 'USR-2', ymd(60))]);
  const r = env.fetchLogCounts_('2000-01-01');
  ok(r.all === 2 && r.inPeriod === 0 && r.future === 2, 'semua hadapan -> inPeriod 0, future 2', JSON.stringify(r));
}

console.log('\n=== 21. v105: tarikh HARI INI masih dikira (sempadan) ===');
{
  const ymd = n => new Date(Date.now() + n * 86400000).toISOString().slice(0, 10);
  function logRow(bil, id, tarikhMula) {
    const r = new Array(22).fill('');
    r[0] = bil; r[1] = id; r[2] = tarikhMula; r[3] = tarikhMula; r[4] = 'TAJUK';
    r[12] = 'MAJLIS';
    return r;
  }
  const env = makeEnv(baseTabs([KPL], []));
  env.__sheets['Log_Penugasan'] = makeSheet([logRow(1, 'USR-1', ymd(0)), logRow(2, 'USR-2', ymd(1))]);
  const r = env.fetchLogCounts_('2000-01-01');
  ok(r.inPeriod === 1, 'hari ini DIKIRA', 'inPeriod=' + r.inPeriod);
  ok(r.future === 1, 'esok TIDAK dikira', 'future=' + r.future);
}

console.log('\n========================================');
console.log('  LULUS: ' + passes + '   GAGAL: ' + fails);
console.log('========================================\n');
process.exit(fails ? 1 : 0);
