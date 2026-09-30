/**
 * Aliran tahapan satu jalan penyusun lewat Server-Sent Events (M2d-9 D-1, D-4).
 *
 * Setiap peristiwa diberi nomor urut, disimpan di memori (untuk halaman yang
 * baru tersambung atau tersambung ulang: diputar ulang dari `Last-Event-ID`),
 * dan ditulis satu baris JSON ke `aliran.jsonl` di folder jalan — itulah "log
 * SSE" yang disimpan (D-7). Isi peristiwa hanya data tahapan (putusan, alasan,
 * biaya); tidak ada kunci di mana pun di rantai pembuatnya.
 */
import { appendFileSync, existsSync, mkdirSync, readFileSync } from 'node:fs';
import { dirname } from 'node:path';
import type { ServerResponse } from 'node:http';

export type TahapAliran =
  | 'data'
  | 'aturan'
  | 'paket'
  | 'perkiraan'
  | 'agen'
  | 'hasil'
  | 'suntingan'
  | 'uji-ulang'
  | 'penyetuju'
  | 'galat';

export interface Peristiwa {
  no: number;
  waktu: string;
  tahap: TahapAliran;
  /** Satu kalimat awam untuk baris tahapan di halaman. */
  judul: string;
  isi: Record<string, unknown>;
}

type Pendengar = (p: Peristiwa | null) => void;

export class Aliran {
  readonly id: string;
  private readonly daftar: Peristiwa[] = [];
  private readonly pendengar = new Set<Pendengar>();
  private readonly jalurLog: string | null;
  private readonly jam: () => Date;
  private tertutup = false;

  constructor(id: string, jalurLog: string | null, jam: () => Date = () => new Date()) {
    this.id = id;
    this.jalurLog = jalurLog;
    this.jam = jam;
  }

  /** Muat ulang aliran yang sudah selesai dari `aliran.jsonl` (hanya dibaca). */
  static dariLog(id: string, jalurLog: string): Aliran {
    const a = new Aliran(id, null);
    if (existsSync(jalurLog)) {
      for (const baris of readFileSync(jalurLog, 'utf8').split(/\r?\n/)) {
        if (baris.trim() === '') continue;
        a.daftar.push(JSON.parse(baris) as Peristiwa);
      }
    }
    a.tertutup = true;
    return a;
  }

  kirim(tahap: TahapAliran, judul: string, isi: Record<string, unknown> = {}): Peristiwa {
    const p: Peristiwa = { no: this.daftar.length + 1, waktu: this.jam().toISOString(), tahap, judul, isi };
    this.daftar.push(p);
    if (this.jalurLog !== null) {
      mkdirSync(dirname(this.jalurLog), { recursive: true });
      appendFileSync(this.jalurLog, `${JSON.stringify(p)}\n`, 'utf8');
    }
    for (const f of this.pendengar) f(p);
    return p;
  }

  /** Semua peristiwa sesudah nomor `sesudah`. */
  sejak(sesudah = 0): Peristiwa[] {
    return this.daftar.filter((p) => p.no > sesudah);
  }

  semua(): readonly Peristiwa[] {
    return this.daftar;
  }

  get selesai(): boolean {
    return this.tertutup;
  }

  /** Tanda "tidak ada peristiwa lagi" (halaman menutup sambungannya sendiri). */
  tutup(): void {
    if (this.tertutup) return;
    this.tertutup = true;
    for (const f of this.pendengar) f(null);
    this.pendengar.clear();
  }

  /** Buka kembali untuk tahap lanjutan (uji ulang sesudah suntingan). */
  buka(): void {
    this.tertutup = false;
  }

  dengar(f: Pendengar): () => void {
    this.pendengar.add(f);
    return () => this.pendengar.delete(f);
  }
}

function tulisPeristiwa(res: ServerResponse, p: Peristiwa): void {
  res.write(`id: ${String(p.no)}\nevent: tahap\ndata: ${JSON.stringify(p)}\n\n`);
}

/**
 * Sambungkan satu respons HTTP ke aliran sebagai `text/event-stream`: putar
 * ulang peristiwa sesudah `sesudah`, lalu teruskan yang baru. Kalau aliran
 * sudah (atau kemudian) tertutup, kirim `event: selesai`.
 */
export function sambungSse(res: ServerResponse, aliran: Aliran, sesudah: number, detakMs = 15_000): void {
  res.writeHead(200, {
    'Content-Type': 'text/event-stream; charset=utf-8',
    'Cache-Control': 'no-cache, no-transform',
    Connection: 'keep-alive',
    'X-Content-Type-Options': 'nosniff',
  });
  res.write('retry: 2000\n\n');
  for (const p of aliran.sejak(sesudah)) tulisPeristiwa(res, p);
  const selesai = (): void => {
    res.write('event: selesai\ndata: {}\n\n');
  };
  if (aliran.selesai) {
    selesai();
    return;
  }
  const detak = setInterval(() => res.write(': detak\n\n'), detakMs);
  const lepas = aliran.dengar((p) => {
    if (p === null) {
      selesai();
      return;
    }
    tulisPeristiwa(res, p);
  });
  res.on('close', () => {
    clearInterval(detak);
    lepas();
  });
}
