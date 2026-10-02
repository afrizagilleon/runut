/**
 * Pemeriksaan struktur penulis bebas M2d-13 (pra-registrasi §4 (b)–(d), §5):
 * label pengecoh, umpan balik, pertanyaan cek, penjelasan merujuk kartu
 * penentu, sudut berbeda antar omongan, anti-salin soal tayang. Murni.
 *
 * Ketepatan ISI label tidak bisa diperiksa kode untuk teks bebas — dinilai
 * penilai mutu (rubrik §7 kriteria 2).
 */
import { ambilRujukan } from '../../skema/rujukan.ts';
import { JENIS_KESALAHAN, NAMA_KESALAHAN, type JenisKesalahan } from '../templat/label.ts';
import { salinanTayang } from '../templat/rakit.ts';
import { HURUF, type OmonganBebas } from './skema.ts';

export const BATAS_UMPAN_BALIK = 200;
export const BATAS_KATA_CEK = 20;

const labelDari = (t: string): 'Betul' | 'Keliru' | null => (/^\s*Betul\b/i.test(t) ? 'Betul' : /^\s*Keliru\b/i.test(t) ? 'Keliru' : null);

/** Label pengecoh (§5). */
export function periksaLabel(o: OmonganBebas): string[] {
  const m: string[] = [];
  for (const h of HURUF) {
    const p = o.pengecoh[h];
    if (h === o.kunci) {
      if (p !== undefined) m.push(`pengecoh ${h}: huruf kunci tidak boleh punya label pengecoh`);
      continue;
    }
    if (p === undefined) {
      m.push(`pengecoh ${h}: label (jenis, rujukan, umpan_balik) tidak ada`);
      continue;
    }
    if (!(JENIS_KESALAHAN as readonly string[]).includes(p.jenis)) m.push(`pengecoh ${h}: jenis "${p.jenis}" bukan salah satu dari ${JENIS_KESALAHAN.join(', ')}`);
    if (!o.kartu.includes(p.rujukan)) m.push(`pengecoh ${h}: rujukan "${p.rujukan}" bukan kartu omongan ini (kartu: ${o.kartu.join(', ')})`);
    if (p.jenis === 'percaya-otoritas' && !(labelDari(o.pilihan[h]) === 'Betul' && labelDari(o.pilihan[o.kunci]) === 'Keliru')) {
      m.push(`pengecoh ${h}: percaya-otoritas hanya sah bila pengecoh berawalan "Betul" dan kunci berawalan "Keliru" (pengecoh membenarkan teman yang salah)`);
    }
  }
  return m;
}

/** Umpan balik, penjelasan, pertanyaan cek (§5). */
export function periksaUmpanBalik(o: OmonganBebas): string[] {
  const m: string[] = [];
  for (const h of HURUF) {
    const p = o.pengecoh[h];
    if (h === o.kunci || p === undefined) continue;
    const t = p.umpan_balik.toLowerCase();
    const nama = (JENIS_KESALAHAN as readonly string[]).includes(p.jenis) ? NAMA_KESALAHAN[p.jenis as JenisKesalahan] : null;
    if (nama !== null && !t.includes(nama)) m.push(`umpan balik ${h}: harus memuat nama jenis kesalahannya "${nama}"`);
    const n = o.kartu.indexOf(p.rujukan) + 1;
    if (n > 0 && !new RegExp(`\\bkartu\\s+${String(n)}\\b`).test(t)) m.push(`umpan balik ${h}: harus menyebut "kartu ${String(n)}" (nomor urut rujukan ${p.rujukan})`);
    if (p.umpan_balik.length > BATAS_UMPAN_BALIK) m.push(`umpan balik ${h}: ${String(p.umpan_balik.length)} karakter, lebih dari ${String(BATAS_UMPAN_BALIK)}`);
  }
  if (!ambilRujukan(o.penjelasan).some((r) => o.kartu_penentu.includes(r.fact_id))) m.push(`penjelasan harus merujuk minimal satu kartu penentu (${o.kartu_penentu.join(', ')}) dengan [[fact_id|teks]]`);
  const cek = o.pertanyaan_cek.trim();
  if (!cek.endsWith('?')) m.push('pertanyaan cek harus diakhiri "?"');
  const kata = cek.split(/\s+/).filter((x) => /[\p{L}\p{N}]/u.test(x)).length;
  if (kata === 0 || kata > BATAS_KATA_CEK) m.push(`pertanyaan cek ${String(kata)} kata; harus 1–${String(BATAS_KATA_CEK)} kata`);
  return m;
}

/** Sudut berbeda (§4 (d)): kartu penentu omongan `no` beririsan dengan omongan bernomor lebih kecil → ditolak. */
export function periksaSudut(no: number, semua: ReadonlyArray<OmonganBebas | null>): string[] {
  const o = semua[no - 1];
  if (o === null || o === undefined) return [];
  const m: string[] = [];
  for (let i = 0; i < no - 1; i++) {
    const lain = semua[i];
    if (lain === null || lain === undefined) continue;
    const sama = o.kartu_penentu.filter((k) => lain.kartu_penentu.includes(k));
    if (sama.length > 0) m.push(`sudut sama dengan omongan ${String(i + 1)}: kartu penentu ${sama.join(', ')} sudah dipakai; pilih fakta penentu lain`);
  }
  return m;
}

/** Anti-salin: tidak ada potongan 5 kata dari soal tayang. */
export function periksaSalin(o: OmonganBebas): string[] {
  const bagian: Array<[string, string]> = [['pesan', o.pesan], ...HURUF.map((h): [string, string] => [`pilihan ${h}`, o.pilihan[h]]), ['penjelasan', o.penjelasan]];
  for (const h of HURUF) {
    const p = o.pengecoh[h];
    if (p !== undefined) bagian.push([`umpan balik ${h}`, p.umpan_balik]);
  }
  return bagian.flatMap(([b, t]) => salinanTayang(t).map((s) => `${b} menyalin soal tayang: ${s}`));
}
