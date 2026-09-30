/**
 * Amandemen A-2 M2d-10: empat perbaikan di KODE, dites dengan kasus nyata A-1.
 * 1. G-klaim-tambahan (pesan tanpa klaim pribadi/kabar yang tak bisa dicek);
 * 2. kebocoran kalender (hitungan hari kunci tak boleh bisa dihitung dari
 *    tanggal yang tampil tanpa kartu);
 * 3. pengecoh besaran "dekat tetapi salah", dari nilai nyata;
 * 4. anti-ulang pemanasan (simulasi tidak memakai pola + penentu soal pemanasan).
 */
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import type { OmonganDraf } from '../draf.ts';
import { AKAR } from '../env.ts';
import { DEFINISI_PAKET, bangunPaket } from '../paket.ts';
import { buktiKunciTunggal } from './bukti.ts';
import { bocorKalender, gKlaimTambahan, pengecohDekat, POLA_KLAIM_TAMBAHAN } from './a2.ts';
import { semuaRencana, type RencanaSoal } from './pola.ts';
import { kunciRencana, pilihRencanaPemanasan, pilihRencanaSimulasi } from './pilih.ts';
import { evaluasi } from './proposisi.ts';
import { periksaTulisanPesan } from './penulis.ts';
import { periksaKodeTemplat } from './kode.ts';
import { pilihanBawaan, rakitOmonganTemplat } from './rakit.ts';

const TIRT = bangunPaket(DEFINISI_PAKET.tirt);
const A1 = JSON.parse(readFileSync(`${AKAR}eval/penyusun/m2d10-tirt-a1/hasil.json`, 'utf8')) as { versi: Array<{ no: number; rencana: string; omongan: OmonganDraf | null }> };
const tayang = ['dada-2025-10-08', 'ultj-2026-05-04'].flatMap((f) => (JSON.parse(readFileSync(`${AKAR}cases/${f}.json`, 'utf8')) as { soal: Array<{ pesan: { isi: string } }> }).soal.map((s) => s.pesan.isi));
const ambil = (pola: string): RencanaSoal => semuaRencana(TIRT).find((r) => r.pola === pola) as RencanaSoal;

describe('1. G-klaim-tambahan', () => {
  it('menangkap klaim tambahan dari jejak M2d-8…A-1', () => {
    for (const p of [
      'Santai, gw catet harga penutupan Perusahaan T kemarin Rp97. Gw hafal angka beginian.',
      'Dari akhir November ke awal Desember harganya naik lumayan, gw dari dulu hafal pola beginian.',
      'Temen gw ngomongin saham Perusahaan T, katanya sejak 26 November harga penutupannya udah lebih dari dua kali lipat.',
      'Waduh, sejak 26 November harga penutupannya udah lebih dari dua kali lipat. Gw panik nih, ini gila banget!',
      'Gw udah itung dari kemarin, naik beruntunnya 4.382.400 lembar. Kalian baru sadar sekarang, telat.',
      'Eh, hari ini kayak nggak ada yang main. Gw ikut-ikutan nimbrung di grup sebelah nih.',
    ]) expect(gKlaimTambahan(p).length, p).toBeGreaterThan(0);
  });
  it('keenam pesan soal tayang (Claude + pemilik) lolos', () => {
    expect(tayang.length).toBe(6);
    for (const p of tayang) expect(gKlaimTambahan(p), p).toEqual([]);
  });
  it('dipasang di pemeriksaan pesan templat (gerbang kode)', () => {
    const r = ambil('angka-lain-waktu');
    expect(periksaTulisanPesan({ nama: 'Bima', jam: '21.07', pesan: 'Santai, gw catet harga penutupan kemarin Rp97. Gw hafal angka beginian.' }, r, []).join(' ')).toMatch(/G-klaim-tambahan/);
    expect(POLA_KLAIM_TAMBAHAN.length).toBeGreaterThan(5);
  });
});

describe('2. kebocoran kalender', () => {
  it('versi benar-berincian jalan A-1 (tertebak lewat rentang tanggal) ditolak', () => {
    const v = A1.versi.filter((x) => x.rencana === 'benar-berincian:hari-naik-beruntun' && x.omongan !== null);
    expect(v.length).toBeGreaterThan(0);
    for (const x of v) expect(bocorKalender(x.omongan as OmonganDraf, TIRT).length).toBeGreaterThan(0);
  });
  it('templat benar-berincian A-2: tanggal akhir rangkaian tidak tampil → hitungan tak bisa diturunkan', () => {
    const r = ambil('benar-berincian');
    const o = rakitOmonganTemplat(r, pilihanBawaan(r), { nama: 'Sinta', jam: '19.20', pesan: 'Sejak 26 November harga penutupannya naik terus tiap hari ya' }, 'x', 'a');
    expect(bocorKalender(o, TIRT)).toEqual([]);
  });
  it('dipasang di gerbang kode: pesan yang menyebut kedua ujung rentang ditolak (lokasi pesan)', () => {
    const r = ambil('benar-berincian');
    const pil = pilihanBawaan(r);
    const tulisan = { nama: 'Sinta', jam: '19.20', pesan: 'Sejak 26 November sampai 9 Desember harga penutupannya naik terus tiap hari ya' };
    const o = rakitOmonganTemplat(r, pil, tulisan, 'x', 'a');
    const h = periksaKodeTemplat({ no: 1, o, r, pilihan: pil, tulisan, paket: TIRT, namaLain: [], gabung: [o, null, null], terkunci: new Set() });
    expect(h.menolak.filter((m) => m.sumber === 'templat: kalender').map((m) => m.lokasi)).toEqual(['pesan']);
  });

  it('soal tanpa hitungan hari tidak terkena', () => {
    const r = ambil('besaran-hitungan');
    const o = rakitOmonganTemplat(r, pilihanBawaan(r), { nama: 'Sinta', jam: '19.20', pesan: 'Sejak 26 November udah lebih dari dua kali lipat ya' }, 'x', 'a');
    expect(bocorKalender(o, TIRT)).toEqual([]);
  });
});

describe('3. pengecoh besaran dekat tetapi salah', () => {
  it('aturan jarak: 3,51 vs 2,21 terlalu jauh; 2,04 vs 2,21 dekat; nilai benar sendiri bukan pengecoh', () => {
    expect(pengecohDekat(3.51, 2.21)).toBe(false);
    expect(pengecohDekat(2.04, 2.21)).toBe(true);
    expect(pengecohDekat(2.21, 2.21)).toBe(false);
  });
  it('pengecoh angka besaran-hitungan TIRT: dekat, salah, dan berasal dari harga nyata di paket', () => {
    const r = ambil('besaran-hitungan');
    const p1 = r.slot[1].varian[0];
    const salah = p1?.proposisi.k === 'nilai' ? p1.proposisi.nilai : NaN;
    expect(pengecohDekat(salah, 2.21)).toBe(true);
    const harga = TIRT.fakta.filter((f) => /^harga-/.test(f.fact_id)).map((f) => f.nilai as number);
    const dariNyata = harga.some((a) => harga.some((b) => Math.round((b / a) * 100) / 100 === salah));
    expect(dariNyata).toBe(true);
    expect(evaluasi(p1?.proposisi as never, TIRT)).toBe(false);
    expect(buktiKunciTunggal(r, TIRT).sah).toBe(true);
  });
});

describe('4. anti-ulang pemanasan', () => {
  it('simulasi TIRT tidak memakai pola + kartu penentu soal pemanasan', () => {
    const pem = pilihRencanaPemanasan(TIRT) as RencanaSoal;
    const sim = pilihRencanaSimulasi(TIRT);
    for (const r of sim.posisi) expect(r.pola === pem.pola && r.kartu_penentu.some((id) => pem.kartu_penentu.includes(id))).toBe(false);
    expect(sim.posisi.length).toBe(3);
    expect(sim.posisi.some((r) => r.klaim.label === 'Betul')).toBe(true);
    expect(sim.posisi.map(kunciRencana)).not.toContain(`${pem.pola}:${pem.sudut}`);
  });
});
