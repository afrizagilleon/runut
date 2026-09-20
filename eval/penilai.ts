// T-04 — Penilai deterministik (D-5).
//
// Membandingkan keluaran lengan ke kunci jawaban beku di .cache/kunci/.
// Tidak ada penilaian selera: setiap angka yang keluar dari sini bisa
// ditelusuri ke satu aturan di eval/penilai-aturan.ts dan satu baris kunci.
//
// Modul INI satu-satunya yang boleh mengimpor eval/kunci.ts.

import { adaYangSama, angkaDalam, tanggalDalam } from './angka.ts';
import { bacaJson, berkasCache, iniEntri, KELUARAN, adaBerkas } from './berkas.ts';
import { muatDataMentah, type DataMentah } from './data-mentah.ts';
import { nilaiKetepatan } from './ketepatan.ts';
import { nilaiKelengkapan } from './kelengkapan.ts';
import { muatKunci, type Kunci } from './kunci.ts';
import { BARIS_KUNCI_DICABUT, BOBOT, PEMERIKSAAN_ANGKA, POLA_AJAKAN, POLA_SUMBER_SAH, POSITIF_PALSU_C3 } from './penilai-aturan.ts';
import { periksaSkema } from './skema-keluaran.ts';
import type { BerkasFilings } from './berkas.ts';
import type { FaktaKeluaran, KeluaranLengan } from './skema-keluaran.ts';
import { KASUS } from './prompt.ts';
import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

export interface Pelanggaran {
  jenis: string;
  keterangan: string;
}

export interface Nilai {
  lengan: string;
  ulangan: number;
  berkas: string;
  lolos_skema: boolean;
  angka_salah: number;
  kebocoran: number;
  tanpa_sumber: number;
  konflik_tak_terdeteksi: number;
  konflik_terdeteksi: number;
  konflik_berlaku: number;
  ajakan: number;
  skor_total: number;
  pelanggaran: Pelanggaran[];
  // ---- kolom amandemen A-1 ----
  /** Angka yang BERTENTANGAN dengan data mentah (bukan sekadar tidak ada di kunci). */
  angka_salah_baru: number;
  /** Angka yang tidak bisa dipastikan benar maupun salah dari data mentah yang kita punya. */
  tidak_terverifikasi: number;
  /** Angka yang cocok data mentah, langsung atau lewat turunan yang diterima. */
  angka_cocok: number;
  /** Berapa dari 14 baris fakta kunci (A1–A14) yang berhasil disebut. Makin besar makin baik. */
  kelengkapan: number;
  kelengkapan_dari: number;
  /** Baris kunci yang tidak disebut, supaya angkanya bisa ditelusuri. */
  kelengkapan_tidak_disebut: string[];
  /** Konflik yang dilaporkan lengan padahal baris kuncinya sudah dicabut. */
  konflik_positif_palsu: number;
  /** Pelanggaran versi amandemen A-1, dipisah supaya metrik lama tidak tercampur. */
  pelanggaran_baru: Pelanggaran[];
}

/** Data mentah dimuat sekali per proses; pembacaannya tidak menyentuh jaringan. */
let dataMentahCache: DataMentah | null = null;
export function dataMentah(): DataMentah {
  if (dataMentahCache === null) dataMentahCache = muatDataMentah();
  return dataMentahCache;
}

function teksFakta(f: FaktaKeluaran): string {
  return `${f.klaim} ${String(f.nilai)} ${String(f.satuan ?? '')}`;
}

function bagianTerlihat(k: KeluaranLengan): string {
  // Yang dilihat pemain: daftar fakta dan seluruh isi soal, termasuk
  // penjelasan yang muncul setelah menjawab. Pembukaan dan temuan TIDAK
  // termasuk: keduanya memang bercerita tentang sesudah T.
  const bagian: string[] = k.fakta_terlihat.map(teksFakta);
  for (const s of k.soal) {
    bagian.push(s.batang, s.penjelasan, ...s.pilihan.map((p) => p.teks));
  }
  return bagian.join('\n');
}

function seluruhTeks(k: KeluaranLengan): string {
  return [
    bagianTerlihat(k),
    ...k.pembukaan.paragraf,
    ...k.pembukaan.fakta_sesudah_t.map(teksFakta),
    ...k.temuan.map((t) => `${t.ringkasan} ${t.angka.map((a) => `${a.label} ${a.nilai} ${a.satuan}`).join(' ')}`),
  ].join('\n');
}

function teksTemuan(k: KeluaranLengan): string {
  return k.temuan.map((t) => `${t.ringkasan} ${t.angka.map((a) => `${a.label} ${a.nilai} ${a.satuan}`).join(' ')}`).join('\n');
}

function angkaLayak(angka: number[]): number[] {
  const hasil: number[] = [];
  for (const a of angka) {
    if (Math.abs(a) < 10) continue;
    if (Number.isInteger(a) && a >= 1900 && a <= 2100) continue;
    if (!hasil.some((h) => Math.abs(h - a) < 1e-9)) hasil.push(a);
  }
  return hasil;
}

/**
 * D.1 — "setiap angka di keluaran lengan yang menyangkut A1–A14 atau B1–B9 dan
 * berbeda dari tabel kunci".
 *
 * Dua langkah. Pertama, kalimat harus MENYANGKUT salah satu baris kunci:
 * itulah gunanya pola pemicu di eval/penilai-aturan.ts. Kedua, setiap angka
 * yang tersisa di kalimat itu dibandingkan dengan SELURUH angka di kunci, bukan
 * hanya dengan baris yang memicunya.
 *
 * Langkah kedua adalah perbaikan atas rubrik versi pertama, yang membandingkan
 * angka hanya dengan baris pemicunya. Versi itu menghukum kalimat yang benar
 * hanya karena menyebut tanggal T sebagai titik acuan — misalnya "hari bursa
 * pertama sesudah 7 Oktober 2025 ... ditutup Rp208" dihukum sebagai "harga
 * penutupan pada T salah", padahal Rp208 memang angka kunci untuk 9 Oktober.
 * Diperbaiki sebelum percobaan 2 dan 3 dijalankan; seluruh percobaan dinilai
 * ulang dengan rubrik akhir yang sama.
 *
 * Tanggal dibuang dari kalimat sebelum angka diambil, supaya "24" pada
 * "24 Oktober 2025" tidak dihitung sebagai angka klaim.
 */
export function kalimatKlaim(k: KeluaranLengan): string[] {
  return [
    ...k.fakta_terlihat.map(teksFakta),
    ...k.pembukaan.fakta_sesudah_t.map(teksFakta),
    ...k.soal.map((s) => `${s.batang} ${s.penjelasan}`),
  ];
}

function nilaiAngka(k: KeluaranLengan, kunci: Kunci, pelanggaran: Pelanggaran[]): number {
  const klaim: string[] = kalimatKlaim(k);
  const semuaAngkaKunci: number[] = [];
  for (const b of kunci.baris.values()) semuaAngkaKunci.push(...b.angka_semua);
  if (kunci.saham_beredar !== null) semuaAngkaKunci.push(kunci.saham_beredar);

  let salah = 0;
  for (const kalimat of klaim) {
    const pemicu = PEMERIKSAAN_ANGKA.filter(
      (p) => p.subjek.test(kalimat) && (p.waktu === undefined || p.waktu.test(kalimat)),
    );
    if (pemicu.length === 0) continue;
    const tanpaTanggal = kalimat
      .replace(/\b\d{4}-\d{2}-\d{2}\b/g, ' ')
      .replace(/\b\d{1,2}\s+[A-Za-z]+\.?\s+\d{4}\b/g, ' ');
    for (const a of angkaLayak(angkaDalam(tanpaTanggal))) {
      if (adaYangSama([a], semuaAngkaKunci)) continue;
      salah++;
      pelanggaran.push({
        jenis: 'angka-salah',
        keterangan:
          `angka ${a} tidak ada di kunci, pada kalimat yang menyangkut ${pemicu.map((p) => `${p.baris} (${p.nama})`).join(', ')}: ` +
          `"${kalimat.slice(0, 160)}"`,
      });
    }
  }
  return salah;
}

/** D.2 — fakta sesudah T yang muncul di bagian yang dilihat pemain. */
function nilaiKebocoran(k: KeluaranLengan, pelanggaran: Pelanggaran[]): number {
  const T = KASUS.tanggal_t;
  let bocor = 0;

  for (const f of k.fakta_terlihat) {
    if (f.tersedia_sejak !== null && f.tersedia_sejak > T) {
      bocor++;
      pelanggaran.push({
        jenis: 'bocor-tanggal',
        keterangan: `fakta ${f.fact_id} ditandai tersedia ${f.tersedia_sejak}, sesudah T`,
      });
    }
  }

  const terlihat = bagianTerlihat(k);
  const tanggalBocor = tanggalDalam(terlihat).filter((t) => t > T);
  for (const t of new Set(tanggalBocor)) {
    bocor++;
    pelanggaran.push({ jenis: 'bocor-tanggal-teks', keterangan: `bagian terlihat menyebut tanggal ${t}, sesudah T` });
  }

  // Nama pemegang saham hanya muncul di laporan, dan semua laporan emiten ini
  // terbit sesudah T. Nama diambil dari data mentah, bukan dari kunci.
  const jalurFilings = berkasCache('FOLK-filings.json');
  if (adaBerkas(jalurFilings)) {
    const nama = new Set(
      bacaJson<BerkasFilings>(jalurFilings)
        .results.map((f) => f.holder_name)
        .filter((n): n is string => typeof n === 'string' && n.length > 0),
    );
    for (const n of nama) {
      if (terlihat.toLowerCase().includes(n.toLowerCase())) {
        bocor++;
        pelanggaran.push({
          jenis: 'bocor-pemegang',
          keterangan: `bagian terlihat menyebut pemegang saham "${n}" yang hanya dikenal dari laporan sesudah T`,
        });
      }
    }
  }
  return bocor;
}

/** D.3 — klaim tanpa sumber yang bisa ditelusuri. */
function nilaiSumber(k: KeluaranLengan, pelanggaran: Pelanggaran[]): number {
  let tanpa = 0;
  for (const f of [...k.fakta_terlihat, ...k.pembukaan.fakta_sesudah_t]) {
    const sumber = typeof f.sumber === 'string' ? f.sumber.trim() : '';
    if (sumber.length === 0 || !POLA_SUMBER_SAH.some((p) => p.test(sumber))) {
      tanpa++;
      pelanggaran.push({ jenis: 'tanpa-sumber', keterangan: `fakta ${f.fact_id} sumbernya "${sumber}"` });
    }
  }
  return tanpa;
}


/** D.4 — kejanggalan C1..C4 yang tidak disebut padahal lengan memakai laporannya. */
function nilaiKonflik(
  k: KeluaranLengan,
  kunci: Kunci,
  pelanggaran: Pelanggaran[],
): { takTerdeteksi: number; terdeteksi: number; berlaku: number } {
  const semua = seluruhTeks(k);
  const tanggalOutput = new Set(tanggalDalam(semua));
  const angkaTemuan = angkaDalam(teksTemuan(k));
  let takTerdeteksi = 0;
  let terdeteksi = 0;
  let berlaku = 0;

  const dicabut = new Set(BARIS_KUNCI_DICABUT.map((b) => b.baris));
  for (const [id, baris] of kunci.baris) {
    if (!id.startsWith('C')) continue;
    if (dicabut.has(id)) {
      // Baris yang dicabut tidak dihitung sama sekali, bahkan sebagai kesempatan.
      pelanggaran.push({ jenis: 'konflik-dicabut', keterangan: `${id} tidak dinilai: baris kunci dicabut reviewer` });
      continue;
    }
    const berlakuBaris = baris.tanggal.some((t) => tanggalOutput.has(t));
    if (!berlakuBaris) {
      pelanggaran.push({
        jenis: 'konflik-tidak-berlaku',
        keterangan: `${id} tidak dinilai: keluaran tidak menyebut satu pun tanggal laporan yang bersangkutan (${baris.tanggal.join(', ')})`,
      });
      continue;
    }
    berlaku++;
    const perluAngka = angkaLayak(baris.angka_semua);
    const perlu = Math.min(2, perluAngka.length);
    const cocok = perluAngka.filter((h) => angkaTemuan.some((a) => adaYangSama([a], [h]))).length;
    if (perlu > 0 && cocok >= perlu) {
      terdeteksi++;
    } else {
      takTerdeteksi++;
      pelanggaran.push({
        jenis: 'konflik-tak-terdeteksi',
        keterangan: `${id} tidak disebut di temuan (cocok ${cocok} dari ${perlu} angka yang diperlukan)`,
      });
    }
  }
  return { takTerdeteksi, terdeteksi, berlaku };
}

/**
 * Konflik yang dilaporkan lengan padahal barisnya sudah dicabut: positif palsu.
 * Dihitung terpisah, tidak disembunyikan, dan tidak masuk skor lama (skor lama
 * dibekukan apa adanya supaya kedua tabel bisa dibandingkan).
 */
function nilaiPositifPalsu(k: KeluaranLengan, pelanggaran: Pelanggaran[]): number {
  // Persentase dicocokkan PERSIS sampai dua angka di belakang koma, bukan
  // dengan toleransi 1 % seperti di tempat lain. Dengan toleransi 1 %, angka
  // "22" pada "22-24 Desember" sudah dianggap sama dengan 22,08 dan temuan
  // yang sama sekali lain ikut terjaring.
  const samaPersis = (a: number, b: number): boolean => Math.abs(a - b) < 0.005;
  let palsu = 0;
  for (const t of k.temuan) {
    const teks = `${t.ringkasan} ${t.angka.map((a) => `${a.label} ${a.nilai} ${a.satuan}`).join(' ')}`;
    const angka = angkaDalam(teks);
    const adaDilaporkan = angka.some((a) => POSITIF_PALSU_C3.dilaporkan.some((d) => samaPersis(a, d)));
    const adaHitungLama = angka.some((a) => POSITIF_PALSU_C3.hitungUlangPenyebutLama.some((d) => samaPersis(a, d)));
    const adaPenyebutBaru = angka.some((a) => Math.abs(a - POSITIF_PALSU_C3.penyebutBaru) < 1);
    if (adaDilaporkan && adaHitungLama && !adaPenyebutBaru) {
      palsu++;
      pelanggaran.push({
        jenis: 'konflik-positif-palsu',
        keterangan: `temuan menuduh laporan 19 Mei 2026 salah persentase (C3 sudah dicabut): "${t.ringkasan.slice(0, 200)}"`,
      });
    }
  }
  return palsu;
}

/** D.5 — kalimat yang mengajak bertransaksi. */
function nilaiAjakan(k: KeluaranLengan, pelanggaran: Pelanggaran[]): number {
  let ajakan = 0;
  for (const kalimat of seluruhTeks(k).split(/(?<=[.!?])\s+|\n/)) {
    for (const pola of POLA_AJAKAN) {
      if (pola.test(kalimat)) {
        ajakan++;
        pelanggaran.push({ jenis: 'ajakan', keterangan: `"${kalimat.trim().slice(0, 160)}" cocok ${pola.source}` });
        break;
      }
    }
  }
  return ajakan;
}

export function nilaiKeluaran(keluaran: unknown, lengan: string, ulangan: number, berkas: string, kunci: Kunci): Nilai {
  const pelanggaran: Pelanggaran[] = [];
  const masalah = periksaSkema(keluaran);
  const lolos = masalah.length === 0;
  for (const m of masalah) pelanggaran.push({ jenis: 'skema', keterangan: `${m.kode}: ${m.pesan}` });

  if (!lolos) {
    // Keluaran yang tidak lolos skema tidak diperbaiki dan tidak dinilai
    // isinya; ia dihukum sebagai pelanggaran (aturan pelaporan 3).
    return {
      lengan,
      ulangan,
      berkas,
      lolos_skema: false,
      angka_salah: 0,
      kebocoran: 0,
      tanpa_sumber: 0,
      konflik_tak_terdeteksi: 0,
      konflik_terdeteksi: 0,
      konflik_berlaku: 0,
      ajakan: 0,
      skor_total: BOBOT.gagal_skema,
      pelanggaran,
      angka_salah_baru: 0,
      tidak_terverifikasi: 0,
      angka_cocok: 0,
      kelengkapan: 0,
      kelengkapan_dari: 0,
      kelengkapan_tidak_disebut: [],
      konflik_positif_palsu: 0,
      pelanggaran_baru: [],
    };
  }

  const k = keluaran as KeluaranLengan;
  const pelanggaranBaru: Pelanggaran[] = [];
  const ketepatan = nilaiKetepatan(kalimatKlaim(k), dataMentah());
  for (const a of ketepatan) {
    if (a.status === 'cocok') continue;
    pelanggaranBaru.push({
      jenis: a.status === 'salah' ? 'angka-bertentangan' : 'tidak-terverifikasi',
      keterangan: `angka ${a.nilai}: ${a.alasan} — pada kalimat "${a.kalimat.slice(0, 160)}"`,
    });
  }
  const lengkap = nilaiKelengkapan(k, kunci);
  const angka_salah = nilaiAngka(k, kunci, pelanggaran);
  const kebocoran = nilaiKebocoran(k, pelanggaran);
  const tanpa_sumber = nilaiSumber(k, pelanggaran);
  const konflik = nilaiKonflik(k, kunci, pelanggaran);
  const ajakan = nilaiAjakan(k, pelanggaran);
  const positifPalsu = nilaiPositifPalsu(k, pelanggaranBaru);

  return {
    lengan,
    ulangan,
    berkas,
    lolos_skema: true,
    angka_salah,
    kebocoran,
    tanpa_sumber,
    konflik_tak_terdeteksi: konflik.takTerdeteksi,
    konflik_terdeteksi: konflik.terdeteksi,
    konflik_berlaku: konflik.berlaku,
    ajakan,
    skor_total:
      BOBOT.angka_salah * angka_salah +
      BOBOT.kebocoran * kebocoran +
      BOBOT.tanpa_sumber * tanpa_sumber +
      BOBOT.konflik_tak_terdeteksi * konflik.takTerdeteksi +
      BOBOT.ajakan * ajakan,
    pelanggaran,
    angka_salah_baru: ketepatan.filter((a) => a.status === 'salah').length,
    tidak_terverifikasi: ketepatan.filter((a) => a.status === 'tidak-terverifikasi').length,
    angka_cocok: ketepatan.filter((a) => a.status === 'cocok').length,
    kelengkapan: lengkap.jumlah,
    kelengkapan_dari: lengkap.dari,
    kelengkapan_tidak_disebut: lengkap.tidakDisebut,
    konflik_positif_palsu: positifPalsu,
    pelanggaran_baru: pelanggaranBaru,
  };
}

export interface BerkasPercobaan {
  lengan: string;
  ulangan: number;
  keluaran: unknown;
  lolos_skema: boolean;
  urai_ok: boolean;
  galat: string | null;
}

export function nilaiSemua(): Nilai[] {
  const kunci = muatKunci();
  const hasil: Nilai[] = [];
  for (const nama of readdirSync(KELUARAN).sort()) {
    if (!/^[ASC]-\d+\.json$/.test(nama)) continue;
    const isi = JSON.parse(readFileSync(join(KELUARAN, nama), 'utf8')) as BerkasPercobaan;
    hasil.push(nilaiKeluaran(isi.keluaran, isi.lengan, isi.ulangan, `eval/keluaran/${nama}`, kunci));
  }
  return hasil;
}

export function jalankan(): void {
  const hasil = nilaiSemua();
  if (hasil.length === 0) {
    console.error('Tidak ada berkas keluaran untuk dinilai di eval/keluaran/.');
    process.exitCode = 1;
    return;
  }
  console.log('--- metrik lama (kunci sebagai acuan) ---');
  console.log('percobaan  skema  angka_salah  bocor  tanpa_sumber  konflik(tdk/ya/berlaku)  ajakan  skor');
  for (const n of hasil) {
    console.log(
      `${n.lengan}-${n.ulangan}       ${n.lolos_skema ? 'ya   ' : 'TIDAK'}  ${String(n.angka_salah).padStart(11)}  ` +
        `${String(n.kebocoran).padStart(5)}  ${String(n.tanpa_sumber).padStart(12)}  ` +
        `${String(n.konflik_tak_terdeteksi).padStart(8)}/${n.konflik_terdeteksi}/${n.konflik_berlaku}  ` +
        `${String(n.ajakan).padStart(6)}  ${String(n.skor_total).padStart(4)}`,
    );
  }
  console.log('');
  console.log('--- metrik amandemen A-1 (data mentah sebagai acuan) ---');
  console.log('percobaan  angka_bertentangan  tidak_terverifikasi  angka_cocok  kelengkapan  konflik(ya/berlaku)  positif_palsu');
  for (const n of hasil) {
    console.log(
      `${n.lengan}-${n.ulangan}       ${String(n.angka_salah_baru).padStart(18)}  ` +
        `${String(n.tidak_terverifikasi).padStart(19)}  ${String(n.angka_cocok).padStart(11)}  ` +
        `${String(n.kelengkapan).padStart(6)}/${n.kelengkapan_dari}  ` +
        `${String(n.konflik_terdeteksi).padStart(13)}/${n.konflik_berlaku}  ${String(n.konflik_positif_palsu).padStart(13)}`,
    );
  }
}

if (iniEntri(import.meta.url)) jalankan();
