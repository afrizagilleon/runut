import { Component, type ErrorInfo, type ReactNode } from 'react';
import { laporGalatAkar } from './galat.ts';

/**
 * Batas galat di akar (A3-T2).
 *
 * Sebelum ini, satu galat saat render menghasilkan **layar putih tanpa satu
 * kata pun** — pemilik membuka aplikasinya di ponsel dan tidak melihat apa-apa,
 * tanpa petunjuk apakah tautannya salah, jaringannya mati, atau produknya
 * rusak. Itu melanggar semangat INV-6: kegagalan tidak boleh senyap.
 *
 * Pemain melihat satu kalimat dalam bahasa orang dan satu tombol. Rincian
 * teknisnya — pesan galat, tumpukan pemanggilan, nama komponen — hanya ke
 * `console.error`, tidak pernah ke layar: ia tidak menolong pemain dan hanya
 * membuat kerusakan terasa lebih menakutkan daripada kenyataannya.
 *
 * Kelas React biasa, tanpa dependensi: batas galat memang hanya bisa ditulis
 * sebagai kelas.
 */

export interface BatasGalatProps {
  children: ReactNode;
  /** Disuntikkan di tes; `window.location.reload` di peramban. */
  muatUlang?: () => void;
  /** Disuntikkan di tes; `console.error` di peramban. */
  catat?: (pesan: string, galat: unknown) => void;
  /**
   * Disuntikkan di tes; `laporGalatAkar` di peramban (M3.8 D-3). Galat render
   * juga menjadi peristiwa `galat`, dengan pesan yang disamarkan reducer.
   */
  lapor?: (galat: unknown) => void;
}

export interface BatasGalatState {
  jatuh: boolean;
}

/** Kalimat yang dilihat pemain. Satu-satunya teks yang keluar ke layar. */
export const PESAN_MACET = 'Ada yang macet di halaman ini. Coba muat ulang.';
export const LABEL_MUAT_ULANG = 'Muat ulang';

export class BatasGalat extends Component<BatasGalatProps, BatasGalatState> {
  constructor(props: BatasGalatProps) {
    super(props);
    this.state = { jatuh: false };
  }

  static getDerivedStateFromError(): BatasGalatState {
    return { jatuh: true };
  }

  override componentDidCatch(galat: Error, info: ErrorInfo): void {
    const catat = this.props.catat ?? ((pesan: string, isi: unknown): void => {
      console.error(pesan, isi);
    });
    // Ke konsol, bukan ke layar.
    catat('Runut: render gagal.', { galat, komponen: info.componentStack });
    // Dan ke pengumpul, sebagai `galat` yang disamarkan — juga bukan ke layar.
    (this.props.lapor ?? laporGalatAkar)(galat);
  }

  override render(): ReactNode {
    if (!this.state.jatuh) return this.props.children;
    const muatUlang =
      this.props.muatUlang ??
      ((): void => {
        window.location.reload();
      });
    return (
      <main className="halaman">
        <section className="layar layar-macet" role="alert">
          <h1>{PESAN_MACET}</h1>
          <button type="button" className="tombol-utama" onClick={muatUlang}>
            {LABEL_MUAT_ULANG}
          </button>
        </section>
      </main>
    );
  }
}
