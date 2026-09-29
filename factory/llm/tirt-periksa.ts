/**
 * `npm run tirt:periksa` — pemeriksaan kunci & penyedia SEBELUM panggilan
 * berbayar pertama M2d-5 (kontrak D-0b). Tanpa biaya: `GET /key` dan
 * `GET /models/<id>/endpoints`.
 *
 * Yang dicetak hanya status dan angka: apakah `LLM_BASE_URL` sama dengan
 * `https://openrouter.ai/api/v1` (ya/tidak — nilainya tidak dicetak), pagu
 * kumulatif, batas/pemakaian kunci, dan penyedia tiap model yang lolos pagar
 * (kuantisasi, harga, parameter). Kunci dan label kunci tidak pernah dicetak.
 *
 * Kode keluar: 0 kunci sah; 2 kunci belum terpasang/ditolak atau base URL
 * bukan OpenRouter; 4 saldo/limit habis.
 */
import { bacaKonfigLlm } from './env.ts';
import { GalatLlm } from './klien.ts';
import { MODEL_M2D5 } from './model.ts';
import { BASE_URL_OPENROUTER, daftarEndpoint, lolosPagar, pagarPenyedia, periksaKunci } from './openrouter.ts';

/** Parameter yang dikirim lingkar M2d-5 (penyedia wajib mendukung semuanya, `require_parameters`). */
export const PARAMETER_M2D5 = ['max_tokens', 'temperature', 'reasoning'] as const;

async function utama(): Promise<number> {
  let konfig;
  try {
    konfig = bacaKonfigLlm();
  } catch (galat) {
    console.error(`Konfigurasi LLM belum lengkap: ${galat instanceof Error ? galat.message : 'galat'}`);
    return 2;
  }
  const openRouter = konfig.baseUrl === BASE_URL_OPENROUTER;
  console.log(`LLM_BASE_URL = ${BASE_URL_OPENROUTER}: ${openRouter ? 'ya' : 'TIDAK'}; pagu kumulatif LLM_PAGU_USD = ${konfig.paguUsd.toFixed(2)}; kunci terpasang: ${konfig.apiKey.length > 0 ? 'ya' : 'tidak'}.`);
  if (!openRouter) return 2;
  const klien = { baseUrl: konfig.baseUrl, apiKey: konfig.apiKey };
  try {
    const k = await periksaKunci(klien);
    console.log(
      `GET /key: HTTP ${String(k.status)}; limit ${String(k.limit)}; sisa limit ${String(k.limit_remaining)}; ` +
        `pemakaian ${String(k.usage)} (hari ini ${String(k.usage_daily)}); tier gratis ${String(k.is_free_tier)}.`,
    );
    if (k.limit_remaining !== null && k.limit_remaining <= 0) {
      console.error('Limit kunci habis; berhenti (kontrak D-0).');
      return 4;
    }
  } catch (galat) {
    const status = galat instanceof GalatLlm ? galat.status : null;
    console.error(`Kunci ditolak atau tidak bisa diperiksa (HTTP ${String(status)}); berhenti sebelum panggilan berbayar.`);
    return status === 402 ? 4 : 2;
  }
  for (const model of MODEL_M2D5) {
    const pagar = pagarPenyedia(model);
    const daftar = await daftarEndpoint(klien, model);
    const lolos = daftar.filter((e) => lolosPagar(e, pagar, PARAMETER_M2D5));
    console.log(`\n${model}: ${String(daftar.length)} penyedia, ${String(lolos.length)} lolos pagar (kuantisasi, max_price ${String(pagar.max_price.prompt)}/${String(pagar.max_price.completion)}, parameter ${PARAMETER_M2D5.join('+')}).`);
    for (const e of daftar) {
      const tanda = lolos.includes(e) ? 'LOLOS' : '     ';
      const param = PARAMETER_M2D5.map((p) => (e.supported_parameters.includes(p) ? p : `-${p}`)).join(',');
      console.log(`  ${tanda} ${e.provider_name.padEnd(16)} ${String(e.tag).padEnd(22)} q=${String(e.quantization).padEnd(8)} ${String(e.prompt_per_juta)}/${String(e.completion_per_juta)} ${param} maxout=${String(e.max_completion_tokens)}`);
    }
  }
  return 0;
}

if (process.argv[1]?.replace(/\\/g, '/').endsWith('/tirt-periksa.ts') === true) {
  utama().then(
    (kode) => {
      process.exitCode = kode;
    },
    (galat: unknown) => {
      console.error(galat instanceof Error ? `${galat.name}: ${galat.message}` : 'galat tak dikenal');
      process.exitCode = 1;
    },
  );
}
