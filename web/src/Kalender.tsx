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

export function KepingKalender({ hari }: { hari: Penanda }): JSX.Element {
  return (
    <p className="kalender-keping">
      <span className="kalender-label">Hari ini</span>
      <span className="kalender-tanggal">
        {hari.hariBesar} · {hari.pendek}
      </span>
    </p>
  );
}

/**
 * Halaman yang tersobek dan jatuh **keluar dari tempatnya**.
 *
 * Gerak satu-satunya yang diatur di seluruh aplikasi. Tiga hal yang membuat
 * versi pertama meniadakan dirinya sendiri, dan sudah diperbaiki: ruangnya
 * `overflow: hidden` sehingga halaman terpotong begitu mulai jatuh; ruang itu
 * menyusut bersamaan dengan jatuhnya, bukan sesudahnya; dan sobekan dimulai
 * tepat ketika layar melompat ke atas. Sekarang: `overflow: visible`, mulai
 * 250 ms sesudah layar tampil, dan ruangnya baru menutup 200 ms sesudah
 * sobekan dimulai.
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
