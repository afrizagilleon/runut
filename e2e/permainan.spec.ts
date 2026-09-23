import { expect, test } from '@playwright/test';
import {
  AMBANG_OPSI,
  LABEL_KASUS_LAIN,
  LABEL_LANJUT_AKHIR,
  LABEL_LONCAT,
  LABEL_MULAI,
  LABEL_SELESAI,
  LABEL_SESUDAHNYA,
  awasiGalat,
  bilahTurun,
  bilahTurunAda,
  buka,
  gagalYangBerarti,
  ketuk,
  kunciJawaban,
  lanjut,
  mulaiKasus,
  opsi,
  penandaBaru,
  pilihOpsi,
  rasioDiViewport,
  simpanLayar,
  tandaiDimainkan,
  tungguMasukLayar,
  tungguSoal,
  KASUS_BAWAAN,
} from './bantu/main.ts';
import { bacaKasus, kunciSalah } from './bantu/kasus.ts';
import { ID_KASUS } from './bantu/jalur.ts';
import { kotak } from './bantu/ukur.ts';

/**
 * E-10 — satu permainan penuh, dari layar pertama sampai pesan penutup, di
 * browser yang melukis; plus tangkapan layar D-8.
 *
 * Tes ini sengaja **tidak** membaca berkas pengumpul. Dua alasan: yang diuji di
 * sini adalah jalan yang dilalui pemain, bukan data yang lahir darinya (itu
 * E-06); dan proyek `alpha` menjalankan berkas yang sama terhadap server
 * sungguhan, tempat berkas pengumpulnya tidak boleh — dan tidak bisa — dibaca.
 *
 * Tangkapan layarnya bahan review, bukan pembanding: tidak ada
 * `toHaveScreenshot` di sini, dan tidak pernah ada tes yang merah karena satu
 * piksel bergeser.
 */
for (const kasus_id of ID_KASUS) {
/*
 * Nama anak folder tangkapan layar. Kasus bawaan menyimpan langsung di
 * `<proyek>/`, supaya nama berkas yang sudah dikenal reviewer sejak M3.3 tidak
 * bergeser; kasus lain mendapat folder sendiri (`<proyek>/ultj/`).
 */
const subfolder = kasus_id === KASUS_BAWAAN ? '' : (kasus_id.split('-')[0] ?? kasus_id);

test(`E-10 [${kasus_id}] satu permainan penuh, tanpa galat konsol, dengan tangkapan layar`, async ({
  page,
}) => {
  /*
   * Proyek `alpha` bermain melawan server sungguhan, dan tiap putaran menambah
   * satu sesi ke data pemilik. Ia memainkan kasus bawaan saja.
   */
  test.skip(
    test.info().project.name === 'alpha' && kasus_id !== KASUS_BAWAAN,
    'proyek alpha hanya memainkan kasus bawaan',
  );
  const kasus = bacaKasus(kasus_id);
  const galat = awasiGalat(page);
  /*
   * Proyek `alpha` memakai `?k=uji` seperti yang disepakati D-9: penanda itu
   * sudah dikecualikan dari ringkasan pemilik, jadi sesi reviewer tidak ikut
   * terhitung sebagai peserta.
   */
  const penanda = test.info().project.name === 'alpha' ? 'uji' : penandaBaru();

  /*
   * Semua kasus ditandai sudah dimainkan lebih dulu (M4 D-4). Yang diuji di
   * sini adalah satu permainan penuh **sampai pesan penutupnya**, dan pesan
   * itu hanya tampil ketika tidak ada lagi kasus yang belum dimainkan. Tanpa
   * penanda ini, tes ini berubah perilakunya tiap kali satu kasus ditambahkan
   * ke repo — dan "Mau coba kasus lain membuka kasus berikutnya" punya tesnya
   * sendiri (E-20e).
   */
  await tandaiDimainkan(page, ID_KASUS);
  await buka(page, penanda, kasus_id);

  /* --- layar pertama ------------------------------------------------- */
  const tombolMulai = page.getByRole('button', { name: LABEL_MULAI });
  await expect(tombolMulai).toBeVisible();
  await expect(page.getByRole('heading', { level: 1 })).toContainText('Kita mundur ke');
  /*
   * M3.5 D-1. Jumlah soalnya dibaca dari berkas kasus, bukan ditulis di tes:
   * angka yang disalin akan berselisih diam-diam begitu kasus berikutnya punya
   * empat soal, dan yang sedang dijaga justru "baris itu menyebut data".
   */
  const meta = page.locator('[data-uid="meta-pembuka"]');
  await expect(meta, 'baris meta layar pertama harus terlihat tanpa menggulir').toBeVisible();
  await expect(meta).toContainText(`${String(kasus.soal.length)} soal`);
  await expect(meta).toContainText(`sekitar ${String(kasus.pembuka.menit ?? 0)} menit`);
  await expect(meta).toContainText('tanpa akun, tanpa skor');
  await simpanLayar(page, 1, 'layar-pertama', false, subfolder);

  await mulaiKasus(page);

  /* --- soal 1: jawab SALAH ------------------------------------------- */
  const soal1 = kasus.soal[0];
  expect(soal1, 'kasus harus punya soal pertama').toBeDefined();
  if (soal1 === undefined) return;

  await tungguSoal(page, 1);
  await expect(page.getByRole('heading', { name: soal1.tanya })).toBeVisible();
  await simpanLayar(page, 2, 'soal-1-atas', false, subfolder);

  const kunciPertama = soal1.pilihan[0]?.kunci ?? 'a';
  const adaBilahTurun = await bilahTurunAda(page, kunciPertama);
  if (adaBilahTurun) {
    await ketuk(bilahTurun(page));
    // Begitu diketuk, judul pertanyaan masuk layar dan bilahnya menyingkir.
    await tungguMasukLayar(
      opsi(page, kunciPertama),
      AMBANG_OPSI,
      'opsi pertama harus terlihat sesudah "Jawab di bawah" diketuk',
    );
  }
  /*
   * D-A5a. Penjaga "halaman diam saat digambar" ada di dalam `simpanLayar`,
   * jadi ia berlaku untuk kedua belas tangkapan — bukan hanya yang ini.
   * Yang diperiksa di sini adalah isi gambarnya: keping kalender menempel di
   * puncak layar DAN keempat opsi sudah terlihat, yaitu keadaan yang memang
   * ingin ditunjukkan PNG 03.
   */
  const jalur3 = await simpanLayar(page, 3, 'sesudah-jawab-di-bawah', false, subfolder);
  const kepingSaatItu = await kotak(page, '[data-uid="keping"]');
  expect(kepingSaatItu, 'keping kalender ada di layar soal').not.toBeNull();
  expect(
    kepingSaatItu?.atas ?? -99,
    `PNG 03 (${jalur3}) harus menampilkan keping di puncak layar, ` +
      `terukur y = ${String(kepingSaatItu?.atas ?? -99)}`,
  ).toBeLessThanOrEqual(0.5);

  /* --- sumber sebuah lembar dibuka di tempat -------------------------- */
  const faktaPertama = soal1.kartu[0] ?? '';
  const kaki = page.locator(`[data-uid="kaki:${faktaPertama}"]`);
  await expect(kaki).toHaveAttribute('aria-expanded', 'false');
  await ketuk(kaki);
  await expect(kaki).toHaveAttribute('aria-expanded', 'true');
  await expect(page.getByText('Kalimat resminya').first()).toBeVisible();
  await simpanLayar(page, 4, 'sumber-terbuka', false, subfolder);

  const salah = kunciSalah(soal1);
  await pilihOpsi(page, salah);
  await kunciJawaban(page);
  await expect(page.getByText('Belum cocok dengan kartu')).toBeVisible();
  await simpanLayar(page, 5, 'soal-1-dikunci-salah', false, subfolder);

  /*
   * A2-T5: blok "Kartu yang menentukan" mendapat tangkapannya sendiri.
   *
   * Di sanalah cacat teman pemilik hidup (badan lembar menempel ke tepi kartu),
   * dan di PNG 05 blok itu bisa berada di luar layar tergantung panjang opsi —
   * gambar yang tidak memperlihatkan bagian yang sedang dijaga tidak menolong
   * reviewer maupun pemilik.
   */
  const penentu = page.locator('[data-uid="penentu"]');
  await expect(penentu, 'blok "Kartu yang menentukan" ada sesudah jawaban dikunci').toBeVisible();
  await expect(penentu.getByText('Kartu yang menentukan')).toBeVisible();
  await penentu.scrollIntoViewIfNeeded();
  await simpanLayar(page, '05b', 'kartu-penentu', false, subfolder);

  /* --- soal 2: jawab BENAR -------------------------------------------- */
  const soal2 = kasus.soal[1];
  expect(soal2, 'kasus harus punya soal kedua').toBeDefined();
  if (soal2 === undefined) return;

  await lanjut(page, 'Lanjut ke soal 2');
  await tungguSoal(page, 2);
  await expect(page.getByRole('heading', { name: soal2.tanya })).toBeVisible();
  await simpanLayar(page, 6, 'soal-2', false, subfolder);

  await bilahTurunAda(page, soal2.pilihan[0]?.kunci ?? 'a');
  await pilihOpsi(page, soal2.jawaban);
  await kunciJawaban(page);
  await expect(page.getByText('Cocok dengan kartu').first()).toBeVisible();

  /* --- soal 3: jawab BENAR -------------------------------------------- */
  const soal3 = kasus.soal[2];
  expect(soal3, 'kasus harus punya soal ketiga').toBeDefined();
  if (soal3 === undefined) return;

  await lanjut(page, 'Lanjut ke soal 3');
  await tungguSoal(page, 3);
  await expect(page.getByRole('heading', { name: soal3.tanya })).toBeVisible();
  await simpanLayar(page, 7, 'soal-3', false, subfolder);

  await bilahTurunAda(page, soal3.pilihan[0]?.kunci ?? 'a');
  await pilihOpsi(page, soal3.jawaban);
  await kunciJawaban(page);

  /* --- pembukaan ------------------------------------------------------ */
  await lanjut(page, LABEL_SESUDAHNYA);
  await expect(page.getByRole('heading', { name: 'Waktu berjalan lagi' })).toBeVisible();
  await simpanLayar(page, 8, 'pembukaan-atas', false, subfolder);
  await simpanLayar(page, 9, 'pembukaan-penuh', true, subfolder);

  const ringkasan = page.getByRole('heading', { name: 'Apa yang bisa dan tidak bisa dibaca' });
  /*
   * M3.8 T-09: prasyarat "ringkasan di luar layar" di proyek `lebar` bergantung
   * jam. Jalan pintas SENGAJA diketuk selagi sobekan kalender masih menutup
   * ruangnya (176 px) — itulah cacat F-M36-1 yang dijaga di sini, jadi tes ini
   * TIDAK boleh menunggu animasinya selesai (dicoba, dan sabotase F-M36-1
   * langsung hijau). Akibatnya, terukur di mesin ini, judul ringkasan ULTJ di
   * 1280 × 800 berada di y ≈ 813–893 selama animasi dan ≈ 717 sesudahnya: DI
   * DALAM layar begitu ruangnya tertutup. Prasyarat itu lalu gagal ±1 dari 20
   * putaran — merah karena balapan, bukan karena produk.
   *
   * Jadi di `lebar` prasyarat yang tidak berlaku dicatat sebagai anotasi,
   * bukan kegagalan; pendaratannya tetap diperiksa di bawah. Di ponsel
   * prasyaratnya tetap wajib. DADA di `lebar` (judul ≈ 974 sesudah animasi)
   * selalu memenuhinya, jadi penjaga F-M36-1 tetap utuh di sana.
   */
  const rasioSebelumLoncat = await rasioDiViewport(ringkasan);
  const prasyaratBerlaku = rasioSebelumLoncat < 0.5;
  if (!prasyaratBerlaku) {
    test.info().annotations.push({
      type: 'prasyarat',
      description: `ringkasan sudah terlihat (rasio ${rasioSebelumLoncat.toFixed(2)}) sebelum jalan pintas di ${test.info().project.name}`,
    });
  }
  expect(
    prasyaratBerlaku || test.info().project.name === 'lebar',
    'ringkasan harus berada di luar layar sebelum jalan pintas diketuk (di ponsel: selalu)',
  ).toBe(true);
  await ketuk(page.getByRole('button', { name: LABEL_LONCAT }));
  await tungguMasukLayar(
    ringkasan,
    0.9,
    '"Langsung ke ringkasan" harus menggulir judul ringkasan ke dalam layar',
  );

  /* --- layar akhir ---------------------------------------------------- */
  await lanjut(page, LABEL_LANJUT_AKHIR);
  await expect(page.getByRole('heading', { name: 'Tiga pertanyaan singkat' })).toBeVisible();
  await expect(page.getByRole('group')).toHaveCount(3);
  await expect(page.locator('textarea')).toHaveCount(1);
  await simpanLayar(page, 10, 'layar-akhir', false, subfolder);

  await lanjut(page, LABEL_SELESAI);
  await expect(page.getByRole('heading', { name: 'Terima kasih.' })).toBeVisible();
  await simpanLayar(page, 11, 'terima-kasih', false, subfolder);

  await ketuk(page.getByRole('button', { name: LABEL_KASUS_LAIN }));
  /*
   * Pesan penutupnya dibaca dari berkas kasus, bukan disalin ke dalam tes:
   * sejak M4 tiap kasus menutup dengan kalimatnya sendiri, dan tes yang
   * menuliskan kalimat DADA akan hijau atas kasus mana pun yang kebetulan
   * memakai kata yang sama.
   */
  await expect(page.getByText(kasus.penutup.kepala)).toBeVisible();
  await expect(page.getByText(kasus.penutup.isi)).toBeVisible();
  await simpanLayar(page, 12, 'kasus-lain', false, subfolder);

  expect(galat.kode(), 'tidak boleh ada galat konsol maupun pageerror sepanjang permainan').toEqual(
    [],
  );
  expect(
    gagalYangBerarti(galat.permintaanGagal()),
    'tidak boleh ada permintaan yang gagal selain ikon tab yang memang tidak disediakan',
  ).toEqual([]);
});
}
