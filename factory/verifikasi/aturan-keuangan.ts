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
  HasilAturan,
  KonteksGudang,
  RightIssue,
  SahamBonus,
  StockSplit,
} from './tipe.ts';
import { angka, hasil, hitung, lewat } from './dasar.ts';

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
      nama: `jumlah saham yang diterbitkan menurut laporan keuangan tahun buku ${String(t.tahun)}`,
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
        nama: `nilai pasar dibagi harga tutup ${wakil.tanggal}, hari bursa terdekat dengan akhir tahun buku ${String(t.tahun)}`,
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
      `${String(sebarPersen(min, maks))}%. Dua angka laba per lembar dari tahun yang berbeda ` +
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
          `${b.nama}. Selisihnya ${String(sebarPersen(min, maks))}%. Karena keduanya berbicara tentang ` +
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
          `Jumlah saham ${konteks.simbol} menjadi ${String(lipatTerukur)} kali lipat antara tahun buku ` +
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
        `Jumlah saham ${konteks.simbol} menjadi ${String(lipatTerukur)} kali lipat antara tahun buku ` +
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

      merah += 1;
      const selisih = Math.abs(dariRups - Math.round(menurutKeuangan));
      temuan.push({
        temuan_id: `R23-${konteks.simbol}-${r.tanggal}`,
        aturan: 'R23',
        ringkasan:
          `Laba bersih tahun buku ${String(tahunBuku)} ditulis dua kali dengan angka yang berbeda. ` +
          `Keputusan RUPS ${konteks.simbol} pada ${r.tanggal} menyebut Rp${angka(dariRups)}; ` +
          `laporan keuangan menyebut Rp${angka(Math.round(menurutKeuangan))}. Selisihnya ` +
          `Rp${angka(selisih)}. Mana yang benar tidak terbaca dari data ini — keputusan RUPS bisa ` +
          `menyebut laba induk saja sementara laporan keuangan menyebut laba seluruh kelompok ` +
          `usaha, dan keduanya sah. Angka laba yang dipakai di kartu harus menyebut dari mana ia ` +
          `diambil.`,
        angka: [
          { label: 'laba menurut keputusan RUPS', nilai: dariRups, satuan: 'rupiah' },
          { label: 'laba menurut laporan keuangan', nilai: Math.round(menurutKeuangan), satuan: 'rupiah' },
          { label: 'selisih', nilai: selisih, satuan: 'rupiah' },
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
): CocokDividen | null {
  const urut = [...dividen].sort((a, b) => a.ex_date.localeCompare(b.ex_date));
  const milli = urut.map((d) => Math.round(d.nilai_per_lembar * 1000));
  const pengali = [1, ...[...new Set(rasioSplit)].filter((r) => r > 1).sort((a, b) => a - b)];

  for (const lipat of pengali) {
    for (const [i, m] of milli.entries()) {
      const ex = urut[i]?.ex_date;
      if (ex === undefined || m === undefined) continue;
      if (m * lipat === targetMilli) return { cara: 'satu', lipat, ex: [ex], milli: m };
    }
    for (let i = 0; i < milli.length; i += 1) {
      for (let j = i + 1; j < milli.length; j += 1) {
        const a = milli[i];
        const b = milli[j];
        const exA = urut[i]?.ex_date;
        const exB = urut[j]?.ex_date;
        if (a === undefined || b === undefined || exA === undefined || exB === undefined) continue;
        if ((a + b) * lipat === targetMilli) {
          return { cara: 'jumlah-dua', lipat, ex: [exA, exB], milli: a + b };
        }
      }
    }
  }
  return null;
}

/** Tulis nilai seperseribu rupiah sebagai rupiah, tanpa nol berekor. */
export function rupiahMilli(milli: number): string {
  const bulat = Math.trunc(milli / 1000);
  const sisa = Math.abs(milli % 1000);
  if (sisa === 0) return angka(bulat);
  return angka(bulat) + ',' + String(sisa).padStart(3, '0').replace(/0+$/, '');
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
      const cocok = cariCocokDividen(a.milli, dividenDekat(konteks, r.tanggal), rasio);
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
      const cocok = cariCocokDividen(a.milli, dekat, rasio);
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
