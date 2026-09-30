/**
 * M2d-9 T-05: panel penyetuju (D-5) — suntingan hanya kata (angka, rujukan,
 * label dikunci), dicatat, dan WAJIB diuji ulang oleh gerbang yang sama
 * sebelum boleh disetujui; keluaran ke folder jalan.
 */
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import { FOLDER_GUDANG } from '../../factory/muat/gudang.ts';
import type { KeadaanOmongan } from '../../factory/llm/agen-pengecoh.ts';
import type { OmonganDraf } from '../../factory/llm/draf.ts';
import { akarSementara, bacaSse, minta, mulaiServer, peristiwaSse, type ServerUji } from './bantu-uji.ts';
import type { DataJalan } from './jalan.ts';
import { mesinPalsu } from './palsu.ts';
import { bolehSetujui, catatSuntingan, omonganDiuji, periksaSuntingan, terapkanSuntingan } from './penyetuju.ts';

function omongan(): OmonganDraf {
  return {
    nama: 'Andi',
    jam: '20.45',
    pesan: 'Dari 26 November sampai kemarin naiknya 58 perak, gila sih.',
    angka_pesan: [{ teks: '26 November', fact_id: 'naik' }, { teks: '58', fact_id: 'naik' }],
    kartu: ['naik', 'harga'],
    kartu_penentu: ['naik'],
    pilihan: {
      a: 'Keliru, [[harga|Rp106]] itu harga penutupan kemarin.',
      b: 'Betul, itu kenaikan sampai penutupan [[naik|9 Desember]].',
      c: 'Keliru, itu naik 9 hari bursa beruntun.',
      d: 'Betul, harganya naik 2,21 kali sejak itu.',
    },
    kunci: 'b',
    penjelasan: 'Penutupan [[harga|Rp106]] dikurangi [[harga-a|Rp48]] memang [[naik|Rp58]]. Salah-kaprah yang umum: mengira kenaikan = harga.',
  };
}

describe('suntingan: hanya kata', () => {
  it('kata boleh diganti', () => {
    const o = omongan();
    expect(periksaSuntingan(o, 'pesan', 'Dari 26 November sampai kemarin naiknya 58 perak, lumayan juga.')).toBeNull();
    expect(periksaSuntingan(o, 'pilihan-a', 'Keliru, [[harga|Rp106]] itu penutupan kemarin saja.')).toBeNull();
    expect(periksaSuntingan(o, 'penjelasan', 'Penutupan [[harga|Rp106]] dikurangi [[harga-a|Rp48]] memang [[naik|Rp58]]. Salah-kaprah yang umum: angka kenaikan dikira harga.')).toBeNull();
  });

  it('angka dikunci', () => {
    expect(periksaSuntingan(omongan(), 'pesan', 'Dari 26 November sampai kemarin naiknya 59 perak, gila sih.')).toMatch(/^Angka dikunci/);
    expect(periksaSuntingan(omongan(), 'pilihan-d', 'Betul, harganya naik dua kali lipat sejak itu.')).toMatch(/^Angka dikunci/);
  });

  it('rujukan fakta dikunci: tidak boleh diubah, dibuang, atau ditambah', () => {
    const o = omongan();
    expect(periksaSuntingan(o, 'pilihan-a', 'Keliru, [[harga|Rp 106]] itu harga penutupan kemarin.')).toMatch(/^Rujukan fakta/);
    expect(periksaSuntingan(o, 'pilihan-a', 'Keliru, Rp106 itu harga penutupan kemarin.')).toMatch(/^Rujukan fakta/);
    expect(periksaSuntingan(o, 'pilihan-c', 'Keliru, itu naik [[hari|9 hari bursa]] beruntun.')).toMatch(/^Rujukan fakta/);
  });

  it('label pilihan dikunci; potongan angka pesan harus tetap tertulis', () => {
    expect(periksaSuntingan(omongan(), 'pilihan-a', 'Betul, [[harga|Rp106]] itu harga penutupan kemarin.')).toMatch(/^Label pilihan/);
    expect(periksaSuntingan(omongan(), 'pesan', 'Dari tanggal 26 Nov sampai kemarin naiknya 58 perak.')).toMatch(/^Potongan angka pesan dikunci/);
  });

  it('kosong / tidak berubah ditolak', () => {
    expect(periksaSuntingan(omongan(), 'pesan', '   ')).toBe('Teks tidak boleh kosong.');
    expect(periksaSuntingan(omongan(), 'pesan', omongan().pesan)).toBe('Tidak ada yang berubah.');
  });

  it('diterapkan ke draf DAN keadaan omongan (bahan uji ulang)', () => {
    const o = omongan();
    const k = { no: 2, omongan: { ...o }, pesan: { nama: 'Andi', jam: '20.45', pesan: o.pesan, angka_pesan: o.angka_pesan, klaim_dari: null }, pilihan: { a: { teks: o.pilihan.a, sumber: 'P1' }, b: { teks: o.pilihan.b, sumber: 'kunci' }, c: { teks: o.pilihan.c, sumber: 'P8' }, d: { teks: o.pilihan.d, sumber: 'P5' } }, penjelasan: o.penjelasan } as unknown as KeadaanOmongan;
    terapkanSuntingan(o, k, 'pilihan-a', 'Keliru, [[harga|Rp106]] itu penutupan kemarin saja.');
    expect(o.pilihan.a).toBe('Keliru, [[harga|Rp106]] itu penutupan kemarin saja.');
    expect(k.pilihan.a).toEqual({ teks: 'Keliru, [[harga|Rp106]] itu penutupan kemarin saja.', sumber: 'P1' });
    expect(k.omongan).toBe(o);
    terapkanSuntingan(o, k, 'pesan', 'Dari 26 November sampai kemarin naiknya 58 perak, lumayan.');
    expect(k.pesan.pesan).toBe('Dari 26 November sampai kemarin naiknya 58 perak, lumayan.');
  });
});

describe('wajib uji ulang sebelum disetujui', () => {
  function data(): DataJalan {
    return { hasil: { terbit: true }, draf: { omongan: [] }, putusan: null, suntingan: [], uji_ulang: [] } as unknown as DataJalan;
  }

  it('suntingan → omongan itu harus diuji; lolos → boleh; suntingan baru → hanya yang baru', () => {
    const d = data();
    expect(bolehSetujui(d)).toEqual({ boleh: true, alasan: null });
    catatSuntingan(d, 1, 'pesan', 'a', 'b', 'w');
    catatSuntingan(d, 3, 'penjelasan', 'a', 'b', 'w');
    expect(omonganDiuji(d)).toEqual([1, 3]);
    expect(bolehSetujui(d).boleh).toBe(false);
    d.uji_ulang.push({ ke: 1, sampai_suntingan: 2, lolos: false } as never);
    expect(omonganDiuji(d)).toEqual([1, 3]);
    d.uji_ulang.push({ ke: 2, sampai_suntingan: 2, lolos: true } as never);
    expect(omonganDiuji(d)).toEqual([]);
    expect(bolehSetujui(d).boleh).toBe(true);
    catatSuntingan(d, 2, 'pilihan-a', 'a', 'b', 'w');
    expect(omonganDiuji(d)).toEqual([2]);
    expect(d.suntingan[2]).toMatchObject({ ke: 3, penyunting: 'manusia', omongan: 2, lokasi: 'pilihan-a', dari: 'a', ke_teks: 'b' });
  });

  it('tidak terbit / sudah diputuskan → tidak bisa disetujui', () => {
    expect(bolehSetujui({ ...data(), hasil: { terbit: false } } as unknown as DataJalan).boleh).toBe(false);
    expect(bolehSetujui({ ...data(), putusan: { putusan: 'tolak' } } as unknown as DataJalan).alasan).toMatch(/sudah ditolak/);
  });
});

describe.skipIf(!existsSync(`${FOLDER_GUDANG}/suspensions-all.json`))('alur penyetuju lewat server (gudang sungguhan, agen palsu)', () => {
  let s: ServerUji | null = null;
  afterEach(async () => {
    await s?.tutup();
    s = null;
  });

  async function terbit(): Promise<{ sv: ServerUji; akar: string }> {
    const akar = akarSementara();
    const sv = await mulaiServer({ akar, folderGudang: FOLDER_GUDANG, mesin: mesinPalsu() });
    await minta(sv.port, 'POST', '/api/siapkan', { badan: { kode: 'TIRT', tanggal: '2025-12-10', jendela: 10, id: 'tirt-uji' } });
    await bacaSse(sv.port, '/api/jalan/tirt-uji/aliran', {}, 1500);
    expect((await minta(sv.port, 'POST', '/api/jalan/tirt-uji/mulai', { badan: { setuju: true, pagu_usd: 0.3 } })).status).toBe(202);
    await bacaSse(sv.port, '/api/jalan/tirt-uji/aliran', { 'Last-Event-ID': '4' });
    return { sv, akar };
  }

  it('sunting → setujui ditolak → uji ulang (wajib setuju) → lolos → setujui; semua tercatat di folder jalan', async () => {
    const t = await terbit();
    s = t.sv;
    const j0 = (await minta(s.port, 'GET', '/api/jalan/tirt-uji')).json() as { hasil: { terbit: boolean }; draf: { omongan: OmonganDraf[] } };
    expect(j0.hasil.terbit).toBe(true);
    const lama = j0.draf.omongan[0]?.pesan as string;
    const baru = lama.replace('gara-gara', 'karena');
    expect((await minta(s.port, 'POST', '/api/jalan/tirt-uji/sunting', { badan: { omongan: 1, lokasi: 'pesan', teks: baru } })).status).toBe(200);
    const setujuiDini = await minta(s.port, 'POST', '/api/jalan/tirt-uji/setujui', { badan: {} });
    expect(setujuiDini.status).toBe(409);
    expect(setujuiDini.teks).toMatch(/belum lolos uji ulang/);
    expect((await minta(s.port, 'POST', '/api/jalan/tirt-uji/uji-ulang', { badan: {} })).status).toBe(400);
    expect((await minta(s.port, 'POST', '/api/jalan/tirt-uji/uji-ulang', { badan: { setuju: true } })).status).toBe(202);
    const sse = await bacaSse(s.port, '/api/jalan/tirt-uji/aliran');
    const uji = peristiwaSse(sse.teks).filter((p) => p.tahap === 'uji-ulang');
    expect(uji.map((p) => p.isi['jenis'] ?? null)).toEqual(expect.arrayContaining(['validator', 'gerbang-g', 'gerbang-pilihan-saja', 'gerbang-kartu', 'kritikus', 'gerbang-tebak']));
    expect(uji.at(-1)?.judul).toMatch(/^Uji ulang 1 LOLOS/);
    const r = await minta(s.port, 'POST', '/api/jalan/tirt-uji/setujui', { badan: {} });
    expect(r.status).toBe(200);
    expect((r.json() as { berkas: string[] }).berkas).toEqual(['eval/penyusun/tirt-uji/draf-disetujui.json', 'eval/penyusun/tirt-uji/catatan-suntingan.json']);
    const folder = join(t.akar, 'eval', 'penyusun', 'tirt-uji');
    const disetujui = JSON.parse(readFileSync(join(folder, 'draf-disetujui.json'), 'utf8')) as { draf: { omongan: OmonganDraf[] }; disetujui: { oleh: string } };
    expect(disetujui.draf.omongan[0]?.pesan).toBe(baru);
    expect(disetujui.disetujui.oleh).toBe('manusia');
    const catatan = JSON.parse(readFileSync(join(folder, 'catatan-suntingan.json'), 'utf8')) as { suntingan: Array<{ dari: string; ke_teks: string; penyunting: string }> };
    expect(catatan.suntingan).toEqual([expect.objectContaining({ penyunting: 'manusia', dari: lama, ke_teks: baru })]);
    expect(existsSync(join(folder, 'uji-ulang-1.json'))).toBe(true);
    expect((await minta(s.port, 'POST', '/api/jalan/tirt-uji/sunting', { badan: { omongan: 1, lokasi: 'pesan', teks: lama } })).status).toBe(409);
  });

  it('uji ulang yang tidak lolos membuat draf tetap tidak bisa disetujui; tolak wajib beralasan', async () => {
    const t = await terbit();
    s = t.sv;
    const j0 = (await minta(s.port, 'GET', '/api/jalan/tirt-uji')).json() as { draf: { omongan: OmonganDraf[] } };
    const o = j0.draf.omongan[0] as OmonganDraf;
    // Pengecoh "jadwal rapat" diganti kata-katanya menjadi hampir sama dengan kunci (label & tanpa angka tetap):
    // lolos kunci suntingan, tetapi pemeriksa kode (ikatan bank / pilihan kembar) harus menolak.
    const target = (['a', 'b', 'c', 'd'] as const).find((h) => o.pilihan[h].includes('rapat pemegang saham'));
    expect(target).toBeDefined();
    const r = await minta(s.port, 'POST', '/api/jalan/tirt-uji/sunting', { badan: { omongan: 1, lokasi: `pilihan-${String(target)}`, teks: 'Keliru, setop hari ini karena harganya naik tinggi sekali.' } });
    expect(r.status).toBe(200);
    expect((await minta(s.port, 'POST', '/api/jalan/tirt-uji/uji-ulang', { badan: { setuju: true } })).status).toBe(202);
    const sse = await bacaSse(s.port, '/api/jalan/tirt-uji/aliran');
    const akhir = peristiwaSse(sse.teks).filter((p) => p.tahap === 'uji-ulang').at(-1);
    expect(akhir?.judul).toMatch(/^Uji ulang 1 TIDAK LOLOS/);
    expect(akhir?.isi['lolos']).toBe(false);
    expect((await minta(s.port, 'POST', '/api/jalan/tirt-uji/setujui', { badan: {} })).status).toBe(409);
    expect((await minta(s.port, 'POST', '/api/jalan/tirt-uji/tolak', { badan: { alasan: 'x' } })).status).toBe(400);
    const tolak = await minta(s.port, 'POST', '/api/jalan/tirt-uji/tolak', { badan: { alasan: 'Kalimat pengecoh terlalu kaku untuk pemain.' } });
    expect(tolak.status).toBe(200);
    expect(existsSync(join(t.akar, 'eval', 'penyusun', 'tirt-uji', 'penolakan-penyetuju.json'))).toBe(true);
    expect(existsSync(join(t.akar, 'eval', 'penyusun', 'tirt-uji', 'draf-disetujui.json'))).toBe(false);
  });
});
