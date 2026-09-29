/**
 * `npm run penalar:kritikus` — kalibrasi ringan kritikus (kontrak M2d-6 D-5):
 * kritikus dengan setelan M2d-6 (GLM-5.3, `reasoning.effort` "high", penjaga
 * penalaran) atas draf TIRT M2d-5 yang terbit tetapi gagal uji luar. Ia harus
 * mengajukan keberatan atas pengecoh kembar omongan 3 — atau G-pilihan-kembar
 * (pemeriksa, kode) menangkapnya lebih dulu; keduanya dilaporkan.
 *
 * Konteks kritikus sama dengan di lingkar M2d-5: putusan pembaca kartu dari
 * riwayat M2d-5 (putaran saat omongan itu dikunci), penebak dijalankan
 * sesudah kritikus. Omongan 3 diperiksa tiga kali (sampel), omongan 1 dan 2
 * sekali. Pagu US$0,30 (tag `m2d6/kritikus/`) DITEGAKKAN kode.
 *
 * Keluaran `eval/keluaran-m2d6/kritikus/kalibrasi-kritikus.json`.
 */
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { GENERASI_M2D6 } from './agen-peran.ts';
import type { OmonganDraf } from './draf.ts';
import { AKAR } from './env.ts';
import { gKembar } from './gerbang-kembar.ts';
import { kritik, type KonteksKritik } from './kritikus.ts';
import { MODEL_OR_GLM } from './model.ts';
import { PaguTercapai, chatBerpagu } from './pagu.ts';
import { bahanM2d5 } from './penalar-probe.ts';
import { PAGU_BAGIAN_M2D6, siapkanM2d6 } from './penalar-susun.ts';
import { ubahGalatSaldo } from './peran-susun.ts';

export const JALUR_KRITIKUS_M2D6 = `${AKAR}eval/keluaran-m2d6/kritikus/kalibrasi-kritikus.json`;
/** Putaran penguncian tiap omongan TIRT M2d-5 (riwayat) dan jumlah sampel kritikus. */
export const RENCANA_KRITIKUS: ReadonlyArray<{ no: number; putaran: number; sampel: number }> = [
  { no: 3, putaran: 4, sampel: 3 },
  { no: 1, putaran: 4, sampel: 1 },
  { no: 2, putaran: 2, sampel: 1 },
];

/** Konteks kritikus = putusan pembaca kartu M2d-5 saat omongan itu dikunci. */
export function konteksM2d5(o: OmonganDraf, no: number, putaran: number): KonteksKritik {
  const r = JSON.parse(readFileSync(`${AKAR}eval/keluaran-m2d5/tirt/riwayat.json`, 'utf8')) as {
    riwayat: Array<{ omongan: Array<{ no: number; kartu: { pilihan: string | null; kartu_ditunjuk: string[]; alasan_penjawab: string } | null }> }>;
  };
  const k = r.riwayat[putaran - 1]?.omongan.find((x) => x.no === no)?.kartu;
  if (k === null || k === undefined) throw new Error(`Putusan kartu omongan ${String(no)} putaran ${String(putaran)} tidak ada.`);
  return {
    no,
    kartu: { pilihan: k.pilihan, kartu_ditunjuk_no: k.kartu_ditunjuk.map((id) => o.kartu.indexOf(id) + 1).filter((x) => x > 0), alasan: k.alasan_penjawab },
    tebakan: [],
    penebakSesudah: true,
  };
}

async function utama(): Promise<number> {
  if (existsSync(JALUR_KRITIKUS_M2D6) && !process.argv.includes('--ulang')) {
    console.error(`${JALUR_KRITIKUS_M2D6} sudah ada; kalibrasi yang sudah dibayar tidak diulang tanpa --ulang.`);
    return 1;
  }
  const { klien, biaya } = siapkanM2d6();
  const awalan = PAGU_BAGIAN_M2D6.kritikus.awalanTag;
  const { paket, omongan } = bahanM2d5();
  const hasil: unknown[] = [];
  mkdirSync(`${AKAR}eval/keluaran-m2d6/kritikus`, { recursive: true });
  const simpan = (): void =>
    writeFileSync(JALUR_KRITIKUS_M2D6, JSON.stringify({ pagu_usd: PAGU_BAGIAN_M2D6.kritikus.usd, biaya_usd: biaya.totalAwalan(awalan), setelan: GENERASI_M2D6.kritikus, hasil }, null, 2) + '\n', 'utf8');
  const kr = GENERASI_M2D6.kritikus;
  for (const r of RENCANA_KRITIKUS) {
    const o = omongan[r.no - 1] as OmonganDraf;
    const kembar = gKembar(o.pilihan);
    for (let s = 1; s <= r.sampel; s++) {
      try {
        const p = await kritik(o, paket, konteksM2d5(o, r.no, r.putaran), {
          putaran: 1,
          omongan: r.no,
          cekMakna: kr.cekMakna,
          maxTokens: kr.maxTokens,
          ...(kr.tambahanBadan === undefined ? {} : { tambahanBadan: kr.tambahanBadan }),
          ...(kr.ambangPenalaran === undefined ? {} : { ambangPenalaran: kr.ambangPenalaran }),
          panggil: async (pesan, setelan, info) => {
            const tag = `${awalan}m2d5-tirt-o${String(r.no)}/s${String(s)}/kritikus${info.ulang !== undefined && info.ulang > 0 ? `/u${String(info.ulang)}` : ''}`;
            const j = await chatBerpagu(
              klien,
              biaya,
              {
                model: MODEL_OR_GLM, pesan, suhu: setelan.suhu, maxTokens: setelan.maxTokens, tambahanBadan: setelan.tambahanBadan,
                ...(setelan.abaikanPenyedia === undefined ? {} : { abaikanPenyedia: setelan.abaikanPenyedia }),
              },
              tag,
              setelan.ambangPenalaran === undefined ? {} : { ambangPenalaran: setelan.ambangPenalaran },
            );
            console.log(`  ${tag}: ${String(j.penyedia)} penalaran ${String(j.token_penalaran)} ${String(j.finish_reason)} US$${j.biaya_usd.toFixed(6)}`);
            return j;
          },
        });
        hasil.push({
          omongan: r.no, sampel: s, g_pilihan_kembar: { tolak: kembar.tolak, kembar: kembar.kembar },
          menjawab: p.menjawab, tanpa_keberatan: p.tanpa_keberatan, keberatan: p.keberatan, arahan: p.arahan, cek_makna: p.cek_makna ?? null,
          penalaran_tidak_sah: p.penalaran_tidak_sah ?? [],
          panggilan: p.panggilan.map((x) => ({ penyedia: x.penyedia ?? null, token_penalaran: x.token_penalaran ?? null, token_keluar: x.token_keluar, biaya_usd: x.biaya_usd, finish_reason: x.finish_reason, penalaran_sah: x.penalaran_sah ?? null, teks_mentah: x.teks_mentah })),
        });
        console.log(`omongan ${String(r.no)} sampel ${String(s)}: G-kembar ${kembar.tolak ? 'MENOLAK' : 'lolos'}; kritikus ${p.menjawab ? (p.tanpa_keberatan ? 'tanpa keberatan' : `${String(p.keberatan.length)} keberatan: ${p.keberatan.map((k) => `[${k.jenis}] ${k.alasan}`).join(' | ')}`) : 'TIDAK MENJAWAB'}`);
      } catch (galat) {
        const g = ubahGalatSaldo(galat, MODEL_OR_GLM);
        console.error(`omongan ${String(r.no)}: ${g instanceof Error ? `${g.name}: ${g.message}` : 'galat'}`);
        simpan();
        if (g instanceof PaguTercapai) return g.name === 'SaldoPenyediaHabis' ? 4 : 2;
        return 1;
      }
      simpan();
    }
  }
  console.log(`Kalibrasi kritikus selesai: US$${biaya.totalAwalan(awalan).toFixed(6)} dari US$${PAGU_BAGIAN_M2D6.kritikus.usd.toFixed(2)}.`);
  return 0;
}

if (process.argv[1]?.replace(/\\/g, '/').endsWith('/penalar-kritikus.ts') === true) {
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
