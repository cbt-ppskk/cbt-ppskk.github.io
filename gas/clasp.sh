#!/bin/sh
# Pembantu aliran kerja clasp untuk backend CBT PPSKK.
#
# clasp dipasang SETEMPAT (pemasangan global disekat dalam persekitaran ini),
# jadi skrip ini menyelesaikan laluan binari untuk anda.
#
# Guna:
#   ./gas/clasp.sh login          # sekali sahaja (buka pelayar)
#   ./gas/clasp.sh pull           # tarik Code.gs dari editor Apps Script
#   ./gas/clasp.sh scan           # imbas rahsia sebelum commit
#   ./gas/clasp.sh push           # hantar ke editor Apps Script
#   ./gas/clasp.sh deploy "nota"  # deploy semula (frontend ambil kod baharu)
#   ./gas/clasp.sh status         # senarai deployment
set -e

REPO=$(git rev-parse --show-toplevel)
GAS_DIR="$REPO/gas"

# Cari binari clasp.
if [ -x "/tmp/clasptool/node_modules/.bin/clasp" ]; then
  CLASP="/tmp/clasptool/node_modules/.bin/clasp"
elif command -v clasp >/dev/null 2>&1; then
  CLASP="clasp"
else
  echo "clasp tidak dijumpai. Pasang dahulu:" >&2
  echo "  cd /tmp/clasptool && npm install @google/clasp" >&2
  exit 1
fi

# Sahkan ID projek sudah diisi.
sahkan_id() {
  if grep -q "GANTI_DENGAN_SCRIPT_ID" "$GAS_DIR/.clasp.json" 2>/dev/null; then
    echo "Ralat: gas/.clasp.json masih mengandungi nilai placeholder." >&2
    echo "Isi 'scriptId' dengan ID projek Apps Script anda dahulu." >&2
    exit 1
  fi
}

arahan=${1:-}
shift 2>/dev/null || true

case "$arahan" in
  login)
    "$CLASP" login
    echo ""
    echo "Kredensial disimpan dalam ~/.clasprc.json (sudah diabaikan git)."
    ;;
  pull)
    sahkan_id
    cd "$GAS_DIR" && "$CLASP" pull
    echo ""
    echo "Menjalankan pengimbas rahsia ke atas kod yang ditarik..."
    python3 "$GAS_DIR/scan-secrets.py" "$GAS_DIR" --fail-on high || true
    echo ""
    echo "Semak output di atas. Jika ada rahsia, bersihkan SEBELUM commit."
    ;;
  scan)
    python3 "$GAS_DIR/scan-secrets.py" "$GAS_DIR" --fail-on "${1:-high}"
    ;;
  push)
    sahkan_id
    # Pengawal: 'clasp push' tanpa fail .gs akan MEMADAM fail jauh.
    # Ini berlaku jika 'pull' belum dijalankan. Hentikan sebelum berlaku.
    if ! ls "$GAS_DIR"/*.gs >/dev/null 2>&1; then
      echo "Ralat: tiada fail .gs dalam gas/." >&2
      echo "'clasp push' sekarang akan MEMADAM fail dalam projek Apps Script." >&2
      echo "Jalankan 'pull' dahulu untuk tarik kod sedia ada:" >&2
      echo "  ./gas/clasp.sh pull" >&2
      exit 1
    fi
    python3 "$GAS_DIR/scan-secrets.py" "$GAS_DIR" --fail-on high
    cd "$GAS_DIR" && "$CLASP" push
    echo ""
    echo "Di-push ke draf projek. Jalankan 'deploy' supaya frontend nampak perubahan."
    ;;
  deploy)
    sahkan_id
    nota=${1:-"kemas kini $(date -u +%Y-%m-%dT%H:%M:%SZ)"}
    cd "$GAS_DIR" && "$CLASP" deploy --description "$nota"
    ;;
  status)
    sahkan_id
    cd "$GAS_DIR" && "$CLASP" deployments
    ;;
  *)
    echo "Guna: $0 {login|pull|scan|push|deploy \"nota\"|status}" >&2
    exit 2
    ;;
esac
