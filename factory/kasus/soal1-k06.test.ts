/**
 * M3.9 D-4 (RQ-04): isi soal 1 varian A uji K-06, **disalin persis dari kontrak**.
 *
 * Kata-kata di bawah bukan selera siapa pun: tiap frasa sudah diuji tebak buta
 * (K-05/K-06), dan satu kata yang diubah "sedikit" bisa membalik hasilnya —
 * soal 1 ULTJ yang hidup ternyata bisa ditebak tanpa kartu (3/3), versi di
 * bawah lolos 0/3. Jadi yang dijaga di sini adalah kesamaan huruf demi huruf
 * antara berkas kasus HASIL BANGUN dan salinan kontraknya, bukan "mirip".
 *
 * Teks dibandingkan sesudah penanda `[[fact_id|teks]]` dilepas (`teksPolos`),
 * karena kontrak menulis kalimat yang dibaca pemain; penandanya dijaga
 * terpisah, per fakta, supaya angka yang dibaca pemain menunjuk dokumen yang
 * benar.
 *
 * Dan satu penjaga kedua: soal 2 dan 3 kedua kasus **tidak disentuh**. Sidik
 * di bawah dihitung dari berkas kasus di `dabc82a` (dasar M3.9), atas soal 2–3
 * dan atas seluruh fakta yang menjadi kartunya.
 */
import { createHash } from 'node:crypto';
import { existsSync, readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { ambilRujukan, teksPolos } from '../skema/rujukan.ts';
import type { Kasus, Soal } from '../skema/tipe.ts';
import { bangunKasusUmum } from './bangun.ts';
import { keJson } from './json.ts';
import { ULTJ_2026_05_04 } from './ultj-2026-05-04.ts';
import { muatGudangBeku } from '../muat/gudang-beku.ts';

const AKAR = fileURLToPath(new URL('../../', import.meta.url));

function muat(kasus_id: string): Kasus {
  return JSON.parse(readFileSync(`${AKAR}cases/${kasus_id}.json`, 'utf8')) as unknown as Kasus;
}

function soalPertama(kasus: Kasus): Soal {
  const soal = kasus.soal[0];
  if (soal === undefined) throw new Error(`${kasus.kasus_id} tidak punya soal`);
  return soal;
}

function awam(kasus: Kasus, fact_id: string): { kepala: string; isi: string } {
  const teks = kasus.fakta.find((f) => f.fact_id === fact_id)?.awam;
  if (teks === undefined || teks === null) throw new Error(`${fact_id} tidak punya teks kartu`);
  return teks;
}

function sidik(teks: string): string {
  return createHash('sha256').update(teks).digest('hex');
}

/* --- salinan kontrak M3.9 D-4, huruf demi huruf -------------------------- */

const DADA = {
  pesan: 'Saham D naik 22 kali! Pasti mau dibeli investor asing, bursa udah umumin.',
  kartu: ['susp-2025-06-30', 'kelipatan-2025-08-01-2025-10-08'],
  susp: {
    kepala: 'Pengumuman bursa · 30 Jun 2025',
    isi:
      'Bursa menyetop sementara jual-beli saham ini: laporan keuangan tahunannya belum ' +
      'diserahkan. Per 1 Agustus dibuka lagi.',
  },
  kelipatan: {
    kepala: 'Dihitung dari data harga',
    isi: 'Rp8 pada 1 Agustus, Rp178 hari ini: naik 22 kali.',
  },
  pilihan: [
    ['a', 'Betul, pengumuman bursanya soal investor asing.'],
    ['b', 'Keliru, pengumumannya soal laporan keuangan telat.'],
    ['c', 'Betul, pengumuman itu yang bikin harganya naik 22 kali.'],
    ['d', 'Keliru, pengumumannya soal harga yang naik terlalu cepat.'],
  ],
  penjelasan:
    'Bursa memang pernah mengumumkan sesuatu, tetapi isinya lain dari yang dikira Bayu: ' +
    'jual-beli disetop karena laporan keuangan tahunan belum diserahkan. Tidak ada kata ' +
    '"investor asing" di kartu mana pun. Kartu harga hanya memberi tahu bahwa harganya naik ' +
    '22 kali, bukan kenapa. Salah-kaprah yang umum: menganggap harga yang naik sebagai ' +
    'semacam pengumuman, lalu mencocokkannya dengan kabar yang sedang ramai.',
} as const;

const ULTJ = {
  pesan: 'Saham U dibuka anjlok Rp145, padahal dividennya Rp45. Pasti ada kabar buruk!',
  kartu: ['div-2026-05-04', 'turun-2026-05-04'],
  div: {
    // Tanpa "ex" (keputusan reviewer 24 Sep sesudah K-06).
    kepala: 'Pengumuman dividen · 4 Mei 2026',
    isi: 'Dividen tunai Rp130 per lembar. Pembeli mulai hari ini tidak kebagian.',
  },
  turun: {
    kepala: 'Dihitung dari data harga',
    isi: 'Hari ini dibuka Rp145 di bawah penutupan terakhir.',
  },
  /** "arti versi hidup dipakai apa adanya" — disalin dari berkas di dabc82a. */
  istilah: [
    {
      kata: 'Tanggal ex',
      arti:
        'Mulai tanggal ini pembeli baru tidak lagi kebagian dividen yang sudah diumumkan; ' +
        'yang sudah pegang sebelumnya tetap kebagian. Uang sebesar dividen itu keluar dari ' +
        'kas perusahaan pada rangkaian tanggal ini, jadi harga per lembarnya menyesuaikan.',
    },
  ],
  pilihan: [
    ['a', 'Betul, dividennya memang cuma Rp45 per lembar.'],
    ['b', 'Keliru, dividennya Rp130, bukan Rp45.'],
    ['c', 'Betul, turunnya lebih dari tiga kali dividennya.'],
    ['d', 'Keliru, dividennya Rp160, bukan Rp45.'],
  ],
  penjelasan:
    'Nadia memakai angka yang keliru: dividen yang tanggal ex-nya hari ini Rp130 per lembar, ' +
    'bukan Rp45. Turunnya Rp145 hanya Rp15 lebih besar dari dividen itu (penutupan terakhir ' +
    'Rp1.690, pembukaan hari ini Rp1.545). Pada tanggal ex, uang sebesar dividen berpindah dari ' +
    'perusahaan ke pemilik saham, jadi harga per lembarnya menyesuaikan. Yang tidak dikatakan ' +
    'kartu mana pun: apakah sisa Rp15 itu punya sebab. Salah-kaprah yang umum: mencari kabar ' +
    'buruk untuk setiap penurunan harga sebelum mencocokkan angkanya dengan dokumen hari itu.',
} as const;

/* --- sidik soal 2–3 di dasar `dabc82a` ----------------------------------- */

const SIDIK_DASAR: Record<string, { soal23: string; kartu23: string }> = {
  'dada-2025-10-08': {
    soal23: '4b8fe1d380e446465c916a4d1f06f3f707b613c0fb91beabf9b669e6df9b6f89',
    kartu23: '01f337c73a07a3ed89021d087c97c95faa66d2856ecd27afb29e1773c047b7a1',
  },
  'ultj-2026-05-04': {
    soal23: '84386f0bbc464bce18fc7c631aa85afb13f5c87cf681885be0ef41f1c75491d1',
    kartu23: '4e82ef87faf6761b2df662f0f61b4b571ea3773d779c0cc0a2f2168b1f6dbf24',
  },
};

describe('M3.9 D-4 — soal 1 DADA sama persis dengan kontrak', () => {
  const kasus = muat('dada-2025-10-08');
  const soal = soalPertama(kasus);

  it('pesan Bayu 19.38, huruf demi huruf', () => {
    expect(soal.pesan).toEqual({ nama: 'Bayu', jam: '19.38', isi: DADA.pesan });
  });

  it('pemanasan: tanpa petunjuk, tanpa istilah', () => {
    expect(soal.petunjuk).toBeNull();
    expect(soal.istilah).toEqual([]);
  });

  it('kartu penentu (pengumuman bursa) tampil PERTAMA, kartu harga kedua', () => {
    expect(soal.kartu).toEqual(DADA.kartu);
    expect(soal.kartu_penentu).toEqual(['susp-2025-06-30']);
    expect(soal.kartu[0]).toBe(soal.kartu_penentu[0]);
  });

  it('teks kedua kartu sama dengan kontrak', () => {
    const susp = awam(kasus, 'susp-2025-06-30');
    expect(susp.kepala).toBe(DADA.susp.kepala);
    expect(teksPolos(susp.isi)).toBe(DADA.susp.isi);
    const kelipatan = awam(kasus, 'kelipatan-2025-08-01-2025-10-08');
    expect(kelipatan.kepala).toBe(DADA.kelipatan.kepala);
    expect(teksPolos(kelipatan.isi)).toBe(DADA.kelipatan.isi);
  });

  it('angka di kedua kartu menunjuk fakta yang memang bernilai itu (pemetaan id kontrak)', () => {
    expect(ambilRujukan(awam(kasus, 'susp-2025-06-30').isi)).toEqual([
      { fact_id: 'harga-2025-08-01', teks: '1 Agustus' },
    ]);
    expect(ambilRujukan(awam(kasus, 'kelipatan-2025-08-01-2025-10-08').isi)).toEqual([
      { fact_id: 'harga-2025-08-01', teks: 'Rp8' },
      { fact_id: 'harga-2025-08-01', teks: '1 Agustus' },
      { fact_id: 'harga-2025-10-08', teks: 'Rp178' },
      { fact_id: 'kelipatan-2025-08-01-2025-10-08', teks: '22 kali' },
    ]);
  });

  it('empat opsi dan kuncinya b', () => {
    expect(soal.pilihan.map((p) => [p.kunci, teksPolos(p.teks)])).toEqual(DADA.pilihan);
    expect(soal.jawaban).toBe('b');
  });

  it('teks kunci sama dengan kontrak', () => {
    expect(teksPolos(soal.penjelasan)).toBe(DADA.penjelasan);
  });

  it('layar pertama membawa judul dan ajakan kontrak', () => {
    expect(kasus.pembuka.judul).toBe('Cek omongan saham di grup ke dokumen resminya.');
    expect(kasus.pembuka.ajak).toBe('Betul atau keliru?');
  });
});

describe('M3.9 D-4 — soal 1 ULTJ sama persis dengan kontrak', () => {
  const kasus = muat('ultj-2026-05-04');
  const soal = soalPertama(kasus);

  it('pesan Nadia 17.58, huruf demi huruf — "Rp45" dibiarkan (dividen 2025 yang tercatat)', () => {
    expect(soal.pesan).toEqual({ nama: 'Nadia', jam: '17.58', isi: ULTJ.pesan });
  });

  it('pemanasan: tanpa petunjuk; istilah hanya "Tanggal ex" dengan arti versi hidup', () => {
    expect(soal.petunjuk).toBeNull();
    expect(soal.istilah).toEqual(ULTJ.istilah);
  });

  it('kartu dividen (penentu) PERTAMA, kartu turun menggantikan kartu selisih', () => {
    expect(soal.kartu).toEqual(ULTJ.kartu);
    expect(soal.kartu_penentu).toEqual(['div-2026-05-04']);
    expect(soal.kartu).not.toContain('beda-turun-dividen');
    expect(kasus.fakta_terlihat).not.toContain('beda-turun-dividen');
    expect(kasus.fakta_terlihat).toContain('turun-2026-05-04');
  });

  it('teks kedua kartu sama dengan kontrak, dan kepala dividen tanpa "ex"', () => {
    const div = awam(kasus, 'div-2026-05-04');
    expect(div.kepala).toBe(ULTJ.div.kepala);
    expect(div.kepala).not.toMatch(/\bex\b/);
    expect(teksPolos(div.isi)).toBe(ULTJ.div.isi);
    const turun = awam(kasus, 'turun-2026-05-04');
    expect(turun.kepala).toBe(ULTJ.turun.kepala);
    expect(teksPolos(turun.isi)).toBe(ULTJ.turun.isi);
  });

  it('angka kartu menunjuk fakta bernilai itu; kartu turun dihitung dari kedua harga', () => {
    expect(ambilRujukan(awam(kasus, 'div-2026-05-04').isi)).toEqual([
      { fact_id: 'div-2026-05-04', teks: 'Rp130 per lembar' },
    ]);
    expect(ambilRujukan(awam(kasus, 'turun-2026-05-04').isi)).toEqual([
      { fact_id: 'turun-2026-05-04', teks: 'Rp145' },
    ]);
    const turun = kasus.fakta.find((f) => f.fact_id === 'turun-2026-05-04');
    expect(turun?.sumber.jenis).toBe('turunan');
    expect(turun?.nilai).toBe(145);
    expect(turun?.turunan_dari).toEqual(['harga-2026-04-30', 'harga-2026-05-04-buka']);
    const nilai = (id: string): unknown => kasus.fakta.find((f) => f.fact_id === id)?.nilai;
    expect(nilai('harga-2026-04-30')).toBe(1690);
    expect(nilai('harga-2026-05-04-buka')).toBe(1545);
  });

  it('empat opsi dan kuncinya b', () => {
    expect(soal.pilihan.map((p) => [p.kunci, teksPolos(p.teks)])).toEqual(ULTJ.pilihan);
    expect(soal.jawaban).toBe('b');
  });

  it('teks kunci sama dengan kontrak', () => {
    expect(teksPolos(soal.penjelasan)).toBe(ULTJ.penjelasan);
  });

  it('layar pertama membawa judul dan ajakan yang sama dengan DADA', () => {
    expect(kasus.pembuka.judul).toBe('Cek omongan saham di grup ke dokumen resminya.');
    expect(kasus.pembuka.ajak).toBe('Betul atau keliru?');
  });
});

/*
 * `cases/*.json` hanya boleh berubah LEWAT pembangun (§0 M3.9). DADA sudah
 * dijaga `bangun.test.ts` ("menghasilkan berkas yang sama persis"); ULTJ belum
 * punya penjaga itu — sabotase T-03 menemukannya: definisi yang diubah tanpa
 * membangun ulang tetap hijau di seluruh Vitest.
 */
describe.runIf(existsSync(`${AKAR}.cache/sectors/ULTJ-filings.json`))(
  'M3.9 — berkas ULTJ di repo = hasil bangun definisinya',
  () => {
    it('byte-identik dengan keluaran pembangun', () => {
      // Gudang beku (M4a A-1): kasus tayang dibangun dari 111 berkas yang
      // sidiknya dibekukan, bukan dari seluruh isi `.cache/sectors/`.
      const gudang = muatGudangBeku();
      const data = gudang.emiten.get(ULTJ_2026_05_04.simbol);
      if (data === undefined) throw new Error('gudang tidak memuat ULTJ');
      const kosong = gudang.berkas
        .filter((b) => b.jenis === 'paginasi-kosong')
        .map((b) => b.berkas);
      const { kasus } = bangunKasusUmum(ULTJ_2026_05_04, data, gudang.asal, kosong);
      const berkas = readFileSync(`${AKAR}cases/ultj-2026-05-04.json`, 'utf8').replace(
        /\r\n/g,
        '\n',
      );
      expect(keJson(kasus) === berkas, 'cases/ultj-2026-05-04.json harus hasil build:case').toBe(true);
    });
  },
);

describe('M3.9 — soal 2 dan 3 kedua kasus tidak disentuh', () => {
  for (const [kasus_id, dasar] of Object.entries(SIDIK_DASAR)) {
    it(`${kasus_id}: soal 2–3 dan fakta kartunya byte-identik dengan dabc82a`, () => {
      const kasus = muat(kasus_id);
      const lanjut = kasus.soal.slice(1);
      expect(lanjut).toHaveLength(2);
      expect(sidik(JSON.stringify(lanjut)), 'soal 2–3').toBe(dasar.soal23);
      const ids = [...new Set(lanjut.flatMap((s) => s.kartu))].sort();
      const fakta = ids.map((id) => kasus.fakta.find((f) => f.fact_id === id));
      expect(sidik(JSON.stringify(fakta)), 'fakta kartu soal 2–3').toBe(dasar.kartu23);
    });
  }
});
