// Jalur bersama lengan A dan S: satu panggilan Messages API dengan MCP Sectors.
//
// Dipisah ke berkas sendiri supaya lengan A dan S benar-benar menjalankan kode
// yang sama dan hanya berbeda pada promptnya.

import { createHash } from 'node:crypto';
import { MODEL, panggilModel, uraiJson } from './anthropic.ts';
import { catatKredit, masihMuat, sisaKredit } from './kredit.ts';
import { periksaSkema } from './skema-keluaran.ts';
import type { Percobaan } from './percobaan.ts';

/** Perkiraan biaya satu percobaan MCP, dipakai untuk menjaga pagu sebelum jalan. */
export const PERKIRAAN_KREDIT_PER_PERCOBAAN = 12;

export class PaguTercapai extends Error {
  constructor(sisa: number) {
    super(`Pagu kredit Sectors tercapai: sisa ${sisa}, perkiraan kebutuhan ${PERKIRAAN_KREDIT_PER_PERCOBAAN}. Berhenti.`);
    this.name = 'PaguTercapai';
  }
}

export async function jalankanLenganMcp(lengan: 'A' | 'S', ulangan: number, prompt: string): Promise<Percobaan> {
  if (!masihMuat(PERKIRAAN_KREDIT_PER_PERCOBAAN)) {
    throw new PaguTercapai(sisaKredit());
  }
  const mulai = new Date().toISOString();
  const hasil = await panggilModel({ prompt, pakaiMcpSectors: true });
  const selesai = new Date().toISOString();

  const kredit = hasil.alat.filter((a) => a.server === 'sectors').length;
  catatKredit({
    lengan,
    keterangan: `percobaan ${lengan}-${ulangan}`,
    alat: hasil.alat.map((a) => a.nama),
    kredit,
  });

  const urai = uraiJson(hasil.teks);
  const masalah = urai.ok ? periksaSkema(urai.nilai) : [];

  return {
    lengan,
    ulangan,
    waktu_mulai: mulai,
    waktu_selesai: selesai,
    model: MODEL,
    prompt_sha256: createHash('sha256').update(prompt).digest('hex'),
    prompt_panjang: prompt.length,
    token_masuk: hasil.token_masuk,
    token_keluar: hasil.token_keluar,
    alat_mcp: hasil.alat,
    kredit_sectors: kredit,
    stop_reason: hasil.stop_reason,
    teks_mentah: hasil.teks,
    respons_mentah: hasil.mentah,
    urai_ok: urai.ok,
    alasan_gagal_urai: urai.ok ? null : urai.alasan,
    keluaran: urai.ok ? urai.nilai : null,
    lolos_skema: urai.ok && masalah.length === 0,
    masalah_skema: masalah,
    galat: null,
  };
}
