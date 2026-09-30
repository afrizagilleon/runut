/**
 * M3.16 — sorotan pemandu: hitungan lubang, klip lapisan, dan siapa yang
 * disembunyikan dari pembaca layar. Semua fungsi murni; peramban yang melukis
 * mengujinya lagi di `e2e/sorotan.spec.ts`.
 */
import { describe, expect, it } from 'vitest';
import {
  JARAK_LUBANG,
  klipSelubung,
  lubangDari,
  simpulDisembunyikan,
  type Kotak,
  type Simpul,
} from './sorotan.ts';
import { langkahTampilan, tampilanAwal, type KeadaanTampilan } from './tampilan.ts';

const BATAS = { lebar: 360, tinggi: 2000 };

function kotak(kiri: number, atas: number, kanan: number, bawah: number): Kotak {
  return { kiri, atas, kanan, bawah };
}

describe('lubangDari', () => {
  it('satu sasaran: diperlebar JARAK_LUBANG di keempat sisi', () => {
    expect(lubangDari([kotak(16, 300, 344, 500)], BATAS)).toEqual(
      kotak(16 - JARAK_LUBANG, 300 - JARAK_LUBANG, 344 + JARAK_LUBANG, 500 + JARAK_LUBANG),
    );
  });

  it('beberapa sasaran (judul + pilihan): satu lubang yang memuat semuanya', () => {
    const l = lubangDari([kotak(16, 900, 344, 960), kotak(16, 968, 344, 1300)], BATAS);
    expect(l).toEqual(kotak(8, 892, 352, 1308));
  });

  it('dipotong ke batas dokumen: tidak pernah negatif, tidak pernah lebih lebar dari jendela', () => {
    expect(lubangDari([kotak(-20, 2, 400, 1995)], BATAS)).toEqual(kotak(0, 0, 360, 2000));
  });

  it('piksel pecahan dibulatkan KE LUAR (lubang tidak pernah memotong sasaran)', () => {
    const l = lubangDari([kotak(16.4, 300.6, 343.2, 500.1)], BATAS, 0);
    expect(l).toEqual(kotak(16, 300, 344, 501));
  });

  it('tanpa sasaran, atau sasaran tanpa luas: tidak ada lubang', () => {
    expect(lubangDari([], BATAS)).toBeNull();
    expect(lubangDari([kotak(10, 10, 10, 10)], BATAS)).toBeNull();
  });
});

describe('klipSelubung', () => {
  it('evenodd: kotak luar penuh, lalu lubangnya — lima titik tiap cincin', () => {
    expect(klipSelubung(kotak(8, 292, 352, 508))).toBe(
      'polygon(evenodd, 0px 0px, 100% 0px, 100% 100%, 0px 100%, 0px 0px, ' +
        '8px 292px, 352px 292px, 352px 508px, 8px 508px, 8px 292px)',
    );
  });

  it('jumlah titik selalu sama, supaya peralihan antar-langkah bisa dihaluskan', () => {
    const a = klipSelubung(kotak(8, 100, 352, 200)).split(',').length;
    const b = klipSelubung(kotak(0, 0, 360, 2000)).split(',').length;
    expect(a).toBe(b);
  });
});

/* ------------------------------------------------------------------ */
/* Pohon tiruan untuk simpulDisembunyikan                             */
/* ------------------------------------------------------------------ */

interface Tiruan extends Simpul {
  nama: string;
  children: Tiruan[];
  parentElement: Tiruan | null;
}

function simpul(nama: string, ...anak: Tiruan[]): Tiruan {
  const s: Tiruan = { nama, children: anak, parentElement: null };
  for (const a of anak) a.parentElement = s;
  return s;
}

function cari(akar: Tiruan, nama: string): Tiruan {
  if (akar.nama === nama) return akar;
  for (const a of akar.children) {
    try {
      return cari(a, nama);
    } catch {
      /* lanjut */
    }
  }
  throw new Error(`tidak ada ${nama}`);
}

/** body > root > [header, main > section > [pesan, antar, tumpukan, tanya, pilihan, bantuan], sorotan, panel] */
function pohon(): Tiruan {
  return simpul(
    'body',
    simpul(
      'root',
      simpul('header'),
      simpul(
        'main',
        simpul(
          'section',
          simpul('pesan'),
          simpul('antar'),
          simpul('tumpukan', simpul('kartu-1'), simpul('kartu-2')),
          simpul('tanya'),
          simpul('pilihan', simpul('opsi-a'), simpul('opsi-b')),
          simpul('bantuan', simpul('petunjuk'), simpul('cara-main')),
        ),
      ),
      simpul('sorotan'),
      simpul('panel'),
    ),
    simpul('skrip'),
  );
}

function sembunyi(akar: Tiruan, simpan: string[]): string[] {
  return simpulDisembunyikan(
    akar,
    simpan.map((n) => cari(akar, n)),
  )
    .map((s) => s.nama)
    .sort();
}

describe('simpulDisembunyikan', () => {
  it('langkah kartu: yang lain disembunyikan, panel + lapisan + sasaran tidak', () => {
    const akar = pohon();
    expect(sembunyi(akar, ['panel', 'sorotan', 'tumpukan'])).toEqual(
      ['antar', 'bantuan', 'header', 'pesan', 'pilihan', 'skrip', 'tanya'].sort(),
    );
  });

  it('isi sasaran tidak pernah disembunyikan (kartu tetap bisa dibuka)', () => {
    const akar = pohon();
    const h = sembunyi(akar, ['panel', 'sorotan', 'tumpukan']);
    expect(h).not.toContain('kartu-1');
    expect(h).not.toContain('kartu-2');
  });

  it('langkah pilihan: judul dan pilihan sama-sama terbuka', () => {
    const akar = pohon();
    const h = sembunyi(akar, ['panel', 'sorotan', 'tanya', 'pilihan']);
    expect(h).not.toContain('tanya');
    expect(h).not.toContain('pilihan');
    expect(h).toContain('tumpukan');
    expect(h).toContain('bantuan');
  });

  it('langkah petunjuk: hanya tombolnya, saudaranya "Cara main" disembunyikan', () => {
    const akar = pohon();
    const h = sembunyi(akar, ['panel', 'sorotan', 'petunjuk']);
    expect(h).toContain('cara-main');
    expect(h).not.toContain('petunjuk');
    expect(h).not.toContain('bantuan');
  });

  it('panel TIDAK PERNAH disembunyikan, apa pun sasarannya', () => {
    for (const sasaran of ['pesan', 'tumpukan', 'pilihan', 'petunjuk']) {
      const akar = pohon();
      const h = sembunyi(akar, ['panel', 'sorotan', sasaran]);
      expect(h).not.toContain('panel');
      expect(h).not.toContain('root');
      expect(h).not.toContain('body');
    }
  });
});

describe('reducer: petunjuk yang diketuk di dalam sorotan menutup pemandu', () => {
  function diLangkah(n: number): KeadaanTampilan {
    let k = langkahTampilan(tampilanAwal(true), { jenis: 'tiba_di_soal_pertama' });
    for (let i = 0; i < n; i += 1) k = langkahTampilan(k, { jenis: 'lanjut_pemandu' });
    return k;
  }

  it('"Minta petunjuk" di langkah 4: pemandu selesai, kartu ditandai', () => {
    const k = langkahTampilan(diLangkah(3), { jenis: 'minta_petunjuk', soal_id: 's1' });
    expect(k.pemandu.langkah).toBeNull();
    expect(k.petunjuk).toEqual({ soal_id: 's1', ke: 1 });
  });

  it('tanpa pemandu: tidak ada yang berubah selain petunjuknya', () => {
    const awal = tampilanAwal(false);
    const k = langkahTampilan(awal, { jenis: 'minta_petunjuk', soal_id: 's1' });
    expect(k.pemandu).toEqual(awal.pemandu);
  });
});
