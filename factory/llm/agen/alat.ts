/**
 * Alat agen penulis (M2d-18). Empat fungsi biasa yang dipanggil MODEL lewat
 * SDK agen; urutan dan jumlah panggilannya diputuskan model, bukan kode.
 *
 * - `lihatFakta`   : kartu fakta hari simulasi (teks paket yang sama dengan penulis lama).
 * - `lihatBank`    : omongan yang sudah lolos, kartu penentu terpakai, sisa anggaran.
 * - `periksaKode`  : gerbang kode gratis untuk satu draf; penolakan apa adanya.
 * - `ajukan`       : gerbang berbayar (saringan tebak → pembaca kartu → penebak
 *                    kuat → kritikus, `nilaiOmonganV3`); yang lolos masuk bank.
 *
 * Yang dijaga kode di sini (bukan diputuskan model):
 * - nama dipasang dari daftar pemeran tetap (`pemeran.ts`);
 * - `ajukan` tidak menjalankan gerbang berbayar bila draf belum lolos kode,
 *   bila draf yang persis sama sudah pernah diajukan, atau bila sisa anggaran
 *   di bawah cadangan satu pengajuan;
 * - `ajukan` berjalan satu per satu (antrean), supaya hitungan anggaran benar
 *   walau model memanggil beberapa alat sekaligus;
 * - tiap panggilan alat dicatat ke jejak.
 */
import { bacaBank, idOmongan, jumlahSudut, shaPaketBank, simpanBank, sudutBank, UKURAN_SIMULASI, type EntriBank } from '../bebas/bank.ts';
import { nilaiOmonganV3, type NilaiOmonganV3 } from '../bebas/mesin-v3.ts';
import { teksPaket } from '../bebas/prompt.ts';
import { uraiOmonganBebas, type OmonganBebas } from '../bebas/skema.ts';
import { PaguTercapai } from '../pagu.ts';
import type { PaketFakta } from '../paket.ts';
import type { PanggilTemplat } from '../templat/penulis.ts';
import { pasangNama, periksaKodeAgen } from './pemeran.ts';

/** Sisa anggaran minimum (USD) supaya satu pengajuan boleh dijalankan. */
/** Pengajuan penuh termahal yang terukur (M2d-18): US$0,105 → cadangan sedikit di atasnya. */
export const CADANGAN_AJUKAN_USD = 0.12;

export interface PeristiwaAlat {
  alat: 'lihat_fakta' | 'lihat_bank' | 'periksa_kode' | 'ajukan';
  ke: number;
  ringkas: string;
  hasil: unknown;
}

export interface OpsiAlat {
  paket: PaketFakta;
  folderBank: string;
  idJalan: string;
  /** Pemanggil gerbang berbayar (berpagu, penyedia terkunci, mentah tersimpan). */
  panggil: PanggilTemplat;
  /** Pagu seluruh percobaan ini (agen + gerbang), USD. */
  paguUsd: number;
  /** Biaya panggilan model AGEN sejauh ini (USD); biaya gerbang dihitung di sini. */
  biayaAgen: () => number;
  labelPenulis: string;
  target?: number;
  /** Sudut yang pernah ditolak gerbang berbayar di percobaan lain atas paket yang sama (pelajaran lintas percakapan). */
  riwayatDitolak?: readonly SudutDitolak[];
  jam?: () => Date;
  catat?: (p: PeristiwaAlat) => void;
  /** Disuntik tes. */
  nilai?: typeof nilaiOmonganV3;
}

/** Satu sudut yang ditolak gerbang berbayar: cukup untuk tidak mengulanginya. */
export interface SudutDitolak {
  kartu_penentu: string[];
  pesan: string;
  berhenti: string;
  alasan: string[];
}

export const MAKS_RIWAYAT_DITOLAK = 8;

export interface HasilPeriksa {
  lolos: boolean;
  penolakan: string[];
}

export interface HasilAjukan {
  lolos: boolean;
  /** Tempat berhenti: 'bentuk' | 'kode' | 'sudah-diajukan' | 'anggaran' | gerbang v3 | 'tak-terukur' | 'lolos'. */
  berhenti: string;
  penolakan: string[];
  catatan: string[];
  biaya_pengajuan_usd: number;
  sisa_anggaran_usd: number;
  bank: { kartu_penentu: string[]; jumlah_sudut: number; target: number };
}

const bulat = (x: number): number => Math.round(x * 1e4) / 1e4;

export function buatAlat(o: OpsiAlat) {
  const target = o.target ?? UKURAN_SIMULASI;
  const jam = o.jam ?? (() => new Date());
  const nilai = o.nilai ?? nilaiOmonganV3;
  const sha = shaPaketBank(o.paket);
  const semuaNilai: NilaiOmonganV3[] = [];
  const diajukan = new Map<string, HasilAjukan>();
  const ditolak: SudutDitolak[] = [...(o.riwayatDitolak ?? [])];
  let ditolakDiSini = 0;
  let biayaGerbang = 0;
  let ke = 0;
  let ajukanKe = 0;
  let antre: Promise<unknown> = Promise.resolve();

  const bank = (): EntriBank[] => bacaBank(o.folderBank, sha);
  const terpakai = (): number => o.biayaAgen() + biayaGerbang;
  const sisa = (): number => bulat(Math.max(0, o.paguUsd - terpakai()));
  const ringkasBank = (b: readonly EntriBank[]): HasilAjukan['bank'] => ({ kartu_penentu: sudutBank(b), jumlah_sudut: jumlahSudut(b), target });
  const lapor = <T>(alat: PeristiwaAlat['alat'], ringkas: string, hasil: T): T => {
    ke += 1;
    o.catat?.({ alat, ke, ringkas, hasil });
    return hasil;
  };
  const urai = (x: unknown): { omongan: OmonganBebas | null; alasan: string } => {
    const u = uraiOmonganBebas(x);
    if (u.omongan === null) return { omongan: null, alasan: `bentuk JSON: ${u.alasan ?? 'tak terurai'}` };
    return { omongan: pasangNama(u.omongan, bank().map((e) => e.omongan.nama)), alasan: '' };
  };

  const lihatFakta = (): { hari: string; kartu: string } => lapor('lihat_fakta', 'kartu fakta dibaca', { hari: o.paket.tanggal_t, kartu: teksPaket(o.paket) });

  const lihatBank = (): { omongan: Array<{ nama: string; kartu_penentu: string[]; pesan: string }>; kartu_penentu_terpakai: string[]; jumlah_sudut: number; target: number; pernah_ditolak: SudutDitolak[]; sisa_anggaran_usd: number } => {
    const b = bank();
    return lapor('lihat_bank', `${String(jumlahSudut(b))} dari ${String(target)} sudut`, {
      omongan: b.map((e) => ({ nama: e.omongan.nama, kartu_penentu: [...e.kartu_penentu], pesan: e.omongan.pesan })),
      kartu_penentu_terpakai: sudutBank(b),
      jumlah_sudut: jumlahSudut(b),
      target,
      pernah_ditolak: ditolak.slice(-MAKS_RIWAYAT_DITOLAK),
      sisa_anggaran_usd: sisa(),
    });
  };

  const periksaKode = (x: unknown): HasilPeriksa => {
    const u = urai(x);
    if (u.omongan === null) return lapor('periksa_kode', 'bentuk tak terurai', { lolos: false, penolakan: [u.alasan] });
    const k = periksaKodeAgen(u.omongan, o.paket);
    const penolakan = k.menolak.map((m) => `${m.sumber}: ${m.alasan}`);
    return lapor('periksa_kode', penolakan.length === 0 ? 'lolos' : `${String(penolakan.length)} penolakan`, { lolos: penolakan.length === 0, penolakan });
  };

  const ajukanSatu = async (x: unknown): Promise<HasilAjukan> => {
    const dasar = (berhenti: string, penolakan: string[], catatan: string[] = [], biaya = 0): HasilAjukan => ({ lolos: berhenti === 'lolos', berhenti, penolakan, catatan, biaya_pengajuan_usd: bulat(biaya), sisa_anggaran_usd: sisa(), bank: ringkasBank(bank()) });
    const u = urai(x);
    if (u.omongan === null) return lapor('ajukan', 'bentuk tak terurai (gratis)', dasar('bentuk', [u.alasan]));
    const om = u.omongan;
    const k = periksaKodeAgen(om, o.paket);
    if (k.menolak.length > 0) return lapor('ajukan', 'belum lolos kode (gratis)', dasar('kode', k.menolak.map((m) => `${m.sumber}: ${m.alasan}`), ['Gerbang berbayar tidak dijalankan. Pakai periksa_kode sampai lolos dulu.']));
    const id = idOmongan(om);
    const lama = diajukan.get(id);
    if (lama !== undefined) return lapor('ajukan', 'draf sama sudah diajukan (gratis)', dasar('sudah-diajukan', lama.penolakan, ['Draf yang persis sama sudah pernah diajukan; hasilnya tidak berubah. Ubah drafnya atau ganti sudut.']));
    if (sisa() < CADANGAN_AJUKAN_USD) return lapor('ajukan', 'anggaran tidak cukup (gratis)', dasar('anggaran', [], [`Sisa anggaran US$${String(sisa())} di bawah cadangan satu pengajuan (US$${String(CADANGAN_AJUKAN_USD)}). Berhenti.`]));
    ajukanKe += 1;
    let n: NilaiOmonganV3 | null = null;
    try {
      n = await nilai(om, o.paket, o.panggil, ajukanKe, 1, (y) => semuaNilai.push(y), periksaKodeAgen);
    } catch (galat) {
      const terakhir = semuaNilai.at(-1);
      if (terakhir !== undefined && terakhir.putaran === ajukanKe) biayaGerbang += terakhir.biaya_gerbang_usd;
      if (galat instanceof PaguTercapai) return lapor('ajukan', 'terpotong pagu', dasar('anggaran', [], ['Pagu tercapai di tengah gerbang. Berhenti.'], terakhir?.biaya_gerbang_usd ?? 0));
      throw galat;
    }
    biayaGerbang += n.biaya_gerbang_usd;
    if (n.berhenti === 'lolos') {
      simpanBank(o.folderBank, {
        id, paket_sha: sha, kartu_penentu: [...om.kartu_penentu], omongan: om,
        jejak_gerbang: { kode: { dicatat: n.dicatat }, saringan: n.saringan, kartu: n.kartu_rotasi, penebak_kuat: n.penebak_kuat, kritikus: n.kritik },
        asal: { jalan: o.idJalan, putaran: ajukanKe, urut: 1, penulis: o.labelPenulis, sha256_prompt: '' },
        waktu: jam().toISOString(),
      });
      n.id_bank = id;
    }
    // Alasan yang ditulis penebak saat memilih kunci tanpa kartu — apa adanya, supaya agen tahu petunjuk apa yang bocor.
    const kataPenebak = n.berhenti === 'penebak-kuat' || n.berhenti === 'saringan'
      ? [...new Set([...(n.penebak_kuat?.jawaban ?? []), ...(n.berhenti === 'saringan' ? (n.saringan?.jawaban ?? []) : [])].filter((j) => j.isi !== null && j.isi === j.isi_kunci && typeof j.alasan === 'string' && j.alasan.trim() !== '').map((j) => `alasan penebak tanpa kartu: "${(j.alasan as string).trim()}"`))].slice(0, 4)
      : [];
    const h = dasar(n.berhenti, n.berhenti === 'lolos' ? [] : [...n.alasan, ...kataPenebak], n.berhenti === 'tak-terukur' ? ['Gerbang tidak bisa mengukur draf ini (bukan penolakan). Boleh diajukan lagi sesudah diubah sedikit.'] : [], n.biaya_gerbang_usd);
    if (n.berhenti !== 'tak-terukur') diajukan.set(id, h);
    if (n.berhenti !== 'lolos' && n.berhenti !== 'tak-terukur') {
      ditolak.push({ kartu_penentu: [...om.kartu_penentu], pesan: om.pesan, berhenti: n.berhenti, alasan: h.penolakan.slice(0, 4) });
      ditolakDiSini += 1;
    }
    return lapor('ajukan', n.berhenti === 'lolos' ? `lolos → bank (${String(h.bank.jumlah_sudut)}/${String(target)})` : `berhenti di ${n.berhenti}`, h);
  };

  /** Satu pengajuan pada satu waktu. */
  const ajukan = (x: unknown): Promise<HasilAjukan> => {
    const p = antre.then(() => ajukanSatu(x));
    antre = p.catch(() => undefined);
    return p;
  };

  return {
    lihatFakta, lihatBank, periksaKode, ajukan,
    /** Keadaan untuk penghenti dan ringkasan. */
    keadaan: () => ({ ditolak: ditolakDiSini, jumlah_sudut: jumlahSudut(bank()), target, biaya_gerbang_usd: bulat(biayaGerbang), biaya_total_usd: bulat(terpakai()), sisa_anggaran_usd: sisa(), pengajuan: ajukanKe, nilai: semuaNilai }),
    selesai: () => jumlahSudut(bank()) >= target,
    anggaranHabis: () => sisa() < CADANGAN_AJUKAN_USD,
  };
}

export type AlatAgen = ReturnType<typeof buatAlat>;
