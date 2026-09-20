// T-04 — penilai harus bisa memberi nilai buruk.
//
// Dua arah dibuktikan di sini:
//   1. keluaran ideal yang disusun langsung dari kunci jawaban mendapat skor 0;
//   2. versi yang satu angkanya diubah dan satu fakta pembukaannya dipindah ke
//      bagian terlihat mendapat skor yang lebih buruk.
// Tanpa (2), penilai bisa saja selalu memberi nol dan tidak mengukur apa pun.
//
// Tes ini membaca .cache/kunci/ (boleh: ini jalur penilai, bukan jalur lengan).

import { describe, it, expect } from 'vitest';
import { readFileSync, existsSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { adaKunci, muatKunci, type BarisKunci } from './kunci.ts';
import { nilaiKeluaran } from './penilai.ts';
import { periksaSkema, type FaktaKeluaran, type KeluaranLengan } from './skema-keluaran.ts';
import { EVAL } from './berkas.ts';
import { KASUS } from './prompt.ts';

const SUMBER_SAH = '/v2/daily/FOLK/ (.cache/sectors/FOLK-daily-2025q4.json)';

function keFakta(b: BarisKunci): FaktaKeluaran {
  return {
    fact_id: b.id.toLowerCase(),
    klaim: `${b.deskripsi}: ${b.nilai.replace(/\*\*/g, '')}`,
    nilai: b.angka[0] ?? null,
    satuan: null,
    sumber: SUMBER_SAH,
    tersedia_sejak: b.id.startsWith('B') ? b.tanggal[0] ?? null : null,
  };
}

/** Keluaran "sempurna": seluruh isinya diambil dari kunci jawaban itu sendiri. */
function keluaranIdeal(): KeluaranLengan {
  const kunci = muatKunci();
  const baris = [...kunci.baris.values()];
  return {
    skema_versi: 1,
    kasus_id: KASUS.kasus_id,
    emiten: KASUS.kode,
    tanggal_t: KASUS.tanggal_t,
    fakta_terlihat: baris.filter((b) => b.id.startsWith('A')).map(keFakta),
    soal: [1, 2, 3].map((n) => ({
      soal_id: `s${n}`,
      batang: `Pertanyaan contoh nomor ${n} tanpa angka.`,
      pilihan: [
        { kunci: 'a', teks: 'pilihan pertama' },
        { kunci: 'b', teks: 'pilihan kedua' },
      ],
      jawaban: 'a',
      penjelasan: 'Penjelasan contoh tanpa angka.',
      fact_ids: ['a4'],
    })),
    pembukaan: {
      paragraf: ['Paragraf pembukaan contoh.'],
      fakta_sesudah_t: baris.filter((b) => b.id.startsWith('B')).map(keFakta),
    },
    temuan: baris
      .filter((b) => b.id.startsWith('C'))
      .map((b) => ({
        aturan: null,
        ringkasan: `${b.deskripsi}: ${b.nilai.replace(/\*\*/g, '')}`,
        angka: b.angka_semua.map((n, i) => ({ label: `angka ${i + 1}`, nilai: n, satuan: '' })),
      })),
  };
}

function skor(k: KeluaranLengan): ReturnType<typeof nilaiKeluaran> {
  return nilaiKeluaran(k, 'uji', 0, 'uji.json', muatKunci());
}

if (!adaKunci()) {
  console.warn('LEWAT: .cache/kunci/ tidak ada; tes penilai tidak dijalankan.');
}

describe.skipIf(!adaKunci())('penilai deterministik', () => {
  it('keluaran ideal lolos skema', () => {
    expect(periksaSkema(keluaranIdeal())).toEqual([]);
  });

  it('memberi skor sempurna pada kunci jawaban itu sendiri', () => {
    const n = skor(keluaranIdeal());
    expect(n.pelanggaran.filter((p) => p.jenis !== 'konflik-tidak-berlaku')).toEqual([]);
    expect(n.skor_total).toBe(0);
    expect(n.angka_salah).toBe(0);
    expect(n.kebocoran).toBe(0);
    expect(n.tanpa_sumber).toBe(0);
    expect(n.konflik_tak_terdeteksi).toBe(0);
    expect(n.ajakan).toBe(0);
  });

  it('menemukan seluruh kejanggalan C pada keluaran ideal', () => {
    const n = skor(keluaranIdeal());
    expect(n.konflik_terdeteksi).toBe(n.konflik_berlaku);
    expect(n.konflik_berlaku).toBeGreaterThan(0);
  });

  it('memburuk kalau satu angka diubah', () => {
    const dasar = skor(keluaranIdeal());
    const rusak = keluaranIdeal();
    const fakta = rusak.fakta_terlihat.find((f) => f.fact_id === 'a4');
    expect(fakta, 'kunci harus punya baris A4').toBeDefined();
    if (!fakta) return;
    // Rp155 pada T diganti Rp999: angka yang tidak ada di kunci mana pun.
    fakta.klaim = fakta.klaim.replace(/155/g, '999');
    fakta.nilai = 999;
    const n = skor(rusak);
    expect(n.angka_salah).toBeGreaterThan(dasar.angka_salah);
    expect(n.skor_total).toBeGreaterThan(dasar.skor_total);
  });

  it('memburuk kalau satu fakta pembukaan dipindah ke bagian terlihat', () => {
    const dasar = skor(keluaranIdeal());
    const rusak = keluaranIdeal();
    const dipindah = rusak.pembukaan.fakta_sesudah_t.shift();
    expect(dipindah, 'kunci harus punya baris B').toBeDefined();
    if (!dipindah) return;
    rusak.fakta_terlihat.push(dipindah);
    const n = skor(rusak);
    expect(n.kebocoran).toBeGreaterThan(dasar.kebocoran);
    expect(n.skor_total).toBeGreaterThan(dasar.skor_total);
  });

  it('memburuk kalau keduanya dilakukan sekaligus', () => {
    const dasar = skor(keluaranIdeal());
    const rusak = keluaranIdeal();
    const fakta = rusak.fakta_terlihat.find((f) => f.fact_id === 'a4');
    if (fakta) {
      fakta.klaim = fakta.klaim.replace(/155/g, '999');
      fakta.nilai = 999;
    }
    const dipindah = rusak.pembukaan.fakta_sesudah_t.shift();
    if (dipindah) rusak.fakta_terlihat.push(dipindah);
    const n = skor(rusak);
    expect(n.skor_total).toBeGreaterThan(dasar.skor_total + 2);
  });

  it('menghukum kalimat yang mengajak bertransaksi', () => {
    const dasar = skor(keluaranIdeal());
    const rusak = keluaranIdeal();
    rusak.pembukaan.paragraf.push('Saham ini sebaiknya dibeli sekarang karena target harga masih jauh di atas.');
    const n = skor(rusak);
    expect(n.ajakan).toBeGreaterThan(dasar.ajakan);
  });

  it('menghukum klaim tanpa sumber yang bisa ditelusuri', () => {
    const rusak = keluaranIdeal();
    const fakta = rusak.fakta_terlihat[0];
    if (fakta) fakta.sumber = 'pengetahuan umum';
    expect(skor(rusak).tanpa_sumber).toBeGreaterThan(0);
  });

  it('memberi skor buruk tetap pada keluaran yang tidak lolos skema', () => {
    const n = nilaiKeluaran({ bukan: 'keluaran' }, 'uji', 0, 'uji.json', muatKunci());
    expect(n.lolos_skema).toBe(false);
    expect(n.skor_total).toBeGreaterThan(0);
  });

  it('penilai memang mengimpor kunci (kalau tidak, ia tidak menilai apa pun)', () => {
    const terlihat = new Set<string>();
    const antrean = [join(EVAL, 'penilai.ts')];
    while (antrean.length > 0) {
      const jalur = antrean.pop();
      if (jalur === undefined || terlihat.has(jalur) || !existsSync(jalur)) continue;
      terlihat.add(jalur);
      for (const cocok of readFileSync(jalur, 'utf8').matchAll(/from\s+'(\.[^']+)'/g)) {
        antrean.push(resolve(join(dirname(jalur), cocok[1] ?? '')));
      }
    }
    expect([...terlihat].some((j) => /kunci\.ts$/.test(j))).toBe(true);
  });
});
