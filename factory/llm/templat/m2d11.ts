/**
 * Bagian mesin templat khusus M2d-11 (pra-registrasi §5): calon rencana
 * berlabel, pilihan varian awal yang bersih detektor, setelan tumpukan.
 */
import { AMBANG_M2D11 } from '../cacat/ambang.ts';
import { deteksi, menolak, type AmbangCacat } from '../cacat/detektor.ts';
import type { KunciOpsi } from '../draf.ts';
import type { PaketFakta } from '../paket.ts';
import { KRITIKUS_TINGKAT_1, type SetelanTumpukan } from './gerbang.ts';
import { buktiKunciTunggal } from './bukti.ts';
import { rencanaBerlabel } from './label.ts';
import { calonRencana } from './pilih.ts';
import type { RencanaSoal, VarianPilihan } from './pola.ts';
import { hurufSlot, SLOT, type PilihanAktif } from './rakit.ts';

/** Kritikus tingkat 1 (syarat 6); penebak & kartu M2d-11 memakai protokol rotasi (selalu menolak). */
export const SETELAN_TEMPLAT_M2D11: SetelanTumpukan = {
  penebak: { aturan: 'dua-dari-tiga', ambangHaiku: null },
  kartu: 'menolak',
  kritikus: { jenis: KRITIKUS_TINGKAT_1, dicatat: false },
};

/**
 * Teks templat M2d-11 (perubahan kata, bukan patokan; pra-registrasi §6):
 * besaran-hitungan P2a tanpa angka selisih — angka rupiah di satu pengecoh
 * membuat tiga opsi berangka tunggal yang tak urut (detektor D9) di posisi
 * kunci mana pun. Templat M2d-10 tidak berubah.
 */
export function teksM2d11(r: RencanaSoal): RencanaSoal {
  if (r.pola !== 'besaran-hitungan') return r;
  const slot = r.slot.map((s) =>
    s.slot !== 'p2'
      ? s
      : {
          ...s,
          varian: s.varian.map((v) =>
            v.id !== 'P2a' ? v : { ...v, teks: v.teks.replace(/^Keliru, naiknya cuma \[\[[^\]]+\]\], bukan (.+) kali lipat\.$/, 'Keliru, yang bertambah cuma selisih rupiahnya, bukan $1 kali lipat.') },
          ),
        },
  ) as RencanaSoal['slot'];
  return { ...r, slot };
}

/** Calon rencana yang lolos bukti kunci tunggal DAN punya label pengecoh sah (varian tak sah dibuang). Murni. */
export function calonRencanaM2d11(paket: PaketFakta): RencanaSoal[] {
  return calonRencana(paket)
    .map((r) => teksM2d11(r))
    .filter((r) => buktiKunciTunggal(r, paket).sah)
    .map((r) => rencanaBerlabel(r, paket).rencana)
    .filter((r): r is RencanaSoal => r !== null);
}

/**
 * Pilihan varian awal: kombinasi pertama (urut indeks varian per slot) yang
 * tidak punya bendera detektor menolak dari pilihan saja (pesan belum ada);
 * tidak ada → varian bawaan. Murni.
 */
export function pilihVarianBersih(r: RencanaSoal, hurufKunci: KunciOpsi, ambang: AmbangCacat = AMBANG_M2D11): PilihanAktif {
  const peta = hurufSlot(hurufKunci);
  const daftar = r.slot.map((s) => s.varian);
  const kombinasi = (i: number): VarianPilihan[] | null => {
    const hasil: VarianPilihan[] = [];
    let x = i;
    for (const v of daftar) {
      hasil.push(v[x % v.length] as VarianPilihan);
      x = Math.floor(x / v.length);
    }
    return x > 0 ? null : hasil;
  };
  const total = daftar.reduce((a, v) => a * v.length, 1);
  for (let i = 0; i < total; i++) {
    const k = kombinasi(i);
    if (k === null) break;
    const pilihan = {} as Record<KunciOpsi, string>;
    SLOT.forEach((s, j) => {
      pilihan[peta[s]] = (k[j] as VarianPilihan).teks;
    });
    if (menolak(deteksi({ pesan: '', pilihan, kunci: hurufKunci }, ambang)).length === 0) {
      return Object.fromEntries(SLOT.map((s, j) => [s, k[j]])) as PilihanAktif;
    }
  }
  return Object.fromEntries(r.slot.map((s) => [s.slot, s.varian[0]])) as PilihanAktif;
}
