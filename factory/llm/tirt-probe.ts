/**
 * `npm run tirt:probe` — probe kecil batas penalaran atas bahan TIRT (kontrak
 * M2d-5 D-3, T-07a). Pagu probe US$0,40 DITEGAKKAN kode (tag `m2d5/probe/`,
 * biaya nyata `usage.cost` + perkiraan panggilan berikutnya), di dalam pagu
 * milestone US$4,00 dan pagu kumulatif `LLM_PAGU_USD`.
 *
 * Yang diukur per panggilan: penyedia yang melayani, `finish_reason`, isi
 * kosong atau tidak, token keluar & token penalaran, biaya nyata, dan mutu
 * jawaban (terurai; untuk penulis: lolos pemeriksa bentuk). Bahannya:
 * - penulis: omongan 1 TIRT (paket M2d-5, sudut pertama perencana) dengan
 *   prompt M2d-5, pada dua batas penalaran + cadangan tanpa berpikir;
 * - kritikus: omongan 2 TIRT M2d-4 yang terakhir diperiksa (cek makna), pada
 *   tiga batas penalaran;
 * - penebak GLM: soal yang sama, dua batas penalaran;
 * - pembaca kartu dan penebak DeepSeek: setelan lingkar tanpa medan
 *   `reasoning` (apakah DeepSeek berpikir secara bawaan).
 *
 * Keluaran: `eval/keluaran-m2d5/probe/probe-penalaran.json` (mentah). Putusan
 * angkanya ditulis tangan di `eval/keluaran-m2d5/probe/putusan.md` dan di
 * `penalaran.ts`.
 */
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { PETUNJUK_PENEBAK_KUAT, pesanPenulis, promptPenulisM2d5, GENERASI_M2D5 } from './agen-peran.ts';
import { ambilOmongan } from './agen.ts';
import { nadaUntuk, pilihContoh, topikDariTeks, URUT_NADA_V2 } from './bank-gaya.ts';
import type { OmonganDraf } from './draf.ts';
import { AKAR, bacaKonfigLlm } from './env.ts';
import { kartuOmongan, pesanPenjawab, uraiJawabanKartuBingung } from './gerbang-kartu.ts';
import { MAX_TOKENS_GERBANG, pesanPenebak, soalTebak, uraiTebakan } from './gerbang-tebak.ts';
import type { PesanChat } from './klien.ts';
import { SUHU_KRITIKUS, pesanKritikus, uraiCekMakna, uraiKritik } from './kritikus.ts';
import { MODEL_OR_DEEPSEEK, MODEL_OR_GLM } from './model.ts';
import { BASE_URL_OPENROUTER, pagarPenyedia } from './openrouter.ts';
import { JALUR_LEDGER, PaguTercapai, PencatatBiaya, chatBerpagu } from './pagu.ts';
import { DEFINISI_PAKET, bangunPaket, type PaketFakta } from './paket.ts';
import { ubahGalatSaldo } from './peran-susun.ts';
import { rencanaSudut } from './sudut.ts';
import { SUHU, pesanPaket, uraiKeluaran, type SetelanPanggil } from './susun.ts';
import { SUHU_TEBAK } from './gerbang-tebak.ts';
import { SUHU_KARTU } from './gerbang-kartu.ts';
import { siapOpenRouter } from './tirt-susun.ts';
import { validasiDraf } from './validasi.ts';

export const PAGU_PROBE = 0.4;
export const AWALAN_PROBE = 'm2d5/probe/';
const FOLDER = `${AKAR}eval/keluaran-m2d5/probe`;

interface Butir {
  tag: string;
  peran: string;
  model: string;
  setelan: SetelanPanggil;
  pesan: PesanChat[];
  nilai: (teks: string) => { terurai: boolean; catatan: string };
}

function bahan(putaran: 1 | 2 = 1): Butir[] {
  const paket = bangunPaket(DEFINISI_PAKET.tirt);
  const sudut = rencanaSudut(paket)[0];
  if (sudut === undefined) throw new Error('paket TIRT tanpa sudut');
  const nada = nadaUntuk(1, 1, URUT_NADA_V2);
  const contoh = pilihContoh({ topik: [sudut.topik, ...topikDariTeks(paket.peristiwa).filter((t) => t !== sudut.topik)], nada, paket_id: paket.paket_id }, GENERASI_M2D5.bank());
  const permintaan = pesanPenulis({
    no: 1, draf: [null, null, null], terkunci: new Set(), umpan: undefined, gaya: { nada, contoh }, posisiKunciKode: true,
    sudut: { ke: 1, fact_id: sudut.fact_id, klaim: paket.fakta.find((f) => f.fact_id === sudut.fact_id)?.klaim ?? '', dibuang: [] },
  });
  const pesanTulis: PesanChat[] = [
    { role: 'system', content: promptPenulisM2d5() },
    { role: 'user', content: `${pesanPaket(paket)}\n\n${permintaan}` },
  ];
  const nilaiTulis = (teks: string): { terurai: boolean; catatan: string } => {
    const u = uraiKeluaran(teks);
    const o = u.ok ? ambilOmongan(u.nilai, 1).omongan : undefined;
    if (o === undefined) return { terurai: false, catatan: u.ok ? 'tanpa omongan 1' : `bukan JSON: ${u.alasan.slice(0, 80)}` };
    const m = validasiDraf({ omongan: [o] }, paket).filter((x) => !(x.omongan === null && x.kode === 'SKEMA'));
    return { terurai: true, catatan: m.length === 0 ? 'lolos validator' : `validator: ${[...new Set(m.map((x) => x.kode))].join(', ')}` };
  };

  // Bahan kritikus/penebak/pembaca kartu: omongan 2 TIRT M2d-4 yang terakhir diperiksa, dengan paket M2d-4-nya.
  const paket4 = JSON.parse(readFileSync(`${AKAR}eval/keluaran-m2d4/tirt/paket.json`, 'utf8')) as PaketFakta;
  const riwayat = JSON.parse(readFileSync(`${AKAR}eval/keluaran-m2d4/tirt/riwayat.json`, 'utf8')) as { riwayat: Array<{ draf: Array<OmonganDraf | null> }> };
  const o2 = riwayat.riwayat.at(-1)?.draf[1];
  if (o2 === null || o2 === undefined) throw new Error('omongan 2 TIRT M2d-4 tidak ada');
  const konteks = { no: 2, kartu: { pilihan: o2.kunci, kartu_ditunjuk_no: [1], alasan: 'dari kartu 1' }, tebakan: [], penebakSesudah: true };
  const nilaiKritik = (teks: string): { terurai: boolean; catatan: string } => {
    const k = uraiKritik(teks);
    const u = uraiKeluaran(teks);
    const c = u.ok ? uraiCekMakna(u.nilai as Record<string, unknown>) : null;
    return { terurai: k !== null && c !== null, catatan: k === null ? 'tak terbaca' : c === null ? 'tanpa dua jawaban wajib' : `${String(k.keberatan.length)} keberatan; tak tercek ${String(c.bagian_tak_tercek.length)}; juga benar ${c.juga_benar.join(',') || '-'}` };
  };
  const nilaiTebak = (teks: string): { terurai: boolean; catatan: string } => {
    const t = uraiTebakan(teks);
    return { terurai: t !== null, catatan: t === null ? 'tak terbaca' : `${t.pilihan}/${String(t.yakin)} (kunci ${o2.kunci})` };
  };
  const nilaiKartu = (teks: string): { terurai: boolean; catatan: string } => {
    const t = uraiJawabanKartuBingung(teks);
    return { terurai: t !== null, catatan: t === null ? 'tak terbaca' : `${t.pilihan} (kunci ${o2.kunci}); membingungkan ${String(t.membingungkan?.length ?? 0)}` };
  };
  const dengan = (penalaran: number) => ({ reasoning: { max_tokens: penalaran } });
  if (putaran === 2) {
    // Putaran 2 (sesudah putaran 1): apakah batas penalaran DeepSeek dipatuhi lintas penyedia, dan setelan calon.
    return [
      { tag: 'p2/kartu/r6000', peran: 'pembaca-kartu', model: MODEL_OR_DEEPSEEK, setelan: { suhu: SUHU_KARTU, maxTokens: 12_000, tambahanBadan: dengan(6_000) }, pesan: pesanPenjawab(soalTebak(o2), kartuOmongan(o2, paket4), true), nilai: nilaiKartu },
      { tag: 'p2/kartu/r6000-b', peran: 'pembaca-kartu', model: MODEL_OR_DEEPSEEK, setelan: { suhu: SUHU_KARTU, maxTokens: 12_000, tambahanBadan: dengan(6_000) }, pesan: pesanPenjawab(soalTebak(o2), kartuOmongan(o2, paket4), true), nilai: nilaiKartu },
      { tag: 'p2/penulis/r16000-b', peran: 'penulis', model: MODEL_OR_DEEPSEEK, setelan: { suhu: SUHU, maxTokens: 24_000, tambahanBadan: dengan(16_000) }, pesan: pesanTulis, nilai: nilaiTulis },
      { tag: 'p2/penulis/r16000-c', peran: 'penulis', model: MODEL_OR_DEEPSEEK, setelan: { suhu: SUHU, maxTokens: 24_000, tambahanBadan: dengan(16_000) }, pesan: pesanTulis, nilai: nilaiTulis },
      { tag: 'p2/kritikus/r8000-b', peran: 'kritikus', model: MODEL_OR_GLM, setelan: { suhu: SUHU_KRITIKUS, maxTokens: 12_000, tambahanBadan: dengan(8_000) }, pesan: pesanKritikus(o2, paket4, konteks, true), nilai: nilaiKritik },
      { tag: 'p2/kritikus/r8000-c', peran: 'kritikus', model: MODEL_OR_GLM, setelan: { suhu: SUHU_KRITIKUS, maxTokens: 12_000, tambahanBadan: dengan(8_000) }, pesan: pesanKritikus(o2, paket4, konteks, true), nilai: nilaiKritik },
    ];
  }
  return [
    { tag: 'kartu/bawaan', peran: 'pembaca-kartu', model: MODEL_OR_DEEPSEEK, setelan: { suhu: SUHU_KARTU, maxTokens: MAX_TOKENS_GERBANG }, pesan: pesanPenjawab(soalTebak(o2), kartuOmongan(o2, paket4), true), nilai: nilaiKartu },
    { tag: 'penebak-deepseek/bawaan', peran: 'penebak', model: MODEL_OR_DEEPSEEK, setelan: { suhu: SUHU_TEBAK, maxTokens: 16_000 }, pesan: pesanPenebak(soalTebak(o2), PETUNJUK_PENEBAK_KUAT), nilai: nilaiTebak },
    { tag: 'penebak-glm/r1500', peran: 'penebak', model: MODEL_OR_GLM, setelan: { suhu: SUHU_TEBAK, maxTokens: 3_500, tambahanBadan: dengan(1_500) }, pesan: pesanPenebak(soalTebak(o2), PETUNJUK_PENEBAK_KUAT), nilai: nilaiTebak },
    { tag: 'penebak-glm/r3000', peran: 'penebak', model: MODEL_OR_GLM, setelan: { suhu: SUHU_TEBAK, maxTokens: 5_000, tambahanBadan: dengan(3_000) }, pesan: pesanPenebak(soalTebak(o2), PETUNJUK_PENEBAK_KUAT), nilai: nilaiTebak },
    { tag: 'penulis/tanpa-berpikir', peran: 'penulis', model: MODEL_OR_DEEPSEEK, setelan: { suhu: SUHU, maxTokens: 8_000, tambahanBadan: { reasoning: { enabled: false } } }, pesan: pesanTulis, nilai: nilaiTulis },
    { tag: 'penulis/r8000', peran: 'penulis', model: MODEL_OR_DEEPSEEK, setelan: { suhu: SUHU, maxTokens: 14_000, tambahanBadan: dengan(8_000) }, pesan: pesanTulis, nilai: nilaiTulis },
    { tag: 'penulis/r16000', peran: 'penulis', model: MODEL_OR_DEEPSEEK, setelan: { suhu: SUHU, maxTokens: 22_000, tambahanBadan: dengan(16_000) }, pesan: pesanTulis, nilai: nilaiTulis },
    { tag: 'kritikus/r4000', peran: 'kritikus', model: MODEL_OR_GLM, setelan: { suhu: SUHU_KRITIKUS, maxTokens: 7_000, tambahanBadan: dengan(4_000) }, pesan: pesanKritikus(o2, paket4, konteks, true), nilai: nilaiKritik },
    { tag: 'kritikus/r8000', peran: 'kritikus', model: MODEL_OR_GLM, setelan: { suhu: SUHU_KRITIKUS, maxTokens: 11_000, tambahanBadan: dengan(8_000) }, pesan: pesanKritikus(o2, paket4, konteks, true), nilai: nilaiKritik },
    { tag: 'kritikus/r12000', peran: 'kritikus', model: MODEL_OR_GLM, setelan: { suhu: SUHU_KRITIKUS, maxTokens: 15_000, tambahanBadan: dengan(12_000) }, pesan: pesanKritikus(o2, paket4, konteks, true), nilai: nilaiKritik },
  ];
}

async function utama(): Promise<number> {
  const belum = siapOpenRouter();
  if (belum !== null) {
    console.error(belum);
    return 1;
  }
  const konfig = bacaKonfigLlm();
  if (konfig.baseUrl !== BASE_URL_OPENROUTER) {
    console.error('LLM_BASE_URL bukan OpenRouter (nilainya tidak dicetak).');
    return 1;
  }
  mkdirSync(FOLDER, { recursive: true });
  const putaran = process.argv.includes('--putaran-2') ? 2 : 1;
  const jalurKeluar = `${FOLDER}/probe-penalaran${putaran === 2 ? '-2' : ''}.json`;
  if (existsSync(jalurKeluar) && !process.argv.includes('--ulang')) {
    console.error(`${jalurKeluar} sudah ada; probe yang sudah dibayar tidak diulang tanpa --ulang.`);
    return 1;
  }
  const biaya = new PencatatBiaya({ paguUsd: konfig.paguUsd, jalurLedger: JALUR_LEDGER, biayaNyata: true, paguMilestone: { usd: PAGU_PROBE, awalanTag: AWALAN_PROBE } });
  const klien = { baseUrl: konfig.baseUrl, apiKey: konfig.apiKey, batasWaktuMs: 900_000, pagar: pagarPenyedia };
  const hasil: unknown[] = [];
  const simpan = (): void => writeFileSync(jalurKeluar, JSON.stringify({ pagu_probe_usd: PAGU_PROBE, biaya_probe_usd: biaya.totalMilestone(), hasil }, null, 2) + '\n', 'utf8');
  console.log(`Pagu kumulatif US$${konfig.paguUsd.toFixed(2)} (ledger US$${biaya.total().toFixed(6)}); pagu probe US$${PAGU_PROBE.toFixed(2)} (terpakai US$${biaya.totalMilestone().toFixed(6)}).`);
  for (const b of bahan(putaran)) {
    const tag = `${AWALAN_PROBE}${b.tag}`;
    try {
      const j = await chatBerpagu(klien, biaya, { model: b.model, pesan: b.pesan, suhu: b.setelan.suhu, maxTokens: b.setelan.maxTokens, tambahanBadan: b.setelan.tambahanBadan }, tag);
      const n = b.nilai(j.teks);
      const kosong = j.teks.trim() === '';
      hasil.push({
        tag, peran: b.peran, model: b.model, max_tokens: b.setelan.maxTokens, badan: b.setelan.tambahanBadan ?? null,
        penyedia: j.penyedia ?? null, finish_reason: j.finish_reason, kosong, token_masuk: j.token_masuk, token_keluar: j.token_keluar,
        token_penalaran: j.token_penalaran ?? null, panjang_penalaran_karakter: j.penalaran?.length ?? 0, biaya_usd: j.biaya_usd,
        latensi_ms: j.latensi_ms, terurai: n.terurai, catatan: n.catatan, teks: j.teks,
      });
      console.log(
        `${tag}: ${String(j.penyedia)} ${String(j.finish_reason)}${kosong ? ' KOSONG' : ''} keluar ${String(j.token_keluar)} ` +
          `(penalaran ${String(j.token_penalaran)}) US$${j.biaya_usd.toFixed(6)} ${String(Math.round(j.latensi_ms / 1000))} s — ${n.terurai ? 'terurai' : 'TAK TERURAI'}: ${n.catatan}`,
      );
    } catch (galat) {
      const g = ubahGalatSaldo(galat, b.model);
      const pesan = g instanceof Error ? `${g.name}: ${g.message}` : 'galat tak dikenal';
      hasil.push({ tag, peran: b.peran, model: b.model, galat: pesan.slice(0, 300) });
      console.log(`${tag}: GALAT ${pesan.slice(0, 200)}`);
      if (g instanceof PaguTercapai) {
        simpan();
        return g.name === 'SaldoPenyediaHabis' ? 4 : 2;
      }
    }
    simpan();
  }
  console.log(`Probe selesai: US$${biaya.totalMilestone().toFixed(6)} dari pagu probe US$${PAGU_PROBE.toFixed(2)}.`);
  return 0;
}

if (process.argv[1]?.replace(/\\/g, '/').endsWith('/tirt-probe.ts') === true) {
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
