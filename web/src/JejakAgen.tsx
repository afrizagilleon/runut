/**
 * Bagian "Jejak AI agent" di halaman dapur: rekaman kerja AI agent yang
 * menulis simulasi 15 Juni 2026, langkah demi langkah.
 *
 * Datanya `jejak-agen-data.json`, dibangun
 * `node --experimental-strip-types alat/jejak-agen.ts` dari rekaman empat
 * percobaan. Setiap angka, nama tool, ringkasan, dan alasan penolakan datang
 * dari sana; teks berpikir model (`penalaran`) tidak ada di data — hanya
 * jumlah tokennya.
 *
 * BOCORAN JAWABAN. Rekaman ini memuat soal dan kunci simulasi yang dimainkan
 * orang. Kebijakan halaman dapur (Amandemen A-1) untuk simulasi seperti itu:
 * hanya angka. Karena itu bagian ini TERTUTUP saat dibuka — yang terlihat
 * hanya jumlah langkah dan biaya per tahap — dan isinya baru dirender sesudah
 * pengunjung menekan tombol yang menyebut akibatnya. `JejakAgen.test.tsx`
 * menjaga bahwa keadaan tertutup tidak memuat satu kalimat pun dari rekaman.
 *
 * Tiga tampilan: Ringkas (satu baris per langkah), Rinci (tool result
 * lengkap), dan Diagram. Di diagram AI agent digambar SEKALI di tengah dan
 * tiap tool hanya terhubung ke agent (`docs/arsitektur-agen.md`): bukan
 * urutan kotak, bukan lajur waktu. Yang bergerak hanya tool mana yang menyala
 * saat pengunjung melangkah maju atau mundur dengan tombol.
 */
import { Fragment, useState } from 'react';
import mentah from './jejak-agen-data.json';
import { angkaId } from './angka.ts';
import { dolar } from './dapur.ts';
import { penanda } from './tanggal.ts';
import {
  BIDANG,
  KOTAK_AGEN,
  NAMA_TAHAP,
  TAMPILAN,
  TEMPAT,
  UKURAN_TOOL,
  alasanTolak,
  detik,
  dolarRinci,
  garisTool,
  langkahTahap,
  persenKotak,
  satuBaris,
  simpulNyala,
  statusHasil,
  tanpaHasil,
  type DataJejak,
  type HasilTool,
  type LangkahJejak,
  type Tampilan,
  type Titik,
} from './jejak-agen.ts';

export const DATA_JEJAK = mentah as unknown as DataJejak;

/** Kalimat peringatan gerbang; tanggalnya dari data. */
export function peringatanJejak(data: DataJejak): string {
  return `Rekaman ini memuat jawaban simulasi ${penanda(data.simulasi.tanggal).panjang}.`;
}

/** Satu baris untuk daftar di puncak halaman dapur. */
export function ringkasJejak(data: DataJejak): string {
  return `simulasi ${penanda(data.simulasi.tanggal).panjang}, ${angkaId(data.jumlah.langkah)} langkah terekam`;
}

/** Nama tool: boleh patah di garis bawah supaya muat di ponsel. */
function NamaTool({ nama }: { nama: string }): JSX.Element {
  const potong = nama.split('_');
  return (
    <span className="jejak-agen-tool">
      {potong.map((p, i) => (
        <Fragment key={i}>
          {i > 0 && (
            <>
              _<wbr />
            </>
          )}
          {p}
        </Fragment>
      ))}
    </span>
  );
}

function DaftarTool({ nama }: { nama: readonly string[] }): JSX.Element {
  return (
    <>
      {nama.map((n, i) => (
        <Fragment key={n}>
          {i > 0 && ', '}
          <NamaTool nama={n} />
        </Fragment>
      ))}
    </>
  );
}

/**
 * Status dan ringkasan satu tool result. Status dibaca dari medan `lolos`;
 * ringkasannya teks rekaman. Bila ringkasan itu sendiri diawali kata statusnya
 * ("lolos (draf …)"), kata itulah yang diwarnai — tidak ditulis dua kali.
 */
function StatusRingkas({ h }: { h: HasilTool }): JSX.Element {
  const status = statusHasil(h);
  if (status === null) return <span className="jejak-agen-rekaman">{h.ringkas}</span>;
  const kelas = `jejak-agen-status jejak-agen-status-${status}`;
  if (h.ringkas.startsWith(status)) {
    return (
      <>
        <span className={kelas}>{status}</span>
        <span className="jejak-agen-rekaman">{h.ringkas.slice(status.length)}</span>
      </>
    );
  }
  return (
    <>
      <span className={kelas}>{status}</span> <span className="jejak-agen-rekaman">{h.ringkas}</span>
    </>
  );
}

/**
 * Satu tool result dalam satu-dua baris: nama tool, status, ringkasan dari
 * rekaman, dan alasan penolakannya (satu baris di Ringkas, utuh di Diagram).
 */
function BarisHasil({ h, utuh }: { h: HasilTool; utuh: boolean }): JSX.Element {
  const alasan = alasanTolak(h);
  return (
    <li>
      <p className="jejak-agen-baris">
        <NamaTool nama={h.alat} /> <StatusRingkas h={h} />
      </p>
      {alasan.length > 0 &&
        (utuh ? (
          <ul className="jejak-agen-alasan">
            {alasan.map((a, i) => (
              <li key={i}>{a}</li>
            ))}
          </ul>
        ) : (
          <p className="jejak-agen-alasan">{satuBaris(alasan[0] ?? '')}</p>
        ))}
    </li>
  );
}

function TanpaHasil({ l }: { l: LangkahJejak }): JSX.Element | null {
  const nama = tanpaHasil(l);
  if (nama.length === 0) return null;
  return (
    <li>
      <p className="jejak-agen-baris meta">
        <DaftarTool nama={nama} />: tool result tidak tercatat di langkah ini.
      </p>
    </li>
  );
}

function KepalaTahap({ data, id }: { data: DataJejak; id: LangkahJejak['tahap'] }): JSX.Element | null {
  const t = data.tahap.find((x) => x.id === id);
  if (t === undefined) return null;
  return (
    <>
      <h3>{NAMA_TAHAP[id]}</h3>
      <p className="meta jejak-agen-tahap-angka">
        {angkaId(t.jumlah_langkah)} langkah · {dolar(t.biaya_usd)}
      </p>
    </>
  );
}

/* --- tampilan Ringkas -------------------------------------------------------- */

function Ringkas({ data }: { data: DataJejak }): JSX.Element {
  return (
    <div data-uid="jejak-agen:ringkas">
      {data.tahap.map((t) => (
        <section key={t.id} className="jejak-agen-tahap">
          <KepalaTahap data={data} id={t.id} />
          <ol className="jejak-agen-langkah">
            {langkahTahap(data, t.id).map((l) => (
              <li key={l.no}>
                <p className="jejak-agen-kepala">
                  <span className="meta">Langkah {angkaId(l.no)} · tool call</span> <DaftarTool nama={l.memanggil} />
                </p>
                <ul className="jejak-agen-hasil">
                  {l.hasil.map((h, i) => (
                    <BarisHasil key={i} h={h} utuh={false} />
                  ))}
                  <TanpaHasil l={l} />
                </ul>
              </li>
            ))}
          </ol>
        </section>
      ))}
    </div>
  );
}

/* --- tampilan Rinci ---------------------------------------------------------- */

/**
 * Satu nilai tool result, apa adanya: obyek menjadi daftar medan, larik
 * menjadi daftar butir, teks tetap dengan baris barunya. Tidak ada medan yang
 * dilewati dan tidak ada yang diringkas.
 */
function Nilai({ nilai }: { nilai: unknown }): JSX.Element {
  if (typeof nilai === 'string') {
    return nilai === '' ? <span className="meta">(teks kosong)</span> : <span className="jejak-agen-teks">{nilai}</span>;
  }
  if (Array.isArray(nilai)) {
    if (nilai.length === 0) return <span className="meta">(daftar kosong)</span>;
    return (
      <ol className="jejak-agen-larik">
        {nilai.map((x, i) => (
          <li key={i}>
            <Nilai nilai={x} />
          </li>
        ))}
      </ol>
    );
  }
  if (nilai !== null && typeof nilai === 'object') {
    const isi = Object.entries(nilai);
    if (isi.length === 0) return <span className="meta">(kosong)</span>;
    return (
      <dl className="rincian jejak-agen-medan">
        {isi.map(([k, v]) => (
          <Fragment key={k}>
            <dt>{k}</dt>
            <dd>
              <Nilai nilai={v} />
            </dd>
          </Fragment>
        ))}
      </dl>
    );
  }
  return <span>{String(nilai)}</span>;
}

function AngkaLangkah({ l }: { l: LangkahJejak }): JSX.Element {
  const butir = [
    `lama ${detik(l.latensi_ms)}`,
    `biaya model ${dolarRinci(l.biaya_usd)}`,
    ...(l.biaya_tester_usd > 0 ? [`biaya tester ${dolarRinci(l.biaya_tester_usd)}`] : []),
    `token berpikir ${angkaId(l.token_penalaran)}`,
    `token masuk ${angkaId(l.token_masuk)}`,
    `token keluar ${angkaId(l.token_keluar)}`,
    ...(l.mode_hemat === true ? ['mode hemat'] : []),
  ];
  return <p className="meta jejak-agen-angka">{butir.join(' · ')}</p>;
}

function Rinci({ data }: { data: DataJejak }): JSX.Element {
  return (
    <div data-uid="jejak-agen:rinci">
      <p className="meta">
        Rekaman mencatat nama tool yang dipilih agent dan tool result-nya; isi tool call tidak ikut dicatat. Tool
        result ditampilkan utuh; hanya kode saham dan alamat berkas yang disamarkan.
      </p>
      {data.tahap.map((t) => (
        <section key={t.id} className="jejak-agen-tahap">
          <KepalaTahap data={data} id={t.id} />
          <ol className="jejak-agen-langkah">
            {langkahTahap(data, t.id).map((l) => (
              <li key={l.no}>
                <p className="jejak-agen-kepala">
                  <span className="meta">
                    Langkah {angkaId(l.no)} · percobaan {angkaId(l.percobaan + 1)} · tool call
                  </span>{' '}
                  <DaftarTool nama={l.memanggil} />
                </p>
                <AngkaLangkah l={l} />
                {l.teks !== null && (
                  <p className="jejak-agen-ucapan">
                    <span className="meta">Ucapan agent:</span> “{l.teks}”
                  </p>
                )}
                <ul className="jejak-agen-hasil">
                  {l.hasil.map((h, i) => (
                    <li key={i}>
                      <p className="jejak-agen-baris">
                        <span className="meta">tool result</span> <NamaTool nama={h.alat} /> <StatusRingkas h={h} />
                      </p>
                      {alasanTolak(h).length > 0 && (
                        <ul className="jejak-agen-alasan">
                          {alasanTolak(h).map((a, j) => (
                            <li key={j}>{a}</li>
                          ))}
                        </ul>
                      )}
                      <details className="jejak-rinci dapur-lipat">
                        <summary>Lihat tool result lengkap</summary>
                        <Nilai nilai={h.hasil} />
                      </details>
                    </li>
                  ))}
                  <TanpaHasil l={l} />
                </ul>
              </li>
            ))}
          </ol>
        </section>
      ))}
      <details className="rincian-teknis" data-uid="jejak-agen:rincian">
        <summary>Rincian teknis: percobaan dan berkas rekaman</summary>
        <dl className="rincian">
          <dt>Model</dt>
          <dd>{data.model}</dd>
          {data.percobaan.map((p, i) => (
            <Fragment key={p.id}>
              <dt>
                Percobaan {angkaId(i + 1)} · {p.id}
              </dt>
              <dd>
                {angkaId(p.jumlah_langkah)} langkah · {dolar(p.biaya_usd)} (model {dolarRinci(p.biaya_agen_usd)}, tester{' '}
                {dolarRinci(p.biaya_tester_usd)}) · budget {dolar(p.pagu_usd)} · {angkaId(p.durasi_detik)} detik ·
                berhenti: “{p.berhenti}”
              </dd>
            </Fragment>
          ))}
          <dt>Berkas rekaman</dt>
          {data.sumber.map((s) => (
            <dd key={s}>{s}</dd>
          ))}
          <dt>Dibangun</dt>
          <dd>node --experimental-strip-types alat/jejak-agen.ts</dd>
        </dl>
      </details>
    </div>
  );
}

/* --- tampilan Diagram -------------------------------------------------------- */

function titik(daftar: readonly Titik[]): string {
  return daftar.map((t) => `${String(Math.round(t.x * 100) / 100)},${String(Math.round(t.y * 100) / 100)}`).join(' ');
}

function Diagram({
  data,
  no,
  pindah,
}: {
  data: DataJejak;
  no: number;
  pindah: (ke: number) => void;
}): JSX.Element | null {
  const l = data.langkah[no - 1];
  if (l === undefined) return null;
  const nyala = simpulNyala(data, l);
  const jumlah = data.langkah.length;
  const namaLama = data.tool.filter((t) => t.nama_lama.length > 0);
  return (
    <div data-uid="jejak-agen:diagram">
      <div className="jejak-agen-pindah">
        <button
          type="button"
          className="jejak-agen-tombol"
          onClick={() => pindah(no - 1)}
          aria-disabled={no <= 1}
          aria-label="Langkah sebelumnya"
          data-uid="jejak-agen:mundur"
        >
          ‹ Sebelumnya
        </button>
        <button
          type="button"
          className="jejak-agen-tombol"
          onClick={() => pindah(no + 1)}
          aria-disabled={no >= jumlah}
          aria-label="Langkah berikutnya"
          data-uid="jejak-agen:maju"
        >
          Berikutnya ›
        </button>
      </div>
      {/*
        Urutan di layar: tombol, langkah yang sedang dilihat, diagram, lalu
        hasilnya — supaya di ponsel tombol dan diagram terlihat bersamaan.
      */}
      <p className="jejak-agen-kepala jejak-agen-kini" aria-live="polite" data-uid="jejak-agen:kini">
        <span className="meta">
          Langkah {angkaId(l.no)} dari {angkaId(jumlah)} · {NAMA_TAHAP[l.tahap]} · tool call
        </span>{' '}
        <DaftarTool nama={l.memanggil} />
      </p>
      <div className="jejak-agen-bidang">
        <svg
          className="jejak-agen-garis"
          viewBox={`0 0 ${String(BIDANG.lebar)} ${String(BIDANG.tinggi)}`}
          aria-hidden="true"
          focusable="false"
        >
          {data.tool.map((t, i) => {
            const tempat = TEMPAT[i];
            if (tempat === undefined) return null;
            const g = garisTool(tempat);
            return (
              <g key={t.nama} className={nyala.includes(i) ? 'jejak-agen-nyala' : undefined}>
                <line x1={g.agen.x} y1={g.agen.y} x2={g.tool.x} y2={g.tool.y} />
                <polygon points={titik(g.panahAgen)} />
                <polygon points={titik(g.panahTool)} />
              </g>
            );
          })}
        </svg>
        <p
          className="jejak-agen-agen"
          style={persenKotak(
            KOTAK_AGEN.x + KOTAK_AGEN.lebar / 2,
            KOTAK_AGEN.y + KOTAK_AGEN.tinggi / 2,
            KOTAK_AGEN.lebar,
            KOTAK_AGEN.tinggi,
          )}
        >
          AI agent
        </p>
        <ul className="jejak-agen-simpul" aria-label="Tool yang bisa dipanggil AI agent">
          {data.tool.map((t, i) => {
            const tempat = TEMPAT[i];
            if (tempat === undefined) return null;
            const menyala = nyala.includes(i);
            return (
              <li
                key={t.nama}
                className={menyala ? 'jejak-agen-nyala' : undefined}
                aria-current={menyala ? 'step' : undefined}
                style={persenKotak(tempat.cx, tempat.cy, UKURAN_TOOL.lebar, UKURAN_TOOL.tinggi)}
              >
                <NamaTool nama={t.nama} />
              </li>
            );
          })}
        </ul>
      </div>
      <div className="jejak-agen-hasil-kini" aria-live="polite" data-uid="jejak-agen:hasil">
        {l.teks !== null && (
          <p className="jejak-agen-ucapan">
            <span className="meta">Ucapan agent:</span> “{l.teks}”
          </p>
        )}
        <ul className="jejak-agen-hasil">
          {l.hasil.map((h, i) => (
            <BarisHasil key={i} h={h} utuh />
          ))}
          <TanpaHasil l={l} />
        </ul>
      </div>
      <p className="meta">
        AI agent digambar sekali, di tengah. Tiap garis dua arah: tool call dari agent, tool result kembali ke agent.
        Tidak ada garis dari satu tool ke tool lain: urutan pemanggilan diputuskan agent, bukan kode.
        {namaLama.map((t) => (
          <Fragment key={t.nama}>
            {' '}
            Di rekaman awal, <NamaTool nama={t.nama} /> masih bernama <DaftarTool nama={t.nama_lama} />.
          </Fragment>
        ))}
      </p>
    </div>
  );
}

/* --- bagian ------------------------------------------------------------------ */

export interface AwalJejak {
  terbuka?: boolean;
  tampilan?: Tampilan;
  langkah?: number;
}

export default function JejakAgen({
  data = DATA_JEJAK,
  awal = {},
}: {
  data?: DataJejak;
  /** Keadaan awal; hanya dipakai tes. Bawaannya tertutup. */
  awal?: AwalJejak;
}): JSX.Element {
  const [terbuka, setTerbuka] = useState(awal.terbuka ?? false);
  const [tampilan, setTampilan] = useState<Tampilan>(awal.tampilan ?? 'ringkas');
  const [no, setNo] = useState(awal.langkah ?? 1);
  const pindah = (ke: number): void => {
    setNo(Math.min(data.langkah.length, Math.max(1, ke)));
  };

  return (
    <section className="dapur-bagian jejak-agen" aria-labelledby="judul-jejak-agen" data-uid="dapur:jejak-agen">
      <h2 id="judul-jejak-agen" className="judul">
        Jejak AI agent
      </h2>
      <p>
        Simulasi {penanda(data.simulasi.tanggal).panjang} ditulis AI agent: model yang memilih sendiri tool mana
        yang dipanggil, kapan, dan berapa kali. Yang terekam: {angkaId(data.jumlah.langkah)} langkah dalam{' '}
        {angkaId(data.percobaan.length)} percobaan, biaya nyata {dolar(data.jumlah.biaya_usd)}.
      </p>
      {/* Keadaan tertutup: hanya angka (Amandemen A-1). */}
      <ul className="dapur-daftar jejak-agen-tahap-daftar">
        {data.tahap.map((t) => (
          <li key={t.id}>
            <strong>{NAMA_TAHAP[t.id]}</strong>: {angkaId(t.jumlah_langkah)} langkah · {dolar(t.biaya_usd)}
          </li>
        ))}
      </ul>

      {/*
        Satu gerbang, satu tombol yang sama di kedua keadaan: fokus papan ketik
        tetap di tombol itu sesudah jejak dibuka atau ditutup.
      */}
      <div className="jejak-agen-gerbang" data-uid="jejak-agen:gerbang">
        <p>
          {peringatanJejak(data)}
          {!terbuka && ' Kalau kamu belum memainkannya, mainkan dulu: sesudah dibuka, soal dan kuncinya terlihat.'}
        </p>
        <button
          type="button"
          className="jejak-agen-tombol"
          aria-expanded={terbuka}
          onClick={() => setTerbuka(!terbuka)}
          data-uid={terbuka ? 'jejak-agen:tutup' : 'jejak-agen:buka'}
        >
          {terbuka ? 'Tutup jejak' : 'Buka jejak dan jawabannya'}
        </button>
      </div>
      {terbuka && (
        <>
          <div className="jejak-agen-sakelar" role="group" aria-label="Tampilan jejak">
            {TAMPILAN.map((t) => (
              <button
                key={t.id}
                type="button"
                className="jejak-agen-tombol"
                aria-pressed={tampilan === t.id}
                onClick={() => setTampilan(t.id)}
                data-uid={`jejak-agen:tampilan-${t.id}`}
              >
                {t.label}
              </button>
            ))}
          </div>
          {tampilan === 'ringkas' && <Ringkas data={data} />}
          {tampilan === 'rinci' && <Rinci data={data} />}
          {tampilan === 'diagram' && <Diagram data={data} no={no} pindah={pindah} />}
        </>
      )}
    </section>
  );
}
