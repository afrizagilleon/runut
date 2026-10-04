/**
 * Pemanggil tebak rotasi v2 (M2d-16 D-1, jalur berbayar BARU; `tebakRotasi`
 * M2d-11 tidak diubah): 24 panggilan yang sama (3 keluarga × 4 rotasi × 2
 * kondisi, prompt dan setelan sama), tetapi salinan dipetakan `petakanSalinanV2`
 * (cocok persis dulu) dan diputus `agregasiRotasiV2` (saringan murah).
 */
import type { OmonganDraf } from '../draf.ts';
import type { PanggilTemplat } from '../templat/penulis.ts';
import { keRotasi } from './jalan.ts';
import { MODEL_OR_HAIKU } from '../model.ts';
import { HURUF_ROTASI, KONDISI, MODEL_ROTASI, pesanRotasi, putar, ROTASI, uraiSalinan, type JawabanRotasi } from './rotasi.ts';
import { agregasiRotasiV2, petakanSalinanV2, type PutusanRotasiV2 } from './rotasi-v2.ts';

export interface HasilTebakRotasiV2 {
  jawaban: JawabanRotasi[];
  putusan: PutusanRotasiV2;
  biaya_usd: number;
}

export async function tebakRotasiV2(o: OmonganDraf, opsi: { panggil: PanggilTemplat; putaran: number; omongan: number }): Promise<HasilTebakRotasiV2> {
  const isiKunci = HURUF_ROTASI.indexOf(o.kunci);
  const perModel = MODEL_ROTASI.map(async (m, mi) => {
    const hasil: JawabanRotasi[] = [];
    for (const [ki, k] of KONDISI.entries()) {
      // M2d-20: Haiku menolak menjawab kondisi tanpa pesan (28 dari 54 panggilan, 14 ulangan berbayar); kondisi itu hanya diagnosis.
      if (k === 'pilihan-saja' && m.model === MODEL_OR_HAIKU) continue;
      for (const r of ROTASI) {
        const p = putar(o, r);
        const pesan = pesanRotasi(k, { nama: o.nama, jam: o.jam, pesan: o.pesan, pilihan: p.pilihan });
        let biaya = 0;
        let panggilan = 0;
        let jawab: Omit<JawabanRotasi, 'biaya_usd' | 'panggilan'> | null = null;
        let terakhir = '';
        for (let ulang = 0; ulang < 2 && jawab === null; ulang++) {
          const j = await opsi.panggil(pesan, { ...m.setelan }, { jenis: 'gerbang-tebak', putaran: opsi.putaran, omongan: opsi.omongan, ke: keRotasi(ki, mi, r), ...(ulang > 0 ? { ulang } : {}), peran: 'penebak', model: m.model });
          biaya += j.biaya_usd;
          panggilan += 1;
          terakhir = j.teks;
          const u = uraiSalinan(j.teks);
          if (u === null) continue;
          const peta = petakanSalinanV2(u.teks, p.pilihan);
          if (peta.huruf === null) continue;
          jawab = { model: m.model, kondisi: k, r, huruf: peta.huruf, isi: p.asal[peta.huruf], isi_kunci: isiKunci, terbaca: true, salinan: u.teks, skor: peta.skor, alasan: u.alasan };
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
  const gagal = hasil.find((x): x is PromiseRejectedResult => x.status === 'rejected');
  if (gagal !== undefined) throw gagal.reason instanceof Error ? gagal.reason : new Error(String(gagal.reason));
  const jawaban = hasil.flatMap((x) => (x.status === 'fulfilled' ? x.value : []));
  return { jawaban, putusan: agregasiRotasiV2(jawaban), biaya_usd: jawaban.reduce((a, x) => a + x.biaya_usd, 0) };
}
