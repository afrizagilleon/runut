/**
 * M4a Amandemen A-1 — gudang beku untuk kasus tayang.
 *
 * Kasus yang sedang dimainkan (DADA, ULTJ) dibangun dari `.cache/sectors/`.
 * Sebelum A-1, menambah data ke gudang (audit M4a: 261 berkas baru) mengubah
 * hasil bangun ULTJ: temuan R25-nya menghitung respons kosong seluruh gudang,
 * 3 → 21. Build yang bergantung pada "apa pun yang kebetulan ada di folder"
 * tidak bisa diulang. Tes ini menjaga:
 *
 * 1. kasus tayang dibangun hanya dari 111 berkas yang dibekukan
 *    (`docs/bukti/gudang-beku-kasus.json`), byte-identik dengan `cases/`,
 *    walaupun gudang di sebelahnya bertambah;
 * 2. satu byte berubah atau satu berkas hilang → build GAGAL KERAS dengan nama
 *    berkasnya, bukan kasus yang diam-diam bergeser.
 */
import { createHash } from 'node:crypto';
import { copyFileSync, existsSync, mkdtempSync, readFileSync, rmSync, unlinkSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { bangunKasusTayang } from '../bangun-kasus.ts';
import { keJson } from '../kasus/json.ts';
import { FOLDER_GUDANG, muatGudang } from './gudang.ts';
import {
  GudangBekuRusak,
  bacaDaftarBeku,
  muatGudangBeku,
  periksaGudangBeku,
  salinGudangBeku,
} from './gudang-beku.ts';

const AKAR = fileURLToPath(new URL('../../', import.meta.url));
const sha = (b: Buffer | string) => createHash('sha256').update(b).digest('hex');

const DADA = 'dada-2025-10-08';
const ULTJ = 'ultj-2026-05-04';
const SHA_DADA = '608a22842064698a15b997bf2b2828f5462f3683619bad82664a6ff171e744a8';
const SHA_ULTJ = 'd26683dbe9803ce1d2884b27bcfd018c21bb4b59a96da260eb422017ca0a40e5';

describe('A-1 daftar gudang beku', () => {
  const daftar = bacaDaftarBeku();

  it('memuat 111 berkas dari manifest aec0105, nama unik dan terurut', () => {
    expect(daftar.berkas).toHaveLength(111);
    expect(daftar.sumber.commit).toBe('aec0105');
    const nama = daftar.berkas.map((b) => b.nama);
    expect(new Set(nama).size).toBe(111);
    expect([...nama].sort((a, b) => (a < b ? -1 : a > b ? 1 : 0))).toEqual(nama);
    for (const b of daftar.berkas) expect(b.sha256, b.nama).toMatch(/^[0-9a-f]{64}$/);
  });

  it('tidak memuat satu pun berkas M4a', () => {
    expect(daftar.berkas.some((b) => b.nama.includes('-m4a-') || b.nama.startsWith('daftar/'))).toBe(false);
  });
});

const adaCache = existsSync(`${FOLDER_GUDANG}/ULTJ-filings.json`) && existsSync(`${FOLDER_GUDANG}/dada-filings-2025.json`);

describe.runIf(adaCache)('A-1 kasus tayang dibangun dari gudang beku', () => {
  const daftar = bacaDaftarBeku();
  let salinan: string;

  beforeAll(() => {
    salinan = mkdtempSync(join(tmpdir(), 'gudang-beku-uji-'));
    for (const b of daftar.berkas) copyFileSync(join(FOLDER_GUDANG, b.nama), join(salinan, b.nama));
  });

  afterAll(() => {
    rmSync(salinan, { recursive: true, force: true });
  });

  it('gudang sungguhan cocok dengan daftar beku', () => {
    expect(() => periksaGudangBeku(FOLDER_GUDANG, daftar)).not.toThrow();
  });

  it('DADA dan ULTJ byte-identik dengan cases/ dari gudang sekarang (bertambah data M4a)', () => {
    for (const [id, harapan] of [
      [DADA, SHA_DADA],
      [ULTJ, SHA_ULTJ],
    ] as const) {
      const { kasus } = bangunKasusTayang(id);
      const teks = keJson(kasus);
      const berkas = readFileSync(`${AKAR}cases/${id}.json`, 'utf8').replace(/\r\n/g, '\n');
      expect(teks === berkas, id).toBe(true);
      expect(sha(teks), id).toBe(harapan);
    }
  });

  it('gudang beku hanya membaca 111 berkas walaupun folder berisi lebih', () => {
    const penuh = muatGudang(FOLDER_GUDANG);
    const beku = muatGudangBeku(FOLDER_GUDANG, daftar);
    expect(beku.ringkasan.berkas).toBe(111);
    expect(penuh.ringkasan.berkas).toBeGreaterThanOrEqual(111);
    expect(beku.berkas.filter((b) => b.jenis === 'paginasi-kosong')).toHaveLength(3);
  });

  it('salinan utuh + berkas asing di sebelahnya → ULTJ tetap sama', () => {
    writeFileSync(
      join(salinan, 'ZZZZ-m4a-filings-p0.json'),
      '{"results":[],"pagination":{"total_count":0,"showing":0,"limit":30,"offset":0,"has_next":false,"has_previous":false}}',
    );
    const { kasus } = bangunKasusTayang(ULTJ, salinan, daftar);
    expect(sha(keJson(kasus))).toBe(SHA_ULTJ);
    unlinkSync(join(salinan, 'ZZZZ-m4a-filings-p0.json'));
  });

  it('SABOTASE: satu byte berubah di salinan → build gagal keras menyebut nama berkas', () => {
    for (const [id, nama] of [
      [ULTJ, 'ULTJ-filings.json'],
      [DADA, 'dada-filings-2025.json'],
      [ULTJ, 'MERK-filings.json'], // respons kosong yang dirujuk R25 kasus ULTJ
    ] as const) {
      const jalur = join(salinan, nama);
      const asli = readFileSync(jalur);
      const rusak = Buffer.from(asli);
      rusak[rusak.length - 2] = rusak[rusak.length - 2] === 0x20 ? 0x0a : 0x20;
      writeFileSync(jalur, rusak);
      let galat: unknown;
      try {
        bangunKasusTayang(id, salinan, daftar);
      } catch (g) {
        galat = g;
      }
      writeFileSync(jalur, asli);
      expect(galat, `${id}/${nama}`).toBeInstanceOf(GudangBekuRusak);
      expect((galat as Error).message).toContain(nama);
    }
  });

  it('SABOTASE: satu berkas dibuang dari salinan → build gagal keras menyebut nama berkas', () => {
    for (const [id, nama] of [
      [ULTJ, 'ULTJ-corpactions.json'],
      [DADA, 'dada-corpactions.json'],
      [DADA, 'ARNA-filings.json'], // bukan berkas DADA, tetap bagian gudang beku
    ] as const) {
      const jalur = join(salinan, nama);
      const asli = readFileSync(jalur);
      unlinkSync(jalur);
      let galat: unknown;
      try {
        bangunKasusTayang(id, salinan, daftar);
      } catch (g) {
        galat = g;
      }
      writeFileSync(jalur, asli);
      expect(galat, `${id}/${nama}`).toBeInstanceOf(GudangBekuRusak);
      expect((galat as Error).message).toContain(nama);
    }
  });

  it('salinGudangBeku menyalin tepat 111 berkas terverifikasi', () => {
    const tujuan = mkdtempSync(join(tmpdir(), 'gudang-beku-salin-'));
    try {
      const folder = salinGudangBeku(tujuan, FOLDER_GUDANG, daftar);
      expect(muatGudang(folder).ringkasan.berkas).toBe(111);
    } finally {
      rmSync(tujuan, { recursive: true, force: true });
    }
  });
});
