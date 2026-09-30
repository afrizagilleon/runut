/**
 * M3.14 D-1 — pemandu pengguna baru, sebagai reducer murni (`tampilan.ts`).
 *
 * Kegagalan yang dijaga kontrak dengan nama: pemandu yang tampil untuk orang
 * yang sudah pernah datang, pemandu yang tidak bisa dilewati, pemandu yang
 * menambah langkah sebelum pemain bisa bermain, dan kata pemandu yang
 * membocorkan kunci.
 */
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import type { Kasus } from '../../factory/skema/tipe.ts';
import { teksPolos } from '../../factory/skema/rujukan.ts';
import {
  LABEL_PETUNJUK_KARTU,
  LABEL_TOMBOL_PETUNJUK,
  LANGKAH_PEMANDU,
  kartuDitandai,
  kartuPetunjuk,
  petunjukAktif,
  kodePemandu,
  langkahTampilan,
  langkahTerakhir,
  nomorLangkah,
  pemanduOtomatis,
  sorotPemandu,
  tampilanAwal,
  type AksiTampilan,
  type KeadaanTampilan,
} from './tampilan.ts';

const AKAR = fileURLToPath(new URL('../../', import.meta.url));
const KASUS: Kasus[] = ['dada-2025-10-08', 'ultj-2026-05-04'].map(
  (id) => JSON.parse(readFileSync(`${AKAR}cases/${id}.json`, 'utf8')) as Kasus,
);

function jalankan(k: KeadaanTampilan, ...aksi: AksiTampilan[]): KeadaanTampilan {
  return aksi.reduce(langkahTampilan, k);
}

describe('siapa yang dipandu (D-1: pengunjung baru saja)', () => {
  it('kunjungan pertama → pemandu berjalan sendiri', () => {
    expect(pemanduOtomatis(1, null)).toBe(true);
  });
  it('kunjungan kedua dan seterusnya → tidak', () => {
    expect(pemanduOtomatis(2, null)).toBe(false);
    expect(pemanduOtomatis(40, null)).toBe(false);
  });
  it('penyimpanan tidak bisa dipakai (null) tidak ditebak sebagai orang baru', () => {
    expect(pemanduOtomatis(null, null)).toBe(false);
  });
  it('?pemandu=0 mematikan, ?pemandu=1 memaksa', () => {
    expect(pemanduOtomatis(1, '0')).toBe(false);
    expect(pemanduOtomatis(null, '1')).toBe(true);
    expect(pemanduOtomatis(7, '1')).toBe(true);
  });
  it('kodePemandu hanya mengenal 0 dan 1', () => {
    expect(kodePemandu('?pemandu=0')).toBe('0');
    expect(kodePemandu('?k=abc&pemandu=1&kasus=x')).toBe('1');
    expect(kodePemandu('?pemandu=ya')).toBeNull();
    expect(kodePemandu('')).toBeNull();
  });
});

describe('alur pemandu', () => {
  it('pengunjung baru: tiba di soal pertama → langkah 1 dari 4, sorot omongan', () => {
    const k = jalankan(tampilanAwal(true), { jenis: 'tiba_di_soal_pertama' });
    expect(k.pemandu.langkah).toBe(0);
    expect(nomorLangkah(k)).toBe('1 dari 4');
    expect(sorotPemandu(k)).toBe('omongan');
  });

  it('pengunjung lama: tiba di soal pertama → tidak ada pemandu', () => {
    const k = jalankan(tampilanAwal(false), { jenis: 'tiba_di_soal_pertama' });
    expect(k.pemandu.langkah).toBeNull();
    expect(sorotPemandu(k)).toBeNull();
  });

  it('urutan sorotan = urutan kontrak: omongan → kartu → penentu (petunjuk) → pilihan', () => {
    let k = jalankan(tampilanAwal(true), { jenis: 'tiba_di_soal_pertama' });
    const urutan: Array<string | null> = [];
    for (let i = 0; i < 4; i += 1) {
      urutan.push(sorotPemandu(k));
      k = langkahTampilan(k, { jenis: 'lanjut_pemandu' });
    }
    expect(urutan).toEqual(['omongan', 'kartu', 'penentu', 'pilihan']);
    expect(k.pemandu.langkah, 'langkah keempat menutup pemandu').toBeNull();
  });

  it('langkah terakhir dikenali (tombolnya "Mulai menjawab")', () => {
    const k = jalankan(
      tampilanAwal(true),
      { jenis: 'tiba_di_soal_pertama' },
      { jenis: 'lanjut_pemandu' },
      { jenis: 'lanjut_pemandu' },
      { jenis: 'lanjut_pemandu' },
    );
    expect(langkahTerakhir(k)).toBe(true);
  });

  it('bisa dilewati dari langkah mana pun, dan tidak kembali sendiri di pemuatan yang sama', () => {
    for (let lompat = 0; lompat < 4; lompat += 1) {
      let k = jalankan(tampilanAwal(true), { jenis: 'tiba_di_soal_pertama' });
      for (let i = 0; i < lompat; i += 1) k = langkahTampilan(k, { jenis: 'lanjut_pemandu' });
      k = langkahTampilan(k, { jenis: 'lewati_pemandu' });
      expect(k.pemandu.langkah).toBeNull();
      k = langkahTampilan(k, { jenis: 'tiba_di_soal_pertama' });
      expect(k.pemandu.langkah, 'tiba lagi (mis. simulasi kedua) tidak membuka pemandu lagi').toBeNull();
    }
  });

  it('memilih jawaban menutup pemandu: pemain sudah bermain', () => {
    const k = jalankan(tampilanAwal(true), { jenis: 'tiba_di_soal_pertama' }, { jenis: 'pemain_memilih' });
    expect(k.pemandu.langkah).toBeNull();
  });

  it('"Cara main" membuka lagi dari langkah pertama, juga untuk pengunjung lama', () => {
    const k = jalankan(tampilanAwal(false), { jenis: 'buka_pemandu' });
    expect(k.pemandu.langkah).toBe(0);
  });

  it('soal pemanasan: dipilih, dikunci, selesai → pemandu tertutup, soal 1 tanpa pemandu', () => {
    let k = jalankan(tampilanAwal(true), { jenis: 'mulai_pemanasan' }, { jenis: 'tiba_di_soal_pertama' });
    expect(k.pemanasan.aktif).toBe(true);
    expect(k.pemandu.langkah).toBe(0);
    k = jalankan(k, { jenis: 'kunci_pemanasan' });
    expect(k.pemanasan.dikunci, 'belum memilih = belum bisa dikunci').toBe(false);
    k = jalankan(k, { jenis: 'pilih_pemanasan', kunci: 'b' }, { jenis: 'kunci_pemanasan' });
    expect(k.pemanasan).toEqual({ aktif: true, kunci: 'b', dikunci: true });
    expect(k.pemandu.langkah, 'memilih di pemanasan menutup pemandu').toBeNull();
    k = jalankan(k, { jenis: 'pilih_pemanasan', kunci: 'a' });
    expect(k.pemanasan.kunci, 'sesudah dikunci pilihan tidak berubah').toBe('b');
    k = jalankan(k, { jenis: 'selesai_pemanasan' }, { jenis: 'tiba_di_soal_pertama' });
    expect(k.pemanasan.aktif).toBe(false);
    expect(k.pemandu.langkah).toBeNull();
  });
});

describe('kata pemandu', () => {
  const semua = LANGKAH_PEMANDU.map((l) => l.teks).join(' ');

  it('pendek: ≤ 70 kata seluruhnya (±30 detik baca, D-1)', () => {
    expect(semua.split(/\s+/).length).toBeLessThanOrEqual(70);
  });

  it('empat langkah, tidak satu pun menyorot pilihan satu per satu', () => {
    expect(LANGKAH_PEMANDU).toHaveLength(4);
    expect(LANGKAH_PEMANDU.map((l) => l.sasaran)).not.toContain('opsi');
  });

  it('tidak memuat potongan empat kata dari pilihan atau penjelasan soal mana pun', () => {
    const teksPemandu = `${semua} ${LABEL_PETUNJUK_KARTU}`.toLowerCase();
    for (const kasus of KASUS) {
      for (const soal of kasus.soal) {
        const bahan = [...soal.pilihan.map((p) => teksPolos(p.teks)), teksPolos(soal.penjelasan)];
        for (const kalimat of bahan) {
          const kata = kalimat.toLowerCase().replace(/[.,!?:;"“”()]/g, ' ').split(/\s+/).filter((x) => x !== '');
          for (let i = 0; i + 4 <= kata.length; i += 1) {
            const tiga = kata.slice(i, i + 4).join(' ');
            expect(teksPemandu.includes(tiga), `"${tiga}" dari ${soal.soal_id}`).toBe(false);
          }
        }
      }
    }
  });
});

describe('petunjuk (D-2)', () => {
  it('menunjuk kartu_penentu yang ada di layar soal itu — tidak pernah pilihan', () => {
    for (const kasus of KASUS) {
      for (const soal of kasus.soal) {
        const ditunjuk = kartuPetunjuk(soal);
        expect(ditunjuk.length, soal.soal_id).toBeGreaterThan(0);
        expect(ditunjuk.every((id) => soal.kartu.includes(id))).toBe(true);
        expect(ditunjuk.sort()).toEqual([...soal.kartu_penentu].sort());
        for (const p of soal.pilihan) expect(ditunjuk).not.toContain(p.kunci);
      }
    }
  });

  it('tekanan menaikkan hitungan (tekanan kedua menggulir lagi); pindah layar menutup', () => {
    let k = jalankan(tampilanAwal(false), { jenis: 'minta_petunjuk', soal_id: 's1' });
    expect(k.petunjuk).toEqual({ soal_id: 's1', ke: 1 });
    expect(petunjukAktif(k, 's1')).toBe(true);
    expect(petunjukAktif(k, 's2')).toBe(false);
    k = jalankan(k, { jenis: 'minta_petunjuk', soal_id: 's1' });
    expect(k.petunjuk?.ke).toBe(2);
    k = jalankan(k, { jenis: 'tutup_petunjuk' });
    expect(k.petunjuk).toBeNull();
  });

  it('sesudah dikunci tidak ada kartu yang ditandai', () => {
    const soal = KASUS[0]?.soal[0];
    if (soal === undefined) throw new Error('butuh soal');
    const k = jalankan(tampilanAwal(false), { jenis: 'minta_petunjuk', soal_id: soal.soal_id });
    expect([...kartuDitandai(k, soal, false)]).toEqual(soal.kartu_penentu);
    expect(kartuDitandai(k, soal, true).size).toBe(0);
    expect(kartuDitandai(undefined, soal, false).size).toBe(0);
  });

  it('kata petunjuk netral: tanpa huruf kunci, tanpa potongan pilihan, penjelasan, atau isi kartu', () => {
    const kata = `${LABEL_TOMBOL_PETUNJUK} ${LABEL_PETUNJUK_KARTU}`.toLowerCase();
    expect(kata).not.toMatch(/\b(betul|keliru|benar|salah|jawaban(nya)? [a-d])\b/);
    for (const kasus of KASUS) {
      for (const soal of kasus.soal) {
        const kartuTeks = soal.kartu_penentu.map((id) => kasus.fakta.find((f) => f.fact_id === id)?.awam?.isi ?? '');
        const bahan = [...soal.pilihan.map((p) => p.teks), soal.penjelasan, ...kartuTeks].map((x) =>
          teksPolos(x).toLowerCase(),
        );
        for (const kalimat of bahan) {
          const k = kalimat.replace(/[.,!?:;"“”()]/g, ' ').split(/\s+/).filter((x) => x !== '');
          for (let i = 0; i + 3 <= k.length; i += 1) {
            expect(kata.includes(k.slice(i, i + 3).join(' ')), `${soal.soal_id}: ${k.slice(i, i + 3).join(' ')}`).toBe(false);
          }
        }
      }
    }
  });
});
