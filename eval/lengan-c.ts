// Lengan C — produk kita: pipeline verifikasi + model yang hanya menulis
// kalimat dari fakta yang sudah lolos verifikasi.
//
// Modelnya TIDAK memanggil MCP dan tidak melihat data mentah; ia hanya menerima
// bahan yang sudah disaring pipeline. Karena itu lengan C memakai 0 kredit
// Sectors, dan itu salah satu angka yang dicari OQ-3.
//
// Berkas ini tidak boleh mengimpor eval/kunci.ts (lihat eval/pemisahan.test.ts).

import { createHash } from 'node:crypto';
import { MODEL, panggilModel, uraiJson } from './anthropic.ts';
import { catatKredit } from './kredit.ts';
import { bahanLenganC, bahanSebagaiTeks } from './muat-folk.ts';
import { promptLenganC } from './prompt.ts';
import { periksaSkema } from './skema-keluaran.ts';
import type { Percobaan } from './percobaan.ts';

export function promptC(): string {
  return promptLenganC(bahanSebagaiTeks(bahanLenganC()));
}

export async function jalankanC(ulangan: number): Promise<Percobaan> {
  const prompt = promptC();
  const mulai = new Date().toISOString();
  const hasil = await panggilModel({ prompt, pakaiMcpSectors: false });
  const selesai = new Date().toISOString();

  catatKredit({
    lengan: 'C',
    keterangan: `percobaan C-${ulangan} (pipeline dari cache, tanpa MCP)`,
    alat: [],
    kredit: 0,
  });

  const urai = uraiJson(hasil.teks);
  const masalah = urai.ok ? periksaSkema(urai.nilai) : [];

  return {
    lengan: 'C',
    ulangan,
    waktu_mulai: mulai,
    waktu_selesai: selesai,
    model: MODEL,
    prompt_sha256: createHash('sha256').update(prompt).digest('hex'),
    prompt_panjang: prompt.length,
    token_masuk: hasil.token_masuk,
    token_keluar: hasil.token_keluar,
    alat_mcp: [],
    kredit_sectors: 0,
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
