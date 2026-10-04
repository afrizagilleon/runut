/** M2d-19: anti-salin tidak menangkap nama jenis kesalahan; riwayat sudut ditolak sampai ke agen. */
import { mkdtempSync, readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import type { NilaiOmonganV3 } from '../bebas/mesin-v3.ts';
import { periksaSalinTeladan, teladanV3 } from '../bebas/prompt-v3.ts';
import { uraiOmonganBebas, type OmonganBebas } from '../bebas/skema.ts';
import { AKAR } from '../env.ts';
import type { PaketFakta } from '../paket.ts';
import { buatAlat, CADANGAN_AJUKAN_USD, MAKS_RIWAYAT_DITOLAK } from './alat.ts';

const paket = JSON.parse(readFileSync(`${AKAR}eval/penyusun/m2d17-uji-2/paket.json`, 'utf8')) as PaketFakta;
const mentah = (JSON.parse(readFileSync(`${AKAR}eval/penyusun/m2d18-uji-sdk-2/omongan-akhir.json`, 'utf8')) as { omongan: unknown[] }).omongan[0] as Record<string, unknown>;
const om = (): OmonganBebas => uraiOmonganBebas(structuredClone(mentah)).omongan as OmonganBebas;

function denganUmpanBalikA(teks: string): OmonganBebas {
  const o = om();
  const a = o.pengecoh.a;
  if (a === undefined) throw new Error('fixture tanpa pengecoh a');
  return { ...o, pengecoh: { ...o.pengecoh, a: { ...a, umpan_balik: teks } } };
}

describe('anti-salin teladan vs nama jenis kesalahan', () => {
  it('nama jenis kesalahan yang diikuti "kartu N" tidak lagi dianggap menyalin teladan', () => {
    expect(periksaSalinTeladan(denganUmpanBalikA('Ini percaya omongan tanpa cek: kartu 1 mencatat alasan yang lain.'))).toEqual([]);
    expect(periksaSalinTeladan(denganUmpanBalikA('Memilih ini berarti percaya omongan tanpa cek kartu 1 lebih dulu.'))).toEqual([]);
  });
  it('kalimat teladan yang lain tetap dijaga', () => {
    const t = teladanV3();
    expect(periksaSalinTeladan({ ...om(), pesan: t.pesan }).length).toBeGreaterThan(0);
    expect(periksaSalinTeladan({ ...om(), penjelasan: t.penjelasan }).length).toBeGreaterThan(0);
  });
});

describe('riwayat sudut ditolak', () => {
  const kosong = (o: OmonganBebas, putaran: number, berhenti: NilaiOmonganV3['berhenti'], alasan: string[]): NilaiOmonganV3 => ({ putaran, urut: 1, omongan: o, berhenti, alasan, dicatat: [], saringan: null, kartu_rotasi: null, penebak_kuat: null, kritik: null, biaya_gerbang_usd: 0.03, id_bank: null });
  const buat = (riwayat: Parameters<typeof buatAlat>[0]['riwayatDitolak'], berhenti: NilaiOmonganV3['berhenti']) =>
    buatAlat({
      paket, folderBank: mkdtempSync(join(tmpdir(), 'bank-hemat-')), idJalan: 'tes', paguUsd: 1, biayaAgen: () => 0, labelPenulis: 'tes',
      panggil: () => Promise.reject(new Error('tak dipakai')),
      ...(riwayat === undefined ? {} : { riwayatDitolak: riwayat }),
      nilai: ((o: OmonganBebas, _p: unknown, _c: unknown, putaran: number, _u: number, catat: (n: NilaiOmonganV3) => void) => {
        const n = kosong(o, putaran, berhenti, ['penebak memilih kunci 4 dari 4']);
        catat(n);
        return Promise.resolve(n);
      }) as never,
    });

  it('lihat_bank memuat sudut dari percobaan lain; penolakan di percobaan ini ikut masuk dan dihitung', async () => {
    const alat = buat([{ kartu_penentu: ['hari-naik-beruntun'], pesan: 'lama', berhenti: 'penebak-kuat', alasan: ['x'] }], 'penebak-kuat');
    expect(alat.lihatBank().pernah_ditolak).toHaveLength(1);
    expect(alat.keadaan().ditolak).toBe(0);
    await alat.ajukan(mentah);
    const d = alat.lihatBank().pernah_ditolak;
    expect(d).toHaveLength(2);
    // M2d-23: ringkasan per pola (kartu penentu × gerbang), bukan butir demi butir.
    expect(d.find((x) => x.kartu_penentu[0] === 'susp-2025-12-10')).toMatchObject({ gerbang: 'penebak-kuat', berapa_kali: 1, alasan: ['penebak memilih kunci 4 dari 4'] });
    expect(alat.keadaan().ditolak).toBe(1);
  });
  it('yang lolos atau tak-terukur tidak dicatat sebagai ditolak; daftar dibatasi', async () => {
    const lolos = buat(undefined, 'lolos');
    await lolos.ajukan(mentah);
    expect(lolos.lihatBank().pernah_ditolak).toEqual([]);
    const tak = buat(undefined, 'tak-terukur');
    await tak.ajukan(mentah);
    expect(tak.keadaan().ditolak).toBe(0);
    const banyak = buat(Array.from({ length: MAKS_RIWAYAT_DITOLAK + 5 }, (_, i) => ({ kartu_penentu: [`k${String(i)}`], pesan: 'p', berhenti: 'saringan', alasan: [] })), 'lolos');
    expect(banyak.lihatBank().pernah_ditolak).toHaveLength(MAKS_RIWAYAT_DITOLAK);
  });
  it('cadangan pengajuan = sedikit di atas pengajuan termahal yang terukur (US$0,105)', () => {
    expect(CADANGAN_AJUKAN_USD).toBeGreaterThan(0.105);
    expect(CADANGAN_AJUKAN_USD).toBeLessThanOrEqual(0.15);
  });
});
