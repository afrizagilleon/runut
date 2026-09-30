/**
 * Penulis kata M2d-10 (T-02): penulis menerima klaim + angka yang diizinkan,
 * TIDAK menerima pilihan; angka pesan & rujukan penjelasan dikunci kode.
 */
import { describe, expect, it } from 'vitest';
import { teksPolos } from '../../skema/rujukan.ts';
import { DEFINISI_PAKET, bangunPaket } from '../paket.ts';
import type { JawabanModel } from '../susun.ts';
import { semuaRencana, type RencanaSoal } from './pola.ts';
import {
  pesanTulisPenjelasanTemplat,
  pesanTulisPesanTemplat,
  periksaTulisanPenjelasan,
  periksaTulisanPesan,
  promptTemplatPenjelasan,
  promptTemplatPesan,
  tulisBercadangan,
  uraiTulisanPesan,
  type InfoTemplat,
} from './penulis.ts';
import { pilihanBawaan, rakitOmonganTemplat, salinanTayang } from './rakit.ts';

const TIRT = bangunPaket(DEFINISI_PAKET.tirt);
const RENCANA = semuaRencana(TIRT);
const ambil = (pola: string): RencanaSoal => RENCANA.find((r) => r.pola === pola) as RencanaSoal;
const GAYA = { nada: 'yakin' as const, contoh: [] };

describe('permintaan penulis pesan', () => {
  it.each(RENCANA.map((r) => [r.pola, r] as const))('%s: klaim, angka, wajib ada; pilihan & kunci TIDAK dikirim', (_p, r) => {
    const isi = pesanTulisPesanTemplat({ paket: TIRT, r, no: 1, namaLain: ['Rina'], gaya: GAYA })[1]?.content ?? '';
    expect(isi).toContain(r.klaim.inti);
    for (const a of r.klaim.angka) expect(isi).toContain(`"${a.teks}"`);
    for (const g of r.klaim.wajib) for (const x of g) expect(isi).toContain(`"${x}"`);
    for (const s of r.slot) for (const v of s.varian) expect(isi).not.toContain(teksPolos(v.teks));
    expect(isi).not.toMatch(/JAWABAN|\bkunci\b|Pilihan/);
    expect(isi).toContain('rina');
  });
});

describe('pemeriksaan kode atas pesan', () => {
  const r = ambil('angka-lain-waktu');
  it('pesan yang sah', () => {
    expect(periksaTulisanPesan({ nama: 'Sinta', jam: '19.02', pesan: 'Penutupan kemarin Rp97 ya? naik tipis doang kayaknya' }, r, [])).toEqual([]);
  });
  it('angka yang tidak diizinkan, kata wajib hilang, nama terlarang', () => {
    expect(periksaTulisanPesan({ nama: 'Sinta', jam: '19.02', pesan: 'Penutupan kemarin Rp97, naik 3 hari' }, r, []).join(' ')).toMatch(/tidak diizinkan/);
    expect(periksaTulisanPesan({ nama: 'Sinta', jam: '19.02', pesan: 'Penutupannya Rp97 ya' }, r, []).join(' ')).toMatch(/harus menyebut/);
    expect(periksaTulisanPesan({ nama: 'Bayu', jam: '19.02', pesan: 'Penutupan kemarin Rp97 ya' }, r, []).join(' ')).toMatch(/terlarang/);
    expect(periksaTulisanPesan({ nama: 'Sinta', jam: '19.02', pesan: 'Penutupan kemarin Rp97 ya' }, r, ['sinta']).join(' ')).toMatch(/terlarang/);
  });
  it('urai tulisan', () => {
    expect(uraiTulisanPesan('{"nama":"Sinta","jam":"19.02","pesan":"halo"}')).toEqual({ nama: 'Sinta', jam: '19.02', pesan: 'halo' });
    expect(uraiTulisanPesan('bukan json')).toBeNull();
  });
});

describe('permintaan & pemeriksaan penjelasan', () => {
  const r = ambil('sebab-resmi');
  const o = rakitOmonganTemplat(r, pilihanBawaan(r), { nama: 'Sinta', jam: '19.02', pesan: 'hari ini disetop karena ragu usahanya ya' }, '', 'b');
  it('menandai jawaban, memuat daftar rujukan yang boleh', () => {
    const isi = pesanTulisPenjelasanTemplat({ paket: TIRT, r, o }).map((x) => x.content).join('\n');
    expect(isi).toContain('← JAWABAN');
    for (const t of r.rujukan_penjelasan) expect(isi).toContain(t);
    expect(isi).toContain(r.salah_kaprah);
  });
  it('rujukan di luar daftar ditolak; tanpa salah-kaprah ditolak', () => {
    expect(periksaTulisanPenjelasan('Pengumuman [[susp-2025-12-10|10 Desember]]. Salah-kaprah yang umum: x.', r)).toEqual([]);
    expect(periksaTulisanPenjelasan('Pengumuman [[susp-2025-12-10|10 Desember]] dan [[harga-2025-12-09|Rp106]]. Salah-kaprah yang umum: x.', r).join(' ')).toMatch(/tidak ada di daftar/);
    expect(periksaTulisanPenjelasan('Pengumuman [[susp-2025-12-10|10 Desember]].', r).join(' ')).toMatch(/Salah-kaprah/);
  });
});

describe('penulis bercadangan', () => {
  it('keluaran tak terbaca → sekali lagi tanpa berpikir', async () => {
    const info: InfoTemplat[] = [];
    const jawab = ['ngaco', '{"nama":"Sinta","jam":"19.02","pesan":"halo"}'];
    const j = (teks: string): JawabanModel => ({ teks, token_masuk: 1, token_keluar: 1, latensi_ms: 1, finish_reason: 'stop', biaya_usd: 0 });
    const h = await tulisBercadangan(
      async (_p, _s, i) => {
        info.push(i);
        return j(jawab.shift() as string);
      },
      [],
      { berpikir: { suhu: 0.3, maxTokens: 10 }, cadangan: { suhu: 0.3, maxTokens: 5 } },
      { jenis: 'tulis-pesan', putaran: 1, omongan: 1, ke: 1, peran: 'penulis', model: 'deepseek/deepseek-v4.1-flash' },
      uraiTulisanPesan,
      () => undefined,
    );
    expect(h?.nama).toBe('Sinta');
    expect(info.map((x) => x.ulang)).toEqual([0, 1]);
  });
});

describe('anti-salin prompt penulis', () => {
  it('prompt tidak memuat potongan 5 kata soal tayang', () => {
    expect([...salinanTayang(promptTemplatPesan()), ...salinanTayang(promptTemplatPenjelasan())]).toEqual([]);
  });
});
