/**
 * M2d T-05: bahan penguji buta.
 *
 * Yang dijaga: acak berbenih (bahan bisa dibangun ulang identik); bujur
 * sangkar latin tidak pernah menaruh dua draf sepaket di satu bundel; dan
 * petunjuk penguji tidak menyebut kartu, model, atau jawaban.
 */
import { describe, expect, it } from 'vitest';
import { MODEL_TANDING } from './model.ts';
import { PETUNJUK_ALAMI, PETUNJUK_TEBAK, acak, kocok, modelBundel } from './penguji.ts';
import { URUTAN_PAKET } from './tanding.ts';

describe('acak berbenih', () => {
  it('benih sama → urutan sama; benih beda → urutan beda', () => {
    const a = kocok([1, 2, 3, 4, 5, 6, 7, 8], acak(20260927));
    const b = kocok([1, 2, 3, 4, 5, 6, 7, 8], acak(20260927));
    const c = kocok([1, 2, 3, 4, 5, 6, 7, 8], acak(1));
    expect(a).toEqual(b);
    expect(a).not.toEqual(c);
    expect([...a].sort()).toEqual([1, 2, 3, 4, 5, 6, 7, 8]);
  });
});

describe('bujur sangkar latin bundel tebak buta', () => {
  it('tiap bundel: satu draf per paket, ketiga model hadir, dan tiap (paket, model) muncul di tepat satu bundel', () => {
    const muncul = new Map<string, number>();
    for (let i = 0; i < MODEL_TANDING.length; i++) {
      const paketDiBundel = new Set<string>();
      // Tiap penguji melihat ketiga model (satu per paket), supaya kecenderungan
      // seorang penguji tidak menempel ke satu model saja.
      expect(new Set(URUTAN_PAKET.map((_p, j) => modelBundel(i, j))).size).toBe(MODEL_TANDING.length);
      URUTAN_PAKET.forEach((paket, j) => {
        const model = modelBundel(i, j);
        expect(paketDiBundel.has(paket)).toBe(false);
        paketDiBundel.add(paket);
        muncul.set(`${paket}|${model}`, (muncul.get(`${paket}|${model}`) ?? 0) + 1);
      });
    }
    expect(muncul.size).toBe(9);
    expect([...muncul.values()].every((n) => n === 1)).toBe(true);
  });
});

describe('petunjuk penguji buta', () => {
  it('tidak menyebut model, kartu, atau jawaban; meminta JSON', () => {
    for (const p of [PETUNJUK_TEBAK, PETUNJUK_ALAMI]) {
      for (const m of MODEL_TANDING) expect(p).not.toContain(m);
      expect(p.toLowerCase()).not.toMatch(/deepseek|glm|zai|kunci jawaban/);
      expect(p).toContain('JSON');
    }
    expect(PETUNJUK_TEBAK).toContain('TIDAK diberi dokumen apa pun');
    expect(PETUNJUK_ALAMI).toContain('hanya bahasanya');
  });
});
