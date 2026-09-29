/**
 * M2d-7 T-06: kalibrasi ulang cepat (D-6) + gerbang pilihan-saja atas soal
 * manusia (D-4). Himpunan = himpunan bocor/aman M2d-6 (label dari jawaban
 * mentah penguji luar, dites di `penalar-kalibrasi.test.ts`); aturan
 * penurunan ambang ditulis sebelum kalibrasi dan dihitung ulang dari data
 * mentah.
 */
import { existsSync, readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { AKAR } from './env.ts';
import { GENERASI_M2D7 } from './agen-pengecoh.ts';
import { MAKS_KATA_RESMI, RASIO_KESEIMBANGAN } from './gerbang-artefak.ts';
import { SOAL_KALIBRASI } from './penalar-kalibrasi.ts';
import {
  AMBANG_AWAL,
  BATAS_AMAN_DITOLAK,
  JALUR_HIMPUNAN,
  JALUR_MANUSIA,
  JALUR_MATRIKS,
  TAMBAHAN_M2D6,
  bacaHasil,
  matriksK,
  putusanAmbang,
  putusanSoal,
  soalHimpunan,
  soalManusia,
  type HasilSoalK,
  type TebakMentah,
} from './pengecoh-kalibrasi.ts';
import { jsonDari } from './laporan.ts';

const t = (pilihan: string | null, yakin: number | null, terbaca = true): TebakMentah => ({ ke: 1, pilihan, yakin, terbaca, token_penalaran: [], penyedia: [], alasan: '' });
const soal = (x: Partial<HasilSoalK>): HasilSoalK => ({
  id: 'x', kelompok: 'aman', tambahan: false, kunci: 'a', meresmikan: { angka: [], kata: [] }, keseimbangan: { rasio: 1 },
  pilihan_saja: [t('b', 50), t('c', 50)], penebak: [t('b', 50), t('c', 50), t('d', 50)], biaya_usd: 0, ...x,
});

describe('himpunan kalibrasi M2d-7 = himpunan M2d-6 (+ dua tambahan terpisah)', () => {
  it('10 soal inti (4 bocor, 6 aman) persis SOAL_KALIBRASI M2d-6; tambahan = TIRT M2d-6 yang diuji di luar', () => {
    const h = soalHimpunan();
    expect(h.filter((x) => !x.tambahan).map((x) => x.id)).toEqual(SOAL_KALIBRASI.map((x) => x.id));
    expect(h.filter((x) => x.tambahan).map((x) => x.id)).toEqual(TAMBAHAN_M2D6.map((x) => x.id));
    expect(soalManusia()).toHaveLength(6);
  });

  it('label tambahan diturunkan dari jawaban mentah penguji luar M2d-6', () => {
    const kunci = (JSON.parse(readFileSync(`${AKAR}eval/keluaran-m2d6/penguji/kunci.json`, 'utf8')) as { tebak: Array<{ id: string; no: number; kunci: string }> }).tebak;
    const jawab = [1, 2, 3].map((p) => jsonDari(readFileSync(`${AKAR}eval/keluaran-m2d6/penguji/jawaban/tebak-p${String(p)}.txt`, 'utf8')) as { jawaban: Array<{ id: string; pilihan: string; yakin: number }> });
    for (const x of TAMBAHAN_M2D6) {
      const k = kunci.find((y) => y.no === x.no);
      const j = jawab.map((a) => a.jawaban.find((y) => y.id === k?.id));
      expect(x.luar).toContain(j.map((y) => `${String(y?.pilihan)}/${String(y?.yakin)}`).join(' · '));
      const benar = j.filter((y) => y?.pilihan === k?.kunci).length;
      expect(x.kelompok).toBe(benar >= 2 ? 'bocor' : 'aman');
    }
  });
});

describe('putusan per gerbang dan aturan penurunan ambang (murni)', () => {
  it('pilihan-saja: keduanya memilih kunci (tak terbaca = kunci); penebak: K-05', () => {
    expect(putusanSoal(soal({ pilihan_saja: [t('a', 40), t('a', 30)] }), AMBANG_AWAL).pilihan_saja).toBe(true);
    expect(putusanSoal(soal({ pilihan_saja: [t('a', 40), t(null, null, false)] }), AMBANG_AWAL).pilihan_saja).toBe(true);
    expect(putusanSoal(soal({ pilihan_saja: [t('a', 40), t('b', 30)] }), AMBANG_AWAL).pilihan_saja).toBe(false);
    expect(putusanSoal(soal({ penebak: [t('a', 45), t('b', 50), t('c', 50)] }), AMBANG_AWAL).penebak).toBe(true);
    expect(putusanSoal(soal({ penebak: [t('a', 35), t('b', 50), t('c', 50)] }), AMBANG_AWAL).penebak).toBe(false);
    expect(putusanSoal(soal({ penebak: [t('a', 45), t('b', 50), t('c', 50)] }), { ...AMBANG_AWAL, penebakYakin: false }).penebak).toBe(false);
  });

  it('ambang awal = ambang gerbang di kode', () => {
    expect(AMBANG_AWAL).toEqual({ rasio: RASIO_KESEIMBANGAN, maksKata: MAKS_KATA_RESMI, pilihanSajaYakin: null, penebakYakin: true });
  });

  it(`> ${String(BATAS_AMAN_DITOLAK)}/6 aman ditolak → longgarkan gerbang yang bersalah berurutan; gerbang yang tidak menolak aman tidak disentuh`, () => {
    const aman = (i: number, x: Partial<HasilSoalK>): HasilSoalK => soal({ id: `a${String(i)}`, ...x });
    const bocor = soal({ id: 'b', kelompok: 'bocor', penebak: [t('a', 60), t('a', 60), t('a', 60)] });
    const data = [
      bocor,
      aman(1, { penebak: [t('a', 45), t('b', 50), t('c', 50)] }),
      aman(2, { penebak: [t('a', 45), t('b', 50), t('c', 50)] }),
      aman(3, { penebak: [t('a', 45), t('b', 50), t('c', 50)] }),
      aman(4, { penebak: [t('a', 45), t('b', 50), t('c', 50)] }),
      aman(5, { penebak: [t('a', 45), t('b', 50), t('c', 50)] }),
      aman(6, {}),
    ];
    const p = putusanAmbang(data);
    expect(p.ambang).toEqual({ ...AMBANG_AWAL, penebakYakin: false });
    expect(matriksK(data, p.ambang).find((b) => b.gerbang === 'gabungan')).toMatchObject({ aman_ditolak: 0, bocor_ditolak: 1 });
    // ≤ 4/6 aman ditolak → tidak ada yang dilonggarkan.
    expect(putusanAmbang([...data.slice(0, 5), aman(6, {}), aman(7, {})]).ambang).toEqual(AMBANG_AWAL);
    // Porsi atas soal aman yang TERUKUR: 3 dari 4 (> 4/6) sudah melewati batas.
    expect(putusanAmbang([bocor, ...data.slice(1, 4), aman(6, {})]).ambang.penebakYakin).toBe(false);
  });

  it('matriks hanya menghitung soal inti; tambahan dan manusia dilaporkan terpisah', () => {
    const m = matriksK([soal({ tambahan: true, penebak: [t('a', 90), t('a', 90), t('a', 90)] }), soal({ kelompok: 'manusia' })], AMBANG_AWAL);
    expect(m.find((b) => b.gerbang === 'gabungan')).toMatchObject({ aman_total: 0, bocor_total: 0 });
  });
});

describe('kalibrasi tersimpan', () => {
  it('matriks.json = hitungan ulang dari data mentah', () => {
    expect(existsSync(JALUR_HIMPUNAN) && existsSync(JALUR_MANUSIA) && existsSync(JALUR_MATRIKS)).toBe(true);
    const h = bacaHasil(JALUR_HIMPUNAN).hasil;
    const m = JSON.parse(readFileSync(JALUR_MATRIKS, 'utf8')) as { putusan: ReturnType<typeof putusanAmbang>; matriks_awal: unknown };
    expect(m.putusan).toEqual(putusanAmbang(h));
    expect(m.matriks_awal).toEqual(matriksK(h, AMBANG_AWAL));
    // Kalibrasi berhenti di pagu US$0,60: yang terukur dicatat apa adanya, tidak dilengkapi tangan.
    expect(bacaHasil(JALUR_HIMPUNAN).selesai).toBe(false);
    expect(h.filter((x) => !x.tambahan).length).toBeGreaterThanOrEqual(7);
  });

  it('ambang lingkar M2d-7 = putusan kalibrasi', () => {
    const h = bacaHasil(JALUR_HIMPUNAN).hasil;
    expect(GENERASI_M2D7.ambang).toEqual(putusanAmbang(h).ambang);
  });

  it('dengan ambang akhir, keenam soal manusia lolos pilihan-saja (pengecualian awal: ULTJ "siapa-yang-membeli" d/45 d/55)', () => {
    const m = bacaHasil(JALUR_MANUSIA).hasil;
    expect(m).toHaveLength(6);
    const a = GENERASI_M2D7.ambang;
    expect(m.filter((x) => putusanSoal(x, a).ditolak)).toEqual([]);
    expect(m.filter((x) => putusanSoal(x, AMBANG_AWAL).ditolak).map((x) => x.id)).toEqual(['manusia-siapa-yang-membeli']);
  });
});
