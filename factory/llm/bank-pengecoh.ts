/**
 * Bank pengecoh DARI DATA (M2d-7 D-2) — peran PERENCANA, dijalankan kode.
 *
 * Kenapa: di M2d-3…M2d-6 pengecoh DIKARANG penulis, dan penguji luar
 * menebak kuncinya tanpa kartu karena pengecohnya jelas mengada-ada ("setop
 * awal tahun tidak dicatat bursa") atau kembar. Riset
 * (`.research/sota-mcq-finlit-id-2026.md` §1): pengecoh yang sulit ditebak
 * adalah yang SALAH tetapi berasal dari data yang SAMA — operand keliru,
 * periode keliru, konsep/entitas lain, "menjawab pertanyaan lain".
 *
 * Di sini, untuk satu sudut (fakta penentu S), kode membuat kandidat pengecoh
 * yang **hanya memakai nilai nyata dari paket**: tiap kandidat adalah nilai
 * (angka, tanggal, alasan resmi, jenis peristiwa) dari fakta LAIN di paket,
 * yang menjawab pertanyaan lain. **Tidak ada angka turunan baru**: angka dan
 * tanggal kandidat adalah teks tampil nilai fakta itu sendiri, dan setiap
 * rujukan kandidat lolos pemeriksa rujukan validator (`angkaTakBerjejak`,
 * dites). Kandidat yang nilainya sama dengan kunci (S) dibuang.
 *
 * Jenis kesalahan, relatif terhadap S:
 * - `periode-keliru` — besaran yang sama (kelas fakta sama) di tanggal lain;
 * - `operand-keliru` — angka lain bersatuan sama (mis. harga penutupan
 *   dipakai sebagai selisih);
 * - `konsep-lain` — besaran lain (satuan berbeda: kali vs rupiah vs lembar);
 * - `alasan-lain` — alasan resmi peristiwa sejenis yang lain;
 * - `pengumuman-lain` — jenis dokumen/peristiwa lain ("menjawab pertanyaan lain").
 */
import { angkaId, tanggalId } from '../format.ts';
import { ambilRujukan, teksPolos } from '../skema/rujukan.ts';
import { akar, normalAngka } from './gerbang-kembar.ts';
import type { FaktaPaket, PaketFakta } from './paket.ts';

export type JenisKesalahan = 'periode-keliru' | 'operand-keliru' | 'konsep-lain' | 'alasan-lain' | 'pengumuman-lain';
export type BentukKandidat = 'angka' | 'tanggal' | 'alasan' | 'peristiwa';

export const JENIS_KESALAHAN: readonly JenisKesalahan[] = ['periode-keliru', 'operand-keliru', 'konsep-lain', 'alasan-lain', 'pengumuman-lain'];

export interface KandidatPengecoh {
  /** Label pendek untuk penulis ("P1", "P2", …), urutan bank. */
  id: string;
  fact_id: string;
  jenis: JenisKesalahan;
  bentuk: BentukKandidat;
  /** Nilai yang dipakai: teks tampil angka/tanggal, atau frasa alasan/peristiwa dari kalimat fakta. */
  teks: string;
  /** `[[fact_id|teks]]` untuk angka/tanggal; `null` untuk alasan/peristiwa (tanpa angka). */
  rujukan: string | null;
  /** Kata isi (akar) yang harus muncul di pilihan yang memakai kandidat alasan/peristiwa. */
  penanda: string[];
  /** Pertanyaan yang dijawab fakta itu, dari kalimat faktanya. */
  menjawab: string;
}

/** Kunci sudut: nilai fakta S yang menjadi isi pilihan kunci. */
export interface KunciSudut {
  fact_id: string;
  bentuk: BentukKandidat;
  teks: string;
  rujukan: string | null;
  penanda: string[];
  menjawab: string;
}

/** Kelas fakta dari fact_id: tanggal dan nomor urut dibuang ("harga-2025-12-01" → "harga"). */
export function kelasFakta(id: string): string {
  return id
    .replace(/\d{4}-\d{2}-\d{2}/g, '')
    .replace(/-\d+$/, '')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
}

/** Teks tampil satu nilai angka menurut satuannya. */
export function teksAngka(f: Pick<FaktaPaket, 'nilai' | 'satuan'>): string | null {
  if (typeof f.nilai !== 'number') return null;
  const s = (f.satuan ?? '').toLowerCase();
  if (s === 'rupiah' || s.startsWith('rupiah per')) return `Rp${angkaId(f.nilai)}`;
  return s === '' ? angkaId(f.nilai) : `${angkaId(f.nilai)} ${s}`;
}

/** Alasan resmi di kalimat fakta penghentian ("Alasan resmi: …."), tanpa titik akhir. */
export function alasanResmi(klaim: string): string | null {
  const m = /Alasan resmi:\s*([^.]+(?:\.\d[^.]*)*)\./.exec(klaim);
  return m?.[1]?.trim() ?? null;
}

/** Jenis peristiwa satu fakta dokumen tanpa angka. */
export function peristiwaFakta(f: FaktaPaket): string {
  const k = kelasFakta(f.fact_id);
  if (k === 'susp') return 'penghentian sementara perdagangan oleh bursa';
  if (k === 'rups') return 'rapat umum pemegang saham';
  return f.asal;
}

/** Isi fakta yang dijawab kandidat: kalimat pertama kalimat faktanya (≤ 160 karakter). */
export function menjawab(f: FaktaPaket): string {
  const k = teksPolos(f.klaim);
  const potong = k.split(/\. (?=[A-Z])/)[0] ?? k;
  return potong.replace(/\.$/, '').trim().slice(0, 160);
}

/** Kata umum yang tidak membedakan isi alasan/peristiwa. */
const KATA_UMUM: ReadonlySet<string> = new Set([
  'bursa', 'nilai', 'bahwa', 'dapat', 'seroan', 'perseroan', 'saham', 'perusahaan', 'pada', 'yang', 'dalam', 'bagi', 'atas', 'sebagai', 'bentuk',
  'rangka', 'jadi', 'terjadi', 'terjadinya', 'menilai', 'ilai', 'terdapat', 'dan', 'di', 'ke', 'dari', 'oleh', 'untuk', 'itu', 'ini', 'the',
]);

/** Kelas sinonim penanda (sesudah `akar`): kata dengan isi yang sama dihitung satu penanda. */
export const SINONIM_PENANDA: Readonly<Record<string, string>> = {
  naik: '‹naik›', ingkat: '‹naik›', tingkat: '‹naik›', lonjak: '‹naik›', lompat: '‹naik›',
  ragu: '‹ragu›', ragukan: '‹ragu›',
  henti: '‹setop›', setop: '‹setop›', stop: '‹setop›', suspensi: '‹setop›', suspen: '‹setop›',
  rapat: '‹rapat›', rups: '‹rapat›',
};

/** Token isi (akar + kelas sinonim) satu teks. */
export function tokenIsi(teks: string, buang: ReadonlySet<string> = new Set()): Set<string> {
  const polos = normalAngka(teksPolos(teks).toLowerCase().replace(/^\s*(betul|keliru)\s*,\s*/, ''));
  const hasil = new Set<string>();
  for (const kasar of polos.replace(/[^\p{L}\d\s]/gu, ' ').split(/\s+/)) {
    if (kasar === '' || KATA_UMUM.has(kasar) || buang.has(kasar)) continue;
    const a = /\d/.test(kasar) ? kasar : akar(kasar);
    if (KATA_UMUM.has(a) || buang.has(a) || a.length < 3) continue;
    hasil.add(SINONIM_PENANDA[a] ?? a);
  }
  return hasil;
}

function penandaTeks(teks: string, paket: Pick<PaketFakta, 'nama_samaran'>): string[] {
  const buang = new Set(paket.nama_samaran.toLowerCase().split(/\s+/));
  return [...tokenIsi(teks, buang)].filter((t) => !/^\d/.test(t));
}

function tahunDari(iso: string): string {
  return iso.slice(0, 4);
}

/** Bentuk kunci/kandidat dari satu fakta, menurut isinya. */
function bentukUtama(f: FaktaPaket): BentukKandidat {
  if (typeof f.nilai === 'number') return 'angka';
  return alasanResmi(f.klaim) === null ? 'peristiwa' : 'alasan';
}

function nilaiBentuk(f: FaktaPaket, bentuk: BentukKandidat, paket: PaketFakta): Pick<KandidatPengecoh, 'teks' | 'rujukan' | 'penanda'> | null {
  if (bentuk === 'angka') {
    const t = teksAngka(f);
    return t === null ? null : { teks: t, rujukan: `[[${f.fact_id}|${t}]]`, penanda: [] };
  }
  if (bentuk === 'tanggal') {
    const t = tanggalId(f.terbit);
    // Tahun ikut ditulis hanya bila berbeda dari tahun T; teks tampil tetap tanggal fakta itu sendiri.
    const pendek = tahunDari(f.terbit) === tahunDari(paket.tanggal_t) ? t.replace(/ \d{4}$/, '') : t;
    return { teks: pendek, rujukan: `[[${f.fact_id}|${pendek}]]`, penanda: [] };
  }
  if (bentuk === 'alasan') {
    const a = alasanResmi(f.klaim);
    return a === null ? null : { teks: a, rujukan: null, penanda: penandaTeks(a, paket) };
  }
  const p = peristiwaFakta(f);
  return { teks: p, rujukan: null, penanda: penandaTeks(p, paket) };
}

/**
 * Kunci sudut S: nilai utamanya (angka, alasan, atau peristiwa). Untuk fakta
 * dokumen tanpa angka (alasan/peristiwa), rujukannya = tanggal fakta itu
 * sendiri, jadi pilihan kunci boleh memakai tanggalnya ATAU isinya.
 */
export function kunciSudut(paket: PaketFakta, sudut: string): KunciSudut {
  const s = paket.fakta.find((f) => f.fact_id === sudut);
  if (s === undefined) throw new Error(`Sudut ${sudut} tidak ada di paket.`);
  const bentuk = bentukUtama(s);
  const n = nilaiBentuk(s, bentuk, paket);
  if (n === null) throw new Error(`Sudut ${sudut} tidak punya nilai yang bisa dipakai.`);
  const rujukan = n.rujukan ?? nilaiBentuk(s, 'tanggal', paket)?.rujukan ?? null;
  return { fact_id: s.fact_id, bentuk, ...n, rujukan, menjawab: menjawab(s) };
}

interface Calon {
  f: FaktaPaket;
  jenis: JenisKesalahan;
  bentuk: BentukKandidat;
}

function calonDari(s: FaktaPaket, f: FaktaPaket): Calon[] {
  const ks = kelasFakta(s.fact_id);
  const kf = kelasFakta(f.fact_id);
  const sAngka = typeof s.nilai === 'number';
  const fAngka = typeof f.nilai === 'number';
  if (sAngka && fAngka) {
    if (ks === kf) return [{ f, jenis: 'periode-keliru', bentuk: 'angka' }, { f, jenis: 'periode-keliru', bentuk: 'tanggal' }];
    return [{ f, jenis: (s.satuan ?? '') === (f.satuan ?? '') ? 'operand-keliru' : 'konsep-lain', bentuk: 'angka' }];
  }
  if (!sAngka && !fAngka) {
    if (ks === kf) {
      const hasil: Calon[] = [{ f, jenis: 'periode-keliru', bentuk: 'tanggal' }];
      if (alasanResmi(f.klaim) !== null) hasil.unshift({ f, jenis: 'alasan-lain', bentuk: 'alasan' });
      return hasil;
    }
    return [{ f, jenis: 'pengumuman-lain', bentuk: 'peristiwa' }];
  }
  if (!sAngka && fAngka) return [{ f, jenis: 'konsep-lain', bentuk: 'angka' }];
  // S berangka, F dokumen tanpa angka: dokumen itu menjawab pertanyaan lain.
  return [{ f, jenis: 'pengumuman-lain', bentuk: alasanResmi(f.klaim) === null ? 'peristiwa' : 'alasan' }];
}

/** Hari antara dua tanggal ISO (mutlak). */
function jarakHari(a: string, b: string): number {
  return Math.abs(Date.parse(a.slice(0, 10)) - Date.parse(b.slice(0, 10))) / 86_400_000;
}

function samaNilai(a: Pick<KandidatPengecoh, 'teks' | 'bentuk'>, b: Pick<KunciSudut, 'teks' | 'bentuk'>): boolean {
  const n = (x: string): string => normalAngka(x.toLowerCase()).replace(/\s+/g, ' ').trim();
  return n(a.teks) === n(b.teks);
}

/**
 * Bank pengecoh satu sudut. Urutan deterministik: bergiliran antar-jenis
 * (urutan `JENIS_KESALAHAN`) supaya daftar yang dipotong tetap beragam; di
 * dalam satu jenis, fakta yang tanggalnya paling dekat ke S dulu, lalu urutan
 * paket. Paling banyak `MAKS_PER_JENIS` per jenis (harga harian tidak
 * membanjiri daftar); `maks` membatasi panjang daftar yang ditunjukkan ke penulis.
 */
export const MAKS_PER_JENIS = 4;

export function bankPengecoh(paket: PaketFakta, sudut: string, maks = 12): KandidatPengecoh[] {
  const s = paket.fakta.find((f) => f.fact_id === sudut);
  if (s === undefined) throw new Error(`Sudut ${sudut} tidak ada di paket.`);
  const kunci = kunciSudut(paket, sudut);
  const urutPaket = new Map(paket.fakta.map((f, i) => [f.fact_id, i]));
  const per = new Map<JenisKesalahan, Array<Omit<KandidatPengecoh, 'id'>>>();
  const dilihat = new Set<string>();
  const calon = paket.fakta
    .filter((f) => f.fact_id !== s.fact_id)
    .flatMap((f) => calonDari(s, f))
    .sort(
      (a, b) =>
        jarakHari(a.f.terbit, s.terbit) - jarakHari(b.f.terbit, s.terbit) ||
        (urutPaket.get(a.f.fact_id) ?? 0) - (urutPaket.get(b.f.fact_id) ?? 0),
    );
  for (const c of calon) {
    const n = nilaiBentuk(c.f, c.bentuk, paket);
    if (n === null) continue;
    const k = { fact_id: c.f.fact_id, jenis: c.jenis, bentuk: c.bentuk, ...n, menjawab: menjawab(c.f) };
    // Nilai yang sama dengan kunci bukan pengecoh; nilai yang sama dua kali cukup sekali.
    if (samaNilai(k, kunci)) continue;
    const kunciNilai = `${k.bentuk}|${normalAngka(k.teks.toLowerCase())}`;
    if (dilihat.has(kunciNilai)) continue;
    dilihat.add(kunciNilai);
    const l = per.get(c.jenis) ?? [];
    if (l.length >= MAKS_PER_JENIS) continue;
    l.push(k);
    per.set(c.jenis, l);
  }
  const hasil: KandidatPengecoh[] = [];
  for (let i = 0; hasil.length < maks; i++) {
    let ada = false;
    for (const j of JENIS_KESALAHAN) {
      const k = per.get(j)?.[i];
      if (k === undefined) continue;
      ada = true;
      if (hasil.length < maks) hasil.push({ id: `P${String(hasil.length + 1)}`, ...k });
    }
    if (!ada) break;
  }
  return hasil;
}

/** Apakah teks (pilihan atau pesan) memakai kandidat/kunci ini: rujukan ke faktanya, atau ≥ 1 penanda. */
export function memakai(teks: string, k: Pick<KandidatPengecoh, 'fact_id' | 'rujukan' | 'penanda'>, angkaPesan: ReadonlyArray<{ fact_id?: string }> = []): boolean {
  if (ambilRujukan(teks).some((r) => r.fact_id === k.fact_id)) return true;
  if (angkaPesan.some((a) => a.fact_id === k.fact_id)) return true;
  if (k.penanda.length === 0) return false;
  const t = tokenIsi(teks);
  return k.penanda.some((p) => t.has(p));
}

/** Satu baris daftar bank untuk penulis. */
export function tulisKandidat(k: KandidatPengecoh): string {
  return `- ${k.id} | ${k.jenis} | pakai: ${k.rujukan ?? `"${k.teks}"`} | fakta itu menjawab: ${k.menjawab}`;
}
