// D-8 — prompt lengan A dan S harus identik kata per kata kecuali blok aturan.

import { describe, it, expect } from 'vitest';
import { promptLengan, isiAturan } from './prompt.ts';

describe('prompt lengan A dan S', () => {
  const a = promptLengan('A');
  const s = promptLengan('S');

  it('berbeda hanya pada satu blok sisipan', () => {
    // Semua baris A harus ada di S dengan urutan yang sama; satu-satunya
    // perbedaan adalah baris yang DITAMBAHKAN di S.
    const barisA = a.split('\n');
    const barisS = s.split('\n');
    let i = 0;
    const ditambahkan: string[] = [];
    for (const baris of barisS) {
      if (i < barisA.length && barisA[i] === baris) i++;
      else ditambahkan.push(baris);
    }
    expect(i, 'setiap baris prompt A harus muncul di prompt S dengan urutan sama').toBe(barisA.length);
    expect(ditambahkan.join('\n')).toContain('R1 — Aritmetika per laporan');
    expect(ditambahkan.join('\n')).toContain('R10 — Hari tanpa volume');
  });

  it('memuat isi docs/aturan-verifikasi.md apa adanya hanya di lengan S', () => {
    const aturan = isiAturan();
    expect(s).toContain(aturan);
    expect(a).not.toContain(aturan);
  });

  it('tidak menambahkan apa pun di lengan S selain aturan dan satu kalimat pengantarnya', () => {
    // Semua baris berisi yang ditambahkan di S harus berasal dari berkas
    // aturan, kecuali tepat satu kalimat pengantar. Tidak ada instruksi lain
    // yang diselipkan ke salah satu lengan.
    const barisAturan = new Set(isiAturan().split('\n').map((b) => b.trim()).filter((b) => b.length > 0));
    const barisA = a.split('\n');
    let i = 0;
    const tambahan: string[] = [];
    for (const baris of s.split('\n')) {
      if (i < barisA.length && barisA[i] === baris) i++;
      else if (baris.trim().length > 0) tambahan.push(baris.trim());
    }
    const diLuarAturan = tambahan.filter((b) => !barisAturan.has(b));
    expect(diLuarAturan).toHaveLength(1);
    expect(diLuarAturan[0]).toContain('Sebelum memakai sebuah angka');
  });

  it('menyebut emiten dan tanggal T yang sama di kedua lengan', () => {
    for (const p of [a, s]) {
      expect(p).toContain('FOLK');
      expect(p).toContain('2025-10-07');
    }
  });

  it('meminta keluaran JSON dengan skema yang sama di kedua lengan', () => {
    for (const p of [a, s]) {
      expect(p).toContain('"skema_versi": 1');
      expect(p).toContain('fakta_terlihat');
      expect(p).toContain('pembukaan');
      expect(p).toContain('temuan');
    }
  });
});
