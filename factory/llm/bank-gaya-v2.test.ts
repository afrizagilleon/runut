/**
 * M2d-4 T-02: bank gaya v2 (K-07) + pemilih heuristik diarahkan ke v2 (D-4).
 *
 * Dijaga: 90 kalimat tulis-baru-v2, label sah termasuk nada baru
 * "ikut-ikutan"; setiap kalimat lolos G-kaku DAN G-register (tanpa "gue"),
 * tanpa angka, tanpa ajakan beli/jual, tanpa kata penilaian, emiten hanya
 * "Saham X", 9–15 kata (dihitung seperti G-panjang), tidak memuat potongan
 * omongan manusia; v1 tetap ada dan tetap bawaan M2d-3.
 */
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { ajakanBertransaksi } from '../skema/validator.ts';
import { NADA, NADA_V1, REGISTER, TOPIK, URUT_NADA_V1, URUT_NADA_V2, bacaBank, nadaUntuk, pilihContoh } from './bank-gaya.ts';
import { AKAR } from './env.ts';
import { gKaku } from './gerbang-g.ts';
import { gRegister, hitungKata } from './gerbang-gaya.ts';

const V2 = bacaBank(2);
const POLA_PENILAIAN = /(?<![\p{L}])(bagus|jelek|sehat|buruk|murah|mahal)\p{L}*/giu;
const MANUSIA = ['dada-2025-10-08.json', 'ultj-2026-05-04.json'].flatMap((b) =>
  (JSON.parse(readFileSync(`${AKAR}cases/${b}`, 'utf8')) as { soal: Array<{ pesan: { isi: string } }> }).soal.map((s) => s.pesan.isi),
);

describe('bank gaya v2 — isi', () => {
  it('90 kalimat tulis-baru-v2, id unik, label sah; "ikut-ikutan" dikenal NADA; tiap topik × nada tiga kalimat', () => {
    expect(V2).toHaveLength(90);
    expect(new Set(V2.map((k) => k.id)).size).toBe(90);
    expect(NADA).toContain('ikut-ikutan');
    expect(NADA_V1).not.toContain('ikut-ikutan');
    for (const k of V2) {
      expect(k.sumber, k.id).toBe('tulis-baru-v2');
      expect(REGISTER).toContain(k.register);
      expect(NADA).toContain(k.nada);
      expect(TOPIK).toContain(k.topik);
      expect(k.asal, k.id).toMatch(/tidak menyalin kalimat korpus/);
    }
    for (const t of TOPIK) for (const n of NADA) expect(V2.filter((k) => k.topik === t && k.nada === n), `${t} × ${n}`).toHaveLength(3);
  });

  it('setiap kalimat lolos G-kaku dan G-register (tanpa "gue"/"lo"), tanpa ajakan beli/jual, tanpa kata penilaian', () => {
    for (const k of V2) {
      expect(gKaku(k.teks), k.id).toMatchObject({ tolak: false });
      expect(gRegister(k.teks), k.id).toMatchObject({ tolak: false });
      expect(ajakanBertransaksi(k.teks), k.id).toBeNull();
      expect(k.teks.match(POLA_PENILAIAN), k.id).toBeNull();
    }
    expect(V2.filter((k) => /\b(gw|aku)\b/i.test(k.teks)).length).toBeGreaterThanOrEqual(40);
  });

  it('tanpa angka, tanpa kode saham, emiten hanya "Saham X"; 9–15 kata dihitung seperti G-panjang; tidak memuat potongan omongan manusia', () => {
    for (const k of V2) {
      expect(k.teks, k.id).not.toMatch(/\d/);
      // Empat huruf kapital = bentuk kode saham; "RUPS" (rapat umum pemegang saham) singkatan umum, bukan kode.
      expect(k.teks, k.id).not.toMatch(/\b(?!RUPS\b)[A-Z]{4}\b/);
      expect(k.teks, k.id).not.toMatch(/(Saham|Perusahaan) (?!X\b)[A-Z]\b/);
      const n = hitungKata(k.teks);
      expect(n, k.id).toBe(k.n_kata);
      expect(n, k.id).toBeGreaterThanOrEqual(9);
      expect(n, k.id).toBeLessThanOrEqual(15);
      for (const m of MANUSIA) {
        const p = m.split(/\s+/);
        for (let i = 0; i + 5 <= p.length; i++) expect(k.teks, `${k.id} ↔ "${m}"`).not.toContain(p.slice(i, i + 5).join(' '));
      }
    }
  });

  it('v1 tetap ada dan tetap bawaan (M2d-3 tidak berubah)', () => {
    expect(bacaBank()).toEqual(bacaBank(1));
    expect(bacaBank(1)).toHaveLength(41);
    expect(bacaBank(1).some((k) => k.id.startsWith('v2-'))).toBe(false);
  });
});

describe('bank gaya v2 — pemilih heuristik', () => {
  it('nada M2d-4 berputar di enam nada: sudut 1 → yakin, sok tahu, ragu; sudut 2 → panik, pamer, ikut-ikutan; v1 tidak berubah', () => {
    expect([1, 2, 3].map((no) => nadaUntuk(no, 1, URUT_NADA_V2))).toEqual(['yakin', 'sok tahu', 'ragu']);
    expect([1, 2, 3].map((no) => nadaUntuk(no, 2, URUT_NADA_V2))).toEqual(['panik', 'pamer', 'ikut-ikutan']);
    expect([1, 2, 3].map((no) => nadaUntuk(no, 2))).toEqual(['panik', 'pamer', 'yakin']);
    expect(URUT_NADA_V1).toHaveLength(5);
  });

  it('pemilih atas v2: tiga contoh, nada dan topik yang diminta di depan, paling banyak dua bernada sama', () => {
    const c = pilihContoh({ topik: ['suspensi', 'harga'], nada: 'ikut-ikutan', paket_id: 'tirt' }, V2);
    expect(c).toHaveLength(3);
    expect(c.slice(0, 2).map((k) => [k.nada, k.topik])).toEqual([['ikut-ikutan', 'suspensi'], ['ikut-ikutan', 'suspensi']]);
    expect(c.filter((k) => k.nada === 'ikut-ikutan')).toHaveLength(2);
    expect(c.every((k) => k.id.startsWith('v2-'))).toBe(true);
  });
});
