/**
 * Uji ulang D-3 (tanpa jaringan): alur penuh dengan model palsu pada soal bank
 * sungguhan, putusan inti (syarat 1–3; pemanasan tanpa syarat 3), label
 * perbandingan lama vs baru, data H2, dan pagu milestone M2d-11.
 */
import { mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import type { KunciOpsi } from '../draf.ts';
import { jawabPalsu } from '../templat/palsu.ts';
import type { PanggilTemplat } from '../templat/penulis.ts';
import { bankUjiUlang } from './bank-lama.ts';
import { biayaMilestoneM2d11, paguJalanM2d11, pencatatM2d11, sisaPaguM2d11 } from './konfig.ts';
import { bandingLamaBaru, putusanInti, ringkasUjiUlang, ukurSoal, type MentahUjiUlang } from './uji-ulang.ts';

const H: readonly KunciOpsi[] = ['a', 'b', 'c', 'd'];
function opsiDari(user: string): Record<KunciOpsi, string> {
  const h = {} as Record<KunciOpsi, string>;
  for (const x of H) h[x] = (new RegExp(`^${x}\\) (.*)$`, 'm').exec(user)?.[1] ?? '');
  return h;
}

/** Penebak palsu memilih huruf (2r mod 4) → isi berganti, kunci 1/4; pembaca kartu memilih isi kunci asal. */
function palsu(kunciTeks: string): PanggilTemplat {
  return async (pesan, _s, info) => {
    const opsi = opsiDari(pesan[1]?.content ?? '');
    if (info.jenis === 'gerbang-kartu') {
      const h = H.find((x) => opsi[x] === kunciTeks) ?? 'a';
      return jawabPalsu(JSON.stringify({ pilihan: h, kartu: [1], alasan: 'kartu 1', membingungkan: [] }));
    }
    const r = (info.ke - 1) % 4;
    return jawabPalsu(JSON.stringify({ teks: opsi[H[(2 * r) % 4] as KunciOpsi], alasan: 'x' }), 0);
  };
}

describe('uji ulang dengan model palsu', () => {
  const bank = bankUjiUlang();
  it('soal tayang: kartu 2/2 benar, rotasi lulus (kunci 3/12), putusan inti ikut detektor', async () => {
    const b = bank[0];
    if (b === undefined) throw new Error('bank kosong');
    const { teksPolos } = await import('../../skema/rujukan.ts');
    const m = await ukurSoal(b, palsu(teksPolos(b.omongan.pilihan[b.omongan.kunci])));
    expect(m.kartu?.lulus).toBe(true);
    expect(m.rotasi?.putusan.putusan).toBe('lulus');
    expect(m.rotasi?.putusan.kondisi['pesan-pilihan'].kunci).toBe(3);
    expect(putusanInti(m).s3_tebak).toBe('lulus');
  });
});

const dasar = (x: Partial<MentahUjiUlang>): MentahUjiUlang => ({
  id: 'x', kelompok: 'lama', asal: '', tertebak_luar: false, luar: null, kunci: 'a', pemanasan: false, detektor: [],
  kartu: { per_rotasi: [], lulus: true },
  rotasi: { jawaban: [], putusan: { putusan: 'lulus', alasan: [], kondisi: { 'pilihan-saja': { per_model: [], kunci: 0, n: 0, proporsi: null, tak_terbaca: 0 }, 'pesan-pilihan': { per_model: [], kunci: 0, n: 0, proporsi: null, tak_terbaca: 0 } } } },
  biaya_usd: 0, ...x,
});

describe('putusan inti & perbandingan', () => {
  it('lulus hanya bila kartu 2/2, nol bendera menolak, rotasi lulus', () => {
    expect(putusanInti(dasar({})).lulus).toBe(true);
    expect(putusanInti(dasar({ kartu: { per_rotasi: [], lulus: false } })).lulus).toBe(false);
    expect(putusanInti(dasar({ detektor: [{ kode: 'D1', nama: '', status: 'menolak', opsi: ['a'], alasan: '' }] })).lulus).toBe(false);
    expect(putusanInti(dasar({ detektor: [{ kode: 'D1', nama: '', status: 'dicatat', opsi: ['a'], alasan: '' }] })).lulus).toBe(true);
    const abu = dasar({});
    if (abu.rotasi !== null) abu.rotasi.putusan.putusan = 'abu-abu';
    expect(putusanInti(abu).lulus).toBe(false);
  });
  it('pemanasan: syarat 3 tidak disyaratkan', () => {
    const m = dasar({ pemanasan: true });
    if (m.rotasi !== null) m.rotasi.putusan.putusan = 'gagal';
    expect(putusanInti(m)).toMatchObject({ s3_tebak: 'tidak-disyaratkan', lulus: true });
  });
  it('kemungkinan artefak posisi = tertebak luar dulu, lulus rotasi kini', () => {
    expect(bandingLamaBaru(dasar({ tertebak_luar: true }))).toMatch(/artefak posisi/);
    const g = dasar({ tertebak_luar: false });
    if (g.rotasi !== null) g.rotasi.putusan.putusan = 'gagal';
    expect(bandingLamaBaru(g)).toMatch(/kebalikan/);
  });
  it('ringkasan menghitung hanya soal lengkap', () => {
    const r = ringkasUjiUlang([dasar({}), dasar({ id: 'y', kartu: null })]);
    expect(r.terukur).toBe(1);
    expect(r.lulus_inti).toEqual(['x']);
  });
});

describe('pagu M2d-11', () => {
  const d = mkdtempSync(join(tmpdir(), 'm2d11-'));
  const ledger = join(d, 'ledger.jsonl');
  const e = (tag: string, usd: number): string => JSON.stringify({ waktu: '2026-10-02T00:00:00Z', model: 'x', tag, percobaan_http: 1, status: 200, token_masuk: 1, token_keluar: 1, biaya_usd: usd, dasar_biaya: 'usage-cost', perkiraan_maks_usd: 0, latensi_ms: 1, galat: null });
  writeFileSync(ledger, [e('m2d10/x', 3), e('m2d11/uji-ulang/a', 0.5), e('penyusun/m2d11-tirt-1/p1', 4.2), e('penyusun/demo/x', 9)].join('\n') + '\n');
  it('biaya milestone = tag m2d11/ + penyusun/m2d11-; sisa dan pagu jalan', () => {
    expect(biayaMilestoneM2d11(ledger)).toBeCloseTo(4.7, 9);
    expect(sisaPaguM2d11(ledger)).toBe(0.3);
    expect(paguJalanM2d11(ledger)).toBe(0.3);
  });
  it('sisa < US$0,30 → tidak ada jalan', () => {
    writeFileSync(ledger, [e('m2d11/uji-ulang/a', 0.8), e('penyusun/m2d11-tirt-1/p1', 4.0)].join('\n') + '\n');
    expect(paguJalanM2d11(ledger)).toBeNull();
  });
  it('pagu milestone tag m2d11/ = 5 − biaya jalan penyusun M2d-11; bagian uji ulang 0,80', () => {
    const p = pencatatM2d11(20, ledger);
    expect(p.paguMilestone?.usd).toBeCloseTo(1.0, 9);
    expect(p.paguBagian.find((b) => b.awalanTag === 'm2d11/uji-ulang/')?.usd).toBe(0.8);
    expect(() => p.periksa('anthropic/claude-haiku-4.5', [{ role: 'user', content: 'x' }], 300, 'm2d11/uji-ulang/z')).toThrow(/Pagu/);
  });
});
