import { expect, test } from '@playwright/test';
import { buka, penandaBaru } from './bantu/main.ts';
import { bacaKasus } from './bantu/kasus.ts';
import { ID_KASUS } from './bantu/jalur.ts';

/**
 * E-35 — kepala halaman: judul tab, deskripsi, warna tema, ikon, dan pratinjau
 * tautan (M3.10 D-4b, kritik K-6).
 *
 * Sampai `bcd4ac7` tautannya tampil sebagai URL telanjang di Threads, WhatsApp,
 * dan DM, dan tab peramban memakai ikon bola dunia bawaan; judul tab memakai
 * kata-kata yang tidak pernah diuji. Yang diuji di sini adalah build produksi
 * yang sungguh disajikan: tiap berkas yang dirujuk kepala halaman dimuat dan
 * diperiksa isinya (tipe, ukuran PNG dibaca dari header IHDR), dan tidak ada
 * teks kepala halaman yang membawa kode atau nama emiten — identitas emiten
 * tersamar sampai pembukaan (INV C-3), dan pratinjau tautan terbaca SEBELUM
 * orang membuka apa pun.
 */

const JUDUL = 'Cek omongan saham di grup ke dokumen resminya.';
const DESKRIPSI = 'Kasus nyata dari bursa. 3 soal, sekitar 5 menit, tanpa akun.';

test('E-35 kepala halaman: judul, deskripsi, warna tema, ikon kalender, og:image 1200 × 630', async ({
  page,
}) => {
  await buka(page, penandaBaru());
  const kepala = await page.evaluate(() => {
    const meta = (pemilih: string): string[] =>
      [...document.querySelectorAll<HTMLMetaElement>(pemilih)].map(
        (m) => `${m.getAttribute('media') ?? ''}|${m.content}`,
      );
    return {
      judul: document.title,
      deskripsi: meta('meta[name="description"]'),
      tema: meta('meta[name="theme-color"]'),
      ogJudul: meta('meta[property="og:title"]'),
      ogDeskripsi: meta('meta[property="og:description"]'),
      ogGambar: meta('meta[property="og:image"]'),
      ikon: [...document.querySelectorAll<HTMLLinkElement>('link[rel="icon"]')].map((l) => ({
        href: l.href,
        tipe: l.type,
      })),
    };
  });
  // eslint-disable-next-line no-console
  console.log(`E-35 ${JSON.stringify(kepala)}`);

  expect(kepala.judul).toBe(JUDUL);
  expect(kepala.deskripsi).toEqual([`|${DESKRIPSI}`]);
  expect(kepala.ogJudul).toEqual([`|${JUDUL}`]);
  expect(kepala.ogDeskripsi).toEqual([`|${DESKRIPSI}`]);
  expect(kepala.ogGambar).toEqual(['|/pratinjau.png']);
  // Warna tema = --kertas masing-masing mode (token tidak diubah).
  expect(kepala.tema.sort()).toEqual([
    '(prefers-color-scheme: dark)|#0f1524',
    '(prefers-color-scheme: light)|#f3f5f7',
  ]);

  // Ikon: satu SVG, dari asal yang sama, benar-benar tersaji, berpita merah kalender.
  expect(kepala.ikon).toHaveLength(1);
  const ikon = kepala.ikon[0];
  if (ikon === undefined) return;
  expect(new URL(ikon.href).origin).toBe(new URL(page.url()).origin);
  const jawabIkon = await page.request.get(ikon.href);
  expect(jawabIkon.status()).toBe(200);
  expect(jawabIkon.headers()['content-type']).toContain('image/svg+xml');
  const svg = await jawabIkon.text();
  expect(svg).toContain('<svg');
  expect(svg.toUpperCase()).toContain('#D7263D');
  expect(svg, 'ikon tidak memuat apa pun dari luar').not.toMatch(/https?:\/\/(?!www\.w3\.org)/);

  // Pratinjau tautan: PNG 1200 × 630 yang memang tersaji di jalur itu.
  const jawabGambar = await page.request.get(new URL('/pratinjau.png', page.url()).href);
  expect(jawabGambar.status()).toBe(200);
  expect(jawabGambar.headers()['content-type']).toContain('image/png');
  const png = await jawabGambar.body();
  expect(png.subarray(1, 4).toString('ascii')).toBe('PNG');
  expect(png.readUInt32BE(16), 'lebar og:image').toBe(1200);
  expect(png.readUInt32BE(20), 'tinggi og:image').toBe(630);

  // Tidak ada kode/nama emiten di teks kepala halaman mana pun.
  const semuaTeks = [kepala.judul, ...kepala.deskripsi, ...kepala.ogJudul, ...kepala.ogDeskripsi]
    .join(' ')
    .toLowerCase();
  for (const kasus_id of ID_KASUS) {
    const { emiten } = bacaKasus(kasus_id);
    expect(semuaTeks).not.toContain(emiten.simbol.toLowerCase());
    expect(semuaTeks).not.toContain(emiten.nama.toLowerCase());
  }
});
