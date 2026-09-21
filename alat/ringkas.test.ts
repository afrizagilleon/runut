import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import {
  bacaJsonl,
  buangKembar,
  kelompokkanSesi,
  laporan,
  ringkasSesi,
  type Peristiwa,
} from './ringkas.ts';

const CONTOH = fileURLToPath(new URL('./contoh/peristiwa-contoh.jsonl', import.meta.url));

function muat(): Peristiwa[] {
  return bacaJsonl(readFileSync(CONTOH, 'utf8'), 'peristiwa-contoh.jsonl');
}

const lengkap = (): ReturnType<typeof kelompokkanSesi> =>
  kelompokkanSesi(muat()).filter((s) => s.lengkap);

describe('ringkas — berkas contoh', () => {
  it('memuat tiga sesi lengkap dan satu yang tak lengkap', () => {
    expect(lengkap().map((s) => s.sesi)).toEqual([
      'sesi-a-tuntas',
      'sesi-b-berhenti-soal-2',
      'sesi-c-tanpa-membaca-kartu',
    ]);
    expect(kelompokkanSesi(muat()).filter((s) => !s.lengkap).map((s) => s.sesi)).toEqual([
      'sesi-d-tab-lama',
    ]);
  });

  it('menandai sesi yang sampai pembukaan dan yang berhenti di tengah', () => {
    expect(lengkap().map((s) => s.sampai_pembukaan)).toEqual([true, false, true]);
    expect(lengkap().map((s) => s.layar_terakhir)).toEqual(['akhir', 'soal-2', 'akhir']);
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
    expect(lengkap().map((s) => s.minat_kasus_lain)).toEqual([true, false, false]);
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
    // Tiga sesi lengkap, bukan empat.
    expect(teks).toContain('Sesi: **3**');
    expect(teks).toContain('Sampai layar pembukaan: **2** dari 3');
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
