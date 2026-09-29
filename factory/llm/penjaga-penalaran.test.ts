/**
 * M2d-6 T-01: GLM wajib berpikir (D-1) — `reasoning.effort` untuk kritikus dan
 * penebak GLM, dan PENJAGA penalaran: bukti berpikir dibaca dari respons
 * (`token_penalaran`), bukan dari badan permintaan.
 *
 * Kegagalan yang dijaga (kontrak M2d-6 §0): `effort` dikirim tetapi penyedia
 * tetap tidak berpikir. Jawaban yang tidak terbukti berpikir tidak pernah
 * dibaca sebagai "tidak keberatan" atau sebagai tebakan.
 */
import { describe, expect, it } from 'vitest';
import { GENERASI_M2D5, GENERASI_M2D6 } from './agen-peran.ts';
import { dari, jalan, om, PAKET, TANPA_KEBERATAN } from './bantu-uji-tirt.ts';
import { gerbangTebak, type InfoPanggil } from './gerbang-tebak.ts';
import { chat, type PesanChat } from './klien.ts';
import { KEBERATAN_TIDAK_BERPIKIR, KEBERATAN_TIDAK_MENJAWAB, kritik } from './kritikus.ts';
import { MODEL_OR_DEEPSEEK, MODEL_OR_GLM } from './model.ts';
import { pagarPenyedia, pagarPenyediaM2d6, slugPenyedia } from './openrouter.ts';
import { PencatatBiaya, chatBerpagu } from './pagu.ts';
import { AMBANG_MIN_KRITIKUS, PENALAR_M2D6, RUANG_JAWABAN_MIN } from './penalaran.ts';
import { penalaranSah, setelanUlang } from './penjaga-penalaran.ts';
import type { JawabanModel, SetelanPanggil } from './susun.ts';

const jawab = (teks: string, token_penalaran: number | null, penyedia = 'Wafer'): JawabanModel => ({
  teks, token_masuk: 1000, token_keluar: 400, latensi_ms: 5, finish_reason: 'stop', biaya_usd: 0.002, penyedia, token_penalaran,
});

interface Rekam { setelan: SetelanPanggil; info: InfoPanggil }

function urutan(daftar: JawabanModel[]): { panggil: (p: PesanChat[], s: SetelanPanggil, i: InfoPanggil) => Promise<JawabanModel>; rekam: Rekam[] } {
  const rekam: Rekam[] = [];
  let i = 0;
  return {
    rekam,
    panggil: async (_p, setelan, info) => {
      rekam.push({ setelan: { ...setelan }, info: { ...info } });
      const j = daftar[Math.min(i, daftar.length - 1)] as JawabanModel;
      i++;
      return j;
    },
  };
}

const KONTEKS = { no: 1, kartu: { pilihan: 'a', kartu_ditunjuk_no: [1], alasan: 'x' }, tebakan: [], penebakSesudah: true };

describe('penalaranSah — bukti dari respons', () => {
  it('di bawah ambang atau tidak dilaporkan = tidak sah; tepat ambang = sah', () => {
    expect(penalaranSah({ token_penalaran: 499 }, 500)).toBe(false);
    expect(penalaranSah({ token_penalaran: 500 }, 500)).toBe(true);
    expect(penalaranSah({ token_penalaran: null }, 500)).toBe(false);
    expect(penalaranSah({}, 1)).toBe(false);
  });

  it('ulangan melewati penyedia yang baru saja melayani (sekali saja)', () => {
    const s: SetelanPanggil = { suhu: 0.2, maxTokens: 100 };
    expect(setelanUlang(s, { penyedia: 'Wafer' }).abaikanPenyedia).toEqual(['Wafer']);
    expect(setelanUlang({ ...s, abaikanPenyedia: ['Wafer'] }, { penyedia: 'Wafer' }).abaikanPenyedia).toEqual(['Wafer']);
    expect(setelanUlang(s, { penyedia: null })).toBe(s);
  });
});

describe('kritikus dijaga penalaran (D-1)', () => {
  it('jawaban "tanpa keberatan" dengan 60 token penalaran TIDAK dibaca; ulangan ke penyedia lain yang berpikir → dibaca', async () => {
    const u = urutan([jawab(TANPA_KEBERATAN, 60, 'Wafer'), jawab(TANPA_KEBERATAN, 2400, 'Z.AI')]);
    const r = await kritik(om(1), PAKET, KONTEKS, { panggil: u.panggil, putaran: 1, omongan: 1, cekMakna: true, ambangPenalaran: 500 });
    expect(u.rekam).toHaveLength(2);
    expect(u.rekam[0]?.setelan.abaikanPenyedia).toBeUndefined();
    expect(u.rekam[1]?.setelan.abaikanPenyedia).toEqual(['Wafer']);
    expect(u.rekam.every((x) => x.setelan.ambangPenalaran === 500)).toBe(true);
    expect(r.menjawab).toBe(true);
    expect(r.tanpa_keberatan).toBe(true);
    expect(r.penalaran_tidak_sah).toHaveLength(1);
    expect(r.panggilan.map((p) => p.penalaran_sah)).toEqual([false, true]);
  });

  it('dua kali di bawah ambang → diperlakukan tidak menjawab (menolak), walau isinya "tanpa keberatan"', async () => {
    const u = urutan([jawab(TANPA_KEBERATAN, 60, 'Wafer'), jawab(TANPA_KEBERATAN, 120, 'Phala')]);
    const r = await kritik(om(1), PAKET, KONTEKS, { panggil: u.panggil, putaran: 1, omongan: 1, cekMakna: true, ambangPenalaran: 500 });
    expect(r.menjawab).toBe(false);
    expect(r.tanpa_keberatan).toBe(false);
    expect(r.keberatan).toEqual([{ jenis: 'tidak-menjawab', bagian: '-', alasan: KEBERATAN_TIDAK_BERPIKIR }]);
    expect(r.penalaran_tidak_sah).toHaveLength(2);
  });

  it('token penalaran tidak dilaporkan = tidak terbukti berpikir', async () => {
    const u = urutan([jawab(TANPA_KEBERATAN, null, 'Wafer'), jawab(TANPA_KEBERATAN, null, 'Phala')]);
    const r = await kritik(om(1), PAKET, KONTEKS, { panggil: u.panggil, putaran: 1, omongan: 1, cekMakna: true, ambangPenalaran: 500 });
    expect(r.menjawab).toBe(false);
  });

  it('tanpa ambang (M2d-5) perilaku lama tidak berubah: 60 token dibaca', async () => {
    const u = urutan([jawab(TANPA_KEBERATAN, 60, 'Wafer')]);
    const r = await kritik(om(1), PAKET, KONTEKS, { panggil: u.panggil, putaran: 1, omongan: 1, cekMakna: true });
    expect(r.menjawab).toBe(true);
    expect(r.penalaran_tidak_sah).toBeUndefined();
    expect(KEBERATAN_TIDAK_MENJAWAB).not.toBe(KEBERATAN_TIDAK_BERPIKIR);
  });
});

describe('penebak GLM dijaga penalaran (D-1)', () => {
  it('tebakan GLM di bawah ambang dua kali → tak terbaca, dihitung BENAR/100 → soal ditolak', async () => {
    const o = om(2);
    const salah = o.kunci === 'a' ? 'b' : 'a';
    const tebak = (p: number, pen: string): JawabanModel => jawab(JSON.stringify({ pilihan: salah, yakin: 30, alasan: 'x' }), p, pen);
    // DeepSeek (ke-1, ke-2) tidak dijaga; GLM (ke-3) dua kali tidak berpikir.
    const daftar = [tebak(3000, 'DeepInfra'), tebak(3000, 'DeepInfra'), tebak(0, 'Sail Research'), tebak(19, 'AkashML')];
    const u = urutan(daftar);
    const t = await gerbangTebak(o, { panggil: u.panggil, putaran: 1, omongan: 2, ambangPenalaranKe: [undefined, undefined, 300] });
    expect(u.rekam).toHaveLength(4);
    expect(u.rekam[3]?.setelan.abaikanPenyedia).toEqual(['Sail Research']);
    const ke3 = t.tebakan[2];
    expect(ke3).toMatchObject({ benar: true, yakin: 100, terbaca: false, alasan: '(tidak terbukti berpikir)' });
    expect(ke3?.penalaran_tidak_sah).toHaveLength(2);
    expect(t.lolos).toBe(false);
  });

  it('penebak GLM yang berpikir di atas ambang dibaca seperti biasa', async () => {
    const o = om(2);
    const salah = o.kunci === 'a' ? 'b' : 'a';
    const u = urutan([jawab(JSON.stringify({ pilihan: salah, yakin: 30, alasan: 'x' }), 800, 'Z.AI')]);
    const t = await gerbangTebak(o, { panggil: u.panggil, putaran: 1, omongan: 2, ambangPenalaranKe: [undefined, undefined, 300] });
    expect(u.rekam).toHaveLength(3);
    expect(t.lolos).toBe(true);
  });
});

describe('GENERASI_M2D6 — effort untuk penalar GLM', () => {
  it('kritikus: reasoning.effort (bukan max_tokens), ambang ≥ 500, ruang jawaban cukup', () => {
    expect(GENERASI_M2D6.kritikus.tambahanBadan).toEqual({ reasoning: { effort: PENALAR_M2D6.kritikus.effort } });
    expect(GENERASI_M2D6.kritikus.ambangPenalaran).toBe(PENALAR_M2D6.kritikus.ambang);
    expect(PENALAR_M2D6.kritikus.ambang).toBeGreaterThanOrEqual(AMBANG_MIN_KRITIKUS);
    expect(['high', 'medium']).toContain(PENALAR_M2D6.kritikus.effort);
    expect(PENALAR_M2D6.kritikus.maxTokens).toBeGreaterThan(PENALAR_M2D6.kritikus.ambang + RUANG_JAWABAN_MIN.kritikus);
  });

  it('penebak: hanya yang GLM membawa effort + ambang; DeepSeek tidak', () => {
    GENERASI_M2D6.penebak.model.forEach((m, i) => {
      if (m === MODEL_OR_GLM) {
        expect(GENERASI_M2D6.penebak.tambahanBadan?.[i]).toEqual({ reasoning: { effort: PENALAR_M2D6.penebakGlm.effort } });
        expect(GENERASI_M2D6.penebak.ambangPenalaran?.[i]).toBe(PENALAR_M2D6.penebakGlm.ambang);
      } else {
        expect(m).toBe(MODEL_OR_DEEPSEEK);
        expect(GENERASI_M2D6.penebak.ambangPenalaran?.[i]).toBeUndefined();
      }
    });
    expect(GENERASI_M2D6.penebak.model).toContain(MODEL_OR_GLM);
    // M2d-5 tidak berubah.
    expect(GENERASI_M2D5.kritikus.ambangPenalaran).toBeUndefined();
  });

  it('lingkar: kritikus yang tidak berpikir tidak meloloskan omongan (kritikus-tidak-menjawab, dibawa)', async () => {
    const { hasil, rekaman, jejak } = await jalan(
      { jawaban: (i) => (i.peran === 'kritikus' ? { token_penalaran: 40, penyedia: i.ulang === 1 ? 'Phala' : 'Wafer' } : { token_penalaran: 900 }) },
      GENERASI_M2D6,
      1,
    );
    expect(hasil.lolos).toBe(false);
    const st = hasil.riwayat[0]?.omongan.map((o) => o.status);
    expect(st).toEqual(['kritikus-tidak-menjawab', 'kritikus-tidak-menjawab', 'kritikus-tidak-menjawab']);
    expect(hasil.riwayat[0]?.omongan.every((o) => o.dibawa)).toBe(true);
    const kr = dari(rekaman, 'kritikus');
    expect(kr.filter((r) => r.info.ulang === 1).every((r) => r.setelan.abaikanPenyedia?.[0] === 'Wafer')).toBe(true);
    // Penebak tidak dijalankan sesudah kritikus yang menolak.
    expect(dari(rekaman, 'penebak')).toHaveLength(0);
    const langkah = jejak.jejak().langkah.filter((l) => l.jenis === 'kritikus');
    expect(langkah.every((l) => Array.isArray(l.rincian['penalaran_tidak_sah']) && (l.rincian['penalaran_tidak_sah'] as unknown[]).length === 2)).toBe(true);
    expect(langkah.every((l) => l.alasan.some((a) => a.includes('tidak terbukti berpikir')))).toBe(true);
  });

  it('lingkar: penebak GLM yang tidak berpikir → tebakannya dihitung benar/100 → ditolak-tebak (dengan penyedia lain di ulangan)', async () => {
    const { hasil, rekaman } = await jalan(
      { jawaban: (i) => (i.peran === 'penebak' && i.ke === 3 ? { token_penalaran: 12, penyedia: 'Sail Research' } : { token_penalaran: 2000 }) },
      GENERASI_M2D6,
      1,
    );
    expect(hasil.lolos).toBe(false);
    expect(hasil.riwayat[0]?.omongan.map((o) => o.status)).toEqual(['ditolak-tebak', 'ditolak-tebak', 'ditolak-tebak']);
    const glm = dari(rekaman, 'penebak').filter((r) => r.info.ke === 3);
    expect(glm.map((r) => r.info.ulang)).toEqual([0, 1, 0, 1, 0, 1]);
    expect(glm.filter((r) => r.info.ulang === 1).every((r) => r.setelan.abaikanPenyedia?.[0] === 'Sail Research')).toBe(true);
    expect(hasil.riwayat[0]?.omongan[0]?.tebak?.tebakan[2]).toMatchObject({ terbaca: false, benar: true, yakin: 100 });
  });

  it('lingkar: penalar yang berpikir → lolos seperti biasa', async () => {
    const { hasil } = await jalan({ jawaban: () => ({ token_penalaran: 2000 }) }, GENERASI_M2D6);
    expect(hasil.lolos).toBe(true);
  });
});

describe('ulangan ke penyedia lain sampai ke badan permintaan dan ledger', () => {
  const KUNCI = 'sk-or-v1-UJI0123456789abcdefRAHASIA';
  const BASE = 'https://openrouter.ai/api/v1';
  const tangkap = (): { fetch: typeof fetch; badan: Record<string, unknown>[] } => {
    const badan: Record<string, unknown>[] = [];
    const f = (async (_u: string | URL | Request, init?: RequestInit) => {
      badan.push(JSON.parse(String(init?.body)) as Record<string, unknown>);
      return new Response(
        JSON.stringify({ provider: 'Wafer', choices: [{ message: { content: '{}' }, finish_reason: 'stop' }], usage: { prompt_tokens: 10, completion_tokens: 50, cost: 0.0002, completion_tokens_details: { reasoning_tokens: 40 } } }),
        { status: 200 },
      );
    }) as typeof fetch;
    return { fetch: f, badan };
  };
  const OPSI = { model: MODEL_OR_GLM, pesan: [{ role: 'user' as const, content: 'x' }], suhu: 0.2, maxTokens: 1000, tambahanBadan: { reasoning: { effort: 'high' } } };

  it('abaikanPenyedia → provider.ignore (slug); pagar M2d-5 lainnya persis sama', async () => {
    const t = tangkap();
    await chat({ baseUrl: BASE, apiKey: KUNCI, fetch: t.fetch, pagar: (m, a) => pagarPenyediaM2d6(m, a) }, { ...OPSI, abaikanPenyedia: ['Wafer', 'Sail Research', 'Tak Dikenal'] });
    const p = t.badan[0]?.['provider'] as Record<string, unknown>;
    expect(p['ignore']).toEqual(['wafer', 'sail-research']);
    const { ignore: _i, ...sisa } = p;
    expect(sisa).toEqual(pagarPenyedia(MODEL_OR_GLM));
    expect(t.badan[0]?.['reasoning']).toEqual({ effort: 'high' });
    expect(slugPenyedia('AtlasCloud')).toBe('atlas-cloud');
    // Tanpa abaikan: tidak ada medan ignore kosong.
    const t2 = tangkap();
    await chat({ baseUrl: BASE, apiKey: KUNCI, fetch: t2.fetch, pagar: (m, a) => pagarPenyediaM2d6(m, a) }, OPSI);
    expect(t2.badan[0]?.['provider']).toEqual(pagarPenyedia(MODEL_OR_GLM));
  });

  it('ledger mencatat reasoning yang diminta, ambang, dan penalaran_sah dari respons', async () => {
    const t = tangkap();
    const p = new PencatatBiaya({ paguUsd: 8, jalurLedger: null, biayaNyata: true });
    await chatBerpagu({ baseUrl: BASE, apiKey: KUNCI, fetch: t.fetch, pagar: (m, a) => pagarPenyediaM2d6(m, a) }, p, { ...OPSI, abaikanPenyedia: ['Phala'] }, 'm2d6/uji', { ambangPenalaran: 500 });
    expect(p.semua()[0]).toMatchObject({
      penyedia: 'Wafer', token_penalaran: 40, penalaran_diminta: { effort: 'high' }, ambang_penalaran: 500, penalaran_sah: false, penyedia_diabaikan: ['Phala'],
    });
    await chatBerpagu({ baseUrl: BASE, apiKey: KUNCI, fetch: t.fetch, pagar: (m, a) => pagarPenyediaM2d6(m, a) }, p, OPSI, 'm2d6/uji', { ambangPenalaran: 30 });
    expect(p.semua()[1]?.penalaran_sah).toBe(true);
    expect(p.semua()[1]).not.toHaveProperty('penyedia_diabaikan');
  });
});
