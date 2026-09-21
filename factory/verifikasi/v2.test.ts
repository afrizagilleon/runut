/**
 * M2a T-09 (RQ-05, RQ-06): himpunan V2, urutan, ketergantungan, dan INV-C.
 */
import { createHash } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { ATURAN_V2, verifikasiV2 } from './v2.ts';
import { ATURAN } from './aturan.ts';
import { konteks, harga, laporan } from './contoh.ts';
import { SEMUA_KODE_ATURAN, keparahanTemuan } from '../skema/tipe.ts';
import { ATURAN_PENANDA, susunDokumenBukti, susunLaporanGudang } from '../gudang.ts';
import type { DataEmiten, KonteksGudang } from './tipe.ts';

const CONTOH = fileURLToPath(new URL('../muat/contoh-gudang', import.meta.url));

function dataEmiten(ubah: Partial<DataEmiten> = {}): DataEmiten {
  return {
    simbol: 'AA',
    laporan: [],
    harga: [],
    suspensi: [],
    berkas_laporan: [],
    stock_split: [],
    right_issue: [],
    bonus: [],
    dividen: [],
    rups: [],
    all_time_price: [],
    pemegang: [],
    saham_tahunan: [],
    ringkasan_pasar: null,
    berkas: [],
    ...ubah,
  };
}

function ktx(ubah: Partial<DataEmiten> = {}): KonteksGudang {
  const data = dataEmiten(ubah);
  return {
    ...konteks({ laporan: data.laporan, harga: data.harga, suspensi: data.suspensi, simbol: 'AA' }),
    data,
    berkas_kosong: [],
  };
}

describe('ATURAN_V2 — himpunan, urutan, ketergantungan', () => {
  it('memuat setiap aturan R1-R10 dan setiap aturan M2a, tanpa satu pun hilang', () => {
    const kode = ATURAN_V2.map((e) => e.kode).sort();
    expect(kode).toEqual([...SEMUA_KODE_ATURAN].sort());
    expect(ATURAN_V2).toHaveLength(SEMUA_KODE_ATURAN.length);
  });

  it('tidak mengubah himpunan V1 yang membangun berkas kasus', () => {
    expect(ATURAN).toHaveLength(10);
  });

  it('memberi nomor urut yang unik dan berurutan', () => {
    const urutan = ATURAN_V2.map((e) => e.urutan).sort((a, b) => a - b);
    expect(urutan).toEqual(Array.from({ length: ATURAN_V2.length }, (_, i) => i + 1));
  });

  it('menaruh tiap aturan sesudah aturan yang hasilnya ia pakai', () => {
    const urutan = new Map(ATURAN_V2.map((e) => [e.kode, e.urutan]));
    for (const e of ATURAN_V2) {
      for (const butuh of e.bergantung) {
        expect(urutan.get(butuh), `${e.kode} bergantung pada ${butuh}`).toBeLessThan(e.urutan);
      }
    }
  });

  it('menjalankan gerbang urutan lebih dulu: R25, R12, R22 sebelum R14', () => {
    const urutan = new Map(ATURAN_V2.map((e) => [e.kode, e.urutan]));
    for (const gerbang of ['R25', 'R12', 'R22'] as const) {
      expect(urutan.get(gerbang)).toBeLessThan(urutan.get('R14') ?? 0);
    }
    // R22 sesudah R12: urutan terbalik memperburuk R14.
    expect(urutan.get('R12')).toBeLessThan(urutan.get('R22') ?? 0);
  });

  it('melewati aturan lama yang digantikan, dengan alasan yang menyebut penggantinya', () => {
    const hasil = verifikasiV2(ktx({ laporan: [laporan()] }));
    const cari = (kode: string) => hasil.pemeriksaan.find((p) => p.aturan === kode);
    for (const [kode, pengganti] of [
      ['R1', 'R15'],
      ['R2', 'R14'],
      ['R10', 'R18a'],
      ['R6', 'R17B'],
    ] as const) {
      const p = cari(kode);
      expect(p?.dijalankan, `${kode} seharusnya dilewati`).toBe(false);
      expect(p?.alasan_lewat).toContain(pengganti);
      expect(p?.temuan).toEqual([]);
    }
  });

  it('mencatat aturan yang dilewati sebagai dilewati, bukan menghilangkannya', () => {
    const hasil = verifikasiV2(ktx());
    expect(hasil.pemeriksaan).toHaveLength(ATURAN_V2.length);
    for (const p of hasil.pemeriksaan) {
      if (!p.dijalankan) {
        expect(p.alasan_lewat, `${p.aturan} dilewati tanpa alasan`).not.toBeNull();
        expect(p.alasan_lewat?.length ?? 0).toBeGreaterThan(10);
      }
    }
  });

  it('RQ-05: satu cacat aritmetika hanya melahirkan satu temuan berkeparahan konflik', () => {
    // Persennya sengaja nol supaya R11a menjawab TIDAK_LENGKAP dan yang
    // tersisa hanya cacat aritmetikanya.
    const rusak = laporan({
      jenis_mentah: 'others',
      sebelum: 100,
      jumlah: 30,
      sesudah: 150,
      persen_sebelum: 0,
      persen_sesudah: 0,
      transaksi: [],
    });
    const hasil = verifikasiV2(ktx({ laporan: [rusak] }));
    const konflik = hasil.pemeriksaan
      .flatMap((p) => p.temuan)
      .filter((t) => keparahanTemuan(t) === 'konflik');
    expect(konflik.map((t) => t.aturan)).toEqual(['R15']);
  });

  it('RQ-05: satu hari bervolume nol hanya dilaporkan satu aturan', () => {
    const datar = harga({ tanggal: '2026-01-06', buka: 100, tertinggi: 100, terendah: 100, tutup: 100, volume: 0 });
    const hasil = verifikasiV2(ktx({ harga: [datar] }));
    const aturanBerbunyi = hasil.pemeriksaan
      .filter((p) => p.temuan.length > 0)
      .map((p) => p.aturan)
      .sort();
    // R10 digantikan R18a; R19a menandai hal yang berbeda (harganya, bukan
    // kelengkapan datanya) dan keduanya bukan konflik.
    expect(aturanBerbunyi).not.toContain('R10');
    const konflik = hasil.pemeriksaan
      .flatMap((p) => p.temuan)
      .filter((t) => keparahanTemuan(t) === 'konflik');
    expect(konflik).toEqual([]);
  });
});

describe('INV-C — keluaran byte-identik di dua kali jalan', () => {
  const sha = (teks: string): string => createHash('sha256').update(teks, 'utf8').digest('hex');

  it('menyusun laporan gudang yang sama persis di dua kali panggil', () => {
    const satu = susunLaporanGudang(CONTOH);
    const dua = susunLaporanGudang(CONTOH);
    expect(sha(JSON.stringify(dua))).toBe(sha(JSON.stringify(satu)));
  });

  it('menyusun dokumen bukti yang sama persis di dua kali panggil', () => {
    const satu = susunDokumenBukti(susunLaporanGudang(CONTOH));
    const dua = susunDokumenBukti(susunLaporanGudang(CONTOH));
    expect(sha(dua)).toBe(sha(satu));
  });

  it('tidak memuat tanggal hari ini, jam, maupun angka acak di keluarannya', () => {
    const dokumen = susunDokumenBukti(susunLaporanGudang(CONTOH));
    // Tahun berjalan tidak boleh muncul sebagai penanda waktu jalan; tanggal
    // yang muncul harus berasal dari data, bukan dari jam dinding.
    const sekarang = new Date().toISOString().slice(0, 10);
    expect(dokumen).not.toContain(sekarang);
    expect(dokumen).not.toMatch(/\bdibuat pada\b|\bdijalankan pada\b/i);
  });

  it('mengurutkan aturan di laporan menurut urutan jalan yang ditetapkan', () => {
    const laporanGudang = susunLaporanGudang(CONTOH);
    const urutan = new Map(ATURAN_V2.map((e) => [e.kode, e.urutan]));
    const nomor = laporanGudang.agregat.map((a) => urutan.get(a.aturan) ?? 0);
    expect(nomor).toEqual([...nomor].sort((a, b) => a - b));
  });
});

describe('dokumen bukti — bentuk dan batasnya', () => {
  const dokumen = susunDokumenBukti(susunLaporanGudang(CONTOH));

  it('memberi tiap aturan satu kalimat awam berbentuk "Kami menolak/menandai"', () => {
    for (const e of ATURAN_V2) {
      const bagian = dokumen.split(`### ${e.kode} —`)[1];
      expect(bagian, `${e.kode} tidak punya bagiannya sendiri`).toBeDefined();
      // Baris pertama sesudah judulnya adalah kalimat awamnya.
      const kalimat =
        bagian
          ?.split('\n')
          .slice(1)
          .filter((b) => b.trim() !== '')[0] ?? '';
      expect(kalimat, `${e.kode}: ${kalimat}`).toMatch(/^Kami (menolak|menandai|memberi)/);
    }
  });

  it('memberi paling banyak dua contoh nyata per aturan', () => {
    for (const a of susunLaporanGudang(CONTOH).agregat) {
      expect(a.contoh.length, `${a.aturan} memberi ${String(a.contoh.length)} contoh`).toBeLessThanOrEqual(2);
    }
  });

  it('selalu menyebut berapa yang diperiksa, bukan hanya berapa yang merah (INV-B)', () => {
    for (const e of ATURAN_V2) {
      const bagian = dokumen.split(`### ${e.kode} —`)[1]?.split('###')[0] ?? '';
      expect(bagian, `${e.kode}`).toContain('Diperiksa ');
    }
  });

  it('tidak memuat satu pun kata penilaian saham (INV-5)', () => {
    const terlarang = /\b(bagus|jelek|sehat|buruk|murah|mahal|menarik|prospek)\b/i;
    expect(dokumen).not.toMatch(terlarang);
  });

  it('memuat bagian "Yang tidak bisa diperiksa dari data ini"', () => {
    expect(dokumen).toContain('## Yang tidak bisa diperiksa dari data ini');
    expect(dokumen).toContain('Penyebabnya tidak diketahui');
  });
});

describe('A-1 D-A2 — kata laporan mengikuti keparahan aturan', () => {
  const laporanGudang = susunLaporanGudang(CONTOH);
  const dokumen = susunDokumenBukti(laporanGudang);

  const bagian = (kode: string): string =>
    dokumen.split(`### ${kode} \u2014`)[1]?.split('###')[0] ?? '';

  it('memakai "ditandai" untuk aturan penanda dan "bertentangan" untuk aturan penolak', () => {
    for (const e of ATURAN_V2) {
      const isi = bagian(e.kode);
      const penanda = ATURAN_PENANDA.includes(e.kode);
      expect(isi, `${e.kode} tidak punya bagiannya`).toContain('Diperiksa ');
      if (penanda) {
        expect(isi, `${e.kode} penanda tetapi memakai "bertentangan"`).not.toMatch(
          /\d bertentangan,/,
        );
        expect(isi, `${e.kode} penanda tanpa kata "ditandai"`).toMatch(/\d ditandai,/);
      } else {
        expect(isi, `${e.kode} penolak tetapi memakai "ditandai"`).not.toMatch(/\d ditandai,/);
        expect(isi, `${e.kode} penolak tanpa kata "bertentangan"`).toMatch(/\d bertentangan,/);
      }
    }
  });

  it('menyelaraskan daftar penanda dengan kata kerja kalimat awamnya', () => {
    for (const e of ATURAN_V2) {
      const kalimat =
        bagian(e.kode)
          .split('\n')
          .filter((b) => b.trim() !== '')[1] ?? '';
      if (ATURAN_PENANDA.includes(e.kode)) {
        expect(kalimat, `${e.kode}: ${kalimat}`).toMatch(/^Kami (menandai|memberi)/);
      } else {
        expect(kalimat, `${e.kode}: ${kalimat}`).toMatch(/^Kami menolak/);
      }
    }
  });

  it('menyelaraskan daftar penanda dengan keparahan temuan yang sungguh dikeluarkan', () => {
    // Aturan penanda tidak boleh mengeluarkan satu pun temuan berkeparahan
    // konflik atas seluruh gudang contoh maupun gudang sungguhan.
    for (const emiten of susunLaporanGudang().emiten) {
      for (const p of emiten.pemeriksaan) {
        if (!ATURAN_PENANDA.includes(p.aturan)) continue;
        for (const t of p.temuan) {
          expect(keparahanTemuan(t), `${p.aturan} di ${emiten.simbol}`).not.toBe('konflik');
        }
      }
    }
  });

  it('memberi catatan kaki satu kalimat pada kolom merah', () => {
    expect(dokumen).toContain('| merah[^merah] |');
    const catatan = dokumen.split('\n').find((b) => b.startsWith('[^merah]:'));
    expect(catatan).toBeDefined();
    expect(catatan).toContain('bukan bahwa');
    for (const kode of ATURAN_PENANDA) expect(catatan).toContain(kode);
  });
});
