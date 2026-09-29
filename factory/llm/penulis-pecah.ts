/**
 * Penulis DIPECAH (M2d-7 D-3): satu omongan ditulis dalam tiga panggilan
 * yang masing-masing memegang sedikit aturan, bukan satu panggilan yang
 * memegang semuanya (riset §3–§4: penulis yang sekaligus memegang sepuluh
 * aturan menulis kaku dan mengarang pengecoh).
 *
 * 1. **pesan** — pesan teman saja, dari SATU fakta sudut (+ untuk klaim
 *    KELIRU: daftar salah kaprah dari bank pengecoh), dengan contoh gaya bank
 *    v2. Label klaim (BETUL/KELIRU) ditetapkan KODE (`labelKode`), bukan penulis.
 * 2. **pilihan** — kunci + tiga pengecoh yang DIPILIH dari bank pengecoh
 *    (`bank-pengecoh.ts`) lalu dirangkai kata (satu klausa, ≤ batas kata
 *    soal manusia). Tiap pilihan membawa sumbernya ("kunci" atau label bank);
 *    huruf kunci ditetapkan kode (`hurufKunciKode`).
 * 3. **penjelasan** — sesudah soal jadi.
 *
 * Kartu dihitung KODE (`kartuKode`): fakta sudut (penentu), fakta angka pesan,
 * rujukan pilihan kunci, fakta klaim teman, lalu fakta pengecoh — 2–4 kartu.
 *
 * `gIkatan` (pemeriksa, kode) menolak pilihan yang tidak benar-benar memakai
 * bank: kunci harus memakai nilai sudut, tiap pengecoh memakai kandidatnya,
 * tiga kandidat berbeda, tanpa `[[misal|…]]`, dan rujukan pilihan hanya ke
 * fakta kandidatnya, fakta sudut, atau fakta yang dikutip pesan.
 */
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { tanggalId } from '../format.ts';
import { ambilRujukan, RUJUKAN_ANDAIAN, RUJUKAN_HARI_INI, teksPolos } from '../skema/rujukan.ts';
import { memakai, tulisKandidat, type KandidatPengecoh, type KunciSudut } from './bank-pengecoh.ts';
import { tulisContoh, type KalimatGaya, type Nada } from './bank-gaya.ts';
import type { AngkaPesan, KunciOpsi, OmonganDraf } from './draf.ts';
import { batasPanjang } from './gerbang-gaya.ts';
import type { PesanChat } from './klien.ts';
import type { PaketFakta } from './paket.ts';
import { uraiKeluaran } from './susun.ts';

export type Label = 'Betul' | 'Keliru';
const HURUF: readonly KunciOpsi[] = ['a', 'b', 'c', 'd'];

/** Pola label tiga omongan: semua kombinasi yang memuat sedikitnya satu Betul DAN satu Keliru (6). */
export const POLA_LABEL: ReadonlyArray<readonly [Label, Label, Label]> = (['Betul', 'Keliru'] as const)
  .flatMap((x) => (['Betul', 'Keliru'] as const).flatMap((y) => (['Betul', 'Keliru'] as const).map((z) => [x, y, z] as const)))
  .filter((p) => p.includes('Betul') && p.includes('Keliru'));

/** Label klaim teman omongan `no` di paket `paketId`, ditetapkan kode: sha256 mod 6. */
export function labelKode(paketId: string, no: number): Label {
  const h = createHash('sha256').update(`label-klaim:${paketId}`).digest();
  const pola = POLA_LABEL[h.readUInt32BE(0) % POLA_LABEL.length];
  const l = pola?.[no - 1];
  if (l === undefined) throw new Error(`Nomor omongan ${String(no)} di luar 1–3.`);
  return l;
}

const JALUR = {
  pesan: fileURLToPath(new URL('./prompt-penulis-pesan.md', import.meta.url)),
  pilihan: fileURLToPath(new URL('./prompt-penulis-pilihan.md', import.meta.url)),
  penjelasan: fileURLToPath(new URL('./prompt-penulis-penjelasan.md', import.meta.url)),
} as const;

function bacaPrompt(jalur: string): string {
  const b = batasPanjang();
  return readFileSync(jalur, 'utf8')
    .replace(/\r\n/g, '\n')
    .trim()
    .replaceAll('{BATAS_PESAN}', String(b.pesan))
    .replaceAll('{BATAS_PILIHAN}', String(b.pilihan));
}

export const promptPesan = (): string => bacaPrompt(JALUR.pesan);
export const promptPilihan = (): string => bacaPrompt(JALUR.pilihan);
export const promptPenjelasan = (): string => bacaPrompt(JALUR.penjelasan);

function adalahObyek(n: unknown): n is Record<string, unknown> {
  return typeof n === 'object' && n !== null && !Array.isArray(n);
}

function kepala(paket: PaketFakta): string[] {
  return [
    `Tanggal simulasi (T): ${tanggalId(paket.tanggal_t)}; semua pesan dikirim sesudah bursa tutup hari itu.`,
    `Nama samaran emiten: ${paket.nama_samaran}`,
    `Peristiwa hari itu: ${paket.peristiwa}`,
  ];
}

function klaimFakta(paket: PaketFakta, id: string): string {
  return paket.fakta.find((f) => f.fact_id === id)?.klaim ?? '';
}

function blokUmpan(judul: string, umpan: readonly string[] | undefined): string[] {
  if (umpan === undefined || umpan.length === 0) return [];
  return [
    judul,
    ...umpan.map((u) => `- ${u}`),
    'Perbaiki HANYA yang disebut di atas; pakai salah satu alternatif yang diizinkan bila disebut.',
    '',
  ];
}

/* ---------------------------------------------------------------------- */
/* 1. pesan                                                                */
/* ---------------------------------------------------------------------- */

export interface BagianPesan {
  nama: string;
  jam: string;
  pesan: string;
  angka_pesan: AngkaPesan[];
  /** Label bank yang dipakai klaim KELIRU; `null` untuk klaim BETUL. */
  klaim_dari: string | null;
}

export interface PermintaanPesan {
  paket: PaketFakta;
  no: number;
  label: Label;
  kunci: KunciSudut;
  bank: readonly KandidatPengecoh[];
  /** Nama pengirim omongan lain (tidak boleh dipakai lagi). */
  namaLain: readonly string[];
  gaya: { nada: Nada; contoh: readonly KalimatGaya[] };
  sebelumnya?: BagianPesan | null;
  umpan?: readonly string[];
}

/**
 * Pesan panggilan 1: HANYA fakta sudut (dan, untuk klaim KELIRU, daftar salah
 * kaprah dari bank). Paket fakta lengkap TIDAK dikirim (riset §3: pesan dari
 * 1–2 fakta).
 */
export function pesanTulisPesan(p: PermintaanPesan): PesanChat[] {
  const baris: string[] = [
    ...kepala(p.paket),
    '',
    `TUGAS: tulis pesan teman untuk omongan nomor ${String(p.no)}. Klaim teman harus ${p.label === 'Betul' ? 'BETUL' : 'KELIRU'}.`,
    `FAKTA SUDUT (yang akan dicek pemain): ${p.kunci.fact_id} — ${klaimFakta(p.paket, p.kunci.fact_id)}`,
    '',
  ];
  if (p.label === 'Keliru') {
    baris.push(
      'Salah kaprah yang boleh dipakai teman (nilai NYATA milik fakta lain, yang menjawab pertanyaan lain). Pilih SATU, sebut labelnya di "klaim_dari":',
      ...p.bank.map(tulisKandidat),
      'Angka di pesan dicatat ke fact_id kandidat itu. Jangan mengarang nilai lain.',
      '',
    );
  } else {
    baris.push('Teman menyebut isi fakta sudut itu dengan kata-katanya sendiri ("klaim_dari": null). Angka di pesan dicatat ke fact_id fakta sudut.', '');
  }
  if (p.namaLain.length > 0) baris.push(`Nama yang sudah dipakai omongan lain (jangan dipakai): ${p.namaLain.map((n) => `"${n}"`).join(', ')}.`, '');
  baris.push(tulisContoh(p.gaya.nada, p.gaya.contoh), '');
  if (p.sebelumnya !== undefined && p.sebelumnya !== null) baris.push(`Pesan sebelumnya DITOLAK: ${JSON.stringify(p.sebelumnya)}`);
  baris.push(...blokUmpan('Masalah pesan sebelumnya:', p.umpan));
  baris.push('Keluarkan JSON saja: {"nama": "...", "jam": "HH.MM", "pesan": "...", "angka_pesan": [], "klaim_dari": ' + (p.label === 'Keliru' ? '"P…"' : 'null') + '}');
  return [
    { role: 'system', content: promptPesan() },
    { role: 'user', content: baris.join('\n') },
  ];
}

/** Urai keluaran panggilan pesan; `null` bila bentuknya tidak sah. */
export function uraiPesan(teks: string): BagianPesan | null {
  const u = uraiKeluaran(teks);
  if (!u.ok || !adalahObyek(u.nilai)) return null;
  const n = u.nilai;
  const angka = n['angka_pesan'] ?? [];
  if (typeof n['nama'] !== 'string' || typeof n['jam'] !== 'string' || typeof n['pesan'] !== 'string') return null;
  if (!Array.isArray(angka) || !angka.every((a) => adalahObyek(a) && typeof a['teks'] === 'string')) return null;
  const k = n['klaim_dari'];
  return {
    nama: n['nama'].trim(),
    jam: n['jam'].trim(),
    pesan: n['pesan'].trim(),
    angka_pesan: (angka as Array<Record<string, unknown>>).map((a) => ({
      teks: a['teks'] as string,
      ...(typeof a['fact_id'] === 'string' ? { fact_id: a['fact_id'] } : {}),
      ...(a['andaian'] === true ? { andaian: true } : {}),
    })),
    klaim_dari: typeof k === 'string' && k.trim() !== '' && k.trim().toLowerCase() !== 'null' ? k.trim() : null,
  };
}

/* ---------------------------------------------------------------------- */
/* 2. pilihan                                                              */
/* ---------------------------------------------------------------------- */

export interface PilihanBersumber {
  teks: string;
  /** "kunci" atau label kandidat bank ("P3"). */
  sumber: string;
}

export type SetPilihan = Record<KunciOpsi, PilihanBersumber>;

export interface PermintaanPilihan {
  paket: PaketFakta;
  no: number;
  label: Label;
  kunci: KunciSudut;
  bank: readonly KandidatPengecoh[];
  pesan: BagianPesan;
  /** Versi sekarang (untuk perbaikan sebagian) dan huruf kuncinya. */
  sebelumnya?: { pilihan: SetPilihan; kunci: KunciOpsi } | null;
  /** Huruf yang ditulis ulang; kosong/undefined = empat pilihan baru. */
  tulis?: readonly KunciOpsi[];
  umpan?: readonly string[];
}

export function pesanTulisPilihan(p: PermintaanPilihan): PesanChat[] {
  const klaim = p.pesan.klaim_dari;
  const bank = p.bank.map((k) => `${tulisKandidat(k)}${k.id === klaim ? '  ← klaim teman' : ''}`);
  const sebagian = p.sebelumnya !== undefined && p.sebelumnya !== null && p.tulis !== undefined && p.tulis.length > 0 && p.tulis.length < 4;
  const baris: string[] = [
    ...kepala(p.paket),
    '',
    `Pesan dari ${p.pesan.nama} (${p.pesan.jam}): "${p.pesan.pesan}"`,
    `Pertanyaan: Omongan ${p.pesan.nama} cocok dengan dokumennya?`,
    '',
    `KUNCI: label "${p.label}," — klaim teman ${p.label === 'Betul' ? 'COCOK' : 'TIDAK cocok'} dengan fakta sudut. Isi pilihan kunci memakai nilai fakta sudut ` +
      `${p.kunci.fact_id}: ${klaimFakta(p.paket, p.kunci.fact_id)}` +
      (p.kunci.rujukan === null ? '' : ` — rujukan: ${p.kunci.rujukan}`),
    '',
    'BANK PENGECOH (pilih tiga yang BERBEDA untuk pengecoh; salin rujukannya persis bila ada):',
    ...bank,
    '',
  ];
  if (sebagian && p.sebelumnya) {
    const s = p.sebelumnya;
    baris.push(
      `Pilihan sekarang (huruf kunci ${s.kunci}; huruf yang TIDAK disebut di bawah sudah dikunci dan tidak boleh diubah):`,
      ...HURUF.map((h) => `${h}) ${s.pilihan[h].teks}  [sumber: ${s.pilihan[h].sumber}]`),
      '',
      `TULIS ULANG HANYA huruf: ${(p.tulis ?? []).join(', ')}. Sumber baru harus berbeda dari sumber huruf lain; label tiap huruf tetap sama kecuali umpan balik memintanya.`,
      '',
    );
  } else if (p.sebelumnya !== undefined && p.sebelumnya !== null) {
    baris.push('Empat pilihan sebelumnya DITOLAK:', ...HURUF.map((h) => `${h}) ${p.sebelumnya?.pilihan[h].teks ?? ''}  [sumber: ${p.sebelumnya?.pilihan[h].sumber ?? ''}]`), '');
  }
  baris.push(...blokUmpan('Masalah pilihan sebelumnya:', p.umpan));
  baris.push(
    sebagian
      ? `Keluarkan JSON saja: {"pilihan": {${(p.tulis ?? []).map((h) => `"${h}": {"teks": "...", "sumber": "P…"}`).join(', ')}}}`
      : 'Keluarkan JSON saja: {"pilihan": [{"teks": "...", "sumber": "kunci"}, {"teks": "...", "sumber": "P…"}, {"teks": "...", "sumber": "P…"}, {"teks": "...", "sumber": "P…"}]}',
  );
  return [
    { role: 'system', content: promptPilihan() },
    { role: 'user', content: baris.join('\n') },
  ];
}

function pilihanDari(x: unknown): PilihanBersumber | null {
  if (!adalahObyek(x) || typeof x['teks'] !== 'string' || typeof x['sumber'] !== 'string') return null;
  return { teks: x['teks'].trim(), sumber: x['sumber'].trim() };
}

/** Urai empat pilihan baru (urutan tulisan penulis). */
export function uraiPilihanPenuh(teks: string): PilihanBersumber[] | null {
  const u = uraiKeluaran(teks);
  if (!u.ok || !adalahObyek(u.nilai)) return null;
  const p = u.nilai['pilihan'];
  const larik = Array.isArray(p) ? p : adalahObyek(p) ? HURUF.map((h) => p[h]) : null;
  if (larik === null || larik.length !== 4) return null;
  const hasil = larik.map(pilihanDari);
  return hasil.every((x): x is PilihanBersumber => x !== null) ? hasil : null;
}

/** Urai perbaikan sebagian: tepat huruf yang diminta. */
export function uraiPilihanSebagian(teks: string, huruf: readonly KunciOpsi[]): Partial<Record<KunciOpsi, PilihanBersumber>> | null {
  const u = uraiKeluaran(teks);
  if (!u.ok || !adalahObyek(u.nilai) || !adalahObyek(u.nilai['pilihan'])) return null;
  const p = u.nilai['pilihan'];
  const hasil: Partial<Record<KunciOpsi, PilihanBersumber>> = {};
  for (const h of huruf) {
    const x = pilihanDari(p[h]);
    if (x === null) return null;
    hasil[h] = x;
  }
  return hasil;
}

/**
 * Tempatkan empat pilihan tulisan penulis ke huruf: pilihan bersumber
 * "kunci" ke `hurufKunci` (ditetapkan kode), sisanya berurutan ke huruf lain.
 * `null` bila tidak tepat satu pilihan kunci.
 */
export function susunHuruf(daftar: readonly PilihanBersumber[], hurufKunci: KunciOpsi): SetPilihan | null {
  const kunci = daftar.filter((x) => x.sumber.toLowerCase() === 'kunci');
  if (kunci.length !== 1 || daftar.length !== 4) return null;
  const lain = daftar.filter((x) => x.sumber.toLowerCase() !== 'kunci');
  const hasil: Partial<SetPilihan> = { [hurufKunci]: { ...kunci[0], sumber: 'kunci' } as PilihanBersumber };
  let i = 0;
  for (const h of HURUF) if (h !== hurufKunci) hasil[h] = lain[i++] as PilihanBersumber;
  return hasil as SetPilihan;
}

/* ---------------------------------------------------------------------- */
/* kartu + perakitan                                                       */
/* ---------------------------------------------------------------------- */

/** fact_id yang dipakai satu pilihan: rujukannya, atau fakta kandidat bank bila tanpa rujukan. */
function faktaPilihan(x: PilihanBersumber, bank: readonly KandidatPengecoh[], kunci: KunciSudut): string[] {
  const r = ambilRujukan(x.teks).map((y) => y.fact_id).filter((id) => id !== RUJUKAN_ANDAIAN && id !== RUJUKAN_HARI_INI);
  const k = x.sumber === 'kunci' ? kunci.fact_id : bank.find((b) => b.id === x.sumber)?.fact_id;
  return [...r, ...(k === undefined ? [] : [k])];
}

/**
 * Kartu omongan, ditetapkan kode (2–4): fakta sudut, fakta angka pesan,
 * rujukan pilihan kunci, fakta klaim teman, fakta pengecoh (urut huruf);
 * bila kurang dari dua, fakta kandidat bank pertama.
 */
export function kartuKode(
  paket: PaketFakta,
  kunci: KunciSudut,
  pesan: BagianPesan,
  pilihan: SetPilihan,
  hurufKunci: KunciOpsi,
  bank: readonly KandidatPengecoh[],
): string[] {
  const ada = new Set(paket.fakta.map((f) => f.fact_id));
  const urut: string[] = [
    kunci.fact_id,
    ...pesan.angka_pesan.map((a) => a.fact_id).filter((x): x is string => x !== undefined),
    ...faktaPilihan(pilihan[hurufKunci], bank, kunci),
    ...(pesan.klaim_dari === null ? [] : [bank.find((b) => b.id === pesan.klaim_dari)?.fact_id ?? '']),
    ...HURUF.filter((h) => h !== hurufKunci).flatMap((h) => faktaPilihan(pilihan[h], bank, kunci)),
  ];
  const hasil: string[] = [];
  const tambah = (id: string): void => {
    if (hasil.length < 4 && id !== '' && ada.has(id) && !hasil.includes(id)) hasil.push(id);
  };
  for (const id of urut) tambah(id);
  // Paling sedikit dua kartu: tambah fakta kandidat bank pertama bila perlu.
  for (const b of bank) if (hasil.length < 2) tambah(b.fact_id);
  return hasil;
}

/** Rakit omongan dari ketiga bagian; kartu dihitung kode, kartu penentu = fakta sudut. */
export function rakitOmongan(
  paket: PaketFakta,
  kunci: KunciSudut,
  pesan: BagianPesan,
  pilihan: SetPilihan,
  hurufKunci: KunciOpsi,
  bank: readonly KandidatPengecoh[],
  penjelasan: string,
): OmonganDraf {
  return {
    nama: pesan.nama,
    jam: pesan.jam,
    pesan: pesan.pesan,
    angka_pesan: pesan.angka_pesan.map((a) => ({ ...a })),
    kartu: kartuKode(paket, kunci, pesan, pilihan, hurufKunci, bank),
    kartu_penentu: [kunci.fact_id],
    pilihan: { a: pilihan.a.teks, b: pilihan.b.teks, c: pilihan.c.teks, d: pilihan.d.teks },
    kunci: hurufKunci,
    penjelasan,
  };
}

/* ---------------------------------------------------------------------- */
/* 3. penjelasan                                                           */
/* ---------------------------------------------------------------------- */

export function pesanTulisPenjelasan(paket: PaketFakta, o: Omit<OmonganDraf, 'penjelasan'>, umpan?: readonly string[], sebelumnya?: string | null): PesanChat[] {
  const kartu = o.kartu.map((id, i) => `Kartu ${String(i + 1)} (${id})${o.kartu_penentu.includes(id) ? ' [menentukan jawaban]' : ''}: ${klaimFakta(paket, id)}`);
  const baris: string[] = [
    ...kepala(paket),
    '',
    `Pesan dari ${o.nama} (${o.jam}): "${o.pesan}"`,
    '',
    'Kartu yang dilihat pemain (fact_id di kurung untuk rujukan [[fact_id|teks]]):',
    ...kartu,
    '',
    `Pertanyaan: Omongan ${o.nama} cocok dengan dokumennya?`,
    ...HURUF.map((h) => `${h}) ${teksPolos(o.pilihan[h])}`),
    `KUNCI: ${o.kunci}) ${teksPolos(o.pilihan[o.kunci])}`,
    '',
    ...(sebelumnya === undefined || sebelumnya === null ? [] : [`Penjelasan sebelumnya DITOLAK: ${JSON.stringify(sebelumnya)}`]),
    ...blokUmpan('Masalah penjelasan sebelumnya:', umpan),
    'Keluarkan JSON saja: {"penjelasan": "..."}',
  ];
  return [
    { role: 'system', content: promptPenjelasan() },
    { role: 'user', content: baris.join('\n') },
  ];
}

export function uraiPenjelasan(teks: string): string | null {
  const u = uraiKeluaran(teks);
  if (!u.ok || !adalahObyek(u.nilai) || typeof u.nilai['penjelasan'] !== 'string') return null;
  const p = u.nilai['penjelasan'].trim();
  return p === '' ? null : p;
}

/* ---------------------------------------------------------------------- */
/* G-ikatan (pemeriksa, kode)                                              */
/* ---------------------------------------------------------------------- */

export type LokasiBagian = 'pesan' | `pilihan-${KunciOpsi}` | 'penjelasan';

export interface ButirIkatan {
  lokasi: LokasiBagian;
  teramati: string;
  alasan: string;
}

function labelPilihan(teks: string): Label | null {
  const t = teksPolos(teks).trimStart();
  return t.startsWith('Betul,') ? 'Betul' : t.startsWith('Keliru,') ? 'Keliru' : null;
}

/**
 * G-ikatan: pesan dan pilihan benar-benar memakai bank pengecoh. Murni.
 * Butir kosong = lolos.
 */
export function gIkatan(
  pesan: BagianPesan,
  pilihan: SetPilihan,
  hurufKunci: KunciOpsi,
  label: Label,
  kunci: KunciSudut,
  bank: readonly KandidatPengecoh[],
): ButirIkatan[] {
  const butir: ButirIkatan[] = [];
  const cari = (id: string): KandidatPengecoh | undefined => bank.find((b) => b.id === id);
  // --- pesan
  for (const a of pesan.angka_pesan) {
    if (a.andaian === true || a.fact_id === undefined) {
      butir.push({ lokasi: 'pesan', teramati: a.teks, alasan: 'angka di pesan tanpa fakta (andaian/karangan) — di M2d-7 teman hanya menyebut nilai nyata dari fakta paket' });
    }
  }
  if (label === 'Keliru') {
    const c = pesan.klaim_dari === null ? undefined : cari(pesan.klaim_dari);
    if (c === undefined) {
      butir.push({ lokasi: 'pesan', teramati: `klaim_dari ${String(pesan.klaim_dari)}`, alasan: 'klaim KELIRU harus memakai satu label salah kaprah dari daftar (P1, P2, …)' });
    } else if (!memakai(pesan.pesan, c, pesan.angka_pesan)) {
      butir.push({ lokasi: 'pesan', teramati: pesan.pesan, alasan: `pesan tidak menyebut nilai salah kaprah ${c.id} ("${c.rujukan === null ? c.teks : teksPolos(c.rujukan)}") yang dipilih` });
    }
  } else {
    if (pesan.klaim_dari !== null) butir.push({ lokasi: 'pesan', teramati: `klaim_dari ${pesan.klaim_dari}`, alasan: 'klaim BETUL tidak memakai salah kaprah ("klaim_dari": null)' });
    if (!memakai(pesan.pesan, kunci, pesan.angka_pesan)) {
      butir.push({ lokasi: 'pesan', teramati: pesan.pesan, alasan: `pesan tidak menyebut isi fakta sudut (${kunci.rujukan === null ? `"${kunci.teks}"` : teksPolos(kunci.rujukan)})` });
    }
  }
  // --- pilihan
  const dipakai = new Map<string, KunciOpsi>();
  const faktaPesan = new Set(pesan.angka_pesan.map((a) => a.fact_id).filter((x): x is string => x !== undefined));
  for (const h of HURUF) {
    const x = pilihan[h];
    const lok: LokasiBagian = `pilihan-${h}`;
    const t = teksPolos(x.teks);
    if (ambilRujukan(x.teks).some((r) => r.fact_id === RUJUKAN_ANDAIAN)) {
      butir.push({ lokasi: lok, teramati: x.teks, alasan: 'memakai [[misal|…]] — angka pengecoh hanya boleh rujukan nilai nyata dari bank' });
    }
    if (h === hurufKunci) {
      if (x.sumber !== 'kunci') butir.push({ lokasi: lok, teramati: `sumber ${x.sumber}`, alasan: 'pilihan kunci harus bersumber "kunci"' });
      if (labelPilihan(x.teks) !== label) butir.push({ lokasi: lok, teramati: t, alasan: `label pilihan kunci harus "${label},"` });
      if (!memakai(x.teks, kunci)) butir.push({ lokasi: lok, teramati: t, alasan: `pilihan kunci tidak memakai nilai fakta sudut (${kunci.rujukan ?? `"${kunci.teks}"`})` });
      for (const r of ambilRujukan(x.teks)) {
        if (r.fact_id !== kunci.fact_id && !faktaPesan.has(r.fact_id) && r.fact_id !== RUJUKAN_ANDAIAN && r.fact_id !== RUJUKAN_HARI_INI) {
          butir.push({ lokasi: lok, teramati: `[[${r.fact_id}|${r.teks}]]`, alasan: 'pilihan kunci merujuk fakta selain fakta sudut dan fakta yang dikutip pesan' });
        }
      }
      continue;
    }
    const c = cari(x.sumber);
    if (x.sumber === 'kunci' || c === undefined) {
      butir.push({ lokasi: lok, teramati: `sumber ${x.sumber}`, alasan: 'pengecoh harus bersumber satu label bank pengecoh (P1, P2, …)' });
      continue;
    }
    const lama = dipakai.get(c.id);
    if (lama !== undefined) butir.push({ lokasi: lok, teramati: `sumber ${c.id}`, alasan: `kandidat ${c.id} sudah dipakai pilihan ${lama}; tiap pengecoh memakai kandidat berbeda` });
    dipakai.set(c.id, h);
    if (!memakai(x.teks, c)) butir.push({ lokasi: lok, teramati: t, alasan: `pilihan tidak memakai nilai kandidat ${c.id} (${c.rujukan ?? `"${c.teks}"`})` });
    for (const r of ambilRujukan(x.teks)) {
      if (r.fact_id !== c.fact_id && r.fact_id !== kunci.fact_id && !faktaPesan.has(r.fact_id) && r.fact_id !== RUJUKAN_ANDAIAN && r.fact_id !== RUJUKAN_HARI_INI) {
        butir.push({ lokasi: lok, teramati: `[[${r.fact_id}|${r.teks}]]`, alasan: `rujukan ke fakta di luar kandidat ${c.id}` });
      }
    }
  }
  return butir;
}
