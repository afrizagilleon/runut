/**
 * Jalan TIRT M2d-11: id berikutnya, perkiraan mesin M2d-11 memuat 3 keluarga
 * rotasi dan pembaca kartu 2 rotasi; argumen server menerima templat-m2d11.
 */
import { describe, expect, it } from 'vitest';
import { idJalanBerikut } from './jalan-patokan.ts';
import { perkiraanTemplatM2d11 } from './mesin-templat.ts';
import { buatAplikasi, uraiArgumen } from './server.ts';
import { mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

describe('jalan TIRT M2d-11', () => {
  it('id berikutnya m2d11-tirt-<n>', () => {
    expect(idJalanBerikut([])).toBe('m2d11-tirt-1');
    expect(idJalanBerikut(['m2d10-tirt', 'm2d11-tirt-1', 'm2d11-tirt-3', 'demo-tirt'])).toBe('m2d11-tirt-4');
  });
  it('perkiraan M2d-11: penebak rotasi tiga keluarga + pembaca kartu 2 rotasi', () => {
    const p = perkiraanTemplatM2d11();
    expect(p.per_panggilan.filter((x) => x.peran.startsWith('penebak rotasi'))).toHaveLength(3);
    expect(p.per_panggilan.some((x) => x.peran === 'pembaca kartu (2 rotasi)')).toBe(true);
    expect(p.per_panggilan.some((x) => /^penebak \d/.test(x.peran))).toBe(false);
  });
  it('server menerima --mesin templat-m2d11', () => {
    expect(uraiArgumen(['--mesin-lama', '--mesin', 'templat-m2d11']).mesin).toBe('templat-m2d11');
    expect(() => uraiArgumen(['--mesin-lama', '--mesin', 'lain'])).toThrow();
  });
  it('server memasang mesin templat-m2d11 (palsu dan sungguhan)', () => {
    const d = mkdtempSync(join(tmpdir(), 'pintu-'));
    const dasar = { akar: d, folderKeluaran: join(d, 'keluaran'), jam: () => new Date(), log: () => undefined, paguPenyusunUsd: 1 };
    const a = buatAplikasi({ ...dasar, palsu: true, namaMesin: 'templat-m2d11' });
    expect(a.keadaan.alur.mesin.nama).toBe('templat-m2d11-palsu');
    const b = buatAplikasi({ ...dasar, palsu: false, namaMesin: 'templat-m2d11' });
    expect(b.keadaan.alur.mesin.nama).toBe('templat-m2d11');
    a.server.close();
    b.server.close();
  });
});
