/**
 * `npm run patokan:cacat` — kalibrasi detektor cacat pada 6 soal tayang +
 * recall pada omongan lama yang tertebak luar (M2d-11 D-1, pra-registrasi §2).
 * Tanpa jaringan, gratis. Keluaran: `eval/keluaran-m2d11/cacat/kalibrasi.json`.
 */
import { mkdirSync, writeFileSync } from 'node:fs';
import { AKAR } from '../env.ts';
import { bankUjiUlang, type ButirBank } from '../patokan/bank-lama.ts';
import { AMBANG_AWAL, deteksi, kalibrasiAmbang, menolak, type AmbangCacat, type Bendera, type KodeDetektor, type LangkahKalibrasi, type SoalCacat } from './detektor.ts';

export const FOLDER_CACAT_M2D11 = `${AKAR}eval/keluaran-m2d11/cacat`;

export const soalCacatDari = (b: Pick<ButirBank, 'omongan'>): SoalCacat => ({ pesan: b.omongan.pesan, pilihan: b.omongan.pilihan, kunci: b.omongan.kunci });

export interface BarisCacat {
  id: string;
  kelompok: 'tayang' | 'lama';
  tertebak_luar: boolean;
  luar: string | null;
  kunci: string;
  awal: Bendera[];
  akhir: Bendera[];
  menolak_akhir: KodeDetektor[];
  dicatat_akhir: KodeDetektor[];
}

export interface HasilKalibrasiCacat {
  ambang_awal: AmbangCacat;
  ambang_akhir: AmbangCacat;
  langkah: LangkahKalibrasi[];
  tayang: { ditandai_awal: number; ditandai_akhir: number; total: number };
  recall: { menolak: number; menyala_termasuk_dicatat: number; total: number; luput: string[] };
  lama_tidak_tertebak: { menolak: number; total: number };
  per_detektor_akhir: Record<string, { tayang: number; recall: number; lama_tidak_tertebak: number }>;
  per_soal: BarisCacat[];
}

/** Kalibrasi + recall atas bank. Murni (terhadap bank). */
export function kalibrasiBank(bank: readonly ButirBank[]): HasilKalibrasiCacat {
  const tayang = bank.filter((b) => b.kelompok === 'tayang');
  const k = kalibrasiAmbang(tayang.map((b) => ({ id: b.id, soal: soalCacatDari(b) })));
  const per_soal: BarisCacat[] = bank.map((b) => {
    const awal = deteksi(soalCacatDari(b), AMBANG_AWAL);
    const akhir = deteksi(soalCacatDari(b), k.ambang);
    return {
      id: b.id,
      kelompok: b.kelompok,
      tertebak_luar: b.tertebak_luar,
      luar: b.luar === null ? null : `${b.luar.tebak.map((t) => `${t.pilihan}/${String(t.yakin)}`).join(' · ')} (${String(b.luar.tebak_benar)}/3 kunci)`,
      kunci: b.omongan.kunci,
      awal,
      akhir,
      menolak_akhir: [...new Set(menolak(akhir).map((x) => x.kode))],
      dicatat_akhir: [...new Set(akhir.filter((x) => x.status === 'dicatat').map((x) => x.kode))],
    };
  });
  const recall = per_soal.filter((x) => x.kelompok === 'lama' && x.tertebak_luar);
  const lain = per_soal.filter((x) => x.kelompok === 'lama' && !x.tertebak_luar);
  const ty = per_soal.filter((x) => x.kelompok === 'tayang');
  const per: Record<string, { tayang: number; recall: number; lama_tidak_tertebak: number }> = {};
  for (const kd of ['D1', 'D2', 'D3', 'D4', 'D5', 'D6', 'D7', 'D8', 'D9']) {
    const n = (xs: BarisCacat[]): number => xs.filter((x) => x.menolak_akhir.includes(kd as KodeDetektor)).length;
    per[kd] = { tayang: n(ty), recall: n(recall), lama_tidak_tertebak: n(lain) };
  }
  return {
    ambang_awal: AMBANG_AWAL,
    ambang_akhir: k.ambang,
    langkah: k.langkah,
    tayang: { ditandai_awal: ty.filter((x) => menolak(x.awal).length > 0).length, ditandai_akhir: ty.filter((x) => x.menolak_akhir.length > 0).length, total: ty.length },
    recall: {
      menolak: recall.filter((x) => x.menolak_akhir.length > 0).length,
      menyala_termasuk_dicatat: recall.filter((x) => x.akhir.length > 0).length,
      total: recall.length,
      luput: recall.filter((x) => x.menolak_akhir.length === 0).map((x) => x.id),
    },
    lama_tidak_tertebak: { menolak: lain.filter((x) => x.menolak_akhir.length > 0).length, total: lain.length },
    per_detektor_akhir: per,
    per_soal,
  };
}

function utama(): number {
  const h = kalibrasiBank(bankUjiUlang());
  mkdirSync(FOLDER_CACAT_M2D11, { recursive: true });
  writeFileSync(`${FOLDER_CACAT_M2D11}/kalibrasi.json`, JSON.stringify(h, null, 2) + '\n', 'utf8');
  for (const l of h.langkah) console.log(`ambang ${JSON.stringify(l.ambang)} → tayang ditandai ${String(l.ditandai.length)}/6 [${l.ditandai.join(', ')}] per detektor ${JSON.stringify(l.per_detektor)}; turun: ${String(l.turun)}`);
  console.log(`ambang akhir ${JSON.stringify(h.ambang_akhir)}`);
  console.log(`tayang ditandai: awal ${String(h.tayang.ditandai_awal)}/6, akhir ${String(h.tayang.ditandai_akhir)}/6`);
  console.log(`recall: ${String(h.recall.menolak)}/${String(h.recall.total)} (menyala termasuk dicatat ${String(h.recall.menyala_termasuk_dicatat)}); luput: ${h.recall.luput.join(', ')}`);
  console.log(`omongan lama tidak tertebak dengan bendera menolak: ${String(h.lama_tidak_tertebak.menolak)}/${String(h.lama_tidak_tertebak.total)}`);
  for (const x of h.per_soal) console.log(`${x.id.padEnd(38)} ${x.kunci} ${x.tertebak_luar ? 'R' : ' '} menolak [${x.menolak_akhir.join(',')}] dicatat [${x.dicatat_akhir.join(',')}]`);
  return 0;
}

if (/(^|[\\/])cacat[\\/]kalibrasi\.ts$/.test(process.argv[1] ?? '')) process.exitCode = utama();
