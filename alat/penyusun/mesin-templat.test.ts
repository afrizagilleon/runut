/**
 * M2d-10 T-06: mesin "templat" dicolokkan ke pintu penyusun lewat antarmuka
 * `MesinPenulis` yang sama; mesin lama tetap ada (bawaan).
 */
import { mkdtempSync, existsSync, readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { DEFINISI_PAKET, bangunPaket } from '../../factory/llm/paket.ts';
import { akarSementara } from './bantu-uji.ts';
import { MesinTemplat, keadaanDariKunci, mesinTemplatPalsu, perkiraanTemplat } from './mesin-templat.ts';
import { panggilTemplatPalsu } from '../../factory/llm/templat/palsu.ts';
import { buatAplikasi, uraiArgumen } from './server.ts';
import { periksaSuntingan, terapkanSuntingan } from './penyetuju.ts';

const TIRT = bangunPaket(DEFINISI_PAKET.tirt);
const JAM = (): Date => new Date('2026-10-01T00:00:00Z');

describe('pilihan mesin di baris perintah', () => {
  it('--mesin templat | lingkar; bawaan lingkar; nilai lain ditolak', () => {
    expect(uraiArgumen([], 'X:/').mesin).toBe('lingkar');
    expect(uraiArgumen(['--mesin', 'templat'], 'X:/').mesin).toBe('templat');
    expect(() => uraiArgumen(['--mesin', 'opus'], 'X:/')).toThrow(/--mesin/);
  });
  it('server memasang mesin templat bila diminta; mesin lama tetap bawaan', () => {
    const akar = akarSementara();
    const dasar = { akar, folderKeluaran: join(akar, 'eval', 'penyusun'), jam: JAM, log: () => undefined, paguPenyusunUsd: 1.2, palsu: true, proses: {} };
    expect(buatAplikasi({ ...dasar, namaMesin: 'templat' }).keadaan.alur.mesin.nama).toBe('templat-m2d10-palsu');
    expect(buatAplikasi(dasar).keadaan.alur.mesin.nama).toBe('lingkar-m2d8-palsu');
  });
});

describe('MesinTemplat (templat & gerbang kode sungguhan, model palsu)', () => {
  it('perkiraan biaya menyebut ketiga model dan peran penyempurna', () => {
    const p = perkiraanTemplat();
    expect(p.per_panggilan.map((x) => x.model)).toEqual(expect.arrayContaining(['deepseek/deepseek-v4.1-flash', 'z-ai/glm-5.3', 'anthropic/claude-haiku-4.5']));
    expect(p.per_panggilan.some((x) => x.peran.startsWith('penyempurna'))).toBe(true);
    expect(p.per_omongan_usd).toBeGreaterThan(0);
  });

  it('cukupPaket: TIRT memberi 3 rencana templat', () => {
    expect(mesinTemplatPalsu().cukupPaket(TIRT)).toEqual({ cukup: true, jumlah: 3, satuan: 'rencana templat' });
  });

  it('terbit lewat antarmuka pintu: peristiwa tahapan dialirkan, keadaan untuk penyetuju, jejak di folder jalan', async () => {
    const folder = mkdtempSync(join(tmpdir(), 'penyusun-templat-'));
    const awalan: string[] = [];
    const m = new MesinTemplat({
      nama: 'uji', keterangan: 'uji', palsu: true, siap: () => ({ siap: true, alasan: null }),
      buatPanggil: (a, pagu) => {
        awalan.push(`${a}|${String(pagu)}`);
        return panggilTemplatPalsu('tirt').panggil;
      },
    });
    const lapor: string[] = [];
    const h = await m.jalankan({ id: 'j1', paket: TIRT, folder, paguJalanUsd: 0.5, lapor: (_t, judul) => lapor.push(judul), jam: JAM });
    expect(awalan).toEqual(['penyusun/j1/|0.5']);
    expect(h.terbit).toBe(true);
    expect(h.keadaan.map((k) => k.no)).toEqual([1, 2, 3]);
    expect(h.keadaan.every((k) => k.templat !== undefined)).toBe(true);
    expect(lapor.some((l) => l.includes('rencana templat'))).toBe(true);
    expect(lapor.some((l) => l.includes('kritikus'))).toBe(true);
    expect(existsSync(join(folder, 'jejak-agen.json'))).toBe(true);
    expect(JSON.parse(readFileSync(join(folder, 'jejak-agen.json'), 'utf8')).dibuat_oleh).toBe('factory/llm/templat/mesin.ts');
  });

  it('uji ulang suntingan penyetuju lewat gerbang yang sama; suntingan yang menghapus penanda waktu ditolak kode', async () => {
    const m = mesinTemplatPalsu();
    const folder = mkdtempSync(join(tmpdir(), 'penyusun-templat-'));
    const h = await m.jalankan({ id: 'j2', paket: TIRT, folder, paguJalanUsd: 0.5, lapor: () => undefined, jam: JAM });
    const keadaan = h.keadaan;
    const k1 = keadaan[1]; // A-2: omongan 2 = setengah-benar (kata wajib "tahun ini")
    if (k1 === undefined) throw new Error('tidak ada keadaan');
    const baru = `${k1.omongan.pesan} ya`;
    expect(periksaSuntingan(k1.omongan, 'pesan', baru)).toBeNull();
    terapkanSuntingan(k1.omongan, k1, 'pesan', baru);
    const ok = await m.ujiUlang({ id: 'j2', ke: 1, paket: TIRT, folder, keadaan, diuji: [2], paguUsd: 0.5, lapor: () => undefined, jam: JAM });
    expect(ok.lolos).toBe(true);
    const tanpa = k1.omongan.pesan.replace(/tahun ini/gi, 'kemaren');
    terapkanSuntingan(k1.omongan, k1, 'pesan', tanpa);
    const tolak = await m.ujiUlang({ id: 'j2', ke: 2, paket: TIRT, folder, keadaan, diuji: [2], paguUsd: 0.5, lapor: () => undefined, jam: JAM });
    expect(tolak.lolos).toBe(false);
    expect(tolak.per_omongan[0]?.status).toBe('ditolak-pemeriksa');
  });

  it('keadaanDariKunci menyimpan rencana & varian (bahan uji ulang)', async () => {
    const m = mesinTemplatPalsu();
    const h = await m.jalankan({ id: 'j3', paket: TIRT, folder: mkdtempSync(join(tmpdir(), 'penyusun-templat-')), paguJalanUsd: 0.5, lapor: () => undefined, jam: JAM });
    const k = h.keadaan[0];
    expect(k?.templat?.rencana.pola).toBe('angka-lain-waktu');
    expect(Object.keys(k?.templat?.varian ?? {})).toEqual(['kunci', 'p1', 'p2', 'p3']);
    expect(typeof keadaanDariKunci).toBe('function');
  });
});
