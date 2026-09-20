// Lengan A — model + Sectors MCP, TANPA aturan verifikasi kita.
//
// Promptnya dibangun oleh eval/prompt.ts dari teks yang sama dengan lengan S.
// Satu-satunya perbedaan adalah blok aturan, yang tidak ada di sini. Tidak ada
// satu kata pun yang ditulis khusus untuk melemahkan lengan ini; kalau ada,
// diff prompt di §9 akan memperlihatkannya.

import { promptLengan } from './prompt.ts';
import { jalankanLenganMcp } from './lengan-mcp.ts';
import type { Percobaan } from './percobaan.ts';

export function promptA(): string {
  return promptLengan('A');
}

export async function jalankanA(ulangan: number): Promise<Percobaan> {
  return jalankanLenganMcp('A', ulangan, promptA());
}
