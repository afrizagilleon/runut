import { describe, expect, it } from 'vitest';
import {
  KUNCI_KUNJUNGAN,
  KUNCI_PENGUNJUNG,
  MAKS_KUNJUNGAN,
  bacaPengunjung,
  buatIdSesi,
  cabangAcak,
  kodePenanda,
  sumberAcakPeramban,
  uuidV4Sah,
  type Penyimpanan,
  type SumberAcak,
} from './sesi.ts';

/** Bentuk UUID v4 yang juga diterima pengumpul. */
const POLA_V4 = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;

/** getRandomValues tiruan yang deterministik: 0, 1, 2, … */
function getRandomValuesNaik(mulai = 0): (larik: Uint8Array) => Uint8Array {
  let n = mulai;
  return (larik) => {
    for (let i = 0; i < larik.length; i += 1) {
      larik[i] = (n + i) & 0xff;
    }
    n += larik.length;
    return larik;
  };
}

/** Math.random tiruan yang deterministik. */
function acakTetap(nilai: number): () => number {
  return () => nilai;
}

describe('buatIdSesi — cabang randomUUID (konteks aman)', () => {
  const sumber: SumberAcak = {
    randomUUID: () => '2f1a1d6c-0000-4000-8000-000000000001',
    getRandomValues: getRandomValuesNaik(),
    acak: acakTetap(0.5),
  };

  it('memilih randomUUID kalau ada', () => {
    expect(cabangAcak(sumber)).toBe('randomUUID');
  });

  it('memakai hasilnya apa adanya', () => {
    expect(buatIdSesi(sumber)).toBe('2f1a1d6c-0000-4000-8000-000000000001');
  });
});

describe('buatIdSesi — cabang getRandomValues (konteks TIDAK aman)', () => {
  // Persis keadaan di http://192.168.50.200:5173 — randomUUID tidak ada.
  const tanpaUUID = (): SumberAcak => ({ getRandomValues: getRandomValuesNaik() });

  it('memilih getRandomValues ketika randomUUID tidak ada', () => {
    expect(cabangAcak(tanpaUUID())).toBe('getRandomValues');
  });

  it('menghasilkan UUID v4 yang sah', () => {
    expect(buatIdSesi(tanpaUUID())).toMatch(POLA_V4);
  });

  it('memasang bit versi 4 dan bit varian RFC 4122', () => {
    const id = buatIdSesi(tanpaUUID());
    expect(id[14]).toBe('4');
    expect(['8', '9', 'a', 'b']).toContain(id[19]);
  });

  it('memasang bit versi walau semua bita acaknya nol', () => {
    const nol: SumberAcak = { getRandomValues: (l) => l.fill(0) };
    expect(buatIdSesi(nol)).toBe('00000000-0000-4000-8000-000000000000');
  });

  it('memasang bit varian walau semua bita acaknya 255', () => {
    const penuh: SumberAcak = { getRandomValues: (l) => l.fill(255) };
    expect(buatIdSesi(penuh)).toBe('ffffffff-ffff-4fff-bfff-ffffffffffff');
  });

  it('dua panggilan menghasilkan id yang berbeda', () => {
    const sumber = tanpaUUID();
    expect(buatIdSesi(sumber)).not.toBe(buatIdSesi(sumber));
  });
});

describe('buatIdSesi — cabang Math.random (tanpa crypto sama sekali)', () => {
  it('memilih Math.random ketika keduanya tidak ada', () => {
    expect(cabangAcak({})).toBe('Math.random');
  });

  it('menghasilkan UUID v4 yang sah', () => {
    let n = 0;
    const sumber: SumberAcak = { acak: () => ((n += 0.0137) % 1) };
    expect(buatIdSesi(sumber)).toMatch(POLA_V4);
  });

  it('memasang bit versi dan varian walau acaknya selalu nol', () => {
    expect(buatIdSesi({ acak: acakTetap(0) })).toBe('00000000-0000-4000-8000-000000000000');
  });

  it('tidak melempar tanpa sumber apa pun — layar putih lebih buruk', () => {
    expect(() => buatIdSesi()).not.toThrow();
    expect(buatIdSesi()).toMatch(POLA_V4);
  });

  it('dua panggilan menghasilkan id yang berbeda', () => {
    expect(buatIdSesi()).not.toBe(buatIdSesi());
  });
});

describe('buatIdSesi — bentuknya diterima pengumpul', () => {
  it('panjangnya 36 karakter, di bawah batas 64 milik pengumpul', () => {
    for (const sumber of [
      { getRandomValues: getRandomValuesNaik(7) },
      { acak: acakTetap(0.25) },
      {},
    ] as SumberAcak[]) {
      const id = buatIdSesi(sumber);
      expect(id, JSON.stringify(sumber)).toHaveLength(36);
      expect(id.length).toBeLessThanOrEqual(64);
      expect(id).toMatch(POLA_V4);
    }
  });
});

describe('sumberAcakPeramban', () => {
  it('tidak melempar dan menghasilkan id yang sah di lingkungan tes', () => {
    expect(buatIdSesi(sumberAcakPeramban())).toMatch(POLA_V4);
  });
});

/* ------------------------------------------------------------------ */
/* Nomor pengunjung (D-13)                                            */
/* ------------------------------------------------------------------ */

/** localStorage tiruan; `melempar` menirukan mode penyamaran / penyimpanan penuh. */
function penyimpanan(
  awal: Record<string, string> = {},
  melempar: 'tidak' | 'baca' | 'tulis' = 'tidak',
): Penyimpanan & { isi: Record<string, string> } {
  const isi = { ...awal };
  return {
    isi,
    getItem(kunci) {
      if (melempar === 'baca') throw new Error('SecurityError');
      return isi[kunci] ?? null;
    },
    setItem(kunci, nilai) {
      if (melempar === 'tulis') throw new Error('QuotaExceededError');
      isi[kunci] = nilai;
    },
  };
}

const ID_TETAP = '2f1a1d6c-1111-4222-8333-444444444444';
const buatTetap = (): string => ID_TETAP;

describe('bacaPengunjung — empat keadaan (D-13)', () => {
  it('pertama kali: membuat nomor baru dan menyimpannya, kunjungan ke-1', () => {
    const simpan = penyimpanan();
    expect(bacaPengunjung(simpan, buatTetap)).toEqual({
      pengunjung: ID_TETAP,
      kunjungan_ke: 1,
    });
    expect(simpan.isi[KUNCI_PENGUNJUNG]).toBe(ID_TETAP);
    expect(simpan.isi[KUNCI_KUNJUNGAN]).toBe('1');
  });

  it('kembali: memakai nomor lama dan menaikkan hitungannya', () => {
    const lama = '11111111-2222-4333-a444-555555555555';
    const simpan = penyimpanan({ [KUNCI_PENGUNJUNG]: lama, [KUNCI_KUNJUNGAN]: '3' });
    expect(bacaPengunjung(simpan, buatTetap)).toEqual({ pengunjung: lama, kunjungan_ke: 4 });
    expect(simpan.isi[KUNCI_KUNJUNGAN]).toBe('4');
  });

  it('penyimpanan melempar: null, tanpa galat, permainan tetap jalan', () => {
    expect(bacaPengunjung(penyimpanan({}, 'baca'), buatTetap)).toEqual({
      pengunjung: null,
      kunjungan_ke: null,
    });
    expect(bacaPengunjung(penyimpanan({}, 'tulis'), buatTetap)).toEqual({
      pengunjung: null,
      kunjungan_ke: null,
    });
    // Penyimpanan yang tidak ada sama sekali diperlakukan sama.
    expect(bacaPengunjung(null, buatTetap)).toEqual({ pengunjung: null, kunjungan_ke: null });
  });

  it('nilai tersimpan rusak: diganti nomor baru dan hitungan mulai dari 1', () => {
    const simpan = penyimpanan({ [KUNCI_PENGUNJUNG]: 'bukan-uuid', [KUNCI_KUNJUNGAN]: '9' });
    expect(bacaPengunjung(simpan, buatTetap)).toEqual({
      pengunjung: ID_TETAP,
      kunjungan_ke: 1,
    });
    expect(simpan.isi[KUNCI_PENGUNJUNG]).toBe(ID_TETAP);
    expect(simpan.isi[KUNCI_KUNJUNGAN]).toBe('1');
  });

  it('hitungan rusak dengan nomor yang sah: hitungan mulai lagi, nomornya tetap', () => {
    const lama = '11111111-2222-4333-a444-555555555555';
    for (const rusak of ['abc', '-3', '0', '1.5', String(MAKS_KUNJUNGAN + 1)]) {
      const simpan = penyimpanan({ [KUNCI_PENGUNJUNG]: lama, [KUNCI_KUNJUNGAN]: rusak });
      expect(bacaPengunjung(simpan, buatTetap), rusak).toEqual({
        pengunjung: lama,
        kunjungan_ke: 1,
      });
    }
  });

  it('hitungan berhenti di batas yang diterima pengumpul', () => {
    const lama = '11111111-2222-4333-a444-555555555555';
    const simpan = penyimpanan({
      [KUNCI_PENGUNJUNG]: lama,
      [KUNCI_KUNJUNGAN]: String(MAKS_KUNJUNGAN),
    });
    expect(bacaPengunjung(simpan, buatTetap).kunjungan_ke).toBe(MAKS_KUNJUNGAN);
  });

  it('hanya dua kunci yang ditulis, dan namanya yang dieja di README', () => {
    const simpan = penyimpanan();
    bacaPengunjung(simpan, buatTetap);
    expect(Object.keys(simpan.isi).sort()).toEqual(['kunjungan_ke', 'pengunjung']);
  });
});

describe('uuidV4Sah', () => {
  it('menerima yang dibuat buatIdSesi dan menolak yang lain', () => {
    expect(uuidV4Sah(buatIdSesi())).toBe(true);
    expect(uuidV4Sah('11111111-2222-3333-a444-555555555555')).toBe(false); // versi 3
    expect(uuidV4Sah('11111111-2222-4333-c444-555555555555')).toBe(false); // varian salah
    expect(uuidV4Sah('11111111-2222-4333-A444-555555555555')).toBe(false); // huruf besar
    expect(uuidV4Sah(42)).toBe(false);
    expect(uuidV4Sah(null)).toBe(false);
  });
});

/* ------------------------------------------------------------------ */
/* Kode penanda dari tautan (D-9)                                     */
/* ------------------------------------------------------------------ */

describe('kodePenanda', () => {
  it('menerima huruf kecil dan angka, 1 sampai 8 karakter', () => {
    expect(kodePenanda('?k=afriza')).toBe('afriza');
    expect(kodePenanda('k=uji')).toBe('uji');
    expect(kodePenanda('?k=a')).toBe('a');
    expect(kodePenanda('?k=12345678')).toBe('12345678');
  });

  it('mengabaikan nilai yang tidak sah, diam-diam', () => {
    expect(kodePenanda('?k=123456789')).toBeNull(); // sembilan karakter
    expect(kodePenanda('?k=AFRIZA')).toBeNull(); // huruf besar
    expect(kodePenanda('?k=af riza')).toBeNull(); // spasi
    expect(kodePenanda('?k=')).toBeNull();
    expect(kodePenanda('?k=<script>')).toBeNull();
  });

  it('tidak menemukan apa-apa kalau memang tidak ada', () => {
    expect(kodePenanda('')).toBeNull();
    expect(kodePenanda('?utm_source=wa')).toBeNull();
    expect(kodePenanda('?kk=afriza')).toBeNull();
  });

  it('menemukan k walau tautannya membawa ekor lain', () => {
    expect(kodePenanda('?utm_source=wa&k=grup1&fbclid=xyz')).toBe('grup1');
  });
});
