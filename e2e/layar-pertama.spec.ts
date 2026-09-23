import { expect, test, type Page } from '@playwright/test';
import { LABEL_MULAI, buka, ketuk, penandaBaru, tungguGulirBerhenti } from './bantu/main.ts';
import { bacaKasus } from './bantu/kasus.ts';
import { ID_KASUS } from './bantu/jalur.ts';

/**
 * E-27 — layar pertama varian A (M3.9 D-2): kalender → judul → SATU contoh
 * gelembung → ajakan → "Mulai kasus".
 *
 * Kenapa ia ada: data alpha 23 Sep mencatat 13 orang asing dan nol yang
 * selesai; tiga orang uji duduk balik bertanya "ini aplikasi apa?". Di uji
 * K-06, judul + satu contoh omongan menjawab "ini apa" 9/10.
 *
 * Tiga kegagalan yang dijaga di sini, semuanya disebut kontrak:
 * - contoh gelembung ditulis ulang sebagai teks kedua alih-alih DIBACA dari
 *   `soal[0].pesan` — tes ini membandingkan teksnya dengan berkas kasus;
 * - "Kita mundur ke …" masih ada di layar pertama;
 * - garis kaki tiga kalimat tetap mengintip di atas tombol.
 *
 * Semua teks yang dibandingkan dibaca dari `cases/<id>.json`, tidak disalin ke
 * sini, supaya tes ini tidak hijau karena menyalin kesalahan yang sama.
 */

interface Susunan {
  kalender: DOMRectLike;
  judul: DOMRectLike;
  contoh: DOMRectLike;
  ajak: DOMRectLike;
  bilah: DOMRectLike;
  kaki: DOMRectLike;
  kakiAkhir: DOMRectLike;
  tinggiJendela: number;
  kakiBantalBawah: number;
}

interface DOMRectLike {
  top: number;
  bottom: number;
  left: number;
  right: number;
  height: number;
}

async function ukurSusunan(page: Page): Promise<Susunan> {
  return page.evaluate(() => {
    const kotak = (pemilih: string): DOMRectLike => {
      const el = document.querySelector(pemilih);
      if (el === null) throw new Error(`tidak ada ${pemilih}`);
      const k = el.getBoundingClientRect();
      return { top: k.top, bottom: k.bottom, left: k.left, right: k.right, height: k.height };
    };
    const kaki = document.querySelector('[data-uid="kaki-halaman"]');
    return {
      kalender: kotak('[data-uid="kalender"] .kalender-halaman'),
      judul: kotak('h1#judul-pembuka'),
      contoh: kotak('[data-uid="contoh-pesan"]'),
      ajak: kotak('[data-uid="ajak"]'),
      bilah: kotak('[data-uid="bilah"]'),
      kaki: kotak('[data-uid="kaki-halaman"]'),
      kakiAkhir: kotak('[data-uid="kaki-halaman"] li:last-child'),
      tinggiJendela: window.innerHeight,
      kakiBantalBawah: kaki === null ? 0 : parseFloat(getComputedStyle(kaki).paddingBottom),
    };
  });
}

for (const kasus_id of ID_KASUS) {
  test.describe(`E-27 [${kasus_id}] layar pertama menjelaskan dirinya`, () => {
    const kasus = bacaKasus(kasus_id);
    const pertama = kasus.soal[0];

    test('E-27a judul dan ajakan dari berkas kasus; "Kita mundur ke" hilang', async ({ page }) => {
      await buka(page, penandaBaru(), kasus_id);
      await expect(page.getByRole('button', { name: LABEL_MULAI })).toBeVisible();

      const judul = page.getByRole('heading', { level: 1 });
      await expect(judul).toHaveCount(1);
      await expect(judul).toHaveText(kasus.pembuka.judul);
      await expect(page.locator('[data-uid="ajak"]')).toHaveText(kasus.pembuka.ajak);
      await expect(page.locator('main')).not.toContainText('Kita mundur ke');
      await expect(page.locator('[data-uid="kalimat-pembuka"]')).toHaveCount(0);
      // Tanggalnya tetap dibawa kalender (dan kaki), bukan kalimat.
      await expect(page.locator('[data-uid="kalender"] [role="img"]')).toHaveCount(1);
    });

    test('E-27b contoh gelembung = soal[0].pesan: nama dan isi saja, bukan salinan melayang', async ({
      page,
    }) => {
      expect(pertama, 'kasus punya soal pertama').toBeDefined();
      if (pertama === undefined) return;
      await buka(page, penandaBaru(), kasus_id);

      const contoh = page.locator('[data-uid="contoh-pesan"]');
      await expect(contoh).toHaveCount(1);
      await expect(contoh.locator('.pesan-nama')).toHaveText(pertama.pesan.nama);
      await expect(contoh.locator('.isi')).toHaveText(pertama.pesan.isi);
      // Nama pengirim saja: tanpa jam, tanpa tanggal.
      const teks = (await contoh.innerText()).replace(/\s+/g, ' ').trim();
      expect(teks, 'gelembung contoh hanya memuat nama dan isi').toBe(
        `${pertama.pesan.nama} ${pertama.pesan.isi}`,
      );
      expect(teks).not.toContain(pertama.pesan.jam);
      await expect(contoh.locator('time')).toHaveCount(0);
      // Tidak interaktif, dan bukan salinan melayang M3.7.
      await expect(contoh.locator('button, a, [tabindex]')).toHaveCount(0);
      await expect(page.locator('.melayang, [data-uid="balon"]')).toHaveCount(0);
      // Bahannya sama dengan gelembung soal: satu-satunya bentuk membulat.
      const rupa = await contoh.locator('.pesan-balon').evaluate((el) => {
        const g = getComputedStyle(el);
        return { tag: el.tagName, latar: g.backgroundColor, sudut: g.borderRadius };
      });
      expect(rupa.tag).toBe('BLOCKQUOTE');
      const obrolan = await page.evaluate(() => {
        const coba = document.createElement('div');
        coba.style.background = 'var(--obrolan)';
        document.body.append(coba);
        const warna = getComputedStyle(coba).backgroundColor;
        coba.remove();
        return warna;
      });
      expect(rupa.latar).toBe(obrolan);
      expect(rupa.sudut).toBe('4px 16px 16px');
      // Mengetuknya tidak memindahkan layar.
      await ketuk(contoh);
      await expect(page.getByRole('heading', { level: 1 })).toHaveText(kasus.pembuka.judul);
    });

    test('E-27c urutan: kalender → judul → contoh → ajakan, semuanya di atas bilah bawah', async ({
      page,
    }) => {
      await buka(page, penandaBaru(), kasus_id);
      await expect(page.getByRole('button', { name: LABEL_MULAI })).toBeVisible();
      const s = await ukurSusunan(page);
      const baris = `kalender ${s.kalender.top.toFixed(0)}–${s.kalender.bottom.toFixed(0)} · judul ${s.judul.top.toFixed(0)}–${s.judul.bottom.toFixed(0)} · contoh ${s.contoh.top.toFixed(0)}–${s.contoh.bottom.toFixed(0)} · ajak ${s.ajak.top.toFixed(0)}–${s.ajak.bottom.toFixed(0)} · bilah.atas ${s.bilah.top.toFixed(0)} · kaki.atas ${s.kaki.top.toFixed(0)} · jendela ${String(s.tinggiJendela)}`;
      // eslint-disable-next-line no-console
      console.log(`E-27c [${test.info().project.name}] [${kasus_id}] ${baris}`);
      expect(s.kalender.bottom, baris).toBeLessThanOrEqual(s.judul.top);
      expect(s.judul.bottom, baris).toBeLessThanOrEqual(s.contoh.top);
      expect(s.contoh.bottom, baris).toBeLessThanOrEqual(s.ajak.top);
      expect(s.ajak.bottom, `ajakan harus terbaca di atas bilah bawah: ${baris}`).toBeLessThanOrEqual(
        s.bilah.top,
      );
    });

    test('E-27d kaki tiga kalimat di bawah lipatan, dan terbaca utuh di atas bilah saat digulir', async ({
      page,
    }) => {
      await buka(page, penandaBaru(), kasus_id);
      await expect(page.getByRole('button', { name: LABEL_MULAI })).toBeVisible();
      const awal = await ukurSusunan(page);
      expect(
        awal.kaki.top,
        `garis kaki (${awal.kaki.top.toFixed(1)}) tidak boleh mengintip di atas bilah (${awal.bilah.top.toFixed(1)})`,
      ).toBeGreaterThanOrEqual(awal.bilah.top);
      expect(
        awal.kakiBantalBawah,
        `bantalan bawah kaki ${String(awal.kakiBantalBawah)} harus ≥ tinggi bilah terukur ${awal.bilah.height.toFixed(1)}`,
      ).toBeGreaterThanOrEqual(awal.bilah.height);

      await page.evaluate(() => {
        window.scrollTo({ top: document.documentElement.scrollHeight, behavior: 'instant' });
      });
      await tungguGulirBerhenti(page);
      const bawah = await ukurSusunan(page);
      // eslint-disable-next-line no-console
      console.log(
        `E-27d [${test.info().project.name}] [${kasus_id}] awal kaki.atas=${awal.kaki.top.toFixed(1)} bilah.atas=${awal.bilah.top.toFixed(1)} bilah.tinggi=${awal.bilah.height.toFixed(1)} bantal=${String(awal.kakiBantalBawah)} · digulir: kalimat terakhir.bawah=${bawah.kakiAkhir.bottom.toFixed(1)} bilah.atas=${bawah.bilah.top.toFixed(1)}`,
      );
      expect(
        bawah.kakiAkhir.bottom,
        'kalimat tetap terakhir harus terbaca di atas bilah bawah sesudah digulir habis',
      ).toBeLessThanOrEqual(bawah.bilah.top);
    });

    test('E-27e di ponsel yang lebih tinggi pun garis kaki tidak mengintip', async ({ page }) => {
      /*
       * Isi varian A pendek. Di 360 × 640 ia hampir mengisi layar, tetapi di
       * ponsel 412 × 915 sisa ruangnya ±400 px — di situlah garis kaki paling
       * mudah muncul di atas tombol kalau yang menjaganya hanya satu angka
       * bantalan.
       */
      await page.setViewportSize({ width: 412, height: 915 });
      await buka(page, penandaBaru(), kasus_id);
      await expect(page.getByRole('button', { name: LABEL_MULAI })).toBeVisible();
      const s = await ukurSusunan(page);
      // eslint-disable-next-line no-console
      console.log(
        `E-27e [${test.info().project.name}] [${kasus_id}] 412×915 ajak.bawah=${s.ajak.bottom.toFixed(1)} kaki.atas=${s.kaki.top.toFixed(1)} bilah.atas=${s.bilah.top.toFixed(1)} jendela=${String(s.tinggiJendela)}`,
      );
      expect(s.kaki.top, 'kaki mulai di bawah lipatan').toBeGreaterThanOrEqual(s.tinggiJendela);
    });
  });
}
