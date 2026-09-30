/**
 * Pembantu yang memainkan Runut di browser (M3.3 T-02).
 *
 * Tiga aturan yang dipegang berkas ini, dan ketiganya datang dari kegagalan yang
 * sudah pernah terjadi di proyek ini:
 *
 * - **Tidak ada penunggu berbasis waktu.** `waitForTimeout` dan `setTimeout`
 *   dilarang; yang dipakai adalah `expect()` yang menunggu sendiri dan
 *   `expect.poll`. Tes yang menunggu satu detik lalu memeriksa adalah tes yang
 *   tidak tahu apa yang ditunggunya, dan ia akan hijau di satu mesin lalu merah
 *   di mesin lain.
 * - **Selektor yang dilihat pemain lebih dulu** (D-7): `getByRole`, `getByText`,
 *   baru `data-uid`. Selektor kelas CSS tidak pernah dipakai untuk *menemukan*
 *   elemen — hanya untuk *mengukur* gayanya.
 * - **Ketukan sungguhan di proyek sentuh** (D-5): `locator.tap()`, bukan
 *   `click()`. Cacat kaki lembar yang tidak bisa menutup lolos justru karena
 *   yang diuji hanya "ketuk sekali", bukan jari sungguhan yang mengetuk dua kali.
 */
import { expect, test, type ElementHandle, type Locator, type Page } from '@playwright/test';
import { mkdirSync } from 'node:fs';
import { join } from 'node:path';
import { DIR_LAYAR } from './jalur.ts';
import { ambangOpsiProduk } from './ambang.ts';

/** Label bilah bawah, disalin dari `web/src/alur.ts` (LABEL_TURUN, LABEL_KUNCI). */
export const LABEL_TURUN = '↓ Pilih jawaban';
export const LABEL_KUNCI = 'Cek jawabanku';
export const LABEL_MULAI = 'Mulai simulasi';
export const LABEL_KEMBALI_KARTU = '↑ Kembali ke dokumen';
export const LABEL_LONCAT = 'Langsung ke ringkasan ↓';
export const LABEL_LANJUT_AKHIR = 'Lanjut: tiga pertanyaan singkat';
export const LABEL_SELESAI = 'Selesai';
export const LABEL_KASUS_LAIN = 'Coba simulasi lain';
export const LABEL_SESUDAHNYA = 'Lihat yang terjadi sesudahnya';

/**
 * Ambang pengamat opsi pertama di `usePengamatOpsi` (D-4).
 *
 * **Dibaca dari kode produk**, tidak disalin (D-C3). Sebelumnya angka `0.6`
 * ditulis ulang di sini; dua angka yang berjanji sama adalah dua angka yang
 * bisa berselisih diam-diam, dan tes yang memakai ambang berbeda dari produknya
 * akan menunggu kesepakatan yang tidak pernah datang.
 */
export const AMBANG_OPSI: number = ambangOpsiProduk();

/** Penanda sesi uji: `[a-z0-9]{8}`, sesuai `kodePenanda()` di `web/src/sesi.ts`. */
export function penandaBaru(): string {
  const huruf = 'abcdefghijklmnopqrstuvwxyz0123456789';
  let kode = '';
  for (let i = 0; i < 8; i += 1) {
    kode += huruf[Math.floor(Math.random() * huruf.length)] ?? 'x';
  }
  return kode;
}

/**
 * Kasus yang dibuka tes kalau ia tidak menyebut kasus lain (M4 D-4).
 *
 * Sejak ada lebih dari satu kasus, `/` memilih **acak** — dan seluruh rangkaian
 * ini menyandingkan apa yang tampil di layar dengan isi
 * `cases/dada-2025-10-08.json` (`bacaKasus()`). Tanpa `?kasus=`, setiap tes
 * jawaban, kartu, dan identitas akan hijau atau merah menurut lemparan koin.
 *
 * Tes yang memang menguji pemilihan kasus menyebut kasusnya sendiri, atau
 * memakai `bukaTanpaKasus()` supaya keacakannya justru terlihat.
 */
export const KASUS_BAWAAN = 'dada-2025-10-08';

export async function buka(
  page: Page,
  penanda: string,
  kasus: string = KASUS_BAWAAN,
): Promise<void> {
  await page.goto(`/?k=${penanda}&kasus=${kasus}&pemandu=0`);
}

/** Buka tanpa `?kasus=`: kasusnya dipilih aplikasi, seperti pemain sungguhan. */
export async function bukaTanpaKasus(page: Page, penanda: string): Promise<void> {
  await page.goto(`/?k=${penanda}&pemandu=0`);
}

/**
 * Setel daftar kasus yang "sudah dimainkan" sebelum halaman pertama dimuat
 * (M4 D-4).
 *
 * Dipakai tes yang ingin keadaan akhir permainan **pasti**: sesudah semua
 * kasus dimainkan, "Coba simulasi lain" menampilkan pesan penutup alih-alih
 * membuka kasus berikutnya. Tanpa ini, E-10 akan berubah perilakunya tiap kali
 * satu kasus ditambahkan ke repo — dan yang diujinya bukan itu.
 *
 * `addInitScript` berjalan sebelum skrip halaman di **tiap** navigasi, jadi ia
 * juga menahan kalau tes memuat ulang.
 */
export async function tandaiDimainkan(page: Page, kasus: readonly string[]): Promise<void> {
  await page.addInitScript((daftar: readonly string[]) => {
    try {
      window.localStorage.setItem('kasus_dimainkan', JSON.stringify(daftar));
    } catch {
      /* Penyimpanan yang diblokir bukan urusan tes ini. */
    }
  }, kasus);
}

/** Proyek ini memakai layar sentuh? Menentukan `tap()` atau `click()`. */
export function bersentuh(): boolean {
  return test.info().project.use.hasTouch === true;
}

export async function ketuk(sasaran: Locator): Promise<void> {
  if (bersentuh()) await sasaran.tap();
  else await sasaran.click();
}

/* ------------------------------------------------------------------ */
/* Galat yang tidak boleh ada                                          */
/* ------------------------------------------------------------------ */

/**
 * Chromium mencatat setiap permintaan yang gagal sebagai `console.error`
 * berbunyi "Failed to load resource: …", **tanpa menyebut alamatnya**. Pesan
 * seperti itu tidak bisa dinilai dari teksnya; yang bisa dinilai adalah
 * permintaannya sendiri.
 *
 * Jadi keduanya dipisah, bukan disaring dengan pola yang luas: galat kode
 * (`console.error` sungguhan dan `pageerror`) di satu daftar, permintaan yang
 * gagal beserta alamat dan statusnya di daftar lain. Tes menyebut sendiri
 * permintaan mana yang ia maafkan — di rangkaian ini hanya `/favicon.ico`,
 * yang tidak pernah disediakan `web/index.html` dan tidak pernah diminta kode
 * aplikasi.
 */
const AWALAN_GAGAL_MUAT = 'Failed to load resource';

export interface PermintaanGagal {
  url: string;
  status: number;
}

export interface PengawasGalat {
  /** `console.error` dari kode aplikasi, dan `pageerror`. */
  kode(): string[];
  /** Permintaan jaringan yang dijawab 4xx/5xx atau gagal sama sekali. */
  permintaanGagal(): PermintaanGagal[];
}

export function awasiGalat(page: Page): PengawasGalat {
  const galatKode: string[] = [];
  const gagal: PermintaanGagal[] = [];
  page.on('console', (pesan) => {
    if (pesan.type() !== 'error') return;
    const teks = pesan.text();
    if (teks.startsWith(AWALAN_GAGAL_MUAT)) return;
    galatKode.push(`console.error: ${teks}`);
  });
  page.on('pageerror', (galat) => {
    galatKode.push(`pageerror: ${galat.message}`);
  });
  page.on('response', (jawaban) => {
    if (jawaban.status() >= 400) gagal.push({ url: jawaban.url(), status: jawaban.status() });
  });
  page.on('requestfailed', (permintaan) => {
    gagal.push({ url: permintaan.url(), status: 0 });
  });
  return { kode: () => [...galatKode], permintaanGagal: () => [...gagal] };
}

/** Permintaan gagal yang bukan urusan aplikasi: hanya ikon tab yang memang tidak ada. */
export function gagalYangBerarti(daftar: PermintaanGagal[]): PermintaanGagal[] {
  return daftar.filter((p) => !p.url.endsWith('/favicon.ico'));
}

/* ------------------------------------------------------------------ */
/* Tangkapan layar (D-8)                                               */
/* ------------------------------------------------------------------ */

/**
 * Simpan PNG bernomor ke `.cache/e2e/layar/<proyek>/NN-nama.png`.
 *
 * Bahan review untuk manusia, bukan pembanding: tidak ada `toHaveScreenshot`
 * di seluruh rangkaian ini. Pemilik dan reviewer harus bisa melihat apa yang
 * dilihat browser tanpa menjalankan apa pun.
 *
 * **Gulirnya ditunggu berhenti lebih dulu, di sini — bukan di pemanggilnya.**
 * `03-sesudah-jawab-di-bawah.png` sempat menampilkan ±90 px ruang kosong di
 * atas keping kalender karena diambil saat gulir halus masih berjalan; reviewer
 * mengukur sesudahnya dan mendapat `keping.top = 0`. Jadi produknya benar dan
 * gambarnya yang berbohong. Gambar bahan review yang menyesatkan lebih buruk
 * daripada tidak ada gambar: ia membuat orang mengejar cacat yang tidak ada.
 *
 * Penantiannya ditaruh di dalam fungsi ini supaya ia tidak bisa terlupa di
 * salah satu dari dua belas tempat pemanggilan.
 */
export async function simpanLayar(
  page: Page,
  /** Angka (dijadikan dua digit) atau penomoran sisipan seperti `'05b'`. */
  nomor: number | string,
  nama: string,
  penuh = false,
  /**
   * Anak folder di bawah nama proyek, untuk kasus selain kasus bawaan (M4).
   * Kosong berarti langsung di `<proyek>/`, supaya nama berkas tangkapan layar
   * DADA tidak bergeser dari yang sudah dikenal reviewer sejak M3.3.
   */
  subfolder = '',
): Promise<string> {
  await tungguGulirBerhenti(page);
  const dir = join(DIR_LAYAR, test.info().project.name, subfolder);
  mkdirSync(dir, { recursive: true });
  const urut = typeof nomor === 'number' ? String(nomor).padStart(2, '0') : nomor;
  const jalur = join(dir, `${urut}-${nama}.png`);
  await page.screenshot({ path: jalur, fullPage: penuh });
  return jalur;
}

/* ------------------------------------------------------------------ */
/* Ukuran di layar                                                     */
/* ------------------------------------------------------------------ */

/**
 * Berapa bagian sebuah elemen yang benar-benar berada di dalam viewport, 0–1.
 *
 * `locator.isVisible()` menjawab "ada di DOM dan punya kotak", bukan "terlihat
 * pemain": elemen 2000 px di bawah lipatan tetap dianggap visible. Pengamat
 * opsi di produk memakai `IntersectionObserver` dengan ambang 0,6, jadi tes yang
 * ingin bicara tentang hal yang sama harus mengukur hal yang sama.
 */
export async function rasioDiViewport(sasaran: Locator): Promise<number> {
  return await sasaran.evaluate((el) => {
    const k = el.getBoundingClientRect();
    if (k.width <= 0 || k.height <= 0) return 0;
    const atas = Math.max(0, k.top);
    const bawah = Math.min(window.innerHeight, k.bottom);
    const kiri = Math.max(0, k.left);
    const kanan = Math.min(window.innerWidth, k.right);
    if (bawah <= atas || kanan <= kiri) return 0;
    return ((bawah - atas) * (kanan - kiri)) / (k.width * k.height);
  });
}

/**
 * Tunggu sampai sebuah elemen masuk layar sedikitnya `ambang` bagian.
 *
 * Kenapa elemennya dipegang **sekali** lebih dulu (`elementHandle()`) dan bukan
 * dicari ulang tiap putaran: **pencarian selektor yang berulang membatalkan
 * gulir halus Chromium yang sedang berjalan**. Itu terukur di mesin ini, bukan
 * dugaan — `expect.poll` yang memanggil `locator.evaluate` sesudah mengetuk
 * "Langsung ke ringkasan ↓" membuat `scrollY` tidak pernah bergerak sama sekali
 * selama 15 detik, sementara `page.evaluate` dan `elementHandle.evaluate` atas
 * elemen yang sama menunjukkan gulirnya berjalan mulus sampai selesai
 * (1550 px → 350 px dalam delapan frame). Dua kali diulang, dua kali sama.
 *
 * Alat ukur yang mengubah yang diukurnya adalah alat ukur yang salah, dan di
 * milestone ini akibatnya akan berupa "cacat produk" yang sebenarnya tidak ada.
 */
export async function tungguMasukLayar(
  sasaran: Locator,
  ambang: number,
  pesan: string,
): Promise<number> {
  const pegangan = await sasaran.elementHandle();
  expect(pegangan, `elemen untuk "${pesan}" harus ada di DOM`).not.toBeNull();
  if (pegangan === null) return 0;
  const ukur = async (): Promise<number> =>
    await pegangan.evaluate((el) => {
      const k = el.getBoundingClientRect();
      if (k.width <= 0 || k.height <= 0) return 0;
      const atas = Math.max(0, k.top);
      const bawah = Math.min(window.innerHeight, k.bottom);
      const kiri = Math.max(0, k.left);
      const kanan = Math.min(window.innerWidth, k.right);
      if (bawah <= atas || kanan <= kiri) return 0;
      return ((bawah - atas) * (kanan - kiri)) / (k.width * k.height);
    });
  await expect.poll(ukur, { timeout: 15_000, message: pesan }).toBeGreaterThanOrEqual(ambang);
  const akhir = await ukur();
  await pegangan.dispose();
  return akhir;
}

/**
 * Tunggu sampai gulir benar-benar berhenti — ditunggu dalam satuan **frame**,
 * bukan detik.
 *
 * Sesudah jari diangkat halaman masih meluncur sendiri, dan gulir halus
 * `scrollIntoView` juga butuh beberapa frame. Mengukur posisi di tengah
 * gerakan itu berarti membandingkan dua angka yang diambil pada saat berbeda.
 */
export async function tungguGulirBerhenti(page: Page): Promise<void> {
  await page.evaluate(
    async () =>
      await new Promise<void>((beres) => {
        let terakhir = Number.NaN;
        let diam = 0;
        const langkah = (): void => {
          if (window.scrollY === terakhir) diam += 1;
          else {
            diam = 0;
            terakhir = window.scrollY;
          }
          if (diam >= 10) {
            beres();
            return;
          }
          requestAnimationFrame(langkah);
        };
        requestAnimationFrame(langkah);
      }),
  );
}

/* ------------------------------------------------------------------ */
/* Langkah permainan                                                   */
/* ------------------------------------------------------------------ */

export function judulSoal(page: Page, nomor: number): Locator {
  // Bukan selektor kelas: `aria-label` ini adalah nama yang dibaca pembaca layar
  // untuk tiga titik kemajuan, jadi ia memang milik pemain.
  return page.locator(`[aria-label="Soal ${String(nomor)} dari 3"]`);
}

export function opsi(page: Page, kunci: string): Locator {
  return page.locator(`[data-uid="opsi:${kunci}"]`);
}

export function bilahTurun(page: Page): Locator {
  return page.getByRole('button', { name: LABEL_TURUN });
}

export async function mulaiKasus(page: Page): Promise<void> {
  await ketuk(page.getByRole('button', { name: LABEL_MULAI }));
}

export async function tungguSoal(page: Page, nomor: number): Promise<void> {
  await expect(judulSoal(page, nomor)).toBeVisible();
}

/**
 * Tunggu sampai bilah "↓ Jawab di bawah" dan keterlihatan opsi pertama
 * **sepakat**, lalu laporkan apakah bilahnya ada (D-4).
 *
 * Keduanya tidak boleh benar bersamaan dan tidak boleh salah bersamaan: bilah
 * itu ada persis ketika opsi pertama belum terlihat. Menunggu kesepakatan itu —
 * bukan menunggu waktu — adalah yang membuat langkah ini tidak balapan dengan
 * `IntersectionObserver`.
 */
/**
 * Apakah elemen ini "terlihat" **menurut alat yang sama dengan produk**: sebuah
 * `IntersectionObserver` dengan ambang yang sama, dipasang sekejap lalu dilepas.
 *
 * Kenapa bukan `rasioDiViewport()` (D-C3): ambangnya memang sudah sama sejak
 * awal — keduanya 0,6 — tetapi **cara menghitungnya tidak**. Chromium menghitung
 * perpotongan dalam LayoutUnit (kelipatan 1/64 px) dengan pembulatannya sendiri;
 * `getBoundingClientRect()` memberi float CSS px, dan tes lalu mengalikan dan
 * membagi lagi. Dua hitungan itu sama sampai bit terakhir, dan bit terakhir
 * persis yang menentukan ketika sebuah opsi kebetulan parkir di dekat 0,6:
 * produk berkata "belum terlihat", tes berkata "sudah", dan keduanya tidak akan
 * pernah berubah pikiran. Lima belas detik tak sepakat yang dilihat reviewer
 * adalah bentuk yang tepat dari kegagalan itu — bukan kedipan waktu, melainkan
 * dua alat ukur yang tidak pernah bisa setuju.
 *
 * Pengamat baru dipasang tiap kali, jadi ia selalu melaporkan keadaan SEKARANG.
 * Itu yang membuat sabotase "pengamat opsi tidak men-dispatch" tetap merah:
 * keadaan produk yang basi akan berselisih dengan pengamat yang segar.
 */
async function terlihatMenurutPengamat(
  pegangan: ElementHandle<HTMLElement | SVGElement>,
  ambang: number,
): Promise<{ terlihat: boolean; rasio: number }> {
  return await pegangan.evaluate(
    async (el, ambangDalam: number) =>
      await new Promise<{ terlihat: boolean; rasio: number }>((beres) => {
        const pengamat = new IntersectionObserver(
          (masuk) => {
            const butir = masuk[0];
            pengamat.disconnect();
            beres(
              butir === undefined
                ? { terlihat: false, rasio: 0 }
                : { terlihat: butir.isIntersecting, rasio: butir.intersectionRatio },
            );
          },
          { threshold: ambangDalam },
        );
        pengamat.observe(el);
      }),
    ambang,
  );
}

/** Keadaan bilah bawah yang sedang tampil: `turun`, `kunci`, `lanjut`, atau tidak ada. */
async function uidBilahSekarang(page: Page): Promise<string> {
  const bilah = page.locator('[data-uid^="bilah:"]');
  if ((await bilah.count()) === 0) return 'tidak-ada';
  return (await bilah.first().getAttribute('data-uid')) ?? 'tanpa-uid';
}

export async function bilahTurunAda(page: Page, kunciPertama: string): Promise<boolean> {
  const turun = bilahTurun(page);
  /*
   * Elemennya dipegang SEKALI: pencarian selektor yang berulang membatalkan
   * gulir halus Chromium yang sedang berjalan (terukur di T-02).
   */
  const pegangan = await opsi(page, kunciPertama).elementHandle();
  if (pegangan === null) {
    throw new Error(`opsi pertama "${kunciPertama}" tidak ada di halaman`);
  }

  // Pengamatan terakhir sebelum menyerah. Kegagalan reviewer tidak bisa
  // didiagnosis justru karena pesannya tidak memuat satu pun angka.
  let terakhir = 'belum sempat terukur';
  try {
    await expect
      .poll(
        async () => {
          const adaBilah = (await turun.count()) > 0;
          const { terlihat, rasio } = await terlihatMenurutPengamat(pegangan, AMBANG_OPSI);
          terakhir =
            `opsi-terlihat=${String(terlihat)} rasio=${rasio.toFixed(4)} ` +
            `ambang=${String(AMBANG_OPSI)} bilah-turun-ada=${String(adaBilah)} ` +
            `bilah-yang-tampil=${await uidBilahSekarang(page)}`;
          return adaBilah !== terlihat;
        },
        {
          timeout: 15_000,
          message:
            'bilah "Jawab di bawah" harus ada persis ketika opsi pertama belum terlihat (D-4)',
        },
      )
      .toBe(true);
  } catch (galat) {
    throw new Error(
      'bilah "Jawab di bawah" harus ada persis ketika opsi pertama belum terlihat (D-4).\n' +
        `Pengamatan terakhir sebelum menyerah: ${terakhir}\n` +
        'Kalau bilah-yang-tampil bukan "bilah:turun", ada yang sudah memilih atau ' +
        'mengunci jawaban sebelum langkah ini — dan bilah turun memang tidak akan ' +
        'pernah muncul lagi.\n' +
        String(galat),
    );
  } finally {
    await pegangan.dispose();
  }
  return (await turun.count()) > 0;
}

export async function pilihOpsi(page: Page, kunci: string): Promise<void> {
  await ketuk(opsi(page, kunci));
}

export async function kunciJawaban(page: Page): Promise<void> {
  await ketuk(page.getByRole('button', { name: LABEL_KUNCI }));
}

export async function lanjut(page: Page, label: string): Promise<void> {
  await ketuk(page.getByRole('button', { name: label }));
}
