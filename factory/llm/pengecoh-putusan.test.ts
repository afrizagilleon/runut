/**
 * M2d-7 T-08: putusan MEKANIS terhadap pra-registrasi D-0.
 *
 * Kegagalan yang dijaga (kontrak §0): patokan tayang disetel sesudah melihat
 * hasil. Kode putusan dites SAMA dengan teks pra-registrasi yang di-commit
 * sebelum panggilan berbayar pertama (petunjuk kartu, daftar "kosong",
 * proporsi manusia 2/6, mayoritas 2 dari 3), dan berkas pra-registrasi dites
 * tidak berubah sejak commit T-00.
 */
import { execFileSync } from 'node:child_process';
import { mkdirSync, mkdtempSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { AKAR } from './env.ts';
import {
  JALUR_PRAREGISTRASI,
  KOSONG,
  MANUSIA_LOLOS,
  MAYORITAS_MAKNA,
  PETUNJUK_KARTU_M2D7,
  drafDiuji,
  putusanTayang,
  tidakKosong,
  type JawabKartu,
  type JawabTebak,
  type OmonganUji,
} from './pengecoh-putusan.ts';
import { TULISAN } from './bantu-uji-tulisan.ts';

const doc = readFileSync(JALUR_PRAREGISTRASI, 'utf8').replace(/\r\n/g, '\n');

describe('kode putusan = pra-registrasi', () => {
  it('berkas pra-registrasi tidak berubah sejak commit T-00 (dibekukan)', () => {
    const t00 = execFileSync('git', ['log', '--format=%H', '--diff-filter=A', '--', 'docs/bukti/m2d7-praregistrasi.md'], { cwd: AKAR, encoding: 'utf8' }).trim().split('\n').at(-1) ?? '';
    expect(t00).toMatch(/^[0-9a-f]{40}$/);
    const asli = execFileSync('git', ['show', `${t00}:docs/bukti/m2d7-praregistrasi.md`], { cwd: AKAR, encoding: 'utf8' }).replace(/\r\n/g, '\n');
    expect(doc).toBe(asli);
  });

  it('petunjuk penguji kartu = blok petunjuk di pra-registrasi, persis', () => {
    const blok = /## Petunjuk penguji kartu[^\n]*\n\n```\n([\s\S]*?)\n```/.exec(doc)?.[1];
    expect(blok).toBe(PETUNJUK_KARTU_M2D7);
  });

  it('angka patokan = pra-registrasi: 2/6 manusia, ≥ 1 dari 3, mayoritas ≥ 2 dari 3, daftar kosong', () => {
    expect(MANUSIA_LOLOS).toEqual({ lolos: 2, total: 6 });
    expect(doc).toContain('**≥ proporsi soal manusia yang lolos, 2/6**');
    expect(doc).toContain('**≥ 1 dari 3**');
    expect(MAYORITAS_MAKNA).toBe(2);
    expect(doc).toContain('penguji kartu (≥ 2 dari 3 menjawab tidak kosong)');
    for (const k of KOSONG) expect(doc).toContain(`\`"${k}"\``);
  });
});

const o = (no: number): OmonganUji => ({
  no, kunci: 'c', id_tebak: `Q${String(no)}`, id_kartu: `Q${String(no)}`, penentu: [1],
  omongan: { nama: 'A', jam: '19.00', pesan: TULISAN[1]?.pesan.pesan ?? '', angka_pesan: [], kartu: [], kartu_penentu: [], pilihan: { a: 'Betul, satu.', b: 'Keliru, dua hal.', c: 'Keliru, tiga lain.', d: 'Betul, empat beda.' }, kunci: 'c', penjelasan: '' },
});
const tb = (id: string, pilihan: string, yakin = 50): JawabTebak => ({ id, pilihan, yakin });
const kt = (id: string, x: Partial<JawabKartu> = {}): JawabKartu => ({ id, pilihan: 'c', kartu: [1], bingung: '', penilaian: '', kunci_lain: '', tak_tercek: '', kembar: '', ...x });

function jalan(tebakBenar: number[], kartu?: JawabKartu[][], terbit = true): ReturnType<typeof putusanTayang> {
  const uji = [1, 2, 3].map(o);
  // tebakBenar[i] = berapa penguji menebak benar omongan i+1 (yakin 30).
  const tebak = [0, 1, 2].map((p) => uji.map((u, i) => tb(u.id_tebak, p < (tebakBenar[i] ?? 0) ? 'c' : 'a', 30)));
  const k = kartu ?? [0, 1, 2].map(() => uji.map((u) => kt(u.id_kartu)));
  return putusanTayang(terbit, uji, tebak, k);
}

describe('putusan mekanis', () => {
  it('(b) ≥ 1 dari 3 omongan lolos tebak buta = setara manusia 2/6', () => {
    expect(jalan([3, 3, 1]).b_tebak).toMatchObject({ lolos: 1, total: 3, terpenuhi: true });
    expect(jalan([3, 3, 2]).b_tebak).toMatchObject({ lolos: 0, terpenuhi: false });
    expect(jalan([3, 3, 1]).layak_tayang).toBe(true);
    // K-05 luar: satu benar tetapi yakin ≥ 40 = tidak lolos.
    const uji = [1, 2, 3].map(o);
    const yakin = [0, 1, 2].map((pi) => uji.map((u) => tb(u.id_tebak, pi === 0 ? 'c' : 'a', 45)));
    expect(putusanTayang(true, uji, yakin, [0, 1, 2].map(() => uji.map((u) => kt(u.id_kartu)))).b_tebak.lolos).toBe(0);
  });

  it('tanpa omongan yang diuji: (b)(c)(d) tidak terpenuhi, TIDAK', () => {
    const p = putusanTayang(false, [], [], []);
    expect(p).toMatchObject({ layak_tayang: false, b_tebak: { total: 0, terpenuhi: false }, c_kartu: { terpenuhi: false }, d_makna: { terpenuhi: false } });
  });

  it('(a) tidak terbit → TIDAK, walau syarat lain terpenuhi', () => {
    const p = jalan([0, 0, 0], undefined, false);
    expect(p.b_tebak.terpenuhi && p.c_kartu.terpenuhi && p.d_makna.terpenuhi).toBe(true);
    expect(p.layak_tayang).toBe(false);
  });

  it('(c) satu omongan gagal K-05 kartu → TIDAK', () => {
    const k = [0, 1, 2].map((pi) => [1, 2, 3].map((no) => kt(`Q${String(no)}`, no === 2 && pi === 0 ? { pilihan: 'a' } : {})));
    const p = jalan([0, 0, 0], k);
    expect(p.c_kartu).toMatchObject({ lolos: 2, terpenuhi: false });
    expect(p.layak_tayang).toBe(false);
  });

  it('(d) masalah makna: ≥ 2 dari 3 penguji pada butir yang sama; satu penguji saja tidak cukup; "tidak ada" = kosong', () => {
    const satu = [0, 1, 2].map((pi) => [1, 2, 3].map((no) => kt(`Q${String(no)}`, pi === 0 && no === 1 ? { tak_tercek: 'aku panik' } : { tak_tercek: 'tidak ada' })));
    expect(jalan([0, 0, 0], satu).d_makna.terpenuhi).toBe(true);
    const dua = [0, 1, 2].map((pi) => [1, 2, 3].map((no) => kt(`Q${String(no)}`, pi < 2 && no === 1 ? { kunci_lain: 'b' } : {})));
    const p = jalan([0, 0, 0], dua);
    expect(p.d_makna.terpenuhi).toBe(false);
    expect(p.omongan[0]?.masalah.map((m) => m.butir)).toEqual(['M1 kunci tunggal']);
    expect(tidakKosong('Tidak ada')).toBe(false);
    expect(tidakKosong(' - ')).toBe(false);
    expect(tidakKosong('a,c')).toBe(true);
  });
});

describe('draf yang diuji (pra-registrasi)', () => {
  it('jalan PERTAMA yang terbit; bila tidak ada, jalan TERAKHIR', () => {
    const akar = mkdtempSync(join(tmpdir(), 'm2d7-uji-'));
    const f = (n: number): string => join(akar, `jalan-${String(n)}`, 'tirt');
    const tulis = (n: number, terbit: boolean): void => {
      mkdirSync(f(n), { recursive: true });
      writeFileSync(join(f(n), 'draf-akhir.json'), JSON.stringify({ terbit }));
    };
    expect(drafDiuji(f)).toBeNull();
    tulis(1, false);
    expect(drafDiuji(f)).toMatchObject({ jalan: 1, terbit: false });
    tulis(2, false);
    expect(drafDiuji(f)).toMatchObject({ jalan: 2, terbit: false });
    tulis(1, true);
    expect(drafDiuji(f)).toMatchObject({ jalan: 1, terbit: true });
  });
});
