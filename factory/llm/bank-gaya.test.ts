/**
 * M2d-3 T-03: bank gaya + pemilih heuristik (D-3).
 *
 * Dijaga: ukuran 30–60; label sah; setiap kalimat lolos G-kaku, tanpa ajakan
 * beli/jual, tanpa kata penilaian; kalimat tulis-baru tanpa angka, emiten
 * fiktif "Saham X", tidak menyalin omongan manusia; kalimat manusia persis
 * dari kasus yang hidup; pemilih mengambil 2–3 yang cocok, tidak pernah
 * memberi penulis pesan manusia dari kasus yang sedang ditulis; contoh gaya
 * hanya sampai ke penulis.
 */
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { ajakanBertransaksi } from '../skema/validator.ts';
import { jalankanPeran, pesanPenulis, type InfoPeran, type PanggilPeran } from './agen-peran.ts';
import { NADA, NADA_V1, REGISTER, TOPIK, bacaBank, nadaUntuk, pilihContoh, topikDariTeks, tulisContoh } from './bank-gaya.ts';
import type { DrafSimulasi } from './draf.ts';
import { AKAR } from './env.ts';
import { gKaku } from './gerbang-g.ts';
import type { PesanChat } from './klien.ts';
import type { PaketFakta } from './paket.ts';
import type { JawabanModel } from './susun.ts';
import { validasiDraf } from './validasi.ts';
import { rencanaSudut, type Sudut } from './sudut.ts';

const BANK = bacaBank();
const POLA_PENILAIAN = /(?<![\p{L}])(bagus|jelek|sehat|buruk|murah|mahal)\p{L}*/giu;
const pesanKasus = (berkas: string): string[] =>
  (JSON.parse(readFileSync(`${AKAR}cases/${berkas}`, 'utf8')) as { soal: Array<{ pesan: { isi: string } }> }).soal.map((s) => s.pesan.isi);
const HIDUP = { dada: pesanKasus('dada-2025-10-08.json'), ultj: pesanKasus('ultj-2026-05-04.json') };

describe('bank gaya — isi', () => {
  it('30–60 kalimat, id unik, label sah, setiap topik × nada ada di kalimat tulis-baru', () => {
    expect(BANK.length).toBeGreaterThanOrEqual(30);
    expect(BANK.length).toBeLessThanOrEqual(60);
    expect(new Set(BANK.map((k) => k.id)).size).toBe(BANK.length);
    for (const k of BANK) {
      expect(REGISTER).toContain(k.register);
      expect(NADA).toContain(k.nada);
      expect(TOPIK).toContain(k.topik);
      expect(k.sumber).toMatch(/^(tulis-baru|manusia-(dada|ultj))$/);
    }
    const baru = BANK.filter((k) => k.sumber === 'tulis-baru');
    // Bank v1 memakai lima nada M2d-3; "ikut-ikutan" baru di bank v2 (M2d-4).
    expect(BANK.every((k) => (NADA_V1 as readonly string[]).includes(k.nada))).toBe(true);
    for (const t of TOPIK) for (const n of NADA_V1) expect(baru.some((k) => k.topik === t && k.nada === n), `${t} × ${n}`).toBe(true);
  });

  it('semua kalimat lolos G-kaku, tanpa ajakan beli/jual, tanpa kata penilaian', () => {
    for (const k of BANK) {
      expect(gKaku(k.teks), k.id).toMatchObject({ tolak: false });
      expect(ajakanBertransaksi(k.teks), k.id).toBeNull();
      expect(k.teks.match(POLA_PENILAIAN), k.id).toBeNull();
    }
  });

  it('tulis-baru: tanpa angka, tanpa kode saham, emiten hanya "Saham X", tidak memuat potongan omongan manusia', () => {
    const manusia = [...HIDUP.dada, ...HIDUP.ultj];
    for (const k of BANK.filter((x) => x.sumber === 'tulis-baru')) {
      expect(k.teks, k.id).not.toMatch(/\d/);
      expect(k.teks, k.id).not.toMatch(/\b[A-Z]{4}\b/);
      expect(k.teks, k.id).not.toMatch(/(Saham|Perusahaan) (?!X\b)[A-Z]\b/);
      for (const m of manusia) {
        const potongan = m.split(/\s+/);
        for (let i = 0; i + 5 <= potongan.length; i++) expect(k.teks, `${k.id} ↔ "${m}"`).not.toContain(potongan.slice(i, i + 5).join(' '));
      }
    }
  });

  it('kalimat manusia persis sama dengan pesan teman di kasus yang hidup (pesan Nadia tidak dimasukkan: kata penilaian "buruk")', () => {
    const m = BANK.filter((k) => k.sumber.startsWith('manusia-'));
    expect(m).toHaveLength(5);
    for (const k of m) expect(HIDUP[k.sumber.slice('manusia-'.length) as 'dada' | 'ultj']).toContain(k.teks);
    expect(HIDUP.ultj.some((t) => t.includes('kabar buruk'))).toBe(true);
    expect(m.some((k) => k.teks.includes('kabar buruk'))).toBe(false);
  });
});

describe('bank gaya — pemilih heuristik', () => {
  it('topik dari kalimat peristiwa paket, urut kemunculan', () => {
    const tirt = JSON.parse(readFileSync(`${AKAR}eval/keluaran-m2d/paket/tirt.json`, 'utf8')) as PaketFakta;
    expect(topikDariTeks(tirt.peristiwa)).toEqual(['suspensi', 'harga']);
    const peristiwa = (id: string): string => (JSON.parse(readFileSync(`${AKAR}eval/keluaran-m2d/paket/${id}.json`, 'utf8')) as PaketFakta).peristiwa;
    expect(topikDariTeks(peristiwa('ultj'))).toEqual(['dividen', 'pemilik']);
    expect(topikDariTeks(peristiwa('dada'))).toEqual(['harga', 'pemilik', 'suspensi', 'laporan', 'dividen']);
  });

  it('nada berputar: tiga posisi satu simulasi berbeda nada; sudut baru nada baru', () => {
    expect([1, 2, 3].map((n) => nadaUntuk(n))).toEqual(['yakin', 'sok tahu', 'ragu']);
    expect(new Set([1, 2, 3].map((n) => nadaUntuk(n, 2))).size).toBe(3);
    expect(nadaUntuk(1, 2)).not.toBe(nadaUntuk(1, 1));
  });

  it('mengambil 3 contoh yang cocok topik + nada, deterministik, paling banyak dua bernada sama', () => {
    const c = pilihContoh({ topik: ['suspensi', 'harga'], nada: 'panik', paket_id: 'tirt' });
    expect(c).toHaveLength(3);
    expect(c[0]).toMatchObject({ topik: 'suspensi', nada: 'panik' });
    expect(c.filter((k) => k.nada === 'panik').length).toBeLessThanOrEqual(2);
    expect(c.every((k) => k.topik === 'suspensi' || k.nada === 'panik')).toBe(true);
    expect(pilihContoh({ topik: ['suspensi', 'harga'], nada: 'panik', paket_id: 'tirt' })).toEqual(c);
  });

  it('tidak pernah memberi penulis pesan manusia dari kasus yang sedang ditulis', () => {
    for (const n of NADA) {
      for (const t of TOPIK) {
        expect(pilihContoh({ topik: [t], nada: n, paket_id: 'dada', jumlah: 60 }).some((k) => k.sumber === 'manusia-dada')).toBe(false);
        expect(pilihContoh({ topik: [t], nada: n, paket_id: 'ultj', jumlah: 60 }).some((k) => k.sumber === 'manusia-ultj')).toBe(false);
      }
    }
    // Di paket lain, pesan manusia yang cocok memang dipilih lebih dulu.
    expect(pilihContoh({ topik: ['dividen'], nada: 'pamer', paket_id: 'tirt' })[0]?.sumber).toBe('manusia-dada');
  });
});

describe('bank gaya — hanya sampai ke penulis', () => {
  const PAKET = JSON.parse(readFileSync(`${AKAR}eval/keluaran-m2d/paket/tirt.json`, 'utf8')) as PaketFakta;
  const DRAF = (JSON.parse(readFileSync(`${AKAR}eval/keluaran-m2d/sel-putaran2/tirt--deepseek_ai_DeepSeek_V4.1_Flash.json`, 'utf8')) as { draf: DrafSimulasi }).draf;

  it('pesan penulis memuat nada dan contoh; penebak, pembaca kartu, dan kritikus tidak menerima satu pun kalimat bank', async () => {
    const rekaman: Array<{ pesan: PesanChat[]; info: InfoPeran }> = [];
    const panggil: PanggilPeran = async (pesan, _s, info) => {
      rekaman.push({ pesan, info });
      const j = (teks: string): JawabanModel => ({ teks, token_masuk: 1, token_keluar: 1, latensi_ms: 1, finish_reason: 'stop', biaya_usd: 0 });
      const no = info.omongan ?? 1;
      const kunci = DRAF.omongan[no - 1]?.kunci ?? 'a';
      if (info.peran === 'penulis') return j(JSON.stringify({ omongan: [{ no, ...DRAF.omongan[no - 1] }] }));
      if (info.peran === 'pembaca-kartu') return j(JSON.stringify({ pilihan: kunci, kartu: [1], alasan: '-' }));
      if (info.peran === 'penebak') return j(JSON.stringify({ pilihan: kunci === 'a' ? 'c' : 'a', yakin: 50, alasan: '-' }));
      return j(JSON.stringify({ keberatan: [], arahan: '' }));
    };
    const semua = rencanaSudut(PAKET);
    const awal = DRAF.omongan.map((o) => semua.find((x) => x.fact_id === o.kartu_penentu[0]) as Sudut);
    const sudut = [...awal, ...semua.filter((x) => !awal.includes(x))];
    await jalankanPeran({ paket: PAKET, panggil, validasi: validasiDraf, jam: () => new Date('2026-09-28T00:00:00Z'), rencanaSudut: sudut });
    const penulis = rekaman.filter((r) => r.info.peran === 'penulis');
    expect(penulis).toHaveLength(3);
    for (const [i, r] of penulis.entries()) {
      const t = r.pesan[1]?.content ?? '';
      const nada = nadaUntuk(i + 1);
      expect(t).toContain(`NADA YANG DIMINTA untuk pesan omongan ini: ${nada}.`);
      const topikSudut = awal[i]?.topik ?? 'harga';
      const contoh = pilihContoh({ topik: [topikSudut, ...topikDariTeks(PAKET.peristiwa).filter((t) => t !== topikSudut)], nada, paket_id: 'tirt' });
      expect(t).toContain(tulisContoh(nada, contoh));
      expect(contoh.length).toBeGreaterThanOrEqual(2);
    }
    for (const r of rekaman.filter((x) => x.info.peran !== 'penulis')) {
      const t = r.pesan.map((p) => p.content).join('\n');
      for (const k of BANK) expect(t).not.toContain(k.teks);
      expect(t).not.toContain('NADA YANG DIMINTA');
    }
  });

  it('pesanPenulis tanpa gaya tidak memuat bagian contoh', () => {
    expect(pesanPenulis({ no: 1, draf: [null, null, null], terkunci: new Set(), umpan: undefined })).not.toContain('Contoh gaya');
  });
});
