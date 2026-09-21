import { expect, test } from '@playwright/test';

/**
 * RQ-00 — kenari: apakah browser uji ini benar-benar melukis?
 *
 * Tes ini tidak menguji produk. Ia menguji **alat**, dan ia ada karena alat yang
 * salah adalah sebab struktural kenapa lima cacat lolos ke tangan pemilik: panel
 * peramban yang dipakai reviewer ber-`visibilityState: hidden` dan tidak pernah
 * menghasilkan frame, sehingga `IntersectionObserver`, animasi, dan gulir tidak
 * pernah jalan di sana. Rangkaian e2e yang berjalan di browser seperti itu akan
 * hijau sambil tidak menguji apa-apa.
 *
 * Empat hal diukur, semuanya dari dalam halaman:
 *   1. halaman dianggap terlihat;
 *   2. `requestAnimationFrame` benar-benar berdetak (>= 10 kali dalam 1 detik);
 *   3. `IntersectionObserver` melapor `isIntersecting: true` untuk elemen yang
 *      memang berada di dalam viewport;
 *   4. animasi CSS mencapai `finished`, bukan menggantung selamanya.
 *
 * Tidak ada sabotase untuk tes ini: yang dirusak kalau ia merah bukan kode
 * produk, melainkan pilihan mode headless di `playwright.config.ts`.
 */
test('kenari: browser uji melukis — rAF, IntersectionObserver, dan animasi CSS jalan', async ({
  page,
}) => {
  await page.goto('/');

  const terlihat = await page.evaluate(() => document.visibilityState);
  expect(terlihat, 'halaman harus dianggap terlihat oleh peramban').toBe('visible');

  /*
   * Detak dihitung oleh rAF itu sendiri, dan lamanya diukur dengan
   * `performance.now()` — bukan `setTimeout`. Penunggu yang ditunggu adalah
   * frame; memakai timer akan membuat tes ini lulus di browser yang tidak
   * pernah menghasilkan satu frame pun.
   */
  const detak = await page.evaluate(
    async () =>
      await new Promise<number>((selesai) => {
        const mulai = performance.now();
        let hitung = 0;
        const langkah = (): void => {
          hitung += 1;
          if (performance.now() - mulai >= 1000) {
            selesai(hitung);
            return;
          }
          requestAnimationFrame(langkah);
        };
        requestAnimationFrame(langkah);
      }),
  );
  expect(detak, 'requestAnimationFrame harus berdetak >= 10 kali dalam 1 detik').toBeGreaterThanOrEqual(10);

  const berpotongan = await page.evaluate(
    async () =>
      await new Promise<boolean>((selesai) => {
        const kotak = document.createElement('div');
        kotak.style.cssText = 'position:fixed;top:10px;left:10px;width:40px;height:40px;';
        document.body.append(kotak);
        const pengamat = new IntersectionObserver((masukan) => {
          const butir = masukan[0];
          if (butir === undefined) return;
          pengamat.disconnect();
          kotak.remove();
          selesai(butir.isIntersecting);
        });
        pengamat.observe(kotak);
      }),
  );
  expect(berpotongan, 'IntersectionObserver harus melapor isIntersecting untuk elemen di viewport').toBe(
    true,
  );

  /*
   * Animasi **CSS**, bukan `element.animate()`: yang dipakai produk adalah
   * `@keyframes` di `gaya.css`, dan E-05 membacanya lewat `getAnimations()`.
   * Menguji Web Animations API di sini akan membuktikan hal lain.
   */
  const animasi = await page.evaluate(
    async () =>
      await new Promise<{ jumlah: number; selesai: boolean }>((beres, gagal) => {
        const gaya = document.createElement('style');
        gaya.textContent = '@keyframes kenari-pudar { from { opacity: 1 } to { opacity: 0 } }';
        document.head.append(gaya);
        const kotak = document.createElement('div');
        kotak.style.cssText =
          'position:fixed;top:10px;left:10px;width:10px;height:10px;' +
          'animation: kenari-pudar 120ms linear forwards;';
        document.body.append(kotak);
        const berjalan = kotak.getAnimations();
        const satu = berjalan[0];
        if (satu === undefined) {
          kotak.remove();
          gaya.remove();
          beres({ jumlah: 0, selesai: false });
          return;
        }
        satu.finished.then(
          () => {
            kotak.remove();
            gaya.remove();
            beres({ jumlah: berjalan.length, selesai: true });
          },
          (galat: unknown) => {
            kotak.remove();
            gaya.remove();
            gagal(galat instanceof Error ? galat : new Error(String(galat)));
          },
        );
      }),
  );
  expect(animasi.jumlah, 'getAnimations() harus melihat animasi CSS yang berjalan').toBeGreaterThan(0);
  expect(animasi.selesai, 'animasi CSS harus mencapai finished').toBe(true);

  /*
   * Angka-angka di atas dilaporkan, bukan hanya diperiksa: OQ-1 menanyakan
   * buktinya, dan bukti adalah angka yang tercetak.
   */
  // eslint-disable-next-line no-console
  console.log(
    `kenari: visibilityState=${terlihat} rAF/detik=${String(detak)} ` +
      `intersecting=${String(berpotongan)} getAnimations=${String(animasi.jumlah)} ` +
      `animasi-finished=${String(animasi.selesai)}`,
  );
});
