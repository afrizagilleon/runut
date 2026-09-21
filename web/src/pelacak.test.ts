import { describe, expect, it } from 'vitest';
import {
  GESER_MAKS,
  MAKS_UID,
  PEMILIH_INTERAKTIF,
  bacaSasaran,
  ketukanSah,
  rasioLayar,
  type SimpulKetuk,
} from './pelacak.ts';

/**
 * Rantai elemen ditulis dari dalam ke luar, seperti yang disusun pendengar di
 * `Aplikasi.tsx`: sasaran ketukan lebih dulu, lalu induknya, lalu induknya lagi.
 */
const simpul = (uid: string | null, interaktif = false): SimpulKetuk => ({ uid, interaktif });

describe('pelacak — siapa yang kena ketukan (D-8)', () => {
  it('ketukan di teks opsi terbaca sebagai ketukan hidup pada opsi itu', () => {
    // <span class="opsi-teks"> di dalam <label class="opsi" data-uid="opsi:b">
    const hasil = bacaSasaran([
      simpul(null),
      simpul('opsi:b', true),
      simpul(null),
      simpul(null),
    ]);
    expect(hasil).toEqual({ uid: 'opsi:b', mati: false });
  });

  it('ketukan di badan lembar MATI, dan membawa uid lembarnya', () => {
    // <strong class="angka-lembar"> -> <p class="isi"> -> <div class="lembar-badan">
    // -> <section class="lembar" data-uid="lembar:har-2025-10-08">
    const hasil = bacaSasaran([
      simpul(null),
      simpul(null),
      simpul(null),
      simpul('lembar:har-2025-10-08'),
      simpul(null),
    ]);
    expect(hasil).toEqual({ uid: 'lembar:har-2025-10-08', mati: true });
  });

  it('ketukan di kaki lembar berhenti di kakinya, bukan di lembarnya', () => {
    const hasil = bacaSasaran([
      simpul(null),
      simpul('kaki:har-2025-10-08', true),
      simpul('lembar:har-2025-10-08'),
    ]);
    expect(hasil).toEqual({ uid: 'kaki:har-2025-10-08', mati: false });
  });

  it('ketukan di ruang kosong: tanpa uid dan mati', () => {
    expect(bacaSasaran([simpul(null), simpul(null)])).toEqual({ uid: null, mati: true });
  });

  it('rantai kosong tidak melempar', () => {
    expect(bacaSasaran([])).toEqual({ uid: null, mati: true });
  });

  it('tombol tanpa uid sendiri mewarisi uid bilahnya dan tetap hidup', () => {
    // <button class="tombol-utama"> di dalam <div class="tindakan" data-uid="bilah">
    expect(bacaSasaran([simpul(null, true), simpul('bilah')])).toEqual({
      uid: 'bilah',
      mati: false,
    });
  });

  it('uid yang terlalu panjang dipotong di batas pengumpul', () => {
    const panjang = `lembar:${'x'.repeat(200)}`;
    const hasil = bacaSasaran([simpul(panjang)]);
    expect(hasil.uid).toHaveLength(MAKS_UID);
    expect(hasil.uid?.startsWith('lembar:')).toBe(true);
  });

  it('pemilih interaktif menyebut label dan summary', () => {
    // Opsi adalah <label>, baris istilah adalah <summary>: kalau keduanya
    // hilang dari daftar, setiap ketukan pada opsi tercatat MATI dan angka
    // "ketukan mati" kehilangan artinya.
    expect(PEMILIH_INTERAKTIF).toContain('label');
    expect(PEMILIH_INTERAKTIF).toContain('summary');
    expect(PEMILIH_INTERAKTIF).toContain('button');
  });
});

describe('pelacak — ketukan lawan guliran', () => {
  it('gerak tepat di batas masih ketukan', () => {
    expect(ketukanSah({ x: 100, y: 100 }, { x: 100 + GESER_MAKS, y: 100 })).toBe(true);
  });

  it('gerak lebih dari 10 px bukan ketukan', () => {
    expect(ketukanSah({ x: 100, y: 100 }, { x: 100, y: 140 })).toBe(false);
    expect(ketukanSah({ x: 0, y: 0 }, { x: 8, y: 8 })).toBe(false); // 11,3 px
  });

  it('tanpa pointerdown yang cocok, ketukan tetap dihitung', () => {
    expect(ketukanSah(null, { x: 5, y: 5 })).toBe(true);
  });
});

describe('pelacak — posisi relatif, bukan mutlak', () => {
  it('membagi dengan ukuran viewport dan membulatkan tiga desimal', () => {
    expect(rasioLayar(180, 360)).toBe(0.5);
    expect(rasioLayar(123, 360)).toBe(0.342);
  });

  it('menjepit di 0 dan 1', () => {
    expect(rasioLayar(-40, 360)).toBe(0);
    expect(rasioLayar(900, 360)).toBe(1);
  });

  it('ukuran nol atau nilai tak terhingga tidak melahirkan NaN', () => {
    expect(rasioLayar(10, 0)).toBe(0);
    expect(rasioLayar(Number.NaN, 360)).toBe(0);
    expect(rasioLayar(10, Number.POSITIVE_INFINITY)).toBe(0);
  });
});
