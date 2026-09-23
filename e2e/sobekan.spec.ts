import { expect, test, type Page } from '@playwright/test';
import {
  LABEL_SESUDAHNYA,
  bilahTurunAda,
  buka,
  kunciJawaban,
  lanjut,
  mulaiKasus,
  penandaBaru,
  pilihOpsi,
  tungguSoal,
} from './bantu/main.ts';
import { bacaKasus } from './bantu/kasus.ts';

/**
 * E-05 — sobekan kalender, satu-satunya gerak yang diatur di seluruh aplikasi.
 *
 * Ia sudah pernah dibuktikan berjalan di ponsel sungguhan (M3.1 §10f), tetapi
 * tidak pernah di rangkaian uji: di panel peramban tanpa frame, animasi CSS
 * tidak pernah bergerak, jadi tes apa pun di sana akan hijau tanpa alasan.
 *
 * Yang diukur di sini:
 *   1. animasinya benar-benar **berjalan** (`getAnimations()` melihatnya);
 *   2. semuanya mencapai `finished` dalam ≤ 1,5 detik — bukan menggantung;
 *   3. keadaan akhirnya: ruang sobekan tertutup (tinggi 0) dan halaman yang
 *      jatuh tidak terlihat lagi (opacity 0);
 *   4. yang tersisa di layar adalah tanggal-tanggal **sesudah** T.
 *
 * Dengan `prefers-reduced-motion: reduce`: tidak ada animasi sama sekali, dan
 * keadaan akhirnya sama persis.
 */

/** Bulan pendek seperti yang ditulis `web/src/tanggal.ts`; dipakai mengurai keping. */
const BULAN_PENDEK = [
  'JAN', 'FEB', 'MAR', 'APR', 'MEI', 'JUN', 'JUL', 'AGU', 'SEP', 'OKT', 'NOV', 'DES',
];

/*
 * Sejak M3.10 D-3 tanggal garis waktu berhuruf kalimat ("9 Okt 2025", peran
 * meta), bukan lagi keping kapital ("9 OKT 2025"). Pengurainya menerima bulan
 * dengan huruf apa pun dan menyamakannya ke daftar di atas; yang tetap dituntut:
 * tiga huruf bulan yang memang ada, dan tanggal yang memang terurai.
 */
function uraiKeping(teks: string): string | null {
  const cocok = /^(\d{1,2}) ([A-Za-z]{3}) (\d{4})$/.exec(teks);
  if (cocok === null) return null;
  const bulan = BULAN_PENDEK.indexOf((cocok[2] ?? '').toUpperCase());
  if (bulan < 0) return null;
  return `${cocok[3] ?? ''}-${String(bulan + 1).padStart(2, '0')}-${(cocok[1] ?? '').padStart(2, '0')}`;
}

async function sampaiPembukaan(page: Page): Promise<void> {
  const kasus = bacaKasus();
  await buka(page, penandaBaru());
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
}

/**
 * Keadaan akhir sobekan, diukur dari gaya terhitung.
 *
 * Kelas CSS dipakai untuk **mengukur**, bukan untuk menemukan elemen yang akan
 * diketuk — itu yang diizinkan D-7, dan di sini memang tidak ada pilihan lain:
 * elemen sobekan `aria-hidden` dan tidak punya `data-uid` maupun peran.
 */
interface KeadaanSobekan {
  adaRuang: boolean;
  adaJatuh: boolean;
  tinggiRuang: number;
  opasitasJatuh: number;
}

async function keadaanSobekan(page: Page): Promise<KeadaanSobekan> {
  return await page.evaluate(() => {
    const ruang = document.querySelector('.kalender-sobek');
    const jatuh = document.querySelector('.kalender-jatuh');
    return {
      adaRuang: ruang !== null,
      adaJatuh: jatuh !== null,
      tinggiRuang: ruang === null ? -1 : ruang.getBoundingClientRect().height,
      opasitasJatuh: jatuh === null ? -1 : Number(getComputedStyle(jatuh).opacity),
    };
  });
}

/**
 * Keberadaan elemennya diperiksa terpisah dari nilainya.
 *
 * Sabotase menemukan lubangnya: ketika kelas `.kalender-jatuh` dihapus,
 * `querySelector` mengembalikan `null`, penanda `-1` lolos dari
 * `toBeLessThanOrEqual(0.01)`, dan E-05b tetap hijau atas halaman yang sudah
 * kehilangan sobekannya. Angka penanda tidak boleh dibandingkan seolah ia
 * pengukuran.
 */
function periksaKeadaanAkhir(akhir: KeadaanSobekan): void {
  expect(akhir.adaRuang, 'ruang sobekan harus ada di halaman').toBe(true);
  expect(akhir.adaJatuh, 'halaman kalender yang tersobek harus ada di halaman').toBe(true);
  expect(akhir.tinggiRuang, 'ruang sobekan tertutup di akhir').toBeLessThanOrEqual(1);
  expect(akhir.tinggiRuang, 'tingginya hasil pengukuran, bukan penanda').toBeGreaterThanOrEqual(0);
  expect(akhir.opasitasJatuh, 'halaman yang tersobek tidak terlihat lagi').toBeLessThanOrEqual(0.01);
  expect(akhir.opasitasJatuh, 'opasitasnya hasil pengukuran, bukan penanda').toBeGreaterThanOrEqual(
    0,
  );
}

/** Tanggal-tanggal yang tampil di garis waktu, dalam ISO. */
async function tanggalGarisWaktu(page: Page): Promise<string[]> {
  const teks = (await page.locator('[data-uid="garis-waktu"]').innerText()) || '';
  /*
   * Tanpa `\b` di belakang tahun: keping tanggal menempel langsung ke kalimat
   * sesudahnya ("…9 OKT 2025Sehari sesudah tanggal kasus…"), jadi di sana tidak
   * ada batas kata. Pola dengan `\b` diam-diam tidak menemukan apa pun.
   */
  const keping = teks.match(/\b\d{1,2} [A-Z][A-Za-z]{2} \d{4}/g) ?? [];
  return keping.map(uraiKeping).filter((t): t is string => t !== null);
}

test('E-05 sobekan kalender benar-benar berjalan dan selesai', async ({ page }) => {
  const kasus = bacaKasus();
  await sampaiPembukaan(page);

  const gerak = await page.evaluate(async () => {
    const mulai = performance.now();
    const semua = document.getAnimations();
    const nama = semua.map((a) => ('animationName' in a ? String(a.animationName) : 'tanpa-nama'));
    /*
     * Lama yang DIJANJIKAN tiap animasi oleh gayanya sendiri: `endTime` =
     * tunda + lama aktif + tunda akhir. Dibaca dari animasinya, bukan disalin
     * dari `gaya.css`, supaya angka di tes tidak bisa berselisih dengan angka
     * di produk (prinsip yang sama dengan `ambangOpsiProduk`).
     */
    const dijanjikan = semua.map((a) => {
      const waktu = a.effect?.getComputedTiming();
      return waktu === undefined ? Number.POSITIVE_INFINITY : Number(waktu.endTime ?? 0);
    });
    await Promise.all(
      semua.map(async (a) => {
        try {
          await a.finished;
        } catch {
          /* dibatalkan: dilaporkan lewat playState di bawah */
        }
      }),
    );
    return {
      jumlah: semua.length,
      nama,
      dijanjikan,
      ms: performance.now() - mulai,
      keadaan: semua.map((a) => a.playState),
    };
  });

  expect(gerak.jumlah, 'sobekan kalender harus punya animasi yang berjalan').toBeGreaterThan(0);
  expect(gerak.nama, 'animasinya adalah sobek dan tutup-ruang').toEqual(
    expect.arrayContaining(['sobek', 'tutup-ruang']),
  );
  /*
   * Yang diuji: animasinya **dijanjikan pendek**, dan ia **benar-benar selesai**
   * (`playState` di bawah; `Promise.all` di atas yang menunggunya, dengan batas
   * waktu tes sebagai jaring kalau ia menggantung selamanya).
   *
   * Yang TIDAK diuji lagi: berapa lama jam dinding berjalan sampai janji itu
   * ditepati. Versi lama mengukur `performance.now()` dan menuntutnya <= 1,5
   * detik. Animasinya sendiri hanya 950 ms (`sobek` 700+250, `tutup-ruang`
   * 400+450), jadi sisanya adalah kelonggaran 550 ms untuk penjadwal — dan
   * penjadwal bukan yang sedang diuji. Terukur di bawah tujuh pembakar CPU:
   * **23.100 ms**, dua puluh tiga detik, bukan 1,5. Animasinya tetap lengkap
   * dan tetap mencapai `finished`; yang tidak datang adalah frame-nya.
   *
   * Ini bukan pelonggaran: asersi lama tidak pernah bisa gagal karena animasi
   * yang kepanjangan tanpa juga gagal karena mesin yang sibuk, dan asersi yang
   * merah karena dua sebab berbeda tidak memberi tahu yang mana.
   */
  /*
   * Batasnya 1.750 ms sejak M3.6 D-4: pemilik meminta jeda sebelum sobekan
   * bertambah 0,25 detik ("kurang terasa"), jadi `sobek` kini 700 ms sesudah
   * tunda 500 ms dan `tutup-ruang` 400 ms sesudah tunda 700 ms. Yang terpanjang
   * dijanjikan 1.200 ms; 1.750 memberi ruang satu langkah lagi tanpa pernah
   * memaafkan animasi yang menggantung.
   */
  const terlama = Math.max(...gerak.dijanjikan);
  expect(terlama, `tiap animasi dijanjikan selesai dalam <= 1,75 detik (terlama ${String(terlama)} ms)`)
    .toBeLessThanOrEqual(1750);
  expect(gerak.keadaan.every((k) => k === 'finished'), `playState akhir: ${gerak.keadaan.join(', ')}`).toBe(
    true,
  );

  const akhir = await keadaanSobekan(page);
  periksaKeadaanAkhir(akhir);

  const tanggal = await tanggalGarisWaktu(page);
  expect(tanggal.length, 'garis waktu menampilkan tanggal').toBeGreaterThan(0);
  for (const t of tanggal) {
    expect(t > kasus.tanggal_t, `tanggal "${t}" di garis waktu harus sesudah T (${kasus.tanggal_t})`).toBe(
      true,
    );
  }

  // eslint-disable-next-line no-console
  console.log(
    `E-05 animasi=${String(gerak.jumlah)} [${gerak.nama.join(', ')}] ` +
      `dijanjikan=${terlama.toFixed(0)}ms sisa-jam-dinding=${gerak.ms.toFixed(0)}ms ` +
      `tinggi-ruang-akhir=${akhir.tinggiRuang.toFixed(1)}px opasitas-jatuh=${String(akhir.opasitasJatuh)} ` +
      `tanggal-garis-waktu=${tanggal.join(' ')}`,
  );
});

test.describe('dengan prefers-reduced-motion: reduce', () => {
  test.use({ reducedMotion: 'reduce' });

  test('E-05b tanpa gerak, keadaan akhirnya sama', async ({ page }) => {
    const kasus = bacaKasus();
    await sampaiPembukaan(page);

    const jumlah = await page.evaluate(() => document.getAnimations().length);
    expect(jumlah, 'tidak boleh ada animasi ketika gerak diminta dihentikan').toBe(0);

    const akhir = await keadaanSobekan(page);
    periksaKeadaanAkhir(akhir);

    const tanggal = await tanggalGarisWaktu(page);
    expect(tanggal.length).toBeGreaterThan(0);
    for (const t of tanggal) {
      expect(t > kasus.tanggal_t, `tanggal "${t}" harus sesudah T`).toBe(true);
    }

    // eslint-disable-next-line no-console
    console.log(
      `E-05b reduced-motion: animasi=${String(jumlah)} tinggi-ruang=${akhir.tinggiRuang.toFixed(1)}px ` +
        `opasitas-jatuh=${String(akhir.opasitasJatuh)} tanggal=${tanggal.join(' ')}`,
    );
  });
});
