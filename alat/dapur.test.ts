/**
 * M3.13 D-4 + Amandemen A-1: data halaman "Dapur agen" = jejak nyata, tidak
 * dikarang, dan TIDAK membocorkan simulasi yang tayang.
 *
 * 1. `web/src/dapur-data.json` di repo sama byte demi byte dengan keluaran
 *    `dataDapur()` atas jejak mentah — berkas yang disunting tangan merah.
 * 2. Setiap kalimat trace jalan "utuh" ditemukan kembali HURUF DEMI HURUF di
 *    berkas mentahnya; angkanya = `hasil` jejak.
 * 3. A-1: tidak satu pun kalimat dari `cases/*.json` (pesan, pilihan,
 *    penjelasan, kartu, pembukaan) atau dari jejak DADA/ULTJ (draf, pilihan,
 *    penjelasan, kutipan keberatan) muncul di data dapur; jalan atas simulasi
 *    tayang hanya boleh agregat angka; jalan "utuh" atas simulasi tayang
 *    ditolak keras oleh pembangunnya.
 * 4. Tidak ada alamat, `"/e"`, atau `E:/` di data (gerbang bundel D-6).
 */
import { cpSync, mkdirSync, mkdtempSync, readFileSync, readdirSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { afterAll, describe, expect, it } from 'vitest';
import { teksPolos } from '../factory/skema/rujukan.ts';
import {
  BERKAS_DATA,
  bacaKonfig,
  dataDapur,
  keJsonDapur,
  periksaUtuh,
  tambahJalan,
  type DataDapur,
} from './dapur.ts';

const AKAR = fileURLToPath(new URL('../', import.meta.url));
const mentah = (berkas: string): string => readFileSync(`${AKAR}${berkas}`, 'utf8');
/** Kalimat seperti yang tertulis di JSON mentah (tanda kutip dan garis miring di-escape). */
const diJson = (teks: string): string => JSON.stringify(teks).slice(1, -1);

/** Semua nilai teks di dalam sebuah nilai JSON, rekursif. */
function semuaTeks(nilai: unknown, keluar: string[] = []): string[] {
  if (typeof nilai === 'string') keluar.push(nilai);
  else if (Array.isArray(nilai)) for (const x of nilai) semuaTeks(x, keluar);
  else if (nilai !== null && typeof nilai === 'object') for (const x of Object.values(nilai)) semuaTeks(x, keluar);
  return keluar;
}

/** Kalimat (>= 25 karakter) dari teks, sesudah penanda `[[fact|teks]]` dilepas. */
function kalimat(teks: string): string[] {
  return teksPolos(teks)
    .split(/(?<=[.!?])\s+|\n+/)
    .map((k) => k.trim())
    .filter((k) => k.length >= 25);
}

/** Folder jejak DADA/ULTJ di seluruh keluaran lingkar agen. */
function folderTayang(): string[] {
  const hasil: string[] = [];
  const jelajah = (dir: string): void => {
    for (const e of readdirSync(`${AKAR}${dir}`, { withFileTypes: true })) {
      if (!e.isDirectory()) continue;
      const anak = `${dir}/${e.name}`;
      if (e.name === 'dada' || e.name === 'ultj') hasil.push(anak);
      else jelajah(anak);
    }
  };
  for (const d of readdirSync(`${AKAR}eval`).filter((n) => n.startsWith('keluaran'))) jelajah(`eval/${d}`);
  return hasil;
}

/**
 * Kalimat terlarang: isi simulasi tayang (`cases/*.json`) dan isi jejak
 * DADA/ULTJ — kecuali kalimat yang juga tertulis di jejak mentah jalan "utuh"
 * sendiri (kalimat sistem yang sama untuk semua jalan, mis. "kritikus tidak
 * menjawab …").
 */
function kalimatTerlarang(): Set<string> {
  const konfig = bacaKonfig();
  const jejakUtuh = konfig.utuh
    .flatMap((j) => ['jejak-agen.json', 'riwayat.json', 'draf-akhir.json'].map((f) => mentah(`${j.folder}/${f}`)))
    .map((t) =>
      semuaTeks(JSON.parse(t))
        .flatMap((x) => [x, teksPolos(x)])
        .join('\n'),
    )
    .join('\n');
  const sumber: string[] = [];
  for (const f of readdirSync(`${AKAR}cases`).filter((n) => n.endsWith('.json'))) {
    sumber.push(...semuaTeks(JSON.parse(mentah(`cases/${f}`))));
  }
  for (const dir of folderTayang()) {
    for (const f of ['jejak-agen.json', 'riwayat.json', 'draf-akhir.json']) {
      try {
        sumber.push(...semuaTeks(JSON.parse(mentah(`${dir}/${f}`))));
      } catch {
        /* folder tanpa berkas itu */
      }
    }
  }
  const terlarang = new Set<string>();
  for (const t of sumber) for (const k of kalimat(t)) if (!jejakUtuh.includes(k)) terlarang.add(k);
  return terlarang;
}

/** Kalimat yang bocor ke data dapur. */
function bocor(data: DataDapur, terlarang: Set<string>): string[] {
  const isi = semuaTeks(data)
    .map((t) => teksPolos(t))
    .join('\n');
  return [...terlarang].filter((k) => isi.includes(k));
}

describe('M3.13 D-4 — data dapur agen dari jejak mentah', () => {
  const data = dataDapur();
  /** Berkas yang benar-benar dimuat halaman — bukan keluaran pembangun. */
  const berkasData = JSON.parse(mentah(BERKAS_DATA)) as DataDapur;
  const konfig = bacaKonfig();

  it('berkas di repo = keluaran node --experimental-strip-types alat/dapur.ts (byte demi byte)', () => {
    const berkas = mentah(BERKAS_DATA).replace(/\r\n/g, '\n');
    expect(berkas === keJsonDapur(data), `${BERKAS_DATA} harus hasil alat/dapur.ts`).toBe(true);
  });

  it('A-1: jalan utuh hanya TIRT (ditolak, tanpa draf); DADA/ULTJ hanya agregat angka', () => {
    expect(data.jalan.map((j) => [j.id, j.terbit, j.draf])).toEqual([['tirt-m2d6', false, null]]);
    expect(data.jalan[0]?.berhenti).toContain('tidak terbit');
    expect(data.agregat.map((a) => a.id).sort()).toEqual(['dada-m2d4', 'ultj-m2d4']);
    for (const a of data.agregat) {
      expect(Object.keys(a).sort()).toEqual(['id', 'milestone', 'penolakan', 'putaran', 'terbit', 'versi']);
    }
  });

  it('setiap kalimat trace di berkas data ditemukan kembali huruf demi huruf di berkas mentahnya', () => {
    for (const [i, jalan] of berkasData.jalan.entries()) {
      const k = konfig.utuh[i];
      if (k === undefined) throw new Error('konfigurasi hilang');
      const jejak = mentah(`${k.folder}/jejak-agen.json`);
      const akhir = mentah(`${k.folder}/draf-akhir.json`);
      const kalimatJejak = [
        jalan.simulasi.peristiwa,
        ...jalan.penolakan.flatMap((p) => p.alasan),
        ...jalan.pemeriksaan.tersingkir.map((t) => t.alasan),
        ...(jalan.berhenti === null ? [] : [jalan.berhenti]),
      ];
      for (const t of kalimatJejak) expect(jejak, t.slice(0, 60)).toContain(diJson(t));
      for (const o of jalan.draf ?? []) {
        for (const t of [o.pesan, o.penjelasan, ...Object.values(o.pilihan)]) {
          expect(akhir, t.slice(0, 60)).toContain(diJson(t));
        }
      }
    }
  });

  it('angka di berkas data = angka jejak (jalan utuh dan agregat)', () => {
    type Jejak = { hasil: Record<string, unknown>; langkah: Array<{ putusan: string; peran: string }> };
    for (const [i, jalan] of berkasData.jalan.entries()) {
      const k = konfig.utuh[i];
      if (k === undefined) throw new Error('konfigurasi hilang');
      const jejak = JSON.parse(mentah(`${k.folder}/jejak-agen.json`)) as Jejak;
      expect(jalan.putaran).toBe(jejak.hasil['putaran']);
      expect(jalan.panggilan).toBe(jejak.hasil['panggilan']);
      expect(jalan.durasi_ms).toBe(jejak.hasil['durasi_ms']);
      expect(jalan.penolakan).toHaveLength(jejak.langkah.filter((l) => l.putusan === 'tolak').length);
      expect(jalan.peran.reduce((j, p) => j + p.langkah, 0)).toBe(jejak.langkah.length);
    }
    for (const [i, a] of berkasData.agregat.entries()) {
      const k = konfig.agregat[i];
      if (k === undefined) throw new Error('konfigurasi hilang');
      const jejak = JSON.parse(mentah(`${k.folder}/jejak-agen.json`)) as Jejak;
      expect(a.putaran).toBe(jejak.hasil['putaran']);
      expect(a.terbit).toBe(jejak.hasil['lolos']);
      expect(a.penolakan.reduce((j, p) => j + p.tolak, 0)).toBe(
        jejak.langkah.filter((l) => l.putusan === 'tolak').length,
      );
    }
  });

  it('biaya jalan TIRT M2d-6 = biaya nyata ledger', () => {
    expect(data.jalan.map((j) => j.biaya_usd === null)).toEqual([false]);
  });

  it('tanpa alamat, "/e", atau E:/ — data ikut bundel', () => {
    const teks = keJsonDapur(data);
    expect(teks).not.toMatch(/https?:\/\//);
    expect(teks).not.toContain('"/e"');
    expect(teks).not.toContain('E:/');
  });
});

describe('M3.13 A-1 — dapur tidak membocorkan simulasi yang tayang', () => {
  const terlarang = kalimatTerlarang();
  const berkasData = JSON.parse(mentah(BERKAS_DATA)) as DataDapur;

  it('bahan pembanding tidak kosong: kalimat dari cases/ dan jejak DADA/ULTJ', () => {
    expect(folderTayang().length).toBeGreaterThanOrEqual(2);
    expect(terlarang.size).toBeGreaterThan(200);
    // Contoh yang pasti ada: pilihan c soal 1 DADA.
    expect(terlarang).toContain('Betul, pengumuman itu yang bikin harganya naik 22 kali.');
  });

  it('tidak satu pun kalimat pesan/pilihan/penjelasan/kutipan DADA/ULTJ ada di data dapur', () => {
    expect(bocor(berkasData, terlarang)).toEqual([]);
    expect(JSON.stringify(berkasData)).not.toMatch(/Perusahaan [DU]\b/);
  });

  it('SABOTASE di dalam tes: satu pilihan DADA disisipkan ke alasan penolakan -> tertangkap', () => {
    const rusak = structuredClone(berkasData);
    const p = rusak.jalan[0]?.penolakan[0];
    if (p === undefined) throw new Error('tidak ada penolakan');
    p.alasan.push('Keliru, pengumumannya soal laporan keuangan telat.');
    expect(bocor(rusak, terlarang)).toEqual(['Keliru, pengumumannya soal laporan keuangan telat.']);
  });

  it('pembangun menolak jalan "utuh" atas simulasi tayang (ULTJ M2d-4)', () => {
    expect(() =>
      periksaUtuh({ id: 'ultj-m2d4', milestone: 'M2d-4', folder: 'eval/keluaran-m2d4/ultj', biaya_nyata: false }),
    ).toThrow(/tidak boleh/);
  });
});

describe('M3.13 A-1 — satu perintah untuk jalan TIRT berikutnya', () => {
  const salinan = mkdtempSync(join(tmpdir(), 'dapur-tambah-'));
  afterAll(() => {
    rmSync(salinan, { recursive: true, force: true });
  });

  it('tambah <folder> <milestone> mencatat jalan TIRT baru; ULTJ dan jalan ganda ditolak', () => {
    const akar = `${salinan.replace(/\\/g, '/')}/`;
    cpSync(`${AKAR}cases`, `${akar}cases`, { recursive: true });
    mkdirSync(`${akar}alat`, { recursive: true });
    cpSync(`${AKAR}alat/dapur-jalan.json`, `${akar}alat/dapur-jalan.json`);
    for (const d of ['eval/keluaran-m2d6/jalan-1/tirt', 'eval/keluaran-m2d4/ultj', 'eval/keluaran-m2d4/dada']) {
      cpSync(`${AKAR}${d}`, `${akar}${d}`, { recursive: true });
    }
    // Jalan "M2d-7" tiruan: jejak TIRT yang sama di folder baru.
    cpSync(`${AKAR}eval/keluaran-m2d6/jalan-1/tirt`, `${akar}eval/keluaran-m2d7/jalan-1/tirt`, { recursive: true });
    const baru = tambahJalan('eval/keluaran-m2d7/jalan-1/tirt/', 'M2d-7', true, akar);
    expect(baru).toEqual({
      id: 'tirt-m2d7',
      milestone: 'M2d-7',
      folder: 'eval/keluaran-m2d7/jalan-1/tirt',
      biaya_nyata: true,
    });
    expect(dataDapur(akar).jalan.map((j) => j.id)).toEqual(['tirt-m2d6', 'tirt-m2d7']);
    expect(() => tambahJalan('eval/keluaran-m2d7/jalan-1/tirt', 'M2d-7', true, akar)).toThrow(/sudah tercatat/);
    expect(() => tambahJalan('eval/keluaran-m2d4/ultj', 'M2d-9', false, akar)).toThrow(/tidak boleh/);
  });
});
