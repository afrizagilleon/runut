import { describe, expect, it } from 'vitest';
import type { Kasus } from '../../factory/skema/tipe.ts';
import { awalBungkus, reduksi, type Bungkus } from './bungkus.ts';

/*
 * M4 D-4. Bungkus adalah lapisan di atas `alur.ts` yang menjawab satu
 * pertanyaan yang tidak bisa dijawab reducer permainan: **kasus mana yang
 * sedang dimainkan, dan apa yang terjadi ketika ia berganti.**
 *
 * Yang paling mudah salah — dan karena itu dites paling keras — adalah antrean
 * peristiwa: `minat_kasus_lain` lahir dari sesi LAMA dan belum tentu sudah
 * terkirim ketika kasusnya berganti. Kalau ia hilang, satu-satunya angka yang
 * mengukur "orang mau kasus lain" hilang bersamanya.
 */

function kasusUji(kasus_id: string, soal: Array<[string, string]>): Kasus {
  return {
    kasus_id,
    soal: soal.map(([soal_id, jawaban]) => ({
      soal_id,
      jawaban,
      kartu: [`kartu-${soal_id}`],
    })),
  } as unknown as Kasus;
}

const DADA = kasusUji('dada-2025-10-08', [
  ['s1', 'b'],
  ['s2', 'a'],
  ['s3', 'c'],
]);
const ULTJ = kasusUji('ultj-2026-05-04', [
  ['u1', 'b'],
  ['u2', 'a'],
]);

const SESI_A = '2f1a1d6c-0000-4000-8000-000000000001';
const SESI_B = '2f1a1d6c-0000-4000-8000-000000000002';

function mulai(bungkus: Bungkus, waktu = 1_000): Bungkus {
  return reduksi(bungkus, { aksi: { jenis: 'mulai', lebar_layar: 360 }, waktu });
}

describe('awalBungkus', () => {
  it('membawa kasusnya sendiri, bukan hanya kasus_id', () => {
    const b = awalBungkus(DADA, SESI_A);
    expect(b.kasus).toBe(DADA);
    expect(b.keadaan.kasus_id).toBe('dada-2025-10-08');
    expect(b.keadaan.sesi).toBe(SESI_A);
  });

  it('urutan soal, kunci jawaban, dan kartu dibaca dari kasus itu', () => {
    const b = awalBungkus(ULTJ, SESI_A);
    expect(b.keadaan.urutanSoal).toEqual(['u1', 'u2']);
    expect(b.keadaan.kunciBenar).toEqual({ u1: 'b', u2: 'a' });
    expect(b.keadaan.kartuSoal).toEqual({ u1: ['kartu-u1'], u2: ['kartu-u2'] });
  });

  it('antrean mulai kosong dan permainan belum dimulai', () => {
    const b = awalBungkus(DADA, SESI_A);
    expect(b.antre).toEqual([]);
    expect(b.keadaan.mulaiPada).toBeNull();
  });
});

describe('reduksi — aksi permainan', () => {
  it('peristiwa masuk antrean dengan sesi dan kasus_id bungkus ini', () => {
    const b = mulai(awalBungkus(DADA, SESI_A));
    expect(b.antre.map((p) => p.nama)).toEqual(['mulai', 'layar_masuk']);
    for (const p of b.antre) {
      expect(p.sesi).toBe(SESI_A);
      expect(p.kasus_id).toBe('dada-2025-10-08');
    }
  });

  it('aksi yang tidak mengubah apa pun mengembalikan bungkus yang sama persis', () => {
    const b = mulai(awalBungkus(DADA, SESI_A));
    const lagi = reduksi(b, { aksi: { jenis: 'mulai', lebar_layar: 360 }, waktu: 2_000 });
    expect(lagi).toBe(b);
  });

  it('`bersihkan` membuang peristiwa terdepan yang sudah diserahkan', () => {
    const b = mulai(awalBungkus(DADA, SESI_A));
    const sisa = reduksi(b, { bersihkan: b.antre.slice(0, 1) });
    expect(sisa.antre.map((p) => p.nama)).toEqual(['layar_masuk']);
    expect(sisa.keadaan).toBe(b.keadaan);
  });
});

describe('reduksi — `kasusBaru`: sesi baru, kasus baru', () => {
  it('kasus, kasus_id, dan urutan soal berganti', () => {
    const b = mulai(awalBungkus(DADA, SESI_A));
    const baru = reduksi(b, { kasusBaru: ULTJ, sesi: SESI_B });
    expect(baru.kasus).toBe(ULTJ);
    expect(baru.keadaan.kasus_id).toBe('ultj-2026-05-04');
    expect(baru.keadaan.urutanSoal).toEqual(['u1', 'u2']);
  });

  it('sesi berganti — kiriman kasus kedua bukan lanjutan sesi pertama', () => {
    const b = mulai(awalBungkus(DADA, SESI_A));
    const baru = reduksi(b, { kasusBaru: ULTJ, sesi: SESI_B });
    expect(baru.keadaan.sesi).toBe(SESI_B);
    expect(baru.keadaan.sesi).not.toBe(b.keadaan.sesi);
  });

  it('permainan mulai dari nol: layar pembuka, belum dimulai, urut kembali ke 0', () => {
    let b = mulai(awalBungkus(DADA, SESI_A));
    b = reduksi(b, { aksi: { jenis: 'lanjut' }, waktu: 2_000 });
    b = reduksi(b, { aksi: { jenis: 'pilih', soal_id: 's1', kunci: 'b' }, waktu: 3_000 });
    b = reduksi(b, { aksi: { jenis: 'minat_kasus_lain' }, waktu: 4_000 });
    expect(b.keadaan.layar).toEqual({ jenis: 'soal', nomor: 0 });
    expect(b.keadaan.urut).toBeGreaterThan(0);

    const baru = reduksi(b, { kasusBaru: ULTJ, sesi: SESI_B });
    expect(baru.keadaan.layar).toEqual({ jenis: 'pembuka' });
    expect(baru.keadaan.mulaiPada).toBeNull();
    expect(baru.keadaan.urut).toBe(0);
    expect(baru.keadaan.minatDitekan).toBe(false);
    expect(baru.keadaan.soal['s1']).toBeUndefined();
  });

  it('peristiwa sesi lama yang BELUM terkirim tidak ikut hilang', () => {
    let b = mulai(awalBungkus(DADA, SESI_A));
    b = reduksi(b, { bersihkan: b.antre });
    b = reduksi(b, { aksi: { jenis: 'minat_kasus_lain' }, waktu: 4_000 });
    expect(b.antre.map((p) => p.nama)).toEqual(['minat_kasus_lain']);

    const baru = reduksi(b, { kasusBaru: ULTJ, sesi: SESI_B });
    expect(baru.antre.map((p) => p.nama)).toEqual(['minat_kasus_lain']);
    // Ia tetap milik sesi dan kasus yang melahirkannya.
    expect(baru.antre[0]?.sesi).toBe(SESI_A);
    expect(baru.antre[0]?.kasus_id).toBe('dada-2025-10-08');
  });

  it('sesudah berganti, `mulai` berikutnya membawa kasus_id yang baru', () => {
    let b = mulai(awalBungkus(DADA, SESI_A));
    b = reduksi(b, { bersihkan: b.antre });
    b = reduksi(b, { kasusBaru: ULTJ, sesi: SESI_B });
    b = mulai(b, 9_000);
    const awal = b.antre.find((p) => p.nama === 'mulai');
    expect(awal?.kasus_id).toBe('ultj-2026-05-04');
    expect(awal?.sesi).toBe(SESI_B);
    expect(awal?.urut).toBe(1);
  });
});

/* ------------------------------------------------------------------ */
/* F-1 (M3.8) — `bersihkan` yang tertunda tidak boleh membuang yang    */
/* belum diserahkan                                                    */
/* ------------------------------------------------------------------ */

describe('reduksi — F-1: urutan terapan-ulang React tidak menghilangkan `mulai` kasus kedua', () => {
  /*
   * Ditemukan e2e M3.8 (E-20e merah 1–3 dari 8 putaran, juga di `da820db`):
   * peristiwa `mulai` sesi kasus KEDUA tidak pernah dikirim, sementara
   * `layar_masuk`-nya (urut 2) tiba. Log `sendBeacon` di halaman menunjukkan
   * kiriman sesi baru hanya berisi `#2:layar_masuk`.
   *
   * Sebabnya: pembersih antrean dikirim sebagai JUMLAH. Pembaruan dari efek
   * (lajur bawaan) dilewati React ketika pembaruan dari klik (lajur sinkron)
   * diproses lebih dulu, lalu semuanya DITERAPKAN ULANG menurut urutan
   * masuknya. Dua `bersihkan` yang masing-masing menghitung dari antrean yang
   * berbeda lalu membuang satu peristiwa lebih banyak dari yang diserahkan —
   * dan yang terbuang adalah `mulai` kasus kedua, yang masuk di antara
   * keduanya. Urutan di bawah ini adalah urutan terapan-ulang itu.
   */
  it('E0 (pembersih lama) · minat · kasusBaru · mulai · E1 → mulai dan layar_masuk sesi baru tetap di antrean', () => {
    let b = mulai(awalBungkus(DADA, SESI_A));
    b = reduksi(b, { bersihkan: b.antre });
    // pointerup: satu ketukan; efek penyerah menyerahkannya dan meminta E0.
    b = reduksi(b, {
      aksi: { jenis: 'ketuk', uid: 'kasus-lain', x: 0.5, y: 0.5, mati: false },
      waktu: 5_000,
    });
    const E0 = { bersihkan: [...b.antre] };
    // klik (lajur sinkron, E0 dilewati): minat + kasus baru. Efek penyerah
    // melihat [ketuk, minat] dan meminta E1.
    const minat = { aksi: { jenis: 'minat_kasus_lain' } as const, waktu: 5_010 };
    const kasusBaru = { kasusBaru: ULTJ, sesi: SESI_B };
    const tampil = reduksi(reduksi(b, minat), kasusBaru);
    const E1 = { bersihkan: [...tampil.antre] };

    // Terapan ulang, urut masuk: E0, minat, kasusBaru, mulai (efek mulai
    // dideklarasikan lebih dulu daripada efek penyerah), E1.
    let r = reduksi(b, E0);
    r = reduksi(r, minat);
    r = reduksi(r, kasusBaru);
    r = mulai(r, 9_000);
    r = reduksi(r, E1);

    expect(r.antre.map((p) => `${p.sesi === SESI_B ? 'B' : 'A'}#${String(p.urut)}:${p.nama}`)).toEqual([
      'B#1:mulai',
      'B#2:layar_masuk',
    ]);
  });
});
