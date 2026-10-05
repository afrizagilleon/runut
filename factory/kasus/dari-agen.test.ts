/**
 * Pengubah hasil agent → definisi kasus (`dari-agen.ts`).
 *
 * Kegagalan yang dijaga, dengan namanya:
 *
 * 1. **teks agent berubah di jalan** — pesan, pilihan, kunci, penjelasan, kartu,
 *    dan kartu penentu harus keluar huruf demi huruf seperti di berkas bank,
 *    yang di sini dibaca langsung dari cakram, bukan lewat pengubahnya;
 * 2. **lampiran dan omongan tidak berpasangan** — omongan tanpa lampiran,
 *    lampiran tanpa omongan, kartu tanpa teks awam, teks awam tanpa kartu;
 * 3. **nama asli bocor** — kata terlarang paket di tulisan agent ATAU penyetuju;
 * 4. **berkas agent yang sudah disentuh** — sidik paket atau id omongan tidak
 *    lagi cocok dengan isinya;
 * 5. **kasus yang diam-diam berbeda dari hasil agent** — `periksaSetia` harus
 *    menangkap satu huruf dan satu angka yang digeser.
 *
 * Tidak ada panggilan jaringan: semuanya dibaca dari repo dan `.cache/sectors/`.
 */
import { cpSync, existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { afterAll, describe, expect, it } from 'vitest';
import { ID_KASUS_AGEN, bangunKasusTayang } from '../bangun-kasus.ts';
import type { PaketFakta } from '../llm/paket.ts';
import { FOLDER_GUDANG, muatGudang } from '../muat/gudang.ts';
import { pustakaGudang } from '../muat/pustaka-gudang.ts';
import { teksPolos } from '../skema/rujukan.ts';
import type { Kasus } from '../skema/tipe.ts';
import type { DataEmiten } from '../verifikasi/tipe.ts';
import { KASUS_DARI_AGEN, kasusDariAgen } from './asal-agen.ts';
import {
  HURUF_OPSI,
  HasilAgenTidakSah,
  PEMBUKA_BAKU,
  bacaSumberAgen,
  dariAgen,
  disclaimerBaku,
  idOmonganAgen,
  kataTerlarangDi,
  periksaSetia,
  type EntriOmongan,
  type LampiranPenyetuju,
} from './dari-agen.ts';
import { berkasKasusManusia } from './kasus-manusia.ts';
import { LAMPIRAN_AMAG_2026_06_15 as LAMPIRAN } from './lampiran/amag-2026-06-15.ts';

const AKAR = fileURLToPath(new URL('../../', import.meta.url));
const adaCache = LAMPIRAN.sumber.gudang.every((b) => existsSync(`${FOLDER_GUDANG}/${b.nama}`));

/** Berkas bank dibaca apa adanya dari cakram — pembanding yang tidak lewat pengubah. */
function bankMentah(id: string): EntriOmongan {
  const jalur = `${AKAR}${LAMPIRAN.sumber.bank}/${LAMPIRAN.sumber.paket_sha256}/${id}.json`;
  return JSON.parse(readFileSync(jalur, 'utf8')) as EntriOmongan;
}

function paketMentah(): PaketFakta {
  return JSON.parse(readFileSync(`${AKAR}${LAMPIRAN.sumber.paket}`, 'utf8')) as PaketFakta;
}

function dataAmag(): DataEmiten {
  const d = muatGudang(FOLDER_GUDANG, { izin: LAMPIRAN.sumber.gudang }).emiten.get('AMAG');
  if (d === undefined) throw new Error('AMAG tidak terbaca dari berkas gudang lampiran');
  return d;
}

const salin = <T,>(x: T): T => structuredClone(x);

describe('daftar kasus dari agent', () => {
  it('KASUS_DARI_AGEN = kasus yang didaftarkan bangun-kasus.ts sebagai kasus agent', () => {
    expect([...KASUS_DARI_AGEN].sort()).toEqual([...ID_KASUS_AGEN]);
    expect(kasusDariAgen('amag-2026-06-15')).toBe(true);
    expect(kasusDariAgen('ultj-2026-05-04')).toBe(false);
  });

  it('berkasKasusManusia: cases/ tanpa kasus agent — tepat DADA dan ULTJ', () => {
    expect(berkasKasusManusia(`${AKAR}cases`)).toEqual(['dada-2025-10-08.json', 'ultj-2026-05-04.json']);
  });
});

describe('pembaca berkas agent', () => {
  it('membaca paket dan tiga omongan lampiran AMAG, urut seperti lampiran', () => {
    const { paket, omongan } = bacaSumberAgen(LAMPIRAN, AKAR);
    expect(paket.paket_id).toBe('penyusun-amag-2026-06-15');
    expect(paket.fakta).toHaveLength(17);
    expect(omongan.map((e) => e.id)).toEqual(['5e568a8ce3296708', '25ddea4d9f1c3df0', 'e59779237448d406']);
    expect(omongan.map((e) => e.omongan.nama)).toEqual(['Rara', 'Dimas', 'Bayu']);
  });

  it('idOmonganAgen = id berkas bank untuk ketiga omongan (rumus bank)', () => {
    for (const s of LAMPIRAN.soal) expect(idOmonganAgen(bankMentah(s.id_omongan).omongan), s.id_omongan).toBe(s.id_omongan);
  });

  describe('berkas yang sudah disentuh ditolak', () => {
    const akar = `${mkdtempSync(join(tmpdir(), 'dari-agen-uji-')).replaceAll('\\', '/')}/`;
    const bank = `${akar}${LAMPIRAN.sumber.bank}/${LAMPIRAN.sumber.paket_sha256}`;
    mkdirSync(bank, { recursive: true });
    mkdirSync(join(akar, LAMPIRAN.sumber.paket, '..'), { recursive: true });
    const pasang = (): void => {
      cpSync(`${AKAR}${LAMPIRAN.sumber.paket}`, `${akar}${LAMPIRAN.sumber.paket}`);
      for (const s of LAMPIRAN.soal) {
        cpSync(`${AKAR}${LAMPIRAN.sumber.bank}/${LAMPIRAN.sumber.paket_sha256}/${s.id_omongan}.json`, `${bank}/${s.id_omongan}.json`);
      }
    };
    afterAll(() => rmSync(akar, { recursive: true, force: true }));

    it('salinan utuh terbaca (penjaga alat ukur)', () => {
      pasang();
      expect(() => bacaSumberAgen(LAMPIRAN, akar)).not.toThrow();
    });

    it('SABOTASE: satu kata penjelasan omongan diganti → ditolak, menyebut id-nya', () => {
      pasang();
      const id = 'e59779237448d406';
      const e = bankMentah(id);
      e.omongan.penjelasan = e.omongan.penjelasan.replace('jauh lebih besar', 'sedikit lebih besar');
      writeFileSync(`${bank}/${id}.json`, JSON.stringify(e, null, 2), 'utf8');
      expect(() => bacaSumberAgen(LAMPIRAN, akar)).toThrow(HasilAgenTidakSah);
      expect(() => bacaSumberAgen(LAMPIRAN, akar)).toThrow(/e59779237448d406 sudah berubah/);
    });

    it('SABOTASE: satu angka paket diganti → sidik paket tidak cocok', () => {
      pasang();
      const p = readFileSync(`${akar}${LAMPIRAN.sumber.paket}`, 'utf8').replace('Rp392', 'Rp393');
      writeFileSync(`${akar}${LAMPIRAN.sumber.paket}`, p, 'utf8');
      expect(() => bacaSumberAgen(LAMPIRAN, akar)).toThrow(/bersidik/);
    });
  });
});

describe('kataTerlarangDi', () => {
  const kata = ['AMAG', 'Asuransi Multi', 'Treasury Stock'];

  it('menangkap tanpa peduli huruf besar-kecil, juga di dalam label rujukan', () => {
    expect(kataTerlarangDi('saham amag naik', kata)).toEqual(['AMAG']);
    expect(kataTerlarangDi('[[harga-x|PT Asuransi Multi]] naik', kata)).toEqual(['Asuransi Multi']);
  });

  it('tidak menangkap kata biasa, fact_id, atau potongan di dalam kata lain', () => {
    expect(kataTerlarangDi('perusahaan asuransi ini', kata)).toEqual([]);
    expect(kataTerlarangDi('[[amag|Rp30]]', kata)).toEqual([]);
    expect(kataTerlarangDi('diamagnetik', kata)).toEqual([]);
  });
});

describe.runIf(adaCache)('dariAgen — AMAG 15 Juni 2026', () => {
  const data = dataAmag();
  const sumber = bacaSumberAgen(LAMPIRAN, AKAR);
  const ubah = (l: LampiranPenyetuju = LAMPIRAN, omongan: readonly EntriOmongan[] = sumber.omongan) =>
    dariAgen({ paket: sumber.paket, omongan, lampiran: l, data });
  const def = ubah();

  it('identitas kasus diturunkan dari paket, bukan ditulis ulang', () => {
    const paket = paketMentah();
    expect(def.kasus_id).toBe('amag-2026-06-15');
    expect(def.simbol).toBe(paket.simbol);
    expect(def.emiten).toEqual({ simbol: 'AMAG', nama: paket.nama_emiten, papan: 'Pengembangan', sektor: 'asuransi' });
    expect(def.nama_samaran).toBe(paket.nama_samaran);
    expect(def.tanggal_t).toBe(paket.tanggal_t);
    expect(def.pembuka).toEqual(PEMBUKA_BAKU);
    expect(def.disclaimer).toEqual(disclaimerBaku('2026-06-15'));
    expect(def.disclaimer[0]).toContain('15 Juni 2026');
    expect(def.sumber.endpoint.harga).toBe('/v2/daily/AMAG/');
  });

  it('teks tiap soal = teks berkas bank, huruf demi huruf, dalam urutan lampiran', () => {
    expect(def.soal).toHaveLength(3);
    for (const [i, l] of LAMPIRAN.soal.entries()) {
      const o = bankMentah(l.id_omongan).omongan;
      const s = def.soal[i];
      expect(s?.soal_id).toBe(l.soal_id);
      expect(s?.pesan).toEqual({ nama: o.nama, jam: o.jam, isi: o.pesan });
      expect(s?.pilihan).toEqual(HURUF_OPSI.map((h) => ({ kunci: h, teks: o.pilihan[h] })));
      expect(s?.jawaban).toBe(o.kunci);
      expect(s?.penjelasan).toBe(o.penjelasan);
      expect(s?.kartu).toEqual(o.kartu);
      expect(s?.kartu_penentu).toEqual(o.kartu_penentu);
      expect(s?.fact_ids).toEqual(o.kartu_penentu);
      expect(s?.petunjuk).toBeNull();
      // Tulisan penyetuju, dari lampiran.
      expect(s?.tanya).toBe(l.tanya);
      expect(s?.istilah).toEqual(l.istilah);
    }
  });

  it('fakta_terlihat = gabungan kartu ketiga soal; teks awam tepat untuk itu', () => {
    const kartu = [...new Set(LAMPIRAN.soal.flatMap((l) => bankMentah(l.id_omongan).omongan.kartu))];
    expect(def.fakta_terlihat).toEqual(kartu);
    expect(Object.keys(def.awam).sort()).toEqual([...kartu].sort());
    expect(kartu).toHaveLength(9);
  });

  it('kalimat fakta yang diperjelas pembangun paket ikut diperjelas di kasus', () => {
    expect(def.perjelas_klaim?.map((g) => g.fact_id)).toEqual(['dividen-tercatat']);
    expect(def.perjelas_klaim?.[0]?.baru).toContain('Daftar ini belum tentu lengkap');
  });

  it('fakta turunan = turunan definisi paket agent, dengan id yang sama', () => {
    const asal = { harga: new Map(), suspensi: new Map(), aksi: new Map(), ringkasan: new Map(), kepemilikan: new Map() };
    const pustaka = pustakaGudang(data, { ...def.sumber, asal }).fakta;
    const turunan = def.turunan(pustaka, data).map((f) => f.fact_id).sort();
    const diPaket = paketMentah().fakta.filter((f) => f.jenis === 'hitungan').map((f) => f.fact_id).sort();
    expect(turunan).toEqual(diPaket);
  });

  it('omongan tanpa lampiran → ditolak, menyebut pengirimnya', () => {
    const l = { ...LAMPIRAN, soal: LAMPIRAN.soal.slice(0, 2) };
    expect(() => ubah(l)).toThrow(HasilAgenTidakSah);
    expect(() => ubah(l)).toThrow(/Bayu.*tidak punya lampiran/);
  });

  it('lampiran untuk omongan yang tidak ada → ditolak', () => {
    expect(() => ubah(LAMPIRAN, sumber.omongan.slice(0, 2))).toThrow(/e59779237448d406.*tidak ada di masukan/);
  });

  it('kartu tanpa teks awam → ditolak, menyebut fact_id-nya', () => {
    const l = salin(LAMPIRAN);
    delete l.awam['volume-2026-06-15'];
    expect(() => ubah(l)).toThrow(/tidak punya teks kartu awam untuk "volume-2026-06-15"/);
  });

  it('teks awam untuk fakta yang bukan kartu → ditolak', () => {
    const l = salin(LAMPIRAN);
    l.awam['harga-2026-06-09'] = { kepala: 'Data harga harian', isi: 'x' };
    expect(() => ubah(l)).toThrow(/"harga-2026-06-09", yang bukan kartu soal mana pun/);
  });

  it('kartu agent yang tidak ada di paket → ditolak', () => {
    const o = salin(sumber.omongan);
    o[0]?.omongan.kartu.push('harga-2026-06-17');
    expect(() => ubah(LAMPIRAN, o)).toThrow(/kartu "harga-2026-06-17" tidak ada di paket/);
  });

  it('tautan agent ke fakta di luar paket → ditolak', () => {
    const o = salin(sumber.omongan);
    const pertama = o[0];
    if (pertama === undefined) throw new Error('tanpa omongan');
    pertama.omongan.penjelasan += ' [[harga-2026-06-17|Rp398]]';
    expect(() => ubah(LAMPIRAN, o)).toThrow(/menautkan "harga-2026-06-17" yang tidak ada di paket/);
  });

  it('SABOTASE: kode saham di judul penyetuju → ditolak', () => {
    expect(() => ubah({ ...LAMPIRAN, judul: 'AMAG: harga naik lima hari' })).toThrow(/judul memuat kata terlarang paket: AMAG/);
  });

  it('SABOTASE: nama pemegang saham di layar pembukaan → ditolak', () => {
    const l = salin(LAMPIRAN);
    l.pembukaan.tidak_bisa_dibaca.push('Apa rencana Fairfax Asia Limited.');
    expect(() => ubah(l)).toThrow(/pembukaan \(tidak_bisa_dibaca ke-4\) memuat kata terlarang paket: Fairfax Asia Limited/);
  });

  it('SABOTASE: nama emiten di pesan agent → ditolak (bukan disamarkan diam-diam)', () => {
    const o = salin(sumber.omongan);
    const pertama = o[0];
    if (pertama === undefined) throw new Error('tanpa omongan');
    pertama.omongan.pesan = 'Asuransi Multi naik terus nih.';
    expect(() => ubah(LAMPIRAN, o)).toThrow(/\(pesan\) memuat kata terlarang paket: Asuransi Multi/);
  });
});

describe.runIf(adaCache)('periksaSetia', () => {
  const sumber = bacaSumberAgen(LAMPIRAN, AKAR);
  const kasus = (): Kasus => salin(bangunKasusTayang('amag-2026-06-15').kasus);

  it('kasus yang dibangun setia pada hasil agent', () => {
    expect(periksaSetia(kasus(), sumber.paket, sumber.omongan)).toEqual([]);
  });

  it('SABOTASE: satu kata penjelasan diganti → tertangkap', () => {
    const k = kasus();
    const s = k.soal[2];
    if (s === undefined) throw new Error('tanpa soal');
    s.penjelasan = s.penjelasan.replace('tidak sepi', 'memang sepi');
    expect(periksaSetia(k, sumber.paket, sumber.omongan).join('\n')).toMatch(/"volume-hari-ini": penjelasan tidak sama/);
  });

  it('SABOTASE: kunci digeser → tertangkap', () => {
    const k = kasus();
    const s = k.soal[0];
    if (s === undefined) throw new Error('tanpa soal');
    s.jawaban = 'c';
    expect(periksaSetia(k, sumber.paket, sumber.omongan).join('\n')).toMatch(/"belum-balik-akhir-mei": kunci tidak sama/);
  });

  it('SABOTASE: teks pilihan dirapikan (tautan dilepas) → tertangkap', () => {
    const k = kasus();
    const p = k.soal[1]?.pilihan[0];
    if (p === undefined) throw new Error('tanpa pilihan');
    p.teks = teksPolos(p.teks);
    expect(periksaSetia(k, sumber.paket, sumber.omongan).join('\n')).toMatch(/"tujuh-kali-dividen": pilihan tidak sama/);
  });

  it('SABOTASE: nilai fakta kartu digeser → tertangkap', () => {
    const k = kasus();
    const f = k.fakta.find((x) => x.fact_id === 'volume-2026-06-15');
    if (f === undefined) throw new Error('tanpa fakta');
    f.nilai = 50_601;
    expect(periksaSetia(k, sumber.paket, sumber.omongan).join('\n')).toMatch(/"volume-2026-06-15" berbeda dari paket agent: nilai/);
  });

  it('SABOTASE: kalimat kartu berbeda dari yang dibaca agent → tertangkap', () => {
    const k = kasus();
    const f = k.fakta.find((x) => x.fact_id === 'dividen-tercatat');
    if (f === undefined) throw new Error('tanpa fakta');
    f.klaim = f.klaim.replace('belum tentu lengkap', 'sudah pasti lengkap');
    expect(periksaSetia(k, sumber.paket, sumber.omongan).join('\n')).toMatch(/kalimat kartu "dividen-tercatat"/);
  });
});
