/**
 * Kata-kata dan hitungan halaman "Dapur agen" (M3.13 D-4), sebagai fungsi murni.
 *
 * Datanya (`dapur-data.json`) dibangun `node --experimental-strip-types alat/dapur.ts` dari jejak mentah
 * lingkar agen; fungsi di sini hanya MEMILIH dan MENATA apa yang ada di sana.
 * Tidak ada angka yang diketik: status, jumlah penolakan per peran, dan waktu
 * semuanya dihitung dari data, jadi halaman ini ikut berubah kalau jejaknya
 * dibangun ulang.
 *
 * Satu batas kata yang dijaga di sini dan di `dapur.test.ts`: halaman ini
 * TIDAK boleh terbaca seolah simulasi yang dimainkan ditulis AI. Simulasi yang
 * tayang disusun Claude bersama pemilik lalu disetujui manusia; draf agen belum pernah dimainkan siapa pun.
 */
import { tanggalSingkat } from './tanggal.ts';

/** Bentuk data — cermin `alat/dapur.ts` (yang membangunnya dari jejak). */
export interface PeranDapur {
  peran: string;
  model: string | null;
  langkah: number;
  panggilan: number;
  putusan: Record<string, number>;
}

export interface PenolakanDapur {
  no: number;
  putaran: number;
  omongan: number | null;
  peran: string;
  jenis: string;
  alasan: string[];
}

export interface DrafDapur {
  nama: string;
  jam: string;
  pesan: string;
  pilihan: Record<string, string>;
  kunci: string;
  penjelasan: string;
}

export interface JalanDapur {
  id: string;
  milestone: string;
  folder: string;
  simulasi: { nama_samaran: string; tanggal_t: string; peristiwa: string };
  terbit: boolean;
  berhenti: string | null;
  mulai: string;
  selesai: string;
  durasi_ms: number;
  putaran: number;
  panggilan: number;
  token_masuk: number;
  token_keluar: number;
  biaya_usd: number | null;
  pemeriksaan: {
    aturan_dijalankan: number;
    aturan_dilewati: number;
    temuan: number;
    fakta_lolos: number;
    fakta_tersingkir: number;
    tersingkir: Array<{ fact_id: string; alasan: string }>;
  };
  peran: PeranDapur[];
  sudut: Array<{
    omongan: number;
    riwayat: Array<{ ke: number; fact_id: string; hasil: string; putaran_mulai: number; putaran_akhir: number }>;
  }>;
  penolakan: PenolakanDapur[];
  draf: DrafDapur[] | null;
  uji_luar: Array<{
    omongan: number;
    kunci: string;
    tebak_benar: number;
    tebak_n: number;
    kartu_benar: number;
    kartu_n: number;
  }> | null;
  alami: { agen: number; manusia: number; penilai: number } | null;
}

/** Jalan atas simulasi yang tayang: angka saja (Amandemen A-1). */
export interface AgregatDapur {
  id: string;
  milestone: string;
  terbit: boolean;
  putaran: number;
  versi: number;
  penolakan: Array<{ peran: string; tolak: number }>;
}

export interface DataDapur {
  keterangan: string;
  sumber: string[];
  jalan: JalanDapur[];
  agregat: AgregatDapur[];
}

/**
 * Satu baris jalan agregat, tanpa nama, tanggal, atau isi apa pun:
 * "Jalan M2d-4: tidak terbit · 11 putaran · 27 kali penulis menulis · penolakan: …" (langkah penulis berputusan "ditulis", termasuk panggilan cadangan).
 */
export function kalimatAgregat(a: AgregatDapur): string {
  const status = a.terbit ? 'lolos semua penjaga, belum dimainkan' : 'tidak terbit';
  const tolak = a.penolakan.map((p) => `${namaPeran(p.peran)} ${String(p.tolak)}`).join(', ');
  return (
    `Jalan ${a.milestone}: ${status} · ${String(a.putaran)} putaran · ${String(a.versi)} kali penulis menulis` +
    (tolak === '' ? '' : ` · penolakan: ${tolak}`)
  );
}

/** Parameter URL halaman ini: `?dapur`. Nilainya tidak dibaca; keberadaannya cukup. */
export const PARAM_DAPUR = 'dapur';

/** Apakah alamat ini meminta halaman dapur, bukan permainan. */
export function mintaDapur(pencarian: string): boolean {
  return new URLSearchParams(pencarian).has(PARAM_DAPUR);
}

/** Nama peran untuk pemain (nama di jejak memakai tanda hubung). */
export const NAMA_PERAN: Readonly<Record<string, string>> = {
  perencana: 'Perencana',
  penulis: 'Penulis',
  pemeriksa: 'Pemeriksa',
  'pembaca-kartu': 'Pembaca kartu',
  kritikus: 'Kritikus',
  penebak: 'Penebak ×3',
};

export function namaPeran(peran: string): string {
  return NAMA_PERAN[peran] ?? peran;
}

export type JenisStatus = 'draf' | 'ditolak';

/**
 * Status jujur satu jalan. "Terbit" di jejak berarti lolos semua penjaga di
 * lingkar dalam — BUKAN tayang: tidak ada draf agen di `cases/`.
 */
export function statusJalan(jalan: JalanDapur): { jenis: JenisStatus; label: string } {
  return jalan.terbit
    ? { jenis: 'draf', label: 'Draf — lolos semua penjaga, belum dimainkan' }
    : { jenis: 'ditolak', label: 'Ditolak — tidak terbit' };
}

/** Siapa menolak berapa kali, dari yang terbanyak; peran tanpa penolakan tidak ikut. */
export function tolakPerPeran(jalan: JalanDapur): Array<{ peran: string; tolak: number }> {
  return jalan.peran
    .map((p) => ({ peran: p.peran, tolak: p.putusan['tolak'] ?? 0 }))
    .filter((p) => p.tolak > 0)
    .sort((a, b) => b.tolak - a.tolak);
}

/** Lama jalan dalam menit penuh, dibulatkan ke terdekat. */
export function menit(ms: number): number {
  return Math.round(ms / 60_000);
}

/** "US$1,84" — dua desimal, koma desimal. */
export function dolar(nilai: number): string {
  return `US$${nilai.toFixed(2).replace('.', ',')}`;
}

/** "3,0" — satu desimal, koma desimal. */
export function satuDesimal(nilai: number): string {
  return nilai.toFixed(1).replace('.', ',');
}

/**
 * Judul satu jalan (kritik D-5 butir 6): "Jalan agen: data Perusahaan U" —
 * bukan "Perusahaan U · 4 Mei 2026", yang terbaca seperti judul simulasi
 * yang dimainkan. Tanggalnya tanggal DATA, dieja terpisah (`tanggalData`).
 */
export function judulJalan(jalan: JalanDapur): string {
  return `Jalan agen: data ${jalan.simulasi.nama_samaran}`;
}

export function tanggalData(jalan: JalanDapur): string {
  return tanggalSingkat(jalan.simulasi.tanggal_t);
}

/** Satu baris angka jalan (meta): putaran · panggilan · menit · biaya. */
export function barisAngka(jalan: JalanDapur): string {
  return [
    `${String(jalan.putaran)} putaran`,
    `${String(jalan.panggilan)} panggilan model`,
    `${String(menit(jalan.durasi_ms))} menit`,
    jalan.biaya_usd === null ? 'biaya nyata tidak tercatat' : `${dolar(jalan.biaya_usd)} biaya nyata`,
  ].join(' · ');
}

/** Keterangan satu penolakan: "putaran 3 · omongan 2 · Pemeriksa". */
export function kepalaPenolakan(p: PenolakanDapur): string {
  const bagian = [`putaran ${String(p.putaran)}`];
  if (p.omongan !== null) bagian.push(`omongan ${String(p.omongan)}`);
  bagian.push(namaPeran(p.peran));
  return bagian.join(' · ');
}

/** Berapa contoh penolakan yang tampil sebelum lipatan "Lihat semua" (kritik D-5 butir 4). */
export const PENOLAKAN_TERLIHAT = 2;

/**
 * Contoh penolakan yang tampil tanpa dibuka: yang TERPENDEK (kritik D-5 butir
 * 4), urut menurut nomor langkahnya. Isinya tidak dipotong; yang panjang tetap
 * utuh di lipatan "Lihat semua".
 */
export function contohPenolakan(jalan: JalanDapur): PenolakanDapur[] {
  const panjang = (p: PenolakanDapur): number => p.alasan.join(' ').length;
  return [...jalan.penolakan]
    .sort((a, b) => panjang(a) - panjang(b) || a.no - b.no)
    .slice(0, PENOLAKAN_TERLIHAT)
    .sort((a, b) => a.no - b.no);
}

/** Kalimat pintu masuk di layar lain (M3.13 D-4): pendek, tidak mengganggu alur main. */
export const TAUTAN_DAPUR = 'Lihat dapur agen AI kami';

/** Jumlah hasil penguji luar atas semua omongan satu jalan; `null` bila tidak diuji. */
export function ringkasUjiLuar(
  jalan: JalanDapur,
): { tebak_benar: number; tebak_n: number; kartu_benar: number; kartu_n: number } | null {
  if (jalan.uji_luar === null || jalan.uji_luar.length === 0) return null;
  const jumlah = (f: (x: NonNullable<JalanDapur['uji_luar']>[number]) => number): number =>
    (jalan.uji_luar ?? []).reduce((j, x) => j + f(x), 0);
  return {
    tebak_benar: jumlah((x) => x.tebak_benar),
    tebak_n: jumlah((x) => x.tebak_n),
    kartu_benar: jumlah((x) => x.kartu_benar),
    kartu_n: jumlah((x) => x.kartu_n),
  };
}

/* ------------------------------------------------------------------ */
/* M3.14 D-4 — dapur yang lebih visual, kode internal diterjemahkan    */
/* ------------------------------------------------------------------ */

/*
 * Aturannya satu: tampilan utama TIDAK memuat kode internal jejak
 * ("TIDAK_LENGKAP", "R19a", "[AJAKAN_TRANSAKSI]", "[kritikus: …]", slug fakta
 * seperti "hari-naik-beruntun", "M2d-6"). Kode itu diterjemahkan ke kalimat
 * awam lewat templat di bawah — dan setiap angka serta setiap potongan yang
 * dikutip tetap diambil dari jejak apa adanya (dites: kutipan awam = potongan
 * huruf demi huruf dari alasan mentahnya). Alasan mentah utuhnya pindah ke
 * lipatan "Rincian teknis".
 */

/** Label kode pemeriksa (validator kode) dalam bahasa awam. */
export const AWAM_KODE: Readonly<Record<string, string>> = {
  AJAKAN_TRANSAKSI: 'ada ajakan membeli atau menjual',
  ANGKA_TANPA_RUJUKAN: 'ada angka tanpa sumber',
  KATA_PENILAIAN: 'ada kata penilaian saham',
  PILIHAN_TIMPANG: 'panjang pilihan tidak seimbang',
};

/** Kategori keberatan kritikus dalam bahasa awam. */
export const AWAM_KRITIK: Readonly<Record<string, string>> = {
  tertebak: 'kuncinya bisa ditebak tanpa kartu',
  kunci: 'lebih dari satu pilihan benar',
  aturan: 'melanggar aturan tulis',
  ambigu: 'kalimatnya bisa dibaca dua arti',
  arahan: 'saran untuk penulis',
};

export interface AlasanAwam {
  /** Label pendek untuk garis waktu: "tertebak", "ganti fakta", … */
  label: string;
  /** Kalimat awam: templat + angka dari jejak. */
  kalimat: string;
  /** Potongan alasan mentah yang dikutip (huruf demi huruf, tanpa kode), atau `null`. */
  kutipan: string | null;
}

/** Nomor omongan sebuah penolakan: medan `omongan`, atau "omongan N:" di alasannya. */
export function omonganPenolakan(p: PenolakanDapur): number[] {
  if (p.omongan !== null) return [p.omongan];
  const nomor = new Set<number>();
  for (const a of p.alasan) {
    const m = /^omongan (\d+)[: ]/.exec(a);
    if (m !== null) nomor.add(Number(m[1]));
  }
  return [...nomor].sort((a, b) => a - b);
}

/** Satu alasan mentah → kalimat awam. */
export function awamAlasan(peran: string, alasan: string): AlasanAwam {
  const tebak = /^(\d+)\/(\d+) penebak TANPA kartu memilih kunci "([a-z])"/.exec(alasan);
  if (tebak !== null) {
    return {
      label: 'tertebak',
      kalimat:
        `${tebak[1] ?? ''} dari ${tebak[2] ?? ''} penebak yang tidak melihat kartu sudah memilih kunci ` +
        `${tebak[3] ?? ''}: kuncinya tertebak tanpa membaca kartu.`,
      kutipan: null,
    };
  }
  const kode = /^(?:omongan \d+: )?\[([A-Z_]+)\] (.*)$/.exec(alasan);
  if (kode !== null) {
    const label = AWAM_KODE[kode[1] ?? ''] ?? 'melanggar aturan tetap';
    return { label, kalimat: `Pemeriksa kode: ${label}.`, kutipan: kode[2] ?? null };
  }
  const kritik = /^\[kritikus(?:: ([a-z, ]+))?\] (.*)$/.exec(alasan);
  if (kritik !== null) {
    const isi = kritik[2] ?? '';
    if (kritik[1] === undefined) {
      const diam = /tidak (terbukti berpikir|menjawab)/.test(isi);
      return {
        label: diam ? 'tak menjawab' : 'keberatan',
        kalimat: diam
          ? 'Kritikus tidak memberi jawaban yang bisa dipakai; versi ini diperiksa lagi di putaran berikutnya.'
          : 'Kritikus berkeberatan.',
        kutipan: diam ? null : isi,
      };
    }
    const kategori = kritik[1]
      .split(',')
      .map((k) => k.trim())
      .filter((k) => k !== 'pilihan');
    const label = AWAM_KRITIK[kategori[0] ?? ''] ?? 'keberatan';
    return { label, kalimat: `Kritikus: ${label}.`, kutipan: isi };
  }
  const buang = /^omongan (\d+) gagal (\d+) putaran di sudut ke-(\d+) \(/.exec(alasan);
  if (buang !== null) {
    return {
      label: 'ganti fakta',
      kalimat: `Omongan ${buang[1] ?? ''} gagal ${buang[2] ?? ''} putaran dengan fakta ke-${buang[3] ?? ''}; versinya dibuang.`,
      kutipan: null,
    };
  }
  const sudut = /^sudut ke-(\d+): /.exec(alasan);
  if (sudut !== null) {
    return { label: 'ganti fakta', kalimat: `Dicoba lagi dengan fakta ke-${sudut[1] ?? ''}.`, kutipan: null };
  }
  const batas = /^batas (\d+) sudut per posisi tercapai/.exec(alasan);
  if (batas !== null) {
    return { label: 'menyerah', kalimat: `Batas ${batas[1] ?? ''} fakta per omongan tercapai.`, kutipan: null };
  }
  const kosong = /^omongan (\d+): tidak ada omongan terbaca dari penulis/.exec(alasan);
  if (kosong !== null) {
    return {
      label: 'tak terbaca',
      kalimat: `Mesin tidak menemukan omongan ${kosong[1] ?? ''} di jawaban penulis; penulis diminta menulis lagi.`,
      kutipan: null,
    };
  }
  if (peran === 'pembaca-kartu') {
    return { label: 'bingung', kalimat: 'Pembaca kartu bingung dengan tulisannya:', kutipan: alasan };
  }
  /* Bentuk yang belum dikenal: kutipan utuh (bisa memuat kode — dites agar data sekarang tidak jatuh ke sini). */
  return { label: 'ditolak', kalimat: `${namaPeran(peran)} menolak:`, kutipan: alasan };
}

/** Semua alasan satu penolakan dalam bahasa awam; kalimat kembar tanpa kutipan digabung. */
export function awamPenolakan(p: PenolakanDapur): AlasanAwam[] {
  const keluar: AlasanAwam[] = [];
  for (const a of p.alasan) {
    const x = awamAlasan(p.peran, a);
    if (x.kutipan === null && keluar.some((y) => y.kalimat === x.kalimat)) continue;
    keluar.push(x);
  }
  return keluar;
}

/** Keterangan penolakan tanpa kode: "Putaran 3 · omongan 2". */
export function kepalaPenolakanAwam(p: PenolakanDapur): string {
  const om = omonganPenolakan(p);
  return [`Putaran ${String(p.putaran)}`, ...(om.length > 0 ? [`omongan ${om.join(' & ')}`] : [])].join(' · ');
}

export type KeadaanSel = 'tolak' | 'kunci' | 'ganti' | 'selesai' | 'kosong';

export interface SelGaris {
  omongan: number;
  keadaan: KeadaanSel;
  /** Peran yang menolak / memutuskan di sel ini, kalau ada (untuk ikon). */
  peran: string | null;
  label: string;
}

/**
 * Garis waktu putaran × omongan, dari jejak saja.
 *
 * - `kunci`: putaran akhir sudut yang berhasil (`sudut[].riwayat[].hasil === 'lolos'`);
 * - `ganti`: perencana membuang sudut di putaran ini;
 * - `tolak`: penolakan pertama omongan itu di putaran ini (peran + label awam);
 * - `selesai`: omongan sudah dikunci di putaran sebelumnya;
 * - `kosong`: tidak ada yang tercatat untuk omongan itu di putaran ini.
 */
export function garisWaktu(jalan: JalanDapur): Array<{ putaran: number; sel: SelGaris[] }> {
  const omongan = jalan.sudut.map((s) => s.omongan).sort((a, b) => a - b);
  const kunciPada = new Map<number, number>();
  for (const s of jalan.sudut) {
    for (const r of s.riwayat) if (r.hasil === 'lolos') kunciPada.set(s.omongan, r.putaran_akhir);
  }
  const baris: Array<{ putaran: number; sel: SelGaris[] }> = [];
  for (let putaran = 1; putaran <= jalan.putaran; putaran += 1) {
    const sel = omongan.map((om): SelGaris => {
      const dikunci = kunciPada.get(om);
      if (dikunci !== undefined && putaran > dikunci) {
        return { omongan: om, keadaan: 'selesai', peran: null, label: '' };
      }
      if (dikunci === putaran) return { omongan: om, keadaan: 'kunci', peran: null, label: 'dikunci' };
      const di = jalan.penolakan
        .filter((p) => p.putaran === putaran && omonganPenolakan(p).includes(om))
        .sort((a, b) => a.no - b.no);
      const ganti = di.find((p) => p.jenis === 'buang-sudut');
      if (ganti !== undefined) {
        const menyerah = ganti.alasan.some((a) => a.startsWith('batas '));
        return { omongan: om, keadaan: 'ganti', peran: ganti.peran, label: menyerah ? 'menyerah' : 'ganti fakta' };
      }
      const tolak = di[0];
      if (tolak !== undefined) {
        const alasan = tolak.alasan.find((a) => a.startsWith(`omongan ${String(om)}`)) ?? tolak.alasan[0] ?? '';
        return { omongan: om, keadaan: 'tolak', peran: tolak.peran, label: awamAlasan(tolak.peran, alasan).label };
      }
      return { omongan: om, keadaan: 'kosong', peran: null, label: '' };
    });
    baris.push({ putaran, sel });
  }
  return baris;
}

/** "harga-2025-11-25" → "harga 25 Nov 2025"; slug tanpa tanggal → kata-katanya. */
export function faktaAwam(fact_id: string): string {
  const m = /^(.*?)-(\d{4}-\d{2}-\d{2})(?:-(\d{4}-\d{2}-\d{2}))?$/.exec(fact_id);
  if (m === null) return fact_id.replace(/-/g, ' ');
  const kata = (m[1] ?? '').replace(/-/g, ' ');
  const sampai = m[3] === undefined ? '' : `–${tanggalSingkat(m[3])}`;
  return `${kata} ${tanggalSingkat(m[2] ?? '')}${sampai}`;
}

/** Alasan fakta disingkirkan tanpa kode: "TIDAK_LENGKAP: temuan R19a: x" → "x". */
export function alasanTersingkirAwam(alasan: string): string {
  return alasan.replace(/^[A-Z_]+: /, '').replace(/^temuan R\d+[a-z]?: /, '');
}

/** Fakta tersingkir, dikelompokkan menurut alasan awamnya. */
export function tersingkirAwam(jalan: JalanDapur): Array<{ fakta: string[]; alasan: string }> {
  const peta = new Map<string, string[]>();
  for (const t of jalan.pemeriksaan.tersingkir) {
    const a = alasanTersingkirAwam(t.alasan);
    peta.set(a, [...(peta.get(a) ?? []), faktaAwam(t.fact_id)]);
  }
  return [...peta.entries()].map(([alasan, fakta]) => ({ fakta, alasan }));
}

/** "omongan 3 gagal di 3 sudut (…); simulasi tidak terbit" → kalimat tanpa slug. */
export function berhentiAwam(berhenti: string): string {
  const m = /^omongan (\d+) gagal di (\d+) sudut \([^)]*\)(?:; (.*))?$/.exec(berhenti);
  if (m === null) return berhenti;
  const sisa = m[3] === undefined ? '' : `; ${m[3]}`;
  return `Omongan ${m[1] ?? ''} tetap gagal sesudah dicoba dengan ${m[2] ?? ''} fakta berbeda${sisa}.`;
}

/** Baris agregat tanpa kode milestone: "Satu jalan agen: tidak terbit · …". */
export function kalimatAgregatAwam(a: AgregatDapur): string {
  return kalimatAgregat(a).replace(/^Jalan [^:]+: /, 'Satu jalan agen: ');
}

/**
 * Satu kalimat per omongan di bawah pita garis waktu (kritik D-6 butir 14),
 * dihitung dari `garisWaktu` saja: kapan dikunci (atau tidak pernah), berapa
 * putaran ditolak, alasan terbanyak, berapa kali fakta diganti.
 */
export function kalimatOmongan(jalan: JalanDapur, omongan: number): string {
  const sel = garisWaktu(jalan).map((b) => ({ putaran: b.putaran, s: b.sel.find((x) => x.omongan === omongan) }));
  const tolak = sel.filter((x) => x.s?.keadaan === 'tolak');
  const ganti = sel.filter((x) => x.s?.keadaan === 'ganti').length;
  const kunci = sel.find((x) => x.s?.keadaan === 'kunci')?.putaran ?? null;
  const hitung = new Map<string, number>();
  for (const x of tolak) hitung.set(x.s?.label ?? '', (hitung.get(x.s?.label ?? '') ?? 0) + 1);
  const terbanyak = [...hitung.entries()].sort((a, b) => b[1] - a[1])[0];
  const bagian: string[] = [];
  bagian.push(
    kunci !== null
      ? `Omongan ${String(omongan)} dikunci di putaran ${String(kunci)}`
      : `Omongan ${String(omongan)} tidak pernah dikunci`,
  );
  if (tolak.length > 0) {
    bagian.push(
      `ditolak di ${String(tolak.length)} putaran` +
        (terbanyak === undefined ? '' : ` (terbanyak: ${terbanyak[0]}, ${String(terbanyak[1])} kali)`),
    );
  }
  if (ganti > 0) bagian.push(`faktanya diganti ${String(ganti)} kali`);
  return `${bagian.join('; ')}.`;
}
