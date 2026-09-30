/**
 * M2d-9 T-06: tanpa kebocoran & aman (D-6).
 *
 * - server hanya mendengar 127.0.0.1 (alamat antarmuka lain ditolak sistem);
 * - kunci palsu di `.env` HANYA sampai ke header permintaan keluar — tidak di
 *   respons mana pun, tidak di log server, tidak di berkas keluaran/ledger/buku
 *   kas — bahkan saat penyedia palsu MEMANTULKAN header itu ke badan galatnya;
 * - tidak ada jalur tulis ke `cases/`;
 * - tiap tindakan berbayar punya perkiraan yang tampil lebih dulu dan menolak
 *   tanpa persetujuan.
 */
import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { connect } from 'node:net';
import { networkInterfaces } from 'node:os';
import { join } from 'node:path';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { deretHarga } from './bantu-data.ts';
import { KUNCI_LLM_PALSU, KUNCI_SECTORS_PALSU, akarSementara, bacaSse, minta, mulaiServer, peristiwaSse, tulisGudangUji, type ServerUji } from './bantu-uji.ts';
import { folderJalan, jalurKeluaran, periksaFolderKeluaran } from './jalan.ts';
import { buatAplikasi } from './server.ts';

let s: ServerUji | null = null;
afterEach(async () => {
  vi.restoreAllMocks();
  await s?.tutup();
  s = null;
});

function semuaBerkas(folder: string): string[] {
  if (!existsSync(folder)) return [];
  return readdirSync(folder).flatMap((n) => {
    const j = join(folder, n);
    return statSync(j).isDirectory() ? semuaBerkas(j) : [j];
  });
}

describe('127.0.0.1 saja', () => {
  it('alamat antarmuka jaringan lain tidak bisa disambung', async () => {
    s = await mulaiServer({ akar: akarSementara() });
    const ip = Object.values(networkInterfaces()).flat().find((a) => a !== undefined && a.family === 'IPv4' && !a.internal)?.address;
    if (ip === undefined) return; // mesin tanpa antarmuka jaringan: tidak ada yang bisa diuji
    const hasil = await new Promise<string>((selesai) => {
      const k = connect({ host: ip, port: (s as ServerUji).port });
      k.setTimeout(3000, () => {
        k.destroy();
        selesai('batas-waktu');
      });
      k.once('connect', () => {
        k.destroy();
        selesai('tersambung');
      });
      k.once('error', (e: NodeJS.ErrnoException) => selesai(e.code ?? 'galat'));
    });
    expect(hasil).not.toBe('tersambung');
  });
});

describe('kunci tidak bocor (sabotase: sisipkan kunci palsu ke respons/log/berkas → tes ini merah)', () => {
  it('alur lengkap dengan penyedia yang memantulkan header: kunci hanya ada di header keluar', async () => {
    const akar = akarSementara();
    const harga = deretHarga('2026-03-02', 60, (i) => (i >= 12 && i <= 19 ? 100 + (i - 11) * 6 : i > 19 ? 148 : 100), (i) => (i === 20 ? 0 : 1000));
    const t = harga[20]?.tanggal as string;
    tulisGudangUji(akar, 'UJIX', harga, [{ tanggal: t, alasan: 'Peningkatan harga kumulatif yang signifikan' }]);
    const keluar: Array<{ url: string; auth: string }> = [];
    let ke = 0;
    vi.spyOn(globalThis, 'fetch').mockImplementation(async (url, init) => {
      const auth = new Headers(init?.headers).get('authorization') ?? '';
      keluar.push({ url: String(url), auth });
      ke++;
      if (String(url).startsWith('https://openrouter.ai/') && ke % 2 === 0) {
        // Jawaban sukses (isi tak terbaca penulis) — log panggilan server ikut diuji.
        return new Response(JSON.stringify({ choices: [{ message: { content: 'bukan json' }, finish_reason: 'stop' }], usage: { prompt_tokens: 10, completion_tokens: 5, cost: 0 }, provider: 'Palsu' }), { status: 200, headers: { 'content-type': 'application/json' } });
      }
      // Penyedia/Sectors yang memantulkan header ke badan galat.
      return new Response(JSON.stringify({ error: { message: `ditolak; header yang diterima: ${auth}` } }), { status: 400, headers: { 'content-type': 'application/json' } });
    });
    s = await mulaiServer({ akar });
    const respons: string[] = [];
    const catat = (r: { teks: string }): typeof r => {
      respons.push(r.teks);
      return r;
    };
    catat(await minta(s.port, 'GET', '/'));
    catat(await minta(s.port, 'GET', '/app.js'));
    catat(await minta(s.port, 'GET', '/api/status'));
    catat(await minta(s.port, 'GET', '/api/emiten?kode=UJIX'));
    catat(await minta(s.port, 'GET', '/api/emiten?kode=ZZZZ'));
    catat(await minta(s.port, 'POST', '/api/periksa-tanggal', { badan: { kode: 'UJIX', tanggal: t } }));
    catat(await minta(s.port, 'POST', '/api/siapkan', { badan: { kode: 'UJIX', tanggal: t, jendela: 10, id: 'bocor' } }));
    respons.push((await bacaSse(s.port, '/api/jalan/bocor/aliran', {}, 1500)).teks);
    catat(await minta(s.port, 'POST', '/api/jalan/bocor/mulai', { badan: { setuju: true, pagu_usd: 0.5 } }));
    const sse = await bacaSse(s.port, '/api/jalan/bocor/aliran', {}, 60_000);
    respons.push(sse.teks);
    catat(await minta(s.port, 'GET', '/api/jalan/bocor'));
    catat(await minta(s.port, 'POST', '/api/ambil-data', { badan: { kode: 'ZZZZ', setuju: true } }));

    // Kunci sungguh dibaca dan dipakai — hanya di header.
    expect(keluar.some((k) => k.url.startsWith('https://openrouter.ai/api/v1/') && k.auth === `Bearer ${KUNCI_LLM_PALSU}`)).toBe(true);
    expect(keluar.some((k) => k.url.startsWith('https://api.sectors.app/') && k.auth === KUNCI_SECTORS_PALSU)).toBe(true);
    expect(peristiwaSse(sse.teks).some((p) => /header yang diterima/.test(JSON.stringify(p)))).toBe(true);
    expect(s.log.some((b) => b.includes('penyusun/bocor/p1/tulis-'))).toBe(true);

    const berkas = semuaBerkas(akar).filter((b) => !b.endsWith('.env'));
    expect(berkas.some((b) => b.endsWith('ledger.jsonl'))).toBe(true);
    expect(berkas.some((b) => b.endsWith('kredit.csv'))).toBe(true);
    expect(berkas.some((b) => b.endsWith('aliran.jsonl'))).toBe(true);
    const tumpukan = [...respons, ...s.log, ...berkas.map((b) => readFileSync(b, 'utf8'))].join('\n');
    for (const kunci of [KUNCI_LLM_PALSU, KUNCI_SECTORS_PALSU]) {
      expect(tumpukan.includes(kunci)).toBe(false);
      expect(tumpukan.includes(kunci.slice(8, 24))).toBe(false);
    }
  }, 90_000);
});

describe('tidak pernah menulis ke cases/', () => {
  it('folder keluaran di dalam cases/ ditolak saat server dibuat', () => {
    const akar = akarSementara();
    expect(() => buatAplikasi({ akar, folderKeluaran: join(akar, 'cases', 'x'), jam: () => new Date(), log: () => undefined, paguPenyusunUsd: 1.2, palsu: true })).toThrow(/cases/);
    expect(() => periksaFolderKeluaran('D:/repo/cases')).toThrow(/cases/);
    expect(() => periksaFolderKeluaran('D:/repo/eval/penyusun')).not.toThrow();
  });

  it('nama jalan dan nama berkas tidak bisa keluar dari folder jalan', () => {
    expect(() => folderJalan('D:/repo/eval/penyusun', '../cases')).toThrow(/tidak sah/);
    expect(() => folderJalan('D:/repo/eval/penyusun', 'ab')).toThrow(/tidak sah/);
    expect(() => jalurKeluaran('D:/repo/eval/penyusun/j1', '../../../cases/dada.json')).toThrow(/langsung di folder jalan/);
    expect(() => jalurKeluaran('D:/repo/eval/penyusun/j1', 'sub/a.json')).toThrow(/langsung di folder jalan/);
    expect(jalurKeluaran('D:/repo/eval/penyusun/j1', 'draf-disetujui.json').replace(/\\/g, '/')).toBe('D:/repo/eval/penyusun/j1/draf-disetujui.json');
  });

  it('id jalan dari permintaan dengan ../ ditolak', async () => {
    const akar = akarSementara();
    tulisGudangUji(akar, 'UJIX', deretHarga('2026-03-02', 60), [{ tanggal: '2026-03-20', alasan: 'x' }]);
    s = await mulaiServer({ akar });
    const r = await minta(s.port, 'POST', '/api/siapkan', { badan: { kode: 'UJIX', tanggal: '2026-03-20', id: '../../cases/dada' } });
    expect(r.status).toBe(400);
    expect(existsSync(join(akar, 'cases'))).toBe(false);
  });
});

describe('perkiraan tampil sebelum tiap tindakan berbayar; tanpa persetujuan = ditolak', () => {
  it('kredit Sectors, agen, dan uji ulang', async () => {
    const akar = akarSementara();
    const harga = deretHarga('2026-03-02', 60, (i) => (i >= 12 && i <= 19 ? 100 + (i - 11) * 6 : 148), (i) => (i === 20 ? 0 : 1000));
    const t = harga[20]?.tanggal as string;
    tulisGudangUji(akar, 'UJIX', harga, [{ tanggal: t, alasan: 'x' }]);
    const f = vi.spyOn(globalThis, 'fetch');
    s = await mulaiServer({ akar });
    // 1. kredit: perkiraan di GET, lalu POST tanpa setuju ditolak.
    const e = (await minta(s.port, 'GET', '/api/emiten?kode=ZZZZ')).json() as { perkiraan_kredit: { kredit_maks: number } };
    expect(e.perkiraan_kredit.kredit_maks).toBe(10);
    expect((await minta(s.port, 'POST', '/api/ambil-data', { badan: { kode: 'ZZZZ' } })).status).toBe(400);
    // 2. agen: peristiwa "perkiraan" datang sebelum persetujuan; tanpa setuju ditolak.
    await minta(s.port, 'POST', '/api/siapkan', { badan: { kode: 'UJIX', tanggal: t, id: 'bayar' } });
    const p = peristiwaSse((await bacaSse(s.port, '/api/jalan/bayar/aliran', {}, 1500)).teks);
    expect(p.at(-1)?.tahap).toBe('perkiraan');
    expect(p.at(-1)?.judul).toMatch(/Perkiraan maksimum: satu omongan melewati semua gerbang ≤ US\$\d/);
    expect((await minta(s.port, 'POST', '/api/jalan/bayar/mulai', { badan: { pagu_usd: 0.5 } })).status).toBe(400);
    // 3. uji ulang hanya untuk draf terbit, dan juga wajib setuju (lihat penyetuju.test.ts).
    expect((await minta(s.port, 'POST', '/api/jalan/bayar/uji-ulang', { badan: { setuju: true } })).status).toBe(409);
    expect(f).not.toHaveBeenCalled();
  });
});
