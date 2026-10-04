/** M2d-20: tidak ada aturan penolak yang tersembunyi dari agen; satu pelanggaran satu baris; ajukan pakai nomor draf; kritikus urutan v3. */
import { existsSync, mkdtempSync, readdirSync, readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import type { NilaiOmonganV3 } from '../bebas/mesin-v3.ts';
import { drafDari, uraiOmonganBebas, type OmonganBebas } from '../bebas/skema.ts';
import { AKAR } from '../env.ts';
import { pesanKritikus, promptKritikusMakna, promptKritikusV3 } from '../kritikus.ts';
import type { PaketFakta } from '../paket.ts';
import { buatAlat } from './alat.ts';
import { BARIS_SIMULASI, butirBentuk, butirUntuk, kontrakBentuk } from './bentuk.ts';
import { periksaKodeAgen } from './pemeran.ts';
import { instruksiAgen } from './prompt.ts';

const paket = JSON.parse(readFileSync(`${AKAR}eval/penyusun/m2d17-uji-2/paket.json`, 'utf8')) as PaketFakta;
const mentah = (JSON.parse(readFileSync(`${AKAR}eval/penyusun/m2d18-uji-sdk-2/omongan-akhir.json`, 'utf8')) as { omongan: unknown[] }).omongan[0] as Record<string, unknown>;
const om = (): OmonganBebas => uraiOmonganBebas(structuredClone(mentah)).omongan as OmonganBebas;

/** Semua teks penolakan gerbang kode yang pernah diterima penulis/agen (berkas terlacak). */
function penolakanTersimpan(): string[] {
  const akar = `${AKAR}eval/penyusun`;
  const hasil: string[] = [];
  for (const nama of readdirSync(akar)) {
    const j = `${akar}/${nama}/jejak-agen.jsonl`;
    if (existsSync(j)) {
      for (const baris of readFileSync(j, 'utf8').split(/\r?\n/)) {
        if (baris.trim() === '') continue;
        const b = JSON.parse(baris) as { jenis: string; alat?: string; hasil?: { penolakan?: string[] } };
        if (b.jenis === 'alat' && b.alat === 'periksa_kode') hasil.push(...(b.hasil?.penolakan ?? []));
      }
    }
    const u = `${akar}/${nama}/uji-satu-panggilan.json`;
    if (existsSync(u)) {
      const d = JSON.parse(readFileSync(u, 'utf8')) as { kode?: Array<{ alasan?: string[] }> };
      for (const k of d.kode ?? []) hasil.push(...(k.alasan ?? []));
    }
  }
  return hasil;
}

describe('kontrak bentuk: semua aturan penolak terlihat agen', () => {
  it('setiap penolakan kode yang PERNAH terjadi punya butir di kontrak (putar ulang berkas tersimpan)', () => {
    const semua = penolakanTersimpan();
    expect(semua.length).toBeGreaterThan(100);
    const tanpaButir = [...new Set(semua.filter((p) => butirUntuk(p) === null).map((p) => p.slice(0, 60)))];
    expect(tanpaButir).toEqual([]);
  });
  it('butir yang ditangani kode (nama) tidak masuk kontrak; butir lain masuk prompt agen kata demi kata', () => {
    const p = instruksiAgen(3);
    for (const b of butirBentuk()) {
      if (b.baris === null) expect(b.kode.some((k) => k.test('pemeriksa: NAMA_TERLARANG: x'))).toBe(true);
      else expect(p).toContain(b.baris);
    }
    for (const b of BARIS_SIMULASI) expect(p).toContain(b);
    expect(kontrakBentuk()).toMatch(/minimal satu ternyata BETUL/);
    expect(kontrakBentuk()).toMatch(/\[\[id_kartu\|teks\]\]/);
    expect(kontrakBentuk()).toMatch(/"kartu N"/);
  });
  it('prompt agen tidak lagi memuat larangan sudut/kartu yang tidak ditegakkan perakit', () => {
    const p = instruksiAgen(3);
    expect(p).not.toMatch(/kartu penentu yang belum terpakai/);
    expect(p).not.toMatch(/jangan mengulang sudut/i);
    expect(p).not.toMatch(/keluarga lain/);
    expect(p).toMatch(/Sesudah 5 draf ditolak, percakapan ini ditutup/);
    expect(p).toMatch(/Penolakan penebak berlaku untuk kalimatnya, bukan untuk kartunya/);
    // M2d-23: tiga sekaligus, kembaran selabel dijelaskan.
    expect(p).toMatch(/rencanakan omongan yang masih kurang sebagai satu set/);
    expect(p).toMatch(/kembaran itu harus sama masuk akalnya dengan kunci/);
  });
});

describe('satu pelanggaran satu baris', () => {
  it('label tak dua-dua dan angka tanpa rujukan tidak dilaporkan dua kali', () => {
    const o = om();
    const rusak: OmonganBebas = { ...o, pilihan: { ...o.pilihan, a: 'Keliru, alasan resmi hari ini tercatat 99 kali.' } };
    const t = periksaKodeAgen(rusak, paket).menolak.map((m) => `${m.sumber}: ${m.alasan}`);
    expect(t.filter((x) => /OPSI_TAK_DUA_DUA/.test(x))).toHaveLength(1);
    expect(t.filter((x) => /detektor D8/.test(x))).toHaveLength(0);
    expect(t.filter((x) => /ANGKA_TANPA_RUJUKAN: Pilihan a/.test(x))).toHaveLength(1);
    expect(t.filter((x) => /angka-di-kartu: pilihan a:/.test(x))).toHaveLength(0);
  });
});

describe('ajukan memakai nomor draf', () => {
  const nilaiLolos = () => {
    const dipanggil: OmonganBebas[] = [];
    const f = ((o: OmonganBebas, _p: unknown, _c: unknown, putaran: number, urut: number, catat: (n: NilaiOmonganV3) => void): Promise<NilaiOmonganV3> => {
      dipanggil.push(o);
      const n: NilaiOmonganV3 = { putaran, urut, omongan: o, berhenti: 'lolos', alasan: [], dicatat: [], saringan: null, kartu_rotasi: null, penebak_kuat: null, kritik: null, biaya_gerbang_usd: 0.05, id_bank: null };
      catat(n);
      return Promise.resolve(n);
    }) as never;
    return { f, dipanggil };
  };
  it('periksa_kode yang lolos memberi id_draf; ajukan({id_draf}) menjalankan gerbang atas draf itu', async () => {
    const n = nilaiLolos();
    const alat = buatAlat({ paket, folderBank: mkdtempSync(join(tmpdir(), 'bank-id-')), idJalan: 'tes', paguUsd: 1, biayaAgen: () => 0, labelPenulis: 'tes', panggil: () => Promise.reject(new Error('tak dipakai')), nilai: n.f });
    const p = alat.periksaKode(mentah);
    expect(p.lolos).toBe(true);
    expect(p.id_draf).toMatch(/^[0-9a-f]{16}$/);
    const h = await alat.ajukan({ id_draf: p.id_draf });
    expect(h.lolos).toBe(true);
    expect(n.dipanggil[0]?.pesan).toBe(om().pesan);
  });
  it('nomor draf tak dikenal → ditolak tanpa gerbang berbayar', async () => {
    const n = nilaiLolos();
    const alat = buatAlat({ paket, folderBank: mkdtempSync(join(tmpdir(), 'bank-id-')), idJalan: 'tes', paguUsd: 1, biayaAgen: () => 0, labelPenulis: 'tes', panggil: () => Promise.reject(new Error('tak dipakai')), nilai: n.f });
    expect(await alat.ajukan({ id_draf: 'deadbeefdeadbeef' })).toMatchObject({ lolos: false, berhenti: 'bentuk', biaya_pengajuan_usd: 0 });
    expect(n.dipanggil).toHaveLength(0);
  });
});

describe('kritikus urutan v3', () => {
  const k = { no: 1, kartu: null, tebakan: [], penebakSesudah: true };
  it('prompt v3: penebak SUDAH jalan; kutipan orang lain bukan klaim teman; prompt makna lama tidak berubah', () => {
    expect(promptKritikusV3()).toMatch(/SUDAH dijalankan sebelum kamu/);
    expect(promptKritikusV3()).not.toMatch(/dipanggil SEBELUM tiga penebak/);
    expect(promptKritikusV3()).toMatch(/Ucapan ORANG LAIN yang dikutip atau dibantah teman/);
    expect(promptKritikusMakna()).toMatch(/dipanggil SEBELUM tiga penebak/);
  });
  it('pesan v3 tidak menyebut "N dari 3" atau "SESUDAH kritikus"; pesan lama tetap', () => {
    const d = drafDari(om());
    const baru = pesanKritikus(d, paket, { ...k, urutanV3: true }, true);
    expect(baru[0]?.content).toBe(promptKritikusV3());
    expect(baru[1]?.content).toMatch(/satu omongan untuk simulasi/);
    expect(baru[1]?.content).not.toMatch(/dari 3/);
    expect(baru[1]?.content).toMatch(/SUDAH dijalankan sebelum kritikus dan tidak menolak/);
    const lama = pesanKritikus(d, paket, k, true);
    expect(lama[0]?.content).toBe(promptKritikusMakna());
    expect(lama[1]?.content).toMatch(/omongan 1 dari 3/);
    expect(lama[1]?.content).toMatch(/SESUDAH kritikus/);
  });
});
