/**
 * M2d-9 T-04: antarmuka mesin (D-4). Lingkar M2d-8 SUNGGUHAN dengan model palsu:
 * peristiwa per langkah peran, keadaan omongan yang dikunci, jejak di folder
 * jalan; perkiraan biaya; pemanggil sungguhan menegakkan pagu berlapis dan
 * dua model sebelum `fetch`.
 */
import { appendFileSync, existsSync, mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { palsuP, PAKET_T, teksKunci } from '../../factory/llm/bantu-uji-pengecoh.ts';
import { GENERASI_M2D8 } from '../../factory/llm/kalibrasi-susun.ts';
import { PaguMilestoneTercapai } from '../../factory/llm/pagu.ts';
import { PAKET_TIRT } from '../../factory/llm/paket.ts';
import { dataKosong, deretHarga } from './bantu-data.ts';
import { akarSementara } from './bantu-uji.ts';
import { MesinLingkar, panggilSungguhan, perkiraanGenerasi, tagPanggilan } from './mesin.ts';
import { definisiOtomatis, intiNama, pilihDefinisi } from './paket-otomatis.ts';

afterEach(() => {
  vi.restoreAllMocks();
});

describe('MesinLingkar (lingkar M2d-8 sungguhan, model palsu)', () => {
  it('terbit: peristiwa tiap langkah peran dialirkan; tiga omongan dikunci; jejak ditulis ke folder jalan', async () => {
    const folder = mkdtempSync(join(tmpdir(), 'penyusun-mesin-'));
    const awalan: string[] = [];
    const m = new MesinLingkar({
      nama: 'uji',
      keterangan: 'uji',
      palsu: true,
      buatPanggil: (a, pagu) => {
        awalan.push(`${a}|${String(pagu)}`);
        return palsuP({}, () => teksKunci()).panggil;
      },
      siap: () => ({ siap: true, alasan: null }),
    });
    const lapor: Array<{ tahap: string; judul: string; isi: Record<string, unknown> }> = [];
    const h = await m.jalankan({ id: 'j1', paket: PAKET_T, folder, paguJalanUsd: 0.3, lapor: (tahap, judul, isi) => lapor.push({ tahap, judul, isi }), jam: () => new Date('2026-09-30T00:00:00Z') });
    expect(awalan).toEqual(['penyusun/j1/|0.3']);
    expect(h.terbit).toBe(true);
    expect(h.putaran).toBe(1);
    expect(h.keadaan.map((k) => k.no)).toEqual([1, 2, 3]);
    expect(h.keadaan.map((k) => k.omongan)).toEqual(h.draf?.omongan);
    expect(h.keadaan[0]?.pesan.pesan).toBe(h.draf?.omongan[0]?.pesan);
    expect(existsSync(join(folder, 'jejak-agen.json'))).toBe(true);
    const peran = lapor.map((x) => x.isi['peran']);
    expect(lapor.every((x) => x.tahap === 'agen')).toBe(true);
    expect(peran[0]).toBe('perencana');
    expect(peran).toEqual(expect.arrayContaining(['penulis', 'pemeriksa', 'penebak', 'pembaca-kartu', 'kritikus']));
    const kritikus = lapor.find((x) => x.isi['jenis'] === 'kritikus');
    expect(kritikus?.judul).toMatch(/^putaran 1 · omongan 1 · kritikus: kritikus makna → lolos/);
    expect(kritikus?.isi['model']).toBe('z-ai/glm-5.3');
    expect(lapor.at(-1)?.isi['total_usd']).toBeCloseTo(h.biaya_usd, 6);
    expect(m.generasi).toBe(GENERASI_M2D8);
  });

  it('ditolak: penolakan beralasan dari lingkar (kritikus selalu keberatan → sudut habis)', async () => {
    const folder = mkdtempSync(join(tmpdir(), 'penyusun-mesin-'));
    const keberatan = JSON.stringify({ cek_klaim: { bagian_tak_tercek: [], kunci_menyatakan_tak_pasti: false }, cek_pilihan: { juga_benar: ['a'], alasan: 'a juga benar' }, keberatan: [{ jenis: 'kunci_ganda', lokasi: 'pilihan-a', alasan: 'a juga benar menurut kartu' }], arahan: 'ubah a' });
    const m = new MesinLingkar({
      nama: 'uji', keterangan: 'uji', palsu: true, maksPutaran: 2,
      buatPanggil: () => palsuP({ kritikus: () => keberatan }, () => teksKunci()).panggil,
      siap: () => ({ siap: true, alasan: null }),
    });
    const h = await m.jalankan({ id: 'j2', paket: PAKET_T, folder, paguJalanUsd: 0.3, lapor: () => undefined, jam: () => new Date('2026-09-30T00:00:00Z') });
    expect(h.terbit).toBe(false);
    expect(h.berhenti).toMatch(/batas 2 putaran tercapai/);
    expect(h.keadaan).toEqual([]);
    expect(h.draf_terakhir.filter((x) => x !== null)).toHaveLength(3);
  });
});

describe('perkiraan biaya', () => {
  it('per putaran = 3 × per omongan; kritikus GLM 40.000 token ≈ US$0,18; catatan menyebut penegakan pagu sebelum kirim', () => {
    const p = perkiraanGenerasi(GENERASI_M2D8, 15);
    expect(p.per_putaran_usd).toBeCloseTo(3 * p.per_omongan_usd, 3);
    const kritikus = p.per_panggilan.find((x) => x.peran === 'kritikus');
    expect(kritikus?.model).toBe('z-ai/glm-5.3');
    expect(kritikus?.maks_usd).toBeCloseTo((6000 * 1.4 + 40000 * 4.4) / 1e6, 4);
    expect(p.catatan.join(' ')).toMatch(/Sebelum SETIAP panggilan/);
  });
});

describe('pemanggil sungguhan: pagu berlapis dan dua model, sebelum fetch', () => {
  it('tag = penyusun/<id>/p<putaran>/<jenis>/o<n>/t<k>/u<k>', () => {
    expect(tagPanggilan('penyusun/j/', { jenis: 'gerbang-tebak', putaran: 2, omongan: 1, ke: 3, ulang: 1 })).toBe('penyusun/j/p2/gerbang-tebak/o1/t3/u1');
    expect(tagPanggilan('penyusun/j/', { jenis: 'kritikus', putaran: 1, omongan: 2, ke: 1 })).toBe('penyusun/j/p1/kritikus/o2');
    // M2d-15: tulis-ulang pra-periksa ke-k
    expect(tagPanggilan('penyusun/j/', { jenis: 'tulis-praperiksa', putaran: 2, omongan: null, ke: 2 })).toBe('penyusun/j/p2/tulis-praperiksa/k2');
  });

  it('model di luar model yang diizinkan (DeepSeek, GLM, Haiku) → ditolak tanpa fetch', async () => {
    const f = vi.spyOn(globalThis, 'fetch');
    const panggil = panggilSungguhan(akarSementara(), 1.2)('penyusun/j/', 0.5);
    await expect(panggil([{ role: 'user', content: 'x' }], { suhu: 0, maxTokens: 10 }, { jenis: 'kritikus', putaran: 1, omongan: 1, ke: 1, model: 'openai/gpt-5' })).rejects.toThrow(/tidak diizinkan/);
    expect(f).not.toHaveBeenCalled();
  });

  it('pagu jalan / pagu penyusun tercapai → PaguMilestoneTercapai tanpa fetch', async () => {
    const f = vi.spyOn(globalThis, 'fetch');
    const akar = akarSementara();
    const info = { jenis: 'kritikus' as const, putaran: 1, omongan: 1, ke: 1, peran: 'kritikus' as const, model: 'z-ai/glm-5.3' };
    const pesan = [{ role: 'user' as const, content: 'x' }];
    await expect(panggilSungguhan(akar, 1.2)('penyusun/j/', 0.05)(pesan, { suhu: 0, maxTokens: 40_000 }, info)).rejects.toBeInstanceOf(PaguMilestoneTercapai);
    appendFileSync(join(akar, '.cache', 'llm', 'ledger.jsonl'), `${JSON.stringify({ tag: 'penyusun/lama/p1/kritikus/o1', biaya_usd: 1.15, model: 'z-ai/glm-5.3' })}\n`);
    await expect(panggilSungguhan(akar, 1.2)('penyusun/j2/', 0.5)(pesan, { suhu: 0, maxTokens: 40_000 }, info)).rejects.toThrow(/Pagu milestone tercapai: biaya milestone \(tag penyusun\/\*\)/);
    expect(f).not.toHaveBeenCalled();
  });

  it('LLM_BASE_URL bukan OpenRouter → ditolak tanpa mencetak alamatnya', () => {
    const akar = akarSementara({ LLM_BASE_URL: 'https://rahasia.example/v1', LLM_API_KEY: 'k', LLM_MODEL: 'm', LLM_PAGU_USD: '5' });
    expect(() => panggilSungguhan(akar, 1.2)('penyusun/j/', 0.5)).toThrow(/bukan OpenRouter \(nilainya tidak dicetak\)/);
  });
});

describe('definisi paket', () => {
  it('TIRT 10 Des 2025 memakai definisi kurasi M2d (sama dengan jalan M2d-5…M2d-8)', () => {
    const p = pilihDefinisi('TIRT', '2025-12-10', dataKosong('TIRT'));
    expect(p.sumber).toBe('kurasi');
    expect(p.def).toBe(PAKET_TIRT);
  });

  it('otomatis: hanya data ≤ T; nama pemegang diganti peran; nama perusahaan terlarang', () => {
    const harga = deretHarga('2026-03-02', 60, (i) => (i >= 10 && i <= 16 ? 100 + (i - 9) * 5 : 135));
    const t = harga[20]?.tanggal as string;
    const d = {
      ...dataKosong('UJIX'),
      harga,
      suspensi: [{ tanggal: t, alasan: 'x' }, { tanggal: harga[40]?.tanggal as string, alasan: 'masa depan' }],
      laporan: [
        { laporan_id: 'l', simbol: 'UJIX', pemegang: 'Budi Santoso', dilaporkan_pada: `${harga[15]?.tanggal as string}T10:00:00`, jenis: 'jual' as const, jumlah: 5, harga: 1, sebelum: 10, sesudah: 5, persen_sebelum: 1, persen_sesudah: 0.5, transaksi: [], teks: '', berkas: 'b' },
      ],
    };
    const def = definisiOtomatis('UJIX', t, d);
    expect(def.paket_id).toBe(`penyusun-ujix-${t}`);
    expect(def.calon).toContain(`susp-${t}`);
    expect(def.calon).not.toContain(`susp-${harga[40]?.tanggal as string}`);
    expect(def.calon.every((id) => !/\d{4}-\d{2}-\d{2}/.test(id) || (id.match(/\d{4}-\d{2}-\d{2}/g) ?? []).every((x) => x <= t))).toBe(true);
    expect(def.peran).toEqual({ 'Budi Santoso': 'Pemegang saham A' });
    expect(def.nama_samaran).toBe('Perusahaan U');
    expect(def.kata_terlarang).toEqual(['Uji Coba']);
    expect(intiNama('PT Adhi Karya (Persero) Tbk.')).toBe('Adhi Karya');
  });
});
