/**
 * Pustaka fakta umum: `DataEmiten` dari pemuat gudang M2a menjadi `Fakta[]`
 * berlabel, untuk emiten apa pun (M4 D-1).
 *
 * Ini jalur kedua, bukan pengganti. `pustakaDada()` di `fakta.ts` tetap
 * membangun kasus DADA apa adanya (INV-A: berkasnya tidak boleh bergeser satu
 * byte pun), dan berkas ini melayani kasus yang datanya datang dari
 * `muatGudang()`.
 *
 * Tiga hal yang dipegang, dan ketiganya sama dengan jalur DADA:
 *
 * 1. **Angka lahir di sini, kata-kata kartu lahir di definisi kasus.** Pemuat
 *    tidak tahu nama samaran emiten; definisi kasus tidak boleh menghitung.
 * 2. **`tersedia_sejak` mengikuti R4**: laporan memakai tanggal laporan,
 *    harga memakai tanggalnya sendiri, dividen memakai tanggal ex.
 * 3. **`diambil_pada` selalu `null`.** Respons penyedia data tidak mencatat
 *    waktu penarikan, dan memakai waktu berkas cache akan membuat berkas kasus
 *    berubah tiap kali dibangun di mesin lain (D-5). Yang dicatat adalah nama
 *    berkas cache-nya, di `parameter.berkas_cache`.
 */
import { angkaId, rupiah, tanggalId } from '../format.ts';
import type { Fakta, Sumber } from '../skema/tipe.ts';
import type { DataEmiten, Laporan } from '../verifikasi/tipe.ts';
import type { AsalGudang } from './gudang.ts';
import type { Pustaka } from './fakta.ts';

/** Fakta sebelum teks kartunya dipasang. */
type FaktaMentah = Omit<Fakta, 'awam'>;

function tanpaAwam(fakta: FaktaMentah): Fakta {
  return { ...fakta, awam: null };
}

/**
 * Endpoint asal tiap jenis berkas, **ditulis di definisi kasus** dan bukan
 * ditebak dari simbolnya.
 *
 * Menyusunnya sendiri dari nama emiten (`/v2/daily/${simbol}/`) akan membuat
 * jejak sumber terlihat pasti padahal ia karangan: alamat yang benar-benar
 * ditarik adalah fakta tentang penarikan itu, bukan tentang emitennya.
 */
export interface EndpointEmiten {
  harga: string;
  laporan: string;
  aksi: string;
  suspensi: string;
}

export interface SumberGudang {
  endpoint: EndpointEmiten;
  /** Parameter permintaan yang tercatat, per jenis. */
  parameter?: Partial<Record<keyof EndpointEmiten, Record<string, string>>>;
  /** Berkas asal tiap baris, dari `muatGudang()`. */
  asal: AsalGudang;
  /**
   * Sebutan yang dipakai di kalimat fakta untuk tiap pemegang saham, misalnya
   * `{ 'Sabana Prawira Widjaja': 'Pemilik terbesar' }`.
   *
   * Bukan kerapian, dan bukan penyembunyian: sumber mengeja orang yang sama
   * dengan dua cara (R22 menemukannya di data sungguhan), sehingga satu orang
   * terbaca sebagai dua. Peran juga yang dibaca pemain di kartu — dan kalimat
   * fakta muncul di panel sumber tepat di bawah kartunya, jadi keduanya harus
   * menyebut pihak yang sama dengan sebutan yang sama.
   *
   * Nama yang tidak ada di peta ini dipakai apa adanya.
   */
  peran?: Record<string, string>;
}

function sumberApi(
  sumber: SumberGudang,
  jenis: keyof EndpointEmiten,
  berkasCache: string | null,
  tambahan: Record<string, string> = {},
): Sumber {
  const tetap = sumber.parameter?.[jenis] ?? {};
  const parameter: Record<string, string> = { ...tetap, ...tambahan };
  /*
   * Berkas cache yang tidak diketahui **tidak ditulis sebagai tebakan**. Satu
   * baris tanpa jejak berkas lebih jujur daripada nama berkas yang kebetulan
   * cocok; panel sumber pemain membaca medan ini apa adanya.
   */
  if (berkasCache !== null) parameter['berkas_cache'] = berkasCache;
  return {
    jenis: 'api',
    endpoint: sumber.endpoint[jenis],
    berkas: null,
    parameter,
    diambil_pada: null,
    keterangan: null,
  };
}

export function sumberTurunan(keterangan: string): Sumber {
  return {
    jenis: 'turunan',
    endpoint: null,
    berkas: null,
    parameter: {},
    diambil_pada: null,
    keterangan,
  };
}

function berkasHarga(sumber: SumberGudang, simbol: string, tanggal: string): string | null {
  return sumber.asal.harga.get(`${simbol}|${tanggal}`) ?? null;
}

/** Lima fakta per hari bursa: tutup, buka, tertinggi, terendah, volume. */
function faktaHarga(data: DataEmiten, sumber: SumberGudang): FaktaMentah[] {
  const fakta: FaktaMentah[] = [];
  for (const h of data.harga) {
    const asal = (): Sumber =>
      sumberApi(sumber, 'harga', berkasHarga(sumber, data.simbol, h.tanggal), {
        tanggal: h.tanggal,
      });
    fakta.push({
      fact_id: `harga-${h.tanggal}`,
      klaim: `Harga penutupan ${tanggalId(h.tanggal)} adalah ${rupiah(h.tutup)} per lembar.`,
      nilai: h.tutup,
      satuan: 'rupiah per lembar',
      sumber: asal(),
      turunan_dari: [],
      tersedia_sejak: h.tanggal,
      status: 'TERVERIFIKASI',
    });
    /*
     * Baris ber-`buka_kosong` tidak melahirkan fakta buka/tertinggi/terendah:
     * nilainya 0 adalah pengganti medan yang kosong, bukan harga. Satu fakta
     * bernilai nol yang terbaca sebagai harga adalah kartu yang berbohong.
     */
    if (h.buka_kosong !== true) {
      fakta.push({
        fact_id: `harga-${h.tanggal}-buka`,
        klaim: `Harga pembukaan ${tanggalId(h.tanggal)} adalah ${rupiah(h.buka)} per lembar.`,
        nilai: h.buka,
        satuan: 'rupiah per lembar',
        sumber: asal(),
        turunan_dari: [],
        tersedia_sejak: h.tanggal,
        status: 'TERVERIFIKASI',
      });
      fakta.push({
        fact_id: `harga-${h.tanggal}-tertinggi`,
        klaim: `Harga tertinggi ${tanggalId(h.tanggal)} adalah ${rupiah(h.tertinggi)} per lembar.`,
        nilai: h.tertinggi,
        satuan: 'rupiah per lembar',
        sumber: asal(),
        turunan_dari: [],
        tersedia_sejak: h.tanggal,
        status: 'TERVERIFIKASI',
      });
      fakta.push({
        fact_id: `harga-${h.tanggal}-terendah`,
        klaim: `Harga terendah ${tanggalId(h.tanggal)} adalah ${rupiah(h.terendah)} per lembar.`,
        nilai: h.terendah,
        satuan: 'rupiah per lembar',
        sumber: asal(),
        turunan_dari: [],
        tersedia_sejak: h.tanggal,
        status: 'TERVERIFIKASI',
      });
    }
    fakta.push({
      fact_id: `volume-${h.tanggal}`,
      klaim: `Volume perdagangan ${tanggalId(h.tanggal)} adalah ${angkaId(h.volume)} lembar.`,
      nilai: h.volume,
      satuan: 'lembar',
      sumber: asal(),
      turunan_dari: [],
      tersedia_sejak: h.tanggal,
      status: 'TERVERIFIKASI',
    });
  }
  return fakta;
}

function faktaSuspensi(data: DataEmiten, sumber: SumberGudang): FaktaMentah[] {
  return data.suspensi.map((s): FaktaMentah => {
    const berkas = sumber.asal.suspensi.get(`${data.simbol}|${s.tanggal}`) ?? null;
    return {
      fact_id: `susp-${s.tanggal}`,
      klaim:
        `Perdagangan saham dihentikan sementara oleh bursa pada ${tanggalId(s.tanggal)}. ` +
        `Alasan resmi: ${s.alasan}. Tanggal pencabutan penghentian ini tidak ada di data, ` +
        'jadi lamanya tidak bisa dipastikan dari sumber mana pun yang dipakai kasus ini.',
      nilai: null,
      satuan: null,
      sumber: sumberApi(sumber, 'suspensi', berkas, { tanggal_suspensi: s.tanggal }),
      turunan_dari: [],
      tersedia_sejak: s.tanggal,
      status: 'TERVERIFIKASI',
    };
  });
}

/**
 * Dua fakta per dividen: nilai per lembarnya, dan tanggal pembayarannya.
 *
 * Tanggal bayar dijadikan fakta sendiri karena ia **angka yang dibaca pemain**
 * di kartu ("Uangnya dibayarkan 22 Mei 2026"), dan setiap angka di teks kartu
 * wajib bisa dibuka sumbernya (INV-4). `dividend_yield` tidak pernah menjadi
 * fakta: ia `null` untuk sebagian dividen, dan yang null diam-diam menjadi nol
 * adalah cara termudah melahirkan kartu yang berbohong.
 */
function faktaDividen(data: DataEmiten, sumber: SumberGudang): FaktaMentah[] {
  const berkas = sumber.asal.aksi.get(data.simbol) ?? null;
  const fakta: FaktaMentah[] = [];
  const pertama = data.dividen[0];
  const terakhir = data.dividen[data.dividen.length - 1];
  /*
   * Satu fakta untuk daftarnya sendiri, dan `jenis: 'api'` bukan `'turunan'`:
   * yang dikatakannya adalah **isi satu medan respons** (`corporate_actions.
   * dividend`), bukan hitungan kami atasnya. Bedanya terbaca pemain — garis
   * kepala lembar yang utuh berarti "ini dokumennya", yang putus-putus berarti
   * "ini hitungan kami" (`docs/desain.md`).
   *
   * Kalimatnya sengaja **tidak** mengatakan "perusahaan selalu membagi
   * dividen": daftar aksi korporasi tidak bisa dibuktikan habis, dan yang bisa
   * dikatakan hanyalah apa yang tercatat di dalamnya.
   */
  if (pertama !== undefined && terakhir !== undefined) {
    fakta.push({
      fact_id: 'dividen-tercatat',
      klaim:
        `Daftar aksi korporasi mencatat ${angkaId(data.dividen.length)} pembagian dividen tunai, ` +
        `dari tanggal ex ${tanggalId(pertama.ex_date)} sampai ${tanggalId(terakhir.ex_date)}. ` +
        'Daftar itu sendiri tidak bisa dibuktikan habis, jadi yang tercatat bukan tentu saja yang pernah terjadi.',
      nilai: data.dividen.length,
      satuan: 'pembagian',
      sumber: sumberApi(sumber, 'aksi', berkas, { bagian: 'dividend' }),
      turunan_dari: [],
      tersedia_sejak: terakhir.ex_date,
      status: 'TERVERIFIKASI',
    });
  }
  for (const d of data.dividen) {
    fakta.push({
      fact_id: `div-${d.ex_date}`,
      klaim: `Dividen tunai ${rupiah(d.nilai_per_lembar)} per lembar dengan tanggal ex ${tanggalId(d.ex_date)}.`,
      nilai: d.nilai_per_lembar,
      satuan: 'rupiah per lembar',
      sumber: sumberApi(sumber, 'aksi', berkas, { bagian: 'dividend', ex_date: d.ex_date }),
      turunan_dari: [],
      tersedia_sejak: d.ex_date,
      status: 'TERVERIFIKASI',
    });
    if (d.tanggal_bayar === null) continue;
    fakta.push({
      fact_id: `div-${d.ex_date}-bayar`,
      klaim:
        `Dividen dengan tanggal ex ${tanggalId(d.ex_date)} dibayarkan ${tanggalId(d.tanggal_bayar)}.`,
      nilai: d.tanggal_bayar,
      satuan: null,
      sumber: sumberApi(sumber, 'aksi', berkas, {
        bagian: 'dividend',
        ex_date: d.ex_date,
        medan: 'payment_date',
      }),
      turunan_dari: [],
      // Tanggal bayar diumumkan bersama dividennya, jadi ia bisa dibaca pada
      // tanggal ex — bukan baru pada hari uangnya keluar.
      tersedia_sejak: d.ex_date,
      status: 'TERVERIFIKASI',
    });
  }
  return fakta;
}

/**
 * Satu fakta per RUPS, **termasuk yang teks keputusannya kosong**.
 *
 * `agm_result` hampir selalu `null` (uji lawan §R23: 115 RUPS, 17 terisi).
 * Membuang yang kosong berarti kasus tidak bisa mengatakan "ada RUPS
 * dijadwalkan, isinya belum ada" — padahal itulah yang benar, dan itulah yang
 * dibutuhkan garis waktu layar pembukaan.
 */
function faktaRups(data: DataEmiten, sumber: SumberGudang): FaktaMentah[] {
  const berkas = sumber.asal.aksi.get(data.simbol) ?? null;
  return data.rups.map((r): FaktaMentah => ({
    fact_id: `rups-${r.tanggal}`,
    klaim:
      r.ringkasan === null
        ? `Rapat umum pemegang saham dijadwalkan ${tanggalId(r.tanggal)}. Teks keputusannya tidak ada di data, jadi isinya tidak bisa dikutip.`
        : `Rapat umum pemegang saham ${tanggalId(r.tanggal)} mencatat keputusan: ${r.ringkasan}`,
    nilai: null,
    satuan: null,
    sumber: sumberApi(sumber, 'aksi', berkas, { bagian: 'agm', tanggal_rups: r.tanggal }),
    turunan_dari: [],
    tersedia_sejak: r.tanggal,
    status: 'TERVERIFIKASI',
  }));
}

function kalimatLaporan(l: Laporan, peran: Record<string, string>): string {
  const siapa = peran[l.pemegang] ?? l.pemegang;
  const arah = l.jenis === 'jual' ? 'penjualan' : 'pembelian';
  const tanggalTransaksi = l.transaksi[0]?.tanggal ?? null;
  const bagianTransaksi =
    tanggalTransaksi === null ? '' : ` atas transaksi ${tanggalId(tanggalTransaksi)}`;
  return (
    `${siapa} melaporkan ${arah} ${angkaId(l.jumlah)} lembar${bagianTransaksi}, ` +
    `dilaporkan ${tanggalId(l.dilaporkan_pada)}. ` +
    `Kepemilikan tercatat berubah dari ${angkaId(l.sebelum)} menjadi ${angkaId(l.sesudah)} lembar, ` +
    `yaitu dari ${angkaId(l.persen_sebelum)} persen menjadi ${angkaId(l.persen_sesudah)} persen saham.`
  );
}

/**
 * Satu fakta per laporan kepemilikan, dinomori per tanggal terbit.
 *
 * Harga yang ditulis laporan **tidak** masuk kalimat fakta di jalur umum ini.
 * Medan `price` sebuah laporan adalah rata-rata tertimbang yang menghitung
 * butir berharga kosong sebagai Rp0 (R17B menemukannya di data sungguhan:
 * Rp910 untuk laporan yang tiap butirnya Rp1.440–Rp1.450). Yang bisa dipegang
 * adalah jumlah lembar dan persennya, dan itulah yang ditulis.
 */
function faktaLaporan(data: DataEmiten, sumber: SumberGudang): FaktaMentah[] {
  const fakta: FaktaMentah[] = [];
  const nomorTanggal = new Map<string, number>();
  for (const l of data.laporan) {
    const tanggal = l.dilaporkan_pada.slice(0, 10);
    const nomor = (nomorTanggal.get(tanggal) ?? 0) + 1;
    nomorTanggal.set(tanggal, nomor);
    fakta.push({
      fact_id: `fil-${tanggal}-${String(nomor).padStart(2, '0')}`,
      klaim: kalimatLaporan(l, sumber.peran ?? {}),
      nilai: l.jumlah,
      satuan: 'lembar',
      sumber: sumberApi(sumber, 'laporan', l.berkas_cache ?? null, { laporan: l.laporan_id }),
      turunan_dari: [],
      tersedia_sejak: tanggal,
      status: 'TERVERIFIKASI',
    });
  }
  return fakta;
}

/**
 * Seluruh fakta yang bisa diturunkan dari data satu emiten di gudang.
 *
 * Belum disaring per kasus: `bangunKasusUmum()` hanya membawa fakta yang
 * benar-benar disebut definisi kasusnya.
 */
export function pustakaGudang(data: DataEmiten, sumber: SumberGudang): Pustaka {
  const kelompok: Array<[string, FaktaMentah[]]> = [
    ['harga', faktaHarga(data, sumber)],
    ['suspensi', faktaSuspensi(data, sumber)],
    ['dividen', faktaDividen(data, sumber)],
    ['rups', faktaRups(data, sumber)],
    ['laporan', faktaLaporan(data, sumber)],
  ];
  const fakta = kelompok.flatMap(([, daftar]) => daftar).map(tanpaAwam);
  const jumlah: Record<string, number> = {};
  for (const [nama, daftar] of kelompok) jumlah[nama] = daftar.length;
  jumlah['seluruhnya'] = fakta.length;
  return { fakta, jumlah };
}
