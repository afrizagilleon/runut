import { mkdtempSync, readFileSync, existsSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import type { AddressInfo } from 'node:net';
import type { Server } from 'node:http';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
// @ts-expect-error — pengumpul sengaja JavaScript bawaan Node, tanpa langkah build.
import { HOST_BAWAAN, SKEMA, buatKolektor, periksaPeristiwa } from './kolektor.mjs';
/*
 * M3.4a D-2. Yang diimpor di sini adalah **tes**, bukan pengumpul: aturan
 * "pengumpul tidak boleh mengimpor apa pun dari aplikasi" tetap utuh
 * (`server/kolektor.mjs` tidak disentuh sama sekali di milestone ini). Yang
 * diperlukan tes adalah justru menyatukan keduanya di satu tempat, supaya
 * keluaran reducer yang sesungguhnya diadu dengan validator yang sesungguhnya.
 */
import { type Aksi, NAMA_PERISTIWA, keadaanAwal, langkah } from '../web/src/alur.ts';

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
    // Baris PERTAMA tetap `sehat` kata demi kata: deploy/README.md
    // menjanjikannya, dan nomor versi (M3.7) datang di baris berikutnya.
    expect((await jawaban.text()).split('\n')[0]).toBe('sehat');
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

  it('menerima ketujuh belas nama peristiwa D-6 (pelacak M3.2 + istilah_buka A-2)', () => {
    const contoh: Array<[string, Record<string, unknown>]> = [
      ['mulai', MULAI_ISI],
      ['layar_masuk', { layar: 'soal-1' }],
      ['kartu_buka', { soal_id: 's1', fact_id: 'susp-2025-06-30' }],
      ['istilah_buka', { soal_id: 's1' }],
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
    expect(contoh).toHaveLength(17);
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

/* ------------------------------------------------------------------ */
/* M3.4a D-2 — ketiga jenis `gulir` lewat pengumpul SUNGGUHAN          */
/* ------------------------------------------------------------------ */

/**
 * Peristiwa `gulir` sekarang punya tiga asal: ambang 50 %, ambang 100 %, dan
 * yang lahir saat meninggalkan layar. Ketiganya memakai bentuk yang **sama**,
 * dan itu bukan kebetulan: `server/kolektor.mjs` memvalidasi daftar tertutup
 * `gulir: { layar, maks }` dan **tidak ikut di-deploy** bersama perubahan ini.
 * Satu medan baru atau satu nama baru berarti seluruh kelompok peristiwa ditolak
 * 400 dan data pemain hilang diam-diam — kegagalan yang tidak akan terlihat di
 * gate mana pun. Karena itu yang diuji di sini adalah **pengumpul yang
 * sesungguhnya**, bukan tiruan, dengan keluaran **reducer yang sesungguhnya**.
 */
describe('kolektor — gulir bertingkat M3.4a (D-2)', () => {
  const gulir = (urut: number, isi: Record<string, unknown>): Record<string, unknown> =>
    peristiwa({ nama: 'gulir', urut, isi });

  it('menerima ketiga jenis gulir dengan 204 dan menulisnya apa adanya', async () => {
    const balas = await kirim(
      JSON.stringify([
        gulir(301, { layar: 'soal-1', maks: 0.5 }), // ambang 50 %
        gulir(302, { layar: 'soal-1', maks: 1 }), // ambang 100 %
        gulir(303, { layar: 'soal-1', maks: 0.87 }), // meninggalkan layar
      ]),
    );
    expect(balas.status).toBe(204);

    const baris = barisTertulis().map(
      (b) => JSON.parse(b) as { urut: number; nama: string; isi: Record<string, unknown> },
    );
    const tercatat = baris.filter((b) => b.urut >= 301 && b.urut <= 303);
    expect(tercatat.map((b) => b.nama)).toEqual(['gulir', 'gulir', 'gulir']);
    expect(tercatat.map((b) => b.isi['maks'])).toEqual([0.5, 1, 0.87]);
    for (const b of tercatat) expect(Object.keys(b.isi).sort()).toEqual(['layar', 'maks']);
  });

  it('SEMUA keluaran reducer yang sungguhan lolos validator yang sungguhan', () => {
    /*
     * Jalur permainan yang melewati kedua ambang di beberapa layar, memakai
     * `langkah()` dari `web/src/alur.ts` — bukan muatan yang diketik ulang di
     * tes ini. Peristiwa yang diketik ulang hanya membuktikan bahwa tesnya
     * setuju dengan dirinya sendiri.
     */
    const aksi: Aksi[] = [
      { jenis: 'mulai', lebar_layar: 360 },
      { jenis: 'catat_gulir', persen: 100 }, // pembuka muat sejendela
      { jenis: 'lanjut' },
      { jenis: 'catat_gulir', persen: 55 },
      { jenis: 'catat_gulir', persen: 100 },
      { jenis: 'pilih', soal_id: 's1', kunci: 'b' },
      { jenis: 'kunci_jawaban', soal_id: 's1' },
      { jenis: 'lanjut' },
      { jenis: 'catat_gulir', persen: 70 },
      { jenis: 'tutup' },
    ];
    let keadaan = keadaanAwal({
      sesi: '2f1a1d6c-0000-4000-8000-000000000009',
      kasus_id: 'dada-2025-10-08',
      urutanSoal: ['s1', 's2', 's3'],
      kunciBenar: { s1: 'b', s2: 'a', s3: 'c' },
      kartuSoal: { s1: ['k1'], s2: ['k2'], s3: ['k3'] },
    });
    const semua: Array<{ nama: string; isi: Record<string, unknown> }> = [];
    let waktu = 1_000;
    for (const a of aksi) {
      waktu += 250;
      const hasil = langkah(keadaan, a, waktu);
      keadaan = hasil.keadaan;
      semua.push(...hasil.peristiwa);
    }

    // Jalur ini memang melewati ambang; kalau tidak, tes di bawah tidak menguji apa-apa.
    const semuaGulir = semua.filter((p) => p.nama === 'gulir');
    expect(semuaGulir.filter((p) => p.isi['maks'] === 0.5).length).toBeGreaterThanOrEqual(2);
    expect(semuaGulir.filter((p) => p.isi['maks'] === 1).length).toBeGreaterThanOrEqual(2);

    for (const p of semua) {
      const hasil = periksaPeristiwa(p) as { galat?: string };
      expect(hasil.galat, `${p.nama} ${JSON.stringify(p.isi)}`).toBeUndefined();
    }
  });

  it('kalau saja ada medan baru, pengumpul menolak 400 — dan data itu hilang', async () => {
    /*
     * Inilah kegagalan yang dijaga D-2, ditulis sebagai tes supaya ia tidak
     * hanya menjadi kalimat di kontrak: peristiwa yang sama persis, ditambah
     * satu medan `ambang`, ditolak — bersama SELURUH kelompoknya.
     */
    const sebelum = barisTertulis().length;
    const balas = await kirim(
      JSON.stringify([
        gulir(310, { layar: 'soal-1', maks: 0.5, ambang: true }),
        gulir(311, { layar: 'soal-1', maks: 0.9 }),
      ]),
    );
    expect(balas.status).toBe(400);
    expect(await balas.text()).toContain('ambang');
    // Tidak sebagian: peristiwa kedua yang sah pun tidak tertulis.
    expect(barisTertulis().length).toBe(sebelum);
  });

  it('nama peristiwa baru untuk ambang juga akan ditolak', async () => {
    const balas = await kirim(
      JSON.stringify([peristiwa({ nama: 'gulir_ambang', urut: 320, isi: { layar: 'soal-1', maks: 0.5 } })]),
    );
    expect(balas.status).toBe(400);
    expect(await balas.text()).toContain('daftar tertutup');
  });

  it('daftar nama peristiwa reducer masih sama persis dengan yang dikenal pengumpul', () => {
    /*
     * Penjaga langsung untuk "TANPA nama peristiwa baru". Kalau reducer
     * menambah satu nama, tes ini merah di repo — jauh sebelum server alpha
     * yang belum diperbarui menolaknya diam-diam.
     */
    const dikenalPengumpul = [...NAMA_PERISTIWA]
      .filter((n) => (periksaPeristiwa({ nama: n }) as { galat?: string }).galat !== `nama peristiwa "${n}" tidak ada di daftar tertutup`)
      .sort();
    expect(dikenalPengumpul).toEqual([...NAMA_PERISTIWA].sort());
    /*
     * Angka yang dibekukan: 17 nama sampai M3.6, **18** sejak M3.7 — kontrak
     * M3.7 mengizinkan tepat satu nama baru (`balon`) dan reviewer memasang
     * pengumpulnya di server sebelum web di-deploy. Yang ke-19 harus merah.
     */
    expect(NAMA_PERISTIWA).toHaveLength(18);
    expect([...NAMA_PERISTIWA]).toContain('balon');
  });

  it('maks di luar 0–1 tetap ditolak, jadi 50 dan 100 harus rasio', () => {
    expect(
      (periksaPeristiwa(peristiwa({ nama: 'gulir', isi: { layar: 'soal-1', maks: 50 } })) as {
        galat?: string;
      }).galat,
    ).toBeDefined();
    expect(
      (periksaPeristiwa(peristiwa({ nama: 'gulir', isi: { layar: 'soal-1', maks: 0.5 } })) as {
        galat?: string;
      }).galat,
    ).toBeUndefined();
  });
});

/* ------------------------------------------------------------------ */
/* Balon chat melayang (M3.7 D-3)                                      */
/* ------------------------------------------------------------------ */

describe('kolektor — peristiwa balon (M3.7 D-3)', () => {
  const balon = (urut: number, isi: Record<string, unknown>): Record<string, unknown> =>
    peristiwa({ nama: 'balon', urut, isi });

  it('menerima keempat gabungan yang sah dan menulisnya apa adanya', async () => {
    const balas = await kirim(
      JSON.stringify([
        balon(401, { layar: 'soal-1', keadaan: 'turun', cara: 'ketuk' }),
        balon(402, { layar: 'soal-1', keadaan: 'intip', cara: 'ketuk' }),
        balon(403, { layar: 'soal-2', keadaan: 'turun', cara: 'tarik' }),
        balon(404, { layar: 'soal-2', keadaan: 'intip', cara: 'tarik' }),
      ]),
    );
    expect(balas.status).toBe(204);

    const baris = barisTertulis().map(
      (b) => JSON.parse(b) as { urut: number; nama: string; isi: Record<string, unknown> },
    );
    const tercatat = baris.filter((b) => b.urut >= 401 && b.urut <= 404);
    expect(tercatat).toHaveLength(4);
    for (const b of tercatat) {
      expect(b.nama).toBe('balon');
      expect(Object.keys(b.isi).sort()).toEqual(['cara', 'keadaan', 'layar']);
    }
    expect(tercatat.map((b) => b.isi['keadaan'])).toEqual(['turun', 'intip', 'turun', 'intip']);
    expect(tercatat.map((b) => b.isi['cara'])).toEqual(['ketuk', 'ketuk', 'tarik', 'tarik']);
  });

  /*
   * Validasi ketat, bukan "teks apa pun" (D-3).
   *
   * Medan enum yang diterima apa adanya adalah medan teks bebas yang menyamar:
   * ia lolos sebagai kolom di ringkasan, lalu diam-diam menambah kategori yang
   * tidak pernah ada di produk — dan yang membacanya akan mengira produknya
   * memang punya keadaan ketiga. Yang lebih buruk: ia jalan masuk bagi teks
   * kiriman sembarang ke berkas yang dijanjikan hanya memuat nama yang kita
   * tulis sendiri (INV-9).
   */
  it('menolak nilai di luar daftar, untuk keadaan maupun cara', async () => {
    const sebelum = barisTertulis().length;
    for (const isi of [
      { layar: 'soal-1', keadaan: 'melompat', cara: 'ketuk' },
      { layar: 'soal-1', keadaan: 'TURUN', cara: 'ketuk' },
      { layar: 'soal-1', keadaan: 'turun', cara: 'geser' },
      { layar: 'soal-1', keadaan: 'turun', cara: 'Ketuk' },
      { layar: 'soal-1', keadaan: 'turun', cara: '' },
      { layar: 'soal-1', keadaan: 3, cara: 'ketuk' },
      { layar: 'soal-1', keadaan: true, cara: 'ketuk' },
    ]) {
      const balas = await kirim(JSON.stringify([balon(420, isi)]));
      expect(balas.status, JSON.stringify(isi)).toBe(400);
      expect(await balas.text()).toContain('tidak sah');
    }
    expect(barisTertulis().length).toBe(sebelum);
  });

  it('menolak medan yang hilang dan medan yang tidak dikenal', async () => {
    const kurang = await kirim(JSON.stringify([balon(430, { layar: 'soal-1', keadaan: 'turun' })]));
    expect(kurang.status).toBe(400);
    const lebih = await kirim(
      JSON.stringify([
        balon(431, { layar: 'soal-1', keadaan: 'turun', cara: 'ketuk', piksel: 128 }),
      ]),
    );
    expect(lebih.status).toBe(400);
    expect(await lebih.text()).toContain('piksel');
  });

  it('nilai null tidak sah: ketiga medannya wajib berisi', () => {
    for (const medan of ['layar', 'keadaan', 'cara']) {
      const isi: Record<string, unknown> = {
        layar: 'soal-1',
        keadaan: 'turun',
        cara: 'ketuk',
      };
      isi[medan] = null;
      expect(
        (periksaPeristiwa(peristiwa({ nama: 'balon', isi })) as { galat?: string }).galat,
        medan,
      ).toBeDefined();
    }
  });

  it('SEMUA keluaran reducer yang sungguhan lolos validator yang sungguhan', () => {
    const aksi: Aksi[] = [
      { jenis: 'mulai', lebar_layar: 360 },
      { jenis: 'lanjut' },
      { jenis: 'balon_melayang', layar: 'soal-1', melayang: true },
      { jenis: 'sakelar_balon', layar: 'soal-1', keadaan: 'turun', cara: 'ketuk' },
      { jenis: 'sakelar_balon', layar: 'soal-1', keadaan: 'intip', cara: 'tarik' },
      { jenis: 'sakelar_balon', layar: 'soal-1', keadaan: 'turun', cara: 'tarik' },
      { jenis: 'pilih', soal_id: 's1', kunci: 'b' },
      { jenis: 'kunci_jawaban', soal_id: 's1' },
      { jenis: 'lanjut' },
      { jenis: 'sakelar_balon', layar: 'soal-2', keadaan: 'turun', cara: 'ketuk' },
      { jenis: 'tutup' },
    ];
    let keadaan = keadaanAwal({
      sesi: '2f1a1d6c-0000-4000-8000-000000000010',
      kasus_id: 'dada-2025-10-08',
      urutanSoal: ['s1', 's2', 's3'],
      kunciBenar: { s1: 'b', s2: 'a', s3: 'c' },
      kartuSoal: { s1: ['k1'], s2: ['k2'], s3: ['k3'] },
    });
    const semua: Array<{ nama: string; isi: Record<string, unknown> }> = [];
    let waktu = 1_000;
    for (const a of aksi) {
      waktu += 250;
      const hasil = langkah(keadaan, a, waktu);
      keadaan = hasil.keadaan;
      semua.push(...hasil.peristiwa);
    }

    // Jalur ini memang melahirkan balon; kalau tidak, tes ini tidak menguji apa-apa.
    expect(semua.filter((p) => p.nama === 'balon')).toHaveLength(4);

    for (const p of semua) {
      const hasil = periksaPeristiwa(p) as { galat?: string };
      expect(hasil.galat, `${p.nama} ${JSON.stringify(p.isi)}`).toBeUndefined();
    }
  });
});

describe('kolektor — versi skema (M3.7 D-3)', () => {
  /*
   * Kenapa pengumpul punya nomor versi sejak sekarang.
   *
   * Pengumpul di server sungguhan TIDAK ikut di-deploy bersama web, dan daftar
   * peristiwanya tertutup: satu nama yang belum dikenal membuatnya menjawab 400
   * untuk SELURUH kelompok, sehingga peristiwa lain di kelompok itu ikut
   * hilang. Sampai M3.6 satu-satunya cara mengetahui versi yang terpasang
   * adalah membaca berkasnya di server. Sekarang ia mengatakannya sendiri di
   * `/sehat`, jadi pemasangan bisa **diperiksa** sebelum web dikirim.
   */
  it('`/sehat` menyebut nomor versinya', async () => {
    const jawaban = await fetch(`${alamat}/sehat`);
    expect(jawaban.status).toBe(200);
    const teks = await jawaban.text();
    expect(teks.split('\n')[0]).toBe('sehat');
    expect(teks).toContain(`skema=${String(SKEMA)}`);
  });

  it('versinya 2 sejak `balon` masuk daftar', () => {
    expect(SKEMA).toBe(2);
  });
});
