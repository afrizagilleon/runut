/**
 * Data bagian "Jejak AI agent" = rekaman percobaan, tidak dikarang, tanpa teks
 * berpikir model, tanpa kode saham.
 *
 * 1. `web/src/jejak-agen-data.json` di repo sama byte demi byte dengan keluaran
 *    `dataJejak()` — berkas yang disunting tangan merah.
 * 2. Jumlah langkah dan biaya tiap percobaan = `hasil.json` percobaan itu.
 * 3. Tiap langkah dan tiap tool result di data = baris rekamannya, berurutan.
 * 4. Medan `penalaran` tidak ada di data, di kedalaman mana pun; langkah hanya
 *    membawa medan yang didaftar.
 * 5. Kode saham, nama perusahaan, alamat berkas mesin, dan alamat jaringan
 *    tidak ada di data.
 *
 * Tes ini membaca rekaman HANYA lewat `uraiTanpaPenalaran`, jadi teks berpikir
 * model tidak pernah dimuat — juga tidak ke pesan galat bila sebuah tes merah.
 */
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync, cpSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { afterAll, describe, expect, it } from 'vitest';
import {
  BERKAS_DATA_JEJAK,
  FOLDER_REKAMAN,
  KONFIG_JEJAK,
  MEDAN_MODEL,
  MEDAN_TERLARANG,
  NAMA_LAMA,
  SAMARAN_KODE,
  URUT_TAHAP,
  dataJejak,
  keJsonJejak,
  samarkan,
  samarkanDalam,
  semuaTeksJejak,
  uraiTanpaPenalaran,
  type DataJejak,
} from './jejak-agen.ts';

const AKAR = fileURLToPath(new URL('../', import.meta.url));
const mentah = (berkas: string): string => readFileSync(`${AKAR}${berkas}`, 'utf8');

interface Baris {
  jenis?: string;
  [medan: string]: unknown;
}

/** Baris rekaman satu percobaan, TANPA medan `penalaran`. */
function rekaman(id: string): Baris[] {
  return mentah(`${FOLDER_REKAMAN}/${id}/jejak-agen.jsonl`)
    .split('\n')
    .filter((b) => b.trim() !== '')
    .map((b) => uraiTanpaPenalaran(b) as Baris);
}

/** Semua nama medan di dalam sebuah nilai JSON, rekursif. */
function semuaMedan(nilai: unknown, keluar: Set<string> = new Set()): Set<string> {
  if (Array.isArray(nilai)) for (const x of nilai) semuaMedan(x, keluar);
  else if (nilai !== null && typeof nilai === 'object') {
    for (const [k, v] of Object.entries(nilai)) {
      keluar.add(k);
      semuaMedan(v, keluar);
    }
  }
  return keluar;
}

const kasus = JSON.parse(mentah(KONFIG_JEJAK.kasus)) as { emiten: { simbol: string; nama: string } };
const TERLARANG = [kasus.emiten.nama, kasus.emiten.nama.replace(/\s+Tbk\.?$/i, ''), kasus.emiten.simbol];

describe('data jejak AI agent dari rekaman percobaan', () => {
  const data = dataJejak();
  /** Berkas yang benar-benar dimuat halaman — bukan keluaran pembangun. */
  const teksBerkas = mentah(BERKAS_DATA_JEJAK).replace(/\r\n/g, '\n');
  const berkas = JSON.parse(teksBerkas) as DataJejak;

  it('berkas di repo = keluaran node --experimental-strip-types alat/jejak-agen.ts (byte demi byte)', () => {
    expect(teksBerkas === keJsonJejak(data), `${BERKAS_DATA_JEJAK} harus hasil alat/jejak-agen.ts`).toBe(true);
  });

  it('empat percobaan, berurutan; jumlah langkah dan biaya tiap percobaan = hasil.json', () => {
    expect(berkas.percobaan).toHaveLength(KONFIG_JEJAK.percobaan.length);
    expect(berkas.percobaan).toHaveLength(4);
    for (const [i, id] of KONFIG_JEJAK.percobaan.entries()) {
      const hasil = JSON.parse(mentah(`${FOLDER_REKAMAN}/${id}/hasil.json`)) as {
        langkah: number;
        panggilan_model: number;
        biaya_usd: number;
        biaya_agen_usd: number;
        durasi_detik: number;
        berhenti: string;
        mode: string;
        pagu_usd: number;
      };
      const p = berkas.percobaan[i];
      if (p === undefined) throw new Error('percobaan hilang');
      const milik = berkas.langkah.filter((l) => l.percobaan === i);
      expect(milik, id).toHaveLength(hasil.langkah);
      expect(milik, id).toHaveLength(hasil.panggilan_model);
      expect(p.jumlah_langkah, id).toBe(hasil.langkah);
      expect(p.biaya_usd, id).toBe(hasil.biaya_usd);
      expect(p.durasi_detik, id).toBe(hasil.durasi_detik);
      expect(p.berhenti, id).toBe(hasil.berhenti);
      expect(p.mode, id).toBe(hasil.mode);
      expect(p.pagu_usd, id).toBe(hasil.pagu_usd);
      // Biaya model = jumlah biaya tiap langkah = hasil.json.
      const agen = milik.reduce((j, l) => j + l.biaya_usd, 0);
      expect(agen, id).toBeCloseTo(hasil.biaya_agen_usd, 6);
      expect(p.biaya_agen_usd, id).toBeCloseTo(hasil.biaya_agen_usd, 6);
      // Model + tester = biaya percobaan; hasil.json membulatkannya ke empat desimal.
      const tester = milik.reduce((j, l) => j + l.biaya_tester_usd, 0);
      expect(p.biaya_tester_usd, id).toBeCloseTo(tester, 6);
      expect(Math.abs(agen + tester - hasil.biaya_usd), id).toBeLessThan(1e-4);
      expect((agen + tester).toFixed(2), id).toBe(hasil.biaya_usd.toFixed(2));
    }
  });

  it('jumlah seluruhnya dan per tahap dijumlah dari percobaan dan langkah, bukan diketik', () => {
    expect(berkas.jumlah.langkah).toBe(berkas.langkah.length);
    expect(berkas.jumlah.langkah).toBe(berkas.percobaan.reduce((j, p) => j + p.jumlah_langkah, 0));
    expect(berkas.jumlah.biaya_usd).toBeCloseTo(
      berkas.percobaan.reduce((j, p) => j + p.biaya_usd, 0),
      6,
    );
    expect(berkas.tahap.map((t) => t.id)).toEqual([...URUT_TAHAP]);
    for (const t of berkas.tahap) {
      const milik = berkas.langkah.filter((l) => l.tahap === t.id);
      expect(t.jumlah_langkah, t.id).toBe(milik.length);
      expect(t.biaya_usd, t.id).toBeCloseTo(
        milik.reduce((j, l) => j + l.biaya_usd + l.biaya_tester_usd, 0),
        6,
      );
    }
    expect(berkas.tahap.reduce((j, t) => j + t.jumlah_langkah, 0)).toBe(berkas.jumlah.langkah);
    // Tahap dijumlah dari langkah; selisihnya dengan hasil.json hanya pembulatan empat desimal per percobaan.
    const selisih = Math.abs(berkas.tahap.reduce((j, t) => j + t.biaya_usd, 0) - berkas.jumlah.biaya_usd);
    expect(selisih).toBeLessThan(1e-4 * berkas.percobaan.length);
    // Nomor langkah urut 1..n; tahap tidak pernah mundur.
    expect(berkas.langkah.map((l) => l.no)).toEqual(berkas.langkah.map((_, i) => i + 1));
    const urut = berkas.langkah.map((l) => URUT_TAHAP.indexOf(l.tahap));
    expect(urut).toEqual([...urut].sort((a, b) => a - b));
  });

  it('tiap langkah dan tiap tool result = baris rekamannya, berurutan', () => {
    for (const [i, id] of KONFIG_JEJAK.percobaan.entries()) {
      const baris = rekaman(id);
      const model = baris.filter((b) => b.jenis === 'model');
      const alat = baris.filter((b) => b.jenis === 'alat');
      const milik = berkas.langkah.filter((l) => l.percobaan === i);
      expect(milik, id).toHaveLength(model.length);
      for (const [n, l] of milik.entries()) {
        const m = model[n];
        if (m === undefined) throw new Error('baris model hilang');
        expect(l.ke, id).toBe(m['ke']);
        expect(l.memanggil, id).toEqual(m['memanggil']);
        expect(l.teks ?? '', id).toBe(samarkan(typeof m['teks'] === 'string' ? m['teks'] : '', TERLARANG));
        expect(l.token_masuk, id).toBe(m['token_masuk']);
        expect(l.token_keluar, id).toBe(m['token_keluar']);
        expect(l.token_penalaran, id).toBe(m['token_penalaran']);
        expect(l.biaya_usd, id).toBe(m['biaya_usd']);
        expect(l.latensi_ms, id).toBe(m['latensi_ms']);
        expect(l.mode_hemat, id).toBe(typeof m['mode_hemat'] === 'boolean' ? m['mode_hemat'] : null);
      }
      const hasil = milik.flatMap((l) => l.hasil);
      expect(hasil, id).toHaveLength(alat.length);
      for (const [n, h] of hasil.entries()) {
        const a = alat[n];
        if (a === undefined) throw new Error('baris alat hilang');
        expect(h.alat, id).toBe(a['alat']);
        expect(h.ringkas, id).toBe(samarkan(String(a['ringkas']), TERLARANG));
        expect(h.hasil, id).toEqual(samarkanDalam(a['hasil'], TERLARANG));
      }
    }
  });

  it('penyamaran hanya menyentuh kode saham dan alamat berkas: selain itu tool result huruf demi huruf', () => {
    let disamarkan = 0;
    let utuh = 0;
    for (const id of KONFIG_JEJAK.percobaan) {
      for (const b of rekaman(id).filter((x) => x.jenis === 'alat')) {
        for (const t of semuaTeksJejak(b['hasil'])) {
          if (samarkan(t, TERLARANG) === t) utuh += 1;
          else disamarkan += 1;
        }
      }
    }
    // Yang disamarkan hanya dua jalur berkas di tool result terakhir.
    expect(disamarkan).toBe(2);
    expect(utuh).toBeGreaterThan(500);
  });

  it(`medan ${MEDAN_TERLARANG} tidak ada di data; langkah hanya membawa medan yang didaftar`, () => {
    expect(semuaMedan(berkas).has(MEDAN_TERLARANG)).toBe(false);
    expect(teksBerkas).not.toMatch(/"penalaran"\s*:/);
    expect((MEDAN_MODEL as readonly string[]).includes(MEDAN_TERLARANG)).toBe(false);
    const boleh = [...MEDAN_MODEL, 'no', 'percobaan', 'tahap', 'biaya_tester_usd', 'hasil'].sort();
    for (const l of berkas.langkah) {
      expect(Object.keys(l).sort()).toEqual(boleh);
      for (const h of l.hasil) expect(Object.keys(h).sort()).toEqual(['alat', 'hasil', 'ringkas']);
    }
    // Jumlah token berpikir ikut sebagai angka.
    expect(berkas.langkah.every((l) => Number.isInteger(l.token_penalaran))).toBe(true);
    expect(berkas.langkah.some((l) => l.token_penalaran > 0)).toBe(true);
  });

  it('tanpa kode saham, nama perusahaan, alamat berkas mesin, atau alamat jaringan', () => {
    expect(teksBerkas).not.toMatch(/amag/i);
    expect(teksBerkas).not.toMatch(/asuransi multi/i);
    for (const kata of TERLARANG) expect(teksBerkas.toLowerCase().includes(kata.toLowerCase())).toBe(false);
    expect(teksBerkas).not.toMatch(/[A-Za-z]:[\\/]/);
    expect(teksBerkas).not.toMatch(/https?:\/\//);
    expect(teksBerkas).not.toContain('"/e"');
    // Id percobaan dan berkas sumber tetap terbaca, kodenya disamarkan.
    expect(berkas.percobaan.every((p) => p.id.includes(SAMARAN_KODE))).toBe(true);
    expect(berkas.sumber).toHaveLength(2 * KONFIG_JEJAK.percobaan.length);
    expect(berkas.simulasi.nama_samaran).toMatch(/^Perusahaan [A-Z]$/);
  });

  it('daftar tool = tool yang dipilih agent di rekaman; nama lama digabung ke nama sekarang', () => {
    const dipakai = new Set(berkas.langkah.flatMap((l) => [...l.memanggil, ...l.hasil.map((h) => h.alat)]));
    const terdaftar = new Set(berkas.tool.flatMap((t) => [t.nama, ...t.nama_lama]));
    expect([...terdaftar].sort()).toEqual([...dipakai].sort());
    for (const t of berkas.tool) for (const lama of t.nama_lama) expect(NAMA_LAMA[lama]).toBe(t.nama);
    expect(new Set(berkas.tool.map((t) => t.nama)).size).toBe(berkas.tool.length);
  });
});

describe('pembangun jejak: fungsi penjaga', () => {
  it('uraiTanpaPenalaran membuang medan itu di kedalaman mana pun dan tidak menyentuh yang lain', () => {
    const baris = JSON.stringify({
      jenis: 'model',
      penalaran: 'TEKS-BERPIKIR',
      token_penalaran: 7,
      dalam: [{ penalaran: 'TEKS-BERPIKIR', teks: 'ucapan' }],
    });
    const hasil = uraiTanpaPenalaran(baris);
    expect(hasil).toEqual({ jenis: 'model', token_penalaran: 7, dalam: [{ teks: 'ucapan' }] });
    expect(JSON.stringify(hasil)).not.toContain('TEKS-BERPIKIR');
  });

  it('samarkan: kode saham (huruf besar atau kecil), nama perusahaan, dan alamat mutlak mesin', () => {
    const t = ['Contoh Makmur Tbk', 'Contoh Makmur', 'CTOH'];
    expect(samarkan('eval/penyusun/m1-ctoh-2/hasil.json', t)).toBe(`eval/penyusun/m1-${SAMARAN_KODE}-2/hasil.json`);
    expect(samarkan('C:\\kerja\\repo\\eval/penyusun/m1-ctoh-2/kasus.json', t)).toBe(
      `eval/penyusun/m1-${SAMARAN_KODE}-2/kasus.json`,
    );
    expect(samarkan('PT Contoh Makmur Tbk (CTOH)', t)).toBe(`PT ${SAMARAN_KODE} (${SAMARAN_KODE})`);
    expect(samarkan('Harga penutupan Rp392 per lembar.', t)).toBe('Harga penutupan Rp392 per lembar.');
    expect(samarkanDalam({ a: ['ctoh', 1, null, { b: 'CTOH' }] }, t)).toEqual({
      a: [SAMARAN_KODE, 1, null, { b: SAMARAN_KODE }],
    });
  });
});

describe('pembangun jejak atas rekaman tiruan', () => {
  const salinan = mkdtempSync(join(tmpdir(), 'jejak-agen-'));
  const akar = `${salinan.replace(/\\/g, '/')}/`;
  const konfig = { kasus: KONFIG_JEJAK.kasus, percobaan: ['uji-amag-1'] };
  const folder = `${akar}${FOLDER_REKAMAN}/uji-amag-1`;
  afterAll(() => {
    rmSync(salinan, { recursive: true, force: true });
  });

  function tulis(langkahHasil: number, biaya: number): void {
    mkdirSync(`${akar}cases`, { recursive: true });
    cpSync(`${AKAR}${KONFIG_JEJAK.kasus}`, `${akar}${KONFIG_JEJAK.kasus}`);
    mkdirSync(folder, { recursive: true });
    const baris = [
      { jenis: 'percakapan', ke: 1, bank: 0 },
      {
        jenis: 'model',
        ke: 1,
        memanggil: ['periksa_kode'],
        teks: null,
        penalaran: 'RAHASIA-TEKS-BERPIKIR tentang AMAG',
        token_masuk: 10,
        token_keluar: 5,
        token_penalaran: 3,
        biaya_usd: 0.25,
        latensi_ms: 1200,
      },
      { jenis: 'alat', alat: 'periksa_kode', ke: 1, ringkas: 'lolos (draf abc)', hasil: { lolos: true, penolakan: [] } },
      {
        jenis: 'model',
        ke: 2,
        memanggil: ['ajukan'],
        teks: 'Saya ajukan untuk AMAG.',
        penalaran: 'RAHASIA-TEKS-BERPIKIR',
        token_masuk: 20,
        token_keluar: 5,
        token_penalaran: 0,
        biaya_usd: 0.25,
        latensi_ms: 800,
        mode_hemat: true,
      },
      {
        jenis: 'alat',
        alat: 'ajukan',
        ke: 2,
        ringkas: 'berhenti di saringan',
        hasil: {
          lolos: false,
          penolakan: ['alasan tester'],
          biaya_pengajuan_usd: 0.1,
          berkas: ['D:\\mesin\\repo\\eval/penyusun/uji-amag-1/kasus.json'],
        },
      },
    ];
    writeFileSync(`${folder}/jejak-agen.jsonl`, `${baris.map((b) => JSON.stringify(b)).join('\n')}\n`, 'utf8');
    writeFileSync(
      `${folder}/hasil.json`,
      JSON.stringify({
        id: 'uji-amag-1',
        mode: 'dari-kode',
        kode: 'AMAG',
        hari_dipilih: '2026-06-15',
        model: 'model/uji',
        pagu_usd: 1,
        berhenti: 'selesai',
        langkah: langkahHasil,
        biaya_agen_usd: 0.5,
        biaya_usd: biaya,
        durasi_detik: 2,
      }),
      'utf8',
    );
  }

  it('teks berpikir, kode saham, dan alamat mesin di rekaman tidak sampai ke data', () => {
    tulis(2, 0.6);
    const data = dataJejak(akar, konfig);
    const teks = keJsonJejak(data);
    expect(teks).not.toContain('RAHASIA');
    expect(teks).not.toMatch(/amag/i);
    expect(teks).not.toContain('mesin');
    expect(data.langkah.map((l) => [l.tahap, l.teks, l.mode_hemat, l.biaya_tester_usd])).toEqual([
      ['tulis', null, null, 0],
      ['tulis', `Saya ajukan untuk ${SAMARAN_KODE}.`, true, 0.1],
    ]);
    expect(data.tool).toEqual([
      { nama: 'periksa_draft_dengan_aturan', nama_lama: ['periksa_kode'] },
      { nama: 'ajukan', nama_lama: [] },
    ]);
    expect(data.jumlah).toEqual({ langkah: 2, biaya_usd: 0.6 });
  });

  it('SABOTASE: jumlah langkah atau biaya yang tidak cocok dengan hasil.json menghentikan pembangun', () => {
    tulis(3, 0.6);
    expect(() => dataJejak(akar, konfig)).toThrow(/langkah di jejak/);
    tulis(2, 0.9);
    expect(() => dataJejak(akar, konfig)).toThrow(/biaya/);
    tulis(2, 0.6);
    expect(() => dataJejak(akar, konfig)).not.toThrow();
  });
});
