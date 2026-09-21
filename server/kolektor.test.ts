import { mkdtempSync, readFileSync, existsSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import type { AddressInfo } from 'node:net';
import type { Server } from 'node:http';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
// @ts-expect-error — pengumpul sengaja JavaScript bawaan Node, tanpa langkah build.
import { buatKolektor, periksaPeristiwa } from './kolektor.mjs';

/**
 * Seluruh blok ini menjalankan server sungguhan di port acak (RQ-06), bukan
 * memanggil fungsi penanganan secara langsung: yang diuji termasuk kode status,
 * batas badan, dan apa yang benar-benar tertulis ke berkas.
 */

const UA_UJI = 'RunutUjiAgent/1.0 (agen-uji-yang-tidak-boleh-tercatat)';

let server: Server;
let alamat: string;
let dataDir: string;

function peristiwa(ubah: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    nama: 'kunci_jawaban',
    sesi: '2f1a1d6c-0000-4000-8000-000000000001',
    kasus_id: 'dada-2025-10-08',
    t_ms: 42_000,
    urut: 7,
    isi: {
      soal_id: 's1-kata-bursa',
      kunci: 'b',
      benar: true,
      ms_di_soal: 21_000,
      ms_kartu_terlihat_sebelum: 14_500,
      gulir_balik_ke_kartu: 1,
    },
    ...ubah,
  };
}

async function kirim(badan: string, tambahan: Record<string, string> = {}): Promise<Response> {
  return fetch(`${alamat}/e`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'User-Agent': UA_UJI, ...tambahan },
    body: badan,
  });
}

function berkasHariIni(): string {
  const hari = new Date().toISOString().slice(0, 10);
  return join(dataDir, `peristiwa-${hari}.jsonl`);
}

function barisTertulis(): string[] {
  const berkas = berkasHariIni();
  if (!existsSync(berkas)) return [];
  return readFileSync(berkas, 'utf8').split('\n').filter((b) => b.trim() !== '');
}

beforeAll(async () => {
  dataDir = mkdtempSync(join(tmpdir(), 'runut-kolektor-'));
  server = buatKolektor({ DATA_DIR: dataDir, ASAL_DIIZINKAN: 'http://localhost:5173' }) as Server;
  await new Promise<void>((selesai) => {
    // Port 0 = port acak yang diberikan sistem.
    server.listen(0, '127.0.0.1', selesai);
  });
  const info = server.address() as AddressInfo;
  alamat = `http://127.0.0.1:${String(info.port)}`;
});

afterAll(async () => {
  await new Promise<void>((selesai) => {
    server.close(() => {
      selesai();
    });
  });
  rmSync(dataDir, { recursive: true, force: true });
});

describe('kolektor — jalur sehat', () => {
  it('GET /sehat menjawab 200', async () => {
    const jawaban = await fetch(`${alamat}/sehat`);
    expect(jawaban.status).toBe(200);
    expect((await jawaban.text()).trim()).toBe('sehat');
  });

  it('mendengarkan di loopback, bukan di semua antarmuka', () => {
    const info = server.address() as AddressInfo;
    expect(info.address).toBe('127.0.0.1');
  });
});

describe('kolektor — peristiwa sah', () => {
  it('menjawab 204 dan menulis tepat satu baris', async () => {
    const sebelum = barisTertulis().length;
    const jawaban = await kirim(JSON.stringify(peristiwa()));
    expect(jawaban.status).toBe(204);
    expect(barisTertulis().length).toBe(sebelum + 1);
  });

  it('menerima larik peristiwa sekaligus', async () => {
    const sebelum = barisTertulis().length;
    const jawaban = await kirim(
      JSON.stringify([
        peristiwa({ nama: 'mulai', urut: 1, isi: { lebar_layar: 375 } }),
        peristiwa({ nama: 'layar_masuk', urut: 2, isi: { layar: 'pembuka' } }),
      ]),
    );
    expect(jawaban.status).toBe(204);
    expect(barisTertulis().length).toBe(sebelum + 2);
  });

  it('menambahkan diterima_pada dan mempertahankan isi peristiwa', async () => {
    await kirim(JSON.stringify(peristiwa({ urut: 99 })));
    const baris = barisTertulis().map((b) => JSON.parse(b) as Record<string, unknown>);
    const tercatat = baris.find((b) => b['urut'] === 99);
    expect(tercatat).toBeDefined();
    expect(typeof tercatat?.['diterima_pada']).toBe('string');
    expect(tercatat?.['nama']).toBe('kunci_jawaban');
    expect((tercatat?.['isi'] as Record<string, unknown>)['ms_kartu_terlihat_sebelum']).toBe(14_500);
  });

  it('menerima medan layar akhir yang seluruhnya null', async () => {
    const jawaban = await kirim(
      JSON.stringify(
        peristiwa({
          nama: 'akhir_kirim',
          urut: 30,
          isi: { rating: null, terasa: null, sumber_jawaban: null, teks: null },
        }),
      ),
    );
    expect(jawaban.status).toBe(204);
  });
});

describe('kolektor — INV-9: tidak menulis IP maupun User-Agent', () => {
  it('berkas hasil tidak memuat jejak pengirim', async () => {
    await kirim(JSON.stringify(peristiwa({ urut: 55 })));
    const isi = readFileSync(berkasHariIni(), 'utf8');
    expect(isi).not.toContain(UA_UJI);
    expect(isi).not.toContain('RunutUjiAgent');
    expect(isi).not.toContain('127.0.0.1');
    expect(isi).not.toContain('user-agent');
    expect(isi).not.toContain('User-Agent');
  });

  it('membuang medan tambahan yang diselundupkan kiriman', async () => {
    const jawaban = await kirim(
      JSON.stringify(peristiwa({ urut: 56, alamat_ip: '203.0.113.9' })),
    );
    // Medan di luar bentuk peristiwa ditolak, bukan disimpan diam-diam.
    expect(jawaban.status).toBe(204);
    const isi = readFileSync(berkasHariIni(), 'utf8');
    expect(isi).not.toContain('203.0.113.9');
    expect(isi).not.toContain('alamat_ip');
  });

  it('menolak medan tak dikenal di dalam isi', async () => {
    const sebelum = barisTertulis().length;
    const jawaban = await kirim(
      JSON.stringify(
        peristiwa({ urut: 57, isi: { layar: 'pembuka', jejak_ip: '203.0.113.9' }, nama: 'layar_masuk' }),
      ),
    );
    expect(jawaban.status).toBe(400);
    expect(barisTertulis().length).toBe(sebelum);
  });
});

describe('kolektor — penolakan', () => {
  it('nama peristiwa tak dikenal dijawab 400 dan berkas tidak bertambah', async () => {
    const sebelum = barisTertulis().length;
    const jawaban = await kirim(JSON.stringify(peristiwa({ nama: 'kirim_semua_data' })));
    expect(jawaban.status).toBe(400);
    expect(await jawaban.text()).toContain('kirim_semua_data');
    expect(barisTertulis().length).toBe(sebelum);
  });

  it('medan bertipe salah dijawab 400', async () => {
    const sebelum = barisTertulis().length;
    const jawaban = await kirim(
      JSON.stringify(peristiwa({ isi: { ...(peristiwa()['isi'] as object), benar: 'ya' } })),
    );
    expect(jawaban.status).toBe(400);
    expect(await jawaban.text()).toContain('benar');
    expect(barisTertulis().length).toBe(sebelum);
  });

  it('t_ms bukan angka dijawab 400', async () => {
    const jawaban = await kirim(JSON.stringify(peristiwa({ t_ms: 'lama sekali' })));
    expect(jawaban.status).toBe(400);
  });

  it('sesi yang terlalu panjang dijawab 400', async () => {
    const jawaban = await kirim(JSON.stringify(peristiwa({ sesi: 'x'.repeat(200) })));
    expect(jawaban.status).toBe(400);
  });

  it('teks layar akhir lebih dari 500 karakter dijawab 400', async () => {
    const jawaban = await kirim(
      JSON.stringify(
        peristiwa({
          nama: 'akhir_kirim',
          isi: { rating: 5, terasa: null, sumber_jawaban: null, teks: 'a'.repeat(501) },
        }),
      ),
    );
    expect(jawaban.status).toBe(400);
  });

  it('badan lebih dari 8 KB dijawab 413 dan berkas tidak bertambah', async () => {
    const sebelum = barisTertulis().length;
    const besar = JSON.stringify(
      Array.from({ length: 400 }, (_, nomor) => peristiwa({ urut: nomor + 1 })),
    );
    expect(besar.length).toBeGreaterThan(8 * 1024);
    const jawaban = await kirim(besar);
    expect(jawaban.status).toBe(413);
    expect(barisTertulis().length).toBe(sebelum);
  });

  it('badan yang bukan JSON dijawab 400', async () => {
    const jawaban = await kirim('{ ini bukan json');
    expect(jawaban.status).toBe(400);
  });

  it('jalur lain dijawab 404', async () => {
    expect((await fetch(`${alamat}/`)).status).toBe(404);
    expect((await fetch(`${alamat}/e`)).status).toBe(404);
  });
});

describe('kolektor — CORS hanya untuk asal yang diizinkan', () => {
  it('memberi izin kepada asal yang terdaftar', async () => {
    const jawaban = await kirim(JSON.stringify(peristiwa({ urut: 70 })), {
      Origin: 'http://localhost:5173',
    });
    expect(jawaban.headers.get('access-control-allow-origin')).toBe('http://localhost:5173');
  });

  it('tidak memberi izin kepada asal lain', async () => {
    const jawaban = await kirim(JSON.stringify(peristiwa({ urut: 71 })), {
      Origin: 'https://situs-lain.invalid',
    });
    expect(jawaban.headers.get('access-control-allow-origin')).toBeNull();
  });
});

describe('kolektor — pembatas kasar', () => {
  it('menjawab 429 sesudah melampaui MAKS_PER_MENIT', async () => {
    const dirLain = mkdtempSync(join(tmpdir(), 'runut-batas-'));
    const kecil = buatKolektor({ DATA_DIR: dirLain, MAKS_PER_MENIT: '2' }) as Server;
    await new Promise<void>((selesai) => {
      kecil.listen(0, '127.0.0.1', selesai);
    });
    const port = (kecil.address() as AddressInfo).port;
    const tujuan = `http://127.0.0.1:${String(port)}/e`;
    const badan = JSON.stringify(peristiwa());
    const kirimSatu = (): Promise<Response> =>
      fetch(tujuan, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: badan });

    expect((await kirimSatu()).status).toBe(204);
    expect((await kirimSatu()).status).toBe(204);
    expect((await kirimSatu()).status).toBe(429);

    await new Promise<void>((selesai) => {
      kecil.close(() => {
        selesai();
      });
    });
    rmSync(dirLain, { recursive: true, force: true });
  });
});

describe('kolektor — validator sebagai fungsi murni', () => {
  it('menolak peristiwa yang bukan obyek', () => {
    expect(periksaPeristiwa('halo').galat).toBeDefined();
    expect(periksaPeristiwa(null).galat).toBeDefined();
    expect(periksaPeristiwa([]).galat).toBeDefined();
  });

  it('mengembalikan peristiwa baru yang hanya memuat medan dikenal', () => {
    const hasil = periksaPeristiwa(peristiwa({ tambahan: 'seharusnya hilang' }));
    expect(hasil.galat).toBeUndefined();
    expect(Object.keys(hasil.peristiwa as object).sort()).toEqual([
      'isi',
      'kasus_id',
      'nama',
      'sesi',
      't_ms',
      'urut',
    ]);
  });

  it('menerima ketiga belas nama peristiwa D-6 (termasuk loncat_ke_ringkasan)', () => {
    const contoh: Array<[string, Record<string, unknown>]> = [
      ['mulai', { lebar_layar: 375 }],
      ['layar_masuk', { layar: 'soal-1' }],
      ['kartu_buka', { soal_id: 's1', fact_id: 'susp-2025-06-30' }],
      ['pilih', { soal_id: 's1', kunci: 'b', ganti_ke: 0 }],
      [
        'kunci_jawaban',
        {
          soal_id: 's1',
          kunci: 'b',
          benar: true,
          ms_di_soal: 1,
          ms_kartu_terlihat_sebelum: 0,
          gulir_balik_ke_kartu: 0,
        },
      ],
      ['kembali_ke_kartu', { soal_id: 's1' }],
      ['lihat_balik', { dari_layar: 'soal-3', ke_layar: 'soal-1' }],
      ['pembukaan_masuk', {}],
      ['loncat_ke_ringkasan', { ms_di_pembukaan: 1, gulir_maks_persen: 12 }],
      ['pembukaan_selesai', { ms_di_pembukaan: 1, gulir_maks_persen: 90 }],
      ['minat_kasus_lain', {}],
      ['akhir_kirim', { rating: 4, terasa: 'membaca data', sumber_jawaban: 'kartu fakta', teks: '' }],
      ['tutup', { layar_terakhir: 'akhir' }],
    ];
    expect(contoh).toHaveLength(13);
    for (const [nama, isi] of contoh) {
      const hasil = periksaPeristiwa(peristiwa({ nama, isi }));
      expect(hasil.galat, nama).toBeUndefined();
    }
  });
});

describe('kolektor — loncat_ke_ringkasan (A4-T5)', () => {
  const loncat = (isi: Record<string, unknown>): Record<string, unknown> =>
    peristiwa({ nama: 'loncat_ke_ringkasan', isi });

  it('menerima peristiwanya dan menyimpan kedua medannya', () => {
    const hasil = periksaPeristiwa(loncat({ ms_di_pembukaan: 4_200, gulir_maks_persen: 12 }));
    expect(hasil.galat).toBeUndefined();
    expect((hasil.peristiwa as { isi: Record<string, unknown> }).isi).toEqual({
      ms_di_pembukaan: 4_200,
      gulir_maks_persen: 12,
    });
  });

  it('menolak medan yang tidak dikenal, seperti peristiwa lain', () => {
    // Pengumpul tidak membuang medan asing diam-diam; ia menolak seluruh
    // peristiwanya dan menyebut medan mana yang salah.
    const hasil = periksaPeristiwa(
      loncat({ ms_di_pembukaan: 1, gulir_maks_persen: 2, ke_mana: 'judul-bacaan' }),
    );
    expect(hasil.galat).toContain('ke_mana');
    expect(hasil.galat).toContain('loncat_ke_ringkasan');
  });

  it('menolak kalau medannya bukan angka', () => {
    expect(periksaPeristiwa(loncat({ ms_di_pembukaan: 'lama', gulir_maks_persen: 2 })).galat)
      .toBeDefined();
  });

  it('tetap menolak nama di luar daftar tertutup', () => {
    expect(periksaPeristiwa(peristiwa({ nama: 'loncat', isi: {} })).galat).toBeDefined();
    expect(periksaPeristiwa(peristiwa({ nama: 'loncat_ke_ringkasan_2', isi: {} })).galat)
      .toBeDefined();
  });

  it('benar-benar tertulis ke berkas lewat server sungguhan', async () => {
    const balas = await kirim(
      JSON.stringify([loncat({ ms_di_pembukaan: 9_000, gulir_maks_persen: 7 })]),
    );
    expect(balas.status).toBe(204);
    const berkas = berkasHariIni();
    expect(existsSync(berkas)).toBe(true);
    const baris = readFileSync(berkas, 'utf8')
      .trim()
      .split('\n')
      .map((b) => JSON.parse(b) as { nama: string; isi: Record<string, unknown> });
    const tercatat = baris.filter((b) => b.nama === 'loncat_ke_ringkasan');
    expect(tercatat).toHaveLength(1);
    expect(tercatat[0]?.isi).toEqual({ ms_di_pembukaan: 9_000, gulir_maks_persen: 7 });
  });
});
