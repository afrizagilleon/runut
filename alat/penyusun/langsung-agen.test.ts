/**
 * "Jalankan Runut Agent" (M-PN1): server menyalakan pelari dan membaca jejak yang tumbuh.
 *
 * SEMUA pelari di berkas ini PELARI TIRUAN UJI: tidak ada model yang dipanggil,
 * tidak ada jaringan, tidak ada `.env` sungguhan (akar sementara). Pelari
 * sungguhan (`pelariSungguhan`) tidak pernah dinyalakan di sini.
 *
 * Empat penutup risiko kontrak §3:
 * 1. Langkah di halaman berasal dari jejak yang DITULIS SAAT ITU oleh pelari
 *    (kode saham dan teks buatan tes yang tidak ada di rekaman mana pun), muncul
 *    selagi pelari masih bekerja — tes ini merah bila "Jalankan" memutar rekaman.
 * 2. Tanpa klik setuju / tanpa kunci / budget di luar batas / asal lain →
 *    pelari tidak pernah dipanggil (panggilan dihitung).
 * 3. Permintaan kedua selagi yang pertama bekerja → 409, pelari tidak dipanggil lagi.
 * 4. Hentikan mematikan pelari: tidak ada baris baru sesudahnya.
 */
import { existsSync, appendFileSync, mkdirSync, mkdtempSync, readFileSync, writeFileSync } from 'node:fs';
import { request } from 'node:http';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { afterEach, describe, expect, it } from 'vitest';
import { akarSementara, KUNCI_LLM_PALSU, KUNCI_SECTORS_PALSU, minta, mulaiServer, tulisGudangUji, type ServerUji } from './bantu-uji.ts';
import {
  BUDGET_SUSUN_BAWAAN_USD,
  BUDGET_SUSUN_MAKS_USD,
  SKRIP_PELARI,
  argumenPelari,
  budgetSah,
  jalankanProses,
  pelariTiruan,
  type AkhirLangsung,
  type PelariAgen,
  type PermintaanPelari,
} from './langsung-agen.ts';
import { PerakitLangkah, kodeRekaman, uraiTanpaPenalaran } from './rekaman-agen.ts';
import { langkahTampil, menulisDraf, siapkanReplay, toolDiagram, type KepalaTampil, type LangkahTampil } from './replay-agen.ts';
import { SUMBER_PELARI_TIRUAN, uraiArgumen } from './server.ts';

const AKAR = fileURLToPath(new URL('../../', import.meta.url));
const tunda = (ms: number): Promise<void> => new Promise((b) => setTimeout(b, ms));

/** Kode saham buatan tes: tidak ada di rekaman mana pun dan bukan kode sungguhan. */
const KODE_UJI = 'ZZQX';

/* --- PELARI TIRUAN UJI ---------------------------------------------------------- */

interface PelariUji extends PelariAgen {
  /** Tiap kali server menyalakan pelari, permintaannya dicatat di sini. */
  panggilan: PermintaanPelari[];
  dihentikan: number;
  /** Tulis satu baris (atau potongan mentah) ke `jejak-agen.jsonl` kerja terakhir. */
  tulis(baris: Record<string, unknown>): void;
  tulisMentah(teks: string): void;
  /** Pelari berhenti sendiri; `hasil` ditulis ke `hasil.json` bila diberikan. */
  tamat(hasil?: Record<string, unknown>): void;
}

/** PELARI TIRUAN UJI: menulis hanya apa yang disuruh tes; tidak memanggil apa pun. */
function pelariUji(tiruan: boolean): PelariUji {
  let beres: ((h: { kodeKeluar: number | null }) => void) | null = null;
  const p: PelariUji = {
    tiruan,
    folderDasar: mkdtempSync(join(tmpdir(), 'pn1-pelari-uji-')),
    panggilan: [],
    dihentikan: 0,
    tulis: (baris) => p.tulisMentah(`${JSON.stringify({ waktu: new Date().toISOString(), ...baris })}\n`),
    tulisMentah: (teks) => {
      const terakhir = p.panggilan.at(-1);
      if (terakhir === undefined) throw new Error('pelari uji belum dinyalakan');
      appendFileSync(join(terakhir.folder, 'jejak-agen.jsonl'), teks, 'utf8');
    },
    tamat: (hasil) => {
      const terakhir = p.panggilan.at(-1);
      if (terakhir !== undefined && hasil !== undefined) writeFileSync(join(terakhir.folder, 'hasil.json'), JSON.stringify(hasil), 'utf8');
      beres?.({ kodeKeluar: 0 });
      beres = null;
    },
    mulai: (permintaan) => {
      p.panggilan.push(permintaan);
      mkdirSync(permintaan.folder, { recursive: true });
      const selesai = new Promise<{ kodeKeluar: number | null }>((b) => {
        beres = b;
      });
      return {
        pid: null,
        hentikan: () => {
          p.dihentikan += 1;
          beres?.({ kodeKeluar: null });
          beres = null;
        },
        selesai,
      };
    },
  };
  return p;
}

/* --- pembaca SSE bertahap -------------------------------------------------------- */

interface AliranUji {
  teks: () => string;
  peristiwa: () => Array<{ jenis: string; data: unknown }>;
  /** Tunggu sampai `syarat` benar atas peristiwa yang sudah tiba; melempar bila lewat batas waktu. */
  tunggu: (syarat: (p: Array<{ jenis: string; data: unknown }>) => boolean, batasMs?: number) => Promise<void>;
  tutup: () => void;
}

function bukaAliran(port: number, jalur: string): Promise<AliranUji> {
  return new Promise((jadi, gagal) => {
    const req = request({ host: '127.0.0.1', port, method: 'GET', path: jalur }, (res) => {
      let teks = '';
      res.on('data', (p: Buffer) => {
        teks += p.toString('utf8');
      });
      const peristiwa = (): Array<{ jenis: string; data: unknown }> =>
        teks
          .split('\n\n')
          .map((b) => b.split('\n'))
          .filter((b) => b.some((l) => l.startsWith('event: ')))
          .map((b) => ({
            jenis: b.find((l) => l.startsWith('event: '))?.slice(7) ?? '',
            data: JSON.parse(b.find((l) => l.startsWith('data: '))?.slice(6) ?? 'null') as unknown,
          }));
      jadi({
        teks: () => teks,
        peristiwa,
        tunggu: async (syarat, batasMs = 4_000) => {
          const mulai = Date.now();
          while (!syarat(peristiwa())) {
            if (Date.now() - mulai > batasMs) throw new Error(`batas waktu; peristiwa sejauh ini: ${peristiwa().map((x) => x.jenis).join(', ')}`);
            await tunda(15);
          }
        },
        tutup: () => req.destroy(),
      });
    });
    req.on('error', (e) => {
      if ((e as NodeJS.ErrnoException).code !== 'ECONNRESET') gagal(e);
    });
    req.end();
  });
}

const langkahDari = (p: Array<{ jenis: string; data: unknown }>): LangkahTampil[] => p.filter((x) => x.jenis === 'langkah').map((x) => x.data as LangkahTampil);

/* --- baris jejak buatan tes ------------------------------------------------------- */

const UNIK = `ucapan-unik-pn1-${String(Date.now())}-${Math.random().toString(36).slice(2)}`;
const RAHASIA = 'TEKS-BERPIKIR-RAHASIA-PN1';
const model = (ke: number, memanggil: string[], lain: Record<string, unknown> = {}): Record<string, unknown> => ({
  jenis: 'model', ke, percakapan: 1, status: 200, token_masuk: 100 * ke, token_keluar: 10 * ke, token_penalaran: ke, biaya_usd: 0.01 * ke, latensi_ms: 1_000 * ke, penalaran: `${RAHASIA} langkah ${String(ke)}`, teks: null, memanggil, ...lain,
});
const BARIS_1 = model(1, ['usulkan_hari'], { teks: `${UNIK} untuk ${KODE_UJI}` });
const HASIL_1 = { jenis: 'alat', alat: 'usulkan_hari', ke: 1, ringkas: `2 hari diusulkan untuk ${KODE_UJI} (${UNIK})`, hasil: { hari: [{ tanggal: '2031-01-02' }, { tanggal: '2031-02-03' }], penalaran: RAHASIA } };
const BARIS_2 = model(2, ['periksa_draft_dengan_aturan']);
const HASIL_2 = { jenis: 'alat', alat: 'periksa_draft_dengan_aturan', ke: 1, ringkas: 'tidak lolos', hasil: { lolos: false, penolakan: ['pemeriksa: G-panjang: x'] } };
const BARIS_3 = model(3, ['periksa_draft_dengan_aturan']);
const HASIL_3 = { jenis: 'alat', alat: 'periksa_draft_dengan_aturan', ke: 2, ringkas: 'lolos', hasil: { lolos: true, id_draf: 'd1' } };

const SETUJU = { kode: KODE_UJI, setuju: true, budget_usd: BUDGET_SUSUN_BAWAAN_USD };

let s: ServerUji | null = null;
let a: AliranUji | null = null;
afterEach(async () => {
  a?.tutup();
  a = null;
  // Kerja yang masih berlangsung dimatikan (pelari tiruan uji; hanya milik tes ini).
  s?.keadaan.langsung?.hentikan();
  await s?.tutup();
  s = null;
});

/** Server tampilan AI agent dengan pelari uji; `kunci`: `.env` palsu terisi atau tidak ada. */
async function serverUji(pelari: PelariAgen, kunci: boolean, denganData = true): Promise<ServerUji> {
  const akar = kunci ? akarSementara() : akarSementara(null);
  if (denganData) tulisGudangUji(akar, KODE_UJI, [{ tanggal: '2031-01-02', tutup: 100, volume: 1_000 }, { tanggal: '2031-01-03', tutup: 101, volume: 1_100 }]);
  return mulaiServer({ akar, replayAgen: {}, agenLangsung: { pelari, selangMs: 15 } });
}

describe('§3 (1): langkah di halaman = jejak yang ditulis pelari SAAT ITU, bukan rekaman', () => {
  it('langkah muncul selagi pelari masih bekerja, dengan isi buatan tes yang tidak ada di rekaman mana pun', async () => {
    const pelari = pelariUji(true);
    s = await serverUji(pelari, false);
    const mulai = await minta(s.port, 'POST', '/api/agen/jalankan', { badan: SETUJU });
    expect(mulai.status).toBe(202);
    const jawab = mulai.json() as { id: string; folder: string; tiruan: boolean };
    expect(jawab.tiruan).toBe(true);
    expect(pelari.panggilan).toHaveLength(1);
    expect(pelari.panggilan[0]).toMatchObject({ kode: KODE_UJI, budgetUsd: BUDGET_SUSUN_BAWAAN_USD, id: jawab.id, kreditSectors: false });

    a = await bukaAliran(s.port, '/api/agen/langsung/aliran');
    await a.tunggu((p) => p.some((x) => x.jenis === 'kepala'));
    const kepala = a.peristiwa()[0]?.data as KepalaTampil;
    expect(kepala.mode).toBe('langsung');
    expect(kepala.jumlah_langkah).toBeNull();
    expect(kepala.budget_usd).toBe(BUDGET_SUSUN_BAWAAN_USD);
    expect(kepala.sumber).toEqual([`${jawab.folder}jejak-agen.jsonl (teks berpikir model tidak ikut)`]);
    // Pelari belum menulis apa pun: belum ada satu langkah pun (rekaman punya 21).
    await tunda(80);
    expect(langkahDari(a.peristiwa())).toHaveLength(0);

    // Langkah 1 ditulis lengkap, tetapi belum tertutup: belum dikirim.
    pelari.tulis({ jenis: 'percakapan', ke: 1, bank: 0 });
    pelari.tulis(BARIS_1);
    pelari.tulis(HASIL_1);
    await tunda(80);
    expect(langkahDari(a.peristiwa())).toHaveLength(0);

    // Baris model langkah 2 tiba → langkah 1 tertutup dan dikirim, selagi pelari MASIH bekerja.
    pelari.tulis(BARIS_2);
    await a.tunggu((p) => langkahDari(p).length === 1);
    const status = (await minta(s.port, 'GET', '/api/status')).json() as { jalankan: { tiruan: boolean; kerja: { keadaan: string; kode: string; id: string } } };
    expect(status.jalankan.tiruan).toBe(true);
    expect(status.jalankan.kerja).toMatchObject({ keadaan: 'bekerja', kode: KODE_UJI, id: jawab.id });
    const l1 = langkahDari(a.peristiwa())[0] as LangkahTampil;
    expect(l1.no).toBe(1);
    expect(l1.memanggil).toEqual(['usulkan_hari']);
    // Isi buatan tes sampai ke halaman: mustahil bila server memutar rekaman.
    expect(l1.ucapan).toContain(UNIK);
    expect(l1.hasil[0]?.asli.ringkas).toContain(UNIK);
    expect(l1.biaya_model_usd).toBe(0.01);
    expect(l1.lama_ms).toBe(1_000);

    // Baris yang baru setengah ditulis tidak diolah sampai barisnya utuh.
    const utuh = `${JSON.stringify({ waktu: 'x', ...HASIL_2 })}\n`;
    pelari.tulisMentah(utuh.slice(0, 40));
    await tunda(80);
    pelari.tulisMentah(utuh.slice(40));
    pelari.tulis(BARIS_3);
    await a.tunggu((p) => langkahDari(p).length === 2);
    pelari.tulis(HASIL_3);
    await tunda(60);
    expect(langkahDari(a.peristiwa())).toHaveLength(2);

    // Pelari berhenti: langkah terakhir dikirim, lalu keadaan akhir, lalu selesai.
    pelari.tamat({ id: jawab.id, berhenti: 'bank bisa dirakit menjadi simulasi', biaya_usd: 0.4242, simulasi: { terbit: true } });
    await a.tunggu(() => (a as AliranUji).teks().includes('event: selesai'));
    const semua = a.peristiwa();
    expect(semua.map((x) => x.jenis)).toEqual(['kepala', 'langkah', 'langkah', 'langkah', 'akhir', 'selesai']);
    const akhir = semua.at(-2)?.data as AkhirLangsung;
    expect(akhir).toEqual({ hasil: 'terakit', folder: jawab.folder, biaya_usd: 0.4242, jumlah_langkah: 3, tiruan: true });

    // Satu jalur kebenaran (D-1): yang dikirim = pemetaan replay atas baris yang sama.
    const terlarang = [KODE_UJI];
    const perakit = new PerakitLangkah({ percobaan: 0, mode: 'dari-kode', awal: 0, terlarang, label: 'uji' });
    for (const b of [BARIS_1, HASIL_1, BARIS_2, HASIL_2, BARIS_3, HASIL_3]) perakit.terima(uraiTanpaPenalaran(JSON.stringify(b)) as { jenis?: string });
    const tool = toolDiagram([]);
    const harap = perakit.langkah.map((l, i) => langkahTampil(l, tool, perakit.langkah[i + 1] !== undefined && menulisDraf(perakit.langkah[i + 1] as (typeof perakit.langkah)[number])));
    expect(langkahDari(semua)).toEqual(JSON.parse(JSON.stringify(harap)));
    // Langkah 2 diminta perbaiki dan langkah 3 menulis draf lagi → sambungan "Agent menulis ulang." (dihitung, bukan diketik).
    expect(langkahDari(semua)[1]?.ringkas[0]?.kalimat).toMatch(/Agent menulis ulang\.$/);
    expect(langkahDari(semua)[1]?.tahap).toBe('tulis');
    expect(langkahDari(semua)[0]?.tahap).toBe('bahan');

    // D-6: teks berpikir tidak pernah sampai; kode saham disamarkan seperti di replay.
    const badan = a.teks();
    expect(badan).not.toContain(RAHASIA);
    expect(badan).not.toMatch(/penalaran/);
    expect(badan).not.toContain(KODE_UJI);
    expect(badan).toContain('[kode]');

    // Bukan rekaman: tidak ada satu pun ucapan atau ringkasan tool result rekaman di aliran ini.
    const rekaman = siapkanReplay();
    for (const l of rekaman.langkah) {
      if (l.ucapan !== null) expect(badan.includes(JSON.stringify(l.ucapan).slice(1, 60)), `ucapan langkah ${String(l.no)}`).toBe(false);
      for (const h of l.hasil) if (h.asli.ringkas.length > 30) expect(badan.includes(JSON.stringify(h.asli.ringkas).slice(1, -1)), `ringkasan langkah ${String(l.no)}`).toBe(false);
    }
    expect(langkahDari(semua).length).not.toBe(rekaman.langkah.length);

    // Sambungan baru sesudah selesai: seluruh peristiwa diulang dari jejak yang sama.
    const ulang = await bukaAliran(s.port, '/api/agen/langsung/aliran');
    await ulang.tunggu(() => ulang.teks().includes('event: selesai'));
    expect(ulang.peristiwa()).toEqual(semua);
    ulang.tutup();
  });

  it('pembaca jejak langsung tidak mengimpor rekaman, dan rute langsung tidak memanggil pengirim replay', () => {
    const sumber = readFileSync(join(AKAR, 'alat/penyusun/langsung-agen.ts'), 'utf8').replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');
    expect(sumber).not.toMatch(/dataJejak|siapkanReplay|KONFIG_JEJAK|peristiwaReplay|kirimReplay|kodeRekaman|simulasiTampil/);
    expect(sumber).toMatch(/PerakitLangkah/);
    expect(sumber).toMatch(/langkahTampil/);
    const server = readFileSync(join(AKAR, 'alat/penyusun/server.ts'), 'utf8');
    // `kirimReplay` hanya dipanggil satu kali di server: di rute "Putar ulang rekaman".
    expect(server.match(/kirimReplay\(/g)).toHaveLength(1);
    expect(server).toMatch(/daftarRute\('GET', '\/api\/agen\/aliran'[\s\S]{0,600}kirimReplay\(res, a\)/);
    const ruteLangsung = /daftarRute\('GET', '\/api\/agen\/langsung\/aliran'[\s\S]*?\n\}\);/.exec(server)?.[0] ?? '';
    expect(ruteLangsung).toMatch(/keadaan\.langsung\.sambung\(res\)/);
    expect(ruteLangsung).not.toMatch(/keadaan\.agen\./);
  });

  it('"Putar ulang rekaman" tetap rekaman; kode tanpa rekaman tidak diam-diam dijalankan', async () => {
    const pelari = pelariUji(false);
    s = await serverUji(pelari, true);
    expect((await minta(s.port, 'GET', `/api/agen/aliran?kode=${KODE_UJI}`)).status).toBe(404);
    expect((await minta(s.port, 'GET', `/api/agen/aliran?kode=${kodeRekaman()}`)).status).toBe(200);
    expect((await minta(s.port, 'GET', '/api/agen/langsung/aliran')).status).toBe(404);
    expect(pelari.panggilan).toHaveLength(0);
  });

  it('keadaan akhir dibaca dari hasil.json pelari: budget, berhenti karena sebab lain, tanpa hasil', async () => {
    const pelari = pelariUji(true);
    s = await serverUji(pelari, false);
    const akhirDari = async (hasil: Record<string, unknown> | undefined): Promise<AkhirLangsung> => {
      const srv = s as ServerUji;
      expect((await minta(srv.port, 'POST', '/api/agen/jalankan', { badan: SETUJU })).status).toBe(202);
      pelari.tulis(BARIS_1);
      pelari.tamat(hasil);
      const al = await bukaAliran(srv.port, '/api/agen/langsung/aliran');
      await al.tunggu(() => al.teks().includes('event: selesai'));
      const akhir = al.peristiwa().find((x) => x.jenis === 'akhir')?.data as AkhirLangsung;
      al.tutup();
      return akhir;
    };
    expect(await akhirDari({ berhenti: 'anggaran tidak cukup untuk satu langkah lagi', biaya_usd: 1.49, simulasi: { terbit: false } })).toMatchObject({ hasil: 'budget', biaya_usd: 1.49, jumlah_langkah: 1 });
    expect(await akhirDari({ berhenti: 'batas percakapan', biaya_usd: 0.9, simulasi: { terbit: false } })).toMatchObject({ hasil: 'berhenti' });
    expect(await akhirDari(undefined)).toMatchObject({ hasil: 'tanpa-hasil', biaya_usd: null });
    // Tiga kerja, tiga folder berbeda (jam uji tetap → id diberi akhiran).
    expect(new Set(pelari.panggilan.map((p) => p.id)).size).toBe(3);
    for (const p of pelari.panggilan) expect(p.id).toMatch(/^[a-z0-9-]{3,40}$/);
  });
});

describe('§3 (2): pagar uang — pelari tidak pernah dipanggil tanpa kunci, klik setuju, dan budget dalam batas', () => {
  it('tanpa kunci: status menyebut nama variabel yang kosong; POST jalankan 400; pelari 0 panggilan', async () => {
    const pelari = pelariUji(false);
    s = await serverUji(pelari, false);
    const status = (await minta(s.port, 'GET', '/api/status')).json() as { jalankan: { siap: boolean; alasan: string; tiruan: boolean; budget_bawaan_usd: number; budget_maks_usd: number; kerja: unknown } };
    expect(status.jalankan).toMatchObject({ siap: false, tiruan: false, budget_bawaan_usd: 1.5, budget_maks_usd: 2, kerja: null });
    expect(status.jalankan.alasan).toMatch(/LLM_API_KEY/);
    expect(status.jalankan.alasan).toMatch(/\.env/);
    const j = await minta(s.port, 'POST', '/api/agen/jalankan', { badan: SETUJU });
    expect(j.status).toBe(400);
    expect((j.json() as { galat: string }).galat).toMatch(/LLM_API_KEY/);
    expect(pelari.panggilan).toHaveLength(0);
    expect(s.keadaan.langsung).toBeNull();
  });

  it('dengan kunci: tanpa klik setuju, budget di luar batas, asal lain, jenis badan lain → pelari 0 panggilan; baru permintaan sah yang memanggilnya', async () => {
    const pelari = pelariUji(false);
    s = await serverUji(pelari, true);
    const port = s.port;
    const status = (await minta(port, 'GET', '/api/status')).json() as { jalankan: { siap: boolean; alasan: string | null } };
    expect(status.jalankan).toMatchObject({ siap: true, alasan: null });
    const semuaJawaban: string[] = [JSON.stringify(status)];
    const coba = async (badan: unknown, header?: Record<string, string>): Promise<number> => {
      const j = await minta(port, 'POST', '/api/agen/jalankan', { badan, ...(header === undefined ? {} : { header }) });
      semuaJawaban.push(j.teks);
      return j.status;
    };
    // Tanpa klik setuju (hanya `true` yang dihitung).
    for (const setuju of [undefined, false, 'true', 1, null]) expect(await coba({ ...SETUJU, setuju }), `setuju=${String(setuju)}`).toBe(400);
    // Budget di atas batas, nol, negatif, bukan angka.
    expect(BUDGET_SUSUN_MAKS_USD).toBe(2);
    for (const budget of [2.01, 5, 100, 0, -1, '1.5', null, undefined]) expect(await coba({ ...SETUJU, budget_usd: budget }), `budget=${String(budget)}`).toBe(400);
    expect(budgetSah(2)).toBe(2);
    expect(budgetSah(2.000001)).toBeNull();
    expect(budgetSah(Number.NaN)).toBeNull();
    expect(budgetSah(Number.POSITIVE_INFINITY)).toBeNull();
    // Kode tidak sah.
    expect(await coba({ ...SETUJU, kode: 'ZZ' })).toBe(400);
    // Pagar server yang sudah ada: asal lain, Host lain, bukan JSON.
    expect(await coba(SETUJU, { Origin: 'http://evil.example' })).toBe(403);
    expect(await coba(SETUJU, { Host: 'evil.example' })).toBe(403);
    expect(await coba(JSON.stringify(SETUJU), { 'Content-Type': 'text/plain' })).toBe(415);
    // GET tidak pernah menyalakan apa pun.
    expect((await minta(port, 'GET', '/api/agen/jalankan')).status).toBeGreaterThanOrEqual(400);
    expect(pelari.panggilan).toHaveLength(0);
    expect(s.keadaan.langsung).toBeNull();

    // Permintaan sah, sama-asal: pelari dipanggil tepat satu kali, dengan budget yang disetujui.
    expect(await coba({ ...SETUJU, budget_usd: 2 }, { Origin: `http://127.0.0.1:${String(port)}` })).toBe(202);
    expect(pelari.panggilan).toHaveLength(1);
    expect(pelari.panggilan[0]).toMatchObject({ kode: KODE_UJI, budgetUsd: 2, kreditSectors: false });
    // Nilai kunci tidak pernah keluar lewat respons atau log.
    for (const t of [...semuaJawaban, ...s.log]) {
      expect(t).not.toContain(KUNCI_LLM_PALSU);
      expect(t).not.toContain(KUNCI_SECTORS_PALSU);
    }
  });

  it('data saham belum ada di cache: tanpa izin kredit Sectors pelari tidak dipanggil; dengan izin, benderanya diteruskan', async () => {
    const pelari = pelariUji(false);
    s = await serverUji(pelari, true, false);
    const siap = (await minta(s.port, 'GET', `/api/agen/siap?kode=${KODE_UJI}`)).json() as { ada_data: boolean; perlu_kredit: boolean; sectors_siap: boolean };
    expect(siap).toMatchObject({ ada_data: false, perlu_kredit: true, sectors_siap: true });
    const tanpa = await minta(s.port, 'POST', '/api/agen/jalankan', { badan: SETUJU });
    expect(tanpa.status).toBe(400);
    expect((tanpa.json() as { galat: string }).galat).toMatch(/kredit Sectors/);
    expect(pelari.panggilan).toHaveLength(0);
    expect((await minta(s.port, 'POST', '/api/agen/jalankan', { badan: { ...SETUJU, setuju_kredit: true } })).status).toBe(202);
    expect(pelari.panggilan).toHaveLength(1);
    expect(pelari.panggilan[0]?.kreditSectors).toBe(true);
  });

  it('argumen pelari sungguhan = `npm run agen -- --id … --kode … --pagu … --setuju-berbayar`; izin kredit hanya bila disetujui', () => {
    expect(argumenPelari({ id: 'pn-x', kode: 'ZZQX', budgetUsd: 1.5, kreditSectors: false })).toEqual(['--experimental-strip-types', 'alat/agen/jalan-agen.ts', '--id', 'pn-x', '--kode', 'ZZQX', '--pagu', '1.5', '--setuju-berbayar']);
    expect(argumenPelari({ id: 'pn-x', kode: 'ZZQX', budgetUsd: 2, kreditSectors: true }).slice(-2)).toEqual(['--setuju-berbayar', '--setuju-kredit-sectors']);
    expect(existsSync(join(AKAR, SKRIP_PELARI))).toBe(true);
    // Skrip `npm run agen` menunjuk berkas yang sama: pelari tidak ditulis ulang.
    const paket = JSON.parse(readFileSync(join(AKAR, 'package.json'), 'utf8')) as { scripts: Record<string, string> };
    expect(paket.scripts['agen']).toBe(`node --experimental-strip-types ${SKRIP_PELARI}`);
    // Bendera persetujuan berbayar hanya dirakit di satu tempat di pintu penyusun.
    const sumber = readFileSync(join(AKAR, 'alat/penyusun/langsung-agen.ts'), 'utf8').replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');
    expect(sumber.match(/'--setuju-berbayar'/g)).toHaveLength(1);
    expect(readFileSync(join(AKAR, 'alat/penyusun/server.ts'), 'utf8')).not.toMatch(/'--setuju-berbayar'/);
  });
});

describe('§3 (3): hanya satu kerja pada satu waktu', () => {
  it('permintaan kedua selagi yang pertama bekerja → 409 dengan kalimat jelas; pelari tidak dipanggil lagi; sesudah selesai boleh lagi', async () => {
    const pelari = pelariUji(false);
    s = await serverUji(pelari, true);
    expect((await minta(s.port, 'POST', '/api/agen/jalankan', { badan: SETUJU })).status).toBe(202);
    const idPertama = pelari.panggilan[0]?.id;
    for (let i = 0; i < 3; i++) {
      const kedua = await minta(s.port, 'POST', '/api/agen/jalankan', { badan: SETUJU });
      expect(kedua.status).toBe(409);
      expect((kedua.json() as { galat: string }).galat).toMatch(/hanya satu yang boleh bekerja pada satu waktu/);
    }
    expect(pelari.panggilan).toHaveLength(1);
    expect(s.keadaan.langsung?.id).toBe(idPertama);
    pelari.tamat({ berhenti: 'agen berhenti sendiri', biaya_usd: 0.1, simulasi: { terbit: false } });
    await tunda(30);
    expect(s.keadaan.langsung?.keadaan).toBe('selesai');
    expect((await minta(s.port, 'POST', '/api/agen/jalankan', { badan: SETUJU })).status).toBe(202);
    expect(pelari.panggilan).toHaveLength(2);
    expect(pelari.panggilan[1]?.id).not.toBe(idPertama);
  });
});

describe('§3 (4): Hentikan mematikan pelari', () => {
  /** Jejak contoh untuk pelari tiruan modul (`pelariTiruan`): 40 langkah satu baris. */
  function sumberContoh(): string {
    const folder = mkdtempSync(join(tmpdir(), 'pn1-sumber-'));
    writeFileSync(join(folder, 'jejak-agen.jsonl'), Array.from({ length: 40 }, (_, i) => JSON.stringify(model(i + 1, ['lihat_fakta']))).join('\n') + '\n', 'utf8');
    writeFileSync(join(folder, 'hasil.json'), JSON.stringify({ berhenti: 'bank bisa dirakit menjadi simulasi', biaya_usd: 1, simulasi: { terbit: true } }), 'utf8');
    return folder;
  }

  it('pelari tiruan berhenti menulis sesudah Hentikan; keadaan akhir "dihentikan"; Hentikan kedua 409', async () => {
    const pelari = pelariTiruan({ folderDasar: mkdtempSync(join(tmpdir(), 'pn1-tiruan-')), sumber: sumberContoh(), jedaMs: 25 });
    expect(pelari.tiruan).toBe(true);
    s = await serverUji(pelari, false);
    // Belum ada yang bekerja: Hentikan 409.
    expect((await minta(s.port, 'POST', '/api/agen/hentikan', { badan: {} })).status).toBe(409);
    const mulai = (await minta(s.port, 'POST', '/api/agen/jalankan', { badan: SETUJU })).json() as { id: string };
    const jejak = join(pelari.folderDasar, mulai.id, 'jejak-agen.jsonl');
    const jumlahBaris = (): number => (existsSync(jejak) ? readFileSync(jejak, 'utf8').split('\n').filter((b) => b !== '').length : 0);
    a = await bukaAliran(s.port, '/api/agen/langsung/aliran');
    await a.tunggu((p) => langkahDari(p).length >= 2);
    const henti = await minta(s.port, 'POST', '/api/agen/hentikan', { badan: {}, header: { Origin: `http://127.0.0.1:${String(s.port)}` } });
    expect(henti.status).toBe(202);
    await a.tunggu(() => (a as AliranUji).teks().includes('event: selesai'));
    const saatHenti = jumlahBaris();
    expect(saatHenti).toBeGreaterThanOrEqual(3);
    expect(saatHenti).toBeLessThan(40);
    const akhir = a.peristiwa().find((x) => x.jenis === 'akhir')?.data as AkhirLangsung;
    expect(akhir).toMatchObject({ hasil: 'dihentikan', tiruan: true, jumlah_langkah: saatHenti });
    // Sesudah Hentikan pelari tidak menulis apa pun lagi, dan tidak menulis hasil.json.
    await tunda(250);
    expect(jumlahBaris()).toBe(saatHenti);
    expect(existsSync(join(pelari.folderDasar, mulai.id, 'hasil.json'))).toBe(false);
    const status = (await minta(s.port, 'GET', '/api/status')).json() as { jalankan: { kerja: { keadaan: string } } };
    expect(status.jalankan.kerja.keadaan).toBe('dihentikan');
    expect((await minta(s.port, 'POST', '/api/agen/hentikan', { badan: {} })).status).toBe(409);
    // Hentikan dari asal lain tidak dilayani.
    expect((await minta(s.port, 'POST', '/api/agen/hentikan', { badan: {}, header: { Origin: 'http://evil.example' } })).status).toBe(403);
  });

  it('Hentikan memanggil `hentikan` pelari tepat satu kali', async () => {
    const pelari = pelariUji(false);
    s = await serverUji(pelari, true);
    await minta(s.port, 'POST', '/api/agen/jalankan', { badan: SETUJU });
    expect(pelari.dihentikan).toBe(0);
    expect((await minta(s.port, 'POST', '/api/agen/hentikan', { badan: {} })).status).toBe(202);
    await tunda(30);
    expect(pelari.dihentikan).toBe(1);
    expect(s.keadaan.langsung?.keadaan).toBe('dihentikan');
  });

  it('pelari sungguhan adalah proses anak: `hentikan` benar-benar mematikan prosesnya (proses contoh yang tidak memanggil apa pun)', async () => {
    const log: string[] = [];
    // BUKAN pelari agent: proses node kosong yang hanya menunggu. Yang diuji = mesin nyalakan/matikan proses anak.
    const p = jalankanProses(process.execPath, ['-e', 'console.log("hidup"); setInterval(() => {}, 1000)'], tmpdir(), (b) => log.push(b));
    expect(p.pid).toBeTypeOf('number');
    const mulai = Date.now();
    while (!log.some((b) => b.includes('hidup')) && Date.now() - mulai < 8_000) await tunda(20);
    expect(log).toContain('agent | hidup');
    expect(() => process.kill(p.pid as number, 0)).not.toThrow();
    p.hentikan();
    const akhir = await Promise.race([p.selesai, tunda(8_000).then(() => 'batas waktu' as const)]);
    expect(akhir).not.toBe('batas waktu');
    await tunda(100);
    expect(() => process.kill(p.pid as number, 0)).toThrow();
  }, 20_000);
});

describe('D-3: pelari tiruan selalu bertanda', () => {
  it('--pelari-tiruan diurai, hanya di tampilan AI agent', () => {
    expect(uraiArgumen([], 'D:/r/').pelariTiruan).toBe(false);
    expect(uraiArgumen(['--pelari-tiruan'], 'D:/r/')).toMatchObject({ pelariTiruan: true, replayAgen: true });
    expect(() => uraiArgumen(['--mesin-lama', '--pelari-tiruan'], 'D:/r/')).toThrow(/--pelari-tiruan/);
    expect(() => uraiArgumen(['--tayang-ulang', 'x', '--pelari-tiruan'], 'D:/r/')).toThrow(/--pelari-tiruan/);
  });

  it('pelari tiruan baris perintah (menyalin jejak di repo): bertanda di status, di peristiwa akhir, dan di hasil.json; tanpa kunci; tidak menulis ke eval/', async () => {
    const pelari = pelariTiruan({ folderDasar: mkdtempSync(join(tmpdir(), 'pn1-tiruan-')), sumber: join(AKAR, SUMBER_PELARI_TIRUAN), jedaMs: 2 });
    s = await serverUji(pelari, false);
    const status = (await minta(s.port, 'GET', '/api/status')).json() as { jalankan: { siap: boolean; tiruan: boolean } };
    expect(status.jalankan).toMatchObject({ siap: true, tiruan: true });
    const mulai = (await minta(s.port, 'POST', '/api/agen/jalankan', { badan: SETUJU })).json() as { id: string; folder: string; tiruan: boolean };
    expect(mulai.tiruan).toBe(true);
    expect(mulai.folder).not.toMatch(/eval\/penyusun/);
    a = await bukaAliran(s.port, '/api/agen/langsung/aliran');
    await a.tunggu(() => (a as AliranUji).teks().includes('event: selesai'), 8_000);
    const semua = a.peristiwa();
    const sumber = JSON.parse(readFileSync(join(AKAR, SUMBER_PELARI_TIRUAN, 'hasil.json'), 'utf8')) as { langkah: number; kode: string };
    expect(langkahDari(semua)).toHaveLength(sumber.langkah);
    expect(semua.at(-2)?.data).toMatchObject({ hasil: 'terakit', tiruan: true });
    const hasil = JSON.parse(readFileSync(join(pelari.folderDasar, mulai.id, 'hasil.json'), 'utf8')) as { pelari_tiruan: boolean; id: string };
    expect(hasil).toMatchObject({ pelari_tiruan: true, id: mulai.id });
    // Kode saham dan nama perusahaan jejak sumber disamarkan (dari paket.json), teks berpikir tidak ikut.
    const badan = a.teks();
    expect(badan.toLowerCase()).not.toContain(sumber.kode.toLowerCase());
    expect(badan).not.toMatch(/asuransi multi/i);
    expect(badan).not.toMatch(/penalaran/);
    expect(badan).not.toMatch(/[A-Za-z]:[\\/]Projects/);
  }, 20_000);
});
