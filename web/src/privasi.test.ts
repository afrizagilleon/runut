import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { KALIMAT_PRIVASI, KALIMAT_TERIMA_KASIH } from './privasi.ts';

/**
 * D-11: yang dicatat, dikatakan — dan dikatakan **kata demi kata**.
 *
 * Kalimat ini bukan salinan longgar: ia diputuskan pemilik sesudah D-13, dan ia
 * menggantikan kalimat privasi di `docs/kasus-dada-v3.md` yang ditulis sebelum
 * nomor pengunjung ada. Karena itu yang diuji di sini adalah teksnya persis,
 * bukan "mengandung kata kunci tertentu": kalimat yang melunak satu kata pun
 * sudah menjanjikan hal lain.
 */
const D11 =
  'Kami mencatat apa yang diketuk dan seberapa jauh layar digulir, dan menyimpan ' +
  'satu nomor acak di browsermu supaya tahu kalau kamu kembali. Bukan nama, bukan ' +
  'akun, bukan alamat IP; tidak dibagikan ke siapa pun. Teks yang kamu ketik tidak ' +
  'dicatat, kecuali kotak masukan ini.';

const AKAR = fileURLToPath(new URL('../../', import.meta.url));
const baca = (jalur: string): string => readFileSync(AKAR + jalur, 'utf8');

describe('D-11 — kalimat privasi', () => {
  it('sama persis dengan yang diputuskan kontrak', () => {
    expect(KALIMAT_PRIVASI).toBe(D11);
  });

  it('menyebut keempat hal yang memang terjadi, tanpa satu pun yang dihaluskan', () => {
    expect(KALIMAT_PRIVASI).toContain('apa yang diketuk');
    expect(KALIMAT_PRIVASI).toContain('seberapa jauh layar digulir');
    expect(KALIMAT_PRIVASI).toContain('satu nomor acak di browsermu');
    expect(KALIMAT_PRIVASI).toContain('kecuali kotak masukan ini');
  });

  it('dirender di layar akhir, sesudah kotak teks dan sebelum tombol kirim', () => {
    const sumber = baca('web/src/Aplikasi.tsx');
    const kotak = sumber.indexOf('data-uid="akhir:teks"');
    const kalimat = sumber.indexOf('{KALIMAT_PRIVASI}');
    const kirim = sumber.indexOf("kirim({ jenis: 'kirim_akhir' })");
    expect(kotak).toBeGreaterThan(0);
    expect(kalimat).toBeGreaterThan(kotak);
    expect(kalimat).toBeLessThan(kirim);
  });

  it('README memuat kalimat yang sama, bukan parafrasenya', () => {
    // Baris di README boleh dilipat dan boleh berada di dalam kutipan `>`;
    // yang dibandingkan adalah teksnya, bukan tata letaknya.
    const readme = baca('README.md').replace(/^>\s?/gm, '').replace(/\s+/g, ' ');
    expect(readme).toContain(D11);
  });
});

describe('D-11 — klaim yang dihapus dari seluruh aplikasi', () => {
  const berkasAplikasi = [
    'web/src/Aplikasi.tsx',
    'web/src/sesi.ts',
    'web/src/kirim.ts',
    'web/src/alur.ts',
    'web/src/pelacak.ts',
    'web/src/privasi.ts',
    'web/src/KartuFakta.tsx',
    'web/src/Kalender.tsx',
    'web/src/Teks.tsx',
    'web/src/BatasGalat.tsx',
    'web/src/gaya.css',
  ];

  it('tidak ada lagi janji "tanpa cookie" di mana pun', () => {
    for (const berkas of berkasAplikasi) {
      expect(baca(berkas).toLowerCase(), berkas).not.toContain('tanpa cookie');
    }
  });

  it('layar terima kasih menjanjikan tepat dua hal, dan keduanya benar', () => {
    const sumber = baca('web/src/Aplikasi.tsx');
    expect(KALIMAT_TERIMA_KASIH).toBe('Jawabanmu tercatat tanpa nama dan tanpa akun.');
    expect(sumber).toContain('{KALIMAT_TERIMA_KASIH}');
  });
});
