/**
 * M2d-16 D-3/D-5/D-6: mesin v3 dengan pemanggil PALSU (nol biaya) — omongan
 * dinilai satu per satu lewat urutan gerbang baru (kode → saringan murah v2 →
 * pembaca kartu r0+r2 → penebak kuat → kritikus), yang lolos masuk bank,
 * penulis hanya menulis yang masih kurang, tulis ulang tanpa keadaan.
 */
import { mkdtempSync, readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { AKAR } from '../env.ts';
import { MODEL_OR_OPUS } from '../model.ts';
import { PaguTercapai } from '../pagu.ts';
import type { PaketFakta } from '../paket.ts';
import { SETELAN_PENULIS_OPUS_V3 } from '../pemanggil-v2.ts';
import type { InfoTemplat } from '../templat/penulis.ts';
import { bacaBank, idOmongan, shaPaketBank, simpanBank } from './bank.ts';
import { jalankanV3, MAKS_PUTARAN_V3, URUTAN_GERBANG_V3 } from './mesin-v3.ts';
import { beriLabel, drafTirt7 } from './palsu.ts';
import { keluaranV3, panggilV3Palsu, tigaOmonganTirt7, type SkenarioV3 } from './palsu-v3.ts';
import { pesanTulisUlangV3, pesanV3 } from './prompt-v3.ts';
import { drafDari } from './skema.ts';

const tirt = JSON.parse(readFileSync(`${AKAR}eval/penyusun/m2d11-tirt-7/paket.json`, 'utf8')) as PaketFakta;
const SHA = shaPaketBank(tirt);
const [o1, o2, o3] = tigaOmonganTirt7();
const bank = (): string => mkdtempSync(join(tmpdir(), 'bank-v3-')).replace(/\\/g, '/');
const jam = (): Date => new Date('2026-10-03T00:00:00Z');
const jalan = (s: SkenarioV3, folderBank: string, x: { maksPutaran?: number } = {}) => {
  const p = panggilV3Palsu(s);
  return { p, hasil: jalankanV3({ paket: tirt, panggil: p.panggil, folderBank, idJalan: 'uji-v3', jam, ...x }) };
};
const jenis = (log: readonly InfoTemplat[]): string[] => log.map((i) => i.jenis);
const hitung = (log: readonly InfoTemplat[], j: string, omongan?: number): number => log.filter((i) => i.jenis === j && (omongan === undefined || i.omongan === omongan)).length;
const salin = (teks: string): string => JSON.stringify({ teks, alasan: 'x' });

describe('mesin v3: jalan mulus', () => {
  it('urutan gerbang baru; satu panggilan penulis; tiga omongan masuk bank; simulasi tersusun', async () => {
    expect(URUTAN_GERBANG_V3).toEqual(['kode', 'saringan', 'kartu', 'penebak-kuat', 'kritikus']);
    const f = bank();
    const { p, hasil } = jalan({ penulis: () => keluaranV3([o1, o2, o3]) }, f);
    const h = await hasil;
    expect(h.terbit).toBe(true);
    expect(h.berhenti).toBeNull();
    expect(h.simulasi.draf?.omongan).toEqual([o1, o2, o3].map(drafDari));
    expect(h.nilai.map((n) => n.berhenti)).toEqual(['lolos', 'lolos', 'lolos']);
    expect(h.panggilan_penulis).toHaveLength(1);
    expect(h.panggilan_penulis[0]).toMatchObject({ putaran: 1, jenis: 'tulis', diminta: 3, terbaca: 3, model: MODEL_OR_OPUS, ada_teks_berpikir: true });
    // per omongan: 24 tebak rotasi → 2 pembaca kartu → 4 penebak kuat → 1 kritikus, dalam urutan itu
    const o1Log = p.log.filter((i) => i.omongan === 1);
    expect(jenis(o1Log)).toEqual([...Array<string>(24).fill('gerbang-tebak'), 'gerbang-kartu', 'gerbang-kartu', ...Array<string>(4).fill('gerbang-tebak-kuat'), 'kritikus']);
    expect(p.log).toHaveLength(1 + 3 * 31);
    // bank: satu berkas per omongan, jejak gerbang + asal jalan
    const b = bacaBank(f, SHA);
    expect(b.map((e) => e.id).sort()).toEqual([o1, o2, o3].map(idOmongan).sort());
    const e = b.find((x) => x.id === idOmongan(o2));
    expect(e?.asal).toMatchObject({ jalan: 'uji-v3', putaran: 1, urut: 2, penulis: MODEL_OR_OPUS });
    expect(Object.keys(e?.jejak_gerbang ?? {})).toEqual(['kode', 'saringan', 'kartu', 'penebak_kuat', 'kritikus']);
    expect(h.bank_baru).toHaveLength(3);
  });

  it('pesan penulis = prompt v3 satu pesan pengguna, profil Opus v3', async () => {
    const f = bank();
    const setelan: unknown[] = [];
    const p = panggilV3Palsu({ penulis: () => keluaranV3([o1, o2, o3]) });
    await jalankanV3({ paket: tirt, panggil: (pesan, s, i) => { if (i.jenis === 'tulis-bebas') setelan.push(s); return p.panggil(pesan, s, i); }, folderBank: f, idJalan: 'uji-v3', jam });
    expect(p.pesanPenulis[0]).toEqual(pesanV3(tirt, 3, []));
    expect(setelan).toEqual([SETELAN_PENULIS_OPUS_V3]);
  });
});

describe('mesin v3: bank menentukan jumlah yang ditulis', () => {
  it('bank sudah memuat 2 sudut → penulis diminta 1 omongan, {SUDUT_TERPAKAI} berisi kartu penentu bank', async () => {
    const f = bank();
    for (const [i, o] of [o1, o2].entries()) simpanBank(f, { id: idOmongan(o), paket_sha: SHA, kartu_penentu: [...o.kartu_penentu], omongan: o, jejak_gerbang: {}, asal: { jalan: 'lama', putaran: 1, urut: i + 1, penulis: 'x', sha256_prompt: 'x' }, waktu: `2026-10-02T00:00:0${String(i)}.000Z` });
    const { p, hasil } = jalan({ penulis: () => keluaranV3([o3]) }, f);
    const h = await hasil;
    expect(p.pesanPenulis[0]).toEqual(pesanV3(tirt, 1, [...o1.kartu_penentu, ...o2.kartu_penentu]));
    expect(h.panggilan_penulis[0]?.diminta).toBe(1);
    expect(h.terbit).toBe(true);
    expect(h.bank_baru).toEqual([idOmongan(o3)]);
  });

  it('bank sudah memuat 3 sudut → TIDAK ada panggilan model; simulasi langsung disusun', async () => {
    const f = bank();
    for (const [i, o] of [o1, o2, o3].entries()) simpanBank(f, { id: idOmongan(o), paket_sha: SHA, kartu_penentu: [...o.kartu_penentu], omongan: o, jejak_gerbang: {}, asal: { jalan: 'lama', putaran: 1, urut: i + 1, penulis: 'x', sha256_prompt: 'x' }, waktu: `2026-10-02T00:00:0${String(i)}.000Z` });
    const { p, hasil } = jalan({ penulis: () => { throw new Error('tidak boleh dipanggil'); } }, f);
    const h = await hasil;
    expect(p.log).toHaveLength(0);
    expect(h.terbit).toBe(true);
  });

  it('omongan lolos yang kartu penentunya sudah ada di bank tetap disimpan (alternatif), dan penulis diminta lagi yang kurang', async () => {
    const f = bank();
    const kembar = { ...o1, nama: 'Wulan' }; // kartu penentu sama dengan o1, draf lain
    const { p, hasil } = jalan({ penulis: (n) => (n === 1 ? keluaranV3([o1, kembar, o3]) : keluaranV3([o2])) }, f);
    const h = await hasil;
    expect(bacaBank(f, SHA)).toHaveLength(4);
    expect(h.panggilan_penulis.map((x) => x.diminta)).toEqual([3, 1]);
    expect(p.pesanPenulis[1]).toEqual(pesanV3(tirt, 1, [...o1.kartu_penentu, ...o3.kartu_penentu]));
    expect(h.terbit).toBe(true);
  });
});

describe('mesin v3: penolakan gerbang dan tulis ulang', () => {
  const [mentah1] = drafTirt7();
  const o1Cacat = beriLabel(mentah1); // Rp89 tidak ada di kartu → gerbang kode menolak

  it('kode menolak → tidak ada panggilan gerbang berbayar untuk omongan itu; putaran 2 = tulis ulang tanpa keadaan dengan alasan gerbang apa adanya', async () => {
    const f = bank();
    const { p, hasil } = jalan({ penulis: (n) => (n === 1 ? keluaranV3([o1Cacat, o2, o3]) : keluaranV3([o1])) }, f);
    const h = await hasil;
    const n1 = h.nilai[0];
    expect(n1).toMatchObject({ putaran: 1, urut: 1, berhenti: 'kode', id_bank: null });
    expect(n1?.alasan.length).toBeGreaterThan(0);
    expect(n1?.alasan[0]).toMatch(/^M2d-13: angka-di-kartu: /);
    expect(p.log.filter((i) => i.putaran === 1 && i.omongan === 1)).toHaveLength(0);
    expect(n1?.omongan).toEqual(o1Cacat);
    expect(p.pesanPenulis[1]).toEqual(pesanTulisUlangV3(tirt, [...o2.kartu_penentu, ...o3.kartu_penentu], [{ omongan: n1?.omongan ?? o1Cacat, alasan: n1?.alasan ?? [] }]));
    expect(p.pesanPenulis[1]).toHaveLength(1);
    expect(h.panggilan_penulis.map((x) => [x.jenis, x.diminta])).toEqual([['tulis', 3], ['tulis-ulang', 1]]);
    expect(h.terbit).toBe(true);
  });

  it('saringan murah v2 menolak (kunci 12/12 di pesan+pilihan) → berhenti sebelum pembaca kartu; SATU model 4/4 saja tidak menolak', async () => {
    const f = bank();
        const { p, hasil } = jalan({ penulis: () => keluaranV3([o1]), rotasi: (i, o, k) => (i.omongan === 1 && i.ke > 12 ? salin(k) : salin(o[(['a', 'c', 'a', 'c'] as const)[(i.ke - 1) % 4] as 'a'])) }, f, { maksPutaran: 1 });
    const h = await hasil;
    expect(h.nilai[0]?.berhenti).toBe('saringan');
    expect(h.nilai[0]?.alasan[0]).toMatch(/memilih isi kunci 12 dari 12/);
    expect(hitung(p.log, 'gerbang-kartu')).toBe(0);
    expect(hitung(p.log, 'gerbang-tebak-kuat')).toBe(0);
    // satu model (panggilan pesan+pilihan ke 13–16 = Haiku) memilih kunci 4/4, lainnya tidak → 4/12 → lolos saringan
    const g = bank();
    const r2 = jalan({ penulis: () => keluaranV3([o1]), rotasi: (i, o, k) => (i.ke >= 13 && i.ke <= 16 ? salin(k) : salin(o.a === k ? o.b : o.a)) }, g, { maksPutaran: 1 });
    const h2 = await r2.hasil;
    expect(h2.nilai[0]?.saringan?.putusan.kondisi['pesan-pilihan']).toMatchObject({ kunci: 4, n: 12 });
    expect(h2.nilai[0]?.berhenti).toBe('lolos');
  });

  it('pembaca kartu salah di satu rotasi → ditolak "kartu"; penebak kuat & kritikus tidak dipanggil', async () => {
    const f = bank();
    const { p, hasil } = jalan({ penulis: () => keluaranV3([o1]), kartu: (i, o, k) => JSON.stringify({ pilihan: i.ke === 3 ? (['a', 'b', 'c', 'd'] as const).find((h) => o[h] !== k) : (['a', 'b', 'c', 'd'] as const).find((h) => o[h] === k), kartu: [1], alasan: 'x', membingungkan: [] }) }, f, { maksPutaran: 1 });
    const h = await hasil;
    expect(h.nilai[0]?.berhenti).toBe('kartu');
    expect(hitung(p.log, 'gerbang-tebak-kuat')).toBe(0);
    expect(hitung(p.log, 'kritikus')).toBe(0);
    expect(bacaBank(f, SHA)).toHaveLength(0);
  });

  it('penebak kuat memilih isi kunci 4/4 → ditolak "penebak-kuat"; kritikus tidak dipanggil; alasan apa adanya ke penulis', async () => {
    const f = bank();
    const { p, hasil } = jalan({ penulis: (n) => keluaranV3(n === 1 ? [o1] : [o2]), kuat: (i, _o, k) => (i.putaran === 1 ? salin(k) : salin(_o.a)) }, f, { maksPutaran: 2 });
    const h = await hasil;
    expect(h.nilai[0]?.berhenti).toBe('penebak-kuat');
    expect(h.nilai[0]?.alasan).toEqual(['penebak kuat (tanpa kartu, pilihan diputar): memilih isi kunci di 4 dari 4 rotasi terbaca — jawabannya bisa ditebak tanpa membaca kartu']);
    expect(p.log.filter((i) => i.putaran === 1 && i.jenis === 'kritikus')).toHaveLength(0);
    expect(p.pesanPenulis[1]?.[0]?.content).toContain(`Belum bisa dipakai karena:\n- ${h.nilai[0]?.alasan[0] ?? ''}`);
    expect(h.terbit).toBe(false);
    expect(h.berhenti).toMatch(/bank baru memuat 1 kartu penentu berbeda/);
  });

  it('kritikus keberatan tingkat 1 → ditolak "kritikus"', async () => {
    const f = bank();
    const keberatan = JSON.stringify({ cek_klaim: { bagian_tak_tercek: [], kunci_menyatakan_tak_pasti: false }, cek_pilihan: { juga_benar: ['a'], alasan: 'a juga benar' }, keberatan: [{ jenis: 'kunci_ganda', lokasi: 'pilihan-a', alasan: 'a juga benar menurut kartu' }], arahan: 'ubah a' });
    const { hasil } = jalan({ penulis: () => keluaranV3([o1]), kritikus: () => keberatan }, f, { maksPutaran: 1 });
    const h = await hasil;
    expect(h.nilai[0]?.berhenti).toBe('kritikus');
    expect(h.nilai[0]?.alasan.join(' ')).toMatch(/a juga benar/);
    expect(bacaBank(f, SHA)).toHaveLength(0);
  });

  it('saringan tak-terukur (penebak tak terbaca > 1/3) → BUKAN penolakan: tidak masuk bank, tidak dikirim ke penulis sebagai alasan', async () => {
    const f = bank();
    const { p, hasil } = jalan({ penulis: (n) => keluaranV3(n === 1 ? [o1, o2] : [o3]), rotasi: (i, o) => (i.putaran === 1 && i.omongan === 1 ? 'maaf, saya tidak dapat menjawab' : salin(o[(['a', 'c', 'a', 'c'] as const)[(i.ke - 1) % 4] as 'a'])) }, f, { maksPutaran: 2 });
    const h = await hasil;
    expect(h.nilai[0]).toMatchObject({ berhenti: 'tak-terukur', id_bank: null });
    expect(hitung(p.log.filter((i) => i.putaran === 1), 'gerbang-kartu', 1)).toBe(0);
    expect(p.pesanPenulis[1]?.[0]?.content).not.toContain('Draf sebelumnya');
    expect(h.tak_terukur).toBe(1);
  });

  it(`paling banyak ${String(MAKS_PUTARAN_V3)} putaran penulis; sesudah itu berhenti dengan alasan bank`, async () => {
    const f = bank();
    const { hasil } = jalan({ penulis: () => keluaranV3([o1Cacat]) }, f);
    const h = await hasil;
    expect(h.panggilan_penulis).toHaveLength(MAKS_PUTARAN_V3);
    expect(h.terbit).toBe(false);
    expect(h.berhenti).toMatch(/bank baru memuat 0 kartu penentu berbeda/);
  });
});

describe('mesin v3: penjaga', () => {
  it('penulis berhenti di max_tokens tanpa JSON → jalan berhenti seketika, tanpa ulangan', async () => {
    const f = bank();
    const { p, hasil } = jalan({ penulis: () => ({ teks: '', finish_reason: 'length' }) }, f);
    const h = await hasil;
    expect(p.log).toHaveLength(1);
    expect(h.berhenti).toMatch(/penjaga: panggilan penulis berhenti di max_tokens tanpa JSON terurai/);
    expect(h.panggilan_penulis[0]).toMatchObject({ terbaca: 0, finish_reason: 'length' });
  });

  it('penulis menjawab tanpa satu pun omongan terurai → jalan berhenti (tidak membayar ulangan buta)', async () => {
    const f = bank();
    const { p, hasil } = jalan({ penulis: () => 'maaf, saya tidak bisa' }, f);
    const h = await hasil;
    expect(p.log).toHaveLength(1);
    expect(h.berhenti).toMatch(/penjaga: panggilan penulis tanpa omongan terurai/);
  });

  it('pagu tercapai di tengah gerbang → tersensor; omongan yang sudah lolos tetap di bank', async () => {
    const f = bank();
    const { hasil } = jalan({ penulis: () => keluaranV3([o1, o2, o3]), galatSebelum: (i) => (i.omongan === 2 && i.jenis === 'gerbang-tebak-kuat' ? new PaguTercapai(1, 0.4, 1.2, MODEL_OR_OPUS) : null) }, f);
    const h = await hasil;
    expect(h.tersensor).toBe(true);
    expect(h.berhenti).toMatch(/^terpotong pagu/);
    expect(bacaBank(f, SHA).map((e) => e.id)).toEqual([idOmongan(o1)]);
    expect(h.terbit).toBe(false);
  });

  it('biaya = jumlah biaya panggilan (penulis + gerbang)', async () => {
    const f = bank();
    const { hasil } = jalan({ penulis: () => keluaranV3([o1]) }, f, { maksPutaran: 1 });
    const h = await hasil;
    // palsu: penulis 0,19; penebak kuat 4 × 0,02; 24 tebak rotasi + 2 pembaca kartu + 1 kritikus × 0,001
    expect(h.biaya_usd).toBeCloseTo(0.19 + 0.08 + 0.027, 6);
  });
});
