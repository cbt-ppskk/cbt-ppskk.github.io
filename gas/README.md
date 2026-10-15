# Backend Google Apps Script (`Code.gs`)

Folder ini menyimpan kod backend CBT PPSKK dalam kawalan versi.

**Kenapa:** sebelum ini `Code.gs` hanya wujud dalam editor Apps Script. Tiada
sejarah, tiada cara kembali ke versi lama, dan tiada cara menyemak keselamatan
kod itu. Sekarang ia dijejak bersama frontend.

> ⚠️ **Repo ini AWAM.** Kod dalam folder ini boleh dibaca sesiapa. Jangan
> sekali-kali commit ID spreadsheet, e-mel pengguna, `SALT`, kunci API atau
> kata laluan. Guna `PropertiesService` (lihat bawah) dan jalankan
> `scan-secrets.py` sebelum setiap commit.

## Fail dalam folder ini

| Fail | Tujuan |
|---|---|
| `Code.gs` | Kod backend sebenar (anda tarik guna `clasp pull`) |
| `appsscript.json` | Manifest projek Apps Script |
| `.clasp.json` | ID projek Apps Script + `rootDir` |
| `.claspignore` | Senarai putih — hanya `.gs`/`appsscript.json` dihantar |
| `scan-secrets.py` | Pengimbas rahsia sebelum commit |
| `hooks/pre-commit` | Cangkuk git (pilihan) yang jalankan pengimbas automatik |

## Persediaan sekali sahaja

`clasp` dipasang setempat (bukan global — pemasangan global disekat):

```bash
cd /tmp/clasptool
npm install @google/clasp
```

Setkan alias supaya senang:

```bash
CLASP=/tmp/clasptool/node_modules/.bin/clasp
```

### 1. Log masuk (perlu pelayar — langkah MANUAL)

```bash
$CLASP login
```

Ia buka pelayar untuk login akaun Google yang memiliki projek Apps Script.
Ini **mesti anda buat sendiri**; saya tidak boleh mengakses akaun anda.

Kredensial disimpan dalam `~/.clasprc.json`. Fail itu mengandungi token
penyegar OAuth — **jangan sekali-kali commit** (sudah disenaraikan dalam
`.gitignore`).

### 2. Setkan ID projek

Dapatkan ID dari URL editor Apps Script:

```
https://script.google.com/home/projects/<SCRIPT_ID>/edit
                                       ^^^^^^^^^^^
```

Kemudian isi `gas/.clasp.json`:

```json
{
  "scriptId": "<SCRIPT_ID>",
  "rootDir": "."
}
```

ID projek Apps Script **bukan** rahsia (ia tidak memberi akses tanpa login),
tetapi elak commit jika boleh.

### 3. Tarik kod sedia ada

```bash
cd gas && $CLASP pull
```

Ini menulis `Code.gs` (dan fail `.gs` lain) ke folder ini. **Jalankan
`scan-secrets.py` serta-merta selepas ini** — kod itu mungkin mengandungi
rahsia yang belum pernah dilihat git.

```bash
python3 gas/scan-secrets.py
```

## Aliran kerja harian

```bash
# Tarik perubahan dari editor Apps Script
cd gas && $CLASP pull && cd ..

# Semak rahsia SEBELUM commit
python3 gas/scan-secrets.py

# Commit seperti biasa
git add gas/ && git commit -m "..."

# Hantar perubahan ke editor Apps Script
cd gas && $CLASP push
```

Selepas `push`, **deploy semula** supaya URL `/exec` yang digunakan frontend
mengambil kod baharu:

```bash
$CLASP deploy --description "v103e: <ringkasan>"
```

> `push` menulis ke draf projek. Frontend memanggil URL `/exec` yang
> **terikat pada deployment**. Tanpa deploy semula, perubahan tidak berkuat
> kuasa untuk pengguna.

## Rahsia: guna PropertiesService, bukan kod

Jangan letak nilai sensitif dalam `Code.gs`. Simpan dalam Properties:

```javascript
// SEKALI SAHAJA — jalankan dari editor Apps Script, bukan dari repo.
function setRahsiaSekali_() {
  var p = PropertiesService.getScriptProperties();
  p.setProperty('SPREADSHEET_ID', '...');
  p.setProperty('SALT', '...');
}

// Dalam kod biasa:
function getRahsia_(kunci) {
  return PropertiesService.getScriptProperties().getProperty(kunci);
}
```

Nilai itu kekal dalam projek Apps Script dan **tidak** masuk git.

## Cangkuk pre-commit (pilihan)

Untuk halang commit rahsia secara automatik:

```bash
cp gas/hooks/pre-commit .git/hooks/pre-commit && chmod +x .git/hooks/pre-commit
```

Cangkuk ini menjalankan `scan-secrets.py` dan membatalkan commit jika ada
rahsia tahap tinggi. Langkau bila perlu dengan `git commit --no-verify`.

## Amaran: menukar SALT

`SALT` ialah pepper untuk hash kata laluan. Semua kata laluan sedia ada
dikira menggunakan nilai semasa. Jika anda tukar nilainya **tanpa** migrasi,
semua pengguna gagal log masuk. Rancang migrasi dahulu.
