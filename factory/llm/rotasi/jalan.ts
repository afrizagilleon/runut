/**
 * Pemanggil protokol rotasi M2d-11 D-2 (berbayar): 24 panggilan tebak
 * (3 keluarga × 4 rotasi × 2 kondisi) + pembaca kartu pada 2 rotasi.
 *
 * - Tiap keluarga berjalan berurutan (rotasi, kondisi); ketiga keluarga
 *   serentak — pagu tetap ditegakkan sebelum tiap panggilan (`chatBerpagu`
 *   memesan perkiraan maksimum panggilan yang sedang berjalan).
 * - Jawaban tak terbaca/tak terpetakan diulang sekali dengan panggilan baru;
 *   tetap gagal → tak terbaca (dihitung kunci oleh agregasi).
 * - Tanpa henti dini: data lengkap untuk H2 (pra-registrasi §5, §8).
 */
import type { OmonganDraf } from '../draf.ts';
import type { PutusanKartu } from '../gerbang-kartu.ts';
import { PaguTercapai } from '../pagu.ts';
import type { PaketFakta } from '../paket.ts';
import { pembacaKartu } from '../templat/gerbang.ts';
import type { PanggilTemplat } from '../templat/penulis.ts';
import { agregasiRotasi, HURUF_ROTASI, KONDISI, MODEL_ROTASI, pesanRotasi, petakanSalinan, putar, ROTASI, ROTASI_KARTU, uraiSalinan, type JawabanRotasi, type PutusanRotasi } from './rotasi.ts';

export interface OpsiRotasi {
  panggil: PanggilTemplat;
  putaran: number;
  omongan: number;
}

/** Nomor panggilan 1…24 (untuk tag `t<ke>`): kondisi × 12 + model × 4 + r + 1. */
export const keRotasi = (kondisi: number, model: number, r: number): number => kondisi * 12 + model * 4 + r + 1;

export interface HasilTebakRotasi {
  jawaban: JawabanRotasi[];
  putusan: PutusanRotasi;
  biaya_usd: number;
}

export async function tebakRotasi(o: OmonganDraf, opsi: OpsiRotasi): Promise<HasilTebakRotasi> {
  const isiKunci = HURUF_ROTASI.indexOf(o.kunci);
  const perModel = MODEL_ROTASI.map(async (m, mi) => {
    const hasil: JawabanRotasi[] = [];
    for (const [ki, k] of KONDISI.entries()) {
      for (const r of ROTASI) {
        const p = putar(o, r);
        const soal = { nama: o.nama, jam: o.jam, pesan: o.pesan, pilihan: p.pilihan };
        let biaya = 0;
        let panggilan = 0;
        let jawab: JawabanRotasi | null = null;
        let terakhir = '';
        for (let ulang = 0; ulang < 2 && jawab === null; ulang++) {
          const j = await opsi.panggil(pesanRotasi(k, soal), { ...m.setelan }, {
            jenis: 'gerbang-tebak', putaran: opsi.putaran, omongan: opsi.omongan, ke: keRotasi(ki, mi, r), ...(ulang > 0 ? { ulang } : {}), peran: 'penebak', model: m.model,
          });
          biaya += j.biaya_usd;
          panggilan += 1;
          terakhir = j.teks;
          const u = uraiSalinan(j.teks);
          if (u === null) continue;
          const peta = petakanSalinan(u.teks, p.pilihan);
          if (peta.huruf === null) continue;
          jawab = { model: m.model, kondisi: k, r, huruf: peta.huruf, isi: p.asal[peta.huruf], isi_kunci: isiKunci, terbaca: true, salinan: u.teks, skor: peta.skor, alasan: u.alasan, biaya_usd: 0, panggilan: 0 };
        }
        hasil.push({
          ...(jawab ?? { model: m.model, kondisi: k, r, huruf: null, isi: null, isi_kunci: isiKunci, terbaca: false, salinan: terakhir.slice(0, 300), skor: null, alasan: '(tak terbaca/tak terpetakan)' }),
          biaya_usd: biaya,
          panggilan,
        });
      }
    }
    return hasil;
  });
  const hasil = await Promise.allSettled(perModel);
  const pagu = hasil.find((x): x is PromiseRejectedResult => x.status === 'rejected');
  if (pagu !== undefined) throw pagu.reason instanceof Error ? pagu.reason : new Error(String(pagu.reason));
  const jawaban = hasil.flatMap((x) => (x.status === 'fulfilled' ? x.value : []));
  return { jawaban, putusan: agregasiRotasi(jawaban), biaya_usd: jawaban.reduce((a, x) => a + x.biaya_usd, 0) };
}

export interface KartuRotasi {
  r: number;
  kunci: string;
  pilihan: string | null;
  benar: boolean;
  menunjuk_penentu: boolean;
  bingung: string[];
  alasan: string;
  biaya_usd: number;
  putusan: PutusanKartu;
}

/** Pembaca kartu pada rotasi r0 dan r2; syarat 1 = benar di keduanya. */
export async function kartuRotasi(o: OmonganDraf, paket: PaketFakta, opsi: OpsiRotasi): Promise<{ per_rotasi: KartuRotasi[]; lulus: boolean }> {
  const per: KartuRotasi[] = [];
  for (const r of ROTASI_KARTU) {
    const p = putar(o, r);
    const k = await pembacaKartu({ ...o, pilihan: p.pilihan, kunci: p.kunci }, paket, opsi.panggil, opsi.putaran, opsi.omongan);
    per.push({
      r,
      kunci: p.kunci,
      pilihan: k.pilihan,
      benar: k.pilihan === p.kunci,
      menunjuk_penentu: k.menunjuk_penentu,
      bingung: (k.membingungkan ?? []).map((x) => x.kutipan),
      alasan: k.alasan_penjawab,
      biaya_usd: k.panggilan.reduce((a, x) => a + x.biaya_usd, 0),
      putusan: k,
    });
  }
  return { per_rotasi: per, lulus: per.every((x) => x.benar) };
}

export { PaguTercapai };
