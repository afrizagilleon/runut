/**
 * Pra-periksa kode gratis M2d-15 D-3 (pra-registrasi `docs/bukti/m2d15-praregistrasi.md`
 * §4): fungsi gerbang 1 yang SAMA dijalankan sebelum gerbang berbayar;
 * kegagalan dikembalikan ke penulis (≤ 2 tulis-ulang per versi, dicatat);
 * pra-periksa tidak pernah meloloskan omongan (putusan tetap dari gerbang 1).
 */
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { AKAR } from '../env.ts';
import { validasiM2d8 } from '../kalibrasi-soal.ts';
import { MODEL_OR_OPUS } from '../model.ts';
import { PaguTercapai, SaldoPenyediaHabis } from '../pagu.ts';
import type { PaketFakta } from '../paket.ts';
import { jalankanBebas, MAKS_PRA_PERIKSA, periksaKodeBebas, praPeriksaKode, type VersiBebas } from './mesin.ts';
import { beriLabel, drafTirt7, panggilBebasPalsu, tirt7O1Diperbaiki, type PenulisPalsu } from './palsu.ts';
import { drafDari, type OmonganBebas } from './skema.ts';

const paket = JSON.parse(readFileSync(`${AKAR}eval/penyusun/m2d11-tirt-7/paket.json`, 'utf8')) as PaketFakta;
const keluaran = (xs: Array<[number, OmonganBebas]>): string => JSON.stringify({ omongan: xs.map(([no, o]) => ({ no, ...o })) });
const [o1, o2, o3] = drafTirt7();
const o3Bersih = (): OmonganBebas =>
  beriLabel({ ...o3, pilihan: { ...o3.pilihan, b: 'Betul, selisih penutupannya [[naik-2025-11-26-2025-12-09|Rp58]] sejak [[kelipatan-2025-11-26-2025-12-09|26 November]].' } });
/** o1 dengan kunci dipindah ke d (c ↔ d) → bersama o2 & o3 (kunci d) huruf kunci seragam. */
const o1KunciD = (): OmonganBebas => {
  const x = tirt7O1Diperbaiki();
  return { ...x, pilihan: { ...x.pilihan, c: x.pilihan.d, d: x.pilihan.c }, kunci: 'd', pengecoh: { a: x.pengecoh.a, b: x.pengecoh.b, c: x.pengecoh.d } } as OmonganBebas;
};
/** o3 dengan kunci dipindah ke b (b ↔ d). */
const o3KunciB = (): OmonganBebas => {
  const x = o3Bersih();
  return { ...x, pilihan: { ...x.pilihan, b: x.pilihan.d, d: x.pilihan.b }, kunci: 'b', pengecoh: { a: x.pengecoh.a, c: x.pengecoh.c, d: x.pengecoh.b } } as OmonganBebas;
};
const ringkas = (vs: readonly VersiBebas[]): string[] => vs.map((v) => `${String(v.no)}/${String(v.versi)}:${v.berhenti}`);

describe('pra-periksa = gerbang 1 kode (fungsi sama) pada 30 versi tersimpan M2d-13', () => {
  const kasus: Array<{ jalan: string; no: number; versi: number; berhenti: string; alasan: string[]; o: OmonganBebas; terkini: Array<OmonganBebas | null>; lulus: Set<number> }> = [];
  for (const j of ['m2d13-opus-1', 'm2d13-opus-2', 'm2d13-haiku-1', 'm2d13-haiku-2']) {
    const h = JSON.parse(readFileSync(`${AKAR}eval/penyusun/${j}/hasil.json`, 'utf8')) as { versi: Array<{ no: number; versi: number; berhenti: string; alasan: string[]; omongan: OmonganBebas | null }> };
    const terkini: Array<OmonganBebas | null> = [null, null, null];
    const lulus = new Set<number>();
    for (const v of [...new Set(h.versi.map((x) => x.versi))]) {
      const vs = h.versi.filter((x) => x.versi === v);
      for (const x of vs) if (x.omongan !== null) terkini[x.no - 1] = x.omongan;
      for (const x of vs) if (x.omongan !== null) kasus.push({ jalan: j, no: x.no, versi: v, berhenti: x.berhenti, alasan: x.alasan, o: x.omongan, terkini: [...terkini], lulus: new Set(lulus) });
      for (const x of vs) if (x.berhenti === 'lolos') lulus.add(x.no);
    }
  }

  it('ada 30 versi terbaca', () => expect(kasus).toHaveLength(30));

  it('menolak tepat versi yang dulu berhenti di gerbang kode, dengan alasan yang sama persis', () => {
    for (const k of kasus) {
      // bagian per omongan (= gerbang 1); bagian seluruh draf diuji terpisah di bawah
      const pra = (praPeriksaKode(paket, k.terkini, k.lulus, [k.no]).get(k.no) ?? []).filter((a) => !a.startsWith('validator seluruh draf'));
      const gerbang = periksaKodeBebas(k.no, k.o, paket, k.terkini, k.lulus).menolak.map((m) => `${m.sumber}: ${m.alasan}`);
      expect(pra, `${k.jalan} o${String(k.no)} v${String(k.versi)}`).toEqual(gerbang);
      if (k.berhenti === 'kode') expect(pra, `${k.jalan} o${String(k.no)} v${String(k.versi)}`).toEqual(k.alasan);
      else expect(pra, `${k.jalan} o${String(k.no)} v${String(k.versi)}`).toEqual([]);
    }
  });

  it('bukti: di m2d13-opus-2 versi 2 ketiga kunci "b" — pra-periksa seluruh draf akan menandai KUNCI_SERAGAM (ke omongan 3)', () => {
    const k = kasus.filter((x) => x.jalan === 'm2d13-opus-2' && x.versi === 2);
    const terkini = k.at(-1)?.terkini ?? [];
    expect(terkini.map((o) => o?.kunci)).toEqual(['b', 'b', 'b']);
    const pra = praPeriksaKode(paket, terkini, new Set(), [1, 2, 3]);
    expect(pra.get(3)?.some((a) => a.startsWith('validator seluruh draf [KUNCI_SERAGAM]'))).toBe(true);
  });

  it('validator seluruh draf (sama dengan pemeriksaan akhir) ditambahkan ke omongan diminta bernomor terbesar', () => {
    const trio = [o1KunciD(), beriLabel(o2), o3Bersih()];
    const akhir = validasiM2d8({ omongan: trio.map(drafDari) }, paket).filter((m) => m.omongan === null);
    expect(akhir.map((m) => m.kode)).toEqual(['KUNCI_SERAGAM']);
    const pra = praPeriksaKode(paket, trio, new Set(), [1, 2, 3]);
    expect([...pra.keys()]).toEqual([3]);
    expect(pra.get(3)).toEqual(akhir.map((m) => `validator seluruh draf [${m.kode}]: ${m.pesan}`));
    // omongan 3 sudah lulus → dibebankan ke omongan diminta bernomor terbesar berikutnya
    expect([...praPeriksaKode(paket, trio, new Set([3]), [1, 2]).keys()]).toEqual([2]);
    // belum lengkap tiga → tidak diperiksa seluruh draf
    expect(praPeriksaKode(paket, [trio[0] ?? null, trio[1] ?? null, null], new Set(), [1, 2]).size).toBe(0);
  });
});

describe('mesin bebas dengan pra-periksa (≤ 2 tulis-ulang per versi)', () => {
  it('batas pra-periksa 2', () => expect(MAKS_PRA_PERIKSA).toBe(2));

  it('tanpa opsi praPeriksa → perilaku M2d-13 (tanpa tulis-ulang pra-periksa)', async () => {
    const p = panggilBebasPalsu();
    const h = await jalankanBebas({ paket, penulis: MODEL_OR_OPUS, panggil: p.panggil });
    expect(p.log.filter((i) => i.jenis === 'tulis-praperiksa')).toEqual([]);
    expect(h.pra_periksa ?? []).toEqual([]);
  });

  it('pelanggaran kode dikembalikan ke penulis SEBELUM penebak; versi tetap 1; alasan = alasan gerbang', async () => {
    // tulisan pertama: o1 (Rp89 di luar kartu) & o3 ([[misal|…]]) melanggar; pra-periksa ke-1 memperbaiki o1; ke-2 memperbaiki o3.
    const penulis: PenulisPalsu = (_v, diminta, _p, n) =>
      keluaran(diminta.map((d): [number, OmonganBebas] => [d, d === 1 ? (n === 1 ? beriLabel(o1) : tirt7O1Diperbaiki()) : d === 2 ? beriLabel(o2) : n <= 2 ? beriLabel(o3) : o3Bersih()]));
    const p = panggilBebasPalsu({ penulis });
    const h = await jalankanBebas({ paket, penulis: MODEL_OR_OPUS, panggil: p.panggil, praPeriksa: MAKS_PRA_PERIKSA });
    expect(ringkas(h.versi)).toEqual(['1/1:lolos', '2/1:lolos', '3/1:lolos']);
    expect(h.terbit).toBe(true);
    expect(h.pra_periksa?.map((x) => `${String(x.versi)}/${String(x.ke)}:${x.ditolak.map((d) => d.no).join(',')}`)).toEqual(['1/1:1,3', '1/2:3']);
    // penebak tidak pernah melihat versi yang melanggar
    expect(p.log.filter((i) => i.jenis === 'gerbang-tebak').length).toBe(72);
    expect(p.log.filter((i) => i.jenis === 'tulis-praperiksa').map((i) => `${String(i.putaran)}/${String(i.ke)}`)).toEqual(['1/1', '1/2']);
    // pesan tulis-ulang memuat alasan gerbang persis
    const pesan1 = p.pesanPenulis[1]?.[1]?.content ?? '';
    const alasanO3 = periksaKodeBebas(3, beriLabel(o3), paket, [beriLabel(o1), beriLabel(o2), beriLabel(o3)], new Set()).menolak.map((m) => `${m.sumber}: ${m.alasan}`);
    for (const a of alasanO3) expect(pesan1).toContain(a);
    expect(pesan1).toContain('Tulis ulang HANYA omongan nomor 1, 3.');
    expect(h.panggilan_penulis.map((x) => `${String(x.versi)}/${x.jenis}`)).toEqual(['1/tulis', '1/pra-periksa', '1/pra-periksa']);
  });

  it('paling banyak 2 tulis-ulang per versi; sesudahnya gerbang 1 resmi memutus (versi terpakai)', async () => {
    const penulis: PenulisPalsu = (_v, diminta) => keluaran(diminta.map((d): [number, OmonganBebas] => [d, d === 1 ? tirt7O1Diperbaiki() : d === 2 ? beriLabel(o2) : beriLabel(o3)]));
    const p = panggilBebasPalsu({ penulis });
    const h = await jalankanBebas({ paket, penulis: MODEL_OR_OPUS, panggil: p.panggil, praPeriksa: MAKS_PRA_PERIKSA });
    expect(ringkas(h.versi)).toEqual(['1/1:lolos', '2/1:lolos', '3/1:kode', '3/2:kode', '3/3:kode']);
    expect(h.pra_periksa?.map((x) => `${String(x.versi)}/${String(x.ke)}`)).toEqual(['1/1', '1/2', '2/1', '2/2', '3/1', '3/2']);
    expect(h.panggilan_penulis).toHaveLength(9);
    expect(h.terbit).toBe(false);
  });

  it('huruf kunci seragam (validator seluruh draf) ditangkap pra-periksa; penulis memindah kunci → terbit', async () => {
    const penulis: PenulisPalsu = (_v, diminta, _p, n) => keluaran(diminta.map((d): [number, OmonganBebas] => [d, d === 1 ? o1KunciD() : d === 2 ? beriLabel(o2) : n === 1 ? o3Bersih() : o3KunciB()]));
    const p = panggilBebasPalsu({ penulis });
    const h = await jalankanBebas({ paket, penulis: MODEL_OR_OPUS, panggil: p.panggil, praPeriksa: MAKS_PRA_PERIKSA });
    expect(h.pra_periksa?.map((x) => x.ditolak.map((d) => `${String(d.no)}:${d.alasan.join(" | ")}`))).toEqual([["3:validator seluruh draf [KUNCI_SERAGAM]: Huruf kunci ketiga omongan sama semua (\"d\")."]]);
    expect(ringkas(h.versi)).toEqual(['1/1:lolos', '2/1:lolos', '3/1:lolos']);
    expect(h.terbit).toBe(true);
  });

  it('kunci tetap seragam sesudah 2 tulis-ulang → gerbang 1 per omongan meloloskan, validator akhir menolak (aturan M2d-13, tidak diubah)', async () => {
    const penulis: PenulisPalsu = (_v, diminta) => keluaran(diminta.map((d): [number, OmonganBebas] => [d, d === 1 ? o1KunciD() : d === 2 ? beriLabel(o2) : o3Bersih()]));
    const p = panggilBebasPalsu({ penulis });
    const h = await jalankanBebas({ paket, penulis: MODEL_OR_OPUS, panggil: p.panggil, praPeriksa: MAKS_PRA_PERIKSA });
    expect(h.pra_periksa).toHaveLength(2);
    expect(ringkas(h.versi)).toEqual(['1/1:lolos', '2/1:lolos', '3/1:lolos']);
    expect(h.terbit).toBe(false);
    expect(h.berhenti).toMatch(/KUNCI_SERAGAM/);
  });

  it('pagu menolak tulis-ulang pra-periksa → dilewati (dicatat), versi lanjut ke gerbang, tidak tersensor', async () => {
    const p = panggilBebasPalsu({ galatSebelum: (info) => (info.jenis === 'tulis-praperiksa' ? new PaguTercapai(1.2, 0.45, 1.4, MODEL_OR_OPUS) : null) });
    const h = await jalankanBebas({ paket, penulis: MODEL_OR_OPUS, panggil: p.panggil, praPeriksa: MAKS_PRA_PERIKSA });
    expect(h.tersensor).toBe(false);
    expect(h.pra_periksa?.[0]?.dilewati).toMatch(/^PaguTercapai/);
    expect(ringkas(h.versi).slice(0, 3)).toEqual(['1/1:kode', '2/1:lolos', '3/1:kode']);
  });

  it('saldo penyedia habis TIDAK dilewati: jalan berhenti tersensor', async () => {
    const p = panggilBebasPalsu({ galatSebelum: (info) => (info.jenis === 'tulis-praperiksa' ? new SaldoPenyediaHabis('kredit habis', 402, MODEL_OR_OPUS) : null) });
    const h = await jalankanBebas({ paket, penulis: MODEL_OR_OPUS, panggil: p.panggil, praPeriksa: MAKS_PRA_PERIKSA });
    expect(h.tersensor).toBe(true);
    expect(h.versi).toEqual([]);
  });

  it('tulis-ulang pra-periksa yang tak terbaca: teks sebelumnya dipakai, tidak diulang', async () => {
    const penulis: PenulisPalsu = (_v, diminta, _p, n) => (n === 2 ? 'bukan json' : keluaran(diminta.map((d): [number, OmonganBebas] => [d, d === 1 ? tirt7O1Diperbaiki() : d === 2 ? beriLabel(o2) : n === 1 ? beriLabel(o3) : o3Bersih()])));
    const p = panggilBebasPalsu({ penulis });
    const h = await jalankanBebas({ paket, penulis: MODEL_OR_OPUS, panggil: p.panggil, praPeriksa: MAKS_PRA_PERIKSA });
    expect(h.pra_periksa?.map((x) => `${String(x.ke)}:${x.terbaca.join(',')}`)).toEqual(['1:', '2:3']);
    expect(ringkas(h.versi)).toEqual(['1/1:lolos', '2/1:lolos', '3/1:lolos']);
  });
});
