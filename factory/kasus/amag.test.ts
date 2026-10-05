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
 *
 * Sejak M2d-29 lampiran kasus ini pun TULISAN AGENT (percobaan
 * `m2d29-amag-lengkapi-3`), dipasang tanpa disunting. Dua penjaga tambahan:
 * lampiran terdaftar = berkas percobaan itu byte demi byte, dan kasus yang
 * dibangun = `kasus.json` percobaan itu byte demi byte. Tiap pernyataan layar
 * pembukaan tulisan agent ("berikutnya", "lagi", "sama dengan", "hanya",
 * "terakhir", jenis data yang "kosong") tetap dihitung ulang dari JSON mentah
 * di bawah — bukan dibandingkan sebagai string.
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
import {
  BERKAS_LAMPIRAN_AMAG,
  LAMPIRAN_AMAG_2026_06_15 as LAMPIRAN,
  PERCOBAAN_LAMPIRAN_AMAG,
  SHA256_LAMPIRAN_AMAG,
} from './lampiran/amag-2026-06-15.ts';

const AKAR = fileURLToPath(new URL('../../', import.meta.url));
const ID = 'amag-2026-06-15';
const BERKAS = `${AKAR}cases/${ID}.json`;
/** Kasus yang ditulis program percobaan saat lampiran agent lolos critic. */
const KASUS_PERCOBAAN = `${AKAR}${PERCOBAAN_LAMPIRAN_AMAG}/kasus.json`;
const sha256 = (isi: Buffer): string => createHash('sha256').update(isi).digest('hex');
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

  it('lampiran terdaftar = berkas tulisan agent dari percobaan, byte demi byte, tidak disunting', () => {
    const mentahLampiran = readFileSync(`${AKAR}${BERKAS_LAMPIRAN_AMAG}`);
    expect(BERKAS_LAMPIRAN_AMAG).toBe('eval/penyusun/m2d29-amag-lengkapi-3/lampiran-agen.json');
    expect(sha256(mentahLampiran)).toBe(SHA256_LAMPIRAN_AMAG);
    // Bentuk tulis program percobaan (`keJson`): lampiran yang termuat menghasilkan berkas itu kembali, tanpa selisih satu byte.
    expect(keJson(LAMPIRAN)).toBe(mentahLampiran.toString('utf8'));
  });

  it('berkas di repo byte-identik dengan kasus.json percobaan agent', () => {
    // Pembanding yang tidak lewat pabrik di repo ini sekarang: berkas yang ditulis saat percobaan.
    expect(sha256(readFileSync(BERKAS))).toBe(sha256(readFileSync(KASUS_PERCOBAAN)));
    expect(readFileSync(BERKAS).equals(readFileSync(KASUS_PERCOBAAN))).toBe(true);
  });

  it('tiga soal, pengirim dan urutannya seperti keputusan lampiran agent', () => {
    expect(k.soal.map((s) => s.soal_id)).toEqual(LAMPIRAN.soal.map((s) => s.soal_id));
    expect(k.soal.map((s) => s.soal_id)).toEqual(['belum-balik-akhir-mei', 'tujuh-kali-dividen', 'volume-sepi']);
    expect(k.soal.map((s) => s.pesan.nama)).toEqual(['Rara', 'Dimas', 'Bayu']);
    // Urutan main = urutan jam kirim (aturan 'tampilan' tahap lengkapi; percobaan m2d29-2 melanggarnya dan digantikan).
    const jam = k.soal.map((s) => s.pesan.jam);
    expect(jam).toEqual(['16.42', '18.15', '20.05']);
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

  it('tulisan lampiran (kini tulisan agent): tanpa penilaian saham, tanpa ajakan, tanpa kata "kasus"', () => {
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
      [
        'harga-2026-06-17', 'harga-2026-06-18', 'harga-2026-06-19', 'harga-2026-06-23',
        'harga-2026-07-13', 'harga-2026-07-14', 'harga-2026-07-21',
        'volume-2026-06-17', 'volume-2026-06-18', 'volume-2026-06-19', 'volume-2026-06-23',
        'volume-2026-07-15', 'volume-2026-07-21',
      ].sort(),
    );
    expect([...k.pembukaan.fact_ids].sort()).toEqual(sesudahT);
    for (const id of sesudahT) {
      expect(k.pembukaan.fact_ids, id).toContain(id);
      expect(k.fakta_terlihat, id).not.toContain(id);
    }
    // Tidak satu pun kartu, pilihan, atau penjelasan menautkan fakta sesudah T.
    const diSoal = [
      ...k.fakta.filter((f) => f.awam !== null).map((f) => f.awam?.isi ?? ''),
      ...k.soal.flatMap((s) => [s.penjelasan, ...s.pilihan.map((p) => p.teks)]),
    ].flatMap((t) => ambilRujukan(t).map((r) => r.fact_id));
    expect(diSoal.filter((id) => sesudahT.includes(id))).toEqual([]);
    /*
     * Fakta pertama tiap paragraf garis waktu (aplikasi mengambil keping
     * tanggalnya dari sini). Tujuh paragraf pertama dibuka fakta sesudah T,
     * berurutan maju; paragraf kedelapan (jenis data yang tidak mencatat
     * apa-apa) tanpa tautan, jadi tanpa keping.
     */
    const pembuka = k.pembukaan.paragraf.map((p) => ambilRujukan(p)[0]?.fact_id ?? null);
    expect(pembuka).toEqual([
      'harga-2026-06-17', 'harga-2026-06-18', 'harga-2026-06-19', 'harga-2026-06-23', 'harga-2026-07-13', 'volume-2026-07-15',
      'harga-2026-07-21', null,
    ]);
    const bertanggal = pembuka.filter((id): id is string => id !== null);
    expect(bertanggal.filter((id) => !sesudahT.includes(id))).toEqual([]);
    const tanggal = bertanggal.map((id) => id.slice(-10));
    expect([...tanggal].sort()).toEqual(tanggal);
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
    // 14 harga + 8 volume + 2 dividen; lampiran agent menautkan lebih banyak baris sesudah T daripada lampiran penyetuju (18).
    expect(diperiksa).toBe(24);
    expect(k.fakta.find((f) => f.fact_id === 'dividen-tercatat')?.nilai).toBe(aksi.dividend.length);
    // Dua sisanya fakta hitungan: dividen-tercatat dan hari-naik-beruntun.
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

  /*
   * Layar pembukaan tulisan agent. Tiap pernyataan dihitung ulang dari baris
   * mentah; kalimatnya dikutip di komentar supaya jelas pernyataan mana yang
   * dibuktikan. Angka di label tautannya sudah dicocokkan dengan kalimat
   * faktanya (tes "tiap angka di label rujukan"), dan nilai tiap fakta dengan
   * JSON mentah (tes "tiap fakta harga, volume, dan dividen").
   */
  const baris = (t: string): BarisHarga => {
    const h = harga.find((x) => x.date === t);
    if (h === undefined) throw new Error(`tidak ada baris harga ${t}`);
    return h;
  };
  const sesudah = harga.filter((x) => x.date > T);

  it('pembukaan, paragraf 1–3: baris pertama sesudah T 17 Juni = penutupan 29 Mei; 18 Juni "tetap"; 19 Juni Rp386, "hanya" 200 lembar', () => {
    // "Hari bursa pertama sesudahnya di data, 17 Juni 2026, harga tutup Rp398. Angka itu sama dengan penutupan 29 Mei 2026. Volumenya 5.500 lembar."
    expect(sesudah[0]).toMatchObject({ date: '2026-06-17', close: 398, volume: 5_500 });
    expect(sesudah[0]?.close).toBe(tutup('2026-05-29'));
    // "Pada 18 Juni 2026 harga tutup tetap Rp398, dengan volume 43.700 lembar." — "tetap": sama dengan baris tepat sebelumnya.
    expect(sesudah[1]).toMatchObject({ date: '2026-06-18', close: 398, volume: 43_700 });
    expect(sesudah[1]?.close).toBe(sesudah[0]?.close);
    // "Pada 19 Juni 2026 harga tutup Rp386. Volumenya hanya 200 lembar."
    expect(sesudah[2]).toMatchObject({ date: '2026-06-19', close: 386, volume: 200 });
    // "hanya": tidak ada baris sesudah T — bahkan di seluruh data — yang volumenya lebih kecil.
    expect(Math.min(...harga.map((x) => x.volume))).toBe(200);
    expect(Math.min(...sesudah.map((x) => x.volume))).toBe(baris('2026-06-19').volume);
  });

  it('pembukaan, paragraf 4: 23 Juni Rp400 = penutupan TERTINGGI sesudah T sejauh data yang ada, satu-satunya', () => {
    // "Pada 23 Juni 2026 harga tutup Rp400, penutupan tertinggi sesudah hari simulasi sejauh data yang ada. Volumenya 12.000 lembar."
    expect(baris('2026-06-23')).toMatchObject({ close: 400, volume: 12_000 });
    const maks = Math.max(...sesudah.map((x) => x.close));
    expect(maks).toBe(400);
    expect(sesudah.filter((x) => x.close === maks).map((x) => x.date)).toEqual(['2026-06-23']);
    // "sejauh data yang ada": data berakhir 21 Juli 2026.
    expect(sesudah.at(-1)?.date).toBe('2026-07-21');
  });

  it('pembukaan, paragraf 5: 13 Juli Rp386 dan "esoknya" 14 Juli juga Rp386', () => {
    // "Pada 13 Juli 2026 harga tutup Rp386, dan esoknya, 14 Juli 2026, juga Rp386."
    expect(tutup('2026-07-13')).toBe(386);
    expect(tutup('2026-07-14')).toBe(tutup('2026-07-13'));
    // "esoknya": baris tepat berikutnya DAN hari kalender berikutnya.
    expect(harga[harga.findIndex((x) => x.date === '2026-07-13') + 1]?.date).toBe('2026-07-14');
    expect((Date.parse('2026-07-14T00:00:00Z') - Date.parse('2026-07-13T00:00:00Z')) / 86_400_000).toBe(1);
  });

  it('pembukaan, paragraf 6: volume 15 Juli 135.100 lembar = TERBESAR sesudah T sejauh data yang ada, satu-satunya', () => {
    // "Pada 15 Juli 2026 volumenya 135.100 lembar, terbesar sesudah hari simulasi sejauh data yang ada."
    expect(baris('2026-07-15').volume).toBe(135_100);
    const maks = Math.max(...sesudah.map((x) => x.volume));
    expect(maks).toBe(135_100);
    expect(sesudah.filter((x) => x.volume === maks).map((x) => x.date)).toEqual(['2026-07-15']);
  });

  it('pembukaan, paragraf 7: baris terakhir di data 21 Juli, tutup sama dengan penutupan 15 Juni', () => {
    // "Baris terakhir di data, 21 Juli 2026, harga tutup Rp392, sama dengan penutupan 15 Juni 2026. Volumenya 23.200 lembar."
    expect(harga.at(-1)).toMatchObject({ date: '2026-07-21', close: 392, volume: 23_200 });
    expect(harga.at(-1)?.close).toBe(tutup(T));
  });

  it('pembukaan: tiap persamaan, superlatif, dan kata urutan di garis waktu sudah dihitung ulang di atas — tidak ada yang lolos tanpa hitungan', () => {
    // Penjaga alat ukur: kalau tulisan pembukaan berubah dan memuat klaim sejenis yang baru, tes ini menagih hitungannya.
    const gabung = k.pembukaan.paragraf.map(teksPolos).join(' ');
    expect(gabung.match(/sama dengan/g) ?? []).toHaveLength(2);
    expect(gabung.match(/\b(tertinggi|terendah|terbesar|terkecil|paling)\b/gi) ?? []).toEqual(['tertinggi', 'terbesar']);
    expect(gabung.match(/\b(pertama|berikutnya|terakhir|tetap|esoknya|hanya|juga|lagi)\b/gi) ?? []).toEqual(['pertama', 'tetap', 'hanya', 'esoknya', 'juga', 'terakhir']);
  });

  it('pembukaan, paragraf 8: sesudah T data tidak mencatat dividen baru, rapat, atau penghentian sementara perdagangan; laporan kepemilikan tidak terbaca sama sekali', () => {
    // "Sesudah tanggal simulasi, data tidak mencatat dividen baru, rapat umum pemegang saham, atau penghentian sementara perdagangan."
    expect(aksi.dividend.filter((d) => d.ex_date > T)).toEqual([]);
    expect(aksi.dividend.filter((d) => d.payment_date > T)).toEqual([]);
    expect(aksi.agm.filter((r) => r.agm_date > T)).toEqual([]);
    /*
     * Penghentian perdagangan: keenam berkas gudang kasus ini TIDAK memuat
     * daftar suspensi sama sekali, jadi "tidak mencatat" di sana berarti "tidak
     * dibaca". Pembuktiannya dari daftar suspensi seluruh bursa di gudang
     * (`suspensions-all.json`, di luar keenam berkas itu): tidak ada satu baris
     * pun untuk emiten ini, sebelum maupun sesudah T, dan daftarnya memang
     * menjangkau sesudah T.
     */
    expect(LAMPIRAN.sumber.gudang.filter((b) => /susp/i.test(b.nama))).toEqual([]);
    const suspensi = mentah<Array<{ symbol: string; suspension_date: string }>>('suspensions-all.json');
    expect(suspensi.length).toBeGreaterThan(100);
    expect(suspensi.filter((s) => s.symbol.toUpperCase().startsWith('AMAG'))).toEqual([]);
    expect(suspensi.some((s) => s.suspension_date > '2026-07-21')).toBe(true);
    expect(suspensi.some((s) => s.suspension_date < T)).toBe(true);
    // "Laporan kepemilikan tidak terbaca sama sekali untuk perusahaan ini; kosongnya data belum tentu berarti tidak ada laporan."
    const laporan = mentah<{ results: unknown[]; pagination: { total_count: number } }>('AMAG-m4a-filings-p0.json');
    expect(laporan.results).toEqual([]);
    expect(laporan.pagination.total_count).toBe(0);
    // Permintaannya memang mencakup kedua sisi T (dicatat manifest gudang saat data diambil).
    const manifest = JSON.parse(readFileSync(`${AKAR}docs/bukti/gudang-manifest.json`, 'utf8')) as {
      berkas: Array<{ nama: string; path_endpoint: string | null }>;
    };
    const minta = manifest.berkas.find((b) => b.nama === 'AMAG-m4a-filings-p0.json')?.path_endpoint ?? '';
    const awal = /start=(\d{4}-\d{2}-\d{2})/.exec(minta)?.[1] ?? '';
    const akhir = /end=(\d{4}-\d{2}-\d{2})/.exec(minta)?.[1] ?? '';
    expect(minta).toContain('symbol=AMAG');
    expect(awal !== '' && awal < T).toBe(true);
    expect(akhir > T).toBe(true);
    // "belum tentu berarti tidak ada laporan": itulah temuan R25 kasus ini.
    expect(k.temuan.find((t) => t.aturan === 'R25')?.ringkasan).toContain('tidak boleh disimpulkan');
  });

  it('pembukaan, "bisa dibaca": Rp392 di bawah Rp398 akhir Mei; 12.000 milik 12 Juni, hari bursa sebelumnya; dividen terbaru lebih kecil dari yang ber-ex 14 Mei 2025', () => {
    // "Harga tutup hari itu Rp392 masih di bawah Rp398 pada akhir Mei, walau sudah naik 5 hari bursa berturut-turut." (5 hari: tes hari-naik-beruntun.)
    expect(tutup(T)).toBe(392);
    expect(harga.filter((x) => x.date.startsWith('2026-05')).at(-1)).toMatchObject({ date: '2026-05-29', close: 398 });
    expect(tutup(T)).toBeLessThan(tutup('2026-05-29'));
    // "Volume hari itu 50.600 lembar. Angka 12.000 lembar adalah volume 12 Juni 2026, hari bursa sebelumnya."
    expect(baris(T).volume).toBe(50_600);
    expect(harga[harga.findIndex((x) => x.date === T) - 1]).toMatchObject({ date: '2026-06-12', volume: 12_000 });
    // "Dividen tunai terbaru Rp30 per lembar, lebih kecil dari Rp40 pada tanggal ex 14 Mei 2025."
    const urut = [...aksi.dividend].filter((d) => d.ex_date <= T).sort((a, b) => a.ex_date.localeCompare(b.ex_date));
    expect(urut.at(-1)).toMatchObject({ ex_date: '2026-05-07', dividend_amount: 30 });
    expect(aksi.dividend.find((d) => d.ex_date === '2025-05-14')?.dividend_amount).toBe(40);
    expect(urut.at(-1)?.dividend_amount).toBeLessThan(40);
  });

  it('pembukaan, "tidak bisa dibaca": volume hari itu "besar" hanya terhadap hari bursa sebelumnya; daftar dividen menyebut bisa ada yang tidak tercatat', () => {
    /*
     * "Kenapa volume hari itu besar. Data harga harian hanya mencatat jumlahnya, bukan alasannya."
     * Yang terbukti dari baris mentah: 50.600 lembar lebih dari empat kali volume hari bursa sebelumnya (12.000) — pembanding
     * yang dipakai omongan Bayu. TEMUAN yang dicatat apa adanya, teksnya tidak disunting: terhadap seluruh baris sampai T,
     * 50.600 berada DI BAWAH median (63.800); 49 dari 88 hari bursa di data bervolume lebih besar.
     */
    expect(baris(T).volume / baris('2026-06-12').volume).toBeGreaterThan(4);
    const sampaiT = harga.filter((x) => x.date <= T).map((x) => x.volume).sort((a, b) => a - b);
    expect(sampaiT).toHaveLength(88);
    expect(sampaiT[Math.floor(sampaiT.length / 2)]).toBe(63_800);
    expect(sampaiT.filter((v) => v > baris(T).volume).length).toBe(49);
    // "Apakah daftar dividen itu lengkap. Daftarnya sendiri menyebut bisa ada pembagian yang tidak tercatat."
    expect(k.fakta.find((f) => f.fact_id === 'dividen-tercatat')?.klaim).toContain('bisa saja ada pembagian yang terjadi tetapi tidak tercatat');
  });

  it('pembukaan, "disingkirkan": satu calon kartu rapat; satu pembagian lama di luar selang; dua hitungan paket tidak dipakai kartu', () => {
    // "Satu calon kartu tentang rapat umum pemegang saham disingkirkan, karena kalimatnya menyebut tahun yang jatuh sesudah tanggal simulasi."
    expect(paket().disingkirkan.map((d) => d.fact_id)).toEqual(['rups-2026-04-27']);
    const rapat = aksi.agm.find((r) => r.agm_date === '2026-04-27')?.agm_result ?? '';
    const tahun = (rapat.match(/\b20\d{2}\b/g) ?? []).map(Number);
    expect(Math.max(...tahun)).toBeGreaterThan(Number(T.slice(0, 4)));
    expect(aksi.agm.filter((r) => r.agm_result !== null)).toHaveLength(1);
    expect(k.fakta.some((f) => f.fact_id.startsWith('rups-'))).toBe(false);
    // "Perbandingan dividen dengan laba tahun bukunya tidak dijadikan kartu. Untuk satu pembagian lama hasilnya di luar selang yang dianggap masuk akal, ..."
    interface Keuangan { financials: { historical_financials: Array<{ year: number; earnings: number; outstanding_shares: number }> } }
    const buku2020 = mentah<Keuangan>('AMAG-m4a-overview-financials.json').financials.historical_financials.find((x) => x.year === 2020);
    const dividen2021 = aksi.dividend.find((d) => d.ex_date === '2021-07-07');
    expect(buku2020?.earnings).toBe(107_253_266_000);
    expect(dividen2021?.dividend_amount).toBe(50);
    // Dengan jumlah saham mentah tahun buku itu pun hasilnya di atas 200% laba — batas atas selang pemeriksaan R26.
    const persen = (((dividen2021?.dividend_amount ?? 0) * (buku2020?.outstanding_shares ?? 0)) / (buku2020?.earnings ?? 1)) * 100;
    expect(persen).toBeGreaterThan(200);
    // "satu pembagian": tepat satu temuan R26; "penyebabnya tidak diketahui; bisa juga cara memetakan tahun bukunya" = isi temuan itu.
    const r26 = k.temuan.filter((t) => t.aturan === 'R26');
    expect(r26).toHaveLength(1);
    expect(r26[0]?.ringkasan).toContain('2021-07-07');
    expect(r26[0]?.ringkasan).toContain('Penyebabnya tidak diketahui; bisa juga aturan pemetaan tahun buku kami');
    expect(k.fakta.some((f) => /laba/i.test(f.klaim))).toBe(false);
    // "Dua hitungan di paket fakta, selisih dan kelipatan harga antara akhir Mei dan hari itu, tidak dipakai sebagai kartu di ketiga omongan."
    const hitungan = paket().fakta.filter((f) => f.jenis === 'hitungan').map((f) => f.fact_id).sort();
    expect(hitungan).toEqual(['hari-naik-beruntun', 'kelipatan-2026-05-29-2026-06-15', 'turun-2026-05-29-2026-06-15']);
    const nilaiPaket = (id: string): number | string | null | undefined => paket().fakta.find((f) => f.fact_id === id)?.nilai;
    expect(nilaiPaket('turun-2026-05-29-2026-06-15')).toBe(tutup('2026-05-29') - tutup(T));
    expect(nilaiPaket('kelipatan-2026-05-29-2026-06-15')).toBe(Math.round((tutup(T) / tutup('2026-05-29')) * 100) / 100);
    const kartu = new Set(k.soal.flatMap((s) => s.kartu));
    expect(k.soal).toHaveLength(3);
    for (const id of ['kelipatan-2026-05-29-2026-06-15', 'turun-2026-05-29-2026-06-15']) expect(kartu.has(id), id).toBe(false);
    expect(kartu.has('hari-naik-beruntun')).toBe(true);
  });

  it('kartu: 12 Juni baris tepat sebelum hari simulasi; 29 Mei baris terakhir bulan Mei', () => {
    expect(harga[harga.findIndex((x) => x.date === T) - 1]?.date).toBe('2026-06-12');
    expect(harga.filter((x) => x.date.startsWith('2026-05')).at(-1)?.date).toBe('2026-05-29');
  });

  it('jejak verifikasi: lima dari tujuh pembagian di luar rentang harga harian; satu melebihi dua kali laba', () => {
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
