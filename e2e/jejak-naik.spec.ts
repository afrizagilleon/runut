import { readFileSync } from 'node:fs';
import { expect, test, type Page } from '@playwright/test';
import {
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
import { ID_KASUS, berkasKasus } from './bantu/jalur.ts';

/**
 * E-43 — satu kalimat jejak verifikasi tepat di bawah "Waktu berjalan lagi"
 * (M3.11 D-3, kritik K-9).
 *
 * Bukti kedalaman teknis terkuat (pemeriksaan otomatis, angka yang dibuang)
 * sampai M3.10 terkubur di dasar layar pembukaan, ±2.500 px di bawah judul.
 * Kalimatnya kini naik ke bawah judul, dan tautannya menggulir ke bagian
 * jejak lalu membuka lipatannya.
 *
 * Yang paling mudah salah: angka kalimat baru ditulis TETAP ("10 … 43") —
 * benar untuk DADA, bohong untuk ULTJ (35 pemeriksaan, 0 angka dibuang). Jadi
 * angkanya dibandingkan TIGA arah untuk kedua kasus: kalimat baru, bagian
 * jejak di dasar layar yang sama, dan berkas kasusnya — lalu dibuktikan bahwa
 * DADA dan ULTJ memang berbeda (kalau sama, tes ini tidak bisa menangkap angka
 * yang diketik tangan).
 */

const TAUTAN = 'Lihat pemeriksaannya';

async function sampaiPembukaan(page: Page, kasus_id: string): Promise<void> {
  const kasus = bacaKasus(kasus_id);
  await buka(page, penandaBaru(), kasus_id);
  await mulaiKasus(page);
  for (const [nomor, soal] of kasus.soal.entries()) {
    await tungguSoal(page, nomor + 1);
    await bilahTurunAda(page, soal.pilihan[0]?.kunci ?? 'a');
    await pilihOpsi(page, soal.jawaban);
    await kunciJawaban(page);
    await lanjut(page, nomor === kasus.soal.length - 1 ? LABEL_SESUDAHNYA : `Lanjut ke soal ${String(nomor + 2)}`);
  }
  await expect(page.getByRole('heading', { name: 'Waktu berjalan lagi' })).toBeVisible();
}

interface Bacaan {
  kalimat: string;
  sesudahJudul: boolean;
  sebelumLoncat: boolean;
  judulBawah: number;
  kalimatAtas: number;
  kalimatBawah: number;
  loncatAtas: number;
  garisKiri: string;
  garisKiriWarna: string;
  garisTegas: string;
  rata: string;
  huruf: string;
  jejakKalimat: string;
  jejakPintu: string;
}

async function baca(page: Page): Promise<Bacaan> {
  return await page.evaluate(() => {
    const h1 = document.querySelector('#judul-pembukaan');
    const p = h1?.nextElementSibling ?? null;
    const loncat = document.querySelector('[data-uid="loncat"]');
    const jejak = document.querySelector('.jejak');
    if (h1 === null || p === null || loncat === null || jejak === null) throw new Error('layar pembukaan tidak lengkap');
    const g = getComputedStyle(p);
    const coba = document.createElement('div');
    document.body.append(coba);
    coba.style.color = 'var(--garis-tegas)';
    const garisTegas = getComputedStyle(coba).color;
    coba.remove();
    return {
      kalimat: (p.textContent ?? '').replace(/\s+/g, ' ').trim(),
      sesudahJudul: h1.nextElementSibling === p,
      sebelumLoncat: (p.compareDocumentPosition(loncat) & Node.DOCUMENT_POSITION_FOLLOWING) !== 0,
      judulBawah: h1.getBoundingClientRect().bottom,
      kalimatAtas: p.getBoundingClientRect().top,
      kalimatBawah: p.getBoundingClientRect().bottom,
      loncatAtas: loncat.getBoundingClientRect().top,
      garisKiri: `${g.borderLeftWidth} ${g.borderLeftStyle}`,
      garisKiriWarna: g.borderLeftColor,
      garisTegas,
      rata: g.textAlign,
      huruf: `${g.fontWeight} ${g.fontSize}/${g.lineHeight}`,
      jejakKalimat: (jejak.querySelector(':scope > p')?.textContent ?? '').replace(/\s+/g, ' ').trim(),
      jejakPintu: (jejak.querySelector('summary')?.textContent ?? '').trim(),
    };
  });
}

/** Angka dari kalimat baru: n pemeriksaan, m angka dibuang (0 bila "tidak ada angka yang dibuang"). */
function angkaKalimat(kalimat: string): { n: number; m: number } {
  const cocok = /diperiksa (\d+) pemeriksaan otomatis; (?:(\d+) angka dibuang|tidak ada angka yang dibuang)\./.exec(kalimat);
  if (cocok === null) throw new Error(`kalimat jejak tidak terbaca: "${kalimat}"`);
  return { n: Number(cocok[1]), m: cocok[2] === undefined ? 0 : Number(cocok[2]) };
}

/** Angka yang sama, dibaca dari bagian Jejak verifikasi di dasar layar (istilahnya lain). */
function angkaJejak(kalimat: string, pintu: string): { n: number; nPintu: number; m: number } {
  const n = /diperiksa dengan (\d+) pemeriksaan otomatis/.exec(kalimat);
  const nPintu = /Lihat (\d+) pemeriksaan/.exec(pintu);
  const m = /dan (\d+) angka yang karena itu tidak boleh menjadi kartu/.exec(kalimat);
  const nol = /tidak satu pun membuat sebuah angka gugur|Tidak ada satu pun yang tidak cocok/.test(kalimat);
  if (n === null || nPintu === null || (m === null && !nol)) {
    throw new Error(`bagian jejak tidak terbaca: "${kalimat}" / "${pintu}"`);
  }
  return { n: Number(n[1]), nPintu: Number(nPintu[1]), m: m === null ? 0 : Number(m[1]) };
}

/**
 * Angka dari berkas kasus: aturan yang DIJALANKAN (`dijalankan === true`; yang
 * dilewati tidak dihitung — M3.11 A-1 D-9) dan fakta yang gugur (bukan
 * TERVERIFIKASI).
 */
function angkaBerkas(kasus_id: string): { n: number; m: number; terdaftar: number } {
  const isi = JSON.parse(readFileSync(berkasKasus(kasus_id), 'utf8')) as {
    pemeriksaan: { dijalankan: boolean }[];
    fakta: { status: string }[];
  };
  return {
    n: isi.pemeriksaan.filter((p) => p.dijalankan === true).length,
    m: isi.fakta.filter((f) => f.status !== 'TERVERIFIKASI').length,
    terdaftar: isi.pemeriksaan.length,
  };
}

test('E-43 kalimat jejak di bawah judul pembukaan: angkanya = bagian jejak = berkas kasus, DADA ≠ ULTJ; tautannya membuka jejak', async ({
  page,
}) => {
  const hasil = new Map<string, { n: number; m: number }>();
  for (const kasus_id of ID_KASUS) {
    await sampaiPembukaan(page, kasus_id);
    const b = await baca(page);
    const kalimat = angkaKalimat(b.kalimat);
    const jejak = angkaJejak(b.jejakKalimat, b.jejakPintu);
    const berkas = angkaBerkas(kasus_id);
    // eslint-disable-next-line no-console
    console.log(
      `E-43 [${test.info().project.name}] [${kasus_id}] "${b.kalimat}"\n` +
        `  kalimat n=${String(kalimat.n)} m=${String(kalimat.m)} · jejak n=${String(jejak.n)} pintu=${String(jejak.nPintu)} m=${String(jejak.m)} · berkas dijalankan=${String(berkas.n)} terdaftar=${String(berkas.terdaftar)} m=${String(berkas.m)}\n` +
        `  judul.bawah=${b.judulBawah.toFixed(1)} kalimat=${b.kalimatAtas.toFixed(1)}–${b.kalimatBawah.toFixed(1)} loncat.atas=${b.loncatAtas.toFixed(1)} ` +
        `garis-kiri=${b.garisKiri} ${b.garisKiriWarna} (--garis-tegas ${b.garisTegas}) rata=${b.rata} huruf=${b.huruf}`,
    );
    expect(b.sesudahJudul, 'kalimat tepat sesudah judul "Waktu berjalan lagi"').toBe(true);
    expect(b.sebelumLoncat, 'kalimat di atas "Langsung ke ringkasan"').toBe(true);
    expect(b.kalimatAtas).toBeGreaterThanOrEqual(b.judulBawah - 0.5);
    expect(b.kalimatBawah).toBeLessThanOrEqual(b.loncatAtas + 0.5);
    expect(b.kalimat, 'kalimat utuh dengan tautannya').toMatch(
      /^Sebelum jadi kartu, laporan di simulasi ini diperiksa \d+ pemeriksaan otomatis; (?:\d+ angka dibuang|tidak ada angka yang dibuang)\. Lihat pemeriksaannya ›$/,
    );
    expect(b.garisKiri, 'suara kami: garis kiri tipis').toBe('2px solid');
    expect(b.garisKiriWarna).toBe(b.garisTegas);
    expect(b.rata).toBe('left');
    expect(b.huruf).toBe('400 17px/24.65px');
    expect(kalimat, 'angka kalimat = angka bagian jejak').toEqual({ n: jejak.n, m: jejak.m });
    expect(jejak.nPintu, 'pintu lipatan jejak menyebut n yang sama').toBe(jejak.n);
    expect(kalimat, 'angka kalimat = berkas kasus (hanya yang dijalankan)').toEqual({ n: berkas.n, m: berkas.m });
    // Kasus ini memang punya aturan yang dilewati: tanpa itu, tes tidak bisa
    // membedakan "dijalankan" dari "terdaftar".
    expect(berkas.terdaftar, 'ada aturan yang dilewati di kasus ini').toBeGreaterThan(berkas.n);
    hasil.set(kasus_id, kalimat);

    // Tautannya: menggulir ke bagian jejak dan membuka lipatannya.
    const tautan = page.getByRole('button', { name: TAUTAN });
    await expect(page.locator('details[data-uid="jejak"]')).not.toHaveAttribute('open', '');
    await ketuk(tautan);
    await expect(page.locator('details[data-uid="jejak"]')).toHaveAttribute('open', '');
    await tungguGulirBerhenti(page);
    await expect
      .poll(async () => await page.evaluate(() => {
        const h2 = document.querySelector('#judul-jejak');
        if (h2 === null) return 'tidak ada';
        const k = h2.getBoundingClientRect();
        return k.top >= -0.5 && k.bottom <= window.innerHeight + 0.5 ? 'terlihat' : `top=${k.top.toFixed(1)}`;
      }), { message: 'judul Jejak verifikasi masuk layar sesudah tautan diketuk' })
      .toBe('terlihat');
  }
  const dada = hasil.get('dada-2025-10-08');
  const ultj = hasil.get('ultj-2026-05-04');
  // eslint-disable-next-line no-console
  console.log(`E-43 [${test.info().project.name}] DADA ${JSON.stringify(dada)} · ULTJ ${JSON.stringify(ultj)}`);
  expect(dada?.n, 'jumlah pemeriksaan DADA ≠ ULTJ (tes ini menangkap angka yang diketik)').not.toBe(ultj?.n);
  expect(dada?.m, 'angka dibuang DADA ≠ ULTJ').not.toBe(ultj?.m);
});
