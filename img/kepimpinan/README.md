# Gambar Kepimpinan MPDRMKL

Ada **dua** kotak kepimpinan dalam sidebar, dan cara ia dapat gambar **berbeza**:

| Kotak | Sumber gambar | Nama & jawatan |
|---|---|---|
| 1. Komandan MPDRMKL | Laluan tetap `img/kepimpinan/KOMANDAN.jpg` | `Tetapan_Header` baris `KOMANDAN` |
| 2. Ketua Pusat Pengajian (morph) | Medan `Gambar_URL` dari `Tetapan_Header` | `Tetapan_Header` baris `KETUA_PUSAT_1..5` |

**Penting:** kedua-duanya membaca `Tetapan_Header` (helaian Google Sheet),
**bukan** fail `kepimpinan.json`. Fail JSON itu **tidak** dibaca oleh kod —
jangan bergantung padanya.

Kalau medan kosong, sistem guna teks generik ("Komandan MPDRMKL", "Penaung
Program") dan emoji 🎖️/⭐. Itu **bukan** ralat — reka bentuk lalai.

## Nama fail mesti TEPAT

```
KOMANDAN.jpg
```

Huruf besar semua. Hanya `KOMANDAN.jpg` yang dicari mengikut nama fail.
`KETUA_PUSAT_1..5` diambil daripada medan `Gambar_URL` di backend, jadi ia
boleh berada di mana-mana URL yang dibenarkan.

## Saiz

Kotak Komandan kini guna nisbah **2:3** (menegak), bukan 3:4.

| Perkara | Nilai |
|---|---|
| Nisbah | **2:3** (menegak) |
| Saiz papar | ~258 × 387 px (lebar kolum 300 px) |
| Saiz disyorkan | 900 × 1350 px |
| Saiz fail | bawah 150 KB |

**Potret menegak.** Gambar landskap akan dipotong tepi (fokus diset ke 22%
dari atas supaya muka tidak terpotong).

## Cara muat naik

1. Buka repo di GitHub → folder ini
2. **Add file → Upload files** → pilih `KOMANDAN.jpg`
3. **Commit changes**

Untuk nama/jawatan sebenar, isi `Tetapan_Header` di Google Sheet (bukan di sini).

## Format

Guna **JPG**. Kalau ada PNG atau HEIC, tukar dulu.
