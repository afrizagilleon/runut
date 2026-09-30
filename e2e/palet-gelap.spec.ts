import { expect, test, type Page } from '@playwright/test';
import {
  LABEL_LANJUT_AKHIR,
  LABEL_SELESAI,
  LABEL_SESUDAHNYA,
  bilahTurunAda,
  buka,
  kunciJawaban,
  lanjut,
  mulaiKasus,
  penandaBaru,
  pilihOpsi,
  tungguGulirBerhenti,
  tungguSoal,
} from './bantu/main.ts';
import { bacaKasus, kunciSalah } from './bantu/kasus.ts';
import { ID_KASUS } from './bantu/jalur.ts';

/**
 * E-41 — palet gelap "kertas di meja pada malam hari" + kalender tetap kertas
 * (M3.11 D-1, kritik K-1 + K-2).
 *
 * Tiga hal yang dijaga, semuanya dari nilai TERHITUNG di Chromium, bukan dari
 * token yang dibaca di berkas CSS — urutan aturan yang keliru (baris bawaan
 * `--stempel-isi` sesudah blok gelap, atau aturan kalender gelap sebelum
 * `.kalender-halaman`) membuat tokennya benar tetapi layarnya salah:
 *
 * - E-41a: ke-28 pasangan di `.contracts/lampiran/M-0311/kontras-terhitung.txt`,
 *   masing-masing diukur dari elemen yang memang dilukis di layar itu. Ambang
 *   4,5 untuk teks, 3 untuk bidang dan tepi (WCAG 1.4.11). Terang DAN gelap.
 * - E-41b: `--kertas`/`--lembar` gelap tidak ber-hue 215–235° dengan saturasi
 *   > 30 % (biru-dongker "tema gelap bawaan").
 * - E-41c: halaman kalender di mode gelap tetap kertas terang (#E9EBEE, angka
 *   #14213D, nama hari #4A5670, pita #D7263D bertulisan putih) di KETIGA layar
 *   yang memakainya — layar pertama, sobekan pembukaan, terima kasih — sedangkan
 *   keping di layar soal tetap `--lembar` gelap.
 */

type Jenis = 'teks' | 'bidang';

/** Satu pasangan: label persis seperti di `kontras-terhitung.txt`. */
interface Pasangan {
  label: string;
  jenis: Jenis;
  /** Elemen depan. */
  pemilih: string;
  /** Sifat yang memberi warna depan. */
  sifat: 'color' | 'backgroundColor' | 'borderTopColor';
  /** Latar dihitung mulai dari elemen itu sendiri, atau dari induknya (untuk bidang/tepi lawan meja). */
  latarDari: 'diri' | 'induk';
}

const LAYAR_PERTAMA: Pasangan[] = [
  { label: 'layar pertama: judul / meja', jenis: 'teks', pemilih: '.layar-pembuka h1', sifat: 'color', latarDari: 'diri' },
  { label: 'tombol utama: tulisan / bidang', jenis: 'teks', pemilih: '.tombol-utama', sifat: 'color', latarDari: 'diri' },
  { label: 'tombol utama: bidang / meja (1.4.11)', jenis: 'bidang', pemilih: '.tombol-utama', sifat: 'backgroundColor', latarDari: 'induk' },
  { label: 'baris meta / meja', jenis: 'teks', pemilih: '.baris-meta', sifat: 'color', latarDari: 'diri' },
  { label: 'kalender: pita tulisan / merah', jenis: 'teks', pemilih: '.kalender-pita', sifat: 'color', latarDari: 'diri' },
  { label: 'kalender: angka 72 px / halaman', jenis: 'teks', pemilih: '.kalender-angka', sifat: 'color', latarDari: 'diri' },
  { label: 'kalender: nama hari / halaman', jenis: 'teks', pemilih: '.kalender-hari', sifat: 'color', latarDari: 'diri' },
  { label: 'kalender: halaman / meja', jenis: 'bidang', pemilih: '.kalender-halaman', sifat: 'backgroundColor', latarDari: 'induk' },
];

const SOAL_DIBUKA: Pasangan[] = [
  { label: 'balon: nama / balon', jenis: 'teks', pemilih: '.pesan-balon .pesan-nama', sifat: 'color', latarDari: 'diri' },
  { label: 'balon: isi / balon', jenis: 'teks', pemilih: '.pesan-balon .isi', sifat: 'color', latarDari: 'diri' },
  { label: 'keping: label / keping', jenis: 'teks', pemilih: '.kalender-keping .kalender-label', sifat: 'color', latarDari: 'diri' },
  { label: 'keping: tanggal / keping', jenis: 'teks', pemilih: '.kalender-keping .kalender-tanggal', sifat: 'color', latarDari: 'diri' },
  { label: 'balon: jam / balon', jenis: 'teks', pemilih: '.pesan-balon .pesan-jam', sifat: 'color', latarDari: 'diri' },
  { label: 'pengantar kartu (meta) / meja', jenis: 'teks', pemilih: '.meta.antar', sifat: 'color', latarDari: 'diri' },
  { label: 'kartu: kepala (meta) / lembar', jenis: 'teks', pemilih: '.lembar-badan .meta', sifat: 'color', latarDari: 'diri' },
  { label: 'kartu: isi / lembar', jenis: 'teks', pemilih: '.lembar-badan-isi', sifat: 'color', latarDari: 'diri' },
  { label: 'kartu: angka ungu / lembar', jenis: 'teks', pemilih: '.lembar-badan b, .lembar-badan strong, .angka-lembar', sifat: 'color', latarDari: 'diri' },
  { label: 'kartu: "Lihat sumbernya" / lembar', jenis: 'teks', pemilih: '.lembar-kaki', sifat: 'color', latarDari: 'diri' },
  { label: 'tombol "↓ Pilih jawaban": tulisan / bidang', jenis: 'teks', pemilih: '.tombol-turun', sifat: 'color', latarDari: 'diri' },
  { label: 'tombol "↓ Pilih jawaban": tepi / meja (1.4.11)', jenis: 'bidang', pemilih: '.tombol-turun', sifat: 'borderTopColor', latarDari: 'induk' },
  { label: 'opsi: tepi / lembar (1.4.11)', jenis: 'bidang', pemilih: '.opsi', sifat: 'borderTopColor', latarDari: 'diri' },
];

const SOAL_DIPILIH: Pasangan[] = [
  { label: 'opsi terpilih: huruf / isian bulat', jenis: 'teks', pemilih: '.opsi-dipilih .opsi-huruf', sifat: 'color', latarDari: 'diri' },
  { label: 'opsi terpilih: tepi / lembar (1.4.11)', jenis: 'bidang', pemilih: '.opsi-dipilih', sifat: 'borderTopColor', latarDari: 'diri' },
];

const SOAL_DIKUNCI: Pasangan[] = [
  { label: 'cap "belum cocok" / meja', jenis: 'teks', pemilih: '.cap-belum', sifat: 'color', latarDari: 'diri' },
  { label: 'opsi cocok: label / lembar', jenis: 'teks', pemilih: '.opsi-tanda-cocok', sifat: 'color', latarDari: 'diri' },
  { label: 'opsi keliru: "Pilihanmu" / lembar', jenis: 'teks', pemilih: '.opsi-keliru .opsi-tanda-pemain', sifat: 'color', latarDari: 'diri' },
  { label: 'teks kunci / meja', jenis: 'teks', pemilih: '.teks-kunci', sifat: 'color', latarDari: 'diri' },
  { label: 'tautan angka / meja', jenis: 'teks', pemilih: '.teks-kunci .rujukan', sifat: 'color', latarDari: 'diri' },
];

/**
 * Satu-satunya pasangan yang TIDAK diikat ambang di mode terang: halaman
 * kalender putih di atas meja #F3F5F7 (1,09:1, tidak berubah sejak M3.2 dan
 * bukan bagian keputusan ini — batasnya di terang dibawa garis tepi halaman).
 * Tabel kontras lampiran hanya menghitung mode gelap; di sana pasangan ini
 * diikat ≥ 3. Nilainya tetap diukur dan dilaporkan di terang.
 */
const TANPA_AMBANG_TERANG = new Set(['kalender: halaman / meja']);

interface HasilPasangan {
  label: string;
  jenis: Jenis;
  ada: boolean;
  depan: string;
  latar: string;
  rasio: number;
}

async function ukurPasangan(page: Page, daftar: Pasangan[]): Promise<HasilPasangan[]> {
  /*
   * Opsi berganti warna tepi dan huruf lewat transisi 140 ms. Warna yang dibaca
   * di tengah transisi adalah warna antara (terukur di iterasi pertama: huruf
   * opsi terpilih #323D56 di atas #4B3FA7), jadi semua transisi CSS ditunggu
   * selesai lebih dulu. Animasi tak berujung (denyut titik keping) bukan
   * transisi dan tidak ditunggu.
   */
  await expect
    .poll(
      async () =>
        await page.evaluate(
          () => document.getAnimations().filter((a) => a instanceof CSSTransition && a.playState !== 'finished').length,
        ),
      { message: 'transisi CSS selesai sebelum warna dibaca' },
    )
    .toBe(0);
  return await page.evaluate((pasangan: Pasangan[]) => {
    type Rgba = [number, number, number, number];
    /*
     * Warna terhitung datang dalam beberapa bentuk: `rgb()`, `color(srgb …)`
     * untuk `color-mix()`, dan `oklab()` untuk latar yang sedang/sesudah
     * bertransisi. Semuanya diurai kanvas, mesin warna peramban itu sendiri.
     */
    const kanvas = document.createElement('canvas');
    kanvas.width = 1;
    kanvas.height = 1;
    const ktx = kanvas.getContext('2d', { willReadFrequently: true });
    const urai = (teks: string): Rgba | null => {
      if (ktx === null || teks === '') return null;
      ktx.clearRect(0, 0, 1, 1);
      ktx.fillStyle = '#000';
      ktx.fillStyle = teks;
      ktx.fillRect(0, 0, 1, 1);
      const [r = 0, g = 0, b = 0, a = 0] = ktx.getImageData(0, 0, 1, 1).data;
      return [r, g, b, a / 255];
    };
    const timpa = (atas: Rgba, bawah: [number, number, number]): [number, number, number] => [
      atas[0] * atas[3] + bawah[0] * (1 - atas[3]),
      atas[1] * atas[3] + bawah[1] * (1 - atas[3]),
      atas[2] * atas[3] + bawah[2] * (1 - atas[3]),
    ];
    const lum = ([r, g, b]: [number, number, number]): number => {
      const s = (c: number): number => {
        const v = c / 255;
        return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
      };
      return 0.2126 * s(r) + 0.7152 * s(g) + 0.0722 * s(b);
    };
    const latarDari = (el: Element | null): [number, number, number] => {
      const tumpukan: Rgba[] = [];
      for (let e = el; e !== null; e = e.parentElement) {
        const w = urai(getComputedStyle(e).backgroundColor);
        if (w !== null && w[3] > 0) {
          tumpukan.push(w);
          if (w[3] >= 1) break;
        }
      }
      const akar = urai(getComputedStyle(document.body).backgroundColor);
      let dasar: [number, number, number] = akar !== null ? [akar[0], akar[1], akar[2]] : [255, 255, 255];
      for (const w of tumpukan.reverse()) dasar = timpa(w, dasar);
      return dasar;
    };
    const hex = (w: [number, number, number]): string =>
      `#${w.map((c) => Math.round(c).toString(16).padStart(2, '0')).join('')}`;
    const terlihat = (el: Element): boolean => {
      const k = el.getBoundingClientRect();
      const g = getComputedStyle(el);
      return k.width > 0 && k.height > 0 && g.display !== 'none' && g.visibility !== 'hidden';
    };
    return pasangan.map((p) => {
      const el = [...document.querySelectorAll(p.pemilih)].find(terlihat) ?? null;
      if (el === null) return { label: p.label, jenis: p.jenis, ada: false, depan: '', latar: '', rasio: 0 };
      const latar = latarDari(p.latarDari === 'diri' ? el : el.parentElement);
      const warna = urai(getComputedStyle(el)[p.sifat]);
      const depan = warna === null ? latar : timpa(warna, latar);
      const la = lum(depan);
      const lb = lum(latar);
      const rasio = (Math.max(la, lb) + 0.05) / (Math.min(la, lb) + 0.05);
      return {
        label: p.label,
        jenis: p.jenis,
        ada: true,
        depan: hex(depan),
        latar: hex(latar),
        rasio: Math.round(rasio * 100) / 100,
      };
    });
  }, daftar);
}

async function skema(page: Page): Promise<'gelap' | 'terang'> {
  return (await page.evaluate(() => matchMedia('(prefers-color-scheme: dark)').matches)) ? 'gelap' : 'terang';
}

for (const kasus_id of ID_KASUS) {
  test(`E-41a [${kasus_id}] 28 pasangan kontras dari nilai terhitung, terang dan gelap`, async ({ page }) => {
    const kasus = bacaKasus(kasus_id);
    const soal = kasus.soal[0];
    if (soal === undefined) throw new Error('kasus tanpa soal');

    await buka(page, penandaBaru(), kasus_id);
    await expect(page.getByRole('button', { name: 'Mulai simulasi' })).toBeVisible();
    const hasil: HasilPasangan[] = [];
    hasil.push(...(await ukurPasangan(page, LAYAR_PERTAMA)));

    await mulaiKasus(page);
    await tungguSoal(page, 1);
    await tungguGulirBerhenti(page);
    await expect(page.getByRole('button', { name: '↓ Pilih jawaban' })).toBeVisible();
    hasil.push(...(await ukurPasangan(page, SOAL_DIBUKA)));

    await bilahTurunAda(page, soal.pilihan[0]?.kunci ?? 'a');
    await pilihOpsi(page, kunciSalah(soal));
    await expect(page.locator('.opsi-dipilih')).toHaveCount(1);
    hasil.push(...(await ukurPasangan(page, SOAL_DIPILIH)));

    await kunciJawaban(page);
    await expect(page.locator('.cap-belum')).toBeVisible();
    await tungguGulirBerhenti(page);
    hasil.push(...(await ukurPasangan(page, SOAL_DIKUNCI)));

    const mode = await skema(page);
    const tabel = hasil
      .map(
        (h) =>
          `${h.label.padEnd(48)} ${h.depan.padEnd(8)} ${h.latar.padEnd(8)} ${h.rasio.toFixed(2).padStart(6)} ` +
          `${h.jenis === 'teks' ? '≥4.5' : '≥3'}${!h.ada ? ' TIDAK ADA' : ''}`,
      )
      .join('\n');
    // eslint-disable-next-line no-console
    console.log(`E-41a [${test.info().project.name}] [${kasus_id}] ${mode}, ${String(hasil.length)} pasangan\n${tabel}`);

    expect(hasil.length, 'jumlah pasangan = kontras-terhitung.txt').toBe(28);
    for (const h of hasil) {
      expect(h.ada, `${h.label}: elemennya dilukis di layar ini`).toBe(true);
      if (mode === 'terang' && TANPA_AMBANG_TERANG.has(h.label)) continue;
      expect(h.rasio, `${h.label}: ${h.depan} di atas ${h.latar}`).toBeGreaterThanOrEqual(h.jenis === 'teks' ? 4.5 : 3);
    }
  });
}

test('E-41b kertas dan lembar gelap tidak bernada biru-dongker (hue 215–235°, saturasi > 30 %)', async ({ page }) => {
  await buka(page, penandaBaru());
  await expect(page.getByRole('button', { name: 'Mulai simulasi' })).toBeVisible();
  const mode = await skema(page);
  const warna = await page.evaluate(() => {
    const coba = document.createElement('div');
    document.body.append(coba);
    const baca = (token: string): string => {
      coba.style.color = `var(${token})`;
      return getComputedStyle(coba).color;
    };
    const hasil = { kertas: baca('--kertas'), lembar: baca('--lembar') };
    coba.remove();
    return hasil;
  });
  const hsl = (teks: string): { h: number; s: number; l: number } => {
    const [r = 0, g = 0, b = 0] = (/rgba?\(([^)]+)\)/.exec(teks)?.[1] ?? '')
      .split(',')
      .map((x) => Number.parseFloat(x) / 255);
    const maks = Math.max(r, g, b);
    const min = Math.min(r, g, b);
    const l = (maks + min) / 2;
    const d = maks - min;
    if (d === 0) return { h: 0, s: 0, l };
    const s = d / (1 - Math.abs(2 * l - 1));
    let h = maks === r ? ((g - b) / d) % 6 : maks === g ? (b - r) / d + 2 : (r - g) / d + 4;
    h *= 60;
    if (h < 0) h += 360;
    return { h, s, l };
  };
  const kertas = hsl(warna.kertas);
  const lembar = hsl(warna.lembar);
  const lapor = `kertas=${warna.kertas} h=${kertas.h.toFixed(1)} s=${(kertas.s * 100).toFixed(1)}% · lembar=${warna.lembar} h=${lembar.h.toFixed(1)} s=${(lembar.s * 100).toFixed(1)}%`;
  // eslint-disable-next-line no-console
  console.log(`E-41b [${test.info().project.name}] ${mode}: ${lapor}`);
  if (mode !== 'gelap') return;
  for (const [nama, w] of [['--kertas', kertas], ['--lembar', lembar]] as const) {
    const biru = w.h >= 215 && w.h <= 235 && w.s > 0.3;
    expect(biru, `${nama} gelap bernada biru-dongker: ${lapor}`).toBe(false);
  }
});

interface RupaKalender {
  jumlah: number;
  halaman: string[];
  angka: string[];
  hari: string[];
  pita: string[];
  pitaTeks: string[];
}

async function rupaKalender(page: Page, lingkup: string): Promise<RupaKalender> {
  return await page.evaluate((l: string) => {
    const semua = [...document.querySelectorAll(`${l} .kalender-halaman`)];
    const ambil = (pemilih: string, sifat: 'color' | 'backgroundColor'): string[] =>
      semua.map((h) => {
        const el = pemilih === '' ? h : h.querySelector(pemilih);
        return el === null ? '(tidak ada)' : getComputedStyle(el)[sifat];
      });
    return {
      jumlah: semua.length,
      halaman: ambil('', 'backgroundColor'),
      angka: ambil('.kalender-angka', 'color'),
      hari: ambil('.kalender-hari', 'color'),
      pita: ambil('.kalender-pita', 'backgroundColor'),
      pitaTeks: ambil('.kalender-pita', 'color'),
    };
  }, lingkup);
}

/** Nilai kertas kalender (K-2) — sama di kedua mode untuk halaman kalender gelap. */
const KERTAS_KALENDER = {
  halaman: 'rgb(233, 235, 238)',
  angka: 'rgb(20, 33, 61)',
  hari: 'rgb(74, 86, 112)',
  pita: 'rgb(215, 38, 61)',
  pitaTeks: 'rgb(255, 255, 255)',
};

function periksaKertas(r: RupaKalender, layar: string, mode: 'gelap' | 'terang', lembar: string): void {
  expect(r.jumlah, `${layar}: ada halaman kalender`).toBeGreaterThan(0);
  const harap =
    mode === 'gelap'
      ? KERTAS_KALENDER
      : { ...KERTAS_KALENDER, halaman: lembar /* terang: --lembar putih, tidak berubah */ };
  for (const kunci of ['halaman', 'angka', 'hari', 'pita', 'pitaTeks'] as const) {
    expect(r[kunci], `${layar} (${mode}): ${kunci} ${JSON.stringify(r)}`).toEqual(
      Array.from({ length: r.jumlah }, () => harap[kunci]),
    );
  }
}

test('E-41c halaman kalender tetap kertas terang di layar pertama, sobekan pembukaan, dan terima kasih; keping tetap --lembar', async ({
  page,
}) => {
  const kasus = bacaKasus();
  await buka(page, penandaBaru());
  await expect(page.getByRole('button', { name: 'Mulai simulasi' })).toBeVisible();
  const mode = await skema(page);
  const lembar = await page.evaluate(() => {
    const coba = document.createElement('div');
    document.body.append(coba);
    coba.style.color = 'var(--lembar)';
    const w = getComputedStyle(coba).color;
    coba.remove();
    return w;
  });

  const pertama = await rupaKalender(page, '.layar-pembuka');
  periksaKertas(pertama, 'layar pertama', mode, lembar);

  await mulaiKasus(page);
  const keping: string[] = [];
  for (const [nomor, s] of kasus.soal.entries()) {
    await tungguSoal(page, nomor + 1);
    keping.push(
      await page.evaluate(() => {
        const k = document.querySelector('.kalender-keping');
        return k === null ? '(tidak ada)' : getComputedStyle(k).backgroundColor;
      }),
    );
    await bilahTurunAda(page, s.pilihan[0]?.kunci ?? 'a');
    await pilihOpsi(page, s.jawaban);
    await kunciJawaban(page);
    await lanjut(page, nomor === kasus.soal.length - 1 ? LABEL_SESUDAHNYA : `Lanjut ke soal ${String(nomor + 2)}`);
  }
  await expect(page.getByRole('heading', { name: 'Waktu berjalan lagi' })).toBeVisible();
  const pembukaan = await rupaKalender(page, '.layar-pembukaan');
  await expect(page.getByRole('heading', { name: 'Waktu berjalan lagi' })).toBeVisible();
  await lanjut(page, LABEL_LANJUT_AKHIR);
  await lanjut(page, LABEL_SELESAI);
  await expect(page.getByRole('heading', { name: 'Terima kasih.' })).toBeVisible();
  // M3.14 D-3: halaman bulan kalender simulasi ikut memakai .kalender-halaman tetapi tanpa angka/hari besar;
  // yang diperiksa di sini halaman 'kembali ke hari ini', halaman bulan diperiksa terpisah di bawah.
  const terima = await rupaKalender(page, '.layar-akhir [data-uid="kalender"]');
  const bulan = await page.evaluate(() =>
    [...document.querySelectorAll('.layar-akhir .kalender-bulan')].map((h) => ({
      halaman: getComputedStyle(h).backgroundColor,
      pita: getComputedStyle(h.querySelector('.kalender-pita') as Element).backgroundColor,
      tanggal: getComputedStyle(h.querySelector('.kalender-kisi td:not(.kisi-libur) span') as Element).color,
    })),
  );

  // eslint-disable-next-line no-console
  console.log(
    `E-41c [${test.info().project.name}] ${mode} lembar=${lembar}\n` +
      `  layar pertama ${JSON.stringify(pertama)}\n  pembukaan ${JSON.stringify(pembukaan)}\n` +
      `  terima kasih ${JSON.stringify(terima)}\n  keping soal 1-3 ${JSON.stringify(keping)}`,
  );
  periksaKertas(pembukaan, 'sobekan pembukaan', mode, lembar);
  periksaKertas(terima, 'terima kasih', mode, lembar);
  expect(bulan.length, 'halaman bulan kalender simulasi ada').toBeGreaterThan(0);
  for (const b of bulan) {
    expect(b.halaman, 'halaman bulan: kertas seperti halaman kalender lain').toBe(mode === 'gelap' ? KERTAS_KALENDER.halaman : lembar);
    expect(b.pita).toBe(KERTAS_KALENDER.pita);
    expect(b.tanggal, 'tanggal bulan bertinta kalender').toBe(KERTAS_KALENDER.angka);
  }
  expect(keping, 'keping di layar soal tetap --lembar').toEqual(kasus.soal.map(() => lembar));
});
