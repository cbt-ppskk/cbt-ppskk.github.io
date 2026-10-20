/* Ujian pengimbas rahsia — gas/scan-secrets.py.

   Pengimbas ini ialah kawalan keselamatan untuk repo AWAM. Ujian ini
   memastikan dua perkara yang bertentangan:

   1. Ia MASIH menangkap rahsia sebenar (tiada negatif palsu).
   2. Pengecualian allowlist hanya menyenyapkan nilai yang diaudit —
      glob tidak boleh membuka lubang untuk rahsia baharu dalam fail yang
      dipadankan glob.

   Sebab ujian ini wujud: pengecualian yang salah gagal secara SENYAP —
   pengimbas akan lulus selama-lamanya dan tiada sesiapa akan perasan.

   Jalankan: node gas/tests/test-scan-secrets.js */
'use strict';
const { execFileSync } = require('child_process');
const fs = require('fs');
const os = require('os');
const path = require('path');

const REPO = path.join(__dirname, '..', '..');
const SCAN = path.join(REPO, 'gas', 'scan-secrets.py');
const TMP = fs.mkdtempSync(path.join(os.tmpdir(), 'imbas-'));

let gagal = 0;
function ok(cond, label, extra) {
  console.log('  ' + (cond ? '\u2705' : '\u274c') + ' ' + label
    + (extra !== undefined ? '  [' + extra + ']' : ''));
  if (!cond) gagal++;
}

function jalankan(f, failPada) {
  let kod = 0, keluar = '';
  try {
    keluar = execFileSync('python3', [SCAN, f, '--fail-on', failPada || 'high'],
      { encoding: 'utf8', stdio: ['pipe', 'pipe', 'pipe'] });
  } catch (e) {
    kod = e.status === undefined ? -1 : e.status;
    keluar = (e.stdout || '') + (e.stderr || '');
  }
  return { kod, keluar };
}

/* Fail sementara di luar repo. Allowlist berpandukan laluan, jadi fail di
   sini TIDAK sepatutnya dikecualikan — bagus untuk menguji penangkapan. */
function imbas(nama, isi, failPada) {
  const f = path.join(TMP, nama);
  fs.writeFileSync(f, isi);
  return jalankan(f, failPada);
}

/* Tulis sementara DI DALAM repo (supaya laluan sepadan dengan allowlist),
   jalankan, kemudian pulihkan. */
function imbasDalamRepo(laluanRel, isi, failPada) {
  const f = path.join(REPO, laluanRel);
  const adaAsal = fs.existsSync(f);
  const asal = adaAsal ? fs.readFileSync(f) : null;
  fs.writeFileSync(f, isi);
  try {
    return jalankan(f, failPada);
  } finally {
    if (adaAsal) fs.writeFileSync(f, asal);
    else fs.rmSync(f, { force: true });
  }
}

/* Cari bundle React sebenar (namanya bercap kandungan, berubah setiap bina). */
function cariBundle() {
  const dir = path.join(REPO, 'react', 'assets');
  if (!fs.existsSync(dir)) return null;
  const js = fs.readdirSync(dir).filter((f) => /^index-.*\.js$/.test(f));
  return js.length ? path.join('react', 'assets', js[0]) : null;
}

console.log('=== Ujian pengimbas rahsia ===\n');

/* Rahsia ujian DIPASANG pada masa jalan, bukan ditulis sebagai literal.
   Sebabnya: cangkuk pre-commit mengimbas fail ini juga, jadi literal
   berbentuk rahsia akan menyekat setiap commit dan memaksa --no-verify —
   yang mematikan kawalan ini. Memasangnya menghasilkan teks yang SAMA
   apabila ditulis ke fail sementara, jadi ujian tetap sekuat sebelum ini,
   tetapi fail ini sendiri kekal bersih. */

/* --- A. Rahsia sebenar mesti DITANGKAP --- */
console.log('--- A. Rahsia sebenar mesti ditangkap (tiada negatif palsu) ---');
[
  ['kata laluan keras', 'var password = "' + 'hunter' + '2' + '";'],
  ['SALT', "var SALT = '" + 'rahasia' + 'Kuat123' + "';"],
  ['Google API key', 'var k = "' + 'AIza' + 'SyA1234567890abcdefghijklmnopqrstuv' + '";'],
  ['GitHub token', 'var t = "' + 'ghp_' + 'abcdefghijklmnopqrstuvwxyz' + '0123' + '456789' + '";'],
  ['ID Spreadsheet', 'var id = "' + '1AbCdEfGh' + 'IjKlMnOpQrStUvWxYz' + '0123' + '456789ab' + '";'],
  ['OAuth secret', 'var s = "' + 'GOCSPX-' + 'abcdefghijklmnopqrstuvwx' + '";'],
  ['AWS key', 'var a = "' + 'AKIA' + 'IOSFODNN7EXAMPLE' + '";'],
].forEach(([label, baris]) => {
  const r = imbas('rahsia.js', baris);
  ok(r.kod === 1, 'ditangkap: ' + label, 'kod=' + r.kod);
});

/* --- B. Nilai tidak bersalah mesti LULUS --- */
console.log('\n--- B. Nilai tidak bersalah mesti lulus ---');
[
  ['e-mel placeholder', 'var e = "nama@contoh.com";'],
  ['e-mel contoh.gov.my', 'var e = "pengirim@contoh.gov.my";'],
  ['nama tindakan biasa', 'var AKSI = { LIST_LOG: "fetchLogData" };'],
].forEach(([label, baris]) => {
  const r = imbas('bersih.js', baris);
  ok(r.kod === 0, 'lulus: ' + label, 'kod=' + r.kod);
});

/* --- C. Glob TIDAK membuka lubang ---
   Bundle React dikecualikan melalui 'react/assets/index-*.js'. Glob hanya
   meluaskan NAMA FAIL yang layak, bukan nilai — jadi rahsia baharu dalam
   bundle mesti tetap ditangkap. */
const bundleRel = cariBundle();
if (!bundleRel) {
  console.log('\n--- C/D/E. DILANGKAU: tiada react/assets/index-*.js ---');
} else {
  const bundle = fs.readFileSync(path.join(REPO, bundleRel), 'utf8');
  console.log('\n--- C. Glob allowlist tidak membuka lubang ---');
  const rC = imbasDalamRepo(bundleRel, bundle + '\nvar password = "' + 'rahsia' + 'Sungguhan999' + '";\n');
  ok(rC.kod === 1, 'rahsia BAHARU dalam bundle bercap-glob masih ditangkap', 'kod=' + rC.kod);
  ok(/Kata laluan dikod keras/.test(rC.keluar), 'penemuan ialah jenis yang betul');
  ok(!/rahsiaSungguhan999/.test(rC.keluar), 'nilai rahsia tidak dipaparkan dalam output');

  const rC2 = imbasDalamRepo('react/assets/bukan-bundle.js',
    'var password = "' + 'rahsia' + 'Lain888' + '";');
  ok(rC2.kod === 1, 'rahsia dalam fail di luar glob masih ditangkap', 'kod=' + rC2.kod);

  console.log('\n--- D. Bundle asal mesti lulus ---');
  const rD = imbasDalamRepo(bundleRel, bundle);
  ok(rD.kod === 0, 'bundle asal lulus (positif palsu diaudit dikecualikan)', 'kod=' + rD.kod);

  console.log('\n--- E. Glob kekal merentas bina (nama fail berubah) ---');
  const rE = imbasDalamRepo('react/assets/index-ZZZ999xy.js', bundle);
  ok(rE.kod === 0, 'nama bercap baharu masih dikecualikan', 'kod=' + rE.kod);
}

fs.rmSync(TMP, { recursive: true, force: true });
console.log('\n========================================');
console.log(gagal === 0 ? '  \u2705 PENGIMBAS SAH  (' + 'lulus)' : '  \u274c GAGAL: ' + gagal);
console.log('========================================');
process.exit(gagal === 0 ? 0 : 1);
