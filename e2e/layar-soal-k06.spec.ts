import { expect, test } from '@playwright/test';
import {
  LABEL_SESUDAHNYA,
  buka,
  kunciJawaban,
  lanjut,
  mulaiKasus,
  penandaBaru,
  pilihOpsi,
  tungguGulirBerhenti,
  tungguSoal,
} from './bantu/main.ts';
import { bacaKasus } from './bantu/kasus.ts';
import { ID_KASUS } from './bantu/jalur.ts';

/**
 * E-28 — layar soal varian A (M3.9 D-3), di peramban yang melukis.
 *
 * Tiga hal yang dilihat pemain, dan ketiganya disalin persis dari kontrak:
 * - kalimat pengantar "Betul atau keliru? Cek ke {n} dokumen ini:" di SEMUA
 *   soal, dengan {n} dieja dari jumlah kartu soal itu;
 * - soal 1 tanpa baris petunjuk (`petunjuk: null` tidak dirender);
 * - bilah turun berbunyi "↓ Pilih jawaban".
 *
 * Angka kartunya dibaca dari berkas kasus; kata-katanya ditulis di sini,
 * karena yang dijaga justru kata-kata kontraknya.
 */

const EJAAN: Record<number, string> = { 2: 'dua', 3: 'tiga', 4: 'empat' };
const LABEL_PILIH_JAWABAN = '↓ Pilih jawaban';

for (const kasus_id of ID_KASUS) {
  test(`E-28 [${kasus_id}] pengantar tiap soal, soal 1 tanpa petunjuk, bilah "↓ Pilih jawaban"`, async ({
    page,
  }) => {
    test.skip(
      test.info().project.name === 'lebar',
      'ukuran 360 × 640 adalah yang membuat bilah turun muncul di soal 1',
    );
    const kasus = bacaKasus(kasus_id);
    await buka(page, penandaBaru(), kasus_id);
    await mulaiKasus(page);

    for (const [nomor, soal] of kasus.soal.entries()) {
      await tungguSoal(page, nomor + 1);
      await tungguGulirBerhenti(page);

      const antar = page.locator(`#antar-${soal.soal_id}`);
      const n = soal.kartu.length;
      await expect(antar, `pengantar soal ${String(nomor + 1)}`).toHaveText(
        `Betul atau keliru? Cek ke ${EJAAN[n] ?? String(n)} dokumen ini:`,
      );
      await expect(page.locator('main')).not.toContainText('Cek omongan');

      if (nomor === 0) {
        expect(soal.petunjuk, 'berkas kasus: soal 1 tanpa petunjuk').toBeNull();
        await expect(page.locator('[data-uid="petunjuk"]')).toHaveCount(0);
        await expect(page.locator('main')).not.toContainText('Baca pesannya');
        // Di 360 × 640 opsi pertama soal 1 belum terlihat: bilah turun hadir.
        const turun = page.locator('[data-uid="bilah:turun"] button');
        await expect(turun).toHaveText(LABEL_PILIH_JAWABAN);
        await expect(page.getByRole('button', { name: LABEL_PILIH_JAWABAN })).toBeVisible();
        await expect(page.locator('main')).not.toContainText('Jawab di bawah');
      }

      await pilihOpsi(page, soal.jawaban);
      await kunciJawaban(page);
      await lanjut(
        page,
        nomor === kasus.soal.length - 1 ? LABEL_SESUDAHNYA : `Lanjut ke soal ${String(nomor + 2)}`,
      );
    }
  });
}
