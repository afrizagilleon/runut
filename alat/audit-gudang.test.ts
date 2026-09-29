import { describe, expect, it } from 'vitest';
import type { Temuan } from '../factory/skema/tipe.ts';
import { jumlahAturan } from '../factory/gudang.ts';
import {
  MAKS_UJI,
  aturanDibantah,
  bacaKalimatAwam,
  kesepakatan,
  pilihUjiUlang,
  susunAudit,
  susunLaporan,
  type GudangMentah,
  type HasilPenguji,
  type HasilPengujiM4b,
  type PemeriksaanMentah,
} from './audit-gudang.ts';

function temuan(id: string, keparahan?: 'konflik' | 'peringatan' | 'catatan'): Temuan {
  const t: Temuan = { temuan_id: id, aturan: 'R7', ringkasan: `ringkasan ${id}`, angka: [], fakta_terkait: [], rujukan: [] };
  if (keparahan !== undefined) t.keparahan = keparahan;
  return t;
}

function pem(aturan: string, satuan: string, diperiksa: number, merah: number, t: Temuan[]): PemeriksaanMentah {
  return {
    aturan: aturan as PemeriksaanMentah['aturan'],
    judul: aturan,
    dijalankan: true,
    hitungan: { satuan, diperiksa, hijau: diperiksa - merah, merah, tidak_lengkap: 0, dilewati: 0 },
    temuan: t.map((x) => ({ ...x, aturan: aturan as Temuan['aturan'] })),
  };
}

const GUDANG: GudangMentah = {
  ringkasan_gudang: { berkas: 5, emiten: 4 },
  berkas_paginasi_kosong: ['X-m4a-filings-p0.json'],
  agregat: [
    { aturan: 'R7', judul: 'R7', satuan: 'sisi laporan' },
    { aturan: 'R19a', judul: 'R19a', satuan: 'hari datar' },
  ],
  emiten: [
    {
      simbol: 'AAAA',
      berkas: ['a.json'],
      jumlah: { laporan: 10, harga: 100, suspensi: 1 },
      pemeriksaan: [pem('R7', 'sisi laporan', 20, 2, [temuan('a1'), temuan('a2')]), pem('R19a', 'hari datar', 5, 5, [temuan('a3', 'peringatan')])],
    },
    {
      simbol: 'BBBB',
      berkas: ['b.json'],
      jumlah: { laporan: 4, harga: 50, suspensi: 0 },
      pemeriksaan: [pem('R7', 'sisi laporan', 8, 0, []), pem('R19a', 'hari datar', 0, 0, [])],
    },
    {
      simbol: 'LAMA',
      berkas: ['l.json'],
      jumlah: { laporan: 7, harga: 70, suspensi: 0 },
      pemeriksaan: [pem('R7', 'sisi laporan', 14, 1, [temuan('l1')])],
    },
    {
      simbol: 'LAIN',
      berkas: ['suspensions-all.json'],
      jumlah: { laporan: 0, harga: 0, suspensi: 1 },
      pemeriksaan: [pem('R7', 'sisi laporan', 99, 99, [temuan('x1')])],
    },
  ],
};
const RENCANA = { gudang_lama: ['LAMA'], kelompok_suspensi: ['AAAA'], kelompok_pembanding: ['BBBB'] };
const KALIMAT = bacaKalimatAwam(
  '# x\n\n### R7 — Persen\n\nKami menolak kartu kalau persen tidak cocok.\n\nDiperiksa ...\n\n### R19a — Datar\n\nKami menandai hari datar.\n',
);

describe('audit gudang — angka per kelompok dengan penyebut', () => {
  const audit = susunAudit(GUDANG, RENCANA, KALIMAT);

  it('membaca kalimat awam dari aturan-gudang.md', () => {
    expect(KALIMAT.get('R7')).toEqual({ judul: 'Persen', kalimat: 'Kami menolak kartu kalau persen tidak cocok.' });
  });

  it('memisah kelompok dan tidak menghitung emiten di luar rencana', () => {
    const r7 = audit.aturan.find((a) => a.aturan === 'R7')!;
    expect(r7.per.suspensi).toMatchObject({ diperiksa: 20, merah: 2, emiten_diperiksa: 1, emiten_merah: ['AAAA'], temuan: 2 });
    expect(r7.per.pembanding).toMatchObject({ diperiksa: 8, merah: 0, emiten_diperiksa: 1, emiten_merah: [] });
    expect(r7.per.lama).toMatchObject({ diperiksa: 14, merah: 1 });
    expect(audit.penyebut.suspensi).toMatchObject({ emiten: 1, laporan: 10, harga: 100, suspensi: 1 });
  });

  it('emiten berkonflik hanya dari aturan penolak berkeparahan konflik', () => {
    expect(audit.emiten_konflik.suspensi).toEqual([{ simbol: 'AAAA', aturan: ['R7'] }]);
    expect(audit.emiten_konflik.pembanding).toEqual([]);
    expect(audit.emiten_konflik.lama).toEqual([{ simbol: 'LAMA', aturan: ['R7'] }]);
  });

  it('temuan yang boleh diuji ulang hanya dari 42 emiten audit, bukan gudang lama', () => {
    expect(audit.temuan_audit.map((c) => c.simbol).sort()).toEqual(['AAAA', 'AAAA', 'AAAA']);
  });
});

describe('D-5 pemilihan uji ulang', () => {
  it('deterministik, ≤ 30, ≤ 3 per aturan, tiap aturan bertemuan dapat satu', () => {
    const audit = susunAudit(GUDANG, RENCANA, KALIMAT);
    const a = pilihUjiUlang(audit);
    const b = pilihUjiUlang(audit);
    expect(a).toEqual(b);
    expect(a.filter((c) => c.aturan === 'R19a')).toHaveLength(1);
    expect(a.filter((c) => c.aturan === 'R7')).toHaveLength(2); // penolak mendapat sisa tempat
  });

  it('dengan banyak aturan: batas 30 dan 3 per aturan, penanda hanya satu', () => {
    const agregat: GudangMentah['agregat'] = [];
    const pemeriksaan: PemeriksaanMentah[] = [];
    const kode = ['R7', 'R14', 'R17B', 'R15', 'R11a', 'R13', 'R23', 'R31', 'R35', 'R25'];
    const penandaKode = ['R12', 'R22', 'R20', 'R32', 'R21', 'R33', 'R11b', 'R16', 'R19a', 'R19b', 'R18a', 'R26', 'R27', 'R28', 'R34'];
    for (const k of [...kode, ...penandaKode]) {
      agregat.push({ aturan: k as PemeriksaanMentah['aturan'], judul: k, satuan: 's' });
      pemeriksaan.push(pem(k, 's', 10, 5, Array.from({ length: 5 }, (_, i) => temuan(`${k}-${i}`))));
    }
    const g: GudangMentah = {
      ...GUDANG,
      agregat,
      emiten: [{ simbol: 'AAAA', berkas: [], jumlah: { laporan: 0, harga: 0, suspensi: 0 }, pemeriksaan }],
    };
    const pilih = pilihUjiUlang(susunAudit(g, RENCANA, KALIMAT));
    expect(pilih).toHaveLength(MAKS_UJI);
    for (const k of [...kode, ...penandaKode]) {
      const n = pilih.filter((c) => c.aturan === k).length;
      expect(n, k).toBeGreaterThanOrEqual(1);
      expect(n, k).toBeLessThanOrEqual(penandaKode.includes(k) ? 1 : 3);
    }
  });
});

describe('laporan', () => {
  const audit = susunAudit(GUDANG, RENCANA, KALIMAT);
  const penguji: HasilPenguji = {
    keterangan: '',
    uji: [
      { id: 'U01', aturan: 'R7', simbol: 'AAAA', kelompok: 'suspensi', temuan_id: 'a1', sebelum: 'ya', penyelidikan: null, sesudah: 'ya' },
      { id: 'U02', aturan: 'R7', simbol: 'AAAA', kelompok: 'suspensi', temuan_id: 'a2', sebelum: 'tidak', penyelidikan: 'bug', sesudah: 'hilang' },
      { id: 'U03', aturan: 'R19a', simbol: 'AAAA', kelompok: 'suspensi', temuan_id: 'a3', sebelum: 'tidak', penyelidikan: 'x', sesudah: 'tidak' },
    ],
  };

  it('dua kali susun = teks sama', () => {
    const m = { kredit: null, penguji, pilihan: pilihUjiUlang(audit) };
    expect(susunLaporan(audit, m)).toBe(susunLaporan(audit, m));
  });

  it('kesepakatan sebelum dan sesudah; temuan hilang keluar dari penyebut sesudah', () => {
    expect(kesepakatan(penguji, 'sebelum')).toMatchObject({ diuji: 3, ya: 1, tidak: 2 });
    expect(kesepakatan(penguji, 'sesudah')).toMatchObject({ diuji: 2, ya: 1, tidak: 1, hilang: 1 });
  });

  it('aturan yang masih dibantah tidak masuk kalimat yang boleh dipakai', () => {
    expect([...aturanDibantah(penguji)]).toEqual(['R19a']);
    const teks = susunLaporan(audit, { kredit: null, penguji, pilihan: [] });
    const bagian = teks.split('## Kalimat yang boleh dipakai')[1] ?? '';
    expect(bagian).toContain('- R7: "Dari 28 sisi laporan di 2 emiten yang bisa diperiksa, 2 bertentangan');
    expect(bagian).not.toMatch(/- R19a:/);
  });

  it('tanpa hasil penguji: kalimat belum boleh dipakai', () => {
    const teks = susunLaporan(audit, { kredit: null, penguji: null, pilihan: [] });
    expect(teks.split('## Kalimat yang boleh dipakai')[1]).toContain('menunggu uji ulang');
  });

  it('M4b: jawaban "tidak" pada uji ulang M4b membuat aturannya tidak boleh dikutip', () => {
    const m4b: HasilPengujiM4b = {
      keterangan: '',
      uji: [
        { id: 'B01', aturan: 'R7', simbol: 'AAAA', temuan_id: 'a1', tahap: 'x', jawaban: 'tidak', penyelidikan: 'bug' },
      ],
    };
    expect([...aturanDibantah(penguji, m4b)].sort()).toEqual(['R19a', 'R7']);
    const teks = susunLaporan(audit, { kredit: null, penguji, pilihan: [], penguji_m4b: m4b });
    expect(teks.split('## Kalimat yang boleh dipakai')[1]).not.toMatch(/- R7:/);
    expect(teks).toContain('### Uji ulang M4b');
    expect(teks).toContain('| B01 | R7 | AAAA | x | tidak |');
  });

  it('M4b: jumlah aturan aktif dihitung dari ATURAN_V2, dan aturan baru tidak lagi "ditahan D-7"', () => {
    const teks = susunLaporan(audit, { kredit: null, penguji: null, pilihan: [] });
    expect(teks).toContain(jumlahAturan());
    expect(jumlahAturan()).toContain('**33 aturan aktif**');
    expect(teks).toContain('## Aturan baru M4b');
    expect(teks).not.toContain('D-6 ditahan D-7');
    expect(teks).not.toContain('tidak ditangkap 31 aturan');
  });

  it('menulis keterbatasan sampel dan temuan R25 lintas-emiten', () => {
    const teks = susunLaporan(audit, { kredit: null, penguji: null, pilihan: [] });
    expect(teks).toContain('Bukan sampel acak seluruh bursa');
    expect(teks).toContain('AADI–CASH');
    expect(teks).toContain('R25 menghitung respons kosong milik emiten lain');
    expect(teks).toContain('diperbaiki di M3.13');
    expect(teks).toContain('Usulan perbaikan yang belum diterapkan');
  });
});
