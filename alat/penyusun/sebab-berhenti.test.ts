/**
 * Sebab agent berhenti → kalimat biasa (M-PN1 A-1, T-A3): tes TABEL atas fungsi murni.
 *
 * Tiap baris `TABEL_SEBAB` punya paling sedikit satu pesan contoh di sini
 * (bentuk pesan `alat/agen/jalan-agen.ts` dan penyedia model). Membuang satu
 * baris pemetaan — atau seluruh tabel — memerahkan berkas ini.
 */
import { describe, expect, it } from 'vitest';
import { KUNCI_LLM_PALSU, KUNCI_SECTORS_PALSU } from './bantu-uji.ts';
import { MAKS_KUTIPAN, SEBAB_TAK_DIKENAL, SEBAB_TAK_DIKENAL_TANPA_HASIL, TABEL_SEBAB, barisGalatTerakhir, berhentiKarenaGalat, samarkanKeluaran, sebabBerhenti } from './sebab-berhenti.ts';

const PENYEDIA = 'Error: Penyedia terkunci bermasalah; TIDAK ada panggilan berbayar yang dikirim:\n- ';

/** Pesan program → id sebab yang diharapkan (`null` = belum dikenal). */
const TABEL_UJI: ReadonlyArray<[pesan: string, id: string | null]> = [
  // Pemeriksaan penyedia yang gratis, sebelum panggilan berbayar apa pun.
  [`${PENYEDIA}penulis: harga "anthropic" untuk anthropic/claude-opus-5.5 (US$6/30 per juta) di atas batas US$5/25`, 'harga-penyedia'],
  [`${PENYEDIA}kritikus: penyedia "deepinfra" tidak lagi melayani z-ai/glm-5.3`, 'penyedia-tidak-melayani'],
  [`${PENYEDIA}penulis: daftar titik akhir anthropic/claude-opus-5.5 tidak terbaca (HTTP 503)`, 'daftar-penyedia'],
  ['Error: LLM_BASE_URL bukan OpenRouter (nilainya tidak dicetak).', 'alamat-bukan-openrouter'],
  // Kunci.
  ['galat: AI_APICallError: API key expired', 'kunci-kedaluwarsa'],
  ['galat: AI_APICallError: Your api_key has expired. Please renew.', 'kunci-kedaluwarsa'],
  ['galat: Error: kunci OpenRouter kedaluwarsa', 'kunci-kedaluwarsa'],
  ['galat: AI_APICallError: User not found.', 'kunci-tidak-diterima'],
  ['galat: AI_APICallError: No auth credentials found', 'kunci-tidak-diterima'],
  ['galat: AI_APICallError: HTTP 401 Unauthorized', 'kunci-tidak-diterima'],
  ['galat: AI_APICallError: Invalid API key provided', 'kunci-tidak-diterima'],
  // Saldo, batas permintaan, batas biaya kumulatif, jaringan.
  ['galat: AI_APICallError: This request requires more credits, or fewer max_tokens.', 'saldo'],
  ['galat: AI_APICallError: 402 Payment Required', 'saldo'],
  ['galat: AI_APICallError: Insufficient credits', 'saldo'],
  ['galat: AI_RetryError: Failed after 3 attempts. Last error: Rate limit exceeded', 'batas-permintaan'],
  ['galat: AI_APICallError: HTTP 429', 'batas-permintaan'],
  ['galat: Error: penjaga: pagu kumulatif akan terlampaui; panggilan tidak dikirim', 'batas-biaya-kumulatif'],
  ['galat: TypeError: fetch failed', 'jaringan'],
  ['Error: getaddrinfo ENOTFOUND openrouter.ai', 'jaringan'],
  // Belum dikenal: pemanggil memakai kalimat umum + "lihat terminal".
  ['galat: Error: sesuatu yang lain sama sekali', null],
  ['TypeError: Cannot read properties of undefined', null],
  ['', null],
];

describe('sebabBerhenti: tabel pesan program → sebab', () => {
  it.each(TABEL_UJI)('%s → %s', (pesan, id) => {
    expect(sebabBerhenti(pesan)?.id ?? null).toBe(id);
  });

  it('tiap baris tabel pemetaan punya contoh di tabel uji; id unik; kalimat = keadaan + langkah berikutnya', () => {
    const ids = TABEL_SEBAB.map((b) => b.id);
    expect(new Set(ids).size).toBe(ids.length);
    expect(ids.length).toBeGreaterThanOrEqual(10);
    const teruji = new Set(TABEL_UJI.map(([, id]) => id));
    for (const id of ids) expect(teruji.has(id), id).toBe(true);
    for (const b of [...TABEL_SEBAB, SEBAB_TAK_DIKENAL, SEBAB_TAK_DIKENAL_TANPA_HASIL]) {
      expect(b.kalimat, b.id).toMatch(/^Agent (?:berhenti|tidak dijalankan)/);
      // Langkah berikutnya: apa yang dilakukan, atau di mana rinciannya.
      expect(b.kalimat, b.id).toMatch(/jalankan lagi|terminal/);
      expect(b.kalimat.endsWith('.') || b.kalimat.endsWith(')'), b.id).toBe(true);
    }
    // Yang tidak memanggil model berkata jelas bahwa tidak ada biaya.
    for (const id of ['harga-penyedia', 'penyedia-tidak-melayani', 'daftar-penyedia', 'alamat-bukan-openrouter']) expect(TABEL_SEBAB.find((b) => b.id === id)?.kalimat, id).toMatch(/Tidak ada biaya\./);
  });

  it('dua kalimat yang diminta kontrak A-1', () => {
    expect(sebabBerhenti('galat: AI_APICallError: API key expired')?.kalimat).toBe('Agent berhenti: kunci API tidak diterima penyedia model (kedaluwarsa). Perbarui LLM_API_KEY di .env, lalu jalankan lagi.');
    expect(sebabBerhenti(`${PENYEDIA}penulis: harga "x" untuk y (US$9/9 per juta) di atas batas US$5/25`)?.kalimat).toBe('Agent tidak dijalankan: harga penyedia model berubah melewati batas yang ditetapkan di kode. Tidak ada biaya. (rincian di terminal)');
  });

  it('urutan tabel: sebab yang lebih khusus menang', () => {
    // Pesan penyedia yang juga memuat "HTTP 401" tetap dibaca sebagai masalah daftar penyedia.
    expect(sebabBerhenti(`${PENYEDIA}penulis: daftar titik akhir x tidak terbaca (HTTP 401)`)?.id).toBe('daftar-penyedia');
    expect(sebabBerhenti('galat: AI_APICallError: 401 API key expired')?.id).toBe('kunci-kedaluwarsa');
  });

  it('berhentiKarenaGalat: hanya `galat:` dan `gerbang rusak:`; keadaan biasa bukan kesalahan', () => {
    expect(berhentiKarenaGalat('galat: Error: x')).toBe(true);
    expect(berhentiKarenaGalat('gerbang rusak: penguji tidak menjawab')).toBe(true);
    for (const b of ['anggaran tidak cukup untuk satu langkah lagi', 'batas percakapan', 'agen berhenti sendiri', 'bank bisa dirakit menjadi simulasi', '', null, undefined, 3]) expect(berhentiKarenaGalat(b), String(b)).toBe(false);
  });
});

describe('barisGalatTerakhir: pesan kesalahan terakhir di keluaran proses', () => {
  it('galat Node yang tidak tertangkap: baris "Error: …" + rincian "- …", bukan baris tumpukan', () => {
    const keluaran = [
      'agent | Penyedia terkunci: diperiksa',
      'agent | file:///D:/repo/alat/agen/jalan-agen.ts:177',
      'agent | if (masalahPenyedia.length > 0) throw new Error(`Penyedia terkunci bermasalah`);',
      'agent |                                     ^',
      'agent | Error: Penyedia terkunci bermasalah; TIDAK ada panggilan berbayar yang dikirim:',
      'agent | - penulis: harga "anthropic" di atas batas',
      'agent | - kritikus: penyedia "x" tidak lagi melayani y',
      'agent |     at file:///D:/repo/alat/agen/jalan-agen.ts:177:42',
      'agent |     at ModuleJob.run (node:internal/modules/esm/module_job:377:25)',
      'agent | Node.js v24.11.0',
    ];
    expect(barisGalatTerakhir(keluaran)).toBe('Error: Penyedia terkunci bermasalah; TIDAK ada panggilan berbayar yang dikirim: - penulis: harga "anthropic" di atas batas - kritikus: penyedia "x" tidak lagi melayani y');
  });

  it('beberapa pesan: yang terakhir; tanpa pesan kesalahan: null', () => {
    expect(barisGalatTerakhir(['agent | Error: pertama', 'agent | baris biasa', 'agent | TypeError: kedua', 'agent |     at x (y:1:1)'])).toBe('TypeError: kedua');
    expect(barisGalatTerakhir(['agent | proses agent tidak bisa dinyalakan: Error'])).toBeNull();
    expect(barisGalatTerakhir(['agent | model l1: HTTP 200', 'agent | selesai'])).toBeNull();
    expect(barisGalatTerakhir([])).toBeNull();
  });
});

describe('samarkanKeluaran: kutipan pesan program yang aman ditampilkan', () => {
  it('kunci, token, alamat berkas mesin, dan kode saham diganti; isi lain tetap', () => {
    const mentah = `Error: gagal di D:\\Projects\\repo\\alat\\x.ts dan file:///C:/Users/orang/repo/y.ts untuk TIRT: Authorization: Bearer ${KUNCI_LLM_PALSU}; kunci ${KUNCI_LLM_PALSU}; sectors ${KUNCI_SECTORS_PALSU}; model anthropic/claude-opus-5.5 HTTP 401`;
    const aman = samarkanKeluaran(mentah, ['TIRT']);
    expect(aman).toBe('Error: gagal di [berkas] dan [berkas] untuk [kode]: Authorization: Bearer [disamarkan]; kunci [disamarkan]; sectors [disamarkan]; model anthropic/claude-opus-5.5 HTTP 401');
    expect(aman).not.toContain(KUNCI_LLM_PALSU);
    expect(aman).not.toContain(KUNCI_SECTORS_PALSU);
    expect(aman).not.toMatch(/[A-Za-z]:[\\/]/);
  });

  it('spasi dirapikan; kutipan dipotong', () => {
    expect(samarkanKeluaran('  Error:   a\n\n  b  ', [])).toBe('Error: a b');
    const panjang = samarkanKeluaran(`Error: ${'kata '.repeat(300)}`, []);
    expect(panjang.length).toBeLessThanOrEqual(MAKS_KUTIPAN + 2);
    expect(panjang.endsWith('…')).toBe(true);
  });
});
