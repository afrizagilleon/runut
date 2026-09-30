/**
 * M2d-8 T-00: himpunan kalibrasi beku (pra-registrasi §1) dan gerbang kode
 * per soal (§2), termasuk pernyataan §6 ("yang sudah diketahui").
 */
import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { AKAR } from './env.ts';
import { gArtefak } from './gerbang-artefak.ts';
import { BERKAS_MANUSIA, KODE_PELINDUNG, angkaPesanManusia, gerbangKode, himpunanBeku, kataPenilaian, paketDariKasus, soalManusiaM2d8 } from './kalibrasi-soal.ts';

const PRAREG = readFileSync(`${AKAR}docs/bukti/m2d8-praregistrasi.md`, 'utf8').replace(/\r\n/g, '\n');

describe('himpunan beku (pra-registrasi §1)', () => {
  it('6 manusia → 4 bocor → 6 aman → 2 tambahan, dalam urutan jalan', () => {
    const h = himpunanBeku();
    expect(h.map((s) => `${s.kelompok}${s.tambahan ? '+' : ''}`)).toEqual([
      ...Array(6).fill('manusia'), ...Array(4).fill('bocor'), ...Array(6).fill('aman'), 'bocor+', 'aman+',
    ]);
    expect(h.slice(0, 6).map((s) => s.id)).toEqual([
      'dada-s1-kata-bursa', 'dada-s2-dividen-pemilik-kecil', 'dada-s3-siapa-yang-menjual', 'ultj-turun-di-tanggal-ex', 'ultj-riwayat-dividen', 'ultj-siapa-yang-membeli',
    ]);
    for (const s of h.slice(6)) expect(PRAREG).toContain(s.tambahan ? 'TIRT M2d-6' : `\`${s.id}\``);
  });

  it('soal manusia = teks tayang di commit ad0bf21 (blob dicatat di pra-registrasi)', () => {
    for (const b of BERKAS_MANUSIA) {
      const blob = execFileSync('git', ['rev-parse', `ad0bf21:cases/${b}.json`], { cwd: AKAR, encoding: 'utf8' }).trim();
      expect(PRAREG).toContain(blob);
      const asli = JSON.parse(execFileSync('git', ['show', `ad0bf21:cases/${b}.json`], { cwd: AKAR, encoding: 'utf8' })) as { soal: Array<{ pesan: { isi: string }; jawaban: string }> };
      const kini = soalManusiaM2d8().filter((s) => s.id.startsWith(b.slice(0, 4)));
      expect(kini.map((s) => [s.omongan.pesan, s.omongan.kunci])).toEqual(asli.soal.map((s) => [s.pesan.isi, s.jawaban]));
    }
  });

  it('paket kasus: kartu dan rujukan soal manusia ada di fakta kasus; kalimat kartu = klaim fakta kasus', () => {
    for (const s of soalManusiaM2d8()) {
      for (const id of s.omongan.kartu) expect(s.paket.fakta.some((f) => f.fact_id === id), id).toBe(true);
    }
    const p = paketDariKasus('dada-2025-10-08');
    expect(p.fakta.find((f) => f.fact_id === 'susp-2025-06-30')?.klaim).toContain('laporan keuangan');
  });

  it('angka pesan dipetakan ke fakta (kartu dulu), yang tak berjejak jadi andaian', () => {
    const p = paketDariKasus('ultj-2026-05-04');
    expect(angkaPesanManusia('Saham U dibuka anjlok Rp145, padahal dividennya Rp45.', ['div-2026-05-04', 'turun-2026-05-04'], p)).toEqual([
      { teks: 'Rp145', fact_id: 'turun-2026-05-04' },
      { teks: 'Rp45', fact_id: 'div-2025-05-15' },
    ]);
    expect(angkaPesanManusia('katanya naik Rp9.999.999', ['div-2026-05-04'], p)).toEqual([{ teks: 'Rp9.999.999', andaian: true }]);
  });
});

describe('gerbang kode per soal (pra-registrasi §2, §6)', () => {
  const kode = (id: string): string[] => {
    const s = himpunanBeku().find((x) => x.id === id);
    if (s === undefined) throw new Error(id);
    return [...new Set(gerbangKode(s.omongan, s.paket).map((b) => b.kode))].sort();
  };

  it('§6: butir kode atas keenam soal manusia persis seperti yang ditulis', () => {
    expect(kode('dada-s1-kata-bursa')).toEqual(['PENJELASAN_TANPA_PENENTU']);
    expect(kode('dada-s2-dividen-pemilik-kecil')).toEqual(['ANDAIAN_DI_PENJELASAN', 'G-register']);
    expect(kode('dada-s3-siapa-yang-menjual')).toEqual([]);
    expect(kode('ultj-turun-di-tanggal-ex')).toEqual([]);
    expect(kode('ultj-riwayat-dividen')).toEqual(['G-register']);
    expect(kode('ultj-siapa-yang-membeli')).toEqual(['G-register']);
  });

  it('§6: meresmikan dan keseimbangan meloloskan keenam soal manusia', () => {
    for (const s of soalManusiaM2d8()) expect(gArtefak(s.omongan).tolak, s.id).toBe(false);
  });

  it('KATA_PENILAIAN memakai pengecualian M2d-5 ("kabar buruk"), kata lain tetap kena', () => {
    const o = { nama: 'Uji', pesan: 'Pasti ada kabar buruk!', pilihan: { a: 'Betul, a.', b: 'Keliru, b.', c: 'Betul, c.', d: 'Keliru, d.' }, penjelasan: 'Bukan kabar buruk.' };
    expect(kataPenilaian(o)).toEqual([]);
    expect(kataPenilaian({ ...o, pesan: 'Sahamnya murah banget' })).toEqual(['Pesan memakai kata penilaian "murah"; produk ini tidak menilai saham.']);
  });

  it('NAMA_TERLARANG tidak dinilai per soal (nama kasus tayang); kode pelindung = daftar pra-registrasi', () => {
    expect(kode('dada-s1-kata-bursa')).not.toContain('NAMA_TERLARANG');
    const baris = PRAREG.split('\n').find((b) => b.includes('**Kode PELINDUNG')) ?? '';
    const diPrareg = [...(baris.split('Alasannya')[0] ?? '').matchAll(/`([A-Z][A-Za-z_-]+)`/g)].map((m) => m[1]);
    expect([...diPrareg].sort()).toEqual([...KODE_PELINDUNG].sort());
    expect(KODE_PELINDUNG).not.toContain('ANDAIAN_DI_PENJELASAN');
    expect(KODE_PELINDUNG).not.toContain('G-register');
  });
});
