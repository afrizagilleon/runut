/**
 * Pengubah hasil AI agent penulis soal menjadi definisi kasus produk.
 *
 * Agent (`npm run agen`) menghasilkan dua benda: paket fakta yang ia baca
 * (`eval/penyusun/<jalan>/paket.json`) dan omongan yang lolos semua gerbang
 * (`eval/bank-omongan/<sha paket>/<id>.json`). Bentuk itu lebih miskin
 * daripada kasus yang dimainkan: tidak ada teks kartu awam, istilah, layar
 * pembukaan, maupun penutup. Berkas ini menyambungkannya ke pembangun yang
 * SAMA dengan kasus lain (`bangunKasusUmum`), dengan satu garis yang tegas:
 *
 * - **Tulisan agent dipakai apa adanya** — pesan, keempat pilihan, kunci,
 *   penjelasan, kartu, dan kartu penentu. Tidak satu huruf pun diubah di sini;
 *   `periksaSetia` membuktikannya sesudah kasus dibangun.
 * - **Yang bisa diturunkan, diturunkan** — identitas emiten, tanggal beku,
 *   alamat sumber, fakta turunan (definisi paket yang sama dengan yang dibaca
 *   agent), kalimat fakta yang diperjelas, `fakta_terlihat`, `fact_ids`,
 *   layar pertama, dan tiga kalimat tetap.
 * - **Yang butuh penilaian manusia dibaca dari satu lampiran penyetuju** per
 *   kasus (`factory/kasus/lampiran/`): judul, teks kartu awam, istilah, judul
 *   pertanyaan, layar pembukaan, penutup, kartu konsep.
 *
 * Yang TIDAK terbawa, karena skema kasus tidak punya tempatnya: `pengecoh`
 * (umpan balik per pilihan salah), `pertanyaan_cek`, dan `angka_pesan`.
 * `angka_pesan` tetap diperiksa (fact_id-nya harus ada di paket), lalu
 * ditinggal: pesan adalah ucapan orang dan angkanya memang tidak ditautkan.
 *
 * Pengubah ini tidak memperbaiki apa pun. Kalau validator kasus menolak teks
 * agent, yang benar adalah berhenti dan melaporkannya — bukan menulis ulang
 * kalimat agent di sini.
 */
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { pilihDefinisi } from '../../alat/penyusun/paket-otomatis.ts';
import { tanggalId } from '../format.ts';
import { PERJELAS_KLAIM, type PaketFakta } from '../llm/paket.ts';
import { pustakaGudang } from '../muat/pustaka-gudang.ts';
import type { BerkasBeku } from '../muat/sidik.ts';
import { PENANDA_BUKAN_FAKTA, ambilRujukan, teksPolos } from '../skema/rujukan.ts';
import type {
  Fakta,
  Istilah,
  KartuKonsep,
  Kasus,
  Pembuka,
  Pembukaan,
  Penutup,
  Soal,
  TeksAwam,
} from '../skema/tipe.ts';
import type { DataEmiten } from '../verifikasi/tipe.ts';
import type { DefinisiKasusUmum } from './bangun.ts';

/* ------------------------------------------------------------------ */
/* Bentuk masukan                                                      */
/* ------------------------------------------------------------------ */

export const HURUF_OPSI = ['a', 'b', 'c', 'd'] as const;
export type HurufOpsi = (typeof HURUF_OPSI)[number];

/** Satu omongan seperti ditulis agent (medan `omongan` di berkas bank). */
export interface OmonganAgen {
  nama: string;
  jam: string;
  pesan: string;
  angka_pesan: Array<{ teks: string; fact_id?: string; andaian?: boolean }>;
  kartu: string[];
  kartu_penentu: string[];
  pilihan: Record<HurufOpsi, string>;
  kunci: HurufOpsi;
  penjelasan: string;
  /** Umpan balik per pilihan salah. Tidak punya tempat di skema kasus. */
  pengecoh?: unknown;
  /** Tidak punya tempat di skema kasus. */
  pertanyaan_cek?: string;
}

/** Satu berkas bank omongan; hanya medan yang dipakai pengubah. */
export interface EntriOmongan {
  id: string;
  paket_sha: string;
  omongan: OmonganAgen;
}

/** Yang ditulis penyetuju untuk satu omongan. */
export interface LampiranSoal {
  /** Id berkas bank omongan yang dilampiri (16 heksadesimal). */
  id_omongan: string;
  soal_id: string;
  /** Judul pertanyaan satu baris; wajib menyebut nama pengirimnya. */
  tanya: string;
  /** 0–2 istilah. */
  istilah: Istilah[];
}

/**
 * Lampiran penyetuju: seluruh tulisan manusia untuk satu kasus dari agent,
 * ditambah penunjuk ke benda yang dilampirinya.
 */
export interface LampiranPenyetuju {
  kasus_id: string;
  /** Penunjuk ke hasil agent dan data mentahnya. Bukan tulisan; alamat. */
  sumber: {
    /** Jalur `paket.json`, relatif terhadap akar repo. */
    paket: string;
    /** sha256 berkas paket itu = nama folder bank omongannya. */
    paket_sha256: string;
    /** Folder bank omongan, relatif terhadap akar repo. */
    bank: string;
    /**
     * Berkas gudang yang dipakai membangun kasus ini, dengan sidiknya. Kasus
     * tidak dibangun dari "apa pun yang ada di `.cache/sectors/`" (M4a A-1).
     */
    gudang: BerkasBeku[];
  };
  judul: string;
  /** Papan dan sektor tidak dibawa `DataEmiten`; penyetuju menyalinnya dari ringkasan emiten. */
  emiten: { papan: string; sektor: string };
  /** Tiga soal, dalam urutan main. Urutan ini keputusan penyetuju. */
  soal: LampiranSoal[];
  /** Teks kartu per fact_id; kuncinya harus tepat sama dengan seluruh kartu ketiga soal. */
  awam: Record<string, TeksAwam>;
  pembukaan: Pembukaan;
  penutup: Penutup;
  kartu_konsep: KartuKonsep[];
}

export interface MasukanDariAgen {
  paket: PaketFakta;
  omongan: readonly EntriOmongan[];
  lampiran: LampiranPenyetuju;
  /** Data emiten PENUH dari gudang (layar pembukaan bercerita tentang sesudah T). */
  data: DataEmiten;
}

/** Hasil agent tidak bisa diubah menjadi kasus; pesannya menyebut butirnya. */
export class HasilAgenTidakSah extends Error {
  readonly butir: string[];

  constructor(kasus_id: string, butir: string[]) {
    super(
      `Hasil agent untuk kasus "${kasus_id}" tidak bisa diubah menjadi kasus; ` +
        `${String(butir.length)} butir:\n` +
        butir.map((b) => `  - ${b}`).join('\n'),
    );
    this.name = 'HasilAgenTidakSah';
    this.butir = butir;
  }
}

/* ------------------------------------------------------------------ */
/* Bagian tetap produk                                                 */
/* ------------------------------------------------------------------ */

/**
 * Layar pertama: judul dan ajakan yang sama di semua kasus (M3.9 D-4); contoh
 * omongannya dibaca aplikasi dari soal pertama. `menit` 5 = median durasi
 * penyelesai alpha untuk kasus tiga soal (lihat `Pembuka.menit`).
 */
export const PEMBUKA_BAKU: Pembuka = {
  judul: 'Cek omongan saham di grup ke dokumen resminya.',
  ajak: 'Betul atau keliru?',
  menit: 5,
};

/** Tiga kalimat tetap RQ-08; hanya tanggalnya yang berbeda antar kasus. */
export function disclaimerBaku(tanggal_t: string): string[] {
  return [
    `Data di halaman ini menggambarkan keadaan pada ${tanggalId(tanggal_t)} dan bukan kondisi perusahaan sekarang.`,
    'Produk ini tidak menyarankan membeli atau menjual efek apa pun.',
    'Setiap angka di halaman ini bisa ditelusuri ke sumbernya.',
  ];
}

/* ------------------------------------------------------------------ */
/* Pembaca berkas agent                                                */
/* ------------------------------------------------------------------ */

const sha256 = (isi: Buffer | string): string => createHash('sha256').update(isi).digest('hex');

/** JSON kanonik (kunci objek terurut) — rumus yang sama dengan `factory/llm/bebas/bank.ts`. */
function jsonKanonik(x: unknown): string {
  if (Array.isArray(x)) return `[${x.map(jsonKanonik).join(',')}]`;
  if (typeof x === 'object' && x !== null) {
    const o = x as Record<string, unknown>;
    return `{${Object.keys(o)
      .filter((k) => o[k] !== undefined)
      .sort()
      .map((k) => `${JSON.stringify(k)}:${jsonKanonik(o[k])}`)
      .join(',')}}`;
  }
  return JSON.stringify(x) ?? 'null';
}

/** Id omongan = 16 heksadesimal pertama sha256 JSON kanonik drafnya (rumus bank). */
export function idOmonganAgen(o: OmonganAgen): string {
  return sha256(Buffer.from(jsonKanonik(o), 'utf8')).slice(0, 16);
}

/**
 * Baca paket dan omongan yang ditunjuk lampiran, dan pastikan keduanya memang
 * benda yang dimaksud: sidik paket cocok, tiap omongan lahir dari paket itu,
 * dan isi tiap omongan belum disentuh sejak disimpan bank (id = sidik isinya).
 */
export function bacaSumberAgen(
  lampiran: LampiranPenyetuju,
  akar: string,
): { paket: PaketFakta; omongan: EntriOmongan[] } {
  const butir: string[] = [];
  const mentahPaket = readFileSync(`${akar}${lampiran.sumber.paket}`);
  const sidik = sha256(mentahPaket);
  if (sidik !== lampiran.sumber.paket_sha256) {
    butir.push(
      `paket "${lampiran.sumber.paket}" bersidik ${sidik.slice(0, 12)}…, ` +
        `bukan ${lampiran.sumber.paket_sha256.slice(0, 12)}… seperti ditulis lampiran`,
    );
  }
  const paket = JSON.parse(mentahPaket.toString('utf8')) as PaketFakta;

  const omongan: EntriOmongan[] = [];
  for (const s of lampiran.soal) {
    const jalur = `${akar}${lampiran.sumber.bank}/${lampiran.sumber.paket_sha256}/${s.id_omongan}.json`;
    const e = JSON.parse(readFileSync(jalur, 'utf8')) as EntriOmongan;
    if (e.id !== s.id_omongan) butir.push(`berkas bank ${s.id_omongan}.json mengaku ber-id "${e.id}"`);
    if (e.paket_sha !== lampiran.sumber.paket_sha256) {
      butir.push(`omongan ${s.id_omongan} lahir dari paket ${e.paket_sha.slice(0, 12)}…, bukan paket lampiran`);
    }
    const hitung = idOmonganAgen(e.omongan);
    if (hitung !== e.id) {
      butir.push(`isi omongan ${s.id_omongan} sudah berubah sejak disimpan bank (sidik isinya ${hitung})`);
    }
    omongan.push({ id: e.id, paket_sha: e.paket_sha, omongan: e.omongan });
  }
  if (butir.length > 0) throw new HasilAgenTidakSah(lampiran.kasus_id, butir);
  return { paket, omongan };
}

/* ------------------------------------------------------------------ */
/* Pengubah                                                            */
/* ------------------------------------------------------------------ */

function rujukanFakta(teks: string): string[] {
  return ambilRujukan(teks)
    .map((r) => r.fact_id)
    .filter((id) => !PENANDA_BUKAN_FAKTA.includes(id));
}

function lolosRegex(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/** Kata terlarang paket yang muncul di `teks` (tanpa peduli huruf besar-kecil, berbatas bukan-alfanumerik). */
export function kataTerlarangDi(teks: string, kata: readonly string[]): string[] {
  const polos = teksPolos(teks);
  return kata.filter((k) => {
    const bersih = k.trim();
    if (bersih === '') return false;
    return new RegExp(`(?<![A-Za-z0-9])${lolosRegex(bersih)}(?![A-Za-z0-9])`, 'i').test(polos);
  });
}

/** Satu omongan agent → satu soal kasus. Teks agent disalin, tidak ditulis ulang. */
function soalDari(o: OmonganAgen, l: LampiranSoal): Soal {
  return {
    soal_id: l.soal_id,
    kartu: [...o.kartu],
    kartu_penentu: [...o.kartu_penentu],
    istilah: l.istilah.map((i) => ({ ...i })),
    pesan: { nama: o.nama, jam: o.jam, isi: o.pesan },
    tanya: l.tanya,
    // Cara main dikatakan layar pertama (M3.9 D-3); tidak ada kasus yang memakai petunjuk.
    petunjuk: null,
    pilihan: HURUF_OPSI.map((h) => ({ kunci: h, teks: o.pilihan[h] })),
    jawaban: o.kunci,
    penjelasan: o.penjelasan,
    // Dasar jawaban = kartu penentu yang ditetapkan agent dan diuji gerbangnya.
    fact_ids: [...o.kartu_penentu],
  };
}

/** Seluruh teks definisi yang dibaca pemain, dengan nama tempatnya. */
function teksPemain(def: Pick<DefinisiKasusUmum, 'judul' | 'soal' | 'awam' | 'pembukaan' | 'penutup'>): Array<[string, string]> {
  const hasil: Array<[string, string]> = [['judul', def.judul]];
  for (const s of def.soal) {
    hasil.push(
      [`soal "${s.soal_id}" (nama)`, s.pesan.nama],
      [`soal "${s.soal_id}" (pesan)`, s.pesan.isi],
      [`soal "${s.soal_id}" (tanya)`, s.tanya],
      [`soal "${s.soal_id}" (penjelasan)`, s.penjelasan],
    );
    for (const p of s.pilihan) hasil.push([`soal "${s.soal_id}" (pilihan ${p.kunci})`, p.teks]);
    for (const i of s.istilah) hasil.push([`soal "${s.soal_id}" (istilah ${i.kata})`, `${i.kata} ${i.arti}`]);
  }
  for (const [id, t] of Object.entries(def.awam)) hasil.push([`kartu "${id}"`, `${t.kepala} ${t.isi}`]);
  const p = def.pembukaan;
  for (const [nama, baris] of [
    ['paragraf', p.paragraf],
    ['bisa_dibaca', p.bisa_dibaca],
    ['tidak_bisa_dibaca', p.tidak_bisa_dibaca],
    ['disingkirkan', p.disingkirkan],
  ] as const) {
    baris.forEach((b, i) => hasil.push([`pembukaan (${nama} ke-${String(i + 1)})`, b]));
  }
  hasil.push(['penutup', `${def.penutup.kepala} ${def.penutup.isi}`]);
  return hasil;
}

/**
 * Ubah hasil agent + lampiran penyetuju menjadi definisi kasus jalur umum.
 *
 * Murni: tidak membaca berkas, tidak memanggil jaringan. Gagal keras
 * (`HasilAgenTidakSah`) bila masukan tidak saling cocok; tidak pernah
 * memperbaiki teks agent.
 */
export function dariAgen(m: MasukanDariAgen): DefinisiKasusUmum {
  const { paket, lampiran, data } = m;
  const butir: string[] = [];
  const idPaket = new Set(paket.fakta.map((f) => f.fact_id));

  // --- lampiran dan omongan harus berpasangan satu-satu --------------------
  const perId = new Map(m.omongan.map((e) => [e.id, e]));
  if (perId.size !== m.omongan.length) butir.push('ada omongan ber-id sama di masukan');
  const dipakai = new Set<string>();
  const pasangan: Array<{ entri: EntriOmongan; lampiran: LampiranSoal }> = [];
  for (const l of lampiran.soal) {
    const entri = perId.get(l.id_omongan);
    if (entri === undefined) {
      butir.push(`lampiran menyebut omongan "${l.id_omongan}" yang tidak ada di masukan`);
      continue;
    }
    if (dipakai.has(l.id_omongan)) butir.push(`omongan "${l.id_omongan}" dilampiri dua kali`);
    dipakai.add(l.id_omongan);
    pasangan.push({ entri, lampiran: l });
  }
  for (const e of m.omongan) {
    if (!dipakai.has(e.id)) butir.push(`omongan "${e.id}" (${e.omongan.nama}) tidak punya lampiran penyetuju`);
  }
  if (new Set(m.omongan.map((e) => e.paket_sha)).size > 1) {
    butir.push('omongan di masukan lahir dari paket yang berbeda-beda');
  }
  if (paket.simbol !== data.simbol) {
    butir.push(`paket untuk emiten ${paket.simbol}, tetapi data gudang yang diberikan milik ${data.simbol}`);
  }

  // --- tiap fact_id yang disebut agent harus ada di paket yang ia baca -----
  for (const { entri } of pasangan) {
    const o = entri.omongan;
    const di = `omongan ${o.nama} (${entri.id})`;
    for (const id of [...o.kartu, ...o.kartu_penentu]) {
      if (!idPaket.has(id)) butir.push(`${di}: kartu "${id}" tidak ada di paket`);
    }
    for (const a of o.angka_pesan) {
      if (a.fact_id !== undefined && !idPaket.has(a.fact_id)) {
        butir.push(`${di}: angka pesan "${a.teks}" menunjuk "${a.fact_id}" yang tidak ada di paket`);
      }
    }
    for (const teks of [o.penjelasan, ...HURUF_OPSI.map((h) => o.pilihan[h])]) {
      for (const id of rujukanFakta(teks)) {
        if (!idPaket.has(id)) butir.push(`${di}: teks menautkan "${id}" yang tidak ada di paket`);
      }
    }
    if (!HURUF_OPSI.includes(o.kunci)) butir.push(`${di}: kunci "${String(o.kunci)}" bukan a–d`);
  }

  // --- teks kartu: tepat satu untuk tiap kartu, tidak lebih ----------------
  const soal = pasangan.map((p) => soalDari(p.entri.omongan, p.lampiran));
  const terlihat = [...new Set(soal.flatMap((s) => s.kartu))];
  for (const id of terlihat) {
    if (lampiran.awam[id] === undefined) butir.push(`lampiran tidak punya teks kartu awam untuk "${id}"`);
  }
  for (const id of Object.keys(lampiran.awam)) {
    if (!terlihat.includes(id)) butir.push(`lampiran menulis teks kartu untuk "${id}", yang bukan kartu soal mana pun`);
  }

  // --- definisi paket yang sama dengan yang dibaca agent -------------------
  const defPaket = pilihDefinisi(paket.simbol, paket.tanggal_t, data).def;
  if (defPaket.paket_id !== paket.paket_id) {
    butir.push(`definisi paket untuk ${paket.simbol} ${paket.tanggal_t} ber-id "${defPaket.paket_id}", bukan "${paket.paket_id}"`);
  }
  const sumber: DefinisiKasusUmum['sumber'] = {
    // Bentuk alamat yang sama dengan pembangun paket (`bangunPaket`).
    endpoint: {
      harga: `/v2/daily/${paket.simbol}/`,
      laporan: '/v2/filings/',
      aksi: `/v2/company/corporate-actions/${paket.simbol}/`,
      suspensi: '/v2/suspensions/',
    },
    parameter: { laporan: { symbol: paket.simbol } },
    peran: defPaket.peran,
  };
  const turunan: DefinisiKasusUmum['turunan'] = (pustaka, d) =>
    defPaket.turunan(pustaka, d, () => 'TERVERIFIKASI');

  /*
   * Kalimat fakta yang dibaca pemain di panel sumber harus kalimat yang dibaca
   * agent. Pembangun paket memperjelas beberapa kalimat pemuat
   * (`PERJELAS_KLAIM`); penggantian yang sama dipasang di sini lewat
   * `perjelas_klaim`, hanya untuk fakta yang dipakai soal. Kalau sesudah itu
   * kalimatnya masih berbeda, kartu akan mengatakan hal lain daripada yang
   * diuji gerbang agent — itu ditolak, bukan dibiarkan.
   */
  const perjelas: Array<{ fact_id: string; lama: string; baru: string }> = [];
  const dasar = pustakaGudang(data, {
    ...sumber,
    asal: { harga: new Map(), suspensi: new Map(), aksi: new Map(), ringkasan: new Map(), kepemilikan: new Map() },
  }).fakta;
  const pustaka: Fakta[] = [...dasar];
  for (const f of turunan(pustaka, data)) pustaka.push(f);
  const dipakaiSoal = new Set<string>(
    soal.flatMap((s) => [...s.kartu, ...rujukanFakta(s.penjelasan), ...s.pilihan.flatMap((p) => rujukanFakta(p.teks))]),
  );
  for (const f of paket.fakta) {
    if (!dipakaiSoal.has(f.fact_id)) continue;
    const asli = pustaka.find((x) => x.fact_id === f.fact_id);
    if (asli === undefined) {
      butir.push(`fakta paket "${f.fact_id}" tidak bisa dibangun ulang dari data gudang`);
      continue;
    }
    let klaim = asli.klaim;
    for (const g of PERJELAS_KLAIM) {
      if (klaim === f.klaim) break;
      if (klaim.split(g.lama).length - 1 !== 1) continue;
      perjelas.push({ fact_id: f.fact_id, lama: g.lama, baru: g.baru });
      klaim = klaim.replace(g.lama, g.baru);
    }
    if (klaim !== f.klaim) {
      butir.push(
        `kalimat fakta "${f.fact_id}" di gudang ("${klaim}") tidak sama dengan yang dibaca agent ("${f.klaim}")`,
      );
    }
  }

  const def: DefinisiKasusUmum = {
    kasus_id: lampiran.kasus_id,
    judul: lampiran.judul,
    simbol: paket.simbol,
    emiten: {
      simbol: paket.simbol,
      nama: paket.nama_emiten,
      papan: lampiran.emiten.papan,
      sektor: lampiran.emiten.sektor,
    },
    nama_samaran: paket.nama_samaran,
    tanggal_t: paket.tanggal_t,
    perjelas_klaim: perjelas,
    sumber,
    turunan,
    pembuka: { ...PEMBUKA_BAKU },
    fakta_terlihat: terlihat,
    awam: lampiran.awam,
    soal,
    pembukaan: lampiran.pembukaan,
    penutup: lampiran.penutup,
    kartu_konsep: lampiran.kartu_konsep,
    disclaimer: disclaimerBaku(paket.tanggal_t),
  };

  // --- nama asli tidak boleh sampai ke teks yang dibaca pemain -------------
  for (const [tempat, teks] of teksPemain(def)) {
    const kena = kataTerlarangDi(teks, paket.kata_terlarang);
    if (kena.length > 0) butir.push(`${tempat} memuat kata terlarang paket: ${kena.join(', ')}`);
  }

  if (butir.length > 0) throw new HasilAgenTidakSah(lampiran.kasus_id, butir);
  return def;
}

/* ------------------------------------------------------------------ */
/* Bukti sesudah dibangun                                              */
/* ------------------------------------------------------------------ */

/**
 * Kasus yang sudah dibangun dibandingkan kembali dengan hasil agent.
 * Mengembalikan daftar selisih; kosong berarti setia.
 *
 * 1. Teks tiap soal (nama, jam, pesan, pilihan, kunci, penjelasan, kartu,
 *    kartu penentu) sama huruf demi huruf dengan omongan agent.
 * 2. Tiap fakta kasus yang juga ada di paket sama kalimat, nilai, satuan,
 *    asal turunan, dan tanggal terbitnya dengan yang dibaca agent, dan
 *    berstatus TERVERIFIKASI.
 * 3. Tiap kartu adalah fakta paket.
 */
export function periksaSetia(
  kasus: Kasus,
  paket: PaketFakta,
  omongan: readonly EntriOmongan[],
): string[] {
  const selisih: string[] = [];
  if (kasus.soal.length !== omongan.length) {
    selisih.push(`kasus punya ${String(kasus.soal.length)} soal, agent menulis ${String(omongan.length)} omongan`);
  }
  for (const s of kasus.soal) {
    const e = omongan.find((x) => x.omongan.nama === s.pesan.nama);
    if (e === undefined) {
      selisih.push(`soal "${s.soal_id}" berpengirim ${s.pesan.nama}, yang tidak ditulis agent`);
      continue;
    }
    const o = e.omongan;
    const sama = (apa: string, a: unknown, b: unknown): void => {
      if (JSON.stringify(a) !== JSON.stringify(b)) selisih.push(`soal "${s.soal_id}": ${apa} tidak sama dengan omongan agent ${e.id}`);
    };
    sama('jam', s.pesan.jam, o.jam);
    sama('pesan', s.pesan.isi, o.pesan);
    sama('pilihan', s.pilihan, HURUF_OPSI.map((h) => ({ kunci: h, teks: o.pilihan[h] })));
    sama('kunci', s.jawaban, o.kunci);
    sama('penjelasan', s.penjelasan, o.penjelasan);
    sama('kartu', s.kartu, o.kartu);
    sama('kartu penentu', s.kartu_penentu, o.kartu_penentu);
  }

  const diPaket = new Map(paket.fakta.map((f) => [f.fact_id, f]));
  for (const f of kasus.fakta) {
    const p = diPaket.get(f.fact_id);
    if (p === undefined) continue;
    const beda: string[] = [];
    if (f.nilai !== p.nilai) beda.push('nilai');
    if (f.satuan !== p.satuan) beda.push('satuan');
    if (f.tersedia_sejak !== p.terbit) beda.push('tanggal terbit');
    if (JSON.stringify(f.turunan_dari) !== JSON.stringify(p.turunan_dari)) beda.push('asal turunan');
    if (f.status !== 'TERVERIFIKASI') beda.push(`status ${f.status}`);
    if (beda.length > 0) selisih.push(`fakta "${f.fact_id}" berbeda dari paket agent: ${beda.join(', ')}`);
  }
  for (const s of kasus.soal) {
    for (const id of s.kartu) {
      const p = diPaket.get(id);
      const f = kasus.fakta.find((x) => x.fact_id === id);
      if (p === undefined) selisih.push(`kartu "${id}" di soal "${s.soal_id}" bukan fakta paket agent`);
      else if (f !== undefined && f.klaim !== p.klaim) {
        selisih.push(`kalimat kartu "${id}" ("${f.klaim}") tidak sama dengan yang dibaca agent ("${p.klaim}")`);
      }
    }
  }
  return selisih;
}
