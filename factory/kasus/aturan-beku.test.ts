/**
 * M4b D-1 — aturan beku per kasus tayang.
 *
 * Berkas kasus menyimpan jejak `pemeriksaan`: satu baris untuk tiap aturan yang
 * dijalankan pembangunnya. Sebelum M4b, pembangun kasus umum menjalankan
 * `ATURAN_V2` apa adanya, jadi mendaftarkan SATU aturan baru — bahkan yang
 * tidak pernah mengeluarkan temuan — menambah satu baris di jejak kasus ULTJ
 * yang sedang tayang (M4a: sha `d26683db…` → `a1ce2666…`). Aturan baru tidak
 * bisa ditambah tanpa menggeser kasus yang sedang dimainkan orang.
 *
 * Sekarang daftar aturan tiap kasus tayang dibekukan di
 * `docs/bukti/aturan-beku-kasus.json`, diturunkan dari `cases/*.json`. Tes ini
 * menjaga:
 *
 * 1. daftar beku = daftar `pemeriksaan` berkas kasus yang ikut repo, per kasus;
 * 2. aturan di luar daftar TIDAK DIJALANKAN (bukan hanya tidak dicantumkan) —
 *    aturan dummy yang ditambahkan ke `ATURAN_V2` tidak pernah dipanggil untuk
 *    kasus tayang, dan DADA/ULTJ tetap byte-identik;
 * 3. kasus baru (tidak ada di daftar beku) tetap memakai `ATURAN_V2` penuh;
 * 4. daftar beku yang rusak (kode tak dikenal, rangkap) atau jejak hasil bangun
 *    yang tidak sama dengan daftar beku → build gagal keras.
 */
import { createHash } from 'node:crypto';
import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { bangunKasusTayang } from '../bangun-kasus.ts';
import { keJson } from './json.ts';
import { FOLDER_GUDANG } from '../muat/gudang.ts';
import { bacaDaftarBeku } from '../muat/gudang-beku.ts';
import { ATURAN_V2, verifikasiV2, type EntriAturan } from '../verifikasi/v2.ts';
import { AturanBekuRusak, bacaAturanBeku, type AturanBeku } from '../verifikasi/aturan-beku.ts';
import { konteksGudang } from '../verifikasi/contoh.ts';
import { lewat } from '../verifikasi/dasar.ts';
import type { Kasus, KodeAturan } from '../skema/tipe.ts';

const AKAR = fileURLToPath(new URL('../../', import.meta.url));
const sha = (b: string) => createHash('sha256').update(b).digest('hex');

const DADA = 'dada-2025-10-08';
const ULTJ = 'ultj-2026-05-04';
/** Sidik berkas pada saat dibekukan (commit 3b09a92) — dicatat di daftar beku, tidak berubah. */
const SHA_DADA_BEKU = '608a22842064698a15b997bf2b2828f5462f3683619bad82664a6ff171e744a8';
/** Sidik berkas tayang sekarang: M3.13 D-1 mengganti judul pertanyaan soal 1 (build:case). */
const SHA_DADA = 'eb5ef6810ca67c6fe95301b4c80816f504ea08c48979142e5b9aaed9f1c333b6';
const SHA_ULTJ_BEKU = 'd26683dbe9803ce1d2884b27bcfd018c21bb4b59a96da260eb422017ca0a40e5';
/** Sidik berkas tayang sekarang: M3.13 D-2 (kalimat kartu riwayat dividen) + D-3 (R25 hanya respons kosong milik ULTJ). */
const SHA_ULTJ = '1ccbd55ca4b01a054edbf78818baf9c79f1e0d73422969c7010b0173e75a4003';

function kasusRepo(id: string): Kasus {
  return JSON.parse(readFileSync(`${AKAR}cases/${id}.json`, 'utf8')) as unknown as Kasus;
}

/** Aturan dummy yang menghitung berapa kali ia dipanggil. Tanpa temuan: lolos validator bila dijalankan. */
function dummy(): { entri: EntriAturan; panggil: () => number } {
  let n = 0;
  const kode = 'R99' as unknown as KodeAturan;
  return {
    entri: {
      kode,
      urutan: 999,
      bergantung: [],
      jalankan: () => {
        n += 1;
        return lewat(kode, 'Aturan dummy M4b', 'dummy tidak memeriksa apa pun', 'benda');
      },
    },
    panggil: () => n,
  };
}

/** Tambahkan `entri` ke `ATURAN_V2` selama `badan` berjalan, lalu kembalikan. */
function denganTambahan<T>(entri: EntriAturan, badan: () => T): T {
  const daftar = ATURAN_V2 as EntriAturan[];
  daftar.push(entri);
  try {
    return badan();
  } finally {
    daftar.pop();
  }
}

describe('D-1 daftar aturan beku', () => {
  const beku = bacaAturanBeku();

  it('memuat tepat kasus yang ada di cases/, dan tiap daftar = jejak pemeriksaan berkasnya', () => {
    const kasusRepoIds = readdirSync(`${AKAR}cases`)
      .filter((n) => n.endsWith('.json'))
      .map((n) => n.replace(/\.json$/, ''))
      .sort();
    expect(Object.keys(beku.kasus).sort()).toEqual(kasusRepoIds);
    for (const id of kasusRepoIds) {
      expect(beku.kasus[id]?.aturan, id).toEqual(kasusRepo(id).pemeriksaan.map((p) => p.aturan));
    }
  });

  it('DADA dibekukan dengan sepuluh aturan V1, ULTJ dengan seluruh V2 saat dibekukan', () => {
    expect(beku.kasus[DADA]?.aturan).toEqual(['R1', 'R2', 'R3', 'R4', 'R5', 'R6', 'R7', 'R8', 'R9', 'R10']);
    expect(beku.kasus[DADA]?.jalur).toBe('V1');
    expect(beku.kasus[ULTJ]?.jalur).toBe('V2');
    expect(beku.kasus[ULTJ]?.aturan).toHaveLength(35);
    expect(beku.kasus[ULTJ]?.aturan).not.toContain('R36');
  });

  it('mencatat sidik berkas kasus pada saat dibekukan', () => {
    expect(beku.kasus[DADA]?.berkas_sha256).toBe(SHA_DADA_BEKU);
    expect(beku.kasus[ULTJ]?.berkas_sha256).toBe(SHA_ULTJ_BEKU);
  });
});

describe('D-1 verifikasiV2 menjalankan hanya aturan yang diminta', () => {
  it('tanpa daftar beku: seluruh ATURAN_V2 (kasus baru)', () => {
    const d = dummy();
    const hasil = denganTambahan(d.entri, () => verifikasiV2(konteksGudang()));
    expect(d.panggil()).toBe(1);
    expect(hasil.pemeriksaan.map((p) => p.aturan)).toEqual([...ATURAN_V2.map((a) => a.kode), 'R99']);
  });

  it('dengan daftar beku: hanya aturan di daftar, dalam urutan daftar, dan dummy tidak dipanggil', () => {
    const d = dummy();
    const hasil = denganTambahan(d.entri, () =>
      verifikasiV2(konteksGudang({ aturan_beku: ['R35', 'R12', 'R7'] })),
    );
    expect(d.panggil()).toBe(0);
    expect(hasil.pemeriksaan.map((p) => p.aturan)).toEqual(['R35', 'R12', 'R7']);
  });

  it('kode beku yang tidak ada di ATURAN_V2 → galat keras yang menyebut kodenya', () => {
    const k = konteksGudang({ aturan_beku: ['R7', 'R98' as unknown as KodeAturan] });
    expect(() => verifikasiV2(k)).toThrow(AturanBekuRusak);
    expect(() => verifikasiV2(k)).toThrow(/R98/);
  });

  it('kode beku rangkap → galat keras', () => {
    const k = konteksGudang({ aturan_beku: ['R7', 'R12', 'R7'] });
    expect(() => verifikasiV2(k)).toThrow(AturanBekuRusak);
  });
});

const adaCache =
  existsSync(`${FOLDER_GUDANG}/ULTJ-filings.json`) && existsSync(`${FOLDER_GUDANG}/dada-filings-2025.json`);

describe.runIf(adaCache)('D-1 kasus tayang dibangun dari aturan beku', () => {
  const gudang = bacaDaftarBeku();

  it('SABOTASE: aturan dummy ditambahkan ke ATURAN_V2 → DADA/ULTJ byte-identik, dummy tidak dipanggil', () => {
    const d = dummy();
    denganTambahan(d.entri, () => {
      for (const [id, harapan] of [
        [DADA, SHA_DADA],
        [ULTJ, SHA_ULTJ],
      ] as const) {
        const { kasus } = bangunKasusTayang(id, FOLDER_GUDANG, gudang);
        expect(sha(keJson(kasus)), id).toBe(harapan);
        expect(kasus.pemeriksaan.map((p) => p.aturan), id).not.toContain('R99');
      }
    });
    expect(d.panggil()).toBe(0);
  });

  it('daftar beku diubah (satu aturan dibuang) → hasil bangun ULTJ tidak sama lagi dengan cases/', () => {
    const asli = bacaAturanBeku();
    const ubah: AturanBeku = structuredClone(asli);
    const ultj = ubah.kasus[ULTJ];
    if (ultj === undefined) throw new Error('ULTJ tidak ada di daftar beku');
    ultj.aturan = ultj.aturan.filter((a) => a !== 'R35');
    const { kasus } = bangunKasusTayang(ULTJ, FOLDER_GUDANG, gudang, ubah);
    expect(kasus.pemeriksaan.map((p) => p.aturan)).not.toContain('R35');
    expect(sha(keJson(kasus))).not.toBe(SHA_ULTJ);
  });

  it('daftar beku DADA yang tidak sama dengan jejak V1 → build gagal keras', () => {
    const ubah: AturanBeku = structuredClone(bacaAturanBeku());
    const dada = ubah.kasus[DADA];
    if (dada === undefined) throw new Error('DADA tidak ada di daftar beku');
    dada.aturan = [...dada.aturan, 'R35'];
    expect(() => bangunKasusTayang(DADA, FOLDER_GUDANG, gudang, ubah)).toThrow(AturanBekuRusak);
  });

  it('daftar beku ULTJ dengan kode tak dikenal → build gagal keras menyebut kodenya', () => {
    const ubah: AturanBeku = structuredClone(bacaAturanBeku());
    const ultj = ubah.kasus[ULTJ];
    if (ultj === undefined) throw new Error('ULTJ tidak ada di daftar beku');
    ultj.aturan = [...ultj.aturan, 'R98' as unknown as KodeAturan];
    expect(() => bangunKasusTayang(ULTJ, FOLDER_GUDANG, gudang, ubah)).toThrow(/R98/);
  });
});
