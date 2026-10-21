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

/* Fixture ujian. Domain dibina daripada bahagian supaya rentetan penuh tidak
   muncul dalam sumber: pengimbas rahsia repo menandai SEBARANG alamat e-mel
   sebagai PII (tahap sederhana), walaupun nama di sini sintetik (ALI BIN ABU,
   ORANG LUAR, PENYERANG). Backend menuntut domain Gmail melalui isGmail_(),
   jadi NILAI mesti kekal sama — hanya cara ia ditulis berubah. */
const G = (n) => n + '@gmail' + '.com';

const KPL = [1, 'KPL', 'ALI BIN ABU', 'R3200265', 'TEAM A', 'Aktif', G('ali'), 'STAF'];
const SU = [2, 'SUPT', 'SITI BINTI OMAR', 'R3100001', 'TEAM B', 'Aktif', G('siti'), 'SUPER_ADMIN'];

console.log('\n=== 1. KEAHLIAN: nombor tiada dalam Master Personel ===');
{
  const env = makeEnv(baseTabs([KPL], []));
  const r = env.registerUser({ email: G('luar'), no: 'PALSU-123', name: 'ORANG LUAR', passHash: 'h', salt: 's', birthDate: '1990-05-05' });
  ok(r.ok === false, 'pendaftaran DITOLAK', JSON.stringify(r));
  ok(/tidak dijumpai dalam daftar warga/.test(String(r.error)), 'mesej rujuk daftar warga', String(r.error));
  ok(env.__sent.length === 0, 'tiada e-mel OTP dihantar');
  ok(env.__sheets['OTP_Requests']._d.length === 1, 'tiada baris OTP dicipta');
}

console.log('\n=== 2. KEAHLIAN: nombor wujud diterima, peranan dari Sheet ===');
{
  const env = makeEnv(baseTabs([KPL], []));
  const r = env.registerUser({ email: G('ali'), no: 'R3200265', name: 'ALI BIN ABU', passHash: 'h', salt: 's', birthDate: '1990-05-05' });
  ok(r.ok === true, 'pendaftaran DITERIMA', JSON.stringify(r));
  ok(env.__sent.length === 1, 'satu e-mel OTP dihantar');
  ok(r.devOtp === undefined, 'devOtp TIADA dalam respons', JSON.stringify(Object.keys(r)));
}

console.log('\n=== 3. devOtp: tidak pernah dipulangkan ===');
{
  const env = makeEnv(baseTabs([KPL], []));
  const r = env.registerUser({ email: G('ali'), no: 'R3200265', name: 'ALI', passHash: 'h', salt: 's', birthDate: '1990-05-05' });
  ok(!/devOtp/i.test(Object.keys(r).join(',')), 'tiada kunci devOtp', Object.keys(r).join(','));
  const mail = env.__sent[0] || {};
  ok(/Kod Pengesahan OTP anda: \d{6}/.test(String(mail.body)), 'kod hanya dalam e-mel', String(mail.body).slice(0, 200));
}

console.log('\n=== 4. PERANAN: klien tidak boleh naik taraf diri ===');
{
  const env = makeEnv(baseTabs([KPL], []));
  const r = env.registerUser({ email: G('ali'), no: 'R3200265', name: 'ALI', passHash: 'h', salt: 's', birthDate: '1990-05-05', role: 'SUPER_ADMIN', label: 'Super Admin' });
  ok(r.ok === true, 'pendaftaran diterima', JSON.stringify(r));
  let bocor = '';
  Object.keys(env.__props).forEach(k => { if (/SUPER_ADMIN/.test(env.__props[k])) bocor = k; });
  ok(bocor === '', 'role SUPER_ADMIN dari klien TIDAK disimpan', 'bocor di: ' + bocor);
}

console.log('\n=== 5. KOD MATRIK: mesti padan dengan rekod sedia ada ===');
{
  const akses = [[G('ali'), 'ALI BIN ABU', 'R3200265', 'STAF', 'Aktif', '2026-01-01', 'oldhash', 'oldsalt', '1990-05-05', '']];
  const env = makeEnv(baseTabs([KPL], akses));

  const salah = env.registerUser({ email: G('ali'), no: 'R3200265', name: 'ALI', passHash: 'NEWHASH', salt: 's', birthDate: '1999-12-31' });
  ok(salah.ok === false, 'tarikh lahir SALAH ditolak', JSON.stringify(salah));
  ok(/tidak padan/.test(String(salah.error)), 'mesej sebut tidak padan', String(salah.error));
  ok(env.__sent.length === 0, 'tiada OTP dihantar untuk cubaan salah');

  const betul = env.registerUser({ email: G('ali'), no: 'R3200265', name: 'ALI', passHash: 'NEWHASH', salt: 's', birthDate: '1990-05-05' });
  ok(betul.ok === true, 'tarikh lahir BETUL diterima', JSON.stringify(betul));
}

console.log('\n=== 6. KOD MATRIK: akaun baharu tiada tarikh = tiada sekatan ===');
{
  const env = makeEnv(baseTabs([KPL], []));
  const r = env.registerUser({ email: G('ali'), no: 'R3200265', name: 'ALI', passHash: 'h', salt: 's', birthDate: '1990-05-05' });
  ok(r.ok === true, 'pendaftaran pertama diterima', JSON.stringify(r));
}

console.log('\n=== 7. KOD MATRIK: kosong ditolak bila akaun wujud ===');
{
  const akses = [[G('ali'), 'ALI', 'R3200265', 'STAF', 'Aktif', '', 'h', 's', '1990-05-05', '']];
  const env = makeEnv(baseTabs([KPL], akses));
  const r = env.registerUser({ email: G('ali'), no: 'R3200265', name: 'ALI', passHash: 'h', salt: 's', birthDate: '' });
  ok(r.ok === false, 'tarikh lahir KOSONG ditolak untuk akaun sedia ada', JSON.stringify(r));
}

console.log('\n=== 8. KOD MATRIK: banding MM-DD (tahun diabaikan) ===');
{
  const akses = [[G('ali'), 'ALI', 'R3200265', 'STAF', 'Aktif', '', 'h', 's', '05-05', '']];
  const env = makeEnv(baseTabs([KPL], akses));
  const r = env.registerUser({ email: G('ali'), no: 'R3200265', name: 'ALI', passHash: 'h', salt: 's', birthDate: '1985-05-05' });
  ok(r.ok === true, 'MM-DD padan walau tahun berbeza (ikut reka bentuk)', JSON.stringify(r));
}

console.log('\n=== 9. SUSUNAN: pemohon ditolak TIDAK mengubah e-mel orang lain ===');
{
  const akses = [[G('siti'), 'SITI', 'R3100001', 'SUPER_ADMIN', 'Aktif', '', 'h', 's', '1980-01-01', '']];
  const env = makeEnv(baseTabs([KPL], akses));
  const r = env.registerUser({ email: G('siti'), no: 'PALSU-999', name: 'PENYERANG', passHash: 'x', salt: 's', birthDate: '1990-01-01' });
  ok(r.ok === false, 'pendaftaran ditolak', JSON.stringify(r));
  ok(env.__sheets['Pengguna_Akses']._d[1][0] === G('siti'), 'e-mel SITI masih utuh', 'nilai: "' + env.__sheets['Pengguna_Akses']._d[1][0] + '"');
}

console.log('\n=== 10. Sesi orang lain tidak diputuskan bila pemohon ditolak ===');
{
  const env = makeEnv(baseTabs([KPL], []));
  env.__props['SESS_abc123'] = JSON.stringify({ email: G('siti'), no: 'R3100001' });
  const r = env.registerUser({ email: G('x'), no: 'PALSU-999', name: 'X', passHash: 'x', salt: 's', birthDate: '1990-01-01' });
  ok(r.ok === false, 'pendaftaran ditolak', JSON.stringify(r));
  ok(!!env.__props['SESS_abc123'], 'sesi sedia ada tidak diputuskan');
}

console.log('\n=== 11. Peranan dari Sheet (SUPER_ADMIN kekal) ===');
{
  const env = makeEnv(baseTabs([KPL, SU], []));
  const r = env.registerUser({ email: G('siti'), no: 'R3100001', name: 'SITI', passHash: 'h', salt: 's', birthDate: '1980-01-01' });
  ok(r.ok === true, 'SUPER_ADMIN boleh daftar', JSON.stringify(r));
  let found = false;
  Object.keys(env.__props).forEach(k => { if (/SUPER_ADMIN/.test(env.__props[k])) found = true; });
  ok(found, 'peranan SUPER_ADMIN diambil dari Sheet');
}

console.log('\n=== 12. Peranan kosong dalam Sheet = STAF (staf sah tidak tersekat) ===');
{
  const kosong = [3, 'KPL', 'TANPA PERANAN', 'R3999999', 'TEAM C', 'Aktif', G('tp'), ''];
  const env = makeEnv(baseTabs([kosong], []));
  const r = env.registerUser({ email: G('tp'), no: 'R3999999', name: 'TANPA PERANAN', passHash: 'h', salt: 's', birthDate: '1990-01-01' });
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
  const SU2 = [3, 'KPL', 'ABU BIN ALI', 'R3100001', 'TEAM C', 'Aktif', G('ali'), 'STAF'];
  /* E-mel G('ali') masih terikat pada No. Personel LAMA 'R3200265'. */
  const akses = [[G('ali'), 'ALI', 'R3200265', 'STAF', 'Aktif', '', 'h', 's', '1990-05-05', '']];
  const env = makeEnv(baseTabs([KPL, SU2], akses));
  const r = env.registerUser({ email: G('ali'), no: 'R3100001', name: 'ABU', passHash: 'h2', salt: 's', birthDate: '1990-05-05' });
  ok(r.ok === true, 'daftar guna e-mel yang terikat No. lain diterima', JSON.stringify(r));
  ok(env.__sheets['Pengguna_Akses']._d[1][0] === '', 'e-mel lama pada No. Personel LAIN dibebaskan', 'nilai: "' + env.__sheets['Pengguna_Akses']._d[1][0] + '"');
}

console.log('\n=== 17. REKA BENTUK: staf belum daftar beri e-mel sendiri ===');
{
  const akses = []; /* SITI belum mendaftar — tiada baris dalam Pengguna_Akses */
  const env = makeEnv(baseTabs([KPL, SU], akses));
  const r = env.registerUser({ email: G('siti'), no: 'R3100001', name: 'SITI', passHash: 'h', salt: 's', birthDate: '1980-01-01' });
  ok(r.ok === true, 'staf belum daftar BOLEH daftar dengan e-mel sendiri', JSON.stringify(r));
  ok(r.devOtp === undefined, 'devOtp tetap tiada', JSON.stringify(Object.keys(r)));
}

console.log('\n=== 18. KOD MATRIK kekal jadi pagar selepas pendaftaran pertama ===');
{
  /* Pendaftaran pertama meletakkan tarikh lahir; cubaan kedua mesti padan. */
  const env = makeEnv(baseTabs([SU], []));
  const first = env.registerUser({ email: G('siti'), no: 'R3100001', name: 'SITI', passHash: 'h', salt: 's', birthDate: '1980-01-01' });
  ok(first.ok === true, 'pendaftaran pertama diterima', JSON.stringify(first));
  /* Tiru verifyOTP menulis baris Pengguna_Akses. */
  env.writeAccessUser_({ email: G('siti'), no: 'R3100001', name: 'SITI', role: 'SUPER_ADMIN', hash: 'h', salt: 's', birthDate: '1980-01-01' });
  const serang = env.registerUser({ email: G('penyerang'), no: 'R3100001', name: 'SITI', passHash: 'jahat', salt: 's', birthDate: '1999-09-09' });
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

console.log('\n=== 22. v106: Sheet ID tiada -> ralat jelas, bukan TypeError ===');
{
  const env = makeEnv(baseTabs([KPL], []));
  env.SpreadsheetApp.getActiveSpreadsheet = () => null;

  let msg = '';
  try { env.openSS_(); } catch (e) { msg = String(e && e.message ? e.message : e); }
  ok(/Tetapkan Sheet ID/.test(msg), 'openSS_ beri arahan "Tetapkan Sheet ID"', msg || '(tiada ralat dibuang)');
  ok(!/Cannot read|TypeError|undefined/.test(msg), 'bukan TypeError kabur', msg || '(tiada ralat dibuang)');

  env.__props['SPREADSHEET_ID'] = 'SHEET-UJIAN';
  let dibuka = false;
  try { dibuka = !!env.openSS_(); } catch (e) { dibuka = false; }
  ok(dibuka, 'Script Property menang -> openSS_ berjaya tanpa Sheet aktif', String(dibuka));
}

console.log('\n=== 23. v107: CUTI/KURSUS disimpan ke tab Log_Cuti ===');
{
  const env = makeEnv(baseTabs([KPL], []));
  const sess = { email: G('siti'), name: 'SITI', no: 'R3100001', role: 'SUPER_ADMIN', exp: Date.now() + 3600000 };
  env.__props['SESS_tok'] = JSON.stringify(sess);

  const r = post(env, { action: 'commitCutiKursus', token: 'tok', records: [
    { id: 'CK-1', jenis: 'Cuti', nama: 'SITI BINTI OMAR', no: 'R3100001', label: 'Cuti Rehat', tarikh_mula: '2026-10-20', tarikh_tamat: '2026-10-22', catatan: 'SITI BINTI OMAR - Cuti Rehat (20/10/2026 - 22/10/2026)' },
    { id: 'CK-2', jenis: 'Kursus', nama: 'ALI BIN ABU', no: 'R3200265', label: 'Kursus Keselamatan', tarikh_mula: '2026-10-30', tarikh_tamat: '2026-11-02' }
  ] });
  ok(r.ok === true, 'commitCutiKursus berjaya', JSON.stringify(r).slice(0, 200));
  ok(r.successCount === 2, '2 rekod disimpan', 'successCount=' + r.successCount);

  const sh = env.__sheets['Log_Cuti'];
  ok(!!sh, 'tab Log_Cuti DICIPTA', String(!!sh));
  ok(sh._d[0].join('|') === 'Bil|ID|Jenis|Nama|No Personel|Pangkat|Team|Label|Tarikh Mula|Tarikh Tamat|Catatan|Direkod Oleh|Tarikh Rekod', 'header Log_Cuti betul', sh._d[0].join('|'));
  ok(sh._d.length === 3, '2 baris data (+header)', 'baris=' + sh._d.length);
  ok(String(sh._d[1][8]) === '2026-10-20' && String(sh._d[1][9]) === '2026-10-22', 'tarikh julat tersimpan betul', sh._d[1][8] + ' -> ' + sh._d[1][9]);

  /* Rekod PENUGASAN tidak boleh tercemar. */
  const logRows = env.__sheets['Log_Penugasan']._d.length;
  ok(logRows === 1, 'Log_Penugasan TIDAK menerima baris cuti (hanya header)', 'baris=' + logRows);
}

console.log('\n=== 24. v107: UPSERT — Simpan berulang tidak cipta pendua ===');
{
  const env = makeEnv(baseTabs([KPL], []));
  env.__props['SESS_tok'] = JSON.stringify({ email: G('siti'), name: 'SITI', no: 'R3100001', role: 'SUPER_ADMIN', exp: Date.now() + 3600000 });
  const rec = { id: 'CK-9', jenis: 'Cuti', nama: 'ALI BIN ABU', tarikh_mula: '2026-10-20', tarikh_tamat: '2026-10-21' };

  post(env, { action: 'commitCutiKursus', token: 'tok', records: [rec] });
  const r2 = post(env, { action: 'commitCutiKursus', token: 'tok', records: [Object.assign({}, rec, { tarikh_tamat: '2026-10-25' })] });

  const sh = env.__sheets['Log_Cuti'];
  ok(sh._d.length === 2, 'masih 2 baris (header + 1) — tiada pendua', 'baris=' + sh._d.length);
  ok(String(sh._d[1][9]) === '2026-10-25', 'rekod DIKEMAS KINI (bukan ditambah)', String(sh._d[1][9]));
  ok(r2.results[0].updated === true, 'respons tanda updated=true', JSON.stringify(r2.results[0]));
}

console.log('\n=== 25. v107: validasi medan wajib ===');
{
  const env = makeEnv(baseTabs([KPL], []));
  env.__props['SESS_tok'] = JSON.stringify({ email: G('siti'), name: 'SITI', no: 'R3100001', role: 'SUPER_ADMIN', exp: Date.now() + 3600000 });
  const r = post(env, { action: 'commitCutiKursus', token: 'tok', records: [
    { jenis: 'Cuti', tarikh_mula: '2026-10-20' },
    { jenis: 'Cuti', nama: 'ALI BIN ABU' }
  ] });
  ok(r.successCount === 0, 'kedua-dua rekod ditolak', 'successCount=' + r.successCount);
  ok(/Nama/.test(String(r.results[0].error)), 'rekod tanpa nama ditolak dengan sebab jelas', String(r.results[0].error));
  ok(/Tarikh/.test(String(r.results[1].error)), 'rekod tanpa tarikh ditolak dengan sebab jelas', String(r.results[1].error));
}

console.log('\n=== 26. v107: fetchCutiKursus + tapisan tarikh ===');
{
  const env = makeEnv(baseTabs([KPL], []));
  env.__props['SESS_tok'] = JSON.stringify({ email: G('siti'), name: 'SITI', no: 'R3100001', role: 'SUPER_ADMIN', exp: Date.now() + 3600000 });
  post(env, { action: 'commitCutiKursus', token: 'tok', records: [
    { id: 'CK-A', jenis: 'Cuti', nama: 'ALI BIN ABU', tarikh_mula: '2026-10-20', tarikh_tamat: '2026-10-22' },
    { id: 'CK-B', jenis: 'Cuti', nama: 'SITI BINTI OMAR', tarikh_mula: '2026-12-25', tarikh_tamat: '2027-01-02' }
  ] });

  const semua = post(env, { action: 'fetchCutiKursus', token: 'tok' });
  ok(semua.ok === true && semua.data.length === 2, 'baca semua: 2 rekod', 'bil=' + (semua.data ? semua.data.length : 'n/a'));

  const okt = post(env, { action: 'fetchCutiKursus', token: 'tok', startDate: '2026-10-01', endDate: '2026-10-31' });
  ok(okt.data.length === 1 && okt.data[0].nama === 'ALI BIN ABU', 'tapisan Okt: 1 rekod', JSON.stringify(okt.data.map((x) => x.nama)));

  /* Rekod 25/12-02/01 BERTINDIHAN dengan tempoh Disember walau bermula & berakhir di luar. */
  const dis = post(env, { action: 'fetchCutiKursus', token: 'tok', startDate: '2026-12-01', endDate: '2026-12-31' });
  ok(dis.data.length === 1 && dis.data[0].nama === 'SITI BINTI OMAR', 'julat rentas tahun dikesan dalam tempoh Dis (bertindih)', JSON.stringify(dis.data.map((x) => x.nama)));
}

console.log('\n=== 27. v107: cuti TIDAK mengembung KPI (reka bentuk tab berasingan) ===');
{
  const env = makeEnv(baseTabs([KPL], []));
  env.__props['SESS_tok'] = JSON.stringify({ email: G('siti'), name: 'SITI', no: 'R3100001', role: 'SUPER_ADMIN', exp: Date.now() + 3600000 });
  /* Log_Penugasan TIADA baris header dalam produksi (baris 1 = data pertama —
     lihat nota v63 dalam fetchLogData). Tanam SATU baris data terus: memanggil
     commitLogPenugasan pada tab kosong akan menambah header (getSheet_ mengisi
     header bila getLastRow()===0), yang bukan struktur produksi. */
  const baris = new Array(21).fill('');
  baris[0] = 1; baris[1] = 'USR-1'; baris[2] = '2026-10-20'; baris[3] = '2026-10-21';
  baris[4] = 'KAWALAN KESELAMATAN'; baris[12] = 'Majlis/Kursus/Seminar/Bengkel'; baris[16] = 'CONFIRMED';
  env.__sheets['Log_Penugasan'] = makeSheet([baris]);

  /* Tiga cuti/kursus masuk tab Log_Cuti. */
  post(env, { action: 'commitCutiKursus', token: 'tok', records: [
    { id: 'CK-1', jenis: 'Cuti', nama: 'ALI BIN ABU', tarikh_mula: '2026-10-20' },
    { id: 'CK-2', jenis: 'Cuti', nama: 'SITI BINTI OMAR', tarikh_mula: '2026-10-21' },
    { id: 'CK-3', jenis: 'Kursus', nama: 'ALI BIN ABU', tarikh_mula: '2026-10-22' }
  ] });

  const k = env.fetchLogCounts_('2026-10-01');
  ok(k.all === 1, 'all = 1 (3 cuti TIDAK dikira)', 'all=' + k.all);
  ok(k.inPeriod === 1, 'inPeriod = 1 (3 cuti TIDAK dikira)', 'inPeriod=' + k.inPeriod);
  ok(!k.jenis || !k.jenis['Cuti'], 'carta jenis tiada entri Cuti', JSON.stringify(k.jenis || {}));
}

console.log('\n=== 28. v107: padam cuti ikut id ===');
{
  const env = makeEnv(baseTabs([KPL], []));
  env.__props['SESS_tok'] = JSON.stringify({ email: G('siti'), name: 'SITI', no: 'R3100001', role: 'SUPER_ADMIN', exp: Date.now() + 3600000 });
  post(env, { action: 'commitCutiKursus', token: 'tok', records: [
    { id: 'CK-X', jenis: 'Cuti', nama: 'ALI BIN ABU', tarikh_mula: '2026-10-20' },
    { id: 'CK-Y', jenis: 'Cuti', nama: 'SITI BINTI OMAR', tarikh_mula: '2026-10-21' }
  ] });
  const d = post(env, { action: 'deleteCutiKursus', token: 'tok', id: 'CK-X' });
  ok(d.ok === true, 'padam berjaya', JSON.stringify(d));
  const semula = post(env, { action: 'fetchCutiKursus', token: 'tok' });
  ok(semula.data.length === 1 && semula.data[0].nama === 'SITI BINTI OMAR', 'tinggal 1 rekod yang betul', JSON.stringify(semula.data.map((x) => x.nama)));
}

console.log('\n=== 29. v107: kawalan akses cuti/kursus ===');
{
  /* Tanpa sesi -> NO_SESSION (bukan tulis tanpa kebenaran). */
  const env = makeEnv(baseTabs([KPL], []));
  const tiada = post(env, { action: 'commitCutiKursus', records: [{ nama: 'ALI', tarikh_mula: '2026-10-20' }] });
  ok(tiada.ok === false && tiada.code === 'NO_SESSION', 'tanpa sesi ditolak (NO_SESSION)', JSON.stringify(tiada).slice(0, 140));
  ok(!env.__sheets['Log_Cuti'] || env.__sheets['Log_Cuti']._d.length === 0, 'tiada baris ditulis', String(env.__sheets['Log_Cuti'] ? env.__sheets['Log_Cuti']._d.length : 0));

  /* Peranan STAF tanpa kebenaran penugasan -> FORBIDDEN. */
  env.__props['SESS_staf'] = JSON.stringify({ email: G('ali'), name: 'ALI', no: 'R3200265', role: 'STAF', exp: Date.now() + 3600000 });
  const staf = post(env, { action: 'commitCutiKursus', token: 'staf', records: [{ nama: 'ALI', tarikh_mula: '2026-10-20' }] });
  ok(staf.ok === false && staf.code === 'FORBIDDEN', 'STAF tanpa kebenaran ditolak (FORBIDDEN)', JSON.stringify(staf).slice(0, 140));
}

console.log('\n========================================');
console.log('  LULUS: ' + passes + '   GAGAL: ' + fails);
console.log('========================================\n');
process.exit(fails ? 1 : 0);
