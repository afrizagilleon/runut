/**
 * `npm run templat:pemanasan` — SATU soal pemanasan (mode dipandu) dari paket
 * TIRT dengan mesin templat (kontrak M2d-10 D-7a, pra-registrasi §5). Pagu
 * US$0,25 (tag `m2d10/pemanasan/`) ditegakkan kode.
 *
 * - Rencana = pola soal pertama tayang yang berlaku lebih dulu (`sebab-resmi`,
 *   lalu `angka-lain-waktu`), 2 kartu, kartu 1 penentu, pilihan dari templat.
 * - Penulis kata DeepSeek (pesan + penjelasan); penyempurna Haiku bila
 *   penolakan di pilihan.
 * - Gerbang yang menolak: struktur templat + tulisan templat, lalu gerbang
 *   pemanasan M2d-8 (`periksaPemanasan`: validator per soal, G-penilaian,
 *   G-pilihan-kembar, anti-bocor DADA/ULTJ, pembaca kartu 3/3 + menunjuk
 *   kartu 1, kritikus makna `kunci`/`makna`). Tebak buta TIDAK disyaratkan.
 * - Paling banyak 4 percobaan. Keluaran `eval/keluaran-m2d10/pemanasan/`;
 *   TIDAK dipasang ke produk.
 */
import { existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { bacaBank, nadaUntuk, pilihContoh, URUT_NADA_V2 } from '../bank-gaya.ts';
import type { OmonganDraf } from '../draf.ts';
import { gPenilaian } from '../gerbang-penilaian.ts';
import { HURUF_KUNCI_PEMANASAN, keSoal, periksaPemanasan, type PutusanPemanasan, type SoalPemanasan } from '../kalibrasi-pemanasan.ts';
import { MODEL_OPENROUTER, MODEL_OR_DEEPSEEK } from '../model.ts';
import { chatBerpagu, PaguTercapai } from '../pagu.ts';
import { DEFINISI_PAKET, bangunPaket, type PaketFakta } from '../paket.ts';
import { ubahGalatSaldo } from '../peran-susun.ts';
import { buktiKunciTunggal } from './bukti.ts';
import { lewatTemplat, SETELAN_PENULIS } from './gerbang.ts';
import { FOLDER_M2D10, PAGU_BAGIAN_M2D10, siapkanM2d10 } from './konfig.ts';
import {
  pesanTulisPenjelasanTemplat,
  pesanTulisPesanTemplat,
  periksaTulisanPenjelasan,
  periksaTulisanPesan,
  tulisBercadangan,
  uraiPenjelasan,
  uraiTulisanPesan,
  type PanggilTemplat,
} from './penulis.ts';
import { MODEL_PENYEMPURNA, pesanPenyempurna, SETELAN_PENYEMPURNA, uraiPenyempurna, verifikasiPerbaikan, type JenisKegagalan } from './penyempurna.ts';
import { pilihRencanaPemanasan } from './pilih.ts';
import type { RencanaSoal } from './pola.ts';
import { pilihanBawaan, rakitOmonganTemplat, type PilihanAktif, type TulisanPesan } from './rakit.ts';

export const FOLDER_PEMANASAN_M2D10 = `${FOLDER_M2D10}/pemanasan`;
export const MAKS_PERCOBAAN_M2D10 = 4;
export const MAKS_PENYEMPURNAAN_PEMANASAN = 2;

export interface PercobaanPemanasanTemplat {
  ke: number;
  tulisan: TulisanPesan | null;
  penjelasan: string | null;
  varian: Record<string, string>;
  omongan: OmonganDraf | null;
  menolak: string[];
  dicatat: string[];
  putusan: PutusanPemanasan | null;
  penyempurnaan: { jenis: JenisKegagalan; diterima: string[]; dibuang: string[] } | null;
}

export interface HasilPemanasanTemplat {
  lolos: boolean;
  soal: SoalPemanasan | null;
  rencana: string;
  percobaan: PercobaanPemanasanTemplat[];
  berhenti: string | null;
}

/** Lokasi penolakan gerbang pemanasan: pilihan (penyempurna) atau pesan/penjelasan (penulis). */
export function lokasiPenolakan(teks: string): 'pilihan' | 'pesan' | 'penjelasan' {
  if (/^\[pembaca kartu|G-pilihan-kembar|Pilihan [a-d]|OPSI_|pilihan [a-d]|kunci/i.test(teks)) return 'pilihan';
  if (/penjelasan|Penjelasan|PENJELASAN|RUJUKAN/.test(teks)) return 'penjelasan';
  return 'pesan';
}

export async function jalankanPemanasanTemplat(paket: PaketFakta, panggil: PanggilTemplat): Promise<HasilPemanasanTemplat> {
  const r = pilihRencanaPemanasan(paket) as RencanaSoal | null;
  if (r === null) return { lolos: false, soal: null, rencana: '-', percobaan: [], berhenti: 'tidak ada pola soal pertama yang berlaku untuk paket ini' };
  const bank = bacaBank(2).filter((k) => !gPenilaian(k.teks).tolak);
  let pilihan: PilihanAktif = pilihanBawaan(r);
  let tulisan: TulisanPesan | null = null;
  let penjelasan: string | null = null;
  let umpanPesan: string[] = [];
  let umpanPenjelasan: string[] = [];
  let penyempurnaan = 0;
  const percobaan: PercobaanPemanasanTemplat[] = [];
  const gerbangLama = lewatTemplat(panggil);
  for (let ke = 1; ke <= MAKS_PERCOBAAN_M2D10; ke++) {
    const c: PercobaanPemanasanTemplat = { ke, tulisan: null, penjelasan: null, varian: {}, omongan: null, menolak: [], dicatat: [], putusan: null, penyempurnaan: null };
    percobaan.push(c);
    try {
      if (tulisan === null) {
        const nada = nadaUntuk(1, ke, URUT_NADA_V2);
        const pesan = pesanTulisPesanTemplat({ paket, r, no: 1, namaLain: [], gaya: { nada, contoh: pilihContoh({ topik: [r.topik], nada, paket_id: paket.paket_id }, bank) }, umpan: umpanPesan });
        tulisan = await tulisBercadangan(panggil, pesan, SETELAN_PENULIS.pesan, { jenis: 'tulis-pesan', putaran: ke, omongan: 1, ke: 1, peran: 'penulis', model: MODEL_OR_DEEPSEEK }, uraiTulisanPesan, () => undefined);
        penjelasan = null;
        if (tulisan === null) {
          c.menolak.push('keluaran penulis pesan tak terbaca dua kali');
          continue;
        }
      }
      if (penjelasan === null) {
        const { penjelasan: _p, ...inti } = rakitOmonganTemplat(r, pilihan, tulisan, '', HURUF_KUNCI_PEMANASAN);
        void _p;
        const pesan = pesanTulisPenjelasanTemplat({ paket, r, o: inti, umpan: umpanPenjelasan });
        penjelasan = await tulisBercadangan(panggil, pesan, SETELAN_PENULIS.penjelasan, { jenis: 'tulis-penjelasan', putaran: ke, omongan: 1, ke: 1, peran: 'penulis', model: MODEL_OR_DEEPSEEK }, uraiPenjelasan, () => undefined);
        if (penjelasan === null) {
          c.menolak.push('keluaran penulis penjelasan tak terbaca dua kali');
          continue;
        }
      }
      c.tulisan = tulisan;
      c.penjelasan = penjelasan;
      c.varian = Object.fromEntries(Object.entries(pilihan).map(([s, v]) => [s, v.id]));
      const o = rakitOmonganTemplat(r, pilihan, tulisan, penjelasan, HURUF_KUNCI_PEMANASAN);
      c.omongan = o;
      // 1. struktur + tulisan templat (gratis)
      const kode = [
        ...buktiKunciTunggal(r, paket, pilihan).masalah.map((m) => `[templat: kunci tunggal] ${m}`),
        ...periksaTulisanPesan(tulisan, r, []).map((m) => `[templat: pesan] ${m}`),
        ...periksaTulisanPenjelasan(penjelasan, r).map((m) => `[templat: penjelasan] ${m}`),
      ];
      c.menolak.push(...kode);
      // 2. gerbang pemanasan M2d-8 (kode dulu, lalu pembaca kartu 3/3, lalu kritikus)
      if (kode.length === 0) {
        const p = await periksaPemanasan(o, paket, gerbangLama, ke);
        c.putusan = p;
        c.menolak.push(...p.menolak);
        c.dicatat.push(...p.dicatat);
        if (p.lolos) return { lolos: true, soal: keSoal(o), rencana: `${r.pola}:${r.sudut}`, percobaan, berhenti: null };
      }
      // umpan balik per lokasi
      const pilihanSalah = c.menolak.filter((m) => lokasiPenolakan(m) === 'pilihan');
      const pesanSalah = c.menolak.filter((m) => lokasiPenolakan(m) === 'pesan');
      const penjelasanSalah = c.menolak.filter((m) => lokasiPenolakan(m) === 'penjelasan');
      if (pesanSalah.length > 0) {
        umpanPesan = pesanSalah;
        tulisan = null;
      }
      if (penjelasanSalah.length > 0) {
        umpanPenjelasan = penjelasanSalah;
        penjelasan = null;
      }
      if (pilihanSalah.length > 0 && penyempurnaan < MAKS_PENYEMPURNAAN_PEMANASAN) {
        penyempurnaan += 1;
        const jenis: JenisKegagalan = pilihanSalah.some((m) => m.startsWith('[pembaca kartu')) ? 'pembaca-kartu' : pilihanSalah.some((m) => m.startsWith('[kritikus')) ? 'kritikus' : 'kode';
        const j = await panggil(pesanPenyempurna({ paket, r, pilihan, jenis, alasan: pilihanSalah }), { ...SETELAN_PENYEMPURNA }, { jenis: 'sempurnakan-pilihan', putaran: ke, omongan: 1, ke: 1, peran: 'penyempurna', model: MODEL_PENYEMPURNA });
        const u = uraiPenyempurna(j.teks);
        const v = u === null ? null : verifikasiPerbaikan(r, paket, pilihan, u.pilihan);
        c.penyempurnaan = { jenis, diterima: v?.diterima.map((x) => `${x.slot} → ${x.varian}: ${x.ke}`) ?? [], dibuang: v?.dibuang.map((x) => `${x.slot}: ${x.alasan}`) ?? ['keluaran tak terbaca'] };
        if (v !== null && v.diterima.length > 0) {
          pilihan = v.pilihan;
          penjelasan = null;
        }
      }
    } catch (galat) {
      if (galat instanceof PaguTercapai) return { lolos: false, soal: null, rencana: `${r.pola}:${r.sudut}`, percobaan, berhenti: `pagu tercapai: ${galat.message}` };
      c.menolak.push(galat instanceof Error ? `${galat.name}: ${galat.message}` : 'galat');
    }
  }
  return { lolos: false, soal: null, rencana: `${r.pola}:${r.sudut}`, percobaan, berhenti: `${String(MAKS_PERCOBAAN_M2D10)} percobaan tanpa soal yang lolos semua gerbang` };
}

async function utama(): Promise<number> {
  if (existsSync(`${FOLDER_PEMANASAN_M2D10}/jejak.json`)) {
    console.error(`${FOLDER_PEMANASAN_M2D10}/jejak.json sudah ada; pemanasan yang sudah dibayar tidak diulang.`);
    return 1;
  }
  const { klien, biaya } = siapkanM2d10();
  mkdirSync(FOLDER_PEMANASAN_M2D10, { recursive: true });
  const paket = bangunPaket(DEFINISI_PAKET.tirt);
  const awalan = PAGU_BAGIAN_M2D10.pemanasan.awalanTag;
  const panggil: PanggilTemplat = async (pesan, setelan, info) => {
    if (!(MODEL_OPENROUTER as readonly string[]).includes(info.model)) throw new Error(`Model ${info.model} tidak diizinkan M2d-10.`);
    const tag = `${awalan}c${String(info.putaran)}/${info.jenis}/t${String(info.ke)}${info.ulang !== undefined && info.ulang > 0 ? `/u${String(info.ulang)}` : ''}`;
    let j;
    try {
      j = await chatBerpagu(
        klien, biaya,
        { model: info.model, pesan, suhu: setelan.suhu, maxTokens: setelan.maxTokens, tambahanBadan: setelan.tambahanBadan, ...(setelan.abaikanPenyedia === undefined ? {} : { abaikanPenyedia: setelan.abaikanPenyedia }) },
        tag,
        setelan.ambangPenalaran === undefined ? {} : { ambangPenalaran: setelan.ambangPenalaran },
      );
    } catch (galat) {
      throw ubahGalatSaldo(galat, info.model);
    }
    console.log(`  ${new Date().toISOString().slice(11, 19)} ${tag} ${info.model}: ${String(j.penyedia)} ${String(j.finish_reason)} penalaran ${String(j.token_penalaran)} US$${j.biaya_usd.toFixed(6)}; pemanasan US$${biaya.totalAwalan(awalan).toFixed(4)}`);
    return j;
  };
  const h = await jalankanPemanasanTemplat(paket, panggil);
  const tulis = (nama: string, isi: unknown): void => writeFileSync(`${FOLDER_PEMANASAN_M2D10}/${nama}`, JSON.stringify(isi, null, 2) + '\n', 'utf8');
  tulis('jejak.json', { paket_id: paket.paket_id, rencana: h.rencana, huruf_kunci: HURUF_KUNCI_PEMANASAN, lolos: h.lolos, berhenti: h.berhenti, biaya_usd: biaya.totalAwalan(awalan), percobaan: h.percobaan });
  if (h.soal !== null) {
    tulis('soal.json', h.soal);
    tulis('fakta.json', h.soal.kartu.map((id) => paket.fakta.find((f) => f.fact_id === id)));
  }
  for (const c of h.percobaan) console.log(`percobaan ${String(c.ke)}: ${c.menolak.length === 0 && c.putusan?.lolos === true ? 'LOLOS' : `ditolak (${c.menolak.join(' | ').slice(0, 500)})`}${c.penyempurnaan === null ? '' : ` · penyempurna: ${c.penyempurnaan.diterima.length} diterima, ${c.penyempurnaan.dibuang.length} dibuang`}`);
  console.log(`${h.lolos ? 'SOAL PEMANASAN LOLOS' : `TIDAK ADA SOAL (${String(h.berhenti)})`}; US$${biaya.totalAwalan(awalan).toFixed(6)}.`);
  return h.lolos ? 0 : 2;
}

if (process.argv[1]?.replace(/\\/g, '/').endsWith('/templat/pemanasan.ts') === true) {
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
