/**
 * M2d-8 T-04: draf terbaik untuk penyetuju (pra-registrasi §8) dan bahan uji
 * luar menurut pra-registrasi M2d-7 (tidak diubah).
 */
import { execFileSync } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import type { HasilPengecoh } from './agen-pengecoh.ts';
import type { OmonganDraf } from './draf.ts';
import { AKAR } from './env.ts';
import { BENIH_M2D8, FOLDER_PENGUJI_M2D8, NAMA_TAHAP, bangunBahanM2d8, drafTerbaik, omonganUjiM2d8, opsiBahanM2d8, tahap } from './kalibrasi-penguji.ts';
import { FOLDER_TIRT_M2D8 } from './kalibrasi-susun.ts';
import { BENIH_M2D7, PETUNJUK_KARTU_M2D7, bacaJawaban, putusanTayang, type JawabKartu, type JawabTebak } from './pengecoh-putusan.ts';

const o = (nama: string): OmonganDraf => ({ nama, jam: '19.00', pesan: 'x', angka_pesan: [], kartu: ['a', 'b'], kartu_penentu: ['a'], pilihan: { a: 'Betul, a.', b: 'Keliru, b.', c: 'Betul, c.', d: 'Keliru, d.' }, kunci: 'b', penjelasan: 'p' });
type E = { no: number; status: string; umpan: string[]; umpan_terarah?: Array<{ sumber: string }> };
const r = (putaran: number, e: E[], draf: Array<OmonganDraf | null>): HasilPengecoh['riwayat'][number] => ({ putaran, omongan: e, draf }) as unknown as HasilPengecoh['riwayat'][number];

describe('tahap terjauh', () => {
  it('urutan tumpukan kode → artefak → pilihan-saja → kartu → kritikus → penebak → dikunci', () => {
    expect(tahap({ status: 'ditolak-pemeriksa', umpan_terarah: [{ sumber: 'pemeriksa: G-kaku' } as never] })).toBe(0);
    expect(tahap({ status: 'ditolak-pemeriksa', umpan_terarah: [{ sumber: 'gerbang artefak: meresmikan' } as never] })).toBe(1);
    expect(tahap({ status: 'ditolak-artefak' })).toBe(2);
    expect(tahap({ status: 'ditolak-kartu' })).toBe(3);
    expect(tahap({ status: 'kritikus-tidak-menjawab' })).toBe(4);
    expect(tahap({ status: 'ditolak-kritikus' })).toBe(4);
    expect(tahap({ status: 'ditolak-tebak' })).toBe(5);
    expect(tahap({ status: 'lolos' })).toBe(6);
    expect(tahap({ status: 'tidak-ada' })).toBeNull();
    expect(tahap({ status: 'terkunci-sebelumnya' })).toBeNull();
    expect(NAMA_TAHAP).toHaveLength(7);
  });
});

describe('draf terbaik', () => {
  it('dikunci menang; lalu tahap terjauh; seri → butir paling sedikit → putaran paling akhir', () => {
    const h = {
      riwayat: [
        r(1, [{ no: 1, status: 'ditolak-kartu', umpan: ['x', 'y'] }, { no: 2, status: 'ditolak-kritikus', umpan: ['x'] }, { no: 3, status: 'ditolak-kritikus', umpan: ['x'] }], [o('A1'), o('B1'), o('C1')]),
        r(2, [{ no: 1, status: 'ditolak-kartu', umpan: ['x'] }, { no: 2, status: 'lolos', umpan: [] }, { no: 3, status: 'ditolak-kritikus', umpan: ['x'] }], [o('A2'), o('B2'), o('C2')]),
        r(3, [{ no: 1, status: 'ditolak-pemeriksa', umpan: [] , umpan_terarah: [{ sumber: 'pemeriksa: X' }] }, { no: 2, status: 'terkunci-sebelumnya', umpan: [] }, { no: 3, status: 'ditolak-tebak', umpan: ['x', 'y', 'z'] }], [o('A3'), o('B2'), o('C3')]),
      ],
    };
    const d = drafTerbaik(h);
    expect(d.map((x) => [x.no, x.omongan.nama, x.status])).toEqual([
      [1, 'A2', 'ditolak-kartu'],
      [2, 'B2', 'lolos'],
      [3, 'C3', 'ditolak-tebak'],
    ]);
    const seri = drafTerbaik({ riwayat: [r(1, [{ no: 1, status: 'ditolak-kritikus', umpan: ['x'] }], [o('P1')]), r(2, [{ no: 1, status: 'ditolak-kritikus', umpan: ['x'] }], [o('P2')])] });
    expect(seri[0]?.omongan.nama).toBe('P2');
  });
});

describe('bahan uji luar = prosedur pra-registrasi M2d-7', () => {
  it('petunjuk kartu M2d-7, benih tetap berbeda dari M2d-7; pra-registrasi M2d-7 tidak berubah sejak commit-nya', () => {
    expect(BENIH_M2D8).not.toBe(BENIH_M2D7);
    expect(opsiBahanM2d8().label).toBe('agen-m2d8');
    const prareg = readFileSync(`${AKAR}docs/bukti/m2d7-praregistrasi.md`, 'utf8').replace(/\r\n/g, '\n');
    expect(prareg).toContain(PETUNJUK_KARTU_M2D7);
    const t00 = execFileSync('git', ['log', '--format=%H', '--diff-filter=A', '--', 'docs/bukti/m2d7-praregistrasi.md'], { cwd: AKAR, encoding: 'utf8' }).trim().split('\n').at(-1) ?? '';
    const asli = execFileSync('git', ['show', `${t00}:docs/bukti/m2d7-praregistrasi.md`], { cwd: AKAR, encoding: 'utf8' }).replace(/\r\n/g, '\n');
    expect(prareg).toBe(asli);
  });

  it('pra-registrasi M2d-8 tidak berubah sejak commit-nya (T-00)', () => {
    const kini = readFileSync(`${AKAR}docs/bukti/m2d8-praregistrasi.md`, 'utf8').replace(/\r\n/g, '\n');
    const t00 = execFileSync('git', ['log', '--format=%H', '--diff-filter=A', '--', 'docs/bukti/m2d8-praregistrasi.md'], { cwd: AKAR, encoding: 'utf8' }).trim().split('\n').at(-1) ?? '';
    const asli = execFileSync('git', ['show', `${t00}:docs/bukti/m2d8-praregistrasi.md`], { cwd: AKAR, encoding: 'utf8' }).replace(/\r\n/g, '\n');
    expect(kini).toBe(asli);
    const waktu = execFileSync('git', ['log', '-1', '--format=%cI', t00], { cwd: AKAR, encoding: 'utf8' }).trim();
    const pertama = readFileSync(`${AKAR}.cache/llm/ledger.jsonl`, 'utf8').split(/\r?\n/).filter((b) => b.includes('"tag":"m2d8/')).map((b) => (JSON.parse(b) as { waktu: string }).waktu)[0];
    if (pertama !== undefined) expect(Date.parse(pertama)).toBeGreaterThan(Date.parse(waktu));
  });
});

describe('jalan TIRT M2d-8 yang tersimpan', () => {
  const ada = existsSync(`${FOLDER_TIRT_M2D8}/riwayat.json`) && existsSync(`${FOLDER_PENGUJI_M2D8}/kunci.json`);
  it.runIf(ada)('bahan uji luar = bangunBahanM2d8(jalan); putusan.json = putusanTayang(jawaban mentah); draf-terbaik.json = drafTerbaik(riwayat)', () => {
    const h = JSON.parse(readFileSync(`${FOLDER_TIRT_M2D8}/riwayat.json`, 'utf8')) as HasilPengecoh;
    const b = bangunBahanM2d8();
    expect(readFileSync(`${FOLDER_PENGUJI_M2D8}/tebak.md`, 'utf8')).toBe(b.tebak);
    expect(readFileSync(`${FOLDER_PENGUJI_M2D8}/kartu.md`, 'utf8')).toBe(b.kartu);
    expect(readFileSync(`${FOLDER_PENGUJI_M2D8}/alami.md`, 'utf8')).toBe(b.alami);
    const kunci = JSON.parse(readFileSync(`${FOLDER_PENGUJI_M2D8}/kunci.json`, 'utf8')) as typeof b.kunci & { terbit: boolean };
    expect(kunci.terbit).toBe(h.lolos);
    const folder = `${FOLDER_PENGUJI_M2D8}/jawaban`;
    const p = putusanTayang(kunci.terbit, omonganUjiM2d8(kunci, h), [1, 2, 3].map((n) => bacaJawaban<JawabTebak>('tebak', n, folder)), [1, 2, 3].map((n) => bacaJawaban<JawabKartu>('kartu', n, folder)));
    expect(JSON.parse(readFileSync(`${FOLDER_PENGUJI_M2D8}/putusan.json`, 'utf8'))).toEqual(JSON.parse(JSON.stringify(p)));
    expect(p.layak_tayang).toBe(false);
    expect(JSON.parse(readFileSync(`${FOLDER_PENGUJI_M2D8}/draf-terbaik.json`, 'utf8'))).toEqual(JSON.parse(JSON.stringify(drafTerbaik(h))));
  });
});

