/**
 * Pengukuran tata letak dan warna, dikerjakan **di dalam halaman**.
 *
 * Semua fungsi di sini memakai selektor kelas CSS, dan itu justru yang
 * diizinkan D-7: kelas boleh dipakai untuk *mengukur gaya*, tidak boleh dipakai
 * untuk *menemukan elemen yang akan diketuk*. Tidak ada satu pun ketukan di
 * berkas ini.
 */
import type { Page } from '@playwright/test';

export interface UkuranSentuh {
  uid: string;
  tag: string;
  teks: string;
  tinggi: number;
  lebar: number;
}

export interface BarisKontras {
  peran: string;
  contoh: number;
  warna: string;
  latar: string;
  rasio: number;
}

export interface UkuranLayar {
  gulirMendatar: { scrollWidth: number; clientWidth: number };
  kepalaTerpotong: { id: string; scrollWidth: number; clientWidth: number }[];
  sentuhKecil: UkuranSentuh[];
  jumlahInteraktif: number;
  kontras: BarisKontras[];
}

/**
 * Satu fungsi besar yang dijalankan di halaman, bukan lima panggilan bolak-balik.
 * Alasannya bukan kecepatan: kelima ukuran harus diambil dari **satu keadaan
 * halaman yang sama**, dan tiap perjalanan bolak-balik membuka peluang halaman
 * berubah di antaranya.
 */
export async function ukurLayar(page: Page): Promise<UkuranLayar> {
  return await page.evaluate(() => {
    /* --- warna: parsing dan rasio kontras WCAG ----------------------- */
    const uraiWarna = (teks: string): [number, number, number, number] | null => {
      const cocok = /rgba?\(([^)]+)\)/.exec(teks);
      if (cocok === null) return null;
      const bagian = (cocok[1] ?? '').split(/[,/]/).map((b) => Number.parseFloat(b.trim()));
      const [r, g, b, a] = bagian;
      if (r === undefined || g === undefined || b === undefined) return null;
      return [r, g, b, a ?? 1];
    };

    const timpa = (
      atas: [number, number, number, number],
      bawah: [number, number, number],
    ): [number, number, number] => {
      const a = atas[3];
      return [
        atas[0] * a + bawah[0] * (1 - a),
        atas[1] * a + bawah[1] * (1 - a),
        atas[2] * a + bawah[2] * (1 - a),
      ];
    };

    const luminansi = ([r, g, b]: [number, number, number]): number => {
      const sesuaikan = (c: number): number => {
        const v = c / 255;
        return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
      };
      return 0.2126 * sesuaikan(r) + 0.7152 * sesuaikan(g) + 0.0722 * sesuaikan(b);
    };

    const rasioKontras = (a: [number, number, number], b: [number, number, number]): number => {
      const la = luminansi(a);
      const lb = luminansi(b);
      const terang = Math.max(la, lb);
      const gelap = Math.min(la, lb);
      return (terang + 0.05) / (gelap + 0.05);
    };

    /**
     * Latar terhitung sebuah elemen: naiki leluhur, kumpulkan setiap latar yang
     * tidak sepenuhnya tembus, lalu timpakan dari yang paling bawah ke atas.
     * Latar semi-tembus tidak boleh diperlakukan seperti latar pekat.
     */
    const latarTerhitung = (el: Element): [number, number, number] => {
      const tumpukan: [number, number, number, number][] = [];
      for (let e: Element | null = el; e !== null; e = e.parentElement) {
        const w = uraiWarna(getComputedStyle(e).backgroundColor);
        if (w !== null && w[3] > 0) {
          tumpukan.push(w);
          if (w[3] >= 1) break;
        }
      }
      const akar = uraiWarna(getComputedStyle(document.documentElement).backgroundColor);
      let dasar: [number, number, number] =
        akar !== null && akar[3] >= 1 ? [akar[0], akar[1], akar[2]] : [255, 255, 255];
      for (const w of tumpukan.reverse()) dasar = timpa(w, dasar);
      return dasar;
    };

    /* --- gulir mendatar ---------------------------------------------- */
    const dokumen = document.documentElement;

    /* --- kepala lembar yang terpotong -------------------------------- */
    const kepalaTerpotong: { id: string; scrollWidth: number; clientWidth: number }[] = [];
    for (const el of document.querySelectorAll('[id^="kartu-"]')) {
      if (el.scrollWidth > el.clientWidth) {
        kepalaTerpotong.push({
          id: el.id,
          scrollWidth: el.scrollWidth,
          clientWidth: el.clientWidth,
        });
      }
    }

    /* --- bidang sentuh ------------------------------------------------ */
    const PEMILIH_INTERAKTIF =
      'a[href], button, input, select, textarea, summary, label, [role="button"], [tabindex]';
    const sentuhKecil: {
      uid: string;
      tag: string;
      teks: string;
      tinggi: number;
      lebar: number;
    }[] = [];
    let jumlahInteraktif = 0;
    for (const el of document.querySelectorAll(PEMILIH_INTERAKTIF)) {
      const gaya = getComputedStyle(el);
      if (gaya.visibility === 'hidden' || gaya.display === 'none') continue;
      if (Number(gaya.opacity) === 0) continue;
      const k = el.getBoundingClientRect();
      if (k.width <= 0 || k.height <= 0) continue;
      jumlahInteraktif += 1;
      /*
       * Bidang sentuh = kotaknya, DITAMBAH `::after` yang ditempatkan absolut
       * dan menjorok keluar (M3.10 D-3). Tautan angka tidak lagi memakai
       * bantalan sebaris 8 px (itu yang membuat celah sebelum titik dan jarak
       * baris 1,7); bidang sentuhnya kini pseudo-elemen setinggi 44,65 px.
       * Yang dihitung hanya `::after` yang benar-benar ada, absolut, dan
       * bertepi negatif — tanpa pseudo-elemen itu yang dihitung tetap kotaknya
       * sendiri, jadi mencabut `::after` membuat tes ini merah lagi. Bahwa
       * bidang itu memang MENERIMA ketukan diuji E-33b dengan
       * `elementFromPoint`, bukan di sini.
       */
      const sesudah = getComputedStyle(el, '::after');
      const lebihAtas = -parseFloat(sesudah.top);
      const lebihBawah = -parseFloat(sesudah.bottom);
      const tinggiSentuh =
        sesudah.content !== 'none' &&
        sesudah.position === 'absolute' &&
        Number.isFinite(lebihAtas) &&
        Number.isFinite(lebihBawah)
          ? k.height + Math.max(0, lebihAtas) + Math.max(0, lebihBawah)
          : k.height;
      if (tinggiSentuh < 44) {
        sentuhKecil.push({
          uid: el.closest('[data-uid]')?.getAttribute('data-uid') ?? '(tanpa uid)',
          tag: el.tagName.toLowerCase(),
          teks: (el.textContent ?? '').trim().slice(0, 40),
          tinggi: Math.round(k.height * 10) / 10,
          lebar: Math.round(k.width * 10) / 10,
        });
      }
    }

    /* --- kontras empat peran teks ------------------------------------- */
    const kontras: {
      peran: string;
      contoh: number;
      warna: string;
      latar: string;
      rasio: number;
    }[] = [];
    for (const peran of ['judul', 'isi', 'meta', 'aksi']) {
      const semua = [...document.querySelectorAll(`.${peran}`)].filter((el) => {
        const gaya = getComputedStyle(el);
        if (gaya.visibility === 'hidden' || gaya.display === 'none') return false;
        const k = el.getBoundingClientRect();
        return k.width > 0 && k.height > 0;
      });
      let terburuk: {
        peran: string;
        contoh: number;
        warna: string;
        latar: string;
        rasio: number;
      } | null = null;
      for (const el of semua) {
        const w = uraiWarna(getComputedStyle(el).color);
        if (w === null) continue;
        const latar = latarTerhitung(el);
        const depan = timpa(w, latar);
        const rasio = Math.round(rasioKontras(depan, latar) * 100) / 100;
        const baris = {
          peran,
          contoh: semua.length,
          warna: `rgb(${depan.map((c) => Math.round(c)).join(',')})`,
          latar: `rgb(${latar.map((c) => Math.round(c)).join(',')})`,
          rasio,
        };
        if (terburuk === null || rasio < terburuk.rasio) terburuk = baris;
      }
      if (terburuk !== null) kontras.push(terburuk);
    }

    return {
      gulirMendatar: { scrollWidth: dokumen.scrollWidth, clientWidth: dokumen.clientWidth },
      kepalaTerpotong,
      sentuhKecil,
      jumlahInteraktif,
      kontras,
    };
  });
}

/** Kotak sebuah elemen di viewport, atau `null` kalau tidak ada. */
export async function kotak(
  page: Page,
  pemilih: string,
): Promise<{ kiri: number; kanan: number; atas: number; bawah: number; lebar: number } | null> {
  return await page.evaluate((p: string) => {
    const el = document.querySelector(p);
    if (el === null) return null;
    const k = el.getBoundingClientRect();
    return { kiri: k.left, kanan: k.right, atas: k.top, bawah: k.bottom, lebar: k.width };
  }, pemilih);
}
