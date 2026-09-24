import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import {
  BAYANGAN_DIIZINKAN,
  CSS_BAWAAN,
  KAPITAL_DIIZINKAN,
  MARKUP_BAWAAN,
  MAKS_KAPITAL,
  MESIN_DIIZINKAN,
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
    /*
     * Hurufnya `var(--baca)`, bukan `var(--mesin)`: sejak D-B3 huruf mesin tik
     * di selektor sembarang merah sendiri, dan tes ini bicara tentang **skala
     * ukuran**, bukan tentang hurufnya. Memakai `--mesin` di sini akan membuat
     * dua aturan bertumpuk di satu asersi dan menyembunyikan yang sedang diuji.
     */
    expect(kode('.a { font: 500 15px/1 var(--baca); }')).toEqual(['SKALA_HURUF']);
    expect(kode('.a { font: 500 16px/1.4 var(--baca); }')).toEqual([]);
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

  /*
   * M3.7. Satu pengecualian bernama, dan pengecualian itu harus **sempit**:
   * selektor yang tepat DAN nilai yang tepat. Pengecualian yang hanya menyebut
   * selektor mengubah gate bayangan menjadi saran bagi benda itu — dan yang
   * dilarang desain adalah kaburnya, bukan namanya.
   */
  describe('pengecualian bernama untuk balon melayang', () => {
    it('menerima bayangan patokan v3d pada selektornya sendiri', () => {
      expect(kode('.melayang-balon { box-shadow: 0 2px 0 var(--garis); }')).toEqual([]);
    });

    it('tetap menolak nilai lain pada selektor yang sama', () => {
      expect(kode('.melayang-balon { box-shadow: 0 8px 24px rgba(0,0,0,.3); }')).toEqual([
        'BAYANGAN',
      ]);
      expect(kode('.melayang-balon { box-shadow: 0 2px 0 red; }')).toEqual(['BAYANGAN']);
    });

    it('tetap menolak nilai yang sama pada selektor lain', () => {
      expect(kode('.lembar { box-shadow: 0 2px 0 var(--garis); }')).toEqual(['BAYANGAN']);
    });

    it('nama berawalan sama tidak ikut lolos', () => {
      expect(kode('.melayang-balon-besar { box-shadow: 0 2px 0 var(--garis); }')).toEqual([
        'BAYANGAN',
      ]);
    });

    it('daftarnya tetap satu butir', () => {
      expect(BAYANGAN_DIIZINKAN).toHaveLength(1);
      expect(BAYANGAN_DIIZINKAN[0]?.selektor).toBe('.melayang-balon');
    });
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

/**
 * D-B3 (amandemen A-2) — huruf mesin tik hanya di daftar izin.
 *
 * Aturannya sudah ada di `docs/desain.md` sejak v3 ("mesin tik hanya untuk
 * keping kalender dan rincian teknis") dan tetap dilanggar diam-diam, karena
 * tidak ada yang memeriksanya. Blok "Kartu yang menentukan" memakainya untuk
 * judul dan kepala lembar, dan itu baru ketahuan ketika teman pemilik mengirim
 * tangkapan layar karena alasan **lain**.
 */
describe('periksa:desain — huruf mesin tik (D-B3)', () => {
  it('meloloskan selektor yang ada di daftar izin', () => {
    expect(kode('.kalender-keping { font-family: var(--mesin); }')).toEqual([]);
    expect(kode('.rincian dt { font-family: var(--mesin); }')).toEqual([]);
  });

  it('menolak selektor yang tidak ada di daftar', () => {
    expect(kode('.penentu-judul { font-family: var(--mesin); }')).toEqual([
      'MESIN_TIK_DI_LUAR_DAFTAR',
    ]);
  });

  it('menolak tumpukan mesin tik yang ditulis langsung, bukan lewat var', () => {
    expect(kode('.apa-pun { font-family: ui-monospace, monospace; }')).toEqual([
      'MESIN_TIK_DI_LUAR_DAFTAR',
    ]);
    expect(kode(".apa-pun { font-family: 'Roboto Mono', monospace; }")).toEqual([
      'MESIN_TIK_DI_LUAR_DAFTAR',
    ]);
  });

  it('menolak lewat singkatan font:, bukan hanya font-family', () => {
    expect(kode('.apa-pun { font: 600 12px/1 var(--mesin); }')).toEqual([
      'MESIN_TIK_DI_LUAR_DAFTAR',
    ]);
  });

  it('menolak variabel bernama lain yang isinya mesin tik', () => {
    expect(kode('.apa-pun { font-family: var(--mesin-tik); }')).toEqual([
      'MESIN_TIK_DI_LUAR_DAFTAR',
    ]);
  });

  it('tidak menuduh huruf baca maupun huruf kalender', () => {
    expect(kode('.isi { font-family: var(--baca); }')).toEqual([]);
    expect(kode('h1 { font-family: var(--kalender); }')).toEqual([]);
    // "monolog" bukan "mono": batas kata dijaga.
    expect(kode(".apa-pun { font-family: 'Monolog Sans', sans-serif; }")).toEqual([]);
  });

  it('nama berawalan sama tidak menumpang izin', () => {
    expect(kode('.kalender-kepingan { font-family: var(--mesin); }')).toEqual([
      'MESIN_TIK_DI_LUAR_DAFTAR',
    ]);
  });

  it('layar pembukaan tidak lagi punya izin mesin tik (M3.10 D-3)', () => {
    // Tiga warisan yang dulu dibenarkan daftar izin kini ditangkap gate.
    expect(kode('.bacaan h3 { font-family: var(--mesin); }')).toEqual(['MESIN_TIK_DI_LUAR_DAFTAR']);
    expect(kode('.jejak-rinci > summary { font-family: var(--mesin); }')).toEqual([
      'MESIN_TIK_DI_LUAR_DAFTAR',
    ]);
    expect(kode('.keping-tanggal { font-family: var(--mesin); }')).toEqual(['MESIN_TIK_DI_LUAR_DAFTAR']);
  });

  it('layar akhir tidak lagi punya izin mesin tik (M3.10 D-6)', () => {
    expect(kode('.jangkar { font-family: var(--mesin); }')).toEqual(['MESIN_TIK_DI_LUAR_DAFTAR']);
  });

  it('mendefinisikan --mesin di :root bukan pemakaian', () => {
    expect(kode(':root { --mesin: ui-monospace, monospace; }')).toEqual([]);
  });

  it('tiap butir daftar izin menyebut alasannya, dan yang warisan ditandai', () => {
    for (const izin of MESIN_DIIZINKAN) {
      expect(izin.alasan.length, izin.selektor).toBeGreaterThan(20);
      if (!izin.disahkan) expect(izin.alasan).toContain('WARISAN');
    }
    // Daftar ini gunanya menutup pintu; kalau ia kosong, gate-nya tidak ada.
    expect(MESIN_DIIZINKAN.length).toBeGreaterThan(0);
  });

  it('tiap butir daftar izin memang masih dipakai gaya.css — daftar tidak boleh membusuk', () => {
    const isi = readFileSync(AKAR + 'web/src/gaya.css', 'utf8');
    const dipakai = periksaCss('web/src/gaya.css', isi);
    // Gate bersih, jadi tiap pemakaian mesin tik di gaya.css tertutup daftar ini.
    expect(dipakai.filter((t) => t.kode === 'MESIN_TIK_DI_LUAR_DAFTAR')).toEqual([]);
    for (const izin of MESIN_DIIZINKAN) {
      const kelas = izin.selektor.split(/[ >]/)[0] ?? '';
      expect(isi.includes(kelas), `${izin.selektor} masih ada di gaya.css`).toBe(true);
    }
  });
});
