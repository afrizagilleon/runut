import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { expect, test, type Page } from '@playwright/test';
import { buka, mulaiKasus, penandaBaru, tungguGulirBerhenti, tungguSoal } from './bantu/main.ts';
import { AKAR, ID_KASUS } from './bantu/jalur.ts';

/**
 * E-31 — nama hari di keping berwarna merah kalender (M3.10 D-1, kritik K-3).
 *
 * `docs/desain.md` §Tanda tangan: keping "HARI INI · RABU 8 OKT 2025", *nama
 * hari berwarna `--merah-kalender`*. Patokan `docs/contoh/layar-soal.html`
 * menulisnya sebagai `.keping-tanggal span { color: var(--merah-kalender) }`.
 * Produk sampai `bcd4ac7` tidak punya elemen tersendiri untuk nama hari, jadi
 * "RABU" ikut berwarna `--tinta` dan layar soal kehilangan satu-satunya merahnya.
 *
 * Kesetiaannya diukur berdampingan: patokan dimuat dari berkas (tanpa jaringan,
 * `setContent`) di peramban dan skema warna yang sama, lalu warna terhitung
 * nama harinya dibandingkan dengan warna terhitung nama hari produk.
 */

interface WarnaKeping {
  nama: string;
  warnaNama: string;
  warnaSisa: string;
  merah: string;
  tinta: string;
}

async function ukurProduk(page: Page): Promise<WarnaKeping> {
  return page.evaluate(() => {
    const tanggal = document.querySelector('[data-uid="keping"] .kalender-tanggal');
    const nama = tanggal?.querySelector('.kalender-hari-nama') ?? null;
    const coba = document.createElement('div');
    document.body.append(coba);
    coba.style.color = 'var(--merah-kalender)';
    const merah = getComputedStyle(coba).color;
    coba.style.color = 'var(--tinta)';
    const tinta = getComputedStyle(coba).color;
    coba.remove();
    return {
      nama: nama?.textContent ?? '',
      warnaNama: nama === null ? '' : getComputedStyle(nama).color,
      warnaSisa: tanggal === null ? '' : getComputedStyle(tanggal).color,
      merah,
      tinta,
    };
  });
}

/** Warna terhitung `.keping-tanggal span` di patokan, di skema warna yang sama. */
async function warnaPatokan(page: Page): Promise<{ nama: string; warna: string }> {
  const html = readFileSync(join(AKAR, 'docs', 'contoh', 'layar-soal.html'), 'utf8');
  const lain = await page.context().newPage();
  await lain.setContent(html);
  const hasil = await lain.evaluate(() => {
    const el = document.querySelector('.keping-tanggal span');
    return { nama: el?.textContent ?? '', warna: el === null ? '' : getComputedStyle(el).color };
  });
  await lain.close();
  return hasil;
}

for (const kasus_id of ID_KASUS) {
  test(`E-31 [${kasus_id}] nama hari di keping berwarna merah kalender, seperti patokan`, async ({
    page,
  }) => {
    await buka(page, penandaBaru(), kasus_id);
    await mulaiKasus(page);
    await tungguSoal(page, 1);
    await tungguGulirBerhenti(page);

    const u = await ukurProduk(page);
    const p = await warnaPatokan(page);
    const tabel =
      `| nilai | patokan (.keping-tanggal span) | produk (.kalender-hari-nama) |\n` +
      `|---|---|---|\n` +
      `| teks | ${p.nama} | ${u.nama} |\n` +
      `| warna terhitung | ${p.warna} | ${u.warnaNama} |\n` +
      `| --merah-kalender produk | | ${u.merah} |\n` +
      `| sisa tanggal (tetap --tinta ${u.tinta}) | | ${u.warnaSisa} |`;
    // eslint-disable-next-line no-console
    console.log(`E-31 [${test.info().project.name}] [${kasus_id}]\n${tabel}`);

    expect(u.nama, 'nama hari punya elemennya sendiri di dalam tanggal keping').toMatch(
      /^(SENIN|SELASA|RABU|KAMIS|JUMAT|SABTU|MINGGU)$/,
    );
    expect(u.warnaNama, tabel).toBe(u.merah);
    expect(u.warnaNama, 'nama hari sama warnanya dengan patokan').toBe(p.warna);
    // Hanya nama harinya yang merah: sisa tanggal tetap tinta.
    expect(u.warnaSisa, tabel).toBe(u.tinta);
    expect(u.warnaNama).not.toBe(u.tinta);
  });
}
