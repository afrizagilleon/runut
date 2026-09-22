/**
 * Fakta turunan untuk jalur kasus umum (M4 D-1).
 *
 * Empat bentuk, dan semuanya **menghitung dari fakta yang sudah ada di
 * pustaka** — tidak ada satu angka pun yang ditulis di sini maupun di definisi
 * kasus. `turunan_dari` membuat statusnya ikut bergerak kalau fakta asalnya
 * ternyata tersangkut temuan: penjumlahan yang memuat laporan bermasalah ikut
 * bermasalah.
 *
 * Kenapa bentuk-bentuk ini dan bukan satu fungsi serba bisa: tiap bentuk
 * menulis kalimat klaimnya sendiri, dan kalimat itulah yang dibaca pemain di
 * panel sumber. Satu fungsi dengan kalimat yang diserahkan pemanggil akan
 * mengembalikan kalimat ke definisi kasus — tempat angka tidak boleh ditulis.
 */
import { angkaId, rupiah, tanggalId } from '../format.ts';
import type { Fakta } from '../skema/tipe.ts';
import type { DataEmiten } from '../verifikasi/tipe.ts';
import { ambilFakta } from './fakta.ts';
import { sumberTurunan } from './pustaka-gudang.ts';

function nilaiAngka(fakta: Fakta, untuk: string): number {
  if (typeof fakta.nilai !== 'number') {
    throw new Error(
      `Fakta "${fakta.fact_id}" tidak punya nilai angka, jadi ${untuk} tidak bisa dihitung darinya.`,
    );
  }
  return fakta.nilai;
}

/** Tanggal terbit paling akhir di antara fakta asal; `null` kalau tak satu pun punya. */
function terbitTerakhir(asal: Fakta[]): string | null {
  const tanggal = asal
    .map((f) => f.tersedia_sejak)
    .filter((t): t is string => t !== null)
    .sort();
  return tanggal[tanggal.length - 1] ?? null;
}

export interface Selisih {
  fact_id: string;
  /** Fakta yang dikurangi. */
  dari: string;
  /** Fakta pengurang. */
  kurangi: string;
  /** Satuan hasilnya; menentukan juga cara angkanya ditulis di klaim. */
  satuan: 'rupiah per lembar' | 'rupiah' | 'lembar';
  /** Apa yang sedang dibandingkan, dalam bahasa orang: "turunnya harga hari ini". */
  sebutan: string;
}

function tulisAngka(nilai: number, satuan: Selisih['satuan']): string {
  return satuan === 'lembar' ? `${angkaId(nilai)} lembar` : rupiah(nilai);
}

/**
 * Selisih dua fakta berangka, misalnya "turunnya harga dikurangi dividen".
 *
 * Nilainya dihitung, bukan ditulis; klaimnya mengeja pengurangannya utuh
 * supaya panel "Lihat cara menghitungnya" tidak perlu menambahkan apa pun.
 */
export function faktaSelisih(pustaka: Fakta[], s: Selisih): Fakta {
  const a = ambilFakta(pustaka, s.dari);
  const b = ambilFakta(pustaka, s.kurangi);
  const nilaiA = nilaiAngka(a, s.sebutan);
  const nilaiB = nilaiAngka(b, s.sebutan);
  const hasil = nilaiA - nilaiB;
  return {
    fact_id: s.fact_id,
    klaim:
      `${s.sebutan}: ${tulisAngka(nilaiA, s.satuan)} dikurangi ` +
      `${tulisAngka(nilaiB, s.satuan)} sama dengan ${tulisAngka(hasil, s.satuan)}.`,
    nilai: hasil,
    satuan: s.satuan,
    sumber: sumberTurunan(`pengurangan dua angka yang keduanya ada di kartu ini`),
    turunan_dari: [s.dari, s.kurangi],
    tersedia_sejak: terbitTerakhir([a, b]),
    status: 'TERVERIFIKASI',
    awam: null,
  };
}

export interface Penjumlahan {
  fact_id: string;
  dari: string[];
  satuan: 'lembar' | 'rupiah';
  /** Apa yang dijumlahkan, dalam bahasa orang: "tambahan lembar dua orang dalam". */
  sebutan: string;
}

/** Penjumlahan beberapa fakta berangka; klaimnya mengeja tiap sukunya. */
export function faktaJumlah(pustaka: Fakta[], j: Penjumlahan): Fakta {
  const asal = j.dari.map((id) => ambilFakta(pustaka, id));
  const nilai = asal.map((f) => nilaiAngka(f, j.sebutan));
  const total = nilai.reduce((a, b) => a + b, 0);
  const satuanKata = j.satuan === 'lembar' ? 'lembar' : 'rupiah';
  return {
    fact_id: j.fact_id,
    klaim:
      `${j.sebutan}: ${nilai.map((n) => angkaId(n)).join(' + ')} = ` +
      `${angkaId(total)} ${satuanKata}.`,
    nilai: total,
    satuan: j.satuan,
    sumber: sumberTurunan(`penjumlahan ${angkaId(asal.length)} angka yang masing-masing punya sumbernya sendiri`),
    turunan_dari: [...j.dari],
    tersedia_sejak: terbitTerakhir(asal),
    status: 'TERVERIFIKASI',
    awam: null,
  };
}

export interface Hitungan {
  fact_id: string;
  dari: string[];
  /** Benda yang dihitung, tunggal: "laporan", "tahun". */
  satuan: string;
  /** Kalimatnya: "Laporan pemilik terbesar yang terbit Januari". */
  sebutan: string;
}

/**
 * Berapa banyak fakta asal ada — "dua laporan", "tujuh tahun".
 *
 * Ada karena bilangan pun angka: `[[…|dua pembelian]]` di teks kartu harus
 * bisa dibuka sumbernya seperti angka lain (INV-4), dan yang menjawab "dua
 * dari mana" adalah daftar fakta asalnya sendiri.
 */
export function faktaHitung(pustaka: Fakta[], h: Hitungan): Fakta {
  const asal = h.dari.map((id) => ambilFakta(pustaka, id));
  return {
    fact_id: h.fact_id,
    klaim: `${h.sebutan}: ${angkaId(asal.length)} ${h.satuan}.`,
    nilai: asal.length,
    satuan: h.satuan,
    sumber: sumberTurunan('penghitungan dokumen yang masing-masing punya sumbernya sendiri'),
    turunan_dari: [...h.dari],
    tersedia_sejak: terbitTerakhir(asal),
    status: 'TERVERIFIKASI',
    awam: null,
  };
}

export interface JendelaPemegang {
  /** Awalan fact_id; empat fakta lahir darinya. */
  fact_id: string;
  /** Nama pemegang seperti tertulis di laporan. */
  pemegang: string;
  /** Rentang tanggal laporan, inklusif (ISO). */
  dari: string;
  sampai: string;
  /** Sebutan pihaknya di kalimat fakta, misalnya "Pemilik terbesar". */
  peran: string;
}

export interface HasilPemegang {
  fakta: Fakta[];
  /** fact_id tiap laporan yang ikut, urut waktu. */
  laporan: string[];
}

/**
 * Empat fakta tentang satu pemegang saham di satu rentang tanggal laporan:
 * berapa lembar ia menambah/mengurangi, lewat berapa laporan, dan porsinya
 * bergerak dari berapa ke berapa.
 *
 * Kenapa empat dan bukan satu: sebuah `Fakta` punya **satu** `nilai`, dan teks
 * kartu harus bisa menautkan tiap angka yang disebutnya sendiri. "Porsinya
 * bergerak dari 53,16% ke 53,17%" adalah dua angka, dan keduanya harus bisa
 * dibuka.
 *
 * `laporan` yang dikembalikan adalah fact_id laporan yang ikut, sehingga
 * definisi kasus bisa menautkan laporan pertama dan terakhir tanpa menghitung
 * nomornya sendiri.
 */
export function faktaPemegangJendela(
  data: DataEmiten,
  pustaka: Fakta[],
  j: JendelaPemegang,
): HasilPemegang {
  const nomorTanggal = new Map<string, number>();
  const terpilih: Array<{ id: string; laporan: DataEmiten['laporan'][number] }> = [];
  for (const l of data.laporan) {
    const tanggal = l.dilaporkan_pada.slice(0, 10);
    const nomor = (nomorTanggal.get(tanggal) ?? 0) + 1;
    nomorTanggal.set(tanggal, nomor);
    if (l.pemegang !== j.pemegang) continue;
    if (tanggal < j.dari || tanggal > j.sampai) continue;
    terpilih.push({ id: `fil-${tanggal}-${String(nomor).padStart(2, '0')}`, laporan: l });
  }

  const pertama = terpilih[0];
  const terakhir = terpilih[terpilih.length - 1];
  if (pertama === undefined || terakhir === undefined) {
    throw new Error(
      `Tidak ada laporan "${j.pemegang}" antara ${j.dari} dan ${j.sampai}; ` +
        'kasus tidak boleh menjumlahkan kumpulan yang kosong.',
    );
  }

  const idLaporan = terpilih.map((x) => x.id);
  const asal = idLaporan.map((id) => ambilFakta(pustaka, id));
  const total = terpilih.reduce((jumlah, x) => jumlah + x.laporan.jumlah, 0);
  const arah = terpilih.every((x) => x.laporan.jenis === 'beli')
    ? 'menambah'
    : terpilih.every((x) => x.laporan.jenis === 'jual')
      ? 'mengurangi'
      : 'menggerakkan';
  const terbit = terbitTerakhir(asal);
  const rentang = `${tanggalId(pertama.laporan.dilaporkan_pada)}–${tanggalId(terakhir.laporan.dilaporkan_pada)}`;
  const dasarSumber = `laporan ${j.peran.toLowerCase()} yang terbit ${rentang}`;

  const fakta: Fakta[] = [
    {
      fact_id: j.fact_id,
      klaim:
        `${j.peran} ${arah} ${angkaId(total)} lembar lewat ${angkaId(terpilih.length)} laporan ` +
        `yang terbit ${rentang}.`,
      nilai: total,
      satuan: 'lembar',
      sumber: sumberTurunan(`penjumlahan ${dasarSumber}`),
      turunan_dari: idLaporan,
      tersedia_sejak: terbit,
      status: 'TERVERIFIKASI',
      awam: null,
    },
    {
      fact_id: `${j.fact_id}-laporan`,
      klaim: `${j.peran} menerbitkan ${angkaId(terpilih.length)} laporan dalam rentang ${rentang}.`,
      nilai: terpilih.length,
      satuan: 'laporan',
      sumber: sumberTurunan(`penghitungan ${dasarSumber}`),
      turunan_dari: idLaporan,
      tersedia_sejak: terbit,
      status: 'TERVERIFIKASI',
      awam: null,
    },
    {
      fact_id: `${j.fact_id}-persen-awal`,
      klaim:
        `Sebelum laporan pertamanya, ${j.peran.toLowerCase()} tercatat memegang ` +
        `${angkaId(pertama.laporan.persen_sebelum)} persen saham.`,
      nilai: pertama.laporan.persen_sebelum,
      satuan: 'persen',
      sumber: sumberTurunan(`medan porsi sebelum transaksi di laporan pertama dalam rentang itu`),
      turunan_dari: [pertama.id],
      tersedia_sejak: pertama.laporan.dilaporkan_pada.slice(0, 10),
      status: 'TERVERIFIKASI',
      awam: null,
    },
    {
      fact_id: `${j.fact_id}-persen-akhir`,
      klaim:
        `Sesudah laporan terakhirnya, ${j.peran.toLowerCase()} tercatat memegang ` +
        `${angkaId(terakhir.laporan.persen_sesudah)} persen saham.`,
      nilai: terakhir.laporan.persen_sesudah,
      satuan: 'persen',
      sumber: sumberTurunan(`medan porsi sesudah transaksi di laporan terakhir dalam rentang itu`),
      turunan_dari: [terakhir.id],
      tersedia_sejak: terakhir.laporan.dilaporkan_pada.slice(0, 10),
      status: 'TERVERIFIKASI',
      awam: null,
    },
  ];

  return { fakta, laporan: idLaporan };
}
