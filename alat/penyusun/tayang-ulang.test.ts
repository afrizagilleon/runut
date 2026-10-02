/**
 * M2d-12 T-01: mode tayang ulang (D-1).
 *
 * Kesetiaan: isi `data:` setiap `event: tahap` yang dikirim server = baris
 * `aliran.jsonl` byte demi byte, urutan sama. Sabotase: satu angka diubah di
 * salinan log → pembanding melaporkan baris itu (tes ini tidak hampa).
 */
import { cpSync, mkdtempSync, readFileSync, readdirSync, statSync, writeFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { afterEach, describe, expect, it } from 'vitest';
import { akarSementara, bacaSse, minta, mulaiServer, type ServerUji } from './bantu-uji.ts';
import { uraiArgumen } from './server.ts';
import { bacaRekaman, bandingkanRekaman, barisLog, dataTahapSse, jadwalTayang, JamVirtual, RUMUS_JEDA, type JamTayang } from './tayang-ulang.ts';

const AKAR = fileURLToPath(new URL('../../', import.meta.url));
const LOG_ASLI = (id: string): string => join(AKAR, 'eval', 'penyusun', id);

function jamInstan(): JamTayang {
  return { sekarang: () => 0, tunggu: () => Promise.resolve() };
}

/** Salin folder jalan ke folder sementara (eval/ tidak pernah disentuh). */
function salinJalan(id: string): string {
  const induk = mkdtempSync(join(tmpdir(), 'penyusun-tayang-'));
  const tujuan = join(induk, id);
  cpSync(LOG_ASLI(id), tujuan, { recursive: true });
  return tujuan;
}

function sidikFolder(folder: string): string {
  const h = createHash('sha256');
  for (const n of readdirSync(folder).sort()) {
    const j = join(folder, n);
    if (statSync(j).isFile()) h.update(n).update(readFileSync(j));
  }
  return h.digest('hex');
}

let s: ServerUji | null = null;
afterEach(async () => {
  await s?.tutup();
  s = null;
});

async function mulaiTayang(folder: string, jam: JamTayang = jamInstan()): Promise<ServerUji> {
  return mulaiServer({ akar: akarSementara(), tayangUlang: { folder, jam } });
}

describe('rumus jeda (tertulis, dites)', () => {
  const p = (no: number, detik: number, tahap = 'agen'): { no: number; waktu: string; tahap: 'agen' } =>
    ({ no, waktu: new Date(Date.UTC(2026, 9, 2, 11, 0, 0) + detik * 1000).toISOString(), tahap: tahap as 'agen' });

  it('putar = min(BATAS, max(MIN, asli / PEMBAGI)); sesudah perkiraan ≥ JEDA_PERSETUJUAN', () => {
    const j = jadwalTayang([p(1, 0, 'data'), p(2, 0), p(3, 6), p(4, 66.7), p(5, 66.7 + 212, 'perkiraan'), p(6, 66.7 + 212)]);
    expect(j.map((x) => x.putar_ms)).toEqual([RUMUS_JEDA.JEDA_AWAL_MS, 700, 700, 1800, 1800, 3500]);
    expect(j.map((x) => x.asli_ms)).toEqual([null, 0, 6000, 60700, 212000, 0]);
    expect(j.map((x) => x.jenis)).toEqual(['sama', 'diperlambat', 'dipercepat', 'dipercepat', 'dipercepat', 'diperlambat']);
    expect(j[3]?.faktor).toBe(34);
    expect(j[4]?.faktor).toBe(118);
    expect(j[2]?.faktor).toBe(9);
    expect(j.at(-1)?.pada_ms).toBe(1500 + 700 + 700 + 1800 + 1800 + 3500);
  });

  it('kedua jalan yang direkam muat ≤ 70 d tayang (sisa untuk hasil, total video ≤ 90 d)', () => {
    for (const id of ['m2d11-tirt-7', 'm2d10-tirt-a2']) {
      const r = bacaRekaman(LOG_ASLI(id));
      expect(r.jadwal.at(-1)?.pada_ms ?? Infinity).toBeLessThanOrEqual(70_000);
      // jeda menunggu model yang panjang memang dipadatkan dan diumumkan
      expect(r.jadwal.some((x) => x.jenis === 'dipercepat' && (x.faktor ?? 0) >= 10)).toBe(true);
    }
  });
});

describe('kesetiaan: yang dikirim = isi berkas', () => {
  for (const id of ['m2d11-tirt-7', 'm2d10-tirt-a2']) {
    it(`${id}: setiap event tahap = baris log apa adanya, urutan sama`, async () => {
      const folder = salinJalan(id);
      s = await mulaiTayang(folder);
      const r = await bacaSse(s.port, `/api/jalan/${id}/aliran`);
      expect(r.status).toBe(200);
      const asli = barisLog(readFileSync(join(LOG_ASLI(id), 'aliran.jsonl'), 'utf8'));
      const dikirim = dataTahapSse(r.teks);
      expect(dikirim.length).toBe(asli.length);
      expect(bandingkanRekaman(asli, dikirim)).toEqual([]);
      expect(dikirim).toEqual(asli);
    });
  }

  it('sabotase: satu angka diubah di salinan log → pembanding menunjuk baris itu', async () => {
    const id = 'm2d11-tirt-7';
    const folder = salinJalan(id);
    const jalur = join(folder, 'aliran.jsonl');
    const baris = readFileSync(jalur, 'utf8').split('\n');
    expect(baris[9]).toContain('"panggilan":25');
    baris[9] = (baris[9] ?? '').replace('"panggilan":25', '"panggilan":26');
    writeFileSync(jalur, baris.join('\n'), 'utf8');
    s = await mulaiTayang(folder);
    const r = await bacaSse(s.port, `/api/jalan/${id}/aliran`);
    const asli = barisLog(readFileSync(join(LOG_ASLI(id), 'aliran.jsonl'), 'utf8'));
    expect(bandingkanRekaman(asli, dataTahapSse(r.teks))).toEqual(['baris 10 berbeda']);
  });

  it('jeda diumumkan lewat event tayang terpisah (bukan di dalam peristiwa)', async () => {
    const id = 'm2d11-tirt-7';
    s = await mulaiTayang(salinJalan(id));
    const r = await bacaSse(s.port, `/api/jalan/${id}/aliran`);
    const tayang = r.teks
      .split('\n\n')
      .filter((b) => b.includes('event: tayang'))
      .map((b) => JSON.parse(b.split('\n').find((l) => l.startsWith('data: '))?.slice(6) ?? '{}') as { menuju: number; jenis: string; faktor: number | null });
    expect(tayang.length).toBe(47);
    // jeda 66,7 d sebelum peristiwa 19 (pembaca kartu) → dipercepat ×37
    expect(tayang.find((t) => t.menuju === 19)).toMatchObject({ jenis: 'dipercepat', faktor: 37 });
  });

  it('sambung ulang dengan Last-Event-ID melanjutkan sesudah nomor itu', async () => {
    const id = 'm2d10-tirt-a2';
    s = await mulaiTayang(salinJalan(id));
    const r = await bacaSse(s.port, `/api/jalan/${id}/aliran`, { 'Last-Event-ID': '40' });
    const asli = barisLog(readFileSync(join(LOG_ASLI(id), 'aliran.jsonl'), 'utf8'));
    expect(dataTahapSse(r.teks)).toEqual(asli.slice(40));
  });
});

describe('jam virtual (perekam bingkai)', () => {
  it('tidak ada yang terkirim sebelum jam dimajukan; maju JEDA_AWAL → peristiwa 1', async () => {
    const id = 'm2d11-tirt-7';
    const jam = new JamVirtual();
    s = await mulaiTayang(salinJalan(id), jam);
    const potongan: string[] = [];
    const { request } = await import('node:http');
    const req = request({ host: '127.0.0.1', port: s.port, path: `/api/jalan/${id}/aliran`, headers: { Host: '127.0.0.1' } }, (res) => res.on('data', (b: Buffer) => potongan.push(b.toString('utf8'))));
    req.end();
    await new Promise((r) => setTimeout(r, 150));
    expect(dataTahapSse(potongan.join(''))).toEqual([]);
    const m = await minta(s.port, 'POST', '/api/tayang/maju', { badan: { ms: RUMUS_JEDA.JEDA_AWAL_MS } });
    expect(m.status).toBe(200);
    expect(m.json()).toMatchObject({ terkirim: 1, selesai: false });
    await new Promise((r) => setTimeout(r, 100));
    expect(dataTahapSse(potongan.join('')).length).toBe(1);
    req.destroy();
  });
});

describe('tayang ulang tidak memicu apa pun', () => {
  it('status bertanda rekaman; tanpa konfigurasi kunci dan biaya mesin ini', async () => {
    const id = 'm2d11-tirt-7';
    s = await mulaiTayang(salinJalan(id));
    const st = (await minta(s.port, 'GET', '/api/status')).json() as Record<string, unknown> & { rekaman: Record<string, unknown> };
    expect(st['mode']).toBe('tayang-ulang');
    expect(st['konfig']).toBeUndefined();
    expect(st['biaya']).toBeUndefined();
    expect(st.rekaman).toMatchObject({ id, label: 'Rekaman jalan m2d11-tirt-7, 2 Okt 2026', jumlah_peristiwa: 47, pagu_usd: 0.6 });
  });

  it('semua POST (siapkan, mulai, sunting, uji ulang, setujui, tolak) ditolak 409; folder jalan tak berubah', async () => {
    const id = 'm2d11-tirt-7';
    const folder = salinJalan(id);
    const sebelum = sidikFolder(folder);
    s = await mulaiTayang(folder);
    expect((await minta(s.port, 'GET', `/api/jalan/${id}`)).status).toBe(200);
    for (const [jalur, badan] of [
      ['/api/siapkan', { kode: 'TIRT', tanggal: '2025-12-10', jendela: 10 }],
      [`/api/jalan/${id}/mulai`, { setuju: true, pagu_usd: 0.6 }],
      [`/api/jalan/${id}/sunting`, { omongan: 1, lokasi: 'pesan', teks: 'x' }],
      [`/api/jalan/${id}/uji-ulang`, { setuju: true }],
      [`/api/jalan/${id}/setujui`, {}],
      [`/api/jalan/${id}/tolak`, { alasan: 'alasan panjang' }],
      ['/api/ambil-data', { kode: 'TIRT', setuju: true }],
    ] as const) {
      const r = await minta(s.port, 'POST', jalur, { badan });
      expect(r.status, jalur).toBe(409);
      expect(r.teks).toContain('tayang ulang');
    }
    expect((await minta(s.port, 'GET', '/api/jalan/m2d11-tirt-6')).status).toBe(404);
    expect((await minta(s.port, 'POST', '/api/tayang/maju', { badan: { ms: 10 } })).status).toBe(409);
    expect(sidikFolder(folder)).toBe(sebelum);
  });

  it('argumen: --tayang-ulang <folder>, --jam-virtual hanya bersama tayang ulang', () => {
    expect(uraiArgumen(['--tayang-ulang', 'eval/penyusun/m2d11-tirt-7'], 'D:/r/')).toMatchObject({ tayangUlang: 'eval/penyusun/m2d11-tirt-7', jamVirtual: false });
    expect(uraiArgumen(['--tayang-ulang', 'x/m2d11-tirt-7', '--jam-virtual'], 'D:/r/')).toMatchObject({ jamVirtual: true });
    expect(() => uraiArgumen(['--jam-virtual'], 'D:/r/')).toThrow(/tayang-ulang/);
  });
});
