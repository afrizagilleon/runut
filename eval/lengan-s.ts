// Lengan S — model + Sectors MCP + isi docs/aturan-verifikasi.md disisipkan
// ke prompt sebagai "skill".
//
// Ini kontrol yang menentukan: kalau S setara C, yang bernilai adalah aturannya,
// bukan kodenya (3.3). Promptnya identik dengan lengan A kecuali blok aturan.

import { promptLengan } from './prompt.ts';
import { jalankanLenganMcp } from './lengan-mcp.ts';
import type { Percobaan } from './percobaan.ts';

export function promptS(): string {
  return promptLengan('S');
}

export async function jalankanS(ulangan: number): Promise<Percobaan> {
  return jalankanLenganMcp('S', ulangan, promptS());
}
