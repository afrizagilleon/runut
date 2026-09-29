/**
 * Halaman "Dapur agen" (M3.13 D-4): `?dapur`, tanpa login, tanpa permainan.
 *
 * Yang diperlihatkan adalah kerja agen AI yang MENULIS DRAF simulasi baru —
 * bukan simulasi yang dimainkan orang, yang ditulis manusia. Halaman ini
 * membaca `dapur-data.json`, yang dibangun `node --experimental-strip-types alat/dapur.ts` dari jejak
 * mentah (`eval/keluaran-m2d4/ultj/`, `eval/keluaran-m2d6/jalan-1/tirt/`):
 * setiap angka, status, alasan penolakan, dan kalimat draf datang dari sana.
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
  PENOLAKAN_TERLIHAT,
  dolar,
  judulJalan,
  kepalaPenolakan,
  menit,
  namaPeran,
  ringkasUjiLuar,
  satuDesimal,
  statusJalan,
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
      <p>Belum ada yang memainkannya: draf ini tidak dipasang ke simulasi.</p>
      <details className="jejak-rinci dapur-lipat" data-uid={`dapur:draf-${jalan.id}`}>
        <summary>Lihat drafnya (berisi jawaban soal {jalan.simulasi.nama_samaran})</summary>
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
  const awal = jalan.penolakan.slice(0, PENOLAKAN_TERLIHAT);
  return (
    <section className="dapur-jalan" aria-labelledby={`judul-${jalan.id}`} data-uid={`dapur:${jalan.id}`}>
      <h2 id={`judul-${jalan.id}`} className="judul">
        {judulJalan(jalan)}
      </h2>
      <p className={`dapur-status dapur-status-${status.jenis}`}>{status.label}</p>
      <p className="meta">
        {jalan.milestone} · peristiwa di paket fakta: “{jalan.simulasi.peristiwa}”
      </p>

      <ul className="dapur-angka">
        <li>
          <strong>{angkaId(jalan.putaran)}</strong> putaran
        </li>
        <li>
          <strong>{angkaId(jalan.panggilan)}</strong> panggilan model
        </li>
        <li>
          <strong>{angkaId(menit(jalan.durasi_ms))}</strong> menit
        </li>
        {jalan.biaya_usd !== null && (
          <li>
            <strong>{dolar(jalan.biaya_usd)}</strong> biaya nyata
          </li>
        )}
      </ul>
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
            <strong>{namaPeran(p.peran)}</strong> · {p.model ?? 'kode'} · {kerjaPeran(p)}
          </li>
        ))}
      </ul>

      <h3>Alasan penolakan, persis seperti di jejak</h3>
      <ol className="dapur-tolak">
        {awal.map((p) => (
          <Penolakan key={p.no} p={p} />
        ))}
      </ol>
      {jalan.penolakan.length > awal.length && (
        <details className="jejak-rinci dapur-lipat" data-uid={`dapur:tolak-${jalan.id}`}>
          <summary>Lihat semua {angkaId(jalan.penolakan.length)} penolakan</summary>
          <ol className="dapur-tolak">
            {jalan.penolakan.slice(awal.length).map((p) => (
              <Penolakan key={p.no} p={p} />
            ))}
          </ol>
        </details>
      )}

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
          simulasi baru dari data yang sama, dan belum ada satu pun draf agen yang dimainkan orang. Di bawah
          ini jejak kerjanya, apa adanya.
        </p>
        <p className="meta">
          Angka, nama model, dan kalimat dalam tanda kutip dibaca dari jejak mentah lingkar agen, tanpa
          disunting.
        </p>

        <section className="dapur-bagian" aria-labelledby="judul-peran">
          <h2 id="judul-peran" className="judul">
            Tiap draf melewati lima penjaga
          </h2>
          <p>
            Tidak satu pun bisa meloloskan draf sendirian: satu omongan dikunci hanya kalau tak satu pun
            berkeberatan.
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

        {DATA.jalan.map((j) => (
          <Jalan key={j.id} jalan={j} />
        ))}

        <details className="rincian-teknis">
          <summary>Rincian teknis</summary>
          <dl className="rincian">
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
