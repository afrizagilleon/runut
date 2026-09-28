/**
 * M2d-2 T-06: bahan penguji eksternal, dibangun dari keluaran lingkar yang
 * terlacak (`eval/keluaran-m2d2/`).
 *
 * Dijaga: bahan tebak buta tidak memuat kartu, fact_id, kunci, atau penjelasan;
 * bahan kartu memuat kartu tetapi tidak kunci/penjelasan; label kealamian
 * tidak menyebut sumbernya; dibangun ulang identik (benih tetap) — jadi teks
 * yang dikirim ke subagent bisa diperiksa siapa pun lewat sha256-nya.
 */
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { bacaPaketM2d2, bacaRiwayat, bangunBahan, omonganLolos } from './agen-penguji.ts';
import { URUTAN_AGEN } from './agen-susun.ts';
import { AKAR } from './env.ts';

const bahan = bangunBahan();
const lolos = URUTAN_AGEN.flatMap((p) => {
  const h = bacaRiwayat(p);
  return h === null ? [] : omonganLolos(p, h);
});
const faktaSemua = URUTAN_AGEN.flatMap((p) => bacaPaketM2d2(p).fakta);
const sha = (t: string): string => createHash('sha256').update(t, 'utf8').digest('hex');

describe('bahan penguji eksternal (D-6)', () => {
  it('memuat setiap omongan yang dikunci lingkar, sekali di tebak dan sekali di kartu', () => {
    expect(lolos.length).toBeGreaterThan(0);
    expect(bahan.kunci.tebak).toHaveLength(lolos.length);
    expect(bahan.kunci.kartu).toHaveLength(lolos.length);
    for (const l of lolos) {
      const pesan = l.omongan.pesan.replace(/\[\[[^\]|]+\|([^\]]*)\]\]/g, '$1');
      expect(bahan.tebak.split(pesan)).toHaveLength(2);
      expect(bahan.kartu.split(pesan)).toHaveLength(2);
    }
  });

  it('tebak buta: tanpa kartu, fact_id, kunci, atau penjelasan', () => {
    for (const f of faktaSemua) {
      expect(bahan.tebak).not.toContain(f.fact_id);
      expect(bahan.tebak).not.toContain(f.klaim);
    }
    expect(bahan.tebak).not.toMatch(/Salah-kaprah|Kartu \d|kunci|penjelasan/i);
    expect(bahan.tebak).not.toContain('[[');
  });

  it('jawab dengan kartu: kartu omongan itu ada, kunci dan penjelasan tidak', () => {
    for (const l of lolos) {
      const p = bacaPaketM2d2(l.paket);
      for (const id of l.omongan.kartu) {
        const f = p.fakta.find((x) => x.fact_id === id);
        expect(bahan.kartu).toContain(f?.klaim ?? 'TIDAK ADA');
      }
    }
    for (const f of faktaSemua) expect(bahan.kartu).not.toContain(`${f.fact_id} `);
    expect(bahan.kartu).not.toMatch(/Salah-kaprah|kunci:|penjelasan:/i);
    // Kartu penentu tercatat di kunci, bukan di bahan.
    for (const k of bahan.kunci.kartu) expect(k.penentu.length).toBeGreaterThan(0);
  });

  it('kealamian: label huruf saja; sumber hanya di kunci', () => {
    expect(bahan.alami).not.toMatch(/agen-m2d2|m2d1|deepseek|manusia|GLM/i);
    const sumber = bahan.kunci.alami.flatMap((k) => Object.values(k.label));
    expect(sumber).toContain('agen-m2d2');
    expect(sumber).toContain('m2d1-deepseek');
  });

  it('dibangun ulang identik dengan berkas yang dikirim ke subagent', () => {
    const berkas = (n: string): string => readFileSync(`${AKAR}eval/keluaran-m2d2/penguji/${n}`, 'utf8');
    expect(sha(bahan.tebak)).toBe(sha(berkas('tebak.md')));
    expect(sha(bahan.kartu)).toBe(sha(berkas('kartu.md')));
    expect(sha(bahan.alami)).toBe(sha(berkas('alami.md')));
    expect(sha(JSON.stringify(bahan.kunci, null, 2) + '\n')).toBe(sha(berkas('kunci.json')));
  });
});
