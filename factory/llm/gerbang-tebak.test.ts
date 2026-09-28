/**
 * M2d-2 T-01: gerbang tebak buta.
 *
 * Kegagalan yang dijaga (kontrak M2d-2): penebak diberi kartu/kunci secara tak
 * sengaja; penebak berbagi riwayat percakapan; kriteria K-05 yang melonggar;
 * penebak rusak yang meloloskan soal. Semua diperiksa pada ISI PESAN yang
 * benar-benar dikirim ke model palsu, dengan omongan dan paket fakta
 * sungguhan (draf DeepSeek × TIRT yang lolos validator di M2d-1, terlacak).
 */
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import type { PesanChat } from './klien.ts';
import type { DrafSimulasi, KunciOpsi, OmonganDraf } from './draf.ts';
import { AKAR } from './env.ts';
import {
  JUMLAH_PENEBAK,
  SUHU_TEBAK,
  gerbangTebak,
  soalTebak,
  uraiTebakan,
  type InfoPanggil,
  type PanggilLlm,
} from './gerbang-tebak.ts';
import type { PaketFakta } from './paket.ts';
import { promptSistem, type JawabanModel, type SetelanPanggil } from './susun.ts';

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

function jawab(teks: string): JawabanModel {
  return { teks, token_masuk: 80, token_keluar: 40, latensi_ms: 5, finish_reason: 'stop', biaya_usd: 0.0001 };
}

interface Rekaman {
  pesan: PesanChat[];
  setelan: SetelanPanggil;
  info: InfoPanggil;
}

function palsu(jawaban: string[]): { panggil: PanggilLlm; rekaman: Rekaman[] } {
  const rekaman: Rekaman[] = [];
  const panggil: PanggilLlm = async (pesan, setelan, info) => {
    // Salinan dalam: yang diperiksa adalah apa yang dikirim SAAT itu.
    rekaman.push({ pesan: pesan.map((p) => ({ ...p })), setelan: { ...setelan }, info: { ...info } });
    return jawab(jawaban[rekaman.length - 1] ?? '');
  };
  return { panggil, rekaman };
}

const tebak = (pilihan: KunciOpsi, yakin: number): string =>
  JSON.stringify({ pilihan, yakin, alasan: `kira-kira ${pilihan}` });

describe('gerbang tebak — penebak tidak pernah menerima kartu, fakta, kunci, atau penjelasan', () => {
  it('soalTebak hanya membawa nama, jam, pesan, pilihan — teks polos tanpa [[fact_id|…]]', () => {
    for (let i = 0; i < 3; i++) {
      const s = soalTebak(omongan(i));
      expect(Object.keys(s).sort()).toEqual(['jam', 'nama', 'pesan', 'pilihan']);
      expect(Object.keys(s.pilihan).sort()).toEqual(['a', 'b', 'c', 'd']);
      expect(JSON.stringify(s)).not.toContain('[[');
    }
  });

  it('isi pesan yang DIKIRIM ke ketiga penebak: tanpa fact_id, kalimat fakta, kunci, penjelasan, atau prompt penyusun', async () => {
    for (let i = 0; i < 3; i++) {
      const o = omongan(i);
      const { panggil, rekaman } = palsu([tebak('a', 50), tebak('b', 50), tebak('c', 50)]);
      await gerbangTebak(o, { panggil, putaran: 1, omongan: i + 1 });
      expect(rekaman).toHaveLength(JUMLAH_PENEBAK);
      for (const r of rekaman) {
        const teks = r.pesan.map((p) => p.content).join('\n');
        for (const f of PAKET.fakta) {
          expect(teks, `fact_id ${f.fact_id} bocor`).not.toContain(f.fact_id);
          expect(teks, `kalimat fakta ${f.fact_id} bocor`).not.toContain(f.klaim);
        }
        // Potongan penjelasan (tanpa rujukan) dan kalimat penutupnya.
        const penjelasan = o.penjelasan.replace(/\[\[[^\]|]+\|([^\]]*)\]\]/g, '$1');
        expect(teks).not.toContain(penjelasan.slice(0, 60));
        expect(teks).not.toContain('Salah-kaprah');
        expect(teks).not.toMatch(/kunci|kartu_penentu|penjelasan|"kartu"/i);
        expect(teks).not.toContain(promptSistem().slice(0, 80));
        // Yang memang harus ada: pesan teman dan keempat pilihan polos.
        expect(teks).toContain(soalTebak(o).pesan);
        for (const k of ['a', 'b', 'c', 'd'] as const) expect(teks).toContain(`${k}) ${soalTebak(o).pilihan[k]}`);
      }
    }
  });

  it('tiap penebak = percakapan baru: dua pesan (sistem + pengguna), larik tidak dipakai bersama, suhu 1,0', async () => {
    const dilihat: PesanChat[][] = [];
    const panggil: PanggilLlm = async (pesan, setelan) => {
      dilihat.push(pesan);
      expect(setelan.suhu).toBe(SUHU_TEBAK);
      // Penebak yang "menulis balik" ke lariknya tidak boleh terlihat penebak berikutnya.
      const panjang = pesan.length;
      pesan.push({ role: 'assistant', content: tebak('a', 90) });
      expect(panjang).toBe(2);
      return jawab(tebak('b', 30));
    };
    await gerbangTebak(omongan(0), { panggil, putaran: 1, omongan: 1 });
    expect(dilihat).toHaveLength(3);
    expect(new Set(dilihat).size).toBe(3);
    expect(SUHU_TEBAK).toBe(1);
  });
});

describe('gerbang tebak — kriteria K-05 (sama dengan laporan M2d-1)', () => {
  const o = omongan(0); // kunci "a"

  it('0/3 benar → lolos', async () => {
    const { panggil } = palsu([tebak('b', 80), tebak('c', 70), tebak('d', 90)]);
    const p = await gerbangTebak(o, { panggil, putaran: 1, omongan: 1 });
    expect(p).toMatchObject({ lolos: true, benar: 0, yakin_benar: null, alasan: '' });
  });

  it('1/3 benar dengan keyakinan 35 → lolos; dengan 40 → ditolak', async () => {
    const a = await gerbangTebak(o, { panggil: palsu([tebak('a', 35), tebak('c', 70), tebak('d', 60)]).panggil, putaran: 1, omongan: 1 });
    expect(a).toMatchObject({ lolos: true, benar: 1, yakin_benar: 35 });
    const b = await gerbangTebak(o, { panggil: palsu([tebak('a', 40), tebak('c', 70), tebak('d', 60)]).panggil, putaran: 1, omongan: 1 });
    expect(b).toMatchObject({ lolos: false, benar: 1, yakin_benar: 40 });
  });

  it('2/3 benar → ditolak walau yakinnya rendah; umpan balik menyebut kunci, tebakan, dan aturan', async () => {
    const p = await gerbangTebak(o, { panggil: palsu([tebak('a', 10), tebak('a', 10), tebak('d', 60)]).panggil, putaran: 2, omongan: 1 });
    expect(p.lolos).toBe(false);
    expect(p.benar).toBe(2);
    expect(p.alasan).toContain('2/3 penebak TANPA kartu memilih kunci "a"');
    expect(p.alasan).toContain('a/10, a/10, d/60');
    expect(p.alasan).toContain('melawan dugaan pertama');
  });
});

describe('gerbang tebak — penebak yang rusak tidak pernah meloloskan soal', () => {
  const o = omongan(1); // kunci "d"

  it('jawaban tak terbaca diulang sekali dengan panggilan baru', async () => {
    const { panggil, rekaman } = palsu(['maaf, saya tidak bisa', tebak('b', 50), tebak('c', 50), tebak('a', 50)]);
    const p = await gerbangTebak(o, { panggil, putaran: 1, omongan: 2 });
    expect(rekaman).toHaveLength(4);
    expect(rekaman[1]?.info).toMatchObject({ ke: 1, ulang: 1 });
    expect(p.tebakan[0]).toMatchObject({ pilihan: 'b', terbaca: true });
    expect(p.lolos).toBe(true);
  });

  it('dua kali tak terbaca → dihitung BENAR dengan keyakinan 100 (menolak, bukan meloloskan)', async () => {
    const { panggil } = palsu(['{"pilihan":"z"}', 'bukan json', tebak('b', 20), tebak('c', 20)]);
    const p = await gerbangTebak(o, { panggil, putaran: 1, omongan: 2 });
    expect(p.tebakan[0]).toMatchObject({ pilihan: 'd', yakin: 100, benar: true, terbaca: false });
    expect(p.lolos).toBe(false);
  });

  it('uraiTebakan: pilihan a–d, yakin 0–100, pagar kode dibuang', () => {
    expect(uraiTebakan('```json\n{"pilihan":"B","yakin":45,"alasan":"x"}\n```')).toEqual({ pilihan: 'b', yakin: 45, alasan: 'x' });
    expect(uraiTebakan('{"pilihan":"b","yakin":140}')).toBeNull();
    expect(uraiTebakan('{"pilihan":"e","yakin":40}')).toBeNull();
  });
});
