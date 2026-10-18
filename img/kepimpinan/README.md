# Gambar Kepimpinan MPDRMKL

Letak gambar kepimpinan di sini. Sistem cari gambar **mengikut nama fail**.

## Nama fail mesti TEPAT

```
KOMANDAN.jpg
KETUA_PUSAT_1.jpg
KETUA_PUSAT_2.jpg
KETUA_PUSAT_3.jpg
KETUA_PUSAT_4.jpg
KETUA_PUSAT_5.jpg
```

Huruf besar semua, guna garis bawah `_` (bukan sengkang `-`). Nama lain
tidak akan dijumpai.

## Saiz

| Perkara | Nilai |
|---|---|
| Nisbah | 3:4 (menegak) |
| Saiz papar | tinggi tetap 290 px |
| Saiz disyorkan | 900 × 1200 px |
| Saiz fail | bawah 150 KB |

Kad besar dalam sidebar, jadi resolusi lebih tinggi diperlukan. **Potret
menegak** — gambar landskap akan dipotong tepi.

## Nama & jawatan

Gambar sahaja tidak cukup — sistem juga perlu **nama penuh** dan **jawatan**
supaya kad tidak papar teks generik ("Komandan MPDRMKL", "Penaung Program").

Isi dalam fail `kepimpinan.json` (cipta jika tiada):

```json
{
  "KOMANDAN":      { "nama": "Nama Penuh", "jawatan": "Jawatan Sebenar" },
  "KETUA_PUSAT_1": { "nama": "Nama Penuh", "jawatan": "Ketua Pusat Pengajian 1" },
  "KETUA_PUSAT_2": { "nama": "Nama Penuh", "jawatan": "Ketua Pusat Pengajian 2" },
  "KETUA_PUSAT_3": { "nama": "Nama Penuh", "jawatan": "Ketua Pusat Pengajian 3" },
  "KETUA_PUSAT_4": { "nama": "Nama Penuh", "jawatan": "Ketua Pusat Pengajian 4" },
  "KETUA_PUSAT_5": { "nama": "Nama Penuh", "jawatan": "Ketua Pusat Pengajian 5" }
}
```

Kalau `kepimpinan.json` tiada, sistem guna teks generik — bukan ralat, cuma
kurang lengkap.

## Cara muat naik

1. Buka repo di GitHub → folder ini
2. **Add file → Upload files** (gambar)
3. Untuk `kepimpinan.json`: **Add file → Create new file**
4. **Commit changes**

## Format

Guna **JPG**. Kalau ada PNG atau HEIC, tukar dulu.
