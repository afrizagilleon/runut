/**
 * Halaman tampilan AI agent: fungsi murni `halaman/agen-murni.js` (modul yang
 * SAMA dengan yang dimuat peramban) dan teks halamannya.
 *
 * 1. Pemutaran BERTAHAP: langkah ke-n belum ditampilkan sebelum jedanya habis;
 *    jeda menahan, lanjut meneruskan dari sisa waktu, lompat menampilkan
 *    semuanya, kecepatan memendekkan jeda. (Sabotase: jeda nol → merah.)
 * 2. Pengurai SSE bertahap.
 * 3. Kata buatan yang dilarang pemilik tidak ada di teks halaman agent, di
 *    SEMUA kalimat yang bisa dikirim server (bukan hanya yang muncul di
 *    rekaman), dan di pesan galat rute agent (M2d-32 R-3).
 * 4. Tanpa pembingkaian kegagalan (M2d-32 D-7): tidak ada "ditolak"/"menolak"
 *    dan tidak ada pecahan hitungan di teks kami.
 * 5. Baris tanpa tool result tidak digambar (F-2); label waktu dan budget (F-6).
 */
import { mkdtempSync, readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { KALIMAT_MENULIS_ULANG, KELOMPOK_TOOL, KETERANGAN_TOOL, NAMA_TAHAP, PETA_BERHENTI, PETA_KODE_ATURAN, PETA_KRITIKUS, TOOL_ATURAN, barisBaca, kalimatTolak, type JenisTolak } from './baca-agen.ts';
import { akarSementara, minta, mulaiServer } from './bantu-uji.ts';
import { kodeRekaman, type HasilTool } from './rekaman-agen.ts';
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
  angkaSingkat(l: { lama_ms: number; biaya_model_usd: number; biaya_penguji_usd: number }): string;
  angkaLangkah(l: { lama_ms: number; biaya_model_usd: number; biaya_penguji_usd: number; token: { masuk: number; keluar: number; berpikir: number } }): string[];
  labelStatus(status: string | null): string | null;
  LAMA_TERBANG_MS: number;
  keadaanAgen(fase: string, gerak: string, adaLangkah: boolean): string;
  capLangkah(l: { ringkas: Array<{ status: string | null }> }): string[];
  toolBerhasil(l: { hasil: Array<{ alat: string }> }, tool: Array<{ nama: string; nama_lama: string[] }>): number[];
  budgetDariKetikan(teks: unknown, maks: number): number | null;
  persen(nilai: number): string;
  kalimatAkhir(hasil: string): string;
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
  });

  it('M2d-31 F-6: lama dan biaya berlabel — "waktu model" (lama model menjawab) dan "biaya"; budget menyebut jumlah rekamannya', () => {
    const l = { lama_ms: 4_456, biaya_model_usd: 0.03, biaya_penguji_usd: 0.02, token: { masuk: 6_933, keluar: 46, berpikir: 15 } };
    expect(M.ringkasTahap([l])).toBe('1 langkah · waktu model 4,5 detik · biaya US$0,05');
    expect(M.angkaSingkat(l)).toBe('waktu model 4,5 detik · biaya US$0,0500');
    expect(M.angkaLangkah(l)).toEqual(['waktu model 4,5 detik', 'biaya model US$0,0300', 'biaya penguji US$0,0200', 'token berpikir 15', 'token masuk 6.933', 'token keluar 46']);
    const teks = M.TEKS as unknown as { biayaBudget: (a: string, b: string, n: number) => string; keteranganBudget: (b: string, n: number) => string; keteranganWaktu: string; keteranganRingkas: string };
    expect(teks.biayaBudget('US$0,59', 'US$5,00', 4)).toBe('Biaya US$0,59 dari budget US$5,00 untuk 4 rekaman');
    expect(teks.keteranganBudget('US$5,00', 4)).toBe('Budget US$5,00 adalah jumlah budget 4 rekaman kerja agent yang diputar di sini.');
    expect(teks.keteranganWaktu).toMatch(/jumlah lama model menjawab, bukan lama seluruh tahap/);
    expect(teks.keteranganRingkas).toMatch(/"waktu model" adalah lama model menjawab di langkah itu/);
  });
});

describe('diagram: yang terlihat saat sebuah langkah diputar (M2d-32 D-4)', () => {
  it('keadaan agent: memilih → mengirim tool call → menunggu tool result → membaca tool result → memilih lagi → selesai', () => {
    expect(M.keadaanAgen('diam', 'tiba', false)).toBe('diam');
    expect(M.keadaanAgen('pikir', 'tiba', false)).toBe('pikir');
    expect(M.keadaanAgen('panggil', 'pergi', true)).toBe('kirim');
    expect(M.keadaanAgen('panggil', 'kembali', true)).toBe('tunggu');
    expect(M.keadaanAgen('panggil', 'tiba', true)).toBe('baca');
    expect(M.keadaanAgen('pikir', 'tiba', true)).toBe('pikir');
    // Pemutar sudah pindah ke "pikir" tetapi keping masih di jalan (kecepatan tinggi): geraknya yang ditunjukkan.
    expect(M.keadaanAgen('pikir', 'kembali', true)).toBe('tunggu');
    expect(M.keadaanAgen('usai', 'tiba', true)).toBe('usai');
    // Dua kali terbang muat di jeda terpendek antar-langkah pada 1× (900 ms).
    expect(M.LAMA_TERBANG_MS * 2).toBeLessThan(M.RUMUS_JEDA_AGEN.MIN_MS);
  });

  it('hasil yang mendarat di agent = status tool result langkah itu, satu cap per status; label memakai kata kerja cara kerja', () => {
    const r = siapkanReplay();
    const l5 = r.langkah[4];
    if (l5 === undefined) throw new Error('langkah 5 hilang');
    expect(M.capLangkah(l5)).toEqual(['perbaiki', 'lolos']);
    expect(M.capLangkah(l5).map((x) => M.labelStatus(x))).toEqual(['diminta perbaiki', 'lolos']);
    expect(M.labelStatus('tidak-dipakai')).toBe('tidak dipakai');
    expect(M.labelStatus(null)).toBeNull();
    // Langkah yang hanya membaca bahan tidak memberi cap.
    expect(M.capLangkah(r.langkah[0] as { ringkas: Array<{ status: string | null }> })).toEqual([]);
    // Tiap status yang dikirim server punya label; tidak ada status di luar tiga itu.
    const status = new Set(r.langkah.flatMap((l) => l.ringkas.map((x) => x.status)).filter((x) => x !== null));
    expect([...status].sort()).toEqual(['lolos', 'perbaiki', 'tidak-dipakai']);
    for (const x of status) expect(M.labelStatus(x)).toBeTypeOf('string');
  });

  it('tool result hanya kembali dari tool yang memang punya tool result di langkah itu (F-2: tanpa baris "tidak tercatat")', () => {
    const r = siapkanReplay();
    const l2 = r.langkah[1];
    if (l2 === undefined) throw new Error('langkah 2 hilang');
    // Langkah 2: agent memanggil dua tool, rekaman langkah itu mencatat satu tool result.
    expect(l2.memanggil).toEqual(['periksa_saham', 'lihat_bank']);
    expect(l2.tanpa_hasil).toEqual(['lihat_bank']);
    expect(l2.nyala.map((i) => r.kepala.tool[i]?.nama)).toEqual(['periksa_saham', 'lihat_bank']);
    expect(M.toolBerhasil(l2, r.kepala.tool).map((i) => r.kepala.tool[i]?.nama)).toEqual(['periksa_saham']);
    for (const l of r.langkah) for (const i of M.toolBerhasil(l, r.kepala.tool)) expect(l.nyala, `langkah ${String(l.no)}`).toContain(i);
    // Halaman tidak lagi menggambar baris untuk tool tanpa tool result, dan tidak punya teksnya.
    const js = readFileSync(join(HALAMAN, 'agen.js'), 'utf8');
    expect(js).not.toMatch(/tanpa_hasil|tanpaHasil/);
    expect(Object.keys(M.TEKS)).not.toContain('tanpaHasil');
    expect(JSON.stringify(Object.values(M.TEKS).filter((v) => typeof v === 'string'))).not.toMatch(/tidak tercatat/);
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
  { nama: 'kode R-angka', pola: /\bR-?\d{1,2}[a-z]?\b/ },
  { nama: 'gagal', pola: /\bgagal\b/i },
  { nama: 'percobaan ulang', pola: /percobaan ulang/i },
  { nama: 'anggaran', pola: /\banggaran\b/i },
  // M-PN1 A-1 (T-A2): istilah buatan kontrak, bukan kata yang dibaca orang. Di mana pun dalam kata, juga di nama id dan kelas.
  { nama: 'pelari', pola: /pelari/i },
  { nama: 'tiruan', pola: /tiruan/i },
];

/**
 * Pembingkaian kegagalan (M2d-32 D-7), dilarang di teks KAMI: label dan kalimat
 * memakai kata kerja cara kerja ("diminta perbaiki"), tanpa pecahan hitungan.
 * "Langkah 6 dari 21" boleh (itu kemajuan) dan "Biaya … dari budget …" bukan pecahan hitungan.
 * Tidak dipakai atas ucapan agent: itu rekaman, bukan teks kami.
 */
export const BINGKAI_KEGAGALAN: ReadonlyArray<{ nama: string; pola: RegExp }> = [
  { nama: 'tolak', pola: /(?:to|no)lak/i },
  { nama: 'pecahan hitungan', pola: /(?<!Langkah )\b\d+ dari \d+\b/ },
];

function langgar(teks: string): string[] {
  return KATA_DILARANG.filter((k) => k.pola.test(teks)).map((k) => k.nama);
}

function membingkai(teks: string): string[] {
  return BINGKAI_KEGAGALAN.filter((k) => k.pola.test(teks)).map((k) => k.nama);
}

/** Semua kalimat yang BISA dikirim server untuk satu tool result: tiap jenis, tiap sebab, tiap tool. */
function semuaKalimatServer(): string[] {
  const h = (alat: string, hasil: unknown): HasilTool => ({ alat, ringkas: '', hasil });
  const keluar: string[] = [KALIMAT_MENULIS_ULANG];
  const jenis: JenisTolak[] = [...new Set<JenisTolak>([...Object.values(PETA_BERHENTI), 'aturan', 'tak-dikenal'])];
  for (const j of jenis) {
    for (const obyek of ['draf ini', 'simulasi ini']) {
      keluar.push(kalimatTolak(h('ajukan', { lolos: false, penolakan: [] }), j, obyek));
      keluar.push(kalimatTolak(h('ajukan', { lolos: false, penolakan: ['penebak memilih kunci 12 dari 12'] }), j, obyek));
    }
  }
  for (const k of Object.keys(PETA_KRITIKUS)) keluar.push(barisBaca(h('ajukan_kasus', { lolos: false, berhenti: 'kritikus', keberatan: [`[kritikus: ${k}] x`] })).kalimat);
  // Awalan kode aturan seperti di rekaman; sebabnya yang dikirim, kodenya tidak.
  const AWALAN = ['pemeriksa: G-angka-cukup: x', 'gerbang artefak: meresmikan: x', 'gerbang artefak: keseimbangan: x', 'pemeriksa: G-panjang: x', 'pemeriksa: OPSI_PANJANG_TIMPANG: x', 'pemeriksa: ANGKA_TANPA_RUJUKAN: x', 'pemeriksa: G-penilaian: x'];
  for (const a of AWALAN) keluar.push(barisBaca(h('periksa_draft_dengan_aturan', { lolos: false, penolakan: [a] })).kalimat);
  keluar.push(...PETA_KODE_ATURAN.map((x) => x.sebab));
  const TOOL = [...KELOMPOK_TOOL.flatMap((k) => k.tool), 'periksa_kode', 'tool_entah'];
  for (const t of TOOL) {
    keluar.push(barisBaca(h(t, { lolos: true })).kalimat);
    keluar.push(barisBaca(h(t, {})).kalimat);
    keluar.push(barisBaca(h(t, { hari: [1, 2], omongan: [], aturan_dijalankan: 15, kartu_lolos: 17, disingkirkan: [1] })).kalimat);
    keluar.push(barisBaca(h(t, { omongan: [1, 2, 3] })).kalimat);
  }
  return [...new Set(keluar)];
}

describe('kata buatan tidak tampil di teks halaman agent', () => {
  it('pola larangan benar-benar menangkap katanya (dan tidak menangkap nama tool)', () => {
    expect(langgar('berhenti di saringan')).toEqual(['saringan']);
    expect(langgar('lolos → bank (1/3)')).toEqual(['bank']);
    expect(langgar('gerbang artefak: meresmikan')).toEqual(['gerbang', 'meresmikan', 'artefak']);
    expect(langgar('pemeriksa: G-angka-cukup')).toEqual(['kode G-']);
    expect(langgar('aturan R26 dan pagu jalan ini tidak terbit')).toEqual(['pagu', 'jalan (run)', 'terbit', 'kode R-angka']);
    expect(langgar('Agent memanggil lihat_bank lalu menjalankan pemeriksa aturan dengan budget.')).toEqual([]);
    expect(langgar('lihat R-3 dan R12')).toEqual(['kode R-angka']);
    expect(langgar('PELARI TIRUAN — bukan agent sungguhan')).toEqual(['pelari', 'tiruan']);
    expect(langgar('pita-tiruan-kerja')).toEqual(['tiruan']);
    expect(langgar('Pelari sudah dimatikan')).toEqual(['pelari']);
    expect(langgar('Proses agent sudah dimatikan; program yang menjalankan agent berhenti.')).toEqual([]);
    expect(langgar('Harga penutupan Rp392 per lembar.')).toEqual([]);
    expect(membingkai('ditolak')).toEqual(['tolak']);
    expect(membingkai('Kritikus menolak: 12 dari 12 tebakan')).toEqual(['tolak', 'pecahan hitungan']);
    expect(membingkai('Langkah 6 dari 21 · Biaya US$0,59 dari budget US$5,00 untuk 4 rekaman')).toEqual([]);
    expect(membingkai('diminta perbaiki')).toEqual([]);
  });

  it('teks tetap halaman (TEKS), agen.html, dan semua teks di agen.js', () => {
    const tetap: string[] = [];
    for (const v of Object.values(M.TEKS)) tetap.push(typeof v === 'string' ? v : (v as (...a: unknown[]) => string)('X', 'Y'));
    for (const v of M.KECEPATAN) tetap.push(v.label);
    const html = readFileSync(join(HALAMAN, 'agen.html'), 'utf8').replace(/<[^>]+>/g, ' ');
    // Semua teks berkutip di agen.js (termasuk nama kelas; komentar dibuang lebih dulu).
    const js = readFileSync(join(HALAMAN, 'agen.js'), 'utf8').replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');
    const kutip = js.match(/'(?:[^'\\\n]|\\.)*'|`(?:[^`\\]|\\.)*`/g) ?? [];
    // Fungsi teks juga dipanggil dengan angka, seperti di halaman ("Langkah 6 dari 21", budget 4 rekaman).
    for (const v of Object.values(M.TEKS)) if (typeof v !== 'string') tetap.push((v as (...a: unknown[]) => string)(6, 21, 4));
    // Teks di atribut agen.html (aria-label, placeholder, title) ikut diperiksa.
    const atribut = [...readFileSync(join(HALAMAN, 'agen.html'), 'utf8').matchAll(/(?:aria-label|title|placeholder|alt)="([^"]*)"/g)].map((m) => m[1] ?? '');
    expect(tetap.length).toBeGreaterThan(60);
    expect(kutip.length).toBeGreaterThan(100);
    expect(atribut.length).toBeGreaterThan(2);
    for (const t of [...tetap, html, ...atribut, ...kutip]) {
      expect(langgar(t), t.slice(0, 80)).toEqual([]);
      expect(membingkai(t), t.slice(0, 80)).toEqual([]);
    }
    // CSS tidak menyisipkan teks (content: "…") yang lolos dari pemeriksaan ini.
    expect(readFileSync(join(HALAMAN, 'agen.css'), 'utf8').replace(/\/\*[\s\S]*?\*\//g, '')).not.toMatch(/(?:^|[\s;{])content\s*:/);
  });

  it('SEMUA kalimat yang bisa dikirim server (tiap jenis, tiap sebab, tiap tool), nama kelompok, dan keterangan tool', () => {
    const teks = [...semuaKalimatServer(), ...KELOMPOK_TOOL.map((k) => k.nama), ...Object.values(KETERANGAN_TOOL), ...Object.values(NAMA_TAHAP), ...Object.values(PETA_KRITIKUS)];
    expect(teks.length).toBeGreaterThan(70);
    expect(TOOL_ATURAN.length).toBe(3);
    for (const t of teks) {
      expect(langgar(t), t).toEqual([]);
      expect(membingkai(t), t).toEqual([]);
    }
  });

  it('pesan galat rute agent yang bisa sampai ke halaman', async () => {
    const s = await mulaiServer({ akar: akarSementara(null), replayAgen: {} });
    try {
      const pesan: string[] = [];
      for (const jalur of ['/api/agen/aliran?kode=TIRT', '/api/agen/aliran?kode=1', '/api/agen/aliran']) {
        const j = await minta(s.port, 'GET', jalur);
        expect(j.status, jalur).toBeGreaterThanOrEqual(400);
        pesan.push((j.json() as { galat: string }).galat);
      }
      expect(pesan[0]).toBe(`Belum ada rekaman AI agent untuk TIRT. Rekaman yang ada: ${kodeRekaman()}.`);
      for (const t of pesan) {
        expect(langgar(t), t).toEqual([]);
        expect(membingkai(t), t).toEqual([]);
      }
    } finally {
      await s.tutup();
    }
  });

  it('M-PN1: pesan rute "Jalankan Runut Agent" yang bisa sampai ke halaman (tanpa kunci, tanpa setuju, budget, kredit, kerja kedua, hentikan)', async () => {
    // PENGGANTI UJI (disuntikkan dari kode tes): tidak menulis dan tidak memanggil apa pun; hanya ada supaya pesan "masih ada yang bekerja" bisa dipancing.
    let beres: (h: { kodeKeluar: number | null }) => void = () => undefined;
    const pelari = { folderDasar: mkdtempSync(join(tmpdir(), 'pn1-pesan-')), mulai: () => ({ pid: null, hentikan: () => beres({ kodeKeluar: null }), selesai: new Promise<{ kodeKeluar: number | null }>((b) => (beres = b)) }) };
    const pesan: string[] = [];
    const galat = async (port: number, metode: string, jalur: string, badan?: unknown): Promise<void> => {
      const j = await minta(port, metode, jalur, badan === undefined ? {} : { badan });
      expect(j.status, `${metode} ${jalur} ${JSON.stringify(badan)}`).toBeGreaterThanOrEqual(400);
      pesan.push((j.json() as { galat: string }).galat);
    };
    const tanpaKunci = await mulaiServer({ akar: akarSementara(null), replayAgen: {}, agenLangsung: { pelari } });
    try {
      pesan.push(((await minta(tanpaKunci.port, 'GET', '/api/status')).json() as { jalankan: { alasan: string } }).jalankan.alasan);
      await galat(tanpaKunci.port, 'POST', '/api/agen/jalankan', { kode: 'TIRT', setuju: true, budget_usd: 1 });
      await galat(tanpaKunci.port, 'GET', '/api/agen/langsung/aliran');
      await galat(tanpaKunci.port, 'POST', '/api/agen/hentikan', {});
      await galat(tanpaKunci.port, 'POST', '/api/siapkan', {});
    } finally {
      await tanpaKunci.tutup();
    }
    const s = await mulaiServer({ akar: akarSementara(), replayAgen: {}, agenLangsung: { pelari } });
    try {
      await galat(s.port, 'POST', '/api/agen/jalankan', { kode: 'TIRT', budget_usd: 1 });
      await galat(s.port, 'POST', '/api/agen/jalankan', { kode: 'TIRT', setuju: true, budget_usd: 9 });
      await galat(s.port, 'POST', '/api/agen/jalankan', { kode: '1', setuju: true, budget_usd: 1 });
      await galat(s.port, 'POST', '/api/agen/jalankan', { kode: 'TIRT', setuju: true, budget_usd: 1 });
      await galat(s.port, 'GET', '/api/agen/siap?kode=1');
      expect((await minta(s.port, 'POST', '/api/agen/jalankan', { badan: { kode: 'TIRT', setuju: true, budget_usd: 1, setuju_kredit: true } })).status).toBe(202);
      await galat(s.port, 'POST', '/api/agen/jalankan', { kode: 'TIRT', setuju: true, budget_usd: 1, setuju_kredit: true });
      s.keadaan.langsung?.hentikan();
    } finally {
      await s.tutup();
    }
    expect(pesan).toHaveLength(11);
    expect(pesan.join(' | ')).toMatch(/LLM_API_KEY/);
    expect(pesan.join(' | ')).toMatch(/kredit Sectors/);
    expect(pesan.join(' | ')).toMatch(/hanya satu yang boleh bekerja/);
    for (const t of pesan) {
      expect(t.length, t).toBeGreaterThan(20);
      expect(langgar(t), t).toEqual([]);
      expect(membingkai(t), t).toEqual([]);
    }
  });

  it('M-PN1: dua pilihan berjudul jujur; persetujuan hanya dikirim dari satu tombol; rekaman tidak bisa menyamar sebagai kerja langsung', () => {
    const html = readFileSync(join(HALAMAN, 'agen.html'), 'utf8');
    // Kode saja: komentar dibuang lebih dulu.
    const js = readFileSync(join(HALAMAN, 'agen.js'), 'utf8').replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');
    // Judul dan tombol: "Jalankan Runut Agent" dan "Putar ulang rekaman"; nama lama yang menyesatkan hilang.
    expect(html).toMatch(/<h3>Jalankan Runut Agent<\/h3>/);
    expect(html).toMatch(/<h3>Putar ulang rekaman<\/h3>/);
    expect(html).toMatch(/id="tombol-jalankan">Jalankan Runut Agent<\/button>/);
    expect(html).toMatch(/id="tombol-putar">Putar ulang rekaman<\/button>/);
    expect(html).toMatch(/id="tombol-hentikan" hidden>Hentikan agent<\/button>/);
    expect(M.TEKS['tombolPutar']).toBe('Putar ulang rekaman');
    expect(M.TEKS['tombolJalankan']).toBe('Jalankan Runut Agent');
    expect(`${html}\n${js}\n${JSON.stringify(Object.values(M.TEKS).filter((v) => typeof v === 'string'))}`).not.toMatch(/Putar kerja agent/);
    // A-1: tidak ada pita, kolom, atau teks mode uji di halaman.
    expect(`${html}\n${js}\n${readFileSync(join(HALAMAN, 'agen-murni.js'), 'utf8')}`).not.toMatch(/tiruan|pelari/i);
    // `setuju: true` dikirim dari SATU tempat: fungsi tombol setuju. Tombol "Jalankan" sendiri hanya membuka pernyataan biaya.
    expect(js.match(/setuju: true/g)).toHaveLength(1);
    expect(js.match(/'\/api\/agen\/jalankan'/g)).toHaveLength(1);
    expect(js).toMatch(/async function setujuJalankan\(\) \{[\s\S]*?kirim\('\/api\/agen\/jalankan', \{ kode, setuju: true, budget_usd: budget[\s\S]*?\n\}/);
    const buka = /async function bukaSetuju\(\) \{[\s\S]*?\n\}/.exec(js)?.[0] ?? '';
    expect(buka).toMatch(/TEKS\.pernyataanBiaya/);
    expect(buka).not.toMatch(/kirim\(|method: 'POST'/);
    expect(js).toMatch(/\$\('tombol-setuju'\)\.addEventListener\('click', \(\) => void setujuJalankan\(\)\)/);
    // Enter di kolom kode dan tombol "Putar dari awal" hanya pernah memutar rekaman.
    const kirimForm = /\$\('form-agen'\)\.addEventListener\('submit'[\s\S]*?\n {2}\}\);/.exec(js)?.[0] ?? '';
    expect(kirimForm).toMatch(/void putar\(kode\)/);
    expect(kirimForm).not.toMatch(/ikutiLangsung|setujuJalankan|bukaSetuju|kirim\(/);
    expect(js).toMatch(/\$\('tombol-ulang'\)\.hidden = !tuntas \|\| langsung;/);
    // Alamat aliran: rekaman dan kerja langsung tidak pernah tertukar.
    expect(/async function putar\(kode\) \{[\s\S]*?\n\}/.exec(js)?.[0]).toMatch(/\/api\/agen\/aliran\?kode=/);
    expect(/async function putar\(kode\) \{[\s\S]*?\n\}/.exec(js)?.[0]).not.toMatch(/langsung/);
    expect(/async function ikutiLangsung\(\) \{[\s\S]*?\n\}/.exec(js)?.[0]).toMatch(/'\/api\/agen\/langsung\/aliran'/);
    expect(js.match(/\/api\/agen\/aliran\?kode=/g)).toHaveLength(1);
  });

  it('M-PN1: budget dari ketikan, persen, dan kalimat keadaan akhir (keadaan + langkah berikutnya, tanpa pembingkaian)', () => {
    expect(M.budgetDariKetikan('1,5', 2)).toBe(1.5);
    expect(M.budgetDariKetikan(' 2 ', 2)).toBe(2);
    expect(M.budgetDariKetikan('0.25', 2)).toBe(0.25);
    for (const t of ['2,01', '0', '-1', '', 'abc', '1e1', '1.5.0', null, undefined, '99']) expect(M.budgetDariKetikan(t, 2), String(t)).toBeNull();
    expect(M.persen(0.15)).toBe('15%');
    const akhir = ['terakit', 'budget', 'berhenti', 'dihentikan', 'tanpa-hasil'].map((h) => M.kalimatAkhir(h));
    expect(new Set(akhir).size).toBe(5);
    expect(M.kalimatAkhir('entah')).toBe(M.kalimatAkhir('berhenti'));
    expect(M.kalimatAkhir('budget')).toMatch(/^Agent berhenti karena budget tidak cukup untuk satu langkah lagi\. .*(jalankan lagi|lanjutkan)/);
    for (const t of akhir) {
      expect(langgar(t), t).toEqual([]);
      expect(membingkai(t), t).toEqual([]);
    }
  });

  it('semua yang dikirim server untuk Ringkas dan Diagram: kalimat langkah, nama tahap, keterangan tool, keterangan penyetuju', () => {
    const r = siapkanReplay();
    const teks: string[] = [
      ...Object.values(NAMA_TAHAP),
      ...Object.values(KETERANGAN_TOOL),
      ...r.kepala.tahap.map((t) => t.nama),
      ...r.kepala.tool.map((t) => t.keterangan ?? ''),
      ...r.kepala.kelompok.map((k) => k.nama),
      r.simulasi.keterangan_penyetuju,
      ...r.langkah.flatMap((l) => [...l.ringkas.map((x) => x.kalimat), ...l.hasil.map((x) => x.kalimat)]),
    ];
    const ucapan = r.langkah.map((l) => l.ucapan ?? '');
    expect(teks.length).toBeGreaterThan(80);
    for (const t of [...teks, ...ucapan]) expect(langgar(t), t).toEqual([]);
    // Teks kami (bukan ucapan agent yang direkam): tanpa pembingkaian kegagalan.
    for (const t of teks) expect(membingkai(t), t).toEqual([]);
    // Nama status yang dikirim juga bukan kata itu.
    expect(JSON.stringify(r.langkah.map((l) => [l.ringkas.map((x) => x.status), l.hasil.map((x) => [x.status, x.jenis])]))).not.toMatch(/(?:to|no)lak/i);
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
