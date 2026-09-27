/**
 * `npm run llm:tanding` — uji tanding 3 model × 3 paket fakta (M2d D-5).
 *
 * Setiap sel = `susun()` dengan prompt, paket, suhu, dan batas token yang sama;
 * paling banyak 3 percobaan. Panggilan berjalan BERURUTAN, satu per satu,
 * supaya pagu yang diperiksa sebelum kirim selalu melihat akumulasi yang
 * sebenarnya (panggilan paralel akan saling tidak melihat biaya yang sedang
 * berjalan).
 *
 * Keluaran mentah per sel: `eval/keluaran-m2d/sel/<paket>--<model>.json`
 * (teks mentah tiap percobaan, penalaran bila dikirim terpisah, masalah
 * validator, token, biaya, latensi). Sel yang berkasnya sudah ada dilewati,
 * supaya jalan yang terputus bisa dilanjutkan tanpa membayar ulang; `--ulang`
 * memaksa semuanya dijalankan lagi.
 *
 * Tidak ada yang tampil di sini yang memuat kunci atau alamat penyedia.
 */
import { existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { AKAR, bacaKonfigLlm } from './env.ts';
import { MODEL_TANDING } from './model.ts';
import { JALUR_LEDGER, PaguTercapai, PencatatBiaya, chatBerpagu } from './pagu.ts';
import { DEFINISI_PAKET, bangunPaket, type IdPaket, type PaketFakta } from './paket.ts';
import { PUTARAN, susun, type HasilSusun } from './susun.ts';
import { validasiDraf } from './validasi.ts';

export const FOLDER = `${AKAR}eval/keluaran-m2d`;
export const URUTAN_PAKET: readonly IdPaket[] = ['dada', 'ultj', 'tirt'];

/** Folder keluaran mentah per putaran: `sel/` (putaran 1) dan `sel-putaran2/`. */
export function folderPutaran(putaran: 1 | 2): string {
  return putaran === 2 ? 'sel-putaran2' : 'sel';
}

export function namaSel(paket: string, model: string): string {
  return `${paket}--${model.replace(/[^A-Za-z0-9.]+/g, '_')}`;
}

function simpan(jalur: string, isi: unknown): void {
  writeFileSync(jalur, JSON.stringify(isi, null, 2) + '\n', 'utf8');
}

async function utama(argumen: string[]): Promise<number> {
  const ulang = argumen.includes('--ulang');
  const putaran: 1 | 2 = argumen.includes('--putaran=2') ? 2 : 1;
  const folderSel = `${FOLDER}/${folderPutaran(putaran)}`;
  const konfig = bacaKonfigLlm();
  const pencatat = new PencatatBiaya({ paguUsd: konfig.paguUsd, jalurLedger: JALUR_LEDGER });
  mkdirSync(folderSel, { recursive: true });
  mkdirSync(`${FOLDER}/paket`, { recursive: true });

  const paket = new Map<IdPaket, PaketFakta>();
  for (const id of URUTAN_PAKET) {
    const p = bangunPaket(DEFINISI_PAKET[id]);
    paket.set(id, p);
    simpan(`${FOLDER}/paket/${id}.json`, p);
  }

  console.log(
    `Pagu US$${konfig.paguUsd.toFixed(2)}; akumulasi ledger sebelum mulai US$${pencatat.total().toFixed(6)}.`,
  );
  // Putaran 2 membolehkan keluaran ±2,7× lebih panjang; batas waktu ikut naik.
  const klien = { baseUrl: konfig.baseUrl, apiKey: konfig.apiKey, batasWaktuMs: putaran === 2 ? 900_000 : 300_000 };
  console.log(`Putaran ${String(putaran)}: max_tokens ${String(PUTARAN[putaran].maxTokens)} untuk semua model.`);

  for (const id of URUTAN_PAKET) {
    const p = paket.get(id);
    if (p === undefined) continue;
    for (const model of MODEL_TANDING) {
      const nama = namaSel(id, model);
      const jalur = `${folderSel}/${nama}.json`;
      if (!ulang && existsSync(jalur)) {
        console.log(`  ${nama}: sudah ada, dilewati.`);
        continue;
      }
      const mulai = new Date().toISOString();
      let hasil: HasilSusun;
      try {
        hasil = await susun({
          paket: p,
          model,
          panggil: async (pesan, setelan) =>
            chatBerpagu(
              klien,
              pencatat,
              { model, pesan, suhu: setelan.suhu, maxTokens: setelan.maxTokens },
              `${putaran === 2 ? 'tanding2' : 'tanding'}/${id}/${model}`,
            ),
          validasi: validasiDraf,
          putaran,
          hentikanSemua: (g) => g instanceof PaguTercapai,
        });
      } catch (galat) {
        if (galat instanceof PaguTercapai) {
          console.log(`BERHENTI: ${galat.message}`);
          simpan(`${FOLDER}/berhenti-pagu.json`, { sel: nama, waktu: new Date().toISOString(), pesan: galat.message });
          return 2;
        }
        throw galat;
      }
      simpan(jalur, { sel: nama, mulai, selesai: new Date().toISOString(), ...hasil });
      const ringkas = hasil.percobaan
        .map((x) => `p${String(x.ke)}:${x.lolos ? 'LOLOS' : x.galat !== null ? 'GALAT' : String(x.masalah.length)}`)
        .join(' ');
      const biaya = hasil.percobaan.reduce((a, x) => a + x.biaya_usd, 0);
      console.log(
        `  ${nama}: ${hasil.lolos ? `LOLOS di percobaan ${String(hasil.lolos_di)}` : 'TIDAK LOLOS'} [${ringkas}] ` +
          `US$${biaya.toFixed(6)}; akumulasi US$${pencatat.total().toFixed(6)}`,
      );
    }
  }
  console.log(`Selesai. Akumulasi ledger US$${pencatat.total().toFixed(6)} dari pagu US$${konfig.paguUsd.toFixed(2)}.`);
  return 0;
}

// Hanya berjalan sebagai perintah; `penguji.ts` dan `laporan.ts` mengimpor tetapannya.
if (process.argv[1]?.endsWith('tanding.ts') === true) {
  utama(process.argv.slice(2)).then(
    (kode) => {
      process.exitCode = kode;
    },
    (galat: unknown) => {
      console.error(galat instanceof Error ? `${galat.name}: ${galat.message}` : 'galat tak dikenal');
      process.exitCode = 1;
    },
  );
}
