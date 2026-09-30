/**
 * Bukti kunci tunggal templat (M2d-10 D-1, pra-registrasi §1). Dihitung ulang
 * dari fakta paket — tidak dari niat templat dan tidak dari model:
 *
 * 1. nilai klaim teman (proposisi) → label jawaban; harus sama dengan label
 *    yang dimaksud templat;
 * 2. TEPAT SATU dari empat pilihan berproposisi benar, pilihan itu di slot
 *    kunci, dan labelnya = label jawaban; tiga lainnya berproposisi salah;
 *    berlaku untuk SETIAP varian yang diizinkan (penyempurna hanya bisa memilih
 *    varian yang sudah lolos di sini);
 * 3. label 2 Betul + 2 Keliru; teks diawali labelnya;
 * 4. proposisi yang benar di bacaan rujukan lain → penanda waktunya tertulis;
 * 5. rujukan ada di paket dan angkanya milik fakta itu; tanpa angka telanjang;
 *    rujukan kunci hanya ke kartu atau angka yang dikutip pesan;
 * 6. fakta klaim & kunci tercakup kartu; kartu 2–4, penentu 1–2 ⊆ kartu.
 */
import { ambilRujukan, angkaTelanjang, teksPolos, RUJUKAN_ANDAIAN } from '../../skema/rujukan.ts';
import type { PaketFakta } from '../paket.ts';
import { angkaTakBerjejak, BATAS } from '../validasi.ts';
import type { Label, NamaSlot, RencanaSoal, VarianPilihan } from './pola.ts';
import { benarDiBacaanLain, evaluasi, faktaDisebut, type Proposisi } from './proposisi.ts';

export interface HasilBukti {
  sah: boolean;
  masalah: string[];
  /** Label jawaban menurut fakta (null bila klaim tak bisa dinilai). */
  label: Label | null;
}

function nilai(p: Proposisi, paket: PaketFakta, masalah: string[], tempat: string): boolean | null {
  try {
    return evaluasi(p, paket);
  } catch (galat) {
    masalah.push(`${tempat}: proposisi tidak bisa dinilai (${galat instanceof Error ? galat.message : 'galat'})`);
    return null;
  }
}

function tercakupKartu(id: string, kartu: readonly string[], paket: PaketFakta): boolean {
  if (kartu.includes(id)) return true;
  return kartu.some((k) => paket.fakta.find((f) => f.fact_id === k)?.turunan_dari.includes(id) === true);
}

/** Pemeriksaan satu teks pilihan (label, rujukan, angka, panjang, penanda). */
export function periksaTeksVarian(v: VarianPilihan, paket: PaketFakta): string[] {
  const m: string[] = [];
  const polos = teksPolos(v.teks);
  if (!polos.trimStart().startsWith(`${v.label},`)) m.push(`${v.id}: teks tidak diawali "${v.label},"`);
  if (polos.length > BATAS.opsi) m.push(`${v.id}: ${String(polos.length)} karakter, lebih dari ${String(BATAS.opsi)}`);
  const telanjang = angkaTelanjang(v.teks);
  if (telanjang.length > 0) m.push(`${v.id}: angka di luar rujukan (${telanjang.join(', ')})`);
  for (const r of ambilRujukan(v.teks)) {
    if (r.teks.length > BATAS.label) m.push(`${v.id}: label rujukan "${r.teks}" lebih dari ${String(BATAS.label)} karakter`);
    if (r.fact_id === RUJUKAN_ANDAIAN) continue;
    const f = paket.fakta.find((x) => x.fact_id === r.fact_id);
    if (f === undefined) {
      m.push(`${v.id}: rujukan ke "${r.fact_id}" yang tidak ada di paket`);
      continue;
    }
    const hilang = angkaTakBerjejak(r.teks, f);
    if (hilang.length > 0) m.push(`${v.id}: [[${r.fact_id}|${r.teks}]] memuat ${hilang.join(', ')} yang bukan milik fakta itu`);
  }
  for (const i of v.inti) if (!polos.toLowerCase().includes(i.toLowerCase())) m.push(`${v.id}: kata inti "${i}" tidak tertulis`);
  if (v.penanda !== null && !polos.includes(v.penanda)) m.push(`${v.id}: penanda waktu "${v.penanda}" tidak tertulis`);
  return m;
}

/**
 * Bukti kunci tunggal untuk rencana (semua varian) dan, bila diberikan,
 * untuk pilihan varian tertentu per slot. Murni.
 */
export function buktiKunciTunggal(r: RencanaSoal, paket: PaketFakta, pilihan?: Partial<Record<NamaSlot, VarianPilihan>>): HasilBukti {
  const masalah: string[] = [];
  const nk = nilai(r.klaim.proposisi, paket, masalah, 'klaim');
  const label: Label | null = nk === null ? null : nk ? 'Betul' : 'Keliru';
  if (label !== null && label !== r.klaim.label) masalah.push(`klaim: menurut fakta ${label}, templat bermaksud ${r.klaim.label}`);
  if (nk !== null && benarDiBacaanLain(r.klaim.proposisi, paket) !== nk && r.klaim.wajib.length === 0) {
    masalah.push('klaim: nilainya berbeda di bacaan rujukan lain, tetapi tidak ada penanda wajib di pesan');
  }
  for (const id of faktaDisebut(r.klaim.proposisi)) if (!tercakupKartu(id, r.kartu, paket)) masalah.push(`klaim: fakta "${id}" tidak tercakup kartu`);

  // kartu
  if (r.kartu.length < BATAS.kartuMin || r.kartu.length > BATAS.kartuMaks) masalah.push(`kartu: ${String(r.kartu.length)} kartu, harus 2–4`);
  if (new Set(r.kartu).size !== r.kartu.length) masalah.push('kartu: ada yang kembar');
  if (r.kartu_penentu.length < 1 || r.kartu_penentu.length > 2) masalah.push('kartu penentu harus 1–2');
  for (const id of r.kartu_penentu) if (!r.kartu.includes(id)) masalah.push(`kartu penentu "${id}" bukan kartu`);
  for (const id of r.kartu) if (!paket.fakta.some((f) => f.fact_id === id)) masalah.push(`kartu "${id}" tidak ada di paket`);

  // slot & varian
  const labelSlot: Label[] = [];
  const angkaKlaim = new Set(r.klaim.angka.map((a) => a.fact_id).filter((x): x is string => x !== undefined));
  for (const s of r.slot) {
    if (s.varian.length === 0) {
      masalah.push(`${s.slot}: tanpa varian`);
      continue;
    }
    const l0 = s.varian[0]?.label as Label;
    labelSlot.push(l0);
    for (const v of s.varian) {
      if (v.label !== l0) masalah.push(`${s.slot}/${v.id}: label berbeda dari varian lain di slot yang sama`);
      masalah.push(...periksaTeksVarian(v, paket));
      const nv = nilai(v.proposisi, paket, masalah, `${s.slot}/${v.id}`);
      if (nv === null) continue;
      if (s.slot === 'kunci') {
        if (!nv) masalah.push(`kunci/${v.id}: proposisi SALAH menurut fakta`);
        if (label !== null && v.label !== label) masalah.push(`kunci/${v.id}: label ${v.label}, jawaban menurut fakta ${label}`);
        for (const id of faktaDisebut(v.proposisi)) if (!tercakupKartu(id, r.kartu, paket)) masalah.push(`kunci/${v.id}: fakta "${id}" tidak tercakup kartu`);
        for (const x of ambilRujukan(v.teks)) {
          if (x.fact_id === RUJUKAN_ANDAIAN) masalah.push(`kunci/${v.id}: kunci memakai [[misal|…]]`);
          else if (!r.kartu.includes(x.fact_id) && !angkaKlaim.has(x.fact_id)) masalah.push(`kunci/${v.id}: rujukan "${x.fact_id}" bukan kartu dan bukan angka pesan`);
        }
      } else if (nv) {
        masalah.push(`${s.slot}/${v.id}: pengecoh berproposisi BENAR menurut fakta — kunci tidak tunggal`);
      }
      if (benarDiBacaanLain(v.proposisi, paket) && (v.penanda === null || !teksPolos(v.teks).includes(v.penanda))) {
        masalah.push(`${s.slot}/${v.id}: benar untuk rujukan lain di paket, tetapi teksnya tanpa penanda waktu`);
      }
    }
  }
  if (r.slot[0].slot !== 'kunci' || new Set(r.slot.map((s) => s.slot)).size !== 4) masalah.push('slot harus kunci, p1, p2, p3');
  const betul = labelSlot.filter((l) => l === 'Betul').length;
  if (betul !== 2 || labelSlot.length !== 4) masalah.push(`label pilihan ${String(betul)} Betul dari ${String(labelSlot.length)}; harus 2 Betul + 2 Keliru`);

  // kombinasi terpilih: tepat satu pilihan benar, dan itu kunci
  const terpilih = r.slot.map((s) => pilihan?.[s.slot] ?? s.varian[0]);
  const benar = terpilih.map((v) => v !== undefined && label !== null && v.label === label && nilai(v.proposisi, paket, [], 'x') === true);
  const jumlahBenar = benar.filter(Boolean).length;
  if (jumlahBenar !== 1 || benar[0] !== true) masalah.push(`kombinasi pilihan: ${String(jumlahBenar)} pilihan benar (harus tepat 1, di slot kunci)`);
  const propBenar = terpilih.filter((v) => v !== undefined && nilai(v.proposisi, paket, [], 'x') === true).length;
  if (propBenar !== 1) masalah.push(`kombinasi pilihan: ${String(propBenar)} proposisi benar (harus tepat 1)`);
  if (pilihan !== undefined) {
    for (const s of r.slot) {
      const v = pilihan[s.slot];
      if (v !== undefined && !s.varian.some((x) => x.id === v.id)) masalah.push(`${s.slot}: varian "${v.id}" bukan varian yang diizinkan`);
    }
  }

  // rujukan penjelasan
  for (const t of r.rujukan_penjelasan) {
    for (const x of ambilRujukan(t)) {
      const f = paket.fakta.find((y) => y.fact_id === x.fact_id);
      if (f === undefined) masalah.push(`rujukan penjelasan "${x.fact_id}" tidak ada di paket`);
      else if (angkaTakBerjejak(x.teks, f).length > 0) masalah.push(`rujukan penjelasan ${t} tidak cocok dengan faktanya`);
    }
  }
  return { sah: masalah.length === 0, masalah, label };
}
