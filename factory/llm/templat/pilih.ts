/**
 * Pemilih pola (M2d-10 D-1): pola dipilih otomatis menurut fakta yang
 * tersedia di paket. Aturannya tertulis dan dites:
 *
 * 1. Calon = semua rencana dari semua pola yang LOLOS bukti kunci tunggal,
 *    urut `URUTAN_POLA`.
 * 2. Tiga posisi diisi rakus menurut urutan: pola berbeda dan kartu penentu
 *    tidak beririsan dengan posisi lain.
 * 3. Bila ketiganya berklaim Keliru, posisi terakhir diganti calon pertama
 *    berklaim Betul yang memenuhi aturan 2 (validator: minimal satu Betul).
 * 4. Pengganti sebuah posisi (rencana habis) = calon berikutnya yang belum
 *    dipakai dan memenuhi aturan 2 terhadap posisi lain; bila posisi itu satu-
 *    satunya yang berklaim Betul, penggantinya juga harus Betul.
 */
import type { PaketFakta } from '../paket.ts';
import { buktiKunciTunggal } from './bukti.ts';
import { semuaRencana, type IdPola, type RencanaSoal } from './pola.ts';

export const kunciRencana = (r: RencanaSoal): string => `${r.pola}:${r.sudut}`;

/** Calon yang lolos bukti, urut pola. */
export function calonRencana(paket: PaketFakta): RencanaSoal[] {
  return semuaRencana(paket).filter((r) => buktiKunciTunggal(r, paket).sah);
}

function cocok(r: RencanaSoal, lain: readonly RencanaSoal[]): boolean {
  return lain.every((x) => x.pola !== r.pola && !x.kartu_penentu.some((id) => r.kartu_penentu.includes(id)));
}

export interface PilihanSimulasi {
  posisi: RencanaSoal[];
  calon: RencanaSoal[];
  alasan: string[];
}

export function pilihRencanaSimulasi(paket: PaketFakta, calon: RencanaSoal[] = calonRencana(paket)): PilihanSimulasi {
  const alasan: string[] = [`${String(calon.length)} calon rencana lolos bukti kunci tunggal: ${calon.map(kunciRencana).join(', ') || '(tidak ada)'}`];
  const posisi: RencanaSoal[] = [];
  for (const r of calon) {
    if (posisi.length === 3) break;
    if (cocok(r, posisi)) posisi.push(r);
  }
  if (posisi.length === 3 && !posisi.some((r) => r.klaim.label === 'Betul')) {
    const dua = posisi.slice(0, 2);
    const betul = calon.find((r) => r.klaim.label === 'Betul' && cocok(r, dua));
    if (betul !== undefined) {
      alasan.push(`ketiga posisi berklaim Keliru; posisi 3 diganti ${kunciRencana(betul)} (klaim Betul)`);
      posisi[2] = betul;
    } else {
      alasan.push('ketiga posisi berklaim Keliru dan tidak ada calon Betul yang cocok');
      posisi.pop();
    }
  }
  alasan.push(`posisi: ${posisi.map(kunciRencana).join(', ')}`);
  return { posisi, calon, alasan };
}

/** Pengganti satu posisi (aturan 4). `null` = tidak ada. */
export function penggantiRencana(calon: readonly RencanaSoal[], dipakai: ReadonlySet<string>, posisiLain: readonly RencanaSoal[], perluBetul: boolean): RencanaSoal | null {
  return calon.find((r) => !dipakai.has(kunciRencana(r)) && cocok(r, posisiLain) && (!perluBetul || r.klaim.label === 'Betul')) ?? null;
}

/** Pola soal pertama tayang (pemanasan), urut pra-registrasi §5. */
export const POLA_PEMANASAN: readonly IdPola[] = ['sebab-resmi', 'angka-lain-waktu'];

export function pilihRencanaPemanasan(paket: PaketFakta, calon: RencanaSoal[] = calonRencana(paket)): RencanaSoal | null {
  for (const p of POLA_PEMANASAN) {
    const r = calon.find((x) => x.pola === p && x.kartu.length === 2);
    if (r !== undefined) return r;
  }
  return null;
}
