import { Fragment, type ReactNode } from 'react';
import {
  PENANDA_BUKAN_FAKTA,
  RUJUKAN_ANDAIAN,
  RUJUKAN_HARI_INI,
  pecahTeks,
  type BagianTeks,
} from '../../factory/skema/rujukan.ts';

/**
 * Id blok penjelasan sebaris untuk sebuah fakta.
 *
 * Satu fungsi, dipakai dua tempat: tombol angka menunjuknya lewat
 * `aria-controls`, dan `PenjelasanSebaris` memakainya sebagai `id`. Kalau
 * keduanya mengarang idnya sendiri, mereka akan berselisih tanpa ada yang tahu.
 */
export function idPenjelasan(fact_id: string): string {
  return `penjelasan-${fact_id}`;
}

/**
 * Ketukan pada sebuah angka (A-2). `saudara` = semua fact_id yang bisa dibuka
 * di paragraf yang sama, dan hanya dikirim oleh paragraf yang punya penjelasan
 * sebaris (M3.8 D-8): reducer memakainya untuk menjaga satu penjelasan per
 * paragraf.
 */
export type SakelarSumber = (fact_id: string, saudara?: readonly string[]) => void;

export interface TeksProps {
  teks: string;
  /** Dipanggil saat pemain mengetuk sebuah angka; membuka sumber fakta itu. */
  sakelarSumber: SakelarSumber;
  /**
   * `fact_id` yang penjelasan sebarisnya sedang terbuka (C-2).
   *
   * Tombol angka adalah kontrol buka-tutup, dan sampai A-1 ia tidak mengatakan
   * begitu: tanpa `aria-expanded`, pembaca layar mengumumkannya sebagai tombol
   * biasa dan pemakainya tidak tahu ada sesuatu yang baru saja terbentang di
   * bawah paragraf.
   */
  terbuka?: readonly string[];
  /**
   * Penjelasan sebaris untuk satu fakta, disisipkan **di dalam paragraf** (D-1
   * M3.6).
   *
   * Pemanggil hanya menyediakan isinya; yang memutuskan **di mana** ia muncul
   * adalah berkas ini, karena hanya di sini kalimat-kalimatnya diketahui.
   * Ketiadaan prop ini berarti paragraf itu memang tidak punya penjelasan yang
   * bisa dibuka (kartu, opsi, kalimat pembuka), dan tidak ada yang disisipkan.
   */
  penjelasan?: (fact_id: string) => ReactNode;
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

/* ------------------------------------------------------------------ */
/* Kalimat: memotong paragraf, lalu menyelipkan penjelasan (D-1 M3.6)  */
/* ------------------------------------------------------------------ */

export interface Kalimat {
  potongan: PotonganTeks[];
  /** fact_id yang bisa dibuka dari kalimat ini; penanda bukan-fakta tidak ikut. */
  fact_ids: string[];
}

/** Batas kalimat: titik, seru, atau tanya yang diikuti spasi. */
const BATAS_KALIMAT = /[.!?](?=\s)/;

function faktaDalam(potongan: readonly PotonganTeks[]): string[] {
  const id: string[] = [];
  for (const { bagian } of potongan) {
    if (bagian.jenis !== 'rujukan') continue;
    if (PENANDA_BUKAN_FAKTA.includes(bagian.fact_id)) continue;
    if (!id.includes(bagian.fact_id)) id.push(bagian.fact_id);
  }
  return id;
}

/**
 * Potong paragraf yang sudah dipecah menjadi **kalimat**.
 *
 * Kenapa ini ada, dan kenapa ia murni: pemilik mengetuk "9 Oktober 2025" di
 * layar pembukaan dan tidak melihat apa-apa. Penjelasannya memang terbuka —
 * 289 px di bawah tautannya, di luar layar 640 px, karena ia dirender sesudah
 * **seluruh** paragraf yang panjangnya empat kalimat. Yang dibutuhkan adalah
 * tempat sisip yang lebih dekat, dan satu-satunya batas yang bisa dihitung dari
 * teks tanpa tahu apa-apa tentang peramban adalah batas kalimat.
 *
 * Batasnya sengaja sempit — `. `, `! `, `? ` — dan itu aman di sini justru
 * karena INV-4: setiap angka wajib ditulis sebagai rujukan `[[fact_id|teks]]`,
 * jadi titik di dalam "5.112.760.000" tidak pernah berada di teks biasa. Tanda
 * baca yang sudah dipindahkan `ikatTandaBaca` ke dalam `ekor` sebuah rujukan
 * ikut dihitung: tanpa itu, kalimat yang **ditutup** oleh tautannya sendiri
 * ("…tutup di Rp152.") tidak akan pernah punya batas.
 */
export function potongKalimat(potongan: readonly PotonganTeks[]): Kalimat[] {
  const hasil: Kalimat[] = [];
  let kini: PotonganTeks[] = [];

  const tutup = (): void => {
    if (kini.length === 0) return;
    hasil.push({ potongan: kini, fact_ids: faktaDalam(kini) });
    kini = [];
  };

  for (const [nomor, p] of potongan.entries()) {
    if (p.bagian.jenis === 'rujukan') {
      kini.push(p);
      if (!/[.!?]$/.test(p.ekor)) continue;
      // Spasi sesudahnya menandai batas; tanpa spasi, tanda baca itu bagian
      // dari kalimat yang masih berjalan (mis. singkatan di tengah kata).
      const berikut = potongan[nomor + 1];
      const berbatas =
        berikut === undefined ||
        (berikut.bagian.jenis === 'utuh' && /^\s/.test(berikut.bagian.teks));
      if (berbatas) tutup();
      continue;
    }

    let sisa = p.bagian.teks;
    for (;;) {
      const cocok = BATAS_KALIMAT.exec(sisa);
      if (cocok === null) break;
      const potong = cocok.index + 1;
      kini.push({ bagian: { jenis: 'utuh', teks: sisa.slice(0, potong) }, ekor: '' });
      tutup();
      sisa = sisa.slice(potong);
    }
    if (sisa !== '') kini.push({ bagian: { jenis: 'utuh', teks: sisa }, ekor: '' });
  }
  tutup();
  return hasil;
}

/**
 * Semua fact_id yang bisa dibuka di paragraf ini, urut kemunculan, tanpa
 * ulangan (M3.8 D-8). Penanda bukan-fakta tidak ikut — mereka tidak punya
 * penjelasan. Inilah `saudara` yang dikirim bersama setiap ketukan.
 */
export function faktaParagraf(kalimat: readonly Kalimat[]): string[] {
  const id: string[] = [];
  for (const k of kalimat) {
    for (const f of k.fact_ids) if (!id.includes(f)) id.push(f);
  }
  return id;
}

export interface Sisipan {
  /** Nomor kalimat yang penjelasannya disisipkan tepat sesudahnya. */
  nomor: number;
  fact_id: string;
}

/**
 * Pilih **satu** penjelasan untuk paragraf ini: yang paling baru dibuka.
 *
 * Sejak M3.8 D-8 reducer sendiri yang menjaga "satu per paragraf" — membuka
 * sebuah tautan menutup saudaranya, dan menutup yang terlihat mengosongkan
 * paragrafnya (`sakelarDaftar` di `alur.ts`). Fungsi ini tetap memilih yang
 * paling baru karena satu fakta bisa ditautkan dari DUA paragraf: paragraf
 * lain boleh membukanya, dan di sini ia lalu menjadi yang terlihat. Aturan
 * "paling baru" yang sama dipakai reducer untuk menentukan yang terlihat,
 * jadi keduanya tidak bisa berselisih.
 */
export function selipkanPenjelasan(
  kalimat: readonly Kalimat[],
  terbuka: readonly string[],
): Sisipan | null {
  for (let i = terbuka.length - 1; i >= 0; i -= 1) {
    const fact_id = terbuka[i];
    if (fact_id === undefined) continue;
    const nomor = kalimat.findIndex((k) => k.fact_ids.includes(fact_id));
    if (nomor >= 0) return { nomor, fact_id };
  }
  return null;
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
  terbuka = [],
  penjelasan,
  interaktif = true,
  tebalSaja = false,
}: TeksProps): JSX.Element {
  const kalimat = potongKalimat(ikatTandaBaca(pecahTeks(teks)));
  const sisipan = penjelasan === undefined ? null : selipkanPenjelasan(kalimat, terbuka);
  // Saudara hanya dikirim oleh paragraf yang memang punya penjelasan sebaris.
  const saudara = penjelasan === undefined ? undefined : faktaParagraf(kalimat);

  const potong = ({ bagian, ekor }: PotonganTeks, nomor: number): JSX.Element | null => {
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
        /*
         * Yang dikatakan `aria-expanded` harus sama dengan yang dilihat mata.
         * Ketika paragraf ini memang punya penjelasan sebaris, yang tampil
         * hanya satu, dan hanya tautan itu yang mengaku terbuka. Sejak M3.8
         * D-8 reducer menjaga paragraf ini tidak pernah punya dua yang
         * terbuka; yang tersisa hanyalah fakta yang dibuka dari paragraf LAIN
         * (satu fakta bisa ditautkan dua paragraf), dan di sini ia terbuka
         * hanya kalau memang ia yang tampil.
         */
        const sedangTerbuka =
          penjelasan === undefined
            ? terbuka.includes(bagian.fact_id)
            : sisipan?.fact_id === bagian.fact_id;
        const tombol = (
          <button
            type="button"
            className="rujukan"
            // D-8: tiap elemen interaktif punya nama sendiri. Yang dicatat
            // adalah kode faktanya, bukan angka yang tertulis di layar.
            data-uid={`angka:${bagian.fact_id}`}
            /*
             * C-2: ia membuka dan menutup penjelasan sebaris, jadi ia harus
             * mengatakannya. `aria-controls` hanya dipasang ketika blok yang
             * ditunjuknya memang ada — menunjuk id yang tidak ada di halaman
             * adalah rujukan menggantung, dan pembaca layar tidak tertolong
             * olehnya.
             */
            aria-expanded={sedangTerbuka}
            aria-controls={sedangTerbuka ? idPenjelasan(bagian.fact_id) : undefined}
            /*
             * Satu ketukan, satu aksi. Yang memutuskan membuka atau menutup —
             * dan menutup saudara-saudaranya di paragraf ini — adalah reducer
             * (M3.8 D-8), bukan tombol ini.
             */
            onClick={() => {
              sakelarSumber(bagian.fact_id, saudara);
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
  };

  /*
   * `data-kalimat` bukan `data-uid`: pelacak ketukan membaca `data-uid`
   * terdekat ke atas (`bacaSasaran`), jadi menamai kalimat dengan uid akan
   * mengubah nama setiap ketukan di badan teks. Yang dibutuhkan hanya pegangan
   * untuk mengukur, dan itulah yang diberikan.
   */
  return (
    <>
      {kalimat.map((k, nomor) => (
        <Fragment key={nomor}>
          <span data-kalimat={nomor}>{k.potongan.map(potong)}</span>
          {sisipan !== null && sisipan.nomor === nomor && penjelasan !== undefined
            ? penjelasan(sisipan.fact_id)
            : null}
        </Fragment>
      ))}
    </>
  );
}
