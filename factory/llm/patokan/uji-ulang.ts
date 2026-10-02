/**
 * `npm run patokan:uji-ulang -- --jalan | --ringkas` — uji ulang soal lama
 * dengan patokan baru (M2d-11 D-3, pra-registrasi §4). Pagu ≤ US$0,80 (tag
 * `m2d11/uji-ulang/`) ditegakkan kode.
 *
 * - `--jalan` (berbayar): urut tayang → recall → sisanya; per soal: detektor
 *   (ambang hasil kalibrasi, gratis), pembaca kartu r0+r2, 24 panggilan
 *   rotasi (serentak dengan pembaca kartu). Mentah ditulis sesudah tiap soal
 *   (`eval/keluaran-m2d11/uji-ulang/mentah.json`); soal yang sudah lengkap
 *   tidak dibayar ulang; berhenti di pagu.
 * - `--ringkas` (tanpa jaringan): putusan inti (syarat 1–3), tabel lama vs
 *   baru, data H2 → `ringkasan.json`.
 */
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { AMBANG_M2D11 } from '../cacat/ambang.ts';
import { deteksi, menolak, type Bendera } from '../cacat/detektor.ts';
import { soalCacatDari } from '../cacat/kalibrasi.ts';
import { MODEL_OPENROUTER } from '../model.ts';
import { chatBerpagu, PaguTercapai } from '../pagu.ts';
import { ubahGalatSaldo } from '../peran-susun.ts';
import { kartuRotasi, tebakRotasi } from '../rotasi/jalan.ts';
import { KONDISI, MODEL_ROTASI, priorHuruf, type JawabanRotasi, type PutusanRotasi } from '../rotasi/rotasi.ts';
import type { PanggilTemplat } from '../templat/penulis.ts';
import { bankUjiUlang, urutUjiUlang, type ButirBank } from './bank-lama.ts';
import { FOLDER_M2D11, PAGU_BAGIAN_M2D11, siapkanM2d11 } from './konfig.ts';

export const FOLDER_UJI_ULANG_M2D11 = `${FOLDER_M2D11}/uji-ulang`;
export const JALUR_MENTAH_UJI_ULANG = `${FOLDER_UJI_ULANG_M2D11}/mentah.json`;

export interface KartuMentah {
  r: number;
  kunci: string;
  pilihan: string | null;
  benar: boolean;
  menunjuk_penentu: boolean;
  bingung: string[];
  alasan: string;
  biaya_usd: number;
}

export interface MentahUjiUlang {
  id: string;
  kelompok: 'tayang' | 'lama';
  asal: string;
  tertebak_luar: boolean;
  luar: string | null;
  kunci: string;
  pemanasan: boolean;
  detektor: Bendera[];
  kartu: { per_rotasi: KartuMentah[]; lulus: boolean } | null;
  rotasi: { jawaban: JawabanRotasi[]; putusan: PutusanRotasi } | null;
  biaya_usd: number;
  galat?: string;
}

export const lengkapUjiUlang = (m: MentahUjiUlang): boolean => m.kartu !== null && m.rotasi !== null && m.galat === undefined;

/* ---------------------------------------------------------------------- */
/* putusan inti + ringkasan (murni)                                        */
/* ---------------------------------------------------------------------- */

export interface PutusanInti {
  s1_kartu: boolean;
  s2_detektor: boolean;
  s3_tebak: PutusanRotasi['putusan'] | 'tidak-disyaratkan';
  lulus: boolean;
}

export function putusanInti(m: MentahUjiUlang): PutusanInti {
  if (!lengkapUjiUlang(m)) throw new Error(`${m.id} tidak lengkap`);
  const s1 = m.kartu?.lulus === true;
  const s2 = menolak(m.detektor).length === 0;
  const s3 = m.pemanasan ? 'tidak-disyaratkan' : (m.rotasi as { putusan: PutusanRotasi }).putusan.putusan;
  return { s1_kartu: s1, s2_detektor: s2, s3_tebak: s3, lulus: s1 && s2 && (s3 === 'lulus' || s3 === 'tidak-disyaratkan') };
}

/** Label perbandingan putusan lama (penguji luar, satu urutan) vs syarat 3 baru (rotasi). Murni. */
export function bandingLamaBaru(m: MentahUjiUlang): string {
  if (m.kelompok === 'tayang') return 'soal tayang (tanpa uji luar tebak buta di bank ini)';
  const p = (m.rotasi as { putusan: PutusanRotasi }).putusan.putusan;
  if (m.tertebak_luar && p === 'lulus') return 'kemungkinan artefak posisi: dulu tertebak luar, kini lulus tebak rotasi';
  if (!m.tertebak_luar && p === 'gagal') return 'kebalikan: dulu tidak tertebak luar, kini gagal tebak rotasi';
  if (m.tertebak_luar && p === 'gagal') return 'sejalan: tertebak dulu dan kini';
  if (!m.tertebak_luar && p === 'lulus') return 'sejalan: tidak tertebak dulu dan kini';
  return `abu-abu/tak terukur kini (${p})`;
}

export interface RingkasModelH2 {
  model: string;
  jawaban: number;
  proporsi_kunci: Record<string, number>;
  laju_isi_kunci_konsisten: Record<string, number>;
  laju_isi_konsisten: Record<string, number>;
  laju_huruf_konsisten: Record<string, number>;
  prior_huruf: Record<string, number>;
  tak_terbaca: number;
}

/** Data H2 per keluarga atas soal lengkap. Murni. */
export function ringkasH2(mentah: readonly MentahUjiUlang[]): RingkasModelH2[] {
  const lengkap = mentah.filter(lengkapUjiUlang);
  const semua = lengkap.flatMap((m) => m.rotasi?.jawaban ?? []);
  const prior = priorHuruf(semua);
  return MODEL_ROTASI.map(({ model }) => {
    const j = semua.filter((x) => x.model === model);
    const per = (f: (k: (typeof KONDISI)[number]) => number): Record<string, number> => Object.fromEntries(KONDISI.map((k) => [k, f(k)]));
    const ringkasSoal = (k: (typeof KONDISI)[number]) => lengkap.map((m) => m.rotasi?.putusan.kondisi[k].per_model.find((p) => p.model === model)).filter((x) => x !== undefined);
    const laju = (k: (typeof KONDISI)[number], f: (p: NonNullable<ReturnType<typeof ringkasSoal>[number]>) => boolean): number => {
      const r = ringkasSoal(k);
      return r.length === 0 ? 0 : r.filter(f).length / r.length;
    };
    return {
      model,
      jawaban: j.length,
      proporsi_kunci: per((k) => {
        const x = j.filter((y) => y.kondisi === k);
        return x.length === 0 ? 0 : x.filter((y) => (y.isi ?? y.isi_kunci) === y.isi_kunci).length / x.length;
      }),
      laju_isi_kunci_konsisten: per((k) => laju(k, (p) => p.isi_kunci_konsisten)),
      laju_isi_konsisten: per((k) => laju(k, (p) => p.isi_konsisten !== null)),
      laju_huruf_konsisten: per((k) => laju(k, (p) => p.huruf_konsisten !== null)),
      prior_huruf: prior[model] ?? { a: 0, b: 0, c: 0, d: 0, tak_terbaca: 0 },
      tak_terbaca: j.filter((y) => !y.terbaca).length,
    };
  });
}

export interface BarisUjiUlang {
  id: string;
  kelompok: 'tayang' | 'lama';
  kunci: string;
  luar: string | null;
  tertebak_luar: boolean;
  detektor: string[];
  kartu: string;
  rotasi_pesan_pilihan: string;
  rotasi_pilihan_saja: string;
  putusan_rotasi: string;
  putusan: PutusanInti;
  banding: string;
}

export function barisUjiUlang(m: MentahUjiUlang): BarisUjiUlang {
  const p = putusanInti(m);
  const r = m.rotasi as { putusan: PutusanRotasi };
  const k = (x: (typeof KONDISI)[number]): string => {
    const c = r.putusan.kondisi[x];
    const abaikan = c.per_model.filter((y) => y.diabaikan).map((y) => y.model.split('/')[1] ?? y.model);
    return `${String(c.kunci)}/${String(c.n)}${abaikan.length > 0 ? ` (diabaikan: ${abaikan.join(', ')})` : ''}`;
  };
  return {
    id: m.id,
    kelompok: m.kelompok,
    kunci: m.kunci,
    luar: m.luar,
    tertebak_luar: m.tertebak_luar,
    detektor: [...new Set(menolak(m.detektor).map((b) => b.kode))],
    kartu: (m.kartu?.per_rotasi ?? []).map((x) => `r${String(x.r)}:${String(x.pilihan)}${x.benar ? '✓' : '✗'}`).join(' '),
    rotasi_pesan_pilihan: k('pesan-pilihan'),
    rotasi_pilihan_saja: k('pilihan-saja'),
    putusan_rotasi: r.putusan.putusan,
    putusan: p,
    banding: bandingLamaBaru(m),
  };
}

export function ringkasUjiUlang(mentah: readonly MentahUjiUlang[]): {
  terukur: number;
  total_bank: number;
  biaya_usd: number;
  lulus_inti: string[];
  baris: BarisUjiUlang[];
  hitung: Record<string, number>;
  h2: RingkasModelH2[];
} {
  const lengkap = mentah.filter(lengkapUjiUlang);
  const baris = lengkap.map(barisUjiUlang);
  const hitung: Record<string, number> = {};
  for (const b of baris) {
    hitung[`rotasi ${b.putusan_rotasi}`] = (hitung[`rotasi ${b.putusan_rotasi}`] ?? 0) + 1;
    hitung[b.banding] = (hitung[b.banding] ?? 0) + 1;
    if (b.putusan.s1_kartu) hitung['syarat 1 (kartu 2/2)'] = (hitung['syarat 1 (kartu 2/2)'] ?? 0) + 1;
    if (b.putusan.s2_detektor) hitung['syarat 2 (nol bendera)'] = (hitung['syarat 2 (nol bendera)'] ?? 0) + 1;
  }
  return {
    terukur: lengkap.length,
    total_bank: mentah.length,
    biaya_usd: mentah.reduce((a, m) => a + m.biaya_usd, 0),
    lulus_inti: baris.filter((b) => b.putusan.lulus).map((b) => b.id),
    baris,
    hitung,
    h2: ringkasH2(mentah),
  };
}

/* ---------------------------------------------------------------------- */
/* jalan (berbayar)                                                        */
/* ---------------------------------------------------------------------- */

export function mentahAwal(b: ButirBank): MentahUjiUlang {
  return {
    id: b.id,
    kelompok: b.kelompok,
    asal: b.asal,
    tertebak_luar: b.tertebak_luar,
    luar: b.luar === null ? null : `${b.luar.tebak.map((t) => `${t.pilihan}/${String(t.yakin)}`).join(' · ')} (${String(b.luar.tebak_benar)}/3 kunci)`,
    kunci: b.omongan.kunci,
    pemanasan: b.id === 'm2d10-pemanasan',
    detektor: deteksi(soalCacatDari(b), AMBANG_M2D11),
    kartu: null,
    rotasi: null,
    biaya_usd: 0,
  };
}

export async function ukurSoal(b: ButirBank, panggil: PanggilTemplat): Promise<MentahUjiUlang> {
  const m = mentahAwal(b);
  const [k, r] = await Promise.allSettled([kartuRotasi(b.omongan, b.paket, { panggil, putaran: 1, omongan: b.no }), tebakRotasi(b.omongan, { panggil, putaran: 1, omongan: b.no })]);
  if (k.status === 'fulfilled') {
    m.kartu = { per_rotasi: k.value.per_rotasi.map(({ putusan: _p, ...x }) => x), lulus: k.value.lulus };
    m.biaya_usd += k.value.per_rotasi.reduce((a, x) => a + x.biaya_usd, 0);
  }
  if (r.status === 'fulfilled') {
    m.rotasi = { jawaban: r.value.jawaban, putusan: r.value.putusan };
    m.biaya_usd += r.value.biaya_usd;
  }
  const gagal = [k, r].find((x): x is PromiseRejectedResult => x.status === 'rejected');
  if (gagal !== undefined) {
    const g = gagal.reason as unknown;
    m.galat = g instanceof Error ? `${g.name}: ${g.message}`.slice(0, 300) : 'galat';
    if (g instanceof PaguTercapai) throw Object.assign(g, { mentah: m });
  }
  return m;
}

function baca(): MentahUjiUlang[] {
  return existsSync(JALUR_MENTAH_UJI_ULANG) ? (JSON.parse(readFileSync(JALUR_MENTAH_UJI_ULANG, 'utf8')) as { hasil: MentahUjiUlang[] }).hasil : [];
}

async function jalankan(): Promise<number> {
  const { klien, biaya } = siapkanM2d11();
  mkdirSync(FOLDER_UJI_ULANG_M2D11, { recursive: true });
  const awalan = PAGU_BAGIAN_M2D11.ujiUlang.awalanTag;
  const lama = baca();
  const hasil: MentahUjiUlang[] = lama.filter(lengkapUjiUlang);
  const simpan = (selesai: boolean): void =>
    writeFileSync(JALUR_MENTAH_UJI_ULANG, JSON.stringify({ selesai, pagu_usd: PAGU_BAGIAN_M2D11.ujiUlang.usd, biaya_tag_usd: biaya.totalAwalan(awalan), ambang_detektor: AMBANG_M2D11, hasil }, null, 2) + '\n', 'utf8');
  const buatPanggil = (id: string): PanggilTemplat => async (pesan, setelan, info) => {
    if (!(MODEL_OPENROUTER as readonly string[]).includes(info.model)) throw new Error(`Model ${info.model} tidak diizinkan M2d-11.`);
    const tag = `${awalan}${id}/${info.jenis}/t${String(info.ke)}${info.ulang !== undefined && info.ulang > 0 ? `/u${String(info.ulang)}` : ''}`;
    try {
      return await chatBerpagu(
        klien,
        biaya,
        { model: info.model, pesan, suhu: setelan.suhu, maxTokens: setelan.maxTokens, tambahanBadan: setelan.tambahanBadan, ...(setelan.abaikanPenyedia === undefined ? {} : { abaikanPenyedia: setelan.abaikanPenyedia }) },
        tag,
        setelan.ambangPenalaran === undefined ? {} : { ambangPenalaran: setelan.ambangPenalaran },
      );
    } catch (galat) {
      throw ubahGalatSaldo(galat, info.model);
    }
  };
  for (const b of urutUjiUlang(bankUjiUlang())) {
    if (hasil.some((m) => m.id === b.id)) continue;
    try {
      const m = await ukurSoal(b, buatPanggil(b.id));
      hasil.push(m);
      const p = lengkapUjiUlang(m) ? putusanInti(m) : null;
      if (p === null) {
        // Galat bukan pagu (mis. penyedia menolak setelan): berhenti, jangan bayar soal berikutnya.
        console.error(`${b.id}: GALAT ${m.galat ?? ''}; berhenti.`);
        simpan(false);
        return 1;
      }
      console.log(
        `${new Date().toISOString().slice(11, 19)} ${b.id.padEnd(38)} kunci ${m.kunci} luar ${m.tertebak_luar ? 'TERTEBAK' : '-'} | kartu ${m.kartu?.per_rotasi.map((x) => `${String(x.pilihan)}${x.benar ? '✓' : '✗'}`).join(' ') ?? '-'} | rotasi ${m.rotasi?.putusan.putusan ?? '-'} ${m.rotasi?.putusan.alasan[0] ?? ''} | detektor [${[...new Set(menolak(m.detektor).map((x) => x.kode))].join(',')}] | inti ${p === null ? `GALAT ${m.galat ?? ''}` : p.lulus ? 'LULUS' : 'tidak'} | US$${m.biaya_usd.toFixed(4)} (bagian US$${biaya.totalAwalan(awalan).toFixed(4)})`,
      );
    } catch (galat) {
      const m = (galat as { mentah?: MentahUjiUlang }).mentah;
      if (m !== undefined) hasil.push(m);
      console.error(`${b.id}: ${galat instanceof Error ? `${galat.name}: ${galat.message}` : 'galat'}`);
      simpan(false);
      return galat instanceof PaguTercapai ? (galat.name === 'SaldoPenyediaHabis' ? 4 : 2) : 1;
    }
    simpan(false);
  }
  simpan(true);
  console.log(`Uji ulang selesai: US$${biaya.totalAwalan(awalan).toFixed(6)} dari US$${PAGU_BAGIAN_M2D11.ujiUlang.usd.toFixed(2)}.`);
  return 0;
}

function ringkas(): number {
  const r = ringkasUjiUlang(baca());
  writeFileSync(`${FOLDER_UJI_ULANG_M2D11}/ringkasan.json`, JSON.stringify(r, null, 2) + '\n', 'utf8');
  for (const b of r.baris) console.log(`${b.id.padEnd(38)} ${b.kunci} luar ${(b.luar ?? '-').padEnd(32)} | det [${b.detektor.join(',')}] | kartu ${b.kartu} | pp ${b.rotasi_pesan_pilihan} | ps ${b.rotasi_pilihan_saja} | ${b.putusan_rotasi} | inti ${b.putusan.lulus ? 'LULUS' : 'tidak'} | ${b.banding}`);
  console.log(JSON.stringify(r.hitung));
  console.log(`terukur ${String(r.terukur)}/${String(r.total_bank)}; lulus inti: ${r.lulus_inti.join(', ')}; biaya US$${r.biaya_usd.toFixed(4)}`);
  for (const h of r.h2) console.log(JSON.stringify(h));
  return 0;
}

if (/(^|[\\/])patokan[\\/]uji-ulang\.ts$/.test(process.argv[1] ?? '')) {
  const a = process.argv.slice(2);
  const kerja = a.includes('--jalan') ? jalankan() : a.includes('--ringkas') ? Promise.resolve(ringkas()) : Promise.resolve((console.error('Pakai: npm run patokan:uji-ulang -- --jalan | --ringkas'), 1));
  kerja.then(
    (k) => {
      process.exitCode = k;
    },
    (g: unknown) => {
      console.error(g instanceof Error ? `${g.name}: ${g.message}` : 'galat tak dikenal');
      process.exitCode = 1;
    },
  );
}
