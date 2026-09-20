// Klien Messages API untuk lengan A, S, dan C.
//
// Kunci hanya dibaca dari .env (INV-3). MCP Sectors dipasang lewat field
// `mcp_servers` dengan header beta `mcp-client-2025-04-04`; jalur ini sudah
// diverifikasi pemilik pada 20 Sep 2026 dan tidak diuji ulang dari nol.
//
// Modul ini tidak boleh membaca .cache/kunci/.

import { readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { AKAR } from './berkas.ts';

export const MODEL = 'claude-sonnet-5';
export const URL_MCP_SECTORS = 'https://sectors-mcp.supertype.ai/mcp';

let envTerbaca: Record<string, string> | null = null;

function muatEnv(): Record<string, string> {
  if (envTerbaca) return envTerbaca;
  const jalur = join(AKAR, '.env');
  if (!existsSync(jalur)) throw new Error('.env tidak ada; kunci API tidak boleh ditulis di repo (INV-3).');
  const hasil: Record<string, string> = {};
  for (const baris of readFileSync(jalur, 'utf8').split(/\r?\n/)) {
    const cocok = /^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/.exec(baris);
    if (!cocok) continue;
    const nama = cocok[1];
    const nilai = cocok[2];
    if (nama === undefined || nilai === undefined) continue;
    hasil[nama] = nilai.replace(/^["']|["']$/g, '');
  }
  envTerbaca = hasil;
  return hasil;
}

export function kunci(nama: 'ANTHROPIC_API_KEY' | 'SECTORS_API_KEY'): string {
  const nilai = muatEnv()[nama];
  if (!nilai) throw new Error(`${nama} tidak ada di .env`);
  return nilai;
}

interface BlokIsi {
  type: string;
  text?: string;
  name?: string;
  server_name?: string;
  is_error?: boolean;
  [k: string]: unknown;
}

interface ResponsMessages {
  id: string;
  model: string;
  stop_reason: string | null;
  content: BlokIsi[];
  usage: { input_tokens: number; output_tokens: number; [k: string]: unknown };
}

export interface PanggilanAlat {
  nama: string;
  server: string;
  gagal: boolean;
}

export interface HasilPanggilan {
  teks: string;
  alat: PanggilanAlat[];
  token_masuk: number;
  token_keluar: number;
  stop_reason: string | null;
  /** Respons mentah apa adanya, untuk disimpan ke eval/keluaran/. */
  mentah: unknown;
}

export interface OpsiPanggilan {
  prompt: string;
  /** Pasang MCP Sectors. Lengan C tidak memakainya. */
  pakaiMcpSectors: boolean;
  maxTokens?: number;
}

export async function panggilModel(opsi: OpsiPanggilan): Promise<HasilPanggilan> {
  const badan: Record<string, unknown> = {
    model: MODEL,
    max_tokens: opsi.maxTokens ?? 32000,
    messages: [{ role: 'user', content: opsi.prompt }],
  };
  const header: Record<string, string> = {
    'content-type': 'application/json',
    'x-api-key': kunci('ANTHROPIC_API_KEY'),
    'anthropic-version': '2023-06-01',
  };
  if (opsi.pakaiMcpSectors) {
    badan['mcp_servers'] = [
      {
        type: 'url',
        url: URL_MCP_SECTORS,
        name: 'sectors',
        authorization_token: kunci('SECTORS_API_KEY'),
      },
    ];
    header['anthropic-beta'] = 'mcp-client-2025-04-04';
  }

  const respons = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: header,
    body: JSON.stringify(badan),
    signal: AbortSignal.timeout(15 * 60 * 1000),
  });
  const teksRespons = await respons.text();
  if (!respons.ok) {
    throw new Error(`Messages API ${respons.status}: ${teksRespons.slice(0, 2000)}`);
  }
  const data = JSON.parse(teksRespons) as ResponsMessages;

  const alat: PanggilanAlat[] = [];
  let teks = '';
  for (const blok of data.content ?? []) {
    if (blok.type === 'text' && typeof blok.text === 'string') teks += blok.text;
    if (blok.type === 'mcp_tool_use') {
      alat.push({ nama: blok.name ?? '?', server: blok.server_name ?? '?', gagal: false });
    }
    if (blok.type === 'mcp_tool_result' && blok.is_error === true) {
      const terakhir = alat[alat.length - 1];
      if (terakhir) terakhir.gagal = true;
    }
  }

  return {
    teks,
    alat,
    token_masuk: data.usage?.input_tokens ?? 0,
    token_keluar: data.usage?.output_tokens ?? 0,
    stop_reason: data.stop_reason,
    mentah: data,
  };
}

/**
 * Ambil obyek JSON pertama dari teks model. TIDAK memperbaiki apa pun: kalau
 * tidak ada JSON yang bisa diurai, pemanggil harus menyimpan keluaran apa
 * adanya dan menandainya gagal (aturan pelaporan 3).
 */
export function uraiJson(teks: string): { ok: true; nilai: unknown } | { ok: false; alasan: string } {
  const pagar = /```(?:json)?\s*([\s\S]*?)```/.exec(teks);
  const kandidat = pagar?.[1] ?? teks;
  const mulai = kandidat.indexOf('{');
  const akhir = kandidat.lastIndexOf('}');
  if (mulai === -1 || akhir === -1 || akhir <= mulai) {
    return { ok: false, alasan: 'tidak ada blok JSON di keluaran' };
  }
  try {
    return { ok: true, nilai: JSON.parse(kandidat.slice(mulai, akhir + 1)) };
  } catch (galat) {
    return { ok: false, alasan: `JSON tidak bisa diurai: ${galat instanceof Error ? galat.message : String(galat)}` };
  }
}
