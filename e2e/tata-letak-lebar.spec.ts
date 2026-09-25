import { expect, test } from '@playwright/test';
import { buka, mulaiKasus, penandaBaru, tungguSoal } from './bantu/main.ts';
import { kotak } from './bantu/ukur.ts';

/**
 * E-12d — keping kalender sejajar kolom isi di layar lebar.
 *
 * Cacat aslinya (M3.1 §10f, ditambal A4-T2): di desktop keping waktu rata kiri
 * ke tepi jendela sementara isinya berada di kolom tengah, jadi tanggalnya
 * tampak menempel pada sesuatu yang lain. Bukti A4-T2 diambil sekali dengan
 * tangan di 1440 px; sekarang ia diukur tiap putaran, di 1280 px.
 *
 * Yang dibandingkan adalah **kolomnya**, bukan angka yang diketik: tepi kiri dan
 * kanan keping harus sama dengan tepi kiri dan kanan tumpukan lembar, yang
 * memang kolom isi layar ini.
 */
test('E-12d tepi keping kalender = tepi kolom isi di layar lebar', async ({ page }) => {
  await buka(page, penandaBaru());
  await mulaiKasus(page);
  await tungguSoal(page, 1);

  const lebarJendela = test.info().project.use.viewport?.width ?? 0;
  expect(lebarJendela, 'proyek ini memang layar lebar').toBeGreaterThanOrEqual(1280);

  // Keping berada di dalam `[data-uid="keping"]`; yang diukur adalah keping itu
  // sendiri, bukan raknya yang memang melintang selebar jendela.
  const keping = await kotak(page, '[data-uid="keping"] .kalender-keping');
  const kolom = await kotak(page, '#isi');
  const lembar = await kotak(page, '[data-uid^="lembar:"]');

  expect(keping, 'keping kalender ada').not.toBeNull();
  expect(kolom, 'kolom isi ada').not.toBeNull();
  expect(lembar, 'lembar dokumen ada').not.toBeNull();
  if (keping === null || kolom === null || lembar === null) return;

  expect(
    Math.abs(keping.kiri - lembar.kiri),
    `tepi kiri keping ${keping.kiri.toFixed(1)}px lawan tepi kiri lembar ${lembar.kiri.toFixed(1)}px`,
  ).toBeLessThanOrEqual(1);
  expect(
    Math.abs(keping.kanan - lembar.kanan),
    `tepi kanan keping ${keping.kanan.toFixed(1)}px lawan tepi kanan lembar ${lembar.kanan.toFixed(1)}px`,
  ).toBeLessThanOrEqual(1);

  // Dan kepingnya memang tidak melebar ke seluruh jendela.
  expect(
    keping.lebar,
    `lebar keping ${keping.lebar.toFixed(1)}px harus jauh di bawah lebar jendela ${String(lebarJendela)}px`,
  ).toBeLessThan(lebarJendela - 100);

  // eslint-disable-next-line no-console
  console.log(
    `E-12d di ${String(lebarJendela)}px: keping kiri=${keping.kiri.toFixed(1)} kanan=${keping.kanan.toFixed(1)} ` +
      `lebar=${keping.lebar.toFixed(1)} | lembar kiri=${lembar.kiri.toFixed(1)} kanan=${lembar.kanan.toFixed(1)} ` +
      `lebar=${lembar.lebar.toFixed(1)} | kolom #isi kiri=${kolom.kiri.toFixed(1)} kanan=${kolom.kanan.toFixed(1)}`,
  );
});

/**
 * E-12g — layar pertama di laptop tidak setengah kosong (M3.10 D-4a, kritik K-6).
 *
 * Juri kemungkinan membuka tautannya di laptop. Sampai `bcd4ac7`, di 1280 × 800
 * "Betul atau keliru?" berakhir di y ≈ 395 sedangkan "Mulai simulasi" menempel di
 * dasar jendela (y ≈ 709): rongga ±310 px, dan bilah bawah membentang selebar
 * jendela. Di layar ≥ 768 px bilah layar pertama ikut aliran, tepat sesudah
 * ajakan. Di ponsel ia tetap menempel di dasar (dijaga E-04/E-28 di proyek
 * ponsel).
 */
test('E-12g layar pertama 1280 × 800: tombol Mulai tepat sesudah ajakan, bukan di dasar jendela', async ({
  page,
}) => {
  await buka(page, penandaBaru());
  const tombol = page.getByRole('button', { name: 'Mulai simulasi' });
  await expect(tombol).toBeVisible();

  const u = await page.evaluate(() => {
    const ajak = document.querySelector('[data-uid="ajak"]')?.getBoundingClientRect();
    const bilah = document.querySelector('.layar-pembuka [data-uid="bilah"]');
    const t = bilah?.querySelector('button')?.getBoundingClientRect();
    const meta = document.querySelector('[data-uid="meta-pembuka"]')?.getBoundingClientRect();
    if (ajak === undefined || bilah === null || t === undefined || meta === undefined) {
      throw new Error('layar pertama tidak lengkap');
    }
    return {
      ajakBawah: ajak.bottom,
      tombolAtas: t.top,
      tombolBawah: t.bottom,
      metaBawah: meta.bottom,
      tinggiJendela: window.innerHeight,
      posisi: getComputedStyle(bilah).position,
      garisAtas: getComputedStyle(bilah).borderTopWidth,
      lebarBilah: bilah.getBoundingClientRect().width,
      lebarJendela: window.innerWidth,
    };
  });
  const jarak = u.tombolAtas - u.ajakBawah;
  // eslint-disable-next-line no-console
  console.log(
    `E-12g 1280x800: ajak.bawah=${u.ajakBawah.toFixed(1)} tombol.atas=${u.tombolAtas.toFixed(1)} ` +
      `jarak=${jarak.toFixed(1)}px meta.bawah=${u.metaBawah.toFixed(1)} jendela=${String(u.tinggiJendela)} ` +
      `bilah position=${u.posisi} garis-atas=${u.garisAtas} lebar=${u.lebarBilah.toFixed(0)}/${String(u.lebarJendela)}`,
  );
  expect(jarak, 'jarak ajakan -> tombol Mulai').toBeGreaterThanOrEqual(0);
  expect(jarak, 'jarak ajakan -> tombol Mulai (tanpa rongga)').toBeLessThanOrEqual(48);
  expect(u.metaBawah, 'tombol dan baris meta terlihat tanpa menggulir').toBeLessThanOrEqual(u.tinggiJendela);
  expect(u.posisi, 'bilah layar pertama ikut aliran di layar lebar').toBe('static');
  expect(u.lebarBilah, 'bilah tidak membentang selebar jendela').toBeLessThan(u.lebarJendela - 100);
});
