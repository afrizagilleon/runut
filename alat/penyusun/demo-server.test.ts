/**
 * M2d-14 T-3: mode demo lewat server sungguhan (127.0.0.1, port bebas), tanpa jaringan.
 *
 * Rekaman dibuat dulu oleh jalur yang SAMA dengan jalan biasa (mesin bebas, model palsu)
 * atas gudang buatan UJIX; lalu server demo memutar rekaman itu:
 * - tahap 1–4 hidup (perkiraan menyebut mode demo), persetujuan klik TIDAK menjalankan agen;
 * - tahap agen = baris log rekaman byte demi byte, dengan penanda jeda;
 * - kalimat transisi & penanda rekaman: dari status demo + ringkas.js;
 * - suntingan diuji ulang gerbang kode; gerbang AI tanpa pagu → "belum diuji ulang";
 * - setujui ditolak bila belum lolos; folder jalan rekaman tidak berubah; tidak ada ledger.
 */
import { existsSync, readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';
import { afterEach, beforeAll, describe, expect, it } from 'vitest';
import { deretHarga } from './bantu-data.ts';
import { akarSementara, bacaSse, minta, mulaiServer, peristiwaSse, tulisGudangUji, type ServerUji } from './bantu-uji.ts';
import { uraiArgumen } from './server.ts';
import { bandingkanRekaman, barisLog, dataTahapSse, JamVirtual } from './tayang-ulang.ts';

interface Ringkas {
  teksTransisiDemo(d: unknown): string | null;
  teksModeDemo(d: unknown): string | null;
  teksSumberUji(u: unknown): string;
  TEKS_AI_BELUM: string;
}
let R: Ringkas;
const HALAMAN = new URL('./halaman/', import.meta.url);
beforeAll(async () => {
  R = (await import(pathToFileURL(join(HALAMAN.pathname.replace(/^\/([A-Za-z]:)/, '$1'), 'ringkas.js')).href)) as Ringkas;
});

const daftar: ServerUji[] = [];
afterEach(async () => {
  for (const s of daftar.splice(0)) await s.tutup();
});

function akarUjix(): { akar: string; t: string } {
  const akar = akarSementara();
  const harga = deretHarga('2026-03-02', 60, (i) => (i >= 12 && i <= 19 ? 100 + (i - 11) * 6 : i > 19 ? 148 : 100), (i) => (i === 20 ? 0 : 1000));
  const t = harga[20]?.tanggal as string;
  tulisGudangUji(akar, 'UJIX', harga, [{ tanggal: t, alasan: 'Peningkatan harga kumulatif yang signifikan' }]);
  return { akar, t };
}

/** Buat rekaman nyata lewat jalur biasa: mesin bebas (penulis palsu) di gudang UJIX. */
async function buatRekaman(akar: string, t: string, id: string): Promise<string> {
  const s = await mulaiServer({ akar, palsu: true, namaMesin: 'bebas', penulisBebas: 'opus' });
  daftar.push(s);
  expect((await minta(s.port, 'POST', '/api/siapkan', { badan: { kode: 'UJIX', tanggal: t, jendela: 10, id } })).status).toBe(202);
  await bacaSse(s.port, `/api/jalan/${id}/aliran`, {}, 1500);
  expect((await minta(s.port, 'POST', `/api/jalan/${id}/mulai`, { badan: { setuju: true, pagu_usd: 0.6 } })).status).toBe(202);
  await bacaSse(s.port, `/api/jalan/${id}/aliran?sesudah=4`, {}, 20_000);
  const folder = join(akar, 'eval', 'penyusun', id);
  expect(existsSync(join(folder, 'hasil.json'))).toBe(true);
  return folder;
}

function sidikFolder(f: string): Record<string, string> {
  return Object.fromEntries(readdirSync(f).map((n) => [n, readFileSync(join(f, n), 'utf8')]));
}

async function siapkanDemo(): Promise<{ s: ServerUji; akar: string; t: string; folder: string; jam: JamVirtual; sebelum: Record<string, string> }> {
  const { akar, t } = akarUjix();
  const folder = await buatRekaman(akar, t, 'rek-ujix');
  const jalurSunting = join(akar, 'suntingan.json');
  writeFileSync(jalurSunting, JSON.stringify({
    jalan: 'rek-ujix', draf: 'akhir', penyetuju: 'penyetuju uji',
    putaran: [{ ke: 1, oleh: 'penyetuju uji', alasan: 'uji', ubah: [{ omongan: 2, lokasi: 'penjelasan', teks: 'Penjelasan baru dari penyetuju uji tanpa angka.' }] }],
  }), 'utf8');
  const sebelum = sidikFolder(folder);
  const jam = new JamVirtual();
  const s = await mulaiServer({ akar, demo: { folder, draf: 'akhir', suntingan: jalurSunting, paguUjiUlangUsd: null, jam } });
  daftar.push(s);
  return { s, akar, t, folder, jam, sebelum };
}

/** Baca SSE sambil memajukan jam virtual sampai `event: selesai`. */
async function bacaSambilMaju(s: ServerUji, jalur: string): Promise<string> {
  const p = bacaSse(s.port, jalur, {}, 20_000);
  await new Promise((r) => setTimeout(r, 50));
  for (let i = 0; i < 200; i++) {
    const m = (await minta(s.port, 'POST', '/api/tayang/maju', { badan: { ms: 2_000 } })).json() as { selesai: boolean; uji?: { selesai: boolean } };
    if (jalur.includes('uji-ulang') ? m.uji?.selesai === true : m.selesai) break;
  }
  return (await p).teks;
}

describe('argumen demo', () => {
  it('--demo butuh --suntingan; --pagu-uji-ulang ≤ 0,15; tidak bisa digabung --palsu/--tayang-ulang', () => {
    expect(() => uraiArgumen(['--demo', 'eval/penyusun/x'])).toThrow(/--suntingan/);
    expect(() => uraiArgumen(['--demo', 'eval/penyusun/x', '--suntingan', 's.json', '--pagu-uji-ulang', '0.2'])).toThrow(/≤ 0.15/);
    expect(() => uraiArgumen(['--demo', 'eval/penyusun/x', '--suntingan', 's.json', '--palsu'])).toThrow(/tidak bisa digabung/);
    expect(() => uraiArgumen(['--pagu-uji-ulang', '0.1'])).toThrow(/hanya berlaku bersama --demo/);
    expect(uraiArgumen(['--demo', 'eval/penyusun/x', '--suntingan', 's.json', '--pagu-uji-ulang', '0.15', '--jam-virtual']).demo).toEqual({ folder: 'eval/penyusun/x', draf: 'akhir', suntingan: 's.json', paguUjiUlangUsd: 0.15 });
  });
});

describe('mode demo lewat server', () => {
  it('alur penuh: tahap 1–4 hidup → klik setuju memutar log apa adanya → penyetuju hidup; folder jalan rekaman tidak berubah', async () => {
    const { s, akar, t, folder, sebelum } = await siapkanDemo();
    // status: penanda mode demo + kalimat transisi dari log
    const st = (await minta(s.port, 'GET', '/api/status')).json() as { mode: string; demo: Record<string, unknown> };
    expect(st.mode).toBe('demo');
    const log = barisLog(readFileSync(join(folder, 'aliran.jsonl'), 'utf8'));
    const hasil = JSON.parse(log.at(-1) ?? '{}') as { tahap: string; isi: { biaya_usd: number; biaya_ledger_usd: number | null } };
    expect(hasil.tahap).toBe('hasil');
    expect(st.demo['biaya_asli_usd']).toBe(hasil.isi.biaya_ledger_usd ?? hasil.isi.biaya_usd);
    expect(R.teksTransisiDemo(st.demo)).toMatch(/^Bagian agen diputar dari jalan nyata rek-ujix \(biaya asli US\$\d,\d{4}\)\.$/);
    expect(R.teksModeDemo(st.demo)).toContain('Bagian agen diputar dari log jalan nyata rek-ujix');
    expect(st.demo['label']).toMatch(/^Rekaman jalan rek-ujix, /);
    // tindakan di luar demo ditolak
    expect((await minta(s.port, 'POST', '/api/ambil-data', { badan: { kode: 'ABCD', setuju: true } })).status).toBe(409);
    // tahap 1–4 hidup
    expect((await minta(s.port, 'POST', '/api/siapkan', { badan: { kode: 'UJIX', tanggal: t, jendela: 10, id: 'demo-hidup' } })).status).toBe(202);
    const hidup = peristiwaSse((await bacaSse(s.port, '/api/jalan/demo-hidup/aliran', {}, 1500)).teks);
    expect(hidup.map((p) => p.tahap)).toEqual(['data', 'aturan', 'paket', 'perkiraan']);
    expect(hidup[3]?.judul).toMatch(/Mode demo: klik setuju TIDAK memanggil model; bagian agen diputar dari log jalan nyata rek-ujix/);
    expect(hidup[3]?.isi['demo']).toEqual({ id: 'rek-ujix', pagu_usd: 0.6 });
    // jalan hidup tidak ditulis ke eval/
    expect(existsSync(join(akar, 'eval', 'penyusun', 'demo-hidup'))).toBe(false);
    // persetujuan: wajib setuju
    expect((await minta(s.port, 'POST', '/api/jalan/demo-hidup/mulai', { badan: { pagu_usd: 0.6 } })).status).toBe(400);
    const m = await minta(s.port, 'POST', '/api/jalan/demo-hidup/mulai', { badan: { setuju: true, pagu_usd: 0.6 } });
    expect(m.status).toBe(202);
    // tahap agen = baris log rekaman sesudah perkiraan, byte demi byte, dengan penanda jeda
    const teks = await bacaSambilMaju(s, '/api/jalan/demo-hidup/aliran?sesudah=4');
    const iPerk = log.findIndex((b) => (JSON.parse(b) as { tahap: string }).tahap === 'perkiraan');
    expect(bandingkanRekaman(log.slice(iPerk + 1), dataTahapSse(teks))).toEqual([]);
    expect(teks).toContain('event: tayang');
    expect(teks).toContain('event: selesai');
    // potret sesudah tahap agen: isi jalan rekaman + panel demo
    const j = (await minta(s.port, 'GET', '/api/jalan/demo-hidup')).json() as { id: string; demo: { status_omongan: unknown[]; boleh: { boleh: boolean } } };
    expect(j.id).toBe('rek-ujix');
    expect(j.demo.status_omongan).toHaveLength(3);
    // suntingan → gerbang kode langsung; gerbang AI tanpa pagu → belum diuji ulang
    const su = await minta(s.port, 'POST', '/api/demo/sunting', { badan: { omongan: 2, lokasi: 'penjelasan', teks: 'Penjelasan baru dari penyetuju uji tanpa angka.' } });
    expect(su.status).toBe(200);
    const sj = su.json() as { catatan: { sesuai_berkas: boolean; dari: string }; kode: { diperiksa: string[] } };
    expect(sj.catatan.sesuai_berkas).toBe(true);
    expect(sj.kode.diperiksa).toContain('detektor D1–D9');
    const uji = await minta(s.port, 'POST', '/api/demo/uji-ulang', { badan: { setuju: true } });
    expect(uji.status).toBe(409);
    // setujui: belum lolos → 409; folder rekaman tetap sama persis; tidak ada ledger
    const sv = await minta(s.port, 'POST', '/api/demo/setujui', { badan: {} });
    expect(sv.status).toBe(409);
    expect(sv.teks).toMatch(/Masih ditolak/);
    expect(sidikFolder(folder)).toEqual(sebelum);
    expect(existsSync(join(akar, '.cache', 'llm', 'ledger.jsonl'))).toBe(false);
    // jalur penyetuju lama ditolak di demo
    expect((await minta(s.port, 'POST', '/api/jalan/rek-ujix/setujui', { badan: {} })).status).toBe(409);
  }, 60_000);

  it('paket hidup berbeda dari paket rekaman → tidak ada perkiraan; persetujuan ditolak', async () => {
    const { s } = await siapkanDemo();
    const lain = deretHarga('2026-03-02', 60)[30]?.tanggal as string;
    const r = await minta(s.port, 'POST', '/api/siapkan', { badan: { kode: 'UJIX', tanggal: lain, jendela: 10, id: 'demo-lain' } });
    if (r.status === 202) {
      const p = peristiwaSse((await bacaSse(s.port, '/api/jalan/demo-lain/aliran', {}, 1500)).teks);
      expect(p.map((x) => x.tahap)).not.toContain('perkiraan');
      expect(p.at(-1)?.judul).toMatch(/tidak sama dengan paket jalan rek-ujix|Tidak terbit, tanpa biaya/);
      expect((await minta(s.port, 'POST', '/api/jalan/demo-lain/mulai', { badan: { setuju: true, pagu_usd: 0.6 } })).status).toBe(409);
    } else expect(r.status).toBe(400);
  }, 60_000);
});

describe('penanda di halaman (kode halaman)', () => {
  const app = (): string => readFileSync(new URL('./halaman/app.js', import.meta.url), 'utf8');
  it('transisi demo: penanda rekaman dinyalakan dan kalimat transisi dipasang sebelum log diputar', () => {
    const a = app();
    expect(a).toMatch(/function mulaiTayangDemo\(/);
    const i = a.indexOf('function mulaiTayangDemo(');
    const badan = a.slice(i, a.indexOf('\n}\n', i));
    expect(badan).toMatch(/pasangPenandaRekaman\(/);
    expect(badan).toMatch(/teksTransisiDemo\(/);
    expect(badan.indexOf('teksTransisiDemo(')).toBeLessThan(badan.indexOf('sambungAliran('));
  });

  it('gerbang AI tanpa hasil: halaman menyebut "Gerbang AI belum diuji ulang."; hasil tersimpan disebut diputar', () => {
    expect(R.TEKS_AI_BELUM).toBe('Gerbang AI belum diuji ulang.');
    expect(R.teksSumberUji({ sumber: 'tersimpan', waktu_uji: '2026-10-03T05:00:00Z', biaya_ledger_usd: 0.0412 })).toBe('Hasil uji ulang sungguhan 3 Okt 2026, 12.00 WIB, biaya nyata US$0,0412 (ledger). Diputar dari catatan, tanpa panggilan baru.');
    expect(app()).toContain('TEKS_AI_BELUM');
  });
});
