import { describe, expect, it } from 'vitest';
import { buatIdSesi, cabangAcak, sumberAcakPeramban, type SumberAcak } from './sesi.ts';

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
