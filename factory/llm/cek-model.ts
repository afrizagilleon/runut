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
 */
import { writeFileSync } from 'node:fs';
import { AKAR, bacaKonfigLlm } from './env.ts';
import { GalatLlm, daftarModel } from './klien.ts';
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

utama().then(
  (kode) => {
    process.exitCode = kode;
  },
  (galat: unknown) => {
    console.error(galat instanceof Error ? `${galat.name}: ${galat.message}` : 'galat tak dikenal');
    process.exitCode = 1;
  },
);
