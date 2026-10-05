/** M2d-28: replay percobaan agent dari rekaman, tanpa jaringan. */
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { AKAR } from '../../factory/llm/env.ts';
import { bacaJejak, ID_BAWAAN, rincianAlat, susunReplay } from './putar-ulang.ts';

const folder = `${AKAR}eval/penyusun/${ID_BAWAAN}`;

describe('replay percobaan AMAG dari kode saham', () => {
  const blok = susunReplay(bacaJejak(folder));
  const teks = blok.flat().join('\n');
  it('urutan nyata: agent memilih usulkan_hari, lalu periksa_saham, lalu menulis dan mengajukan', () => {
    const pilih = blok.flat().filter((b) => b.includes('memilih tool:')).map((b) => b.replace(/^.*memilih tool: /, ''));
    expect(pilih[0]).toBe('usulkan_hari');
    expect(pilih[1]).toContain('periksa_saham');
    expect(pilih.some((p) => p.includes('ajukan'))).toBe(true);
  });
  it('tool result memuat hari yang diusulkan, laporan aturan R, dan alasan penolakan', () => {
    expect(teks).toMatch(/2026-06-15 · .* · 17 kartu lolos/);
    expect(teks).toMatch(/aturan R: 15 dijalankan, 22 tidak berlaku/);
    expect(teks).toMatch(/penolakan: saringan tebak/);
    expect(teks).toMatch(/lolos → bank \(3\/3\)/);
  });
  it('jumlah langkah dan biaya agent cocok dengan hasil.json', () => {
    const hasil = JSON.parse(readFileSync(`${folder}/hasil.json`, 'utf8')) as { panggilan_model: number; biaya_agen_usd: number };
    const langkah = blok.filter((b) => b[0]?.startsWith('AGENT'));
    expect(langkah).toHaveLength(hasil.panggilan_model);
    expect(langkah.at(-1)?.[0]).toContain(`total agent US$${hasil.biaya_agen_usd.toFixed(4)}`);
  });
  it('tidak memuat nama emiten atau kode saham asli di tool result data', () => {
    const data = blok.flat().filter((b) => /usulkan_hari|periksa_saham|kartu lolos|aturan R|disingkirkan/.test(b)).join('\n');
    expect(data).not.toMatch(/AMAG|Asuransi Multi/);
  });
});

describe('rincian tool result', () => {
  it('hasil kosong atau bukan objek → tanpa rincian', () => {
    expect(rincianAlat({ jenis: 'alat', alat: 'lihat_fakta', hasil: null })).toEqual([]);
    expect(rincianAlat({ jenis: 'alat', alat: 'ajukan', hasil: { penolakan: ['a'], catatan: [], biaya_pengajuan_usd: 0.05, sisa_anggaran_usd: 1 } })).toEqual(['penolakan: a', 'biaya pengujian US$0.0500, sisa budget US$1.0000']);
  });
});
