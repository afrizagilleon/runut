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
  tungguSoal,
} from './bantu/main.ts';
import { bacaKasus } from './bantu/kasus.ts';

/**
 * D-B2 — tidak ada teks yang menempel ke tepi bahan.
 *
 * Asal-usulnya satu pertanyaan dari teman pemilik atas tangkapan layar blok
 * "Kartu yang menentukan": *"memang mepet gini tulisannya ke pinggir?"* Badan
 * lembar ringkas memang menempel ke tepi kiri kartunya, sementara kepalanya
 * berjarak 12 px — karena lembar ringkas tidak memakai `.lembar-badan`, dan
 * bantalan lembar hanya ada di sana.
 *
 * Tes ini sengaja **umum**, bukan tentang satu blok itu. Cacat jenis ini lahir
 * dari bahan yang dipakai ulang tanpa bantalannya, dan itu bisa terjadi di
 * bahan mana pun di layar mana pun. Yang dijaga: untuk tiap elemen berbahan
 * (lembar, gelembung pesan, opsi, baris istilah, blok terbuka), **tiap kotak
 * teks di dalamnya** berjarak >= 8 px dari tepi kiri dan kanan bahan itu.
 */

/** Jarak paling dekat yang masih dianggap bukan "menempel", dalam piksel. */
const JARAK_MINIMUM = 8;

/**
 * "Bahan" dikenali dari **gayanya**, bukan dari daftar kelas.
 *
 * Versi pertama tes ini memakai daftar kelas (`.lembar`, `.pesan-balon`,
 * `.opsi`, …) dan melaporkan `bahan=0` di empat dari tiga belas layar — layar
 * pertama, pembukaan, akhir, dan terima kasih. Tes yang memeriksa nol elemen
 * tidak menjaga apa pun di sana, dan D-B2 menuntut jumlahnya > 0 di tiap layar.
 * Lebih buruk lagi: daftar kelas hanya menangkap bahan yang **sudah** terpikir,
 * sedangkan cacatnya sendiri lahir dari bahan yang dipakai ulang tanpa
 * dipikirkan.
 *
 * Jadi yang dicari sekarang: elemen yang punya latar tak-tembus sendiri **atau**
 * garis tepi yang terlihat. Itu definisi "permukaan yang berdiri sendiri" yang
 * sama dengan yang dilihat mata, dan ia menemukan bahan yang belum ada hari ini.
 */

interface Pelanggaran {
  bahan: string;
  uid: string;
  teks: string;
  kiri: number;
  kanan: number;
  lebarBahan: number;
}

interface HasilTepi {
  diperiksa: number;
  kotakTeks: number;
  pelanggaran: Pelanggaran[];
}

/**
 * Ukur tiap kotak teks di dalam tiap bahan.
 *
 * Yang diukur adalah **kotak teksnya sendiri** (`Range.getBoundingClientRect`),
 * bukan kotak elemen pembungkusnya: sebuah `<p>` bisa selebar bahannya
 * sementara barisnya sendiri menjorok ke dalam, dan sebaliknya teks bisa meluber
 * keluar dari `<p>` yang sempit.
 *
 * Teks yang terpotong leluhur ber-`overflow` dipotong juga di sini. Tanpa itu,
 * kepala yang memakai `text-overflow: ellipsis` akan dilaporkan melanggar tepi
 * kanan padahal yang terlihat pemain berhenti jauh sebelum itu.
 */
async function ukurTepi(page: Page): Promise<HasilTepi> {
  return await page.evaluate(
    ({ minimum }: { minimum: number }) => {
      const potong = (a: DOMRect, b: DOMRect): DOMRect =>
        new DOMRect(
          Math.max(a.left, b.left),
          Math.max(a.top, b.top),
          Math.max(0, Math.min(a.right, b.right) - Math.max(a.left, b.left)),
          Math.max(0, Math.min(a.bottom, b.bottom) - Math.max(a.top, b.top)),
        );

      /**
       * Ikon hiasan, bukan teks.
       *
       * Panah `›` di kaki lembar adalah `<span aria-hidden="true">` yang
       * **berputar 90 derajat** saat lipatannya terbuka. Kotak sejajar-sumbu
       * dari glif yang diputar melebar melewati kotak aslinya, jadi ia terbaca
       * "4 px dari tepi kanan" padahal yang dilihat pemain tetap di tempatnya —
       * terukur: ia hanya muncul di keadaan terbuka, tidak pernah di keadaan
       * tertutup. `aria-hidden="true"` adalah pernyataan penulisnya sendiri
       * bahwa ini bukan isi yang dibaca orang, dan itu batas yang jelas.
       */
      const hiasan = (el: Element): boolean => el.closest('[aria-hidden="true"]') !== null;

      const terlihat = (el: Element): boolean => {
        const gaya = getComputedStyle(el);
        if (gaya.display === 'none' || gaya.visibility === 'hidden') return false;
        const k = el.getBoundingClientRect();
        return k.width > 0 && k.height > 0;
      };

      const alfa = (warna: string): number => {
        const cocok = /rgba?\(([^)]+)\)/.exec(warna);
        if (cocok === null) return warna === 'transparent' ? 0 : 1;
        const bagian = (cocok[1] ?? '').split(/[,/]/).map((b) => Number.parseFloat(b.trim()));
        return bagian.length >= 4 ? (bagian[3] ?? 1) : 1;
      };

      const adaGaris = (gaya: CSSStyleDeclaration, sisi: 'left' | 'right'): boolean => {
        const lebar = Number.parseFloat(gaya.getPropertyValue(`border-${sisi}-width`));
        return (
          lebar > 0 &&
          gaya.getPropertyValue(`border-${sisi}-style`) !== 'none' &&
          alfa(gaya.getPropertyValue(`border-${sisi}-color`)) > 0.02
        );
      };

      /**
       * Permukaan yang berdiri sendiri dan memuat paragraf.
       *
       * Dua penyempitan, keduanya karena pengukuran pertama menemukan derau yang
       * bukan cacat:
       *
       * 1. **Hanya sisi yang memang bertepi yang diperiksa.** `.garis-waktu li`
       *    dan `.daftar-temuan > li` hanya punya `border-left`; sisi kanannya
       *    bukan tepi bahan sama sekali, jadi "teks 5 px dari tepi kanan" di
       *    sana tidak berarti apa-apa. Begitu juga `.tanya-akhir` yang hanya
       *    punya `border-top`.
       * 2. **Hanya bahan setingkat blok.** Keping tanggal (`inline-block`,
       *    huruf 12 px, bantalan 0 6px) terbaca 7 px di **kedua** sisi — simetris
       *    dan jelas disengaja, bukan teks yang menempel. Bantalan keping kecil
       *    adalah pilihan tipografi, bukan talang wadah. Angkanya tetap
       *    dilaporkan di ledger, tidak dihilangkan diam-diam.
       */
      const BLOK = ['block', 'flex', 'grid', 'list-item', 'table-cell', 'flow-root'];
      const adalahBahan = (el: Element): boolean => {
        const gaya = getComputedStyle(el);
        if (!BLOK.includes(gaya.display)) return false;
        if (alfa(gaya.backgroundColor) > 0.02) return true;
        return adaGaris(gaya, 'left') || adaGaris(gaya, 'right');
      };

      /** Sisi mana saja yang benar-benar tepi bahan. */
      const sisiBertepi = (el: Element): { kiri: boolean; kanan: boolean } => {
        const gaya = getComputedStyle(el);
        const berlatar = alfa(gaya.backgroundColor) > 0.02;
        return {
          kiri: berlatar || adaGaris(gaya, 'left'),
          kanan: berlatar || adaGaris(gaya, 'right'),
        };
      };

      const pelanggaran: {
        bahan: string;
        uid: string;
        teks: string;
        kiri: number;
        kanan: number;
        lebarBahan: number;
      }[] = [];
      let diperiksa = 0;
      let kotakTeks = 0;

      /*
       * `html` dan `body` dilewati: keduanya memang berlatar, tetapi keduanya
       * adalah halamannya sendiri, bukan sebuah permukaan di atas halaman.
       * Jarak teks ke tepi jendela dijaga E-12a dan bantalan kolom, bukan di sini.
       */
      for (const bahan of document.querySelectorAll('body *')) {
        if (!adalahBahan(bahan)) continue;
        if (!terlihat(bahan)) continue;
        {
          const satu = `${bahan.tagName.toLowerCase()}${
            bahan.className === '' ? '' : `.${String(bahan.className).split(' ')[0] ?? ''}`
          }`;
          diperiksa += 1;
          const kotakBahan = bahan.getBoundingClientRect();
          const sisi = sisiBertepi(bahan);

          const jalan = document.createTreeWalker(bahan, NodeFilter.SHOW_TEXT);
          for (let simpul = jalan.nextNode(); simpul !== null; simpul = jalan.nextNode()) {
            const isi = (simpul.textContent ?? '').trim();
            if (isi === '') continue;
            const induk = simpul.parentElement;
            if (induk === null || !terlihat(induk)) continue;
            if (hiasan(induk)) continue;

            const rentang = document.createRange();
            rentang.selectNodeContents(simpul);
            let kotak = rentang.getBoundingClientRect();
            // Potong oleh tiap leluhur yang mengkliping, sampai bahannya.
            for (let e: Element | null = induk; e !== null; e = e.parentElement) {
              const gaya = getComputedStyle(e);
              if (gaya.overflowX !== 'visible' || gaya.overflowY !== 'visible') {
                kotak = potong(kotak, e.getBoundingClientRect());
              }
              if (e === bahan) break;
            }
            if (kotak.width <= 0 || kotak.height <= 0) continue;
            kotakTeks += 1;

            const kiri = kotak.left - kotakBahan.left;
            const kanan = kotakBahan.right - kotak.right;
            if ((sisi.kiri && kiri < minimum) || (sisi.kanan && kanan < minimum)) {
              pelanggaran.push({
                bahan: satu,
                uid: bahan.closest('[data-uid]')?.getAttribute('data-uid') ?? '(tanpa uid)',
                teks: isi.slice(0, 48),
                kiri: Math.round(kiri * 10) / 10,
                kanan: Math.round(kanan * 10) / 10,
                lebarBahan: Math.round(kotakBahan.width),
              });
            }
          }
        }
      }
      return { diperiksa, kotakTeks, pelanggaran };
    },
    { minimum: JARAK_MINIMUM },
  );
}

function laporkan(nama: string, hasil: HasilTepi): string {
  const kepala =
    `${nama}: bahan=${String(hasil.diperiksa)} kotak-teks=${String(hasil.kotakTeks)} ` +
    `melanggar=${String(hasil.pelanggaran.length)}`;
  if (hasil.pelanggaran.length === 0) return kepala;
  return (
    kepala +
    '\n' +
    hasil.pelanggaran
      .map(
        (p) =>
          `    ${p.bahan} uid=${p.uid} lebar=${String(p.lebarBahan)}px ` +
          `kiri=${String(p.kiri)}px kanan=${String(p.kanan)}px "${p.teks}"`,
      )
      .join('\n')
  );
}

test('D-B2 tidak ada teks yang menempel ke tepi bahan, di tiap layar', async ({ page }) => {
  const kasus = bacaKasus();
  await buka(page, penandaBaru());

  const laporan: string[] = [];
  const semuaPelanggaran: string[] = [];

  const periksa = async (nama: string): Promise<void> => {
    const hasil = await ukurTepi(page);
    laporan.push(laporkan(nama, hasil));
    for (const p of hasil.pelanggaran) {
      semuaPelanggaran.push(
        `${nama} · ${p.bahan} uid=${p.uid} kiri=${String(p.kiri)}px kanan=${String(p.kanan)}px "${p.teks}"`,
      );
    }
  };

  await periksa('layar-pertama');
  await mulaiKasus(page);

  for (const [nomor, soal] of kasus.soal.entries()) {
    await tungguSoal(page, nomor + 1);
    await periksa(`soal-${String(nomor + 1)}-sebelum-dikunci`);

    // Blok terbuka ikut diperiksa: ia bahan juga, dan bantalannya sendiri.
    await ketuk(page.locator(`[data-uid="kaki:${soal.kartu[0] ?? ''}"]`));
    await periksa(`soal-${String(nomor + 1)}-sumber-terbuka`);
    await ketuk(page.locator(`[data-uid="kaki:${soal.kartu[0] ?? ''}"]`));

    await bilahTurunAda(page, soal.pilihan[0]?.kunci ?? 'a');
    await pilihOpsi(page, soal.jawaban);
    await kunciJawaban(page);
    // Di sinilah blok "Kartu yang menentukan" muncul — cacat teman pemilik.
    await periksa(`soal-${String(nomor + 1)}-sesudah-dikunci`);

    await lanjut(
      page,
      nomor === kasus.soal.length - 1 ? LABEL_SESUDAHNYA : `Lanjut ke soal ${String(nomor + 2)}`,
    );
  }

  await expect(page.getByRole('heading', { name: 'Waktu berjalan lagi' })).toBeVisible();
  await periksa('pembukaan');

  await lanjut(page, 'Lanjut: tiga pertanyaan singkat');
  await periksa('akhir');
  await lanjut(page, LABEL_SELESAI);
  await periksa('terima-kasih');

  // eslint-disable-next-line no-console
  console.log(`D-B2 [${test.info().project.name}] tepi bahan per layar:\n  ${laporan.join('\n  ')}`);

  const totalBahan = laporan.length;
  expect(totalBahan, 'tiap layar diperiksa').toBeGreaterThan(0);
  expect(
    semuaPelanggaran,
    `teks menempel ke tepi bahan di ${String(semuaPelanggaran.length)} tempat:\n` +
      semuaPelanggaran.map((p) => `  ${p}`).join('\n'),
  ).toEqual([]);
});
