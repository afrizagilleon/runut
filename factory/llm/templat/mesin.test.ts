/**
 * Mesin templat (T-04): urutan gerbang (kode → penebak campur → pembaca kartu
 * → kritikus PALING AKHIR), putusan penebak campur dengan henti dini, pencatatan
 * peran penyempurna, titik buta Haiku, distribusi. Model dipalsukan.
 */
import { describe, expect, it } from 'vitest';
import type { KunciOpsi } from '../draf.ts';
import { validasiJejak } from '../jejak.ts';
import { PencatatJejak } from '../jejak.ts';
import type { PesanChat } from '../klien.ts';
import { DEFINISI_PAKET, bangunPaket } from '../paket.ts';
import { hurufKunciKode } from '../posisi-kunci.ts';
import type { JawabanModel } from '../susun.ts';
import { putusanPenebakCampur, type SetelanTumpukan } from './gerbang.ts';
import { jalankanTemplat } from './mesin.ts';
import type { InfoTemplat, PanggilTemplat } from './penulis.ts';

const TIRT = bangunPaket(DEFINISI_PAKET.tirt);
const S1: SetelanTumpukan = { penebak: { aturan: 'dua-dari-tiga', ambangHaiku: 60 }, kartu: 'menolak', kritikus: { jenis: ['kunci', 'makna', 'aturan'], dicatat: false } };
const NAMA = ['Sinta', 'Maya', 'Rizky'];
const KUNCI: Record<number, KunciOpsi> = { 1: hurufKunciKode('tirt', 1), 2: hurufKunciKode('tirt', 2), 3: hurufKunciKode('tirt', 3) };
const LAIN = (k: KunciOpsi): KunciOpsi => (k === 'a' ? 'b' : 'a');

function j(teks: string, tokenPenalaran = 2_000): JawabanModel {
  return { teks, token_masuk: 100, token_keluar: 50, latensi_ms: 1, finish_reason: 'stop', biaya_usd: 0.001, penyedia: 'Palsu', token_penalaran: tokenPenalaran };
}

interface Skenario {
  /** Tebakan per model (ke 1 Haiku, 2 DeepSeek, 3 GLM) per omongan & panggilan ke-n. */
  tebak?: (info: InfoTemplat, n: number) => { pilihan: KunciOpsi; yakin: number };
  kartu?: (info: InfoTemplat, n: number) => KunciOpsi;
  kritikus?: (info: InfoTemplat, n: number) => string;
  penyempurna?: (pesan: PesanChat[], info: InfoTemplat) => string;
}

function palsu(s: Skenario): { panggil: PanggilTemplat; log: InfoTemplat[] } {
  const log: InfoTemplat[] = [];
  const hitung = new Map<string, number>();
  const panggil: PanggilTemplat = async (pesan, _setelan, info) => {
    log.push(info);
    const kunci = `${info.jenis}/${String(info.omongan)}`;
    const n = (hitung.get(kunci) ?? 0) + 1;
    hitung.set(kunci, n);
    const user = pesan[1]?.content ?? '';
    const no = info.omongan ?? 1;
    if (info.jenis === 'tulis-pesan') {
      const angka = /ANGKA YANG BOLEH[^:]*: (.*)/.exec(user)?.[1] ?? '';
      const boleh = [...angka.matchAll(/"([^"]+)"/g)].map((m) => m[1]).join(' ');
      const wajib = [...(/WAJIB DISEBUT: (.*)/.exec(user)?.[1] ?? '').matchAll(/"([^"]+)"/g)].map((m) => m[1])[0] ?? '';
      return j(JSON.stringify({ nama: NAMA[no - 1], jam: '19.20', pesan: `Gw denger ${wajib} ${boleh} gitu deh`.replace(/\s+/g, ' ') }));
    }
    if (info.jenis === 'tulis-penjelasan') {
      const tok = [...user.matchAll(/^- (\[\[[^\]]+\]\])$/gm)].map((m) => m[1]).slice(0, 6).join(', ');
      return j(JSON.stringify({ penjelasan: `Menurut dokumennya: ${tok}. Salah-kaprah yang umum: orang sering salah baca kartunya.` }));
    }
    if (info.jenis === 'gerbang-tebak') {
      const t = s.tebak?.(info, n) ?? { pilihan: LAIN(KUNCI[no] as KunciOpsi), yakin: 50 };
      return j(JSON.stringify({ ...t, alasan: 'tebakan' }), info.ke === 3 ? 600 : 0);
    }
    if (info.jenis === 'gerbang-kartu') {
      return j(JSON.stringify({ pilihan: s.kartu?.(info, n) ?? KUNCI[no], kartu: [1], alasan: 'kartu 1', membingungkan: [] }));
    }
    if (info.jenis === 'kritikus') {
      return j(s.kritikus?.(info, n) ?? JSON.stringify({ keberatan: [], arahan: '', cek_klaim: { bagian_tak_tercek: [], kunci_menyatakan_tak_pasti: false }, cek_pilihan: { juga_benar: [], alasan: '' } }), 5_000);
    }
    if (info.jenis === 'sempurnakan-pilihan') return j(s.penyempurna?.(pesan, info) ?? '{"pilihan":{},"alasan":"-"}', 0);
    throw new Error(`jenis ${info.jenis}`);
  };
  return { panggil, log };
}

describe('putusan penebak campur (murni)', () => {
  const s = S1.penebak;
  it('Haiku memilih kunci dengan yakin ≥ A → tolak tanpa penebak lain', () => {
    expect(putusanPenebakCampur([{ benar: true, yakin: 60 }], s)).toBe('tolak');
    expect(putusanPenebakCampur([{ benar: true, yakin: 59 }], s)).toBe('belum');
  });
  it('dua yang pertama bukan kunci → lolos tanpa GLM; keduanya kunci → tolak', () => {
    expect(putusanPenebakCampur([{ benar: false, yakin: 90 }, { benar: false, yakin: 90 }], s)).toBe('lolos');
    expect(putusanPenebakCampur([{ benar: true, yakin: 10 }, { benar: true, yakin: 10 }], s)).toBe('tolak');
    expect(putusanPenebakCampur([{ benar: true, yakin: 10 }, { benar: false, yakin: 10 }], s)).toBe('belum');
    expect(putusanPenebakCampur([{ benar: true, yakin: 10 }, { benar: false, yakin: 10 }, { benar: true, yakin: 10 }], s)).toBe('tolak');
    expect(putusanPenebakCampur([{ benar: true, yakin: 10 }, { benar: false, yakin: 10 }, { benar: false, yakin: 10 }], s)).toBe('lolos');
  });
  it('3/3 dan tanpa A', () => {
    const t = { aturan: 'tiga-dari-tiga' as const, ambangHaiku: null };
    expect(putusanPenebakCampur([{ benar: true, yakin: 99 }, { benar: true, yakin: 99 }], t)).toBe('belum');
    expect(putusanPenebakCampur([{ benar: true, yakin: 99 }, { benar: false, yakin: 99 }], t)).toBe('lolos');
  });
});

describe('lingkar templat dengan model palsu', () => {
  it('semua lolos: tiga omongan dikunci, draf lolos validator; urutan gerbang per omongan kode → penebak → kartu → kritikus', async () => {
    const { panggil, log } = palsu({});
    const jejak = new PencatatJejak({ paket: TIRT, model: 'x', promptSistem: 'x', pesanPaket: 'x', ringkasanPrompt: 'x', jalur: null, versi: 2, dibuatOleh: 'factory/llm/templat/mesin.ts' });
    const h = await jalankanTemplat({ paket: TIRT, panggil, setelan: S1, jejak });
    expect(h.berhenti).toBeNull();
    expect(h.lolos).toBe(true);
    expect(h.distribusi.lolos).toBe(3);
    expect(h.rencana_awal).toEqual(['sebab-resmi:susp-2025-12-10', 'angka-lain-waktu:harga-2025-12-09', 'benar-berincian:hari-naik-beruntun']);
    for (const no of [1, 2, 3]) {
      const urut = log.filter((x) => x.omongan === no && ['gerbang-tebak', 'gerbang-kartu', 'kritikus'].includes(x.jenis)).map((x) => `${x.jenis}${x.jenis === 'gerbang-tebak' ? String(x.ke) : ''}`);
      // Haiku & DeepSeek sama-sama bukan kunci → GLM tidak dipanggil (putusan sudah pasti)
      expect(urut).toEqual(['gerbang-tebak1', 'gerbang-tebak2', 'gerbang-kartu', 'kritikus']);
    }
    expect(log.filter((x) => x.jenis === 'gerbang-tebak').map((x) => x.model)).toContain('anthropic/claude-haiku-4.5');
    expect(validasiJejak(jejak.jejak())).toEqual([]);
  });

  it('penebak menolak → kritikus TIDAK dipanggil untuk versi itu; penyempurna Haiku dipanggil dan dicatat sebagai peran tersendiri', async () => {
    const { panggil, log } = palsu({
      tebak: (info, n) => (info.omongan === 1 && n <= 1 ? { pilihan: KUNCI[1] as KunciOpsi, yakin: 90 } : { pilihan: LAIN(KUNCI[info.omongan ?? 1] as KunciOpsi), yakin: 30 }),
      penyempurna: () => '{"pilihan":{"p3":{"varian":"P3b","teks":"Keliru, bursa menghentikannya hari ini karena laporan keuangannya terlambat diserahkan."}},"alasan":"x"}',
    });
    const jejak = new PencatatJejak({ paket: TIRT, model: 'x', promptSistem: 'x', pesanPaket: 'x', ringkasanPrompt: 'x', jalur: null, versi: 2, dibuatOleh: 'factory/llm/templat/mesin.ts' });
    const h = await jalankanTemplat({ paket: TIRT, panggil, setelan: S1, jejak });
    const v1 = h.versi.find((v) => v.no === 1 && v.versi === 1);
    expect(v1?.berhenti).toBe('penebak');
    const p1 = log.filter((x) => x.omongan === 1 && x.putaran === v1?.putaran).map((x) => x.jenis);
    expect(p1).not.toContain('kritikus');
    expect(p1).not.toContain('gerbang-kartu');
    // Haiku yakin 90 memilih kunci → DeepSeek dan GLM tidak dipanggil
    expect(log.filter((x) => x.omongan === 1 && x.putaran === v1?.putaran && x.jenis === 'gerbang-tebak').map((x) => x.ke)).toEqual([1]);
    expect(h.penyempurnaan[0]?.diterima.map((x) => x.varian)).toEqual(['P3b']);
    const langkah = jejak.jejak().langkah.filter((l) => l.jenis === 'sempurnakan-pilihan');
    expect(langkah.map((l) => [l.peran, l.model])).toEqual([['penyempurna', 'anthropic/claude-haiku-4.5']]);
    // versi berikutnya: Haiku menebak pilihan yang ia sempurnakan → titik buta dicatat
    const v2 = h.versi.find((v) => v.no === 1 && v.versi === 2);
    expect(v2?.titik_buta).toBe(true);
    expect(v2?.berhenti).toBe('lolos');
    expect(h.distribusi.penebak).toBe(1);
  });

  it('penyempurna mengubah angka → dibuang kode; pilihan lama tetap', async () => {
    const { panggil } = palsu({
      tebak: (info, n) => (info.omongan === 2 && n <= 1 ? { pilihan: KUNCI[2] as KunciOpsi, yakin: 95 } : { pilihan: LAIN(KUNCI[info.omongan ?? 1] as KunciOpsi), yakin: 30 }),
      penyempurna: () => '{"pilihan":{"kunci":{"varian":"K1","teks":"Keliru, penutupan [[harga-2025-12-09|9 Desember]] [[harga-2025-12-09|Rp107]], bukan [[harga-2025-12-08|Rp97]]."}},"alasan":"x"}',
    });
    const h = await jalankanTemplat({ paket: TIRT, panggil, setelan: S1 });
    const p = h.penyempurnaan.find((x) => x.no === 2);
    expect(p?.diterima).toEqual([]);
    expect(p?.dibuang.length).toBe(1);
    expect(h.kunci.find((k) => k.no === 2)?.omongan.pilihan[KUNCI[2] as KunciOpsi]).toContain('Rp106');
  });

  it('pembaca kartu memilih pengecoh → ditolak sebelum kritikus', async () => {
    const { panggil, log } = palsu({ kartu: (info, n) => (info.omongan === 3 && n === 1 ? LAIN(KUNCI[3] as KunciOpsi) : (KUNCI[info.omongan ?? 1] as KunciOpsi)) });
    const h = await jalankanTemplat({ paket: TIRT, panggil, setelan: S1 });
    const v = h.versi.find((x) => x.no === 3 && x.versi === 1);
    expect(v?.berhenti).toBe('kartu');
    expect(log.filter((x) => x.omongan === 3 && x.putaran === v?.putaran).map((x) => x.jenis)).not.toContain('kritikus');
    expect(h.lolos).toBe(true);
  });

  it('kritikus menolak (kunci) → versi berhenti di kritikus; kritikus tidak menjawab → diperiksa sekali lagi', async () => {
    const tolak = JSON.stringify({ keberatan: [{ jenis: 'kunci', bagian: 'pilihan b', alasan: 'b juga benar' }], arahan: '', cek_klaim: { bagian_tak_tercek: [], kunci_menyatakan_tak_pasti: false }, cek_pilihan: { juga_benar: [], alasan: '' } });
    const { panggil, log } = palsu({ kritikus: (info, n) => (info.omongan === 1 && n === 1 ? tolak : info.omongan === 2 && n <= 2 ? 'ngaco' : JSON.stringify({ keberatan: [], arahan: '', cek_klaim: { bagian_tak_tercek: [], kunci_menyatakan_tak_pasti: false }, cek_pilihan: { juga_benar: [], alasan: '' } })) });
    const h = await jalankanTemplat({ paket: TIRT, panggil, setelan: S1 });
    expect(h.versi.find((x) => x.no === 1 && x.versi === 1)?.berhenti).toBe('kritikus');
    // omongan 2: dua jawaban kritikus tak terbaca (satu panggilan kritik = 2 percobaan) → diperiksa sekali lagi → lolos
    expect(log.filter((x) => x.omongan === 2 && x.jenis === 'kritikus').length).toBeGreaterThanOrEqual(3);
    expect(h.versi.find((x) => x.no === 2 && x.versi === 1)?.berhenti).toBe('lolos');
    expect(h.lolos).toBe(true);
  });

  it('pagu tercapai → berhenti dengan alasan tertulis', async () => {
    const { PaguTercapai } = await import('../pagu.ts');
    const h = await jalankanTemplat({
      paket: TIRT, setelan: S1, panggil: async () => {
        throw new PaguTercapai(1, 0.2, 1.2, 'x');
      },
    });
    expect(h.berhenti).toMatch(/^pagu tercapai/);
    expect(h.distribusi.pagu).toBe(1);
  });
});
