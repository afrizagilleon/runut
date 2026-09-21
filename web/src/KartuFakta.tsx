import type { Fakta } from '../../factory/skema/tipe.ts';
import { Teks } from './Teks.tsx';

export interface KartuFaktaProps {
  fakta: Fakta;
  terlipat: boolean;
  /** Sesudah jawaban dikunci, kartu yang menentukan ditegaskan (D-8). */
  menentukan: boolean;
  /** Ketukan pada kartu membuka panel sumbernya (D-4). */
  bukaSumber: (fact_id: string) => void;
  lipat: (fact_id: string) => void;
  buka: (fact_id: string) => void;
}

/**
 * Lembar dokumen (D-8): suara resmi. Baris kepala berhuruf mesin tik, lalu
 * satu-dua kalimat bahasa sehari-hari.
 *
 * Garis kepala membawa arti, bukan hiasan: **utuh** untuk yang diumumkan pihak
 * lain, **putus-putus** untuk yang kami hitung sendiri. Itu sebabnya kelasnya
 * dipilih dari `sumber.jenis`, bukan dari selera.
 */
export function KartuFakta({
  fakta,
  terlipat,
  menentukan,
  bukaSumber,
  lipat,
  buka,
}: KartuFaktaProps): JSX.Element {
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
      <div className="lembar-kepala">
        {/*
          D-4: mengetuk kartu membuka panel sumbernya. Yang diketuk adalah baris
          kepala — jenis sumber dan tanggalnya — karena badan kartu memuat angka
          yang masing-masing sudah menjadi tombol, dan tombol di dalam tombol
          bukan HTML yang sah.
        */}
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
        <button
          type="button"
          className="lembar-lipat"
          aria-expanded={!terlipat}
          aria-controls={`isi-${fakta.fact_id}`}
          onClick={() => {
            if (terlipat) buka(fakta.fact_id);
            else lipat(fakta.fact_id);
          }}
        >
          {terlipat ? 'Buka' : 'Lipat'}
        </button>
      </div>
      {!terlipat && (
        <div className="lembar-isi" id={`isi-${fakta.fact_id}`}>
          <p>
            <Teks teks={awam?.isi ?? fakta.klaim} bukaSumber={bukaSumber} />
          </p>
        </div>
      )}
    </article>
  );
}
