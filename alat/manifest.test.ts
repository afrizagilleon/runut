import { createHash } from 'node:crypto';
import { mkdirSync, mkdtempSync, readFileSync, rmSync, utimesSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { daftarJson, susunManifest, tulisManifest } from './manifest.ts';

let folder: string;
let keluar: string;

beforeEach(() => {
  folder = mkdtempSync(join(tmpdir(), 'manifest-uji-'));
  keluar = mkdtempSync(join(tmpdir(), 'manifest-keluar-'));
  writeFileSync(join(folder, 'b-lama.json'), '{"lama":1}');
  writeFileSync(join(folder, 'A-baru.json'), '[1,2,3]');
  mkdirSync(join(folder, 'daftar'));
  writeFileSync(join(folder, 'daftar', 'companies.json'), '{"results":[]}');
  writeFileSync(join(folder, 'kredit.csv'), [
    'waktu,jenis,path,status,biaya,berkas',
    '2026-09-29T01:00:00.000Z,saldo-pembuka,kredit terpakai sebelum M4a,-,113,-',
    '2026-09-29T01:00:01.000Z,cadang,/v2/daily/ABCD/?start=2025-01-01,-,1,A-baru.json',
    '2026-09-29T01:00:02.000Z,hasil,/v2/daily/ABCD/?start=2025-01-01,200,0,A-baru.json',
    '2026-09-30T01:00:01.000Z,cadang,/v2/companies/?limit=200,-,1,daftar/companies.json',
    '2026-09-30T01:00:02.000Z,hasil,/v2/companies/?limit=200,200,0,daftar/companies.json',
    '',
  ].join('\n'));
  writeFileSync(join(folder, 'bukan.txt'), 'x');
  utimesSync(join(folder, 'b-lama.json'), new Date('2026-09-20T10:00:00Z'), new Date('2026-09-20T10:00:00Z'));
});

afterEach(() => {
  rmSync(folder, { recursive: true, force: true });
  rmSync(keluar, { recursive: true, force: true });
});

describe('manifest gudang', () => {
  it('mendaftar semua .json, termasuk subfolder, terurut kode karakter', () => {
    expect(daftarJson(folder)).toEqual(['A-baru.json', 'b-lama.json', 'daftar/companies.json']);
  });

  it('memuat nama, ukuran, sha256, path asal dari buku kas, dan tanggal ambil', () => {
    const m = susunManifest(folder, join(folder, 'kredit.csv'));
    expect(m.jumlah_berkas).toBe(3);
    const baru = m.berkas.find((b) => b.nama === 'A-baru.json');
    expect(baru).toEqual({
      nama: 'A-baru.json',
      ukuran: 7,
      sha256: createHash('sha256').update('[1,2,3]').digest('hex'),
      path_endpoint: '/v2/daily/ABCD/?start=2025-01-01',
      tanggal_ambil: '2026-09-29',
      sumber_tanggal: 'buku-kas',
    });
    const lama = m.berkas.find((b) => b.nama === 'b-lama.json');
    expect(lama).toMatchObject({ path_endpoint: null, tanggal_ambil: '2026-09-20', sumber_tanggal: 'waktu-ubah-berkas' });
    expect(m.berkas.find((b) => b.nama === 'daftar/companies.json')?.path_endpoint).toBe('/v2/companies/?limit=200');
    expect(m.jumlah_byte).toBe(7 + 10 + 14);
  });

  it('tidak memuat isi data', () => {
    const teks = JSON.stringify(susunManifest(folder, join(folder, 'kredit.csv')));
    expect(teks).not.toContain('"lama":1');
    expect(teks).not.toContain('[1,2,3]');
  });

  it('dua kali jalan = byte sama', () => {
    const a = join(keluar, 'a.json');
    const b = join(keluar, 'b.json');
    tulisManifest(folder, join(folder, 'kredit.csv'), a);
    tulisManifest(folder, join(folder, 'kredit.csv'), b);
    expect(readFileSync(a)).toEqual(readFileSync(b));
    // Menulis ulang ke tujuan yang sama juga tidak mengubah satu byte pun.
    const sebelum = readFileSync(a);
    tulisManifest(folder, join(folder, 'kredit.csv'), a);
    expect(readFileSync(a)).toEqual(sebelum);
  });

  it('berkas tanpa buku kas tetap tercatat, dengan path null', () => {
    const m = susunManifest(folder, join(folder, 'tidak-ada.csv'));
    expect(m.berkas.every((b) => b.path_endpoint === null)).toBe(true);
  });
});
