/**
 * Mesin penulis v3 (M2d-16 D-3, D-5, D-6) — BERDAMPINGAN dengan `mesin.ts`
 * (M2d-13/15), yang tidak diubah. Belum pernah dijalankan berbayar; diuji
 * dengan pemanggil palsu.
 *
 * Alur satu jalan:
 * 1. Baca bank omongan paket ini. Yang kurang = 3 − jumlah sudut (kartu
 *    penentu berbeda) di bank. Tidak kurang → tidak ada panggilan model.
 * 2. Penulis Opus (prompt v3, SATU pesan pengguna) menulis hanya yang kurang.
 *    Putaran berikutnya: bila ada omongan yang ditolak, tulis ulang TANPA
 *    keadaan (prompt yang sama + draf sebelumnya + alasan gerbang apa adanya).
 * 3. Tiap omongan dinilai SENDIRI lewat urutan gerbang baru; berhenti di
 *    gerbang pertama yang menolak:
 *      kode (gratis) → saringan murah v2 (tebak rotasi, binomial) → pembaca
 *      kartu r0+r2 → penebak kuat Opus satu-soal → kritikus GLM.
 * 4. Yang lolos semua gerbang disimpan di bank (juga bila kartu penentunya
 *    sudah ada — alternatif untuk sudut itu).
 * 5. Sesudah paling banyak `MAKS_PUTARAN_V3` putaran: penyusun simulasi
 *    memilih 3 omongan berkartu-penentu berbeda dari bank + validator seluruh
 *    draf.
 *
 * Penjaga uang: panggilan penulis tanpa satu pun omongan terurai (termasuk
 * berhenti di max_tokens) menghentikan jalan seketika — tidak ada ulangan
 * buta. "Tak-terukur" (penebak tak terbaca > 1/3) bukan penolakan: omongan
 * itu tidak masuk bank dan tidak dikirim balik ke penulis.
 */
import type { DrafSimulasi } from '../draf.ts';
import type { PutusanKritik } from '../kritikus.ts';
import { umpanKritik } from '../kritikus.ts';
import { MODEL_OR_OPUS } from '../model.ts';
import { PaguTercapai } from '../pagu.ts';
import type { PaketFakta } from '../paket.ts';
import { SETELAN_PENULIS_OPUS_V3 } from '../pemanggil-v2.ts';
import { kartuRotasi, type KartuRotasi } from '../rotasi/jalan.ts';
import { tebakRotasiV2, type HasilTebakRotasiV2 } from '../rotasi/jalan-v2.ts';
import { tebakKuat, type HasilTebakKuat } from '../rotasi/penebak-kuat.ts';
import type { SetelanPanggil } from '../susun.ts';
import { kritikusMakna, kritikusMenolakTemplat } from '../templat/gerbang.ts';
import { SETELAN_TEMPLAT_M2D11 } from '../templat/m2d11.ts';
import type { PanggilTemplat } from '../templat/penulis.ts';
import { bacaBank, idOmongan, jumlahSudut, pilihSimulasi, shaPaketBank, simpanBank, sudutBank, UKURAN_SIMULASI, type PilihanSimulasi } from './bank.ts';
import { periksaKodeV3, pesanTulisUlangV3, pesanV3, sha256V3, uraiKeluaranV3, type DitolakV3 } from './prompt-v3.ts';
import { drafDari, type OmonganBebas } from './skema.ts';

export const MAKS_PUTARAN_V3 = 3;
/** Urutan gerbang baru (kontrak M2d-16 D-3). */
export const URUTAN_GERBANG_V3 = ['kode', 'saringan', 'kartu', 'penebak-kuat', 'kritikus'] as const;
export type GerbangV3 = (typeof URUTAN_GERBANG_V3)[number];
export type BerhentiV3 = GerbangV3 | 'lolos' | 'tak-terukur';

export interface PanggilanPenulisV3 {
  putaran: number;
  jenis: 'tulis' | 'tulis-ulang';
  /** {JUMLAH} yang diminta. */
  diminta: number;
  terbaca: number;
  masalah: string[];
  model: string;
  penyedia: string | null;
  token_masuk: number;
  token_keluar: number;
  token_penalaran: number | null;
  finish_reason: string | null;
  biaya_usd: number;
  ada_teks_berpikir: boolean;
  sha256_prompt: string;
}

export interface NilaiOmonganV3 {
  putaran: number;
  /** Urutan di keluaran penulis putaran itu (1, 2, …). */
  urut: number;
  omongan: OmonganBebas;
  berhenti: BerhentiV3;
  /** Alasan gerbang yang menolak, apa adanya (inilah yang dikirim ke penulis). */
  alasan: string[];
  dicatat: string[];
  saringan: HasilTebakRotasiV2 | null;
  kartu_rotasi: { per_rotasi: Array<Omit<KartuRotasi, 'putusan'>>; lulus: boolean } | null;
  penebak_kuat: HasilTebakKuat | null;
  kritik: (Pick<PutusanKritik, 'menjawab' | 'tanpa_keberatan' | 'keberatan' | 'arahan'> & { token_penalaran: Array<number | null> }) | null;
  biaya_gerbang_usd: number;
  /** Id di bank bila lolos. */
  id_bank: string | null;
}

export interface HasilV3 {
  id_jalan: string;
  penulis: string;
  paket_sha: string;
  setelan_penulis: SetelanPanggil;
  urutan_gerbang: readonly GerbangV3[];
  putaran: number;
  panggilan_penulis: PanggilanPenulisV3[];
  nilai: NilaiOmonganV3[];
  /** Id omongan yang masuk bank di jalan ini. */
  bank_baru: string[];
  tak_terukur: number;
  simulasi: PilihanSimulasi;
  terbit: boolean;
  draf: DrafSimulasi | null;
  berhenti: string | null;
  tersensor: boolean;
  biaya_usd: number;
}

export interface OpsiV3 {
  paket: PaketFakta;
  panggil: PanggilTemplat;
  /** Folder akar bank (mis. `<akar>/eval/bank-omongan`). */
  folderBank: string;
  idJalan: string;
  jam?: () => Date;
  maksPutaran?: number;
  /** Label penulis di hasil & asal bank (bawaan = model penulis); mode palsu menandai dirinya di sini. */
  labelPenulis?: string;
}

/** Jalan dihentikan penjaga (panggilan penulis tanpa keluaran terpakai). */
export class HentiPenjagaV3 extends Error {
  constructor(pesan: string) {
    super(pesan);
    this.name = 'HentiPenjagaV3';
  }
}

const jumlah = <T>(x: readonly T[], f: (y: T) => number): number => x.reduce((a, y) => a + f(y), 0);
const teksGalat = (g: unknown): string => (g instanceof Error ? `${g.name}: ${g.message}` : 'galat tak dikenal');

/** Nilai SATU omongan lewat urutan gerbang v3; berhenti di gerbang pertama yang menolak. `catat` dipanggil lebih dulu supaya nilai tersimpan walau gerbang melempar (pagu). */
export async function nilaiOmonganV3(o: OmonganBebas, paket: PaketFakta, panggil: PanggilTemplat, putaran: number, urut: number, catat: (n: NilaiOmonganV3) => void = () => undefined, periksaKode: typeof periksaKodeV3 = periksaKodeV3): Promise<NilaiOmonganV3> {
  const n: NilaiOmonganV3 = { putaran, urut, omongan: o, berhenti: 'kode', alasan: [], dicatat: [], saringan: null, kartu_rotasi: null, penebak_kuat: null, kritik: null, biaya_gerbang_usd: 0, id_bank: null };
  catat(n);
  // 1. kode (gratis)
  const kode = periksaKode(o, paket);
  n.dicatat.push(...kode.dicatat.map((m) => `${m.sumber} (dicatat): ${m.alasan}`));
  if (kode.menolak.length > 0) {
    n.alasan = kode.menolak.map((m) => `${m.sumber}: ${m.alasan}`);
    return n;
  }
  const d = drafDari(o);
  // 2. saringan murah v2
  n.berhenti = 'saringan';
  const s = await tebakRotasiV2(d, { panggil, putaran, omongan: urut });
  n.saringan = s;
  n.biaya_gerbang_usd += s.biaya_usd;
  n.dicatat.push(s.putusan.diagnosis);
  if (s.putusan.putusan === 'tak-terukur') {
    n.berhenti = 'tak-terukur';
    n.alasan = [`saringan tebak: ${s.putusan.alasan.join('; ')}`];
    return n;
  }
  if (s.putusan.putusan === 'tolak') {
    n.alasan = [`saringan tebak: ${s.putusan.alasan.join('; ')} — jawabannya bisa ditebak tanpa membaca kartu`];
    return n;
  }
  // 3. pembaca kartu r0 + r2
  n.berhenti = 'kartu';
  const k = await kartuRotasi(d, paket, { panggil, putaran, omongan: urut });
  n.kartu_rotasi = { per_rotasi: k.per_rotasi.map(({ putusan: _p, ...x }) => x), lulus: k.lulus };
  n.biaya_gerbang_usd += jumlah(k.per_rotasi, (x) => x.biaya_usd);
  for (const x of k.per_rotasi) if (x.bingung.length > 0) n.dicatat.push(`pembaca kartu r${String(x.r)} bingung: ${x.bingung.map((b) => `"${b}"`).join('; ')}`);
  if (!k.lulus) {
    n.alasan = [`pembaca yang memegang kartu tidak memilih kunci di kedua rotasi (pilihan diputar): ${k.per_rotasi.map((x) => `r${String(x.r)}: memilih ${String(x.pilihan)} (kunci ${x.kunci})${x.benar ? '' : ` — ${x.alasan}`}`).join('; ')}`];
    return n;
  }
  // 4. penebak kuat Opus satu-soal
  n.berhenti = 'penebak-kuat';
  const q = await tebakKuat(d, { panggil, putaran, omongan: urut });
  n.penebak_kuat = q;
  n.biaya_gerbang_usd += q.biaya_usd;
  if (q.putusan.putusan === 'tak-terukur') {
    n.berhenti = 'tak-terukur';
    n.alasan = [q.putusan.alasan];
    return n;
  }
  if (q.putusan.putusan === 'tolak') {
    n.alasan = [q.putusan.alasan];
    return n;
  }
  if (q.putusan.isi_konsisten !== null) n.dicatat.push(`penebak kuat konsisten memilih pengecoh (opsi asal ${'abcd'[q.putusan.isi_konsisten] ?? '?'}) di ≥ 3 rotasi`);
  // 5. kritikus GLM (tidak menjawab → sekali lagi)
  n.berhenti = 'kritikus';
  const kartu0 = k.per_rotasi[0]?.putusan ?? null;
  let kr = await kritikusMakna(d, paket, kartu0, panggil, putaran, urut, true);
  if (!kr.menjawab) {
    n.dicatat.push(`kritikus tidak menjawab (${kr.keberatan[0]?.alasan ?? '-'}); diperiksa sekali lagi`);
    const ulang = await kritikusMakna(d, paket, kartu0, panggil, putaran, urut, true);
    kr = { ...ulang, panggilan: [...kr.panggilan, ...ulang.panggilan] };
  }
  n.biaya_gerbang_usd += jumlah(kr.panggilan, (x) => x.biaya_usd);
  n.kritik = { menjawab: kr.menjawab, tanpa_keberatan: kr.tanpa_keberatan, keberatan: kr.keberatan, arahan: kr.arahan, token_penalaran: kr.panggilan.map((x) => x.token_penalaran ?? null) };
  const tolak = kritikusMenolakTemplat(kr, SETELAN_TEMPLAT_M2D11.kritikus);
  if (tolak) {
    n.alasan = kr.menjawab ? umpanKritik(kr) : ['kritikus tidak menjawab (dua kali)'];
    return n;
  }
  if (!kr.tanpa_keberatan) n.dicatat.push(...umpanKritik(kr).map((a) => `kritikus (dicatat): ${a}`));
  n.berhenti = 'lolos';
  return n;
}

const DITOLAK: readonly BerhentiV3[] = URUTAN_GERBANG_V3;

export async function jalankanV3(opsi: OpsiV3): Promise<HasilV3> {
  const { paket, panggil, folderBank, idJalan } = opsi;
  const jam = opsi.jam ?? (() => new Date());
  const maks = Math.max(1, Math.min(MAKS_PUTARAN_V3, opsi.maksPutaran ?? MAKS_PUTARAN_V3));
  const sha = shaPaketBank(paket);
  const hasil: HasilV3 = {
    id_jalan: idJalan, penulis: opsi.labelPenulis ?? MODEL_OR_OPUS, paket_sha: sha, setelan_penulis: SETELAN_PENULIS_OPUS_V3, urutan_gerbang: URUTAN_GERBANG_V3, putaran: 0, panggilan_penulis: [], nilai: [], bank_baru: [], tak_terukur: 0,
    simulasi: { draf: null, dipilih: [], dicoba: 0, alasan: [] }, terbit: false, draf: null, berhenti: null, tersensor: false, biaya_usd: 0,
  };
  let ditolak: DitolakV3[] = [];
  try {
    for (let p = 1; p <= maks; p++) {
      const bank = bacaBank(folderBank, sha);
      const kurang = UKURAN_SIMULASI - jumlahSudut(bank);
      if (kurang <= 0) break;
      hasil.putaran = p;
      const sudut = sudutBank(bank);
      const ulang = ditolak.slice(0, kurang);
      const diminta = ulang.length > 0 ? ulang.length : kurang;
      const pesan = ulang.length > 0 ? pesanTulisUlangV3(paket, sudut, ulang) : pesanV3(paket, kurang, sudut);
      const j = await panggil(pesan, SETELAN_PENULIS_OPUS_V3, { jenis: 'tulis-bebas', putaran: p, omongan: null, ke: 1, peran: 'penulis', model: MODEL_OR_OPUS });
      hasil.biaya_usd += j.biaya_usd;
      const u = uraiKeluaranV3(j.teks, diminta);
      hasil.panggilan_penulis.push({
        putaran: p, jenis: ulang.length > 0 ? 'tulis-ulang' : 'tulis', diminta, terbaca: u.omongan.length, masalah: u.masalah, model: MODEL_OR_OPUS, penyedia: j.penyedia ?? null,
        token_masuk: j.token_masuk, token_keluar: j.token_keluar, token_penalaran: j.token_penalaran ?? null, finish_reason: j.finish_reason, biaya_usd: j.biaya_usd,
        ada_teks_berpikir: typeof j.penalaran === 'string' && j.penalaran.trim() !== '', sha256_prompt: sha256V3(pesan.map((x) => x.content).join('\n')),
      });
      if (u.omongan.length === 0) {
        throw new HentiPenjagaV3(j.finish_reason === 'length' ? 'panggilan penulis berhenti di max_tokens tanpa JSON terurai' : `panggilan penulis tanpa omongan terurai (finish ${String(j.finish_reason)}; ${u.masalah.join('; ').slice(0, 200)})`);
      }
      ditolak = [];
      for (const [i, o] of u.omongan.entries()) {
        const n = await nilaiOmonganV3(o, paket, panggil, p, i + 1, (x) => hasil.nilai.push(x));
        if (n.berhenti === 'lolos') {
          const id = idOmongan(o);
          simpanBank(folderBank, {
            id, paket_sha: sha, kartu_penentu: [...o.kartu_penentu], omongan: o,
            jejak_gerbang: { kode: { dicatat: n.dicatat }, saringan: n.saringan, kartu: n.kartu_rotasi, penebak_kuat: n.penebak_kuat, kritikus: n.kritik },
            asal: { jalan: idJalan, putaran: p, urut: i + 1, penulis: opsi.labelPenulis ?? MODEL_OR_OPUS, sha256_prompt: hasil.panggilan_penulis.at(-1)?.sha256_prompt ?? '' },
            waktu: jam().toISOString(),
          });
          n.id_bank = id;
          hasil.bank_baru.push(id);
        } else if (DITOLAK.includes(n.berhenti)) ditolak.push({ omongan: o, alasan: n.alasan });
      }
    }
  } catch (galat) {
    if (galat instanceof HentiPenjagaV3) hasil.berhenti = `penjaga: ${galat.message}; jalan dihentikan tanpa ulangan`;
    else if (galat instanceof PaguTercapai) {
      hasil.tersensor = true;
      hasil.berhenti = `terpotong pagu: ${teksGalat(galat)}`;
    } else hasil.berhenti = `galat: ${teksGalat(galat)}`;
  }
  hasil.tak_terukur = hasil.nilai.filter((n) => n.berhenti === 'tak-terukur').length;
  hasil.biaya_usd = Math.round((hasil.biaya_usd + jumlah(hasil.nilai, (n) => n.biaya_gerbang_usd)) * 1e6) / 1e6;
  if (hasil.berhenti === null) {
    hasil.simulasi = pilihSimulasi(bacaBank(folderBank, sha), paket);
    hasil.draf = hasil.simulasi.draf;
    hasil.terbit = hasil.draf !== null;
    if (!hasil.terbit) hasil.berhenti = `simulasi belum tersusun: ${hasil.simulasi.alasan.join('; ')}`;
  }
  return hasil;
}
