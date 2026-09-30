/**
 * Pola soal templat (M2d-10 D-1), diturunkan dari POLA enam soal tayang
 * (Claude + pemilik) — bukan dari kalimatnya. Tiap pola: jenis klaim teman,
 * fakta yang dibutuhkan, dan aturan membentuk empat pilihan yang nilai
 * kebenarannya DIHITUNG kode dari fakta paket (`proposisi.ts`).
 *
 * | pola | dari soal tayang | bentuk |
 * |---|---|---|
 * | sebab-resmi | DADA s1 | teman menyebut alasan yang salah untuk sebuah peristiwa; kunci = alasan resmi di dokumen |
 * | besaran-hitungan | DADA s2 | teman menyebut besaran hitungan dengan kata-kata (betul); kunci = angka hitungan |
 * | arah-kali-tingkat | DADA s3 | kisi 2×2: arah (naik/turun) × tingkat harga; satu sel benar |
 * | angka-lain-waktu | ULTJ s1 | teman memakai angka hari lain untuk hari yang dibicarakan; kunci = angka yang benar, bukan angka teman |
 * | setengah-benar | ULTJ s2 | klaim dua bagian: satu benar, satu salah; kunci = "Keliru" yang memisahkan keduanya |
 * | benar-berincian | ULTJ s3 | klaim betul; kunci = "Betul" dengan rincian yang tepat |
 *
 * Kalimat di berkas ini ditulis baru untuk templat; tes anti-salin menolak
 * potongan 5 kata mana pun dari soal tayang.
 */
import { angkaId, rupiah, tanggalId } from '../../format.ts';
import type { Topik } from '../bank-gaya.ts';
import type { PaketFakta } from '../paket.ts';
import {
  KATEGORI_BERFRASA,
  dividen,
  fakta,
  hargaHarian,
  hariKerjaSebelum,
  hariNaik,
  kelipatanHarga,
  selisihHarga,
  suspensi,
  type KategoriAlasan,
  type NilaiHarian,
} from './fakta.ts';
import { evaluasi, type Proposisi } from './proposisi.ts';

export type IdPola = 'sebab-resmi' | 'besaran-hitungan' | 'arah-kali-tingkat' | 'angka-lain-waktu' | 'setengah-benar' | 'benar-berincian';
export type Label = 'Betul' | 'Keliru';
export type NamaSlot = 'kunci' | 'p1' | 'p2' | 'p3';

/** Urutan pola untuk pemilihan (tertulis, dites). */
export const URUTAN_POLA: readonly IdPola[] = ['sebab-resmi', 'angka-lain-waktu', 'setengah-benar', 'benar-berincian', 'arah-kali-tingkat', 'besaran-hitungan'];

export const ASAL_POLA: Readonly<Record<IdPola, string>> = {
  'sebab-resmi': 'DADA s1 (soal tayang): alasan yang disebut teman lain dari alasan di dokumen',
  'besaran-hitungan': 'DADA s2 (soal tayang): besaran hitungan yang disebut teman dengan kata-kata',
  'arah-kali-tingkat': 'DADA s3 (soal tayang): kisi arah × tingkat, satu sel benar',
  'angka-lain-waktu': 'ULTJ s1 (soal tayang): angka hari lain dipakai untuk hari yang dibicarakan',
  'setengah-benar': 'ULTJ s2 (soal tayang): klaim dua bagian, satu benar satu salah',
  'benar-berincian': 'ULTJ s3 (soal tayang): klaim betul, kunci dengan rincian tepat',
};

export interface VarianPilihan {
  /** Id pendek untuk penyempurna ("K1", "P1b"). */
  id: string;
  label: Label;
  proposisi: Proposisi;
  /** Teks dengan rujukan `[[fact_id|teks]]` (dibuat kode). */
  teks: string;
  /** Kata inti yang harus tetap ada bila teks dirangkai ulang penyempurna. */
  inti: string[];
  /** Penanda waktu yang wajib tertulis (bila proposisinya benar di rujukan lain). */
  penanda: string | null;
}

export interface SlotPilihan {
  slot: NamaSlot;
  /** Bentuk pengecoh, untuk penyempurna dan laporan. */
  bentuk: string;
  /** Varian yang diizinkan; indeks 0 = bawaan. */
  varian: VarianPilihan[];
}

export interface AngkaBoleh {
  teks: string;
  fact_id?: string;
  andaian?: true;
}

export interface KlaimTemplat {
  proposisi: Proposisi;
  /** Label yang DIMAKSUD templat; dicek sama dengan nilai proposisi (`bukti.ts`). */
  label: Label;
  /** Isi klaim untuk penulis kata, kalimat biasa. */
  inti: string;
  /** Satu-satunya angka yang boleh muncul di pesan (teks persis). */
  angka: AngkaBoleh[];
  /** Tiap kelompok: sedikitnya satu frasa harus tertulis di pesan. */
  wajib: string[][];
}

export interface RencanaSoal {
  pola: IdPola;
  asal: string;
  /** Fakta sudut (penentu pertama). */
  sudut: string;
  kartu: string[];
  kartu_penentu: string[];
  klaim: KlaimTemplat;
  slot: [SlotPilihan, SlotPilihan, SlotPilihan, SlotPilihan];
  /** Salah kaprah yang dijelaskan penulis penjelasan (ide, bukan kalimat jadi). */
  salah_kaprah: string;
  /** Rujukan yang boleh dipakai penjelasan (persis). */
  rujukan_penjelasan: string[];
  topik: Topik;
}

/* ---------------------------------------------------------------------- */
/* frasa                                                                   */
/* ---------------------------------------------------------------------- */

export const FRASA_ALASAN: Readonly<Record<Exclude<KategoriAlasan, 'lain'>, string>> = {
  'kenaikan-harga': 'kenaikan harganya terlalu tajam',
  'penurunan-harga': 'penurunan harganya terlalu tajam',
  'kelangsungan-usaha': 'usahanya diragukan bisa terus berjalan',
  'laporan-keuangan': 'laporan keuangannya terlambat diserahkan',
  'aksi-korporasi': 'rencana pengambilalihan belum diumumkan',
};

/** Frasa klaim teman (lebih panjang, untuk penulis pesan). */
export const FRASA_KLAIM: Readonly<Record<Exclude<KategoriAlasan, 'lain'>, string>> = {
  'kenaikan-harga': 'harganya naik terlalu tinggi dalam waktu singkat',
  'penurunan-harga': 'harganya turun terlalu dalam dalam waktu singkat',
  'kelangsungan-usaha': 'bursa ragu usahanya bisa terus berjalan',
  'laporan-keuangan': 'laporan keuangannya belum diserahkan tepat waktu',
  'aksi-korporasi': 'ada rencana pengambilalihan yang belum diumumkan',
};

/** Kata inti tiap frasa alasan (harus tetap ada bila dirangkai ulang). */
const INTI_ALASAN: Readonly<Record<Exclude<KategoriAlasan, 'lain'>, string[]>> = {
  'kenaikan-harga': ['kenaikan'],
  'penurunan-harga': ['penurunan'],
  'kelangsungan-usaha': ['usaha'],
  'laporan-keuangan': ['laporan keuangan'],
  'aksi-korporasi': ['pengambilalihan'],
};

const tok = (id: string, teks: string): string => `[[${id}|${teks}]]`;
const misal = (teks: string): string => `[[misal|${teks}]]`;

/** "9 Desember" bila setahun dengan T, selain itu "9 Desember 2024". */
export function tanggalPendek(iso: string, T: string): string {
  const penuh = tanggalId(iso);
  return iso.slice(0, 4) === T.slice(0, 4) ? penuh.replace(/ \d{4}$/, '') : penuh;
}

const KATA_ANGKA = ['nol', 'satu', 'dua', 'tiga', 'empat', 'lima', 'enam', 'tujuh', 'delapan', 'sembilan', 'sepuluh'];
export const kataAngka = (n: number): string => KATA_ANGKA[n] ?? angkaId(n);

function varian(id: string, label: Label, proposisi: Proposisi, teks: string, inti: string[], penanda: string | null = null): VarianPilihan {
  return { id, label, proposisi, teks, inti, penanda };
}

function slot(nama: NamaSlot, bentuk: string, ...v: VarianPilihan[]): SlotPilihan {
  return { slot: nama, bentuk, varian: v };
}

/** Rujukan tanggal & nilai sebuah fakta untuk penjelasan. */
function rujukanFakta(paket: PaketFakta, id: string): string[] {
  const f = fakta(paket, id);
  const hasil = [tok(id, tanggalPendek(f.terbit, paket.tanggal_t))];
  if (typeof f.nilai === 'number') {
    if (/^harga-|^naik-/.test(id)) hasil.push(tok(id, rupiah(f.nilai)));
    else if (/^volume-/.test(id)) hasil.push(tok(id, `${angkaId(f.nilai)} lembar`));
    else if (/^kelipatan-/.test(id)) hasil.push(tok(id, `${angkaId(f.nilai)} kali`));
    else if (id === 'hari-naik-beruntun') hasil.push(tok(id, `${angkaId(f.nilai)} hari bursa`));
    else if (/^div-/.test(id)) hasil.push(tok(id, `${rupiah(f.nilai)} per lembar`));
  }
  return hasil;
}

function rujukanDari(teks: readonly string[]): string[] {
  const hasil: string[] = [];
  for (const t of teks) for (const m of t.matchAll(/\[\[([^\]|]+)\|([^\]]+)\]\]/g)) if (m[1] !== 'misal') hasil.push(m[0]);
  return hasil;
}

function lengkapi(r: Omit<RencanaSoal, 'rujukan_penjelasan' | 'asal'>, paket: PaketFakta): RencanaSoal {
  const dariPilihan = rujukanDari(r.slot.flatMap((s) => s.varian.map((v) => v.teks)));
  const dariKartu = r.kartu.flatMap((id) => rujukanFakta(paket, id));
  return { ...r, asal: ASAL_POLA[r.pola], rujukan_penjelasan: [...new Set([...dariKartu, ...dariPilihan])] };
}

/* ---------------------------------------------------------------------- */
/* pola 1 — sebab-resmi (DADA s1)                                          */
/* ---------------------------------------------------------------------- */

function penandaHari(iso: string, T: string): string {
  return iso === T ? 'hari ini' : tanggalPendek(iso, T);
}

export function polaSebabResmi(paket: PaketFakta): RencanaSoal[] {
  const T = paket.tanggal_t;
  const semua = suspensi(paket);
  const sT = [...semua].reverse().find((s) => s.tanggal <= T && s.kategori !== 'lain');
  if (sT === undefined || sT.kategori === 'lain') return [];
  const kT = sT.kategori;
  const lain = semua.filter((s) => s.fact_id !== sT.fact_id && s.kategori !== 'lain' && s.kategori !== kT);
  const sO = lain.at(-1) ?? null;
  const diPaket = new Set(semua.map((s) => s.kategori));
  const kx = (sO?.kategori ?? KATEGORI_BERFRASA.find((k) => k !== kT)) as Exclude<KategoriAlasan, 'lain'>;
  const bebas = KATEGORI_BERFRASA.filter((k) => k !== kT && k !== kx && !diPaket.has(k));
  const kz = bebas[0];
  const kz2 = bebas[1];
  if (kz === undefined || kz2 === undefined) return [];
  const hari = penandaHari(sT.tanggal, T);
  const pH = sT.tanggal === T ? 'hari ini' : tok(sT.fact_id, hari);
  const ktT = kT as Exclude<KategoriAlasan, 'lain'>;
  const kartu = [sT.fact_id];
  if (sO !== null) kartu.push(sO.fact_id);
  else {
    const hn = hariNaik(paket);
    const h = hargaHarian(paket).at(-1);
    if (hn !== null) kartu.push(hn.fact_id);
    else if (h !== undefined) kartu.push(h.fact_id);
  }
  if (kartu.length < 2) return [];
  const penanda = sT.tanggal === T ? 'hari ini' : hari;
  const r: Omit<RencanaSoal, 'rujukan_penjelasan' | 'asal'> = {
    pola: 'sebab-resmi',
    sudut: sT.fact_id,
    kartu,
    kartu_penentu: [sT.fact_id],
    klaim: {
      proposisi: { k: 'alasan', susp: sT.fact_id, kategori: kx },
      label: 'Keliru',
      inti:
        `Teman yakin bursa menghentikan perdagangan saham ${paket.nama_samaran} ${sT.tanggal === T ? 'hari ini' : `pada ${hari}`} ` +
        `karena ${FRASA_KLAIM[kx]}.`,
      angka: sT.tanggal === T ? [] : [{ teks: hari, fact_id: sT.fact_id }],
      wajib: [[penanda]],
    },
    slot: [
      slot(
        'kunci',
        'Keliru + alasan resmi di dokumen',
        varian('K1', 'Keliru', { k: 'alasan', susp: sT.fact_id, kategori: kT }, `Keliru, alasan resmi ${pH}: ${FRASA_ALASAN[ktT]}.`, [...INTI_ALASAN[ktT]], penanda),
        varian('K2', 'Keliru', { k: 'alasan', susp: sT.fact_id, kategori: kT }, `Keliru, bursa menghentikannya ${pH} karena ${FRASA_ALASAN[ktT]}.`, [...INTI_ALASAN[ktT]], penanda),
      ),
      slot(
        'p1',
        'Betul + alasan yang disebut teman',
        varian('P1a', 'Betul', { k: 'alasan', susp: sT.fact_id, kategori: kx }, `Betul, bursa menghentikannya ${pH} karena ${FRASA_ALASAN[kx]}.`, [...INTI_ALASAN[kx]], penanda),
        varian('P1b', 'Betul', { k: 'alasan', susp: sT.fact_id, kategori: kx }, `Betul, alasan resmi ${pH} memang ${FRASA_ALASAN[kx]}.`, [...INTI_ALASAN[kx]], penanda),
      ),
      slot(
        'p2',
        'Betul + alasan tambahan yang tidak ada di dokumen',
        varian(
          'P2a',
          'Betul',
          { k: 'dan', p: [{ k: 'alasan', susp: sT.fact_id, kategori: kx }, { k: 'alasan', susp: sT.fact_id, kategori: kz2 }] },
          `Betul, pengumuman ${pH} juga menyebut ${FRASA_ALASAN[kz2]}.`,
          [...INTI_ALASAN[kz2]],
          penanda,
        ),
        varian(
          'P2b',
          'Betul',
          { k: 'dan', p: [{ k: 'alasan', susp: sT.fact_id, kategori: kx }, { k: 'alasan', susp: sT.fact_id, kategori: kz2 }] },
          `Betul, bursa ${pH} juga beralasan ${FRASA_ALASAN[kz2]}.`,
          [...INTI_ALASAN[kz2]],
          penanda,
        ),
      ),
      slot(
        'p3',
        'Keliru + alasan lain yang tidak ada di dokumen',
        varian('P3a', 'Keliru', { k: 'alasan', susp: sT.fact_id, kategori: kz }, `Keliru, alasan resmi ${pH}: ${FRASA_ALASAN[kz]}.`, [...INTI_ALASAN[kz]], penanda),
        varian('P3b', 'Keliru', { k: 'alasan', susp: sT.fact_id, kategori: kz }, `Keliru, bursa menghentikannya ${pH} karena ${FRASA_ALASAN[kz]}.`, [...INTI_ALASAN[kz]], penanda),
      ),
    ],
    salah_kaprah:
      sO !== null
        ? `mengira alasan penghentian yang lebih dulu juga berlaku untuk penghentian ${sT.tanggal === T ? 'hari ini' : 'itu'}`
        : 'menebak alasan penghentian dari kabar yang beredar, bukan dari pengumuman bursa',
    topik: 'suspensi',
  };
  return [lengkapi(r, paket)];
}

/* ---------------------------------------------------------------------- */
/* pola 4 — angka-lain-waktu (ULTJ s1)                                     */
/* ---------------------------------------------------------------------- */

interface KelasNilai {
  nama: string;
  deret: NilaiHarian[];
  format: (n: number) => string;
  sebutan: string;
  topik: Topik;
}

function kelasNilai(paket: PaketFakta): KelasNilai[] {
  return [
    { nama: 'harga', deret: hargaHarian(paket), format: rupiah, sebutan: 'harga penutupan', topik: 'harga' as Topik },
    { nama: 'div', deret: dividen(paket), format: rupiah, sebutan: 'dividen per lembar', topik: 'dividen' as Topik },
  ].filter((k) => k.deret.length >= 2);
}

function tertinggiAtauTerendah(id: string, deret: readonly NilaiHarian[]): Proposisi | null {
  const n = deret.find((x) => x.fact_id === id)?.nilai;
  if (n === undefined) return null;
  if (deret.some((x) => x.nilai > n)) return { k: 'tertinggi', fact_id: id };
  return null;
}

export function polaAngkaLainWaktu(paket: PaketFakta): RencanaSoal[] {
  const T = paket.tanggal_t;
  const hasil: RencanaSoal[] = [];
  for (const kel of kelasNilai(paket)) {
    const d = kel.deret.filter((x) => x.tanggal <= T);
    const f1 = d.at(-1);
    const f0 = [...d].reverse().find((x) => f1 !== undefined && x.fact_id !== f1.fact_id && Math.abs(x.nilai - f1.nilai) > 1e-9);
    if (f1 === undefined || f0 === undefined) continue;
    const semuaNilai = new Set(paket.fakta.map((f) => f.nilai).filter((x): x is number => typeof x === 'number'));
    // Pengganti "angka lain" di sisi yang sama dengan angka yang benar (relatif ke angka teman), supaya arah tidak membocorkan kunci.
    const atas = f1.nilai > f0.nilai;
    const f2 = [...d].reverse().find((x) => x.fact_id !== f1.fact_id && x.fact_id !== f0.fact_id && (atas ? x.nilai > f0.nilai : x.nilai < f0.nilai) && Math.abs(x.nilai - f1.nilai) > 1e-9);
    let alt: { teks: string; nilai: number };
    if (f2 !== undefined) alt = { teks: tok(f2.fact_id, kel.format(f2.nilai)), nilai: f2.nilai };
    else {
      let n = f1.nilai + (f1.nilai - f0.nilai);
      while (semuaNilai.has(n) || n <= 0) n += atas ? 1 : -1;
      alt = { teks: misal(kel.format(n)), nilai: n };
    }
    const sisi = tertinggiAtauTerendah(f0.fact_id, d);
    if (sisi === null) continue;
    const kemarin = f1.tanggal === hariKerjaSebelum(T);
    const tgl1 = tanggalPendek(f1.tanggal, T);
    const pen1 = tok(f1.fact_id, tgl1);
    const v0 = tok(f0.fact_id, kel.format(f0.nilai));
    const v1 = tok(f1.fact_id, kel.format(f1.nilai));
    const kata = kel.nama === 'harga' ? 'penutupan' : 'dividen';
    const r: Omit<RencanaSoal, 'rujukan_penjelasan' | 'asal'> = {
      pola: 'angka-lain-waktu',
      sudut: f1.fact_id,
      kartu: [f1.fact_id, f0.fact_id],
      kartu_penentu: [f1.fact_id],
      klaim: {
        proposisi: { k: 'nilai', fact_id: f1.fact_id, nilai: f0.nilai },
        label: 'Keliru',
        inti: `Teman menyebut ${kel.sebutan} ${kemarin ? `kemarin (${tgl1})` : tgl1} ${kel.format(f0.nilai).replace(/ per lembar$/, '')}.`,
        angka: [{ teks: kel.format(f0.nilai).replace(/ per lembar$/, ''), fact_id: f0.fact_id }, { teks: tgl1, fact_id: f1.fact_id }],
        wajib: [kemarin ? ['kemarin', tgl1] : [tgl1]],
      },
      slot: [
        slot(
          'kunci',
          'Keliru + angka yang benar, bukan angka teman',
          varian('K1', 'Keliru', { k: 'nilai', fact_id: f1.fact_id, nilai: f1.nilai }, `Keliru, ${kata} ${pen1} ${v1}, bukan ${v0}.`, [kata, 'bukan'], tgl1),
          varian('K2', 'Keliru', { k: 'nilai', fact_id: f1.fact_id, nilai: f1.nilai }, `Keliru, yang tercatat untuk ${pen1} ${v1}, bukan ${v0}.`, ['tercatat', 'bukan'], tgl1),
        ),
        slot(
          'p1',
          'Betul + angka teman',
          varian('P1a', 'Betul', { k: 'nilai', fact_id: f1.fact_id, nilai: f0.nilai }, `Betul, ${kata} ${pen1} memang ${v0}.`, [kata, 'memang'], tgl1),
          varian('P1b', 'Betul', { k: 'nilai', fact_id: f1.fact_id, nilai: f0.nilai }, `Betul, angka ${pen1} yang tercatat memang ${v0}.`, ['tercatat', 'memang'], tgl1),
        ),
        slot(
          'p2',
          'Betul + kesimpulan dari angka teman',
          varian('P2a', 'Betul', sisi, `Betul, ${v0} itu ${kata} tertinggi sebelum hari ini.`, ['tertinggi'], null),
          varian('P2b', 'Betul', sisi, `Betul, belum pernah ada ${kata} di atas ${v0} sebelum hari ini.`, ['belum pernah'], null),
        ),
        slot(
          'p3',
          'Keliru + angka lain yang juga bukan angka hari itu',
          varian('P3a', 'Keliru', { k: 'nilai', fact_id: f1.fact_id, nilai: alt.nilai }, `Keliru, ${kata} ${pen1} ${alt.teks}, bukan ${v0}.`, [kata, 'bukan'], tgl1),
          varian('P3b', 'Keliru', { k: 'nilai', fact_id: f1.fact_id, nilai: alt.nilai }, `Keliru, yang tercatat untuk ${pen1} ${alt.teks}, bukan ${v0}.`, ['tercatat', 'bukan'], tgl1),
        ),
      ],
      salah_kaprah: `memakai angka dari hari lain seolah-olah angka ${kemarin ? 'kemarin' : 'hari yang dibicarakan'}`,
      topik: kel.topik,
    };
    hasil.push(lengkapi(r, paket));
  }
  return hasil;
}

/* ---------------------------------------------------------------------- */
/* pola 5 — setengah-benar (ULTJ s2)                                       */
/* ---------------------------------------------------------------------- */

export function polaSetengahBenar(paket: PaketFakta): RencanaSoal[] {
  const T = paket.tanggal_t;
  const hn = hariNaik(paket);
  if (hn === null || hn.nilai < 3) return [];
  const awalTahun = `${T.slice(0, 4)}-01-01`;
  const kemarin = hariKerjaSebelum(T);
  const sebelum = suspensi(paket).filter((s) => s.tanggal >= awalTahun && s.tanggal < T && s.kategori !== 'lain');
  const sO = sebelum.at(-1);
  if (sO === undefined) return [];
  const kX = (sO.kategori === 'kenaikan-harga' ? 'laporan-keuangan' : 'kenaikan-harga') as Exclude<KategoriAlasan, 'lain'>;
  const naik: Proposisi = { k: 'naik-beruntun', fact_id: hn.fact_id, hari: hn.nilai };
  const adaSusp: Proposisi = { k: 'ada-suspensi', dari: awalTahun, sampai: kemarin };
  const tglOPolos = tanggalPendek(sO.tanggal, T);
  const tglO = tok(sO.fact_id, tglOPolos);
  const nHari = `${angkaId(hn.nilai)} hari bursa`;
  const r: Omit<RencanaSoal, 'rujukan_penjelasan' | 'asal'> = {
    pola: 'setengah-benar',
    sudut: sO.fact_id,
    kartu: [hn.fact_id, sO.fact_id],
    kartu_penentu: [sO.fact_id, hn.fact_id],
    klaim: {
      proposisi: { k: 'dan', p: [naik, { k: 'bukan', p: adaSusp }] },
      label: 'Keliru',
      inti:
        `Teman bilang harga penutupannya naik ${nHari} berturut-turut, dan sebelum hari ini sahamnya belum pernah ` +
        'dihentikan bursa sepanjang tahun ini.',
      angka: [{ teks: nHari, fact_id: hn.fact_id }, { teks: `${angkaId(hn.nilai)} hari`, fact_id: hn.fact_id }],
      wajib: [['tahun ini']],
    },
    slot: [
      slot(
        'kunci',
        'Keliru: bagian pertama benar, bagian kedua salah',
        varian('K1', 'Keliru', { k: 'dan', p: [naik, adaSusp] }, `Keliru, naiknya memang beruntun, tapi ${tglO} sudah pernah dihentikan.`, ['beruntun', 'dihentikan'], tglOPolos),
        varian('K2', 'Keliru', { k: 'dan', p: [naik, adaSusp] }, `Keliru, naik beruntunnya benar, tapi ${tglO} sahamnya sudah dihentikan.`, ['beruntun', 'dihentikan'], tglOPolos),
      ),
      slot(
        'p1',
        'Betul: kedua bagian dibenarkan',
        varian('P1a', 'Betul', { k: 'dan', p: [naik, { k: 'bukan', p: adaSusp }] }, 'Betul, naik beruntun dan baru kali ini dihentikan tahun ini.', ['beruntun', 'baru kali ini'], null),
        varian('P1b', 'Betul', { k: 'dan', p: [naik, { k: 'bukan', p: adaSusp }] }, 'Betul, naik beruntun dan belum pernah dihentikan tahun ini.', ['beruntun', 'belum pernah'], null),
      ),
      slot(
        'p2',
        'Betul + salah membaca alasan penghentian lama',
        varian('P2a', 'Betul', { k: 'dan', p: [naik, { k: 'alasan', susp: sO.fact_id, kategori: kX }] }, `Betul, penghentian ${tglO} pun karena ${FRASA_ALASAN[kX]}.`, ['penghentian', ...INTI_ALASAN[kX]], tglOPolos),
        varian('P2b', 'Betul', { k: 'dan', p: [naik, { k: 'alasan', susp: sO.fact_id, kategori: kX }] }, `Betul, ${tglO} juga dihentikan karena ${FRASA_ALASAN[kX]}.`, ['dihentikan', ...INTI_ALASAN[kX]], tglOPolos),
      ),
      slot(
        'p3',
        'Keliru: bagian yang benar dibantah, bagian yang salah dibenarkan',
        varian('P3a', 'Keliru', { k: 'dan', p: [{ k: 'bukan', p: naik }, { k: 'bukan', p: adaSusp }] }, 'Keliru, harganya sempat turun, tapi memang belum pernah dihentikan.', ['turun', 'belum pernah'], null),
        varian('P3b', 'Keliru', { k: 'dan', p: [{ k: 'bukan', p: naik }, { k: 'bukan', p: adaSusp }] }, 'Keliru, naiknya tidak beruntun, tapi belum pernah dihentikan tahun ini.', ['beruntun', 'belum pernah'], null),
      ),
    ],
    salah_kaprah: 'bagian omongan yang benar membuat bagian lainnya ikut terdengar benar',
    topik: 'suspensi',
  };
  return [lengkapi(r, paket)];
}

/* ---------------------------------------------------------------------- */
/* pola 6 — benar-berincian (ULTJ s3)                                      */
/* ---------------------------------------------------------------------- */

function kartuKedua(paket: PaketFakta, kecuali: readonly string[]): string | null {
  const calon = [...selisihHarga(paket).map((x) => x.fact_id), ...kelipatanHarga(paket).map((x) => x.fact_id), ...hargaHarian(paket).map((x) => x.fact_id).reverse()];
  return calon.find((id) => !kecuali.includes(id)) ?? null;
}

export function polaBenarBerincian(paket: PaketFakta): RencanaSoal[] {
  const T = paket.tanggal_t;
  const hn = hariNaik(paket);
  if (hn === null || hn.nilai < 3) return [];
  const f = fakta(paket, hn.fact_id);
  const tglDari = tanggalPendek(fakta(paket, hn.dari).terbit, T);
  const tglSampai = tanggalPendek(fakta(paket, hn.sampai).terbit, T);
  if (!f.klaim.includes(tglDari)) return [];
  const kedua = kartuKedua(paket, [hn.fact_id]);
  if (kedua === null) return [];
  const m = Math.max(2, Math.floor(hn.nilai / 2));
  if (m === hn.nilai) return [];
  const naik: Proposisi = { k: 'naik-beruntun', fact_id: hn.fact_id, hari: hn.nilai };
  const nHari = tok(hn.fact_id, `${angkaId(hn.nilai)} hari bursa`);
  const sampai = tok(hn.fact_id, tglSampai);
  const r: Omit<RencanaSoal, 'rujukan_penjelasan' | 'asal'> = {
    pola: 'benar-berincian',
    sudut: hn.fact_id,
    kartu: [hn.fact_id, kedua],
    kartu_penentu: [hn.fact_id],
    klaim: {
      proposisi: naik,
      label: 'Betul',
      inti: `Teman bilang sejak ${tglDari} harga penutupannya naik terus setiap hari bursa, tidak pernah turun sekali pun.`,
      angka: [{ teks: tglDari, fact_id: hn.fact_id }],
      wajib: [[tglDari]],
    },
    slot: [
      slot(
        'kunci',
        'Betul + rincian yang tepat',
        varian('K1', 'Betul', naik, `Betul, naik ${nHari} berturut-turut sampai ${sampai}.`, ['berturut-turut'], null),
        varian('K2', 'Betul', naik, `Betul, penutupannya naik ${nHari} berturut-turut sampai ${sampai}.`, ['berturut-turut'], null),
      ),
      slot(
        'p1',
        'Keliru: menyangkal rangkaian yang tercatat',
        varian('P1a', 'Keliru', { k: 'bukan', p: naik }, `Keliru, harganya sempat turun satu hari sebelum ${sampai}.`, ['turun'], null),
        varian('P1b', 'Keliru', { k: 'bukan', p: naik }, `Keliru, ada satu penutupan yang lebih rendah sebelum ${sampai}.`, ['lebih rendah'], null),
      ),
      slot(
        'p2',
        'Betul + rincian yang salah',
        varian('P2a', 'Betul', { k: 'naik-beruntun', fact_id: hn.fact_id, hari: m }, `Betul, tapi naik beruntunnya hanya ${misal(`${angkaId(m)} hari bursa`)}.`, ['hanya'], null),
        varian('P2b', 'Betul', { k: 'naik-beruntun', fact_id: hn.fact_id, hari: m }, `Betul, walau rangkaian naiknya cuma ${misal(`${angkaId(m)} hari bursa`)}.`, ['cuma'], null),
      ),
      slot(
        'p3',
        'Keliru: arah dibalik',
        varian('P3a', 'Keliru', { k: 'arah', dari: hn.dari, ke: hn.sampai, arah: 'turun' }, `Keliru, harga penutupannya malah turun beruntun sampai ${sampai}.`, ['turun'], null),
        varian('P3b', 'Keliru', { k: 'arah', dari: hn.dari, ke: hn.sampai, arah: 'turun' }, `Keliru, penutupannya justru makin rendah sampai ${sampai}.`, ['rendah'], null),
      ),
    ],
    salah_kaprah: 'menganggap omongan yang terdengar yakin pasti dilebih-lebihkan, padahal rangkaiannya tercatat di dokumen',
    topik: 'harga',
  };
  return [lengkapi(r, paket)];
}

/* ---------------------------------------------------------------------- */
/* pola 3 — arah-kali-tingkat (DADA s3)                                    */
/* ---------------------------------------------------------------------- */

export interface Tingkat {
  kata: string;
  min: number;
  maks: number;
}

export const TINGKAT_RUPIAH: readonly Tingkat[] = [
  { kata: 'belasan rupiah', min: 10, maks: 20 },
  { kata: 'puluhan rupiah', min: 20, maks: 100 },
  { kata: 'ratusan rupiah', min: 100, maks: 1000 },
  { kata: 'ribuan rupiah', min: 1000, maks: 10_000 },
  { kata: 'puluhan ribu rupiah', min: 10_000, maks: 100_000 },
];

export const tingkatDari = (n: number): Tingkat | null => TINGKAT_RUPIAH.find((t) => n >= t.min && n < t.maks) ?? null;

export function polaArahKaliTingkat(paket: PaketFakta): RencanaSoal[] {
  const T = paket.tanggal_t;
  const hn = hariNaik(paket);
  if (hn === null) return [];
  const a = fakta(paket, hn.dari);
  const b = fakta(paket, hn.sampai);
  if (typeof a.nilai !== 'number' || typeof b.nilai !== 'number') return [];
  const tA = tingkatDari(a.nilai);
  const tB = tingkatDari(b.nilai);
  if (tA === null || tB === null || tA.kata === tB.kata) return [];
  const tgl = tanggalPendek(b.terbit, T);
  const f = fakta(paket, hn.fact_id);
  if (!f.klaim.includes(tgl)) return [];
  const pen = tok(hn.fact_id, tgl);
  const naik: Proposisi = { k: 'arah', dari: hn.dari, ke: hn.sampai, arah: 'naik' };
  const turun: Proposisi = { k: 'arah', dari: hn.dari, ke: hn.sampai, arah: 'turun' };
  const diB: Proposisi = { k: 'rentang', fact_id: hn.sampai, min: tB.min, maks: tB.maks };
  const diA: Proposisi = { k: 'rentang', fact_id: hn.sampai, min: tA.min, maks: tA.maks };
  const kedua = kartuKedua(paket, [hn.fact_id]);
  if (kedua === null) return [];
  const r: Omit<RencanaSoal, 'rujukan_penjelasan' | 'asal'> = {
    pola: 'arah-kali-tingkat',
    sudut: hn.fact_id,
    kartu: [hn.fact_id, kedua],
    kartu_penentu: [hn.fact_id],
    klaim: {
      proposisi: diA,
      label: 'Keliru',
      inti: `Teman bilang harga penutupan ${tgl} masih ${tA.kata} per lembar, jadi harganya belum ke mana-mana.`,
      angka: [{ teks: tgl, fact_id: hn.fact_id }],
      wajib: [[tgl]],
    },
    slot: [
      slot(
        'kunci',
        'arah benar × tingkat benar',
        varian('K1', 'Keliru', { k: 'dan', p: [naik, diB] }, `Keliru, harganya naik sampai ${tB.kata} pada ${pen}.`, ['naik', tB.kata], tgl),
        varian('K2', 'Keliru', { k: 'dan', p: [naik, diB] }, `Keliru, penutupan ${pen} sudah ${tB.kata} sesudah naik beruntun.`, ['naik', tB.kata], tgl),
      ),
      slot(
        'p1',
        'arah benar × tingkat salah',
        varian('P1a', 'Betul', { k: 'dan', p: [naik, diA] }, `Betul, harganya naik tapi ${pen} masih ${tA.kata}.`, ['naik', tA.kata], tgl),
        varian('P1b', 'Betul', { k: 'dan', p: [naik, diA] }, `Betul, penutupan ${pen} masih ${tA.kata} walau naik beruntun.`, ['naik', tA.kata], tgl),
      ),
      slot(
        'p2',
        'arah salah × tingkat salah',
        varian('P2a', 'Betul', { k: 'dan', p: [turun, diA] }, `Betul, harganya turun sampai ${tA.kata} pada ${pen}.`, ['turun', tA.kata], tgl),
        varian('P2b', 'Betul', { k: 'dan', p: [turun, diA] }, `Betul, penutupan ${pen} tinggal ${tA.kata} sesudah turun beruntun.`, ['turun', tA.kata], tgl),
      ),
      slot(
        'p3',
        'arah salah × tingkat benar',
        varian('P3a', 'Keliru', { k: 'dan', p: [turun, diB] }, `Keliru, harganya turun tapi ${pen} masih ${tB.kata}.`, ['turun', tB.kata], tgl),
        varian('P3b', 'Keliru', { k: 'dan', p: [turun, diB] }, `Keliru, penutupan ${pen} masih ${tB.kata} walau turun beruntun.`, ['turun', tB.kata], tgl),
      ),
    ],
    salah_kaprah: 'melihat angka rupiah yang kecil lalu mengira harganya belum bergerak jauh',
    topik: 'harga',
  };
  return [lengkapi(r, paket)];
}

/* ---------------------------------------------------------------------- */
/* pola 2 — besaran-hitungan (DADA s2)                                     */
/* ---------------------------------------------------------------------- */

export function polaBesaranHitungan(paket: PaketFakta): RencanaSoal[] {
  const T = paket.tanggal_t;
  const hasil: RencanaSoal[] = [];
  for (const kel of kelipatanHarga(paket)) {
    if (kel.nilai < 1.5) continue;
    const n = Math.floor(kel.nilai);
    const f = fakta(paket, kel.fact_id);
    const tglDari = tanggalPendek(kel.dari, T);
    const tglSampai = tanggalPendek(kel.sampai, T);
    if (!f.klaim.includes(tglDari) || !f.klaim.includes(tglSampai)) continue;
    const selisih = selisihHarga(paket).find((s) => s.dari === kel.dari && s.sampai === kel.sampai) ?? null;
    const semuaNilai = new Set(paket.fakta.map((x) => x.nilai).filter((x): x is number => typeof x === 'number'));
    let salah = Math.round((kel.nilai + 1.3) * 100) / 100;
    while (semuaNilai.has(salah)) salah = Math.round((salah + 0.1) * 100) / 100;
    const lipat: Proposisi = { k: 'banding', fact_id: kel.fact_id, op: '>=', ambang: n };
    const sampai = tok(kel.fact_id, tglSampai);
    const dari = tok(kel.fact_id, tglDari);
    const kartu = [kel.fact_id, ...(selisih === null ? [] : [selisih.fact_id])];
    const hn = hariNaik(paket);
    if (kartu.length < 2 && hn !== null) kartu.push(hn.fact_id);
    if (kartu.length < 2) continue;
    const kurang: Proposisi = { k: 'banding', fact_id: kel.fact_id, op: '<', ambang: n };
    const tolakSelisih: Proposisi = selisih === null ? kurang : { k: 'dan', p: [{ k: 'nilai', fact_id: selisih.fact_id, nilai: selisih.nilai }, kurang] };
    const teksP2a =
      selisih === null
        ? `Keliru, kenaikannya belum sampai ${kataAngka(n)} kali lipat.`
        : `Keliru, naiknya cuma ${tok(selisih.fact_id, rupiah(selisih.nilai))}, bukan ${kataAngka(n)} kali lipat.`;
    const r: Omit<RencanaSoal, 'rujukan_penjelasan' | 'asal'> = {
      pola: 'besaran-hitungan',
      sudut: kel.fact_id,
      kartu,
      kartu_penentu: [kel.fact_id],
      klaim: {
        proposisi: lipat,
        label: 'Betul',
        inti: `Teman bilang sejak ${tglDari} harga penutupannya sudah lebih dari ${kataAngka(n)} kali lipat.`,
        angka: [{ teks: tglDari, fact_id: kel.fact_id }],
        wajib: [[tglDari]],
      },
      slot: [
        slot(
          'kunci',
          'Betul + angka hitungan',
          varian('K1', 'Betul', { k: 'dan', p: [lipat, { k: 'nilai', fact_id: kel.fact_id, nilai: kel.nilai }] }, `Betul, penutupan ${sampai} ${tok(kel.fact_id, `${angkaId(kel.nilai)} kali`)} penutupan ${dari}.`, ['kali'], null),
          varian('K2', 'Betul', { k: 'dan', p: [lipat, { k: 'nilai', fact_id: kel.fact_id, nilai: kel.nilai }] }, `Betul, dari ${dari} sampai ${sampai} harganya jadi ${tok(kel.fact_id, `${angkaId(kel.nilai)} kali`)}.`, ['kali'], null),
        ),
        slot(
          'p1',
          'Betul + angka hitungan yang salah',
          varian('P1a', 'Betul', { k: 'nilai', fact_id: kel.fact_id, nilai: salah }, `Betul, penutupan ${sampai} ${misal(`${angkaId(salah)} kali`)} penutupan ${dari}.`, ['kali'], null),
          varian('P1b', 'Betul', { k: 'nilai', fact_id: kel.fact_id, nilai: salah }, `Betul, dari ${dari} sampai ${sampai} harganya jadi ${misal(`${angkaId(salah)} kali`)}.`, ['kali'], null),
        ),
        slot(
          'p2',
          'Keliru: selisih rupiah dikira kelipatan',
          varian('P2a', 'Keliru', tolakSelisih, teksP2a, ['kali lipat'], null),
          varian('P2b', 'Keliru', kurang, `Keliru, sejak ${dari} harganya belum sampai ${kataAngka(n)} kali lipat.`, ['belum sampai'], null),
        ),
        slot(
          'p3',
          'Keliru: arah dibalik',
          varian('P3a', 'Keliru', { k: 'arah', dari: `harga-${kel.dari}`, ke: `harga-${kel.sampai}`, arah: 'turun' }, `Keliru, penutupan ${sampai} malah lebih rendah dari ${dari}.`, ['lebih rendah'], null),
          varian('P3b', 'Keliru', { k: 'arah', dari: `harga-${kel.dari}`, ke: `harga-${kel.sampai}`, arah: 'turun' }, `Keliru, dari ${dari} sampai ${sampai} harganya justru turun.`, ['turun'], null),
        ),
      ],
      salah_kaprah: 'mencampur selisih rupiah dengan kelipatan harga',
      topik: 'harga',
    };
    hasil.push(lengkapi(r, paket));
  }
  return hasil;
}

/* ---------------------------------------------------------------------- */
/* semua pola                                                              */
/* ---------------------------------------------------------------------- */

export const PEMBANGUN_POLA: Readonly<Record<IdPola, (p: PaketFakta) => RencanaSoal[]>> = {
  'sebab-resmi': polaSebabResmi,
  'besaran-hitungan': polaBesaranHitungan,
  'arah-kali-tingkat': polaArahKaliTingkat,
  'angka-lain-waktu': polaAngkaLainWaktu,
  'setengah-benar': polaSetengahBenar,
  'benar-berincian': polaBenarBerincian,
};

/** Semua rencana yang bisa dibangun dari paket, urut `URUTAN_POLA`. Rencana yang proposisinya menyebut fakta tak ada dibuang. */
export function semuaRencana(paket: PaketFakta): RencanaSoal[] {
  const hasil: RencanaSoal[] = [];
  for (const id of URUTAN_POLA) {
    for (const r of PEMBANGUN_POLA[id](paket)) {
      try {
        evaluasi(r.klaim.proposisi, paket);
        hasil.push(r);
      } catch {
        // fakta yang dibutuhkan tidak ada: pola tidak berlaku untuk paket ini
      }
    }
  }
  return hasil;
}
