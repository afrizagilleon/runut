import { mkdtempSync, readFileSync, existsSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import type { AddressInfo } from 'node:net';
import type { Server } from 'node:http';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
// @ts-expect-error — pengumpul sengaja JavaScript bawaan Node, tanpa langkah build.
import { HOST_BAWAAN, buatKolektor, periksaPeristiwa } from './kolektor.mjs';

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

/**
 * Isi peristiwa `mulai` yang lengkap menurut M3.2 (D-9, D-13).
 *
 * Ketiga medan baru wajib ada walau nilainya null: medan yang kadang hilang
 * membuat "tidak ada penanda" tidak bisa dibedakan dari "kiriman yang cacat".
 */
const MULAI_ISI = {
  lebar_layar: 375,
  penanda: null,
  pengunjung: null,
  kunjungan_ke: null,
};

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

  it('bawaannya sendiri loopback, bukan hanya di tes ini (INV-9)', () => {
    // Tes di atas memeriksa `listen()` yang ditulis tes ini sendiri. Yang
    // menentukan di produksi adalah bawaan pengumpul, dan itulah yang diperiksa
    // di sini — ditemukan sebagai lubang lewat sabotase T-08/9.
    expect(HOST_BAWAAN).toBe('127.0.0.1');
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
        peristiwa({ nama: 'mulai', urut: 1, isi: MULAI_ISI }),
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

  it('menerima keenam belas nama peristiwa D-6 (termasuk pelacak M3.2)', () => {
    const contoh: Array<[string, Record<string, unknown>]> = [
      ['mulai', MULAI_ISI],
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
      ['ketuk', { layar: 'soal-1', uid: 'opsi:b', x: 0.5, y: 0.25, mati: false }],
      ['ketuk_dibatasi', { layar: 'soal-2', batas: 300 }],
      ['gulir', { layar: 'soal-1', maks: 0.62 }],
      ['minat_kasus_lain', {}],
      ['akhir_kirim', { rating: 4, terasa: 'membaca data', sumber_jawaban: 'kartu fakta', teks: '' }],
      ['tutup', { layar_terakhir: 'akhir' }],
    ];
    expect(contoh).toHaveLength(16);
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

/* ------------------------------------------------------------------ */
/* Pelacak, penanda, nomor pengunjung (RQ-06, M3.2/T-08)              */
/* ------------------------------------------------------------------ */

const UUID_SAH = '7001fc29-39a8-4ec8-a615-03cea28ad892';

const ketuk = (isi: Record<string, unknown>): Record<string, unknown> =>
  peristiwa({ nama: 'ketuk', isi });

const mulai = (isi: Record<string, unknown>): Record<string, unknown> =>
  peristiwa({ nama: 'mulai', isi: { ...MULAI_ISI, ...isi } });

describe('kolektor — peristiwa ketuk (D-8)', () => {
  it('menerima ketukan hidup maupun mati dan menyimpan kelima medannya', () => {
    const hasil = periksaPeristiwa(
      ketuk({ layar: 'soal-1', uid: 'lembar:har-2025-10-08', x: 0.482, y: 0.771, mati: true }),
    );
    expect(hasil.galat).toBeUndefined();
    expect((hasil.peristiwa as { isi: Record<string, unknown> }).isi).toEqual({
      layar: 'soal-1',
      uid: 'lembar:har-2025-10-08',
      x: 0.482,
      y: 0.771,
      mati: true,
    });
  });

  it('menerima uid null — ketukan di ruang kosong tetap data', () => {
    expect(
      periksaPeristiwa(ketuk({ layar: 'pembuka', uid: null, x: 0, y: 0, mati: true })).galat,
    ).toBeUndefined();
  });

  it('menolak x atau y di luar 0–1', () => {
    for (const [x, y] of [
      [1.0001, 0.5],
      [-0.001, 0.5],
      [0.5, 2],
      [0.5, -1],
      [375, 812],
    ]) {
      const hasil = periksaPeristiwa(ketuk({ layar: 'soal-1', uid: 'pesan', x, y, mati: true }));
      expect(hasil.galat, `${String(x)},${String(y)}`).toBeDefined();
    }
    // Kedua ujungnya sendiri sah.
    expect(
      periksaPeristiwa(ketuk({ layar: 'soal-1', uid: 'pesan', x: 0, y: 1, mati: true })).galat,
    ).toBeUndefined();
  });

  it('menolak uid lebih dari 64 karakter', () => {
    const batas = 'a'.repeat(64);
    expect(
      periksaPeristiwa(ketuk({ layar: 'soal-1', uid: batas, x: 0.5, y: 0.5, mati: true })).galat,
    ).toBeUndefined();
    const hasil = periksaPeristiwa(
      ketuk({ layar: 'soal-1', uid: `${batas}a`, x: 0.5, y: 0.5, mati: true }),
    );
    expect(hasil.galat).toContain('uid');
  });

  it('menolak medan asing, termasuk yang berbau isi elemen', () => {
    const hasil = periksaPeristiwa(
      ketuk({ layar: 'soal-1', uid: 'pesan', x: 0.5, y: 0.5, mati: true, teks: 'Gila, saham D' }),
    );
    expect(hasil.galat).toContain('teks');
  });

  it('menolak mati yang bukan boolean', () => {
    expect(
      periksaPeristiwa(ketuk({ layar: 'soal-1', uid: 'pesan', x: 0.5, y: 0.5, mati: 'ya' })).galat,
    ).toBeDefined();
  });

  it('ketuk_dibatasi dan gulir diterima dengan bentuknya sendiri', () => {
    expect(
      periksaPeristiwa(peristiwa({ nama: 'ketuk_dibatasi', isi: { layar: 'soal-2', batas: 300 } }))
        .galat,
    ).toBeUndefined();
    expect(
      periksaPeristiwa(peristiwa({ nama: 'gulir', isi: { layar: 'soal-3', maks: 1 } })).galat,
    ).toBeUndefined();
    // `maks` juga rasio: 62 persen ditulis 62 adalah cacat, bukan kedalaman.
    expect(
      periksaPeristiwa(peristiwa({ nama: 'gulir', isi: { layar: 'soal-3', maks: 62 } })).galat,
    ).toBeDefined();
  });
});

describe('kolektor — penanda tautan (D-9)', () => {
  it('menerima kode yang sah', () => {
    for (const kode of ['afriza', 'uji', 'a', '12345678', 'wa1']) {
      expect(periksaPeristiwa(mulai({ penanda: kode })).galat, kode).toBeUndefined();
    }
  });

  it('menolak kode yang tidak sah', () => {
    for (const kode of ['123456789', 'AFRIZA', 'af riza', '', 'a-b', 'kode.']) {
      expect(periksaPeristiwa(mulai({ penanda: kode })).galat, kode).toBeDefined();
    }
  });

  it('menolak penanda yang bukan teks', () => {
    expect(periksaPeristiwa(mulai({ penanda: 7 })).galat).toBeDefined();
  });
});

describe('kolektor — nomor pengunjung (D-13)', () => {
  it('menerima UUID v4 beserta hitungan kunjungannya', () => {
    const hasil = periksaPeristiwa(mulai({ pengunjung: UUID_SAH, kunjungan_ke: 3 }));
    expect(hasil.galat).toBeUndefined();
    expect((hasil.peristiwa as { isi: Record<string, unknown> }).isi).toEqual({
      lebar_layar: 375,
      penanda: null,
      pengunjung: UUID_SAH,
      kunjungan_ke: 3,
    });
  });

  it('menolak pengunjung yang bukan UUID v4', () => {
    for (const salah of [
      '7001fc29-39a8-3ec8-a615-03cea28ad892', // versi 3
      '7001fc29-39a8-4ec8-c615-03cea28ad892', // varian salah
      '7001FC29-39A8-4EC8-A615-03CEA28AD892', // huruf besar
      'bukan-uuid',
      '',
    ]) {
      expect(periksaPeristiwa(mulai({ pengunjung: salah })).galat, salah).toBeDefined();
    }
  });

  it('menolak kunjungan_ke di luar 1–9999, termasuk pecahan', () => {
    for (const salah of [0, -1, 10_000, 1.5, '3']) {
      expect(
        periksaPeristiwa(mulai({ pengunjung: UUID_SAH, kunjungan_ke: salah })).galat,
        String(salah),
      ).toBeDefined();
    }
    for (const sah of [1, 9999]) {
      expect(
        periksaPeristiwa(mulai({ pengunjung: UUID_SAH, kunjungan_ke: sah })).galat,
        String(sah),
      ).toBeUndefined();
    }
  });

  it('medan baru wajib ada, walau isinya null', () => {
    // Kiriman gaya lama (hanya lebar_layar) ditolak: "tidak ada penanda" harus
    // bisa dibedakan dari "medannya hilang di jalan".
    const hasil = periksaPeristiwa(peristiwa({ nama: 'mulai', isi: { lebar_layar: 375 } }));
    expect(hasil.galat).toBeDefined();
  });
});

describe('kolektor — pelacak lewat server sungguhan (RQ-06)', () => {
  it('menulis ketuk, gulir, dan mulai ber-penanda apa adanya', async () => {
    const balas = await kirim(
      JSON.stringify([
        peristiwa({
          nama: 'mulai',
          urut: 201,
          isi: { ...MULAI_ISI, penanda: 'uji', pengunjung: UUID_SAH, kunjungan_ke: 2 },
        }),
        peristiwa({
          nama: 'ketuk',
          urut: 202,
          isi: { layar: 'soal-1', uid: 'lembar:susp-2025-06-30', x: 0.31, y: 0.44, mati: true },
        }),
        peristiwa({ nama: 'gulir', urut: 203, isi: { layar: 'soal-1', maks: 0.87 } }),
      ]),
    );
    expect(balas.status).toBe(204);

    const baris = barisTertulis().map((b) => JSON.parse(b) as {
      urut: number;
      nama: string;
      isi: Record<string, unknown>;
    });
    const tercatat = baris.filter((b) => b.urut >= 201 && b.urut <= 203);
    expect(tercatat.map((b) => b.nama)).toEqual(['mulai', 'ketuk', 'gulir']);
    expect(tercatat[0]?.isi).toEqual({
      lebar_layar: 375,
      penanda: 'uji',
      pengunjung: UUID_SAH,
      kunjungan_ke: 2,
    });
    expect(tercatat[1]?.isi['mati']).toBe(true);
    expect(tercatat[2]?.isi['maks']).toBe(0.87);
  });

  it('satu ketukan cacat menolak seluruh kiriman, tanpa menulis sebagiannya', async () => {
    const sebelum = barisTertulis().length;
    const balas = await kirim(
      JSON.stringify([
        peristiwa({
          nama: 'ketuk',
          urut: 210,
          isi: { layar: 'soal-1', uid: 'pesan', x: 0.5, y: 0.5, mati: false },
        }),
        peristiwa({
          nama: 'ketuk',
          urut: 211,
          isi: { layar: 'soal-1', uid: 'pesan', x: 188, y: 400, mati: false },
        }),
      ]),
    );
    expect(balas.status).toBe(400);
    expect(await balas.text()).toContain('x');
    expect(barisTertulis().length).toBe(sebelum);
  });

  it('masih loopback dan masih tanpa IP maupun User-Agent', async () => {
    await kirim(
      JSON.stringify(
        peristiwa({
          nama: 'ketuk',
          urut: 220,
          isi: { layar: 'akhir', uid: null, x: 0.5, y: 0.5, mati: true },
        }),
      ),
    );
    const info = server.address() as AddressInfo;
    expect(info.address).toBe('127.0.0.1');
    const isi = readFileSync(berkasHariIni(), 'utf8');
    expect(isi).not.toContain(UA_UJI);
    expect(isi).not.toContain('127.0.0.1');
    expect(isi.toLowerCase()).not.toContain('user-agent');
  });
});
