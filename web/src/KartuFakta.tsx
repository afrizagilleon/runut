import type { Fakta } from '../../factory/skema/tipe.ts';
import { Teks } from './Teks.tsx';

export interface KartuFaktaProps {
  fakta: Fakta;
  terlipat: boolean;
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
  bukaSumber,
  lipat,
  buka,
}: KartuFaktaProps): JSX.Element {
  const awam = fakta.awam;
  const dihitung = fakta.sumber.jenis === 'turunan';
  const judul = `kartu-${fakta.fact_id}`;

  return (
    <article className={`lembar${dihitung ? ' lembar-hitung' : ''}`} aria-labelledby={judul}>
      <div className="lembar-garis" aria-hidden="true" />
      <div className="lembar-kepala">
        <h3 className="lembar-sumber" id={judul}>
          {awam?.kepala ?? fakta.fact_id}
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
          <button
            type="button"
            className="lembar-sumber-tombol"
            onClick={() => {
              bukaSumber(fakta.fact_id);
            }}
          >
            Dari mana angka ini?
          </button>
        </div>
      )}
    </article>
  );
}
