import { expect, test } from '@playwright/test';
import {
  LABEL_SELESAI,
  LABEL_SESUDAHNYA,
  bilahTurunAda,
  buka,
  ketuk,
  kunciJawaban,
  lanjut,
  mulaiKasus,
  penandaBaru,
  pilihOpsi,
  tungguSoal,
} from './bantu/main.ts';
import { bacaKasus } from './bantu/kasus.ts';
import { HOST_BOLEH_SEBAGAI_TEKS, bacaBundel } from './bantu/bundel.ts';
import { BERKAS_KASUS, DIR_DIST_DENGAN } from './bantu/jalur.ts';
import { readFileSync } from 'node:fs';
import { tungguPeristiwa, tungguSatuSesi } from './bantu/peristiwa.ts';

/**
 * E-08 (bagian "dengan pengumpul") — semua permintaan seasal, satu tujuan tulis.
 *
 * Di produksi Caddy menyajikan aplikasi dan meneruskan `/e` ke pengumpul di
 * loopback: satu asal, tanpa CORS. Tes ini memastikan susunan itu benar-benar
 * yang terjadi — bukan hanya yang ditulis di konfigurasi — dengan mencatat
 * setiap permintaan sepanjang satu permainan penuh.
 */
test('E-08 dengan pengumpul: semua seasal, satu-satunya tujuan tulis adalah /e', async ({
  page,
}) => {
  const kasus = bacaKasus();
  const penanda = penandaBaru();

  const permintaan: { metode: string; url: string; jenis: string }[] = [];
  page.on('request', (r) => {
    permintaan.push({ metode: r.method(), url: r.url(), jenis: r.resourceType() });
  });

  await buka(page, penanda);
  const asal = new URL(page.url()).origin;
  const sesi = await tungguSatuSesi(penanda);

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
  await lanjut(page, 'Lanjut: tiga pertanyaan singkat');
  await lanjut(page, LABEL_SELESAI);
  await tungguPeristiwa(sesi, 'akhir_kirim', 1);
  await page.goto('about:blank');
  await tungguPeristiwa(sesi, 'tutup', 1);

  const keAsalLain = permintaan.filter((p) => !p.url.startsWith(`${asal}/`) && p.url !== 'about:blank');
  const menulis = permintaan.filter((p) => p.metode !== 'GET' && p.metode !== 'HEAD');

  expect(
    keAsalLain.map((p) => `${p.metode} ${p.url}`),
    'semua permintaan harus seasal dengan aplikasi',
  ).toEqual([]);
  expect(menulis.length, 'peristiwa memang dikirim').toBeGreaterThan(0);
  const tujuanTulis = [...new Set(menulis.map((p) => new URL(p.url).pathname))];
  expect(tujuanTulis, 'satu-satunya tujuan tulis adalah /e').toEqual(['/e']);

  /* --- isi bundel ------------------------------------------------------ */
  const bundel = bacaBundel(DIR_DIST_DENGAN);
  expect(bundel.length, 'ada berkas JS hasil build').toBeGreaterThan(0);

  const hostKasus = [
    ...new Set(
      (readFileSync(BERKAS_KASUS, 'utf8').match(/https?:\/\/[^"'`\s\\)]{3,90}/g) ?? []).map((u) => {
        try {
          return new URL(u).host;
        } catch {
          return u;
        }
      }),
    ),
  ];

  const hostBundel = [...new Set(bundel.flatMap((b) => b.host))].sort();
  const bolehDitulis = [...new Set([...hostKasus, ...Object.keys(HOST_BOLEH_SEBAGAI_TEKS)])].sort();

  /*
   * M3.13 D-4: halaman "Dapur agen" dimuat sebagai potongan terpisah
   * (`Dapur-*.js`, `import()` di `main.tsx`) dan tidak mengirim apa pun, jadi
   * ia memang tidak memuat alamat pengumpul. Yang dijaga tetap: alamat "/e"
   * ada TEPAT SEKALI di seluruh bundel, di potongan permainan — dan tidak ada
   * satu potongan pun yang memuat `E:/`.
   */
  const potonganDapur = bundel.filter((b) => /^Dapur-/.test(b.nama));
  expect(potonganDapur, 'halaman dapur = satu potongan terpisah').toHaveLength(1);
  const jumlahE = bundel.reduce((j, b) => j + (b.teks.split('"/e"').length - 1), 0);
  expect(jumlahE, 'alamat pengumpul "/e" tepat sekali di seluruh bundel').toBe(1);
  for (const b of potonganDapur) {
    expect(b.teks.includes('"/e"'), `${b.nama} (dapur) tidak memuat alamat pengumpul`).toBe(false);
  }
  for (const b of bundel) {
    if (potonganDapur.includes(b)) {
      expect(b.teks.includes('E:/'), `${b.nama} TIDAK boleh memuat E:/`).toBe(false);
      continue;
    }
    expect(b.teks.includes('"/e"'), `${b.nama} memuat alamat pengumpul "/e"`).toBe(true);
    /*
     * Git Bash mengubah `VITE_KOLEKTOR_URL=/e` menjadi `E:/…` kalau variabelnya
     * diset di baris perintah. Bundel yang memuat `E:/` akan mengirim peristiwa
     * ke tempat yang tidak ada, dan tidak ada tes lain yang bisa melihatnya.
     */
    expect(b.teks.includes('E:/'), `${b.nama} TIDAK boleh memuat E:/`).toBe(false);
  }

  expect(
    hostBundel,
    'host yang muncul sebagai teks di bundel harus persis yang sudah dijelaskan',
  ).toEqual(bolehDitulis);

  // eslint-disable-next-line no-console
  console.log(
    `E-08 dengan-pengumpul: permintaan=${String(permintaan.length)} ke-asal-lain=0 ` +
      `tulis=${String(menulis.length)} tujuan=${tujuanTulis.join(',')}\n` +
      `  host-di-data-kasus=${hostKasus.length === 0 ? '(tidak ada)' : hostKasus.join(',')}\n` +
      `  host-di-bundel=${hostBundel.join(', ')}\n` +
      bundel
        .map(
          (b) =>
            `  ${b.nama} ${String(b.bita)}B alamat=${String(b.alamat.length)} ` +
            `"/e"=${String(b.teks.includes('"/e"'))} E:/=${String(b.teks.includes('E:/'))}`,
        )
        .join('\n'),
  );
});

/**
 * E-08m314 (M3.14 D-1) — slot soal pemanasan KOSONG di bundel produksi, dan
 * fixture ujinya (`web/src/pemanasan/uji/`) tidak ikut: penanda FIXTUREUJI
 * yang ditulis di setiap kalimat fixture tidak boleh ada di berkas mana pun.
 */
test('E-08m314 fixture soal pemanasan tidak ikut ke bundel produksi', () => {
  const isi = bacaBundel(DIR_DIST_DENGAN)
    .map((b) => b.teks)
    .join('\n');
  expect(isi.length, 'bundel terbaca').toBeGreaterThan(1000);
  expect(isi.includes('FIXTUREUJI'), 'fixture pemanasan bocor ke bundel').toBe(false);
  expect(isi.includes('pemanasan-uji'), 'soal_id fixture bocor ke bundel').toBe(false);
});
