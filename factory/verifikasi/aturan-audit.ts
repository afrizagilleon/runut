/**
 * Aturan yang lahir dari salah nyata di audit gudang M4a (M4b).
 *
 * Tiap aturan di sini ditambahkan karena audit atas 42 emiten menemukan jenis
 * ketidakkonsistenan yang tidak ditangkap aturan mana pun, dan penguji
 * independen membenarkannya dari data mentah (`eval/audit-gudang/penguji/`).
 * Bukan untuk menambah jumlah aturan.
 *
 * - R36 — laporan tentang saham emiten lain (U18 ADRO). Cakupan R6 lama
 *   ("laporannya ternyata bercerita tentang saham lain") yang hilang ketika R6
 *   digantikan R17B, yang hanya memeriksa harga.
 * - R37 — satu tahun buku laporan keuangan yang bagiannya lebih besar dari
 *   keseluruhannya (U28 ABMM 2023: satuan bercampur).
 */
import type { Temuan } from '../skema/tipe.ts';
import { angka, hasil, hitung, lewat, urut } from './dasar.ts';
import type { HasilAturan, KonteksGudang, Laporan } from './tipe.ts';

// --- R36 laporan tentang saham emiten lain ---------------------------------------

/**
 * Perusahaan yang sahamnya diperdagangkan, menurut judul laporan.
 *
 * Pola judul di gudang (268 baris laporan, 371 berkas): "<pemegang> buys/sells
 * shares of <X>", "<pemegang> Buy/Sell/Sold/Buys Transaction of <X>",
 * "<pemegang> Receives Shares of <X>", "<pemegang> buys 1,744,000,000 shares of
 * <X>", dan "Change in <pemegang>'s position in <X>". Yang diambil adalah
 * kemunculan PERTAMA "shares of"/"transaction of", supaya "of" di dalam nama
 * perusahaan (Bank of India Indonesia) tidak memotong namanya. Pola lain → `null`.
 */
export function sasaranJudul(judul: string | undefined): string | null {
  if (judul === undefined || judul.trim() === '') return null;
  const dagang = /\b(?:shares?|transaction)\s+of\s+(.+)$/i.exec(judul);
  const posisi = dagang === null ? /\bposition\s+in\s+(.+)$/i.exec(judul) : null;
  const sasaran = (dagang ?? posisi)?.[1]?.trim() ?? '';
  return sasaran === '' ? null : sasaran;
}

/** Kata bentuk badan usaha yang tidak ikut menentukan nama. */
const KATA_BADAN = new Set(['pt', 'tbk', 'persero']);

function kata(nama: string): string[] {
  return nama
    .toLowerCase()
    .replace(/[^a-z0-9&]+/g, ' ')
    .split(' ')
    .filter((k) => k !== '' && !KATA_BADAN.has(k));
}

/** `a` diawali seluruh `b`, kata demi kata. */
function diawali(a: string[], b: string[]): boolean {
  return b.length > 0 && b.length <= a.length && b.every((k, i) => a[i] === k);
}

export type CocokNama = 'kode' | 'nama' | 'pemegang' | 'tak-diketahui' | 'lain';

/**
 * Cocokkan perusahaan di judul dengan emiten laporan.
 *
 * - `kode`: judul hanya menyebut kode saham emiten itu sendiri (ALII, ARKO, ASHA).
 * - `nama`: nama yang sama sesudah huruf besar-kecil, tanda baca, dan "PT",
 *   "Tbk", "(Persero)" dibuang; kata sesudah nama boleh ada ("Alakasa
 *   Industrindo Shares", "… Shares to Pay Off Debt"). Nama yang lebih pendek
 *   dari nama emiten baru cocok bila sedikitnya dua kata, supaya "Bank" tidak
 *   cocok dengan semua bank.
 * - `pemegang`: judul menyebut pemegangnya sendiri sebagai perusahaan yang
 *   sahamnya diperdagangkan (FOLK: "Sumber Garam Pratama Sell Transaction of
 *   Sumber Garam Pratama"). Judul seperti itu tidak menunjuk emiten mana pun.
 * - `tak-diketahui`: nama emiten tidak ada di gudang, dan judul bukan kodenya.
 * - `lain`: nama perusahaan lain.
 */
export function cocokNamaEmiten(
  sasaran: string,
  simbol: string,
  nama: string | null | undefined,
  pemegang: string,
): CocokNama {
  if (sasaran.trim().toUpperCase() === simbol.toUpperCase()) return 'kode';
  const s = kata(sasaran);
  if (nama !== null && nama !== undefined) {
    const n = kata(nama);
    if (diawali(s, n) || (s.length >= 2 && diawali(n, s))) return 'nama';
  }
  const p = kata(pemegang);
  if (p.length > 0 && p.length === s.length && diawali(s, p)) return 'pemegang';
  if (nama === null || nama === undefined) return 'tak-diketahui';
  return 'lain';
}

/**
 * Berapa jauh penyebut tersirat laporan boleh meleset dari saham beredar emiten
 * sebelum persennya dianggap bukan dari saham emiten ini.
 *
 * Persen di laporan ditulis dua sampai tiga desimal, jadi pembulatan hanya
 * menggeser penyebut tersiratnya sepersekian persen (R7 memeriksa selisih
 * sehalus itu). Saham beredar yang dipakai adalah titik bertanggal pada hari
 * laporan (`sahamBeredarPada`), jadi penerbitan saham baru sebelum laporan
 * sudah terhitung. Selisih di atas 10% di SEMUA sisi laporan tidak bisa datang
 * dari pembulatan maupun dari jeda antartitik: ADRO 2025-10-17 meleset 39%.
 */
export const TOLERANSI_PENYEBUT_LAIN = 0.1;

interface SisiTersirat {
  sisi: 'sebelum' | 'sesudah';
  lembar: number;
  persen: number;
  tersirat: number;
}

function sisiTersirat(l: Laporan): SisiTersirat[] {
  const keluar: SisiTersirat[] = [];
  for (const [sisi, lembar, persen] of [
    ['sebelum', l.sebelum, l.persen_sebelum],
    ['sesudah', l.sesudah, l.persen_sesudah],
  ] as const) {
    if (lembar > 0 && persen > 0) {
      keluar.push({ sisi, lembar, persen, tersirat: Math.round(lembar / (persen / 100)) });
    }
  }
  return keluar;
}

/**
 * R36: laporan yang judulnya menyebut perusahaan lain DAN persennya tidak
 * mungkin dihitung dari saham beredar emiten ini.
 *
 * Dua syarat, sengaja. Nama saja tidak cukup: perusahaan bisa berganti nama
 * (ADRO dulu Adaro Energy Indonesia), dan judul di data ini kadang menyebut
 * pemegangnya sendiri. Angka saja juga tidak cukup: persen yang meleset adalah
 * urusan R7 dan R11a. Baru bila keduanya menunjuk ke luar — judulnya menyebut
 * perusahaan lain dan penyebut tersiratnya jauh dari saham beredar emiten ini
 * — laporan itu tentang saham emiten lain, dan TIDAK SATU PUN angkanya boleh
 * menjadi kartu emiten ini.
 *
 * Nama beda tetapi angkanya milik emiten ini → hijau (nama lama, ejaan).
 * Judul tanpa pola, judul yang menyebut pemegangnya sendiri, nama emiten tidak
 * diketahui, atau saham beredar tidak diketahui → TIDAK_LENGKAP, bukan merah.
 */
export function r36LaporanSahamLain(konteks: KonteksGudang): HasilAturan {
  const judul = 'Laporan tentang saham emiten lain';
  const satuan = 'laporan';
  if (konteks.laporan.length === 0) {
    return lewat('R36', judul, 'Tidak ada laporan untuk diperiksa.', satuan);
  }
  const nama = konteks.data.nama_perusahaan;
  const cari = konteks.sahamBeredarPada;
  const temuan: Temuan[] = [];
  let diperiksa = 0;
  let merah = 0;
  let tidakLengkap = 0;
  const alasan: string[] = [];

  for (const l of urut(konteks.laporan)) {
    diperiksa += 1;
    const sasaran = sasaranJudul(l.judul);
    if (sasaran === null) {
      tidakLengkap += 1;
      alasan.push('Judul laporan kosong atau tidak menyebut perusahaan yang sahamnya diperdagangkan.');
      continue;
    }
    const cocok = cocokNamaEmiten(sasaran, konteks.simbol, nama, l.pemegang);
    if (cocok === 'kode' || cocok === 'nama') continue;
    if (cocok === 'pemegang') {
      tidakLengkap += 1;
      alasan.push(
        'Judul laporan menyebut pemegangnya sendiri sebagai perusahaan yang sahamnya diperdagangkan, jadi tidak menunjuk emiten mana pun.',
      );
      continue;
    }
    if (cocok === 'tak-diketahui') {
      tidakLengkap += 1;
      alasan.push('Nama perusahaan emiten ini tidak ada di gudang, dan judul laporannya tidak menyebut kode sahamnya.');
      continue;
    }

    // Judul menyebut perusahaan lain. Angkanya yang memutuskan.
    const sisi = sisiTersirat(l);
    const titik = cari === undefined ? null : cari(l.dilaporkan_pada.slice(0, 10));
    if (sisi.length === 0 || titik === null) {
      tidakLengkap += 1;
      alasan.push(
        'Judul laporan menyebut perusahaan lain, tetapi persennya kosong atau saham beredar emiten pada tanggal itu tidak diketahui, jadi tidak bisa dipastikan sahamnya milik siapa.',
      );
      continue;
    }
    const meleset = sisi.map((s) => Math.abs(s.tersirat / titik.lembar - 1));
    if (!meleset.every((m) => m > TOLERANSI_PENYEBUT_LAIN)) continue;

    merah += 1;
    const terkecil = Math.min(...meleset);
    const [pertama] = sisi;
    if (pertama === undefined) continue;
    temuan.push({
      temuan_id: `R36-${l.laporan_id}`,
      aturan: 'R36',
      ringkasan:
        `Laporan ${l.dilaporkan_pada} bersimbol ${konteks.simbol} menyebut saham "${sasaran}" di judulnya, ` +
        `bukan ${nama ?? konteks.simbol}. Persennya juga tidak mungkin dihitung dari saham ` +
        `${konteks.simbol}: ${angka(pertama.lembar)} lembar = ${String(pertama.persen)}% berarti saham beredar ` +
        `${angka(pertama.tersirat)} lembar, padahal saham beredar ${konteks.simbol} yang berlaku ${titik.pada} ` +
        `${angka(titik.lembar)} lembar (meleset ${(terkecil * 100).toFixed(1)}% atau lebih di tiap sisi laporan). ` +
        `Laporan ini tentang saham perusahaan lain; tidak satu pun angkanya boleh menjadi kartu ${konteks.simbol}.`,
      angka: [
        ...sisi.map((s) => ({
          label: `saham beredar tersirat laporan (${s.sisi})`,
          nilai: s.tersirat,
          satuan: 'lembar',
        })),
        { label: 'saham beredar emiten', nilai: titik.lembar, satuan: 'lembar' },
        { label: 'meleset paling kecil', nilai: Number((terkecil * 100).toFixed(1)), satuan: 'persen' },
      ],
      fakta_terkait: [],
      rujukan: [`${l.dilaporkan_pada} · ${l.berkas}`, `judul: ${l.judul ?? ''}`, `penyebut: ${titik.sumber}`],
    });
  }

  return hasil(
    'R36',
    judul,
    temuan,
    hitung(satuan, { diperiksa, merah, tidak_lengkap: tidakLengkap, alasan_dilewati: alasan }),
  );
}

// --- R37 bagian lebih besar dari keseluruhannya di satu tahun buku ------------

/**
 * Hubungan bagian-keseluruhan yang BERLAKU MENURUT DEFINISI di neraca satu
 * tahun buku. Hanya yang terbukti dilanggar di data gudang dan dibenarkan
 * standar akuntansi yang dikutip; bukan daftar "semua yang mungkin".
 *
 * - `total_debt` ≤ `total_liabilities`: utang (pinjaman berbunga, sewa) adalah
 *   liabilitas keuangan, jadi bagian dari total liabilitas (PSAK 201 / IAS 1
 *   par. 54 huruf m dan 69; PSAK 109 / IFRS 9). Dilanggar: ABMM 2023.
 * - `cash_and_equivalents` ≤ `total_assets`: kas dan setara kas adalah pos aset
 *   (PSAK 201 / IAS 1 par. 54 huruf i). Dilanggar: ABMM 2023.
 * - `cash_and_equivalents` ≤ `current_assets`: kas dan setara kas digolongkan
 *   aset lancar kecuali dibatasi penggunaannya ≥ 12 bulan (PSAK 201 / IAS 1
 *   par. 66 huruf d; setara kas = investasi jangka pendek yang sangat likuid,
 *   PSAK 207 / IAS 7 par. 6-7). Dilanggar: ABMM 2023, ARCI 2023, HITS 2025.
 *
 * Tidak dimasukkan walau dilanggar di gudang: `inventories` ≤ `current_assets`
 * (ABMM 2023, ARCI 2023) — pengembang properti boleh menyajikan sebagian
 * persediaan real estat sebagai aset tidak lancar, jadi hubungannya tidak
 * berlaku menurut definisi; kedua baris itu sudah tertangkap hubungan lain.
 * `prepaid_assets` ≤ `total_assets` (ABMM 2023) tidak menambah satu baris pun.
 */
export const HUBUNGAN_BAGIAN: ReadonlyArray<{
  bagian: 'utang' | 'kas';
  keseluruhan: 'liabilitas' | 'aset' | 'aset_lancar';
  medan_bagian: string;
  medan_keseluruhan: string;
  dasar: string;
}> = [
  {
    bagian: 'utang',
    keseluruhan: 'liabilitas',
    medan_bagian: 'total_debt',
    medan_keseluruhan: 'total_liabilities',
    dasar: 'utang adalah bagian dari liabilitas',
  },
  {
    bagian: 'kas',
    keseluruhan: 'aset',
    medan_bagian: 'cash_and_equivalents',
    medan_keseluruhan: 'total_assets',
    dasar: 'kas dan setara kas adalah bagian dari aset',
  },
  {
    bagian: 'kas',
    keseluruhan: 'aset_lancar',
    medan_bagian: 'cash_and_equivalents',
    medan_keseluruhan: 'current_assets',
    dasar: 'kas dan setara kas digolongkan aset lancar',
  },
];

/**
 * R37: satu tahun buku `historical_financials` yang memuat bagian lebih besar
 * dari keseluruhannya.
 *
 * Penolak, bukan penanda: dua angka di baris yang sama saling bertentangan
 * menurut definisinya, jadi sedikitnya satu salah — di data audit sebabnya
 * satuan yang bercampur (sebagian medan dalam dolar AS, sebagian dalam rupiah).
 * Mana yang benar tidak terbaca, jadi tidak satu pun angka keuangan tahun buku
 * itu boleh menjadi kartu. Sama besar bukan pelanggaran. Tahun buku tanpa satu
 * pasangan pun yang kedua angkanya ada → TIDAK_LENGKAP.
 */
export function r37BagianMelebihiKeseluruhan(konteks: KonteksGudang): HasilAturan {
  const judul = 'Bagian lebih besar dari keseluruhannya di laporan keuangan';
  const satuan = 'tahun buku';
  const baris = konteks.data.keuangan_tahunan;
  if (baris.length === 0) {
    return lewat('R37', judul, 'Emiten ini tidak punya laporan keuangan tahunan di data.', satuan);
  }
  const temuan: Temuan[] = [];
  let diperiksa = 0;
  let merah = 0;
  let tidakLengkap = 0;
  const alasan: string[] = [];

  for (const k of [...baris].sort((a, b) => a.tahun - b.tahun)) {
    diperiksa += 1;
    let diadu = 0;
    const langgar: Array<{ h: (typeof HUBUNGAN_BAGIAN)[number]; bagian: number; keseluruhan: number }> = [];
    for (const h of HUBUNGAN_BAGIAN) {
      const bagian = k[h.bagian];
      const keseluruhan = k[h.keseluruhan];
      if (typeof bagian !== 'number' || typeof keseluruhan !== 'number') continue;
      diadu += 1;
      if (bagian > keseluruhan) langgar.push({ h, bagian, keseluruhan });
    }
    if (diadu === 0) {
      tidakLengkap += 1;
      alasan.push('Tahun buku ini tidak punya satu pun pasangan bagian dan keseluruhan yang kedua angkanya ada.');
      continue;
    }
    if (langgar.length === 0) continue;

    merah += 1;
    const angkaTemuan: Temuan['angka'] = [];
    for (const { h, bagian, keseluruhan } of langgar) {
      for (const [label, nilai] of [
        [h.medan_bagian, bagian],
        [h.medan_keseluruhan, keseluruhan],
      ] as const) {
        if (!angkaTemuan.some((a) => a.label === label)) angkaTemuan.push({ label, nilai, satuan: 'tak diketahui' });
      }
    }
    temuan.push({
      temuan_id: `R37-${konteks.simbol}-${String(k.tahun)}`,
      aturan: 'R37',
      ringkasan:
        `Laporan keuangan ${konteks.simbol} tahun buku ${String(k.tahun)} memuat bagian yang lebih besar ` +
        `dari keseluruhannya: ` +
        langgar
          .map(
            ({ h, bagian, keseluruhan }) =>
              `${h.medan_bagian} ${angka(bagian)} lebih besar dari ${h.medan_keseluruhan} ${angka(keseluruhan)} ` +
              `(${(bagian / keseluruhan).toFixed(1)} kali), padahal ${h.dasar}`,
          )
          .join('; ') +
        '. Sedikitnya satu angka di tahun buku ini salah satuan atau salah isi, dan mana yang benar tidak ' +
        'terbaca dari data ini; tidak satu pun angka keuangan tahun buku ini boleh menjadi kartu.',
      angka: angkaTemuan,
      fakta_terkait: [],
      rujukan: [`financials.historical_financials ${String(k.tahun)}`],
    });
  }

  return hasil(
    'R37',
    judul,
    temuan,
    hitung(satuan, { diperiksa, merah, tidak_lengkap: tidakLengkap, alasan_dilewati: alasan }),
  );
}
