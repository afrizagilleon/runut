/**
 * Aturan angka-di-kartu M2d-13 (pra-registrasi `docs/bukti/m2d13-praregistrasi.md`
 * §4 (a)): setiap angka/tanggal berdigit yang dilihat pemain harus ada di
 * KARTU OMONGAN ITU, bukan sekadar di paket.
 *
 * - pilihan, penjelasan, umpan balik: digit hanya di dalam rujukan
 *   `[[fact_id|teks]]` dengan fact_id ∈ `kartu`, atau `[[hari-ini|…]]`;
 *   `[[misal|…]]` dilarang. Di umpan balik frasa "kartu N" boleh bila
 *   1 ≤ N ≤ jumlah kartu.
 * - pesan: tiap `angka_pesan` wajib `fact_id` ∈ `kartu`; andaian dilarang.
 * - pertanyaan cek: tanpa digit.
 *
 * Kecocokan teks rujukan dengan nilai fakta dijaga validator lama
 * (`validasiM2d8`); angka yang ditulis dengan kata tidak diperiksa
 * (keterbatasan tertulis). Murni.
 */
import { RUJUKAN_ANDAIAN, RUJUKAN_HARI_INI, ambilRujukan, teksTanpaRujukan } from '../../skema/rujukan.ts';
import { HURUF, type OmonganBebas } from './skema.ts';

const DIGIT = /\d/;
const KARTU_N = /\bkartu\s+(\d+)\b/gi;

function periksaTeks(tempat: string, teks: string, kartu: readonly string[], bolehKartuN: boolean): string[] {
  const m: string[] = [];
  for (const r of ambilRujukan(teks)) {
    if (r.fact_id === RUJUKAN_ANDAIAN) m.push(`${tempat}: [[misal|${r.teks}]] dilarang — setiap angka harus ada di kartu omongan ini`);
    else if (r.fact_id !== RUJUKAN_HARI_INI && !kartu.includes(r.fact_id)) m.push(`${tempat}: "${r.teks}" merujuk ${r.fact_id}, yang bukan kartu omongan ini (kartu: ${kartu.join(', ')})`);
  }
  let sisa = teksTanpaRujukan(teks);
  if (bolehKartuN) {
    sisa = sisa.replace(KARTU_N, (_x, n: string) => {
      const k = Number(n);
      if (k < 1 || k > kartu.length) m.push(`${tempat}: "kartu ${n}" tidak ada (omongan ini punya ${String(kartu.length)} kartu)`);
      return 'kartu';
    });
  }
  const lepas = sisa.match(/[^\s]*\d[^\s]*/g) ?? [];
  if (lepas.length > 0) m.push(`${tempat}: angka di luar rujukan kartu: ${lepas.join(', ')}`);
  return m;
}

export function angkaDiKartu(o: OmonganBebas): string[] {
  const m: string[] = [];
  for (const a of o.angka_pesan) {
    if (a.andaian === true) m.push(`pesan: angka andaian "${a.teks}" dilarang — angka teman harus ada di kartu omongan ini`);
    else if (a.fact_id === undefined || !o.kartu.includes(a.fact_id)) m.push(`pesan: "${a.teks}" ${a.fact_id === undefined ? 'tanpa fact_id' : `merujuk ${a.fact_id}`}, bukan kartu omongan ini (kartu: ${o.kartu.join(', ')})`);
  }
  for (const h of HURUF) m.push(...periksaTeks(`pilihan ${h}`, o.pilihan[h], o.kartu, false));
  m.push(...periksaTeks('penjelasan', o.penjelasan, o.kartu, false));
  for (const h of HURUF) {
    const p = o.pengecoh[h];
    if (p !== undefined) m.push(...periksaTeks(`umpan balik ${h}`, p.umpan_balik, o.kartu, true));
  }
  if (DIGIT.test(o.pertanyaan_cek)) m.push(`pertanyaan cek memuat angka ("${o.pertanyaan_cek}"); pertanyaan cek harus bisa dipakai lagi tanpa angka`);
  return m;
}
