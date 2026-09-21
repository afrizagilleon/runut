/**
 * Angka besar dalam bahasa orang (A1-T5).
 *
 * `4692137600` dibaca "empat miliar enam ratus sembilan puluh dua juta…" oleh
 * tidak seorang pun. Di layar pembukaan, yang perlu dimengerti pemain adalah
 * besarannya, bukan digitnya — digit persisnya tetap ada di panel sumber.
 *
 * Satu fungsi, dipakai di semua tempat, dites di batas-batasnya.
 */

const JUTA = 1_000_000;
const MILIAR = 1_000_000_000;

/** "1.234.567" — pemisah ribuan Indonesia, tanpa `toLocaleString`. */
export function angkaId(nilai: number): string {
  const negatif = nilai < 0;
  const mutlak = Math.abs(nilai);
  const bulat = Math.trunc(mutlak);
  const pecahan = mutlak - bulat;
  let utuh = String(bulat).replace(/\B(?=(\d{3})+(?!\d))/g, '.');
  if (pecahan > 0) {
    utuh += ',' + String(Math.round(pecahan * 100) / 100).slice(2);
  }
  return (negatif ? '-' : '') + utuh;
}

/** Buang nol berekor sesudah koma: "4,70" → "4,7"; "10,00" → "10". */
function rapikan(teks: string): string {
  if (!teks.includes(',')) return teks;
  return teks.replace(/,?0+$/, '');
}

/**
 * Angka dalam satuan yang bisa dibayangkan.
 *
 * - di bawah satu juta: apa adanya dengan pemisah ribuan;
 * - satu juta ke atas: "10 juta", "299,5 juta";
 * - satu miliar ke atas: "4,69 miliar".
 *
 * Pembulatan ke dua desimal, nol berekor dibuang. Tanda negatif dipertahankan
 * karena lompatan saldo di jejak verifikasi memang bisa negatif.
 */
export function angkaBesar(nilai: number): string {
  if (!Number.isFinite(nilai)) return String(nilai);
  const negatif = nilai < 0;
  const mutlak = Math.abs(nilai);
  const tanda = negatif ? '-' : '';

  const dua = (bagi: number): string =>
    rapikan((Math.round((mutlak / bagi) * 100) / 100).toFixed(2).replace('.', ','));

  // Pembulatan diperiksa SESUDAH dibagi: 999.999.999 dibulatkan menjadi
  // 1.000 juta, yang seharusnya naik satu satuan menjadi "1 miliar" —
  // bukan dicetak sebagai "1000 juta".
  const naikKeMiliar = Math.round((mutlak / JUTA) * 100) / 100 >= 1000;
  if (mutlak >= MILIAR || naikKeMiliar) return `${tanda}${dua(MILIAR)} miliar`;
  if (mutlak >= JUTA) return `${tanda}${dua(JUTA)} juta`;
  return angkaId(nilai);
}

/** Angka besar beserta satuannya: "4,69 miliar lembar". */
export function angkaBesarSatuan(nilai: number, satuan: string): string {
  const teks = angkaBesar(nilai);
  return satuan === '' ? teks : `${teks} ${satuan}`;
}
