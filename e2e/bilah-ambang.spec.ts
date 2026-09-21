import { expect, test, type Page } from '@playwright/test';
import {
  bilahTurun,
  buka,
  mulaiKasus,
  opsi,
  penandaBaru,
  tungguGulirBerhenti,
  tungguSoal,
} from './bantu/main.ts';
import { bacaKasus } from './bantu/kasus.ts';
import { ambangOpsiProduk } from './bantu/ambang.ts';

/**
 * D-C3 — bilah "↓ Jawab di bawah" dan ambang "opsi pertama terlihat".
 *
 * Reviewer melihat E-03a menunggu lima belas detik dan **tidak pernah**
 * mendapati "bilah ada ⇔ opsi pertama belum terlihat". Lima belas detik tak
 * sepakat bukan kedipan waktu: salah satu dari keduanya memang berbeda
 * pendapat, terus-menerus.
 *
 * Tes ini menempatkan opsi pertama di **zona abu-abu** dengan sengaja — terlihat
 * sebagian, di bawah ambang — lalu bertanya satu hal: apakah bilahnya kembali?
 *
 * Yang dijanjikan produk, tertulis di `usePengamatOpsi` sendiri:
 *   "opsi dianggap terlihat kalau lebih dari separuh badannya masuk layar,
 *    bukan kalau ujungnya baru menyembul."
 *
 * Kalau bilahnya TIDAK kembali, janji itu dilanggar: pemain yang menggulir
 * sedikit kehilangan satu-satunya petunjuk jalan yang ada di layar, padahal
 * opsinya baru menyembul.
 */

/** Rasio bagian opsi yang berada di dalam viewport, 0–1. */
async function rasioOpsi(page: Page, kunci: string): Promise<number> {
  return await opsi(page, kunci).evaluate((el) => {
    const k = el.getBoundingClientRect();
    if (k.height <= 0) return 0;
    const atas = Math.max(0, k.top);
    const bawah = Math.min(window.innerHeight, k.bottom);
    return bawah <= atas ? 0 : (bawah - atas) / k.height;
  });
}

/**
 * Gulir sampai opsi pertama terlihat kira-kira `sasaran` bagiannya, muncul dari
 * tepi bawah layar. Posisinya dihitung, bukan ditebak lewat pengguliran coba-coba.
 */
async function gulirKeRasio(page: Page, kunci: string, sasaran: number): Promise<void> {
  await opsi(page, kunci).evaluate((el, target: number) => {
    const k = el.getBoundingClientRect();
    const atasDokumen = k.top + window.scrollY;
    window.scrollTo(0, Math.max(0, atasDokumen - window.innerHeight + target * k.height));
  }, sasaran);
  await tungguGulirBerhenti(page);
}

test('D-C3 bilah kembali ketika opsi pertama baru menyembul (zona abu-abu)', async ({ page }) => {
  const kasus = bacaKasus();
  const soal = kasus.soal[0];
  expect(soal, 'kasus punya soal pertama').toBeDefined();
  if (soal === undefined) return;
  const kunci = soal.pilihan[0]?.kunci ?? 'a';

  const ambang = ambangOpsiProduk();
  expect(ambang, 'ambang dibaca dari kode produk, bukan disalin').toBeGreaterThan(0);

  await buka(page, penandaBaru());
  await mulaiKasus(page);
  await tungguSoal(page, 1);

  /* --- 1. keadaan awal: opsi jauh di bawah, bilah harus ada ----------- */
  await tungguGulirBerhenti(page);
  const rasioAwal = await rasioOpsi(page, kunci);
  expect(rasioAwal, 'di awal layar soal, opsi pertama belum terlihat').toBeLessThan(ambang);
  await expect(bilahTurun(page), 'bilah ada saat opsi belum terlihat').toHaveCount(1);

  /* --- 2. opsi dibuat terlihat penuh: bilah harus menyingkir ---------- */
  await gulirKeRasio(page, kunci, 1);
  const rasioPenuh = await rasioOpsi(page, kunci);
  expect(rasioPenuh, 'opsi pertama kini terlihat utuh').toBeGreaterThanOrEqual(ambang);
  await expect(
    bilahTurun(page),
    'bilah menyingkir begitu opsi pertama terlihat',
  ).toHaveCount(0);

  /* --- 3. ZONA ABU-ABU: opsi baru menyembul --------------------------- */
  await gulirKeRasio(page, kunci, 0.25);
  const rasioSembul = await rasioOpsi(page, kunci);

  // Prasyarat: kalau posisinya meleset dari zona abu-abu, tes ini tidak menguji
  // apa-apa dan harus mengatakannya, bukan lulus diam-diam.
  expect(
    rasioSembul,
    `opsi pertama harus berada di zona abu-abu (0 < rasio < ${String(ambang)}), terukur ${rasioSembul.toFixed(3)}`,
  ).toBeGreaterThan(0.02);
  expect(rasioSembul, `terukur ${rasioSembul.toFixed(3)}`).toBeLessThan(ambang);

  const adaBilah = await bilahTurun(page).count();
  const gulir = await page.evaluate(() => ({
    y: window.scrollY,
    tinggi: document.documentElement.scrollHeight,
    jendela: window.innerHeight,
  }));

  // eslint-disable-next-line no-console
  console.log(
    `D-C3 ambang-produk=${String(ambang)} rasio-awal=${rasioAwal.toFixed(3)} ` +
      `rasio-penuh=${rasioPenuh.toFixed(3)} rasio-sembul=${rasioSembul.toFixed(3)} ` +
      `bilah-saat-sembul=${String(adaBilah)} scrollY=${String(gulir.y)} ` +
      `tinggi=${String(gulir.tinggi)} jendela=${String(gulir.jendela)}`,
  );

  await expect(
    bilahTurun(page),
    `opsi pertama hanya terlihat ${(rasioSembul * 100).toFixed(1)} % — di bawah ambang ` +
      `${String(ambang * 100)} % yang dijanjikan usePengamatOpsi — jadi bilah ` +
      '"Jawab di bawah" harus kembali. Kalau ia tidak kembali, pemain yang menggulir ' +
      'sedikit kehilangan satu-satunya petunjuk jalan di layar.',
  ).toHaveCount(1);
});

/**
 * D-C3 — antrean pengamat yang menumpuk (akar sebab E-03a).
 *
 * `IntersectionObserver` tidak memanggil baliknya sekali per perubahan. Ia
 * menyerahkan **antrean**: semua pengamatan yang menumpuk sejak panggilan
 * terakhir, tertua lebih dulu. Ketika frame tertunda — mesin berbeban, tab
 * sibuk, laptop menahan panas — dua perlintasan ambang atau lebih bisa tiba
 * dalam satu panggilan.
 *
 * `usePengamatOpsi` membaca `masuk[0]`, yang **tertua**, lalu membuang sisanya.
 * Jadi ia mencatat putusan yang sudah kedaluwarsa dan membuang yang berlaku.
 * Sesudah itu tidak ada perlintasan baru, jadi tidak ada panggilan baru:
 * `opsiTerlihat` membeku pada nilai basi selama pemain bertahan di layar itu.
 *
 * Saudaranya di berkas yang sama, `usePengamatKartu`, menggelung seluruh
 * antrean (`for (const m of masukan)`). Dua pengamat di satu berkas membaca
 * antrean yang sama dengan dua cara berbeda; satu benar, satu tidak.
 *
 * Tes ini tidak menunggu beban dan tidak mengulang-ulang sampai beruntung: ia
 * menyerahkan antrean dua butir langsung ke panggilan balik produk yang
 * sungguhan, di peramban yang sungguhan. Butir terbaru berkata "belum
 * terlihat". Kalau produk menurut, bilahnya kembali.
 */
test('D-C3 pengamat opsi menuruti butir TERBARU ketika antrean menumpuk', async ({ page }) => {
  const kasus = bacaKasus();
  const soal = kasus.soal[0];
  expect(soal, 'kasus punya soal pertama').toBeDefined();
  if (soal === undefined) return;
  const kunci = soal.pilihan[0]?.kunci ?? 'a';

  /*
   * Panggilan balik pengamat produk ditangkap sebelum aplikasi dimuat, dengan
   * membungkus `IntersectionObserver`. Yang ditangkap hanya pengamat yang
   * mengamati sebuah OPSI — pengamat kartu di berkas yang sama tidak disentuh,
   * dan keduanya tetap berjalan sungguhan.
   */
  await page.addInitScript(() => {
    const Asli = window.IntersectionObserver;
    type Balik = (masuk: IntersectionObserverEntry[], pengamat: IntersectionObserver) => void;
    const bungkus = class extends Asli {
      private readonly balik: Balik;
      constructor(balik: Balik, pilihan?: IntersectionObserverInit) {
        super(balik, pilihan);
        this.balik = balik;
      }
      override observe(sasaran: Element): void {
        if (sasaran.matches('[data-uid^="opsi:"]')) {
          (window as unknown as Record<string, unknown>).__balikOpsi = (
            butir: IntersectionObserverEntry[],
          ): void => {
            this.balik(butir, this as unknown as IntersectionObserver);
          };
        }
        super.observe(sasaran);
      }
    };
    window.IntersectionObserver = bungkus as unknown as typeof IntersectionObserver;
  });

  await buka(page, penandaBaru());
  await mulaiKasus(page);
  await tungguSoal(page, 1);

  /* --- opsi dibuat terlihat penuh: bilah menyingkir ------------------- */
  await gulirKeRasio(page, kunci, 1);
  await expect(bilahTurun(page), 'bilah menyingkir saat opsi terlihat').toHaveCount(0);

  const tertangkap = await page.evaluate(
    () => typeof (window as unknown as Record<string, unknown>).__balikOpsi === 'function',
  );
  expect(tertangkap, 'panggilan balik pengamat opsi tertangkap').toBe(true);

  /* --- antrean dua butir: tertua "terlihat", TERBARU "tidak" ---------- */
  await page.evaluate((ambang: number) => {
    const sasaran = document.querySelector('[data-uid^="opsi:"]');
    if (sasaran === null) throw new Error('opsi tidak ada');
    const butir = (terlihat: boolean, rasio: number): IntersectionObserverEntry =>
      ({
        target: sasaran,
        isIntersecting: terlihat,
        intersectionRatio: rasio,
        boundingClientRect: sasaran.getBoundingClientRect(),
        intersectionRect: sasaran.getBoundingClientRect(),
        rootBounds: null,
        time: performance.now(),
      }) as unknown as IntersectionObserverEntry;
    const balik = (window as unknown as Record<string, unknown>).__balikOpsi as (
      m: IntersectionObserverEntry[],
    ) => void;
    // Tertua lebih dulu, persis urutan yang diserahkan peramban.
    balik([butir(true, 1), butir(false, ambang / 2)]);
  }, ambangOpsiProduk());

  await expect(
    bilahTurun(page),
    'butir TERBARU di antrean berkata opsi belum terlihat, jadi bilah "Jawab di bawah" ' +
      'harus kembali. Kalau ia tidak kembali, produk membaca butir tertua dan membuang ' +
      'yang berlaku — dan karena tidak ada perlintasan ambang baru sesudah itu, tidak ' +
      'ada panggilan balik baru yang akan membetulkannya. Bilahnya hilang sampai pemain ' +
      'berpindah layar.',
  ).toHaveCount(1);
});
