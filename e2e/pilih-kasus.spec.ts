import { expect, test, type Page } from '@playwright/test';
import { DIR_DIST_DENGAN, ID_KASUS } from './bantu/jalur.ts';
import { bacaBundel } from './bantu/bundel.ts';
import { bacaKasus } from './bantu/kasus.ts';
import {
  LABEL_KASUS_LAIN,
  LABEL_LANJUT_AKHIR,
  LABEL_MULAI,
  LABEL_SELESAI,
  LABEL_SESUDAHNYA,
  awasiGalat,
  bilahTurunAda,
  buka,
  bukaTanpaKasus,
  gagalYangBerarti,
  ketuk,
  kunciJawaban,
  lanjut,
  mulaiKasus,
  penandaBaru,
  pilihOpsi,
  tandaiDimainkan,
  tungguSoal,
} from './bantu/main.ts';
import { mulaiDenganPenanda, peristiwaSesi, tungguSatuSesi, tungguSesi } from './bantu/peristiwa.ts';

/**
 * E-20 — pemilihan kasus (M4 D-4).
 *
 * Yang dijaga di sini adalah kegagalan yang disebut kontrak dengan nama:
 * **pemain yang sudah memainkan satu kasus disodori kasus yang sama lagi**,
 * dan sebaliknya, **`?kasus=` yang tidak dihormati** — yang akan membuat
 * seluruh rangkaian e2e lain mengukur kasus yang salah tanpa mengatakannya.
 *
 * Pilihannya sendiri sudah dites di meja (`web/src/pilih-kasus.test.ts`). Yang
 * tidak bisa dites di meja, dan karena itu ada di sini: bahwa pilihan itu
 * benar-benar sampai ke `localStorage` peramban sungguhan dan ke `kasus_id`
 * peristiwa yang tiba di pengumpul.
 */

/** Isi `localStorage.kasus_dimainkan` seperti yang dibaca peramban sungguhan. */
async function dimainkanDiPeramban(page: Page): Promise<unknown> {
  const mentah = await page.evaluate(() => window.localStorage.getItem('kasus_dimainkan'));
  return mentah === null ? null : (JSON.parse(mentah) as unknown);
}

/** `kasus_id` yang dibawa peristiwa `mulai` sesi ini. */
function kasusSesi(sesi: string): string {
  const awal = peristiwaSesi(sesi).find((p) => p.nama === 'mulai');
  expect(awal, `peristiwa mulai untuk sesi ${sesi}`).toBeDefined();
  return awal?.kasus_id ?? '';
}

for (const kasus_id of ID_KASUS) {
test(`E-20a [${kasus_id}] \`?kasus=\` memaksa kasus itu, dan kasus_id-nya sampai ke pengumpul`, async ({
  page,
}) => {
  const galat = awasiGalat(page);
  const penanda = penandaBaru();

  /*
   * Kasus yang diminta ditandai **sudah dimainkan** lebih dulu, dan itu bukan
   * kerapian: kalau `?kasus=` diabaikan, pemilihan acak akan menghindari kasus
   * yang sudah dimainkan dan mendarat di kasus yang lain — dengan pasti, bukan
   * dengan lemparan koin. Tanpa penanda ini, tes ini tetap hijau separuh waktu
   * atas aplikasi yang sudah berhenti menghormati `?kasus=` (terukur waktu
   * sabotase T-04).
   */
  await tandaiDimainkan(page, [kasus_id]);
  await buka(page, penanda, kasus_id);
  await expect(page.getByRole('button', { name: LABEL_MULAI })).toBeVisible();

  const sesi = await tungguSatuSesi(penanda);
  expect(kasusSesi(sesi), `?kasus=${kasus_id} harus menentukan kasus yang dimainkan`).toBe(
    kasus_id,
  );

  expect(
    await dimainkanDiPeramban(page),
    'kasus yang dibuka harus tercatat di localStorage; tanpa itu kunjungan berikutnya mengulanginya',
  ).toEqual([kasus_id]);

  expect(galat.kode(), 'tidak boleh ada galat konsol').toEqual([]);
  expect(gagalYangBerarti(galat.permintaanGagal())).toEqual([]);
});
}

test('E-20b `?kasus=` yang tak dikenal DIABAIKAN — kasus sungguhan tetap terbuka', async ({
  page,
}) => {
  const galat = awasiGalat(page);
  const penanda = penandaBaru();

  await page.goto(`/?k=${penanda}&kasus=kasus-yang-tidak-pernah-ada`);

  /*
   * Yang diuji bukan "tidak melempar" melainkan "tetap memainkan kasus yang
   * sungguhan": nilai tak dikenal yang diteruskan apa adanya akan menghasilkan
   * layar kosong, dan layar kosong juga tidak punya galat konsol.
   */
  await expect(page.getByRole('button', { name: LABEL_MULAI })).toBeVisible();
  const sesi = await tungguSatuSesi(penanda);
  expect(ID_KASUS, 'kasus yang dimainkan harus salah satu kasus yang ada').toContain(
    kasusSesi(sesi),
  );

  expect(galat.kode(), 'tidak boleh ada galat konsol').toEqual([]);
  expect(gagalYangBerarti(galat.permintaanGagal())).toEqual([]);
});

test('E-20c tanpa `?kasus=` sama sekali, kasus tetap terpilih dan tercatat', async ({ page }) => {
  const penanda = penandaBaru();
  await bukaTanpaKasus(page, penanda);
  await expect(page.getByRole('button', { name: LABEL_MULAI })).toBeVisible();

  const sesi = await tungguSatuSesi(penanda);
  const dimainkan = kasusSesi(sesi);
  expect(ID_KASUS, 'kasus yang dipilih aplikasi harus salah satu yang terdaftar').toContain(
    dimainkan,
  );

  expect(
    await dimainkanDiPeramban(page),
    'kasus yang terpilih acak pun harus tercatat sebagai sudah dimainkan',
  ).toEqual([dimainkan]);
});

test('E-20d pesan penutup datang dari berkas kasus, bukan dari kode', () => {
  const bundel = bacaBundel(DIR_DIST_DENGAN);
  expect(bundel.length, 'harus ada berkas JS di bundel').toBeGreaterThan(0);
  const seluruhnya = bundel.map((b) => b.teks).join('\n');

  /*
   * Kalimat lamanya ditulis mati di `Aplikasi.tsx`. Kalau ia kembali ke sana,
   * setiap kasus akan menutup dengan janji yang sama — dan kata "sehat" adalah
   * penilaian saham, yang tidak pernah boleh keluar dari produk ini.
   */
  expect(
    seluruhnya.includes('perusahaan yang sehat'),
    'kalimat penutup lama tidak boleh ada lagi di bundel',
  ).toBe(false);
  expect(
    seluruhnya.includes('sedang kami siapkan'),
    'janji "sedang kami siapkan" tidak boleh ada lagi di bundel',
  ).toBe(false);

  // Yang ada di bundel adalah isi tiap berkas kasus, kata demi kata.
  for (const kasus_id of ID_KASUS) {
    const kasus = bacaKasus(kasus_id);
    expect(
      seluruhnya.includes(kasus.penutup.kepala),
      `pesan penutup ${kasus_id} (kepala) harus ikut ke bundel`,
    ).toBe(true);
    expect(
      seluruhnya.includes(kasus.penutup.isi),
      `pesan penutup ${kasus_id} (isi) harus ikut ke bundel`,
    ).toBe(true);
  }
});

/* ------------------------------------------------------------------ */
/* Berpindah kasus (M4 D-4, D-5)                                       */
/* ------------------------------------------------------------------ */

/** Mainkan satu kasus sampai layar "Terima kasih." — jalan terpendeknya. */
async function mainkanSampaiTerimaKasih(page: Page, kasus_id: string): Promise<void> {
  const kasus = bacaKasus(kasus_id);
  await mulaiKasus(page);
  for (const [nomor, soal] of kasus.soal.entries()) {
    await tungguSoal(page, nomor + 1);
    await bilahTurunAda(page, soal.pilihan[0]?.kunci ?? 'a');
    await pilihOpsi(page, soal.jawaban);
    await kunciJawaban(page);
    await lanjut(
      page,
      nomor === kasus.soal.length - 1 ? LABEL_SESUDAHNYA : `Lanjut ke soal ${String(nomor + 2)}`,
    );
  }
  await expect(page.getByRole('heading', { name: 'Waktu berjalan lagi' })).toBeVisible();
  await lanjut(page, LABEL_LANJUT_AKHIR);
  await lanjut(page, LABEL_SELESAI);
  await expect(page.getByRole('heading', { name: 'Terima kasih.' })).toBeVisible();
}

test('E-20e "Mau coba kasus lain" membuka kasus yang BELUM dimainkan, sesi baru', async ({
  page,
}) => {
  const galat = awasiGalat(page);
  const penanda = penandaBaru();
  const pertama = ID_KASUS[0] ?? '';
  const kedua = ID_KASUS[1] ?? '';
  expect(kedua, 'tes ini butuh dua kasus di repo').not.toBe('');

  await buka(page, penanda, pertama);
  const sesiPertama = await tungguSatuSesi(penanda);
  await mainkanSampaiTerimaKasih(page, pertama);

  await ketuk(page.getByRole('button', { name: LABEL_KASUS_LAIN }));

  /*
   * Kasus berikutnya terbuka LANGSUNG — bukan pesan penutup. Yang diperiksa
   * adalah layar pertama kasus kedua, bukan sekadar "halaman berubah":
   * tombol "Mulai kasus" ada lagi, dan baris meta menyebut jumlah soal kasus
   * itu sendiri.
   */
  await expect(page.getByRole('button', { name: LABEL_MULAI })).toBeVisible();
  await expect(page.locator('[data-uid="pesan-alpha"]')).toHaveCount(0);

  /*
   * Sesi baru, pengunjung sama (D-4): dua peristiwa `mulai` dengan penanda yang
   * sama, id sesi berbeda, kasus_id berbeda, nomor pengunjung sama.
   */
  const sesi = await tungguSesi(penanda, 2);
  expect(new Set(sesi).size, 'dua sesi yang berbeda').toBe(2);
  const mulai = mulaiDenganPenanda(penanda);
  expect(mulai.map((p) => p.kasus_id)).toEqual([pertama, kedua]);
  expect(sesi[0]).toBe(sesiPertama);
  const pengunjung = mulai.map((p) => p.isi.pengunjung);
  expect(pengunjung[0], 'nomor pengunjung tidak boleh null di build uji').not.toBeNull();
  expect(pengunjung[0], 'pengunjung sama, sesi baru').toBe(pengunjung[1]);
  expect(
    mulai.map((p) => p.isi.kunjungan_ke),
    'membuka kasus kedua bukan kunjungan kedua',
  ).toEqual([mulai[0]?.isi.kunjungan_ke, mulai[0]?.isi.kunjungan_ke]);

  /* `minat_kasus_lain` tetap lahir, dan ia milik sesi yang ditinggalkan. */
  const minat = peristiwaSesi(sesiPertama).filter((p) => p.nama === 'minat_kasus_lain');
  expect(minat, 'peristiwa minat_kasus_lain harus tetap lahir').toHaveLength(1);

  /* D-5: kasus baru adalah layar baru di riwayat peramban, bukan halaman baru. */
  expect(
    await dimainkanDiPeramban(page),
    'kedua kasus tercatat sudah dimainkan sesudah yang kedua dibuka',
  ).toEqual([pertama, kedua]);

  expect(galat.kode(), 'tidak boleh ada galat konsol saat berpindah kasus').toEqual([]);
  expect(gagalYangBerarti(galat.permintaanGagal())).toEqual([]);
});

test('E-20f dua kunjungan di satu peramban tidak mengulang kasus sampai keduanya habis', async ({
  page,
}) => {
  const p1 = penandaBaru();
  const p2 = penandaBaru();
  const p3 = penandaBaru();

  await bukaTanpaKasus(page, p1);
  await expect(page.getByRole('button', { name: LABEL_MULAI })).toBeVisible();
  const kasus1 = kasusSesi(await tungguSatuSesi(p1));

  await bukaTanpaKasus(page, p2);
  await expect(page.getByRole('button', { name: LABEL_MULAI })).toBeVisible();
  const kasus2 = kasusSesi(await tungguSatuSesi(p2));

  expect(
    kasus2,
    `kunjungan kedua harus mendapat kasus yang lain; kunjungan pertama ${kasus1}`,
  ).not.toBe(kasus1);
  expect([kasus1, kasus2].sort()).toEqual([...ID_KASUS].sort());

  /*
   * Kunjungan ketiga: semuanya sudah dimainkan, jadi kasusnya acak lagi dari
   * seluruh daftar — yang diperiksa adalah bahwa ia tetap **salah satu kasus
   * yang ada**, bukan layar kosong.
   */
  await bukaTanpaKasus(page, p3);
  await expect(page.getByRole('button', { name: LABEL_MULAI })).toBeVisible();
  expect(ID_KASUS).toContain(kasusSesi(await tungguSatuSesi(p3)));
});
