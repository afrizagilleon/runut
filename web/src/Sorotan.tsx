/**
 * Lapisan sorotan pemandu (M3.16 D-1–D-3).
 *
 * Satu bidang redup setinggi dokumen, dilubangi `clip-path` tepat di atas
 * elemen yang sedang diterangkan (`data-lubang="<sasaran>"`). Hitungannya
 * murni di `sorotan.ts`; komponen ini hanya:
 *
 * 1. mengukur sasaran dalam koordinat DOKUMEN (sekali per langkah, lalu tiap
 *    kali tata letak berubah: ubah ukuran, putar, kartu dibuka, huruf termuat)
 *    — bukan tiap gulir: lapisannya ikut tergulir bersama halaman;
 * 2. menyembunyikan sisa halaman dari pembaca layar dan papan ketik
 *    (`inert` + `aria-hidden`) — sasaran, panel, dan lapisan sendiri tidak;
 * 3. merender lapisannya (`aria-hidden`: ia hanya cat).
 *
 * Ketukan di luar lubang jatuh ke lapisan dan tidak melakukan apa pun (D-2);
 * ketukan di dalam lubang jatuh ke sasaran. Panel panduan berada di atas
 * lapisan (`z-index`), jadi "Lewati" selalu bisa diketuk; menutup pemandu
 * melepas komponen ini seketika — tanpa animasi keluar.
 *
 * Tidak memuat tombol, jadi aturan INV-12 `periksa:desain` (yang hanya
 * membaca daftar berkas tetap) tidak kehilangan apa pun.
 */
import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { klipSelubung, lubangDari, simpulDisembunyikan, type Kotak } from './sorotan.ts';
import type { SasaranSorot } from './tampilan.ts';

/** `useLayoutEffect` di peramban (ukur sebelum dilukis); di render server tidak ada apa-apa. */
const efekTataLetak = typeof window === 'undefined' ? useEffect : useLayoutEffect;

/** Tanda pada simpul yang disembunyikan komponen ini — supaya hanya itu yang dipulihkan. */
const TANDA = 'data-sorotan-sembunyi';

function sasaranDi(sasaran: SasaranSorot): Element[] {
  return [...document.querySelectorAll(`[data-lubang="${sasaran}"]`)];
}

interface Ukuran {
  lubang: Kotak | null;
  tinggi: number;
}

function sama(a: Ukuran | null, b: Ukuran): boolean {
  if (a === null || a.tinggi !== b.tinggi) return false;
  if (a.lubang === null || b.lubang === null) return a.lubang === b.lubang;
  return (
    a.lubang.kiri === b.lubang.kiri &&
    a.lubang.atas === b.lubang.atas &&
    a.lubang.kanan === b.lubang.kanan &&
    a.lubang.bawah === b.lubang.bawah
  );
}

export function Sorotan({ sasaran }: { sasaran: SasaranSorot }): JSX.Element {
  const acuan = useRef<HTMLDivElement>(null);
  const [ukuran, setUkuran] = useState<Ukuran | null>(null);

  efekTataLetak(() => {
    const ukur = (): void => {
      const akar = document.documentElement;
      const sx = window.scrollX;
      const sy = window.scrollY;
      /*
       * Tinggi dokumen dari `body`, bukan `scrollHeight`: lapisan yang
       * `absolute` ikut menambah luapan gulir, jadi `scrollHeight` tidak
       * pernah menyusut lagi sesudah isi halaman memendek. Tinggi kotak
       * `body` hanya dari isi yang mengalir.
       */
      const tinggi = Math.max(akar.clientHeight, Math.ceil(document.body.getBoundingClientRect().bottom + sy));
      const kotak = sasaranDi(sasaran).map((e) => {
        const b = e.getBoundingClientRect();
        return { kiri: b.left + sx, atas: b.top + sy, kanan: b.right + sx, bawah: b.bottom + sy };
      });
      const baru = { lubang: lubangDari(kotak, { lebar: akar.clientWidth, tinggi }), tinggi };
      setUkuran((lama) => (sama(lama, baru) ? lama : baru));
    };
    ukur();

    let pinta = 0;
    const jadwal = (): void => {
      cancelAnimationFrame(pinta);
      pinta = requestAnimationFrame(ukur);
    };
    window.addEventListener('resize', jadwal);
    window.addEventListener('orientationchange', jadwal);
    const pengamat = typeof ResizeObserver === 'undefined' ? null : new ResizeObserver(jadwal);
    pengamat?.observe(document.body);
    for (const e of sasaranDi(sasaran)) pengamat?.observe(e);
    let hidup = true;
    void document.fonts?.ready.then(() => {
      if (hidup) jadwal();
    });
    return () => {
      hidup = false;
      cancelAnimationFrame(pinta);
      window.removeEventListener('resize', jadwal);
      window.removeEventListener('orientationchange', jadwal);
      pengamat?.disconnect();
    };
  }, [sasaran]);

  /*
   * Konten di bawah lapisan: `inert` (tidak bisa difokus, tidak bisa diketuk)
   * dan `aria-hidden` (untuk pembaca layar yang belum mengenal `inert`).
   * Simpul yang sudah tersembunyi sebelumnya dilewati, jadi pemulihan tidak
   * pernah membuka sesuatu yang memang tersembunyi.
   */
  useEffect(() => {
    const simpan = [acuan.current, document.querySelector('.pemandu'), ...sasaranDi(sasaran)].filter(
      (e): e is Element => e !== null,
    );
    const disembunyikan = simpulDisembunyikan<Element>(document.body, simpan).filter(
      (e) => !e.hasAttribute('inert') && e.getAttribute('aria-hidden') !== 'true',
    );
    for (const e of disembunyikan) {
      e.setAttribute('inert', '');
      e.setAttribute('aria-hidden', 'true');
      e.setAttribute(TANDA, '');
    }
    return () => {
      for (const e of disembunyikan) {
        e.removeAttribute('inert');
        e.removeAttribute('aria-hidden');
        e.removeAttribute(TANDA);
      }
    };
  }, [sasaran]);

  const lubang = ukuran?.lubang ?? null;
  const klip = lubang === null ? undefined : klipSelubung(lubang);
  return (
    <div
      ref={acuan}
      className="sorotan"
      aria-hidden="true"
      data-uid="sorotan"
      data-sasaran={sasaran}
      style={{
        height: ukuran === null ? '100%' : `${String(ukuran.tinggi)}px`,
        clipPath: klip,
        WebkitClipPath: klip,
      }}
    >
      {lubang !== null && (
        <div
          className="sorotan-lubang"
          style={{
            left: `${String(lubang.kiri)}px`,
            top: `${String(lubang.atas)}px`,
            width: `${String(lubang.kanan - lubang.kiri)}px`,
            height: `${String(lubang.bawah - lubang.atas)}px`,
          }}
        />
      )}
    </div>
  );
}
