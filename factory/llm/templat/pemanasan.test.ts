/**
 * Soal pemanasan templat (T-07a) dengan model palsu: rencana soal pertama,
 * gerbang pemanasan M2d-8 (pembaca kartu 3/3, kritikus), penyempurna Haiku bila
 * pembaca kartu memilih pengecoh. Tebak buta tidak dipanggil.
 */
import { describe, expect, it } from 'vitest';
import { HURUF_KUNCI_PEMANASAN, periksaBocor } from '../kalibrasi-pemanasan.ts';
import { DEFINISI_PAKET, bangunPaket } from '../paket.ts';
import { jalankanPemanasanTemplat } from './pemanasan.ts';
import { jawabPalsu, KRITIK_BERSIH, lainDari } from './palsu.ts';
import type { InfoTemplat, PanggilTemplat } from './penulis.ts';

const TIRT = bangunPaket(DEFINISI_PAKET.tirt);

function palsu(kartuSalahPertama: boolean): { panggil: PanggilTemplat; log: InfoTemplat[] } {
  const log: InfoTemplat[] = [];
  let kartu = 0;
  const panggil: PanggilTemplat = async (pesan, _s, info) => {
    log.push(info);
    const user = pesan[1]?.content ?? '';
    if (info.jenis === 'tulis-pesan') return jawabPalsu(JSON.stringify({ nama: 'Tania', jam: '20.05', pesan: 'Gw denger saham itu disetop hari ini gara-gara bursa ragu usahanya bisa jalan terus ya' }));
    if (info.jenis === 'tulis-penjelasan') {
      const tok = [...user.matchAll(/^- (\[\[[^\]]+\]\])$/gm)].map((m) => m[1]).slice(0, 2).join(' dan ');
      return jawabPalsu(JSON.stringify({ penjelasan: `Pengumuman bursa ${tok} menyebut alasannya sendiri-sendiri. Salah-kaprah yang umum: mengira alasan lama berlaku lagi.` }));
    }
    if (info.jenis === 'gerbang-kartu') {
      kartu += 1;
      return jawabPalsu(JSON.stringify({ pilihan: kartuSalahPertama && kartu === 1 ? lainDari(HURUF_KUNCI_PEMANASAN) : HURUF_KUNCI_PEMANASAN, kartu: [1], alasan: 'kartu 1', membingungkan: [] }));
    }
    if (info.jenis === 'kritikus') return jawabPalsu(KRITIK_BERSIH, 5_000);
    if (info.jenis === 'sempurnakan-pilihan') return jawabPalsu('{"pilihan":{"p1":{"varian":"P1b","teks":"Betul, alasan resmi hari ini memang usahanya diragukan bisa terus berjalan."}},"alasan":"x"}', 0);
    throw new Error(info.jenis);
  };
  return { panggil, log };
}

describe('soal pemanasan templat', () => {
  it('lolos: sebab-resmi, dua kartu, kartu 1 penentu, bersih dari teks tayang; tanpa penebak', async () => {
    const { panggil, log } = palsu(false);
    const h = await jalankanPemanasanTemplat(TIRT, panggil);
    expect(h.berhenti).toBeNull();
    expect(h.lolos).toBe(true);
    expect(h.rencana).toBe('sebab-resmi:susp-2025-12-10');
    expect(h.soal?.kartu).toEqual(['susp-2025-12-10', 'susp-2025-01-21']);
    expect(h.soal?.kartu_penentu).toEqual(['susp-2025-12-10']);
    expect(h.soal?.petunjuk).toMatch(/kartu 1/);
    expect(periksaBocor(h.soal as never, TIRT)).toEqual([]);
    expect(log.filter((x) => x.jenis === 'gerbang-kartu').length).toBe(3);
    expect(log.some((x) => x.jenis === 'gerbang-tebak')).toBe(false);
  });

  it('pembaca kartu memilih pengecoh → penyempurna Haiku dipanggil, pilihan diperiksa ulang kode', async () => {
    const { panggil, log } = palsu(true);
    const h = await jalankanPemanasanTemplat(TIRT, panggil);
    expect(h.percobaan[0]?.menolak.join(' ')).toMatch(/pembaca kartu 1/);
    expect(h.percobaan[0]?.penyempurnaan?.diterima.length).toBe(1);
    expect(log.filter((x) => x.jenis === 'sempurnakan-pilihan').map((x) => x.model)).toEqual(['anthropic/claude-haiku-4.5']);
    expect(h.lolos).toBe(true);
    expect(h.percobaan[1]?.varian['p1']).toBe('P1b');
  });
});
