import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { bacaJsonl, kelompokkanSesi, laporan, ringkasSesi, type Peristiwa } from './ringkas.ts';

const CONTOH = fileURLToPath(new URL('./contoh/peristiwa-contoh.jsonl', import.meta.url));

function muat(): Peristiwa[] {
  return bacaJsonl(readFileSync(CONTOH, 'utf8'), 'peristiwa-contoh.jsonl');
}

describe('ringkas — berkas contoh', () => {
  it('memuat tiga sesi seperti dituntut RQ-07', () => {
    const sesi = kelompokkanSesi(muat());
    expect(sesi.map((s) => s.sesi)).toEqual([
      'sesi-a-tuntas',
      'sesi-b-berhenti-soal-2',
      'sesi-c-tanpa-membuka-kartu',
    ]);
  });

  it('menandai sesi yang sampai pembukaan dan yang berhenti di tengah', () => {
    const sesi = kelompokkanSesi(muat());
    expect(sesi.map((s) => s.sampai_pembukaan)).toEqual([true, false, true]);
    expect(sesi.map((s) => s.layar_terakhir)).toEqual(['akhir', 'soal-2', 'akhir']);
  });

  it('mencatat nol kartu dibuka di ketiga soal untuk sesi yang tidak pernah membukanya', () => {
    const sesi = kelompokkanSesi(muat()).find((s) => s.sesi === 'sesi-c-tanpa-membuka-kartu');
    expect(sesi?.soal).toHaveLength(3);
    for (const soal of sesi?.soal ?? []) {
      expect(soal.kartu_dibuka_sebelum, soal.soal_id).toBe(0);
    }
  });

  it('menghitung kartu dibuka untuk sesi yang membukanya', () => {
    const sesi = kelompokkanSesi(muat()).find((s) => s.sesi === 'sesi-a-tuntas');
    const per = Object.fromEntries((sesi?.soal ?? []).map((s) => [s.soal_id, s.kartu_dibuka_sebelum]));
    expect(per['s1-kata-bursa']).toBe(2);
    expect(per['s2-dividen-pemilik-kecil']).toBe(1);
    // "Lihat kartu lagi" membuka keempat kartu soal 3 sekaligus.
    expect(per['s3-siapa-yang-menjual']).toBe(4);
  });

  it('menghitung perpindahan pilihan', () => {
    const sesi = kelompokkanSesi(muat()).find((s) => s.sesi === 'sesi-a-tuntas');
    const soal1 = sesi?.soal.find((s) => s.soal_id === 's1-kata-bursa');
    expect(soal1?.ganti_pilihan).toBe(1);
  });

  it('mencatat benar dan salah per soal', () => {
    const sesi = kelompokkanSesi(muat());
    const a = sesi.find((s) => s.sesi === 'sesi-a-tuntas');
    expect(a?.soal.map((s) => s.benar)).toEqual([true, true, false]);
    const c = sesi.find((s) => s.sesi === 'sesi-c-tanpa-membuka-kartu');
    expect(c?.soal.map((s) => s.benar)).toEqual([false, false, true]);
  });

  it('memberi durasi per layar yang lebih dari nol untuk sesi tuntas', () => {
    const sesi = kelompokkanSesi(muat()).find((s) => s.sesi === 'sesi-a-tuntas');
    const layar = Object.fromEntries(sesi?.ms_per_layar ?? []);
    for (const nama of ['pembuka', 'soal-1', 'soal-2', 'soal-3', 'pembukaan', 'akhir']) {
      expect(layar[nama], nama).toBeGreaterThan(0);
    }
  });

  it('membaca isi layar akhir, termasuk yang dilewati', () => {
    const sesi = kelompokkanSesi(muat());
    const a = sesi.find((s) => s.sesi === 'sesi-a-tuntas');
    expect(a?.akhir?.['rating']).toBe(4);
    expect(a?.akhir?.['sumber_jawaban']).toBe('kartu fakta');
    const c = sesi.find((s) => s.sesi === 'sesi-c-tanpa-membuka-kartu');
    expect(c?.akhir?.['terasa']).toBeNull();
    const b = sesi.find((s) => s.sesi === 'sesi-b-berhenti-soal-2');
    expect(b?.akhir).toBeNull();
  });

  it('mencatat ketukan "Mau coba kasus lain"', () => {
    const sesi = kelompokkanSesi(muat());
    expect(sesi.map((s) => s.minat_kasus_lain)).toEqual([true, false, false]);
  });
});

describe('ringkas — laporan Markdown', () => {
  it('deterministik: dua penyusunan menghasilkan teks yang sama persis', () => {
    expect(laporan(kelompokkanSesi(muat()))).toBe(laporan(kelompokkanSesi(muat())));
  });

  it('tidak bergantung pada urutan baris di berkas', () => {
    const lurus = laporan(kelompokkanSesi(muat()));
    const terbalik = laporan(kelompokkanSesi([...muat()].reverse()));
    expect(terbalik).toBe(lurus);
  });

  it('memuat setiap bagian yang diminta D-10', () => {
    const teks = laporan(kelompokkanSesi(muat()));
    for (const bagian of [
      'Sampai layar pembukaan',
      '## Per sesi',
      '## Kartu dibuka sebelum menjawab',
      '## Per soal',
      '## Lama per layar',
      '## Titik berhenti',
      '## Layar akhir',
    ]) {
      expect(teks, bagian).toContain(bagian);
    }
  });

  it('menyebut nol kartu dibuka untuk sesi yang tidak pernah membukanya', () => {
    const teks = laporan(kelompokkanSesi(muat()));
    expect(teks).toContain('| sesi-c-tanpa-membuka-kartu | 0 | 0 | 0 |');
  });

  it('melarikan pipa di tulisan bebas supaya tabelnya tidak pecah', () => {
    const peristiwa: Peristiwa[] = [
      {
        nama: 'akhir_kirim',
        sesi: 's',
        kasus_id: 'k',
        t_ms: 10,
        urut: 1,
        isi: { rating: null, terasa: null, sumber_jawaban: null, teks: 'a | b | c' },
      },
    ];
    expect(laporan(kelompokkanSesi(peristiwa))).toContain('a \\| b \\| c');
  });

  it('menangani berkas tanpa satu pun sesi tanpa melempar', () => {
    expect(laporan([])).toContain('Tidak ada satu pun sesi');
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
