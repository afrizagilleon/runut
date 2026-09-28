/**
 * M2d-3 T-02: gerbang G (pemeriksa, kode) — G-angka-cukup dan G-kaku.
 *
 * Kasus uji wajib dari kontrak: omongan TIRT M2d-2 "48 ke 106" (lolos gerbang
 * tebak di dalam lingkar, gagal di penguji luar) DITOLAK; omongan manusia
 * DADA/ULTJ yang hidup TIDAK ditolak; kalimat resmi ditolak G-kaku.
 */
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import type { KunciOpsi, OmonganDraf } from './draf.ts';
import { AKAR } from './env.ts';
import { aturanKaku, gAngkaCukup, gKaku, gerbangG, kalimatDalam } from './gerbang-g.ts';

interface SoalKasus {
  soal_id: string;
  pesan: { nama: string; jam: string; isi: string };
  pilihan: Array<{ kunci: KunciOpsi; teks: string }>;
  jawaban: KunciOpsi;
}

/** Omongan manusia dari kasus yang hidup, dalam bentuk draf (hanya medan yang dipakai gerbang G). */
function omonganKasus(berkas: string): OmonganDraf[] {
  const k = JSON.parse(readFileSync(`${AKAR}cases/${berkas}`, 'utf8')) as { soal: SoalKasus[] };
  return k.soal.map((s) => ({
    nama: s.pesan.nama,
    jam: s.pesan.jam,
    pesan: s.pesan.isi,
    angka_pesan: [],
    kartu: [],
    kartu_penentu: [],
    pilihan: Object.fromEntries(s.pilihan.map((p) => [p.kunci, p.teks])) as Record<KunciOpsi, string>,
    kunci: s.jawaban,
    penjelasan: '',
  }));
}

const MANUSIA = [...omonganKasus('dada-2025-10-08.json'), ...omonganKasus('ultj-2026-05-04.json')];

interface Riwayat {
  riwayat: Array<{ omongan: Array<{ no: number; status: string }>; draf: Array<OmonganDraf | null> }>;
}
function dikunciM2d2(paket: string): Array<{ no: number; o: OmonganDraf }> {
  const r = JSON.parse(readFileSync(`${AKAR}eval/keluaran-m2d2/${paket}/riwayat.json`, 'utf8')) as Riwayat;
  const hasil: Array<{ no: number; o: OmonganDraf }> = [];
  for (const p of r.riwayat) {
    for (const x of p.omongan) {
      const o = p.draf[x.no - 1];
      if (x.status === 'lolos' && o !== null && o !== undefined) hasil.push({ no: x.no, o });
    }
  }
  return hasil;
}

describe('G-angka-cukup — kasus uji wajib', () => {
  it('TIRT M2d-2 omongan 1 ("naik 2,21 persen dari 48 ke 106", kunci "106 itu 2,21 kali 48") DITOLAK: 106 ÷ 48 = 2,21', () => {
    const tirt1 = dikunciM2d2('tirt').find((x) => x.no === 1)?.o;
    expect(tirt1?.pesan).toContain('dari 48 ke 106');
    const g = gAngkaCukup(tirt1 as OmonganDraf);
    expect(g.tolak).toBe(true);
    expect(g.bukti).toContainEqual(expect.objectContaining({ angka: '2,21', satuan: 'kali', rumus: '106 ÷ 48 = 2,21' }));
    expect(g.alasan).toContain('bisa dihitung');
  });

  it('enam omongan manusia DADA/ULTJ yang hidup TIDAK ditolak', () => {
    expect(MANUSIA).toHaveLength(6);
    for (const o of MANUSIA) expect(gAngkaCukup(o), o.pesan).toMatchObject({ tolak: false, bukti: [] });
  });

  it('dua omongan M2d-2 lain yang dikunci (TIRT 2, DADA 1) juga tidak ditolak — kebocoran hanya di TIRT 1', () => {
    const lain = [...dikunciM2d2('tirt').filter((x) => x.no !== 1), ...dikunciM2d2('dada')];
    expect(lain.map((x) => x.o.nama)).toEqual(['Gilang', 'Sinta']);
    for (const x of lain) expect(gAngkaCukup(x.o).tolak, x.o.pesan).toBe(false);
  });
});

describe('G-angka-cukup — hubungan dan toleransi yang dinyatakan', () => {
  const buat = (pesan: string, pilihan: Record<KunciOpsi, string>, kunci: KunciOpsi): OmonganDraf => ({
    nama: 'Uji', jam: '19.00', pesan, angka_pesan: [], kartu: [], kartu_penentu: [], pilihan, kunci, penjelasan: '',
  });
  const PENGECOH = { c: 'Betul, harganya memang naik terus.', d: 'Keliru, harganya justru turun.' };

  it('selisih rupiah: "dari 1.690 ke 1.545" + kunci "turunnya Rp145" → ditolak; kunci tanpa angka → lolos', () => {
    const tolak = buat('Tadi pagi dari 1.690 ke 1.545 lho.', { a: 'Betul, turunnya Rp145.', b: 'Keliru, turunnya tipis.', ...PENGECOH }, 'a');
    expect(gAngkaCukup(tolak).bukti[0]).toMatchObject({ satuan: 'rupiah', rumus: '1.690 − 1.545 = 145' });
    const lolos = buat('Tadi pagi dari 1.690 ke 1.545 lho.', { a: 'Betul, turunnya lebih dari dividennya.', b: 'Keliru, turunnya tipis.', ...PENGECOH }, 'a');
    expect(gAngkaCukup(lolos).tolak).toBe(false);
  });

  it('persen: "dari Rp40 ke Rp50" + kunci "naik 25 persen" → ditolak ((50 − 40) ÷ 40 × 100)', () => {
    const o = buat('Dari Rp40 jadi Rp50 doang.', { a: 'Keliru, itu naik 25 persen.', b: 'Betul, naiknya kecil.', ...PENGECOH }, 'a');
    expect(gAngkaCukup(o).bukti[0]?.rumus).toBe('(50 − 40) ÷ 40 × 100 = 25');
  });

  it('toleransi: max(setengah satuan terakhir, 1 %) — "2,2 kali" untuk 106 ÷ 48 cocok; "2,5 kali" tidak', () => {
    const p = { b: 'Betul, naiknya pelan.', ...PENGECOH };
    expect(gAngkaCukup(buat('Dari 48 ke 106.', { a: 'Keliru, itu 2,2 kali.', ...p }, 'a')).tolak).toBe(true);
    expect(gAngkaCukup(buat('Dari 48 ke 106.', { a: 'Keliru, itu 2,5 kali.', ...p }, 'a')).tolak).toBe(false);
  });

  it('angka di PENGECOH yang bisa dihitung tidak menolak (hanya pilihan kunci); bilangan cacah tanpa satuan tidak dicoba', () => {
    const o = buat('Dari 48 ke 106.', { a: 'Keliru, itu 2,21 kali.', b: 'Betul, naiknya pelan.', ...PENGECOH }, 'b');
    expect(gAngkaCukup(o).tolak).toBe(false);
    const cacah = buat('Katanya 7 tahun, 6 di antaranya naik.', { a: 'Keliru, cuma 1 yang turun.', b: 'Betul, naik semua.', ...PENGECOH }, 'a');
    expect(gAngkaCukup(cacah).tolak).toBe(false);
  });

  it('nilai kembar dan tanggal tidak dihitung: "1.461.200" di pesan dan pilihan tidak membuat "0 lembar" terhitung', () => {
    const o = buat('Volume hari ini katanya 1.461.200 lembar, 10 Desember 2025.', {
      a: 'Betul, volume 1.461.200 lembar itu hari ini.', b: 'Keliru, volume hari ini 0 lembar.', ...PENGECOH,
    }, 'b');
    expect(gAngkaCukup(o).tolak).toBe(false);
  });
});

describe('G-kaku', () => {
  it('enam omongan manusia DADA/ULTJ lolos', () => {
    for (const o of MANUSIA) expect(gKaku(o.pesan), o.pesan).toMatchObject({ tolak: false, penanda: [], alasan: [] });
  });

  it('kalimat resmi ditolak dan penandanya disebut', () => {
    const g = gKaku('Berdasarkan pengumuman tersebut, perseroan membagikan dividen sebesar Rp130 per lembar sehingga harga turun.');
    expect(g.tolak).toBe(true);
    expect(g.penanda).toEqual(['tersebut', 'sehingga', 'berdasarkan', 'sebesar', 'perseroan']);
    expect(gKaku('Oleh karena itu harganya turun, yang mana wajar.').penanda).toEqual(['yang mana', 'oleh karena itu']);
  });

  it('penanda dicocokkan utuh: "sesebesar"/"tersebutkan" bukan penanda; "sebesar-besarnya" tetap', () => {
    expect(gKaku('Gue nggak nyebutin tersebutkan apa-apa.').penanda).toEqual([]);
    expect(gKaku('Untung sebesar-besarnya dong.').penanda).toEqual(['sebesar']);
  });

  it('lebih dari 220 karakter ditolak; lebih dari dua kalimat panjang (≥ 12 kata) ditolak', () => {
    expect(gKaku('a'.repeat(221)).alasan.join()).toContain('221 karakter');
    const panjang = 'Gue baca laporan itu tadi sore dan ternyata pemilik terbesarnya beli lagi dong.';
    expect(panjang.split(/\s+/).length).toBeGreaterThanOrEqual(12);
    expect(gKaku(`${panjang} ${panjang}`).tolak).toBe(false);
    const tiga = 'Gue liat dia beli lagi dua kali di hari yang sama tuh. Terus orang dalam lain juga ikut beli di hari yang sama lho. Jadi kayaknya mereka semua yakin kalau harga saham ini bakal naik lagi dong.';
    expect(tiga.length).toBeLessThanOrEqual(220);
    expect(gKaku(tiga)).toMatchObject({ tolak: true, kalimat_panjang: 3 });
  });

  it('titik ribuan dan desimal tidak memotong kalimat', () => {
    expect(kalimatDalam('Volumenya 1.461.200 lembar. Naik 2,21 kali!')).toEqual(['Volumenya 1.461.200 lembar.', 'Naik 2,21 kali!']);
  });

  it('daftar penanda terlacak memuat tujuh penanda yang disebut kontrak', () => {
    expect(aturanKaku().penanda).toEqual(expect.arrayContaining(['tersebut', 'adapun', 'sehingga', 'berdasarkan', 'merupakan', 'yang mana', 'oleh karena itu']));
    expect(aturanKaku()).toMatchObject({ batas_karakter: 220, kata_kalimat_panjang: 12, maks_kalimat_panjang: 2 });
  });
});

describe('gerbang G gabungan', () => {
  it('umpan balik bertanda pemeriksa, satu butir per keberatan', () => {
    const tirt1 = dikunciM2d2('tirt').find((x) => x.no === 1)?.o as OmonganDraf;
    const kaku = { ...tirt1, pesan: `Berdasarkan data tersebut, ${tirt1.pesan}` };
    const g = gerbangG(kaku);
    expect(g.tolak).toBe(true);
    expect(g.umpan).toHaveLength(2);
    expect(g.umpan[0]).toMatch(/^\[pemeriksa: G-angka-cukup\] Pilihan kunci b bisa dihitung/);
    expect(g.umpan[1]).toMatch(/^\[pemeriksa: G-kaku\] Pesan memuat penanda bahasa resmi "tersebut", "berdasarkan"/);
  });
});
