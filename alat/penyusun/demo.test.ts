/**
 * M2d-14 T-2: inti mode demo (D-1, D-2) atas jalan nyata `eval/penyusun/m2d13-opus-2`.
 *
 * - draf terpilih = versi akhir tiap omongan dari hasil.json (o1 & o3 lolos, o2 ditolak kode);
 * - suntingan penyetuju SUNGGUH diuji ulang gerbang kode (sama dengan langkah 1 mesin bebas)
 *   + validator seluruh draf; isian reviewer (putaran 1) ditolak dengan alasan nyata;
 * - gerbang AI = urutan & putusan mesin bebas, berpagu (PaguTercapai → berhenti "pagu",
 *   panggilan tidak dikirim); pagu > US$0,15 ditolak; tanpa pagu → "belum diuji ulang";
 * - hasil uji ulang sungguhan disimpan dan diputar lagi tanpa panggilan (sumber "tersimpan");
 * - setujui hanya bila semua lolos dan HANYA menulis persetujuan-demo.json.
 */
import { appendFileSync, cpSync, mkdtempSync, readFileSync, readdirSync, rmSync, statSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import type { KunciOpsi } from '../../factory/llm/draf.ts';
import { panggilBebasPalsu } from '../../factory/llm/bebas/palsu.ts';
import { jawabPalsu, KRITIK_BERSIH } from '../../factory/llm/templat/palsu.ts';
import type { PanggilTemplat } from '../../factory/llm/templat/penulis.ts';
import { teksPolos } from '../../factory/skema/rujukan.ts';
import { akarSementara } from './bantu-uji.ts';
import {
  AWALAN_TAG_DEMO, bungkusKritikusDemo, Demo, drafTerpilih, gerbangKodeDemo, MAKS_TOKEN_KRITIKUS_DEMO, muatBerkasSuntingan, PAGU_UJI_ULANG_MAKS_USD,
  sidikOmongan, terapkanUbah, ujiGerbangAi, type OpsiDemo,
} from './demo.ts';
import { panggilSungguhan } from './mesin.ts';
import { KRITIKUS_TERKUNCI_A1 } from './mesin-templat.ts';

const AKAR = fileURLToPath(new URL('../../', import.meta.url));
const JALAN = join(AKAR, 'eval', 'penyusun', 'm2d13-opus-2');
const SUNTINGAN = join(AKAR, 'alat', 'penyusun', 'rekaman', 'suntingan-m2d13-opus-2.json');

function salinJalan(): string {
  const d = mkdtempSync(join(tmpdir(), 'demo-jalan-'));
  const f = join(d, 'm2d13-opus-2');
  cpSync(JALAN, f, { recursive: true });
  // Salinan bersih: putusan demo dari rekaman sebelumnya (bila ada) tidak ikut.
  rmSync(join(f, 'persetujuan-demo.json'), { force: true });
  return f;
}

function sidikFolder(f: string): Record<string, string> {
  return Object.fromEntries(readdirSync(f).map((n) => [n, `${String(statSync(join(f, n)).size)}:${readFileSync(join(f, n), 'utf8').length}`]));
}

const opsi = (o: Partial<OpsiDemo> = {}): OpsiDemo => ({
  akar: akarSementara(),
  folderJalan: JALAN,
  pilihDraf: 'akhir',
  jalurSuntingan: SUNTINGAN,
  paguUjiUlangUsd: null,
  jam: () => new Date('2026-10-03T03:00:00Z'),
  log: () => undefined,
  folderSimpan: mkdtempSync(join(tmpdir(), 'demo-simpan-')),
  ...o,
});

/** Pemanggil palsu gerbang AI: penebak berganti isi (lolos), pembaca kartu memilih teks kunci, kritikus bersih. */
function panggilLolos(teksKunci: string): { panggil: PanggilTemplat; jenis: string[]; setelan: Array<{ jenis: string; maxTokens: number }> } {
  const dasar = panggilBebasPalsu().panggil;
  const jenis: string[] = [];
  const setelan: Array<{ jenis: string; maxTokens: number }> = [];
  const panggil: PanggilTemplat = async (pesan, s, info) => {
    jenis.push(info.jenis);
    setelan.push({ jenis: info.jenis, maxTokens: s.maxTokens });
    if (info.jenis === 'gerbang-kartu') {
      const user = pesan[1]?.content ?? '';
      const h = (['a', 'b', 'c', 'd'] as KunciOpsi[]).find((x) => new RegExp(`^${x}\\) (.*)$`, 'm').exec(user)?.[1] === teksKunci) ?? 'a';
      return jawabPalsu(JSON.stringify({ pilihan: h, kartu: [1], alasan: 'kartu 1', membingungkan: [] }));
    }
    if (info.jenis === 'kritikus') return jawabPalsu(KRITIK_BERSIH, 5_000);
    return dasar(pesan, s, info);
  };
  return { panggil, jenis, setelan };
}

describe('draf terpilih dan berkas suntingan', () => {
  it('akhir = versi 2 tiap omongan; o1 & o3 lolos di jalan, o2 ditolak gerbang kode', () => {
    const t = drafTerpilih(JALAN, 'akhir');
    expect(t.map((x) => [x.no, x.versi, x.lulus_jalan, x.berhenti])).toEqual([[1, 2, true, 'lolos'], [2, 2, false, 'kode'], [3, 2, true, 'lolos']]);
    expect(t[1]?.alasan.join(' ')).toMatch(/G-angka-cukup/);
  });

  it('berkas suntingan: putaran 1 = isian reviewer (5 ubahan omongan 2, kunci tetap b)', () => {
    const b = muatBerkasSuntingan(SUNTINGAN);
    expect(b.jalan).toBe('m2d13-opus-2');
    const p1 = b.putaran[0];
    expect(p1?.oleh).toMatch(/^reviewer/);
    expect(p1?.ubah.map((u) => ('lokasi' in u ? u.lokasi : 'tukar'))).toEqual(['pesan', 'pilihan-a', 'pilihan-b', 'pilihan-c', 'pilihan-d']);
    expect(p1?.ubah.every((u) => u.omongan === 2)).toBe(true);
    const tampil = p1?.ubah.map((u) => ('teks' in u ? teksPolos(u.teks) : '')) ?? [];
    expect(tampil).toEqual([
      'Katanya sejak akhir November harga Perusahaan T udah lebih dari dua kali lipat. Beneran ga sih?',
      'Keliru, kartu hanya mencatat selisih Rp58.',
      'Betul, kartu hitungan mencatat 2,21 kali lipat.',
      'Betul, 2,21 kali lipat itu dihitung sejak awal tahun.',
      'Keliru, kenaikannya terjadi bertahap selama 9 hari bursa.',
    ]);
  });
});

describe('suntingan diuji ulang gerbang kode sungguhan', () => {
  it('pesan baru melepas angka pesan Rp48/Rp106 dan mencatatnya', () => {
    const [, o2] = drafTerpilih(JALAN, 'akhir');
    const h = terapkanUbah(o2!.omongan, { omongan: 2, lokasi: 'pesan', teks: 'Katanya sejak akhir November harga Perusahaan T udah lebih dari dua kali lipat. Beneran ga sih?' });
    expect(h.baru.angka_pesan).toEqual([]);
    expect(h.catatan[0]).toMatch(/Rp48, Rp106 dilepas/);
    expect(h.dari).toMatch(/^Gw cek, dari Rp48 ke Rp106/);
  });

  it('tukar b ↔ c memindahkan teks, label pengecoh, dan huruf kunci', () => {
    const [, o2] = drafTerpilih(JALAN, 'akhir');
    const h = terapkanUbah(o2!.omongan, { omongan: 2, tukar: ['b', 'c'] });
    expect(h.baru.kunci).toBe('c');
    expect(h.baru.pilihan.c).toBe(o2!.omongan.pilihan.b);
    expect(h.baru.pengecoh.b).toEqual(o2!.omongan.pengecoh.c);
    expect(h.baru.pengecoh.c).toBeUndefined();
  });

  it('versi agen yang lolos (o1) lolos gerbang kode; isian reviewer (putaran 1) DITOLAK dengan alasan nyata', () => {
    const d = new Demo(opsi());
    const t = drafTerpilih(JALAN, 'akhir');
    expect(gerbangKodeDemo(1, t.map((x) => x.omongan), d.paket, new Set([3])).menolak).toEqual([]);
    const b = muatBerkasSuntingan(SUNTINGAN);
    let kode = null as ReturnType<Demo['sunting']>['kode'] | null;
    for (const u of b.putaran[0]?.ubah ?? []) kode = d.sunting(u).kode;
    expect(kode?.lolos).toBe(false);
    const teks = [...(kode?.menolak ?? []).map((m) => `${m.sumber}: ${m.alasan}`), ...(kode?.seluruh_draf ?? [])].join('\n');
    expect(teks).toMatch(/ANGKA_TANPA_RUJUKAN: Pilihan d memuat angka di luar rujukan: 9/);
    expect(teks).toMatch(/angka-di-kartu: pilihan d: angka di luar rujukan kartu: 9/);
    expect(teks).toMatch(/detektor D9/);
    expect(teks).toMatch(/detektor D5/);
    expect(teks).toMatch(/KUNCI_SERAGAM/);
    expect(d.suntingan.map((s) => [s.ke, s.putaran, s.sesuai_berkas])).toEqual([[1, 1, true], [2, 1, true], [3, 1, true], [4, 1, true], [5, 1, true]]);
    expect(d.boleh().boleh).toBe(false);
    expect(d.statusOmongan()[1]?.keterangan).toBe('disunting; gerbang kode masih menolak');
    // gerbang AI tidak dijalankan sebelum gerbang kode lolos
    expect(() => d.mulaiUjiAi(true)).toThrow(/Gerbang kode masih menolak omongan 2/);
  });

  it('putaran 2 (usulan eksekutor dari alasan gerbang) lolos gerbang kode + validator seluruh draf; kunci pindah ke c', () => {
    const d = new Demo(opsi());
    const b = muatBerkasSuntingan(SUNTINGAN);
    let kode = null as ReturnType<Demo['sunting']>['kode'] | null;
    for (const p of b.putaran.slice(0, 2)) for (const u of p.ubah) kode = d.sunting(u).kode;
    expect(kode?.menolak).toEqual([]);
    expect(kode?.seluruh_draf).toEqual([]);
    expect(kode?.lolos).toBe(true);
    expect(d.draf[1]?.kunci).toBe('c');
    expect(d.statusOmongan()[1]?.keterangan).toBe('disunting; gerbang kode lolos; gerbang AI belum diuji ulang');
    expect(d.perluUjiAi()).toEqual([2]);
    // tanpa pagu dan tanpa hasil tersimpan: gerbang AI belum diuji ulang
    expect(() => d.mulaiUjiAi(true)).toThrow(/Gerbang AI belum diuji ulang/);
    expect(d.boleh().alasan).toMatch(/gerbang AI belum diuji ulang/);
  });

  it('suntingan di luar berkas tetap diuji dan dicatat sesuai_berkas = false', () => {
    const d = new Demo(opsi());
    const { catatan } = d.sunting({ omongan: 2, lokasi: 'penjelasan', teks: 'Penjelasan lain yang tidak ada di berkas.' });
    expect(catatan.sesuai_berkas).toBe(false);
    expect(catatan.putaran).toBeNull();
  });
});

describe('gerbang AI: urutan mesin bebas, berpagu', () => {
  it('pagu uji ulang > US$0,15 ditolak', () => {
    expect(PAGU_UJI_ULANG_MAKS_USD).toBe(0.15);
    expect(() => new Demo(opsi({ paguUjiUlangUsd: 0.2 }))).toThrow(/≤ US\$0,15|≤ US\$0.15/);
  });

  it('kritikus dibatasi MAKS_TOKEN_KRITIKUS_DEMO; penebak & pembaca kartu apa adanya; 24 + 2 + 1 panggilan', async () => {
    const [, o2] = drafTerpilih(JALAN, 'akhir');
    const o = o2!.omongan;
    const p = panggilLolos(teksPolos(o.pilihan[o.kunci]));
    const lapor: string[] = [];
    const h = await ujiGerbangAi(o, new Demo(opsi()).paket, 2, 1, bungkusKritikusDemo(p.panggil), (j) => lapor.push(j));
    expect(h.berhenti).toBe('lolos');
    expect(p.jenis.filter((j) => j === 'gerbang-tebak').length).toBe(24);
    expect(p.jenis.filter((j) => j === 'gerbang-kartu').length).toBe(2);
    expect(p.jenis.filter((j) => j === 'kritikus').length).toBe(1);
    expect(p.setelan.find((s) => s.jenis === 'kritikus')?.maxTokens).toBe(MAKS_TOKEN_KRITIKUS_DEMO);
    expect(p.setelan.find((s) => s.jenis === 'gerbang-kartu')?.maxTokens).not.toBe(MAKS_TOKEN_KRITIKUS_DEMO);
    expect(lapor.map((x) => x.split(' → ')[0])).toEqual([
      'uji ulang 1 · omongan 2 · penebak: tebak tanpa kartu',
      'uji ulang 1 · omongan 2 · pembaca kartu: jawab dengan kartu',
      'uji ulang 1 · omongan 2 · kritikus: kritikus makna',
    ]);
  });

  it('penebak menolak → berhenti di penebak; pembaca kartu & kritikus tidak dipanggil', async () => {
    const [, o2] = drafTerpilih(JALAN, 'akhir');
    const o = o2!.omongan;
    const jenis: string[] = [];
    const kunci = teksPolos(o.pilihan[o.kunci]);
    const panggil: PanggilTemplat = async (pesan, _s, info) => {
      jenis.push(info.jenis);
      const user = pesan[1]?.content ?? '';
      const h = (['a', 'b', 'c', 'd'] as KunciOpsi[]).find((x) => new RegExp(`^${x}\\) (.*)$`, 'm').exec(user)?.[1] === kunci) ?? 'a';
      return jawabPalsu(JSON.stringify({ teks: new RegExp(`^${h}\\) (.*)$`, 'm').exec(user)?.[1] ?? '', alasan: 'tebakan' }), 0);
    };
    const h = await ujiGerbangAi(o, new Demo(opsi()).paket, 2, 1, panggil, () => undefined);
    expect(h.berhenti).toBe('penebak');
    expect(jenis.every((j) => j === 'gerbang-tebak')).toBe(true);
  });

  it('pagu ditegakkan sebelum kirim: ledger m2d14/ sudah US$0,15 → panggilan tidak dikirim, berhenti "pagu"', async () => {
    const akar = akarSementara();
    appendFileSync(join(akar, '.cache', 'llm', 'ledger.jsonl'), `${JSON.stringify({ tag: `${AWALAN_TAG_DEMO}uji-ulang/lama/x`, biaya_usd: 0.15, model: 'z-ai/glm-5.3' })}\n`);
    const kirim: string[] = [];
    const asli = globalThis.fetch;
    globalThis.fetch = ((...a: Parameters<typeof fetch>) => {
      kirim.push(String(a[0]));
      return Promise.reject(new Error('tidak boleh ada jaringan di tes'));
    }) as typeof fetch;
    try {
      const buat = panggilSungguhan(akar, PAGU_UJI_ULANG_MAKS_USD, () => undefined, KRITIKUS_TERKUNCI_A1, AWALAN_TAG_DEMO);
      const [, o2] = drafTerpilih(JALAN, 'akhir');
      const d = new Demo(opsi({ akar }));
      const h = await ujiGerbangAi(o2!.omongan, d.paket, 2, 1, bungkusKritikusDemo(buat(`${AWALAN_TAG_DEMO}uji-ulang/uji/`, PAGU_UJI_ULANG_MAKS_USD)), () => undefined);
      expect(h.berhenti).toBe('pagu');
      expect(h.alasan[0]).toMatch(/Pagu milestone tercapai|Pagu tercapai/);
      expect(kirim).toEqual([]);
    } finally {
      globalThis.fetch = asli;
    }
  });
});

describe('uji ulang tersimpan dan persetujuan demo', () => {
  async function tungguSelesai(d: Demo): Promise<void> {
    for (let i = 0; i < 200 && d.sibuk; i++) await new Promise((s) => setTimeout(s, 5));
  }

  it('langsung (berpagu, palsu) → disimpan; demo berikut tanpa pagu memutar hasil tersimpan tanpa panggilan', async () => {
    const folderSimpan = mkdtempSync(join(tmpdir(), 'demo-simpan-'));
    const b = muatBerkasSuntingan(SUNTINGAN);
    const ubah = b.putaran.slice(0, 2).flatMap((p) => p.ubah);
    const d1 = new Demo(opsi({ folderSimpan, paguUjiUlangUsd: 0.15, buatPanggil: () => panggilLolos('').panggil }));
    for (const u of ubah) d1.sunting(u);
    const kunci = teksPolos(d1.draf[1]!.pilihan[d1.draf[1]!.kunci]);
    const p = panggilLolos(kunci);
    const d = new Demo(opsi({ folderSimpan, paguUjiUlangUsd: 0.15, buatPanggil: () => p.panggil }));
    for (const u of ubah) d.sunting(u);
    expect(() => d.mulaiUjiAi(false)).toThrow(/setujui di layar dulu/);
    const u = d.mulaiUjiAi(true);
    expect(u.sumber).toBe('langsung');
    await tungguSelesai(d);
    expect(u.hasil?.lolos).toBe(true);
    expect(readdirSync(join(folderSimpan, 'm2d13-opus-2')).sort()).toEqual([`${u.sidik.slice(0, 16)}.json`, `${u.sidik.slice(0, 16)}.jsonl`]);
    // demo baru TANPA pagu: hasil yang sama diputar dari simpanan, nol panggilan
    const nol = panggilLolos(kunci);
    const e = new Demo(opsi({ folderSimpan, buatPanggil: () => nol.panggil }));
    for (const x of ubah) e.sunting(x);
    const v = e.mulaiUjiAi(false);
    expect(v.sumber).toBe('tersimpan');
    expect(v.hasil?.lolos).toBe(true);
    expect(nol.jenis).toEqual([]);
    expect(v.sidik).toBe(sidikOmongan(e.draf[1]!));
  });

  it('setujui hanya bila semua lolos, dan HANYA menulis persetujuan-demo.json di folder jalan', async () => {
    const folderJalan = salinJalan();
    const sebelum = sidikFolder(folderJalan);
    const b = muatBerkasSuntingan(SUNTINGAN);
    const ubah = b.putaran.slice(0, 2).flatMap((p) => p.ubah);
    const d0 = new Demo(opsi({ folderJalan }));
    for (const u of ubah) d0.sunting(u);
    const p = panggilLolos(teksPolos(d0.draf[1]!.pilihan[d0.draf[1]!.kunci]));
    const d = new Demo(opsi({ folderJalan, paguUjiUlangUsd: 0.15, buatPanggil: () => p.panggil }));
    expect(() => d.setujui()).toThrow(/Masih ditolak/);
    for (const u of ubah) d.sunting(u);
    expect(() => d.setujui()).toThrow(/gerbang AI belum diuji ulang/);
    d.mulaiUjiAi(true);
    await tungguSelesai(d);
    expect(d.boleh()).toEqual({ boleh: true, alasan: null });
    const berkas = d.setujui();
    expect(berkas.endsWith('persetujuan-demo.json')).toBe(true);
    const sesudah = sidikFolder(folderJalan);
    expect(Object.keys(sesudah).filter((n) => !(n in sebelum))).toEqual(['persetujuan-demo.json']);
    for (const n of Object.keys(sebelum)) expect(sesudah[n], n).toBe(sebelum[n]);
    const isi = JSON.parse(readFileSync(join(folderJalan, 'persetujuan-demo.json'), 'utf8')) as Record<string, unknown>;
    expect(isi['mode']).toBe('demo');
    expect(String(isi['keterangan'])).toMatch(/BUKAN cases\//);
    expect(isi['semua_suntingan_sesuai_berkas']).toBe(true);
    expect(isi['putusan']).toBe('disetujui');
    expect(() => d.sunting({ omongan: 2, lokasi: 'penjelasan', teks: 'x x x x' })).toThrow(/sudah diputus/);
    expect(() => d.tolak('alasan apa pun')).toThrow(/sudah diputus/);
  });

  it('tolak (masih ditolak gerbang): putusan "ditolak" + alasan di persetujuan-demo.json saja; setujui sesudahnya ditolak', () => {
    const folderJalan = salinJalan();
    const sebelum = sidikFolder(folderJalan);
    const d = new Demo(opsi({ folderJalan }));
    for (const u of muatBerkasSuntingan(SUNTINGAN).putaran[0]?.ubah ?? []) d.sunting(u);
    expect(() => d.tolak('x')).toThrow(/paling sedikit 5 huruf/);
    const berkas = d.tolak(d.boleh().alasan);
    expect(berkas.endsWith('persetujuan-demo.json')).toBe(true);
    const sesudah = sidikFolder(folderJalan);
    expect(Object.keys(sesudah).filter((n) => !(n in sebelum))).toEqual(['persetujuan-demo.json']);
    for (const n of Object.keys(sebelum)) expect(sesudah[n], n).toBe(sebelum[n]);
    const isi = JSON.parse(readFileSync(join(folderJalan, 'persetujuan-demo.json'), 'utf8')) as Record<string, unknown>;
    expect(isi['putusan']).toBe('ditolak');
    expect(String(isi['alasan'])).toMatch(/^Masih ditolak: omongan 2/);
    expect(String(isi['keterangan'])).toMatch(/TIDAK DISETUJUI/);
    expect(() => d.setujui()).toThrow(/sudah diputus|Sudah diputus/);
  });
});
