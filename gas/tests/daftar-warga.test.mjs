/* Uji mesej pada borang DAFTAR apabila menaip No. Personel.

PEPIJAT YANG DIBETULKAN (v103i)
Borang menaip No. Personel dan menyemaknya terhadap senarai `PER`. Tetapi `PER`
berasal dari `DATA.personel`, yang KOSONG pada halaman awam (snapshot PII
dibuang), dan `getPersonnelList` memerlukan sesi sah. Jadi sebelum log masuk,
`PER` kosong dan SETIAP No. Personel yang sah dilaporkan "Nombor personel tidak
dijumpai dalam daftar" — termasuk warga yang benar-benar ada dalam Sheet
'Master Personel'. Warga sah itu berhenti mendaftar walaupun backend menerima
mereka (ujian keahlian sebenar berlaku dalam registerUser).

Ujian ini menjalankan handler SEBENAR dari index.html.
*/
import fs from 'node:fs';
import vm from 'node:vm';
import assert from 'node:assert/strict';
import { test } from 'node:test';

const HTML = fs.readFileSync(new URL('../../index.html', import.meta.url), 'utf8');

/* Ambil blok `rno.addEventListener('input', () => { ... });` dari halaman. */
function ambilHandler(src) {
  const i = src.indexOf("rno.addEventListener('input'");
  assert.ok(i > 0, 'handler input No. Personel tidak dijumpai dlm index.html');
  const buka = src.indexOf('{', src.indexOf('=>', i));
  let d = 0, k = buka;
  for (; k < src.length; k++) {
    if (src[k] === '{') d++;
    else if (src[k] === '}') { d--; if (!d) break; }
  }
  return src.slice(i, k + 1) + ');';
}

/* Jalankan handler dengan PER tertentu, pulangkan teks + warna yang dipaparkan. */
function jalankan(per, taipan) {
  const rdet = { textContent: '', style: {} };
  const ctx = { console, Math, Date, JSON, Number, String, Array, Object, RegExp, Intl };
  ctx.PER = per;
  ctx.rdet = rdet;
  ctx.rno = { value: taipan, addEventListener(ev, fn) { this._fn = fn; } };
  vm.createContext(ctx);
  vm.runInContext(ambilHandler(HTML), ctx);
  ctx.rno._fn();
  return rdet;
}

const WARGA = { bil: 1, pangkat: 'LKPL', nama: 'CONTOH WARG A', no: 'R4155663', team: 'Photographer', status: 'Aktif' };

test('sebelum log masuk (PER kosong) TIDAK lagi menuduh nombor tiada', () => {
  const r = jalankan([], 'R4155663');
  assert.doesNotMatch(r.textContent, /tidak dijumpai/,
    'warga sah tidak boleh diberitahu nombornya tiada semata-mata kerana senarai belum dimuat');
  assert.match(r.textContent, /disahkan oleh sistem semasa pendaftaran/);
  assert.equal(r.style.color, 'var(--muted2)', 'nada maklumat, bukan amaran kuning');
});

test('PER kosong: teks lama (regresi) mesti gagal', () => {
  /* Jika seseorang memulihkan teks lama, ujian ini gagal. */
  const LAMA = '⚠️ Nombor personel tidak dijumpai dalam daftar.';
  assert.doesNotMatch(jalankan([], 'R4155663').textContent, new RegExp(LAMA.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')));
});

test('selepas log masuk (PER terisi) warga SAH masih dikenali', () => {
  const r = jalankan([WARGA], 'R4155663');
  assert.match(r.textContent, /Dikenali/);
  assert.match(r.textContent, /CONTOH WARG A/);
  assert.equal(r.style.color, 'var(--ok)');
});

test('padanan tahan huruf besar/kecil dan jarak', () => {
  for (const taipan of ['r4155663', 'R4155663', ' r4155663 ']) {
    assert.match(jalankan([WARGA], taipan).textContent, /Dikenali/, `taipan "${taipan}"`);
  }
});

test('taipan pendek tidak memaparkan apa-apa mesej', () => {
  assert.equal(jalankan([], 'R41').textContent, '');
});
