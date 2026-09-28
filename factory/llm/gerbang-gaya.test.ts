/**
 * M2d-4 T-01: gerbang gaya (pemeriksa, kode) — G-panjang, G-satu-klausa, G-register.
 *
 * Kasus uji wajib dari kontrak: batas panjang = maksimum soal manusia di
 * `cases/*.json` (11 kata pilihan, 26 kata pesan) dan mengikuti maksimum baru
 * bila kasus berubah; SEMUA soal manusia lolos G-panjang dan G-satu-klausa;
 * pilihan agen M2d-3 "…, jadi naiknya nyata" ditolak; "gue"/"lo" ditolak.
 */
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import type { KunciOpsi, OmonganDraf } from './draf.ts';
import { AKAR } from './env.ts';
import {
  batasPanjang,
  batasPanjangDari,
  gPanjang,
  gRegister,
  gSatuKlausa,
  gerbangGaya,
  hitungKata,
  masalahKlausa,
  type SoalKasusGaya,
} from './gerbang-gaya.ts';
import { gKaku } from './gerbang-g.ts';

interface SoalKasus extends SoalKasusGaya {
  pesan: { nama: string; jam: string; isi: string };
  pilihan: Array<{ kunci: KunciOpsi; teks: string }>;
  jawaban: KunciOpsi;
}

const BERKAS = ['dada-2025-10-08.json', 'ultj-2026-05-04.json'];
const KASUS = BERKAS.map((b) => ({ berkas: `cases/${b}`, soal: (JSON.parse(readFileSync(`${AKAR}cases/${b}`, 'utf8')) as { soal: SoalKasus[] }).soal }));

function draf(s: SoalKasus): OmonganDraf {
  return {
    nama: s.pesan.nama, jam: s.pesan.jam, pesan: s.pesan.isi, angka_pesan: [], kartu: [], kartu_penentu: [],
    pilihan: Object.fromEntries(s.pilihan.map((p) => [p.kunci, p.teks])) as Record<KunciOpsi, string>,
    kunci: s.jawaban, penjelasan: '',
  };
}
const MANUSIA = KASUS.flatMap((k) => k.soal.map(draf));

/** Omongan yang dikunci lingkar M2d-3 (keluaran sungguhan, terlacak). */
function dikunciM2d3(): Array<{ paket: string; no: number; o: OmonganDraf }> {
  const hasil: Array<{ paket: string; no: number; o: OmonganDraf }> = [];
  for (const paket of ['tirt', 'dada', 'ultj']) {
    const r = JSON.parse(readFileSync(`${AKAR}eval/keluaran-m2d3/${paket}/riwayat.json`, 'utf8')) as {
      riwayat: Array<{ omongan: Array<{ no: number; status: string }>; draf: Array<OmonganDraf | null> }>;
    };
    for (const p of r.riwayat) {
      for (const x of p.omongan) {
        const o = p.draf[x.no - 1];
        if (x.status === 'lolos' && o !== null && o !== undefined) hasil.push({ paket, no: x.no, o });
      }
    }
  }
  return hasil;
}

describe('G-panjang — batas dari soal manusia (D-1)', () => {
  it('batas = maksimum soal manusia di cases/*.json: pilihan 11 kata, pesan 26 kata', () => {
    expect(batasPanjang()).toMatchObject({ pilihan: 11, pesan: 26, sumber: BERKAS.map((b) => `cases/${b}`) });
    expect(batasPanjangDari(KASUS)).toMatchObject({ pilihan: 11, pesan: 26 });
  });

  it('kata dihitung dari teks tampil: rujukan diganti teksnya; tanda baca yang berdiri sendiri bukan kata', () => {
    expect(hitungKata('Betul, pengumuman itu yang bikin harganya naik [[kelipatan-2025-08-01-2025-10-08|22 kali]].')).toBe(9);
    expect(hitungKata('Keliru, [[x|Rp14.000]] untuk [[y|10 lot]] — bukan Rp140.')).toBe(7);
    expect(hitungKata('  a  b\nc ')).toBe(3);
    // Menghitung id rujukan (bukan teks tampil) memberi angka lain — itu yang dijaga.
    expect(hitungKata('[[kelipatan-2025-08-01-2025-10-08|22 kali]]')).toBe(2);
  });

  it('bila kasus manusia berubah, batas mengikuti maksimum baru', () => {
    const panjang: SoalKasusGaya = {
      pesan: { isi: Array.from({ length: 30 }, () => 'kata').join(' ') },
      pilihan: [{ teks: `Betul, ${Array.from({ length: 13 }, () => 'kata').join(' ')}.` }],
    };
    const b = batasPanjangDari([...KASUS, { berkas: 'cases/baru.json', soal: [panjang] }]);
    expect(b).toMatchObject({ pilihan: 14, pesan: 30 });
    expect(() => batasPanjangDari([])).toThrow();
  });

  it('SEMUA soal manusia lolos G-panjang; satu kata lebih ditolak', () => {
    expect(MANUSIA).toHaveLength(6);
    for (const o of MANUSIA) expect(gPanjang(o), o.pesan).toMatchObject({ tolak: false, alasan: [] });
    const terpanjang = MANUSIA.find((o) => hitungKata(o.pesan) === 26) as OmonganDraf;
    const lebih = gPanjang({ ...terpanjang, pesan: `${terpanjang.pesan} Serius.` });
    expect(lebih.tolak).toBe(true);
    expect(lebih.alasan[0]).toMatch(/^Pesan 27 kata; paling banyak 26/);
    const opsi = MANUSIA.find((o) => Object.values(o.pilihan).some((p) => hitungKata(p) === 11)) as OmonganDraf;
    const k = (Object.keys(opsi.pilihan) as KunciOpsi[]).find((x) => hitungKata(opsi.pilihan[x]) === 11) as KunciOpsi;
    const opsiLebih = gPanjang({ ...opsi, pilihan: { ...opsi.pilihan, [k]: `${opsi.pilihan[k].replace(/\.$/, '')} lagi.` } });
    expect(opsiLebih).toMatchObject({ tolak: true, kata_pilihan: { [k]: 12 } });
    expect(opsiLebih.alasan[0]).toContain(`Pilihan ${k} 12 kata; paling banyak 11 kata`);
  });
});

describe('G-satu-klausa (D-2)', () => {
  it('SEMUA pilihan manusia lolos, termasuk ", bukan …", ", tetapi …", dan "karena" tanpa koma', () => {
    for (const o of MANUSIA) expect(gSatuKlausa(o), JSON.stringify(o.pilihan)).toMatchObject({ tolak: false, masalah: [] });
    expect(masalahKlausa('Keliru, dividennya Rp130, bukan Rp45.')).toBeNull();
    expect(masalahKlausa('Keliru, tiap tahun memang ada, tetapi jumlahnya pernah turun jauh.')).toBeNull();
    expect(masalahKlausa('Betul, malah ia tidak kebagian karena tanggal ex-nya.')).toBeNull();
  });

  it('contoh agen M2d-3 "…, jadi naiknya nyata" DITOLAK; koma di angka "2,21" bukan koma klausa', () => {
    expect(masalahKlausa('Betul, 2,21 kali itu dari penutupan dibanding penutupan, jadi naiknya nyata.')).toBe('menempelkan ekor ", jadi …" sesudah jawabannya');
    expect(masalahKlausa('Betul, [[kelipatan-x|2,21 kali]] itu dari penutupan dibanding penutupan.')).toBeNull();
  });

  it('penghubung ekor, tanda pisah, koma kedua yang memulai klausa baru, dan koma ketiga ditolak', () => {
    for (const [teks, alasan] of [
      ['Betul, harganya naik terus, karena ada yang borong.', 'menempelkan ekor ", karena …" sesudah jawabannya'],
      ['Keliru, setopnya soal laporan, sehingga bukan harga.', 'menempelkan ekor ", sehingga …" sesudah jawabannya'],
      ['Keliru, setopnya soal laporan, makanya lama.', 'menempelkan ekor ", makanya …" sesudah jawabannya'],
      ['Keliru, setopnya soal laporan, soalnya telat.', 'menempelkan ekor ", soalnya …" sesudah jawabannya'],
      ['Betul, setopnya soal harga — sama kayak dulu.', 'memakai tanda pisah untuk menempelkan klausa kedua'],
      ['Betul, setopnya soal harga; sama kayak dulu.', 'memakai titik koma untuk menempelkan klausa kedua'],
      ['Betul, tiap hari penutupannya lebih tinggi, nggak putus.', 'koma kedua memulai klausa baru (", nggak …")'],
      ['Keliru, dividennya Rp130, bukan Rp45, tapi naik.', 'memuat lebih dari dua koma: tiga klausa'],
    ] as const) {
      expect(masalahKlausa(teks), teks).toBe(alasan);
    }
  });

  it('pilihan agen M2d-3 yang dikunci: TIRT ditolak (ekor ", jadi …", ", sama …", ", nggak …")', () => {
    const tirt = dikunciM2d3().filter((x) => x.paket === 'tirt');
    expect(tirt).toHaveLength(3);
    for (const { o } of tirt) expect(gSatuKlausa(o).tolak).toBe(true);
    const semua = tirt.flatMap(({ o }) => gSatuKlausa(o).masalah.map((m) => m.alasan));
    expect(semua).toContain('menempelkan ekor ", jadi …" sesudah jawabannya');
    expect(semua).toContain('koma kedua memulai klausa baru (", sama …")');
  });
});

describe('G-register (D-3)', () => {
  it('"gue", "gua", "lo", "elo" (utuh, juga "guenya") ditolak; "gw", "aku", "lu", "kamu", "lho", "loh" tidak', () => {
    for (const t of ['Gue udah cek.', 'Kata gua sih gitu.', 'Lo udah liat?', 'elo tau ga', 'Punya guenya udah dijual.', 'Punya gue-nya juga.']) {
      expect(gRegister(t).tolak, t).toBe(true);
    }
    for (const t of ['Gw udah cek.', 'Aku ragu nih.', 'Lu udah liat?', 'Kamu tau ga', 'Naik terus lho.', 'Loh kok gitu', 'Logonya ganti.', 'Guest house.']) {
      expect(gRegister(t).tolak, t).toBe(false);
    }
    expect(gRegister('Gue sama lo beda.').kata).toEqual(['gue', 'lo']);
  });

  it('omongan manusia di kasus yang hidup memakai "Gue" → ditolak (keputusan pemilik 29 Sep); versi "Gw" lolos dan tetap lolos G-kaku', () => {
    const pakaiGue = MANUSIA.filter((o) => /\bgue\b/i.test(o.pesan));
    expect(pakaiGue).toHaveLength(3);
    for (const o of pakaiGue) {
      expect(gRegister(o.pesan).tolak).toBe(true);
      const gw = o.pesan.replace(/\bGue\b/g, 'Gw').replace(/\bgue\b/g, 'gw');
      expect(gRegister(gw).tolak).toBe(false);
      expect(gKaku(gw).tolak).toBe(false);
    }
  });
});

describe('gerbang gaya gabungan', () => {
  it('tiga gerbang, umpan balik bertanda sumbernya; soal manusia (dengan "gw") lolos ketiganya', () => {
    for (const o of MANUSIA) {
      const g = gerbangGaya({ ...o, pesan: o.pesan.replace(/\bGue\b/g, 'Gw') });
      expect(g.tolak, o.pesan).toBe(false);
    }
    const m2d3 = dikunciM2d3();
    expect(m2d3).toHaveLength(8);
    // Kedelapan omongan yang dikunci M2d-3 ditolak gerbang gaya (semuanya memakai "gue").
    expect(m2d3.every(({ o }) => gerbangGaya(o).tolak)).toBe(true);
    const g = gerbangGaya(m2d3.find((x) => x.paket === 'tirt' && x.no === 3)?.o as OmonganDraf);
    expect(g.umpan.some((u) => u.startsWith('[pemeriksa: G-panjang] Pilihan a 14 kata'))).toBe(true);
    expect(g.umpan.some((u) => u.startsWith('[pemeriksa: G-satu-klausa] Pilihan'))).toBe(true);
    expect(g.umpan.some((u) => u.startsWith('[pemeriksa: G-register] Pesan memakai "gue"'))).toBe(true);
  });
});
