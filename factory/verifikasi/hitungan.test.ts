/**
 * M2a T-01 (INV-B): tiap aturan melaporkan berapa yang sungguh diperiksa.
 *
 * "Nol merah" tanpa "diperiksa" tidak sah. Yang dijaga di sini:
 * 1. tiap `HasilAturan` membawa hitungan,
 * 2. `diperiksa = hijau + merah + tidak_lengkap` di semua aturan,
 * 3. aturan yang dilewati menyebut alasannya dan tidak mengaku memeriksa apa pun.
 */
import { describe, expect, it } from 'vitest';
import { ATURAN, verifikasi } from './aturan.ts';
import { harga, konteks, laporan, suspensi } from './contoh.ts';
import { SAHAM_BEREDAR_DADA, rantaiDada2025 } from './rantai-dada.ts';

const RANTAI_DADA = rantaiDada2025();

const konteksPenuh = konteks({
  laporan: RANTAI_DADA,
  harga: [harga(), harga({ tanggal: '2025-10-09', volume: 0 })],
  suspensi: [suspensi()],
  saham_beredar: SAHAM_BEREDAR_DADA,
  potret: { sumber: 'laporan berikutnya', pada: '2026-01-12', lembar: 2_200_000_000 },
});

describe('INV-B — hitungan wajib tiap aturan', () => {
  it('memberi hitungan untuk kesepuluh aturan, dijalankan maupun tidak', () => {
    for (const konteksUji of [konteksPenuh, konteks()]) {
      const hasil = verifikasi(konteksUji);
      expect(hasil.pemeriksaan).toHaveLength(ATURAN.length);
      for (const p of hasil.pemeriksaan) {
        expect(p.hitungan, `${p.aturan} tidak membawa hitungan`).toBeDefined();
        expect(p.hitungan.satuan.length, `${p.aturan} tidak menyebut satuan`).toBeGreaterThan(0);
      }
    }
  });

  it('menjaga diperiksa = hijau + merah + tidak lengkap', () => {
    for (const konteksUji of [konteksPenuh, konteks(), konteks({ laporan: [laporan()] })]) {
      for (const p of verifikasi(konteksUji).pemeriksaan) {
        const { diperiksa, hijau, merah, tidak_lengkap } = p.hitungan;
        expect(hijau + merah + tidak_lengkap, `${p.aturan} tidak berimbang`).toBe(diperiksa);
        for (const [nama, nilai] of Object.entries({ diperiksa, hijau, merah, tidak_lengkap })) {
          expect(nilai, `${p.aturan}.${nama} negatif`).toBeGreaterThanOrEqual(0);
        }
      }
    }
  });

  it('tidak pernah mengaku memeriksa sesuatu saat aturannya dilewati', () => {
    const hasil = verifikasi(konteks());
    const dilewati = hasil.pemeriksaan.filter((p) => !p.dijalankan);
    expect(dilewati.length).toBeGreaterThan(0);
    for (const p of dilewati) {
      expect(p.hitungan.diperiksa, `${p.aturan} mengaku memeriksa padahal dilewati`).toBe(0);
      expect(p.alasan_lewat).not.toBeNull();
      expect(p.hitungan.alasan_dilewati).toContain(p.alasan_lewat);
    }
  });

  it('menghitung sisi laporan, bukan laporan, untuk R7', () => {
    const dua = [laporan({ laporan_id: 'a' }), laporan({ laporan_id: 'b' })];
    const r7 = verifikasi(konteks({ laporan: dua, saham_beredar: SAHAM_BEREDAR_DADA })).pemeriksaan.find(
      (p) => p.aturan === 'R7',
    );
    expect(r7?.hitungan.satuan).toBe('sisi laporan');
    expect(r7?.hitungan.diperiksa).toBe(4);
  });

  it('mencatat laporan tanpa penanda repo sebagai dilewati, bukan hijau (R8)', () => {
    const r8 = verifikasi(konteksPenuh).pemeriksaan.find((p) => p.aturan === 'R8');
    expect(r8?.dijalankan).toBe(false);
    expect(r8?.hitungan.dilewati).toBe(RANTAI_DADA.length);
    expect(r8?.hitungan.hijau).toBe(0);
  });

  it('menghitung hari bervolume nol yang tersuspensi sebagai hijau, bukan tak terperiksa (R10)', () => {
    const r10 = verifikasi(konteksPenuh).pemeriksaan.find((p) => p.aturan === 'R10');
    expect(r10?.hitungan.satuan).toBe('baris harga');
    expect(r10?.hitungan.diperiksa).toBe(2);
    expect(r10?.hitungan.merah).toBe(0);
    expect(r10?.hitungan.hijau).toBe(2);
  });

  it('menghitung butir transaksi tanpa baris harga sebagai tidak lengkap (R6)', () => {
    const l = laporan({
      transaksi: [
        { tanggal: '2025-08-07', jenis: 'jual', harga: 12, jumlah: 1 },
        { tanggal: '2099-01-01', jenis: 'jual', harga: 12, jumlah: 1 },
      ],
    });
    const r6 = verifikasi(konteks({ laporan: [l], harga: [harga()] })).pemeriksaan.find(
      (p) => p.aturan === 'R6',
    );
    expect(r6?.hitungan.diperiksa).toBe(3); // 1 laporan + 2 butir transaksi
    expect(r6?.hitungan.tidak_lengkap).toBe(1);
    expect(r6?.hitungan.merah).toBe(0);
  });
});
