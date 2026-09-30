import { expect, test } from '@playwright/test';
import {
  LABEL_LANJUT_AKHIR,
  LABEL_MULAI,
  LABEL_SELESAI,
  LABEL_SESUDAHNYA,
  KASUS_BAWAAN,
  bilahTurunAda,
  ketuk,
  kunciJawaban,
  lanjut,
  mulaiKasus,
  penandaBaru,
  pilihOpsi,
  tungguSoal,
} from './bantu/main.ts';
import { bacaKasus } from './bantu/kasus.ts';
import { peristiwaSesi, tungguPeristiwa } from './bantu/peristiwa.ts';

/**
 * E-26 — INV M3.8 D-9: tidak satu pun kiriman memuat `Mozilla`, `AppleWebKit`,
 * atau `://`.
 *
 * Yang dipotret adalah **badan setiap permintaan ke `/e`** — antrean kiriman
 * seperti yang meninggalkan peramban, sebelum pengumpul memvalidasi dan
 * menyusunnya ulang. Membaca berkas pengumpul saja tidak cukup: pengumpul
 * membangun baris dari medan yang lolos validator, jadi medan liar yang
 * DITOLAK tidak pernah tertulis — dan justru kiriman yang ditolak itulah yang
 * sudah meninggalkan ponsel orang.
 *
 * Permainan dibuat seberbahaya mungkin untuk janji itu: UA Threads sungguhan
 * (memuat `Mozilla` DAN `AppleWebKit`), perujuk lengkap dengan path dan query,
 * satu galat yang pesannya membawa alamat dan potongan UA, halaman yang
 * tersembunyi lalu kembali, satu permainan penuh sampai layar akhir, lalu
 * tab ditutup. Kalau satu saja medan membocorkan bahan mentahnya, tes ini
 * merah.
 */

const UA_THREADS =
  'Mozilla/5.0 (Linux; Android 14; SM-S918B Build/UP1A.231005.007; wv) AppleWebKit/537.36 ' +
  '(KHTML, like Gecko) Version/4.0 Chrome/124.0.6367.179 Mobile Safari/537.36 ' +
  'Barcelona 330.0.0.37.64 Android (34/14; 480dpi; 1080x2340; samsung; SM-S918B; dm3q; qcom; en_US; 606423413)';

const PERUJUK = 'https://l.threads.net/?u=https%3A%2F%2Frahasia.contoh%2Fjalur&e=AT0kodeRahasia';

const PESAN_GALAT =
  'gagal memuat https://rahasia.contoh/api?token=kodeRahasia oleh Mozilla/5.0 AppleWebKit/537.36 nomor 123456789';

test.use({ userAgent: UA_THREADS, locale: 'id-ID' });

interface Terkirim {
  nama: string;
  sesi: string;
  isi: Record<string, unknown>;
}

/**
 * Semua yang menunggu di tes ini menunggu KIRIMANNYA, bukan berkas pengumpul.
 *
 * Pengumpul SKEMA 3 menolak medan yang membocorkan bahan mentah (pertahanan
 * kedua). Kalau tes menunggu berkasnya, sebuah kebocoran membuat tes merah
 * karena "peristiwa tidak tiba" — merah untuk alasan yang salah, dan asersi
 * INV di bawah tidak pernah berjalan. Menunggu antreannya sendiri membuat INV
 * yang menangkapnya, dengan pesan yang menyebut apa yang bocor.
 */
function terkirim(kiriman: readonly string[]): Terkirim[] {
  return kiriman.flatMap((b) => {
    try {
      return JSON.parse(b) as Terkirim[];
    } catch {
      return [];
    }
  });
}

async function tungguTerkirim(kiriman: readonly string[], nama: string): Promise<void> {
  await expect
    .poll(() => terkirim(kiriman).some((p) => p.nama === nama), {
      timeout: 20_000,
      message: `menunggu "${nama}" meninggalkan peramban`,
    })
    .toBe(true);
}

test('E-26 satu permainan penuh: nol Mozilla, nol AppleWebKit, nol :// di seluruh kiriman', async ({
  page,
}) => {
  const kiriman: string[] = [];
  await page.route('**/e', async (rute) => {
    const badan = rute.request().postDataBuffer()?.toString('utf8') ?? '';
    kiriman.push(badan);
    await rute.continue();
  });
  await page.route('**/uji-galat-privasi.js', (rute) =>
    rute.fulfill({
      contentType: 'application/javascript',
      body: `throw new Error(${JSON.stringify(PESAN_GALAT)});`,
    }),
  );

  const kasus = bacaKasus();
  const penanda = penandaBaru();
  await page.goto(`/?k=${penanda}&kasus=${KASUS_BAWAAN}&pemandu=0`, { referer: PERUJUK });
  await expect(page.getByRole('button', { name: LABEL_MULAI })).toBeVisible();
  await tungguTerkirim(kiriman, 'mulai');
  const sesi = terkirim(kiriman).find((p) => p.nama === 'mulai')?.sesi ?? '';

  // Pindah aplikasi sebentar, lalu kembali.
  for (const k of ['hidden', 'visible'] as const) {
    await page.evaluate((keadaan) => {
      Object.defineProperty(document, 'visibilityState', { configurable: true, get: () => keadaan });
      document.dispatchEvent(new Event('visibilitychange'));
    }, k);
  }
  await tungguTerkirim(kiriman, 'tampak');

  // Satu galat seasal yang pesannya kotor.
  await page.evaluate(async () => {
    await new Promise<void>((selesai) => {
      const s = document.createElement('script');
      s.src = '/uji-galat-privasi.js';
      s.onload = () => selesai();
      s.onerror = () => selesai();
      document.head.appendChild(s);
    });
  });
  await tungguTerkirim(kiriman, 'galat');

  // Satu permainan penuh.
  await mulaiKasus(page);
  for (const [nomor, soal] of kasus.soal.entries()) {
    await tungguSoal(page, nomor + 1);
    await bilahTurunAda(page, soal.pilihan[0]?.kunci ?? 'a');
    await ketuk(page.locator(`[data-uid="kaki:${soal.kartu[0] ?? ''}"]`));
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
  await tungguTerkirim(kiriman, 'akhir_kirim');

  /* --- INV --- */
  const semua = kiriman.join('\n');
  expect(kiriman.length, 'ada kiriman yang dipotret').toBeGreaterThan(3);
  expect(semua.match(/Mozilla/g) ?? [], 'nol "Mozilla" di kiriman').toEqual([]);
  expect(semua.match(/AppleWebKit/g) ?? [], 'nol "AppleWebKit" di kiriman').toEqual([]);
  expect(semua.match(/:\/\//g) ?? [], 'nol "://" di kiriman').toEqual([]);
  expect(semua, 'tidak ada potongan perujuk maupun token').not.toMatch(/rahasia|kodeRahasia|l\.threads\.net|Barcelona|SM-S918B/);

  /* --- subyek: kirimannya memang memuat semua jenis yang baru --- */
  const nama = new Set<string>();
  for (const badan of kiriman) {
    for (const p of JSON.parse(badan) as Array<{ nama: string }>) nama.add(p.nama);
  }
  for (const wajib of ['mulai', 'tampak', 'galat', 'kinerja', 'kartu_buka', 'kunci_jawaban', 'akhir_kirim']) {
    expect(nama.has(wajib), `kiriman memuat "${wajib}" — kalau tidak, tes ini tidak menguji apa pun`).toBe(true);
  }
  const mulai = kiriman
    .flatMap((b) => JSON.parse(b) as Array<{ nama: string; isi: Record<string, unknown> }>)
    .find((p) => p.nama === 'mulai');
  expect(mulai?.isi['peramban_dalam'], 'UA memang dibaca — kategorinya sampai').toBe('threads');
  expect(mulai?.isi['perujuk'], 'perujuk memang dibaca — kategorinya sampai').toBe('threads');

  // Dan berkas pengumpul, termasuk `tutup` yang lahir di pagehide — yang
  // badannya tidak terpotret `page.route` karena halamannya sudah pergi.
  await page.goto('about:blank');
  await tungguPeristiwa(sesi, 'tutup', 1);
  const berkas = JSON.stringify(peristiwaSesi(sesi));
  expect(berkas).not.toMatch(/Mozilla|AppleWebKit|:\/\/|rahasia/);

  // eslint-disable-next-line no-console
  console.log(
    `E-26 [${test.info().project.name}] kiriman=${String(kiriman.length)} bita=${String(semua.length)} ` +
      `nama=${[...nama].sort().join(',')} Mozilla=0 AppleWebKit=0 ://=0`,
  );
});
