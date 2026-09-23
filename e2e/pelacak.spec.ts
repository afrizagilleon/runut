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

  /*
   * `gulir` TINGGALKAN-layar, bukan `gulir` pertama. Sejak M3.8 D-5 ambang
   * 25 % ikut lahir di tengah geseran ini, jadi `gulir` pertama soal-1 adalah
   * ambangnya (0,25) — bukan kedalaman terjauh yang sedang diuji di sini.
   */
  await expect
    .poll(() => pisahGulir(peristiwaSesi(sesi), 'soal-1').tinggalkan.length, {
      timeout: 20_000,
      message: 'menunggu gulir tinggalkan-layar untuk soal-1',
    })
    .toBeGreaterThanOrEqual(1);
  const gulir = pisahGulir(peristiwaSesi(sesi), 'soal-1').tinggalkan;
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

/**
 * D-2: ambang dibedakan dari peristiwa tinggalkan-layar lewat URUTAN, bukan
 * lewat medan baru. `gulir` yang diikuti `layar_masuk`/`tutup` pada `t_ms` yang
 * sama adalah yang lahir saat meninggalkan layar; sisanya ambang.
 *
 * Aturannya ditulis di sini sebagai kode dan dipakai apa adanya oleh tes di
 * bawah — jadi yang dibuktikan sekaligus adalah bahwa aturan itu memang bisa
 * dipakai pembaca berkas, bukan hanya kalimat di kontrak.
 */
function pisahGulir(
  semua: BarisPeristiwa[],
  layar: string,
): { ambang: BarisPeristiwa[]; tinggalkan: BarisPeristiwa[] } {
  const ambang: BarisPeristiwa[] = [];
  const tinggalkan: BarisPeristiwa[] = [];
  for (const [nomor, p] of semua.entries()) {
    if (p.nama !== 'gulir' || p.isi.layar !== layar) continue;
    const sesudah = semua[nomor + 1];
    const pindah =
      sesudah !== undefined &&
      (sesudah.nama === 'layar_masuk' || sesudah.nama === 'tutup') &&
      sesudah.t_ms === p.t_ms;
    (pindah ? tinggalkan : ambang).push(p);
  }
  return { ambang, tinggalkan };
}

/**
 * E-06h (M3.4a, RQ-03) — ambang gulir 50 % dan 100 % sampai ke berkas.
 *
 * Yang diuji bukan "reducer melahirkan dua peristiwa" — itu tugas tes unit.
 * Yang diuji di sini adalah jalur penuhnya: jari sungguhan menggulir halaman
 * sungguhan, `pointerup`/`scroll` melapor, reducer melahirkan, `sendBeacon`
 * mengirim, proxy meneruskan, validator pengumpul menerima, dan barisnya
 * **tertulis di cakram**. Empat dari enam tahap itu pernah menjatuhkan
 * peristiwa diam-diam di proyek ini.
 *
 * Ambang **tidak** ada di `PENTING`, jadi ia menumpuk di antrean sampai
 * peristiwa penting berikutnya (`kunci_jawaban`) menyiramnya. Itu memang yang
 * dituntut D-1 ("ikut kelompok biasa"), dan tes ini membuktikan ia tidak hilang
 * karena menunggu.
 */
test('E-06h ambang gulir 25/50/75/100% lahir sekali, sebelum kunci_jawaban', async ({ page }) => {
  const kasus = bacaKasus();
  const soal = kasus.soal[0];
  expect(soal).toBeDefined();
  if (soal === undefined) return;

  const penanda = penandaBaru();
  await buka(page, penanda);
  const sesi = await tungguSatuSesi(penanda);
  await mulaiKasus(page);
  await tungguSoal(page, 1);

  /** Rumus yang sama dengan produk, dihitung tes dari `scrollY` sendiri. */
  const persenSekarang = async (): Promise<number> =>
    page.evaluate(() => {
      const tinggi = document.documentElement.scrollHeight - window.innerHeight;
      return tinggi <= 0 ? 100 : (window.scrollY / tinggi) * 100;
    });

  const tinggiGulir = await page.evaluate(
    () => document.documentElement.scrollHeight - window.innerHeight,
  );
  /*
   * Kalau layar soal 1 muat satu jendela, tes ini tidak menguji apa yang
   * dikiranya menguji — ia harus mengatakannya, bukan hijau diam-diam.
   */
  expect(
    tinggiGulir,
    'layar soal 1 harus lebih panjang dari satu jendela, kalau tidak tes ini kosong',
  ).toBeGreaterThan(200);

  /*
   * Enam langkah sampai dasar, bukan satu geseran. Satu geseran dari 0 ke 100 %
   * melahirkan kedua ambang dalam SATU pemanggilan reducer dengan `t_ms` yang
   * sama — dan "kapan 50 % terlewat" lalu tidak terukur. Langkah kecil juga
   * lebih menyerupai jempol sungguhan.
   */
  const langkahPx = Math.max(60, Math.round(tinggiGulir / 6));
  const tengah = { x: 180, y: 520 };
  const jejak: number[] = [await persenSekarang()];
  for (let n = 0; n < 20 && (jejak[jejak.length - 1] ?? 0) < 99.5; n += 1) {
    await gulirJari(page, tengah, langkahPx);
    await tungguGulirBerhenti(page);
    jejak.push(await persenSekarang());
  }

  expect(jejak[jejak.length - 1], 'jari harus sampai ke dasar layar soal 1').toBeGreaterThanOrEqual(
    99.5,
  );
  /*
   * Prasyarat tes: halaman pernah berhenti di antara kedua ambang. Tanpa itu,
   * `t_ms` kedua ambang boleh saja sama, dan asersi urutan waktu di bawah
   * menjadi asersi yang tidak pernah bisa gagal.
   */
  expect(
    jejak.some((p) => p >= 50 && p < 99.5),
    `halaman harus pernah berhenti di antara 50% dan dasar; jejak=${jejak
      .map((p) => p.toFixed(0))
      .join(',')}`,
  ).toBe(true);

  await pilihOpsi(page, soal.jawaban);
  await kunciJawaban(page);
  const kunci = (await tungguPeristiwa(sesi, 'kunci_jawaban'))[0];
  expect(kunci).toBeDefined();

  const sebelumKunci = peristiwaSesi(sesi).filter((p) => p.urut <= (kunci?.urut ?? 0));
  const { ambang } = pisahGulir(sebelumKunci, 'soal-1');

  // M3.8 D-5: 25 % dan 75 % ikut lahir, di antara keduanya.
  expect(
    ambang.map((p) => p.isi.maks),
    'tepat empat ambang, 0,25 · 0,5 · 0,75 · 1, semuanya sebelum kunci_jawaban',
  ).toEqual([0.25, 0.5, 0.75, 1]);
  for (let i = 1; i < ambang.length; i += 1) {
    expect(ambang[i - 1]?.urut ?? 0).toBeLessThan(ambang[i]?.urut ?? 0);
  }
  const a50 = ambang[1];
  const a100 = ambang[3];
  expect(a100?.urut ?? 0).toBeLessThan(kunci?.urut ?? 0);
  expect(a100?.t_ms ?? 0, 't_ms ambang 100% harus lebih besar daripada 50%').toBeGreaterThan(
    a50?.t_ms ?? 0,
  );

  // Pindah layar: `gulir` tinggalkan-layar TETAP lahir seperti sebelum M3.4a.
  await lanjut(page, 'Lanjut ke soal 2');
  await tungguSoal(page, 2);
  await tungguPeristiwa(sesi, 'layar_masuk', 3);

  const semua = peristiwaSesi(sesi);
  const soal1 = pisahGulir(semua, 'soal-1');
  expect(
    soal1.tinggalkan.map((p) => p.isi.maks),
    'tepat satu gulir tinggalkan-layar untuk soal-1',
  ).toEqual([1]);
  expect(soal1.ambang.map((p) => p.isi.maks), 'ambangnya tidak lahir ulang').toEqual([
    0.25, 0.5, 0.75, 1,
  ]);

  // Dan tidak satu pun medan baru menyelinap masuk lewat jalur sungguhan.
  for (const p of semua.filter((x) => x.nama === 'gulir')) {
    expect(Object.keys(p.isi).sort()).toEqual(['layar', 'maks']);
  }

  // eslint-disable-next-line no-console
  console.log(
    `E-06h sesi=${sesi} tinggi-gulir=${String(tinggiGulir)}px langkah=${String(langkahPx)}px ` +
      `jejak=${jejak.map((p) => p.toFixed(0)).join('>')}% ` +
      `t_ms 25%=${String(ambang[0]?.t_ms)} 50%=${String(a50?.t_ms)} 75%=${String(ambang[2]?.t_ms)} ` +
      `100%=${String(a100?.t_ms)} ` +
      `kunci_jawaban=${String(kunci?.t_ms)} · gulir soal-1: ambang=${String(soal1.ambang.length)} ` +
      `tinggalkan=${String(soal1.tinggalkan.length)}`,
  );
});

/**
 * E-06i (M3.4a, D-1) — layar yang muat satu jendela: kedua ambang di detik nol.
 *
 * "100 % pada detik 0" harus terbaca sebagai *tidak perlu menggulir*, bukan
 * sebagai membaca. Itulah satu-satunya klausa D-1 yang tidak bisa diuji di
 * viewport proyek ini, dan angkanya diukur, bukan ditebak — tinggi dokumen tiap
 * layar di 360 x 640:
 *
 * ```
 * pembuka 670  soal-1 1491  soal-2 1304  soal-3 1635  pembukaan 2873  akhir 1261
 * ```
 *
 * Tidak satu pun muat; layar pertama meleset **30 px**. Jadi tes ini memakai
 * viewport 360 x 760 — ukuran Android yang biasa (dan lebih pendek daripada
 * iPhone 14 yang 390 x 844), bukan angka yang dicari-cari sampai hijau. Di
 * sana layar pertama muat sejendela dan layar lain tidak, jadi tes ini punya
 * subyek DAN pembanding sekaligus. Kalau ternyata tidak ada yang muat, ia
 * mengatakannya dan merah: hijau diam-diam atas nol subyek adalah persis
 * hiasan yang dilarang repo ini.
 */
test('E-06i layar yang muat satu jendela melahirkan keempat ambang di detik nol', async ({ page }) => {
  await page.setViewportSize({ width: 360, height: 760 });

  const kasus = bacaKasus();
  const penanda = penandaBaru();
  await buka(page, penanda);
  const sesi = await tungguSatuSesi(penanda);

  /** Diukur SEBELUM apa pun diketuk di layar itu, jadi gulirnya masih di puncak. */
  const ukur = async (): Promise<{ muat: boolean; tinggi: number; jendela: number }> =>
    page.evaluate(() => ({
      muat: document.documentElement.scrollHeight - window.innerHeight <= 0,
      tinggi: document.documentElement.scrollHeight,
      jendela: window.innerHeight,
    }));

  const ukuran: Array<[string, { muat: boolean; tinggi: number; jendela: number }]> = [];
  await tungguGulirBerhenti(page);
  ukuran.push(['pembuka', await ukur()]);

  await mulaiKasus(page);
  for (const [nomor, soal] of kasus.soal.entries()) {
    await tungguSoal(page, nomor + 1);
    await tungguGulirBerhenti(page);
    ukuran.push([`soal-${String(nomor + 1)}`, await ukur()]);
    await bilahTurunAda(page, soal.pilihan[0]?.kunci ?? 'a');
    await pilihOpsi(page, soal.jawaban);
    await kunciJawaban(page);
    await lanjut(
      page,
      nomor === kasus.soal.length - 1 ? LABEL_SESUDAHNYA : `Lanjut ke soal ${String(nomor + 2)}`,
    );
  }
  await tungguGulirBerhenti(page);
  ukuran.push(['pembukaan', await ukur()]);

  await lanjut(page, 'Lanjut: tiga pertanyaan singkat');
  await tungguGulirBerhenti(page);
  ukuran.push(['akhir', await ukur()]);

  await tungguPeristiwa(sesi, 'layar_masuk', ukuran.length);
  const semua = peristiwaSesi(sesi);

  // eslint-disable-next-line no-console
  console.log(
    `E-06i sesi=${sesi} viewport=360x760 ${ukuran
      .map(([nama, u]) => `${nama}=${String(u.tinggi)}/${String(u.jendela)}${u.muat ? '(muat)' : ''}`)
      .join(' ')}`,
  );

  const pendek = ukuran.filter(([, u]) => u.muat).map(([nama]) => nama);
  const panjang = ukuran.filter(([, u]) => !u.muat).map(([nama]) => nama);
  expect(
    pendek.length,
    `tidak ada layar yang muat satu jendela di 360x760 — tes ini tidak punya subyek`,
  ).toBeGreaterThan(0);
  expect(panjang.length, 'dan harus ada pembandingnya: layar yang TIDAK muat').toBeGreaterThan(0);

  /* --- layar yang muat: keempat ambang tepat sesudah layar_masuk (M3.8 D-5) --- */
  for (const nama of pendek) {
    const masuk = semua.find((p) => p.nama === 'layar_masuk' && p.isi.layar === nama);
    expect(masuk, `layar_masuk untuk ${nama}`).toBeDefined();
    const sesudah = semua.filter(
      (p) => p.urut > (masuk?.urut ?? 0) && p.nama === 'gulir' && p.isi.layar === nama,
    );
    expect(
      sesudah.slice(0, 4).map((p) => p.isi.maks),
      `keempat ambang ${nama} lahir segera sesudah layar_masuk`,
    ).toEqual([0.25, 0.5, 0.75, 1]);
    expect(sesudah[0]?.urut, `ambang ${nama} tepat sesudah layar_masuk`).toBe((masuk?.urut ?? 0) + 1);
    /*
     * "Detik nol", bukan "milidetik yang sama". `layar_masuk` lahir di efek
     * React yang satu dan laporan gulir pertama di efek berikutnya, jadi
     * keduanya membaca jam dua kali — selisihnya nyata tetapi kecil. Yang harus
     * terbaca peringkas adalah 0,0 detik, dan ambang setengah detik jauh lebih
     * ketat daripada itu. Selisih terukurnya ikut dicetak, jadi pergeseran
     * sekecil apa pun kelihatan tanpa membuat tes bergantung pada jam.
     */
    for (const p of sesudah.slice(0, 4)) {
      const jarak = p.t_ms - (masuk?.t_ms ?? 0);
      expect(jarak, `ambang ${nama} tidak boleh mendahului layar_masuk`).toBeGreaterThanOrEqual(0);
      expect(jarak, `ambang ${nama} lahir pada detik nol layar itu`).toBeLessThan(500);
    }
    // eslint-disable-next-line no-console
    console.log(
      `E-06i ${nama} MUAT: layar_masuk urut=${String(masuk?.urut)} t_ms=${String(masuk?.t_ms)} ` +
        `ambang=${sesudah
          .slice(0, 4)
          .map(
            (p) =>
              `${String(p.isi.maks)}@urut${String(p.urut)}/t${String(p.t_ms)}(+${String(
                p.t_ms - (masuk?.t_ms ?? 0),
              )}ms)`,
          )
          .join(' ')}`,
    );
  }

  /* --- pembanding: layar yang TIDAK muat tidak melahirkan ambang di detik nol --- */
  for (const nama of panjang) {
    const masuk = semua.find((p) => p.nama === 'layar_masuk' && p.isi.layar === nama);
    if (masuk === undefined) continue;
    const tepatSesudah = semua.find((p) => p.urut === masuk.urut + 1);
    expect(
      tepatSesudah?.nama === 'gulir' && tepatSesudah.t_ms === masuk.t_ms,
      `${nama} tidak muat sejendela, jadi tidak boleh ada ambang di detik nol`,
    ).toBe(false);
  }
});
