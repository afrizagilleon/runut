import { expect, test } from '@playwright/test';
import { LABEL_MULAI, KASUS_BAWAAN, penandaBaru } from './bantu/main.ts';
import { mulaiDenganPenanda, semuaBaris, tungguSatuSesi } from './bantu/peristiwa.ts';

/**
 * E-21 — keterangan perangkat di peristiwa `mulai` sampai ke berkas (M3.8 D-1).
 *
 * Yang diuji bukan fungsi pendeteksinya (itu tugas `web/src/perangkat.test.ts`
 * dengan UA sungguhan), melainkan **jalurnya**: dari peramban yang sungguh
 * melukis, lewat `sendBeacon` dan validator pengumpul, ke baris JSONL. Tiap
 * nilai yang diperiksa di sini dipasang tes sendiri lewat emulasi Playwright,
 * jadi tes tahu jawabannya tanpa bertanya kepada produk:
 *
 * - `colorScheme` proyek → `skema_warna` (ponsel-gelap harus `gelap`);
 * - viewport 360 × 640, `deviceScaleFactor` 2 → `tinggi_layar` 640, `rasio_piksel` 2;
 * - `locale` dan `timezoneId` → `bahasa` dan `zona_menit`;
 * - perujuk yang dipasang di `goto` → `perujuk`, **tanpa** path maupun query-nya.
 */

const MEDAN_BARU = [
  'tinggi_layar',
  'rasio_piksel',
  'skema_warna',
  'penunjuk',
  'os',
  'peramban_dalam',
  'perujuk',
  'bahasa',
  'jam_lokal',
  'hari_lokal',
  'zona_menit',
  'koneksi',
  'hemat_data',
  'gerak_dikurangi',
  'mandiri',
] as const;

/** Jam di Jakarta menurut jam tes ini sendiri, bukan menurut produk. */
function jamJakarta(): number {
  return Number(
    new Intl.DateTimeFormat('en-GB', { hour: '2-digit', hour12: false, timeZone: 'Asia/Jakarta' })
      .format(new Date())
      .slice(0, 2),
  ) % 24;
}

test.describe('E-21 perangkat', () => {
  test.use({ locale: 'id-ID', timezoneId: 'Asia/Jakarta' });

  test('E-21a mulai membawa kelima belas medan, dan nilainya sama dengan emulasinya', async ({
    page,
  }, info) => {
    const penanda = penandaBaru();
    const jamSebelum = jamJakarta();
    // Perujuk sengaja membawa path dan query: yang boleh sampai hanya kategorinya.
    await page.goto(`/?k=${penanda}&kasus=${KASUS_BAWAAN}&pemandu=0`, {
      referer: 'https://l.threads.net/?u=https%3A%2F%2Frahasia.contoh%2Fjalur&e=AT0kodeRahasia',
    });
    await expect(page.getByRole('button', { name: LABEL_MULAI })).toBeVisible();
    const sesi = await tungguSatuSesi(penanda);
    const jamSesudah = jamJakarta();

    const mulai = mulaiDenganPenanda(penanda)[0];
    expect(mulai).toBeDefined();
    const isi = mulai?.isi ?? {};

    for (const medan of MEDAN_BARU) {
      expect(Object.hasOwn(isi, medan), `medan ${medan} harus ADA di mulai`).toBe(true);
    }

    const gelap = info.project.use.colorScheme === 'dark';
    expect(isi['skema_warna']).toBe(gelap ? 'gelap' : 'terang');
    expect(isi['tinggi_layar']).toBe(640);
    expect(isi['rasio_piksel']).toBe(2);
    expect(isi['os']).toBe('android'); // UA Pixel 5 milik Playwright
    expect(isi['peramban_dalam']).toBe('tidak');
    expect(isi['perujuk']).toBe('threads');
    expect(isi['bahasa']).toBe('id');
    expect(isi['zona_menit']).toBe(420);
    expect([jamSebelum, jamSesudah]).toContain(isi['jam_lokal']);
    expect(isi['hari_lokal']).toBeGreaterThanOrEqual(0);
    expect(isi['hari_lokal']).toBeLessThanOrEqual(6);
    expect(['4g', '3g', '2g', 'lambat', 'tidak-tahu']).toContain(isi['koneksi']);
    expect(['kasar', 'halus', 'tidak']).toContain(isi['penunjuk']);
    expect(isi['gerak_dikurangi']).toBe(false);
    expect(isi['mandiri']).toBe(false);

    // INV: baris sesi ini di berkas tidak memuat UA mentah maupun perujuk.
    const mentah = JSON.stringify(semuaBaris().filter((p) => p.sesi === sesi));
    expect(mentah).not.toMatch(/Mozilla|AppleWebKit|:\/\/|rahasia|kodeRahasia|l\.threads/);

    // eslint-disable-next-line no-console
    console.log(
      `E-21a [${info.project.name}] ` + MEDAN_BARU.map((m) => `${m}=${String(isi[m])}`).join(' '),
    );
  });

  test('E-21b tanpa perujuk = langsung; gerak dikurangi terbaca', async ({ page }) => {
    await page.emulateMedia({ reducedMotion: 'reduce' });
    const penanda = penandaBaru();
    await page.goto(`/?k=${penanda}&kasus=${KASUS_BAWAAN}&pemandu=0`);
    await expect(page.getByRole('button', { name: LABEL_MULAI })).toBeVisible();
    await tungguSatuSesi(penanda);
    const isi = mulaiDenganPenanda(penanda)[0]?.isi ?? {};
    expect(isi['perujuk']).toBe('langsung');
    expect(isi['gerak_dikurangi']).toBe(true);
  });
});

test.describe('E-21c peramban dalam aplikasi Threads', () => {
  /*
   * UA Threads Android yang sungguhan. Ia hanya boleh ada di berkas TES: yang
   * sampai ke berkas pengumpul harus kategori `threads`, bukan string ini.
   */
  test.use({
    userAgent:
      'Mozilla/5.0 (Linux; Android 14; SM-S918B Build/UP1A.231005.007; wv) AppleWebKit/537.36 ' +
      '(KHTML, like Gecko) Version/4.0 Chrome/124.0.6367.179 Mobile Safari/537.36 ' +
      'Barcelona 330.0.0.37.64 Android (34/14; 480dpi; 1080x2340; samsung; SM-S918B; dm3q; qcom; en_US; 606423413)',
  });

  test('E-21c UA Threads → peramban_dalam threads, dan UA-nya tidak ikut', async ({ page }) => {
    const penanda = penandaBaru();
    await page.goto(`/?k=${penanda}&kasus=${KASUS_BAWAAN}&pemandu=0`);
    await expect(page.getByRole('button', { name: LABEL_MULAI })).toBeVisible();
    const sesi = await tungguSatuSesi(penanda);
    const isi = mulaiDenganPenanda(penanda)[0]?.isi ?? {};
    expect(isi['peramban_dalam']).toBe('threads');
    expect(isi['os']).toBe('android');
    const mentah = JSON.stringify(semuaBaris().filter((p) => p.sesi === sesi));
    expect(mentah).not.toMatch(/Mozilla|AppleWebKit|Barcelona|SM-S918B/);
  });
});
