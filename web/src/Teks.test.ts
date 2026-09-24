import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { pecahTeks } from '../../factory/skema/rujukan.ts';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { Teks, faktaParagraf, ikatTandaBaca, potongKalimat, selipkanPenjelasan } from './Teks.tsx';

/*
 * F-A1-2: tautan angka dirender sebagai <button>, yang selalu menjadi kotak
 * inline atom; peramban boleh memutus baris di kedua sisinya, sehingga tanda
 * baca sesudahnya terlempar ke baris berikutnya. Tanda bacanya karena itu
 * diikat ke tautannya di sini — murni, dan bisa dites tanpa peramban.
 */
describe('ikatTandaBaca (A2-T2)', () => {
  const ikat = (teks: string) => ikatTandaBaca(pecahTeks(teks));

  it('memindahkan titik sesudah tautan ke dalam ikatan tautan itu', () => {
    const hasil = ikat('Naik ke [[harga-akhir|Rp178]]. Grup obrolanmu ramai.');
    expect(hasil[1]?.ekor).toBe('.');
    expect(hasil[2]?.bagian).toEqual({ jenis: 'utuh', teks: ' Grup obrolanmu ramai.' });
  });

  it('memindahkan koma juga', () => {
    const hasil = ikat('Dalam [[hari-bursa|47 hari bursa]], harga naik.');
    expect(hasil[1]?.ekor).toBe(',');
    expect(hasil[2]?.bagian).toEqual({ jenis: 'utuh', teks: ' harga naik.' });
  });

  it('memindahkan deretan tanda baca sekaligus', () => {
    const hasil = ikat('Lihat [[x|angka]]?! Lalu lanjut.');
    expect(hasil[1]?.ekor).toBe('?!');
  });

  it('tidak memindahkan huruf atau spasi', () => {
    const hasil = ikat('Dalam [[x|47 hari]] bursa harga naik.');
    expect(hasil[1]?.ekor).toBe('');
    expect(hasil[2]?.bagian).toEqual({ jenis: 'utuh', teks: ' bursa harga naik.' });
  });

  it('menangani tautan di akhir teks tanpa apa pun sesudahnya', () => {
    const hasil = ikat('Harga kini [[x|Rp178]]');
    expect(hasil[1]?.ekor).toBe('');
  });

  it('menangani dua tautan berturut-turut yang masing-masing berbuntut', () => {
    const hasil = ikat('Dari [[a|Rp8]], ke [[b|Rp178]]. Selesai.');
    expect(hasil[1]?.ekor).toBe(',');
    expect(hasil[3]?.ekor).toBe('.');
  });

  it('tidak menyentuh teks tanpa satu pun tautan', () => {
    const hasil = ikat('Kalimat biasa. Tanpa tautan.');
    expect(hasil).toHaveLength(1);
    expect(hasil[0]?.ekor).toBe('');
  });

  it('mengikat tanda baca juga untuk penanda misal dan hari-ini', () => {
    const hasil = ikat('Hari ini [[hari-ini|8 Oktober 2025]]. Kamu pegang [[misal|10 lot]], lalu.');
    expect(hasil[1]?.ekor).toBe('.');
    expect(hasil[3]?.ekor).toBe(',');
  });
});

/* ------------------------------------------------------------------ */
/* M3.6/T-01 — potong menurut kalimat, lalu selipkan penjelasan (D-1) */
/* ------------------------------------------------------------------ */

describe('potongKalimat', () => {
  const potong = (teks: string) => potongKalimat(ikatTandaBaca(pecahTeks(teks)));
  /** Teks yang benar-benar dirender per kalimat, rujukan dan ekornya ikut. */
  const terbaca = (teks: string): string[] =>
    potong(teks).map((k) =>
      k.potongan.map((p) => `${p.bagian.teks}${p.ekor}`).join(''),
    );

  it('memotong paragraf biasa di titik yang diikuti spasi', () => {
    expect(terbaca('Satu kalimat. Dua kalimat. Tiga.')).toEqual([
      'Satu kalimat.',
      ' Dua kalimat.',
      ' Tiga.',
    ]);
  });

  it('memotong juga di tanda seru dan tanda tanya', () => {
    expect(terbaca('Benar? Ya! Sudah.')).toEqual(['Benar?', ' Ya!', ' Sudah.']);
  });

  it('tidak memotong titik yang tidak diikuti spasi', () => {
    // INV-4 melarang angka telanjang di teks biasa, jadi "5.112" hanya bisa
    // muncul di dalam rujukan; penjaga ini memastikan aturannya memang sesempit
    // itu dan tidak memotong di tengah kata.
    expect(terbaca('Harga naik ke Rp5.112 hari ini.')).toEqual(['Harga naik ke Rp5.112 hari ini.']);
  });

  it('menutup kalimat yang diakhiri tautannya sendiri (titik ada di ekor)', () => {
    const kalimat = potong('Lalu tutup di [[harga|Rp152]]. Hari itu ramai.');
    expect(terbaca('Lalu tutup di [[harga|Rp152]]. Hari itu ramai.')).toEqual([
      'Lalu tutup di Rp152.',
      ' Hari itu ramai.',
    ]);
    expect(kalimat[0]?.fact_ids).toEqual(['harga']);
    expect(kalimat[1]?.fact_ids).toEqual([]);
  });

  it('menyebutkan fact_id tiap kalimat, tanpa penanda bukan-fakta', () => {
    const kalimat = potong(
      'Pada [[susp|9 Oktober 2025]], bursa menyetop. Kamu pegang [[misal|10 lot]] pada [[hari-ini|8 Oktober 2025]]. Lalu [[volume|5 juta lembar]] berpindah.',
    );
    expect(kalimat).toHaveLength(3);
    expect(kalimat[0]?.fact_ids).toEqual(['susp']);
    expect(kalimat[1]?.fact_ids).toEqual([]);
    expect(kalimat[2]?.fact_ids).toEqual(['volume']);
  });

  it('tidak kehilangan satu huruf pun dari paragraf aslinya', () => {
    const teks =
      'Sehari sesudah tanggal kasus, pada [[susp|9 Oktober 2025]], bursa menyetop lagi. ' +
      'Harga mulai di [[buka|Rp177]], lalu tutup di [[tutup|Rp152]]. Selesai!';
    const utuh = pecahTeks(teks)
      .map((b) => b.teks)
      .join('');
    expect(terbaca(teks).join('')).toBe(utuh);
  });

  it('paragraf satu kalimat tetap satu kalimat', () => {
    expect(potong('Rantai laporan itu sendiri tidak bersih.')).toHaveLength(1);
  });

  it('teks kosong tidak menghasilkan kalimat hampa', () => {
    expect(potong('')).toEqual([]);
  });
});

describe('selipkanPenjelasan', () => {
  const potong = (teks: string) => potongKalimat(ikatTandaBaca(pecahTeks(teks)));
  const paragraf = potong(
    'Pada [[susp|9 Oktober 2025]] bursa menyetop. Harga mulai di [[buka|Rp177]]. ' +
      'Hari itu [[volume|5 juta]] berpindah.',
  );

  it('tidak menyisipkan apa pun kalau tidak ada yang terbuka', () => {
    expect(selipkanPenjelasan(paragraf, [])).toBeNull();
  });

  it('menaruh penjelasan di kalimat yang memuat tautannya', () => {
    expect(selipkanPenjelasan(paragraf, ['buka'])).toEqual({ nomor: 1, fact_id: 'buka' });
    expect(selipkanPenjelasan(paragraf, ['volume'])).toEqual({ nomor: 2, fact_id: 'volume' });
  });

  it('yang lebih baru dibuka menutup yang lama — satu blok per paragraf', () => {
    // `sumberTerbuka` bertambah di ekor (alur.ts `sakelar_sumber`), jadi
    // elemen terakhir adalah yang paling baru.
    expect(selipkanPenjelasan(paragraf, ['susp', 'volume'])).toEqual({
      nomor: 2,
      fact_id: 'volume',
    });
    expect(selipkanPenjelasan(paragraf, ['volume', 'susp'])).toEqual({ nomor: 0, fact_id: 'susp' });
  });

  it('mengabaikan fakta yang terbuka di tempat lain, bukan di paragraf ini', () => {
    expect(selipkanPenjelasan(paragraf, ['fakta-lain', 'susp'])).toEqual({
      nomor: 0,
      fact_id: 'susp',
    });
    expect(selipkanPenjelasan(paragraf, ['fakta-lain'])).toBeNull();
  });

  it('memakai kemunculan pertama kalau satu fakta ditautkan dua kali', () => {
    const dua = potong('Lihat [[a|X]] dulu. Lalu [[a|X]] lagi.');
    expect(selipkanPenjelasan(dua, ['a'])).toEqual({ nomor: 0, fact_id: 'a' });
  });
});

/* ------------------------------------------------------------------ */
/* M3.2/T-12 — opsi dirender POLOS, penandanya dilepas (D-2)          */
/* ------------------------------------------------------------------ */

describe('opsi: penanda rujukan dilepas, bukan ikut terbaca', () => {
  const AKAR = fileURLToPath(new URL('../../', import.meta.url));
  const kasus = JSON.parse(
    readFileSync(`${AKAR}cases/dada-2025-10-08.json`, 'utf8'),
  ) as { soal: Array<{ soal_id: string; pilihan: Array<{ kunci: string; teks: string }> }> };

  /** Teks yang benar-benar dilihat pemain kalau opsi dirender `interaktif={false}`. */
  const terlihat = (teks: string): string =>
    pecahTeks(teks)
      .map((b) => (b.jenis === 'utuh' ? b.teks : b.teks))
      .join('');

  it('berkas kasus memang masih menyimpan penanda di beberapa opsi', () => {
    // Itu disengaja (D-2: penanda boleh ada di data untuk jejak). Kalau suatu
    // hari tidak ada lagi, tes di bawah menjadi hampa — jadi keberadaannya
    // ikut dijaga di sini.
    const berpenanda = kasus.soal.flatMap((s) => s.pilihan).filter((p) => p.teks.includes('[['));
    expect(berpenanda.length).toBeGreaterThan(0);
  });

  it('tidak satu pun opsi menampilkan kurung siku ganda ke pemain', () => {
    for (const soal of kasus.soal) {
      for (const p of soal.pilihan) {
        const tampil = terlihat(p.teks);
        expect(tampil, `${soal.soal_id} ${p.kunci}`).not.toContain('[[');
        expect(tampil, `${soal.soal_id} ${p.kunci}`).not.toContain(']]');
        expect(tampil, `${soal.soal_id} ${p.kunci}`).not.toContain('|');
      }
    }
  });

  it('teks yang dilihat pemain tetap memuat angkanya', () => {
    const c = kasus.soal[0]?.pilihan.find((p) => p.kunci === 'c');
    expect(terlihat(c?.teks ?? '')).toContain('22 kali');
    expect(terlihat(c?.teks ?? '')).not.toContain('kelipatan-2025-08-01');
  });

  it('opsi dirender lewat Teks dengan interaktif={false}, bukan sebagai teks mentah', () => {
    // Penjaga terakhir: yang di atas membuktikan aturannya, yang ini
    // membuktikan aturan itu dipakai di tempat yang benar.
    // Komentar dibuang lebih dulu: komentar yang MENYEBUT `interaktif={false}`
    // tidak boleh dihitung sebagai kode yang memakainya.
    const sumber = readFileSync(`${AKAR}web/src/Aplikasi.tsx`, 'utf8').replace(
      /\/\*[\s\S]*?\*\//g,
      '',
    );
    const opsi = sumber.slice(sumber.indexOf('className="opsi-teks"'), sumber.indexOf('opsi-tanda'));
    expect(opsi).toContain('<Teks teks={p.teks}');
    // `interaktif={false}` bukan hiasan: tanpa ia, angka di dalam opsi menjadi
    // tombol yang membuka sumber, dan ucapan teman tampak sudah terverifikasi
    // sebelum pemain memeriksanya (D-2, mode ketat 'ucapan').
    expect(opsi).toContain('interaktif={false}');
  });
});

describe('faktaParagraf (M3.8 D-8)', () => {
  const potong = (teks: string) => potongKalimat(ikatTandaBaca(pecahTeks(teks)));

  it('semua fact_id yang bisa dibuka di paragraf ini, urut kemunculan, tanpa ulangan', () => {
    const p = potong(
      'Laporan terbit: [[fil-19|laporan 19 Oktober 2025]] dan [[fil-26|laporan 26 Oktober 2025]]. ' +
        'Lihat [[fil-19|yang pertama]] lagi.',
    );
    expect(faktaParagraf(p)).toEqual(['fil-19', 'fil-26']);
  });

  it('penanda bukan-fakta (andaian, hari ini) tidak ikut: mereka tidak punya penjelasan', () => {
    const p = potong('Misal [[misal|Rp100]] pada [[hari-ini|8 Okt]], lalu [[a|X]].');
    expect(faktaParagraf(p)).toEqual(['a']);
  });
});

/* ------------------------------------------------------------------ */
/* M3.10 D-8 (kritik K-11) — tanda baca di luar elemen tebal           */
/* ------------------------------------------------------------------ */

/**
 * Sampai M3.9 ekor tanda baca yang diikat `ikatTandaBaca` ikut DI DALAM elemen
 * tebalnya: "**Rp13.**", "**1 Agustus,** Rp178", "**(1.000 lembar):**"-nya
 * angka andaian. Tanda baca bukan bagian angkanya, dan koma yang ikut tebal
 * membuat dua angka tampak menyatu. Yang diikat tetap tanda baca itu (tidak
 * boleh pindah baris sendirian), tetapi ia berdiri DI LUAR tebalnya.
 */
describe('tanda baca di luar elemen tebal (M3.10 D-8)', () => {
  const render = (teks: string, pilihan: { tebalSaja?: boolean; interaktif?: boolean } = {}): string =>
    renderToStaticMarkup(
      createElement(Teks, {
        teks,
        sakelarSumber: () => undefined,
        ...pilihan,
      }),
    );

  /** Isi teks setiap elemen penekanan (strong, andaian, hari-ini, datar, tombol tautan). */
  const isiTebal = (html: string): string[] =>
    [
      ...html.matchAll(
        /<(strong|span class="(?:andaian|hari-ini|rujukan-datar)"|button)[^>]*>([\s\S]*?)<\/(?:strong|span|button)>/g,
      ),
    ].map((m) => (m[2] ?? '').replace(/<[^>]+>/g, ''));

  const tabel: Array<{ nama: string; teks: string; pilihan: { tebalSaja?: boolean; interaktif?: boolean }; tebal: string[]; polos: string }> = [
    { nama: '"Rp13." di lembar', teks: 'Tutup di [[a|Rp13]].', pilihan: { tebalSaja: true }, tebal: ['Rp13'], polos: 'Tutup di Rp13.' },
    {
      nama: '"1 Agustus, Rp178" di lembar',
      teks: 'Per [[a|1 Agustus]], [[b|Rp178]] hari ini.',
      pilihan: { tebalSaja: true },
      tebal: ['1 Agustus', 'Rp178'],
      polos: 'Per 1 Agustus, Rp178 hari ini.',
    },
    { nama: '"Rp140," tautan', teks: 'Dividen [[a|Rp140]], kecil.', pilihan: {}, tebal: ['Rp140'], polos: 'Dividen Rp140, kecil.' },
    {
      nama: '"(1.000 lembar):" andaian',
      teks: 'Untuk [[misal|10 lot]] ([[misal|1.000 lembar]]): dividennya kecil.',
      pilihan: {},
      tebal: ['10 lot', '1.000 lembar'],
      polos: 'Untuk 10 lot (1.000 lembar): dividennya kecil.',
    },
    { nama: 'hari ini + titik', teks: 'Hari ini [[hari-ini|8 Oktober 2025]].', pilihan: {}, tebal: ['8 Oktober 2025'], polos: 'Hari ini 8 Oktober 2025.' },
    { nama: 'opsi datar + koma', teks: 'Betul, [[a|Rp45]], kecil.', pilihan: { interaktif: false }, tebal: ['Rp45'], polos: 'Betul, Rp45, kecil.' },
  ];

  for (const baris of tabel) {
    it(baris.nama, () => {
      const html = render(baris.teks, baris.pilihan);
      expect(isiTebal(html)).toEqual(baris.tebal);
      // Kata-katanya tidak berubah satu huruf pun.
      expect(html.replace(/<[^>]+>/g, '')).toBe(baris.polos);
    });
  }

  it('tidak ada elemen tebal yang teksnya berakhir dengan . , : ; )', () => {
    for (const baris of tabel) {
      for (const isi of isiTebal(render(baris.teks, baris.pilihan))) {
        expect(isi, baris.nama).not.toMatch(/[.,:;)]$/);
      }
    }
  });

  it('tanda baca sesudah tautan tetap diikat ke tautannya (tidak pindah baris sendirian)', () => {
    const html = render('Dividen [[a|Rp140]], kecil.');
    expect(html).toMatch(/<span class="tanpa-putus"><button[\s\S]*?<\/button>,<\/span>/);
  });
});
