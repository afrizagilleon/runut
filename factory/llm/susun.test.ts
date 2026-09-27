/**
 * M2d T-03: penyusun — lingkar tulis → validator → umpan balik → tulis ulang.
 *
 * Model dipalsukan. Yang dijaga: paling banyak 3 percobaan; umpan balik memuat
 * kode masalah validator; suhu dan `max_tokens` satu nilai untuk semua model;
 * prompt sistem = berkas terlacak; keluaran yang tidak bisa diurai adalah
 * penolakan, bukan sesuatu yang diperbaiki diam-diam.
 */
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import type { PesanChat } from './klien.ts';
import type { MasalahDraf } from './draf.ts';
import type { PaketFakta } from './paket.ts';
import {
  MAKS_PERCOBAAN,
  MAX_TOKENS,
  SUHU,
  pesanPaket,
  pesanUmpanBalik,
  promptSistem,
  susun,
  uraiKeluaran,
  type JawabanModel,
} from './susun.ts';

const PAKET: PaketFakta = {
  paket_id: 'ultj',
  simbol: 'XXXX',
  nama_emiten: 'PT Contoh Tbk',
  nama_samaran: 'Perusahaan X',
  tanggal_t: '2026-05-04',
  peristiwa: 'Contoh peristiwa.',
  fakta: [
    {
      fact_id: 'div-a',
      jenis: 'dokumen',
      asal: 'daftar aksi korporasi (dividen)',
      terbit: '2026-05-04',
      klaim: 'Dividen tunai Rp130 per lembar dengan tanggal ex 4 Mei 2026.',
      nilai: 130,
      satuan: 'rupiah per lembar',
      turunan_dari: [],
      catatan: [],
    },
  ],
  kata_terlarang: ['XXXX'],
  disingkirkan: [],
  pemeriksaan: { aturan_dijalankan: 0, aturan_dilewati: 0, temuan: [] },
};

function jawab(teks: string): JawabanModel {
  return { teks, token_masuk: 100, token_keluar: 50, latensi_ms: 10, finish_reason: 'stop', biaya_usd: 0.001 };
}

const SAH = '{"omongan":[]}';
const tolakKecualiSah = (draf: unknown): MasalahDraf[] =>
  JSON.stringify(draf) === SAH ? [] : [{ kode: 'UJI_TOLAK', omongan: 2, pesan: 'contoh masalah' }];

describe('susun — lingkar umpan balik', () => {
  it('JSON rusak → ditolak validator → lolos di percobaan ke-3; umpan balik memuat kode masalah', async () => {
    const dikirim: PesanChat[][] = [];
    const urutan = ['bukan json sama sekali', '{"omongan":[1]}', `<think>boleh mikir</think>\n${SAH}`];
    const hasil = await susun({
      paket: PAKET,
      model: 'm',
      panggil: async (pesan) => {
        dikirim.push(pesan.map((p) => ({ ...p })));
        return jawab(urutan[dikirim.length - 1] ?? '');
      },
      validasi: tolakKecualiSah,
    });
    expect(hasil.lolos).toBe(true);
    expect(hasil.lolos_di).toBe(3);
    expect(hasil.percobaan.map((p) => p.masalah.map((m) => m.kode))).toEqual([['JSON_RUSAK'], ['UJI_TOLAK'], []]);
    expect(dikirim).toHaveLength(3);
    // Percobaan 2 menerima umpan balik JSON_RUSAK; percobaan 3 menerima UJI_TOLAK dan JSON sebelumnya.
    expect(dikirim[1]?.at(-1)?.content).toContain('[JSON_RUSAK]');
    expect(dikirim[2]?.at(-2)).toEqual({ role: 'assistant', content: '{"omongan":[1]}' });
    expect(dikirim[2]?.at(-1)?.content).toContain('[UJI_TOLAK] omongan 2: contoh masalah');
    expect(hasil.draf).toEqual({ omongan: [] });
  });

  it('paling banyak 3 percobaan; tidak lolos → draf null', async () => {
    let n = 0;
    const hasil = await susun({
      paket: PAKET,
      model: 'm',
      panggil: async () => {
        n += 1;
        return jawab('{"omongan":[1]}');
      },
      validasi: tolakKecualiSah,
    });
    expect(MAKS_PERCOBAAN).toBe(3);
    expect(n).toBe(3);
    expect(hasil.lolos).toBe(false);
    expect(hasil.lolos_di).toBeNull();
    expect(hasil.draf).toBeNull();
  });

  it('panggilan gagal menghentikan sel dan dicatat; galat "hentikan semua" dilempar ulang', async () => {
    const gagal = await susun({
      paket: PAKET,
      model: 'm',
      panggil: async () => {
        throw new Error('HTTP 500');
      },
      validasi: tolakKecualiSah,
    });
    expect(gagal.percobaan).toHaveLength(1);
    expect(gagal.berhenti).toContain('HTTP 500');

    class Pagu extends Error {}
    await expect(
      susun({
        paket: PAKET,
        model: 'm',
        panggil: async () => {
          throw new Pagu('pagu');
        },
        validasi: tolakKecualiSah,
        hentikanSemua: (g) => g instanceof Pagu,
      }),
    ).rejects.toBeInstanceOf(Pagu);
  });

  it('suhu dan max_tokens diberikan penyusun ke setiap panggilan — sama untuk setiap model', async () => {
    const setelan: Array<{ model: string; suhu: number; maxTokens: number }> = [];
    for (const model of ['a', 'b', 'c']) {
      const h = await susun({
        paket: PAKET,
        model,
        panggil: async (_p, s) => {
          setelan.push({ model, ...s });
          return jawab('{"omongan":[1]}');
        },
        validasi: tolakKecualiSah,
      });
      expect([h.suhu, h.max_tokens]).toEqual([SUHU, MAX_TOKENS]);
    }
    expect(setelan).toHaveLength(9);
    expect(new Set(setelan.map((s) => `${String(s.suhu)}/${String(s.maxTokens)}`))).toEqual(
      new Set([`${String(SUHU)}/${String(MAX_TOKENS)}`]),
    );
  });
});

describe('prompt — berkas terlacak, paket ringkas', () => {
  it('pesan sistem = isi factory/llm/prompt-susun.md', async () => {
    const berkas = readFileSync(fileURLToPath(new URL('./prompt-susun.md', import.meta.url)), 'utf8');
    expect(promptSistem()).toBe(berkas.replace(/\r\n/g, '\n').trim());
    let pertama: PesanChat[] = [];
    await susun({
      paket: PAKET,
      model: 'm',
      panggil: async (p) => {
        pertama = p;
        return jawab(SAH);
      },
      validasi: tolakKecualiSah,
    });
    expect(pertama[0]).toEqual({ role: 'system', content: promptSistem() });
    expect(pertama[1]).toEqual({ role: 'user', content: pesanPaket(PAKET) });
  });

  it('pesan paket memuat T, samaran, dan tiap fakta; aturan K-05 ada di prompt', () => {
    const teks = pesanPaket(PAKET);
    expect(teks).toContain('4 Mei 2026');
    expect(teks).toContain('Perusahaan X');
    expect(teks).toContain('- div-a | dokumen');
    const p = promptSistem();
    for (const frasa of [
      '220 karakter',
      'Minimal satu dari tiga omongan ternyata BETUL',
      'tepat dua diawali "Betul," dan tepat dua diawali "Keliru,"',
      'Tanpa berhitung di kepala',
      'sesudah T',
      'Jangan pernah menyarankan membeli atau menjual',
      'bagus, jelek, sehat, buruk, murah, atau mahal',
      'Salah-kaprah yang umum:',
    ]) {
      expect(p, frasa).toContain(frasa);
    }
  });

  it('umpan balik menomori masalah', () => {
    expect(
      pesanUmpanBalik([
        { kode: 'A', omongan: null, pesan: 'x' },
        { kode: 'B', omongan: 3, pesan: 'y' },
      ]),
    ).toContain('1. [A] x\n2. [B] omongan 3: y');
  });
});

describe('uraiKeluaran', () => {
  it('membuang <think>, membaca pagar ```json, dan menolak yang rusak', () => {
    expect(uraiKeluaran('<think>{"salah":1}</think>{"a":1}')).toMatchObject({ ok: true, nilai: { a: 1 } });
    expect(uraiKeluaran('teks\n```json\n{"b":2}\n```')).toMatchObject({ ok: true, nilai: { b: 2 } });
    expect(uraiKeluaran('{"a":')).toMatchObject({ ok: false });
    expect(uraiKeluaran('tidak ada')).toMatchObject({ ok: false });
  });
});
