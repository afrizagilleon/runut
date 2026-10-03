/**
 * M2d-16 D-6: bank omongan — satu berkas per omongan yang lolos semua gerbang,
 * per sha paket; penyusun simulasi memilih 3 omongan berkartu-penentu berbeda
 * lalu menjalankan validator seluruh draf.
 */
import { existsSync, mkdtempSync, readdirSync, readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { AKAR } from '../env.ts';
import type { PaketFakta } from '../paket.ts';
import { bacaBank, idOmongan, jumlahSudut, kunciSudut, pilihSimulasi, shaPaketBank, simpanBank, sudutBank, type EntriBank } from './bank.ts';
import { tigaOmonganTirt7 } from './palsu-v3.ts';
import { drafDari, type OmonganBebas } from './skema.ts';

const tirt = JSON.parse(readFileSync(`${AKAR}eval/penyusun/m2d11-tirt-7/paket.json`, 'utf8')) as PaketFakta;
const SHA = shaPaketBank(tirt);
const [o1, o2, o3] = tigaOmonganTirt7();
const folder = (): string => mkdtempSync(join(tmpdir(), 'bank-')).replace(/\\/g, '/');
const entri = (o: OmonganBebas, x: Partial<EntriBank> = {}): EntriBank => ({
  id: idOmongan(o), paket_sha: SHA, kartu_penentu: [...o.kartu_penentu], omongan: o, jejak_gerbang: { kode: { dicatat: [] } },
  asal: { jalan: 'uji-1', putaran: 1, urut: 1, penulis: 'palsu', sha256_prompt: 'x' }, waktu: '2026-10-03T00:00:00.000Z', ...x,
});

describe('bank omongan: simpan & baca', () => {
  it('sha paket = sha paket pintu (TIRT-7 pra-registrasi M2d-13)', () => {
    expect(SHA).toBe('f7cabc6b2c9abca5ceb36d127b279438c9c3586e3c727de76da3a412fb85a45a');
  });

  it('satu berkas per omongan di <bank>/<paket-sha>/<id>.json: draf + jejak gerbang + asal jalan', () => {
    const f = folder();
    const jalur = simpanBank(f, entri(o1, { asal: { jalan: 'm2d17-opus-1', putaran: 2, urut: 3, penulis: 'anthropic/claude-opus-5.5', sha256_prompt: 'abc' } }));
    expect(jalur).toBe(`${f}/${SHA}/${idOmongan(o1)}.json`);
    expect(readdirSync(`${f}/${SHA}`)).toEqual([`${idOmongan(o1)}.json`]);
    const b = bacaBank(f, SHA);
    expect(b).toHaveLength(1);
    expect(b[0]?.omongan).toEqual(o1);
    expect(b[0]?.asal).toEqual({ jalan: 'm2d17-opus-1', putaran: 2, urut: 3, penulis: 'anthropic/claude-opus-5.5', sha256_prompt: 'abc' });
    expect(b[0]?.jejak_gerbang).toEqual({ kode: { dicatat: [] } });
  });

  it('id omongan tidak bergantung urutan medan JSON dari penulis', () => {
    const balik = Object.fromEntries(Object.entries(o1).reverse()) as unknown as OmonganBebas;
    expect(JSON.stringify(balik)).not.toBe(JSON.stringify(o1));
    expect(idOmongan(balik)).toBe(idOmongan(o1));
    expect(idOmongan({ ...o1, nama: 'Lain' })).not.toBe(idOmongan(o1));
  });

  it('bank kosong / paket lain → kosong; omongan yang sama tidak ditulis dua kali (berkas pertama tetap)', () => {
    const f = folder();
    expect(bacaBank(f, SHA)).toEqual([]);
    simpanBank(f, entri(o1, { waktu: '2026-10-03T00:00:00.000Z' }));
    simpanBank(f, entri(o1, { waktu: '2026-10-04T00:00:00.000Z' }));
    expect(bacaBank(f, SHA)).toHaveLength(1);
    expect(bacaBank(f, SHA)[0]?.waktu).toBe('2026-10-03T00:00:00.000Z');
    expect(bacaBank(f, 'f'.repeat(64))).toEqual([]);
    expect(existsSync(`${f}/${'f'.repeat(64)}`)).toBe(false);
  });

  it('entri dengan sha paket lain atau kartu penentu yang tidak sama dengan drafnya ditolak', () => {
    const f = folder();
    expect(() => simpanBank(f, entri(o1, { paket_sha: 'bukan-sha' }))).toThrow(/sha/);
    expect(() => simpanBank(f, entri(o1, { kartu_penentu: ['lain'] }))).toThrow(/kartu penentu/);
  });

  it('sudut bank = kartu penentu unik menurut urutan masuk; omongan bersudut sama disimpan sebagai alternatif', () => {
    const f = folder();
    const kembar: OmonganBebas = { ...o2, nama: 'Wulan', kartu_penentu: [...o1.kartu_penentu] };
    simpanBank(f, entri(o1, { waktu: '2026-10-03T00:00:01.000Z' }));
    simpanBank(f, entri(kembar, { waktu: '2026-10-03T00:00:02.000Z' }));
    simpanBank(f, entri(o3, { waktu: '2026-10-03T00:00:03.000Z' }));
    const b = bacaBank(f, SHA);
    expect(b).toHaveLength(3);
    expect(sudutBank(b)).toEqual([...o1.kartu_penentu, ...o3.kartu_penentu]);
    expect(jumlahSudut(b)).toBe(2);
    expect(kunciSudut(['b', 'a'])).toBe('a+b');
  });
});

describe('penyusun simulasi', () => {
  it('tiga omongan berkartu-penentu berbeda + validator seluruh draf lolos → draf', () => {
    const p = pilihSimulasi([entri(o1), entri(o2), entri(o3)], tirt);
    expect(p.draf?.omongan).toEqual([o1, o2, o3].map(drafDari));
    expect(p.dipilih).toEqual([o1, o2, o3].map(idOmongan));
    expect(p.alasan).toEqual([]);
  });

  it('kurang dari tiga kartu penentu berbeda → tidak ada simulasi (alternatif bersudut sama tidak dihitung dua kali)', () => {
    const kembar: OmonganBebas = { ...o2, nama: 'Wulan', kartu_penentu: [...o1.kartu_penentu] };
    const p = pilihSimulasi([entri(o1), entri(kembar), entri(o3)], tirt);
    expect(p.draf).toBeNull();
    expect(p.alasan[0]).toMatch(/2 kartu penentu berbeda/);
  });

  it('satu omongan per kartu penentu: alternatif dipakai bila kombinasi pertama gagal validator seluruh draf', () => {
    // o1b bersudut sama dengan o1 tetapi bernama sama dengan o2 → kombinasi (o1b, o2, o3) gagal validator (nama kembar)
    const o1b: OmonganBebas = { ...o1, nama: o2.nama };
    const p = pilihSimulasi([entri(o1b, { waktu: '2026-10-03T00:00:00.000Z' }), entri(o1, { waktu: '2026-10-03T00:00:01.000Z' }), entri(o2), entri(o3)], tirt);
    expect(p.draf).not.toBeNull();
    expect(p.dipilih).toEqual([o1, o2, o3].map(idOmongan));
    expect(p.dicoba).toBe(2);
  });

  it('semua kombinasi gagal validator seluruh draf → tidak terbit, alasan validator dilaporkan', () => {
    const p = pilihSimulasi([entri({ ...o1, nama: o2.nama }), entri(o2), entri(o3)], tirt);
    expect(p.draf).toBeNull();
    expect(p.alasan.join(' ')).toMatch(/validator seluruh draf/);
  });

  it('dua omongan yang kartu penentunya beririsan tidak dipasang bersama', () => {
    const iris: OmonganBebas = { ...o2, kartu_penentu: [...o2.kartu_penentu, ...o1.kartu_penentu] };
    expect(pilihSimulasi([entri(o1), entri(iris), entri(o3)], tirt).draf).toBeNull();
  });
});
