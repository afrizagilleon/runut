import type { Penanda } from './tanggal.ts';

/**
 * Tanda tangan desain (D-8): halaman kalender sobek, benda yang ada di hampir
 * setiap rumah dan warung di Indonesia. Tiga wujud, satu benda:
 *
 * - `halaman` di layar pertama — pita bulan, angka besar, nama hari;
 * - `keping` di layar soal — menempel di atas dan tetap terlihat saat menggulir;
 * - `sobek` di layar pembukaan — halaman yang sama, tersobek 600 ms.
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
 * Halaman yang tersobek. Gerak satu-satunya yang diatur di seluruh aplikasi;
 * dengan `prefers-reduced-motion` CSS menggantinya dengan pergantian langsung.
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
