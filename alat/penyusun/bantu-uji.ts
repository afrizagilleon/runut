/**
 * Bantuan uji pintu penyusun: server sungguhan di port bebas 127.0.0.1,
 * akar sementara (`.env` palsu, `.cache/` kosong), permintaan HTTP mentah.
 */
import { request } from 'node:http';
import { mkdtempSync, mkdirSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import type { Server } from 'node:http';
import { buatAplikasi, dengarkan, type KeadaanServer, type OpsiServer } from './server.ts';

/** Kunci palsu yang TIDAK boleh muncul di respons, log, maupun berkas keluaran. */
export const KUNCI_LLM_PALSU = 'sk-or-v1-PALSU-0123456789abcdefPENYUSUN';
export const KUNCI_SECTORS_PALSU = 'SECTORS-PALSU-fedcba9876543210-PENYUSUN';

export function akarSementara(env: Record<string, string> | null = {
  SECTORS_API_KEY: KUNCI_SECTORS_PALSU,
  LLM_BASE_URL: 'https://openrouter.ai/api/v1',
  LLM_API_KEY: KUNCI_LLM_PALSU,
  LLM_MODEL: 'deepseek/deepseek-v4.1-flash',
  LLM_PAGU_USD: '10',
}): string {
  const akar = mkdtempSync(join(tmpdir(), 'penyusun-'));
  mkdirSync(join(akar, '.cache', 'llm'), { recursive: true });
  mkdirSync(join(akar, '.cache', 'sectors'), { recursive: true });
  if (env !== null) {
    writeFileSync(join(akar, '.env'), Object.entries(env).map(([k, v]) => `${k}=${v}`).join('\n') + '\n', 'utf8');
  }
  return akar.replace(/\\/g, '/') + '/';
}

export interface ServerUji {
  server: Server;
  keadaan: KeadaanServer;
  port: number;
  log: string[];
  tutup: () => Promise<void>;
}

export async function mulaiServer(o: Partial<OpsiServer> & { akar: string }): Promise<ServerUji> {
  const log: string[] = [];
  const { server, keadaan } = buatAplikasi({
    folderKeluaran: join(o.akar, 'eval', 'penyusun'),
    jam: () => new Date('2026-09-30T12:00:00Z'),
    log: (b) => log.push(b),
    paguPenyusunUsd: 1.2,
    palsu: false,
    proses: {},
    ...o,
  });
  const port = await dengarkan(server, 0);
  return {
    server,
    keadaan,
    port,
    log,
    tutup: () =>
      new Promise((selesai) => {
        server.closeAllConnections();
        server.close(() => selesai());
      }),
  };
}

export interface JawabanMentah {
  status: number;
  header: Record<string, string | string[] | undefined>;
  teks: string;
  json: () => unknown;
}

/** Permintaan HTTP mentah (bisa mengatur Host/Origin sendiri). */
export function minta(
  port: number,
  metode: string,
  jalur: string,
  opsi: { badan?: unknown; header?: Record<string, string> } = {},
): Promise<JawabanMentah> {
  return new Promise((selesai, gagal) => {
    const teksBadan = opsi.badan === undefined ? undefined : typeof opsi.badan === 'string' ? opsi.badan : JSON.stringify(opsi.badan);
    const req = request(
      {
        host: '127.0.0.1',
        port,
        method: metode,
        path: jalur,
        headers: {
          ...(teksBadan === undefined ? {} : { 'Content-Type': 'application/json', 'Content-Length': String(Buffer.byteLength(teksBadan)) }),
          ...opsi.header,
        },
      },
      (res) => {
        const potongan: Buffer[] = [];
        res.on('data', (p: Buffer) => potongan.push(p));
        res.on('end', () => {
          const teks = Buffer.concat(potongan).toString('utf8');
          selesai({ status: res.statusCode ?? 0, header: res.headers, teks, json: () => JSON.parse(teks) as unknown });
        });
      },
    );
    req.on('error', gagal);
    if (teksBadan !== undefined) req.write(teksBadan);
    req.end();
  });
}

/** Baca aliran SSE sampai `event: selesai` (atau batas waktu). */
export function bacaSse(port: number, jalur: string, header: Record<string, string> = {}, batasMs = 10_000): Promise<{ status: number; teks: string }> {
  return new Promise((selesai, gagal) => {
    const req = request({ host: '127.0.0.1', port, method: 'GET', path: jalur, headers: header }, (res) => {
      let teks = '';
      const waktu = setTimeout(() => {
        req.destroy();
        selesai({ status: res.statusCode ?? 0, teks });
      }, batasMs);
      res.on('data', (p: Buffer) => {
        teks += p.toString('utf8');
        if (teks.includes('event: selesai')) {
          clearTimeout(waktu);
          req.destroy();
          selesai({ status: res.statusCode ?? 0, teks });
        }
      });
      res.on('end', () => {
        clearTimeout(waktu);
        selesai({ status: res.statusCode ?? 0, teks });
      });
    });
    req.on('error', (e) => {
      if ((e as NodeJS.ErrnoException).code === 'ECONNRESET') return;
      gagal(e);
    });
    req.end();
  });
}

/** Peristiwa `tahap` dari teks SSE. */
export function peristiwaSse(teks: string): Array<{ no: number; tahap: string; judul: string; isi: Record<string, unknown> }> {
  return teks
    .split('\n\n')
    .filter((b) => b.includes('event: tahap'))
    .map((b) => JSON.parse(b.split('\n').find((l) => l.startsWith('data: '))?.slice(6) ?? '{}'));
}

/** Tulis gudang buatan (bentuk respons Sectors) untuk satu emiten ke `<akar>/.cache/sectors`. */
export function tulisGudangUji(
  akar: string,
  simbol: string,
  harga: ReadonlyArray<{ tanggal: string; tutup: number; volume: number }>,
  suspensi: ReadonlyArray<{ tanggal: string; alasan: string }> = [],
): void {
  const folder = join(akar, '.cache', 'sectors');
  mkdirSync(folder, { recursive: true });
  writeFileSync(
    join(folder, `${simbol}-daily-uji.json`),
    JSON.stringify(harga.map((h) => ({ symbol: `${simbol}.JK`, date: h.tanggal, close: h.tutup, open: h.tutup, high: h.tutup, low: h.tutup, volume: h.volume, market_cap: h.tutup * 1e6 }))),
    'utf8',
  );
  writeFileSync(
    join(folder, 'suspensions-all.json'),
    JSON.stringify(suspensi.map((s) => ({ symbol: `${simbol}.JK`, suspension_date: s.tanggal, reason: s.alasan, pdf_url: null }))),
    'utf8',
  );
}
