/**
 * Halaman "Dapur agen" (M3.13 D-4): `?dapur`, tanpa login, tanpa permainan.
 *
 * Yang diperlihatkan adalah kerja agen AI yang MENULIS DRAF simulasi baru —
 * bukan simulasi yang dimainkan orang, yang ditulis manusia. Halaman ini
 * membaca `dapur-data.json`, yang dibangun `node --experimental-strip-types alat/dapur.ts` dari jejak
 * mentah: jalan TIRT (emiten yang tidak tayang) utuh, dan jalan atas DADA/ULTJ
 * hanya sebagai angka (Amandemen A-1: isinya membocorkan jawaban simulasi yang
 * tayang). Setiap angka, status, alasan penolakan, dan kalimat draf datang dari sana.
 * Yang ditulis di berkas ini hanyalah kerangka kalimat dan penjelasan peran
 * (disarikan dari `factory/llm/peran.md`).
 *
 * Tidak ada peristiwa pelacakan di halaman ini: ia tidak memulai sesi, dan
 * pengumpul tidak mengenal peristiwa baru (`server/` di luar batas M3.13).
 * Ketukan ke pintunya di layar permainan tercatat oleh peristiwa `ketuk` yang
 * sudah ada, lewat `data-uid`.
 */
import { useEffect } from 'react';
import { teksPolos } from '../../factory/skema/rujukan.ts';
import mentah from './dapur-data.json';
import { angkaId } from './angka.ts';
import {
  barisAngka,
  contohPenolakan,
  judulJalan,
  kalimatAgregat,
  kepalaPenolakan,
  namaPeran,
  ringkasUjiLuar,
  satuDesimal,
  statusJalan,
  tanggalData,
  type DataDapur,
  type JalanDapur,
  type PenolakanDapur,
  type PeranDapur,
} from './dapur.ts';

const DATA = mentah as unknown as DataDapur;

/** Penjelasan tiap peran — disarikan dari `factory/llm/peran.md`, bukan dari jejak. */
const TUGAS_PERAN: ReadonlyArray<{ peran: string; oleh: string; tugas: string }> = [
  {
    peran: 'penulis',
    oleh: 'model',
    tugas:
      'Menulis satu omongan per panggilan: pesan teman, empat pilihan, kunci, dan penjelasan, dari fakta yang sudah lolos verifikasi.',
  },
  {
    peran: 'pemeriksa',
    oleh: 'kode, bukan model',
    tugas:
      'Aturan tetap: tiap angka harus bertaut ke fakta, tanpa kata penilaian saham, tanpa ajakan bertransaksi, panjang pilihan seimbang.',
  },
  {
    peran: 'pembaca-kartu',
    oleh: 'model',
    tugas: 'Menjawab dengan kartu, tanpa tahu kuncinya. Kalau jawabannya salah, draf ditolak.',
  },
  {
    peran: 'kritikus',
    oleh: 'model lain',
    tugas: 'Melihat semuanya, termasuk kunci. Hanya boleh berkeberatan; tidak menulis ulang.',
  },
  {
    peran: 'penebak',
    oleh: 'model',
    tugas: 'Menebak tanpa kartu. Kalau kuncinya tertebak, soalnya bocor dan draf ditolak.',
  },
];

/** Satu kalimat kerja per peran, dari hitungan putusan di jejak. */
function kerjaPeran(p: PeranDapur): string {
  const tolak = p.putusan['tolak'] ?? 0;
  if (p.peran === 'penulis') return `menulis ${angkaId(p.putusan['ditulis'] ?? 0)} versi`;
  if (p.peran === 'perencana') return `mengganti sudut ${angkaId(tolak)} kali`;
  return `menolak ${angkaId(tolak)} dari ${angkaId(p.langkah)} pemeriksaan`;
}

function Penolakan({ p }: { p: PenolakanDapur }): JSX.Element {
  return (
    <li>
      <p className="meta">{kepalaPenolakan(p)}</p>
      {p.alasan.map((a, i) => (
        <p key={i} className="dapur-kutipan">
          “{a}”
        </p>
      ))}
    </li>
  );
}

function Draf({ jalan }: { jalan: JalanDapur }): JSX.Element | null {
  if (jalan.draf === null) return null;
  const luar = ringkasUjiLuar(jalan);
  return (
    <>
      <h3>Draf yang lolos</h3>
      <p>
        Tiga omongan ini lolos semua penjaga di atas, lalu diuji lagi oleh penguji luar (subagent Claude Opus
        baru).{' '}
        {luar !== null && (
          <>
            Tanpa kartu, {angkaId(luar.tebak_benar)} dari {angkaId(luar.tebak_n)} tebakan kena kunci; dengan
            kartu, {angkaId(luar.kartu_benar)} dari {angkaId(luar.kartu_n)} jawaban benar.
          </>
        )}{' '}
        {jalan.alami !== null && (
          <>
            Kealamian bahasanya rata-rata {satuDesimal(jalan.alami.agen)} dari 5, sedangkan soal tulisan manusia{' '}
            {satuDesimal(jalan.alami.manusia)}.
          </>
        )}
      </p>
      <p>Draf ini tidak tayang sebagai simulasi; belum ada yang memainkannya.</p>
      <details className="jejak-rinci dapur-lipat" data-uid={`dapur:draf-${jalan.id}`}>
        <summary>Lihat drafnya</summary>
        <ol className="dapur-draf">
          {jalan.draf.map((o, i) => (
            <li key={i}>
              <figure className="pesan">
                <blockquote className="pesan-balon">
                  <p className="pesan-meta">
                    <span className="pesan-nama">{o.nama}</span>
                  </p>
                  <p className="isi">{o.pesan}</p>
                  <time className="pesan-jam">{o.jam}</time>
                </blockquote>
              </figure>
              <ul className="dapur-pilihan">
                {Object.entries(o.pilihan).map(([huruf, teks]) => (
                  <li key={huruf}>
                    {huruf}. {teksPolos(teks)}
                    {huruf === o.kunci && <span className="meta"> — kunci</span>}
                  </li>
                ))}
              </ul>
              <p className="meta">{teksPolos(o.penjelasan)}</p>
            </li>
          ))}
        </ol>
      </details>
    </>
  );
}

function Jalan({ jalan }: { jalan: JalanDapur }): JSX.Element {
  const status = statusJalan(jalan);
  const contoh = contohPenolakan(jalan);
  return (
    <section className="dapur-jalan" aria-labelledby={`judul-${jalan.id}`} data-uid={`dapur:${jalan.id}`}>
      <h2 id={`judul-${jalan.id}`} className="judul">
        {judulJalan(jalan)}
      </h2>
      <p className={`dapur-status dapur-status-${status.jenis}`}>{status.label}</p>
      <p className="meta">
        Tanggal data {tanggalData(jalan)}. Peristiwa di paket fakta: “{jalan.simulasi.peristiwa}”
      </p>
      <p className="meta dapur-angka">{barisAngka(jalan)}</p>
      {jalan.berhenti !== null && <p>Berhenti karena: “{jalan.berhenti}”</p>}

      <h3>Sebelum menulis: datanya diperiksa</h3>
      <p>
        {angkaId(jalan.pemeriksaan.aturan_dijalankan)} aturan verifikasi dijalankan atas data perusahaan ini;{' '}
        {angkaId(jalan.pemeriksaan.fakta_lolos)} fakta boleh dipakai, {angkaId(jalan.pemeriksaan.fakta_tersingkir)}{' '}
        disingkirkan:
      </p>
      <ul className="dapur-daftar">
        {jalan.pemeriksaan.tersingkir.map((t) => (
          <li key={t.fact_id} className="dapur-kutipan">
            “{t.alasan}”
          </li>
        ))}
      </ul>

      <h3>Siapa mengerjakan apa</h3>
      <ul className="dapur-daftar">
        {jalan.peran.map((p) => (
          <li key={p.peran}>
            <strong>{namaPeran(p.peran)}</strong> {kerjaPeran(p)}
            <span className="meta dapur-model">{p.model ?? 'kode, bukan model'}</span>
          </li>
        ))}
      </ul>
      <p className="meta">Nama model ditulis persis seperti tercatat di jejak.</p>

      <h3>Alasan penolakan, persis seperti di jejak</h3>
      <p className="meta">
        {angkaId(contoh.length)} contoh terpendek dari {angkaId(jalan.penolakan.length)} penolakan:
      </p>
      <ol className="dapur-tolak">
        {contoh.map((p) => (
          <Penolakan key={p.no} p={p} />
        ))}
      </ol>
      <details className="jejak-rinci dapur-lipat" data-uid={`dapur:tolak-${jalan.id}`}>
        <summary>Lihat semua {angkaId(jalan.penolakan.length)} penolakan, urut waktu</summary>
        <ol className="dapur-tolak">
          {jalan.penolakan.map((p) => (
            <Penolakan key={p.no} p={p} />
          ))}
        </ol>
      </details>

      <Draf jalan={jalan} />
    </section>
  );
}

export default function Dapur(): JSX.Element {
  useEffect(() => {
    document.title = 'Dapur agen · Runut';
  }, []);

  return (
    <>
      <main className="halaman dapur">
        <p className="dapur-balik">
          <a className="dapur-tautan" href="./" data-uid="dapur:ke-simulasi">
            ← Main simulasinya
          </a>
        </p>
        <h1 className="judul">Dapur agen</h1>
        <p>
          Simulasi yang kamu mainkan di sini ditulis manusia. Di dapur ini kami melatih agen AI menulis
          simulasi baru, dan belum ada satu pun draf agen yang dimainkan orang. Di bawah ini jejak kerjanya
          atas data perusahaan yang tidak ada di simulasi mana pun, apa adanya.
        </p>
        {/* Kritik D-5 butir 1: status kedua jalan terlihat di layar pertama, bertaut ke jalannya. */}
        <ul className="dapur-daftar dapur-ringkas">
          {DATA.jalan.map((j) => (
            <li key={j.id}>
              <a className="dapur-tautan" href={`#judul-${j.id}`} data-uid={`dapur:ke-${j.id}`}>
                Data {j.simulasi.nama_samaran}
              </a>
              : {statusJalan(j).label}
            </li>
          ))}
          {DATA.agregat.length > 0 && (
            <li>
              <a className="dapur-tautan" href="#judul-agregat" data-uid="dapur:ke-agregat">
                Simulasi yang tayang
              </a>
              : hanya angka, tanpa isi
            </li>
          )}
        </ul>
        <p className="meta">
          Angka, nama model, dan kalimat dalam tanda kutip dibaca dari jejak mentah lingkar agen, tanpa
          disunting.
        </p>

        {DATA.jalan.map((j) => (
          <Jalan key={j.id} jalan={j} />
        ))}

        {/*
          Amandemen A-1: jalan agen atas data simulasi yang SEDANG TAYANG hanya
          angka. Draf, pilihan, kunci, penjelasan, dan kutipan keberatannya
          membocorkan jawaban simulasi yang dimainkan orang, jadi tidak satu
          kata pun darinya masuk ke halaman ini (dijaga `alat/dapur.test.ts`).
        */}
        {DATA.agregat.length > 0 && (
          <section className="dapur-bagian" aria-labelledby="judul-agregat" data-uid="dapur:agregat">
            <h2 id="judul-agregat" className="dapur-subjudul">
              Jalan atas data simulasi yang bisa kamu mainkan
            </h2>
            <p>
              Agen juga menulis draf dari data {angkaId(DATA.agregat.length)} simulasi yang tayang. Isinya tidak
              ditampilkan di sini supaya jawabannya tidak bocor; yang tampil hanya angkanya.
            </p>
            <ul className="dapur-daftar">
              {DATA.agregat.map((a) => (
                <li key={a.id}>{kalimatAgregat(a)}</li>
              ))}
            </ul>
          </section>
        )}

        <section className="dapur-bagian" aria-labelledby="judul-peran">
          <h2 id="judul-peran" className="dapur-subjudul">
            Lima peran di tiap draf: satu menulis, empat menjaga
          </h2>
          <p>
            Tidak satu pun bisa meloloskan draf sendirian: satu omongan dikunci hanya kalau keempat penjaga
            tidak berkeberatan.
          </p>
          <ul className="dapur-daftar">
            {TUGAS_PERAN.map((t) => (
              <li key={t.peran}>
                <strong>{namaPeran(t.peran)}</strong> ({t.oleh}). {t.tugas}
              </li>
            ))}
          </ul>
          <p className="meta">
            Di luar kelimanya, perencana (kode) memilih fakta penentu tiap omongan dan menggantinya sesudah lima
            putaran gagal.
          </p>
        </section>

        <details className="rincian-teknis">
          <summary>Rincian teknis</summary>
          <dl className="rincian">
            {DATA.jalan.map((j) => (
              <div key={j.id}>
                <dt>
                  Jalan {j.milestone} · data {j.simulasi.nama_samaran}
                </dt>
                <dd>{j.folder}</dd>
              </div>
            ))}
            <dt>Jejak mentah</dt>
            {DATA.sumber.map((s) => (
              <dd key={s}>{s}</dd>
            ))}
            <dt>Dibangun</dt>
            <dd>node --experimental-strip-types alat/dapur.ts</dd>
          </dl>
        </details>
      </main>
      <footer className="kaki" aria-label="Kalimat tetap">
        <ul>
          <li>Produk ini tidak menyarankan membeli atau menjual efek apa pun.</li>
        </ul>
      </footer>
    </>
  );
}
