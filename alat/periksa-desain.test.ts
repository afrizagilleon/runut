import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import {
  CSS_BAWAAN,
  KAPITAL_DIIZINKAN,
  MARKUP_BAWAAN,
  MAKS_KAPITAL,
  RADIUS,
  SKALA,
  laporkan,
  pecahDeklarasi,
  periksaCss,
  periksaMarkup,
  tanpaKomentar,
} from './periksa-desain.ts';

const AKAR = fileURLToPath(new URL('..', import.meta.url));

const kode = (isi: string): string[] => periksaCss('uji.css', isi).map((t) => t.kode);

describe('periksa:desain — membaca CSS tanpa parser pihak ketiga', () => {
  it('memberi tiap deklarasi selektor terdalamnya', () => {
    const d = pecahDeklarasi('.a { color: red; }\n.b,\n.c { font-size: 17px; }');
    expect(d.map((x) => [x.selektor, x.properti, x.nilai])).toEqual([
      ['.a', 'color', 'red'],
      ['.b, .c', 'font-size', '17px'],
    ]);
  });

  it('menembus @media dan mengembalikan selektor di dalamnya, bukan at-rule', () => {
    const d = pecahDeklarasi('@media (min-width: 600px) {\n  .kolom { font-size: 20px; }\n}');
    expect(d[0]?.selektor).toBe('.kolom');
  });

  it('mengabaikan isi komentar, tetapi tidak menggeser nomor baris', () => {
    const isi = '/* .palsu { font-size: 99px; } */\n.a { font-size: 17px; }';
    expect(tanpaKomentar(isi).split('\n')).toHaveLength(2);
    const d = pecahDeklarasi(isi);
    expect(d).toHaveLength(1);
    expect(d[0]?.baris).toBe(2);
  });
});

describe('periksa:desain — INV-11 huruf kapital', () => {
  it('meloloskan dua kapital di keping kalender dan cap', () => {
    expect(
      kode('.kalender-keping { text-transform: uppercase; }\n.cap { text-transform: uppercase; }'),
    ).toEqual([]);
  });

  it('menolak kapital di selektor lain', () => {
    expect(kode('.label-orang { text-transform: uppercase; }')).toEqual([
      'KAPITAL_BUKAN_KEPING_ATAU_CAP',
    ]);
  });

  it('menolak lebih dari dua aturan kapital, walau semuanya di selektor sah', () => {
    const isi = [
      '.kalender-keping { text-transform: uppercase; }',
      '.cap { text-transform: uppercase; }',
      '.cap-tanda { text-transform: uppercase; }',
    ].join('\n');
    expect(kode(isi)).toContain('KAPITAL_TERLALU_BANYAK');
  });

  it('nama berawalan sama tidak menumpang izin .cap maupun .kalender-keping', () => {
    // `.cap-tanda` bukan `.cap`. Dengan pencocokan potongan, seluruh INV-11
    // bisa dilewati hanya dengan memberi nama berawalan sama (bukti merah G2).
    expect(kode('.cap-tanda { text-transform: uppercase; }')).toEqual([
      'KAPITAL_BUKAN_KEPING_ATAU_CAP',
    ]);
    expect(kode('.kalender-keping-besar { text-transform: uppercase; }')).toEqual([
      'KAPITAL_BUKAN_KEPING_ATAU_CAP',
    ]);
    // Selektor turunan yang memang memuat kelasnya utuh tetap sah.
    expect(kode('.penanda .cap { text-transform: uppercase; }')).toEqual([]);
  });

  it('nilai text-transform lain tidak dihitung', () => {
    expect(kode('.a { text-transform: none; }\n.b { text-transform: capitalize; }')).toEqual([]);
  });
});

describe('periksa:desain — skala ukuran huruf', () => {
  it('meloloskan seluruh skala docs/desain.md', () => {
    const isi = SKALA.map((n) => `.u${String(n)} { font-size: ${String(n)}px; }`).join('\n');
    expect(kode(isi)).toEqual([]);
  });

  it('menolak ukuran di luar skala', () => {
    expect(kode('.a { font-size: 15px; }')).toEqual(['SKALA_HURUF']);
    expect(kode('.a { font-size: 18px; }')).toEqual(['SKALA_HURUF']);
    expect(kode('.a { font-size: 1.1rem; }')).toEqual(['SKALA_HURUF']);
  });

  it('singkatan font: tidak bisa dipakai memutari skala', () => {
    expect(kode('.a { font: 500 15px/1 var(--mesin); }')).toEqual(['SKALA_HURUF']);
    expect(kode('.a { font: 500 16px/1.4 var(--mesin); }')).toEqual([]);
    expect(kode('.opsi-huruf { font: 500 13px/1; }')).toEqual([]);
  });

  it('13 px hanya sah di .opsi-huruf, dan merah di mana pun selain itu', () => {
    expect(kode('.opsi-huruf { font-size: 13px; }')).toEqual([]);
    expect(kode('.meta { font-size: 13px; }')).toEqual(['SKALA_HURUF']);
    // Nama berawalan sama tidak ikut mewarisi pengecualiannya.
    expect(kode('.opsi-huruf-besar { font-size: 13px; }')).toEqual(['SKALA_HURUF']);
  });
});

describe('periksa:desain — radius, bayangan, gradien, kabur', () => {
  it('meloloskan seluruh daftar radius D-1', () => {
    const isi = RADIUS.map((r, n) => `.r${String(n)} { border-radius: ${r}; }`).join('\n');
    expect(kode(isi)).toEqual([]);
  });

  it('menolak radius di luar daftar', () => {
    expect(kode('.a { border-radius: 6px; }')).toEqual(['RADIUS']);
    expect(kode('.a { border-radius: 16px 16px 16px 2px; }')).toEqual(['RADIUS']);
    expect(kode('.a { border-radius: 12px 12px 0 0; }')).toEqual(['RADIUS']);
  });

  it('menolak box-shadow, gradient, dan backdrop-filter', () => {
    expect(kode('.a { box-shadow: 0 2px 8px rgba(0,0,0,.2); }')).toEqual(['BAYANGAN']);
    expect(kode('.a { background: linear-gradient(red, blue); }')).toEqual(['GRADIEN']);
    expect(kode('.a { background: radial-gradient(red, blue); }')).toEqual(['GRADIEN']);
    expect(kode('.a { backdrop-filter: blur(4px); }')).toEqual(['KABUR']);
  });

  it('box-shadow: none bukan bayangan', () => {
    expect(kode('.a { box-shadow: none; }')).toEqual([]);
  });
});

describe('periksa:desain — INV-12 tombol utama tidak pernah mati', () => {
  it('menolak tombol utama ber-disabled', () => {
    const markup = '<button type="button" className="tombol-utama" disabled={s.kunci === null}>';
    expect(periksaMarkup('uji.tsx', markup).map((t) => t.kode)).toEqual(['TOMBOL_MATI']);
  });

  it('menolak juga bentuk disabled tanpa nilai', () => {
    expect(periksaMarkup('uji.tsx', '<button className="tombol-utama" disabled>')).toHaveLength(1);
  });

  it('membiarkan fieldset disabled — itu pembekuan pilihan D-3, bukan tombol kelabu', () => {
    expect(periksaMarkup('uji.tsx', '<fieldset className="pilihan" disabled={s.dikunci}>')).toEqual(
      [],
    );
  });

  it('membiarkan tombol lain yang mati', () => {
    expect(periksaMarkup('uji.tsx', '<button className="tombol-kecil" disabled>')).toEqual([]);
  });

  it('membiarkan disabled={false} — ia tidak pernah tampil mati', () => {
    expect(
      periksaMarkup('uji.tsx', '<button className="tombol-utama" disabled={false}>'),
    ).toEqual([]);
  });

  it('mengabaikan tombol yang hanya disebut di komentar', () => {
    const markup = '/* <button className="tombol-utama" disabled> */\n<p>halo</p>';
    expect(periksaMarkup('uji.tsx', markup)).toEqual([]);
  });
});

describe('periksa:desain — berjalan atas seluruh berkas produk', () => {
  it('gaya.css yang sekarang bersih', () => {
    for (const berkas of CSS_BAWAAN) {
      const temuan = periksaCss(berkas, readFileSync(AKAR + berkas, 'utf8'));
      expect(temuan.map((t) => `${t.kode} baris ${String(t.baris)}`), berkas).toEqual([]);
    }
  });

  it('seluruh markup produk bersih dari tombol utama yang mati', () => {
    for (const berkas of MARKUP_BAWAAN) {
      expect(periksaMarkup(berkas, readFileSync(AKAR + berkas, 'utf8')), berkas).toEqual([]);
    }
  });

  it('daftar bawaannya memuat gaya.css dan Aplikasi.tsx — gate tidak boleh kosong', () => {
    expect(CSS_BAWAAN).toContain('web/src/gaya.css');
    expect(MARKUP_BAWAAN).toContain('web/src/Aplikasi.tsx');
    expect(MARKUP_BAWAAN.length).toBeGreaterThan(1);
  });

  it('kedua kapital yang tersisa memang keping kalender dan cap', () => {
    const isi = readFileSync(`${AKAR}web/src/gaya.css`, 'utf8');
    const kapital = pecahDeklarasi(isi).filter(
      (d) => d.properti === 'text-transform' && d.nilai === 'uppercase',
    );
    expect(kapital).toHaveLength(MAKS_KAPITAL);
    expect(kapital.map((d) => d.selektor).sort()).toEqual([...KAPITAL_DIIZINKAN].sort());
  });
});

describe('periksa:desain — laporannya', () => {
  it('menyebut kode, berkas, dan baris', () => {
    const teks = laporkan(periksaCss('web/src/gaya.css', '.a { border-radius: 9px; }'));
    expect(teks).toContain('[RADIUS]');
    expect(teks).toContain('web/src/gaya.css:1');
  });

  it('berkas bersih dilaporkan sebagai bersih', () => {
    expect(laporkan([])).toContain('bersih');
  });
});
