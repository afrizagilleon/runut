/**
 * Halaman "Dapur agen" (M3.13 D-4; lebih visual di M3.14 D-4): `?dapur`, tanpa
 * login, tanpa permainan.
 *
 * Yang diperlihatkan adalah kerja agen AI yang MENULIS DRAF simulasi baru —
 * bukan simulasi yang dimainkan orang, yang ditulis manusia. Halaman ini
 * membaca `dapur-data.json`, yang dibangun `node --experimental-strip-types alat/dapur.ts` dari jejak
 * mentah: jalan TIRT (emiten yang tidak tayang) utuh, dan jalan atas DADA/ULTJ
 * hanya sebagai angka (Amandemen A-1: isinya membocorkan jawaban simulasi yang
 * tayang). Setiap angka, status, alasan penolakan, dan kalimat draf datang dari sana.
 *
 * M3.14 D-4: garis waktu putaran dengan ikon per peran, status berwarna, dan
 * alasan penolakan dalam bahasa awam. Kode internal jejak ("TIDAK_LENGKAP",
 * "R19a", "[AJAKAN_TRANSAKSI]", slug fakta, "M2d-6") diterjemahkan oleh fungsi
 * murni di `dapur.ts`; alasan mentahnya, huruf demi huruf, pindah ke lipatan
 * "Rincian teknis" tiap jalan. Tidak ada isi yang dikarang: templatnya hanya
 * membungkus angka dan potongan yang diambil dari jejak.
 *
 * Tidak ada peristiwa pelacakan di halaman ini: ia tidak memulai sesi, dan
 * pengumpul tidak mengenal peristiwa baru (`server/` di luar batas).
 */
import { useEffect } from 'react';
import { teksPolos } from '../../factory/skema/rujukan.ts';
import mentah from './dapur-data.json';
import { angkaId } from './angka.ts';
import {
  awamPenolakan,
  berhentiAwam,
  contohPenolakan,
  dolar,
  garisWaktu,
  judulJalan,
  kalimatAgregat as kalimatAgregatMentah,
  kalimatAgregatAwam,
  kepalaPenolakan,
  kepalaPenolakanAwam,
  menit,
  namaPeran,
  ringkasUjiLuar,
  satuDesimal,
  statusJalan,
  tanggalData,
  tersingkirAwam,
  type DataDapur,
  type JalanDapur,
  type PenolakanDapur,
  type PeranDapur,
  type SelGaris,
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

/**
 * Ikon peran: garis SVG sederhana, `currentColor`, bukan emoji
 * (`docs/desain.md`, "Yang sengaja tidak ada"). Selalu berdampingan dengan
 * nama perannya (atau teks tersembunyi untuk pembaca layar); ikon tidak pernah
 * menjadi satu-satunya pembawa arti.
 */
const JALUR_IKON: Readonly<Record<string, JSX.Element>> = {
  penulis: <path d="M4 20l4-1 11-11-3-3L5 16l-1 4zM14 6l3 3" />,
  pemeriksa: (
    <>
      <rect x="4" y="4" width="16" height="16" />
      <path d="M8 12l3 3 5-6" />
    </>
  ),
  'pembaca-kartu': (
    <>
      <rect x="5" y="3" width="14" height="18" />
      <path d="M8 8h8M8 12h8M8 16h5" />
    </>
  ),
  kritikus: (
    <>
      <path d="M4 5h16v11H9l-5 4z" />
      <path d="M12 8v4M12 14v1" />
    </>
  ),
  penebak: (
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="M9.5 9.5a2.5 2.5 0 1 1 3.5 2.3c-.7.3-1 .8-1 1.5M12 16.2v.8" />
    </>
  ),
  perencana: <path d="M4 8h14l-3-3M20 16H6l3 3" />,
};

function IkonPeran({ peran }: { peran: string }): JSX.Element | null {
  const jalur = JALUR_IKON[peran];
  if (jalur === undefined) return null;
  return (
    <svg
      className="ikon-peran"
      viewBox="0 0 24 24"
      width="20"
      height="20"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
    >
      {jalur}
    </svg>
  );
}

/** Satu kalimat kerja per peran, dari hitungan putusan di jejak. */
function kerjaPeran(p: PeranDapur): string {
  const tolak = p.putusan['tolak'] ?? 0;
  if (p.peran === 'penulis') return `menulis ${angkaId(p.putusan['ditulis'] ?? 0)} versi`;
  if (p.peran === 'perencana') return `mengganti fakta ${angkaId(tolak)} kali`;
  return `menolak ${angkaId(tolak)} dari ${angkaId(p.langkah)} pemeriksaan`;
}

/** Satu penolakan dalam bahasa awam: ikon peran, putaran & omongan, kalimat, kutipan. */
function PenolakanAwam({ p }: { p: PenolakanDapur }): JSX.Element {
  return (
    <li>
      <p className="meta dapur-tolak-kepala">
        <IkonPeran peran={p.peran} />
        <span>
          {namaPeran(p.peran)} · {kepalaPenolakanAwam(p)}
        </span>
      </p>
      {awamPenolakan(p).map((a, i) => (
        <p key={i} className="dapur-awam">
          {a.kalimat}
          {a.kutipan !== null && <span className="dapur-kutipan"> “{a.kutipan}”</span>}
        </p>
      ))}
    </li>
  );
}

/** Sel garis waktu: ikon + label pendek, warna menurut keadaan. */
function SelWaktu({ sel }: { sel: SelGaris }): JSX.Element {
  if (sel.keadaan === 'selesai' || sel.keadaan === 'kosong') {
    return (
      <td className={`sel-${sel.keadaan}`}>
        <span className="tersembunyi">{sel.keadaan === 'selesai' ? 'sudah dikunci' : 'tidak ada catatan'}</span>
      </td>
    );
  }
  return (
    <td className={`sel-${sel.keadaan}`}>
      <span className="sel-isi">
        {sel.keadaan === 'kunci' ? (
          <span className="sel-centang" aria-hidden="true">
            ✓
          </span>
        ) : (
          sel.peran !== null && <IkonPeran peran={sel.peran} />
        )}
        <span>
          {sel.peran !== null && <span className="tersembunyi">{namaPeran(sel.peran)}: </span>}
          {sel.label}
        </span>
      </span>
    </td>
  );
}

function GarisWaktu({ jalan }: { jalan: JalanDapur }): JSX.Element {
  const baris = garisWaktu(jalan);
  const omongan = baris[0]?.sel.map((s) => s.omongan) ?? [];
  return (
    <table className="dapur-waktu" data-uid={`dapur:waktu-${jalan.id}`}>
      <caption className="tersembunyi">Garis waktu putaran: apa yang terjadi pada tiap omongan</caption>
      <thead>
        <tr>
          <th scope="col">Putaran</th>
          {omongan.map((o) => (
            <th key={o} scope="col">
              Omongan {o}
            </th>
          ))}
        </tr>
      </thead>
      <tbody>
        {baris.map((b) => (
          <tr key={b.putaran}>
            <th scope="row">{b.putaran}</th>
            {b.sel.map((s) => (
              <SelWaktu key={s.omongan} sel={s} />
            ))}
          </tr>
        ))}
      </tbody>
    </table>
  );
}

function Legenda(): JSX.Element {
  return (
    <ul className="dapur-legenda" aria-label="Arti ikon">
      {['pemeriksa', 'pembaca-kartu', 'kritikus', 'penebak', 'perencana'].map((p) => (
        <li key={p}>
          <IkonPeran peran={p} />
          <span>{namaPeran(p)}</span>
        </li>
      ))}
      <li className="sel-kunci">
        <span className="sel-centang" aria-hidden="true">
          ✓
        </span>
        <span>omongan dikunci</span>
      </li>
    </ul>
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
  const tersingkir = tersingkirAwam(jalan);
  const angka: Array<[string, string]> = [
    [angkaId(jalan.putaran), 'putaran'],
    [angkaId(jalan.panggilan), 'panggilan model'],
    [angkaId(menit(jalan.durasi_ms)), 'menit'],
    jalan.biaya_usd === null ? ['—', 'biaya nyata tidak tercatat'] : [dolar(jalan.biaya_usd), 'biaya nyata'],
  ];
  return (
    <section className="dapur-jalan" aria-labelledby={`judul-${jalan.id}`} data-uid={`dapur:${jalan.id}`}>
      <h2 id={`judul-${jalan.id}`} className="judul">
        {judulJalan(jalan)}
      </h2>
      <p className={`dapur-status dapur-status-${status.jenis}`}>{status.label}</p>
      <p className="meta">
        Tanggal data {tanggalData(jalan)}. Peristiwa di paket fakta: “{jalan.simulasi.peristiwa}”
      </p>
      <dl className="dapur-angka-kisi">
        {angka.map(([nilai, label]) => (
          <div key={label}>
            <dd>{nilai}</dd>
            <dt className="meta">{label}</dt>
          </div>
        ))}
      </dl>
      {jalan.berhenti !== null && (
        <p className="dapur-berhenti">
          <strong>Berhenti karena:</strong> {berhentiAwam(jalan.berhenti)}
        </p>
      )}

      <h3>Sebelum menulis: datanya diperiksa</h3>
      <p>
        {angkaId(jalan.pemeriksaan.aturan_dijalankan)} aturan verifikasi dijalankan atas data perusahaan ini;{' '}
        {angkaId(jalan.pemeriksaan.fakta_lolos)} fakta boleh dipakai, {angkaId(jalan.pemeriksaan.fakta_tersingkir)}{' '}
        disingkirkan:
      </p>
      <ul className="dapur-daftar">
        {tersingkir.map((t) => (
          <li key={t.alasan}>
            <strong>{t.fakta.join(', ')}</strong>: {t.alasan}.
          </li>
        ))}
      </ul>

      <h3>Siapa mengerjakan apa</h3>
      <ul className="dapur-daftar dapur-peran">
        {jalan.peran.map((p) => (
          <li key={p.peran}>
            <IkonPeran peran={p.peran} />
            <span>
              <strong>{namaPeran(p.peran)}</strong> {kerjaPeran(p)}
              <span className="meta dapur-model">{p.model ?? 'kode, bukan model'}</span>
            </span>
          </li>
        ))}
      </ul>
      <p className="meta">Nama model ditulis persis seperti tercatat di jejak.</p>

      <h3>Garis waktu: {angkaId(jalan.putaran)} putaran</h3>
      <p className="meta">
        Tiap baris satu putaran, tiap kolom satu omongan: siapa yang menolak, atau kapan omongan dikunci.
      </p>
      <Legenda />
      <GarisWaktu jalan={jalan} />

      <h3>Kenapa ditolak</h3>
      <p className="meta">
        {angkaId(contoh.length)} contoh terpendek dari {angkaId(jalan.penolakan.length)} penolakan, dalam bahasa awam:
      </p>
      <ol className="dapur-tolak">
        {contoh.map((p) => (
          <PenolakanAwam key={p.no} p={p} />
        ))}
      </ol>
      <details className="jejak-rinci dapur-lipat" data-uid={`dapur:tolak-${jalan.id}`}>
        <summary>Lihat semua {angkaId(jalan.penolakan.length)} penolakan, urut waktu</summary>
        <ol className="dapur-tolak">
          {jalan.penolakan.map((p) => (
            <PenolakanAwam key={p.no} p={p} />
          ))}
        </ol>
      </details>

      <Draf jalan={jalan} />

      {/*
        Rincian teknis per jalan: alasan mentah huruf demi huruf (dengan kode
        pemeriksa, nomor aturan, slug fakta), untuk yang ingin memeriksa
        terjemahan di atas terhadap jejaknya.
      */}
      <details className="rincian-teknis" data-uid={`dapur:rincian-${jalan.id}`}>
        <summary>Rincian teknis: jejak mentah jalan ini</summary>
        <dl className="rincian">
          <dt>Jalan</dt>
          <dd>
            {jalan.milestone} · {jalan.folder}
          </dd>
          {jalan.berhenti !== null && (
            <>
              <dt>Berhenti</dt>
              <dd>{jalan.berhenti}</dd>
            </>
          )}
          <dt>Fakta disingkirkan</dt>
          {jalan.pemeriksaan.tersingkir.map((t) => (
            <dd key={t.fact_id}>
              {t.fact_id}: {t.alasan}
            </dd>
          ))}
          <dt>Penolakan, persis seperti di jejak</dt>
          {jalan.penolakan.map((p) => (
            <dd key={p.no}>
              {kepalaPenolakan(p)}
              {p.alasan.map((a, i) => (
                <span key={i} className="dapur-mentah">
                  {' '}“{a}”
                </span>
              ))}
            </dd>
          ))}
        </dl>
      </details>
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
              : <span className={`dapur-status-teks dapur-status-${statusJalan(j).jenis}`}>{statusJalan(j).label}</span>
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
          disunting. Kode teknisnya diterjemahkan; aslinya ada di lipatan “Rincian teknis”.
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
                <li key={a.id}>
                  <span className={`dapur-status-teks dapur-status-${a.terbit ? 'draf' : 'ditolak'}`}>
                    {kalimatAgregatAwam(a)}
                  </span>
                </li>
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
          <ul className="dapur-daftar dapur-peran">
            {TUGAS_PERAN.map((t) => (
              <li key={t.peran}>
                <IkonPeran peran={t.peran} />
                <span>
                  <strong>{namaPeran(t.peran)}</strong> ({t.oleh}). {t.tugas}
                </span>
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
            {DATA.agregat.map((a) => (
              <div key={a.id}>
                <dt>Jalan agregat {a.id}</dt>
                <dd>{kalimatAgregatMentah(a)}</dd>
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
