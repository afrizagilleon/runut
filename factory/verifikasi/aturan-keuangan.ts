/**
 * Aturan kelompok keuangan dan peristiwa korporasi (M2b).
 *
 * Sama seperti `aturan-v2.ts`: definisinya datang dari putusan uji lawan
 * `.context/aturan-R-uji-lawan.md`, bukan dari terjemahan skrip pembanding.
 * Tiap aturan adalah fungsi murni `(konteks) -> HasilAturan` dan melaporkan
 * hitungan INV-B.
 *
 * Kenapa berkas terpisah dari `aturan-v2.ts`: kelompok ini membaca masukan yang
 * berbeda (keuangan tahunan, laba per lembar, teks keputusan RUPS, aksi
 * korporasi) dan tidak berbagi satu pun perkakas dengan aturan laporan
 * kepemilikan. Himpunan `ATURAN_V2` di `v2.ts` tetap satu-satunya daftar
 * urutan jalan — tidak ada himpunan kedua.
 */
import type { Temuan } from '../skema/tipe.ts';
import type {
  BarisHarga,
  HasilAturan,
  KeuanganTahunan,
  KonteksGudang,
  RightIssue,
  SahamBonus,
  StockSplit,
} from './tipe.ts';
import { angka, hasil, hitung, lewat } from './dasar.ts';
import { barisHargaCacat, fraksiHarga, urutR12 } from './aturan-v2.ts';
import { DESIMAL_PERSEN, persenKonsisten } from './penyebut.ts';

// --- perkakas bersama kelompok ini -------------------------------------------

/**
 * Perbandingan sebar sebagai bilangan bulat (INV-D).
 *
 * `sebar(min, maks) > ambang` ditulis sebagai `(maks - min) * penyebut >
 * min * pembilang` dengan semua sisi bilangan bulat, sehingga tidak ada
 * merah yang lahir dari galat titik mengambang. Uji lawan §7 menunjukkan R33
 * merah pada perbandingan yang tepat 2,0% justru karena perbandingan pecahan.
 */
export function sebarMelewati(
  min: number,
  maks: number,
  ambang: { pembilang: number; penyebut: number },
): boolean {
  if (min <= 0) return false;
  const kiri = BigInt(Math.round(maks - min)) * BigInt(ambang.penyebut);
  const kanan = BigInt(Math.round(min)) * BigInt(ambang.pembilang);
  return kiri > kanan;
}

/** Sebar dalam persen, untuk ditulis di kalimat temuan. */
export function sebarPersen(min: number, maks: number): number {
  if (min <= 0) return 0;
  return Number((((maks - min) / min) * 100).toFixed(2));
}

/**
 * Kapan sebuah angka jumlah saham berlaku.
 *
 * - `tanggal` — angka itu berlaku pada satu hari tertentu. Hanya dua sumber
 *   yang begini: `outstanding_shares` satu tahun buku (berlaku 31 Desember) dan
 *   nilai pasar dibagi harga tutup satu hari bursa (berlaku hari itu).
 * - `periode` — angka itu adalah **rata-rata sepanjang satu tahun**, bukan
 *   keadaan pada satu hari. `laba ÷ laba per lembar` begini: penyebut laba per
 *   lembar adalah jumlah saham rata-rata tertimbang setahun. Angka periode
 *   tidak boleh diadu dengan angka tanggal — itulah kesalahan yang membuat
 *   ULTJ terbaca merah dua kali untuk satu cacat yang sama.
 * - `tanpa-tanggal` — sumbernya tidak menyebutkan kapan angkanya berlaku sama
 *   sekali. Potret `ownership` begini.
 */
export type WaktuBerlaku = 'tanggal' | 'periode' | 'tanpa-tanggal';

export interface SumberSaham {
  nama: string;
  lembar: number;
  jenis: WaktuBerlaku;
  /** Tanggal berlakunya, atau tahun bukunya untuk sumber `periode`. */
  kunci: string;
}

/** Tahun buku berakhir 31 Desember; itulah tanggal berlaku angka akhir tahun. */
function akhirTahun(tahun: number): string {
  return `${String(tahun)}-12-31`;
}

const SEHARI_MS = 24 * 60 * 60 * 1000;

function jarakHari(a: string, b: string): number {
  const x = Date.parse(`${a.slice(0, 10)}T00:00:00Z`);
  const y = Date.parse(`${b.slice(0, 10)}T00:00:00Z`);
  if (!Number.isFinite(x) || !Number.isFinite(y)) return Number.POSITIVE_INFINITY;
  return Math.abs(x - y) / SEHARI_MS;
}

/**
 * Jarak terjauh antara 31 Desember dan hari bursa yang boleh mewakilinya.
 *
 * Bursa tutup pada akhir tahun, jadi tidak pernah ada baris harga bertanggal
 * 31 Desember. Lima hari kalender cukup untuk mencapai hari bursa terakhir
 * tahun itu dan tidak cukup untuk menyeberang ke pekan berikutnya.
 */
export const JARAK_AKHIR_TAHUN = 5;

/**
 * Kumpulkan setiap jumlah saham yang bisa dibaca, beserta kapan ia berlaku.
 *
 * Nilai pasar dibagi harga tutup diambil hanya untuk hari bursa yang paling
 * dekat dengan tiap 31 Desember, ditambah hari potret di ringkasan — bukan
 * untuk ke-2.428 hari bursa, yang akan membuat aturan ini menghitung ribuan
 * pasangan tanpa menambah satu pun bukti baru.
 */
export function sumberSaham(konteks: KonteksGudang): SumberSaham[] {
  const daftar: SumberSaham[] = [];
  const data = konteks.data;

  if (data.ringkasan_pasar !== null) {
    const { nilai_pasar, harga_tutup, pada } = data.ringkasan_pasar;
    if (harga_tutup > 0 && nilai_pasar > 0) {
      daftar.push({
        nama: `nilai pasar dibagi harga tutup di ringkasan (${pada})`,
        lembar: Math.round(nilai_pasar / harga_tutup),
        jenis: 'tanggal',
        kunci: pada,
      });
    }
  }

  const jumlahPotret = data.pemegang.reduce((jumlah, p) => jumlah + p.lembar, 0);
  if (jumlahPotret > 0) {
    daftar.push({
      nama: 'jumlah lembar di potret pemegang saham',
      lembar: jumlahPotret,
      jenis: 'tanpa-tanggal',
      kunci: '',
    });
  }

  const hargaBaik = data.harga.filter(
    (h) => h.buka_kosong !== true && h.tutup > 0 && h.nilai_pasar > 0,
  );

  for (const t of data.saham_tahunan) {
    const akhir = akhirTahun(t.tahun);
    daftar.push({
      nama: `laporan keuangan tahun buku ${String(t.tahun)}, yang menyebut jumlah saham yang diterbitkan`,
      lembar: t.lembar,
      jenis: 'tanggal',
      kunci: akhir,
    });

    // Hari bursa yang paling dekat dengan 31 Desember tahun itu.
    let wakil: (typeof hargaBaik)[number] | undefined;
    let jarakWakil = Number.POSITIVE_INFINITY;
    for (const h of hargaBaik) {
      const jarak = jarakHari(h.tanggal, akhir);
      if (jarak > JARAK_AKHIR_TAHUN) continue;
      if (jarak < jarakWakil || (jarak === jarakWakil && (wakil?.tanggal ?? '') > h.tanggal)) {
        jarakWakil = jarak;
        wakil = h;
      }
    }
    if (wakil !== undefined) {
      daftar.push({
        nama: `nilai pasar dibagi harga tutup pada ${wakil.tanggal}, hari bursa terakhir tahun buku ${String(t.tahun)}`,
        lembar: Math.round(wakil.nilai_pasar / wakil.tutup),
        jenis: 'tanggal',
        // Sengaja dikunci ke 31 Desember, bukan ke tanggal barisnya: hari bursa
        // terakhir tahun itu adalah wakil keadaan akhir tahun.
        kunci: akhir,
      });
    }
  }

  for (const b of basisSahamPerTahun(konteks)) {
    daftar.push({
      nama: `laba dibagi laba per lembar tahun buku ${String(b.tahun)}`,
      lembar: b.lembar,
      jenis: 'periode',
      kunci: String(b.tahun),
    });
  }

  return daftar.sort((a, b) => a.kunci.localeCompare(b.kunci) || a.nama.localeCompare(b.nama));
}

export interface BasisSaham {
  tahun: number;
  lembar: number;
  laba: number;
  eps: number;
}

/**
 * Jumlah saham yang tersirat di `laba ÷ laba per lembar` tiap tahun buku.
 *
 * Inilah "basis saham" yang R20 dan R32 bicarakan. Ia bukan jumlah saham yang
 * beredar pada 31 Desember: penyebut laba per lembar adalah **jumlah saham
 * rata-rata tertimbang sepanjang tahun**. Bedanya itulah sebab gerakan 1–2%
 * pada tahun yang ada penerbitan kecil, dan sebab ambang R32 dinaikkan ke 5%.
 */
export function basisSahamPerTahun(konteks: KonteksGudang): BasisSaham[] {
  const eps = new Map(konteks.data.eps_tahunan.map((e) => [e.tahun, e.eps]));
  const keluar: BasisSaham[] = [];
  for (const k of konteks.data.keuangan_tahunan) {
    const e = eps.get(k.tahun);
    if (e === undefined || e === 0 || k.laba === null || k.laba === 0) continue;
    const lembar = Math.round(k.laba / e);
    if (lembar <= 0) continue;
    keluar.push({ tahun: k.tahun, lembar, laba: k.laba, eps: e });
  }
  return keluar.sort((a, b) => a.tahun - b.tahun);
}

// --- R20 laba per lembar berganti basis saham --------------------------------

/**
 * Ambang R20: basis saham antar tahun buku boleh bergeser paling banyak 1%.
 *
 * **Alasan ambangnya bukan pembulatan laba per lembar.** `historical_eps`
 * memberi 14–17 angka penting (ULTJ 2025 = 130,14754742736014), sehingga selang
 * dari pembulatan selebar ~1e-12 dan setiap emiten akan terbaca "basisnya
 * berubah". Alasan yang benar: penyebut laba per lembar adalah jumlah saham
 * rata-rata tertimbang setahun, yang memang bergeser sedikit pada tahun yang
 * ada penerbitan kecil. Satu persen adalah batas gerakan seperti itu.
 */
export const AMBANG_R20 = { pembilang: 1, penyebut: 100 } as const;

/**
 * R20 — laba per lembar berganti basis saham.
 *
 * Kalau `laba ÷ laba per lembar` tidak sama untuk semua tahun buku, dua angka
 * `eps` dari tahun yang berbeda tidak boleh dibandingkan: pertumbuhannya akan
 * tercampur dengan perubahan jumlah saham. ULTJ terbaca tumbuh 32% padahal
 * pada basis saham yang sama pertumbuhannya 19%.
 */
export function r20BasisLabaPerLembar(konteks: KonteksGudang): HasilAturan {
  const judul = 'Basis saham di laba per lembar';
  const satuan = 'emiten';
  const basis = basisSahamPerTahun(konteks);
  if (basis.length < 2) {
    return lewat(
      'R20',
      judul,
      'Kurang dari dua tahun buku yang punya laba sekaligus laba per lembar, jadi tidak ada dua basis yang bisa dibandingkan.',
      satuan,
    );
  }

  const lembar = basis.map((b) => b.lembar);
  const min = Math.min(...lembar);
  const maks = Math.max(...lembar);
  if (!sebarMelewati(min, maks, AMBANG_R20)) {
    return hasil('R20', judul, [], hitung(satuan, { diperiksa: 1, merah: 0 }));
  }

  const paling = basis.find((b) => b.lembar === maks);
  const sedikit = basis.find((b) => b.lembar === min);
  const temuan: Temuan = {
    temuan_id: `R20-${konteks.simbol}`,
    aturan: 'R20',
    keparahan: 'peringatan',
    ringkasan:
      `Laba per lembar ${konteks.simbol} tidak dihitung atas jumlah saham yang sama tiap tahun. ` +
      `Laba dibagi laba per lembar — yaitu jumlah saham yang dipakai sebagai penyebutnya — ` +
      `memberi ${angka(min)} lembar untuk tahun buku ${String(sedikit?.tahun ?? 0)} dan ` +
      `${angka(maks)} lembar untuk tahun buku ${String(paling?.tahun ?? 0)}, selisih ` +
      `${angka(sebarPersen(min, maks))}%. Dua angka laba per lembar dari tahun yang berbeda ` +
      `karena itu tidak bisa dibandingkan langsung: sebagian perubahannya berasal dari ` +
      `jumlah sahamnya, bukan dari labanya.`,
    angka: [
      { label: 'basis saham paling sedikit', nilai: min, satuan: 'lembar' },
      { label: 'basis saham paling banyak', nilai: maks, satuan: 'lembar' },
      { label: 'selisih', nilai: sebarPersen(min, maks), satuan: 'persen' },
    ],
    fakta_terkait: [],
    rujukan: basis.map((b) => `tahun buku ${String(b.tahun)}: ${angka(b.lembar)} lembar`),
  };
  return hasil('R20', judul, [temuan], hitung(satuan, { diperiksa: 1, merah: 1 }));
}

// --- R21 jumlah saham beda antar sumber --------------------------------------

/** Ambang R21: dua sumber pada tanggal yang sama boleh berbeda 0,5%. */
export const AMBANG_R21 = { pembilang: 5, penyebut: 1000 } as const;

/**
 * R21 — jumlah saham berbeda antar sumber.
 *
 * **Yang diperbaiki dari usulan:** usulan mengadu empat besaran yang diukur
 * pada empat waktu yang berbeda, sehingga setiap emiten yang menerbitkan atau
 * membeli kembali saham pasti merah. FOLK adalah positif palsunya: ringkasan
 * pasar (potret 2026-09-18) memberi 4.091.357.544 dan baris harian terakhir
 * (2026-01-09) memberi 3.948.141.464 — rumus yang sama, tanggal yang berbeda,
 * dan FOLK memang menerbitkan saham di antara keduanya.
 *
 * Karena itu aturan ini **hanya memeriksa pasangan sumber yang sama-sama
 * berlaku pada satu tanggal yang sama.** Pasangan yang waktunya berbeda
 * dilewati beserta alasannya dan tidak menghasilkan temuan sama sekali: cerita
 * "jumlah sahamnya berubah antara dua tanggal" sudah diceritakan R32, lengkap
 * dengan aksi korporasi yang menjelaskannya, dan menceritakannya dua kali
 * berarti dua temuan untuk satu cacat.
 *
 * Akibat yang disengaja: selisih ULTJ 11% antara `outstanding_shares` dan
 * `laba ÷ laba per lembar` **tidak** merah di sini. Yang satu keadaan pada satu
 * hari, yang satu lagi rata-rata sepanjang setahun; temuannya sudah ada di R20
 * dan R32.
 */
export function r21SahamBedaSumber(konteks: KonteksGudang): HasilAturan {
  const judul = 'Jumlah saham beda antar sumber';
  const satuan = 'pasang sumber';
  const sumber = sumberSaham(konteks);
  if (sumber.length < 2) {
    return lewat(
      'R21',
      judul,
      'Kurang dari dua sumber jumlah saham, jadi tidak ada yang bisa diadu.',
      satuan,
    );
  }

  // R32 sebagai pembatal (RQ-04): kalau perubahan jumlah saham sepanjang satu
  // tahun buku sudah terjelaskan aksi korporasi, selisih antar sumber pada akhir
  // tahun itu adalah cacat yang sama — dan satu cacat data hanya boleh
  // melahirkan satu temuan.
  const terjelaskan = new Set(tahunTerjelaskan(konteks).map((t) => akhirTahun(t)));

  const temuan: Temuan[] = [];
  let diperiksa = 0;
  let merah = 0;
  let dilewati = 0;
  const alasan: string[] = [];

  for (let i = 0; i < sumber.length; i += 1) {
    for (let j = i + 1; j < sumber.length; j += 1) {
      const a = sumber[i];
      const b = sumber[j];
      if (a === undefined || b === undefined) continue;

      if (a.jenis === 'tanggal' && a.kunci === b.kunci && terjelaskan.has(a.kunci)) {
        dilewati += 1;
        alasan.push(
          'Perubahan jumlah saham sepanjang tahun buku ini sudah dijelaskan aksi korporasi di R32, jadi selisih antar sumber di sini adalah cacat yang sama.',
        );
        continue;
      }

      if (a.jenis === 'tanpa-tanggal' || b.jenis === 'tanpa-tanggal') {
        dilewati += 1;
        alasan.push(
          'Potret pemegang saham tidak menyebutkan kapan angkanya berlaku, jadi ia tidak bisa diadu dengan sumber mana pun.',
        );
        continue;
      }
      if (a.jenis === 'periode' || b.jenis === 'periode') {
        dilewati += 1;
        alasan.push(
          'Laba dibagi laba per lembar adalah rata-rata sepanjang satu tahun buku, bukan keadaan pada satu hari, jadi ia tidak bisa diadu dengan angka bertanggal.',
        );
        continue;
      }
      if (a.kunci !== b.kunci) {
        dilewati += 1;
        alasan.push(
          'Kedua angka berlaku pada tanggal yang berbeda; perubahan jumlah saham antar tanggal diperiksa R32, bukan di sini.',
        );
        continue;
      }

      diperiksa += 1;
      const min = Math.min(a.lembar, b.lembar);
      const maks = Math.max(a.lembar, b.lembar);
      if (!sebarMelewati(min, maks, AMBANG_R21)) continue;

      merah += 1;
      temuan.push({
        temuan_id: `R21-${konteks.simbol}-${a.kunci}-${String(i)}-${String(j)}`,
        aturan: 'R21',
        keparahan: 'peringatan',
        ringkasan:
          `Dua sumber menyebut jumlah saham ${konteks.simbol} yang berbeda untuk tanggal yang sama, ` +
          `${a.kunci}: ${angka(a.lembar)} lembar menurut ${a.nama}; ${angka(b.lembar)} lembar menurut ` +
          `${b.nama}. Selisihnya ${angka(sebarPersen(min, maks))}%. Karena keduanya berbicara tentang ` +
          `hari yang sama, setidaknya satu di antaranya tidak bisa benar; mana yang benar tidak ` +
          `terbaca dari data ini.`,
        angka: [
          { label: a.nama, nilai: a.lembar, satuan: 'lembar' },
          { label: b.nama, nilai: b.lembar, satuan: 'lembar' },
          { label: 'selisih', nilai: sebarPersen(min, maks), satuan: 'persen' },
        ],
        fakta_terkait: [],
        rujukan: [`berlaku ${a.kunci}`],
      });
    }
  }

  return hasil(
    'R21',
    judul,
    temuan,
    hitung(satuan, { diperiksa, merah, dilewati, alasan_dilewati: alasan }),
  );
}

// --- R32 perubahan jumlah saham vs rasio aksi korporasi ----------------------

/** Ambang R32: basis saham boleh bergeser 5% tanpa aksi korporasi yang menjelaskannya. */
export const AMBANG_R32 = { pembilang: 5, penyebut: 100 } as const;

/** Sebuah rasio dianggap menjelaskan perubahan kalau melesetnya tidak lebih dari 10%. */
export const TOLERANSI_RASIO_R32 = { pembilang: 10, penyebut: 100 } as const;

export interface AksiBerasio {
  tanggal: string;
  apa: string;
  /** Berapa kali lipat jumlah saham menjadi sesudah aksi ini. */
  lipat: number;
}

/**
 * Aksi korporasi yang rasionya bisa dibaca sebagai perkalian jumlah saham.
 *
 * - Pemecahan saham rasio `r`: satu lembar menjadi `r` lembar, jadi `lipat = r`.
 * - Penerbitan saham baru `old : new` (setiap `old` lembar lama berhak atas
 *   `new` lembar baru): `lipat = (old + new) / old`. COCO 1 : 3 memberi 4,00×,
 *   dan itulah yang menjelaskan 889.863.981 menjadi 3.559.455.924.
 * - Saham bonus `old : new` dibaca dengan rumus yang sama.
 */
export function aksiBerasio(
  split: StockSplit[],
  right: RightIssue[],
  bonus: SahamBonus[],
): AksiBerasio[] {
  const keluar: AksiBerasio[] = [];
  for (const s of split) {
    if (s.rasio > 0) {
      keluar.push({ tanggal: s.tanggal, apa: `pemecahan saham 1 lembar menjadi ${String(s.rasio)}`, lipat: s.rasio });
    }
  }
  for (const r of right) {
    const lama = r.rasio_lama;
    const baru = r.rasio_baru;
    if (lama === null || baru === null || lama <= 0 || baru <= 0) continue;
    keluar.push({
      tanggal: r.ex_date,
      apa: `penerbitan saham baru ${String(lama)} berbanding ${String(baru)}`,
      lipat: (lama + baru) / lama,
    });
  }
  for (const b of bonus) {
    const lama = b.rasio_lama ?? null;
    const baru = b.rasio_baru ?? null;
    if (lama === null || baru === null || lama <= 0 || baru <= 0) continue;
    keluar.push({
      tanggal: b.ex_date,
      apa: `saham bonus ${String(lama)} berbanding ${String(baru)}`,
      lipat: (lama + baru) / lama,
    });
  }
  return keluar.sort((a, b) => a.tanggal.localeCompare(b.tanggal) || a.apa.localeCompare(b.apa));
}

/** Apakah `lipat` menjelaskan perubahan `dari` menjadi `ke`, dalam toleransi 10%? */
export function rasioMenjelaskan(dari: number, ke: number, lipat: number): boolean {
  if (dari <= 0 || lipat <= 0) return false;
  const diharapkan = dari * lipat;
  const min = Math.min(diharapkan, ke);
  const maks = Math.max(diharapkan, ke);
  return !sebarMelewati(min, maks, TOLERANSI_RASIO_R32);
}

/**
 * R32 — perubahan jumlah saham harus dijelaskan rasio aksi korporasi.
 *
 * Diperiksa per **pergantian tahun buku**: kalau basis saham berubah lebih dari
 * 5% dari satu tahun ke tahun berikutnya, harus ada aksi korporasi di tahun itu
 * yang rasionya menjelaskan perubahannya. Kalau ada, perubahannya terjelaskan —
 * dan itulah yang membatalkan merah R21 untuk emiten yang bersangkutan (T-08).
 * Kalau tidak ada, perubahannya ditandai dan **penyebabnya tidak diketahui**.
 */
export function r32PerubahanSahamVsAksi(konteks: KonteksGudang): HasilAturan {
  const judul = 'Perubahan jumlah saham dijelaskan aksi korporasi';
  const satuan = 'pergantian tahun buku';
  const basis = basisSahamPerTahun(konteks);
  if (basis.length < 2) {
    return lewat(
      'R32',
      judul,
      'Kurang dari dua tahun buku yang basis sahamnya bisa dihitung, jadi tidak ada pergantian tahun untuk diperiksa.',
      satuan,
    );
  }

  const aksi = aksiBerasio(
    konteks.data.stock_split,
    konteks.data.right_issue,
    konteks.data.bonus,
  );
  const temuan: Temuan[] = [];
  let diperiksa = 0;
  let merah = 0;

  for (let i = 1; i < basis.length; i += 1) {
    const kemarin = basis[i - 1];
    const sekarang = basis[i];
    if (kemarin === undefined || sekarang === undefined) continue;
    diperiksa += 1;
    const min = Math.min(kemarin.lembar, sekarang.lembar);
    const maks = Math.max(kemarin.lembar, sekarang.lembar);
    if (!sebarMelewati(min, maks, AMBANG_R32)) continue;

    // Aksi "di tahun itu" = aksi yang tanggalnya jatuh di tahun buku sesudahnya.
    const tahun = String(sekarang.tahun);
    const diTahunItu = aksi.filter((a) => a.tanggal.slice(0, 4) === tahun);
    const menjelaskan = diTahunItu.filter((a) =>
      rasioMenjelaskan(kemarin.lembar, sekarang.lembar, a.lipat),
    );
    const lipatTerukur = Number((sekarang.lembar / kemarin.lembar).toFixed(3));

    if (menjelaskan.length > 0) {
      temuan.push({
        temuan_id: `R32-${konteks.simbol}-${tahun}-terjelaskan`,
        aturan: 'R32',
        keparahan: 'catatan',
        ringkasan:
          `Jumlah saham ${konteks.simbol} menjadi ${angka(lipatTerukur)} kali lipat antara tahun buku ` +
          `${String(kemarin.tahun)} dan ${tahun} — dari ${angka(kemarin.lembar)} lembar menjadi ` +
          `${angka(sekarang.lembar)} lembar — dan ${menjelaskan.map((a) => `${a.apa} pada ${a.tanggal}`).join(' serta ')} ` +
          `menjelaskan perubahan sebesar itu. Angka apa pun per lembar dari kedua tahun itu tetap ` +
          `tidak boleh dibandingkan langsung, karena pembaginya berubah.`,
        angka: [
          { label: `lembar tahun buku ${String(kemarin.tahun)}`, nilai: kemarin.lembar, satuan: 'lembar' },
          { label: `lembar tahun buku ${tahun}`, nilai: sekarang.lembar, satuan: 'lembar' },
          { label: 'kali lipat', nilai: lipatTerukur, satuan: 'kali' },
        ],
        fakta_terkait: [],
        rujukan: menjelaskan.map((a) => `${a.apa} ${a.tanggal}`),
      });
      continue;
    }

    merah += 1;
    const daftarAksi =
      diTahunItu.length === 0
        ? 'Tidak ada aksi korporasi tercatat sepanjang tahun buku itu.'
        : `Aksi korporasi yang tercatat tahun itu — ${diTahunItu.map((a) => `${a.apa} pada ${a.tanggal}`).join(', ')} — rasionya tidak sebesar itu.`;
    temuan.push({
      temuan_id: `R32-${konteks.simbol}-${tahun}`,
      aturan: 'R32',
      keparahan: 'peringatan',
      ringkasan:
        `Jumlah saham ${konteks.simbol} menjadi ${angka(lipatTerukur)} kali lipat antara tahun buku ` +
        `${String(kemarin.tahun)} dan ${tahun} — dari ${angka(kemarin.lembar)} lembar menjadi ` +
        `${angka(sekarang.lembar)} lembar. ${daftarAksi} Penyebabnya tidak diketahui.`,
      angka: [
        { label: `lembar tahun buku ${String(kemarin.tahun)}`, nilai: kemarin.lembar, satuan: 'lembar' },
        { label: `lembar tahun buku ${tahun}`, nilai: sekarang.lembar, satuan: 'lembar' },
        { label: 'kali lipat', nilai: lipatTerukur, satuan: 'kali' },
      ],
      fakta_terkait: [],
      rujukan: diTahunItu.map((a) => `${a.apa} ${a.tanggal}`),
    });
  }

  return hasil('R32', judul, temuan, hitung(satuan, { diperiksa, merah }));
}

/**
 * Tahun buku yang perubahan jumlah sahamnya **terjelaskan** aksi korporasi.
 * Dipakai T-08 untuk membatalkan merah R21 (satu cacat data, satu temuan).
 */
export function tahunTerjelaskan(konteks: KonteksGudang): number[] {
  const hasilR32 = r32PerubahanSahamVsAksi(konteks);
  return hasilR32.temuan
    .filter((t) => t.temuan_id.endsWith('-terjelaskan'))
    .map((t) => Number.parseInt(t.temuan_id.split('-')[2] ?? '0', 10))
    .filter((n) => Number.isFinite(n) && n > 0)
    .sort((a, b) => a - b);
}

// --- pengurai angka rupiah di teks keputusan RUPS ----------------------------

/**
 * Satu angka rupiah yang terbaca di teks keputusan RUPS, beserta letaknya.
 *
 * `milli` adalah nilainya dikali seribu dan dibulatkan ke bilangan bulat.
 * Semua pembandingan dividen dilakukan di satuan itu, bukan dalam pecahan:
 * `2,14 + 3,20` dalam pecahan memberi 5,340000000000001 dan dikali 25 memberi
 * 133,50000000000003, yang tidak akan pernah sama dengan Rp133,50 yang tertulis
 * di teks (INV-D).
 */
export interface AngkaRupiah {
  /** Nilai dikali 1.000, dibulatkan. */
  milli: number;
  /** Teks aslinya, apa adanya, untuk ditulis di temuan. */
  teks: string;
  /** Indeks awal `Rp` di dalam teks keputusan. */
  mulai: number;
  /** Indeks tepat sesudah angkanya. */
  selesai: number;
}

/**
 * Pola angka rupiah.
 *
 * Koma adalah pemisah ribuan **gaya Inggris** (`Rp400,475,916,944`), bukan
 * koma desimal gaya Indonesia. Uji lawan §R23 menunjuk tepat ke sini: usulan
 * menuliskan angka yang sama dengan titik ribuan gaya Indonesia, yaitu
 * transkripsi manusia, bukan isi berkas. Titik adalah pemisah desimal
 * (`Rp133.50`, `Rp40,983,839,406.00`).
 */
const POLA_RUPIAH = /Rp\s?(\d[\d,]*(?:\.\d{1,3})?)/gi;

export function bacaAngkaRupiah(teks: string): AngkaRupiah[] {
  const keluar: AngkaRupiah[] = [];
  POLA_RUPIAH.lastIndex = 0;
  let cocok: RegExpExecArray | null = POLA_RUPIAH.exec(teks);
  while (cocok !== null) {
    const mentah = cocok[1] ?? '';
    const bersih = mentah.replace(/,/g, '');
    const nilai = Number(bersih);
    if (Number.isFinite(nilai)) {
      keluar.push({
        milli: Math.round(nilai * 1000),
        teks: cocok[0],
        mulai: cocok.index,
        selesai: cocok.index + cocok[0].length,
      });
    }
    cocok = POLA_RUPIAH.exec(teks);
  }
  return keluar;
}

// --- R23 laba beda antar endpoint --------------------------------------------

/** Jangkar R23: angka laba harus menempel pada frasa ini, bukan sekadar sekalimat. */
const JANGKAR_LABA = /net profit of\s+$/i;

/**
 * Laba sesudah pajak = laba sebelum pajak − pajak, dari baris yang sama (M4b D-4).
 *
 * Ukuran laba kedua untuk R23. `earnings` adalah laba yang diatribusikan ke
 * pemilik entitas induk; keputusan RUPS kadang menyebut laba tahun berjalan
 * seluruh kelompok usaha, yang sama dengan laba sebelum pajak dikurangi beban
 * pajak (ASLC 2025: 55.457.688.905 − 10.457.677.260 = 45.000.011.645, tepat
 * angka RUPS-nya). Pajak negatif adalah manfaat pajak dan menambah laba.
 * `null` bila salah satu medannya kosong.
 */
export function labaSesudahPajak(k: KeuanganTahunan): number | null {
  const sebelum = k.laba_sebelum_pajak;
  const pajak = k.pajak;
  if (typeof sebelum !== 'number' || typeof pajak !== 'number') return null;
  return sebelum - pajak;
}

/**
 * R23 — laba di keputusan RUPS berbeda dari laba di laporan keuangan.
 *
 * Tahun bukunya adalah tahun RUPS dikurangi satu: RUPS tahunan mengesahkan
 * laporan keuangan tahun sebelumnya. Kalau kedua angka berbeda, temuannya
 * menyebut **keduanya** dan tidak memutuskan mana yang benar: `agm_result`
 * bisa menyebut laba induk saja sementara laporan keuangan menyebut laba
 * konsolidasi, dan keduanya sah.
 */
export function r23LabaBedaEndpoint(konteks: KonteksGudang): HasilAturan {
  const judul = 'Laba di keputusan RUPS versus laporan keuangan';
  const satuan = 'keputusan RUPS';
  const rups = konteks.data.rups;
  if (rups.length === 0) {
    return lewat('R23', judul, 'Emiten ini tidak punya satu pun RUPS tercatat.', satuan);
  }

  const laba = new Map(
    konteks.data.keuangan_tahunan
      .filter((k) => k.laba !== null)
      .map((k) => [k.tahun, k.laba as number]),
  );
  // M4b D-4: ukuran laba kedua, laba sebelum pajak − pajak dari baris yang sama.
  const sesudahPajak = new Map(
    konteks.data.keuangan_tahunan.flatMap((k) => {
      const nilai = labaSesudahPajak(k);
      return nilai === null ? [] : [[k.tahun, nilai] as const];
    }),
  );
  const temuan: Temuan[] = [];
  let diperiksa = 0;
  let merah = 0;
  let tidakLengkap = 0;
  let dilewati = 0;
  const alasan: string[] = [];

  for (const r of rups) {
    if (r.ringkasan === null) {
      dilewati += 1;
      alasan.push('Teks keputusan RUPS ini kosong di data, jadi tidak ada angka laba untuk dibaca.');
      continue;
    }
    const berjangkar = bacaAngkaRupiah(r.ringkasan).filter((a) =>
      JANGKAR_LABA.test(r.ringkasan?.slice(Math.max(0, a.mulai - 20), a.mulai) ?? ''),
    );
    if (berjangkar.length === 0) {
      dilewati += 1;
      alasan.push('Teks keputusan RUPS ini tidak memuat pola "net profit of Rp…".');
      continue;
    }

    const tahunBuku = Number.parseInt(r.tanggal.slice(0, 4), 10) - 1;
    const menurutKeuangan = laba.get(tahunBuku);

    for (const a of berjangkar) {
      diperiksa += 1;
      if (menurutKeuangan === undefined) {
        tidakLengkap += 1;
        alasan.push(
          `Laporan keuangan tahun buku ${String(tahunBuku)} tidak ada di data, jadi angka laba di RUPS tidak bisa diadu dengan apa pun.`,
        );
        continue;
      }
      const dariRups = Math.round(a.milli / 1000);
      if (dariRups === Math.round(menurutKeuangan)) continue;
      const kedua = sesudahPajak.get(tahunBuku);
      if (kedua !== undefined && dariRups === Math.round(kedua)) continue;

      merah += 1;
      const selisih = Math.abs(dariRups - Math.round(menurutKeuangan));
      const kalimatKedua =
        kedua === undefined
          ? ''
          : `Laba sebelum pajak dikurangi pajak di laporan yang sama, Rp${angka(Math.round(kedua))}, ` +
            'juga tidak sama dengan angka RUPS. ';
      temuan.push({
        temuan_id: `R23-${konteks.simbol}-${r.tanggal}`,
        aturan: 'R23',
        ringkasan:
          `Laba bersih tahun buku ${String(tahunBuku)} ditulis dua kali dengan angka yang berbeda. ` +
          `Keputusan RUPS ${konteks.simbol} pada ${r.tanggal} menyebut Rp${angka(dariRups)}; ` +
          `laporan keuangan menyebut Rp${angka(Math.round(menurutKeuangan))}. Selisihnya ` +
          `Rp${angka(selisih)}. ${kalimatKedua}Mana yang benar tidak terbaca dari data ini — keputusan RUPS bisa ` +
          `menyebut laba induk saja sementara laporan keuangan menyebut laba seluruh kelompok ` +
          `usaha, dan keduanya sah. Angka laba yang dipakai di kartu harus menyebut dari mana ia ` +
          `diambil.`,
        angka: [
          { label: 'laba menurut keputusan RUPS', nilai: dariRups, satuan: 'rupiah' },
          { label: 'laba menurut laporan keuangan', nilai: Math.round(menurutKeuangan), satuan: 'rupiah' },
          { label: 'selisih', nilai: selisih, satuan: 'rupiah' },
          ...(kedua === undefined
            ? []
            : [{ label: 'laba sebelum pajak dikurangi pajak', nilai: Math.round(kedua), satuan: 'rupiah' }]),
        ],
        fakta_terkait: [],
        rujukan: [`RUPS ${r.tanggal}`, `tahun buku ${String(tahunBuku)}`],
      });
    }
  }

  return hasil(
    'R23',
    judul,
    temuan,
    hitung(satuan, { diperiksa, merah, tidak_lengkap: tidakLengkap, dilewati, alasan_dilewati: alasan }),
  );
}

// --- R31 dividen di keputusan RUPS versus medan dividend ---------------------

/**
 * Penjaga: angka yang didahului "nominal value" atau "par value" adalah **nilai
 * nominal saham**, bukan dividen.
 *
 * MLPT RUPS 2026-06-29: "changing the nominal value from Rp100 to Rp4 per
 * share". Tanpa penjaga ini, Rp4 terbaca sebagai dividen per lembar dan RUPS
 * pemecahan saham terbaca sebagai RUPS dividen.
 */
const PENJAGA_NOMINAL = /(nominal|par)\s+value/i;

/** Berapa karakter sebelum angka yang ikut dibaca penjaga nominal. */
const JANGKAUAN_PENJAGA = 60;

/** Angka dividen harus **menempel** pada "per share", bukan sekadar sekalimat. */
const JANGKAR_PER_LEMBAR = /^\s*per\s+share/i;

/**
 * Lebar jendela dividen yang boleh dipasangkan dengan satu RUPS, dalam hari
 * kalender sebelum dan sesudah tanggal RUPS.
 *
 * Tahun buku sebuah entri `dividend` **tidak ada di data**: tidak ada satu
 * medan pun yang menyebutkannya, dan aturan "tahun ex_date dikurangi satu"
 * tidak berlaku untuk emiten yang membagi dividen interim. MLPT membuktikannya:
 * interim ex 2025-11-07 dan final ex 2026-05-11 sama-sama untuk tahun buku
 * 2025. Karena itu pemasangan dilakukan lewat jendela waktu yang ditulis di
 * sini, bukan lewat tahun buku yang ditebak.
 */
export const JENDELA_RUPS_HARI = { sebelum: 550, sesudah: 200 } as const;

export interface CocokDividen {
  /** Bagaimana angkanya cocok. */
  cara: 'satu' | 'jumlah-dua';
  /** Rasio pemecahan saham yang harus dikalikan supaya cocok; 1 berarti tidak perlu. */
  lipat: number;
  /** `ex_date` dividen yang dipakai. */
  ex: string[];
  /** Jumlah `dividend_amount` yang dipakai, dalam satuan seperseribu rupiah. */
  milli: number;
}

/**
 * Cari cara paling sederhana supaya `targetMilli` cocok dengan medan `dividend`.
 *
 * Urutan pencarian ditetapkan supaya hasilnya sama di tiap mesin (INV-C): tanpa
 * pengali dulu, lalu dengan rasio pemecahan saham dari yang terkecil; di dalam
 * tiap pengali, satu dividen dulu menurut `ex_date` menaik, baru jumlah dua
 * dividen. Tidak ada seri yang tersisa.
 */
export function cariCocokDividen(
  targetMilli: number,
  dividen: Array<{ ex_date: string; nilai_per_lembar: number }>,
  rasioSplit: number[],
  desimal: number = 3,
): CocokDividen | null {
  const urut = [...dividen].sort((a, b) => a.ex_date.localeCompare(b.ex_date));
  const milli = urut.map((d) => Math.round(d.nilai_per_lembar * 1000));
  const pengali = [1, ...[...new Set(rasioSplit)].filter((r) => r > 1).sort((a, b) => a - b)];
  // M4a D-5 (U27): angka RUPS yang ditulis dengan 1-2 desimal adalah angka yang
  // sudah dibulatkan ke desimal itu (BNII "Rp7.61" untuk 7,61106), jadi
  // medan dividen dibandingkan setelah dibulatkan ke desimal yang sama. Angka
  // bulat tetap harus sama persis: "Rp28" tidak berarti "sekitar 28".
  const skala = desimal >= 1 && desimal < 3 ? 10 ** (3 - desimal) : 1;
  const sama = (m: number) => Math.round(m / skala) === Math.round(targetMilli / skala);

  for (const lipat of pengali) {
    for (const [i, m] of milli.entries()) {
      const ex = urut[i]?.ex_date;
      if (ex === undefined || m === undefined) continue;
      if (sama(m * lipat)) return { cara: 'satu', lipat, ex: [ex], milli: m };
    }
    for (let i = 0; i < milli.length; i += 1) {
      for (let j = i + 1; j < milli.length; j += 1) {
        const a = milli[i];
        const b = milli[j];
        const exA = urut[i]?.ex_date;
        const exB = urut[j]?.ex_date;
        if (a === undefined || b === undefined || exA === undefined || exB === undefined) continue;
        if (sama((a + b) * lipat)) {
          return { cara: 'jumlah-dua', lipat, ex: [exA, exB], milli: a + b };
        }
      }
    }
  }
  return null;
}

/**
 * Tulis nilai seperseribu rupiah sebagai rupiah.
 *
 * Uang ditulis dengan **dua angka desimal kalau ada pecahannya**, bukan dengan
 * nol berekor dibuang: Rp133,50 adalah uang, Rp133,5 adalah angka. Pecahan yang
 * lebih halus dari sen tetap ditulis utuh (dividen RAJA Rp1,046).
 */
export function rupiahMilli(milli: number): string {
  const bulat = Math.trunc(milli / 1000);
  const sisa = Math.abs(milli % 1000);
  if (sisa === 0) return angka(bulat);
  const desimal = String(sisa).padStart(3, '0').replace(/0+$/, '');
  return angka(bulat) + ',' + (desimal.length === 1 ? desimal + '0' : desimal);
}

/** Banyak angka desimal yang tertulis pada angka rupiah di teks (`Rp7.61` → 2, `Rp28` → 0). */
export function desimalTertulis(a: AngkaRupiah): number {
  return /\.(\d{1,3})$/.exec(a.teks)?.[1]?.length ?? 0;
}

/** Angka rupiah di teks RUPS yang menempel pada "per share" dan bukan nilai nominal. */
export function angkaPerLembar(ringkasan: string): AngkaRupiah[] {
  return bacaAngkaRupiah(ringkasan).filter((a) => {
    if (!JANGKAR_PER_LEMBAR.test(ringkasan.slice(a.selesai, a.selesai + 20))) return false;
    const sebelum = ringkasan.slice(Math.max(0, a.mulai - JANGKAUAN_PENJAGA), a.mulai);
    return !PENJAGA_NOMINAL.test(sebelum);
  });
}

function dividenDekat(
  konteks: KonteksGudang,
  tanggalRups: string,
): Array<{ ex_date: string; nilai_per_lembar: number }> {
  return konteks.data.dividen.filter((d) => {
    const selisih =
      (Date.parse(d.ex_date.slice(0, 10) + 'T00:00:00Z') -
        Date.parse(tanggalRups.slice(0, 10) + 'T00:00:00Z')) /
      SEHARI_MS;
    if (!Number.isFinite(selisih)) return false;
    return selisih >= -JENDELA_RUPS_HARI.sebelum && selisih <= JENDELA_RUPS_HARI.sesudah;
  });
}

/**
 * Hasil R31 yang dipakai aturan lain: apakah medan `dividend_amount` emiten ini
 * sudah dibagi rasio pemecahan saham sementara deret harganya tidak.
 *
 * R26 dan R29 membaca ini. Tanpa itu, R29 membandingkan dividen MLPT yang sudah
 * dibagi 25 dengan harga yang belum, dan kolom "turun dibagi dividen" meleset
 * 25 kali lipat.
 */
export interface PenyesuaianSplit {
  disesuaikan: boolean;
  /** Rasio yang terbukti dipakai; 1 kalau tidak terbukti. */
  lipat: number;
  /** Tanggal RUPS yang membuktikannya; `null` kalau tidak terbukti. */
  bukti: string | null;
}

export function penyesuaianSplitDividen(konteks: KonteksGudang): PenyesuaianSplit {
  const rasio = konteks.data.stock_split.map((s) => s.rasio);
  for (const r of konteks.data.rups) {
    if (r.ringkasan === null) continue;
    for (const a of angkaPerLembar(r.ringkasan)) {
      const cocok = cariCocokDividen(a.milli, dividenDekat(konteks, r.tanggal), rasio, desimalTertulis(a));
      if (cocok !== null && cocok.lipat > 1) {
        return { disesuaikan: true, lipat: cocok.lipat, bukti: r.tanggal };
      }
    }
  }
  return { disesuaikan: false, lipat: 1, bukti: null };
}

/**
 * R31 — dividen yang diumumkan RUPS harus ada di medan `dividend`.
 *
 * Tiga putusan:
 * - cocok tanpa pengali → hijau;
 * - cocok **hanya** sesudah dikali rasio pemecahan saham → peringatan, dan
 *   itulah tanda bahwa `dividend_amount` sudah dibagi rasio itu sementara deret
 *   harganya tidak (MLPT: Rp133,50 = 25 x (2,14 + 3,20), padahal kedua
 *   `ex_date`-nya sebelum tanggal pemecahan saham);
 * - tidak cocok sama sekali → KONFLIK yang menyebut kedua angka.
 */
export function r31DividenRupsVersusMedan(konteks: KonteksGudang): HasilAturan {
  const judul = 'Dividen di keputusan RUPS versus medan dividend';
  const satuan = 'angka dividen di keputusan RUPS';
  const rups = konteks.data.rups;
  if (rups.length === 0) {
    return lewat('R31', judul, 'Emiten ini tidak punya satu pun RUPS tercatat.', satuan);
  }

  const rasio = konteks.data.stock_split.map((s) => s.rasio);
  const temuan: Temuan[] = [];
  let diperiksa = 0;
  let merah = 0;
  let tidakLengkap = 0;
  let dilewati = 0;
  const alasan: string[] = [];

  for (const r of rups) {
    if (r.ringkasan === null) {
      dilewati += 1;
      alasan.push('Teks keputusan RUPS ini kosong di data, jadi tidak ada angka dividen untuk dibaca.');
      continue;
    }
    const angkaRups = angkaPerLembar(r.ringkasan);
    if (angkaRups.length === 0) {
      dilewati += 1;
      alasan.push('Teks keputusan RUPS ini tidak menyebut satu pun jumlah rupiah per lembar.');
      continue;
    }
    const dekat = dividenDekat(konteks, r.tanggal);

    for (const a of angkaRups) {
      diperiksa += 1;
      if (dekat.length === 0) {
        tidakLengkap += 1;
        alasan.push('Tidak ada satu pun entri dividen bertanggal dekat RUPS ini untuk diadu.');
        continue;
      }
      const cocok = cariCocokDividen(a.milli, dekat, rasio, desimalTertulis(a));
      if (cocok !== null && cocok.lipat === 1) continue;

      merah += 1;
      if (cocok !== null) {
        const bagian = cocok.ex
          .map((ex) => {
            const d = dekat.find((x) => x.ex_date === ex);
            return (
              'Rp' +
              rupiahMilli(Math.round((d?.nilai_per_lembar ?? 0) * 1000)) +
              ' dengan tanggal ex ' +
              ex
            );
          })
          .join(' ditambah ');
        temuan.push({
          temuan_id: 'R31-' + konteks.simbol + '-' + r.tanggal + '-' + String(a.mulai),
          aturan: 'R31',
          keparahan: 'peringatan',
          ringkasan:
            'Keputusan RUPS ' + konteks.simbol + ' pada ' + r.tanggal + ' menyebut dividen Rp' +
            rupiahMilli(a.milli) + ' per lembar, tetapi medan dividen memberi ' + bagian + ' — ' +
            String(cocok.lipat) + ' kali lebih kecil. Angkanya baru cocok sesudah dikali ' +
            String(cocok.lipat) + ', yaitu rasio pemecahan saham yang tercatat untuk emiten ini. ' +
            'Artinya medan dividen sudah dibagi rasio pemecahan saham sementara deret harganya ' +
            'belum, jadi dividen dan harga di data ini tidak memakai satuan yang sama. Kartu ' +
            'dividen yang melintasi tanggal pemecahan saham tidak boleh memakai medan itu apa adanya.',
          angka: [
            { label: 'dividen menurut keputusan RUPS', nilai: a.milli / 1000, satuan: 'rupiah per lembar' },
            { label: 'dividen menurut medan dividend', nilai: cocok.milli / 1000, satuan: 'rupiah per lembar' },
            { label: 'rasio pemecahan saham', nilai: cocok.lipat, satuan: 'kali' },
          ],
          fakta_terkait: [],
          rujukan: ['RUPS ' + r.tanggal, ...cocok.ex.map((ex) => 'dividen ex ' + ex)],
        });
        continue;
      }

      const tersedia = dekat
        .map((d) => 'Rp' + rupiahMilli(Math.round(d.nilai_per_lembar * 1000)) + ' (ex ' + d.ex_date + ')')
        .join(', ');
      temuan.push({
        temuan_id: 'R31-' + konteks.simbol + '-' + r.tanggal + '-' + String(a.mulai),
        aturan: 'R31',
        ringkasan:
          'Keputusan RUPS ' + konteks.simbol + ' pada ' + r.tanggal + ' menyebut dividen Rp' +
          rupiahMilli(a.milli) + ' per lembar, dan angka itu tidak ada di medan dividen. Yang ada ' +
          'di sana untuk rentang waktu yang sama: ' + tersedia + '. Tidak ada satu pun yang sama ' +
          'dengannya, tidak ada dua yang jumlahnya sama dengannya, dan tidak ada pula yang cocok ' +
          'sesudah dikali rasio pemecahan saham yang tercatat. Mana yang benar tidak terbaca dari ' +
          'data ini.',
        angka: [
          { label: 'dividen menurut keputusan RUPS', nilai: a.milli / 1000, satuan: 'rupiah per lembar' },
        ],
        fakta_terkait: [],
        rujukan: ['RUPS ' + r.tanggal, ...dekat.map((d) => 'dividen ex ' + d.ex_date)],
      });
    }
  }

  return hasil(
    'R31',
    judul,
    temuan,
    hitung(satuan, { diperiksa, merah, tidak_lengkap: tidakLengkap, dilewati, alasan_dilewati: alasan }),
  );
}

// --- R26 pembagian laba tak masuk akal ---------------------------------------

/**
 * Selang pembagian laba yang masuk akal, dalam persen laba tahun buku itu.
 *
 * Nol sampai dua ratus persen. Di atas seratus persen sudah tidak biasa tetapi
 * sah — perusahaan boleh membagi laba ditahan tahun-tahun sebelumnya — jadi
 * batasnya sengaja longgar. Di bawah nol berarti tahun bukunya rugi, dan
 * membagi dividen sesudah tahun rugi juga sah. Aturan ini karena itu menguji
 * **asumsi pemetaan tahun buku kita**, bukan data emitennya.
 */
export const SELANG_R26 = { bawah: 0, atas: 200 } as const;

/**
 * Kalimat yang berarti "tidak ada dividen dibagikan untuk tahun buku itu".
 *
 * Penjaga ini wajib, dan R24 dibuang justru karena tidak punya: aturan yang
 * hanya mencari kata "dividend" di teks keputusan RUPS membaca "the meeting
 * decided **not to** distribute dividends" sebagai pengumuman dividen.
 */
const KALIMAT_TANPA_DIVIDEN = [
  /not\s+to\s+distribute\s+(any\s+)?dividend/i,
  /no\s+dividend\s+distribution/i,
  /no\s+cash\s+dividend/i,
  /without\s+distributing\s+dividend/i,
  /tidak\s+membagi(kan)?\s+dividen/i,
];

export function menyatakanTanpaDividen(ringkasan: string): boolean {
  return KALIMAT_TANPA_DIVIDEN.some((pola) => pola.test(ringkasan));
}

/**
 * Tahun buku sebuah entri dividen: tahun `ex_date` dikurangi satu.
 *
 * **Batas yang harus diketahui pembaca:** aturan ini salah untuk dividen
 * interim yang tanggal ex-nya jatuh di dalam tahun bukunya sendiri. MLPT
 * membuktikannya — interim ex 2025-11-07 dan final ex 2026-05-11 sama-sama
 * untuk tahun buku 2025, tetapi aturan ini menaruh yang pertama di 2024.
 * Tidak ada medan di data yang menyebutkan tahun buku sebuah dividen, jadi
 * aturan ini adalah pemetaan yang **diasumsikan**, dan itulah yang sebenarnya
 * diuji R26.
 */
export function tahunBukuDividen(exDate: string): number {
  return Number.parseInt(exDate.slice(0, 4), 10) - 1;
}

/**
 * R26 — pembagian laba yang tak masuk akal terhadap laba tahun buku itu.
 *
 * Dijumlahkan **per tahun buku** lebih dulu. Tanpa itu, dua dividen setahun
 * lolos hijau satu-satu walau jumlahnya di luar selang: RAJA tahun buku 2025
 * membagi Rp5 (23,2%) dan Rp40 (185,4%), dan jumlahnya 208,6%.
 *
 * Penyebutnya adalah jumlah saham **pada tahun buku itu** (`laba ÷ laba per
 * lembar`), bukan jumlah saham hari ini. Dengan jumlah saham hari ini, seluruh
 * pembagian laba ULTJ sebelum 2025 dihitung dengan basis yang meleset 11%.
 *
 * Kalau R31 membuktikan medan dividen sudah dibagi rasio pemecahan saham,
 * angkanya dikalikan kembali lebih dulu — kalau tidak, pembagian laba MLPT
 * terhitung 25 kali terlalu kecil.
 */
export function r26PembagianLaba(konteks: KonteksGudang): HasilAturan {
  const judul = 'Pembagian laba terhadap laba tahun buku';
  const satuan = 'tahun buku berdividen';
  if (konteks.data.dividen.length === 0) {
    return lewat('R26', judul, 'Emiten ini tidak punya satu pun dividen tercatat.', satuan);
  }

  const penyesuaian = penyesuaianSplitDividen(konteks);
  const basis = new Map(basisSahamPerTahun(konteks).map((b) => [b.tahun, b]));

  const perTahun = new Map<number, Array<{ ex: string; milli: number }>>();
  for (const d of konteks.data.dividen) {
    const t = tahunBukuDividen(d.ex_date);
    if (!Number.isFinite(t)) continue;
    const milli = Math.round(d.nilai_per_lembar * 1000) * penyesuaian.lipat;
    const daftar = perTahun.get(t);
    if (daftar === undefined) perTahun.set(t, [{ ex: d.ex_date, milli }]);
    else daftar.push({ ex: d.ex_date, milli });
  }

  const temuan: Temuan[] = [];
  let diperiksa = 0;
  let merah = 0;
  let tidakLengkap = 0;
  const alasan: string[] = [];

  for (const t of [...perTahun.keys()].sort((a, b) => a - b)) {
    diperiksa += 1;
    const daftar = (perTahun.get(t) ?? []).sort((a, b) => a.ex.localeCompare(b.ex));
    const totalMilli = daftar.reduce((jumlah, d) => jumlah + d.milli, 0);
    const b = basis.get(t);

    // Penjaga kalimat negatif: RUPS yang memutuskan penggunaan laba tahun buku
    // t diselenggarakan pada tahun t + 1.
    const rupsTahunItu = konteks.data.rups.filter(
      (r) => r.ringkasan !== null && r.tanggal.slice(0, 4) === String(t + 1),
    );
    const menolak = rupsTahunItu.find((r) => menyatakanTanpaDividen(r.ringkasan ?? ''));
    if (menolak !== undefined) {
      merah += 1;
      temuan.push({
        temuan_id: 'R26-' + konteks.simbol + '-' + String(t) + '-tanpa-dividen',
        aturan: 'R26',
        keparahan: 'peringatan',
        ringkasan:
          'Keputusan RUPS ' + konteks.simbol + ' pada ' + menolak.tanggal + ' menyatakan tidak ada ' +
          'dividen yang dibagikan untuk tahun buku ' + String(t) + ', tetapi medan dividen memuat ' +
          String(daftar.length) + ' pembagian yang menurut aturan pemetaan kami termasuk tahun buku ' +
          'itu: ' + daftar.map((d) => 'Rp' + rupiahMilli(d.milli) + ' dengan tanggal ex ' + d.ex).join(', ') +
          '. Yang paling mungkin bukan bahwa salah satunya salah, melainkan bahwa aturan pemetaan ' +
          'kami — tahun ex dikurangi satu — tidak berlaku untuk emiten ini. Pembagian laba tahun ' +
          'buku ' + String(t) + ' tidak boleh ditulis di kartu sebelum itu dijelaskan.',
        angka: [{ label: 'jumlah dividen yang dipetakan', nilai: daftar.length, satuan: 'pembagian' }],
        fakta_terkait: [],
        rujukan: ['RUPS ' + menolak.tanggal, ...daftar.map((d) => 'dividen ex ' + d.ex)],
      });
      continue;
    }

    if (b === undefined || b.laba === 0) {
      tidakLengkap += 1;
      alasan.push(
        'Laba atau laba per lembar tahun buku ' + String(t) + ' tidak ada di data, jadi pembagian laba tahun itu tidak bisa dihitung.',
      );
      continue;
    }

    // payout = dividen per lembar x jumlah saham tahun itu / laba tahun itu.
    const totalRupiah = (totalMilli / 1000) * b.lembar;
    const persen = Number(((totalRupiah / b.laba) * 100).toFixed(1));
    if (persen >= SELANG_R26.bawah && persen <= SELANG_R26.atas) continue;

    merah += 1;
    const rincian =
      daftar.length === 1
        ? 'Rp' + rupiahMilli(totalMilli) + ' per lembar dengan tanggal ex ' + (daftar[0]?.ex ?? '')
        : daftar.length +
          ' pembagian yang jumlahnya Rp' +
          rupiahMilli(totalMilli) +
          ' per lembar (' +
          daftar.map((d) => 'Rp' + rupiahMilli(d.milli) + ' ex ' + d.ex).join(' dan ') +
          ')';
    const sebabRugi =
      b.laba < 0
        ? ' Angkanya negatif karena pembaginya rugi, bukan untung: dividen dibagikan sesudah tahun rugi, dan itu bisa saja sah kalau uangnya berasal dari laba tahun-tahun sebelumnya.'
        : '';
    temuan.push({
      temuan_id: 'R26-' + konteks.simbol + '-' + String(t),
      aturan: 'R26',
      keparahan: 'peringatan',
      ringkasan:
        konteks.simbol + ' membagikan ' + rincian + ', yang menurut aturan pemetaan kami termasuk ' +
        'tahun buku ' + String(t) + '. Tahun buku itu ' +
        (b.laba < 0
          ? 'rugi Rp' + angka(Math.round(-b.laba))
          : 'untung Rp' + angka(Math.round(b.laba))) +
        ', jadi pembagian itu setara ' + angka(persen) + '% dari labanya — di luar selang ' +
        String(SELANG_R26.bawah) + '% sampai ' + String(SELANG_R26.atas) +
        '% yang kami anggap masuk akal.' + sebabRugi +
        ' Penyebabnya tidak diketahui; bisa juga aturan pemetaan tahun buku kami yang tidak ' +
        'berlaku untuk emiten ini. Pembagian laba tahun buku ini tidak boleh ditulis di kartu ' +
        'sebelum itu dijelaskan.',
      angka: [
        { label: 'dividen per lembar tahun buku ini', nilai: totalMilli / 1000, satuan: 'rupiah per lembar' },
        { label: 'jumlah saham tahun buku ini', nilai: b.lembar, satuan: 'lembar' },
        { label: 'laba tahun buku ini', nilai: Math.round(b.laba), satuan: 'rupiah' },
        { label: 'pembagian laba', nilai: persen, satuan: 'persen' },
      ],
      fakta_terkait: [],
      rujukan: daftar.map((d) => 'dividen ex ' + d.ex),
    });
  }

  return hasil(
    'R26',
    judul,
    temuan,
    hitung(satuan, { diperiksa, merah, tidak_lengkap: tidakLengkap, alasan_dilewati: alasan }),
  );
}

// --- R27 medan rasio siap pakai ----------------------------------------------

/**
 * Selang yang masuk akal, **hanya** untuk medan yang punya batas alami.
 *
 * Sengaja longgar: imbal hasil ekuitas bisa sah sangat besar kalau ekuitasnya
 * mendekati nol. Yang aturan ini cari adalah angka yang tidak mungkin, seperti
 * `roe` 262,52 (yaitu 26.252%) dan `payout_ratio` -0,479.
 *
 * **Marjin dan rasio lancar sengaja TIDAK ada di sini.** Keduanya dibagi
 * pendapatan atau utang lancar, yang bisa mengecil sampai hampir nol tanpa ada
 * yang salah: pendapatan TIRT 2023 adalah Rp22 juta sementara laba kotornya
 * minus Rp29 miliar, jadi marjinnya -1.306 kali dan angka itu **benar**.
 * Menandainya berarti menolak data yang benar, yaitu kegagalan yang aturan ini
 * ada untuk mencegahnya.
 */
export const SELANG_RASIO: Record<string, { bawah: number; atas: number }> = {
  roe: { bawah: -5, atas: 5 },
  roa: { bawah: -5, atas: 5 },
  payout_ratio: { bawah: 0, atas: 2 },
};

/**
 * Cara menghitung ulang sebuah medan rasio dari laporan keuangan tahun yang
 * sama. Yang tidak ada di sini tidak bisa dihitung ulang dari data ini.
 */
const HITUNG_ULANG: Record<string, (k: KeuanganTahunan) => { atas: number; bawah: number } | null> = {
  roe: (k) => (k.laba === null || k.ekuitas === null ? null : { atas: k.laba, bawah: k.ekuitas }),
  roa: (k) => (k.laba === null || k.aset === null ? null : { atas: k.laba, bawah: k.aset }),
  net_profit_margin: (k) =>
    k.laba === null || k.pendapatan === null ? null : { atas: k.laba, bawah: k.pendapatan },
  gross_profit_margin: (k) =>
    k.laba_kotor === null || k.pendapatan === null ? null : { atas: k.laba_kotor, bawah: k.pendapatan },
};

/**
 * Seberapa jauh rasio siap pakai boleh melenceng dari hitungan ulangnya.
 *
 * Satu per sepuluh ribu: cukup longgar untuk pembulatan tampilan, cukup rapat
 * untuk menangkap rumus yang berbeda. Perbandingannya dilakukan sebagai
 * perkalian silang bilangan bulat, bukan pembagian pecahan (INV-D).
 */
export const TOLERANSI_R27 = 0.0001;

/**
 * R27 — medan rasio siap pakai yang tidak bisa dihitung ulang.
 *
 * Dua pemeriksaan, dan yang kedua lebih berarti daripada yang pertama:
 * apakah angkanya masuk akal sama sekali, dan apakah ia bisa dihitung ulang
 * dari laporan keuangan tahun yang sama. Medan yang **tidak bisa** dihitung
 * ulang dari data ini dijawab `TIDAK_LENGKAP`, bukan hijau — "hijau" untuk
 * angka yang tidak pernah diperiksa adalah persis kegagalan yang INV-B ada
 * untuk mencegahnya.
 */
export function r27RasioSiapPakai(konteks: KonteksGudang): HasilAturan {
  const judul = 'Medan rasio siap pakai';
  const satuan = 'medan rasio';
  if (konteks.data.rasio.length === 0) {
    return lewat('R27', judul, 'Emiten ini tidak punya satu pun medan rasio siap pakai.', satuan);
  }

  const keuangan = new Map(konteks.data.keuangan_tahunan.map((k) => [k.tahun, k]));
  const temuan: Temuan[] = [];
  let diperiksa = 0;
  let merah = 0;
  let tidakLengkap = 0;
  const alasan: string[] = [];

  for (const r of konteks.data.rasio) {
    diperiksa += 1;
    const selang = SELANG_RASIO[r.nama];
    if (selang !== undefined && (r.nilai < selang.bawah || r.nilai > selang.atas)) {
      merah += 1;
      temuan.push({
        temuan_id: 'R27-' + konteks.simbol + '-' + String(r.tahun) + '-' + r.nama + '-selang',
        aturan: 'R27',
        keparahan: 'peringatan',
        ringkasan:
          'Medan rasio siap pakai `' + r.nama + '` ' + konteks.simbol + ' untuk tahun buku ' +
          String(r.tahun) + ' bernilai ' + angka(Number(r.nilai.toFixed(4))) + ', di luar selang ' +
          String(selang.bawah) + ' sampai ' + String(selang.atas) + ' yang kami anggap mungkin. ' +
          'Penyebabnya tidak diketahui. Angka itu tidak boleh dipakai di kartu apa pun.',
        angka: [{ label: r.nama + ' tahun buku ' + String(r.tahun), nilai: r.nilai, satuan: 'rasio' }],
        fakta_terkait: [],
        rujukan: ['rasio ' + r.kelompok + '.' + r.nama + ' tahun buku ' + String(r.tahun)],
      });
      continue;
    }

    const cara = HITUNG_ULANG[r.nama];
    const k = keuangan.get(r.tahun);
    const bahan = cara === undefined || k === undefined ? null : cara(k);
    if (bahan === null || bahan.bawah === 0) {
      tidakLengkap += 1;
      alasan.push(
        cara === undefined
          ? 'Medan `' + r.nama + '` tidak punya rumus hitung ulang dari laporan keuangan di data ini.'
          : 'Angka yang dibutuhkan untuk menghitung ulang `' + r.nama + '` tahun buku ' + String(r.tahun) + ' tidak ada di laporan keuangan.',
      );
      continue;
    }

    // |nilai - atas/bawah| <= toleransi, ditulis sebagai perkalian silang.
    const selisih = Math.abs(r.nilai * bahan.bawah - bahan.atas);
    if (selisih <= TOLERANSI_R27 * Math.abs(bahan.bawah)) {
      // Angkanya cocok, tetapi tandanya bisa menipu: rasio yang positif karena
      // penyebutnya negatif membaca seperti untung padahal pembilangnya rugi.
      if (r.nilai > 0 && bahan.atas < 0 && bahan.bawah < 0) {
        merah += 1;
        temuan.push({
          temuan_id: 'R27-' + konteks.simbol + '-' + String(r.tahun) + '-' + r.nama + '-tanda',
          aturan: 'R27',
          keparahan: 'peringatan',
          ringkasan:
            'Medan rasio siap pakai `' + r.nama + '` ' + konteks.simbol + ' untuk tahun buku ' +
            String(r.tahun) + ' bernilai ' + angka(Number(r.nilai.toFixed(4))) + ', yaitu angka ' +
            'positif — tetapi ia positif hanya karena kedua angka yang dibagi sama-sama negatif: ' +
            'minus Rp' + angka(Math.round(-bahan.atas)) + ' dibagi minus Rp' +
            angka(Math.round(-bahan.bawah)) + '. Dibaca apa adanya, angka positif itu terbaca ' +
            'seperti untung, padahal tahun buku itu rugi. Angka ini tidak boleh dipakai di kartu ' +
            'tanpa menyebut kedua angka asalnya.',
          angka: [
            { label: r.nama + ' siap pakai', nilai: r.nilai, satuan: 'rasio' },
            { label: 'yang dibagi', nilai: Math.round(bahan.atas), satuan: 'rupiah' },
            { label: 'pembaginya', nilai: Math.round(bahan.bawah), satuan: 'rupiah' },
          ],
          fakta_terkait: [],
          rujukan: ['rasio ' + r.kelompok + '.' + r.nama + ' tahun buku ' + String(r.tahun)],
        });
      }
      continue;
    }

    merah += 1;
    const dihitung = Number((bahan.atas / bahan.bawah).toFixed(6));
    temuan.push({
      temuan_id: 'R27-' + konteks.simbol + '-' + String(r.tahun) + '-' + r.nama,
      aturan: 'R27',
      keparahan: 'peringatan',
      ringkasan:
        'Medan rasio siap pakai `' + r.nama + '` ' + konteks.simbol + ' untuk tahun buku ' +
        String(r.tahun) + ' bernilai ' + angka(Number(r.nilai.toFixed(6))) + ', sementara ' +
        'menghitungnya ulang dari angka laporan keuangan tahun yang sama memberi ' +
        angka(dihitung) + '. Rumus yang ' +
        'dipakai penyedia data karena itu bukan rumus yang kami kira. Angka itu tidak boleh ' +
        'dipakai di kartu sebelum rumusnya diketahui.',
      angka: [
        { label: r.nama + ' siap pakai', nilai: r.nilai, satuan: 'rasio' },
        { label: r.nama + ' hasil hitung ulang', nilai: dihitung, satuan: 'rasio' },
      ],
      fakta_terkait: [],
      rujukan: ['rasio ' + r.kelompok + '.' + r.nama + ' tahun buku ' + String(r.tahun)],
    });
  }

  return hasil(
    'R27',
    judul,
    temuan,
    hitung(satuan, { diperiksa, merah, tidak_lengkap: tidakLengkap, alasan_dilewati: alasan }),
  );
}

// --- R29 gerakan harga di tanggal ex dividen ---------------------------------

/**
 * Selang gerakan harga yang dianggap sejalan dengan dividen, **asimetris**.
 *
 * Harga boleh turun paling banyak tiga kali besar dividen, dan boleh **naik**
 * paling banyak satu kali besar dividen. Usulan lama memakai `[0, 3 x dividen]`,
 * yang simetris hanya pada namanya: kenaikan Rp1 pada dividen Rp3,20 dihitung
 * merah sama beratnya dengan kenaikan Rp7 pada dividen Rp0,14. Aturan ini
 * sebenarnya menanyakan "apakah harganya turun kira-kira sebesar dividen?",
 * bukan "apakah harganya turun tepat sebesar dividen?".
 */
export const SELANG_R29 = { turunMaks: 3, naikMaks: 1 } as const;

/** Satu pasang hari bursa yang mengapit tanggal ex. */
interface PasangEx {
  cum: BarisHarga;
  ex: BarisHarga;
}

/**
 * Hari bursa terakhir sebelum `exDate` dan hari bursa pertama pada atau
 * sesudahnya, ditambah dua pasangan tetangga.
 *
 * `ex_date` di data ini dipercaya **kurang lebih satu hari bursa**: §K-02 3.3
 * menunjukkan pendekatan "hari bursa terakhir sebelum ex_date" meleset satu
 * hari pada COCO. Karena aturan ini penanda, bukan penolak, ketiga pasangan
 * dicoba dan satu saja yang masuk selang sudah cukup untuk hijau.
 */
export function pasanganSekitarEx(harga: BarisHarga[], exDate: string): PasangEx[] {
  const bersih = harga
    .filter((h) => !barisHargaCacat(h))
    .sort((a, b) => a.tanggal.localeCompare(b.tanggal));
  const batas = bersih.findIndex((h) => h.tanggal >= exDate);
  if (batas <= 0) return [];
  const keluar: PasangEx[] = [];
  for (const geser of [0, -1, 1]) {
    const i = batas + geser;
    const cum = bersih[i - 1];
    const ex = bersih[i];
    if (cum === undefined || ex === undefined) continue;
    keluar.push({ cum, ex });
  }
  return keluar;
}

/**
 * Apakah gerakan `turun` (tutup hari cum dikurangi buka hari ex) sejalan dengan
 * dividen sebesar `dividen`?
 *
 * Dibandingkan sebagai bilangan bulat seperseribu rupiah (INV-D).
 */
export function gerakanSejalan(turunMilli: number, dividenMilli: number): boolean {
  return (
    turunMilli <= SELANG_R29.turunMaks * dividenMilli &&
    turunMilli >= -SELANG_R29.naikMaks * dividenMilli
  );
}

/**
 * R29 — harga di tanggal ex dividen.
 *
 * Tanggal ex adalah hari pertama pembeli baru **tidak lagi kebagian** dividen
 * itu, jadi harga biasanya membuka lebih rendah kira-kira sebesar dividennya.
 *
 * Dividen yang lebih kecil daripada satu fraksi harga bursa **dilewati**, bukan
 * ditandai: DADA membagikan Rp0,14 per lembar pada saham seharga Rp72, dan
 * fraksi harga terkecil di situ adalah Rp1 — tujuh kali dividennya. Dividen
 * sebesar itu tidak mungkin terlihat di harga, jadi menandainya berarti
 * menandai sesuatu yang tidak pernah bisa lulus.
 *
 * Kalau R31 membuktikan medan dividen sudah dibagi rasio pemecahan saham,
 * angkanya dikalikan kembali lebih dulu: tanpa itu dividen MLPT yang sudah
 * dibagi 25 dibandingkan dengan harga yang belum, dan perbandingannya meleset
 * 25 kali lipat.
 */
export function r29HargaDiTanggalEx(konteks: KonteksGudang): HasilAturan {
  const judul = 'Gerakan harga di tanggal ex dividen';
  const satuan = 'dividen';
  const dividen = konteks.data.dividen;
  if (dividen.length === 0) {
    return lewat('R29', judul, 'Emiten ini tidak punya satu pun dividen tercatat.', satuan);
  }

  const penyesuaian = penyesuaianSplitDividen(konteks);
  const temuan: Temuan[] = [];
  let diperiksa = 0;
  let merah = 0;
  let tidakLengkap = 0;
  let dilewati = 0;
  const alasan: string[] = [];

  for (const d of dividen) {
    const pasangan = pasanganSekitarEx(konteks.harga, d.ex_date);
    const utama = pasangan[0];
    if (utama === undefined) {
      diperiksa += 1;
      tidakLengkap += 1;
      alasan.push(
        'Tidak ada baris harga di kedua sisi tanggal ex dividen ini, jadi gerakannya tidak bisa diukur.',
      );
      continue;
    }

    const dividenMilli = Math.round(d.nilai_per_lembar * 1000) * penyesuaian.lipat;
    const fraksi = fraksiHarga(utama.cum.tutup);
    if (dividenMilli <= 0 || dividenMilli < fraksi * 1000) {
      dilewati += 1;
      alasan.push(
        'Dividennya lebih kecil daripada satu fraksi harga bursa, jadi ia tidak mungkin terlihat di harga.',
      );
      continue;
    }

    diperiksa += 1;
    const cocok = pasangan.find((p) =>
      gerakanSejalan(Math.round((p.cum.tutup - p.ex.buka) * 1000), dividenMilli),
    );
    if (cocok !== undefined) continue;

    merah += 1;
    const turun = Math.round((utama.cum.tutup - utama.ex.buka) * 1000);
    const arah = turun < 0 ? 'naik' : 'turun';
    const besar = Math.abs(turun);
    const catatanSplit =
      penyesuaian.lipat > 1
        ? ' Dividen di sini sudah dikalikan kembali ' +
          String(penyesuaian.lipat) +
          ', karena medan dividen emiten ini terbukti sudah dibagi rasio pemecahan saham sementara ' +
          'deret harganya belum.'
        : '';
    temuan.push({
      temuan_id: 'R29-' + konteks.simbol + '-' + d.ex_date,
      aturan: 'R29',
      keparahan: 'peringatan',
      ringkasan:
        'Pada tanggal ex ' +
        d.ex_date +
        ' — hari pertama pembeli baru tidak lagi kebagian dividen ini — harga ' +
        konteks.simbol +
        ' ' +
        arah +
        ' Rp' +
        rupiahMilli(besar) +
        ', dari tutup Rp' +
        angka(utama.cum.tutup) +
        ' pada ' +
        utama.cum.tanggal +
        ' ke buka Rp' +
        angka(utama.ex.buka) +
        ' pada ' +
        utama.ex.tanggal +
        '. Dividennya Rp' +
        rupiahMilli(dividenMilli) +
        ' per lembar, jadi gerakan itu di luar rentang yang kami anggap sejalan dengan dividen ' +
        'sebesar itu (turun paling banyak ' +
        String(SELANG_R29.turunMaks) +
        ' kali dividen, naik paling banyak ' +
        String(SELANG_R29.naikMaks) +
        ' kali).' +
        catatanSplit +
        ' Harga bergerak karena banyak sebab sekaligus, jadi ini bukan tuduhan bahwa datanya ' +
        'salah — hanya tanda bahwa dividen tidak bisa dipakai untuk menjelaskan gerakan hari itu.',
      angka: [
        { label: 'tutup hari terakhir masih kebagian', nilai: utama.cum.tutup, satuan: 'rupiah' },
        { label: 'buka hari pertama tidak kebagian', nilai: utama.ex.buka, satuan: 'rupiah' },
        { label: 'dividen per lembar', nilai: dividenMilli / 1000, satuan: 'rupiah per lembar' },
      ],
      fakta_terkait: [],
      rujukan: ['harga harian ' + utama.cum.tanggal, 'harga harian ' + utama.ex.tanggal],
    });
  }

  return hasil(
    'R29',
    judul,
    temuan,
    hitung(satuan, { diperiksa, merah, tidak_lengkap: tidakLengkap, dilewati, alasan_dilewati: alasan }),
  );
}

// --- R34 aksi korporasi tanpa harga di kedua sisi ----------------------------

export interface AksiKorporasi {
  jenis: string;
  tanggal: string;
  keterangan: string;
}

/** Semua aksi korporasi satu emiten, satu daftar, urutan tetap. */
export function daftarAksi(konteks: KonteksGudang): AksiKorporasi[] {
  const d = konteks.data;
  const keluar: AksiKorporasi[] = [
    ...d.dividen.map((x) => ({
      jenis: 'dividen tunai',
      tanggal: x.ex_date,
      keterangan: 'Rp' + angka(x.nilai_per_lembar) + ' per lembar',
    })),
    ...d.right_issue.map((x) => ({
      jenis: 'penerbitan saham baru',
      tanggal: x.ex_date,
      keterangan:
        x.rasio_lama === null || x.rasio_baru === null
          ? 'rasionya tidak tercatat'
          : String(x.rasio_lama) + ' berbanding ' + String(x.rasio_baru),
    })),
    ...d.stock_split.map((x) => ({
      jenis: 'pemecahan saham',
      tanggal: x.tanggal,
      keterangan: '1 lembar menjadi ' + String(x.rasio),
    })),
    ...d.bonus.map((x) => ({
      jenis: 'saham bonus',
      tanggal: x.ex_date,
      keterangan:
        x.rasio_lama === undefined || x.rasio_lama === null || x.rasio_baru === undefined || x.rasio_baru === null
          ? 'rasionya tidak tercatat'
          : String(x.rasio_lama) + ' berbanding ' + String(x.rasio_baru),
    })),
  ];
  return keluar.sort(
    (a, b) => a.tanggal.localeCompare(b.tanggal) || a.jenis.localeCompare(b.jenis) || a.keterangan.localeCompare(b.keterangan),
  );
}

/** Apakah ada baris harga sebelum dan pada atau sesudah `tanggal`? */
export function hargaDiKeduaSisi(harga: BarisHarga[], tanggal: string): boolean {
  let sebelum = false;
  let sesudah = false;
  for (const h of harga) {
    if (barisHargaCacat(h)) continue;
    if (h.tanggal < tanggal) sebelum = true;
    else sesudah = true;
    if (sebelum && sesudah) return true;
  }
  return false;
}

/**
 * R34 — aksi korporasi tanpa harga harian di kedua sisinya.
 *
 * Ini **daftar kerja penarikan data, bukan kesalahan**. Aksi yang mau dijadikan
 * kartu harus punya baris harga sebelum dan pada atau sesudah tanggalnya;
 * kalau tidak, tidak ada satu pun aturan harga yang bisa berbunyi tentangnya.
 * Statusnya `TIDAK_LENGKAP`, dan nol merah adalah hasil yang diharapkan.
 */
export function r34AksiTanpaHarga(konteks: KonteksGudang): HasilAturan {
  const judul = 'Aksi korporasi dengan harga di kedua sisinya';
  const satuan = 'aksi korporasi';
  const aksi = daftarAksi(konteks);
  if (aksi.length === 0) {
    return lewat('R34', judul, 'Emiten ini tidak punya satu pun aksi korporasi tercatat.', satuan);
  }

  const temuan: Temuan[] = [];
  let tidakLengkap = 0;
  const alasan: string[] = [];
  const kurang: AksiKorporasi[] = [];

  for (const a of aksi) {
    if (hargaDiKeduaSisi(konteks.harga, a.tanggal)) continue;
    tidakLengkap += 1;
    alasan.push('Tidak ada baris harga harian di kedua sisi tanggal aksi ini.');
    kurang.push(a);
  }

  if (kurang.length > 0) {
    const contoh = kurang.slice(0, 3);
    temuan.push({
      temuan_id: 'R34-' + konteks.simbol,
      aturan: 'R34',
      keparahan: 'catatan',
      ringkasan:
        String(kurang.length) +
        ' dari ' +
        String(aksi.length) +
        ' aksi korporasi ' +
        konteks.simbol +
        ' tidak punya harga harian di kedua sisinya, jadi tidak ada satu pun pemeriksaan harga ' +
        'yang bisa dijalankan atasnya' +
        (kurang.length > contoh.length ? ', antara lain' : '') +
        ': ' +
        contoh.map((a) => a.jenis + ' ' + a.tanggal + ' (' + a.keterangan + ')').join(', ') +
        '. Ini daftar pekerjaan penarikan data, bukan tanda bahwa ada yang salah.',
      angka: [
        { label: 'aksi tanpa harga di kedua sisi', nilai: kurang.length, satuan: 'aksi' },
        { label: 'aksi korporasi seluruhnya', nilai: aksi.length, satuan: 'aksi' },
      ],
      fakta_terkait: [],
      rujukan: kurang.map((a) => a.jenis + ' ' + a.tanggal),
    });
  }

  return hasil(
    'R34',
    judul,
    temuan,
    hitung(satuan, { diperiksa: aksi.length, merah: 0, tidak_lengkap: tidakLengkap, alasan_dilewati: alasan }),
  );
}

// --- R11b satu penyebut untuk seluruh rantai ---------------------------------

/**
 * Selang penyebut satu sisi laporan, disimpan sebagai **pecahan bilangan
 * bulat** supaya perbandingannya eksak (INV-D).
 *
 * `bawah = lembar x 100 x skala / (q + 5)` dan `atas = … / (q - 5)` dengan
 * `q = persen x skala` dibulatkan. Disimpan sebagai pembilang dan penyebut,
 * bukan sebagai hasil baginya, karena seluruh aturan ini adalah perbandingan
 * selang dan satu pembulatan di tempat yang salah memindahkan batasnya.
 */
interface SelangPecahan {
  label: string;
  lembar: number;
  persen: number;
  bawahAtas: bigint;
  bawahBawah: bigint;
  atasAtas: bigint;
  atasBawah: bigint;
}

/** Bandingkan dua pecahan `a/b` dan `c/d` dengan penyebut positif. */
function bandingPecahan(a: bigint, b: bigint, c: bigint, d: bigint): number {
  const kiri = a * d;
  const kanan = c * b;
  return kiri < kanan ? -1 : kiri > kanan ? 1 : 0;
}

function selangSisi(
  label: string,
  lembar: number,
  persen: number,
  desimal: number = DESIMAL_PERSEN,
): SelangPecahan | null {
  if (!Number.isFinite(persen) || persen <= 0 || lembar <= 0) return null;
  const skala = 10 ** (desimal + 1);
  const q = Math.round(persen * skala);
  if (q <= 5) return null;
  const pembilang = BigInt(Math.round(lembar)) * BigInt(100 * skala);
  return {
    label,
    lembar,
    persen,
    bawahAtas: pembilang,
    bawahBawah: BigInt(q + 5),
    atasAtas: pembilang,
    atasBawah: BigInt(q - 5),
  };
}

export interface PenyebutRantai {
  /** Jumlah saham beredar yang paling banyak menjelaskan rantai ini. */
  lembar: number;
  /** Berapa sisi laporan yang selangnya memuat angka itu. */
  didukung: number;
  /** Berapa sisi laporan yang punya selang sama sekali. */
  dari: number;
  /** Kenapa angka itu yang dipilih — termasuk aturan seri kalau terpakai. */
  alasan: string;
}

/**
 * Pilih satu jumlah saham beredar yang menjelaskan sebanyak mungkin sisi
 * laporan satu emiten.
 *
 * **Aturan serinya ditulis, dan itulah yang membuat R11b bisa dibangun ulang.**
 * Uji lawan §R11b menunjuk tepat ke sini: definisi lama berbunyi "cari satu
 * nilai penyebut yang masuk selang sebanyak mungkin" tanpa menyebut apa yang
 * terjadi kalau dua nilai sama banyaknya, sehingga hasilnya bergantung urutan
 * sapuan — dan itulah sebab hitungan BEEF penulis dan penguji berbeda.
 *
 * Aturan yang dipakai di sini, berurutan:
 *
 * 1. Calon titik adalah **batas bawah tiap selang**. Setiap kelompok selang
 *    yang saling beririsan pasti memuat salah satunya, jadi tidak ada kelompok
 *    yang terlewat.
 * 2. Untuk tiap calon, hitung berapa selang yang memuatnya. Yang terbanyak
 *    menang, dan angka yang dipakai adalah **titik tengah irisan** kelompok itu.
 * 3. Kalau dua kelompok sama banyaknya, yang menang adalah yang titik tengahnya
 *    **paling dekat ke nilai pasar dibagi harga tutup pada tanggal laporan
 *    terakhir**.
 * 4. Kalau masih seri, yang lembarnya lebih kecil menang.
 *
 * Langkah 3 dan 4 dicatat di `alasan`, supaya pembaca tahu pilihannya tidak
 * bulat.
 */
export function penyebutRantai(konteks: KonteksGudang): PenyebutRantai | null {
  const selang: SelangPecahan[] = [];
  for (const l of urutR12(konteks.laporan)) {
    const sebelum = selangSisi(l.laporan_id + ' sebelum', l.sebelum, l.persen_sebelum);
    const sesudah = selangSisi(l.laporan_id + ' sesudah', l.sesudah, l.persen_sesudah);
    if (sebelum !== null) selang.push(sebelum);
    if (sesudah !== null) selang.push(sesudah);
  }
  if (selang.length === 0) return null;

  // Patokan aturan seri: nilai pasar dibagi harga tutup pada tanggal laporan terakhir.
  const terakhir = urutR12(konteks.laporan).at(-1);
  const cari = konteks.sahamBeredarPada;
  const patokan =
    terakhir === undefined || cari === undefined
      ? null
      : (cari(terakhir.dilaporkan_pada.slice(0, 10))?.lembar ?? null);

  interface Calon {
    lembar: bigint;
    didukung: number;
    jarak: bigint | null;
  }
  const calon: Calon[] = [];

  for (const titik of selang) {
    // Kelompok = semua selang yang memuat batas bawah selang ini.
    const kelompok = selang.filter(
      (s) =>
        bandingPecahan(s.bawahAtas, s.bawahBawah, titik.bawahAtas, titik.bawahBawah) <= 0 &&
        bandingPecahan(s.atasAtas, s.atasBawah, titik.bawahAtas, titik.bawahBawah) >= 0,
    );
    if (kelompok.length === 0) continue;

    // Irisan kelompok: batas bawah terbesar dan batas atas terkecil.
    let bA = kelompok[0]?.bawahAtas ?? 0n;
    let bB = kelompok[0]?.bawahBawah ?? 1n;
    let aA = kelompok[0]?.atasAtas ?? 0n;
    let aB = kelompok[0]?.atasBawah ?? 1n;
    for (const s of kelompok) {
      if (bandingPecahan(s.bawahAtas, s.bawahBawah, bA, bB) > 0) {
        bA = s.bawahAtas;
        bB = s.bawahBawah;
      }
      if (bandingPecahan(s.atasAtas, s.atasBawah, aA, aB) < 0) {
        aA = s.atasAtas;
        aB = s.atasBawah;
      }
    }
    // Titik tengah irisan, dibulatkan ke lembar utuh: (bA/bB + aA/aB) / 2.
    const pembilang = bA * aB + aA * bB;
    const penyebut = 2n * bB * aB;
    const tengah = (pembilang + penyebut / 2n) / penyebut;
    calon.push({
      lembar: tengah,
      didukung: kelompok.length,
      jarak: patokan === null ? null : (tengah > BigInt(patokan) ? tengah - BigInt(patokan) : BigInt(patokan) - tengah),
    });
  }
  if (calon.length === 0) return null;

  calon.sort((a, b) => {
    if (a.didukung !== b.didukung) return b.didukung - a.didukung;
    if (a.jarak !== null && b.jarak !== null && a.jarak !== b.jarak) return a.jarak < b.jarak ? -1 : 1;
    return a.lembar < b.lembar ? -1 : a.lembar > b.lembar ? 1 : 0;
  });
  const menang = calon[0];
  if (menang === undefined) return null;

  const seri = calon.filter((c) => c.didukung === menang.didukung && c.lembar !== menang.lembar);
  const alasan =
    seri.length === 0
      ? 'Angka ini masuk ke dalam selang ' + String(menang.didukung) + ' dari ' + String(selang.length) + ' sisi laporan, lebih banyak daripada angka lain mana pun.'
      : patokan === null
        ? 'Ada ' + String(seri.length + 1) + ' angka yang sama-sama masuk ke ' + String(menang.didukung) + ' selang; yang lembarnya paling sedikit dipilih, karena tidak ada nilai pasar bertanggal untuk menengahi.'
        : 'Ada ' + String(seri.length + 1) + ' angka yang sama-sama masuk ke ' + String(menang.didukung) + ' selang; yang dipilih adalah yang paling dekat ke nilai pasar dibagi harga tutup pada tanggal laporan terakhir (' + angka(patokan) + ' lembar).';

  return {
    lembar: Number(menang.lembar),
    didukung: menang.didukung,
    dari: selang.length,
    alasan,
  };
}

/**
 * R11b — satu penyebut harus menjelaskan seluruh rantai satu emiten.
 *
 * Kalau satu emiten melaporkan persen yang tidak bisa berasal dari satu jumlah
 * saham beredar yang sama, salah satu laporannya memakai penyebut yang berbeda
 * — dan kartu apa pun yang membandingkan dua persen dari rantai itu akan
 * membandingkan dua hal yang berbeda.
 *
 * Berkeparahan **peringatan**, bukan konflik: jumlah saham beredar memang
 * berubah, dan rantai yang melintasi penerbitan saham baru memang tidak bisa
 * dijelaskan satu angka.
 */
export function r11bPenyebutRantai(konteks: KonteksGudang): HasilAturan {
  const judul = 'Satu penyebut untuk seluruh rantai';
  const satuan = 'sisi laporan';
  if (konteks.laporan.length < 2) {
    return lewat(
      'R11b',
      judul,
      'Kurang dari dua laporan, jadi tidak ada rantai yang perlu satu penyebut bersama.',
      satuan,
      konteks.laporan.length * 2,
    );
  }

  const pilihan = penyebutRantai(konteks);
  if (pilihan === null) {
    return lewat(
      'R11b',
      judul,
      'Tidak ada satu pun persen yang bisa memberi selang penyebut di rantai ini.',
      satuan,
      konteks.laporan.length * 2,
    );
  }

  const temuan: Temuan[] = [];
  let diperiksa = 0;
  let merah = 0;
  let tidakLengkap = 0;
  const alasan: string[] = [];
  const meleset: Array<{ label: string; persen: number; tersirat: number; jauh: number }> = [];

  for (const l of urutR12(konteks.laporan)) {
    const pasangan: Array<[string, number, number]> = [
      ['sebelum transaksi', l.sebelum, l.persen_sebelum],
      ['sesudah transaksi', l.sesudah, l.persen_sesudah],
    ];
    for (const [sisi, lembar, persen] of pasangan) {
      diperiksa += 1;
      if (selangSisi('x', lembar, persen) === null) {
        tidakLengkap += 1;
        alasan.push('Persen yang dilaporkan nol atau kosong, jadi selang penyebutnya tidak ada.');
        continue;
      }
      if (persenKonsisten(lembar, pilihan.lembar, persen)) continue;
      merah += 1;
      const tersirat = Math.round(lembar / (persen / 100));
      const jauh = Number((((tersirat - pilihan.lembar) / pilihan.lembar) * 100).toFixed(2));
      meleset.push({
        label: l.dilaporkan_pada + ' ' + sisi,
        persen,
        tersirat,
        jauh,
      });
    }
  }

  if (meleset.length > 0) {
    const contoh = meleset.slice(0, 2);
    const terjauh = meleset.reduce((a, b) => (Math.abs(b.jauh) > Math.abs(a.jauh) ? b : a));
    // Dua cabang, dipilih dari data: "sebagian besar rantai sepakat, satu-dua
    // sisi tidak" adalah cerita yang berbeda dari "tidak ada satu angka pun
    // yang menjelaskan sebagian besar rantai ini". Menuliskan keduanya dengan
    // kalimat yang sama akan membuat COCO — 4 dari 22 — terbaca seperti FOLK,
    // yang 14 dari 16.
    const sebagianBesar = pilihan.didukung * 2 > pilihan.dari;
    const pembuka = sebagianBesar
      ? 'Rantai laporan ' + konteks.simbol + ' tidak bisa dijelaskan satu jumlah saham beredar. ' +
        'Angka yang paling banyak cocok adalah ' + angka(pilihan.lembar) + ' lembar. ' + pilihan.alasan
      : 'Tidak ada satu jumlah saham beredar pun yang menjelaskan sebagian besar rantai laporan ' +
        konteks.simbol + '. Angka yang paling banyak cocok, ' + angka(pilihan.lembar) + ' lembar, ' +
        'hanya menjelaskan ' + String(pilihan.didukung) + ' dari ' + String(pilihan.dari) +
        ' sisi laporan.';
    temuan.push({
      temuan_id: 'R11b-' + konteks.simbol,
      aturan: 'R11b',
      keparahan: 'peringatan',
      ringkasan:
        pembuka + ' Sisanya, ' + String(meleset.length) + ' sisi laporan, menyiratkan ' +
        'jumlah saham yang lain: ' +
        contoh.map((m) => m.label + ' menulis ' + angka(m.persen) + '%, yang baru mungkin kalau sahamnya ' + angka(m.tersirat) + ' lembar').join('; ') +
        '. Yang paling jauh meleset ' + angka(Math.abs(terjauh.jauh)) + '% dari angka pilihan. ' +
        'Perusahaan boleh menerbitkan saham di tengah rantai, jadi ini belum tentu kesalahan — ' +
        'tetapi dua persen dari rantai ini tidak boleh dibandingkan langsung sebelum diketahui ' +
        'keduanya memakai pembagi yang sama.',
      angka: [
        { label: 'jumlah saham yang paling banyak cocok', nilai: pilihan.lembar, satuan: 'lembar' },
        { label: 'sisi laporan yang cocok', nilai: pilihan.didukung, satuan: 'sisi laporan' },
        { label: 'sisi laporan yang tidak cocok', nilai: meleset.length, satuan: 'sisi laporan' },
        { label: 'selisih terjauh', nilai: Math.abs(terjauh.jauh), satuan: 'persen' },
      ],
      fakta_terkait: [],
      rujukan: meleset.map((m) => m.label),
    });
  }

  return hasil(
    'R11b',
    judul,
    temuan,
    hitung(satuan, { diperiksa, merah, tidak_lengkap: tidakLengkap, alasan_dilewati: alasan }),
  );
}
