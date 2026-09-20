/**
 * Ubah data DADA yang sudah dinormalkan menjadi `Fakta[]` berlabel.
 *
 * Satu fakta = satu klaim yang bisa ditunjuk dari teks soal lewat `fact_id`,
 * lengkap dengan sumbernya. `tersedia_sejak` mengikuti R4: laporan memakai
 * tanggal laporan (bukan tanggal transaksi), harga memakai tanggalnya sendiri.
 *
 * `diambil_pada` sengaja `null`: respons penyedia data tidak mencatat waktu
 * penarikan, dan memakai waktu berkas cache akan membuat berkas kasus berubah
 * setiap kali dibangun di mesin lain (D-5). Yang dicatat adalah nama berkas
 * cache-nya, di `parameter.berkas_cache`.
 */
import { angkaId, rupiah, tanggalId } from '../format.ts';
import type { Fakta, Sumber } from '../skema/tipe.ts';
import type { Laporan } from '../verifikasi/tipe.ts';
import { BERKAS, type AsalBerkas, type DataDada } from './dada.ts';

function sumberApi(
  asal: AsalBerkas,
  tambahan: Record<string, string> = {},
  berkasSumber: string | null = null,
): Sumber {
  return {
    jenis: 'api',
    endpoint: asal.endpoint,
    berkas: berkasSumber,
    parameter: { ...asal.parameter, ...tambahan, berkas_cache: asal.berkas },
    diambil_pada: null,
    keterangan: null,
  };
}

function sumberTurunan(keterangan: string): Sumber {
  return {
    jenis: 'turunan',
    endpoint: null,
    berkas: null,
    parameter: {},
    diambil_pada: null,
    keterangan,
  };
}

function idTanggal(iso: string): string {
  return iso.slice(0, 10);
}

/** Fakta harga: satu untuk tiap kolom yang mungkin dipakai kasus. */
function faktaHarga(data: DataDada): Fakta[] {
  const fakta: Fakta[] = [];
  for (const h of data.harga) {
    const asal = BERKAS.harga;
    const sumber = (): Sumber => sumberApi(asal, { tanggal: h.tanggal });
    fakta.push({
      fact_id: `harga-${h.tanggal}`,
      klaim: `Harga penutupan ${tanggalId(h.tanggal)} adalah ${rupiah(h.tutup)} per lembar.`,
      nilai: h.tutup,
      satuan: 'rupiah per lembar',
      sumber: sumber(),
      turunan_dari: [],
      tersedia_sejak: h.tanggal,
      status: 'TERVERIFIKASI',
    });
    fakta.push({
      fact_id: `harga-${h.tanggal}-buka`,
      klaim: `Harga pembukaan ${tanggalId(h.tanggal)} adalah ${rupiah(h.buka)} per lembar.`,
      nilai: h.buka,
      satuan: 'rupiah per lembar',
      sumber: sumber(),
      turunan_dari: [],
      tersedia_sejak: h.tanggal,
      status: 'TERVERIFIKASI',
    });
    fakta.push({
      fact_id: `harga-${h.tanggal}-tertinggi`,
      klaim: `Harga tertinggi ${tanggalId(h.tanggal)} adalah ${rupiah(h.tertinggi)} per lembar.`,
      nilai: h.tertinggi,
      satuan: 'rupiah per lembar',
      sumber: sumber(),
      turunan_dari: [],
      tersedia_sejak: h.tanggal,
      status: 'TERVERIFIKASI',
    });
    fakta.push({
      fact_id: `harga-${h.tanggal}-terendah`,
      klaim: `Harga terendah ${tanggalId(h.tanggal)} adalah ${rupiah(h.terendah)} per lembar.`,
      nilai: h.terendah,
      satuan: 'rupiah per lembar',
      sumber: sumber(),
      turunan_dari: [],
      tersedia_sejak: h.tanggal,
      status: 'TERVERIFIKASI',
    });
    fakta.push({
      fact_id: `volume-${h.tanggal}`,
      klaim: `Volume perdagangan ${tanggalId(h.tanggal)} adalah ${angkaId(h.volume)} lembar.`,
      nilai: h.volume,
      satuan: 'lembar',
      sumber: sumber(),
      turunan_dari: [],
      tersedia_sejak: h.tanggal,
      status: 'TERVERIFIKASI',
    });
  }
  return fakta;
}

function faktaSuspensi(data: DataDada): Fakta[] {
  const asal = BERKAS.suspensi;
  return data.suspensi.map((s): Fakta => ({
    fact_id: `susp-${s.tanggal}`,
    klaim: `Perdagangan saham dihentikan sementara oleh bursa pada ${tanggalId(s.tanggal)}. Alasan resmi: ${s.alasan}.`,
    nilai: null,
    satuan: null,
    sumber: sumberApi(asal, { tanggal_suspensi: s.tanggal }),
    turunan_dari: [],
    // Data suspensi tidak memuat tanggal pengumuman terpisah; yang ada hanya
    // tanggal suspensi itu sendiri. Itulah yang dipakai, tanpa menebak.
    tersedia_sejak: s.tanggal,
    status: 'TERVERIFIKASI',
  }));
}

function faktaDividen(data: DataDada): Fakta[] {
  const asal = BERKAS.aksiKorporasi;
  return data.dividen.map((d): Fakta => ({
    fact_id: `div-${d.ex_date}`,
    klaim: `Dividen tunai ${rupiah(d.nilai_per_lembar)} per lembar dengan tanggal ex ${tanggalId(d.ex_date)}.`,
    nilai: d.nilai_per_lembar,
    satuan: 'rupiah per lembar',
    sumber: sumberApi(asal, { bagian: 'dividend', ex_date: d.ex_date }),
    turunan_dari: [],
    tersedia_sejak: d.ex_date,
    status: 'TERVERIFIKASI',
  }));
}

function faktaRups(data: DataDada): Fakta[] {
  const asal = BERKAS.aksiKorporasi;
  const fakta: Fakta[] = [];
  for (const r of data.rups) {
    if (r.kuorum_persen === null) continue;
    fakta.push({
      fact_id: `rups-${r.tanggal}-kuorum`,
      klaim: `RUPS ${tanggalId(r.tanggal)} tidak mencapai kuorum: yang hadir hanya ${angkaId(r.kuorum_persen)} persen dari seluruh saham, sehingga tidak ada agenda yang bisa diputuskan.`,
      nilai: r.kuorum_persen,
      satuan: 'persen',
      sumber: sumberApi(asal, { bagian: 'agm', tanggal_rups: r.tanggal }),
      turunan_dari: [],
      tersedia_sejak: r.tanggal,
      status: 'TERVERIFIKASI',
    });
  }
  return fakta;
}

function asalLaporan(laporan: Laporan, data: DataDada): AsalBerkas {
  const asal = data.asal_laporan.get(laporan.laporan_id);
  if (asal === undefined) {
    throw new Error(
      `Laporan "${laporan.laporan_id}" tidak punya catatan berkas cache asal; jejak sumbernya tidak boleh ditebak.`,
    );
  }
  return asal;
}

function kalimatLaporan(l: Laporan): string {
  const arah = l.jenis === 'jual' ? 'penjualan' : 'pembelian';
  const tanggalTransaksi = l.transaksi[0]?.tanggal ?? null;
  const bagianTransaksi =
    tanggalTransaksi === null ? '' : ` atas transaksi ${tanggalId(tanggalTransaksi)}`;
  return (
    `${l.pemegang} melaporkan ${arah} ${angkaId(l.jumlah)} lembar pada harga ${rupiah(l.harga)}` +
    `${bagianTransaksi}, dilaporkan ${tanggalId(l.dilaporkan_pada)}. ` +
    `Kepemilikan tercatat berubah dari ${angkaId(l.sebelum)} menjadi ${angkaId(l.sesudah)} lembar.`
  );
}

/** Satu fakta per laporan, plus satu fakta gabungan per tanggal laporan. */
function faktaLaporan(data: DataDada): Fakta[] {
  const fakta: Fakta[] = [];
  const perTanggal = new Map<string, Laporan[]>();
  const semua = [...data.laporan2025, ...data.laporan2026];

  for (const l of semua) {
    const tanggal = idTanggal(l.dilaporkan_pada);
    const daftar = perTanggal.get(tanggal);
    if (daftar === undefined) perTanggal.set(tanggal, [l]);
    else daftar.push(l);
  }

  for (const [tanggal, daftar] of perTanggal) {
    const idAnak: string[] = [];
    for (const [nomor, l] of daftar.entries()) {
      const fact_id = `fil-${tanggal}-${String(nomor + 1).padStart(2, '0')}`;
      idAnak.push(fact_id);
      fakta.push({
        fact_id,
        klaim: kalimatLaporan(l),
        nilai: l.jumlah,
        satuan: 'lembar',
        sumber: sumberApi(asalLaporan(l, data), { laporan: l.laporan_id }, l.berkas),
        turunan_dari: [],
        tersedia_sejak: tanggal,
        status: 'TERVERIFIKASI',
      });
    }

    const pertama = daftar[0];
    const terakhir = daftar[daftar.length - 1];
    if (pertama === undefined || terakhir === undefined) continue;
    const total = daftar.reduce((jumlah, l) => jumlah + l.jumlah, 0);
    const hargaTerendah = Math.min(...daftar.map((l) => l.harga));
    const hargaTertinggi = Math.max(...daftar.map((l) => l.harga));
    const rentang =
      hargaTerendah === hargaTertinggi
        ? rupiah(hargaTerendah)
        : `${rupiah(hargaTerendah)}–${rupiah(hargaTertinggi)}`;
    const arah = daftar.every((l) => l.jenis === 'jual')
      ? 'penjualan'
      : daftar.every((l) => l.jenis === 'beli')
        ? 'pembelian'
        : 'transaksi';
    fakta.push({
      fact_id: `fil-${tanggal}`,
      klaim:
        `Pada ${tanggalId(tanggal)} pengendali melaporkan ${angkaId(daftar.length)} ${arah}, ` +
        `seluruhnya ${angkaId(total)} lembar pada harga ${rentang}. ` +
        `Kepemilikan tercatat bergerak dari ${angkaId(pertama.sebelum)} ke ${angkaId(terakhir.sesudah)} lembar.`,
      nilai: total,
      satuan: 'lembar',
      sumber: sumberTurunan(
        `penjumlahan ${String(daftar.length)} laporan bertanggal ${tanggal} dari /v2/filings/`,
      ),
      turunan_dari: idAnak,
      tersedia_sejak: tanggal,
      status: 'TERVERIFIKASI',
    });
  }

  return fakta;
}

function faktaSahamBeredar(data: DataDada): Fakta {
  const awal = data.harga[0];
  const beredar = data.saham_beredar;
  return {
    fact_id: 'saham-beredar',
    klaim: `Jumlah saham beredar ${angkaId(beredar.lembar)} lembar, dihitung dari nilai pasar dibagi harga penutupan; angka yang sama muncul di ${angkaId(beredar.hari_sepakat)} hari bursa.`,
    nilai: beredar.lembar,
    satuan: 'lembar',
    sumber: sumberTurunan(
      'nilai pasar dibagi harga penutupan pada tiap hari bursa di /v2/daily/DADA/',
    ),
    turunan_dari: awal === undefined ? [] : [`harga-${awal.tanggal}`],
    tersedia_sejak: awal?.tanggal ?? null,
    status: 'TERVERIFIKASI',
  };
}

/** Fakta turunan: berapa hari bursa dan berapa kali lipat harga naik dari `dari` ke `sampai`. */
export function faktaKenaikan(data: DataDada, dari: string, sampai: string): Fakta[] {
  const jendela = data.harga.filter((h) => h.tanggal >= dari && h.tanggal <= sampai);
  const awal = jendela[0];
  const akhir = jendela[jendela.length - 1];
  if (awal === undefined || akhir === undefined) {
    throw new Error(`Tidak ada data harga antara ${dari} dan ${sampai}.`);
  }
  const kelipatan = Number((akhir.tutup / awal.tutup).toFixed(2));
  return [
    {
      fact_id: `hari-bursa-${dari}-${sampai}`,
      klaim: `Dari ${tanggalId(awal.tanggal)} sampai ${tanggalId(akhir.tanggal)} ada ${angkaId(jendela.length)} hari bursa, dan harga penutupan naik pada sebagian besar di antaranya.`,
      nilai: jendela.length,
      satuan: 'hari bursa',
      sumber: sumberTurunan(`penghitungan baris harga harian antara ${dari} dan ${sampai}`),
      turunan_dari: [`harga-${awal.tanggal}`, `harga-${akhir.tanggal}`],
      tersedia_sejak: akhir.tanggal,
      status: 'TERVERIFIKASI',
    },
    {
      fact_id: `kelipatan-${dari}-${sampai}`,
      klaim: `Harga penutupan naik ${angkaId(kelipatan)} kali lipat, dari ${rupiah(awal.tutup)} menjadi ${rupiah(akhir.tutup)}.`,
      nilai: kelipatan,
      satuan: 'kali',
      sumber: sumberTurunan(
        `harga penutupan ${sampai} dibagi harga penutupan ${dari}`,
      ),
      turunan_dari: [`harga-${awal.tanggal}`, `harga-${akhir.tanggal}`],
      tersedia_sejak: akhir.tanggal,
      status: 'TERVERIFIKASI',
    },
  ];
}

export interface Pustaka {
  fakta: Fakta[];
  /** Jumlah fakta per jenis, untuk dicetak dan diperiksa. */
  jumlah: Record<string, number>;
}

/** Seluruh fakta yang bisa diturunkan dari cache DADA, belum disaring per kasus. */
export function pustakaDada(data: DataDada): Pustaka {
  const kelompok: Array<[string, Fakta[]]> = [
    ['harga', faktaHarga(data)],
    ['suspensi', faktaSuspensi(data)],
    ['dividen', faktaDividen(data)],
    ['rups', faktaRups(data)],
    ['laporan', faktaLaporan(data)],
    ['turunan', [faktaSahamBeredar(data)]],
  ];
  const fakta = kelompok.flatMap(([, daftar]) => daftar);
  const jumlah: Record<string, number> = {};
  for (const [nama, daftar] of kelompok) jumlah[nama] = daftar.length;
  jumlah['seluruhnya'] = fakta.length;
  return { fakta, jumlah };
}

/** Cari satu fakta; melempar dengan menyebut id kalau tidak ada (INV-6). */
export function ambilFakta(fakta: Fakta[], fact_id: string): Fakta {
  const cocok = fakta.find((f) => f.fact_id === fact_id);
  if (cocok === undefined) {
    throw new Error(
      `fact_id "${fact_id}" tidak ada di pustaka fakta; kasus tidak bisa dibangun dengan id menggantung.`,
    );
  }
  return cocok;
}
