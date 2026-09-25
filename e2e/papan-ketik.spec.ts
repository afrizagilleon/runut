import { expect, test } from '@playwright/test';
import { LABEL_KUNCI, buka, penandaBaru, tungguSoal } from './bantu/main.ts';
import { bacaKasus } from './bantu/kasus.ts';

/**
 * E-13 — soal pertama bisa dijawab dan dikunci **hanya dengan papan ketik**.
 *
 * Bukan soal kepatuhan: opsi jawaban adalah `<label><input type="radio">` dengan
 * radio yang disembunyikan secara visual (`opacity: 0`, 1 × 1 px). Bentuk
 * seperti itu mudah sekali menjadi tidak bisa difokus atau tidak bisa dipilih
 * dengan spasi tanpa ada yang menyadarinya, karena tidak ada satu pun tes lain
 * di repo ini yang pernah menekan Tab.
 *
 * Diperiksa juga: elemen yang sedang berfokus punya `outline` terhitung yang
 * bukan `none` — cincin fokus yang hilang membuat papan ketik tidak bisa
 * dipakai walau semua tombolnya berfungsi.
 */

interface Fokus {
  tag: string;
  uid: string;
  jenis: string;
  nilai: string;
  outline: string;
  outlineLebar: string;
  /** Cincin fokus pada leluhur terdekat yang mewakili elemen itu di layar. */
  outlineWakil: string;
  outlineWakilLebar: string;
  wakil: string;
}

/**
 * Cincin fokus terlihat kalau ia ada pada elemen berfokus **atau** pada elemen
 * yang mewakilinya di layar.
 *
 * Ini bukan pelonggaran, ini bentuk produknya: radio opsi sengaja disembunyikan
 * (`opacity: 0`, 1 × 1 px) dan `gaya.css` memindahkan cincinnya ke baris opsi
 * lewat `.opsi:has(input:focus-visible)` sambil menyetel `outline: none` pada
 * radio-nya. Cincin 2 px di kotak 1 px tidak akan menolong siapa pun; cincin di
 * baris opsi menolong. Yang dituntut tes ini tetap sama kerasnya — salah satu
 * dari keduanya **harus** ada, dan tes melaporkan yang mana.
 */
function cincinTerlihat(f: Fokus): boolean {
  const sah = (gaya: string, lebar: string): boolean => gaya !== 'none' && lebar !== '0px';
  return sah(f.outline, f.outlineLebar) || sah(f.outlineWakil, f.outlineWakilLebar);
}

test('E-13 soal 1 dijawab dan dikunci hanya dengan Tab, Space, dan Enter', async ({ page }) => {
  const kasus = bacaKasus();
  const soal = kasus.soal[0];
  expect(soal).toBeDefined();
  if (soal === undefined) return;

  const bacaFokus = async (): Promise<Fokus> =>
    await page.evaluate(() => {
      const kosong = {
        tag: '(null)',
        uid: '',
        jenis: '',
        nilai: '',
        outline: 'none',
        outlineLebar: '0px',
        outlineWakil: 'none',
        outlineWakilLebar: '0px',
        wakil: '',
      };
      const el = document.activeElement;
      if (el === null) return kosong;
      const gaya = getComputedStyle(el);
      const wakil = el.closest('label, [data-uid]');
      const gayaWakil = wakil === null || wakil === el ? null : getComputedStyle(wakil);
      return {
        tag: el.tagName.toLowerCase(),
        uid: el.closest('[data-uid]')?.getAttribute('data-uid') ?? '',
        jenis: el.getAttribute('type') ?? '',
        nilai: el.getAttribute('value') ?? '',
        outline: gaya.outlineStyle,
        outlineLebar: gaya.outlineWidth,
        outlineWakil: gayaWakil?.outlineStyle ?? 'none',
        outlineWakilLebar: gayaWakil?.outlineWidth ?? '0px',
        wakil: wakil === null || wakil === el ? '' : wakil.tagName.toLowerCase(),
      };
    });

  await buka(page, penandaBaru());

  /* --- layar pertama: Tab sampai "Mulai simulasi", lalu Enter ------------ */
  let jejak: Fokus[] = [];
  let ketemu = false;
  for (let n = 0; n < 12 && !ketemu; n += 1) {
    await page.keyboard.press('Tab');
    const f = await bacaFokus();
    jejak.push(f);
    const teks = await page.evaluate(() => document.activeElement?.textContent ?? '');
    if (f.tag === 'button' && teks.includes('Mulai simulasi')) ketemu = true;
  }
  expect(ketemu, `Tab harus sampai ke tombol "Mulai simulasi"; jejak: ${jejak.map((f) => f.tag).join(' > ')}`).toBe(
    true,
  );
  const fokusMulai = await bacaFokus();
  expect(cincinTerlihat(fokusMulai), 'tombol berfokus punya cincin fokus yang terlihat').toBe(true);

  await page.keyboard.press('Enter');
  await tungguSoal(page, 1);

  /* --- layar soal: Tab sampai radio pertama, lalu Space --------------- */
  jejak = [];
  ketemu = false;
  for (let n = 0; n < 40 && !ketemu; n += 1) {
    await page.keyboard.press('Tab');
    const f = await bacaFokus();
    jejak.push(f);
    if (f.tag === 'input' && f.jenis === 'radio') ketemu = true;
  }
  expect(
    ketemu,
    `Tab harus sampai ke opsi jawaban; jejak: ${jejak.map((f) => `${f.tag}${f.uid === '' ? '' : `[${f.uid}]`}`).join(' > ')}`,
  ).toBe(true);

  const fokusOpsi = await bacaFokus();
  expect(
    cincinTerlihat(fokusOpsi),
    `opsi berfokus punya cincin fokus: radio ${fokusOpsi.outline} ${fokusOpsi.outlineLebar}, ` +
      `${fokusOpsi.wakil} ${fokusOpsi.outlineWakil} ${fokusOpsi.outlineWakilLebar}`,
  ).toBe(true);

  // Panah bawah memindahkan fokus di dalam grup radio sampai jawaban yang benar.
  const urutKunci = soal.pilihan.map((p) => p.kunci);
  const tujuan = urutKunci.indexOf(soal.jawaban);
  const sekarang = urutKunci.indexOf(fokusOpsi.nilai);
  expect(sekarang, 'radio yang berfokus adalah salah satu opsi').toBeGreaterThanOrEqual(0);
  for (let n = 0; n < (tujuan - sekarang + urutKunci.length) % urutKunci.length; n += 1) {
    await page.keyboard.press('ArrowDown');
  }
  await page.keyboard.press('Space');

  await expect(
    page.locator(`[data-uid="opsi:${soal.jawaban}"] input`),
    'opsi terpilih hanya dengan papan ketik',
  ).toBeChecked();

  /* --- Tab ke "Cek jawabanku", lalu Enter ------------------------------ */
  ketemu = false;
  jejak = [];
  for (let n = 0; n < 20 && !ketemu; n += 1) {
    await page.keyboard.press('Tab');
    const f = await bacaFokus();
    jejak.push(f);
    const teks = await page.evaluate(() => document.activeElement?.textContent ?? '');
    if (f.tag === 'button' && teks.includes(LABEL_KUNCI)) ketemu = true;
  }
  expect(
    ketemu,
    `Tab harus sampai ke "Cek jawabanku"; jejak: ${jejak.map((f) => f.tag).join(' > ')}`,
  ).toBe(true);
  const fokusKunci = await bacaFokus();
  expect(cincinTerlihat(fokusKunci), 'tombol kunci berfokus punya cincin fokus').toBe(true);

  await page.keyboard.press('Enter');
  await expect(page.getByText('Cocok dengan kartu').first(), 'jawaban terkunci').toBeVisible();

  // eslint-disable-next-line no-console
  console.log(
    `E-13 cincin fokus: ` +
      `mulai -> button ${fokusMulai.outline} ${fokusMulai.outlineLebar}; ` +
      `opsi ${fokusOpsi.uid} -> input ${fokusOpsi.outline} ${fokusOpsi.outlineLebar}, ` +
      `${fokusOpsi.wakil} ${fokusOpsi.outlineWakil} ${fokusOpsi.outlineWakilLebar}; ` +
      `kunci -> button ${fokusKunci.outline} ${fokusKunci.outlineLebar}`,
  );
});
