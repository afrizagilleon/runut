/**
 * Mesin penulis bebas M2d-13 (pra-registrasi §3–§5) dengan model palsu:
 * gerbang kode sungguhan, urutan gerbang, revisi ke penulis yang sama,
 * maks 3 versi, tanpa henti dini, tulis-gagal, pagu menyensor.
 */
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { AKAR } from '../env.ts';
import { MODEL_OR_HAIKU, MODEL_OR_OPUS } from '../model.ts';
import { PaguTercapai } from '../pagu.ts';
import type { PaketFakta } from '../paket.ts';
import { jalankanBebas, MAKS_VERSI_BEBAS, SETELAN_PENULIS_BEBAS } from './mesin.ts';
import { beriLabel, drafTirt7, panggilBebasPalsu, tirt7O1Diperbaiki, type PenulisPalsu } from './palsu.ts';
import { promptPenulisBebas } from './prompt.ts';
import type { OmonganBebas } from './skema.ts';

const paket = JSON.parse(readFileSync(`${AKAR}eval/penyusun/m2d11-tirt-7/paket.json`, 'utf8')) as PaketFakta;
const keluaran = (xs: Array<[number, OmonganBebas]>): string => JSON.stringify({ omongan: xs.map(([no, o]) => ({ no, ...o })) });
const [, o2, o3] = drafTirt7();
const o3Bersih = (): OmonganBebas =>
  beriLabel({ ...o3, pilihan: { ...o3.pilihan, b: 'Betul, selisih penutupannya [[naik-2025-11-26-2025-12-09|Rp58]] sejak [[kelipatan-2025-11-26-2025-12-09|26 November]].' } });

describe('mesin bebas — alur', () => {
  it('versi 1 satu panggilan untuk tiga omongan; yang ditolak kode tidak sampai ke penebak; revisi hanya omongan ditolak dengan alasannya', async () => {
    const p = panggilBebasPalsu();
    const h = await jalankanBebas({ paket, penulis: MODEL_OR_OPUS, panggil: p.panggil });
    const ringkas = h.versi.map((v) => `${String(v.no)}/${String(v.versi)}:${v.berhenti}`);
    expect(ringkas).toEqual(['1/1:kode', '2/1:lolos', '3/1:kode', '1/2:lolos', '3/2:kode', '3/3:kode']);
    expect(h.terbit).toBe(false);
    expect(h.berhenti).toMatch(/omongan tidak lulus dalam 3 versi: 3/);
    // penebak hanya untuk versi yang lolos kode
    const tebak = p.log.filter((i) => i.jenis === 'gerbang-tebak');
    expect(new Set(tebak.map((i) => `${String(i.omongan)}/${String(i.putaran)}`))).toEqual(new Set(['2/1', '1/2']));
    expect(tebak.length).toBe(48);
    // penulis: 3 panggilan (v1, v2, v3), prompt sistem sama byte demi byte
    expect(p.pesanPenulis).toHaveLength(3);
    expect(new Set(p.pesanPenulis.map((m) => m[0]?.content)).size).toBe(1);
    expect(p.pesanPenulis[0]?.[0]?.content).toBe(promptPenulisBebas(paket));
    const v2 = p.pesanPenulis[1]?.[1]?.content ?? '';
    expect(v2).toContain('Tulis ulang HANYA omongan nomor 1, 3.');
    expect(v2).toContain('OMONGAN YANG SUDAH LULUS');
    expect(v2).toMatch(/harga-2025-12-05, yang bukan kartu omongan ini/);
    expect(p.pesanPenulis[2]?.[1]?.content).toContain('Tulis ulang HANYA omongan nomor 3.');
    expect(h.panggilan_penulis.every((x) => x.model === MODEL_OR_OPUS)).toBe(true);
    // versi akhir tiap omongan
    expect(h.akhir.map((a) => (a === null ? null : `${String(a.versi)}:${String(a.lulus)}`))).toEqual(['2:true', '1:true', '3:false']);
  });

  it('setelan penulis sama untuk semua model: effort "low", max_tokens 8.000, suhu 1,0', () => {
    expect(SETELAN_PENULIS_BEBAS).toEqual({ suhu: 1, maxTokens: 8_000, tambahanBadan: { reasoning: { effort: 'low' } } });
    expect(MAKS_VERSI_BEBAS).toBe(3);
  });

  it('ketiganya lulus di versi 1 → validator seluruh draf → terbit', async () => {
    const penulis: PenulisPalsu = () => keluaran([[1, tirt7O1Diperbaiki()], [2, beriLabel(o2)], [3, o3Bersih()]]);
    const p = panggilBebasPalsu({ penulis });
    const h = await jalankanBebas({ paket, penulis: MODEL_OR_HAIKU, panggil: p.panggil });
    expect(h.versi.map((v) => v.berhenti)).toEqual(['lolos', 'lolos', 'lolos']);
    expect(h.terbit).toBe(true);
    expect(h.draf?.omongan).toHaveLength(3);
    expect(p.pesanPenulis).toHaveLength(1);
  });

  it('keluaran tak terbaca diulang sekali; tetap gagal → tulis-gagal (versi terpakai), lalu versi berikutnya', async () => {
    const penulis: PenulisPalsu = (versi, diminta, _p, n) => (versi === 2 ? 'maaf, tidak bisa' : n === 1 ? keluaran([[1, tirt7O1Diperbaiki()], [2, beriLabel(o2)], [3, beriLabel(o3)]]) : keluaran(diminta.map((d) => [d, o3Bersih()])));
    const p = panggilBebasPalsu({ penulis });
    const h = await jalankanBebas({ paket, penulis: MODEL_OR_HAIKU, panggil: p.panggil });
    expect(h.versi.filter((v) => v.no === 3).map((v) => `${String(v.versi)}:${v.berhenti}`)).toEqual(['1:kode', '2:tulis-gagal', '3:lolos']);
    expect(h.panggilan_penulis.map((x) => `${String(x.versi)}/${String(x.ulang)}`)).toEqual(['1/0', '2/0', '2/1', '3/0']);
    expect(h.terbit).toBe(true);
  });

  it('tebak rotasi gagal → kartu & kritikus tidak dipanggil; tertebak tetap dihitung versi', async () => {
    const p = panggilBebasPalsu({
      penulis: (_v, diminta) => keluaran(diminta.map((d) => [d, d === 1 ? tirt7O1Diperbaiki() : d === 2 ? beriLabel(o2) : o3Bersih()])),
      rotasi: (info, opsi) => {
        // omongan 2 selalu: isi kunci dipilih (tertebak)
        if (info.omongan === 2) return JSON.stringify({ teks: Object.values(opsi).find((t) => t.startsWith('Keliru, harganya naik sampai')) ?? '', alasan: 'x' });
        const r = (info.ke - 1) % 4;
        return JSON.stringify({ teks: opsi[(['a', 'b', 'c', 'd'] as const)[(2 * r) % 4] ?? 'a'], alasan: 'x' });
      },
    });
    const h = await jalankanBebas({ paket, penulis: MODEL_OR_HAIKU, panggil: p.panggil });
    expect(h.versi.filter((v) => v.no === 2).map((v) => v.berhenti)).toEqual(['penebak', 'penebak', 'penebak']);
    expect(p.log.filter((i) => i.omongan === 2 && (i.jenis === 'gerbang-kartu' || i.jenis === 'kritikus'))).toEqual([]);
    expect(h.versi.find((v) => v.no === 2)?.alasan[0]).toMatch(/^tebak rotasi gagal/);
  });

  it('pagu tercapai → berhenti, tersensor, versi yang sudah ada tetap tercatat', async () => {
    const p = panggilBebasPalsu({ galatSebelum: (info) => (info.jenis === 'tulis-bebas' && info.putaran === 2 ? new PaguTercapai(0.5, 0.2, 0.6, MODEL_OR_OPUS) : null) });
    const h = await jalankanBebas({ paket, penulis: MODEL_OR_OPUS, panggil: p.panggil });
    expect(h.tersensor).toBe(true);
    expect(h.berhenti).toMatch(/^terpotong pagu/);
    expect(h.versi.map((v) => `${String(v.no)}/${String(v.versi)}:${v.berhenti}`)).toEqual(['1/1:kode', '2/1:lolos', '3/1:kode']);
    expect(h.terbit).toBe(false);
  });
});
