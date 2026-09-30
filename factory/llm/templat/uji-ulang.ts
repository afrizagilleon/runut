/**
 * Uji ulang draf templat yang disunting penyetuju (pintu penyusun M2d-9 D-5,
 * dipasang M2d-10 D-6): validator draf gabungan, lalu untuk tiap omongan yang
 * disunting gerbang yang SAMA dengan lingkar templat, dengan setelan yang sama
 * — `periksaKodeTemplat` → `penebakCampur` → `pembacaKartu` → `kritikusMakna`
 * (tanpa penulis dan tanpa penyempurna: suntingan manusia tidak ditulis ulang).
 */
import type { KeadaanOmongan } from '../agen-pengecoh.ts';
import type { KunciOpsi, MasalahDraf } from '../draf.ts';
import { validasiM2d8 } from '../kalibrasi-soal.ts';
import { umpanKritik } from '../kritikus.ts';
import { PaguTercapai } from '../pagu.ts';
import type { PaketFakta } from '../paket.ts';
import { kritikusMakna, kritikusMenolakTemplat, pembacaKartu, penebakCampur, type SetelanTumpukan } from './gerbang.ts';
import { periksaKodeTemplat } from './kode.ts';
import type { PanggilTemplat } from './penulis.ts';
import type { NamaSlot, RencanaSoal, VarianPilihan } from './pola.ts';
import { hurufSlot, SLOT, type PilihanAktif } from './rakit.ts';

export interface KeadaanTemplat {
  rencana: RencanaSoal;
  varian: Record<NamaSlot, string>;
  hurufKunci: KunciOpsi;
}

export interface HasilUjiUlangTemplat {
  lolos: boolean;
  berhenti: string | null;
  masalah: MasalahDraf[];
  per_omongan: Array<{ no: number; lolos: boolean; status: string; alasan: string[]; dicatat: string[] }>;
}

/** Pilihan aktif dari keadaan: varian (id & proposisi) dari rencana, teks dari omongan (sesudah suntingan). */
export function pilihanDariKeadaan(k: KeadaanOmongan & { templat: KeadaanTemplat }): PilihanAktif {
  const peta = hurufSlot(k.templat.hurufKunci);
  return Object.fromEntries(
    SLOT.map((s) => {
      const v = k.templat.rencana.slot.find((x) => x.slot === s)?.varian.find((x) => x.id === k.templat.varian[s]) as VarianPilihan;
      return [s, { ...v, teks: k.omongan.pilihan[peta[s]] }];
    }),
  ) as PilihanAktif;
}

export async function ujiUlangTemplat(o: {
  paket: PaketFakta;
  keadaan: readonly KeadaanOmongan[];
  diuji: readonly number[];
  panggil: PanggilTemplat;
  setelan: SetelanTumpukan;
  putaran?: number;
}): Promise<HasilUjiUlangTemplat> {
  const putaran = o.putaran ?? 1;
  const gabung = o.keadaan.map((k) => k.omongan);
  const masalah = validasiM2d8({ omongan: gabung }, o.paket).filter((m) => !['ANDAIAN_DI_PENJELASAN', 'PENJELASAN_TANPA_PENENTU'].includes(m.kode));
  const hasil: HasilUjiUlangTemplat = { lolos: false, berhenti: null, masalah, per_omongan: [] };
  for (const no of [...o.diuji].sort((a, b) => a - b)) {
    const k = o.keadaan[no - 1];
    if (k?.templat === undefined) throw new Error(`Omongan ${String(no)} bukan keluaran mesin templat.`);
    const kt = k as KeadaanOmongan & { templat: KeadaanTemplat };
    const om = kt.omongan;
    const tulisan = { nama: om.nama, jam: om.jam, pesan: om.pesan };
    const namaLain = o.keadaan.filter((x) => x.no !== no).map((x) => x.omongan.nama);
    const catat = (status: string, alasan: string[], dicatat: string[], lolos = false): void => {
      hasil.per_omongan.push({ no, lolos, status, alasan, dicatat });
    };
    try {
      const kode = periksaKodeTemplat({ no, o: om, r: kt.templat.rencana, pilihan: pilihanDariKeadaan(kt), tulisan, paket: o.paket, namaLain, gabung, terkunci: new Set([1, 2, 3].filter((x) => x !== no)) });
      const dicatat = kode.dicatat.map((m) => `${m.sumber}: ${m.alasan}`);
      if (kode.menolak.length > 0) {
        catat('ditolak-pemeriksa', kode.menolak.map((m) => `${m.sumber} (${m.lokasi}): ${m.alasan}`), dicatat);
        continue;
      }
      const t = await penebakCampur(om, { panggil: o.panggil, putaran, omongan: no, setelan: o.setelan.penebak, hentiDini: true });
      if (t.tolak && o.setelan.penebak.aturan !== 'dicatat') {
        catat('ditolak-tebak', [t.alasan], dicatat);
        continue;
      }
      const kartu = await pembacaKartu(om, o.paket, o.panggil, putaran, no);
      if (kartu.pilihan !== om.kunci && o.setelan.kartu === 'menolak') {
        catat('ditolak-kartu', [kartu.alasan], dicatat);
        continue;
      }
      let kr = await kritikusMakna(om, o.paket, kartu, o.panggil, putaran, no);
      if (!kr.menjawab && !o.setelan.kritikus.dicatat) {
        const ulang = await kritikusMakna(om, o.paket, kartu, o.panggil, putaran, no);
        kr = { ...ulang, panggilan: [...kr.panggilan, ...ulang.panggilan] };
      }
      if (kritikusMenolakTemplat(kr, o.setelan.kritikus)) {
        catat('ditolak-kritikus', kr.menjawab ? umpanKritik(kr) : ['kritikus tidak menjawab (dua kali)'], dicatat);
        continue;
      }
      catat('lolos', [], [...dicatat, ...(kr.tanpa_keberatan ? [] : umpanKritik(kr).map((a) => `kritikus (dicatat): ${a}`))], true);
    } catch (galat) {
      if (galat instanceof PaguTercapai) {
        catat('pagu', [`pagu tercapai: ${galat.message}`], []);
        hasil.berhenti = `pagu tercapai: ${galat.message}`;
        return hasil;
      }
      catat('galat', [galat instanceof Error ? `${galat.name}: ${galat.message}` : 'galat'], []);
    }
  }
  hasil.lolos = masalah.length === 0 && hasil.per_omongan.length === o.diuji.length && hasil.per_omongan.every((x) => x.lolos);
  return hasil;
}
