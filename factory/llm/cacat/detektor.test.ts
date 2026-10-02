/**
 * Detektor cacat penulisan soal (M2d-11 D-1, pra-registrasi §2). Tiap
 * detektor punya kasus yang HARUS menyala dan kasus bersih yang tidak boleh
 * menyala (pengikat sabotase: detektor yang dimatikan membuat tes merah),
 * tangga pelonggaran, pelindung, dan aturan kalibrasi mekanis.
 */
import { describe, expect, it } from 'vitest';
import { AMBANG_AWAL, ANAK_TANGGA, deteksi, kalibrasiAmbang, menolak, pisahLabel, type AmbangCacat, type KodeDetektor, type SoalCacat } from './detektor.ts';

/** Soal kisi 2×2 tanpa petunjuk bentuk (pola DADA s3). */
const BERSIH: SoalCacat = {
  pesan: 'Pemilik terbesarnya diam saja, berarti dia yakin harganya naik.',
  pilihan: {
    a: 'Betul, laporannya menunjukkan ia membeli di harga rendah.',
    b: 'Betul, laporannya menunjukkan ia membeli di harga tinggi.',
    c: 'Keliru, laporannya menunjukkan ia menjual di harga rendah.',
    d: 'Keliru, laporannya menunjukkan ia menjual di harga tinggi.',
  },
  kunci: 'c',
};

const kode = (s: SoalCacat, a: AmbangCacat = AMBANG_AWAL): KodeDetektor[] => [...new Set(menolak(deteksi(s, a)).map((b) => b.kode))].sort();
const ganti = (s: SoalCacat, p: Partial<SoalCacat['pilihan']>, lain: Partial<SoalCacat> = {}): SoalCacat => ({ ...s, ...lain, pilihan: { ...s.pilihan, ...p } });
const pada = (k: KodeDetektor, n: number): AmbangCacat => ({ ...AMBANG_AWAL, [k]: n });

describe('praolah', () => {
  it('memisahkan label Betul/Keliru dari alasan', () => {
    expect(pisahLabel('Keliru, alasan resmi hari ini: X.')).toEqual({ label: 'Keliru', alasan: 'alasan resmi hari ini: X.' });
    expect(pisahLabel('  Betul alasannya')).toEqual({ label: 'Betul', alasan: 'alasannya' });
    expect(pisahLabel('Tanpa label.')).toEqual({ label: null, alasan: 'Tanpa label.' });
  });
});

describe('soal bersih', () => {
  it('nol bendera di ambang awal', () => {
    expect(deteksi(BERSIH, AMBANG_AWAL)).toEqual([]);
  });
});

describe('D1 panjang', () => {
  it('kunci terpanjang tunggal > 1,25 × median pengecoh menyala', () => {
    expect(kode(ganti(BERSIH, { c: 'Keliru, laporannya menunjukkan ia menjual sangat banyak saham miliknya di harga rendah.' }))).toContain('D1');
  });
  it('rasio terpanjang/terpendek > 1,6 menyala walau kunci bukan terpanjang', () => {
    expect(kode(ganti(BERSIH, { a: 'Betul, ia membeli.' }))).toContain('D1');
  });
  it('L2 membuang klausa rasio; L3 dicatat', () => {
    const s = ganti(BERSIH, { a: 'Betul, ia membeli.' });
    expect(kode(s, pada('D1', 2))).not.toContain('D1');
    const k = ganti(BERSIH, { c: 'Keliru, laporannya menunjukkan ia menjual sangat banyak saham miliknya di harga rendah sekali.' });
    expect(kode(k, pada('D1', 3))).not.toContain('D1');
    expect(deteksi(k, pada('D1', 3)).some((b) => b.kode === 'D1' && b.status === 'dicatat')).toBe(true);
  });
});

describe('D2 spesifisitas unik', () => {
  const tanggalDiKunci = ganti(BERSIH, { c: 'Keliru, laporan 30 Juni menunjukkan ia menjual di harga rendah.' });
  const tanggalDiPengecoh = ganti(BERSIH, { a: 'Betul, laporan 30 Juni menunjukkan ia membeli di harga rendah.' });
  it('tanggal hanya di satu opsi (kunci) menyala', () => {
    expect(kode(tanggalDiKunci)).toContain('D2');
  });
  it('aturan "0 atau ≥ 2": tanggal hanya di satu pengecoh juga menyala di ambang awal, tidak di L1', () => {
    expect(kode(tanggalDiPengecoh)).toContain('D2');
    expect(kode(tanggalDiPengecoh, pada('D2', 1))).not.toContain('D2');
    expect(kode(tanggalDiKunci, pada('D2', 1))).toContain('D2');
  });
  it('angka, persen, kode saham, dokumen dihitung per jenis', () => {
    expect(kode(ganti(BERSIH, { c: 'Keliru, laporannya menunjukkan ia menjual di harga Rp13.' }))).toContain('D2');
    expect(kode(ganti(BERSIH, { c: 'Keliru, laporannya menunjukkan ia menjual 5 persen di harga rendah.' }))).toContain('D2');
    expect(kode(ganti(BERSIH, { c: 'Keliru, laporannya menunjukkan TIRT menjual di harga rendah.' }))).toContain('D2');
    const dok = { ...BERSIH, pilihan: { a: 'Betul, ia membeli di harga rendah.', b: 'Betul, ia membeli di harga tinggi.', c: 'Keliru, pengumuman: ia menjual di harga rendah.', d: 'Keliru, ia menjual di harga tinggi.' } };
    expect(kode(dok)).toContain('D2');
  });
  it('tanggal di dua opsi tidak menyala; angka tanggal tidak dihitung sebagai angka', () => {
    const dua = ganti(BERSIH, { a: 'Betul, laporan 30 Juni menunjukkan ia membeli di harga rendah.', c: 'Keliru, laporan 30 Juni menunjukkan ia menjual di harga rendah.' });
    expect(kode(dua)).not.toContain('D2');
  });
});

describe('D3 tumpang-tindih leksikal dengan pesan', () => {
  it('kunci tertinggi tunggal dengan selisih > 0,15 menyala; 0,25 (L2) tidak bila selisih ≤ 0,25', () => {
    const s = { ...BERSIH, pesan: 'Kata grup dia menjual saham, rendah banget harganya.' };
    const t = ganti(s, { c: 'Keliru, laporannya menunjukkan ia menjual saham di harga rendah.' });
    expect(kode(t)).toContain('D3');
  });
  it('kunci terendah tunggal juga menyala', () => {
    const s = { ...BERSIH, pesan: 'Laporannya menunjukkan dia membeli, harga tinggi rendah.' };
    const t = ganti(s, { c: 'Keliru, catatannya memperlihatkan pelepasan murah.' , a: 'Betul, laporannya menunjukkan ia membeli di harga rendah.', b: 'Betul, laporannya menunjukkan ia membeli di harga tinggi.', d: 'Keliru, laporannya menunjukkan ia membeli di harga tinggi.' });
    expect(kode(t, { ...AMBANG_AWAL, D1: 3, D5: 3 })).toContain('D3');
  });
});

describe('D4 restatement', () => {
  it('4-gram pesan hanya di kunci menyala; 5-gram (L1) tidak bila yang sama hanya 4 kata', () => {
    const s = { ...BERSIH, pesan: 'Gue dengar dia menjual di harga murah kemarin.' };
    const t = ganti(s, { c: 'Keliru, catatan memperlihatkan ia menjual di harga murah.' });
    expect(kode(t, { ...AMBANG_AWAL, D1: 3, D3: 3, D5: 3 })).toContain('D4');
    expect(kode(t, { ...AMBANG_AWAL, D1: 3, D3: 3, D5: 3, D4: 1 })).not.toContain('D4');
  });
  it('4-gram yang juga ada di pengecoh tidak menyala', () => {
    const s = { ...BERSIH, pesan: 'Laporannya menunjukkan ia menjual banyak.' };
    expect(kode(s)).not.toContain('D4');
  });
});

describe('D5 konvergensi', () => {
  it('kunci "pusat" tunggal menyala', () => {
    const s: SoalCacat = {
      pesan: 'Harga penutupan kemarin Rp97, gw yakin.',
      pilihan: {
        a: 'Betul, penutupan kemarin memang segitu.',
        b: 'Keliru, penutupan kemarin lebih tinggi, bukan segitu.',
        c: 'Betul, angka itu tertinggi sebelum hari ini.',
        d: 'Keliru, harga sebelumnya lebih tinggi lagi.',
      },
      kunci: 'b',
    };
    expect(kode(s)).toContain('D5');
    expect(kode(s, pada('D5', 3))).not.toContain('D5');
  });
});

describe('D6 kata absolut & D7 pelunak', () => {
  it('absolut hanya di kunci menyala', () => {
    expect(kode(ganti(BERSIH, { c: 'Keliru, laporannya menunjukkan ia pasti menjual di harga rendah.' }))).toContain('D6');
  });
  it('absolut hanya di satu pengecoh: menyala di awal, tidak di L1; di dua pengecoh menyala di L1, tidak di L2', () => {
    const satu = ganti(BERSIH, { a: 'Betul, laporannya menunjukkan ia selalu membeli di harga rendah.' });
    expect(kode(satu)).toContain('D6');
    expect(kode(satu, pada('D6', 1))).not.toContain('D6');
    const dua = ganti(satu, { b: 'Betul, laporannya menunjukkan ia hanya membeli di harga tinggi.' });
    expect(kode(dua, pada('D6', 1))).toContain('D6');
    expect(kode(dua, pada('D6', 2))).not.toContain('D6');
  });
  it('absolut di kunci DAN pengecoh tidak menyala; "satu-satunya" dan "100%" dikenali', () => {
    expect(kode(ganti(BERSIH, { a: 'Betul, laporannya menunjukkan ia hanya membeli di harga rendah.', c: 'Keliru, laporannya menunjukkan ia hanya menjual di harga rendah.' }))).not.toContain('D6');
    expect(kode(ganti(BERSIH, { c: 'Keliru, laporannya satu-satunya bukti ia menjual di harga rendah.' }))).toContain('D6');
    expect(kode(ganti(BERSIH, { c: 'Keliru, laporannya menunjukkan ia menjual 100% di harga rendah.' }))).toContain('D6');
  });
  it('pelunak hanya di kunci menyala', () => {
    expect(kode(ganti(BERSIH, { c: 'Keliru, laporannya menunjukkan ia mungkin menjual di harga rendah.' }))).toContain('D7');
    expect(kode(ganti(BERSIH, { a: 'Betul, laporannya menunjukkan ia belum tentu membeli di harga rendah.' }))).toContain('D7');
  });
  it('batas kata: "tentunya" bukan "tentu"? (tetap kata lain) — "pastikan" tidak menyala', () => {
    expect(kode(ganti(BERSIH, { c: 'Keliru, laporannya menunjukkan ia menjual, pastikan harga rendah.' }))).not.toContain('D6');
  });
});

describe('D8 keseimbangan label (pelindung)', () => {
  it('3 Betul + 1 Keliru menyala', () => {
    expect(kode(ganti(BERSIH, { d: 'Betul, laporannya menunjukkan ia menjual di harga tinggi.' }))).toContain('D8');
  });
  it('opsi tanpa label menyala', () => {
    expect(kode(ganti(BERSIH, { d: 'laporannya menunjukkan ia menjual di harga tinggi.' }))).toContain('D8');
  });
  it('pelindung: tidak punya anak tangga, tetap menolak di ambang setinggi apa pun', () => {
    expect(ANAK_TANGGA.D8).toBe(0);
    const s = ganti(BERSIH, { d: 'Betul, laporannya menunjukkan ia menjual di harga tinggi.' });
    expect(kode(s, { ...AMBANG_AWAL, D8: 5 })).toContain('D8');
  });
});

describe('D9 urutan numerik', () => {
  const s: SoalCacat = {
    pesan: 'Naiknya dua kali lipat sejak awal bulan.',
    pilihan: {
      a: 'Betul, harganya jadi 2,21 kali.',
      b: 'Betul, harganya jadi 3,51 kali.',
      c: 'Keliru, harganya jadi 1,02 kali.',
      d: 'Keliru, harganya justru turun.',
    },
    kunci: 'a',
  };
  it('tiga opsi bernilai tunggal yang tidak urut menyala; L1 dicatat', () => {
    expect(kode(s, { ...AMBANG_AWAL, D2: 2 })).toContain('D9');
    expect(kode(s, { ...AMBANG_AWAL, D2: 2, D9: 1 })).not.toContain('D9');
  });
  it('urut naik tidak menyala; format Indonesia (1.690 = seribu enam ratus sembilan puluh)', () => {
    const urut = { ...s, pilihan: { ...s.pilihan, a: 'Betul, harganya jadi 1,02 kali.', b: 'Betul, harganya jadi 2,21 kali.', c: 'Keliru, harganya jadi 3,51 kali.' } };
    expect(kode(urut, { ...AMBANG_AWAL, D2: 2 })).not.toContain('D9');
    const rp = { ...s, pilihan: { a: 'Betul, harganya Rp950.', b: 'Betul, harganya Rp1.690.', c: 'Keliru, harganya Rp1.545.', d: 'Keliru, harganya turun.' } };
    expect(kode(rp, { ...AMBANG_AWAL, D2: 2 })).toContain('D9');
  });
});

describe('aturan kalibrasi (pra-registrasi §2)', () => {
  const absolutDiPengecoh = (i: number): { id: string; soal: SoalCacat } => ({ id: `t${String(i)}`, soal: ganti(BERSIH, { a: 'Betul, laporannya menunjukkan ia selalu membeli di harga rendah.' }) });
  it('> 1/6 ditandai → detektor yang paling banyak menandai turun satu anak tangga, berulang', () => {
    const tayang = [absolutDiPengecoh(1), absolutDiPengecoh(2), absolutDiPengecoh(3), { id: 'b1', soal: BERSIH }, { id: 'b2', soal: BERSIH }, { id: 'b3', soal: BERSIH }];
    const k = kalibrasiAmbang(tayang);
    expect(k.ambang.D6).toBe(1);
    expect(k.langkah.map((l) => l.turun)).toEqual(['D6', null]);
    expect(k.langkah[0]?.ditandai).toEqual(['t1', 't2', 't3']);
  });
  it('≤ 1/6 ditandai → tidak ada yang turun', () => {
    const k = kalibrasiAmbang([absolutDiPengecoh(1), ...[1, 2, 3, 4, 5].map((i) => ({ id: `b${String(i)}`, soal: BERSIH }))]);
    expect(k.ambang).toEqual(AMBANG_AWAL);
  });
  it('seri → urutan D1…D9; pelindung tidak pernah turun', () => {
    const d8 = { id: 'x', soal: ganti(BERSIH, { d: 'Betul, laporannya menunjukkan ia menjual di harga tinggi.' }) };
    const k = kalibrasiAmbang([d8, { ...d8, id: 'y' }, ...[1, 2, 3, 4].map((i) => ({ id: `b${String(i)}`, soal: BERSIH }))]);
    expect(k.ambang.D8).toBe(0);
    expect(k.langkah.at(-1)?.turun).toBeNull();
  });
});
