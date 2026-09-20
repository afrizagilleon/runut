// RQ-02 — `npm run eval:jalan -- --lengan A|S|C --ulang 3`.
//
// Menyimpan keluaran mentah tiap percobaan di eval/keluaran/<lengan>-<n>.json,
// beserta kredit Sectors dan token. Kalau pagu kredit tercapai, berhenti dan
// melaporkan berapa percobaan yang sudah selesai (RQ-05).
//
// `--tulis-prompt` menulis eval/prompt-a.txt dan eval/prompt-s.txt tanpa
// memanggil API sama sekali, supaya diff keduanya bisa diperiksa reviewer.

import { writeFileSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';
import { EVAL, iniEntri } from './berkas.ts';
import { jalankanA, promptA } from './lengan-a.ts';
import { jalankanS, promptS } from './lengan-s.ts';
import { jalankanC } from './lengan-c.ts';
import { PaguTercapai } from './lengan-mcp.ts';
import { ringkasanKredit } from './kredit.ts';
import { simpanPercobaan, type Percobaan } from './percobaan.ts';

type Lengan = 'A' | 'S' | 'C';

export function tulisPrompt(): { a: string; s: string } {
  mkdirSync(EVAL, { recursive: true });
  const a = join(EVAL, 'prompt-a.txt');
  const s = join(EVAL, 'prompt-s.txt');
  writeFileSync(a, promptA(), 'utf8');
  writeFileSync(s, promptS(), 'utf8');
  return { a, s };
}

/**
 * Pesan galat selengkap mungkin. `TypeError: fetch failed` sendirian tidak
 * memberi tahu apa pun: sebab sebenarnya ada di `cause` (kode soket, galat
 * TLS, atau respons HTTP). INV-6: kegagalan tidak boleh kehilangan isinya.
 */
function pesanGalat(galat: unknown): string {
  if (!(galat instanceof Error)) return String(galat);
  const bagian = [`${galat.name}: ${galat.message}`];
  let sebab: unknown = galat.cause;
  let kedalaman = 0;
  while (sebab !== undefined && sebab !== null && kedalaman < 5) {
    if (sebab instanceof Error) {
      const kode = (sebab as Error & { code?: string }).code;
      bagian.push(`cause: ${sebab.name}: ${sebab.message}${kode ? ` (code=${kode})` : ''}`);
      sebab = sebab.cause;
    } else {
      bagian.push(`cause: ${String(sebab)}`);
      sebab = undefined;
    }
    kedalaman++;
  }
  return bagian.join(' | ');
}

async function jalankanSatu(lengan: Lengan, ulangan: number): Promise<Percobaan> {
  if (lengan === 'A') return jalankanA(ulangan);
  if (lengan === 'S') return jalankanS(ulangan);
  return jalankanC(ulangan);
}

function bacaArgumen(argv: string[]): { lengan: Lengan[]; ulang: number; mulaiDari: number; tulisPrompt: boolean } {
  const lengan: Lengan[] = [];
  let ulang = 1;
  let mulaiDari = 1;
  let tulis = false;
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--lengan') {
      const nilai = argv[++i];
      for (const l of (nilai ?? '').split(',')) {
        if (l === 'A' || l === 'S' || l === 'C') lengan.push(l);
        else throw new Error(`Lengan tidak dikenal: ${l}`);
      }
    } else if (a === '--ulang') {
      ulang = Number(argv[++i]);
      if (!Number.isInteger(ulang) || ulang < 1) throw new Error('--ulang harus bilangan bulat >= 1');
    } else if (a === '--mulai-dari') {
      mulaiDari = Number(argv[++i]);
      if (!Number.isInteger(mulaiDari) || mulaiDari < 1) throw new Error('--mulai-dari harus bilangan bulat >= 1');
    } else if (a === '--tulis-prompt') {
      tulis = true;
    } else {
      throw new Error(`Argumen tidak dikenal: ${a}`);
    }
  }
  return { lengan, ulang, mulaiDari, tulisPrompt: tulis };
}

export async function jalankan(argv: string[]): Promise<void> {
  const opsi = bacaArgumen(argv);
  if (opsi.tulisPrompt) {
    const jalur = tulisPrompt();
    console.log(`prompt ditulis: ${jalur.a}, ${jalur.s}`);
    if (opsi.lengan.length === 0) return;
  }
  if (opsi.lengan.length === 0) {
    throw new Error('Pakai --lengan A|S|C (boleh dipisah koma) dan --ulang N.');
  }

  let selesai = 0;
  let berhenti = false;
  for (let n = opsi.mulaiDari; n < opsi.mulaiDari + opsi.ulang && !berhenti; n++) {
    for (const lengan of opsi.lengan) {
      let percobaan: Percobaan;
      try {
        percobaan = await jalankanSatu(lengan, n);
      } catch (galat) {
        if (galat instanceof PaguTercapai) {
          console.error(`BERHENTI: ${galat.message}`);
          berhenti = true;
          break;
        }
        // Kegagalan lengan dilaporkan sebagai kegagalan lengan itu, bukan
        // dihapus dari hasil (aturan pelaporan 5).
        percobaan = {
          lengan,
          ulangan: n,
          waktu_mulai: new Date().toISOString(),
          waktu_selesai: new Date().toISOString(),
          model: 'claude-sonnet-5',
          prompt_sha256: '',
          prompt_panjang: 0,
          token_masuk: 0,
          token_keluar: 0,
          alat_mcp: [],
          kredit_sectors: 0,
          stop_reason: null,
          teks_mentah: '',
          respons_mentah: null,
          urai_ok: false,
          alasan_gagal_urai: 'lengan gagal sebelum menghasilkan keluaran',
          keluaran: null,
          lolos_skema: false,
          masalah_skema: [],
          galat: pesanGalat(galat),
        };
      }
      const jalur = simpanPercobaan(percobaan);
      selesai++;
      console.log(
        `${percobaan.lengan}-${percobaan.ulangan}: ` +
          `urai=${percobaan.urai_ok ? 'ok' : 'GAGAL'} skema=${percobaan.lolos_skema ? 'lolos' : 'TIDAK'} ` +
          `kredit=${percobaan.kredit_sectors} token=${percobaan.token_masuk}/${percobaan.token_keluar} ` +
          `alat=${percobaan.alat_mcp.length}${percobaan.galat ? ` galat=${percobaan.galat}` : ''} -> ${jalur}`,
      );
    }
  }
  console.log('');
  console.log(`percobaan selesai: ${selesai}`);
  console.log(ringkasanKredit());
}

if (iniEntri(import.meta.url)) {
  jalankan(process.argv.slice(2)).catch((galat: unknown) => {
    console.error(galat instanceof Error ? galat.stack : String(galat));
    process.exitCode = 1;
  });
}
