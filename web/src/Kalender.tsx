import type { ReactNode } from 'react';
import type { Penanda } from './tanggal.ts';

/**
 * Tanda tangan desain (D-8): halaman kalender sobek, benda yang ada di hampir
 * setiap rumah dan warung di Indonesia.
 *
 * **Benda yang sama di mana pun ia muncul.** Sisi atasnya bergerigi — bekas
 * perforasi sobekan — dan gerigi yang sama menjadi sisi atas keping yang
 * menempel di layar soal. Halaman kalender bukan kartu: ia sengaja tidak
 * berbagi bentuk dengan lembar dokumen.
 *
 * Tiga wujud, satu benda: halaman besar di layar pertama, keping menempel di
 * layar soal, dan halaman yang tersobek di layar pembukaan.
 */

export function HalamanKalender({ hari }: { hari: Penanda }): JSX.Element {
  return (
    <div className="kalender-halaman" role="img" aria-label={`${hari.hari}, ${hari.panjang}`}>
      <div className="kalender-pita">{hari.bulanTahun}</div>
      <div className="kalender-angka" aria-hidden="true">
        {hari.angka}
      </div>
      <div className="kalender-hari" aria-hidden="true">
        {hari.hariBesar}
      </div>
    </div>
  );
}

/**
 * Keping yang menempel di layar soal.
 *
 * `berdenyut` (M3.6 D-3): titik pemisahnya berdenyut satu detik ketika keping
 * ini pertama tampil, yaitu di soal pertama. Teman FEB pemilik tidak pernah
 * melihat keping ini sama sekali — ia berpatokan pada tiga bulatan kemajuan —
 * dan yang diam memang tidak menarik mata. Sesudah satu detik ia diam untuk
 * seterusnya; `prefers-reduced-motion` mematikannya sama sekali.
 *
 * Yang bergerak sengaja hanya titiknya: menggerakkan tanggalnya akan membuat
 * keping ini terbaca sebagai pemberitahuan, dan ia bukan itu.
 *
 * **Satu baris** (M3.9 D-5): tanggal di kiri, `kanan` (bulatan kemajuan) di
 * kanan, disalin dari `.keping-dalam` patokan `docs/contoh/layar-soal.html`.
 * Sejak M3.2 produk menaruh bulatan di BAWAH tanggal — penyimpangan yang lolos
 * review, bukan keputusan; pemilik menemukannya 24 Sep 2026.
 */
export function KepingKalender({
  hari,
  berdenyut = false,
  kanan,
}: {
  hari: Penanda;
  berdenyut?: boolean;
  kanan?: ReactNode;
}): JSX.Element {
  return (
    <div className="kalender-keping">
      <p className="kalender-keping-tanggal">
        <span className="kalender-label">Hari ini</span>
        <span className="kalender-tanggal">
          {hari.hariBesar}{' '}
          <span className={berdenyut ? 'keping-titik keping-titik-denyut' : 'keping-titik'}>·</span>{' '}
          {hari.pendek}
        </span>
      </p>
      {kanan}
    </div>
  );
}

/**
 * Halaman yang tersobek dan jatuh **keluar dari tempatnya**.
 *
 * Gerak pertama dari dua yang diatur di seluruh aplikasi (yang kedua: denyut
 * titik keping di soal pertama, M3.6 D-3). Tiga hal yang membuat
 * versi pertama meniadakan dirinya sendiri, dan sudah diperbaiki: ruangnya
 * `overflow: hidden` sehingga halaman terpotong begitu mulai jatuh; ruang itu
 * menyusut bersamaan dengan jatuhnya, bukan sesudahnya; dan sobekan dimulai
 * tepat ketika layar melompat ke atas. Sekarang: `overflow: visible`, mulai
 * 500 ms sesudah layar tampil (M3.6 D-4: pemilik menilai sobekannya "kurang
 * terasa" pada 250 ms — mata belum sampai ke kalender), dan ruangnya baru
 * menutup 200 ms sesudah sobekan dimulai.
 *
 * Dengan `prefers-reduced-motion`, sobekan diganti pergantian langsung.
 */
export function KalenderSobek({ hari }: { hari: Penanda }): JSX.Element {
  return (
    <div className="kalender-sobek" aria-hidden="true">
      <div className="kalender-halaman kalender-jatuh">
        <div className="kalender-pita">{hari.bulanTahun}</div>
        <div className="kalender-angka">{hari.angka}</div>
        <div className="kalender-hari">{hari.hariBesar}</div>
      </div>
    </div>
  );
}
