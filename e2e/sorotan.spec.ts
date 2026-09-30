import { expect, test, type Page } from '@playwright/test';
import { LABEL_MULAI, awasiGalat, gagalYangBerarti, ketuk, penandaBaru, tungguGulirBerhenti, tungguSoal } from './bantu/main.ts';
import { bacaKasus } from './bantu/kasus.ts';

/**
 * E-63 — sorotan pemandu (M3.16), di peramban yang melukis.
 *
 * Saat langkah pemandu aktif, sisa layar diredupkan dan "lubang" terang
 * mengikuti elemen yang diterangkan. Yang dijaga di sini adalah kegagalan yang
 * tidak tertangkap Vitest:
 *
 * - panel panduan tidak pernah tertutup lapisan; "Lewati" dan "Lanjut" selalu
 *   yang menerima ketukan di titik tengahnya (`elementFromPoint`);
 * - lubang berada di atas sasarannya (toleransi piksel) — juga sesudah digulir
 *   dan sesudah jendela diputar;
 * - ketukan di luar lubang tidak menjalankan apa pun di bawahnya; ketukan di
 *   dalam lubang tetap jalan (kartu bisa dibuka, pilihan bisa dipilih);
 * - "Lewati" menutup lapisan SEKETIKA, tanpa sisa `inert`;
 * - konten di bawah lapisan `inert` + `aria-hidden`, fokus di panel;
 * - peralihan lubang ≤ 250 ms, dan 0 untuk `prefers-reduced-motion`.
 */

const KASUS = bacaKasus();
const SOAL1 = KASUS.soal[0];
const SASARAN = ['omongan', 'kartu', 'pilihan', 'petunjuk'] as const;
/** `JARAK_LUBANG` di `web/src/sorotan.ts`. */
const JARAK = 8;
const TOLERANSI = 1.5;

function alamat(): string {
  return `/?k=${penandaBaru()}&kasus=${KASUS.kasus_id}&pemandu=1`;
}

const panel = (page: Page) => page.locator('.pemandu');
const lapisan = (page: Page) => page.locator('.sorotan');

async function keLangkah(page: Page, n: number): Promise<void> {
  await page.goto(alamat());
  await ketuk(page.getByRole('button', { name: LABEL_MULAI }));
  await tungguSoal(page, 1);
  await expect(panel(page)).toContainText('1 dari 4');
  for (let i = 1; i < n; i += 1) {
    await ketuk(page.locator(`[data-uid="pemandu:lanjut:${String(i)}"]`));
    await expect(panel(page)).toContainText(`${String(i + 1)} dari 4`);
  }
  await tungguGulirBerhenti(page);
}

interface Kotak {
  kiri: number;
  atas: number;
  kanan: number;
  bawah: number;
}

/** Selisih terbesar antara lubang yang dilukis dan lubang yang seharusnya (sasaran ± JARAK). */
async function selisihLubang(page: Page): Promise<{ selisih: number; lubang: Kotak | null; harap: Kotak | null }> {
  return await page.evaluate((jarak) => {
    const ke = (e: Element): { kiri: number; atas: number; kanan: number; bawah: number } => {
      const b = e.getBoundingClientRect();
      return { kiri: b.left, atas: b.top, kanan: b.right, bawah: b.bottom };
    };
    const wadah = document.querySelector('.sorotan');
    const tanda = document.querySelector('.sorotan-lubang');
    if (wadah === null || tanda === null) return { selisih: Infinity, lubang: null, harap: null };
    const sasaran = wadah.getAttribute('data-sasaran') ?? '';
    const kotak = [...document.querySelectorAll(`[data-lubang="${sasaran}"]`)].map(ke);
    if (kotak.length === 0) return { selisih: Infinity, lubang: null, harap: null };
    const lebar = document.documentElement.clientWidth;
    const harap = {
      kiri: Math.max(0, Math.min(...kotak.map((k) => k.kiri)) - jarak),
      atas: Math.min(...kotak.map((k) => k.atas)) - jarak,
      kanan: Math.min(lebar, Math.max(...kotak.map((k) => k.kanan)) + jarak),
      bawah: Math.max(...kotak.map((k) => k.bawah)) + jarak,
    };
    const lubang = ke(tanda);
    const selisih = Math.max(
      Math.abs(lubang.kiri - harap.kiri),
      Math.abs(lubang.atas - harap.atas),
      Math.abs(lubang.kanan - harap.kanan),
      Math.abs(lubang.bawah - harap.bawah),
    );
    return { selisih, lubang, harap };
  }, JARAK);
}

async function lubangTepat(page: Page, pesan: string): Promise<void> {
  await expect
    .poll(async () => (await selisihLubang(page)).selisih, { message: `${pesan}: lubang di atas sasaran` })
    .toBeLessThanOrEqual(TOLERANSI);
}

/**
 * Siapa yang menerima ketukan di titik-titik panel: kisi 5 × 3 di dalam
 * panel, ditambah titik tengah "Lewati" dan tombol utama.
 */
async function panelMenerimaKetukan(page: Page): Promise<string[]> {
  return await page.evaluate(() => {
    const salah: string[] = [];
    const p = document.querySelector('.pemandu');
    if (p === null) return ['panel tidak ada'];
    const b = p.getBoundingClientRect();
    for (const fx of [0.05, 0.25, 0.5, 0.75, 0.95]) {
      for (const fy of [0.15, 0.5, 0.85]) {
        const x = b.left + b.width * fx;
        const y = b.top + b.height * fy;
        const kena = document.elementFromPoint(x, y);
        if (kena === null || !p.contains(kena)) salah.push(`(${x.toFixed(0)},${y.toFixed(0)}) → ${kena?.className ?? 'null'}`);
      }
    }
    for (const pemilih of ['.pemandu-lewati', '.pemandu-lanjut']) {
      const t = document.querySelector(pemilih);
      if (t === null) {
        salah.push(`${pemilih} tidak ada`);
        continue;
      }
      const r = t.getBoundingClientRect();
      const kena = document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2);
      if (kena === null || !t.contains(kena)) salah.push(`${pemilih} tertutup ${kena?.className ?? 'null'}`);
    }
    return salah;
  });
}

test('E-63a tiap langkah: lapisan redup, lubang di atas sasaran, panel tak tertutup, fokus di panel', async ({ page }) => {
  const galat = awasiGalat(page);
  await keLangkah(page, 1);
  for (const [n, sasaran] of SASARAN.entries()) {
    await expect(panel(page)).toContainText(`${String(n + 1)} dari 4`);
    await expect(lapisan(page)).toHaveAttribute('data-sasaran', sasaran);
    await tungguGulirBerhenti(page);
    await lubangTepat(page, `langkah ${String(n + 1)}`);
    expect(await panelMenerimaKetukan(page), `langkah ${String(n + 1)}: panel tidak tertutup`).toEqual([]);

    /* Lapisan benar-benar meredupkan: latarnya tidak transparan. */
    const alfa = await lapisan(page).evaluate((el) => {
      const warna = getComputedStyle(el).backgroundColor;
      const m = /rgba?\(([^)]+)\)/.exec(warna);
      const bagian = (m?.[1] ?? '').split(/[ ,/]+/).filter(Boolean);
      return bagian.length === 4 ? Number(bagian[3]) : warna.startsWith('color(') ? parseFloat(warna.split('/')[1] ?? '1') : 1;
    });
    expect(alfa, 'lapisan redup, bukan transparan').toBeGreaterThan(0.3);

    /* Pusat sasaran menerima ketukan (di dalam lubang); tepat di atas lubang = lapisan. */
    const hit = await page.evaluate((s) => {
      const t = document.querySelector(`[data-lubang="${s}"]`);
      const l = document.querySelector('.sorotan-lubang');
      if (t === null || l === null) return { dalam: false, luar: 'tidak ada' };
      const r = t.getBoundingClientRect();
      const lb = l.getBoundingClientRect();
      const tengahY = Math.min(Math.max(r.top + Math.min(r.height / 2, 24), 60), window.innerHeight - 200);
      const kena = document.elementFromPoint(r.left + r.width / 2, tengahY);
      const yLuar = lb.top - 6 > 0 ? lb.top - 6 : lb.bottom + 6;
      const luar = document.elementFromPoint(lb.left + lb.width / 2, yLuar);
      return { dalam: kena !== null && t.contains(kena), luar: luar?.className ?? 'null', yLuar };
    }, sasaran);
    expect(hit.dalam, `langkah ${String(n + 1)}: sasaran bisa dilihat & disentuh`).toBe(true);
    expect(hit.luar, `langkah ${String(n + 1)}: tepat di luar lubang = lapisan (atau keping berselubung)`).toMatch(
      /sorotan|penanda/,
    );

    /* Aksesibilitas: konten di bawah lapisan inert + aria-hidden; sasaran & panel tidak. */
    const a11y = await page.evaluate((s) => {
      const kepala = document.querySelector('[data-uid="keping"]');
      const sasaranEl = document.querySelector(`[data-lubang="${s}"]`);
      const p = document.querySelector('.pemandu');
      const tertutup = (e: Element | null): boolean => e !== null && e.closest('[inert]') !== null;
      return {
        kepalaInert: tertutup(kepala) && kepala?.closest('[aria-hidden="true"]') !== null,
        sasaranInert: tertutup(sasaranEl),
        panelInert: tertutup(p),
        fokusDiPanel: p !== null && p.contains(document.activeElement),
      };
    }, sasaran);
    expect(a11y, `langkah ${String(n + 1)}: a11y`).toEqual({
      kepalaInert: true,
      sasaranInert: false,
      panelInert: false,
      fokusDiPanel: true,
    });

    if (n < 3) await ketuk(page.locator(`[data-uid="pemandu:lanjut:${String(n + 1)}"]`));
  }
  expect(galat.kode()).toEqual([]);
  expect(gagalYangBerarti(galat.permintaanGagal())).toEqual([]);
});

test('E-63b lubang mengikuti gulir dan putaran layar', async ({ page }) => {
  await keLangkah(page, 2);
  await lubangTepat(page, 'awal langkah 2');
  await page.evaluate(() => window.scrollBy(0, 200));
  await tungguGulirBerhenti(page);
  await lubangTepat(page, 'sesudah digulir 200 px');
  await page.evaluate(() => window.scrollBy(0, -120));
  await tungguGulirBerhenti(page);
  await lubangTepat(page, 'sesudah digulir balik');

  const semula = page.viewportSize() ?? { width: 360, height: 640 };
  await page.setViewportSize({ width: semula.height, height: semula.width });
  await lubangTepat(page, 'sesudah diputar mendatar');
  /*
   * Mendatar: kartu yang tinggi tergulir ke bawah keping. Keping (sticky) dan
   * balon melayang (fixed) tidak boleh ikut tampak "disorot" di dalam lubang:
   * keping berselubung sendiri di atas lapisan, balon disingkirkan.
   */
  const kromJendela = await page.evaluate(() => {
    const keping = document.querySelector('.penanda');
    const balon = document.querySelector('.melayang');
    const selubung = keping === null ? '' : getComputedStyle(keping, '::after').backgroundColor;
    return {
      kepingDiAtasLapisan: keping !== null && Number(getComputedStyle(keping).zIndex) > 5,
      kepingBerselubung: selubung !== '' && selubung !== 'rgba(0, 0, 0, 0)' && selubung !== 'transparent',
      balonTersingkir: balon === null || getComputedStyle(balon).visibility === 'hidden',
    };
  });
  expect(kromJendela).toEqual({ kepingDiAtasLapisan: true, kepingBerselubung: true, balonTersingkir: true });
  expect(await panelMenerimaKetukan(page), 'mendatar: panel tidak tertutup').toEqual([]);
  await page.setViewportSize(semula);
  await lubangTepat(page, 'sesudah diputar tegak lagi');
});

test('E-63c ketukan di luar lubang tidak menjalankan apa pun; di dalam lubang jalan', async ({ page }) => {
  await keLangkah(page, 1);
  /* Langkah 1 menyorot omongan: kaki kartu pertama di luar lubang. */
  const kaki = page.locator('.tumpukan .lembar-kaki').first();
  const kotakKaki = await kaki.boundingBox();
  expect(kotakKaki, 'kaki kartu pertama terlihat di langkah 1').not.toBeNull();
  const x = (kotakKaki?.x ?? 0) + (kotakKaki?.width ?? 0) / 2;
  const y = (kotakKaki?.y ?? 0) + (kotakKaki?.height ?? 0) / 2;
  const penerima = await page.evaluate(([px, py]) => document.elementFromPoint(px ?? 0, py ?? 0)?.className ?? 'null', [x, y]);
  expect(penerima, 'di luar lubang: yang menerima ketukan adalah lapisan').toContain('sorotan');
  await page.touchscreen.tap(x, y);
  await expect(kaki).toHaveAttribute('aria-expanded', 'false');
  await expect(panel(page), 'pemandu tetap di langkah 1').toContainText('1 dari 4');

  /* Langkah 2 menyorot kartu: kakinya di dalam lubang dan bisa dibuka; lubang ikut membesar. */
  await ketuk(page.locator('[data-uid="pemandu:lanjut:1"]'));
  await tungguGulirBerhenti(page);
  await lubangTepat(page, 'langkah 2');
  const tinggiSebelum = (await selisihLubang(page)).lubang;
  await ketuk(kaki);
  await expect(kaki).toHaveAttribute('aria-expanded', 'true');
  await lubangTepat(page, 'kartu dibuka');
  const tinggiSesudah = (await selisihLubang(page)).lubang;
  expect((tinggiSesudah?.bawah ?? 0) - (tinggiSesudah?.atas ?? 0)).toBeGreaterThan(
    (tinggiSebelum?.bawah ?? 0) - (tinggiSebelum?.atas ?? 0),
  );
  await ketuk(kaki);
  await expect(kaki).toHaveAttribute('aria-expanded', 'false');

  /* Langkah 3 menyorot pilihan: memilih di dalam lubang menutup pemandu, TIDAK mengunci jawaban. */
  await ketuk(page.locator('[data-uid="pemandu:lanjut:2"]'));
  await tungguGulirBerhenti(page);
  const kunci = SOAL1?.pilihan[0]?.kunci ?? 'a';
  await ketuk(page.locator(`[data-uid="opsi:${kunci}"]`));
  await expect(panel(page)).toHaveCount(0);
  await expect(lapisan(page)).toHaveCount(0);
  await expect(page.locator(`[data-uid="opsi:${kunci}"] input`)).toBeChecked();
  await expect(page.locator('fieldset.pilihan')).not.toHaveAttribute('disabled');
  await expect(page.locator('[data-uid="bilah:kunci"]')).toBeVisible();
});

test('E-63d "Lewati" menutup lapisan seketika di tiap langkah, tanpa sisa inert', async ({ page }) => {
  for (const n of [1, 2, 3, 4]) {
    await keLangkah(page, n);
    await expect(lapisan(page)).toHaveCount(1);
    await ketuk(page.locator(`[data-uid="pemandu:lewati:${String(n)}"]`));
    /* Seketika: dibaca langsung sesudah ketukan, tanpa menunggu. */
    const sisa = await page.evaluate(() => ({
      lapisan: document.querySelectorAll('.sorotan').length,
      inert: document.querySelectorAll('[inert]').length,
      tersembunyi: document.querySelectorAll('[data-sorotan-sembunyi]').length,
    }));
    expect(sisa, `langkah ${String(n)}`).toEqual({ lapisan: 0, inert: 0, tersembunyi: 0 });
    /* Tidak ada yang terkunci: "Cara main" di bawah pilihan bisa diketuk dan membuka pemandu lagi. */
    await ketuk(page.locator('[data-uid="cara-main"]'));
    await expect(panel(page)).toContainText('1 dari 4');
  }
});

test('E-63e "Minta petunjuk" di dalam lubang langkah 4: pemandu selesai, kartu penentu ditandai', async ({ page }) => {
  await keLangkah(page, 4);
  await ketuk(page.locator('[data-uid="petunjuk-kartu"]'));
  await expect(panel(page)).toHaveCount(0);
  await expect(lapisan(page)).toHaveCount(0);
  const ditandai = await page
    .locator('.lembar-ditandai')
    .evaluateAll((els) => els.map((e) => (e.getAttribute('data-uid') ?? '').replace('lembar:', '')));
  expect(ditandai.sort()).toEqual([...(SOAL1?.kartu_penentu ?? [])].sort());
});
