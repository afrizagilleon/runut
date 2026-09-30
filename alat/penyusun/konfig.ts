/**
 * Status konfigurasi pintu penyusun (M2d-9 D-1, D-6).
 *
 * Kunci dibaca dari `.env` HANYA oleh kode server. Yang keluar dari modul ini
 * ke halaman hanyalah NAMA variabel dan boolean "sudah diisi" — tidak pernah
 * nilainya. Satu-satunya jalan nilai kunci meninggalkan `.env` adalah
 * `bacaKonfigLlm()` (→ header klien OpenRouter) dan `bacaKonfig()` di
 * `alat/sectors.ts` (→ header `Authorization` Sectors), keduanya dipanggil
 * hanya saat tindakan berbayar yang sudah disetujui di layar.
 */
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { uraiEnv } from '../../factory/llm/env.ts';
import { BASE_URL_OPENROUTER } from '../../factory/llm/openrouter.ts';

/** Variabel `.env` yang dipakai repo; urutan dan isi = `.env.example` (dites). */
export const VARIABEL_ENV = [
  { nama: 'SECTORS_API_KEY', untuk: 'sectors', wajib: true, arti: 'kunci API Sectors (sectors.app) milikmu; hanya dipakai bila data emiten belum ada di cache' },
  { nama: 'LLM_BASE_URL', untuk: 'llm', wajib: true, arti: 'alamat API OpenRouter: https://openrouter.ai/api/v1' },
  { nama: 'LLM_API_KEY', untuk: 'llm', wajib: true, arti: 'kunci API OpenRouter milikmu' },
  { nama: 'LLM_MODEL', untuk: 'llm', wajib: true, arti: 'model bawaan (diisi, tetapi agen memakai dua model tetap: deepseek/deepseek-v4.1-flash dan z-ai/glm-5.3)' },
  { nama: 'LLM_PAGU_USD', untuk: 'llm', wajib: true, arti: 'pagu dolar kumulatif seluruh panggilan LLM dari mesin ini (ledger .cache/llm/ledger.jsonl)' },
  { nama: 'SECTORS_KREDIT_PAGU', untuk: 'sectors', wajib: false, arti: 'pagu kredit Sectors kumulatif (bawaan 613); panggilan yang melewatinya tidak dikirim' },
] as const;

export type NamaVariabel = (typeof VARIABEL_ENV)[number]['nama'];

export interface StatusKunci {
  /** Semua variabel wajib bagian ini terisi (nilai tidak pernah dikirim). */
  siap: boolean;
  /** Nama variabel wajib yang kosong. */
  hilang: string[];
  /** Catatan tanpa nilai, mis. alamat bukan OpenRouter. */
  catatan: string[];
}

export interface StatusKonfig {
  llm: StatusKunci;
  sectors: StatusKunci;
  /** Pagu kumulatif LLM (angka anggaran, bukan rahasia); `null` bila belum diisi. */
  pagu_llm_usd: number | null;
  /** Pagu kredit Sectors (bawaan 613 bila tidak diisi). */
  pagu_kredit: number;
  /** Daftar variabel untuk petunjuk di halaman: nama + arti, tanpa nilai. */
  variabel: Array<{ nama: string; untuk: string; wajib: boolean; arti: string; terisi: boolean }>;
}

/** Nilai variabel dari `.env` akar (menang) lalu lingkungan proses. Hanya dipakai di dalam modul ini. */
function nilaiEnv(akar: string, proses: Record<string, string | undefined>): Record<string, string> {
  const jalur = join(akar, '.env');
  const berkas = existsSync(jalur) ? uraiEnv(readFileSync(jalur, 'utf8')) : {};
  const hasil: Record<string, string> = {};
  for (const v of VARIABEL_ENV) {
    const dariBerkas = (berkas[v.nama] ?? '').trim();
    const dariProses = (proses[v.nama] ?? '').trim();
    hasil[v.nama] = dariBerkas !== '' ? dariBerkas : dariProses;
  }
  return hasil;
}

/**
 * Status konfigurasi untuk halaman. Murni terhadap `akar` dan `proses`.
 * Keluarannya tidak memuat satu pun nilai variabel kecuali dua angka pagu.
 */
export function statusKonfig(akar: string, proses: Record<string, string | undefined> = process.env): StatusKonfig {
  const env = nilaiEnv(akar, proses);
  const terisi = (n: string): boolean => (env[n] ?? '') !== '';
  const bagian = (untuk: 'llm' | 'sectors'): StatusKunci => {
    const hilang = VARIABEL_ENV.filter((v) => v.untuk === untuk && v.wajib && !terisi(v.nama)).map((v) => v.nama);
    return { siap: hilang.length === 0, hilang, catatan: [] };
  };
  const llm = bagian('llm');
  const url = (env['LLM_BASE_URL'] ?? '').replace(/\/+$/, '');
  if (url !== '' && url !== BASE_URL_OPENROUTER) {
    llm.siap = false;
    llm.catatan.push('LLM_BASE_URL bukan alamat OpenRouter (nilainya tidak ditampilkan); agen hanya memanggil OpenRouter.');
  }
  const paguLlm = Number(env['LLM_PAGU_USD']);
  if (terisi('LLM_PAGU_USD') && !(Number.isFinite(paguLlm) && paguLlm > 0)) {
    llm.siap = false;
    llm.catatan.push('LLM_PAGU_USD harus angka positif.');
  }
  const paguKreditMentah = env['SECTORS_KREDIT_PAGU'] ?? '';
  const paguKredit = paguKreditMentah === '' ? 613 : Number(paguKreditMentah);
  const sectors = bagian('sectors');
  if (!(Number.isFinite(paguKredit) && paguKredit >= 0)) {
    sectors.siap = false;
    sectors.catatan.push('SECTORS_KREDIT_PAGU bukan bilangan yang sah.');
  }
  return {
    llm,
    sectors,
    pagu_llm_usd: Number.isFinite(paguLlm) && paguLlm > 0 ? paguLlm : null,
    pagu_kredit: Number.isFinite(paguKredit) && paguKredit >= 0 ? paguKredit : 613,
    variabel: VARIABEL_ENV.map((v) => ({ nama: v.nama, untuk: v.untuk, wajib: v.wajib, arti: v.arti, terisi: terisi(v.nama) })),
  };
}
