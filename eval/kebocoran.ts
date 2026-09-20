// Amandemen A-1, butir 3 — kebocoran dipisah dari klaim ketersediaan.
//
// Metrik lama menghitung satu kebocoran untuk KETIGA lengan, dengan sebab yang
// sama sekali berbeda (§10 F-3):
//   - lengan C menaruh kalimat "laporan pertama baru terbit pada 24 Oktober
//     2025" di bagian yang dilihat pemain. Isinya memang dari sesudah T; itu
//     kebocoran sungguhan, dan cacat produk kita sendiri.
//   - lengan A dan S menaruh suspensi 8 Okt di bagian terlihat sambil menandai
//     faktanya "tersedia sejak 7 Okt". Di dunia nyata pengumuman bursa memang
//     terbit petang sebelum berlaku — tetapi data kita tidak memuat medan
//     tanggal pengumuman, jadi klaim itu TIDAK BISA DIBUKTIKAN dari data. Itu
//     bukan hal yang sama dengan membocorkan masa depan.
//
// Karena itu dua kolom:
//
//   KEBOCORAN                  isi faktanya dari sesudah T dan muncul di bagian
//                              yang dilihat pemain.
//   KLAIM KETERSEDIAAN         peristiwa sesudah T yang jenisnya pengumuman
//   TANPA BUKTI                bursa (suspensi), yang oleh lengan ditandai
//                              sudah tersedia pada atau sebelum T, padahal data
//                              kita tidak punya tanggal pengumumannya.
//
// Catatan jujur yang harus ikut terbaca reviewer: satu-satunya jejak tanggal
// pengumuman di data kita adalah AWALAN NAMA BERKAS PDF di suspensions-all.json
// ("20251007-WAS_Suspensi_FOLK.pdf" untuk suspensi 8 Okt). Itu konvensi
// penamaan, bukan medan data, dan tidak dipakai sebagai bukti di sini. Kalau
// pemilik memutuskan awalan itu boleh dipakai, kolom ini berubah jadi nol dan
// keputusannya harus ditulis, bukan disisipkan ke kode.

import { tanggalDalam } from './angka.ts';
import type { DataMentah } from './data-mentah.ts';
import type { FaktaKeluaran, KeluaranLengan } from './skema-keluaran.ts';

/** Kata yang menandai sebuah kalimat sedang bicara tentang penghentian perdagangan. */
const KATA_SUSPENSI = /suspensi|disuspensi|penghentian sementara|dihentikan|cooling down/i;

export interface CatatanKebocoran {
  jenis: 'kebocoran' | 'klaim-ketersediaan-tanpa-bukti';
  keterangan: string;
}

export interface HasilKebocoran {
  kebocoran: number;
  klaimKetersediaan: number;
  catatan: CatatanKebocoran[];
}

interface Butir {
  teks: string;
  /** Tanggal yang diklaim lengan sebagai saat fakta ini bisa diketahui publik. */
  tersediaSejak: string | null;
  asal: string;
}

function teksFakta(f: FaktaKeluaran): string {
  return `${f.klaim} ${String(f.nilai ?? '')} ${f.satuan ?? ''}`;
}

function butirTerlihat(k: KeluaranLengan): Butir[] {
  const butir: Butir[] = k.fakta_terlihat.map((f) => ({
    teks: teksFakta(f),
    tersediaSejak: f.tersedia_sejak,
    asal: `fakta ${f.fact_id}`,
  }));
  for (const s of k.soal) {
    butir.push({
      teks: [s.batang, s.penjelasan, ...s.pilihan.map((p) => p.teks)].join(' '),
      tersediaSejak: null,
      asal: `soal ${s.soal_id}`,
    });
  }
  return butir;
}

export function nilaiKebocoranBaru(k: KeluaranLengan, data: DataMentah, tanggalT: string): HasilKebocoran {
  const butir = butirTerlihat(k);
  const catatan: CatatanKebocoran[] = [];

  // Satu tanggal sesudah T dihitung SEKALI per keluaran, bukan sekali per
  // kalimat: satu fakta yang sama lazim diulang di batang soal dan di
  // penjelasannya, dan menghitungnya berkali-kali menghukum pengulangan,
  // bukan kebocoran.
  interface Temuan {
    penyebut: string[];
    adaKataSuspensi: boolean;
    diklaimTersedia: boolean;
  }
  const perTanggal = new Map<string, Temuan>();

  for (const b of butir) {
    const tanggal = new Set(tanggalDalam(b.teks).filter((t) => t > tanggalT));
    if (b.tersediaSejak !== null && b.tersediaSejak > tanggalT) tanggal.add(b.tersediaSejak);
    for (const t of tanggal) {
      const sebelum = perTanggal.get(t) ?? { penyebut: [], adaKataSuspensi: false, diklaimTersedia: false };
      sebelum.penyebut.push(b.asal);
      if (KATA_SUSPENSI.test(b.teks)) sebelum.adaKataSuspensi = true;
      if (b.tersediaSejak !== null && b.tersediaSejak <= tanggalT) sebelum.diklaimTersedia = true;
      perTanggal.set(t, sebelum);
    }
  }

  let kebocoran = 0;
  let klaimKetersediaan = 0;
  for (const [t, v] of [...perTanggal.entries()].sort()) {
    const pengumuman = data.suspensi.has(t) && v.adaKataSuspensi;
    if (pengumuman && v.diklaimTersedia) {
      klaimKetersediaan++;
      catatan.push({
        jenis: 'klaim-ketersediaan-tanpa-bukti',
        keterangan:
          `${v.penyebut.join(', ')} menaruh suspensi ${t} di bagian terlihat dan menandainya sudah tersedia ` +
          `pada atau sebelum T; data kita tidak memuat tanggal pengumumannya, jadi klaim itu tidak bisa dibuktikan`,
      });
      continue;
    }
    kebocoran++;
    catatan.push({
      jenis: 'kebocoran',
      keterangan: `${v.penyebut.join(', ')} menyebut peristiwa bertanggal ${t}, sesudah T (${tanggalT})`,
    });
  }

  // Nama pemegang saham hanya dikenal dari laporan, dan seluruh laporan emiten
  // ini terbit sesudah T. Diambil dari data mentah, bukan dari kunci.
  const terlihat = butir.map((b) => b.teks).join('\n').toLowerCase();
  for (const nama of data.namaPemegang) {
    if (!terlihat.includes(nama.toLowerCase())) continue;
    kebocoran++;
    catatan.push({
      jenis: 'kebocoran',
      keterangan: `bagian terlihat menyebut pemegang saham "${nama}" yang hanya dikenal dari laporan sesudah T`,
    });
  }

  return { kebocoran, klaimKetersediaan, catatan };
}
