/**
 * `npm run penulis:mutu` — D-D M2d-13 (pra-registrasi §7): mutu pemula,
 * penilai BUTA dua keluarga, SATU butir per panggilan/berkas.
 *
 * Butir: versi akhir semua omongan D-B + 3 omongan draf TIRT-7 (templat
 * M2d-11) + 3 soal DADA tayang. Bentuk tampilan seragam (pesan, kartu,
 * pilihan, kunci, penjelasan); label, umpan balik, penulis dan asal tidak
 * ditampilkan; id & urutan diacak (benih tertulis).
 *
 * - `--bahan`: paket penilai Opus untuk reviewer `eval/keluaran-m2d13/mutu-opus/bahan/<mNN>.md`
 *   + `kunci-mutu.json` (DI LUAR bahan) — tanpa biaya.
 * - `--glm`: penilai GLM-5.3 (`effort:"medium"`, `max_tokens` 16.000, Wafer,
 *   penjaga penalaran ≥ 500 token); tak terbaca/tak sah diulang sekali, tetap
 *   gagal = hilang (dilaporkan). Pagu bagian US$0,40 (`m2d13/mutu/`) di dalam
 *   pagu milestone US$2,50 (tag `m2d13/` + biaya `penyusun/m2d13-`).
 * - `--nilai-opus`: `mutu-opus/jawaban/<mNN>.txt` → `mutu-opus/nilai.json`.
 */
import { existsSync, mkdirSync, readdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { teksPolos } from '../../skema/rujukan.ts';
import type { OmonganDraf } from '../draf.ts';
import { AKAR, bacaKonfigLlm } from '../env.ts';
import { kartuOmongan } from '../gerbang-kartu.ts';
import { soalManusiaM2d8 } from '../kalibrasi-soal.ts';
import type { KonfigKlien, PesanChat } from '../klien.ts';
import { MODEL_OR_GLM } from '../model.ts';
import { BASE_URL_OPENROUTER } from '../openrouter.ts';
import { chatBerpagu, JALUR_LEDGER, PaguTercapai, PencatatBiaya, type EntriLedger } from '../pagu.ts';
import type { PaketFakta } from '../paket.ts';
import { uraiKeluaran } from '../susun.ts';
import { pagarKritikusTerkunci } from '../templat/penyedia.ts';
import { butirAkhirDB, FOLDER_M2D13, urutButa } from './audit.ts';
import { PAGU_DD, PAGU_MILESTONE_M2D13 } from './pagu-adil.ts';
import { drafDari } from './skema.ts';

export const FOLDER_MUTU = `${FOLDER_M2D13}/mutu`;
export const FOLDER_MUTU_OPUS = `${FOLDER_M2D13}/mutu-opus`;
export const BENIH_MUTU = 'm2d13-mutu';
export const KRITERIA = ['bergantung_kartu', 'pengecoh_diagnostik', 'penjelasan_mengajar', 'bahasa_pemula', 'benar_satu_kunci'] as const;
export type Kriteria = (typeof KRITERIA)[number];
export const SETELAN_PENILAI_GLM = { suhu: 0, maxTokens: 16_000, tambahanBadan: { reasoning: { effort: 'medium' } }, ambangPenalaran: 500 } as const;
/**
 * AMANDEMEN TEKNIS (sesudah jalan penilai pra-registrasi, sebelum skor sah
 * mana pun ada): di Wafer `effort:"medium"` membuat GLM nyaris tidak berpikir
 * (1–80 token penalaran) sehingga hampir semua penilaian tidak sah menurut
 * penjaga 500 token pra-registrasi. Setelan terdekat yang terbukti berpikir =
 * effort kritikus ("high", M2d-8); `max_tokens`, suhu, penjaga, rubrik,
 * butir, dan pagu bagian D-D tidak berubah. Hasil disimpan terpisah
 * (`glm-tinggi.json`, tag `m2d13/mutu/tinggi/`).
 */
export const SETELAN_PENILAI_GLM_TINGGI = { suhu: 0, maxTokens: 16_000, tambahanBadan: { reasoning: { effort: 'high' } }, ambangPenalaran: 500 } as const;
export const AWALAN_MUTU = 'm2d13/mutu/';

export type AsalMutu = 'opus' | 'haiku' | 'deepseek' | 'templat-m2d11' | 'tayang-dada';

export interface ButirMutu {
  id_buta: string;
  asal: AsalMutu;
  sumber: string;
  omongan: OmonganDraf;
  paket: PaketFakta;
}

export const promptPenilai = (): string => readFileSync(fileURLToPath(new URL('./prompt-penilai-mutu.md', import.meta.url)), 'utf8').replace(/\r\n/g, '\n').trim();

/** Teks satu butir (seragam, tanpa label/umpan balik/asal). Murni. */
export function teksButir(b: Pick<ButirMutu, 'omongan' | 'paket'>): string {
  const o = b.omongan;
  return [
    `Pesan dari ${o.nama} (${o.jam}): "${teksPolos(o.pesan)}"`,
    'Kartu:',
    ...kartuOmongan(o, b.paket).map((c) => `- Kartu ${String(c.no)} — ${c.kepala}: ${c.isi}`),
    `Pertanyaan: Omongan ${o.nama} cocok dengan dokumennya?`,
    ...(['a', 'b', 'c', 'd'] as const).map((h) => `${h}) ${teksPolos(o.pilihan[h])}`),
    `Kunci: ${o.kunci}`,
    `Penjelasan: ${teksPolos(o.penjelasan)}`,
  ].join('\n');
}

const paketTirt = (): PaketFakta => JSON.parse(readFileSync(`${AKAR}eval/penyusun/m2d11-tirt-7/paket.json`, 'utf8')) as PaketFakta;

/** Semua butir mutu, urutan buta. */
export function butirMutu(): ButirMutu[] {
  const tirt = paketTirt();
  const db = butirAkhirDB().map((b) => ({ asal: b.penulis as AsalMutu, sumber: `${b.jalan}/o${String(b.no)}/v${String(b.versi)}${b.lulus ? '/lulus' : ''}`, omongan: drafDari(b.omongan), paket: tirt }));
  const t7 = (JSON.parse(readFileSync(`${AKAR}eval/penyusun/m2d11-tirt-7/hasil.json`, 'utf8')) as { kunci: Array<{ no: number; omongan: OmonganDraf }> }).kunci.map((k) => ({ asal: 'templat-m2d11' as const, sumber: `m2d11-tirt-7/o${String(k.no)}`, omongan: k.omongan, paket: tirt }));
  const dada = soalManusiaM2d8()
    .filter((s) => s.id.startsWith('dada-'))
    .map((s) => ({ asal: 'tayang-dada' as const, sumber: `tayang-${s.id}`, omongan: s.omongan, paket: s.paket }));
  return urutButa([...db, ...t7, ...dada], (x) => x.sumber, BENIH_MUTU).map((x, i) => ({ ...x, id_buta: `m${String(i + 1).padStart(2, '0')}` }));
}

export interface PenilaianMutu {
  skor: Record<Kriteria, number>;
  total: number;
  layak_tayang: boolean;
  alasan: string;
}

/** Urai jawaban penilai; null bila bentuknya tidak sah. Murni. */
export function uraiPenilaian(teks: string): PenilaianMutu | null {
  const u = uraiKeluaran(teks);
  if (!u.ok) return null;
  const x = u.nilai as { skor?: Record<string, unknown>; layak_tayang?: unknown; alasan?: unknown } | null;
  if (x === null || typeof x !== 'object' || typeof x.skor !== 'object' || x.skor === null) return null;
  const skor = {} as Record<Kriteria, number>;
  for (const k of KRITERIA) {
    const v = x.skor[k];
    if (typeof v !== 'number' || ![0, 1, 2].includes(v)) return null;
    skor[k] = v;
  }
  if (typeof x.layak_tayang !== 'boolean') return null;
  return { skor, total: KRITERIA.reduce((a, k) => a + skor[k], 0), layak_tayang: x.layak_tayang, alasan: typeof x.alasan === 'string' ? x.alasan : '' };
}

function tulisKunci(butir: readonly ButirMutu[]): void {
  mkdirSync(FOLDER_M2D13, { recursive: true });
  writeFileSync(`${FOLDER_M2D13}/kunci-mutu.json`, `${JSON.stringify({ benih: BENIH_MUTU, butir: butir.map((b) => ({ id_buta: b.id_buta, asal: b.asal, sumber: b.sumber })) }, null, 2)}\n`, 'utf8');
}

function bahanOpus(): number {
  const butir = butirMutu();
  tulisKunci(butir);
  rmSync(`${FOLDER_MUTU_OPUS}/bahan`, { recursive: true, force: true });
  mkdirSync(`${FOLDER_MUTU_OPUS}/bahan`, { recursive: true });
  mkdirSync(`${FOLDER_MUTU_OPUS}/jawaban`, { recursive: true });
  for (const b of butir) writeFileSync(`${FOLDER_MUTU_OPUS}/bahan/${b.id_buta}.md`, `${promptPenilai()}\n\n---\n\n${teksButir(b)}\n`, 'utf8');
  writeFileSync(
    `${FOLDER_MUTU_OPUS}/PETUNJUK.md`,
    [
      '# Penilai mutu Opus M2d-13 (D-D) — petunjuk untuk reviewer',
      '',
      'Disiapkan kode eksekutor; eksekutor TIDAK menjalankan penilai Opus dan tidak menulis hasilnya.',
      '',
      '1. Untuk tiap berkas `bahan/<mNN>.md` (satu butir; rubrik yang sama dengan penilai GLM), jalankan SATU subagent Claude **opus baru**, SINKRON, yang hanya menerima isi berkas itu. Asal butir ada di `../kunci-mutu.json` — jangan diberikan ke subagent.',
      '2. Simpan jawaban mentahnya apa adanya di `jawaban/<mNN>.txt`.',
      '3. `npm run penulis:mutu -- --nilai-opus` → `nilai.json`; lalu `npm run penulis:laporan` memperbarui kesepakatan penilai, H3b, dan bagian mutu H4.',
      '',
    ].join('\n'),
    'utf8',
  );
  console.log(`${String(butir.length)} berkas penilai Opus di ${FOLDER_MUTU_OPUS}/bahan`);
  return 0;
}

function entri(): EntriLedger[] {
  return existsSync(JALUR_LEDGER) ? readFileSync(JALUR_LEDGER, 'utf8').split(/\r?\n/).filter((x) => x.trim() !== '').map((x) => JSON.parse(x) as EntriLedger) : [];
}

export interface HasilGlm {
  id_buta: string;
  percobaan: Array<{ teks: string; token_penalaran: number | null; penyedia: string | null; biaya_usd: number; sah: boolean; alasan: string }>;
  penilaian: PenilaianMutu | null;
}

async function glm(tinggi = false): Promise<number> {
  const SETELAN = tinggi ? SETELAN_PENILAI_GLM_TINGGI : SETELAN_PENILAI_GLM;
  const awalanTag = tinggi ? `${AWALAN_MUTU}tinggi/` : AWALAN_MUTU;
  const konfig = bacaKonfigLlm();
  if (konfig.baseUrl !== BASE_URL_OPENROUTER) throw new Error('LLM_BASE_URL bukan OpenRouter (nilainya tidak dicetak).');
  const biayaPenyusun = entri().filter((e) => e.tag.startsWith('penyusun/m2d13-')).reduce((a, e) => a + e.biaya_usd, 0);
  const biaya = new PencatatBiaya({
    paguUsd: konfig.paguUsd,
    jalurLedger: JALUR_LEDGER,
    biayaNyata: true,
    paguMilestone: { usd: PAGU_MILESTONE_M2D13 - biayaPenyusun, awalanTag: 'm2d13/' },
    paguBagian: [{ usd: PAGU_DD, awalanTag: AWALAN_MUTU }],
  });
  const klien: KonfigKlien = { baseUrl: konfig.baseUrl, apiKey: konfig.apiKey, batasWaktuMs: 900_000, pagar: pagarKritikusTerkunci };
  const butir = butirMutu();
  tulisKunci(butir);
  mkdirSync(FOLDER_MUTU, { recursive: true });
  const jalur = `${FOLDER_MUTU}/${tinggi ? 'glm-tinggi' : 'glm'}.json`;
  const lama = existsSync(jalur) ? (JSON.parse(readFileSync(jalur, 'utf8')) as { hasil: HasilGlm[] }).hasil : [];
  const hasil: HasilGlm[] = lama.filter((h) => butir.some((b) => b.id_buta === h.id_buta) && h.penilaian !== null);
  const simpan = (): void => writeFileSync(jalur, `${JSON.stringify({ setelan: SETELAN, model: MODEL_OR_GLM, biaya_tag_usd: biaya.totalAwalan(awalanTag), hasil }, null, 2)}\n`, 'utf8');
  for (const b of butir) {
    if (hasil.some((h) => h.id_buta === b.id_buta)) continue;
    const pesan: PesanChat[] = [
      { role: 'system', content: promptPenilai() },
      { role: 'user', content: teksButir(b) },
    ];
    const h: HasilGlm = { id_buta: b.id_buta, percobaan: [], penilaian: null };
    try {
      for (let ulang = 0; ulang < 2 && h.penilaian === null; ulang++) {
        const j = await chatBerpagu(klien, biaya, { model: MODEL_OR_GLM, pesan, suhu: SETELAN.suhu, maxTokens: SETELAN.maxTokens, tambahanBadan: SETELAN.tambahanBadan }, `${awalanTag}${b.id_buta}${ulang > 0 ? `/u${String(ulang)}` : ''}`, { ambangPenalaran: SETELAN.ambangPenalaran });
        const tp = j.token_penalaran ?? null;
        const p = uraiPenilaian(j.teks);
        const sahPenalaran = tp !== null && tp >= SETELAN.ambangPenalaran;
        const sah = p !== null && sahPenalaran;
        h.percobaan.push({ teks: j.teks, token_penalaran: tp, penyedia: j.penyedia ?? null, biaya_usd: j.biaya_usd, sah, alasan: p === null ? 'tak terbaca' : sahPenalaran ? '' : `penalaran ${String(tp)} < ${String(SETELAN.ambangPenalaran)}` });
        if (sah) h.penilaian = p;
      }
    } catch (galat) {
      hasil.push(h);
      simpan();
      console.error(`${b.id_buta}: ${galat instanceof Error ? `${galat.name}: ${galat.message}` : 'galat'}`);
      return galat instanceof PaguTercapai ? 2 : 1;
    }
    hasil.push(h);
    simpan();
    console.log(`${b.id_buta} ${h.penilaian === null ? 'HILANG' : `total ${String(h.penilaian.total)} layak ${String(h.penilaian.layak_tayang)}`} (US$${h.percobaan.reduce((a, x) => a + x.biaya_usd, 0).toFixed(4)}; bagian US$${biaya.totalAwalan(AWALAN_MUTU).toFixed(4)})`);
  }
  simpan();
  return 0;
}

function nilaiOpus(): number {
  const butir = (JSON.parse(readFileSync(`${FOLDER_M2D13}/kunci-mutu.json`, 'utf8')) as { butir: Array<{ id_buta: string }> }).butir;
  const folder = `${FOLDER_MUTU_OPUS}/jawaban`;
  const ada = existsSync(folder) ? readdirSync(folder) : [];
  const hasil = butir.map((b) => {
    const teks = ada.includes(`${b.id_buta}.txt`) ? readFileSync(`${folder}/${b.id_buta}.txt`, 'utf8') : null;
    return { id_buta: b.id_buta, ada: teks !== null, penilaian: teks === null ? null : uraiPenilaian(teks) };
  });
  writeFileSync(`${FOLDER_MUTU_OPUS}/nilai.json`, `${JSON.stringify({ hasil }, null, 2)}\n`, 'utf8');
  console.log(`${String(hasil.filter((h) => h.penilaian !== null).length)}/${String(hasil.length)} penilaian Opus terbaca`);
  return 0;
}

if (/(^|[\\/])bebas[\\/]mutu\.ts$/.test(process.argv[1] ?? '')) {
  const a = process.argv;
  if (a.includes('--glm')) {
    glm(a.includes('--tinggi')).then(
      (k) => {
        process.exitCode = k;
      },
      (g: unknown) => {
        console.error(g instanceof Error ? `${g.name}: ${g.message}` : 'galat');
        process.exitCode = 1;
      },
    );
  } else process.exitCode = a.includes('--nilai-opus') ? nilaiOpus() : bahanOpus();
}
