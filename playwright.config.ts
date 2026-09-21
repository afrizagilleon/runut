import { defineConfig, devices } from '@playwright/test';
import type { PlaywrightTestConfig } from '@playwright/test';
import {
  AKAR,
  ASAL_DENGAN,
  ASAL_DEV,
  ASAL_KOLEKTOR,
  ASAL_TANPA,
  DIR_DATA,
  DIR_DIST_DENGAN,
  DIR_DIST_TANPA,
  DIR_HASIL,
  DIR_LAPORAN,
  HOST_TIDAK_AMAN,
  PORT_DENGAN,
  PORT_DEV,
  PORT_KOLEKTOR,
  PORT_TANPA,
} from './e2e/bantu/jalur.ts';

/**
 * Uji ujung-ke-ujung di Chromium yang sungguh melukis (M3.3).
 *
 * Tiga keputusan yang menentukan bentuk berkas ini:
 *
 * - **`channel: 'chromium'`** — headless baru (biner Chrome for Testing), bukan
 *   `chromium-headless-shell` yang dipakai Playwright secara bawaan. Tes kenari
 *   diukur di **kedua** mode di mesin ini dan keduanya lolos (angkanya di ledger
 *   T-01, OQ-1), jadi pilihan ini bukan keharusan melainkan keputusan: yang
 *   dipakai adalah mesin peramban yang sama dengan yang sampai ke ponsel
 *   pemilik, bukan biner headless terpisah dengan jalur lukis sendiri.
 * - **`retries: 0`** — tes yang hanya hijau pada percobaan kedua adalah tes yang
 *   tidak tahu apa yang ditunggunya. Penungggu bawaan `expect()` dan
 *   `expect.poll` menggantikan itu; `waitForTimeout` dilarang di seluruh `e2e/`.
 * - **`reuseExistingServer: false`** dengan `--strictPort` di semua server —
 *   port yang sudah terpakai harus gagal terang. Diam-diam pindah port berarti
 *   tes bisa mengukur server yang salah.
 */

const jalanVite = `node "${AKAR}node_modules/vite/bin/vite.js"`;

/** Alamat pengumpul uji, diteruskan proxy vite; bukan 8787 milik pemilik. */
const lingkunganVite = {
  KOLEKTOR_PROXY: ASAL_KOLEKTOR,
  E2E_HOST: HOST_TIDAK_AMAN,
} as const;

const ponsel = {
  ...devices['Pixel 5'],
  viewport: { width: 360, height: 640 },
  deviceScaleFactor: 2,
  isMobile: true,
  hasTouch: true,
} as const;

/**
 * Proyek `alpha` hanya terdaftar kalau alamatnya diberikan (D-5, G-2). Tanpa
 * variabel itu `npx playwright test --list` tidak boleh menyebutnya sama
 * sekali — eksekutor tidak menjalankannya, karena di ujung alamat itu ada
 * server yang mengumpulkan data sungguhan.
 */
const alamatAlpha: string = process.env.E2E_ALPHA_URL ?? '';

type Proyek = NonNullable<PlaywrightTestConfig['projects']>[number];

const proyekAlpha: Proyek[] =
  alamatAlpha === ''
    ? []
    : [
        {
          name: 'alpha',
          testMatch: ['**/permainan.spec.ts'],
          use: { ...ponsel, channel: 'chromium', colorScheme: 'light', baseURL: alamatAlpha },
        },
      ];

export default defineConfig({
  testDir: './e2e',
  outputDir: DIR_HASIL,
  fullyParallel: true,
  forbidOnly: true,
  retries: 0,
  timeout: 90_000,
  expect: { timeout: 15_000 },
  reporter: [
    ['list'],
    ['html', { outputFolder: DIR_LAPORAN, open: 'never' }],
  ],
  globalSetup: './e2e/bantu/siapkan.ts',

  use: {
    trace: 'retain-on-failure',
    video: 'off',
    screenshot: 'off',
    launchOptions: {
      /*
       * D-4: satu nama host yang bukan localhost, dipetakan ke loopback di
       * dalam peramban saja. Tidak ada server yang mendengarkan di luar
       * loopback, jadi tidak ada dialog firewall Windows dan tidak ada yang
       * terbuka ke LAN.
       */
      args: [`--host-resolver-rules=MAP ${HOST_TIDAK_AMAN} 127.0.0.1`],
    },
  },

  webServer: [
    {
      command: `node "${AKAR}server/kolektor.mjs"`,
      url: `${ASAL_KOLEKTOR}/sehat`,
      reuseExistingServer: false,
      stdout: 'pipe',
      stderr: 'pipe',
      env: {
        HOST: '127.0.0.1',
        PORT: String(PORT_KOLEKTOR),
        DATA_DIR: DIR_DATA,
      },
    },
    {
      command: `${jalanVite} --port ${String(PORT_DEV)} --strictPort --host 127.0.0.1`,
      url: `${ASAL_DEV}/`,
      cwd: AKAR,
      reuseExistingServer: false,
      stdout: 'pipe',
      stderr: 'pipe',
      /*
       * `/e` diset DI SINI, di dalam Node. Menuliskannya di baris perintah Git
       * Bash membuatnya menjadi `E:/` — jebakan yang sudah pernah menggigit
       * proyek ini (§3.3).
       */
      env: { ...lingkunganVite, VITE_KOLEKTOR_URL: '/e' },
    },
    {
      command: `node "${AKAR}e2e/bantu/bangun.ts" dengan && ${jalanVite} preview --outDir "${DIR_DIST_DENGAN}" --port ${String(PORT_DENGAN)} --strictPort --host 127.0.0.1`,
      url: `${ASAL_DENGAN}/`,
      cwd: AKAR,
      reuseExistingServer: false,
      stdout: 'pipe',
      stderr: 'pipe',
      env: { ...lingkunganVite },
    },
    {
      command: `node "${AKAR}e2e/bantu/bangun.ts" tanpa && ${jalanVite} preview --outDir "${DIR_DIST_TANPA}" --port ${String(PORT_TANPA)} --strictPort --host 127.0.0.1`,
      url: `${ASAL_TANPA}/`,
      cwd: AKAR,
      reuseExistingServer: false,
      stdout: 'pipe',
      stderr: 'pipe',
      env: { ...lingkunganVite },
    },
  ],

  projects: [
    {
      name: 'ponsel-terang',
      testIgnore: ['**/jaringan-tanpa.spec.ts', '**/papan-ketik.spec.ts', '**/tata-letak-lebar.spec.ts'],
      use: { ...ponsel, channel: 'chromium', colorScheme: 'light', baseURL: ASAL_DENGAN },
    },
    {
      name: 'ponsel-gelap',
      testIgnore: [
        '**/jaringan-tanpa.spec.ts',
        '**/jaringan-dengan.spec.ts',
        '**/kenari.spec.ts',
        '**/papan-ketik.spec.ts',
        '**/tata-letak-lebar.spec.ts',
      ],
      use: { ...ponsel, channel: 'chromium', colorScheme: 'dark', baseURL: ASAL_DENGAN },
    },
    {
      name: 'dev',
      testMatch: ['**/asal-tidak-aman.spec.ts', '**/mulai-satu.spec.ts', '**/permainan.spec.ts'],
      use: { ...ponsel, channel: 'chromium', colorScheme: 'light', baseURL: ASAL_DEV },
    },
    {
      name: 'tanpa-pengumpul',
      testMatch: ['**/jaringan-tanpa.spec.ts'],
      use: { ...ponsel, channel: 'chromium', colorScheme: 'light', baseURL: ASAL_TANPA },
    },
    {
      name: 'lebar',
      testMatch: [
        '**/tata-letak-lebar.spec.ts',
        '**/papan-ketik.spec.ts',
        '**/permainan.spec.ts',
        '**/umpan-tekan.spec.ts',
      ],
      use: {
        ...devices['Desktop Chrome'],
        channel: 'chromium',
        viewport: { width: 1280, height: 800 },
        isMobile: false,
        hasTouch: false,
        colorScheme: 'light',
        baseURL: ASAL_DENGAN,
      },
    },
    ...proyekAlpha,
  ],
});
