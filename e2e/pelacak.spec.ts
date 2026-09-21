import { expect, test, type Page } from '@playwright/test';
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
  tungguGulirBerhenti,
  tungguSoal,
} from './bantu/main.ts';
import { bacaKasus } from './bantu/kasus.ts';
import {
  mulaiDenganPenanda,
  peristiwaSesi,
  tungguCocok,
  tungguPeristiwa,
  tungguSatuSesi,
  type BarisPeristiwa,
} from './bantu/peristiwa.ts';

/**
 * E-06 (b–g) — pelacak sampai ke berkas.
 *
 * Bukan "peristiwa dikirim": **peristiwa tertulis di cakram**, dibaca dari
 * JSONL yang ditulis `server/kolektor.mjs` yang sama dengan produksi. Di antara
 * tes dan berkas itu ada `sendBeacon`, proxy vite, dan validator pengumpul —
 * ketiganya pernah menjatuhkan peristiwa diam-diam, dan hanya membaca berkasnya
 * yang bisa membuktikan ketiganya dilewati.
 *
 * Gerak jari ditirukan lewat CDP `Input.dispatchTouchEvent` — bukan
 * `mouse.wheel`, bukan `window.scrollTo`, dan bukan
 * `Input.synthesizeScrollGesture` (lihat `gulirJari` di bawah; yang terakhir
 * diukur tidak menggulir sama sekali di mesin ini). Yang diuji memang jari:
 * ambang "gerak lebih dari 10 px bukan ketukan" hanya berarti kalau yang
 * menggerakkan benar-benar sebuah sentuhan.
 */

/** Titik tengah sebuah elemen, dalam koordinat viewport. */
async function titikTengah(page: Page, pemilih: string): Promise<{ x: number; y: number }> {
  const kotak = await page.locator(pemilih).boundingBox();
  expect(kotak, `elemen ${pemilih} harus punya kotak`).not.toBeNull();
  return { x: (kotak?.x ?? 0) + (kotak?.width ?? 0) / 2, y: (kotak?.y ?? 0) + (kotak?.height ?? 0) / 2 };
}

/**
 * Geser jari mendatar sejauh `jarak` px, tanpa mengangkatnya di tengah jalan.
 *
 * Jaraknya penting, dan angkanya hasil pengukuran. Chromium punya ambang
 * geser sendiri: di bawahnya ia melepas `pointerup` di posisi baru, di atasnya
 * ia membatalkan sentuhannya (`pointercancel`) dan `pointerup` tidak pernah
 * datang. Terukur di mesin ini, pada lembar yang sama:
 *
 * ```
 * jarak= 4px -> pointerdown@49,382 | pointerup@53,382
 * jarak=12px -> pointerdown@49,382 | pointerup@61,382
 * jarak=20px -> pointerdown@49,382 | pointercancel@0,0
 * jarak=40px -> pointerdown@49,382 | pointercancel@0,0
 * jarak=60px -> pointerdown@49,382 | pointercancel@0,0
 * ```
 *
 * Jadi geseran besar **tidak** menguji `GESER_MAKS` produk sama sekali —
 * peramban sudah membuang ketukannya lebih dulu. Yang menguji ambang 10 px
 * adalah geseran 12 px: `pointerup` datang, dan yang menolaknya sebagai ketukan
 * memang `ketukanSah()`.
 */
async function geserJari(page: Page, dari: { x: number; y: number }, jarak: number): Promise<void> {
  const cdp = await page.context().newCDPSession(page);
  await cdp.send('Input.dispatchTouchEvent', {
    type: 'touchStart',
    touchPoints: [{ x: dari.x, y: dari.y }],
  });
  for (const bagian of [0.25, 0.5, 0.75, 1]) {
    await cdp.send('Input.dispatchTouchEvent', {
      type: 'touchMove',
      touchPoints: [{ x: dari.x + jarak * bagian, y: dari.y }],
    });
  }
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
  await cdp.detach();
}

/**
 * Gulir dengan jari sungguhan: satu sentuhan yang turun, bergerak ke atas dalam
 * delapan langkah, lalu diangkat.
 *
 * **Bukan** `Input.synthesizeScrollGesture`, dan itu hasil pengukuran, bukan
 * selera. Di mesin ini `synthesizeScrollGesture` dengan
 * `gestureSourceType: 'touch'` tidak menggulir sama sekali — `window.scrollY`
 * tetap 0 sesudah dua panggilan — sementara panggilan yang sama tanpa
 * `gestureSourceType` (jadi tetikus) menggulir 400 px. Angka mentahnya ada di
 * ledger T-05 (OQ-4). `Input.dispatchTouchEvent` menggulir dengan andal, dan ia
 * juga yang paling dekat dengan jari pemilik.
 */
async function gulirJari(page: Page, dari: { x: number; y: number }, jauh: number): Promise<void> {
  const cdp = await page.context().newCDPSession(page);
  const langkah = 8;
  await cdp.send('Input.dispatchTouchEvent', {
    type: 'touchStart',
    touchPoints: [{ x: dari.x, y: dari.y }],
  });
  for (let n = 1; n <= langkah; n += 1) {
    await cdp.send('Input.dispatchTouchEvent', {
      type: 'touchMove',
      touchPoints: [{ x: dari.x, y: dari.y - (jauh * n) / langkah }],
    });
  }
  /*
   * Ekor yang hampir diam, sebelum jari diangkat.
   *
   * Tanpa ini, Chromium membaca kecepatan dari gerakan terakhir dan melanjutkan
   * guliran sendiri (fling). Jaraknya lalu tidak bisa diramalkan: pengukuran
   * yang sama menghasilkan 0,92 di satu putaran dan 1,00 di putaran berikutnya.
   * Tiga langkah satu piksel membuat kecepatan akhirnya nyaris nol, sehingga
   * halaman berhenti di tempat jari berhenti.
   */
  for (let n = 1; n <= 3; n += 1) {
    await cdp.send('Input.dispatchTouchEvent', {
      type: 'touchMove',
      touchPoints: [{ x: dari.x, y: dari.y - jauh - n }],
    });
  }
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
  await cdp.detach();
}

function ketukan(daftar: BarisPeristiwa[]): BarisPeristiwa[] {
  return daftar.filter((p) => p.nama === 'ketuk');
}

test('E-06b/c ketukan mati dan hidup; gerak jari > 10 px bukan ketukan', async ({ page }) => {
  const kasus = bacaKasus();
  const soal = kasus.soal[0];
  expect(soal).toBeDefined();
  if (soal === undefined) return;

  const penanda = penandaBaru();
  await buka(page, penanda);
  const sesi = await tungguSatuSesi(penanda);
  await mulaiKasus(page);
  await tungguSoal(page, 1);

  const fact_id = soal.kartu[0] ?? '';
  const uidLembar = `lembar:${fact_id}`;
  // Kepala lembar punya id sendiri (`aria-labelledby`), jadi ia bisa ditemukan
  // tanpa selektor kelas. Ia teks biasa di dalam lembar: tidak interaktif.
  const kepala = `#kartu-${fact_id}`;
  await expect(page.locator(kepala)).toBeVisible();

  /* --- (c) jari yang bergeser: TIDAK melahirkan ketukan ---------------- */
  // 12 px: `pointerup` sungguhan datang, dan yang menolaknya adalah ambang
  // 10 px milik produk (`GESER_MAKS`).
  await geserJari(page, await titikTengah(page, kepala), 12);
  // 60 px: peramban sendiri sudah membatalkan sentuhannya. Diuji juga supaya
  // kedua jalur penolakan sama-sama punya penjaga.
  await geserJari(page, await titikTengah(page, kepala), 60);

  /* --- (b) jari yang mengetuk badan lembar: ketukan MATI -------------- */
  await ketuk(page.locator(kepala));

  /* --- (b) jari yang mengetuk opsi: ketukan HIDUP --------------------- */
  await bilahTurunAda(page, soal.pilihan[0]?.kunci ?? 'a');
  await pilihOpsi(page, soal.jawaban);

  // `kunci_jawaban` ada di PENTING, jadi seluruh antrean ikut tersiram.
  await kunciJawaban(page);
  await tungguPeristiwa(sesi, 'kunci_jawaban', 1);

  const semua = ketukan(peristiwaSesi(sesi));
  const diLembar = semua.filter((p) => p.isi.uid === uidLembar);
  const diOpsi = semua.filter((p) => p.isi.uid === `opsi:${soal.jawaban}`);

  expect(
    diLembar.length,
    'dua geseran tidak melahirkan ketukan; hanya ketukan sungguhan yang tercatat',
  ).toBe(1);
  expect(diLembar[0]?.isi.mati, 'ketukan di badan lembar adalah ketukan MATI').toBe(true);

  expect(diOpsi.length, 'ketukan di opsi tercatat').toBe(1);
  expect(diOpsi[0]?.isi.mati, 'ketukan di opsi adalah ketukan HIDUP').toBe(false);

  for (const k of semua) {
    const x = k.isi.x;
    const y = k.isi.y;
    expect(typeof x === 'number' && x >= 0 && x <= 1, `x ${String(x)} harus 0-1`).toBe(true);
    expect(typeof y === 'number' && y >= 0 && y <= 1, `y ${String(y)} harus 0-1`).toBe(true);
  }

  // eslint-disable-next-line no-console
  console.log(
    `E-06b/c sesi=${sesi} ketuk=${String(semua.length)} ` +
      semua.map((k) => `${String(k.isi.uid)}(mati=${String(k.isi.mati)})`).join(' '),
  );
});

test('E-06d gulir tercatat, dan angkanya cocok dengan scrollY (OQ-4)', async ({ page }) => {
  const kasus = bacaKasus();
  const soal = kasus.soal[0];
  expect(soal).toBeDefined();
  if (soal === undefined) return;

  const penanda = penandaBaru();
  await buka(page, penanda);
  const sesi = await tungguSatuSesi(penanda);
  await mulaiKasus(page);
  await tungguSoal(page, 1);

  /*
   * Pengukur tandingan, dipasang di halaman: rumus yang sama dengan produk,
   * tetapi dihitung tes dari `scrollY` sendiri. Kalau keduanya sepakat, angka
   * yang sampai ke berkas memang kedalaman gulir yang sungguhan terjadi.
   */
  await page.evaluate(() => {
    const jendela = window as unknown as { __maksUji?: number };
    const hitung = (): void => {
      const tinggi = document.documentElement.scrollHeight - window.innerHeight;
      const persen = tinggi <= 0 ? 100 : (window.scrollY / tinggi) * 100;
      jendela.__maksUji = Math.max(jendela.__maksUji ?? 0, persen);
    };
    jendela.__maksUji = 0;
    hitung();
    window.addEventListener('scroll', hitung, { passive: true });
  });

  /*
   * SATU geseran, bukan sampai mentok. Gulir sampai dasar selalu menghasilkan
   * 1,00 di kedua sisi, dan dua angka yang sama-sama 1,00 tidak membuktikan
   * keduanya menghitung hal yang sama. Angka di tengah-tengahlah yang menguji.
   */
  const tengah = { x: 180, y: 520 };
  await gulirJari(page, tengah, 380);
  await tungguGulirBerhenti(page);

  const maksUji = await page.evaluate(
    () => (window as unknown as { __maksUji?: number }).__maksUji ?? 0,
  );
  expect(maksUji, 'jari sungguhan memang menggulir halaman').toBeGreaterThan(0);

  // Meninggalkan layar soal melahirkan `gulir`; `layar_masuk` sesudahnya ada di
  // PENTING, jadi keduanya tersiram bersama.
  await page.goBack();
  await expect(page.getByRole('button', { name: 'Mulai kasus' })).toBeVisible();

  const gulir = await tungguCocok(
    sesi,
    (p) => p.nama === 'gulir' && p.isi.layar === 'soal-1',
    'menunggu peristiwa gulir untuk layar soal-1',
  );
  const maksTercatat = Number(gulir[0]?.isi.maks ?? -1);
  const maksDihitung = Math.round(maksUji) / 100;

  expect(maksTercatat, 'gulir.maks harus lebih dari nol').toBeGreaterThan(0);
  expect(
    maksTercatat,
    'dan kurang dari satu: angka di tengah yang menguji, bukan gulir sampai mentok',
  ).toBeLessThan(1);
  expect(
    Math.abs(maksTercatat - maksDihitung),
    `gulir.maks tercatat ${String(maksTercatat)} lawan hitungan tes ${String(maksDihitung)}`,
  ).toBeLessThanOrEqual(0.02);

  // eslint-disable-next-line no-console
  console.log(
    `E-06d/OQ-4 sesi=${sesi} gulir.maks-tercatat=${String(maksTercatat)} ` +
      `dihitung-tes-dari-scrollY=${String(maksDihitung)} (mentah ${maksUji.toFixed(3)}%) ` +
      `selisih=${Math.abs(maksTercatat - maksDihitung).toFixed(3)}`,
  );
});

test('E-06e/g urut naik tanpa lubang sampai pagehide; tidak ada ip, ua, atau teks yang diketik', async ({
  page,
}) => {
  const kasus = bacaKasus();
  const penanda = penandaBaru();
  const rahasia = `rahasia-${penanda}-jangan-bocor`;

  await buka(page, penanda);
  const sesi = await tungguSatuSesi(penanda);
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
  await lanjut(page, 'Lanjut: tiga pertanyaan singkat');

  // Satu-satunya kotak masukan di seluruh aplikasi, dan satu-satunya tempat teks
  // pemain boleh dicatat (D-11).
  await page.locator('textarea').fill(rahasia);
  await lanjut(page, LABEL_SELESAI);
  await tungguPeristiwa(sesi, 'akhir_kirim', 1);

  /* --- pagehide: halaman ditinggalkan sungguhan ------------------------ */
  await page.goto('about:blank');
  await tungguPeristiwa(sesi, 'tutup', 1);

  const semua = peristiwaSesi(sesi);
  const urut = semua.map((p) => p.urut);
  expect(urut, 'urut naik dari 1 tanpa lubang dan tanpa kembaran').toEqual(
    Array.from({ length: urut.length }, (_, i) => i + 1),
  );
  expect(new Set(urut).size, 'tidak ada urut kembar').toBe(urut.length);
  expect(semua[semua.length - 1]?.nama, 'peristiwa terakhir sesi adalah tutup').toBe('tutup');
  expect(
    semua.filter((p) => p.nama === 'tutup').length,
    'tutup lahir sekali walau pagehide bisa menyala lebih dari sekali',
  ).toBe(1);

  /* --- (g) apa yang TIDAK boleh ada di berkas -------------------------- */
  const mentah = semua.map((p) => JSON.stringify(p));
  for (const kunci of ['ip', 'ua', 'user_agent']) {
    for (const baris of mentah) {
      const isi = JSON.parse(baris) as { isi: Record<string, unknown> };
      expect(
        Object.prototype.hasOwnProperty.call(isi.isi, kunci),
        `tidak ada medan "${kunci}" di peristiwa apa pun`,
      ).toBe(false);
    }
  }
  const memuatRahasia = semua.filter((p) => JSON.stringify(p).includes(rahasia));
  expect(
    memuatRahasia.map((p) => p.nama),
    'teks yang diketik hanya boleh muncul di akhir_kirim',
  ).toEqual(['akhir_kirim']);
  expect(memuatRahasia[0]?.isi.teks, 'dan hanya di medan teks-nya').toBe(rahasia);

  // eslint-disable-next-line no-console
  console.log(
    `E-06e/g sesi=${sesi} peristiwa=${String(semua.length)} urut=1..${String(urut.length)} ` +
      `nama=${[...new Set(semua.map((p) => p.nama))].join(',')}`,
  );
});

test('E-06f pengunjung sama di konteks yang sama, berbeda di konteks baru', async ({
  page,
  browser,
}) => {
  const dasar = test.info().project.use.baseURL ?? '';

  const p1 = penandaBaru();
  await buka(page, p1);
  await tungguSatuSesi(p1);
  const pertama = mulaiDenganPenanda(p1)[0];
  expect(pertama?.isi.kunjungan_ke, 'kunjungan pertama').toBe(1);
  const pengunjung = pertama?.isi.pengunjung;
  expect(typeof pengunjung, 'pengunjung tersimpan').toBe('string');

  /* --- kunjungan kedua, konteks yang SAMA ------------------------------ */
  const p2 = penandaBaru();
  await buka(page, p2);
  await tungguSatuSesi(p2);
  const kedua = mulaiDenganPenanda(p2)[0];
  expect(kedua?.isi.pengunjung, 'nomor pengunjung yang sama dipakai lagi').toBe(pengunjung);
  expect(kedua?.isi.kunjungan_ke, 'hitungan kunjungan naik jadi 2').toBe(2);
  expect(kedua?.sesi, 'id sesinya tetap baru — sesi bukan pengunjung').not.toBe(pertama?.sesi);

  /* --- konteks BARU: pengunjung berbeda -------------------------------- */
  const konteksLain = await browser.newContext({ baseURL: dasar });
  try {
    const halamanLain = await konteksLain.newPage();
    const p3 = penandaBaru();
    await buka(halamanLain, p3);
    await tungguSatuSesi(p3);
    const ketiga = mulaiDenganPenanda(p3)[0];
    expect(ketiga?.isi.pengunjung, 'konteks baru = pengunjung baru').not.toBe(pengunjung);
    expect(ketiga?.isi.kunjungan_ke, 'dan ia berada di kunjungan pertamanya').toBe(1);

    // eslint-disable-next-line no-console
    console.log(
      `E-06f pengunjung-konteks-lama=${String(pengunjung)} kunjungan 1 lalu ` +
        `${String(kedua?.isi.kunjungan_ke)}; pengunjung-konteks-baru=${String(ketiga?.isi.pengunjung)}`,
    );
  } finally {
    await konteksLain.close();
  }
});
