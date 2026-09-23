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
import { ID_KASUS } from './bantu/jalur.ts';

/**
 * E-33 — layar "Waktu berjalan lagi" kembali ke empat peran teks (M3.10 D-3,
 * kritik K-5 kecuali judul).
 *
 * `docs/desain.md`: empat peran teks dan tidak ada yang kelima; huruf mesin tik
 * hanya untuk keping kalender dan rincian teknis; tulisan kapital ber-spasi
 * tepat DUA (keping kalender dan cap). Layar pembukaan sampai `bcd4ac7`
 * memakai sembilan gaya: keping tanggal mesin tik kapital berbingkai (kapital
 * ketiga), judul kecil mesin tik, ringkasan jejak mesin tik tanpa panah, isi
 * rata tengah, jarak baris 1,7.
 *
 * Judul "Waktu berjalan lagi" TIDAK diubah (keputusannya menunggu pemilik) —
 * tes ini mengecualikan `h1` dari semua pemeriksaan rupa.
 *
 * Yang diukur semuanya nilai terhitung dan kotak di peramban; tinggi layar
 * dilaporkan ke log (`TINGGI-PEMBUKAAN`) untuk ledger sebelum/sesudah.
 */

async function sampaiPembukaan(page: Page, kasus_id: string): Promise<string> {
  const kasus = bacaKasus(kasus_id);
  await buka(page, penandaBaru(), kasus_id);
  await mulaiKasus(page);
  let tinggiBarisKunci = '';
  for (const [nomor, soal] of kasus.soal.entries()) {
    await tungguSoal(page, nomor + 1);
    await bilahTurunAda(page, soal.pilihan[0]?.kunci ?? 'a');
    await pilihOpsi(page, soal.jawaban);
    await kunciJawaban(page);
    if (nomor === 0) {
      const kunci = page.locator('[data-uid="teks-kunci"]');
      await expect(kunci).toBeVisible();
      tinggiBarisKunci = await kunci.evaluate((el) => getComputedStyle(el).lineHeight);
    }
    await lanjut(
      page,
      nomor === kasus.soal.length - 1 ? LABEL_SESUDAHNYA : `Lanjut ke soal ${String(nomor + 2)}`,
    );
  }
  await expect(page.getByRole('heading', { name: 'Waktu berjalan lagi' })).toBeVisible();
  // Sobekan menutup ruangnya sendiri; tinggi diukur sesudah semua animasi selesai.
  await page.evaluate(
    async () =>
      await Promise.all(
        document.getAnimations().map(async (a) => {
          try {
            await a.finished;
          } catch {
            /* dibatalkan: tidak apa */
          }
        }),
      ),
  );
  return tinggiBarisKunci;
}

interface GayaTeks {
  teks: string;
  keluarga: string;
  ukuran: string;
  berat: string;
  spasi: string;
  kapital: string;
  rata: string;
  diJudul: boolean;
}

interface Ukuran {
  tinggi: number;
  teks: GayaTeks[];
  keping: {
    jumlah: number;
    teks: string[];
    keluarga: string;
    ukuran: string;
    berat: string;
    baris: string;
    spasi: string;
    garis: string;
    bantalan: string;
    tampil: string;
    warna: string;
  };
  redup: string;
  tinta: string;
  stempel: string;
  judulBagian: Array<{ id: string; keluarga: string; ukuran: string; berat: string; baris: string }>;
  subjudul: Array<{ teks: string; keluarga: string; ukuran: string; berat: string; baris: string; spasi: string; warna: string }>;
  pintuJejak: { keluarga: string; ukuran: string; berat: string; warna: string; tinggi: number; panah: string };
  barisLi: string[];
}

async function ukurPembukaan(page: Page): Promise<Ukuran> {
  return page.evaluate(() => {
    const akar = document.querySelector('.layar-pembukaan');
    if (akar === null) throw new Error('layar pembukaan tidak ada');
    const keluarga = (f: string): string =>
      /mono/i.test(f) ? 'mesin' : /condensed|bahnschrift/i.test(f) ? 'kalender' : 'baca';

    const teks: GayaTeks[] = [];
    const jalan = document.createTreeWalker(akar, NodeFilter.SHOW_TEXT);
    for (let n = jalan.nextNode(); n !== null; n = jalan.nextNode()) {
      const isi = (n.textContent ?? '').trim();
      if (isi === '') continue;
      const el = n.parentElement;
      if (el === null) continue;
      if (el.closest('.tindakan, .kalender-sobek, [aria-hidden="true"]') !== null) continue;
      if (el.getClientRects().length === 0) continue; // di dalam lipatan tertutup
      const g = getComputedStyle(el);
      teks.push({
        teks: isi.slice(0, 30),
        keluarga: keluarga(g.fontFamily),
        ukuran: g.fontSize,
        berat: g.fontWeight,
        spasi: g.letterSpacing,
        kapital: g.textTransform,
        rata: g.textAlign,
        diJudul: el.closest('#judul-pembukaan') !== null,
      });
    }

    const coba = document.createElement('div');
    document.body.append(coba);
    const warna = (v: string): string => {
      coba.style.color = `var(${v})`;
      return getComputedStyle(coba).color;
    };
    const redup = warna('--tinta-redup');
    const tinta = warna('--tinta');
    const stempel = warna('--stempel');
    coba.remove();

    const semuaKeping = [...akar.querySelectorAll('.keping-tanggal')];
    const k0 = semuaKeping[0];
    const gk = k0 === undefined ? null : getComputedStyle(k0);

    const judulBagian = [...akar.querySelectorAll('#judul-bacaan, #judul-jejak')].map((el) => {
      const g = getComputedStyle(el);
      return {
        id: el.id,
        keluarga: keluarga(g.fontFamily),
        ukuran: g.fontSize,
        berat: g.fontWeight,
        baris: g.lineHeight,
      };
    });
    const subjudul = [...akar.querySelectorAll('.bacaan h3, .jejak h3')].map((el) => {
      const g = getComputedStyle(el);
      return {
        teks: (el.textContent ?? '').trim(),
        keluarga: keluarga(g.fontFamily),
        ukuran: g.fontSize,
        berat: g.fontWeight,
        baris: g.lineHeight,
        spasi: g.letterSpacing,
        warna: g.color,
      };
    });
    const pintu = akar.querySelector('details[data-uid="jejak"] > summary');
    if (pintu === null) throw new Error('pintu jejak tidak ada');
    const gp = getComputedStyle(pintu);
    const barisLi = [...akar.querySelectorAll('.garis-waktu > li, .bacaan li')].map(
      (el) => getComputedStyle(el).lineHeight,
    );

    return {
      tinggi: document.documentElement.scrollHeight,
      teks,
      keping: {
        jumlah: semuaKeping.length,
        teks: semuaKeping.map((el) => (el.textContent ?? '').trim()),
        keluarga: gk === null ? '' : keluarga(gk.fontFamily),
        ukuran: gk?.fontSize ?? '',
        berat: gk?.fontWeight ?? '',
        baris: gk?.lineHeight ?? '',
        spasi: gk?.letterSpacing ?? '',
        garis: gk?.borderTopWidth ?? '',
        bantalan: gk === null ? '' : `${gk.paddingTop} ${gk.paddingRight} ${gk.paddingBottom} ${gk.paddingLeft}`,
        tampil: gk?.display ?? '',
        warna: gk?.color ?? '',
      },
      redup,
      tinta,
      stempel,
      judulBagian,
      subjudul,
      pintuJejak: {
        keluarga: keluarga(gp.fontFamily),
        ukuran: gp.fontSize,
        berat: gp.fontWeight,
        warna: gp.color,
        tinggi: pintu.getBoundingClientRect().height,
        panah: getComputedStyle(pintu, '::after').content,
      },
      barisLi,
    };
  });
}

/** Tanda (family ukuran berat) yang berbeda di antara teks yang terlihat, dengan satu contoh. */
function tandaGaya(teks: GayaTeks[]): string[] {
  const contoh = new Map<string, string>();
  for (const t of teks) {
    const tanda = `${t.keluarga} ${t.ukuran} ${t.berat}`;
    if (!contoh.has(tanda)) contoh.set(tanda, t.teks);
  }
  return [...contoh.entries()].sort().map(([tanda, isi]) => `${tanda} ("${isi}")`);
}

for (const kasus_id of ID_KASUS) {
  test(`E-33 [${kasus_id}] pembukaan: empat peran teks, tanpa mesin tik, rata kiri, jarak baris 1,45`, async ({
    page,
  }) => {
    const barisKunci = await sampaiPembukaan(page, kasus_id);
    const u = await ukurPembukaan(page);
    const proyek = test.info().project.name;
    const lebar = test.info().project.use.viewport?.width ?? 0;
    const gaya = tandaGaya(u.teks);

    // eslint-disable-next-line no-console
    console.log(
      `TINGGI-PEMBUKAAN [${proyek}] [${kasus_id}] lebar=${String(lebar)} tinggi=${String(u.tinggi)}px ` +
        `(${(u.tinggi / 640).toFixed(2)} layar 640)\n` +
        `E-33 gaya teks terlihat (${String(gaya.length)}): ${gaya.join(' | ')}\n` +
        `E-33 keping: ${JSON.stringify(u.keping)}\n` +
        `E-33 judul bagian: ${JSON.stringify(u.judulBagian)}\n` +
        `E-33 subjudul: ${JSON.stringify(u.subjudul)}\n` +
        `E-33 pintu jejak: ${JSON.stringify(u.pintuJejak)}\n` +
        `E-33 jarak baris li: ${[...new Set(u.barisLi)].join(',')} · teks kunci soal 1: ${barisKunci}`,
    );

    const luarJudul = u.teks.filter((t) => !t.diJudul);

    // Mesin tik: tidak ada sama sekali di layar ini (keping kalender tidak ada di sini).
    const mesin = luarJudul.filter((t) => t.keluarga === 'mesin').map((t) => t.teks);
    expect(mesin, 'huruf mesin tik hanya untuk keping kalender dan rincian teknis').toEqual([]);
    // Tanpa spasi huruf dan tanpa kapital buatan.
    expect(
      luarJudul.filter((t) => t.spasi !== 'normal' && t.spasi !== '0px').map((t) => `${t.teks} ${t.spasi}`),
      'tulisan ber-spasi huruf',
    ).toEqual([]);
    expect(
      luarJudul.filter((t) => t.kapital !== 'none').map((t) => t.teks),
      'tulisan kapital buatan',
    ).toEqual([]);
    // Skala: sesudah judul hanya 20 (judul bagian), 17 (isi), 14 (meta/aksi).
    expect(
      luarJudul.filter((t) => !['20px', '17px', '14px'].includes(t.ukuran)).map((t) => `${t.teks} ${t.ukuran}`),
      'ukuran di luar peran',
    ).toEqual([]);
    // Semua rata kiri sesudah judul.
    expect(
      luarJudul.filter((t) => t.rata !== 'left' && t.rata !== 'start').map((t) => `${t.teks} (${t.rata})`),
      'semua rata kiri sesudah judul',
    ).toEqual([]);
    // Empat peran: judul (grotesk 28 di h1 yang tidak diubah + 20), isi (400/600), meta 14, aksi 14/500.
    expect(gaya.length, `gaya teks terlihat: ${gaya.join(' | ')}`).toBeLessThanOrEqual(6);

    // Keping tanggal garis waktu: peran meta, huruf kalimat, tanpa bingkai.
    expect(u.keping.jumlah).toBeGreaterThan(0);
    expect(u.keping.keluarga).toBe('baca');
    expect(u.keping.ukuran).toBe('14px');
    expect(u.keping.berat).toBe('400');
    expect(u.keping.baris).toBe('18.9px');
    expect(u.keping.spasi).toBe('normal');
    expect(u.keping.garis).toBe('0px');
    expect(u.keping.bantalan).toBe('0px 0px 0px 0px');
    expect(u.keping.tampil).toBe('block');
    expect(u.keping.warna).toBe(u.redup);
    for (const t of u.keping.teks) expect(t).toMatch(/^\d{1,2} [A-Z][a-z]{2} \d{4}$/);

    // Judul bagian: peran judul 600 20/1,3.
    expect(u.judulBagian).toHaveLength(2);
    for (const j of u.judulBagian) {
      expect(j, `judul bagian ${j.id}`).toEqual({
        id: j.id,
        keluarga: 'baca',
        ukuran: '20px',
        berat: '600',
        baris: '26px',
      });
    }
    // Subjudul: peran isi + tebal, 600 17/1,45, --tinta.
    expect(u.subjudul.length).toBeGreaterThan(0);
    for (const s of u.subjudul) {
      expect(s, `subjudul "${s.teks}"`).toEqual({
        teks: s.teks,
        keluarga: 'baca',
        ukuran: '17px',
        berat: '600',
        baris: '24.65px',
        spasi: 'normal',
        warna: u.tinta,
      });
    }
    // Pintu jejak: rupa kaki lembar (500 14 --stempel, >= 44 px) dengan "›".
    expect(u.pintuJejak.keluarga).toBe('baca');
    expect(u.pintuJejak.ukuran).toBe('14px');
    expect(u.pintuJejak.berat).toBe('500');
    expect(u.pintuJejak.warna).toBe(u.stempel);
    expect(u.pintuJejak.tinggi).toBeGreaterThanOrEqual(44);
    expect(u.pintuJejak.panah).toContain('›');

    // Jarak baris 1,45 (17 px -> 24,65 px) di garis waktu, bacaan, dan teks kunci.
    expect([...new Set(u.barisLi)]).toEqual(['24.65px']);
    expect(barisKunci).toBe('24.65px');

    // Panah pintu jejak berputar saat terbuka, seperti kaki lembar.
    const pintu = page.locator('details[data-uid="jejak"] > summary');
    await pintu.scrollIntoViewIfNeeded();
    await ketuk(pintu);
    await expect(page.locator('details[data-uid="jejak"]')).toHaveJSProperty('open', true);
    const sudutPanah = async (): Promise<number> =>
      await pintu.evaluate((el) => {
        const t = getComputedStyle(el, '::after').transform;
        const m = /matrix\(([^)]+)\)/.exec(t);
        if (m === null) return 0;
        const [a, b] = (m[1] ?? '').split(',').map((x) => Number.parseFloat(x));
        return Math.round((Math.atan2(b ?? 0, a ?? 1) * 180) / Math.PI);
      });
    await expect.poll(sudutPanah, { message: 'panah pintu jejak berputar 90° saat terbuka' }).toBe(90);

    // Isi lipatan yang terbuka tidak membawa gaya baru.
    const terbuka = await ukurPembukaan(page);
    const gayaTerbuka = tandaGaya(terbuka.teks);
    // eslint-disable-next-line no-console
    console.log(`E-33 gaya teks terlihat, jejak terbuka (${String(gayaTerbuka.length)}): ${gayaTerbuka.join(' | ')}`);
    expect(gayaTerbuka.length, `jejak terbuka: ${gayaTerbuka.join(' | ')}`).toBeLessThanOrEqual(6);
    expect(
      terbuka.teks.filter((t) => t.keluarga === 'mesin').map((t) => t.teks),
      'jejak terbuka: tanpa mesin tik',
    ).toEqual([]);
  });
}

/**
 * E-33b — bidang sentuh tautan angka lewat `::after`, tanpa bantalan sebaris,
 * dan tidak menutupi teks tautan lain.
 *
 * Bantalan 8 px 2 px membuat celah sebelum titik ("Rp140 .") dan memaksa jarak
 * baris 1,7. Bidang sentuhnya pindah ke `::after` (setinggi >= 44 px). Kegagalan
 * yang tidak tertangkap gate: `::after` yang lebih tinggi daripada baris akan
 * menjorok ke baris di atas dan di bawahnya — dan kalau di sana ada tautan
 * lain, ketukan pada teks tautan itu jatuh ke tautan yang salah. Diukur dengan
 * `elementFromPoint`, yaitu uji kena yang sama dengan jari.
 */
for (const kasus_id of ID_KASUS) {
  test(`E-33b [${kasus_id}] tautan: tanpa bantalan, bidang sentuh >= 44 px lewat ::after, tidak merebut tautan lain`, async ({
    page,
  }) => {
    await sampaiPembukaan(page, kasus_id);
    const hasil = await page.evaluate(() => {
      const semua = [...document.querySelectorAll<HTMLElement>('.layar-pembukaan [data-uid^="angka:"]')];
      const laporan: string[] = [];
      const langgar: string[] = [];
      let diuji = 0;
      let kenaDiLuar = 0;
      for (const el of semua) {
        el.scrollIntoView({ block: 'center', behavior: 'instant' });
        const g = getComputedStyle(el);
        const bantalan = `${g.paddingTop} ${g.paddingRight} ${g.paddingBottom} ${g.paddingLeft}`;
        if (bantalan !== '0px 0px 0px 0px') langgar.push(`${el.dataset.uid ?? ''} bantalan ${bantalan}`);
        const k = el.getBoundingClientRect();
        const ga = getComputedStyle(el, '::after');
        const atas = parseFloat(ga.top);
        const bawah = parseFloat(ga.bottom);
        const tinggiSentuh =
          ga.content !== 'none' && ga.position === 'absolute' && Number.isFinite(atas) && Number.isFinite(bawah)
            ? k.height - atas - bawah
            : k.height;
        if (tinggiSentuh < 44) langgar.push(`${el.dataset.uid ?? ''} bidang sentuh ${tinggiSentuh.toFixed(1)}px`);

        // Teks tautan ini sendiri tidak pernah direbut tautan lain.
        for (const r of el.getClientRects()) {
          for (const y of [r.top + 2, (r.top + r.bottom) / 2, r.bottom - 2]) {
            const x = (r.left + r.right) / 2;
            const kena = document.elementFromPoint(x, y)?.closest('[data-uid^="angka:"]') ?? null;
            diuji += 1;
            if (kena !== el) {
              langgar.push(
                `teks ${el.dataset.uid ?? ''} di y=${y.toFixed(1)} jatuh ke ${
                  kena instanceof HTMLElement ? (kena.dataset.uid ?? '?') : 'bukan tautan'
                }`,
              );
            }
          }
        }
        // 9 px di atas dan di bawah teksnya: masih tautan ini, kecuali di sana ada teks tautan lain.
        for (const y of [k.top - 9, k.bottom + 9]) {
          const x = (k.left + k.right) / 2;
          const teksLain = semua.some(
            (lain) =>
              lain !== el &&
              [...lain.getClientRects()].some((r) => x >= r.left && x <= r.right && y >= r.top && y <= r.bottom),
          );
          if (teksLain) continue;
          const kena = document.elementFromPoint(x, y)?.closest('[data-uid^="angka:"]') ?? null;
          if (kena === el) kenaDiLuar += 1;
          else
            langgar.push(
              `${el.dataset.uid ?? ''}: ${y < k.top ? 'atas' : 'bawah'} -9px tidak kena tautannya (kena ${
                kena instanceof HTMLElement ? (kena.dataset.uid ?? '?') : 'bukan tautan'
              })`,
            );
        }
        laporan.push(`${el.dataset.uid ?? ''} tinggi=${k.height.toFixed(1)} sentuh=${tinggiSentuh.toFixed(1)}`);
      }
      return { jumlah: semua.length, diuji, kenaDiLuar, laporan, langgar };
    });
    // eslint-disable-next-line no-console
    console.log(
      `E-33b [${test.info().project.name}] [${kasus_id}] tautan=${String(hasil.jumlah)} ` +
        `titik-teks=${String(hasil.diuji)} kena-di-luar-teks=${String(hasil.kenaDiLuar)}\n  ` +
        hasil.laporan.slice(0, 4).join('\n  '),
    );
    expect(hasil.jumlah).toBeGreaterThan(0);
    expect(hasil.kenaDiLuar, 'bidang sentuh di luar teks memang bekerja').toBeGreaterThan(0);
    expect(hasil.langgar).toEqual([]);
  });
}

/**
 * E-33c — teks tautan yang berdiri di atas bidang sentuh (E-33b) TIDAK naik ke
 * atas balon melayang.
 *
 * `.rujukan-teks` ber-`z-index: 1` supaya teks tautan menang atas `::after`
 * tautan sebelahnya. Balon melayang juga `z-index: 1` dan lebih awal di
 * dokumen; tanpa wadah paragraf yang `isolation: isolate`, teks tautan di teks
 * kunci akan terlukis — dan menerima ketukan — DI ATAS tepi balon yang
 * mengintip. Diuji dengan `elementFromPoint` di titik tengah sebuah tautan
 * yang sengaja digulir ke bawah tepi balon itu.
 */
test('E-33c teks tautan di teks kunci tidak menembus balon yang mengintip', async ({ page }) => {
  const kasus = bacaKasus('dada-2025-10-08');
  const soal = kasus.soal[0];
  if (soal === undefined) throw new Error('soal 1 tidak ada');
  await buka(page, penandaBaru(), 'dada-2025-10-08');
  await mulaiKasus(page);
  await tungguSoal(page, 1);
  await bilahTurunAda(page, soal.pilihan[0]?.kunci ?? 'a');
  await pilihOpsi(page, soal.jawaban);
  await kunciJawaban(page);
  const tautan = page.locator('[data-uid="teks-kunci"] [data-uid^="angka:"]').first();
  await expect(tautan).toBeVisible();
  // Gulir otomatis ke cap (M3.5 D-3) selesai dulu, supaya tidak menimpa gulir tes.
  await tungguGulirBerhenti(page);

  /*
   * Teks kunci soal 1 berada dekat dasar halaman, jadi halaman tidak bisa
   * digulir sejauh itu. Ruang di bawah ditambah HANYA untuk tes ini (bantalan
   * bawah `body`); susunan lapisan yang diuji tidak disentuhnya.
   */
  await page.evaluate(() => {
    document.body.style.paddingBottom = '900px';
  });
  // Gulir sehingga pusat tautan berada 14 px di bawah keping: di tengah tepi balon yang mengintip.
  const tujuan = await tautan.evaluate((el) => {
    const keping = document.querySelector('[data-uid="keping"]')?.getBoundingClientRect().bottom ?? 0;
    const k = el.getBoundingClientRect();
    return window.scrollY + (k.top + k.bottom) / 2 - (keping + 14);
  });
  await page.evaluate((y) => window.scrollTo({ top: y, behavior: 'instant' }), tujuan);
  await tungguGulirBerhenti(page);
  await expect(page.locator('.melayang-aktif')).toHaveCount(1);
  await expect(page.locator('.melayang-turun')).toHaveCount(0);

  const kena = await tautan.evaluate((el) => {
    const k = el.getBoundingClientRect();
    const x = (k.left + k.right) / 2;
    const y = (k.top + k.bottom) / 2;
    const keping = document.querySelector('[data-uid="keping"]')?.getBoundingClientRect().bottom ?? 0;
    const di = document.elementFromPoint(x, y);
    return {
      y: Math.round(y),
      keping: Math.round(keping),
      diBalon: di?.closest('.melayang-balon') !== null && di?.closest('.melayang-balon') !== undefined,
      diTautan: di?.closest('[data-uid^="angka:"]') === el,
      nama: di === null ? 'kosong' : `${di.tagName.toLowerCase()}.${di.className}`,
    };
  });
  // eslint-disable-next-line no-console
  console.log(`E-33c [${test.info().project.name}] ${JSON.stringify(kena)}`);
  expect(kena.y, 'pusat tautan berada di tepi balon yang mengintip').toBeGreaterThan(kena.keping);
  expect(kena.y).toBeLessThan(kena.keping + 28);
  expect(kena.diTautan, `ketukan di atas balon jatuh ke tautan di bawahnya (${kena.nama})`).toBe(false);
  expect(kena.diBalon, `yang kena: ${kena.nama}`).toBe(true);
});
