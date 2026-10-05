/**
 * Replay percobaan AI agent yang sudah terekam (M2d-28) — TANPA jaringan, tanpa API key, tanpa biaya.
 *
 * Membaca `eval/penyusun/<id>/jejak-agen.jsonl` (tiap panggilan model + tiap tool call, berurutan, ditulis saat
 * percobaan sungguhan berjalan) dan `hasil.json`, lalu menampilkannya langkah demi langkah: reasoning agent,
 * tool yang ia pilih, dan tool result yang ia terima. Tidak ada model yang dipanggil; ini pemutaran rekaman,
 * bukan simulasi ulang.
 *
 *   npm run agen:replay                         # percobaan bawaan: AMAG dari kode saham
 *   npm run agen:replay -- --id m2d27-amag-naik-2 [--cepat] [--penuh] [--daftar]
 */
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { AKAR } from '../../factory/llm/env.ts';

export const ID_BAWAAN = 'm2d26-amag-1';
const MAKS_REASONING = 420;

export interface BarisJejak {
  jenis: 'model' | 'alat' | 'percakapan';
  ke?: number;
  alat?: string;
  ringkas?: string;
  hasil?: unknown;
  penalaran?: string | null;
  teks?: string | null;
  memanggil?: string[];
  token_masuk?: number | null;
  token_keluar?: number | null;
  token_penalaran?: number | null;
  biaya_usd?: number;
  latensi_ms?: number;
  mode_hemat?: boolean;
}

export interface OpsiReplay {
  penuh?: boolean;
}

const usd = (x: number): string => `US$${x.toFixed(4)}`;
const pangkas = (t: string, n: number): string => (t.length <= n ? t : `${t.slice(0, n).trimEnd()} …`);
const satuBaris = (t: string): string => t.replace(/\s+/g, ' ').trim();

/** Baris-baris rincian untuk satu tool result (hanya yang menjelaskan keputusan agent berikutnya). Murni. */
export function rincianAlat(b: BarisJejak): string[] {
  const h = b.hasil as Record<string, unknown> | null | undefined;
  if (h === null || h === undefined || typeof h !== 'object') return [];
  const keluar: string[] = [];
  const daftar = (x: unknown): string[] => (Array.isArray(x) ? x.filter((y): y is string => typeof y === 'string') : []);
  if (b.alat === 'usulkan_hari' && Array.isArray(h['hari'])) {
    for (const x of h['hari'] as Array<{ tanggal: string; jenis: string[]; kartu_lolos: number; disingkirkan: number }>) keluar.push(`${x.tanggal} · ${x.jenis.join(', ')} · ${String(x.kartu_lolos)} kartu lolos, ${String(x.disingkirkan)} disingkirkan`);
  }
  if (b.alat === 'periksa_saham' && typeof h['aturan_dijalankan'] === 'number') {
    keluar.push(`sumber: ${String(h['sumber'])}`);
    keluar.push(`aturan R: ${String(h['aturan_dijalankan'])} dijalankan, ${String(h['aturan_dilewati'])} tidak berlaku untuk saham ini`);
    for (const d of (h['disingkirkan'] as Array<{ fact_id: string; alasan: string }> | undefined) ?? []) keluar.push(`disingkirkan ${d.fact_id}: ${d.alasan}`);
  }
  for (const p of daftar(h['penolakan']).slice(0, 3)) keluar.push(`penolakan: ${pangkas(satuBaris(p), 260)}`);
  for (const p of daftar(h['catatan']).slice(0, 2)) keluar.push(`catatan: ${pangkas(satuBaris(p), 260)}`);
  if (typeof h['peringatan_anggaran'] === 'string') keluar.push(`budget: ${h['peringatan_anggaran']}`);
  if (typeof h['biaya_pengajuan_usd'] === 'number' && h['biaya_pengajuan_usd'] > 0) keluar.push(`biaya pengujian ${usd(h['biaya_pengajuan_usd'])}, sisa budget ${usd(Number(h['sisa_anggaran_usd'] ?? 0))}`);
  return keluar;
}

/** Ubah jejak menjadi baris-baris teks, satu blok per langkah. Murni. */
export function susunReplay(jejak: readonly BarisJejak[], o: OpsiReplay = {}): string[][] {
  const blok: string[][] = [];
  let total = 0;
  for (const b of jejak) {
    if (b.jenis === 'percakapan') {
      blok.push([`── percakapan ${String(b.ke ?? '?')} ──`]);
    } else if (b.jenis === 'model') {
      total += b.biaya_usd ?? 0;
      const baris = [`AGENT · langkah ${String(b.ke ?? '?')} · ${String(Math.round((b.latensi_ms ?? 0) / 1000))} detik · ${usd(b.biaya_usd ?? 0)} (total agent ${usd(total)})${b.mode_hemat === true ? ' · mode hemat' : ''}`];
      const nalar = satuBaris(b.penalaran ?? '');
      if (nalar !== '') baris.push(`  reasoning (${String(b.token_penalaran ?? 0)} token): ${o.penuh === true ? nalar : pangkas(nalar, MAKS_REASONING)}`);
      const teks = satuBaris(b.teks ?? '');
      if (teks !== '') baris.push(`  berkata: ${pangkas(teks, 300)}`);
      baris.push((b.memanggil ?? []).length > 0 ? `  memilih tool: ${(b.memanggil ?? []).join(', ')}` : '  tidak memanggil tool (selesai)');
      blok.push(baris);
    } else {
      blok.push([`  TOOL RESULT · ${b.alat ?? '?'}: ${b.ringkas ?? ''}`, ...rincianAlat(b).map((r) => `      ${r}`)]);
    }
  }
  return blok;
}

export function bacaJejak(folder: string): BarisJejak[] {
  return readFileSync(`${folder}/jejak-agen.jsonl`, 'utf8').split('\n').filter((l) => l.trim() !== '').map((l) => JSON.parse(l) as BarisJejak);
}

async function utama(): Promise<void> {
  const arg = (nama: string): string | null => {
    const i = process.argv.indexOf(nama);
    return i >= 0 ? (process.argv[i + 1] ?? null) : null;
  };
  const akar = `${AKAR}eval/penyusun`;
  if (process.argv.includes('--daftar')) {
    for (const nama of readdirSync(akar).sort()) if (existsSync(`${akar}/${nama}/jejak-agen.jsonl`)) console.log(nama);
    return;
  }
  const id = arg('--id') ?? ID_BAWAAN;
  const folder = `${akar}/${id}`;
  if (!existsSync(`${folder}/jejak-agen.jsonl`)) throw new Error(`tidak ada rekaman untuk "${id}" (lihat --daftar)`);
  const jeda = process.argv.includes('--cepat') ? 0 : 350;
  const hasil = existsSync(`${folder}/hasil.json`) ? (JSON.parse(readFileSync(`${folder}/hasil.json`, 'utf8')) as Record<string, unknown>) : {};
  console.log(`REPLAY percobaan "${id}" — rekaman percobaan sungguhan; tidak ada model yang dipanggil, tidak ada jaringan, tidak ada biaya.`);
  console.log(`model: ${String(hasil['model'] ?? '?')} · mode: ${String(hasil['mode'] ?? 'susun')}${hasil['kode'] ? ` · kode saham: ${String(hasil['kode'])}` : ''} · budget: US$${String(hasil['pagu_usd'] ?? '?')}\n`);
  for (const blok of susunReplay(bacaJejak(folder), { penuh: process.argv.includes('--penuh') })) {
    for (const baris of blok) console.log(baris);
    if (jeda > 0) await new Promise((r) => setTimeout(r, jeda));
  }
  const sim = hasil['simulasi'] as { terbit?: boolean; draf?: { omongan: Array<{ nama: string; pesan: string; pilihan: Record<string, string>; kunci: string }> } | null } | undefined;
  console.log(`\nSELESAI: ${String(hasil['berhenti'] ?? '?')} · ${String(hasil['panggilan_model'] ?? '?')} panggilan model · ${String(hasil['pengajuan'] ?? '?')} pengujian · total ${usd(Number(hasil['biaya_usd'] ?? 0))}`);
  for (const o of sim?.draf?.omongan ?? []) console.log(`  ${o.nama}: "${satuBaris(o.pesan.replace(/\[\[[^|\]]+\|([^\]]+)\]\]/g, '$1'))}" → ${satuBaris((o.pilihan[o.kunci] ?? '').replace(/\[\[[^|\]]+\|([^\]]+)\]\]/g, '$1'))}`);
  const naik = (hasil['peningkatan'] as Array<{ nama: string; tingkat: string | null }> | undefined) ?? [];
  if (naik.length > 0) console.log(`  versi lebih sulit: ${naik.map((n) => `${n.nama} (${n.tingkat ?? 'tak terukur'})`).join(', ')}`);
}

if (process.argv[1]?.replace(/\\/g, '/').endsWith('alat/agen/putar-ulang.ts') === true) await utama();
