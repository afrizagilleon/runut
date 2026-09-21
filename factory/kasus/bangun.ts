/**
 * Perangkai berkas kasus: pemuat fakta + mesin verifikasi + teks soal buatan
 * manusia menjadi satu `Kasus` yang lolos validator.
 *
 * Tidak ada angka yang ditulis di sini. Yang ditulis manusia hanyalah kalimat,
 * dan setiap angka di dalam kalimat itu berupa rujukan `[[fact_id|teks]]` yang
 * harus menunjuk fakta yang benar-benar ada (INV-4).
 */
import { PENANDA_BUKAN_FAKTA, ambilRujukan } from '../skema/rujukan.ts';
import type {
  Emiten,
  Fakta,
  Kasus,
  KartuKonsep,
  MasalahValidasi,
  Pembuka,
  Pembukaan,
  PemeriksaanAturan,
  Soal,
  Temuan,
  TeksAwam,
} from '../skema/tipe.ts';
import { VERSI_SKEMA } from '../skema/tipe.ts';
import { periksaKasus } from '../skema/validator.ts';
import { verifikasi } from '../verifikasi/aturan.ts';
import type { KonteksVerifikasi } from '../verifikasi/tipe.ts';
import type { DataDada } from '../muat/dada.ts';
import {
  ambilFakta,
  faktaKenaikan,
  faktaTurunanPemain,
  pustakaDada,
  type AsalTurunanPemain,
} from '../muat/fakta.ts';

export interface JendelaTurunan {
  dari: string;
  sampai: string;
}

export interface DefinisiKasus {
  kasus_id: string;
  judul: string;
  emiten: Emiten;
  nama_samaran: string;
  tanggal_t: string;
  /** Jendela harga yang dipakai menurunkan fakta kenaikan dan kelipatan. */
  turunan: JendelaTurunan[];
  /** Fakta turunan khusus pemain: pengandaian lot dan penjumlahan laporan (D-13a). */
  turunan_pemain: AsalTurunanPemain;
  pembuka: Pembuka;
  fakta_terlihat: string[];
  /**
   * Teks kartu dalam bahasa sehari-hari, per fact_id. Kata-kata kartu ditulis di
   * definisi kasus karena ia per-kasus (memakai nama samaran emiten); angkanya
   * tetap lahir di pemuat dan ditautkan lewat `[[fact_id|teks]]`.
   */
  awam: Record<string, TeksAwam>;
  soal: Soal[];
  pembukaan: Pembukaan;
  kartu_konsep: KartuKonsep[];
  disclaimer: string[];
}

export class KasusTidakSah extends Error {
  readonly masalah: MasalahValidasi[];

  constructor(kasus_id: string, masalah: MasalahValidasi[]) {
    super(
      `Kasus "${kasus_id}" tidak lolos validator; ${String(masalah.length)} masalah:\n` +
        masalah.map((m) => `  [${m.kode}] ${m.pesan}`).join('\n'),
    );
    this.name = 'KasusTidakSah';
    this.masalah = masalah;
  }
}

function rujukanDalamTeks(teks: string): string[] {
  return ambilRujukan(teks)
    .map((r) => r.fact_id)
    .filter((id) => !PENANDA_BUKAN_FAKTA.includes(id));
}

/** Semua fact_id yang disebut definisi kasus, baik lewat daftar maupun lewat teks. */
function idYangDisebut(def: DefinisiKasus): string[] {
  const id: string[] = [...def.fakta_terlihat, ...def.pembukaan.fact_ids];
  id.push(...rujukanDalamTeks(def.pembuka.kalimat));
  for (const s of def.soal) {
    /*
     * `pesan` dan `tanya` sengaja TIDAK ikut: keduanya ucapan orang, dan
     * rujukan di dalamnya tidak pernah dirender (INV-4, D-2). Kalau ia ikut
     * dihitung di sini, fakta bisa lolos "terpakai" hanya karena disebut di
     * dalam kalimat teman — padahal pemain tidak bisa membukanya dari sana.
     */
    id.push(...s.kartu, ...s.fact_ids, ...rujukanDalamTeks(s.penjelasan));
    for (const p of s.pilihan) id.push(...rujukanDalamTeks(p.teks));
  }
  for (const [fact_id, teks] of Object.entries(def.awam)) {
    id.push(fact_id, ...rujukanDalamTeks(teks.isi));
  }
  const barisPembukaan = [
    ...def.pembukaan.paragraf,
    ...def.pembukaan.bisa_dibaca,
    ...def.pembukaan.tidak_bisa_dibaca,
    ...def.pembukaan.disingkirkan,
  ];
  for (const p of barisPembukaan) id.push(...rujukanDalamTeks(p));
  return id;
}

/** Tambahkan fakta asal dari `turunan_dari` sampai tidak ada lagi yang kurang. */
function lengkapiTurunan(terpilih: Map<string, Fakta>, pustaka: Fakta[]): void {
  let berubah = true;
  while (berubah) {
    berubah = false;
    for (const fakta of [...terpilih.values()]) {
      for (const asal of fakta.turunan_dari) {
        if (terpilih.has(asal)) continue;
        terpilih.set(asal, ambilFakta(pustaka, asal));
        berubah = true;
      }
    }
  }
}

/** Kaitkan tiap temuan dengan fakta laporannya lewat nama berkas di `rujukan`. */
function kaitkanTemuan(temuan: Temuan[], pustaka: Fakta[]): Temuan[] {
  const perBerkas = new Map<string, string[]>();
  for (const f of pustaka) {
    const berkas = f.sumber.berkas;
    if (berkas === null) continue;
    const daftar = perBerkas.get(berkas);
    if (daftar === undefined) perBerkas.set(berkas, [f.fact_id]);
    else daftar.push(f.fact_id);
  }
  return temuan.map((t) => {
    const terkait = new Set<string>(t.fakta_terkait);
    for (const [berkas, idFakta] of perBerkas) {
      if (!t.rujukan.some((r) => r.includes(berkas))) continue;
      for (const id of idFakta) terkait.add(id);
    }
    return { ...t, fakta_terkait: [...terkait].sort() };
  });
}

/**
 * Fakta yang tersangkut temuan berstatus KONFLIK, dan fakta gabungan yang
 * dihitung dari fakta KONFLIK ikut menjadi KONFLIK: penjumlahan yang memuat
 * laporan bermasalah ikut bermasalah.
 */
function tandaiKonflik(terpilih: Map<string, Fakta>, temuan: Temuan[]): void {
  const konflik = new Set<string>();
  for (const t of temuan) for (const id of t.fakta_terkait) konflik.add(id);

  let berubah = true;
  while (berubah) {
    berubah = false;
    for (const fakta of terpilih.values()) {
      if (konflik.has(fakta.fact_id)) continue;
      if (fakta.turunan_dari.some((asal) => konflik.has(asal))) {
        konflik.add(fakta.fact_id);
        berubah = true;
      }
    }
  }

  for (const [id, fakta] of terpilih) {
    if (konflik.has(id)) terpilih.set(id, { ...fakta, status: 'KONFLIK' });
  }
}

/**
 * Tempelkan teks kartu ke faktanya. Teks awam untuk fact_id yang tidak terpakai
 * adalah salah ketik yang diam-diam tidak pernah tampil, jadi ia dilempar.
 */
function pasangAwam(terpilih: Map<string, Fakta>, awam: Record<string, TeksAwam>): void {
  for (const [fact_id, teks] of Object.entries(awam)) {
    const fakta = terpilih.get(fact_id);
    if (fakta === undefined) {
      throw new Error(
        `Teks awam ditulis untuk fact_id "${fact_id}", tetapi fakta itu tidak dipakai kasus ini; ` +
          'teks kartu yang tidak pernah tampil hampir selalu salah ketik.',
      );
    }
    terpilih.set(fact_id, { ...fakta, awam: teks });
  }
}

export interface HasilBangun {
  kasus: Kasus;
  /** Aturan yang tidak bisa dijalankan, untuk dicetak perintah build. */
  dilewati: PemeriksaanAturan[];
}

/** Konteks verifikasi untuk DADA: rantai 2025, dengan laporan 2026 sebagai sumber kedua (R5). */
export function konteksDada(data: DataDada): KonteksVerifikasi {
  const laporan2026 = data.laporan2026[0];
  return {
    simbol: data.simbol,
    laporan: data.laporan2025,
    harga: data.harga,
    suspensi: data.suspensi,
    saham_beredar: data.saham_beredar.lembar,
    potret:
      laporan2026 === undefined
        ? null
        : {
            sumber: `laporan ${laporan2026.dilaporkan_pada.slice(0, 10)} (${laporan2026.berkas}), saldo sebelum transaksi`,
            pada: laporan2026.dilaporkan_pada.slice(0, 10),
            lembar: laporan2026.sebelum,
          },
    tanda_repo: {},
  };
}

export function bangunKasus(def: DefinisiKasus, data: DataDada): HasilBangun {
  const dasar = [
    ...pustakaDada(data).fakta,
    ...def.turunan.flatMap((j) => faktaKenaikan(data, j.dari, j.sampai)),
  ];
  // Turunan pemain dihitung dari pustaka dasar, jadi ia tidak bisa menyebut
  // angka yang tidak ada asalnya (`ambilFakta` melempar kalau id-nya menggantung).
  const pustaka = [...dasar, ...faktaTurunanPemain(dasar, def.turunan_pemain)];

  const hasil = verifikasi(konteksDada(data));
  const temuan = kaitkanTemuan(hasil.temuan, pustaka);
  const pemeriksaan: PemeriksaanAturan[] = hasil.pemeriksaan.map((p) => ({
    aturan: p.aturan,
    judul: p.judul,
    dijalankan: p.dijalankan,
    alasan_lewat: p.alasan_lewat,
    jumlah_temuan: p.temuan.length,
  }));

  const terpilih = new Map<string, Fakta>();
  for (const id of idYangDisebut(def)) {
    if (!terpilih.has(id)) terpilih.set(id, ambilFakta(pustaka, id));
  }
  for (const t of temuan) {
    for (const id of t.fakta_terkait) {
      if (!terpilih.has(id)) terpilih.set(id, ambilFakta(pustaka, id));
    }
  }
  lengkapiTurunan(terpilih, pustaka);
  tandaiKonflik(terpilih, temuan);
  pasangAwam(terpilih, def.awam);

  const kasus: Kasus = {
    skema_versi: VERSI_SKEMA,
    kasus_id: def.kasus_id,
    judul: def.judul,
    emiten: def.emiten,
    nama_samaran: def.nama_samaran,
    tanggal_t: def.tanggal_t,
    pembuka: def.pembuka,
    fakta: [...terpilih.values()].sort((a, b) => a.fact_id.localeCompare(b.fact_id)),
    fakta_terlihat: [...def.fakta_terlihat],
    soal: def.soal,
    pembukaan: def.pembukaan,
    temuan,
    pemeriksaan,
    kartu_konsep: def.kartu_konsep,
    disclaimer: def.disclaimer,
  };

  const masalah = periksaKasus(kasus);
  if (masalah.length > 0) throw new KasusTidakSah(def.kasus_id, masalah);

  return { kasus, dilewati: pemeriksaan.filter((p) => !p.dijalankan) };
}
