/**
 * M3.14 D-1 — slot soal pemanasan dan rupa pemandu, dari HASIL RENDER.
 *
 * Slotnya kosong di milestone ini; yang dites adalah (1) slot yang kosong
 * benar-benar kosong, (2) berkas yang sah dan disetujui terbaca, dan yang
 * tidak disetujui atau cacat dianggap tidak ada, (3) layar pemanasan dan layar
 * soal yang disorot pemandu merender sorotan hanya di tempat yang benar —
 * tidak pernah di pilihan jawaban.
 */
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { createElement as h } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';
import type { Kasus } from '../../factory/skema/tipe.ts';

vi.mock('./kasus.ts', async () => {
  const { readFileSync: baca } = await import('node:fs');
  const { fileURLToPath: jalur } = await import('node:url');
  const isi = await import('./isi-kasus.ts');
  const akar = jalur(new URL('../../', import.meta.url));
  const muat = (id: string): Kasus => JSON.parse(baca(`${akar}cases/${id}.json`, 'utf8')) as Kasus;
  const KASUS = muat('dada-2025-10-08');
  const KASUS_ULTJ = muat('ultj-2026-05-04');
  return { ...isi, KASUS, KASUS_ULTJ, DAFTAR_KASUS: [KASUS, KASUS_ULTJ] };
});
import { LayarPemanasan, LayarSoal } from './Aplikasi.tsx';
import { langkah, type Keadaan } from './alur.ts';
import { awalBungkus } from './bungkus.ts';
import { DAFTAR_KASUS, indeksFakta } from './kasus.ts';
import { alasanTolakPemanasan, bacaPemanasan, kartuPemanasan, type Pemanasan } from './pemanasan.ts';
import { PEMANASAN } from './pemanasan-slot.ts';
import {
  LABEL_PETUNJUK_KARTU,
  langkahTampilan,
  tampilanAwal,
  type AksiTampilan,
  type KeadaanTampilan,
} from './tampilan.ts';

const AKAR = fileURLToPath(new URL('../../', import.meta.url));
const FIXTURE: unknown = JSON.parse(
  readFileSync(`${AKAR}web/src/pemanasan/uji/contoh-pemanasan.json`, 'utf8'),
);

function salin<T>(x: T): T {
  return JSON.parse(JSON.stringify(x)) as T;
}

function jalankan(k: KeadaanTampilan, ...aksi: AksiTampilan[]): KeadaanTampilan {
  return aksi.reduce(langkahTampilan, k);
}

/** Tampilan dengan pemandu di langkah ke-n (0-based). */
function diLangkah(n: number): KeadaanTampilan {
  let k = jalankan(tampilanAwal(true), { jenis: 'tiba_di_soal_pertama' });
  for (let i = 0; i < n; i += 1) k = langkahTampilan(k, { jenis: 'lanjut_pemandu' });
  return k;
}

describe('slot soal pemanasan', () => {
  it('slot di repo KOSONG: pemandu berjalan di soal pertama simulasi', () => {
    expect(PEMANASAN).toBeNull();
  });

  it('fixture uji yang sah dan disetujui terbaca', () => {
    expect(alasanTolakPemanasan(FIXTURE)).toBeNull();
    const p = bacaPemanasan(FIXTURE);
    expect(p?.soal.soal_id).toBe('pemanasan-uji');
    expect(kartuPemanasan(p as Pemanasan).map((f) => f.fact_id)).toEqual(['uji-pengumuman', 'uji-harga']);
  });

  it('belum disetujui = tidak ada', () => {
    const x = salin(FIXTURE) as Record<string, unknown>;
    x['disetujui'] = false;
    expect(bacaPemanasan(x)).toBeNull();
    delete x['disetujui'];
    expect(bacaPemanasan(x)).toBeNull();
  });

  it.each([
    ['kartu menyebut fakta yang tidak ada', (s: Record<string, unknown>) => (s['kartu'] = ['uji-pengumuman', 'hantu'])],
    ['kartu penentu di luar kartu', (s: Record<string, unknown>) => (s['kartu_penentu'] = ['hantu'])],
    ['jawaban bukan pilihan', (s: Record<string, unknown>) => (s['jawaban'] = 'z')],
    ['pilihan cuma satu', (s: Record<string, unknown>) => (s['pilihan'] = [{ kunci: 'a', teks: 'x' }])],
    ['pesan tanpa isi', (s: Record<string, unknown>) => (s['pesan'] = { nama: 'A', jam: '1', isi: '' })],
  ])('berkas cacat (%s) = tidak ada', (_nama, rusak) => {
    const x = salin(FIXTURE) as { soal: Record<string, unknown> };
    rusak(x.soal);
    expect(bacaPemanasan(x)).toBeNull();
  });

  it('bukan objek / kosong = tidak ada, tanpa melempar', () => {
    expect(bacaPemanasan(null)).toBeNull();
    expect(bacaPemanasan(undefined)).toBeNull();
    expect(bacaPemanasan('teks')).toBeNull();
    expect(bacaPemanasan([])).toBeNull();
  });
});

describe('layar pemanasan (fixture)', () => {
  const p = bacaPemanasan(FIXTURE) as Pemanasan;
  const render = (t: KeadaanTampilan): string =>
    renderToStaticMarkup(
      h(LayarPemanasan, { pemanasan: p, tampilan: t, kirimTampilan: () => undefined, selesai: () => undefined }),
    );
  const aktif = jalankan(tampilanAwal(true), { jenis: 'mulai_pemanasan' }, { jenis: 'tiba_di_soal_pertama' });

  it('pesan, kartu tanpa kaki, pertanyaan, pilihan', () => {
    const html = render(aktif);
    expect(html).toContain('Soal latihan');
    expect(html).toContain(p.soal.pesan.isi);
    expect(html).not.toContain('lembar-kaki');
    expect(html.match(/data-uid="pemanasan:opsi:/g)).toHaveLength(2);
  });

  it('langkah ketiga menandai kartu penentu saja, bukan pilihan', () => {
    const html = render(jalankan(aktif, { jenis: 'lanjut_pemandu' }, { jenis: 'lanjut_pemandu' }));
    expect(html.match(/lembar-ditandai/g)).toHaveLength(1);
    expect(html).toMatch(/lembar-ditandai" aria-labelledby="kartu-uji-pengumuman"/);
    expect(html).toContain(LABEL_PETUNJUK_KARTU);
    const pilihan = html.slice(html.indexOf('<fieldset'), html.indexOf('</fieldset>'));
    expect(pilihan).not.toMatch(/disorot|ditandai/);
  });

  it('sesudah dikunci: cap dan penjelasan, tanpa tanda kartu', () => {
    const html = render(jalankan(aktif, { jenis: 'pilih_pemanasan', kunci: 'b' }, { jenis: 'kunci_pemanasan' }));
    expect(html).toContain('Cocok dengan kartu');
    expect(html).toContain('Lanjut ke soal 1');
    expect(html).not.toContain('lembar-ditandai');
  });
});

describe('layar soal yang disorot pemandu (kedua simulasi, setiap soal)', () => {
  for (const kasus of DAFTAR_KASUS) {
    const indeks = indeksFakta(kasus);
    let k: Keadaan = awalBungkus(kasus, 'uji-pemandu').keadaan;
    k = langkah(k, { jenis: 'mulai', lebar_layar: 360 }, 1).keadaan;
    k = langkah(k, { jenis: 'lanjut' }, 2).keadaan;
    const soal = kasus.soal[0];
    if (soal === undefined) continue;
    const render = (t: KeadaanTampilan): string =>
      renderToStaticMarkup(
        h(LayarSoal, {
          kasus,
          keadaan: k,
          nomor: 0,
          kirim: () => undefined,
          sakelarSumber: () => undefined,
          indeks,
          tampilan: t,
          kirimTampilan: () => undefined,
        }),
      );

    it(`${kasus.kasus_id}: tiap langkah menyorot satu benda, dan tidak pernah satu pilihan`, () => {
      const harapan = ['pesan disorot', 'tumpukan disorot', 'lembar-ditandai', 'pilihan disorot'];
      for (const [n, kelas] of harapan.entries()) {
        const html = render(diLangkah(n));
        expect(html, `langkah ${String(n + 1)}`).toContain(kelas);
        expect(html.match(/ disorot"/g)?.length ?? 0, `langkah ${String(n + 1)}: paling banyak satu sorotan`).toBeLessThanOrEqual(1);
        expect(html).not.toMatch(/class="opsi[^"]*(disorot|ditandai)/);
        expect(html, 'bilah bawah menyingkir selama pemandu tampil').not.toContain('data-uid="bilah:');
      }
    });

    it(`${kasus.kasus_id}: langkah ketiga menandai TEPAT kartu_penentu soal 1`, () => {
      const html = render(diLangkah(2));
      const ditandai = [...html.matchAll(/lembar-ditandai" aria-labelledby="kartu-([^"]+)"/g)].map((m) => m[1]);
      expect(ditandai.sort()).toEqual([...soal.kartu_penentu].sort());
    });

    it(`${kasus.kasus_id}: tanpa pemandu, tidak ada sorotan; "Cara main" ada sebelum dikunci`, () => {
      const html = render(tampilanAwal(false));
      expect(html).not.toMatch(/disorot|lembar-ditandai/);
      expect(html).toContain('data-uid="cara-main"');
    });
  }
});
