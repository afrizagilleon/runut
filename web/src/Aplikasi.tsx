import { useCallback, useEffect, useLayoutEffect, useMemo, useReducer, useRef } from 'react';
import { flushSync } from 'react-dom';
// `PointerEvent` milik React dialiaskan: nama itu sudah dipakai jenis DOM di
// pelacak ketukan di bawah, dan dua benda berbeda bernama sama adalah cara
// tercepat membuat penangan yang salah terkompilasi diam-diam.
import type { PointerEvent as PointerReact, RefObject } from 'react';
import { PENANDA_BUKAN_FAKTA, ambilRujukan } from '../../factory/skema/rujukan.ts';
import type { Fakta, Istilah, Kasus, Soal } from '../../factory/skema/tipe.ts';
import {
  type Aksi,
  type Keadaan,
  type KeadaanBalon,
  type KeadaanSoal,
  LABEL_COCOK,
  LABEL_KUNCI,
  balonMelayang,
  bilahBawah,
  kalimatAntar,
  keadaanBalon,
  langkah,
  namaLayar,
  tandaOpsi,
  tujuanRiwayat,
} from './alur.ts';
import { HalamanKalender, KalenderSimulasi, KalenderSobek, KepingKalender } from './Kalender.tsx';
import { bacaSelesai, catatSelesai, susunKalender, type BulanKalender } from './kalender-simulasi.ts';
import { KartuFakta } from './KartuFakta.tsx';
import { Sorotan } from './Sorotan.tsx';
import { Teks, idPenjelasan, type SakelarSumber } from './Teks.tsx';
import { catatPeristiwa, siramPeristiwa } from './kirim.ts';
import { DAFTAR_KASUS, indeksFakta, kartuSoal, keteranganPenyusun } from './kasus.ts';
import { awalBungkus, reduksi } from './bungkus.ts';
import {
  bacaDimainkan,
  kodeKasus,
  pilihKasus,
  simpanDimainkan,
  tambahDimainkan,
} from './pilih-kasus.ts';
import { hariIniIso, penanda, tanggalBalon, tanggalSingkat, type Penanda } from './tanggal.ts';
import {
  bacaPengunjung,
  buatIdSesi,
  kodePenanda,
  penyimpananPeramban,
  sumberAcakPeramban,
  type Pengunjung,
} from './sesi.ts';
import {
  PEMILIH_INTERAKTIF,
  bacaSasaran,
  ketukanSah,
  rasioLayar,
  type SimpulKetuk,
} from './pelacak.ts';
import { perintahRiwayat } from './riwayat.ts';
import { isiSumber, type Emiten } from './sumber.ts';
import { angkaBesarSatuan } from './angka.ts';
import { KALIMAT_PRIVASI, KALIMAT_TERIMA_KASIH } from './privasi.ts';
import { barisMeta, contohPembuka } from './pembuka.ts';
import { bacaPerangkat, type InfoKoneksi, type Perangkat } from './perangkat.ts';
import { berkasDariTumpukan, pasangPelaporAkar, pesanDari, sumberGalat } from './galat.ts';
import { TAUTAN_JEJAK_NAIK, kalimatJejak, kalimatJejakNaik, ringkasanJejak } from './jejak.ts';
import { PARAM_DAPUR, TAUTAN_DAPUR } from './dapur.ts';
import {
  JUDUL_KALENDER,
  PENGANTAR_KALENDER_AKHIR,
  LABEL_CARA_MAIN,
  LABEL_TAUTAN_KALENDER,
  LABEL_TOMBOL_PETUNJUK,
  PENGANTAR_KALENDER,
  simulasiBaru,
  tautanKalenderDiPembuka,
  kartuDitandai,
  LABEL_PEMANDU_LANJUT,
  LABEL_PEMANDU_LEWATI,
  LABEL_PEMANDU_SELESAI,
  type AksiTampilan,
  type KeadaanTampilan,
  kodePemandu,
  langkahPemanduKini,
  langkahTampilan,
  langkahTerakhir,
  nomorLangkah,
  pemanduOtomatis,
  sorotPemandu,
  tampilanAwal,
} from './tampilan.ts';
import { PEMANASAN } from './pemanasan-slot.ts';
import { kartuPemanasan, type Pemanasan } from './pemanasan.ts';

/**
 * Komponen hanya `dispatch` dan merender (D-5).
 *
 * Tidak ada satu pun `useState` di berkas ini: seluruh keadaan permainan —
 * termasuk lipatan kartu, panel sumber yang terbuka, isian layar akhir, dan
 * apakah tombol "Coba simulasi lain" sudah ditekan — hidup di `alur.ts`.
 * Waktu disuntikkan di sini, satu kali per aksi, supaya reducer tetap murni.
 */

/**
 * Nomor pengunjung dibaca **sekali per pemuatan halaman** (D-13).
 *
 * Bukan sekali per efek: `StrictMode` menjalankan efek dua kali di mode
 * pengembangan, dan sebuah remount di produksi bisa melakukan hal yang sama.
 * Karena `bacaPengunjung` menaikkan hitungan kunjungan setiap kali ia dipanggil,
 * versi tanpa penjaga ini menghitung satu kunjungan sebagai dua — terukur
 * langsung di peramban: satu tab yang dimuat ulang tiga kali melaporkan
 * `kunjungan_ke: 4` alih-alih 3.
 *
 * Satu pemuatan halaman = satu kunjungan, dan itulah arti angka ini.
 */
let pengunjungPemuatanIni: Pengunjung | null = null;

function pengunjungSekali(): Pengunjung {
  pengunjungPemuatanIni ??= bacaPengunjung(penyimpananPeramban(), () =>
    buatIdSesi(sumberAcakPeramban()),
  );
  return pengunjungPemuatanIni;
}

/**
 * Id **sesi**: hidup di memori tab saja, tidak ditulis ke mana pun dan hilang
 * begitu tab ditutup. Yang disimpan di `localStorage` hanyalah nomor
 * **pengunjung** (D-13) dan daftar kasus yang sudah dimainkan (M4 D-4), yang
 * lain benda. `crypto.randomUUID` hanya ada di konteks aman, jadi id-nya dibuat
 * lewat `buatIdSesi` yang punya cadangan — memanggil `randomUUID` langsung
 * membuat halaman putih di alamat LAN (A3-T1).
 */
function sesiBaru(): string {
  return buatIdSesi(sumberAcakPeramban());
}

/** Daftar kasus yang sudah dimainkan pengunjung ini, dari penyimpanan peramban. */
function dimainkanSekarang(): string[] {
  return bacaDimainkan(penyimpananPeramban());
}

/** Catat bahwa kasus ini dimainkan, supaya kunjungan berikutnya mendapat yang lain. */
function catatDimainkan(kasus_id: string): void {
  const simpan = penyimpananPeramban();
  simpanDimainkan(simpan, tambahDimainkan(bacaDimainkan(simpan), kasus_id));
}

/**
 * Kasus untuk pemuatan halaman ini, dipilih **sekali** (M4 D-4).
 *
 * Sekali per pemuatan, bukan sekali per render dan bukan sekali per efek,
 * dengan alasan yang sama seperti `pengunjungSekali()` di bawahnya: pemilihan
 * ini menulis ke `localStorage`, dan `StrictMode` menjalankan segalanya dua
 * kali di mode pengembangan. Memilih dua kali berarti kasus pertama tercatat
 * "sudah dimainkan" sebelum satu layar pun tampil.
 */
let kasusPemuatanIni: Kasus | null = null;

function kasusSekali(): Kasus {
  if (kasusPemuatanIni === null) {
    const terpilih = pilihKasus({
      daftar: DAFTAR_KASUS,
      dimainkan: dimainkanSekarang(),
      paksa: kodeKasus(window.location.search),
      acak: Math.random,
    });
    catatDimainkan(terpilih.kasus_id);
    kasusPemuatanIni = terpilih;
  }
  return kasusPemuatanIni;
}

/**
 * Bahan mentah untuk `bacaPerangkat` (M3.8 D-1), dikumpulkan dari peramban.
 *
 * Satu-satunya tempat `navigator.userAgent` dan `document.referrer` disentuh
 * di seluruh aplikasi — dan keduanya tidak disimpan di mana pun: mereka
 * diserahkan ke fungsi murni yang hanya mengembalikan kategori. Tiap akses
 * dibungkus, karena peramban dalam aplikasi kadang melempar untuk API yang
 * dimatikannya, dan pembuka sesi yang melempar berarti sesi tanpa `mulai`.
 */
function perangkatDariPeramban(): Perangkat | null {
  try {
    const sekarang = new Date();
    const cocokMedia =
      typeof window.matchMedia === 'function'
        ? (kueri: string): boolean => window.matchMedia(kueri).matches
        : null;
    const koneksi =
      (navigator as Navigator & { connection?: InfoKoneksi }).connection ?? null;
    return bacaPerangkat({
      ua: navigator.userAgent,
      titikSentuh: navigator.maxTouchPoints,
      perujuk: document.referrer,
      hostSendiri: window.location.hostname,
      bahasa: navigator.language,
      cocokMedia,
      tinggi: window.innerHeight,
      rasioPiksel: window.devicePixelRatio,
      jamLokal: sekarang.getHours(),
      hariLokal: sekarang.getDay(),
      offsetZona: sekarang.getTimezoneOffset(),
      koneksi,
    });
  } catch {
    return null;
  }
}

/**
 * Waktu muat halaman untuk `kinerja` (M3.8 D-4), sekali per PEMUATAN.
 *
 * Diambil di efek pertama React — saat layar pertama sudah dirender — dan
 * hanya diberikan kepada sesi pertama pemuatan ini. Kasus kedua yang dibuka
 * tanpa memuat ulang tidak punya waktu muat sendiri; memberinya angka yang
 * sama akan menggandakan satu pengukuran menjadi dua baris di ringkasan.
 * `StrictMode` menjalankan efek dua kali di mode pengembangan: yang kedua
 * membaca angka yang sama, dan reducer mengabaikan `mulai` kedua.
 */
let tampilPemuatanIni: { sesi: string; ms: number } | null = null;

function msKeTampil(sesi: string): number | null {
  if (typeof performance === 'undefined') return null;
  tampilPemuatanIni ??= { sesi, ms: performance.now() };
  return tampilPemuatanIni.sesi === sesi ? tampilPemuatanIni.ms : null;
}

export function Aplikasi(): JSX.Element {
  const [bungkus, dispatch] = useReducer(reduksi, null, () => awalBungkus(kasusSekali(), sesiBaru()));
  const { kasus, keadaan } = bungkus;
  const hari = useMemo(() => penanda(kasus.tanggal_t), [kasus.tanggal_t]);
  /*
   * Tanggal hari ini dari jam perangkat, lewat fungsi tanggal murni yang sama.
   * Waktu disuntikkan sekali di sini, bukan dibaca di dalam fungsi itu, supaya
   * `hariIniIso` tetap bisa dites dengan waktu buatan.
   */
  const hariIni = useMemo(() => penanda(hariIniIso(new Date())), []);

  const kirim = useCallback((aksi: Aksi): void => {
    dispatch({ aksi, waktu: Date.now() });
  }, []);

  /*
   * Keadaan tampilan di luar permainan (M3.14): pemandu, soal pemanasan,
   * petunjuk. Reducer murni di `tampilan.ts`; tidak ada peristiwa baru —
   * ketukan tombolnya tercatat `ketuk` lewat `data-uid`. "Berjalan sendiri"
   * diputuskan sekali per pemuatan dari nomor kunjungan (pengunjung baru saja)
   * dan `?pemandu=`.
   */
  const [tampilan, kirimTampilan] = useReducer(langkahTampilan, null, () => {
    const { kunjungan_ke } = pengunjungSekali();
    return tampilanAwal(pemanduOtomatis(kunjungan_ke, kodePemandu(window.location.search)), {
      selesai: bacaSelesai(penyimpananPeramban()),
      kembali: kunjungan_ke !== null && kunjungan_ke > 1,
    });
  });

  /**
   * Buka kasus berikutnya yang belum dimainkan: **sesi baru, pengunjung sama**
   * (M4 D-4).
   *
   * Nomor pengunjung sengaja tidak dibaca ulang — `pengunjungSekali()` sudah
   * mengunci satu kunjungan per pemuatan halaman, dan membuka kasus kedua
   * bukan kunjungan kedua. Kalau ia dibaca lagi di sini, satu orang yang
   * memainkan dua kasus akan terhitung sebagai dua kunjungan.
   */
  const bukaKasusLain = useCallback((berikut: Kasus): void => {
    catatDimainkan(berikut.kasus_id);
    dispatch({ kasusBaru: berikut, sesi: sesiBaru() });
  }, []);

  // Cermin keadaan terakhir, hanya untuk jalur `pagehide` di bawah.
  const acuanKeadaan = useRef(keadaan);
  acuanKeadaan.current = keadaan;
  // Cermin antrean yang belum diserahkan, hanya untuk jalur batas galat (M3.8 D-3).
  const acuanAntre = useRef(bungkus.antre);
  acuanAntre.current = bungkus.antre;

  /*
   * Satu-satunya tempat waktu dibaca untuk peristiwa pembuka.
   *
   * Penanda tautan (D-9) dan nomor pengunjung (D-13) ikut di sini, bukan lewat
   * jalur sendiri: keduanya keterangan tentang sesi ini, dan sesi hanya punya
   * satu peristiwa pembuka. Keputusannya sendiri diambil fungsi murni
   * (`kodePenanda`, `bacaPengunjung`); komponen hanya menyerahkan sumbernya.
   */
  useEffect(() => {
    const { pengunjung, kunjungan_ke } = pengunjungSekali();
    kirim({
      jenis: 'mulai',
      lebar_layar: window.innerWidth,
      penanda: kodePenanda(window.location.search),
      pengunjung,
      kunjungan_ke,
      perangkat: perangkatDariPeramban(),
      ms_ke_tampil: msKeTampil(keadaan.sesi),
    });
    /*
     * `keadaan.sesi` ikut sebagai ketergantungan sejak M4 D-4: membuka kasus
     * lain melahirkan sesi baru, dan sesi tanpa peristiwa `mulai` tidak masuk
     * penyebut mana pun di ringkasan pemilik. Pemanggilan berulang untuk sesi
     * yang sama tidak berbahaya — reducer mengabaikan `mulai` kedua, dan itulah
     * yang sudah menjaga `StrictMode` sejak dulu.
     */
  }, [kirim, keadaan.sesi]);

  /*
   * Pelacak ketukan (D-8): **satu** pendengar di akar, bukan satu penangan per
   * elemen. Alasannya bukan hemat: penangan per elemen berarti setiap komponen
   * baru harus ingat mendaftarkan dirinya, dan yang lupa tidak akan pernah
   * terlihat di data — kegagalan diam yang tidak bisa dibedakan dari "tidak ada
   * yang mengetuk di sana".
   *
   * Yang dibaca dari DOM hanya `data-uid` dan apakah elemennya cocok dengan
   * `PEMILIH_INTERAKTIF`. Tidak ada `textContent`, tidak ada `value`.
   */
  /*
   * Satu-satunya tempat persentase gulir dihitung. Ia dipakai dua pendengar
   * (`pointerup` dan `scroll`) supaya keduanya tidak bisa berbeda.
   */
  const catatGulirSekarang = useCallback((): void => {
    const tinggi = document.documentElement.scrollHeight - window.innerHeight;
    // Layar yang muat seluruhnya berarti sudah terlihat semua, bukan nol.
    const persen = tinggi <= 0 ? 100 : (window.scrollY / tinggi) * 100;
    kirim({ jenis: 'catat_gulir', persen });
  }, [kirim]);

  useEffect(() => {
    let turunPada: { x: number; y: number } | null = null;

    const turun = (peristiwa: PointerEvent): void => {
      turunPada = { x: peristiwa.clientX, y: peristiwa.clientY };
    };

    const naik = (peristiwa: PointerEvent): void => {
      const awal = turunPada;
      turunPada = null;

      /*
       * Kedalaman gulir ikut diambil di sini, dan itu bukan kemudahan.
       *
       * Peristiwa `scroll` hanya dikirim peramban bersama frame. Di panel
       * peramban mesin ini — `visibilityState: hidden`, tanpa frame — sebuah
       * pendengar `scroll` yang dipasang langsung di konsol **tidak menyala
       * sama sekali** walau `window.scrollY` sudah berubah. Terukur, bukan
       * dugaan. Artinya metrik yang hanya bergantung pada `scroll` bisa
       * diam-diam nol di keadaan yang tidak kita duga — persis kegagalan F-1
       * yang sudah pernah kena di proyek ini (kartu tercatat nol detik).
       *
       * `pointerup` adalah justru akhir dari sebuah guliran jari, dan ia
       * dikirim tanpa menunggu frame. Jadi setiap jari yang diangkat
       * melaporkan posisi gulirnya — termasuk (dan terutama) ketika gerakannya
       * ditolak sebagai ketukan di baris berikutnya.
       */
      catatGulirSekarang();

      // Jari yang bergeser jauh sedang menggulir, bukan mengetuk.
      if (!ketukanSah(awal, { x: peristiwa.clientX, y: peristiwa.clientY })) return;
      const sasaran = peristiwa.target;
      if (!(sasaran instanceof Element)) return;

      const rantai: SimpulKetuk[] = [];
      for (let simpul: Element | null = sasaran; simpul !== null; simpul = simpul.parentElement) {
        rantai.push({
          uid: simpul.getAttribute('data-uid'),
          interaktif: simpul.matches(PEMILIH_INTERAKTIF),
        });
      }
      const { uid, mati } = bacaSasaran(rantai);
      kirim({
        jenis: 'ketuk',
        uid,
        mati,
        x: rasioLayar(peristiwa.clientX, window.innerWidth),
        y: rasioLayar(peristiwa.clientY, window.innerHeight),
        // M3.8 D-4: waktu sejak halaman mulai dimuat. Reducer memakainya
        // sekali, untuk ketukan hidup pertama; ia tidak ikut ke `ketuk`.
        ms_muat: typeof performance === 'undefined' ? null : performance.now(),
      });
    };

    window.addEventListener('pointerdown', turun, { passive: true });
    window.addEventListener('pointerup', naik, { passive: true });
    return () => {
      window.removeEventListener('pointerdown', turun);
      window.removeEventListener('pointerup', naik);
    };
  }, [kirim, catatGulirSekarang]);

  /*
   * `visibilitychange: hidden` (D-8) — kesempatan kirim yang datang lebih awal
   * dan lebih sering daripada `pagehide` di ponsel: pindah aplikasi, kunci
   * layar, tarik bilah notifikasi. Ia hanya **menyiram** antrean; peristiwa
   * `tutup` tetap milik `pagehide` supaya tidak lahir dua kali.
   */
  /*
   * M3.8 D-2: pendengar yang sama sekarang juga melahirkan `tampak`.
   *
   * `sembunyi` di-dispatch lewat `flushSync`, dan itu bukan kebiasaan. Halaman
   * yang baru saja tersembunyi bisa dibekukan peramban kapan saja; render dan
   * efek yang dijadwalkan "nanti" mungkin tidak pernah jalan. `flushSync`
   * menjalankan reducer, render, dan efek penyerah antrean (`catatPeristiwa`)
   * SEKARANG, sehingga `siramPeristiwa()` di baris berikutnya benar-benar ikut
   * membawa `tampak sembunyi` — peristiwa yang justru paling ingin sampai,
   * karena ialah bukti terakhir dari orang yang pergi.
   *
   * `kembali` tidak perlu terburu-buru: halamannya hidup lagi, jadi ia ikut
   * antrean biasa.
   */
  useEffect(() => {
    const berubah = (): void => {
      if (document.visibilityState === 'hidden') {
        flushSync(() => {
          kirim({ jenis: 'tampak', keadaan: 'sembunyi' });
        });
        siramPeristiwa();
        return;
      }
      if (document.visibilityState === 'visible') kirim({ jenis: 'tampak', keadaan: 'kembali' });
    };
    document.addEventListener('visibilitychange', berubah);
    return () => {
      document.removeEventListener('visibilitychange', berubah);
    };
  }, [kirim]);

  /*
   * Galat JavaScript (M3.8 D-3): `error` dan `unhandledrejection` di jendela.
   *
   * Pendengar hanya menyerahkan bahan mentahnya — pesan dan berkas asal. Yang
   * menyamarkan pesan, menolak yang kembar, dan berhenti di lima adalah
   * reducer; yang memutuskan "aplikasi atau luar" adalah `sumberGalat`, fungsi
   * murni. Tidak ada `stack` yang ikut: tumpukan hanya dibaca untuk mencari
   * berkas asal sebuah penolakan, lalu dibuang.
   */
  useEffect(() => {
    const asal = window.location.origin;
    const galat = (peristiwa: ErrorEvent): void => {
      kirim({
        jenis: 'galat',
        jenis_galat: 'error',
        pesan: peristiwa.message !== '' ? peristiwa.message : pesanDari(peristiwa.error),
        sumber: sumberGalat(peristiwa.filename, asal),
      });
    };
    const tolak = (peristiwa: PromiseRejectionEvent): void => {
      const alasan: unknown = peristiwa.reason;
      const tumpukan = alasan instanceof Error ? alasan.stack : undefined;
      kirim({
        jenis: 'galat',
        jenis_galat: 'penolakan',
        pesan: pesanDari(alasan),
        sumber: sumberGalat(berkasDariTumpukan(tumpukan), asal),
      });
    };
    window.addEventListener('error', galat);
    window.addEventListener('unhandledrejection', tolak);
    return () => {
      window.removeEventListener('error', galat);
      window.removeEventListener('unhandledrejection', tolak);
    };
  }, [kirim]);

  /*
   * Galat RENDER tidak sampai ke pendengar di atas: React menangkapnya dan
   * menyerahkannya ke batas galat di akar, yang berada di luar komponen ini
   * dan tidak punya `dispatch`. Jadi komponen ini meninggalkan pelapor yang
   * menghitung peristiwanya dari keadaan terakhir — pola jalur `pagehide` —
   * dan ikut menyerahkan antrean yang belum sempat diserahkan efek, karena
   * render yang jatuh tidak pernah menjalankan efeknya.
   *
   * Tidak dilepas saat dibongkar: ketika batas galat memanggilnya, komponen
   * ini justru sedang dibongkar, dan urutan pembersihan efek terhadap
   * `componentDidCatch` bukan janji React yang boleh diandalkan.
   */
  useEffect(() => {
    pasangPelaporAkar((galat) => {
      catatPeristiwa(acuanAntre.current);
      const hasil = langkah(
        acuanKeadaan.current,
        { jenis: 'galat', jenis_galat: 'error', pesan: pesanDari(galat), sumber: 'aplikasi' },
        Date.now(),
      );
      catatPeristiwa(hasil.peristiwa);
      siramPeristiwa();
    });
  }, []);

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
    // Yang diserahkan disebut satu per satu, bukan jumlahnya (F-1, bungkus.ts).
    const diserahkan = bungkus.antre;
    catatPeristiwa([...diserahkan]);
    dispatch({ bersihkan: diserahkan });
  }, [bungkus.antre]);

  const indeks = useMemo(() => indeksFakta(kasus), [kasus]);
  const layar = keadaan.layar;
  const namaLayarKini = namaLayar(layar);

  /*
   * Berpindah layar mengembalikan gulir ke atas. Tanpa ini pemain yang
   * menggulir sampai tombol lalu menekannya mendarat di tengah kartu soal
   * berikutnya dan tidak pernah melihat kartu yang pertama — persis kegagalan
   * yang dijaga D-4.
   *
   * Diulang sekali di frame berikutnya sejak M3.5 T-03, dan itu bukan
   * kehati-hatian melainkan hasil ukur. Pemain yang menekan "Lanjut" **sementara
   * gulir halus masih berjalan** — sekarang jalan yang biasa, karena mengunci
   * jawaban menggulir layar ke cap — membawa luncuran itu ke layar berikutnya:
   * `scrollTo(0, 0)` memang membatalkan animasinya, tetapi satu frame yang
   * sudah telanjur dikirim ke kompositor tetap mendarat sesudahnya. Terukur
   * lewat pendengar `scroll` di Chromium mesin ini: `1016 → 1025 → 1045 → 69`,
   * lalu diam di 69. Di bawah beban, sisa itu pernah membuka layar pembukaan
   * tepat di ringkasannya (E-10 merah dua putaran berturut-turut).
   *
   * Satu frame cukup: sesudah frame telat itu tidak ada lagi yang menulis
   * posisi gulir. `cancelAnimationFrame` di pembersih menjaga agar permintaan
   * yang belum sempat jalan tidak menimpa layar yang sudah berganti lagi.
   */
  useEffect(() => {
    window.scrollTo(0, 0);
    const pinta = requestAnimationFrame(() => {
      window.scrollTo(0, 0);
    });
    return () => {
      cancelAnimationFrame(pinta);
    };
  }, [namaLayarKini]);

  /*
   * Kedalaman gulir tiap layar (D-8). Pendengarnya hanya melaporkan persentase
   * sekarang; yang mengingat angka terjauh, menyetelnya ulang tiap ganti layar,
   * dan melahirkan peristiwa `gulir` adalah reducer.
   *
   * Sengaja dipasang **sesudah** efek `scrollTo(0, 0)` di atas: React
   * menjalankan efek menurut urutan penulisannya, dan laporan pertama harus
   * diambil sesudah gulir dikembalikan ke puncak layar baru — kalau tidak,
   * setiap layar baru akan mewarisi kedalaman gulir layar sebelumnya.
   */
  /*
   * Pemandu menempel pada layar pertama tempat pemain benar-benar bermain
   * (M3.14 D-1): soal pemanasan kalau ada dan disetujui, kalau tidak soal 1.
   * Reducer yang memutuskan apakah ia berjalan (pengunjung baru, belum pernah
   * tampil di pemuatan ini); efek ini hanya memberi tahu "sudah tiba".
   */
  const diSoalPertama = layar.jenis === 'soal' && layar.nomor === 0;
  const diPemanasan = layar.jenis === 'pembuka' && tampilan.pemanasan.aktif;
  useEffect(() => {
    if (diSoalPertama || diPemanasan) kirimTampilan({ jenis: 'tiba_di_soal_pertama' });
  }, [diSoalPertama, diPemanasan]);

  /*
   * Langkah pemandu yang berganti menggulir sasarannya ke bawah keping (dan
   * balon melayang: `scroll-margin-top` memakai `--tepi-atas`), dengan gerak
   * yang menghormati `prefers-reduced-motion`. Menggulir adalah kerja
   * tampilan; tidak ada peristiwa.
   */
  const sorot = sorotPemandu(tampilan);

  /*
   * Petunjuk (M3.14 D-2): tanda kartunya milik satu layar. Berpindah layar
   * menutupnya; setiap tekanan menggulir ke kartu yang ditandai pertama.
   */
  useEffect(() => {
    kirimTampilan({ jenis: 'tutup_petunjuk' });
  }, [namaLayarKini]);
  /*
   * Kalender simulasi (M3.14 D-3). Simulasi SELESAI saat pembukaan tercapai —
   * layar itu hanya bisa dicapai sesudah ketiga soal dikunci. Keadaannya di
   * reducer tampilan (kalender tetap benar tanpa penyimpanan); penyimpanannya
   * hanya supaya kunjungan berikutnya ingat.
   */
  const diPembukaan = layar.jenis === 'pembukaan';
  useEffect(() => {
    if (!diPembukaan) return;
    kirimTampilan({ jenis: 'simulasi_selesai', kasus_id: kasus.kasus_id });
    catatSelesai(penyimpananPeramban(), kasus.kasus_id);
  }, [diPembukaan, kasus.kasus_id]);
  const bulanKalender = useMemo(
    () => susunKalender(DAFTAR_KASUS, tampilan.kalender.selesai, kasus.kasus_id),
    [tampilan.kalender.selesai, kasus.kasus_id],
  );
  /*
   * Memilih dari kalender. Dari layar terima kasih ia menggantikan "Coba
   * simulasi lain" — jadi `minat_kasus_lain` tetap lahir, dari sesi yang
   * ditinggalkan, persis seperti tombol lama. Dari layar pertama, memilih
   * simulasi yang sama hanya menutup kalender.
   */
  const pilihDariKalender = useCallback(
    (kasus_id: string, dariAkhir: boolean): void => {
      const berikut = DAFTAR_KASUS.find((k) => k.kasus_id === kasus_id);
      if (dariAkhir) kirim({ jenis: 'minat_kasus_lain' });
      kirimTampilan({ jenis: 'tutup_kalender' });
      if (berikut !== undefined && (dariAkhir || kasus_id !== kasus.kasus_id)) bukaKasusLain(berikut);
    },
    [kirim, bukaKasusLain, kasus.kasus_id],
  );
  const kalenderTerbuka = layar.jenis === 'pembuka' && tampilan.kalender.terbuka;
  const baru = simulasiBaru(DAFTAR_KASUS, kasus.kasus_id, tampilan.kalender.selesai);

  const tekanPetunjuk = tampilan.petunjuk?.ke ?? 0;
  useEffect(() => {
    if (tekanPetunjuk === 0) return;
    const pinta = requestAnimationFrame(() => {
      document
        .querySelector('[data-gulir-sorot="penentu"]')
        ?.scrollIntoView({ block: 'start', behavior: gerakHalus() });
    });
    return () => {
      cancelAnimationFrame(pinta);
    };
  }, [tekanPetunjuk]);

  /*
   * "Mulai simulasi": pengunjung yang dipandu dan punya soal pemanasan yang
   * disetujui masuk ke soal latihan dulu (M3.14 D-1); yang lain langsung ke
   * soal 1, seperti sebelumnya. Slot pemanasan kosong di milestone ini.
   */
  const mulaiSimulasi = useCallback((): void => {
    if (PEMANASAN !== null && tampilan.otomatis && !tampilan.pemandu.sudah) {
      kirimTampilan({ jenis: 'mulai_pemanasan' });
      return;
    }
    kirim({ jenis: 'lanjut' });
  }, [kirim, tampilan.otomatis, tampilan.pemandu.sudah]);

  const selesaiPemanasan = useCallback((): void => {
    kirimTampilan({ jenis: 'selesai_pemanasan' });
    kirim({ jenis: 'lanjut' });
  }, [kirim]);
  useEffect(() => {
    if (sorot === null) return;
    let pinta = 0;
    const gulir = (): void => {
      cancelAnimationFrame(pinta);
      pinta = requestAnimationFrame(() => {
        /*
         * Tombol petunjuk ke TENGAH layar (pilihan di atasnya tetap terlihat);
         * yang lain rata atas, di bawah keping dan balon (kritik D-6 butir 1).
         */
        document
          .querySelector(`[data-gulir-sorot="${sorot}"]`)
          ?.scrollIntoView({ block: sorot === 'petunjuk' ? 'center' : 'start', behavior: gerakHalus() });
      });
    };
    gulir();
    /*
     * M3.16 (kritik r0 butir 5): ponsel diputar di tengah langkah → tata letak
     * berubah dan posisi gulir lama tidak lagi menunjukkan kepala sasaran
     * (mendatar: kartu penentu tersembunyi di bawah keping). Gulir langkah itu
     * dijalankan ulang — HANYA saat orientasi berganti, bukan tiap `resize`:
     * bilah alamat ponsel yang muncul-hilang saat digulir juga menyalakan
     * `resize`, dan menggulir paksa di sana berarti merebut jari pemain.
     */
    const tegak = typeof window.matchMedia === 'function' ? window.matchMedia('(orientation: portrait)') : null;
    tegak?.addEventListener('change', gulir);
    return () => {
      cancelAnimationFrame(pinta);
      tegak?.removeEventListener('change', gulir);
    };
  }, [sorot, namaLayarKini]);

  useEffect(() => {
    catatGulirSekarang();
    window.addEventListener('scroll', catatGulirSekarang, { passive: true });
    return () => {
      window.removeEventListener('scroll', catatGulirSekarang);
    };
  }, [catatGulirSekarang, namaLayarKini]);

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

  /*
   * Tombol kembali DAN tombol maju peramban (A1-T2, cacat C-1).
   *
   * Versi lama men-dispatch `mundur` untuk setiap `popstate`. Tombol maju
   * menyalakan peristiwa yang sama, jadi dari layar pertama aksinya diabaikan
   * diam-diam dan penunjuk riwayat peramban berjalan sendiri meninggalkan
   * layarnya — sesudah itu kembali pun tidak menggerakkan apa pun.
   *
   * Sekarang yang dibaca adalah **tujuan** di `event.state.layar`. Kalau tujuan
   * itu tidak sah — entri bukan milik kita, nomor soal di luar jangkauan, atau
   * layar yang belum pernah dicapai pemain — layar kini dipertahankan dan
   * entrinya diganti, supaya keduanya sinkron lagi tanpa satu pun galat.
   * Yang memutuskan sah atau tidak adalah `tujuanRiwayat`, fungsi murni yang
   * sama dengan yang dipakai reducer: dua penilai yang terpisah akan berselisih,
   * dan selisih itulah cacatnya.
   */
  useEffect(() => {
    const pindah = (peristiwa: PopStateEvent): void => {
      const nama = (peristiwa.state as { layar?: string } | null)?.layar ?? null;
      const keadaanKini = acuanKeadaan.current;
      if (nama === null || tujuanRiwayat(keadaanKini, nama) === null) {
        window.history.replaceState({ layar: namaLayar(keadaanKini.layar) }, '');
        return;
      }
      kirim({ jenis: 'riwayat_ke', nama });
    };
    window.addEventListener('popstate', pindah);
    return () => {
      window.removeEventListener('popstate', pindah);
    };
  }, [kirim]);

  /*
   * Sakelar, bukan tombol buka (A-2). Ketuk pertama membuka, ketuk kedua
   * menutup. Komponen tidak tahu mana yang sedang terjadi dan tidak perlu
   * tahu: ia mengirim satu aksi, reducer yang memutuskan.
   */
  const sakelarSumber = useCallback<SakelarSumber>(
    (fact_id, saudara): void => {
      const soal_id = layar.jenis === 'soal' ? (keadaan.urutanSoal[layar.nomor] ?? null) : null;
      kirim(
        saudara === undefined
          ? { jenis: 'sakelar_sumber', fact_id, soal_id }
          : { jenis: 'sakelar_sumber', fact_id, soal_id, saudara },
      );
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
        <header className="penanda" role="banner" data-uid="keping">
          {/* Kolomnya dibungkus, bukan ditempel ke tiap anak: lihat .penanda-kolom (A4-T2). */}
          <div className="penanda-kolom">
            {/*
              Denyut hanya di soal pertama (M3.6 D-3): sekali menarik mata ke
              tanggalnya sudah cukup, dan gerak yang berulang tiap layar
              berubah dari penunjuk menjadi gangguan.
            */}
            <KepingKalender
              hari={hari}
              berdenyut={layar.nomor === 0}
              kanan={<TitikSoal jumlah={kasus.soal.length} sekarang={layar.nomor} />}
            />
          </div>
        </header>
      )}

      <main className="halaman" id="isi">
        {layar.jenis === 'pembuka' && !diPemanasan && !kalenderTerbuka && (
          <LayarPembuka
            kasus={kasus}
            hari={hari}
            kirim={kirim}
            sakelarSumber={sakelarSumber}
            mulai={mulaiSimulasi}
            {...(tautanKalenderDiPembuka(tampilan)
              ? {
                  bukaKalender: () => {
                    kirimTampilan({ jenis: 'buka_kalender' });
                  },
                }
              : {})}
            {...(baru !== null
              ? {
                  simulasiBaru: {
                    tanggal: `${penanda(baru.tanggal_t).hari}, ${penanda(baru.tanggal_t).panjang}`,
                    kasus_id: baru.kasus_id,
                    buka: () => {
                      pilihDariKalender(baru.kasus_id, false);
                    },
                  },
                }
              : {})}
          />
        )}
        {kalenderTerbuka && (
          <section className="layar layar-kalender" aria-label={JUDUL_KALENDER}>
            <button
              type="button"
              className="kembali"
              data-uid="kalender:tutup"
              onClick={() => {
                kirimTampilan({ jenis: 'tutup_kalender' });
              }}
            >
              ← Kembali
            </button>
            <KalenderSimulasi
              bulan={bulanKalender}
              judul={JUDUL_KALENDER}
              pengantar={PENGANTAR_KALENDER}
              pilih={(id) => {
                pilihDariKalender(id, false);
              }}
            />
          </section>
        )}
        {diPemanasan && PEMANASAN !== null && (
          <LayarPemanasan
            pemanasan={PEMANASAN}
            tampilan={tampilan}
            kirimTampilan={kirimTampilan}
            selesai={selesaiPemanasan}
          />
        )}
        {layar.jenis === 'soal' && (
          <LayarSoal
            kasus={kasus}
            keadaan={keadaan}
            nomor={layar.nomor}
            kirim={kirim}
            sakelarSumber={sakelarSumber}
            indeks={indeks}
            tampilan={tampilan}
            kirimTampilan={kirimTampilan}
          />
        )}
        {layar.jenis === 'pembukaan' && (
          <LayarPembukaan
            kasus={kasus}
            hari={hari}
            kirim={kirim}
            sakelarSumber={sakelarSumber}
            indeks={indeks}
            terbuka={keadaan.sumberTerbuka}
          />
        )}
        {layar.jenis === 'akhir' && (
          <LayarAkhir
            kasus={kasus}
            keadaan={keadaan}
            kirim={kirim}
            hariIni={hariIni}
            bulanKalender={bulanKalender}
            pilihDariKalender={(id) => {
              pilihDariKalender(id, true);
            }}
          />
        )}
      </main>

      {/*
        Sorotan (M3.16): lapisan redup berlubang di atas sasaran langkah ini,
        DI BAWAH panel panduan. Dilepas bersama panelnya — "Lewati" menutup
        keduanya seketika.
      */}
      {(layar.jenis === 'soal' || diPemanasan) && sorot !== null && <Sorotan sasaran={sorot} />}

      {(layar.jenis === 'soal' || diPemanasan) && langkahPemanduKini(tampilan) !== null && (
        <PanelPemandu
          tampilan={tampilan}
          kirimTampilan={kirimTampilan}
          soal_id={
            diPemanasan
              ? (PEMANASAN?.soal.soal_id ?? '')
              : layar.jenis === 'soal'
                ? (keadaan.urutanSoal[layar.nomor] ?? '')
                : ''
          }
        />
      )}

      {((layar.jenis === 'pembuka' && !diPemanasan && !kalenderTerbuka) || layar.jenis === 'akhir') && (
        <Kaki kasus={kasus} diBawahBilah={layar.jenis === 'pembuka'} />
      )}

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

/**
 * Tiga titik: memang tiga soal berurutan, jadi penanda urutan dipakai di sini.
 *
 * Ditambah satu **penanda "sesudahnya"** di ujung kanan (M3.9 D-5, patokan
 * `docs/contoh/layar-soal-v3d.html`): kotak kecil bertepi atas bergerigi —
 * halaman kalender yang belum disobek — yang memberi tahu bahwa sesudah soal
 * terakhir masih ada satu layar lagi: apa yang terjadi sesudah tanggal ini.
 */
export function TitikSoal({ jumlah, sekarang }: { jumlah: number; sekarang: number }): JSX.Element {
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
      <span
        className="titik titik-sesudah"
        role="img"
        aria-label={LABEL_PENANDA_SESUDAH}
        title={LABEL_PENANDA_SESUDAH}
      />
    </p>
  );
}

/** Nama penanda "sesudahnya" di keping (M3.9 D-5), untuk `title` dan pembaca layar. */
const LABEL_PENANDA_SESUDAH = 'Lalu apa yang terjadi sesudahnya';

export function LayarPembuka({
  kasus,
  hari,
  kirim,
  sakelarSumber,
  mulai,
  bukaKalender,
  simulasiBaru: tawaranBaru,
}: {
  kasus: Kasus;
  hari: ReturnType<typeof penanda>;
  kirim: (aksi: Aksi) => void;
  sakelarSumber: SakelarSumber;
  /** "Mulai simulasi" (M3.14): bawaannya `lanjut`; Aplikasi bisa membelokkannya ke soal pemanasan. */
  mulai?: () => void;
  /** Tautan kecil ke kalender simulasi (M3.14 D-3) — hanya untuk pengunjung yang kembali. */
  bukaKalender?: () => void;
  /** "Simulasi baru: …" (kritik D-6 butir 9) — bila simulasi ini sudah selesai dan ada yang belum. */
  simulasiBaru?: { tanggal: string; kasus_id: string; buka: () => void };
}): JSX.Element {
  const contoh = contohPembuka(kasus);
  useTinggiBilah();
  return (
    <section className="layar layar-pembuka" aria-labelledby="judul-pembuka">
      {/*
        M3.9 D-2 (varian A uji K-06, disetujui pemilik 24 Sep 2026): kalender
        besar → judul → SATU contoh gelembung → ajakan → "Mulai simulasi".

        "Kita mundur ke …" hilang dari layar ini: tanggalnya dibawa kalender
        di atas dan kaki di bawah. Yang dijawab layar ini sekarang "ini apa" —
        data alpha 23 Sep: 13 orang asing, nol selesai; tiga orang uji duduk
        balik bertanya "ini aplikasi apa?".
      */}
      <div data-uid="kalender">
        <HalamanKalender hari={hari} />
      </div>
      <h1 id="judul-pembuka" className="mundur">
        <Teks teks={kasus.pembuka.judul} sakelarSumber={sakelarSumber} />
      </h1>
      {/*
        Contoh gelembung DIBACA dari `soal[0].pesan` (`contohPembuka`), tidak
        ditulis kedua kali. Nama pengirim saja — tanpa tanggal, tanpa jam — dan
        tidak bisa diketuk: ia contoh, bukan pesan yang masuk, dan bukan
        salinan melayang M3.7. Isinya polos seperti di soal: ucapan, bukan
        fakta (INV-4).
      */}
      {contoh !== null && (
        <figure
          className="pesan"
          data-uid="contoh-pesan"
          aria-label={`Contoh omongan dari ${contoh.nama}`}
        >
          <blockquote className="pesan-balon">
            <p className="pesan-meta">
              <span className="pesan-nama">{contoh.nama}</span>
            </p>
            <p className="isi">{contoh.isi}</p>
          </blockquote>
        </figure>
      )}
      <p className="isi" data-uid="ajak">
        <Teks teks={kasus.pembuka.ajak} sakelarSumber={sakelarSumber} />
      </p>
      {/*
        Pengunjung yang kembali saja (pengunjung baru: layar ini tidak berubah
        satu piksel pun). Rata kiri seperti ajakan di atasnya (kritik D-6 butir 10).
      */}
      {(tawaranBaru !== undefined || bukaKalender !== undefined) && (
        <div className="tautan-kalender">
          {tawaranBaru !== undefined && (
            <button
              type="button"
              className="tautan-kecil"
              data-uid={`kalender:baru:${tawaranBaru.kasus_id}`}
              onClick={tawaranBaru.buka}
            >
              Simulasi baru: {tawaranBaru.tanggal} ›
            </button>
          )}
          {bukaKalender !== undefined && (
            <button type="button" className="tautan-kecil" data-uid="kalender:buka" onClick={bukaKalender}>
              {LABEL_TAUTAN_KALENDER} ›
            </button>
          )}
        </div>
      )}
      <div className="tindakan" data-uid="bilah">
        <button
          type="button"
          className="tombol-utama"
          onClick={() => {
            if (mulai !== undefined) mulai();
            else kirim({ jenis: 'lanjut' });
          }}
        >
          Mulai simulasi
        </button>
        {/*
          D-1: satu baris keterangan, bukan kalimat kedua. Ia hidup DI DALAM
          bilah bawah yang `fixed`, jadi ia terbaca tanpa menggulir — dan
          pertanyaan "ini apa, berapa soal, tanpa apa" terjawab di tempat yang
          sama dengan keputusan "mulai atau tidak". Isinya fungsi murni yang
          dites; komponen hanya menempatkannya.
        */}
        <p className="meta baris-meta" data-uid="meta-pembuka">
          {barisMeta(kasus)}
        </p>
      </div>
    </section>
  );
}

/**
 * Tinggi bilah bawah layar pertama, DIUKUR, diserahkan ke CSS sebagai
 * `--tinggi-bilah` di akar dokumen (M3.9 D-2).
 *
 * Kaki tiga kalimat tetap berada di bawah bilah `fixed` itu. Bantalan bawahnya
 * harus setinggi bilah supaya kalimat terakhirnya bisa digulir ke atas bilah
 * dan terbaca; tingginya tidak ditebak karena baris meta di dalam bilah bisa
 * menjadi dua baris di layar sempit atau huruf yang diperbesar.
 */
function useTinggiBilah(): void {
  useLayoutEffect(() => {
    const akar = document.documentElement;
    const pasang = (): void => {
      const bilah = document.querySelector('.layar-pembuka [data-uid="bilah"]');
      if (bilah === null) return;
      akar.style.setProperty(
        '--tinggi-bilah',
        `${String(Math.ceil(bilah.getBoundingClientRect().height))}px`,
      );
    };
    pasang();
    window.addEventListener('resize', pasang, { passive: true });
    return () => {
      window.removeEventListener('resize', pasang);
      akar.style.removeProperty('--tinggi-bilah');
    };
  }, []);
}

/** Gerak halus hanya kalau pemain tidak memintanya dihentikan. */
function gerakHalus(): ScrollBehavior {
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth';
}

/**
 * Gulir ke sebuah sasaran, lalu **ulangi** sesudah tata letak berhenti bergerak
 * (F-M36-1).
 *
 * Ditemukan e2e ketika D-4 memundurkan sobekan kalender 250 ms: E-10 di proyek
 * `lebar` merah tiga dari tiga putaran, dan hijau lagi begitu tundanya
 * dikembalikan. Sebabnya bukan tundanya melainkan yang sudah ada sejak dulu —
 * ruang sobekan menyusut 176 px menjadi 0 (`tutup-ruang`), dan **gulir halus
 * menghitung tujuannya satu kali di awal**. Pemain yang menekan "Langsung ke
 * ringkasan ↓" selagi kalender masih menutup ruangnya mendarat 176 px meleset:
 * judul ringkasan berhenti di luar layar, rasio 0 diukur selama 15 detik penuh.
 * Jendela itu dulu 0,85 detik dan sekarang 1,10 detik — jadi D-4 melebarkan
 * cacatnya, bukan melahirkannya.
 *
 * Guliran pertama tetap berangkat segera supaya ketukan terasa langsung;
 * guliran kedua membetulkan pendaratannya begitu animasinya selesai. Di layar
 * ini satu-satunya animasi adalah sobekan itu, dan dengan
 * `prefers-reduced-motion` tidak ada animasi sama sekali sehingga tidak ada
 * guliran kedua.
 */
function gulirKeSasaran(id: string): void {
  const sasaran = document.getElementById(id);
  if (sasaran === null) return;
  const pilihan: ScrollIntoViewOptions = { behavior: gerakHalus(), block: 'start' };
  sasaran.scrollIntoView(pilihan);

  const bergerak = document
    .getAnimations()
    .filter((gerak) => gerak.playState === 'running' || gerak.playState === 'paused');
  if (bergerak.length === 0) return;
  void Promise.all(
    bergerak.map(async (gerak) => {
      try {
        await gerak.finished;
      } catch {
        /* dibatalkan: tidak ada tata letak yang masih akan bergeser karenanya */
      }
    }),
  ).then(() => {
    sasaran.scrollIntoView(pilihan);
  });
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
/**
 * Berapa bagian opsi pertama yang harus masuk layar sebelum ia disebut
 * terlihat (D-4).
 *
 * Diberi nama dan diekspor di A-3 supaya rangkaian e2e bisa MEMBACANYA dari
 * kode ini alih-alih menyalin angkanya. Ambang yang disalin akan berbeda
 * diam-diam begitu salah satunya berubah, dan tes yang memakai ambang berbeda
 * dari produknya akan menunggu kesepakatan yang tidak pernah datang - persis
 * kegagalan lima belas detik yang dilihat reviewer.
 */
export const AMBANG_OPSI_TERLIHAT = 0.6;

function usePengamatOpsi(
  soal_id: string,
  kirim: (aksi: Aksi) => void,
): RefObject<HTMLLabelElement> {
  const acuan = useRef<HTMLLabelElement>(null);
  useEffect(() => {
    const simpul = acuan.current;
    if (simpul === null || typeof IntersectionObserver === 'undefined') {
      // Tanpa pengamat, bilah "Pilih jawaban" akan menetap selamanya dan
      // menutupi opsi. Lebih baik menganggapnya terlihat.
      kirim({ jenis: 'opsi_terlihat', soal_id, terlihat: true });
      return;
    }
    const pengamat = new IntersectionObserver(
      (masuk) => {
        /*
         * Butir **terakhir**, bukan yang pertama (A-3, F-1).
         *
         * `IntersectionObserver` tidak memanggil balik sekali per perubahan. Ia
         * menyerahkan antrean berisi semua pengamatan yang menumpuk sejak
         * panggilan terakhir, **tertua lebih dulu**. Ketika frame tertunda —
         * mesin berbeban, tab sibuk — dua perlintasan ambang atau lebih tiba
         * dalam satu panggilan.
         *
         * Versi lama membaca `masuk[0]` dan membuang sisanya, jadi ia mencatat
         * putusan yang sudah kedaluwarsa. Sesudah itu tidak ada perlintasan
         * baru, jadi tidak ada panggilan balik baru: keadaannya membeku pada
         * nilai basi sampai pemain berpindah layar. Yang terlihat pemain adalah
         * bilah "Pilih jawaban" yang hilang padahal opsinya masih jauh di
         * bawah lipatan — satu-satunya petunjuk jalan di layar, lenyap.
         *
         * Terukur: 1 dari 15 putaran di bawah beban, dengan opsi pertama di
         * rasio 0,0000 dan tidak ada bilah sama sekali. `usePengamatKartu` di
         * berkas ini sudah benar sejak awal — ia menggelung seluruh antrean.
         */
        const butir = masuk[masuk.length - 1];
        if (butir === undefined) return;
        kirim({ jenis: 'opsi_terlihat', soal_id, terlihat: butir.isIntersecting });
      },
      { threshold: AMBANG_OPSI_TERLIHAT },
    );
    pengamat.observe(simpul);
    return () => {
      pengamat.disconnect();
    };
  }, [soal_id, kirim]);
  return acuan;
}

/**
 * Sesudah "Cek jawabanku", layar bergulir sampai cap umpan balik terlihat
 * (M3.5 D-3).
 *
 * Kenapa ini sebuah efek dan bukan satu baris di dalam `onClick`: saat penangan
 * ketuk berjalan, `dispatch` baru saja dikirim dan cap **belum dirender sama
 * sekali** — wadah `role="status"` memang sudah ada sejak layar lahir, tetapi
 * ia masih kosong, jadi menggulir ke sana akan mendaratkan pemain di tempat
 * yang isinya belum ada. Yang ditinggalkan penangan ketuk hanyalah permintaan;
 * yang memenuhinya adalah efek ini, sesudah melihat bahwa soalnya memang jadi
 * terkunci. Reducer tidak berubah dan tidak ada peristiwa baru: ini kerja
 * tampilan.
 *
 * Keadaan **sesudahnya** yang diperiksa, bukan sebelumnya. Kalau reducer
 * menolak aksinya, `dikunci` tetap `false` dan tidak ada yang bergulir.
 *
 * `prefers-reduced-motion` dihormati lewat `gerakHalus()`: lompat, bukan
 * meluncur.
 */
function useGulirKeCap(soal_id: string, dikunci: boolean): () => void {
  const diminta = useRef(false);
  useEffect(() => {
    if (!diminta.current) return;
    if (!dikunci) return;
    diminta.current = false;
    document
      .getElementById(`kunci-${soal_id}`)
      ?.scrollIntoView({ block: 'start', behavior: gerakHalus() });
  }, [soal_id, dikunci]);
  /*
   * Meninggalkan layar soal membatalkan dua hal.
   *
   * Yang pertama permintaan yang belum terpenuhi: tanpa ini, sebuah ketukan
   * yang ditolak reducer akan menggulir soal BERIKUTNYA begitu ia dikunci —
   * gerak yang datangnya dari ketukan di layar lain.
   *
   * Yang kedua gulir halus yang masih berjalan, dan ini terukur, bukan
   * kehati-hatian. Pemain yang menekan "Lanjut" sementara layar masih meluncur
   * ke cap membawa luncuran itu ke layar berikutnya: `window.scrollTo(0, 0)`
   * di `Aplikasi` memang berjalan, tetapi animasinya menimpanya sesudah itu.
   * Terukur di Chromium mesin ini lewat pendengar `scroll` —
   * `1016 → 1025 → 1045 → 39` — dan akibatnya layar pembukaan lahir sudah
   * tergulir. Di bawah beban, angka 39 itu bisa jauh lebih besar; satu putaran
   * `npm run e2e` menemukan layar pembukaan yang terbuka tepat di ringkasannya.
   *
   * `behavior: 'instant'` adalah gulir tanpa animasi yang **membatalkan**
   * animasi yang sedang berjalan; menyetel posisi yang sama dengan posisi
   * sekarang berarti tidak ada yang bergerak karenanya.
   */
  useEffect(() => {
    return () => {
      diminta.current = false;
    };
  }, [soal_id]);
  return useCallback(() => {
    diminta.current = true;
  }, []);
}

/**
 * Isi yang terbuka DI DALAM lembar (D-5). Apa yang tampil ditentukan
 * `isiSumber()`, fungsi murni yang dites; komponen ini hanya menatanya.
 */
function IsiLembarTerbuka({
  fakta,
  indeks,
  emiten,
  sudahDibuka,
}: {
  fakta: Fakta;
  indeks: ReadonlyMap<string, Fakta>;
  emiten: Emiten;
  /** Layar pembukaan sudah tercapai, jadi identitas emiten boleh tampil. */
  sudahDibuka: boolean;
}): JSX.Element {
  const isi = isiSumber(fakta, indeks, emiten, sudahDibuka);
  return (
    <>
      <p className="meta">Kalimat resminya</p>
      <p className="isi">{isi.kalimatResmi}</p>

      {isi.caraHitung !== null && <p className="isi">{isi.caraHitung}</p>}

      <p className="meta">{isi.sejakKapan}</p>

      {isi.dihitungDari.length > 0 && (
        <p className="meta">Dihitung dari: {isi.dihitungDari.join(' · ')}</p>
      )}

      <details className="rincian-teknis" data-uid="rincian">
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

/**
 * Baris istilah (A-2): sakelar yang keadaannya hidup di reducer.
 *
 * Dulu `<details>` bawaan peramban. Ia memang bisa menutup — tetapi
 * keadaannya tinggal di DOM, jadi tidak ada tes yang bisa membuktikannya, dan
 * pembukaannya tidak pernah tercatat. Sekarang bentuknya sama dengan kaki
 * lembar: satu tombol, satu `dispatch`, satu peristiwa saat membuka.
 */
function BarisIstilah({
  istilah,
  soal_id,
  terbuka,
  kirim,
}: {
  istilah: Istilah[];
  soal_id: string;
  terbuka: boolean;
  kirim: (aksi: Aksi) => void;
}): JSX.Element {
  return (
    <div className="istilah-lipat" data-uid="istilah">
      <button
        type="button"
        className="baris-istilah"
        aria-expanded={terbuka}
        onClick={() => {
          kirim({ jenis: 'sakelar_istilah', soal_id });
        }}
      >
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
      </button>
      {terbuka && (
        <div className="buka istilah-buka">
          {istilah.map((butir) => (
            <p className="isi" key={butir.kata}>
              <b>{butir.kata}</b> — {butir.arti}
            </p>
          ))}
        </div>
      )}
    </div>
  );
}

/**
 * Penjelasan sebaris untuk angka yang ditautkan di teks kunci dan pembukaan
 * (D-5, dilengkapi A-2, dipindahkan ke dalam paragraf di M3.6 D-1).
 *
 * Sebelum A-2, tautan angka di kedua tempat itu **memanggil `sakelarSumber` tetapi
 * tidak menampilkan apa pun**: satu-satunya yang merender `sumberTerbuka`
 * adalah lembar dokumen, dan layar pembukaan tidak punya lembar. Kontrol yang
 * bisa diketuk tanpa akibat lebih buruk daripada kontrol yang tidak bisa
 * ditutup — audit A2-T2 menemukannya, dan ini perbaikannya.
 *
 * Sampai M3.5 ia dirender sesudah **seluruh** paragraf, dan itulah temuan
 * pertama pemilik di M3.6: ia mengetuk "9 Oktober 2025" di kalimat pertama
 * sebuah paragraf empat kalimat, dan blok penjelasannya mendarat 289 px di
 * bawah tautan itu — di luar layar 640 px. Terukur, bukan dugaan. Sekarang
 * `Teks` yang menempatkannya, tepat sesudah kalimat yang memuat tautannya, dan
 * komponen ini tinggal satu blok untuk satu fakta.
 */
function PenjelasanSebaris({
  fact_id,
  indeks,
  emiten,
  sudahDibuka,
}: {
  fact_id: string;
  indeks: ReadonlyMap<string, Fakta>;
  emiten: Emiten;
  sudahDibuka: boolean;
}): JSX.Element | null {
  const fakta = indeks.get(fact_id);
  if (fakta === undefined) return null;
  return (
    <div className="buka penjelasan-sebaris" id={idPenjelasan(fact_id)}>
      <IsiLembarTerbuka fakta={fakta} indeks={indeks} emiten={emiten} sudahDibuka={sudahDibuka} />
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Balon chat melayang (M3.7 D-1)                                      */
/* ------------------------------------------------------------------ */

/**
 * Berapa bagian balon asli yang masih harus terlihat **di bawah keping**
 * sebelum salinan melayang mengambil alih (patokan v3d).
 *
 * Diekspor supaya rangkaian e2e bisa MEMBACANYA dari kode ini alih-alih
 * menyalin angkanya, persis alasan `AMBANG_OPSI_TERLIHAT` diekspor: dua angka
 * yang berjanji sama adalah dua angka yang akan berselisih diam-diam, dan tes
 * yang memakai ambang berbeda dari produknya menunggu kesepakatan yang tidak
 * pernah datang.
 *
 * Setengah, bukan "sampai hilang seluruhnya": menunggu balon lenyap berarti
 * ada satu jendela gulir tempat pesannya sudah tidak terbaca tetapi salinannya
 * belum ada — dan justru di jendela itu pemain sedang membaca pilihan.
 */
export const AMBANG_BALON_MELAYANG = 0.5;

/** Tepi balon yang tetap terlihat saat mengintip, piksel (patokan v3d; `--intip`). */
export const INTIP_BALON_PX = 28;

/**
 * Tarikan harus melewati sepertiga tinggi balon sebelum ia jatuh ke sisi lain.
 *
 * Sepertiga, bukan setengah: jari yang menarik balon ke bawah berhenti begitu
 * isinya terbaca, bukan begitu balonnya sampai di tempatnya.
 */
export const BAGI_AMBANG_TARIK = 3;

/**
 * Jarak antara tepi bawah balon melayang dan sasaran gulir (M3.8 D-10), piksel.
 * Menampung garis `0 2px 0` di bawah balon dan sedikit napas; tanpa jarak, cap
 * menempel ke grip dan terbaca sebagai bagian balon.
 */
const JARAK_DI_BAWAH_BALON = 8;

/** Gerak jari paling jauh yang masih dianggap ketukan, bukan tarikan (patokan v3d). */
const GESER_TARIK = 6;

/** Ambang perpotongan yang dipantau; cukup rapat di sekitar setengah. */
const AMBANG_PENGAMAT_BALON = [0, 0.25, 0.4, 0.5, 0.6, 0.75, 1];

/** Gerakan jari yang sedang berlangsung. Hidup selama satu tarikan saja. */
interface TarikanBalon {
  mulaiY: number;
  tinggi: number;
  turunAwal: boolean;
  bergerak: boolean;
}

/**
 * Salinan balon chat yang melayang di bawah keping (M3.7 D-1).
 *
 * **Perilakunya disalin dari `docs/contoh/layar-soal-v3d.html`**, bukan
 * ditafsirkan: pemilik menolak dua versi sebelumnya dengan mata dan menyetujui
 * yang ini ("oke mantap, ini yang aku maksud"). Yang menyimpang dari sana
 * disebut namanya di komentar di bawah.
 *
 * Komponen ini tidak menyimpan satu pun keadaan permainan. Yang ia pegang
 * hanya dua hal yang memang bukan keadaan:
 *
 * - `tarikan`, data satu gerakan jari yang hidup dari `pointerdown` sampai
 *   `pointerup` dan mati bersamanya. Hasil gerakan itu — turun atau
 *   mengintip — diserahkan ke reducer, dan hanya dari sanalah ia dirender.
 * - posisi balon **selama** jari masih menempel, yang ditulis langsung ke
 *   `style.transform`. Enam puluh kali `dispatch` per detik untuk hal yang
 *   tidak pernah dicatat akan membuat setiap gerakan jari melewati React.
 */
function BalonMelayang({
  layar,
  pesan,
  tanggal,
  aktif,
  keadaan,
  acuanAsli,
  kirim,
}: {
  layar: string;
  pesan: Soal['pesan'];
  tanggal: string;
  aktif: boolean;
  keadaan: KeadaanBalon;
  acuanAsli: RefObject<HTMLElement>;
  kirim: (aksi: Aksi) => void;
}): JSX.Element {
  const acuanWadah = useRef<HTMLDivElement>(null);
  const tarikan = useRef<TarikanBalon | null>(null);

  /*
   * Pengamat balon asli. Ia **hanya** `dispatch`; yang memutuskan apa artinya
   * "melayang" bagi keadaan permainan ada di reducer (D-2), seperti pengamat
   * kartu dan pengamat opsi.
   */
  useEffect(() => {
    const asli = acuanAsli.current;
    const wadah = acuanWadah.current;
    if (asli === null || wadah === null) return;

    /*
     * Tinggi keping DIUKUR, tidak ditebak: huruf, gerigi, dan ukuran jendela
     * semuanya ikut menentukannya, dan angka yang ditebak akan membuat balon
     * mengintip di tempat yang salah tanpa ada yang tahu. Nilainya diserahkan
     * ke CSS lewat satu variabel. (Sejak M3.9 D-5 keping satu baris seperti
     * patokan: tanggal kiri, bulatan kanan.)
     */
    const ukurKeping = (): number =>
      document.querySelector('[data-uid="keping"]')?.getBoundingClientRect().height ?? 0;

    let tinggiKeping = ukurKeping();
    const pasangTinggi = (): void => {
      wadah.style.setProperty('--tinggi-keping', `${String(tinggiKeping)}px`);
    };
    pasangTinggi();

    if (typeof IntersectionObserver === 'undefined') {
      // Tanpa pengamat, salinan yang menetap akan menutupi bacaan yang sedang
      // dibuka. Lebih baik menganggapnya tidak pernah melayang.
      kirim({ jenis: 'balon_melayang', layar, melayang: false });
      return;
    }

    const pengamat = new IntersectionObserver(
      (masuk) => {
        /*
         * Butir **terakhir**, bukan yang pertama — alasannya sama persis
         * dengan `usePengamatOpsi` (A-3, F-1): satu panggilan balik bisa
         * membawa beberapa perlintasan ambang yang menumpuk, tertua lebih
         * dulu, dan membaca yang pertama berarti mencatat putusan basi yang
         * tidak akan pernah diperbarui.
         */
        const butir = masuk[masuk.length - 1];
        if (butir === undefined) return;
        const kotak = butir.boundingClientRect;
        const terlihat =
          kotak.height <= 0 ? 1 : Math.max(0, kotak.bottom - tinggiKeping) / kotak.height;
        const lewat = kotak.top < tinggiKeping && terlihat < AMBANG_BALON_MELAYANG;
        kirim({ jenis: 'balon_melayang', layar, melayang: lewat });
      },
      {
        threshold: AMBANG_PENGAMAT_BALON,
        rootMargin: `-${String(Math.round(tinggiKeping))}px 0px 0px 0px`,
      },
    );
    pengamat.observe(asli);

    /*
     * Jendela yang berubah ukuran memindahkan kepingnya. `rootMargin` pengamat
     * tidak ikut berubah — ia hanya menentukan kapan panggilan balik datang,
     * dan ambang yang menentukan keputusannya dihitung ulang dari kotak yang
     * segar di setiap panggilan.
     */
    const ubahUkuran = (): void => {
      tinggiKeping = ukurKeping();
      pasangTinggi();
    };
    window.addEventListener('resize', ubahUkuran, { passive: true });

    return () => {
      window.removeEventListener('resize', ubahUkuran);
      pengamat.disconnect();
      // Meninggalkan layar mengembalikan balonnya ke keadaan bawaan.
      kirim({ jenis: 'balon_melayang', layar, melayang: false });
    };
  }, [layar, kirim, acuanAsli]);

  /*
   * M3.8 D-10 (amandemen A-1): selama salinan ini aktif, ia ikut menutupi
   * puncak layar — dan sasaran gulir (`.tanya`, `.kunci-jawaban`, `.antar`)
   * harus mendarat DI BAWAHNYA, bukan hanya di bawah keping. Tepi itu diukur
   * di sini dan diserahkan ke CSS lewat `--tepi-atas` di akar dokumen.
   *
   * Dihitung dari keadaan, bukan dari kotak balon yang sedang bergerak: saat
   * mengunci, balon yang turun sedang meluncur kembali ke intip (260 ms), dan
   * kotaknya di tengah luncuran bukan tempat ia akan berhenti. Yang diukur
   * adalah hal yang tidak ikut bergerak: puncak wadah (= tinggi keping yang
   * terukur), `--intip` terhitung, dan tinggi balon tanpa transformasi.
   *
   * `useLayoutEffect`, bukan `useEffect`: efek gulir di `useGulirKeCap` adalah
   * efek biasa milik induknya, dan ia harus membaca angka yang sudah baru.
   */
  useLayoutEffect(() => {
    const akar = document.documentElement;
    const wadah = acuanWadah.current;
    const balon = wadah?.querySelector<HTMLElement>('.melayang-balon') ?? null;
    if (!aktif || wadah === null || balon === null) {
      akar.style.removeProperty('--tepi-atas');
      return;
    }
    const pasang = (): void => {
      const intip = parseFloat(getComputedStyle(wadah).getPropertyValue('--intip'));
      const turunUtuh = keadaan === 'turun';
      const bawah =
        wadah.getBoundingClientRect().top +
        (turunUtuh ? balon.offsetHeight : Number.isFinite(intip) ? intip : INTIP_BALON_PX);
      akar.style.setProperty('--tepi-atas', `${String(Math.ceil(bawah + JARAK_DI_BAWAH_BALON))}px`);
    };
    pasang();
    window.addEventListener('resize', pasang, { passive: true });
    return () => {
      window.removeEventListener('resize', pasang);
      akar.style.removeProperty('--tepi-atas');
    };
  }, [aktif, keadaan]);

  const mulaiTarik = (peristiwa: PointerReact<HTMLButtonElement>): void => {
    const simpul = peristiwa.currentTarget;
    tarikan.current = {
      mulaiY: peristiwa.clientY,
      tinggi: simpul.getBoundingClientRect().height,
      turunAwal: keadaan === 'turun',
      bergerak: false,
    };
    simpul.classList.add('menarik');
    simpul.setPointerCapture(peristiwa.pointerId);
  };

  const ikutJari = (peristiwa: PointerReact<HTMLButtonElement>): void => {
    const gerak = tarikan.current;
    if (gerak === null) return;
    const beda = peristiwa.clientY - gerak.mulaiY;
    if (Math.abs(beda) > GESER_TARIK) gerak.bergerak = true;
    if (!gerak.bergerak) return;
    const penuh = 0;
    const mengintip = INTIP_BALON_PX - gerak.tinggi;
    const y = Math.max(mengintip, Math.min(penuh, (gerak.turunAwal ? penuh : mengintip) + beda));
    peristiwa.currentTarget.style.transform = `translateY(${String(y)}px)`;
  };

  /** Lepaskan pegangan jari dan kembalikan posisi balon ke tangan CSS. */
  const lepaskan = (simpul: HTMLButtonElement): TarikanBalon | null => {
    const gerak = tarikan.current;
    tarikan.current = null;
    simpul.classList.remove('menarik');
    simpul.style.transform = '';
    return gerak;
  };

  const selesaiTarik = (peristiwa: PointerReact<HTMLButtonElement>): void => {
    const gerak = lepaskan(peristiwa.currentTarget);
    if (gerak === null) return;
    if (!gerak.bergerak) {
      kirim({
        jenis: 'sakelar_balon',
        layar,
        keadaan: gerak.turunAwal ? 'intip' : 'turun',
        cara: 'ketuk',
      });
      return;
    }
    const beda = peristiwa.clientY - gerak.mulaiY;
    const ambang = gerak.tinggi / BAGI_AMBANG_TARIK;
    // Dari turun, jari harus menarik NAIK sejauh ambang; dari mengintip, TURUN.
    const turun = gerak.turunAwal ? beda > -ambang : beda > ambang;
    kirim({ jenis: 'sakelar_balon', layar, keadaan: turun ? 'turun' : 'intip', cara: 'tarik' });
  };

  /*
   * Menyimpang dari patokan v3d, dan sengaja: di sana `pointercancel` masuk ke
   * jalur yang sama dengan `pointerup`, sehingga gerakan yang DIBATALKAN
   * peramban — jari yang ternyata menggulir halaman — terbaca sebagai ketukan
   * dan membalik keadaan balon. Gerakan yang dibatalkan bukan ketukan.
   */
  const batalTarik = (peristiwa: PointerReact<HTMLButtonElement>): void => {
    lepaskan(peristiwa.currentTarget);
  };

  const kelas = ['melayang', aktif ? 'melayang-aktif' : '', keadaan === 'turun' ? 'melayang-turun' : '']
    .filter((k) => k !== '')
    .join(' ');

  return (
    <div className={kelas} ref={acuanWadah} aria-hidden={!aktif}>
      <button
        type="button"
        className="pesan-balon melayang-balon"
        data-uid="balon"
        /*
         * Satu kontrol, satu nama. Isinya `aria-hidden` supaya teks pesan tidak
         * terbaca dua kali — yang membaca dengan telinga sudah punya balon
         * aslinya di alirannya, dan salinan ini tidak membawa satu kata baru.
         */
        aria-label={`Balon pesan ${pesan.nama}: ketuk untuk menurunkan atau menaikkan`}
        aria-pressed={keadaan === 'turun'}
        tabIndex={aktif ? 0 : -1}
        onPointerDown={mulaiTarik}
        onPointerMove={ikutJari}
        onPointerUp={selesaiTarik}
        onPointerCancel={batalTarik}
        /*
         * `detail === 0` berarti klik yang lahir dari papan ketik (Enter atau
         * spasi), bukan dari jari. Klik jari sudah ditangani `pointerup`;
         * menanganinya dua kali akan membalik balonnya dua kali.
         */
        onClick={(peristiwa) => {
          if (peristiwa.detail !== 0) return;
          kirim({
            jenis: 'sakelar_balon',
            layar,
            keadaan: keadaan === 'turun' ? 'intip' : 'turun',
            cara: 'ketuk',
          });
        }}
      >
        <span aria-hidden="true">
          <span className="pesan-meta">
            <span className="pesan-nama">{pesan.nama}</span> · {tanggal}
          </span>
          <span className="isi">{pesan.isi}</span>
          <span className="pesan-jam">{pesan.jam}</span>
        </span>
        <span className="grip" aria-hidden="true">
          <i />
        </span>
      </button>
    </div>
  );
}

export function LayarSoal({
  kasus,
  keadaan,
  nomor,
  kirim,
  sakelarSumber,
  indeks,
  tampilan,
  kirimTampilan,
}: {
  kasus: Kasus;
  keadaan: Keadaan;
  nomor: number;
  kirim: (aksi: Aksi) => void;
  sakelarSumber: SakelarSumber;
  indeks: ReadonlyMap<string, Fakta>;
  /** Keadaan pemandu/petunjuk (M3.14); tanpa ini layar dirender seperti sebelum M3.14. */
  tampilan?: KeadaanTampilan;
  kirimTampilan?: (aksi: AksiTampilan) => void;
}): JSX.Element {
  const soal: Soal | undefined = kasus.soal[nomor];
  if (soal === undefined) return <p>Soal tidak ditemukan.</p>;
  const s = keadaan.soal[soal.soal_id];
  if (s === undefined) return <p>Soal tidak ditemukan.</p>;

  const kartu = kartuSoal(kasus, soal);
  const menentukan = new Set(soal.kartu_penentu);
  const acuanTumpukan = usePengamatKartu(soal.soal_id, kirim);
  const acuanOpsi = usePengamatOpsi(soal.soal_id, kirim);
  // Balon asli yang diamati salinan melayangnya (M3.7 D-1).
  const acuanPesan = useRef<HTMLElement>(null);
  const layarIni = namaLayar({ jenis: 'soal', nomor });
  const bilah = bilahBawah(s, nomor, kasus.soal.length);
  // D-2: tanggalnya lahir dari fungsi murni, tidak diketik tangan di data.
  const tanggal = tanggalBalon(kasus.tanggal_t);
  const gulirKeCap = useGulirKeCap(soal.soal_id, s.dikunci);
  /*
   * M3.14: apa yang disorot pemandu, dan kartu mana yang ditandai. Kartu yang
   * ditandai SELALU `kartu_penentu` — tidak pernah pilihan (D-2) — dan hanya
   * sebelum dikunci; sesudah dikunci salinan "Kartu yang menentukan" yang
   * mengambil alih.
   */
  const sorotKini = tampilan === undefined ? null : sorotPemandu(tampilan);
  const pemanduTampil = tampilan !== undefined && tampilan.pemandu.langkah !== null;
  const ditandai = kartuDitandai(tampilan, soal, s.dikunci);

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
        className={sorotKini === 'omongan' ? 'pesan disorot' : 'pesan'}
        data-uid="pesan"
        data-gulir-sorot="omongan"
        ref={acuanPesan}
        /*
         * Nama untuk pembaca layar: tidak berubah sejak M3.5 D-2, kata demi
         * kata. Jamnya ikut di sini walau tanggal di layar tidak lagi
         * membawanya — yang membaca dengan telinga tidak melihat pojok kanan
         * bawah balon.
         */
        aria-label={`Pesan dari ${soal.pesan.nama}, ${tanggal} · ${soal.pesan.jam}`}
      >
        {/* Lubang sorotan langkah 1 = gelembungnya, bukan baris selebar kolom (kritik M3.16 r0 butir 4). */}
        <blockquote className="pesan-balon" data-lubang="omongan">
          {/*
            Baris kepala balon (M3.5 D-2, dipindahkan ke dalam balon di M3.6
            D-2): nama pengirim dan tanggal, satu baris, seperti aplikasi pesan.

            Dua temuan berbeda bertemu di baris ini. Yang pertama dari teman
            pemilik: ia membaca ketiga pesan tanpa pernah tahu kapan pesan itu
            dikirim — ia tidak melihat keping tanggal yang menempel di puncak
            layar, dan balonnya hanya berbunyi "19.42". Yang kedua dari pemilik
            sendiri, 22 Sep: nama yang berdiri di ATAS balon meninggalkan celah
            kosong yang terasa tidak nyaman. Jadi namanya masuk, dan tidak ada
            lagi elemen di atas balon.

            Ia **menyimpang dari patokan** `docs/contoh/layar-soal.html`, yang
            tidak memuat baris ini; patokannya sendiri tidak diubah. Alasannya
            temuan pemilik, dan ukurannya ditempel di ledger.
          */}
          <p className="pesan-meta">
            <span className="pesan-nama">{soal.pesan.nama}</span> · {tanggal}
          </p>
          {/*
            Dirender POLOS, tanpa Teks: angka di dalam ucapan orang adalah
            ucapan, bukan fakta (INV-4). Menautkannya membuat kabar tampak sudah
            terverifikasi sebelum pemain memeriksanya. Validator menolak tautan
            di sini lewat mode ketat 'ucapan' (T-01).
          */}
          <p className="isi">{soal.pesan.isi}</p>
          {/*
            Jam di pojok kanan bawah, seperti patokan (M3.6 D-2 amandemen A-1:
            "jam sudah tepat di kanan bawah", pemilik). R-1 sempat
            menghapusnya karena angka yang sama tampil dua kali dalam satu
            balon; yang dibuang sekarang adalah salinannya di baris kepala,
            bukan yang di pojok. Jadi jamnya tetap tertulis **sekali**, di
            tempat yang sudah disetujui mata pemilik.
          */}
          <time className="pesan-jam">{soal.pesan.jam}</time>
        </blockquote>
      </figure>

      {/*
        Salinan melayang (M3.7 D-1). Ia dirender SELALU, bukan hanya ketika
        aktif: kemunculannya adalah sebuah transisi, dan yang baru lahir tidak
        punya keadaan sebelumnya untuk ditransisikan. Yang ditentukan "aktif"
        hanyalah apakah ia terlihat dan bisa disentuh.
      */}
      <BalonMelayang
        layar={layarIni}
        pesan={soal.pesan}
        tanggal={tanggal}
        aktif={balonMelayang(keadaan, layarIni)}
        keadaan={keadaanBalon(keadaan, layarIni)}
        acuanAsli={acuanPesan}
        kirim={kirim}
      />

      <p className="meta antar" id={`antar-${soal.soal_id}`} data-uid="antar">
        {kalimatAntar(kartu.length)}
      </p>

      <div
        className={sorotKini === 'kartu' ? 'tumpukan disorot' : 'tumpukan'}
        ref={acuanTumpukan}
        data-gulir-sorot="kartu"
        data-lubang="kartu"
      >
        {kartu.map((fakta) => (
          <KartuFakta
            key={fakta.fact_id}
            fakta={fakta}
            menentukan={s.dikunci && menentukan.has(fakta.fact_id)}
            ditandai={ditandai.has(fakta.fact_id)}
            sakelarSumber={sakelarSumber}
            terbuka={keadaan.sumberTerbuka.includes(fakta.fact_id)}
          >
            <IsiLembarTerbuka
              fakta={fakta}
              indeks={indeks}
              emiten={kasus.emiten}
              sudahDibuka={false}
            />
          </KartuFakta>
        ))}
      </div>

      {soal.istilah.length > 0 && (
        <BarisIstilah
          istilah={soal.istilah}
          soal_id={soal.soal_id}
          terbuka={keadaan.istilahTerbuka}
          kirim={kirim}
        />
      )}

      <h1
        className="judul tanya"
        id={`tanya-${soal.soal_id}`}
        data-uid="tanya"
        data-gulir-sorot="pilihan"
        data-lubang="pilihan"
      >
        {soal.tanya}
      </h1>

      <fieldset
        className={sorotKini === 'pilihan' ? 'pilihan disorot' : 'pilihan'}
        disabled={s.dikunci}
        data-lubang="pilihan"
      >
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
                  kirimTampilan?.({ jenis: 'pemain_memilih' });
                }}
              />
              <span className="opsi-huruf" aria-hidden="true">
                {p.kunci}
              </span>
              <span className="opsi-teks">
                {/*
                  Opsi juga ucapan: polos, tanpa tebal dan tanpa tautan (D-2).
                  "Polos" berarti penanda `[[fact_id|teks]]` DILEPAS dan hanya
                  teks yang dilihat pemain yang tampil — bukan penandanya ikut
                  terbaca. `interaktif={false}` persis untuk itu; tanpa ia,
                  opsi c soal 1 menampilkan
                  "[[kelipatan-2025-08-01-2025-10-08|22 kali]]" di layar.
                */}
                <Teks teks={p.teks} sakelarSumber={sakelarSumber} interaktif={false} />
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

      {/*
        Bantuan sebelum dikunci (M3.14): "Cara main" membuka pemandu lagi dari
        langkah pertama. Sesudah dikunci baris ini hilang — pemandu yang
        berkata "sekarang kamu yang memutuskan" tidak berarti lagi di sana.
      */}
      {!s.dikunci && kirimTampilan !== undefined && (
        <div className="bantuan-soal">
          {/*
            Petunjuk (M3.14 D-2): menggulir ke dan menandai `kartu_penentu` —
            kartunya, bukan jawabannya. Tidak menyentuh pilihan sama sekali.
            Ketukannya tercatat `ketuk` dengan uid `petunjuk-kartu`.
          */}
          <button
            type="button"
            className={sorotKini === 'petunjuk' ? 'tombol-petunjuk disorot' : 'tombol-petunjuk'}
            data-uid="petunjuk-kartu"
            data-gulir-sorot="petunjuk"
            data-lubang="petunjuk"
            onClick={() => {
              kirimTampilan({ jenis: 'minta_petunjuk', soal_id: soal.soal_id });
            }}
          >
            {LABEL_TOMBOL_PETUNJUK}
          </button>
          <button
            type="button"
            className="cara-main"
            data-uid="cara-main"
            onClick={() => {
              kirimTampilan({ jenis: 'buka_pemandu' });
            }}
          >
            {LABEL_CARA_MAIN}
          </button>
        </div>
      )}

      <button
        type="button"
        className="kembali"
        data-uid="kembali"
        onClick={() => {
          kirim({ jenis: 'kembali_ke_kartu', soal_id: soal.soal_id });
          /*
           * Ke PUNCAK halaman, bukan ke kalimat pengantar (M3.7 D-1).
           *
           * Sejak balon melayang ada, mendarat di pengantar berarti mendarat
           * di satu-satunya tempat yang masih tertutup salinan balon: pesannya
           * melayang tepat di bawah keping justru karena aslinya sudah lewat
           * ke atas. Di puncak halaman balon ada di alirannya sendiri,
           * salinannya padam, dan tidak ada apa pun yang menutupi apa pun.
           *
           * Menggulir tetap kerja tampilan; yang dicatat tetap satu peristiwa
           * dari reducer di atas.
           */
          window.scrollTo({ top: 0, behavior: gerakHalus() });
        }}
      >
        ↑ Kembali ke dokumen
      </button>

      {/*
        Wadah `role="status"` ada sejak layar dirender; isinya yang berubah.
        Wadah yang lahir bersama isinya kadang tidak terbaca pembaca layar.
      */}
      <div
        className="kunci-jawaban"
        role="status"
        aria-live="polite"
        id={`kunci-${soal.soal_id}`}
        data-uid="sesudah-dikunci"
      >
        {s.dikunci && (
          <>
            <p className={`cap${s.benar === true ? ' cap-cocok' : ' cap-belum'}`}>
              <span aria-hidden="true" className="cap-tanda">
                {s.benar === true ? '✓' : '!'}
              </span>
              {s.benar === true ? 'Cocok dengan kartu' : 'Belum cocok dengan kartu'}
            </p>

            {/*
              Salinan ringkas kartu penentu, supaya mata tidak menggulir balik.

              Bahannya **sama persis** dengan `KartuFakta`: `.lembar-badan`
              membungkus kepala peran *meta* dan isi peran *isi*, tanpa kaki
              (tidak ada yang bisa dibuka di salinan). Sebelum A-2, blok ini
              merender `<p className="lembar-isi">` langsung di bawah
              `article.lembar` — dan karena bantalan lembar hanya ada di
              `.lembar-badan`, badannya menempel ke tepi kiri kartu sementara
              kepalanya berjarak 12 px. Teman pemilik yang menemukannya:
              "memang mepet gini tulisannya ke pinggir?"

              Pelajarannya bukan soal satu blok: bahan yang dipakai ulang harus
              dipakai ulang **beserta bantalannya**, bukan hanya rupanya.
            */}
            <div className="penentu" data-uid="penentu">
              <p className="meta penentu-judul">Kartu yang menentukan</p>
              {kartu
                .filter((f) => menentukan.has(f.fact_id))
                .map((f) => (
                  <article
                    key={f.fact_id}
                    className={`lembar lembar-ringkas${
                      f.sumber.jenis === 'turunan' ? ' lembar-hitung' : ''
                    }`}
                  >
                    <div className="lembar-badan">
                      <p className="meta">{f.awam?.kepala ?? f.fact_id}</p>
                      <p className="isi lembar-badan-isi">
                        <Teks
                          teks={f.awam?.isi ?? f.klaim}
                          sakelarSumber={sakelarSumber}
                          tebalSaja
                        />
                      </p>
                    </div>
                  </article>
                ))}
            </div>

            {/*
              `div`, bukan `p` (M3.6 D-1): penjelasan sebaris adalah blok
              berbingkai yang kini hidup DI DALAM paragraf ini, dan blok di
              dalam `<p>` bukan susunan yang sah. Jaraknya ditulis di
              `.teks-kunci` supaya rupanya tidak berubah.
            */}
            <div className="teks-kunci" data-uid="teks-kunci">
              <Teks
                teks={soal.penjelasan}
                sakelarSumber={sakelarSumber}
                terbuka={keadaan.sumberTerbuka}
                penjelasan={(fact_id) => (
                  <PenjelasanSebaris
                    fact_id={fact_id}
                    indeks={indeks}
                    emiten={kasus.emiten}
                    sudahDibuka={false}
                  />
                )}
              />
            </div>
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

        `data-uid` menyebut KEADAAN bilahnya, bukan sekadar "bilah" (D-10):
        `bilah:turun` / `bilah:kunci` / `bilah:lanjut`. Tanpa itu, ringkasan
        tidak bisa menjawab "berapa sesi mengetuk ↓ Pilih jawaban (dulu ↓ Jawab di bawah)" —
        satu-satunya angka yang memberi tahu apakah opsi pertama memang tidak
        terlihat di ponsel pemilik.
      */}
      {bilah.jenis !== 'tidak-ada' && !pemanduTampil && (
        <div className="tindakan" data-uid={`bilah:${bilah.jenis}`}>
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
                // Gulirnya TIDAK dikerjakan di sini: saat baris ini berjalan,
                // cap belum dirender. Yang ditinggalkan hanya permintaan;
                // yang memenuhinya adalah efek di atas, sesudah melihat bahwa
                // soalnya memang jadi terkunci.
                gulirKeCap();
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

export function LayarPembukaan({
  kasus,
  hari,
  kirim,
  sakelarSumber,
  indeks,
  terbuka,
}: {
  kasus: Kasus;
  hari: ReturnType<typeof penanda>;
  kirim: (aksi: Aksi) => void;
  sakelarSumber: SakelarSumber;
  indeks: ReadonlyMap<string, Fakta>;
  terbuka: readonly string[];
}): JSX.Element {
  /*
   * Pendengar gulir layar ini dihapus di M3.2/T-07: sekarang ada satu pendengar
   * di `Aplikasi` yang berlaku untuk **semua** layar (D-8), memakai aksi
   * `catat_gulir` yang sama. `gulir_maks_persen` di `pembukaan_selesai` dan
   * `loncat_ke_ringkasan` tetap terisi dari sana — reducer menyetel ulang
   * angkanya tiap ganti layar, jadi yang terbaca memang guliran layar ini saja.
   */
  /*
   * Satu penjelasan untuk satu fakta, ditulis sekali dan dipakai keempat tempat
   * bertautan di layar ini (M3.6 D-1). Di mana ia muncul diputuskan `Teks`,
   * yang satu-satunya tahu di kalimat mana tautannya berada.
   */
  const penjelasanSebaris = (fact_id: string): JSX.Element | null => (
    <PenjelasanSebaris fact_id={fact_id} indeks={indeks} emiten={kasus.emiten} sudahDibuka />
  );
  return (
    <section className="layar layar-pembukaan" aria-labelledby="judul-pembukaan">
      <KalenderSobek hari={hari} />
      <h1 id="judul-pembukaan" className="waktu-jalan">
        Waktu berjalan lagi
      </h1>
      {/*
        Jejak verifikasi, satu kalimat, tepat di bawah judul (M3.11 D-3, kritik
        K-9): juri menilai kedalaman teknis 30 %, dan sampai M3.10 buktinya
        hanya ada di dasar layar ini, ±2.500 px di bawah. Bentuk "suara kami"
        (garis kiri tipis, bukan lembar). Angkanya dari sumber yang sama dengan
        bagian jejak di bawah (`jejak.ts`), jadi keduanya tidak bisa berbeda.
      */}
      <p className="jejak-naik">
        {kalimatJejakNaik(kasus)}{' '}
        <button
          type="button"
          className="jejak-naik-tautan"
          data-uid="jejak-naik"
          onClick={() => {
            const rinci = document.getElementById('jejak-rinci');
            if (rinci instanceof HTMLDetailsElement) rinci.open = true;
            gulirKeSasaran('judul-jejak');
          }}
        >
          {TAUTAN_JEJAK_NAIK}{' '}
          <span aria-hidden="true">›</span>
        </button>
      </p>
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
          data-uid="loncat"
          onClick={() => {
            kirim({ jenis: 'loncat_ke_ringkasan' });
            // Gerak halus hanya kalau pemain tidak memintanya dihentikan, dan
            // pendaratannya dibetulkan sesudah sobekan kalender selesai
            // menutup ruangnya (F-M36-1).
            gulirKeSasaran('judul-bacaan');
          }}
        >
          Langsung ke ringkasan ↓
        </button>
      </p>
      {/*
        Rata kiri, bukan `.mundur` (M3.10 D-3, kritik K-5): sesudah judul
        semuanya rata kiri. `.mundur` rata tengah adalah milik judul layar
        pertama; di sini ia membuat satu kalimat berdiri sendirian di tengah
        di antara teks yang rata kiri.
      */}
      <p>Inilah yang terjadi sesudah {hari.panjang}.</p>
      <p className="nama-asli">
        Nama aslinya: {kasus.emiten.nama} ({kasus.emiten.simbol}).
      </p>

      <ol className="garis-waktu" data-uid="garis-waktu">
        {kasus.pembukaan.paragraf.map((paragraf, nomor) => (
          <li key={nomor}>
            <KepingTanggal kasus={kasus} teks={paragraf} />
            <Teks
              teks={paragraf}
              sakelarSumber={sakelarSumber}
              terbuka={terbuka}
              penjelasan={penjelasanSebaris}
            />
          </li>
        ))}
      </ol>

      <section className="bacaan" aria-labelledby="judul-bacaan" data-uid="bacaan">
        <h2 id="judul-bacaan">Apa yang bisa dan tidak bisa dibaca pada {hari.panjang}</h2>
        <h3>Bisa dibaca</h3>
        <ul>
          {kasus.pembukaan.bisa_dibaca.map((baris, nomor) => (
            <li key={nomor}>
              <Teks
                teks={baris}
                sakelarSumber={sakelarSumber}
                terbuka={terbuka}
                penjelasan={penjelasanSebaris}
              />
            </li>
          ))}
        </ul>
        <h3>Tidak bisa dibaca</h3>
        <ul>
          {kasus.pembukaan.tidak_bisa_dibaca.map((baris, nomor) => (
            <li key={nomor}>
              <Teks
                teks={baris}
                sakelarSumber={sakelarSumber}
                terbuka={terbuka}
                penjelasan={penjelasanSebaris}
              />
            </li>
          ))}
        </ul>
        <h3>Yang kami singkirkan dari kartu</h3>
        <ul>
          {kasus.pembukaan.disingkirkan.map((baris, nomor) => (
            <li key={nomor}>
              <Teks
                teks={baris}
                sakelarSumber={sakelarSumber}
                terbuka={terbuka}
                penjelasan={penjelasanSebaris}
              />
            </li>
          ))}
        </ul>
      </section>

      <JejakVerifikasi kasus={kasus} />

      <div className="tindakan" data-uid="bilah">
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
  /*
   * Peran *meta* berhuruf kalimat ("9 Okt 2025"), bukan lagi keping mesin tik
   * kapital berbingkai (M3.10 D-3): itu tulisan kapital ber-spasi yang ketiga,
   * dan `docs/desain.md` mengizinkan tepat dua.
   */
  return <span className="keping-tanggal">{tanggalSingkat(fakta.tersedia_sejak)}</span>;
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
      {/*
        Kata-katanya dan angkanya lahir di `jejak.ts`, fungsi murni yang dites
        (M3.6 D-5). Dulu kalimat ini menyebut "rantai laporan kepemilikan" --
        yang terdengar pemain adalah "rantai komando" -- dan mengeja "sepuluh
        aturan" dengan tangan, padahal mesin V2 punya 31 dan kasus ini dibangun
        V1 dengan 10. Angka yang diketik tangan sudah pasti berbohong ke salah
        satu arah begitu mesinnya berganti.
      */}
      <p>{kalimatJejak(kasus)}</p>
      <details className="jejak-rinci" id="jejak-rinci" data-uid="jejak">
        <summary>{ringkasanJejak(kasus)}</summary>
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
          Aturan yang tidak bisa dijalankan atas simulasi ini:{' '}
          {kasus.pemeriksaan.filter((p) => !p.dijalankan).length} dari{' '}
          {kasus.pemeriksaan.length}.
        </p>
      </details>
      {/*
        Pintu ke "Dapur agen" (M3.13 D-4), di dekat kalimat jejak: satu kalimat
        suara kami yang lebih dulu menyatakan siapa yang menyusun soal simulasi
        ini (`keteranganPenyusun`: berbeda untuk simulasi yang soalnya ditulis
        agent), lalu satu tautan. Tab baru: layar ini masih di tengah alur
        (tiga pertanyaan singkat menunggu), dan pindah halaman di tab yang sama
        akan membuang keadaannya.
      */}
      {/*
        Rupa sesudah kritik D-5 (butir 8): kalimatnya suara kami bergaris kiri,
        tautannya di baris sendiri seperti pintu lipatan di atasnya, dengan
        "↗" karena ia membuka tab baru.
      */}
      <div className="dapur-pintu-jejak">
        <p className="meta">{keteranganPenyusun(kasus.kasus_id)}</p>
        <a
          className="dapur-pintu-tautan"
          href={`?${PARAM_DAPUR}`}
          target="_blank"
          rel="noopener"
          aria-label={`${TAUTAN_DAPUR} (buka di tab baru)`}
          data-uid="dapur:jejak"
        >
          {TAUTAN_DAPUR} ↗
        </a>
      </div>
    </section>
  );
}

const TERASA = ['ujian hafalan', 'membaca data', 'menebak harga'] as const;
const SUMBER_JAWABAN = ['kartu fakta', 'ingatan atau pengetahuan sendiri', 'tebakan'] as const;

export function LayarAkhir({
  kasus,
  keadaan,
  kirim,
  hariIni,
  bulanKalender,
  pilihDariKalender,
}: {
  kasus: Kasus;
  keadaan: Keadaan;
  kirim: (aksi: Aksi) => void;
  hariIni: Penanda;
  /** Kalender simulasi (M3.14 D-3) yang menggantikan "Coba simulasi lain". */
  bulanKalender: readonly BulanKalender[];
  pilihDariKalender: (kasus_id: string) => void;
}): JSX.Element {
  if (keadaan.akhirTerkirim) {
    return (
      <section className="layar layar-akhir" aria-labelledby="judul-terima">
        {/*
          Urutan layar pertama (M3.10 D-6, kritik K-8): kalender → judul →
          kalimat, rata tengah. Sampai M3.9 judulnya berdiri DI ATAS kalender
          dan rata kiri, jadi layar ini terbaca dari "zaman" lain.
        */}
        <div className="kembali-hari-ini" data-uid="kalender">
          <HalamanKalender hari={hariIni} />
          <h1 id="judul-terima" className="mundur">
            Terima kasih.
          </h1>
          <p>Kamu kembali ke hari ini.</p>
        </div>
        {/*
          D-11: klaim lama tentang kue peramban DIHAPUS dari seluruh aplikasi.
          Nomor pengunjung (D-13) memang bukan kue itu, tetapi janji yang
          terdengar lebih bersih daripada kenyataannya tidak boleh ada — orang
          yang membacanya akan menyimpulkan "tidak ada apa pun yang disimpan di
          browser saya", dan sejak D-13 itu tidak benar.
        */}
        <p className="terima-kalimat">{KALIMAT_TERIMA_KASIH}</p>
        {/*
          M3.14 D-3: kalender simulasi menggantikan "Coba simulasi lain" yang
          acak. Kalimat penutup simulasi ini (dari berkas simulasi) tetap
          tampil, sekarang sebagai pengantar kalendernya. Memilih satu hari
          melahirkan `minat_kasus_lain` dari sesi ini lalu membuka
          simulasinya — sesi baru, pengunjung sama, seperti tombol lama.
        */}
        <div className="pesan-alpha" data-uid="pesan-alpha">
          <p>
            <strong>{kasus.penutup.kepala}</strong> {kasus.penutup.isi}
          </p>
        </div>
        <KalenderSimulasi
          bulan={bulanKalender}
          judul={null}
          pengantar={PENGANTAR_KALENDER_AKHIR}
          pilih={pilihDariKalender}
        />
        {/*
          Pintu ke "Dapur agen" (M3.13 D-4) di layar terakhir: permainan sudah
          selesai dan jawaban sudah terkirim, jadi pindah halaman di tab yang
          sama tidak membuang apa pun.
        */}
        <p className="dapur-pintu terima-kalimat">
          <a className="dapur-tautan" href={`?${PARAM_DAPUR}`} data-uid="dapur:akhir">
            {TAUTAN_DAPUR} ›
          </a>
        </p>
      </section>
    );
  }

  return (
    <section className="layar layar-akhir" aria-labelledby="judul-akhir">
      {/*
        Peran *judul* 20 px (M3.10 D-6): layar ini tanpa kalender, jadi tanpa
        grotesk rapat — `docs/desain.md` memberi grotesk hanya kepada kalender
        dan judul layar pertama.
      */}
      <h1 id="judul-akhir" className="judul">
        Tiga pertanyaan singkat
      </h1>
      <p className="meta">
        Semuanya boleh dilewati. Di bawahnya ada kotak kalau kamu mau menulis.
      </p>

      <fieldset className="tanya-akhir" data-uid="akhir:rating">
        <legend>Seberapa layak simulasi ini kamu bagikan ke teman?</legend>
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

      <fieldset className="tanya-akhir" data-uid="akhir:terasa">
        <legend>Simulasi tadi terasa seperti…</legend>
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

      <fieldset className="tanya-akhir" data-uid="akhir:sumber_jawaban">
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

      <label className="tanya-akhir kotak-teks" data-uid="akhir:teks">
        <span className="label-teks">Ada yang membingungkan atau ingin kamu sampaikan?</span>
        <textarea
          rows={4}
          value={keadaan.akhir.teks ?? ''}
          onChange={(peristiwa) => {
            kirim({ jenis: 'isi_akhir', medan: 'teks', nilai: peristiwa.target.value });
          }}
        />
      </label>

      {/*
        Kalimat D-11, kata demi kata. Ia berada di sini — tepat di atas tombol
        Selesai, sesudah kotak teks — karena di situlah pemain memutuskan
        mengirim atau tidak. Kalimat yang sama ada di README.
      */}
      <p className="meta privasi" data-uid="privasi">{KALIMAT_PRIVASI}</p>

      <div className="tindakan" data-uid="bilah">
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

/* ------------------------------------------------------------------ */
/* Pemandu pengguna baru dan soal pemanasan (M3.14 D-1)                */
/* ------------------------------------------------------------------ */

/**
 * Panel pemandu: menempati tempat bilah bawah selama pemandu tampil (bilah
 * aslinya menyingkir), jadi tata letak layar soal tidak bergeser satu piksel
 * pun dan tidak ada yang tertutup selain yang memang biasa ditutup bilah.
 *
 * Sejak M3.16 panel ini berdiri DI ATAS lapisan sorotan (`Sorotan.tsx`): sisa
 * layar redup dan tidak menerima ketukan, kecuali benda di dalam lubang —
 * pemain tetap bisa menggulir, membuka kartu yang disorot, dan memilih ketika
 * pilihan yang disorot; memilih jawaban menutup pemandunya (`pemain_memilih`),
 * begitu pula "Minta petunjuk" di dalam lubang langkah 4. Setiap tombol membawa
 * `data-uid` bernomor langkah, jadi "di langkah mana orang melewati" terbaca
 * dari peristiwa `ketuk` yang sudah ada, tanpa peristiwa baru.
 *
 * Fokus papan ketik (M3.16 D-2): saat panel muncul fokus pindah ke tombol
 * utamanya (tombol yang sama di setiap langkah, jadi fokusnya tidak lompat);
 * teks langkah menjadi deskripsinya dan tetap `aria-live`. Saat panel
 * ditutup dan fokus ikut hilang bersama tombolnya, fokus kembali ke tempatnya
 * semula (mis. "Cara main") — tetapi tidak pernah merebut fokus dari pilihan
 * yang baru saja diketuk pemain.
 */
function PanelPemandu({
  tampilan,
  kirimTampilan,
  soal_id,
}: {
  tampilan: KeadaanTampilan;
  kirimTampilan: (aksi: AksiTampilan) => void;
  /** Soal tempat pemandu menempel; langkah terakhir menjalankan petunjuk di sini. */
  soal_id: string;
}): JSX.Element | null {
  const langkahIni = langkahPemanduKini(tampilan);
  const nomor = nomorLangkah(tampilan);
  const acuanUtama = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    const semula = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    acuanUtama.current?.focus({ preventScroll: true });
    return () => {
      const kini = document.activeElement;
      const hilang = kini === null || kini === document.body || !kini.isConnected;
      if (hilang && semula !== null && semula !== document.body && semula.isConnected) {
        semula.focus({ preventScroll: true });
      }
    };
  }, []);
  if (langkahIni === null || nomor === null || tampilan.pemandu.langkah === null) return null;
  const ke = String(tampilan.pemandu.langkah + 1);
  const terakhir = langkahTerakhir(tampilan);
  return (
    /*
     * Rupa sesudah kritik D-6 (putusan A): paling banyak ±110 px — baris meta
     * "Cara main · n dari 4" dengan "Lewati" di kanannya, lalu satu kalimat
     * pendek dengan tombol utama di kanannya. Yang diterangkan tidak lagi
     * tertutup (keluhan 3/5 penguji D-5).
     */
    <div className="tindakan pemandu" role="region" aria-label="Cara main" data-uid="pemandu">
      <div className="pemandu-kolom">
        <div className="pemandu-kepala">
          <p className="meta pemandu-nomor">Cara main · {nomor}</p>
          <button
            type="button"
            className="pemandu-lewati"
            data-uid={`pemandu:lewati:${ke}`}
            onClick={() => {
              kirimTampilan({ jenis: 'lewati_pemandu' });
            }}
          >
            {LABEL_PEMANDU_LEWATI}
          </button>
        </div>
        <div className="pemandu-badan">
          <p className="pemandu-teks" id="pemandu-teks" aria-live="polite">
            {langkahIni.teks}
          </p>
          <button
            type="button"
            ref={acuanUtama}
            aria-describedby="pemandu-teks"
            className="tombol-utama pemandu-lanjut"
            data-uid={terakhir ? `pemandu:selesai:${ke}` : `pemandu:lanjut:${ke}`}
            onClick={() => {
              kirimTampilan(
                terakhir ? { jenis: 'tunjukkan_petunjuk', soal_id } : { jenis: 'lanjut_pemandu' },
              );
            }}
          >
            {terakhir ? LABEL_PEMANDU_SELESAI : LABEL_PEMANDU_LANJUT}
          </button>
        </div>
      </div>
    </div>
  );
}

/**
 * Soal pemanasan (soal 0) — slot berbasis data, KOSONG di M3.14.
 *
 * Tampil hanya bagi pengunjung yang dipandu dan hanya kalau
 * `web/src/pemanasan/soal-pemanasan.json` ada dan disetujui
 * (`pemanasan.ts`). Susunannya sama dengan layar soal — pesan teman, kartu,
 * pertanyaan, pilihan — supaya yang dipelajari di sini persis yang dipakai di
 * soal 1. Bedanya: tanpa keping tanggal (soal latihan bukan hari bursa
 * simulasi ini), tanpa kaki lembar (tidak ada dokumen sumber), dan jawabannya
 * tidak dikirim ke mana pun — hanya ketukannya yang tercatat (`pemanasan:*`).
 */
export function LayarPemanasan({
  pemanasan,
  tampilan,
  kirimTampilan,
  selesai,
}: {
  pemanasan: Pemanasan;
  tampilan: KeadaanTampilan;
  kirimTampilan: (aksi: AksiTampilan) => void;
  selesai: () => void;
}): JSX.Element {
  const { soal } = pemanasan;
  const kartu = kartuPemanasan(pemanasan);
  const k = tampilan.pemanasan;
  const sorotKini = sorotPemandu(tampilan);
  const pemanduTampil = tampilan.pemandu.langkah !== null;
  const menentukan = new Set(soal.kartu_penentu);
  const ditandai = kartuDitandai(tampilan, soal, k.dikunci);
  const benar = k.dikunci ? k.kunci === soal.jawaban : null;
  const tanpaAksi = (): void => undefined;
  const keadaanOpsi = { kunci: k.kunci, dikunci: k.dikunci } as KeadaanSoal;
  return (
    <section className="layar layar-soal layar-pemanasan" aria-labelledby="judul-pemanasan">
      <p className="meta pemanasan-label" id="judul-pemanasan">
        Soal latihan — tidak dihitung
      </p>
      <figure
        className={sorotKini === 'omongan' ? 'pesan disorot' : 'pesan'}
        data-uid="pemanasan:pesan"
        data-gulir-sorot="omongan"
        aria-label={`Pesan dari ${soal.pesan.nama} · ${soal.pesan.jam}`}
      >
        <blockquote className="pesan-balon" data-lubang="omongan">
          <p className="pesan-meta">
            <span className="pesan-nama">{soal.pesan.nama}</span>
          </p>
          <p className="isi">{soal.pesan.isi}</p>
          <time className="pesan-jam">{soal.pesan.jam}</time>
        </blockquote>
      </figure>
      <p className="meta antar">{kalimatAntar(kartu.length)}</p>
      <div className={sorotKini === 'kartu' ? 'tumpukan disorot' : 'tumpukan'} data-gulir-sorot="kartu" data-lubang="kartu">
        {kartu.map((fakta) => (
          <KartuFakta
            key={fakta.fact_id}
            fakta={fakta}
            menentukan={k.dikunci && menentukan.has(fakta.fact_id)}
            ditandai={ditandai.has(fakta.fact_id)}
            sakelarSumber={tanpaAksi}
            tanpaKaki
          />
        ))}
      </div>
      <h1 className="judul tanya" id="tanya-pemanasan" data-gulir-sorot="pilihan" data-lubang="pilihan">
        {soal.tanya}
      </h1>
      <fieldset
        className={sorotKini === 'pilihan' ? 'pilihan disorot' : 'pilihan'}
        disabled={k.dikunci}
        data-lubang="pilihan"
      >
        <legend className="tersembunyi">Pilih satu jawaban</legend>
        {soal.pilihan.map((p) => {
          const tanda = tandaOpsi(keadaanOpsi, p.kunci, soal.jawaban);
          return (
            <label key={p.kunci} className={`opsi aksi opsi-${tanda.keadaan}`} data-uid={`pemanasan:opsi:${p.kunci}`}>
              <input
                type="radio"
                name={soal.soal_id}
                value={p.kunci}
                checked={k.kunci === p.kunci}
                onChange={() => {
                  kirimTampilan({ jenis: 'pilih_pemanasan', kunci: p.kunci });
                }}
              />
              <span className="opsi-huruf" aria-hidden="true">
                {p.kunci}
              </span>
              <span className="opsi-teks">
                <Teks teks={p.teks} sakelarSumber={tanpaAksi} interaktif={false} />
                {tanda.label.map((kata) => (
                  <span
                    key={kata}
                    className={kata === LABEL_COCOK ? 'opsi-tanda opsi-tanda-cocok' : 'opsi-tanda opsi-tanda-pemain'}
                  >
                    {kata}
                  </span>
                ))}
              </span>
            </label>
          );
        })}
      </fieldset>
      {!k.dikunci && (
        <div className="bantuan-soal">
          <button
            type="button"
            className={sorotKini === 'petunjuk' ? 'tombol-petunjuk disorot' : 'tombol-petunjuk'}
            data-uid="pemanasan:petunjuk-kartu"
            data-gulir-sorot="petunjuk"
            data-lubang="petunjuk"
            onClick={() => {
              kirimTampilan({ jenis: 'minta_petunjuk', soal_id: soal.soal_id });
            }}
          >
            {LABEL_TOMBOL_PETUNJUK}
          </button>
        </div>
      )}
      <div className="kunci-jawaban" role="status" aria-live="polite" data-uid="pemanasan:sesudah">
        {k.dikunci && (
          <>
            <p className={`cap${benar === true ? ' cap-cocok' : ' cap-belum'}`}>
              <span aria-hidden="true" className="cap-tanda">
                {benar === true ? '✓' : '!'}
              </span>
              {benar === true ? 'Cocok dengan kartu' : 'Belum cocok dengan kartu'}
            </p>
            <div className="teks-kunci">
              <Teks teks={soal.penjelasan} sakelarSumber={tanpaAksi} tebalSaja />
            </div>
          </>
        )}
      </div>
      {!pemanduTampil && (k.kunci !== null || k.dikunci) && (
        <div className="tindakan" data-uid={k.dikunci ? 'pemanasan:lanjut' : 'pemanasan:kunci'}>
          <button
            type="button"
            className="tombol-utama"
            onClick={() => {
              if (k.dikunci) selesai();
              else kirimTampilan({ jenis: 'kunci_pemanasan' });
            }}
          >
            {k.dikunci ? 'Lanjut ke soal 1' : LABEL_KUNCI}
          </button>
        </div>
      )}
    </section>
  );
}

/**
 * Tiga kalimat tetap.
 *
 * `diBawahBilah` (M3.9 D-2): di layar pertama kaki ini berada di bawah bilah
 * bawah yang `fixed`. Ia tetap di bawah lipatan — garisnya tidak boleh
 * mengintip di atas tombol "Mulai simulasi" — dan bantalan bawahnya setinggi
 * bilah TERUKUR, supaya kalimat terakhirnya bisa digulir ke atas bilah dan
 * terbaca. Layar akhir tidak disentuh (batas kerja M3.9).
 */
export function Kaki({ kasus, diBawahBilah = false }: { kasus: Kasus; diBawahBilah?: boolean }): JSX.Element {
  return (
    <footer
      className={diBawahBilah ? 'kaki kaki-berbilah' : 'kaki'}
      aria-label="Tiga kalimat tetap"
      data-uid="kaki-halaman"
    >
      <ul>
        {kasus.disclaimer.map((kalimat) => (
          <li key={kalimat}>{kalimat}</li>
        ))}
      </ul>
    </footer>
  );
}
