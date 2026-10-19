# Skop: Tambah Kedalaman (Depth) — CBT PPSKK

Tarikh: 2026-10-18
Matlamat: Kekalkan gaya sekarang (navy kaca + cyan/emas). Tambah kedalaman 3D.
Kaedah: Bayang berlapis, highlight atas, pengikat bawah, permukaan bergradien,
        gerak balas hover/tekan. **Tiada perubahan palet atau susun atur.**

Demo rujukan: `/workspace/demo/depth.html`

---

## Ukuran sebenar (bukan agakan)

| Perkara | Bilangan |
|---|---|
| Peraturan CSS (index.html) | **718** |
| ... peringkat atas | 584 |
| ... dalam `@media` | 134 |
| Blok `@media` | 52 |
| Blok `:root` | 1 |
| Peraturan `box-shadow` | 46 |
| Peraturan `border-radius` | 154 |
| Peraturan `background` | 220 |
| Peraturan `border` | 272 |
| **Permukaan** (background + border-radius) | **116** |
| ... dengan `padding` (kad sebenar) | **76** |
| ... sudah ada `box-shadow` sendiri | 21 |
| ... **tiada** `box-shadow` | 95 |
| Gaya sebaris (`style=`) | 190 |
| ... ada `background` | 20 |
| ... ada `border` | 24 |
| ... ada `border-radius` | 15 |
| ... ada `box-shadow` | 1 |
| Peraturan CSS (office.html) | 413 |
| Token `:root` office.html | **berbeza sepenuhnya** |

### Nota penting tentang `--shadow`

Token `--shadow` hanya digunakan **3 kali** dalam seluruh index.html.
Tukar token sahaja **tidak akan** mengubah hampir apa-apa. Kedalaman mesti
ditulis pada setiap kelas permukaan.

---

## Peringkat kerja

### Peringkat 0 — Token (30 minit)

Tambah token kedalaman pada `:root`. Tiada perubahan visual.

```css
:root{
  /* bayang berlapis 3 tingkat */
  --d-contact: 0 2px 4px rgba(0,0,0,.55);
  --d-ambient: 0 12px 28px rgba(0,0,0,.48);
  --d-far:     0 30px 64px rgba(0,0,0,.38);
  /* highlight atas + pengikat bawah */
  --d-top:  inset 0 1px 0 rgba(255,255,255,.09);
  --d-bot:  inset 0 -1px 0 rgba(0,0,0,.55);
  /* permukaan bergradien */
  --d-surf: linear-gradient(168deg,rgba(30,41,59,.72),rgba(15,23,42,.80) 45%,rgba(8,12,22,.88));
}
```

**Risiko:** sifar. Boleh commit dan uji.

---

### Peringkat 1 — Teras (2-3 jam) ⭐

8 komponen. Ini **~70%** daripada apa yang pengguna nampak.

| # | Kelas | Baris |
|---|---|---|
| 1 | `.glass` (panel asas) | 114 |
| 2 | `.card` | 307 |
| 3 | `.kpi` | 300 |
| 4 | `nav.tabs` + `.tab-btn` | 188 + 254 |
| 5 | `.btn` (semua varian) | 322-331 |
| 6 | `.tbl-wrap` + `thead th` | 337-342 |
| 7 | `.sm-card` + `.sm-photo` | 684-695 |
| 8 | `header.top` + `.user-chip` | 157 + 176 |

**Selepas peringkat ini:** kau boleh lihat dan nilai 70% hasilnya.
**Titik keputusan:** kalau tidak suka, berhenti di sini. Rugi 3 jam, bukan 14.

---

### Peringkat 2 — Borang + Modal (2-3 jam)

~25 kelas. Borang Key In, modal, dropdown, medan input.

- `.field`, `.ki-field`, `.ep-field`, `.stage` (input/select/textarea)
- `.navdrop-menu`, `.navdrop.open>button`
- `.pick-list`, `.ki-card`, `.ki-pv`
- `.modal`, `.mc-day`, `.otp-inputs input`

**Risiko:** sederhana. Input yang "terbenam" (inset) mesti kekal jelas boleh dibaca.
Uji setiap borang.

---

### Peringkat 3 — Baki permukaan (2-3 jam)

~40 kelas selebihnya: lencana, pil status, kad kecil, chip, jalur, kalendar.

**Risiko:** rendah, tetapi banyak. Kerja mekanikal.

---

### Peringkat 4 — office.html (1 jam)

Fail berasingan, **413 peraturan**, dan **set token sendiri** (`--bg`, `--panel`,
`--accent`, bukan `--cyan`/`--sky`). Perlu kerja berasingan.

**Keputusan:** adakah office.html perlu sama? Kalau ya, +1 jam. Kalau tidak, skip.

---

### Peringkat 5 — Ujian (2-3 jam)

| Ujian | Kaedah |
|---|---|
| Visual regresi | Tangkap skrin setiap tab sebelum/selepas |
| Prestasi mudah alih | Ukur FPS pada telefon lama |
| Kebolehbacaan | Kontras teks pada setiap permukaan |
| CSP | Sahkan 0 pelanggaran |
| Regresi fungsi | Ujian sedia ada (KPI 6/6, PDF 16/16) |

**Kritikal:** uji pada **telefon lama**. Bayang berlapis + `backdrop-filter`
pada kad yang bergerak (marquee 17 personel) boleh perlahankan peranti.

---

## Jumlah masa

| Peringkat | Masa |
|---|---|
| 0 — Token | 0.5 jam |
| 1 — Teras | 2-3 jam |
| 2 — Borang | 2-3 jam |
| 3 — Baki | 2-3 jam |
| 4 — office.html | 1 jam (pilihan) |
| 5 — Ujian | 2-3 jam |
| **JUMLAH** | **10-14 jam** |

Dipecah kepada 3-4 sesi. Setiap peringkat boleh diuji dan di-commit sendiri.

---

## Risiko

| Risiko | Tahap | Kurangan |
|---|---|---|
| Prestasi telefon lama | **TINGGI** | Uji awal; kurangkan lapisan jika perlu |
| Gaya sebaris JS (190) tidak terjejas | Sederhana | Semak 20+24+15 yang berkaitan |
| office.html token berbeza | Sederhana | Kerja berasingan, atau skip |
| Jadual jadi berat | Sederhana | Kekal baris rata, depth pada bekas sahaja |
| Cache PWA lama | Rendah | Naik `APP_VER` + cache `sw.js` |

### Yang TIDAK terjejas (kabar baik)

- **CSP** — semua CSS, tiada fail luar. 0 risiko.
- **Carta Chart.js** — warna dalam JS, bukan CSS. Tidak berubah.
- **Eksport PDF jsPDF** — warna dalam JS. Tidak berubah.
- **Logik sistem** — sifar perubahan JavaScript.

---

## Cadangan

1. **Mula dengan Peringkat 0 + 1 sahaja.** 3 jam. Kau nilai hasilnya.
2. Kalau suka → teruskan Peringkat 2-3.
3. Kalau tidak → berhenti. Kerugian minimum.
4. **Uji pada telefon lama selepas Peringkat 1**, bukan selepas semuanya.
5. Commit setiap peringkat. Mudah undur kalau ada masalah.

---

## Perkara yang perlu diselesaikan dahulu

- **Push ke GitHub gagal.** Kedua-dua token mati (401). Kerja gambar
  (`38a23ed`) + dokumen (`ebc0d9a`) masih belum sampai GitHub. `main` ahead 2.
- **Kerja gambar tertunggak** — pengguna muat naik gambar Selasa 20 Okt.
  Kedalaman dan gambar adalah dua kerja berasingan. Elakkan buat serentak.
