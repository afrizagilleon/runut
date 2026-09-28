/**
 * M2d-4: lingkar berperan generasi GAYA & MAKNA (`GENERASI_M2D4`).
 *
 * Paket dan draf sungguhan (TIRT, terlacak dari M2d-1), validator sungguhan;
 * hanya model yang dipalsukan. Generasi M2d-3 dites di `agen-peran.test.ts`
 * dan tidak berubah.
 */
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { GENERASI_M2D3, GENERASI_M2D4, MAX_TOKENS_PENEBAK_PERAN, PETUNJUK_PENEBAK_KUAT, PETUNJUK_PENEBAK_PERAN, jalankanPeran, promptPenulis, promptPenulisGaya, type Generasi, type HasilPeran, type InfoPeran, type PanggilPeran } from './agen-peran.ts';
import { PETUNJUK_PENEBAK } from './gerbang-tebak.ts';
import { KEBERATAN_TIDAK_MENJAWAB, MAX_TOKENS_KRITIKUS, promptKritikus, promptKritikusMakna } from './kritikus.ts';
import type { DrafSimulasi, KunciOpsi, OmonganDraf } from './draf.ts';
import { AKAR } from './env.ts';
import { PencatatJejak, validasiJejak } from './jejak.ts';
import type { PesanChat } from './klien.ts';
import { bacaBank } from './bank-gaya.ts';
import { MODEL_AGEN, MODEL_KRITIKUS } from './model.ts';
import type { PaketFakta } from './paket.ts';
import { rencanaSudut, type Sudut } from './sudut.ts';
import { pesanPaket, type JawabanModel, type SetelanPanggil } from './susun.ts';
import { validasiDraf } from './validasi.ts';

const PAKET = JSON.parse(readFileSync(`${AKAR}eval/keluaran-m2d/paket/tirt.json`, 'utf8')) as PaketFakta;
const DRAF = (
  JSON.parse(readFileSync(`${AKAR}eval/keluaran-m2d/sel-putaran2/tirt--deepseek_ai_DeepSeek_V4.1_Flash.json`, 'utf8')) as {
    draf: DrafSimulasi;
  }
).draf;
const om = (no: number): OmonganDraf => JSON.parse(JSON.stringify(DRAF.omongan[no - 1])) as OmonganDraf;
const KUNCI = [om(1).kunci, om(2).kunci, om(3).kunci];
const lain = (k: KunciOpsi): KunciOpsi => (k === 'a' ? 'c' : 'a');
const SUDUT_FIXTURE: Sudut[] = (() => {
  const awal = [1, 2, 3].map((no) => om(no).kartu_penentu[0] as string);
  const semua = rencanaSudut(PAKET);
  return [...awal.map((id) => semua.find((x) => x.fact_id === id) as Sudut), ...semua.filter((x) => !awal.includes(x.fact_id))];
})();

interface Rekaman {
  pesan: PesanChat[];
  setelan: SetelanPanggil;
  info: InfoPeran;
}

interface Skenario {
  tertebak?: (no: number, putaran: number, ke: number) => boolean;
  yakin?: (no: number, ke: number) => number;
  kritikus?: (no: number, putaran: number, ulang: number) => { teks: string; finish?: string } | Error;
  penulis?: (no: number, putaran: number) => OmonganDraf | string | undefined;
}

const TANPA_KEBERATAN_M2D4 = JSON.stringify({
  cek_klaim: { bagian_tak_tercek: [], kunci_menyatakan_tak_pasti: false },
  cek_pilihan: { juga_benar: [], alasan: '' },
  keberatan: [],
  arahan: '',
});

function palsu(s: Skenario): { panggil: PanggilPeran; rekaman: Rekaman[] } {
  const rekaman: Rekaman[] = [];
  const panggil: PanggilPeran = async (pesan, setelan, info) => {
    rekaman.push({ pesan: pesan.map((p) => ({ ...p })), setelan: { ...setelan }, info: { ...info } });
    const j = (teks: string, finish = 'stop'): JawabanModel => ({
      teks, token_masuk: 1000, token_keluar: 500, latensi_ms: 3, finish_reason: finish, biaya_usd: 0.001,
    });
    const no = info.omongan ?? 0;
    if (info.jenis === 'susun' || info.jenis === 'tulis-ulang') {
      const ganti = s.penulis?.(no, info.putaran);
      if (typeof ganti === 'string') return j(ganti);
      return j(JSON.stringify({ omongan: [{ no, ...(ganti ?? om(no)) }] }));
    }
    const kunci = KUNCI[no - 1] ?? 'a';
    if (info.jenis === 'gerbang-kartu') return j(JSON.stringify({ pilihan: kunci, kartu: [1], alasan: 'dari kartu 1' }));
    if (info.jenis === 'gerbang-tebak') {
      const kena = s.tertebak?.(no, info.putaran, info.ke) ?? false;
      return j(JSON.stringify({ pilihan: kena ? kunci : lain(kunci), yakin: s.yakin?.(no, info.ke) ?? 60, alasan: 'nadanya' }));
    }
    const k = s.kritikus?.(no, info.putaran, info.ulang ?? 0) ?? { teks: TANPA_KEBERATAN_M2D4 };
    if (k instanceof Error) throw k;
    return j(k.teks, k.finish ?? 'stop');
  };
  return { panggil, rekaman };
}

async function jalan(
  s: Skenario,
  generasi: Generasi = GENERASI_M2D4,
  maksPutaran?: number,
): Promise<{ hasil: HasilPeran; rekaman: Rekaman[]; jejak: PencatatJejak }> {
  const { panggil, rekaman } = palsu(s);
  const jam = (): Date => new Date('2026-09-29T00:00:00Z');
  const jejak = new PencatatJejak({
    paket: PAKET, model: MODEL_AGEN, promptSistem: generasi.promptPenulis(), pesanPaket: pesanPaket(PAKET), ringkasanPrompt: 'uji',
    jalur: null, jam, versi: 2, dibuatOleh: 'factory/llm/agen-peran.ts',
    modelPeran: { penulis: MODEL_AGEN, penebak: MODEL_AGEN, 'pembaca-kartu': MODEL_AGEN, kritikus: MODEL_KRITIKUS },
  });
  const hasil = await jalankanPeran({
    paket: PAKET, panggil, validasi: validasiDraf, jam, jejak, rencanaSudut: SUDUT_FIXTURE, generasi,
    ...(maksPutaran === undefined ? {} : { maksPutaran }),
  });
  return { hasil, rekaman, jejak };
}

const dari = (r: Rekaman[], peran: InfoPeran['peran']): Rekaman[] => r.filter((x) => x.info.peran === peran);

describe('M2d-4 — pemeriksa: gerbang gaya (D-1–D-3)', () => {
  it('fixture TIRT M2d-1 lolos validator dan gerbang gaya (tanpa "gue", pilihan ≤ 11 kata, satu klausa)', async () => {
    expect(validasiDraf(DRAF, PAKET)).toEqual([]);
    const { hasil } = await jalan({});
    expect(hasil).toMatchObject({ lolos: true, jumlah_putaran: 1 });
    expect(hasil.riwayat[0]?.omongan.map((o) => o.gaya?.tolak)).toEqual([false, false, false]);
  });

  it('prompt penulis M2d-4: "gw/aku" bukan "gue", batas dari soal manusia (26 / 11), satu klausa; M2d-3 tetap prompt lama', async () => {
    const p = promptPenulisGaya();
    expect(p).toContain('pesan teman paling banyak 26 kata');
    expect(p).toContain('setiap pilihan paling banyak 11 kata');
    expect(p).toContain('JANGAN "gue", "gua", "lo", atau "elo"');
    expect(p).not.toContain('{BATAS_');
    expect(p).not.toMatch(/kata sehari-hari \(gue/);
    expect(promptPenulis()).toMatch(/kata sehari-hari \(gue/);
    const { rekaman } = await jalan({});
    for (const r of dari(rekaman, 'penulis')) expect(r.pesan[0]?.content).toBe(p);
    const m2d3 = await jalan({}, GENERASI_M2D3);
    for (const r of dari(m2d3.rekaman, 'penulis')) expect(r.pesan[0]?.content).toBe(promptPenulis());
  });

  it('pesan ber-"gue", pilihan 12 kata, dan ekor ", jadi …" ditolak PEMERIKSA sebelum peran model mana pun; M2d-3 tidak menolaknya', async () => {
    const o1 = om(1);
    const kaku: OmonganDraf = {
      ...o1,
      pesan: o1.pesan.replace(/^Eh,/, 'Eh gue denger,'),
      pilihan: { ...o1.pilihan, b: 'Keliru, penghentian itu karena keraguan atas kelangsungan usaha, jadi bukan soal harga' },
    };
    expect(validasiDraf({ omongan: [kaku, om(2), om(3)] }, PAKET)).toEqual([]);
    const s: Skenario = { penulis: (no, p) => (no === 1 && p === 1 ? kaku : undefined) };
    const { hasil, rekaman, jejak } = await jalan(s);
    const r1 = hasil.riwayat[0]?.omongan[0];
    expect(r1).toMatchObject({ status: 'ditolak-pemeriksa', suara: { pemeriksa: false, kartu: null, tebak: null, kritikus: null } });
    const umpan = r1?.umpan.join('\n') ?? '';
    expect(umpan).toContain('[pemeriksa: G-register] Pesan memakai "gue"');
    expect(umpan).toContain('[pemeriksa: G-panjang] Pilihan b 12 kata; paling banyak 11 kata');
    expect(umpan).toContain('[pemeriksa: G-satu-klausa] Pilihan b menempelkan ekor ", jadi …"');
    expect(rekaman.filter((r) => r.info.putaran === 1 && r.info.omongan === 1 && r.info.peran !== 'penulis')).toHaveLength(0);
    // Umpan balik pemeriksa sampai ke penulis di putaran 2.
    expect(dari(rekaman, 'penulis').find((r) => r.info.putaran === 2 && r.info.omongan === 1)?.pesan[1]?.content).toContain('[pemeriksa: G-register]');
    const g = jejak.jejak().langkah.find((l) => l.jenis === 'gerbang-g' && l.omongan === 1 && l.putaran === 1);
    expect(g).toMatchObject({ putusan: 'tolak', rincian: { register: { tolak: true, kata: ['gue'] }, panjang: { tolak: true }, satu_klausa: { tolak: true } } });
    expect(validasiJejak(jejak.jejak())).toEqual([]);
    expect(hasil).toMatchObject({ lolos: true, jumlah_putaran: 2 });
    // Generasi M2d-3: gerbang gaya tidak dijalankan; omongan yang sama lolos pemeriksa.
    const m2d3 = await jalan({ penulis: s.penulis, kritikus: () => ({ teks: JSON.stringify({ keberatan: [], arahan: '' }) }) }, GENERASI_M2D3);
    expect(m2d3.hasil.riwayat[0]?.omongan[0]).toMatchObject({ status: 'lolos', gaya: null });
  });
});

describe('M2d-4 — bank gaya v2 sampai ke penulis (D-4)', () => {
  it('penulis M2d-4 menerima contoh dari bank v2 (nada enam-putar); penulis M2d-3 tetap dari bank v1', async () => {
    const v2 = new Set(bacaBank(2).map((k) => k.teks));
    const v1 = new Set(bacaBank(1).map((k) => k.teks));
    const contoh = (r: Rekaman): string[] =>
      (r.pesan[1]?.content ?? '').split('\n').filter((b) => b.startsWith('- "')).map((b) => b.slice(3, b.lastIndexOf('" (nada')));
    const { rekaman, jejak } = await jalan({});
    const penulis = dari(rekaman, 'penulis');
    expect(penulis).toHaveLength(3);
    for (const r of penulis) {
      const c = contoh(r);
      expect(c.length).toBeGreaterThanOrEqual(2);
      expect(c.every((t) => v2.has(t))).toBe(true);
    }
    const ids = jejak.jejak().langkah.filter((l) => l.jenis === 'susun').map((l) => l.rincian['contoh_gaya'] as string[]);
    expect(ids.flat().every((id) => id.startsWith('v2-'))).toBe(true);
    expect(jejak.jejak().langkah.filter((l) => l.jenis === 'susun').map((l) => l.rincian['nada'])).toEqual(['yakin', 'sok tahu', 'ragu']);
    const m2d3 = await jalan({ kritikus: () => ({ teks: JSON.stringify({ keberatan: [], arahan: '' }) }) }, GENERASI_M2D3);
    for (const r of dari(m2d3.rekaman, 'penulis')) expect(contoh(r).every((t) => v1.has(t))).toBe(true);
  });
});

describe('M2d-4 — nada enam-putar di lingkar (D-4)', () => {
  it('sudut ke-2 omongan 3 meminta nada "ikut-ikutan" (M2d-3: "yakin")', async () => {
    const nadaPutaran6 = async (g: Generasi): Promise<unknown> => {
      const { jejak } = await jalan(
        { tertebak: (no) => no === 3, kritikus: g.nama === 'm2d3' ? () => ({ teks: JSON.stringify({ keberatan: [], arahan: '' }) }) : undefined },
        g,
        6,
      );
      return jejak.jejak().langkah.find((l) => l.jenis === 'tulis-ulang' && l.putaran === 6 && l.omongan === 3)?.rincian['nada'];
    };
    expect(await nadaPutaran6(GENERASI_M2D4)).toBe('ikut-ikutan');
    expect(await nadaPutaran6(GENERASI_M2D3)).toBe('yakin');
  });
});

describe('M2d-4 — penebak lebih kuat (D-5)', () => {
  const semuaTeks = (r: Rekaman): string => r.pesan.map((p) => p.content).join('\n');

  it('petunjuk: kalimat "pemain pintar" dari kontrak, bentuk JSON tetap di baris terakhir; M2d-3 tetap petunjuk berhitung', () => {
    expect(PETUNJUK_PENEBAK_KUAT).toContain(
      "Berpikirlah seperti pemain pintar yang tahu kebiasaan pasar: hitung dari angka yang ada, cari pilihan yang paling 'wajar secara umum', curigai pilihan yang terlalu spesifik atau yang mengulang omongan dengan rapi.",
    );
    expect(PETUNJUK_PENEBAK_KUAT.split('\n').at(-1)).toBe(PETUNJUK_PENEBAK.split('\n').at(-1));
    expect(PETUNJUK_PENEBAK_KUAT).toContain('Kamu TIDAK diberi dokumen apa pun.');
    expect(GENERASI_M2D3.penebak.petunjuk).toBe(PETUNJUK_PENEBAK_PERAN);
  });

  it('tiga penebak per omongan: ke-1 dan ke-2 DeepSeek, ke-3 GLM-5.3; KETIGANYA hanya menerima pesan + pertanyaan + pilihan', async () => {
    const { rekaman } = await jalan({});
    const tebak = dari(rekaman, 'penebak');
    expect(tebak).toHaveLength(9);
    expect(tebak.map((r) => `${String(r.info.omongan)}/${String(r.info.ke)}:${r.info.model}`)).toEqual(
      [1, 2, 3].flatMap((no) => [`${no}/1:${MODEL_AGEN}`, `${no}/2:${MODEL_AGEN}`, `${no}/3:${MODEL_KRITIKUS}`]),
    );
    for (const r of tebak) {
      expect(r.pesan).toHaveLength(2);
      expect(r.pesan[0]?.content).toBe(PETUNJUK_PENEBAK_KUAT);
      expect(r.setelan).toMatchObject({ suhu: 1, maxTokens: MAX_TOKENS_PENEBAK_PERAN });
      const t = semuaTeks(r);
      for (const f of PAKET.fakta) {
        expect(t, `${String(r.info.ke)}: ${f.fact_id}`).not.toContain(f.fact_id);
        expect(t, `${String(r.info.ke)}: ${f.fact_id}`).not.toContain(f.klaim);
      }
      for (const no of [1, 2, 3]) expect(t).not.toContain(om(no).penjelasan.slice(0, 40));
      expect(t).not.toMatch(/KUNCI|kunci:|PENENTU|Salah-kaprah|kritikus|keberatan|contoh gaya|Kartu \d/i);
      // Isinya persis soal yang dilihat pemain sebelum membuka kartu.
      const o = om(r.info.omongan ?? 0);
      expect(r.pesan[1]?.content.split('\n')[1]).toBe(`Pertanyaan: Omongan ${o.nama} cocok dengan dokumennya?`);
    }
  });

  it('putusan K-05: tolak bila ≥ 2/3 benar ATAU rata-rata yakin pada yang benar ≥ 40 — GLM sendirian bisa menolak', async () => {
    const hanyaGlm = (yakin: number): Skenario => ({ tertebak: (no, p, ke) => no === 1 && p === 1 && ke === 3, yakin: () => yakin });
    const a = await jalan(hanyaGlm(60), GENERASI_M2D4, 1);
    expect(a.hasil.riwayat[0]?.omongan[0]).toMatchObject({ status: 'ditolak-tebak', tebak: { benar: 1, yakin_benar: 60 } });
    expect(a.hasil.riwayat[0]?.omongan[0]?.umpan[0]).toMatch(/^\[penebak tanpa kartu\] 1\/3 penebak TANPA kartu memilih kunci/);
    const b = await jalan(hanyaGlm(30), GENERASI_M2D4, 1);
    expect(b.hasil.riwayat[0]?.omongan[0]).toMatchObject({ status: 'lolos', tebak: { benar: 1, yakin_benar: 30 } });
    const c = await jalan({ tertebak: (no, p, ke) => no === 1 && p === 1 && ke !== 3, yakin: () => 20 }, GENERASI_M2D4, 1);
    expect(c.hasil.riwayat[0]?.omongan[0]).toMatchObject({ status: 'ditolak-tebak', tebak: { benar: 2 } });
  });

  it('jejak: langkah penebak menyebut model campuran dan model + biaya tiap tebakan; sah menurut skema', async () => {
    const { jejak } = await jalan({});
    const j = jejak.jejak();
    expect(validasiJejak(j)).toEqual([]);
    const t = j.langkah.filter((l) => l.jenis === 'gerbang-tebak');
    expect(t).toHaveLength(3);
    for (const l of t) {
      expect(l.model).toBe(`${MODEL_AGEN} ×2 + ${MODEL_KRITIKUS} ×1`);
      expect((l.rincian['tebakan'] as Array<{ model: string; biaya_usd: number }>).map((x) => x.model)).toEqual([MODEL_AGEN, MODEL_AGEN, MODEL_KRITIKUS]);
    }
  });
});

describe('M2d-4 — kritikus lebih awal + cek makna (D-6)', () => {
  const semuaTeks = (r: Rekaman): string => r.pesan.map((p) => p.content).join('\n');
  const cek = (x: { tak?: string[]; pasti?: boolean; juga?: string[]; keberatan?: unknown[]; arahan?: string }): string =>
    JSON.stringify({
      cek_klaim: { bagian_tak_tercek: x.tak ?? [], kunci_menyatakan_tak_pasti: x.pasti ?? false },
      cek_pilihan: { juga_benar: x.juga ?? [], alasan: x.juga === undefined ? '' : 'kartu juga membenarkannya' },
      keberatan: x.keberatan ?? [],
      arahan: x.arahan ?? '',
    });

  it('urutan per omongan: pembaca kartu → KRITIKUS (GLM, prompt makna) → penebak ×3; M2d-3 tetap kartu → penebak → kritikus', async () => {
    const { hasil, rekaman } = await jalan({});
    expect(hasil).toMatchObject({ lolos: true, jumlah_putaran: 1 });
    expect(rekaman.map((r) => `${r.info.peran}:${String(r.info.omongan)}`)).toEqual([
      'penulis:1', 'penulis:2', 'penulis:3',
      ...[1, 2, 3].flatMap((no) => [`pembaca-kartu:${no}`, `kritikus:${no}`, `penebak:${no}`, `penebak:${no}`, `penebak:${no}`]),
    ]);
    for (const r of dari(rekaman, 'kritikus')) {
      expect(r.info.model).toBe(MODEL_KRITIKUS);
      expect(r.setelan.maxTokens).toBe(MAX_TOKENS_KRITIKUS);
      expect(r.pesan[0]?.content).toBe(promptKritikusMakna());
    }
    const m2d3 = await jalan({ kritikus: () => ({ teks: JSON.stringify({ keberatan: [], arahan: '' }) }) }, GENERASI_M2D3);
    expect(m2d3.rekaman.slice(3, 8).map((r) => r.info.peran)).toEqual(['pembaca-kartu', 'penebak', 'penebak', 'penebak', 'kritikus']);
    for (const r of dari(m2d3.rekaman, 'kritikus')) expect(r.pesan[0]?.content).toBe(promptKritikus());
  });

  it('kritikus melihat kunci, isi kartu + tanda penentu, penjelasan, jawaban pembaca kartu; penebak disebut "dijalankan SESUDAH kritikus"', async () => {
    const { rekaman } = await jalan({});
    const kr = dari(rekaman, 'kritikus');
    expect(kr).toHaveLength(3);
    for (const [i, r] of kr.entries()) {
      const t = r.pesan[1]?.content ?? '';
      const o = om(i + 1);
      expect(t).toContain(`KUNCI: ${o.kunci}`);
      for (const id of o.kartu) expect(t).toContain(PAKET.fakta.find((f) => f.fact_id === id)?.klaim ?? '?');
      expect(t).toContain('[KARTU PENENTU]');
      expect(t).toContain('Salah-kaprah yang umum');
      expect(t).toContain(`memilih "${o.kunci}"`);
      expect(t).toContain('- tiga penebak tanpa kartu: dijalankan SESUDAH kritikus (hasilnya belum ada).');
    }
    const p = promptKritikusMakna();
    expect(p).toContain('Apakah SETIAP BAGIAN klaim dalam omongan teman bisa dicek dari kartu?');
    expect(p).toContain('Apakah ada LEBIH DARI SATU pilihan yang benar menurut kartu?');
  });

  it('kritikus keberatan → penebak TIDAK dipanggil; keberatan sampai ke penulis tetapi tidak pernah ke penebak', async () => {
    const keberatan = cek({ keberatan: [{ jenis: 'makna', bagian: 'pesan', alasan: 'klaim "rame" tidak ada di kartu volume' }], arahan: 'Ganti klaim teman.' });
    const { hasil, rekaman } = await jalan({ kritikus: (no, p) => (no === 2 && p === 1 ? { teks: keberatan } : { teks: TANPA_KEBERATAN_M2D4 }) });
    expect(hasil.riwayat[0]?.omongan[1]).toMatchObject({ status: 'ditolak-kritikus', suara: { pemeriksa: true, kartu: true, kritikus: false, tebak: null } });
    expect(dari(rekaman, 'penebak').filter((r) => r.info.putaran === 1).map((r) => r.info.omongan)).toEqual([1, 1, 1, 3, 3, 3]);
    const ulang = dari(rekaman, 'penulis').filter((r) => r.info.putaran === 2);
    expect(ulang.map((r) => r.info.omongan)).toEqual([2]);
    expect(ulang[0]?.pesan[1]?.content).toContain('- [kritikus: makna, pesan] klaim "rame" tidak ada di kartu volume');
    for (const r of dari(rekaman, 'penebak')) expect(semuaTeks(r)).not.toMatch(/rame" tidak ada|Ganti klaim teman|kritikus|keberatan/);
    expect(hasil).toMatchObject({ lolos: true, jumlah_putaran: 2 });
  });

  it('kritikus tanpa keberatan tidak meloloskan sendirian: penebak sesudahnya tetap bisa menolak', async () => {
    const { hasil } = await jalan({ tertebak: (no, p) => no === 3 && p === 1 }, GENERASI_M2D4, 1);
    expect(hasil.riwayat[0]?.omongan[2]).toMatchObject({ status: 'ditolak-tebak', suara: { kritikus: true, tebak: false } });
    expect(hasil.lolos).toBe(false);
  });

  it('cek makna (1): bagian klaim tak tercek + kunci "Betul" → keberatan makna yang MENOLAK, walau larik keberatan kritikus kosong', async () => {
    expect(om(1).pilihan[om(1).kunci]).toMatch(/^Betul,/);
    const tak = cek({ tak: ['gara-gara ada yang ngeborong'] });
    const { hasil, rekaman, jejak } = await jalan({ kritikus: (no, p) => (no === 1 && p === 1 ? { teks: tak } : { teks: TANPA_KEBERATAN_M2D4 }) });
    const o1 = hasil.riwayat[0]?.omongan[0];
    expect(o1).toMatchObject({ status: 'ditolak-kritikus', suara: { kritikus: false, tebak: null } });
    expect(o1?.kritik?.keberatan[0]).toMatchObject({ jenis: 'makna', bagian: 'kunci' });
    expect(o1?.kritik?.keberatan[0]?.alasan).toContain('"gara-gara ada yang ngeborong"');
    expect(o1?.kritik?.cek_makna).toMatchObject({ bagian_tak_tercek: ['gara-gara ada yang ngeborong'], kunci_menyatakan_tak_pasti: false });
    expect(dari(rekaman, 'penulis').find((r) => r.info.putaran === 2)?.pesan[1]?.content).toContain('[kritikus: makna, kunci] Bagian klaim teman yang tidak bisa dicek dari kartu');
    const l = jejak.jejak().langkah.find((x) => x.jenis === 'kritikus' && x.omongan === 1 && x.putaran === 1);
    expect(l).toMatchObject({ putusan: 'tolak', rincian: { cek_makna: { bagian_tak_tercek: ['gara-gara ada yang ngeborong'] }, sebelum_penebak: true } });
    expect(validasiJejak(jejak.jejak())).toEqual([]);
  });

  it('cek makna (1): tidak menolak bila kunci "Keliru" atau pilihan kunci menyatakan bagian itu tak bisa dipastikan', async () => {
    expect(om(2).pilihan[om(2).kunci]).toMatch(/^Keliru,/);
    const keliru = await jalan({ kritikus: (no) => ({ teks: no === 2 ? cek({ tak: ['alasan yang dulu'] }) : TANPA_KEBERATAN_M2D4 }) }, GENERASI_M2D4, 1);
    expect(keliru.hasil.riwayat[0]?.omongan[1]).toMatchObject({ status: 'lolos' });
    const pasti = await jalan({ kritikus: (no) => ({ teks: no === 1 ? cek({ tak: ['siapa yang membeli'], pasti: true }) : TANPA_KEBERATAN_M2D4 }) }, GENERASI_M2D4, 1);
    expect(pasti.hasil.riwayat[0]?.omongan[0]).toMatchObject({ status: 'lolos' });
  });

  it('cek makna (2): pilihan lain yang juga benar menurut kartu → keberatan kunci yang MENOLAK; menyebut kunci sendiri bukan keberatan', async () => {
    const k3 = om(3).kunci;
    const lainK3 = lain(k3);
    const { hasil } = await jalan({ kritikus: (no, p) => ({ teks: no === 3 && p === 1 ? cek({ juga: [k3, lainK3.toUpperCase()] }) : TANPA_KEBERATAN_M2D4 }) }, GENERASI_M2D4, 1);
    const o3 = hasil.riwayat[0]?.omongan[2];
    expect(o3).toMatchObject({ status: 'ditolak-kritikus', kritik: { cek_makna: { juga_benar: [k3, lainK3] } } });
    expect(o3?.kritik?.keberatan).toEqual([
      { jenis: 'kunci', bagian: 'pilihan', alasan: `Pilihan ${lainK3} juga benar menurut kartu (kartu juga membenarkannya); hanya satu pilihan yang boleh benar.` },
    ]);
    const sendiri = await jalan({ kritikus: () => ({ teks: cek({ juga: [k3] }) }) }, GENERASI_M2D4, 1);
    expect(sendiri.hasil.riwayat[0]?.omongan[2]).toMatchObject({ status: 'lolos' });
  });

  it('jawaban tanpa dua pertanyaan wajib = tak terbaca: diulang sekali, lalu keberatan "tidak menjawab" (dibawa tanpa ditulis ulang)', async () => {
    const polos = JSON.stringify({ keberatan: [], arahan: '' });
    const { hasil, rekaman } = await jalan({ kritikus: (no, p) => ({ teks: no === 1 && p === 1 ? polos : TANPA_KEBERATAN_M2D4 }) });
    expect(dari(rekaman, 'kritikus').filter((r) => r.info.putaran === 1 && r.info.omongan === 1).map((r) => r.info.ulang)).toEqual([0, 1]);
    expect(hasil.riwayat[0]?.omongan[0]).toMatchObject({
      status: 'kritikus-tidak-menjawab', dibawa: true, kritik: { menjawab: false, cek_makna: null, keberatan: [{ jenis: 'tidak-menjawab', alasan: KEBERATAN_TIDAK_MENJAWAB }] },
    });
    expect(hasil).toMatchObject({ lolos: true, jumlah_putaran: 2 });
  });
});
