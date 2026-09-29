/**
 * M2d-7 T-04: gerbang ARTEFAK murah sebelum kritikus (D-4) — pilihan-saja,
 * meresmikan, keseimbangan. Ambang (b) dan (c) diuji pada keenam soal
 * manusia yang hidup (semuanya harus lolos).
 *
 * Kegagalan yang dijaga (kontrak §0): gerbang yang menolak semua soal
 * manusia; penebak pilihan-saja yang diam-diam melihat pesan atau kartu.
 */
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { AKAR } from './env.ts';
import type { KunciOpsi } from './draf.ts';
import {
  MAKS_KATA_RESMI,
  PETUNJUK_PILIHAN_SAJA,
  RASIO_KESEIMBANGAN,
  gArtefak,
  gKeseimbangan,
  gMeresmikan,
  gPilihanSaja,
  pesanPilihanSaja,
} from './gerbang-artefak.ts';
import type { InfoPanggil } from './gerbang-tebak.ts';
import type { PesanChat } from './klien.ts';
import type { JawabanModel, SetelanPanggil } from './susun.ts';

interface SoalManusia {
  soal_id: string;
  pesan: { nama: string; jam: string; isi: string };
  pilihan: Array<{ kunci: KunciOpsi; teks: string }>;
  jawaban: KunciOpsi;
  kartu: string[];
}

export const SOAL_MANUSIA: Array<SoalManusia & { berkas: string }> = ['dada-2025-10-08', 'ultj-2026-05-04'].flatMap((f) =>
  (JSON.parse(readFileSync(`${AKAR}cases/${f}.json`, 'utf8')) as { soal: SoalManusia[] }).soal.map((s) => ({ ...s, berkas: f })),
);

const pilihanDari = (s: SoalManusia): Record<KunciOpsi, string> =>
  Object.fromEntries(s.pilihan.map((p) => [p.kunci, p.teks])) as Record<KunciOpsi, string>;

describe('ambang meresmikan & keseimbangan diuji pada soal manusia', () => {
  it('keenam soal manusia lolos (b) dan (c)', () => {
    expect(SOAL_MANUSIA).toHaveLength(6);
    for (const s of SOAL_MANUSIA) {
      const a = gArtefak({ pesan: s.pesan.isi, pilihan: pilihanDari(s), kunci: s.jawaban });
      expect({ id: s.soal_id, tolak: a.tolak }).toEqual({ id: s.soal_id, tolak: false });
      expect(a.keseimbangan.rasio).toBeLessThanOrEqual(RASIO_KESEIMBANGAN);
      expect(a.meresmikan.kata.length).toBeLessThan(MAKS_KATA_RESMI);
      expect(a.meresmikan.angka).toEqual([]);
    }
  });

  it('meresmikan: angka pesan yang hanya diulang kunci → tolak; kata ≥ 2 → tolak; bila juga ada di pengecoh → lolos', () => {
    const pesan = 'Harganya udah 58 rupiah, naiknya gila banget.';
    const p = (a: string): Record<KunciOpsi, string> => ({ a, b: 'Keliru, itu harga penutupan Rp106.', c: 'Betul, harganya naik 2,21 kali.', d: 'Keliru, itu naik 9 hari bursa.' });
    expect(gMeresmikan(pesan, p('Betul, naiknya memang Rp58.'), 'a')).toMatchObject({ tolak: true, angka: ['rp58'] });
    expect(gMeresmikan(pesan, { ...p('Betul, naiknya memang Rp58.'), b: 'Keliru, Rp58 itu harga penutupan.' }, 'a').tolak).toBe(false);
    expect(gMeresmikan('Katanya gila banget kenaikannya.', p('Betul, memang gila banget.'), 'a')).toMatchObject({ tolak: true, kata: ['gila', 'banget'] });
    expect(gMeresmikan('Katanya gila kenaikannya.', p('Betul, memang gila.'), 'a').tolak).toBe(false);
  });

  it('keseimbangan: kunci > 1,3 × median pengecoh → tolak; batasnya inklusif', () => {
    const x = (n: number): string => `Betul, ${'x'.repeat(n - 7)}`;
    expect(gKeseimbangan({ a: x(131), b: x(100), c: x(100), d: x(90) }, 'a').tolak).toBe(true);
    expect(gKeseimbangan({ a: x(130), b: x(100), c: x(100), d: x(90) }, 'a').tolak).toBe(false);
    expect(gKeseimbangan({ a: x(60), b: x(100), c: x(46), d: x(40) }, 'a')).toMatchObject({ median_pengecoh: 46, tolak: true });
  });
});

describe('pilihan-saja (choices-only): hanya empat pilihan, DeepSeek n = 2', () => {
  const o = { pilihan: { a: 'Betul, [[x|Rp58]] itu kenaikan.', b: 'Keliru, itu harga.', c: 'Betul, naik 9 hari.', d: 'Keliru, itu volume.' }, kunci: 'a' as KunciOpsi };

  it('pesan penebak hanya memuat empat pilihan (tanpa pesan, nama, kartu, fact_id)', () => {
    const p = pesanPilihanSaja(o.pilihan);
    expect(p).toHaveLength(2);
    expect(p[0]?.content).toBe(PETUNJUK_PILIHAN_SAJA);
    expect(p[1]?.content).toBe('a) Betul, Rp58 itu kenaikan.\nb) Keliru, itu harga.\nc) Betul, naik 9 hari.\nd) Keliru, itu volume.');
  });

  const palsu = (pilih: Array<string | null>): { panggil: (p: PesanChat[], s: SetelanPanggil, i: InfoPanggil) => Promise<JawabanModel>; info: InfoPanggil[]; pesan: PesanChat[][] } => {
    const info: InfoPanggil[] = [];
    const pesan: PesanChat[][] = [];
    let i = 0;
    return {
      info,
      pesan,
      panggil: async (p, _s, inf) => {
        info.push(inf);
        pesan.push(p);
        const x = pilih[i++] ?? null;
        return { teks: x === null ? 'bukan json' : JSON.stringify({ pilihan: x, yakin: 50, alasan: 'bentuk' }), token_masuk: 1, token_keluar: 1, latensi_ms: 1, finish_reason: 'stop', biaya_usd: 0 };
      },
    };
  };

  it('keduanya memilih kunci → tolak; satu saja → lolos; tak terbaca dihitung memilih kunci', async () => {
    const opsi = { putaran: 1, omongan: 1, maxTokens: 8000 };
    const dua = palsu(['a', 'a']);
    expect((await gPilihanSaja(o, { ...opsi, panggil: dua.panggil })).tolak).toBe(true);
    expect(dua.info.map((x) => `${x.jenis}/${String(x.ke)}`)).toEqual(['gerbang-pilihan-saja/1', 'gerbang-pilihan-saja/2']);
    expect((await gPilihanSaja(o, { ...opsi, panggil: palsu(['a', 'b']).panggil })).tolak).toBe(false);
    // Tebakan 1 tak terbaca dua kali (diulang sekali) → dihitung kena; tebakan 2 memilih kunci → tolak.
    const r = await gPilihanSaja(o, { ...opsi, panggil: palsu([null, null, 'a']).panggil });
    expect(r).toMatchObject({ tolak: true, kena: 2 });
    expect(r.tebakan[0]?.terbaca).toBe(false);
  });

  it('ambang kalibrasi: yakinMin 60 → keduanya memilih kunci tetapi rata-rata yakin 50 lolos', async () => {
    const opsi = { putaran: 1, omongan: 1, maxTokens: 8000 };
    const ya = async (yakin: number[]): Promise<boolean> => {
      let i = 0;
      const panggil = async (): Promise<JawabanModel> => ({ teks: JSON.stringify({ pilihan: 'a', yakin: yakin[i++] ?? 0, alasan: 'x' }), token_masuk: 1, token_keluar: 1, latensi_ms: 1, finish_reason: 'stop', biaya_usd: 0 });
      return (await gPilihanSaja(o, { ...opsi, panggil, yakinMin: 60 })).tolak;
    };
    expect(await ya([45, 55])).toBe(false);
    expect(await ya([60, 60])).toBe(true);
  });

  it('setiap penebak percakapan baru: dua pesan, dibangun ulang tiap panggilan', async () => {
    const x = palsu(['b', 'c']);
    await gPilihanSaja(o, { putaran: 1, omongan: 1, maxTokens: 8000, panggil: x.panggil });
    expect(x.pesan.map((p) => p.length)).toEqual([2, 2]);
    expect(x.pesan[0]).not.toBe(x.pesan[1]);
  });
});
