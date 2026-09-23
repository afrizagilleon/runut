/**
 * M4 T-02: kasus ULTJ, dan **tiap angkanya dihitung ulang dari cache mentah**.
 *
 * Kontraknya menyebut kegagalan ini dengan nama: *"kasus ULTJ berisi angka yang
 * tidak dihitung ulang dari JSON"*. Berkas ini menutupnya dengan cara yang
 * tidak bisa lolos: setiap fakta berangka di `cases/ultj-2026-05-04.json`
 * dihitung ulang **di sini, dari `.cache/sectors/ULTJ-*.json`, dengan rumus
 * yang ditulis terpisah dari pabriknya**. Kalau pabrik dan tes ini sepakat,
 * keduanya harus sepakat dengan data mentah — bukan satu sama lain.
 *
 * Dan satu pemeriksaan kedua yang menjaga kelas kesalahan yang berbeda: tiap
 * angka yang **dibaca pemain** ditelusuri kembali ke fakta yang ditautkannya.
 * Sebuah `[[div-…-bayar|Rp130]]` lolos validator — penandanya ada, faktanya
 * ada — tetapi mengetuk angka itu membuka tanggal pembayaran, bukan Rp130.
 * Pemeriksaan ini menemukannya sekali di draf pertama.
 */
import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { periksaKasus } from '../skema/validator.ts';
import { ambilRujukan, teksPolos } from '../skema/rujukan.ts';
import { ATURAN_V2 } from '../verifikasi/v2.ts';
import { keparahanTemuan, type Fakta, type Kasus } from '../skema/tipe.ts';

const AKAR = fileURLToPath(new URL('../../', import.meta.url));
const GUDANG = `${AKAR}.cache/sectors`;
const BERKAS = `${AKAR}cases/ultj-2026-05-04.json`;
const adaCache = existsSync(`${GUDANG}/ULTJ-filings.json`);

function kasus(): Kasus {
  return JSON.parse(readFileSync(BERKAS, 'utf8')) as unknown as Kasus;
}

function baca(nama: string): Record<string, unknown> {
  return JSON.parse(readFileSync(`${GUDANG}/${nama}`, 'utf8')) as Record<string, unknown>;
}

interface BarisFiling {
  timestamp: string;
  holder_name: string;
  amount_transaction: number;
  share_percentage_before: number;
  share_percentage_after: number;
}

interface BarisHargaMentah {
  date: string;
  open: number | null;
  high: number;
  low: number;
  close: number;
  volume: number;
}

/**
 * Angka yang **seharusnya** ada di berkas kasus, dihitung dari JSON mentah.
 *
 * Rumusnya ditulis ulang di sini dengan sengaja. Memanggil pemuat gudang lagi
 * akan menguji bahwa pemuat sepakat dengan dirinya sendiri — yang selalu benar,
 * dan karena itu tidak menjaga apa pun.
 */
function angkaDariCache(): Map<string, number | string> {
  const harapan = new Map<string, number | string>();

  const aksi = baca('ULTJ-corpactions.json')['corporate_actions'] as Record<string, unknown>;
  const dividen = aksi['dividend'] as Array<{
    ex_date: string;
    payment_date: string;
    dividend_amount: number;
  }>;
  for (const d of dividen) {
    harapan.set(`div-${d.ex_date}`, d.dividend_amount);
    harapan.set(`div-${d.ex_date}-bayar`, d.payment_date);
  }
  harapan.set('dividen-tercatat', dividen.length);
  harapan.set('tahun-berdividen', new Set(dividen.map((d) => d.ex_date.slice(0, 4))).size);

  const harga = new Map<string, BarisHargaMentah>();
  for (const nama of readdirSync(GUDANG).filter((n) => /^ULTJ-daily-.*\.json$/.test(n)).sort()) {
    for (const baris of JSON.parse(readFileSync(`${GUDANG}/${nama}`, 'utf8')) as BarisHargaMentah[]) {
      if (!harga.has(baris.date)) harga.set(baris.date, baris);
    }
  }
  for (const [tanggal, h] of harga) {
    harapan.set(`harga-${tanggal}`, h.close);
    harapan.set(`volume-${tanggal}`, h.volume);
    if (h.open === null) continue;
    harapan.set(`harga-${tanggal}-buka`, h.open);
    harapan.set(`harga-${tanggal}-tertinggi`, h.high);
    harapan.set(`harga-${tanggal}-terendah`, h.low);
  }

  const sebelum = harga.get('2026-04-30');
  const hariT = harga.get('2026-05-04');
  const divT = dividen.find((d) => d.ex_date === '2026-05-04');
  if (sebelum === undefined || hariT === undefined || hariT.open === null || divT === undefined) {
    throw new Error('cache ULTJ tidak memuat baris yang dibutuhkan kartu soal 1');
  }
  const turun = sebelum.close - hariT.open;
  harapan.set('turun-2026-05-04', turun);
  harapan.set('beda-turun-dividen', turun - divT.dividend_amount);

  const laporan = (baca('ULTJ-filings.json')['results'] as BarisFiling[])
    .slice()
    .sort((a, b) => a.timestamp.localeCompare(b.timestamp));
  const nomor = new Map<string, number>();
  for (const l of laporan) {
    const tanggal = l.timestamp.slice(0, 10);
    const ke = (nomor.get(tanggal) ?? 0) + 1;
    nomor.set(tanggal, ke);
    harapan.set(`fil-${tanggal}-${String(ke).padStart(2, '0')}`, l.amount_transaction);
  }

  const januari = (awalan: string): BarisFiling[] =>
    laporan.filter((l) => l.holder_name.startsWith(awalan) && l.timestamp.slice(0, 7) === '2026-01');
  const kelompok: Array<[string, BarisFiling[]]> = [
    ['fil-jan-pemilik-terbesar', januari('Sabana')],
    ['fil-jan-orang-dalam-lain', januari('Suhendra')],
  ];
  let seluruhnya = 0;
  let jumlahLaporan = 0;
  for (const [id, daftar] of kelompok) {
    const pertama = daftar[0];
    const terakhir = daftar[daftar.length - 1];
    if (pertama === undefined || terakhir === undefined) throw new Error(`kelompok ${id} kosong`);
    const total = daftar.reduce((j, l) => j + l.amount_transaction, 0);
    harapan.set(id, total);
    harapan.set(`${id}-laporan`, daftar.length);
    harapan.set(`${id}-persen-awal`, pertama.share_percentage_before);
    harapan.set(`${id}-persen-akhir`, terakhir.share_percentage_after);
    seluruhnya += total;
    jumlahLaporan += daftar.length;
  }
  harapan.set('tambahan-jan-2026', seluruhnya);
  harapan.set('laporan-jan-2026', jumlahLaporan);

  return harapan;
}

describe.runIf(adaCache)('kasus ULTJ — tiap angka dihitung ulang dari cache', () => {
  it('setiap fakta berangka cocok dengan JSON mentah, dan tidak ada yang lolos tanpa rumus', () => {
    const harapan = angkaDariCache();
    const tanpaNilai: string[] = [];
    const tanpaRumus: string[] = [];
    const selisih: string[] = [];
    let cocok = 0;

    for (const f of kasus().fakta) {
      if (f.nilai === null) {
        tanpaNilai.push(f.fact_id);
        continue;
      }
      if (!harapan.has(f.fact_id)) {
        tanpaRumus.push(f.fact_id);
        continue;
      }
      if (harapan.get(f.fact_id) !== f.nilai) {
        selisih.push(
          `${f.fact_id}: berkas kasus ${String(f.nilai)}, cache ${String(harapan.get(f.fact_id))}`,
        );
        continue;
      }
      cocok += 1;
    }

    expect(selisih, 'angka berkas kasus harus sama dengan angka cache').toEqual([]);
    /*
     * "Tidak ada rumus pemeriksa" sama buruknya dengan "angkanya beda": fakta
     * yang tidak bisa dihitung ulang adalah fakta yang tidak bisa dipercaya.
     */
    expect(tanpaRumus, 'tiap fakta berangka harus punya rumus pemeriksa di tes ini').toEqual([]);
    // Satu-satunya fakta tanpa angka: RUPS yang teks keputusannya memang kosong.
    expect(tanpaNilai).toEqual(['rups-2026-10-27']);
    expect(cocok).toBeGreaterThan(35);
  });

  it('tiap angka yang DIBACA pemain menunjuk fakta yang memang bernilai itu', () => {
    const k = kasus();
    const indeks = new Map(k.fakta.map((f) => [f.fact_id, f]));
    const teks: Array<[string, string]> = [
      ...k.fakta
        .filter((f) => f.awam !== null)
        .map((f): [string, string] => [`kartu ${f.fact_id}`, f.awam?.isi ?? '']),
      ...k.soal.map((s): [string, string] => [`penjelasan ${s.soal_id}`, s.penjelasan]),
      ...k.pembukaan.paragraf.map((p, i): [string, string] => [`paragraf ${String(i)}`, p]),
      ...k.pembukaan.bisa_dibaca.map((p, i): [string, string] => [`bisa_dibaca ${String(i)}`, p]),
      ...k.pembukaan.tidak_bisa_dibaca.map((p, i): [string, string] => [
        `tidak_bisa_dibaca ${String(i)}`,
        p,
      ]),
    ];

    const meleset: string[] = [];
    let diperiksa = 0;
    for (const [tempat, isi] of teks) {
      for (const r of ambilRujukan(isi)) {
        const angka = [...r.teks.matchAll(/\d[\d.,]*/g)].map((m) =>
          Number(m[0].replace(/\./g, '').replace(',', '.')),
        );
        if (angka.length === 0) continue;
        const fakta = indeks.get(r.fact_id);
        if (fakta === undefined) {
          meleset.push(`${tempat}: rujukan menggantung "${r.fact_id}"`);
          continue;
        }
        diperiksa += 1;
        if (cocokDenganFakta(angka, r.teks, fakta)) continue;
        meleset.push(
          `${tempat}: "[[${r.fact_id}|${r.teks}]]" menunjuk fakta bernilai ` +
            `${String(fakta.nilai)} (tersedia ${String(fakta.tersedia_sejak)})`,
        );
      }
    }

    expect(meleset).toEqual([]);
    expect(diperiksa, 'harus ada banyak angka yang ditelusuri, bukan nol').toBeGreaterThan(50);
  });
});

/**
 * Angka yang tampil cocok dengan faktanya kalau salah satu benar: ia nilai
 * faktanya; ia bentuk awam nilainya ("16,07 juta" untuk 16.069.900); atau ia
 * bagian dari tanggal ketersediaan faktanya (fakta laporan dan harga ditautkan
 * lewat tanggalnya, dan itu memang menunjuk dokumen yang benar).
 */
function cocokDenganFakta(angka: number[], tampil: string, fakta: Fakta): boolean {
  const nilai = fakta.nilai;
  const sejak = fakta.tersedia_sejak ?? '';
  for (const n of angka) {
    if (typeof nilai === 'number' && Math.abs(n - nilai) < 1e-9) return true;
    if (typeof nilai === 'number' && tampil.includes('juta')) {
      if (Math.abs(n * 1_000_000 - nilai) <= 5_000) return true;
    }
    if (typeof nilai === 'string' && nilai.includes(String(n))) return true;
    if (sejak.includes(String(n)) || sejak.includes(String(n).padStart(2, '0'))) return true;
  }
  return false;
}

describe('kasus ULTJ — berkas yang ikut repo', () => {
  it('ada, lolos validator, dan membawa tanggal beku 4 Mei 2026', () => {
    const k = kasus();
    expect(periksaKasus(k)).toEqual([]);
    expect(k.skema_versi).toBe(3);
    expect(k.tanggal_t).toBe('2026-05-04');
    expect(k.kasus_id).toBe('ultj-2026-05-04');
    expect(k.soal).toHaveLength(3);
    expect(k.disclaimer).toHaveLength(3);
  });

  it('tujuh kartu, dua–tiga per soal, dan jawaban benar tersebar b · a · d', () => {
    const k = kasus();
    expect(k.fakta_terlihat).toHaveLength(7);
    expect(k.soal.map((s) => s.kartu.length)).toEqual([2, 2, 3]);
    expect(k.soal.map((s) => s.jawaban)).toEqual(['b', 'a', 'd']);
    const gabungan = new Set(k.soal.flatMap((s) => s.kartu));
    expect([...gabungan].sort()).toEqual([...k.fakta_terlihat].sort());
  });

  it('dijalankan himpunan V2, dan jumlah aturannya bukan angka yang diketik tangan', () => {
    const k = kasus();
    expect(k.pemeriksaan).toHaveLength(ATURAN_V2.length);
    expect(k.pemeriksaan.map((p) => p.aturan)).toEqual(ATURAN_V2.map((a) => a.kode));
    // Aturan yang digantikan tidak dihapus dari daftar: ia muncul sebagai
    // dilewati beserta alasannya, supaya tidak ada yang hilang diam-diam.
    for (const p of k.pemeriksaan) {
      if (p.dijalankan) continue;
      expect(p.alasan_lewat, `alasan lewat ${p.aturan}`).toBeTruthy();
    }
  });

  it('tidak satu temuan pun berkeparahan konflik, jadi tidak ada kartu yang gugur', () => {
    const k = kasus();
    expect(k.temuan.filter((t) => keparahanTemuan(t) === 'konflik')).toEqual([]);
    expect(k.fakta.filter((f) => f.status !== 'TERVERIFIKASI')).toEqual([]);
  });

  it('tidak memuat kata penilaian saham di teks mana pun yang dilihat pemain', () => {
    const k = kasus();
    const semua = [
      k.judul,
      k.pembuka.judul,
      k.pembuka.ajak,
      k.penutup.kepala,
      k.penutup.isi,
      ...k.fakta.map((f) => f.klaim),
      ...k.fakta.map((f) => f.awam?.isi ?? ''),
      ...k.soal.flatMap((s) => [s.pesan.isi, s.tanya, s.penjelasan, ...s.pilihan.map((p) => p.teks)]),
      ...k.pembukaan.paragraf,
      ...k.pembukaan.bisa_dibaca,
      ...k.pembukaan.tidak_bisa_dibaca,
      ...k.pembukaan.disingkirkan,
    ].join(' \n ');
    for (const kata of ['sehat', 'bagus', 'buruk', 'layak', 'prospek', 'murah', 'mahal']) {
      expect(semua.toLowerCase(), `kata penilaian saham "${kata}"`).not.toContain(kata);
    }
  });

  it('label kasusnya peristiwa: judulnya menyebut yang terjadi, bukan nilainya', () => {
    const k = kasus();
    expect(k.judul).toContain('dividen tiap tahun');
    expect(k.judul).toContain('membeli');
  });

  it('nama dan kode emiten tidak muncul di satu pun teks sebelum layar pembukaan', () => {
    const k = kasus();
    const sebelumDibuka = [
      k.pembuka.judul,
      k.pembuka.ajak,
      ...k.fakta.filter((f) => f.awam !== null).map((f) => f.awam?.isi ?? ''),
      ...k.soal.flatMap((s) => [s.pesan.isi, s.tanya, s.penjelasan, ...s.pilihan.map((p) => p.teks)]),
    ].join(' \n ');
    expect(sebelumDibuka).not.toContain('ULTJ');
    expect(sebelumDibuka.toLowerCase()).not.toContain('ultrajaya');
    expect(sebelumDibuka).toContain(k.nama_samaran);
  });

  it('teks kartu tidak pernah menyebut nama orang — sumber mengejanya dua cara', () => {
    const k = kasus();
    const kartu = k.fakta
      .filter((f) => f.awam !== null)
      .map((f) => `${f.awam?.isi ?? ''} ${f.klaim}`)
      .join(' ');
    for (const nama of ['Sabana', 'Suhendra', 'Prawira']) {
      expect(kartu, `nama orang "${nama}"`).not.toContain(nama);
    }
    expect(kartu).toContain('Pemilik terbesar');
  });

  it('tiap kartu penentu benar-benar kartu soal itu, dan tidak lebih dari dua', () => {
    for (const s of kasus().soal) {
      expect(s.kartu_penentu.length).toBeGreaterThanOrEqual(1);
      expect(s.kartu_penentu.length).toBeLessThanOrEqual(2);
      for (const id of s.kartu_penentu) expect(s.kartu).toContain(id);
    }
  });

  it('tidak ada fakta pembukaan yang bocor ke kartu, dan semuanya terbit sesudah T', () => {
    const k = kasus();
    const indeks = new Map(k.fakta.map((f) => [f.fact_id, f]));
    for (const id of k.pembukaan.fact_ids) {
      expect(k.fakta_terlihat).not.toContain(id);
      const fakta = indeks.get(id);
      expect(fakta, `fakta pembukaan ${id}`).toBeDefined();
      expect(String(fakta?.tersedia_sejak) > k.tanggal_t, `${id} harus terbit sesudah T`).toBe(true);
    }
  });

  it('teks kartu muat di batasnya, diukur sesudah penanda rujukannya dilepas', () => {
    for (const f of kasus().fakta) {
      if (f.awam === null) continue;
      expect(f.awam.kepala.length, `kepala ${f.fact_id}`).toBeLessThanOrEqual(36);
      expect(teksPolos(f.awam.isi).length, `isi ${f.fact_id}`).toBeLessThanOrEqual(220);
    }
  });
});
