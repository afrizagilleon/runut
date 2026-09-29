/**
 * M2d-7 T-09: laporan = hasil skrip dari keluaran mentah (bukan tulisan
 * tangan); peran.md bagian M2d-7 = angka kode.
 */
import { existsSync, readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { AKAR } from './env.ts';
import { JALUR_LEDGER } from './pagu.ts';
import { PENALAR_M2D7 } from './penalaran.ts';
import { JALUR_LAPORAN_M2D7, bacaLedger, bangunLaporan, peranM2d7 } from './pengecoh-laporan.ts';

describe('laporan M2d-7', () => {
  it('peran dari tag ledger', () => {
    expect(peranM2d7('m2d7/probe/kritikus/o1')).toBe('probe');
    expect(peranM2d7('m2d7/kalibrasi/m2d4-tirt-o1/penebak/t1')).toBe('kalibrasi (penebak)');
    expect(peranM2d7('m2d7/kalibrasi/manusia-x/pilihan-saja/t2')).toBe('kalibrasi (pilihan-saja)');
    expect(peranM2d7('m2d7/jalan-1/tirt/p3/tulis-pilihan/o2')).toBe('penulis (pilihan)');
    expect(peranM2d7('m2d7/jalan-1/tirt/p3/gerbang-pilihan-saja/o2/t1')).toBe('pilihan-saja');
    expect(peranM2d7('m2d7/jalan-2/tirt/p1/gerbang-tebak/o1/t3/u1')).toBe('penebak');
    expect(peranM2d7('m2d7/jalan-1/tirt/p1/kritikus/o1')).toBe('kritikus');
  });

  it.runIf(existsSync(JALUR_LEDGER))('docs/bukti/lingkar-agen-pengecoh.md = keluaran `npm run pengecoh:laporan`', () => {
    const md = readFileSync(JALUR_LAPORAN_M2D7, 'utf8');
    expect(md).toBe(bangunLaporan(bacaLedger()).md);
  });

  it('peran.md bagian M2d-7 menyebut angka penalar dari kode', () => {
    const md = readFileSync(`${AKAR}factory/llm/peran.md`, 'utf8');
    const b = md.slice(md.indexOf('## Generasi M2d-7'));
    expect(b).toContain(`\`max_tokens\` ${PENALAR_M2D7.kritikus.maxTokens.toLocaleString('id-ID')}, ambang ${PENALAR_M2D7.kritikus.ambang.toLocaleString('id-ID')}`);
    expect(b).toContain(`\`max_tokens\` ${PENALAR_M2D7.penebakGlm.maxTokens.toLocaleString('id-ID')}, ambang ${String(PENALAR_M2D7.penebakGlm.ambang)}`);
    expect(b).toContain(`effort: "${PENALAR_M2D7.kritikus.effort}"`);
  });
});
