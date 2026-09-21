import type { Fakta } from '../../factory/skema/tipe.ts';
import { Teks } from './Teks.tsx';

export interface KartuFaktaProps {
  fakta: Fakta;
  /** Sesudah jawaban dikunci, kartu penentu ditegaskan (D-8). */
  menentukan: boolean;
  /** Ketukan pada baris kepala membuka panel sumbernya (D-4). */
  bukaSumber: (fact_id: string) => void;
}

/**
 * Lembar dokumen (D-8): suara resmi. Baris kepala berhuruf mesin tik, lalu
 * satu-dua kalimat bahasa sehari-hari.
 *
 * Garis kepala membawa arti, bukan hiasan: **utuh** untuk yang diumumkan pihak
 * lain, **putus-putus** untuk yang kami hitung sendiri. Kelasnya dipilih dari
 * `sumber.jenis`, dan validator memastikan kepala lembar mengatakan hal yang
 * sama (A1-T1), jadi garis itu tidak bisa berbohong.
 *
 * Tanpa tombol lipat: tugas layar ini membuat kartu terbaca, bukan
 * menyembunyikannya. Satu lembar = satu pintu ke sumbernya, yaitu kepalanya;
 * angka di dalam badan lembar tebal, bukan tautan (`docs/desain.md`).
 */
export function KartuFakta({ fakta, menentukan, bukaSumber }: KartuFaktaProps): JSX.Element {
  const awam = fakta.awam;
  const dihitung = fakta.sumber.jenis === 'turunan';
  const judul = `kartu-${fakta.fact_id}`;

  return (
    <article
      className={`lembar${dihitung ? ' lembar-hitung' : ''}${
        menentukan ? ' lembar-menentukan' : ''
      }`}
      aria-labelledby={judul}
    >
      <div className="lembar-garis" aria-hidden="true" />
      <h3 className="lembar-sumber" id={judul}>
        <button
          type="button"
          className="lembar-sumber-tombol"
          onClick={() => {
            bukaSumber(fakta.fact_id);
          }}
        >
          {awam?.kepala ?? fakta.fact_id}
        </button>
      </h3>
      <p className="lembar-isi">
        <Teks teks={awam?.isi ?? fakta.klaim} bukaSumber={bukaSumber} tebalSaja />
      </p>
    </article>
  );
}
