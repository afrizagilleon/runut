import {
  RUJUKAN_ANDAIAN,
  RUJUKAN_HARI_INI,
  pecahTeks,
  type BagianTeks,
} from '../../factory/skema/rujukan.ts';

export interface TeksProps {
  teks: string;
  /** Dipanggil saat pemain mengetuk sebuah angka; membuka sumber fakta itu. */
  sakelarSumber: (fact_id: string) => void;
  /**
   * `false` untuk teks yang berada di dalam label pilihan: tombol di dalam label
   * akan ikut memilih radio-nya, jadi di sana angka dirender datar. Angka yang
   * sama tetap bisa diketuk di batang soal, kartu, dan teks kunci.
   */
  interaktif?: boolean;
  /**
   * `true` di dalam lembar dokumen: angka dirender tebal, bukan tautan.
   * Satu lembar = satu pintu ke sumbernya, yaitu kepala lembarnya
   * (`docs/desain.md`). Sebelas tautan kecil di satu layar bukan pintu.
   */
  tebalSaja?: boolean;
}

/** Tanda baca yang tidak boleh terlepas dari kata sebelumnya. */
const TANDA_BACA = /^[.,;:!?)\]»…%]+/;

export interface PotonganTeks {
  bagian: BagianTeks;
  /** Tanda baca tepat sesudah bagian ini, diikat supaya tidak pindah baris. */
  ekor: string;
}

/**
 * Pisahkan tanda baca yang mengikuti sebuah rujukan, lalu ikat ke rujukan itu.
 *
 * Tautan angka dirender sebagai `<button>`, dan `<button>` selalu menjadi kotak
 * inline **atom** — `display: inline` pun dipaksa kembali ke `inline-block` oleh
 * peramban. Kotak atom membuka kesempatan putus baris di kedua sisinya, sehingga
 * titik sesudah tautan terlempar ke baris berikutnya: layar pembuka sempat
 * menampilkan baris yang diawali ". Grup obrolanmu ramai." (F-A1-2).
 *
 * Karena itu tanda bacanya dipindahkan ke dalam satu bungkus `white-space:
 * nowrap` bersama tautannya. Murni dan dites tanpa peramban.
 */
export function ikatTandaBaca(bagian: BagianTeks[]): PotonganTeks[] {
  const hasil: PotonganTeks[] = [];
  for (const [nomor, b] of bagian.entries()) {
    if (b.jenis !== 'rujukan') {
      hasil.push({ bagian: b, ekor: '' });
      continue;
    }
    const berikut = bagian[nomor + 1];
    if (berikut === undefined || berikut.jenis !== 'utuh') {
      hasil.push({ bagian: b, ekor: '' });
      continue;
    }
    const cocok = TANDA_BACA.exec(berikut.teks);
    if (cocok === null) {
      hasil.push({ bagian: b, ekor: '' });
      continue;
    }
    hasil.push({ bagian: b, ekor: cocok[0] });
    bagian[nomor + 1] = { jenis: 'utuh', teks: berikut.teks.slice(cocok[0].length) };
  }
  return hasil;
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
export function Teks({
  teks,
  sakelarSumber,
  interaktif = true,
  tebalSaja = false,
}: TeksProps): JSX.Element {
  return (
    <>
      {ikatTandaBaca(pecahTeks(teks)).map(({ bagian, ekor }, nomor) => {
        if (bagian.jenis === 'utuh') {
          return <span key={nomor}>{bagian.teks}</span>;
        }
        if (bagian.fact_id === RUJUKAN_HARI_INI) {
          return (
            <span key={nomor} className="hari-ini">
              {bagian.teks}
              {ekor}
            </span>
          );
        }
        if (tebalSaja) {
          return (
            <strong key={nomor} className="angka-lembar">
              {bagian.teks}
              {ekor}
            </strong>
          );
        }
        if (!interaktif) {
          return (
            <span key={nomor} className="rujukan-datar">
              {bagian.teks}
              {ekor}
            </span>
          );
        }
        if (bagian.fact_id === RUJUKAN_ANDAIAN) {
          return (
            <span key={nomor} className="andaian" title="angka andaian di soal, bukan fakta">
              {bagian.teks}
              {ekor}
            </span>
          );
        }
        const tombol = (
          <button
            type="button"
            className="rujukan"
            // D-8: tiap elemen interaktif punya nama sendiri. Yang dicatat
            // adalah kode faktanya, bukan angka yang tertulis di layar.
            data-uid={`angka:${bagian.fact_id}`}
            onClick={() => {
              sakelarSumber(bagian.fact_id);
            }}
            aria-label={`${bagian.teks} — lihat sumber angka ini`}
          >
            {bagian.teks}
          </button>
        );
        // Tombol dan tanda bacanya diikat: keduanya tidak boleh terpisah baris.
        return ekor === '' ? (
          <span key={nomor}>{tombol}</span>
        ) : (
          <span key={nomor} className="tanpa-putus">
            {tombol}
            {ekor}
          </span>
        );
      })}
    </>
  );
}
