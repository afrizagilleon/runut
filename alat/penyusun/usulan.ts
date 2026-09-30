/**
 * Usulan hari yang layak dibekukan (M2d-9 D-2) — kode, deterministik, murni.
 *
 * Masukan: data SATU emiten dari gudang (cache), jendela "sesudahnya" (hari
 * bursa, 5–20), dan tanggal hari ini. Keluaran: paling banyak tiga tanggal T,
 * masing-masing dengan peristiwa yang biasa disalahpahami, alasan awam, dan
 * status data (✓/✗).
 *
 * Aturan kebocoran (dinyatakan juga di layar dan di jejak):
 * - PERISTIWA yang membuat T layak selalu bertanggal ≤ T, dan alasannya hanya
 *   memakai data ≤ T. Kenaikan beruntun dideteksi pada hari kelima kenaikan
 *   (bukan pada "puncak" yang baru bisa diketahui sesudahnya).
 * - Data SESUDAH T hanya dipakai untuk satu hal: menghitung ada berapa hari
 *   bursa "sesudahnya" (syarat ≥ jendela). Isi kartu simulasi dibangun dari
 *   data ≤ T oleh pembangun paket yang ada (`dataSampai`).
 *
 * Aturan urut (tertulis, dites — `ATURAN_URUT`):
 * 0. Peristiwa sejenis yang terjadi ≤ 5 hari bursa sesudah peristiwa sejenis
 *    sebelumnya adalah lanjutan: yang dipakai hanya awal episodenya.
 * 1. Lebih banyak jenis peristiwa pada hari yang sama lebih dulu.
 * 2. Jenis terpenting lebih dulu: penghentian > kenaikan beruntun > ex
 *    dividen > laporan orang dalam.
 * 3. Konteks lebih kaya lebih dulu: jumlah jenis data ≤ T dalam 365 hari
 *    sebelumnya (penghentian lain, laporan kepemilikan, dividen/RUPS, ≥ 10
 *    hari harga).
 * 4. Tanggal lebih baru lebih dulu.
 * 5. Usulan berjarak > 5 hari bursa dari usulan yang sudah terpilih.
 */
import { angkaId, rupiah, tanggalId } from '../../factory/format.ts';
import type { DataEmiten } from '../../factory/verifikasi/tipe.ts';

export type JenisPeristiwa = 'suspensi' | 'lonjakan' | 'ex-dividen' | 'laporan-orang-dalam';

export const PRIORITAS: Readonly<Record<JenisPeristiwa, number>> = {
  suspensi: 1,
  lonjakan: 2,
  'ex-dividen': 3,
  'laporan-orang-dalam': 4,
};

export const NAMA_JENIS: Readonly<Record<JenisPeristiwa, string>> = {
  suspensi: 'penghentian sementara oleh bursa',
  lonjakan: 'harga naik beruntun',
  'ex-dividen': 'tanggal ex dividen',
  'laporan-orang-dalam': 'laporan kepemilikan orang dalam',
};

/** Kenapa jenis ini biasa disalahpahami — kalimat awam untuk kartu usulan. */
export const SALAH_KAPRAH: Readonly<Record<JenisPeristiwa, string>> = {
  suspensi: 'Penghentian sementara sering dikira hukuman atau tanda perusahaan bermasalah, padahal alasan resmi bursa bisa lain.',
  lonjakan: 'Harga yang naik berhari-hari sering dibaca sebagai jaminan harganya akan naik terus.',
  'ex-dividen': 'Harga turun di tanggal ex sering dikira kabar buruk, padahal pembeli mulai hari itu memang tidak kebagian dividen.',
  'laporan-orang-dalam': 'Laporan jual atau beli orang dalam sering dibaca sebagai tanda pasti ke mana harga akan bergerak.',
};

export const ATURAN_URUT: readonly string[] = [
  'Peristiwa sejenis ≤ 5 hari bursa sesudah peristiwa sejenis sebelumnya = lanjutan; yang dipakai awal episodenya.',
  'Lebih banyak jenis peristiwa pada hari yang sama lebih dulu.',
  'Jenis terpenting lebih dulu: penghentian > kenaikan beruntun > ex dividen > laporan orang dalam.',
  'Konteks lebih kaya lebih dulu: jenis data ≤ T dalam 365 hari sebelumnya (penghentian lain, laporan kepemilikan, dividen/RUPS, ≥ 10 hari harga).',
  'Tanggal lebih baru lebih dulu.',
  'Usulan berjarak > 5 hari bursa dari usulan yang sudah terpilih.',
];

export const CATATAN_KEBOCORAN =
  'Hari dipilih dari peristiwa bertanggal ≤ T, dengan alasan yang hanya memakai data ≤ T. Data sesudah T dilihat HANYA untuk ' +
  'menghitung ada berapa hari bursa "sesudahnya" (syarat ≥ jendela). Isi kartu simulasi dibangun dari data ≤ T.';

/** Hari kenaikan beruntun yang membuat hari itu kandidat. */
export const HARI_NAIK_MIN = 5;
/** Jarak (hari bursa) yang dianggap satu episode / terlalu berdekatan. */
export const JARAK_EPISODE = 5;
/** Peristiwa di hari tanpa baris harga dipindah ke hari bursa berikutnya paling jauh sekian hari kalender. */
export const GESER_MAKS_HARI = 5;
export const JENDELA_MIN = 5;
export const JENDELA_MAKS = 20;
export const JENDELA_BAWAAN = 10;
export const MAKS_USULAN = 3;

export interface StatusData {
  harga_t: boolean;
  /** Hari bursa sesudah T di data (dihitung, hanya jumlah). */
  sesudah: number;
  sesudah_cukup: boolean;
  /** Hari harga dalam 60 hari kalender sebelum T. */
  sebelum: number;
  laporan: number;
  aksi: number;
  suspensi_lalu: number;
}

export interface Usulan {
  tanggal: string;
  jenis: JenisPeristiwa[];
  alasan: string[];
  salah_kaprah: string[];
  status: StatusData;
  skor: { jumlah_jenis: number; prioritas: number; kekayaan: number };
}

export interface Dilewati {
  tanggal: string;
  jenis: JenisPeristiwa[];
  alasan: string;
}

export interface HasilUsulan {
  kode: string;
  jendela: number;
  hari_ini: string;
  usulan: Usulan[];
  dilewati: Dilewati[];
  jumlah_kandidat: number;
  aturan_urut: readonly string[];
  catatan_kebocoran: string;
}

/* ---------------------------------------------------------------------- */
/* tanggal                                                                 */
/* ---------------------------------------------------------------------- */

const HARI_MS = 86_400_000;

export function tambahHari(iso: string, n: number): string {
  return new Date(Date.parse(`${iso}T00:00:00Z`) + n * HARI_MS).toISOString().slice(0, 10);
}

/** Hari kerja (Senin–Jumat) sesudah `dari` sampai sebelum `sampai` (keduanya tidak dihitung). */
export function hariKerjaAntara(dari: string, sampai: string): number {
  let n = 0;
  for (let t = tambahHari(dari, 1); t < sampai; t = tambahHari(t, 1)) {
    const h = new Date(`${t}T00:00:00Z`).getUTCDay();
    if (h !== 0 && h !== 6) n++;
  }
  return n;
}

/** Hari bursa emiten = tanggal baris harganya (urut, unik). Bursa mencatat baris juga di hari suspensi. */
export function hariBursaEmiten(data: Pick<DataEmiten, 'harga'>): string[] {
  return [...new Set(data.harga.map((h) => h.tanggal))].sort();
}

function indeksHari(hari: readonly string[], t: string): number {
  return hari.indexOf(t);
}

/** Hari bursa pertama ≥ t, paling jauh `GESER_MAKS_HARI` hari kalender. */
function hariBursaBerikut(hari: readonly string[], t: string): string | null {
  const batas = tambahHari(t, GESER_MAKS_HARI);
  return hari.find((h) => h >= t && h <= batas) ?? null;
}

/* ---------------------------------------------------------------------- */
/* peristiwa                                                               */
/* ---------------------------------------------------------------------- */

interface Peristiwa {
  jenis: JenisPeristiwa;
  /** Tanggal peristiwa terjadi/terbit (≤ T). */
  terjadi: string;
  /** Hari bursa yang menjadi T. */
  t: string;
  alasan: string;
}

function persen(a: number, b: number): string {
  return `${angkaId(Math.round(((b - a) / a) * 1000) / 10)}%`;
}

/**
 * Semua peristiwa kandidat. Tiap alasan hanya memakai data bertanggal ≤ T-nya
 * sendiri (dites dengan mengganti seluruh data sesudah T).
 */
export function peristiwaKandidat(data: DataEmiten): { peristiwa: Peristiwa[]; dilewati: Dilewati[] } {
  const hari = hariBursaEmiten(data);
  const peristiwa: Peristiwa[] = [];
  const dilewati: Dilewati[] = [];
  const tanpaHari = (jenis: JenisPeristiwa, t: string, apa: string): void => {
    dilewati.push({ tanggal: t, jenis: [jenis], alasan: `${apa}: tidak ada baris harga pada hari itu atau ${GESER_MAKS_HARI} hari sesudahnya` });
  };

  // Penghentian sementara.
  for (const s of [...data.suspensi].sort((a, b) => a.tanggal.localeCompare(b.tanggal))) {
    const t = hariBursaBerikut(hari, s.tanggal);
    if (t === null) {
      tanpaHari('suspensi', s.tanggal, 'penghentian');
      continue;
    }
    const alasan = s.alasan.trim().replace(/\.$/, '');
    peristiwa.push({
      jenis: 'suspensi',
      terjadi: s.tanggal,
      t,
      alasan: `Bursa menghentikan sementara perdagangan pada ${tanggalId(s.tanggal)}. Alasan resmi: ${alasan === '' ? '(tidak tercatat)' : alasan}.`,
    });
  }

  // Kenaikan beruntun: hari ke-HARI_NAIK_MIN dari runtun penutupan naik bervolume.
  const harga = [...data.harga].sort((a, b) => a.tanggal.localeCompare(b.tanggal));
  let runtun = 0;
  for (let i = 1; i < harga.length; i++) {
    const kini = harga[i];
    const kemarin = harga[i - 1];
    if (kini === undefined || kemarin === undefined) continue;
    const naik = kini.volume > 0 && kemarin.tutup > 0 && kini.tutup > kemarin.tutup;
    runtun = naik ? runtun + 1 : 0;
    if (runtun === HARI_NAIK_MIN) {
      const awal = harga[i - HARI_NAIK_MIN];
      if (awal === undefined) continue;
      peristiwa.push({
        jenis: 'lonjakan',
        terjadi: kini.tanggal,
        t: kini.tanggal,
        alasan:
          `Harga penutupan naik ${String(HARI_NAIK_MIN)} hari bursa berturut-turut sampai ${tanggalId(kini.tanggal)}: ` +
          `dari ${rupiah(awal.tutup)} (${tanggalId(awal.tanggal)}) ke ${rupiah(kini.tutup)}, naik ${persen(awal.tutup, kini.tutup)}.`,
      });
    }
  }

  // Tanggal ex dividen tunai.
  for (const d of [...data.dividen].sort((a, b) => a.ex_date.localeCompare(b.ex_date))) {
    const t = hariBursaBerikut(hari, d.ex_date);
    if (t === null || t !== d.ex_date) {
      tanpaHari('ex-dividen', d.ex_date, 'tanggal ex dividen');
      continue;
    }
    peristiwa.push({
      jenis: 'ex-dividen',
      terjadi: d.ex_date,
      t,
      alasan: `Tanggal ex dividen tunai ${rupiah(d.nilai_per_lembar)} per lembar: pembeli mulai hari ini tidak kebagian dividen itu.`,
    });
  }

  // Laporan kepemilikan orang dalam, dikelompokkan per tanggal terbit.
  const perTanggal = new Map<string, DataEmiten['laporan']>();
  for (const l of data.laporan) {
    const t = l.dilaporkan_pada.slice(0, 10);
    perTanggal.set(t, [...(perTanggal.get(t) ?? []), l]);
  }
  for (const [terbit, daftar] of [...perTanggal.entries()].sort((a, b) => a[0].localeCompare(b[0]))) {
    const t = hariBursaBerikut(hari, terbit);
    if (t === null) {
      tanpaHari('laporan-orang-dalam', terbit, 'laporan kepemilikan');
      continue;
    }
    const contoh = daftar
      .slice(0, 2)
      .map((l) => `${l.pemegang} melaporkan ${l.jenis} ${angkaId(l.jumlah)} lembar`)
      .join('; ');
    peristiwa.push({
      jenis: 'laporan-orang-dalam',
      terjadi: terbit,
      t,
      alasan:
        `${String(daftar.length)} laporan kepemilikan terbit ${tanggalId(terbit)}${t === terbit ? '' : ` (hari bursa berikutnya ${tanggalId(t)})`}: ` +
        `${contoh}${daftar.length > 2 ? '; …' : ''}.`,
    });
  }
  return { peristiwa, dilewati };
}

/* ---------------------------------------------------------------------- */
/* status data dan urutan                                                  */
/* ---------------------------------------------------------------------- */

export function statusData(data: DataEmiten, t: string, jendela: number): StatusData {
  const hari = hariBursaEmiten(data);
  const i = indeksHari(hari, t);
  const setahun = tambahHari(t, -365);
  const duaBulan = tambahHari(t, -60);
  const sesudah = i < 0 ? hari.filter((h) => h > t).length : hari.length - i - 1;
  return {
    harga_t: i >= 0,
    sesudah,
    sesudah_cukup: sesudah >= jendela,
    sebelum: hari.filter((h) => h < t && h >= duaBulan).length,
    laporan: data.laporan.filter((l) => l.dilaporkan_pada.slice(0, 10) <= t && l.dilaporkan_pada.slice(0, 10) >= setahun).length,
    aksi:
      data.dividen.filter((d) => d.ex_date <= t && d.ex_date >= setahun).length +
      data.rups.filter((r) => r.tanggal <= t && r.tanggal >= setahun).length,
    suspensi_lalu: data.suspensi.filter((s) => s.tanggal < t && s.tanggal >= setahun).length,
  };
}

function kekayaan(s: StatusData): number {
  return [s.suspensi_lalu > 0, s.laporan > 0, s.aksi > 0, s.sebelum >= 10].filter(Boolean).length;
}

/** Urutan usulan (aturan 1–4). Murni; dipakai juga oleh tes. */
export function bandingUsulan(a: Usulan, b: Usulan): number {
  return (
    b.skor.jumlah_jenis - a.skor.jumlah_jenis ||
    a.skor.prioritas - b.skor.prioritas ||
    b.skor.kekayaan - a.skor.kekayaan ||
    b.tanggal.localeCompare(a.tanggal)
  );
}

export interface OpsiUsulan {
  jendela: number;
  hariIni: string;
}

/** Tiga usulan teratas untuk satu emiten. */
export function usulkanHari(kode: string, data: DataEmiten, opsi: OpsiUsulan): HasilUsulan {
  const { jendela, hariIni } = opsi;
  const hari = hariBursaEmiten(data);
  const { peristiwa, dilewati } = peristiwaKandidat(data);

  // Aturan 0: lanjutan episode sejenis dibuang (dengan alasannya).
  const dipakai: Peristiwa[] = [];
  const terakhir = new Map<JenisPeristiwa, string>();
  for (const p of [...peristiwa].sort((a, b) => a.t.localeCompare(b.t) || PRIORITAS[a.jenis] - PRIORITAS[b.jenis])) {
    const sebelum = terakhir.get(p.jenis);
    terakhir.set(p.jenis, p.t);
    if (sebelum !== undefined && sebelum !== p.t) {
      const jarak = indeksHari(hari, p.t) - indeksHari(hari, sebelum);
      if (jarak > 0 && jarak <= JARAK_EPISODE) {
        dilewati.push({ tanggal: p.t, jenis: [p.jenis], alasan: `lanjutan ${NAMA_JENIS[p.jenis]} ${tanggalId(sebelum)} (${String(jarak)} hari bursa sebelumnya); yang dipakai awal episodenya` });
        continue;
      }
    }
    dipakai.push(p);
  }

  // Gabung per T.
  const perT = new Map<string, Peristiwa[]>();
  for (const p of dipakai) perT.set(p.t, [...(perT.get(p.t) ?? []), p]);

  const calon: Usulan[] = [];
  for (const [t, ps] of perT) {
    const jenis = [...new Set(ps.map((p) => p.jenis))].sort((a, b) => PRIORITAS[a] - PRIORITAS[b]);
    const status = statusData(data, t, jendela);
    if (t >= hariIni) {
      dilewati.push({ tanggal: t, jenis, alasan: 'hari ini atau sesudahnya: belum ada "sesudahnya"' });
      continue;
    }
    const kerja = hariKerjaAntara(t, hariIni);
    if (kerja < jendela) {
      dilewati.push({ tanggal: t, jenis, alasan: `terlalu dekat dengan hari ini: baru ${String(kerja)} hari kerja sesudahnya (perlu ≥ ${String(jendela)})` });
      continue;
    }
    if (!status.sesudah_cukup) {
      dilewati.push({ tanggal: t, jenis, alasan: `data harga sesudahnya hanya ${String(status.sesudah)} hari bursa (perlu ≥ ${String(jendela)})` });
      continue;
    }
    calon.push({
      tanggal: t,
      jenis,
      alasan: ps.sort((a, b) => PRIORITAS[a.jenis] - PRIORITAS[b.jenis]).map((p) => p.alasan),
      salah_kaprah: jenis.map((j) => SALAH_KAPRAH[j]),
      status,
      skor: { jumlah_jenis: jenis.length, prioritas: Math.min(...jenis.map((j) => PRIORITAS[j])), kekayaan: kekayaan(status) },
    });
  }
  calon.sort(bandingUsulan);

  // Aturan 5: berjarak > JARAK_EPISODE hari bursa dari yang sudah terpilih.
  const usulan: Usulan[] = [];
  for (const u of calon) {
    if (usulan.length >= MAKS_USULAN) break;
    const dekat = usulan.find((x) => Math.abs(indeksHari(hari, x.tanggal) - indeksHari(hari, u.tanggal)) <= JARAK_EPISODE);
    if (dekat !== undefined) {
      dilewati.push({ tanggal: u.tanggal, jenis: u.jenis, alasan: `terlalu dekat dengan usulan ${tanggalId(dekat.tanggal)}` });
      continue;
    }
    usulan.push(u);
  }
  dilewati.sort((a, b) => b.tanggal.localeCompare(a.tanggal));
  return {
    kode,
    jendela,
    hari_ini: hariIni,
    usulan,
    dilewati,
    jumlah_kandidat: calon.length,
    aturan_urut: ATURAN_URUT,
    catatan_kebocoran: CATATAN_KEBOCORAN,
  };
}

/** Jendela yang sah: bilangan bulat 5–20; `undefined`/kosong = bawaan. */
export function jendelaSah(nilai: unknown): number | null {
  if (nilai === undefined || nilai === null || nilai === '') return JENDELA_BAWAAN;
  const n = typeof nilai === 'number' ? nilai : Number(nilai);
  return Number.isInteger(n) && n >= JENDELA_MIN && n <= JENDELA_MAKS ? n : null;
}

/** Kode saham IDX: empat huruf (sufiks `.JK` dilepas). */
export function kodeSah(nilai: unknown): string | null {
  if (typeof nilai !== 'string') return null;
  const k = nilai.trim().toUpperCase().replace(/\.JK$/, '');
  return /^[A-Z]{4}$/.test(k) ? k : null;
}
