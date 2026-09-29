/**
 * M2d-5 T-04: G-penilaian (D-5) dan G-mirip (D-6) — gerbang kode milik
 * pemeriksa. Diuji terhadap soal manusia yang hidup (`cases/*.json`, harus
 * lolos semua) dan terhadap kegagalan M2d-4 yang memicu kontrak ini (harus
 * ditolak).
 */
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import type { DrafSimulasi, KunciOpsi, OmonganDraf } from './draf.ts';
import { AKAR } from './env.ts';
import { ambangMirip, ambangMiripDari, gMirip, kemiripan, kerangkaPilihan, type KasusMirip } from './gerbang-mirip.ts';
import { DAFTAR_PENILAIAN, PENGECUALIAN_PENILAIAN, gPenilaian } from './gerbang-penilaian.ts';

interface SoalKasus {
  pesan: { isi: string };
  pilihan: Array<{ teks: string }>;
}
const KASUS = ['dada-2025-10-08', 'ultj-2026-05-04'].map((f) => ({
  berkas: `cases/${f}.json`,
  soal: (JSON.parse(readFileSync(`${AKAR}cases/${f}.json`, 'utf8')) as { soal: SoalKasus[] }).soal,
}));
const ULTJ_M2D4 = (JSON.parse(readFileSync(`${AKAR}eval/keluaran-m2d4/ultj/draf-akhir.json`, 'utf8')) as { draf: DrafSimulasi }).draf;
const TIRT_M2D4 = (JSON.parse(readFileSync(`${AKAR}eval/keluaran-m2d4/tirt/riwayat.json`, 'utf8')) as { riwayat: Array<{ draf: Array<OmonganDraf | null> }> }).riwayat.at(-1)?.draf ?? [];
const pil = (s: SoalKasus): Record<KunciOpsi, string> => Object.fromEntries(s.pilihan.map((p, i) => ['abcd'[i], p.teks])) as Record<KunciOpsi, string>;

describe('G-penilaian (D-5) — penilaian investasi/ajakan di pesan teman ditolak, apa pun kuncinya', () => {
  it('ULTJ M2d-4 omongan 1 ("… Aman lah.", kunci Betul) DITOLAK', () => {
    const o1 = ULTJ_M2D4.omongan[0] as OmonganDraf;
    expect(o1.pesan).toContain('Aman lah.');
    expect(o1.pilihan[o1.kunci]).toMatch(/^Betul,/);
    const r = gPenilaian(o1.pesan);
    expect(r.tolak).toBe(true);
    expect(r.temuan).toEqual([{ frasa: 'Aman', golongan: 'rasa aman atau mutu saham' }]);
  });

  it('SEMUA pesan manusia di cases/*.json lolos; satu-satunya yang butuh pengecualian ("kabar buruk") tercatat dengan alasannya', () => {
    const pesan = KASUS.flatMap((k) => k.soal.map((s) => s.pesan.isi));
    expect(pesan).toHaveLength(6);
    for (const p of pesan) expect(gPenilaian(p), p).toMatchObject({ tolak: false, temuan: [] });
    expect(PENGECUALIAN_PENILAIAN.map((x) => x.frasa)).toEqual(['kabar buruk']);
    expect(PENGECUALIAN_PENILAIAN[0]?.alasan).toMatch(/ULTJ omongan 1/);
    // Tanpa pengecualian, pesan manusia ULTJ 1 akan tertolak oleh "buruk".
    const ultj1 = KASUS[1]?.soal[0]?.pesan.isi ?? '';
    expect(ultj1).toContain('kabar buruk');
    expect(DAFTAR_PENILAIAN.some((p) => new RegExp(p.pola.source, p.pola.flags).test(ultj1))).toBe(true);
  });

  it('daftar kontrak ditolak: aman, pasti naik, pasti cuan, layak beli, beli aja, jual aja, prospek cerah, sehat, bagus buat investasi', () => {
    for (const k of ['Aman kok', 'pasti naik besok', 'ini pasti cuan', 'layak beli nih', 'beli aja', 'jual aja deh', 'prospek cerah', 'perusahaannya sehat', 'bagus buat investasi', 'dijamin untung', 'ga mungkin turun', 'buruan beli', 'serok bawah', 'amannya gimana']) {
      expect(gPenilaian(`Eh ${k}.`).tolak, k).toBe(true);
    }
  });

  it('kata yang hanya mirip tidak ditolak: keamanan, kesehatan, memburuk, "pasti mau dibeli", "bakal naik" (dugaan yang dicek kartu)', () => {
    for (const k of ['sistem keamanan bursa', 'laporan kesehatan', 'kondisinya memburuk', 'Pasti mau dibeli investor asing', 'dia yakin harganya masih bakal naik', 'Gue pegang 10 lot', 'Pasti ada kabar buruk!']) {
      expect(gPenilaian(k).tolak, k).toBe(false);
    }
  });
});

describe('G-mirip (D-6) — pola pilihan dua omongan satu simulasi tidak boleh hampir sama', () => {
  it('kerangka: label, angka, rupiah, bulan, emiten diganti penanda', () => {
    expect(kerangkaPilihan('Betul, [[div|Rp130]] di Perusahaan U pada 4 Mei, naik 2,21 kali.')).toEqual(['‹rp›', 'di', '‹emiten›', 'pada', '‹n›', '‹bln›', 'naik', '‹n›', 'kali']);
  });

  it('ambang diturunkan dari kasus manusia: 4 × kemiripan manusia terbesar (0,10 → 0,40); semua pasangan manusia di bawahnya', () => {
    const a = ambangMiripDari(KASUS as unknown as KasusMirip[]);
    expect(a.maks_manusia).toBeCloseTo(0.1, 3);
    expect(a.ambang).toBeCloseTo(0.4, 3);
    expect(ambangMirip().ambang).toBe(a.ambang);
    for (const k of KASUS) {
      const p = k.soal.map(pil);
      for (let i = 0; i < p.length; i++) {
        const draf = p.map((x) => ({ pilihan: x }));
        expect(gMirip(i + 1, draf, new Set([1, 2, 3]).add(0)).tolak, `${k.berkas} ${String(i + 1)}`).toBe(false);
      }
    }
    // Bila kasus manusia berubah, ambang mengikuti.
    const s1 = KASUS[1]?.soal[1] as SoalKasus;
    const lebihMirip = [{ berkas: 'x', soal: [s1, s1] }] as unknown as KasusMirip[];
    expect(ambangMiripDari(lebihMirip).ambang).toBe(4);
  });

  it('TIRT M2d-4 omongan 1 & 3 ("… disetop karena …" ×4) DITOLAK; omongan 2 tidak', () => {
    const o1 = TIRT_M2D4[0] as OmonganDraf;
    const o3 = TIRT_M2D4[2] as OmonganDraf;
    expect(o1.pilihan.a).toMatch(/disetop karena/);
    expect(o3.pilihan.a).toMatch(/dihentikan karena/);
    expect(kemiripan(o1.pilihan, o3.pilihan)).toBeGreaterThan(0.7);
    // Omongan 3 terkunci dulu (putaran 1); omongan 1 datang sesudahnya → omongan 1 yang ditolak.
    const r = gMirip(1, [o1, null, o3], new Set([3]));
    expect(r.tolak).toBe(true);
    expect(r.alasan[0]).toMatch(/hampir sama dengan omongan 3 \(kemiripan kerangka 0,7\d ≥ ambang 0,40\)/);
    // Dua-duanya baru: yang bernomor lebih besar ditulis ulang.
    expect(gMirip(3, [o1, null, o3], new Set()).tolak).toBe(true);
    expect(gMirip(1, [o1, null, o3], new Set()).tolak).toBe(false);
  });

  it('dua soal berbeda yang berbagi satu kata ("penutupan", DADA M2d-4 1–3 = 0,29) lolos', () => {
    const d = (JSON.parse(readFileSync(`${AKAR}eval/keluaran-m2d4/dada/riwayat.json`, 'utf8')) as { riwayat: Array<{ draf: Array<OmonganDraf | null> }> }).riwayat.at(-1)?.draf ?? [];
    const k = kemiripan((d[0] as OmonganDraf).pilihan, (d[2] as OmonganDraf).pilihan);
    expect(k).toBeGreaterThan(0.2);
    expect(k).toBeLessThan(0.4);
    expect(gMirip(3, d, new Set([1, 2])).tolak).toBe(false);
  });
});
