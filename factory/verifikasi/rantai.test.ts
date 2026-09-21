/**
 * M2a T-06 (RQ-04, RQ-05): R14 rantai putus dan R16 jam terbit.
 *
 * Yang dijaga selain merah dan hijau: satu cacat data tidak boleh melahirkan
 * dua temuan berkeparahan konflik, dan urutan gerbang (R12 lalu R22) memang
 * mengubah jawabannya.
 */
import { describe, expect, it } from 'vitest';
import { pasanganRantai, r14RantaiPutus, r16JamTerbit } from './aturan-v2.ts';
import { dataEmiten, konteks, laporan } from './contoh.ts';
import { keparahanTemuan } from '../skema/tipe.ts';
import type { BerkasLaporan, DataEmiten, KonteksGudang, Laporan, Paginasi } from './tipe.ts';

const PAGINASI: Paginasi = {
  total_count: 3,
  showing: 3,
  limit: 30,
  offset: 0,
  has_next: false,
  has_previous: false,
};

const dataRantai = (laporanDaftar: Laporan[], berkas_laporan: BerkasLaporan[]): DataEmiten =>
  dataEmiten({ simbol: 'AA', laporan: laporanDaftar, berkas_laporan });

function konteksRantai(
  laporanDaftar: Laporan[],
  paginasi: Partial<Paginasi> = {},
): KonteksGudang {
  const berkas: BerkasLaporan[] = [
    { berkas: 'aa-filings.json', simbol: 'AA', paginasi: { ...PAGINASI, ...paginasi }, baris: laporanDaftar.length },
  ];
  return {
    ...konteks({ laporan: laporanDaftar, simbol: 'AA' }),
    data: dataRantai(laporanDaftar, berkas),
    berkas_kosong: [],
  };
}

const lk = (tanggal: string) => `https://idx/From_KSEI/LK-${tanggal}-0001-00.pdf-0.pdf`;

function sambung(
  id: string,
  waktu: string,
  sebelum: number,
  sesudah: number,
  ubah: Partial<Laporan> = {},
): Laporan {
  return laporan({
    laporan_id: id,
    pemegang: 'PT Contoh Sejahtera Tbk',
    dilaporkan_pada: waktu,
    sumber_dokumen: lk(waktu.slice(8, 10) + waktu.slice(5, 7) + waktu.slice(0, 4)),
    sebelum,
    sesudah,
    jumlah: Math.abs(sesudah - sebelum),
    ...ubah,
  });
}

describe('R14 — rantai kepemilikan putus', () => {
  it('hijau untuk rantai yang saldonya nyambung', () => {
    const h = r14RantaiPutus(
      konteksRantai([
        sambung('a', '2026-01-05T10:00:00', 1000, 900),
        sambung('b', '2026-01-06T10:00:00', 900, 800),
      ]),
    );
    expect(h.hitungan.diperiksa).toBe(1);
    expect(h.hitungan.merah).toBe(0);
  });

  it('merah kalau ada lembar yang berpindah tanpa laporan', () => {
    const h = r14RantaiPutus(
      konteksRantai([
        sambung('a', '2026-01-05T10:00:00', 1000, 900),
        sambung('b', '2026-01-06T10:00:00', 850, 800),
      ]),
    );
    expect(h.hitungan.merah).toBe(1);
    expect(keparahanTemuan(h.temuan[0]!)).toBe('konflik');
    expect(h.temuan[0]?.ringkasan).toContain('50 lembar yang berkurang');
  });

  it('menyatukan dua ejaan satu pemegang, jadi rantainya tidak pecah dua', () => {
    const h = r14RantaiPutus(
      konteksRantai([
        sambung('a', '2026-01-05T10:00:00', 1000, 900, { pemegang: 'PT Estika Tata Tiara Tbk' }),
        sambung('b', '2026-01-06T10:00:00', 900, 800, { pemegang: 'Estika Tata Tiara' }),
      ]),
    );
    // Tanpa normalisasi R22, keduanya jadi dua rantai satu laporan dan tidak
    // ada sambungan yang diperiksa sama sekali.
    expect(h.hitungan.diperiksa).toBe(1);
    expect(h.hitungan.merah).toBe(0);
  });

  it('memakai kunci R12, sehingga pangkal rantai tidak terjebak di tengah', () => {
    // Pola uji lawan 2.2: laporan ber-`sebelum` 0 adalah pangkal, tetapi jam
    // terbitnya menaruhnya sesudah laporan berikutnya.
    const pangkal = sambung('pangkal', '2026-05-22T07:19:00', 0, 1000, {
      sumber_dokumen: lk('20052026'),
    });
    const lanjutan = sambung('lanjutan', '2026-05-21T10:00:00', 1000, 1200, {
      sumber_dokumen: lk('21052026'),
    });
    const h = r14RantaiPutus(konteksRantai([lanjutan, pangkal]));
    expect(h.hitungan.diperiksa).toBe(1);
    expect(h.hitungan.merah).toBe(0);
    // Urutan menurut jam terbit akan memberi putus rantai palsu.
    const urutJam = [lanjutan, pangkal].sort((a, b) =>
      a.dilaporkan_pada.localeCompare(b.dilaporkan_pada),
    );
    expect(urutJam[0]?.laporan_id).toBe('lanjutan');
  });

  it('dilewati dengan alasan kalau R25 menemukan halaman yang menggantung', () => {
    const h = r14RantaiPutus(
      konteksRantai(
        [sambung('a', '2026-01-05T10:00:00', 1000, 900), sambung('b', '2026-01-06T10:00:00', 850, 800)],
        { has_next: true, total_count: 40 },
      ),
    );
    expect(h.dijalankan).toBe(false);
    expect(h.hitungan.merah).toBe(0);
    expect(h.alasan_lewat).toContain('menggantung');
    expect(h.hitungan.dilewati).toBe(1);
  });
});

describe('R16 — jam terbit tidak searah dengan rantai saldo', () => {
  /**
   * Pola RLCO 2026-06-11 (usulan R16): laporan pukul 16:01 mulai dari saldo
   * yang baru dihasilkan laporan pukul 16:53. Pasangan ini **juga** putus
   * rantainya, jadi ia masuk ke jalur gabungan R14.
   */
  const polaRlco = (): Laporan[] => [
    sambung('r1', '2026-06-11T16:53:00', 113_624_900, 142_663_500),
    sambung('r2', '2026-06-11T16:01:00', 142_663_500, 147_086_300),
  ];

  it('merah, berkeparahan peringatan, dan menyebut jam bukan hari', () => {
    // Saldo tetap nyambung (900 -> 900), tetapi laporan yang terbit lebih dulu
    // sudah memuat saldo 1000 yang baru dihasilkan laporan berikutnya.
    const h = r16JamTerbit(
      konteksRantai([
        sambung('a', '2026-01-05T16:01:00', 1000, 900),
        sambung('b', '2026-01-06T16:53:00', 900, 1000),
      ]),
    );
    expect(h.hitungan.merah).toBe(1);
    const temuan = h.temuan.find((t) => t.temuan_id.startsWith('R16-a'));
    expect(temuan?.keparahan).toBe('peringatan');
    expect(temuan?.ringkasan).toContain('16:01');
    expect(temuan?.ringkasan).toContain('16:53');
  });

  it('menangkap pola RLCO 2026-06-11 dan menggabungkannya dengan R14', () => {
    const daftar = polaRlco();
    const r16 = r16JamTerbit(konteksRantai(daftar));
    const r14 = r14RantaiPutus(konteksRantai(daftar));
    expect(r16.hitungan.merah).toBe(1);
    expect(r14.hitungan.merah).toBe(1);
    expect(r16.temuan.filter((t) => t.keparahan === 'peringatan')).toHaveLength(0);
    expect(r16.temuan.find((t) => t.keparahan === 'catatan')?.angka[0]?.nilai).toBe(1);
  });

  it('hijau untuk rantai yang naik searah waktu', () => {
    const h = r16JamTerbit(
      konteksRantai([
        sambung('a', '2026-01-05T10:00:00', 1000, 1100),
        sambung('b', '2026-01-06T10:00:00', 1100, 1200),
      ]),
    );
    expect(h.hitungan.diperiksa).toBe(1);
    expect(h.hitungan.merah).toBe(0);
  });

  it('menangkap juga dua laporan yang saldo awalnya sama persis', () => {
    const h = r16JamTerbit(
      konteksRantai([
        sambung('a', '2026-01-05T10:00:00', 1000, 1100),
        sambung('b', '2026-01-05T11:00:00', 1000, 1200),
      ]),
    );
    expect(h.hitungan.merah).toBe(1);
  });

  it('RQ-05: satu cacat data tidak melahirkan dua temuan berkeparahan konflik', () => {
    // Pasangan yang putus rantai DAN jam terbitnya bertabrakan.
    const daftar = [
      sambung('a', '2026-01-05T11:00:00', 1000, 900),
      sambung('b', '2026-01-06T10:00:00', 1000, 800),
    ];
    const r14 = r14RantaiPutus(konteksRantai(daftar));
    const r16 = r16JamTerbit(konteksRantai(daftar));

    expect(r14.hitungan.merah).toBe(1);
    expect(r16.hitungan.merah).toBe(1);

    const konflik = [...r14.temuan, ...r16.temuan].filter((t) => keparahanTemuan(t) === 'konflik');
    expect(konflik).toHaveLength(1);
    expect(konflik[0]?.aturan).toBe('R14');
    // Sebab keduanya disebut dalam satu kalimat.
    expect(konflik[0]?.ringkasan).toContain('tanpa laporan');
    expect(konflik[0]?.ringkasan).toContain('urutan terbitnya');
    // R16 tetap menghitungnya, dan mengatakan ia digabung.
    const catatan = r16.temuan.find((t) => t.keparahan === 'catatan');
    expect(catatan?.angka[0]?.nilai).toBe(1);
  });
});

describe('pasanganRantai — urutan gerbang', () => {
  it('menyusun pasangan per pemegang, bukan per berkas', () => {
    const pasangan = pasanganRantai([
      sambung('a1', '2026-01-05T10:00:00', 1000, 900, { pemegang: 'Alfa' }),
      sambung('b1', '2026-01-05T11:00:00', 500, 400, { pemegang: 'Beta' }),
      sambung('a2', '2026-01-06T10:00:00', 900, 800, { pemegang: 'Alfa' }),
      sambung('b2', '2026-01-06T11:00:00', 400, 300, { pemegang: 'Beta' }),
    ]);
    // Empat laporan, dua pemegang: dua sambungan, bukan tiga. Pemegang yang
    // berbeda tidak pernah disambungkan satu sama lain.
    expect(pasangan).toHaveLength(2);
    expect(pasangan.map((p) => p.pemegang)).toEqual(['Alfa', 'Beta']);
    expect(pasangan.map((p) => p.sekarang.laporan_id)).toEqual(['a2', 'b2']);
  });

  it('memberi urutan yang sama di dua kali panggil (INV-C)', () => {
    const daftar = [
      sambung('a', '2026-01-06T10:00:00', 900, 800),
      sambung('b', '2026-01-05T10:00:00', 1000, 900),
    ];
    const satu = pasanganRantai(daftar).map((p) => p.sekarang.laporan_id);
    const dua = pasanganRantai([...daftar].reverse()).map((p) => p.sekarang.laporan_id);
    expect(satu).toEqual(dua);
  });
});
