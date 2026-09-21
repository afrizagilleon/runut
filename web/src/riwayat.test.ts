import { describe, expect, it } from 'vitest';
import {
  type Aksi,
  type Keadaan,
  keadaanAwal,
  langkah,
  namaLayar,
  tujuanRiwayat,
} from './alur.ts';
import {
  type Tumpukan,
  dorong,
  ganti,
  layarEntri,
  majuPeramban,
  mundurPeramban,
  perintahRiwayat,
  sesuaikan,
  tumpukanBaru,
} from './riwayat.ts';

const AWAL = {
  sesi: 'sesi-uji',
  kasus_id: 'contoh-2025-10-08',
  urutanSoal: ['s1', 's2', 's3'],
  kunciBenar: { s1: 'b', s2: 'a', s3: 'c' },
  kartuSoal: { s1: ['k1', 'k2'], s2: ['k3', 'k4'], s3: ['k5', 'k6'] },
};

/**
 * Meja uji: reducer sungguhan + tiruan tumpukan peramban, dijalankan persis
 * seperti `Aplikasi.tsx` menjalankannya.
 *
 * - `kirim` = satu `dispatch`, lalu efek riwayat menyesuaikan tumpukan.
 * - `tekanKembali` = peramban memundurkan penunjuknya **lebih dulu**, baru
 *   `popstate` sampai ke aplikasi. Urutan itu penting: ia yang dulu membuat
 *   efek mendorong entri baru di tempat yang salah.
 */
function meja(): {
  kirim: (aksi: Aksi) => void;
  dariRiwayat: () => void;
  tekanMaju: () => void;
  rusakkanEntri: (nama: string) => void;
  tekanKembali: () => void;
  layar: () => string;
  tumpukan: () => Tumpukan;
  diLuarSitus: () => boolean;
} {
  let keadaan: Keadaan = keadaanAwal(AWAL);
  let tumpukan = tumpukanBaru();
  let waktu = 1_000;

  const sinkron = (): void => {
    tumpukan = sesuaikan(tumpukan, namaLayar(keadaan.layar));
  };
  // Pemasangan pertama: satu `replaceState`.
  sinkron();

  return {
    kirim(aksi) {
      waktu += 100;
      keadaan = langkah(keadaan, aksi, waktu).keadaan;
      sinkron();
    },
    /*
     * Tiruan penangan `popstate` di `Aplikasi.tsx`, langkah demi langkah:
     * baca nama layar dari entri yang kini aktif, tanyakan `tujuanRiwayat`
     * apakah perpindahannya sah, lalu dispatch — atau, kalau tidak sah,
     * pertahankan layar kini dan ganti entrinya. Kalau modelnya tidak
     * menirukan komponennya, ia menguji hal lain.
     */
    dariRiwayat() {
      const nama = layarEntri(tumpukan);
      if (nama === null) return;
      if (tujuanRiwayat(keadaan, nama) === null) {
        tumpukan = ganti(tumpukan, namaLayar(keadaan.layar));
        return;
      }
      waktu += 100;
      keadaan = langkah(keadaan, { jenis: 'riwayat_ke', nama }, waktu).keadaan;
      sinkron();
    },
    tekanKembali() {
      tumpukan = mundurPeramban(tumpukan);
      // Kalau peramban meninggalkan situs, halaman dibongkar: tidak ada
      // `popstate`, tidak ada dispatch.
      if (tumpukan.diLuarSitus) return;
      this.dariRiwayat();
    },
    /** Tombol maju peramban (A-1, cacat C-1). */
    tekanMaju() {
      tumpukan = majuPeramban(tumpukan);
      this.dariRiwayat();
    },
    /** Menulis nama lain ke entri yang aktif, menirukan `state` yang rusak. */
    rusakkanEntri(nama: string) {
      tumpukan = ganti(tumpukan, nama);
    },
    layar: () => namaLayar(keadaan.layar),
    tumpukan: () => tumpukan,
    diLuarSitus: () => tumpukan.diLuarSitus,
  };
}

/** Maju satu soal: pilih, kunci, lanjut. */
function tuntaskan(m: ReturnType<typeof meja>, soal_id: string, kunci: string): void {
  m.kirim({ jenis: 'pilih', soal_id, kunci });
  m.kirim({ jenis: 'kunci_jawaban', soal_id });
  m.kirim({ jenis: 'lanjut' });
}

/** Sampai layar Soal 3, lewat jalur yang sama dengan pemain. */
function sampaiSoal3(): ReturnType<typeof meja> {
  const m = meja();
  m.kirim({ jenis: 'mulai', lebar_layar: 375 });
  m.kirim({ jenis: 'lanjut' });
  tuntaskan(m, 's1', 'b');
  tuntaskan(m, 's2', 'a');
  return m;
}

describe('perintahRiwayat', () => {
  it('mengganti entri pertama, bukan mendorong — supaya kembali di layar pertama keluar dari situs', () => {
    expect(perintahRiwayat(null, 'pembuka')).toBe('ganti');
  });

  it('mendorong entri baru kalau pemain maju ke layar lain', () => {
    expect(perintahRiwayat('soal-1', 'soal-2')).toBe('dorong');
  });

  it('DIAM kalau peramban sudah berada di entri yang benar — ini inti cacat A4-T1', () => {
    expect(perintahRiwayat('soal-2', 'soal-2')).toBe('diam');
  });
});

describe('tiruan tumpukan peramban', () => {
  it('dorong membuang entri di depan penunjuk, seperti pushState sungguhan', () => {
    let t = ganti(tumpukanBaru(), 'a');
    t = dorong(t, 'b');
    t = dorong(t, 'c');
    t = mundurPeramban(t);
    expect(layarEntri(t)).toBe('b');
    t = dorong(t, 'z');
    expect(t.entri).toEqual(['a', 'b', 'z']);
    expect(t.indeks).toBe(2);
  });

  it('mundur dari entri pertama meninggalkan situs', () => {
    const t = mundurPeramban(ganti(tumpukanBaru(), 'pembuka'));
    expect(t.diLuarSitus).toBe(true);
  });

  it('ganti tidak menambah panjang tumpukan', () => {
    const t = ganti(ganti(tumpukanBaru(), 'a'), 'b');
    expect(t.entri).toEqual(['b']);
  });
});

describe('A4-T1 — kembali berturut-turut dari Soal 3', () => {
  it('menyusun satu entri per layar, tanpa kembar', () => {
    const m = sampaiSoal3();
    expect(m.layar()).toBe('soal-3');
    expect(m.tumpukan().entri).toEqual(['pembuka', 'soal-1', 'soal-2', 'soal-3']);
    expect(m.tumpukan().indeks).toBe(3);
  });

  it('kembali tiga kali mendarat di Soal 2, Soal 1, Pembuka — yang KEEMPAT baru keluar', () => {
    const m = sampaiSoal3();
    const jejak: string[] = [];

    for (let i = 0; i < 3; i += 1) {
      m.tekanKembali();
      // Layar aplikasi DAN entri riwayat di bawahnya, dua-duanya. Memeriksa
      // layarnya saja tidak cukup: layar datang dari reducer, entri datang dari
      // peramban, dan cacat A4-T1 justru lahir ketika keduanya berpisah diam-diam.
      jejak.push(`${m.layar()} @ ${String(layarEntri(m.tumpukan()))}`);
    }
    expect(jejak).toEqual([
      'soal-2 @ soal-2',
      'soal-1 @ soal-1',
      'pembuka @ pembuka',
    ]);
    expect(m.diLuarSitus()).toBe(false);

    m.tekanKembali();
    expect(m.diLuarSitus()).toBe(true);
  });

  it('tidak mendorong entri baru saat mundur — panjang tumpukan tidak pernah bertambah', () => {
    const m = sampaiSoal3();
    const sebelum = m.tumpukan().entri.length;
    m.tekanKembali();
    m.tekanKembali();
    expect(m.tumpukan().entri).toEqual(['pembuka', 'soal-1', 'soal-2', 'soal-3']);
    expect(m.tumpukan().entri.length).toBe(sebelum);
    expect(m.tumpukan().indeks).toBe(1);
  });
});

describe('A4-T1 — maju lagi sesudah mundur', () => {
  it('mundur dua kali, maju lagi dengan Lanjut, lalu mundur tiga kali', () => {
    const m = sampaiSoal3();

    m.tekanKembali();
    m.tekanKembali();
    expect(m.layar()).toBe('soal-1');

    // Soal 1 sudah terkunci, jadi "Lanjut" sah dan membawa ke Soal 2.
    m.kirim({ jenis: 'lanjut' });
    expect(m.layar()).toBe('soal-2');
    // pushState memotong 'soal-3' yang ada di depan penunjuk — persis seperti
    // peramban sungguhan.
    expect(m.tumpukan().entri).toEqual(['pembuka', 'soal-1', 'soal-2']);

    const jejak: string[] = [];
    for (let i = 0; i < 3; i += 1) {
      m.tekanKembali();
      jejak.push(m.diLuarSitus() ? '(keluar situs)' : m.layar());
    }
    expect(jejak).toEqual(['soal-1', 'pembuka', '(keluar situs)']);
  });

  it('maju ke layar yang sama dengan entri aktif tidak menambah entri', () => {
    const m = sampaiSoal3();
    const sebelum = m.tumpukan().entri.length;
    // `lihat_balik` ke soal yang sedang ditampilkan ditolak reducer; layarnya
    // tidak berubah, jadi riwayatnya juga tidak boleh berubah.
    m.kirim({ jenis: 'lihat_balik', nomor: 2 });
    expect(m.layar()).toBe('soal-3');
    expect(m.tumpukan().entri.length).toBe(sebelum);
  });
});

describe('A4-T1 — dari layar Pembukaan dan layar akhir', () => {
  function sampaiAkhir(): ReturnType<typeof meja> {
    const m = sampaiSoal3();
    tuntaskan(m, 's3', 'c'); // lanjut ketiga membawa ke Pembukaan
    m.kirim({ jenis: 'lanjut' }); // Pembukaan → akhir
    return m;
  }

  it('dari Pembukaan: mundur berturut-turut menyusuri soal sampai Pembuka', () => {
    const m = sampaiSoal3();
    tuntaskan(m, 's3', 'c');
    expect(m.layar()).toBe('pembukaan');
    expect(m.tumpukan().entri).toEqual([
      'pembuka',
      'soal-1',
      'soal-2',
      'soal-3',
      'pembukaan',
    ]);

    const jejak: string[] = [];
    for (let i = 0; i < 5; i += 1) {
      m.tekanKembali();
      jejak.push(m.diLuarSitus() ? '(keluar situs)' : m.layar());
    }
    expect(jejak).toEqual(['soal-3', 'soal-2', 'soal-1', 'pembuka', '(keluar situs)']);
  });

  it('dari layar akhir: enam kembali, yang keenam baru meninggalkan situs', () => {
    const m = sampaiAkhir();
    expect(m.layar()).toBe('akhir');
    expect(m.tumpukan().entri).toEqual([
      'pembuka',
      'soal-1',
      'soal-2',
      'soal-3',
      'pembukaan',
      'akhir',
    ]);

    const jejak: string[] = [];
    for (let i = 0; i < 6; i += 1) {
      m.tekanKembali();
      jejak.push(m.diLuarSitus() ? '(keluar situs)' : m.layar());
    }
    expect(jejak).toEqual([
      'pembukaan',
      'soal-3',
      'soal-2',
      'soal-1',
      'pembuka',
      '(keluar situs)',
    ]);
  });

  it('layar aplikasi dan entri riwayat aktif selalu sama, di setiap langkah', () => {
    const m = sampaiAkhir();
    const beda: string[] = [];
    for (let i = 0; i < 5; i += 1) {
      m.tekanKembali();
      if (m.diLuarSitus()) break;
      if (layarEntri(m.tumpukan()) !== m.layar()) {
        beda.push(`entri=${String(layarEntri(m.tumpukan()))} layar=${m.layar()}`);
      }
    }
    expect(beda).toEqual([]);
  });
});

/**
 * A-1, cacat C-1: tombol **maju**.
 *
 * Model murni yang dijalankan persis seperti `Aplikasi.tsx` menjalankannya —
 * peramban memindahkan penunjuknya lebih dulu, lalu `popstate` membawa nama
 * layar tujuan ke aplikasi.
 */
describe('A1-T2 — tombol maju peramban', () => {
  it('majuPeramban di entri terdepan tidak melakukan apa-apa, dan TIDAK keluar situs', () => {
    const m = sampaiSoal3();
    const sebelum = m.tumpukan();
    m.tekanMaju();
    expect(m.tumpukan().indeks).toBe(sebelum.indeks);
    expect(m.layar()).toBe('soal-3');
    expect(m.diLuarSitus()).toBe(false);
  });

  it('maju–mundur–maju: layar dan entri aktif selalu sama', () => {
    const m = sampaiSoal3();
    const jejak: string[] = [];
    const catat = (): void => {
      jejak.push(`${m.layar()}|${String(layarEntri(m.tumpukan()))}`);
    };
    catat();
    m.tekanKembali();
    catat();
    m.tekanMaju();
    catat();
    m.tekanKembali();
    catat();
    expect(jejak).toEqual([
      'soal-3|soal-3',
      'soal-2|soal-2',
      'soal-3|soal-3',
      'soal-2|soal-2',
    ]);
  });

  it('mundur ×3 lalu maju ×3 kembali ke soal-3, tanpa menambah entri', () => {
    const m = sampaiSoal3();
    const panjangAwal = m.tumpukan().entri.length;

    m.tekanKembali();
    m.tekanKembali();
    m.tekanKembali();
    expect(m.layar()).toBe('pembuka');

    m.tekanMaju();
    expect(m.layar()).toBe('soal-1');
    m.tekanMaju();
    expect(m.layar()).toBe('soal-2');
    m.tekanMaju();
    expect(m.layar()).toBe('soal-3');

    expect(
      m.tumpukan().entri.length,
      'maju-mundur tidak boleh menambah satu entri pun',
    ).toBe(panjangAwal);
    expect(layarEntri(m.tumpukan())).toBe('soal-3');
  });

  it('sesudah maju sampai ujung, kembali masih berjalan normal', () => {
    const m = sampaiSoal3();
    m.tekanKembali();
    m.tekanKembali();
    m.tekanMaju();
    m.tekanMaju();
    expect(m.layar()).toBe('soal-3');
    m.tekanKembali();
    expect(m.layar()).toBe('soal-2');
    m.tekanKembali();
    expect(m.layar()).toBe('soal-1');
    m.tekanKembali();
    expect(m.layar()).toBe('pembuka');
    // Dan yang berikutnya barulah meninggalkan situs.
    m.tekanKembali();
    expect(m.diLuarSitus()).toBe(true);
  });

  it('entri riwayat yang RUSAK: layar kini dipertahankan dan entrinya diganti', () => {
    const m = sampaiSoal3();
    m.rusakkanEntri('soal-99');
    expect(layarEntri(m.tumpukan())).toBe('soal-99');
    m.dariRiwayat();
    expect(m.layar(), 'layarnya tidak bergerak').toBe('soal-3');
    expect(layarEntri(m.tumpukan()), 'entrinya diperbaiki, bukan didorong').toBe('soal-3');
    expect(m.tumpukan().entri.length).toBe(4);
  });

  it('entri riwayat KOSONG diperlakukan sama: diganti, bukan didorong', () => {
    const m = sampaiSoal3();
    const panjang = m.tumpukan().entri.length;
    m.rusakkanEntri('');
    m.dariRiwayat();
    expect(m.layar()).toBe('soal-3');
    expect(layarEntri(m.tumpukan())).toBe('soal-3');
    expect(m.tumpukan().entri.length).toBe(panjang);
  });

  it('maju ke layar yang BELUM pernah dicapai ditolak, entrinya diperbaiki', () => {
    // Pemain baru di soal-1; sebuah entri "pembukaan" diselipkan di depannya.
    const m = meja();
    m.kirim({ jenis: 'mulai', lebar_layar: 375 });
    m.kirim({ jenis: 'lanjut' });
    m.rusakkanEntri('pembukaan');
    m.dariRiwayat();
    expect(m.layar(), 'tidak ada jalan pintas ke pembukaan').toBe('soal-1');
    expect(layarEntri(m.tumpukan())).toBe('soal-1');
  });
});
