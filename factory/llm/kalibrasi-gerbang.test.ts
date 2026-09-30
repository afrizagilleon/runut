/**
 * M2d-8 T-02: tumpukan gerbang, putusan per soal, dan aturan penyesuaian
 * pra-registrasi §3 (urutan, batas, penurunan ke "dicatat", kode pelindung).
 */
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { AKAR } from './env.ts';
import {
  LANGKAH,
  SETELAN_AWAL,
  URUTAN_PELONGGARAN,
  kritikusMenolak,
  matriksM2d8,
  modelKalibrasi,
  penebakMenolak,
  pilihanSajaMenolak,
  putusanKalibrasi,
  putusanSoalM2d8,
  tagKalibrasi,
  ukurSoalM2d8,
  type MentahSoalM2d8,
} from './kalibrasi-gerbang.ts';
import { himpunanBeku } from './kalibrasi-soal.ts';
import type { TebakMentah } from './pengecoh-kalibrasi.ts';

const PRAREG = readFileSync(`${AKAR}docs/bukti/m2d8-praregistrasi.md`, 'utf8').replace(/\r\n/g, '\n');

const tb = (pilihan: string | null, yakin = 50, terbaca = true): TebakMentah => ({ ke: 1, pilihan, yakin, terbaca, token_penalaran: [900], penyedia: ['Wafer'], alasan: '' });

/** Soal mentah yang lolos semua gerbang di setelan awal; `ubah` menimpa medan. */
function soal(id: string, kelompok: MentahSoalM2d8['kelompok'], ubah: Partial<MentahSoalM2d8> = {}, tambahan = false): MentahSoalM2d8 {
  return {
    id, kelompok, tambahan, luar: '', kunci: 'a', soal: '', kode: [], meresmikan: { angka: [], kata: [] }, keseimbangan: { rasio: 1 },
    pilihan_saja: [tb('b'), tb('c')],
    kartu: { pilihan: 'a', bingung_penulis: [], menunjuk_penentu: true, alasan: '', token_penalaran: [1], penyedia: ['x'] },
    kritikus: { menjawab: true, terpotong: false, keberatan: [], arahan: '', cek_makna: null, finish_reason: ['stop'], token_penalaran: [5000], penyedia: ['Wafer'] },
    penebak: [tb('b'), tb('c'), tb('d')],
    biaya_usd: 0,
    ...ubah,
  };
}
const manusia = (n: number, ubah: (i: number) => Partial<MentahSoalM2d8> = () => ({})): MentahSoalM2d8[] => Array.from({ length: n }, (_, i) => soal(`m${String(i)}`, 'manusia', ubah(i)));
const bocorTebak = (n: number): MentahSoalM2d8[] => Array.from({ length: n }, (_, i) => soal(`b${String(i)}`, 'bocor', { penebak: [tb('a', 70), tb('a', 70), tb('a', 70)] }));

describe('putusan per gerbang', () => {
  it('penebak: K-05 penuh → ≥ 2/3 → 3/3; tak terbaca = kunci', () => {
    const dua = [tb('a', 30), tb('a', 30), tb('b')];
    const satuYakin = [tb('a', 45), tb('b'), tb('c')];
    expect(penebakMenolak(satuYakin, 'a', 'k05')).toBe(true);
    expect(penebakMenolak(satuYakin, 'a', 'dua-dari-tiga')).toBe(false);
    expect(penebakMenolak(dua, 'a', 'dua-dari-tiga')).toBe(true);
    expect(penebakMenolak(dua, 'a', 'tiga-dari-tiga')).toBe(false);
    expect(penebakMenolak([tb('a'), tb('a'), tb(null, 0, false)], 'a', 'tiga-dari-tiga')).toBe(true);
  });

  it('pilihan-saja: keduanya kunci; tingkat 1 juga rata-rata yakin ≥ 60', () => {
    expect(pilihanSajaMenolak([tb('a', 50), tb('a', 55)], 'a', null)).toBe(true);
    expect(pilihanSajaMenolak([tb('a', 50), tb('a', 55)], 'a', 60)).toBe(false);
    expect(pilihanSajaMenolak([tb('a', 50), tb(null, 0, false)], 'a', 60)).toBe(true);
    expect(pilihanSajaMenolak([tb('a'), tb('b')], 'a', null)).toBe(false);
  });

  it('kritikus: tidak menjawab selalu menolak; jenis yang menolak menyempit per tingkat', () => {
    const tertebak = { menjawab: true, keberatan: [{ jenis: 'tertebak' as const }] };
    expect(kritikusMenolak(tertebak, LANGKAH.kritikus[0] ?? [])).toBe(true);
    expect(kritikusMenolak(tertebak, LANGKAH.kritikus[1] ?? [])).toBe(false);
    expect(kritikusMenolak({ menjawab: true, keberatan: [{ jenis: 'aturan' }] }, LANGKAH.kritikus[2] ?? [])).toBe(false);
    expect(kritikusMenolak({ menjawab: true, keberatan: [{ jenis: 'kunci' }] }, LANGKAH.kritikus[2] ?? [])).toBe(true);
    expect(kritikusMenolak({ menjawab: false, keberatan: [] }, LANGKAH.kritikus[2] ?? [])).toBe(true);
  });

  it('pembaca kartu: jawaban salah selalu menolak; kalimat membingungkan hanya di tingkat 0', () => {
    const b = soal('x', 'manusia', { kartu: { pilihan: 'a', bingung_penulis: ['kalimat'], menunjuk_penentu: true, alasan: '', token_penalaran: [], penyedia: [] } });
    expect(putusanSoalM2d8(b, SETELAN_AWAL).kartu).toBe(true);
    expect(putusanSoalM2d8(b, { ...SETELAN_AWAL, tingkat: { ...SETELAN_AWAL.tingkat, kartu: 1 } }).kartu).toBe(false);
    const salah = soal('y', 'manusia', { kartu: { pilihan: 'b', bingung_penulis: [], menunjuk_penentu: true, alasan: '', token_penalaran: [], penyedia: [] } });
    expect(putusanSoalM2d8(salah, { ...SETELAN_AWAL, tingkat: { ...SETELAN_AWAL.tingkat, kartu: 1 } }).kartu).toBe(true);
  });

  it('gerbang "dicatat" tetap dihitung di barisnya tetapi tidak ikut menolak di tumpukan; kode pelindung tak bisa diturunkan', () => {
    const m = soal('x', 'manusia', { penebak: [tb('a', 90), tb('a', 90), tb('a', 90)] });
    const p = putusanSoalM2d8(m, { ...SETELAN_AWAL, dicatat: ['penebak'] });
    expect(p.penebak).toBe(true);
    expect(p.ditolak).toBe(false);
    const k = soal('y', 'manusia', { kode: [{ kode: 'ANGKA_TAK_COCOK', alasan: '' }, { kode: 'G-register', alasan: '' }] });
    expect(putusanSoalM2d8(k, { ...SETELAN_AWAL, kode_dicatat: ['G-register', 'ANGKA_TAK_COCOK'] }).ditolak).toBe(true);
    const r = soal('z', 'manusia', { kode: [{ kode: 'G-register', alasan: '' }] });
    expect(putusanSoalM2d8(r, { ...SETELAN_AWAL, kode_dicatat: ['G-register'] }).ditolak).toBe(false);
  });

  it('soal tidak lengkap tidak masuk matriks', () => {
    const m = matriksM2d8([soal('a', 'manusia'), soal('b', 'manusia', { penebak: null })], SETELAN_AWAL);
    expect(m.find((b) => b.gerbang === 'tumpukan')?.manusia).toEqual([0, 1]);
  });
});

describe('aturan penyesuaian (§3)', () => {
  it('tumpukan sudah menerima ≥ 5/6 → tidak ada yang dilonggarkan', () => {
    const p = putusanKalibrasi([...manusia(6, (i) => (i === 0 ? { penebak: [tb('a'), tb('a'), tb('a')] } : {})), ...bocorTebak(4)]);
    expect(p.setelan).toEqual(SETELAN_AWAL);
    expect(p.syarat).toMatchObject({ manusia_diterima: 5, manusia_terukur: 6, manusia_terpenuhi: true, bocor_ditolak: 4, bocor_terpenuhi: true });
  });

  it('kode dulu: kode bukan-pelindung terbanyak diturunkan satu per satu sampai ≥ 5/6', () => {
    const p = putusanKalibrasi(
      manusia(6, (i) => (i < 3 ? { kode: [{ kode: 'G-register', alasan: '' }] } : i === 3 ? { kode: [{ kode: 'PENJELASAN_TANPA_PENENTU', alasan: '' }] } : i === 4 ? { kode: [{ kode: 'ANDAIAN_DI_PENJELASAN', alasan: '' }] } : {})),
    );
    expect(p.setelan.kode_dicatat).toEqual(['G-register', 'ANDAIAN_DI_PENJELASAN']);
    expect(p.syarat.manusia_diterima).toBe(5);
    expect(p.setelan.dicatat).toEqual([]);
  });

  it('kode pelindung tidak pernah diturunkan: syarat manusia bisa gagal', () => {
    const p = putusanKalibrasi(manusia(6, (i) => (i < 2 ? { kode: [{ kode: 'KATA_PENILAIAN', alasan: '' }] } : {})));
    expect(p.setelan.kode_dicatat).toEqual([]);
    expect(p.syarat.manusia_terpenuhi).toBe(false);
  });

  it('penebak dinaikkan tingkat demi tingkat, berhenti begitu ≥ 5/6', () => {
    const p = putusanKalibrasi(manusia(6, (i) => (i < 2 ? { penebak: [tb('a', 30), tb('a', 30), tb('b')] } : i === 2 ? { penebak: [tb('a', 45), tb('b'), tb('c')] } : {})));
    // k05: 3 ditolak (2 × 2/3, 1 × yakin 45) → tingkat 1 (≥ 2/3): 2 ditolak → tingkat 2 (3/3): 0
    expect(p.setelan.tingkat.penebak).toBe(2);
    expect(p.setelan.dicatat).toEqual([]);
    const q = putusanKalibrasi(manusia(6, (i) => (i < 1 ? { penebak: [tb('a', 30), tb('a', 30), tb('b')] } : i < 3 ? { penebak: [tb('a', 45), tb('b'), tb('c')] } : {})));
    expect(q.setelan.tingkat.penebak).toBe(1);
  });

  it('di batas masih menolak soal manusia → gerbang DITURUNKAN menjadi "dicatat"', () => {
    const p = putusanKalibrasi([...manusia(6, (i) => (i < 2 ? { penebak: [tb('a', 90), tb('a', 90), tb('a', 90)] } : {})), ...bocorTebak(4)]);
    expect(p.setelan.tingkat.penebak).toBe(2);
    expect(p.setelan.dicatat).toEqual(['penebak']);
    expect(p.syarat).toMatchObject({ manusia_diterima: 6, bocor_ditolak: 0, bocor_terpenuhi: false });
  });

  it('syarat bocor: ≥ 3/4 (porsi dari yang terukur); 2/4 tidak memenuhi, 3/4 memenuhi, 0 terukur tidak memenuhi', () => {
    const aman = soal('b-aman', 'bocor');
    expect(putusanKalibrasi([...manusia(6), ...bocorTebak(2), aman, { ...aman, id: 'b2' }]).syarat).toMatchObject({ bocor_ditolak: 2, bocor_terukur: 4, bocor_terpenuhi: false });
    expect(putusanKalibrasi([...manusia(6), ...bocorTebak(3), aman]).syarat).toMatchObject({ bocor_ditolak: 3, bocor_terukur: 4, bocor_terpenuhi: true });
    expect(putusanKalibrasi(manusia(6)).syarat).toMatchObject({ bocor_terukur: 0, bocor_terpenuhi: false });
    expect(putusanKalibrasi([...manusia(6), soal('t', 'bocor', { penebak: [tb('a', 90), tb('a', 90), tb('a', 90)] }, true)]).syarat.bocor_terukur).toBe(0);
  });

  it('urutan: gerbang sesudahnya tidak disentuh bila sudah ≥ 5/6; pilihan-saja sebelum kritikus', () => {
    const tolakPs = { pilihan_saja: [tb('a', 50), tb('a', 50)] };
    const tolakKr = { kritikus: { menjawab: true, terpotong: false, keberatan: [{ jenis: 'bahasa' as const, bagian: 'pesan', alasan: '' }], arahan: '', cek_makna: null, finish_reason: ['stop'], token_penalaran: [1], penyedia: ['W'] } };
    const p = putusanKalibrasi(manusia(6, (i) => (i < 2 ? tolakPs : i === 2 ? tolakKr : {})));
    expect(p.setelan.tingkat.pilihan_saja).toBe(1);
    expect(p.setelan.tingkat.kritikus).toBe(0);
    expect(URUTAN_PELONGGARAN).toEqual(['kode', 'penebak', 'pilihan_saja', 'meresmikan', 'keseimbangan', 'kritikus', 'kartu']);
    expect(PRAREG).toContain('**Urutan:** kode → penebak → pilihan-saja → meresmikan → keseimbangan → kritikus → pembaca kartu.');
  });

  it('langkah pelonggaran = tabel pra-registrasi', () => {
    expect(LANGKAH.penebak).toEqual(['k05', 'dua-dari-tiga', 'tiga-dari-tiga']);
    expect(LANGKAH.pilihan_saja).toEqual([null, 60]);
    expect(LANGKAH.meresmikan).toEqual([2, 3]);
    expect(LANGKAH.keseimbangan).toEqual([1.3, 1.5]);
    expect(LANGKAH.kritikus.map((x) => [...x])).toEqual([['kunci', 'makna', 'ambigu', 'tertebak', 'bahasa', 'aturan', 'lain'], ['kunci', 'makna', 'aturan'], ['kunci', 'makna']]);
    expect(LANGKAH.kartu).toEqual([true, false]);
    for (const s of ['hanya ≥ 2/3 memilih kunci', 'hanya 3/3 memilih kunci', 'juga rata-rata yakin ≥ 60', 'kata 2 → 3', '1,3 → 1,5', 'hanya keberatan `kunci`, `makna`, `aturan`', 'hanya `kunci`, `makna`', 'kalimat membingungkan tidak menolak']) expect(PRAREG).toContain(s);
  });
});

describe('pengukuran satu soal (palsu, tanpa jaringan)', () => {
  it('SEMUA gerbang dijalankan walau gerbang awal menolak; model dan setelan per jenis', async () => {
    const s = himpunanBeku()[0];
    if (s === undefined) throw new Error('himpunan kosong');
    const log: string[] = [];
    const m = await ukurSoalM2d8(
      s,
      async (_pesan, setelan, info) => {
        log.push(`${info.jenis}|${modelKalibrasi(info.jenis)}|${String(setelan.maxTokens)}|${JSON.stringify(setelan.tambahanBadan)}|${String(setelan.ambangPenalaran)}|${tagKalibrasi(s.id, info)}`);
        const teks =
          info.jenis === 'gerbang-kartu'
            ? '{"pilihan":"b","kartu":[1],"alasan":"k","membingungkan":[]}'
            : info.jenis === 'kritikus'
              ? '{"cek_klaim":{"bagian_tak_tercek":[],"kunci_menyatakan_tak_pasti":false},"cek_pilihan":{"juga_benar":[],"alasan":""},"keberatan":[],"arahan":""}'
              : `{"pilihan":"${s.omongan.kunci}","yakin":70,"alasan":"x"}`;
        return { teks, finish_reason: 'stop', token_masuk: 1, token_keluar: 1, biaya_usd: 0, latensi_ms: 1, penyedia: 'Wafer', token_penalaran: 2_000 };
      },
      () => 0,
    );
    expect(log.map((x) => x.split('|')[0])).toEqual(['gerbang-pilihan-saja', 'gerbang-pilihan-saja', 'gerbang-kartu', 'kritikus', 'gerbang-tebak', 'gerbang-tebak', 'gerbang-tebak']);
    expect(log[3]).toContain('|z-ai/glm-5.3|40000|{"reasoning":{"effort":"high"}}|1000|m2d8/kalibrasi/dada-s1-kata-bursa/kritikus/t1');
    expect(log[4]).toContain('|z-ai/glm-5.3|8000|{"reasoning":{"effort":"high"}}|250|');
    expect(log[0]).toContain('|deepseek/deepseek-v4.1-flash|');
    expect(log[2]).toContain('|deepseek/deepseek-v4.1-flash|');
    const p = putusanSoalM2d8(m, SETELAN_AWAL);
    expect(p).toMatchObject({ pilihan_saja: true, penebak: true, kritikus: false, kode: true, ditolak: true });
  });

  it('lanjutan: gerbang yang sudah terukur TIDAK diukur ulang; kritikus memakai jawaban pembaca kartu yang tersimpan', async () => {
    const s = himpunanBeku()[4];
    if (s === undefined) throw new Error('himpunan kosong');
    const log: string[] = [];
    const sebagian: MentahSoalM2d8 = {
      ...soal(s.id, 'manusia'), kunci: s.omongan.kunci, kritikus: null, penebak: null, biaya_usd: 0.004, galat: 'PaguMilestoneTercapai: …',
      pilihan_saja: [tb('c', 55), tb('c', 60)],
      kartu: { pilihan: s.omongan.kunci, bingung_penulis: [], menunjuk_penentu: true, alasan: 'dari kartu penentu', token_penalaran: [100], penyedia: ['x'] },
    };
    const m = await ukurSoalM2d8(
      s,
      async (pesan, _setelan, info) => {
        log.push(info.jenis);
        if (info.jenis === 'kritikus') expect(pesan[1]?.content).toContain('alasannya: "dari kartu penentu"');
        const teks = info.jenis === 'kritikus' ? '{"cek_klaim":{"bagian_tak_tercek":[],"kunci_menyatakan_tak_pasti":false},"cek_pilihan":{"juga_benar":[],"alasan":""},"keberatan":[],"arahan":""}' : '{"pilihan":"a","yakin":40,"alasan":"x"}';
        return { teks, finish_reason: 'stop', token_masuk: 1, token_keluar: 1, biaya_usd: 0, latensi_ms: 1, penyedia: 'Wafer', token_penalaran: 2_000 };
      },
      () => 0.01,
      sebagian,
    );
    expect(log).toEqual(['kritikus', 'gerbang-tebak', 'gerbang-tebak', 'gerbang-tebak']);
    expect(m.pilihan_saja).toEqual(sebagian.pilihan_saja);
    expect(m.kartu).toEqual(sebagian.kartu);
    expect(m.galat).toBeUndefined();
    expect(m.biaya_usd).toBeCloseTo(0.004);
  });
});

describe('kalibrasi nyata (mentah.json)', () => {
  it('setelan lingkar = putusanKalibrasi(mentah) = setelan.json; matriks.json dihitung ulang sama', async () => {
    const { SETELAN_KALIBRASI_M2D8 } = await import('./kalibrasi-susun.ts');
    const { bacaMentah, isiMatriks, JALUR_MATRIKS_M2D8, JALUR_SETELAN } = await import('./kalibrasi-gerbang.ts');
    const { hasil } = bacaMentah();
    const p = putusanKalibrasi(hasil);
    expect(p.setelan).toEqual(SETELAN_KALIBRASI_M2D8);
    expect(JSON.parse(readFileSync(JALUR_SETELAN, 'utf8'))).toEqual(SETELAN_KALIBRASI_M2D8);
    expect(JSON.parse(readFileSync(JALUR_MATRIKS_M2D8, 'utf8'))).toEqual(JSON.parse(JSON.stringify(isiMatriks(hasil))));
    expect(p.syarat).toMatchObject({ manusia_terukur: 5, manusia_diterima: 5, manusia_terpenuhi: true, bocor_terukur: 0, bocor_terpenuhi: false });
  });

  it('urutan jalan dipatuhi: soal yang terukur = awalan himpunan beku; biaya di bawah pagu kalibrasi', async () => {
    const { bacaMentah } = await import('./kalibrasi-gerbang.ts');
    const m = bacaMentah() as unknown as { hasil: MentahSoalM2d8[]; biaya_kalibrasi_usd: number };
    expect(m.hasil.map((x) => x.id)).toEqual(himpunanBeku().slice(0, m.hasil.length).map((x) => x.id));
    expect(m.biaya_kalibrasi_usd).toBeLessThanOrEqual(0.7);
  });
});

