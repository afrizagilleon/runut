/**
 * M2d-9 T-04: tahapan agen lewat pintu (D-4): siapkan gratis → perkiraan →
 * persetujuan klik → mesin → hasil. Mesin di sini palsu-rekam (antarmuka
 * `MesinPenulis`); lingkar sungguhan dengan model palsu dites di mesin.test.ts.
 */
import { appendFileSync, existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import { deretHarga } from './bantu-data.ts';
import { akarSementara, bacaSse, minta, mulaiServer, peristiwaSse, tulisGudangUji, type ServerUji } from './bantu-uji.ts';
import type { HasilMesin, HasilUjiUlang, KonteksJalan, KonteksUjiUlang, MesinPenulis, PerkiraanBiaya } from './mesin.ts';

let s: ServerUji | null = null;
afterEach(async () => {
  await s?.tutup();
  s = null;
});

const PERKIRAAN: PerkiraanBiaya = { per_panggilan: [], per_omongan_usd: 0.4, per_putaran_usd: 1.2, maks_putaran: 15, catatan: ['uji'] };

class MesinRekam implements MesinPenulis {
  readonly nama = 'rekam';
  readonly keterangan = 'mesin uji';
  readonly palsu: boolean;
  dipanggil: KonteksJalan[] = [];
  siapNilai = { siap: true, alasan: null as string | null };
  terbit = false;
  constructor(palsu = false) {
    this.palsu = palsu;
  }
  siap(): { siap: boolean; alasan: string | null } {
    return this.siapNilai;
  }
  perkiraan(): PerkiraanBiaya {
    return PERKIRAAN;
  }
  perkiraanUjiUlang(jumlah: number): number {
    return 0.3 * jumlah;
  }
  async ujiUlang(_k: KonteksUjiUlang): Promise<HasilUjiUlang> {
    throw new Error('tidak dipakai di tes ini');
  }
  async jalankan(k: KonteksJalan): Promise<HasilMesin> {
    this.dipanggil.push(k);
    k.lapor('agen', 'putaran 1 · kritikus → TOLAK — contoh', { putaran: 1, putusan: 'tolak', biaya_usd: 0.01, total_usd: 0.01 });
    return {
      terbit: this.terbit,
      draf: null,
      berhenti: this.terbit ? null : 'omongan 2 gagal di 3 sudut (a, b, c); simulasi tidak terbit',
      putaran: 3,
      keadaan: [],
      draf_terakhir: [null, null, null],
      biaya_usd: 0.01,
      jejak: {} as never,
      riwayat: { riwayat: [{ putaran: 3, omongan: [{ no: 2, status: 'ditolak-kritikus', umpan: ['kunci ganda'] }] }] },
    };
  }
}

/** UJIX: 60 hari kerja mulai 2 Mar 2026, kenaikan beruntun, penghentian di hari ke-20 (volume 0). */
function akarUjix(): { akar: string; t: string } {
  const akar = akarSementara();
  const harga = deretHarga('2026-03-02', 60, (i) => (i >= 12 && i <= 19 ? 100 + (i - 11) * 6 : i > 19 ? 148 : 100), (i) => (i === 20 ? 0 : 1000));
  const t = harga[20]?.tanggal as string;
  tulisGudangUji(akar, 'UJIX', harga, [{ tanggal: t, alasan: 'Peningkatan harga kumulatif yang signifikan' }]);
  return { akar, t };
}

async function siapkanDanTunggu(sv: ServerUji, t: string, id = 'uji-jalan'): Promise<ReturnType<typeof peristiwaSse>> {
  const r = await minta(sv.port, 'POST', '/api/siapkan', { badan: { kode: 'UJIX', tanggal: t, jendela: 10, id } });
  expect(r.status).toBe(202);
  const sse = await bacaSse(sv.port, `/api/jalan/${id}/aliran`, {}, 1500);
  return peristiwaSse(sse.teks);
}

describe('siapkan: tahap gratis', () => {
  it('data → 33 aturan → paket → perkiraan; menunggu persetujuan; mesin belum dipanggil', async () => {
    const { akar, t } = akarUjix();
    const m = new MesinRekam();
    s = await mulaiServer({ akar, mesin: m });
    const p = await siapkanDanTunggu(s, t);
    expect(p.map((x) => x.tahap)).toEqual(['data', 'aturan', 'paket', 'perkiraan']);
    expect(p[0]?.judul).toMatch(/Data sesudah T tidak masuk kartu/);
    expect(p[1]?.isi['aktif']).toBe(33);
    expect((p[1]?.isi['aturan'] as Array<{ awam: string }>).every((a) => a.awam.length > 20)).toBe(true);
    expect(p[3]?.isi['perkiraan']).toEqual(PERKIRAAN);
    expect(m.dipanggil).toEqual([]);
    const j = (await minta(s.port, 'GET', '/api/jalan/uji-jalan')).json() as { tahap: string; sumber_paket: { sumber: string } };
    expect(j.tahap).toBe('menunggu-persetujuan');
    expect(j.sumber_paket.sumber).toBe('otomatis');
    const folder = join(akar, 'eval', 'penyusun', 'uji-jalan');
    expect(existsSync(join(folder, 'paket.json'))).toBe(true);
    expect(readFileSync(join(folder, 'aliran.jsonl'), 'utf8').trim().split('\n')).toHaveLength(4);
  });

  it('tanggal tidak sah → 400 dengan alasannya, tanpa jalan', async () => {
    const { akar } = akarUjix();
    s = await mulaiServer({ akar, mesin: new MesinRekam() });
    const r = await minta(s.port, 'POST', '/api/siapkan', { badan: { kode: 'UJIX', tanggal: '2026-03-07', jendela: 10 } });
    expect(r.status).toBe(400);
    expect(r.teks).toMatch(/akhir pekan/);
  });

  it('paket < 3 sudut → penolakan beralasan TANPA biaya, sebelum persetujuan', async () => {
    const akar = akarSementara();
    const harga = deretHarga('2026-03-02', 20, () => 100, (i) => (i === 0 ? 0 : 1000));
    tulisGudangUji(akar, 'UJIX', harga, [{ tanggal: harga[0]?.tanggal as string, alasan: 'x' }]);
    const m = new MesinRekam();
    s = await mulaiServer({ akar, mesin: m });
    const p = await siapkanDanTunggu(s, harga[0]?.tanggal as string, 'tipis');
    expect(p.map((x) => x.tahap)).toEqual(['data', 'aturan', 'paket', 'hasil']);
    expect(p[3]?.judul).toMatch(/Tidak terbit, tanpa biaya: paket fakta hanya memberi [0-2] calon sudut/);
    expect((await minta(s.port, 'POST', '/api/jalan/tipis/mulai', { badan: { setuju: true, pagu_usd: 0.5 } })).status).toBe(409);
    expect(m.dipanggil).toEqual([]);
  });
});

describe('mulai: hanya dengan persetujuan klik dan pagu yang sah', () => {
  it('tanpa setuju / pagu di luar batas / mesin belum siap → ditolak, mesin tidak dipanggil', async () => {
    const { akar, t } = akarUjix();
    const m = new MesinRekam();
    s = await mulaiServer({ akar, mesin: m });
    await siapkanDanTunggu(s, t);
    const mulai = (badan: unknown) => minta((s as ServerUji).port, 'POST', '/api/jalan/uji-jalan/mulai', { badan });
    expect((await mulai({ pagu_usd: 0.5 })).status).toBe(400);
    expect((await mulai({ setuju: 'ya', pagu_usd: 0.5 })).status).toBe(400);
    expect((await mulai({ setuju: true, pagu_usd: 0.01 })).status).toBe(400);
    const lebih = await mulai({ setuju: true, pagu_usd: 1.5 });
    expect(lebih.status).toBe(400);
    expect(lebih.teks).toMatch(/melebihi sisa pagu \(US\$1\.20\)/);
    m.siapNilai = { siap: false, alasan: 'Kunci OpenRouter belum siap: isi LLM_API_KEY di .env.' };
    const belum = await mulai({ setuju: true, pagu_usd: 0.5 });
    expect(belum.status).toBe(400);
    expect(belum.teks).toContain('LLM_API_KEY');
    expect(m.dipanggil).toEqual([]);
  });

  it('sisa pagu penyusun dihitung dari ledger (tag penyusun/)', async () => {
    const { akar, t } = akarUjix();
    appendFileSync(join(akar, '.cache', 'llm', 'ledger.jsonl'), `${JSON.stringify({ tag: 'penyusun/lama/p1/kritikus/o1', biaya_usd: 1.05, model: 'z-ai/glm-5.3' })}\n`);
    s = await mulaiServer({ akar, mesin: new MesinRekam() });
    await siapkanDanTunggu(s, t);
    const j = (await minta(s.port, 'GET', '/api/jalan/uji-jalan')).json() as { batas: { maks_usd: number; sisa_penyusun_usd: number } };
    expect(j.batas.sisa_penyusun_usd).toBe(0.15);
    expect(j.batas.maks_usd).toBe(0.15);
    expect((await minta(s.port, 'POST', '/api/jalan/uji-jalan/mulai', { badan: { setuju: true, pagu_usd: 0.2 } })).status).toBe(400);
  });

  it('dengan setuju → mesin dijalankan dengan pagu itu; hasil = penolakan beralasan; berkas + log SSE tersimpan', async () => {
    const { akar, t } = akarUjix();
    const m = new MesinRekam();
    s = await mulaiServer({ akar, mesin: m });
    await siapkanDanTunggu(s, t);
    const r = await minta(s.port, 'POST', '/api/jalan/uji-jalan/mulai', { badan: { setuju: true, pagu_usd: 0.4 } });
    expect(r.status).toBe(202);
    const sse = await bacaSse(s.port, '/api/jalan/uji-jalan/aliran', { 'Last-Event-ID': '4' });
    const p = peristiwaSse(sse.teks);
    expect(p.map((x) => x.tahap)).toEqual(['agen', 'agen', 'hasil']);
    expect(p[2]?.judul).toMatch(/^TIDAK TERBIT sesudah 3 putaran \(biaya nyata US\$0\.0000\)\. Satu posisi omongan gagal di semua sudut/);
    expect(m.dipanggil).toHaveLength(1);
    expect(m.dipanggil[0]?.paguJalanUsd).toBe(0.4);
    expect(m.dipanggil[0]?.id).toBe('uji-jalan');
    const j = (await minta(s.port, 'GET', '/api/jalan/uji-jalan')).json() as { tahap: string; hasil: { terbit: boolean; penolakan: string[] } };
    expect(j.tahap).toBe('selesai');
    expect(j.hasil.penolakan).toEqual(['omongan 2 (ditolak-kritikus, putaran 3): kunci ganda']);
    const folder = join(akar, 'eval', 'penyusun', 'uji-jalan');
    for (const b of ['keadaan.json', 'hasil.json', 'paket.json', 'aliran.jsonl']) expect(existsSync(join(folder, b))).toBe(true);
    expect(readFileSync(join(folder, 'aliran.jsonl'), 'utf8').trim().split('\n')).toHaveLength(7);
    expect((await minta(s.port, 'POST', '/api/jalan/uji-jalan/mulai', { badan: { setuju: true, pagu_usd: 0.4 } })).status).toBe(409);
  });

  it('jalan dimuat ulang dari folder sesudah server dijalankan ulang', async () => {
    const { akar, t } = akarUjix();
    s = await mulaiServer({ akar, mesin: new MesinRekam() });
    await siapkanDanTunggu(s, t);
    await s.tutup();
    s = await mulaiServer({ akar, mesin: new MesinRekam() });
    const j = (await minta(s.port, 'GET', '/api/jalan/uji-jalan')).json() as { tahap: string; kode: string };
    expect(j).toMatchObject({ tahap: 'menunggu-persetujuan', kode: 'UJIX' });
    const sse = await bacaSse(s.port, '/api/jalan/uji-jalan/aliran');
    expect(peristiwaSse(sse.teks)).toHaveLength(4);
    expect((await minta(s.port, 'GET', '/api/jalan/..%2F..%2Fcases')).status).toBe(404);
  });
});
