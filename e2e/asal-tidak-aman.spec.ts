import { expect, test } from '@playwright/test';
import { HOST_TIDAK_AMAN } from './bantu/jalur.ts';
import { LABEL_MULAI, awasiGalat, gagalYangBerarti, mulaiKasus, penandaBaru } from './bantu/main.ts';
import { mulaiDenganPenanda, tungguSatuSesi } from './bantu/peristiwa.ts';

/**
 * E-01 — asal yang tidak aman tidak memutihkan halaman.
 *
 * Cacat aslinya (M3.1 §10d): pemilik membuka `http://192.168.50.200:5173/` dari
 * ponselnya dan mendapat **halaman putih**, karena `crypto.randomUUID` hanya ada
 * di konteks aman dan id sesi memanggilnya langsung. Seluruh uji waktu itu
 * memakai `localhost`, yang **adalah** konteks aman, jadi cacatnya tidak pernah
 * tersentuh.
 *
 * Supaya tes ini tidak mengulang kesalahan yang sama, ia **menegaskan
 * prasyaratnya sendiri lebih dulu**: kalau `window.isSecureContext` ternyata
 * `true` atau `crypto.randomUUID` ternyata ada, tes ini merah — karena kalau
 * begitu, ia tidak sedang menguji apa-apa.
 *
 * Nama host tiruannya dipetakan ke loopback di dalam peramban
 * (`--host-resolver-rules`), jadi tidak ada server yang dibuka ke LAN dan tidak
 * ada dialog firewall Windows.
 */

const POLA_UUID_V4 = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;

function alamatTidakAman(penanda: string): string {
  const dasar = test.info().project.use.baseURL;
  expect(dasar, 'proyek ini harus punya baseURL').toBeDefined();
  const url = new URL(dasar ?? '');
  url.hostname = HOST_TIDAK_AMAN;
  url.search = `k=${penanda}`;
  return url.toString();
}

test('E-01 halaman hidup di asal http yang bukan localhost, dan mulai tetap sampai', async ({
  page,
}) => {
  const galat = awasiGalat(page);
  const penanda = penandaBaru();
  const alamat = alamatTidakAman(penanda);

  await page.goto(alamat);

  /* --- prasyarat: konteksnya memang TIDAK aman ------------------------ */
  const konteks = await page.evaluate(() => ({
    aman: window.isSecureContext,
    randomUUID: typeof crypto.randomUUID,
    getRandomValues: typeof crypto.getRandomValues,
    asal: window.location.origin,
  }));
  expect(
    konteks.asal,
    'tes ini harus berjalan di asal http yang bukan localhost, kalau tidak ia tidak menguji apa-apa',
  ).toBe(new URL(alamat).origin);
  expect(konteks.aman, 'window.isSecureContext harus false di asal ini').toBe(false);
  expect(konteks.randomUUID, 'crypto.randomUUID harus tidak ada di asal ini').toBe('undefined');
  // Bukan bagian syarat, tetapi menjelaskan kenapa cadangannya bisa bekerja.
  expect(konteks.getRandomValues, 'crypto.getRandomValues tetap ada di konteks tidak aman').toBe(
    'function',
  );

  /* --- halamannya hidup ----------------------------------------------- */
  await expect(page.getByRole('button', { name: LABEL_MULAI })).toBeVisible();
  await expect(page.getByRole('heading', { level: 1 })).toContainText('Kita mundur ke');
  const panjangAkar = await page.evaluate(
    () => document.getElementById('akar')?.innerHTML.length ?? 0,
  );
  expect(panjangAkar, 'isi #akar tidak boleh kosong (halaman putih)').toBeGreaterThan(500);

  // Batas galat (A3-T2) tidak boleh terpicu: kalimatnya tidak ada di layar.
  await expect(page.getByText('Ada yang macet di halaman ini')).toHaveCount(0);

  /* --- peristiwa mulai tiba di pengumpul ------------------------------- */
  const sesi = await tungguSatuSesi(penanda);
  expect(sesi, 'id sesi harus berbentuk UUID v4 walau di konteks tidak aman').toMatch(POLA_UUID_V4);

  const mulai = mulaiDenganPenanda(penanda)[0];
  expect(mulai, 'peristiwa mulai harus ada').toBeDefined();
  expect(mulai?.isi.pengunjung, 'pengunjung harus UUID v4').toMatch(POLA_UUID_V4);
  expect(mulai?.isi.penanda).toBe(penanda);
  expect(mulai?.isi.kunjungan_ke).toBe(1);

  /* --- masih hidup sesudah diketuk -------------------------------------- */
  await mulaiKasus(page);
  await expect(page.locator('[aria-label="Soal 1 dari 3"]')).toBeVisible();

  expect(galat.kode(), 'tidak boleh ada galat konsol di asal yang tidak aman').toEqual([]);
  expect(gagalYangBerarti(galat.permintaanGagal()), 'tidak boleh ada permintaan gagal').toEqual([]);
});
