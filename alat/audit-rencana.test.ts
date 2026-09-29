import { createHash } from 'node:crypto';
import { existsSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { ambilEmiten, isiPembanding, ringkasAmbil, type Rencana } from './audit-ambil.ts';
import {
  PARAMETER_AUDIT,
  kreditTerburuk,
  paketTetap,
  pilihJendela,
  pilihKelompokPembanding,
  pilihKelompokSuspensi,
  simbolGudangLama,
  tambahHari,
  tanggalPenting,
  urutanAmbil,
} from './audit-rencana.ts';
import { SALDO_PEMBUKA, bacaBukuKas, kreditTerpakai, type Pengambil } from './sectors.ts';

const sus = (symbol: string, suspension_date: string) => ({ symbol, suspension_date });

describe('D-3 aturan pemilihan emiten', () => {
  it('gudang lama = emiten yang punya berkas sendiri, bukan hanya baris suspensi/kalender', () => {
    expect(
      simbolGudangLama([
        { simbol: 'ULTJ', berkas: ['ULTJ-filings.json', 'suspensions-all.json'] },
        { simbol: 'AHAP', berkas: ['kalender-right-issue.json'] },
        { simbol: 'ZZZZ', berkas: ['suspensions-all.json'] },
        { simbol: 'DADA', berkas: ['dada-suspensions.json', 'dada-filings-2025.json'] },
      ]),
    ).toEqual(['DADA', 'ULTJ']);
  });

  it('kelompok suspensi: suspensi 2025–2026, belum di gudang, urut simbol, dari atas', () => {
    const baris = [
      sus('DDDD.JK', '2025-03-01'),
      sus('BBBB.JK', '2024-12-31'), // hanya 2024 → tidak masuk
      sus('CCCC.JK', '2026-01-10'),
      sus('AAAA.JK', '2025-05-05'),
      sus('AAAA.JK', '2025-06-05'),
      sus('ULTJ.JK', '2025-07-01'), // sudah di gudang
      sus('EEEE.JK', '2027-01-01'),
    ];
    expect(pilihKelompokSuspensi(baris, ['ULTJ'], 2)).toEqual(['AAAA', 'CCCC']);
    expect(pilihKelompokSuspensi(baris, ['ULTJ'], 10)).toEqual(['AAAA', 'CCCC', 'DDDD']);
  });

  it('kelompok pembanding: buang yang pernah disuspensi dan gudang lama, urut sha256(simbol)', () => {
    const daftar = ['AAAA.JK', 'BBBB.JK', 'CCCC.JK', 'DDDD.JK', 'EEEE.JK', 'ULTJ.JK'].map((symbol) => ({ symbol }));
    const pilih = pilihKelompokPembanding(daftar, new Set(['BBBB']), ['ULTJ'], 3);
    const harapan = ['AAAA', 'CCCC', 'DDDD', 'EEEE']
      .map((s) => ({ s, h: createHash('sha256').update(s).digest('hex') }))
      .sort((a, b) => (a.h < b.h ? -1 : 1))
      .slice(0, 3)
      .map((x) => x.s);
    expect(pilih).toEqual(harapan);
    expect(pilih).not.toContain('BBBB');
    expect(pilih).not.toContain('ULTJ');
    // Urutan masukan tidak berpengaruh.
    expect(pilihKelompokPembanding([...daftar].reverse(), new Set(['BBBB']), ['ULTJ'], 3)).toEqual(pilih);
  });

  it('urutan ambil berselang 2:1', () => {
    expect(urutanAmbil(['a1', 'a2', 'a3', 'a4'], ['b1', 'b2']).map((x) => x.simbol)).toEqual([
      'a1', 'a2', 'b1', 'a3', 'a4', 'b2',
    ]);
  });

  it('anggaran: 28 + 14 emiten, terburuk ≤ 450 kredit, ≤ 12 per emiten', () => {
    expect(PARAMETER_AUDIT.jumlah_suspensi).toBe(2 * PARAMETER_AUDIT.jumlah_pembanding);
    const n = PARAMETER_AUDIT.jumlah_suspensi + PARAMETER_AUDIT.jumlah_pembanding;
    expect(kreditTerburuk(n)).toBeLessThanOrEqual(450);
    expect(PARAMETER_AUDIT.pagu_emiten).toBeLessThanOrEqual(12);
    // Paket tetap 5 kredit + 1 halaman filings lanjutan + 4 jendela harian = 10.
    const tetap = paketTetap('ABCD').length + 1; // overview,financials = 2 kredit
    expect(tetap + 1 + PARAMETER_AUDIT.maks_jendela_harian).toBe(PARAMETER_AUDIT.pagu_emiten);
  });
});

describe('D-3 jendela harga harian', () => {
  it('tanggal penting dari suspensi, laporan, dan aksi korporasi, dalam rentang audit', () => {
    const tp = tanggalPenting({
      simbol: 'ABCD',
      suspensi: [sus('ABCD.JK', '2025-06-30'), sus('ABCD.JK', '2024-06-30'), sus('XXXX.JK', '2025-01-02')],
      halamanFilings: [
        {
          results: [
            { timestamp: '2025-03-04T10:00:00', price_transaction: [{ date: '2025-03-01' }, { date: '2025-02-27' }] },
            { timestamp: 'bukan tanggal' },
          ],
        },
      ],
      aksiKorporasi: {
        corporate_actions: {
          dividend: [{ ex_date: '2025-07-01' }, { ex_date: '2019-07-01' }],
          stock_split: [{ date: '2026-02-02' }],
          right_issue: [],
          bonus: [{ payment_date: '2025-12-12' }],
        },
      },
    });
    expect(tp).toEqual({
      suspensi: ['2025-06-30'],
      laporan: ['2025-02-27', '2025-03-01', '2025-03-04'],
      aksi: ['2025-07-01', '2025-12-12', '2026-02-02'],
    });
  });

  it('jendela 90 hari mulai 14 hari sebelum tanggal, tingkat suspensi lebih dulu, paling banyak 4', () => {
    const j = pilihJendela({
      suspensi: ['2025-06-30'],
      laporan: ['2025-02-27', '2025-03-04', '2025-07-15', '2025-10-20'],
      aksi: ['2025-12-12', '2026-02-02', '2026-09-20'],
    });
    for (const w of j) expect(tambahHari(w.mulai, 89)).toBe(w.akhir);
    // Suspensi 30 Jun: jendela 16 Jun–13 Sep, menutup juga laporan 15 Jul.
    // Laporan 20 Okt membuka jendela yang juga menutup aksi 12 Des.
    expect(j).toEqual([
      { mulai: '2025-02-13', akhir: '2025-05-13' },
      { mulai: '2025-06-16', akhir: '2025-09-13' },
      { mulai: '2025-10-06', akhir: '2026-01-03' },
      { mulai: '2026-01-19', akhir: '2026-04-18' },
    ]);
    // Jendela ke-5 (2026-09-20) tidak diambil: batas 4.
    expect(j.some((w) => w.mulai <= '2026-09-20' && '2026-09-20' <= w.akhir)).toBe(false);
    // Terurut menurut tanggal mulai.
    expect([...j].sort((a, b) => a.mulai.localeCompare(b.mulai))).toEqual(j);
  });

  it('jendela dijepit ke rentang audit; tanpa tanggal penting = 90 hari terakhir', () => {
    expect(pilihJendela({ suspensi: ['2025-01-03'], laporan: [], aksi: [] })).toEqual([
      { mulai: '2025-01-01', akhir: '2025-03-31' },
    ]);
    expect(pilihJendela({ suspensi: [], laporan: ['2026-09-25'], aksi: [] })).toEqual([
      { mulai: '2026-07-01', akhir: '2026-09-28' },
    ]);
    expect(pilihJendela({ suspensi: [], laporan: [], aksi: [] })).toEqual([
      { mulai: '2026-07-01', akhir: '2026-09-28' },
    ]);
  });
});

// --- penjalan dengan fetch palsu -------------------------------------------------

let folder: string;
let dipanggil: string[];

function pengambil(jawab: (url: string) => { status: number; isi: unknown }, pagu = 613): Pengambil {
  return {
    kunci: 'palsu',
    pagu,
    folder,
    bukuKas: join(folder, 'kredit.csv'),
    fetch: async (url) => {
      dipanggil.push(url.replace('https://api.sectors.app', ''));
      const { status, isi } = jawab(url);
      return { status, text: async () => JSON.stringify(isi), headers: { get: () => null } };
    },
    jam: () => new Date('2026-09-29T00:00:00Z'),
    tidur: async () => {},
    jedaMs: 350,
  };
}

function jawabNormal(url: string): { status: number; isi: unknown } {
  if (url.includes('/corporate-actions/')) {
    return { status: 200, isi: { symbol: 'ABCD.JK', corporate_actions: { dividend: [{ ex_date: '2026-03-10' }] } } };
  }
  if (url.includes('/filings/') && url.includes('offset=30')) {
    return { status: 200, isi: { results: [{ timestamp: '2025-10-01T09:00:00' }], pagination: { has_next: false } } };
  }
  if (url.includes('/filings/')) {
    return { status: 200, isi: { results: [{ timestamp: '2025-04-01T09:00:00' }], pagination: { has_next: true } } };
  }
  if (url.includes('/daily/')) return { status: 200, isi: [] };
  return { status: 200, isi: { symbol: 'ABCD.JK' } };
}

beforeEach(() => {
  folder = mkdtempSync(join(tmpdir(), 'audit-uji-'));
  dipanggil = [];
  writeFileSync(join(folder, 'suspensions-all.json'), JSON.stringify([sus('ABCD.JK', '2025-06-30')]));
});

afterEach(() => {
  rmSync(folder, { recursive: true, force: true });
});

describe('penjalan paket per emiten', () => {
  it('mengirim paket tetap, halaman lanjutan bila has_next, lalu jendela dari tanggal penting', async () => {
    await ambilEmiten(pengambil(jawabNormal), 'ABCD', [sus('ABCD.JK', '2025-06-30')]);
    expect(dipanggil).toEqual([
      '/v2/company/corporate-actions/ABCD/',
      '/v2/filings/?symbol=ABCD&start=2025-01-01&end=2026-09-28&limit=30',
      '/v2/company/report/ABCD/?sections=ownership',
      '/v2/company/report/ABCD/?sections=overview,financials',
      '/v2/filings/?symbol=ABCD&start=2025-01-01&end=2026-09-28&limit=30&offset=30',
      '/v2/daily/ABCD/?start=2025-03-18&end=2025-06-15',
      '/v2/daily/ABCD/?start=2025-06-16&end=2025-09-13',
      '/v2/daily/ABCD/?start=2025-09-17&end=2025-12-15',
      '/v2/daily/ABCD/?start=2026-02-24&end=2026-05-24',
    ]);
    expect(kreditTerpakai(bacaBukuKas(join(folder, 'kredit.csv')))).toBe(SALDO_PEMBUKA + 10);
  });

  it('jalan ulang tidak memanggil apa pun dan tidak memakan kredit', async () => {
    await ambilEmiten(pengambil(jawabNormal), 'ABCD', [sus('ABCD.JK', '2025-06-30')]);
    const sebelum = kreditTerpakai(bacaBukuKas(join(folder, 'kredit.csv')));
    dipanggil = [];
    await ambilEmiten(pengambil(jawabNormal), 'ABCD', [sus('ABCD.JK', '2025-06-30')]);
    expect(dipanggil).toEqual([]);
    expect(kreditTerpakai(bacaBukuKas(join(folder, 'kredit.csv')))).toBe(sebelum);
  });

  it('404 pada aksi korporasi: sisa paket tidak dikirim', async () => {
    await ambilEmiten(pengambil(() => ({ status: 404, isi: { detail: 'x' } })), 'ZZZZ', []);
    expect(dipanggil).toEqual(['/v2/company/corporate-actions/ZZZZ/']);
    expect(kreditTerpakai(bacaBukuKas(join(folder, 'kredit.csv')))).toBe(SALDO_PEMBUKA + 1);
  });

  it('pagu emiten 10 ditegakkan sebelum memanggil', async () => {
    // Sisipkan 8 kredit bekas panggilan emiten ini di buku kas: sisa 2.
    await ambilEmiten(pengambil(jawabNormal), 'ABCD', [sus('ABCD.JK', '2025-06-30')]);
    rmSync(join(folder, 'ABCD-m4a-daily-2025-03-18.json'));
    rmSync(join(folder, 'ABCD-m4a-daily-2025-06-16.json'));
    dipanggil = [];
    await ambilEmiten(pengambil(jawabNormal), 'ABCD', [sus('ABCD.JK', '2025-06-30')]);
    // Pagu emiten sudah penuh (10): dua berkas yang hilang tidak diambil ulang.
    expect(dipanggil).toEqual([]);
    expect(existsSync(join(folder, 'ABCD-m4a-daily-2025-03-18.json'))).toBe(false);
  });

  it('pagu global berhenti di tengah: galat Henti, sisa tidak dikirim', async () => {
    await expect(ambilEmiten(pengambil(jawabNormal, SALDO_PEMBUKA + 3), 'ABCD', [])).rejects.toThrow(
      /ditolak-pagu/,
    );
    // 113 + 1 (aksi) + 1 (filings) + 1 (kepemilikan) = 116; ringkasan+keuangan (2) ditolak.
    expect(dipanggil.length).toBe(3);
  });

  it('ringkasan menyusun ulang panggilan dari berkas dan buku kas', async () => {
    await ambilEmiten(pengambil(jawabNormal), 'ABCD', [sus('ABCD.JK', '2025-06-30')]);
    await ambilEmiten(pengambil(() => ({ status: 404, isi: {} })), 'ZZZZ', []);
    const rencana: Rencana = {
      keterangan: '',
      parameter: PARAMETER_AUDIT,
      gudang_lama: [],
      kelompok_suspensi: ['ABCD'],
      kelompok_pembanding: ['ZZZZ'],
      pembanding_dari: null,
      kredit_terburuk: 21,
    };
    const r = ringkasAmbil(rencana, folder, bacaBukuKas(join(folder, 'kredit.csv')));
    expect(r.kredit.terpakai_sejak_pembuka).toBe(11);
    expect(r.emiten.find((e) => e.simbol === 'ABCD')).toMatchObject({ biaya: 10, berkas_ada: 9, gagal: null });
    expect(r.emiten.find((e) => e.simbol === 'ZZZZ')?.gagal).toMatch(/404/);
    expect(r.kelompok.suspensi).toMatchObject({ emiten: 1, emiten_lengkap: 1, kredit: 10 });
  });

  it('pembanding dari daftar perusahaan membuang yang pernah disuspensi', () => {
    const rencana: Rencana = {
      keterangan: '',
      parameter: PARAMETER_AUDIT,
      gudang_lama: ['ULTJ'],
      kelompok_suspensi: [],
      kelompok_pembanding: null,
      pembanding_dari: null,
      kredit_terburuk: 0,
    };
    const r = isiPembanding(
      rencana,
      { results: [{ symbol: 'ABCD.JK' }, { symbol: 'ULTJ.JK' }, { symbol: 'EFGH.JK' }], pagination: { total_count: 950 } },
      folder,
    );
    expect(r.kelompok_pembanding).toEqual(['EFGH']);
    expect(r.pembanding_dari).toMatchObject({ total_count: 950, baris_dibaca: 3, dibuang_pernah_suspensi: 1, dibuang_gudang_lama: 1 });
  });
});
