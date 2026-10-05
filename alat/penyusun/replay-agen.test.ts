/**
 * Mode replay agent pintu penyusun: apa yang dikirim ke peramban, dan rutenya.
 *
 * 1. Jumlah langkah dan biaya per percobaan = `hasil.json` (21 langkah;
 *    US$0,9187 / 0,6813 / 0,6255 / 0,5505).
 * 2. Tidak ada `penalaran` (teks berpikir model) di data yang dikirim — juga
 *    bila rekamannya memuatnya (rekaman tiruan dengan penanda).
 * 3. Tidak ada nama emiten asli atau kode saham di data tampilan agent.
 * 4. Rute: `/` = halaman agent, `/api/status`, `/api/agen/aliran` (SSE);
 *    kode lain 404; semua tindakan lain 409.
 */
import { cpSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { afterEach, describe, expect, it } from 'vitest';
import { KALIMAT_MENULIS_ULANG, KELOMPOK_TOOL, TATA_LEBAR, TOOL_ATURAN } from './baca-agen.ts';
import { akarSementara, bacaSse, minta, mulaiServer, type ServerUji } from './bantu-uji.ts';
import { FOLDER_REKAMAN, KONFIG_JEJAK, MEDAN_TERLARANG, NAMA_LAMA, dataJejak, kataTerlarang, kodeRekaman, uraiTanpaPenalaran } from './rekaman-agen.ts';
import {
  TOOL_DIAGRAM,
  gambarDiagram,
  periksaBersih,
  peristiwaReplay,
  siapkanReplay,
  simulasiTampil,
  tanpaRujukan,
  toolDiagram,
  type KepalaTampil,
  type LangkahTampil,
  type SimulasiTampil,
} from './replay-agen.ts';
import { uraiArgumen } from './server.ts';

const AKAR = fileURLToPath(new URL('../../', import.meta.url));

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

/** Peristiwa dari teks SSE mentah: [jenis, data]. */
function uraiAliran(teks: string): Array<{ jenis: string; data: unknown }> {
  return teks
    .split('\n\n')
    .map((b) => b.split('\n'))
    .filter((b) => b.some((l) => l.startsWith('event: ')))
    .map((b) => ({
      jenis: b.find((l) => l.startsWith('event: '))?.slice(7) ?? '',
      data: JSON.parse(b.find((l) => l.startsWith('data: '))?.slice(6) ?? 'null') as unknown,
    }));
}

describe('replay: data yang disiapkan untuk peramban', () => {
  const r = siapkanReplay();
  const data = dataJejak();
  const dikirim = JSON.stringify(peristiwaReplay(r));

  it('21 langkah; jumlah langkah dan biaya per percobaan = hasil.json', () => {
    expect(r.langkah).toHaveLength(21);
    expect(r.kepala.jumlah_langkah).toBe(21);
    const BIAYA = [0.9187, 0.6813, 0.6255, 0.5505];
    for (const [i, id] of KONFIG_JEJAK.percobaan.entries()) {
      const hasil = JSON.parse(readFileSync(`${AKAR}${FOLDER_REKAMAN}/${id}/hasil.json`, 'utf8')) as { langkah: number; biaya_usd: number; pagu_usd: number };
      // Langkah yang DIKIRIM, dipilih lewat nomor urutnya di rekaman.
      const milik = r.langkah.filter((l) => data.langkah[l.no - 1]?.percobaan === i);
      expect(milik, id).toHaveLength(hasil.langkah);
      const biaya = milik.reduce((j, l) => j + l.biaya_model_usd + l.biaya_penguji_usd, 0);
      expect(Math.abs(biaya - hasil.biaya_usd), id).toBeLessThan(1e-4);
      expect(hasil.biaya_usd, id).toBe(BIAYA[i]);
    }
    expect(r.langkah.map((l) => l.no)).toEqual(Array.from({ length: 21 }, (_, i) => i + 1));
    expect(r.biaya_usd).toBeCloseTo(2.776, 6);
    // Budget = jumlah budget keempat percobaan di hasil.json; jumlah rekamannya ikut dikirim untuk label budget.
    expect(r.kepala.budget_usd).toBe(5);
    expect(r.kepala.jumlah_rekaman).toBe(KONFIG_JEJAK.percobaan.length);
    expect(r.kepala.jumlah_rekaman).toBe(4);
  });

  it('tahap berurutan: mencari bahan → menulis dan menguji → menaikkan kesulitan → melengkapi simulasi', () => {
    expect(r.kepala.tahap.map((t) => t.nama)).toEqual(['Mencari bahan', 'Menulis dan menguji', 'Menaikkan kesulitan', 'Melengkapi simulasi']);
    const urut = r.langkah.map((l) => r.kepala.tahap.findIndex((t) => t.id === l.tahap));
    expect(urut).toEqual([...urut].sort((a, b) => a - b));
    expect([3, 5, 9, 4]).toEqual(r.kepala.tahap.map((t) => r.langkah.filter((l) => l.tahap === t.id).length));
    for (const t of r.tahap) {
      const milik = r.langkah.filter((l) => l.tahap === t.id);
      expect(milik.reduce((j, l) => j + l.biaya_model_usd + l.biaya_penguji_usd, 0), t.id).toBeCloseTo(t.biaya_usd, 6);
    }
  });

  it(`medan ${MEDAN_TERLARANG} tidak ada di data yang dikirim; langkah hanya membawa medan yang didaftar`, () => {
    expect(semuaMedan(JSON.parse(dikirim)).has(MEDAN_TERLARANG)).toBe(false);
    expect(dikirim).not.toMatch(/"penalaran"\s*:/);
    const boleh = ['biaya_model_usd', 'biaya_penguji_usd', 'hasil', 'lama_ms', 'memanggil', 'no', 'nyala', 'ringkas', 'tahap', 'tanpa_hasil', 'token', 'ucapan'];
    for (const l of r.langkah) {
      expect(Object.keys(l).sort()).toEqual(boleh);
      expect(Object.keys(l.token).sort()).toEqual(['berpikir', 'keluar', 'masuk']);
      for (const h of l.hasil) expect(Object.keys(h).sort()).toEqual(['alat', 'asli', 'jenis', 'kalimat', 'status']);
    }
    // Jumlah token berpikir ikut sebagai angka saja.
    expect(r.langkah.every((l) => Number.isInteger(l.token.berpikir))).toBe(true);
  });

  it('tanpa nama emiten asli, kode saham, atau alamat berkas mesin di data tampilan agent', () => {
    const terlarang = kataTerlarang();
    expect(terlarang).toHaveLength(3);
    for (const kata of terlarang) expect(dikirim.toLowerCase().includes(kata.toLowerCase()), 'kata terlarang').toBe(false);
    expect(dikirim).not.toMatch(/amag/i);
    expect(dikirim).not.toMatch(/asuransi multi/i);
    expect(dikirim).not.toMatch(/[A-Za-z]:[\\/]{1,2}[A-Za-z]/);
    expect(dikirim).not.toMatch(/https?:\/\//);
    // Kode saham hanya ada di `kode` (dipakai server untuk mencocokkan ketikan), tidak di peristiwa.
    expect(r.kode).toBe(kodeRekaman());
    expect(() => periksaBersih({ a: [{ b: `PT ${terlarang[0] ?? ''}` }] }, terlarang)).toThrow(/nama perusahaan/);
    expect(() => periksaBersih({ a: { penalaran: 'x' } }, terlarang)).toThrow(/penalaran/);
  });

  it('diagram: dua belas tool dalam empat kelompok; tiap tool rekaman punya simpul; yang menyala = yang dipilih agent', () => {
    expect(r.kepala.tool.map((t) => t.nama)).toEqual([...TOOL_DIAGRAM]);
    expect(TOOL_DIAGRAM).toEqual(KELOMPOK_TOOL.flatMap((k) => k.tool));
    expect(r.kepala.tool).toHaveLength(12);
    // M2d-32 D-2: nama kelompok dikirim, dan tiap tool membawa kelompoknya.
    expect(r.kepala.kelompok).toEqual([
      { id: 'bahan', nama: 'Bahan' },
      { id: 'catatan', nama: 'Catatan' },
      { id: 'periksa', nama: 'Pemeriksaan tanpa biaya' },
      { id: 'uji', nama: 'Uji berbayar' },
    ]);
    for (const t of r.kepala.tool) expect(t.kelompok, t.nama).toBe(KELOMPOK_TOOL.find((k) => k.tool.includes(t.nama))?.id);
    for (const g of [r.kepala.diagram.tegak, r.kepala.diagram.lebar]) {
      expect(g.tool).toHaveLength(12);
      expect(g.kelompok.map((k) => k.id)).toEqual(['bahan', 'catatan', 'periksa', 'uji']);
      expect(g.tool.map((t) => t.kelompok)).toEqual(r.kepala.tool.map((t) => t.kelompok));
      // Garis: hanya empat angka agent ⇄ tool; tidak ada medan lain yang bisa menyambung tool ke tool.
      for (const t of g.tool) expect(Object.keys(t.garis).sort()).toEqual(['x1', 'x2', 'y1', 'y2']);
    }
    expect(r.kepala.diagram.lebar.keterangan).toBe(true);
    expect(r.kepala.diagram.tegak.keterangan).toBe(false);
    for (const l of r.langkah) {
      expect(l.nyala.length, `langkah ${String(l.no)}`).toBeGreaterThan(0);
      const nama = l.nyala.map((i) => r.kepala.tool[i]).flatMap((t) => (t === undefined ? [] : [t.nama, ...t.nama_lama]));
      for (const t of l.memanggil) expect(nama, `langkah ${String(l.no)}`).toContain(t);
    }
    expect(r.kepala.tool.find((t) => t.nama === 'periksa_draft_dengan_aturan')?.nama_lama).toEqual(['periksa_kode']);
    expect(r.kepala.tool.every((t) => t.keterangan !== null)).toBe(true);
    // Tool yang belum dikenal menyusul di belakang; tanpa kelompok ia tidak digambar dan pembangun menolak, bukan diam.
    const denganBaru = toolDiagram([{ nama: 'tool_baru', nama_lama: [] }]);
    expect(denganBaru.at(-1)?.nama).toBe('tool_baru');
    expect(() => gambarDiagram(TATA_LEBAR, denganBaru)).toThrow(/tool_baru belum punya kelompok/);
  });

  it('M2d-31 F-3: satu nama untuk tool yang berganti nama — nama lama tidak ada di langkah yang dikirim', () => {
    const lama = Object.keys(NAMA_LAMA);
    expect(lama).toEqual(['periksa_kode']);
    // Rekamannya sendiri memang memakai nama lama di sebagian langkah.
    expect(data.langkah.some((l) => l.memanggil.includes('periksa_kode'))).toBe(true);
    for (const l of r.langkah) {
      for (const nama of [...l.memanggil, ...l.tanpa_hasil, ...l.hasil.map((h) => h.alat)]) expect(lama, `langkah ${String(l.no)}`).not.toContain(nama);
      expect(new Set(l.memanggil).size, `langkah ${String(l.no)}`).toBe(l.memanggil.length);
    }
    for (const [i, l] of r.langkah.entries()) {
      expect(l.memanggil).toEqual([...new Set((data.langkah[i]?.memanggil ?? []).map((n) => NAMA_LAMA[n] ?? n))]);
      // Tool result tetap sebanyak di rekaman, dan rekaman aslinya tidak disentuh.
      expect(l.hasil.map((h) => h.asli.ringkas)).toEqual(data.langkah[i]?.hasil.map((h) => h.ringkas));
    }
  });

  it('"Agent menulis ulang." hanya bila langkah berikutnya memang menulis draf baru', () => {
    for (const [i, l] of r.langkah.entries()) {
      const asal = data.langkah[i];
      const berikut = data.langkah[i + 1];
      const menulis = asal !== undefined && berikut !== undefined && berikut.percobaan === asal.percobaan && berikut.memanggil.some((t) => TOOL_ATURAN.includes(t));
      for (const h of l.hasil) {
        if (h.kalimat.endsWith(KALIMAT_MENULIS_ULANG)) {
          expect(menulis, `langkah ${String(l.no)}`).toBe(true);
          expect(h.status).toBe('perbaiki');
        }
      }
    }
    const bersambung = r.langkah.filter((l) => l.hasil.some((h) => h.kalimat.endsWith(KALIMAT_MENULIS_ULANG))).map((l) => l.no);
    expect(bersambung).toEqual([5, 6, 10, 15]);
    // Langkah 5: dua draf berkalimat sama digabung jadi satu baris Ringkas.
    expect(r.langkah[4]?.ringkas).toEqual([
      { status: 'perbaiki', kalimat: 'Penebak tanpa kartu masih bisa menebak jawabannya: semua tebakannya memilih jawaban benar. Agent menulis ulang.', jumlah: 2 },
      { status: 'lolos', kalimat: 'Semua penguji meloloskan draf ini. Soalnya masuk kumpulan soal yang lolos.', jumlah: 1 },
    ]);
  });

  it('simulasi yang jadi: tiga soal, kartunya, bagian sesudahnya, dan keterangan penyetuju yang dihitung', () => {
    const s = r.simulasi;
    const kasus = JSON.parse(readFileSync(`${AKAR}${KONFIG_JEJAK.kasus}`, 'utf8')) as {
      soal: Array<{ pesan: { isi: string }; jawaban: string; kartu: string[]; pilihan: unknown[] }>;
      pembukaan: { paragraf: string[] };
    };
    expect(s.soal).toHaveLength(3);
    for (const [i, o] of s.soal.entries()) {
      const asal = kasus.soal[i];
      expect(o.pesan).toBe(asal?.pesan.isi);
      expect(o.pilihan).toHaveLength(asal?.pilihan.length ?? -1);
      expect(o.pilihan.filter((p) => p.benar).map((p) => p.kunci)).toEqual([asal?.jawaban]);
      expect(o.kartu).toHaveLength(asal?.kartu.length ?? -1);
      expect(o.kartu.some((k) => k.penentu)).toBe(true);
    }
    expect(s.sesudahnya).toEqual(kasus.pembukaan.paragraf.map(tanpaRujukan));
    expect(JSON.stringify(s)).not.toContain('[[');
    expect(tanpaRujukan('Harga [[harga-2026-06-15|Rp392]] per lembar.')).toBe('Harga Rp392 per lembar.');
    // Berkas yang dimainkan pemain sama byte demi byte dengan tulisan agent → "tanpa menyunting".
    expect(readFileSync(`${AKAR}cases/amag-2026-06-15.json`, 'utf8')).toBe(readFileSync(`${AKAR}${KONFIG_JEJAK.kasus}`, 'utf8'));
    expect(s.keterangan_penyetuju).toMatch(/Penyetuju memeriksanya tanpa menyunting/);
  });
});

describe('replay atas rekaman tiruan', () => {
  function tiruan(sunting: boolean): string {
    const akar = akarSementara(null);
    const jalurKasus = `${akar}${KONFIG_JEJAK.kasus}`;
    mkdirSync(dirname(jalurKasus), { recursive: true });
    cpSync(`${AKAR}${KONFIG_JEJAK.kasus}`, jalurKasus);
    mkdirSync(`${akar}cases`, { recursive: true });
    const teks = readFileSync(jalurKasus, 'utf8');
    writeFileSync(`${akar}cases/amag-2026-06-15.json`, sunting ? teks.replace('Rara', 'Rini') : teks, 'utf8');
    const folder = `${akar}${FOLDER_REKAMAN}/uji-amag-1`;
    mkdirSync(folder, { recursive: true });
    const baris = [
      { jenis: 'model', ke: 1, memanggil: ['ajukan'], teks: 'Saya ajukan untuk AMAG.', penalaran: 'RAHASIA-TEKS-BERPIKIR tentang Asuransi Multi Artha Guna', token_masuk: 10, token_keluar: 5, token_penalaran: 3, biaya_usd: 0.5, latensi_ms: 1200 },
      { jenis: 'alat', alat: 'ajukan', ke: 1, ringkas: 'berhenti di saringan', hasil: { lolos: false, berhenti: 'saringan', penolakan: ['penebak memilih kunci 9 dari 12'], biaya_pengajuan_usd: 0.1, dalam: { penalaran: 'RAHASIA-TEKS-BERPIKIR' } } },
    ];
    writeFileSync(`${folder}/jejak-agen.jsonl`, `${baris.map((b) => JSON.stringify(b)).join('\n')}\n`, 'utf8');
    writeFileSync(`${folder}/hasil.json`, JSON.stringify({ id: 'uji-amag-1', mode: 'dari-kode', kode: 'AMAG', hari_dipilih: '2026-06-15', model: 'model/uji', pagu_usd: 1, berhenti: 'selesai', langkah: 1, biaya_agen_usd: 0.5, biaya_usd: 0.6, durasi_detik: 2 }), 'utf8');
    return akar;
  }
  const konfig = { kasus: KONFIG_JEJAK.kasus, percobaan: ['uji-amag-1'] };

  it('SABOTASE: teks berpikir dan nama emiten di rekaman tidak sampai ke data yang dikirim', () => {
    const akar = tiruan(false);
    const r = siapkanReplay(akar, konfig);
    const dikirim = JSON.stringify(peristiwaReplay(r));
    expect(dikirim).not.toContain('RAHASIA');
    expect(dikirim).not.toMatch(/"penalaran"/);
    expect(dikirim).not.toMatch(/amag/i);
    expect(dikirim).not.toMatch(/asuransi multi/i);
    expect(r.langkah[0]?.ucapan).toBe('Saya ajukan untuk [kode].');
    expect(r.langkah[0]?.token.berpikir).toBe(3);
    expect(r.langkah[0]?.ringkas[0]?.kalimat).toBe('Penebak tanpa kartu masih bisa menebak jawabannya.');
    // Pengurai yang dipakai pembaca rekaman memang membuang medan itu.
    expect(uraiTanpaPenalaran('{"penalaran":"x","a":{"penalaran":"y","b":1}}')).toEqual({ a: { b: 1 } });
  });

  it('keterangan penyetuju dihitung dari berkas: disunting → tidak mengaku "tanpa menyunting"', () => {
    expect(simulasiTampil(tiruan(false), konfig).keterangan_penyetuju).toMatch(/tanpa menyunting/);
    const disunting = simulasiTampil(tiruan(true), konfig).keterangan_penyetuju;
    expect(disunting).not.toMatch(/tanpa menyunting/);
    expect(disunting).toMatch(/disunting penyetuju/);
  });
});

describe('server: mode replay agent', () => {
  let s: ServerUji | null = null;
  afterEach(async () => {
    await s?.tutup();
    s = null;
  });

  it('M2d-32 D-8: tanpa bendera = tampilan AI agent; --mesin-lama = halaman penyusun lama', () => {
    expect(uraiArgumen([], 'D:/r/')).toMatchObject({ replayAgen: true, mesinLama: false });
    expect(uraiArgumen(['--port', '8791'], 'D:/r/').replayAgen).toBe(true);
    expect(uraiArgumen(['--mesin-lama'], 'D:/r/')).toMatchObject({ replayAgen: false, mesinLama: true, mesin: 'lingkar', palsu: false });
    expect(uraiArgumen(['--mesin-lama', '--palsu'], 'D:/r/')).toMatchObject({ replayAgen: false, palsu: true });
    // Mode lain yang sudah punya benderanya sendiri tidak ikut menjadi tampilan agent.
    expect(uraiArgumen(['--tayang-ulang', 'x'], 'D:/r/').replayAgen).toBe(false);
    expect(uraiArgumen(['--demo', 'x', '--suntingan', 's.json'], 'D:/r/').replayAgen).toBe(false);
    // Bendera milik halaman lama tanpa --mesin-lama ditolak dengan petunjuk, bukan diam-diam membuka agent.
    for (const b of [['--palsu'], ['--mesin', 'templat'], ['--penulis', 'opus'], ['--prompt', 'v1']]) expect(() => uraiArgumen(b, 'D:/r/'), b.join(' ')).toThrow(/hanya berlaku bersama --mesin-lama/);
    expect(() => uraiArgumen(['--mesin-lama', '--replay-agent'], 'D:/r/')).toThrow(/--replay-agent/);
    expect(() => uraiArgumen(['--mesin-lama', '--tayang-ulang', 'x'], 'D:/r/')).toThrow(/--mesin-lama/);
  });

  it('--replay-agent diurai; tidak bisa digabung dengan --demo, --tayang-ulang, atau --palsu', () => {
    expect(uraiArgumen(['--replay-agent'], 'D:/r/').replayAgen).toBe(true);
    expect(() => uraiArgumen(['--replay-agent', '--palsu'], 'D:/r/')).toThrow(/--replay-agent/);
    expect(() => uraiArgumen(['--replay-agent', '--tayang-ulang', 'x'], 'D:/r/')).toThrow(/--replay-agent/);
  });

  it('halaman utama = tampilan agent; berkasnya disajikan dengan CSP', async () => {
    s = await mulaiServer({ akar: akarSementara(null), replayAgen: {} });
    const h = await minta(s.port, 'GET', '/');
    expect(h.status).toBe(200);
    expect(h.header['content-security-policy']).toMatch(/default-src 'self'/);
    expect(h.teks).toContain('<script type="module" src="/agen.js"></script>');
    expect(h.teks).toContain('data-tampilan="ringkas"');
    expect(h.teks).toContain('data-tampilan="rinci"');
    expect(h.teks).toContain('data-tampilan="diagram"');
    for (const b of ['/agen.js', '/agen-murni.js', '/agen.css', '/gaya.css']) expect((await minta(s.port, 'GET', b)).status, b).toBe(200);
    const status = (await minta(s.port, 'GET', '/api/status')).json() as { mode: string; agen: { kode_rekaman: string[]; jumlah_langkah: number; budget_usd: number } };
    expect(status.mode).toBe('replay-agent');
    expect(status.agen).toEqual({ kode_rekaman: [kodeRekaman()], jumlah_langkah: 21, budget_usd: 5 });
  });

  it('GET /api/agen/aliran: kepala → 21 langkah → simulasi → selesai; tanpa penalaran dan nama emiten', async () => {
    s = await mulaiServer({ akar: akarSementara(null), replayAgen: {} });
    const a = await bacaSse(s.port, `/api/agen/aliran?kode=${kodeRekaman()}`);
    expect(a.status).toBe(200);
    const p = uraiAliran(a.teks);
    expect(p.map((x) => x.jenis)).toEqual(['kepala', ...Array.from({ length: 21 }, () => 'langkah'), 'simulasi', 'selesai']);
    const kepala = p[0]?.data as KepalaTampil;
    expect(kepala.mode).toBe('replay');
    expect(kepala.jumlah_langkah).toBe(21);
    const langkah = p.filter((x) => x.jenis === 'langkah').map((x) => x.data as LangkahTampil);
    expect(langkah.map((l) => l.no)).toEqual(Array.from({ length: 21 }, (_, i) => i + 1));
    expect(langkah.reduce((j, l) => j + l.biaya_model_usd + l.biaya_penguji_usd, 0)).toBeCloseTo(2.776, 3);
    expect((p.at(-2)?.data as SimulasiTampil).soal).toHaveLength(3);
    // Seluruh badan respons, apa adanya.
    expect(a.teks).not.toMatch(/penalaran/);
    expect(a.teks).not.toMatch(/amag/i);
    expect(a.teks).not.toMatch(/asuransi multi/i);
    for (const kata of kataTerlarang()) expect(a.teks.toLowerCase().includes(kata.toLowerCase())).toBe(false);
    // Kode huruf kecil diterima (dinormalkan), sama seperti ketikan penyusun.
    expect((await bacaSse(s.port, `/api/agen/aliran?kode=${kodeRekaman().toLowerCase()}`)).status).toBe(200);
  });

  it('kode tanpa rekaman 404; kode tak sah 400; tindakan lain 409; tanpa tulisan apa pun', async () => {
    const akar = akarSementara(null);
    s = await mulaiServer({ akar, replayAgen: {} });
    const lain = await minta(s.port, 'GET', '/api/agen/aliran?kode=TIRT');
    expect(lain.status).toBe(404);
    expect((lain.json() as { galat: string }).galat).toMatch(/Belum ada rekaman AI agent untuk TIRT/);
    expect((await minta(s.port, 'GET', '/api/agen/aliran?kode=1')).status).toBe(400);
    expect((await minta(s.port, 'GET', '/api/emiten?kode=TIRT')).status).toBe(409);
    for (const jalur of ['/api/siapkan', '/api/ambil-data', '/api/jalan/x/mulai', '/api/demo/setujui']) {
      const j = await minta(s.port, 'POST', jalur, { badan: { kode: 'TIRT', setuju: true } });
      expect(j.status, jalur).toBe(409);
      expect((j.json() as { galat: string }).galat).toMatch(/tidak ada panggilan model/);
    }
  });

  it('di luar mode replay agent rute aliran agent tidak ada, dan halaman utama tetap halaman penyusun', async () => {
    s = await mulaiServer({ akar: akarSementara(), palsu: true });
    expect((await minta(s.port, 'GET', '/api/agen/aliran?kode=AMAG')).status).toBe(404);
    expect((await minta(s.port, 'GET', '/')).teks).toContain('<script type="module" src="/app.js"></script>');
  });
});
