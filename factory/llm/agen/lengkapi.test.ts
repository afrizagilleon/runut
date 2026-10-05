/**
 * Tahap 2 "lengkapi kasus" (mode `--lengkapi`, M2d-29) — tanpa jaringan: critic
 * selalu TIRUAN, dan tidak ada satu pun panggilan ke OpenRouter atau Sectors.
 *
 * Yang dijaga:
 * 1. kuncian — mode menolak bila simulasi belum terakit (sebelum gudang
 *    dibaca); `lihat_sesudahnya` tidak memuat fakta ≤ tanggal simulasi dan
 *    tidak memuat nama asli;
 * 2. `periksa_kasus_dengan_aturan` — masalah validator apa adanya untuk
 *    lampiran rusak, `id_lampiran` untuk lampiran AMAG tulisan penyetuju;
 * 3. teks soal yang diubah ditolak;
 * 4. `ajukan_kasus` menulis dua berkas hanya bila critic lolos.
 *
 * Bagian yang memakai emiten sungguhan (AMAG) butuh berkas `.cache/sectors/`
 * dan dilewati bila tidak ada, sama seperti `factory/kasus/amag.test.ts`.
 */
import { cpSync, existsSync, mkdtempSync, readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { KasusTidakSah, bangunKasusUmum } from '../../kasus/bangun.ts';
import { dariAgen, type LampiranPenyetuju } from '../../kasus/dari-agen.ts';
import { LAMPIRAN_AMAG_2026_06_15 as LAMPIRAN } from '../../kasus/lampiran/amag-2026-06-15.ts';
import { FOLDER_GUDANG, muatGudang } from '../../muat/gudang.ts';
import { AKAR } from '../env.ts';
import { MODEL_OR_GLM } from '../model.ts';
import type { PaketFakta } from '../paket.ts';
import type { JawabanModel } from '../susun.ts';
import type { InfoTemplat, PanggilTemplat } from '../templat/penulis.ts';
import { uraiKritikKasus } from './kritik-kasus.ts';
import {
  CADANGAN_KRITIK_KASUS_USD,
  KARTU_KONSEP_ADA,
  LengkapiDitolak,
  angkaLabelMeleset,
  buatAlatLengkapi,
  faktaSesudah,
  siapkanLengkapi,
  uraiDrafLampiran,
  type DrafLampiran,
  type PeristiwaLengkapi,
  type SiapanLengkapi,
} from './lengkapi.ts';
import { instruksiAgen, instruksiLengkapi, instruksiTingkatkan } from './prompt.ts';

const JALUR_PAKET = 'eval/penyusun/m2d26-amag-1/paket.json';
const BANK = 'eval/bank-omongan';
const SHA = LAMPIRAN.sumber.paket_sha256;
const T = '2026-06-15';
const OMONGAN = ['5e568a8ce3296708', '25ddea4d9f1c3df0', 'e59779237448d406'];
const adaCache = LAMPIRAN.sumber.gudang.every((b) => existsSync(`${FOLDER_GUDANG}/${b.nama}`));
const paketAmag = (): PaketFakta => JSON.parse(readFileSync(`${AKAR}${JALUR_PAKET}`, 'utf8')) as PaketFakta;

/** Bagian lampiran AMAG yang ditulis penyetuju — tepat bagian yang di mode ini ditulis agent. */
const drafAmag = (): DrafLampiran => structuredClone({ judul: LAMPIRAN.judul, soal: LAMPIRAN.soal, awam: LAMPIRAN.awam, pembukaan: LAMPIRAN.pembukaan, penutup: LAMPIRAN.penutup, kartu_konsep: LAMPIRAN.kartu_konsep });

const siapkanAmag = (ganti: Partial<Parameters<typeof siapkanLengkapi>[0]> = {}): SiapanLengkapi =>
  siapkanLengkapi({ jalurPaket: `${AKAR}${JALUR_PAKET}`, sumberPaket: JALUR_PAKET, folderBank: `${AKAR}${BANK}`, sumberBank: BANK, folderGudang: FOLDER_GUDANG, omongan: OMONGAN, ...ganti });

/** Critic tiruan: menjawab teks yang diberikan, mencatat tiap panggilan. Tidak ada jaringan. */
function criticTiruan(jawaban: string[], biaya = 0.03) {
  const panggilan: Array<{ info: InfoTemplat; sistem: string; pengguna: string }> = [];
  const panggil: PanggilTemplat = (pesan, _setelan, info) => {
    panggilan.push({ info, sistem: pesan[0]?.content ?? '', pengguna: pesan[1]?.content ?? '' });
    const teks = jawaban[Math.min(panggilan.length - 1, jawaban.length - 1)] ?? '';
    const j: JawabanModel = { teks, token_masuk: 5000, token_keluar: 6000, latensi_ms: 1, finish_reason: 'stop', biaya_usd: biaya, penyedia: 'Wafer', token_penalaran: 5000 };
    return Promise.resolve(j);
  };
  return { panggil, panggilan };
}
const TANPA_KEBERATAN = JSON.stringify({ keberatan: [], arahan: '' });
const KEBERATAN = JSON.stringify({ keberatan: [{ bagian: 'pembukaan paragraf 3', alasan: 'Kata "tertinggi" tidak didukung fakta yang ditautkan.' }], arahan: 'Sebut angkanya saja.', lolos: true });

function alatAmag(jawaban: string[], opsi: { pagu?: number; biayaAgen?: () => number } = {}) {
  const folderKeluaran = mkdtempSync(join(tmpdir(), 'lengkapi-'));
  const peristiwa: PeristiwaLengkapi[] = [];
  const critic = criticTiruan(jawaban);
  const s = siapkanAmag();
  const alat = buatAlatLengkapi(s, { folderKeluaran, panggil: critic.panggil, paguUsd: opsi.pagu ?? 2, biayaAgen: opsi.biayaAgen ?? (() => 0), catat: (p) => peristiwa.push(p) });
  return { alat, s, folderKeluaran, peristiwa, critic };
}

/* ------------------------------------------------------------------ */
/* Tanpa gudang: kuncian, penyamaran, bentuk                           */
/* ------------------------------------------------------------------ */

describe('kuncian mode lengkapi', () => {
  it('menolak jalan bila bank paket itu kosong — sebelum gudang dibaca', () => {
    const bankKosong = mkdtempSync(join(tmpdir(), 'bank-kosong-'));
    const jalan = (): SiapanLengkapi => siapkanAmag({ folderBank: bankKosong, folderGudang: join(bankKosong, 'gudang-yang-tidak-ada'), omongan: null });
    expect(jalan).toThrow(LengkapiDitolak);
    expect(jalan).toThrow(/belum bisa dirakit menjadi simulasi/);
  });

  it('menolak jalan bila bank baru memuat dua dari tiga omongan simulasi', () => {
    const bank = mkdtempSync(join(tmpdir(), 'bank-dua-'));
    // Dua omongan versi asal saja (Rara dan Dimas): belum tiga kartu penentu berbeda.
    for (const id of ['5e568a8ce3296708', '1ad0aa1ec482f54e']) cpSync(`${AKAR}${BANK}/${SHA}/${id}.json`, join(bank, SHA, `${id}.json`), { recursive: true });
    expect(() => siapkanAmag({ folderBank: bank, folderGudang: join(bank, 'tidak-ada'), omongan: null })).toThrow(/belum bisa dirakit menjadi simulasi/);
  });

  it('menolak paket yang sidik berkasnya bukan sidik bank', () => {
    const f = join(mkdtempSync(join(tmpdir(), 'paket-')), 'paket.json');
    writeFileSync(f, JSON.stringify(paketAmag()), 'utf8'); // bentuk lain dari yang ditulis pelari
    expect(() => siapkanAmag({ jalurPaket: f })).toThrow(/Sidik berkas paket/);
  });
});

describe('faktaSesudah (gudang buatan, tanpa cache)', () => {
  const folder = mkdtempSync(join(tmpdir(), 'gudang-buatan-'));
  const hari = ['2026-03-02', '2026-03-03', '2026-03-04', '2026-03-05', '2026-03-06', '2026-03-09', '2026-03-10', '2026-03-11', '2026-03-12', '2026-03-13'];
  const tutup = [100, 102, 104, 103, 105, 110, 108, 110, 96, 101];
  writeFileSync(join(folder, 'zz-harian.json'), JSON.stringify(hari.map((date, i) => ({ symbol: 'ZZZZ.JK', date, open: tutup[i], high: (tutup[i] ?? 0) + 2, low: (tutup[i] ?? 0) - 2, close: tutup[i], volume: 1000 * (i + 1), market_cap: 1e9 }))), 'utf8');
  writeFileSync(join(folder, 'zz-aksi.json'), JSON.stringify({
    symbol: 'ZZZZ.JK',
    corporate_actions: {
      dividend: [{ ex_date: '2026-03-03', payment_date: '2026-03-20', dividend_amount: 5, dividend_yield: null }, { ex_date: '2026-03-10', payment_date: '2026-03-27', dividend_amount: 7, dividend_yield: null }],
      agm: [{ agm_date: '2026-03-11', agm_result: 'PT Zamrud Zaitun Tbk (ZZZZ) menyetujui laporan tahunan; Wiryawan Kusumo diangkat sebagai direktur.' }],
      stock_split: [], right_issue: [], bonus: [],
    },
  }), 'utf8');
  writeFileSync(join(folder, 'zz-laporan.json'), JSON.stringify({
    results: [
      { symbol: 'ZZZZ.JK', timestamp: '2026-03-04T10:00:00', holder_name: 'Wiryawan Kusumo', holding_before: 1000, holding_after: 1500, amount_transaction: 500, source: 'https://contoh.invalid/a.pdf', transaction_type: 'buy', price: 102, share_percentage_before: 1, share_percentage_after: 1.5, price_transaction: [{ date: '2026-03-03', type: 'buy', price: 102, amount_transacted: 500 }], body: '', title: 'x' },
      { symbol: 'ZZZZ.JK', timestamp: '2026-03-12T10:00:00', holder_name: 'Wiryawan Kusumo', holding_before: 1500, holding_after: 2500, amount_transaction: 1000, source: 'https://contoh.invalid/b.pdf', transaction_type: 'buy', price: 110, share_percentage_before: 1.5, share_percentage_after: 2.5, price_transaction: [{ date: '2026-03-11', type: 'buy', price: 110, amount_transacted: 1000 }], body: '', title: 'x' },
    ],
    pagination: { total_count: 2, showing: 2, limit: 30, offset: 0, has_next: false, has_previous: false },
  }), 'utf8');
  const data = muatGudang(folder).emiten.get('ZZZZ');
  const TT = '2026-03-05';
  const paket = { simbol: 'ZZZZ', tanggal_t: TT, kata_terlarang: ['ZZZZ', 'ZZZZ.JK', 'PT Zamrud Zaitun Tbk', 'Zamrud Zaitun'], disingkirkan: [{ fact_id: 'rups-2026-03-01', alasan: 'kalimatnya menyebut Zamrud Zaitun' }], pemeriksaan: { aturan_dijalankan: 3, aturan_dilewati: 1, temuan: [] } };

  it('gudang buatan terbaca', () => {
    expect(data?.harga).toHaveLength(10);
    expect(data?.laporan).toHaveLength(2);
  });

  it('tidak memuat satu fakta pun bertanggal ≤ tanggal simulasi', () => {
    if (data === undefined) throw new Error('gudang buatan tidak terbaca');
    const h = faktaSesudah(data, paket);
    const semua = [h.ringkasan.harga, h.ringkasan.dividen, h.ringkasan.rapat, h.ringkasan.laporan_kepemilikan, h.ringkasan.penghentian_perdagangan].flatMap((k) => k.fakta);
    expect(semua.length).toBeGreaterThan(8);
    expect(semua.filter((f) => f.tanggal <= TT)).toEqual([]);
    for (const id of [...h.lolos, ...h.tidakLolos.keys()]) {
      // 'dividen-tercatat' tidak bertanggal di id-nya: di data penuh ia ikut bergeser ke tanggal ex terakhir (sesudah T).
      const tanggal = /\d{4}-\d{2}-\d{2}/.exec(id)?.[0] ?? null;
      if (tanggal === null) expect(id).toBe('dividen-tercatat');
      else expect(tanggal > TT, id).toBe(true);
    }
    // Tidak ada fact_id bertanggal ≤ T di mana pun di keluaran alat, kecuali yang disingkirkan pada hari simulasi (bahan layar pembukaan).
    const { pada_hari_simulasi: _hariItu, ...sisa } = h.ringkasan;
    void _hariItu;
    const teks = JSON.stringify(sisa);
    for (const t of hari.filter((x) => x <= TT)) expect(teks, t).not.toContain(`-${t}`);
    for (const t of hari.filter((x) => x < TT)) expect(teks, t).not.toContain(t);
    expect(teks).not.toContain('Rp100');
  });

  it('nama emiten, kode saham, dan nama orang disamarkan — termasuk nama yang tidak ada di daftar paket', () => {
    if (data === undefined) throw new Error('gudang buatan tidak terbaca');
    const teks = JSON.stringify(faktaSesudah(data, paket).ringkasan);
    expect(teks).toContain('[disamarkan]');
    for (const kata of ['ZZZZ', 'Zamrud', 'Zaitun', 'Wiryawan', 'Kusumo']) expect(teks.toLowerCase(), kata).not.toContain(kata.toLowerCase());
  });

  it('meringkas: hari pertama, tertinggi, terendah, terakhir, peristiwa non-harga; jenis yang kosong disebut kosong', () => {
    if (data === undefined) throw new Error('gudang buatan tidak terbaca');
    const r = faktaSesudah(data, paket).ringkasan;
    expect(r.data_harga_sampai).toBe('2026-03-13');
    expect(r.harga.keterangan).toContain('6 hari bursa sesudah tanggal simulasi');
    const peran = (id: string): string => (r.harga.fakta.find((f) => f.fact_id === id)?.peran ?? []).join(' | ');
    expect(peran('harga-2026-03-06')).toContain('hari bursa ke-1');
    expect(peran('harga-2026-03-09')).toContain('penutupan tertinggi');
    expect(peran('harga-2026-03-09')).toContain('2 hari bursa'); // 110 dua kali: 9 dan 11 Maret
    expect(peran('harga-2026-03-12')).toContain('penutupan terendah');
    expect(peran('harga-2026-03-13')).toContain('baris harga terakhir');
    expect(r.dividen.fakta.map((f) => f.fact_id)).toEqual(['div-2026-03-10', 'div-2026-03-10-bayar']);
    expect(r.rapat.fakta.map((f) => f.fact_id)).toEqual(['rups-2026-03-11']);
    // Laporan buatan sesudah T tidak lolos aturan verifikasi: ia tidak ditampilkan, tidak disebut "kosong", dan tercatat alasannya.
    expect(r.laporan_kepemilikan.fakta).toEqual([]);
    expect(r.laporan_kepemilikan.keterangan).toContain('1 laporan kepemilikan lain ada di data tetapi tidak lolos aturan verifikasi');
    expect(r.tidak_lolos_verifikasi.contoh.map((x) => x.fact_id)).toContain('fil-2026-03-12-01');
    expect(faktaSesudah(data, paket).lolos.has('fil-2026-03-12-01')).toBe(false);
    expect(r.penghentian_perdagangan).toMatchObject({ ada: false, fakta: [] });
    expect(r.penghentian_perdagangan.keterangan).toMatch(/^Kosong:/);
  });
});

describe('draft lampiran: hanya bagian yang ditulis agent', () => {
  it('lampiran AMAG tulisan penyetuju terurai utuh', () => {
    const u = uraiDrafLampiran(drafAmag());
    expect(u.masalah).toEqual([]);
    expect(u.draf).toEqual(drafAmag());
  });

  it('teks soal di dalam draft ditolak: soal terkunci', () => {
    const d = drafAmag() as unknown as { soal: Array<Record<string, unknown>> };
    (d.soal[0] as Record<string, unknown>)['pesan'] = 'Harganya sudah balik ke akhir Mei kok.';
    (d.soal[1] as Record<string, unknown>)['kunci'] = 'c';
    const u = uraiDrafLampiran(d);
    expect(u.draf).toBeNull();
    expect(u.masalah).toEqual([
      'soal ke-1: medan "pesan" adalah teks soal yang sudah terkunci; lampiran soal hanya memuat id_omongan, soal_id, tanya, istilah.',
      'soal ke-2: medan "kunci" adalah teks soal yang sudah terkunci; lampiran soal hanya memuat id_omongan, soal_id, tanya, istilah.',
    ]);
  });

  it('bagian yang dilengkapi kode tidak boleh ditulis agent', () => {
    const u = uraiDrafLampiran({ ...drafAmag(), sumber: LAMPIRAN.sumber, emiten: { papan: 'Utama', sektor: 'bank' } });
    expect(u.draf).toBeNull();
    expect(u.masalah.join('\n')).toMatch(/medan "sumber" dilengkapi program/);
    expect(u.masalah.join('\n')).toMatch(/medan "emiten" dilengkapi program/);
  });

  it('kartu konsep di luar daftar, tautan di medan polos, dan garis waktu kosong ditolak', () => {
    const d = drafAmag();
    d.kartu_konsep = [{ kode: 'Z9', judul: 'Karangan' }];
    d.soal[0] = { ...(d.soal[0] as DrafLampiran['soal'][number]), tanya: 'Omongan Rara soal [[harga-2026-06-15|Rp392]] cocok?' };
    d.pembukaan.paragraf = [];
    const m = uraiDrafLampiran(d).masalah.join('\n');
    expect(m).toMatch(/bukan kode dari daftar yang ada/);
    expect(m).toMatch(/soal ke-1 \(tanya\) memuat tautan/);
    expect(m).toMatch(/pembukaan\.paragraf kosong/);
    expect(uraiDrafLampiran({ ...drafAmag(), kartu_konsep: ['A2', 'B1'] }).draf?.kartu_konsep).toEqual(LAMPIRAN.kartu_konsep);
  });

  it('angka di label harus tertulis di kalimat fakta yang ditautkannya', () => {
    const klaim = new Map(paketAmag().fakta.map((f) => [f.fact_id, f.klaim]));
    expect(angkaLabelMeleset(drafAmag(), klaim)).toEqual([]);
    const d = drafAmag();
    d.awam['harga-2026-06-15'] = { kepala: 'Data harga harian · 15 Jun 2026', isi: 'Harga penutupan hari ini: [[harga-2026-06-15|Rp398 per lembar]].' };
    const m = angkaLabelMeleset(d, klaim);
    expect(m).toHaveLength(1);
    expect(m[0]).toContain('angka "398" tidak tertulis di kalimat fakta itu');
  });
});

describe('critic lampiran: jawaban dibaca kode', () => {
  it('hanya keberatan dan arahan yang dibaca; medan "lolos" dari critic tidak berarti apa-apa', () => {
    expect(uraiKritikKasus(KEBERATAN)).toEqual({ keberatan: [{ bagian: 'pembukaan paragraf 3', alasan: 'Kata "tertinggi" tidak didukung fakta yang ditautkan.' }], arahan: 'Sebut angkanya saja.' });
    expect(uraiKritikKasus(TANPA_KEBERATAN)).toEqual({ keberatan: [], arahan: '' });
    expect(uraiKritikKasus('{"lolos": true}')).toBeNull();
    expect(uraiKritikKasus('bukan json')).toBeNull();
  });
});

describe('petunjuk agent', () => {
  it('petunjuk lengkapi terisi penuh dan menyebut kelima tool dengan nama persisnya', () => {
    const p = instruksiLengkapi(6, KARTU_KONSEP_ADA);
    expect(p.match(/\{[A-Z_]+\}/g)).toBeNull();
    for (const alat of ['lihat_fakta', 'lihat_soal_terkunci', 'lihat_sesudahnya', 'periksa_kasus_dengan_aturan', 'ajukan_kasus']) expect(p, alat).toContain(`\`${alat}\``);
    expect(p).toContain('A2 (Lot dan lembar)');
    expect(p).toContain('sesudah 6 kali ditolak critic');
    // Contohnya dari perusahaan lain: petunjuk tidak boleh membawa tulisan penyetuju AMAG.
    expect(p).not.toContain('Perusahaan A');
    expect(p).not.toContain(LAMPIRAN.penutup.kepala);
  });

  it('contoh di petunjuk lolos pengurai draft dan pemeriksa angka label', () => {
    const p = instruksiLengkapi(6, KARTU_KONSEP_ADA);
    const awal = p.indexOf('{\n "judul"');
    const akhir = p.indexOf('\n}\n', awal);
    const contoh = JSON.parse(p.slice(awal, akhir + 2)) as Record<string, unknown>;
    const u = uraiDrafLampiran(contoh);
    expect(u.masalah).toEqual([]);
    const ultj = JSON.parse(readFileSync(`${AKAR}cases/ultj-2026-05-04.json`, 'utf8')) as { fakta: Array<{ fact_id: string; klaim: string }> };
    expect(angkaLabelMeleset(u.draf as DrafLampiran, new Map(ultj.fakta.map((f) => [f.fact_id, f.klaim])))).toEqual([]);
  });

  it('petunjuk mode lain tidak memuat apa pun dari mode lengkapi', () => {
    for (const p of [instruksiAgen(), instruksiAgen(3, 5, 'sulit', true), instruksiTingkatkan()]) {
      for (const kata of ['lihat_sesudahnya', 'lihat_soal_terkunci', 'ajukan_kasus', 'periksa_kasus_dengan_aturan', 'lampiran']) expect(p).not.toContain(kata);
    }
  });
});

/* ------------------------------------------------------------------ */
/* Dengan gudang: AMAG sungguhan                                       */
/* ------------------------------------------------------------------ */

describe.runIf(adaCache)('mode lengkapi atas AMAG (gudang sungguhan, critic tiruan)', () => {
  it('kode melengkapi sumber, sidik berkas gudang, papan, dan sektor — sama dengan lampiran penyetuju', () => {
    const s = siapkanAmag();
    expect(s.kasus_id).toBe(LAMPIRAN.kasus_id);
    expect(s.sumber).toEqual(LAMPIRAN.sumber);
    expect(s.emiten).toEqual(LAMPIRAN.emiten);
    expect(s.catatan_penyetuju).toEqual([]);
    expect(s.omongan.map((e) => e.id).sort()).toEqual([...OMONGAN].sort());
  });

  it('tanpa --omongan memakai tiga omongan simulasi dasar; --omongan memilih versinya', () => {
    const dasar = siapkanAmag({ omongan: null });
    expect(dasar.omongan.map((e) => e.id).sort()).toEqual(['1ad0aa1ec482f54e', '28192295aab0c290', '5e568a8ce3296708']);
    expect(Object.entries(siapkanAmag().asal).sort()).toEqual([['25ddea4d9f1c3df0', '1ad0aa1ec482f54e'], ['5e568a8ce3296708', '5e568a8ce3296708'], ['e59779237448d406', '28192295aab0c290']]);
    // Dua versi dari omongan yang sama, id yang tidak ada, dan jumlah yang salah ditolak.
    expect(() => siapkanAmag({ omongan: ['5e568a8ce3296708', '25ddea4d9f1c3df0', '1ad0aa1ec482f54e'] })).toThrow(/memakai tempat yang sama/);
    expect(() => siapkanAmag({ omongan: ['5e568a8ce3296708', '25ddea4d9f1c3df0', '0000000000000000'] })).toThrow(/tidak ada di bank paket ini/);
    expect(() => siapkanAmag({ omongan: ['5e568a8ce3296708', '25ddea4d9f1c3df0'] })).toThrow(/tepat 3 id berbeda/);
  });

  it('lihat_soal_terkunci: tiga omongan apa adanya, dengan id-nya', () => {
    const { alat } = alatAmag([TANPA_KEBERATAN]);
    const h = alat.lihatSoalTerkunci();
    expect(h.omongan.map((o) => o.id_omongan).sort()).toEqual([...OMONGAN].sort());
    for (const o of h.omongan) {
      const bank = (JSON.parse(readFileSync(`${AKAR}${BANK}/${SHA}/${o.id_omongan}.json`, 'utf8')) as { omongan: Record<string, unknown> }).omongan;
      for (const medan of ['nama', 'jam', 'pesan', 'pilihan', 'kunci', 'penjelasan', 'kartu', 'kartu_penentu'] as const) expect(o[medan], `${o.id_omongan}.${medan}`).toEqual(bank[medan]);
    }
    expect([...h.kartu_yang_butuh_teks].sort()).toEqual(Object.keys(LAMPIRAN.awam).sort());
  });

  it('lihat_sesudahnya: tidak ada fakta ≤ tanggal simulasi, tidak ada nama asli, jenis data kosong disebut', () => {
    const { alat, s } = alatAmag([TANPA_KEBERATAN]);
    const r = alat.lihatSesudahnya();
    const semua = [r.harga, r.dividen, r.rapat, r.laporan_kepemilikan, r.penghentian_perdagangan].flatMap((k) => k.fakta);
    expect(semua.length).toBeGreaterThan(8);
    expect(semua.filter((f) => f.tanggal <= T)).toEqual([]);
    expect(semua.filter((f) => !s.sesudah.lolos.has(f.fact_id))).toEqual([]);
    const teks = JSON.stringify(r).toLowerCase();
    for (const kata of paketAmag().kata_terlarang) expect(teks, kata).not.toContain(kata.toLowerCase());
    // Yang dipakai lampiran penyetuju memang ada di ringkasan, dengan sebutan yang dihitung kode.
    const peran = (id: string): string => (r.harga.fakta.find((f) => f.fact_id === id)?.peran ?? []).join(' | ');
    expect(peran('harga-2026-06-17')).toContain('hari bursa ke-1');
    expect(peran('harga-2026-06-23')).toContain('penutupan tertinggi sesudah tanggal simulasi, sejauh data yang ada (hanya hari ini)');
    expect(peran('harga-2026-06-19')).toContain('penutupan terendah');
    expect(peran('harga-2026-07-21')).toContain('baris harga terakhir di data');
    expect(r.data_harga_sampai).toBe('2026-07-21');
    expect(r.dividen).toMatchObject({ ada: false, fakta: [] });
    expect(r.rapat).toMatchObject({ ada: false, fakta: [] });
    expect(r.laporan_kepemilikan.keterangan).toContain('belum tentu berarti tidak ada laporan');
    expect(r.pada_hari_simulasi.calon_kartu_disingkirkan.map((d) => d.fact_id)).toEqual(['rups-2026-04-27']);
  });

  it('periksa_kasus_dengan_aturan: lampiran AMAG tulisan penyetuju lolos dan mendapat id_lampiran', () => {
    const { alat, peristiwa } = alatAmag([TANPA_KEBERATAN]);
    const h = alat.periksaKasus(drafAmag());
    expect(h.masalah).toEqual([]);
    expect(h.lolos).toBe(true);
    expect(h.id_lampiran).toMatch(/^[0-9a-f]{16}$/);
    expect(alat.periksaKasus(drafAmag()).id_lampiran).toBe(h.id_lampiran);
    expect(peristiwa.map((p) => p.alat)).toEqual(['periksa_kasus_dengan_aturan', 'periksa_kasus_dengan_aturan']);
  });

  it('periksa_kasus_dengan_aturan: masalah validator dikembalikan apa adanya', () => {
    const { alat, s } = alatAmag([TANPA_KEBERATAN]);
    const d = drafAmag();
    d.awam['harga-2026-06-15'] = { kepala: 'Data harga harian bursa efek · 15 Juni 2026', isi: LAMPIRAN.awam['harga-2026-06-15']?.isi ?? '' };
    d.soal[2] = { ...(d.soal[2] as DrafLampiran['soal'][number]), tanya: 'Omongan teman yang terakhir ini cocok dengan dokumennya atau tidak?' };
    d.penutup = { kepala: 'Dua omongan cocok.', isi: 'Angkanya [[harga-2026-06-15|Rp392]].' };
    const h = alat.periksaKasus(d);
    expect(h.lolos).toBe(false);
    expect(h.id_lampiran).toBeUndefined();

    // Pembanding: pembangun dan validator produk dipanggil langsung atas lampiran yang sama.
    const lampiran: LampiranPenyetuju = { kasus_id: s.kasus_id, sumber: s.sumber, emiten: s.emiten, ...d };
    let asli: KasusTidakSah | null = null;
    try {
      bangunKasusUmum(dariAgen({ paket: s.paket, omongan: s.omongan, lampiran, data: s.data }), s.beku === undefined ? s.data : { ...s.data, aturan_beku: [...s.beku.aturan] }, s.asal_gudang, s.kosong, s.asal_kosong);
    } catch (g) {
      if (g instanceof KasusTidakSah) asli = g;
      else throw g;
    }
    expect(asli?.masalah.map((m) => m.kode).sort()).toEqual(['KEPALA_PANJANG', 'KEPALA_PANJANG', 'PENUTUP_BERTAUT', 'TANYA_PANJANG', 'TANYA_TANPA_NAMA']); // kartu itu dipakai dua soal
    expect(h.masalah).toEqual(asli?.masalah.map((m) => ({ sumber: 'validator', kode: m.kode, pesan: m.pesan })));
  });

  it('periksa_kasus_dengan_aturan: penolakan pengubah, label angka, dan fakta sesudah tanggal simulasi di kartu', () => {
    const { alat } = alatAmag([TANPA_KEBERATAN]);
    const tanpaKartu = drafAmag();
    delete tanpaKartu.awam['volume-2026-06-12'];
    expect(alat.periksaKasus(tanpaKartu).masalah).toEqual([{ sumber: 'pengubah', pesan: 'lampiran tidak punya teks kartu awam untuk "volume-2026-06-12"' }]);

    const namaAsli = drafAmag();
    namaAsli.judul = 'AMAG: harga naik lima hari beruntun';
    expect(alat.periksaKasus(namaAsli).masalah).toEqual([{ sumber: 'pengubah', pesan: 'judul memuat kata terlarang paket: AMAG' }]);

    const angkaSalah = drafAmag();
    angkaSalah.pembukaan.paragraf[2] = '[[harga-2026-06-23|Penutupan tertinggi]] sesudah tanggal simulasi: [[harga-2026-06-23|Rp450]].';
    const m = alat.periksaKasus(angkaSalah).masalah;
    expect(m.map((x) => x.sumber)).toEqual(['label']);
    expect(m[0]?.pesan).toContain('angka "450" tidak tertulis di kalimat fakta itu');

    const bocor = drafAmag();
    bocor.awam['harga-2026-06-15'] = { kepala: 'Data harga harian · 15 Jun 2026', isi: 'Hari ini [[harga-2026-06-15|Rp392]]; lusa [[harga-2026-06-17|Rp398]].' };
    const kode = alat.periksaKasus(bocor).masalah.map((x) => x.kode);
    expect(kode).toContain('TAUTAN_SESUDAH_T');
  });

  it('teks soal yang diubah ditolak: lewat draft, dan lewat berkas bank yang disentuh', () => {
    const { alat } = alatAmag([TANPA_KEBERATAN]);
    const d = drafAmag() as unknown as { soal: Array<Record<string, unknown>> };
    (d.soal[2] as Record<string, unknown>)['pilihan'] = { a: 'Betul, x', b: 'Keliru, y', c: 'Betul, z', d: 'Keliru, w' };
    const h = alat.periksaKasus(d);
    expect(h.lolos).toBe(false);
    expect(h.masalah).toEqual([{ sumber: 'bentuk', pesan: 'soal ke-3: medan "pilihan" adalah teks soal yang sudah terkunci; lampiran soal hanya memuat id_omongan, soal_id, tanya, istilah.' }]);

    // Berkas bank disalin, lalu satu kata di pesan Dimas (versi lebih sulit) diganti tanpa mengubah id-nya.
    const bank = mkdtempSync(join(tmpdir(), 'bank-disentuh-'));
    cpSync(`${AKAR}${BANK}/${SHA}`, join(bank, SHA), { recursive: true });
    expect(readdirSync(join(bank, SHA))).toHaveLength(5);
    const jalur = join(bank, SHA, '25ddea4d9f1c3df0.json');
    const e = JSON.parse(readFileSync(jalur, 'utf8')) as { omongan: { pesan: string } };
    e.omongan.pesan = `${e.omongan.pesan} Beneran.`;
    writeFileSync(jalur, `${JSON.stringify(e, null, 2)}\n`, 'utf8');
    expect(() => siapkanAmag({ folderBank: bank })).toThrow(/isi omongan 25ddea4d9f1c3df0 sudah berubah sejak disimpan bank/);
    // Salinan yang tidak disentuh tetap diterima.
    const utuh = mkdtempSync(join(tmpdir(), 'bank-utuh-'));
    cpSync(`${AKAR}${BANK}/${SHA}`, join(utuh, SHA), { recursive: true });
    expect(siapkanAmag({ folderBank: utuh }).omongan).toHaveLength(3);
  });

  it('ajukan_kasus: critic keberatan → keberatan dikembalikan, TIDAK ada berkas; lampiran yang sama tidak dibayar dua kali', async () => {
    const { alat, folderKeluaran, critic } = alatAmag([KEBERATAN]);
    const id = alat.periksaKasus(drafAmag()).id_lampiran as string;
    expect(alat.adaLampiranSiap()).toBe(true);
    const h = await alat.ajukanKasus(id);
    expect(h).toMatchObject({ lolos: false, berhenti: 'critic', keberatan: ['[pembukaan paragraf 3] Kata "tertinggi" tidak didukung fakta yang ditautkan.'], arahan: 'Sebut angkanya saja.', biaya_pengajuan_usd: 0.03, sisa_anggaran_usd: 1.97 });
    expect(readdirSync(folderKeluaran)).toEqual([]);
    expect(alat.terbit()).toBeNull();
    expect(alat.adaLampiranSiap()).toBe(false);
    expect(alat.keadaan()).toMatchObject({ ditolak: 1, pengajuan: 1, biaya_kritik_usd: 0.03, terbit: false });
    const lagi = await alat.ajukanKasus(id);
    expect(lagi).toMatchObject({ berhenti: 'sudah-diajukan', biaya_pengajuan_usd: 0 });
    expect(critic.panggilan).toHaveLength(1);
  });

  it('ajukan_kasus: critic lolos → lampiran-agen.json + kasus.json, sama dengan kasus AMAG yang tayang', async () => {
    const { alat, folderKeluaran, critic, peristiwa } = alatAmag([TANPA_KEBERATAN]);
    const id = alat.periksaKasus(drafAmag()).id_lampiran as string;
    const h = await alat.ajukanKasus(id);
    expect(h).toMatchObject({ lolos: true, berhenti: 'lolos', keberatan: [], biaya_pengajuan_usd: 0.03 });
    expect(readdirSync(folderKeluaran).sort()).toEqual(['kasus.json', 'lampiran-agen.json']);
    expect(h.berkas?.every((b) => b.startsWith(folderKeluaran))).toBe(true);
    // Lampiran yang ditulis = lampiran penyetuju (tulisan + bagian yang dilengkapi kode); kasusnya = berkas tayang, byte demi byte.
    expect(JSON.parse(readFileSync(join(folderKeluaran, 'lampiran-agen.json'), 'utf8'))).toEqual(JSON.parse(JSON.stringify(LAMPIRAN)));
    expect(readFileSync(join(folderKeluaran, 'kasus.json'), 'utf8')).toBe(readFileSync(`${AKAR}cases/amag-2026-06-15.json`, 'utf8'));
    expect(alat.terbit()?.id_lampiran).toBe(id);
    expect(peristiwa.at(-1)).toMatchObject({ alat: 'ajukan_kasus' });

    // Critic yang dikunci: jenis dan model peran `kritikus`; ia tidak pernah melihat nama asli.
    expect(critic.panggilan).toHaveLength(1);
    expect(critic.panggilan[0]?.info).toMatchObject({ jenis: 'kritikus', peran: 'kritikus', model: MODEL_OR_GLM, putaran: 1, omongan: null });
    const pengguna = (critic.panggilan[0]?.pengguna ?? '').toLowerCase();
    for (const kata of paketAmag().kata_terlarang) expect(pengguna, kata).not.toContain(kata.toLowerCase());
    expect(pengguna).toContain('harga penutupan 17 juni 2026 adalah rp398 per lembar');
    expect(pengguna).toContain('data sesudah tanggal simulasi menurut program');

    // Sesudah terbit tidak ada pengajuan lagi.
    expect(await alat.ajukanKasus(id)).toMatchObject({ berhenti: 'sudah-terbit', biaya_pengajuan_usd: 0 });
    expect(critic.panggilan).toHaveLength(1);
  });

  it('ajukan_kasus: critic tidak menjawab dua kali → bukan lolos, tidak ada berkas, boleh diajukan lagi', async () => {
    const { alat, folderKeluaran, critic } = alatAmag(['', 'bukan json', TANPA_KEBERATAN]);
    const id = alat.periksaKasus(drafAmag()).id_lampiran as string;
    const h = await alat.ajukanKasus(id);
    expect(h).toMatchObject({ lolos: false, berhenti: 'tak-terukur', biaya_pengajuan_usd: 0.06 });
    expect(critic.panggilan.map((p) => p.info.ulang)).toEqual([0, 1]);
    expect(readdirSync(folderKeluaran)).toEqual([]);
    expect(alat.keadaan()).toMatchObject({ ditolak: 0, pengajuan: 1 });
    expect(await alat.ajukanKasus(id)).toMatchObject({ lolos: true, berhenti: 'lolos' });
    expect(readdirSync(folderKeluaran).sort()).toEqual(['kasus.json', 'lampiran-agen.json']);
  });

  it('ajukan_kasus: nomor lampiran tak dikenal dan anggaran di bawah cadangan → critic tidak dipanggil', async () => {
    const a = alatAmag([TANPA_KEBERATAN]);
    expect(await a.alat.ajukanKasus('0123456789abcdef')).toMatchObject({ lolos: false, berhenti: 'bentuk', biaya_pengajuan_usd: 0 });
    const b = alatAmag([TANPA_KEBERATAN], { pagu: 1, biayaAgen: () => 1 - CADANGAN_KRITIK_KASUS_USD + 0.01 });
    const id = b.alat.periksaKasus(drafAmag()).id_lampiran as string;
    expect(await b.alat.ajukanKasus(id)).toMatchObject({ lolos: false, berhenti: 'anggaran', biaya_pengajuan_usd: 0 });
    expect([...a.critic.panggilan, ...b.critic.panggilan]).toHaveLength(0);
    expect(readdirSync(b.folderKeluaran)).toEqual([]);
  });

  it('ajukan_kasus: critic yang melempar galat menghentikan percobaan, tanpa berkas', async () => {
    const folderKeluaran = mkdtempSync(join(tmpdir(), 'lengkapi-'));
    const alat = buatAlatLengkapi(siapkanAmag(), { folderKeluaran, panggil: () => Promise.reject(new Error('jaringan putus')), paguUsd: 2, biayaAgen: () => 0 });
    const id = alat.periksaKasus(drafAmag()).id_lampiran as string;
    expect(await alat.ajukanKasus(id)).toMatchObject({ lolos: false, berhenti: 'galat-critic' });
    expect(alat.rusak()).toContain('jaringan putus');
    expect(readdirSync(folderKeluaran)).toEqual([]);
  });
});
