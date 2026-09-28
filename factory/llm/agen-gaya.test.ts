/**
 * M2d-4: lingkar berperan generasi GAYA & MAKNA (`GENERASI_M2D4`).
 *
 * Paket dan draf sungguhan (TIRT, terlacak dari M2d-1), validator sungguhan;
 * hanya model yang dipalsukan. Generasi M2d-3 dites di `agen-peran.test.ts`
 * dan tidak berubah.
 */
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { GENERASI_M2D3, GENERASI_M2D4, jalankanPeran, promptPenulis, promptPenulisGaya, type Generasi, type HasilPeran, type InfoPeran, type PanggilPeran } from './agen-peran.ts';
import type { DrafSimulasi, KunciOpsi, OmonganDraf } from './draf.ts';
import { AKAR } from './env.ts';
import { PencatatJejak, validasiJejak } from './jejak.ts';
import type { PesanChat } from './klien.ts';
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
      return j(JSON.stringify({ pilihan: kena ? kunci : lain(kunci), yakin: 60, alasan: 'nadanya' }));
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
