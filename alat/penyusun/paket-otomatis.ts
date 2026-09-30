/**
 * Paket fakta untuk emiten + tanggal pilihan penyusun (M2d-9 D-4).
 *
 * Paket dibangun oleh pembangun yang SAMA dengan lingkar M2d
 * (`factory/llm/paket.ts` `bangunPaket`: `dataSampai(T)` → pustaka gudang →
 * 33 aturan V2 → hanya fakta TERVERIFIKASI, terbit ≤ T, kalimat tanpa tanggal
 * sesudah T). Yang dibuat di sini hanyalah DEFINISI paketnya:
 *
 * - (simbol, T) yang punya definisi kurasi M2d (`DEFINISI_PAKET`: DADA, ULTJ,
 *   TIRT) memakai definisi itu apa adanya — jalan lewat pintu sebanding dengan
 *   jalan M2d-5…M2d-8;
 * - selain itu definisi OTOMATIS dengan aturan tetap (`ATURAN_CALON`), dari
 *   data ≤ T saja.
 */
import { tanggalId } from '../../factory/format.ts';
import { dataSampai } from '../../factory/kasus/bangun.ts';
import type { Gudang as GudangMuat } from '../../factory/muat/gudang.ts';
import { pustakaGudang, type SumberGudang } from '../../factory/muat/pustaka-gudang.ts';
import { faktaSelisih } from '../../factory/muat/turunan-gudang.ts';
import {
  DEFINISI_PAKET,
  bangunPaket,
  faktaHariNaik,
  faktaKelipatan,
  type DefinisiPaket,
  type Gudang as GudangPaket,
  type PaketFakta,
} from '../../factory/llm/paket.ts';
import type { Fakta } from '../../factory/skema/tipe.ts';
import type { DataEmiten } from '../../factory/verifikasi/tipe.ts';
import { hariBursaEmiten, peristiwaKandidat, tambahHari, type JenisPeristiwa } from './usulan.ts';

export const ATURAN_CALON: readonly string[] = [
  'penghentian sementara ≤ T dalam 365 hari terakhir (paling baru 3)',
  'harga penutupan T, hari bursa sebelumnya, hari bertransaksi terakhir ≤ T ("akhir") dan hari bertransaksi ≥ 10 hari bursa sebelumnya ("awal"); volume T dan hari sebelumnya',
  'harga tiap hari runtun kenaikan (≥ 3 kenaikan) yang berakhir di T atau sehari sebelumnya',
  'dividen tunai ≤ T dalam 730 hari terakhir (paling baru 3) + tanggal bayarnya + daftar dividen tercatat',
  'RUPS ≤ T dalam 180 hari terakhir (paling baru 2)',
  'laporan kepemilikan ≤ T dalam 90 hari terakhir (paling baru 6); nama pemegang diganti "Pemegang saham A/B/…"',
  'hitungan: kelipatan dan selisih harga penutupan "awal" → "akhir"; jumlah hari naik beruntun',
];

export interface PilihanPaket {
  def: DefinisiPaket;
  sumber: 'kurasi' | 'otomatis';
  keterangan: string;
}

function gudangPaket(g: GudangMuat): GudangPaket {
  return { emiten: g.emiten, asal: g.asal, kosong: g.berkas.filter((b) => b.jenis === 'paginasi-kosong').map((b) => b.berkas) };
}

/** Kata inti nama perusahaan ("PT Tirta Mahakam Resources Tbk" → "Tirta Mahakam"). */
export function intiNama(nama: string): string | null {
  const kata = nama
    .replace(/\(.*?\)/g, ' ')
    .replace(/[.,]/g, ' ')
    .split(/\s+/)
    .filter((k) => k !== '' && !/^(pt|tbk|persero)$/i.test(k));
  return kata.length >= 2 ? `${kata[0]} ${kata[1]}` : (kata[0] ?? null);
}

const KALIMAT_PERISTIWA: Readonly<Record<JenisPeristiwa, string>> = {
  suspensi: 'Hari ini bursa menghentikan sementara perdagangan saham perusahaan.',
  lonjakan: 'Harga penutupan sahamnya naik beberapa hari bursa berturut-turut sampai hari ini.',
  'ex-dividen': 'Hari ini tanggal ex dividen tunai perusahaan.',
  'laporan-orang-dalam': 'Hari ini terbit laporan kepemilikan saham orang dalam perusahaan.',
};

function huruf(i: number): string {
  return String.fromCharCode(65 + (i % 26)) + (i >= 26 ? String(Math.floor(i / 26)) : '');
}

/** Runtun kenaikan penutupan yang berakhir di `akhir` (daftar tanggal, urut), atau [] bila < 3 kenaikan. */
function runtunNaik(data: DataEmiten, akhir: string): string[] {
  const harga = [...data.harga].sort((a, b) => a.tanggal.localeCompare(b.tanggal));
  let i = harga.findIndex((h) => h.tanggal === akhir);
  if (i < 0) return [];
  const keluar = [akhir];
  while (i > 0) {
    const kini = harga[i];
    const kemarin = harga[i - 1];
    if (kini === undefined || kemarin === undefined || !(kini.tutup > kemarin.tutup)) break;
    keluar.unshift(kemarin.tanggal);
    i--;
  }
  return keluar.length >= 4 ? keluar.slice(-11) : [];
}

/** Definisi otomatis untuk (simbol, T). Hanya membaca data ≤ T. */
export function definisiOtomatis(simbol: string, tanggal: string, penuh: DataEmiten): DefinisiPaket {
  const d = dataSampai(penuh, tanggal);
  const hari = hariBursaEmiten(d);
  const iT = hari.indexOf(tanggal);
  if (iT < 0) throw new Error(`Tidak ada harga ${simbol} pada ${tanggal}.`);
  const kemarin = hari[iT - 1] ?? null;
  // Hitungan harga memakai hari BERTRANSAKSI (volume > 0): harga hari tanpa transaksi ditandai R19a
  // dan disingkirkan pembangun paket. "akhir" = hari bertransaksi terakhir ≤ T; "awal" = hari
  // bertransaksi terakhir yang ≥ 10 hari bursa sebelum "akhir".
  const volume = new Map(d.harga.map((h) => [h.tanggal, h.volume]));
  const bertransaksi = hari.filter((t) => (volume.get(t) ?? 0) > 0);
  const akhir = bertransaksi.at(-1) ?? tanggal;
  const iAkhir = hari.indexOf(akhir);
  const awal = bertransaksi.filter((t) => hari.indexOf(t) <= iAkhir - 10).at(-1) ?? akhir;
  const setahun = tambahHari(tanggal, -365);

  const laporanDipakai = d.laporan
    .filter((l) => l.dilaporkan_pada.slice(0, 10) >= tambahHari(tanggal, -90))
    .sort((a, b) => b.dilaporkan_pada.localeCompare(a.dilaporkan_pada))
    .slice(0, 6);
  const peran: Record<string, string> = {};
  const namaUrut = [...laporanDipakai.map((l) => l.pemegang), ...d.laporan.map((l) => l.pemegang)];
  for (const n of namaUrut) if (peran[n] === undefined && !/^public$/i.test(n)) peran[n] = `Pemegang saham ${huruf(Object.keys(peran).length)}`;

  const sumber: SumberGudang = {
    endpoint: { harga: `/v2/daily/${simbol}/`, laporan: '/v2/filings/', aksi: `/v2/company/corporate-actions/${simbol}/`, suspensi: '/v2/suspensions/' },
    asal: { harga: new Map(), suspensi: new Map(), aksi: new Map(), ringkasan: new Map(), kepemilikan: new Map() },
    peran,
  };
  const ada = new Set(pustakaGudang(d, sumber).fakta.map((f) => f.fact_id));
  const calon: string[] = [];
  const tambah = (id: string): void => {
    if (ada.has(id) && !calon.includes(id)) calon.push(id);
  };

  for (const s of d.suspensi.filter((x) => x.tanggal >= setahun).sort((a, b) => b.tanggal.localeCompare(a.tanggal)).slice(0, 3)) tambah(`susp-${s.tanggal}`);
  const naikT = runtunNaik(d, tanggal);
  const naik = naikT.length > 0 ? naikT : kemarin === null ? [] : runtunNaik(d, kemarin);
  for (const t of [...new Set([awal, akhir, ...naik, kemarin, tanggal])].filter((x): x is string => x !== null).sort()) tambah(`harga-${t}`);
  for (const t of [kemarin, tanggal]) if (t !== null) tambah(`volume-${t}`);
  const dividen = d.dividen.filter((x) => x.ex_date >= tambahHari(tanggal, -730)).sort((a, b) => b.ex_date.localeCompare(a.ex_date)).slice(0, 3);
  for (const x of dividen) {
    tambah(`div-${x.ex_date}`);
    tambah(`div-${x.ex_date}-bayar`);
  }
  if (dividen.length > 0) tambah('dividen-tercatat');
  for (const r of d.rups.filter((x) => x.tanggal >= tambahHari(tanggal, -180)).sort((a, b) => b.tanggal.localeCompare(a.tanggal)).slice(0, 2)) tambah(`rups-${r.tanggal}`);
  const idLaporan = [...ada].filter((id) => id.startsWith('fil-') && id.slice(4, 14) >= tambahHari(tanggal, -90)).sort().reverse().slice(0, 6);
  for (const id of idLaporan) tambah(id);

  const jenisT = peristiwaKandidat(penuh).peristiwa.filter((p) => p.t === tanggal).map((p) => p.jenis);
  const kalimat = [...new Set(jenisT)].map((j) => KALIMAT_PERISTIWA[j]);
  if (kalimat.length === 0) kalimat.push('Hari bursa tanpa peristiwa besar; yang tersedia hanya harga dan pengumuman perusahaan sebelum hari ini.');
  if (d.suspensi.some((s) => s.tanggal < tanggal && s.tanggal >= setahun)) kalimat.push('Dalam setahun terakhir bursa juga pernah menghentikan sementara perdagangannya.');
  if (dividen.length > 0) kalimat.push('Perusahaan tercatat membagi dividen tunai.');
  if (idLaporan.length > 0) kalimat.push('Ada laporan kepemilikan saham dalam tiga bulan terakhir.');

  const nama = penuh.nama_perusahaan ?? simbol;
  const inti = intiNama(nama);
  return {
    paket_id: `penyusun-${simbol.toLowerCase()}-${tanggal}`,
    simbol,
    nama_emiten: nama,
    nama_samaran: `Perusahaan ${simbol.charAt(0)}`,
    tanggal_t: tanggal,
    peristiwa: kalimat.join(' '),
    peran,
    kata_terlarang: inti !== null && inti.toLowerCase() !== nama.toLowerCase() ? [inti] : [],
    calon,
    turunan: (pustaka: Fakta[]) => {
      const keluar: Fakta[] = [];
      const punya = (id: string): boolean => pustaka.some((f) => f.fact_id === id) && typeof pustaka.find((f) => f.fact_id === id)?.nilai === 'number';
      const idA = `harga-${awal}`;
      const idT = `harga-${akhir}`;
      if (awal !== akhir && punya(idA) && punya(idT)) {
        const a = pustaka.find((f) => f.fact_id === idA)?.nilai as number;
        const b = pustaka.find((f) => f.fact_id === idT)?.nilai as number;
        if (a > 0 && a !== b) {
          keluar.push(faktaKelipatan(pustaka, `kelipatan-${awal}-${akhir}`, idA, idT));
          const naikHarga = b > a;
          keluar.push(
            faktaSelisih(pustaka, {
              fact_id: `${naikHarga ? 'naik' : 'turun'}-${awal}-${akhir}`,
              dari: naikHarga ? idT : idA,
              kurangi: naikHarga ? idA : idT,
              satuan: 'rupiah per lembar',
              sebutan: `${naikHarga ? 'Kenaikan' : 'Penurunan'} harga penutupan dari ${tanggalId(awal)} sampai ${tanggalId(akhir)}`,
            }),
          );
        }
      }
      if (naik.length > 0 && naik.every((t) => punya(`harga-${t}`))) keluar.push(faktaHariNaik(pustaka, 'hari-naik-beruntun', naik.map((t) => `harga-${t}`)));
      return keluar;
    },
  };
}

/** Definisi kurasi M2d bila ada untuk (simbol, T); selain itu otomatis. */
export function pilihDefinisi(simbol: string, tanggal: string, penuh: DataEmiten): PilihanPaket {
  const kurasi = Object.values(DEFINISI_PAKET).find((x) => x.simbol === simbol && x.tanggal_t === tanggal);
  if (kurasi !== undefined) {
    return { def: kurasi, sumber: 'kurasi', keterangan: `definisi paket kurasi M2d (factory/llm/paket.ts, paket "${kurasi.paket_id}") — sama dengan jalan M2d-5…M2d-8` };
  }
  return { def: definisiOtomatis(simbol, tanggal, penuh), sumber: 'otomatis', keterangan: 'definisi paket otomatis (alat/penyusun/paket-otomatis.ts, ATURAN_CALON), dari data ≤ T' };
}

export function bangunPaketPenyusun(simbol: string, tanggal: string, g: GudangMuat): { paket: PaketFakta; pilihan: PilihanPaket } {
  const penuh = g.emiten.get(simbol);
  if (penuh === undefined) throw new Error(`Emiten ${simbol} tidak ada di gudang.`);
  const pilihan = pilihDefinisi(simbol, tanggal, penuh);
  return { paket: bangunPaket(pilihan.def, gudangPaket(g)), pilihan };
}
