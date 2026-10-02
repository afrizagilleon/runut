/**
 * Pemeriksa kode mesin templat (pra-registrasi M2d-10 §3 langkah 1): gratis,
 * pasti, dijalankan pertama.
 *
 * - struktur templat (`buktiKunciTunggal` atas kombinasi pilihan yang aktif);
 * - validator `validasiM2d8` atas omongan itu sendirian (kode seluruh-draf
 *   dinilai sesudah ketiga omongan dikunci);
 * - gerbang kode M2d-8: G (angka cukup, kaku), gaya (panjang, satu klausa,
 *   register), penilaian, pilihan kembar, rujukan huruf, mirip antar omongan,
 *   meresmikan & keseimbangan (ambang kalibrasi M2d-8);
 * - pemeriksaan tulisan templat: angka pesan terkunci, kata wajib, nama,
 *   rujukan penjelasan, anti-salin.
 *
 * Kode yang diturunkan kalibrasi M2d-8 (`SETELAN_KALIBRASI_M2D8.kode_dicatat`)
 * tetap dijalankan dan DICATAT, tidak menolak; kode pelindung tidak pernah
 * diturunkan.
 */
import type { OmonganDraf } from '../draf.ts';
import { gArtefak } from '../gerbang-artefak.ts';
import { gerbangG } from '../gerbang-g.ts';
import { gerbangGaya } from '../gerbang-gaya.ts';
import { gKembar } from '../gerbang-kembar.ts';
import { gMirip } from '../gerbang-mirip.ts';
import { gPenilaian } from '../gerbang-penilaian.ts';
import { GENERASI_M2D8, SETELAN_KALIBRASI_M2D8 } from '../kalibrasi-susun.ts';
import { KODE_PELINDUNG } from '../kalibrasi-setelan.ts';
import { validasiM2d8 } from '../kalibrasi-soal.ts';
import type { PaketFakta } from '../paket.ts';
import { periksaRujukanHuruf } from '../posisi-kunci.ts';
import { dariG, dariGaya, dariHuruf, dariKembar, dariMeresmikan, dariValidator, isiLokasi, type UmpanMentah } from '../umpan-terarah.ts';
import { deteksi, menolak, type AmbangCacat } from '../cacat/detektor.ts';
import { bocorKalender } from './a2.ts';
import { umpanBalik, validasiUmpanBalik } from './label.ts';
import { buktiKunciTunggal } from './bukti.ts';
import { periksaTulisanPenjelasan, periksaTulisanPesan } from './penulis.ts';
import type { RencanaSoal } from './pola.ts';
import type { PilihanAktif, TulisanPesan } from './rakit.ts';

export type LokasiMasalah = 'struktur' | 'pesan' | 'pilihan' | 'penjelasan';

export interface MasalahKode {
  lokasi: LokasiMasalah;
  sumber: string;
  alasan: string;
}

export interface HasilKode {
  menolak: MasalahKode[];
  dicatat: MasalahKode[];
}

function lokasiDari(u: UmpanMentah): LokasiMasalah {
  return u.lokasi === 'pesan' ? 'pesan' : u.lokasi === 'penjelasan' ? 'penjelasan' : 'pilihan';
}

export interface ArgKode {
  no: number;
  o: OmonganDraf;
  r: RencanaSoal;
  pilihan: PilihanAktif;
  tulisan: TulisanPesan;
  paket: PaketFakta;
  namaLain: readonly string[];
  gabung: ReadonlyArray<OmonganDraf | null>;
  terkunci: ReadonlySet<number>;
  /** M2d-11: ambang detektor cacat (hasil kalibrasi) + validasi label & umpan balik. */
  m2d11?: { ambang: AmbangCacat };
}

/** Lokasi perbaikan bendera detektor M2d-11 (pra-registrasi §5): D3/D4 bergantung pesan; D8 = struktur. */
export function lokasiDetektor(kode: string): LokasiMasalah {
  return kode === 'D3' || kode === 'D4' ? 'pesan' : kode === 'D8' ? 'struktur' : 'pilihan';
}

/** Semua pemeriksaan kode atas satu versi omongan. Murni. */
export function periksaKodeTemplat(a: ArgKode): HasilKode {
  const { o, r, paket } = a;
  const semua: MasalahKode[] = [];
  for (const m of buktiKunciTunggal(r, paket, a.pilihan).masalah) semua.push({ lokasi: 'struktur', sumber: 'templat: kunci tunggal', alasan: m });
  for (const m of periksaTulisanPesan(a.tulisan, r, a.namaLain)) semua.push({ lokasi: 'pesan', sumber: 'templat: pesan', alasan: m });
  for (const m of periksaTulisanPenjelasan(o.penjelasan, r)) semua.push({ lokasi: 'penjelasan', sumber: 'templat: penjelasan', alasan: m });
  // A-2: kebocoran kalender — dari pilihan saja = struktur templat; bila baru muncul bersama pesan = pesan.
  const bocorPilihan = bocorKalender({ ...o, pesan: '' }, paket);
  for (const m of bocorPilihan) semua.push({ lokasi: 'struktur', sumber: 'templat: kalender', alasan: m });
  if (bocorPilihan.length === 0) for (const m of bocorKalender(o, paket)) semua.push({ lokasi: 'pesan', sumber: 'templat: kalender', alasan: m });
  const validator = validasiM2d8({ omongan: [o] }, paket).filter((m) => m.omongan !== null);
  const umpan: UmpanMentah[] = [
    ...dariValidator(validator, o),
    ...dariG(gerbangG(o), o),
    ...dariGaya(gerbangGaya(o), o),
    ...dariHuruf(periksaRujukanHuruf(o), o),
    ...dariKembar(gKembar(o.pilihan), o),
    ...gPenilaian(o.pesan).alasan.map((x) => ({ lokasi: 'pesan' as const, sumber: 'pemeriksa: G-penilaian', teramati: o.pesan, alasan: x })),
  ];
  const mirip = gMirip(a.no, a.gabung, a.terkunci);
  for (const x of mirip.alasan) umpan.push({ lokasi: `pilihan-${o.kunci}`, sumber: 'pemeriksa: G-mirip', teramati: isiLokasi(o, `pilihan-${o.kunci}`), alasan: x });
  const art = gArtefak(o, GENERASI_M2D8.ambang);
  umpan.push(...dariMeresmikan(art.meresmikan.alasan, o));
  for (const x of art.keseimbangan.alasan) umpan.push({ lokasi: `pilihan-${o.kunci}`, sumber: 'gerbang artefak: keseimbangan', teramati: isiLokasi(o, `pilihan-${o.kunci}`), alasan: x });
  const sudah = new Set<string>();
  for (const u of umpan) {
    const k = `${u.sumber}|${u.alasan}`;
    if (sudah.has(k)) continue;
    sudah.add(k);
    semua.push({ lokasi: lokasiDari(u), sumber: u.sumber, alasan: u.alasan });
  }
  if (a.m2d11 !== undefined) {
    for (const b of menolak(deteksi({ pesan: o.pesan, pilihan: o.pilihan, kunci: o.kunci }, a.m2d11.ambang))) {
      semua.push({ lokasi: lokasiDetektor(b.kode), sumber: `detektor ${b.kode} (${b.nama})`, alasan: `${b.alasan}; opsi ${b.opsi.join(', ')}` });
    }
    for (const m of validasiUmpanBalik(umpanBalik(r, paket, o.kunci), r)) semua.push({ lokasi: 'struktur', sumber: 'M2d-11: umpan balik/label', alasan: m });
  }
  const turun = (m: MasalahKode): boolean => {
    const kode = m.sumber.startsWith('pemeriksa: ') ? m.sumber.slice('pemeriksa: '.length) : null;
    return kode !== null && SETELAN_KALIBRASI_M2D8.kode_dicatat.includes(kode) && !KODE_PELINDUNG.includes(kode);
  };
  return { menolak: semua.filter((m) => !turun(m)), dicatat: semua.filter(turun) };
}
