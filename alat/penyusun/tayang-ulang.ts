/**
 * Mode tayang ulang pintu penyusun (M2d-12 D-1):
 * `npm run penyusun -- --tayang-ulang eval/penyusun/<id>`.
 *
 * Membaca `aliran.jsonl` jalan yang SUDAH terjadi dan mengirim peristiwanya
 * lagi lewat jalur SSE yang sama (`/api/jalan/<id>/aliran`, `event: tahap`)
 * ke halaman yang sama. Tidak ada panggilan model dan tidak ada tulisan ke
 * folder jalan.
 *
 * Kejujuran isi: baris `data:` setiap `event: tahap` adalah BARIS LOG ITU
 * SENDIRI, byte demi byte — tidak diurai lalu disusun ulang, tidak diurutkan
 * ulang, tidak ada angka yang dihitung ulang. Yang berbeda dari jalan aslinya
 * hanya JEDA antar-peristiwa, dan perbedaan itu diumumkan di layar lewat
 * peristiwa terpisah `event: tayang` (jeda asli, jeda putar, "dipercepat ×N").
 *
 * Rumus jeda (tertulis, dites):
 *   asli_i   = waktu_i − waktu_(i−1)            (dari stempel `waktu` di log)
 *   putar_i  = min(BATAS, max(MIN, asli_i / PEMBAGI))
 *   sesudah peristiwa `perkiraan`: putar = max(putar, JEDA_PERSETUJUAN)
 *   peristiwa pertama diputar JEDA_AWAL sesudah halaman tersambung.
 * Bila putar < asli → "dipercepat ×round(asli/putar)"; bila putar > asli →
 * "diperlambat agar terbaca"; sama → tanpa penanda.
 */
import { existsSync, readFileSync } from 'node:fs';
import type { ServerResponse } from 'node:http';
import { basename, dirname, join, resolve } from 'node:path';
import type { Peristiwa } from './aliran.ts';
import { POLA_ID } from './jalan.ts';

export const RUMUS_JEDA = {
  /** Jeda asli dibagi angka ini … */
  PEMBAGI: 12,
  /** … tetapi tidak kurang dari ini (supaya satu baris sempat terbaca) … */
  MIN_MS: 700,
  /** … dan tidak lebih dari ini (menunggu model diringkas). */
  BATAS_MS: 1_800,
  /** Kotak persetujuan biaya tampil paling sedikit selama ini. */
  JEDA_PERSETUJUAN_MS: 3_500,
  /** Peristiwa pertama: sesudah halaman tersambung. */
  JEDA_AWAL_MS: 1_500,
} as const;

export type JenisJeda = 'dipercepat' | 'diperlambat' | 'sama';

export interface JedaTayang {
  /** Nomor peristiwa yang dikirim SESUDAH jeda ini. */
  no: number;
  /** Jeda di jalan aslinya (ms), dari stempel `waktu` log; peristiwa pertama: null. */
  asli_ms: number | null;
  /** Jeda saat diputar (ms). */
  putar_ms: number;
  /** Saat kirim, dihitung dari awal tayang (ms). */
  pada_ms: number;
  jenis: JenisJeda;
  /** asli/putar dibulatkan (hanya untuk "dipercepat"). */
  faktor: number | null;
}

export interface Rekaman {
  id: string;
  /** Folder jalan (absolut). */
  folder: string;
  /** Folder induknya: dipakai sebagai folder keluaran (hanya dibaca). */
  folderInduk: string;
  /** Baris log apa adanya (tanpa akhir baris), urut sesuai berkas. */
  baris: string[];
  peristiwa: Peristiwa[];
  jadwal: JedaTayang[];
  /** Berkas pendamping yang ada di folder jalan. */
  berkas: { keadaan: boolean; hasil: boolean; jejak: boolean; paket: boolean };
}

export class GalatRekaman extends Error {
  constructor(pesan: string) {
    super(pesan);
    this.name = 'GalatRekaman';
  }
}

/** Baris log mentah: dipisah di akhir baris, baris kosong dibuang, isi tidak disentuh. */
export function barisLog(teks: string): string[] {
  return teks.split(/\r?\n/).filter((b) => b.trim() !== '');
}

/** Jadwal putar dari stempel waktu log (rumus di atas). */
export function jadwalTayang(peristiwa: readonly Pick<Peristiwa, 'no' | 'waktu' | 'tahap'>[], r: typeof RUMUS_JEDA = RUMUS_JEDA): JedaTayang[] {
  const keluar: JedaTayang[] = [];
  let pada = 0;
  peristiwa.forEach((p, i) => {
    const sebelum = i === 0 ? null : peristiwa[i - 1];
    let asli: number | null = null;
    let putar: number;
    if (sebelum === null || sebelum === undefined) {
      putar = r.JEDA_AWAL_MS;
    } else {
      const t0 = Date.parse(sebelum.waktu);
      const t1 = Date.parse(p.waktu);
      asli = Number.isFinite(t0) && Number.isFinite(t1) ? Math.max(0, t1 - t0) : 0;
      putar = Math.min(r.BATAS_MS, Math.max(r.MIN_MS, asli / r.PEMBAGI));
      if (sebelum.tahap === 'perkiraan') putar = Math.max(putar, r.JEDA_PERSETUJUAN_MS);
      putar = Math.round(putar);
    }
    pada += putar;
    const jenis: JenisJeda = asli === null || putar === asli ? 'sama' : putar < asli ? 'dipercepat' : 'diperlambat';
    keluar.push({ no: p.no, asli_ms: asli, putar_ms: putar, pada_ms: pada, jenis, faktor: jenis === 'dipercepat' && asli !== null ? Math.round(asli / putar) : null });
  });
  return keluar;
}

/** Baca rekaman satu jalan dari `<folder>/aliran.jsonl` (+ berkas pendamping bila ada). */
export function bacaRekaman(folderMentah: string): Rekaman {
  const folder = resolve(folderMentah);
  const id = basename(folder);
  if (!POLA_ID.test(id)) throw new GalatRekaman(`Nama folder jalan "${id}" tidak sah.`);
  const jalurLog = join(folder, 'aliran.jsonl');
  if (!existsSync(jalurLog)) throw new GalatRekaman(`Tidak ada ${jalurLog}; tayang ulang butuh log tahapan jalan.`);
  const baris = barisLog(readFileSync(jalurLog, 'utf8'));
  if (baris.length === 0) throw new GalatRekaman(`${jalurLog} kosong.`);
  const peristiwa = baris.map((b, i) => {
    let p: Peristiwa;
    try {
      p = JSON.parse(b) as Peristiwa;
    } catch {
      throw new GalatRekaman(`Baris ${String(i + 1)} ${jalurLog} bukan JSON.`);
    }
    if (typeof p.no !== 'number' || typeof p.waktu !== 'string' || typeof p.tahap !== 'string') throw new GalatRekaman(`Baris ${String(i + 1)} bukan peristiwa tahap.`);
    return p;
  });
  const ada = (n: string): boolean => existsSync(join(folder, n));
  return {
    id,
    folder,
    folderInduk: dirname(folder),
    baris,
    peristiwa,
    jadwal: jadwalTayang(peristiwa),
    berkas: { keadaan: ada('keadaan.json'), hasil: ada('hasil.json'), jejak: ada('jejak-agen.json'), paket: ada('paket.json') },
  };
}

/* ---------------------------------------------------------------------- */
/* jam: sungguhan (setTimeout) atau virtual (dimajukan perekam)            */
/* ---------------------------------------------------------------------- */

export interface JamTayang {
  sekarang(): number;
  /** Selesai saat jam mencapai `sampai` (ms). */
  tunggu(sampai: number): Promise<void>;
}

export function jamSungguhan(): JamTayang {
  return {
    sekarang: () => performance.now(),
    tunggu: (sampai) => new Promise((selesai) => setTimeout(selesai, Math.max(0, sampai - performance.now()))),
  };
}

/**
 * Jam virtual: waktu hanya maju bila `maju(ms)` dipanggil (perekam bingkai,
 * `--jam-virtual`). Dengan begitu satu bingkai video = tepat 1/30 detik
 * tayangan, berapa pun lambatnya laptop menangkap layar.
 */
export class JamVirtual implements JamTayang {
  private t = 0;
  private menunggu: Array<{ sampai: number; selesai: () => void }> = [];

  sekarang(): number {
    return this.t;
  }

  tunggu(sampai: number): Promise<void> {
    if (sampai <= this.t) return Promise.resolve();
    return new Promise((selesai) => this.menunggu.push({ sampai, selesai }));
  }

  /** Majukan jam; lepaskan penunggu yang jatuh tempo, lalu tunggu sampai rantai kirim selesai. */
  async maju(ms: number): Promise<number> {
    this.t += Math.max(0, ms);
    for (let putaran = 0; putaran < 1_000; putaran++) {
      const jatuh = this.menunggu.filter((m) => m.sampai <= this.t);
      if (jatuh.length === 0) break;
      this.menunggu = this.menunggu.filter((m) => m.sampai > this.t);
      for (const m of jatuh) m.selesai();
      await new Promise((s) => setImmediate(s));
    }
    return this.t;
  }
}

/* ---------------------------------------------------------------------- */
/* pemutar SSE                                                             */
/* ---------------------------------------------------------------------- */

export interface PemutarTayang {
  /** Nomor peristiwa terakhir yang sudah ditulis ke sambungan terakhir. */
  terkirim: number;
  selesai: boolean;
}

/**
 * Putar rekaman ke satu sambungan SSE, mulai sesudah nomor `sesudah`.
 * `event: tahap` membawa baris log apa adanya; `event: tayang` membawa jeda.
 */
export function putarRekaman(res: ServerResponse, rekaman: Rekaman, jam: JamTayang, sesudah: number, keadaan?: PemutarTayang): void {
  res.writeHead(200, {
    'Content-Type': 'text/event-stream; charset=utf-8',
    'Cache-Control': 'no-cache, no-transform',
    Connection: 'keep-alive',
    'X-Content-Type-Options': 'nosniff',
  });
  res.write('retry: 2000\n\n');
  let putus = false;
  res.on('close', () => {
    putus = true;
  });
  const sisa = rekaman.peristiwa.map((p, i) => ({ p, baris: rekaman.baris[i] ?? '', j: rekaman.jadwal[i] })).filter((x) => x.p.no > sesudah);
  const awalJadwal = rekaman.jadwal.find((j) => j.no === sesudah)?.pada_ms ?? 0;
  const mulai = jam.sekarang();
  if (keadaan !== undefined) {
    keadaan.terkirim = sesudah;
    keadaan.selesai = false;
  }
  void (async () => {
    for (const x of sisa) {
      if (x.j === undefined) continue;
      res.write(`event: tayang\ndata: ${JSON.stringify({ menuju: x.p.no, asli_ms: x.j.asli_ms, putar_ms: x.j.putar_ms, jenis: x.j.jenis, faktor: x.j.faktor })}\n\n`);
      await jam.tunggu(mulai + (x.j.pada_ms - awalJadwal));
      if (putus) return;
      res.write(`id: ${String(x.p.no)}\nevent: tahap\ndata: ${x.baris}\n\n`);
      if (keadaan !== undefined) keadaan.terkirim = x.p.no;
    }
    if (putus) return;
    res.write('event: selesai\ndata: {}\n\n');
    if (keadaan !== undefined) keadaan.selesai = true;
  })();
}

/* ---------------------------------------------------------------------- */
/* pembanding (tes kesetiaan)                                              */
/* ---------------------------------------------------------------------- */

/** Isi `data:` setiap `event: tahap` dari teks SSE mentah, urut. */
export function dataTahapSse(teks: string): string[] {
  return teks
    .split('\n\n')
    .filter((b) => b.split('\n').includes('event: tahap'))
    .map((b) => b.split('\n').find((l) => l.startsWith('data: '))?.slice(6) ?? '');
}

/** Beda antara baris log dan isi SSE: kosong = sama byte demi byte, urutan sama. */
export function bandingkanRekaman(barisBerkas: readonly string[], dataSse: readonly string[]): string[] {
  const beda: string[] = [];
  if (barisBerkas.length !== dataSse.length) beda.push(`jumlah peristiwa: berkas ${String(barisBerkas.length)}, dikirim ${String(dataSse.length)}`);
  const n = Math.min(barisBerkas.length, dataSse.length);
  for (let i = 0; i < n; i++) {
    if (barisBerkas[i] !== dataSse[i]) beda.push(`baris ${String(i + 1)} berbeda`);
  }
  return beda;
}
