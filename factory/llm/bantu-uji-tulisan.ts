/**
 * Tulisan penulis palsu untuk uji lingkar PENGECOH (M2d-7): paket TIRT
 * sungguhan (terlacak, `eval/keluaran-m2d6/jalan-1/tirt/paket.json`); tulisan
 * memakai bank pengecoh sungguhan (label P… dari `bankPengecoh`) dan lolos
 * semua gerbang kode (dites).
 */
import { readFileSync } from 'node:fs';
import { AKAR } from './env.ts';
import type { PaketFakta } from './paket.ts';

export const PAKET_T = JSON.parse(readFileSync(`${AKAR}eval/keluaran-m2d6/jalan-1/tirt/paket.json`, 'utf8')) as PaketFakta;

/** Tulisan palsu per omongan: pesan, empat pilihan (urutan tulisan, dengan sumber), penjelasan. */
export interface TulisanPalsu {
  pesan: { nama: string; jam: string; pesan: string; angka_pesan: Array<{ teks: string; fact_id: string }>; klaim_dari: string | null };
  pilihan: Array<{ teks: string; sumber: string }>;
  penjelasan: string;
}

/**
 * Tulisan yang lolos semua gerbang kode untuk sudut awal TIRT (dicek di tes):
 * omongan 1 KELIRU (sudut susp-2025-12-10), 2 BETUL (naik…), 3 KELIRU (rups…).
 */
export const TULISAN: Readonly<Record<number, TulisanPalsu>> = {
  1: {
    pesan: { nama: 'Sari', jam: '19.20', pesan: 'Sahamnya disetop bursa hari ini, katanya gara-gara bursa ragu usahanya bisa jalan terus.', angka_pesan: [], klaim_dari: 'P3' },
    pilihan: [
      { teks: 'Keliru, setop hari ini karena harganya naik tinggi.', sumber: 'kunci' },
      { teks: 'Betul, setop hari ini karena bursa ragu usahanya jalan.', sumber: 'P3' },
      { teks: 'Betul, alasan ragu itu tercatat untuk setop [[susp-2025-01-21|21 Januari]].', sumber: 'P1' },
      { teks: 'Keliru, hari ini yang diumumkan cuma jadwal rapat pemegang saham.', sumber: 'P4' },
    ],
    penjelasan:
      'Pengumuman bursa [[susp-2025-12-10|10 Desember 2025]] menyebut alasannya harga yang naik tinggi, untuk mendinginkan. ' +
      'Alasan ragu soal kelangsungan usaha itu milik setop [[susp-2025-01-21|21 Januari 2025]]. ' +
      'Salah-kaprah yang umum: mengira semua setop bursa punya alasan yang sama.',
  },
  2: {
    pesan: {
      nama: 'Andi', jam: '20.45', pesan: 'Dari 26 November sampai kemarin naiknya 58 perak, gila sih.',
      angka_pesan: [{ teks: '26 November', fact_id: 'naik-2025-11-26-2025-12-09' }, { teks: '58', fact_id: 'naik-2025-11-26-2025-12-09' }], klaim_dari: null,
    },
    pilihan: [
      { teks: 'Betul, itu kenaikan sampai penutupan [[naik-2025-11-26-2025-12-09|9 Desember]].', sumber: 'kunci' },
      { teks: 'Keliru, [[harga-2025-12-09|Rp106]] itu harga penutupan kemarin.', sumber: 'P1' },
      { teks: 'Betul, harganya naik [[kelipatan-2025-11-26-2025-12-09|2,21 kali]] sejak itu.', sumber: 'P5' },
      { teks: 'Keliru, itu naik [[hari-naik-beruntun|9 hari bursa]] beruntun.', sumber: 'P8' },
    ],
    penjelasan:
      'Penutupan [[harga-2025-12-09|Rp106]] dikurangi penutupan [[harga-2025-11-26|Rp48]] memang [[naik-2025-11-26-2025-12-09|Rp58]]. ' +
      'Itu kenaikan, bukan harga satu hari. Salah-kaprah yang umum: mengira angka kenaikan adalah harga sahamnya.',
  },
  3: {
    pesan: { nama: 'Rina', jam: '21.10', pesan: 'Akhir September sahamnya sempat disetop bursa juga kan? Aku inget banget.', angka_pesan: [], klaim_dari: 'P2' },
    pilihan: [
      { teks: 'Keliru, itu cuma jadwal rapat pemegang saham.', sumber: 'kunci' },
      { teks: 'Betul, bursa sempat menghentikan perdagangannya bulan itu.', sumber: 'P2' },
      { teks: 'Betul, waktu itu penutupannya masih [[harga-2025-11-26|Rp48]].', sumber: 'P3' },
      { teks: 'Keliru, waktu itu volumenya [[volume-2025-11-25|0 lembar]] saja.', sumber: 'P1' },
    ],
    penjelasan:
      'Di bulan itu yang tercatat hanya jadwal rapat umum pemegang saham [[rups-2025-09-25|25 September 2025]]. ' +
      'Penghentian oleh bursa terjadi [[susp-2025-01-21|21 Januari 2025]] dan [[susp-2025-12-10|10 Desember 2025]]. ' +
      'Salah-kaprah yang umum: mengira semua pengumuman soal saham adalah penghentian.',
  },
};
