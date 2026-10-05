/**
 * Kalimat tampilan Ringkas dan geometri diagram AI agent (fungsi murni).
 *
 * 1. Tiap jenis penolakan punya kalimatnya SENDIRI, disebut satu per satu;
 *    jenis yang muncul di empat rekaman tidak jatuh ke kalimat netral.
 * 2. Jenis yang tidak dikenal jatuh ke kalimat netral — bukan ke teks rekaman.
 * 3. Kalimat tidak pernah memuat teks rekaman mentah atau kode internalnya.
 * 4. Diagram: AI agent satu lembar di tengah; tool dikelompokkan menurut
 *    gunanya (empat lembar, bukan dua belas kotak seragam); tiap garis berujung
 *    di lembar agent dan di SATU tool, tanpa melewati tool atau lembar lain;
 *    bukan satu kolom atau satu baris (bukan urutan kotak, bukan lajur waktu).
 * 5. Kalimat memakai kata kerja cara kerja ("meminta perbaikan"), tanpa
 *    pecahan hitungan dan tanpa kata "menolak" / "ditolak" (M2d-32 D-7).
 */
import { describe, expect, it } from 'vitest';
import {
  JENIS_DIPERBAIKI,
  KELOMPOK_TOOL,
  KETERANGAN_TOOL,
  PETA_BERHENTI,
  PETA_KODE_ATURAN,
  PETA_KRITIKUS,
  TATA_LEBAR,
  TATA_TEGAK,
  TOOL_ATURAN,
  barisBaca,
  garisTool,
  jangkarTool,
  jenisTolak,
  kalimatTolak,
  kelompokTool,
  persenKotak,
  simpulNyala,
  statusHasil,
  tempatTool,
  tepiKotak,
  type JenisTolak,
  type Kotak,
  type Status,
  type TataDiagram,
} from './baca-agen.ts';
import { NAMA_LAMA, dataJejak, type HasilTool } from './rekaman-agen.ts';

const h = (alat: string, hasil: unknown, ringkas = 'RINGKAS-MENTAH'): HasilTool => ({ alat, ringkas, hasil });

/** Kalimat netral: yang dipakai bila jenis penolakan tidak dikenal. */
const NETRAL = 'Penguji meminta draf ini diperbaiki.';

describe('pemetaan jenis penolakan → kalimat', () => {
  /** Tabel yang juga dilaporkan ke pemilik: jenis → kalimat persisnya. */
  const TABEL: Array<{ jenis: JenisTolak; hasil: HasilTool; kalimat: string }> = [
    {
      jenis: 'tebak-tanpa-kartu',
      hasil: h('ajukan', { lolos: false, berhenti: 'saringan', penolakan: ['saringan tebak: tanpa kartu, diberi kunci dan kembaran selabelnya saja, penebak memilih kunci 12 dari 12 (nilai uji 0,0002; batas 0,02)'] }),
      kalimat: 'Penebak tanpa kartu masih bisa menebak jawabannya: semua tebakannya memilih jawaban benar.',
    },
    { jenis: 'pembaca-kartu', hasil: h('ajukan', { lolos: false, berhenti: 'kartu', penolakan: ['x'] }), kalimat: 'Pembaca kartu menjawab keliru walau sudah membaca kartu: soalnya belum cukup jelas.' },
    { jenis: 'penguji-opus', hasil: h('ajukan', { lolos: false, berhenti: 'penebak-kuat', penolakan: ['x'] }), kalimat: 'Penguji Opus masih bisa menebak jawabannya tanpa kartu.' },
    {
      jenis: 'kritikus',
      hasil: h('tingkatkan', { lolos: false, berhenti: 'kritikus', penolakan: ['[kritikus: makna, kunci] Bagian klaim teman yang tidak bisa dicek dari kartu'] }),
      kalimat: 'Kritikus meminta perbaikan: ada kalimat di pesan yang tidak didukung kartu fakta.',
    },
    {
      jenis: 'tidak-lebih-sulit',
      hasil: h('tingkatkan', { lolos: false, berhenti: 'tidak-naik', penolakan: ['lolos semua gerbang, tetapi tidak lebih sulit dari versi asal'] }),
      kalimat: 'Para penguji menilai versi baru tidak lebih sulit dari versi asal. Versi asal dipertahankan.',
    },
    { jenis: 'tanpa-skor', hasil: h('ajukan', { lolos: false, berhenti: 'tak-terukur', penolakan: [] }), kalimat: 'Penguji belum bisa memberi skor untuk draf ini.' },
    { jenis: 'kritikus-tak-menjawab', hasil: h('ajukan_kasus', { lolos: false, berhenti: 'galat-critic', keberatan: [] }), kalimat: 'Kritikus belum memberi jawaban untuk simulasi ini.' },
    { jenis: 'bukan-yang-kurang', hasil: h('ajukan', { lolos: false, berhenti: 'kebutuhan', penolakan: ['x'] }), kalimat: 'Tool tidak menguji draf ini, tanpa biaya: bukan yang masih kurang untuk simulasi.' },
    { jenis: 'budget', hasil: h('ajukan', { lolos: false, berhenti: 'anggaran', penolakan: [] }), kalimat: 'Budget tidak cukup untuk menguji draf ini.' },
    { jenis: 'sudah-dikirim', hasil: h('ajukan', { lolos: false, berhenti: 'sudah-diajukan', penolakan: [] }), kalimat: 'Tool tidak menguji draf ini, tanpa biaya: sudah pernah dikirim.' },
    { jenis: 'bentuk', hasil: h('ajukan', { lolos: false, berhenti: 'bentuk', penolakan: ['x'] }), kalimat: 'Tool meminta tool call diperbaiki, tanpa biaya: isinya tidak sesuai bentuk yang diminta.' },
    {
      jenis: 'aturan',
      hasil: h('periksa_draft_dengan_aturan', { lolos: false, penolakan: ['pemeriksa: G-angka-cukup: Pilihan kunci b bisa dihitung dari angka'] }),
      kalimat: 'Pemeriksa aturan meminta perbaikan: jawaban benar bisa dihitung dari angka di pesan dan pilihan, tanpa kartu.',
    },
    { jenis: 'tak-dikenal', hasil: h('ajukan', { lolos: false, berhenti: 'JENIS-BARU-TAK-DIKENAL', penolakan: ['TEKS-MENTAH-REKAMAN'] }), kalimat: NETRAL },
  ];

  it.each(TABEL)('$jenis → "$kalimat"', ({ jenis, hasil, kalimat }) => {
    expect(jenisTolak(hasil)).toBe(jenis);
    const b = barisBaca(hasil);
    // Status = kata kerja cara kerjanya: "perbaiki" bila agent bisa menjawabnya dengan menulis ulang.
    const status: Status = JENIS_DIPERBAIKI.includes(jenis) ? 'perbaiki' : 'tidak-dipakai';
    expect(b.status).toBe(status);
    expect(statusHasil(hasil)).toBe(status);
    expect(b.jenis).toBe(jenis);
    expect(b.kalimat).toBe(kalimat);
  });

  it('M2d-32 D-7: tidak ada kalimat yang memuat pecahan hitungan atau kata "menolak" / "ditolak"', () => {
    for (const t of TABEL) {
      for (const obyek of ['draf ini', 'simulasi ini']) {
        const kalimat = kalimatTolak(t.hasil, t.jenis, obyek);
        expect(kalimat, t.jenis).not.toMatch(/\d+ dari \d+/);
        expect(kalimat, t.jenis).not.toMatch(/(?:to|no)lak/i);
      }
    }
    expect(TABEL.map((t) => barisBaca(t.hasil).status).filter((x) => x === 'perbaiki')).toHaveLength(JENIS_DIPERBAIKI.length);
    // Hitungan yang tidak bulat ("9 dari 12") tidak diubah menjadi "semua": kalimat tanpa hitungan.
    const sebagian = h('ajukan', { lolos: false, berhenti: 'saringan', penolakan: ['penebak memilih kunci 9 dari 12'] });
    expect(barisBaca(sebagian).kalimat).toBe('Penebak tanpa kartu masih bisa menebak jawabannya.');
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
    expect(kodeBaru.kalimat).toBe('Pemeriksa aturan meminta draf ini diperbaiki.');
    // Kritikus tanpa jenis yang dikenal: kalimat umum.
    expect(barisBaca(h('ajukan_kasus', { lolos: false, berhenti: 'critic', keberatan: ['[kritikus: entah] TEKS-MENTAH'] })).kalimat).toBe('Kritikus meminta simulasi ini diperbaiki.');
    // Uji tebak tanpa hitungan yang terbaca: tanpa angka, tetap kalimat sendiri.
    expect(kalimatTolak(h('ajukan', { lolos: false, berhenti: 'saringan', penolakan: ['bentuk lain'] }), 'tebak-tanpa-kartu', 'draf ini')).toBe('Penebak tanpa kartu masih bisa menebak jawabannya.');
  });

  it('tiap kode aturan dan tiap jenis keberatan kritikus punya sebabnya sendiri', () => {
    expect(new Set(PETA_KODE_ATURAN.map((x) => x.sebab)).size).toBe(PETA_KODE_ATURAN.length);
    expect(new Set(Object.values(PETA_KRITIKUS)).size).toBe(Object.keys(PETA_KRITIKUS).length);
    const meresmikan = barisBaca(h('periksa_kode', { lolos: false, penolakan: ['gerbang artefak: meresmikan: pilihan kunci mengulang angka 7 dari pesan'] }));
    expect(meresmikan.kalimat).toBe('Pemeriksa aturan meminta perbaikan: pilihan benar bisa dikenali tanpa kartu karena mengulang angka dari pesan.');
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

  it('jenis yang muncul di rekaman: persis empat, masing-masing dengan kalimatnya sendiri', () => {
    const tolak = semua.filter((s) => s.b.status !== null && s.b.status !== 'lolos');
    expect([...new Set(tolak.map((s) => s.b.jenis))].sort()).toEqual(['aturan', 'kritikus', 'tebak-tanpa-kartu', 'tidak-lebih-sulit']);
    expect(tolak.some((s) => s.b.jenis === 'tak-dikenal')).toBe(false);
    for (const s of tolak) expect(s.b.kalimat, `langkah ${String(s.no)}`).not.toBe(NETRAL);
    // Tidak ada penolakan aturan atau kritikus di rekaman yang jatuh ke kalimat umum tanpa sebab.
    for (const s of tolak) expect(s.b.kalimat).not.toMatch(/meminta (draf|simulasi) ini diperbaiki\.$/);
    expect(tolak.find((s) => s.no === 5)?.b.kalimat).toBe('Penebak tanpa kartu masih bisa menebak jawabannya: semua tebakannya memilih jawaban benar.');
    // Rekaman memang mencatat semua tebakan memilih kunci (n dari n): "semua" dibaca dari sana, bukan dikarang.
    const alasan = (tolak.find((s) => s.no === 5)?.x.hasil as { penolakan: string[] }).penolakan[0] ?? '';
    const hitung = /memilih kunci (\d+) dari (\d+)/.exec(alasan);
    expect(hitung?.[1]).toBe(hitung?.[2]);
    expect(hitung?.[1]).toMatch(/^\d+$/);
    expect(tolak.find((s) => s.no === 13)?.b.status).toBe('tidak-dipakai');
    expect(tolak.filter((s) => s.no !== 13).every((s) => s.b.status === 'perbaiki')).toBe(true);
    expect(tolak.find((s) => s.no === 13)?.b.kalimat).toBe('Para penguji menilai versi baru tidak lebih sulit dari versi asal. Versi asal dipertahankan.');
    expect(tolak.find((s) => s.no === 17)?.b.kalimat).toBe('Kritikus meminta perbaikan: ada kalimat di pesan yang tidak didukung kartu fakta.');
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

describe('kelompok tool (M2d-32 D-2)', () => {
  it('empat kelompok menurut guna tool, dengan nama dan isi persis keputusan D-2', () => {
    expect(KELOMPOK_TOOL.map((k) => [k.id, k.nama, [...k.tool]])).toEqual([
      ['bahan', 'Bahan', ['usulkan_hari', 'periksa_saham', 'lihat_fakta']],
      ['catatan', 'Catatan', ['lihat_bank', 'lihat_simulasi', 'lihat_soal_terkunci', 'lihat_sesudahnya']],
      ['periksa', 'Pemeriksaan tanpa biaya', ['periksa_draft_dengan_aturan', 'periksa_kasus_dengan_aturan']],
      ['uji', 'Uji berbayar', ['ajukan', 'tingkatkan', 'ajukan_kasus']],
    ]);
    const semua = KELOMPOK_TOOL.flatMap((k) => k.tool);
    expect(semua).toHaveLength(12);
    expect(new Set(semua).size).toBe(12);
    expect(kelompokTool('tingkatkan')).toBe('uji');
    expect(kelompokTool('tool_entah')).toBeNull();
  });

  it('tiap tool yang dikelompokkan punya keterangan satu baris; "tanpa biaya" hanya di nama kelompoknya', () => {
    for (const nama of KELOMPOK_TOOL.flatMap((k) => k.tool)) {
      const ket = KETERANGAN_TOOL[nama];
      expect(ket, nama).toBeTypeOf('string');
      expect(ket?.length ?? 0, nama).toBeGreaterThan(10);
      expect(ket?.length ?? 99, nama).toBeLessThanOrEqual(48);
      expect(ket, nama).not.toMatch(/gratis|\n/);
    }
  });

  it('pengelompokan itu benar tentang isinya: tool pemeriksa aturan = kelompok tanpa biaya; yang mencatat biaya penguji di rekaman = uji berbayar', () => {
    expect(KELOMPOK_TOOL.find((k) => k.id === 'periksa')?.tool.every((t) => TOOL_ATURAN.includes(t))).toBe(true);
    const data = dataJejak();
    const berbayar = new Set<string>();
    for (const l of data.langkah) if (l.biaya_tester_usd > 0) for (const x of l.hasil) if (typeof (x.hasil as { lolos?: unknown }).lolos === 'boolean' && !TOOL_ATURAN.includes(x.alat)) berbayar.add(x.alat);
    expect(berbayar.size).toBeGreaterThan(0);
    for (const t of berbayar) expect(kelompokTool(t), t).toBe('uji');
    // Langkah yang hanya memanggil tool di luar kelompok uji tidak pernah mencatat biaya penguji.
    for (const l of data.langkah) {
      const kelompok = l.memanggil.map((t) => kelompokTool(NAMA_LAMA[t] ?? t));
      if (!kelompok.includes('uji')) expect(l.biaya_tester_usd, `langkah ${String(l.no)}`).toBe(0);
    }
  });
});

describe('geometri diagram: agent di tengah, tool berkelompok di sekeliling', () => {
  const diDalam = (k: Kotak, x: number, y: number, longgar = 1e-6): boolean =>
    Math.abs(x - k.cx) <= k.lebar / 2 + longgar && Math.abs(y - k.cy) <= k.tinggi / 2 + longgar;
  const diTepi = (k: Kotak, x: number, y: number): boolean =>
    diDalam(k, x, y) && (Math.abs(Math.abs(x - k.cx) - k.lebar / 2) < 1e-6 || Math.abs(Math.abs(y - k.cy) - k.tinggi / 2) < 1e-6);
  const tumpang = (a: Kotak, b: Kotak): boolean => Math.abs(a.cx - b.cx) < (a.lebar + b.lebar) / 2 - 1e-6 && Math.abs(a.cy - b.cy) < (a.tinggi + b.tinggi) / 2 - 1e-6;
  const memuat = (luar: Kotak, dalam: Kotak): boolean =>
    dalam.cx - dalam.lebar / 2 >= luar.cx - luar.lebar / 2 - 1e-6 &&
    dalam.cx + dalam.lebar / 2 <= luar.cx + luar.lebar / 2 + 1e-6 &&
    dalam.cy - dalam.tinggi / 2 >= luar.cy - luar.tinggi / 2 - 1e-6 &&
    dalam.cy + dalam.tinggi / 2 <= luar.cy + luar.tinggi / 2 + 1e-6;

  describe.each<[string, TataDiagram]>([
    ['tegak', TATA_TEGAK],
    ['lebar', TATA_LEBAR],
  ])('tata %s', (nama, tata) => {
    const bidang: Kotak = { cx: tata.bidang.lebar / 2, cy: tata.bidang.tinggi / 2, lebar: tata.bidang.lebar, tinggi: tata.bidang.tinggi };
    const semuaTool = tata.kelompok.flatMap((k) => k.tool.map((kotak, i) => ({ k, kotak, i })));

    it('empat lembar kelompok, isinya 3 + 4 + 2 + 3 tool: BUKAN dua belas kotak seragam', () => {
      expect(tata.kelompok.map((k) => k.id)).toEqual(KELOMPOK_TOOL.map((k) => k.id));
      expect(tata.kelompok.map((k) => k.tool.length)).toEqual([3, 4, 2, 3]);
      expect(semuaTool).toHaveLength(12);
      for (const k of tata.kelompok) {
        // Tiap tool di dalam lembar kelompoknya, di bawah kepala lembar; kepala di dalam lembar.
        expect(memuat(k.lembar, k.kepala), k.id).toBe(true);
        expect(k.kepala.tinggi, k.id).toBeGreaterThanOrEqual(20);
        for (const t of k.tool) {
          expect(memuat(k.lembar, t), k.id).toBe(true);
          expect(tumpang(t, k.kepala), k.id).toBe(false);
        }
        // Tool satu kelompok berimpit (satu lembar), tidak terpencar: luas tool + kepala = luas lembar.
        const luas = k.tool.reduce((j, t) => j + t.lebar * t.tinggi, 0) + k.kepala.lebar * k.kepala.tinggi;
        expect(luas, k.id).toBeCloseTo(k.lembar.lebar * k.lembar.tinggi, 6);
      }
      // Lembar tidak seragam: paling sedikit tiga ukuran lembar yang berbeda.
      expect(new Set(tata.kelompok.map((k) => `${String(k.lembar.lebar)}x${String(k.lembar.tinggi)}`)).size).toBeGreaterThanOrEqual(3);
    });

    it('agent SATU lembar di tengah bidang', () => {
      expect(tata.agen.cx).toBe(tata.bidang.lebar / 2);
      expect(Math.abs(tata.agen.cy - tata.bidang.tinggi / 2)).toBeLessThanOrEqual(tata.bidang.tinggi * 0.05);
      if (nama === 'lebar') expect(tata.agen.cy).toBe(tata.bidang.tinggi / 2);
    });

    it('semua lembar di dalam bidang; tidak ada yang bertumpuk, juga dengan agent', () => {
      for (const k of [...tata.kelompok.map((x) => x.lembar), tata.agen]) expect(memuat(bidang, k)).toBe(true);
      for (const [i, a] of tata.kelompok.entries()) {
        expect(tumpang(a.lembar, tata.agen), `${a.id} vs agent`).toBe(false);
        for (const [j, b] of tata.kelompok.entries()) if (j > i) expect(tumpang(a.lembar, b.lembar), `${a.id} vs ${b.id}`).toBe(false);
      }
      for (const [i, a] of semuaTool.entries()) for (const [j, b] of semuaTool.entries()) if (j > i) expect(tumpang(a.kotak, b.kotak), `tool ${String(i)} vs ${String(j)}`).toBe(false);
    });

    it('tiap garis: satu ujung di tepi lembar agent, ujung lain di tepi tool-nya sendiri; tidak melewati tool lain atau lembar mana pun', () => {
      for (const [i, t] of semuaTool.entries()) {
        const g = garisTool(tata, t.kotak, t.k.hadap);
        expect(diTepi(tata.agen, g.agen.x, g.agen.y), `garis ${String(i)} ujung agent`).toBe(true);
        expect(diTepi(t.kotak, g.tool.x, g.tool.y), `garis ${String(i)} ujung tool`).toBe(true);
        expect(g.tool).toEqual(jangkarTool(t.kotak, t.k.hadap));
        // Empat puluh titik di sepanjang garis (ujung tidak ikut): tidak satu pun di dalam kotak tool mana pun,
        // di dalam lembar kelompok mana pun (termasuk lembarnya sendiri), atau di dalam lembar agent.
        for (let n = 1; n < 40; n++) {
          const x = g.agen.x + ((g.tool.x - g.agen.x) * n) / 40;
          const y = g.agen.y + ((g.tool.y - g.agen.y) * n) / 40;
          for (const [j, lain] of semuaTool.entries()) expect(diDalam(lain.kotak, x, y, -0.01), `garis ${String(i)} melewati tool ${String(j)}`).toBe(false);
          for (const k of tata.kelompok) expect(diDalam(k.lembar, x, y, -0.01), `garis ${String(i)} melewati lembar ${k.id}`).toBe(false);
          expect(diDalam(tata.agen, x, y, -0.01), `garis ${String(i)} melewati agent`).toBe(false);
        }
      }
    });

    it('lembar mengelilingi agent: bukan satu kolom, bukan satu baris, bukan lajur waktu', () => {
      const a = tata.agen;
      const tengah = tata.kelompok.map((k) => k.lembar);
      expect(tengah.some((k) => k.cy < a.cy - a.tinggi / 2)).toBe(true);
      expect(tengah.some((k) => k.cy > a.cy + a.tinggi / 2)).toBe(true);
      expect(tengah.some((k) => k.cx < a.cx - (nama === 'lebar' ? a.lebar / 2 : 0))).toBe(true);
      expect(tengah.some((k) => k.cx > a.cx + (nama === 'lebar' ? a.lebar / 2 : 0))).toBe(true);
      // Ujung garis di sisi tool tersebar di dua sumbu.
      const ujung = semuaTool.map((t) => jangkarTool(t.kotak, t.k.hadap));
      expect(new Set(ujung.map((u) => u.x)).size).toBeGreaterThanOrEqual(2);
      expect(new Set(ujung.map((u) => u.y)).size).toBeGreaterThanOrEqual(4);
      if (nama === 'lebar') {
        // Empat sisi: satu lembar penuh di atas, di bawah, di kiri, dan di kanan lembar agent.
        expect(tengah.filter((k) => k.cy + k.tinggi / 2 <= a.cy - a.tinggi / 2)).toHaveLength(1);
        expect(tengah.filter((k) => k.cy - k.tinggi / 2 >= a.cy + a.tinggi / 2)).toHaveLength(1);
        expect(tengah.filter((k) => k.cx + k.lebar / 2 <= a.cx - a.lebar / 2)).toHaveLength(1);
        expect(tengah.filter((k) => k.cx - k.lebar / 2 >= a.cx + a.lebar / 2)).toHaveLength(1);
        expect(tata.keterangan).toBe(true);
      }
    });

    it('tempatTool menemukan tiap tool di kelompoknya; tool tanpa kelompok tidak punya tempat', () => {
      for (const k of KELOMPOK_TOOL) for (const [i, t] of k.tool.entries()) {
        const tempat = tempatTool(tata, t);
        expect(tempat?.kelompok.id, t).toBe(k.id);
        expect(tempat?.kotak, t).toEqual(tata.kelompok.find((x) => x.id === k.id)?.tool[i]);
      }
      expect(tempatTool(tata, 'tool_entah')).toBeNull();
    });
  });

  it('tepiKotak, jangkarTool, dan persenKotak', () => {
    const k: Kotak = { cx: 50, cy: 50, lebar: 20, tinggi: 10 };
    expect(tepiKotak(k, { x: 100, y: 50 })).toEqual({ x: 60, y: 50 });
    expect(tepiKotak(k, { x: 50, y: 0 })).toEqual({ x: 50, y: 45 });
    expect(tepiKotak(k, { x: 50, y: 50 })).toEqual({ x: 50, y: 50 });
    expect(jangkarTool(k, 'kanan')).toEqual({ x: 60, y: 50 });
    expect(jangkarTool(k, 'kiri')).toEqual({ x: 40, y: 50 });
    expect(jangkarTool(k, 'atas')).toEqual({ x: 50, y: 45 });
    expect(jangkarTool(k, 'bawah')).toEqual({ x: 50, y: 55 });
    expect(persenKotak({ ...TATA_TEGAK, bidang: { lebar: 100, tinggi: 150 } }, { cx: 50, cy: 75, lebar: 20, tinggi: 15 })).toEqual({ left: '40%', top: '45%', width: '20%', height: '10%' });
  });
});
