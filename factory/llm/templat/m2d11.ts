/**
 * Bagian mesin templat khusus M2d-11 (pra-registrasi §5): calon rencana
 * berlabel, pilihan varian awal yang bersih detektor, setelan tumpukan.
 */
import { AMBANG_M2D11 } from '../cacat/ambang.ts';
import { deteksi, menolak, type AmbangCacat } from '../cacat/detektor.ts';
import type { KunciOpsi } from '../draf.ts';
import type { PaketFakta } from '../paket.ts';
import { KRITIKUS_TINGKAT_1, type SetelanTumpukan } from './gerbang.ts';
import { rupiah } from '../../format.ts';
import { buktiKunciTunggal } from './bukti.ts';
import { hargaHarian } from './fakta.ts';
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
export function teksM2d11(r: RencanaSoal, paket?: PaketFakta): RencanaSoal {
  if (r.pola === 'angka-lain-waktu' && paket !== undefined) return angkaSeimbang(r, paket);
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

/**
 * Perubahan templat 1 (sesudah jalan TIRT M2d-11 #1, sebelum #2; kata/struktur
 * templat, bukan patokan — pra-registrasi §6): di angka-lain-waktu, pengecoh
 * koreksi p3 memakai harga penutupan NYATA hari lain yang jaraknya ke angka
 * teman paling mirip dengan jarak kunci ke angka teman (boleh di sisi lain).
 * Alasan dari jejak #1: ketiga keluarga memilih koreksi Rp106 (kunci, +9 dari
 * Rp97) dan menghindari Rp115 (andaian, +18) — "koreksi yang paling masuk
 * akal" membocorkan kunci (24 jawaban per versi, 3 versi, isi kunci konsisten
 * di Haiku/GLM). Murni.
 */
export function angkaSeimbang(r: RencanaSoal, paket: PaketFakta): RencanaSoal {
  const kunci = r.slot[0].varian[0];
  if (kunci === undefined || kunci.proposisi.k !== 'nilai') return r;
  const f1 = kunci.proposisi.fact_id;
  const v1 = kunci.proposisi.nilai;
  const v0 = r.klaim.angka[0]?.fact_id === undefined ? null : (paket.fakta.find((f) => f.fact_id === r.klaim.angka[0]?.fact_id)?.nilai ?? null);
  if (typeof v0 !== 'number') return r;
  const d = Math.abs(v1 - v0);
  const calon = hargaHarian(paket)
    .filter((h) => h.tanggal <= paket.tanggal_t && h.fact_id !== f1 && h.nilai !== v0 && h.nilai !== v1)
    .sort((a, b) => Math.abs(Math.abs(a.nilai - v0) - d) - Math.abs(Math.abs(b.nilai - v0) - d) || a.fact_id.localeCompare(b.fact_id));
  const alt = calon[0];
  if (alt === undefined) return r;
  const tokKunci = `[[${f1}|${rupiah(v1)}]]`;
  const slot = r.slot.map((s) =>
    s.slot !== 'p3'
      ? s
      : {
          ...s,
          varian: r.slot[0].varian.map((k, i) => ({
            ...(s.varian[i] ?? (s.varian[0] as VarianPilihan)),
            proposisi: { k: 'nilai' as const, fact_id: f1, nilai: alt.nilai },
            teks: k.teks.replace(tokKunci, `[[${alt.fact_id}|${rupiah(alt.nilai)}]]`),
          })),
        },
  ) as RencanaSoal['slot'];
  const rujukan = [...new Set([...r.rujukan_penjelasan.filter((t) => !t.startsWith('[[misal|')), `[[${alt.fact_id}|${rupiah(alt.nilai)}]]`])];
  return { ...r, slot, rujukan_penjelasan: rujukan };
}

/** Calon rencana yang lolos bukti kunci tunggal DAN punya label pengecoh sah (varian tak sah dibuang). Murni. */
export function calonRencanaM2d11(paket: PaketFakta): RencanaSoal[] {
  return calonRencana(paket)
    .map((r) => teksM2d11(r, paket))
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
