/**
 * Templat M2d-10 (T-01): kunci tunggal terjamin konstruksi (dibuktikan dari
 * fakta, bukan dari niat templat), pemilih pola, angka pesan terkunci, dan
 * anti-salin soal tayang.
 */
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { teksPolos } from '../../skema/rujukan.ts';
import { AKAR } from '../env.ts';
import { validasiM2d8 } from '../kalibrasi-soal.ts';
import { DEFINISI_PAKET, bangunPaket, type PaketFakta } from '../paket.ts';
import { buktiKunciTunggal } from './bukti.ts';
import { kategoriAlasan } from './fakta.ts';
import { FRASA_ALASAN, PEMBANGUN_POLA, URUTAN_POLA, semuaRencana, type NamaSlot, type RencanaSoal, type VarianPilihan } from './pola.ts';
import { calonRencana, kunciRencana, penggantiRencana, pilihRencanaPemanasan, pilihRencanaSimulasi } from './pilih.ts';
import { evaluasi } from './proposisi.ts';
import { angkaPesanDari, periksaPenjelasan, periksaWajib, pilihanBawaan, rakitOmonganTemplat, salinanTayang } from './rakit.ts';

const baca = (j: string): PaketFakta => JSON.parse(readFileSync(`${AKAR}${j}`, 'utf8')) as PaketFakta;
const TIRT = bangunPaket(DEFINISI_PAKET.tirt);
const AGAR = baca('eval/penyusun/demo-agar/paket.json');
const PAKET: Record<string, PaketFakta> = { tirt: TIRT, agar: AGAR, dada: bangunPaket(DEFINISI_PAKET.dada), ultj: bangunPaket(DEFINISI_PAKET.ultj) };
const SEMUA: Array<{ nama: string; paket: PaketFakta; r: RencanaSoal }> = Object.entries(PAKET).flatMap(([nama, paket]) => semuaRencana(paket).map((r) => ({ nama, paket, r })));

describe('pola: tiap pola berlaku di paket TIRT', () => {
  it.each(URUTAN_POLA)('%s', (id) => {
    expect(PEMBANGUN_POLA[id](TIRT).length).toBeGreaterThan(0);
  });
});

describe('bukti kunci tunggal (dari fakta)', () => {
  it.each(SEMUA.map((x) => [`${x.nama} ${kunciRencana(x.r)}`, x] as const))('%s: sah', (_n, x) => {
    const b = buktiKunciTunggal(x.r, x.paket);
    expect(b.masalah).toEqual([]);
    expect(b.label).toBe(x.r.klaim.label);
  });

  it('setiap kombinasi varian (penyempurna hanya memilih varian) tetap tepat satu benar', () => {
    for (const { r, paket } of SEMUA) {
      const [k, p1, p2, p3] = r.slot;
      for (const a of k.varian) for (const b of p1.varian) for (const c of p2.varian) for (const d of p3.varian) {
        const pil: Record<NamaSlot, VarianPilihan> = { kunci: a, p1: b, p2: c, p3: d };
        expect(buktiKunciTunggal(r, paket, pil).sah).toBe(true);
      }
    }
  });

  it('nilai kebenaran dihitung dari fakta: kunci benar, ketiga pengecoh salah', () => {
    for (const { r, paket } of SEMUA) {
      expect(evaluasi(r.slot[0].varian[0]?.proposisi as never, paket)).toBe(true);
      for (const s of r.slot.slice(1)) for (const v of s.varian) expect(evaluasi(v.proposisi, paket)).toBe(false);
    }
  });

  it.each(URUTAN_POLA)('sabotase %s: pengecoh diberi proposisi & label kunci (dua pilihan benar) → tidak sah', (id) => {
    const x = SEMUA.find((s) => s.nama === 'tirt' && s.r.pola === id) as (typeof SEMUA)[number];
    const k = x.r.slot[0].varian[0] as VarianPilihan;
    const p1 = x.r.slot[1];
    const rusak: RencanaSoal = {
      ...x.r,
      slot: [x.r.slot[0], { ...p1, varian: p1.varian.map((v) => ({ ...v, label: k.label, proposisi: k.proposisi, teks: v.teks.replace(/^(Betul|Keliru),/, `${k.label},`) })) }, x.r.slot[2], x.r.slot[3]],
    };
    const b = buktiKunciTunggal(rusak, x.paket);
    expect(b.sah).toBe(false);
    expect(b.masalah.join(' | ')).toMatch(/kunci tidak tunggal|pilihan benar/);
  });

  it('sabotase: klaim yang dimaksud Keliru padahal fakta membuatnya Betul → tidak sah', () => {
    const x = SEMUA.find((s) => s.nama === 'tirt' && s.r.pola === 'sebab-resmi') as (typeof SEMUA)[number];
    const k = x.r.slot[0].varian[0] as VarianPilihan;
    const rusak: RencanaSoal = { ...x.r, klaim: { ...x.r.klaim, proposisi: k.proposisi } };
    expect(buktiKunciTunggal(rusak, x.paket).masalah.join(' ')).toMatch(/menurut fakta Betul/);
  });

  it('sabotase: pengecoh yang benar untuk penghentian lain tanpa penanda "hari ini" → tidak sah', () => {
    const x = SEMUA.find((s) => s.nama === 'tirt' && s.r.pola === 'sebab-resmi') as (typeof SEMUA)[number];
    const p1 = x.r.slot[1];
    const rusak: RencanaSoal = { ...x.r, slot: [x.r.slot[0], { ...p1, varian: p1.varian.map((v) => ({ ...v, teks: v.teks.replace(' hari ini', ''), penanda: null })) }, x.r.slot[2], x.r.slot[3]] };
    expect(buktiKunciTunggal(rusak, x.paket).masalah.join(' ')).toMatch(/tanpa penanda waktu/);
  });

  it('sabotase: kunci merujuk fakta di luar kartu → tidak sah', () => {
    const x = SEMUA.find((s) => s.nama === 'tirt' && s.r.pola === 'benar-berincian') as (typeof SEMUA)[number];
    const rusak: RencanaSoal = { ...x.r, kartu: ['naik-2025-11-26-2025-12-09', 'harga-2025-12-09'], kartu_penentu: ['harga-2025-12-09'] };
    expect(buktiKunciTunggal(rusak, x.paket).sah).toBe(false);
  });

  it('sabotase: hanya varian kedua pengecoh yang benar (varian bawaan sah) → tidak sah', () => {
    const x = SEMUA.find((s) => s.nama === 'tirt' && s.r.pola === 'sebab-resmi') as (typeof SEMUA)[number];
    const k = x.r.slot[0].varian[0] as VarianPilihan;
    const p1 = x.r.slot[1];
    const [v0, v1] = p1.varian as [VarianPilihan, VarianPilihan];
    const rusak: RencanaSoal = { ...x.r, slot: [x.r.slot[0], { ...p1, varian: [v0, { ...v1, label: 'Keliru', proposisi: k.proposisi, teks: v1.teks.replace(/^Betul,/, 'Keliru,') }] }, x.r.slot[2], x.r.slot[3]] };
    expect(buktiKunciTunggal(rusak, x.paket).masalah.join(' | ')).toMatch(/kunci tidak tunggal/);
  });

  it('sabotase: pilihan terpilih (mis. keluaran penyempurna) membawa proposisi benar dengan id yang sah → tidak sah', () => {
    const x = SEMUA.find((s) => s.nama === 'tirt' && s.r.pola === 'angka-lain-waktu') as (typeof SEMUA)[number];
    const k = x.r.slot[0].varian[0] as VarianPilihan;
    const p1 = x.r.slot[1].varian[0] as VarianPilihan;
    const pil = { ...pilihanBawaan(x.r), p1: { ...p1, label: k.label, proposisi: k.proposisi } };
    expect(buktiKunciTunggal(x.r, x.paket, pil).masalah.join(' | ')).toMatch(/kombinasi pilihan/);
  });

  it('sabotase: fakta proposisi kunci tidak tercakup kartu (rujukan kunci tetap di kartu) → tidak sah', () => {
    const x = SEMUA.find((s) => s.nama === 'tirt' && s.r.pola === 'setengah-benar') as (typeof SEMUA)[number];
    const rusak: RencanaSoal = { ...x.r, kartu: ['susp-2025-01-21', 'naik-2025-11-26-2025-12-09'], kartu_penentu: ['susp-2025-01-21'] };
    expect(buktiKunciTunggal(rusak, x.paket).masalah.join(' | ')).toMatch(/kunci\/K1: fakta "hari-naik-beruntun" tidak tercakup kartu/);
  });

  it('kategori alasan resmi dari kalimat bursa', () => {
    expect(kategoriAlasan('Terjadinya peningkatan harga kumulatif yang signifikan … cooling down')).toBe('kenaikan-harga');
    expect(kategoriAlasan('Bursa menilai bahwa terdapat keraguan atas kelangsungan usaha perseroan')).toBe('kelangsungan-usaha');
    expect(kategoriAlasan('keterlambatan penyampaian laporan keuangan')).toBe('laporan-keuangan');
  });
});

describe('pemilih pola', () => {
  it('TIRT: tiga posisi, pola berbeda, penentu tidak beririsan, minimal satu Betul', () => {
    const p = pilihRencanaSimulasi(TIRT);
    // A-2: sebab-resmi:susp-2025-12-10 = soal pemanasan → tidak dipakai simulasi (anti-ulang).
    expect(p.posisi.map(kunciRencana)).toEqual(['angka-lain-waktu:harga-2025-12-09', 'setengah-benar:susp-2025-01-21', 'besaran-hitungan:kelipatan-2025-11-26-2025-12-09']);
    expect(new Set(p.posisi.map((r) => r.pola)).size).toBe(3);
    expect(p.posisi.some((r) => r.klaim.label === 'Betul')).toBe(true);
  });

  it('pengganti: pola & penentu tidak bentrok; Betul bila posisi itu satu-satunya Betul', () => {
    const p = pilihRencanaSimulasi(TIRT, calonRencana(TIRT));
    const calon = p.calon;
    const dipakai = new Set(p.posisi.map(kunciRencana));
    // benar-berincian & arah bentrok penentu hari-naik dengan setengah-benar (posisi 2); sebab-resmi disingkirkan anti-ulang
    expect(penggantiRencana(calon, dipakai, p.posisi.slice(0, 2), true)).toBeNull();
    const g = penggantiRencana(calon, dipakai, [p.posisi[0] as RencanaSoal], true);
    expect(g === null ? null : kunciRencana(g)).toBe('benar-berincian:hari-naik-beruntun');
    expect(calon.map(kunciRencana)).not.toContain('sebab-resmi:susp-2025-12-10');
  });

  it('pemanasan TIRT = sebab-resmi, dua kartu, kartu 1 penentu', () => {
    const r = pilihRencanaPemanasan(TIRT);
    expect(r?.pola).toBe('sebab-resmi');
    expect(r?.kartu).toEqual(['susp-2025-12-10', 'susp-2025-01-21']);
    expect(r?.kartu_penentu).toEqual(['susp-2025-12-10']);
  });
});

describe('angka pesan terkunci, kata wajib, penjelasan', () => {
  const r = semuaRencana(TIRT).find((x) => x.pola === 'angka-lain-waktu') as RencanaSoal;
  it('angka yang diizinkan dicatat ke faktanya; angka lain ditolak', () => {
    const ok = angkaPesanDari('Penutupan kemarin Rp97 kan? naik dikit doang', r.klaim);
    expect(ok.masalah).toEqual([]);
    expect(ok.angka_pesan).toEqual([{ teks: 'Rp97', fact_id: 'harga-2025-12-08' }]);
    expect(angkaPesanDari('Penutupan kemarin Rp98 kan?', r.klaim).masalah.length).toBe(1);
    expect(angkaPesanDari('Penutupan 9 Desember Rp97, naik 3 hari', r.klaim).masalah.join(' ')).toMatch(/3/);
  });
  it('kata wajib (penanda hari) harus tertulis', () => {
    expect(periksaWajib('Penutupannya Rp97 ya', r.klaim).length).toBe(1);
    expect(periksaWajib('Penutupan kemarin Rp97 ya', r.klaim)).toEqual([]);
  });
  it('penjelasan: rujukan hanya dari daftar dan merujuk penentu', () => {
    expect(periksaPenjelasan('Penutupan [[harga-2025-12-09|9 Desember]] tercatat [[harga-2025-12-09|Rp106]].', r)).toEqual([]);
    expect(periksaPenjelasan('Naiknya [[naik-2025-11-26-2025-12-09|Rp58]].', r).length).toBe(2);
  });
});

describe('rakit + validator: pilihan templat lolos validator M2d-8', () => {
  it.each(SEMUA.filter((x) => x.nama === 'tirt' || x.nama === 'agar').map((x) => [`${x.nama} ${kunciRencana(x.r)}`, x] as const))('%s', (_n, { r, paket }) => {
    const angka = r.klaim.angka.map((a) => a.teks).join(' ');
    const wajib = r.klaim.wajib.map((g) => g[0]).join(' ');
    const pesan = `Gw denger ${wajib} ${angka} gitu`.replace(/\s+/g, ' ').trim();
    const tok = r.rujukan_penjelasan.find((t) => r.kartu_penentu.some((id) => t.startsWith(`[[${id}|`))) as string;
    const penjelasan = `Kartu yang menentukan: ${tok}. Salah-kaprah yang umum: ${r.salah_kaprah}.`;
    const o = rakitOmonganTemplat(r, pilihanBawaan(r), { nama: 'Sinta', jam: '19.20', pesan }, penjelasan, 'c');
    const m = validasiM2d8({ omongan: [o] }, paket).filter((x) => x.omongan !== null);
    expect(m).toEqual([]);
  });
});

describe('anti-salin: templat tidak menyalin kalimat soal tayang', () => {
  const teksTemplat = (): string[] => [
    ...Object.values(FRASA_ALASAN),
    ...SEMUA.flatMap(({ r }) => [r.klaim.inti, r.salah_kaprah, ...r.slot.flatMap((s) => s.varian.map((v) => teksPolos(v.teks)))]),
  ];
  it('tidak ada potongan 5 kata soal tayang di teks templat', () => {
    const salin = teksTemplat().flatMap((t) => salinanTayang(t).map((s) => `${t} ← ${s}`));
    expect(salin).toEqual([]);
  });
  it('sabotase: kalimat soal tayang disisipkan → tertangkap', () => {
    expect(salinanTayang('Keliru, pengumumannya soal laporan keuangan telat.').length).toBeGreaterThan(0);
  });
});
