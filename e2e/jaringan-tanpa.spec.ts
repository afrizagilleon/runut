import { expect, test } from '@playwright/test';
import {
  LABEL_SELESAI,
  LABEL_SESUDAHNYA,
  awasiGalat,
  bilahTurunAda,
  buka,
  gagalYangBerarti,
  ketuk,
  kunciJawaban,
  lanjut,
  mulaiKasus,
  penandaBaru,
  tandaiDimainkan,
  pilihOpsi,
  tungguSoal,
} from './bantu/main.ts';
import { bacaKasus } from './bantu/kasus.ts';
import { bacaBundel } from './bantu/bundel.ts';
import { DIR_DIST_TANPA, ID_KASUS } from './bantu/jalur.ts';

/**
 * E-08 (bagian "tanpa pengumpul") — INV-2 di browser sungguhan.
 *
 * Janjinya: `npm run build` tanpa `VITE_KOLEKTOR_URL` menghasilkan aplikasi yang
 * **tidak punya satu pun alamat untuk dihubungi**. Sampai sekarang janji itu
 * dijaga dengan membaca kode dan hasil build; yang belum pernah diperiksa adalah
 * apa yang benar-benar keluar dari peramban ketika satu kasus dimainkan sampai
 * habis.
 *
 * Jadi tes ini mencatat **setiap** permintaan yang dikeluarkan halaman, dari
 * pemuatan pertama sampai pesan penutup.
 */
test('E-08 tanpa pengumpul: nol permintaan ke asal lain, nol POST', async ({ page }) => {
  const kasus = bacaKasus();
  const galat = awasiGalat(page);

  const permintaan: { metode: string; url: string; jenis: string }[] = [];
  page.on('request', (r) => {
    permintaan.push({ metode: r.method(), url: r.url(), jenis: r.resourceType() });
  });

  /*
   * Semua kasus ditandai sudah dimainkan (M4 D-4): tes ini berakhir di pesan
   * penutup, dan pesan itu hanya tampil ketika tidak ada kasus lain yang
   * menunggu. Tanpa penanda ini, "Coba simulasi lain" membuka kasus kedua dan
   * tes jaringan ini mengukur layar yang salah.
   */
  await tandaiDimainkan(page, ID_KASUS);
  await buka(page, penandaBaru());
  const asal = new URL(page.url()).origin;

  await mulaiKasus(page);
  for (const [nomor, soal] of kasus.soal.entries()) {
    await tungguSoal(page, nomor + 1);
    await bilahTurunAda(page, soal.pilihan[0]?.kunci ?? 'a');
    // Buka juga sumber sebuah lembar: jalur yang paling mungkin mengambil sesuatu.
    await ketuk(page.locator(`[data-uid="kaki:${soal.kartu[0] ?? ''}"]`));
    await pilihOpsi(page, soal.jawaban);
    await kunciJawaban(page);
    await lanjut(
      page,
      nomor === kasus.soal.length - 1 ? LABEL_SESUDAHNYA : `Lanjut ke soal ${String(nomor + 2)}`,
    );
  }
  await expect(page.getByRole('heading', { name: 'Waktu berjalan lagi' })).toBeVisible();
  await lanjut(page, 'Lanjut: tiga pertanyaan singkat');
  await page.locator('textarea').fill('uji tanpa pengumpul');
  await lanjut(page, LABEL_SELESAI);
  await expect(page.getByRole('heading', { name: 'Terima kasih.' })).toBeVisible();
  // M3.14 D-3: kalender simulasi menggantikan 'Coba simulasi lain'; pesan penutup tampil langsung.
  await expect(page.getByText(kasus.penutup.kepala)).toBeVisible();
  await expect(page.locator('[data-uid="kalender-simulasi"]')).toBeVisible();
  await ketuk(page.locator(`[data-uid="kalender:pilih:${kasus.kasus_id}"]`));
  await expect(page.getByRole('button', { name: 'Mulai simulasi' })).toBeVisible();

  // Halaman ditinggalkan sungguhan: di sinilah `pagehide` menyala, dan di sinilah
  // build dengan pengumpul akan mengirim beacon terakhirnya.
  await page.goto('about:blank');

  const keAsalLain = permintaan.filter((p) => !p.url.startsWith(`${asal}/`) && p.url !== 'about:blank');
  const menulis = permintaan.filter((p) => p.metode !== 'GET' && p.metode !== 'HEAD');

  expect(
    keAsalLain.map((p) => `${p.metode} ${p.url}`),
    'tidak boleh ada permintaan ke asal mana pun selain asal aplikasi',
  ).toEqual([]);
  expect(
    menulis.map((p) => `${p.metode} ${p.url}`),
    'tidak boleh ada POST maupun beacon sama sekali',
  ).toEqual([]);

  /* --- dan bundelnya sendiri memang tidak punya alamat --------------- */
  const bundel = bacaBundel(DIR_DIST_TANPA);
  expect(bundel.length, 'ada berkas JS hasil build').toBeGreaterThan(0);
  for (const b of bundel) {
    expect(b.teks.includes('"/e"'), `${b.nama} tidak memuat alamat pengumpul`).toBe(false);
    expect(b.teks.includes('sendBeacon'), `${b.nama} tidak memuat sendBeacon`).toBe(false);
    expect(b.teks.includes('E:/'), `${b.nama} tidak memuat E:/`).toBe(false);
  }

  expect(galat.kode(), 'tidak ada galat konsol').toEqual([]);
  expect(gagalYangBerarti(galat.permintaanGagal()), 'tidak ada permintaan gagal').toEqual([]);

  // eslint-disable-next-line no-console
  console.log(
    `E-08 tanpa-pengumpul: permintaan=${String(permintaan.length)} ` +
      `(${[...new Set(permintaan.map((p) => `${p.metode} ${p.jenis}`))].join(', ')}) ` +
      `ke-asal-lain=0 tulis=0; bundel=${bundel.map((b) => `${b.nama} ${String(b.bita)}B`).join(' ')}`,
  );
});
