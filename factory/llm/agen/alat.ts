/**
 * Alat agen penulis (M2d-18). Empat fungsi biasa yang dipanggil MODEL lewat
 * SDK agen; urutan dan jumlah panggilannya diputuskan model, bukan kode.
 *
 * - `lihatFakta`   : kartu fakta hari simulasi (teks paket yang sama dengan penulis lama).
 * - `lihatBank`    : omongan yang sudah lolos, kartu penentu terpakai, sisa anggaran.
 * - `periksaKode`  : gerbang kode gratis untuk satu draf; penolakan apa adanya.
 * - `ajukan`       : gerbang berbayar (saringan tebak → pembaca kartu → penebak
 *                    kuat → kritikus, `nilaiOmonganV3`); yang lolos masuk bank.
 *                    M2d-21: saringan tebak memakai ukuran selabel; penebak kuat
 *                    hanya dicatat (tidak menolak).
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
import { bacaBank, idOmongan, jumlahSudut, pilihSimulasi, shaPaketBank, simpanBank, sudutBank, UKURAN_SIMULASI, type EntriBank } from '../bebas/bank.ts';
import { nilaiOmonganV3, type NilaiOmonganV3 } from '../bebas/mesin-v3.ts';
import { teksPaket } from '../bebas/prompt.ts';
import { uraiOmonganBebas, type OmonganBebas } from '../bebas/skema.ts';
import { PaguTercapai } from '../pagu.ts';
import type { PaketFakta } from '../paket.ts';
import type { PanggilTemplat } from '../templat/penulis.ts';
import { pasangNama, periksaKodeAgen } from './pemeran.ts';

/**
 * Penguji Opus (penebak kuat tanpa kartu): menolak, atau hanya memperingatkan? Diputuskan dari kalibrasi pada enam
 * soal tayang (`eval/penyusun/m2d23-pasangan-1/`); lihat catatan di bawah konstanta.
 */
export const PENGUJI_OPUS_MENOLAK = false;

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
/** Paling banyak draf per panggilan `periksa_kode` / `ajukan` (satu simulasi = tiga omongan). */
export const MAKS_DRAF_PER_PANGGILAN = 3;

/** Ringkasan penolakan per pola (kartu penentu × gerbang): yang dibawa adalah polanya, bukan 8 butir terakhir. */
export interface PolaDitolak {
  kartu_penentu: string[];
  gerbang: string;
  berapa_kali: number;
  contoh_pesan: string;
  alasan: string[];
}

/** Kelompokkan penolakan menurut kartu penentu × gerbang; alasan unik paling banyak 3; urut dari yang paling sering. Murni. */
export function ringkasDitolak(d: readonly SudutDitolak[], maks: number = MAKS_RIWAYAT_DITOLAK): PolaDitolak[] {
  const peta = new Map<string, PolaDitolak>();
  for (const x of d) {
    const k = `${[...x.kartu_penentu].sort().join('+')}|${x.berhenti}`;
    const p = peta.get(k) ?? { kartu_penentu: [...x.kartu_penentu], gerbang: x.berhenti, berapa_kali: 0, contoh_pesan: x.pesan, alasan: [] };
    p.berapa_kali += 1;
    p.contoh_pesan = x.pesan;
    for (const a of x.alasan) if (!p.alasan.includes(a) && p.alasan.length < 3) p.alasan.push(a);
    peta.set(k, p);
  }
  return [...peta.values()].sort((a, b) => b.berapa_kali - a.berapa_kali).slice(0, maks);
}

/** Kunci omongan ini pilihan "Betul, …"? */
export const kunciBetul = (o: OmonganBebas): boolean => /^\s*betul\b/i.test(o.pilihan[o.kunci]);

/**
 * Apa yang masih dibutuhkan supaya bank bisa dirakit menjadi simulasi — aturan
 * tingkat simulasi yang tidak terlihat dari satu omongan (M2d-19: bank 3/3
 * tetapi perakit menolak karena tidak ada kunci "Betul"). Murni.
 */
export function kebutuhanSimulasi(bank: readonly EntriBank[], paket: PaketFakta, target: number): { terakit: boolean; butuh_betul: boolean; kebutuhan: string[] } {
  const terakit = pilihSimulasi(bank, paket).draf !== null;
  if (terakit) return { terakit, butuh_betul: false, kebutuhan: [] };
  const kebutuhan: string[] = [];
  const sudut = jumlahSudut(bank);
  if (sudut < target) kebutuhan.push(`Bank baru memuat ${String(sudut)} dari ${String(target)} kartu penentu berbeda.`);
  const butuhBetul = bank.length > 0 && !bank.some((e) => kunciBetul(e.omongan));
  if (butuhBetul) kebutuhan.push('Semua omongan di bank berjawaban "Keliru". Simulasi butuh minimal satu omongan yang ternyata BETUL (kuncinya pilihan "Betul, …").');
  // M2d-20: larangan "pilih keluarga lain" dihapus — perakit tidak menuntutnya, dan penolakan penebak adalah sifat kalimat, bukan sifat kartu.
  if (kebutuhan.length === 0) kebutuhan.push(...pilihSimulasi(bank, paket).alasan.slice(0, 2));
  return { terakit, butuh_betul: butuhBetul, kebutuhan };
}

export interface HasilPeriksa {
  lolos: boolean;
  penolakan: string[];
  /** Nomor draf bila lolos: pakai di `ajukan` supaya draf tidak perlu dikirim ulang. */
  id_draf?: string;
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
  /** Draf yang sudah lolos `periksa_kode`, menurut nomor drafnya. */
  const drafLolos = new Map<string, OmonganBebas>();
  const ditolak: SudutDitolak[] = [...(o.riwayatDitolak ?? [])];
  let ditolakDiSini = 0;
  let biayaGerbang = 0;
  let ke = 0;
  let ajukanKe = 0;
  let antre: Promise<unknown> = Promise.resolve();
  /** Galat gerbang yang bukan penolakan dan bukan pagu (penyedia hilang, jaringan): percobaan harus berhenti. */
  let rusak: string | null = null;

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

  const lihatBank = (): { omongan: Array<{ nama: string; kartu_penentu: string[]; pesan: string; jawaban: 'Betul' | 'Keliru'; pilihan: OmonganBebas['pilihan']; kunci: string }>; kartu_penentu_terpakai: string[]; jumlah_sudut: number; target: number; kebutuhan_simulasi: string[]; pernah_ditolak: PolaDitolak[]; sisa_anggaran_usd: number } => {
    const b = bank();
    const butuh = kebutuhanSimulasi(b, o.paket, target);
    return lapor('lihat_bank', `${String(jumlahSudut(b))} dari ${String(target)} sudut${butuh.terakit ? '; simulasi bisa dirakit' : ''}`, {
      // M2d-23: pilihan + kunci omongan yang LOLOS ikut ditampilkan — contoh kembaran yang berhasil dari hari yang sama.
      omongan: b.map((e) => ({ nama: e.omongan.nama, kartu_penentu: [...e.kartu_penentu], pesan: e.omongan.pesan, jawaban: kunciBetul(e.omongan) ? 'Betul' : 'Keliru', pilihan: e.omongan.pilihan, kunci: e.omongan.kunci })),
      kebutuhan_simulasi: butuh.kebutuhan,
      kartu_penentu_terpakai: sudutBank(b),
      jumlah_sudut: jumlahSudut(b),
      target,
      pernah_ditolak: ringkasDitolak(ditolak),
      sisa_anggaran_usd: sisa(),
    });
  };

  const periksaKode = (x: unknown): HasilPeriksa => {
    const u = urai(x);
    if (u.omongan === null) return lapor('periksa_kode', 'bentuk tak terurai', { lolos: false, penolakan: [u.alasan] });
    const k = periksaKodeAgen(u.omongan, o.paket);
    const penolakan = k.menolak.map((m) => `${m.sumber}: ${m.alasan}`);
    if (penolakan.length > 0) return lapor('periksa_kode', `${String(penolakan.length)} penolakan`, { lolos: false, penolakan });
    const id = idOmongan(u.omongan);
    drafLolos.set(id, u.omongan);
    return lapor('periksa_kode', `lolos (draf ${id})`, { lolos: true, penolakan: [], id_draf: id });
  };

  const ajukanSatu = async (x: unknown): Promise<HasilAjukan> => {
    const dasar = (berhenti: string, penolakan: string[], catatan: string[] = [], biaya = 0): HasilAjukan => ({ lolos: berhenti === 'lolos', berhenti, penolakan, catatan, biaya_pengajuan_usd: bulat(biaya), sisa_anggaran_usd: sisa(), bank: ringkasBank(bank()) });
    // `{ id_draf }` = draf yang sudah lolos periksa_kode (tanpa mengirim ulang JSON); selain itu = objek omongan utuh.
    const idDraf = typeof x === 'object' && x !== null && typeof (x as { id_draf?: unknown }).id_draf === 'string' ? (x as { id_draf: string }).id_draf : null;
    if (idDraf !== null && !drafLolos.has(idDraf)) return lapor('ajukan', 'nomor draf tak dikenal (gratis)', dasar('bentuk', [`Nomor draf "${idDraf}" tidak dikenal. Pakai id_draf dari periksa_kode yang lolos.`]));
    const u = idDraf !== null ? { omongan: drafLolos.get(idDraf) as OmonganBebas, alasan: '' } : urai(x);
    if (u.omongan === null) return lapor('ajukan', 'bentuk tak terurai (gratis)', dasar('bentuk', [u.alasan]));
    // Nama dipasang lagi saat diajukan: draf sebatch tidak boleh bernama sama dengan omongan yang baru saja masuk bank.
    const om = pasangNama(u.omongan, bank().map((e) => e.omongan.nama));
    const k = periksaKodeAgen(om, o.paket);
    if (k.menolak.length > 0) return lapor('ajukan', 'belum lolos kode (gratis)', dasar('kode', k.menolak.map((m) => `${m.sumber}: ${m.alasan}`), ['Gerbang berbayar tidak dijalankan. Pakai periksa_kode sampai lolos dulu.']));
    const id = idOmongan(om);
    const lama = diajukan.get(id);
    if (lama !== undefined) return lapor('ajukan', 'draf sama sudah diajukan (gratis)', dasar('sudah-diajukan', lama.penolakan, ['Draf yang persis sama sudah pernah diajukan; hasilnya tidak berubah. Ubah drafnya atau ganti sudut.']));
    // Penjaga uang: bila simulasi hanya kurang omongan ber-kunci "Betul", draf "Keliru" tidak dibayar.
    const butuh = kebutuhanSimulasi(bank(), o.paket, target);
    if (butuh.butuh_betul && jumlahSudut(bank()) >= target && !kunciBetul(om)) return lapor('ajukan', 'bukan yang dibutuhkan simulasi (gratis)', dasar('kebutuhan', butuh.kebutuhan, ['Gerbang berbayar tidak dijalankan: bank sudah penuh dengan jawaban "Keliru". Ajukan omongan yang kuncinya "Betul, …".']));
    if (sisa() < CADANGAN_AJUKAN_USD) return lapor('ajukan', 'anggaran tidak cukup (gratis)', dasar('anggaran', [], [`Sisa anggaran US$${String(sisa())} di bawah cadangan satu pengajuan (US$${String(CADANGAN_AJUKAN_USD)}). Berhenti.`]));
    ajukanKe += 1;
    let n: NilaiOmonganV3 | null = null;
    try {
      n = await nilai(om, o.paket, o.panggil, ajukanKe, 1, (y) => semuaNilai.push(y), periksaKodeAgen, { pasangan: true, penebakKuatDicatat: !PENGUJI_OPUS_MENOLAK });
    } catch (galat) {
      const terakhir = semuaNilai.at(-1);
      if (terakhir !== undefined && terakhir.putaran === ajukanKe) biayaGerbang += terakhir.biaya_gerbang_usd;
      if (galat instanceof PaguTercapai) return lapor('ajukan', 'terpotong pagu', dasar('anggaran', [], ['Pagu tercapai di tengah gerbang. Berhenti.'], terakhir?.biaya_gerbang_usd ?? 0));
      // M2d-22: gerbang rusak bukan penolakan. Dulu galatnya dilempar ke model, yang lalu terus menulis dan membayar
      // tanpa pernah dinilai (dua percobaan, ±US$0,98). Sekarang: dicatat, drafnya tetap tersimpan, percobaan dihentikan.
      rusak = galat instanceof Error ? `${galat.name}: ${galat.message}`.slice(0, 400) : 'galat tak dikenal';
      ajukanKe -= 1;
      return lapor('ajukan', 'GERBANG RUSAK — percobaan dihentikan', dasar('galat-gerbang', [], ['Gerbang tidak bisa dijalankan (gangguan teknis, bukan penolakan). Draf ini tetap tersimpan. Berhenti; jangan menulis draf lain.'], terakhir?.biaya_gerbang_usd ?? 0));
    }
    biayaGerbang += n.biaya_gerbang_usd;
    if (n.berhenti === 'lolos') {
      simpanBank(o.folderBank, {
        id, paket_sha: sha, kartu_penentu: [...om.kartu_penentu], omongan: om,
        jejak_gerbang: { kode: { dicatat: n.dicatat }, saringan: n.saringan, ...(n.pasangan === undefined ? {} : { pasangan: n.pasangan }), kartu: n.kartu_rotasi, penebak_kuat: n.penebak_kuat, kritikus: n.kritik },
        asal: { jalan: o.idJalan, putaran: ajukanKe, urut: 1, penulis: o.labelPenulis, sha256_prompt: '' },
        waktu: jam().toISOString(),
      });
      n.id_bank = id;
    }
    // Alasan yang ditulis penebak saat memilih kunci tanpa kartu — apa adanya, supaya agen tahu petunjuk apa yang bocor.
    const kataPenebak = n.berhenti === 'penebak-kuat' || n.berhenti === 'saringan'
      ? [...new Set([...(n.penebak_kuat?.jawaban ?? []), ...(n.berhenti === 'saringan' ? [...(n.saringan?.jawaban ?? []), ...(n.pasangan?.jawaban ?? [])] : [])].filter((j) => j.isi !== null && j.isi === j.isi_kunci && typeof j.alasan === 'string' && j.alasan.trim() !== '').map((j) => `alasan penebak tanpa kartu: "${(j.alasan as string).trim()}"`))].slice(0, 4)
      : [];
    // Penguji Opus yang tidak menolak tetap memberi peringatan: alasannya dikirim ke agen walau omongannya lolos.
    const q = n.penebak_kuat;
    const peringatan = q !== null && q !== undefined && q.putusan.putusan === 'tolak' && n.berhenti !== 'penebak-kuat'
      ? [`Peringatan penguji Opus (tidak menolak): ${q.putusan.alasan}`, ...[...new Set(q.jawaban.filter((j) => j.isi === j.isi_kunci && j.alasan.trim() !== '').map((j) => `alasan penguji Opus: "${j.alasan.trim()}"`))].slice(0, 2)]
      : [];
    const h = dasar(n.berhenti, n.berhenti === 'lolos' ? [] : [...n.alasan, ...kataPenebak], n.berhenti === 'tak-terukur' ? ['Gerbang tidak bisa mengukur draf ini (bukan penolakan). Boleh diajukan lagi sesudah diubah sedikit.'] : peringatan, n.biaya_gerbang_usd);
    if (n.berhenti !== 'tak-terukur') diajukan.set(id, h);
    if (n.berhenti !== 'lolos' && n.berhenti !== 'tak-terukur') {
      ditolak.push({ kartu_penentu: [...om.kartu_penentu], pesan: om.pesan, berhenti: n.berhenti, alasan: h.penolakan.slice(0, 4) });
      ditolakDiSini += 1;
    }
    return lapor('ajukan', n.berhenti === 'lolos' ? `lolos → bank (${String(h.bank.jumlah_sudut)}/${String(target)})` : `berhenti di ${n.berhenti}`, h);
  };

  /** Periksa 1–3 draf sekaligus (gratis). */
  const periksaKodeBanyak = (xs: readonly unknown[]): HasilPeriksa[] => xs.slice(0, MAKS_DRAF_PER_PANGGILAN).map((x) => periksaKode(x));

  /** Ajukan 1–3 draf; tiap draf dinilai sendiri, berurutan (hitungan anggaran dan nama tetap benar). */
  const ajukanBanyak = async (ids: readonly string[]): Promise<{ hasil: Array<{ id_draf: string } & HasilAjukan>; simulasi_bisa_dirakit: boolean; kebutuhan_simulasi: string[] }> => {
    const hasil: Array<{ id_draf: string } & HasilAjukan> = [];
    for (const id of ids.slice(0, MAKS_DRAF_PER_PANGGILAN)) {
      hasil.push({ id_draf: id, ...(await ajukan({ id_draf: id })) });
      if (rusak !== null) break;
    }
    const butuh = kebutuhanSimulasi(bank(), o.paket, target);
    return { hasil, simulasi_bisa_dirakit: butuh.terakit, kebutuhan_simulasi: butuh.kebutuhan };
  };

  /** Satu pengajuan pada satu waktu. */
  const ajukan = (x: unknown): Promise<HasilAjukan> => {
    const p = antre.then(() => ajukanSatu(x));
    antre = p.catch(() => undefined);
    return p;
  };

  return {
    lihatFakta, lihatBank, periksaKode, periksaKodeBanyak, ajukan, ajukanBanyak,
    /** Keadaan untuk penghenti dan ringkasan. */
    keadaan: () => ({ ditolak: ditolakDiSini, jumlah_omongan: bank().length, jumlah_sudut: jumlahSudut(bank()), target, biaya_gerbang_usd: bulat(biayaGerbang), biaya_total_usd: bulat(terpakai()), sisa_anggaran_usd: sisa(), pengajuan: ajukanKe, nilai: semuaNilai }),
    /** Selesai = bank BISA DIRAKIT menjadi simulasi (bukan sekadar jumlah sudut). */
    selesai: () => pilihSimulasi(bank(), o.paket).draf !== null,
    anggaranHabis: () => sisa() < CADANGAN_AJUKAN_USD,
    /** Pesan galat gerbang (bukan penolakan); `null` = sehat. */
    rusak: () => rusak,
    /** Draf yang sudah lolos gerbang kode di percobaan ini (untuk disimpan walau gerbang berbayar gagal). */
    drafLolos: () => [...drafLolos.entries()].map(([id, omongan]) => ({ id, omongan })),
  };
}

export type AlatAgen = ReturnType<typeof buatAlat>;
