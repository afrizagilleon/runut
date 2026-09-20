/**
 * Pemformat angka dan tanggal versi sendiri.
 *
 * Sengaja tidak memakai `toLocaleString`: hasil ICU bisa berbeda antar mesin,
 * sedangkan teks temuan ikut masuk ke berkas kasus yang harus bisa dibangun
 * ulang **identik** (D-5).
 */

const BULAN = [
  'Januari',
  'Februari',
  'Maret',
  'April',
  'Mei',
  'Juni',
  'Juli',
  'Agustus',
  'September',
  'Oktober',
  'November',
  'Desember',
] as const;

/** 1660008900 -> "1.660.008.900"; -0,14 -> "-0,14". */
export function angkaId(nilai: number): string {
  const negatif = nilai < 0;
  const mutlak = Math.abs(nilai);
  const bulat = Math.trunc(mutlak);
  const pecahan = mutlak - bulat;
  let utuh = String(bulat).replace(/\B(?=(\d{3})+(?!\d))/g, '.');
  if (pecahan > 0) {
    const desimal = String(Math.round(pecahan * 1e6) / 1e6).slice(2);
    utuh += ',' + desimal;
  }
  return (negatif ? '-' : '') + utuh;
}

/** "Rp178" / "Rp0,14". */
export function rupiah(nilai: number): string {
  return 'Rp' + angkaId(nilai);
}

/** "2025-10-08" -> "8 Oktober 2025". Tanggal tidak lengkap dikembalikan apa adanya. */
export function tanggalId(iso: string): string {
  const cocok = /^(\d{4})-(\d{2})-(\d{2})/.exec(iso);
  if (cocok === null) return iso;
  const tahun = cocok[1] ?? '';
  const bulan = BULAN[Number(cocok[2]) - 1];
  const hari = String(Number(cocok[3]));
  if (bulan === undefined) return iso;
  return `${hari} ${bulan} ${tahun}`;
}

/** "2025-10-26T22:50:48" -> "26 Oktober 2025 pukul 22.50". */
export function waktuId(iso: string): string {
  const jam = /T(\d{2}):(\d{2})/.exec(iso);
  const tanggal = tanggalId(iso);
  if (jam === null) return tanggal;
  return `${tanggal} pukul ${jam[1] ?? ''}.${jam[2] ?? ''}`;
}
