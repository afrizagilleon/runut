// Amandemen A-1, butir 1 — metrik ketepatan yang diadu ke DATA MENTAH,
// bukan ke keanggotaan di kunci jawaban.
//
// ATURAN YANG DIPAKAI (ditulis lengkap di sini supaya bisa diaudit tangan).
//
// Setiap angka di kalimat klaim lengan mendapat satu dari tiga status.
//
//   1. SALAH (bertentangan dengan data mentah)
//      Kalimatnya menyebut sebuah tanggal hari bursa atau tahun buku yang ada
//      di data mentah DAN menyatakan sesuatu yang nilainya diketahui dari data
//      itu (harga penutupan, volume, nilai pasar, pendapatan/laba/ekuitas
//      tahunan). Kalau kalimat itu TIDAK memuat satu pun nilai yang benar untuk
//      fakta tersebut, maka setiap angka di kalimat yang besarannya sebanding
//      (antara seperlima dan lima kali nilai benar) dihitung bertentangan.
//      Dua pengecualian, keduanya menutup cacat F-1:
//        - angka yang MEMENUHI pemeriksaan lain di kalimat yang sama (satu
//          kalimat lazim menyebut beberapa tanggal sekaligus);
//        - angka bersatuan pembanding (persen, kali, lipat), karena ia tidak
//          pernah mengklaim nilai sebuah tanggal.
//
//   2. COCOK DATA — bisa dijelaskan dari data mentah. Penjelasannya dicari
//      berurutan dari yang paling kuat ke yang paling lemah, dan yang
//      ditemukan pertama ditulis apa adanya ke laporan:
//        P1. nilai langsung milik tanggal atau tahun buku yang disebut kalimat
//            itu sendiri (mis. "close 2025-10-07");
//        P2. turunan satu langkah dari basis lokal;
//        P3. rata-rata harga penutupan / volume atas rentang hari bursa yang
//            berujung pada tanggal yang disebut kalimat itu;
//        P4. perbandingan terhadap rata-rata itu (x ÷ rata-rata), untuk
//            kalimat bergaya "sekian kali rata-rata";
//        P5. nilai langsung di mana pun di data mentah, walau tidak terkait
//            tanggal/tahun yang disebut. Ini penjelasan TERLEMAH dan ditandai
//            begitu di laporan, karena dengan toleransi 1 % sebuah angka bisa
//            cocok kebetulan dengan medan yang tidak ada hubungannya.
//
//   3. TIDAK DAPAT DIVERIFIKASI
//      Sisanya. Umumnya angka dari endpoint yang TIDAK ada di cache kita
//      (arus dana asing, ringkasan broker, komposisi pemegang saham, laporan
//      kuartalan, kinerja pencatatan perdana). Angka ini TIDAK dihitung salah:
//      kita hanya tidak punya bahan untuk memeriksanya, dan menebak berarti
//      mengulang cacat F-1 dengan arah yang berbeda.
//
// BASIS TURUNAN (dipakai P2 dan P4), tertutup dan satu langkah saja:
//   B1. angka lain di kalimat yang sama YANG SENDIRINYA ada di data mentah.
//       Syarat terakhir penting: tanpa itu, sebuah lengan bisa "memverifikasi"
//       angkanya sendiri dengan angka karangannya sendiri.
//   B2. open/high/low/close/volume/market_cap untuk setiap tanggal hari bursa
//       yang disebut kalimat itu DAN untuk hari bursa tepat sebelumnya.
//   B3. medan keuangan tahun buku yang disebut kalimat itu (hanya kalau
//       kalimatnya memang bicara tahunan, bukan kuartalan).
//   B4. jumlah saham beredar.
// Operasi atas pasangan basis (x, y): x − y, x + y, x × y, x ÷ y,
// (x − y) ÷ y × 100, x ÷ y × 100. Ini mencakup selisih, rasio, persen, dan
// perkalian harga × lembar.
//
// Satuan angka ikut menentukan penjelasan mana yang boleh dipakai:
//   - bersatuan "kali/×/lipat": hanya turunan (P2–P4). Sebuah rasio tidak
//     pernah tersimpan sebagai nilai mentah.
//   - bersatuan "persen/%": nilai langsung hanya boleh dari medan yang memang
//     persentase di data (share_percentage_*, eps_growth, daily_close_change).
//   - tanpa satuan pembanding: seluruh penjelasan boleh dipakai.
//
// Toleransi sama dengan rubrik lama: 1 % relatif (eval/angka.ts).

import { adaYangSama, angkaBerekorDalam, angkaSama, tanggalDalam } from './angka.ts';
import { cariDi, cariLangsung, hariSebelum, selisihRelatif, type DataMentah, type NilaiMentah } from './data-mentah.ts';
import type { HariHarga } from './berkas.ts';

export type StatusAngka = 'cocok' | 'salah' | 'tidak-terverifikasi';

export interface AngkaDinilai {
  nilai: number;
  status: StatusAngka;
  /** Kenapa statusnya begitu. Ditulis apa adanya ke laporan supaya bisa ditelusuri. */
  alasan: string;
  kalimat: string;
}

export interface Pemeriksaan {
  nama: string;
  harapan: NilaiMentah[];
}

/**
 * Pola pemicu harga. SENGAJA sempit dan sama dengan rubrik lama: hanya kalimat
 * yang benar-benar mengklaim harga penutupan. Kalau dilebarkan ke kata "harga"
 * saja, kalimat yang melaporkan harga transaksi di laporan kepemilikan
 * (mis. Rp170 pada 24 Okt) akan dihukum, padahal angka itu memang begitu di
 * data dan justru merupakan kejanggalan C4 yang harus ditemukan lengan.
 */
const HARGA = /harga penutupan|penutupan|ditutup|harga tutup/i;
const VOLUME = /volume/i;
const NILAI_PASAR = /nilai pasar|kapitalisasi pasar|market cap|kapitalisasi/i;

/** Pemicu tahun buku. Kalimat kuartalan dikecualikan: cache kita hanya tahunan. */
const TAHUNAN = /tahun buku|laporan keuangan tahunan|sepanjang tahun|tahun\s+(19|20)\d{2}/i;
const KUARTALAN = /kuartal|triwulan|\bq[1-4]\b|semester|interim/i;

/** Batas "besaran sebanding": antara seperlima dan lima kali nilai yang benar. */
export const FAKTOR_SEBANDING = 5;

/** Satuan yang menandai angka sebagai hasil pembandingan, bukan nilai mentah. */
const SATUAN_KALI = /^\s*(kali|×|x\b|lipat)/i;
const SATUAN_PERSEN = /^\s*(%|persen|per\s?sen|pp\b)/i;

type Satuan = 'kali' | 'persen' | null;

function medanHari(h: HariHarga, nama: string, medan: readonly (keyof HariHarga)[]): NilaiMentah[] {
  const hasil: NilaiMentah[] = [];
  for (const m of medan) {
    const v = h[m];
    if (typeof v === 'number' && Number.isFinite(v) && v !== 0) {
      hasil.push({ nilai: Math.abs(v), asal: `${nama} ${h.date} ${String(m)}`, persen: false });
    }
  }
  return hasil;
}

/** Tanggal hari bursa yang disebut kalimat, dan hari bursa tepat sebelumnya. */
function tanggalKalimat(kalimat: string, data: DataMentah): string[] {
  const hasil = new Set<string>();
  for (const t of tanggalDalam(kalimat)) if (data.hari.has(t)) hasil.add(t);
  return [...hasil];
}

function tahunKalimat(kalimat: string, data: DataMentah): number[] {
  if (!TAHUNAN.test(kalimat) || KUARTALAN.test(kalimat)) return [];
  const hasil = new Set<number>();
  for (const cocok of kalimat.matchAll(/\b(19|20)\d{2}\b/g)) {
    const tahun = Number(cocok[0]);
    if (data.keuangan.has(tahun)) hasil.add(tahun);
  }
  return [...hasil];
}

/** Pemeriksaan yang berlaku untuk satu kalimat, beserta nilai benar dari data mentah. */
export function pemeriksaanKalimat(kalimat: string, data: DataMentah): Pemeriksaan[] {
  const hasil: Pemeriksaan[] = [];
  for (const t of tanggalKalimat(kalimat, data)) {
    const h = data.hari.get(t);
    if (h === undefined) continue;
    if (HARGA.test(kalimat)) {
      hasil.push({ nama: `harga penutupan pada ${t}`, harapan: medanHari(h, 'daily', ['close', 'open', 'high', 'low']) });
    }
    if (VOLUME.test(kalimat)) {
      hasil.push({ nama: `volume pada ${t}`, harapan: medanHari(h, 'daily', ['volume']) });
    }
    if (NILAI_PASAR.test(kalimat)) {
      hasil.push({ nama: `nilai pasar pada ${t}`, harapan: medanHari(h, 'daily', ['market_cap']) });
    }
  }
  for (const tahun of tahunKalimat(kalimat, data)) {
    const k = data.keuangan.get(tahun);
    if (k === undefined || k.pokok.length === 0) continue;
    hasil.push({ nama: `tahun buku ${tahun}`, harapan: k.pokok });
  }
  return hasil;
}

/** Angka yang layak dinilai: sama dengan rubrik lama, supaya kedua metrik sebanding. */
export function angkaLayak(angka: number[]): number[] {
  const hasil: number[] = [];
  for (const a of angka) {
    if (Math.abs(a) < 10) continue;
    if (Number.isInteger(a) && a >= 1900 && a <= 2100) continue;
    if (!hasil.some((h) => Math.abs(h - a) < 1e-9)) hasil.push(a);
  }
  return hasil;
}

export function buangTanggal(kalimat: string): string {
  return kalimat
    .replace(/\b\d{4}-\d{2}-\d{2}\b/g, ' ')
    .replace(/\b\d{1,2}\s+[A-Za-z]+\.?\s+\d{4}\b/g, ' ');
}

interface Operasi {
  nama: string;
  hitung: (x: number, y: number) => number;
}

/** Enam operasi yang diterima. Daftar tertutup, tidak berantai. */
export const OPERASI: Operasi[] = [
  { nama: 'selisih (x − y)', hitung: (x, y) => x - y },
  { nama: 'jumlah (x + y)', hitung: (x, y) => x + y },
  { nama: 'perkalian (x × y)', hitung: (x, y) => x * y },
  { nama: 'rasio (x ÷ y)', hitung: (x, y) => (y === 0 ? Number.NaN : x / y) },
  { nama: 'persen perubahan ((x − y) ÷ y × 100)', hitung: (x, y) => (y === 0 ? Number.NaN : ((x - y) / y) * 100) },
  { nama: 'persen bagian (x ÷ y × 100)', hitung: (x, y) => (y === 0 ? Number.NaN : (x / y) * 100) },
];

/** Nilai langsung milik tanggal/tahun yang disebut kalimat itu sendiri (P1 dan B2–B4). */
function nilaiLokal(kalimat: string, data: DataMentah): NilaiMentah[] {
  const hasil: NilaiMentah[] = [];
  for (const t of tanggalKalimat(kalimat, data)) {
    const h = data.hari.get(t);
    if (h !== undefined) hasil.push(...medanHari(h, 'daily', ['close', 'open', 'high', 'low', 'volume', 'market_cap']));
    const sebelum = hariSebelum(data, t);
    if (sebelum !== null) {
      hasil.push(...medanHari(sebelum, 'daily (hari bursa sebelumnya)', ['close', 'open', 'high', 'low', 'volume', 'market_cap']));
    }
  }
  for (const tahun of tahunKalimat(kalimat, data)) {
    const k = data.keuangan.get(tahun);
    if (k !== undefined) hasil.push(...k.medan);
  }
  hasil.push(...data.sahamBeredar.slice(0, 1));
  return hasil;
}

/** Satu penjelasan calon untuk sebuah angka, beserta seberapa persis kecocokannya. */
interface Penjelasan {
  asal: string;
  /** Urutan kekuatan penjelasan; kecil = lebih kuat. Dipakai memutus seri. */
  tingkat: number;
  jarak: number;
}

function lebihBaik(a: Penjelasan | null, b: Penjelasan | null): Penjelasan | null {
  if (a === null) return b;
  if (b === null) return a;
  if (b.jarak < a.jarak - 1e-12) return b;
  if (a.jarak < b.jarak - 1e-12) return a;
  return b.tingkat < a.tingkat ? b : a;
}

function cariTurunanPasangan(a: number, basis: NilaiMentah[], tingkat: number): Penjelasan | null {
  let terbaik: Penjelasan | null = null;
  for (let i = 0; i < basis.length; i++) {
    for (let j = 0; j < basis.length; j++) {
      if (i === j) continue;
      const x = basis[i];
      const y = basis[j];
      if (x === undefined || y === undefined) continue;
      for (const op of OPERASI) {
        const v = op.hitung(x.nilai, y.nilai);
        if (!Number.isFinite(v) || v === 0 || !angkaSama(a, Math.abs(v))) continue;
        terbaik = lebihBaik(terbaik, {
          asal: `turunan ${op.nama} dari ${x.asal} dan ${y.asal}`,
          tingkat,
          jarak: selisihRelatif(a, Math.abs(v)),
        });
      }
    }
  }
  return terbaik;
}

interface RataRata {
  nilai: number;
  asal: string;
}

/** Rata-rata harga penutupan dan volume atas rentang yang berujung di tanggal kalimat. */
function rataRataBerjangkar(kalimat: string, data: DataMentah): RataRata[] {
  const jangkar = new Set<string>();
  for (const t of tanggalKalimat(kalimat, data)) {
    jangkar.add(t);
    const sebelum = hariSebelum(data, t);
    if (sebelum !== null) jangkar.add(sebelum.date);
  }
  const hasil: RataRata[] = [];
  for (const t of jangkar) {
    const iJangkar = data.tanggal.indexOf(t);
    if (iJangkar < 0) continue;
    for (let j = 0; j < data.tanggal.length; j++) {
      const mulai = Math.min(iJangkar, j);
      const akhir = Math.max(iJangkar, j);
      if (akhir - mulai + 1 < 3) continue;
      let jumlahTutup = 0;
      let jumlahVolume = 0;
      let n = 0;
      for (let k = mulai; k <= akhir; k++) {
        const tgl = data.tanggal[k];
        if (tgl === undefined) continue;
        const h = data.hari.get(tgl);
        if (h === undefined) continue;
        jumlahTutup += h.close;
        jumlahVolume += h.volume;
        n++;
      }
      if (n === 0) continue;
      const rentang = `${data.tanggal[mulai]}..${data.tanggal[akhir]} (${n} hari bursa)`;
      hasil.push({ nilai: jumlahTutup / n, asal: `rata-rata harga penutupan ${rentang}` });
      hasil.push({ nilai: jumlahVolume / n, asal: `rata-rata volume ${rentang}` });
    }
  }
  return hasil;
}

function sebanding(a: number, h: number): boolean {
  if (h <= 0) return false;
  return a >= h / FAKTOR_SEBANDING && a <= h * FAKTOR_SEBANDING;
}

function satuanAngka(berekor: { nilai: number; ekor: string }[], a: number): Satuan {
  let hasil: Satuan = null;
  for (const b of berekor) {
    if (!angkaSama(b.nilai, a)) continue;
    if (SATUAN_KALI.test(b.ekor)) return 'kali';
    if (SATUAN_PERSEN.test(b.ekor)) hasil = 'persen';
  }
  return hasil;
}

/**
 * Menilai seluruh angka di sekumpulan kalimat klaim. Urutannya penting dan
 * ditulis di sini supaya tidak bisa ditukar diam-diam: kontradiksi diperiksa
 * LEBIH DULU, baru penjelasan dari data mentah. Kalau dibalik, sebuah angka
 * yang salah untuk tanggal yang diklaim bisa lolos hanya karena angka itu
 * kebetulan muncul di hari lain.
 */
export function nilaiKetepatan(klaim: string[], data: DataMentah): AngkaDinilai[] {
  const hasil: AngkaDinilai[] = [];
  for (const kalimat of klaim) {
    const tanpaTanggal = buangTanggal(kalimat);
    const berekor = angkaBerekorDalam(tanpaTanggal);
    const angka = angkaLayak(berekor.map((b) => b.nilai));
    if (angka.length === 0) continue;

    const pemeriksaan = pemeriksaanKalimat(kalimat, data);
    const belumPuas = pemeriksaan.filter(
      (p) => p.harapan.length > 0 && !adaYangSama(angka, p.harapan.map((h) => h.nilai)),
    );
    const sudahTerpakai = new Set<number>();
    for (const p of pemeriksaan) {
      for (const a of angka) if (adaYangSama([a], p.harapan.map((h) => h.nilai))) sudahTerpakai.add(a);
    }

    const lokal = nilaiLokal(kalimat, data);
    const basis: NilaiMentah[] = [...lokal];
    for (const a of angka) {
      const langsung = cariLangsung(data, a);
      if (langsung !== null) basis.push({ nilai: a, asal: `angka lain di kalimat yang sama (ada di ${langsung.asal})`, persen: langsung.persen });
    }
    let rataRata: RataRata[] | null = null;
    const ambilRataRata = (): RataRata[] => {
      if (rataRata === null) rataRata = rataRataBerjangkar(kalimat, data);
      return rataRata;
    };

    for (const a of angka) {
      const satuan = satuanAngka(berekor, a);
      const kebal = sudahTerpakai.has(a) || satuan !== null;
      const bentrok = kebal ? undefined : belumPuas.find((p) => p.harapan.some((h) => sebanding(a, h.nilai)));
      if (bentrok !== undefined) {
        hasil.push({
          nilai: a,
          status: 'salah',
          alasan:
            `bertentangan dengan data mentah: kalimat mengklaim ${bentrok.nama} tetapi tidak memuat satu pun ` +
            `nilai yang benar (${bentrok.harapan.map((h) => `${h.nilai} — ${h.asal}`).join('; ')})`,
          kalimat,
        });
        continue;
      }

      // Seluruh penjelasan dikumpulkan, lalu yang PALING PERSIS dipakai; kalau
      // sama persisnya, yang tingkatnya lebih kuat menang. Tanpa ini, alasan
      // yang tercetak di laporan sering medan yang kebetulan berselisih < 1 %
      // dan tidak ada hubungannya dengan klaimnya.
      let jelas: Penjelasan | null = null;

      // P1 — nilai langsung milik tanggal/tahun yang disebut kalimat ini.
      if (satuan !== 'kali') {
        const p1 = cariDi(lokal.filter((n) => satuan !== 'persen' || n.persen), a);
        if (p1 !== null) jelas = lebihBaik(jelas, { asal: `ada langsung di ${p1.asal}`, tingkat: 1, jarak: selisihRelatif(a, p1.nilai) });
      }
      // P2 — turunan satu langkah dari basis lokal.
      jelas = lebihBaik(jelas, cariTurunanPasangan(a, basis, 2));
      // P3 — rata-rata atas rentang berjangkar.
      for (const r of ambilRataRata()) {
        if (!angkaSama(a, r.nilai)) continue;
        jelas = lebihBaik(jelas, { asal: r.asal, tingkat: 3, jarak: selisihRelatif(a, r.nilai) });
      }
      // P4 — perbandingan terhadap rata-rata itu ("sekian kali rata-rata").
      for (const r of ambilRataRata()) {
        if (r.nilai === 0) continue;
        for (const b of basis) {
          if (!angkaSama(a, b.nilai / r.nilai)) continue;
          jelas = lebihBaik(jelas, {
            asal: `turunan rasio (x ÷ y) dari ${b.asal} dan ${r.asal}`,
            tingkat: 4,
            jarak: selisihRelatif(a, b.nilai / r.nilai),
          });
        }
      }
      // P5 — nilai langsung di mana pun, penjelasan terlemah.
      if (satuan !== 'kali') {
        const p5 = cariLangsung(data, a, satuan === 'persen');
        if (p5 !== null) {
          jelas = lebihBaik(jelas, {
            asal: `ada di data mentah pada ${p5.asal}, tetapi tidak terkait tanggal/tahun yang disebut kalimat ini (penjelasan lemah)`,
            tingkat: 5,
            jarak: selisihRelatif(a, p5.nilai),
          });
        }
      }

      hasil.push(
        jelas !== null
          ? { nilai: a, status: 'cocok', alasan: jelas.asal, kalimat }
          : {
              nilai: a,
              status: 'tidak-terverifikasi',
              alasan: 'tidak ada di data mentah dan tidak bisa diturunkan dengan aritmetika yang diterima',
              kalimat,
            },
      );
    }
  }
  return hasil;
}
