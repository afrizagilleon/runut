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
  awamPenolakan,
  berhentiAwam,
  garisWaktu,
  kalimatAgregatAwam,
  kalimatOmongan,
  omonganPenolakan,
  tersingkirAwam,
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
  it('menyatakan simulasi yang dimainkan disusun Claude bersama pemilik & disetujui manusia, dan draf agen belum dimainkan', () => {
    expect(teks).toContain('Simulasi yang kamu mainkan di sini disusun Claude (model AI) bersama pemilik proyek, lalu diuji dan disetujui manusia.');
    expect(teks).not.toContain('ditulis manusia');
    expect(teks).toContain('belum ada satu pun draf agen otomatis yang dimainkan orang');
    expect(teks).toContain('Ditolak — tidak terbit');
  });

  it('dua contoh terpendek tampil, dan setiap alasan penolakan jejak tampil (M3.14: mentahnya di Rincian teknis), huruf demi huruf', () => {
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
      /^Jalan M2d-4: (tidak terbit|lolos semua penjaga, belum dimainkan) · \d+ putaran · \d+ kali penulis menulis/,
    );
  });
});

describe('M3.14 D-4 — dapur lebih visual, kode internal tidak di tampilan utama', () => {
  /** Tampilan utama = seluruh halaman tanpa lipatan "Rincian teknis". */
  const utama = html
    .replace(/<details class="rincian-teknis"[\s\S]*?<\/details>/g, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&quot;/g, '"')
    .replace(/&#x27;/g, "'")
    .replace(/&amp;/g, '&')
    .replace(/\s+/g, ' ');
  const tirt = DATA.jalan[0] as JalanDapur;
  const slug = [
    ...tirt.sudut.flatMap((s) => s.riwayat.map((r) => r.fact_id)),
    ...tirt.pemeriksaan.tersingkir.map((t) => t.fact_id),
  ];

  it('tanpa kode pemeriksa, nomor aturan, kategori kritikus mentah, slug fakta, atau kode milestone', () => {
    expect(utama).not.toMatch(/\b[A-Z]{2,}(?:_[A-Z]+)+\b/);
    expect(utama).not.toMatch(/\bR\d{1,2}[a-z]?\b/);
    expect(utama).not.toMatch(/\[kritikus/);
    expect(utama).not.toMatch(/\bM2d-\d/i);
    expect(utama).not.toMatch(/\bsudut ke-\d/);
    for (const s of slug) expect(utama.includes(s), `slug ${s}`).toBe(false);
  });

  it('kode itu tetap ada, huruf demi huruf, di "Rincian teknis"', () => {
    expect(teks).toContain('TIDAK_LENGKAP: temuan R19a');
    expect(teks).toContain('[AJAKAN_TRANSAKSI]');
    expect(teks).toContain('M2d-6');
    for (const p of tirt.penolakan) for (const a of p.alasan) expect(teks).toContain(a.replace(/\s+/g, ' '));
  });

  it('terjemahan tidak mengarang: setiap kutipan awam = potongan alasan mentahnya', () => {
    for (const p of tirt.penolakan) {
      for (const a of awamPenolakan(p)) {
        if (a.kutipan !== null) expect(p.alasan.some((x) => x.includes(a.kutipan as string))).toBe(true);
        expect(a.label, `alasan jatuh ke bentuk tak dikenal: ${p.alasan.join(' | ').slice(0, 80)}`).not.toBe('ditolak');
      }
    }
    for (const t of tersingkirAwam(tirt)) {
      expect(tirt.pemeriksaan.tersingkir.some((x) => x.alasan.includes(t.alasan))).toBe(true);
    }
    const angkaBerhenti = (tirt.berhenti ?? '').match(/\d+/g)?.slice(0, 2) ?? [];
    for (const n of angkaBerhenti) expect(berhentiAwam(tirt.berhenti ?? '')).toContain(n);
  });

  it('angka penebak di kalimat awam = angka di jejak', () => {
    for (const p of tirt.penolakan.filter((x) => x.jenis === 'gerbang-tebak')) {
      const m = /^(\d+)\/(\d+) penebak/.exec(p.alasan[0] ?? '');
      expect(awamPenolakan(p)[0]?.kalimat.startsWith(`${m?.[1] ?? '?'} dari ${m?.[2] ?? '?'} penebak`)).toBe(true);
    }
  });

  it('garis waktu dari jejak: satu baris per putaran, ✓ tepat di putaran omongan dikunci', () => {
    const baris = garisWaktu(tirt);
    expect(baris).toHaveLength(tirt.putaran);
    const kunci = baris.flatMap((b) => b.sel.filter((s) => s.keadaan === 'kunci').map((s) => `${String(b.putaran)}:${String(s.omongan)}`));
    const harapan = tirt.sudut.flatMap((s) =>
      s.riwayat.filter((r) => r.hasil === 'lolos').map((r) => `${String(r.putaran_akhir)}:${String(s.omongan)}`),
    );
    expect(kunci.sort()).toEqual(harapan.sort());
    for (const b of baris) {
      for (const s of b.sel.filter((x) => x.keadaan === 'tolak' || x.keadaan === 'ganti')) {
        expect(
          tirt.penolakan.some((p) => p.putaran === b.putaran && p.peran === s.peran && omonganPenolakan(p).includes(s.omongan)),
          `putaran ${String(b.putaran)} omongan ${String(s.omongan)}`,
        ).toBe(true);
      }
    }
    // Pita (kritik D-6 butir 14): satu kotak per putaran per omongan, dan satu kalimat per omongan dari data yang sama.
    expect((html.match(/<li class="kotak-/g) ?? []).length).toBe(tirt.putaran * tirt.sudut.length);
    for (const s of tirt.sudut) expect(teks).toContain(kalimatOmongan(tirt, s.omongan));
    expect(kalimatOmongan(tirt, 2)).toMatch(/^Omongan 2 dikunci di putaran 3; ditolak di 2 putaran/);
    expect(kalimatOmongan(tirt, 3)).toMatch(/^Omongan 3 tidak pernah dikunci; .*faktanya diganti 3 kali\.$/);
  });

  it('status berwarna dan ikon per peran (SVG, bukan emoji)', () => {
    expect(html).toContain('dapur-status dapur-status-ditolak');
    expect((html.match(/class="ikon-peran"/g) ?? []).length).toBeGreaterThanOrEqual(tirt.peran.length);
    expect(teks).not.toMatch(/\p{Extended_Pictographic}/u);
  });

  it('baris agregat tampil tanpa kode milestone', () => {
    for (const a of DATA.agregat) {
      expect(utama).toContain(kalimatAgregatAwam(a));
      expect(kalimatAgregatAwam(a)).toMatch(/^Satu jalan agen: /);
    }
  });
});
