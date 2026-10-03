/**
 * M2d-15 D-5 (pra-registrasi `docs/bukti/m2d15-praregistrasi.md` §7):
 *
 * - `npm run opus:audit` — paket audit Opus SATU SOAL per berkas untuk versi
 *   akhir SEMUA omongan semua jalan `m2d15-opus-*` (lulus atau tidak), 4 rotasi
 *   tanpa kartu; `kunci.json` dan `PETUNJUK.md` DI LUAR `bahan/`. Dijalankan
 *   reviewer. `--nilai`: `jawaban/*.txt` → `nilai.json` (dibaca `opus:jalan`
 *   untuk syarat jalan 2 dan oleh laporan).
 * - `npm run opus:mutu` — paket penilai mutu Opus buta (rubrik M2d-13 §7, satu
 *   butir per berkas): versi akhir M2d-15 + 3 DADA tayang + 3 omongan templat
 *   TIRT-7 + 2 omongan Opus M2d-13 yang lulus; asal di `kunci-mutu.json` (di
 *   luar `mutu-opus/`). `--glm`: penilai GLM-5.3 effort "high" (setelan
 *   amandemen M2d-13, ditetapkan pra-registrasi M2d-15), tag `m2d15/mutu/`,
 *   pagu = US$3,00 − biaya D-4 (≥ US$0,30), urutan buta benih `m2d15-mutu`.
 *   `--nilai-opus`: jawaban reviewer → `nilai.json`.
 * Eksekutor tidak menjalankan audit/penilai Opus dan tidak menulis hasilnya.
 */
import { existsSync, mkdirSync, readdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import type { OmonganDraf } from '../draf.ts';
import { AKAR, bacaKonfigLlm } from '../env.ts';
import { soalManusiaM2d8 } from '../kalibrasi-soal.ts';
import type { KonfigKlien, PesanChat } from '../klien.ts';
import { MODEL_OR_GLM } from '../model.ts';
import { BASE_URL_OPENROUTER } from '../openrouter.ts';
import { chatBerpagu, JALUR_LEDGER, PaguTercapai, PencatatBiaya, type EntriLedger } from '../pagu.ts';
import { nilaiAudit } from '../patokan/audit.ts';
import type { PaketFakta } from '../paket.ts';
import { pagarKritikusTerkunci } from '../templat/penyedia.ts';
import { bangunAuditSatuSoal, urutButa, type ButirAkhir, type KunciAuditM2d13 } from './audit.ts';
import type { HasilBebas } from './mesin.ts';
import { promptPenilai, SETELAN_PENILAI_GLM_TINGGI, teksButir, uraiPenilaian, type HasilGlm } from './mutu.ts';
import { MAKS_JALAN_M2D15_T2, PAGU_MILESTONE_M2D15, idJalanM2d15, paguPenilaiM2d15 } from './pagu-m2d15.ts';
import { drafDari } from './skema.ts';

export const FOLDER_M2D15 = `${AKAR}eval/keluaran-m2d15`;
export const FOLDER_AUDIT_M2D15 = `${FOLDER_M2D15}/audit-opus`;
export const FOLDER_MUTU_M2D15 = `${FOLDER_M2D15}/mutu`;
export const FOLDER_MUTU_OPUS_M2D15 = `${FOLDER_M2D15}/mutu-opus`;
export const BENIH_AUDIT_M2D15 = 'm2d15-audit-opus';
export const BENIH_MUTU_M2D15 = 'm2d15-mutu';
export const AWALAN_MUTU_M2D15 = 'm2d15/mutu/';

/** Versi akhir semua omongan semua jalan M2d-15 yang ada. */
export function butirAkhirM2d15(akar: string = AKAR): ButirAkhir[] {
  const hasil: ButirAkhir[] = [];
  for (let n = 1; n <= MAKS_JALAN_M2D15_T2; n++) {
    const id = idJalanM2d15(n);
    const jalur = `${akar}eval/penyusun/${id}/hasil.json`;
    if (!existsSync(jalur)) continue;
    const h = JSON.parse(readFileSync(jalur, 'utf8')) as HasilBebas & { riwayat?: HasilBebas };
    const akhir = h.akhir ?? h.riwayat?.akhir ?? [];
    for (const a of akhir) if (a !== null) hasil.push({ jalan: id, penulis: 'opus', no: a.no, versi: a.versi, lulus: a.lulus, omongan: a.omongan });
  }
  return hasil;
}

export const PETUNJUK_AUDIT_M2D15 = [
  '# Audit Opus satu soal M2d-15 (D-5, patokan §2 b) — petunjuk untuk reviewer',
  '',
  'Disiapkan kode eksekutor; eksekutor TIDAK menjalankan audit dan tidak menulis hasilnya.',
  '',
  '1. Untuk tiap berkas `bahan/<bNN>--r<r>.md` (satu soal × satu rotasi, tanpa kartu), jalankan SATU subagent Claude **opus baru**, SINKRON, yang hanya menerima isi berkas itu (tanpa folder lain; `kunci.json` ada di luar `bahan/`).',
  '2. Simpan jawaban mentahnya apa adanya di `jawaban/<bNN>--r<r>.txt`.',
  '3. `npm run opus:audit -- --nilai` → `nilai.json`. Patokan §2 (b): tiap omongan versi lulus ≤ 2/4 rotasi memilih kunci. `npm run opus:jalan` membaca berkas ini untuk syarat jalan 2; `npm run opus:laporan` memperbarui laporan.',
].join('\n');

function tulisAudit(): number {
  const butir = butirAkhirM2d15();
  if (butir.length === 0) {
    console.error('Belum ada hasil jalan M2d-15.');
    return 1;
  }
  const { berkas, kunci } = bangunAuditSatuSoal(butir, BENIH_AUDIT_M2D15);
  rmSync(`${FOLDER_AUDIT_M2D15}/bahan`, { recursive: true, force: true });
  mkdirSync(`${FOLDER_AUDIT_M2D15}/bahan`, { recursive: true });
  mkdirSync(`${FOLDER_AUDIT_M2D15}/jawaban`, { recursive: true });
  for (const b of berkas) writeFileSync(`${FOLDER_AUDIT_M2D15}/bahan/${b.nama}.md`, b.isi, 'utf8');
  writeFileSync(`${FOLDER_AUDIT_M2D15}/kunci.json`, `${JSON.stringify(kunci, null, 2)}\n`, 'utf8');
  writeFileSync(`${FOLDER_AUDIT_M2D15}/PETUNJUK.md`, `${PETUNJUK_AUDIT_M2D15}\n`, 'utf8');
  console.log(`${String(butir.length)} butir × 4 rotasi = ${String(berkas.length)} berkas di ${FOLDER_AUDIT_M2D15}/bahan`);
  return 0;
}

function nilaiAuditM2d15(): number {
  const kunci = JSON.parse(readFileSync(`${FOLDER_AUDIT_M2D15}/kunci.json`, 'utf8')) as KunciAuditM2d13;
  const folder = `${FOLDER_AUDIT_M2D15}/jawaban`;
  const ada = existsSync(folder) ? readdirSync(folder) : [];
  const jawaban = Object.fromEntries(kunci.berkas.map((b) => [b.nama, ada.includes(`${b.nama}.txt`) ? readFileSync(`${folder}/${b.nama}.txt`, 'utf8') : null]));
  const n = nilaiAudit(kunci, jawaban);
  const per = n.per_soal.map((s) => ({ ...kunci.butir.find((b) => b.id_buta === s.id), tanpa_kartu_benar: s.tanpa_kartu_benar, n: s.tanpa_kartu_n, lolos_b: s.tanpa_kartu_benar <= 2 }));
  writeFileSync(`${FOLDER_AUDIT_M2D15}/nilai.json`, `${JSON.stringify({ cara: 'satu soal × satu rotasi per subagent Opus, tanpa kartu; patokan §2 (b) ≤ 2/4', per_butir: per, berkas_tanpa_jawaban: n.berkas_tanpa_jawaban }, null, 2)}\n`, 'utf8');
  console.log(`${String(per.length)} butir dinilai; berkas tanpa jawaban ${String(n.berkas_tanpa_jawaban.length)}`);
  return 0;
}

/* ---------------------------------------------------------------------- */
/* mutu                                                                    */
/* ---------------------------------------------------------------------- */

export type AsalMutuM2d15 = 'opus-m2d15' | 'opus-m2d13' | 'templat-m2d11' | 'tayang-dada';

export interface ButirMutuM2d15 {
  id_buta: string;
  asal: AsalMutuM2d15;
  sumber: string;
  omongan: OmonganDraf;
  paket: PaketFakta;
}

/** Omongan Opus M2d-13 yang lulus gerbang (m2d13-opus-2 o1 v2 dan o3 v2). */
export const LULUS_OPUS_M2D13 = [
  { jalan: 'm2d13-opus-2', no: 1, versi: 2 },
  { jalan: 'm2d13-opus-2', no: 3, versi: 2 },
] as const;

/** Semua butir mutu M2d-15, urutan buta (benih tertulis). */
export function butirMutuM2d15(akar: string = AKAR): ButirMutuM2d15[] {
  const tirt = JSON.parse(readFileSync(`${akar}eval/penyusun/m2d11-tirt-7/paket.json`, 'utf8')) as PaketFakta;
  const baru = butirAkhirM2d15(akar).map((b) => ({ asal: 'opus-m2d15' as const, sumber: `${b.jalan}/o${String(b.no)}/v${String(b.versi)}${b.lulus ? '/lulus' : ''}`, omongan: drafDari(b.omongan), paket: tirt }));
  const lama = LULUS_OPUS_M2D13.map((l) => {
    const h = JSON.parse(readFileSync(`${akar}eval/penyusun/${l.jalan}/hasil.json`, 'utf8')) as HasilBebas;
    const v = h.versi.find((x) => x.no === l.no && x.versi === l.versi && x.berhenti === 'lolos');
    if (v?.omongan === null || v === undefined) throw new Error(`${l.jalan} o${String(l.no)} v${String(l.versi)} bukan versi lulus`);
    return { asal: 'opus-m2d13' as const, sumber: `${l.jalan}/o${String(l.no)}/v${String(l.versi)}/lulus`, omongan: drafDari(v.omongan), paket: tirt };
  });
  const t7 = (JSON.parse(readFileSync(`${akar}eval/penyusun/m2d11-tirt-7/hasil.json`, 'utf8')) as { kunci: Array<{ no: number; omongan: OmonganDraf }> }).kunci.map((k) => ({ asal: 'templat-m2d11' as const, sumber: `m2d11-tirt-7/o${String(k.no)}`, omongan: k.omongan, paket: tirt }));
  const dada = soalManusiaM2d8()
    .filter((s) => s.id.startsWith('dada-'))
    .map((s) => ({ asal: 'tayang-dada' as const, sumber: `tayang-${s.id}`, omongan: s.omongan, paket: s.paket }));
  return urutButa([...baru, ...lama, ...t7, ...dada], (x) => x.sumber, BENIH_MUTU_M2D15).map((x, i) => ({ ...x, id_buta: `m${String(i + 1).padStart(2, '0')}` }));
}

function tulisKunciMutu(butir: readonly ButirMutuM2d15[]): void {
  mkdirSync(FOLDER_M2D15, { recursive: true });
  writeFileSync(`${FOLDER_M2D15}/kunci-mutu.json`, `${JSON.stringify({ benih: BENIH_MUTU_M2D15, butir: butir.map((b) => ({ id_buta: b.id_buta, asal: b.asal, sumber: b.sumber })) }, null, 2)}\n`, 'utf8');
}

function bahanMutuOpus(): number {
  const butir = butirMutuM2d15();
  tulisKunciMutu(butir);
  rmSync(`${FOLDER_MUTU_OPUS_M2D15}/bahan`, { recursive: true, force: true });
  mkdirSync(`${FOLDER_MUTU_OPUS_M2D15}/bahan`, { recursive: true });
  mkdirSync(`${FOLDER_MUTU_OPUS_M2D15}/jawaban`, { recursive: true });
  for (const b of butir) writeFileSync(`${FOLDER_MUTU_OPUS_M2D15}/bahan/${b.id_buta}.md`, `${promptPenilai()}\n\n---\n\n${teksButir(b)}\n`, 'utf8');
  writeFileSync(
    `${FOLDER_MUTU_OPUS_M2D15}/PETUNJUK.md`,
    [
      '# Penilai mutu Opus buta M2d-15 (D-5) — petunjuk untuk reviewer',
      '',
      'Disiapkan kode eksekutor; eksekutor TIDAK menjalankan penilai Opus dan tidak menulis hasilnya. Mutu = laporan, bukan syarat (pra-registrasi §2).',
      '',
      '1. Untuk tiap berkas `bahan/<mNN>.md` (satu butir; rubrik sama dengan penilai GLM dan M2d-13), jalankan SATU subagent Claude **opus baru**, SINKRON, yang hanya menerima isi berkas itu. Asal butir ada di `../kunci-mutu.json` — jangan diberikan ke subagent.',
      '2. Simpan jawaban mentahnya apa adanya di `jawaban/<mNN>.txt`.',
      '3. `npm run opus:mutu -- --nilai-opus` → `nilai.json`; lalu `npm run opus:laporan`.',
      '',
    ].join('\n'),
    'utf8',
  );
  console.log(`${String(butir.length)} berkas penilai Opus di ${FOLDER_MUTU_OPUS_M2D15}/bahan`);
  return 0;
}

function entri(): EntriLedger[] {
  return existsSync(JALUR_LEDGER) ? readFileSync(JALUR_LEDGER, 'utf8').split(/\r?\n/).filter((x) => x.trim() !== '').map((x) => JSON.parse(x) as EntriLedger) : [];
}

async function glmM2d15(): Promise<number> {
  const S = SETELAN_PENILAI_GLM_TINGGI;
  const konfig = bacaKonfigLlm();
  if (konfig.baseUrl !== BASE_URL_OPENROUTER) throw new Error('LLM_BASE_URL bukan OpenRouter (nilainya tidak dicetak).');
  const biayaD4 = entri().filter((e) => e.tag.startsWith('penyusun/m2d15-')).reduce((a, e) => a + e.biaya_usd, 0);
  const paguBagian = paguPenilaiM2d15(biayaD4);
  const biaya = new PencatatBiaya({
    paguUsd: konfig.paguUsd,
    jalurLedger: JALUR_LEDGER,
    biayaNyata: true,
    paguMilestone: { usd: PAGU_MILESTONE_M2D15 - biayaD4, awalanTag: 'm2d15/' },
    paguBagian: [{ usd: paguBagian, awalanTag: AWALAN_MUTU_M2D15 }],
  });
  console.log(`Penilai GLM M2d-15: biaya D-4 US$${biayaD4.toFixed(6)}; pagu bagian US$${paguBagian.toFixed(4)}; PID ${String(process.pid)}`);
  const klien: KonfigKlien = { baseUrl: konfig.baseUrl, apiKey: konfig.apiKey, batasWaktuMs: 900_000, pagar: pagarKritikusTerkunci };
  const butir = butirMutuM2d15();
  tulisKunciMutu(butir);
  mkdirSync(FOLDER_MUTU_M2D15, { recursive: true });
  const jalur = `${FOLDER_MUTU_M2D15}/glm.json`;
  const lama = existsSync(jalur) ? (JSON.parse(readFileSync(jalur, 'utf8')) as { hasil: HasilGlm[] }).hasil : [];
  const hasil: HasilGlm[] = lama.filter((h) => butir.some((b) => b.id_buta === h.id_buta) && h.penilaian !== null);
  const simpan = (): void => writeFileSync(jalur, `${JSON.stringify({ setelan: S, model: MODEL_OR_GLM, pagu_bagian_usd: paguBagian, biaya_tag_usd: biaya.totalAwalan(AWALAN_MUTU_M2D15), hasil }, null, 2)}\n`, 'utf8');
  for (const b of butir) {
    if (hasil.some((h) => h.id_buta === b.id_buta)) continue;
    const pesan: PesanChat[] = [
      { role: 'system', content: promptPenilai() },
      { role: 'user', content: teksButir(b) },
    ];
    const h: HasilGlm = { id_buta: b.id_buta, percobaan: [], penilaian: null };
    try {
      for (let ulang = 0; ulang < 2 && h.penilaian === null; ulang++) {
        const j = await chatBerpagu(klien, biaya, { model: MODEL_OR_GLM, pesan, suhu: S.suhu, maxTokens: S.maxTokens, tambahanBadan: S.tambahanBadan }, `${AWALAN_MUTU_M2D15}${b.id_buta}${ulang > 0 ? `/u${String(ulang)}` : ''}`, { ambangPenalaran: S.ambangPenalaran });
        const tp = j.token_penalaran ?? null;
        const p = uraiPenilaian(j.teks);
        const sahPenalaran = tp !== null && tp >= S.ambangPenalaran;
        const sah = p !== null && sahPenalaran;
        h.percobaan.push({ teks: j.teks, token_penalaran: tp, penyedia: j.penyedia ?? null, biaya_usd: j.biaya_usd, sah, alasan: p === null ? 'tak terbaca' : sahPenalaran ? '' : `penalaran ${String(tp)} < ${String(S.ambangPenalaran)}` });
        if (sah) h.penilaian = p;
      }
    } catch (galat) {
      if (h.percobaan.length > 0) hasil.push(h);
      simpan();
      console.error(`${b.id_buta}: ${galat instanceof Error ? `${galat.name}: ${galat.message}` : 'galat'}`);
      return galat instanceof PaguTercapai ? 2 : 1;
    }
    hasil.push(h);
    simpan();
    console.log(`${b.id_buta} ${h.penilaian === null ? 'HILANG' : `total ${String(h.penilaian.total)} layak ${String(h.penilaian.layak_tayang)}`} (US$${h.percobaan.reduce((a, x) => a + x.biaya_usd, 0).toFixed(4)}; bagian US$${biaya.totalAwalan(AWALAN_MUTU_M2D15).toFixed(4)})`);
  }
  simpan();
  return 0;
}

function nilaiMutuOpus(): number {
  const butir = (JSON.parse(readFileSync(`${FOLDER_M2D15}/kunci-mutu.json`, 'utf8')) as { butir: Array<{ id_buta: string }> }).butir;
  const folder = `${FOLDER_MUTU_OPUS_M2D15}/jawaban`;
  const ada = existsSync(folder) ? readdirSync(folder) : [];
  const hasil = butir.map((b) => {
    const teks = ada.includes(`${b.id_buta}.txt`) ? readFileSync(`${folder}/${b.id_buta}.txt`, 'utf8') : null;
    return { id_buta: b.id_buta, ada: teks !== null, penilaian: teks === null ? null : uraiPenilaian(teks) };
  });
  writeFileSync(`${FOLDER_MUTU_OPUS_M2D15}/nilai.json`, `${JSON.stringify({ hasil }, null, 2)}\n`, 'utf8');
  console.log(`${String(hasil.filter((h) => h.penilaian !== null).length)}/${String(hasil.length)} penilaian Opus terbaca`);
  return 0;
}

const argv = process.argv;
if (/(^|[\\/])bebas[\\/]m2d15\.ts$/.test(argv[1] ?? '')) {
  if (argv.includes('--audit')) process.exitCode = argv.includes('--nilai') ? nilaiAuditM2d15() : tulisAudit();
  else if (argv.includes('--glm')) {
    glmM2d15().then(
      (k) => {
        process.exitCode = k;
      },
      (g: unknown) => {
        console.error(g instanceof Error ? `${g.name}: ${g.message}` : 'galat');
        process.exitCode = 1;
      },
    );
  } else process.exitCode = argv.includes('--nilai-opus') ? nilaiMutuOpus() : bahanMutuOpus();
}
