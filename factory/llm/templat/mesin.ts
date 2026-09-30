/**
 * Lingkar mesin templat (M2d-10 D-1…D-4, pra-registrasi §3).
 *
 *   perencana (kode): pemilih pola → tiga rencana soal (kunci tunggal terbukti)
 *   → penulis kata (DeepSeek): pesan teman, lalu penjelasan
 *   → pemeriksa kode → penebak keluarga campur → pembaca kartu
 *   → kritikus makna GLM (PALING AKHIR, hanya pada versi yang lolos semua)
 *   → lolos = omongan dikunci
 *
 * Umpan balik: penolakan di pilihan → penyempurna Haiku (varian yang
 * diizinkan, diperiksa ulang kode); di pesan/penjelasan → penulis menulis
 * ulang bagian itu. Paling banyak 4 versi per rencana (≤ 2 penyempurnaan),
 * 3 rencana per posisi. Setiap versi dicatat dengan gerbang tempat ia berhenti
 * (distribusi yang dilaporkan).
 */
import { bacaBank, nadaUntuk, pilihContoh, URUT_NADA_V2 } from '../bank-gaya.ts';
import type { DrafSimulasi, OmonganDraf } from '../draf.ts';
import { gPenilaian } from '../gerbang-penilaian.ts';
import type { PutusanKartu } from '../gerbang-kartu.ts';
import { hashPesan, type JenisLangkah, type LangkahJejak, type PencatatJejak, type PeranLangkah } from '../jejak.ts';
import { validasiM2d8 } from '../kalibrasi-soal.ts';
import type { PutusanKritik } from '../kritikus.ts';
import { umpanKritik } from '../kritikus.ts';
import { MODEL_OR_DEEPSEEK } from '../model.ts';
import { PaguTercapai } from '../pagu.ts';
import type { PaketFakta } from '../paket.ts';
import { hurufKunciKode } from '../posisi-kunci.ts';
import { dariKritik } from '../umpan-terarah.ts';
import {
  kritikusMakna,
  kritikusMenolakTemplat,
  pembacaKartu,
  penebakCampur,
  SETELAN_PENULIS,
  type HasilPenebakCampur,
  type SetelanTumpukan,
} from './gerbang.ts';
import { periksaKodeTemplat, type MasalahKode } from './kode.ts';
import {
  pesanTulisPenjelasanTemplat,
  pesanTulisPesanTemplat,
  tulisBercadangan,
  uraiPenjelasan,
  uraiTulisanPesan,
  type CatatanTulis,
  type InfoTemplat,
  type PanggilTemplat,
} from './penulis.ts';
import { MODEL_PENYEMPURNA, pesanPenyempurna, SETELAN_PENYEMPURNA, uraiPenyempurna, verifikasiPerbaikan, type JenisKegagalan } from './penyempurna.ts';
import { calonRencana, kunciRencana, penggantiRencana, pilihRencanaSimulasi } from './pilih.ts';
import type { RencanaSoal } from './pola.ts';
import { pilihanBawaan, rakitOmonganTemplat, slotDariHuruf, type PilihanAktif, type TulisanPesan } from './rakit.ts';

export const MAKS_VERSI_RENCANA = 4;
export const MAKS_PENYEMPURNAAN = 2;
export const MAKS_RENCANA_POSISI = 3;
export const JUMLAH_OMONGAN = 3;

export type Gerbang = 'kode' | 'penebak' | 'kartu' | 'kritikus';
export type Berhenti = Gerbang | 'lolos' | 'tulis-gagal' | 'pagu' | 'galat';

export interface CatatanVersi {
  no: number;
  rencana: string;
  /** Versi ke berapa dari rencana ini (1…4). */
  versi: number;
  /** Nomor global (putaran jejak). */
  putaran: number;
  berhenti: Berhenti;
  alasan: string[];
  dicatat: string[];
  penyempurna_sebelumnya: boolean;
  /** Penebak Haiku menilai pilihan yang pernah disempurnakan Haiku di rencana ini. */
  titik_buta: boolean;
  penebak: HasilPenebakCampur | null;
  kartu: PutusanKartu | null;
  kritik: PutusanKritik | null;
  omongan: OmonganDraf | null;
}

export interface CatatanPenyempurnaan {
  no: number;
  rencana: string;
  putaran: number;
  jenis: JenisKegagalan;
  diterima: Array<{ slot: string; varian: string; dari: string; ke: string }>;
  dibuang: Array<{ slot: string; alasan: string }>;
  terbaca: boolean;
}

/** Keadaan omongan yang dikunci (bahan uji ulang penyetuju). */
export interface KunciTemplat {
  no: number;
  rencana: RencanaSoal;
  pilihan: PilihanAktif;
  tulisan: TulisanPesan;
  penjelasan: string;
  omongan: OmonganDraf;
  penyempurna_dipakai: boolean;
}

export interface HasilTemplat {
  lolos: boolean;
  draf: DrafSimulasi | null;
  berhenti: string | null;
  jumlah_versi: number;
  rencana_awal: string[];
  versi: CatatanVersi[];
  penyempurnaan: CatatanPenyempurnaan[];
  distribusi: Record<Berhenti, number>;
  kunci: KunciTemplat[];
  draf_terakhir: Array<OmonganDraf | null>;
  setelan: SetelanTumpukan;
}

export interface OpsiTemplat {
  paket: PaketFakta;
  panggil: PanggilTemplat;
  setelan: SetelanTumpukan;
  jejak?: PencatatJejak;
  jam?: () => Date;
  saatKunci?: (k: KunciTemplat) => void;
  maksVersiRencana?: number;
}

type Catat = (l: Omit<LangkahJejak, 'no'>) => void;

function teksGalat(g: unknown): string {
  return g instanceof Error ? `${g.name}: ${g.message}` : 'galat tak dikenal';
}

const jumlah = <T>(x: readonly T[], f: (y: T) => number): number => x.reduce((a, y) => a + f(y), 0);

export function distribusiKosong(): Record<Berhenti, number> {
  return { kode: 0, penebak: 0, kartu: 0, kritikus: 0, lolos: 0, 'tulis-gagal': 0, pagu: 0, galat: 0 };
}

export async function jalankanTemplat(opsi: OpsiTemplat): Promise<HasilTemplat> {
  const { paket, panggil, setelan } = opsi;
  const jam = opsi.jam ?? (() => new Date());
  const maksVersi = opsi.maksVersiRencana ?? MAKS_VERSI_RENCANA;
  const catat: Catat = (l) => {
    opsi.jejak?.catat(l);
  };
  const hasil: HasilTemplat = {
    lolos: false, draf: null, berhenti: null, jumlah_versi: 0, rencana_awal: [], versi: [], penyempurnaan: [],
    distribusi: distribusiKosong(), kunci: [], draf_terakhir: [null, null, null], setelan,
  };
  const akhiri = (): HasilTemplat => {
    opsi.jejak?.selesai(hasil.lolos, hasil.jumlah_versi, hasil.berhenti);
    return hasil;
  };

  // --- 0. perencana
  const pilih = pilihRencanaSimulasi(paket, calonRencana(paket));
  const calon = pilih.calon; // A-2: tanpa rencana yang mengulang soal pemanasan
  hasil.rencana_awal = pilih.posisi.map(kunciRencana);
  catat({
    putaran: 1, jenis: 'rencana-templat', omongan: null, waktu_mulai: jam().toISOString(), waktu_selesai: jam().toISOString(), model: null,
    panggilan: 0, token_masuk: 0, token_keluar: 0, biaya_usd: 0, putusan: pilih.posisi.length === JUMLAH_OMONGAN ? 'lolos' : 'tolak',
    alasan: pilih.alasan, sha256_prompt: null,
    rincian: { rencana: pilih.posisi.map((r) => ({ pola: r.pola, asal: r.asal, sudut: r.sudut, kartu: r.kartu, label_klaim: r.klaim.label })), calon: calon.map(kunciRencana) },
    peran: 'perencana',
  });
  if (pilih.posisi.length < JUMLAH_OMONGAN) {
    hasil.berhenti = `paket hanya memberi ${String(pilih.posisi.length)} rencana soal templat yang cocok; simulasi tidak terbit`;
    return akhiri();
  }
  const rencanaPosisi: RencanaSoal[] = [...pilih.posisi];
  const dipakai = new Set(rencanaPosisi.map(kunciRencana));
  const terkunci = new Set<number>();
  const gabung: Array<OmonganDraf | null> = [null, null, null];
  let putaran = 0;
  const bank = bacaBank(2).filter((k) => !gPenilaian(k.teks).tolak);

  const namaLain = (no: number): string[] => hasil.kunci.filter((k) => k.no !== no).map((k) => k.tulisan.nama);

  for (const no of [1, 2, 3]) {
    let r = rencanaPosisi[no - 1] as RencanaSoal;
    let rencanaKe = 1;
    const hurufKunci = hurufKunciKode(paket.paket_id, no);
    posisi: for (;;) {
      let pilihan = pilihanBawaan(r);
      let tulisan: TulisanPesan | null = null;
      let penjelasan: string | null = null;
      let umpanPesan: string[] = [];
      let umpanPenjelasan: string[] = [];
      let penyempurnaan = 0;
      let disempurnakan = false;
      for (let versi = 1; versi <= maksVersi; versi++) {
        putaran += 1;
        hasil.jumlah_versi = putaran;
        const cv: CatatanVersi = {
          no, rencana: kunciRencana(r), versi, putaran, berhenti: 'galat', alasan: [], dicatat: [], penyempurna_sebelumnya: disempurnakan,
          titik_buta: false, penebak: null, kartu: null, kritik: null, omongan: null,
        };
        hasil.versi.push(cv);
        const selesaiVersi = (b: Berhenti, alasan: string[]): void => {
          cv.berhenti = b;
          cv.alasan = alasan;
          hasil.distribusi[b] += 1;
        };
        try {
          // --- 1. penulis kata (hanya bagian yang perlu)
          if (tulisan === null) {
            const gaya = { nada: nadaUntuk(no, rencanaKe, URUT_NADA_V2), contoh: pilihContoh({ topik: [r.topik], nada: nadaUntuk(no, rencanaKe, URUT_NADA_V2), paket_id: paket.paket_id }, bank) };
            const pesan = pesanTulisPesanTemplat({ paket, r, no, namaLain: namaLain(no), gaya, umpan: umpanPesan });
            const t = await tulisBercadangan(panggil, pesan, SETELAN_PENULIS.pesan, info('tulis-pesan', putaran, no, 'penulis', MODEL_OR_DEEPSEEK), uraiTulisanPesan, catatTulis('tulis-pesan', putaran, no, pesan));
            if (t === null) {
              selesaiVersi('tulis-gagal', ['keluaran penulis pesan tak terbaca dua kali']);
              continue;
            }
            tulisan = t;
            penjelasan = null;
          }
          if (penjelasan === null) {
            const tanpa = rakitOmonganTemplat(r, pilihan, tulisan, '', hurufKunci);
            const { penjelasan: _p, ...inti } = tanpa;
            void _p;
            const pesan = pesanTulisPenjelasanTemplat({ paket, r, o: inti, umpan: umpanPenjelasan });
            const pj = await tulisBercadangan(panggil, pesan, SETELAN_PENULIS.penjelasan, info('tulis-penjelasan', putaran, no, 'penulis', MODEL_OR_DEEPSEEK), uraiPenjelasan, catatTulis('tulis-penjelasan', putaran, no, pesan));
            if (pj === null) {
              selesaiVersi('tulis-gagal', ['keluaran penulis penjelasan tak terbaca dua kali']);
              continue;
            }
            penjelasan = pj;
          }
          const o = rakitOmonganTemplat(r, pilihan, tulisan, penjelasan, hurufKunci);
          cv.omongan = o;
          gabung[no - 1] = o;
          hasil.draf_terakhir[no - 1] = o;

          // --- 2. pemeriksa kode
          const kode = periksaKodeTemplat({ no, o, r, pilihan, tulisan, paket, namaLain: namaLain(no), gabung, terkunci });
          cv.dicatat.push(...kode.dicatat.map((m) => `${m.sumber}: ${m.alasan}`));
          catat({
            putaran, jenis: 'gerbang-g', omongan: no, waktu_mulai: jam().toISOString(), waktu_selesai: jam().toISOString(), model: null, panggilan: 0,
            token_masuk: 0, token_keluar: 0, biaya_usd: 0, putusan: kode.menolak.length > 0 ? 'tolak' : 'lolos',
            alasan: kode.menolak.length > 0 ? kode.menolak.map((m) => `${m.sumber} (${m.lokasi}): ${m.alasan}`) : ['struktur templat, validator, dan gerbang kode tidak keberatan'],
            sha256_prompt: null, rincian: { rencana: kunciRencana(r), versi, pesan: o.pesan, pilihan: o.pilihan, kunci: o.kunci, varian: Object.fromEntries(Object.entries(pilihan).map(([s, v]) => [s, v.id])), dicatat: kode.dicatat },
            peran: 'pemeriksa',
          });
          if (kode.menolak.length > 0) {
            selesaiVersi('kode', kode.menolak.map((m) => `${m.sumber} (${m.lokasi}): ${m.alasan}`));
            const tindak = await tindakLokasi(kode.menolak.map((m) => ({ lokasi: m.lokasi, alasan: `${m.sumber}: ${m.alasan}` })), 'kode');
            if (tindak === 'ganti-rencana') break;
            continue;
          }

          // --- 3. penebak keluarga campur
          const mulaiT = jam().toISOString();
          const t = await penebakCampur(o, { panggil, putaran, omongan: no, setelan: setelan.penebak, hentiDini: true });
          cv.penebak = t;
          cv.titik_buta = disempurnakan && t.tebakan.some((x) => x.ke === 1);
          const semuaT = t.tebakan.flatMap((x) => x.panggilan);
          catat({
            putaran, jenis: 'gerbang-tebak', omongan: no, waktu_mulai: mulaiT, waktu_selesai: jam().toISOString(), model: t.tebakan.map((x) => x.model).join(' + '),
            panggilan: semuaT.length, token_masuk: jumlah(semuaT, (x) => x.token_masuk), token_keluar: jumlah(semuaT, (x) => x.token_keluar), biaya_usd: jumlah(semuaT, (x) => x.biaya_usd),
            putusan: t.tolak ? 'tolak' : 'lolos', alasan: [t.alasan, ...(cv.titik_buta ? ['KEMUNGKINAN TITIK BUTA: pilihan omongan ini pernah disempurnakan Haiku, dan Haiku juga menebak'] : [])],
            sha256_prompt: null,
            rincian: {
              kunci: o.kunci, tidak_dipanggil: t.tidak_dipanggil, titik_buta: cv.titik_buta,
              tebakan: t.tebakan.map((x) => ({ ke: x.ke, model: x.model, pilihan: x.pilihan, yakin: x.yakin, benar: x.benar, terbaca: x.terbaca, alasan: x.alasan, penyedia: x.panggilan.map((y) => y.penyedia ?? null), token_penalaran: x.panggilan.map((y) => y.token_penalaran ?? null) })),
            },
            peran: 'penebak',
          });
          if (t.tolak && setelan.penebak.aturan !== 'dicatat') {
            selesaiVersi('penebak', [t.alasan]);
            const tindak = await tindakLokasi([{ lokasi: 'pilihan', alasan: t.alasan }], 'tertebak');
            if (tindak === 'ganti-rencana') break;
            continue;
          }

          // --- 4. pembaca kartu
          const mulaiK = jam().toISOString();
          const k = await pembacaKartu(o, paket, panggil, putaran, no);
          cv.kartu = k;
          const benarK = k.pilihan === o.kunci;
          if ((k.membingungkan ?? []).length > 0) cv.dicatat.push(`pembaca kartu bingung: ${(k.membingungkan ?? []).map((x) => `"${x.kutipan}"`).join('; ')}`);
          const tolakK = !benarK && setelan.kartu === 'menolak';
          if (!benarK && setelan.kartu === 'dicatat') cv.dicatat.push(`pembaca kartu (dicatat): ${k.alasan}`);
          catat({
            putaran, jenis: 'gerbang-kartu', omongan: no, waktu_mulai: mulaiK, waktu_selesai: jam().toISOString(), model: MODEL_OR_DEEPSEEK,
            panggilan: k.panggilan.length, token_masuk: jumlah(k.panggilan, (x) => x.token_masuk), token_keluar: jumlah(k.panggilan, (x) => x.token_keluar), biaya_usd: jumlah(k.panggilan, (x) => x.biaya_usd),
            putusan: tolakK ? 'tolak' : 'lolos', alasan: [benarK ? `pembaca yang memegang kartu memilih "${String(k.pilihan)}" = kunci` : k.alasan], sha256_prompt: null,
            rincian: { kunci: o.kunci, pilihan: k.pilihan, kartu_ditunjuk: k.kartu_ditunjuk, menunjuk_penentu: k.menunjuk_penentu, alasan_penjawab: k.alasan_penjawab, membingungkan: k.membingungkan ?? [] },
            peran: 'pembaca-kartu',
          });
          if (tolakK) {
            selesaiVersi('kartu', [k.alasan]);
            const dipilih = k.pilihan === null ? null : slotDariHuruf(hurufKunci, k.pilihan);
            const tindak = await tindakLokasi([{ lokasi: 'pilihan', alasan: `pembaca kartu memilih pilihan ${dipilih ?? '(tak terbaca)'} ("${k.pilihan === null ? '' : o.pilihan[k.pilihan]}"); alasannya: ${k.alasan_penjawab}` }], 'pembaca-kartu');
            if (tindak === 'ganti-rencana') break;
            continue;
          }

          // --- 5. kritikus makna (paling akhir)
          const mulaiR = jam().toISOString();
          let kr = await kritikusMakna(o, paket, k, panggil, putaran, no);
          if (!kr.menjawab && !setelan.kritikus.dicatat) {
            // Tidak menjawab → versi yang sama diperiksa kritikus sekali lagi (pra-registrasi §3).
            cv.dicatat.push(`kritikus tidak menjawab (${kr.keberatan[0]?.alasan ?? '-'}); diperiksa sekali lagi`);
            const ulang = await kritikusMakna(o, paket, k, panggil, putaran, no);
            kr = { ...ulang, panggilan: [...kr.panggilan, ...ulang.panggilan] };
          }
          cv.kritik = kr;
          const tolakR = kritikusMenolakTemplat(kr, setelan.kritikus);
          if (!tolakR && !kr.tanpa_keberatan) cv.dicatat.push(...umpanKritik(kr).map((a) => `kritikus (dicatat): ${a}`));
          catat({
            putaran, jenis: 'kritikus', omongan: no, waktu_mulai: mulaiR, waktu_selesai: jam().toISOString(), model: 'z-ai/glm-5.3',
            panggilan: kr.panggilan.length, token_masuk: jumlah(kr.panggilan, (x) => x.token_masuk), token_keluar: jumlah(kr.panggilan, (x) => x.token_keluar), biaya_usd: jumlah(kr.panggilan, (x) => x.biaya_usd),
            putusan: tolakR ? 'tolak' : 'lolos', alasan: kr.tanpa_keberatan ? ['kritikus tidak keberatan'] : umpanKritik(kr), sha256_prompt: null,
            rincian: { menjawab: kr.menjawab, terpotong: kr.terpotong, keberatan: kr.keberatan, arahan: kr.arahan, cek_makna: kr.cek_makna ?? null, token_penalaran: kr.panggilan.map((x) => x.token_penalaran ?? null), penyedia: kr.panggilan.map((x) => x.penyedia ?? null) },
            peran: 'kritikus',
          });
          if (tolakR) {
            selesaiVersi('kritikus', kr.menjawab ? umpanKritik(kr) : ['kritikus tidak menjawab (dua kali)']);
            // Tidak menjawab dua kali = versi ini ditolak; rencana TIDAK dibuang (pra-registrasi §3: ≤ 4 versi per rencana).
            // Perbaikan sesudah jalan TIRT M2d-10: versi sebelumnya membuang rencana di sini.
            if (!kr.menjawab) continue;
            const lok = dariKritik(kr, o).map((u) => ({ lokasi: (u.lokasi === 'pesan' ? 'pesan' : u.lokasi === 'penjelasan' ? 'penjelasan' : 'pilihan') as MasalahKode['lokasi'], alasan: `kritikus: ${u.alasan}` }));
            const tindak = await tindakLokasi(lok.length > 0 ? lok : [{ lokasi: 'pilihan', alasan: umpanKritik(kr).join(' ') }], 'kritikus');
            if (tindak === 'ganti-rencana') break;
            continue;
          }

          // --- lolos: dikunci
          selesaiVersi('lolos', []);
          terkunci.add(no);
          const kc: KunciTemplat = { no, rencana: r, pilihan, tulisan, penjelasan, omongan: o, penyempurna_dipakai: disempurnakan };
          hasil.kunci.push(kc);
          opsi.saatKunci?.(kc);
          break posisi;
        } catch (galat) {
          if (galat instanceof PaguTercapai) {
            selesaiVersi('pagu', [teksGalat(galat)]);
            hasil.berhenti = galat.name === 'PenyediaTidakTersedia' ? `penyedia tidak tersedia: ${galat.message}` : `pagu tercapai: ${galat.message}`;
            return akhiri();
          }
          selesaiVersi('galat', [teksGalat(galat)]);
          catat({
            putaran, jenis: 'validator', omongan: no, waktu_mulai: jam().toISOString(), waktu_selesai: jam().toISOString(), model: null, panggilan: 0,
            token_masuk: 0, token_keluar: 0, biaya_usd: 0, putusan: 'galat', alasan: [teksGalat(galat)], sha256_prompt: null, rincian: {}, peran: 'pemeriksa',
          });
          continue;
        }

        /** Tindak lanjut penolakan per lokasi. */
        async function tindakLokasi(masalah: Array<{ lokasi: MasalahKode['lokasi']; alasan: string }>, jenis: JenisKegagalan): Promise<'lanjut' | 'ganti-rencana'> {
          if (masalah.some((m) => m.lokasi === 'struktur')) return 'ganti-rencana';
          const diPilihan = masalah.filter((m) => m.lokasi === 'pilihan');
          const diPesan = masalah.filter((m) => m.lokasi === 'pesan');
          const diPenjelasan = masalah.filter((m) => m.lokasi === 'penjelasan');
          if (diPesan.length > 0) {
            umpanPesan = diPesan.map((m) => m.alasan);
            tulisan = null;
            penjelasan = null;
          }
          if (diPenjelasan.length > 0) {
            umpanPenjelasan = diPenjelasan.map((m) => m.alasan);
            penjelasan = null;
          }
          if (diPilihan.length > 0) {
            if (penyempurnaan >= MAKS_PENYEMPURNAAN) return diPesan.length + diPenjelasan.length > 0 ? 'lanjut' : 'ganti-rencana';
            penyempurnaan += 1;
            const berubah = await sempurnakan(diPilihan.map((m) => m.alasan), jenis);
            if (berubah) {
              penjelasan = null;
              disempurnakan = true;
            } else if (diPesan.length + diPenjelasan.length === 0) return penyempurnaan >= MAKS_PENYEMPURNAAN ? 'ganti-rencana' : 'lanjut';
          }
          return 'lanjut';
        }

        async function sempurnakan(alasan: string[], jenis: JenisKegagalan): Promise<boolean> {
          const pesan = pesanPenyempurna({ paket, r, pilihan, jenis, alasan });
          const mulai = jam().toISOString();
          const j = await panggil(pesan, { ...SETELAN_PENYEMPURNA }, info('sempurnakan-pilihan', putaran, no, 'penyempurna', MODEL_PENYEMPURNA));
          const u = uraiPenyempurna(j.teks);
          const v = u === null ? null : verifikasiPerbaikan(r, paket, pilihan, u.pilihan);
          const cp: CatatanPenyempurnaan = {
            no, rencana: kunciRencana(r), putaran, jenis, terbaca: u !== null,
            diterima: v?.diterima.map((x) => ({ slot: x.slot, varian: x.varian, dari: x.dari, ke: x.ke })) ?? [],
            dibuang: v?.dibuang ?? (u === null ? [{ slot: '-', alasan: 'keluaran tak terbaca' }] : []),
          };
          hasil.penyempurnaan.push(cp);
          catat({
            putaran, jenis: 'sempurnakan-pilihan', omongan: no, waktu_mulai: mulai, waktu_selesai: jam().toISOString(), model: MODEL_PENYEMPURNA, panggilan: 1,
            token_masuk: j.token_masuk, token_keluar: j.token_keluar, biaya_usd: j.biaya_usd, putusan: cp.diterima.length > 0 ? 'ditulis' : 'tolak',
            alasan: [`${jenis}: ${cp.diterima.length} slot diterima kode, ${cp.dibuang.length} dibuang`, ...cp.dibuang.map((d) => `dibuang ${d.slot}: ${d.alasan}`)],
            sha256_prompt: hashPesan(pesan), rincian: { diterima: cp.diterima, dibuang: cp.dibuang, alasan_penyempurna: u?.alasan ?? null, teks_mentah: j.teks, penyedia: j.penyedia ?? null },
            peran: 'penyempurna',
          });
          if (v !== null && v.diterima.length > 0) {
            pilihan = v.pilihan;
            return true;
          }
          return false;
        }
      }
      // rencana habis → pengganti
      if (rencanaKe >= MAKS_RENCANA_POSISI) {
        hasil.berhenti = `omongan ${String(no)} gagal di ${String(rencanaKe)} rencana soal; simulasi tidak terbit`;
        return akhiri();
      }
      const lain = [1, 2, 3].filter((x) => x !== no).map((x) => (terkunci.has(x) ? (hasil.kunci.find((k) => k.no === x)?.rencana as RencanaSoal) : (rencanaPosisi[x - 1] as RencanaSoal)));
      const perluBetul = r.klaim.label === 'Betul' && !lain.some((x) => x.klaim.label === 'Betul');
      const baru = penggantiRencana(calon, dipakai, lain, perluBetul);
      catat({
        putaran, jenis: 'buang-sudut', omongan: no, waktu_mulai: jam().toISOString(), waktu_selesai: jam().toISOString(), model: null, panggilan: 0,
        token_masuk: 0, token_keluar: 0, biaya_usd: 0, putusan: 'tolak',
        alasan: [`rencana ${kunciRencana(r)} habis (${String(maksVersi)} versi atau struktur/penyempurna habis)`, baru === null ? 'tidak ada rencana pengganti yang cocok' : `pengganti: ${kunciRencana(baru)}`],
        sha256_prompt: null, rincian: { dibuang: kunciRencana(r), pengganti: baru === null ? null : kunciRencana(baru) }, peran: 'perencana',
      });
      if (baru === null) {
        hasil.berhenti = `omongan ${String(no)}: rencana ${kunciRencana(r)} habis dan tidak ada rencana pengganti; simulasi tidak terbit`;
        return akhiri();
      }
      dipakai.add(kunciRencana(baru));
      rencanaPosisi[no - 1] = baru;
      r = baru;
      rencanaKe += 1;
      gabung[no - 1] = null;
    }
  }

  // --- 6. draf gabungan: validator seluruh draf
  const draf: DrafSimulasi = { omongan: [1, 2, 3].map((no) => hasil.kunci.find((k) => k.no === no)?.omongan as OmonganDraf) };
  const sisa = validasiM2d8(draf, paket);
  catat({
    putaran, jenis: 'validator', omongan: null, waktu_mulai: jam().toISOString(), waktu_selesai: jam().toISOString(), model: null, panggilan: 0,
    token_masuk: 0, token_keluar: 0, biaya_usd: 0, putusan: sisa.length > 0 ? 'tolak' : 'lolos',
    alasan: sisa.length > 0 ? sisa.map((m) => `${m.omongan === null ? 'seluruh draf' : `omongan ${String(m.omongan)}`}: [${m.kode}] ${m.pesan}`) : ['draf gabungan lolos validator'],
    sha256_prompt: null, rincian: {}, peran: 'pemeriksa',
  });
  const menolakSisa = sisa.filter((m) => !['ANDAIAN_DI_PENJELASAN', 'PENJELASAN_TANPA_PENENTU'].includes(m.kode));
  if (menolakSisa.length > 0) {
    hasil.berhenti = `draf akhir ditolak validator: ${menolakSisa.map((m) => m.kode).join(', ')}`;
    return akhiri();
  }
  hasil.lolos = true;
  hasil.draf = draf;
  return akhiri();

  function info(jenis: InfoTemplat['jenis'], p: number, no: number, peran: InfoTemplat['peran'], model: InfoTemplat['model']): Omit<InfoTemplat, 'ulang'> {
    return { jenis, putaran: p, omongan: no, ke: 1, peran, model };
  }

  function catatTulis(jenis: JenisLangkah, p: number, no: number, pesan: Parameters<typeof hashPesan>[0]): (c: CatatanTulis) => void {
    return (c) => {
      catat({
        putaran: p, jenis, omongan: no, waktu_mulai: jam().toISOString(), waktu_selesai: jam().toISOString(), model: MODEL_OR_DEEPSEEK, panggilan: 1,
        token_masuk: c.jawaban.token_masuk, token_keluar: c.jawaban.token_keluar, biaya_usd: c.jawaban.biaya_usd, putusan: 'ditulis',
        alasan: [`${jenis === 'tulis-pesan' ? 'pesan' : 'penjelasan'} omongan ${String(no)}${c.berpikir ? '' : ' — cadangan tanpa berpikir'}${c.terurai ? '' : ' (tak terbaca)'}`],
        sha256_prompt: hashPesan(pesan),
        rincian: { terurai: c.terurai, finish_reason: c.jawaban.finish_reason, teks_mentah: c.jawaban.teks, penyedia: c.jawaban.penyedia ?? null },
        peran: 'penulis' as PeranLangkah,
      });
    };
  }
}
