import { existsSync, readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { KasusTidakSah, bangunKasus } from './bangun.ts';
import { DADA_2025_10_08 } from './dada-2025-10-08.ts';
import { keJson } from './json.ts';
import { muatDada } from '../muat/dada.ts';
import { periksaKasus } from '../skema/validator.ts';
import { teksPolos } from '../skema/rujukan.ts';
import type { Kasus } from '../skema/tipe.ts';

const AKAR = fileURLToPath(new URL('../../', import.meta.url));
const adaCache = existsSync(AKAR + '.cache/sectors/dada-filings-2025.json');
const BERKAS_KASUS = AKAR + 'cases/dada-2025-10-08.json';

function muatBerkas(): Kasus {
  return JSON.parse(readFileSync(BERKAS_KASUS, 'utf8')) as Kasus;
}

describe('berkas kasus yang ikut repo', () => {
  it('ada dan lolos validator yang sama dengan yang dipakai build', () => {
    const kasus = muatBerkas();
    expect(periksaKasus(kasus)).toEqual([]);
    expect(kasus.skema_versi).toBe(3);
    expect(kasus.tanggal_t).toBe('2025-10-08');
    expect(kasus.soal).toHaveLength(3);
    expect(kasus.disclaimer).toHaveLength(3);
  });

  it('membawa delapan fakta terlihat, yaitu gabungan seluruh kartu (D-1)', () => {
    const kasus = muatBerkas();
    expect(kasus.fakta_terlihat).toHaveLength(8);
    const gabungan = new Set(kasus.soal.flatMap((s) => s.kartu));
    expect([...gabungan].sort()).toEqual([...kasus.fakta_terlihat].sort());
  });

  it('membawa kartu 2, 2, dan 4 beserta istilah 2, 2, dan 1', () => {
    const kasus = muatBerkas();
    expect(kasus.soal.map((s) => s.kartu.length)).toEqual([2, 2, 4]);
    expect(kasus.soal.map((s) => s.istilah.length)).toEqual([2, 2, 1]);
  });

  it('menunjuk satu kartu penentu per soal, semuanya benar-benar kartu soal itu (A1-T1)', () => {
    const kasus = muatBerkas();
    expect(kasus.soal.map((s) => s.kartu_penentu)).toEqual([
      ['susp-2025-06-30'],
      ['andai-10-lot-dividen'],
      ['jumlah-jual-terverifikasi'],
    ]);
    for (const soal of kasus.soal) {
      for (const id of soal.kartu_penentu) {
        expect(soal.kartu, soal.soal_id).toContain(id);
      }
    }
  });

  it('memberi kepala "Dihitung dari" tepat pada kartu yang kami hitung sendiri (A1-T1)', () => {
    const kasus = muatBerkas();
    const indeks = new Map(kasus.fakta.map((f) => [f.fact_id, f]));
    for (const soal of kasus.soal) {
      for (const id of soal.kartu) {
        const fakta = indeks.get(id);
        const dihitung = fakta?.sumber.jenis === 'turunan';
        const mengaku = fakta?.awam?.kepala.startsWith('Dihitung dari') === true;
        expect(mengaku, `${id} — garis kepala harus sepakat dengan sumbernya`).toBe(dihitung);
      }
    }
  });

  it('memakai laporan asli, bukan fakta gabungan, sebagai kartu ketiga soal 3 (A1-T1)', () => {
    const kasus = muatBerkas();
    const soal3 = kasus.soal[2];
    expect(soal3?.kartu).toContain('fil-2025-09-01-01');
    expect(soal3?.kartu).not.toContain('fil-2025-09-01');
  });

  it('memberi setiap kartu teks awam berbahasa sehari-hari yang cukup pendek', () => {
    const kasus = muatBerkas();
    const indeks = new Map(kasus.fakta.map((f) => [f.fact_id, f]));
    for (const id of kasus.fakta_terlihat) {
      const awam = indeks.get(id)?.awam;
      expect(awam, `kartu ${id}`).not.toBeNull();
      expect(awam?.kepala.length, `kepala ${id}`).toBeGreaterThan(0);
      expect(teksPolos(awam?.isi ?? '').length, `isi ${id}`).toBeLessThanOrEqual(220);
    }
  });

  it('membawa tiga fakta turunan baru dengan angka yang benar', () => {
    const kasus = muatBerkas();
    const nilai = (id: string): unknown => kasus.fakta.find((f) => f.fact_id === id)?.nilai;
    // 1.000 lembar × Rp0,14 = Rp140
    expect(nilai('andai-10-lot-dividen')).toBe(140);
    // 1.000 lembar × Rp178 = Rp178.000
    expect(nilai('andai-10-lot-nilai')).toBe(178_000);
    // 70.000.000 + 179.500.000 + 50.000.000 = 299.500.000
    expect(nilai('jumlah-jual-terverifikasi')).toBe(299_500_000);
  });

  it('hanya memakai kartu yang lolos verifikasi dan sudah terbit pada tanggal T', () => {
    const kasus = muatBerkas();
    const indeks = new Map(kasus.fakta.map((f) => [f.fact_id, f]));
    for (const soal of kasus.soal) {
      for (const id of soal.kartu) {
        const fakta = indeks.get(id);
        expect(fakta?.status, `kartu ${id}`).toBe('TERVERIFIKASI');
        expect(String(fakta?.tersedia_sejak) <= kasus.tanggal_t, `kartu ${id}`).toBe(true);
      }
    }
  });

  it('tidak menampilkan laporan yang disingkirkan di layar soal mana pun', () => {
    const kasus = muatBerkas();
    const disingkirkan = ['fil-2025-08-25', 'fil-2025-09-29', 'fil-2025-09-29-01'];
    const teksPemain = [
      kasus.pembuka.kalimat,
      ...kasus.soal.flatMap((s) => [
        s.pesan.isi,
        s.penjelasan,
        ...s.pilihan.map((p) => p.teks),
        ...s.kartu.map((id) => kasus.fakta.find((f) => f.fact_id === id)?.awam?.isi ?? ''),
      ]),
    ].join('\n');
    // Bentuk rujukannya yang diperiksa, bukan substring: `fil-2025-08-25-03`
    // memuat `fil-2025-08-25` sebagai potongan teks tetapi laporannya lain.
    for (const id of disingkirkan) {
      expect(teksPemain, `laporan ${id}`).not.toContain(`[[${id}|`);
    }
    // Rp165 adalah harga yang dibantah temuan R6; ia tidak boleh muncul di layar soal.
    expect(teksPemain).not.toContain('Rp165');
  });

  it('menjelaskan laporan yang disingkirkan di layar pembukaan (D-13e)', () => {
    const kasus = muatBerkas();
    const teks = kasus.pembukaan.disingkirkan.join('\n');
    expect(teks).toContain('fil-2025-08-25');
    expect(teks).toContain('fil-2025-09-29');
    expect(teks).toContain('Rp165');
  });

  it('tiap soal membawa pesan dari pengirim yang berbeda, dengan jam yang sah', () => {
    // v3 menggantikan aturan 8 lama ("penanda hari-ini di tiap batang"):
    // jangkar waktunya sekarang keping kalender yang menempel, bukan kalimat
    // yang diulang di tiap soal. Yang dijaga di sini adalah bentuk barunya.
    const kasus = muatBerkas();
    const nama = kasus.soal.map((s) => s.pesan.nama);
    expect(new Set(nama).size, nama.join(', ')).toBe(kasus.soal.length);
    for (const s of kasus.soal) {
      expect(s.pesan.jam, s.soal_id).toMatch(/^([01]\d|2[0-3])\.[0-5]\d$/);
      // Sesudah bursa tutup (16.00 WIB), karena pesannya membicarakan
      // harga penutupan hari itu.
      expect(Number(s.pesan.jam.split('.')[0]), s.soal_id).toBeGreaterThanOrEqual(16);
      expect(s.tanya, s.soal_id).toContain(s.pesan.nama);
      expect(s.pesan.isi, s.soal_id).not.toMatch(/\[\[/);
    }
    expect(kasus.soal.map((s) => s.petunjuk !== null)).toEqual([true, false, false]);
  });

  it('menyebut di panel sumber bahwa tanggal pencabutan suspensi tidak ada di data', () => {
    const kasus = muatBerkas();
    const susp = kasus.fakta.find((f) => f.fact_id === 'susp-2025-06-30');
    expect(susp?.klaim).toContain('Tanggal pencabutan penghentian ini tidak ada di data');
  });

  it('tidak memuat satu pun fakta sesudah tanggal T di bagian yang dilihat pemain', () => {
    const kasus = muatBerkas();
    const indeks = new Map(kasus.fakta.map((f) => [f.fact_id, f]));
    for (const id of kasus.fakta_terlihat) {
      const fakta = indeks.get(id);
      expect(fakta, `fakta ${id}`).toBeDefined();
      expect(fakta?.tersedia_sejak).not.toBeNull();
      expect(String(fakta?.tersedia_sejak) <= kasus.tanggal_t).toBe(true);
    }
    for (const id of kasus.pembukaan.fact_ids) {
      expect(kasus.fakta_terlihat).not.toContain(id);
    }
  });

  it('memuat tiga temuan yang diminta kontrak, beserta angkanya', () => {
    const kasus = muatBerkas();
    const nilai = (aturan: string, label: string): number[] =>
      kasus.temuan
        .filter((t) => t.aturan === aturan)
        .flatMap((t) => t.angka.filter((a) => a.label === label).map((a) => a.nilai));
    expect(nilai('R3', 'lembar pada set ulangan')).toEqual([586_000_000]);
    expect(nilai('R3', 'transaksi yang berulang')).toEqual([6]);
    expect(nilai('R2', 'lompatan')).toContain(79_272_900);
    expect(nilai('R2', 'lompatan')).toContain(-1_660_008_900);
  });

  it('mencatat kesepuluh aturan, termasuk yang tidak bisa dijalankan', () => {
    const kasus = muatBerkas();
    expect(kasus.pemeriksaan).toHaveLength(10);
    for (const p of kasus.pemeriksaan) {
      if (!p.dijalankan) expect(p.alasan_lewat).toBeTruthy();
    }
  });
});

describe.skipIf(!adaCache)('membangun ulang kasus dari cache', () => {
  const data = muatDada();

  it('menghasilkan berkas yang sama persis dengan yang ikut repo', () => {
    const { kasus } = bangunKasus(DADA_2025_10_08, data);
    expect(keJson(kasus)).toBe(readFileSync(BERKAS_KASUS, 'utf8').replace(/\r\n/g, '\n'));
  });

  it('gagal menyebut fact_id kalau fakta sesudah T ditaruh di bagian pemain', () => {
    const bocor = {
      ...DADA_2025_10_08,
      fakta_terlihat: [...DADA_2025_10_08.fakta_terlihat, 'harga-2025-10-22'],
    };
    try {
      bangunKasus(bocor, data);
      throw new Error('seharusnya gagal');
    } catch (galat) {
      expect(galat).toBeInstanceOf(KasusTidakSah);
      const masalah = (galat as KasusTidakSah).masalah;
      expect(masalah.map((m) => m.kode)).toContain('FAKTA_SESUDAH_T');
      expect(masalah.map((m) => m.pesan).join(' ')).toContain('harga-2025-10-22');
    }
  });

  it('gagal kalau satu kartu diganti fakta pembukaan (INV-10 lewat D-2)', () => {
    const soal = DADA_2025_10_08.soal.map((s, nomor) =>
      nomor === 0 ? { ...s, kartu: [s.kartu[0] ?? '', 'harga-2025-10-22'] } : s,
    );
    const bocor = {
      ...DADA_2025_10_08,
      soal,
      fakta_terlihat: DADA_2025_10_08.fakta_terlihat.map((id) =>
        id === 'susp-2025-06-30' ? 'harga-2025-10-22' : id,
      ),
    };
    try {
      bangunKasus(bocor, data);
      throw new Error('seharusnya gagal');
    } catch (galat) {
      expect(galat).toBeInstanceOf(KasusTidakSah);
      const kode = (galat as KasusTidakSah).masalah.map((m) => m.kode);
      expect(kode).toContain('KARTU_SESUDAH_T');
    }
  });

  it('gagal kalau kartu berstatus KONFLIK dipakai', () => {
    const soal = DADA_2025_10_08.soal.map((s, nomor) =>
      nomor === 2 ? { ...s, kartu: ['fil-2025-09-29', ...s.kartu.slice(1)] } : s,
    );
    const konflik = {
      ...DADA_2025_10_08,
      soal,
      awam: {
        ...DADA_2025_10_08.awam,
        'fil-2025-09-29': { kepala: 'Laporan · 29 Sep 2025', isi: 'Ia menjual lagi.' },
      },
      fakta_terlihat: DADA_2025_10_08.fakta_terlihat.map((id) =>
        id === 'fil-2025-08-25-03' ? 'fil-2025-09-29' : id,
      ),
    };
    try {
      bangunKasus(konflik, data);
      throw new Error('seharusnya gagal');
    } catch (galat) {
      expect(galat).toBeInstanceOf(KasusTidakSah);
      const masalah = (galat as KasusTidakSah).masalah;
      expect(masalah.map((m) => m.kode)).toContain('KARTU_TAK_TERVERIFIKASI');
      expect(masalah.map((m) => m.pesan).join(' ')).toContain('fil-2025-09-29');
    }
  });

  it('gagal menyebut fact_id yang menggantung', () => {
    const menggantung = {
      ...DADA_2025_10_08,
      fakta_terlihat: [...DADA_2025_10_08.fakta_terlihat, 'harga-2030-01-01'],
    };
    expect(() => bangunKasus(menggantung, data)).toThrowError(/harga-2030-01-01/);
  });

  it('menolak teks kartu yang ditulis untuk fakta yang tidak dipakai', () => {
    const salahKetik = {
      ...DADA_2025_10_08,
      awam: {
        ...DADA_2025_10_08.awam,
        'harga-2030-01-01': { kepala: 'Salah ketik', isi: 'Tidak akan pernah tampil.' },
      },
    };
    expect(() => bangunKasus(salahKetik, data)).toThrowError(/harga-2030-01-01/);
  });

  it('menandai fakta yang tersangkut temuan sebagai KONFLIK, termasuk gabungannya', () => {
    const { kasus } = bangunKasus(DADA_2025_10_08, data);
    const status = (id: string): string | undefined =>
      kasus.fakta.find((f) => f.fact_id === id)?.status;
    // Lompatan 25 Agu menyangkut dua dari empat laporan hari itu, jadi fakta
    // gabungannya ikut KONFLIK — sementara dua laporan lain tetap bersih.
    expect(status('fil-2025-08-25-01')).toBe('KONFLIK');
    expect(status('fil-2025-08-25')).toBe('KONFLIK');
    expect(status('fil-2025-08-25-03')).toBe('TERVERIFIKASI');
    expect(status('fil-2025-08-25-04')).toBe('TERVERIFIKASI');
    // Laporan 29 Sep tersangkut R6 (harga di luar rentang hari itu).
    expect(status('fil-2025-09-29')).toBe('KONFLIK');
    // Laporan 1 Sep tidak tersangkut temuan mana pun. Sejak A1-T1 yang menjadi
    // kartu adalah laporan aslinya, bukan fakta gabungannya, jadi gabungannya
    // tidak lagi ditarik ke berkas kasus sama sekali.
    expect(status('fil-2025-09-01-01')).toBe('TERVERIFIKASI');
    expect(status('fil-2025-09-01')).toBeUndefined();
    expect(status('harga-2025-10-08')).toBe('TERVERIFIKASI');
  });

  it('tidak memakai fakta KONFLIK sebagai dasar jawaban soal mana pun', () => {
    const { kasus } = bangunKasus(DADA_2025_10_08, data);
    const konflik = new Set(
      kasus.fakta.filter((f) => f.status === 'KONFLIK').map((f) => f.fact_id),
    );
    for (const soal of kasus.soal) {
      for (const id of soal.fact_ids) expect(konflik.has(id)).toBe(false);
      for (const id of soal.kartu) expect(konflik.has(id)).toBe(false);
    }
  });
});
