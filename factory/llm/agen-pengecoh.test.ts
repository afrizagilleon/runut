/**
 * M2d-7 T-05: lingkar PENGECOH — penulis dipecah di dalam lingkar, gerbang
 * artefak sebelum kritikus, umpan balik beralternatif, perbaikan TERARAH
 * (bagian yang lolos dikunci), berhenti sesudah 2 perbaikan per bagian.
 * Validator, bank, dan semua gerbang kode sungguhan; hanya model palsu.
 */
import { describe, expect, it } from 'vitest';
import { teksPolos } from '../skema/rujukan.ts';
import { GENERASI_M2D7, type PemeriksaanPengecoh } from './agen-pengecoh.ts';
import { TULISAN, jalanP, type RekamanP } from './bantu-uji-pengecoh.ts';
import type { KunciOpsi } from './draf.ts';
import { validasiJejak } from './jejak.ts';
import { PaguTercapai } from './pagu.ts';
import { PENALAR_M2D7 } from './penalaran.ts';
import { omonganLolosPeran } from './peran-penguji.ts';
import { hurufKunciKode } from './posisi-kunci.ts';
import { validasiDraf } from './validasi.ts';
import { PAKET_T } from './bantu-uji-tulisan.ts';

const jenis = (r: RekamanP[], no: number, putaran?: number): string[] =>
  r.filter((x) => x.info.omongan === no && (putaran === undefined || x.info.putaran === putaran)).map((x) => x.info.jenis);

describe('lingkar pengecoh — semua lolos', () => {
  it('urutan per omongan: pesan → pilihan → penjelasan → pilihan-saja ×2 → kartu → kritikus → penebak ×3; terbit', async () => {
    const { hasil, rekaman, jejak } = await jalanP({});
    expect(hasil.lolos).toBe(true);
    expect(hasil.jumlah_putaran).toBe(1);
    expect(jenis(rekaman, 1)).toEqual([
      'tulis-pesan', 'tulis-pilihan', 'tulis-penjelasan', 'gerbang-pilihan-saja', 'gerbang-pilihan-saja', 'gerbang-kartu', 'kritikus', 'gerbang-tebak', 'gerbang-tebak', 'gerbang-tebak',
    ]);
    expect(validasiDraf(hasil.draf, PAKET_T)).toEqual([]);
    for (const no of [1, 2, 3]) expect(hasil.draf?.omongan[no - 1]?.kunci).toBe(hurufKunciKode('tirt', no));
    expect(omonganLolosPeran('tirt', hasil)).toHaveLength(3);
    expect(validasiJejak(jejak.jejak())).toEqual([]);
    expect(hasil.label).toEqual(['Keliru', 'Betul', 'Keliru']);
  });

  it('model per peran: penulis/pilihan-saja/kartu DeepSeek; kritikus + penebak GLM effort "max" dijaga', async () => {
    const { rekaman } = await jalanP({});
    const satu = (j: string): RekamanP => rekaman.find((x) => x.info.jenis === j) as RekamanP;
    expect(satu('tulis-pesan').info.model).toBe('deepseek/deepseek-v4.1-flash');
    expect(satu('gerbang-pilihan-saja').info.model).toBe('deepseek/deepseek-v4.1-flash');
    expect(satu('gerbang-kartu').info.model).toBe('deepseek/deepseek-v4.1-flash');
    expect(satu('kritikus').info.model).toBe('z-ai/glm-5.3');
    expect(satu('kritikus').setelan).toMatchObject({ maxTokens: PENALAR_M2D7.kritikus.maxTokens, tambahanBadan: { reasoning: { effort: 'max' } }, ambangPenalaran: 1000 });
    expect(satu('gerbang-tebak').info.model).toBe('z-ai/glm-5.3');
    expect(satu('gerbang-tebak').setelan).toMatchObject({ maxTokens: PENALAR_M2D7.penebakGlm.maxTokens, tambahanBadan: { reasoning: { effort: 'max' } }, ambangPenalaran: PENALAR_M2D7.penebakGlm.ambang });
    expect(GENERASI_M2D7.penebak.model).toEqual(['z-ai/glm-5.3', 'z-ai/glm-5.3', 'z-ai/glm-5.3']);
  });

  it('penebak dan pilihan-saja tidak menerima kartu, fact_id, kunci, atau penjelasan; pilihan-saja bahkan tanpa pesan', async () => {
    const { rekaman } = await jalanP({});
    for (const r of rekaman.filter((x) => x.info.jenis === 'gerbang-tebak' || x.info.jenis === 'gerbang-pilihan-saja')) {
      const isi = r.pesan.map((p) => p.content).join('\n');
      expect(isi).not.toMatch(/\[\[|susp-|naik-20|rups-|Kartu \d|Salah-kaprah|KUNCI/);
      if (r.info.jenis === 'gerbang-pilihan-saja') expect(isi).not.toContain(TULISAN[r.info.omongan ?? 1]?.pesan.pesan ?? '?');
    }
  });
});

describe('perbaikan TERARAH', () => {
  it('pengecoh kembar di satu huruf: hanya huruf itu (+ penjelasan) ditulis ulang; pesan dan huruf lain dikunci', async () => {
    const huruf = hurufKunciKode('tirt', 2);
    const lain = (['a', 'b', 'c', 'd'] as const).filter((h) => h !== huruf);
    // Putaran 1: pengecoh ketiga (urutan tulisan) = parafrasa pengecoh kedua → G-pilihan-kembar.
    const t2 = TULISAN[2];
    const kembar = { teks: 'Keliru, harganya naik [[kelipatan-2025-11-26-2025-12-09|2,21 kali]] sejak itu.', sumber: 'P5' };
    const { hasil, rekaman } = await jalanP({
      tulis: (no, putaran, bagian) =>
        no === 2 && putaran === 1 && bagian === 'pilihan' ? { pilihan: [t2?.pilihan[0], t2?.pilihan[1], t2?.pilihan[2], { ...kembar, sumber: 'P8' }] } : undefined,
    });
    const p1 = hasil.riwayat[0]?.omongan.find((o) => o.no === 2) as PemeriksaanPengecoh;
    expect(p1.status).toBe('ditolak-pemeriksa');
    const target = lain[2] as KunciOpsi; // huruf pengecoh terakhir (yang kembar)
    expect(p1.rencana).toMatchObject({ tulisPesan: false, tulisPilihan: [target], tulisPenjelasan: true });
    // Putaran 2: tanpa tulis-pesan; pilihan hanya huruf target; kritikus dsb. berjalan.
    expect(jenis(rekaman, 2, 2).slice(0, 2)).toEqual(['tulis-pilihan', 'tulis-penjelasan']);
    const minta = rekaman.find((x) => x.info.omongan === 2 && x.info.putaran === 2 && x.info.jenis === 'tulis-pilihan')?.pesan[1]?.content ?? '';
    expect(minta).toContain(`TULIS ULANG HANYA huruf: ${target}.`);
    expect(minta).toContain(`lokasi: pilihan ${target}`);
    expect(minta).toMatch(/alternatif yang diizinkan: P\d+ \(/);
    const d1 = hasil.riwayat[0]?.draf[1];
    const d2 = hasil.riwayat[1]?.draf[1];
    expect(d2?.pesan).toBe(d1?.pesan);
    for (const h of [huruf, lain[0], lain[1]] as KunciOpsi[]) expect(d2?.pilihan[h]).toBe(d1?.pilihan[h]);
    expect(teksPolos(d2?.pilihan[target] ?? '')).not.toBe(teksPolos(d1?.pilihan[target] ?? ''));
    expect(hasil.lolos).toBe(true);
  });

  it('tertebak tanpa kartu: ketiga pengecoh ditulis ulang, pesan dan kunci tetap', async () => {
    const { hasil, rekaman } = await jalanP({ tertebak: (no, putaran) => no === 1 && putaran === 1 });
    const p = hasil.riwayat[0]?.omongan.find((o) => o.no === 1) as PemeriksaanPengecoh;
    expect(p.status).toBe('ditolak-tebak');
    expect(p.rencana?.tulisPesan).toBe(false);
    expect(p.rencana?.tulisPilihan).toHaveLength(3);
    expect(p.rencana?.tulisPilihan).not.toContain(hurufKunciKode('tirt', 1));
    expect(jenis(rekaman, 1, 2)[0]).toBe('tulis-pilihan');
  });

  it('penebak (kalibrasi D-6): tolak hanya bila ≥ 2/3 benar — satu benar dengan yakin 45 lolos, dua benar ditolak', async () => {
    expect(GENERASI_M2D7.ambang.penebakYakin).toBe(false);
    const satu = await jalanP({ tertebak: (no, putaran, ke) => no === 1 && putaran === 1 && ke === 1 });
    expect(satu.hasil.riwayat[0]?.omongan.find((o) => o.no === 1)?.status).toBe('lolos');
    const dua = await jalanP({ tertebak: (no, putaran, ke) => no === 1 && putaran === 1 && ke <= 2 });
    expect(dua.hasil.riwayat[0]?.omongan.find((o) => o.no === 1)?.status).toBe('ditolak-tebak');
  });

  it('pilihan-saja memilih kunci dua kali → ditolak-artefak, keempat pilihan ditulis ulang, kritikus TIDAK dipanggil', async () => {
    const { hasil, rekaman } = await jalanP({ pilihanSajaKena: (no, putaran) => no === 3 && putaran === 1 });
    const p = hasil.riwayat[0]?.omongan.find((o) => o.no === 3) as PemeriksaanPengecoh;
    expect(p.status).toBe('ditolak-artefak');
    expect(p.rencana?.tulisPilihan).toEqual(['a', 'b', 'c', 'd']);
    expect(jenis(rekaman, 3, 1)).not.toContain('kritikus');
    expect(jenis(rekaman, 3, 1)).not.toContain('gerbang-kartu');
  });

  it('pilihan-saja (kalibrasi D-6): keduanya memilih kunci dengan rata-rata yakin < 60 → tidak ditolak', async () => {
    const { hasil } = await jalanP({ pilihanSajaKena: (no, putaran) => no === 3 && putaran === 1, yakinPilihanSaja: 50 });
    expect(hasil.riwayat[0]?.omongan.find((o) => o.no === 3)?.status).toBe('lolos');
  });

  it('kritikus tidak menjawab: versi dibawa tanpa ditulis ulang dan tanpa dihitung perbaikan', async () => {
    const { hasil, rekaman } = await jalanP({ kritikus: (no, putaran) => (no === 1 && putaran === 1 ? 'bukan json' : undefined) });
    const p = hasil.riwayat[0]?.omongan.find((o) => o.no === 1) as PemeriksaanPengecoh;
    expect(p.status).toBe('kritikus-tidak-menjawab');
    expect(p.dibawa).toBe(true);
    expect(jenis(rekaman, 1, 2)[0]).toBe('gerbang-pilihan-saja');
    expect((hasil.riwayat[1]?.omongan.find((o) => o.no === 1) as PemeriksaanPengecoh).perbaikan).toEqual({ pesan: 0, pilihan: 0, penjelasan: 0 });
  });
});

describe('berhenti: 2 perbaikan per bagian, lalu sudut baru', () => {
  it('kritikus berkeberatan atas pilihan yang sama terus → sudut dibuang sesudah putaran ke-3 (bukan ke-5)', async () => {
    const keberatan = JSON.stringify({
      cek_klaim: { bagian_tak_tercek: [], kunci_menyatakan_tak_pasti: false }, cek_pilihan: { juga_benar: [], alasan: '' },
      keberatan: [{ jenis: 'ambigu', bagian: 'pilihan a', alasan: 'dua arti' }], arahan: '',
    });
    const { hasil } = await jalanP({ kritikus: (no, putaran) => (no === 1 && putaran <= 3 ? keberatan : undefined) }, 6);
    const s1 = hasil.sudut[0] ?? [];
    expect(s1[0]).toMatchObject({ ke: 1, fact_id: 'susp-2025-12-10', hasil: 'dibuang', putaran_akhir: 3 });
    expect(s1[1]?.ke).toBe(2);
    expect(hasil.riwayat[2]?.dibuang.map((d) => d.no)).toEqual([1]);
    const perb = hasil.riwayat.slice(0, 3).map((r) => (r.omongan.find((o) => o.no === 1) as PemeriksaanPengecoh).perbaikan?.pilihan);
    expect(perb).toEqual([1, 2, 3]);
  });

  it('pagu tercapai → berhenti seketika', async () => {
    const { hasil } = await jalanP({
      tulis: (no, _putaran, bagian) => {
        if (no === 2 && bagian === 'pilihan') throw new PaguTercapai(1, 1, 1, 'x');
        return undefined;
      },
    });
    expect(hasil.berhenti).toMatch(/^pagu tercapai/);
    expect(hasil.lolos).toBe(false);
  });
});
