/**
 * Kasus AMAG — 15 Juni 2026: kasus pertama yang soalnya ditulis AI agent.
 *
 * Tiga kelas kesalahan dijaga di sini, masing-masing dengan pembanding yang
 * tidak lewat pabriknya sendiri:
 *
 * 1. **Berkas di repo bukan hasil build** — `cases/amag-2026-06-15.json` harus
 *    byte-identik dengan keluaran `bangunKasusTayang`, dan lolos validator.
 * 2. **Angka yang tidak dihitung ulang dari JSON mentah** — tiap fakta berangka
 *    di berkas kasus dihitung ulang di sini dari `.cache/sectors/AMAG-*.json`
 *    dengan rumus yang ditulis terpisah (pola `ultj.test.ts`), dan tiap klaim
 *    tanpa angka di layar pembukaan ("baris berikutnya", "tertinggi",
 *    "terakhir", "lima dari tujuh") dibuktikan dari berkas yang sama.
 * 3. **Angka yang ditautkan ke fakta yang salah** — tiap angka di label
 *    `[[fact_id|teks]]`, baik tulisan agent maupun tulisan penyetuju, harus
 *    sungguh tertulis di kalimat fakta yang ditautkannya.
 *
 * Ditambah satu bukti asal-usul: paket yang dibaca agent bisa dibangun ulang
 * byte-identik dari keenam berkas gudang yang disebut lampiran.
 */
import { createHash } from 'node:crypto';
import { existsSync, readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { bangunPaketPenyusun } from '../../alat/penyusun/paket-otomatis.ts';
import { bangunKasusTayang } from '../bangun-kasus.ts';
import type { PaketFakta } from '../llm/paket.ts';
import { FOLDER_GUDANG, muatGudang } from '../muat/gudang.ts';
import { ambilRujukan, teksPolos } from '../skema/rujukan.ts';
import type { Kasus } from '../skema/tipe.ts';
import { ajakanBertransaksi, periksaKasus } from '../skema/validator.ts';
import { bacaAturanBeku } from '../verifikasi/aturan-beku.ts';
import { bacaSumberAgen, kataTerlarangDi, periksaSetia } from './dari-agen.ts';
import { keJson } from './json.ts';
import { LAMPIRAN_AMAG_2026_06_15 as LAMPIRAN } from './lampiran/amag-2026-06-15.ts';

const AKAR = fileURLToPath(new URL('../../', import.meta.url));
const ID = 'amag-2026-06-15';
const BERKAS = `${AKAR}cases/${ID}.json`;
const T = '2026-06-15';
const adaCache = LAMPIRAN.sumber.gudang.every((b) => existsSync(`${FOLDER_GUDANG}/${b.nama}`));

const kasus = (): Kasus => JSON.parse(readFileSync(BERKAS, 'utf8')) as unknown as Kasus;
const paket = (): PaketFakta => JSON.parse(readFileSync(`${AKAR}${LAMPIRAN.sumber.paket}`, 'utf8')) as PaketFakta;
const mentah = <T,>(nama: string): T => JSON.parse(readFileSync(`${FOLDER_GUDANG}/${nama}`, 'utf8')) as T;

/** Seluruh teks berujukan yang dibaca pemain, dengan nama tempatnya. */
function teksBerujukan(k: Kasus): Array<[string, string]> {
  return [
    ...k.fakta.filter((f) => f.awam !== null).map((f): [string, string] => [`kartu ${f.fact_id}`, f.awam?.isi ?? '']),
    ...k.soal.flatMap((s): Array<[string, string]> => [
      [`penjelasan ${s.soal_id}`, s.penjelasan],
      ...s.pilihan.map((p): [string, string] => [`pilihan ${s.soal_id}/${p.kunci}`, p.teks]),
    ]),
    ...k.pembukaan.paragraf.map((p, i): [string, string] => [`paragraf ${String(i + 1)}`, p]),
    ...k.pembukaan.bisa_dibaca.map((p, i): [string, string] => [`bisa_dibaca ${String(i + 1)}`, p]),
    ...k.pembukaan.tidak_bisa_dibaca.map((p, i): [string, string] => [`tidak_bisa_dibaca ${String(i + 1)}`, p]),
    ...k.pembukaan.disingkirkan.map((p, i): [string, string] => [`disingkirkan ${String(i + 1)}`, p]),
  ];
}

describe('cases/amag-2026-06-15.json', () => {
  const k = kasus();

  it('lolos validator kasus tanpa satu masalah pun', () => {
    expect(periksaKasus(k)).toEqual([]);
  });

  it('tiga soal, pengirim dan urutan jam seperti keputusan lampiran', () => {
    expect(k.soal.map((s) => s.soal_id)).toEqual(['belum-balik-akhir-mei', 'tujuh-kali-dividen', 'volume-hari-ini']);
    expect(k.soal.map((s) => s.pesan.nama)).toEqual(['Rara', 'Dimas', 'Bayu']);
    const jam = k.soal.map((s) => s.pesan.jam);
    expect([...jam].sort()).toEqual(jam);
    expect(k.soal.map((s) => s.jawaban)).toEqual(['b', 'a', 'b']);
  });

  it('tiap soal: tanya menyebut pengirimnya, 1–2 istilah berarti, tanpa petunjuk', () => {
    for (const s of k.soal) {
      expect(s.tanya).toBe(`Omongan ${s.pesan.nama} cocok dengan dokumennya?`);
      expect(s.istilah.length).toBeGreaterThanOrEqual(1);
      expect(s.istilah.length).toBeLessThanOrEqual(2);
      expect(s.petunjuk).toBeNull();
    }
  });

  it('tiap kartu adalah fakta paket agent, dengan id yang sama', () => {
    const id = new Set(paket().fakta.map((f) => f.fact_id));
    expect(k.fakta_terlihat.filter((x) => !id.has(x))).toEqual([]);
    expect(k.fakta_terlihat).toHaveLength(9);
  });

  it('setia pada hasil agent: teks soal dan fakta kartu sama dengan bank dan paket', () => {
    const s = bacaSumberAgen(LAMPIRAN, AKAR);
    expect(periksaSetia(k, s.paket, s.omongan)).toEqual([]);
  });

  it('tiap angka di label rujukan tertulis di kalimat fakta yang ditautkannya', () => {
    const klaim = new Map(k.fakta.map((f) => [f.fact_id, f.klaim]));
    const meleset: string[] = [];
    let diperiksa = 0;
    for (const [tempat, teks] of teksBerujukan(k)) {
      for (const r of ambilRujukan(teks)) {
        const kalimat = klaim.get(r.fact_id);
        if (kalimat === undefined) {
          meleset.push(`${tempat}: "${r.fact_id}" tidak ada di fakta kasus`);
          continue;
        }
        for (const angka of r.teks.match(/\d[\d.,]*\d|\d/g) ?? []) {
          diperiksa += 1;
          const pola = new RegExp(`(?<![\\d.,])${angka.replace(/[.]/g, '\\.')}(?![\\d])`);
          if (!pola.test(kalimat)) meleset.push(`${tempat}: "${r.teks}" → ${r.fact_id} ("${kalimat}")`);
        }
      }
    }
    // Penjaga alat ukur: pemeriksaan ini sungguh menemukan angka untuk diperiksa.
    expect(diperiksa).toBeGreaterThan(60);
    expect(meleset).toEqual([]);
  });

  it('nama asli, kode saham, dan nama orang tidak ada di teks yang dibaca pemain sebelum pembukaan', () => {
    const terlarang = paket().kata_terlarang;
    const teks: Array<[string, string]> = [
      ['judul', k.judul],
      ...teksBerujukan(k),
      ...k.soal.flatMap((s): Array<[string, string]> => [
        [`pesan ${s.soal_id}`, s.pesan.isi],
        [`tanya ${s.soal_id}`, s.tanya],
        ...s.istilah.map((i): [string, string] => [`istilah ${i.kata}`, `${i.kata} ${i.arti}`]),
      ]),
      ...k.fakta.filter((f) => f.awam !== null).map((f): [string, string] => [`kepala ${f.fact_id}`, f.awam?.kepala ?? '']),
      // Kalimat resmi tiap kartu tampil di panel sumber tepat di bawah kartunya.
      ...k.fakta.filter((f) => k.fakta_terlihat.includes(f.fact_id)).map((f): [string, string] => [`klaim ${f.fact_id}`, f.klaim]),
      ['penutup', `${k.penutup.kepala} ${k.penutup.isi}`],
    ];
    expect(teks.length).toBeGreaterThan(50);
    expect(teks.filter(([, t]) => kataTerlarangDi(t, terlarang).length > 0)).toEqual([]);
  });

  it('tulisan penyetuju: tanpa penilaian saham, tanpa ajakan, tanpa kata "kasus"', () => {
    const tulisan = [
      LAMPIRAN.judul,
      ...LAMPIRAN.soal.flatMap((s) => [s.tanya, ...s.istilah.flatMap((i) => [i.kata, i.arti])]),
      ...Object.values(LAMPIRAN.awam).flatMap((a) => [a.kepala, a.isi]),
      ...LAMPIRAN.pembukaan.paragraf,
      ...LAMPIRAN.pembukaan.bisa_dibaca,
      ...LAMPIRAN.pembukaan.tidak_bisa_dibaca,
      ...LAMPIRAN.pembukaan.disingkirkan,
      LAMPIRAN.penutup.kepala,
      LAMPIRAN.penutup.isi,
    ].map(teksPolos);
    expect(tulisan.length).toBeGreaterThan(40);
    const penilaian = /\b(sehat|bagus|buruk|jelek|murah|mahal|layak|menarik|prospek|undervalued|overvalued|cuan|rugi|untung)\b/i;
    expect(tulisan.filter((t) => penilaian.test(t))).toEqual([]);
    expect(tulisan.filter((t) => ajakanBertransaksi(t) !== null)).toEqual([]);
    expect(tulisan.filter((t) => /\bkasus\b/i.test(t))).toEqual([]);
  });

  it('layar pembukaan hanya menautkan fakta; yang sesudah T tidak pernah menjadi kartu', () => {
    const sesudahT = k.fakta.filter((f) => (f.tersedia_sejak ?? '') > T).map((f) => f.fact_id).sort();
    expect(sesudahT).toEqual(
      ['harga-2026-06-17', 'harga-2026-06-18', 'harga-2026-06-19', 'harga-2026-06-23', 'harga-2026-07-21', 'volume-2026-06-17'].sort(),
    );
    for (const id of sesudahT) {
      expect(k.pembukaan.fact_ids, id).toContain(id);
      expect(k.fakta_terlihat, id).not.toContain(id);
    }
    // Tiap paragraf garis waktu yang bertanggal dibuka dengan fakta sesudah T (keping tanggalnya).
    const pembuka = k.pembukaan.paragraf.map((p) => ambilRujukan(p)[0]?.fact_id ?? null);
    expect(pembuka).toEqual(['harga-2026-06-17', 'harga-2026-06-18', 'harga-2026-06-23', 'harga-2026-07-21', null]);
  });

  it('dibekukan di daftar aturan beku sebagai jalur V2, tanpa fakta KONFLIK', () => {
    const beku = bacaAturanBeku().kasus[ID];
    expect(beku?.jalur).toBe('V2');
    expect(beku?.aturan).toEqual(k.pemeriksaan.map((p) => p.aturan));
    expect(k.fakta.filter((f) => f.status !== 'TERVERIFIKASI')).toEqual([]);
    // Temuan yang dikutip layar pembukaan ("disingkirkan") memang ada di jejaknya.
    expect(k.temuan.map((t) => t.aturan).sort()).toEqual(['R25', 'R26', 'R34']);
  });
});

interface BarisHarga {
  date: string;
  close: number;
  volume: number;
}
interface AksiMentah {
  corporate_actions: {
    dividend: Array<{ ex_date: string; payment_date: string; dividend_amount: number }>;
    agm: Array<{ agm_date: string; agm_result: string | null }>;
  };
}

describe.runIf(adaCache)('AMAG dihitung ulang dari .cache/sectors/', () => {
  const k = kasus();
  const harga = [
    ...mentah<BarisHarga[]>('AMAG-m4a-daily-2025-04-30.json'),
    ...mentah<BarisHarga[]>('AMAG-m4a-daily-2026-04-23.json'),
  ].sort((a, b) => a.date.localeCompare(b.date));
  const aksi = mentah<AksiMentah>('AMAG-m4a-corpactions.json').corporate_actions;
  const tutup = (t: string): number => {
    const h = harga.find((x) => x.date === t);
    if (h === undefined) throw new Error(`tidak ada baris harga ${t}`);
    return h.close;
  };

  it('berkas gudang lampiran = berkas yang sidiknya ditulis lampiran', () => {
    for (const b of LAMPIRAN.sumber.gudang) {
      expect(createHash('sha256').update(readFileSync(`${FOLDER_GUDANG}/${b.nama}`)).digest('hex'), b.nama).toBe(b.sha256);
    }
  });

  it('berkas di repo byte-identik dengan hasil build', () => {
    expect(readFileSync(BERKAS, 'utf8')).toBe(keJson(bangunKasusTayang(ID).kasus));
  });

  it('paket yang dibaca agent bisa dibangun ulang dari keenam berkas itu saja', () => {
    const g = muatGudang(FOLDER_GUDANG, { izin: LAMPIRAN.sumber.gudang });
    const ulang = bangunPaketPenyusun('AMAG', T, g).paket;
    const tersimpan = paket();
    // Faktanya harus sama persis: inilah yang dibaca agent dan yang menjadi kartu.
    expect(ulang.fakta).toEqual(tersimpan.fakta);
    expect(ulang.kata_terlarang).toEqual(tersimpan.kata_terlarang);
    expect(ulang.disingkirkan).toEqual(tersimpan.disingkirkan);
  });

  it('tiap fakta harga, volume, dan dividen di berkas kasus = angka di JSON mentah', () => {
    let diperiksa = 0;
    for (const f of k.fakta) {
      const h = /^(harga|volume)-(\d{4}-\d{2}-\d{2})$/.exec(f.fact_id);
      if (h !== null) {
        const baris = harga.find((x) => x.date === h[2]);
        expect(f.nilai, f.fact_id).toBe(h[1] === 'harga' ? baris?.close : baris?.volume);
        expect(f.tersedia_sejak, f.fact_id).toBe(h[2]);
        diperiksa += 1;
        continue;
      }
      const d = /^div-(\d{4}-\d{2}-\d{2})$/.exec(f.fact_id);
      if (d !== null) {
        expect(f.nilai, f.fact_id).toBe(aksi.dividend.find((x) => x.ex_date === d[1])?.dividend_amount);
        diperiksa += 1;
      }
    }
    expect(diperiksa).toBe(18);
    expect(k.fakta.find((f) => f.fact_id === 'dividen-tercatat')?.nilai).toBe(aksi.dividend.length);
    expect(k.fakta).toHaveLength(diperiksa + 2);
  });

  it('kunci tiap soal benar menurut JSON mentah, bukan menurut penjelasannya sendiri', () => {
    const hariT = harga.find((x) => x.date === T);
    const i = harga.findIndex((x) => x.date === T);
    const kemarin = harga[i - 1];
    // Rara: naik beruntun, tetapi penutupan hari ini masih di bawah penutupan akhir Mei.
    const mei = harga.filter((x) => x.date.startsWith('2026-05')).at(-1);
    expect(mei?.date).toBe('2026-05-29');
    expect(hariT?.close).toBe(392);
    expect(mei?.close).toBe(398);
    // Dimas: tujuh pembagian sejak 2020, yang terbaru Rp30 — turun dari Rp40.
    const urut = [...aksi.dividend].sort((a, b) => a.ex_date.localeCompare(b.ex_date));
    expect(urut).toHaveLength(7);
    expect(urut[0]?.ex_date).toBe('2020-07-29');
    expect(urut.at(-1)).toMatchObject({ ex_date: '2026-05-07', dividend_amount: 30 });
    expect(urut.at(-2)).toMatchObject({ ex_date: '2025-05-14', dividend_amount: 40 });
    // Bayu: 12.000 lembar adalah volume hari bursa sebelumnya; hari ini 50.600.
    expect(kemarin).toMatchObject({ date: '2026-06-12', volume: 12_000, close: 390 });
    expect(hariT?.volume).toBe(50_600);
  });

  it('hari-naik-beruntun: lima kenaikan penutupan beruntun, mulai dari penutupan 8 Juni', () => {
    const i = harga.findIndex((x) => x.date === T);
    let naik = 0;
    while (i - naik > 0 && (harga[i - naik]?.close ?? 0) > (harga[i - naik - 1]?.close ?? Infinity)) naik += 1;
    const f = k.fakta.find((x) => x.fact_id === 'hari-naik-beruntun');
    expect(naik).toBe(5);
    expect(f?.nilai).toBe(naik);
    expect(harga[i - naik]?.date).toBe('2026-06-08');
    expect(f?.turunan_dari).toEqual(harga.slice(i - naik, i + 1).map((x) => `harga-${x.date}`));
  });

  it('layar pembukaan: tiap klaim tanpa angka tentang sesudah T terbukti dari deret harga', () => {
    const sesudah = harga.filter((x) => x.date > T);
    // "Baris harga berikutnya di data" = 17 Juni, ditutup persis di penutupan 29 Mei.
    expect(sesudah[0]?.date).toBe('2026-06-17');
    expect(sesudah[0]?.close).toBe(tutup('2026-05-29'));
    // "Sehari kemudian penutupannya tidak bergerak"; lalu 19 Juni turun.
    expect(sesudah[1]?.date).toBe('2026-06-18');
    expect(sesudah[1]?.close).toBe(sesudah[0]?.close);
    expect(sesudah[2]?.date).toBe('2026-06-19');
    expect(sesudah[2]?.close).toBeLessThan(sesudah[1]?.close ?? 0);
    // "Penutupan tertinggi sesudah tanggal simulasi": 23 Juni, satu-satunya.
    const maks = Math.max(...sesudah.map((x) => x.close));
    expect(sesudah.filter((x) => x.close === maks).map((x) => x.date)).toEqual(['2026-06-23']);
    expect(maks).toBe(400);
    // "Baris harga terakhir di data kami" ditutup sama dengan tanggal simulasi.
    expect(sesudah.at(-1)?.date).toBe('2026-07-21');
    expect(sesudah.at(-1)?.close).toBe(tutup(T));
    // "Di antara keduanya penutupan hanya bergerak dari Rp386 sampai Rp400".
    const min = Math.min(...sesudah.map((x) => x.close));
    expect(min).toBe(tutup('2026-06-19'));
    expect(min).toBe(386);
    // Kartu: 29 Mei hari bursa terakhir bulan itu; 12 Juni baris tepat sebelum hari ini.
    expect(new Date('2026-05-29T00:00:00Z').getUTCDay()).toBe(5);
    expect(harga[harga.findIndex((x) => x.date === T) - 1]?.date).toBe('2026-06-12');
  });

  it('layar pembukaan: tidak ada dividen, rapat, atau laporan sesudah T di berkas gudang kasus ini', () => {
    expect(aksi.dividend.filter((d) => d.ex_date > T)).toEqual([]);
    expect(aksi.agm.filter((r) => r.agm_date > T)).toEqual([]);
    const laporan = mentah<{ results: unknown[] }>('AMAG-m4a-filings-p0.json');
    expect(laporan.results).toEqual([]);
  });

  it('"disingkirkan": lima dari tujuh pembagian di luar rentang harga harian; satu melebihi dua kali laba', () => {
    const awal = harga[0]?.date ?? '';
    const akhir = harga.at(-1)?.date ?? '';
    const diLuar = aksi.dividend.filter(
      (d) => !harga.some((h) => h.date < d.ex_date) || !harga.some((h) => h.date > d.ex_date) || d.ex_date < awal || d.ex_date > akhir,
    );
    expect(aksi.dividend).toHaveLength(7);
    // Dua yang punya harga di sekitarnya: 2025 dan 2026. Lima lainnya sebelum deret harga dimulai.
    expect(aksi.dividend.filter((d) => d.ex_date < awal)).toHaveLength(5);
    expect(diLuar).toHaveLength(5);
    const r26 = k.temuan.find((t) => t.aturan === 'R26');
    expect(r26?.ringkasan).toContain('2021-07-07');
    expect(r26?.angka.find((a) => a.label === 'pembagian laba')?.nilai).toBeGreaterThan(200);
    expect(k.temuan.find((t) => t.aturan === 'R34')?.angka.map((a) => a.nilai)).toEqual([5, 7]);
    // Ringkasan rapat April: menyebut tahun sesudah T dan catatan yang bertentangan; tidak ada di berkas kasus.
    const rapat = aksi.agm.find((r) => r.agm_date === '2026-04-27')?.agm_result ?? '';
    expect(rapat).toContain('2029');
    expect(rapat).toContain('conflicting records');
    expect(paket().disingkirkan.map((d) => d.fact_id)).toEqual(['rups-2026-04-27']);
    expect(k.fakta.some((f) => f.fact_id.startsWith('rups-'))).toBe(false);
  });
});
