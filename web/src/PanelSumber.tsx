import { useEffect, useRef } from 'react';
import type { Fakta } from '../../factory/skema/tipe.ts';

export interface PanelSumberProps {
  fakta: Fakta;
  tutup: () => void;
  bukaSumber: (fact_id: string) => void;
}

const KETERANGAN_STATUS: Record<Fakta['status'], string> = {
  TERVERIFIKASI: 'Lolos semua aturan verifikasi yang berlaku untuknya.',
  KONFLIK: 'Tersangkut temuan verifikasi dan belum selesai; tidak dipakai sebagai dasar jawaban.',
  BELUM: 'Belum diperiksa atau tanggal ketersediaannya tidak diketahui.',
};

/** Lembar sumber satu fakta: dari mana angkanya, dan sejak kapan bisa diketahui. */
export function PanelSumber({ fakta, tutup, bukaSumber }: PanelSumberProps): JSX.Element {
  const acuan = useRef<HTMLDivElement>(null);

  useEffect(() => {
    acuan.current?.focus();
  }, [fakta.fact_id]);

  const parameter = Object.entries(fakta.sumber.parameter);

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
        aria-label={`Sumber fakta ${fakta.fact_id}`}
        tabIndex={-1}
        ref={acuan}
        onKeyDown={(peristiwa) => {
          if (peristiwa.key === 'Escape') tutup();
        }}
      >
        <div className="panel-kepala">
          <h2>Dari mana angka ini?</h2>
          <button type="button" className="tombol-tutup" onClick={tutup}>
            Tutup
          </button>
        </div>

        <p className="klaim">{fakta.klaim}</p>

        <dl className="rincian">
          <dt>Kode fakta</dt>
          <dd>
            <code>{fakta.fact_id}</code>
          </dd>

          <dt>Status</dt>
          <dd>
            <span className={`tanda tanda-${fakta.status.toLowerCase()}`}>{fakta.status}</span>{' '}
            {KETERANGAN_STATUS[fakta.status]}
          </dd>

          <dt>Bisa diketahui publik sejak</dt>
          <dd>{fakta.tersedia_sejak ?? 'tidak bisa ditentukan dari data'}</dd>

          <dt>Jenis sumber</dt>
          <dd>{fakta.sumber.jenis}</dd>

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

          {fakta.sumber.keterangan !== null && (
            <>
              <dt>Cara menghitung</dt>
              <dd>{fakta.sumber.keterangan}</dd>
            </>
          )}

          {fakta.turunan_dari.length > 0 && (
            <>
              <dt>Dihitung dari</dt>
              <dd>
                <ul className="daftar-parameter">
                  {fakta.turunan_dari.map((id) => (
                    <li key={id}>
                      <button
                        type="button"
                        className="rujukan"
                        onClick={() => {
                          bukaSumber(id);
                        }}
                      >
                        {id}
                      </button>
                    </li>
                  ))}
                </ul>
              </dd>
            </>
          )}
        </dl>
      </div>
    </div>
  );
}
