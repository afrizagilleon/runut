/**
 * `npm run llm:model` — apakah ketiga model uji tanding tersedia di penyedia?
 *
 * Langkah pertama selalu satu `GET /models`, tanpa biaya. Yang dicetak dan
 * disimpan hanya: status HTTP, jumlah model yang dilaporkan, dan untuk tiap
 * model uji tanding, ada atau tidak beserta metadatanya apa adanya. Kunci,
 * alamat penyedia, dan header tidak pernah dicetak.
 *
 * Terukur 27 Sep 2026: Featherless menjawab `GET /v1/models` dengan HTTP 404
 * berbadan `Gone.` (rute lain di host yang sama menjawab 404 JSON "Route … not
 * found", jadi ini rute yang sengaja dihentikan, bukan salah alamat). Katalog
 * model tidak bisa dibaca tanpa biaya. Hasil itu dicatat apa adanya; tidak ada
 * model yang dianggap tersedia hanya karena namanya ada di kontrak.
 *
 * `npm run llm:model -- --sonda` lalu menjalankan satu panggilan chat terkecil
 * per model (`max_tokens` 16, suhu 0) **di bawah pagu dan ledger** — satu-satunya
 * cara tersisa untuk tahu apakah id model dikenali penyedia. Biayanya tercatat
 * di ledger seperti panggilan lain.
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { AKAR, bacaKonfigLlm } from './env.ts';
import { GalatLlm, daftarModel } from './klien.ts';
import { JALUR_LEDGER, PaguTercapai, PencatatBiaya, chatBerpagu } from './pagu.ts';
import { MODEL_TANDING } from './model.ts';

const TUJUAN = `${AKAR}eval/keluaran-m2d/model-tersedia.json`;

async function utama(): Promise<number> {
  // Tanpa biaya, jadi pagu tidak dibutuhkan di sini.
  const konfig = bacaKonfigLlm(undefined, { perluPagu: false });
  const diperiksa_pada = new Date().toISOString();
  try {
    const daftar = await daftarModel({ baseUrl: konfig.baseUrl, apiKey: konfig.apiKey });
    const perId = new Map(daftar.map((m) => [m.id, m]));
    const hasil = {
      diperiksa_pada,
      katalog: { status_http: 200, jumlah_model_dilaporkan: daftar.length },
      model: MODEL_TANDING.map((id) => ({
        id,
        tersedia: perId.has(id) ? 'ya' : 'tidak',
        entri: perId.get(id) ?? null,
      })),
    };
    writeFileSync(TUJUAN, JSON.stringify(hasil, null, 2) + '\n', 'utf8');
    console.log(`GET /models: ${String(daftar.length)} model dilaporkan penyedia.`);
    for (const m of hasil.model) console.log(`  ${m.tersedia.toUpperCase().padEnd(5)} ${m.id}`);
    return hasil.model.every((m) => m.tersedia === 'ya') ? 0 : 2;
  } catch (galat) {
    if (!(galat instanceof GalatLlm) || galat.status === null) throw galat;
    const hasil = {
      diperiksa_pada,
      katalog: { status_http: galat.status, pesan: galat.message },
      model: MODEL_TANDING.map((id) => ({ id, tersedia: 'tidak-diketahui', entri: null })),
      catatan:
        'Katalog model penyedia tidak bisa dibaca, jadi ketersediaan ketiga model TIDAK terverifikasi ' +
        'tanpa biaya. Ketersediaan sesungguhnya tercatat per model di percobaan pertamanya ' +
        '(eval/keluaran-m2d/, dan ledger biaya).',
    };
    writeFileSync(TUJUAN, JSON.stringify(hasil, null, 2) + '\n', 'utf8');
    console.log(`GET /models tidak bisa dibaca: ${galat.message}`);
    for (const m of hasil.model) console.log(`  TIDAK-DIKETAHUI ${m.id}`);
    return 3;
  }
}

/** Satu panggilan terkecil per model, di bawah pagu. */
async function sonda(): Promise<number> {
  const konfig = bacaKonfigLlm();
  const pencatat = new PencatatBiaya({ paguUsd: konfig.paguUsd, jalurLedger: JALUR_LEDGER });
  const hasil: Array<Record<string, unknown>> = [];
  for (const model of MODEL_TANDING) {
    try {
      const r = await chatBerpagu(
        { baseUrl: konfig.baseUrl, apiKey: konfig.apiKey, cobaUlang: 0 },
        pencatat,
        { model, pesan: [{ role: 'user', content: 'Balas dengan satu kata: siap' }], suhu: 0, maxTokens: 16 },
        `sonda/${model}`,
      );
      hasil.push({
        id: model,
        tersedia: 'ya',
        model_dilaporkan: r.model,
        finish_reason: r.finish_reason,
        token_masuk: r.token_masuk,
        token_keluar: r.token_keluar,
        latensi_ms: r.latensi_ms,
        biaya_usd: r.biaya_usd,
      });
    } catch (galat) {
      if (galat instanceof PaguTercapai) throw galat;
      const status = galat instanceof GalatLlm ? galat.status : null;
      hasil.push({
        id: model,
        tersedia: status !== null && status >= 400 && status < 500 ? 'tidak' : 'tidak-diketahui',
        status_http: status,
        pesan: galat instanceof Error ? galat.message : 'galat tak dikenal',
      });
    }
  }
  const berkas = JSON.parse(readFileSync(TUJUAN, 'utf8')) as Record<string, unknown>;
  berkas['sonda'] = { diperiksa_pada: new Date().toISOString(), model: hasil };
  writeFileSync(TUJUAN, JSON.stringify(berkas, null, 2) + '\n', 'utf8');
  for (const h of hasil) console.log(`  sonda ${String(h['tersedia']).toUpperCase().padEnd(15)} ${JSON.stringify(h)}`);
  console.log(`Akumulasi ledger: US$${pencatat.total().toFixed(6)} dari pagu US$${konfig.paguUsd.toFixed(2)}.`);
  return hasil.every((h) => h['tersedia'] === 'ya') ? 0 : 2;
}

(process.argv.includes('--sonda') ? sonda() : utama()).then(
  (kode) => {
    process.exitCode = kode;
  },
  (galat: unknown) => {
    console.error(galat instanceof Error ? `${galat.name}: ${galat.message}` : 'galat tak dikenal');
    process.exitCode = 1;
  },
);
