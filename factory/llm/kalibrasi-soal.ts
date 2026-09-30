/**
 * Himpunan kalibrasi M2d-8 (kontrak D-0, D-2) dan gerbang KODE per soal.
 *
 * - **Soal manusia** (6): DADA s1–s3 dan ULTJ s1–s3, teks tayang di
 *   `cases/*.json`. Diubah ke bentuk `OmonganDraf` dengan paket dari FAKTA
 *   KASUS ITU SENDIRI (`paketDariKasus`): kartu, rujukan, dan angka soal
 *   manusia menunjuk fakta kasus (41/62 fakta), dan kalimat kartu yang dibaca
 *   pembaca kartu/kritikus adalah `klaim` fakta kasus. `angka_pesan` dipetakan
 *   KODE (`angkaPesanManusia`): tiap angka di pesan menunjuk fakta kasus
 *   pertama (kartu soal dulu, lalu fakta lain) yang memuat angka itu; yang
 *   tidak ditemukan di fakta mana pun ditandai andaian.
 * - **Himpunan bocor/aman** M2d-6/M2d-7 (`soalHimpunan`, label dari jawaban
 *   mentah penguji luar), dengan paket jalan asalnya (`paket.json` tersimpan).
 *
 * Gerbang KODE per soal (`gerbangKode`): validator (`validasiDraf` atas soal
 * itu sendirian — kode seluruh-draf tidak dinilai), G-angka-cukup, G-kaku,
 * G-panjang, G-satu-klausa, G-register, rujukan huruf, G-penilaian,
 * G-pilihan-kembar. TIDAK dinilai (pra-registrasi, tidak berlaku menurut
 * bangunnya): `NAMA_TERLARANG` (nama di kasus tayang sengaja dicadangkan
 * untuk kasus tayang), G-ikatan-bank (pilihan manusia tidak berasal dari bank
 * pengecoh), G-mirip dan kode seluruh-draf (penilaian simulasi, bukan soal).
 */
import { readFileSync } from 'node:fs';
import { teksPolos } from '../skema/rujukan.ts';
import type { Fakta } from '../skema/tipe.ts';
import type { KunciOpsi, OmonganDraf } from './draf.ts';
import { AKAR } from './env.ts';
import { gerbangG } from './gerbang-g.ts';
import { gerbangGaya } from './gerbang-gaya.ts';
import { gKembar } from './gerbang-kembar.ts';
import { gPenilaian, lepasPengecualian } from './gerbang-penilaian.ts';
import type { PaketFakta } from './paket.ts';
import { soalHimpunan } from './pengecoh-kalibrasi.ts';
import { SOAL_KALIBRASI } from './penalar-kalibrasi.ts';
import { periksaRujukanHuruf } from './posisi-kunci.ts';
import { angkaTakBerjejak, validasiDraf } from './validasi.ts';

export const BERKAS_MANUSIA = ['dada-2025-10-08', 'ultj-2026-05-04'] as const;
const ID_PAKET_KASUS: Record<(typeof BERKAS_MANUSIA)[number], 'dada' | 'ultj'> = { 'dada-2025-10-08': 'dada', 'ultj-2026-05-04': 'ultj' };

interface SoalKasus {
  soal_id: string;
  kartu: string[];
  kartu_penentu: string[];
  pesan: { nama: string; jam: string; isi: string };
  pilihan: Array<{ kunci: KunciOpsi; teks: string }>;
  jawaban: KunciOpsi;
  penjelasan: string;
}

interface Kasus {
  kasus_id: string;
  emiten: string;
  nama_samaran: string;
  tanggal_t: string;
  judul: string;
  fakta: Fakta[];
  soal: SoalKasus[];
}

export function bacaKasus(berkas: string): Kasus {
  return JSON.parse(readFileSync(`${AKAR}cases/${berkas}.json`, 'utf8')) as Kasus;
}

/** Paket fakta dari fakta kasus tayang (klaim = kalimat fakta kasus). Murni. */
export function paketDariKasus(berkas: (typeof BERKAS_MANUSIA)[number], k: Kasus = bacaKasus(berkas)): PaketFakta {
  return {
    paket_id: ID_PAKET_KASUS[berkas],
    simbol: k.emiten,
    nama_emiten: k.emiten,
    nama_samaran: k.nama_samaran,
    tanggal_t: k.tanggal_t,
    peristiwa: k.judul,
    fakta: k.fakta.map((f) => ({
      fact_id: f.fact_id,
      jenis: f.sumber.jenis === 'turunan' ? 'hitungan' : 'dokumen',
      asal: f.sumber.keterangan ?? f.sumber.jenis,
      terbit: f.tersedia_sejak ?? k.tanggal_t,
      klaim: f.klaim,
      nilai: typeof f.nilai === 'number' || typeof f.nilai === 'string' ? f.nilai : null,
      satuan: f.satuan ?? null,
      turunan_dari: f.turunan_dari ?? [],
      catatan: [],
    })),
    // Kata terlarang tidak dinilai untuk soal manusia (emiten sudah tersamar di kasus tayang).
    kata_terlarang: [],
    disingkirkan: [],
    pemeriksaan: { aturan_dijalankan: 0, aturan_dilewati: 0, temuan: [] },
  };
}

/**
 * `angka_pesan` soal manusia, dipetakan kode: tiap angka (`\d[\d.,]*`, dengan
 * awalan "Rp" dan satuan sesudahnya bila ada) menunjuk fakta pertama — kartu
 * soal dulu, lalu fakta kasus lain — yang memuat angka itu
 * (`angkaTakBerjejak` kosong); bila tidak ada, andaian. Murni.
 */
export function angkaPesanManusia(pesan: string, kartu: readonly string[], paket: PaketFakta): OmonganDraf['angka_pesan'] {
  const urut = [...kartu.map((id) => paket.fakta.find((f) => f.fact_id === id)).filter((f) => f !== undefined), ...paket.fakta.filter((f) => !kartu.includes(f.fact_id))];
  const hasil: OmonganDraf['angka_pesan'] = [];
  for (const m of pesan.matchAll(/(Rp\s?)?\d[\d.,]*(\s?(persen|%|kali|lot|lembar|juta|ribu|miliar|triliun))?/gi)) {
    const teks = m[0].replace(/[.,]+$/, '');
    if (hasil.some((h) => h.teks === teks)) continue;
    const f = urut.find((x) => angkaTakBerjejak(teks, x).length === 0);
    hasil.push(f === undefined ? { teks, andaian: true } : { teks, fact_id: f.fact_id });
  }
  return hasil;
}

export interface SoalKalibrasiM2d8 {
  id: string;
  kelompok: 'manusia' | 'bocor' | 'aman';
  /** Tambahan M2d-6 (dilaporkan terpisah, tidak masuk syarat). */
  tambahan: boolean;
  /** Hasil uji luar (dari jawaban mentah penguji milestone asal); manusia: kalibrasi bundel BM. */
  luar: string;
  omongan: OmonganDraf;
  paket: PaketFakta;
  /** Nomor omongan di simulasi asalnya (1–3). */
  no: number;
}

export function soalManusiaM2d8(): SoalKalibrasiM2d8[] {
  return BERKAS_MANUSIA.flatMap((berkas) => {
    const k = bacaKasus(berkas);
    const paket = paketDariKasus(berkas, k);
    return k.soal.map((s, i) => ({
      id: `${ID_PAKET_KASUS[berkas]}-${s.soal_id}`,
      kelompok: 'manusia' as const,
      tambahan: false,
      luar: 'soal manusia tayang',
      no: i + 1,
      paket,
      omongan: {
        nama: s.pesan.nama,
        jam: s.pesan.jam,
        pesan: s.pesan.isi,
        angka_pesan: angkaPesanManusia(s.pesan.isi, s.kartu, paket),
        kartu: [...s.kartu],
        kartu_penentu: [...s.kartu_penentu],
        pilihan: Object.fromEntries(s.pilihan.map((p) => [p.kunci, p.teks])) as Record<KunciOpsi, string>,
        kunci: s.jawaban,
        penjelasan: s.penjelasan,
      },
    }));
  });
}

/** Paket jalan asal soal himpunan (tersimpan bersama riwayatnya). */
function paketAsal(id: string): PaketFakta {
  const s = SOAL_KALIBRASI.find((x) => x.id === id);
  const jalur = s === undefined ? `${AKAR}eval/keluaran-m2d6/jalan-1/tirt/paket.json` : `${AKAR}eval/keluaran-${s.milestone}/${s.paket}/paket.json`;
  return JSON.parse(readFileSync(jalur, 'utf8')) as PaketFakta;
}

export function soalHimpunanM2d8(): SoalKalibrasiM2d8[] {
  return soalHimpunan().map((s) => ({
    id: s.id,
    kelompok: s.kelompok,
    tambahan: s.tambahan,
    luar: s.luar,
    omongan: s.omongan,
    paket: paketAsal(s.id),
    no: SOAL_KALIBRASI.find((x) => x.id === s.id)?.no ?? Number(/o(\d)$/.exec(s.id)?.[1] ?? 1),
  }));
}

/** Himpunan beku, urutan jalan: manusia → bocor → aman → tambahan (pagu bisa berhenti di tengah). */
export function himpunanBeku(): SoalKalibrasiM2d8[] {
  const h = soalHimpunanM2d8();
  return [
    ...soalManusiaM2d8(),
    ...h.filter((x) => !x.tambahan && x.kelompok === 'bocor'),
    ...h.filter((x) => !x.tambahan && x.kelompok === 'aman'),
    ...h.filter((x) => x.tambahan),
  ];
}

/* ---------------------------------------------------------------------- */
/* gerbang kode                                                            */
/* ---------------------------------------------------------------------- */

export interface ButirKode {
  /** Kode aturan: kode validator (mis. `OPSI_PANJANG_TIMPANG`) atau nama gerbang (`G-kaku`). */
  kode: string;
  alasan: string;
}

/**
 * Kode PELINDUNG: fakta, rujukan, tanggal, emiten, penilaian/ajakan, dan bentuk
 * K-05. Tidak pernah dilonggarkan atau diturunkan (pra-registrasi); bila
 * menolak soal manusia, itu temuan tentang soal itu, dilaporkan.
 */
export const KODE_PELINDUNG: readonly string[] = [
  'SKEMA', 'FAKTA_DI_LUAR_PAKET', 'ANGKA_TAK_COCOK', 'ANGKA_TANPA_RUJUKAN', 'ANGKA_PESAN_TAK_ADA', 'ANGKA_PESAN_TANPA_JEJAK',
  'ANDAIAN_DI_OMONGAN_BETUL', 'HARI_INI_TAK_COCOK', 'TANGGAL_SESUDAH_T', 'EMITEN_TERBUKA', 'KATA_PENILAIAN',
  'AJAKAN_TRANSAKSI', 'KUNCI_TAK_ADA', 'KUNCI_TAK_TERBUKTI_KARTU', 'KARTU_JUMLAH', 'KARTU_KEMBAR', 'PENENTU_JUMLAH', 'PENENTU_BUKAN_KARTU',
  'OPSI_TANPA_LABEL', 'OPSI_TAK_DUA_DUA', 'PESAN_KOSONG', 'G-penilaian',
];

/** Tidak dinilai per soal (pra-registrasi): lihat kepala berkas. */
export const KODE_TAK_BERLAKU: readonly string[] = ['NAMA_TERLARANG'];

/** Pola `KATA_PENILAIAN` validator (`validasi.ts`), disalin persis. */
export const POLA_KATA_PENILAIAN = /(?<![\p{L}])(bagus|jelek|sehat|buruk|murah|mahal)\p{L}*/giu;

/**
 * `KATA_PENILAIAN` validator dengan pengecualian `PENGECUALIAN_PENILAIAN`
 * (G-penilaian, M2d-5 commit 35b30a0: "kabar buruk" menilai kabar, bukan
 * saham) — pengecualian yang sudah ada sebelum milestone ini, diterapkan juga
 * ke kode validator yang memeriksa kata yang sama. Murni.
 */
export function kataPenilaian(o: Pick<OmonganDraf, 'nama' | 'pesan' | 'pilihan' | 'penjelasan'>): string[] {
  const bagian: Array<[string, string]> = [
    ['Nama', o.nama], ['Pesan', o.pesan], ...(['a', 'b', 'c', 'd'] as const).map((h): [string, string] => [`Pilihan ${h}`, o.pilihan[h]]), ['Penjelasan', o.penjelasan],
  ];
  const hasil: string[] = [];
  for (const [tempat, teks] of bagian) {
    for (const c of lepasPengecualian(teksPolos(teks)).matchAll(POLA_KATA_PENILAIAN)) hasil.push(`${tempat} memakai kata penilaian "${c[0]}"; produk ini tidak menilai saham.`);
  }
  return hasil;
}

/** Semua butir gerbang kode untuk satu soal (sebelum aturan kalibrasi). Murni. */
export function gerbangKode(o: OmonganDraf, paket: PaketFakta): ButirKode[] {
  const butir: ButirKode[] = [];
  for (const m of validasiDraf({ omongan: [o] }, paket)) {
    if (m.omongan === null) continue; // kode seluruh-draf tidak dinilai per soal
    if (m.kode === 'KATA_PENILAIAN') continue; // dihitung ulang dengan pengecualian M2d-5 (kataPenilaian)
    butir.push({ kode: m.kode, alasan: m.pesan });
  }
  for (const a of kataPenilaian(o)) butir.push({ kode: 'KATA_PENILAIAN', alasan: a });
  const g = gerbangG(o);
  if (g.angka_cukup.tolak) butir.push({ kode: 'G-angka-cukup', alasan: g.angka_cukup.alasan });
  for (const a of g.kaku.alasan) butir.push({ kode: 'G-kaku', alasan: a });
  const gaya = gerbangGaya(o);
  for (const a of gaya.panjang.alasan) butir.push({ kode: 'G-panjang', alasan: a });
  for (const a of gaya.klausa.alasan) butir.push({ kode: 'G-satu-klausa', alasan: a });
  for (const a of gaya.register.alasan) butir.push({ kode: 'G-register', alasan: a });
  for (const a of periksaRujukanHuruf(o)) butir.push({ kode: 'HURUF_PILIHAN', alasan: a });
  for (const a of gPenilaian(o.pesan).alasan) butir.push({ kode: 'G-penilaian', alasan: a });
  const k = gKembar(o.pilihan);
  for (const x of k.kembar) butir.push({ kode: 'G-pilihan-kembar', alasan: `pilihan ${x.a} dan ${x.b} kemiripan ${x.kemiripan.toFixed(2)}` });
  return butir.filter((b) => !KODE_TAK_BERLAKU.includes(b.kode));
}

/** Teks polos soal untuk tampilan laporan. */
export function ringkasSoal(o: OmonganDraf): string {
  return `${o.nama}: "${teksPolos(o.pesan)}" | ${(['a', 'b', 'c', 'd'] as const).map((h) => `${h}) ${teksPolos(o.pilihan[h])}`).join(' | ')} | kunci ${o.kunci}`;
}
