/**
 * M3.13 Amandemen A-1.2: R25 di jalur gudang (`verifikasi:gudang` →
 * `audit:gudang`) memakai cakupan baru — respons kosong dihitung untuk sebuah
 * emiten hanya bila endpoint asalnya (manifest gudang) menyebut simbolnya.
 *
 * Sampai M3.13 D-3 jalur ini mengoper seluruh respons kosong gudang tanpa
 * asalnya, sehingga sesudah perbaikan R25 (yang tidak lagi menghitung respons
 * tanpa asal) angkanya menjadi 0 untuk SEMUA emiten — R25 mati diam-diam di
 * audit. Tes ini memakai gudang contoh dengan dua emiten ber-laporan (AA, BB)
 * dan satu respons kosong yang menurut manifest milik AA.
 */
import { cpSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { afterAll, describe, expect, it } from 'vitest';
import { susunLaporanGudang } from './gudang.ts';

const CONTOH = fileURLToPath(new URL('./muat/contoh-gudang', import.meta.url));

function angkaKosongR25(laporan: ReturnType<typeof susunLaporanGudang>, simbol: string): number | undefined {
  const e = laporan.emiten.find((x) => x.simbol === simbol);
  const r25 = e?.pemeriksaan.find((p) => p.aturan === 'R25');
  return r25?.temuan[0]?.angka.find((a) => a.label.startsWith('respons kosong'))?.nilai;
}

describe('M3.13 A-1.2 — R25 per emiten di jalur gudang', () => {
  const folder = mkdtempSync(join(tmpdir(), 'gudang-r25-'));
  cpSync(CONTOH, folder, { recursive: true });
  // Emiten kedua yang juga punya laporan: salinan laporan AA dengan simbol BB.
  writeFileSync(
    join(folder, 'bb-filings.json'),
    readFileSync(join(CONTOH, 'aa-filings.json'), 'utf8').replaceAll('"AA.JK"', '"BB.JK"'),
  );
  // Emiten ketiga yang punya harga tetapi respons laporannya HANYA kosong (bentuk data M4a).
  writeFileSync(
    join(folder, 'cc-harian.json'),
    readFileSync(join(CONTOH, 'aa-harian.json'), 'utf8').replaceAll('"AA.JK"', '"CC.JK"'),
  );
  writeFileSync(join(folder, 'cc-kosong.json'), readFileSync(join(CONTOH, 'kosong.json'), 'utf8'));
  const manifest = join(folder, 'manifest.json');
  writeFileSync(
    manifest,
    JSON.stringify({
      berkas: [
        { nama: 'kosong.json', path_endpoint: '/v2/filings/?symbol=AA&start=2025-01-01&end=2026-09-28&limit=30' },
        { nama: 'cc-kosong.json', path_endpoint: '/v2/filings/?symbol=CC&start=2025-01-01&end=2026-09-28&limit=30' },
      ],
    }),
  );
  afterAll(() => {
    rmSync(folder, { recursive: true, force: true });
  });

  it('respons kosong milik AA (menurut manifest): R25 AA menghitung 1, BB 0', () => {
    const laporan = susunLaporanGudang(folder, manifest);
    expect(laporan.berkas_paginasi_kosong).toContain('kosong.json');
    expect(angkaKosongR25(laporan, 'AA')).toBe(1);
    expect(angkaKosongR25(laporan, 'BB')).toBe(0);
    // Emiten yang satu-satunya respons laporannya kosong: diperiksa, bukan dilewati.
    expect(angkaKosongR25(laporan, 'CC')).toBe(1);
  });

  it('tanpa asal di manifest, respons kosong tidak dihitung untuk emiten mana pun', () => {
    const kosong = join(folder, 'manifest-kosong.json');
    writeFileSync(kosong, JSON.stringify({ berkas: [] }));
    const laporan = susunLaporanGudang(folder, kosong);
    expect(angkaKosongR25(laporan, 'AA')).toBe(0);
    expect(angkaKosongR25(laporan, 'BB')).toBe(0);
  });
});
