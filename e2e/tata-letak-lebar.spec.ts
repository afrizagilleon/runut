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
