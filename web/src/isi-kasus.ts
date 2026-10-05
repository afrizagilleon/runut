/**
 * Pembacaan isi satu berkas kasus — fungsi murni, tanpa satu pun berkas kasus.
 *
 * Dipisahkan dari `kasus.ts` di M4 karena alasan yang bisa diukur: `kasus.ts`
 * mengimpor berkas JSON yang sungguhan, sehingga setiap modul yang hanya butuh
 * "ambil urutan soal dari sebuah Kasus" ikut menyeret seluruh isi kasus ke
 * dalam dirinya — termasuk berkas tes yang sebetulnya memakai kasus buatan.
 *
 * `kasus.ts` meneruskan semuanya kembali, jadi tidak ada pemanggil lama yang
 * perlu berubah.
 */
import type { Fakta, Kasus, Soal } from '../../factory/skema/tipe.ts';
import { KASUS_DARI_AGEN, kasusDariAgen } from '../../factory/kasus/asal-agen.ts';

export function indeksFakta(kasus: Kasus): Map<string, Fakta> {
  return new Map(kasus.fakta.map((f) => [f.fact_id, f]));
}

export function faktaTerlihat(kasus: Kasus): Fakta[] {
  const indeks = indeksFakta(kasus);
  return kasus.fakta_terlihat
    .map((id) => indeks.get(id))
    .filter((f): f is Fakta => f !== undefined);
}

export function faktaPembukaan(kasus: Kasus): Fakta[] {
  const indeks = indeksFakta(kasus);
  return kasus.pembukaan.fact_ids
    .map((id) => indeks.get(id))
    .filter((f): f is Fakta => f !== undefined);
}

/** Kartu fakta satu soal, berurutan seperti di berkas kasus. */
export function kartuSoal(kasus: Kasus, soal: Soal): Fakta[] {
  const indeks = indeksFakta(kasus);
  return soal.kartu.map((id) => indeks.get(id)).filter((f): f is Fakta => f !== undefined);
}

export function urutanSoal(kasus: Kasus): string[] {
  return kasus.soal.map((s) => s.soal_id);
}

export function kunciBenar(kasus: Kasus): Record<string, string> {
  const peta: Record<string, string> = {};
  for (const s of kasus.soal) peta[s.soal_id] = s.jawaban;
  return peta;
}

export function petaKartu(kasus: Kasus): Record<string, string[]> {
  const peta: Record<string, string[]> = {};
  for (const s of kasus.soal) peta[s.soal_id] = [...s.kartu];
  return peta;
}

/**
 * Siapa yang menyusun soal simulasi ini — kalimat suara kami di layar
 * pembukaan, di atas pintu ke dapur agen.
 *
 * Sampai kasus AMAG ada, kalimat ini ditulis mati di `Aplikasi.tsx` dan
 * berbunyi "…disusun Claude bersama pemilik… Agen otomatis kami sedang belajar
 * membuat soal baru, dan belum ada yang tayang." Begitu satu simulasi yang
 * soalnya tulisan agent ikut tayang, kalimat itu salah dua kali: di simulasi
 * agent ia menyebut penulis yang keliru, dan di simulasi lain "belum ada yang
 * tayang" tidak benar lagi. Karena itu ia dihitung dari asal simulasinya
 * (`factory/kasus/asal-agen.ts`), bukan diketik per layar.
 *
 * Yang dikatakan untuk simulasi agent hanya yang bisa dibuktikan dari repo:
 * soalnya ditulis agent dan lolos gerbangnya (bank omongan), teks kartu dan
 * layar pembukaannya ditulis penyetuju (lampiran). Ia TIDAK mengatakan "diuji
 * dan disetujui manusia".
 */
export function keteranganPenyusun(kasus_id: string): string {
  if (kasusDariAgen(kasus_id)) {
    // Diringkas atas kata pemilik (5 Okt): satu kalimat pendek.
    return 'Soal simulasi ini ditulis agen AI kami dan diperiksa Claude (model AI).';
  }
  const manusia = 'Soal di simulasi ini disusun Claude (model AI) bersama pemilik, lalu diuji dan disetujui manusia.';
  return KASUS_DARI_AGEN.length === 0
    ? `${manusia} Agen otomatis kami sedang belajar membuat soal baru, dan belum ada yang tayang.`
    : `${manusia} Agen otomatis kami juga menulis soal; simulasi yang soalnya ia tulis diberi keterangan sendiri.`;
}
