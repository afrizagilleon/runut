/**
 * Umpan balik BERALTERNATIF + perbaikan TERARAH + berhenti (M2d-7 D-5).
 *
 * Riset (`.research/sota-mcq-finlit-id-2026.md` §4):
 * - umpan balik yang menyebut **lokasi gagal + nilai teramati + alternatif
 *   yang diizinkan** menaikkan keberhasilan perbaikan 14/50 → 36/50 (Ray &
 *   Goyal 2026); yang paling menentukan adalah alternatifnya;
 * - perbaikan tanpa aturan berhenti merusak draf yang sudah benar (Wu dkk.
 *   2026): perbaiki hanya bagian yang gagal, lalu berhenti.
 *
 * Maka setiap penolakan menjadi `UmpanTerarah` { lokasi (pesan / pilihan x /
 * penjelasan), sumber, nilai teramati, masalah, alternatif yang diizinkan }.
 * Alternatif untuk pengecoh = kandidat bank D-2 yang BELUM dipakai. Bagian
 * yang tidak disebut umpan balik DIKUNCI (tidak ditulis ulang). Satu bagian
 * paling banyak `MAKS_PERBAIKAN` kali diperbaiki; sesudah itu posisi itu
 * mendapat sudut baru (perencana).
 *
 * Ketergantungan: pilihan ditulis dari pesan, penjelasan dari soal jadi. Bila
 * pesan ditulis ulang, keempat pilihan dan penjelasan ikut ditulis baru; bila
 * satu pilihan ditulis ulang, penjelasan ikut ditulis baru. Yang DIHITUNG
 * sebagai perbaikan hanya bagian yang disebut umpan balik.
 */
import { teksPolos } from '../skema/rujukan.ts';
import type { KandidatPengecoh, KunciSudut } from './bank-pengecoh.ts';
import type { KunciOpsi, MasalahDraf, OmonganDraf } from './draf.ts';
import type { PutusanG } from './gerbang-g.ts';
import type { PutusanGaya } from './gerbang-gaya.ts';
import type { PutusanKartu } from './gerbang-kartu.ts';
import type { PutusanKembar } from './gerbang-kembar.ts';
import type { PutusanTebak } from './gerbang-tebak.ts';
import type { PutusanKritik } from './kritikus.ts';
import type { BagianPesan, ButirIkatan, Label, LokasiBagian, SetPilihan } from './penulis-pecah.ts';
import type { PaketFakta } from './paket.ts';

export type Bagian = 'pesan' | 'pilihan' | 'penjelasan';
export const MAKS_PERBAIKAN = 2;
const HURUF: readonly KunciOpsi[] = ['a', 'b', 'c', 'd'];

export interface UmpanTerarah {
  lokasi: LokasiBagian;
  /** Peran/gerbang yang menolak ("pemeriksa: G-kaku", "kritikus", "penebak", …). */
  sumber: string;
  /** Nilai yang teramati di lokasi itu (kutipan). */
  teramati: string;
  /** Kenapa ditolak. */
  alasan: string;
  /** Alternatif yang diizinkan; tidak pernah kosong sesudah `lengkapi`. */
  alternatif: string[];
}

export type UmpanMentah = Omit<UmpanTerarah, 'alternatif'>;

export function bagianDari(l: LokasiBagian): Bagian {
  return l === 'pesan' ? 'pesan' : l === 'penjelasan' ? 'penjelasan' : 'pilihan';
}

/** Isi satu lokasi di omongan (untuk "teramati"). */
export function isiLokasi(o: Pick<OmonganDraf, 'pesan' | 'pilihan' | 'penjelasan'>, l: LokasiBagian): string {
  if (l === 'pesan') return o.pesan;
  if (l === 'penjelasan') return teksPolos(o.penjelasan);
  return teksPolos(o.pilihan[l.slice(-1) as KunciOpsi] ?? '');
}

/* ---------------------------------------------------------------------- */
/* pemetaan penolakan → lokasi                                             */
/* ---------------------------------------------------------------------- */

const pl = (h: KunciOpsi): LokasiBagian => `pilihan-${h}`;
const semuaPilihan = (): LokasiBagian[] => HURUF.map(pl);
const pengecoh = (kunci: KunciOpsi): LokasiBagian[] => HURUF.filter((h) => h !== kunci).map(pl);

/** Lokasi satu masalah validator, dari kode dan kalimatnya. */
export function lokasiValidator(m: MasalahDraf, kunci: KunciOpsi): LokasiBagian[] {
  const huruf = /^Pilihan ([a-d])\b/.exec(m.pesan)?.[1] as KunciOpsi | undefined;
  if (huruf !== undefined) return [pl(huruf)];
  if (/^Pilihan kunci/.test(m.pesan)) return [pl(kunci)];
  if (/^Penjelasan/.test(m.pesan) || m.kode.startsWith('PENJELASAN_') || m.kode === 'ANDAIAN_DI_PENJELASAN') return ['penjelasan'];
  if (
    /^(Pesan|Nama|Jam|angka_pesan)\b/.test(m.pesan) ||
    /^(PESAN_|ANGKA_PESAN_|NAMA_)/.test(m.kode) ||
    m.kode === 'ANDAIAN_DI_OMONGAN_BETUL' ||
    (m.kode === 'KUNCI_TAK_TERBUKTI_KARTU' && m.pesan.startsWith('Jawabannya Betul'))
  ) {
    return ['pesan'];
  }
  return semuaPilihan();
}

export function dariValidator(masalah: readonly MasalahDraf[], o: OmonganDraf): UmpanMentah[] {
  return masalah.flatMap((m) =>
    lokasiValidator(m, o.kunci).map((l) => ({ lokasi: l, sumber: `pemeriksa: ${m.kode}`, teramati: isiLokasi(o, l), alasan: m.pesan })),
  );
}

export function dariG(g: PutusanG, o: OmonganDraf): UmpanMentah[] {
  const hasil: UmpanMentah[] = [];
  if (g.angka_cukup.tolak) hasil.push({ lokasi: pl(o.kunci), sumber: 'pemeriksa: G-angka-cukup', teramati: isiLokasi(o, pl(o.kunci)), alasan: g.angka_cukup.alasan });
  for (const a of g.kaku.alasan) hasil.push({ lokasi: 'pesan', sumber: 'pemeriksa: G-kaku', teramati: o.pesan, alasan: a });
  return hasil;
}

export function dariGaya(gaya: PutusanGaya, o: OmonganDraf): UmpanMentah[] {
  const hasil: UmpanMentah[] = [];
  const b = gaya.panjang.batas;
  if (gaya.panjang.kata_pesan > b.pesan) hasil.push({ lokasi: 'pesan', sumber: 'pemeriksa: G-panjang', teramati: o.pesan, alasan: `pesan ${String(gaya.panjang.kata_pesan)} kata; paling banyak ${String(b.pesan)}` });
  for (const h of HURUF) {
    const n = gaya.panjang.kata_pilihan[h];
    if (n > b.pilihan) hasil.push({ lokasi: pl(h), sumber: 'pemeriksa: G-panjang', teramati: isiLokasi(o, pl(h)), alasan: `${String(n)} kata; paling banyak ${String(b.pilihan)}` });
  }
  for (const m of gaya.klausa.masalah) hasil.push({ lokasi: pl(m.pilihan), sumber: 'pemeriksa: G-satu-klausa', teramati: isiLokasi(o, pl(m.pilihan)), alasan: m.alasan });
  if (gaya.register.tolak) hasil.push({ lokasi: 'pesan', sumber: 'pemeriksa: G-register', teramati: o.pesan, alasan: `memakai ${gaya.register.kata.map((k) => `"${k}"`).join(', ')}` });
  return hasil;
}

/** Butir `periksaRujukanHuruf` ("… Penjelasan merujuk huruf …" / "… Pilihan b merujuk …"). */
export function dariHuruf(butir: readonly string[], o: OmonganDraf): UmpanMentah[] {
  return butir.map((b) => {
    const h = /Pilihan ([a-d]) merujuk/.exec(b)?.[1] as KunciOpsi | undefined;
    const l: LokasiBagian = h === undefined ? 'penjelasan' : pl(h);
    return { lokasi: l, sumber: 'pemeriksa: HURUF_PILIHAN', teramati: isiLokasi(o, l), alasan: b.replace(/^\[pemeriksa: HURUF_PILIHAN\]\s*/, '') };
  });
}

export function dariKembar(k: PutusanKembar, o: OmonganDraf): UmpanMentah[] {
  return k.kembar.map((x) => {
    // Pilihan kunci tidak diganti karena kembar; bila keduanya pengecoh, yang kedua diganti.
    const h = x.b === o.kunci ? x.a : x.b;
    return {
      lokasi: pl(h), sumber: 'pemeriksa: G-pilihan-kembar', teramati: `${x.a}) ${isiLokasi(o, pl(x.a))} / ${x.b}) ${isiLokasi(o, pl(x.b))}`,
      alasan: `pilihan ${x.a} dan ${x.b} isinya sama (kemiripan ${x.kemiripan.toFixed(2).replace('.', ',')})`,
    };
  });
}

export function dariIkatan(butir: readonly ButirIkatan[]): UmpanMentah[] {
  return butir.map((b) => ({ lokasi: b.lokasi, sumber: 'pemeriksa: G-ikatan-bank', teramati: b.teramati, alasan: b.alasan }));
}

export function dariKartu(k: PutusanKartu, o: OmonganDraf): UmpanMentah[] {
  const hasil: UmpanMentah[] = [];
  for (const b of (k.membingungkan ?? []).filter((x) => x.sumber === 'penulis')) {
    const h = /^pilihan ([a-d])$/.exec(b.bagian ?? '')?.[1] as KunciOpsi | undefined;
    const l: LokasiBagian = h !== undefined ? pl(h) : 'pesan';
    hasil.push({ lokasi: l, sumber: 'pembaca kartu', teramati: b.kutipan, alasan: 'kalimat ini membingungkan pembaca yang memegang kartu (bisa dibaca dua arti)' });
  }
  if (k.pilihan !== k.kunci) {
    const ls = k.pilihan === null ? semuaPilihan() : [pl(k.pilihan), pl(o.kunci)];
    for (const l of ls) {
      hasil.push({
        lokasi: l, sumber: 'pembaca kartu', teramati: isiLokasi(o, l),
        alasan: k.pilihan === null
          ? 'pembaca yang memegang kartu tidak memberi jawaban terbaca'
          : `pembaca yang MEMEGANG kartu memilih "${k.pilihan}", bukan kunci "${o.kunci}" (alasannya: "${k.alasan_penjawab.slice(0, 200)}") — ` +
            (l === pl(o.kunci) ? 'kunci belum terbukti tanpa tafsir dari kartu' : 'pengecoh ini tampak ikut benar menurut kartu'),
      });
    }
  }
  return hasil;
}

/** Lokasi satu keberatan kritikus dari medan `bagian`/jenisnya. */
export function lokasiKritik(jenis: string, bagian: string, kunci: KunciOpsi, jugaBenar: readonly string[]): LokasiBagian[] {
  const b = bagian.toLowerCase();
  const huruf = [...b.matchAll(/pilihan\s*\(?([a-d])\)?/g)].map((m) => m[1] as KunciOpsi);
  if (huruf.length > 0) return [...new Set(huruf)].map(pl);
  if (/penjelasan/.test(b)) return ['penjelasan'];
  if (/pesan|klaim|omongan teman/.test(b) || jenis === 'makna') return ['pesan'];
  if (jenis === 'kunci') {
    const j = jugaBenar.filter((x): x is KunciOpsi => (HURUF as readonly string[]).includes(x));
    return j.length > 0 ? j.map(pl) : [pl(kunci)];
  }
  if (jenis === 'tertebak') return pengecoh(kunci);
  return semuaPilihan();
}

export function dariKritik(k: PutusanKritik, o: OmonganDraf): UmpanMentah[] {
  const juga = k.cek_makna?.juga_benar ?? [];
  const hasil = k.keberatan.flatMap((x) =>
    lokasiKritik(x.jenis, x.bagian, o.kunci, juga).map((l) => ({ lokasi: l, sumber: `kritikus: ${x.jenis}`, teramati: isiLokasi(o, l), alasan: x.alasan })),
  );
  if (hasil.length > 0 && k.arahan !== '') {
    const l = hasil[0]?.lokasi ?? pl(o.kunci);
    hasil.push({ lokasi: l, sumber: 'kritikus: arahan', teramati: isiLokasi(o, l), alasan: k.arahan });
  }
  return hasil;
}

/** Tertebak tanpa kartu: ketiga pengecoh tidak cukup menggoda → ganti pengecoh (kunci dan pesan tetap). */
export function dariTebak(t: PutusanTebak, o: OmonganDraf): UmpanMentah[] {
  const alasan = t.tebakan.filter((x) => x.benar && x.alasan !== '').map((x) => `"${x.alasan}"`).join(' ');
  return pengecoh(o.kunci).map((l) => ({
    lokasi: l, sumber: 'penebak tanpa kartu', teramati: isiLokasi(o, l),
    alasan: `${String(t.benar)}/3 penebak TANPA kartu memilih kunci (${t.tebakan.map((x) => `${x.pilihan}/${String(x.yakin)}`).join(', ')}); pengecoh ini mudah disingkirkan. Alasan mereka: ${alasan || '(tidak ada)'}`,
  }));
}

/** Pilihan-saja memilih kunci: bentuk keempat pilihan membocorkannya → keempatnya ditulis ulang. */
export function dariPilihanSaja(alasan: readonly string[], o: OmonganDraf): UmpanMentah[] {
  return semuaPilihan().map((l) => ({ lokasi: l, sumber: 'gerbang pilihan-saja', teramati: isiLokasi(o, l), alasan: alasan.join(' ') }));
}

/* ---------------------------------------------------------------------- */
/* alternatif yang diizinkan                                               */
/* ---------------------------------------------------------------------- */

export interface KonteksAlternatif {
  paket: PaketFakta;
  label: Label;
  kunci: KunciSudut;
  bank: readonly KandidatPengecoh[];
  pesan: BagianPesan | null;
  pilihan: SetPilihan | null;
  hurufKunci: KunciOpsi;
  kartu: readonly string[];
}

function pakaiKandidat(k: KandidatPengecoh): string {
  return `${k.id} (${k.jenis}: ${k.rujukan ?? `"${k.teks}"`})`;
}

/** Alternatif yang diizinkan untuk satu lokasi; selalu ≥ 1 butir. */
export function alternatifUntuk(l: LokasiBagian, k: KonteksAlternatif): string[] {
  if (l === 'pesan') {
    if (k.label === 'Keliru') {
      const lain = k.bank.filter((b) => b.id !== k.pesan?.klaim_dari).slice(0, 4).map((b) => `salah kaprah ${pakaiKandidat(b)}`);
      return [...(k.pesan?.klaim_dari === null || k.pesan === null ? [] : [`tetap ${k.pesan.klaim_dari} dengan kalimat lain`]), ...lain];
    }
    return [`sebut isi fakta sudut dengan kata sendiri: ${k.kunci.rujukan === null ? `"${k.kunci.teks}"` : teksPolos(k.kunci.rujukan)} (${k.kunci.menjawab})`];
  }
  if (l === 'penjelasan') {
    const f = k.kartu.map((id) => {
      const fk = k.paket.fakta.find((x) => x.fact_id === id);
      return `rujukan [[${id}|…]] (${fk?.klaim.slice(0, 80) ?? ''})`;
    });
    return [...f.slice(0, 4), 'tutup dengan satu kalimat "Salah-kaprah yang umum: …"'];
  }
  const h = l.slice(-1) as KunciOpsi;
  if (h === k.hurufKunci) {
    return [`label "${k.label}," + nilai kunci ${k.kunci.rujukan ?? `"${k.kunci.teks}"`}, satu klausa, sependek pengecoh, tanpa mengulang kata pesan yang tidak ada di pengecoh`];
  }
  const dipakai = new Set(HURUF.filter((x) => x !== h).map((x) => k.pilihan?.[x].sumber ?? ''));
  const bebas = k.bank.filter((b) => !dipakai.has(b.id)).slice(0, 5).map(pakaiKandidat);
  return bebas.length > 0 ? bebas : [`kandidat lain di bank dengan kalimat berbeda (${k.bank.map((b) => b.id).join(', ')})`];
}

export function lengkapi(u: readonly UmpanMentah[], k: KonteksAlternatif): UmpanTerarah[] {
  return u.map((x) => ({ ...x, alternatif: alternatifUntuk(x.lokasi, k) }));
}

/** Satu butir umpan balik untuk penulis. */
export function tulisUmpan(u: UmpanTerarah): string {
  const lok = u.lokasi.startsWith('pilihan-') ? `pilihan ${u.lokasi.slice(-1)}` : u.lokasi;
  return `[${u.sumber}] lokasi: ${lok} · teramati: "${u.teramati.slice(0, 220)}" · masalah: ${u.alasan.slice(0, 400)} · alternatif yang diizinkan: ${u.alternatif.join('; ')}`;
}

/* ---------------------------------------------------------------------- */
/* rencana perbaikan                                                       */
/* ---------------------------------------------------------------------- */

export interface RencanaPerbaikan {
  /** Bagian yang disebut umpan balik (dihitung sebagai perbaikan). */
  gagal: Bagian[];
  tulisPesan: boolean;
  /** Huruf pilihan yang ditulis ulang (keempatnya bila pesan ditulis ulang). */
  tulisPilihan: KunciOpsi[];
  tulisPenjelasan: boolean;
}

export function rencanaPerbaikan(u: readonly Pick<UmpanTerarah, 'lokasi'>[]): RencanaPerbaikan {
  const gagal = [...new Set(u.map((x) => bagianDari(x.lokasi)))].sort() as Bagian[];
  const tulisPesan = gagal.includes('pesan');
  const huruf = tulisPesan ? [...HURUF] : HURUF.filter((h) => u.some((x) => x.lokasi === pl(h)));
  return { gagal, tulisPesan, tulisPilihan: huruf, tulisPenjelasan: tulisPesan || huruf.length > 0 || gagal.includes('penjelasan') };
}

export type HitungPerbaikan = Record<Bagian, number>;

/**
 * Tambah hitungan perbaikan untuk bagian yang gagal. `gantiSudut` = ada bagian
 * yang sudah diperbaiki `MAKS_PERBAIKAN` kali dan gagal lagi.
 */
export function catatPerbaikan(h: HitungPerbaikan, r: RencanaPerbaikan): { hitung: HitungPerbaikan; gantiSudut: boolean } {
  const hitung = { ...h };
  let gantiSudut = false;
  for (const b of r.gagal) {
    hitung[b] += 1;
    if (hitung[b] > MAKS_PERBAIKAN) gantiSudut = true;
  }
  return { hitung, gantiSudut };
}
