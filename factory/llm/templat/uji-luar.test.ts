/**
 * Uji luar M2d-10 (T-07): bahan memakai petunjuk pra-registrasi M2d-7 persis,
 * kunci tidak bocor ke bahan, omongan yang diuji = draf terbit atau omongan
 * yang dikunci.
 */
import { describe, expect, it } from 'vitest';
import { PETUNJUK_KARTU_M2D7 } from '../pengecoh-putusan.ts';
import { PETUNJUK_TEBAK } from '../penguji.ts';
import { DEFINISI_PAKET, bangunPaket } from '../paket.ts';
import { jalankanTemplat } from './mesin.ts';
import { panggilTemplatPalsu } from './palsu.ts';
import { bangunBahanM2d10, omonganDiujiTemplat, omonganUjiM2d10 } from './uji-luar.ts';
import { SETELAN_TEMPLAT_M2D10 } from './setelan.ts';

const TIRT = bangunPaket(DEFINISI_PAKET.tirt);

describe('bahan uji luar M2d-10', async () => {
  const h = await jalankanTemplat({ paket: TIRT, panggil: panggilTemplatPalsu('tirt').panggil, setelan: SETELAN_TEMPLAT_M2D10 });
  const diuji = omonganDiujiTemplat(h);
  const b = bangunBahanM2d10(diuji, TIRT, h.lolos);
  it('petunjuk persis: tebak M2d-1…, kartu pra-registrasi M2d-7', () => {
    expect(b.tebak.startsWith(PETUNJUK_TEBAK)).toBe(true);
    expect(b.kartu.startsWith(PETUNJUK_KARTU_M2D7)).toBe(true);
  });
  it('tiga omongan, kunci & kartu penentu di kunci.json, bukan di bahan', () => {
    expect(b.kunci.tebak.length).toBe(3);
    expect(b.kunci.kartu.every((k) => k.penentu.length > 0)).toBe(true);
    expect(b.tebak).not.toMatch(/kunci|penentu|\[\[/i);
    expect(b.kartu).not.toMatch(/\[\[/);
    expect(omonganUjiM2d10(b.kunci, diuji).map((u) => u.no)).toEqual([1, 2, 3]);
  });
  it('tidak terbit → omongan yang dikunci saja', () => {
    expect(omonganDiujiTemplat({ lolos: false, draf: null, kunci: h.kunci.slice(0, 1) }).map((x) => x.no)).toEqual([1]);
  });
});
