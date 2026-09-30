/**
 * M2d-9 T-01: server lokal + halaman + SSE (D-1).
 */
import { afterEach, describe, expect, it } from 'vitest';
import { Aliran } from './aliran.ts';
import { KUNCI_LLM_PALSU, KUNCI_SECTORS_PALSU, akarSementara, bacaSse, minta, mulaiServer, peristiwaSse, type ServerUji } from './bantu-uji.ts';
import { statusKonfig, VARIABEL_ENV } from './konfig.ts';
import { HOST, hostSah, uraiArgumen } from './server.ts';

let s: ServerUji | null = null;
afterEach(async () => {
  await s?.tutup();
  s = null;
});

describe('server hanya di 127.0.0.1', () => {
  it('alamat dengar = 127.0.0.1', async () => {
    s = await mulaiServer({ akar: akarSementara() });
    const a = s.server.address();
    expect(HOST).toBe('127.0.0.1');
    expect(typeof a === 'object' && a !== null ? a.address : null).toBe('127.0.0.1');
  });

  it('--host ditolak; --port/--pagu-penyusun/--palsu diurai', () => {
    expect(() => uraiArgumen(['--host', '0.0.0.0'])).toThrow(/127\.0\.0\.1/);
    expect(() => uraiArgumen(['--host=0.0.0.0'])).toThrow(/127\.0\.0\.1/);
    const a = uraiArgumen(['--port', '8800', '--pagu-penyusun', '0.5', '--palsu'], 'D:/r/');
    expect(a).toMatchObject({ port: 8800, paguPenyusunUsd: 0.5, palsu: true });
    expect(() => uraiArgumen(['--pagu-penyusun', '-1'])).toThrow();
    expect(() => uraiArgumen(['--apa'])).toThrow(/tidak dikenal/);
  });

  it('Host selain loopback ditolak (403)', async () => {
    s = await mulaiServer({ akar: akarSementara() });
    expect((await minta(s.port, 'GET', '/api/status', { header: { Host: 'evil.example:8790' } })).status).toBe(403);
    expect((await minta(s.port, 'GET', '/api/status', { header: { Host: 'localhost:8790' } })).status).toBe(200);
    expect(hostSah('127.0.0.1:1')).toBe(true);
    expect(hostSah('127.0.0.1.evil.example')).toBe(false);
    expect(hostSah(undefined)).toBe(false);
  });

  it('POST wajib JSON dan berasal dari halaman sendiri', async () => {
    s = await mulaiServer({ akar: akarSementara() });
    expect((await minta(s.port, 'POST', '/api/apa', { badan: 'x=1', header: { 'Content-Type': 'application/x-www-form-urlencoded' } })).status).toBe(415);
    expect((await minta(s.port, 'POST', '/api/apa', { badan: {}, header: { Origin: 'https://evil.example' } })).status).toBe(403);
    expect((await minta(s.port, 'POST', '/api/apa', { badan: {} })).status).toBe(404);
  });
});

describe('halaman', () => {
  it('menyajikan HTML/JS/CSS polos dengan CSP; berkas lain tidak', async () => {
    s = await mulaiServer({ akar: akarSementara() });
    const h = await minta(s.port, 'GET', '/');
    expect(h.status).toBe(200);
    expect(h.header['content-type']).toMatch(/text\/html/);
    expect(h.header['content-security-policy']).toMatch(/default-src 'self'/);
    expect(h.teks).toContain('<script src="/app.js" defer></script>');
    expect((await minta(s.port, 'GET', '/app.js')).header['content-type']).toMatch(/javascript/);
    expect((await minta(s.port, 'GET', '/gaya.css')).header['content-type']).toMatch(/css/);
    expect((await minta(s.port, 'GET', '/../../.env')).status).toBe(404);
    expect((await minta(s.port, 'GET', '/server.ts')).status).toBe(404);
  });
});

describe('status: nama variabel dan boolean, tidak pernah nilai', () => {
  it('semua terisi → siap; nilai kunci tidak ada di respons', async () => {
    s = await mulaiServer({ akar: akarSementara() });
    const r = await minta(s.port, 'GET', '/api/status');
    expect(r.status).toBe(200);
    expect(r.teks).not.toContain(KUNCI_LLM_PALSU);
    expect(r.teks).not.toContain(KUNCI_SECTORS_PALSU);
    const j = r.json() as { konfig: { llm: { siap: boolean }; sectors: { siap: boolean }; pagu_llm_usd: number }; mode: string };
    expect(j.konfig.llm.siap).toBe(true);
    expect(j.konfig.sectors.siap).toBe(true);
    expect(j.konfig.pagu_llm_usd).toBe(10);
    expect(j.mode).toBe('sungguhan');
  });

  it('tanpa .env → daftar variabel yang harus diisi', () => {
    const k = statusKonfig(akarSementara(null), {});
    expect(k.llm.siap).toBe(false);
    expect(k.llm.hilang).toEqual(['LLM_BASE_URL', 'LLM_API_KEY', 'LLM_MODEL', 'LLM_PAGU_USD']);
    expect(k.sectors.hilang).toEqual(['SECTORS_API_KEY']);
    expect(k.variabel.map((v) => v.nama)).toEqual(VARIABEL_ENV.map((v) => v.nama));
    expect(k.variabel.every((v) => !v.terisi)).toBe(true);
  });

  it('alamat bukan OpenRouter → tidak siap, tanpa menampilkan alamatnya', () => {
    const akar = akarSementara({ LLM_BASE_URL: 'https://rahasia.example/v1', LLM_API_KEY: 'k', LLM_MODEL: 'm', LLM_PAGU_USD: '5' });
    const k = statusKonfig(akar, {});
    expect(k.llm.siap).toBe(false);
    expect(JSON.stringify(k)).not.toContain('rahasia.example');
  });
});

describe('SSE', () => {
  it('memutar ulang peristiwa lama, meneruskan yang baru, dan menutup dengan `selesai`', async () => {
    s = await mulaiServer({ akar: akarSementara() });
    const a = new Aliran('uji-1', null);
    s.keadaan.aliran.set('uji-1', a);
    a.kirim('data', 'data dimuat', { baris: 3 });
    const janji = bacaSse(s.port, '/api/jalan/uji-1/aliran');
    setTimeout(() => {
      a.kirim('aturan', '33 aturan', {});
      a.tutup();
    }, 50);
    const r = await janji;
    expect(r.status).toBe(200);
    expect(peristiwaSse(r.teks).map((p) => [p.no, p.tahap])).toEqual([[1, 'data'], [2, 'aturan']]);
    expect(r.teks).toContain('event: selesai');
  });

  it('Last-Event-ID: hanya peristiwa sesudahnya', async () => {
    s = await mulaiServer({ akar: akarSementara() });
    const a = new Aliran('uji-2', null);
    s.keadaan.aliran.set('uji-2', a);
    a.kirim('data', 'satu');
    a.kirim('aturan', 'dua');
    a.kirim('paket', 'tiga');
    a.tutup();
    const r = await bacaSse(s.port, '/api/jalan/uji-2/aliran', { 'Last-Event-ID': '2' });
    expect(peristiwaSse(r.teks).map((p) => p.judul)).toEqual(['tiga']);
  });

  it('jalan tak dikenal → 404', async () => {
    s = await mulaiServer({ akar: akarSementara() });
    expect((await minta(s.port, 'GET', '/api/jalan/tidak-ada/aliran')).status).toBe(404);
  });
});
