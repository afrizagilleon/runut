/**
 * M2d-7 T-05: umpan balik BERALTERNATIF + perbaikan TERARAH + berhenti (D-5).
 *
 * Kegagalan yang dijaga: umpan balik "salah, ulangi" tanpa lokasi atau tanpa
 * alternatif; bagian yang lolos ikut ditulis ulang (merusak draf yang sudah
 * benar); perbaikan tanpa batas.
 */
import { describe, expect, it } from 'vitest';
import { bankPengecoh, kunciSudut } from './bank-pengecoh.ts';
import { PAKET_T, TULISAN } from './bantu-uji-tulisan.ts';
import type { KunciOpsi } from './draf.ts';
import { hurufKunciKode } from './posisi-kunci.ts';
import { rakitOmongan, susunHuruf, type SetPilihan } from './penulis-pecah.ts';
import {
  MAKS_PERBAIKAN,
  alternatifUntuk,
  catatPerbaikan,
  dariG,
  dariKembar,
  dariKritik,
  dariMeresmikan,
  dariTebak,
  dariValidator,
  lengkapi,
  lokasiKritik,
  lokasiValidator,
  rencanaPerbaikan,
  tulisUmpan,
  type KonteksAlternatif,
} from './umpan-terarah.ts';

const no = 1;
const kunci = kunciSudut(PAKET_T, 'susp-2025-12-10');
const bank = bankPengecoh(PAKET_T, 'susp-2025-12-10');
const huruf = hurufKunciKode('tirt', no);
const set = susunHuruf(TULISAN[no]?.pilihan ?? [], huruf) as SetPilihan;
const o = rakitOmongan(PAKET_T, kunci, TULISAN[no]?.pesan as never, set, huruf, bank, TULISAN[no]?.penjelasan ?? '');
const K: KonteksAlternatif = { paket: PAKET_T, label: 'Keliru', kunci, bank, pesan: TULISAN[no]?.pesan as never, pilihan: set, hurufKunci: huruf, kartu: o.kartu };

describe('lokasi penolakan', () => {
  it('validator: pilihan x, pilihan kunci, pesan, penjelasan', () => {
    expect(lokasiValidator({ kode: 'OPSI_PANJANG', omongan: 1, pesan: 'Pilihan b 120 karakter' }, 'c')).toEqual(['pilihan-b']);
    expect(lokasiValidator({ kode: 'KUNCI_TAK_TERBUKTI_KARTU', omongan: 1, pesan: 'Pilihan kunci merujuk "x"' }, 'c')).toEqual(['pilihan-c']);
    expect(lokasiValidator({ kode: 'PESAN_PANJANG', omongan: 1, pesan: 'Pesan 300 karakter' }, 'c')).toEqual(['pesan']);
    expect(lokasiValidator({ kode: 'PENJELASAN_TANPA_SALAH_KAPRAH', omongan: 1, pesan: 'Penjelasan harus ditutup' }, 'c')).toEqual(['penjelasan']);
    expect(lokasiValidator({ kode: 'KATA_PENILAIAN', omongan: 1, pesan: 'Pesan memakai kata penilaian "murah"' }, 'c')).toEqual(['pesan']);
  });

  it('kritikus: bagian menyebut huruf/penjelasan/pesan; "kunci" → pilihan yang juga benar; "tertebak" → ketiga pengecoh', () => {
    expect(lokasiKritik('bahasa', 'pilihan b', 'c', [])).toEqual(['pilihan-b']);
    expect(lokasiKritik('lain', 'penjelasan', 'c', [])).toEqual(['penjelasan']);
    expect(lokasiKritik('makna', '-', 'c', [])).toEqual(['pesan']);
    expect(lokasiKritik('kunci', '-', 'c', ['a'])).toEqual(['pilihan-a']);
    expect(lokasiKritik('tertebak', '-', 'c', [])).toEqual(['pilihan-a', 'pilihan-b', 'pilihan-d']);
  });

  it('meresmikan dan G-angka-cukup: keempat pilihan (hubungan kunci ↔ pengecoh), bukan kunci saja', () => {
    expect(dariMeresmikan(['x'], o).map((x) => x.lokasi)).toEqual(['pilihan-a', 'pilihan-b', 'pilihan-c', 'pilihan-d']);
    const g = { tolak: true, umpan: [], kaku: { tolak: false, penanda: [], panjang: 0, kalimat_panjang: 0, alasan: [] }, angka_cukup: { tolak: true, bukti: [], alasan: '58 = 106 − 48' } } as unknown as Parameters<typeof dariG>[0];
    expect(dariG(g, o).map((x) => x.lokasi)).toEqual(['pilihan-a', 'pilihan-b', 'pilihan-c', 'pilihan-d']);
  });

  it('kembar: pengecoh yang diganti, bukan kunci', () => {
    const u = dariKembar({ tolak: true, ambang: 0.889, maks: 1, alasan: [], kembar: [{ a: 'b', b: huruf, kemiripan: 1, identik: true }] }, o);
    expect(u.map((x) => x.lokasi)).toEqual(['pilihan-b']);
  });
});

describe('umpan balik beralternatif', () => {
  it('setiap butir menyebut lokasi, nilai teramati, dan ≥ 1 alternatif yang diizinkan', () => {
    const mentah = [
      ...dariValidator([{ kode: 'OPSI_PANJANG', omongan: 1, pesan: 'Pilihan a terlalu panjang' }], o),
      ...dariValidator([{ kode: 'PESAN_PANJANG', omongan: 1, pesan: 'Pesan terlalu panjang' }], o),
      ...dariValidator([{ kode: 'PENJELASAN_PANJANG', omongan: 1, pesan: 'Penjelasan terlalu panjang' }], o),
    ];
    for (const u of lengkapi(mentah, K)) {
      expect(u.alternatif.length).toBeGreaterThan(0);
      expect(u.teramati.length).toBeGreaterThan(0);
      const t = tulisUmpan(u);
      expect(t).toMatch(/lokasi: (pilihan [a-d]|pesan|penjelasan)/);
      expect(t).toContain('teramati: "');
      expect(t).toContain('alternatif yang diizinkan: ');
    }
  });

  it('alternatif pengecoh = kandidat bank yang BELUM dipakai huruf lain', () => {
    const h = (['a', 'b', 'd'] as const).find((x) => x !== huruf) as KunciOpsi;
    const alt = alternatifUntuk(`pilihan-${h}`, K).join(' ');
    const dipakaiLain = (['a', 'b', 'c', 'd'] as const).filter((x) => x !== h).map((x) => set[x].sumber).filter((s) => s !== 'kunci');
    for (const id of dipakaiLain) expect(alt).not.toMatch(new RegExp(`\\b${id} \\(`));
    expect(alt).toMatch(/P\d+ \((periode-keliru|operand-keliru|konsep-lain|alasan-lain|pengumuman-lain):/);
  });

  it('alternatif pesan KELIRU = salah kaprah lain dari bank; pesan BETUL = isi fakta sudut; penjelasan = rujukan kartu', () => {
    expect(alternatifUntuk('pesan', K).join(' ')).toMatch(/salah kaprah P\d/);
    expect(alternatifUntuk('pesan', { ...K, label: 'Betul' }).join(' ')).toContain('isi fakta sudut');
    expect(alternatifUntuk('penjelasan', K).join(' ')).toContain('[[susp-2025-12-10|…]]');
    // Pilihan kunci: isi sudut dengan kata sendiri ATAU rujukan lain ke fakta sudut (tanggal), tidak harus mengulang angka pesan.
    const kn = kunciSudut(PAKET_T, 'naik-2025-11-26-2025-12-09');
    const alt = alternatifUntuk(`pilihan-${huruf}`, { ...K, kunci: kn, label: 'Betul' }).join(' ');
    expect(alt).toContain('[[naik-2025-11-26-2025-12-09|26 November]]');
    expect(alt).toContain('hanya boleh diulang kunci bila pengecoh juga memuatnya');
  });

  it('kritikus dan penebak menjadi butir berlokasi', () => {
    const kr = dariKritik({ tanpa_keberatan: false, menjawab: true, terpotong: false, keberatan: [{ jenis: 'ambigu', bagian: 'pilihan a', alasan: 'dua arti' }], arahan: 'perjelas', diabaikan: [], panggilan: [], galat: [] }, o);
    expect(kr.map((x) => x.lokasi)).toEqual(['pilihan-a', 'pilihan-a']);
    const t = dariTebak({ lolos: false, benar: 3, yakin_benar: 60, alasan: '', tebakan: [1, 2, 3].map((ke) => ({ ke, pilihan: huruf, yakin: 60, alasan: 'wajar', benar: true, terbaca: true, panggilan: [] })) }, o);
    expect(t.map((x) => x.lokasi).sort()).toEqual((['a', 'b', 'c', 'd'] as const).filter((x) => x !== huruf).map((x) => `pilihan-${x}`));
  });
});

describe('perbaikan terarah + berhenti', () => {
  it('hanya bagian yang gagal ditulis ulang; pesan menarik pilihan + penjelasan; pilihan menarik penjelasan', () => {
    expect(rencanaPerbaikan([{ lokasi: 'pilihan-b' }])).toEqual({ gagal: ['pilihan'], tulisPesan: false, tulisPilihan: ['b'], tulisPenjelasan: true });
    expect(rencanaPerbaikan([{ lokasi: 'penjelasan' }])).toEqual({ gagal: ['penjelasan'], tulisPesan: false, tulisPilihan: [], tulisPenjelasan: true });
    expect(rencanaPerbaikan([{ lokasi: 'pesan' }])).toMatchObject({ gagal: ['pesan'], tulisPesan: true, tulisPilihan: ['a', 'b', 'c', 'd'] });
    expect(rencanaPerbaikan([{ lokasi: 'pilihan-a' }, { lokasi: 'pilihan-d' }, { lokasi: 'penjelasan' }])).toMatchObject({ gagal: ['penjelasan', 'pilihan'], tulisPilihan: ['a', 'd'] });
  });

  it(`paling banyak ${String(MAKS_PERBAIKAN)} perbaikan per bagian, lalu ganti sudut`, () => {
    let h = { pesan: 0, pilihan: 0, penjelasan: 0 };
    const r = rencanaPerbaikan([{ lokasi: 'pilihan-b' }]);
    const hasil: boolean[] = [];
    for (let i = 0; i < 3; i++) {
      const x = catatPerbaikan(h, r);
      h = x.hitung;
      hasil.push(x.gantiSudut);
    }
    expect(hasil).toEqual([false, false, true]);
    // Bagian lain tidak ikut dihitung.
    expect(h).toEqual({ pesan: 0, pilihan: 3, penjelasan: 0 });
  });
});
