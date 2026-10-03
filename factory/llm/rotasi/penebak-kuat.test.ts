/**
 * M2d-16 D-3: penebak kuat satu-soal (Opus 5.5, effort "low", 4 rotasi, tanpa
 * kartu) — pemanggil palsu saja; dan hitungan audit Opus tersimpan.
 */
import { describe, expect, it } from 'vitest';
import type { KunciOpsi, OmonganDraf } from '../draf.ts';
import { AKAR } from '../env.ts';
import type { PesanChat } from '../klien.ts';
import { MODEL_OR_OPUS } from '../model.ts';
import { jawabPalsu } from '../templat/palsu.ts';
import type { InfoTemplat, PanggilTemplat } from '../templat/penulis.ts';
import { auditOpusTersimpan, plaseboOpus, putusanKuat, ringkasAuditOpus, SETELAN_PENEBAK_KUAT, tebakKuat } from './penebak-kuat.ts';
import { PETUNJUK_ROTASI, pesanRotasi, putar, type JawabanRotasi } from './rotasi.ts';

const O: OmonganDraf = {
  nama: 'Sari', jam: '19.10', pesan: 'Katanya dividennya naik terus tiap tahun.', angka_pesan: [], kartu: ['f1'], kartu_penentu: ['f1'],
  pilihan: { a: 'Betul, dividennya naik tiap tahun.', b: 'Keliru, dividennya pernah turun.', c: 'Betul, dividennya selalu dibayar.', d: 'Keliru, dividennya tidak pernah ada.' },
  kunci: 'b', penjelasan: '-',
};
const HURUF: readonly KunciOpsi[] = ['a', 'b', 'c', 'd'];

function opsi(user: string): Record<KunciOpsi, string> {
  const h = {} as Record<KunciOpsi, string>;
  for (const x of HURUF) h[x] = new RegExp(`^${x}\\) (.*)$`, 'm').exec(user)?.[1] ?? '';
  return h;
}

/** Penebak palsu: `pilih(r)` = teks isi yang disalin di rotasi r (null = jawaban tak terbaca). */
function palsu(pilih: (r: number, ulang: number) => string | null): { panggil: PanggilTemplat; log: Array<{ info: InfoTemplat; pesan: PesanChat[]; setelan: unknown }> } {
  const log: Array<{ info: InfoTemplat; pesan: PesanChat[]; setelan: unknown }> = [];
  const panggil: PanggilTemplat = (pesan, setelan, info) => {
    log.push({ info, pesan, setelan });
    const t = pilih(info.ke - 1, info.ulang ?? 0);
    return Promise.resolve({ ...jawabPalsu(t === null ? 'maaf, saya tidak bisa menjawab' : JSON.stringify({ teks: t, alasan: 'tebakan' }), 900), biaya_usd: 0.02 });
  };
  return { panggil, log };
}

function j(isi: Array<number | null>, kunci = 1): JawabanRotasi[] {
  return isi.map((x, r) => ({ model: MODEL_OR_OPUS, kondisi: 'pesan-pilihan', r, huruf: x === null ? null : 'a', isi: x, isi_kunci: kunci, terbaca: x !== null, salinan: null, skor: null, alasan: '', biaya_usd: 0, panggilan: 1 }));
}

describe('putusanKuat', () => {
  it('kunci ≥ 3 dari rotasi terbaca → tolak; ≤ 2 → lulus', () => {
    expect(putusanKuat(j([1, 1, 1, 1])).putusan).toBe('tolak');
    expect(putusanKuat(j([1, 1, 1, 0])).putusan).toBe('tolak');
    expect(putusanKuat(j([1, 1, 0, 0])).putusan).toBe('lulus');
    expect(putusanKuat(j([0, 0, 0, 0])).putusan).toBe('lulus');
  });
  it('tak terbaca dibuang: 3 terbaca semuanya kunci → tolak; 2 tak terbaca (> 1/3) → tak-terukur', () => {
    expect(putusanKuat(j([1, 1, 1, null]))).toMatchObject({ putusan: 'tolak', kunci: 3, n: 4 - 1, tak_terbaca: 1 });
    expect(putusanKuat(j([1, 1, null, 0])).putusan).toBe('lulus');
    expect(putusanKuat(j([1, 1, null, null])).putusan).toBe('tak-terukur');
  });
  it('konsisten memilih satu PENGECOH bukan alasan menolak, tetapi dicatat', () => {
    const p = putusanKuat(j([2, 2, 2, 2]));
    expect(p.putusan).toBe('lulus');
    expect(p.isi_konsisten).toBe(2);
  });
});

describe('tebakKuat (pemanggil palsu)', () => {
  it('4 panggilan Opus, satu soal per panggilan, tanpa kartu, prompt = penebak rotasi pesan+pilihan, effort "low"', async () => {
    const p = palsu(() => O.pilihan.b);
    const h = await tebakKuat(O, { panggil: p.panggil, putaran: 2, omongan: 3 });
    expect(p.log).toHaveLength(4);
    expect(p.log.map((x) => x.info)).toEqual([1, 2, 3, 4].map((ke) => ({ jenis: 'gerbang-tebak-kuat', putaran: 2, omongan: 3, ke, peran: 'penebak', model: MODEL_OR_OPUS })));
    p.log.forEach((x, r) => {
      expect(x.pesan).toEqual(pesanRotasi('pesan-pilihan', { nama: O.nama, jam: O.jam, pesan: O.pesan, pilihan: putar(O, r).pilihan }));
      expect(x.pesan[0]?.content).toBe(PETUNJUK_ROTASI);
      expect(x.pesan[1]?.content).not.toMatch(/kartu/i);
      expect(x.setelan).toBe(SETELAN_PENEBAK_KUAT);
    });
    expect(SETELAN_PENEBAK_KUAT.tambahanBadan).toEqual({ reasoning: { effort: 'low', exclude: false } });
    expect(h.putusan.putusan).toBe('tolak');
    expect(h.jawaban.map((x) => x.isi)).toEqual([1, 1, 1, 1]);
    expect(h.biaya_usd).toBeCloseTo(0.08, 6);
  });

  it('penebak yang selalu memilih HURUF yang sama (isi berganti tiap rotasi) → kunci 1/4 → lulus', async () => {
    const p = palsu((r) => opsiRotasi(r).a);
    const h = await tebakKuat(O, { panggil: p.panggil, putaran: 1, omongan: 1 });
    expect(h.putusan).toMatchObject({ putusan: 'lulus', kunci: 1, n: 4 });
  });

  it('jawaban tak terbaca diulang sekali; tetap tak terbaca → dibuang (bukan dihitung kunci)', async () => {
    const p = palsu((r, ulang) => (r === 0 ? null : r === 1 && ulang === 0 ? null : O.pilihan.a));
    const h = await tebakKuat(O, { panggil: p.panggil, putaran: 1, omongan: 1 });
    expect(p.log).toHaveLength(6);
    expect(h.jawaban.map((x) => x.isi)).toEqual([null, 0, 0, 0]);
    expect(h.putusan).toMatchObject({ putusan: 'lulus', kunci: 0, n: 3, tak_terbaca: 1 });
  });
});

function opsiRotasi(r: number): Record<KunciOpsi, string> {
  return opsi(pesanRotasi('pesan-pilihan', { nama: O.nama, jam: O.jam, pesan: O.pesan, pilihan: putar(O, r).pilihan })[1]?.content ?? '');
}

describe('audit Opus satu-soal tersimpan (M2d-13 + M2d-15)', () => {
  const butir = auditOpusTersimpan(AKAR);
  it('15 butir × 4 rotasi; konsisten kunci 10, konsisten satu pengecoh 3, tak konsisten 2 (acuan reviewer)', () => {
    expect(butir).toHaveLength(15);
    expect(butir.every((b) => b.isi.length === 4 && b.isi.every((x) => x !== null))).toBe(true);
    expect(ringkasAuditOpus(butir)).toEqual({ n: 15, kunci: 10, pengecoh: 3, tak_konsisten: 2 });
  });
  it('putusan penebak kuat atas data tersimpan = tertebak ≥ 3/4 di nilai.json', () => {
    expect(butir.filter((b) => putusanKuat(b.jawaban).putusan === 'tolak')).toHaveLength(10);
  });
  it('plasebo: tiap pengecoh diperlakukan sebagai kunci → 3 dari 45 ditolak', () => {
    expect(plaseboOpus(butir)).toEqual({ n: 45, ditolak: 3 });
  });
});
