/**
 * Bangun paket fakta dari gudang cache — TANPA jaringan dan TANPA kredit Sectors
 * (M2d-24). Memakai pembangun yang sama dengan pintu penyusun
 * (`usulkanHari` + `bangunPaketPenyusun`).
 *
 *   node --experimental-strip-types alat/agen/bangun-paket.ts --survei
 *   node --experimental-strip-types alat/agen/bangun-paket.ts --kode XXXX [--tanggal YYYY-MM-DD] --keluar eval/penyusun/<folder>
 */
import { existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { AKAR } from '../../factory/llm/env.ts';
import { PemuatGudang } from '../penyusun/emiten.ts';
import { bangunPaketPenyusun } from '../penyusun/paket-otomatis.ts';
import { JENDELA_BAWAAN, usulkanHari } from '../penyusun/usulan.ts';

const arg = (nama: string): string | null => {
  const i = process.argv.indexOf(nama);
  return i >= 0 ? (process.argv[i + 1] ?? null) : null;
};
const pemuat = new PemuatGudang(join(AKAR, '.cache', 'sectors'));
const hariIni = new Date().toISOString().slice(0, 10);

if (process.argv.includes('--survei')) {
  const kode = [...pemuat.gudang().emiten.keys()].sort();
  for (const k of kode) {
    const data = pemuat.emiten(k);
    if (data === null) continue;
    try {
      const u = usulkanHari(k, data, { jendela: JENDELA_BAWAAN, hariIni });
      for (const x of u.usulan.slice(0, 2)) {
        let fakta = -1;
        try {
          fakta = bangunPaketPenyusun(k, x.tanggal, pemuat.gudang()).paket.fakta.length;
        } catch {
          fakta = -1;
        }
        console.log(`${k} ${x.tanggal} ${x.jenis.join("+").padEnd(28)} fakta ${String(fakta).padStart(2)} | ${x.alasan.slice(0, 110)}`);
      }
    } catch (g) {
      console.log(`${k} (galat usulan: ${g instanceof Error ? g.message.slice(0, 80) : 'galat'})`);
    }
  }
} else {
  const kode = arg('--kode');
  const keluar = arg('--keluar');
  if (kode === null || keluar === null) throw new Error('butuh --kode dan --keluar');
  const data = pemuat.emiten(kode);
  if (data === null) throw new Error(`${kode} tidak ada di gudang cache; mengambilnya butuh kredit Sectors — tidak dilakukan di sini.`);
  const tanggal = arg('--tanggal') ?? usulkanHari(kode, data, { jendela: JENDELA_BAWAAN, hariIni }).usulan[0]?.tanggal;
  if (tanggal === undefined) throw new Error(`tidak ada hari yang diusulkan untuk ${kode}`);
  const { paket, pilihan } = bangunPaketPenyusun(kode, tanggal, pemuat.gudang());
  const folder = join(AKAR, keluar);
  if (existsSync(folder)) throw new Error(`folder ${folder} sudah ada`);
  mkdirSync(folder, { recursive: true });
  writeFileSync(join(folder, 'paket.json'), `${JSON.stringify(paket, null, 2)}\n`, 'utf8');
  writeFileSync(join(folder, 'asal-paket.json'), `${JSON.stringify({ kode, tanggal, sumber: pilihan.sumber, keterangan: pilihan.keterangan, jaringan: false, kredit_sectors: 0 }, null, 2)}\n`, 'utf8');
  console.log(`${kode} ${tanggal}: ${String(paket.fakta.length)} fakta (${pilihan.sumber}) → ${keluar}/paket.json`);
  console.log(`peristiwa: ${paket.peristiwa}`);
  for (const f of paket.fakta) console.log(`- ${f.fact_id} | ${f.klaim.slice(0, 140)}`);
}
