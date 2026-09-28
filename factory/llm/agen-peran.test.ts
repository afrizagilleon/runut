/**
 * M2d-3 T-01: peran di lingkar agen (`factory/llm/peran.md`).
 *
 * Paket dan draf sungguhan (TIRT, terlacak dari M2d-1), validator sungguhan;
 * hanya model yang dipalsukan. Yang dijaga:
 * - model per peran datang dari kode (`MODEL_PERAN`): kritikus GLM-5.3, lainnya DeepSeek;
 * - isi pesan yang benar-benar dikirim ke tiap peran sesuai `peran.md`;
 * - tidak ada peran yang bisa meloloskan sendirian (`putusanAkhir`);
 * - kritikus tidak bisa menulis ulang dan tidak bisa meloloskan lewat medan lain;
 * - kritikus yang terpotong / tak terbaca / galat = keberatan, diulang sekali.
 */
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { MAX_TOKENS_PENEBAK_PERAN, PETUNJUK_PENEBAK_PERAN, jalankanPeran, promptPenulis, putusanAkhir, type HasilPeran, type InfoPeran, type PanggilPeran, type SuaraPenilai } from './agen-peran.ts';
import type { DrafSimulasi, KunciOpsi, OmonganDraf } from './draf.ts';
import { AKAR } from './env.ts';
import { PETUNJUK_PENEBAK } from './gerbang-tebak.ts';
import { PETUNJUK_PENJAWAB } from './gerbang-kartu.ts';
import { PencatatJejak, validasiJejak } from './jejak.ts';
import type { PesanChat } from './klien.ts';
import { GalatLlm } from './klien.ts';
import { KEBERATAN_TIDAK_MENJAWAB, MAX_TOKENS_KRITIKUS, promptKritikus, uraiKritik } from './kritikus.ts';
import { MODEL_AGEN, MODEL_KRITIKUS } from './model.ts';
import { PaguTercapai } from './pagu.ts';
import type { PaketFakta } from './paket.ts';
import { pesanPaket, type JawabanModel, type SetelanPanggil } from './susun.ts';
import { validasiDraf } from './validasi.ts';
import { rencanaSudut, type Sudut } from './sudut.ts';

const PAKET = JSON.parse(readFileSync(`${AKAR}eval/keluaran-m2d/paket/tirt.json`, 'utf8')) as PaketFakta;
const DRAF = (
  JSON.parse(readFileSync(`${AKAR}eval/keluaran-m2d/sel-putaran2/tirt--deepseek_ai_DeepSeek_V4.1_Flash.json`, 'utf8')) as {
    draf: DrafSimulasi;
  }
).draf;
const om = (no: number): OmonganDraf => JSON.parse(JSON.stringify(DRAF.omongan[no - 1])) as OmonganDraf;
const KUNCI = [om(1).kunci, om(2).kunci, om(3).kunci];
const lain = (k: KunciOpsi): KunciOpsi => (k === 'a' ? 'c' : 'a');
/**
 * Sudut untuk tes: tiga yang pertama = kartu penentu draf fixture (supaya
 * fixture memenuhi pemeriksa SUDUT), sisanya dari perencana sungguhan.
 */
const SUDUT_FIXTURE: Sudut[] = (() => {
  const awal = [1, 2, 3].map((no) => om(no).kartu_penentu[0] as string);
  const semua = rencanaSudut(PAKET);
  return [...awal.map((id) => semua.find((x) => x.fact_id === id) as Sudut), ...semua.filter((x) => !awal.includes(x.fact_id))];
})();

interface Rekaman {
  pesan: PesanChat[];
  setelan: SetelanPanggil;
  info: InfoPeran;
}

interface Skenario {
  tertebak?: (no: number, putaran: number) => boolean;
  /** Jawaban kritikus (teks + finish_reason), atau galat yang dilempar. */
  kritikus?: (no: number, putaran: number, ulang: number) => { teks: string; finish?: string } | Error;
  /** Keluaran penulis pengganti untuk (omongan, putaran); bawaan: omongan fixture. */
  penulis?: (no: number, putaran: number) => string | undefined;
}

const TANPA_KEBERATAN = JSON.stringify({ keberatan: [], arahan: '' });

function palsu(s: Skenario): { panggil: PanggilPeran; rekaman: Rekaman[] } {
  const rekaman: Rekaman[] = [];
  const panggil: PanggilPeran = async (pesan, setelan, info) => {
    rekaman.push({ pesan: pesan.map((p) => ({ ...p })), setelan: { ...setelan }, info: { ...info } });
    const j = (teks: string, finish = 'stop'): JawabanModel => ({
      teks, token_masuk: 1000, token_keluar: 500, latensi_ms: 3, finish_reason: finish, biaya_usd: 0.001,
    });
    const no = info.omongan ?? 0;
    if (info.jenis === 'susun' || info.jenis === 'tulis-ulang') {
      const ganti = s.penulis?.(no, info.putaran);
      if (ganti !== undefined) return j(ganti);
      return j(JSON.stringify({ lolos: true, jejak: ['semua lolos'], omongan: [{ no, ...om(no) }] }));
    }
    const kunci = KUNCI[no - 1] ?? 'a';
    if (info.jenis === 'gerbang-kartu') return j(JSON.stringify({ pilihan: kunci, kartu: [1], alasan: 'dari kartu 1' }));
    if (info.jenis === 'gerbang-tebak') {
      const kena = s.tertebak?.(no, info.putaran) ?? false;
      return j(JSON.stringify({ pilihan: kena ? kunci : lain(kunci), yakin: 60, alasan: 'nadanya' }));
    }
    const k = s.kritikus?.(no, info.putaran, info.ulang ?? 0) ?? { teks: TANPA_KEBERATAN };
    if (k instanceof Error) throw k;
    return j(k.teks, k.finish ?? 'stop');
  };
  return { panggil, rekaman };
}

async function jalan(
  s: Skenario,
  maksPutaran?: number,
  sudut: Sudut[] = SUDUT_FIXTURE,
): Promise<{ hasil: HasilPeran; rekaman: Rekaman[]; jejak: PencatatJejak }> {
  const { panggil, rekaman } = palsu(s);
  const jam = (): Date => new Date('2026-09-28T00:00:00Z');
  const jejak = new PencatatJejak({
    paket: PAKET, model: MODEL_AGEN, promptSistem: promptPenulis(), pesanPaket: pesanPaket(PAKET), ringkasanPrompt: 'uji',
    jalur: null, jam, versi: 2, dibuatOleh: 'factory/llm/agen-peran.ts',
    modelPeran: { penulis: MODEL_AGEN, penebak: MODEL_AGEN, 'pembaca-kartu': MODEL_AGEN, kritikus: MODEL_KRITIKUS },
  });
  const hasil = await jalankanPeran({
    paket: PAKET, panggil, validasi: validasiDraf, jam, jejak, rencanaSudut: sudut, ...(maksPutaran === undefined ? {} : { maksPutaran }),
  });
  return { hasil, rekaman, jejak };
}

const dari = (r: Rekaman[], peran: InfoPeran['peran']): Rekaman[] => r.filter((x) => x.info.peran === peran);
const semuaTeks = (r: Rekaman): string => r.pesan.map((p) => p.content).join('\n');

describe('peran — model dan urutan ditetapkan kode', () => {
  it('fixture: draf TIRT M2d-1 lolos validator sungguhan', () => {
    expect(validasiDraf(DRAF, PAKET)).toEqual([]);
  });

  it('semua lolos di putaran 1: penulis ×3, lalu per omongan pembaca kartu → penebak ×3 → kritikus; kritikus GLM, lainnya DeepSeek', async () => {
    const { hasil, rekaman } = await jalan({});
    expect(hasil).toMatchObject({ lolos: true, jumlah_putaran: 1, berhenti: null });
    expect(hasil.draf).toEqual(DRAF);
    expect(rekaman.map((r) => `${r.info.peran}:${String(r.info.omongan)}`)).toEqual([
      'penulis:1', 'penulis:2', 'penulis:3',
      ...[1, 2, 3].flatMap((no) => [`pembaca-kartu:${no}`, `penebak:${no}`, `penebak:${no}`, `penebak:${no}`, `kritikus:${no}`]),
    ]);
    for (const r of rekaman) expect(r.info.model).toBe(r.info.peran === 'kritikus' ? MODEL_KRITIKUS : MODEL_AGEN);
    expect(dari(rekaman, 'kritikus').every((r) => r.setelan.maxTokens === MAX_TOKENS_KRITIKUS)).toBe(true);
    expect(dari(rekaman, 'penebak').every((r) => r.setelan.maxTokens === MAX_TOKENS_PENEBAK_PERAN && r.setelan.suhu === 1)).toBe(true);
    expect(hasil.riwayat[0]?.omongan.map((o) => o.suara)).toEqual(
      Array.from({ length: 3 }, () => ({ pemeriksa: true, kartu: true, tebak: true, kritikus: true })),
    );
  });

  it('peran berikutnya tidak dipanggil bila penilai sebelumnya keberatan: tertebak → kritikus tidak dipanggil', async () => {
    const { hasil, rekaman } = await jalan({ tertebak: (no, p) => no === 2 && p === 1 });
    expect(dari(rekaman, 'kritikus').filter((r) => r.info.putaran === 1).map((r) => r.info.omongan)).toEqual([1, 3]);
    expect(hasil.riwayat[0]?.omongan[1]).toMatchObject({ status: 'ditolak-tebak', suara: { pemeriksa: true, kartu: true, tebak: false, kritikus: null } });
    expect(hasil).toMatchObject({ lolos: true, jumlah_putaran: 2 });
  });
});

describe('peran — isi pesan yang dikirim ke tiap peran (peran.md)', () => {
  it('penebak: hanya pesan + pertanyaan + empat pilihan — tanpa kartu, fact_id, kunci, penjelasan, contoh gaya, atau kritikus', async () => {
    const { rekaman } = await jalan({});
    const tebak = dari(rekaman, 'penebak');
    expect(tebak).toHaveLength(9);
    for (const r of tebak) {
      expect(r.pesan).toHaveLength(2);
      expect(r.pesan[0]?.content).toBe(PETUNJUK_PENEBAK_PERAN);
      const t = semuaTeks(r);
      for (const f of PAKET.fakta) {
        expect(t).not.toContain(f.fact_id);
        expect(t).not.toContain(f.klaim);
      }
      for (const no of [1, 2, 3]) expect(t).not.toContain(om(no).penjelasan.slice(0, 40));
      expect(t).not.toMatch(/KUNCI|kunci:|PENENTU|Salah-kaprah|kritikus|keberatan|contoh gaya/i);
    }
  });

  it('pembaca kartu: pesan + kartu + pilihan, tanpa kunci, penjelasan, tanda penentu, atau fact_id', async () => {
    const { rekaman } = await jalan({});
    const kartu = dari(rekaman, 'pembaca-kartu');
    expect(kartu).toHaveLength(3);
    for (const [i, r] of kartu.entries()) {
      expect(r.pesan[0]?.content).toBe(PETUNJUK_PENJAWAB);
      const t = semuaTeks(r);
      const o = om(i + 1);
      for (const id of o.kartu) expect(t).toContain(PAKET.fakta.find((f) => f.fact_id === id)?.klaim ?? '?');
      for (const f of PAKET.fakta) expect(t).not.toContain(f.fact_id);
      expect(t).not.toContain(o.penjelasan.slice(0, 40));
      expect(t).not.toMatch(/KUNCI|PENENTU|Salah-kaprah|kritikus/);
    }
  });

  it('kritikus: melihat semua — kunci, isi kartu + tanda penentu, penjelasan, jawaban pembaca kartu, tebakan', async () => {
    const { rekaman } = await jalan({});
    const kr = dari(rekaman, 'kritikus');
    expect(kr).toHaveLength(3);
    for (const [i, r] of kr.entries()) {
      expect(r.pesan[0]?.content).toBe(promptKritikus());
      const t = r.pesan[1]?.content ?? '';
      const o = om(i + 1);
      expect(t).toContain(`KUNCI: ${o.kunci}`);
      for (const id of o.kartu) expect(t).toContain(PAKET.fakta.find((f) => f.fact_id === id)?.klaim ?? '?');
      expect(t).toContain('[KARTU PENENTU]');
      expect(t).toContain('Salah-kaprah yang umum');
      expect(t).toContain(`memilih "${o.kunci}"`);
      expect(t).toMatch(/tiga penebak TANPA kartu memilih: [abcd] \(yakin 60\)/);
    }
  });

  it('penulis: paket fakta + umpan balik bertanda sumbernya; keberatan dan arahan kritikus sampai ke penulis, prompt peran lain tidak', async () => {
    const keberatan = JSON.stringify({
      keberatan: [{ jenis: 'makna', bagian: 'pesan', alasan: 'kata "rame" tidak cocok dengan kartu volume' }],
      arahan: 'Ubah klaim teman supaya kuncinya hanya bisa diputus kartu volume.',
    });
    const { rekaman } = await jalan({ kritikus: (no, p) => (no === 3 && p === 1 ? { teks: keberatan } : { teks: TANPA_KEBERATAN }) });
    const penulis = dari(rekaman, 'penulis');
    for (const r of penulis) {
      expect(r.pesan[0]?.content).toBe(promptPenulis());
      expect(r.pesan[1]?.content).toContain(pesanPaket(PAKET));
      const t = semuaTeks(r);
      expect(t).not.toContain(promptKritikus().slice(0, 80));
      expect(t).not.toContain(PETUNJUK_PENEBAK.slice(0, 80));
      expect(t).not.toContain(PETUNJUK_PENJAWAB.slice(0, 80));
    }
    const ulang = penulis.filter((r) => r.info.putaran === 2);
    expect(ulang.map((r) => r.info.omongan)).toEqual([3]);
    const t = ulang[0]?.pesan[1]?.content ?? '';
    expect(t).toContain('- [kritikus: makna, pesan] kata "rame" tidak cocok dengan kartu volume');
    expect(t).toContain('- [kritikus: arahan] Ubah klaim teman supaya kuncinya hanya bisa diputus kartu volume.');
  });
});

describe('peran — pemeriksa: gerbang G dan petunjuk berhitung penebak (D-2)', () => {
  it('petunjuk penebak M2d-3 = petunjuk M2d-2 + satu kalimat berhitung; bentuk jawaban JSON tetap di baris terakhir', () => {
    expect(PETUNJUK_PENEBAK_PERAN).toContain('coba hitung dari angka yang ada di pesan dan pilihan');
    expect(PETUNJUK_PENEBAK_PERAN.split('\n').at(-1)).toBe(PETUNJUK_PENEBAK.split('\n').at(-1));
    expect(PETUNJUK_PENEBAK_PERAN.split('\n')).toHaveLength(PETUNJUK_PENEBAK.split('\n').length + 1);
  });

  it('omongan yang kuncinya bisa dihitung ditolak PEMERIKSA sebelum peran model mana pun dipanggil', async () => {
    const bocor = { ...om(1), pesan: 'Harga dari 48 ke 106 dalam sembilan hari, berarti naik 2,21 kali lipat lho.',
      angka_pesan: [{ teks: '48', fact_id: 'harga-2025-11-26' }, { teks: '106', fact_id: 'harga-2025-12-09' }, { teks: '2,21', fact_id: 'kelipatan-2025-11-26-2025-12-09' }],
      kartu: ['kelipatan-2025-11-26-2025-12-09', 'harga-2025-11-26', 'harga-2025-12-09'], kartu_penentu: ['kelipatan-2025-11-26-2025-12-09'],
      pilihan: {
        a: 'Betul, sebab [[harga-2025-12-09|106]] memang [[kelipatan-2025-11-26-2025-12-09|2,21 kali]] [[harga-2025-11-26|48]].',
        b: 'Keliru, kenaikannya cuma [[misal|2,21 persen]] dari [[harga-2025-11-26|48]].',
        c: 'Betul, tapi setopnya karena keraguan kelangsungan usahanya.',
        d: 'Keliru, harganya justru turun selama sembilan hari itu.',
      },
      kunci: 'a' as KunciOpsi,
      penjelasan: 'Harga [[harga-2025-12-09|106 rupiah]] itu [[kelipatan-2025-11-26-2025-12-09|2,21 kali]] harga [[harga-2025-11-26|48 rupiah]]. Salah-kaprah yang umum: kali disamakan dengan persen.' };
    const { panggil, rekaman } = palsu({});
    const bungkus: PanggilPeran = async (pesan, setelan, info) => {
      if (info.peran === 'penulis' && info.omongan === 1 && info.putaran === 1) {
        rekaman.push({ pesan, setelan, info });
        return { teks: JSON.stringify({ omongan: [{ no: 1, ...bocor }] }), token_masuk: 1, token_keluar: 1, latensi_ms: 1, finish_reason: 'stop', biaya_usd: 0.001 };
      }
      return panggil(pesan, setelan, info);
    };
    const hasil = await jalankanPeran({ paket: PAKET, panggil: bungkus, validasi: validasiDraf, jam: () => new Date('2026-09-28T00:00:00Z'), rencanaSudut: SUDUT_FIXTURE });
    expect(validasiDraf({ omongan: [bocor, om(2), om(3)] }, PAKET)).toEqual([]);
    const o1 = hasil.riwayat[0]?.omongan[0];
    expect(o1).toMatchObject({ status: 'ditolak-pemeriksa', suara: { pemeriksa: false, kartu: null, tebak: null, kritikus: null } });
    expect(o1?.umpan.join('\n')).toContain('[pemeriksa: G-angka-cukup] Pilihan kunci a bisa dihitung');
    expect(rekaman.filter((r) => r.info.putaran === 1 && r.info.omongan === 1 && r.info.peran !== 'penulis')).toHaveLength(0);
    expect(hasil.lolos).toBe(true);
  });
});

describe('peran — jejak', () => {
  it('setiap langkah membawa perannya; langkah kritikus mencatat keberatan, arahan, terpotong, token, biaya; sah menurut skema', async () => {
    const keberatan = JSON.stringify({ keberatan: [{ jenis: 'ambigu', bagian: 'pilihan', alasan: 'a dan c nyaris sama' }], arahan: 'Bedakan a dan c.' });
    const { jejak } = await jalan({ kritikus: (no, p) => (no === 1 && p === 1 ? { teks: keberatan } : { teks: TANPA_KEBERATAN }) });
    const j = jejak.jejak();
    expect(validasiJejak(j)).toEqual([]);
    expect(j).toMatchObject({ versi: 2, dibuat_oleh: 'factory/llm/agen-peran.ts', model_peran: { kritikus: MODEL_KRITIKUS } });
    expect(j.langkah.every((l) => l.peran !== undefined)).toBe(true);
    const kr = j.langkah.filter((l) => l.jenis === 'kritikus');
    expect(kr.every((l) => l.peran === 'kritikus' && l.model === MODEL_KRITIKUS && l.panggilan === 1 && l.biaya_usd > 0 && l.token_keluar > 0)).toBe(true);
    expect(kr[0]).toMatchObject({
      putaran: 1, omongan: 1, putusan: 'tolak',
      rincian: { menjawab: true, terpotong: false, keberatan: [{ jenis: 'ambigu', bagian: 'pilihan', alasan: 'a dan c nyaris sama' }], arahan: 'Bedakan a dan c.' },
    });
    expect(new Set(j.langkah.map((l) => `${l.jenis}:${String(l.peran)}`))).toEqual(
      new Set(['rencana-sudut:perencana', 'susun:penulis', 'tulis-ulang:penulis', 'validator:pemeriksa', 'gerbang-g:pemeriksa', 'gerbang-kartu:pembaca-kartu', 'gerbang-tebak:penebak', 'kritikus:kritikus']),
    );
  });
});

describe('peran — tidak ada yang bisa meloloskan sendirian', () => {
  const SEMUA: Array<boolean | null> = [true, false, null];

  it('putusanAkhir: lolos HANYA bila keempat penilai true (81 kombinasi)', () => {
    let lolos = 0;
    for (const pemeriksa of [true, false]) {
      for (const kartu of SEMUA) for (const tebak of SEMUA) for (const kritikus of SEMUA) {
        const s: SuaraPenilai = { pemeriksa, kartu, tebak, kritikus };
        const hasil = putusanAkhir(s);
        expect(hasil, JSON.stringify(s)).toBe(pemeriksa && kartu === true && tebak === true && kritikus === true);
        if (hasil) lolos += 1;
      }
    }
    expect(lolos).toBe(1);
    expect(putusanAkhir({ pemeriksa: false, kartu: null, tebak: null, kritikus: true })).toBe(false);
    expect(putusanAkhir({ pemeriksa: true, kartu: true, tebak: false, kritikus: true })).toBe(false);
  });

  it('kritikus yang mengirim "lolos": true dan versi omongan baru tetap keberatan; draf tidak berubah; medan itu dicatat diabaikan', async () => {
    const tulisUlang = JSON.stringify({
      lolos: true,
      putusan: 'lolos',
      omongan: { ...om(1), pesan: 'Versi kritikus yang lebih baik.' },
      keberatan: [{ jenis: 'bahasa', bagian: 'pesan', alasan: 'terlalu kaku' }],
      arahan: 'Pakai bahasa obrolan.',
    });
    const { hasil, rekaman } = await jalan({ kritikus: (no, p) => (no === 1 && p === 1 ? { teks: tulisUlang } : { teks: TANPA_KEBERATAN }) });
    const o1 = hasil.riwayat[0]?.omongan[0];
    expect(o1).toMatchObject({ status: 'ditolak-kritikus', suara: { kritikus: false } });
    expect(o1?.kritik?.diabaikan.sort()).toEqual(['lolos', 'omongan', 'putusan']);
    expect(hasil.riwayat[0]?.draf[0]).toEqual(om(1));
    // Putaran 2: omongan 1 ditulis ulang oleh PENULIS, bukan diambil dari kritikus.
    expect(dari(rekaman, 'penulis').filter((r) => r.info.putaran === 2).map((r) => r.info.omongan)).toEqual([1]);
    expect(hasil.draf?.omongan[0]?.pesan).toBe(om(1).pesan);
  });

  it('kritikus tanpa keberatan tidak menyelamatkan omongan yang tertebak (kritikus bahkan tidak dipanggil)', async () => {
    const { hasil, rekaman } = await jalan({ tertebak: () => true, kritikus: () => ({ teks: JSON.stringify({ keberatan: [], arahan: '', lolos: true }) }) }, 2);
    expect(dari(rekaman, 'kritikus')).toHaveLength(0);
    expect(hasil.lolos).toBe(false);
    expect(hasil.riwayat.flatMap((r) => r.omongan.map((o) => o.status))).toEqual(Array.from({ length: 6 }, () => 'ditolak-tebak'));
  });
});

describe('peran — kritikus yang tidak menjawab adalah keberatan', () => {
  it('terpotong dua kali (walau potongannya JSON sah) → keberatan "tidak menjawab"; versi dibawa tanpa ditulis ulang; putaran berikut kritikus menjawab → lolos', async () => {
    const { hasil, rekaman } = await jalan({
      kritikus: (no, p) => (no === 2 && p === 1 ? { teks: TANPA_KEBERATAN, finish: 'length' } : { teks: TANPA_KEBERATAN }),
    });
    const o2 = hasil.riwayat[0]?.omongan[1];
    expect(o2).toMatchObject({ status: 'kritikus-tidak-menjawab', dibawa: true, suara: { kritikus: false } });
    expect(o2?.kritik).toMatchObject({ menjawab: false, terpotong: true, tanpa_keberatan: false });
    expect(o2?.kritik?.keberatan).toEqual([{ jenis: 'tidak-menjawab', bagian: '-', alasan: KEBERATAN_TIDAK_MENJAWAB }]);
    expect(dari(rekaman, 'kritikus').filter((r) => r.info.putaran === 1 && r.info.omongan === 2).map((r) => r.info.ulang)).toEqual([0, 1]);
    // Putaran 2: penulis TIDAK dipanggil untuk omongan 2; versi yang sama melewati semua penilai lagi.
    expect(dari(rekaman, 'penulis').filter((r) => r.info.putaran === 2)).toHaveLength(0);
    expect(hasil.riwayat[1]).toMatchObject({ ditulis: [], dibawa: [2] });
    expect(dari(rekaman, 'pembaca-kartu').filter((r) => r.info.putaran === 2).map((r) => r.info.omongan)).toEqual([2]);
    expect(hasil).toMatchObject({ lolos: true, jumlah_putaran: 2 });
  });

  it('tak terbaca sekali lalu menjawab → satu ulang, jawabannya dipakai', async () => {
    const { hasil, rekaman } = await jalan({
      kritikus: (no, p, u) => (no === 1 && p === 1 && u === 0 ? { teks: 'Menurut saya soal ini sudah baik.' } : { teks: TANPA_KEBERATAN }),
    });
    expect(dari(rekaman, 'kritikus').filter((r) => r.info.omongan === 1).map((r) => r.info.ulang)).toEqual([0, 1]);
    expect(hasil).toMatchObject({ lolos: true, jumlah_putaran: 1 });
  });

  it('galat penyedia dua kali → keberatan "tidak menjawab", bukan lolos dan bukan henti', async () => {
    const { hasil } = await jalan({
      kritikus: (no, p) => (no === 3 && p === 1 ? new GalatLlm('HTTP 200 tanpa choices', 200) : { teks: TANPA_KEBERATAN }),
    });
    expect(hasil.riwayat[0]?.omongan[2]).toMatchObject({ status: 'kritikus-tidak-menjawab', kritik: { menjawab: false, galat: [expect.stringContaining('tanpa choices'), expect.stringContaining('tanpa choices')] } });
    expect(hasil).toMatchObject({ lolos: true, jumlah_putaran: 2 });
  });

  it('PaguTercapai di kritikus menghentikan lingkar seketika', async () => {
    const { hasil, rekaman } = await jalan({ kritikus: () => new PaguTercapai(1.99, 0.05, 2, MODEL_KRITIKUS) });
    expect(hasil.lolos).toBe(false);
    expect(hasil.berhenti).toMatch(/^pagu tercapai/);
    expect(rekaman.at(-1)?.info.peran).toBe('kritikus');
    expect(rekaman.filter((r) => r.info.peran === 'kritikus')).toHaveLength(1);
  });

  it('uraiKritik: hanya keberatan + arahan yang dibaca; bentuk tanpa larik keberatan = tak terbaca', () => {
    expect(uraiKritik('{"lolos": true}')).toBeNull();
    expect(uraiKritik('bukan json')).toBeNull();
    const u = uraiKritik(JSON.stringify({ keberatan: [{ jenis: 'KUNCI', bagian: 'kunci', alasan: 'x'.repeat(500) }], arahan: 'y'.repeat(900), pesan_baru: 'z' }));
    expect(u?.keberatan[0]?.jenis).toBe('kunci');
    expect(u?.keberatan[0]?.alasan.length).toBeLessThanOrEqual(300);
    expect(u?.arahan.length).toBeLessThanOrEqual(400);
    expect(u?.diabaikan).toEqual(['pesan_baru']);
    expect(uraiKritik(JSON.stringify({ keberatan: [{ jenis: 'tidak-menjawab', alasan: 'palsu' }] }))?.keberatan[0]?.jenis).toBe('lain');
  });
});

describe('sudut — buang & coba sudut lain (D-4)', () => {
  const tulisPenulis = (r: Rekaman[], no: number): Rekaman[] => dari(r, 'penulis').filter((x) => x.info.omongan === no);

  it('penulis menerima sudutnya; omongan yang kartu penentunya tidak memuat sudut ditolak PEMERIKSA', async () => {
    const tukar = [SUDUT_FIXTURE[1] as Sudut, SUDUT_FIXTURE[0] as Sudut, ...SUDUT_FIXTURE.slice(2)];
    const { hasil, rekaman } = await jalan({}, 1, tukar);
    expect(tulisPenulis(rekaman, 1)[0]?.pesan[1]?.content).toContain(`kartu_penentu HARUS memuat "${tukar[0]?.fact_id ?? ''}"`);
    const o1 = hasil.riwayat[0]?.omongan[0];
    expect(o1?.status).toBe('ditolak-pemeriksa');
    expect(o1?.umpan.join('\n')).toContain(`[pemeriksa: SUDUT] kartu_penentu omongan ini harus memuat "${tukar[0]?.fact_id ?? ''}"`);
    expect(hasil.riwayat[0]?.omongan[2]?.status).toBe('lolos');
  });

  it('gagal 5 putaran → versi dibuang, sudut berikutnya yang belum dipakai; penulis mulai dari nol dan diberi tahu sudut yang dibuang', async () => {
    const sudut: Sudut[] = [SUDUT_FIXTURE[0] as Sudut, { fact_id: 'hari-naik-beruntun', topik: 'harga' }, SUDUT_FIXTURE[2] as Sudut, SUDUT_FIXTURE[1] as Sudut];
    const { hasil, rekaman, jejak } = await jalan({}, undefined, sudut);
    expect(hasil).toMatchObject({ lolos: true, jumlah_putaran: 6, berhenti: null });
    expect(hasil.sudut[1]).toEqual([
      { ke: 1, fact_id: 'hari-naik-beruntun', topik: 'harga', putaran_mulai: 1, putaran_akhir: 5, hasil: 'dibuang' },
      { ke: 2, fact_id: 'susp-2025-01-21', topik: 'suspensi', putaran_mulai: 6, putaran_akhir: 6, hasil: 'lolos' },
    ]);
    const p2 = tulisPenulis(rekaman, 2);
    expect(p2.map((r) => r.info.putaran)).toEqual([1, 2, 3, 4, 5, 6]);
    const t6 = p2[5]?.pesan[1]?.content ?? '';
    expect(t6).toContain('SUDUT OMONGAN INI (sudut ke-2, dari perencana): kartu_penentu HARUS memuat "susp-2025-01-21"');
    expect(t6).toContain('Sudut yang sudah dibuang untuk posisi ini (gagal 5 putaran; jangan dipakai sebagai penentu): hari-naik-beruntun.');
    expect(t6).not.toContain('Versi sebelumnya omongan 2 DITOLAK');
    expect(p2[4]?.pesan[1]?.content).toContain('Versi sebelumnya omongan 2 DITOLAK');
    expect(hasil.riwayat[4]?.dibuang).toEqual([{ no: 2, ke: 1, fact_id: 'hari-naik-beruntun', pengganti: 'susp-2025-01-21' }]);
    const buang = jejak.jejak().langkah.filter((l) => l.jenis === 'buang-sudut');
    expect(buang).toHaveLength(1);
    expect(buang[0]).toMatchObject({ putaran: 5, omongan: 2, peran: 'perencana', rincian: { sudut_dibuang: { ke: 1, fact_id: 'hari-naik-beruntun' }, sudut_baru: { fact_id: 'susp-2025-01-21' } } });
    expect(validasiJejak(jejak.jejak())).toEqual([]);
  });

  it('versi yang dibuang tidak pernah diperiksa lagi: penulis sudut baru gagal menulis → "tidak-ada", bukan versi lama', async () => {
    const sudut: Sudut[] = [SUDUT_FIXTURE[0] as Sudut, { fact_id: 'hari-naik-beruntun', topik: 'harga' }, SUDUT_FIXTURE[2] as Sudut, SUDUT_FIXTURE[1] as Sudut];
    const { hasil, rekaman } = await jalan({ penulis: (no, p) => (no === 2 && p === 6 ? 'bukan json' : undefined) }, undefined, sudut);
    expect(hasil.riwayat[5]?.omongan[1]).toMatchObject({ status: 'tidak-ada', g: null });
    expect(hasil.riwayat[5]?.draf[1]).toBeNull();
    expect(dari(rekaman, 'pembaca-kartu').filter((r) => r.info.putaran === 6)).toHaveLength(0);
    expect(dari(rekaman, 'penulis').filter((r) => r.info.putaran === 7 && r.info.omongan === 2)[0]?.pesan[1]?.content).toContain('- omongan 1 (TERKUNCI)');
    expect(hasil).toMatchObject({ lolos: true, jumlah_putaran: 7 });
  });

  it('paling banyak 3 sudut × 5 putaran per posisi: tetap gagal → simulasi TIDAK TERBIT sesudah putaran 15', async () => {
    const { hasil, rekaman, jejak } = await jalan({ tertebak: (no) => no === 2 });
    expect(hasil.lolos).toBe(false);
    expect(hasil.jumlah_putaran).toBe(15);
    expect(hasil.berhenti).toMatch(/^omongan 2 gagal di 3 sudut \(susp-2025-01-21, .+, .+\); simulasi tidak terbit$/);
    expect(hasil.sudut[1]?.map((c) => [c.ke, c.putaran_mulai, c.putaran_akhir, c.hasil])).toEqual([
      [1, 1, 5, 'dibuang'], [2, 6, 10, 'dibuang'], [3, 11, 15, 'dibuang'],
    ]);
    expect(tulisPenulis(rekaman, 2)).toHaveLength(15);
    expect(tulisPenulis(rekaman, 1)).toHaveLength(1);
    const buang = jejak.jejak().langkah.filter((l) => l.jenis === 'buang-sudut');
    expect(buang.map((l) => [l.putaran, (l.rincian['sudut_baru'] as Sudut | null)?.fact_id ?? null])).toEqual([
      [5, hasil.sudut[1]?.[1]?.fact_id], [10, hasil.sudut[1]?.[2]?.fact_id], [15, null],
    ]);
    expect(buang[2]?.alasan[1]).toBe('batas 3 sudut per posisi tercapai');
    // Sudut baru tidak pernah memakai sudut posisi lain atau penentu omongan terkunci.
    const penentuTerkunci = [om(1).kartu_penentu, om(3).kartu_penentu].flat();
    for (const c of hasil.sudut[1] ?? []) expect(penentuTerkunci).not.toContain(c.fact_id);
    expect(validasiJejak(jejak.jejak())).toEqual([]);
  });

  it('daftar sudut habis sebelum sudut ke-3 → berhenti, tidak terbit, alasannya dicatat', async () => {
    const sudut = SUDUT_FIXTURE.slice(0, 4);
    const { hasil, jejak } = await jalan({ tertebak: (no) => no === 2 }, undefined, sudut);
    expect(hasil).toMatchObject({ lolos: false, jumlah_putaran: 10 });
    expect(hasil.berhenti).toContain('simulasi tidak terbit');
    expect(jejak.jejak().langkah.filter((l) => l.jenis === 'buang-sudut').at(-1)?.alasan[1]).toBe('tidak ada fakta sudut yang belum dipakai');
  });
});
