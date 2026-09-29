import { existsSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import {
  PAGU_BAWAAN,
  SALDO_PEMBUKA,
  ambil,
  bacaBukuKas,
  bacaKonfig,
  biayaPanggilan,
  kreditTerpakai,
  perbaikiPathMsys,
  statusGratis,
  uraiEnv,
  type Pengambil,
} from './sectors.ts';

/** Kunci palsu yang dicari di setiap keluaran: tidak boleh muncul di mana pun selain header. */
const KUNCI_PALSU = 'kunci-palsu-JANGAN-BOCOR-1234567890';

interface Panggilan {
  url: string;
  headers: Record<string, string>;
}

function responsPalsu(status: number, isi: string, retryAfter: string | null = null) {
  return {
    status,
    text: async () => isi,
    headers: { get: (nama: string) => (nama.toLowerCase() === 'retry-after' ? retryAfter : null) },
  };
}

let folder: string;
let panggilan: Panggilan[];
let tidurTercatat: number[];

function pengambil(
  jawab: (url: string, ke: number) => ReturnType<typeof responsPalsu>,
  pagu = PAGU_BAWAAN,
): Pengambil {
  return {
    kunci: KUNCI_PALSU,
    pagu,
    folder,
    bukuKas: join(folder, 'kredit.csv'),
    fetch: async (url, init) => {
      panggilan.push({ url, headers: init.headers });
      return jawab(url, panggilan.length);
    },
    jam: () => new Date('2026-09-29T00:00:00.000Z'),
    tidur: async (ms) => {
      tidurTercatat.push(ms);
    },
    jedaMs: 350,
  };
}

beforeEach(() => {
  folder = mkdtempSync(join(tmpdir(), 'sectors-uji-'));
  panggilan = [];
  tidurTercatat = [];
});

afterEach(() => {
  rmSync(folder, { recursive: true, force: true });
});

describe('biaya dihitung dari path sebelum memanggil', () => {
  it('company report: satu kredit per section, tanpa sections = 8', () => {
    expect(biayaPanggilan('/v2/company/report/ABCD/?sections=ownership')).toBe(1);
    expect(biayaPanggilan('/v2/company/report/ABCD/?sections=overview,financials')).toBe(2);
    expect(biayaPanggilan('/v2/company/report/ABCD/?sections=overview%2Cfinancials')).toBe(2);
    expect(biayaPanggilan('/v2/company/report/ABCD/')).toBe(8);
  });

  it('quarterly financials: n_quarters', () => {
    expect(biayaPanggilan('/v2/financials/quarterly/ABCD/?n_quarters=4')).toBe(4);
    expect(biayaPanggilan('/v2/financials/quarterly/ABCD/')).toBe(1);
  });

  it('kalender corporate actions: jumlah type, bawaan 7; per emiten tetap 1', () => {
    expect(biayaPanggilan('/v2/corporate-actions/?type=stock_split&start=2025-01-01')).toBe(1);
    expect(biayaPanggilan('/v2/corporate-actions/?type=bonus,right_issue')).toBe(2);
    expect(biayaPanggilan('/v2/corporate-actions/')).toBe(7);
    expect(biayaPanggilan('/v2/company/corporate-actions/ABCD/')).toBe(1);
  });

  it('selain itu 1', () => {
    expect(biayaPanggilan('/v2/daily/ABCD/?start=2025-01-01&end=2025-03-31')).toBe(1);
    expect(biayaPanggilan('/v2/filings/?symbol=ABCD&limit=30')).toBe(1);
    expect(biayaPanggilan('/v2/companies/?limit=200')).toBe(1);
  });

  it('status gratis sesuai changelog: 400/401/403/429/>=500; 404 dan 2xx tidak', () => {
    for (const s of [400, 401, 403, 429, 500, 502, 503]) expect(statusGratis(s), String(s)).toBe(true);
    for (const s of [200, 201, 404]) expect(statusGratis(s), String(s)).toBe(false);
  });
});

describe('perbaikan path MSYS', () => {
  it('mengembalikan path Git Bash yang ditulis ulang ke /v2/...', () => {
    expect(perbaikiPathMsys('C:/Program Files/Git/v2/company/corporate-actions/ABCD/')).toBe(
      '/v2/company/corporate-actions/ABCD/',
    );
    expect(perbaikiPathMsys('C:\\Program Files\\Git\\v2\\daily\\ABCD\\')).toBe('/v2/daily/ABCD/');
    expect(perbaikiPathMsys('/v2/daily/ABCD/?start=2025-01-01')).toBe('/v2/daily/ABCD/?start=2025-01-01');
  });

  it('memakai path yang sudah diperbaiki untuk panggilan', async () => {
    const p = pengambil(() => responsPalsu(200, '{"symbol":"ABCD.JK","corporate_actions":{}}'));
    const h = await ambil(p, 'C:/Program Files/Git/v2/company/corporate-actions/ABCD/', 'ABCD-ca.json');
    expect(h.akhir).toBe('diambil');
    expect(panggilan[0]?.url).toBe('https://api.sectors.app/v2/company/corporate-actions/ABCD/');
  });
});

describe('buku kas dan pagu', () => {
  it('membuka buku dengan saldo pembuka 113 dan mencatat biaya sesudah panggilan', async () => {
    const p = pengambil(() => responsPalsu(200, '[]'));
    await ambil(p, '/v2/company/report/ABCD/?sections=overview,financials', 'ABCD-of.json');
    const buku = bacaBukuKas(p.bukuKas);
    expect(buku[0]).toMatchObject({ jenis: 'saldo-pembuka', biaya: SALDO_PEMBUKA });
    expect(buku.map((b) => b.jenis)).toEqual(['saldo-pembuka', 'cadang', 'hasil']);
    expect(kreditTerpakai(buku)).toBe(SALDO_PEMBUKA + 2);
    // Path dengan koma dikutip dan terbaca kembali utuh.
    expect(buku[1]?.path).toBe('/v2/company/report/ABCD/?sections=overview,financials');
  });

  it('tidak mengirim panggilan yang akan melewati pagu', async () => {
    const p = pengambil(() => responsPalsu(200, '[]'), SALDO_PEMBUKA + 1);
    const pertama = await ambil(p, '/v2/daily/ABCD/?start=2025-01-01&end=2025-03-31', 'a.json');
    expect(pertama.akhir).toBe('diambil');
    const kedua = await ambil(p, '/v2/daily/ABCD/?start=2025-04-01&end=2025-06-29', 'b.json');
    expect(kedua.akhir).toBe('ditolak-pagu');
    expect(panggilan).toHaveLength(1);
    expect(existsSync(join(folder, 'b.json'))).toBe(false);
    expect(kreditTerpakai(bacaBukuKas(p.bukuKas))).toBe(SALDO_PEMBUKA + 1);
  });

  it('menolak panggilan multi-kredit yang hanya sebagian muat di sisa pagu', async () => {
    const p = pengambil(() => responsPalsu(200, '[]'), SALDO_PEMBUKA + 1);
    const h = await ambil(p, '/v2/company/report/ABCD/?sections=overview,financials', 'of.json');
    expect(h.akhir).toBe('ditolak-pagu');
    expect(panggilan).toHaveLength(0);
  });

  it('pagu dihitung SEBELUM memanggil: fetch tidak pernah dipanggil saat pagu penuh', async () => {
    const p = pengambil(() => {
      throw new Error('fetch tidak boleh dipanggil');
    }, SALDO_PEMBUKA);
    const h = await ambil(p, '/v2/daily/ABCD/', 'x.json');
    expect(h.akhir).toBe('ditolak-pagu');
    expect(panggilan).toHaveLength(0);
  });

  it('status gratis dikoreksi ke biaya 0; 404 tetap ditagih', async () => {
    const p = pengambil((url) =>
      url.includes('AAAA') ? responsPalsu(404, '{"detail":"not found"}') : responsPalsu(500, 'galat'),
    );
    const a = await ambil(p, '/v2/company/corporate-actions/AAAA/', 'aaaa.json');
    expect(a).toMatchObject({ akhir: 'tidak-ada', status: 404, biaya: 1 });
    const b = await ambil(p, '/v2/company/corporate-actions/BBBB/', 'bbbb.json');
    expect(b).toMatchObject({ akhir: 'berhenti', status: 500, biaya: 0 });
    expect(kreditTerpakai(bacaBukuKas(p.bukuKas))).toBe(SALDO_PEMBUKA + 1);
    expect(existsSync(join(folder, 'aaaa.json'))).toBe(false);
    expect(existsSync(join(folder, 'bbbb.json'))).toBe(false);
  });

  it('401/403 menghentikan pengambil dengan alasan kunci/kuota, biaya 0', async () => {
    for (const status of [401, 403]) {
      const p = pengambil(() => responsPalsu(status, '{"detail":"x"}'));
      const h = await ambil(p, '/v2/daily/ABCD/', `s${status}.json`);
      expect(h.akhir).toBe('berhenti');
      expect(h.alasan).toMatch(/kunci tidak sah atau kuota/);
    }
    expect(kreditTerpakai(bacaBukuKas(join(folder, 'kredit.csv')))).toBe(SALDO_PEMBUKA);
  });
});

describe('berkas cache tidak pernah ditimpa', () => {
  it('berkas yang sudah ada dilewati tanpa memanggil, biaya 0, isi lama utuh', async () => {
    writeFileSync(join(folder, 'lama.json'), '{"lama":true}', 'utf8');
    const p = pengambil(() => responsPalsu(200, '{"baru":true}'));
    const h = await ambil(p, '/v2/daily/ABCD/', 'lama.json');
    expect(h).toMatchObject({ akhir: 'sudah-ada', biaya: 0, isi: { lama: true } });
    expect(panggilan).toHaveLength(0);
    expect(readFileSync(join(folder, 'lama.json'), 'utf8')).toBe('{"lama":true}');
    expect(kreditTerpakai(bacaBukuKas(p.bukuKas))).toBe(SALDO_PEMBUKA);
  });

  it('menolak nama berkas yang keluar dari folder cache', async () => {
    const p = pengambil(() => responsPalsu(200, '[]'));
    await expect(ambil(p, '/v2/daily/ABCD/', '../luar.json')).rejects.toThrow(/relatif/);
    await expect(ambil(p, '/v2/daily/ABCD/', 'bukan-json.txt')).rejects.toThrow(/\.json/);
    expect(panggilan).toHaveLength(0);
  });

  it('menulis respons 2xx apa adanya, byte per byte', async () => {
    const mentah = '{"results": [ ],\n "pagination": {"total_count": 0}}';
    const p = pengambil(() => responsPalsu(200, mentah));
    await ambil(p, '/v2/filings/?symbol=ABCD', 'sub/f.json');
    expect(readFileSync(join(folder, 'sub/f.json'), 'utf8')).toBe(mentah);
  });
});

describe('429: tunggu lalu satu kali coba lagi', () => {
  it('berhasil pada percobaan kedua; 429 tidak ditagih', async () => {
    const p = pengambil((_url, ke) => (ke === 1 ? responsPalsu(429, '', '3') : responsPalsu(200, '[]')));
    const h = await ambil(p, '/v2/daily/ABCD/', 'd.json');
    expect(h.akhir).toBe('diambil');
    expect(panggilan).toHaveLength(2);
    expect(tidurTercatat).toContain(3000);
    expect(kreditTerpakai(bacaBukuKas(p.bukuKas))).toBe(SALDO_PEMBUKA + 1);
  });

  it('429 dua kali → berhenti', async () => {
    const p = pengambil(() => responsPalsu(429, ''));
    const h = await ambil(p, '/v2/daily/ABCD/', 'd.json');
    expect(h.akhir).toBe('berhenti');
    expect(panggilan).toHaveLength(2);
    expect(kreditTerpakai(bacaBukuKas(p.bukuKas))).toBe(SALDO_PEMBUKA);
  });

  it('menjeda sesudah setiap panggilan jaringan (≥ 300 ms)', async () => {
    const p = pengambil(() => responsPalsu(200, '[]'));
    await ambil(p, '/v2/daily/ABCD/', 'j.json');
    expect(tidurTercatat.length).toBeGreaterThan(0);
    expect(Math.min(...tidurTercatat)).toBeGreaterThanOrEqual(300);
  });
});

describe('kunci', () => {
  it('dikirim sebagai header Authorization apa adanya', async () => {
    const p = pengambil(() => responsPalsu(200, '[]'));
    await ambil(p, '/v2/daily/ABCD/', 'k.json');
    expect(panggilan[0]?.headers['Authorization']).toBe(KUNCI_PALSU);
  });

  it('tidak pernah muncul di buku kas maupun di hasil', async () => {
    const p = pengambil((_u, ke) => (ke === 1 ? responsPalsu(403, 'x') : responsPalsu(200, '[]')));
    const a = await ambil(p, '/v2/daily/ABCD/', 'k1.json');
    const b = await ambil(p, '/v2/daily/EFGH/', 'k2.json');
    expect(JSON.stringify([a, b])).not.toContain(KUNCI_PALSU);
    expect(readFileSync(p.bukuKas, 'utf8')).not.toContain(KUNCI_PALSU);
  });

  it('dibaca dari .env; pesan galat hanya menyebut nama variabel', () => {
    expect(uraiEnv('A=1\nSECTORS_API_KEY="abc"\n# komentar')).toMatchObject({ SECTORS_API_KEY: 'abc' });
    writeFileSync(join(folder, '.env'), `SECTORS_API_KEY=${KUNCI_PALSU}\nSECTORS_KREDIT_PAGU=200\n`);
    expect(bacaKonfig(folder)).toEqual({ kunci: KUNCI_PALSU, pagu: 200 });
    writeFileSync(join(folder, '.env'), `SECTORS_API_KEY=${KUNCI_PALSU}\nSECTORS_KREDIT_PAGU=abc\n`);
    let pesan = '';
    try {
      bacaKonfig(folder);
    } catch (galat) {
      pesan = galat instanceof Error ? galat.message : '';
    }
    expect(pesan).toMatch(/SECTORS_KREDIT_PAGU/);
    expect(pesan).not.toContain(KUNCI_PALSU);
  });

  it('pagu bawaan 613 = 113 + 500', () => {
    expect(PAGU_BAWAAN).toBe(613);
    expect(SALDO_PEMBUKA).toBe(113);
    const lama = process.env['SECTORS_KREDIT_PAGU'];
    delete process.env['SECTORS_KREDIT_PAGU'];
    writeFileSync(join(folder, '.env'), `SECTORS_API_KEY=${KUNCI_PALSU}\n`);
    expect(bacaKonfig(folder).pagu).toBe(613);
    if (lama !== undefined) process.env['SECTORS_KREDIT_PAGU'] = lama;
  });
});
