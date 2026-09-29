/**
 * M2d-7 T-03: penulis DIPECAH (D-3) — pesan dari 1–2 fakta, pilihan DIPILIH
 * dari bank pengecoh lalu dirangkai kata, penjelasan sesudah soal jadi.
 *
 * Kegagalan yang dijaga: penulis kembali mengarang pengecoh (sumber bukan
 * bank, kandidat dipakai dua kali, `[[misal|…]]`, rujukan ke fakta lain);
 * pesan panggilan 1 diam-diam menerima seluruh paket; label kunci atau huruf
 * kunci dari penulis, bukan dari kode.
 */
import { describe, expect, it } from 'vitest';
import { bankPengecoh, kunciSudut } from './bank-pengecoh.ts';
import { PAKET_T, TULISAN } from './bantu-uji-tulisan.ts';
import type { KunciOpsi } from './draf.ts';
import { hurufKunciKode } from './posisi-kunci.ts';
import {
  POLA_LABEL,
  gIkatan,
  kartuKode,
  labelKode,
  pesanTulisPenjelasan,
  pesanTulisPesan,
  pesanTulisPilihan,
  rakitOmongan,
  susunHuruf,
  uraiPesan,
  uraiPilihanPenuh,
  uraiPilihanSebagian,
  type SetPilihan,
} from './penulis-pecah.ts';
import { validasiDraf } from './validasi.ts';

const SUDUT: Record<number, string> = { 1: 'susp-2025-12-10', 2: 'naik-2025-11-26-2025-12-09', 3: 'rups-2025-09-25' };
const gaya = { nada: 'yakin' as const, contoh: [] };

function bahan(no: number): { kunci: ReturnType<typeof kunciSudut>; bank: ReturnType<typeof bankPengecoh>; huruf: KunciOpsi; set: SetPilihan } {
  const kunci = kunciSudut(PAKET_T, SUDUT[no] as string);
  const bank = bankPengecoh(PAKET_T, SUDUT[no] as string);
  const huruf = hurufKunciKode('tirt', no);
  const set = susunHuruf(TULISAN[no]?.pilihan ?? [], huruf) as SetPilihan;
  return { kunci, bank, huruf, set };
}

describe('label klaim dan huruf kunci ditetapkan kode', () => {
  it('enam pola label, masing-masing memuat Betul DAN Keliru; deterministik per paket', () => {
    expect(POLA_LABEL).toHaveLength(6);
    for (const p of POLA_LABEL) expect(p.includes('Betul') && p.includes('Keliru')).toBe(true);
    expect([1, 2, 3].map((no) => labelKode('tirt', no))).toEqual(['Keliru', 'Betul', 'Keliru']);
    for (const id of ['dada', 'ultj', 'tirt']) {
      const l = [1, 2, 3].map((no) => labelKode(id, no));
      expect(l).toContain('Betul');
      expect(l).toContain('Keliru');
    }
  });

  it('pilihan bersumber "kunci" ditempatkan di huruf kunci kode; pengecoh mengisi huruf lain berurutan', () => {
    const set = susunHuruf(TULISAN[1]?.pilihan ?? [], 'c') as SetPilihan;
    expect(set.c.sumber).toBe('kunci');
    expect([set.a.sumber, set.b.sumber, set.d.sumber]).toEqual(['P3', 'P1', 'P4']);
    expect(susunHuruf([{ teks: 'x', sumber: 'P1' }, { teks: 'y', sumber: 'P2' }, { teks: 'z', sumber: 'P3' }, { teks: 'w', sumber: 'P4' }], 'a')).toBeNull();
  });
});

describe('panggilan 1 — pesan dari fakta sudut saja', () => {
  it('KELIRU: fakta sudut + daftar salah kaprah dari bank; paket lengkap TIDAK dikirim', () => {
    const { kunci, bank } = bahan(1);
    const p = pesanTulisPesan({ paket: PAKET_T, no: 1, label: 'Keliru', kunci, bank, namaLain: [], gaya });
    const isi = p[1]?.content ?? '';
    expect(isi).toContain('KELIRU');
    expect(isi).toContain(`FAKTA SUDUT (yang akan dicek pemain): susp-2025-12-10`);
    for (const k of bank) expect(isi).toContain(`${k.id} | ${k.jenis}`);
    // Fakta paket yang bukan sudut dan bukan kandidat bank tidak dikirim.
    const dipakai = new Set([kunci.fact_id, ...bank.map((k) => k.fact_id)]);
    for (const f of PAKET_T.fakta) if (!dipakai.has(f.fact_id)) expect(isi).not.toContain(f.fact_id);
    expect(isi).not.toContain('PAKET FAKTA');
    expect(p[0]?.content).toContain('PENULIS PESAN');
  });

  it('BETUL: tanpa daftar salah kaprah; hanya fakta sudut', () => {
    const { kunci, bank } = bahan(2);
    const isi = pesanTulisPesan({ paket: PAKET_T, no: 2, label: 'Betul', kunci, bank, namaLain: ['Sari'], gaya })[1]?.content ?? '';
    expect(isi).not.toContain('Salah kaprah yang boleh');
    expect(isi).not.toContain('harga-2025-12-08');
    expect(isi).toContain('"Sari"');
  });

  it('urai pesan: klaim_dari "null" = null; andaian ikut terbaca (ditolak G-ikatan)', () => {
    expect(uraiPesan(JSON.stringify({ ...TULISAN[2]?.pesan, klaim_dari: 'null' }))?.klaim_dari).toBeNull();
    expect(uraiPesan('{"nama": "A"}')).toBeNull();
    expect(uraiPesan(JSON.stringify({ nama: 'A', jam: '19.00', pesan: 'x 22', angka_pesan: [{ teks: '22', andaian: true }] }))?.angka_pesan[0]).toEqual({ teks: '22', andaian: true });
  });
});

describe('panggilan 2 — pilihan dari bank', () => {
  it('menerima pesan jadi, kunci (fakta sudut), dan bank; tanpa penjelasan', () => {
    const { kunci, bank } = bahan(1);
    const pesan = TULISAN[1]?.pesan;
    const isi = pesanTulisPilihan({ paket: PAKET_T, no: 1, label: 'Keliru', kunci, bank, pesan: pesan as never })[1]?.content ?? '';
    expect(isi).toContain(pesan?.pesan ?? '?');
    expect(isi).toContain('KUNCI: label "Keliru,"');
    expect(isi).toContain('BANK PENGECOH');
    expect(isi).toContain('P3 | alasan-lain');
    expect(isi).toContain('← klaim teman');
    expect(isi).not.toContain('Salah-kaprah yang umum');
  });

  it('perbaikan sebagian: huruf lain dikunci, keluaran hanya huruf yang diminta', () => {
    const { kunci, bank, huruf, set } = bahan(1);
    const isi = pesanTulisPilihan({ paket: PAKET_T, no: 1, label: 'Keliru', kunci, bank, pesan: TULISAN[1]?.pesan as never, sebelumnya: { pilihan: set, kunci: huruf }, tulis: ['b'] })[1]?.content ?? '';
    expect(isi).toContain('TULIS ULANG HANYA huruf: b');
    expect(isi).toContain('{"pilihan": {"b": {"teks": "...", "sumber": "P…"}}}');
    expect(uraiPilihanSebagian('{"pilihan": {"b": {"teks": "Betul, x.", "sumber": "P5"}, "a": {"teks": "y", "sumber": "P2"}}}', ['b'])).toEqual({ b: { teks: 'Betul, x.', sumber: 'P5' } });
    expect(uraiPilihanSebagian('{"pilihan": {"a": {"teks": "y", "sumber": "P2"}}}', ['b'])).toBeNull();
    expect(uraiPilihanPenuh(JSON.stringify({ pilihan: TULISAN[1]?.pilihan }))).toHaveLength(4);
  });
});

describe('perakitan + panggilan 3 — kartu dari kode, penjelasan sesudah soal jadi', () => {
  it('kartu: fakta sudut (penentu), klaim teman, fakta pengecoh; 2–4; draf rakitan lolos validator', () => {
    const omongan = [1, 2, 3].map((no) => {
      const { kunci, bank, huruf, set } = bahan(no);
      const t = TULISAN[no];
      return rakitOmongan(PAKET_T, kunci, t?.pesan as never, set, huruf, bank, t?.penjelasan ?? '');
    });
    expect(omongan[0]?.kartu).toEqual(['susp-2025-12-10', 'susp-2025-01-21', 'rups-2025-09-25']);
    expect(omongan[0]?.kartu_penentu).toEqual(['susp-2025-12-10']);
    expect(omongan[1]?.kartu[0]).toBe('naik-2025-11-26-2025-12-09');
    for (const o of omongan) expect(o.kartu.length).toBeGreaterThanOrEqual(2);
    expect(validasiDraf({ omongan }, PAKET_T)).toEqual([]);
    const { kunci, bank, huruf, set } = bahan(1);
    expect(kartuKode(PAKET_T, kunci, TULISAN[1]?.pesan as never, set, huruf, bank)).toHaveLength(3);
  });

  it('pesan penjelasan memuat kartu dan kunci, tetapi bukan bank pengecoh', () => {
    const { kunci, bank, huruf, set } = bahan(1);
    const { penjelasan: _x, ...inti } = rakitOmongan(PAKET_T, kunci, TULISAN[1]?.pesan as never, set, huruf, bank, '');
    void _x;
    const isi = pesanTulisPenjelasan(PAKET_T, inti)[1]?.content ?? '';
    expect(isi).toContain('Kartu 1 (susp-2025-12-10) [menentukan jawaban]');
    expect(isi).toContain(`KUNCI: ${huruf})`);
    expect(isi).not.toContain('BANK PENGECOH');
  });
});

describe('G-ikatan — pilihan benar-benar memakai bank', () => {
  it('tulisan fixture terikat', () => {
    for (const no of [1, 2, 3]) {
      const { kunci, bank, huruf, set } = bahan(no);
      expect(gIkatan(TULISAN[no]?.pesan as never, set, huruf, labelKode('tirt', no), kunci, bank)).toEqual([]);
    }
  });

  it('menolak pengecoh karangan: sumber bukan bank, kandidat dipakai dua kali, tidak memakai nilainya, [[misal|…]], rujukan fakta lain', () => {
    const { kunci, bank, huruf, set } = bahan(2);
    const pesan = TULISAN[2]?.pesan as never;
    const cek = (ubah: Partial<SetPilihan>): string[] => gIkatan(pesan, { ...set, ...ubah }, huruf, 'Betul', kunci, bank).map((b) => `${b.lokasi}: ${b.alasan}`);
    const lain = (['a', 'b', 'c'] as const).filter((h) => h !== huruf);
    const h0 = lain[0] as KunciOpsi;
    const h1 = lain[1] as KunciOpsi;
    expect(cek({ [h0]: { teks: 'Keliru, bursa tidak pernah mencatatnya.', sumber: 'karangan' } }).join()).toMatch(/bersumber satu label bank/);
    expect(cek({ [h0]: { ...set[h1] } }).join()).toMatch(/sudah dipakai pilihan/);
    expect(cek({ [h0]: { teks: 'Keliru, itu cuma angka acak.', sumber: set[h0].sumber } }).join()).toMatch(/tidak memakai nilai kandidat/);
    expect(cek({ [h0]: { teks: `Keliru, naiknya [[misal|22 kali]] ${set[h0].teks.slice(7)}`, sumber: set[h0].sumber } }).join()).toMatch(/misal/);
    expect(cek({ [h0]: { teks: `${set[h0].teks} [[volume-2025-11-26|178.100 lembar]]`, sumber: set[h0].sumber } }).join()).toMatch(/di luar kandidat/);
    // Kunci: label harus = label kode, dan memakai nilai sudut.
    expect(cek({ [huruf]: { teks: 'Keliru, itu kenaikan sampai [[naik-2025-11-26-2025-12-09|9 Desember]].', sumber: 'kunci' } }).join()).toMatch(/label pilihan kunci/);
    expect(cek({ [huruf]: { teks: 'Betul, itu memang kenaikannya.', sumber: 'kunci' } }).join()).toMatch(/tidak memakai nilai fakta sudut/);
  });

  it('pesan KELIRU harus memakai salah kaprah dari bank; angka andaian ditolak; pesan BETUL tanpa klaim_dari', () => {
    const b1 = bahan(1);
    const p1 = TULISAN[1]?.pesan as NonNullable<(typeof TULISAN)[1]>['pesan'];
    const cek1 = (x: object): string => gIkatan({ ...p1, ...x } as never, b1.set, b1.huruf, 'Keliru', b1.kunci, b1.bank).map((b) => b.alasan).join();
    expect(cek1({ klaim_dari: null })).toMatch(/harus memakai satu label salah kaprah/);
    expect(cek1({ klaim_dari: 'P99' })).toMatch(/harus memakai satu label salah kaprah/);
    expect(cek1({ pesan: 'Hari ini sahamnya disetop, entah kenapa.' })).toMatch(/tidak menyebut nilai salah kaprah P3/);
    expect(cek1({ angka_pesan: [{ teks: '22', andaian: true }] })).toMatch(/andaian/);
    expect(cek1({ angka_pesan: [{ teks: '22', fact_id: 'naik-2025-11-26-2025-12-09', andaian: true }] })).toMatch(/andaian/);
    const b2 = bahan(2);
    const p2 = TULISAN[2]?.pesan as NonNullable<(typeof TULISAN)[2]>['pesan'];
    expect(gIkatan({ ...p2, klaim_dari: 'P1' } as never, b2.set, b2.huruf, 'Betul', b2.kunci, b2.bank).map((b) => b.alasan).join()).toMatch(/klaim BETUL/);
    expect(gIkatan({ ...p2, angka_pesan: [] } as never, b2.set, b2.huruf, 'Betul', b2.kunci, b2.bank).map((b) => b.alasan).join()).toMatch(/tidak menyebut isi fakta sudut/);
  });
});
