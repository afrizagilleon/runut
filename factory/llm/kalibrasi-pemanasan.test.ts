/**
 * M2d-8 T-03: soal pemanasan (mode dipandu) — gerbang, pemeriksa anti-bocor
 * DADA/ULTJ, bentuk `Soal`, dan (bila sudah dibuat) soal yang tersimpan.
 */
import { existsSync, readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { AKAR } from './env.ts';
import {
  FOLDER_PEMANASAN,
  HURUF_KUNCI_PEMANASAN,
  KARTU_PEMANASAN,
  MAKS_PERCOBAAN,
  gerbangKodePemanasan,
  jalankanPemanasan,
  kasusTayang,
  keSoal,
  periksaBocor,
  potongan,
  rakitPemanasan,
  type SoalPemanasan,
  type TulisanPemanasan,
} from './kalibrasi-pemanasan.ts';
import { DEFINISI_PAKET, bangunPaket } from './paket.ts';
import type { JawabanModel } from './susun.ts';

const PAKET = bangunPaket(DEFINISI_PAKET.tirt);
const BAIK: TulisanPemanasan = {
  nama: 'Wulan',
  jam: '19.40',
  pesan: 'Sahamnya disetop lagi hari ini ya, katanya bursa ragu perusahaannya bisa bertahan.',
  angka_pesan: [],
  kunci: 'Keliru, disetop karena harganya naik tinggi sekali.',
  pengecoh: ['Betul, disetop karena bursa ragu usahanya bertahan.', 'Betul, alasannya sama dengan penghentian awal tahun.', 'Keliru, disetop karena laporan keuangannya telat.'],
  penjelasan:
    'Kartu hari ini menyebut alasan resminya: [[susp-2025-12-10|peningkatan harga kumulatif]] yang signifikan, untuk meredam kenaikan. Keraguan soal kelangsungan usaha adalah alasan penghentian [[susp-2025-01-21|21 Januari 2025]], bukan hari ini. Salah-kaprah yang umum: mengira setiap penghentian punya alasan yang sama dengan penghentian sebelumnya.',
};
const RESMI = JSON.stringify(BAIK);
const TANPA_KEBERATAN = JSON.stringify({ cek_klaim: { bagian_tak_tercek: [], kunci_menyatakan_tak_pasti: false }, cek_pilihan: { juga_benar: [], alasan: '' }, keberatan: [], arahan: '' });

function palsu(o: { tulis?: (ke: number) => string; kartu?: (ke: number, i: number) => string; kritikus?: string }): { panggil: Parameters<typeof jalankanPemanasan>[1]; jenis: string[] } {
  const jenis: string[] = [];
  return {
    jenis,
    panggil: async (_pesan, _setelan, info) => {
      jenis.push(`${info.jenis}${info.jenis === 'gerbang-kartu' ? String(info.ke) : ''}`);
      const j = (teks: string): JawabanModel => ({ teks, finish_reason: 'stop', token_masuk: 1, token_keluar: 1, biaya_usd: 0, latensi_ms: 1, penyedia: 'Wafer', token_penalaran: 3_000 });
      if (info.jenis === 'susun') return j(o.tulis?.(info.putaran) ?? RESMI);
      if (info.jenis === 'gerbang-kartu') return j(o.kartu?.(info.putaran, info.ke) ?? JSON.stringify({ pilihan: HURUF_KUNCI_PEMANASAN, kartu: [1], alasan: 'kartu 1', membingungkan: [] }));
      return j(o.kritikus ?? TANPA_KEBERATAN);
    },
  };
}

describe('soal pemanasan — rakitan dan gerbang kode', () => {
  it('kartu = penentu (kartu 1) + kartu kedua; kunci di huruf kode; bentuk Soal kasus', () => {
    const o = rakitPemanasan(BAIK);
    expect(o.kartu).toEqual([...KARTU_PEMANASAN]);
    expect(o.kartu_penentu).toEqual(['susp-2025-12-10']);
    expect(o.pilihan[HURUF_KUNCI_PEMANASAN]).toBe(BAIK.kunci);
    const s = keSoal(o);
    expect(Object.keys(s)).toEqual(['soal_id', 'kartu', 'kartu_penentu', 'istilah', 'pesan', 'tanya', 'petunjuk', 'pilihan', 'jawaban', 'penjelasan', 'fact_ids']);
    expect(s.petunjuk).toContain('kartu 1');
    expect(s.fact_ids).toEqual(['susp-2025-01-21', 'susp-2025-12-10']);
    expect(gerbangKodePemanasan(o, PAKET).menolak).toEqual([]);
  });

  it('validator, G-penilaian, G-pilihan-kembar, dan nama kasus tayang menolak', () => {
    const tolak = (t: Partial<TulisanPemanasan>): string[] => gerbangKodePemanasan(rakitPemanasan({ ...BAIK, ...t }), PAKET).menolak;
    expect(tolak({ nama: 'Bayu' }).join(' ')).toContain('NAMA_TERLARANG');
    expect(tolak({ nama: 'Nadia' }).join(' ')).toContain('dipakai kasus tayang');
    expect(tolak({ pesan: 'Sahamnya disetop, padahal prospeknya cerah banget.' }).join(' ')).toContain('G-penilaian');
    expect(tolak({ pengecoh: ['Betul, disetop karena bursa ragu usahanya bertahan.', 'Betul, disetop karena bursa ragu usahanya bertahan.', BAIK.pengecoh[2]] }).join(' ')).toContain('G-pilihan-kembar');
    expect(tolak({ kunci: 'Keliru, harganya naik Rp58 sejak akhir November.' }).join(' ')).toContain('ANGKA_TANPA_RUJUKAN');
  });
});

describe('pemeriksa anti-bocor DADA/ULTJ', () => {
  const tayang = kasusTayang();
  it('potongan 5 kata; frasa wajib "Salah-kaprah yang umum" dilepas', () => {
    expect([...potongan('Satu dua tiga empat lima enam')]).toEqual(['satu dua tiga empat lima', 'dua tiga empat lima enam']);
    expect(potongan('Salah-kaprah yang umum: menganggap').size).toBe(0);
  });

  it('kalimat dari soal tayang (pesan, pilihan, penjelasan) tertangkap; fact_id kasus tayang tertangkap', () => {
    const o = rakitPemanasan(BAIK);
    const bersih = keSoal(o);
    expect(periksaBocor(bersih, PAKET, tayang)).toEqual([]);
    const pesanDada = tayang.find((k) => k.berkas.startsWith('dada'))?.soal[0]?.pesan.isi ?? '';
    const bocor: SoalPemanasan = { ...bersih, pesan: { ...bersih.pesan, isi: pesanDada } };
    expect(periksaBocor(bocor, PAKET, tayang).join(' ')).toContain('dada-2025-10-08.json pesan');
    const pilihanUltj = tayang.find((k) => k.berkas.startsWith('ultj'))?.soal[1]?.pilihan[0]?.teks ?? '';
    expect(periksaBocor({ ...bersih, pilihan: bersih.pilihan.map((p, i) => (i === 0 ? { ...p, teks: pilihanUltj } : p)) }, PAKET, tayang).join(' ')).toContain('ultj-2026-05-04.json pilihan');
    expect(periksaBocor({ ...bersih, fact_ids: [...bersih.fact_ids, 'div-2026-05-04'] }, PAKET, tayang).join(' ')).toContain('milik kasus tayang');
  });
});

describe('jalan pemanasan (palsu)', () => {
  it('lolos di percobaan pertama: penulis → kartu ×3 → kritikus', async () => {
    const p = palsu({});
    const h = await jalankanPemanasan(PAKET, p.panggil, () => 0);
    expect(h.lolos).toBe(true);
    expect(p.jenis).toEqual(['susun', 'gerbang-kartu1', 'gerbang-kartu2', 'gerbang-kartu3', 'kritikus']);
    expect(h.soal?.jawaban).toBe(HURUF_KUNCI_PEMANASAN);
  });

  it('pembaca kartu ke-2 salah → ditolak, kritikus tidak dipanggil, percobaan berikutnya menerima umpan balik', async () => {
    const p = palsu({ kartu: (ke, i) => JSON.stringify({ pilihan: ke === 1 && i === 2 ? 'a' === HURUF_KUNCI_PEMANASAN ? 'b' : 'a' : HURUF_KUNCI_PEMANASAN, kartu: [1], alasan: 'x', membingungkan: [] }) });
    const h = await jalankanPemanasan(PAKET, p.panggil, () => 0);
    expect(h.percobaan[0]?.putusan?.menolak.join(' ')).toContain('pembaca kartu 2');
    expect(p.jenis.slice(0, 4)).toEqual(['susun', 'gerbang-kartu1', 'gerbang-kartu2', 'susun']);
    expect(h.lolos).toBe(true);
  });

  it('pembaca kartu yang benar tetapi tidak menunjuk kartu 1 → ditolak', async () => {
    const p = palsu({ kartu: (ke) => JSON.stringify({ pilihan: HURUF_KUNCI_PEMANASAN, kartu: [ke === 1 ? 2 : 1], alasan: 'x', membingungkan: [] }) });
    const h = await jalankanPemanasan(PAKET, p.panggil, () => 0);
    expect(h.percobaan[0]?.putusan?.menolak.join(' ')).toContain('tidak menunjuk kartu 1');
  });

  it('kritikus: keberatan "kunci" menolak; "tertebak"/"bahasa" hanya dicatat (tebak buta tidak disyaratkan)', async () => {
    const k = (jenis: string): string => JSON.stringify({ cek_klaim: { bagian_tak_tercek: [], kunci_menyatakan_tak_pasti: false }, cek_pilihan: { juga_benar: [], alasan: '' }, keberatan: [{ jenis, bagian: 'pilihan', alasan: 'uji' }], arahan: '' });
    const tolak = await jalankanPemanasan(PAKET, palsu({ kritikus: k('kunci') }).panggil, () => 0);
    expect(tolak.lolos).toBe(false);
    expect(tolak.percobaan).toHaveLength(MAKS_PERCOBAAN);
    const catat = await jalankanPemanasan(PAKET, palsu({ kritikus: k('tertebak') }).panggil, () => 0);
    expect(catat.lolos).toBe(true);
    expect(catat.percobaan[0]?.putusan?.dicatat.join(' ')).toContain('tertebak');
  });

  it('keluaran penulis tak terbaca → percobaan berikutnya', async () => {
    const h = await jalankanPemanasan(PAKET, palsu({ tulis: (ke) => (ke === 1 ? 'bukan json' : RESMI) }).panggil, () => 0);
    expect(h.percobaan[0]?.tulisan).toBeNull();
    expect(h.lolos).toBe(true);
  });
});

describe('soal pemanasan yang tersimpan', () => {
  const jalur = `${FOLDER_PEMANASAN}/soal.json`;
  it.runIf(existsSync(jalur))('tidak memuat teks DADA/ULTJ tayang; lolos gerbang kode; kartu dari paket TIRT', () => {
    const s = JSON.parse(readFileSync(jalur, 'utf8')) as SoalPemanasan;
    const paket = JSON.parse(readFileSync(`${AKAR}eval/keluaran-m2d8/pemanasan/fakta.json`, 'utf8')) as Array<{ fact_id: string; klaim: string }>;
    expect(periksaBocor(s, PAKET)).toEqual([]);
    expect(s.kartu).toEqual([...KARTU_PEMANASAN]);
    expect(paket.map((f) => f.fact_id)).toEqual([...KARTU_PEMANASAN]);
    for (const f of paket) expect(PAKET.fakta.find((x) => x.fact_id === f.fact_id)?.klaim).toBe(f.klaim);
    const o = { nama: s.pesan.nama, jam: s.pesan.jam, pesan: s.pesan.isi, angka_pesan: [], kartu: s.kartu, kartu_penentu: s.kartu_penentu, pilihan: Object.fromEntries(s.pilihan.map((p) => [p.kunci, p.teks])) as Record<'a' | 'b' | 'c' | 'd', string>, kunci: s.jawaban, penjelasan: s.penjelasan };
    const j = JSON.parse(readFileSync(`${FOLDER_PEMANASAN}/jejak.json`, 'utf8')) as { percobaan: Array<{ omongan: { angka_pesan: unknown[] } | null; putusan: { lolos: boolean } | null }> };
    const lolos = j.percobaan.find((c) => c.putusan?.lolos === true);
    expect(gerbangKodePemanasan({ ...o, angka_pesan: (lolos?.omongan?.angka_pesan ?? []) as typeof o.angka_pesan }, PAKET).menolak).toEqual([]);
  });
});
