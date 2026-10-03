/**
 * `npm run penyusun:v3` (M2d-16 D-4 e, D-6) — jalan mesin v3 dari baris
 * perintah. Berdampingan dengan pintu penyusun; tidak mengubahnya.
 *
 *   npm run penyusun:v3 -- --uji-satu-panggilan --id <id> --pagu <usd> --setuju-berbayar
 *       TEPAT SATU panggilan penulis Opus (prompt v3, profil v3), lalu berhenti.
 *       Menyimpan jawaban mentah + teks berpikir (`mentah-panggilan.jsonl`) dan
 *       mencetak token masuk/keluar/penalaran, penyedia, biaya nyata, dan
 *       apakah teks berpikir kembali. Tanpa gerbang, tanpa bank. Inilah
 *       pengukuran yang WAJIB dilakukan sebelum jalan penuh berbayar.
 *
 *   npm run penyusun:v3 -- --id <id> --pagu <usd> --setuju-berbayar
 *       Jalan penuh mesin v3 (bank → penulis → gerbang → bank → simulasi).
 *
 *   tambahkan --palsu: model palsu, tanpa jaringan, tanpa biaya; keluaran
 *   bawaan di folder sementara dan bank PALSU di dalam folder jalan — mode
 *   palsu tidak pernah menulis ke `eval/bank-omongan`.
 *
 * Mode sungguhan menolak berjalan tanpa `--setuju-berbayar`, `--pagu`, dan
 * `--id`. Pagu jalan ditegakkan `PencatatBiaya` sebelum tiap panggilan
 * (perkiraan pra-kirim wajar untuk Opus). Folder jalan yang sudah ada tidak
 * pernah ditimpa.
 */
import { existsSync, mkdirSync, mkdtempSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { isAbsolute, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { bacaBank, FOLDER_BANK, jumlahSudut, shaPaketBank, sudutBank, UKURAN_SIMULASI } from '../../factory/llm/bebas/bank.ts';
import { jalankanV3 } from '../../factory/llm/bebas/mesin-v3.ts';
import { keluaranV3, panggilV3Palsu, tigaOmonganTirt7 } from '../../factory/llm/bebas/palsu-v3.ts';
import { periksaKodeV3, pesanV3, sha256V3, uraiKeluaranV3 } from '../../factory/llm/bebas/prompt-v3.ts';
import { MODEL_OR_OPUS } from '../../factory/llm/model.ts';
import type { PaketFakta } from '../../factory/llm/paket.ts';
import { BIAYA_WAJAR_OPUS_USD, denganMentah, PencatatMentah, PENYEDIA_PERAN, SETELAN_PENULIS_OPUS_V3 } from '../../factory/llm/pemanggil-v2.ts';
import type { PanggilTemplat } from '../../factory/llm/templat/penulis.ts';
import { AWALAN_TAG_PENYUSUN, biayaAwalan } from './biaya.ts';
import { panggilV3 } from './pemanggil-v3.ts';

const AKAR_REPO = fileURLToPath(new URL('../../', import.meta.url));
export const PAKET_BAWAAN_V3 = 'eval/penyusun/m2d11-tirt-7/paket.json';
export const NAMA_MENTAH = 'mentah-panggilan.jsonl';

export interface ArgumenV3 {
  ujiSatuPanggilan: boolean;
  palsu: boolean;
  setujuBerbayar: boolean;
  id: string | null;
  paguUsd: number | null;
  paket: string;
  keluaran: string | null;
  bank: string | null;
}

export function uraiArgumenV3(argv: readonly string[]): ArgumenV3 {
  const a: ArgumenV3 = { ujiSatuPanggilan: false, palsu: false, setujuBerbayar: false, id: null, paguUsd: null, paket: PAKET_BAWAAN_V3, keluaran: null, bank: null };
  for (let i = 0; i < argv.length; i++) {
    const x = argv[i];
    const nilai = argv[i + 1];
    if (x === '--uji-satu-panggilan') a.ujiSatuPanggilan = true;
    else if (x === '--palsu') a.palsu = true;
    else if (x === '--setuju-berbayar') a.setujuBerbayar = true;
    else if (x === '--id' && nilai !== undefined) {
      if (!/^[a-z0-9][a-z0-9-]{0,63}$/.test(nilai)) throw new Error('--id harus huruf kecil/angka/tanda hubung (maks 64).');
      a.id = nilai;
      i++;
    } else if (x === '--pagu' && nilai !== undefined) {
      const n = Number(nilai);
      if (!Number.isFinite(n) || n <= 0) throw new Error('--pagu harus angka dolar positif.');
      a.paguUsd = n;
      i++;
    } else if (x === '--paket' && nilai !== undefined) {
      a.paket = nilai;
      i++;
    } else if (x === '--keluaran' && nilai !== undefined) {
      a.keluaran = nilai;
      i++;
    } else if (x === '--bank' && nilai !== undefined) {
      a.bank = nilai;
      i++;
    } else throw new Error(`Argumen tidak dikenal: ${String(x)}`);
  }
  return a;
}

/* ---------------------------------------------------------------------- */
/* uji satu panggilan                                                      */
/* ---------------------------------------------------------------------- */

export interface RingkasUji {
  model: string;
  penyedia: string | null;
  token_masuk: number;
  token_keluar: number;
  token_penalaran: number | null;
  biaya_usd: number;
  finish_reason: string | null;
  latensi_ms: number;
  max_tokens: number;
  penalaran_diminta: unknown;
  ada_teks_berpikir: boolean;
  karakter_teks_berpikir: number;
  /** {JUMLAH} yang diminta. */
  diminta: number;
  omongan_terbaca: number;
  masalah: string[];
  /** Gerbang kode (gratis) atas tiap omongan terbaca: jumlah penolakan + alasannya. */
  kode: Array<{ urut: number; menolak: number; alasan: string[] }>;
  sha256_prompt: string;
  karakter_prompt: number;
}

/**
 * TEPAT satu panggilan penulis (prompt v3, profil Opus v3), lalu berhenti.
 * Tidak ada gerbang berbayar, tidak ada tulisan ke bank; gerbang kode gratis
 * dijalankan atas keluaran supaya terlihat apa yang akan ditolak.
 */
export async function ujiSatuPanggilan(o: { paket: PaketFakta; panggil: PanggilTemplat; folderBank: string }): Promise<RingkasUji> {
  const bank = bacaBank(o.folderBank, shaPaketBank(o.paket));
  const diminta = Math.max(1, UKURAN_SIMULASI - jumlahSudut(bank));
  const pesan = pesanV3(o.paket, diminta, sudutBank(bank));
  const j = await o.panggil(pesan, SETELAN_PENULIS_OPUS_V3, { jenis: 'tulis-bebas', putaran: 1, omongan: null, ke: 1, peran: 'penulis', model: MODEL_OR_OPUS });
  const u = uraiKeluaranV3(j.teks, diminta);
  const pikir = typeof j.penalaran === 'string' ? j.penalaran.trim() : '';
  return {
    model: MODEL_OR_OPUS, penyedia: j.penyedia ?? null, token_masuk: j.token_masuk, token_keluar: j.token_keluar, token_penalaran: j.token_penalaran ?? null, biaya_usd: j.biaya_usd, finish_reason: j.finish_reason, latensi_ms: j.latensi_ms,
    max_tokens: SETELAN_PENULIS_OPUS_V3.maxTokens, penalaran_diminta: SETELAN_PENULIS_OPUS_V3.tambahanBadan?.['reasoning'] ?? null,
    ada_teks_berpikir: pikir !== '', karakter_teks_berpikir: pikir.length, diminta, omongan_terbaca: u.omongan.length, masalah: u.masalah,
    kode: u.omongan.map((x, i) => {
      const k = periksaKodeV3(x, o.paket).menolak.map((m) => `${m.sumber}: ${m.alasan}`);
      return { urut: i + 1, menolak: k.length, alasan: k.slice(0, 20) };
    }),
    sha256_prompt: sha256V3(pesan.map((x) => x.content).join('\n')), karakter_prompt: pesan.reduce((a, x) => a + x.content.length, 0),
  };
}

const ribuan = (n: number | null): string => (n === null ? '-' : n.toLocaleString('id-ID'));

/** Baris yang dicetak `--uji-satu-panggilan`. Murni. */
export function barisUji(r: RingkasUji): string[] {
  return [
    `model: ${r.model} | penyedia: ${String(r.penyedia)} (terkunci: ${PENYEDIA_PERAN.penulis.nama})`,
    `token masuk ${ribuan(r.token_masuk)} | keluar ${ribuan(r.token_keluar)} | penalaran ${ribuan(r.token_penalaran)} (max_tokens ${ribuan(r.max_tokens)}; diminta ${JSON.stringify(r.penalaran_diminta)})`,
    `biaya nyata: US$${r.biaya_usd.toFixed(6).replace('.', ',')} (perkiraan pra-kirim wajar US$${BIAYA_WAJAR_OPUS_USD.toFixed(5).replace('.', ',')})`,
    `finish_reason: ${String(r.finish_reason)} | latensi ${ribuan(Math.round(r.latensi_ms / 1000))} detik`,
    `teks berpikir: ${r.ada_teks_berpikir ? `ADA (${ribuan(r.karakter_teks_berpikir)} karakter)` : 'TIDAK ADA'}`,
    `omongan terbaca: ${String(r.omongan_terbaca)} dari ${String(r.diminta)}${r.masalah.length > 0 ? ` — ${r.masalah.join('; ').slice(0, 300)}` : ''}`,
    ...r.kode.map((k) => `gerbang kode (gratis) omongan ${String(k.urut)}: ${k.menolak === 0 ? 'lolos' : `${String(k.menolak)} penolakan — ${k.alasan.slice(0, 3).join(' | ').slice(0, 400)}`}`),
  ];
}

/* ---------------------------------------------------------------------- */
/* utama                                                                   */
/* ---------------------------------------------------------------------- */

export interface LingkunganV3 {
  akar: string;
  log: (baris: string) => void;
  jam?: () => Date;
}

const mutlak = (akar: string, jalur: string): string => (isAbsolute(jalur) ? jalur : join(akar, jalur)).replace(/\\/g, '/');

export async function utamaV3(argv: readonly string[], l: LingkunganV3 = { akar: AKAR_REPO, log: (b) => console.log(b) }): Promise<number> {
  const a = uraiArgumenV3(argv);
  const jam = l.jam ?? (() => new Date());
  if (!a.palsu) {
    if (!a.setujuBerbayar) throw new Error('Mode sungguhan memanggil model BERBAYAR: tambahkan --setuju-berbayar (atau --palsu untuk mencoba tanpa biaya).');
    if (a.paguUsd === null) throw new Error('Mode sungguhan butuh --pagu <usd> (pagu jalan ini).');
    if (a.id === null) throw new Error('Mode sungguhan butuh --id <id jalan> (folder dan tag ledger).');
  }
  const id = a.id ?? (a.ujiSatuPanggilan ? 'v3-palsu-uji' : 'v3-palsu');
  const keluaran = a.keluaran === null ? (a.palsu ? mkdtempSync(join(tmpdir(), 'penyusun-v3-')).replace(/\\/g, '/') : mutlak(l.akar, 'eval/penyusun')) : mutlak(l.akar, a.keluaran);
  const folder = `${keluaran}/${id}`;
  const bankSungguhan = mutlak(l.akar, FOLDER_BANK);
  const folderBank = a.bank === null ? (a.palsu ? `${folder}/bank-palsu` : bankSungguhan) : mutlak(l.akar, a.bank);
  if (a.palsu && resolve(folderBank).toLowerCase().startsWith(resolve(bankSungguhan).toLowerCase())) throw new Error('Mode palsu tidak boleh menulis ke bank sungguhan (eval/bank-omongan).');
  if (existsSync(folder)) throw new Error(`Folder jalan ${folder} sudah ada; jalan lama tidak pernah ditimpa — pakai --id lain.`);
  const paket = JSON.parse(readFileSync(mutlak(l.akar, a.paket), 'utf8')) as PaketFakta;
  const awalanTag = `${AWALAN_TAG_PENYUSUN}${id}/`;
  const jalurMentah = `${folder}/${NAMA_MENTAH}`;

  let panggil: PanggilTemplat;
  if (a.palsu) {
    l.log('MODEL PALSU: tanpa jaringan, tanpa biaya nyata; angka token dan biaya di bawah adalah angka palsu.');
    panggil = denganMentah(panggilV3Palsu({ penulis: (n) => keluaranV3(tigaOmonganTirt7().slice(0, n === 1 ? 3 : 1)) }).panggil, new PencatatMentah(jalurMentah, [], jam), awalanTag);
  } else {
    const pagu = a.paguUsd as number;
    const terpakai = biayaAwalan(l.akar, AWALAN_TAG_PENYUSUN);
    panggil = panggilV3({ akar: l.akar, paguMilestoneUsd: Math.round((terpakai + pagu + 0.01) * 10_000) / 10_000, awalanMilestone: AWALAN_TAG_PENYUSUN, log: l.log, jam })(awalanTag, pagu, jalurMentah);
    l.log(`Jalan ${id}: pagu jalan US$${pagu.toFixed(4)} (tag ${awalanTag}); penulis ${MODEL_OR_OPUS} @ ${PENYEDIA_PERAN.penulis.slug}; PID ${String(process.pid)}.`);
  }
  mkdirSync(folder, { recursive: true });
  writeFileSync(`${folder}/paket.json`, `${JSON.stringify(paket, null, 2)}\n`, 'utf8');

  if (a.ujiSatuPanggilan) {
    const r = await ujiSatuPanggilan({ paket, panggil, folderBank });
    writeFileSync(`${folder}/uji-satu-panggilan.json`, `${JSON.stringify({ palsu: a.palsu, id, waktu: jam().toISOString(), ...r }, null, 2)}\n`, 'utf8');
    l.log(`UJI SATU PANGGILAN ${id} — satu panggilan penulis, lalu berhenti:`);
    for (const b of barisUji(r)) l.log(`  ${b}`);
    l.log(`  jawaban mentah + teks berpikir: ${jalurMentah}`);
    return 0;
  }
  const h = await jalankanV3({ paket, panggil, folderBank, idJalan: id, jam, ...(a.palsu ? { labelPenulis: 'PALSU (tanpa model)' } : {}) });
  writeFileSync(`${folder}/hasil.json`, `${JSON.stringify({ palsu: a.palsu, ...h }, null, 2)}\n`, 'utf8');
  l.log(`SELESAI ${id}: ${h.terbit ? 'SIMULASI TERSUSUN' : 'belum tersusun'}; putaran ${String(h.putaran)}; omongan masuk bank ${String(h.bank_baru.length)}; tak-terukur ${String(h.tak_terukur)}; biaya US$${h.biaya_usd.toFixed(6)}; ${h.berhenti ?? ''}`);
  l.log(`  hasil: ${folder}/hasil.json | mentah: ${jalurMentah} | bank: ${folderBank}`);
  return h.berhenti !== null && h.berhenti.startsWith('galat') ? 1 : 0;
}

if (process.argv[1]?.replace(/\\/g, '/').endsWith('/penyusun/jalan-v3.ts') === true) {
  utamaV3(process.argv.slice(2)).then(
    (kode) => {
      process.exitCode = kode;
    },
    (galat: unknown) => {
      console.error(galat instanceof Error ? `${galat.name}: ${galat.message}` : 'galat tak dikenal');
      process.exitCode = 1;
    },
  );
}
