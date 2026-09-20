// T-01 — Mereproduksi pemilihan kasus tersembunyi.
//
// Kasusnya SUDAH dipilih dan dibekukan pemilik (FOLK, T = 7 Oktober 2025).
// Skrip ini tidak memilih apa pun yang baru; ia hanya membuktikan bahwa
// pemilihan itu bisa diturunkan ulang dari data mentah dengan seed tetap.
// Kalau hasilnya berbeda dari yang beku, skrip berhenti dengan BLOCKED dan
// TIDAK menyesuaikan seed maupun saringan.
//
// Skrip ini tidak boleh membaca .cache/kunci/.

import { createHash } from 'node:crypto';
import { writeFileSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';
import {
  EVAL,
  adaBerkas,
  bacaJson,
  iniEntri,
  berkasCache,
  kodeTanpaSufiks,
  type BarisSuspensi,
  type BerkasFilings,
  type HariHarga,
} from './berkas.ts';

export const SEED = 'sectors-hackathon-2026-09-20';

/** Sembilan emiten yang sudah dipakai menurunkan R1–R10; haram jadi kasus uji. */
export const SUDAH_DIPAKAI = ['DADA', 'KRYA', 'COCO', 'RLCO', 'BEEF', 'LPLI', 'ULTJ', 'ARNA', 'MTLA'] as const;

/**
 * Suspensi "cooling down" versi bursa: alasannya menyebut peningkatan harga
 * kumulatif yang signifikan dan/atau frasa cooling down. Pembukaan kembali
 * dicatat dengan alasan yang sama tanpa frasa cooling down, jadi keduanya
 * dihitung sebagai satu keluarga.
 */
const POLA_COOLING_DOWN = /peningkatan harga kumulatif|cooling down/i;

export const LAPORAN_MINIMAL = 8;

export interface Kandidat {
  kode: string;
  suspensi: string[];
  hash: string;
}

export function kandidatTerurut(baris: BarisSuspensi[], dikecualikan: readonly string[] = SUDAH_DIPAKAI): Kandidat[] {
  const dikecualikanSet = new Set(dikecualikan);
  const perEmiten = new Map<string, string[]>();
  for (const b of baris) {
    if (!POLA_COOLING_DOWN.test(b.reason ?? '')) continue;
    const kode = kodeTanpaSufiks(b.symbol);
    if (dikecualikanSet.has(kode)) continue;
    const daftar = perEmiten.get(kode);
    if (daftar) daftar.push(b.suspension_date);
    else perEmiten.set(kode, [b.suspension_date]);
  }
  const lolos: Kandidat[] = [];
  for (const [kode, tanggal] of perEmiten) {
    if (tanggal.length < 2) continue;
    if (!tanggal.some((t) => t.startsWith('2025'))) continue;
    lolos.push({
      kode,
      suspensi: [...tanggal].sort(),
      hash: createHash('sha256').update(SEED + kode).digest('hex'),
    });
  }
  lolos.sort((a, b) => (a.hash < b.hash ? -1 : a.hash > b.hash ? 1 : 0));
  return lolos;
}

export interface Kelayakan {
  kode: string;
  jumlahLaporan: number | null;
  layak: boolean;
  alasan: string;
}

export function periksaKelayakan(kode: string): Kelayakan {
  const jalur = berkasCache(`${kode}-filings.json`);
  if (!adaBerkas(jalur)) {
    return {
      kode,
      jumlahLaporan: null,
      layak: false,
      alasan: `data laporan belum ditarik (${jalur} tidak ada) — kelayakan tidak bisa diputuskan`,
    };
  }
  const isi = bacaJson<BerkasFilings>(jalur);
  const jumlah = isi.results.length;
  return {
    kode,
    jumlahLaporan: jumlah,
    layak: jumlah >= LAPORAN_MINIMAL,
    alasan:
      jumlah >= LAPORAN_MINIMAL
        ? `${jumlah} laporan kepemilikan (>= ${LAPORAN_MINIMAL})`
        : `hanya ${jumlah} laporan kepemilikan (< ${LAPORAN_MINIMAL})`,
  };
}

/**
 * T = hari bursa terakhir sebelum suspensi cooling down pertama pada 2025.
 * Hari bursa = hari dengan volume > 0 di deret harian.
 */
export function hitungT(kode: string, suspensi: string[]): string {
  const suspensi2025 = suspensi.filter((t) => t.startsWith('2025')).sort();
  const pertama = suspensi2025[0];
  if (!pertama) throw new Error(`${kode}: tidak ada suspensi 2025`);
  const hari: HariHarga[] = [];
  for (const nama of [`${kode}-daily-2025q3.json`, `${kode}-daily-2025q4.json`]) {
    const jalur = berkasCache(nama);
    if (adaBerkas(jalur)) hari.push(...bacaJson<HariHarga[]>(jalur));
  }
  if (hari.length === 0) throw new Error(`${kode}: deret harga harian tidak ada di cache`);
  const sebelum = hari
    .filter((h) => h.date < pertama && h.volume > 0)
    .sort((a, b) => (a.date < b.date ? -1 : 1));
  const terakhir = sebelum[sebelum.length - 1];
  if (!terakhir) throw new Error(`${kode}: tidak ada hari bursa sebelum ${pertama}`);
  return terakhir.date;
}

/** Yang sudah dibekukan pemilik pada 20 Sep 2026, sebelum lengan mana pun jalan. */
export const BEKU = { kode: 'FOLK', tanggalT: '2025-10-07' } as const;

export function jalankan(): void {
  const baris = bacaJson<BarisSuspensi[]>(berkasCache('suspensions-all.json'));
  const kandidat = kandidatTerurut(baris);

  console.log(`seed: ${SEED}`);
  console.log(`saringan: suspensi cooling down >= 2 kali, minimal satu di 2025, di luar ${SUDAH_DIPAKAI.join('/')}`);
  console.log(`emiten lolos saringan: ${kandidat.length}`);
  console.log(`sepuluh teratas: ${kandidat.slice(0, 10).map((k) => k.kode).join(', ')}`);

  const pemeriksaan: Kelayakan[] = [];
  let terpilih: Kandidat | null = null;
  for (const k of kandidat) {
    const hasil = periksaKelayakan(k.kode);
    pemeriksaan.push(hasil);
    console.log(`  ${hasil.layak ? 'TERIMA' : 'TOLAK '} ${k.kode}: ${hasil.alasan}`);
    if (hasil.layak) {
      terpilih = k;
      break;
    }
    if (hasil.jumlahLaporan === null) {
      console.error(
        `BLOCKED: kandidat ${k.kode} tidak bisa dinilai karena datanya belum ditarik. ` +
          `Tidak boleh dilompati diam-diam.`,
      );
      process.exitCode = 1;
      return;
    }
  }

  if (!terpilih) {
    console.error('BLOCKED: tidak ada kandidat yang layak.');
    process.exitCode = 1;
    return;
  }

  const tanggalT = hitungT(terpilih.kode, terpilih.suspensi);
  console.log(`terpilih: ${terpilih.kode}, suspensi ${terpilih.suspensi.join(', ')}`);
  console.log(`T (hari bursa terakhir sebelum suspensi cooling down pertama 2025): ${tanggalT}`);

  if (terpilih.kode !== BEKU.kode || tanggalT !== BEKU.tanggalT) {
    console.error(
      `BLOCKED: reproduksi menghasilkan ${terpilih.kode} T=${tanggalT}, ` +
        `sedangkan yang dibekukan pemilik ${BEKU.kode} T=${BEKU.tanggalT}. ` +
        `Seed dan saringan TIDAK disesuaikan. Hentikan dan lapor ke pemilik.`,
    );
    process.exitCode = 1;
    return;
  }
  console.log(`cocok dengan yang dibekukan pemilik: ${BEKU.kode}, T=${BEKU.tanggalT}`);

  mkdirSync(EVAL, { recursive: true });
  const keluaran = {
    seed: SEED,
    saringan: {
      pola_alasan: POLA_COOLING_DOWN.source,
      minimal_suspensi: 2,
      wajib_ada_2025: true,
      dikecualikan: SUDAH_DIPAKAI,
      laporan_minimal: LAPORAN_MINIMAL,
    },
    jumlah_lolos_saringan: kandidat.length,
    urutan_sepuluh_teratas: kandidat.slice(0, 10).map((k) => k.kode),
    pemeriksaan_kelayakan: pemeriksaan,
    terpilih: {
      kode: terpilih.kode,
      suspensi: terpilih.suspensi,
      tanggal_T: tanggalT,
      aturan_T: 'hari bursa terakhir (volume > 0) sebelum suspensi cooling down pertama pada 2025',
    },
    dibekukan_pemilik: BEKU,
    catatan:
      'Kasus ini dipilih dan dibekukan pemilik pada 20 Sep 2026. Skrip ini hanya mereproduksi pemilihan itu.',
  };
  const jalurKeluaran = join(EVAL, 'kasus-tersembunyi.json');
  writeFileSync(jalurKeluaran, JSON.stringify(keluaran, null, 2) + '\n', 'utf8');
  console.log(`ditulis: ${jalurKeluaran}`);
}

if (iniEntri(import.meta.url)) jalankan();
