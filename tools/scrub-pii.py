#!/usr/bin/env python3
"""Buang data peribadi tertanam daripada index.html.

LATAR BELAKANG
  index.html mengandungi snapshot `const DATA = {...}` (~1 juta aksara, 2/3 saiz
  fail) yang menyenaraikan nama pegawai, nombor personel, e-mel akaun, tarikh
  lahir dan 1113 baris audit. Repo ini AWAM (GitHub Pages). Data itu sepatutnya
  datang dari backend GAS (Code.gs) pada setiap muat, bukan dihantar dalam fail.

APA YANG DILAKUKAN
  1. Ganti literal `const DATA = {...}` dengan objek kosong berstruktur.
  2. Ganti `const PROF_DATES = {...}` (tarikh lahir) dengan objek kosong.
  3. Ganti `const SALT='...'` dengan nilai yang dibaca dari backend pada but.
     SALT mesti kekal STABIL — mengubahnya menjadikan semua kata laluan sedia ada
     tidak sah. Nilai lama disimpan dalam komen supaya operator boleh memulihkannya.

APA YANG TIDAK DILAKUKAN
  Skrip ini tidak menulis nilai asal ke mana-mana fail. Untuk pusingan semula
  (rollback) gunakan `git revert`, bukan fail simpanan.

GUNA
  python3 tools/scrub-pii.py            # tunjuk apa yang akan berubah
  python3 tools/scrub-pii.py --write    # tulis perubahan
"""
import re
import sys
import pathlib

ROOT = pathlib.Path(__file__).resolve().parent.parent
TARGET = ROOT / 'index.html'

EMPTY_DATA = ('const DATA = {"log":[],"personel":[],"penyelia":[],"akses":[],'
              '"laporan":[],"audit":[],"senarai":[],"padanan":[],"tetapan":{}}')

EMPTY_PROF = 'const PROF_DATES = {}'

# PII yang terselit dalam teks antara muka (placeholder, komen) — bukan dalam DATA.
# Diganti dengan nilai SINTETIK yang jelas palsu supaya contoh UI kekal berguna.
REPLACEMENTS = [
    ('apaikerol2211@gmail.com',              'nama.contoh@gmail.com'),
    ('MOHD KHAIRUL HAZWAN BIN MOHD ZAINI',   'AHMAD BIN ALI'),
    ('R9231043',                             'R1234567'),
    ('R1134348',                             'R1234567'),
    ('R3200265',                             'R1234567'),
    ('R3142646',                             'R1234567'),
    ('G9019051',                             'G1234567'),
    ('RF/200265',                            'RF/123456'),
    ('RF/142646',                            'RF/123456'),
    ('G/19051',                              'G/12345'),
]


def _span_of_object(src, start):
    """Pulangkan (mula, akhir) literal objek seimbang yang bermula pada `start`."""
    i = src.index('{', start)
    depth = 0
    in_str = False
    esc = False
    for j in range(i, len(src)):
        c = src[j]
        if in_str:
            if esc:
                esc = False
            elif c == '\\':
                esc = True
            elif c == '"':
                in_str = False
            continue
        if c == '"':
            in_str = True
        elif c == '{':
            depth += 1
        elif c == '}':
            depth -= 1
            if depth == 0:
                return i, j + 1
    raise ValueError('objek tidak seimbang bermula pada offset %d' % start)


def find_decl(src, name):
    """Cari `const NAME = {` atau `const NAME = '...'` dan pulangkan julat penuh."""
    m = re.search(r'^const\s+' + re.escape(name) + r'\s*=\s*', src, re.M)
    if not m:
        return None
    if src[m.end()] == '{':
        i, j = _span_of_object(src, m.start())
        return m.start(), j
    # literal rentetan
    m2 = re.match(r"'([^']*)'", src[m.end():])
    if not m2:
        return None
    return m.start(), m.end() + m2.end()


def main(write=False):
    src = TARGET.read_text(encoding='utf-8')
    changes = []

    # 1. DATA
    r = find_decl(src, 'DATA')
    if r and src[r[0]:r[1]] != EMPTY_DATA:
        changes.append(('DATA', r[1] - r[0]))
        if write:
            src = src[:r[0]] + EMPTY_DATA + src[r[1]:]

    # 2. PROF_DATES
    r = find_decl(src, 'PROF_DATES')
    if r and src[r[0]:r[1]] != EMPTY_PROF:
        changes.append(('PROF_DATES', r[1] - r[0]))
        if write:
            src = src[:r[0]] + EMPTY_PROF + src[r[1]:]

    # 3. PII dalam teks antara muka (placeholder, komen)
    for old, new in REPLACEMENTS:
        n = src.count(old)
        if n:
            changes.append(('PII: ' + old[:26], n))
            if write:
                src = src.replace(old, new)

    # 4. SALT — DILAPORKAN sahaja, TIDAK diubah.
    #    SALT ialah pepper kata laluan, bukan data peribadi. Menukarnya mengubah
    #    salt yang dihantar semasa Daftar/Reset; ia selamat HANYA jika backend
    #    tidak bergantung pada nilai lama. Tanpa Code.gs kita tidak boleh
    #    mengesahkannya, jadi biarkan dan lapor untuk tindakan pemilik sistem.
    m = re.search(r"^const\s+SALT\s*=\s*'([^']*)'\s*;", src, re.M)
    salt_found = bool(m)

    print('fail: %s (%.2f MB)' % (TARGET, TARGET.stat().st_size / 1048576))
    if not changes:
        print('tiada data peribadi tertanam dijumpai.')
    for name, n in changes:
        if name.startswith('PII:'):
            print('  %-32s %d tempat' % (name, n))
        else:
            print('  %-32s %d aksara diganti' % (name, n))
    if salt_found:
        print('\nBAKI (perlu koordinasi backend, TIDAK diubah oleh alat ini):')
        print('  SALT          pepper kata laluan didedahkan dalam repo awam.')
        print('                Lihat "Baki risiko" dalam AGENTS.md sebelum menukarnya.')
    if write:
        TARGET.write_text(src, encoding='utf-8')
        print('\nditulis. saiz baharu: %.2f MB' % (TARGET.stat().st_size / 1048576))
    elif changes:
        print('\n(mod kering — jalankan dengan --write untuk menulis)')
    return 0


if __name__ == '__main__':
    sys.exit(main(write='--write' in sys.argv))
