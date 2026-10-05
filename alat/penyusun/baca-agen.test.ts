/**
 * Kalimat tampilan Ringkas dan geometri diagram AI agent (fungsi murni).
 *
 * 1. Tiap jenis penolakan punya kalimatnya SENDIRI, disebut satu per satu;
 *    jenis yang muncul di empat rekaman tidak jatuh ke kalimat netral.
 * 2. Jenis yang tidak dikenal jatuh ke kalimat netral — bukan ke teks rekaman.
 * 3. Kalimat tidak pernah memuat teks rekaman mentah atau kode internalnya.
 * 4. Diagram: AI agent satu kotak di tengah, tiap garis berujung di kotak
 *    agent dan di SATU tool; tidak ada garis tool ke tool; tempat tool bukan
 *    satu kolom atau satu baris (bukan urutan kotak, bukan lajur waktu).
 */
import { describe, expect, it } from 'vitest';
import {
  JENIS_DIPERBAIKI,
  PETA_BERHENTI,
  PETA_KODE_ATURAN,
  PETA_KRITIKUS,
  TATA_LEBAR,
  TATA_TEGAK,
  barisBaca,
  garisTool,
  jenisTolak,
  kalimatTolak,
  kotakTool,
  persenKotak,
  simpulNyala,
  tepiKotak,
  type JenisTolak,
  type Kotak,
  type TataDiagram,
} from './baca-agen.ts';
import { dataJejak, type HasilTool } from './rekaman-agen.ts';

const h = (alat: string, hasil: unknown, ringkas = 'RINGKAS-MENTAH'): HasilTool => ({ alat, ringkas, hasil });

/** Kalimat netral: yang dipakai bila jenis penolakan tidak dikenal. */
const NETRAL = 'Penguji menolak draf ini.';

describe('pemetaan jenis penolakan → kalimat', () => {
  /** Tabel yang juga dilaporkan ke pemilik: jenis → kalimat persisnya. */
  const TABEL: Array<{ jenis: JenisTolak; hasil: HasilTool; kalimat: string }> = [
    {
      jenis: 'tebak-tanpa-kartu',
      hasil: h('ajukan', { lolos: false, berhenti: 'saringan', penolakan: ['saringan tebak: tanpa kartu, diberi kunci dan kembaran selabelnya saja, penebak memilih kunci 12 dari 12 (nilai uji 0,0002; batas 0,02)'] }),
      kalimat: 'Penebak tanpa kartu masih bisa menebak jawabannya: 12 dari 12 tebakan memilih jawaban benar.',
    },
    { jenis: 'pembaca-kartu', hasil: h('ajukan', { lolos: false, berhenti: 'kartu', penolakan: ['x'] }), kalimat: 'Pembaca kartu menjawab keliru walau sudah membaca kartu: soalnya belum cukup jelas.' },
    { jenis: 'penguji-opus', hasil: h('ajukan', { lolos: false, berhenti: 'penebak-kuat', penolakan: ['x'] }), kalimat: 'Penguji Opus masih bisa menebak jawabannya tanpa kartu.' },
    {
      jenis: 'kritikus',
      hasil: h('tingkatkan', { lolos: false, berhenti: 'kritikus', penolakan: ['[kritikus: makna, kunci] Bagian klaim teman yang tidak bisa dicek dari kartu'] }),
      kalimat: 'Kritikus menolak: ada kalimat di pesan yang tidak didukung kartu fakta.',
    },
    {
      jenis: 'tidak-lebih-sulit',
      hasil: h('tingkatkan', { lolos: false, berhenti: 'tidak-naik', penolakan: ['lolos semua gerbang, tetapi tidak lebih sulit dari versi asal'] }),
      kalimat: 'Para penguji menilai versi baru tidak lebih sulit dari versi asal. Versi asal dipertahankan.',
    },
    { jenis: 'tanpa-skor', hasil: h('ajukan', { lolos: false, berhenti: 'tak-terukur', penolakan: [] }), kalimat: 'Penguji belum bisa memberi skor untuk draf ini.' },
    { jenis: 'kritikus-tak-menjawab', hasil: h('ajukan_kasus', { lolos: false, berhenti: 'galat-critic', keberatan: [] }), kalimat: 'Kritikus belum memberi jawaban untuk simulasi ini.' },
    { jenis: 'bukan-yang-kurang', hasil: h('ajukan', { lolos: false, berhenti: 'kebutuhan', penolakan: ['x'] }), kalimat: 'Tool menolak tanpa biaya: draf ini bukan yang masih kurang untuk simulasi.' },
    { jenis: 'budget', hasil: h('ajukan', { lolos: false, berhenti: 'anggaran', penolakan: [] }), kalimat: 'Budget tidak cukup untuk menguji draf ini.' },
    { jenis: 'sudah-dikirim', hasil: h('ajukan', { lolos: false, berhenti: 'sudah-diajukan', penolakan: [] }), kalimat: 'Tool menolak tanpa biaya: draf ini sudah pernah dikirim.' },
    { jenis: 'bentuk', hasil: h('ajukan', { lolos: false, berhenti: 'bentuk', penolakan: ['x'] }), kalimat: 'Tool menolak tanpa biaya: isi tool call tidak sesuai bentuk yang diminta.' },
    {
      jenis: 'aturan',
      hasil: h('periksa_draft_dengan_aturan', { lolos: false, penolakan: ['pemeriksa: G-angka-cukup: Pilihan kunci b bisa dihitung dari angka'] }),
      kalimat: 'Pemeriksa aturan menolak: jawaban benar bisa dihitung dari angka di pesan dan pilihan, tanpa kartu.',
    },
    { jenis: 'tak-dikenal', hasil: h('ajukan', { lolos: false, berhenti: 'JENIS-BARU-TAK-DIKENAL', penolakan: ['TEKS-MENTAH-REKAMAN'] }), kalimat: NETRAL },
  ];

  it.each(TABEL)('$jenis → "$kalimat"', ({ jenis, hasil, kalimat }) => {
    expect(jenisTolak(hasil)).toBe(jenis);
    const b = barisBaca(hasil);
    expect(b.status).toBe('ditolak');
    expect(b.jenis).toBe(jenis);
    expect(b.kalimat).toBe(kalimat);
  });

  it('tiap jenis punya kalimat yang berbeda; hanya "tak-dikenal" yang netral', () => {
    const kalimat = TABEL.map((t) => barisBaca(t.hasil).kalimat);
    expect(new Set(kalimat).size).toBe(TABEL.length);
    expect(TABEL.filter((t) => barisBaca(t.hasil).kalimat === NETRAL).map((t) => t.jenis)).toEqual(['tak-dikenal']);
    // Semua nilai `berhenti` yang dipetakan menuju jenis yang ada di tabel.
    const jenisTabel = new Set(TABEL.map((t) => t.jenis));
    for (const j of Object.values(PETA_BERHENTI)) expect(jenisTabel.has(j), j).toBe(true);
  });

  it('jenis yang tidak dikenal jatuh ke kalimat netral, bukan ke teks rekaman', () => {
    const aneh = h('tool_baru', { lolos: false, berhenti: 'apa-ini', penolakan: ['TEKS-MENTAH gerbang artefak saringan'] }, 'berhenti di saringan');
    const b = barisBaca(aneh);
    expect(b.jenis).toBe('tak-dikenal');
    expect(b.kalimat).toBe(NETRAL);
    // Pemeriksa aturan dengan kode yang belum dipetakan: kalimat umum, tanpa kodenya.
    const kodeBaru = barisBaca(h('periksa_draft_dengan_aturan', { lolos: false, penolakan: ['pemeriksa: G-kode-baru: TEKS-MENTAH'] }));
    expect(kodeBaru.kalimat).toBe('Pemeriksa aturan menolak draf ini.');
    // Kritikus tanpa jenis yang dikenal: kalimat umum.
    expect(barisBaca(h('ajukan_kasus', { lolos: false, berhenti: 'critic', keberatan: ['[kritikus: entah] TEKS-MENTAH'] })).kalimat).toBe('Kritikus menolak simulasi ini.');
    // Uji tebak tanpa hitungan yang terbaca: tanpa angka, tetap kalimat sendiri.
    expect(kalimatTolak(h('ajukan', { lolos: false, berhenti: 'saringan', penolakan: ['bentuk lain'] }), 'tebak-tanpa-kartu', 'draf ini')).toBe('Penebak tanpa kartu masih bisa menebak jawabannya.');
  });

  it('tiap kode aturan dan tiap jenis keberatan kritikus punya sebabnya sendiri', () => {
    expect(new Set(PETA_KODE_ATURAN.map((x) => x.sebab)).size).toBe(PETA_KODE_ATURAN.length);
    expect(new Set(Object.values(PETA_KRITIKUS)).size).toBe(Object.keys(PETA_KRITIKUS).length);
    const meresmikan = barisBaca(h('periksa_kode', { lolos: false, penolakan: ['gerbang artefak: meresmikan: pilihan kunci mengulang angka 7 dari pesan'] }));
    expect(meresmikan.kalimat).toBe('Pemeriksa aturan menolak: pilihan benar bisa dikenali tanpa kartu karena mengulang angka dari pesan.');
  });

  it('yang lolos dan yang hanya membaca bahan juga berkalimat; tidak berjenis penolakan', () => {
    expect(barisBaca(h('ajukan', { lolos: true, berhenti: 'lolos' }))).toEqual({ status: 'lolos', jenis: null, kalimat: 'Semua penguji meloloskan draf ini. Soalnya masuk kumpulan soal yang lolos.' });
    expect(barisBaca(h('ajukan_kasus', { lolos: true, berhenti: 'lolos' })).kalimat).toBe('Kritikus meloloskan simulasi ini. Simulasinya jadi.');
    expect(barisBaca(h('periksa_kasus_dengan_aturan', { lolos: true })).kalimat).toBe('Pemeriksa aturan meloloskan simulasi ini.');
    expect(barisBaca(h('usulkan_hari', { hari: [1, 2, 3] }))).toEqual({ status: null, jenis: null, kalimat: 'Tool mengusulkan 3 hari untuk dipilih agent.' });
    expect(barisBaca(h('lihat_bank', { omongan: [] })).kalimat).toBe('Kumpulan soal yang lolos masih kosong.');
    expect(barisBaca(h('tool_entah', { apa: 1 })).kalimat).toBe('Agent menerima tool result.');
  });
});

describe('kalimat atas empat rekaman nyata', () => {
  const data = dataJejak();
  const semua = data.langkah.flatMap((l) => l.hasil.map((x) => ({ no: l.no, x, b: barisBaca(x) })));

  it('jenis penolakan yang muncul di rekaman: persis empat, masing-masing dengan kalimatnya sendiri', () => {
    const tolak = semua.filter((s) => s.b.status === 'ditolak');
    expect([...new Set(tolak.map((s) => s.b.jenis))].sort()).toEqual(['aturan', 'kritikus', 'tebak-tanpa-kartu', 'tidak-lebih-sulit']);
    expect(tolak.some((s) => s.b.jenis === 'tak-dikenal')).toBe(false);
    for (const s of tolak) expect(s.b.kalimat, `langkah ${String(s.no)}`).not.toBe(NETRAL);
    // Tidak ada penolakan aturan atau kritikus di rekaman yang jatuh ke kalimat umum tanpa sebab.
    for (const s of tolak) expect(s.b.kalimat).not.toMatch(/menolak (draf|simulasi) ini\.$/);
    expect(tolak.find((s) => s.no === 5)?.b.kalimat).toBe('Penebak tanpa kartu masih bisa menebak jawabannya: 12 dari 12 tebakan memilih jawaban benar.');
    expect(tolak.find((s) => s.no === 13)?.b.kalimat).toBe('Para penguji menilai versi baru tidak lebih sulit dari versi asal. Versi asal dipertahankan.');
    expect(tolak.find((s) => s.no === 17)?.b.kalimat).toBe('Kritikus menolak: ada kalimat di pesan yang tidak didukung kartu fakta.');
  });

  it('tool yang hanya membaca bahan di rekaman tidak jatuh ke kalimat "menerima tool result"', () => {
    for (const s of semua) expect(s.b.kalimat, `${s.x.alat} langkah ${String(s.no)}`).not.toBe('Agent menerima tool result.');
  });

  it('kalimat tidak memuat teks rekaman: bukan ringkasan mentah, bukan alasan mentah', () => {
    for (const s of semua) {
      expect(s.b.kalimat).not.toBe(s.x.ringkas);
      const alasan = (s.x.hasil as { penolakan?: unknown }).penolakan;
      if (Array.isArray(alasan)) for (const a of alasan) if (typeof a === 'string' && a.length > 12) expect(s.b.kalimat.includes(a)).toBe(false);
    }
  });

  it('jenis yang dijawab agent dengan menulis ulang tidak memuat budget atau salah kirim', () => {
    expect(JENIS_DIPERBAIKI).not.toContain('budget');
    expect(JENIS_DIPERBAIKI).not.toContain('sudah-dikirim');
    expect(JENIS_DIPERBAIKI).not.toContain('tidak-lebih-sulit');
  });

  it('simpul yang menyala = tool yang dipilih agent; nama lama ikut simpul nama sekarang', () => {
    const l = data.langkah.find((x) => x.memanggil.includes('periksa_kode'));
    if (l === undefined) throw new Error('langkah periksa_kode hilang');
    const nyala = simpulNyala(data.tool, l);
    expect(nyala.map((i) => data.tool[i]?.nama)).toEqual(['periksa_draft_dengan_aturan']);
  });
});

describe('geometri diagram: agent di tengah, tool di sekeliling', () => {
  const diDalam = (k: Kotak, x: number, y: number, longgar = 1e-6): boolean =>
    Math.abs(x - k.cx) <= k.lebar / 2 + longgar && Math.abs(y - k.cy) <= k.tinggi / 2 + longgar;
  const diTepi = (k: Kotak, x: number, y: number): boolean =>
    diDalam(k, x, y) && (Math.abs(Math.abs(x - k.cx) - k.lebar / 2) < 1e-6 || Math.abs(Math.abs(y - k.cy) - k.tinggi / 2) < 1e-6);
  const tumpang = (a: Kotak, b: Kotak): boolean => Math.abs(a.cx - b.cx) < (a.lebar + b.lebar) / 2 && Math.abs(a.cy - b.cy) < (a.tinggi + b.tinggi) / 2;

  describe.each<[string, TataDiagram]>([
    ['tegak', TATA_TEGAK],
    ['lebar', TATA_LEBAR],
  ])('tata %s', (_nama, tata) => {
    const kotak = tata.tempat.map((t) => kotakTool(tata, t));

    it('dua belas tempat; kotak agent tepat di tengah bidang', () => {
      expect(tata.tempat).toHaveLength(12);
      expect(tata.agen.cx).toBe(tata.bidang.lebar / 2);
      expect(tata.agen.cy).toBe(tata.bidang.tinggi / 2);
    });

    it('semua kotak di dalam bidang; tidak ada yang bertumpuk, juga dengan agent', () => {
      for (const k of [...kotak, tata.agen]) {
        expect(k.cx - k.lebar / 2).toBeGreaterThanOrEqual(0);
        expect(k.cy - k.tinggi / 2).toBeGreaterThanOrEqual(0);
        expect(k.cx + k.lebar / 2).toBeLessThanOrEqual(tata.bidang.lebar);
        expect(k.cy + k.tinggi / 2).toBeLessThanOrEqual(tata.bidang.tinggi);
      }
      for (const [i, a] of kotak.entries()) {
        expect(tumpang(a, tata.agen), `tool ${String(i)} vs agent`).toBe(false);
        for (const [j, b] of kotak.entries()) if (j > i) expect(tumpang(a, b), `tool ${String(i)} vs ${String(j)}`).toBe(false);
      }
    });

    it('tiap garis: satu ujung di tepi kotak agent, ujung lain di tepi tool-nya sendiri; tidak menyentuh tool lain', () => {
      for (const [i, t] of tata.tempat.entries()) {
        const g = garisTool(tata, t);
        expect(diTepi(tata.agen, g.agen.x, g.agen.y), `garis ${String(i)} ujung agent`).toBe(true);
        expect(diTepi(kotak[i] as Kotak, g.tool.x, g.tool.y), `garis ${String(i)} ujung tool`).toBe(true);
        // Dua puluh titik di sepanjang garis: tidak satu pun di dalam kotak tool LAIN.
        for (let n = 1; n < 20; n++) {
          const x = g.agen.x + ((g.tool.x - g.agen.x) * n) / 20;
          const y = g.agen.y + ((g.tool.y - g.agen.y) * n) / 20;
          for (const [j, k] of kotak.entries()) if (j !== i) expect(diDalam(k, x, y, -0.01), `garis ${String(i)} melewati tool ${String(j)}`).toBe(false);
        }
      }
    });

    it('tool mengelilingi agent di empat sisi: bukan satu kolom, bukan satu baris', () => {
      const a = tata.agen;
      expect(tata.tempat.some((t) => t.y < a.cy - a.tinggi / 2)).toBe(true);
      expect(tata.tempat.some((t) => t.y > a.cy + a.tinggi / 2)).toBe(true);
      expect(tata.tempat.some((t) => t.x < a.cx - a.lebar / 2)).toBe(true);
      expect(tata.tempat.some((t) => t.x > a.cx + a.lebar / 2)).toBe(true);
      expect(new Set(tata.tempat.map((t) => t.x)).size).toBeGreaterThanOrEqual(3);
      expect(new Set(tata.tempat.map((t) => t.y)).size).toBeGreaterThanOrEqual(4);
    });
  });

  it('tepiKotak dan persenKotak', () => {
    const k: Kotak = { cx: 50, cy: 50, lebar: 20, tinggi: 10 };
    expect(tepiKotak(k, { x: 100, y: 50 })).toEqual({ x: 60, y: 50 });
    expect(tepiKotak(k, { x: 50, y: 0 })).toEqual({ x: 50, y: 45 });
    expect(tepiKotak(k, { x: 50, y: 50 })).toEqual({ x: 50, y: 50 });
    expect(persenKotak(TATA_TEGAK, { cx: 50, cy: 75, lebar: 20, tinggi: 15 })).toEqual({ left: '40%', top: '45%', width: '20%', height: '10%' });
  });
});
