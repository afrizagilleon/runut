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
import type { HasilAturan, KonteksGudang, KonteksVerifikasi, Laporan } from './tipe.ts';
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
