/**
 * `npm run penalar:probe [-- --putaran <n>]` — probe penalar GLM (kontrak
 * M2d-6 D-1): apakah `reasoning.effort` membuat GLM-5.3 di OpenRouter
 * BERPIKIR, berapa token, di penyedia mana. Pagu probe US$0,40 (tag
 * `m2d6/probe/`) DITEGAKKAN kode di dalam pagu milestone US$3,50.
 *
 * Yang diukur per panggilan (tanpa penjaga, tanpa ulangan — data mentah):
 * penyedia yang melayani, `finish_reason`, isi kosong atau tidak, token
 * keluar & token penalaran, biaya nyata, dan apakah jawabannya terbaca.
 * Bahan: omongan 2 TIRT M2d-5 (bocor di uji luar) dengan paket M2d-5-nya —
 * kritikus (cek makna) dan penebak GLM (petunjuk M2d-5), `effort` "high" dan
 * "medium".
 *
 * Keluaran mentah `eval/keluaran-m2d6/probe/probe-<putaran>.json`; putusan
 * angkanya ditulis di `eval/keluaran-m2d6/probe/putusan.md` dan di
 * `PENALAR_M2D6` (`penalaran.ts`).
 */
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { PETUNJUK_PENEBAK_KUAT } from './agen-peran.ts';
import type { OmonganDraf } from './draf.ts';
import { AKAR } from './env.ts';
import { pesanPenebak, soalTebak, SUHU_TEBAK, uraiTebakan } from './gerbang-tebak.ts';
import type { PesanChat } from './klien.ts';
import { SUHU_KRITIKUS, pesanKritikus, uraiCekMakna, uraiKritik } from './kritikus.ts';
import { MODEL_OR_GLM } from './model.ts';
import { PaguTercapai, chatBerpagu } from './pagu.ts';
import type { PaketFakta } from './paket.ts';
import { PAGU_BAGIAN_M2D6, siapkanM2d6 } from './penalar-susun.ts';
import { ubahGalatSaldo } from './peran-susun.ts';
import { uraiKeluaran, type SetelanPanggil } from './susun.ts';

export const FOLDER_PROBE_M2D6 = `${AKAR}eval/keluaran-m2d6/probe`;

interface Butir {
  tag: string;
  peran: 'kritikus' | 'penebak';
  setelan: SetelanPanggil;
  pesan: PesanChat[];
  nilai: (teks: string) => { terurai: boolean; catatan: string };
}

/** Draf akhir TIRT M2d-5 dan paketnya (terlacak). */
export function bahanM2d5(): { paket: PaketFakta; omongan: OmonganDraf[] } {
  const paket = JSON.parse(readFileSync(`${AKAR}eval/keluaran-m2d5/tirt/paket.json`, 'utf8')) as PaketFakta;
  const d = JSON.parse(readFileSync(`${AKAR}eval/keluaran-m2d5/tirt/draf-akhir.json`, 'utf8')) as { draf: { omongan: OmonganDraf[] } };
  return { paket, omongan: d.draf.omongan };
}

export function butirProbe(putaran: number): Butir[] {
  const { paket, omongan } = bahanM2d5();
  const o2 = omongan[1] as OmonganDraf;
  const konteks = { no: 2, kartu: { pilihan: o2.kunci, kartu_ditunjuk_no: [1], alasan: 'dari kartu 1' }, tebakan: [], penebakSesudah: true };
  const nilaiKritik = (teks: string): { terurai: boolean; catatan: string } => {
    const k = uraiKritik(teks);
    const u = uraiKeluaran(teks);
    const c = u.ok ? uraiCekMakna(u.nilai as Record<string, unknown>) : null;
    return {
      terurai: k !== null && c !== null,
      catatan: k === null ? 'tak terbaca' : c === null ? 'tanpa dua jawaban wajib' : `${String(k.keberatan.length)} keberatan (${k.keberatan.map((x) => x.jenis).join(',') || '-'}); tak tercek ${String(c.bagian_tak_tercek.length)}; juga benar ${c.juga_benar.join(',') || '-'}`,
    };
  };
  const nilaiTebak = (teks: string): { terurai: boolean; catatan: string } => {
    const t = uraiTebakan(teks);
    return { terurai: t !== null, catatan: t === null ? 'tak terbaca' : `${t.pilihan}/${String(t.yakin)} (kunci ${o2.kunci})` };
  };
  const kritikus = (effort: string, maxTokens: number, n: number): Butir[] =>
    Array.from({ length: n }, (_, i) => ({
      tag: `p${String(putaran)}/kritikus/${effort}-${String(i + 1)}`,
      peran: 'kritikus' as const,
      setelan: { suhu: SUHU_KRITIKUS, maxTokens, tambahanBadan: { reasoning: { effort } } },
      pesan: pesanKritikus(o2, paket, konteks, true),
      nilai: nilaiKritik,
    }));
  const penebak = (effort: string, maxTokens: number, n: number): Butir[] =>
    Array.from({ length: n }, (_, i) => ({
      tag: `p${String(putaran)}/penebak-glm/${effort}-${String(i + 1)}`,
      peran: 'penebak' as const,
      setelan: { suhu: SUHU_TEBAK, maxTokens, tambahanBadan: { reasoning: { effort } } },
      pesan: pesanPenebak(soalTebak(o2), PETUNJUK_PENEBAK_KUAT),
      nilai: nilaiTebak,
    }));
  if (putaran === 1) return [...kritikus('high', 16_000, 4), ...penebak('high', 8_000, 4), ...kritikus('medium', 16_000, 3), ...penebak('medium', 8_000, 3)];
  // Putaran 2 (sesudah putaran 1: "medium" hampir tidak berpikir; "high" berpikir di kritikus, pendek di
  // penebak): sebaran penalaran penebak "high" lintas penyedia, dan kritikus "high" di penyedia lain.
  if (putaran === 2) return [...penebak('high', 8_000, 6), ...kritikus('high', 16_000, 3)];
  // Putaran 3: sesudah pengecualian GLM dari bukti putaran 1–2 — apakah penyedia yang tersisa berpikir.
  return [...penebak('high', 8_000, 4), ...kritikus('high', 24_000, 2)];
}

async function utama(): Promise<number> {
  const i = process.argv.indexOf('--putaran');
  const putaran = i >= 0 ? Number(process.argv[i + 1]) : 1;
  if (!Number.isInteger(putaran) || putaran < 1 || putaran > 3) {
    console.error('Pakai: npm run penalar:probe -- --putaran <1|2|3>');
    return 1;
  }
  const jalur = `${FOLDER_PROBE_M2D6}/probe-${String(putaran)}.json`;
  if (existsSync(jalur) && !process.argv.includes('--ulang')) {
    console.error(`${jalur} sudah ada; probe yang sudah dibayar tidak diulang tanpa --ulang.`);
    return 1;
  }
  const { klien, biaya } = siapkanM2d6();
  mkdirSync(FOLDER_PROBE_M2D6, { recursive: true });
  const awalan = PAGU_BAGIAN_M2D6.probe.awalanTag;
  const hasil: unknown[] = [];
  const simpan = (): void =>
    writeFileSync(jalur, JSON.stringify({ pagu_probe_usd: PAGU_BAGIAN_M2D6.probe.usd, biaya_probe_usd: biaya.totalAwalan(awalan), hasil }, null, 2) + '\n', 'utf8');
  console.log(`Pagu milestone US$3.50 (terpakai US$${biaya.totalMilestone().toFixed(6)}); pagu probe US$${PAGU_BAGIAN_M2D6.probe.usd.toFixed(2)} (terpakai US$${biaya.totalAwalan(awalan).toFixed(6)}).`);
  for (const b of butirProbe(putaran)) {
    const tag = `${awalan}${b.tag}`;
    try {
      const j = await chatBerpagu(klien, biaya, { model: MODEL_OR_GLM, pesan: b.pesan, suhu: b.setelan.suhu, maxTokens: b.setelan.maxTokens, tambahanBadan: b.setelan.tambahanBadan }, tag);
      const n = b.nilai(j.teks);
      const kosong = j.teks.trim() === '';
      hasil.push({
        tag, peran: b.peran, model: MODEL_OR_GLM, max_tokens: b.setelan.maxTokens, badan: b.setelan.tambahanBadan ?? null, penyedia: j.penyedia ?? null,
        finish_reason: j.finish_reason, kosong, token_masuk: j.token_masuk, token_keluar: j.token_keluar, token_penalaran: j.token_penalaran ?? null,
        panjang_penalaran_karakter: j.penalaran?.length ?? 0, biaya_usd: j.biaya_usd, latensi_ms: j.latensi_ms, terurai: n.terurai, catatan: n.catatan, teks: j.teks,
      });
      console.log(
        `${tag}: ${String(j.penyedia)} ${String(j.finish_reason)}${kosong ? ' KOSONG' : ''} keluar ${String(j.token_keluar)} (penalaran ${String(j.token_penalaran)}) ` +
          `US$${j.biaya_usd.toFixed(6)} ${String(Math.round(j.latensi_ms / 1000))} s — ${n.terurai ? 'terurai' : 'TAK TERURAI'}: ${n.catatan}`,
      );
    } catch (galat) {
      const g = ubahGalatSaldo(galat, MODEL_OR_GLM);
      const pesan = g instanceof Error ? `${g.name}: ${g.message}` : 'galat tak dikenal';
      hasil.push({ tag, peran: b.peran, model: MODEL_OR_GLM, galat: pesan.slice(0, 300) });
      console.log(`${tag}: GALAT ${pesan.slice(0, 200)}`);
      if (g instanceof PaguTercapai) {
        simpan();
        return g.name === 'SaldoPenyediaHabis' ? 4 : 2;
      }
    }
    simpan();
  }
  console.log(`Probe selesai: US$${biaya.totalAwalan(awalan).toFixed(6)} dari pagu probe US$${PAGU_BAGIAN_M2D6.probe.usd.toFixed(2)}; milestone US$${biaya.totalMilestone().toFixed(6)}.`);
  return 0;
}

if (process.argv[1]?.replace(/\\/g, '/').endsWith('/penalar-probe.ts') === true) {
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
