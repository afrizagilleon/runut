/**
 * Halaman tampilan AI agent: fungsi murni `halaman/agen-murni.js` (modul yang
 * SAMA dengan yang dimuat peramban) dan teks halamannya.
 *
 * 1. Pemutaran BERTAHAP: langkah ke-n belum ditampilkan sebelum jedanya habis;
 *    jeda menahan, lanjut meneruskan dari sisa waktu, lompat menampilkan
 *    semuanya, kecepatan memendekkan jeda. (Sabotase: jeda nol → merah.)
 * 2. Pengurai SSE bertahap.
 * 3. Kata buatan yang dilarang pemilik tidak ada di teks halaman agent.
 */
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { KETERANGAN_TOOL, NAMA_TAHAP } from './baca-agen.ts';
import { siapkanReplay } from './replay-agen.ts';

const HALAMAN = fileURLToPath(new URL('./halaman/', import.meta.url));

interface LangkahUji {
  no: number;
  lama_ms: number;
}
interface PemutarUji {
  antrean: LangkahUji[];
  jumlahTampil: number;
  tuntas: boolean;
  jeda: boolean;
  fase: string;
  kecepatan: number;
  terima(l: LangkahUji): void;
  selesaiAliran(): void;
  jedaAtauLanjut(): void;
  lompat(): void;
  gantiKecepatan(n: number): void;
  matikan(): void;
}
interface Murni {
  TEKS: Record<string, string | ((...a: never[]) => string)>;
  KECEPATAN: Array<{ nilai: number; label: string }>;
  RUMUS_JEDA_AGEN: { PEMBAGI: number; DASAR_MS: number; MIN_MS: number; BATAS_MS: number };
  BAGIAN_PIKIR: number;
  JEDA_AKHIR_MS: number;
  jedaLangkah(lamaMs: number, kecepatan?: number): number;
  uraiSse(sisa: string, potongan: string): { peristiwa: Array<{ jenis: string; data: unknown }>; sisa: string };
  lama(ms: number): string;
  dolar(n: number): string;
  dolarRinci(n: number): string;
  potongNama(nama: string): string[];
  kodeDariKetikan(teks: unknown): string | null;
  tanggalPanjang(iso: string): string;
  ringkasTahap(l: Array<{ lama_ms: number; biaya_model_usd: number; biaya_penguji_usd: number }>): string;
  Pemutar: new (pakai: { tampilkan: (l: LangkahUji, gulir: boolean) => void; fase?: (f: string) => void; tuntas?: () => void; berubah?: () => void }, jam?: { sekarang?: () => number }) => PemutarUji;
}

let M: Murni;
beforeAll(async () => {
  M = (await import(pathToFileURL(join(HALAMAN, 'agen-murni.js')).href)) as Murni;
});

describe('pemutaran bertahap (Pemutar)', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  /** Tiga langkah: jeda 1× = 900, 1.700, 3.200 ms (rumus), lalu jeda akhir 1.200 ms. */
  const LANGKAH: LangkahUji[] = [
    { no: 1, lama_ms: 3_000 },
    { no: 2, lama_ms: 30_000 },
    { no: 3, lama_ms: 96_000 },
  ];

  function pasang(): { p: PemutarUji; tampil: number[]; fase: string[]; tuntas: () => number } {
    const tampil: number[] = [];
    const fase: string[] = [];
    let tuntas = 0;
    // Jam: Date.now() ikut jam palsu Vitest (performance.now() tidak).
    const p = new M.Pemutar({ tampilkan: (l) => tampil.push(l.no), fase: (f) => fase.push(f), tuntas: () => (tuntas += 1) }, { sekarang: () => Date.now() });
    return { p, tampil, fase, tuntas: () => tuntas };
  }

  it('rumus jeda: lama model / 30 + 0,7 detik, antara 0,9 dan 3,2 detik, dibagi kecepatan', () => {
    expect(M.jedaLangkah(3_000)).toBe(900);
    expect(M.jedaLangkah(30_000)).toBe(1_700);
    expect(M.jedaLangkah(96_000)).toBe(3_200);
    expect(M.jedaLangkah(0)).toBe(900);
    expect(M.jedaLangkah(30_000, 2)).toBe(850);
    expect(M.jedaLangkah(30_000, 4)).toBe(425);
    expect(M.RUMUS_JEDA_AGEN.MIN_MS).toBeGreaterThanOrEqual(500);
  });

  it('langkah muncul SATU PER SATU: langkah ke-n belum tampil sebelum jedanya habis', () => {
    const { p, tampil, tuntas } = pasang();
    for (const l of LANGKAH) p.terima(l);
    p.selesaiAliran();
    // Seluruh rekaman sudah diterima, tetapi belum satu langkah pun tampil.
    expect(tampil).toEqual([]);
    vi.advanceTimersByTime(899);
    expect(tampil).toEqual([]);
    vi.advanceTimersByTime(1);
    expect(tampil).toEqual([1]);
    vi.advanceTimersByTime(1_699);
    expect(tampil).toEqual([1]);
    vi.advanceTimersByTime(1);
    expect(tampil).toEqual([1, 2]);
    vi.advanceTimersByTime(3_199);
    expect(tampil).toEqual([1, 2]);
    vi.advanceTimersByTime(1);
    expect(tampil).toEqual([1, 2, 3]);
    // Simulasi yang jadi baru sesudah jeda akhir.
    expect(tuntas()).toBe(0);
    vi.advanceTimersByTime(M.JEDA_AKHIR_MS - 1);
    expect(tuntas()).toBe(0);
    vi.advanceTimersByTime(1);
    expect(tuntas()).toBe(1);
    expect(p.tuntas).toBe(true);
    expect(p.fase).toBe('usai');
  });

  it('fase: berpikir sebelum langkah pertama; sesudah tiap langkah tool menyala dulu, lalu agent berpikir lagi', () => {
    const { p, fase } = pasang();
    for (const l of LANGKAH) p.terima(l);
    expect(p.fase).toBe('pikir');
    vi.advanceTimersByTime(900);
    expect(p.fase).toBe('panggil');
    // 45% pertama jeda berikutnya (1.700 ms): tool langkah 1 masih menyala.
    vi.advanceTimersByTime(Math.floor(1_700 * (1 - M.BAGIAN_PIKIR)) - 1);
    expect(p.fase).toBe('panggil');
    vi.advanceTimersByTime(2);
    expect(p.fase).toBe('pikir');
    expect(fase[0]).toBe('pikir');
  });

  it('jeda menahan; lanjut meneruskan dari SISA waktu, bukan dari awal', () => {
    const { p, tampil } = pasang();
    for (const l of LANGKAH) p.terima(l);
    vi.advanceTimersByTime(900);
    expect(tampil).toEqual([1]);
    vi.advanceTimersByTime(1_000);
    p.jedaAtauLanjut();
    expect(p.jeda).toBe(true);
    vi.advanceTimersByTime(60_000);
    expect(tampil).toEqual([1]);
    p.jedaAtauLanjut();
    expect(p.jeda).toBe(false);
    vi.advanceTimersByTime(699);
    expect(tampil).toEqual([1]);
    vi.advanceTimersByTime(1);
    expect(tampil).toEqual([1, 2]);
  });

  it('lompat ke akhir: semua langkah yang sudah diterima tampil sekarang, berurutan, lalu tuntas', () => {
    const { p, tampil, tuntas } = pasang();
    for (const l of LANGKAH) p.terima(l);
    p.selesaiAliran();
    vi.advanceTimersByTime(900);
    p.jedaAtauLanjut();
    p.lompat();
    expect(tampil).toEqual([1, 2, 3]);
    expect(tuntas()).toBe(1);
    expect(p.jeda).toBe(false);
    vi.advanceTimersByTime(60_000);
    expect(tampil).toEqual([1, 2, 3]);
    expect(tuntas()).toBe(1);
  });

  it('kecepatan: 2× memendekkan jeda, juga sisa jeda yang sedang berjalan', () => {
    const { p, tampil } = pasang();
    p.gantiKecepatan(2);
    for (const l of LANGKAH) p.terima(l);
    vi.advanceTimersByTime(449);
    expect(tampil).toEqual([]);
    vi.advanceTimersByTime(1);
    expect(tampil).toEqual([1]);
    // Di tengah jeda langkah 2 (850 ms pada 2×): sesudah 250 ms pindah ke 4× → sisa 600 ms menjadi 300 ms.
    vi.advanceTimersByTime(250);
    p.gantiKecepatan(4);
    vi.advanceTimersByTime(299);
    expect(tampil).toEqual([1]);
    vi.advanceTimersByTime(1);
    expect(tampil).toEqual([1, 2]);
  });

  it('langkah yang datang belakangan (mode langsung) ikut antre; tanpa "selesai" pemutar menunggu', () => {
    const { p, tampil, tuntas } = pasang();
    p.terima(LANGKAH[0] as LangkahUji);
    vi.advanceTimersByTime(5_000);
    expect(tampil).toEqual([1]);
    expect(tuntas()).toBe(0);
    p.terima(LANGKAH[1] as LangkahUji);
    vi.advanceTimersByTime(1_700);
    expect(tampil).toEqual([1, 2]);
    p.selesaiAliran();
    vi.advanceTimersByTime(M.JEDA_AKHIR_MS);
    expect(tuntas()).toBe(1);
  });

  it('pemutar yang dimatikan tidak menampilkan apa pun lagi', () => {
    const { p, tampil } = pasang();
    for (const l of LANGKAH) p.terima(l);
    p.matikan();
    vi.advanceTimersByTime(60_000);
    expect(tampil).toEqual([]);
  });
});

describe('pengurai SSE bertahap', () => {
  it('peristiwa utuh diurai; potongan yang terbelah di tengah disimpan sebagai sisa', () => {
    const teks = 'retry: 2000\n\nid: 1\nevent: kepala\ndata: {"mode":"replay"}\n\nid: 2\nevent: langkah\ndata: {"no":1}\n\n: detak\n\nevent: selesai\ndata: {}\n\n';
    const a = M.uraiSse('', teks.slice(0, 50));
    const b = M.uraiSse(a.sisa, teks.slice(50, 90));
    const c = M.uraiSse(b.sisa, teks.slice(90));
    const semua = [...a.peristiwa, ...b.peristiwa, ...c.peristiwa];
    expect(semua).toEqual([
      { jenis: 'kepala', data: { mode: 'replay' } },
      { jenis: 'langkah', data: { no: 1 } },
      { jenis: 'selesai', data: {} },
    ]);
    expect(c.sisa).toBe('');
  });

  it('data yang bukan JSON menjadi null, bukan galat', () => {
    expect(M.uraiSse('', 'event: langkah\ndata: {rusak\n\n').peristiwa).toEqual([{ jenis: 'langkah', data: null }]);
  });
});

describe('format', () => {
  it('lama, dolar, nama tool, kode, tanggal', () => {
    expect(M.lama(4_456)).toBe('4,5 detik');
    expect(M.lama(96_745)).toBe('1 menit 37 detik');
    expect(M.lama(120_000)).toBe('2 menit');
    expect(M.dolar(2.776)).toBe('US$2,78');
    expect(M.dolarRinci(0.0054938)).toBe('US$0,0055');
    expect(M.potongNama('periksa_draft_dengan_aturan')).toEqual(['periksa_', 'draft_', 'dengan_', 'aturan']);
    expect(M.kodeDariKetikan(' amag ')).toBe('AMAG');
    expect(M.kodeDariKetikan('AM')).toBeNull();
    expect(M.kodeDariKetikan('AMAG1')).toBeNull();
    expect(M.tanggalPanjang('2026-06-15')).toBe('15 Juni 2026');
    expect(M.ringkasTahap([{ lama_ms: 4_456, biaya_model_usd: 0.03, biaya_penguji_usd: 0.02 }])).toBe('1 langkah · model 4,5 detik · US$0,05');
  });
});

/**
 * Kata buatan yang dilarang pemilik di teks halaman agent (keputusan 5 Okt).
 * Nama tool sungguhan (mis. `lihat_bank`) tidak kena: garis bawah menyambung kata.
 */
export const KATA_DILARANG: ReadonlyArray<{ nama: string; pola: RegExp }> = [
  { nama: 'lingkar', pola: /\blingkar/i },
  { nama: 'gerbang', pola: /\bgerbang\b/i },
  { nama: 'saringan', pola: /\bsaringan\b/i },
  { nama: 'kembaran', pola: /\bkembaran/i },
  { nama: 'selabel', pola: /\bselabel/i },
  { nama: 'pagu', pola: /\bpagu\b/i },
  { nama: 'jalan (run)', pola: /\bjalan\b/i },
  { nama: 'tayang', pola: /\b(di)?tayang(kan)?\b/i },
  { nama: 'terbit', pola: /\bterbit\b/i },
  { nama: 'sudut', pola: /\bsudut\b/i },
  { nama: 'bank', pola: /\bbank\b/i },
  { nama: 'peran', pola: /\bperan\b/i },
  { nama: 'meresmikan', pola: /\bmeresmikan\b/i },
  { nama: 'artefak', pola: /\bartefak\b/i },
  { nama: 'kode G-', pola: /\bG-[a-z]/ },
  { nama: 'kode R-angka', pola: /\bR\d{1,2}[a-z]?\b/ },
  { nama: 'gagal', pola: /\bgagal\b/i },
  { nama: 'percobaan ulang', pola: /percobaan ulang/i },
  { nama: 'anggaran', pola: /\banggaran\b/i },
];

function langgar(teks: string): string[] {
  return KATA_DILARANG.filter((k) => k.pola.test(teks)).map((k) => k.nama);
}

describe('kata buatan tidak tampil di teks halaman agent', () => {
  it('pola larangan benar-benar menangkap katanya (dan tidak menangkap nama tool)', () => {
    expect(langgar('berhenti di saringan')).toEqual(['saringan']);
    expect(langgar('lolos → bank (1/3)')).toEqual(['bank']);
    expect(langgar('gerbang artefak: meresmikan')).toEqual(['gerbang', 'meresmikan', 'artefak']);
    expect(langgar('pemeriksa: G-angka-cukup')).toEqual(['kode G-']);
    expect(langgar('aturan R26 dan pagu jalan ini tidak terbit')).toEqual(['pagu', 'jalan (run)', 'terbit', 'kode R-angka']);
    expect(langgar('Agent memanggil lihat_bank lalu menjalankan pemeriksa aturan dengan budget.')).toEqual([]);
  });

  it('teks tetap halaman (TEKS), agen.html, dan semua teks di agen.js', () => {
    const tetap: string[] = [];
    for (const v of Object.values(M.TEKS)) tetap.push(typeof v === 'string' ? v : (v as (...a: unknown[]) => string)('X', 'Y'));
    for (const v of M.KECEPATAN) tetap.push(v.label);
    const html = readFileSync(join(HALAMAN, 'agen.html'), 'utf8').replace(/<[^>]+>/g, ' ');
    // Semua teks berkutip di agen.js (termasuk nama kelas; komentar dibuang lebih dulu).
    const js = readFileSync(join(HALAMAN, 'agen.js'), 'utf8').replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');
    const kutip = js.match(/'(?:[^'\\\n]|\\.)*'|`(?:[^`\\]|\\.)*`/g) ?? [];
    expect(tetap.length).toBeGreaterThan(40);
    expect(kutip.length).toBeGreaterThan(100);
    for (const t of [...tetap, html, ...kutip]) expect(langgar(t), t.slice(0, 80)).toEqual([]);
  });

  it('semua yang dikirim server untuk Ringkas dan Diagram: kalimat langkah, nama tahap, keterangan tool, keterangan penyetuju', () => {
    const r = siapkanReplay();
    const teks: string[] = [
      ...Object.values(NAMA_TAHAP),
      ...Object.values(KETERANGAN_TOOL),
      ...r.kepala.tahap.map((t) => t.nama),
      ...r.kepala.tool.map((t) => t.keterangan ?? ''),
      r.simulasi.keterangan_penyetuju,
      ...r.langkah.flatMap((l) => [...l.ringkas.map((x) => x.kalimat), ...l.hasil.map((x) => x.kalimat), l.ucapan ?? '']),
    ];
    expect(teks.length).toBeGreaterThan(80);
    for (const t of teks) expect(langgar(t), t).toEqual([]);
  });

  it('rekaman asli MEMANG memuat kata itu — karena itu hanya ada di lipatan "rekaman asli" tampilan Rinci', () => {
    const r = siapkanReplay();
    const asli = r.langkah.flatMap((l) => l.hasil.map((h) => h.asli.ringkas));
    expect(asli.some((t) => langgar(t).length > 0)).toBe(true);
    const js = readFileSync(join(HALAMAN, 'agen.js'), 'utf8');
    // `asli` hanya dibaca di satu fungsi: lipatan yang berlabel TEKS.rekamanAsli.
    expect(js.match(/\.asli\b/g)).toHaveLength(2);
    expect(js).toMatch(/function lipatanAsli\(h\) \{[\s\S]*?TEKS\.rekamanAsli[\s\S]*?h\.asli\.ringkas[\s\S]*?h\.asli\.hasil[\s\S]*?\n\}/);
    expect(M.TEKS['rekamanAsli']).toBe('rekaman asli');
  });

  it('halaman tidak memakai innerHTML dan tidak memuat alamat luar', () => {
    for (const berkas of ['agen.js', 'agen-murni.js', 'agen.html', 'agen.css']) {
      const isi = readFileSync(join(HALAMAN, berkas), 'utf8');
      expect(isi, berkas).not.toMatch(/innerHTML|outerHTML|insertAdjacentHTML|document\.write/);
      expect(isi.replace('http://www.w3.org/2000/svg', ''), berkas).not.toMatch(/https?:\/\//);
    }
  });
});
