/**
 * M3.13 D-4 — halaman "Dapur agen", dirender tanpa peramban.
 *
 * Yang dijaga: statusnya jujur (draf belum dimainkan / ditolak), halaman tidak
 * terbaca seolah simulasi yang dimainkan ditulis AI, setiap alasan penolakan
 * jejak tampil (tidak ada yang hilang diam-diam), tidak ada angka rusak, dan
 * kata-kata terlarang produk tidak muncul.
 */
import { createElement as h } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import Dapur from './Dapur.tsx';
import mentah from './dapur-data.json';
import {
  contohPenolakan,
  dolar,
  menit,
  mintaDapur,
  ringkasUjiLuar,
  statusJalan,
  tolakPerPeran,
  kalimatAgregat,
  type AgregatDapur,
  type DataDapur,
  type JalanDapur,
} from './dapur.ts';

const DATA = mentah as unknown as DataDapur;
const html = renderToStaticMarkup(h(Dapur));
/** Teks tampil: tag dibuang, entitas yang dipakai React dikembalikan. */
const teks = html
  .replace(/<[^>]+>/g, ' ')
  .replace(/&quot;/g, '"')
  .replace(/&#x27;/g, "'")
  .replace(/&amp;/g, '&')
  .replace(/&lt;/g, '<')
  .replace(/&gt;/g, '>')
  .replace(/\s+/g, ' ');

describe('M3.13 D-4 — dapur: fungsi murni', () => {
  it('?dapur membuka halaman dapur; alamat lain tetap permainan', () => {
    expect(mintaDapur('?dapur')).toBe(true);
    expect(mintaDapur('?k=abc12345&dapur')).toBe(true);
    expect(mintaDapur('?dapur=1')).toBe(true);
    expect(mintaDapur('')).toBe(false);
    expect(mintaDapur('?kasus=dada-2025-10-08')).toBe(false);
    expect(mintaDapur('?dapurku')).toBe(false);
  });

  it('status dari medan terbit: A-1 — hanya jalan TIRT, ditolak', () => {
    expect(DATA.jalan.map((j) => statusJalan(j).label)).toEqual(['Ditolak — tidak terbit']);
    expect(statusJalan({ ...(DATA.jalan[0] as JalanDapur), terbit: true }).label).toBe(
      'Draf — lolos semua penjaga, belum dimainkan',
    );
  });

  it('penolakan per peran dihitung dari putusan jejak, terbanyak lebih dulu', () => {
    const tirt = DATA.jalan[0];
    if (tirt === undefined) throw new Error('jalan TIRT hilang');
    const per = tolakPerPeran(tirt);
    expect(per.reduce((j, p) => j + p.tolak, 0)).toBe(tirt.penolakan.length);
    expect(per.map((p) => p.tolak)).toEqual([...per.map((p) => p.tolak)].sort((a, b) => b - a));
  });

  it('format: menit dibulatkan, dolar dua desimal berkoma, uji luar dijumlah', () => {
    expect(menit(8_576_850)).toBe(143);
    expect(dolar(1.83836842)).toBe('US$1,84');
    const tirt = DATA.jalan[0];
    if (tirt === undefined) throw new Error('jalan TIRT hilang');
    const uji = [
      { omongan: 1, kunci: 'a', tebak_benar: 0, tebak_n: 3, kartu_benar: 3, kartu_n: 3 },
      { omongan: 2, kunci: 'b', tebak_benar: 1, tebak_n: 3, kartu_benar: 2, kartu_n: 3 },
    ];
    expect(ringkasUjiLuar({ ...tirt, uji_luar: uji })).toEqual({ tebak_benar: 1, tebak_n: 6, kartu_benar: 5, kartu_n: 6 });
    expect(ringkasUjiLuar({ ...tirt, uji_luar: null })).toBeNull();
  });
});

describe('M3.13 D-4 — dapur: hasil render', () => {
  it('menyatakan simulasi yang dimainkan ditulis manusia, dan draf agen belum dimainkan', () => {
    expect(teks).toContain('Simulasi yang kamu mainkan di sini ditulis manusia.');
    expect(teks).toContain('belum ada satu pun draf agen yang dimainkan orang');
    expect(teks).toContain('Ditolak — tidak terbit');
  });

  it('dua contoh terpendek tampil, dan setiap alasan penolakan jejak tampil di lipatan, huruf demi huruf', () => {
    for (const j of DATA.jalan) {
      for (const p of j.penolakan) for (const a of p.alasan) expect(teks).toContain(a.replace(/\s+/g, ' '));
    }
    const jumlahLi = (html.match(/<ol class="dapur-tolak">/g) ?? []).length;
    expect(jumlahLi).toBeGreaterThanOrEqual(DATA.jalan.length);
  });

  it('nama model dari jejak tampil; biaya hanya untuk jalan berbiaya nyata', () => {
    for (const j of DATA.jalan) for (const p of j.peran) if (p.model !== null) expect(teks).toContain(p.model);
    expect(teks).toContain('US$1,84 biaya nyata');
  });

  it('tanpa angka rusak dan tanpa kata terlarang produk', () => {
    expect(teks).not.toMatch(/NaN|undefined|\[object/);
    expect(teks).not.toMatch(/putar ulang|cek fakta|tips saham/i);
    expect(teks).toContain('Produk ini tidak menyarankan membeli atau menjual efek apa pun.');
  });

  it('di luar kutipan jejak, satuan permainan disebut "simulasi", bukan "kasus"', () => {
    const tanpaKutipan = teks.replace(/“[^”]*”/g, ' ');
    expect(tanpaKutipan).not.toMatch(/\bkasus\b/i);
  });
});

describe('M3.13 D-5 — sesudah kritik desain', () => {
  it('judul jalan tidak berbentuk judul simulasi; contoh penolakan = dua terpendek', () => {
    expect(teks).toContain('Jalan agen: data Perusahaan T');
    for (const j of DATA.jalan) {
      const c = contohPenolakan(j);
      expect(c).toHaveLength(2);
      const panjang = j.penolakan.map((p) => p.alasan.join(' ').length).sort((a, b) => a - b);
      expect(c.map((p) => p.alasan.join(' ').length).sort((a, b) => a - b)).toEqual(panjang.slice(0, 2));
    }
  });

  it('bagian peran menyebut lima peran sebagai satu penulis + empat penjaga', () => {
    expect(teks).toContain('Lima peran di tiap draf: satu menulis, empat menjaga');
  });
});

describe('M3.13 D-5 — tanpa bagian ganda', () => {
  it('judul halaman, bagian peran, dan tiap jalan masing-masing tampil tepat sekali', () => {
    expect(teks.match(/Lima peran di tiap draf/g)).toHaveLength(1);
    expect(html.match(/<h1/g)).toHaveLength(1);
    for (const j of DATA.jalan) expect(html.match(new RegExp(`id="judul-${j.id}"`, 'g'))).toHaveLength(1);
  });
});

describe('M3.13 A-1 — tanpa isi simulasi yang tayang', () => {
  it('Perusahaan D/U tidak disebut; jalan atas simulasi tayang hanya satu baris angka', () => {
    expect(teks).not.toMatch(/Perusahaan [DU]\b/);
    expect(teks).toContain('Jalan atas data simulasi yang bisa kamu mainkan');
    expect(teks).toContain('supaya jawabannya tidak bocor');
    for (const a of DATA.agregat) expect(teks).toContain(kalimatAgregat(a));
    expect(kalimatAgregat(DATA.agregat[0] as AgregatDapur)).toMatch(
      /^Jalan M2d-4: (tidak terbit|lolos semua penjaga, belum dimainkan) · \d+ putaran · \d+ versi ditulis/,
    );
  });
});
