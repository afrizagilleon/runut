/**
 * `npm run templat:jalan` — SATU jalan TIRT 10 Des 2025 lewat pintu penyusun
 * dengan mesin templat (kontrak M2d-10 D-7b, pra-registrasi §6).
 *
 * Skrip ini menyalakan server pintu yang SAMA (`buatAplikasi`, mesin
 * `templat`) di 127.0.0.1 dalam proses ini, lalu memakai API-nya persis seperti
 * halaman: siapkan (tahap gratis) → tunggu perkiraan → setujui dengan pagu →
 * tunggu hasil. Log tahapan SSE tersimpan di `eval/penyusun/m2d10-tirt/aliran.jsonl`.
 * Server dimatikan di akhir (tanpa proses tersisa).
 *
 * Pagu jalan = sisa pagu milestone M2d-10 (US$1,20 − biaya nyata `m2d10/`),
 * dihitung kode sesaat sebelum mulai; pagu penyusun = terpakai + sisa itu.
 */
import { existsSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { sisaPaguJalan } from '../../factory/llm/templat/konfig.ts';
import { ringkasBiaya } from './biaya.ts';
import { PAGU_JALAN_MIN } from './jalan.ts';
import { buatAplikasi, dengarkan } from './server.ts';

const AKAR = fileURLToPath(new URL('../../', import.meta.url));
export const ID_JALAN_TIRT = 'm2d10-tirt';

function tunggu(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

async function utama(): Promise<number> {
  const folder = join(AKAR, 'eval', 'penyusun');
  if (existsSync(join(folder, ID_JALAN_TIRT))) {
    console.error(`eval/penyusun/${ID_JALAN_TIRT} sudah ada; M2d-10 hanya SATU jalan TIRT (pra-registrasi §6).`);
    return 1;
  }
  const sisa = sisaPaguJalan();
  if (sisa < PAGU_JALAN_MIN) {
    console.error(`Sisa pagu milestone US$${sisa.toFixed(2)} di bawah pagu jalan minimum US$${PAGU_JALAN_MIN.toFixed(2)}; jalan tidak dimulai.`);
    return 2;
  }
  const terpakai = ringkasBiaya(AKAR, 0).terpakai_penyusun_usd;
  const paguPenyusun = Math.round((terpakai + sisa + 0.005) * 1000) / 1000;
  const { server } = buatAplikasi({ akar: AKAR, folderKeluaran: folder, jam: () => new Date(), log: (b) => console.log(`[server] ${b}`), paguPenyusunUsd: paguPenyusun, palsu: false, namaMesin: 'templat' });
  const port = await dengarkan(server, 0);
  const asal = `http://127.0.0.1:${String(port)}`;
  const kirim = async (jalur: string, badan?: unknown): Promise<{ status: number; isi: Record<string, unknown> }> => {
    const r = await fetch(`${asal}${jalur}`, badan === undefined ? {} : { method: 'POST', headers: { 'content-type': 'application/json', origin: asal }, body: JSON.stringify(badan) });
    return { status: r.status, isi: (await r.json()) as Record<string, unknown> };
  };
  try {
    console.log(`Pintu penyusun (mesin templat) di ${asal}; pagu jalan US$${sisa.toFixed(2)}; pagu penyusun US$${paguPenyusun.toFixed(3)} (terpakai US$${terpakai.toFixed(4)}).`);
    const s = await kirim('/api/siapkan', { kode: 'TIRT', tanggal: '2025-12-10', jendela: 10, id: ID_JALAN_TIRT });
    console.log(`siapkan → ${String(s.status)} ${JSON.stringify(s.isi)}`);
    if (s.status !== 202) return 1;
    let p: Record<string, unknown> = {};
    for (let i = 0; i < 120; i++) {
      p = (await kirim(`/api/jalan/${ID_JALAN_TIRT}`)).isi;
      if (p['tahap'] !== 'menyiapkan') break;
      await tunggu(1_000);
    }
    console.log(`tahap: ${String(p['tahap'])}; sumber paket: ${JSON.stringify(p['sumber_paket'])}`);
    if (p['tahap'] !== 'menunggu-persetujuan') {
      console.log(JSON.stringify(p['hasil'] ?? p['galat'] ?? null));
      return 1;
    }
    const m = await kirim(`/api/jalan/${ID_JALAN_TIRT}/mulai`, { setuju: true, pagu_usd: sisa });
    console.log(`mulai → ${String(m.status)} ${JSON.stringify(m.isi)}`);
    if (m.status !== 202) return 1;
    for (;;) {
      await tunggu(10_000);
      p = (await kirim(`/api/jalan/${ID_JALAN_TIRT}`)).isi;
      if (p['tahap'] === 'selesai' || p['tahap'] === 'galat') break;
    }
    const h = p['hasil'] as { terbit?: boolean; berhenti?: string | null; putaran?: number; biaya_ledger_usd?: number } | undefined;
    console.log(`SELESAI: ${h?.terbit === true ? 'TERBIT' : 'TIDAK TERBIT'}; versi ${String(h?.putaran)}; biaya nyata US$${String(h?.biaya_ledger_usd)}; ${String(h?.berhenti ?? '')}`);
    return h?.terbit === true ? 0 : 3;
  } finally {
    server.closeAllConnections();
    await new Promise<void>((r) => server.close(() => r()));
  }
}

if (process.argv[1]?.replace(/\\/g, '/').endsWith('/penyusun/jalan-templat.ts') === true) {
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
