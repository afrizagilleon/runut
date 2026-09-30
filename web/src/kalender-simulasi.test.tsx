/**
 * M3.14 D-3 — kalender simulasi.
 *
 * Kegagalan yang dijaga kontrak dengan nama: kalender yang menampilkan hari
 * "segera hadir" palsu, dan kalender yang rusak tanpa `localStorage`.
 */
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { createElement as h } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import type { Kasus } from '../../factory/skema/tipe.ts';
import { KalenderSimulasi } from './Kalender.tsx';
import {
  KUNCI_SIMULASI_SELESAI,
  bacaSelesai,
  catatSelesai,
  labelSimulasi,
  statusSimulasi,
  susunKalender,
} from './kalender-simulasi.ts';
import type { Penyimpanan } from './sesi.ts';
import {
  PENGANTAR_KALENDER,
  langkahTampilan,
  tampilanAwal,
  tautanKalenderDiPembuka,
} from './tampilan.ts';

const AKAR = fileURLToPath(new URL('../../', import.meta.url));
const DAFTAR: Kasus[] = ['dada-2025-10-08', 'ultj-2026-05-04'].map(
  (id) => JSON.parse(readFileSync(`${AKAR}cases/${id}.json`, 'utf8')) as Kasus,
);

class Simpan implements Penyimpanan {
  isi = new Map<string, string>();
  getItem(k: string): string | null {
    return this.isi.get(k) ?? null;
  }
  setItem(k: string, v: string): void {
    this.isi.set(k, v);
  }
}

const melempar: Penyimpanan = {
  getItem: () => {
    throw new Error('diblokir');
  },
  setItem: () => {
    throw new Error('diblokir');
  },
};

/** Simulasi buatan untuk skala: hanya medan yang dibaca kalender. */
function buatan(i: number): Kasus {
  const hari = new Date(Date.UTC(2024, 0, 1 + i * 3));
  const iso = hari.toISOString().slice(0, 10);
  return { ...(DAFTAR[0] as Kasus), kasus_id: `buatan-${String(i)}`, tanggal_t: iso, nama_samaran: `Perusahaan ${String(i)}` };
}

function semuaTanda(bulan: ReturnType<typeof susunKalender>): string[] {
  return bulan.flatMap((b) => b.minggu.flat().flatMap((s) => (s?.kasus_id != null ? [s.kasus_id] : [])));
}

describe('hanya simulasi nyata', () => {
  it('dua simulasi di repo → dua bulan, dua tanda, tiap tanda di tanggal_t simulasinya', () => {
    const bulan = susunKalender(DAFTAR, []);
    expect(bulan.map((b) => b.kunci)).toEqual(['2025-10', '2026-05']);
    expect(semuaTanda(bulan).sort()).toEqual(DAFTAR.map((k) => k.kasus_id).sort());
    for (const b of bulan) {
      for (const sel of b.minggu.flat()) {
        if (sel?.kasus_id == null) continue;
        expect(DAFTAR.find((k) => k.kasus_id === sel.kasus_id)?.tanggal_t).toBe(sel.iso);
      }
    }
    expect(bulan.flatMap((b) => b.simulasi)).toHaveLength(DAFTAR.length);
  });

  it('100 simulasi → tepat 100 tanda, satu baris per simulasi, bulan tanpa simulasi tidak ada', () => {
    const banyak = Array.from({ length: 100 }, (_, i) => buatan(i));
    const bulan = susunKalender(banyak, []);
    expect(semuaTanda(bulan)).toHaveLength(100);
    expect(bulan.flatMap((b) => b.simulasi)).toHaveLength(100);
    expect(bulan.every((b) => b.simulasi.length > 0)).toBe(true);
  });

  it('nol simulasi → nol bulan (tidak ada halaman kosong berisi janji)', () => {
    expect(susunKalender([], [])).toEqual([]);
  });

  it('kolom hari benar: 8 Okt 2025 Rabu, 4 Mei 2026 Senin; Sabtu/Minggu ditandai libur', () => {
    const [okt, mei] = susunKalender(DAFTAR, []);
    const kolom = (b: typeof okt, iso: string): number =>
      (b?.minggu.find((m) => m.some((s) => s?.iso === iso)) ?? []).findIndex((s) => s?.iso === iso);
    expect(kolom(okt, '2025-10-08')).toBe(2);
    expect(kolom(mei, '2026-05-04')).toBe(0);
    for (const b of [okt, mei]) {
      for (const m of b?.minggu ?? []) {
        m.forEach((s, i) => {
          if (s !== null) expect(s.akhirPekan).toBe(i >= 5);
        });
      }
    }
  });

  it('render: tidak ada kata "segera", "hadir", "menyusul"; tombol = jumlah simulasi', () => {
    const html = renderToStaticMarkup(
      h(KalenderSimulasi, { bulan: susunKalender(DAFTAR, []), judul: 'x', pengantar: PENGANTAR_KALENDER, pilih: () => undefined }),
    );
    expect(html).not.toMatch(/segera|hadir|menyusul|coming/i);
    expect(html.match(/<button/g)).toHaveLength(DAFTAR.length);
    expect(html.match(/kisi-simulasi/g)).toHaveLength(DAFTAR.length);
    expect(html).toContain('Perusahaan D');
    expect(html).not.toContain('DADA');
    expect(html).not.toContain('ULTJ');
  });
});

describe('tanda selesai dan penyimpanan', () => {
  it('yang selesai ditandai di kisi dan di barisnya', () => {
    const bulan = susunKalender(DAFTAR, ['dada-2025-10-08'], 'dada-2025-10-08');
    const dada = bulan[0]?.simulasi[0];
    expect(dada?.selesai).toBe(true);
    expect(statusSimulasi(dada as NonNullable<typeof dada>)).toBe('Baru saja selesai');
    expect(bulan[1]?.simulasi[0]?.selesai).toBe(false);
    expect(statusSimulasi(bulan[1]?.simulasi[0] as NonNullable<typeof dada>)).toBe('Belum dimainkan');
    expect(labelSimulasi(dada as NonNullable<typeof dada>)).toBe('Rabu, 8 Oktober 2025 · Perusahaan D · 3 soal');
    const html = renderToStaticMarkup(
      h(KalenderSimulasi, { bulan, judul: 'x', pengantar: 'y', pilih: () => undefined }),
    );
    expect(html.match(/kisi-selesai/g)).toHaveLength(1);
  });

  it('simpan lalu baca; ganda tidak digandakan; isian rusak diabaikan', () => {
    const s = new Simpan();
    catatSelesai(s, 'dada-2025-10-08');
    catatSelesai(s, 'dada-2025-10-08');
    catatSelesai(s, 'ultj-2026-05-04');
    expect(bacaSelesai(s)).toEqual(['dada-2025-10-08', 'ultj-2026-05-04']);
    s.setItem(KUNCI_SIMULASI_SELESAI, '{bukan json');
    expect(bacaSelesai(s)).toEqual([]);
    s.setItem(KUNCI_SIMULASI_SELESAI, JSON.stringify(['ok-1', 7, '<script>', 'x'.repeat(80)]));
    expect(bacaSelesai(s)).toEqual(['ok-1']);
  });

  it('tanpa penyimpanan (null atau melempar): tidak melempar, kalender tetap utuh', () => {
    expect(bacaSelesai(null)).toEqual([]);
    expect(bacaSelesai(melempar)).toEqual([]);
    expect(() => {
      catatSelesai(null, 'dada-2025-10-08');
      catatSelesai(melempar, 'dada-2025-10-08');
    }).not.toThrow();
    expect(semuaTanda(susunKalender(DAFTAR, bacaSelesai(melempar)))).toHaveLength(DAFTAR.length);
  });

  it('selesai di pemuatan ini tetap ditandai walau penyimpanan mati (keadaan di reducer)', () => {
    let k = tampilanAwal(false, { selesai: bacaSelesai(melempar) });
    k = langkahTampilan(k, { jenis: 'simulasi_selesai', kasus_id: 'dada-2025-10-08' });
    k = langkahTampilan(k, { jenis: 'simulasi_selesai', kasus_id: 'dada-2025-10-08' });
    expect(k.kalender.selesai).toEqual(['dada-2025-10-08']);
    expect(susunKalender(DAFTAR, k.kalender.selesai)[0]?.simulasi[0]?.selesai).toBe(true);
  });
});

describe('pintu kalender (D-3: tanpa langkah tambahan untuk pengunjung baru)', () => {
  it('pengunjung baru tanpa simulasi selesai: tidak ada tautan di layar pertama', () => {
    expect(tautanKalenderDiPembuka(tampilanAwal(true))).toBe(false);
  });
  it('pengunjung yang kembali, atau yang sudah menyelesaikan satu: ada', () => {
    expect(tautanKalenderDiPembuka(tampilanAwal(false, { kembali: true }))).toBe(true);
    expect(tautanKalenderDiPembuka(tampilanAwal(false, { selesai: ['dada-2025-10-08'] }))).toBe(true);
  });
  it('membuka kalender menutup pemandu; menutup kalender kembali ke layar pertama', () => {
    let k = langkahTampilan(tampilanAwal(true), { jenis: 'buka_pemandu' });
    k = langkahTampilan(k, { jenis: 'buka_kalender' });
    expect(k.kalender.terbuka).toBe(true);
    expect(k.pemandu.langkah).toBeNull();
    k = langkahTampilan(k, { jenis: 'tutup_kalender' });
    expect(k.kalender.terbuka).toBe(false);
  });
});
