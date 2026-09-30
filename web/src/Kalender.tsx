import type { ReactNode } from 'react';
import type { Penanda } from './tanggal.ts';
import { KEPALA_HARI, statusSimulasi, type BulanKalender } from './kalender-simulasi.ts';

/**
 * Tanda tangan desain (D-8): halaman kalender sobek, benda yang ada di hampir
 * setiap rumah dan warung di Indonesia.
 *
 * **Benda yang sama di mana pun ia muncul.** Sisi atasnya bergerigi — bekas
 * perforasi sobekan — dan gerigi yang sama menjadi sisi atas keping yang
 * menempel di layar soal. Halaman kalender bukan kartu: ia sengaja tidak
 * berbagi bentuk dengan lembar dokumen.
 *
 * Tiga wujud, satu benda: halaman besar di layar pertama, keping menempel di
 * layar soal, dan halaman yang tersobek di layar pembukaan.
 */

export function HalamanKalender({ hari }: { hari: Penanda }): JSX.Element {
  return (
    <div className="kalender-halaman" role="img" aria-label={`${hari.hari}, ${hari.panjang}`}>
      <div className="kalender-pita">{hari.bulanTahun}</div>
      <div className="kalender-angka" aria-hidden="true">
        {hari.angka}
      </div>
      <div className="kalender-hari" aria-hidden="true">
        {hari.hariBesar}
      </div>
    </div>
  );
}

/**
 * Keping yang menempel di layar soal.
 *
 * `berdenyut` (M3.6 D-3): titik pemisahnya berdenyut satu detik ketika keping
 * ini pertama tampil, yaitu di soal pertama. Teman FEB pemilik tidak pernah
 * melihat keping ini sama sekali — ia berpatokan pada tiga bulatan kemajuan —
 * dan yang diam memang tidak menarik mata. Sesudah satu detik ia diam untuk
 * seterusnya; `prefers-reduced-motion` mematikannya sama sekali.
 *
 * Yang bergerak sengaja hanya titiknya: menggerakkan tanggalnya akan membuat
 * keping ini terbaca sebagai pemberitahuan, dan ia bukan itu.
 *
 * **Satu baris** (M3.9 D-5): tanggal di kiri, `kanan` (bulatan kemajuan) di
 * kanan, disalin dari `.keping-dalam` patokan `docs/contoh/layar-soal.html`.
 * Sejak M3.2 produk menaruh bulatan di BAWAH tanggal — penyimpangan yang lolos
 * review, bukan keputusan; pemilik menemukannya 24 Sep 2026.
 */
export function KepingKalender({
  hari,
  berdenyut = false,
  kanan,
}: {
  hari: Penanda;
  berdenyut?: boolean;
  kanan?: ReactNode;
}): JSX.Element {
  return (
    <div className="kalender-keping">
      <p className="kalender-keping-tanggal">
        <span className="kalender-label">Hari ini</span>
        <span className="kalender-tanggal">
          {/*
            Nama hari punya elemennya sendiri (M3.10 D-1, kritik K-3): ia yang
            berwarna merah kalender, seperti `.keping-tanggal span` di patokan
            `docs/contoh/layar-soal.html` dan `docs/desain.md` §Tanda tangan.
            Sampai M3.9 ia ikut berwarna tinta, dan layar soal kehilangan
            satu-satunya merahnya.
          */}
          <span className="kalender-hari-nama">{hari.hariBesar}</span>{' '}
          <span className={berdenyut ? 'keping-titik keping-titik-denyut' : 'keping-titik'}>·</span>{' '}
          {hari.pendek}
        </span>
      </p>
      {kanan}
    </div>
  );
}

/**
 * Halaman yang tersobek dan jatuh **keluar dari tempatnya**.
 *
 * Gerak pertama dari dua yang diatur di seluruh aplikasi (yang kedua: denyut
 * titik keping di soal pertama, M3.6 D-3). Tiga hal yang membuat
 * versi pertama meniadakan dirinya sendiri, dan sudah diperbaiki: ruangnya
 * `overflow: hidden` sehingga halaman terpotong begitu mulai jatuh; ruang itu
 * menyusut bersamaan dengan jatuhnya, bukan sesudahnya; dan sobekan dimulai
 * tepat ketika layar melompat ke atas. Sekarang: `overflow: visible`, mulai
 * 500 ms sesudah layar tampil (M3.6 D-4: pemilik menilai sobekannya "kurang
 * terasa" pada 250 ms — mata belum sampai ke kalender), dan ruangnya baru
 * menutup 200 ms sesudah sobekan dimulai.
 *
 * Dengan `prefers-reduced-motion`, sobekan diganti pergantian langsung.
 */
export function KalenderSobek({ hari }: { hari: Penanda }): JSX.Element {
  return (
    <div className="kalender-sobek" aria-hidden="true">
      <div className="kalender-halaman kalender-jatuh">
        <div className="kalender-pita">{hari.bulanTahun}</div>
        <div className="kalender-angka">{hari.angka}</div>
        <div className="kalender-hari">{hari.hariBesar}</div>
      </div>
    </div>
  );
}

/**
 * Kalender simulasi (M3.14 D-3): satu halaman kalender per bulan yang punya
 * simulasi — benda yang sama dengan halaman besar di layar pertama (pita
 * merah, sisi atas bergerigi, kertas yang tetap terang di malam hari).
 *
 * Kisi tanggalnya GAMBAR, bukan kontrol (`aria-hidden`): hari bursa yang
 * dibekukan menjadi simulasi dilingkari seperti coretan pena di kalender
 * dinding, yang sudah selesai dilingkari penuh. Yang bisa diketuk hanya daftar
 * di bawah halaman — satu baris berbingkai per simulasi, lengkap dengan
 * tanggal, nama samaran, jumlah soal, dan statusnya — jadi tidak ada benda
 * yang tampak bisa diketuk padahal tidak (`docs/desain.md`, Afordans).
 *
 * Hanya simulasi nyata: tanda = anggota `DAFTAR_KASUS`, tidak ada hari
 * "segera hadir" (`kalender-simulasi.ts`, dites).
 */
export function KalenderSimulasi({
  bulan,
  judul,
  pengantar,
  pilih,
}: {
  bulan: readonly BulanKalender[];
  judul: string;
  pengantar: string;
  pilih: (kasus_id: string) => void;
}): JSX.Element {
  return (
    <section className="kalender-simulasi" data-uid="kalender-simulasi" aria-labelledby="judul-kalender-simulasi">
      <h2 id="judul-kalender-simulasi" className="judul">
        {judul}
      </h2>
      <p className="meta kalender-pengantar">{pengantar}</p>
      {bulan.map((b) => (
        <div key={b.kunci} className="kalender-bulan-blok">
          <div className="kalender-halaman kalender-bulan" aria-hidden="true">
            <div className="kalender-pita">{b.pita}</div>
            <table className="kalender-kisi">
              <thead>
                <tr>
                  {KEPALA_HARI.map((h) => (
                    <th key={h} scope="col">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {b.minggu.map((baris, i) => (
                  <tr key={i}>
                    {baris.map((sel, j) => (
                      <td
                        key={j}
                        className={
                          sel === null
                            ? undefined
                            : [
                                sel.akhirPekan ? 'kisi-libur' : '',
                                sel.kasus_id !== null ? 'kisi-simulasi' : '',
                                sel.selesai ? 'kisi-selesai' : '',
                              ]
                                .filter((k) => k !== '')
                                .join(' ') || undefined
                        }
                      >
                        {sel === null ? '' : <span>{sel.angka}</span>}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <ul className="kalender-daftar">
            {b.simulasi.map((e) => (
              <li key={e.kasus_id}>
                <button
                  type="button"
                  className={`kalender-baris${e.selesai ? ' kalender-baris-selesai' : ''}`}
                  data-uid={`kalender:pilih:${e.kasus_id}`}
                  onClick={() => {
                    pilih(e.kasus_id);
                  }}
                >
                  <span className="kalender-baris-teks">
                    <span className="kalender-baris-tanggal">{e.tanggal}</span>
                    <span className="meta">
                      {e.nama_samaran} · {e.jumlah_soal} soal · {statusSimulasi(e)}
                    </span>
                  </span>
                  <span className="panah" aria-hidden="true">
                    ›
                  </span>
                </button>
              </li>
            ))}
          </ul>
        </div>
      ))}
    </section>
  );
}
