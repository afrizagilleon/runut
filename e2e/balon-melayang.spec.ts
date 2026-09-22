import { expect, test, type Page } from '@playwright/test';
import {
  AMBANG_OPSI,
  LABEL_KEMBALI_KARTU,
  bilahTurun,
  bilahTurunAda,
  buka,
  ketuk,
  kunciJawaban,
  mulaiKasus,
  opsi,
  penandaBaru,
  pilihOpsi,
  simpanLayar,
  tungguGulirBerhenti,
  tungguMasukLayar,
  tungguSoal,
} from './bantu/main.ts';
import { ambangBalonProduk, bagiAmbangTarikProduk, intipBalonProduk } from './bantu/ambang.ts';
import { bacaKasus } from './bantu/kasus.ts';
import { tungguCocok, tungguSatuSesi } from './bantu/peristiwa.ts';

/**
 * E-19 — balon chat melayang yang bisa ditarik (M3.7).
 *
 * Temuan uji duduk 22 Sep: orang menggulir bolak-balik jauh antara pesan teman
 * dan pilihan jawaban — gulir balik ke kartu 2,5x di soal 2. Pesan itu adalah
 * hal yang sedang diverifikasi; ia tidak boleh hilang dari layar justru ketika
 * pemain menjawab. Pemilik merancang jawabannya sendiri lewat tiga putaran
 * layar contoh dan menyetujui `docs/contoh/layar-soal-v3d.html`.
 *
 * Yang diuji di sini adalah **ukuran dan akibat**, bukan keberadaan elemen:
 * berapa piksel balon mengintip, di mana tepi atasnya saat turun, apakah
 * kepingnya tertutup, dan apakah peristiwanya benar-benar sampai ke berkas
 * pengumpul yang sungguhan.
 *
 * Angka ambangnya **dibaca dari kode produk** (`bantu/ambang.ts`), tidak
 * disalin: dua angka yang berjanji sama akan berselisih diam-diam.
 *
 * Catatan alat: tarikan jari dikirim lewat `page.mouse`, bukan `touchscreen` —
 * Playwright tidak punya API geser-jari, dan `page.mouse` menghasilkan
 * `pointerdown/move/up` yang sama. Produk tidak membedakan `pointerType`, jadi
 * yang diuji tetap jalur kode yang sama dengan jari sungguhan.
 */

const AMBANG_BALON = ambangBalonProduk();
const INTIP = intipBalonProduk();
const BAGI_TARIK = bagiAmbangTarikProduk();

interface UkurBalon {
  ada: boolean;
  aktif: boolean;
  turun: boolean;
  kepingAtas: number;
  kepingBawah: number;
  kepingTinggi: number;
  wadahAtas: number;
  balonAtas: number;
  balonBawah: number;
  balonTinggi: number;
  balonKiri: number;
  balonKanan: number;
  /** Tepi teks pesan di dalam balon; dipakai memeriksa ia tidak terpotong. */
  isiAtas: number;
  isiBawah: number;
  isiLebar: number;
  isiLebarGulung: number;
  isiTeks: string;
  animasiBalon: number;
  animasiKeping: number;
  lebarJendela: number;
  tinggiJendela: number;
  /**
   * Titik di dalam keping yang ternyata ditempati salinan balon.
   *
   * Diuji dengan `elementFromPoint`, bukan dengan membandingkan kotak: yang
   * ingin dibuktikan adalah **apa yang ada di titik itu**, dan kotak yang
   * bertindih belum tentu berarti tertutup.
   */
  titikKepingDitempatiBalon: number;
  /** Titik di dalam keping yang memang ditempati kepingnya sendiri. */
  titikKepingDitempatiKeping: number;
  /** `overflow` terhitung pada wadah salinan. */
  wadahOverflow: string;
}

async function ukur(page: Page): Promise<UkurBalon> {
  return await page.evaluate(() => {
    const kosong = {
      ada: false,
      aktif: false,
      turun: false,
      kepingAtas: 0,
      kepingBawah: 0,
      kepingTinggi: 0,
      wadahAtas: 0,
      balonAtas: 0,
      balonBawah: 0,
      balonTinggi: 0,
      balonKiri: 0,
      balonKanan: 0,
      isiAtas: 0,
      isiBawah: 0,
      isiLebar: 0,
      isiLebarGulung: 0,
      isiTeks: '',
      animasiBalon: 0,
      animasiKeping: 0,
      lebarJendela: window.innerWidth,
      tinggiJendela: window.innerHeight,
      titikKepingDitempatiBalon: 0,
      titikKepingDitempatiKeping: 0,
      wadahOverflow: '',
    };
    /*
     * Kelas dipakai untuk MENGUKUR, tidak untuk menemukan sesuatu yang
     * diketuk (aturan selektor `docs/uji-e2e.md`). Yang diketuk di tes ini
     * dicari lewat `data-uid`.
     */
    const wadah = document.querySelector('.melayang');
    const balon = document.querySelector('[data-uid="balon"]');
    const isi = balon?.querySelector('.isi') ?? null;
    const keping = document.querySelector('[data-uid="keping"]');
    if (wadah === null || balon === null || isi === null || keping === null) return kosong;
    const b = balon.getBoundingClientRect();
    const k = keping.getBoundingClientRect();
    const w = wadah.getBoundingClientRect();
    const t = isi.getBoundingClientRect();

    // Tiga titik di dalam keping: dekat tepi atas, tengah, dekat tepi bawah.
    let diBalon = 0;
    let diKeping = 0;
    const x = Math.round((b.left + b.right) / 2);
    for (const bagian of [0.15, 0.5, 0.85]) {
      const y = Math.round(k.top + k.height * bagian);
      const kena = document.elementFromPoint(x, y);
      if (kena === null) continue;
      if (wadah.contains(kena)) diBalon += 1;
      if (keping.contains(kena) || kena === keping) diKeping += 1;
    }

    return {
      ...kosong,
      ada: true,
      titikKepingDitempatiBalon: diBalon,
      titikKepingDitempatiKeping: diKeping,
      wadahOverflow: getComputedStyle(wadah).overflow,
      aktif: wadah.classList.contains('melayang-aktif'),
      turun: wadah.classList.contains('melayang-turun'),
      kepingAtas: k.top,
      kepingBawah: k.bottom,
      kepingTinggi: k.height,
      wadahAtas: w.top,
      balonAtas: b.top,
      balonBawah: b.bottom,
      balonTinggi: b.height,
      balonKiri: b.left,
      balonKanan: b.right,
      isiAtas: t.top,
      isiBawah: t.bottom,
      isiLebar: isi.clientWidth,
      isiLebarGulung: isi.scrollWidth,
      isiTeks: isi.textContent ?? '',
      animasiBalon: balon.getAnimations().length,
      animasiKeping: keping.getAnimations({ subtree: true }).length,
    };
  });
}

/** Tunggu sampai gerak balon selesai — dalam satuan animasi, bukan jam. */
async function tungguBalonDiam(page: Page): Promise<void> {
  await page.evaluate(async () => {
    const balon = document.querySelector('[data-uid="balon"]');
    if (balon === null) return;
    await Promise.all(
      balon.getAnimations().map(async (gerak) => {
        try {
          await gerak.finished;
        } catch {
          /* dibatalkan: keadaannya dibaca lewat kelas, bukan lewat ini */
        }
      }),
    );
  });
}

/** Sampai di soal 1 dengan opsi terlihat, yaitu dengan salinan balon melayang. */
async function keOpsiSoal1(page: Page, penanda: string): Promise<void> {
  const kasus = bacaKasus();
  const soal = kasus.soal[0];
  if (soal === undefined) throw new Error('kasus tidak punya soal pertama');
  await buka(page, penanda);
  await mulaiKasus(page);
  await tungguSoal(page, 1);
  await bilahTurunAda(page, soal.pilihan[0]?.kunci ?? 'a');
  await ketuk(bilahTurun(page));
  await tungguMasukLayar(opsi(page, soal.pilihan[0]?.kunci ?? 'a'), AMBANG_OPSI, 'opsi terlihat');
  await tungguGulirBerhenti(page);
  await expect
    .poll(async () => (await ukur(page)).aktif, {
      message: 'salinan balon harus melayang sesudah balon aslinya lewat ke atas',
    })
    .toBe(true);
}

/**
 * Ketuk balon melayang **di tepi bawahnya**.
 *
 * Pusat balon yang sedang mengintip berada di balik keping — itu memang
 * maksudnya — jadi `tap()` tanpa posisi menolak bekerja dan melaporkan keping
 * sebagai yang menangkap ketukannya. Yang diketuk di sini adalah bagian yang
 * memang terlihat pemain.
 */
async function ketukTepiBalon(page: Page): Promise<void> {
  const sebelum = await ukur(page);
  await page
    .locator('[data-uid="balon"]')
    .tap({ position: { x: 24, y: sebelum.balonTinggi - INTIP / 2 } });
}

/** Tarik balon sejauh `geser` piksel (negatif = ke atas), lewat pointer sungguhan. */
async function tarikBalon(page: Page, geser: number): Promise<void> {
  const b = await ukur(page);
  const x = Math.round(b.balonKiri + 24);
  const mulai = Math.round(b.balonBawah - INTIP / 2);
  await page.mouse.move(x, mulai);
  await page.mouse.down();
  // Beberapa langkah, supaya `pointermove` memang terkirim lebih dari sekali.
  for (let n = 1; n <= 6; n += 1) {
    await page.mouse.move(x, Math.round(mulai + (geser * n) / 6));
  }
  await page.mouse.up();
}

/**
 * Kunci jawaban soal 1, supaya antrean peristiwa disiram.
 *
 * `balon` sengaja **tidak** termasuk PENTING (M3.7 D-2): satu `sendBeacon` per
 * goyangan jari adalah kiriman yang tidak layak menunda apa pun, jadi ia
 * menumpang kelompok berikutnya. Karena itu tes yang menunggu peristiwanya
 * harus melakukan sesuatu yang memang menyiram antrean — dan yang paling
 * wajar adalah apa yang pemain lakukan sesudah membaca pesannya: menjawab.
 */
async function siramLewatKunci(page: Page): Promise<void> {
  const kasus = bacaKasus();
  const soal = kasus.soal[0];
  if (soal === undefined) throw new Error('kasus tidak punya soal pertama');
  await pilihOpsi(page, soal.jawaban);
  await kunciJawaban(page);
}

test('E-19a salinan melayang mengintip 28 px di bawah keping, dan tidak menutupinya', async ({
  page,
}) => {
  await keOpsiSoal1(page, penandaBaru());
  await tungguBalonDiam(page);
  const b = await ukur(page);

  expect(b.ada, 'salinan balon melayang ada di layar soal').toBe(true);
  expect(b.turun, 'keadaan bawaannya mengintip, bukan turun').toBe(false);

  /*
   * Nilainya dipatok, bukan hanya dibaca — alasan yang sama dengan ambang di
   * E-19e. `INTIP` dipakai di bawah untuk menghitung di mana tepi balon
   * seharusnya berada, jadi tanpa baris ini ia akan ikut berpindah bersama
   * produknya dan penjaganya berhenti menjaga apa pun.
   */
  expect(INTIP, 'patokan v3d menulis 28 px, setinggi grip').toBe(28);

  // Tepi bawah balon = tepi bawah keping + tepi yang mengintip.
  expect(
    b.balonBawah,
    `balon.bawah ${b.balonBawah.toFixed(1)} harus = tinggi keping ${b.kepingTinggi.toFixed(1)} + ${String(INTIP)}`,
  ).toBeGreaterThan(b.kepingTinggi + INTIP - 1);
  expect(b.balonBawah).toBeLessThan(b.kepingTinggi + INTIP + 1);

  // Wadahnya mulai di bawah keping, dan badan balon memang menjulur ke atasnya —
  // kalau tidak, tidak ada yang perlu dipotong dan penjaga di bawah kosong.
  expect(
    b.wadahAtas,
    `wadah salinan mulai di bawah keping (${b.kepingBawah.toFixed(1)})`,
  ).toBeGreaterThanOrEqual(b.kepingBawah - 0.5);
  expect(b.balonAtas, 'badan balon memang menjulur ke atas tepi wadah').toBeLessThan(b.wadahAtas);

  /*
   * "Keping tidak tertutup" diuji dengan `elementFromPoint`, bukan dengan
   * membandingkan kotak: kotak yang bertindih belum tentu berarti tertutup,
   * dan yang ingin diketahui adalah apa yang benar-benar ada di titik itu.
   */
  expect(b.titikKepingDitempatiKeping, 'ketiga titik di keping memang milik keping').toBe(3);
  expect(b.titikKepingDitempatiBalon, 'dan tidak satu pun ditempati balon melayang').toBe(0);

  /*
   * Gunting kedua, dan ia sengaja diuji dari gayanya.
   *
   * Yang membuat keping tetap terbaca ada DUA: keping berlatar pekat dengan
   * `z-index` lebih tinggi, dan wadah salinan yang memotong apa pun di atas
   * tepinya. Penjaga `elementFromPoint` di atas mengikat yang pertama —
   * terbukti waktu sabotase, karena mencabut `overflow: hidden` saja tidak
   * mengubah satu pun titik di atas. Yang kedua tidak punya akibat yang bisa
   * diukur SELAMA kepingnya masih pekat dan masih di atas; ia adalah kunci
   * yang menahan ketika salah satu dari keduanya berubah suatu hari. Kunci
   * yang tidak dijaga tes adalah kunci yang akan hilang dalam satu penyuntingan.
   */
  expect(b.wadahOverflow, 'wadah salinan memotong apa pun di atas tepinya').toBe('hidden');

  await simpanLayar(page, '02b', 'balon-mengintip');

  // eslint-disable-next-line no-console
  console.log(
    `E-19a mengintip: keping.tinggi=${b.kepingTinggi.toFixed(1)} wadah.atas=${b.wadahAtas.toFixed(1)} ` +
      `balon.atas=${b.balonAtas.toFixed(1)} balon.bawah=${b.balonBawah.toFixed(1)} ` +
      `balon.tinggi=${b.balonTinggi.toFixed(1)} intip=${String(INTIP)} ` +
      `titik-keping: keping=${String(b.titikKepingDitempatiKeping)}/3 balon=${String(b.titikKepingDitempatiBalon)}/3 ` +
      `overflow=${b.wadahOverflow}`,
  );
});

test('E-19b ketukan menurunkannya utuh, teksnya tidak terpotong, dan peristiwanya sampai', async ({
  page,
}) => {
  const kasus = bacaKasus();
  const soal = kasus.soal[0];
  expect(soal).toBeDefined();
  if (soal === undefined) return;

  const penanda = penandaBaru();
  await keOpsiSoal1(page, penanda);
  const sesi = await tungguSatuSesi(penanda);

  await ketukTepiBalon(page);
  await expect
    .poll(async () => (await ukur(page)).turun, { message: 'ketukan harus menurunkan balon' })
    .toBe(true);
  await tungguBalonDiam(page);
  const b = await ukur(page);

  expect(
    b.balonAtas,
    `balon.atas ${b.balonAtas.toFixed(1)} harus = tinggi keping ${b.kepingTinggi.toFixed(1)}`,
  ).toBeGreaterThan(b.kepingTinggi - 1);
  expect(b.balonAtas).toBeLessThan(b.kepingTinggi + 1);

  /*
   * "Teks tidak dipotong, hanya tergeser" (D-1). Tiga hal sekaligus: kalimatnya
   * sama persis dengan berkas kasus, ia tidak terpotong mendatar, dan seluruh
   * badannya berada di dalam jendela — di bawah tepi wadah, di atas dasar layar.
   */
  expect(b.isiTeks.trim()).toBe(soal.pesan.isi.trim());
  expect(b.isiLebarGulung, 'tidak ada teks yang terpotong mendatar').toBeLessThanOrEqual(
    b.isiLebar + 1,
  );
  expect(b.isiAtas, 'kalimatnya mulai di bawah tepi wadah').toBeGreaterThanOrEqual(
    b.wadahAtas - 0.5,
  );
  expect(b.isiBawah, 'dan berakhir di dalam jendela').toBeLessThanOrEqual(b.tinggiJendela + 0.5);

  await simpanLayar(page, '02c', 'balon-turun');

  await siramLewatKunci(page);
  const tiba = await tungguCocok(
    sesi,
    (p) => p.nama === 'balon' && p.isi.keadaan === 'turun' && p.isi.cara === 'ketuk',
    'peristiwa balon {turun, ketuk} harus sampai ke pengumpul',
  );
  expect(tiba.length).toBeGreaterThanOrEqual(1);
  expect(Object.keys(tiba[0]?.isi ?? {}).sort()).toEqual(['cara', 'keadaan', 'layar']);
  expect(tiba[0]?.isi.layar).toBe('soal-1');

  // eslint-disable-next-line no-console
  console.log(
    `E-19b turun: keping.tinggi=${b.kepingTinggi.toFixed(1)} balon.atas=${b.balonAtas.toFixed(1)} ` +
      `balon.bawah=${b.balonBawah.toFixed(1)} isi.lebar=${String(b.isiLebar)}/${String(b.isiLebarGulung)} ` +
      `peristiwa=${String(tiba.length)}`,
  );
});

test('E-19c tarikan ke atas melewati sepertiga tinggi mengembalikannya mengintip', async ({
  page,
}) => {
  const penanda = penandaBaru();
  await keOpsiSoal1(page, penanda);
  const sesi = await tungguSatuSesi(penanda);

  await ketukTepiBalon(page);
  await expect.poll(async () => (await ukur(page)).turun).toBe(true);
  await tungguBalonDiam(page);

  const sebelum = await ukur(page);
  const ambang = sebelum.balonTinggi / BAGI_TARIK;
  // Sedikit lebih jauh dari ambang, dan jaraknya dilaporkan — bukan angka ajaib.
  await tarikBalon(page, -Math.round(ambang + 12));
  await expect
    .poll(async () => (await ukur(page)).turun, {
      message: 'tarikan melewati sepertiga tinggi harus mengembalikannya mengintip',
    })
    .toBe(false);
  await tungguBalonDiam(page);
  const sesudah = await ukur(page);
  expect(sesudah.balonBawah).toBeGreaterThan(sesudah.kepingTinggi + INTIP - 1);
  expect(sesudah.balonBawah).toBeLessThan(sesudah.kepingTinggi + INTIP + 1);

  await siramLewatKunci(page);
  const tiba = await tungguCocok(
    sesi,
    (p) => p.nama === 'balon' && p.isi.keadaan === 'intip' && p.isi.cara === 'tarik',
    'peristiwa balon {intip, tarik} harus sampai ke pengumpul',
  );
  expect(tiba.length).toBeGreaterThanOrEqual(1);

  // eslint-disable-next-line no-console
  console.log(
    `E-19c tarik: tinggi=${sebelum.balonTinggi.toFixed(1)} ambang=${ambang.toFixed(1)} ` +
      `geser=${String(-Math.round(ambang + 12))} balon.bawah=${sesudah.balonBawah.toFixed(1)} ` +
      `peristiwa=${String(tiba.length)}`,
  );
});

test('E-19d "Kembali ke dokumen" membawa ke puncak halaman dan memadamkan salinannya', async ({
  page,
}) => {
  await keOpsiSoal1(page, penandaBaru());
  await ketukTepiBalon(page);
  await expect.poll(async () => (await ukur(page)).turun).toBe(true);

  await ketuk(page.getByRole('button', { name: LABEL_KEMBALI_KARTU }));
  await tungguGulirBerhenti(page);

  const gulir = await page.evaluate(() => window.scrollY);
  expect(gulir, 'mendarat di puncak halaman, tempat balon ada di alirannya').toBeLessThanOrEqual(1);

  const b = await ukur(page);
  expect(b.aktif, 'salinannya padam').toBe(false);
  expect(b.turun, 'dan keadaannya kembali ke bawaan').toBe(false);

  // eslint-disable-next-line no-console
  console.log(`E-19d kembali: scrollY=${String(gulir)} aktif=${String(b.aktif)}`);
});

test('E-19e ambang 50 %: 60 % masih terlihat berarti belum melayang, 40 % berarti sudah', async ({
  page,
}) => {
  await buka(page, penandaBaru());
  await mulaiKasus(page);
  await tungguSoal(page, 1);

  /*
   * Posisi gulir DIHITUNG dari ukuran yang sesungguhnya, bukan dicari sampai
   * hijau: supaya `bagian` dari badan balon asli tersisa di bawah keping,
   * tepi bawahnya harus berada di `tinggiKeping + bagian x tinggi`.
   */
  const gulirKe = async (bagian: number): Promise<number> =>
    await page.evaluate((bagianDalam: number) => {
      const asli = document.querySelector('[data-uid="pesan"]');
      const keping = document.querySelector('[data-uid="keping"]');
      if (asli === null || keping === null) return -1;
      const r = asli.getBoundingClientRect();
      const tinggiKeping = keping.getBoundingClientRect().height;
      const bawahDokumen = r.bottom + window.scrollY;
      const sasaran = Math.round(bawahDokumen - tinggiKeping - bagianDalam * r.height);
      window.scrollTo({ top: sasaran, behavior: 'instant' });
      return sasaran;
    }, bagian);

  /*
   * DUA lapis penjaga, dan lapis kedua ada karena lapis pertama pernah
   * ketahuan tidak menggigit.
   *
   * Lapis pertama memakai ambang yang dibaca dari kode produk, jadi ia menjaga
   * **kesepakatan**: produk dan tes tidak boleh berselisih tentang di mana
   * batasnya. Tetapi ia ikut berpindah kalau angkanya sendiri berpindah —
   * terukur waktu sabotase: mengubah ambang menjadi 0,001 membuat tes ini
   * tetap hijau, karena ia menggeser sendiri titik gulirnya. Penjaga yang
   * bergerak bersama yang dijaganya bukan penjaga.
   *
   * Lapis kedua karena itu memakai pecahan yang TETAP, dan tidak bertanya
   * kepada produk sama sekali: 90 % badan masih terlihat berarti pesannya
   * masih terbaca di tempatnya — salinan tidak boleh menyala. 20 % tersisa
   * berarti pesannya praktis sudah hilang — salinan harus sudah ada. Ambang
   * mana pun di antara keduanya memenuhi ini; ambang 0 atau 1 tidak.
   */
  expect(
    AMBANG_BALON,
    'patokan v3d menulis setengah badan, dan itulah yang disetujui pemilik',
  ).toBe(0.5);

  const sisaBanyak = await gulirKe(0.9);
  await tungguGulirBerhenti(page);
  await expect
    .poll(async () => (await ukur(page)).aktif, {
      message: 'dengan 90 % balon asli masih terlihat, salinannya belum boleh menyala',
    })
    .toBe(false);

  const sisa60 = await gulirKe(AMBANG_BALON + 0.1);
  await tungguGulirBerhenti(page);
  await expect
    .poll(async () => (await ukur(page)).aktif, {
      message: `dengan ${String((AMBANG_BALON + 0.1) * 100)} % balon asli masih terlihat, salinannya belum melayang`,
    })
    .toBe(false);

  const sisa40 = await gulirKe(AMBANG_BALON - 0.1);
  await tungguGulirBerhenti(page);
  await expect
    .poll(async () => (await ukur(page)).aktif, {
      message: `dengan ${String((AMBANG_BALON - 0.1) * 100)} % tersisa, salinannya melayang`,
    })
    .toBe(true);

  const sisaSedikit = await gulirKe(0.2);
  await tungguGulirBerhenti(page);
  await expect
    .poll(async () => (await ukur(page)).aktif, {
      message: 'dengan 20 % tersisa, pesannya praktis sudah hilang — salinan harus sudah ada',
    })
    .toBe(true);

  // eslint-disable-next-line no-console
  console.log(
    `E-19e ambang=${String(AMBANG_BALON)} gulir-90%=${String(sisaBanyak)} gulir-60%=${String(sisa60)} ` +
      `gulir-40%=${String(sisa40)} gulir-20%=${String(sisaSedikit)}`,
  );
});

test('E-19g balon yang bergerak tidak menambah satu animasi pun di keping', async ({ page }) => {
  await keOpsiSoal1(page, penandaBaru());
  await tungguBalonDiam(page);
  const sebelum = await ukur(page);

  await ketukTepiBalon(page);
  await expect.poll(async () => (await ukur(page)).turun).toBe(true);
  const sedang = await ukur(page);
  await tungguBalonDiam(page);
  const sesudah = await ukur(page);

  expect(
    sedang.animasiBalon,
    'balonnya sendiri memang bergerak; kalau tidak, tes ini tidak menguji apa-apa',
  ).toBeGreaterThanOrEqual(1);
  expect(
    sedang.animasiKeping,
    `animasi di keping: sebelum ${String(sebelum.animasiKeping)}, saat balon bergerak ${String(sedang.animasiKeping)}`,
  ).toBeLessThanOrEqual(sebelum.animasiKeping);
  expect(sesudah.animasiKeping).toBeLessThanOrEqual(sebelum.animasiKeping);

  // eslint-disable-next-line no-console
  console.log(
    `E-19g animasi keping: sebelum=${String(sebelum.animasiKeping)} saat-bergerak=${String(sedang.animasiKeping)} ` +
      `sesudah=${String(sesudah.animasiKeping)} | animasi balon saat bergerak=${String(sedang.animasiBalon)}`,
  );
});

test.describe('dengan prefers-reduced-motion: reduce', () => {
  test.use({ reducedMotion: 'reduce' });

  test('E-19f balon berpindah keadaan tanpa satu animasi pun', async ({ page }) => {
    await keOpsiSoal1(page, penandaBaru());
    const sebelum = await ukur(page);
    expect(sebelum.animasiBalon, 'diam berarti diam').toBe(0);

    await ketukTepiBalon(page);
    await expect.poll(async () => (await ukur(page)).turun).toBe(true);
    const b = await ukur(page);

    expect(
      b.animasiBalon,
      'gerak yang diminta berhenti, berhenti — balonnya tetap berpindah keadaan',
    ).toBe(0);
    // Dan ia benar-benar sampai, bukan sekadar tidak bergerak.
    expect(b.balonAtas).toBeGreaterThan(b.kepingTinggi - 1);
    expect(b.balonAtas).toBeLessThan(b.kepingTinggi + 1);

    // eslint-disable-next-line no-console
    console.log(
      `E-19f reduced-motion: animasi=${String(b.animasiBalon)} balon.atas=${b.balonAtas.toFixed(1)}`,
    );
  });
});
