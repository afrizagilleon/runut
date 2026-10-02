/**
 * `npm run penulis:jalan` — SATU jalan D-B M2d-13 lewat pintu penyusun
 * (`--mesin bebas --penulis <model>`), slot berikutnya menurut pagu adil
 * (pra-registrasi `docs/bukti/m2d13-praregistrasi.md` §3, §6):
 * Opus-1, Haiku-1, DeepSeek-1, Opus-2, Haiku-2, DeepSeek-2.
 *
 * - Slot "selesai" = folder `eval/penyusun/<id>/` sudah ada; biayanya dari
 *   ledger (tag `penyusun/<id>/`).
 * - Pagu jalan & keputusan putaran dihitung `rencanaJalanBerikut` dari biaya
 *   nyata; putaran yang tidak muat untuk ketiga penulis tidak dimulai.
 * - Pagu pintu = biaya penyusun yang sudah terpakai + pagu jalan (+US$0,01
 *   pembulatan sen); pagu jalan ditegakkan `PencatatBiaya` sebelum tiap
 *   panggilan. D-B tidak pernah melewati US$2,10 (dites di pagu-adil).
 * Server pintu dinyalakan di 127.0.0.1 dalam proses ini dan dimatikan di akhir.
 */
import { existsSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { PAGU_DB, rencanaJalanBerikut, urutanJalan } from '../../factory/llm/bebas/pagu-adil.ts';
import { biayaAwalan, ringkasBiaya } from './biaya.ts';
import { buatAplikasi, dengarkan } from './server.ts';

const AKAR = fileURLToPath(new URL('../../', import.meta.url));

function tunggu(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

/** Biaya nyata per slot yang foldernya sudah ada. */
export function slotSelesai(akar: string): Record<string, number> {
  const hasil: Record<string, number> = {};
  for (const s of urutanJalan()) if (existsSync(join(akar, 'eval', 'penyusun', s.id))) hasil[s.id] = biayaAwalan(akar, `penyusun/${s.id}/`);
  return hasil;
}

async function utama(): Promise<number> {
  const selesai = slotSelesai(AKAR);
  const biayaDB = Object.values(selesai).reduce((a, x) => a + x, 0);
  const r = rencanaJalanBerikut(selesai);
  console.log(`Biaya D-B tercatat US$${biayaDB.toFixed(6)} dari US$${PAGU_DB.toFixed(2)}; selesai: ${JSON.stringify(selesai)}`);
  if ('berhenti' in r) {
    console.log(`BERHENTI: ${r.berhenti}`);
    return 2;
  }
  const { slot, pagu } = r;
  if (biayaDB + pagu > PAGU_DB + 1e-9) throw new Error(`pagu jalan US$${pagu.toFixed(4)} + biaya D-B US$${biayaDB.toFixed(4)} > US$${PAGU_DB.toFixed(2)}`);
  const folder = join(AKAR, 'eval', 'penyusun');
  const terpakai = ringkasBiaya(AKAR, 0).terpakai_penyusun_usd;
  const paguPenyusun = Math.round((terpakai + pagu + 0.01) * 10_000) / 10_000;
  const { server } = buatAplikasi({ akar: AKAR, folderKeluaran: folder, jam: () => new Date(), log: (b) => console.log(`[server] ${b}`), paguPenyusunUsd: paguPenyusun, palsu: false, namaMesin: 'bebas', penulisBebas: slot.penulis });
  const port = await dengarkan(server, 0);
  const asal = `http://127.0.0.1:${String(port)}`;
  const kirim = async (jalur: string, badan?: unknown): Promise<{ status: number; isi: Record<string, unknown> }> => {
    const x = await fetch(`${asal}${jalur}`, badan === undefined ? {} : { method: 'POST', headers: { 'content-type': 'application/json', origin: asal }, body: JSON.stringify(badan) });
    return { status: x.status, isi: (await x.json()) as Record<string, unknown> };
  };
  try {
    console.log(`Pintu penyusun (mesin bebas, penulis ${slot.penulis}, jalan ${slot.id}, putaran ${String(slot.putaran)}) di ${asal}; pagu jalan US$${pagu.toFixed(4)} (${r.alasan}); PID ${String(process.pid)}.`);
    const s = await kirim('/api/siapkan', { kode: 'TIRT', tanggal: '2025-12-10', jendela: 10, id: slot.id });
    console.log(`siapkan → ${String(s.status)} ${JSON.stringify(s.isi)}`);
    if (s.status !== 202) return 1;
    let p: Record<string, unknown> = {};
    for (let i = 0; i < 120; i++) {
      p = (await kirim(`/api/jalan/${slot.id}`)).isi;
      if (p['tahap'] !== 'menyiapkan') break;
      await tunggu(1_000);
    }
    if (p['tahap'] !== 'menunggu-persetujuan') {
      console.log(JSON.stringify(p['hasil'] ?? p['galat'] ?? null));
      return 1;
    }
    const m = await kirim(`/api/jalan/${slot.id}/mulai`, { setuju: true, pagu_usd: pagu });
    console.log(`mulai → ${String(m.status)} ${JSON.stringify(m.isi)}`);
    if (m.status !== 202) return 1;
    for (;;) {
      await tunggu(10_000);
      p = (await kirim(`/api/jalan/${slot.id}`)).isi;
      if (p['tahap'] === 'selesai' || p['tahap'] === 'galat') break;
    }
    const h = p['hasil'] as { terbit?: boolean; berhenti?: string | null; putaran?: number; biaya_ledger_usd?: number } | undefined;
    console.log(`SELESAI ${slot.id}: ${h?.terbit === true ? 'TERBIT' : 'TIDAK TERBIT'}; versi ${String(h?.putaran)}; biaya nyata US$${String(h?.biaya_ledger_usd)}; ${String(h?.berhenti ?? p['galat'] ?? '')}`);
    return p['tahap'] === 'galat' ? 1 : 0;
  } finally {
    server.closeAllConnections();
    await new Promise<void>((x) => server.close(() => x()));
  }
}

if (process.argv[1]?.replace(/\\/g, '/').endsWith('/penyusun/jalan-bebas.ts') === true) {
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
