#!/usr/bin/env python3
"""Jana hash CSP (sha256) untuk blok <script> inline dalam index.html.

Penting: hash dikira daripada kandungan ANTARA tag <script> dan </script>
(termasuk baris baru pertama dan terakhir). Jika anda mengubah mana-mana blok
inline, jalankan semula skrip ini:

    python3 tools/csp-hash.py            # paparkan polisi sahaja
    python3 tools/csp-hash.py --write    # kemas kini <meta> CSP dalam index.html
"""
import base64
import hashlib
import pathlib
import re
import sys

ROOT = pathlib.Path(__file__).resolve().parent.parent
INDEX = ROOT / "index.html"

# Sumber yang dibenarkan (lihat AGENTS.md untuk justifikasi setiap satu).
CDN_JS = "https://cdn.jsdelivr.net https://cdnjs.cloudflare.com"
# Apps Script MEMBALAS melalui ubah hala ke *.googleusercontent.com. Hos ubah
# hala itu mesti dibenarkan dalam connect-src, jika tidak SEMUA panggilan data
# gagal dengan "Failed to fetch" walaupun script.google.com dibenarkan.
GAS = "https://script.google.com"
GAS_REDIRECT = "https://script.googleusercontent.com"
GOOGLE_DOCS = "https://docs.google.com"
CONNECT = " ".join([GAS, GAS_REDIRECT, GOOGLE_DOCS])
MEDIA = "blob: data:"


def inline_scripts(html: str):
    """Kembalikan kandungan setiap <script> tanpa atribut src."""
    for m in re.finditer(r"<script(?![^>]*\bsrc=)[^>]*>(.*?)</script>", html, re.S):
        yield m.group(1)


def hashes(html: str):
    out = []
    for body in inline_scripts(html):
        digest = hashlib.sha256(body.encode("utf-8")).digest()
        out.append("'sha256-" + base64.b64encode(digest).decode("ascii") + "'")
    return out


def build_policy(html: str) -> str:
    script_src = " ".join(["'self'", *hashes(html), CDN_JS])
    return "; ".join([
        "default-src 'self'",
        f"script-src {script_src}",
        f"script-src-elem {script_src}",
        "style-src 'self' 'unsafe-inline'",
        f"img-src 'self' {MEDIA}",
        f"font-src 'self' {MEDIA}",
        f"media-src 'self' {MEDIA}",
        f"connect-src 'self' {CONNECT}",
        f"worker-src 'self' {MEDIA}",
        f"frame-src 'self' {MEDIA}",
        "object-src 'none'",
        "base-uri 'self'",
        "form-action 'self'",
    ])


def main() -> int:
    html = INDEX.read_text(encoding="utf-8")
    policy = build_policy(html)
    n = len(hashes(html))

    if "--check" in sys.argv:
        m = re.search(r'<meta http-equiv="Content-Security-Policy" content="([^"]*)"', html)
        if not m:
            print("GAGAL: meta CSP tiada dalam index.html", file=sys.stderr)
            return 1
        if m.group(1) != policy:
            print("GAGAL: hash CSP tidak sepadan dengan skrip inline semasa.\n"
                  "Jalankan: python3 tools/csp-hash.py --write", file=sys.stderr)
            return 1
        print(f"OK: hash CSP sepadan ({n} blok skrip inline).")
        return 0

    if "--write" not in sys.argv:
        print(f"# {n} blok <script> inline\n{policy}")
        return 0

    meta = f'<meta http-equiv="Content-Security-Policy" content="{policy}">'
    existing = re.search(r'<meta http-equiv="Content-Security-Policy"[^>]*>', html)
    if existing:
        html = html[: existing.start()] + meta + html[existing.end():]
        action = "dikemas kini"
    else:
        anchor = '<meta charset="UTF-8">'
        if anchor not in html:
            print("RALAT: sauh <meta charset> tidak dijumpai", file=sys.stderr)
            return 1
        html = html.replace(anchor, meta + "\n" + anchor, 1)
        action = "ditambah"
    INDEX.write_text(html, encoding="utf-8")
    print(f"Meta CSP {action} ({n} hash script inline).")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
