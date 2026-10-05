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
import { bacaBank, idOmongan, jumlahSudut, pilihSimulasi, shaPaketBank, simpanBank, sudutBank, UKURAN_SIMULASI, type EntriBank, type PilihanSimulasi } from '../bebas/bank.ts';
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
  alat: 'lihat_fakta' | 'lihat_bank' | 'periksa_draft_dengan_aturan' | 'ajukan' | 'lihat_simulasi' | 'tingkatkan' | 'usulkan_hari' | 'periksa_saham' | 'lihat_soal_terkunci' | 'lihat_sesudahnya' | 'periksa_kasus_dengan_aturan' | 'ajukan_kasus';
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
  /** M2d-25: 'sulit' = hanya omongan berlabel sulit (`tingkatOmongan`: penebak murah ≤ 3 dari 12 DAN penguji Opus 0 benar) yang masuk bank dan dirakit. */
  tingkat?: 'biasa' | 'sulit';
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

export type Tingkat = 'pemanasan' | 'biasa' | 'sulit';

/**
 * Label tingkat satu omongan (M2d-25), dari dua penguji tanpa kartu. Batasnya dari enam soal tayang yang
 * dibandingkan dengan pemain sungguhan (`.context/agen/analisa-4okt.md` §10; n = 6, masih kasar):
 * - pemanasan: penebak murah memilih kunci ≥ 7 dari 12 (firasat mengarah ke jawaban benar);
 * - sulit: penebak murah ≤ 3 dari 12 DAN penguji Opus 0 benar (firasat menyesatkan, tidak tertebak);
 * - biasa: selain itu. `null` bila penebak tidak dijalankan. Murni.
 */
export function tingkatOmongan(n: Pick<NilaiOmonganV3, 'pasangan' | 'penebak_kuat'>): Tingkat | null {
  const p = n.pasangan?.putusan;
  if (p === undefined || p.n === 0) return null;
  const k = (p.kunci / p.n) * 12;
  if (k >= 7) return 'pemanasan';
  const q = n.penebak_kuat?.putusan;
  if (k <= 3 && q !== undefined && q !== null && q.kunci === 0) return 'sulit';
  return 'biasa';
}
/** Tingkat satu entri bank: label tersimpan, atau dihitung ulang dari jejak gerbangnya (entri sebelum M2d-25). Murni. */
export function tingkatEntri(e: EntriBank): Tingkat | null {
  const j = e.jejak_gerbang as { tingkat?: Tingkat | null; pasangan?: NilaiOmonganV3['pasangan']; penebak_kuat?: NilaiOmonganV3['penebak_kuat'] };
  return j.tingkat ?? tingkatOmongan({ pasangan: j.pasangan, penebak_kuat: j.penebak_kuat ?? null });
}
/** Ukuran tanpa-kartu satu omongan: bagian jawaban penebak murah yang memilih kunci, dan jumlah benar penguji Opus. Murni. */
export function ukuranTebak(n: { pasangan?: NilaiOmonganV3['pasangan'] | undefined; penebak_kuat?: NilaiOmonganV3['penebak_kuat'] | undefined }): { murah: number | null; kunci: number | null; n: number | null; opus: number | null } {
  const p = n.pasangan?.putusan;
  const q = n.penebak_kuat?.putusan;
  return { murah: p === undefined || p.n === 0 ? null : p.kunci / p.n, kunci: p?.kunci ?? null, n: p?.n ?? null, opus: q === undefined || q === null ? null : q.kunci };
}
const ukuranEntri = (e: EntriBank): ReturnType<typeof ukuranTebak> => ukuranTebak(e.jejak_gerbang as { pasangan?: NilaiOmonganV3['pasangan']; penebak_kuat?: NilaiOmonganV3['penebak_kuat'] });
/** Id omongan asal bila entri ini versi yang ditingkatkan (M2d-26); `null` = versi asal. */
export const peningkatanDari = (e: EntriBank): string | null => (e.jejak_gerbang as { peningkatan_dari?: string }).peningkatan_dari ?? null;
/**
 * Versi baru LEBIH SULIT dari versi asal bila penebak murah lebih jarang memilih kunci (bagian, bukan hitungan —
 * jawaban tak terbaca dibuang) DAN penguji Opus tidak lebih sering benar. Murni.
 */
export function lebihSulit(baru: ReturnType<typeof ukuranTebak>, asal: ReturnType<typeof ukuranTebak>): boolean {
  if (baru.murah === null || asal.murah === null) return false;
  if (baru.opus !== null && asal.opus !== null && baru.opus > asal.opus) return false;
  return baru.murah < asal.murah - 1e-9;
}
/** Paling banyak draf per panggilan `periksa_draft_dengan_aturan` / `ajukan` (satu simulasi = tiga omongan). */
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
 * Perakit jalur agen (M2d-25): validator seluruh draf + minimal satu "Keliru".
 * Validator lama hanya menuntut minimal satu "Betul"; m2d25-bolt-2 terakit
 * dengan tiga jawaban "Betul" — pemain cukup mengiyakan semua teman.
 */
export const SEMUA_BETUL = 'ketiga omongan berjawaban "Betul"; simulasi butuh minimal satu yang ternyata KELIRU';
export const rakitSimulasi = (bank: readonly EntriBank[], paket: PaketFakta): PilihanSimulasi =>
  pilihSimulasi(bank, paket, (trio) => (trio.every((e) => kunciBetul(e.omongan)) ? SEMUA_BETUL : null));

/**
 * Apa yang masih dibutuhkan supaya bank bisa dirakit menjadi simulasi — aturan
 * tingkat simulasi yang tidak terlihat dari satu omongan (M2d-19: bank 3/3
 * tetapi perakit menolak karena tidak ada kunci "Betul"). Murni.
 */
export function kebutuhanSimulasi(bank: readonly EntriBank[], paket: PaketFakta, target: number): { terakit: boolean; butuh_betul: boolean; butuh_keliru: boolean; kebutuhan: string[] } {
  const terakit = rakitSimulasi(bank, paket).draf !== null;
  if (terakit) return { terakit, butuh_betul: false, butuh_keliru: false, kebutuhan: [] };
  const kebutuhan: string[] = [];
  const sudut = jumlahSudut(bank);
  if (sudut < target) kebutuhan.push(`Bank baru memuat ${String(sudut)} dari ${String(target)} kartu penentu berbeda.`);
  const butuhBetul = bank.length > 0 && !bank.some((e) => kunciBetul(e.omongan));
  if (butuhBetul) kebutuhan.push('Semua omongan di bank berjawaban "Keliru". Simulasi butuh minimal satu omongan yang ternyata BETUL (kuncinya pilihan "Betul, …").');
  const butuhKeliru = bank.length > 0 && bank.every((e) => kunciBetul(e.omongan));
  if (butuhKeliru) kebutuhan.push('Semua omongan di bank berjawaban "Betul". Simulasi butuh minimal satu omongan yang ternyata KELIRU (kuncinya pilihan "Keliru, …").');
  // M2d-20: larangan "pilih keluarga lain" dihapus — perakit tidak menuntutnya, dan penolakan penebak adalah sifat kalimat, bukan sifat kartu.
  if (kebutuhan.length === 0) kebutuhan.push(...rakitSimulasi(bank, paket).alasan.slice(0, 2));
  return { terakit, butuh_betul: butuhBetul, butuh_keliru: butuhKeliru, kebutuhan };
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
  /** Draf yang sudah lolos `periksa_draft_dengan_aturan`, menurut nomor drafnya. */
  const drafLolos = new Map<string, OmonganBebas>();
  /** Nomor draf yang sudah pernah dikirim ke gerbang berbayar (lolos atau tidak). */
  const drafTerkirim = new Set<string>();
  const ditolak: SudutDitolak[] = [...(o.riwayatDitolak ?? [])];
  let ditolakDiSini = 0;
  let biayaGerbang = 0;
  let ke = 0;
  let ajukanKe = 0;
  let antre: Promise<unknown> = Promise.resolve();
  /** Galat gerbang yang bukan penolakan dan bukan pagu (penyedia hilang, jaringan): percobaan harus berhenti. */
  let rusak: string | null = null;

  // Mode sulit: bank yang dilihat agen dan dirakit hanya omongan berlabel sulit; omongan lain di folder yang sama diabaikan.
  const semuaEntri = (): EntriBank[] => bacaBank(o.folderBank, sha);
  // Versi yang ditingkatkan (M2d-26) tersimpan di folder yang sama, tetapi tidak ikut dirakit: simulasi dasarnya tetap versi asal.
  const bank = (): EntriBank[] => semuaEntri().filter((e) => peningkatanDari(e) === null && (o.tingkat !== 'sulit' || tingkatEntri(e) === 'sulit'));
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

  const lihatBank = (): { omongan: Array<{ nama: string; kartu_penentu: string[]; pesan: string; jawaban: 'Betul' | 'Keliru'; pilihan: OmonganBebas['pilihan']; kunci: string; tingkat: Tingkat | null }>; kartu_penentu_terpakai: string[]; jumlah_sudut: number; target: number; kebutuhan_simulasi: string[]; pernah_ditolak: PolaDitolak[]; sisa_anggaran_usd: number } => {
    const b = bank();
    const butuh = kebutuhanSimulasi(b, o.paket, target);
    return lapor('lihat_bank', `${String(jumlahSudut(b))} dari ${String(target)} sudut${butuh.terakit ? '; simulasi bisa dirakit' : ''}`, {
      // M2d-23: pilihan + kunci omongan yang LOLOS ikut ditampilkan — contoh kembaran yang berhasil dari hari yang sama.
      omongan: b.map((e) => ({ nama: e.omongan.nama, kartu_penentu: [...e.kartu_penentu], pesan: e.omongan.pesan, jawaban: kunciBetul(e.omongan) ? 'Betul' : 'Keliru', pilihan: e.omongan.pilihan, kunci: e.omongan.kunci, tingkat: (e.jejak_gerbang as { tingkat?: Tingkat | null }).tingkat ?? null })),
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
    if (u.omongan === null) return lapor('periksa_draft_dengan_aturan', 'bentuk tak terurai', { lolos: false, penolakan: [u.alasan] });
    const k = periksaKodeAgen(u.omongan, o.paket);
    const penolakan = k.menolak.map((m) => `${m.sumber}: ${m.alasan}`);
    if (penolakan.length > 0) return lapor('periksa_draft_dengan_aturan', `${String(penolakan.length)} penolakan`, { lolos: false, penolakan });
    const id = idOmongan(u.omongan);
    drafLolos.set(id, u.omongan);
    return lapor('periksa_draft_dengan_aturan', `lolos (draf ${id})`, { lolos: true, penolakan: [], id_draf: id });
  };

  const ajukanSatu = async (x: unknown, namaPaksa?: string, asal?: EntriBank): Promise<HasilAjukan> => {
    const dasar = (berhenti: string, penolakan: string[], catatan: string[] = [], biaya = 0): HasilAjukan => ({ lolos: berhenti === 'lolos', berhenti, penolakan, catatan, biaya_pengajuan_usd: bulat(biaya), sisa_anggaran_usd: sisa(), bank: ringkasBank(bank()) });
    // `{ id_draf }` = draf yang sudah lolos periksa_draft_dengan_aturan (tanpa mengirim ulang JSON); selain itu = objek omongan utuh.
    const idDraf = typeof x === 'object' && x !== null && typeof (x as { id_draf?: unknown }).id_draf === 'string' ? (x as { id_draf: string }).id_draf : null;
    if (idDraf !== null && !drafLolos.has(idDraf)) return lapor('ajukan', 'nomor draf tak dikenal (gratis)', dasar('bentuk', [`Nomor draf "${idDraf}" tidak dikenal. Pakai id_draf dari periksa_draft_dengan_aturan yang lolos.`]));
    const u = idDraf !== null ? { omongan: drafLolos.get(idDraf) as OmonganBebas, alasan: '' } : urai(x);
    if (u.omongan === null) return lapor('ajukan', 'bentuk tak terurai (gratis)', dasar('bentuk', [u.alasan]));
    // Nama dipasang lagi saat diajukan: draf sebatch tidak boleh bernama sama dengan omongan yang baru saja masuk bank.
    const om = namaPaksa === undefined ? pasangNama(u.omongan, bank().map((e) => e.omongan.nama)) : { ...u.omongan, nama: namaPaksa };
    const k = periksaKodeAgen(om, o.paket);
    if (k.menolak.length > 0) return lapor('ajukan', 'belum lolos kode (gratis)', dasar('kode', k.menolak.map((m) => `${m.sumber}: ${m.alasan}`), ['Gerbang berbayar tidak dijalankan. Pakai periksa_draft_dengan_aturan sampai lolos dulu.']));
    const id = idOmongan(om);
    const lama = diajukan.get(id);
    if (lama !== undefined) return lapor('ajukan', 'draf sama sudah diajukan (gratis)', dasar('sudah-diajukan', lama.penolakan, ['Draf yang persis sama sudah pernah diajukan; hasilnya tidak berubah. Ubah drafnya atau ganti sudut.']));
    // Peningkatan (M2d-26): yang diuji tidak boleh berubah — kartu penentu dan jawabannya sama dengan versi asal. Diperiksa gratis.
    if (asal !== undefined) {
      const sama = [...om.kartu_penentu].sort().join('|') === [...asal.kartu_penentu].sort().join('|');
      if (!sama) return lapor('tingkatkan', 'kartu penentu berubah (gratis)', dasar('kebutuhan', [`Kartu penentu versi baru (${om.kartu_penentu.join(', ')}) harus sama dengan versi asal (${asal.kartu_penentu.join(', ')}).`], ['Gerbang berbayar tidak dijalankan.']));
      if (kunciBetul(om) !== kunciBetul(asal.omongan)) return lapor('tingkatkan', 'jawaban berubah (gratis)', dasar('kebutuhan', [`Jawaban versi asal "${kunciBetul(asal.omongan) ? 'Betul' : 'Keliru'}"; versi baru harus berjawaban sama.`], ['Gerbang berbayar tidak dijalankan.']));
      if (ukuranEntri(asal).murah === null) return lapor('tingkatkan', 'versi asal tak terukur (gratis)', dasar('kebutuhan', ['Versi asal tidak punya ukuran penebak, jadi tidak ada pembanding.'], ['Gerbang berbayar tidak dijalankan.']));
    }
    // Penjaga uang: bila simulasi hanya kurang omongan ber-kunci "Betul", draf "Keliru" tidak dibayar.
    const butuh = asal !== undefined ? { butuh_betul: false, butuh_keliru: false, kebutuhan: [] as string[] } : kebutuhanSimulasi(bank(), o.paket, target);
    if (butuh.butuh_betul && jumlahSudut(bank()) >= target && !kunciBetul(om)) return lapor('ajukan', 'bukan yang dibutuhkan simulasi (gratis)', dasar('kebutuhan', butuh.kebutuhan, ['Gerbang berbayar tidak dijalankan: bank sudah penuh dengan jawaban "Keliru". Ajukan omongan yang kuncinya "Betul, …".']));
    if (butuh.butuh_keliru && jumlahSudut(bank()) >= target && kunciBetul(om)) return lapor('ajukan', 'bukan yang dibutuhkan simulasi (gratis)', dasar('kebutuhan', butuh.kebutuhan, ['Gerbang berbayar tidak dijalankan: bank sudah penuh dengan jawaban "Betul". Ajukan omongan yang kuncinya "Keliru, …".']));
    if (sisa() < CADANGAN_AJUKAN_USD) return lapor('ajukan', 'anggaran tidak cukup (gratis)', dasar('anggaran', [], [`Sisa anggaran US$${String(sisa())} di bawah cadangan satu pengajuan (US$${String(CADANGAN_AJUKAN_USD)}). Berhenti.`]));
    ajukanKe += 1;
    if (idDraf !== null) drafTerkirim.add(idDraf);
    const putaranIni = ajukanKe;
    let milik: NilaiOmonganV3 | null = null;
    let n: NilaiOmonganV3 | null = null;
    try {
      n = await nilai(om, o.paket, o.panggil, putaranIni, 1, (y) => { semuaNilai.push(y); milik = y; }, periksaKodeAgen, { pasangan: true, penebakKuatDicatat: !PENGUJI_OPUS_MENOLAK });
    } catch (galat) {
      const terakhir = (milik as NilaiOmonganV3 | null) ?? undefined;
      if (terakhir !== undefined) biayaGerbang += terakhir.biaya_gerbang_usd;
      if (galat instanceof PaguTercapai) return lapor('ajukan', 'terpotong pagu', dasar('anggaran', [], ['Pagu tercapai di tengah gerbang. Berhenti.'], terakhir?.biaya_gerbang_usd ?? 0));
      // M2d-22: gerbang rusak bukan penolakan. Dulu galatnya dilempar ke model, yang lalu terus menulis dan membayar
      // tanpa pernah dinilai (dua percobaan, ±US$0,98). Sekarang: dicatat, drafnya tetap tersimpan, percobaan dihentikan.
      rusak = galat instanceof Error ? `${galat.name}: ${galat.message}`.slice(0, 400) : 'galat tak dikenal';
      return lapor('ajukan', 'GERBANG RUSAK — percobaan dihentikan', dasar('galat-gerbang', [], ['Gerbang tidak bisa dijalankan (gangguan teknis, bukan penolakan). Draf ini tetap tersimpan. Berhenti; jangan menulis draf lain.'], terakhir?.biaya_gerbang_usd ?? 0));
    }
    biayaGerbang += n.biaya_gerbang_usd;
    // Mode sulit: yang masuk bank hanya omongan berlabel sulit — firasat penebak murah menyesatkan DAN penguji Opus tidak menebak satu kali pun.
    if (o.tingkat === 'sulit' && n.berhenti === 'lolos') {
      const q = n.penebak_kuat?.putusan;
      if (q === undefined || q === null) {
        n.berhenti = 'tak-terukur';
        n.alasan = ['mode sulit: penguji Opus tidak bisa dijalankan, jadi tingkatnya tak terukur'];
      } else if (q.kunci > 0) {
        n.berhenti = 'penebak-kuat';
        n.alasan = [`mode sulit: penguji Opus tanpa kartu benar ${String(q.kunci)} dari ${String(q.n)}; targetnya 0 — hilangkan petunjuk dari nada pesan dan dari susunan pilihan`];
      } else if (tingkatOmongan(n) !== 'sulit') {
        const p = n.pasangan?.putusan;
        n.berhenti = 'saringan';
        n.alasan = [`mode sulit: tanpa kartu, penebak memilih kunci ${String(p?.kunci ?? '?')} dari ${String(p?.n ?? '?')}; targetnya paling banyak 3 dari 12 — bagi orang yang belum membaca kartu, kembaran harus terasa LEBIH masuk akal daripada kunci (firasat menyesatkan), bukan sekadar sama masuk akalnya`];
      }
    }
    // Peningkatan: lolos semua gerbang belum cukup — harus terukur lebih sulit dari versi asal.
    let banding: string[] = [];
    if (asal !== undefined && n.berhenti === 'lolos') {
      const ub = ukuranTebak(n);
      const ua = ukuranEntri(asal);
      const teks = `penebak tanpa kartu memilih kunci ${String(ub.kunci)} dari ${String(ub.n)} (versi asal ${String(ua.kunci)} dari ${String(ua.n)}); penguji Opus benar ${String(ub.opus ?? '?')} dari 4 (versi asal ${String(ua.opus ?? '?')})`;
      if (lebihSulit(ub, ua)) banding = [`Lebih sulit dari versi asal: ${teks}. Tingkat: ${tingkatOmongan(n) ?? 'tak terukur'}.`];
      else {
        n.berhenti = 'tidak-naik';
        n.alasan = [`lolos semua gerbang, tetapi tidak lebih sulit dari versi asal: ${teks}. Versi asal dipertahankan.`];
      }
    }
    if (n.berhenti === 'lolos') {
      simpanBank(o.folderBank, {
        id, paket_sha: sha, kartu_penentu: [...om.kartu_penentu], omongan: om,
        jejak_gerbang: { tingkat: tingkatOmongan(n), ...(asal === undefined ? {} : { peningkatan_dari: asal.id }), kode: { dicatat: n.dicatat }, saringan: n.saringan, ...(n.pasangan === undefined ? {} : { pasangan: n.pasangan }), kartu: n.kartu_rotasi, penebak_kuat: n.penebak_kuat, kritikus: n.kritik },
        asal: { jalan: o.idJalan, putaran: putaranIni, urut: 1, penulis: o.labelPenulis, sha256_prompt: '' },
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
    const h = dasar(n.berhenti, n.berhenti === 'lolos' ? [] : [...n.alasan, ...kataPenebak], n.berhenti === 'tak-terukur' ? ['Gerbang tidak bisa mengukur draf ini (bukan penolakan). Boleh diajukan lagi sesudah diubah sedikit.'] : [...banding, ...peringatan], n.biaya_gerbang_usd);
    if (n.berhenti !== 'tak-terukur') diajukan.set(id, h);
    if (n.berhenti !== 'lolos' && n.berhenti !== 'tak-terukur') {
      ditolak.push({ kartu_penentu: [...om.kartu_penentu], pesan: om.pesan, berhenti: n.berhenti, alasan: h.penolakan.slice(0, 4) });
      ditolakDiSini += 1;
    }
    if (asal !== undefined) return lapor('tingkatkan', n.berhenti === 'lolos' ? `NAIK: ${banding[0] ?? ''}` : `berhenti di ${n.berhenti}`, h);
    return lapor('ajukan', n.berhenti === 'lolos' ? `lolos → bank (${String(h.bank.jumlah_sudut)}/${String(target)})` : `berhenti di ${n.berhenti}`, h);
  };

  /** Simulasi yang sudah terakit + ukuran tiap omongannya + versi yang sudah ditingkatkan (M2d-26). */
  const simulasiDasar = (): EntriBank[] => {
    const b = bank();
    const r = rakitSimulasi(b, o.paket);
    return r.dipilih.flatMap((id) => b.filter((e) => e.id === id));
  };
  const versiNaik = (idAsal: string): EntriBank[] => semuaEntri().filter((e) => peningkatanDari(e) === idAsal);
  const alasanMemilihKunci = (e: EntriBank): string[] => {
    const j = e.jejak_gerbang as { pasangan?: NilaiOmonganV3['pasangan'] };
    return [...new Set((j.pasangan?.jawaban ?? []).filter((x) => x.isi !== null && x.isi === x.isi_kunci && typeof x.alasan === 'string' && x.alasan.trim() !== '').map((x) => x.alasan.trim()))].slice(0, 5);
  };
  const lihatSimulasi = () => {
    const s = simulasiDasar();
    return lapor('lihat_simulasi', s.length === 0 ? 'belum ada simulasi terakit' : `${String(s.length)} omongan; ${String(s.filter((e) => versiNaik(e.id).length > 0).length)} sudah punya versi lebih sulit`, {
      omongan: s.map((e) => {
        const u = ukuranEntri(e);
        return {
          id_asal: e.id, nama: e.omongan.nama, kartu_penentu: [...e.kartu_penentu], jawaban: kunciBetul(e.omongan) ? 'Betul' : 'Keliru', tingkat: tingkatEntri(e),
          penebak_tanpa_kartu: u.n === null ? 'tak terukur' : `memilih kunci ${String(u.kunci)} dari ${String(u.n)}`, penguji_opus: u.opus === null ? 'tak terukur' : `benar ${String(u.opus)} dari 4`,
          alasan_penebak_memilih_kunci: alasanMemilihKunci(e), omongan: e.omongan,
          versi_lebih_sulit: versiNaik(e.id).map((v) => ({ id: v.id, tingkat: tingkatEntri(v), penebak_tanpa_kartu: `memilih kunci ${String(ukuranEntri(v).kunci)} dari ${String(ukuranEntri(v).n)}`, pesan: v.omongan.pesan })),
        };
      }),
      sisa_anggaran_usd: sisa(),
    });
  };
  /** Ajukan versi lebih sulit dari satu omongan simulasi. Nama teman tetap; kartu penentu dan jawaban tidak boleh berubah. */
  const tingkatkan = (idAsal: string, idDraf: string): Promise<HasilAjukan> => {
    const asal = simulasiDasar().find((e) => e.id === idAsal);
    if (asal === undefined) return Promise.resolve(lapor('tingkatkan', 'id_asal tak dikenal (gratis)', { lolos: false, berhenti: 'bentuk', penolakan: [`id_asal "${idAsal}" bukan omongan simulasi ini. Pakai id_asal dari lihat_simulasi.`], catatan: [], biaya_pengajuan_usd: 0, sisa_anggaran_usd: sisa(), bank: ringkasBank(bank()) }));
    const p = antre.then(() => ajukanSatu({ id_draf: idDraf }, asal.omongan.nama, asal));
    antre = p.catch(() => undefined);
    return p;
  };
  /**
   * Ajukan 1–3 versi lebih sulit sekaligus; tiap versi diuji sendiri dan BERDAMPINGAN, sama seperti `ajukan` (M2d-27).
   * Versi yang tidak terjangkau anggaran tidak dijalankan dan tetap tersimpan.
   */
  const tingkatkanBanyak = async (pasangan: ReadonlyArray<{ id_asal: string; id_draf: string }>): Promise<{ hasil: Array<{ id_asal: string; id_draf: string } & HasilAjukan>; jumlah_naik: number; semua_naik: boolean }> => {
    const daftar = pasangan.slice(0, MAKS_DRAF_PER_PANGGILAN);
    const dasar = simulasiDasar();
    const terjangkau = Math.max(0, Math.floor((sisa() + 1e-9) / CADANGAN_AJUKAN_USD));
    const kosong = (berhenti: string, penolakan: string[], catatan: string[]): HasilAjukan => ({ lolos: false, berhenti, penolakan, catatan, biaya_pengajuan_usd: 0, sisa_anggaran_usd: sisa(), bank: ringkasBank(bank()) });
    let dipesan = 0;
    const hasil = await Promise.all(daftar.map(async (x) => {
      const asal = dasar.find((e) => e.id === x.id_asal);
      if (asal === undefined) return { ...x, ...lapor('tingkatkan', 'id_asal tak dikenal (gratis)', kosong('bentuk', [`id_asal "${x.id_asal}" bukan omongan simulasi ini. Pakai id_asal dari lihat_simulasi.`], [])) };
      if (dipesan >= terjangkau) return { ...x, ...kosong('anggaran', [], [`Sisa anggaran hanya cukup untuk ${String(terjangkau)} versi; versi ini belum dijalankan dan tetap tersimpan.`]) };
      dipesan += 1;
      return { ...x, ...(await ajukanSatu({ id_draf: x.id_draf }, asal.omongan.nama, asal)) };
    }));
    return { hasil: hasil.map((h) => ({ ...h, sisa_anggaran_usd: sisa() })), jumlah_naik: simulasiDasar().filter((e) => versiNaik(e.id).length > 0).length, semua_naik: simulasiDasar().length > 0 && simulasiDasar().every((e) => versiNaik(e.id).length > 0) };
  };

  /** Periksa 1–3 draf sekaligus (gratis). */
  const periksaKodeBanyak = (xs: readonly unknown[]): HasilPeriksa[] => xs.slice(0, MAKS_DRAF_PER_PANGGILAN).map((x) => periksaKode(x));

  /** Ajukan 1–3 draf; tiap draf dinilai sendiri, berurutan (hitungan anggaran dan nama tetap benar). */
  /**
   * Ajukan 1–3 draf; tiap draf dinilai sendiri dan BERDAMPINGAN (M2d-25). Dulu berurutan: tiga draf memakan
   * ±9 menit, simpanan prompt 5 menit kedaluwarsa, dan panggilan penulis berikutnya membayar penuh (m2d24-tirt-1).
   * Nama dipasang di muka supaya draf sebatch tidak bernama sama; draf yang tidak terjangkau anggaran tidak dijalankan.
   */
  const ajukanBanyak = async (ids: readonly string[]): Promise<{ hasil: Array<{ id_draf: string } & HasilAjukan>; simulasi_bisa_dirakit: boolean; kebutuhan_simulasi: string[] }> => {
    const daftar = [...new Set(ids)].slice(0, MAKS_DRAF_PER_PANGGILAN);
    const terjangkau = Math.max(0, Math.floor((sisa() + 1e-9) / CADANGAN_AJUKAN_USD));
    const pakai = bank().map((e) => e.omongan.nama);
    const tugas = daftar.map((id, i) => {
      const d = drafLolos.get(id);
      if (i >= terjangkau) return { id, nama: undefined, tunda: true };
      const nama = d === undefined ? undefined : pasangNama(d, pakai).nama;
      if (nama !== undefined) pakai.push(nama);
      return { id, nama, tunda: false };
    });
    const hasil = await Promise.all(tugas.map(async (t) => {
      if (t.tunda) return { id_draf: t.id, lolos: false, berhenti: 'anggaran', penolakan: [], catatan: [`Sisa anggaran hanya cukup untuk ${String(terjangkau)} pengajuan; draf ini belum dijalankan dan tetap tersimpan.`], biaya_pengajuan_usd: 0, sisa_anggaran_usd: sisa(), bank: ringkasBank(bank()) };
      return { id_draf: t.id, ...(await ajukanSatu({ id_draf: t.id }, t.nama)) };
    }));
    const butuh = kebutuhanSimulasi(bank(), o.paket, target);
    return { hasil: hasil.map((h) => ({ ...h, sisa_anggaran_usd: sisa(), bank: ringkasBank(bank()) })), simulasi_bisa_dirakit: butuh.terakit, kebutuhan_simulasi: butuh.kebutuhan };
  };

  /** Satu pengajuan pada satu waktu. */
  const ajukan = (x: unknown): Promise<HasilAjukan> => {
    const p = antre.then(() => ajukanSatu(x));
    antre = p.catch(() => undefined);
    return p;
  };

  return {
    lihatFakta, lihatBank, periksaKode, periksaKodeBanyak, ajukan, ajukanBanyak, lihatSimulasi, tingkatkan, tingkatkanBanyak,
    /** Ada draf lolos-aturan yang belum pernah dikirim ke gerbang berbayar (dipakai mode hemat pelari). */
    adaDrafSiap: () => [...drafLolos.keys()].some((id) => !drafTerkirim.has(id)),
    /** Mode tingkatkan selesai: tiap omongan simulasi sudah punya versi yang terukur lebih sulit. */
    semuaNaik: () => simulasiDasar().length > 0 && simulasiDasar().every((e) => versiNaik(e.id).length > 0),
    jumlahNaik: () => simulasiDasar().filter((e) => versiNaik(e.id).length > 0).length,
    /** Keadaan untuk penghenti dan ringkasan. */
    keadaan: () => ({ ditolak: ditolakDiSini, jumlah_omongan: bank().length, jumlah_sudut: jumlahSudut(bank()), target, biaya_gerbang_usd: bulat(biayaGerbang), biaya_total_usd: bulat(terpakai()), sisa_anggaran_usd: sisa(), pengajuan: ajukanKe, nilai: semuaNilai }),
    /** Selesai = bank BISA DIRAKIT menjadi simulasi (bukan sekadar jumlah sudut). */
    selesai: () => rakitSimulasi(bank(), o.paket).draf !== null,
    anggaranHabis: () => sisa() < CADANGAN_AJUKAN_USD,
    /** Pesan galat gerbang (bukan penolakan); `null` = sehat. */
    rusak: () => rusak,
    /** Draf yang sudah lolos gerbang kode di percobaan ini (untuk disimpan walau gerbang berbayar gagal). */
    drafLolos: () => [...drafLolos.entries()].map(([id, omongan]) => ({ id, omongan })),
  };
}

export type AlatAgen = ReturnType<typeof buatAlat>;
