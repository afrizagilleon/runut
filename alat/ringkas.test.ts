import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import {
  PENANDA_DIKECUALIKAN_BAWAAN,
  TANPA_PENANDA,
  UID_KOSONG,
  BERKAS_PENGUNJUNG_BAWAAN,
  bacaArgumen,
  bacaJsonl,
  bacaPengunjungDikecualikan,
  buangKembar,
  hitungOrang,
  kapanPerLayar,
  kelompokkanSesi,
  laporan,
  median,
  perBalonSoal,
  perLayar,
  perKasus,
  perLayarSoal,
  perPenanda,
  pisahkanKecuali,
  ringkasSesi,
  type KapanLayar,
  type Peristiwa,
  type RingkasSesi,
} from './ringkas.ts';

const CONTOH = fileURLToPath(new URL('./contoh/peristiwa-contoh.jsonl', import.meta.url));

function muat(): Peristiwa[] {
  return bacaJsonl(readFileSync(CONTOH, 'utf8'), 'peristiwa-contoh.jsonl');
}

const lengkap = (): ReturnType<typeof kelompokkanSesi> =>
  kelompokkanSesi(muat()).filter((s) => s.lengkap);

describe('ringkas — berkas contoh', () => {
  it('memuat enam sesi lengkap dan satu yang tak lengkap', () => {
    expect(lengkap().map((s) => s.sesi)).toEqual([
      'sesi-a-tuntas',
      'sesi-b-berhenti-soal-2',
      'sesi-c-tanpa-membaca-kartu',
      'sesi-e-afriza-uji-pemilik',
      'sesi-f-kembali',
      'sesi-g-tanpa-nomor',
    ]);
    expect(kelompokkanSesi(muat()).filter((s) => !s.lengkap).map((s) => s.sesi)).toEqual([
      'sesi-d-tab-lama',
    ]);
  });

  it('menandai sesi yang sampai pembukaan dan yang berhenti di tengah', () => {
    expect(lengkap().map((s) => s.sampai_pembukaan)).toEqual([
      true, false, true, false, false, false,
    ]);
    expect(lengkap().map((s) => s.layar_terakhir)).toEqual([
      'akhir', 'soal-2', 'akhir', 'soal-1', 'soal-1', 'soal-1',
    ]);
  });

  it('memisahkan pembaca kartu dari yang melewatinya (A1-T2)', () => {
    const pembaca = lengkap().find((s) => s.sesi === 'sesi-a-tuntas');
    const pelewat = lengkap().find((s) => s.sesi === 'sesi-c-tanpa-membaca-kartu');
    for (const soal of pembaca?.soal ?? []) {
      expect(soal.ms_kartu_terlihat ?? 0, soal.soal_id).toBeGreaterThan(10_000);
    }
    for (const soal of pelewat?.soal ?? []) {
      expect(soal.ms_kartu_terlihat ?? 0, soal.soal_id).toBeLessThan(1_500);
    }
  });

  it('menghitung gulir balik hanya ketika kartu benar-benar dilihat lagi', () => {
    const a = lengkap().find((s) => s.sesi === 'sesi-a-tuntas');
    const per = Object.fromEntries((a?.soal ?? []).map((s) => [s.soal_id, s.gulir_balik]));
    expect(per['s1-kata-bursa']).toBe(1);
    expect(per['s2-dividen-pemilik-kecil']).toBe(0);
    expect(per['s3-siapa-yang-menjual']).toBe(1);
  });

  it('menghitung ketukan "Kembali ke kartu" dan panel sumber terpisah', () => {
    const a = lengkap().find((s) => s.sesi === 'sesi-a-tuntas');
    const s1 = a?.soal.find((s) => s.soal_id === 's1-kata-bursa');
    expect(s1?.kembali_ke_kartu).toBe(1);
    expect(s1?.panel_sumber).toBe(1);
  });

  it('menghitung perpindahan pilihan', () => {
    const a = lengkap().find((s) => s.sesi === 'sesi-a-tuntas');
    expect(a?.soal.find((s) => s.soal_id === 's1-kata-bursa')?.ganti_pilihan).toBe(1);
  });

  it('mencatat benar dan salah per soal', () => {
    const a = lengkap().find((s) => s.sesi === 'sesi-a-tuntas');
    expect(a?.soal.map((s) => s.benar)).toEqual([true, true, false]);
    const c = lengkap().find((s) => s.sesi === 'sesi-c-tanpa-membaca-kartu');
    expect(c?.soal.map((s) => s.benar)).toEqual([false, false, true]);
  });

  it('memberi durasi per layar yang lebih dari nol untuk sesi tuntas', () => {
    const a = lengkap().find((s) => s.sesi === 'sesi-a-tuntas');
    const layar = Object.fromEntries(a?.ms_per_layar ?? []);
    for (const nama of ['pembuka', 'soal-1', 'soal-2', 'soal-3', 'pembukaan', 'akhir']) {
      expect(layar[nama], nama).toBeGreaterThan(0);
    }
  });

  it('membaca isi layar akhir, termasuk yang dilewati', () => {
    const a = lengkap().find((s) => s.sesi === 'sesi-a-tuntas');
    expect(a?.akhir?.['rating']).toBe(4);
    expect(a?.akhir?.['sumber_jawaban']).toBe('kartu fakta');
    const c = lengkap().find((s) => s.sesi === 'sesi-c-tanpa-membaca-kartu');
    expect(c?.akhir?.['terasa']).toBeNull();
    const b = lengkap().find((s) => s.sesi === 'sesi-b-berhenti-soal-2');
    expect(b?.akhir).toBeNull();
  });

  it('mencatat ketukan "Mau coba kasus lain"', () => {
    expect(lengkap().map((s) => s.minat_kasus_lain)).toEqual([
      true, false, false, false, false, false,
    ]);
  });
});

describe('ringkas — kembaran dan sesi tak lengkap (F-5)', () => {
  it('membuang peristiwa kembar (sesi, urut)', () => {
    const satu: Peristiwa = {
      nama: 'pilih',
      sesi: 's',
      kasus_id: 'k',
      t_ms: 10,
      urut: 4,
      isi: { soal_id: 's1', kunci: 'b', ganti_ke: 0 },
    };
    expect(buangKembar([satu, { ...satu }, { ...satu }])).toHaveLength(1);
  });

  it('mempertahankan peristiwa berbeda yang bernomor sama di sesi berbeda', () => {
    const a: Peristiwa = { nama: 'mulai', sesi: 'a', kasus_id: 'k', t_ms: 0, urut: 1, isi: {} };
    const b: Peristiwa = { nama: 'mulai', sesi: 'b', kasus_id: 'k', t_ms: 0, urut: 1, isi: {} };
    expect(buangKembar([a, b])).toHaveLength(2);
  });

  it('tidak menghitung kembaran sebagai ganti pilihan tambahan', () => {
    const pilih: Peristiwa = {
      nama: 'pilih',
      sesi: 's',
      kasus_id: 'k',
      t_ms: 10,
      urut: 4,
      isi: { soal_id: 's1', kunci: 'b', ganti_ke: 0 },
    };
    const sesi = kelompokkanSesi([pilih, { ...pilih }]);
    expect(sesi[0]?.soal[0]?.ganti_pilihan).toBe(0);
  });

  it('sesi tanpa mulai tidak masuk penyebut mana pun', () => {
    const teks = laporan(kelompokkanSesi(muat()));
    // Enam sesi lengkap, satu (penanda `afriza`) dikecualikan bawaan; sesi
    // tanpa `mulai` tetap tidak masuk penyebut mana pun.
    expect(teks).toContain('Sesi: **5**');
    expect(teks).toContain('Sampai layar pembukaan: **2** dari 5');
    expect(teks).toContain('## Sesi tak lengkap');
    expect(teks).toContain('sesi-d-tab-lama');
  });

  it('sesi tak lengkap tidak muncul di tabel titik berhenti', () => {
    const teks = laporan(kelompokkanSesi(muat()));
    const titik = teks.slice(teks.indexOf('## Titik berhenti'), teks.indexOf('## Layar akhir'));
    expect(titik).not.toContain('sesi-d-tab-lama');
  });
});

describe('ringkas — laporan Markdown', () => {
  it('deterministik: dua penyusunan menghasilkan teks yang sama persis', () => {
    expect(laporan(kelompokkanSesi(muat()))).toBe(laporan(kelompokkanSesi(muat())));
  });

  it('tidak bergantung pada urutan baris di berkas', () => {
    expect(laporan(kelompokkanSesi([...muat()].reverse()))).toBe(
      laporan(kelompokkanSesi(muat())),
    );
  });

  it('memuat setiap bagian yang diminta D-10 dan A1-T2', () => {
    const teks = laporan(kelompokkanSesi(muat()));
    for (const bagian of [
      'Sampai layar pembukaan',
      '## Per sesi',
      '## Apakah kartu dibaca sebelum menjawab',
      '## Per soal',
      '## Lama per layar',
      '## Titik berhenti',
      '## Layar akhir',
    ]) {
      expect(teks, bagian).toContain(bagian);
    }
  });

  it('menampilkan detik kartu terlihat dan gulir balik per soal', () => {
    const teks = laporan(kelompokkanSesi(muat()));
    expect(teks).toContain('(detik / balik)');
    expect(teks).toContain('| sesi-c-tanpa-membaca-kartu | 0.9 d / 0 | 0.7 d / 0 | 0.8 d / 0 |');
  });

  it('melarikan pipa di tulisan bebas supaya tabelnya tidak pecah', () => {
    const peristiwa: Peristiwa[] = [
      { nama: 'mulai', sesi: 's', kasus_id: 'k', t_ms: 0, urut: 1, isi: { lebar_layar: 375 } },
      {
        nama: 'akhir_kirim',
        sesi: 's',
        kasus_id: 'k',
        t_ms: 10,
        urut: 2,
        isi: { rating: null, terasa: null, sumber_jawaban: null, teks: 'a | b | c' },
      },
    ];
    expect(laporan(kelompokkanSesi(peristiwa))).toContain('a \\| b \\| c');
  });

  it('menangani berkas tanpa satu pun sesi lengkap tanpa melempar', () => {
    expect(laporan([])).toContain('Tidak ada satu pun sesi lengkap');
  });
});

describe('ringkas — pembacaan berkas', () => {
  it('melewati baris kosong', () => {
    expect(bacaJsonl('\n\n')).toEqual([]);
  });

  it('menyebut nomor baris yang rusak, tidak diam (INV-6)', () => {
    expect(() => bacaJsonl('{"a":1}\nbukan json\n', 'contoh.jsonl')).toThrowError(
      /contoh\.jsonl baris 2/,
    );
  });

  it('mengurutkan peristiwa menurut urut, bukan menurut urutan di berkas', () => {
    const acak: Peristiwa[] = [
      { nama: 'tutup', sesi: 's', kasus_id: 'k', t_ms: 99, urut: 3, isi: { layar_terakhir: 'akhir' } },
      { nama: 'mulai', sesi: 's', kasus_id: 'k', t_ms: 0, urut: 1, isi: { lebar_layar: 375 } },
    ];
    expect(ringkasSesi(acak).lebar_layar).toBe(375);
    expect(ringkasSesi(acak).layar_terakhir).toBe('akhir');
  });
});

describe('A4-T5 — loncat ke ringkasan masuk ringkasan', () => {
  const dasar = (nama: string, urut: number, isi: Record<string, unknown> = {}): Peristiwa => ({
    nama,
    sesi: 'sesi-loncat',
    kasus_id: 'dada-2025-10-08',
    t_ms: urut * 1_000,
    urut,
    isi,
  });

  const sesiLoncat = (): Peristiwa[] => [
    dasar('mulai', 1, { lebar_layar: 375 }),
    dasar('layar_masuk', 2, { layar: 'pembuka' }),
    dasar('pembukaan_masuk', 3),
    dasar('layar_masuk', 4, { layar: 'pembukaan' }),
    dasar('loncat_ke_ringkasan', 5, { ms_di_pembukaan: 4_200, gulir_maks_persen: 12 }),
    dasar('pembukaan_selesai', 6, { ms_di_pembukaan: 9_000, gulir_maks_persen: 90 }),
    dasar('tutup', 7, { layar_terakhir: 'akhir' }),
  ];

  it('menandai sesi yang melompat dan mencatat guliran saat itu', () => {
    const [sesi] = kelompokkanSesi(sesiLoncat());
    expect(sesi?.loncat_ke_ringkasan).toBe(true);
    expect(sesi?.gulir_saat_loncat).toBe(12);
  });

  it('sesi yang tidak melompat tidak ikut terhitung', () => {
    const tanpa = sesiLoncat().filter((p) => p.nama !== 'loncat_ke_ringkasan');
    const [sesi] = kelompokkanSesi(tanpa);
    expect(sesi?.loncat_ke_ringkasan).toBe(false);
    expect(sesi?.gulir_saat_loncat).toBeNull();
  });

  it('laporannya menyebut berapa sesi yang melompat', () => {
    const hasil = laporan(kelompokkanSesi(sesiLoncat()));
    expect(hasil).toContain('Menekan "Langsung ke ringkasan": **1**');
    expect(hasil).toContain('loncat ke ringkasan');
    expect(hasil).toContain('ya (gulir 12%)');
  });

  it('melompat TIDAK dihitung sebagai selesai membaca pembukaan', () => {
    const hasil = laporan(kelompokkanSesi(sesiLoncat()));
    // Dua angka berbeda: sampai pembukaan tetap 1, dan loncatnya dilaporkan sendiri.
    expect(hasil).toContain('Sampai layar pembukaan: **1**');
  });
});

/* ------------------------------------------------------------------ */
/* M3.2/T-09 — orang, penanda, ketukan, gulir (D-9, D-10, D-13)       */
/* ------------------------------------------------------------------ */

const semuaSesi = (): RingkasSesi[] => kelompokkanSesi(muat()).filter((s) => s.lengkap);

const cari = (nama: string): RingkasSesi => {
  const s = semuaSesi().find((x) => x.sesi === nama);
  if (s === undefined) throw new Error(`sesi ${nama} tidak ada di berkas contoh`);
  return s;
};

describe('ringkas — penanda dan nomor pengunjung dibaca dari peristiwa mulai', () => {
  it('membaca ketiganya apa adanya', () => {
    const a = cari('sesi-a-tuntas');
    expect(a.penanda).toBeNull();
    expect(a.pengunjung).toBe('4b1d2f60-8c11-4a3e-9f02-111111111111');
    expect(a.kunjungan_ke).toBe(1);

    const e = cari('sesi-e-afriza-uji-pemilik');
    expect(e.penanda).toBe('afriza');
    expect(e.kunjungan_ke).toBe(7);
  });

  it('sesi yang tidak bisa menyimpan nomor tetap terbaca, dengan null', () => {
    const g = cari('sesi-g-tanpa-nomor');
    expect(g.pengunjung).toBeNull();
    expect(g.kunjungan_ke).toBeNull();
    expect(g.penanda).toBe('wa2');
  });
});

describe('ringkas — berapa orang, bukan berapa sesi (D-13)', () => {
  it('menghitung unik, kembali, dan sesi tanpa nomor secara terpisah', () => {
    // Sesi a dan f memakai nomor yang sama: satu orang, dua sesi.
    const hitung = hitungOrang(semuaSesi());
    expect(hitung.sesi).toBe(6);
    expect(hitung.pengunjung_unik).toBe(4);
    expect(hitung.kembali).toBe(2); // pengunjung A (dua sesi) dan E (kunjungan ke-7)
    expect(hitung.sesi_tanpa_nomor).toBe(1);
  });

  it('sesi tanpa nomor TIDAK ditebak menjadi orang baru', () => {
    const hanyaTanpaNomor = semuaSesi().filter((s) => s.pengunjung === null);
    const hitung = hitungOrang(hanyaTanpaNomor);
    expect(hitung.sesi).toBe(1);
    expect(hitung.pengunjung_unik).toBe(0);
    expect(hitung.sesi_tanpa_nomor).toBe(1);
  });

  it('dua sesi dengan nomor yang sama adalah satu orang yang kembali', () => {
    const berulang = semuaSesi().filter((s) =>
      ['sesi-a-tuntas', 'sesi-f-kembali'].includes(s.sesi),
    );
    expect(hitungOrang(berulang)).toEqual({
      sesi: 2,
      pengunjung_unik: 1,
      kembali: 1,
      sesi_tanpa_nomor: 0,
    });
  });

  it('satu sesi pada kunjungan pertama bukan pengunjung yang kembali', () => {
    expect(hitungOrang([cari('sesi-b-berhenti-soal-2')]).kembali).toBe(0);
  });

  it('memecah angkanya per penanda, dan menamai yang tanpa penanda', () => {
    const per = Object.fromEntries(perPenanda(semuaSesi()));
    expect(per['wa1']?.sesi).toBe(2);
    expect(per['wa1']?.pengunjung_unik).toBe(2);
    expect(per['wa2']?.sesi_tanpa_nomor).toBe(1);
    expect(per['afriza']?.sesi).toBe(1);
    expect(per[TANPA_PENANDA]?.sesi).toBe(2); // sesi a dan f
  });
});

describe('ringkas — penanda yang dikecualikan (D-9)', () => {
  it('bawaannya afriza dan uji', () => {
    expect([...PENANDA_DIKECUALIKAN_BAWAAN]).toEqual(['afriza', 'uji']);
    expect(bacaArgumen(['berkas.jsonl']).kecuali).toEqual(['afriza', 'uji']);
    expect(bacaArgumen(['berkas.jsonl']).berkas).toEqual(['berkas.jsonl']);
  });

  it('--kecuali mengganti daftarnya, dalam dua bentuk penulisan', () => {
    expect(bacaArgumen(['a.jsonl', '--kecuali', 'k1,k2']).kecuali).toEqual(['k1', 'k2']);
    expect(bacaArgumen(['--kecuali=k3', 'a.jsonl']).kecuali).toEqual(['k3']);
    expect(bacaArgumen(['a.jsonl', '--kecuali', 'k1,k2']).berkas).toEqual(['a.jsonl']);
  });

  it('--kecuali kosong berarti tidak ada yang dikecualikan', () => {
    expect(bacaArgumen(['a.jsonl', '--kecuali', '']).kecuali).toEqual([]);
  });

  it('memisahkan sesi yang dikecualikan, dan hanya yang berpenanda itu', () => {
    const { dipakai, dikecualikan } = pisahkanKecuali(semuaSesi(), ['afriza', 'uji']);
    expect(dikecualikan.map((s) => s.sesi)).toEqual(['sesi-e-afriza-uji-pemilik']);
    // Sesi tanpa penanda tidak pernah ikut terbuang.
    expect(dipakai.some((s) => s.penanda === null)).toBe(true);
    expect(dipakai).toHaveLength(5);
  });

  it('laporan mencetak berapa sesi yang dikecualikan, supaya tidak hilang diam-diam', () => {
    const hasil = laporan(kelompokkanSesi(muat()));
    expect(hasil).toContain('Sesi yang dikecualikan');
    expect(hasil).toContain('**1**');
    expect(hasil).not.toContain('sesi-e-afriza-uji-pemilik');
  });

  it('tanpa pengecualian, sesi pemilik ikut terhitung', () => {
    const hasil = laporan(kelompokkanSesi(muat()), []);
    expect(hasil).toContain('Sesi: **6**');
    expect(hasil).toContain('sesi-e-afriza-uji-pemilik');
  });
});

describe('ringkas — apa yang diketuk dan apa yang dikira bisa diketuk (D-10)', () => {
  it('mengurutkan sepuluh uid teratas per layar dan menghitung ketukan matinya', () => {
    const soal1 = perLayar(semuaSesi()).find((l) => l.layar === 'soal-1');
    expect(soal1).toBeDefined();
    const per = Object.fromEntries((soal1?.uid ?? []).map((u) => [u.uid, u]));
    // Dua ketukan sesi b + satu sesi a + satu sesi f pada badan lembar: semuanya mati.
    expect(per['lembar:susp-2025-06-30']?.ketuk).toBe(2);
    expect(per['lembar:susp-2025-06-30']?.mati).toBe(2);
    expect(per['kaki:kelipatan-2025-08-01-2025-10-08']?.mati).toBe(0);
    expect(soal1?.ketuk_mati).toBeGreaterThan(0);
  });

  it('tidak pernah memberi lebih dari sepuluh baris per layar', () => {
    for (const l of perLayar(semuaSesi())) {
      expect(l.uid.length, l.layar).toBeLessThanOrEqual(10);
    }
  });

  it('memotong di sepuluh dan membuang yang paling jarang, bukan yang terakhir', () => {
    // Berkas contoh tidak punya layar ber-uid lebih dari sepuluh, jadi batasnya
    // diuji di sini — kalau tidak, `slice(0, 10)` bisa dihapus tanpa satu pun
    // tes merah (ditemukan sabotase T-09/9).
    const banyak: Peristiwa[] = [
      {
        nama: 'mulai', sesi: 's', kasus_id: 'k', t_ms: 0, urut: 1,
        isi: { lebar_layar: 360, penanda: null, pengunjung: null, kunjungan_ke: null },
      },
    ];
    // Dua belas uid; makin kecil nomornya makin sering diketuk.
    let urut = 2;
    for (let n = 0; n < 12; n += 1) {
      for (let kali = 0; kali < 12 - n; kali += 1) {
        banyak.push({
          nama: 'ketuk', sesi: 's', kasus_id: 'k', t_ms: urut, urut,
          isi: { layar: 'soal-1', uid: `blok-${String(n).padStart(2, '0')}`, x: 0.5, y: 0.5, mati: false },
        });
        urut += 1;
      }
    }
    const soal1 = perLayar(kelompokkanSesi(banyak)).find((l) => l.layar === 'soal-1');
    expect(soal1?.uid).toHaveLength(10);
    expect(soal1?.uid[0]?.uid).toBe('blok-00');
    expect(soal1?.uid[9]?.uid).toBe('blok-09');
    // Dua yang paling jarang memang hilang dari tabel, tetapi tidak dari totalnya.
    expect(soal1?.uid.map((u) => u.uid)).not.toContain('blok-11');
    expect(soal1?.ketuk).toBe(78);
  });

  it('memberi nama pada ketukan yang tidak mendarat di blok bernama', () => {
    const soal2 = perLayar(semuaSesi()).find((l) => l.layar === 'soal-2');
    const kosong = soal2?.uid.find((u) => u.uid === UID_KOSONG);
    expect(kosong?.ketuk).toBe(1);
    expect(kosong?.mati).toBe(1);
  });

  it('menghitung kedalaman gulir median per layar, bukan rata-rata', () => {
    expect(median([])).toBeNull();
    expect(median([0.5])).toBe(0.5);
    expect(median([0.1, 0.9])).toBeCloseTo(0.5, 6);
    // Satu nilai ekstrem tidak menggeser median.
    expect(median([0.4, 0.5, 0.6, 100])).toBeCloseTo(0.55, 6);
    const pembuka = perLayar(semuaSesi()).find((l) => l.layar === 'pembuka');
    expect(pembuka?.gulir_median).not.toBeNull();
    expect(pembuka?.sesi).toBe(6);
  });

  it('mengambil guliran TERJAUH kalau satu layar dikunjungi dua kali', () => {
    const dua: Peristiwa[] = [
      { nama: 'mulai', sesi: 's', kasus_id: 'k', t_ms: 0, urut: 1,
        isi: { lebar_layar: 360, penanda: null, pengunjung: null, kunjungan_ke: null } },
      { nama: 'gulir', sesi: 's', kasus_id: 'k', t_ms: 1, urut: 2, isi: { layar: 'soal-1', maks: 0.9 } },
      { nama: 'gulir', sesi: 's', kasus_id: 'k', t_ms: 2, urut: 3, isi: { layar: 'soal-1', maks: 0.2 } },
    ];
    expect(kelompokkanSesi(dua)[0]?.gulir).toEqual([['soal-1', 0.9]]);
  });

  it('melaporkan sesi yang menabrak batas 300 ketukan', () => {
    expect(cari('sesi-g-tanpa-nomor').ketuk_dibatasi).toBe(true);
    expect(cari('sesi-a-tuntas').ketuk_dibatasi).toBe(false);
    expect(laporan(kelompokkanSesi(muat()))).toContain('menabrak batas 300 ketukan');
  });
});

describe('ringkas — tiga pertanyaan per layar soal (D-10)', () => {
  it('menghitung SESI, bukan ketukan', () => {
    const per = Object.fromEntries(perLayarSoal(semuaSesi()).map((l) => [l.layar, l]));
    // Sesi b mengetuk badan lembar dua kali di soal-1; ia tetap satu sesi.
    expect(per['soal-1']?.buka_sumber).toBe(2); // sesi a dan g membuka kaki lembar
    expect(per['soal-1']?.jawab_di_bawah).toBe(2); // sesi c dan g
    expect(per['soal-1']?.buka_istilah).toBe(2); // sesi a dan f
    expect(per['soal-2']?.jawab_di_bawah).toBe(2); // sesi a dan b
  });

  it('membedakan membuka sumber dari membuka istilah', () => {
    // Di berkas contoh kedua angkanya kebetulan sama (2 dan 2), jadi menukarnya
    // tidak terlihat — ditemukan sabotase T-09/13. Di sini sengaja dibuat beda.
    const dasar = (urut: number, uid: string): Peristiwa => ({
      nama: 'ketuk', sesi: 's', kasus_id: 'k', t_ms: urut, urut,
      isi: { layar: 'soal-1', uid, x: 0.5, y: 0.5, mati: false },
    });
    const peristiwa: Peristiwa[] = [
      {
        nama: 'mulai', sesi: 's', kasus_id: 'k', t_ms: 0, urut: 1,
        isi: { lebar_layar: 360, penanda: null, pengunjung: null, kunjungan_ke: null },
      },
      dasar(2, 'kaki:har-2025-10-08'),
      dasar(3, 'kaki:susp-2025-06-30'),
      dasar(4, 'opsi:a'),
    ];
    const satu = perLayarSoal(kelompokkanSesi(peristiwa))[0];
    expect(satu?.buka_sumber).toBe(1);
    expect(satu?.buka_istilah).toBe(0);

    const dengan = perLayarSoal(kelompokkanSesi([...peristiwa, dasar(5, 'istilah')]))[0];
    expect(dengan?.buka_sumber).toBe(1);
    expect(dengan?.buka_istilah).toBe(1);
  });

  it('laporannya memuat tabelnya', () => {
    const hasil = laporan(kelompokkanSesi(muat()));
    expect(hasil).toContain('Tiga pertanyaan per layar soal');
    expect(hasil).toContain('ketuk "↓ Jawab di bawah"');
    expect(hasil).toContain('| soal-1 |');
  });

  it('laporannya memuat tabel orang dan tabel ketukan', () => {
    const hasil = laporan(kelompokkanSesi(muat()));
    expect(hasil).toContain('Berapa orang, bukan berapa sesi');
    expect(hasil).toContain('pengunjung unik');
    expect(hasil).toContain('Apa yang diketuk, dan apa yang dikira bisa diketuk');
    expect(hasil).toContain('gulir median');
  });
});

/**
 * D-B4 (amandemen A-2) — pengecualian per nomor pengunjung.
 *
 * Pemilik pernah membuka situsnya tanpa `?k=afriza`, dan sesi itu lolos ke
 * angka alpha. Nomor pengunjungnya acak tetapi tetap sama tiap kunjungan
 * (D-13), jadi itulah kunci yang benar untuk "ini saya, bukan pemain".
 */
describe('ringkas — pengunjung yang dikecualikan (D-B4)', () => {
  const UUID_A = '4b1d2f60-8c11-4a3e-9f02-111111111111';
  const UUID_B = '4b1d2f60-8c11-4a3e-9f02-222222222222';

  describe('bacaPengunjungDikecualikan', () => {
    it('membaca satu UUID per baris', () => {
      expect(bacaPengunjungDikecualikan(`${UUID_A}\n${UUID_B}\n`, 'uji.txt')).toEqual([
        UUID_A,
        UUID_B,
      ]);
    });

    it('mengabaikan baris kosong, spasi, dan #komentar', () => {
      const isi = `# daftar\n\n   \n${UUID_A}   \n# lagi\n`;
      expect(bacaPengunjungDikecualikan(isi, 'uji.txt')).toEqual([UUID_A]);
    });

    it('menerima berkas ber-CRLF', () => {
      const isi = [UUID_A, UUID_B, ''].join('\r\n');
      expect(bacaPengunjungDikecualikan(isi, 'uji.txt')).toEqual([UUID_A, UUID_B]);
    });

    it('MELEMPAR dengan nomor baris kalau ada yang bukan UUID v4', () => {
      const isi = `# kepala\n${UUID_A}\nbukan-uuid\n`;
      expect(() => bacaPengunjungDikecualikan(isi, 'daftar.txt')).toThrow(/daftar\.txt:3/);
      expect(() => bacaPengunjungDikecualikan(isi, 'daftar.txt')).toThrow(/bukan UUID v4/);
    });

    it('menolak UUID versi lain — bukan v4 berarti bukan nomor pengunjung kita', () => {
      const v1 = '4b1d2f60-8c11-1a3e-9f02-111111111111';
      expect(() => bacaPengunjungDikecualikan(v1, 'd.txt')).toThrow(/bukan UUID v4/);
    });

    it('berkas kosong berarti tidak ada yang dikecualikan, bukan galat', () => {
      expect(bacaPengunjungDikecualikan('', 'uji.txt')).toEqual([]);
      expect(bacaPengunjungDikecualikan('# hanya komentar\n', 'uji.txt')).toEqual([]);
    });
  });

  describe('bacaArgumen', () => {
    it('tanpa argumen, berkas daftarnya belum ditentukan', () => {
      expect(bacaArgumen(['a.jsonl']).berkasPengunjung).toBeNull();
    });

    it('menerima --kecuali-pengunjung <berkas> dan bentuk =', () => {
      expect(bacaArgumen(['a.jsonl', '--kecuali-pengunjung', 'd.txt']).berkasPengunjung).toBe(
        'd.txt',
      );
      expect(bacaArgumen(['--kecuali-pengunjung=d.txt', 'a.jsonl']).berkasPengunjung).toBe('d.txt');
    });

    it('tidak menelan nama berkas peristiwa', () => {
      const a = bacaArgumen(['a.jsonl', '--kecuali-pengunjung', 'd.txt', 'b.jsonl']);
      expect(a.berkas).toEqual(['a.jsonl', 'b.jsonl']);
    });

    it('nama berkas bawaannya dieja, bukan ditebak di tempat lain', () => {
      expect(BERKAS_PENGUNJUNG_BAWAAN).toBe('pengunjung-dikecualikan.txt');
    });
  });

  describe('pisahkanKecuali — dua jalur, tanpa hitung ganda', () => {
    it('memisahkan sesi menurut nomor pengunjungnya', () => {
      const { dipakai, dikecualikanPengunjung } = pisahkanKecuali(semuaSesi(), [], [UUID_A]);
      expect(dikecualikanPengunjung.map((s) => s.sesi)).toEqual([
        'sesi-a-tuntas',
        'sesi-f-kembali',
      ]);
      expect(dipakai.some((s) => s.pengunjung === UUID_A)).toBe(false);
    });

    it('penanda dihitung LEBIH DULU, jadi tidak ada sesi yang masuk dua daftar', () => {
      const pemilik = '4b1d2f60-8c11-4a3e-9f02-555555555555';
      const { dipakai, dikecualikan, dikecualikanPengunjung } = pisahkanKecuali(
        semuaSesi(),
        ['afriza'],
        [pemilik],
      );
      expect(dikecualikan.map((s) => s.sesi)).toEqual(['sesi-e-afriza-uji-pemilik']);
      expect(dikecualikanPengunjung).toEqual([]);
      // Ketiganya menjumlah kembali ke seluruh sesi: tidak ada yang hilang.
      expect(dipakai.length + dikecualikan.length + dikecualikanPengunjung.length).toBe(
        semuaSesi().length,
      );
    });

    it('sesi tanpa nomor pengunjung tidak pernah ikut terbuang', () => {
      const { dipakai } = pisahkanKecuali(semuaSesi(), [], [UUID_A, UUID_B]);
      expect(dipakai.some((s) => s.pengunjung === null)).toBe(true);
    });

    it('daftar kosong tidak membuang apa pun', () => {
      const { dipakai, dikecualikanPengunjung } = pisahkanKecuali(semuaSesi(), [], []);
      expect(dikecualikanPengunjung).toEqual([]);
      expect(dipakai.length).toBe(semuaSesi().length);
    });
  });

  describe('laporan', () => {
    it('mencetak jumlah sesi DAN jumlah pengunjung, terpisah dari penanda', () => {
      const teks = laporan(semuaSesi(), ['afriza', 'uji'], [UUID_A]);
      const BQ = String.fromCharCode(96);
      expect(teks).toContain('Sesi yang dikecualikan (penanda ' + BQ + 'afriza' + BQ + ', ' + BQ + 'uji' + BQ + '): **1**');
      expect(teks).toContain(
        'Sesi yang dikecualikan (nomor pengunjung, 1 nomor terdaftar): **2** dari **1** pengunjung',
      );
    });

    it('dicetak walau nol — sesi yang hilang diam-diam itu yang dijaga', () => {
      const teks = laporan(semuaSesi(), [], []);
      expect(teks).toContain(
        'Sesi yang dikecualikan (nomor pengunjung, 0 nomor terdaftar): **0** dari **0** pengunjung',
      );
    });

    it('sesi yang dikecualikan benar-benar keluar dari angka yang dilaporkan', () => {
      const tanpa = laporan(semuaSesi(), ['afriza', 'uji'], []);
      const dengan = laporan(semuaSesi(), ['afriza', 'uji'], [UUID_A]);
      expect(tanpa).toContain('Sesi: **5**');
      expect(dengan).toContain('Sesi: **3**');
    });
  });
});

/* ------------------------------------------------------------------ */
/* M3.4a D-3 — kapan, bukan hanya seberapa jauh                        */
/* ------------------------------------------------------------------ */

const BERTINGKAT = fileURLToPath(
  new URL('./contoh/peristiwa-bertingkat.jsonl', import.meta.url),
);

function muatBertingkat(): Peristiwa[] {
  return bacaJsonl(readFileSync(BERTINGKAT, 'utf8'), 'peristiwa-bertingkat.jsonl');
}

const sesiBertingkat = (nama: string): RingkasSesi => {
  const cocok = kelompokkanSesi(muatBertingkat()).find((s) => s.sesi === nama);
  expect(cocok, `sesi ${nama} harus ada di berkas contoh`).toBeDefined();
  if (cocok === undefined) throw new Error(nama);
  return cocok;
};

const diLayar = (s: RingkasSesi, layar: string): KapanLayar => {
  const cocok = s.kapan.find((k) => k.layar === layar);
  expect(cocok, `layar ${layar} di sesi ${s.sesi}`).toBeDefined();
  if (cocok === undefined) throw new Error(layar);
  return cocok;
};

/** Baris `kapan` untuk satu layar, dari daftar mentah `kapanPerLayar`. */
const diLayarDaftar = (daftar: KapanLayar[], layar: string): KapanLayar => {
  const cocok = daftar.find((k) => k.layar === layar);
  expect(cocok, `layar ${layar}`).toBeDefined();
  if (cocok === undefined) throw new Error(layar);
  return cocok;
};

/** Susun peristiwa buatan dengan `urut` yang urut sendiri. */
function rangkai(daftar: Array<[string, number, Record<string, unknown>]>): Peristiwa[] {
  return daftar.map(([nama, t_ms, isi], nomor) => ({
    nama,
    sesi: 'uji',
    kasus_id: 'uji',
    t_ms,
    urut: nomor + 1,
    isi,
  }));
}

describe('ringkas — kapanPerLayar (M3.4a D-3)', () => {
  it('detik ke ketukan pertama dihitung dari layar_masuk, mati atau tidak', () => {
    const kapan = kapanPerLayar(
      rangkai([
        ['mulai', 0, {}],
        ['layar_masuk', 1_000, { layar: 'soal-1' }],
        ['ketuk', 4_500, { layar: 'soal-1', uid: null, x: 0.5, y: 0.5, mati: true }],
        ['ketuk', 9_000, { layar: 'soal-1', uid: 'opsi:a', x: 0.5, y: 0.5, mati: false }],
      ]),
    );
    // Ketukan MATI pun ketukan: yang ditanya adalah kapan orangnya bergerak.
    expect(diLayarDaftar(kapan, 'soal-1').ms_ke_ketuk_pertama).toBe(3_500);
  });

  it('"—" ketika layar itu tidak pernah diketuk sama sekali', () => {
    const kapan = kapanPerLayar(
      rangkai([
        ['layar_masuk', 0, { layar: 'soal-1' }],
        ['gulir', 2_000, { layar: 'soal-1', maks: 0.5 }],
      ]),
    );
    expect(diLayarDaftar(kapan, 'soal-1').ms_ke_ketuk_pertama).toBeNull();
  });

  it('membedakan gulir ambang dari gulir tinggalkan-layar lewat urutan (D-2)', () => {
    const kapan = kapanPerLayar(
      rangkai([
        ['layar_masuk', 0, { layar: 'soal-1' }],
        ['gulir', 3_000, { layar: 'soal-1', maks: 0.5 }], // ambang
        ['gulir', 8_000, { layar: 'soal-1', maks: 1 }], // ambang
        ['gulir', 9_000, { layar: 'soal-1', maks: 1 }], // tinggalkan-layar
        ['layar_masuk', 9_000, { layar: 'soal-2' }],
      ]),
    );
    const s1 = diLayarDaftar(kapan, 'soal-1');
    expect(s1.ms_ke_gulir_50).toBe(3_000);
    expect(s1.ms_ke_gulir_100).toBe(8_000);
  });

  it('gulir tinggalkan-layar TIDAK dibaca sebagai ambang — berkas lama tetap "—"', () => {
    /*
     * Ini kasus berkas yang terkumpul sebelum M3.4a: satu-satunya `gulir` di
     * layar itu adalah yang lahir saat meninggalkannya, dan `maks`-nya kebetulan
     * 1. Kalau ia terbaca sebagai ambang, setiap sesi lama tiba-tiba punya
     * "detik ke 100 %" yang tidak pernah diukur siapa pun.
     */
    const kapan = kapanPerLayar(
      rangkai([
        ['layar_masuk', 0, { layar: 'soal-1' }],
        ['ketuk', 5_000, { layar: 'soal-1', uid: 'opsi:a', x: 0.5, y: 0.5, mati: false }],
        ['gulir', 12_000, { layar: 'soal-1', maks: 1 }],
        ['layar_masuk', 12_000, { layar: 'soal-2' }],
      ]),
    );
    const s1 = diLayarDaftar(kapan, 'soal-1');
    expect(s1.ms_ke_gulir_50).toBeNull();
    expect(s1.ms_ke_gulir_100).toBeNull();
    expect(s1.ms_ke_ketuk_pertama).toBe(5_000);
  });

  it('ambang tepat sebelum pindah layar pada milidetik yang sama tetap terbaca ambang', () => {
    /*
     * Kasus sempit: pemain mencapai 100 % lalu langsung menekan lanjut. Yang
     * TEPAT mendahului `layar_masuk` adalah peristiwa tinggalkan-layar; ambang
     * di depannya diikuti oleh `gulir` itu, bukan oleh `layar_masuk`.
     */
    const kapan = kapanPerLayar(
      rangkai([
        ['layar_masuk', 0, { layar: 'soal-1' }],
        ['gulir', 7_000, { layar: 'soal-1', maks: 0.5 }],
        ['gulir', 7_000, { layar: 'soal-1', maks: 1 }],
        ['gulir', 7_000, { layar: 'soal-1', maks: 1 }],
        ['layar_masuk', 7_000, { layar: 'soal-2' }],
      ]),
    );
    const s1 = diLayarDaftar(kapan, 'soal-1');
    expect(s1.ms_ke_gulir_50).toBe(7_000);
    expect(s1.ms_ke_gulir_100).toBe(7_000);
  });

  it('jeda diam terpanjang, dan di antara peristiwa apa', () => {
    const kapan = kapanPerLayar(
      rangkai([
        ['layar_masuk', 0, { layar: 'soal-1' }],
        ['gulir', 2_000, { layar: 'soal-1', maks: 0.5 }],
        ['gulir', 3_200, { layar: 'soal-1', maks: 1 }],
        ['gulir', 1_000_000, { layar: 'soal-1', maks: 1 }],
        ['tutup', 1_000_000, { layar_terakhir: 'soal-1' }],
      ]),
    );
    const s1 = diLayarDaftar(kapan, 'soal-1');
    expect(s1.jeda_diam_ms).toBe(996_800);
    expect(s1.jeda_antara).toEqual(['gulir(ambang 100%)', 'gulir(pindah 100%)']);
  });

  it('gulir dengan maks yang bukan 0,5 atau 1 tidak pernah disebut ambang', () => {
    const kapan = kapanPerLayar(
      rangkai([
        ['layar_masuk', 0, { layar: 'soal-1' }],
        ['gulir', 9_000, { layar: 'soal-1', maks: 0.62 }],
      ]),
    );
    expect(diLayarDaftar(kapan, 'soal-1').jeda_antara).toEqual(['layar_masuk', 'gulir(62%)']);
  });

  it('kunjungan kedua dihitung, dan waktunya tetap milik kunjungan pertama', () => {
    const kapan = kapanPerLayar(
      rangkai([
        ['layar_masuk', 0, { layar: 'soal-1' }],
        ['ketuk', 2_000, { layar: 'soal-1', uid: 'a', x: 0.5, y: 0.5, mati: false }],
        ['gulir', 3_000, { layar: 'soal-1', maks: 0.5 }],
        ['gulir', 4_000, { layar: 'soal-1', maks: 0.6 }],
        ['layar_masuk', 4_000, { layar: 'soal-2' }],
        ['gulir', 9_000, { layar: 'soal-2', maks: 0.3 }],
        ['layar_masuk', 9_000, { layar: 'soal-1' }],
        ['ketuk', 40_000, { layar: 'soal-1', uid: 'b', x: 0.5, y: 0.5, mati: false }],
      ]),
    );
    const s1 = diLayarDaftar(kapan, 'soal-1');
    expect(s1.kunjungan).toBe(2);
    // Kunjungan pertama: ketukan pada detik 2, bukan pada detik 31 kunjungan kedua.
    expect(s1.ms_ke_ketuk_pertama).toBe(2_000);
    expect(s1.ms_ke_gulir_50).toBe(3_000);
    // Jeda terpanjang diambil dari SEMUA kunjungan: 9.000 -> 40.000.
    expect(s1.jeda_diam_ms).toBe(31_000);
  });

  it('peristiwa sebelum layar_masuk pertama tidak masuk layar mana pun', () => {
    const kapan = kapanPerLayar(
      rangkai([
        ['mulai', 0, {}],
        ['layar_masuk', 500, { layar: 'pembuka' }],
      ]),
    );
    expect(kapan.map((k) => k.layar)).toEqual(['pembuka']);
    expect(diLayarDaftar(kapan, 'pembuka').jeda_diam_ms).toBe(0);
    expect(diLayarDaftar(kapan, 'pembuka').jeda_antara).toBeNull();
  });

  it('sesi tanpa satu pun layar_masuk tidak melempar', () => {
    expect(kapanPerLayar(rangkai([['tutup', 5, { layar_terakhir: 'soal-1' }]]))).toEqual([]);
  });
});

describe('ringkas — berkas contoh bertingkat (M3.4a D-3)', () => {
  it('memuat tepat tiga sesi, semuanya lengkap', () => {
    const semua = kelompokkanSesi(muatBertingkat());
    expect(semua.map((s) => s.sesi)).toEqual([
      'sesi-h-membaca-lalu-menjawab',
      'sesi-i-ditinggal-di-soal-1',
      'sesi-j-layar-muat-sejendela',
    ]);
    expect(semua.every((s) => s.lengkap)).toBe(true);
  });

  it('sesi yang MEMBACA lalu menjawab: gulir pelan, ketukan di antaranya', () => {
    const s = diLayar(sesiBertingkat('sesi-h-membaca-lalu-menjawab'), 'soal-1');
    expect(s.ms_ke_gulir_50).toBe(20_500);
    expect(s.ms_ke_gulir_100).toBe(46_200);
    expect(s.ms_ke_ketuk_pertama).toBe(10_700);
    // Ketukan pertama MENDAHULUI 50 %: orang ini membuka sumber sambil membaca.
    expect(s.ms_ke_ketuk_pertama ?? 0).toBeLessThan(s.ms_ke_gulir_50 ?? 0);
    expect(s.jeda_diam_ms).toBeLessThan(30_000);
  });

  it('sesi yang DITINGGAL: 100 % dalam 3,2 detik, lalu 18,5 menit tanpa apa-apa', () => {
    const s = diLayar(sesiBertingkat('sesi-i-ditinggal-di-soal-1'), 'soal-1');
    expect(s.ms_ke_gulir_50).toBe(1_500);
    expect(s.ms_ke_gulir_100).toBe(3_200);
    // Inti seluruh milestone: nol ketukan, dan diam yang panjangnya menit.
    expect(s.ms_ke_ketuk_pertama).toBeNull();
    expect(s.jeda_diam_ms).toBeGreaterThan(15 * 60_000);
    expect(s.jeda_antara).toEqual(['gulir(ambang 100%)', 'gulir(pindah 100%)']);
  });

  it('kedua sesi itu tidak bisa dibedakan dari kedalaman gulirnya saja', () => {
    /*
     * Justifikasi milestone ini, ditulis sebagai tes: dua sesi yang berlawanan
     * punya kedalaman gulir yang SAMA PERSIS di soal 1. Hanya kolom waktu yang
     * memisahkannya.
     */
    const membaca = sesiBertingkat('sesi-h-membaca-lalu-menjawab');
    const ditinggal = sesiBertingkat('sesi-i-ditinggal-di-soal-1');
    const dalam = (s: RingkasSesi): number | undefined =>
      s.gulir.find(([l]) => l === 'soal-1')?.[1];
    expect(dalam(membaca)).toBe(1);
    expect(dalam(ditinggal)).toBe(1);
    expect(diLayar(membaca, 'soal-1').ms_ke_gulir_100).toBeGreaterThan(40_000);
    expect(diLayar(ditinggal, 'soal-1').ms_ke_gulir_100).toBeLessThan(5_000);
  });

  it('sesi LAYAR-MUAT-SEJENDELA: kedua ambang pada detik nol', () => {
    const s = sesiBertingkat('sesi-j-layar-muat-sejendela');
    for (const layar of ['pembuka', 'soal-1', 'soal-2']) {
      const k = diLayar(s, layar);
      expect(k.ms_ke_gulir_50, layar).toBe(0);
      expect(k.ms_ke_gulir_100, layar).toBe(0);
    }
    // Dan itu TIDAK berarti ia membaca cepat: ketukan pertamanya jauh sesudahnya.
    expect(diLayar(s, 'soal-1').ms_ke_ketuk_pertama).toBe(21_400);
  });

  it('kedalaman gulir per layar tetap MAKSIMUM, bukan yang terakhir', () => {
    const s = sesiBertingkat('sesi-h-membaca-lalu-menjawab');
    expect(s.gulir.find(([l]) => l === 'soal-3')?.[1]).toBe(0.55);
  });
});

describe('ringkas — laporan bagian "Kapan" (M3.4a D-3)', () => {
  it('mencetak bagiannya, dan berkas lama hampir seluruhnya "—"', () => {
    const teks = laporan(lengkap());
    expect(teks).toContain('## Kapan, bukan hanya seberapa jauh');
    expect(teks).toContain('| sesi | layar | kunjungan | ketuk-1 | 50 % | 100 % | diam | antara |');

    /*
     * Batas yang jujur, dan angkanya dipatok di sini supaya tidak bisa melebar
     * diam-diam.
     *
     * D-2 melarang medan baru, jadi satu-satunya pembeda ambang dari
     * tinggalkan-layar adalah urutan. Untuk keluaran REDUCER aturan itu pasti:
     * `gulir` tinggalkan-layar selalu berbagi `t_ms` dengan `layar_masuk` atau
     * `tutup` tepat sesudahnya, karena keduanya lahir dari satu pemanggilan.
     *
     * `alat/contoh/peristiwa-contoh.jsonl` **bukan** keluaran reducer — ia
     * ditulis tangan sebelum M3.4a dan tidak mengikuti invarian itu. Di sana
     * ada satu `gulir { layar: "soal-2", maks: 1 }` yang duduk di tengah
     * kunjungan, dan ia memang tidak bisa dibedakan dari ambang oleh aturan
     * mana pun. Satu baris itu disebut namanya; sisanya wajib "—".
     */
    const PENGECUALIAN = new Set(['sesi-a-tuntas|soal-2']);
    const barisKapan = teks
      .split('\n')
      .filter((b) => b.startsWith('| sesi-') && b.split('|').length === 10);
    expect(barisKapan.length).toBeGreaterThan(8);
    let dikecualikan = 0;
    for (const b of barisKapan) {
      const kolom = b.split('|').map((x) => x.trim());
      if (PENGECUALIAN.has(`${String(kolom[1])}|${String(kolom[2])}`)) {
        dikecualikan += 1;
        continue;
      }
      expect(kolom[5], `kolom 50% di "${b}"`).toBe('—');
      expect(kolom[6], `kolom 100% di "${b}"`).toBe('—');
    }
    expect(dikecualikan, 'pengecualiannya memang ada, bukan daftar mati').toBe(PENGECUALIAN.size);
  });

  it('sesi lama yang gulirnya hanya tinggalkan-layar tetap "—" seluruhnya', () => {
    // Bentuk yang sebenarnya dari data alpha lama: `gulir` hanya lahir saat
    // pindah layar, jadi tidak satu pun kolom waktu gulirnya terisi.
    const s = lengkap().find((x) => x.sesi === 'sesi-c-tanpa-membaca-kartu');
    expect(s).toBeDefined();
    for (const k of s?.kapan ?? []) {
      expect(k.ms_ke_gulir_50, k.layar).toBeNull();
      expect(k.ms_ke_gulir_100, k.layar).toBeNull();
    }
  });

  it('jeda di atas 90 detik dicetak dalam menit, bukan sebagai 1111,0 d', () => {
    const teks = laporan(kelompokkanSesi(muatBertingkat()));
    expect(teks).toContain('18.5 mnt');
    expect(teks).not.toContain('1111.0 d');
  });

  it('berkas lama tetap teringkas tanpa galat, dan tabel lamanya utuh', () => {
    const teks = laporan(lengkap());
    for (const judul of [
      '## Berapa orang, bukan berapa sesi',
      '## Per sesi',
      '## Apakah kartu dibaca sebelum menjawab',
      '## Per soal',
      '## Lama per layar',
      '## Apa yang diketuk, dan apa yang dikira bisa diketuk',
      '## Titik berhenti',
      '## Layar akhir',
    ]) {
      expect(teks, judul).toContain(judul);
    }
  });
});

/* ------------------------------------------------------------------ */
/* Balon chat melayang (M3.7 D-4)                                      */
/* ------------------------------------------------------------------ */

const CONTOH_BALON = fileURLToPath(new URL('./contoh/peristiwa-balon.jsonl', import.meta.url));

function muatBalon(): Peristiwa[] {
  return bacaJsonl(readFileSync(CONTOH_BALON, 'utf8'), 'peristiwa-balon.jsonl');
}

const sesiBalon = (): RingkasSesi[] =>
  kelompokkanSesi(muatBalon()).filter((s) => s.lengkap);

/** Satu baris balon milik satu sesi di satu layar. */
function baris(sesi: RingkasSesi, layar: string): ReturnType<typeof ringkasSesi>['balon'][number] {
  const cocok = sesi.balon.find((b) => b.layar === layar);
  if (cocok === undefined) throw new Error(`${sesi.sesi} tidak punya baris balon ${layar}`);
  return cocok;
}

describe('ringkas — balon chat per sesi (M3.7 D-4)', () => {
  it('memuat empat sesi contoh', () => {
    expect(sesiBalon().map((s) => s.sesi)).toEqual([
      'sesi-i-turun-ketuk',
      'sesi-j-turun-tarik',
      'sesi-k-hanya-mengintip',
      'sesi-l-berhenti-sebelum-pilihan',
    ]);
  });

  it('memisahkan turun lewat ketuk dari turun lewat tarik', () => {
    const [ketukan, tarikan] = sesiBalon();
    expect(ketukan).toBeDefined();
    expect(tarikan).toBeDefined();
    if (ketukan === undefined || tarikan === undefined) return;

    expect(baris(ketukan, 'soal-1').turun_ketuk).toBe(1);
    expect(baris(ketukan, 'soal-1').turun_tarik).toBe(0);
    expect(baris(tarikan, 'soal-1').turun_ketuk).toBe(0);
    expect(baris(tarikan, 'soal-1').turun_tarik).toBe(1);
  });

  it('menghitung berapa kali balon dikembalikan mengintip', () => {
    const [ketukan, tarikan] = sesiBalon();
    if (ketukan === undefined || tarikan === undefined) return;
    expect(baris(ketukan, 'soal-1').intip).toBe(0);
    expect(baris(ketukan, 'soal-2').intip).toBe(1);
    expect(baris(tarikan, 'soal-1').intip).toBe(1);
  });

  it('`pernah_turun` tetap benar walau balonnya dinaikkan lagi', () => {
    const ketukan = sesiBalon()[0];
    if (ketukan === undefined) return;
    expect(baris(ketukan, 'soal-2').intip).toBe(1);
    expect(baris(ketukan, 'soal-2').pernah_turun).toBe(true);
  });

  /*
   * Turun, naik, turun lagi. Urutan ini tidak ada di berkas contoh, dan
   * ketiadaannya adalah lubang yang terlihat waktu sabotase: sebuah versi yang
   * menghitung `pernah_turun` dari "berapa turun dibanding berapa intip" tetap
   * hijau atas data yang hanya pernah turun sekali. Yang dijaga di sini adalah
   * sifatnya, bukan kebetulan datanya.
   */
  it('turun, naik, lalu turun lagi: dua turun, satu intip, dan tetap pernah turun', () => {
    const p = (urut: number, nama: string, isi: Record<string, unknown>): Peristiwa => ({
      nama,
      sesi: 'sesi-goyang',
      kasus_id: 'dada-2025-10-08',
      t_ms: urut * 1000,
      urut,
      isi,
    });
    const satu = ringkasSesi([
      p(1, 'mulai', { lebar_layar: 360, penanda: null, pengunjung: null, kunjungan_ke: null }),
      p(2, 'layar_masuk', { layar: 'soal-1' }),
      p(3, 'balon', { layar: 'soal-1', keadaan: 'turun', cara: 'ketuk' }),
      p(4, 'balon', { layar: 'soal-1', keadaan: 'intip', cara: 'tarik' }),
      p(5, 'balon', { layar: 'soal-1', keadaan: 'turun', cara: 'tarik' }),
      p(6, 'tutup', { layar_terakhir: 'soal-1' }),
    ]);
    const b = satu.balon.find((x) => x.layar === 'soal-1');
    expect(b).toBeDefined();
    if (b === undefined) return;
    expect(b.turun_ketuk).toBe(1);
    expect(b.turun_tarik).toBe(1);
    expect(b.intip).toBe(1);
    expect(b.pernah_turun).toBe(true);
  });

  /*
   * Inilah yang membedakan "mengintip" dari "tidak menggunakan sama sekali",
   * dan ia tidak bisa datang dari peristiwa `balon`: balon yang hanya
   * mengintip TIDAK pernah berpindah keadaan, jadi ia tidak melahirkan satu
   * peristiwa pun. Yang membuktikan salinannya memang pernah melayang adalah
   * pemain sampai ke pilihan jawaban di layar itu — pilihan berada jauh di
   * bawah balon aslinya, dan tidak ada jalan ke sana yang tidak melewati
   * ambang 50 %.
   */
  it('membedakan layar yang pilihannya tercapai dari yang tidak', () => {
    const sesi = sesiBalon();
    const mengintip = sesi[2];
    const berhenti = sesi[3];
    if (mengintip === undefined || berhenti === undefined) return;
    expect(baris(mengintip, 'soal-1').sampai_pilihan).toBe(true);
    expect(baris(mengintip, 'soal-1').pernah_turun).toBe(false);
    expect(baris(berhenti, 'soal-1').sampai_pilihan).toBe(false);
    expect(baris(berhenti, 'soal-1').pernah_turun).toBe(false);
  });

  it('membawa gulir balik ke kartu layar itu, dari kunci_jawaban di kunjungannya', () => {
    const sesi = sesiBalon();
    const ketukan = sesi[0];
    const mengintip = sesi[2];
    const berhenti = sesi[3];
    if (ketukan === undefined || mengintip === undefined || berhenti === undefined) return;
    expect(baris(ketukan, 'soal-2').gulir_balik).toBe(0);
    expect(baris(mengintip, 'soal-2').gulir_balik).toBe(4);
    // Belum dikunci berarti belum ada angkanya — bukan nol.
    expect(baris(berhenti, 'soal-1').gulir_balik).toBeNull();
  });

  it('menandai sesi yang memang memakai balonnya', () => {
    expect(sesiBalon().map((s) => s.pakai_balon)).toEqual([true, true, false, false]);
  });

  it('sesi berkas lama tidak punya satu baris balon pun', () => {
    for (const s of lengkap()) {
      expect(s.balon.filter((b) => b.turun_ketuk + b.turun_tarik + b.intip > 0)).toEqual([]);
      expect(s.pakai_balon).toBe(false);
    }
  });
});

describe('ringkas — balon chat per soal (M3.7 D-4)', () => {
  it('membagi sesi menjadi tidak menyentuh / hanya mengintip / pernah menurunkan', () => {
    const per = perBalonSoal(sesiBalon());
    expect(per.map((p) => p.layar)).toEqual(['soal-1', 'soal-2', 'soal-3']);

    const satu = per[0];
    expect(satu).toBeDefined();
    if (satu === undefined) return;
    expect(satu.sesi).toBe(4);
    expect(satu.pernah_menurunkan).toBe(2);
    expect(satu.hanya_mengintip).toBe(1);
    expect(satu.tidak_menyentuh).toBe(1);
    // Ketiganya menjumlah; sesi yang hilang dari salah satu kotak adalah cacat.
    expect(satu.pernah_menurunkan + satu.hanya_mengintip + satu.tidak_menyentuh).toBe(satu.sesi);
  });

  it('menghitung cara menurunkan per soal', () => {
    const per = perBalonSoal(sesiBalon());
    const dua = per.find((p) => p.layar === 'soal-2');
    if (dua === undefined) return;
    expect(dua.turun_ketuk).toBe(1);
    expect(dua.turun_tarik).toBe(1);
    expect(dua.intip).toBe(1);
  });

  it('menyandingkan gulir balik sesi yang memakai balon dengan yang tidak', () => {
    const per = perBalonSoal(sesiBalon());
    const satu = per.find((p) => p.layar === 'soal-1');
    const dua = per.find((p) => p.layar === 'soal-2');
    if (satu === undefined || dua === undefined) return;

    expect(satu.sesi_dengan).toBe(2);
    expect(satu.gulir_balik_dengan).toBe(0);
    expect(satu.sesi_tanpa).toBe(1);
    expect(satu.gulir_balik_tanpa).toBe(2);

    expect(dua.gulir_balik_dengan).toBe(0.5);
    expect(dua.gulir_balik_tanpa).toBe(4);
  });

  it('sesi yang belum mengunci tidak ikut penyebut gulir balik', () => {
    const satu = perBalonSoal(sesiBalon()).find((p) => p.layar === 'soal-1');
    if (satu === undefined) return;
    // sesi-l masuk hitungan sesi, tetapi tidak punya angka gulir balik.
    expect(satu.sesi).toBe(4);
    expect(satu.sesi_dengan + satu.sesi_tanpa).toBe(3);
  });

  it('berkas lama saja: semuanya jatuh ke kolom "tanpa balon"', () => {
    const per = perBalonSoal(lengkap());
    expect(per.length).toBeGreaterThan(0);
    for (const p of per) {
      expect(p.pernah_menurunkan).toBe(0);
      expect(p.sesi_dengan).toBe(0);
      expect(p.gulir_balik_dengan).toBeNull();
    }
  });
});

describe('ringkas — bagian "Balon chat" di laporan (M3.7 D-4)', () => {
  it('mencetak bagiannya beserta kedua tabelnya', () => {
    const teks = laporan(sesiBalon(), []);
    expect(teks).toContain('## Balon chat');
    expect(teks).toContain('| sesi | layar | turun (ketuk) | turun (tarik) | kembali mengintip |');
    expect(teks).toContain('| layar | sesi | tidak menyentuh | hanya mengintip |');
    expect(teks).toContain('sesi-i-turun-ketuk');
  });

  it('mencetak kedua kolom gulir balik berdampingan', () => {
    const teks = laporan([...sesiBalon(), ...lengkap()], []);
    expect(teks).toContain('gulir balik (pakai balon)');
    expect(teks).toContain('gulir balik (tanpa balon)');
  });

  it('mengatakan bahwa berkas sebelum M3.7 tidak punya balonnya sama sekali', () => {
    const teks = laporan(sesiBalon(), []);
    expect(teks).toContain('sebelum M3.7');
  });

  it('berkas lama saja tetap mencetak bagiannya, dengan "—" bukan nol', () => {
    const teks = laporan(lengkap());
    expect(teks).toContain('## Balon chat');
    // Tidak ada satu pun sesi yang memakai balon, jadi kolomnya kosong — dan
    // kosong harus terbaca sebagai ketiadaan data, bukan sebagai angka nol.
    const bagian = teks.slice(teks.indexOf('## Balon chat'));
    expect(bagian).toContain('—');
  });
});

/* ------------------------------------------------------------------ */
/* Per kasus (M4 D-4)                                                  */
/* ------------------------------------------------------------------ */

/**
 * Satu sesi buatan: peristiwa seminimal mungkin supaya yang diuji memang
 * pemisahan per kasus, bukan pembacaan berkas contoh.
 */
function sesiKasus(
  sesi: string,
  kasus_id: string,
  jawab: Array<{ soal_id: string; benar: boolean; kartuMs: number; balik: number }>,
  sampaiPembukaan: boolean,
): Peristiwa[] {
  let urut = 0;
  const berikut = (): number => (urut += 1);
  const dasar = (nama: string, isi: Record<string, unknown>): Peristiwa => ({
    nama,
    sesi,
    kasus_id,
    t_ms: urut * 1000,
    urut: berikut(),
    isi,
  });
  const peristiwa: Peristiwa[] = [
    dasar('mulai', { lebar_layar: 360, penanda: null, pengunjung: null, kunjungan_ke: null }),
  ];
  for (const j of jawab) {
    peristiwa.push(
      dasar('kunci_jawaban', {
        soal_id: j.soal_id,
        kunci: 'a',
        benar: j.benar,
        ms_di_soal: 30_000,
        ms_kartu_terlihat_sebelum: j.kartuMs,
        gulir_balik_ke_kartu: j.balik,
      }),
    );
  }
  if (sampaiPembukaan) peristiwa.push(dasar('pembukaan_masuk', {}));
  return peristiwa;
}

function duaKasus(): RingkasSesi[] {
  return kelompokkanSesi([
    ...sesiKasus(
      'sesi-dada-1',
      'dada-2025-10-08',
      [
        { soal_id: 's1', benar: true, kartuMs: 10_000, balik: 2 },
        { soal_id: 's2', benar: false, kartuMs: 20_000, balik: 0 },
      ],
      true,
    ),
    ...sesiKasus(
      'sesi-dada-2',
      'dada-2025-10-08',
      [{ soal_id: 's1', benar: false, kartuMs: 6_000, balik: 1 }],
      false,
    ),
    ...sesiKasus(
      'sesi-ultj-1',
      'ultj-2026-05-04',
      [{ soal_id: 'u1', benar: true, kartuMs: 40_000, balik: 3 }],
      true,
    ),
  ]);
}

describe('perKasus — angka alpha dipecah menurut kasus (M4 D-4)', () => {
  it('memisahkan sesi menurut kasus_id peristiwanya, urut abjad', () => {
    expect(perKasus(duaKasus()).map((k) => k.kasus_id)).toEqual([
      'dada-2025-10-08',
      'ultj-2026-05-04',
    ]);
  });

  it('menghitung sesi dan yang sampai layar pembukaan per kasus', () => {
    const per = Object.fromEntries(perKasus(duaKasus()).map((k) => [k.kasus_id, k]));
    expect(per['dada-2025-10-08']?.sesi).toBe(2);
    expect(per['dada-2025-10-08']?.sampai_pembukaan).toBe(1);
    expect(per['ultj-2026-05-04']?.sesi).toBe(1);
    expect(per['ultj-2026-05-04']?.sampai_pembukaan).toBe(1);
  });

  it('jumlah sesi per kasus sama dengan jumlah sesi seluruhnya', () => {
    const semua = duaKasus();
    expect(perKasus(semua).reduce((j, k) => j + k.sesi, 0)).toBe(semua.length);
  });

  it('benar per soal memakai soal_id kasus itu sendiri, tidak dicampur', () => {
    const per = Object.fromEntries(perKasus(duaKasus()).map((k) => [k.kasus_id, k]));
    expect(per['dada-2025-10-08']?.soal).toEqual([
      { soal_id: 's1', dijawab: 2, benar: 1 },
      { soal_id: 's2', dijawab: 1, benar: 0 },
    ]);
    expect(per['ultj-2026-05-04']?.soal).toEqual([{ soal_id: 'u1', dijawab: 1, benar: 1 }]);
  });

  it('kartu terlihat dan gulir balik dirata-rata di dalam kasusnya saja', () => {
    const per = Object.fromEntries(perKasus(duaKasus()).map((k) => [k.kasus_id, k]));
    // DADA: (10.000 + 20.000 + 6.000) / 3 = 12.000; (2 + 0 + 1) / 3 = 1
    expect(per['dada-2025-10-08']?.rata_kartu_terlihat_ms).toBe(12_000);
    expect(per['dada-2025-10-08']?.rata_gulir_balik).toBe(1);
    // ULTJ sendirian, jadi angkanya tidak boleh tertarik oleh DADA.
    expect(per['ultj-2026-05-04']?.rata_kartu_terlihat_ms).toBe(40_000);
    expect(per['ultj-2026-05-04']?.rata_gulir_balik).toBe(3);
  });

  it('kasus tanpa satu pun jawaban terkunci: "—", bukan nol', () => {
    const sesi = kelompokkanSesi(sesiKasus('sesi-kosong', 'kk-2026-01-01', [], false));
    const [satu] = perKasus(sesi);
    expect(satu?.sesi).toBe(1);
    expect(satu?.soal).toEqual([]);
    expect(satu?.rata_kartu_terlihat_ms).toBeNull();
    expect(satu?.rata_gulir_balik).toBeNull();
  });

  it('laporannya memuat satu baris per kasus, dengan soal_id-nya', () => {
    const teks = laporan(duaKasus(), []);
    expect(teks).toContain('## Per kasus');
    expect(teks).toContain(
      '| kasus | sesi | sampai pembukaan | benar per soal | rata kartu terlihat | rata gulir balik |',
    );
    expect(teks).toContain('| dada-2025-10-08 | 2 | 1 | s1 1/2 · s2 0/1 |');
    expect(teks).toContain('| ultj-2026-05-04 | 1 | 1 | u1 1/1 |');
  });

  it('berkas contoh yang hanya punya satu kasus tetap mencetak bagiannya', () => {
    const teks = laporan(lengkap());
    expect(teks).toContain('## Per kasus');
    expect(teks).toContain('dada-2025-10-08');
  });
});
