import { RUJUKAN_ANDAIAN, RUJUKAN_HARI_INI, pecahTeks } from '../../factory/skema/rujukan.ts';

export interface TeksProps {
  teks: string;
  /** Dipanggil saat pemain mengetuk sebuah angka; membuka sumber fakta itu. */
  bukaSumber: (fact_id: string) => void;
  /**
   * `false` untuk teks yang berada di dalam label pilihan: tombol di dalam label
   * akan ikut memilih radio-nya, jadi di sana angka dirender datar. Angka yang
   * sama tetap bisa diketuk di batang soal, kartu, dan teks kunci.
   */
  interaktif?: boolean;
}

/**
 * Render kalimat yang angkanya ditulis sebagai rujukan `[[fact_id|teks]]`.
 *
 * Tiga jenis potongan:
 * - angka fakta → tombol yang membuka panel sumber;
 * - angka andaian (`misal`) → datar, karena ia memang tidak punya sumber;
 * - tanggal beku (`hari-ini`) → datar dan tidak diberi keterangan "andaian",
 *   karena ia bukan pengandaian melainkan tanggal kasusnya sendiri.
 */
export function Teks({ teks, bukaSumber, interaktif = true }: TeksProps): JSX.Element {
  return (
    <>
      {pecahTeks(teks).map((bagian, nomor) => {
        if (bagian.jenis === 'utuh') {
          return <span key={nomor}>{bagian.teks}</span>;
        }
        if (bagian.fact_id === RUJUKAN_HARI_INI) {
          return (
            <span key={nomor} className="hari-ini">
              {bagian.teks}
            </span>
          );
        }
        if (!interaktif) {
          return (
            <span key={nomor} className="rujukan-datar">
              {bagian.teks}
            </span>
          );
        }
        if (bagian.fact_id === RUJUKAN_ANDAIAN) {
          return (
            <span key={nomor} className="andaian" title="angka andaian di soal, bukan fakta">
              {bagian.teks}
            </span>
          );
        }
        return (
          <button
            key={nomor}
            type="button"
            className="rujukan"
            onClick={() => {
              bukaSumber(bagian.fact_id);
            }}
            aria-label={`${bagian.teks} — lihat sumber angka ini`}
          >
            {bagian.teks}
          </button>
        );
      })}
    </>
  );
}
