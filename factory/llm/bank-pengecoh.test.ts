/**
 * M2d-7 T-02: bank pengecoh DARI DATA (D-2).
 *
 * Kegagalan yang dijaga (kontrak M2d-7 §0): "pengecoh dari data" yang
 * diam-diam memuat angka turunan (mis. 2,2×) yang tidak ada di paket —
 * melanggar rujukan fakta. Setiap kandidat harus lolos pemeriksa rujukan
 * validator, dan tidak ada kandidat yang nilainya sama dengan kunci.
 */
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { AKAR } from './env.ts';
import { ambilRujukan, teksPolos } from '../skema/rujukan.ts';
import {
  JENIS_KESALAHAN,
  MAKS_PER_JENIS,
  bankPengecoh,
  kelasFakta,
  kunciSudut,
  memakai,
  peristiwaFakta,
  teksAngka,
  tokenIsi,
} from './bank-pengecoh.ts';
import type { OmonganDraf } from './draf.ts';
import type { PaketFakta } from './paket.ts';
import { angkaTakBerjejak, BATAS, validasiDraf } from './validasi.ts';

const baca = (f: string): PaketFakta => JSON.parse(readFileSync(`${AKAR}${f}`, 'utf8')) as PaketFakta;
const PAKET: Record<string, PaketFakta> = {
  tirt: baca('eval/keluaran-m2d6/jalan-1/tirt/paket.json'),
  dada: baca('eval/keluaran-m2d4/dada/paket.json'),
  ultj: baca('eval/keluaran-m2d4/ultj/paket.json'),
};

/** Semua (paket, sudut) yang bisa dipakai: setiap fakta di ketiga paket. */
const SEMUA = Object.entries(PAKET).flatMap(([id, p]) => p.fakta.map((f) => ({ id, p, sudut: f.fact_id })));

/** Omongan uji yang memakai `teks` sebagai pilihan a (pilihan lain polos). */
function omonganUji(p: PaketFakta, sudut: string, teks: string): OmonganDraf {
  return {
    nama: 'Sari', jam: '19.00', pesan: 'Katanya gitu sih.', angka_pesan: [], kartu: [sudut, p.fakta.find((f) => f.fact_id !== sudut)?.fact_id ?? sudut],
    kartu_penentu: [sudut], kunci: 'b',
    pilihan: { a: `Keliru, itu ${teks}.`, b: 'Betul, begitu yang tertulis.', c: 'Betul, tidak seperti itu.', d: 'Keliru, bukan itu soalnya.' },
    penjelasan: `Lihat [[${sudut}|kartunya]]. Salah-kaprah yang umum: menebak.`,
  };
}

describe('bank pengecoh — hanya nilai nyata dari paket', () => {
  it('setiap kandidat membawa id fakta paket + jenis kesalahan, dan fakta itu bukan sudut', () => {
    for (const { p, sudut } of SEMUA) {
      const ids = new Set(p.fakta.map((f) => f.fact_id));
      for (const k of bankPengecoh(p, sudut)) {
        expect(ids.has(k.fact_id)).toBe(true);
        expect(k.fact_id).not.toBe(sudut);
        expect(JENIS_KESALAHAN).toContain(k.jenis);
        expect(k.id).toMatch(/^P\d+$/);
      }
    }
  });

  it('setiap rujukan kandidat lolos pemeriksa rujukan VALIDATOR (tanpa angka turunan baru)', () => {
    let diperiksa = 0;
    for (const { p, sudut } of SEMUA) {
      for (const k of bankPengecoh(p, sudut)) {
        const f = p.fakta.find((x) => x.fact_id === k.fact_id);
        if (k.rujukan === null) {
          // Alasan: frasa dari kalimat fakta itu sendiri; peristiwa: jenis dokumennya. Keduanya tanpa angka.
          expect(/\d/.test(k.teks)).toBe(false);
          if (k.bentuk === 'alasan') expect(teksPolos(f?.klaim ?? '')).toContain(k.teks);
          else expect(k.teks).toBe(peristiwaFakta(f as NonNullable<typeof f>));
          continue;
        }
        const [r] = ambilRujukan(k.rujukan);
        expect(r?.fact_id).toBe(k.fact_id);
        expect(r?.teks.length ?? 99).toBeLessThanOrEqual(BATAS.label);
        expect(angkaTakBerjejak(r?.teks ?? '', f as NonNullable<typeof f>)).toEqual([]);
        // Validator penuh atas pilihan yang memakai rujukan itu: tidak ada masalah rujukan di pilihan a.
        const masalah = validasiDraf({ omongan: [omonganUji(p, sudut, k.rujukan)] }, p).filter((m) => m.pesan.startsWith('Pilihan a'));
        expect(masalah.filter((m) => ['ANGKA_TAK_COCOK', 'FAKTA_DI_LUAR_PAKET', 'RUJUKAN_PANJANG', 'ANGKA_TANPA_RUJUKAN', 'TANGGAL_SESUDAH_T'].includes(m.kode))).toEqual([]);
        diperiksa++;
      }
    }
    expect(diperiksa).toBeGreaterThan(100);
  });

  it('tidak ada kandidat yang nilainya sama dengan kunci (termasuk dua fakta bernilai sama)', () => {
    // Dua fakta bernilai sama (TIRT: volume 25 November dan 10 Desember sama-sama 0 lembar).
    const t = PAKET.tirt as PaketFakta;
    const kecil: PaketFakta = { ...t, fakta: t.fakta.filter((f) => ['volume-2025-11-25', 'volume-2025-12-10', 'harga-2025-12-09'].includes(f.fact_id)) };
    const b = bankPengecoh(kecil, 'volume-2025-12-10', 50);
    expect(b.map((k) => k.teks)).not.toContain('0 lembar');
    expect(b.map((k) => k.fact_id)).toContain('harga-2025-12-09');
    for (const { p, sudut } of SEMUA) {
      const kunci = kunciSudut(p, sudut);
      for (const k of bankPengecoh(p, sudut, 50)) expect(k.teks.toLowerCase()).not.toBe(kunci.teks.toLowerCase());
    }
  });

  it('jenis kesalahan diturunkan dari kelas dan satuan fakta', () => {
    const t = PAKET.tirt as PaketFakta;
    const naik = bankPengecoh(t, 'naik-2025-11-26-2025-12-09', 50);
    const jenis = (id: string): string[] => naik.filter((k) => k.fact_id === id).map((k) => k.jenis);
    expect(jenis('harga-2025-12-09')).toEqual(['operand-keliru']); // rupiah lain: operand keliru
    expect(jenis('kelipatan-2025-11-26-2025-12-09')).toEqual(['konsep-lain']); // kali vs rupiah
    const susp = bankPengecoh(t, 'susp-2025-01-21', 50);
    expect(susp.filter((k) => k.fact_id === 'susp-2025-12-10').map((k) => `${k.jenis}/${k.bentuk}`).sort()).toEqual(['alasan-lain/alasan', 'periode-keliru/tanggal']);
    expect(susp.find((k) => k.fact_id === 'rups-2025-09-25')?.jenis).toBe('pengumuman-lain');
    const harga = bankPengecoh(t, 'harga-2025-12-09', 50);
    expect(harga.filter((k) => k.fact_id === 'harga-2025-12-08').map((k) => k.jenis)).toEqual(['periode-keliru', 'periode-keliru']);
    expect(kelasFakta('harga-2025-12-01')).toBe('harga');
    expect(kelasFakta('fil-2025-08-25-01')).toBe('fil');
    expect(kelasFakta('div-2025-09-16-bayar')).toBe('div-bayar');
  });

  it('deterministik, beragam, dan dibatasi per jenis', () => {
    const t = PAKET.tirt as PaketFakta;
    expect(bankPengecoh(t, 'susp-2025-01-21')).toEqual(bankPengecoh(t, 'susp-2025-01-21'));
    for (const { p, sudut } of SEMUA) {
      const b = bankPengecoh(p, sudut, 50);
      for (const j of JENIS_KESALAHAN) expect(b.filter((k) => k.jenis === j).length).toBeLessThanOrEqual(MAKS_PER_JENIS);
    }
    // Tiga kandidat pertama sudut suspensi menyentuh tiga jenis berbeda.
    expect(new Set(bankPengecoh(t, 'susp-2025-01-21').slice(0, 3).map((k) => k.jenis)).size).toBe(3);
  });

  it('teks angka menurut satuan', () => {
    expect(teksAngka({ nilai: 48, satuan: 'rupiah per lembar' })).toBe('Rp48');
    expect(teksAngka({ nilai: 2.21, satuan: 'kali' })).toBe('2,21 kali');
    expect(teksAngka({ nilai: 1461200, satuan: 'lembar' })).toBe('1.461.200 lembar');
    expect(teksAngka({ nilai: null, satuan: null })).toBeNull();
  });
});

describe('memakai — pilihan yang memakai kandidat', () => {
  it('rujukan ke fakta kandidat, atau penanda alasan (dengan kelas sinonim)', () => {
    const t = PAKET.tirt as PaketFakta;
    const b = bankPengecoh(t, 'susp-2025-01-21');
    const alasanDes = b.find((k) => k.jenis === 'alasan-lain');
    const tanggalDes = b.find((k) => k.jenis === 'periode-keliru');
    expect(alasanDes && memakai('Betul, alasan setop awal tahun kenaikan harga.', alasanDes)).toBe(true);
    expect(alasanDes && memakai('Keliru, setop awal tahun karena keraguan usaha.', alasanDes)).toBe(false);
    expect(tanggalDes && memakai(`Keliru, setop ${tanggalDes.rujukan ?? ''} karena keraguan usaha.`, tanggalDes)).toBe(true);
    expect(tanggalDes && memakai('Keliru, setop awal tahun karena keraguan usaha.', tanggalDes)).toBe(false);
    const kunci = kunciSudut(t, 'susp-2025-01-21');
    expect(memakai('Keliru, setop awal tahun karena bursa ragu usahanya jalan terus.', kunci)).toBe(true);
    expect(tokenIsi('peningkatan harga').has('‹naik›')).toBe(true);
  });
});
