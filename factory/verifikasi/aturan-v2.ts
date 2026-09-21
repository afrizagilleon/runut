/**
 * Aturan verifikasi generasi kedua (M2a).
 *
 * Definisinya datang dari putusan uji lawan `.context/aturan-R-uji-lawan.md`,
 * bukan dari terjemahan skrip pembanding: dua implementasi yang berbagi cacat
 * yang sama tidak bisa saling merekonsiliasi.
 *
 * Tiap aturan adalah fungsi murni `(konteks) -> HasilAturan` dan wajib
 * melaporkan hitungan INV-B. Tidak ada aturan yang boleh melewati unit
 * diam-diam: yang dilewati disebut jumlah dan alasannya.
 */
import type { Temuan } from '../skema/tipe.ts';
import type {
  BarisHarga,
  HasilAturan,
  KonteksGudang,
  KonteksVerifikasi,
  Laporan,
} from './tipe.ts';
import { angka, hasil, hitung, lewat, urut } from './dasar.ts';
import { DESIMAL_PERSEN, persenKonsisten, selangPenyebut } from './penyebut.ts';

// --- R7 dengan penyebut bertanggal (D-3, D-5) --------------------------------

/**
 * R7 versi kedua: persen dihitung ulang terhadap jumlah saham beredar
 * **pada tanggal laporan itu**.
 *
 * Bedanya dengan R7 generasi pertama hanya satu hal, dan hal itu menentukan:
 * penyebutnya bertanggal. Dengan satu angka tanpa tanggal, R7 menolak 22 dari
 * 22 sisi laporan COCO — bukan karena angkanya salah, melainkan karena
 * penyebut 14,2 miliar lembar (keadaan 2026, sesudah dua rights issue) dipakai
 * untuk laporan September 2025 yang penyebutnya masih ~890 juta.
 *
 * Putusan: KONFLIK kalau penyebut yang berlaku **di luar** selang yang
 * dibolehkan ketelitian medan persen; TIDAK_LENGKAP kalau tidak ada titik
 * penyebut yang berlaku, atau kalau persennya sendiri nol/kosong.
 */
export function r7PersenPerTanggal(konteks: KonteksVerifikasi): HasilAturan {
  const judul = 'Persen dihitung ulang terhadap saham beredar pada tanggal laporan';
  const satuan = 'sisi laporan';
  if (konteks.laporan.length === 0) {
    return lewat('R7', judul, 'Tidak ada laporan untuk diperiksa.', satuan);
  }
  const cari = konteks.sahamBeredarPada;
  if (cari === undefined) {
    return lewat(
      'R7',
      judul,
      'Konteks ini tidak menyediakan jumlah saham beredar per tanggal.',
      satuan,
      konteks.laporan.length * 2,
    );
  }

  const temuan: Temuan[] = [];
  let diperiksa = 0;
  let merah = 0;
  let tidakLengkap = 0;
  const alasanKosong: string[] = [];

  for (const l of urut(konteks.laporan)) {
    const tanggal = l.dilaporkan_pada.slice(0, 10);
    const titik = cari(tanggal);
    const pasangan: Array<[string, number, number]> = [
      ['sebelum transaksi', l.sebelum, l.persen_sebelum],
      ['sesudah transaksi', l.sesudah, l.persen_sesudah],
    ];
    for (const [sisi, lembar, dilaporkan] of pasangan) {
      diperiksa += 1;
      if (!Number.isFinite(dilaporkan) || dilaporkan <= 0) {
        tidakLengkap += 1;
        alasanKosong.push('Persen yang dilaporkan nol atau kosong.');
        continue;
      }
      if (titik === null) {
        tidakLengkap += 1;
        alasanKosong.push(
          'Tidak ada titik jumlah saham beredar yang berlaku pada tanggal laporan.',
        );
        continue;
      }
      if (persenKonsisten(lembar, titik.lembar, dilaporkan, DESIMAL_PERSEN)) continue;

      merah += 1;
      const selang = selangPenyebut(lembar, dilaporkan, DESIMAL_PERSEN);
      const dihitung = (lembar / titik.lembar) * 100;
      const tambahan =
        selang === null
          ? ''
          : ` Persen ${String(dilaporkan)}% baru mungkin kalau penyebutnya antara ${angka(Math.round(selang.bawah))} dan ${angka(Math.round(selang.atas))} lembar.`;
      temuan.push({
        temuan_id: `R7-${l.laporan_id}-${sisi.replace(/\s+/g, '-')}`,
        aturan: 'R7',
        ringkasan:
          `Laporan ${l.dilaporkan_pada} menulis kepemilikan ${sisi} ${String(dilaporkan)}%, ` +
          `padahal ${angka(lembar)} lembar dibagi ${angka(titik.lembar)} saham beredar yang berlaku ` +
          `${titik.pada} adalah ${dihitung.toFixed(2)}%.${tambahan}`,
        angka: [
          { label: 'persen menurut laporan', nilai: dilaporkan, satuan: 'persen' },
          { label: 'persen hasil hitung ulang', nilai: Number(dihitung.toFixed(2)), satuan: 'persen' },
          { label: 'lembar', nilai: lembar, satuan: 'lembar' },
          { label: 'saham beredar yang dipakai', nilai: titik.lembar, satuan: 'lembar' },
        ],
        fakta_terkait: [],
        rujukan: [`${l.dilaporkan_pada} · ${l.berkas}`, `penyebut: ${titik.sumber}`],
      });
    }
  }

  return hasil(
    'R7',
    judul,
    temuan,
    hitung(satuan, {
      diperiksa,
      merah,
      tidak_lengkap: tidakLengkap,
      alasan_dilewati: alasanKosong,
    }),
  );
}

// --- R12 tanggal di nama berkas (gerbang urutan) -----------------------------

/**
 * Pola berjangkar tanggal terbit di dalam `source`: `/LK-DDMMYYYY-`.
 *
 * Berjangkar pada garis miring dan tanda hubung, bukan dicari di mana saja:
 * bentuk lain (`From_EREP/YYYYMM/<hash>.pdf`, 66 laporan di uji lawan) memang
 * tidak memuat tanggal, dan menebaknya dari angka lain di alamat akan salah.
 */
const POLA_TANGGAL_BERKAS = /\/LK-(\d{2})(\d{2})(\d{4})-/;

export interface TanggalTerbit {
  /** Tanggal yang dipakai sebagai kunci urut (ISO). */
  tanggal: string;
  /** `true` kalau tanggal itu terbaca dari nama berkas, bukan dari timestamp. */
  dari_nama_berkas: boolean;
}

/**
 * Tanggal terbit satu laporan (R12).
 *
 * Inilah **kunci urut** untuk R14, R16, dan R22. Bukan hiasan: dua laporan BEEF
 * yang tanggal nama berkasnya berbeda dari `timestamp`-nya menjelaskan tiga
 * dari 26 putus rantai R14 dan satu dari delapan merah R16. Mengurutkan dengan
 * `timestamp` menaruh pangkal rantai di tengah.
 */
export function tanggalTerbit(sumber: string | undefined, waktu: string): TanggalTerbit {
  const cocok = sumber === undefined ? null : POLA_TANGGAL_BERKAS.exec(sumber);
  if (cocok === null) return { tanggal: waktu.slice(0, 10), dari_nama_berkas: false };
  return {
    tanggal: `${cocok[3] ?? ''}-${cocok[2] ?? ''}-${cocok[1] ?? ''}`,
    dari_nama_berkas: true,
  };
}

const SEHARI_MS = 24 * 60 * 60 * 1000;

function selisihHari(a: string, b: string): number {
  const x = Date.parse(`${a}T00:00:00Z`);
  const y = Date.parse(`${b}T00:00:00Z`);
  if (!Number.isFinite(x) || !Number.isFinite(y)) return 0;
  return Math.round((y - x) / SEHARI_MS);
}

/**
 * R12 — tanggal di nama berkas berbeda dari jam terbit.
 *
 * Keparahan **peringatan**: perbedaannya bisa berarti laporan terbit ulang,
 * bisa berarti `timestamp` adalah waktu penyedia menyerapnya. Tidak ada medan
 * yang membedakan keduanya, jadi aturan ini tidak menuduh — ia memberi kunci
 * urut yang lebih baik kepada aturan lain.
 */
export function r12TanggalNamaBerkas(konteks: KonteksVerifikasi): HasilAturan {
  const judul = 'Tanggal di nama berkas laporan';
  const satuan = 'laporan';
  if (konteks.laporan.length === 0) {
    return lewat('R12', judul, 'Tidak ada laporan untuk diperiksa.', satuan);
  }
  const temuan: Temuan[] = [];
  let diperiksa = 0;
  let merah = 0;
  let dilewati = 0;

  for (const l of urut(konteks.laporan)) {
    const terbit = tanggalTerbit(l.sumber_dokumen, l.dilaporkan_pada);
    if (!terbit.dari_nama_berkas) {
      dilewati += 1;
      continue;
    }
    diperiksa += 1;
    const hariTimestamp = l.dilaporkan_pada.slice(0, 10);
    if (terbit.tanggal === hariTimestamp) continue;
    merah += 1;
    temuan.push({
      temuan_id: `R12-${l.laporan_id}`,
      aturan: 'R12',
      keparahan: 'peringatan',
      ringkasan:
        `Nama berkas laporan menyebut tanggal ${terbit.tanggal}, sedangkan jam terbitnya ` +
        `${l.dilaporkan_pada}. Untuk mengurutkan rantai, yang dipakai adalah tanggal nama berkas.`,
      angka: [
        { label: 'selisih hari', nilai: selisihHari(terbit.tanggal, hariTimestamp), satuan: 'hari' },
      ],
      fakta_terkait: [],
      rujukan: [`${l.dilaporkan_pada} · ${l.berkas}`],
    });
  }

  return hasil(
    'R12',
    judul,
    temuan,
    hitung(satuan, {
      diperiksa,
      merah,
      dilewati,
      alasan_dilewati:
        dilewati > 0
          ? ['Alamat laporan tidak berpola LK-DDMMYYYY, jadi tidak memuat tanggal terbit.']
          : [],
    }),
  );
}

/** Urutkan laporan dengan kunci R12, lalu jam terbit, lalu id. Tidak ada seri tersisa. */
export function urutR12(laporan: Laporan[]): Laporan[] {
  return [...laporan].sort((a, b) => {
    const ta = tanggalTerbit(a.sumber_dokumen, a.dilaporkan_pada).tanggal;
    const tb = tanggalTerbit(b.sumber_dokumen, b.dilaporkan_pada).tanggal;
    return (
      ta.localeCompare(tb) ||
      a.dilaporkan_pada.localeCompare(b.dilaporkan_pada) ||
      a.laporan_id.localeCompare(b.laporan_id)
    );
  });
}

// --- R22 nama pemegang dinormalkan -------------------------------------------

const AKHIRAN_BADAN_HUKUM = ['tbk', 'persero', 'pte', 'ltd', 'llc', 'inc'];

/**
 * Nama pemegang saham dalam bentuk yang bisa dibandingkan.
 *
 * Membuang semua yang bukan huruf atau angka **tidak cukup** untuk nama
 * Indonesia: `"PT Estika Tata Tiara Tbk"` menjadi `ptestikatatatiaratbk`,
 * sedangkan `"Estika Tata Tiara"` menjadi `estikatatatiara`. Kedua ejaan itu
 * ada di dalam satu berkas laporan yang sama, dan tanpa membuang awalan `PT`
 * serta akhiran badan hukum, satu pemegang pecah menjadi dua rantai.
 */
export function normalkanNama(nama: string): string {
  let kunci = nama
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[^a-z0-9]/g, '');
  if (kunci.startsWith('pt')) kunci = kunci.slice(2);
  for (const akhiran of AKHIRAN_BADAN_HUKUM) {
    if (kunci.endsWith(akhiran) && kunci.length > akhiran.length) {
      kunci = kunci.slice(0, -akhiran.length);
      break;
    }
  }
  return kunci;
}

/**
 * R22 — satu pemegang ditulis dengan lebih dari satu ejaan.
 *
 * Dijalankan **di dalam** laporan dan antara laporan dan potret kepemilikan,
 * bukan hanya menyilang keduanya. Keparahan **peringatan**: ejaan berbeda
 * bukan kesalahan angka, tetapi ia memecah rantai kalau dibiarkan.
 *
 * Urutan penting: aturan ini harus jalan **sesudah** R12. Menormalkan nama
 * tanpa memperbaiki urutan lebih dulu menaikkan putus rantai R14 dari 26 ke 27.
 */
export function r22NamaPemegang(konteks: KonteksGudang): HasilAturan {
  const judul = 'Ejaan nama pemegang saham';
  const satuan = 'nama pemegang';
  const sumberNama: Array<{ nama: string; asal: string }> = [
    ...urut(konteks.laporan).map((l) => ({ nama: l.pemegang, asal: 'laporan' })),
    ...konteks.data.pemegang.map((p) => ({ nama: p.nama, asal: 'potret kepemilikan' })),
  ];
  if (sumberNama.length === 0) {
    return lewat('R22', judul, 'Tidak ada nama pemegang saham untuk dibandingkan.', satuan);
  }

  const kelompok = new Map<string, Map<string, Set<string>>>();
  for (const { nama, asal } of sumberNama) {
    const kunci = normalkanNama(nama);
    if (kunci === '') continue;
    let ejaan = kelompok.get(kunci);
    if (ejaan === undefined) {
      ejaan = new Map();
      kelompok.set(kunci, ejaan);
    }
    const asalnya = ejaan.get(nama);
    if (asalnya === undefined) ejaan.set(nama, new Set([asal]));
    else asalnya.add(asal);
  }

  const temuan: Temuan[] = [];
  let diperiksa = 0;
  let merah = 0;
  for (const kunci of [...kelompok.keys()].sort()) {
    const ejaan = kelompok.get(kunci);
    if (ejaan === undefined) continue;
    const nama = [...ejaan.keys()].sort();
    diperiksa += nama.length;
    if (nama.length < 2) continue;
    merah += nama.length;
    const asal = [...new Set([...ejaan.values()].flatMap((a) => [...a]))].sort();
    temuan.push({
      temuan_id: `R22-${kunci}`,
      aturan: 'R22',
      keparahan: 'peringatan',
      ringkasan:
        `Satu pemegang saham ditulis dengan ${String(nama.length)} ejaan berbeda: ` +
        `${nama.map((n) => `"${n}"`).join(', ')}. Tanpa disatukan, rantainya terbaca sebagai ` +
        `${String(nama.length)} pemegang yang berbeda.`,
      angka: [{ label: 'ejaan berbeda', nilai: nama.length, satuan: 'ejaan' }],
      fakta_terkait: [],
      rujukan: asal.map((a) => `sumber nama: ${a}`),
    });
  }

  return hasil('R22', judul, temuan, hitung(satuan, { diperiksa, merah }));
}

// --- R25 kelengkapan halaman + parameter permintaan --------------------------

/**
 * R25 — apakah halaman laporan satu emiten terbukti habis?
 *
 * Nilainya ada pada nol merahnya: bukti negatif ("emiten ini tidak punya
 * laporan sama sekali") hanya sah kalau halamannya terbukti habis. Dua cacat
 * membuatnya tidak bisa dipakai sebagaimana ditulis semula:
 *
 * 1. Kelengkapan adalah sifat sebuah **permintaan**, bukan sifat sebuah
 *    emiten. Satu berkas bisa `has_next` false untuk kueri seluruh bursa dan
 *    tidak mengatakan apa pun tentang emiten mana pun.
 * 2. Respons kosong **tidak memuat simbolnya**. Dua berkas kosong dari emiten
 *    berbeda identik byte per byte; satu-satunya pembedanya adalah nama
 *    berkas, yang bukan data.
 *
 * Karena gudang ini **tidak menyimpan parameter permintaan**, kelengkapan per
 * (emiten x rentang) tidak bisa dibuktikan, dan jawabannya `TIDAK_LENGKAP` —
 * bukan hijau. Yang tetap bisa diputuskan dari isi saja: halaman yang
 * `has_next`-nya true dan sambungannya tidak ada di gudang berarti baris yang
 * hilang, dan itu KONFLIK.
 */
export function r25KelengkapanHalaman(konteks: KonteksGudang): HasilAturan {
  const judul = 'Kelengkapan halaman laporan';
  const satuan = 'emiten';
  const berkas = konteks.data.berkas_laporan;
  if (berkas.length === 0) {
    return lewat(
      'R25',
      judul,
      'Tidak ada berkas respons laporan yang bisa dialamatkan ke emiten ini.',
      satuan,
    );
  }

  // Sambungan halaman hanya bisa dipastikan di dalam satu kueri, dan satu-satunya
  // penanda kueri yang ada di isi berkas adalah `total_count`-nya.
  const adaSambungan = (total: number, offset: number): boolean =>
    berkas.some((b) => b.paginasi.total_count === total && b.paginasi.offset === offset);

  const menggantung = berkas.filter(
    (b) => b.paginasi.has_next && !adaSambungan(b.paginasi.total_count, b.paginasi.offset + b.baris),
  );

  const temuan: Temuan[] = [];
  if (menggantung.length > 0) {
    const contoh = menggantung[0];
    temuan.push({
      temuan_id: `R25-${konteks.simbol}`,
      aturan: 'R25',
      ringkasan:
        `${String(menggantung.length)} berkas laporan ${konteks.simbol} menyatakan masih ada ` +
        `halaman berikutnya, tetapi halaman itu tidak ada di gudang. Daftar laporannya belum utuh, ` +
        `jadi "tidak ada laporan lain" tidak boleh disimpulkan.`,
      angka: [
        { label: 'berkas yang menggantung', nilai: menggantung.length, satuan: 'berkas' },
        { label: 'baris yang dijanjikan', nilai: contoh?.paginasi.total_count ?? 0, satuan: 'baris' },
        { label: 'baris yang ada di berkas itu', nilai: contoh?.baris ?? 0, satuan: 'baris' },
      ],
      fakta_terkait: [],
      rujukan: menggantung.map((b) => b.berkas),
    });
    return hasil('R25', judul, temuan, hitung(satuan, { diperiksa: 1, merah: 1 }));
  }

  temuan.push({
    temuan_id: `R25-parameter-${konteks.simbol}`,
    aturan: 'R25',
    keparahan: 'catatan',
    ringkasan:
      `Halaman laporan ${konteks.simbol} tidak menggantung, tetapi parameter permintaannya tidak ` +
      `tersimpan di gudang, jadi tidak bisa dibuktikan bahwa berkas-berkas ini benar-benar ` +
      `menanyakan seluruh rentang untuk emiten ini. Kelengkapannya tidak diketahui.`,
    angka: [
      { label: 'berkas laporan', nilai: berkas.length, satuan: 'berkas' },
      {
        label: 'baris yang terbaca',
        nilai: berkas.reduce((j, b) => j + b.baris, 0),
        satuan: 'baris',
      },
      {
        label: 'respons kosong yang tidak bisa dialamatkan ke emiten mana pun',
        nilai: konteks.berkas_kosong.length,
        satuan: 'berkas',
      },
    ],
    fakta_terkait: [],
    rujukan: [...berkas.map((b) => b.berkas), ...konteks.berkas_kosong],
  });

  return hasil('R25', judul, temuan, hitung(satuan, { diperiksa: 1, merah: 0, tidak_lengkap: 1 }));
}

// --- R33 jumlah saham tersirat goyah -----------------------------------------

/**
 * Fraksi harga bursa (tick) untuk satu tingkat harga.
 *
 * Dipakai R33: ambang 2% terlalu rapat untuk saham berharga rendah. Satu tick
 * dari Rp50 adalah 2,00% — satu gerakan harga terkecil yang mungkin sudah
 * menyentuh ambangnya, sehingga setiap hari akan merah tanpa ada yang salah.
 */
export function fraksiHarga(harga: number): number {
  if (harga < 200) return 1;
  if (harga < 500) return 2;
  if (harga < 2000) return 5;
  if (harga < 5000) return 10;
  return 25;
}

/** Ambang dasar R33: dua persen, ditulis sebagai pecahan supaya tetap eksak. */
export const AMBANG_R33 = { pembilang: 2, penyebut: 100 } as const;

/**
 * Ambang goyah untuk satu tingkat harga, sebagai pecahan eksak:
 * `max(2%, 2 x fraksi harga / harga)`.
 */
export function ambangGoyah(harga: number): { pembilang: number; penyebut: number } {
  const tick = fraksiHarga(harga);
  // Bandingkan 2/100 dengan 2*tick/harga tanpa membaginya.
  const duaPersenLebihBesar = AMBANG_R33.pembilang * harga >= 2 * tick * AMBANG_R33.penyebut;
  return duaPersenLebihBesar
    ? { pembilang: AMBANG_R33.pembilang, penyebut: AMBANG_R33.penyebut }
    : { pembilang: 2 * tick, penyebut: harga };
}

/**
 * Apakah perubahan dari `sebelum` ke `sesudah` mencapai ambangnya?
 *
 * Dibandingkan sebagai bilangan bulat besar dengan `>=` yang eksplisit:
 * perubahan **tepat** 2,0% adalah merah karena ambangnya memang `>=`, bukan
 * karena pembagian pecahan kebetulan jatuh di sisi itu (INV-D).
 */
export function mencapaiAmbang(
  sebelum: number,
  sesudah: number,
  ambang: { pembilang: number; penyebut: number },
): boolean {
  if (sebelum <= 0) return false;
  const selisih = BigInt(Math.abs(Math.round(sesudah) - Math.round(sebelum)));
  return selisih * BigInt(ambang.penyebut) >= BigInt(ambang.pembilang) * BigInt(Math.round(sebelum));
}

/** Jarak hari kalender antara dua tanggal ISO, tanpa tanda. */
function jarakHari(a: string, b: string): number {
  return Math.abs(selisihHari(a, b));
}

/**
 * R33 — jumlah saham tersirat (`nilai pasar / harga tutup`) melompat dari satu
 * hari bursa ke hari bursa berikutnya.
 *
 * Aturan kerja yang mengikat: jangan memakai `nilai pasar / harga tutup`
 * sebagai penyebut di dekat aksi korporasi. Temuan menyebut aksi korporasi
 * yang tercatat dalam 21 hari kalender di sekitar lompatannya **sebagai
 * fakta**, bukan sebagai sebab — data tidak memuat sebab.
 */
export function r33SahamTersiratGoyah(konteks: KonteksGudang): HasilAturan {
  const judul = 'Kestabilan jumlah saham tersirat';
  const satuan = 'pasang hari';
  if (konteks.harga.length < 2) {
    return lewat('R33', judul, 'Kurang dari dua hari harga, tidak ada pasangan untuk dibandingkan.', satuan);
  }

  const aksi = [
    ...konteks.data.stock_split.map((s) => ({ tanggal: s.tanggal, apa: `stock split rasio ${String(s.rasio)}` })),
    ...konteks.data.right_issue.map((r) => ({ tanggal: r.ex_date, apa: 'rights issue' })),
    ...konteks.data.bonus.map((b) => ({ tanggal: b.ex_date, apa: 'saham bonus' })),
  ].sort((a, b) => a.tanggal.localeCompare(b.tanggal) || a.apa.localeCompare(b.apa));

  const temuan: Temuan[] = [];
  let diperiksa = 0;
  let merah = 0;
  let tidakLengkap = 0;
  const alasan: string[] = [];

  const baris = [...konteks.harga].sort((a, b) => a.tanggal.localeCompare(b.tanggal));
  for (let i = 1; i < baris.length; i += 1) {
    const kemarin = baris[i - 1];
    const hariIni = baris[i];
    if (kemarin === undefined || hariIni === undefined) continue;
    diperiksa += 1;
    const cacat =
      kemarin.buka_kosong === true ||
      hariIni.buka_kosong === true ||
      kemarin.tutup <= 0 ||
      hariIni.tutup <= 0 ||
      kemarin.nilai_pasar <= 0 ||
      hariIni.nilai_pasar <= 0;
    if (cacat) {
      tidakLengkap += 1;
      alasan.push('Salah satu baris harga pasangan ini cacat (harga tutup, nilai pasar, atau open kosong).');
      continue;
    }
    const sebelum = Math.round(kemarin.nilai_pasar / kemarin.tutup);
    const sesudah = Math.round(hariIni.nilai_pasar / hariIni.tutup);
    const ambang = ambangGoyah(hariIni.tutup);
    if (!mencapaiAmbang(sebelum, sesudah, ambang)) continue;

    merah += 1;
    const dekat = aksi.filter((a) => jarakHari(a.tanggal, hariIni.tanggal) <= 21);
    const keterangan =
      dekat.length === 0
        ? ' Tidak ada aksi korporasi tercatat dalam 21 hari di sekitarnya; penyebabnya tidak diketahui.'
        : ` Dalam 21 hari di sekitarnya tercatat ${dekat.map((a) => `${a.apa} ${a.tanggal}`).join(', ')}.`;
    const persen = ((Math.abs(sesudah - sebelum) / sebelum) * 100).toFixed(2);
    temuan.push({
      temuan_id: `R33-${konteks.simbol}-${hariIni.tanggal}`,
      aturan: 'R33',
      ringkasan:
        `Jumlah saham tersirat ${konteks.simbol} berubah ${persen}% dalam satu hari bursa: ` +
        `${angka(sebelum)} lembar pada ${kemarin.tanggal} menjadi ${angka(sesudah)} lembar pada ` +
        `${hariIni.tanggal}.${keterangan}`,
      angka: [
        { label: 'saham tersirat hari sebelumnya', nilai: sebelum, satuan: 'lembar' },
        { label: 'saham tersirat hari itu', nilai: sesudah, satuan: 'lembar' },
        { label: 'perubahan', nilai: Number(persen), satuan: 'persen' },
        {
          label: 'ambang yang berlaku',
          nilai: Number(((ambang.pembilang / ambang.penyebut) * 100).toFixed(2)),
          satuan: 'persen',
        },
      ],
      fakta_terkait: [],
      rujukan: [`harga harian ${kemarin.tanggal}`, `harga harian ${hariIni.tanggal}`],
    });
  }

  return hasil(
    'R33',
    judul,
    temuan,
    hitung(satuan, { diperiksa, merah, tidak_lengkap: tidakLengkap, alasan_dilewati: alasan }),
  );
}

// --- R15 aritmetika per laporan, termasuk `others` ---------------------------

/**
 * R15 — aritmetika di dalam satu laporan.
 *
 * Bedanya dengan R1 generasi pertama: R1 memperlakukan **apa pun yang bukan
 * `buy` sebagai jual**, sehingga 26 laporan ber-`transaction_type` `others`
 * ikut dihitung sebagai penjualan — dan uji lawan membuktikan laporan rusak
 * yang jenisnya diganti `others` **lolos hijau**. Untuk `others`, yang
 * diperiksa adalah `|sesudah - sebelum| == jumlah`, tanpa arah.
 *
 * Di himpunan V2, R15 menggantikan R1 supaya satu cacat data tidak melahirkan
 * dua temuan berkeparahan konflik.
 */
export function r15Aritmetika(konteks: KonteksVerifikasi): HasilAturan {
  const judul = 'Aritmetika per laporan, termasuk transaksi jenis lain';
  const satuan = 'laporan';
  if (konteks.laporan.length === 0) {
    return lewat('R15', judul, 'Tidak ada laporan untuk diperiksa.', satuan);
  }
  const temuan: Temuan[] = [];
  let merah = 0;

  for (const l of urut(konteks.laporan)) {
    const jenisMentah = l.jenis_mentah ?? (l.jenis === 'beli' ? 'buy' : 'sell');
    const selisih = l.sesudah - l.sebelum;
    let cocok: boolean;
    let harusnya: string;
    if (jenisMentah === 'buy') {
      cocok = selisih === l.jumlah;
      harusnya = `${angka(l.sebelum)} + ${angka(l.jumlah)} = ${angka(l.sebelum + l.jumlah)}`;
    } else if (jenisMentah === 'sell') {
      cocok = selisih === -l.jumlah;
      harusnya = `${angka(l.sebelum)} - ${angka(l.jumlah)} = ${angka(l.sebelum - l.jumlah)}`;
    } else {
      // `others`: arahnya tidak diketahui, besarannya tetap harus cocok.
      cocok = Math.abs(selisih) === l.jumlah;
      harusnya = `selisih ${angka(Math.abs(selisih))} lembar harus sama dengan ${angka(l.jumlah)}`;
    }
    if (cocok) continue;

    merah += 1;
    temuan.push({
      temuan_id: `R15-${l.laporan_id}`,
      aturan: 'R15',
      ringkasan:
        `Laporan ${l.dilaporkan_pada} (jenis "${jenisMentah}") tidak konsisten sendiri: ` +
        `${harusnya}, tetapi laporan menulis ${angka(l.sesudah)} lembar sesudah transaksi.`,
      angka: [
        { label: 'kepemilikan sebelum', nilai: l.sebelum, satuan: 'lembar' },
        { label: 'jumlah transaksi', nilai: l.jumlah, satuan: 'lembar' },
        { label: 'kepemilikan sesudah menurut laporan', nilai: l.sesudah, satuan: 'lembar' },
        { label: 'selisih yang tercatat', nilai: selisih, satuan: 'lembar' },
      ],
      fakta_terkait: [],
      rujukan: [`${l.dilaporkan_pada} · ${l.berkas}`],
    });
  }

  return hasil('R15', judul, temuan, hitung(satuan, { diperiksa: konteks.laporan.length, merah }));
}

// --- R11a penyebut dua sisi satu laporan -------------------------------------

/**
 * R11a — dua sisi satu laporan harus bisa memakai penyebut yang sama.
 *
 * Tiap sisi memberi selang penyebut dari ketelitian **medan** (dua desimal,
 * ditetapkan, bukan diturunkan dari nilai). Kalau kedua selang bersinggungan,
 * ada satu jumlah saham beredar yang menjelaskan keduanya: hijau. Kalau tidak,
 * kedua persen itu tidak mungkin berasal dari penyebut yang sama: KONFLIK.
 *
 * Kasus tepi yang ditetapkan di sini, karena definisi semula membiarkannya:
 * **satu sisi nol atau kosong** adalah `TIDAK_LENGKAP`, bukan dilewati
 * diam-diam. Sembilan laporan di cache uji lawan berbentuk begitu.
 */
export function r11aPenyebutDuaSisi(konteks: KonteksVerifikasi): HasilAturan {
  const judul = 'Penyebut dua sisi satu laporan';
  const satuan = 'laporan';
  if (konteks.laporan.length === 0) {
    return lewat('R11a', judul, 'Tidak ada laporan untuk diperiksa.', satuan);
  }
  const temuan: Temuan[] = [];
  let merah = 0;
  let tidakLengkap = 0;
  const alasan: string[] = [];

  for (const l of urut(konteks.laporan)) {
    const kosongSebelum = !Number.isFinite(l.persen_sebelum) || l.persen_sebelum <= 0;
    const kosongSesudah = !Number.isFinite(l.persen_sesudah) || l.persen_sesudah <= 0;
    if (kosongSebelum && kosongSesudah) {
      tidakLengkap += 1;
      alasan.push('Kedua medan persen nol atau kosong.');
      continue;
    }
    if (kosongSebelum || kosongSesudah) {
      tidakLengkap += 1;
      alasan.push('Tepat satu medan persen nol atau kosong, jadi kedua sisi tidak bisa diadu.');
      continue;
    }
    const a = selangPenyebut(l.sebelum, l.persen_sebelum, DESIMAL_PERSEN);
    const b = selangPenyebut(l.sesudah, l.persen_sesudah, DESIMAL_PERSEN);
    if (a === null || b === null) {
      tidakLengkap += 1;
      alasan.push('Salah satu sisi tidak memberi selang penyebut yang bisa dihitung.');
      continue;
    }
    if (a.bawah <= b.atas && b.bawah <= a.atas) continue;

    merah += 1;
    temuan.push({
      temuan_id: `R11a-${l.laporan_id}`,
      aturan: 'R11a',
      ringkasan:
        `Laporan ${l.dilaporkan_pada} menulis ${String(l.persen_sebelum)}% sebelum dan ` +
        `${String(l.persen_sesudah)}% sesudah, tetapi tidak ada satu jumlah saham beredar pun yang ` +
        `menjelaskan keduanya: sisi sebelum menuntut ${angka(Math.round(a.bawah))}-${angka(Math.round(a.atas))} ` +
        `lembar, sisi sesudah menuntut ${angka(Math.round(b.bawah))}-${angka(Math.round(b.atas))} lembar.`,
      angka: [
        { label: 'persen sebelum', nilai: l.persen_sebelum, satuan: 'persen' },
        { label: 'persen sesudah', nilai: l.persen_sesudah, satuan: 'persen' },
        { label: 'penyebut terkecil dari sisi sebelum', nilai: Math.round(a.bawah), satuan: 'lembar' },
        { label: 'penyebut terkecil dari sisi sesudah', nilai: Math.round(b.bawah), satuan: 'lembar' },
        // Ketelitian medan ditetapkan dua desimal. Kalau salah satu sisi
        // ditulis dengan desimal lebih sedikit, selangnya menjadi lebih sempit
        // daripada yang dijamin datanya - pembaca perlu melihat itu.
        {
          label: 'desimal paling sedikit yang tertulis di kedua sisi',
          nilai: Math.min(desimalTertulis(l.persen_sebelum), desimalTertulis(l.persen_sesudah)),
          satuan: 'angka desimal',
        },
      ],
      fakta_terkait: [],
      rujukan: [`${l.dilaporkan_pada} · ${l.berkas}`],
    });
  }

  return hasil(
    'R11a',
    judul,
    temuan,
    hitung(satuan, {
      diperiksa: konteks.laporan.length,
      merah,
      tidak_lengkap: tidakLengkap,
      alasan_dilewati: alasan,
    }),
  );
}

/** Berapa angka desimal yang benar-benar tertulis di sebuah nilai persen. */
export function desimalTertulis(nilai: number): number {
  const pecahan = String(nilai).split('.')[1];
  return pecahan === undefined ? 0 : pecahan.length;
}

// --- R13 lembar lebih besar daripada modal -----------------------------------

/**
 * Batas R13: kepemilikan boleh melewati 100% sedikit tanpa berarti salah.
 *
 * Batas `>` telanjang membuat kepemilikan tepat 100% lolos dan 100,000001%
 * merah — terlalu tajam untuk data yang penyebutnya sendiri berupa perkiraan,
 * dan saham treasuri membuat lebih dari 100% bisa sah. Ambangnya 101%,
 * dibandingkan sebagai bilangan bulat: merah kalau `100 x lembar > 101 x
 * beredar`.
 */
export function melewatiModal(lembar: number, beredar: number): boolean {
  if (beredar <= 0) return false;
  return BigInt(100) * BigInt(Math.round(lembar)) > BigInt(101) * BigInt(Math.round(beredar));
}

/**
 * R13 — jumlah lembar yang dilaporkan lebih besar daripada seluruh saham beredar.
 *
 * Tanpa penyebut, jawabannya `TIDAK_LENGKAP`, **bukan hijau**. Melewati emiten
 * diam-diam lebih berbahaya daripada merah palsu: mesin akan melaporkan "R13
 * hijau" untuk emiten yang tidak pernah diperiksa sama sekali.
 */
export function r13LembarLebihBesarDariModal(konteks: KonteksVerifikasi): HasilAturan {
  const judul = 'Lembar dilaporkan melebihi saham beredar';
  const satuan = 'medan kepemilikan';
  if (konteks.laporan.length === 0) {
    return lewat('R13', judul, 'Tidak ada laporan untuk diperiksa.', satuan);
  }
  const cari = konteks.sahamBeredarPada;
  if (cari === undefined) {
    return lewat(
      'R13',
      judul,
      'Konteks ini tidak menyediakan jumlah saham beredar per tanggal.',
      satuan,
      konteks.laporan.length * 3,
    );
  }

  const temuan: Temuan[] = [];
  let diperiksa = 0;
  let merah = 0;
  let tidakLengkap = 0;
  const alasan: string[] = [];

  for (const l of urut(konteks.laporan)) {
    const titik = cari(l.dilaporkan_pada.slice(0, 10));
    const medan: Array<[string, number]> = [
      ['kepemilikan sebelum', l.sebelum],
      ['kepemilikan sesudah', l.sesudah],
      ['jumlah transaksi', l.jumlah],
    ];
    for (const [nama, lembar] of medan) {
      diperiksa += 1;
      if (titik === null) {
        tidakLengkap += 1;
        alasan.push('Tidak ada titik jumlah saham beredar yang berlaku pada tanggal laporan.');
        continue;
      }
      if (!melewatiModal(lembar, titik.lembar)) continue;
      merah += 1;
      const persen = ((lembar / titik.lembar) * 100).toFixed(1);
      temuan.push({
        temuan_id: `R13-${l.laporan_id}-${nama.replace(/\s+/g, '-')}`,
        aturan: 'R13',
        ringkasan:
          `Laporan ${l.dilaporkan_pada} menulis ${nama} ${angka(lembar)} lembar, yaitu ${persen}% ` +
          `dari ${angka(titik.lembar)} saham beredar yang berlaku ${titik.pada}. Satu pemegang tidak ` +
          `bisa memegang lebih banyak lembar daripada yang diterbitkan.`,
        angka: [
          { label: nama, nilai: lembar, satuan: 'lembar' },
          { label: 'saham beredar yang dipakai', nilai: titik.lembar, satuan: 'lembar' },
          { label: 'bagian dari saham beredar', nilai: Number(persen), satuan: 'persen' },
        ],
        fakta_terkait: [],
        rujukan: [`${l.dilaporkan_pada} · ${l.berkas}`, `penyebut: ${titik.sumber}`],
      });
    }
  }

  return hasil(
    'R13',
    judul,
    temuan,
    hitung(satuan, { diperiksa, merah, tidak_lengkap: tidakLengkap, alasan_dilewati: alasan }),
  );
}

// --- R14 dan R16: rantai putus dan jam terbit --------------------------------

export interface PasanganRantai {
  pemegang: string;
  sebelumnya: Laporan;
  sekarang: Laporan;
  /** `sekarang.sebelum - sebelumnya.sesudah`; nol berarti rantainya nyambung. */
  selisih: number;
  /**
   * Laporan yang terbit lebih dulu sudah memuat keadaan yang baru dihasilkan
   * laporan yang terbit kemudian (R16).
   *
   * Dua bentuknya: saldo awal keduanya sama (laporan diterbitkan ulang), atau
   * saldo akhir laporan berikutnya sama dengan saldo awal laporan sebelumnya —
   * yang berarti urutan terbitnya terbalik terhadap urutan kejadiannya.
   */
  jam_bertabrakan: boolean;
}

/**
 * Susun rantai tiap pemegang dan kembalikan pasangan berurutannya.
 *
 * Dua keputusan yang menentukan hasilnya, keduanya dari aturan gerbang:
 * urutannya memakai **kunci R12** (tanggal nama berkas), dan pemegangnya
 * disatukan dengan **normalisasi R22** (awalan `PT`, akhiran badan hukum).
 * Menormalkan nama tanpa memperbaiki urutan lebih dulu menaikkan putus rantai
 * dari 26 ke 27; keduanya harus jalan, dalam urutan itu.
 */
export function pasanganRantai(laporan: Laporan[]): PasanganRantai[] {
  const perPemegang = new Map<string, Laporan[]>();
  for (const l of urutR12(laporan)) {
    const kunci = normalkanNama(l.pemegang);
    const daftar = perPemegang.get(kunci);
    if (daftar === undefined) perPemegang.set(kunci, [l]);
    else daftar.push(l);
  }

  const pasangan: PasanganRantai[] = [];
  for (const kunci of [...perPemegang.keys()].sort()) {
    const daftar = perPemegang.get(kunci) ?? [];
    for (let i = 1; i < daftar.length; i += 1) {
      const sebelumnya = daftar[i - 1];
      const sekarang = daftar[i];
      if (sebelumnya === undefined || sekarang === undefined) continue;
      pasangan.push({
        pemegang: sekarang.pemegang,
        sebelumnya,
        sekarang,
        selisih: sekarang.sebelum - sebelumnya.sesudah,
        jam_bertabrakan:
          sekarang.sebelum === sebelumnya.sebelum ||
          sekarang.sesudah === sebelumnya.sebelum,
      });
    }
  }
  return pasangan;
}

/**
 * R14 — rantai kepemilikan seorang pemegang putus.
 *
 * Saldo akhir satu laporan harus sama dengan saldo awal laporan berikutnya.
 * Kalau tidak, ada lembar yang berpindah tanpa laporan.
 *
 * Kalau pasangan yang sama juga melanggar R16 (jam terbitnya mundur), temuannya
 * **digabung di sini**, dengan dua sebab dalam satu kalimat: satu cacat data
 * tidak boleh tampil sebagai dua pelanggaran.
 */
export function r14RantaiPutus(konteks: KonteksGudang): HasilAturan {
  const judul = 'Rantai kepemilikan putus';
  const satuan = 'sambungan';
  if (konteks.laporan.length < 2) {
    return lewat('R14', judul, 'Rantai kurang dari dua laporan, tidak ada sambungan untuk diperiksa.', satuan);
  }
  const gerbang = r25KelengkapanHalaman(konteks);
  if (gerbang.hitungan.merah > 0) {
    return lewat(
      'R14',
      judul,
      'R25 menemukan halaman laporan yang menggantung, jadi putus rantai tidak bisa dibedakan dari laporan yang belum ditarik.',
      satuan,
      Math.max(0, konteks.laporan.length - 1),
    );
  }

  const pasangan = pasanganRantai(konteks.laporan);
  const temuan: Temuan[] = [];
  let merah = 0;

  for (const p of pasangan) {
    if (p.selisih === 0) continue;
    merah += 1;
    const arah = p.selisih > 0 ? 'bertambah' : 'berkurang';
    const tambahan = p.jam_bertabrakan
      ? ` Selain itu laporan pukul ${jamSaja(p.sebelumnya.dilaporkan_pada)} sudah memuat keadaan yang ` +
        `baru dihasilkan laporan pukul ${jamSaja(p.sekarang.dilaporkan_pada)}, jadi urutan terbitnya ` +
        `terbalik terhadap urutan kejadiannya.`
      : '';
    temuan.push({
      temuan_id: `R14-${p.sebelumnya.laporan_id}-${p.sekarang.laporan_id}`,
      aturan: 'R14',
      ringkasan:
        `Rantai ${p.pemegang} putus: laporan ${p.sebelumnya.dilaporkan_pada} berakhir di ` +
        `${angka(p.sebelumnya.sesudah)} lembar, tetapi laporan berikutnya ${p.sekarang.dilaporkan_pada} ` +
        `mulai dari ${angka(p.sekarang.sebelum)} lembar. Ada ${angka(Math.abs(p.selisih))} lembar yang ` +
        `${arah} tanpa laporan.${tambahan}`,
      angka: [
        { label: 'lompatan', nilai: p.selisih, satuan: 'lembar' },
        { label: 'saldo akhir laporan sebelumnya', nilai: p.sebelumnya.sesudah, satuan: 'lembar' },
        { label: 'saldo awal laporan berikutnya', nilai: p.sekarang.sebelum, satuan: 'lembar' },
      ],
      fakta_terkait: [],
      rujukan: [
        `${p.sebelumnya.dilaporkan_pada} · ${p.sebelumnya.berkas}`,
        `${p.sekarang.dilaporkan_pada} · ${p.sekarang.berkas}`,
      ],
    });
  }

  return hasil('R14', judul, temuan, hitung(satuan, { diperiksa: pasangan.length, merah }));
}

function jamSaja(waktu: string): string {
  return waktu.slice(11, 16);
}

/**
 * R16 — jam terbit tidak searah dengan rantai saldo.
 *
 * Laporan yang terbit lebih dulu sudah memuat keadaan yang baru dihasilkan
 * laporan yang terbit kemudian. Dua bentuknya: saldo awal dua laporan
 * berurutan sama persis, atau saldo akhir laporan berikutnya sama dengan saldo
 * awal laporan sebelumnya.
 *
 * Kenapa ini penting bagi pemain: kalau jam terbit dipakai memutuskan "apa
 * yang sudah bisa dibaca pada tanggal T", rantai seperti ini membuat
 * jawabannya tidak tunggal.
 *
 * Keparahan **peringatan**: dua laporan yang benar-benar melaporkan transaksi
 * berbeda pada hari yang sama bisa punya saldo awal sama kalau salah satunya
 * dibatalkan dan diterbitkan ulang. Karena itu temuannya wajib menyebut
 * **jam**, bukan hanya harinya. Pasangan yang sudah dilaporkan R14 tidak
 * diulang; jumlahnya tetap dihitung dan satu catatan menyebut berapa banyak.
 */
export function r16JamTerbit(konteks: KonteksGudang): HasilAturan {
  const judul = 'Jam terbit laporan terhadap urutan rantai';
  const satuan = 'sambungan';
  if (konteks.laporan.length < 2) {
    return lewat('R16', judul, 'Rantai kurang dari dua laporan, tidak ada sambungan untuk diperiksa.', satuan);
  }

  const pasangan = pasanganRantai(konteks.laporan);
  const temuan: Temuan[] = [];
  let merah = 0;
  let digabung = 0;

  for (const p of pasangan) {
    if (!p.jam_bertabrakan) continue;
    merah += 1;
    if (p.selisih !== 0) {
      digabung += 1;
      continue;
    }
    temuan.push({
      temuan_id: `R16-${p.sebelumnya.laporan_id}-${p.sekarang.laporan_id}`,
      aturan: 'R16',
      keparahan: 'peringatan',
      ringkasan:
        `Laporan ${p.pemegang} pukul ${jamSaja(p.sebelumnya.dilaporkan_pada)} pada ` +
        `${p.sebelumnya.dilaporkan_pada.slice(0, 10)} sudah memuat saldo ` +
        `${angka(p.sebelumnya.sebelum)} lembar, yang baru dihasilkan laporan pukul ` +
        `${jamSaja(p.sekarang.dilaporkan_pada)}. Urutan terbitnya terbalik terhadap urutan ` +
        `kejadiannya, jadi "apa yang sudah bisa dibaca hari itu" tidak punya satu jawaban.`,
      angka: [
        { label: 'saldo awal laporan yang terbit lebih dulu', nilai: p.sebelumnya.sebelum, satuan: 'lembar' },
        { label: 'saldo awal laporan berikutnya', nilai: p.sekarang.sebelum, satuan: 'lembar' },
        { label: 'saldo akhir laporan berikutnya', nilai: p.sekarang.sesudah, satuan: 'lembar' },
      ],
      fakta_terkait: [],
      rujukan: [
        `${p.sebelumnya.dilaporkan_pada} · ${p.sebelumnya.berkas}`,
        `${p.sekarang.dilaporkan_pada} · ${p.sekarang.berkas}`,
      ],
    });
  }

  if (digabung > 0) {
    temuan.push({
      temuan_id: `R16-digabung-${konteks.simbol}`,
      aturan: 'R16',
      keparahan: 'catatan',
      ringkasan:
        `${String(digabung)} sambungan yang jam terbitnya tidak searah dengan rantai juga putus ` +
        `rantainya, dan sudah dilaporkan sebagai satu temuan R14. Satu cacat data tidak dihitung ` +
        `dua kali.`,
      angka: [{ label: 'sambungan yang digabung ke R14', nilai: digabung, satuan: 'sambungan' }],
      fakta_terkait: [],
      rujukan: [],
    });
  }

  return hasil('R16', judul, temuan, hitung(satuan, { diperiksa: pasangan.length, merah }));
}

// --- R17B harga laporan terhadap rentang hari transaksinya -------------------

/**
 * Baris harga yang **tidak boleh** dipakai sebagai rentang.
 *
 * Satu baris ber-`low` 0 di dalam sebuah jendela membuat `min(low)` nol dan
 * aturan rentang harga tidak bisa berbunyi lagi: uji sabotase membuktikan
 * harga Rp33 menjadi hijau palsu karenanya. Baris begini dibuang **lebih
 * dulu**, bukan ikut dihitung lalu dikoreksi.
 */
export function barisHargaCacat(h: BarisHarga): boolean {
  return h.buka_kosong === true || h.tertinggi <= 0 || h.terendah <= 0;
}

/**
 * R17B — harga yang ditulis di laporan terhadap rentang harga **pada tanggal
 * transaksinya sendiri**.
 *
 * Menggantikan R17 usulan, yang memakai jendela 40 hari bursa dengan premis
 * "tanggal transaksi tidak tersedia". Premis itu salah: setiap laporan punya
 * `price_transaction` bertanggal. Jendela 40 hari melewatkan 48 laporan yang
 * melanggar rentang hari transaksinya sendiri, dan dua merahnya terbukti
 * positif palsu.
 *
 * Medan agregat `price` **tidak dipakai sama sekali**: ia rata-rata tertimbang
 * yang menghitung harga kosong sebagai Rp0.
 *
 * Putusan: KONFLIK, kecuali laporan yang bertanda repo (harga repo memang boleh
 * di luar pasar reguler) -> TIDAK_LENGKAP. Tanggal transaksi yang tidak ada di
 * deret harga juga TIDAK_LENGKAP, **bukan** dibandingkan ke jendela lain.
 */
export function r17bHargaHariTransaksi(konteks: KonteksVerifikasi): HasilAturan {
  const judul = 'Harga laporan terhadap rentang harga hari transaksinya';
  const satuan = 'butir transaksi';
  const butirSemua = konteks.laporan.reduce((j, l) => j + l.transaksi.length, 0);
  if (butirSemua === 0) {
    return lewat('R17B', judul, 'Tidak ada butir transaksi bertanggal untuk diperiksa.', satuan);
  }
  if (konteks.harga.length === 0) {
    return lewat('R17B', judul, 'Tidak ada data harga harian untuk membandingkan.', satuan, butirSemua);
  }

  const sehat = new Map(
    konteks.harga.filter((h) => !barisHargaCacat(h)).map((h) => [h.tanggal, h]),
  );
  const temuan: Temuan[] = [];
  let diperiksa = 0;
  let merah = 0;
  let tidakLengkap = 0;
  const alasan: string[] = [];

  for (const l of urut(konteks.laporan)) {
    let hargaKosong = 0;
    for (const t of l.transaksi) {
      diperiksa += 1;
      if (t.harga_kosong === true) {
        hargaKosong += 1;
        tidakLengkap += 1;
        alasan.push('Medan harga butir transaksi kosong; nol bukan harganya.');
        continue;
      }
      const bar = sehat.get(t.tanggal);
      if (bar === undefined) {
        tidakLengkap += 1;
        alasan.push('Tanggal transaksi tidak ada di deret harga harian, atau baris harganya cacat.');
        continue;
      }
      if (t.harga >= bar.terendah && t.harga <= bar.tertinggi) continue;

      const repo = konteks.tanda_repo[l.laporan_id] === true;
      if (repo) {
        tidakLengkap += 1;
        alasan.push('Laporan bertanda repurchase agreement; harga repo boleh di luar pasar reguler.');
        continue;
      }
      merah += 1;
      temuan.push({
        temuan_id: `R17B-${l.laporan_id}-${t.tanggal}-${String(t.harga)}`,
        aturan: 'R17B',
        ringkasan:
          `Laporan ${l.dilaporkan_pada} menyebut transaksi ${t.tanggal} pada harga Rp${angka(t.harga)}, ` +
          `padahal harga saham hari itu hanya bergerak Rp${angka(bar.terendah)}-Rp${angka(bar.tertinggi)}.`,
        angka: [
          { label: 'harga menurut laporan', nilai: t.harga, satuan: 'rupiah per lembar' },
          { label: 'harga pasar terendah hari itu', nilai: bar.terendah, satuan: 'rupiah per lembar' },
          { label: 'harga pasar tertinggi hari itu', nilai: bar.tertinggi, satuan: 'rupiah per lembar' },
          { label: 'lembar pada butir ini', nilai: t.jumlah, satuan: 'lembar' },
        ],
        fakta_terkait: [],
        rujukan: [`${l.dilaporkan_pada} · ${l.berkas}`, `harga harian ${t.tanggal}`],
      });
    }

    if (hargaKosong > 0) {
      temuan.push({
        temuan_id: `R17B-agregat-${l.laporan_id}`,
        aturan: 'R17B',
        keparahan: 'catatan',
        ringkasan:
          `Laporan ${l.dilaporkan_pada} punya ${String(hargaKosong)} butir transaksi tanpa harga. ` +
          `Medan harga gabungan laporan ini (Rp${angka(l.harga)}) adalah rata-rata tertimbang yang ` +
          `menghitung butir tanpa harga sebagai Rp0, jadi ia lebih rendah daripada harga transaksi ` +
          `yang sebenarnya dan tidak boleh dipakai sebagai harga.`,
        angka: [
          { label: 'butir tanpa harga', nilai: hargaKosong, satuan: 'butir' },
          { label: 'medan harga gabungan laporan', nilai: l.harga, satuan: 'rupiah per lembar' },
        ],
        fakta_terkait: [],
        rujukan: [`${l.dilaporkan_pada} · ${l.berkas}`],
      });
    }
  }

  return hasil(
    'R17B',
    judul,
    temuan,
    hitung(satuan, { diperiksa, merah, tidak_lengkap: tidakLengkap, alasan_dilewati: alasan }),
  );
}

// --- R18a hari bervolume nol tanpa baris suspensi ----------------------------

/**
 * R18a — hari bursa yang volumenya nol tetapi tidak ada di daftar suspensi.
 *
 * Putusannya **TIDAK_LENGKAP**, bukan KONFLIK, dan itu penting: data suspensi
 * mencatat hari **mulai** berhentinya perdagangan, bukan tiap hari selama
 * berhenti. Menandainya konflik akan menolak ratusan baris harga yang benar.
 *
 * Keterbatasan yang dilaporkan apa adanya: baris suspensi yang punya harga
 * hari itu jauh lebih sedikit daripada seluruh baris suspensi, jadi "nol
 * merah" di arah sebaliknya tidak membawa informasi baru.
 */
export function r18aVolumeNolTanpaSuspensi(konteks: KonteksVerifikasi): HasilAturan {
  const judul = 'Hari bervolume nol tanpa baris suspensi';
  const satuan = 'baris harga bervolume nol';
  if (konteks.harga.length === 0) {
    return lewat('R18a', judul, 'Tidak ada data harga harian untuk diperiksa.', satuan);
  }
  const tanggalSuspensi = new Set(konteks.suspensi.map((s) => s.tanggal));
  const nol = [...konteks.harga]
    .filter((h) => h.volume === 0)
    .sort((a, b) => a.tanggal.localeCompare(b.tanggal));
  const berVolume = konteks.harga.length - nol.length;

  const temuan: Temuan[] = [];
  let tidakLengkap = 0;
  const tanpaSuspensi: string[] = [];
  for (const h of nol) {
    if (tanggalSuspensi.has(h.tanggal)) continue;
    tidakLengkap += 1;
    tanpaSuspensi.push(h.tanggal);
  }

  if (tanpaSuspensi.length > 0) {
    const awal = tanpaSuspensi[0];
    const akhir = tanpaSuspensi[tanpaSuspensi.length - 1];
    temuan.push({
      temuan_id: `R18a-${konteks.simbol}`,
      aturan: 'R18a',
      keparahan: 'catatan',
      ringkasan:
        `${String(tanpaSuspensi.length)} hari bursa ${konteks.simbol} antara ${String(awal)} dan ` +
        `${String(akhir)} tidak mencatat satu lembar pun berpindah tangan, dan tanggal-tanggal itu ` +
        `tidak ada di daftar suspensi. Daftar suspensi hanya mencatat hari mulai berhenti, bukan ` +
        `tiap harinya, jadi tidak bisa ditentukan apakah hari-hari itu memang suspensi.`,
      angka: [
        { label: 'hari bervolume nol tanpa baris suspensi', nilai: tanpaSuspensi.length, satuan: 'hari' },
        { label: 'hari bervolume nol yang ada di daftar suspensi', nilai: nol.length - tanpaSuspensi.length, satuan: 'hari' },
        { label: 'baris suspensi yang kita punya', nilai: konteks.suspensi.length, satuan: 'baris' },
      ],
      fakta_terkait: [],
      rujukan: [`harga harian ${String(awal)}`, `harga harian ${String(akhir)}`],
    });
  }

  return hasil(
    'R18a',
    judul,
    temuan,
    hitung(satuan, {
      diperiksa: nol.length,
      merah: 0,
      tidak_lengkap: tidakLengkap,
      dilewati: berVolume,
      alasan_dilewati: berVolume > 0 ? ['Hari bursa yang volumenya tidak nol; aturan ini tidak berlaku untuknya.'] : [],
    }),
  );
}

// --- R19a / R19b harga datar -------------------------------------------------

/** Hari datar: buka, tertinggi, terendah, dan tutup sama persis. */
export function hariDatar(h: BarisHarga): boolean {
  return (
    !barisHargaCacat(h) &&
    h.buka === h.tertinggi &&
    h.tertinggi === h.terendah &&
    h.terendah === h.tutup
  );
}

/**
 * R19a — hari yang harganya datar **dan** volumenya nol.
 *
 * Nilainya bagi pemain langsung: kunci jawaban beku pernah menulis "harga
 * pasar hari itu tepat Rp490" untuk hari yang volumenya nol. Harga hari itu
 * bukan harga yang disepakati siapa pun; tidak ada satu lembar pun berpindah.
 * Keparahan peringatan.
 */
export function r19aDatarTanpaVolume(konteks: KonteksVerifikasi): HasilAturan {
  const judul = 'Harga datar pada hari tanpa transaksi';
  const satuan = 'hari datar';
  const datar = [...konteks.harga].filter(hariDatar).sort((a, b) => a.tanggal.localeCompare(b.tanggal));
  if (datar.length === 0) {
    return lewat(
      'R19a',
      judul,
      'Tidak ada hari yang harga buka, tertinggi, terendah, dan tutupnya sama.',
      satuan,
      konteks.harga.length,
    );
  }
  const temuan: Temuan[] = [];
  let merah = 0;
  const tanggalNol: string[] = [];
  for (const h of datar) {
    if (h.volume !== 0) continue;
    merah += 1;
    tanggalNol.push(h.tanggal);
  }
  if (tanggalNol.length > 0) {
    const awal = tanggalNol[0];
    const akhir = tanggalNol[tanggalNol.length - 1];
    temuan.push({
      temuan_id: `R19a-${konteks.simbol}`,
      aturan: 'R19a',
      keparahan: 'peringatan',
      ringkasan:
        `${String(tanggalNol.length)} hari bursa ${konteks.simbol} antara ${String(awal)} dan ` +
        `${String(akhir)} mencatat satu harga saja untuk buka, tertinggi, terendah, dan tutup, ` +
        `sementara volumenya nol. Angka itu bukan harga yang disepakati siapa pun hari itu.`,
      angka: [
        { label: 'hari datar bervolume nol', nilai: tanggalNol.length, satuan: 'hari' },
        { label: 'hari datar seluruhnya', nilai: datar.length, satuan: 'hari' },
      ],
      fakta_terkait: [],
      rujukan: [`harga harian ${String(awal)}`, `harga harian ${String(akhir)}`],
    });
  }
  return hasil(
    'R19a',
    judul,
    temuan,
    hitung(satuan, {
      diperiksa: datar.length,
      merah,
      dilewati: konteks.harga.length - datar.length,
      alasan_dilewati:
        konteks.harga.length > datar.length ? ['Hari yang harganya bergerak; aturan ini tidak berlaku untuknya.'] : [],
    }),
  );
}

/** Panjang runtun datar terpendek yang dilaporkan R19b. */
export const RUNTUN_MINIMAL = 3;
/** Jendela runtun lunak: berapa hari bursa yang dilihat sekaligus. */
export const JENDELA_LUNAK = 10;
/** Berapa hari datar di dalam jendela itu yang sudah cukup untuk dilaporkan. */
export const DATAR_LUNAK_MINIMAL = 9;

export interface RuntunDatar {
  awal: string;
  akhir: string;
  panjang: number;
  lunak: boolean;
}

/**
 * Cari runtun hari datar: yang berurutan penuh (>= 3 hari) dan yang "lunak"
 * (>= 9 dari 10 hari bursa berurutan).
 *
 * Runtun lunak ada karena ambang runtun penuh rapuh: satu hari yang bergerak
 * Rp1 di tengah runtun lima hari memecahnya jadi 2 + 2, dan keduanya hilang
 * dari laporan.
 */
export function cariRuntunDatar(harga: BarisHarga[]): RuntunDatar[] {
  const baris = [...harga].sort((a, b) => a.tanggal.localeCompare(b.tanggal));
  const datar = baris.map(hariDatar);
  const runtun: RuntunDatar[] = [];
  /** Nomor runtun penuh yang menutupi tiap hari; -1 = tidak tertutup. */
  const nomorRuntun = new Array<number>(baris.length).fill(-1);

  let i = 0;
  let nomor = 0;
  while (i < baris.length) {
    if (!datar[i]) {
      i += 1;
      continue;
    }
    let j = i;
    while (j + 1 < baris.length && datar[j + 1]) j += 1;
    const panjang = j - i + 1;
    if (panjang >= RUNTUN_MINIMAL) {
      runtun.push({
        awal: baris[i]?.tanggal ?? '',
        akhir: baris[j]?.tanggal ?? '',
        panjang,
        lunak: false,
      });
      for (let k = i; k <= j; k += 1) nomorRuntun[k] = nomor;
      nomor += 1;
    }
    i = j + 1;
  }

  // Jendela lunak dilaporkan hanya kalau ia **tidak** seluruhnya berada di
  // dalam satu runtun penuh: kalau ia di dalam satu runtun, ia tidak mengatakan
  // apa pun yang belum dikatakan runtun itu. Jendela yang melintasi dua runtun
  // penuh justru inti gunanya - ia memperlihatkan bahwa pemisahnya cuma satu hari.
  let sampai = -1;
  for (let awal = 0; awal + JENDELA_LUNAK <= baris.length; awal += 1) {
    if (awal <= sampai) continue;
    let jumlah = 0;
    let satuRuntun = nomorRuntun[awal] !== -1;
    for (let k = awal; k < awal + JENDELA_LUNAK; k += 1) {
      if (datar[k]) jumlah += 1;
      if (nomorRuntun[k] !== nomorRuntun[awal] || nomorRuntun[k] === -1) satuRuntun = false;
    }
    if (jumlah < DATAR_LUNAK_MINIMAL || satuRuntun) continue;
    sampai = awal + JENDELA_LUNAK - 1;
    runtun.push({
      awal: baris[awal]?.tanggal ?? '',
      akhir: baris[sampai]?.tanggal ?? '',
      panjang: jumlah,
      lunak: true,
    });
  }

  return runtun.sort(
    (a, b) =>
      a.awal.localeCompare(b.awal) ||
      a.akhir.localeCompare(b.akhir) ||
      Number(a.lunak) - Number(b.lunak),
  );
}

/**
 * R19b — runtun hari datar berturut-turut.
 *
 * Harga yang tidak bergerak berhari-hari bukan kesalahan data, tetapi ia
 * membuat kalimat "harga hari itu Rp sekian" kehilangan arti. Keparahan
 * peringatan. Runtun lunak dilaporkan terpisah, supaya satu hari yang bergerak
 * Rp1 tidak menghapus sebuah runtun panjang dari laporan.
 */
export function r19bRuntunDatar(konteks: KonteksVerifikasi): HasilAturan {
  const judul = 'Runtun hari datar';
  const satuan = 'hari bursa';
  if (konteks.harga.length < RUNTUN_MINIMAL) {
    return lewat('R19b', judul, 'Hari bursa kurang dari tiga, tidak ada runtun yang bisa terbentuk.', satuan);
  }
  const runtun = cariRuntunDatar(konteks.harga);
  const temuan: Temuan[] = [];
  let merah = 0;
  for (const r of runtun) {
    merah += r.panjang;
    temuan.push({
      temuan_id: `R19b-${konteks.simbol}-${r.awal}${r.lunak ? '-lunak' : ''}`,
      aturan: 'R19b',
      keparahan: 'peringatan',
      ringkasan: r.lunak
        ? `Harga ${konteks.simbol} praktis tidak bergerak antara ${r.awal} dan ${r.akhir}: ` +
          `${String(r.panjang)} dari ${String(JENDELA_LUNAK)} hari bursa mencatat satu harga saja ` +
          `untuk buka, tertinggi, terendah, dan tutup.`
        : `Harga ${konteks.simbol} tidak bergerak sama sekali selama ${String(r.panjang)} hari bursa ` +
          `berturut-turut, dari ${r.awal} sampai ${r.akhir}.`,
      angka: [
        { label: r.lunak ? 'hari datar di dalam jendela' : 'panjang runtun', nilai: r.panjang, satuan: 'hari' },
      ],
      fakta_terkait: [],
      rujukan: [`harga harian ${r.awal}`, `harga harian ${r.akhir}`],
    });
  }
  return hasil('R19b', judul, temuan, hitung(satuan, { diperiksa: konteks.harga.length, merah }));
}

// --- R28 label deret harga di sekitar aksi korporasi -------------------------

export type LabelDeret = 'disesuaikan' | 'mentah' | 'tak-terbaca';

export interface AksiBerlabel {
  jenis: string;
  ex_date: string;
  rasio: number;
  /** Hari bursa terakhir sebelum `ex_date`. */
  cum: string;
  /** Hari bursa pertama pada atau sesudah `ex_date`. */
  ex: string;
  /** Saham tersirat cum dibagi saham tersirat ex. */
  perbandingan: number;
  label: LabelDeret;
}

/**
 * Seberapa dekat perbandingan boleh meleset dan masih disebut "sama".
 *
 * Lima persen, ditulis sebagai pecahan: 1 dan rasio aksi terpisah jauh (rasio
 * terkecil yang ada adalah 4), jadi toleransi selebar ini tidak pernah membuat
 * kedua label bisa cocok sekaligus.
 */
export const TOLERANSI_R28 = { pembilang: 5, penyebut: 100 } as const;

function dekatDengan(nilai: number, target: number): boolean {
  if (target <= 0) return false;
  const selisih = Math.abs(nilai - target);
  return (
    selisih * TOLERANSI_R28.penyebut <= TOLERANSI_R28.pembilang * target
  );
}

/**
 * R28 — apakah deret harga di sekitar aksi korporasi ditulis ulang?
 *
 * Aturan ini **tidak mengeluarkan KONFLIK**. Ia mengeluarkan **label** yang
 * menentukan boleh tidaknya sebuah kartu harga dibuat:
 *
 * - `disesuaikan` — saham tersirat tidak berubah melintasi aksi (perbandingan
 *   mendekati 1);
 * - `mentah` — saham tersirat berubah sebesar rasio aksinya;
 * - `tak-terbaca` — bukan keduanya.
 *
 * Label `disesuaikan` **tidak boleh dibaca sebagai "deretnya sudah
 * disesuaikan"**: bukti di dalam satu endpoint yang sama saling bertentangan
 * (harga tertinggi lama satu emiten persis sama dengan `all_time_high`-nya,
 * yang berarti harga lama tidak dibagi rasio split). Yang bisa dikatakan
 * hanyalah apa yang diukur; penyebabnya tidak diketahui.
 *
 * Aturan tolak yang mengikat dan dikeluarkan di sini sebagai temuan
 * berkeparahan catatan: **kartu harga tidak boleh melintasi tanggal stock
 * split yang tercatat.**
 */
export function r28LabelDeretHarga(konteks: KonteksGudang): HasilAturan {
  const judul = 'Label deret harga di sekitar aksi korporasi';
  const satuan = 'aksi korporasi';
  const aksi = [
    ...konteks.data.stock_split.map((s) => ({ jenis: 'stock split', ex_date: s.tanggal, rasio: s.rasio })),
    ...konteks.data.right_issue.map((r) => ({
      jenis: 'rights issue',
      ex_date: r.ex_date,
      rasio:
        r.rasio_lama !== null && r.rasio_baru !== null && r.rasio_lama > 0
          ? (r.rasio_lama + r.rasio_baru) / r.rasio_lama
          : 0,
    })),
    ...konteks.data.bonus.map((b) => ({ jenis: 'saham bonus', ex_date: b.ex_date, rasio: 0 })),
  ].sort((a, b) => a.ex_date.localeCompare(b.ex_date) || a.jenis.localeCompare(b.jenis));

  if (aksi.length === 0) {
    return lewat('R28', judul, 'Tidak ada aksi korporasi tercatat untuk emiten ini.', satuan);
  }

  const sehat = [...konteks.harga]
    .filter((h) => !barisHargaCacat(h) && h.tutup > 0 && h.nilai_pasar > 0)
    .sort((a, b) => a.tanggal.localeCompare(b.tanggal));

  const temuan: Temuan[] = [];
  let diperiksa = 0;
  let tidakLengkap = 0;
  const alasan: string[] = [];

  for (const a of aksi) {
    diperiksa += 1;
    const sebelum = [...sehat].reverse().find((h) => h.tanggal < a.ex_date);
    const sesudah = sehat.find((h) => h.tanggal >= a.ex_date);
    if (sebelum === undefined || sesudah === undefined) {
      tidakLengkap += 1;
      alasan.push('Tidak ada baris harga sehat di kedua sisi tanggal ex aksi ini.');
      continue;
    }
    const tersiratCum = Math.round(sebelum.nilai_pasar / sebelum.tutup);
    const tersiratEx = Math.round(sesudah.nilai_pasar / sesudah.tutup);
    if (tersiratCum <= 0 || tersiratEx <= 0) {
      tidakLengkap += 1;
      alasan.push('Jumlah saham tersirat di salah satu sisi tidak bisa dihitung.');
      continue;
    }
    const perbandingan = tersiratEx / tersiratCum;
    const label: LabelDeret = dekatDengan(perbandingan, 1)
      ? 'disesuaikan'
      : a.rasio > 0 && dekatDengan(perbandingan, a.rasio)
        ? 'mentah'
        : 'tak-terbaca';

    const kalimat =
      label === 'disesuaikan'
        ? 'jumlah saham tersirat tidak berubah melintasi aksi ini'
        : label === 'mentah'
          ? 'jumlah saham tersirat berubah sebesar rasio aksinya'
          : 'jumlah saham tersirat berubah, tetapi tidak sebesar rasio aksinya; angkanya tidak terbaca';

    temuan.push({
      temuan_id: `R28-${konteks.simbol}-${a.ex_date}-${a.jenis.replace(/\s+/g, '-')}`,
      aturan: 'R28',
      keparahan: 'catatan',
      ringkasan:
        `Deret harga ${konteks.simbol} di sekitar ${a.jenis} ${a.ex_date} diberi label ` +
        `"${label}": ${kalimat} (${angka(tersiratCum)} lembar pada ${sebelum.tanggal} menjadi ` +
        `${angka(tersiratEx)} lembar pada ${sesudah.tanggal}). Label ini tidak menyatakan ada yang ` +
        `salah; ia menentukan kartu harga mana yang boleh dibuat. Penyebabnya tidak diketahui.`,
      angka: [
        { label: 'saham tersirat sebelum tanggal ex', nilai: tersiratCum, satuan: 'lembar' },
        { label: 'saham tersirat pada atau sesudah tanggal ex', nilai: tersiratEx, satuan: 'lembar' },
        { label: 'perbandingan', nilai: Number(perbandingan.toFixed(3)), satuan: 'kali' },
        { label: 'rasio aksi menurut data', nilai: a.rasio, satuan: 'kali' },
      ],
      fakta_terkait: [],
      rujukan: [`harga harian ${sebelum.tanggal}`, `harga harian ${sesudah.tanggal}`],
    });

    if (a.jenis === 'stock split') {
      temuan.push({
        temuan_id: `R28-tolak-${konteks.simbol}-${a.ex_date}`,
        aturan: 'R28',
        keparahan: 'catatan',
        ringkasan:
          `Kartu harga ${konteks.simbol} tidak boleh melintasi ${a.ex_date}: pada tanggal itu ` +
          `tercatat stock split, dan apakah harga sebelum tanggal itu ditulis dengan dasar yang sama ` +
          `tidak bisa ditentukan dari data yang ada.`,
        angka: [{ label: 'rasio stock split', nilai: a.rasio, satuan: 'kali' }],
        fakta_terkait: [],
        rujukan: [`aksi korporasi ${a.ex_date}`],
      });
    }
  }

  return hasil(
    'R28',
    judul,
    temuan,
    hitung(satuan, { diperiksa, merah: 0, tidak_lengkap: tidakLengkap, alasan_dilewati: alasan }),
  );
}

// --- R35 all_time_price terjangkau deret harian ------------------------------

/**
 * R35 — nilai `overview.all_time_price` harus terjangkau baris harian pada
 * tanggal yang disebutnya sendiri.
 *
 * Tiga keluaran, dan yang ketiga sama pentingnya dengan dua yang pertama:
 * terjangkau (hijau), **tidak** terjangkau (KONFLIK), dan **belum bisa
 * diperiksa** karena tanggalnya di luar deret harian yang kita punya
 * (TIDAK_LENGKAP).
 *
 * Akibat yang mengikat kalau ada satu saja yang tidak terjangkau:
 * `all_time_price` tidak boleh dipakai di kartu mana pun sampai itu dijelaskan.
 */
export function r35AllTimePrice(konteks: KonteksGudang): HasilAturan {
  const judul = 'Harga ekstrem ringkasan terjangkau deret harian';
  const satuan = 'nilai harga ekstrem';
  const nilai = konteks.data.all_time_price;
  if (nilai.length === 0) {
    return lewat('R35', judul, 'Ringkasan emiten ini tidak memuat all_time_price.', satuan);
  }
  const sehat = new Map(
    konteks.harga.filter((h) => !barisHargaCacat(h)).map((h) => [h.tanggal, h]),
  );

  const temuan: Temuan[] = [];
  let merah = 0;
  let tidakLengkap = 0;
  const alasan: string[] = [];

  for (const n of nilai) {
    const bar = sehat.get(n.tanggal);
    if (bar === undefined) {
      tidakLengkap += 1;
      alasan.push('Tanggal nilai ekstrem ini di luar deret harga harian yang kita punya.');
      continue;
    }
    if (n.nilai >= bar.terendah && n.nilai <= bar.tertinggi) continue;
    merah += 1;
    temuan.push({
      temuan_id: `R35-${konteks.simbol}-${n.label}-${n.tanggal}`,
      aturan: 'R35',
      ringkasan:
        `Ringkasan ${konteks.simbol} menyebut ${n.label} Rp${angka(n.nilai)} pada ${n.tanggal}, ` +
        `padahal baris harga harian hari itu hanya bergerak Rp${angka(bar.terendah)}-` +
        `Rp${angka(bar.tertinggi)}. Angka itu tidak terjangkau deret harganya sendiri.`,
      angka: [
        { label: `nilai ${n.label} menurut ringkasan`, nilai: n.nilai, satuan: 'rupiah per lembar' },
        { label: 'harga terendah hari itu', nilai: bar.terendah, satuan: 'rupiah per lembar' },
        { label: 'harga tertinggi hari itu', nilai: bar.tertinggi, satuan: 'rupiah per lembar' },
      ],
      fakta_terkait: [],
      rujukan: [`ringkasan ${konteks.simbol}`, `harga harian ${n.tanggal}`],
    });
  }

  return hasil(
    'R35',
    judul,
    temuan,
    hitung(satuan, {
      diperiksa: nilai.length,
      merah,
      tidak_lengkap: tidakLengkap,
      alasan_dilewati: alasan,
    }),
  );
}
