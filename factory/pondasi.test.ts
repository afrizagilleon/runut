import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

const berkasPaket = fileURLToPath(new URL('../package.json', import.meta.url));

interface Paket {
  type: string;
  scripts: Record<string, string>;
  dependencies: Record<string, string>;
  devDependencies: Record<string, string>;
}

const paket = JSON.parse(readFileSync(berkasPaket, 'utf8')) as Paket;

describe('pondasi proyek', () => {
  it('menyediakan empat skrip yang dijanjikan kontrak M1', () => {
    // M1.5 5 memperbolehkan menambah skrip ke package.json untuk perkakas
    // evaluasi, jadi yang diuji adalah keempat skrip M1 tetap ada, bukan bahwa
    // tidak ada skrip lain. Skrip tambahan wajib berawalan `eval:` — atau
    // disebut namanya di daftar di bawah — supaya penambahan diam-diam di luar
    // lingkup tetap merah.
    //
    // M3.1 D-12 menambahkan `dev`, `preview`, dan `kolektor`; D-10 menambahkan
    // `alpha:ringkas`. Keempatnya disebut satu per satu, bukan diloloskan lewat
    // awalan baru, supaya penjaga ini tetap menangkap skrip yang tidak
    // disahkan kontrak mana pun.
    const M1 = ['build', 'build:case', 'test', 'typecheck'];
    const M31 = ['dev', 'preview', 'kolektor', 'alpha:ringkas'];
    // M3.2 RQ-08: gate desain INV-11/INV-12.
    const M32 = ['periksa:desain'];
    // M3.3 D-1: uji ujung-ke-ujung di browser sungguhan. `e2e:lihat` adalah
    // `--headed`, untuk dilihat manusia. Disebut satu per satu seperti yang
    // lain — tidak ada awalan baru yang diloloskan — supaya penjaga ini tetap
    // menangkap skrip yang tidak disahkan kontrak mana pun.
    const M33 = ['e2e', 'e2e:lihat'];
    // A-3 D-C2: pemburu goyah, menjalankan rangkaian berulang di bawah beban CPU.
    const A3 = ['e2e:beban'];
    // M2a D-6: mesin verifikasi generasi kedua atas seluruh gudang data.
    // Disebut namanya, bukan diloloskan lewat awalan baru.
    const M2A = ['verifikasi:gudang'];
    // M2d D-1/D-5/D-6: penyusun LLM dan uji tanding tiga model. Kontraknya
    // menamai `npm run llm:tanding`; keempatnya disebut satu per satu.
    const M2D = ['llm:model', 'llm:tanding', 'llm:penguji', 'llm:laporan'];
    // M2d-2 D-5/D-6/D-7: lingkar agen. Kontraknya menamai `npm run agen:susun`;
    // bahan penguji eksternal dan laporannya disebut satu per satu juga.
    const M2D2 = ['agen:susun', 'agen:penguji', 'agen:laporan'];
    // M2d-3 D-6/D-7/D-8: lingkar agen berperan (penulis ≠ penilai), disebut satu per satu.
    const M2D3 = ['peran:susun', 'peran:penguji', 'peran:laporan'];
    const skrip = Object.keys(paket.scripts).sort();
    for (const wajib of [...M1, ...M32, ...M33, ...A3, ...M2A]) {
      expect(skrip).toContain(wajib);
    }
    const tambahan = skrip.filter((s) => !M1.includes(s));
    const takDikenal = tambahan.filter(
      (s) =>
        !s.startsWith('eval:') &&
        !M31.includes(s) &&
        !M32.includes(s) &&
        !M33.includes(s) &&
        !A3.includes(s) &&
        !M2A.includes(s) &&
        !M2D.includes(s) &&
        !M2D2.includes(s) &&
        !M2D3.includes(s),
    );
    expect(takDikenal).toEqual([]);
  });

  it('memakai ESM', () => {
    expect(paket.type).toBe('module');
  });

  it('tidak memuat dependensi jaringan atau LLM', () => {
    const terlarang = [
      'axios',
      'node-fetch',
      'got',
      'openai',
      '@anthropic-ai/sdk',
      '@google/generative-ai',
      'langchain',
    ];
    const semua = Object.keys({ ...paket.dependencies, ...paket.devDependencies });
    expect(semua.filter((d) => terlarang.includes(d))).toEqual([]);
  });
});
