#!/usr/bin/env python3
"""Imbas rahsia dalam fail GAS SEBELUM commit.

Repo ini AWAM. Code.gs mengandungi ID spreadsheet, e-mel pengguna, dan
mungkin SALT/kunci. Skrip ini menghalang ia bocor ke GitHub.

Guna:
    python3 gas/scan-secrets.py            # imbas gas/*.gs + gas/appsscript.json
    python3 gas/scan-secrets.py --fail-on medium

Keluar 1 jika ada penemuan pada tahap itu atau lebih tinggi (lalai: high).
"""
import argparse
import os
import re
import sys

# (tahap, nama, corak, nota)
RULES = [
    # --- KRITIKAL: kredensial sebenar ---
    ("high", "Google API key",
     re.compile(r"AIza[0-9A-Za-z_\-]{35}"),
     "Kunci API Google. Putarkan serta-merta dan pindah ke PropertiesService."),
    ("high", "OAuth client secret",
     re.compile(r"GOCSPX-[0-9A-Za-z_\-]{20,}"),
     "Rahsia klien OAuth. Putarkan dan pindah ke PropertiesService."),
    ("high", "Private key",
     re.compile(r"-----BEGIN [A-Z ]*PRIVATE KEY-----"),
     "Kunci persendirian. Jangan sekali-kali commit."),
    ("high", "GitHub token",
     re.compile(r"(?:ghp|gho|ghu|ghs|ghr)_[A-Za-z0-9]{36}|github_pat_[A-Za-z0-9_]{22,}"),
     "Token GitHub. Putarkan serta-merta."),
    ("high", "AWS access key",
     re.compile(r"AKIA[0-9A-Z]{16}"),
     "Kunci AWS. Putarkan serta-merta."),
    ("high", "Slack token",
     re.compile(r"xox[baprs]-[0-9A-Za-z\-]{10,}"),
     "Token Slack. Putarkan serta-merta."),
    ("high", "Stripe key",
     re.compile(r"(?:sk|rk)_(?:live|test)_[0-9A-Za-z]{20,}"),
     "Kunci Stripe. Putarkan serta-merta."),

    # --- TINGGI: nilai yang membuka akses data ---
    ("high", "ID Spreadsheet/Drive",
     re.compile(r"\b1[A-Za-z0-9_\-]{25,}\b"),
     "ID fail Google. Sahkan kebenaran kongsi; elak commit jika boleh."),
    ("high", "SALT / pepper kata laluan",
     re.compile(r"(?:SALT|PEPPER|salt|pepper)\s*[:=]\s*['\"][^'\"]{6,}['\"]"),
     "Rahsia kata laluan. Pindah ke PropertiesService."),
    ("high", "Kata laluan dikod keras",
     re.compile(r"(?:password|passwd|pwd|kataLaluan|kata_laluan)\s*[:=]\s*['\"][^'\"]{4,}['\"]", re.I),
     "Kata laluan dalam kod. Pindah ke PropertiesService."),
    ("high", "Token/rahsia generik",
     re.compile(r"(?:api[_-]?key|secret|token|bearer)\s*[:=]\s*['\"][A-Za-z0-9_\-]{16,}['\"]", re.I),
     "Nilai rahsia dalam kod. Pindah ke PropertiesService."),
    ("high", "URL dengan kunci",
     re.compile(r"https?://[^\s'\"]+[?&](?:key|api[_-]?key|token|access_token|apikey)=[A-Za-z0-9_\-]{10,}", re.I),
     "Kunci dalam URL. Putarkan dan pindah ke PropertiesService."),

    # --- SEDERHANA: data peribadi ---
    ("medium", "Alamat e-mel",
     re.compile(r"\b[A-Za-z0-9._%+\-]+@[A-Za-z0-9.\-]+\.[A-Za-z]{2,}\b"),
     "Data peribadi (PDPA). Sahkan ia memang perlu, atau guna placeholder."),
    ("medium", "No. telefon Malaysia",
     re.compile(r"(?:\+?60|0)1[0-9][\s\-]?[0-9]{3,4}[\s\-]?[0-9]{4}\b"),
     "Data peribadi. Sahkan keperluan."),
    ("medium", "No. kad pengenalan",
     re.compile(r"\b\d{6}[\s\-]\d{2}[\s\-]\d{4}\b"),
     "Data peribadi sensitif. Jangan commit."),

    # --- RENDAH: amalan ---
    ("low", "Nilai placeholder belum diganti",
     re.compile(r"GANTI_DENGAN_[A-Z_]+"),
     "Nilai contoh masih ada. Ganti sebelum push ke Apps Script."),
]

SKIP_DIRS = {".git", "node_modules", "__pycache__"}
LEVELS = {"low": 1, "medium": 2, "high": 3}

# Nilai contoh/sintetik yang BUKAN data peribadi sebenar.
PENGECUALIAN = [
    re.compile(r"@(?:contoh|example|test|localhost|domain)\b", re.I),
    re.compile(r"\bnama\.contoh\b", re.I),
]


def dikecualikan(cuplikan):
    return any(r.search(cuplikan) for r in PENGECUALIAN)


def fail_sasaran(roots):
    for root in roots:
        if os.path.isfile(root):
            yield root
            continue
        for dirpath, dirnames, filenames in os.walk(root):
            dirnames[:] = [d for d in dirnames if d not in SKIP_DIRS]
            for fn in filenames:
                if fn.endswith((".gs", ".js", ".json")):
                    yield os.path.join(dirpath, fn)


def imbas(path, teks):
    """Pulangkan senarai (tahap, nama, baris, nota, cuplikan)."""
    jumpa = []
    for no, baris in enumerate(teks.splitlines(), 1):
        for tahap, nama, corak, nota in RULES:
            m = corak.search(baris)
            if not m:
                continue
            cuplikan = m.group(0)
            if dikecualikan(cuplikan):
                continue
            # Sembunyikan nilai supaya output sendiri tidak bocor.
            if len(cuplikan) > 12:
                cuplikan = cuplikan[:6] + "…" + cuplikan[-3:]
            jumpa.append((tahap, nama, no, nota, cuplikan))
    return jumpa


def main():
    ap = argparse.ArgumentParser(description="Imbas rahsia dalam fail GAS sebelum commit.")
    ap.add_argument("paths", nargs="*", default=["gas"],
                    help="Fail/folder untuk diimbas (lalai: gas)")
    ap.add_argument("--fail-on", choices=list(LEVELS), default="high",
                    help="Tahap minimum yang menyebabkan keluar 1 (lalai: high)")
    args = ap.parse_args()

    paths = args.paths or ["gas"]
    ada_fail = {p for p in paths if os.path.exists(p)}
    if not ada_fail:
        print("Tiada fail untuk diimbas: " + ", ".join(paths))
        return 0

    jumlah = {t: 0 for t in LEVELS}
    laporan = []

    for path in sorted(fail_sasaran(paths)):
        try:
            teks = open(path, encoding="utf-8", errors="replace").read()
        except OSError as e:
            print("Tidak dapat baca %s: %s" % (path, e), file=sys.stderr)
            continue
        jumpa = imbas(path, teks)
        if jumpa:
            laporan.append((path, jumpa))
            for tahap, *_ in jumpa:
                jumlah[tahap] += 1

    if not laporan:
        print("BERSIH — tiada rahsia dikesan dalam %s." % ", ".join(sorted(ada_fail)))
        return 0

    for path, jumpa in laporan:
        print("\n%s" % path)
        print("-" * len(path))
        for tahap, nama, no, nota, cuplikan in jumpa:
            print("  [%s] baris %d: %s  (%s)" % (tahap.upper(), no, nama, cuplikan))
            print("        -> %s" % nota)

    print("\nRingkasan: %d tinggi, %d sederhana, %d rendah"
          % (jumlah["high"], jumlah["medium"], jumlah["low"]))

    ambang = LEVELS[args.fail_on]
    dilanggar = any(jumlah[t] for t in LEVELS if LEVELS[t] >= ambang)
    if dilanggar:
        print("\nGAGAL: ada penemuan pada tahap '%s' atau lebih tinggi." % args.fail_on)
        print("Repo ini AWAM. Bersihkan dahulu, atau jalankan dengan --fail-on low")
        print("untuk lihat semua penemuan tanpa gagal.")
        return 1
    print("\nLULUS (tiada penemuan pada tahap '%s' atau lebih tinggi)." % args.fail_on)
    return 0


if __name__ == "__main__":
    sys.exit(main())
