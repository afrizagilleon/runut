import type { Fakta } from '../../factory/skema/tipe.ts';
import { Teks } from './Teks.tsx';

export interface KartuFaktaProps {
  fakta: Fakta;
  /** Sesudah jawaban dikunci, kartu penentu ditegaskan (D-8). */
  menentukan: boolean;
  /** Ketukan pada kaki lembar membuka sumbernya **di tempat** (D-5). */
  sakelarSumber: (fact_id: string) => void;
  /** Sedang terbuka? Isinya dirender oleh pemanggil sebagai `children`. */
  terbuka?: boolean;
  /** Isi yang tampil di dalam lembar ini ketika terbuka. */
  children?: React.ReactNode;
}

/**
 * Lembar dokumen — potongan kertas, bukan kartu pilihan (patokan
 * `docs/contoh/layar-soal.html`).
 *
 * Pemilik mengira lembar-lembar ini adalah pilihan gandanya ("aku kira kartu itu
 * adalah pilihan bergandanya", 22 Sep). Dua hal di sini yang menjawab itu:
 * kepalanya ditulis biasa sebagai peran *meta* — bukan lagi tombol berhuruf
 * kapital yang tampak bisa dipilih — dan **satu-satunya pintu ada di kakinya**,
 * satu baris ≥ 44 px yang menyebut dirinya sendiri ("Lihat sumbernya ›").
 *
 * Garis kepala membawa arti, bukan hiasan: **utuh** untuk yang diumumkan pihak
 * lain, **putus-putus** untuk yang kami hitung sendiri. Kelasnya dipilih dari
 * `sumber.jenis`, dan validator memastikan kepala lembar mengatakan hal yang
 * sama (A1-T1), jadi garis itu tidak bisa berbohong.
 */
export function KartuFakta({
  fakta,
  menentukan,
  sakelarSumber,
  terbuka = false,
  children,
}: KartuFaktaProps): JSX.Element {
  const awam = fakta.awam;
  const dihitung = fakta.sumber.jenis === 'turunan';
  const judul = `kartu-${fakta.fact_id}`;

  return (
    <section
      className={`lembar${dihitung ? ' lembar-hitung' : ''}${
        menentukan ? ' lembar-menentukan' : ''
      }`}
      aria-labelledby={judul}
      data-uid={`lembar:${fakta.fact_id}`}
    >
      <div className="lembar-badan">
        <p className="meta" id={judul}>
          {awam?.kepala ?? fakta.fact_id}
        </p>
        <p className="isi lembar-badan-isi">
          <Teks teks={awam?.isi ?? fakta.klaim} sakelarSumber={sakelarSumber} tebalSaja />
        </p>
      </div>

      <button
        type="button"
        className="lembar-kaki"
        aria-expanded={terbuka}
        data-uid={`kaki:${fakta.fact_id}`}
        onClick={() => {
          sakelarSumber(fakta.fact_id);
        }}
      >
        {dihitung ? 'Lihat cara menghitungnya' : 'Lihat sumbernya'}
        <span className="panah" aria-hidden="true">
          ›
        </span>
      </button>

      {terbuka && <div className="buka">{children}</div>}
    </section>
  );
}
