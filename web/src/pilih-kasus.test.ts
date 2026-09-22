import { describe, expect, it } from 'vitest';
import type { Kasus } from '../../factory/skema/tipe.ts';
import {
  KUNCI_KASUS_DIMAINKAN,
  MAKS_DIMAINKAN,
  bacaDimainkan,
  belumDimainkan,
  kasusBerikut,
  kodeKasus,
  pilihKasus,
  simpanDimainkan,
  tambahDimainkan,
} from './pilih-kasus.ts';
import type { Penyimpanan } from './sesi.ts';

/*
 * M4 D-4. Kegagalan yang dijaga di sini adalah kegagalan nomor 3 di kontrak:
 * **pemain yang sudah main DADA disodori DADA lagi**. Karena itu setiap
 * pemeriksaan di bawah menanyakan "kasus mana yang keluar", bukan "fungsinya
 * mengembalikan sesuatu".
 */

/** Kasus buatan: hanya `kasus_id` yang dibaca modul ini. */
function kasus(id: string): Kasus {
  return { kasus_id: id } as unknown as Kasus;
}

const A = kasus('aa-2026-01-01');
const B = kasus('bb-2026-02-02');
const C = kasus('cc-2026-03-03');

/** Penyimpanan tiruan; `melempar` menirukan mode penyamaran / penyimpanan penuh. */
function penyimpanan(awal: Record<string, string> = {}, melempar = false): Penyimpanan {
  const isi = new Map(Object.entries(awal));
  return {
    getItem(kunci) {
      if (melempar) throw new Error('penyimpanan diblokir');
      return isi.get(kunci) ?? null;
    },
    setItem(kunci, nilai) {
      if (melempar) throw new Error('penyimpanan diblokir');
      isi.set(kunci, nilai);
    },
  };
}

/** `Math.random` tiruan yang mengembalikan deret tetap. */
function acakDeret(...nilai: number[]): () => number {
  let i = 0;
  return () => nilai[i++ % nilai.length] ?? 0;
}

describe('kodeKasus — `?kasus=<id>` memaksa satu kasus', () => {
  it('membaca nilainya dari query string, dengan atau tanpa tanda tanya', () => {
    expect(kodeKasus('?kasus=ultj-2026-05-04')).toBe('ultj-2026-05-04');
    expect(kodeKasus('kasus=ultj-2026-05-04')).toBe('ultj-2026-05-04');
  });

  it('menemukannya di tengah parameter lain, termasuk di sebelah ?k=', () => {
    expect(kodeKasus('?k=abc&kasus=dada-2025-10-08&utm_source=wa')).toBe('dada-2025-10-08');
  });

  it('null kalau tidak ada', () => {
    expect(kodeKasus('')).toBeNull();
    expect(kodeKasus('?k=abc')).toBeNull();
    expect(kodeKasus('?kasuslain=dada-2025-10-08')).toBeNull();
  });

  it('menolak bentuk yang tidak mungkin menjadi kasus_id, bukan meneruskannya', () => {
    expect(kodeKasus('?kasus=')).toBeNull();
    expect(kodeKasus('?kasus=DADA-2025')).toBeNull();
    expect(kodeKasus('?kasus=../../etc/passwd')).toBeNull();
    expect(kodeKasus('?kasus=' + 'a'.repeat(41))).toBeNull();
  });

  it('persen yang rusak tidak melempar', () => {
    expect(kodeKasus('?kasus=%E0%A4%A')).toBeNull();
  });
});

describe('bacaDimainkan / simpanDimainkan', () => {
  it('membaca larik teks dari kunci kasus_dimainkan', () => {
    const simpan = penyimpanan({ [KUNCI_KASUS_DIMAINKAN]: '["aa-2026-01-01","bb-2026-02-02"]' });
    expect(bacaDimainkan(simpan)).toEqual(['aa-2026-01-01', 'bb-2026-02-02']);
  });

  it('penyimpanan kosong, rusak, atau bukan larik dibaca sebagai belum ada yang dimainkan', () => {
    expect(bacaDimainkan(penyimpanan())).toEqual([]);
    expect(bacaDimainkan(penyimpanan({ [KUNCI_KASUS_DIMAINKAN]: 'bukan json' }))).toEqual([]);
    expect(bacaDimainkan(penyimpanan({ [KUNCI_KASUS_DIMAINKAN]: '{"a":1}' }))).toEqual([]);
    expect(bacaDimainkan(penyimpanan({ [KUNCI_KASUS_DIMAINKAN]: '"dada-2025-10-08"' }))).toEqual([]);
  });

  it('butir yang bukan teks atau bukan bentuk kasus_id dibuang, sisanya dipakai', () => {
    const simpan = penyimpanan({
      [KUNCI_KASUS_DIMAINKAN]: '["aa-2026-01-01",7,null,"DADA",{"x":1},"bb-2026-02-02"]',
    });
    expect(bacaDimainkan(simpan)).toEqual(['aa-2026-01-01', 'bb-2026-02-02']);
  });

  it('penyimpanan yang melempar tidak membuat aplikasi gagal', () => {
    expect(bacaDimainkan(penyimpanan({}, true))).toEqual([]);
    expect(bacaDimainkan(null)).toEqual([]);
    expect(() => {
      simpanDimainkan(penyimpanan({}, true), ['aa-2026-01-01']);
    }).not.toThrow();
    expect(() => {
      simpanDimainkan(null, ['aa-2026-01-01']);
    }).not.toThrow();
  });

  it('yang disimpan bisa dibaca kembali apa adanya', () => {
    const simpan = penyimpanan();
    simpanDimainkan(simpan, ['aa-2026-01-01', 'bb-2026-02-02']);
    expect(bacaDimainkan(simpan)).toEqual(['aa-2026-01-01', 'bb-2026-02-02']);
  });

  it('daftar yang tumbuh tanpa batas dipotong di ujung terlama', () => {
    const panjang = Array.from({ length: MAKS_DIMAINKAN + 5 }, (_, n) => `kk-${String(n)}-01-01`);
    const simpan = penyimpanan();
    simpanDimainkan(simpan, panjang);
    const kembali = bacaDimainkan(simpan);
    expect(kembali).toHaveLength(MAKS_DIMAINKAN);
    // Yang disimpan adalah yang TERBARU: kasus terakhir yang dimainkan harus ada.
    expect(kembali[kembali.length - 1]).toBe(panjang[panjang.length - 1]);
  });
});

describe('tambahDimainkan', () => {
  it('menambahkan kasus baru di ujung', () => {
    expect(tambahDimainkan(['aa-2026-01-01'], 'bb-2026-02-02')).toEqual([
      'aa-2026-01-01',
      'bb-2026-02-02',
    ]);
  });

  it('kasus yang sudah ada tidak digandakan', () => {
    expect(tambahDimainkan(['aa-2026-01-01'], 'aa-2026-01-01')).toEqual(['aa-2026-01-01']);
  });

  it('tidak mengubah lariknya sendiri', () => {
    const lama = ['aa-2026-01-01'];
    tambahDimainkan(lama, 'bb-2026-02-02');
    expect(lama).toEqual(['aa-2026-01-01']);
  });
});

describe('belumDimainkan', () => {
  it('menyaring yang sudah dimainkan, urutan berkas dipertahankan', () => {
    expect(belumDimainkan([A, B, C], ['bb-2026-02-02'])).toEqual([A, C]);
  });

  it('kosong kalau semuanya sudah dimainkan', () => {
    expect(belumDimainkan([A, B], ['aa-2026-01-01', 'bb-2026-02-02'])).toEqual([]);
  });

  it('id tersimpan yang tidak punya berkasnya lagi diabaikan', () => {
    expect(belumDimainkan([A], ['zz-1999-01-01'])).toEqual([A]);
  });
});

describe('pilihKasus — kunjungan pertama: acak seragam', () => {
  it('setiap kasus bisa keluar, dan yang keluar ditentukan angka acaknya', () => {
    const daftar = [A, B, C];
    expect(pilihKasus({ daftar, dimainkan: [], paksa: null, acak: acakDeret(0) })).toBe(A);
    expect(pilihKasus({ daftar, dimainkan: [], paksa: null, acak: acakDeret(0.4) })).toBe(B);
    expect(pilihKasus({ daftar, dimainkan: [], paksa: null, acak: acakDeret(0.9) })).toBe(C);
  });

  it('seragam: tiga kasus, tiga sepertiga yang berbeda', () => {
    const daftar = [A, B, C];
    const keluar = [0.16, 0.5, 0.83].map(
      (n) => pilihKasus({ daftar, dimainkan: [], paksa: null, acak: acakDeret(n) }).kasus_id,
    );
    expect(new Set(keluar).size).toBe(3);
  });

  it('nilai acak di tepi (1 atau lebih) tidak menghasilkan kasus yang tidak ada', () => {
    const daftar = [A, B];
    expect(pilihKasus({ daftar, dimainkan: [], paksa: null, acak: acakDeret(1) })).toBe(B);
    expect(pilihKasus({ daftar, dimainkan: [], paksa: null, acak: acakDeret(1.5) })).toBe(B);
    expect(pilihKasus({ daftar, dimainkan: [], paksa: null, acak: acakDeret(-1) })).toBe(A);
  });

  it('satu kasus: selalu kasus itu', () => {
    expect(pilihKasus({ daftar: [A], dimainkan: [], paksa: null, acak: acakDeret(0.7) })).toBe(A);
  });
});

describe('pilihKasus — kunjungan berikutnya: yang belum dimainkan', () => {
  it('tidak pernah menyodorkan kasus yang sudah dimainkan selama masih ada yang belum', () => {
    const daftar = [A, B, C];
    // Semua nilai acak yang mungkin: tidak satu pun boleh mendarat di A.
    for (const n of [0, 0.2, 0.34, 0.5, 0.66, 0.8, 0.99]) {
      const pilih = pilihKasus({
        daftar,
        dimainkan: ['aa-2026-01-01'],
        paksa: null,
        acak: acakDeret(n),
      });
      expect(pilih.kasus_id).not.toBe('aa-2026-01-01');
    }
  });

  it('dua kunjungan berturut-turut menghabiskan kedua kasus sebelum mengulang', () => {
    const daftar = [A, B];
    const pertama = pilihKasus({ daftar, dimainkan: [], paksa: null, acak: acakDeret(0.9) });
    const dimainkan = tambahDimainkan([], pertama.kasus_id);
    const kedua = pilihKasus({ daftar, dimainkan, paksa: null, acak: acakDeret(0.9) });
    expect(kedua.kasus_id).not.toBe(pertama.kasus_id);
  });

  it('kalau semuanya sudah dimainkan, acak lagi dari seluruh daftar', () => {
    const daftar = [A, B, C];
    const semua = ['aa-2026-01-01', 'bb-2026-02-02', 'cc-2026-03-03'];
    expect(pilihKasus({ daftar, dimainkan: semua, paksa: null, acak: acakDeret(0) })).toBe(A);
    expect(pilihKasus({ daftar, dimainkan: semua, paksa: null, acak: acakDeret(0.9) })).toBe(C);
  });
});

describe('pilihKasus — `?kasus=` memaksa', () => {
  it('kasus yang disebut menang atas keacakan dan atas daftar dimainkan', () => {
    const daftar = [A, B, C];
    const pilih = pilihKasus({
      daftar,
      dimainkan: ['aa-2026-01-01', 'bb-2026-02-02', 'cc-2026-03-03'],
      paksa: 'aa-2026-01-01',
      acak: acakDeret(0.9),
    });
    expect(pilih).toBe(A);
  });

  it('nilai tak dikenal DIABAIKAN, bukan membuat layar kosong', () => {
    const daftar = [A, B];
    const pilih = pilihKasus({ daftar, dimainkan: [], paksa: 'zz-1999-01-01', acak: acakDeret(0) });
    expect(pilih).toBe(A);
  });
});

describe('pilihKasus — daftar kosong', () => {
  it('melempar dengan sebab yang terbaca, bukan mengembalikan undefined', () => {
    expect(() => pilihKasus({ daftar: [], dimainkan: [], paksa: null, acak: acakDeret(0) })).toThrow(
      /kasus/i,
    );
  });
});

describe('kasusBerikut — "Mau coba kasus lain"', () => {
  it('membuka kasus pertama yang belum dimainkan', () => {
    expect(kasusBerikut([A, B, C], ['aa-2026-01-01'])).toBe(B);
  });

  it('null kalau semuanya sudah dimainkan — di situlah pesan penutup tampil', () => {
    expect(kasusBerikut([A, B], ['aa-2026-01-01', 'bb-2026-02-02'])).toBeNull();
  });

  it('satu kasus yang sudah dimainkan: null, bukan kasus itu lagi', () => {
    expect(kasusBerikut([A], ['aa-2026-01-01'])).toBeNull();
  });
});
