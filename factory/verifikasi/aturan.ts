/**
 * Aturan verifikasi R1–R10, sesuai `docs/aturan-verifikasi.md`.
 * Tiap aturan adalah fungsi murni atas konteks dan mengembalikan `HasilAturan`.
 * Aturan yang tidak bisa dijalankan menyebut alasannya; tidak ada yang dilewati diam-diam.
 */
import type { Temuan } from '../skema/tipe.ts';
import { angkaId } from '../format.ts';
import type { HasilAturan, HitunganAturan, KonteksVerifikasi, Laporan } from './tipe.ts';
import { hitunganKosong } from './tipe.ts';

/** Batas galat saat membandingkan persentase laporan dengan hitungan ulang. */
export const TOLERANSI_PERSEN = 0.05;

function urut(laporan: Laporan[]): Laporan[] {
  return [...laporan].sort((a, b) => {
    const selisih = a.dilaporkan_pada.localeCompare(b.dilaporkan_pada);
    return selisih !== 0 ? selisih : a.laporan_id.localeCompare(b.laporan_id);
  });
}

function perPemegang(laporan: Laporan[]): Map<string, Laporan[]> {
  const peta = new Map<string, Laporan[]>();
  for (const l of urut(laporan)) {
    const daftar = peta.get(l.pemegang);
    if (daftar === undefined) peta.set(l.pemegang, [l]);
    else daftar.push(l);
  }
  return peta;
}

function tandaTangan(l: Laporan): string {
  if (l.transaksi.length > 0) {
    return l.transaksi
      .map((t) => `${t.tanggal}|${t.jenis}|${String(t.harga)}|${String(t.jumlah)}`)
      .join(';');
  }
  return `${l.jenis}|${String(l.jumlah)}|${String(l.harga)}`;
}

export interface BlokUlangan {
  awal: number;
  ulangan: number;
  panjang: number;
  asli: Laporan[];
  salinan: Laporan[];
  lembar: number;
}

/**
 * Cari urutan laporan yang tanda tangan transaksinya berulang persis
 * sebagai blok yang berdampingan. Dipakai R3 dan dipinjam R5.
 */
export function cariBlokUlangan(laporan: Laporan[], panjangMinimal = 2): BlokUlangan[] {
  const daftar = urut(laporan);
  const tanda = daftar.map(tandaTangan);
  const blok: BlokUlangan[] = [];
  const sudahDipakai = new Set<number>();

  for (let i = 0; i < daftar.length; i += 1) {
    for (let j = i + 1; j < daftar.length; j += 1) {
      if (tanda[i] !== tanda[j]) continue;
      // hanya blok maksimal: kalau bisa dipanjangkan ke belakang, lewati
      if (i > 0 && j > 0 && tanda[i - 1] === tanda[j - 1]) continue;
      let panjang = 0;
      while (
        i + panjang < daftar.length &&
        j + panjang < daftar.length &&
        i + panjang < j &&
        tanda[i + panjang] === tanda[j + panjang]
      ) {
        panjang += 1;
      }
      if (panjang < panjangMinimal) continue;
      const salinan = daftar.slice(j, j + panjang);
      if (salinan.some((_, k) => sudahDipakai.has(j + k))) continue;
      for (let k = 0; k < panjang; k += 1) sudahDipakai.add(j + k);
      const asli = daftar.slice(i, i + panjang);
      blok.push({
        awal: i,
        ulangan: j,
        panjang,
        asli,
        salinan,
        lembar: salinan.reduce((jumlah, l) => jumlah + l.jumlah, 0),
      });
    }
  }
  return blok;
}

/**
 * Bangun hitungan INV-B dari jumlah unit yang disapu.
 * `hijau` selalu sisa, supaya `diperiksa = hijau + merah + tidak_lengkap`
 * tidak pernah bisa meleset karena salah ketik.
 */
function hitung(
  satuan: string,
  bagian: {
    diperiksa: number;
    merah: number;
    tidak_lengkap?: number;
    dilewati?: number;
    alasan_dilewati?: string[];
  },
): HitunganAturan {
  const tidak_lengkap = bagian.tidak_lengkap ?? 0;
  return {
    satuan,
    diperiksa: bagian.diperiksa,
    hijau: bagian.diperiksa - bagian.merah - tidak_lengkap,
    merah: bagian.merah,
    tidak_lengkap,
    dilewati: bagian.dilewati ?? 0,
    alasan_dilewati: [...new Set(bagian.alasan_dilewati ?? [])].sort(),
  };
}

function hasil(
  aturan: HasilAturan['aturan'],
  judul: string,
  temuan: Temuan[],
  hitungan: HitunganAturan,
): HasilAturan {
  return { aturan, judul, dijalankan: true, alasan_lewat: null, temuan, hitungan };
}

function lewat(
  aturan: HasilAturan['aturan'],
  judul: string,
  alasan: string,
  satuan: string,
  dilewati = 0,
): HasilAturan {
  const hitungan = hitunganKosong(satuan);
  hitungan.dilewati = dilewati;
  hitungan.alasan_dilewati = [alasan];
  return { aturan, judul, dijalankan: false, alasan_lewat: alasan, temuan: [], hitungan };
}

// Pemformat sendiri, bukan toLocaleString: teks temuan ikut ke berkas kasus yang
// harus bisa dibangun ulang identik di mesin lain.
const angka = (nilai: number): string => angkaId(nilai);

// --- R1 ---------------------------------------------------------------------

export function r1Aritmetika(konteks: KonteksVerifikasi): HasilAturan {
  const judul = 'Aritmetika per laporan';
  if (konteks.laporan.length === 0) {
    return lewat('R1', judul, 'Tidak ada laporan untuk diperiksa.', 'laporan');
  }
  const temuan: Temuan[] = [];
  for (const l of urut(konteks.laporan)) {
    const arah = l.jenis === 'jual' ? -1 : 1;
    const harusnya = l.sebelum + arah * l.jumlah;
    if (harusnya !== l.sesudah) {
      temuan.push({
        temuan_id: `R1-${l.laporan_id}`,
        aturan: 'R1',
        ringkasan: `Laporan ${l.dilaporkan_pada} tidak konsisten sendiri: ${angka(l.sebelum)} lembar dikurangi atau ditambah ${angka(l.jumlah)} lembar seharusnya ${angka(harusnya)}, tetapi laporan menulis ${angka(l.sesudah)}.`,
        angka: [
          { label: 'kepemilikan sebelum', nilai: l.sebelum, satuan: 'lembar' },
          { label: 'jumlah transaksi', nilai: l.jumlah, satuan: 'lembar' },
          { label: 'kepemilikan sesudah menurut laporan', nilai: l.sesudah, satuan: 'lembar' },
          { label: 'selisih', nilai: l.sesudah - harusnya, satuan: 'lembar' },
        ],
        fakta_terkait: [],
        rujukan: [`${l.dilaporkan_pada} · ${l.berkas}`],
      });
    }
  }
  return hasil(
    'R1',
    judul,
    temuan,
    hitung('laporan', { diperiksa: konteks.laporan.length, merah: temuan.length }),
  );
}

// --- R2 ---------------------------------------------------------------------

export function r2Kontinuitas(konteks: KonteksVerifikasi): HasilAturan {
  const judul = 'Kontinuitas rantai';
  if (konteks.laporan.length < 2) {
    return lewat(
      'R2',
      judul,
      'Rantai kurang dari dua laporan, tidak ada sambungan untuk diperiksa.',
      'sambungan',
    );
  }
  const temuan: Temuan[] = [];
  let sambungan = 0;
  for (const [pemegang, daftar] of perPemegang(konteks.laporan)) {
    sambungan += Math.max(0, daftar.length - 1);
    for (let i = 1; i < daftar.length; i += 1) {
      const sebelumnya = daftar[i - 1]!;
      const sekarang = daftar[i]!;
      const selisih = sekarang.sebelum - sebelumnya.sesudah;
      if (selisih === 0) continue;
      const arah = selisih > 0 ? 'bertambah' : 'berkurang';
      temuan.push({
        temuan_id: `R2-${sebelumnya.laporan_id}-${sekarang.laporan_id}`,
        aturan: 'R2',
        ringkasan: `Rantai ${pemegang} putus: laporan ${sebelumnya.dilaporkan_pada} berakhir di ${angka(sebelumnya.sesudah)} lembar, tetapi laporan berikutnya ${sekarang.dilaporkan_pada} mulai dari ${angka(sekarang.sebelum)} lembar. Ada ${angka(Math.abs(selisih))} lembar yang ${arah} tanpa laporan.`,
        angka: [
          { label: 'lompatan', nilai: selisih, satuan: 'lembar' },
          { label: 'saldo akhir laporan sebelumnya', nilai: sebelumnya.sesudah, satuan: 'lembar' },
          { label: 'saldo awal laporan berikutnya', nilai: sekarang.sebelum, satuan: 'lembar' },
        ],
        fakta_terkait: [],
        rujukan: [
          `${sebelumnya.dilaporkan_pada} · ${sebelumnya.berkas}`,
          `${sekarang.dilaporkan_pada} · ${sekarang.berkas}`,
        ],
      });
    }
  }
  return hasil('R2', judul, temuan, hitung('sambungan', { diperiksa: sambungan, merah: temuan.length }));
}

// --- R3 ---------------------------------------------------------------------

export function r3LaporanGanda(konteks: KonteksVerifikasi): HasilAturan {
  const judul = 'Laporan ganda';
  if (konteks.laporan.length < 2) {
    return lewat(
      'R3',
      judul,
      'Rantai kurang dari dua laporan, tidak ada urutan yang bisa berulang.',
      'laporan',
    );
  }
  const temuan: Temuan[] = [];
  let laporanTerulang = 0;
  for (const blok of cariBlokUlangan(konteks.laporan)) {
    laporanTerulang += blok.salinan.length;
    const persen =
      konteks.saham_beredar === null
        ? null
        : (blok.lembar / konteks.saham_beredar) * 100;
    const angkaTemuan = [
      { label: 'transaksi yang berulang', nilai: blok.panjang, satuan: 'transaksi' },
      { label: 'lembar pada set ulangan', nilai: blok.lembar, satuan: 'lembar' },
    ];
    if (persen !== null) {
      angkaTemuan.push({
        label: 'bagian dari saham beredar',
        nilai: Number(persen.toFixed(2)),
        satuan: 'persen',
      });
    }
    const awalAsli = blok.asli[0]!;
    const akhirAsli = blok.asli[blok.panjang - 1]!;
    const awalSalinan = blok.salinan[0]!;
    const akhirSalinan = blok.salinan[blok.panjang - 1]!;
    temuan.push({
      temuan_id: `R3-${awalSalinan.laporan_id}`,
      aturan: 'R3',
      ringkasan: `${String(blok.panjang)} transaksi yang dilaporkan ${awalAsli.dilaporkan_pada}–${akhirAsli.dilaporkan_pada} dilaporkan ulang persis ${awalSalinan.dilaporkan_pada}–${akhirSalinan.dilaporkan_pada}, dengan tanggal, jenis, jumlah, dan harga yang sama. Set ulangan berjumlah ${angka(blok.lembar)} lembar.`,
      angka: angkaTemuan,
      fakta_terkait: [],
      rujukan: [
        ...blok.asli.map((l) => `set pertama · ${l.dilaporkan_pada} · ${l.berkas}`),
        ...blok.salinan.map((l) => `set ulangan · ${l.dilaporkan_pada} · ${l.berkas}`),
      ],
    });
  }
  return hasil(
    'R3',
    judul,
    temuan,
    hitung('laporan', { diperiksa: konteks.laporan.length, merah: laporanTerulang }),
  );
}

// --- R4 ---------------------------------------------------------------------

export function r4TanggalKetersediaan(konteks: KonteksVerifikasi): HasilAturan {
  const judul = 'Tanggal ketersediaan';
  if (konteks.laporan.length === 0) {
    return lewat('R4', judul, 'Tidak ada laporan untuk diperiksa.', 'laporan');
  }
  const temuan: Temuan[] = [];
  const laporanMerah = new Set<string>();
  for (const l of urut(konteks.laporan)) {
    if (l.dilaporkan_pada === '') {
      laporanMerah.add(l.laporan_id);
      temuan.push({
        temuan_id: `R4-${l.laporan_id}`,
        aturan: 'R4',
        ringkasan: `Laporan ${l.berkas} tidak punya tanggal laporan, sehingga tidak bisa ditentukan sejak kapan isinya diketahui publik.`,
        angka: [{ label: 'jumlah transaksi', nilai: l.jumlah, satuan: 'lembar' }],
        fakta_terkait: [],
        rujukan: [l.berkas],
      });
      continue;
    }
    const tanggalLaporan = l.dilaporkan_pada.slice(0, 10);
    for (const t of l.transaksi) {
      if (t.tanggal > tanggalLaporan) {
        laporanMerah.add(l.laporan_id);
        temuan.push({
          temuan_id: `R4-${l.laporan_id}-${t.tanggal}`,
          aturan: 'R4',
          ringkasan: `Laporan ${l.dilaporkan_pada} memuat transaksi bertanggal ${t.tanggal}, yaitu sesudah tanggal laporannya sendiri.`,
          angka: [{ label: 'jumlah transaksi', nilai: t.jumlah, satuan: 'lembar' }],
          fakta_terkait: [],
          rujukan: [`${l.dilaporkan_pada} · ${l.berkas}`],
        });
      }
    }
  }
  return hasil(
    'R4',
    judul,
    temuan,
    hitung('laporan', { diperiksa: konteks.laporan.length, merah: laporanMerah.size }),
  );
}

// --- R5 ---------------------------------------------------------------------

export function r5Rekonsiliasi(konteks: KonteksVerifikasi): HasilAturan {
  const judul = 'Rekonsiliasi dengan potret kepemilikan';
  if (konteks.potret === null) {
    return lewat(
      'R5',
      judul,
      'Tidak ada sumber kedua (potret kepemilikan atau saldo awal laporan berikutnya) untuk dibandingkan.',
      'rantai',
    );
  }
  const daftar = urut(konteks.laporan);
  const terakhir = daftar[daftar.length - 1];
  if (terakhir === undefined) {
    return lewat('R5', judul, 'Rantai kosong, tidak ada saldo akhir untuk dibandingkan.', 'rantai');
  }
  const potret = konteks.potret;
  const selisih = potret.lembar - terakhir.sesudah;
  if (selisih === 0) return hasil('R5', judul, [], hitung('rantai', { diperiksa: 1, merah: 0 }));

  const lembarGanda = cariBlokUlangan(konteks.laporan).reduce((j, b) => j + b.lembar, 0);
  const sisa = potret.lembar - (terakhir.sesudah + lembarGanda);
  const angkaTemuan = [
    { label: 'saldo akhir rantai', nilai: terakhir.sesudah, satuan: 'lembar' },
    { label: 'saldo menurut sumber kedua', nilai: potret.lembar, satuan: 'lembar' },
    { label: 'selisih', nilai: selisih, satuan: 'lembar' },
  ];
  let tambahan = '';
  if (lembarGanda > 0) {
    angkaTemuan.push({
      label: 'sisa selisih kalau set laporan ganda dikembalikan',
      nilai: sisa,
      satuan: 'lembar',
    });
    tambahan = ` Kalau ${angka(lembarGanda)} lembar dari set laporan ganda dikembalikan, sisa selisihnya tinggal ${angka(sisa)} lembar.`;
  }
  return hasil(
    'R5',
    judul,
    [
    {
      temuan_id: 'R5-saldo-akhir',
      aturan: 'R5',
      ringkasan: `Saldo akhir rantai ${angka(terakhir.sesudah)} lembar tidak cocok dengan ${potret.sumber} yang menyebut ${angka(potret.lembar)} lembar pada ${potret.pada}; selisihnya ${angka(selisih)} lembar.${tambahan}`,
      angka: angkaTemuan,
      fakta_terkait: [],
      rujukan: [`${terakhir.dilaporkan_pada} · ${terakhir.berkas}`, potret.sumber],
    },
    ],
    hitung('rantai', { diperiksa: 1, merah: 1 }),
  );
}

// --- R6 ---------------------------------------------------------------------

export function r6SubjekLaporan(konteks: KonteksVerifikasi): HasilAturan {
  const judul = 'Subjek laporan dan rentang harga';
  if (konteks.laporan.length === 0) {
    return lewat('R6', judul, 'Tidak ada laporan untuk diperiksa.', 'pemeriksaan');
  }
  const temuan: Temuan[] = [];
  let merahSimbol = 0;
  for (const l of urut(konteks.laporan)) {
    if (l.simbol !== konteks.simbol) {
      merahSimbol += 1;
      temuan.push({
        temuan_id: `R6-simbol-${l.laporan_id}`,
        aturan: 'R6',
        ringkasan: `Laporan ${l.dilaporkan_pada} tercatat di ${konteks.simbol} tetapi isinya tentang ${l.simbol}.`,
        angka: [{ label: 'jumlah transaksi', nilai: l.jumlah, satuan: 'lembar' }],
        fakta_terkait: [],
        rujukan: [`${l.dilaporkan_pada} · ${l.berkas}`],
      });
    }
  }

  const butirTransaksi = konteks.laporan.reduce((j, l) => j + l.transaksi.length, 0);
  if (konteks.harga.length === 0) {
    const sebagian = hasil(
      'R6',
      judul,
      temuan,
      hitung('pemeriksaan', {
        diperiksa: konteks.laporan.length,
        merah: merahSimbol,
        dilewati: butirTransaksi,
        alasan_dilewati: ['Tidak ada data harga harian untuk membandingkan harga transaksi.'],
      }),
    );
    sebagian.alasan_lewat =
      'Pemeriksaan rentang harga dilewati: tidak ada data harga harian.';
    return sebagian;
  }

  const hargaPerTanggal = new Map(konteks.harga.map((h) => [h.tanggal, h]));
  interface Kumpulan {
    tanggal: string;
    laporan: Laporan[];
    hargaLaporan: number[];
    terendah: number;
    tertinggi: number;
  }
  const kumpulan = new Map<string, Kumpulan>();
  let butirTanpaHarga = 0;
  let merahHarga = 0;
  for (const l of urut(konteks.laporan)) {
    for (const t of l.transaksi) {
      const bar = hargaPerTanggal.get(t.tanggal);
      if (bar === undefined) {
        // di luar jendela data harga; bukan pelanggaran, tetapi juga bukan hijau
        butirTanpaHarga += 1;
        continue;
      }
      if (t.harga >= bar.terendah && t.harga <= bar.tertinggi) continue;
      merahHarga += 1;
      const ada = kumpulan.get(t.tanggal);
      if (ada === undefined) {
        kumpulan.set(t.tanggal, {
          tanggal: t.tanggal,
          laporan: [l],
          hargaLaporan: [t.harga],
          terendah: bar.terendah,
          tertinggi: bar.tertinggi,
        });
      } else {
        if (!ada.laporan.includes(l)) ada.laporan.push(l);
        ada.hargaLaporan.push(t.harga);
      }
    }
  }
  for (const k of [...kumpulan.values()].sort((a, b) => a.tanggal.localeCompare(b.tanggal))) {
    const min = Math.min(...k.hargaLaporan);
    const max = Math.max(...k.hargaLaporan);
    temuan.push({
      temuan_id: `R6-harga-${k.tanggal}`,
      aturan: 'R6',
      ringkasan: `${String(k.laporan.length)} laporan menyebut transaksi ${k.tanggal} pada harga Rp${angka(min)}–Rp${angka(max)}, padahal harga saham hari itu hanya bergerak Rp${angka(k.terendah)}–Rp${angka(k.tertinggi)}.`,
      angka: [
        { label: 'laporan yang terlibat', nilai: k.laporan.length, satuan: 'laporan' },
        { label: 'harga laporan terendah', nilai: min, satuan: 'rupiah per lembar' },
        { label: 'harga laporan tertinggi', nilai: max, satuan: 'rupiah per lembar' },
        { label: 'harga pasar terendah hari itu', nilai: k.terendah, satuan: 'rupiah per lembar' },
        { label: 'harga pasar tertinggi hari itu', nilai: k.tertinggi, satuan: 'rupiah per lembar' },
      ],
      fakta_terkait: [],
      rujukan: k.laporan.map((l) => `${l.dilaporkan_pada} · ${l.berkas}`),
    });
  }
  return hasil(
    'R6',
    judul,
    temuan,
    hitung('pemeriksaan', {
      diperiksa: konteks.laporan.length + butirTransaksi,
      merah: merahSimbol + merahHarga,
      tidak_lengkap: butirTanpaHarga,
    }),
  );
}

// --- R7 ---------------------------------------------------------------------

export function r7PersenDihitungUlang(konteks: KonteksVerifikasi): HasilAturan {
  const judul = 'Persen dihitung ulang';
  if (konteks.saham_beredar === null) {
    return lewat(
      'R7',
      judul,
      'Jumlah saham beredar tidak diketahui, persentase tidak bisa dihitung ulang.',
      'sisi laporan',
      konteks.laporan.length * 2,
    );
  }
  const beredar = konteks.saham_beredar;
  const temuan: Temuan[] = [];
  for (const l of urut(konteks.laporan)) {
    const pasangan: Array<[string, number, number]> = [
      ['sebelum transaksi', l.sebelum, l.persen_sebelum],
      ['sesudah transaksi', l.sesudah, l.persen_sesudah],
    ];
    for (const [sisi, lembar, dilaporkan] of pasangan) {
      const dihitung = (lembar / beredar) * 100;
      if (Math.abs(dihitung - dilaporkan) <= TOLERANSI_PERSEN) continue;
      temuan.push({
        temuan_id: `R7-${l.laporan_id}-${sisi.replace(/\s+/g, '-')}`,
        aturan: 'R7',
        ringkasan: `Laporan ${l.dilaporkan_pada} menulis kepemilikan ${sisi} ${String(dilaporkan)}%, padahal ${angka(lembar)} dibagi ${angka(beredar)} saham beredar adalah ${dihitung.toFixed(2)}%.`,
        angka: [
          { label: 'persen menurut laporan', nilai: dilaporkan, satuan: 'persen' },
          { label: 'persen hasil hitung ulang', nilai: Number(dihitung.toFixed(2)), satuan: 'persen' },
          { label: 'lembar', nilai: lembar, satuan: 'lembar' },
          { label: 'saham beredar', nilai: beredar, satuan: 'lembar' },
        ],
        fakta_terkait: [],
        rujukan: [`${l.dilaporkan_pada} · ${l.berkas}`],
      });
    }
  }
  return hasil(
    'R7',
    judul,
    temuan,
    hitung('sisi laporan', { diperiksa: konteks.laporan.length * 2, merah: temuan.length }),
  );
}

// --- R8 ---------------------------------------------------------------------

export function r8TandaRepo(konteks: KonteksVerifikasi): HasilAturan {
  const judul = 'Tanda repo';
  const diketahui = Object.keys(konteks.tanda_repo);
  if (diketahui.length === 0) {
    return lewat(
      'R8',
      judul,
      'Kolom repurchase agreement tidak ada di data API dan belum ada PDF laporan yang diurai, sehingga tanda repo tidak bisa diperiksa.',
      'laporan',
      konteks.laporan.length,
    );
  }
  const temuan: Temuan[] = [];
  for (const l of urut(konteks.laporan)) {
    if (konteks.tanda_repo[l.laporan_id] !== true) continue;
    if (l.jenis !== 'jual') continue;
    temuan.push({
      temuan_id: `R8-${l.laporan_id}`,
      aturan: 'R8',
      ringkasan: `Laporan ${l.dilaporkan_pada} dicatat API sebagai penjualan, padahal dokumennya menandai transaksi itu sebagai repurchase agreement, yang bukan jual lepas.`,
      angka: [{ label: 'jumlah transaksi', nilai: l.jumlah, satuan: 'lembar' }],
      fakta_terkait: [],
      rujukan: [`${l.dilaporkan_pada} · ${l.berkas}`],
    });
  }
  const berpenanda = konteks.laporan.filter(
    (l) => konteks.tanda_repo[l.laporan_id] !== undefined,
  ).length;
  return hasil(
    'R8',
    judul,
    temuan,
    hitung('laporan', {
      diperiksa: berpenanda,
      merah: temuan.length,
      dilewati: konteks.laporan.length - berpenanda,
      alasan_dilewati:
        konteks.laporan.length > berpenanda
          ? ['PDF laporan belum diurai, tanda repo tidak diketahui.']
          : [],
    }),
  );
}

// --- R9 ---------------------------------------------------------------------

const POLA_LEMBAR_TEKS = /from ([\d,]+) to ([\d,]+) shares/;
const POLA_PERSEN_TEKS = /from ([\d.]+)% to ([\d.]+)%/;
const POLA_URUTAN = /(\d+)(?:st|nd|rd|th) insider disposal/;
const POLA_TOTAL = /totaling a distribution of ([\d,]+) shares/;

function keAngka(teks: string): number {
  return Number(teks.replace(/,/g, ''));
}

export function r9TeksVersusField(konteks: KonteksVerifikasi): HasilAturan {
  const judul = 'Field terstruktur vs teks';
  const daftar = urut(konteks.laporan).filter((l) => l.teks !== '');
  if (daftar.length === 0) {
    return lewat(
      'R9',
      judul,
      'Laporan tidak memuat teks yang bisa diadu dengan field terstruktur.',
      'laporan',
      konteks.laporan.length,
    );
  }
  const temuan: Temuan[] = [];
  const laporanMerah = new Set<string>();
  let kumulatifJual = 0;
  let nomorJual = 0;
  for (const l of urut(konteks.laporan)) {
    if (l.jenis === 'jual') {
      kumulatifJual += l.jumlah;
      nomorJual += 1;
    }
    if (l.teks === '') continue;

    const lembar = POLA_LEMBAR_TEKS.exec(l.teks);
    if (lembar !== null) {
      const dariTeks = keAngka(lembar[1]!);
      const keTeks = keAngka(lembar[2]!);
      if (dariTeks !== l.sebelum || keTeks !== l.sesudah) {
        laporanMerah.add(l.laporan_id);
        temuan.push({
          temuan_id: `R9-lembar-${l.laporan_id}`,
          aturan: 'R9',
          ringkasan: `Laporan ${l.dilaporkan_pada}: teks menyebut kepemilikan berubah dari ${angka(dariTeks)} ke ${angka(keTeks)} lembar, sedangkan field terstrukturnya ${angka(l.sebelum)} ke ${angka(l.sesudah)}.`,
          angka: [
            { label: 'sebelum menurut teks', nilai: dariTeks, satuan: 'lembar' },
            { label: 'sebelum menurut field', nilai: l.sebelum, satuan: 'lembar' },
            { label: 'sesudah menurut teks', nilai: keTeks, satuan: 'lembar' },
            { label: 'sesudah menurut field', nilai: l.sesudah, satuan: 'lembar' },
          ],
          fakta_terkait: [],
          rujukan: [`${l.dilaporkan_pada} · ${l.berkas}`],
        });
      }
    }

    const persen = POLA_PERSEN_TEKS.exec(l.teks);
    if (persen !== null) {
      const dariTeks = Number(persen[1]);
      const keTeks = Number(persen[2]);
      if (dariTeks !== l.persen_sebelum || keTeks !== l.persen_sesudah) {
        laporanMerah.add(l.laporan_id);
        temuan.push({
          temuan_id: `R9-persen-${l.laporan_id}`,
          aturan: 'R9',
          ringkasan: `Laporan ${l.dilaporkan_pada}: teks menyebut kepemilikan ${String(dariTeks)}% menjadi ${String(keTeks)}%, sedangkan field terstrukturnya ${String(l.persen_sebelum)}% menjadi ${String(l.persen_sesudah)}%.`,
          angka: [
            { label: 'persen sebelum menurut teks', nilai: dariTeks, satuan: 'persen' },
            { label: 'persen sebelum menurut field', nilai: l.persen_sebelum, satuan: 'persen' },
            { label: 'persen sesudah menurut teks', nilai: keTeks, satuan: 'persen' },
            { label: 'persen sesudah menurut field', nilai: l.persen_sesudah, satuan: 'persen' },
          ],
          fakta_terkait: [],
          rujukan: [`${l.dilaporkan_pada} · ${l.berkas}`],
        });
      }
    }

    // Total kumulatif di teks hanya menghitung penjualan, dan hanya bisa diadu
    // kalau nomor urut penjualan di teks sama dengan hitungan kita.
    const urutan = POLA_URUTAN.exec(l.teks);
    const total = POLA_TOTAL.exec(l.teks);
    if (urutan !== null && total !== null && Number(urutan[1]) === nomorJual) {
      const totalTeks = keAngka(total[1]!);
      if (totalTeks !== kumulatifJual) {
        laporanMerah.add(l.laporan_id);
        temuan.push({
          temuan_id: `R9-kumulatif-${l.laporan_id}`,
          aturan: 'R9',
          ringkasan: `Laporan ${l.dilaporkan_pada}: teks menyebut total penjualan sampai laporan ini ${angka(totalTeks)} lembar, sedangkan penjumlahan rantai menghasilkan ${angka(kumulatifJual)} lembar.`,
          angka: [
            { label: 'total menurut teks', nilai: totalTeks, satuan: 'lembar' },
            { label: 'total hasil penjumlahan rantai', nilai: kumulatifJual, satuan: 'lembar' },
            { label: 'selisih', nilai: totalTeks - kumulatifJual, satuan: 'lembar' },
          ],
          fakta_terkait: [],
          rujukan: [`${l.dilaporkan_pada} · ${l.berkas}`],
        });
      }
    }
  }
  return hasil(
    'R9',
    judul,
    temuan,
    hitung('laporan', {
      diperiksa: daftar.length,
      merah: laporanMerah.size,
      dilewati: konteks.laporan.length - daftar.length,
      alasan_dilewati:
        konteks.laporan.length > daftar.length
          ? ['Laporan tidak memuat teks yang bisa diadu dengan field terstruktur.']
          : [],
    }),
  );
}

// --- R10 --------------------------------------------------------------------

export function r10HariTanpaVolume(konteks: KonteksVerifikasi): HasilAturan {
  const judul = 'Hari tanpa volume';
  if (konteks.harga.length === 0) {
    return lewat('R10', judul, 'Tidak ada data harga harian untuk diperiksa.', 'baris harga');
  }
  const tanggalSuspensi = new Set(konteks.suspensi.map((s) => s.tanggal));
  const temuan: Temuan[] = [];
  for (const h of [...konteks.harga].sort((a, b) => a.tanggal.localeCompare(b.tanggal))) {
    if (h.volume !== 0) continue;
    if (tanggalSuspensi.has(h.tanggal)) continue;
    temuan.push({
      temuan_id: `R10-${h.tanggal}`,
      aturan: 'R10',
      ringkasan: `Pada ${h.tanggal} tidak ada satu lembar pun yang berpindah tangan dan harga tidak bergerak, tetapi tanggal itu tidak ada di daftar suspensi.`,
      angka: [
        { label: 'volume', nilai: 0, satuan: 'lembar' },
        { label: 'harga penutupan', nilai: h.tutup, satuan: 'rupiah per lembar' },
      ],
      fakta_terkait: [],
      rujukan: [`harga harian ${h.tanggal}`],
    });
  }
  return hasil(
    'R10',
    judul,
    temuan,
    hitung('baris harga', { diperiksa: konteks.harga.length, merah: temuan.length }),
  );
}

// --- orkestrator ------------------------------------------------------------

export const ATURAN = [
  r1Aritmetika,
  r2Kontinuitas,
  r3LaporanGanda,
  r4TanggalKetersediaan,
  r5Rekonsiliasi,
  r6SubjekLaporan,
  r7PersenDihitungUlang,
  r8TandaRepo,
  r9TeksVersusField,
  r10HariTanpaVolume,
] as const;

export interface HasilVerifikasi {
  pemeriksaan: HasilAturan[];
  temuan: Temuan[];
}

/** Jalankan R1–R10 dan kumpulkan temuannya beserta catatan aturan yang dilewati. */
export function verifikasi(konteks: KonteksVerifikasi): HasilVerifikasi {
  const pemeriksaan = ATURAN.map((aturan) => aturan(konteks));
  return {
    pemeriksaan,
    temuan: pemeriksaan.flatMap((p) => p.temuan),
  };
}
