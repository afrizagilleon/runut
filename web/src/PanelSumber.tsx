import { useEffect, useRef } from 'react';
import type { Fakta } from '../../factory/skema/tipe.ts';
import { penanda } from './tanggal.ts';

export interface PanelSumberProps {
  fakta: Fakta;
  tutup: () => void;
  bukaSumber: (fact_id: string) => void;
}

/** Elemen yang bisa menerima fokus di dalam panel. */
const BISA_FOKUS =
  'a[href], button:not([disabled]), input:not([disabled]), textarea, summary, [tabindex]:not([tabindex="-1"])';

function tanggalOrang(iso: string | null): string {
  if (iso === null) return 'tidak bisa ditentukan dari data';
  try {
    return penanda(iso).panjang;
  } catch {
    return iso;
  }
}

/**
 * Lembar bawah yang menjawab satu pertanyaan: dari mana angka ini?
 *
 * Yang langsung terlihat hanya tiga hal dalam bahasa orang — kalimat resminya,
 * cara menghitungnya, dan sejak kapan publik bisa membacanya. Kosakata pabrik
 * (kode fakta, jenis sumber, endpoint, parameter) ada di bawah lipatan
 * "Rincian teknis", karena ia jawaban untuk pertanyaan yang lain
 * (`docs/desain.md`).
 *
 * Fokus masuk ke panel, terperangkap di dalamnya, latar tidak bisa digulir, dan
 * saat ditutup fokus kembali ke tombol yang membukanya.
 */
export function PanelSumber({ fakta, tutup, bukaSumber }: PanelSumberProps): JSX.Element {
  const acuan = useRef<HTMLDivElement>(null);
  const pemicu = useRef<Element | null>(null);

  useEffect(() => {
    pemicu.current = document.activeElement;
    const gulirLama = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = gulirLama;
      if (pemicu.current instanceof HTMLElement) pemicu.current.focus();
    };
  }, []);

  useEffect(() => {
    acuan.current?.focus();
  }, [fakta.fact_id]);

  const tekan = (peristiwa: React.KeyboardEvent<HTMLDivElement>): void => {
    if (peristiwa.key === 'Escape') {
      tutup();
      return;
    }
    if (peristiwa.key !== 'Tab') return;
    const panel = acuan.current;
    if (panel === null) return;
    const isi = [...panel.querySelectorAll<HTMLElement>(BISA_FOKUS)];
    if (isi.length === 0) return;
    const pertama = isi[0];
    const terakhir = isi[isi.length - 1];
    if (pertama === undefined || terakhir === undefined) return;
    // Fokus terperangkap: dari elemen terakhir Tab kembali ke yang pertama.
    if (peristiwa.shiftKey && document.activeElement === pertama) {
      peristiwa.preventDefault();
      terakhir.focus();
    } else if (!peristiwa.shiftKey && document.activeElement === terakhir) {
      peristiwa.preventDefault();
      pertama.focus();
    }
  };

  const parameter = Object.entries(fakta.sumber.parameter);
  const dihitung = fakta.sumber.jenis === 'turunan';
  const judul = fakta.awam?.kepala ?? fakta.klaim.slice(0, 60);

  return (
    <div
      className="panel-latar"
      role="presentation"
      onClick={(peristiwa) => {
        if (peristiwa.target === peristiwa.currentTarget) tutup();
      }}
    >
      <div
        className="panel"
        role="dialog"
        aria-modal="true"
        aria-label={`Dari mana angka ini — ${judul}`}
        tabIndex={-1}
        ref={acuan}
        onKeyDown={tekan}
      >
        <div className="panel-kepala">
          <h2>Dari mana angka ini?</h2>
          <button type="button" className="tombol-tutup" onClick={tutup}>
            Tutup
          </button>
        </div>

        <p className="klaim">{fakta.klaim}</p>

        {dihitung && fakta.sumber.keterangan !== null && (
          <p className="cara-hitung">
            <span className="label-orang">Cara menghitungnya:</span> {fakta.sumber.keterangan}
          </p>
        )}

        <p className="sejak-kapan">
          Sudah bisa dibaca publik sejak {tanggalOrang(fakta.tersedia_sejak)}.
        </p>

        {fakta.turunan_dari.length > 0 && (
          <p className="dari-fakta">
            <span className="label-orang">Dihitung dari:</span>{' '}
            {fakta.turunan_dari.map((id, nomor) => (
              <span key={id}>
                {nomor > 0 && ' · '}
                <button
                  type="button"
                  className="rujukan"
                  onClick={() => {
                    bukaSumber(id);
                  }}
                >
                  {id}
                </button>
              </span>
            ))}
          </p>
        )}

        <details className="rincian-teknis">
          <summary>Rincian teknis (untuk yang ingin memeriksa)</summary>
          <dl className="rincian">
            <dt>Kode fakta</dt>
            <dd>
              <code>{fakta.fact_id}</code>
            </dd>

            <dt>Jenis sumber</dt>
            <dd>{fakta.sumber.jenis}</dd>

            <dt>Status verifikasi</dt>
            <dd>{fakta.status}</dd>

            {fakta.sumber.endpoint !== null && (
              <>
                <dt>Endpoint</dt>
                <dd>
                  <code>{fakta.sumber.endpoint}</code>
                </dd>
              </>
            )}

            {fakta.sumber.berkas !== null && (
              <>
                <dt>Berkas sumber</dt>
                <dd>
                  <code>{fakta.sumber.berkas}</code>
                </dd>
              </>
            )}

            {parameter.length > 0 && (
              <>
                <dt>Parameter</dt>
                <dd>
                  <ul className="daftar-parameter">
                    {parameter.map(([kunci, nilai]) => (
                      <li key={kunci}>
                        <code>
                          {kunci}={nilai}
                        </code>
                      </li>
                    ))}
                  </ul>
                </dd>
              </>
            )}

            <dt>Waktu data ditarik</dt>
            <dd>{fakta.sumber.diambil_pada ?? 'tidak tercatat di dalam data'}</dd>
          </dl>
        </details>
      </div>
    </div>
  );
}
