import { useState } from 'react';
import type { Fakta, Kasus, Soal } from '../../factory/skema/tipe.ts';
import { PanelSumber } from './PanelSumber.tsx';
import { Teks } from './Teks.tsx';
import { DAFTAR_KASUS, faktaPembukaan, faktaTerlihat, indeksFakta } from './kasus.ts';

type Tahap = 'daftar' | 'fakta' | 'soal' | 'pembukaan' | 'debrief';

export function Aplikasi(): JSX.Element {
  const [tahap, setTahap] = useState<Tahap>('daftar');
  const [nomorSoal, setNomorSoal] = useState(0);
  const [jawaban, setJawaban] = useState<Record<string, string>>({});
  const [dikunci, setDikunci] = useState<Record<string, boolean>>({});
  const [sumber, setSumber] = useState<string | null>(null);

  const kasus = DAFTAR_KASUS[0];
  if (kasus === undefined) {
    return <main className="halaman">Belum ada kasus di berkas ini.</main>;
  }

  const indeks = indeksFakta(kasus);
  const faktaSumber: Fakta | null = sumber === null ? null : (indeks.get(sumber) ?? null);
  const bukaSumber = (fact_id: string): void => {
    setSumber(fact_id);
  };

  const mulai = (): void => {
    setTahap('fakta');
    setNomorSoal(0);
    setJawaban({});
    setDikunci({});
  };

  return (
    <>
      <main className="halaman">
        {tahap === 'daftar' ? (
          <Daftar kasus={kasus} mulai={mulai} />
        ) : (
          <>
            <KepalaKasus kasus={kasus} kembali={() => { setTahap('daftar'); }} />
            {tahap === 'fakta' && (
              <BagianFakta
                kasus={kasus}
                bukaSumber={bukaSumber}
                lanjut={() => { setTahap('soal'); }}
              />
            )}
            {tahap === 'soal' && (
              <BagianSoal
                kasus={kasus}
                nomor={nomorSoal}
                jawaban={jawaban}
                dikunci={dikunci}
                pilih={(soal_id, kunci) => {
                  setJawaban((lama) => ({ ...lama, [soal_id]: kunci }));
                }}
                kunci={(soal_id) => {
                  setDikunci((lama) => ({ ...lama, [soal_id]: true }));
                }}
                lanjut={() => {
                  if (nomorSoal + 1 < kasus.soal.length) setNomorSoal(nomorSoal + 1);
                  else setTahap('pembukaan');
                }}
                mundur={() => {
                  if (nomorSoal > 0) setNomorSoal(nomorSoal - 1);
                  else setTahap('fakta');
                }}
                bukaSumber={bukaSumber}
              />
            )}
            {tahap === 'pembukaan' && (
              <BagianPembukaan
                kasus={kasus}
                bukaSumber={bukaSumber}
                lanjut={() => { setTahap('debrief'); }}
              />
            )}
            {tahap === 'debrief' && (
              <BagianDebrief
                kasus={kasus}
                jawaban={jawaban}
                selesai={() => { setTahap('daftar'); }}
              />
            )}
            <Disclaimer kasus={kasus} />
          </>
        )}
      </main>
      {faktaSumber !== null && (
        <PanelSumber
          fakta={faktaSumber}
          tutup={() => { setSumber(null); }}
          bukaSumber={bukaSumber}
        />
      )}
    </>
  );
}

function Daftar({ kasus, mulai }: { kasus: Kasus; mulai: () => void }): JSX.Element {
  return (
    <>
      <h1>Runut</h1>
      <p className="sambutan">
        Latihan membaca dokumen pasar modal. Kamu melihat apa yang diketahui publik pada satu
        tanggal di masa lalu, menjawab tiga pertanyaan, lalu melihat apa yang terjadi sesudahnya.
        Setiap angka bisa diketuk untuk melihat sumbernya.
      </p>
      <ul className="daftar-kasus">
        <li>
          <article className="kartu">
            <h2>{kasus.judul}</h2>
            <p className="meta">
              {kasus.nama_samaran} · sektor {kasus.emiten.sektor} · data sampai {kasus.tanggal_t}
            </p>
            <p className="meta">
              {kasus.soal.length} soal · {kasus.fakta_terlihat.length} fakta · sekitar 5 menit
            </p>
            <button type="button" className="tombol-utama" onClick={mulai}>
              Mulai kasus ini
            </button>
          </article>
        </li>
      </ul>
      <p className="catatan">
        Tanpa akun, tanpa login, dan tanpa mengirim apa pun ke mana pun. Semua data sudah ada di
        dalam halaman ini.
      </p>
    </>
  );
}

function KepalaKasus({ kasus, kembali }: { kasus: Kasus; kembali: () => void }): JSX.Element {
  return (
    <header className="kepala">
      <button type="button" className="tombol-kecil" onClick={kembali}>
        ← Daftar kasus
      </button>
      <h1>{kasus.nama_samaran}</h1>
      <p className="meta">
        Sektor {kasus.emiten.sektor} · Papan {kasus.emiten.papan} · keadaan pada {kasus.tanggal_t}
      </p>
    </header>
  );
}

function Disclaimer({ kasus }: { kasus: Kasus }): JSX.Element {
  return (
    <aside className="disclaimer" aria-label="Tiga kalimat tetap">
      <ul>
        {kasus.disclaimer.map((kalimat) => (
          <li key={kalimat}>{kalimat}</li>
        ))}
      </ul>
    </aside>
  );
}

function KartuFakta({
  fakta,
  bukaSumber,
}: {
  fakta: Fakta;
  bukaSumber: (fact_id: string) => void;
}): JSX.Element {
  return (
    <li className="kartu kartu-fakta">
      <p>{fakta.klaim}</p>
      <p className="baris-kartu">
        <span className={`tanda tanda-${fakta.status.toLowerCase()}`}>{fakta.status}</span>
        <button
          type="button"
          className="tombol-kecil"
          onClick={() => {
            bukaSumber(fakta.fact_id);
          }}
        >
          Lihat sumber
        </button>
      </p>
    </li>
  );
}

function BagianFakta({
  kasus,
  bukaSumber,
  lanjut,
}: {
  kasus: Kasus;
  bukaSumber: (fact_id: string) => void;
  lanjut: () => void;
}): JSX.Element {
  return (
    <section aria-labelledby="judul-fakta">
      <h2 id="judul-fakta">Yang diketahui publik sampai {kasus.tanggal_t}</h2>
      <p>
        Baca dulu daftarnya. Apa pun yang baru terbit sesudah tanggal ini sengaja tidak ada di
        sini.
      </p>
      <ul className="daftar-fakta">
        {faktaTerlihat(kasus).map((fakta) => (
          <KartuFakta key={fakta.fact_id} fakta={fakta} bukaSumber={bukaSumber} />
        ))}
      </ul>
      <button type="button" className="tombol-utama" onClick={lanjut}>
        Lanjut ke {kasus.soal.length} soal
      </button>
    </section>
  );
}

function BagianSoal({
  kasus,
  nomor,
  jawaban,
  dikunci,
  pilih,
  kunci,
  lanjut,
  mundur,
  bukaSumber,
}: {
  kasus: Kasus;
  nomor: number;
  jawaban: Record<string, string>;
  dikunci: Record<string, boolean>;
  pilih: (soal_id: string, kunci: string) => void;
  kunci: (soal_id: string) => void;
  lanjut: () => void;
  mundur: () => void;
  bukaSumber: (fact_id: string) => void;
}): JSX.Element {
  const soal: Soal | undefined = kasus.soal[nomor];
  if (soal === undefined) return <p>Soal tidak ditemukan.</p>;
  const terpilih = jawaban[soal.soal_id];
  const sudah = dikunci[soal.soal_id] === true;
  const tepat = soal.pilihan.find((p) => p.kunci === soal.jawaban);

  return (
    <section aria-labelledby="judul-soal">
      <p className="langkah">
        Soal {nomor + 1} dari {kasus.soal.length}
      </p>
      <h2 id="judul-soal">
        <Teks teks={soal.batang} bukaSumber={bukaSumber} />
      </h2>

      <fieldset className="pilihan" disabled={sudah}>
        <legend className="tersembunyi">Pilih satu jawaban</legend>
        {soal.pilihan.map((p) => (
          <label
            key={p.kunci}
            className={`pilihan-baris${sudah && p.kunci === soal.jawaban ? ' pilihan-tepat' : ''}`}
          >
            <input
              type="radio"
              name={soal.soal_id}
              value={p.kunci}
              checked={terpilih === p.kunci}
              onChange={() => {
                pilih(soal.soal_id, p.kunci);
              }}
            />
            <span>
              <Teks teks={p.teks} bukaSumber={bukaSumber} interaktif={false} />
            </span>
          </label>
        ))}
      </fieldset>

      {!sudah && (
        <button
          type="button"
          className="tombol-utama"
          disabled={terpilih === undefined}
          onClick={() => {
            kunci(soal.soal_id);
          }}
        >
          Kunci jawaban
        </button>
      )}

      {sudah && (
        <div className="umpan-balik" role="status">
          <p>
            Jawaban yang dimaksud soal ini: <strong>{tepat?.kunci.toUpperCase()}</strong>.{' '}
            {terpilih === soal.jawaban
              ? 'Sama dengan pilihanmu.'
              : 'Berbeda dari pilihanmu — tidak apa-apa, alasannya di bawah.'}
          </p>
          <p>
            <Teks teks={soal.penjelasan} bukaSumber={bukaSumber} />
          </p>
          <button type="button" className="tombol-utama" onClick={lanjut}>
            {nomor + 1 < kasus.soal.length ? 'Soal berikutnya' : 'Lihat pembukaan'}
          </button>
        </div>
      )}

      <button type="button" className="tombol-kecil" onClick={mundur}>
        ← Kembali
      </button>
    </section>
  );
}

function BagianPembukaan({
  kasus,
  bukaSumber,
  lanjut,
}: {
  kasus: Kasus;
  bukaSumber: (fact_id: string) => void;
  lanjut: () => void;
}): JSX.Element {
  return (
    <section aria-labelledby="judul-pembukaan">
      <h2 id="judul-pembukaan">Apa yang terjadi sesudah {kasus.tanggal_t}</h2>
      {kasus.pembukaan.paragraf.map((paragraf, nomor) => (
        <p key={nomor}>
          <Teks teks={paragraf} bukaSumber={bukaSumber} />
        </p>
      ))}

      <h3>Fakta yang baru tersedia sesudah tanggal kasus</h3>
      <ul className="daftar-fakta">
        {faktaPembukaan(kasus).map((fakta) => (
          <KartuFakta key={fakta.fact_id} fakta={fakta} bukaSumber={bukaSumber} />
        ))}
      </ul>

      <JejakVerifikasi kasus={kasus} bukaSumber={bukaSumber} />

      <button type="button" className="tombol-utama" onClick={lanjut}>
        Lihat ringkasan
      </button>
    </section>
  );
}

function JejakVerifikasi({
  kasus,
  bukaSumber,
}: {
  kasus: Kasus;
  bukaSumber: (fact_id: string) => void;
}): JSX.Element {
  return (
    <section className="jejak" aria-labelledby="judul-jejak">
      <h3 id="judul-jejak">Jejak verifikasi</h3>
      <p>
        Sebelum kasus ini dibuat, rantai laporan kepemilikan diperiksa dengan sepuluh aturan.
        Hasilnya {kasus.temuan.length} temuan.
      </p>
      <ul className="daftar-temuan">
        {kasus.temuan.map((temuan) => (
          <li key={temuan.temuan_id} className="kartu">
            <p className="baris-kartu">
              <span className="tanda tanda-aturan">{temuan.aturan}</span>
            </p>
            <p>{temuan.ringkasan}</p>
            <ul className="angka-temuan">
              {temuan.angka.map((angka) => (
                <li key={angka.label}>
                  {angka.label}: <strong>{angka.nilai}</strong> {angka.satuan}
                </li>
              ))}
            </ul>
            {temuan.fakta_terkait.length > 0 && (
              <p className="baris-kartu">
                <span className="meta">Fakta terkait:</span>
                {temuan.fakta_terkait.slice(0, 6).map((id) => (
                  <button
                    key={id}
                    type="button"
                    className="rujukan"
                    onClick={() => {
                      bukaSumber(id);
                    }}
                  >
                    {id}
                  </button>
                ))}
                {temuan.fakta_terkait.length > 6 && (
                  <span className="meta">
                    dan {temuan.fakta_terkait.length - 6} fakta lain
                  </span>
                )}
              </p>
            )}
          </li>
        ))}
      </ul>

      <details>
        <summary>Aturan yang tidak bisa dijalankan atas kasus ini</summary>
        <ul className="daftar-parameter">
          {kasus.pemeriksaan
            .filter((p) => !p.dijalankan)
            .map((p) => (
              <li key={p.aturan}>
                <strong>{p.aturan}</strong> — {p.alasan_lewat}
              </li>
            ))}
          {kasus.pemeriksaan.every((p) => p.dijalankan) && <li>Semua aturan bisa dijalankan.</li>}
        </ul>
      </details>
    </section>
  );
}

function BagianDebrief({
  kasus,
  jawaban,
  selesai,
}: {
  kasus: Kasus;
  jawaban: Record<string, string>;
  selesai: () => void;
}): JSX.Element {
  const cocok = kasus.soal.filter((s) => jawaban[s.soal_id] === s.jawaban).length;
  return (
    <section aria-labelledby="judul-debrief">
      <h2 id="judul-debrief">Ringkasan</h2>
      <p>
        Pilihanmu sama dengan jawaban soal pada {cocok} dari {kasus.soal.length} soal. Angka ini
        tidak disimpan di mana pun.
      </p>
      <h3>Konsep yang dipakai kasus ini</h3>
      <ul className="daftar-konsep">
        {kasus.kartu_konsep.map((kartu) => (
          <li key={kartu.kode}>
            <span className="tanda tanda-aturan">{kartu.kode}</span> {kartu.judul}
          </li>
        ))}
      </ul>
      <p>
        Nama sebenarnya: {kasus.emiten.nama} ({kasus.emiten.simbol}).
      </p>
      <button type="button" className="tombol-utama" onClick={selesai}>
        Kembali ke daftar kasus
      </button>
    </section>
  );
}
