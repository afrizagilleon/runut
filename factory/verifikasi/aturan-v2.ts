/**
 * Aturan verifikasi generasi kedua (M2a).
 *
 * Definisinya datang dari putusan uji lawan `.context/aturan-R-uji-lawan.md`,
 * bukan dari terjemahan skrip pembanding: dua implementasi yang berbagi cacat
 * yang sama tidak bisa saling merekonsiliasi.
 *
 * Tiap aturan adalah fungsi murni `(konteks) -> HasilAturan` dan wajib
 * melaporkan hitungan INV-B. Tidak ada aturan yang boleh melewati unit
 * diam-diam: yang dilewati disebut jumlah dan alasannya.
 */
import type { Temuan } from '../skema/tipe.ts';
import type { HasilAturan, KonteksVerifikasi } from './tipe.ts';
import { angka, hasil, hitung, lewat, urut } from './dasar.ts';
import { DESIMAL_PERSEN, persenKonsisten, selangPenyebut } from './penyebut.ts';

// --- R7 dengan penyebut bertanggal (D-3, D-5) --------------------------------

/**
 * R7 versi kedua: persen dihitung ulang terhadap jumlah saham beredar
 * **pada tanggal laporan itu**.
 *
 * Bedanya dengan R7 generasi pertama hanya satu hal, dan hal itu menentukan:
 * penyebutnya bertanggal. Dengan satu angka tanpa tanggal, R7 menolak 22 dari
 * 22 sisi laporan COCO — bukan karena angkanya salah, melainkan karena
 * penyebut 14,2 miliar lembar (keadaan 2026, sesudah dua rights issue) dipakai
 * untuk laporan September 2025 yang penyebutnya masih ~890 juta.
 *
 * Putusan: KONFLIK kalau penyebut yang berlaku **di luar** selang yang
 * dibolehkan ketelitian medan persen; TIDAK_LENGKAP kalau tidak ada titik
 * penyebut yang berlaku, atau kalau persennya sendiri nol/kosong.
 */
export function r7PersenPerTanggal(konteks: KonteksVerifikasi): HasilAturan {
  const judul = 'Persen dihitung ulang terhadap saham beredar pada tanggal laporan';
  const satuan = 'sisi laporan';
  if (konteks.laporan.length === 0) {
    return lewat('R7', judul, 'Tidak ada laporan untuk diperiksa.', satuan);
  }
  const cari = konteks.sahamBeredarPada;
  if (cari === undefined) {
    return lewat(
      'R7',
      judul,
      'Konteks ini tidak menyediakan jumlah saham beredar per tanggal.',
      satuan,
      konteks.laporan.length * 2,
    );
  }

  const temuan: Temuan[] = [];
  let diperiksa = 0;
  let merah = 0;
  let tidakLengkap = 0;
  const alasanKosong: string[] = [];

  for (const l of urut(konteks.laporan)) {
    const tanggal = l.dilaporkan_pada.slice(0, 10);
    const titik = cari(tanggal);
    const pasangan: Array<[string, number, number]> = [
      ['sebelum transaksi', l.sebelum, l.persen_sebelum],
      ['sesudah transaksi', l.sesudah, l.persen_sesudah],
    ];
    for (const [sisi, lembar, dilaporkan] of pasangan) {
      diperiksa += 1;
      if (!Number.isFinite(dilaporkan) || dilaporkan <= 0) {
        tidakLengkap += 1;
        alasanKosong.push('Persen yang dilaporkan nol atau kosong.');
        continue;
      }
      if (titik === null) {
        tidakLengkap += 1;
        alasanKosong.push(
          'Tidak ada titik jumlah saham beredar yang berlaku pada tanggal laporan.',
        );
        continue;
      }
      if (persenKonsisten(lembar, titik.lembar, dilaporkan, DESIMAL_PERSEN)) continue;

      merah += 1;
      const selang = selangPenyebut(lembar, dilaporkan, DESIMAL_PERSEN);
      const dihitung = (lembar / titik.lembar) * 100;
      const tambahan =
        selang === null
          ? ''
          : ` Persen ${String(dilaporkan)}% baru mungkin kalau penyebutnya antara ${angka(Math.round(selang.bawah))} dan ${angka(Math.round(selang.atas))} lembar.`;
      temuan.push({
        temuan_id: `R7-${l.laporan_id}-${sisi.replace(/\s+/g, '-')}`,
        aturan: 'R7',
        ringkasan:
          `Laporan ${l.dilaporkan_pada} menulis kepemilikan ${sisi} ${String(dilaporkan)}%, ` +
          `padahal ${angka(lembar)} lembar dibagi ${angka(titik.lembar)} saham beredar yang berlaku ` +
          `${titik.pada} adalah ${dihitung.toFixed(2)}%.${tambahan}`,
        angka: [
          { label: 'persen menurut laporan', nilai: dilaporkan, satuan: 'persen' },
          { label: 'persen hasil hitung ulang', nilai: Number(dihitung.toFixed(2)), satuan: 'persen' },
          { label: 'lembar', nilai: lembar, satuan: 'lembar' },
          { label: 'saham beredar yang dipakai', nilai: titik.lembar, satuan: 'lembar' },
        ],
        fakta_terkait: [],
        rujukan: [`${l.dilaporkan_pada} · ${l.berkas}`, `penyebut: ${titik.sumber}`],
      });
    }
  }

  return hasil(
    'R7',
    judul,
    temuan,
    hitung(satuan, {
      diperiksa,
      merah,
      tidak_lengkap: tidakLengkap,
      alasan_dilewati: alasanKosong,
    }),
  );
}
