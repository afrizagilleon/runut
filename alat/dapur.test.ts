/**
 * M3.13 D-4: data halaman "Dapur agen" = jejak nyata, tidak dikarang.
 *
 * Tiga penjaga:
 * 1. `web/src/dapur-data.json` di repo sama byte demi byte dengan keluaran
 *    `dataDapur()` atas jejak mentah — berkas yang disunting tangan merah.
 * 2. Setiap kalimat trace di data (alasan penolakan, pesan dan pilihan draf,
 *    alasan fakta tersingkir, sebab berhenti) ditemukan kembali HURUF DEMI
 *    HURUF di berkas mentahnya, dibaca terpisah dari pembangunnya.
 * 3. Tidak ada alamat, `"/e"`, atau `E:/` di data (gerbang bundel D-6).
 */
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { BERKAS_DATA, JALAN, dataDapur, keJsonDapur, type DataDapur } from './dapur.ts';

const AKAR = fileURLToPath(new URL('../', import.meta.url));
const mentah = (berkas: string): string => readFileSync(`${AKAR}${berkas}`, 'utf8');
/** Kalimat seperti yang tertulis di JSON mentah (tanda kutip dan garis miring di-escape). */
const diJson = (teks: string): string => JSON.stringify(teks).slice(1, -1);

describe('M3.13 D-4 — data dapur agen dari jejak mentah', () => {
  const data = dataDapur();
  /** Berkas yang benar-benar dimuat halaman — bukan keluaran pembangun. */
  const berkasData = JSON.parse(mentah(BERKAS_DATA)) as DataDapur;

  it('berkas di repo = keluaran node --experimental-strip-types alat/dapur.ts (byte demi byte)', () => {
    const berkas = mentah(BERKAS_DATA).replace(/\r\n/g, '\n');
    expect(berkas === keJsonDapur(data), `${BERKAS_DATA} harus hasil node --experimental-strip-types alat/dapur.ts`).toBe(true);
  });

  it('dua jalan: ULTJ M2d-4 terbit dengan tiga draf, TIRT M2d-6 ditolak tanpa draf', () => {
    expect(data.jalan.map((j) => [j.id, j.terbit, j.draf?.length ?? null])).toEqual([
      ['ultj-m2d4', true, 3],
      ['tirt-m2d6', false, null],
    ]);
    expect(data.jalan[1]?.berhenti).toContain('tidak terbit');
  });

  it('setiap kalimat trace di berkas data ditemukan kembali huruf demi huruf di berkas mentahnya', () => {
    for (const [i, jalan] of berkasData.jalan.entries()) {
      const konfig = JALAN[i];
      if (konfig === undefined) throw new Error('konfigurasi hilang');
      const jejak = mentah(`${konfig.folder}/jejak-agen.json`);
      const akhir = mentah(`${konfig.folder}/draf-akhir.json`);
      const kalimatJejak = [
        jalan.simulasi.peristiwa,
        ...jalan.penolakan.flatMap((p) => p.alasan),
        ...jalan.pemeriksaan.tersingkir.map((t) => t.alasan),
        ...(jalan.berhenti === null ? [] : [jalan.berhenti]),
      ];
      for (const k of kalimatJejak) expect(jejak, k.slice(0, 60)).toContain(diJson(k));
      for (const o of jalan.draf ?? []) {
        for (const k of [o.pesan, o.penjelasan, ...Object.values(o.pilihan)]) {
          expect(akhir, k.slice(0, 60)).toContain(diJson(k));
        }
      }
    }
  });

  it('angka di berkas data = angka `hasil` jejak; jumlah penolakan = langkah bertanda tolak', () => {
    for (const [i, jalan] of berkasData.jalan.entries()) {
      const konfig = JALAN[i];
      if (konfig === undefined) throw new Error('konfigurasi hilang');
      const jejak = JSON.parse(mentah(`${konfig.folder}/jejak-agen.json`)) as {
        hasil: Record<string, unknown>;
        langkah: Array<{ putusan: string; peran: string }>;
      };
      expect(jalan.putaran).toBe(jejak.hasil['putaran']);
      expect(jalan.panggilan).toBe(jejak.hasil['panggilan']);
      expect(jalan.durasi_ms).toBe(jejak.hasil['durasi_ms']);
      expect(jalan.penolakan).toHaveLength(jejak.langkah.filter((l) => l.putusan === 'tolak').length);
      expect(jalan.peran.reduce((j, p) => j + p.langkah, 0)).toBe(jejak.langkah.length);
    }
  });

  it('biaya hanya ditampilkan bila ledger jalan itu biaya nyata (M2d-4: tabel tebakan → null)', () => {
    expect(data.jalan.map((j) => j.biaya_usd === null)).toEqual([true, false]);
  });

  it('tanpa alamat, "/e", atau E:/ — data ikut bundel', () => {
    const teks = keJsonDapur(data);
    expect(teks).not.toMatch(/https?:\/\//);
    expect(teks).not.toContain('"/e"');
    expect(teks).not.toContain('E:/');
  });

  it('tipe data: sumber menyebut tiap berkas yang dibaca', () => {
    const d: DataDapur = data;
    expect(d.sumber).toContain('eval/keluaran-m2d4/ultj/jejak-agen.json');
    expect(d.sumber).toContain('eval/keluaran-m2d6/jalan-1/tirt/jejak-agen.json');
  });
});
