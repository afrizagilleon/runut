/**
 * Penyempurna struktur Haiku (T-03): masukan pendek; keluaran diperiksa ulang
 * kode — Haiku tidak bisa mengubah angka, rujukan, label, atau kebenaran.
 */
import { describe, expect, it } from 'vitest';
import { DEFINISI_PAKET, bangunPaket } from '../paket.ts';
import { buktiKunciTunggal } from './bukti.ts';
import { semuaRencana, type RencanaSoal } from './pola.ts';
import { MODEL_PENYEMPURNA, pesanPenyempurna, uraiPenyempurna, verifikasiPerbaikan } from './penyempurna.ts';
import { pilihanBawaan } from './rakit.ts';

const TIRT = bangunPaket(DEFINISI_PAKET.tirt);
const ambil = (pola: string): RencanaSoal => semuaRencana(TIRT).find((r) => r.pola === pola) as RencanaSoal;

describe('masukan penyempurna', () => {
  const r = ambil('angka-lain-waktu');
  const isi = pesanPenyempurna({ paket: TIRT, r, pilihan: pilihanBawaan(r), jenis: 'tertebak', alasan: ['3/3 penebak tanpa kartu memilih kunci'] });
  const user = isi[1]?.content ?? '';
  it('model = Claude Haiku 4.5', () => {
    expect(MODEL_PENYEMPURNA).toBe('anthropic/claude-haiku-4.5');
  });
  it('pendek: pilihan, kartu omongan saja, kegagalan, alternatif', () => {
    expect(user.length).toBeLessThan(4_000);
    expect(user).toContain('tertebak tanpa kartu');
    for (const s of r.slot) for (const v of s.varian) expect(user).toContain(v.teks);
    expect(user).not.toContain('susp-2025-01-21');
    expect(user).not.toContain('Volume perdagangan');
  });
  it('urai keluaran', () => {
    expect(uraiPenyempurna('{"pilihan":{"p1":{"varian":"P1b","teks":"x"},"zz":{"varian":"a","teks":"b"}},"alasan":"a"}')?.pilihan).toEqual({ p1: { varian: 'P1b', teks: 'x' } });
    expect(uraiPenyempurna('ngaco')).toBeNull();
  });
});

describe('verifikasi ulang oleh kode', () => {
  const r = ambil('angka-lain-waktu');
  const lama = pilihanBawaan(r);
  const p1b = r.slot[1].varian[1];
  const p3a = r.slot[3].varian[0];
  it('ganti ke varian lain (teks persis) → diterima; kunci tetap tunggal', () => {
    const h = verifikasiPerbaikan(r, TIRT, lama, { p1: { varian: 'P1b', teks: p1b?.teks ?? '' } });
    expect(h.dibuang).toEqual([]);
    expect(h.diterima.map((x) => x.varian)).toEqual(['P1b']);
    expect(buktiKunciTunggal(r, TIRT, h.pilihan).sah).toBe(true);
  });
  it('rangkai ulang dengan rujukan & angka sama → diterima', () => {
    const teks = 'Keliru, untuk [[harga-2025-12-09|9 Desember]] tercatat [[harga-2025-12-09|Rp106]], bukan [[harga-2025-12-08|Rp97]].';
    const h = verifikasiPerbaikan(r, TIRT, lama, { kunci: { varian: 'K2', teks } });
    expect(h.dibuang).toEqual([]);
    expect(h.pilihan.kunci.teks).toBe(teks);
  });
  it('sabotase: Haiku mengubah angka → dibuang, pilihan lama tetap', () => {
    const teks = (p3a?.teks ?? '').replace('Rp115', 'Rp120');
    const h = verifikasiPerbaikan(r, TIRT, lama, { p3: { varian: 'P3a', teks } });
    expect(h.dibuang.length).toBe(1);
    expect(h.pilihan.p3.teks).toBe(lama.p3.teks);
  });
  it('sabotase: rujukan baru, label dibalik, varian slot lain, penanda dihapus → dibuang', () => {
    const t1 = `${p1b?.teks.slice(0, -1) ?? ''} dari [[harga-2025-12-05|5 Desember]].`;
    expect(verifikasiPerbaikan(r, TIRT, lama, { p1: { varian: 'P1b', teks: t1 } }).dibuang.length).toBe(1);
    expect(verifikasiPerbaikan(r, TIRT, lama, { p1: { varian: 'P1b', teks: (p1b?.teks ?? '').replace('Betul,', 'Keliru,') } }).dibuang.length).toBe(1);
    expect(verifikasiPerbaikan(r, TIRT, lama, { p1: { varian: 'K1', teks: r.slot[0].varian[0]?.teks ?? '' } }).dibuang.length).toBe(1);
    expect(verifikasiPerbaikan(r, TIRT, lama, { p1: { varian: 'P3a', teks: p3a?.teks ?? '' } }).dibuang.length).toBe(1);
    const tanpa = verifikasiPerbaikan(r, TIRT, lama, { p1: { varian: 'P1a', teks: 'Betul, penutupannya memang [[harga-2025-12-08|Rp97]] (9 Des).' } });
    expect(tanpa.dibuang.length).toBe(1);
  });
});
