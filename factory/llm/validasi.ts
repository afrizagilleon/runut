/**
 * Validator keluaran penyusun LLM (M2d D-4). Deterministik: tanpa jaringan,
 * tanpa jam, tanpa acak — draf dan paket yang sama selalu memberi daftar
 * masalah yang sama.
 *
 * Penolakan menjadi umpan balik ke model (`susun.ts`), jadi setiap pesan
 * menyebut apa yang salah dan di mana, dalam kalimat yang bisa dipakai
 * menulis ulang.
 *
 * Kelas kegagalan yang dijaga — semuanya pernah terjadi di M1.5 (sembilan
 * keluaran di `eval/keluaran/`, tesnya di `validasi.test.ts`):
 *
 * - **angka tanpa jejak**: angka yang tidak bisa dibuka ke fakta mana pun.
 *   Di pilihan dan penjelasan setiap angka wajib berupa `[[fact_id|teks]]`
 *   dan teks tampilnya harus benar-benar angka fakta itu (presisi tampilan,
 *   `angka.ts`). Di pesan teman angka ditulis polos, tetapi tiap angkanya
 *   wajib dicatat di `angka_pesan` — ke fakta, atau sebagai andaian.
 * - **tanggal sesudah T**: "24 Oktober 2025" di bagian yang dilihat pemain,
 *   termasuk di kalimat fakta yang dijadikan kartu.
 * - bentuk soal K-05: 2×2 Betul/Keliru, minimal satu Betul, kunci tidak
 *   seragam, 2–4 kartu, tanpa ajakan transaksi dan kata penilaian, emiten
 *   tersamar.
 */
import { tanggalId } from '../format.ts';
import { ambilRujukan, angkaTelanjang, teksPolos, RUJUKAN_ANDAIAN, RUJUKAN_HARI_INI } from '../skema/rujukan.ts';
import { ajakanBertransaksi } from '../skema/validator.ts';
import { angkaDalam, cocokAngka, sesudahT, tanggalDalam, type TanggalDiTeks } from './angka.ts';
import type { DrafSimulasi, KunciOpsi, MasalahDraf, OmonganDraf } from './draf.ts';
import type { FaktaPaket, PaketFakta } from './paket.ts';

export const BATAS = {
  omongan: 3,
  pesan: 220,
  namaMin: 2,
  namaMaks: 12,
  kartuMin: 2,
  kartuMaks: 4,
  penentuMin: 1,
  penentuMaks: 2,
  opsi: 110,
  timpang: 0.4,
  label: 36,
  penjelasan: 800,
  jamMulai: '16.00',
} as const;

export const NAMA_TERLARANG = ['bayu', 'dimas', 'rara'];
const KUNCI: readonly KunciOpsi[] = ['a', 'b', 'c', 'd'];
/** Kata penilaian saham (K-05 aturan 7), dicocokkan di awal kata: "murahnya" ikut, "kesehatan" tidak. */
const POLA_PENILAIAN = /(?<![\p{L}])(bagus|jelek|sehat|buruk|murah|mahal)\p{L}*/giu;
const POLA_TEBAL = /\*\*[^*]+\*\*/;
const POLA_JAM = /^([01]\d|2[0-3])\.[0-5]\d$/;
const POLA_NAMA = /^[A-Za-z][A-Za-z ]*[A-Za-z]$/;
const SALAH_KAPRAH = /salah-kaprah yang umum/i;
/** Konteks satuan: angka tanggal (hari/tahun) tidak boleh menyamar jadi rupiah atau persen. */
const KONTEKS_SATUAN = /rp|%|persen|lembar|kali|lot|juta|ribu|miliar|triliun/i;

function adalahObyek(n: unknown): n is Record<string, unknown> {
  return typeof n === 'object' && n !== null && !Array.isArray(n);
}

function larikTeks(n: unknown): n is string[] {
  return Array.isArray(n) && n.every((x) => typeof x === 'string');
}

/* ---------------------------------------------------------------------- */
/* jejak angka ke fakta                                                    */
/* ---------------------------------------------------------------------- */

function tanggalFakta(f: FaktaPaket): TanggalDiTeks[] {
  const t = [...tanggalDalam(f.klaim), ...tanggalDalam(f.terbit)];
  if (typeof f.nilai === 'string') t.push(...tanggalDalam(f.nilai));
  return t;
}

function tanggalCocok(label: TanggalDiTeks, fakta: TanggalDiTeks[]): boolean {
  return fakta.some(
    (f) =>
      (label.tahun === null || f.tahun === label.tahun) &&
      (label.bulan === null || f.bulan === label.bulan) &&
      (label.hari === null || f.hari === label.hari) &&
      // Tahun lepas cocok dengan tanggal mana pun bertahun sama; tanggal
      // lengkap harus punya pasangan yang juga menulis bulan.
      (label.bulan === null || f.bulan !== null),
  );
}

/**
 * Angka dan tanggal di `teks` yang TIDAK ada di fakta `f`. Kosong = berjejak.
 * Angka cocok dengan nilai fakta, dengan angka mana pun di kalimat fakta, atau
 * (hanya untuk bilangan bulat tanpa satuan ≤ 31 / tahun) dengan bagian tanggal
 * fakta — supaya "[[fil-…|6]] dan [[fil-…|7 Januari 2026]]" sah.
 */
export function angkaTakBerjejak(teks: string, f: FaktaPaket): string[] {
  const hilang: string[] = [];
  const tFakta = tanggalFakta(f);
  for (const t of tanggalDalam(teks)) {
    if (!tanggalCocok(t, tFakta)) hilang.push(t.teks);
  }
  const kandidat: number[] = [];
  if (typeof f.nilai === 'number') kandidat.push(f.nilai);
  for (const a of angkaDalam(f.klaim)) kandidat.push(a.nilai);
  const bagianTanggal: number[] = [];
  for (const t of tFakta) {
    if (t.hari !== null) bagianTanggal.push(t.hari);
    if (t.tahun !== null) bagianTanggal.push(t.tahun);
  }
  const bersatuan = KONTEKS_SATUAN.test(teks);
  for (const a of angkaDalam(teks)) {
    if (kandidat.some((k) => cocokAngka(a, k))) continue;
    if (!bersatuan && Number.isInteger(a.nilai) && bagianTanggal.includes(a.nilai)) continue;
    hilang.push(a.teks);
  }
  return hilang;
}

/* ---------------------------------------------------------------------- */
/* pemeriksa                                                               */
/* ---------------------------------------------------------------------- */

interface Konteks {
  paket: PaketFakta;
  fakta: Map<string, FaktaPaket>;
  masalah: MasalahDraf[];
}

function tambah(k: Konteks, kode: string, omongan: number | null, pesan: string): void {
  k.masalah.push({ kode, omongan, pesan });
}

function periksaTanggal(k: Konteks, no: number, tempat: string, teks: string): void {
  for (const t of tanggalDalam(teks)) {
    if (sesudahT(t, k.paket.tanggal_t)) {
      tambah(
        k,
        'TANGGAL_SESUDAH_T',
        no,
        `${tempat} menyebut "${t.teks}", sesudah tanggal simulasi ${tanggalId(k.paket.tanggal_t)}. ` +
          'Hanya yang sudah bisa dibaca pada hari itu yang boleh muncul.',
      );
    }
  }
}

function periksaKata(k: Konteks, no: number | null, tempat: string, teks: string): void {
  const polos = teksPolos(teks);
  for (const kata of k.paket.kata_terlarang) {
    const pola = new RegExp(`(?<![\\p{L}\\p{N}])${kata.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}(?![\\p{L}\\p{N}])`, 'iu');
    if (pola.test(polos)) {
      tambah(
        k,
        'EMITEN_TERBUKA',
        no,
        `${tempat} menyebut "${kata}". Emiten disamarkan sebagai "${k.paket.nama_samaran}" dan orang disebut perannya.`,
      );
    }
  }
  for (const c of polos.matchAll(POLA_PENILAIAN)) {
    tambah(k, 'KATA_PENILAIAN', no, `${tempat} memakai kata penilaian "${c[0]}"; produk ini tidak menilai saham.`);
  }
  const ajakan = ajakanBertransaksi(teks);
  if (ajakan !== null) {
    tambah(k, 'AJAKAN_TRANSAKSI', no, `${tempat} memuat ajakan bertransaksi: "${ajakan}".`);
  }
}

/** Pilihan dan penjelasan: angka hanya di dalam rujukan, dan rujukannya berjejak. */
function periksaRujukan(
  k: Konteks,
  no: number,
  tempat: string,
  teks: string,
  bolehAndaian: boolean,
): void {
  const telanjang = angkaTelanjang(teks);
  if (telanjang.length > 0) {
    tambah(
      k,
      'ANGKA_TANPA_RUJUKAN',
      no,
      `${tempat} memuat angka di luar rujukan: ${telanjang.join(', ')}. Tulis tiap angka sebagai [[fact_id|teks]].`,
    );
  }
  if (POLA_TEBAL.test(teks)) tambah(k, 'DITEBALKAN', no, `${tempat} memuat tanda tebal "**".`);
  for (const r of ambilRujukan(teks)) {
    if (r.teks.length > BATAS.label) {
      tambah(k, 'RUJUKAN_PANJANG', no, `${tempat}: teks rujukan "${r.teks}" ${String(r.teks.length)} karakter, lebih dari ${String(BATAS.label)}.`);
    }
    if (r.fact_id === RUJUKAN_ANDAIAN) {
      if (!bolehAndaian) {
        tambah(k, 'ANDAIAN_DI_PENJELASAN', no, `${tempat} memakai [[misal|…]]; penjelasan hanya menyebut isi dokumen.`);
      }
      continue;
    }
    if (r.fact_id === RUJUKAN_HARI_INI) {
      if (r.teks !== tanggalId(k.paket.tanggal_t)) {
        tambah(k, 'HARI_INI_TAK_COCOK', no, `${tempat}: [[hari-ini|${r.teks}]] harus berbunyi "${tanggalId(k.paket.tanggal_t)}".`);
      }
      continue;
    }
    const f = k.fakta.get(r.fact_id);
    if (f === undefined) {
      tambah(k, 'FAKTA_DI_LUAR_PAKET', no, `${tempat} merujuk "${r.fact_id}", yang tidak ada di paket fakta.`);
      continue;
    }
    const hilang = angkaTakBerjejak(r.teks, f);
    if (hilang.length > 0) {
      tambah(
        k,
        'ANGKA_TAK_COCOK',
        no,
        `${tempat}: [[${r.fact_id}|${r.teks}]] menampilkan ${hilang.join(', ')}, yang tidak ada di fakta itu (${f.klaim})`,
      );
    }
  }
}

function labelOpsi(teks: string): 'Betul' | 'Keliru' | null {
  const polos = teksPolos(teks).trimStart();
  if (polos.startsWith('Betul,')) return 'Betul';
  if (polos.startsWith('Keliru,')) return 'Keliru';
  return null;
}

function periksaOmongan(k: Konteks, o: OmonganDraf, no: number): void {
  const T = k.paket.tanggal_t;

  // --- pengirim dan pesan
  if (o.nama.length < BATAS.namaMin || o.nama.length > BATAS.namaMaks || !POLA_NAMA.test(o.nama)) {
    tambah(k, 'PESAN_NAMA', no, `Nama "${o.nama}" harus ${String(BATAS.namaMin)}–${String(BATAS.namaMaks)} huruf, huruf saja.`);
  }
  if (NAMA_TERLARANG.includes(o.nama.trim().toLowerCase())) {
    tambah(k, 'NAMA_TERLARANG', no, `Nama "${o.nama}" sudah dipakai simulasi lain; pakai nama lain.`);
  }
  if (!POLA_JAM.test(o.jam) || o.jam < BATAS.jamMulai) {
    tambah(k, 'PESAN_JAM', no, `Jam "${o.jam}" harus HH.MM antara ${BATAS.jamMulai} dan 23.59 (sesudah bursa tutup).`);
  }
  if (o.pesan.trim() === '') tambah(k, 'PESAN_KOSONG', no, 'Pesan kosong.');
  if (o.pesan.length > BATAS.pesan) {
    tambah(k, 'PESAN_PANJANG', no, `Pesan ${String(o.pesan.length)} karakter, lebih dari ${String(BATAS.pesan)}.`);
  }
  if (o.pesan.includes('[[')) {
    tambah(k, 'PESAN_BERTAUT', no, 'Pesan teman ditulis polos, tanpa [[…]]: ia ucapan orang, bukan dokumen.');
  }
  if (POLA_TEBAL.test(o.pesan)) tambah(k, 'DITEBALKAN', no, 'Pesan memuat tanda tebal "**".');
  periksaTanggal(k, no, 'Pesan', o.pesan);

  // --- kunci
  const kunciSah = KUNCI.includes(o.kunci);
  if (!kunciSah) tambah(k, 'KUNCI_TAK_ADA', no, `Kunci "${String(o.kunci)}" bukan a, b, c, atau d.`);
  const labelKunci = kunciSah ? labelOpsi(o.pilihan[o.kunci]) : null;

  // --- angka di pesan: tiap digit harus tertutup satu entri angka_pesan
  const tertutup = new Array<boolean>(o.pesan.length).fill(false);
  for (const a of o.angka_pesan) {
    let dari = 0;
    let ketemu = false;
    while (a.teks.length > 0) {
      const i = o.pesan.indexOf(a.teks, dari);
      if (i < 0) break;
      ketemu = true;
      for (let x = i; x < i + a.teks.length; x++) tertutup[x] = true;
      dari = i + a.teks.length;
    }
    if (!ketemu) {
      tambah(k, 'ANGKA_PESAN_TAK_ADA', no, `angka_pesan "${a.teks}" tidak tertulis persis di pesan.`);
      continue;
    }
    if (a.andaian === true) {
      if (labelKunci === 'Betul') {
        tambah(
          k,
          'ANDAIAN_DI_OMONGAN_BETUL',
          no,
          `"${a.teks}" ditandai andaian, padahal jawabannya Betul: omongan yang betul tidak boleh memuat angka yang tidak ada di dokumen.`,
        );
      }
      continue;
    }
    if (a.fact_id === undefined) {
      tambah(k, 'ANGKA_PESAN_TANPA_JEJAK', no, `"${a.teks}" di pesan tidak menunjuk fakta dan tidak ditandai andaian.`);
      continue;
    }
    const f = k.fakta.get(a.fact_id);
    if (f === undefined) {
      tambah(k, 'FAKTA_DI_LUAR_PAKET', no, `angka_pesan "${a.teks}" menunjuk "${a.fact_id}", yang tidak ada di paket fakta.`);
      continue;
    }
    const hilang = angkaTakBerjejak(a.teks, f);
    if (hilang.length > 0) {
      tambah(k, 'ANGKA_TAK_COCOK', no, `Pesan: "${a.teks}" tidak ada di fakta "${a.fact_id}" (${f.klaim})`);
    }
    if (labelKunci === 'Betul' && !o.kartu.includes(a.fact_id)) {
      tambah(
        k,
        'KUNCI_TAK_TERBUKTI_KARTU',
        no,
        `Jawabannya Betul, tetapi angka "${a.teks}" berasal dari "${a.fact_id}" yang bukan kartu omongan ini; pemain tidak bisa memastikannya.`,
      );
    }
  }
  const lepas: string[] = [];
  for (const c of o.pesan.matchAll(/\d[\d.,]*/g)) {
    const token = c[0].replace(/[.,]+$/, '');
    let semua = true;
    for (let x = c.index; x < c.index + token.length; x++) if (tertutup[x] !== true) semua = false;
    if (!semua) lepas.push(token);
  }
  if (lepas.length > 0) {
    tambah(
      k,
      'ANGKA_PESAN_TANPA_JEJAK',
      no,
      `Angka di pesan yang tidak dicatat di angka_pesan: ${lepas.join(', ')}. Catat tiap angka ke fact_id-nya, atau sebagai andaian.`,
    );
  }

  // --- kartu
  if (o.kartu.length < BATAS.kartuMin || o.kartu.length > BATAS.kartuMaks) {
    tambah(k, 'KARTU_JUMLAH', no, `${String(o.kartu.length)} kartu; harus ${String(BATAS.kartuMin)}–${String(BATAS.kartuMaks)}.`);
  }
  if (new Set(o.kartu).size !== o.kartu.length) tambah(k, 'KARTU_KEMBAR', no, 'Ada kartu yang disebut dua kali.');
  for (const id of o.kartu) {
    const f = k.fakta.get(id);
    if (f === undefined) {
      tambah(k, 'FAKTA_DI_LUAR_PAKET', no, `Kartu "${id}" tidak ada di paket fakta.`);
      continue;
    }
    if (f.terbit > T) tambah(k, 'TANGGAL_SESUDAH_T', no, `Kartu "${id}" terbit ${f.terbit}, sesudah T.`);
    periksaTanggal(k, no, `Kartu "${id}"`, f.klaim);
  }
  if (o.kartu_penentu.length < BATAS.penentuMin || o.kartu_penentu.length > BATAS.penentuMaks) {
    tambah(k, 'PENENTU_JUMLAH', no, `${String(o.kartu_penentu.length)} kartu penentu; harus 1–2.`);
  }
  for (const id of o.kartu_penentu) {
    if (!o.kartu.includes(id)) tambah(k, 'PENENTU_BUKAN_KARTU', no, `Kartu penentu "${id}" bukan salah satu kartu omongan ini.`);
  }

  // --- pilihan 2×2
  let betul = 0;
  let keliru = 0;
  const panjang: number[] = [];
  for (const kunci of KUNCI) {
    const teks = o.pilihan[kunci];
    const label = labelOpsi(teks);
    if (label === 'Betul') betul += 1;
    else if (label === 'Keliru') keliru += 1;
    else tambah(k, 'OPSI_TANPA_LABEL', no, `Pilihan ${kunci} tidak diawali "Betul," atau "Keliru,".`);
    const p = teksPolos(teks).length;
    panjang.push(p);
    if (p > BATAS.opsi) tambah(k, 'OPSI_PANJANG', no, `Pilihan ${kunci} ${String(p)} karakter, lebih dari ${String(BATAS.opsi)}.`);
    periksaRujukan(k, no, `Pilihan ${kunci}`, teks, true);
    periksaTanggal(k, no, `Pilihan ${kunci}`, teksPolos(teks));
  }
  if (betul !== 2 || keliru !== 2) {
    tambah(k, 'OPSI_TAK_DUA_DUA', no, `${String(betul)} pilihan "Betul," dan ${String(keliru)} "Keliru,"; harus dua-dua.`);
  }
  const terpanjang = Math.max(...panjang);
  const terpendek = Math.min(...panjang);
  if (terpanjang > 0 && (terpanjang - terpendek) / terpanjang > BATAS.timpang) {
    tambah(
      k,
      'OPSI_PANJANG_TIMPANG',
      no,
      `Panjang pilihan timpang: ${String(terpendek)} lawan ${String(terpanjang)} karakter; yang terpendek harus ≥ 60% yang terpanjang.`,
    );
  }

  // --- kunci bisa diturunkan dari kartu. Pilihan kunci boleh MENGUTIP angka
  // teman ("bukan Rp45") — fakta yang sudah dicatat di angka_pesan — tetapi
  // angka lain yang ia sebut harus ada di kartu omongan ini.
  if (kunciSah) {
    const dikutip = new Set(o.angka_pesan.map((a) => a.fact_id).filter((x): x is string => x !== undefined));
    for (const r of ambilRujukan(o.pilihan[o.kunci])) {
      if (r.fact_id === RUJUKAN_ANDAIAN || r.fact_id === RUJUKAN_HARI_INI) continue;
      if (!o.kartu.includes(r.fact_id) && !dikutip.has(r.fact_id)) {
        tambah(
          k,
          'KUNCI_TAK_TERBUKTI_KARTU',
          no,
          `Pilihan kunci merujuk "${r.fact_id}", yang bukan kartu omongan ini; pemain tidak bisa mencocokkannya.`,
        );
      }
    }
  }

  // --- penjelasan
  const polosPenjelasan = teksPolos(o.penjelasan);
  if (polosPenjelasan.trim() === '') tambah(k, 'PENJELASAN_KOSONG', no, 'Penjelasan kosong.');
  if (polosPenjelasan.length > BATAS.penjelasan) {
    tambah(k, 'PENJELASAN_PANJANG', no, `Penjelasan ${String(polosPenjelasan.length)} karakter polos, lebih dari ${String(BATAS.penjelasan)}.`);
  }
  if (!SALAH_KAPRAH.test(polosPenjelasan)) {
    tambah(k, 'PENJELASAN_TANPA_SALAH_KAPRAH', no, 'Penjelasan harus ditutup satu kalimat "Salah-kaprah yang umum: …".');
  }
  const dirujuk = new Set(ambilRujukan(o.penjelasan).map((r) => r.fact_id));
  if (!o.kartu_penentu.some((id) => dirujuk.has(id))) {
    tambah(k, 'PENJELASAN_TANPA_PENENTU', no, 'Penjelasan tidak merujuk satu pun kartu penentu.');
  }
  periksaRujukan(k, no, 'Penjelasan', o.penjelasan, false);
  periksaTanggal(k, no, 'Penjelasan', polosPenjelasan);

  for (const [tempat, teks] of [
    ['Nama', o.nama],
    ['Pesan', o.pesan],
    ...KUNCI.map((x): [string, string] => [`Pilihan ${x}`, o.pilihan[x]]),
    ['Penjelasan', o.penjelasan],
  ] as Array<[string, string]>) {
    periksaKata(k, no, tempat, teks);
  }
}

/** Bentuk satu omongan; mengembalikan `null` (dan mencatat masalah) kalau rusak. */
function bentukOmongan(k: Konteks, n: unknown, no: number): OmonganDraf | null {
  if (!adalahObyek(n)) {
    tambah(k, 'SKEMA', no, 'Omongan harus objek JSON.');
    return null;
  }
  const salah: string[] = [];
  for (const m of ['nama', 'jam', 'pesan', 'kunci', 'penjelasan']) if (typeof n[m] !== 'string') salah.push(m);
  if (!larikTeks(n['kartu'])) salah.push('kartu');
  if (!larikTeks(n['kartu_penentu'])) salah.push('kartu_penentu');
  const angka = n['angka_pesan'];
  const angkaSah =
    Array.isArray(angka) &&
    angka.every(
      (a) =>
        adalahObyek(a) &&
        typeof a['teks'] === 'string' &&
        (a['fact_id'] === undefined || typeof a['fact_id'] === 'string') &&
        (a['andaian'] === undefined || typeof a['andaian'] === 'boolean'),
    );
  if (!angkaSah) salah.push('angka_pesan');
  const pilihan = n['pilihan'];
  const pilihanSah =
    adalahObyek(pilihan) &&
    Object.keys(pilihan).sort().join(',') === 'a,b,c,d' &&
    KUNCI.every((x) => typeof pilihan[x] === 'string');
  if (!pilihanSah) salah.push('pilihan (objek dengan tepat a, b, c, d)');
  if (salah.length > 0) {
    tambah(k, 'SKEMA', no, `Medan hilang atau salah bentuk: ${salah.join(', ')}.`);
    return null;
  }
  return n as unknown as OmonganDraf;
}

/** Periksa satu draf. Kosong = lolos. */
export function validasiDraf(draf: unknown, paket: PaketFakta): MasalahDraf[] {
  const k: Konteks = { paket, fakta: new Map(paket.fakta.map((f) => [f.fact_id, f])), masalah: [] };

  // Paket itu sendiri: jaring kedua kalau pembangunnya pernah membiarkan
  // sesuatu lewat. Pada paket yang sah, tidak pernah berbunyi.
  for (const f of paket.fakta) {
    if (f.terbit > paket.tanggal_t) {
      tambah(k, 'TANGGAL_SESUDAH_T', null, `Fakta paket "${f.fact_id}" terbit ${f.terbit}, sesudah T.`);
    }
    periksaTanggal(k, 0, `Fakta paket "${f.fact_id}"`, f.klaim);
  }
  for (const m of k.masalah) if (m.omongan === 0) m.omongan = null;

  if (!adalahObyek(draf) || !Array.isArray(draf['omongan'])) {
    tambah(k, 'SKEMA', null, 'Keluaran harus objek JSON dengan medan "omongan" berupa larik.');
    return k.masalah;
  }
  const mentah = draf['omongan'] as unknown[];
  if (mentah.length !== BATAS.omongan) {
    tambah(k, 'SKEMA', null, `"omongan" berisi ${String(mentah.length)} objek; harus tepat ${String(BATAS.omongan)}.`);
  }
  const omongan: OmonganDraf[] = [];
  mentah.forEach((n, i) => {
    const o = bentukOmongan(k, n, i + 1);
    if (o !== null) omongan.push(o);
  });
  omongan.forEach((o) => periksaOmongan(k, o, mentah.indexOf(o) + 1));

  if (omongan.length === BATAS.omongan) {
    const nama = omongan.map((o) => o.nama.trim().toLowerCase());
    if (new Set(nama).size !== nama.length) tambah(k, 'NAMA_KEMBAR', null, 'Tiap omongan harus dari pengirim berbeda.');
    const label = omongan.map((o) => (KUNCI.includes(o.kunci) ? labelOpsi(o.pilihan[o.kunci]) : null));
    if (!label.includes('Betul')) {
      tambah(k, 'TIDAK_ADA_BETUL', null, 'Minimal satu dari tiga omongan harus ternyata BETUL (kuncinya pilihan "Betul,").');
    }
    if (new Set(omongan.map((o) => o.kunci)).size === 1) {
      tambah(k, 'KUNCI_SERAGAM', null, `Huruf kunci ketiga omongan sama semua ("${omongan[0]?.kunci ?? ''}").`);
    }
  }
  return k.masalah;
}

/** Bentuk yang dikembalikan validator kepada pemanggil tipe-aman. */
export function drafSah(draf: unknown, paket: PaketFakta): draf is DrafSimulasi {
  return validasiDraf(draf, paket).length === 0;
}
