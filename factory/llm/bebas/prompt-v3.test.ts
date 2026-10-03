/**
 * M2d-16 D-5: prompt penulis v3 (berkas reviewer, disalin apa adanya) + teladan
 * DADA s3 dalam skema keluaran penuh. v1 & v2 tidak berubah.
 */
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { AKAR } from '../env.ts';
import { paketDariKasus } from '../kalibrasi-soal.ts';
import type { PaketFakta } from '../paket.ts';
import { periksaKodeBebas } from './mesin.ts';
import { beriLabel, drafTirt7 } from './palsu.ts';
import { promptPenulisBebas, promptPenulisOpusV2, sha256, teksPaket } from './prompt.ts';
import {
  kalimatSudut, PENGECUALIAN_TELADAN, periksaKodeV3, periksaSalinTeladan, pesanTulisUlangV3, pesanV3, promptPenulisV3, SHA256_PROMPT_V3, teksPromptV3, teladanV3, teksTeladanV3, uraiKeluaranV3,
} from './prompt-v3.ts';
import type { OmonganBebas } from './skema.ts';

const tirt = JSON.parse(readFileSync(`${AKAR}eval/penyusun/m2d11-tirt-7/paket.json`, 'utf8')) as PaketFakta;
const dada = paketDariKasus('dada-2025-10-08');
const kasus = JSON.parse(readFileSync(`${AKAR}cases/dada-2025-10-08.json`, 'utf8')) as { soal: Array<{ soal_id: string; penjelasan: string; pilihan: Array<{ kunci: string; teks: string }>; pesan: { isi: string } }> };
const s3 = kasus.soal.find((s) => s.soal_id === 's3-siapa-yang-menjual');

describe('berkas prompt v3', () => {
  it('salinan apa adanya dari berkas reviewer (sha256 tetap); v1 dan v2 tidak berubah', () => {
    expect(sha256(teksPromptV3())).toBe(SHA256_PROMPT_V3);
    expect(SHA256_PROMPT_V3).toBe('fb895a8a6450a289df71d757fadfc42df975b6eabae3235257e2e28cc5c1874f');
    const h = JSON.parse(readFileSync(`${AKAR}eval/penyusun/m2d13-opus-2/hasil.json`, 'utf8')) as { sha256_prompt_sistem: string };
    expect(sha256(promptPenulisBebas(tirt))).toBe(h.sha256_prompt_sistem);
    const h3 = JSON.parse(readFileSync(`${AKAR}eval/penyusun/m2d15-opus-3/hasil.json`, 'utf8')) as { sha256_prompt_sistem: string };
    expect(sha256(promptPenulisOpusV2(tirt))).toBe(h3.sha256_prompt_sistem);
  });

  it('empat isian saja: {PAKET}, {JUMLAH}, {SUDUT_TERPAKAI}, {TELADAN}', () => {
    expect([...teksPromptV3().matchAll(/\{[A-Z_]+\}/g)].map((m) => m[0])).toEqual(['{PAKET}', '{JUMLAH}', '{SUDUT_TERPAKAI}', '{TELADAN}']);
  });
});

describe('teladan (DADA s3, berkas reviewer)', () => {
  const t = teladanV3();
  it('pilihan dan penjelasan = soal tayang apa adanya; pesan = soal tayang tanpa kalimat pembuka berangka', () => {
    expect(['a', 'b', 'c', 'd'].map((h) => t.pilihan[h as 'a'])).toEqual(s3?.pilihan.map((p) => p.teks));
    expect(t.penjelasan).toBe(s3?.penjelasan);
    expect(`Harganya udah Rp178 lho. ${t.pesan}`).toBe(s3?.pesan.isi);
    expect(t.angka_pesan).toEqual([]);
  });

  it('LOLOS periksaKodeBebas terhadap paket DADA dengan TEPAT dua pengecualian (NAMA_TERLARANG, anti-salin)', () => {
    expect(PENGECUALIAN_TELADAN).toEqual(['pemeriksa: NAMA_TERLARANG', 'anti-salin']);
    const k = periksaKodeBebas(1, t, dada, [t], new Set());
    const sumber = [...new Set(k.menolak.map((m) => m.sumber))].sort();
    // kedua pengecualian memang menyala (soal tayang itu sendiri) — dan tidak ada penolakan lain
    expect(sumber).toEqual(['anti-salin', 'pemeriksa: NAMA_TERLARANG']);
    expect(k.menolak.filter((m) => !PENGECUALIAN_TELADAN.includes(m.sumber))).toEqual([]);
  });

  it('dirender dalam skema keluaran penuh: {"omongan": [ … ]} dengan rujukan [[fact_id|teks]], label pengecoh, umpan balik, pertanyaan cek', () => {
    const teks = teksTeladanV3();
    const u = uraiKeluaranV3(teks, 1);
    expect(u.masalah).toEqual([]);
    expect(u.omongan[0]).toEqual(t);
    expect(teks).toContain('[[fil-2025-08-25-03|70 juta]]');
    expect(Object.keys(t.pengecoh).sort()).toEqual(['a', 'b', 'd']);
    expect(t.pengecoh.d?.jenis).toBe('sebagian-benar');
    expect(t.pertanyaan_cek).toBe('Laporan ini mencatat pembelian atau penjualan?');
    expect(teks).not.toContain('catatan');
  });
});

describe('promptPenulisV3', () => {
  it('SATU pesan pengguna, tanpa pesan sistem; semua isian terisi; paket = teks paket yang sama dengan v1/v2', () => {
    const p = pesanV3(tirt, 3, []);
    expect(p).toHaveLength(1);
    expect(p[0]?.role).toBe('user');
    expect(p[0]?.content).toBe(promptPenulisV3(tirt, 3, []));
    expect(p[0]?.content).not.toMatch(/\{(PAKET|JUMLAH|SUDUT_TERPAKAI|TELADAN)\}/);
    expect(p[0]?.content).toContain('Tulis 3 omongan. Tiap omongan memakai kartu penentu yang berbeda.\n');
    expect(p[0]?.content).toContain('PAKET FAKTA (');
    expect(p[0]?.content).toContain(teksTeladanV3());
    for (const f of tirt.fakta) expect(p[0]?.content).toContain(f.fact_id);
  });

  it('tidak menambah aturan: prompt = berkas reviewer dengan empat isian diganti, tidak lebih', () => {
    const [a, b, c, d, e] = teksPromptV3().split(/\{(?:PAKET|JUMLAH|SUDUT_TERPAKAI|TELADAN)\}/);
    const p = promptPenulisV3(tirt, 2, ['susp-2025-01-21']);
    expect(p.startsWith(a as string)).toBe(true);
    expect(p.endsWith((e as string).trimEnd())).toBe(true);
    expect((e as string).trimEnd()).toContain('Balas hanya dengan JSON');
    for (const bagian of [b, c, d]) expect(p).toContain(bagian);
    // v2: prompt sistem + paket di pesan pengguna; v3: semuanya dalam satu pesan — kurang dari separuhnya
    expect(p.length).toBeLessThan((promptPenulisOpusV2(tirt).length + teksPaket(tirt).length) / 2);
  });

  it('{SUDUT_TERPAKAI}: kosong bila bank kosong; satu kalimat pendek berisi kartu penentu bank bila ada', () => {
    expect(kalimatSudut([])).toBe('');
    expect(kalimatSudut(['susp-2025-01-21', 'harga-2025-12-09'])).toBe(' Kartu penentu yang sudah dipakai: susp-2025-01-21, harga-2025-12-09.');
    expect(promptPenulisV3(tirt, 1, ['susp-2025-01-21'])).toContain('Tulis 1 omongan. Tiap omongan memakai kartu penentu yang berbeda. Kartu penentu yang sudah dipakai: susp-2025-01-21.\n');
  });

  it('jumlah harus 1–3', () => {
    expect(() => promptPenulisV3(tirt, 0, [])).toThrow();
    expect(() => promptPenulisV3(tirt, 4, [])).toThrow();
  });
});

describe('tulis ulang (tanpa keadaan): satu pesan pengguna baru', () => {
  const [o1, o2] = drafTirt7();
  const d1 = beriLabel(o1);
  const d2 = beriLabel(o2);
  it('= prompt v3 yang sama dengan {JUMLAH} = jumlah butir, lalu "Draf sebelumnya" (JSON) dan "Belum bisa dipakai karena" (alasan gerbang apa adanya)', () => {
    const alasan1 = ['M2d-13: angka-di-kartu: pesan: "Rp89" tidak ada di kartu omongan ini', 'detektor D6 (kata absolut; pilihan): kata absolut hanya di kunci: cuma; opsi a'];
    const alasan2 = ['penebak kuat (tanpa kartu, pilihan diputar): memilih isi kunci di 4 dari 4 rotasi terbaca — jawabannya bisa ditebak tanpa membaca kartu'];
    const p = pesanTulisUlangV3(tirt, ['harga-2025-12-09'], [{ omongan: d1, alasan: alasan1 }, { omongan: d2, alasan: alasan2 }]);
    expect(p).toHaveLength(1);
    expect(p[0]?.role).toBe('user');
    const isi = p[0]?.content ?? '';
    const dasar = promptPenulisV3(tirt, 2, ['harga-2025-12-09']);
    expect(isi.startsWith(`${dasar}\n\n`)).toBe(true);
    expect(isi.slice(dasar.length)).toBe(
      ['', '', 'Draf sebelumnya:', JSON.stringify(d1), '', 'Belum bisa dipakai karena:', ...alasan1.map((a) => `- ${a}`), '', 'Draf sebelumnya:', JSON.stringify(d2), '', 'Belum bisa dipakai karena:', ...alasan2.map((a) => `- ${a}`)].join('\n'),
    );
  });
  it('tanpa butir ditolak → galat (pakai pesanV3)', () => {
    expect(() => pesanTulisUlangV3(tirt, [], [])).toThrow();
  });
});

describe('pemeriksaan kode v3 untuk KELUARAN penulis', () => {
  it('= periksaKodeBebas satu-per-satu + anti-salin teladan; teladan sendiri tertangkap anti-salin teladan', () => {
    const t = teladanV3();
    expect(periksaSalinTeladan(t).length).toBeGreaterThan(0);
    const k = periksaKodeV3(t, dada);
    expect(k.menolak.some((m) => m.sumber === 'anti-salin teladan')).toBe(true);
  });

  it('teks teladan yang BUKAN dari soal tayang (umpan balik, pertanyaan cek reviewer) ikut dijaga', () => {
    const [o1] = drafTirt7();
    const d: OmonganBebas = { ...beriLabel(o1), pertanyaan_cek: 'Laporan ini mencatat pembelian atau penjualan?' };
    const m = periksaSalinTeladan(d);
    expect(m.some((x) => x.startsWith('pertanyaan cek menyalin teladan'))).toBe(true);
    expect(periksaSalinTeladan(beriLabel(o1))).toEqual([]);
  });

  it('omongan dinilai SENDIRI: tidak ada penolakan sudut/G-mirip antar omongan', () => {
    const [o1] = drafTirt7();
    const d = beriLabel(o1);
    const sendiri = periksaKodeV3(d, tirt).menolak.map((m) => m.sumber);
    expect(sendiri.some((s) => s.includes('sudut') || s.includes('G-mirip'))).toBe(false);
    expect(periksaKodeV3(d, tirt).menolak.filter((m) => m.sumber !== 'anti-salin teladan')).toEqual(periksaKodeBebas(1, d, tirt, [d], new Set()).menolak);
  });
});

describe('uraiKeluaranV3', () => {
  const [o1, o2] = drafTirt7();
  it('{"omongan": [...]} → daftar omongan; paling banyak sejumlah yang diminta; butir rusak dilaporkan', () => {
    const teks = JSON.stringify({ omongan: [beriLabel(o1), { nama: 'x' }, beriLabel(o2)] });
    const u = uraiKeluaranV3(teks, 3);
    expect(u.omongan).toHaveLength(2);
    expect(u.masalah).toHaveLength(1);
    expect(uraiKeluaranV3(teks, 1).omongan).toHaveLength(1);
    expect(uraiKeluaranV3('bukan json', 3)).toMatchObject({ omongan: [] });
    expect(uraiKeluaranV3('', 3).masalah.length).toBeGreaterThan(0);
  });
});
