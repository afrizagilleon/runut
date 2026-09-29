/**
 * M2d-6 T-03: G-pilihan-kembar (D-4) — dua pilihan satu omongan yang isinya
 * sama ditolak PEMERIKSA; semua pilihan manusia lolos.
 */
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { GENERASI_M2D5, GENERASI_M2D6 } from './agen-peran.ts';
import { dari, jalan, om } from './bantu-uji-tirt.ts';
import type { KunciOpsi, OmonganDraf } from './draf.ts';
import { AKAR } from './env.ts';
import { akar, ambangKembar, ambangKembarDari, gKembar, isiPilihan, kasusManusia, kemiripanPilihan } from './gerbang-kembar.ts';

const TIRT_M2D5 = (JSON.parse(readFileSync(`${AKAR}eval/keluaran-m2d5/tirt/draf-akhir.json`, 'utf8')) as { draf: { omongan: OmonganDraf[] } }).draf.omongan;
const HURUF: readonly KunciOpsi[] = ['a', 'b', 'c', 'd'];

describe('G-pilihan-kembar — ukuran', () => {
  it('pasangan pengecoh TIRT M2d-5 omongan 3 ("tercatat di dokumen" / "ada di catatan resmi") DITOLAK', () => {
    const o3 = TIRT_M2D5[2] as OmonganDraf;
    expect(o3.pilihan.a).toBe('Betul, hasil putusannya tercatat di dokumen.');
    expect(o3.pilihan.b).toBe('Betul, hasil putusannya ada di catatan resmi.');
    const g = gKembar(o3.pilihan);
    expect(g.tolak).toBe(true);
    expect(g.kembar).toEqual([{ a: 'a', b: 'b', kemiripan: 1, identik: true }]);
    expect(g.alasan[0]).toMatch(/Pilihan a dan b isinya sama/);
    // Omongan 1 dan 2 TIRT M2d-5 tidak kembar.
    expect(gKembar((TIRT_M2D5[0] as OmonganDraf).pilihan).tolak).toBe(false);
    expect(gKembar((TIRT_M2D5[1] as OmonganDraf).pilihan).tolak).toBe(false);
  });

  it('SEMUA pasangan pilihan di kasus manusia lolos; ambang = titik tengah kemiripan manusia terbesar dan 1', () => {
    const kasus = kasusManusia();
    expect(kasus.length).toBeGreaterThanOrEqual(2);
    let pasangan = 0;
    for (const k of kasus) {
      k.soal.forEach((s, i) => {
        const p = Object.fromEntries(s.pilihan.map((x, j) => [HURUF[j], x.teks])) as Record<KunciOpsi, string>;
        const g = gKembar(p);
        expect(g.tolak, `${k.berkas} soal ${String(i + 1)}: ${JSON.stringify(g.kembar)}`).toBe(false);
        pasangan += 6;
      });
    }
    expect(pasangan).toBeGreaterThanOrEqual(36);
    const a = ambangKembar();
    expect(a.ambang).toBeCloseTo((1 + a.maks_manusia) / 2, 3);
    expect(a.maks_manusia).toBeLessThan(a.ambang);
    expect(a.pasangan).toMatch(/cases\/dada-2025-10-08\.json soal 3/);
    // Ukuran yang membuat pasangan manusia kembar harus diperbaiki, bukan ambangnya dilonggarkan.
    expect(() => ambangKembarDari([{ berkas: 'x', soal: [{ pilihan: [{ teks: 'Betul, A.' }, { teks: 'Keliru, A.' }] }] }])).toThrow(/ukuran harus diperbaiki/);
  });

  it('angka: bentuk dinormalisasi, nilai tidak (Rp58 = 58 rupiah; Rp130 ≠ Rp160)', () => {
    expect([...isiPilihan('Betul, naiknya Rp58.')]).toEqual([...isiPilihan('Betul, naiknya 58 rupiah')]);
    expect([...isiPilihan('Keliru, totalnya Rp1.000')]).toEqual([...isiPilihan('Keliru, totalnya Rp 1000.')]);
    expect(kemiripanPilihan('Keliru, dividennya Rp130, bukan Rp45.', 'Keliru, dividennya Rp160, bukan Rp45.')).toBeLessThan(1);
    expect(gKembar({ a: 'Keliru, dividennya Rp130, bukan Rp45.', b: 'Keliru, dividennya Rp160, bukan Rp45.', c: 'Betul, x naik.', d: 'Keliru, y turun.' }).tolak).toBe(false);
  });

  it('label, huruf besar, tanda baca, rujukan kartu, dan ingkaran informal tidak membuat pilihan berbeda', () => {
    const g = gKembar({
      a: 'Betul, bandingannya pakai penutupan [[harga-1|1 Agustus]].',
      b: 'Keliru, Bandingannya pakai penutupan 1 Agustus!',
      c: 'Keliru, datanya ga ada.',
      d: 'Keliru, datanya tidak ada',
    });
    expect(g.kembar.map((k) => `${k.a}${k.b}`)).toEqual(['ab', 'cd']);
    // "tidak" tetap bermakna: ingkaran tidak dibuang.
    expect(kemiripanPilihan('Betul, hasilnya tercatat.', 'Keliru, hasilnya tidak tercatat.')).toBeLessThan(ambangKembar().ambang);
  });

  it('hampir sama (satu kata tambahan di pilihan panjang) = kembar lewat ambang, walau tidak identik', () => {
    const a = 'Keliru, penghentian Januari 2025 beralasan keraguan kelangsungan usaha perseroan menurut pengumuman bursa efek.';
    const b = 'Keliru, penghentian Januari 2025 beralasan keraguan kelangsungan usaha perseroan menurut pengumuman bursa efek terbaru.';
    const g = gKembar({ a, b, c: 'Betul, harga naik.', d: 'Keliru, harga turun.' });
    expect(g.kembar).toHaveLength(1);
    expect(g.kembar[0]?.identik).toBe(false);
    expect(g.kembar[0]?.kemiripan).toBeGreaterThanOrEqual(ambangKembar().ambang);
  });

  it('akar kasar: imbuhan umum dilepas, kata pendek utuh', () => {
    expect(akar('tercatat')).toBe('catat');
    expect(akar('dicatat')).toBe('catat');
    expect(akar('catatan')).toBe('catat');
    expect(akar('putusannya')).toBe('putus');
    expect(akar('dijadwalkan')).toBe('jadwal');
    expect(akar('harga')).toBe('harga');
  });
});

describe('G-pilihan-kembar di pemeriksa lingkar (GENERASI_M2D6)', () => {
  const kembar = (no: number): OmonganDraf => {
    const o = om(no);
    const lain = HURUF.filter((h) => h !== o.kunci);
    const [x, y] = [lain[0] as KunciOpsi, lain[1] as KunciOpsi];
    // Pengecoh y = parafrasa pengecoh x (tanda baca + kata fungsi), isinya sama.
    o.pilihan[y] = `${o.pilihan[x].replace(/\.$/, '')} juga ya.`;
    return o;
  };

  it('omongan dengan dua pengecoh kembar ditolak PEMERIKSA sebelum peran model mana pun; M2d-5 meloloskannya', async () => {
    const berpikir = { jawaban: () => ({ token_penalaran: 2000 }) };
    const { hasil, rekaman, jejak } = await jalan({ ...berpikir, penulis: (no, p) => (no === 3 && p === 1 ? kembar(3) : undefined) }, GENERASI_M2D6, 1);
    const o3 = hasil.riwayat[0]?.omongan.find((o) => o.no === 3);
    expect(o3?.status).toBe('ditolak-pemeriksa');
    expect(o3?.umpan.some((u) => u.startsWith('[pemeriksa: G-pilihan-kembar]'))).toBe(true);
    expect(dari(rekaman, 'pembaca-kartu').filter((r) => r.info.omongan === 3)).toHaveLength(0);
    expect(dari(rekaman, 'kritikus').filter((r) => r.info.omongan === 3)).toHaveLength(0);
    const g = jejak.jejak().langkah.find((l) => l.jenis === 'gerbang-g' && l.omongan === 3);
    expect((g?.rincian['pilihan_kembar'] as { tolak: boolean }).tolak).toBe(true);
    // Omongan lain tetap lolos.
    expect(hasil.riwayat[0]?.omongan.filter((o) => o.no !== 3).every((o) => o.status === 'lolos')).toBe(true);

    const m2d5 = await jalan({ penulis: (no, p) => (no === 3 && p === 1 ? kembar(3) : undefined) }, GENERASI_M2D5, 1);
    expect(m2d5.hasil.riwayat[0]?.omongan.find((o) => o.no === 3)?.status).toBe('lolos');
  });
});
