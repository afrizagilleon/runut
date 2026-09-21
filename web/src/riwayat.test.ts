import { describe, expect, it } from 'vitest';
import { type Aksi, type Keadaan, keadaanAwal, langkah, namaLayar } from './alur.ts';
import {
  type Tumpukan,
  dorong,
  ganti,
  layarEntri,
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
    tekanKembali() {
      tumpukan = mundurPeramban(tumpukan);
      // Kalau peramban meninggalkan situs, halaman dibongkar: tidak ada
      // `popstate`, tidak ada dispatch.
      if (tumpukan.diLuarSitus) return;
      waktu += 100;
      keadaan = langkah(keadaan, { jenis: 'mundur' }, waktu).keadaan;
      sinkron();
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
