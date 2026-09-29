/**
 * Paket uji ulang untuk penguji independen (M4a D-5): `npm run audit:paket`.
 *
 * Tiap temuan terpilih (`pilihUjiUlang`) dijadikan satu paket yang HANYA berisi:
 *
 * - kalimat awam aturannya (bukan kodenya, bukan ringkasan temuan kami);
 * - satu baris "fokus" yang netral — objek mana yang dilihat (tanggal laporan,
 *   rentang hari, nama pemegang) — tanpa angka hasil hitung dan tanpa vonis;
 * - potongan respons mentah Sectors yang relevan, apa adanya (baris JSON asli,
 *   dipilih menurut tanggal/pemegang/tahun, tidak diubah nilainya).
 *
 * Paket berisi data mentah, jadi ditulis ke `.cache/audit-gudang/paket/`
 * (tidak ikut repo). Yang ikut repo: `eval/audit-gudang/pilihan.json` — daftar
 * temuan terpilih, fokus, berkas sumber, dan sha256 tiap paket, supaya paket
 * bisa dibangun ulang dan dicocokkan.
 */
import { createHash } from 'node:crypto';
import { existsSync, mkdirSync, readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';
import { ATURAN_PENANDA } from '../factory/gudang.ts';
import { jalankan, type Audit, type Contoh } from './audit-gudang.ts';
import { AKAR, FOLDER_SECTORS } from './sectors.ts';

export const FOLDER_PAKET = join(AKAR, '.cache', 'audit-gudang', 'paket');
export const JALUR_PILIHAN = join(AKAR, 'eval', 'audit-gudang', 'pilihan.json');

export const PERTANYAAN_PENOLAK =
  'Apakah data ini benar-benar tidak konsisten seperti kata kalimat itu? ' +
  'Jawab ya/tidak/ragu + tunjukkan hitunganmu.';
/**
 * Aturan penanda tidak mengklaim "tidak konsisten" — ia menandai keadaan yang
 * perlu dijelaskan. Pertanyaan kontrak diadaptasi seminimal mungkin supaya
 * penguji menilai klaim yang memang dibuat kalimatnya.
 */
export const PERTANYAAN_PENANDA =
  'Apakah data ini benar-benar menunjukkan keadaan yang dikatakan kalimat itu? ' +
  'Jawab ya/tidak/ragu + tunjukkan hitunganmu.';

type Obj = Record<string, unknown>;

function baca(nama: string): unknown {
  return JSON.parse(readFileSync(join(FOLDER_SECTORS, nama), 'utf8'));
}

function berkasEmiten(simbol: string): string[] {
  return readdirSync(FOLDER_SECTORS)
    .filter((n) => n.startsWith(`${simbol}-m4a-`) && n.endsWith('.json'))
    .sort();
}

interface Sumber {
  filings: Obj[];
  aksi: Obj | null;
  kepemilikan: Obj | null;
  ringkasan: Obj | null;
  harian: Obj[];
  berkasHarian: string[];
  suspensi: Obj[];
}

function muatSumber(simbol: string): Sumber {
  const nama = berkasEmiten(simbol);
  const filings: Obj[] = [];
  for (const n of nama.filter((x) => x.includes('-filings-'))) {
    filings.push(...(((baca(n) as Obj)['results'] as Obj[] | undefined) ?? []));
  }
  const satu = (akhiran: string) => {
    const n = nama.find((x) => x.endsWith(akhiran));
    return n === undefined ? null : (baca(n) as Obj);
  };
  const berkasHarian = nama.filter((x) => x.includes('-daily-'));
  const harian = new Map<string, Obj>();
  for (const n of berkasHarian) for (const r of baca(n) as Obj[]) if (!harian.has(String(r['date']))) harian.set(String(r['date']), r);
  const suspensi = (baca('suspensions-all.json') as Obj[]).filter(
    (r) => String(r['symbol']).replace(/\.JK$/, '') === simbol,
  );
  return {
    filings,
    aksi: satu('-corpactions.json'),
    kepemilikan: satu('-ownership.json'),
    ringkasan: satu('-overview-financials.json'),
    harian: [...harian.values()].sort((a, b) => String(a['date']).localeCompare(String(b['date']))),
    berkasHarian,
    suspensi,
  };
}

const TS = /\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/g;
const TGL = /\d{4}-\d{2}-\d{2}/g;

function cap(teks: string[]): string[] {
  return [...new Set(teks)].sort();
}

function tambahHari(t: string, n: number): string {
  return new Date(Date.parse(`${t}T00:00:00Z`) + n * 86_400_000).toISOString().slice(0, 10);
}

function hariAntara(s: Sumber, awal: string, akhir: string): Obj[] {
  return s.harian.filter((r) => String(r['date']) >= awal && String(r['date']) <= akhir);
}

function aksiTanpaRups(s: Sumber): Obj | null {
  const ca = (s.aksi?.['corporate_actions'] ?? null) as Obj | null;
  if (ca === null) return null;
  const { agm: _agm, ...lain } = ca;
  return lain;
}

function keuanganTahun(s: Sumber, tahun: number[]): Obj[] {
  const f = (s.ringkasan?.['financials'] ?? {}) as Obj;
  return ((f['historical_financials'] as Obj[] | undefined) ?? []).filter((r) => tahun.includes(Number(r['year'])));
}

export interface Paket {
  id: string;
  aturan: string;
  simbol: string;
  kalimat: string;
  fokus: string;
  pertanyaan: string;
  potongan: Array<{ dari: string; keterangan: string; isi: unknown }>;
}

/** Bangun potongan dan fokus menurut aturan. Nilai data tidak pernah diubah. */
export function bangunPaket(id: string, c: Contoh, kalimat: string, audit: Audit): Paket {
  const s = muatSumber(c.simbol);
  const t = c.temuan;
  const teks = `${t.ringkasan} ${t.rujukan.join(' ')}`;
  const ts = cap(teks.match(TS) ?? []);
  const tgl = cap((teks.replace(TS, '').match(TGL) ?? []));
  const pot: Paket['potongan'] = [];
  const berkas = (akhiran: string) => `${c.simbol}-m4a-${akhiran}`;
  const filings = `${c.simbol}-m4a-filings-p*.json results[]`;
  const harian = `${c.simbol}-m4a-daily-*.json`;
  let fokus = '';

  const barisLaporan = (daftarTs: string[]) => s.filings.filter((r) => daftarTs.includes(String(r['timestamp'])));

  switch (c.aturan) {
    case 'R25': {
      fokus = `kelengkapan daftar laporan kepemilikan ${c.simbol}, dan respons kosong di gudang yang sama`;
      for (const n of berkasEmiten(c.simbol).filter((x) => x.includes('-filings-'))) {
        pot.push({ dari: n, keterangan: 'respons filings emiten ini, utuh', isi: baca(n) });
      }
      const kosong = audit.paginasi_kosong;
      pot.push({
        dari: '.cache/sectors/',
        keterangan: `${kosong.length} berkas respons kosong di gudang yang sama: nama berkas dan isinya`,
        isi: kosong.map((n) => ({ berkas: n, isi: baca(n) })),
      });
      break;
    }
    case 'R12':
    case 'R15':
    case 'R11a':
      fokus = `laporan kepemilikan bertanggal ${ts.join(', ')}`;
      pot.push({ dari: filings, keterangan: 'baris laporan itu, utuh', isi: barisLaporan(ts) });
      break;
    case 'R7':
    case 'R13': {
      fokus = `laporan kepemilikan bertanggal ${ts.join(', ')}, dibandingkan dengan saham beredar pada tanggal itu`;
      pot.push({ dari: filings, keterangan: 'baris laporan itu, utuh', isi: barisLaporan(ts) });
      const hari = ts.map((x) => x.slice(0, 10));
      pot.push({
        dari: harian,
        keterangan: 'harga harian 5 hari sebelum s.d. hari laporan (market_cap = nilai pasar, close = harga tutup)',
        isi: hariAntara(s, tambahHari(hari[0]!, -5), hari[hari.length - 1]!),
      });
      break;
    }
    case 'R17B': {
      fokus = `laporan kepemilikan bertanggal ${ts.join(', ')}, butir transaksi bertanggal ${tgl.join(', ')}`;
      pot.push({ dari: filings, keterangan: 'baris laporan itu, utuh', isi: barisLaporan(ts) });
      pot.push({ dari: harian, keterangan: 'harga harian pada tanggal butir transaksi', isi: hariAntara(s, tgl[0]!, tgl[tgl.length - 1]!) });
      break;
    }
    case 'R14': {
      const pemegang = /Rantai (.+?) putus/.exec(t.ringkasan)?.[1] ?? '';
      fokus = `rantai laporan pemegang "${pemegang}" antara ${ts.join(' dan ')}`;
      pot.push({
        dari: filings,
        keterangan: `semua baris laporan pemegang ini di respons filings, utuh`,
        isi: s.filings.filter((r) => r['holder_name'] === pemegang),
      });
      break;
    }
    case 'R16':
    case 'R11b': {
      fokus =
        c.aturan === 'R16'
          ? `urutan jam terbit laporan-laporan kepemilikan ${c.simbol} terhadap saldo sebelum/sesudahnya`
          : `persen kepemilikan di seluruh rantai laporan ${c.simbol} dan jumlah saham beredar yang tersirat`;
      pot.push({
        dari: filings,
        keterangan: 'semua baris laporan emiten ini, hanya medan angka dan identitasnya',
        isi: s.filings.map((r) => ({
          timestamp: r['timestamp'],
          source: r['source'],
          holder_name: r['holder_name'],
          transaction_type: r['transaction_type'],
          holding_before: r['holding_before'],
          holding_after: r['holding_after'],
          amount_transaction: r['amount_transaction'],
          share_percentage_before: r['share_percentage_before'],
          share_percentage_after: r['share_percentage_after'],
          price_transaction: r['price_transaction'],
        })),
      });
      break;
    }
    case 'R22': {
      const nama = [...t.ringkasan.matchAll(/"([^"]+)"/g)].map((m) => m[1] ?? '');
      fokus = `nama pemegang ${nama.map((n) => `"${n}"`).join(' dan ')}`;
      const cocok = (x: unknown) => nama.some((n) => String(x).toLowerCase() === n.toLowerCase());
      pot.push({ dari: filings, keterangan: 'baris laporan pemegang dengan nama itu (medan identitas)', isi: s.filings.filter((r) => cocok(r['holder_name'])).map((r) => ({ timestamp: r['timestamp'], holder_name: r['holder_name'], holding_before: r['holding_before'], holding_after: r['holding_after'] })) });
      pot.push({ dari: berkas('ownership.json'), keterangan: 'ownership.major_shareholders, utuh', isi: (s.kepemilikan?.['ownership'] as Obj | undefined)?.['major_shareholders'] ?? null });
      break;
    }
    case 'R20':
    case 'R32':
    case 'R26':
    case 'R27': {
      const f = (s.ringkasan?.['financials'] ?? {}) as Obj;
      const tahun = cap((teks.match(/\b20\d\d\b/g) ?? [])).map(Number);
      if (c.aturan === 'R20') {
        fokus = `laba per lembar dan jumlah saham penyebutnya tiap tahun buku ${c.simbol}`;
        pot.push({ dari: berkas('overview-financials.json'), keterangan: 'financials.historical_eps, utuh', isi: f['historical_eps'] ?? null });
        pot.push({
          dari: berkas('overview-financials.json'),
          keterangan: 'financials.historical_financials: year, earnings, outstanding_shares',
          isi: ((f['historical_financials'] as Obj[] | undefined) ?? []).map((r) => ({ year: r['year'], earnings: r['earnings'], outstanding_shares: r['outstanding_shares'] })),
        });
      } else if (c.aturan === 'R32') {
        fokus = `jumlah saham ${c.simbol} antara tahun buku ${tahun.join(' dan ')}, dan aksi korporasi yang tercatat`;
        pot.push({
          dari: berkas('overview-financials.json'),
          keterangan: 'financials.historical_financials: year, outstanding_shares',
          isi: ((f['historical_financials'] as Obj[] | undefined) ?? []).map((r) => ({ year: r['year'], outstanding_shares: r['outstanding_shares'] })),
        });
        pot.push({ dari: berkas('corpactions.json'), keterangan: 'corporate_actions tanpa agm, utuh', isi: aksiTanpaRups(s) });
      } else if (c.aturan === 'R26') {
        fokus = `dividen ex ${tgl.join(', ')} dan laba tahun buku ${tahun.filter((x) => x < 2024 || tahun.length === 1).join(', ')}`;
        const div = (((s.aksi?.['corporate_actions'] as Obj | undefined)?.['dividend'] as Obj[] | undefined) ?? []).filter((d) => tgl.includes(String(d['ex_date'])));
        pot.push({ dari: berkas('corpactions.json'), keterangan: 'corporate_actions.dividend baris itu', isi: div });
        pot.push({ dari: berkas('overview-financials.json'), keterangan: 'financials.historical_financials tahun terkait, utuh', isi: keuanganTahun(s, tahun) });
        pot.push({ dari: berkas('overview-financials.json'), keterangan: 'overview: market_cap, last_close_price, latest_close_date', isi: { market_cap: (s.ringkasan?.['overview'] as Obj)?.['market_cap'], last_close_price: (s.ringkasan?.['overview'] as Obj)?.['last_close_price'], latest_close_date: (s.ringkasan?.['overview'] as Obj)?.['latest_close_date'] } });
      } else {
        fokus = `medan rasio ${/`(\w+)`/.exec(t.ringkasan)?.[1] ?? ''} tahun buku ${tahun.join(', ')}`;
        pot.push({
          dari: berkas('overview-financials.json'),
          keterangan: 'financials.historical_financial_ratio tahun itu, utuh',
          isi: ((f['historical_financial_ratio'] as Obj[] | undefined) ?? []).filter((r) => tahun.includes(Number(r['year']))),
        });
        pot.push({ dari: berkas('overview-financials.json'), keterangan: 'financials.historical_financials tahun itu, utuh', isi: keuanganTahun(s, tahun) });
      }
      break;
    }
    case 'R21': {
      fokus = `jumlah saham ${c.simbol} per ${tgl.join(', ')} menurut dua sumber`;
      const tahun = Number(tgl[0]!.slice(0, 4));
      pot.push({ dari: berkas('overview-financials.json'), keterangan: `financials.historical_financials tahun ${tahun}: year, outstanding_shares`, isi: keuanganTahun(s, [tahun]).map((r) => ({ year: r['year'], outstanding_shares: r['outstanding_shares'] })) });
      pot.push({ dari: harian, keterangan: 'harga harian 10 hari sebelum s.d. 5 hari sesudah tanggal itu', isi: hariAntara(s, tambahHari(tgl[0]!, -10), tambahHari(tgl[0]!, 5)) });
      break;
    }
    case 'R33': {
      fokus = `jumlah saham tersirat (nilai pasar dibagi harga tutup) ${c.simbol} pada ${tgl.join(' dan ')}`;
      pot.push({ dari: harian, keterangan: 'harga harian 5 hari sebelum s.d. 5 hari sesudah', isi: hariAntara(s, tambahHari(tgl[0]!, -5), tambahHari(tgl[tgl.length - 1]!, 5)) });
      pot.push({ dari: berkas('corpactions.json'), keterangan: 'corporate_actions tanpa agm, utuh', isi: aksiTanpaRups(s) });
      break;
    }
    case 'R18a':
    case 'R19a':
    case 'R19b': {
      fokus = `hari bursa ${c.simbol} ${tgl[0]} s.d. ${tgl[tgl.length - 1]}`;
      pot.push({ dari: harian, keterangan: 'harga harian 3 hari sebelum s.d. 3 hari sesudah rentang itu, utuh', isi: hariAntara(s, tambahHari(tgl[0]!, -3), tambahHari(tgl[tgl.length - 1]!, 3)) });
      pot.push({ dari: 'suspensions-all.json', keterangan: `semua baris suspensi ${c.simbol}`, isi: s.suspensi });
      break;
    }
    case 'R28': {
      const ex = /(\d{4}-\d{2}-\d{2})/.exec(t.ringkasan)?.[1] ?? tgl[0]!;
      fokus = `harga dan jumlah saham tersirat ${c.simbol} di sekitar aksi korporasi ${ex}`;
      pot.push({ dari: berkas('corpactions.json'), keterangan: 'corporate_actions tanpa agm, utuh', isi: aksiTanpaRups(s) });
      pot.push({ dari: harian, keterangan: 'harga harian 7 hari sebelum s.d. 7 hari sesudah', isi: hariAntara(s, tambahHari(ex, -7), tambahHari(ex, 7)) });
      break;
    }
    case 'R35': {
      fokus = `nilai harga ekstrem di ringkasan ${c.simbol} dan deret harga hariannya`;
      pot.push({ dari: berkas('overview-financials.json'), keterangan: 'overview.all_time_price, last_close_price, latest_close_date', isi: { all_time_price: (s.ringkasan?.['overview'] as Obj)?.['all_time_price'], last_close_price: (s.ringkasan?.['overview'] as Obj)?.['last_close_price'], latest_close_date: (s.ringkasan?.['overview'] as Obj)?.['latest_close_date'] } });
      pot.push({ dari: harian, keterangan: 'harga harian 95 hari terakhir yang ada di gudang', isi: hariAntara(s, tambahHari(tgl[tgl.length - 1]!, -95), '9999-12-31') });
      pot.push({ dari: berkas('corpactions.json'), keterangan: 'corporate_actions tanpa agm, utuh', isi: aksiTanpaRups(s) });
      break;
    }
    case 'R23':
    case 'R31': {
      const rups = /RUPS (\d{4}-\d{2}-\d{2})/.exec(t.rujukan.join(' '))?.[1] ?? '';
      const ca = (s.aksi?.['corporate_actions'] ?? {}) as Obj;
      pot.push({ dari: berkas('corpactions.json'), keterangan: `corporate_actions.agm baris ${rups}, utuh`, isi: ((ca['agm'] as Obj[] | undefined) ?? []).filter((r) => r['agm_date'] === rups) });
      if (c.aturan === 'R23') {
        const tahun = Number(/tahun buku (\d{4})/.exec(teks)?.[1] ?? '0');
        fokus = `laba bersih tahun buku ${tahun} menurut keputusan RUPS ${rups} dan menurut laporan keuangan`;
        pot.push({ dari: berkas('overview-financials.json'), keterangan: `financials.historical_financials tahun ${tahun}, utuh`, isi: keuanganTahun(s, [tahun]) });
      } else {
        fokus = `dividen per lembar menurut keputusan RUPS ${rups} dan menurut medan dividend`;
        pot.push({ dari: berkas('corpactions.json'), keterangan: 'corporate_actions.dividend dan stock_split, utuh', isi: { dividend: ca['dividend'], stock_split: ca['stock_split'] } });
      }
      break;
    }
    case 'R34': {
      fokus = `aksi korporasi ${c.simbol} dan tanggal yang tercakup harga harian`;
      pot.push({ dari: berkas('corpactions.json'), keterangan: 'corporate_actions tanpa agm, utuh', isi: aksiTanpaRups(s) });
      pot.push({
        dari: harian,
        keterangan: 'berkas harga harian yang ada: tanggal pertama, tanggal terakhir, jumlah baris',
        isi: s.berkasHarian.map((n) => {
          const r = baca(n) as Obj[];
          return { berkas: n, pertama: r[0]?.['date'] ?? null, terakhir: r[r.length - 1]?.['date'] ?? null, baris: r.length };
        }),
      });
      break;
    }
    default:
      throw new Error(`Tidak ada aturan paket untuk ${c.aturan}`);
  }
  return {
    id,
    aturan: c.aturan,
    simbol: c.simbol,
    kalimat,
    fokus,
    pertanyaan: ATURAN_PENANDA.includes(c.aturan) ? PERTANYAAN_PENANDA : PERTANYAAN_PENOLAK,
    potongan: pot,
  };
}

/** Teks prompt yang diberikan ke penguji: hanya isi paket. */
export function teksPrompt(p: Paket): string {
  return [
    'Kamu penguji independen. Kamu hanya menerima bahan di bawah ini: satu kalimat aturan dan potongan',
    'respons mentah dari API data saham Indonesia (Sectors). Jangan membuka berkas, jangan mencari di',
    'internet, jangan memakai pengetahuan di luar bahan ini kecuali aritmetika dan akal sehat.',
    '',
    `Kalimat aturan: "${p.kalimat}"`,
    `Fokus: ${p.fokus}.`,
    '',
    `Pertanyaan: ${p.pertanyaan}`,
    '',
    'Format jawaban: baris pertama tepat "JAWABAN: ya", "JAWABAN: tidak", atau "JAWABAN: ragu".',
    'Sesudahnya tunjukkan hitunganmu langkah demi langkah dengan angka dari bahan, lalu satu paragraf alasan.',
    '',
    'Bahan (JSON mentah):',
    '```json',
    JSON.stringify(p.potongan, null, 1),
    '```',
  ].join('\n');
}

function utama(): number {
  if (existsSync(JALUR_PILIHAN)) {
    // Pilihan dibekukan begitu penguji menjawab: sesudah aturan diperbaiki,
    // pilihUjiUlang atas gudang baru memilih temuan lain, dan jawaban penguji
    // tidak boleh diam-diam dipasangkan dengan temuan yang berbeda.
    console.error(`${JALUR_PILIHAN} sudah ada; pilihan uji ulang tidak dibangun ulang.`);
    return 1;
  }
  const { audit, pilihan } = jalankan();
  mkdirSync(FOLDER_PAKET, { recursive: true });
  const daftar = pilihan.map((c, i) => {
    const id = `U${String(i + 1).padStart(2, '0')}`;
    const kalimat = audit.aturan.find((a) => a.aturan === c.aturan)?.kalimat ?? c.aturan;
    const paket = bangunPaket(id, c, kalimat, audit);
    const prompt = teksPrompt(paket);
    writeFileSync(join(FOLDER_PAKET, `${id}.txt`), prompt, 'utf8');
    return {
      id,
      aturan: c.aturan,
      simbol: c.simbol,
      kelompok: c.kelompok,
      temuan_id: c.temuan.temuan_id,
      fokus: paket.fokus,
      pertanyaan: paket.pertanyaan,
      sumber: [...new Set(paket.potongan.map((x) => x.dari))],
      prompt_sha256: createHash('sha256').update(prompt).digest('hex'),
      prompt_byte: Buffer.byteLength(prompt),
    };
  });
  mkdirSync(join(AKAR, 'eval', 'audit-gudang'), { recursive: true });
  writeFileSync(
    JALUR_PILIHAN,
    `${JSON.stringify({ keterangan: 'Temuan terpilih untuk uji ulang D-5 (alat/audit-gudang.ts pilihUjiUlang) dan sidik prompt penguji (.cache/audit-gudang/paket/, tidak ikut repo). Ditulis oleh npm run audit:paket.', uji: daftar }, null, 2)}\n`,
    'utf8',
  );
  for (const d of daftar) console.log(`${d.id} ${d.aturan.padEnd(5)} ${d.simbol} ${String(d.prompt_byte).padStart(7)} B  ${d.fokus}`);
  return 0;
}

const dijalankanLangsung =
  process.argv[1] !== undefined && import.meta.url === pathToFileURL(process.argv[1]).href;
if (dijalankanLangsung) {
  process.exitCode = utama();
}
