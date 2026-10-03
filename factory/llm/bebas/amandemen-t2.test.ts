/**
 * Amandemen teknis T2 M2d-15 (`docs/bukti/m2d15-amandemen-T2.md`, reviewer 3 Okt, izin pemilik):
 * - penulis effort "low" (setelan M2d-13 yang terbukti menghasilkan JSON di Azure), max_tokens 16.000;
 * - penjaga "probe dulu": panggilan penulis PERTAMA jalan tanpa JSON terurai, atau panggilan mana pun
 *   yang berhenti di max_tokens tanpa JSON, menghentikan jalan seketika (tanpa ulangan);
 * - satu jalan tambahan (m2d15-opus-3) dengan pagu = sisa pagu milestone US$3,00 (termasuk perkiraan).
 */
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { AKAR } from '../env.ts';
import { MODEL_OR_OPUS } from '../model.ts';
import type { PaketFakta } from '../paket.ts';
import { jalankanBebas, PROFIL_M2D15, SETELAN_PENULIS_M2D15_T2 } from './mesin.ts';
import { panggilBebasPalsu } from './palsu.ts';
import { paguPenilaiM2d15, rencanaJalanT2 } from './pagu-m2d15.ts';

const paket = JSON.parse(readFileSync(`${AKAR}eval/penyusun/m2d11-tirt-7/paket.json`, 'utf8')) as PaketFakta;

describe('T2: setelan penulis effort "low"', () => {
  it('profil M2d-15 memakai effort "low", max_tokens 16.000, suhu 1, penjaga probe aktif', () => {
    expect(SETELAN_PENULIS_M2D15_T2).toEqual({ suhu: 1, maxTokens: 16_000, tambahanBadan: { reasoning: { effort: 'low' } } });
    expect(PROFIL_M2D15.setelan).toBe(SETELAN_PENULIS_M2D15_T2);
    expect(PROFIL_M2D15.penjagaPanjang).toBe(true);
    expect(PROFIL_M2D15.prompt).toBe('v2');
    expect(PROFIL_M2D15.praPeriksa).toBe(2);
  });
});

describe('T2: penjaga probe dulu', () => {
  it('panggilan penulis pertama tanpa JSON → jalan berhenti seketika, tanpa ulangan', async () => {
    const p = panggilBebasPalsu({ penulis: () => 'maaf, saya berpikir terlalu lama' });
    const h = await jalankanBebas({ paket, penulis: MODEL_OR_OPUS, panggil: p.panggil, praPeriksa: 2, penjagaPanjang: true });
    expect(p.pesanPenulis).toHaveLength(1);
    expect(h.berhenti).toMatch(/^penjaga probe/);
    expect(h.versi).toEqual([]);
    expect(h.terbit).toBe(false);
  });

  it('panggilan kemudian yang berhenti di max_tokens tanpa JSON → berhenti, tanpa ulangan', async () => {
    const dasar = panggilBebasPalsu();
    let n = 0;
    const panggil: typeof dasar.panggil = async (pesan, setelan, info) => {
      const j = await dasar.panggil(pesan, setelan, info);
      if (info.jenis === 'tulis-bebas' || info.jenis === 'tulis-praperiksa') {
        n += 1;
        if (n === 2) return { ...j, teks: '{"omongan": [{"no": 1, "nama": "Ad', finish_reason: 'length' };
      }
      return j;
    };
    const h = await jalankanBebas({ paket, penulis: MODEL_OR_OPUS, panggil, praPeriksa: 2, penjagaPanjang: true });
    expect(n).toBe(2);
    expect(h.berhenti).toMatch(/^penjaga probe: .*max_tokens/);
    expect(h.panggilan_penulis.map((x) => x.finish_reason)).toEqual(['stop', 'length']);
  });

  it('tanpa penjaga (bawaan M2d-13): keluaran tak terbaca tetap diulang sekali', async () => {
    const p = panggilBebasPalsu({ penulis: (_v, _d, _p, k) => (k === 1 ? 'bukan json' : '{"omongan": []}') });
    await jalankanBebas({ paket, penulis: MODEL_OR_OPUS, panggil: p.panggil });
    expect(p.pesanPenulis.length).toBeGreaterThan(1);
  });

  it('penyedia setiap panggilan penulis tercatat', async () => {
    const p = panggilBebasPalsu();
    const h = await jalankanBebas({ paket, penulis: MODEL_OR_OPUS, panggil: p.panggil, praPeriksa: 2, penjagaPanjang: true });
    expect(h.panggilan_penulis.every((x) => x.penyedia === 'Palsu')).toBe(true);
  });
});

describe('T2: pagu jalan ke-3 = sisa pagu milestone', () => {
  const dua = [
    { id: 'm2d15-opus-1', biaya_usd: 1.147712, terbit: false },
    { id: 'm2d15-opus-2', biaya_usd: 0.77818, terbit: false },
  ];
  it('jalan m2d15-opus-3, pagu = 3,00 − biaya milestone (termasuk perkiraan), dibulatkan ke bawah', () => {
    expect(rencanaJalanT2(dua, 1.925892)).toMatchObject({ id: 'm2d15-opus-3', pagu: 1.0741 });
  });
  it('tidak ada jalan ke-4; tidak bila ada jalan terbit; tidak bila pagu habis', () => {
    expect(rencanaJalanT2([...dua, { id: 'm2d15-opus-3', biaya_usd: 0.5, terbit: false }], 2.4)).toHaveProperty('berhenti');
    expect(rencanaJalanT2([{ ...dua[0], terbit: true } as (typeof dua)[number], dua[1] as (typeof dua)[number]], 1.9)).toHaveProperty('berhenti');
    expect(rencanaJalanT2(dua, 3)).toHaveProperty('berhenti');
    expect(rencanaJalanT2(dua.slice(0, 1), 1.1)).toHaveProperty('berhenti');
  });
  it('penilai GLM hanya dari sisa pagu milestone sesudah jalan (tanpa minimum)', () => {
    expect(paguPenilaiM2d15(2.9)).toBe(0.1);
    expect(paguPenilaiM2d15(3.1)).toBe(0);
  });
});

describe('berkas amandemen T2', () => {
  it('memuat setelan, penjaga, pagu, dan catatan bahwa effort "medium" TIDAK teruji', () => {
    const isi = readFileSync(`${AKAR}docs/bukti/m2d15-amandemen-T2.md`, 'utf8');
    for (const s of ['effort "low"', '16.000', 'penjaga', 'm2d15-opus-3', 'US$3,00', 'tidak teruji', 'Azure', '`tanpa_cost`']) expect(isi).toContain(s);
  });
});
