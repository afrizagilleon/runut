import { useCallback, useEffect, useMemo, useReducer, useRef } from 'react';
import { PENANDA_BUKAN_FAKTA, ambilRujukan } from '../../factory/skema/rujukan.ts';
import type { Fakta, Kasus, Soal } from '../../factory/skema/tipe.ts';
import {
  type Aksi,
  type Keadaan,
  type Peristiwa,
  keadaanAwal,
  langkah,
  namaLayar,
} from './alur.ts';
import { HalamanKalender, KalenderSobek, KepingKalender } from './Kalender.tsx';
import { KartuFakta } from './KartuFakta.tsx';
import { PanelSumber } from './PanelSumber.tsx';
import { Teks } from './Teks.tsx';
import { catatPeristiwa, siramPeristiwa } from './kirim.ts';
import { KASUS, indeksFakta, kartuSoal, kunciBenar, petaKartu, urutanSoal } from './kasus.ts';
import { penanda } from './tanggal.ts';

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
      // Hidup di memori tab saja; tidak ditulis ke cookie maupun localStorage (INV-9).
      sesi: crypto.randomUUID(),
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
  useEffect(() => {
    const tutup = (): void => {
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

  const bukaSumber = useCallback(
    (fact_id: string): void => {
      const soal_id = layar.jenis === 'soal' ? (keadaan.urutanSoal[layar.nomor] ?? null) : null;
      kirim({ jenis: 'buka_sumber', fact_id, soal_id });
    },
    [kirim, layar, keadaan.urutanSoal],
  );

  const faktaSumber: Fakta | null =
    keadaan.sumberTerbuka === null ? null : (indeks.get(keadaan.sumberTerbuka) ?? null);

  return (
    <>
      {/*
        Keping kalender hanya di layar soal: di layar pertama tempatnya diambil
        halaman kalender besar, dan dua kalender sekaligus hanya mengulang diri
        sendiri (docs/desain.md, "Tanda tangan").
      */}
      {layar.jenis === 'soal' && (
        <header className="penanda" role="banner">
          <KepingKalender hari={hari} />
          <TitikSoal jumlah={kasus.soal.length} sekarang={layar.nomor} />
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
          />
        )}
        {layar.jenis === 'pembukaan' && (
          <LayarPembukaan kasus={kasus} hari={hari} kirim={kirim} bukaSumber={bukaSumber} />
        )}
        {layar.jenis === 'akhir' && <LayarAkhir keadaan={keadaan} kirim={kirim} />}
      </main>

      <Kaki kasus={kasus} />

      {faktaSumber !== null && (
        <PanelSumber
          fakta={faktaSumber}
          tutup={() => {
            kirim({ jenis: 'tutup_sumber' });
          }}
          bukaSumber={bukaSumber}
        />
      )}
    </>
  );
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
      <p className="hook">
        <Teks teks={kasus.pembuka.hook} bukaSumber={bukaSumber} />
      </p>
      <ul className="aturan-main">
        {kasus.pembuka.aturan.map((baris, nomor) => (
          <li key={nomor}>
            <Teks teks={baris} bukaSumber={bukaSumber} />
          </li>
        ))}
      </ul>
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

function LayarSoal({
  kasus,
  keadaan,
  nomor,
  kirim,
  bukaSumber,
}: {
  kasus: Kasus;
  keadaan: Keadaan;
  nomor: number;
  kirim: (aksi: Aksi) => void;
  bukaSumber: (fact_id: string) => void;
}): JSX.Element {
  const soal: Soal | undefined = kasus.soal[nomor];
  if (soal === undefined) return <p>Soal tidak ditemukan.</p>;
  const s = keadaan.soal[soal.soal_id];
  if (s === undefined) return <p>Soal tidak ditemukan.</p>;

  const kartu = kartuSoal(kasus, soal);
  const terakhir = nomor + 1 >= kasus.soal.length;
  const menentukan = new Set(soal.kartu);

  return (
    <section className="layar layar-soal" aria-labelledby={`judul-${soal.soal_id}`}>
      <h2 className="tersembunyi" id={`judul-${soal.soal_id}`}>
        Soal {nomor + 1} dari {kasus.soal.length}
      </h2>

      <div className="tumpukan">
        {kartu.map((fakta) => (
          <KartuFakta
            key={fakta.fact_id}
            fakta={fakta}
            terlipat={s.terlipat[fakta.fact_id] === true}
            menentukan={s.dikunci && menentukan.has(fakta.fact_id)}
            bukaSumber={bukaSumber}
            lipat={(fact_id) => {
              kirim({ jenis: 'lipat_kartu', soal_id: soal.soal_id, fact_id });
            }}
            buka={(fact_id) => {
              kirim({ jenis: 'buka_kartu', soal_id: soal.soal_id, fact_id });
            }}
          />
        ))}
      </div>

      {soal.istilah.length > 0 && (
        <dl className="istilah">
          {soal.istilah.map((butir) => (
            <div key={butir.kata} className="istilah-butir">
              <dt>{butir.kata}</dt>
              <dd>{butir.arti}</dd>
            </div>
          ))}
        </dl>
      )}

      <Gelembung teks={soal.batang} bukaSumber={bukaSumber} />

      <button
        type="button"
        className="tombol-kecil lihat-kartu"
        onClick={() => {
          kirim({ jenis: 'lihat_kartu_lagi', soal_id: soal.soal_id });
        }}
      >
        Lihat kartu lagi
      </button>

      <fieldset className="pilihan" disabled={s.dikunci}>
        <legend className="tersembunyi">Pilih satu jawaban</legend>
        {soal.pilihan.map((p) => {
          const dipilih = s.kunci === p.kunci;
          const tepat = s.dikunci && p.kunci === soal.jawaban;
          return (
            <label
              key={p.kunci}
              className={`opsi${dipilih ? ' opsi-dipilih' : ''}${tepat ? ' opsi-tepat' : ''}`}
            >
              <input
                type="radio"
                name={soal.soal_id}
                value={p.kunci}
                checked={dipilih}
                onChange={() => {
                  kirim({ jenis: 'pilih', soal_id: soal.soal_id, kunci: p.kunci });
                }}
              />
              <span className="opsi-huruf" aria-hidden="true">
                {p.kunci}
              </span>
              <span className="opsi-teks">
                <Teks teks={p.teks} bukaSumber={bukaSumber} interaktif={false} />
              </span>
            </label>
          );
        })}
      </fieldset>

      {s.dikunci && (
        <div className="kunci-jawaban" role="status">
          <p className={`cap${s.benar === true ? ' cap-cocok' : ' cap-belum'}`}>
            <span aria-hidden="true" className="cap-tanda">
              {s.benar === true ? '✓' : '!'}
            </span>
            {s.benar === true ? 'Cocok dengan kartu' : 'Belum cocok dengan kartu'}
          </p>
          <p className="teks-kunci">
            <Teks teks={soal.penjelasan} bukaSumber={bukaSumber} />
          </p>
        </div>
      )}

      <div className="tindakan">
        {!s.dikunci ? (
          <button
            type="button"
            className="tombol-utama"
            disabled={s.kunci === null}
            onClick={() => {
              kirim({ jenis: 'kunci_jawaban', soal_id: soal.soal_id });
            }}
          >
            Kunci jawaban
          </button>
        ) : (
          <button
            type="button"
            className="tombol-utama"
            onClick={() => {
              kirim({ jenis: 'lanjut' });
            }}
          >
            {terakhir ? 'Lihat yang terjadi sesudahnya' : `Lanjut ke soal ${String(nomor + 2)}`}
          </button>
        )}
      </div>

      {nomor > 0 && (
        <button
          type="button"
          className="tombol-kecil"
          onClick={() => {
            kirim({ jenis: 'lihat_balik', nomor: nomor - 1 });
          }}
        >
          Lihat lagi soal {nomor}
        </button>
      )}
    </section>
  );
}

/** Gelembung obrolan: satu-satunya bentuk gelembung di seluruh antarmuka (D-8). */
function Gelembung({
  teks,
  bukaSumber,
}: {
  teks: string;
  bukaSumber: (fact_id: string) => void;
}): JSX.Element {
  const kutip = /"([^"]*)"/.exec(teks);
  if (kutip === null) {
    return (
      <p className="tanya">
        <Teks teks={teks} bukaSumber={bukaSumber} />
      </p>
    );
  }
  const mulai = kutip.index;
  const akhir = mulai + kutip[0].length;
  return (
    <>
      <p className="pembuka-obrolan">
        <Teks teks={teks.slice(0, mulai)} bukaSumber={bukaSumber} />
      </p>
      <p className="gelembung">
        <span className="gelembung-inisial" aria-hidden="true">
          A
        </span>
        <span className="gelembung-isi">
          <Teks teks={kutip[1] ?? ''} bukaSumber={bukaSumber} interaktif={false} />
        </span>
      </p>
      <p className="tanya">
        <Teks teks={teks.slice(akhir)} bukaSumber={bukaSumber} />
      </p>
    </>
  );
}

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
      <p className="mundur">Inilah yang terjadi sesudah {hari.panjang}.</p>

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

      <JejakVerifikasi kasus={kasus} bukaSumber={bukaSumber} />

      <p className="nama-asli">
        Nama aslinya: {kasus.emiten.nama} ({kasus.emiten.simbol}).
      </p>

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

function JejakVerifikasi({
  kasus,
  bukaSumber,
}: {
  kasus: Kasus;
  bukaSumber: (fact_id: string) => void;
}): JSX.Element {
  return (
    <section className="jejak" aria-labelledby="judul-jejak">
      <h2 id="judul-jejak">Jejak verifikasi</h2>
      <p>
        Sebelum kasus ini dibuat, rantai laporan kepemilikan diperiksa dengan sepuluh aturan.
        Hasilnya {kasus.temuan.length} temuan.
      </p>
      <ul className="daftar-temuan">
        {kasus.temuan.map((temuan) => (
          <li key={temuan.temuan_id} className="lembar">
            <div className="lembar-garis" aria-hidden="true" />
            <div className="lembar-kepala">
              <h3 className="lembar-sumber">Aturan {temuan.aturan}</h3>
            </div>
            <div className="lembar-isi">
              <p>{temuan.ringkasan}</p>
              <ul className="angka-temuan">
                {temuan.angka.map((angka) => (
                  <li key={angka.label}>
                    {angka.label}: <strong>{angka.nilai}</strong> {angka.satuan}
                  </li>
                ))}
              </ul>
              {temuan.fakta_terkait.length > 0 && (
                <p className="terkait">
                  {temuan.fakta_terkait.slice(0, 4).map((id) => (
                    <button
                      key={id}
                      type="button"
                      className="rujukan"
                      onClick={() => {
                        bukaSumber(id);
                      }}
                    >
                      {id}
                    </button>
                  ))}
                  {temuan.fakta_terkait.length > 4 && (
                    <span className="meta">
                      dan {temuan.fakta_terkait.length - 4} fakta lain
                    </span>
                  )}
                </p>
              )}
            </div>
          </li>
        ))}
      </ul>
      <details>
        <summary>Aturan yang tidak bisa dijalankan atas kasus ini</summary>
        <ul className="daftar-parameter">
          {kasus.pemeriksaan
            .filter((p) => !p.dijalankan)
            .map((p) => (
              <li key={p.aturan}>
                <strong>{p.aturan}</strong> — {p.alasan_lewat}
              </li>
            ))}
          {kasus.pemeriksaan.every((p) => p.dijalankan) && <li>Semua aturan bisa dijalankan.</li>}
        </ul>
      </details>
    </section>
  );
}

const TERASA = ['ujian hafalan', 'membaca data', 'menebak harga'] as const;
const SUMBER_JAWABAN = ['kartu fakta', 'ingatan atau pengetahuan sendiri', 'tebakan'] as const;

function LayarAkhir({
  keadaan,
  kirim,
}: {
  keadaan: Keadaan;
  kirim: (aksi: Aksi) => void;
}): JSX.Element {
  if (keadaan.akhirTerkirim) {
    return (
      <section className="layar layar-akhir" aria-labelledby="judul-terima">
        <h1 id="judul-terima">Terima kasih.</h1>
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
