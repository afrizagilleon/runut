/**
 * `npm run opus:jalan` — SATU jalan D-4 M2d-15 lewat pintu penyusun
 * (`--mesin bebas --penulis opus --prompt v2`), slot berikutnya menurut
 * pra-registrasi `docs/bukti/m2d15-praregistrasi.md` §6 (`rencanaJalanM2d15`):
 *
 * - jalan selesai = folder `eval/penyusun/m2d15-opus-<n>/` sudah ada; biaya dari
 *   ledger (tag `penyusun/<id>/`), terbit dari `hasil.json`;
 * - jalan 2 hanya bila jalan 1 tidak terbit, atau audit reviewer gagal
 *   (`eval/keluaran-m2d15/audit-opus/nilai.json`);
 * - pagu jalan = min(US$2,00 [amandemen A2]; US$2,70 − biaya D-4), ditegakkan `PencatatBiaya`
 *   sebelum tiap percobaan HTTP (pagu bagian tag `penyusun/<id>/`); biaya
 *   milestone (tag `penyusun/m2d15-` + `m2d15/`) + pagu jalan ≤ US$3,00 −
 *   cadangan penilai US$0,30 diperiksa sebelum mulai.
 * Server pintu dinyalakan di 127.0.0.1 dalam proses ini dan dimatikan di akhir.
 */
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { auditJalan, idJalanM2d15, MAKS_JALAN_M2D15, MAKS_JALAN_M2D15_T2, PAGU_D4_M2D15, PAGU_MILESTONE_M2D15, rencanaJalanM2d15, rencanaJalanT2, type JalanSelesai } from '../../factory/llm/bebas/pagu-m2d15.ts';
import { biayaAwalan, ringkasBiaya } from './biaya.ts';
import { buatAplikasi, dengarkan } from './server.ts';

const AKAR = fileURLToPath(new URL('../../', import.meta.url));
export const JALUR_AUDIT_M2D15 = 'eval/keluaran-m2d15/audit-opus/nilai.json';

function tunggu(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

/** Jalan M2d-15 yang foldernya sudah ada, dengan biaya nyata dan status terbit. */
export function jalanSelesaiM2d15(akar: string): JalanSelesai[] {
  const hasil: JalanSelesai[] = [];
  for (let n = 1; n <= MAKS_JALAN_M2D15_T2; n++) {
    const id = idJalanM2d15(n);
    const folder = join(akar, 'eval', 'penyusun', id);
    if (!existsSync(folder)) break;
    const jalurHasil = join(folder, 'hasil.json');
    const terbit = existsSync(jalurHasil) && (JSON.parse(readFileSync(jalurHasil, 'utf8')) as { terbit?: boolean }).terbit === true;
    hasil.push({ id, biaya_usd: biayaAwalan(akar, `penyusun/${id}/`), terbit });
  }
  return hasil;
}

async function utama(): Promise<number> {
  const selesai = jalanSelesaiM2d15(AKAR);
  const jalurAudit = join(AKAR, JALUR_AUDIT_M2D15);
  const nilai = existsSync(jalurAudit) ? (JSON.parse(readFileSync(jalurAudit, 'utf8')) as Parameters<typeof auditJalan>[0]) : null;
  const biayaM = biayaAwalan(AKAR, 'penyusun/m2d15-') + biayaAwalan(AKAR, 'm2d15/');
  // amandemen T2: sesudah 2 jalan pra-registrasi tanpa terbit, satu jalan lagi dengan sisa pagu milestone
  const t2 = selesai.length >= MAKS_JALAN_M2D15;
  const r = t2 ? rencanaJalanT2(selesai, biayaM) : rencanaJalanM2d15(selesai, auditJalan(nilai, idJalanM2d15(1)));
  console.log(`Biaya milestone M2d-15 tercatat US$${biayaM.toFixed(6)}; jalan selesai: ${JSON.stringify(selesai)}`);
  if ('berhenti' in r) {
    console.log(`BERHENTI: ${r.berhenti}`);
    return 2;
  }
  const biayaD4 = selesai.reduce((a, j) => a + j.biaya_usd, 0);
  const batas = t2 ? PAGU_MILESTONE_M2D15 : PAGU_D4_M2D15;
  if (biayaD4 + r.pagu > batas + 1e-9 || biayaM + r.pagu > batas + 1e-9) throw new Error(`pagu jalan US$${r.pagu.toFixed(4)} + biaya US$${biayaM.toFixed(4)} > US$${batas.toFixed(2)}`);
  const folder = join(AKAR, 'eval', 'penyusun');
  const terpakai = ringkasBiaya(AKAR, 0).terpakai_penyusun_usd;
  const paguPenyusun = Math.round((terpakai + r.pagu + 0.01) * 10_000) / 10_000;
  const { server } = buatAplikasi({ akar: AKAR, folderKeluaran: folder, jam: () => new Date(), log: (b) => console.log(`[server] ${b}`), paguPenyusunUsd: paguPenyusun, palsu: false, namaMesin: 'bebas', penulisBebas: 'opus', promptBebas: 'v2' });
  const port = await dengarkan(server, 0);
  const asal = `http://127.0.0.1:${String(port)}`;
  const kirim = async (jalur: string, badan?: unknown): Promise<{ status: number; isi: Record<string, unknown> }> => {
    const x = await fetch(`${asal}${jalur}`, badan === undefined ? {} : { method: 'POST', headers: { 'content-type': 'application/json', origin: asal }, body: JSON.stringify(badan) });
    return { status: x.status, isi: (await x.json()) as Record<string, unknown> };
  };
  try {
    console.log(`Pintu penyusun (mesin bebas, penulis opus, prompt v2 M2d-15, jalan ${r.id}) di ${asal}; pagu jalan US$${r.pagu.toFixed(4)} (${r.alasan}); PID ${String(process.pid)}.`);
    const s = await kirim('/api/siapkan', { kode: 'TIRT', tanggal: '2025-12-10', jendela: 10, id: r.id });
    console.log(`siapkan → ${String(s.status)} ${JSON.stringify(s.isi)}`);
    if (s.status !== 202) return 1;
    let p: Record<string, unknown> = {};
    for (let i = 0; i < 120; i++) {
      p = (await kirim(`/api/jalan/${r.id}`)).isi;
      if (p['tahap'] !== 'menyiapkan') break;
      await tunggu(1_000);
    }
    if (p['tahap'] !== 'menunggu-persetujuan') {
      console.log(JSON.stringify(p['hasil'] ?? p['galat'] ?? null));
      return 1;
    }
    const m = await kirim(`/api/jalan/${r.id}/mulai`, { setuju: true, pagu_usd: r.pagu });
    console.log(`mulai → ${String(m.status)} ${JSON.stringify(m.isi)}`);
    if (m.status !== 202) return 1;
    for (;;) {
      await tunggu(10_000);
      p = (await kirim(`/api/jalan/${r.id}`)).isi;
      if (p['tahap'] === 'selesai' || p['tahap'] === 'galat') break;
    }
    const h = p['hasil'] as { terbit?: boolean; berhenti?: string | null; putaran?: number; biaya_ledger_usd?: number } | undefined;
    console.log(`SELESAI ${r.id}: ${h?.terbit === true ? 'TERBIT' : 'TIDAK TERBIT'}; versi ${String(h?.putaran)}; biaya nyata US$${String(h?.biaya_ledger_usd)}; ${String(h?.berhenti ?? p['galat'] ?? '')}`);
    return p['tahap'] === 'galat' ? 1 : 0;
  } finally {
    server.closeAllConnections();
    await new Promise<void>((x) => server.close(() => x()));
  }
}

if (process.argv[1]?.replace(/\\/g, '/').endsWith('/penyusun/jalan-opus.ts') === true) {
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
