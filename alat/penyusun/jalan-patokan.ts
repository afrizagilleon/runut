/**
 * `npm run patokan:jalan` — SATU jalan TIRT 10 Des 2025 lewat pintu penyusun
 * dengan mesin templat M2d-11 (kontrak M2d-11 D-5, pra-registrasi §6).
 *
 * Id jalan berikutnya `m2d11-tirt-<n>` (n = 1, 2, …); pagu jalan =
 * min(US$0,60, sisa pagu milestone M2d-11 US$5,00), dihitung kode sesaat
 * sebelum mulai; sisa < US$0,30 → tidak dimulai. Jalan diulang oleh operator
 * (satu perintah = satu jalan) sampai satu simulasi lulus atau pagu habis.
 * Server pintu dinyalakan di 127.0.0.1 dalam proses ini dan dimatikan di akhir.
 */
import { existsSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { paguJalanM2d11, sisaPaguM2d11 } from '../../factory/llm/patokan/konfig.ts';
import { ringkasBiaya } from './biaya.ts';
import { buatAplikasi, dengarkan } from './server.ts';

const AKAR = fileURLToPath(new URL('../../', import.meta.url));

function tunggu(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

/** Id jalan berikutnya dari folder yang sudah ada. Murni terhadap daftar. */
export function idJalanBerikut(ada: readonly string[]): string {
  const n = ada.map((x) => /^m2d11-tirt-(\d+)$/.exec(x)?.[1]).filter((x): x is string => x !== undefined).map(Number);
  return `m2d11-tirt-${String((n.length === 0 ? 0 : Math.max(...n)) + 1)}`;
}

async function utama(): Promise<number> {
  const folder = join(AKAR, 'eval', 'penyusun');
  const ID = idJalanBerikut(existsSync(folder) ? readdirSync(folder) : []);
  const pagu = paguJalanM2d11();
  if (pagu === null) {
    console.error(`Sisa pagu milestone M2d-11 US$${sisaPaguM2d11().toFixed(2)} < US$0,30; jalan tidak dimulai (pra-registrasi §6).`);
    return 2;
  }
  const sisa = pagu;
  const terpakai = ringkasBiaya(AKAR, 0).terpakai_penyusun_usd;
  const paguPenyusun = Math.round((terpakai + sisa + 0.005) * 1000) / 1000;
  const { server } = buatAplikasi({ akar: AKAR, folderKeluaran: folder, jam: () => new Date(), log: (b) => console.log(`[server] ${b}`), paguPenyusunUsd: paguPenyusun, palsu: false, namaMesin: 'templat-m2d11' });
  const port = await dengarkan(server, 0);
  const asal = `http://127.0.0.1:${String(port)}`;
  const kirim = async (jalur: string, badan?: unknown): Promise<{ status: number; isi: Record<string, unknown> }> => {
    const r = await fetch(`${asal}${jalur}`, badan === undefined ? {} : { method: 'POST', headers: { 'content-type': 'application/json', origin: asal }, body: JSON.stringify(badan) });
    return { status: r.status, isi: (await r.json()) as Record<string, unknown> };
  };
  try {
    console.log(`Pintu penyusun (mesin templat-m2d11, jalan ${ID}) di ${asal}; pagu jalan US$${sisa.toFixed(2)}; pagu penyusun US$${paguPenyusun.toFixed(3)} (terpakai US$${terpakai.toFixed(4)}).`);
    const s = await kirim('/api/siapkan', { kode: 'TIRT', tanggal: '2025-12-10', jendela: 10, id: ID });
    console.log(`siapkan → ${String(s.status)} ${JSON.stringify(s.isi)}`);
    if (s.status !== 202) return 1;
    let p: Record<string, unknown> = {};
    for (let i = 0; i < 120; i++) {
      p = (await kirim(`/api/jalan/${ID}`)).isi;
      if (p['tahap'] !== 'menyiapkan') break;
      await tunggu(1_000);
    }
    console.log(`tahap: ${String(p['tahap'])}; sumber paket: ${JSON.stringify(p['sumber_paket'])}`);
    if (p['tahap'] !== 'menunggu-persetujuan') {
      console.log(JSON.stringify(p['hasil'] ?? p['galat'] ?? null));
      return 1;
    }
    const m = await kirim(`/api/jalan/${ID}/mulai`, { setuju: true, pagu_usd: sisa });
    console.log(`mulai → ${String(m.status)} ${JSON.stringify(m.isi)}`);
    if (m.status !== 202) return 1;
    for (;;) {
      await tunggu(10_000);
      p = (await kirim(`/api/jalan/${ID}`)).isi;
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

if (process.argv[1]?.replace(/\\/g, '/').endsWith('/penyusun/jalan-patokan.ts') === true) {
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
