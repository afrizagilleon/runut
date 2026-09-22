/**
 * Perintah `npm run verifikasi:gudang`.
 *
 * Menjalankan himpunan aturan generasi kedua atas **setiap emiten** di
 * `.cache/sectors/` dan menulis dua berkas:
 *
 * - `.cache/m2b/gudang.json` — hasil lengkap per emiten x aturan, termasuk
 *   tiap temuan. Tidak ikut repo: ia memuat data mentah turunan.
 * - `docs/bukti/aturan-gudang.md` — ikut repo, hanya agregat: per aturan satu
 *   kalimat awam, hitungannya, dan paling banyak dua contoh nyata.
 *
 * INV-C: perintah ini tidak pernah membaca jaringan, jam dinding, atau acak.
 * Dua kali jalan atas gudang yang sama menghasilkan dua berkas yang identik
 * byte per byte.
 */
import { mkdirSync, writeFileSync } from 'node:fs';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { angkaId } from './format.ts';
import { keJson } from './kasus/json.ts';
import { muatGudang } from './muat/gudang.ts';
import { konteksEmiten } from './verifikasi/konteks.ts';
import { ATURAN_V2, verifikasiV2 } from './verifikasi/v2.ts';
import { daftarAksi, hargaDiKeduaSisi } from './verifikasi/aturan-keuangan.ts';
import type { HitunganAturan } from './verifikasi/tipe.ts';
import type { KodeAturan, Temuan } from './skema/tipe.ts';
import { keparahanTemuan } from './skema/tipe.ts';

const AKAR = fileURLToPath(new URL('../', import.meta.url));

/** Kalimat awam satu baris tiap aturan, berbentuk "Kami menolak/menandai kartu kalau ...". */
const KALIMAT_AWAM: Record<string, string> = {
  R1: 'Kami menolak kartu kalau penjumlahan di dalam satu laporan tidak cocok dengan dirinya sendiri.',
  R2: 'Kami menolak kartu kalau saldo akhir satu laporan tidak sama dengan saldo awal laporan berikutnya.',
  R3: 'Kami menolak kartu kalau satu rangkaian transaksi yang sama dilaporkan dua kali.',
  R4: 'Kami menolak kartu kalau laporannya memuat transaksi bertanggal sesudah laporan itu sendiri terbit.',
  R5: 'Kami menolak kartu kalau saldo akhir rantai tidak cocok dengan sumber kedua.',
  R6: 'Kami menolak kartu kalau laporannya ternyata bercerita tentang saham lain, atau harganya di luar rentang hari itu.',
  R7: 'Kami menolak kartu kalau persen yang ditulis laporan tidak cocok dengan jumlah lembar dibagi saham beredar yang berlaku pada tanggal laporan itu.',
  R8: 'Kami menolak kartu kalau dokumennya menandai transaksi sebagai perjanjian beli kembali, yang bukan jual lepas.',
  R9: 'Kami menolak kartu kalau angka di teks laporan berbeda dari angka di kolomnya sendiri.',
  R10: 'Kami menandai hari yang tidak mencatat satu lembar pun berpindah tangan.',
  R11a: 'Kami menolak kartu kalau dua persen di dalam satu laporan tidak mungkin berasal dari jumlah saham beredar yang sama.',
  R11b:
    'Kami menandai rantai laporan satu emiten yang persennya tidak bisa berasal dari satu jumlah ' +
    'saham beredar yang sama.',
  R12: 'Kami menandai laporan yang tanggal di nama berkasnya berbeda dari jam terbitnya, dan memakai tanggal nama berkas untuk mengurutkan rantai.',
  R13: 'Kami menolak kartu kalau satu pemegang dilaporkan memegang lebih banyak lembar daripada yang diterbitkan.',
  R14: 'Kami menolak kartu kalau ada lembar yang berpindah tangan tanpa laporan di antara dua laporan berurutan.',
  R15: 'Kami menolak kartu kalau penjumlahan di dalam satu laporan tidak cocok, termasuk untuk laporan yang jenis transaksinya bukan beli maupun jual.',
  R16: 'Kami menandai laporan yang terbit lebih dulu tetapi sudah memuat keadaan yang baru dihasilkan laporan berikutnya.',
  R17B: 'Kami menolak kartu kalau harga yang ditulis laporan di luar rentang harga saham itu pada tanggal transaksinya sendiri.',
  R18a: 'Kami menandai hari yang volumenya nol tetapi tidak ada di daftar suspensi, dan tidak menyimpulkan apa pun darinya.',
  R19a: 'Kami menandai hari yang harganya hanya satu angka dan volumenya nol, karena angka itu bukan harga yang disepakati siapa pun.',
  R19b:
    'Kami menandai runtun hari bursa yang tiap harinya hanya mencatat satu angka untuk buka, ' +
    'tertinggi, terendah, dan tutup — entah harganya diam, entah berganti tiap hari.',
  R20:
    'Kami menandai emiten yang laba per lembarnya tidak dihitung atas jumlah saham yang sama tiap ' +
    'tahun, karena dua angka seperti itu tidak bisa dibandingkan langsung.',
  R21:
    'Kami menandai dua sumber yang menyebut jumlah saham berbeda untuk tanggal yang sama, dan ' +
    'tidak mengadu dua angka yang diukur pada waktu yang berbeda.',
  R22: 'Kami menandai satu pemegang saham yang ditulis dengan lebih dari satu ejaan, supaya rantainya tidak terbaca sebagai dua orang.',
  R23:
    'Kami menolak kartu kalau laba yang disebut keputusan RUPS berbeda dari laba di laporan ' +
    'keuangan tahun buku yang sama.',
  R25: 'Kami menolak bukti negatif kalau daftar laporannya belum terbukti habis.',
  R26:
    'Kami menandai pembagian dividen yang tidak masuk akal dibandingkan laba tahun buku yang ' +
    'kami petakan untuknya.',
  R27:
    'Kami menandai medan rasio siap pakai yang tidak bisa dihitung ulang dari laporan keuangan ' +
    'tahun yang sama, atau yang tandanya menipu.',
  R28: 'Kami memberi label pada deret harga di sekitar aksi korporasi, dan melarang kartu harga melintasi tanggal stock split.',
  R32:
    'Kami menandai perubahan jumlah saham dari satu tahun buku ke tahun berikutnya yang tidak ada ' +
    'satu pun aksi korporasi tercatat untuk menjelaskannya.',
  R31:
    'Kami menolak kartu kalau dividen per lembar yang disebut keputusan RUPS tidak ada di medan ' +
    'dividen, atau baru cocok sesudah dikali rasio pemecahan saham.',
  R29:
    'Kami menandai dividen yang gerakan harganya pada tanggal ex — hari pertama pembeli baru ' +
    'tidak lagi kebagian — tidak sejalan dengan besar dividen itu.',
  R33: 'Kami menandai hari yang jumlah saham tersiratnya melompat, karena penyebut persen tidak boleh diambil dari hari seperti itu.',
  R34:
    'Kami memberi tanda pada aksi korporasi yang tidak punya harga harian di kedua sisinya, ' +
    'karena tidak ada satu pun pemeriksaan harga yang bisa dijalankan atasnya.',
  R35: 'Kami menolak kartu kalau harga tertinggi atau terendah yang disebut ringkasan tidak terjangkau deret harga hariannya sendiri.',
};

/**
 * Aturan **penanda**: temuannya berkeparahan `peringatan` atau `catatan`, dan
 * merahnya berarti "perlu dijelaskan sebelum dipakai di kartu", bukan "datanya
 * salah". Sisanya adalah aturan **penolak**, yang merahnya berarti dua angka di
 * dalam data yang sama saling bertentangan.
 *
 * Daftarnya ditulis di sini, bukan diturunkan dari temuan yang kebetulan
 * muncul: aturan yang nol merah hari ini tetap harus memakai kata yang benar.
 * `v2.test.ts` menjaga daftar ini tetap sejalan dengan kata kerja kalimat
 * awamnya dan dengan keparahan temuan yang sungguh dikeluarkan tiap aturan.
 */
export const ATURAN_PENANDA: readonly KodeAturan[] = [
  'R10',
  'R11b',
  'R12',
  'R16',
  'R18a',
  'R19a',
  'R19b',
  'R20',
  'R21',
  'R22',
  'R26',
  'R27',
  'R28',
  'R29',
  'R32',
  'R33',
  'R34',
];

function penanda(aturan: KodeAturan): boolean {
  return ATURAN_PENANDA.includes(aturan);
}

interface HasilAturanRingkas {
  aturan: KodeAturan;
  judul: string;
  dijalankan: boolean;
  alasan_lewat: string | null;
  hitungan: HitunganAturan;
  temuan: Temuan[];
}

interface HasilEmiten {
  simbol: string;
  berkas: string[];
  jumlah: { laporan: number; harga: number; suspensi: number };
  pemeriksaan: HasilAturanRingkas[];
}

interface Agregat {
  aturan: KodeAturan;
  judul: string;
  satuan: string;
  diperiksa: number;
  hijau: number;
  merah: number;
  tidak_lengkap: number;
  dilewati: number;
  emiten_dijalankan: number;
  emiten_dilewati: number;
  alasan_lewat: string[];
  contoh: Array<{ simbol: string; ringkasan: string }>;
}

function agregatKosong(aturan: KodeAturan, judul: string): Agregat {
  return {
    aturan,
    judul,
    satuan: '',
    diperiksa: 0,
    hijau: 0,
    merah: 0,
    tidak_lengkap: 0,
    dilewati: 0,
    emiten_dijalankan: 0,
    emiten_dilewati: 0,
    alasan_lewat: [],
    contoh: [],
  };
}

// --- D-4: tabel "peristiwa -> kartu yang sah" --------------------------------

/**
 * Jenis peristiwa kurikulum, dan satu kalimat awam yang **wajib dijelaskan di
 * kartu** tentang jenis itu.
 *
 * Kalimatnya bukan penilaian dan bukan tebakan: ia menyebutkan apa yang berubah
 * di dalam data ketika peristiwa itu terjadi, supaya kartu tidak diam-diam
 * membandingkan dua angka yang pembaginya berbeda.
 */
export const PERISTIWA: ReadonlyArray<{
  jenis: string;
  wajib: string;
}> = [
  {
    jenis: 'dividen tunai',
    wajib:
      'Kartu harus menyebut tanggal ex — hari pertama pembeli baru tidak lagi kebagian dividen ' +
      'itu — karena harga biasanya membuka lebih rendah pada hari itu tanpa ada yang rugi.',
  },
  {
    jenis: 'penerbitan saham baru',
    wajib:
      'Harga sebelum dan sesudah tanggal ex penerbitan saham baru tidak bisa dibandingkan ' +
      'langsung, dan persen kepemilikan sebelum dan sesudahnya dibagi jumlah saham yang berbeda.',
  },
  {
    jenis: 'pemecahan saham',
    wajib:
      'Kartu harga tidak boleh melintasi tanggal pemecahan saham: di data ini dua medan dari ' +
      'endpoint yang sama saling bertentangan tentang apakah harga lama sudah ditulis ulang, ' +
      'dan sebabnya belum diketahui.',
  },
  {
    jenis: 'saham bonus',
    wajib:
      'Sama dengan pemecahan saham, jumlah lembar bertambah tanpa uang baru masuk, jadi harga ' +
      'per lembar sebelum dan sesudahnya bukan angka yang sebanding.',
  },
  {
    jenis: 'pembelian kembali saham',
    wajib:
      'Pembelian kembali saham hanya muncul sebagai kalimat di keputusan RUPS, tanpa jumlah dan ' +
      'tanpa tanggal, jadi tidak ada angka yang bisa dijadikan kartu.',
  },
  {
    jenis: 'keluar dari bursa',
    wajib:
      'Tidak ada satu medan pun di data ini yang menyatakan sebuah emiten keluar dari bursa, ' +
      'jadi peristiwa itu tidak bisa diperiksa sama sekali.',
  },
];

export interface BarisPeristiwa {
  jenis: string;
  /** Berapa kejadian jenis ini di seluruh gudang. */
  kejadian: number;
  /** Berapa yang punya baris harga di kedua sisi tanggalnya (R34). */
  berharga: number;
  /** Berapa yang lolos seluruh aturan penolak emitennya. */
  lolos: number;
  /** Emiten yang punya kejadian jenis ini, terurut. */
  emiten: string[];
  wajib: string;
}

/**
 * Aturan penolak yang **mengenai peristiwa korporasi**: kalau salah satunya
 * mengeluarkan temuan berkeparahan konflik untuk sebuah emiten, angka peristiwa
 * emiten itu tidak boleh jadi kartu.
 *
 * Sengaja bukan "semua aturan penolak". Rantai laporan kepemilikan MTLA yang
 * putus tidak mengatakan apa pun tentang apakah dividen MTLA bisa dijadikan
 * kartu; menolak keduanya sekaligus berarti menolak kartu yang benar.
 */
export const PENOLAK_PERISTIWA: readonly KodeAturan[] = ['R23', 'R31', 'R35'];

/**
 * Susun tabel peristiwa dari hasil V2 seluruh gudang.
 *
 * "Lolos" berarti: peristiwa itu punya harga harian di kedua sisinya (R34)
 * **dan** emitennya tidak punya satu pun temuan berkeparahan konflik dari
 * `PENOLAK_PERISTIWA`.
 */
export function susunTabelPeristiwa(
  gudang: ReturnType<typeof muatGudang>,
  berkasKosong: string[],
): BarisPeristiwa[] {
  const hitungan = new Map<string, { kejadian: number; berharga: number; lolos: number; emiten: Set<string> }>();
  for (const { jenis } of PERISTIWA) {
    hitungan.set(jenis, { kejadian: 0, berharga: 0, lolos: 0, emiten: new Set() });
  }

  for (const [kode, data] of gudang.emiten) {
    const konteks = konteksEmiten(data, berkasKosong);
    const hasil = verifikasiV2(konteks);
    const adaKonflik = hasil.pemeriksaan.some(
      (p) =>
        PENOLAK_PERISTIWA.includes(p.aturan) &&
        p.temuan.some((t) => keparahanTemuan(t) === 'konflik'),
    );

    for (const a of daftarAksi(konteks)) {
      const baris = hitungan.get(a.jenis);
      if (baris === undefined) continue;
      baris.kejadian += 1;
      baris.emiten.add(kode);
      const berharga = hargaDiKeduaSisi(konteks.harga, a.tanggal);
      if (berharga) baris.berharga += 1;
      if (berharga && !adaKonflik) baris.lolos += 1;
    }

    // Pembelian kembali saham hanya ada sebagai kalimat keputusan RUPS.
    for (const r of data.rups) {
      if (r.ringkasan === null || !/buyback|buy-back|repurchase of its own shares/i.test(r.ringkasan)) {
        continue;
      }
      const baris = hitungan.get('pembelian kembali saham');
      if (baris === undefined) continue;
      baris.kejadian += 1;
      baris.emiten.add(kode);
    }
  }

  return PERISTIWA.map(({ jenis, wajib }) => {
    const h = hitungan.get(jenis) ?? { kejadian: 0, berharga: 0, lolos: 0, emiten: new Set<string>() };
    return {
      jenis,
      kejadian: h.kejadian,
      berharga: h.berharga,
      lolos: h.lolos,
      emiten: [...h.emiten].sort(),
      wajib,
    };
  });
}

export interface LaporanGudang {
  ringkasan_gudang: ReturnType<typeof muatGudang>['ringkasan'];
  berkas_tak_dikenal: Array<{ berkas: string; alasan: string }>;
  berkas_paginasi_kosong: string[];
  emiten: HasilEmiten[];
  agregat: Agregat[];
  peristiwa: BarisPeristiwa[];
}

/** Susun seluruh laporan gudang. Fungsi murni atas isi gudang; tidak menulis apa pun. */
export function susunLaporanGudang(folder?: string): LaporanGudang {
  const gudang = folder === undefined ? muatGudang() : muatGudang(folder);
  const berkasKosong = gudang.berkas
    .filter((b) => b.jenis === 'paginasi-kosong')
    .map((b) => b.berkas);

  const agregat = new Map<KodeAturan, Agregat>();
  const emiten: HasilEmiten[] = [];

  for (const [kode, data] of gudang.emiten) {
    const konteks = konteksEmiten(data, berkasKosong);
    const hasil = verifikasiV2(konteks);
    const pemeriksaan: HasilAturanRingkas[] = hasil.pemeriksaan.map((p) => ({
      aturan: p.aturan,
      judul: p.judul,
      dijalankan: p.dijalankan,
      alasan_lewat: p.alasan_lewat,
      hitungan: p.hitungan,
      temuan: p.temuan,
    }));
    emiten.push({
      simbol: kode,
      berkas: data.berkas,
      jumlah: {
        laporan: data.laporan.length,
        harga: data.harga.length,
        suspensi: data.suspensi.length,
      },
      pemeriksaan,
    });

    for (const p of hasil.pemeriksaan) {
      let a = agregat.get(p.aturan);
      if (a === undefined) {
        a = agregatKosong(p.aturan, p.judul);
        agregat.set(p.aturan, a);
      }
      if (a.satuan === '') a.satuan = p.hitungan.satuan;
      a.diperiksa += p.hitungan.diperiksa;
      a.hijau += p.hitungan.hijau;
      a.merah += p.hitungan.merah;
      a.tidak_lengkap += p.hitungan.tidak_lengkap;
      a.dilewati += p.hitungan.dilewati;
      if (p.dijalankan) a.emiten_dijalankan += 1;
      else {
        a.emiten_dilewati += 1;
        if (p.alasan_lewat !== null && !a.alasan_lewat.includes(p.alasan_lewat)) {
          a.alasan_lewat.push(p.alasan_lewat);
        }
      }
      // Paling banyak dua contoh per aturan, dan yang dipilih selalu yang sama:
      // temuan berkeparahan konflik lebih dulu, lalu urutan emiten.
      if (a.contoh.length < 2) {
        for (const t of p.temuan) {
          if (a.contoh.length >= 2) break;
          if (keparahanTemuan(t) !== 'konflik' && p.hitungan.merah === 0) continue;
          a.contoh.push({ simbol: kode, ringkasan: t.ringkasan });
        }
      }
    }
  }

  const urutAturan = new Map(ATURAN_V2.map((e) => [e.kode, e.urutan]));
  const daftarAgregat = [...agregat.values()].sort(
    (a, b) => (urutAturan.get(a.aturan) ?? 99) - (urutAturan.get(b.aturan) ?? 99),
  );
  for (const a of daftarAgregat) a.alasan_lewat.sort();

  return {
    ringkasan_gudang: gudang.ringkasan,
    berkas_tak_dikenal: gudang.tak_dikenal.map((b) => ({ berkas: b.berkas, alasan: b.alasan })),
    berkas_paginasi_kosong: berkasKosong,
    emiten,
    agregat: daftarAgregat,
    peristiwa: susunTabelPeristiwa(gudang, berkasKosong),
  };
}

const angka = (n: number): string => angkaId(n);

/** Susun `docs/bukti/aturan-gudang.md`: hanya agregat, paling banyak dua contoh per aturan. */
export function susunDokumenBukti(laporan: LaporanGudang): string {
  const baris: string[] = [];
  baris.push('# Bukti: aturan verifikasi dijalankan atas seluruh gudang data');
  baris.push('');
  baris.push(
    'Berkas ini ditulis oleh `npm run verifikasi:gudang`. Jangan disunting tangan: ' +
      'jalankan perintahnya lagi. Perintah itu tidak membaca jaringan, jam dinding, ' +
      'maupun angka acak, jadi dua kali jalan atas data yang sama memberi berkas yang sama.',
  );
  baris.push('');
  baris.push('## Apa yang dibaca');
  baris.push('');
  const r = laporan.ringkasan_gudang;
  baris.push(
    `Dari \`.cache/sectors/\`: **${angka(r.berkas)} berkas**, **${angka(r.emiten)} emiten**, ` +
      `**${angka(r.laporan_unik)} laporan kepemilikan unik** (${angka(r.laporan_rangkap)} rangkap dibuang), ` +
      `**${angka(r.baris_harga_unik)} baris harga unik** (${angka(r.baris_harga_rangkap)} rangkap dibuang), ` +
      `dan ${angka(r.suspensi_unik)} baris suspensi.`,
  );
  baris.push('');
  baris.push(
    laporan.berkas_tak_dikenal.length === 0
      ? 'Tidak ada berkas yang jenisnya tidak bisa dikenali dari isinya.'
      : `${angka(laporan.berkas_tak_dikenal.length)} berkas tidak bisa dikenali dari isinya: ` +
        laporan.berkas_tak_dikenal.map((b) => `\`${b.berkas}\``).join(', ') + '.',
  );
  if (laporan.berkas_paginasi_kosong.length > 0) {
    baris.push('');
    baris.push(
      `${angka(laporan.berkas_paginasi_kosong.length)} berkas adalah respons berpaginasi yang kosong. ` +
        'Respons seperti itu tidak memuat kode emitennya sama sekali, jadi ia tidak bisa ' +
        'dialamatkan ke emiten mana pun dari isinya: ' +
        laporan.berkas_paginasi_kosong.map((b) => `\`${b}\``).join(', ') + '.',
    );
  }
  baris.push('');
  baris.push('## Peristiwa perusahaan: apa yang boleh jadi kartu');
  baris.push('');
  baris.push(
    'Kurikulum melabeli kasus menurut **peristiwa**: perusahaan membagi dividen, menerbitkan ' +
      'saham baru, memecah saham, membeli kembali saham, keluar dari bursa. Tabel ini menghitung ' +
      'berapa kejadian tiap jenis ada di gudang, berapa yang punya harga harian di kedua sisi ' +
      'tanggalnya, dan berapa yang emitennya tidak punya satu pun angka yang saling bertentangan. ' +
      'Kolom terakhir adalah yang paling penting: apa yang **wajib dijelaskan** di kartu tentang ' +
      'jenis peristiwa itu.',
  );
  baris.push('');
  baris.push('| peristiwa | kejadian | punya harga di kedua sisi | lolos jadi bahan kartu | emiten |');
  baris.push('|---|---:|---:|---:|---|');
  for (const p of laporan.peristiwa) {
    baris.push(
      `| ${p.jenis} | ${angka(p.kejadian)} | ${angka(p.berharga)} | ${angka(p.lolos)} | ` +
        `${p.emiten.length === 0 ? '—' : p.emiten.join(', ')} |`,
    );
  }
  baris.push('');
  baris.push('Yang wajib dijelaskan di kartu, per jenis peristiwa:');
  baris.push('');
  for (const p of laporan.peristiwa) {
    baris.push(`- **${p.jenis}** — ${p.wajib}`);
  }
  baris.push('');
  baris.push('## Hasil per aturan');
  baris.push('');
  baris.push('| aturan | satuan | diperiksa | hijau | merah[^merah] | tidak lengkap | dilewati |');
  baris.push('|---|---|---:|---:|---:|---:|---:|');
  for (const a of laporan.agregat) {
    baris.push(
      `| ${a.aturan} | ${a.satuan} | ${angka(a.diperiksa)} | ${angka(a.hijau)} | ` +
        `${angka(a.merah)} | ${angka(a.tidak_lengkap)} | ${angka(a.dilewati)} |`,
    );
  }
  baris.push('');
  baris.push(
    '[^merah]: Untuk aturan penolak, "merah" berarti dua angka di dalam data yang sama saling ' +
      'bertentangan. Untuk aturan penanda (' +
      ATURAN_PENANDA.join(', ') +
      '), "merah" berarti hal itu perlu dijelaskan sebelum dipakai di kartu — bukan bahwa ' +
      'datanya salah.',
  );
  baris.push('');

  for (const a of laporan.agregat) {
    const kataMerah = penanda(a.aturan) ? 'ditandai' : 'bertentangan';
    baris.push(`### ${a.aturan} — ${a.judul}`);
    baris.push('');
    baris.push(KALIMAT_AWAM[a.aturan] ?? a.judul);
    baris.push('');
    baris.push(
      `Diperiksa ${angka(a.diperiksa)} ${a.satuan}: ${angka(a.hijau)} tidak bermasalah, ` +
        `${angka(a.merah)} ${kataMerah}, ${angka(a.tidak_lengkap)} datanya tidak cukup untuk memutuskan. ` +
        `${angka(a.dilewati)} ${a.satuan} tidak masuk pemeriksaan ini. ` +
        `Aturannya jalan untuk ${angka(a.emiten_dijalankan)} emiten dan dilewati untuk ${angka(a.emiten_dilewati)}.`,
    );
    if (a.alasan_lewat.length > 0) {
      baris.push('');
      baris.push('Alasan dilewati:');
      for (const alasan of a.alasan_lewat) baris.push(`- ${alasan}`);
    }
    if (a.contoh.length > 0) {
      baris.push('');
      baris.push('Contoh nyata:');
      for (const c of a.contoh) baris.push(`- **${c.simbol}** — ${c.ringkasan}`);
    }
    baris.push('');
  }

  baris.push('## Yang tidak bisa diperiksa dari data ini');
  baris.push('');
  baris.push(
    '- **Parameter permintaan tidak tersimpan.** Gudang menyimpan jawaban, bukan pertanyaannya. ' +
      'Karena itu tidak ada satu emiten pun yang daftar laporannya bisa dinyatakan habis, dan ' +
      'kalimat "emiten ini tidak punya laporan lain" tidak boleh dipakai sebagai kartu.',
  );
  baris.push(
    '- **Respons kosong tidak memuat kode emitennya.** Dua respons kosong dari emiten berbeda ' +
      'identik byte per byte; satu-satunya yang membedakannya adalah nama berkas, dan nama berkas ' +
      'bukan data.',
  );
  baris.push(
    '- **Tanda perjanjian beli kembali hanya ada di PDF.** Selama PDF laporan belum diurai, ' +
      'transaksi yang sebenarnya beli-kembali terbaca sebagai penjualan biasa.',
  );
  baris.push(
    '- **Kenapa sebagian baris harga tidak punya harga pembukaan** (dan sebagian di antaranya ' +
      'juga tidak punya harga tertinggi maupun terendah) tidak terbaca dari data. Baris seperti itu ' +
      'dibuang sebelum dipakai sebagai rentang.',
  );
  baris.push(
    '- **Apakah deret harga ditulis ulang sesudah stock split** tidak bisa ditentukan: dua medan ' +
      'dari endpoint yang sama saling bertentangan. Penyebabnya tidak diketahui.',
  );
  baris.push(
    '- **Daftar suspensi mencatat hari mulai berhenti, bukan tiap harinya**, jadi hari bervolume ' +
      'nol tidak bisa dipastikan suspensi atau bukan.',
  );
  baris.push('');
  baris.push(
    'Berkas ini tidak menilai satu saham pun. Ia hanya mengatakan angka mana yang cocok dengan ' +
      'angka lain di dalam data yang sama, dan angka mana yang tidak.',
  );
  baris.push('');
  return baris.join('\n');
}

function utama(): number {
  const laporan = susunLaporanGudang();

  mkdirSync(`${AKAR}.cache/m2b`, { recursive: true });
  writeFileSync(`${AKAR}.cache/m2b/gudang.json`, keJson(laporan), 'utf8');

  mkdirSync(`${AKAR}docs/bukti`, { recursive: true });
  writeFileSync(`${AKAR}docs/bukti/aturan-gudang.md`, susunDokumenBukti(laporan), 'utf8');

  const r = laporan.ringkasan_gudang;
  console.log('verifikasi:gudang');
  console.log(
    `  berkas ${angka(r.berkas)} | emiten ${angka(r.emiten)} | laporan ${angka(r.laporan_unik)} | ` +
      `baris harga ${angka(r.baris_harga_unik)} | tak dikenal ${angka(laporan.berkas_tak_dikenal.length)}`,
  );
  console.log('');
  console.log('  aturan  satuan                    diperiksa    hijau    merah  tdk.lengkap  dilewati');
  for (const a of laporan.agregat) {
    console.log(
      `  ${a.aturan.padEnd(6)}  ${a.satuan.padEnd(22)}  ${String(a.diperiksa).padStart(9)}` +
        `${String(a.hijau).padStart(9)}${String(a.merah).padStart(9)}` +
        `${String(a.tidak_lengkap).padStart(13)}${String(a.dilewati).padStart(10)}`,
    );
  }
  console.log('');
  console.log('  ditulis: .cache/m2b/gudang.json dan docs/bukti/aturan-gudang.md');
  return 0;
}

const dijalankanLangsung =
  process.argv[1] !== undefined && import.meta.url === pathToFileURL(process.argv[1]).href;
if (dijalankanLangsung) {
  process.exit(utama());
}
