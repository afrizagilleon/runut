import type { Fakta } from '../../factory/skema/tipe.ts';
import { PINTU_HITUNG, PINTU_SUMBER } from './sumber.ts';
import { Teks } from './Teks.tsx';
import { LABEL_PETUNJUK_KARTU } from './tampilan.ts';

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
  /**
   * Ditandai petunjuk atau langkah ketiga pemandu (M3.14 D-1/D-2): cincin dan
   * satu label netral di atas lembar. Hanya pernah dipakai untuk
   * `kartu_penentu`, dan hanya sebelum jawaban dikunci.
   */
  ditandai?: boolean;
  /**
   * Tanpa kaki (M3.14, soal pemanasan): lembar latihan tidak punya dokumen
   * sumber untuk dibuka, dan tombol yang tidak membuka apa pun dilarang
   * (`docs/desain.md`, "tidak ada yang diam-diam bisa diketuk").
   */
  tanpaKaki?: boolean;
}

/**
 * Lembar dokumen — potongan kertas, bukan kartu pilihan (patokan
 * `docs/contoh/layar-soal.html`).
 *
 * Pemilik mengira lembar-lembar ini adalah pilihan gandanya ("aku kira kartu itu
 * adalah pilihan bergandanya", 22 Sep). Dua hal di sini yang menjawab itu:
 * kepalanya ditulis biasa sebagai peran *meta* — bukan lagi tombol berhuruf
 * kapital yang tampak bisa dipilih — dan **satu-satunya pintu ada di kakinya**,
 * satu tombol garis tepi ≥ 44 px yang menyebut dirinya sendiri ("Buka
 * dokumennya ›" / "Lihat hitungannya ›"; M3.11 D-5 — sampai M3.10 baris
 * tulisan "Lihat sumbernya ›" yang tidak terbaca sebagai pintu).
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
  ditandai = false,
  tanpaKaki = false,
}: KartuFaktaProps): JSX.Element {
  const awam = fakta.awam;
  const dihitung = fakta.sumber.jenis === 'turunan';
  const judul = `kartu-${fakta.fact_id}`;

  return (
    <>
    {/*
      Label petunjuk DI ATAS lembar, di luar cincinnya (kritik D-6 butir 5):
      ia suara kami, bukan bagian dokumen resmi. Sasaran gulir petunjuk ada di
      label ini, supaya ia yang mendarat tepat di bawah keping.
    */}
    {ditandai && (
      <p className="tanda-kartu" data-gulir-sorot="penentu">
        {LABEL_PETUNJUK_KARTU}
      </p>
    )}
    <section
      className={`lembar${dihitung ? ' lembar-hitung' : ''}${
        menentukan ? ' lembar-menentukan' : ''
      }${ditandai ? ' lembar-ditandai' : ''}`}
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

      {!tanpaKaki && (
      <button
        type="button"
        className="lembar-kaki"
        aria-expanded={terbuka}
        data-uid={`kaki:${fakta.fact_id}`}
        onClick={() => {
          sakelarSumber(fakta.fact_id);
        }}
      >
        {dihitung ? PINTU_HITUNG : PINTU_SUMBER}
        <span className="panah" aria-hidden="true">
          ›
        </span>
      </button>
      )}

      {terbuka && <div className="buka">{children}</div>}
    </section>
    </>
  );
}
