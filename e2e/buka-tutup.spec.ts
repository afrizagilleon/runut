import { expect, test, type Locator, type Page } from '@playwright/test';
import {
  LABEL_SESUDAHNYA,
  bilahTurunAda,
  buka,
  ketuk,
  kunciJawaban,
  lanjut,
  mulaiKasus,
  penandaBaru,
  pilihOpsi,
  tungguSoal,
} from './bantu/main.ts';
import { bacaKasus, type SoalUji } from './bantu/kasus.ts';

/**
 * E-03 — yang bisa dibuka harus bisa ditutup.
 *
 * Cacat aslinya (M3.2 §10c) ditemukan pemilik di ponselnya: kaki lembar selalu
 * men-dispatch "buka", dan aksi "tutup" ada di reducer tanpa satu pun pemanggil.
 * Tes eksekutor waktu itu hanya menguji arah buka; bite-test reviewer hanya
 * mengetuk sekali. Karena itu tes ini tidak pernah mengetuk sekali: tiap kontrol
 * **dibuka, ditutup, lalu dibuka lagi**, dan di tiap langkah dua hal diperiksa —
 * `aria-expanded` **dan** apakah isinya benar-benar ada di halaman.
 *
 * Kontrol lipat di aplikasi ini ada tiga macam, dan ketiganya diaudit:
 *   1. tombol ber-`aria-expanded` — kaki lembar dan baris istilah;
 *   2. `<details>` bawaan peramban — "Rincian teknis" dan lipatan jejak verifikasi;
 *   3. tautan angka (`data-uid="angka:…"`) yang membuka penjelasan sebaris.
 */

/** Teks yang selalu muncul di dalam panel sumber yang terbuka (`IsiLembarTerbuka`). */
const PENANDA_ISI_TERBUKA = 'Kalimat resminya';

/**
 * Tiap tautan angka yang ada di layar ini **harus** membawa `aria-expanded`.
 *
 * Tanpa asersi ini, audit di bawah hanya "memungut yang kebetulan ada": mencabut
 * `aria-expanded` dari tautan angka membuat kontrolnya menghilang dari daftar
 * dan seluruh rangkaian tetap hijau — terbukti, itu yang terjadi pada sabotase
 * pertama A1-T4. Yang dijaga sekarang adalah **kelengkapannya**, bukan hanya
 * perilaku yang kebetulan tertangkap.
 */
async function tautanAngkaBerAria(page: Page, namaLayar: string): Promise<number> {
  const semua = await page.locator('[data-uid^="angka:"]').count();
  const berAria = await page.locator('[data-uid^="angka:"][aria-expanded]').count();
  expect(
    berAria,
    `layar "${namaLayar}": ${String(berAria)} dari ${String(semua)} tautan angka membawa aria-expanded (C-2)`,
  ).toBe(semua);
  return semua;
}

/** Isi yang harus muncul ketika sebuah kontrol ber-`aria-expanded` dibuka. */
function isiKontrol(page: Page, uid: string, soal: SoalUji): Locator {
  if (uid.startsWith('kaki:')) {
    const fact_id = uid.slice('kaki:'.length);
    return page.locator(`[data-uid="lembar:${fact_id}"]`).getByText(PENANDA_ISI_TERBUKA);
  }
  if (uid.startsWith('angka:')) {
    /*
     * Tautan angka mendapat `aria-expanded` di A1-T4 (C-2), jadi audit ini
     * memungutnya **sendiri** — tanpa satu baris pun yang menyebutnya di sini
     * selain pemetaan ke isinya. Itulah yang dimaksud "E-03 memungutnya
     * otomatis": penjaga yang harus diingat untuk didaftarkan adalah penjaga
     * yang suatu hari akan lupa didaftarkan.
     */
    const fact_id = uid.slice('angka:'.length);
    return page.locator(`[id="penjelasan-${fact_id}"]`);
  }
  if (uid === 'istilah') {
    const arti = soal.istilah[0]?.arti ?? '';
    expect(arti, 'soal ini harus punya istilah dengan artinya').not.toBe('');
    return page.locator('[data-uid="istilah"]').getByText(arti);
  }
  throw new Error(`kontrol lipat tidak dikenal: ${uid}`);
}

/**
 * Buka → tutup → buka setiap kontrol ber-`aria-expanded` di layar ini, lalu
 * kembalikan semuanya ke keadaan tertutup. Mengembalikan daftar `data-uid` yang
 * diaudit, supaya jumlahnya bisa dilaporkan dan diperiksa.
 */
async function auditLipat(page: Page, soal: SoalUji): Promise<string[]> {
  const kontrol = page.locator('[aria-expanded]');
  const jumlah = await kontrol.count();
  const diaudit: string[] = [];

  for (let nomor = 0; nomor < jumlah; nomor += 1) {
    const satu = kontrol.nth(nomor);
    /*
     * `data-uid` terdekat **ke atas**, bukan di elemen itu sendiri: tombol baris
     * istilah tidak membawa uid-nya sendiri, uid `istilah` ada di pembungkusnya.
     * Pelacak produk (`bacaSasaran`) membaca rantai dengan cara yang sama, jadi
     * tes ini menamai kontrolnya persis seperti data yang dikumpulkan menamainya.
     */
    const uid = await satu.evaluate((el) => el.closest('[data-uid]')?.getAttribute('data-uid') ?? '');
    expect(uid, 'tiap kontrol lipat harus bisa dinamai lewat data-uid (D-8)').not.toBe('');
    const isi = isiKontrol(page, uid, soal);

    await expect(satu, `${uid} mulai tertutup`).toHaveAttribute('aria-expanded', 'false');
    await expect(isi, `${uid} isinya belum ada sebelum dibuka`).toHaveCount(0);

    await ketuk(satu);
    await expect(satu, `${uid} terbuka sesudah ketukan pertama`).toHaveAttribute(
      'aria-expanded',
      'true',
    );
    await expect(isi, `${uid} isinya muncul`).toBeVisible();

    await ketuk(satu);
    await expect(satu, `${uid} TERTUTUP sesudah ketukan kedua`).toHaveAttribute(
      'aria-expanded',
      'false',
    );
    // Hilang dari DOM, bukan sekadar disembunyikan CSS.
    await expect(isi, `${uid} isinya hilang dari halaman`).toHaveCount(0);

    await ketuk(satu);
    await expect(satu, `${uid} terbuka lagi sesudah ketukan ketiga`).toHaveAttribute(
      'aria-expanded',
      'true',
    );
    await expect(isi, `${uid} isinya muncul lagi`).toBeVisible();

    await ketuk(satu);
    await expect(satu).toHaveAttribute('aria-expanded', 'false');

    diaudit.push(uid);
  }
  return diaudit;
}

test('E-03a tiap kontrol lipat di ketiga layar soal bisa ditutup, sebelum dan sesudah dikunci', async ({
  page,
}) => {
  const kasus = bacaKasus();
  await buka(page, penandaBaru());
  await mulaiKasus(page);

  const laporan: string[] = [];

  for (const [nomor, soal] of kasus.soal.entries()) {
    await tungguSoal(page, nomor + 1);

    const sebelum = await auditLipat(page, soal);
    expect(
      sebelum.length,
      `layar soal ${String(nomor + 1)} harus punya kontrol lipat sebelum dikunci`,
    ).toBeGreaterThan(0);
    laporan.push(`soal-${String(nomor + 1)} sebelum-dikunci: ${String(sebelum.length)} — ${sebelum.join(', ')}`);

    /* --- dua lembar terbuka bersamaan, dan saling mandiri (A2-T1) ------ */
    const kaki = page.locator('[data-uid^="kaki:"]');
    const jumlahKaki = await kaki.count();
    expect(jumlahKaki, `soal ${String(nomor + 1)} punya lembar`).toBeGreaterThanOrEqual(2);
    const satu = kaki.nth(0);
    const dua = kaki.nth(1);
    await ketuk(satu);
    await ketuk(dua);
    await expect(satu, 'lembar pertama tetap terbuka saat lembar kedua dibuka').toHaveAttribute(
      'aria-expanded',
      'true',
    );
    await expect(dua).toHaveAttribute('aria-expanded', 'true');
    await ketuk(satu);
    await expect(satu, 'lembar pertama ditutup').toHaveAttribute('aria-expanded', 'false');
    await expect(dua, 'lembar kedua TIDAK ikut tertutup').toHaveAttribute('aria-expanded', 'true');
    await ketuk(dua);

    /* --- "Rincian teknis": <details>, bukan aria-expanded -------------- */
    await ketuk(satu);
    const rincian = page.locator('details[data-uid="rincian"]').first();
    await expect(rincian).toHaveJSProperty('open', false);
    await ketuk(rincian.locator('summary'));
    await expect(rincian, 'Rincian teknis terbuka').toHaveJSProperty('open', true);
    await ketuk(rincian.locator('summary'));
    await expect(rincian, 'Rincian teknis BISA ditutup').toHaveJSProperty('open', false);
    await ketuk(satu);

    /* --- jawab dan kunci, lalu audit ulang layar yang sama ------------- */
    await bilahTurunAda(page, soal.pilihan[0]?.kunci ?? 'a');
    await pilihOpsi(page, soal.jawaban);
    await kunciJawaban(page);

    const sesudah = await auditLipat(page, soal);
    expect(
      sesudah.length,
      `layar soal ${String(nomor + 1)} harus punya kontrol lipat sesudah dikunci`,
    ).toBeGreaterThan(0);
    laporan.push(`soal-${String(nomor + 1)} sesudah-dikunci: ${String(sesudah.length)} — ${sesudah.join(', ')}`);

    /* --- tautan angka di teks kunci (PenjelasanSebaris) ---------------- */
    await tautanAngkaBerAria(page, `soal-${String(nomor + 1)}-sesudah-dikunci`);
    const angka = page.locator('[data-uid="teks-kunci"] [data-uid^="angka:"]');
    const jumlahAngka = await angka.count();
    laporan.push(`soal-${String(nomor + 1)} tautan-angka-di-teks-kunci: ${String(jumlahAngka)}`);
    if (jumlahAngka > 0) {
      const terbuka = page.getByText(PENANDA_ISI_TERBUKA);
      const awal = await terbuka.count();
      await ketuk(angka.first());
      await expect(terbuka, 'tautan angka membuka penjelasan sebaris').not.toHaveCount(awal);
      await ketuk(angka.first());
      await expect(terbuka, 'tautan angka BISA menutup penjelasannya lagi').toHaveCount(awal);
      await ketuk(angka.first());
      await expect(terbuka, 'dan membukanya lagi').not.toHaveCount(awal);
      await ketuk(angka.first());
      await expect(terbuka).toHaveCount(awal);
    }

    if (nomor < kasus.soal.length - 1) await lanjut(page, `Lanjut ke soal ${String(nomor + 2)}`);
  }

  // eslint-disable-next-line no-console
  console.log(`E-03a kontrol lipat per layar:\n  ${laporan.join('\n  ')}`);
});

test('E-03b layar pembukaan: lipatan jejak dan tautan angka bisa ditutup lagi', async ({ page }) => {
  const kasus = bacaKasus();
  await buka(page, penandaBaru());
  await mulaiKasus(page);
  for (const [nomor, soal] of kasus.soal.entries()) {
    await tungguSoal(page, nomor + 1);
    await bilahTurunAda(page, soal.pilihan[0]?.kunci ?? 'a');
    await pilihOpsi(page, soal.jawaban);
    await kunciJawaban(page);
    if (nomor < kasus.soal.length - 1) await lanjut(page, `Lanjut ke soal ${String(nomor + 2)}`);
  }
  await lanjut(page, LABEL_SESUDAHNYA);
  await expect(page.getByRole('heading', { name: 'Waktu berjalan lagi' })).toBeVisible();

  /* --- lipatan jejak verifikasi --------------------------------------- */
  const jejak = page.locator('details[data-uid="jejak"]');
  await expect(jejak).toHaveJSProperty('open', false);
  await ketuk(jejak.locator('summary'));
  await expect(jejak, 'jejak verifikasi terbuka').toHaveJSProperty('open', true);
  await expect(page.getByRole('heading', { name: 'Jejak verifikasi' })).toBeVisible();
  await ketuk(jejak.locator('summary'));
  await expect(jejak, 'jejak verifikasi BISA ditutup').toHaveJSProperty('open', false);
  await ketuk(jejak.locator('summary'));
  await expect(jejak, 'dan bisa dibuka lagi').toHaveJSProperty('open', true);

  /* --- tautan angka di garis waktu dan ringkasan ----------------------- */
  const angka = page.locator('[data-uid^="angka:"]');
  const jumlah = await tautanAngkaBerAria(page, 'pembukaan');
  expect(jumlah, 'layar pembukaan harus punya tautan angka').toBeGreaterThan(0);

  const terbuka = page.getByText(PENANDA_ISI_TERBUKA);
  await expect(terbuka).toHaveCount(0);

  // Tiga tautan pertama sudah cukup untuk membuktikan polanya; menguji
  // semuanya hanya memperpanjang tes tanpa menambah satu pun jenis kegagalan.
  const diuji = Math.min(3, jumlah);
  for (let nomor = 0; nomor < diuji; nomor += 1) {
    const satu = angka.nth(nomor);
    const uid = (await satu.getAttribute('data-uid')) ?? '';
    await ketuk(satu);
    await expect(terbuka, `${uid} membuka penjelasan sebaris`).not.toHaveCount(0);
    await ketuk(satu);
    await expect(terbuka, `${uid} BISA menutup penjelasannya lagi`).toHaveCount(0);
    await ketuk(satu);
    await expect(terbuka, `${uid} membukanya lagi`).not.toHaveCount(0);
    await ketuk(satu);
    await expect(terbuka).toHaveCount(0);
  }

  /*
   * `aria-controls` yang ditambahkan A1-T4 menunjuk `id` blok penjelasan. Kalau
   * satu fakta dirujuk dari dua paragraf dan keduanya dibuka, dua blok dengan
   * `id` yang sama akan lahir — rujukan yang menunjuk ke dua tempat sekaligus,
   * dan pembaca layar hanya menemukan yang pertama. Data kasus sekarang tidak
   * menghasilkannya; penjaga ini ada supaya kasus berikutnya tidak diam-diam
   * menghasilkannya.
   */
  for (let n = jumlah - 1; n >= 0; n -= 1) await ketuk(angka.nth(n));
  const idKembar = await page.evaluate(() => {
    const hitung = new Map<string, number>();
    for (const el of document.querySelectorAll('[id]')) {
      hitung.set(el.id, (hitung.get(el.id) ?? 0) + 1);
    }
    return [...hitung].filter(([, berapa]) => berapa > 1).map(([id, berapa]) => `${id} x${String(berapa)}`);
  });
  expect(idKembar, 'tidak boleh ada id kembar ketika semua penjelasan terbuka').toEqual([]);

  // eslint-disable-next-line no-console
  console.log(
    `E-03b pembukaan: kontrol aria-expanded=${String(await page.locator('[aria-expanded]').count())} ` +
      `details=${String(await page.locator('details').count())} tautan-angka=${String(jumlah)} ` +
      `(diuji buka-tutup-buka ${String(diuji)}, semuanya dibuka untuk memeriksa id kembar)`,
  );
});
