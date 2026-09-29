/**
 * M2d-7 T-07: jalankan TIRT (D-7) — paling banyak dua jalan, jalan 2 hanya
 * bila jalan 1 tidak terbit (pra-registrasi D-0), tag ledger di bawah m2d7/.
 */
import { mkdirSync, mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { bolehJalan, tagPengecoh } from './pengecoh-susun.ts';

describe('jalan TIRT M2d-7', () => {
  it('tag: m2d7/jalan-<n>/tirt/p<putaran>/<jenis>/o<no>[/t<ke>][/u<ulang>]', () => {
    expect(tagPengecoh(1, { jenis: 'tulis-pesan', putaran: 2, omongan: 3, ke: 1 })).toBe('m2d7/jalan-1/tirt/p2/tulis-pesan/o3');
    expect(tagPengecoh(2, { jenis: 'gerbang-pilihan-saja', putaran: 1, omongan: 1, ke: 2 })).toBe('m2d7/jalan-2/tirt/p1/gerbang-pilihan-saja/o1/t2');
    expect(tagPengecoh(1, { jenis: 'kritikus', putaran: 4, omongan: 2, ke: 1, ulang: 1 })).toBe('m2d7/jalan-1/tirt/p4/kritikus/o2/u1');
  });

  it('jalan 2 hanya sesudah jalan 1 selesai dan TIDAK terbit; tidak lebih dari dua; tidak diulang', () => {
    const akar = mkdtempSync(join(tmpdir(), 'm2d7-jalan-'));
    const f = (n: number): string => join(akar, `jalan-${String(n)}`);
    expect(bolehJalan(1, f)).toBeNull();
    expect(bolehJalan(3, f)).toMatch(/paling banyak 2/);
    expect(bolehJalan(2, f)).toMatch(/sesudah jalan 1 selesai/);
    mkdirSync(f(1), { recursive: true });
    writeFileSync(join(f(1), 'jejak-agen.json'), '{}');
    expect(bolehJalan(1, f)).toMatch(/tidak diulang/);
    writeFileSync(join(f(1), 'draf-akhir.json'), JSON.stringify({ terbit: true }));
    expect(bolehJalan(2, f)).toMatch(/sudah terbit/);
    writeFileSync(join(f(1), 'draf-akhir.json'), JSON.stringify({ terbit: false }));
    expect(bolehJalan(2, f)).toBeNull();
  });
});
