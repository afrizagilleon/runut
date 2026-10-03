/**
 * Prompt penulis v2 M2d-15 D-1: berkas terpisah (v1 tidak berubah), aturan
 * gerbang kode eksplisit dengan ambang = perilaku kode, bank sudut tanpa teks
 * soal, tanpa nama model penguji (cegah Goodhart), profil sama dengan
 * pra-registrasi.
 */
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { teksPolos } from '../../skema/rujukan.ts';
import { AMBANG_M2D11 } from '../cacat/ambang.ts';
import { deteksi, menolak, type KodeDetektor, type SoalCacat } from '../cacat/detektor.ts';
import { AKAR } from '../env.ts';
import { MAKS_KATA_RESMI, RASIO_KESEIMBANGAN } from '../gerbang-artefak.ts';
import { batasPanjang } from '../gerbang-gaya.ts';
import { MODEL_OR_OPUS } from '../model.ts';
import type { PaketFakta } from '../paket.ts';
import { BATAS } from '../validasi.ts';
import { bankSudut, teksBank } from './bank-sudut.ts';
import { jalankanBebas, MAKS_PRA_PERIKSA, PROFIL_M2D13, PROFIL_M2D15, SETELAN_PENULIS_BEBAS } from './mesin.ts';
import { panggilBebasPalsu } from './palsu.ts';
import { AMBANG_DI_PROMPT_V2, pesanVersi1, promptPenulisBebas, promptPenulisOpusV2, sha256 } from './prompt.ts';

const paket = JSON.parse(readFileSync(`${AKAR}eval/penyusun/m2d11-tirt-7/paket.json`, 'utf8')) as PaketFakta;
const v2 = promptPenulisOpusV2(paket);

describe('prompt v1 tidak berubah', () => {
  it('sha256 prompt sistem v1 = yang tercatat di jalan M2d-13', () => {
    const h = JSON.parse(readFileSync(`${AKAR}eval/penyusun/m2d13-opus-2/hasil.json`, 'utf8')) as { sha256_prompt_sistem: string };
    expect(sha256(promptPenulisBebas(paket))).toBe(h.sha256_prompt_sistem);
    expect(pesanVersi1(paket)[0]?.content).toBe(promptPenulisBebas(paket));
  });

  it('v2 = berkas terpisah, berbeda dari v1', () => {
    expect(pesanVersi1(paket, 'v2')[0]?.content).toBe(v2);
    expect(v2).not.toBe(promptPenulisBebas(paket));
    expect(readFileSync(`${AKAR}factory/llm/bebas/prompt-penulis-opus-v2.md`, 'utf8')).toContain('{BANK_SUDUT}');
  });
});

describe('isi prompt v2', () => {
  it('semua isian terisi; memuat bank sudut apa adanya', () => {
    expect(v2).not.toMatch(/\{[A-Z_0-9]+\}/);
    expect(v2).toContain(teksBank(bankSudut(paket)));
  });

  it('aturan kontrak D-1: satu klausa, angka penentu hanya di kartu, tiga sudut berbeda, kunci tidak seragam, label & umpan balik', () => {
    for (const s of [
      'SATU KLAUSA PER PILIHAN',
      'ANGKA PENENTU HANYA DI KARTU, BUKAN DI PESAN',
      'Tiga omongan WAJIB bersudut berbeda',
      'Huruf kunci ketiga omongan tidak boleh sama semua',
      'SETIAP ANGKA DAN TANGGAL HARUS ADA DI KARTU OMONGAN ITU',
      'WAJIB memuat nama jenis kesalahannya',
      'WAJIB menyebut "kartu N"',
      'Urutan angka',
      'titik tengah',
      'Kata mutlak',
      'Kata pelunak',
    ]) expect(v2).toContain(s);
  });

  it('ambang di prompt diambil dari konstanta kode', () => {
    const b = batasPanjang();
    expect(v2).toContain(`paling banyak ${String(b.pilihan)} kata dan ${String(BATAS.opsi)} karakter`);
    expect(v2).toContain(`Paling banyak ${String(b.pesan)} kata dan ${String(BATAS.pesan)} karakter`);
    expect(v2).toContain(`Kunci ≤ ${String(RASIO_KESEIMBANGAN).replace('.', ',')} × median`);
    expect(v2).toContain(`Pilihan terpendek ≥ ${String(Math.round((1 - BATAS.timpang) * 100))} %`);
    expect(v2).toContain(`atau ${String(MAKS_KATA_RESMI)} kata atau lebih`);
    expect(v2).toContain(`teks tampil ≤ ${String(BATAS.label)} karakter`);
    expect(v2).toContain(`Paling banyak ${String(BATAS.penjelasan)} karakter polos`);
  });

  it('tanpa nama model penguji dan tanpa ajakan "menipu" penguji (cegah Goodhart)', () => {
    expect(v2).not.toMatch(/haiku|deepseek|glm|claude|opus|gpt|gemini/i);
    expect(v2).not.toMatch(/menipu|mengelabui|mengakali|penebak/i);
  });

  it('tidak membawa potongan 5 kata dari soal sumber bank (pesan, pilihan, penjelasan, umpan balik) — teladan DADA sama dengan v1', () => {
    const lima = (s: string): string[] => {
      const k = teksPolos(s).toLowerCase().split(/[^\p{L}\p{N}]+/u).filter((x) => x !== '');
      const g: string[] = [];
      for (let i = 0; i + 5 <= k.length; i++) g.push(k.slice(i, i + 5).join(' '));
      return g;
    };
    const kataV2 = ` ${v2.toLowerCase().split(/[^\p{L}\p{N}]+/u).filter((x) => x !== '').join(' ')} `;
    const kataV1 = ` ${promptPenulisBebas(paket).toLowerCase().split(/[^\p{L}\p{N}]+/u).filter((x) => x !== '').join(' ')} `;
    const bocor: string[] = [];
    for (const j of ['m2d11-tirt-1', 'm2d11-tirt-2', 'm2d11-tirt-3', 'm2d11-tirt-4', 'm2d11-tirt-5', 'm2d11-tirt-6', 'm2d11-tirt-7', 'm2d13-opus-1', 'm2d13-opus-2', 'm2d13-haiku-1', 'm2d13-haiku-2']) {
      const h = JSON.parse(readFileSync(`${AKAR}eval/penyusun/${j}/hasil.json`, 'utf8')) as { versi: Array<{ omongan: { pesan: string; pilihan: Record<string, string>; penjelasan: string; pengecoh?: Record<string, { umpan_balik: string }> } | null }> };
      for (const v of h.versi) {
        if (v.omongan === null) continue;
        for (const t of [v.omongan.pesan, ...Object.values(v.omongan.pilihan), v.omongan.penjelasan, ...Object.values(v.omongan.pengecoh ?? {}).map((p) => p.umpan_balik)]) {
          // potongan yang sudah ada di prompt v1 (aturan/teladan bersama) bukan bocoran baru
          for (const g of lima(t)) if (kataV2.includes(` ${g} `) && !kataV1.includes(` ${g} `)) bocor.push(`${j}: ${g}`);
        }
      }
    }
    expect([...new Set(bocor)]).toEqual([]);
  });
});

describe('ambang di prompt = perilaku detektor pada AMBANG_M2D11', () => {
  const A = AMBANG_DI_PROMPT_V2;
  const soal = (pesan: string, a: string, b: string, c: string, d: string): SoalCacat => ({ pesan, pilihan: { a, b, c, d }, kunci: 'a' });
  const kena = (s: SoalCacat, kode: KodeDetektor): boolean => menolak(deteksi(s, AMBANG_M2D11)).some((x) => x.kode === kode);
  const x = (n: number): string => 'x'.repeat(n);
  const kata = (awal: string, n: number): string => Array.from({ length: n }, (_, i) => `${awal}${String.fromCharCode(97 + i)}`).join(' ');

  it('D1: kunci terpanjang sendirian > D1_RASIO × median pengecoh (batas tepat di sekitar angka prompt)', () => {
    const m = 40;
    expect(kena(soal('p', `Betul, ${x(Math.floor(m * A.D1_RASIO) + 1)}`, `Keliru, ${x(m)}`, `Betul, ${x(m)}`, `Keliru, ${x(m)}`), 'D1')).toBe(true);
    expect(kena(soal('p', `Betul, ${x(Math.ceil(m * A.D1_RASIO) - 1)}`, `Keliru, ${x(m)}`, `Betul, ${x(m)}`, `Keliru, ${x(m)}`), 'D1')).toBe(false);
  });

  it('D1: terpanjang/terpendek > D1_TERPANJANG', () => {
    const m = 40;
    expect(kena(soal('p', `Betul, ${x(m)}`, `Keliru, ${x(Math.floor(m * A.D1_TERPANJANG) + 1)}`, `Betul, ${x(m)}`, `Keliru, ${x(m)}`), 'D1')).toBe(true);
    expect(kena(soal('p', `Betul, ${x(m)}`, `Keliru, ${x(Math.ceil(m * A.D1_TERPANJANG) - 1)}`, `Betul, ${x(m)}`, `Keliru, ${x(m)}`), 'D1')).toBe(false);
  });

  it('D4: potongan D4_N kata pesan yang hanya diulang di kunci menolak; D4_N − 1 kata tidak', () => {
    const pesan = kata('pesan', A.D4_N + 2);
    const potong = (n: number): string => pesan.split(' ').slice(0, n).join(' ');
    const pengecoh = ['Keliru, satu dua tiga empat', 'Betul, lima enam tujuh delapan', 'Keliru, sembilan sepuluh sebelas duabelas'] as const;
    expect(kena(soal(pesan, `Betul, ${potong(A.D4_N)} zz`, ...pengecoh), 'D4')).toBe(true);
    expect(kena(soal(pesan, `Betul, ${potong(A.D4_N - 1)} zz`, ...pengecoh), 'D4')).toBe(false);
  });

  it('D5: kunci berbagi D5_M unsur lebih banyak dari pengecoh tertinggi menolak; D5_M − 1 tidak', () => {
    // pengecoh i berbagi tepat satu kata (bersama-i) dengan kunci; kunci berbagi 3; pengecoh tertinggi 1 + kata pengecoh lain
    const bersama = ['merah', 'biru', 'hijau', 'kuning', 'ungu'];
    const buat = (selisih: number): SoalCacat => {
      const k = bersama.slice(0, selisih + 1);
      const p = k.map((w, i) => `${w} unik${String(i)}`);
      while (p.length < 3) p.push(`lain${String(p.length)} sendiri`);
      return soal('p', `Betul, ${k.join(' ')}`, `Keliru, ${p[0] ?? ''}`, `Betul, ${p[1] ?? ''}`, `Keliru, ${p[2] ?? ''}`);
    };
    expect(kena(buat(A.D5_M), 'D5')).toBe(true);
    expect(kena(buat(A.D5_M - 1), 'D5')).toBe(false);
  });

  it('D3: selisih Jaccard kunci–pesan dengan pengecoh tertinggi > D3 menolak; ≤ D3 tidak', () => {
    const pesan = 'alfa beta gamma delta';
    const J = (a: string): number => {
      const s = new Set(a.split(' '));
      const p = new Set(pesan.split(' '));
      const i = [...s].filter((w) => p.has(w)).length;
      return i / (s.size + p.size - i);
    };
    const kunci = 'alfa beta zeta';
    const tinggi = 'alfa eta theta';
    const dekat = 'alfa beta theta iota';
    expect(J(kunci) - J(tinggi)).toBeGreaterThan(A.D3);
    expect(J(kunci) - J(dekat)).toBeLessThanOrEqual(A.D3);
    expect(kena(soal(pesan, `Betul, ${kunci}`, `Keliru, ${tinggi}`, 'Betul, iota kappa lamda', 'Keliru, mu nu xi'), 'D3')).toBe(true);
    expect(kena(soal(pesan, `Betul, ${kunci}`, `Keliru, ${dekat}`, 'Betul, iota kappa lamda', 'Keliru, mu nu xi'), 'D3')).toBe(false);
  });

  it('D2 hanya bila rincian menyendiri di KUNCI; D6 kata mutlak di kunci saja; D7 pelunak di mana pun sendirian', () => {
    expect(kena(soal('p', 'Betul, kartu mencatat itu', 'Keliru, angka lain', 'Betul, hal lain', 'Keliru, soal lain'), 'D2')).toBe(true);
    expect(kena(soal('p', 'Betul, hal itu', 'Keliru, kartu lain', 'Betul, hal lain', 'Keliru, soal lain'), 'D2')).toBe(false);
    expect(kena(soal('p', 'Betul, selalu begitu', 'Keliru, angka lain', 'Betul, hal lain', 'Keliru, soal lain'), 'D6')).toBe(true);
    expect(kena(soal('p', 'Betul, begitu', 'Keliru, selalu lain', 'Betul, hal lain', 'Keliru, soal lain'), 'D6')).toBe(false);
    expect(kena(soal('p', 'Betul, begitu', 'Keliru, mungkin lain', 'Betul, hal lain', 'Keliru, soal lain'), 'D7')).toBe(true);
    expect(kena(soal('p', 'Betul, mungkin begitu', 'Keliru, mungkin lain', 'Betul, hal lain', 'Keliru, soal lain'), 'D7')).toBe(false);
  });

  it('D9: tiga angka tunggal harus urut a→d (naik atau turun)', () => {
    expect(kena(soal('p', 'Betul, Rp97', 'Keliru, Rp106', 'Betul, Rp89', 'Keliru, hal lain'), 'D9')).toBe(true);
    expect(kena(soal('p', 'Betul, Rp89', 'Keliru, Rp97', 'Betul, Rp106', 'Keliru, hal lain'), 'D9')).toBe(false);
  });

  it('angka di teks prompt = AMBANG_DI_PROMPT_V2', () => {
    const k = (n: number): string => String(n).replace('.', ',');
    expect(v2).toContain(`lebih dari ${k(A.D1_RASIO)} × median pengecoh`);
    expect(v2).toContain(`pilihan terpanjang ≤ ${k(A.D1_TERPANJANG)} × pilihan terpendek`);
    expect(v2).toContain(`potongan ${String(A.D4_N)} kata berurutan`);
    expect(v2).toContain(`selisih > ${k(A.D3)} indeks Jaccard`);
    expect(v2).toContain(`pilihan lain ${String(A.D5_M)} unsur atau lebih banyak`);
  });
});

describe('profil M2d-15 = pra-registrasi §3–§4', () => {
  it('Opus effort "medium" (bukan "max"), max_tokens 16.000, suhu 1, prompt v2, pra-periksa 2; M2d-13 tetap', () => {
    expect(PROFIL_M2D15.setelan).toEqual({ suhu: 1, maxTokens: 16_000, tambahanBadan: { reasoning: { effort: 'medium' } } });
    expect(PROFIL_M2D15.prompt).toBe('v2');
    expect(PROFIL_M2D15.praPeriksa).toBe(MAKS_PRA_PERIKSA);
    expect(PROFIL_M2D13).toEqual({ nama: 'm2d13', prompt: 'v1', setelan: SETELAN_PENULIS_BEBAS, praPeriksa: 0 });
    const pra = readFileSync(`${AKAR}docs/bukti/m2d15-praregistrasi.md`, 'utf8');
    expect(pra).toContain('`reasoning: { effort: "medium" }`, `max_tokens` **16.000**, suhu 1,0');
    expect(pra).toContain('Paling banyak **2 tulis-ulang pra-periksa per versi**');
  });

  it('mesin dengan profil M2d-15 memakai prompt sistem v2 yang sama byte demi byte di semua panggilan penulis, setelan M2d-15', async () => {
    const setelanDilihat: unknown[] = [];
    const p = panggilBebasPalsu();
    const panggil: typeof p.panggil = (pesan, setelan, info) => {
      if (info.jenis === 'tulis-bebas' || info.jenis === 'tulis-praperiksa') setelanDilihat.push(setelan);
      return p.panggil(pesan, setelan, info);
    };
    const h = await jalankanBebas({ paket, penulis: MODEL_OR_OPUS, panggil, prompt: PROFIL_M2D15.prompt, setelan: PROFIL_M2D15.setelan, praPeriksa: PROFIL_M2D15.praPeriksa });
    expect(p.pesanPenulis.length).toBeGreaterThan(1);
    expect(new Set(p.pesanPenulis.map((m) => m[0]?.content))).toEqual(new Set([v2]));
    expect(h.sha256_prompt_sistem).toBe(sha256(v2));
    expect(setelanDilihat.every((s) => JSON.stringify(s) === JSON.stringify(PROFIL_M2D15.setelan))).toBe(true);
  });
});
