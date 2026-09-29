# Probe GLM-5.3 sebagai penebak (M2d-4 T-05, 29 Sep, sesudah jalan TIRT ke-1 dihentikan)

Sebab: penebak GLM ke-3 di jalan TIRT ke-1 habis 16.000 token (US$0,048, 292 s) tanpa jawaban.
Pertanyaan: adakah tombol tanpa-berpikir untuk GLM di penyedia, dan berapa panjang penalaran GLM pada soal sungguhan?

Hasil (tag ledger m2d4/probe/*):
- enable_thinking=false (soal contoh, max 2000): stop, keluar 1113 token, penalaran 4602 karakter → tombol TIDAK mematikan penalaran
- tanpa tombol (soal contoh): stop, keluar 668, penalaran 2519
- thinking=false (soal contoh): stop, keluar 1422, penalaran 0 tetapi penalaran berbahasa Inggris tertumpah ke jawaban → tidak bisa dipakai
- dua panggilan salah-jalan (skrip gagal diubah; soal contoh diulang): keluar 439 dan 811
- soal TIRT M2d-3 omongan 1 (max 16000): stop, keluar 1463, jawaban a/62 (= kunci)
- soal TIRT M2d-3 omongan 3 (max 16000): stop, keluar 1045, jawaban c/60 (= kunci)

Putusan: penebak GLM tetap berpenalaran; max_tokens 8.000 (> 5× keluaran terpanjang terukur 1.463) supaya putaran macet berongkos separuh. Skrip probe (sementara, tidak di-commit):

```ts
// Probe SEMENTARA (tidak di-commit): panjang penalaran GLM-5.3 sebagai penebak pada soal sungguhan.
import { readFileSync } from 'node:fs';
import { bacaKonfigLlm } from './env.ts';
import { JALUR_LEDGER, PencatatBiaya, chatBerpagu } from './pagu.ts';
import { PETUNJUK_PENEBAK_KUAT } from './agen-peran.ts';
import { soalTebak, tulisSoal } from './gerbang-tebak.ts';

const konfig = bacaKonfigLlm();
const biaya = new PencatatBiaya({ paguUsd: konfig.paguUsd, jalurLedger: JALUR_LEDGER, paguMilestone: { usd: 4, awalanTag: 'm2d4/' } });
const klien = { baseUrl: konfig.baseUrl, apiKey: konfig.apiKey, batasWaktuMs: 600_000 };
const r3 = JSON.parse(readFileSync('eval/keluaran-m2d3/tirt/draf-akhir.json', 'utf8'));
const no = Number(process.argv[3] ?? '1');
const soal = tulisSoal(soalTebak(r3.draf.omongan[no - 1]));
const varian = process.argv[2] ?? 'keras';
const baris = PETUNJUK_PENEBAK_KUAT.split('\n');
const sistem =
  varian === 'singkat'
    ? [...baris.slice(0, -1), 'Jangan berpikir panjang: timbang sebentar, lalu langsung jawab.', baris.at(-1) ?? ''].join('\n')
    : PETUNJUK_PENEBAK_KUAT;
const j = await chatBerpagu(
  klien,
  biaya,
  { model: 'zai-org/GLM-5.3', pesan: [{ role: 'system', content: sistem }, { role: 'user', content: soal }], suhu: 1, maxTokens: 16000 },
  `m2d4/probe/glm-penebak/${varian}/o${String(no)}`,
);
console.log(JSON.stringify({ varian, no, finish: j.finish_reason, token_keluar: j.token_keluar, penalaran: j.penalaran?.length ?? 0, teks: j.teks.slice(0, 160), biaya: j.biaya_usd, detik: Math.round(j.latensi_ms / 1000) }));
```
