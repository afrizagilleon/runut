/**
 * Laporan audit gudang (M4a D-4/D-5): `npm run audit:gudang`.
 *
 * Membaca keluaran `npm run verifikasi:gudang` (`.cache/m2b/gudang.json`),
 * rencana audit (`docs/bukti/audit-rencana.json`), hasil pengambilan
 * (`docs/bukti/audit-ambil.json`), kalimat awam tiap aturan (dari
 * `docs/bukti/aturan-gudang.md`, yang ditulis perintah yang sama), dan — bila
 * sudah ada — hasil uji ulang penguji independen
 * (`eval/audit-gudang/hasil-penguji.json`). Menulis `docs/bukti/audit-gudang.md`.
 *
 * Deterministik: tidak ada jam dinding, acak, atau jaringan; dua kali jalan
 * atas masukan yang sama memberi berkas yang sama byte per byte.
 *
 * Aturan angka: setiap angka di laporan dibaca langsung dari `hitungan` dan
 * `temuan` per emiten, dengan penyebutnya (berapa yang diperiksa) di sebelahnya.
 * Kelompok dipisah — suspensi, pembanding, gudang lama — dan tidak dijumlah
 * menjadi klaim tentang pasar.
 */
import { createHash } from 'node:crypto';
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';
import { ATURAN_PENANDA, jumlahAturan } from '../factory/gudang.ts';
import { ATURAN_M4B } from '../factory/verifikasi/v2.ts';
import type { KodeAturan, Temuan } from '../factory/skema/tipe.ts';
import { keparahanTemuan } from '../factory/skema/tipe.ts';
import { AKAR } from './sectors.ts';

export const JALUR_GUDANG_JSON = join(AKAR, '.cache', 'm2b', 'gudang.json');
export const JALUR_ATURAN_MD = join(AKAR, 'docs', 'bukti', 'aturan-gudang.md');
export const JALUR_RENCANA = join(AKAR, 'docs', 'bukti', 'audit-rencana.json');
export const JALUR_AMBIL = join(AKAR, 'docs', 'bukti', 'audit-ambil.json');
export const JALUR_PENGUJI = join(AKAR, 'eval', 'audit-gudang', 'hasil-penguji.json');
export const JALUR_PENGUJI_M4B = join(AKAR, 'eval', 'audit-gudang', 'penguji-m4b', 'hasil.json');
export const JALUR_LAPORAN = join(AKAR, 'docs', 'bukti', 'audit-gudang.md');

/** Paling banyak temuan yang diuji ulang (kontrak D-5). */
export const MAKS_UJI = 30;
export const MAKS_UJI_PER_ATURAN = 3;

export type Kelompok = 'suspensi' | 'pembanding' | 'lama';
export const KELOMPOK: readonly Kelompok[] = ['suspensi', 'pembanding', 'lama'];
const NAMA_KELOMPOK: Record<Kelompok, string> = {
  suspensi: 'kelompok suspensi',
  pembanding: 'kelompok pembanding',
  lama: 'gudang lama (acuan, dipilih tangan)',
};

// --- bentuk masukan (subset gudang.json yang dipakai) --------------------------

export interface HitunganMentah {
  satuan: string;
  diperiksa: number;
  hijau: number;
  merah: number;
  tidak_lengkap: number;
  dilewati: number;
}

export interface PemeriksaanMentah {
  aturan: KodeAturan;
  judul: string;
  dijalankan: boolean;
  hitungan: HitunganMentah;
  temuan: Temuan[];
}

export interface EmitenMentah {
  simbol: string;
  berkas: string[];
  jumlah: { laporan: number; harga: number; suspensi: number };
  pemeriksaan: PemeriksaanMentah[];
}

export interface GudangMentah {
  ringkasan_gudang: { berkas: number; emiten: number };
  berkas_paginasi_kosong: string[];
  emiten: EmitenMentah[];
  agregat: Array<{ aturan: KodeAturan; judul: string; satuan: string }>;
}

export interface RencanaMentah {
  gudang_lama: string[];
  kelompok_suspensi: string[];
  kelompok_pembanding: string[];
}

/** Hasil uji ulang D-5 (ditulis tangan dari jawaban mentah penguji; lihat eval/audit-gudang/). */
export interface UjiUlang {
  id: string;
  aturan: KodeAturan;
  simbol: string;
  kelompok: Kelompok;
  temuan_id: string;
  /** Jawaban penguji atas temuan sebelum perbaikan apa pun. */
  sebelum: 'ya' | 'tidak' | 'ragu';
  /** Kesimpulan penyelidikan eksekutor bila jawabannya bukan "ya". */
  penyelidikan: string | null;
  /**
   * Keadaan sesudah perbaikan: jawaban penguji atas temuan yang masih
   * dikeluarkan aturan, atau `hilang` bila perbaikan bug aturan membuat
   * temuan ini tidak lagi keluar.
   */
  sesudah: 'ya' | 'tidak' | 'ragu' | 'hilang';
}

export interface HasilPenguji {
  keterangan: string;
  uji: UjiUlang[];
}

/**
 * Hasil uji ulang M4b (`eval/audit-gudang/penguji-m4b/hasil.json`): temuan
 * aturan baru R36/R37 dan temuan R23 yang masih keluar sesudah perbaikan M4b.
 * Satu jawaban per uji, tanpa tahap sebelum/sesudah.
 */
export interface UjiM4b {
  id: string;
  aturan: KodeAturan;
  simbol: string;
  temuan_id: string;
  tahap: string;
  jawaban: 'ya' | 'tidak' | 'ragu';
  penyelidikan: string | null;
}

export interface HasilPengujiM4b {
  keterangan: string;
  uji: UjiM4b[];
}

// --- kalimat awam --------------------------------------------------------------

/** Ambil judul dan kalimat awam tiap aturan dari `docs/bukti/aturan-gudang.md`. */
export function bacaKalimatAwam(md: string): Map<string, { judul: string; kalimat: string }> {
  const keluar = new Map<string, { judul: string; kalimat: string }>();
  const baris = md.split(/\r?\n/);
  for (let i = 0; i < baris.length; i += 1) {
    const cocok = /^### (R\w+) — (.+)$/.exec(baris[i] ?? '');
    if (!cocok?.[1] || !cocok[2]) continue;
    let j = i + 1;
    while (j < baris.length && (baris[j] ?? '').trim() === '') j += 1;
    keluar.set(cocok[1], { judul: cocok[2], kalimat: (baris[j] ?? '').trim() });
  }
  return keluar;
}

// --- susun ---------------------------------------------------------------------

export interface AngkaKelompok {
  emiten: number;
  emiten_diperiksa: number;
  emiten_merah: string[];
  diperiksa: number;
  merah: number;
  tidak_lengkap: number;
  temuan: number;
  temuan_konflik: number;
}

export interface BarisAturan {
  aturan: KodeAturan;
  judul: string;
  kalimat: string;
  penanda: boolean;
  satuan: string;
  per: Record<Kelompok, AngkaKelompok>;
}

export interface Contoh {
  aturan: KodeAturan;
  simbol: string;
  kelompok: Kelompok;
  temuan: Temuan;
}

export interface Audit {
  kelompok: Record<Kelompok, string[]>;
  penyebut: Record<Kelompok, { emiten: number; berkas: number; laporan: number; harga: number; suspensi: number; aksi: number }>;
  aturan: BarisAturan[];
  /** Emiten yang punya sedikitnya satu temuan berkeparahan konflik dari aturan penolak. */
  emiten_konflik: Record<Kelompok, Array<{ simbol: string; aturan: KodeAturan[] }>>;
  temuan_audit: Contoh[];
  paginasi_kosong: string[];
  /**
   * M3.13 A-1.2: respons kosong MILIK tiap emiten menurut R25 (endpoint asal di
   * manifest menyebut simbolnya), seluruh gudang; hanya emiten dengan >= 1.
   */
  r25_kosong_milik: Array<{ simbol: string; jumlah: number }>;
}

export function kelompokDari(rencana: RencanaMentah): Map<string, Kelompok> {
  const peta = new Map<string, Kelompok>();
  for (const s of rencana.gudang_lama) peta.set(s, 'lama');
  for (const s of rencana.kelompok_suspensi) peta.set(s, 'suspensi');
  for (const s of rencana.kelompok_pembanding) peta.set(s, 'pembanding');
  return peta;
}

function angkaKosong(emiten: number): AngkaKelompok {
  return {
    emiten,
    emiten_diperiksa: 0,
    emiten_merah: [],
    diperiksa: 0,
    merah: 0,
    tidak_lengkap: 0,
    temuan: 0,
    temuan_konflik: 0,
  };
}

export function susunAudit(
  gudang: GudangMentah,
  rencana: RencanaMentah,
  kalimat: Map<string, { judul: string; kalimat: string }>,
): Audit {
  const peta = kelompokDari(rencana);
  const kelompok: Record<Kelompok, string[]> = {
    suspensi: [...rencana.kelompok_suspensi],
    pembanding: [...rencana.kelompok_pembanding],
    lama: [...rencana.gudang_lama],
  };
  const penyebut = Object.fromEntries(
    KELOMPOK.map((k) => [k, { emiten: kelompok[k].length, berkas: 0, laporan: 0, harga: 0, suspensi: 0, aksi: 0 }]),
  ) as Audit['penyebut'];
  const emiten_konflik: Audit['emiten_konflik'] = { suspensi: [], pembanding: [], lama: [] };
  const temuan_audit: Contoh[] = [];

  const urutan = gudang.agregat.map((a) => a.aturan);
  const baris = new Map<KodeAturan, BarisAturan>();
  for (const a of gudang.agregat) {
    const k = kalimat.get(a.aturan);
    baris.set(a.aturan, {
      aturan: a.aturan,
      judul: k?.judul ?? a.judul,
      kalimat: k?.kalimat ?? a.judul,
      penanda: ATURAN_PENANDA.includes(a.aturan),
      satuan: a.satuan,
      per: {
        suspensi: angkaKosong(kelompok.suspensi.length),
        pembanding: angkaKosong(kelompok.pembanding.length),
        lama: angkaKosong(kelompok.lama.length),
      },
    });
  }

  const emitenUrut = [...gudang.emiten].sort((a, b) => (a.simbol < b.simbol ? -1 : a.simbol > b.simbol ? 1 : 0));
  for (const e of emitenUrut) {
    const k = peta.get(e.simbol);
    if (k === undefined) continue;
    const p = penyebut[k];
    p.berkas += e.berkas.length;
    p.laporan += e.jumlah.laporan;
    p.harga += e.jumlah.harga;
    p.suspensi += e.jumlah.suspensi;
    const konflikAturan: KodeAturan[] = [];
    for (const pem of e.pemeriksaan) {
      if (pem.aturan === 'R34') p.aksi += pem.hitungan.diperiksa;
      const b = baris.get(pem.aturan);
      if (b === undefined) continue;
      const a = b.per[k];
      if (pem.dijalankan && pem.hitungan.diperiksa > 0) a.emiten_diperiksa += 1;
      if (pem.hitungan.merah > 0) a.emiten_merah.push(e.simbol);
      a.diperiksa += pem.hitungan.diperiksa;
      a.merah += pem.hitungan.merah;
      a.tidak_lengkap += pem.hitungan.tidak_lengkap;
      a.temuan += pem.temuan.length;
      const konflik = pem.temuan.filter((t) => keparahanTemuan(t) === 'konflik').length;
      a.temuan_konflik += konflik;
      if (!b.penanda && konflik > 0) konflikAturan.push(pem.aturan);
      if (k !== 'lama') {
        for (const t of pem.temuan) temuan_audit.push({ aturan: pem.aturan, simbol: e.simbol, kelompok: k, temuan: t });
      }
    }
    if (konflikAturan.length > 0) emiten_konflik[k].push({ simbol: e.simbol, aturan: konflikAturan });
  }

  return {
    kelompok,
    penyebut,
    aturan: urutan.map((a) => baris.get(a)!).filter((b) => b !== undefined),
    emiten_konflik,
    temuan_audit,
    paginasi_kosong: [...gudang.berkas_paginasi_kosong],
    r25_kosong_milik: gudang.emiten
      .map((e) => ({
        simbol: e.simbol,
        jumlah:
          e.pemeriksaan
            .find((p) => p.aturan === 'R25')
            ?.temuan.flatMap((t) => t.angka)
            .find((a) => a.label.startsWith('respons kosong'))?.nilai ?? 0,
      }))
      .filter((x) => x.jumlah > 0)
      .sort((a, b) => a.simbol.localeCompare(b.simbol)),
  };
}

// --- D-5: pilih temuan untuk diuji ulang --------------------------------------

function sidik(teks: string): string {
  return createHash('sha256').update(teks).digest('hex');
}

/**
 * Pilih paling banyak 30 temuan dari 42 emiten audit, deterministik:
 *
 * 1. tiap aturan yang punya temuan mendapat satu tempat;
 * 2. sisa tempat dibagi ke aturan **penolak** (yang klaimnya "bertentangan"),
 *    yang temuannya paling banyak lebih dulu (seri: kode aturan), satu per
 *    putaran, paling banyak 3 per aturan;
 * 3. di dalam satu aturan, temuan diurutkan menurut
 *    sha256(`aturan|simbol|temuan_id`) dan diambil dari atas.
 *
 * Bila aturan yang punya temuan lebih dari 30, yang diambil adalah penolak
 * dulu (menurut jumlah temuan), lalu penanda — dan kekurangannya dilaporkan.
 */
export function pilihUjiUlang(audit: Audit): Contoh[] {
  const perAturan = new Map<KodeAturan, Contoh[]>();
  for (const c of audit.temuan_audit) {
    const daftar = perAturan.get(c.aturan) ?? [];
    daftar.push(c);
    perAturan.set(c.aturan, daftar);
  }
  for (const daftar of perAturan.values()) {
    daftar.sort((a, b) => {
      const x = sidik(`${a.aturan}|${a.simbol}|${a.temuan.temuan_id}`);
      const y = sidik(`${b.aturan}|${b.simbol}|${b.temuan.temuan_id}`);
      return x < y ? -1 : x > y ? 1 : 0;
    });
  }
  const penanda = (a: KodeAturan) => ATURAN_PENANDA.includes(a);
  const urutPrioritas = [...perAturan.keys()].sort((a, b) => {
    if (penanda(a) !== penanda(b)) return penanda(a) ? 1 : -1;
    const selisih = (perAturan.get(b)?.length ?? 0) - (perAturan.get(a)?.length ?? 0);
    return selisih !== 0 ? selisih : a < b ? -1 : a > b ? 1 : 0;
  });
  const jatah = new Map<KodeAturan, number>();
  let sisa = MAKS_UJI;
  for (const a of urutPrioritas) {
    if (sisa === 0) break;
    jatah.set(a, 1);
    sisa -= 1;
  }
  let bertambah = true;
  while (sisa > 0 && bertambah) {
    bertambah = false;
    for (const a of urutPrioritas) {
      if (sisa === 0) break;
      if (penanda(a)) continue;
      const kini = jatah.get(a) ?? 0;
      if (kini >= MAKS_UJI_PER_ATURAN || kini >= (perAturan.get(a)?.length ?? 0)) continue;
      jatah.set(a, kini + 1);
      sisa -= 1;
      bertambah = true;
    }
  }
  const urutAsli = audit.aturan.map((b) => b.aturan);
  return [...jatah.entries()]
    .sort((a, b) => urutAsli.indexOf(a[0]) - urutAsli.indexOf(b[0]))
    .flatMap(([a, n]) => (perAturan.get(a) ?? []).slice(0, n));
}

// --- tulis ---------------------------------------------------------------------

const angka = (n: number): string => new Intl.NumberFormat('id-ID').format(n);

function pecahan(merah: number, diperiksa: number): string {
  return diperiksa === 0 ? '—' : `${angka(merah)} / ${angka(diperiksa)}`;
}

/**
 * Aturan yang tidak boleh dikutip: sedikitnya satu sampel uji ulangnya masih
 * dibantah penguji — sesudah perbaikan M4a, atau pada uji ulang M4b.
 */
export function aturanDibantah(penguji: HasilPenguji | null, m4b: HasilPengujiM4b | null = null): Set<KodeAturan> {
  const keluar = new Set<KodeAturan>();
  for (const u of penguji?.uji ?? []) if (u.sesudah === 'tidak') keluar.add(u.aturan);
  for (const u of m4b?.uji ?? []) if (u.jawaban === 'tidak') keluar.add(u.aturan);
  return keluar;
}

/**
 * Catatan kutip dari review reviewer M4a §10, ditulis di samping kalimat yang
 * boleh dipakai — bukan larangan, tetapi syarat membaca angkanya.
 */
const CATATAN_KUTIP: Partial<Record<KodeAturan, string>> = {
  R17B:
    'catatan reviewer M4a: transaksi pasar negosiasi bisa sah di luar rentang pasar reguler — jangan ' +
    'dikutip sebagai "bertentangan" sebelum dicek pakar',
};

export function kesepakatan(penguji: HasilPenguji, tahap: 'sebelum' | 'sesudah') {
  const uji = penguji.uji.filter((u) => (tahap === 'sebelum' ? true : u.sesudah !== 'hilang'));
  const jawab = uji.map((u) => (tahap === 'sebelum' ? u.sebelum : u.sesudah));
  return {
    diuji: uji.length,
    ya: jawab.filter((j) => j === 'ya').length,
    tidak: jawab.filter((j) => j === 'tidak').length,
    ragu: jawab.filter((j) => j === 'ragu').length,
    hilang: tahap === 'sesudah' ? penguji.uji.filter((u) => u.sesudah === 'hilang').length : 0,
  };
}

export function susunLaporan(
  audit: Audit,
  masukan: {
    kredit: { terpakai_sejak_pembuka: number; terpakai_total: number } | null;
    penguji: HasilPenguji | null;
    pilihan: Contoh[];
    /** Hasil uji ulang M4b; tidak ada = belum dijalankan. */
    penguji_m4b?: HasilPengujiM4b | null;
  },
): string {
  const b: string[] = [];
  const m4b = masukan.penguji_m4b ?? null;
  const { suspensi, pembanding, lama } = audit.penyebut;
  b.push('# Audit gudang: aturan verifikasi atas 42 emiten yang dipilih dengan aturan tetap');
  b.push('');
  b.push(
    'Berkas ini ditulis oleh `npm run audit:gudang` dari keluaran `npm run verifikasi:gudang` ' +
      '(`.cache/m2b/gudang.json`), rencana `docs/bukti/audit-rencana.json`, dan hasil uji ulang ' +
      '`eval/audit-gudang/hasil-penguji.json`. Jangan disunting tangan. Tidak membaca jaringan, ' +
      'jam dinding, maupun angka acak.',
  );
  b.push('');
  b.push('## Apa yang diaudit');
  b.push('');
  b.push(
    'Emiten dipilih **sebelum** datanya diambil, dengan aturan tetap (`docs/bukti/audit-rencana.md`): ' +
      '28 emiten yang disuspensi pada 2025–2026 (urut simbol dari atas) dan 14 pembanding yang ' +
      'tidak ada di daftar suspensi (urut sha256 simbol). Gudang lama — 15 emiten yang dulu dipilih ' +
      'tangan — ditampilkan hanya sebagai acuan dan tidak dijumlahkan dengan keduanya.',
  );
  b.push('');
  b.push(jumlahAturan());
  if (masukan.kredit !== null) {
    b.push('');
    b.push(
      `Kredit Sectors yang dipakai audit: **${angka(masukan.kredit.terpakai_sejak_pembuka)}** ` +
        `(buku kas: ${angka(masukan.kredit.terpakai_total)} termasuk saldo pembuka 113; pagu 613).`,
    );
  }
  b.push('');
  b.push('| penyebut | kelompok suspensi | kelompok pembanding | gudang lama (acuan) |');
  b.push('|---|---:|---:|---:|');
  for (const [label, kunci] of [
    ['emiten', 'emiten'],
    ['laporan kepemilikan unik', 'laporan'],
    ['hari harga (baris harga unik)', 'harga'],
    ['baris suspensi', 'suspensi'],
    ['aksi korporasi (dividen, pemecahan, right issue, bonus)', 'aksi'],
  ] as const) {
    b.push(`| ${label} | ${angka(suspensi[kunci])} | ${angka(pembanding[kunci])} | ${angka(lama[kunci])} |`);
  }
  b.push('');
  b.push('### Keterbatasan sampel');
  b.push('');
  b.push(
    '- **Bukan sampel acak seluruh bursa.** Kelompok suspensi diambil dari atas menurut abjad ' +
      '(AGAR–BCIC, 28 dari 270 kandidat). Kelompok pembanding diambil dari 200 simbol pertama menurut ' +
      'abjad (AADI–CASH) dari 962 — satu panggilan daftar paling banyak 200 baris. Keduanya berasal ' +
      'dari awal abjad. Angka di bawah menggambarkan 42 emiten ini, bukan pasar.',
  );
  b.push(
    '- "Tidak pernah disuspensi" berarti tidak ada di daftar suspensi cache (2024-02-01 s.d. ' +
      '2026-09-17); suspensi sebelum itu tidak terlihat.',
  );
  b.push(
    '- Harga harian hanya 1–4 jendela 90 hari per emiten, di sekitar tanggal penting; ' +
      'aturan yang butuh harga di luar jendela itu mencatat "tidak lengkap", bukan "hijau".',
  );
  b.push(
    '- 14 emiten pembanding terlalu sedikit untuk menyimpulkan beda antarkelompok: selisih ' +
      'satu-dua emiten sudah mengubah persentasenya jauh.',
  );
  b.push('');

  b.push('## Ringkasan: emiten dengan angka yang bertentangan');
  b.push('');
  b.push(
    'Emiten yang punya sedikitnya satu temuan **berkeparahan konflik** dari aturan **penolak** ' +
      '(dua angka di data yang sama saling bertentangan). Aturan penanda tidak dihitung di sini.',
  );
  b.push('');
  b.push('| kelompok | emiten berkonflik | penyebut | emiten |');
  b.push('|---|---:|---:|---|');
  for (const k of KELOMPOK) {
    const d = audit.emiten_konflik[k];
    b.push(
      `| ${NAMA_KELOMPOK[k]} | ${angka(d.length)} | ${angka(audit.kelompok[k].length)} | ` +
        `${d.length === 0 ? '—' : d.map((x) => `${x.simbol} (${x.aturan.join(', ')})`).join('; ')} |`,
    );
  }
  b.push('');

  const dibantahAwal = aturanDibantah(masukan.penguji, m4b);
  if (masukan.penguji !== null && dibantahAwal.size > 0) {
    const tanpa = (k: Kelompok) =>
      audit.emiten_konflik[k].filter((x) => x.aturan.some((r) => !dibantahAwal.has(r))).length;
    b.push('');
    b.push(
      `Tanpa aturan yang sampelnya masih dibantah penguji independen (${[...dibantahAwal].sort().join(', ')}): ` +
        `kelompok suspensi ${angka(tanpa('suspensi'))} dari ${angka(audit.kelompok.suspensi.length)}, ` +
        `kelompok pembanding ${angka(tanpa('pembanding'))} dari ${angka(audit.kelompok.pembanding.length)}, ` +
        `gudang lama ${angka(tanpa('lama'))} dari ${angka(audit.kelompok.lama.length)}.`,
    );
  }
  b.push('');
  b.push('## Hasil per aturan');
  b.push('');
  b.push(
    'Sel = merah / diperiksa, dalam satuan aturan itu. "Emiten" = emiten merah / emiten yang ' +
      'benar-benar diperiksa aturan itu. Untuk aturan **penolak**, merah = bertentangan; untuk ' +
      'aturan **penanda**, merah = perlu dijelaskan sebelum dipakai, bukan salah.',
  );
  b.push('');
  b.push('| aturan | jenis | satuan | suspensi | emiten | pembanding | emiten | gudang lama | emiten |');
  b.push('|---|---|---|---:|---:|---:|---:|---:|---:|');
  for (const a of audit.aturan) {
    const s = a.per.suspensi;
    const p = a.per.pembanding;
    const l = a.per.lama;
    b.push(
      `| ${a.aturan} | ${a.penanda ? 'penanda' : 'penolak'} | ${a.satuan} | ${pecahan(s.merah, s.diperiksa)} | ` +
        `${pecahan(s.emiten_merah.length, s.emiten_diperiksa)} | ${pecahan(p.merah, p.diperiksa)} | ` +
        `${pecahan(p.emiten_merah.length, p.emiten_diperiksa)} | ${pecahan(l.merah, l.diperiksa)} | ` +
        `${pecahan(l.emiten_merah.length, l.emiten_diperiksa)} |`,
    );
  }
  b.push('');

  const dibantah = aturanDibantah(masukan.penguji, m4b);
  const ujiPer = new Map<string, UjiUlang[]>();
  for (const u of masukan.penguji?.uji ?? []) ujiPer.set(u.aturan, [...(ujiPer.get(u.aturan) ?? []), u]);
  const ujiM4bPer = new Map<string, UjiM4b[]>();
  for (const u of m4b?.uji ?? []) ujiM4bPer.set(u.aturan, [...(ujiM4bPer.get(u.aturan) ?? []), u]);

  b.push('## Rincian per aturan (hanya yang punya temuan di 42 emiten audit)');
  b.push('');
  for (const a of audit.aturan) {
    const s = a.per.suspensi;
    const p = a.per.pembanding;
    if (s.temuan + p.temuan === 0) continue;
    b.push(`### ${a.aturan} — ${a.judul} (${a.penanda ? 'penanda' : 'penolak'})`);
    b.push('');
    b.push(a.kalimat);
    b.push('');
    for (const [k, x] of [
      ['suspensi', s],
      ['pembanding', p],
    ] as const) {
      b.push(
        `- ${NAMA_KELOMPOK[k]}: ${angka(x.merah)} dari ${angka(x.diperiksa)} ${a.satuan} ` +
          `${a.penanda ? 'ditandai' : 'bertentangan'}, ${angka(x.tidak_lengkap)} tidak cukup data; ` +
          `${angka(x.temuan)} temuan di ${angka(x.emiten_merah.length)} dari ${angka(x.emiten_diperiksa)} emiten ` +
          `yang diperiksa${x.emiten_merah.length > 0 ? ` (${x.emiten_merah.join(', ')})` : ''}.`,
      );
    }
    const uji = ujiPer.get(a.aturan) ?? [];
    if (uji.length > 0) {
      const ya = uji.filter((u) => u.sebelum === 'ya').length;
      b.push(
        `- uji ulang penguji independen: ${ya} dari ${uji.length} sampel dijawab "ya" ` +
          `(${uji.map((u) => `${u.id} ${u.simbol}: ${u.sebelum}${u.sesudah !== u.sebelum ? ` → ${u.sesudah}` : ''}`).join('; ')}).`,
      );
    }
    const ujiBaru = ujiM4bPer.get(a.aturan) ?? [];
    if (ujiBaru.length > 0) {
      const ya = ujiBaru.filter((u) => u.jawaban === 'ya').length;
      b.push(
        `- uji ulang M4b: ${ya} dari ${ujiBaru.length} sampel dijawab "ya" ` +
          `(${ujiBaru.map((u) => `${u.id} ${u.simbol}: ${u.jawaban}`).join('; ')}).`,
      );
    }
    const contoh = audit.temuan_audit
      .filter((c) => c.aturan === a.aturan)
      .sort((x, y) => {
        const kx = keparahanTemuan(x.temuan) === 'konflik' ? 0 : 1;
        const ky = keparahanTemuan(y.temuan) === 'konflik' ? 0 : 1;
        return kx - ky || KELOMPOK.indexOf(x.kelompok) - KELOMPOK.indexOf(y.kelompok) || (x.simbol < y.simbol ? -1 : x.simbol > y.simbol ? 1 : 0);
      });
    const dipilih: Contoh[] = [];
    for (const k of ['suspensi', 'pembanding'] as const) {
      const c = contoh.find((x) => x.kelompok === k);
      if (c !== undefined) dipilih.push(c);
    }
    if (dipilih.length > 0) {
      b.push('');
      b.push('Contoh:');
      for (const c of dipilih) b.push(`- **${c.simbol}** (${c.kelompok}) — ${c.temuan.ringkasan}`);
    }
    b.push('');
  }

  b.push('## Temuan tentang aturannya sendiri');
  b.push('');
  b.push('### R25 menghitung respons kosong milik emiten lain (salah cakupan aturan) — diperbaiki di M3.13');
  b.push('');
  {
    const milik = audit.r25_kosong_milik;
    const jumlahMilik = milik.reduce((j, x) => j + x.jumlah, 0);
    b.push(
      'Sampai M3.13 setiap temuan R25 menyebut "respons kosong yang tidak bisa dialamatkan ke emiten mana pun" ' +
        'untuk **seluruh gudang**, bukan untuk emiten yang diperiksa (audit M4a: 21 berkas untuk setiap emiten, ' +
        'termasuk kasus tayang ULTJ). Sejak M3.13 (D-3 dan Amandemen A-1.2) R25 hanya menghitung respons kosong ' +
        'yang endpoint asalnya di `docs/bukti/gudang-manifest.json` (`path_endpoint`) menyebut simbol emiten itu; ' +
        'respons kosong yang asalnya tidak tercatat tidak dihitung untuk emiten mana pun. Jalur `build:case` dan ' +
        '`verifikasi:gudang` memakai aturan cakupan yang sama.',
    );
    b.push('');
    b.push(
      `Di gudang sekarang: ${angka(audit.paginasi_kosong.length)} respons kosong; ${angka(jumlahMilik)} di ` +
        `antaranya teralamatkan ke emitennya, di ${angka(milik.length)} emiten` +
        (milik.length === 0 ? '.' : ` (${milik.map((x) => `${x.simbol} ${angka(x.jumlah)}`).join(', ')}).`) +
        ' Kasus tayang ULTJ: 0 (ketiga respons kosong gudang beku tidak tercatat asalnya).',
    );
    b.push('');
    b.push(
      '**Usulan perbaikan yang belum diterapkan:** membaca parameter permintaan dari manifest untuk menyatakan ' +
        'halaman laporan habis (`has_next: false` + parameter tercatat); R25 masih menjawab "tidak lengkap".',
    );
  }
  b.push('');

  b.push('### Bug aturan yang dibuktikan uji ulang (D-5)');
  b.push('');
  b.push(
    '- **Diperbaiki di M4a** (tes merah dulu di `factory/verifikasi/audit-m4a.test.ts`, kasus tayang ' +
      'tetap byte-identik): R14/R16 mengurutkan dua laporan bercap waktu dan PDF sama menurut urutan ' +
      'baris respons API, bukan sambungan saldonya (BCIC, BAJA); R17B mengadu butir pengalihan berharga ' +
      'Rp0 dengan rentang harga pasar (BBMD); R31 menolak angka RUPS yang ditulis dua desimal (Rp7.61) ' +
      'padahal medan dividennya 7,61106 (BNII).',
  );
  b.push(
    '- **Diperbaiki di M4b — R23 (U26):** laba di keputusan RUPS ASLC sama persis dengan ' +
      '`earnings_before_tax − tax` di laporan keuangan yang sama, tetapi R23 hanya mengadunya dengan ' +
      '`earnings` (laba yang diatribusikan ke induk). Sekarang R23 hijau bila angka RUPS sama dengan salah ' +
      'satu dari keduanya, dan temuan merahnya menyebut keduanya (M4b T-04, tes merah dulu di ' +
      '`factory/verifikasi/aturan-audit.test.ts`; kasus tayang tetap byte-identik).',
  );
  const r23Sisa = (m4b?.uji ?? []).filter((u) => u.aturan === 'R23');
  if (r23Sisa.length > 0) {
    b.push(
      `- **Terbukti, belum diperbaiki — R23 sisa:** ${angka(r23Sisa.length)} temuan R23 yang masih keluar ` +
        'sesudah perbaikan diuji ulang di M4b dan semuanya dibantah: ' +
        r23Sisa.map((u) => `${u.id} ${u.simbol} (${u.jawaban})`).join(', ') +
        '. Sebabnya dua bug lain di R23: kata skala di teks RUPS ("Rp1.74 trillion") tidak dibaca, dan ' +
        'angka RUPS sampai rupiah dibandingkan persis dengan medan keuangan yang ditulis dalam satuan juta. ' +
        'Usulan: baca kata skala, lalu bandingkan pada presisi yang lebih kasar dari kedua angka (cara R31 ' +
        'di M4a). Sampai itu, R23 tidak dikutip.',
    );
  }
  b.push(
    '- **Kalimat awam R19b kurang tepat:** aturannya sengaja memakai jendela lunak (9 dari 10 hari datar) ' +
      'dan temuannya menyebutnya, tetapi kalimat awamnya berbunyi "tiap harinya".',
  );
  b.push('');
  b.push('## Aturan baru M4b: dua jenis salah nyata yang dulu tidak ditangkap');
  b.push('');
  b.push(
    'Uji ulang M4a menemukan dua jenis salah nyata yang tidak ditangkap aturan mana pun. Di M4a keduanya ' +
      'ditahan, karena mendaftarkan satu aturan saja di `ATURAN_V2` mengubah berkas kasus ULTJ yang sedang ' +
      'tayang. M4b membekukan daftar aturan tiap kasus tayang (`docs/bukti/aturan-beku-kasus.json`): kasus ' +
      'tayang hanya menjalankan aturan yang dipakai saat ia dibekukan, jadi aturan baru bisa ditambah tanpa ' +
      'menggeser DADA maupun ULTJ. Kedua jenis itu sekarang aturan:',
  );
  b.push('');
  const asal: Partial<Record<KodeAturan, string>> = {
    R36:
      'dari U18: laporan bersimbol ADRO.JK berjudul "Alamtri Resources Indonesia Buy Transaction of Alamtri ' +
      'Minerals Indonesia". Ini cakupan R6 lama ("laporannya ternyata bercerita tentang saham lain") yang ' +
      'hilang ketika R6 digantikan R17B, yang hanya memeriksa harga. Penolak karena dua syarat: judulnya ' +
      'menyebut perusahaan lain DAN penyebut tersirat persennya meleset lebih dari 10% dari saham beredar ' +
      'emiten di semua sisi laporan. Nama beda dengan angka milik emiten (nama lama, ejaan) tetap hijau; ' +
      'judul yang menyebut pemegangnya sendiri (FOLK) tidak lengkap, bukan merah.',
    R37:
      'dari U28: ABMM tahun buku 2023 menulis total_debt 16 triliun padahal total_liabilities 1,4 miliar. ' +
      'Penolak, karena dua angka di baris yang sama bertentangan menurut definisinya. Hanya tiga hubungan ' +
      'yang terbukti dilanggar di gudang dan berlaku menurut definisi (PSAK 201/IAS 1 par. 54, 66, 69; ' +
      'PSAK 207/IAS 7 par. 6–7): total_debt ≤ total_liabilities, cash_and_equivalents ≤ total_assets, ' +
      'cash_and_equivalents ≤ current_assets.',
  };
  for (const a of audit.aturan.filter((x) => ATURAN_M4B.includes(x.aturan))) {
    b.push(`### ${a.aturan} — ${a.judul} (${a.penanda ? 'penanda' : 'penolak'})`);
    b.push('');
    b.push(a.kalimat);
    b.push('');
    const catatanAsal = asal[a.aturan];
    if (catatanAsal !== undefined) {
      b.push(`Asal: ${catatanAsal}`);
      b.push('');
    }
    for (const k of KELOMPOK) {
      const x = a.per[k];
      b.push(
        `- ${NAMA_KELOMPOK[k]}: ${angka(x.merah)} dari ${angka(x.diperiksa)} ${a.satuan} bertentangan, ` +
          `${angka(x.tidak_lengkap)} tidak cukup data; ${angka(x.emiten_merah.length)} dari ` +
          `${angka(x.emiten_diperiksa)} emiten yang diperiksa` +
          `${x.emiten_merah.length > 0 ? ` (${x.emiten_merah.join(', ')})` : ''}.`,
      );
    }
    const ujiBaru = ujiM4bPer.get(a.aturan) ?? [];
    if (ujiBaru.length > 0) {
      b.push(
        `- uji ulang penguji independen M4b: ${angka(ujiBaru.filter((u) => u.jawaban === 'ya').length)} dari ` +
          `${angka(ujiBaru.length)} temuan dijawab "ya" (${ujiBaru.map((u) => `${u.id} ${u.simbol}: ${u.jawaban}`).join('; ')}).`,
      );
    }
    b.push('');
  }

  b.push('## Uji ulang oleh penguji independen (D-5)');
  b.push('');
  if (masukan.penguji === null) {
    b.push(`Belum dijalankan. ${angka(masukan.pilihan.length)} temuan terpilih untuk diuji (lihat \`eval/audit-gudang/pilihan.json\`).`);
  } else {
    const sb = kesepakatan(masukan.penguji, 'sebelum');
    const sd = kesepakatan(masukan.penguji, 'sesudah');
    b.push(
      'Tiap temuan terpilih diberikan ke subagent Claude Opus baru yang hanya menerima potongan ' +
        'respons mentah Sectors dan kalimat awam aturannya — bukan kode, bukan ringkasan temuan kami. ' +
        'Pertanyaannya: apakah data ini benar-benar tidak konsisten seperti kata kalimat itu? ' +
        'Jawaban mentahnya ada di `eval/audit-gudang/penguji/`.',
    );
    b.push('');
    b.push('| tahap | diuji | ya | tidak | ragu | temuan hilang karena aturan diperbaiki |');
    b.push('|---|---:|---:|---:|---:|---:|');
    b.push(`| sebelum perbaikan | ${sb.diuji} | ${sb.ya} | ${sb.tidak} | ${sb.ragu} | — |`);
    b.push(`| sesudah perbaikan (M4a dan M4b) | ${sd.diuji} | ${sd.ya} | ${sd.tidak} | ${sd.ragu} | ${sd.hilang} |`);
    b.push('');
    b.push('| uji | aturan | emiten | kelompok | sebelum | sesudah |');
    b.push('|---|---|---|---|---|---|');
    for (const u of masukan.penguji.uji) {
      b.push(`| ${u.id} | ${u.aturan} | ${u.simbol} | ${u.kelompok} | ${u.sebelum} | ${u.sesudah} |`);
    }
    const diselidiki = masukan.penguji.uji.filter((u) => u.penyelidikan !== null);
    if (diselidiki.length > 0) {
      b.push('');
      b.push('Penyelidikan tiap jawaban yang bukan "ya":');
      b.push('');
      for (const u of diselidiki) b.push(`- **${u.id} ${u.aturan} ${u.simbol}** (${u.sebelum} → ${u.sesudah}) — ${u.penyelidikan}`);
    }
  }
  if (m4b !== null) {
    b.push('');
    b.push('### Uji ulang M4b');
    b.push('');
    b.push(
      'Cara yang sama, subagent Claude Opus baru per temuan, bahan ditempel langsung di prompt (penguji tidak ' +
        'membuka berkas). Yang diuji: semua temuan aturan baru R36 dan R37 di gudang audit (paling banyak 3 per ' +
        'aturan), dan temuan R23 yang masih keluar sesudah perbaikannya. Jawaban mentah di ' +
        '`eval/audit-gudang/penguji-m4b/`.',
    );
    b.push('');
    b.push('| uji | aturan | emiten | tahap | jawaban |');
    b.push('|---|---|---|---|---|');
    for (const u of m4b.uji) b.push(`| ${u.id} | ${u.aturan} | ${u.simbol} | ${u.tahap} | ${u.jawaban} |`);
    const baru = m4b.uji.filter((u) => ATURAN_M4B.includes(u.aturan));
    b.push('');
    b.push(
      `Kesepakatan atas aturan baru: ${angka(baru.filter((u) => u.jawaban === 'ya').length)} dari ` +
        `${angka(baru.length)} "ya".`,
    );
    const diselidikiM4b = m4b.uji.filter((u) => u.penyelidikan !== null);
    if (diselidikiM4b.length > 0) {
      b.push('');
      for (const u of diselidikiM4b) b.push(`- **${u.id} ${u.aturan} ${u.simbol}** (${u.jawaban}) — ${u.penyelidikan}`);
    }
  }
  b.push('');

  b.push('## Kalimat yang boleh dipakai di video/README');
  b.push('');
  if (masukan.penguji === null) {
    b.push('Belum ada: menunggu uji ulang penguji independen (D-5).');
  } else {
    b.push(
      'Hanya aturan **penolak** yang punya temuan di 42 emiten audit dan tidak satu pun sampelnya ' +
        'masih dibantah penguji. Angkanya langsung dari tabel di atas, dengan penyebutnya. Ini ' +
        'kalimat tentang 42 emiten ini, bukan tentang pasar.',
    );
    b.push('');
    const ks = audit.emiten_konflik.suspensi.filter((x) => x.aturan.some((r) => !dibantah.has(r))).length;
    const kp = audit.emiten_konflik.pembanding.filter((x) => x.aturan.some((r) => !dibantah.has(r))).length;
    b.push(
      `- "Dari ${angka(suspensi.emiten)} emiten yang pernah disuspensi, ${angka(ks)} punya sedikitnya ` +
        `satu angka yang bertentangan dengan angka lain di data resmi yang sama; dari ${angka(pembanding.emiten)} ` +
        `emiten pembanding yang tidak pernah disuspensi, ${angka(kp)}."`,
    );
    for (const a of audit.aturan) {
      if (a.penanda || dibantah.has(a.aturan)) continue;
      const s = a.per.suspensi;
      const p = a.per.pembanding;
      if (s.merah + p.merah === 0) continue;
      const uji = [
        ...(ujiPer.get(a.aturan) ?? []).filter((u) => u.sesudah !== 'hilang').map((u) => u.sesudah),
        ...(ujiM4bPer.get(a.aturan) ?? []).map((u) => u.jawaban),
      ];
      const ragu = uji.filter((u) => u === 'ragu').length;
      const catatanUji =
        uji.length === 0
          ? ' (belum ada sampel tersisa yang diuji ulang: sampelnya hilang sesudah aturannya diperbaiki, atau tidak terpilih)'
          : ragu > 0
            ? ` (${ragu} dari ${uji.length} sampel uji ulang dijawab "ragu")`
            : '';
      b.push(
        `- ${a.aturan}: "Dari ${angka(s.diperiksa + p.diperiksa)} ${a.satuan} di ` +
          `${angka(s.emiten_diperiksa + p.emiten_diperiksa)} emiten yang bisa diperiksa, ${angka(s.merah + p.merah)} ` +
          `bertentangan (kelompok suspensi ${pecahan(s.merah, s.diperiksa)}, pembanding ${pecahan(p.merah, p.diperiksa)})." ` +
          `— ${a.kalimat}${catatanUji}${CATATAN_KUTIP[a.aturan] === undefined ? '' : ` (${CATATAN_KUTIP[a.aturan] ?? ''})`}`,
      );
    }
    if (dibantah.size > 0) {
      b.push('');
      b.push(`Tidak boleh dikutip karena sampelnya masih dibantah penguji: ${[...dibantah].sort().join(', ')}.`);
    }
  }
  b.push('');
  b.push('## Yang tidak boleh disimpulkan');
  b.push('');
  b.push('- Bahwa saham yang disuspensi punya data lebih buruk: sampelnya kecil dan tidak acak (lihat keterbatasan).');
  b.push('- Bahwa angka yang bertentangan berarti ada yang berbohong: data ini tidak mengatakan angka mana yang benar.');
  b.push('- Apa pun tentang harga atau kualitas saham: berkas ini tidak menilai satu saham pun.');
  b.push('');
  return b.join('\n');
}

function bacaJson<T>(jalur: string): T {
  return JSON.parse(readFileSync(jalur, 'utf8')) as T;
}

export function jalankan(): { audit: Audit; pilihan: Contoh[]; laporan: string } {
  const gudang = bacaJson<GudangMentah>(JALUR_GUDANG_JSON);
  const rencana = bacaJson<RencanaMentah>(JALUR_RENCANA);
  const kalimat = bacaKalimatAwam(readFileSync(JALUR_ATURAN_MD, 'utf8'));
  const audit = susunAudit(gudang, rencana, kalimat);
  const pilihan = pilihUjiUlang(audit);
  const ambil = existsSync(JALUR_AMBIL)
    ? bacaJson<{ kredit: { terpakai_sejak_pembuka: number; terpakai_total: number } }>(JALUR_AMBIL).kredit
    : null;
  const penguji = existsSync(JALUR_PENGUJI) ? bacaJson<HasilPenguji>(JALUR_PENGUJI) : null;
  const penguji_m4b = existsSync(JALUR_PENGUJI_M4B) ? bacaJson<HasilPengujiM4b>(JALUR_PENGUJI_M4B) : null;
  const laporan = susunLaporan(audit, { kredit: ambil, penguji, pilihan, penguji_m4b });
  return { audit, pilihan, laporan };
}

function utama(): number {
  if (!existsSync(JALUR_GUDANG_JSON)) {
    console.error('Jalankan dulu: npm run verifikasi:gudang');
    return 1;
  }
  const { audit, pilihan, laporan } = jalankan();
  writeFileSync(JALUR_LAPORAN, laporan, 'utf8');
  console.log('audit:gudang');
  for (const k of KELOMPOK) {
    console.log(`  ${k.padEnd(10)} emiten ${audit.kelompok[k].length}, berkonflik ${audit.emiten_konflik[k].length}`);
  }
  console.log(`  temuan di 42 emiten audit: ${audit.temuan_audit.length}; terpilih untuk uji ulang: ${pilihan.length}`);
  console.log('  ditulis: docs/bukti/audit-gudang.md');
  return 0;
}

const dijalankanLangsung =
  process.argv[1] !== undefined && import.meta.url === pathToFileURL(process.argv[1]).href;
if (dijalankanLangsung) {
  process.exitCode = utama();
}
