/**
 * M2d-2 T-02: gerbang jawab-dengan-kartu.
 *
 * Dijaga: penjawab menerima kartu omongan itu (kalimat fakta dari paket) tetapi
 * TIDAK menerima kunci, penjelasan, tanda kartu penentu, atau `fact_id`; satu
 * panggilan, suhu 0; salah → tolak; jawaban tak terbaca → tolak.
 */
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import type { PesanChat } from './klien.ts';
import type { DrafSimulasi, OmonganDraf } from './draf.ts';
import { AKAR } from './env.ts';
import { SUHU_KARTU, gerbangKartu, kartuOmongan, uraiJawabanKartu } from './gerbang-kartu.ts';
import { soalTebak, type PanggilLlm } from './gerbang-tebak.ts';
import type { PaketFakta } from './paket.ts';
import type { JawabanModel, SetelanPanggil } from './susun.ts';

const PAKET = JSON.parse(readFileSync(`${AKAR}eval/keluaran-m2d/paket/tirt.json`, 'utf8')) as PaketFakta;
const DRAF = (
  JSON.parse(
    readFileSync(`${AKAR}eval/keluaran-m2d/sel-putaran2/tirt--deepseek_ai_DeepSeek_V4.1_Flash.json`, 'utf8'),
  ) as { draf: DrafSimulasi }
).draf;

function omongan(i: number): OmonganDraf {
  const o = DRAF.omongan[i];
  if (o === undefined) throw new Error('fixture');
  return o;
}

const jawab = (teks: string): JawabanModel => ({
  teks,
  token_masuk: 300,
  token_keluar: 60,
  latensi_ms: 5,
  finish_reason: 'stop',
  biaya_usd: 0.0002,
});

function palsu(jawaban: string[]): { panggil: PanggilLlm; rekaman: Array<{ pesan: PesanChat[]; setelan: SetelanPanggil }> } {
  const rekaman: Array<{ pesan: PesanChat[]; setelan: SetelanPanggil }> = [];
  return {
    rekaman,
    panggil: async (pesan, setelan) => {
      rekaman.push({ pesan: pesan.map((p) => ({ ...p })), setelan: { ...setelan } });
      return jawab(jawaban[rekaman.length - 1] ?? '');
    },
  };
}

describe('gerbang kartu — yang dikirim ke pembaca kartu', () => {
  it('pesan, SEMUA kartu omongan (kalimat faktanya), dan empat pilihan — satu panggilan, suhu 0', async () => {
    for (let i = 0; i < 3; i++) {
      const o = omongan(i);
      const { panggil, rekaman } = palsu([JSON.stringify({ pilihan: o.kunci, kartu: [1], alasan: 'x' })]);
      await gerbangKartu(o, PAKET, { panggil, putaran: 1, omongan: i + 1 });
      expect(rekaman).toHaveLength(1);
      expect(rekaman[0]?.setelan.suhu).toBe(SUHU_KARTU);
      expect(SUHU_KARTU).toBe(0);
      const teks = rekaman[0]?.pesan.map((p) => p.content).join('\n') ?? '';
      expect(rekaman[0]?.pesan).toHaveLength(2);
      for (const k of kartuOmongan(o, PAKET)) expect(teks).toContain(`Kartu ${String(k.no)} — ${k.kepala}: ${k.isi}`);
      expect(teks).toContain(soalTebak(o).pesan);
      for (const x of ['a', 'b', 'c', 'd'] as const) expect(teks).toContain(`${x}) ${soalTebak(o).pilihan[x]}`);
    }
  });

  it('tanpa kunci, penjelasan, tanda kartu penentu, fact_id, atau kartu dari omongan lain', async () => {
    for (let i = 0; i < 3; i++) {
      const o = omongan(i);
      const { panggil, rekaman } = palsu([JSON.stringify({ pilihan: 'a', kartu: [1] })]);
      await gerbangKartu(o, PAKET, { panggil, putaran: 1, omongan: i + 1 });
      const teks = rekaman[0]?.pesan.map((p) => p.content).join('\n') ?? '';
      for (const f of PAKET.fakta) {
        expect(teks, `fact_id ${f.fact_id}`).not.toContain(f.fact_id);
        if (!o.kartu.includes(f.fact_id)) expect(teks, `kartu lain ${f.fact_id}`).not.toContain(f.klaim);
      }
      const penjelasan = o.penjelasan.replace(/\[\[[^\]|]+\|([^\]]*)\]\]/g, '$1');
      expect(teks).not.toContain(penjelasan.slice(0, 60));
      expect(teks).not.toMatch(/salah-kaprah|kunci|penentu|jawaban(nya)? (benar|yang benar)/i);
    }
  });
});

describe('gerbang kartu — putusan', () => {
  const o = omongan(2); // kunci "b", kartu penentu volume-2025-12-10 (kartu 1)

  it('benar dan menunjuk kartu penentu → lolos', async () => {
    const p = await gerbangKartu(o, PAKET, {
      panggil: palsu([JSON.stringify({ pilihan: 'b', kartu: [1], alasan: 'volume hari ini nol' })]).panggil,
      putaran: 1,
      omongan: 3,
    });
    expect(p).toMatchObject({ lolos: true, pilihan: 'b', kartu_ditunjuk: ['volume-2025-12-10'], menunjuk_penentu: true, alasan: '' });
  });

  it('benar tetapi menunjuk kartu lain → tetap lolos (D-2 memutus dari jawaban), dicatat menunjuk_penentu=false', async () => {
    const p = await gerbangKartu(o, PAKET, {
      panggil: palsu([JSON.stringify({ pilihan: 'b', kartu: [3] })]).panggil,
      putaran: 1,
      omongan: 3,
    });
    expect(p).toMatchObject({ lolos: true, menunjuk_penentu: false });
  });

  it('salah → ditolak, umpan balik menyebut pilihannya, kunci, dan alasannya', async () => {
    const p = await gerbangKartu(o, PAKET, {
      panggil: palsu([JSON.stringify({ pilihan: 'c', kartu: [2], alasan: 'itu volume terakhir' })]).panggil,
      putaran: 2,
      omongan: 3,
    });
    expect(p.lolos).toBe(false);
    expect(p.alasan).toContain('memilih "c", padahal kunci "b"');
    expect(p.alasan).toContain('itu volume terakhir');
  });

  it('dua jawaban tak terbaca → ditolak (konservatif), dua panggilan', async () => {
    const { panggil, rekaman } = palsu(['entahlah', '{"pilihan":"x"}']);
    const p = await gerbangKartu(o, PAKET, { panggil, putaran: 1, omongan: 3 });
    expect(rekaman).toHaveLength(2);
    expect(p).toMatchObject({ lolos: false, pilihan: null });
  });

  it('uraiJawabanKartu', () => {
    expect(uraiJawabanKartu('{"pilihan":"D","kartu":["2",1],"alasan":"y"}')).toEqual({ pilihan: 'd', kartu: [2, 1], alasan: 'y' });
    expect(uraiJawabanKartu('{"kartu":[1]}')).toBeNull();
  });
});
