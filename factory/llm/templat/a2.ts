/**
 * Amandemen A-2 M2d-10 (pra-registrasi `docs/bukti/m2d10-praregistrasi-a2.md`):
 * tiga pemeriksaan kode baru yang lahir dari temuan jalan A-1.
 *
 * 1. **G-klaim-tambahan** — pesan teman tidak boleh memuat klaim pribadi atau
 *    kabar tanpa sumber yang tak bisa dicek kartu ("gw hafal…", "dari dulu…",
 *    "katanya…", "temen gw…", "grup sebelah", "bocoran", "udah itung sendiri",
 *    "kalian baru sadar", "ini gila"). Polanya diambil dari jejak M2d-8…A-1;
 *    keenam pesan soal tayang (Claude + pemilik) lolos tanpa pengecualian.
 *    "pasti" TIDAK masuk daftar: di soal tayang ia bagian dari klaim yang dicek
 *    ("Pasti mau dibeli investor asing"); penilaian "pasti naik" sudah dijaga
 *    G-penilaian.
 * 2. **Kebocoran kalender** — bila pilihan kunci menyebut hitungan hari
 *    ("9 hari bursa") dan dua tanggal yang tampil TANPA kartu (pesan + empat
 *    pilihan) mengapit rentang yang jumlah hari kerjanya k (inklusif) dengan
 *    n = k atau n = k − 1, hitungan itu bisa diturunkan tanpa kartu → tolak.
 * 3. **Pengecoh besaran dekat** — pengecoh angka pola besaran-hitungan harus
 *    salah tetapi dekat: 0 < |v − benar| / benar ≤ 15 % (aturan jarak),
 *    diambil dari rasio dua harga penutupan NYATA di paket (periode lain).
 */
import { teksPolos } from '../../skema/rujukan.ts';
import { tanggalDalam } from '../angka.ts';
import type { KunciOpsi, OmonganDraf } from '../draf.ts';
import type { PaketFakta } from '../paket.ts';

/* ---------------------------------------------------------------------- */
/* 1. G-klaim-tambahan                                                     */
/* ---------------------------------------------------------------------- */

export const POLA_KLAIM_TAMBAHAN: ReadonlyArray<{ pola: RegExp; alasan: string }> = [
  { pola: /(?<!\p{L})hafal(?!\p{L})/iu, alasan: 'mengaku hafal (angka/pola) — pengetahuan pribadi, tak bisa dicek kartu' },
  { pola: /(?<!\p{L})dari dulu(?!\p{L})/iu, alasan: '"dari dulu …" — klaim riwayat pribadi, tak bisa dicek kartu' },
  { pola: /(?<!\p{L})(tau|tahu) (duluan|polanya)(?!\p{L})/iu, alasan: 'mengaku sudah tahu duluan / tahu polanya — tak bisa dicek kartu' },
  { pola: /(?<!\p{L})pola (beginian|gini|begini|kayak gini)(?!\p{L})/iu, alasan: '"pola beginian" — klaim pengalaman, tak bisa dicek kartu' },
  { pola: /(?<!\p{L})(katanya|kata orang|kata temen)(?!\p{L})/iu, alasan: '"katanya …" — kabar tanpa sumber' },
  { pola: /(?<!\p{L})temen (gw|gue|aku|gua)(?!\p{L})/iu, alasan: 'kabar dari teman — sumber di luar kartu' },
  { pola: /(?<!\p{L})grup sebelah(?!\p{L})/iu, alasan: 'kabar dari grup lain — sumber di luar kartu' },
  { pola: /(?<!\p{L})(bocoran|insider|rumor|gosip)(?!\p{L})/iu, alasan: 'bocoran/rumor — sumber di luar kartu' },
  { pola: /(?<!\p{L})(info|kabar) (dari )?orang dalam(?!\p{L})/iu, alasan: 'info orang dalam — sumber di luar kartu' },
  { pola: /(?<!\p{L})(udah|sudah) (itung|hitung|cek)(?!\p{L})|(?<!\p{L})(itung|hitung|cek) sendiri(?!\p{L})/iu, alasan: 'mengaku sudah menghitung/mengecek sendiri — tak bisa dicek kartu' },
  { pola: /(?<!\p{L})dari (semalem|semalam)(?!\p{L})/iu, alasan: 'klaim kegiatan pribadi — tak bisa dicek kartu' },
  { pola: /(?<!\p{L})baru (sadar|ngeh)(?!\p{L})/iu, alasan: '"kalian baru sadar" — klaim tentang orang lain, tak bisa dicek kartu' },
  { pola: /(?<!\p{L})gila(?!\p{L})/iu, alasan: '"gila" — penilaian yang tak bisa dicek kartu (ditandai 3/3 penguji kartu, M2d-10)' },
];

/** Klaim tambahan di pesan teman. Kosong = bersih. Murni. */
export function gKlaimTambahan(pesan: string): string[] {
  const t = teksPolos(pesan);
  return POLA_KLAIM_TAMBAHAN.filter((p) => p.pola.test(t)).map((p) => `G-klaim-tambahan: "${(p.pola.exec(t)?.[0] ?? '').trim()}" — ${p.alasan}; hapus bagian itu, pesan hanya berisi klaim yang dicek kartu (perasaan pribadi boleh)`);
}

/* ---------------------------------------------------------------------- */
/* 2. kebocoran kalender                                                   */
/* ---------------------------------------------------------------------- */

/** Hari kerja (Senin–Jumat) inklusif antara dua tanggal ISO. */
export function hariKerjaInklusif(a: string, b: string): number {
  const d = new Date(`${a}T00:00:00Z`);
  const akhir = new Date(`${b}T00:00:00Z`);
  let n = 0;
  while (d.getTime() <= akhir.getTime()) {
    const h = d.getUTCDay();
    if (h !== 0 && h !== 6) n += 1;
    d.setUTCDate(d.getUTCDate() + 1);
  }
  return n;
}

const POLA_HITUNGAN_HARI = /(\d+)\s*hari(\s*bursa)?/i;

/** Hitungan hari di pilihan kunci yang bisa diturunkan dari tanggal yang tampil tanpa kartu. Murni. */
export function bocorKalender(o: Pick<OmonganDraf, 'pesan' | 'pilihan' | 'kunci'>, paket: Pick<PaketFakta, 'tanggal_t'>): string[] {
  const kunci = teksPolos(o.pilihan[o.kunci]);
  const m = POLA_HITUNGAN_HARI.exec(kunci);
  if (m === null) return [];
  const n = Number(m[1]);
  const tahunT = Number(paket.tanggal_t.slice(0, 4));
  const tampil = [teksPolos(o.pesan), ...(['a', 'b', 'c', 'd'] as KunciOpsi[]).map((h) => teksPolos(o.pilihan[h]))].join(' \n ');
  const iso = [
    ...new Set(
      tanggalDalam(tampil)
        .filter((t) => t.hari !== null && t.bulan !== null)
        .map((t) => `${String(t.tahun ?? tahunT)}-${String(t.bulan).padStart(2, '0')}-${String(t.hari).padStart(2, '0')}`),
    ),
  ].sort();
  const hasil: string[] = [];
  for (let i = 0; i < iso.length; i++) {
    for (let j = i + 1; j < iso.length; j++) {
      const a = iso[i] as string;
      const b = iso[j] as string;
      const k = hariKerjaInklusif(a, b);
      if (n === k || n === k - 1) hasil.push(`kebocoran kalender: pilihan kunci menyebut "${m[0]}", dan tanggal yang tampil tanpa kartu (${a} … ${b}, ${String(k)} hari kerja) cukup untuk menghitungnya; jangan tampilkan kedua ujung rentang`);
    }
  }
  return hasil;
}

/* ---------------------------------------------------------------------- */
/* 3. pengecoh besaran dekat                                               */
/* ---------------------------------------------------------------------- */

export const JARAK_PENGECOH_MAKS = 0.15;

/** Pengecoh angka "dekat tetapi salah": 0 < |v − benar| / benar ≤ 15 % (setelah dibulatkan 2 desimal). Murni. */
export function pengecohDekat(v: number, benar: number): boolean {
  const a = Math.round(v * 100) / 100;
  const b = Math.round(benar * 100) / 100;
  if (!Number.isFinite(a) || !Number.isFinite(b) || b === 0 || a === b) return false;
  return Math.abs(a - b) / Math.abs(b) <= JARAK_PENGECOH_MAKS + 1e-9;
}

/**
 * Calon pengecoh kelipatan dari rasio dua harga penutupan NYATA di paket
 * (periode lain), dekat tetapi salah. Urut: yang sisinya sama dengan ambang
 * klaim (≥ n, supaya tetap cocok dengan omongan teman) lebih dulu, lalu yang
 * paling jauh di dalam jendela 15 %, lalu fact_id. Murni.
 */
export function calonPengecohKelipatan(harga: ReadonlyArray<{ fact_id: string; tanggal: string; nilai: number }>, benar: number, ambang: number, terlarang: ReadonlySet<number>): Array<{ nilai: number; dari: string; ke: string }> {
  const calon: Array<{ nilai: number; dari: string; ke: string }> = [];
  for (const a of harga) {
    for (const b of harga) {
      if (b.tanggal <= a.tanggal || a.nilai <= 0) continue;
      const v = Math.round((b.nilai / a.nilai) * 100) / 100;
      if (!pengecohDekat(v, benar) || terlarang.has(v) || calon.some((c) => c.nilai === v)) continue;
      calon.push({ nilai: v, dari: a.fact_id, ke: b.fact_id });
    }
  }
  const b = Math.round(benar * 100) / 100;
  return calon.sort((x, y) => Number(y.nilai >= ambang) - Number(x.nilai >= ambang) || Math.abs(y.nilai - b) - Math.abs(x.nilai - b) || x.dari.localeCompare(y.dari) || x.ke.localeCompare(y.ke));
}
