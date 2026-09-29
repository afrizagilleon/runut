/**
 * M2d-6 T-04: kalibrasi penebak dengan soal yang SUDAH diketahui bocor/aman
 * (D-3), probe penalar (D-1), pagu bagian.
 *
 * Kegagalan yang dijaga (kontrak §0): kalibrasi yang disetel supaya lolos,
 * bukan supaya menangkap soal bocor. Maka: label bocor/aman diturunkan dari
 * JAWABAN MENTAH penguji luar (bukan ditulis tangan), teks soal = bahan yang
 * dikirim ke penguji, aturan pilih mengutamakan soal bocor yang tertangkap,
 * dan susunan di lingkar = susunan yang dipilih aturan itu dari matriks.
 */
import { existsSync, readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { GENERASI_M2D6 } from './agen-peran.ts';
import { AKAR } from './env.ts';
import { soalTebak, tulisSoal } from './gerbang-tebak.ts';
import { jsonDari, lolosTebak } from './laporan.ts';
import { PencatatBiaya, PaguMilestoneTercapai, chatBerpagu } from './pagu.ts';
import { AMBANG_MIN_KRITIKUS, PENALAR_M2D6 } from './penalaran.ts';
import {
  FOLDER_KALIBRASI, PETUNJUK_PENEBAK_TAJAM, SOAL_KALIBRASI, SUSUNAN_KALIBRASI, bacaSemuaJalan, matriks, muatSoal, pilihSusunan, type BarisMatriks, type HasilJalan,
} from './penalar-kalibrasi.ts';
import { PAGU_BAGIAN_M2D6, PAGU_MILESTONE_M2D6 } from './penalar-susun.ts';

type Jawab = { jawaban: Array<{ id: string; pilihan: string; yakin: number }> };

function jawabanLuar(milestone: string): Jawab[] {
  return [1, 2, 3].map((p) => jsonDari(readFileSync(`${AKAR}eval/keluaran-${milestone}/penguji/jawaban/tebak-p${String(p)}.txt`, 'utf8')) as Jawab);
}

describe('himpunan kalibrasi = soal yang sudah diuji di luar (D-3)', () => {
  it('kontrak: bocor = M2d-5 TIRT 2 & 3, M2d-4 TIRT 1 & 3; aman = M2d-4 ULTJ 1–3, DADA 1–2, M2d-5 TIRT 1', () => {
    const id = (k: string): string[] => SOAL_KALIBRASI.filter((s) => s.kelompok === k).map((s) => s.id).sort();
    expect(id('bocor')).toEqual(['m2d4-tirt-o1', 'm2d4-tirt-o3', 'm2d5-tirt-o2', 'm2d5-tirt-o3']);
    expect(id('aman')).toEqual(['m2d4-dada-o1', 'm2d4-dada-o2', 'm2d4-ultj-o1', 'm2d4-ultj-o2', 'm2d4-ultj-o3', 'm2d5-tirt-o1']);
  });

  it('teks tiap soal = bahan tebak buta yang dikirim ke penguji luar; kunci = kunci.json penguji', () => {
    for (const s of SOAL_KALIBRASI) {
      const o = muatSoal(s);
      const md = readFileSync(`${AKAR}eval/keluaran-${s.milestone}/penguji/tebak.md`, 'utf8');
      const blok = md.split(/^### /m).find((b) => b.startsWith(`${s.id_luar}\n`)) ?? '';
      expect(blok, s.id).toContain(tulisSoal(soalTebak(o)));
      const kunci = (JSON.parse(readFileSync(`${AKAR}eval/keluaran-${s.milestone}/penguji/kunci.json`, 'utf8')) as { tebak: Array<{ id: string; paket: string; no: number; kunci: string; putaran: number }> }).tebak;
      expect(kunci.find((k) => k.id === s.id_luar), s.id).toEqual({ id: s.id_luar, paket: s.paket, no: s.no, kunci: o.kunci, putaran: s.putaran });
    }
  });

  it('label bocor/aman DITURUNKAN dari jawaban mentah penguji luar dengan K-05 yang sama, bukan ditulis tangan', () => {
    for (const s of SOAL_KALIBRASI) {
      const jawab = jawabanLuar(s.milestone).map((j) => j.jawaban.find((x) => x.id === s.id_luar));
      expect(jawab.every((x) => x !== undefined), s.id).toBe(true);
      const k = lolosTebak(jawab.map((x) => ({ pilihan: x?.pilihan ?? '', yakin: x?.yakin ?? 0 })), muatSoal(s).kunci);
      expect(k.lolos ? 'aman' : 'bocor', s.id).toBe(s.kelompok);
      expect(s.luar, s.id).toContain(jawab.map((x) => `${String(x?.pilihan)}/${String(x?.yakin)}`).join(' · '));
    }
  });
});

describe('aturan pilih susunan (D-3)', () => {
  const b = (susunan: string, bocor: number, aman: number, biaya = 0.1): BarisMatriks => ({
    susunan, ringkas: susunan, sampel: 1, bocor_ditolak: bocor, bocor_total: 4, aman_ditolak: aman, aman_total: 6, per_soal: {}, biaya_usd: biaya,
  });

  it('menangkap soal bocor lebih dulu — susunan yang meloloskan soal bocor tidak menang walau menolak lebih sedikit soal aman', () => {
    expect(pilihSusunan([b('A', 3, 0), b('B', 4, 5)])?.susunan).toBe('B');
    expect(pilihSusunan([b('A', 4, 3), b('B', 4, 2)])?.susunan).toBe('B');
    expect(pilihSusunan([b('A', 4, 2, 0.3), b('B', 4, 2, 0.1)])?.susunan).toBe('B');
    expect(pilihSusunan([])).toBeNull();
  });

  it('matriks hanya dari jalan yang selesai; beberapa sampel dijumlah per susunan', () => {
    const j = (susunan: string, selesai: boolean, tolak: boolean[]): HasilJalan => ({
      susunan, sampel: 1, ringkas: susunan, selesai, biaya_usd: 0.05,
      soal: SOAL_KALIBRASI.map((s, i) => ({ id: s.id, kelompok: s.kelompok, kunci: 'a', ditolak: tolak[i] ?? false, benar: 0, yakin_benar: null, tebakan: [], biaya_usd: 0.005 })),
    });
    const m = matriks([j('K9', true, [true, true, true, true, true]), j('K9', true, [true, false, true, true]), j('K8', false, [true, true, true, true])]);
    expect(m).toHaveLength(1);
    expect(m[0]).toMatchObject({ susunan: 'K9', sampel: 2, bocor_ditolak: 7, bocor_total: 8, aman_ditolak: 1, aman_total: 12 });
  });

  it('susunan hanya memakai dua model kontrak; penebak GLM ber-effort dijaga ambang; petunjuk tajam tetap meminta JSON', () => {
    for (const s of SUSUNAN_KALIBRASI) {
      expect(s.penebak).toHaveLength(3);
      for (const p of s.penebak) {
        expect(['deepseek/deepseek-v4.1-flash', 'z-ai/glm-5.3']).toContain(p.model);
        const r = p.tambahanBadan?.['reasoning'] as Record<string, unknown> | undefined;
        if (r?.['effort'] !== undefined) expect(p.ambang).toBe(PENALAR_M2D6.penebakGlm.ambang);
      }
    }
    expect(PETUNJUK_PENEBAK_TAJAM.split('\n').at(-1)).toMatch(/^Balas HANYA dengan JSON/);
    expect(PETUNJUK_PENEBAK_TAJAM).toContain('TIDAK diberi dokumen');
  });
});

describe('susunan di lingkar = pilihan aturan atas matriks kalibrasi', () => {
  it.runIf(existsSync(`${FOLDER_KALIBRASI}/matriks.json`))('GENERASI_M2D6.penebak = susunan terpilih', () => {
    const berkas = JSON.parse(readFileSync(`${FOLDER_KALIBRASI}/matriks.json`, 'utf8')) as { matriks: BarisMatriks[]; pilihan: string };
    expect(berkas.matriks).toEqual(matriks(bacaSemuaJalan()));
    expect(pilihSusunan(berkas.matriks)?.susunan).toBe(berkas.pilihan);
    const s = SUSUNAN_KALIBRASI.find((x) => x.id === berkas.pilihan);
    expect(s).toBeDefined();
    expect(GENERASI_M2D6.penebak.petunjuk).toBe(s?.petunjuk);
    expect(GENERASI_M2D6.penebak.model).toEqual(s?.penebak.map((p) => p.model));
    expect(GENERASI_M2D6.penebak.maxTokens).toEqual(s?.penebak.map((p) => p.maxTokens));
    expect(GENERASI_M2D6.penebak.tambahanBadan).toEqual(s?.penebak.map((p) => p.tambahanBadan));
    expect(GENERASI_M2D6.penebak.ambangPenalaran).toEqual(s?.penebak.map((p) => p.ambang));
  });
});

describe('probe penalar (D-1) dan pagu bagian', () => {
  it('putusan probe: effort "high", ambang kritikus ≥ 500 dan di atas kritikus yang tidak berpikir, ruang jawaban', () => {
    expect(PENALAR_M2D6).toEqual({
      kritikus: { effort: 'high', maxTokens: 24_000, ambang: 1_000 },
      penebakGlm: { effort: 'high', maxTokens: 8_000, ambang: 300 },
    });
    expect(PENALAR_M2D6.kritikus.ambang).toBeGreaterThanOrEqual(AMBANG_MIN_KRITIKUS);
    // Probe: kritikus GLM tanpa effort (M2d-5) maks 260 token; "high" minimal 1.731.
    const probe = [1, 2, 3].flatMap((p) => (JSON.parse(readFileSync(`${AKAR}eval/keluaran-m2d6/probe/probe-${String(p)}.json`, 'utf8')) as { hasil: Array<{ peran: string; badan: { reasoning: { effort: string } }; token_penalaran: number }> }).hasil);
    const kr = probe.filter((h) => h.peran === 'kritikus' && h.badan.reasoning.effort === 'high').map((h) => h.token_penalaran);
    expect(kr.length).toBeGreaterThanOrEqual(7);
    expect(Math.min(...kr)).toBeGreaterThan(PENALAR_M2D6.kritikus.ambang);
    expect(Math.max(...kr)).toBeLessThan(PENALAR_M2D6.kritikus.maxTokens - 2_000);
    const medium = probe.filter((h) => h.peran === 'kritikus' && h.badan.reasoning.effort === 'medium').map((h) => h.token_penalaran);
    expect(Math.max(...medium)).toBeLessThan(PENALAR_M2D6.kritikus.ambang);
  });

  it('pagu milestone US$3,50 dan pagu bagian (probe 0,40; kalibrasi 0,80; kritikus 0,30) ditegakkan sebelum kirim', () => {
    expect(PAGU_MILESTONE_M2D6).toBe(3.5);
    expect(PAGU_BAGIAN_M2D6).toEqual({
      probe: { usd: 0.4, awalanTag: 'm2d6/probe/' },
      kalibrasi: { usd: 0.8, awalanTag: 'm2d6/kalibrasi/' },
      kritikus: { usd: 0.3, awalanTag: 'm2d6/kritikus/' },
    });
    const p = new PencatatBiaya({ paguUsd: 8, jalurLedger: null, biayaNyata: true, paguMilestone: { usd: 3.5, awalanTag: 'm2d6/' }, paguBagian: Object.values(PAGU_BAGIAN_M2D6) });
    p.catat('z-ai/glm-5.3', 'm2d6/kalibrasi/K1/x', { percobaan: 1, status: 200, token_masuk: 1, token_keluar: 1, latensi_ms: 1, galat: null, mungkin_ditagih: true, biaya_penyedia_usd: 0.79 }, 0);
    const pesan = [{ role: 'user' as const, content: 'x'.repeat(1000) }];
    expect(() => p.periksa('z-ai/glm-5.3', pesan, 8000, 'm2d6/kalibrasi/K2/y')).toThrow(PaguMilestoneTercapai);
    // Bagian lain dan milestone masih longgar.
    expect(() => p.periksa('z-ai/glm-5.3', pesan, 8000, 'm2d6/jalan-1/tirt/p1/kritikus/o1')).not.toThrow();
  });

  it('panggilan serentak: perkiraan panggilan yang masih berjalan ikut dihitung pagu (kalibrasi serentak tetap berpagu)', async () => {
    const pesan = [{ role: 'user' as const, content: 'x'.repeat(1000) }];
    const p = new PencatatBiaya({ paguUsd: 8, jalurLedger: null, biayaNyata: true, paguMilestone: { usd: 3.5, awalanTag: 'm2d6/' }, paguBagian: [{ usd: 0.05, awalanTag: 'm2d6/kalibrasi/' }] });
    const satu = p.perkiraan('z-ai/glm-5.3', pesan, 8000);
    expect(satu).toBeLessThan(0.05);
    expect(2 * satu).toBeGreaterThan(0.05);
    let lepas: () => void = () => undefined;
    let dikirim = 0;
    const fetchLambat = (async () => {
      dikirim++;
      await new Promise<void>((r) => { lepas = r; });
      return new Response(JSON.stringify({ provider: 'Z.AI', choices: [{ message: { content: '{}' }, finish_reason: 'stop' }], usage: { prompt_tokens: 1, completion_tokens: 1, cost: 0.001 } }), { status: 200 });
    }) as typeof fetch;
    const klien = { baseUrl: 'https://openrouter.ai/api/v1', apiKey: 'sk-or-v1-UJI0123456789abcdef', fetch: fetchLambat };
    const opsi = { model: 'z-ai/glm-5.3', pesan, suhu: 1, maxTokens: 8000 };
    const pertama = chatBerpagu(klien, p, opsi, 'm2d6/kalibrasi/K1/s1/a/penebak/t1');
    await expect(chatBerpagu(klien, p, opsi, 'm2d6/kalibrasi/K1/s1/b/penebak/t1')).rejects.toThrow(PaguMilestoneTercapai);
    expect(dikirim).toBe(1);
    lepas();
    await pertama;
    // Sesudah dicatat (biaya nyata 0,001), pesanan dilepas: panggilan berikutnya boleh.
    const kedua = chatBerpagu(klien, p, opsi, 'm2d6/kalibrasi/K1/s1/b/penebak/t1');
    await new Promise((r) => setTimeout(r, 0));
    lepas();
    await expect(kedua).resolves.toBeDefined();
  });
});
