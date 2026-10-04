/**
 * Pemeran tetap (M2d-18, keputusan pemilik 3 Okt 2026): nama teman di omongan
 * buatan agen diambil dari SATU daftar tetap — tiga perempuan, tiga laki-laki —
 * seperti maskot. KODE yang memasang nama; agen tidak pernah ditolak karena
 * nama. Lima nama sudah dikenal pemain dari simulasi tayang.
 */
import type { PaketFakta } from '../paket.ts';
import type { MasalahKodeBebas } from '../bebas/mesin.ts';
import { periksaKodeV3 } from '../bebas/prompt-v3.ts';
import type { OmonganBebas } from '../bebas/skema.ts';

export const PEMERAN_PEREMPUAN = ['Rara', 'Nadia', 'Zahra'] as const;
export const PEMERAN_LAKI = ['Bayu', 'Dimas', 'Rio'] as const;
/** Urutan pasang: berselang perempuan–laki-laki. */
export const PEMERAN: readonly string[] = [PEMERAN_PEREMPUAN[0], PEMERAN_LAKI[0], PEMERAN_PEREMPUAN[1], PEMERAN_LAKI[1], PEMERAN_PEREMPUAN[2], PEMERAN_LAKI[2]];

const sama = (a: string, b: string): boolean => a.trim().toLowerCase() === b.trim().toLowerCase();

/**
 * Pasang nama pemeran. Nama yang ditulis agen dipertahankan bila ia pemeran dan
 * belum dipakai omongan lain di bank; selain itu pemeran pertama yang belum
 * dipakai. Semua terpakai → pemeran pertama. Murni; tidak mengubah `o`.
 */
export function pasangNama(o: OmonganBebas, terpakai: readonly string[]): OmonganBebas {
  const bebas = PEMERAN.filter((n) => !terpakai.some((t) => sama(t, n)));
  const tetap = bebas.find((n) => sama(n, o.nama));
  const nama = tetap ?? bebas[0] ?? (PEMERAN[0] as string);
  return nama === o.nama ? o : { ...o, nama };
}

const SOAL_NAMA = /NAMA_TERLARANG/;

/**
 * Satu pelanggaran = satu baris (M2d-20). Dua pasang aturan melaporkan hal yang
 * sama dua kali: label tak dua-dua (`OPSI_TAK_DUA_DUA` + detektor D8) dan angka
 * tanpa rujukan di pilihan/penjelasan (`ANGKA_TANPA_RUJUKAN` + `angka-di-kartu`).
 * Yang dibuang hanya salinan keduanya; pelanggarannya tetap dilaporkan.
 */
function tanpaGanda(m: MasalahKodeBebas[]): MasalahKodeBebas[] {
  const teks = (x: MasalahKodeBebas): string => `${x.sumber}: ${x.alasan}`;
  const adaDuaDua = m.some((x) => /OPSI_TAK_DUA_DUA/.test(teks(x)));
  const bagianBerangka = new Set(m.flatMap((x) => { const c = /ANGKA_TANPA_RUJUKAN: (Pilihan [a-d]|Penjelasan)/.exec(teks(x)); return c === null ? [] : [(c[1] as string).toLowerCase()]; }));
  return m.filter((x) => {
    const t = teks(x);
    if (adaDuaDua && /detektor D8/.test(t)) return false;
    const c = /angka-di-kartu: (pilihan [a-d]|penjelasan):/.exec(t);
    return !(c !== null && bagianBerangka.has(c[1] as string));
  });
}

/** Gerbang kode untuk jalur agen: `periksaKodeV3` tanpa penolakan nama (nama dipasang kode). */
export function periksaKodeAgen(o: OmonganBebas, paket: PaketFakta): { menolak: MasalahKodeBebas[]; dicatat: MasalahKodeBebas[] } {
  const k = periksaKodeV3(o, paket);
  return { menolak: tanpaGanda(k.menolak.filter((m) => !SOAL_NAMA.test(`${m.sumber} ${m.alasan}`))), dicatat: k.dicatat };
}
