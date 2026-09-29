/**
 * M4 T-01 (RQ-01): jalur kasus umum lewat pemuat gudang M2a.
 *
 * Kasus ujinya buatan, di atas gudang contoh `factory/muat/contoh-gudang/` —
 * bukan ULTJ, dan itu disengaja: yang diuji adalah **jalurnya** (pemuat gudang
 * → pustaka fakta umum → turunan → verifikasi V2 → validator), dan jalur yang
 * hanya pernah dilewati satu kasus sungguhan tidak bisa dibedakan dari jalur
 * yang kebetulan cocok dengan kasus itu.
 *
 * T dipilih 9 Januari 2026: dividen, RUPS, dan satu laporan di gudang contoh
 * terbit **sesudahnya**, sehingga aturan "fakta sesudah T hanya boleh di layar
 * pembukaan" benar-benar diuji, bukan sekadar dilewati.
 */
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import {
  KasusTidakSah,
  bangunKasusUmum,
  dataSampai,
  type DefinisiKasusUmum,
} from './bangun.ts';
import { keJson } from './json.ts';
import { muatGudang } from '../muat/gudang.ts';
import { faktaPemegangJendela, faktaSelisih } from '../muat/turunan-gudang.ts';
import { ATURAN_V2 } from '../verifikasi/v2.ts';
import { bacaAturanBeku } from '../verifikasi/aturan-beku.ts';
import { periksaKasus } from '../skema/validator.ts';
import type { DataEmiten } from '../verifikasi/tipe.ts';
import type { Kasus } from '../skema/tipe.ts';

const AKAR = fileURLToPath(new URL('../../', import.meta.url));
const CONTOH_GUDANG = fileURLToPath(new URL('../muat/contoh-gudang', import.meta.url));

function gudangContoh(): { data: DataEmiten; asal: ReturnType<typeof muatGudang>['asal'] } {
  const gudang = muatGudang(CONTOH_GUDANG);
  const data = gudang.emiten.get('AA');
  if (data === undefined) throw new Error('emiten AA tidak ada di gudang contoh');
  return { data, asal: gudang.asal };
}

function kasusContohUmum(): DefinisiKasusUmum {
  return {
    kasus_id: 'contoh-2026-01-09',
    judul: 'Kasus contoh di atas gudang buatan',
    simbol: 'AA',
    emiten: { simbol: 'AA', nama: 'PT Contoh Sejahtera Tbk', papan: 'Utama', sektor: 'contoh' },
    nama_samaran: 'Perusahaan A',
    tanggal_t: '2026-01-09',
    sumber: {
      endpoint: {
        harga: '/v2/daily/AA/',
        laporan: '/v2/filings/',
        aksi: '/v2/company/corporate-actions/AA/',
        suspensi: '/v2/suspensions/',
      },
      parameter: { laporan: { symbol: 'AA' } },
      peran: { 'PT Contoh Sejahtera Tbk': 'Pemilik terbesar' },
    },
    turunan: (pustaka, data) => {
      const naik = faktaSelisih(pustaka, {
        fact_id: 'naik-sepekan',
        dari: 'harga-2026-01-09',
        kurangi: 'harga-2026-01-05',
        satuan: 'rupiah per lembar',
        sebutan: 'Jarak harga penutupan awal dan akhir pekan itu',
      });
      const pemegang = faktaPemegangJendela(data, pustaka, {
        fact_id: 'jual-jan-2026',
        pemegang: 'PT Contoh Sejahtera Tbk',
        dari: '2026-01-01',
        sampai: '2026-01-09',
        peran: 'Pemilik terbesar',
      });
      return [naik, ...pemegang.fakta];
    },
    pembuka: {
      judul: 'Cek omongan saham di grup ke dokumen resminya.',
      ajak: 'Betul atau keliru?',
      menit: 4,
    },
    fakta_terlihat: [
      'harga-2026-01-09',
      'naik-sepekan',
      'susp-2026-01-06',
      'harga-2026-01-05',
      'jual-jan-2026',
      'jual-jan-2026-laporan',
    ],
    awam: {
      'harga-2026-01-09': {
        kepala: 'Data harga',
        isi: 'Harga penutupan hari ini [[harga-2026-01-09|Rp108]] per lembar.',
      },
      'naik-sepekan': {
        kepala: 'Dihitung dari data harga',
        isi:
          'Dari [[harga-2026-01-05|Rp100]] menjadi [[harga-2026-01-09|Rp108]], ' +
          'jadi bedanya [[naik-sepekan|Rp8]] per lembar.',
      },
      'susp-2026-01-06': {
        kepala: 'Pengumuman bursa',
        isi: 'Bursa menghentikan sementara jual-beli saham ini, dengan alasan pendinginan.',
      },
      'harga-2026-01-05': {
        kepala: 'Data harga',
        isi: 'Harga penutupan awal pekan itu [[harga-2026-01-05|Rp100]] per lembar.',
      },
      'jual-jan-2026': {
        kepala: 'Dihitung dari laporan',
        isi:
          'Pemilik terbesar melepas [[jual-jan-2026|200 lembar]] lewat ' +
          '[[jual-jan-2026-laporan|dua laporan]] bulan ini.',
      },
      'jual-jan-2026-laporan': {
        kepala: 'Dihitung dari laporan',
        isi: 'Ada [[jual-jan-2026-laporan|dua laporan]] pemilik terbesar bulan ini.',
      },
    },
    soal: [
      {
        soal_id: 's1',
        kartu: ['harga-2026-01-09', 'naik-sepekan'],
        istilah: [{ kata: 'Penutupan', arti: 'Harga terakhir yang terjadi di hari bursa itu.' }],
        pesan: {
          nama: 'Nadia',
          jam: '17.58',
          isi: 'Saham A naik lebih dari separuh pekan ini, gila.',
        },
        tanya: 'Omongan Nadia cocok dengan dokumennya?',
        petunjuk: 'Baca pesannya, cek ke dokumen di bawahnya, lalu jawab.',
        kartu_penentu: ['naik-sepekan'],
        pilihan: [
          { kunci: 'a', teks: 'Betul, harganya naik lebih dari separuh dalam pekan itu juga.' },
          { kunci: 'b', teks: 'Keliru, naiknya delapan rupiah dari seratus rupiah per lembar.' },
          { kunci: 'c', teks: 'Betul, harganya memang berlipat dari awal pekan ke akhir pekan.' },
          { kunci: 'd', teks: 'Keliru, harganya justru turun dari awal pekan ke akhir pekan.' },
        ],
        jawaban: 'b',
        penjelasan:
          'Kartu kedua sudah menghitungnya: dari [[harga-2026-01-05|Rp100]] ke ' +
          '[[harga-2026-01-09|Rp108]], bedanya [[naik-sepekan|Rp8]]. Yang tidak dikatakan ' +
          'kartu mana pun: ke mana harganya sesudah ini.',
        fact_ids: ['naik-sepekan', 'harga-2026-01-05', 'harga-2026-01-09'],
      },
      {
        soal_id: 's2',
        kartu: ['susp-2026-01-06', 'harga-2026-01-05'],
        istilah: [],
        pesan: { nama: 'Fajar', jam: '18.11', isi: 'Katanya sahamnya sempat disetop bursa. Serem.' },
        tanya: 'Omongan Fajar cocok dengan dokumennya?',
        petunjuk: null,
        kartu_penentu: ['susp-2026-01-06'],
        pilihan: [
          { kunci: 'a', teks: 'Betul, ada pengumuman penghentian sementara dari bursa.' },
          { kunci: 'b', teks: 'Keliru, tidak ada pengumuman bursa apa pun di dokumennya.' },
          { kunci: 'c', teks: 'Keliru, yang ada hanya pengumuman soal pembagian labanya.' },
          { kunci: 'd', teks: 'Betul, tetapi pengumumannya soal laporan yang terlambat.' },
        ],
        jawaban: 'a',
        penjelasan:
          'Kartu pertama memang pengumuman penghentian sementara. Berapa lama ia berlangsung ' +
          'tidak ada di dokumen mana pun, dan kartunya mengatakan itu.',
        fact_ids: ['susp-2026-01-06'],
      },
      {
        soal_id: 's3',
        kartu: ['jual-jan-2026', 'jual-jan-2026-laporan'],
        istilah: [{ kata: 'Orang dalam', arti: 'Pemilik besar atau pengurus yang wajib melapor.' }],
        pesan: {
          nama: 'Rio',
          jam: '18.26',
          isi: 'Pemilik terbesarnya jualan diam-diam, sekali gede.',
        },
        tanya: 'Omongan Rio cocok dengan dokumennya?',
        petunjuk: null,
        kartu_penentu: ['jual-jan-2026', 'jual-jan-2026-laporan'],
        pilihan: [
          { kunci: 'a', teks: 'Betul, ia melepas sahamnya lewat satu laporan besar saja.' },
          { kunci: 'b', teks: 'Keliru, laporannya dua, dan keduanya diumumkan ke publik.' },
          { kunci: 'c', teks: 'Keliru, tidak ada satu pun laporan pelepasan bulan itu.' },
          { kunci: 'd', teks: 'Betul, dan tidak satu pun laporannya pernah diumumkan.' },
        ],
        jawaban: 'b',
        penjelasan:
          'Ada [[jual-jan-2026-laporan|dua laporan]], seluruhnya [[jual-jan-2026|200 lembar]]. ' +
          'Laporan seperti itu memang wajib diumumkan, jadi "diam-diam" tidak cocok.',
        fact_ids: ['jual-jan-2026', 'jual-jan-2026-laporan'],
      },
    ],
    pembukaan: {
      fact_ids: ['fil-2026-01-12-01', 'div-2026-04-10', 'rups-2026-04-01'],
      paragraf: [
        'Tiga hari sesudah hari itu terbit satu laporan lagi, [[fil-2026-01-12-01|50 lembar]].',
        'Perusahaan lalu membagikan dividen tunai [[div-2026-04-10|Rp5 per lembar]].',
        'Rapat pemegang sahamnya, [[rups-2026-04-01|yang mencatat keputusan itu]], baru terjadi sesudahnya.',
      ],
      bisa_dibaca: ['Harga, pengumuman bursa, dan dua laporan pelepasan saham pemilik terbesar.'],
      tidak_bisa_dibaca: ['Ke mana harganya bergerak sesudah hari itu.'],
      disingkirkan: [
        'Harga yang ditulis laporan tidak dipakai kartu mana pun; yang dipakai hanya jumlah lembar dan porsinya.',
      ],
    },
    penutup: {
      kepala: 'Kasus ini buatan.',
      isi: 'Ia hidup di dalam tes, bukan di daftar kasus yang dimainkan orang.',
    },
    kartu_konsep: [{ kode: 'D1', judul: 'Suspensi' }],
    disclaimer: [
      'Data di halaman ini menggambarkan keadaan pada 9 Januari 2026 dan bukan kondisi perusahaan sekarang.',
      'Produk ini tidak menyarankan membeli atau menjual efek apa pun.',
      'Setiap angka di halaman ini bisa ditelusuri ke sumbernya.',
    ],
  };
}

function bangunContoh(def: DefinisiKasusUmum = kasusContohUmum()): Kasus {
  const { data, asal } = gudangContoh();
  return bangunKasusUmum(def, data, asal).kasus;
}

describe('bangunKasusUmum — jalur umum lewat pemuat gudang (M4 D-1)', () => {
  it('menghasilkan kasus skema v3 yang lolos validator yang sama dengan jalur DADA', () => {
    const kasus = bangunContoh();
    expect(periksaKasus(kasus)).toEqual([]);
    expect(kasus.skema_versi).toBe(3);
    expect(kasus.kasus_id).toBe('contoh-2026-01-09');
  });

  it('membawa hanya fakta yang benar-benar disebut kasusnya, bukan seluruh pustaka', () => {
    const id = new Set(bangunContoh().fakta.map((f) => f.fact_id));
    expect(id.has('harga-2026-01-09')).toBe(true);
    // Hari bursa dan volume di gudang contoh yang tidak disebut kasus ini tidak ikut.
    expect(id.has('harga-2026-01-08')).toBe(false);
    expect(id.has('volume-2026-01-05')).toBe(false);
  });

  it('fakta turunan membawa asalnya, dan asalnya ikut ke berkas walau bukan kartu', () => {
    const kasus = bangunContoh();
    const naik = kasus.fakta.find((f) => f.fact_id === 'naik-sepekan');
    expect(naik?.turunan_dari).toEqual(['harga-2026-01-09', 'harga-2026-01-05']);
    const jual = kasus.fakta.find((f) => f.fact_id === 'jual-jan-2026');
    expect(jual?.turunan_dari).toEqual(['fil-2026-01-06-01', 'fil-2026-01-09-01']);
    for (const id of jual?.turunan_dari ?? []) {
      expect(kasus.fakta.some((f) => f.fact_id === id)).toBe(true);
    }
  });

  it('menjalankan himpunan V2, bukan V1 (D-2) — kasus baru memakai ATURAN_V2 penuh (M4b D-1)', () => {
    // Kasus contoh ini tidak ada di daftar aturan beku, jadi ia kasus baru:
    // seluruh ATURAN_V2 yang sekarang. Kasus tayang dijaga daftar bekunya.
    const kasus = bangunContoh();
    expect(kasus.pemeriksaan).toHaveLength(ATURAN_V2.length);
    expect(kasus.pemeriksaan.map((p) => p.aturan)).toEqual(ATURAN_V2.map((a) => a.kode));
  });

  it('memverifikasi dengan dokumen yang sudah terbit pada T, bukan dengan masa depan', () => {
    const { data } = gudangContoh();
    const sampaiT = dataSampai(data, '2026-01-09');
    expect(data.laporan).toHaveLength(3);
    expect(sampaiT.laporan).toHaveLength(2);
    expect(sampaiT.dividen).toHaveLength(0);
    expect(sampaiT.rups).toHaveLength(0);
    // Data penuh tidak ikut berubah: pustaka fakta tetap dibangun darinya.
    expect(data.dividen).toHaveLength(1);
    expect(data.rups).toHaveLength(2);
  });

  it('fakta yang terbit sesudah T ada di berkas, tetapi hanya lewat layar pembukaan', () => {
    const kasus = bangunContoh();
    for (const id of kasus.pembukaan.fact_ids) {
      expect(kasus.fakta.some((f) => f.fact_id === id), `fakta pembukaan ${id}`).toBe(true);
      expect(kasus.fakta_terlihat).not.toContain(id);
    }
    expect(kasus.pembukaan.fact_ids).toContain('div-2026-04-10');
  });

  it('dua kali membangun menghasilkan berkas yang sama persis (INV-C)', () => {
    expect(keJson(bangunContoh())).toBe(keJson(bangunContoh()));
  });

  it('definisi yang menyebut fact_id menggantung ditolak dengan menyebut id-nya', () => {
    const def = kasusContohUmum();
    def.fakta_terlihat = [...def.fakta_terlihat, 'fakta-yang-tidak-ada'];
    expect(() => bangunContoh(def)).toThrow(/fakta-yang-tidak-ada/);
  });

  it('kasus yang tidak lolos validator dilempar, bukan ditulis diam-diam', () => {
    const def = kasusContohUmum();
    const soal = def.soal[0];
    if (soal === undefined) throw new Error('soal pertama harus ada');
    soal.jawaban = 'z';
    expect(() => bangunContoh(def)).toThrow(KasusTidakSah);
  });
});

describe('INV-A — jalur DADA tidak ikut berubah', () => {
  it('kasus DADA yang ikut repo tetap dibangun sepuluh aturan V1, bukan V2', () => {
    const kasus = JSON.parse(
      readFileSync(`${AKAR}cases/dada-2025-10-08.json`, 'utf8'),
    ) as unknown as Kasus;
    // M4b D-1: dibandingkan dengan daftar aturan beku DADA, bukan angka tangan.
    const beku = bacaAturanBeku().kasus['dada-2025-10-08'];
    expect(beku?.jalur).toBe('V1');
    expect(kasus.pemeriksaan).toHaveLength(10);
    expect(kasus.pemeriksaan.map((p) => p.aturan)).toEqual(beku?.aturan);
    expect(kasus.pemeriksaan.map((p) => p.aturan)).not.toContain('R25');
  });
});
