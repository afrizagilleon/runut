import { useCallback, useEffect, useMemo, useReducer, useRef } from 'react';
import type { RefObject } from 'react';
import { PENANDA_BUKAN_FAKTA, ambilRujukan } from '../../factory/skema/rujukan.ts';
import type { Fakta, Istilah, Kasus, Soal } from '../../factory/skema/tipe.ts';
import {
  type Aksi,
  type Keadaan,
  type Peristiwa,
  LABEL_COCOK,
  bilahBawah,
  keadaanAwal,
  langkah,
  namaLayar,
  tandaOpsi,
} from './alur.ts';
import { HalamanKalender, KalenderSobek, KepingKalender } from './Kalender.tsx';
import { KartuFakta } from './KartuFakta.tsx';
import { Teks } from './Teks.tsx';
import { catatPeristiwa, siramPeristiwa } from './kirim.ts';
import { KASUS, indeksFakta, kartuSoal, kunciBenar, petaKartu, urutanSoal } from './kasus.ts';
import { hariIniIso, penanda, type Penanda } from './tanggal.ts';
import { buatIdSesi, sumberAcakPeramban } from './sesi.ts';
import { perintahRiwayat } from './riwayat.ts';
import { isiSumber } from './sumber.ts';
import { angkaBesarSatuan } from './angka.ts';

/**
 * Komponen hanya `dispatch` dan merender (D-5).
 *
 * Tidak ada satu pun `useState` di berkas ini: seluruh keadaan permainan —
 * termasuk lipatan kartu, panel sumber yang terbuka, isian layar akhir, dan
 * apakah tombol "Mau coba kasus lain" sudah ditekan — hidup di `alur.ts`.
 * Waktu disuntikkan di sini, satu kali per aksi, supaya reducer tetap murni.
 */

interface Bungkus {
  keadaan: Keadaan;
  /** Peristiwa yang belum diserahkan ke `kirim.ts`. */
  antre: Peristiwa[];
}

type Pesan = { aksi: Aksi; waktu: number } | { bersihkan: number };

function reduksi(bungkus: Bungkus, pesan: Pesan): Bungkus {
  if ('bersihkan' in pesan) {
    return { ...bungkus, antre: bungkus.antre.slice(pesan.bersihkan) };
  }
  const hasil = langkah(bungkus.keadaan, pesan.aksi, pesan.waktu);
  if (hasil.keadaan === bungkus.keadaan && hasil.peristiwa.length === 0) return bungkus;
  return { keadaan: hasil.keadaan, antre: [...bungkus.antre, ...hasil.peristiwa] };
}

function awalBungkus(kasus: Kasus): Bungkus {
  return {
    keadaan: keadaanAwal({
      /*
       * Hidup di memori tab saja; tidak ditulis ke cookie maupun localStorage
       * (INV-9). `crypto.randomUUID` hanya ada di konteks aman, jadi id-nya
       * dibuat lewat `buatIdSesi` yang punya cadangan — memanggil
       * `randomUUID` langsung membuat halaman putih di alamat LAN (A3-T1).
       */
      sesi: buatIdSesi(sumberAcakPeramban()),
      kasus_id: kasus.kasus_id,
      urutanSoal: urutanSoal(kasus),
      kunciBenar: kunciBenar(kasus),
      kartuSoal: petaKartu(kasus),
    }),
    antre: [],
  };
}

export function Aplikasi(): JSX.Element {
  const kasus = KASUS;
  const hari = useMemo(() => penanda(kasus.tanggal_t), [kasus.tanggal_t]);
  /*
   * Tanggal hari ini dari jam perangkat, lewat fungsi tanggal murni yang sama.
   * Waktu disuntikkan sekali di sini, bukan dibaca di dalam fungsi itu, supaya
   * `hariIniIso` tetap bisa dites dengan waktu buatan.
   */
  const hariIni = useMemo(() => penanda(hariIniIso(new Date())), []);
  const [bungkus, dispatch] = useReducer(reduksi, kasus, awalBungkus);
  const { keadaan } = bungkus;

  const kirim = useCallback((aksi: Aksi): void => {
    dispatch({ aksi, waktu: Date.now() });
  }, []);

  // Cermin keadaan terakhir, hanya untuk jalur `pagehide` di bawah.
  const acuanKeadaan = useRef(keadaan);
  acuanKeadaan.current = keadaan;

  // Satu-satunya tempat waktu dibaca untuk peristiwa pembuka.
  useEffect(() => {
    kirim({ jenis: 'mulai', lebar_layar: window.innerWidth });
  }, [kirim]);

  /*
   * `pagehide` adalah kesempatan terakhir; halaman bisa mati sebelum React
   * sempat merender sekali lagi. Jadi peristiwa `tutup` TIDAK boleh lewat
   * `dispatch`: ia dihitung di sini juga dari reducer yang sama, lalu langsung
   * diserahkan ke kirim.ts dan disiram.
   *
   * Ini ditemukan bite-test: versi pertama memakai `dispatch` dan peristiwa
   * `tutup` tidak pernah sampai ke pengumpul, sehingga "di layar mana orang
   * berhenti" — justru yang paling ingin diketahui — selalu hilang.
   *
   * `acuanKeadaan` bukan sumber kebenaran kedua: ia hanya cermin keadaan
   * terakhir yang sudah dirender, dipakai satu kali di jalur yang tidak boleh
   * menunggu render berikutnya.
   */
  const sudahTutup = useRef(false);
  useEffect(() => {
    const tutup = (): void => {
      // `pagehide` menyala lebih dari sekali di ponsel (pindah tab lalu menutup,
      // atau halaman dipulihkan dari bfcache). Tanpa penjaga ini, `tutup`
      // dihitung ulang dari keadaan yang sama dan lahir dua kali dengan `urut`
      // yang sama — kembar persis yang terukur di data alpha.
      if (sudahTutup.current) return;
      sudahTutup.current = true;
      const hasil = langkah(acuanKeadaan.current, { jenis: 'tutup' }, Date.now());
      catatPeristiwa(hasil.peristiwa);
      siramPeristiwa();
    };
    window.addEventListener('pagehide', tutup);
    return () => {
      window.removeEventListener('pagehide', tutup);
    };
  }, []);

  // Peristiwa diserahkan ke kirim.ts di sini, bukan di dalam reducer: reducer
  // harus tetap murni, dan React boleh memanggilnya dua kali di StrictMode.
  useEffect(() => {
    if (bungkus.antre.length === 0) return;
    const jumlah = bungkus.antre.length;
    catatPeristiwa(bungkus.antre.slice(0, jumlah));
    dispatch({ bersihkan: jumlah });
  }, [bungkus.antre]);

  const indeks = useMemo(() => indeksFakta(kasus), [kasus]);
  const layar = keadaan.layar;
  const namaLayarKini = namaLayar(layar);

  // Berpindah layar mengembalikan gulir ke atas. Tanpa ini pemain yang menggulir
  // sampai tombol lalu menekannya mendarat di tengah kartu soal berikutnya dan
  // tidak pernah melihat kartu yang pertama — persis kegagalan yang dijaga D-4.
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [namaLayarKini]);

  /*
   * Satu entri riwayat per layar (A1-T7), diperbaiki di A4-T1.
   *
   * Versi lama mengingat sendiri layar terakhir yang dicatatnya, dan karena itu
   * tidak bisa membedakan "pemain maju" dari "peramban baru saja mundur". Setiap
   * `popstate` ia mendorong entri baru — memotong perjalanan pemain dan, di
   * ponsel pemilik, membuat kembali yang kedua keluar dari situs.
   *
   * Sekarang yang ditanya adalah entri riwayat itu sendiri: kalau `history.state`
   * sudah menunjuk layar ini, peramban sudah di tempat yang benar dan tidak ada
   * yang perlu didorong. Keputusannya fungsi murni di `riwayat.ts`, diuji dengan
   * urutan maju–mundur–maju lengkap.
   */
  useEffect(() => {
    const entri = (window.history.state as { layar?: string } | null)?.layar ?? null;
    const perintah = perintahRiwayat(entri, namaLayarKini);
    if (perintah === 'ganti') window.history.replaceState({ layar: namaLayarKini }, '');
    else if (perintah === 'dorong') window.history.pushState({ layar: namaLayarKini }, '');
  }, [namaLayarKini]);

  useEffect(() => {
    const mundur = (): void => {
      // Perpindahan layar tetap satu dispatch; komponen tidak pernah
      // mengubah layar sendiri.
      kirim({ jenis: 'mundur' });
    };
    window.addEventListener('popstate', mundur);
    return () => {
      window.removeEventListener('popstate', mundur);
    };
  }, [kirim]);

  const bukaSumber = useCallback(
    (fact_id: string): void => {
      const soal_id = layar.jenis === 'soal' ? (keadaan.urutanSoal[layar.nomor] ?? null) : null;
      kirim({ jenis: 'buka_sumber', fact_id, soal_id });
    },
    [kirim, layar, keadaan.urutanSoal],
  );


  return (
    <>
      {/*
        Keping kalender hanya di layar soal: di layar pertama tempatnya diambil
        halaman kalender besar, dan dua kalender sekaligus hanya mengulang diri
        sendiri (docs/desain.md, "Tanda tangan").
      */}
      {layar.jenis === 'soal' && (
        <header className="penanda" role="banner">
          {/* Kolomnya dibungkus, bukan ditempel ke tiap anak: lihat .penanda-kolom (A4-T2). */}
          <div className="penanda-kolom">
            <KepingKalender hari={hari} />
            <TitikSoal jumlah={kasus.soal.length} sekarang={layar.nomor} />
          </div>
        </header>
      )}

      <main className="halaman" id="isi">
        {layar.jenis === 'pembuka' && (
          <LayarPembuka kasus={kasus} hari={hari} kirim={kirim} bukaSumber={bukaSumber} />
        )}
        {layar.jenis === 'soal' && (
          <LayarSoal
            kasus={kasus}
            keadaan={keadaan}
            nomor={layar.nomor}
            kirim={kirim}
            bukaSumber={bukaSumber}
            indeks={indeks}
          />
        )}
        {layar.jenis === 'pembukaan' && (
          <LayarPembukaan kasus={kasus} hari={hari} kirim={kirim} bukaSumber={bukaSumber} />
        )}
        {layar.jenis === 'akhir' && (
          <LayarAkhir keadaan={keadaan} kirim={kirim} hariIni={hariIni} />
        )}
      </main>

      {(layar.jenis === 'pembuka' || layar.jenis === 'akhir') && <Kaki kasus={kasus} />}

    </>
  );
}

/**
 * Pengamat tumpukan kartu (A1-T2).
 *
 * Komponen **hanya** meneruskan "masuk layar" dan "keluar layar" ke reducer;
 * seluruh penjumlahan terjadi di `alur.ts`. Kalau penjumlahannya dikerjakan di
 * sini, tidak ada satu pun tes yang bisa membuktikannya.
 */
function usePengamatKartu(
  soal_id: string,
  kirim: (aksi: Aksi) => void,
): RefObject<HTMLDivElement> {
  const acuan = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const elemen = acuan.current;
    if (elemen === null) return;

    /*
     * Laporan pertama TIDAK menunggu pengamat.
     *
     * Saat layar soal dirender, gulir sudah dikembalikan ke atas dan tumpukan
     * kartu berada di puncak halaman — kartu terlihat menurut susunannya
     * sendiri, bukan menurut tebakan. Mengandalkan panggilan pertama pengamat
     * membuat metriknya diam-diam nol di peramban yang menunda panggilan itu,
     * dan metrik yang diam-diam nol adalah persis kegagalan F-1 yang sedang
     * ditambal. Ditemukan bite-test: di pane tanpa frame, pengamat tidak pernah
     * melapor sama sekali dan ketiga soal tercatat nol detik.
     *
     * Pengamat tetap dipasang dan tetap yang menentukan sisanya: begitu ia
     * melapor "keluar", reducer menutup jendela waktunya.
     */
    kirim({ jenis: 'kartu_masuk_layar', soal_id });

    if (typeof IntersectionObserver === 'undefined') {
      return () => {
        kirim({ jenis: 'kartu_keluar_layar', soal_id });
      };
    }
    const pengamat = new IntersectionObserver(
      (masukan) => {
        for (const m of masukan) {
          kirim({
            jenis: m.isIntersecting ? 'kartu_masuk_layar' : 'kartu_keluar_layar',
            soal_id,
          });
        }
      },
      { threshold: 0.5 },
    );
    pengamat.observe(elemen);
    return () => {
      pengamat.disconnect();
      // Meninggalkan layar menutup jendela waktu yang sedang berjalan.
      kirim({ jenis: 'kartu_keluar_layar', soal_id });
    };
  }, [soal_id, kirim]);
  return acuan;
}

/** Tiga titik: memang tiga soal berurutan, jadi penanda urutan dipakai di sini. */
function TitikSoal({ jumlah, sekarang }: { jumlah: number; sekarang: number }): JSX.Element {
  return (
    <p className="titik-soal" aria-label={`Soal ${String(sekarang + 1)} dari ${String(jumlah)}`}>
      {Array.from({ length: jumlah }, (_, nomor) => (
        <span
          key={nomor}
          aria-hidden="true"
          className={`titik${nomor === sekarang ? ' titik-kini' : ''}${
            nomor < sekarang ? ' titik-lewat' : ''
          }`}
        />
      ))}
    </p>
  );
}

function LayarPembuka({
  kasus,
  hari,
  kirim,
  bukaSumber,
}: {
  kasus: Kasus;
  hari: ReturnType<typeof penanda>;
  kirim: (aksi: Aksi) => void;
  bukaSumber: (fact_id: string) => void;
}): JSX.Element {
  return (
    <section className="layar layar-pembuka" aria-labelledby="judul-pembuka">
      <HalamanKalender hari={hari} />
      <h1 id="judul-pembuka" className="mundur">
        Kita mundur ke {hari.hari}, {hari.panjang}.
      </h1>
      {/* v3 (D-6): satu kalimat, tanpa tiga aturan main. Rupa layar ini
          dikerjakan T-06; di sini hanya isinya yang mengikuti skema baru. */}
      <p className="hook">
        <Teks teks={kasus.pembuka.kalimat} bukaSumber={bukaSumber} />
      </p>
      <button
        type="button"
        className="tombol-utama"
        onClick={() => {
          kirim({ jenis: 'lanjut' });
        }}
      >
        Mulai kasus
      </button>
    </section>
  );
}

/**
 * "dua dokumen", bukan "2 dokumen" — kalimat pengantar dibaca sebagai kalimat,
 * dan angka kecil yang dieja tidak bersaing dengan angka di dalam lembar.
 */
export function angkaKata(n: number): string {
  const kata = ['nol', 'satu', 'dua', 'tiga', 'empat', 'lima', 'enam', 'tujuh', 'delapan'];
  return kata[n] ?? String(n);
}

/** Gerak halus hanya kalau pemain tidak memintanya dihentikan. */
function gerakHalus(): ScrollBehavior {
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth';
}

/**
 * Baris istilah (patokan): satu baris berbingkai >= 44 px dengan panah, artinya
 * terbuka tepat di bawahnya. Menggantikan `<details>` v2 yang berhuruf kapital
 * dan tidak tampak bisa diketuk.
 *
 * Terbuka/tertutupnya adalah keadaan tampilan murni — tidak ada peristiwa D-6
 * untuknya dan tidak ada yang perlu dicatat — tetapi ia tetap tidak boleh hidup
 * di `useState` (D-5 M3.1). Ia dipegang `<details>` bawaan peramban, yang
 * menyimpan keadaannya sendiri di DOM.
 */
/**
 * Pengamat opsi pertama (D-4): memberi tahu reducer apakah opsi pertama sedang
 * terlihat. Ia **hanya** `dispatch` — keputusan "bilah mana yang tampil" ada di
 * `bilahBawah()`, fungsi murni yang dites.
 *
 * Ambang 0,6 seperti patokan: opsi dianggap terlihat kalau lebih dari separuh
 * badannya masuk layar, bukan kalau ujungnya baru menyembul.
 */
function usePengamatOpsi(
  soal_id: string,
  kirim: (aksi: Aksi) => void,
): RefObject<HTMLLabelElement> {
  const acuan = useRef<HTMLLabelElement>(null);
  useEffect(() => {
    const simpul = acuan.current;
    if (simpul === null || typeof IntersectionObserver === 'undefined') {
      // Tanpa pengamat, bilah "Jawab di bawah" akan menetap selamanya dan
      // menutupi opsi. Lebih baik menganggapnya terlihat.
      kirim({ jenis: 'opsi_terlihat', soal_id, terlihat: true });
      return;
    }
    const pengamat = new IntersectionObserver(
      (masuk) => {
        const butir = masuk[0];
        if (butir === undefined) return;
        kirim({ jenis: 'opsi_terlihat', soal_id, terlihat: butir.isIntersecting });
      },
      { threshold: 0.6 },
    );
    pengamat.observe(simpul);
    return () => {
      pengamat.disconnect();
    };
  }, [soal_id, kirim]);
  return acuan;
}

/**
 * Isi yang terbuka DI DALAM lembar (D-5). Apa yang tampil ditentukan
 * `isiSumber()`, fungsi murni yang dites; komponen ini hanya menatanya.
 */
function IsiLembarTerbuka({
  fakta,
  indeks,
}: {
  fakta: Fakta;
  indeks: ReadonlyMap<string, Fakta>;
}): JSX.Element {
  const isi = isiSumber(fakta, indeks);
  return (
    <>
      <p className="meta">Kalimat resminya</p>
      <p className="isi">{isi.kalimatResmi}</p>

      {isi.caraHitung !== null && <p className="isi">{isi.caraHitung}</p>}

      <p className="meta">{isi.sejakKapan}</p>

      {isi.dihitungDari.length > 0 && (
        <p className="meta">Dihitung dari: {isi.dihitungDari.join(' · ')}</p>
      )}

      <details className="rincian-teknis">
        <summary>Rincian teknis</summary>
        <dl className="rincian">
          {isi.rincian.map((baris) => (
            <div key={baris.label}>
              <dt>{baris.label}</dt>
              <dd>
                <code>{baris.nilai}</code>
              </dd>
            </div>
          ))}
        </dl>
      </details>
    </>
  );
}

function BarisIstilah({ istilah }: { istilah: Istilah[] }): JSX.Element {
  return (
    <details className="istilah-lipat" data-uid="istilah">
      <summary className="baris-istilah">
        <span>
          Arti istilah:{' '}
          {istilah.map((butir, nomor) => (
            <span key={butir.kata}>
              {nomor > 0 && ' · '}
              <u>{butir.kata.toLowerCase()}</u>
            </span>
          ))}
        </span>
        <span className="panah" aria-hidden="true">
          ›
        </span>
      </summary>
      <div className="buka istilah-buka">
        {istilah.map((butir) => (
          <p className="isi" key={butir.kata}>
            <b>{butir.kata}</b> — {butir.arti}
          </p>
        ))}
      </div>
    </details>
  );
}

function LayarSoal({
  kasus,
  keadaan,
  nomor,
  kirim,
  bukaSumber,
  indeks,
}: {
  kasus: Kasus;
  keadaan: Keadaan;
  nomor: number;
  kirim: (aksi: Aksi) => void;
  bukaSumber: (fact_id: string) => void;
  indeks: ReadonlyMap<string, Fakta>;
}): JSX.Element {
  const soal: Soal | undefined = kasus.soal[nomor];
  if (soal === undefined) return <p>Soal tidak ditemukan.</p>;
  const s = keadaan.soal[soal.soal_id];
  if (s === undefined) return <p>Soal tidak ditemukan.</p>;

  const kartu = kartuSoal(kasus, soal);
  const menentukan = new Set(soal.kartu_penentu);
  const acuanTumpukan = usePengamatKartu(soal.soal_id, kirim);
  const acuanOpsi = usePengamatOpsi(soal.soal_id, kirim);
  const bilah = bilahBawah(s, nomor, kasus.soal.length);

  return (
    <section className="layar layar-soal" aria-labelledby={`judul-${soal.soal_id}`}>
      <h2 className="tersembunyi" id={`judul-${soal.soal_id}`}>
        Soal {nomor + 1} dari {kasus.soal.length}
      </h2>

      {/*
        Urutan D-3, disalin dari patokan: petunjuk (soal 1) -> pesan teman ->
        pengantar -> lembar -> istilah -> judul -> opsi -> kembali.

        Yang pindah ke atas HANYA pesan temannya. Lembar tetap menempel tepat di
        atas judul pertanyaan dan opsi, seperti permintaan pemilik semula —
        "orang kasih kabar, kita verify" berarti kabarnya dibaca dulu, bukan
        buktinya dijauhkan dari pertanyaannya.
      */}
      {soal.petunjuk !== null && (
        <p className="meta petunjuk" data-uid="petunjuk">
          {soal.petunjuk}
        </p>
      )}

      <figure
        className="pesan"
        data-uid="pesan"
        aria-label={`Pesan dari ${soal.pesan.nama}, ${soal.pesan.jam}`}
      >
        <figcaption className="pesan-nama">{soal.pesan.nama}</figcaption>
        <blockquote className="pesan-balon">
          {/*
            Dirender POLOS, tanpa Teks: angka di dalam ucapan orang adalah
            ucapan, bukan fakta (INV-4). Menautkannya membuat kabar tampak sudah
            terverifikasi sebelum pemain memeriksanya. Validator menolak tautan
            di sini lewat mode ketat 'ucapan' (T-01).
          */}
          <p className="isi">{soal.pesan.isi}</p>
          <time className="pesan-jam">{soal.pesan.jam}</time>
        </blockquote>
      </figure>

      <p className="meta antar" id={`antar-${soal.soal_id}`} data-uid="antar">
        Cek omongan {soal.pesan.nama} ke {angkaKata(kartu.length)} dokumen ini:
      </p>

      <div className="tumpukan" ref={acuanTumpukan}>
        {kartu.map((fakta) => (
          <KartuFakta
            key={fakta.fact_id}
            fakta={fakta}
            menentukan={s.dikunci && menentukan.has(fakta.fact_id)}
            bukaSumber={bukaSumber}
            terbuka={keadaan.sumberTerbuka === fakta.fact_id}
          >
            <IsiLembarTerbuka fakta={fakta} indeks={indeks} />
          </KartuFakta>
        ))}
      </div>

      {soal.istilah.length > 0 && (
        <BarisIstilah istilah={soal.istilah} />
      )}

      <h1 className="judul tanya" id={`tanya-${soal.soal_id}`} data-uid="tanya">
        {soal.tanya}
      </h1>

      <fieldset className="pilihan" disabled={s.dikunci}>
        <legend className="tersembunyi">Pilih satu jawaban</legend>
        {soal.pilihan.map((p) => {
          // "Opsi mana mendapat tanda apa" adalah aturan, dan aturannya ada di
          // reducer sebagai fungsi murni yang dites (A1-T4, A4-T4).
          const tanda = tandaOpsi(s, p.kunci, soal.jawaban);
          return (
            <label
              key={p.kunci}
              className={`opsi aksi opsi-${tanda.keadaan}`}
              data-uid={`opsi:${p.kunci}`}
              ref={p.kunci === soal.pilihan[0]?.kunci ? acuanOpsi : undefined}
            >
              <input
                type="radio"
                name={soal.soal_id}
                value={p.kunci}
                checked={s.kunci === p.kunci}
                onChange={() => {
                  kirim({ jenis: 'pilih', soal_id: soal.soal_id, kunci: p.kunci });
                }}
              />
              <span className="opsi-huruf" aria-hidden="true">
                {p.kunci}
              </span>
              <span className="opsi-teks">
                {/* Opsi juga ucapan: polos, tanpa tebal dan tanpa tautan. */}
                {p.teks}
                {tanda.label.map((kata) => (
                  <span
                    key={kata}
                    className={
                      kata === LABEL_COCOK
                        ? 'opsi-tanda opsi-tanda-cocok'
                        : 'opsi-tanda opsi-tanda-pemain'
                    }
                  >
                    {kata}
                  </span>
                ))}
              </span>
            </label>
          );
        })}
      </fieldset>

      <button
        type="button"
        className="kembali"
        data-uid="kembali"
        onClick={() => {
          kirim({ jenis: 'kembali_ke_kartu', soal_id: soal.soal_id });
          // Menggulir adalah kerja tampilan, bukan keadaan permainan; yang
          // dicatat tetap satu peristiwa dari reducer di atas. Mendarat di
          // kalimat pengantar supaya kepingnya tidak menutupi lembar pertama.
          document
            .getElementById(`antar-${soal.soal_id}`)
            ?.scrollIntoView({ block: 'start', behavior: gerakHalus() });
        }}
      >
        ↑ Kembali ke dokumen
      </button>

      {/*
        Wadah `role="status"` ada sejak layar dirender; isinya yang berubah.
        Wadah yang lahir bersama isinya kadang tidak terbaca pembaca layar.
      */}
      <div className="kunci-jawaban" role="status" aria-live="polite">
        {s.dikunci && (
          <>
            <p className={`cap${s.benar === true ? ' cap-cocok' : ' cap-belum'}`}>
              <span aria-hidden="true" className="cap-tanda">
                {s.benar === true ? '✓' : '!'}
              </span>
              {s.benar === true ? 'Cocok dengan kartu' : 'Belum cocok dengan kartu'}
            </p>

            {/* Salinan ringkas kartu penentu, supaya mata tidak menggulir balik. */}
            <div className="penentu">
              <p className="penentu-judul">Kartu yang menentukan</p>
              {kartu
                .filter((f) => menentukan.has(f.fact_id))
                .map((f) => (
                  <article
                    key={f.fact_id}
                    className={`lembar lembar-ringkas${
                      f.sumber.jenis === 'turunan' ? ' lembar-hitung' : ''
                    }`}
                  >
                    <div className="lembar-garis" aria-hidden="true" />
                    <p className="lembar-ringkas-kepala">{f.awam?.kepala ?? f.fact_id}</p>
                    <p className="lembar-isi">
                      <Teks teks={f.awam?.isi ?? f.klaim} bukaSumber={bukaSumber} tebalSaja />
                    </p>
                  </article>
                ))}
            </div>

            <p className="teks-kunci">
              <Teks teks={soal.penjelasan} bukaSumber={bukaSumber} />
            </p>
          </>
        )}
      </div>

      {/*
        Tombol utama tidak pernah tampil dalam keadaan mati (`docs/desain.md`):
        sebelum ada pilihan ia tidak dirender sama sekali, bukan dirender abu-abu.
      */}
      {/*
        Bilah bawah tiga keadaan (D-4). Yang memutuskan adalah `bilahBawah()`,
        fungsi murni di alur.ts; komponen ini hanya merender jawabannya.

        "tidak-ada" adalah jawaban yang sah dan penting: tombol utama tidak
        pernah tampil mati (INV-12), jadi ketika belum ada yang bisa dikunci dan
        opsinya sudah terlihat, bilahnya menyingkir — bukan berubah kelabu.
      */}
      {bilah.jenis !== 'tidak-ada' && (
        <div className="tindakan" data-uid="bilah">
          <button
            type="button"
            className={bilah.jenis === 'turun' ? 'tombol-utama tombol-turun' : 'tombol-utama'}
            onClick={() => {
              if (bilah.jenis === 'turun') {
                document
                  .getElementById(`tanya-${soal.soal_id}`)
                  ?.scrollIntoView({ block: 'start', behavior: gerakHalus() });
                return;
              }
              if (bilah.jenis === 'kunci') {
                kirim({ jenis: 'kunci_jawaban', soal_id: soal.soal_id });
                return;
              }
              kirim({ jenis: 'lanjut' });
            }}
          >
            {bilah.label}
          </button>
        </div>
      )}

    </section>
  );
}

/** Gelembung obrolan: satu-satunya bentuk gelembung di seluruh antarmuka (D-8). */

function LayarPembukaan({
  kasus,
  hari,
  kirim,
  bukaSumber,
}: {
  kasus: Kasus;
  hari: ReturnType<typeof penanda>;
  kirim: (aksi: Aksi) => void;
  bukaSumber: (fact_id: string) => void;
}): JSX.Element {
  // Gulir terjauh dicatat lewat reducer, bukan disimpan di komponen.
  useEffect(() => {
    const catat = (): void => {
      const tinggi = document.documentElement.scrollHeight - window.innerHeight;
      const persen = tinggi <= 0 ? 100 : (window.scrollY / tinggi) * 100;
      kirim({ jenis: 'catat_gulir', persen });
    };
    catat();
    window.addEventListener('scroll', catat, { passive: true });
    return () => {
      window.removeEventListener('scroll', catat);
    };
  }, [kirim]);

  return (
    <section className="layar layar-pembukaan" aria-labelledby="judul-pembukaan">
      <KalenderSobek hari={hari} />
      <h1 id="judul-pembukaan" className="waktu-jalan">
        Waktu berjalan lagi
      </h1>
      {/*
        Jalan pintas (A4-T5). Garis waktunya TIDAK disembunyikan dan TIDAK
        dilipat: ia isi layar ini, dan melipatnya akan menyembunyikan justru
        bagian yang membuat "waktu berjalan lagi" terasa. Yang ditambahkan hanya
        jalan bagi pemain yang ingin langsung ke jawabannya.
      */}
      <p className="loncat">
        <button
          type="button"
          className="rujukan"
          onClick={() => {
            kirim({ jenis: 'loncat_ke_ringkasan' });
            // Gerak halus hanya kalau pemain tidak memintanya dihentikan.
            const diam = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
            document.getElementById('judul-bacaan')?.scrollIntoView({
              behavior: diam ? 'auto' : 'smooth',
              block: 'start',
            });
          }}
        >
          Langsung ke ringkasan ↓
        </button>
      </p>
      <p className="mundur">Inilah yang terjadi sesudah {hari.panjang}.</p>
      <p className="nama-asli">
        Nama aslinya: {kasus.emiten.nama} ({kasus.emiten.simbol}).
      </p>

      <ol className="garis-waktu">
        {kasus.pembukaan.paragraf.map((paragraf, nomor) => (
          <li key={nomor}>
            <KepingTanggal kasus={kasus} teks={paragraf} />
            <Teks teks={paragraf} bukaSumber={bukaSumber} />
          </li>
        ))}
      </ol>

      <section className="bacaan" aria-labelledby="judul-bacaan">
        <h2 id="judul-bacaan">Apa yang bisa dan tidak bisa dibaca pada {hari.panjang}</h2>
        <h3>Bisa dibaca</h3>
        <ul>
          {kasus.pembukaan.bisa_dibaca.map((baris, nomor) => (
            <li key={nomor}>
              <Teks teks={baris} bukaSumber={bukaSumber} />
            </li>
          ))}
        </ul>
        <h3>Tidak bisa dibaca</h3>
        <ul>
          {kasus.pembukaan.tidak_bisa_dibaca.map((baris, nomor) => (
            <li key={nomor}>
              <Teks teks={baris} bukaSumber={bukaSumber} />
            </li>
          ))}
        </ul>
        <h3>Yang kami singkirkan dari kartu</h3>
        <ul>
          {kasus.pembukaan.disingkirkan.map((baris, nomor) => (
            <li key={nomor}>
              <Teks teks={baris} bukaSumber={bukaSumber} />
            </li>
          ))}
        </ul>
      </section>

      <JejakVerifikasi kasus={kasus} />

      <div className="tindakan">
        <button
          type="button"
          className="tombol-utama"
          onClick={() => {
            kirim({ jenis: 'lanjut' });
          }}
        >
          Lanjut: tiga pertanyaan singkat
        </button>
      </div>
    </section>
  );
}

/**
 * Keping tanggal di garis waktu (D-8). Tanggalnya tidak diketik tangan: ia
 * diambil dari `tersedia_sejak` fakta pertama yang ditautkan paragraf itu,
 * sehingga keping dan isinya tidak bisa berbeda.
 */
function KepingTanggal({ kasus, teks }: { kasus: Kasus; teks: string }): JSX.Element | null {
  const rujukan = ambilRujukan(teks).find((r) => !PENANDA_BUKAN_FAKTA.includes(r.fact_id));
  if (rujukan === undefined) return null;
  const fakta = kasus.fakta.find((f) => f.fact_id === rujukan.fact_id);
  if (fakta?.tersedia_sejak == null) return null;
  return <span className="keping-tanggal">{penanda(fakta.tersedia_sejak).pendek}</span>;
}

/**
 * Jejak verifikasi (A1-T5).
 *
 * **Tidak** memakai bahan lembar: temuan adalah suara *kami*, bukan dokumen
 * resmi, dan lembar yang dipakai untuk segalanya berhenti berarti "ini
 * sumbernya" (`docs/desain.md`). Satu paragraf pengantar, selebihnya di bawah
 * lipatan yang penandanya tetap terlihat. Angkanya dibaca orang, bukan mesin.
 */
function JejakVerifikasi({ kasus }: { kasus: Kasus }): JSX.Element {
  return (
    <section className="jejak" aria-labelledby="judul-jejak">
      <h2 id="judul-jejak">Jejak verifikasi</h2>
      <p>
        Sebelum kasus ini dibuat, rantai laporan kepemilikan diperiksa dengan sepuluh aturan.
        Hasilnya {kasus.temuan.length} hal yang tidak cocok — itulah sebabnya dua laporan
        disingkirkan dari kartu.
      </p>
      <details className="jejak-rinci">
        <summary>Lihat kesepuluh pemeriksaan dan hasilnya</summary>
        <ul className="daftar-temuan">
          {kasus.temuan.map((temuan) => (
            <li key={temuan.temuan_id}>
              <p className="temuan-ringkas">{temuan.ringkasan}</p>
              <ul className="angka-temuan">
                {temuan.angka.map((angka) => (
                  <li key={angka.label}>
                    {angka.label}: <strong>{angkaBesarSatuan(angka.nilai, angka.satuan)}</strong>
                  </li>
                ))}
              </ul>
            </li>
          ))}
        </ul>
        <p className="meta">
          Aturan yang tidak bisa dijalankan atas kasus ini:{' '}
          {kasus.pemeriksaan.filter((p) => !p.dijalankan).length} dari{' '}
          {kasus.pemeriksaan.length}.
        </p>
      </details>
    </section>
  );
}

const TERASA = ['ujian hafalan', 'membaca data', 'menebak harga'] as const;
const SUMBER_JAWABAN = ['kartu fakta', 'ingatan atau pengetahuan sendiri', 'tebakan'] as const;

function LayarAkhir({
  keadaan,
  kirim,
  hariIni,
}: {
  keadaan: Keadaan;
  kirim: (aksi: Aksi) => void;
  hariIni: Penanda;
}): JSX.Element {
  if (keadaan.akhirTerkirim) {
    return (
      <section className="layar layar-akhir" aria-labelledby="judul-terima">
        <h1 id="judul-terima">Terima kasih.</h1>
        <div className="kembali-hari-ini">
          <HalamanKalender hari={hariIni} />
          <p>Kamu kembali ke hari ini.</p>
        </div>
        <p>Jawabanmu tercatat tanpa nama, tanpa akun, dan tanpa cookie.</p>
        {!keadaan.minatDitekan ? (
          <button
            type="button"
            className="tombol-kedua"
            onClick={() => {
              kirim({ jenis: 'minat_kasus_lain' });
            }}
          >
            Mau coba kasus lain
          </button>
        ) : (
          <div className="pesan-alpha">
            <p>
              <strong>Tidak semua saham seperti ini.</strong> Kasus berikutnya adalah perusahaan
              yang sehat — sedang kami siapkan. Selamat belajar membaca data, folks.
            </p>
          </div>
        )}
      </section>
    );
  }

  return (
    <section className="layar layar-akhir" aria-labelledby="judul-akhir">
      <h1 id="judul-akhir">Tiga pertanyaan singkat</h1>
      <p className="meta">
        Semuanya boleh dilewati. Di bawahnya ada kotak kalau kamu mau menulis.
      </p>

      <fieldset className="tanya-akhir">
        <legend>Seberapa layak kasus ini kamu bagikan ke teman?</legend>
        <p className="jangkar">1 = tidak akan kubagikan · 5 = langsung kubagikan</p>
        <div className="deret-pilihan">
          {[1, 2, 3, 4, 5].map((nilai) => (
            <label key={nilai} className={`petak${keadaan.akhir.rating === nilai ? ' petak-pilih' : ''}`}>
              <input
                type="radio"
                name="rating"
                checked={keadaan.akhir.rating === nilai}
                onChange={() => {
                  kirim({ jenis: 'isi_akhir', medan: 'rating', nilai });
                }}
              />
              <span>{nilai}</span>
            </label>
          ))}
        </div>
      </fieldset>

      <fieldset className="tanya-akhir">
        <legend>Kasus tadi terasa seperti…</legend>
        <div className="deret-pilihan">
          {TERASA.map((nilai) => (
            <label key={nilai} className={`petak${keadaan.akhir.terasa === nilai ? ' petak-pilih' : ''}`}>
              <input
                type="radio"
                name="terasa"
                checked={keadaan.akhir.terasa === nilai}
                onChange={() => {
                  kirim({ jenis: 'isi_akhir', medan: 'terasa', nilai });
                }}
              />
              <span>{nilai}</span>
            </label>
          ))}
        </div>
      </fieldset>

      <fieldset className="tanya-akhir">
        <legend>Kamu paling sering menjawab dari…</legend>
        <div className="deret-pilihan">
          {SUMBER_JAWABAN.map((nilai) => (
            <label
              key={nilai}
              className={`petak${keadaan.akhir.sumber_jawaban === nilai ? ' petak-pilih' : ''}`}
            >
              <input
                type="radio"
                name="sumber_jawaban"
                checked={keadaan.akhir.sumber_jawaban === nilai}
                onChange={() => {
                  kirim({ jenis: 'isi_akhir', medan: 'sumber_jawaban', nilai });
                }}
              />
              <span>{nilai}</span>
            </label>
          ))}
        </div>
      </fieldset>

      <label className="tanya-akhir kotak-teks">
        <span className="label-teks">Ada yang membingungkan atau ingin kamu sampaikan?</span>
        <textarea
          rows={4}
          value={keadaan.akhir.teks ?? ''}
          onChange={(peristiwa) => {
            kirim({ jenis: 'isi_akhir', medan: 'teks', nilai: peristiwa.target.value });
          }}
        />
      </label>

      <div className="tindakan">
        <button
          type="button"
          className="tombol-utama"
          onClick={() => {
            kirim({ jenis: 'kirim_akhir' });
          }}
        >
          Selesai
        </button>
      </div>
    </section>
  );
}

function Kaki({ kasus }: { kasus: Kasus }): JSX.Element {
  return (
    <footer className="kaki" aria-label="Tiga kalimat tetap">
      <ul>
        {kasus.disclaimer.map((kalimat) => (
          <li key={kalimat}>{kalimat}</li>
        ))}
      </ul>
    </footer>
  );
}
