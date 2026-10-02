/**
 * Pemanggil rotasi (tanpa jaringan): 24 panggilan dengan nomor unik, salinan
 * teks dipetakan ke isi ASAL yang benar di tiap rotasi, tak terbaca diulang
 * sekali, pembaca kartu di dua rotasi dengan kunci di huruf berbeda.
 */
import { describe, expect, it } from 'vitest';
import type { KunciOpsi, OmonganDraf } from '../draf.ts';
import type { PesanChat } from '../klien.ts';
import type { InfoTemplat, PanggilTemplat } from '../templat/penulis.ts';
import { jawabPalsu } from '../templat/palsu.ts';
import { kartuRotasi, keRotasi, tebakRotasi } from './jalan.ts';

const O: OmonganDraf = {
  nama: 'Bima', jam: '20.15', pesan: 'Kemarin tutup Rp97, gw yakin.', angka_pesan: [], kartu: ['harga-2025-12-09', 'harga-2025-12-08'], kartu_penentu: ['harga-2025-12-09'],
  pilihan: { a: 'Betul, penutupan 9 Desember memang Rp97.', b: 'Keliru, penutupan 9 Desember Rp211, bukan Rp97.', c: 'Betul, Rp97 itu penutupan tertinggi sebelum hari ini.', d: 'Keliru, penutupan 9 Desember Rp150, bukan Rp97.' },
  kunci: 'b', penjelasan: '',
};

function opsiDari(user: string): Record<KunciOpsi, string> {
  const h = {} as Record<KunciOpsi, string>;
  for (const x of ['a', 'b', 'c', 'd'] as const) h[x] = (new RegExp(`^${x}\\) (.*)$`, 'm').exec(user)?.[1] ?? '');
  return h;
}

function palsu(pilih: (info: InfoTemplat, opsi: Record<KunciOpsi, string>) => string): { panggil: PanggilTemplat; log: Array<{ info: InfoTemplat; pesan: PesanChat[] }> } {
  const log: Array<{ info: InfoTemplat; pesan: PesanChat[] }> = [];
  return {
    log,
    panggil: async (pesan, _s, info) => {
      log.push({ info, pesan });
      if (info.jenis === 'gerbang-kartu') {
        const opsi = opsiDari(pesan[1]?.content ?? '');
        const h = (['a', 'b', 'c', 'd'] as const).find((x) => opsi[x] === O.pilihan.b) ?? 'a';
        return jawabPalsu(JSON.stringify({ pilihan: h, kartu: [1], alasan: 'kartu 1', membingungkan: [] }));
      }
      return jawabPalsu(pilih(info, opsiDari(pesan[1]?.content ?? '')), 0);
    },
  };
}

describe('tebakRotasi', () => {
  it('24 panggilan, nomor 1…24 unik, tiga model serentak', async () => {
    const p = palsu((_i, opsi) => JSON.stringify({ teks: opsi.a, alasan: 'x' }));
    const h = await tebakRotasi(O, { panggil: p.panggil, putaran: 1, omongan: 1 });
    expect(p.log).toHaveLength(24);
    expect(new Set(p.log.map((x) => x.info.ke))).toEqual(new Set(Array.from({ length: 24 }, (_, i) => i + 1)));
    expect(new Set(p.log.map((x) => x.info.model)).size).toBe(3);
    expect(h.jawaban).toHaveLength(24);
    expect(keRotasi(1, 2, 3)).toBe(24);
  });
  it('salinan teks dipetakan ke isi asal: selalu menyalin isi kunci → konsistensi isi kunci → gagal', async () => {
    const p = palsu(() => JSON.stringify({ teks: O.pilihan.b, alasan: 'x' }));
    const h = await tebakRotasi(O, { panggil: p.panggil, putaran: 1, omongan: 1 });
    expect(h.jawaban.every((j) => j.isi === 1 && j.terbaca)).toBe(true);
    expect(new Set(h.jawaban.map((j) => j.huruf))).toEqual(new Set(['a', 'b', 'c', 'd']));
    expect(h.putusan.putusan).toBe('gagal');
  });
  it('selalu huruf a → isi berganti; ketiga model diabaikan → tak terukur', async () => {
    const p = palsu((_i, opsi) => JSON.stringify({ teks: opsi.a, alasan: 'x' }));
    const h = await tebakRotasi(O, { panggil: p.panggil, putaran: 1, omongan: 1 });
    expect(new Set(h.jawaban.map((j) => j.isi))).toEqual(new Set([0, 1, 2, 3]));
    expect(h.putusan.putusan).toBe('tak-terukur');
  });
  it('jawaban tak terbaca diulang sekali; tetap gagal → tak terbaca', async () => {
    const p = palsu(() => 'b');
    const h = await tebakRotasi(O, { panggil: p.panggil, putaran: 1, omongan: 1 });
    expect(p.log).toHaveLength(48);
    expect(p.log.filter((x) => x.info.ulang === 1)).toHaveLength(24);
    expect(h.jawaban.every((j) => !j.terbaca && j.isi === null)).toBe(true);
    expect(h.putusan.putusan).toBe('gagal');
  });
});

describe('kartuRotasi', () => {
  it('dua rotasi (r0, r2), kunci di huruf berbeda, benar di keduanya → lulus', async () => {
    const p = palsu(() => '');
    const h = await kartuRotasi(O, { paket_id: 'x', simbol: 'X', nama_emiten: 'X', nama_samaran: 'Perusahaan X', tanggal_t: '2025-12-10', peristiwa: '', fakta: O.kartu.map((id) => ({ fact_id: id, jenis: 'dokumen', asal: '', terbit: '2025-12-09', klaim: `kartu ${id}`, nilai: 97, satuan: null, turunan_dari: [], catatan: [] })), kata_terlarang: [], disingkirkan: [], pemeriksaan: { aturan_dijalankan: 0, aturan_dilewati: 0, temuan: [] } } as never, { panggil: p.panggil, putaran: 1, omongan: 1 });
    expect(h.per_rotasi.map((x) => x.r)).toEqual([0, 2]);
    expect(h.per_rotasi[0]?.kunci).not.toBe(h.per_rotasi[1]?.kunci);
    expect(h.lulus).toBe(true);
  });
});
