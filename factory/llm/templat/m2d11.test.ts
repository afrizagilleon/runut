/**
 * Mesin templat M2d-11 (T-04, pra-registrasi §5), model dipalsukan:
 * urutan gerbang kode+detektor → tebak rotasi (24) → kartu r0+r2 → kritikus;
 * label pengecoh divalidasi dari proposisi (sabotase label salah → merah);
 * umpan balik tersimpan; pola tanpa label sah tidak dipakai; varian awal bersih
 * detektor.
 */
import { describe, expect, it } from 'vitest';
import { AMBANG_M2D11 } from '../cacat/ambang.ts';
import { deteksi, menolak } from '../cacat/detektor.ts';
import { DEFINISI_PAKET, bangunPaket } from '../paket.ts';
import { hurufKunciKode } from '../posisi-kunci.ts';
import { lokasiDetektor } from './kode.ts';
import { LABEL_POLA, labelSlot, rencanaBerlabel, umpanBalik, validasiLabel, validasiUmpanBalik } from './label.ts';
import { calonRencanaM2d11, pilihVarianBersih, SETELAN_TEMPLAT_M2D11 } from './m2d11.ts';
import { jalankanTemplat } from './mesin.ts';
import { panggilTemplatPalsu } from './palsu.ts';
import { calonRencana } from './pilih.ts';
import { hurufSlot, rakitOmonganTemplat, SLOT } from './rakit.ts';
import { periksaKodeTemplat } from './kode.ts';

const TIRT = bangunPaket(DEFINISI_PAKET.tirt);

describe('label pengecoh', () => {
  const calon = calonRencana(TIRT);
  it('semua pola berlabel di TIRT punya label sah; benar-berincian tidak dipakai', () => {
    const m = calonRencanaM2d11(TIRT);
    expect(m.length).toBeGreaterThanOrEqual(4);
    expect(m.some((r) => r.pola === 'benar-berincian')).toBe(false);
    expect(LABEL_POLA['benar-berincian']).toBeNull();
    for (const r of m) {
      for (const s of (['p1', 'p2', 'p3'] as const)) {
        const l = labelSlot(r, s);
        expect(l).not.toBeNull();
        for (const v of r.slot.find((x) => x.slot === s)?.varian ?? []) expect(validasiLabel(l as NonNullable<typeof l>, v, r, TIRT)).toEqual([]);
      }
    }
  });
  it('sabotase: label yang tidak cocok isinya ditolak', () => {
    const r = calon.find((x) => x.pola === 'angka-lain-waktu');
    if (r === undefined) throw new Error('tidak ada angka-lain-waktu');
    const p2 = r.slot[2].varian[0];
    const p3 = r.slot[3].varian[0];
    if (p2 === undefined || p3 === undefined) throw new Error('varian');
    expect(validasiLabel({ jenis: 'salah-periode', rujukan: r.kartu[1] as string }, p3, r, TIRT)).not.toEqual([]);
    expect(validasiLabel({ jenis: 'percaya-otoritas', rujukan: r.sudut }, p3, r, TIRT)).not.toEqual([]);
    expect(validasiLabel({ jenis: 'nyaris-benar-angka', rujukan: r.sudut }, p2, r, TIRT)).not.toEqual([]);
    expect(validasiLabel({ jenis: 'sebagian-benar', rujukan: 'bukan-kartu' }, p3, r, TIRT)).not.toEqual([]);
    expect(validasiLabel({ jenis: 'salah-entitas', rujukan: r.kartu[1] as string }, p3, r, TIRT)).not.toEqual([]);
  });
  it('varian yang labelnya tidak sah dibuang (besaran-hitungan P2b)', () => {
    const r = calon.find((x) => x.pola === 'besaran-hitungan');
    if (r === undefined) return;
    const b = rencanaBerlabel(r, TIRT);
    expect(b.rencana?.slot[2].varian.map((v) => v.id)).toEqual(['P2a']);
  });
  it('umpan balik: kartu penentu, 3 pengecoh bernama + nomor kartu, pertanyaan cek; sabotase terdeteksi', () => {
    for (const r of calonRencanaM2d11(TIRT)) {
      const u = umpanBalik(r, TIRT, 'c');
      expect(validasiUmpanBalik(u, r)).toEqual([]);
      expect(u.per_pengecoh.map((x) => x.huruf)).toEqual(['a', 'b', 'd']);
      expect(validasiUmpanBalik({ ...u, pertanyaan_cek: 'Cek kartunya.' }, r)).not.toEqual([]);
      expect(validasiUmpanBalik({ ...u, per_pengecoh: u.per_pengecoh.map((x) => ({ ...x, kalimat: x.kalimat.replace(/kartu \d/, 'dokumen') })) }, r)).not.toEqual([]);
      expect(validasiUmpanBalik({ ...u, penentu: 'Yang menentukan: dokumen.' }, r)).not.toEqual([]);
    }
  });
});

describe('varian awal bersih detektor', () => {
  it('kombinasi terpilih tanpa bendera menolak dari pilihan saja (bila ada)', () => {
    for (const r of calonRencanaM2d11(TIRT)) {
      const hk = hurufKunciKode('tirt', 1);
      const p = pilihVarianBersih(r, hk);
      const peta = hurufSlot(hk);
      const pilihan = Object.fromEntries(SLOT.map((s) => [peta[s], p[s].teks])) as Record<'a' | 'b' | 'c' | 'd', string>;
      expect(menolak(deteksi({ pesan: '', pilihan, kunci: hk }, AMBANG_M2D11))).toEqual([]);
    }
  });
  it('lokasi bendera: D3/D4 → pesan, D8 → struktur, lainnya → pilihan', () => {
    expect(['D1', 'D2', 'D3', 'D4', 'D5', 'D8'].map(lokasiDetektor)).toEqual(['pilihan', 'pilihan', 'pesan', 'pesan', 'pilihan', 'struktur']);
  });
});

describe('lingkar M2d-11 (palsu)', () => {
  it('terbit: tiap versi lolos melewati kode → 24 tebak rotasi → 2 kartu → kritikus; umpan balik tersimpan', async () => {
    const p = panggilTemplatPalsu('tirt');
    const h = await jalankanTemplat({ paket: TIRT, panggil: p.panggil, setelan: SETELAN_TEMPLAT_M2D11, protokol: 'm2d11' });
    expect(h.lolos).toBe(true);
    expect(h.kunci).toHaveLength(3);
    for (const k of h.kunci) {
      expect(k.umpan_balik?.per_pengecoh).toHaveLength(3);
      expect(k.rencana.pola).not.toBe('benar-berincian');
    }
    for (const no of [1, 2, 3]) {
      const urut = p.log.filter((x) => x.omongan === no && x.jenis !== 'tulis-pesan' && x.jenis !== 'tulis-penjelasan').map((x) => x.jenis);
      expect(urut.slice(0, 24).every((j) => j === 'gerbang-tebak')).toBe(true);
      expect(urut.slice(24, 26)).toEqual(['gerbang-kartu', 'gerbang-kartu']);
      expect(urut[26]).toBe('kritikus');
    }
    for (const v of h.versi) {
      expect(v.rotasi?.jawaban).toHaveLength(24);
      expect(v.kartu_rotasi?.per_rotasi.map((x) => x.r)).toEqual([0, 2]);
    }
  });
  it('tebak rotasi gagal (selalu menyalin isi kunci) → ditolak di penebak, kartu & kritikus tidak dipanggil', async () => {
    const p = panggilTemplatPalsu('tirt', {
      rotasi: (_i, opsi) => {
        const kunciTeks = Object.values(opsi).find((t) => /^Keliru, (alasan resmi|penutupan|naiknya memang|harganya naik sampai)|^Betul, penutupan \d+ \S+ \d,\d+ kali/.test(t));
        return JSON.stringify({ teks: kunciTeks ?? opsi.a, alasan: 'x' });
      },
    });
    const h = await jalankanTemplat({ paket: TIRT, panggil: p.panggil, setelan: SETELAN_TEMPLAT_M2D11, protokol: 'm2d11', maksVersiRencana: 1 });
    expect(h.lolos).toBe(false);
    expect(h.distribusi.penebak).toBeGreaterThan(0);
    const o1 = p.log.filter((x) => x.omongan === 1);
    expect(o1.some((x) => x.jenis === 'kritikus')).toBe(false);
  });
});

describe('gerbang kode M2d-11', () => {
  it('detektor menolak di gerbang kode hanya bila protokol M2d-11 (kunci terpanjang → D1, lokasi pilihan)', () => {
    const r = calonRencanaM2d11(TIRT).find((x) => x.pola === 'angka-lain-waktu');
    if (r === undefined) throw new Error('tidak ada');
    const hk = hurufKunciKode('tirt', 1);
    const pilihan = pilihVarianBersih(r, hk);
    const tulisan = { nama: 'Sinta', jam: '19.20', pesan: 'Penutupan kemarin (9 Desember) Rp97, gw yakin.' };
    const o = rakitOmonganTemplat(r, pilihan, tulisan, '', hk);
    const panjang = { ...o, pilihan: { ...o.pilihan, [hk]: `${o.pilihan[hk].replace(/\.$/, '')}, jadi omongan teman itu memakai angka hari lain yang sudah lewat.` } };
    const arg = { no: 1, o: panjang, r, pilihan, tulisan, paket: TIRT, namaLain: [], gabung: [panjang, null, null], terkunci: new Set<number>() };
    const m = periksaKodeTemplat({ ...arg, m2d11: { ambang: AMBANG_M2D11 } });
    expect(m.menolak.some((x) => x.sumber.startsWith('detektor D1') && x.lokasi === 'pilihan')).toBe(true);
    expect(periksaKodeTemplat(arg).menolak.some((x) => x.sumber.startsWith('detektor'))).toBe(false);
  });
});

describe('pembaca kartu 2 rotasi menolak', () => {
  it('pembaca yang selalu memilih huruf kunci asal gagal di r2 → versi ditolak di kartu, kritikus tidak dipanggil', async () => {
    const p = panggilTemplatPalsu('tirt', { kartu: (info) => hurufKunciKode('tirt', info.omongan ?? 1) });
    const h = await jalankanTemplat({ paket: TIRT, panggil: p.panggil, setelan: SETELAN_TEMPLAT_M2D11, protokol: 'm2d11', maksVersiRencana: 1 });
    expect(h.lolos).toBe(false);
    expect(h.distribusi.kartu).toBeGreaterThan(0);
    expect(p.log.some((x) => x.jenis === 'kritikus')).toBe(false);
  });
});

describe('susunan label berselang (perubahan templat 2)', () => {
  it('pengecoh berlabel sama dengan kunci di seberang kunci; heuristik "opsi berlabel sama pertama" memilih kunci tepat 2/4 rotasi', async () => {
    const { hurufSlotSeimbang } = await import('./rakit.ts');
    const { putar } = await import('../rotasi/rotasi.ts');
    const H = ['a', 'b', 'c', 'd'] as const;
    for (const r of calonRencanaM2d11(TIRT)) {
      for (const hk of H) {
        const peta = hurufSlotSeimbang(hk, r);
        const labelKunci = r.slot[0].varian[0]?.label;
        const sama = r.slot.slice(1).find((s) => s.varian[0]?.label === labelKunci);
        if (sama === undefined) throw new Error('tidak ada pengecoh berlabel sama');
        expect(H.indexOf(peta[sama.slot])).toBe((H.indexOf(hk) + 2) % 4);
        expect(new Set(Object.values(peta)).size).toBe(4);
        const pilihan = Object.fromEntries(SLOT.map((s) => [peta[s], `${r.slot.find((x) => x.slot === s)?.varian[0]?.label ?? ''}, ${s}`])) as Record<'a' | 'b' | 'c' | 'd', string>;
        let kena = 0;
        for (const rot of [0, 1, 2, 3]) {
          const p = putar({ pilihan, kunci: hk }, rot);
          const pertama = H.find((h) => p.pilihan[h].startsWith(`${labelKunci ?? ''},`));
          if (pertama === p.kunci) kena += 1;
        }
        expect(kena).toBe(2);
      }
    }
  });
});
