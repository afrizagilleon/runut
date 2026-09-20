// Lengan C — bahan untuk pipeline kita, dibangun dari .cache/sectors/FOLK-*.json.
//
// Berkas ini TIDAK BOLEH mengimpor eval/kunci.ts maupun membaca .cache/kunci/.
// Kalau kunci jawaban bocor ke jalur pembangun, lengan C menang karena menyalin,
// bukan karena verifikasi. Dibuktikan oleh eval/pemisahan.test.ts.
//
// Fakta dibuat dengan aturan umum (harga pada T, harga pembuka jendela, volume
// pada T dibanding rata-rata, seluruh tahun buku yang tersedia, seluruh RUPS
// sebelum T, ada/tidaknya dividen dan suspensi) — BUKAN dengan menyalin daftar
// fakta dari kunci jawaban.

import { verifikasi, type HasilVerifikasi } from '../factory/verifikasi/aturan.ts';
import { hitungSahamBeredar } from '../factory/muat/dada.ts';
import type { BarisHarga, KonteksVerifikasi, Laporan, Suspensi, Transaksi } from '../factory/verifikasi/tipe.ts';
import { angkaId, rupiah, tanggalId } from '../factory/format.ts';
import {
  bacaJson,
  berkasCache,
  kodeTanpaSufiks,
  type BarisSuspensi,
  type BerkasFilings,
  type Filing,
  type HariHarga,
} from './berkas.ts';
import { KASUS } from './prompt.ts';
import type { FaktaKeluaran } from './skema-keluaran.ts';

const BERKAS = {
  filings: 'FOLK-filings.json',
  hargaQ3: 'FOLK-daily-2025q3.json',
  hargaQ4: 'FOLK-daily-2025q4.json',
  overview: 'FOLK-overview.json',
  financials: 'FOLK-financials.json',
  corpactions: 'FOLK-corpactions.json',
  suspensi: 'suspensions-all.json',
} as const;

interface TahunKeuangan {
  year: number;
  revenue: number | null;
  earnings: number | null;
  total_equity: number | null;
}

interface IsiFinancials {
  financials: { historical_financials: TahunKeuangan[] };
}

interface IsiOverview {
  company_name: string;
  overview: { listing_board: string; sub_sector: string; listing_date: string };
}

interface IsiCorpActions {
  corporate_actions: {
    agm: { agm_date: string; agm_result: string | null }[] | null;
    dividend: unknown;
  };
}

function jenisTransaksi(t: string | null): 'beli' | 'jual' {
  return t === 'buy' ? 'beli' : 'jual';
}

function keLaporan(f: Filing, urutan: number): Laporan {
  const transaksi: Transaksi[] = (f.price_transaction ?? []).map((t) => ({
    tanggal: t.date,
    jenis: jenisTransaksi(t.type),
    harga: t.price,
    jumlah: t.amount_transacted,
  }));
  return {
    laporan_id: `fil-${f.timestamp.slice(0, 10)}-${urutan}`,
    simbol: kodeTanpaSufiks(f.symbol),
    pemegang: f.holder_name ?? '(tidak disebut)',
    dilaporkan_pada: f.timestamp,
    jenis: jenisTransaksi(f.transaction_type),
    jumlah: f.amount_transaction ?? 0,
    harga: f.price ?? 0,
    sebelum: f.holding_before ?? 0,
    sesudah: f.holding_after ?? 0,
    persen_sebelum: f.share_percentage_before ?? 0,
    persen_sesudah: f.share_percentage_after ?? 0,
    transaksi,
    teks: f.body ?? '',
    berkas: f.source ?? BERKAS.filings,
  };
}

function keBarisHarga(h: HariHarga): BarisHarga {
  return {
    tanggal: h.date,
    buka: h.open ?? h.close,
    tertinggi: h.high ?? h.close,
    terendah: h.low ?? h.close,
    tutup: h.close,
    volume: h.volume,
    nilai_pasar: h.market_cap ?? 0,
  };
}

export interface DataFolk {
  simbol: string;
  nama: string;
  tanggal_t: string;
  harga: BarisHarga[];
  laporan: Laporan[];
  suspensi: Suspensi[];
  keuangan: TahunKeuangan[];
  rups: { tanggal: string; hasil: string | null }[];
  ada_dividen: boolean;
  saham_beredar: number;
  hari_sepakat: number;
  papan: string;
  sub_sektor: string;
  tanggal_tercatat: string;
}

export function muatFolk(): DataFolk {
  const filings = bacaJson<BerkasFilings>(berkasCache(BERKAS.filings)).results;
  const hargaMentah = [
    ...bacaJson<HariHarga[]>(berkasCache(BERKAS.hargaQ3)),
    ...bacaJson<HariHarga[]>(berkasCache(BERKAS.hargaQ4)),
  ];
  const overview = bacaJson<IsiOverview>(berkasCache(BERKAS.overview));
  const fin = bacaJson<IsiFinancials>(berkasCache(BERKAS.financials));
  const corp = bacaJson<IsiCorpActions>(berkasCache(BERKAS.corpactions));
  const suspensiSemua = bacaJson<BarisSuspensi[]>(berkasCache(BERKAS.suspensi));

  const harga = hargaMentah
    .map(keBarisHarga)
    .sort((a, b) => (a.tanggal < b.tanggal ? -1 : 1))
    .filter((h, i, arr) => i === 0 || arr[i - 1]?.tanggal !== h.tanggal);

  const laporan = filings
    .map((f, i) => keLaporan(f, i + 1))
    .sort((a, b) => (a.dilaporkan_pada < b.dilaporkan_pada ? -1 : 1));

  const suspensi: Suspensi[] = suspensiSemua
    .filter((s) => kodeTanpaSufiks(s.symbol) === KASUS.kode)
    .map((s) => ({ tanggal: s.suspension_date, alasan: s.reason ?? '' }))
    .sort((a, b) => (a.tanggal < b.tanggal ? -1 : 1));

  // Saham beredar dihitung HANYA dari hari bursa sampai T: memakai seluruh
  // deret akan memasukkan hari sesudah T ke dalam angka yang dilihat pemain.
  const beredar = hitungSahamBeredar(harga.filter((h) => h.tanggal <= KASUS.tanggal_t));

  return {
    simbol: KASUS.kode,
    nama: overview.company_name,
    tanggal_t: KASUS.tanggal_t,
    harga,
    laporan,
    suspensi,
    keuangan: [...fin.financials.historical_financials].sort((a, b) => a.year - b.year),
    rups: (corp.corporate_actions.agm ?? []).map((a) => ({ tanggal: a.agm_date, hasil: a.agm_result })),
    ada_dividen: corp.corporate_actions.dividend !== null,
    saham_beredar: beredar.lembar,
    hari_sepakat: beredar.hari_sepakat,
    papan: overview.overview.listing_board,
    sub_sektor: overview.overview.sub_sector,
    tanggal_tercatat: overview.overview.listing_date,
  };
}

export function konteksVerifikasi(data: DataFolk): KonteksVerifikasi {
  return {
    simbol: data.simbol,
    laporan: data.laporan,
    harga: data.harga,
    suspensi: data.suspensi,
    saham_beredar: data.saham_beredar,
    potret: null,
    tanda_repo: {},
  };
}

const SUMBER = {
  harga: '/v2/daily/FOLK/ (.cache/sectors/FOLK-daily-2025q3.json, FOLK-daily-2025q4.json)',
  financials: '/v2/company/report/FOLK/?sections=financials (.cache/sectors/FOLK-financials.json)',
  overview: '/v2/company/report/FOLK/?sections=overview (.cache/sectors/FOLK-overview.json)',
  corpactions: '/v2/company/corporate-actions/FOLK/ (.cache/sectors/FOLK-corpactions.json)',
  suspensi: '/v2/suspensions/ (.cache/sectors/suspensions-all.json)',
  filings: '/v2/filings/?symbol=FOLK (.cache/sectors/FOLK-filings.json)',
  turunan: 'turunan (dihitung dari fakta lain di berkas ini)',
} as const;

function fakta(
  fact_id: string,
  klaim: string,
  nilai: number | string | null,
  satuan: string | null,
  sumber: string,
  tersedia_sejak: string | null,
): FaktaKeluaran {
  return { fact_id, klaim, nilai, satuan, sumber, tersedia_sejak };
}

export interface BahanLenganC {
  terlihat: FaktaKeluaran[];
  sesudahT: FaktaKeluaran[];
  verifikasi: HasilVerifikasi;
  data: DataFolk;
}

/**
 * Bangun fakta dengan aturan umum, lalu saring dengan tanggal ketersediaan.
 * Fakta dengan `tersedia_sejak` sesudah T tidak pernah masuk ke `terlihat`.
 */
export function bahanLenganC(): BahanLenganC {
  const data = muatFolk();
  const T = data.tanggal_t;
  const hasil = verifikasi(konteksVerifikasi(data));

  const hargaSampaiT = data.harga.filter((h) => h.tanggal <= T && h.volume > 0);
  const pertama = hargaSampaiT[0];
  const padaT = hargaSampaiT[hargaSampaiT.length - 1];
  const sebelumT = hargaSampaiT[hargaSampaiT.length - 2];
  if (!pertama || !padaT || !sebelumT) throw new Error('Deret harga sampai T terlalu pendek.');

  const terlihat: FaktaKeluaran[] = [];

  terlihat.push(
    fakta(
      'identitas',
      `${data.nama} (${data.simbol}) tercatat di papan ${data.papan} sejak ${tanggalId(data.tanggal_tercatat)}, sub-sektor ${data.sub_sektor}.`,
      data.simbol,
      null,
      SUMBER.overview,
      data.tanggal_tercatat,
    ),
    fakta(
      'beredar',
      `Jumlah saham beredar ${angkaId(data.saham_beredar)} lembar, dihitung dari nilai pasar dibagi harga penutupan dan konsisten pada ${data.hari_sepakat} hari bursa.`,
      data.saham_beredar,
      'lembar',
      SUMBER.turunan,
      pertama.tanggal,
    ),
    fakta(
      'harga-awal',
      `Harga penutupan ${tanggalId(pertama.tanggal)} adalah ${rupiah(pertama.tutup)} per lembar.`,
      pertama.tutup,
      'rupiah',
      SUMBER.harga,
      pertama.tanggal,
    ),
    fakta(
      'harga-sebelum-t',
      `Harga penutupan ${tanggalId(sebelumT.tanggal)} adalah ${rupiah(sebelumT.tutup)} per lembar.`,
      sebelumT.tutup,
      'rupiah',
      SUMBER.harga,
      sebelumT.tanggal,
    ),
    fakta(
      'harga-t',
      `Harga penutupan ${tanggalId(padaT.tanggal)} adalah ${rupiah(padaT.tutup)} per lembar, dengan harga pembukaan ${rupiah(padaT.buka)}, tertinggi ${rupiah(padaT.tertinggi)}, dan terendah ${rupiah(padaT.terendah)}.`,
      padaT.tutup,
      'rupiah',
      SUMBER.harga,
      padaT.tanggal,
    ),
  );

  const naik = ((padaT.tutup - sebelumT.tutup) / sebelumT.tutup) * 100;
  terlihat.push(
    fakta(
      'lonjakan-harian',
      `Dari ${tanggalId(sebelumT.tanggal)} ke ${tanggalId(padaT.tanggal)} harga penutupan naik ${naik.toFixed(1)} persen dalam satu hari bursa.`,
      Number(naik.toFixed(1)),
      'persen',
      SUMBER.turunan,
      padaT.tanggal,
    ),
  );

  const sepuluhSebelum = hargaSampaiT.slice(-11, -1);
  const rataVolume = sepuluhSebelum.reduce((a, h) => a + h.volume, 0) / (sepuluhSebelum.length || 1);
  terlihat.push(
    fakta(
      'volume-t',
      `Volume perdagangan ${tanggalId(padaT.tanggal)} sebesar ${angkaId(padaT.volume)} lembar, sekitar ${(padaT.volume / rataVolume).toFixed(1)} kali rata-rata volume sepuluh hari bursa sebelumnya.`,
      padaT.volume,
      'lembar',
      SUMBER.harga,
      padaT.tanggal,
    ),
    fakta(
      'nilai-pasar-t',
      `Nilai pasar pada ${tanggalId(padaT.tanggal)} sekitar ${rupiah(Math.round(padaT.tutup * data.saham_beredar))}.`,
      Math.round(padaT.tutup * data.saham_beredar),
      'rupiah',
      SUMBER.turunan,
      padaT.tanggal,
    ),
  );

  // Laporan keuangan: hanya tahun buku yang sudah pasti terbit sebelum T.
  // Tahun buku Y terbit paling cepat pada tahun Y+1, jadi Y <= tahun(T) - 1.
  const tahunT = Number(T.slice(0, 4));
  const terbitPada = (y: number): string => `${y + 1}-01-01`;
  for (const k of data.keuangan.filter((k) => k.year <= tahunT - 1).slice(-3)) {
    const laba = k.earnings ?? 0;
    terlihat.push(
      fakta(
        `fin-${k.year}`,
        `Tahun buku ${k.year}: pendapatan ${rupiah(k.revenue ?? 0)} dan ${laba < 0 ? 'rugi bersih' : 'laba bersih'} ${rupiah(Math.abs(laba))}.`,
        k.revenue ?? 0,
        'rupiah',
        SUMBER.financials,
        terbitPada(k.year),
      ),
    );
  }
  const finTerakhir = data.keuangan.filter((k) => k.year <= tahunT - 1).slice(-1)[0];
  if (finTerakhir?.total_equity != null) {
    terlihat.push(
      fakta(
        'ekuitas',
        `Ekuitas pada tahun buku ${finTerakhir.year} sebesar ${rupiah(finTerakhir.total_equity)}.`,
        finTerakhir.total_equity,
        'rupiah',
        SUMBER.financials,
        terbitPada(finTerakhir.year),
      ),
    );
  }

  const rupsSampaiT = data.rups.filter((r) => r.tanggal <= T);
  terlihat.push(
    fakta(
      'rups',
      rupsSampaiT.length === 0
        ? `Belum ada RUPS yang tercatat sampai ${tanggalId(T)}.`
        : `Sampai ${tanggalId(T)} tercatat ${rupsSampaiT.length} RUPS: ${rupsSampaiT.map((r) => tanggalId(r.tanggal)).join(', ')}${rupsSampaiT.every((r) => r.hasil === null) ? `, dan tidak satu pun hasilnya tercatat di data` : ''}.`,
      rupsSampaiT.length,
      'rups',
      SUMBER.corpactions,
      rupsSampaiT[rupsSampaiT.length - 1]?.tanggal ?? T,
    ),
    fakta(
      'dividen',
      data.ada_dividen
        ? 'Emiten pernah membagikan dividen menurut catatan aksi korporasi.'
        : 'Tidak ada satu pun dividen dalam catatan aksi korporasi emiten ini.',
      data.ada_dividen ? 'ada' : 'tidak ada',
      null,
      SUMBER.corpactions,
      data.tanggal_tercatat,
    ),
  );

  const suspensiSampaiT = data.suspensi.filter((s) => s.tanggal <= T);
  terlihat.push(
    fakta(
      'suspensi',
      suspensiSampaiT.length === 0
        ? `Sampai ${tanggalId(T)} belum ada suspensi perdagangan atas saham ini.`
        : `Sampai ${tanggalId(T)} tercatat ${suspensiSampaiT.length} suspensi perdagangan.`,
      suspensiSampaiT.length,
      'suspensi',
      SUMBER.suspensi,
      T,
    ),
  );

  const laporanSampaiT = data.laporan.filter((l) => l.dilaporkan_pada.slice(0, 10) <= T);
  terlihat.push(
    fakta(
      'laporan-kepemilikan',
      laporanSampaiT.length === 0
        ? `Sampai ${tanggalId(T)} belum ada satu pun laporan transaksi pemegang saham besar yang terbit untuk emiten ini; laporan paling awal baru terbit ${tanggalId(data.laporan[0]?.dilaporkan_pada.slice(0, 10) ?? T)}.`
        : `Sampai ${tanggalId(T)} sudah terbit ${laporanSampaiT.length} laporan transaksi pemegang saham besar.`,
      laporanSampaiT.length,
      'laporan',
      SUMBER.filings,
      T,
    ),
  );

  // Fakta sesudah T: untuk pembukaan saja.
  const sesudahT: FaktaKeluaran[] = [];
  const hargaSesudah = data.harga.filter((h) => h.tanggal > T);
  for (const s of data.suspensi.filter((s) => s.tanggal > T)) {
    const hari = hargaSesudah.find((h) => h.tanggal === s.tanggal);
    sesudahT.push(
      fakta(
        `suspensi-${s.tanggal}`,
        `Pada ${tanggalId(s.tanggal)} perdagangan saham dihentikan bursa${hari ? ` dan volumenya ${angkaId(hari.volume)} lembar` : ''}. Alasan: ${s.alasan}`,
        s.tanggal,
        null,
        SUMBER.suspensi,
        s.tanggal,
      ),
    );
  }
  const bukaLagi = hargaSesudah.find((h) => h.volume > 0);
  if (bukaLagi) {
    sesudahT.push(
      fakta(
        'harga-buka-lagi',
        `Hari bursa pertama dengan perdagangan sesudah ${tanggalId(T)} adalah ${tanggalId(bukaLagi.tanggal)}, ditutup ${rupiah(bukaLagi.tutup)} dengan volume ${angkaId(bukaLagi.volume)} lembar.`,
        bukaLagi.tutup,
        'rupiah',
        SUMBER.harga,
        bukaLagi.tanggal,
      ),
    );
  }
  const tertinggi = hargaSesudah.reduce<BarisHarga | null>((a, h) => (a === null || h.tutup > a.tutup ? h : a), null);
  if (tertinggi) {
    sesudahT.push(
      fakta(
        'harga-tertinggi-sesudah',
        `Harga penutupan tertinggi dalam data sesudah ${tanggalId(T)} terjadi ${tanggalId(tertinggi.tanggal)} di ${rupiah(tertinggi.tutup)} per lembar.`,
        tertinggi.tutup,
        'rupiah',
        SUMBER.harga,
        tertinggi.tanggal,
      ),
    );
  }
  for (const l of data.laporan.slice(0, 3)) {
    sesudahT.push(
      fakta(
        l.laporan_id,
        `Pada ${tanggalId(l.dilaporkan_pada.slice(0, 10))} terbit laporan: ${l.pemegang} ${l.jenis === 'jual' ? 'menjual' : 'membeli'} ${angkaId(l.jumlah)} lembar pada harga ${rupiah(l.harga)}, kepemilikannya berubah dari ${angkaId(l.sebelum)} menjadi ${angkaId(l.sesudah)} lembar (${l.persen_sebelum} persen menjadi ${l.persen_sesudah} persen).`,
        l.jumlah,
        'lembar',
        SUMBER.filings,
        l.dilaporkan_pada.slice(0, 10),
      ),
    );
  }

  const bocor = terlihat.filter((f) => f.tersedia_sejak !== null && f.tersedia_sejak > T);
  if (bocor.length > 0) {
    throw new Error(`Pipeline membocorkan fakta sesudah T: ${bocor.map((f) => f.fact_id).join(', ')}`);
  }

  return { terlihat, sesudahT, verifikasi: hasil, data };
}

/** Bahan yang ditempel ke prompt lengan C, dalam bentuk teks. */
export function bahanSebagaiTeks(bahan: BahanLenganC): string {
  const baris: string[] = [];
  baris.push(`Kasus: ${KASUS.kasus_id}. Emiten ${bahan.data.simbol} (${bahan.data.nama}). T = ${KASUS.tanggal_t}.`);
  baris.push('');
  baris.push('FAKTA TERLIHAT (sudah diverifikasi, tersedia pada atau sebelum T):');
  for (const f of bahan.terlihat) {
    baris.push(
      `- ${f.fact_id} | ${f.klaim} | nilai=${String(f.nilai)} | satuan=${String(f.satuan)} | sumber=${f.sumber} | tersedia_sejak=${String(f.tersedia_sejak)}`,
    );
  }
  baris.push('');
  baris.push('FAKTA SESUDAH-T (hanya untuk pembukaan):');
  for (const f of bahan.sesudahT) {
    baris.push(
      `- ${f.fact_id} | ${f.klaim} | nilai=${String(f.nilai)} | satuan=${String(f.satuan)} | sumber=${f.sumber} | tersedia_sejak=${String(f.tersedia_sejak)}`,
    );
  }
  baris.push('');
  baris.push('TEMUAN VERIFIKASI (salin apa adanya ke "temuan"):');
  if (bahan.verifikasi.temuan.length === 0) {
    baris.push('- (tidak ada temuan)');
  }
  for (const t of bahan.verifikasi.temuan) {
    const angka = t.angka.map((a) => `${a.label}=${a.nilai} ${a.satuan}`).join('; ');
    baris.push(`- aturan=${t.aturan} | ${t.ringkasan} | ${angka}`);
  }
  baris.push('');
  baris.push('CATATAN ATURAN (yang dijalankan dan yang dilewati):');
  for (const p of bahan.verifikasi.pemeriksaan) {
    baris.push(
      `- ${p.aturan} ${p.judul}: ${p.dijalankan ? `dijalankan, ${p.temuan.length} temuan` : `dilewati (${p.alasan_lewat ?? 'tanpa alasan'})`}`,
    );
  }
  return baris.join('\n');
}
