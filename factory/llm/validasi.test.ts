/**
 * M2d T-04: validator keluaran LLM.
 *
 * Tiga bagian: (1) draf sah atas paket ULTJ sungguhan lolos tanpa satu masalah
 * pun — penjaga agar validator tidak menolak segalanya; (2) tiap aturan punya
 * mutasi yang membuatnya berbunyi dengan kodenya sendiri; (3) sembilan
 * keluaran M1.5 di `eval/keluaran/` WAJIB merah, dengan sebab yang dicatat
 * waktu itu: kebocoran "24 Oktober 2025" (lengan C), suspensi "8 Oktober 2025"
 * (lengan A/S), dan angka tanpa jejak (semuanya).
 */
import { existsSync, readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { angkaDalam, sesudahT, tanggalDalam } from './angka.ts';
import type { DrafSimulasi, OmonganDraf } from './draf.ts';
import { AKAR } from './env.ts';
import { DEFINISI_PAKET, bangunPaket, type FaktaPaket, type PaketFakta } from './paket.ts';
import { angkaTakBerjejak, validasiDraf } from './validasi.ts';

const adaCache = existsSync(`${AKAR}.cache/sectors/ULTJ-filings.json`);

function drafSah(): DrafSimulasi {
  return {
    omongan: [
      {
        nama: 'Nadia',
        jam: '17.58',
        pesan:
          'Saham Perusahaan U dibuka turun Rp145, padahal dividennya cuma Rp45. Pasti ada kabar yang disembunyikan!',
        angka_pesan: [
          { teks: 'Rp145', fact_id: 'turun-2026-05-04' },
          { teks: 'Rp45', fact_id: 'div-2025-05-15' },
        ],
        kartu: ['div-2026-05-04', 'turun-2026-05-04'],
        kartu_penentu: ['div-2026-05-04'],
        pilihan: {
          a: 'Betul, dividennya memang cuma [[div-2025-05-15|Rp45]] per lembar.',
          b: 'Keliru, dividennya [[div-2026-05-04|Rp130]], bukan [[div-2025-05-15|Rp45]].',
          c: 'Betul, turunnya lebih dari tiga kali dividennya.',
          d: 'Keliru, dividennya [[misal|Rp160]], bukan [[div-2025-05-15|Rp45]].',
        },
        kunci: 'b',
        penjelasan:
          'Nadia memakai angka yang keliru: dividen yang tanggal ex-nya hari ini ' +
          '[[div-2026-05-04|Rp130 per lembar]], bukan [[div-2025-05-15|Rp45]]. Turunnya ' +
          '[[turun-2026-05-04|Rp145]] hanya [[beda-turun-dividen|Rp15]] lebih besar dari dividen itu. ' +
          'Salah-kaprah yang umum: mencari kabar di balik setiap penurunan harga sebelum mencocokkan angkanya.',
      },
      {
        nama: 'Fajar',
        jam: '18.11',
        pesan:
          'Gue baru buka riwayat dividennya. Perusahaan U bagi dividen tiap tahun tanpa putus sejak 2020, ' +
          'dan jumlah per lembarnya naik terus tiap tahun. Rapi banget.',
        angka_pesan: [{ teks: '2020', fact_id: 'div-2020-09-03' }],
        kartu: ['dividen-tercatat', 'tahun-berdividen'],
        kartu_penentu: ['tahun-berdividen'],
        pilihan: {
          a: 'Keliru, tiap tahun memang ada, tetapi jumlahnya pernah turun jauh.',
          b: 'Betul, tiap tahun ada pembagian dan jumlahnya naik di tahun berikutnya.',
          c: 'Betul, jumlahnya sempat datar dua tahun, tetapi tidak pernah turun.',
          d: 'Keliru, ada satu tahun tanpa pembagian sama sekali di tengah deret.',
        },
        kunci: 'a',
        penjelasan:
          'Setengah omongan Fajar cocok: ada pembagian di tiap tahun, ' +
          '[[tahun-berdividen|tujuh tahun berturut-turut]]. Setengahnya tidak: jumlahnya pernah turun jauh, ' +
          'dari [[div-2021-09-01|Rp85 di 2021]] ke [[div-2022-08-04|Rp25 di 2022]]. ' +
          'Salah-kaprah yang umum: kalimat yang setengahnya benar dibaca seluruhnya benar.',
      },
      {
        nama: 'Rio',
        jam: '18.26',
        pesan:
          'Jangan kegeeran dulu. Gue baca laporan Januari: pemilik terbesarnya yang 53 persen itu ikut beli ' +
          'juga, bukan cuma orang dalam yang porsinya kecil.',
        angka_pesan: [{ teks: '53 persen', fact_id: 'fil-2026-01-06-01' }],
        kartu: ['fil-2026-01-06-01', 'fil-2026-01-06-02', 'tambahan-jan-2026'],
        kartu_penentu: ['fil-2026-01-06-01', 'tambahan-jan-2026'],
        pilihan: {
          a: 'Keliru, pemilik terbesarnya tidak tercatat membeli satu lembar pun.',
          b: 'Betul, pemilik terbesarnya tercatat membeli lewat satu laporan besar.',
          c: 'Keliru, yang tercatat membeli bulan itu justru pemilik terbesar sendirian.',
          d: 'Betul, pemilik terbesarnya tercatat membeli sejuta lembar di dua laporan.',
        },
        kunci: 'd',
        penjelasan:
          'Rio betul: pemilik terbesar tercatat membeli lewat [[fil-jan-pemilik-terbesar-laporan|dua laporan]], ' +
          '[[fil-2026-01-06-01|700.000]] lalu [[fil-2026-01-07-01|300.000 lembar]]. Orang dalam lain menambah ' +
          '[[fil-jan-orang-dalam-lain|16,07 juta lembar]]; seluruhnya [[tambahan-jan-2026|17,07 juta lembar]]. ' +
          'Salah-kaprah yang umum: membaca "orang dalam membeli" sebagai satu blok besar.',
      },
    ],
  };
}

let paketUltj: PaketFakta | null = null;
function ultj(): PaketFakta {
  paketUltj ??= bangunPaket(DEFINISI_PAKET.ultj);
  return paketUltj;
}

function kode(draf: unknown): string[] {
  return [...new Set(validasiDraf(draf, ultj()).map((m) => m.kode))].sort();
}

function ubah(f: (d: DrafSimulasi, o: OmonganDraf[]) => void): DrafSimulasi {
  const d = drafSah();
  f(d, d.omongan);
  return d;
}

const o1 = (o: OmonganDraf[]): OmonganDraf => o[0] as OmonganDraf;
const o3 = (o: OmonganDraf[]): OmonganDraf => o[2] as OmonganDraf;

describe.skipIf(!adaCache)('validator — draf sah atas paket ULTJ sungguhan', () => {
  it('lolos tanpa masalah', () => {
    expect(validasiDraf(drafSah(), ultj())).toEqual([]);
  });
});

describe.skipIf(!adaCache)('validator — tiap aturan berbunyi dengan kodenya', () => {
  const kasus: Array<[string, (d: DrafSimulasi, o: OmonganDraf[]) => void, string]> = [
    ['pesan > 220 karakter', (_d, o) => (o1(o).pesan += ' ' + 'x'.repeat(200)), 'PESAN_PANJANG'],
    ['nama terlarang', (_d, o) => (o1(o).nama = 'Bayu'), 'NAMA_TERLARANG'],
    ['nama kembar', (_d, o) => (o3(o).nama = 'Nadia'), 'NAMA_KEMBAR'],
    ['jam sebelum bursa tutup', (_d, o) => (o1(o).jam = '15.30'), 'PESAN_JAM'],
    ['angka pesan tanpa jejak', (_d, o) => (o1(o).pesan = o1(o).pesan.replace('Pasti', 'Volumenya 7 juta. Pasti')), 'ANGKA_PESAN_TANPA_JEJAK'],
    ['angka pesan ke fakta yang salah', (_d, o) => (o1(o).angka_pesan[0] = { teks: 'Rp145', fact_id: 'div-2026-05-04' }), 'ANGKA_TAK_COCOK'],
    ['andaian di omongan yang betul', (_d, o) => (o3(o).angka_pesan[0] = { teks: '53 persen', andaian: true }), 'ANDAIAN_DI_OMONGAN_BETUL'],
    ['angka pesan omongan betul bukan kartu', (_d, o) => (o3(o).angka_pesan[0] = { teks: '53 persen', fact_id: 'fil-jan-pemilik-terbesar-persen-awal' }), 'KUNCI_TAK_TERBUKTI_KARTU'],
    ['pesan bertaut', (_d, o) => (o1(o).pesan = o1(o).pesan.replace('Rp145', '[[turun-2026-05-04|Rp145]]')), 'PESAN_BERTAUT'],
    ['angka telanjang di pilihan', (_d, o) => (o1(o).pilihan.c = 'Betul, turunnya lebih dari 3 kali dividennya.'), 'ANGKA_TANPA_RUJUKAN'],
    ['label rujukan tidak sama dengan faktanya', (_d, o) => (o1(o).pilihan.b = 'Keliru, dividennya [[div-2026-05-04|Rp150]], bukan [[div-2025-05-15|Rp45]].'), 'ANGKA_TAK_COCOK'],
    ['rujukan ke fakta di luar paket', (_d, o) => (o1(o).penjelasan += ' [[div-2026-05-04-bayar|22 Mei 2026]]'), 'FAKTA_DI_LUAR_PAKET'],
    ['tanggal sesudah T di penjelasan', (_d, o) => (o1(o).penjelasan += ' Uangnya cair [[div-2026-05-04|22 Mei 2026]].'), 'TANGGAL_SESUDAH_T'],
    ['tanggal sesudah T di pesan', (_d, o) => {
      o1(o).pesan = o1(o).pesan.replace('Pasti', 'Besok 5 Mei 2026 pasti');
      o1(o).angka_pesan.push({ teks: '5 Mei 2026', andaian: true });
    }, 'TANGGAL_SESUDAH_T'],
    ['label rujukan > 36 karakter', (_d, o) => (o1(o).penjelasan = o1(o).penjelasan.replace('[[turun-2026-05-04|Rp145]]', '[[turun-2026-05-04|turunnya Rp145 dari penutupan terakhir kemarin]]')), 'RUJUKAN_PANJANG'],
    ['3 Betul 1 Keliru', (_d, o) => (o1(o).pilihan.d = 'Betul, dividennya [[misal|Rp160]], bukan [[div-2025-05-15|Rp45]].'), 'OPSI_TAK_DUA_DUA'],
    ['pilihan tanpa label', (_d, o) => (o1(o).pilihan.c = 'Turunnya lebih dari tiga kali dividennya, betul.'), 'OPSI_TANPA_LABEL'],
    ['panjang pilihan timpang', (_d, o) => (o1(o).pilihan.c = 'Betul, ada kabarnya.'), 'OPSI_PANJANG_TIMPANG'],
    ['pilihan > 110 karakter', (_d, o) => (o1(o).pilihan.c = 'Betul, ' + 'turunnya jauh '.repeat(9)), 'OPSI_PANJANG'],
    ['kata penilaian', (_d, o) => (o1(o).pesan = o1(o).pesan.replace('Pasti ada kabar yang disembunyikan!', 'Sahamnya murah banget sekarang!')), 'KATA_PENILAIAN'],
    ['kode saham', (_d, o) => (o1(o).pesan = o1(o).pesan.replace('Perusahaan U', 'ULTJ')), 'EMITEN_TERBUKA'],
    ['nama orang', (_d, o) => (o3(o).penjelasan = o3(o).penjelasan.replace('Rio betul', 'Sabana Prawira Widjaja membeli')), 'EMITEN_TERBUKA'],
    ['ajakan transaksi', (_d, o) => (o1(o).pesan = o1(o).pesan.replace('Pasti ada kabar yang disembunyikan!', 'Beli sekarang selagi turun!')), 'AJAKAN_TRANSAKSI'],
    ['tidak ada omongan yang betul', (_d, o) => {
      o3(o).pilihan.b = 'Keliru, pemilik terbesarnya tercatat membeli lewat satu laporan besar.';
      o3(o).pilihan.d = 'Keliru, pemilik terbesarnya tercatat membeli sejuta lembar di dua laporan.';
      o3(o).pilihan.a = 'Betul, pemilik terbesarnya tidak tercatat membeli satu lembar pun.';
      o3(o).pilihan.c = 'Betul, yang tercatat membeli bulan itu justru pemilik terbesar sendirian.';
    }, 'TIDAK_ADA_BETUL'],
    ['kunci seragam', (_d, o) => {
      o1(o).kunci = 'a';
      o1(o).pilihan.a = 'Keliru, dividennya [[div-2026-05-04|Rp130]], bukan [[div-2025-05-15|Rp45]].';
      o1(o).pilihan.b = 'Betul, dividennya memang cuma [[div-2025-05-15|Rp45]] per lembar.';
      o3(o).kunci = 'a';
      o3(o).pilihan.a = 'Betul, pemilik terbesarnya tercatat membeli sejuta lembar di dua laporan.';
      o3(o).pilihan.d = 'Keliru, pemilik terbesarnya tidak tercatat membeli satu lembar pun.';
    }, 'KUNCI_SERAGAM'],
    ['satu kartu', (_d, o) => (o1(o).kartu = ['div-2026-05-04']), 'KARTU_JUMLAH'],
    ['kartu penentu bukan kartu', (_d, o) => (o1(o).kartu_penentu = ['beda-turun-dividen']), 'PENENTU_BUKAN_KARTU'],
    ['penjelasan tanpa salah-kaprah', (_d, o) => (o1(o).penjelasan = o1(o).penjelasan.replace('Salah-kaprah yang umum:', 'Ingat:')), 'PENJELASAN_TANPA_SALAH_KAPRAH'],
    ['penjelasan tanpa kartu penentu', (_d, o) => (o3(o).kartu_penentu = ['fil-2026-01-06-02']), 'PENJELASAN_TANPA_PENENTU'],
    ['andaian di penjelasan', (_d, o) => (o1(o).penjelasan += ' Kalau [[misal|Rp160]], lain cerita.'), 'ANDAIAN_DI_PENJELASAN'],
    ['kunci merujuk fakta bukan kartu', (_d, o) => (o3(o).pilihan.d = 'Betul, pemilik terbesarnya membeli [[fil-2026-01-07-01|300.000 lembar]] lagi.'), 'KUNCI_TAK_TERBUKTI_KARTU'],
    ['hanya dua omongan', (d) => d.omongan.pop(), 'SKEMA'],
    ['pilihan d hilang', (_d, o) => delete (o1(o).pilihan as Partial<Record<string, string>>)['d'], 'SKEMA'],
  ];
  for (const [nama, f, harap] of kasus) {
    it(`${nama} → ${harap}`, () => {
      expect(kode(ubah(f))).toContain(harap);
    });
  }

  it('bukan objek sama sekali → SKEMA', () => {
    expect(kode('teks')).toEqual(['SKEMA']);
    expect(kode({ omongan: 'x' })).toEqual(['SKEMA']);
  });
});

/* ---------------------------------------------------------------------- */
/* M1.5: sembilan keluaran lama wajib merah                               */
/* ---------------------------------------------------------------------- */

interface FaktaM15 {
  fact_id: string;
  klaim: string;
  nilai: number | string | null;
  satuan: string | null;
  sumber: string;
  tersedia_sejak: string | null;
}
interface SoalM15 {
  soal_id: string;
  batang: string;
  pilihan: Array<{ kunci: string; teks: string }>;
  jawaban: string;
  penjelasan: string;
  fact_ids: string[];
}
interface KeluaranM15 {
  tanggal_t: string;
  fakta_terlihat: FaktaM15[];
  soal: SoalM15[];
}

/**
 * Keluaran M1.5 → draf + paket "seperti yang diklaim lengannya": fakta
 * terlihatnya menjadi paket (dengan tersedia_sejak klaimannya sendiri), tiap
 * soal menjadi satu omongan (batang = pesan). Nama dan jam diisi netral supaya
 * penolakan tidak datang dari penyesuai ini. Penyesuai TIDAK memperbaiki apa
 * pun — angka yang tidak dicatat tetap tidak dicatat.
 */
function dariM15(k: KeluaranM15): { draf: DrafSimulasi; paket: PaketFakta } {
  const fakta: FaktaPaket[] = k.fakta_terlihat.map((f) => ({
    fact_id: f.fact_id,
    jenis: 'dokumen',
    asal: f.sumber,
    terbit: f.tersedia_sejak ?? '9999-12-31',
    klaim: f.klaim,
    nilai: f.nilai,
    satuan: f.satuan,
    turunan_dari: [],
    catatan: [],
  }));
  const nama = ['Teman', 'Kawan', 'Sobat'];
  return {
    paket: {
      paket_id: 'dada',
      simbol: 'FOLK',
      nama_emiten: 'PT Multi Garam Utama Tbk',
      nama_samaran: 'Perusahaan F',
      tanggal_t: k.tanggal_t,
      peristiwa: '',
      fakta,
      kata_terlarang: ['FOLK', 'FOLK.JK', 'Multi Garam Utama'],
      disingkirkan: [],
      pemeriksaan: { aturan_dijalankan: 0, aturan_dilewati: 0, temuan: [] },
    },
    draf: {
      omongan: k.soal.map((s, i) => ({
        nama: nama[i] ?? 'Teman',
        jam: '18.00',
        pesan: s.batang,
        angka_pesan: [],
        kartu: s.fact_ids,
        kartu_penentu: s.fact_ids.slice(0, 1),
        pilihan: Object.fromEntries(s.pilihan.map((p) => [p.kunci, p.teks])) as OmonganDraf['pilihan'],
        kunci: s.jawaban as OmonganDraf['kunci'],
        penjelasan: s.penjelasan,
      })),
    },
  };
}

const M15 = ['A-1', 'A-2', 'A-3', 'C-1', 'C-2', 'C-3', 'S-1', 'S-2', 'S-3'] as const;

describe('validator — sembilan keluaran M1.5 wajib merah (catatan lama)', () => {
  const hasil = M15.map((n) => {
    const berkas = JSON.parse(readFileSync(`${AKAR}eval/keluaran/${n}.json`, 'utf8')) as { keluaran: KeluaranM15 };
    const { draf, paket } = dariM15(berkas.keluaran);
    return { n, masalah: validasiDraf(draf, paket) };
  });

  for (const { n, masalah } of hasil) {
    it(`${n}: ditolak, dan angkanya tanpa jejak`, () => {
      expect(masalah.length).toBeGreaterThan(0);
      const k = new Set(masalah.map((m) => m.kode));
      expect(k.has('ANGKA_TANPA_RUJUKAN') || k.has('ANGKA_PESAN_TANPA_JEJAK')).toBe(true);
    });
  }

  for (const n of ['C-1', 'C-2', 'C-3'] as const) {
    it(`${n}: kebocoran "24 Oktober 2025" tertangkap sebagai TANGGAL_SESUDAH_T`, () => {
      const m = hasil.find((h) => h.n === n)?.masalah ?? [];
      expect(m.some((x) => x.kode === 'TANGGAL_SESUDAH_T' && x.pesan.includes('24 Oktober 2025'))).toBe(true);
    });
  }

  for (const n of ['A-2', 'A-3', 'S-1', 'S-2', 'S-3'] as const) {
    it(`${n}: suspensi "8 Oktober 2025" di bagian terlihat tertangkap sebagai TANGGAL_SESUDAH_T`, () => {
      const m = hasil.find((h) => h.n === n)?.masalah ?? [];
      expect(m.some((x) => x.kode === 'TANGGAL_SESUDAH_T' && x.pesan.includes('8 Oktober 2025'))).toBe(true);
    });
  }
});

describe('angka.ts — pembaca angka dan tanggal', () => {
  it('tanggal lengkap, tanpa tahun, bulan-tahun, tahun lepas, ISO', () => {
    const t = tanggalDalam('Terbit 7 Januari 2026, lalu 22 Mei, Oktober 2025, sejak 2020, dan 2025-10-08.');
    expect(t.map((x) => [x.tahun, x.bulan, x.hari])).toEqual([
      [2026, 1, 7],
      [null, 5, 22],
      [2025, 10, null],
      [2020, null, null],
      [2025, 10, 8],
    ]);
  });

  it('sesudahT per bagian yang tertulis', () => {
    const [a, b, c] = tanggalDalam('5 Mei 2026, Mei 2026, 2027');
    expect(sesudahT(a!, '2026-05-04')).toBe(true);
    expect(sesudahT(b!, '2026-05-04')).toBe(false);
    expect(sesudahT(c!, '2026-05-04')).toBe(true);
  });

  it('angka berpresisi tampilan, di luar tanggal', () => {
    const a = angkaDalam('Rp1.690, 53,16%, 16,07 juta lembar, 22 kali pada 7 Januari 2026');
    expect(a.map((x) => x.nilai)).toEqual([1690, 53.16, 16_070_000, 22]);
    expect(a.map((x) => x.presisi)).toEqual([0.5, 0.005, 5000, 0.5]);
  });

  it('angkaTakBerjejak: "22 kali" boleh untuk 22,25 tetapi "Rp150" tidak untuk Rp145', () => {
    const f = (nilai: number, klaim: string): FaktaPaket => ({
      fact_id: 'x',
      jenis: 'hitungan',
      asal: '',
      terbit: '2025-10-08',
      klaim,
      nilai,
      satuan: null,
      turunan_dari: [],
      catatan: [],
    });
    expect(angkaTakBerjejak('22 kali', f(22.25, 'naik 22,25 kali'))).toEqual([]);
    expect(angkaTakBerjejak('Rp150', f(145, 'turun Rp145'))).toEqual(['150']);
    expect(angkaTakBerjejak('Rp8', f(22.25, 'dari Rp8 (1 Agustus 2025)'))).toEqual([]);
    expect(angkaTakBerjejak('Rp1', f(22.25, 'dari Rp8 (1 Agustus 2025)'))).toEqual(['1']);
  });
});
