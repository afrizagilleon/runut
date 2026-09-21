import { expect, test, type Page } from '@playwright/test';
import {
  AMBANG_OPSI,
  LABEL_KEMBALI_KARTU,
  LABEL_SELESAI,
  LABEL_SESUDAHNYA,
  bilahTurun,
  bilahTurunAda,
  buka,
  ketuk,
  kunciJawaban,
  lanjut,
  mulaiKasus,
  opsi,
  penandaBaru,
  pilihOpsi,
  rasioDiViewport,
  tungguGulirBerhenti,
  tungguMasukLayar,
  tungguSoal,
} from './bantu/main.ts';
import { bacaKasus } from './bantu/kasus.ts';
import { kotak, ukurLayar, type BarisKontras, type UkuranSentuh } from './bantu/ukur.ts';

/**
 * E-12 (a, b, c, e, f) — tata letak yang diukur, bukan dinilai.
 *
 * Tidak ada satu pun kalimat tentang "rapi" atau "enak dilihat" di sini: yang
 * ditulis hanya angka. Empat di antaranya adalah cacat yang pernah sampai ke
 * pemilik atau ke review — gulir mendatar, kepala lembar terpotong, keping yang
 * menutupi kalimat pengantar sesudah "Kembali ke dokumen", dan bidang sentuh
 * yang terlalu pendek.
 */

interface Laporan {
  layar: string;
  gulir: string;
  interaktif: number;
  sentuhKecil: UkuranSentuh[];
  kontras: BarisKontras[];
}

async function periksaLayar(page: Page, nama: string, kumpul: Laporan[]): Promise<void> {
  const u = await ukurLayar(page);

  /* --- (a) tidak ada gulir mendatar --------------------------------- */
  expect(
    u.gulirMendatar.scrollWidth,
    `layar "${nama}": dokumen tidak boleh bisa digulir mendatar ` +
      `(scrollWidth ${String(u.gulirMendatar.scrollWidth)} > clientWidth ${String(u.gulirMendatar.clientWidth)})`,
  ).toBeLessThanOrEqual(u.gulirMendatar.clientWidth);

  /* --- (b) kepala lembar tidak terpotong ----------------------------- */
  expect(
    u.kepalaTerpotong,
    `layar "${nama}": kepala lembar tidak boleh terpotong`,
  ).toEqual([]);

  kumpul.push({
    layar: nama,
    gulir: `${String(u.gulirMendatar.scrollWidth)}/${String(u.gulirMendatar.clientWidth)}`,
    interaktif: u.jumlahInteraktif,
    sentuhKecil: u.sentuhKecil,
    kontras: u.kontras,
  });
}

test('E-12 a/b/e/f tata letak terukur di tiap layar, dan kontras empat peran teks', async ({
  page,
}) => {
  const kasus = bacaKasus();
  const kumpul: Laporan[] = [];
  const skema = test.info().project.use.colorScheme ?? 'light';

  await buka(page, penandaBaru());
  await periksaLayar(page, 'layar-pertama', kumpul);

  await mulaiKasus(page);
  for (const [nomor, soal] of kasus.soal.entries()) {
    await tungguSoal(page, nomor + 1);
    await periksaLayar(page, `soal-${String(nomor + 1)}`, kumpul);

    // Lembar dibuka juga: panel sumber punya baris `<code>` panjang yang paling
    // mungkin memaksa halaman melebar.
    await ketuk(page.locator(`[data-uid="kaki:${soal.kartu[0] ?? ''}"]`));
    await periksaLayar(page, `soal-${String(nomor + 1)}-sumber-terbuka`, kumpul);
    await ketuk(page.locator(`[data-uid="kaki:${soal.kartu[0] ?? ''}"]`));

    await bilahTurunAda(page, soal.pilihan[0]?.kunci ?? 'a');
    await pilihOpsi(page, soal.jawaban);
    await kunciJawaban(page);
    await periksaLayar(page, `soal-${String(nomor + 1)}-dikunci`, kumpul);

    await lanjut(
      page,
      nomor === kasus.soal.length - 1 ? LABEL_SESUDAHNYA : `Lanjut ke soal ${String(nomor + 2)}`,
    );
  }

  await expect(page.getByRole('heading', { name: 'Waktu berjalan lagi' })).toBeVisible();
  await periksaLayar(page, 'pembukaan', kumpul);

  await lanjut(page, 'Lanjut: tiga pertanyaan singkat');
  await periksaLayar(page, 'akhir', kumpul);
  await lanjut(page, LABEL_SELESAI);
  await periksaLayar(page, 'terima-kasih', kumpul);

  /* --- (e) bidang sentuh, dilaporkan lalu diperiksa ------------------ */
  const semuaKecil = kumpul.flatMap((l) => l.sentuhKecil.map((s) => ({ layar: l.layar, ...s })));
  const ringkasKecil = [
    ...new Map(semuaKecil.map((s) => [`${s.uid}|${s.tag}|${String(s.tinggi)}`, s])).values(),
  ];

  /* --- (f) kontras, dilaporkan lalu diperiksa ------------------------ */
  const kontrasTerburuk = new Map<string, BarisKontras & { layar: string }>();
  for (const l of kumpul) {
    for (const k of l.kontras) {
      const lama = kontrasTerburuk.get(k.peran);
      if (lama === undefined || k.rasio < lama.rasio) {
        kontrasTerburuk.set(k.peran, { ...k, layar: l.layar });
      }
    }
  }

  // eslint-disable-next-line no-console
  console.log(
    `E-12 [${skema}] per layar (scrollWidth/clientWidth, jumlah kontrol interaktif):\n` +
      kumpul
        .map((l) => `  ${l.layar}: gulir=${l.gulir} interaktif=${String(l.interaktif)}`)
        .join('\n') +
      `\nE-12e [${skema}] kontrol interaktif dengan tinggi < 44 px: ${String(ringkasKecil.length)}\n` +
      (ringkasKecil.length === 0
        ? '  (tidak ada)\n'
        : ringkasKecil
            .map(
              (s) =>
                `  ${s.layar} ${s.tag} uid=${s.uid} ${String(s.lebar)}x${String(s.tinggi)}px "${s.teks}"`,
            )
            .join('\n') + '\n') +
      `E-12f [${skema}] kontras terburuk per peran teks:\n` +
      [...kontrasTerburuk.values()]
        .map(
          (k) =>
            `  ${k.peran.padEnd(6)} ${String(k.rasio).padStart(6)}:1  teks ${k.warna} atas latar ${k.latar}  (terburuk di ${k.layar})`,
        )
        .join('\n'),
  );

  expect(
    ringkasKecil.map((s) => `${s.layar} ${s.tag} ${s.uid} ${String(s.lebar)}x${String(s.tinggi)}`),
    'setiap kontrol interaktif yang terlihat harus setinggi >= 44 px',
  ).toEqual([]);

  expect(
    [...kontrasTerburuk.keys()].sort(),
    'keempat peran teks harus ditemukan di suatu layar',
  ).toEqual(['aksi', 'isi', 'judul', 'meta']);
  for (const k of kontrasTerburuk.values()) {
    expect(
      k.rasio,
      `kontras peran "${k.peran}" (${k.warna} atas ${k.latar}, terburuk di layar ${k.layar})`,
    ).toBeGreaterThanOrEqual(4.5);
  }
});

test('E-12c sesudah "Kembali ke dokumen", keping tidak menutupi kalimat pengantar', async ({
  page,
}) => {
  const kasus = bacaKasus();
  const soal = kasus.soal[0];
  expect(soal).toBeDefined();
  if (soal === undefined) return;

  await buka(page, penandaBaru());
  await mulaiKasus(page);
  await tungguSoal(page, 1);

  // Turun dulu ke opsi, supaya "Kembali ke dokumen" memang punya kerja.
  await bilahTurunAda(page, soal.pilihan[0]?.kunci ?? 'a');
  await ketuk(bilahTurun(page));
  await tungguMasukLayar(opsi(page, soal.pilihan[0]?.kunci ?? 'a'), AMBANG_OPSI, 'opsi terlihat');

  await ketuk(page.getByRole('button', { name: LABEL_KEMBALI_KARTU }));
  await tungguGulirBerhenti(page);

  const keping = await kotak(page, '[data-uid="keping"]');
  const antar = await kotak(page, '[data-uid="antar"]');
  expect(keping, 'keping kalender ada di layar soal').not.toBeNull();
  expect(antar, 'kalimat pengantar ada di layar soal').not.toBeNull();
  if (keping === null || antar === null) return;

  expect(
    antar.atas,
    `tepi atas kalimat pengantar (${antar.atas.toFixed(1)}px) harus >= tepi bawah keping (${keping.bawah.toFixed(1)}px)`,
  ).toBeGreaterThanOrEqual(keping.bawah - 0.5);

  // eslint-disable-next-line no-console
  console.log(
    `E-12c keping.bawah=${keping.bawah.toFixed(1)}px kalimat-pengantar.atas=${antar.atas.toFixed(1)}px ` +
      `jarak=${(antar.atas - keping.bawah).toFixed(1)}px`,
  );
});

test('OQ-5 berapa opsi terlihat utuh sesudah "Jawab di bawah", per soal', async ({ page }) => {
  const kasus = bacaKasus();
  await buka(page, penandaBaru());
  await mulaiKasus(page);

  const laporan: string[] = [];
  for (const [nomor, soal] of kasus.soal.entries()) {
    await tungguSoal(page, nomor + 1);
    const kunciPertama = soal.pilihan[0]?.kunci ?? 'a';
    const adaTurun = await bilahTurunAda(page, kunciPertama);
    if (adaTurun) {
      await ketuk(bilahTurun(page));
      await tungguMasukLayar(opsi(page, kunciPertama), AMBANG_OPSI, 'opsi pertama terlihat');
      await tungguGulirBerhenti(page);
    }

    const rasio: number[] = [];
    for (const p of soal.pilihan) rasio.push(await rasioDiViewport(opsi(page, p.kunci)));
    const utuh = rasio.filter((r) => r >= 0.999).length;
    const sebagian = rasio.filter((r) => r > 0 && r < 0.999).length;

    laporan.push(
      `soal-${String(nomor + 1)}: dari ${String(soal.pilihan.length)} opsi -> utuh ${String(utuh)}, ` +
        `sebagian ${String(sebagian)}, tak terlihat ${String(rasio.filter((r) => r === 0).length)} ` +
        `[${rasio.map((r) => r.toFixed(2)).join(' ')}]`,
    );

    expect(utuh, `soal ${String(nomor + 1)}: setidaknya satu opsi terlihat utuh`).toBeGreaterThan(0);

    await pilihOpsi(page, soal.jawaban);
    await kunciJawaban(page);
    await lanjut(
      page,
      nomor === kasus.soal.length - 1 ? LABEL_SESUDAHNYA : `Lanjut ke soal ${String(nomor + 2)}`,
    );
  }

  // eslint-disable-next-line no-console
  console.log(`OQ-5 di ${String(test.info().project.use.viewport?.width)} px:\n  ${laporan.join('\n  ')}`);
});
