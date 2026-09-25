/**
 * M3.12 D-3 — gerbang kata: tidak ada "kasus" di layar mana pun.
 *
 * Pemilik (25 Sep): "kasus" menjurus ke kecelakaan, perbuatan keji, tindak
 * kriminal. Satuan permainan disebut **simulasi**. Kegagalan yang ditakutkan
 * bukan label yang lupa diganti di satu konstanta, melainkan kata yang
 * tertinggal di SATU layar yang jarang dilihat — terima kasih, penutup, jejak,
 * lipatan "Rincian teknis", `aria-label`, kepala halaman.
 *
 * Karena itu yang diperiksa adalah HASIL RENDER, bukan sumbernya: setiap layar
 * kedua simulasi dirender dengan `renderToStaticMarkup` (tanpa peramban, tanpa
 * jsdom) dari keadaan yang dijalankan reducer sungguhan — layar pertama, tiap
 * soal (polos, istilah terbuka, sesudah memilih, sesudah dikunci benar, sesudah
 * dikunci keliru, dan dengan tiap fakta terbuka satu per satu), pembukaan
 * (tiap fakta terbuka), tiga pertanyaan akhir, terima kasih, pesan penutup,
 * keping, kaki, layar macet — lalu setiap simpul teks dan setiap atribut yang
 * dibacakan (`aria-label`, `title`, `alt`, `placeholder`) diperiksa. Ditambah
 * `<title>` dan `meta` di `web/index.html`.
 *
 * Kata utuh, tak peka huruf besar: "kasus-lain" (`data-uid`) dan
 * `minat_kasus_lain` (nama peristiwa) bukan teks tampil dan memang tidak
 * boleh berubah — atribut `data-*`, `id`, `class`, dan `name` tidak dibaca.
 *
 * Pengecualian bernama di `PENGECUALIAN`; tiap pengecualian WAJIB masih
 * terpakai (yang tidak terpakai lagi merah), supaya daftarnya tidak membusuk.
 */
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { createElement as h, type ReactElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';
import type { Kasus } from '../../factory/skema/tipe.ts';

/*
 * `kasus.ts` mengimpor berkas kasus lewat alias `@cases` milik Vite, yang tidak
 * ada di konfigurasi Vitest. Di sini ia diganti modul yang membaca BERKAS YANG
 * SAMA dari cakram, dengan urutan yang sama (DADA, ULTJ); sisanya
 * (`isi-kasus.ts`) diteruskan apa adanya.
 */
vi.mock('./kasus.ts', async () => {
  const { readFileSync: baca } = await import('node:fs');
  const { fileURLToPath: jalur } = await import('node:url');
  const isi = await import('./isi-kasus.ts');
  const akar = jalur(new URL('../../', import.meta.url));
  const muat = (id: string): Kasus => JSON.parse(baca(`${akar}cases/${id}.json`, 'utf8')) as Kasus;
  const KASUS = muat('dada-2025-10-08');
  const KASUS_ULTJ = muat('ultj-2026-05-04');
  return { ...isi, KASUS, KASUS_ULTJ, DAFTAR_KASUS: [KASUS, KASUS_ULTJ] };
});
import { Kaki, LayarAkhir, LayarPembuka, LayarPembukaan, LayarSoal, TitikSoal } from './Aplikasi.tsx';
import { type Aksi, type Keadaan, langkah } from './alur.ts';
import { LABEL_MUAT_ULANG, PESAN_MACET } from './BatasGalat.tsx';
import { awalBungkus } from './bungkus.ts';
import { KepingKalender } from './Kalender.tsx';
import { DAFTAR_KASUS, indeksFakta } from './kasus.ts';
import { penanda } from './tanggal.ts';

const AKAR = fileURLToPath(new URL('../../', import.meta.url));

/** Kata yang dijaga: "kasus" utuh, tak peka huruf besar ("Kasus", "KASUS"). */
const KATA_TERLARANG = /\bkasus\b/i;

interface Pengecualian {
  nama: string;
  alasan: string;
  pola: RegExp;
}

/**
 * Pengecualian bernama. Masing-masing harus cocok dengan potongan teks yang
 * memuat "kasus" SECARA UTUH; potongan lain yang memuat "kasus" tetap merah.
 */
const PENGECUALIAN: readonly Pengecualian[] = [
  {
    nama: 'klaim suspensi (panel sumber, "kalimat resmi")',
    alasan:
      'Kalimat ini ditulis pemuat fakta `factory/muat/fakta.ts` dan `factory/muat/pustaka-gudang.ts` ' +
      '("… tidak bisa dipastikan dari sumber mana pun yang dipakai kasus ini."), di luar batas kerja ' +
      'M3.12 (`factory/kasus/**` saja). Tampil di panel sumber kartu suspensi DADA. Diserahkan ke reviewer.',
    pola: /tidak bisa dipastikan dari sumber mana pun yang dipakai kasus ini\.$/,
  },
];

function urai(teks: string): string {
  return teks
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#x27;|&#39;/g, "'")
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&');
}

/** Teks yang dilihat atau dibacakan: simpul teks + atribut yang dibacakan. */
function teksTampil(html: string): string[] {
  const hasil: string[] = [];
  for (const m of html.matchAll(/\s(aria-label|aria-description|aria-roledescription|title|alt|placeholder)="([^"]*)"/g)) {
    hasil.push(urai(m[2] ?? ''));
  }
  for (const potong of html.replace(/<[^>]*>/g, '\n').split('\n')) {
    const bersih = urai(potong).replace(/\s+/g, ' ').trim();
    if (bersih !== '') hasil.push(bersih);
  }
  return hasil;
}

interface Temuan {
  layar: string;
  teks: string;
}

/** Semua layar satu simulasi, sebagai pasangan (nama layar, markup). */
function semuaLayar(kasus: Kasus): Array<[string, string]> {
  const layar: Array<[string, string]> = [];
  const render = (nama: string, el: ReactElement): void => {
    layar.push([nama, renderToStaticMarkup(el)]);
  };
  const kosong = (): void => undefined;
  const hari = penanda(kasus.tanggal_t);
  const hariIni = penanda('2026-09-25');
  const indeks = indeksFakta(kasus);
  const semuaFakta = kasus.fakta.map((f) => f.fact_id);

  let waktu = 1_000;
  const jalan = (k: Keadaan, aksi: Aksi): Keadaan => {
    waktu += 500;
    return langkah(k, aksi, waktu).keadaan;
  };

  let k = awalBungkus(kasus, 'uji-kata').keadaan;

  /* Layar pertama + kaki di bawah bilah. */
  render('pembuka', h(LayarPembuka, { kasus, hari, kirim: kosong, sakelarSumber: kosong }));
  render('kaki (pembuka)', h(Kaki, { kasus, diBawahBilah: true }));

  k = jalan(k, { jenis: 'mulai', lebar_layar: 360 });
  k = jalan(k, { jenis: 'lanjut' });

  for (const [nomor, soal] of kasus.soal.entries()) {
    expect(k.layar, `soal ${String(nomor + 1)}`).toEqual({ jenis: 'soal', nomor });
    const soalDi = (nama: string, keadaan: Keadaan): void => {
      render(
        `soal ${String(nomor + 1)} ${nama}`,
        h(LayarSoal, { kasus, keadaan, nomor, kirim: kosong, sakelarSumber: kosong, indeks }),
      );
    };
    const tiapFakta = (nama: string, keadaan: Keadaan): void => {
      for (const id of semuaFakta) soalDi(`${nama} + ${id} terbuka`, { ...keadaan, sumberTerbuka: [id] });
    };

    render(
      `keping soal ${String(nomor + 1)}`,
      h(KepingKalender, {
        hari,
        berdenyut: nomor === 0,
        kanan: h(TitikSoal, { jumlah: kasus.soal.length, sekarang: nomor }),
      }),
    );
    soalDi('polos', k);
    soalDi('opsi terlihat', jalan(k, { jenis: 'opsi_terlihat', soal_id: soal.soal_id, terlihat: true }));
    soalDi('istilah terbuka', jalan(k, { jenis: 'sakelar_istilah', soal_id: soal.soal_id }));
    tiapFakta('polos', k);

    const keliru = soal.pilihan.find((p) => p.kunci !== soal.jawaban)?.kunci ?? soal.jawaban;
    let salah = jalan(k, { jenis: 'pilih', soal_id: soal.soal_id, kunci: keliru });
    soalDi('memilih', salah);
    salah = jalan(salah, { jenis: 'kunci_jawaban', soal_id: soal.soal_id });
    soalDi('dikunci keliru', salah);

    k = jalan(k, { jenis: 'pilih', soal_id: soal.soal_id, kunci: soal.jawaban });
    k = jalan(k, { jenis: 'kunci_jawaban', soal_id: soal.soal_id });
    expect(k.soal[soal.soal_id]?.dikunci).toBe(true);
    soalDi('dikunci benar', k);
    soalDi('dikunci + istilah', jalan(k, { jenis: 'sakelar_istilah', soal_id: soal.soal_id }));
    tiapFakta('dikunci', k);

    k = jalan(k, { jenis: 'lanjut' });
  }

  expect(k.layar.jenis).toBe('pembukaan');
  const pembukaan = (nama: string, terbuka: readonly string[]): void => {
    render(
      `pembukaan ${nama}`,
      h(LayarPembukaan, { kasus, hari, kirim: kosong, sakelarSumber: kosong, indeks, terbuka }),
    );
  };
  pembukaan('polos', []);
  for (const id of semuaFakta) pembukaan(`+ ${id} terbuka`, [id]);

  k = jalan(k, { jenis: 'lanjut' });
  expect(k.layar.jenis).toBe('akhir');
  const akhir = (nama: string, keadaan: Keadaan): void => {
    render(nama, h(LayarAkhir, { kasus, keadaan, kirim: kosong, hariIni, bukaKasusLain: kosong }));
  };
  akhir('akhir: tiga pertanyaan', k);
  render('kaki (akhir)', h(Kaki, { kasus }));
  k = jalan(k, { jenis: 'kirim_akhir' });
  expect(k.akhirTerkirim).toBe(true);
  akhir('terima kasih', k);
  k = jalan(k, { jenis: 'minat_kasus_lain' });
  expect(k.minatDitekan).toBe(true);
  akhir('terima kasih + pesan penutup', k);

  return layar;
}

function periksa(layar: ReadonlyArray<[string, string]>): { temuan: Temuan[]; terpakai: Set<string> } {
  const temuan: Temuan[] = [];
  const terpakai = new Set<string>();
  for (const [nama, html] of layar) {
    for (const teks of teksTampil(html)) {
      if (!KATA_TERLARANG.test(teks)) continue;
      const kecuali = PENGECUALIAN.find((p) => p.pola.test(teks));
      if (kecuali !== undefined) {
        terpakai.add(kecuali.nama);
        continue;
      }
      temuan.push({ layar: nama, teks });
    }
  }
  return { temuan, terpakai };
}

function laporan(temuan: readonly Temuan[]): string {
  const unik = new Map<string, string[]>();
  for (const t of temuan) unik.set(t.teks, [...(unik.get(t.teks) ?? []), t.layar]);
  return [...unik]
    .map(([teks, layar]) => `  "${teks}"\n    di ${String(layar.length)} layar, mis. ${layar.slice(0, 3).join(' · ')}`)
    .join('\n');
}

describe('M3.12 D-3 — gerbang kata "kasus" di layar kedua simulasi', () => {
  /*
   * Render di server memperingatkan tiap `useLayoutEffect` ("does nothing on the
   * server"). Itu benar dan tidak relevan untuk teks; hanya peringatan itu yang
   * diredam, galat lain tetap tercetak.
   */
  const galatAsli = console.error.bind(console);
  beforeAll(() => {
    vi.spyOn(console, 'error').mockImplementation((...isi: unknown[]) => {
      if (String(isi[0]).includes('useLayoutEffect does nothing on the server')) return;
      galatAsli(...isi);
    });
  });
  afterAll(() => {
    vi.restoreAllMocks();
  });

  const terpakaiSemua = new Set<string>();

  it('dua simulasi dirender (penjaga: daftar tidak kosong)', () => {
    expect(DAFTAR_KASUS.map((k) => k.kasus_id)).toEqual(['dada-2025-10-08', 'ultj-2026-05-04']);
  });

  for (const kasus of DAFTAR_KASUS) {
    it(`${kasus.kasus_id}: tidak ada "kasus" di teks tampil mana pun`, () => {
      const layar = semuaLayar(kasus);
      // Penjaga alat ukur: render betul-betul memuat layar-layar itu.
      expect(layar.length).toBeGreaterThan(3 * kasus.fakta.length);
      const semua = layar.flatMap(([, html]) => teksTampil(html)).join('\n');
      for (const harus of ['Tiga pertanyaan singkat', 'Terima kasih.', 'Selesai', kasus.penutup.kepala]) {
        expect(semua, `alat ukur: "${harus}" harus ikut terbaca`).toContain(harus);
      }
      const { temuan, terpakai } = periksa(layar);
      for (const n of terpakai) terpakaiSemua.add(n);
      expect(temuan, `"kasus" masih tampil:\n${laporan(temuan)}`).toEqual([]);
    });
  }

  it('layar macet (batas galat) tidak memuat "kasus"', () => {
    expect(PESAN_MACET).not.toMatch(KATA_TERLARANG);
    expect(LABEL_MUAT_ULANG).not.toMatch(KATA_TERLARANG);
  });

  it('web/index.html: <title>, description, og:* tidak memuat "kasus"', () => {
    const html = readFileSync(`${AKAR}web/index.html`, 'utf8');
    const teks = [
      ...[...html.matchAll(/<title>([^<]*)<\/title>/g)].map((m) => m[1] ?? ''),
      ...[...html.matchAll(/<meta\s[^>]*content="([^"]*)"/g)].map((m) => m[1] ?? ''),
    ];
    expect(teks.length).toBeGreaterThanOrEqual(5);
    expect(teks.filter((t) => KATA_TERLARANG.test(t))).toEqual([]);
    expect(teks).toContain('Simulasi dari kejadian nyata di bursa. 3 soal, sekitar 5 menit, tanpa akun.');
  });

  /*
   * Pengecualian yang diperlebar diam-diam (mis. `/kasus/`) akan menelan semua
   * temuan dan membuat gerbang ini hijau palsu. Kalimat-kalimat yang tampil di
   * layar SEBELUM M3.12 (daftar lengkapnya di ledger T-03) harus tetap kena.
   */
  it('tiap pengecualian sempit: tidak menelan kalimat lama mana pun', () => {
    const lama = [
      'Mulai kasus',
      'Mau coba kasus lain',
      'Seberapa layak kasus ini kamu bagikan ke teman?',
      'Kasus tadi terasa seperti…',
      'Kode saham disamarkan sampai kasus selesai.',
      'Sebelum jadi kartu, laporan kasus ini diperiksa 9 pemeriksaan otomatis; 43 angka dibuang.',
      'Aturan yang tidak bisa dijalankan atas kasus ini: 1 dari 10.',
      'Sehari sesudah tanggal kasus, pada',
      'Harga tertinggi kasus ini justru tercapai sehari sesudah bursa menghentikannya.',
      'Rinciannya ada di jejak verifikasi kasus ini, lengkap dengan angkanya.',
      'Ini kasus yang kedua.',
      'Kasus lain: perusahaan yang harganya melonjak sementara pemilik besarnya menjual.',
      'Kasus nyata dari bursa. 3 soal, sekitar 5 menit, tanpa akun.',
      'kasus',
    ];
    for (const p of PENGECUALIAN) {
      expect(lama.filter((t) => p.pola.test(t)), p.nama).toEqual([]);
    }
  });

  it('tiap pengecualian bernama masih terpakai (yang usang dihapus, bukan dibiarkan)', () => {
    expect([...terpakaiSemua].sort()).toEqual(PENGECUALIAN.map((p) => p.nama).sort());
  });
});

describe('M3.12 D-3 — alat ukurnya sendiri', () => {
  it('teksTampil membaca simpul teks dan aria-label/title, bukan data-uid/id/class', () => {
    const t = teksTampil(
      '<button data-uid="kasus-lain" id="kasus" class="kasus" aria-label="Buka simulasi">A &amp; B</button><span title="judul">x</span>',
    );
    expect(t).toEqual(['Buka simulasi', 'judul', 'A & B', 'x']);
  });

  it('kata utuh, tak peka huruf besar: "Kasus" kena, "minat_kasus_lain" tidak', () => {
    expect(KATA_TERLARANG.test('Kasus tadi')).toBe(true);
    expect(KATA_TERLARANG.test('KASUS')).toBe(true);
    expect(KATA_TERLARANG.test('minat_kasus_lain')).toBe(false);
    expect(KATA_TERLARANG.test('kasusnya')).toBe(false);
  });
});
