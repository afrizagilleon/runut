/**
 * M2d-12 T-03: tes kejujuran tampilan pintu penyusun (D-3).
 *
 * Kalimat di layar dibuat oleh `halaman/ringkas.js` (fungsi murni yang SAMA
 * dengan yang dipakai halaman), jadi dites langsung atas log jalan nyata:
 * - tidak ada "ditulis manusia" di mana pun (penulis draf = agen AI);
 * - jalan yang tidak terbit tidak pernah tampil "lulus" atau "terbit" (kecuali
 *   "tidak terbit"), dan langkahnya tidak diberi tanda centang;
 * - penanda rekaman selalu dipasang di tayang ulang;
 * - jeda yang dipadatkan diumumkan "dipercepat ×N".
 */
import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { beforeAll, describe, expect, it } from 'vitest';
import type { Peristiwa } from './aliran.ts';
import { statusRekaman } from './server.ts';
import { bacaRekaman } from './tayang-ulang.ts';

const AKAR = fileURLToPath(new URL('../../', import.meta.url));
const SINI = fileURLToPath(new URL('./', import.meta.url));
const HALAMAN = join(SINI, 'halaman');

interface Papan {
  tahap: Array<{ kunci: string; keadaan: string; catatan: string }>;
  omongan: Array<{ no: number; keadaan: string; teks: string; ditolak: string | null }>;
  gerbang: Array<{ status: string; peran: string; tugas: string; alasan: string }>;
  hasil: { terbit: boolean } | null;
}
interface Ringkas {
  ringkasPapan(d: Peristiwa[]): Papan;
  teksHasil(h: unknown): { cap: string; kelas: string; kalimat: string } | null;
  teksJeda(t: unknown): string | null;
  teksRekaman(r: unknown): { label: string; rincian: string; konteks: string | null } | null;
  teksStatus(s: string): string;
  POLA_TERLARANG: RegExp[];
}

let R: Ringkas;
beforeAll(async () => {
  R = (await import(pathToFileURL(join(HALAMAN, 'ringkas.js')).href)) as Ringkas;
});

const jalan = (id: string): string => join(AKAR, 'eval', 'penyusun', id);

/** "terbit" yang tidak didahului "tidak " (abaikan huruf besar/kecil). */
function terbitTanpaTidak(teks: string): string[] {
  const keluar: string[] = [];
  for (const m of teks.matchAll(/terbit/gi)) {
    const sebelum = teks.slice(Math.max(0, (m.index ?? 0) - 6), m.index).toLowerCase();
    if (!/tidak\s$/.test(sebelum)) keluar.push(teks.slice(Math.max(0, (m.index ?? 0) - 30), (m.index ?? 0) + 12));
  }
  return keluar;
}

/** Teks papan yang tampil (nilai, bukan nama kunci data). */
function teksPapan(p: Papan): string {
  return [
    ...p.tahap.flatMap((t) => [t.catatan]),
    ...p.omongan.flatMap((o) => [o.teks, o.ditolak ?? '']),
    ...p.gerbang.flatMap((g) => [R.teksStatus(g.status), g.peran, g.tugas, g.alasan]),
  ].join(' | ');
}

/** Semua teks yang bisa tampil untuk satu jalan: log + papan di tiap titik + hasil + jeda + rekaman + catatan. */
function teksTampil(id: string): string {
  const r = bacaRekaman(jalan(id));
  const st = statusRekaman(r, AKAR);
  const bagian: string[] = [];
  for (let i = 1; i <= r.peristiwa.length; i++) {
    const p = r.peristiwa[i - 1] as Peristiwa;
    bagian.push(p.judul, JSON.stringify(p.isi['alasan'] ?? ''), JSON.stringify(p.isi['penolakan'] ?? ''));
    bagian.push(teksPapan(R.ringkasPapan(r.peristiwa.slice(0, i))));
  }
  const hasil = r.peristiwa.at(-1)?.isi;
  bagian.push(JSON.stringify(R.teksHasil(hasil)));
  for (const j of r.jadwal) bagian.push(String(R.teksJeda(j)));
  bagian.push(JSON.stringify(R.teksRekaman(st)), JSON.stringify(st['catatan']));
  return bagian.join('\n');
}

describe('tidak ada "ditulis manusia"', () => {
  it('di berkas halaman, catatan rekaman, dan kode server/alur', () => {
    const berkas = [
      ...readdirSync(HALAMAN).map((n) => join(HALAMAN, n)),
      join(SINI, 'rekaman', 'catatan.json'),
      ...readdirSync(SINI).filter((n) => n.endsWith('.ts') && !n.endsWith('.test.ts')).map((n) => join(SINI, n)),
    ];
    for (const b of berkas) {
      const isi = readFileSync(b, 'utf8');
      for (const pola of R.POLA_TERLARANG) expect(pola.test(isi), `${b} ${String(pola)}`).toBe(false);
    }
  });

  it('di semua teks yang tampil untuk kedua rekaman', () => {
    for (const id of ['m2d11-tirt-7', 'm2d10-tirt-a2']) {
      const t = teksTampil(id);
      for (const pola of R.POLA_TERLARANG) expect(pola.test(t), `${id} ${String(pola)}`).toBe(false);
    }
  });

  it('penulis draf disebut agen AI (Runut Agent)', () => {
    const app = readFileSync(join(HALAMAN, 'app.js'), 'utf8');
    expect(app).toContain('ditulis agen AI (Runut Agent)');
  });
});

describe('jalan yang tidak terbit tidak tampil lulus/terbit', () => {
  it('m2d10-tirt-a2: tidak ada "lulus"; setiap "terbit" didahului "tidak"', () => {
    const t = teksTampil('m2d10-tirt-a2');
    expect(t).not.toMatch(/lulus/i);
    expect(terbitTanpaTidak(t)).toEqual([]);
  });

  it('m2d10-tirt-a2: cap TIDAK TERBIT; langkah agen dan hasil bertanda gagal, bukan centang', () => {
    const r = bacaRekaman(jalan('m2d10-tirt-a2'));
    const h = R.teksHasil(r.peristiwa.at(-1)?.isi);
    expect(h?.cap.toUpperCase()).toBe('TIDAK TERBIT');
    expect(h?.kelas).toBe('cap-belum');
    const papan = R.ringkasPapan(r.peristiwa);
    const langkah = Object.fromEntries(papan.tahap.map((x) => [x.kunci, x]));
    expect(langkah['agen']).toMatchObject({ keadaan: 'gagal' });
    expect(langkah['agen']?.catatan).toMatch(/^✗ berhenti/);
    expect(langkah['hasil']).toMatchObject({ keadaan: 'gagal', catatan: '✗ tidak terbit' });
    expect(langkah['penyetuju']?.catatan).not.toContain('✓');
    expect(papan.gerbang.at(-1)).toMatchObject({ status: 'berhenti', peran: 'jalan berhenti' });
    expect(R.teksStatus('berhenti')).toBe('✗ berhenti');
    expect(R.teksStatus('tidak-terbit')).toBe('✗ tidak terbit');
    expect(papan.omongan.find((o) => o.no === 2)?.keadaan).toBe('tolak');
  });

  it('hasil tidak terbit buatan (berhenti batas versi) juga tidak pernah "terbit"/"lulus"', () => {
    const h = R.teksHasil({ terbit: false, putaran: 12, berhenti: 'batas 12 versi tercapai' });
    const t = JSON.stringify(h);
    expect(t).not.toMatch(/lulus/i);
    expect(terbitTanpaTidak(t)).toEqual([]);
  });

  it('m2d11-tirt-7 (terbit): cap DRAF TERBIT, ketiga omongan dikunci', () => {
    const r = bacaRekaman(jalan('m2d11-tirt-7'));
    expect(R.teksHasil(r.peristiwa.at(-1)?.isi)?.cap.toUpperCase()).toBe('DRAF TERBIT');
    expect(R.ringkasPapan(r.peristiwa).omongan.map((o) => o.keadaan)).toEqual(['dikunci', 'dikunci', 'dikunci']);
  });
});

describe('penanda rekaman dan jeda', () => {
  it('status rekaman memberi label "Rekaman jalan <id>, <tanggal>" dan konteks bersumber', () => {
    const st = statusRekaman(bacaRekaman(jalan('m2d10-tirt-a2')), AKAR);
    const t = R.teksRekaman(st);
    expect(t?.label).toBe('Rekaman jalan m2d10-tirt-a2, 1 Okt 2026');
    expect(t?.rincian).toContain('Tanpa panggilan model');
    expect(t?.konteks).toMatch(/tidak terbit/);
  });

  it('halaman memasang penanda rekaman yang menempel (sticky) di tayang ulang', () => {
    const html = readFileSync(join(HALAMAN, 'index.html'), 'utf8');
    const app = readFileSync(join(HALAMAN, 'app.js'), 'utf8');
    const css = readFileSync(join(HALAMAN, 'gaya.css'), 'utf8');
    expect(html).toMatch(/<p class="tanda-rekaman" id="rekaman" hidden><\/p>/);
    expect(app).toMatch(/tandaR\.hidden = false/);
    expect(app).toContain("el('span', { kelas: 'rekaman-label' }, 'Rekaman')");
    expect(css).toMatch(/\.tanda-rekaman \{\n {2}position: sticky;/);
  });

  it('jeda yang dipadatkan → "Dipercepat ×N"; yang dipanjangkan → "Diperlambat"', () => {
    const r = bacaRekaman(jalan('m2d11-tirt-7'));
    for (const j of r.jadwal) {
      const t = R.teksJeda(j);
      if (j.jenis === 'dipercepat') expect(t).toBe(`Dipercepat ×${String(j.faktor)}: ${(t ?? '').split(': ').slice(1).join(': ')}`);
      if (j.jenis === 'dipercepat') expect(t).toMatch(/^Dipercepat ×\d+: jeda asli .+, diputar .+$/);
      if (j.jenis === 'diperlambat') expect(t).toMatch(/^Diperlambat agar terbaca: /);
    }
    expect(r.jadwal.filter((j) => j.jenis === 'dipercepat').length).toBeGreaterThan(20);
  });

  it('tombol di tayang ulang tidak aktif dan berlabel rekaman', () => {
    const app = readFileSync(join(HALAMAN, 'app.js'), 'utf8');
    expect(app).toContain("id: 'setujui-biaya', disabled: Boolean(r)");
    expect(app).toContain("id: 'setujui', disabled: tayangUlang()");
    expect(app.match(/Rekaman, tidak aktif: /g)?.length).toBe(2);
  });
});

/**
 * M2d-14 D-3: catatan audit memakai audit satu soal (docs/bukti/lingkar-agen-pemula-audit.md
 * bagian "Ulang"), bukan angka dibundel yang cacat metode. Frasa lama terlarang.
 */
describe('catatan audit: angka dibundel yang cacat tidak tampil lagi', () => {
  const FRASA_LAMA = /tanpa kartu pun (?:opus )?memilih kunci 4\/4/i;
  const berkas = (): string[] => [
    ...readdirSync(HALAMAN).map((n) => join(HALAMAN, n)),
    ...readdirSync(join(SINI, 'rekaman')).filter((n) => n.endsWith('.json')).map((n) => join(SINI, 'rekaman', n)),
    ...readdirSync(SINI).filter((n) => n.endsWith('.ts') && !n.endsWith('.test.ts')).map((n) => join(SINI, n)),
    join(AKAR, 'docs', 'bukti', 'pintu-penyusun.md'),
  ];

  it('frasa "tanpa kartu pun memilih kunci 4/4" tidak ada di halaman, catatan, kode, dan laporan pintu', () => {
    for (const b of berkas()) expect(FRASA_LAMA.test(readFileSync(b, 'utf8')), b).toBe(false);
  });

  it('frasa itu juga tidak ada di teks yang tampil untuk rekaman mana pun', () => {
    for (const id of ['m2d11-tirt-7', 'm2d10-tirt-a2', 'm2d13-opus-2']) expect(FRASA_LAMA.test(teksTampil(id)), id).toBe(false);
  });

  it('catatan TIRT-7 memakai hasil satu soal: omongan 1 1/4, omongan 2 4/4, omongan 3 2/4', () => {
    const c = JSON.parse(readFileSync(join(SINI, 'rekaman', 'catatan.json'), 'utf8')) as { jalan: Record<string, { sesudah: string[]; sumber: string }> };
    const t7 = c.jalan['m2d11-tirt-7'];
    const teks = t7?.sesudah.join(' ') ?? '';
    expect(teks).toMatch(/satu soal/);
    expect(teks).toMatch(/omongan 1 1\/4/);
    expect(teks).toMatch(/omongan 2 4\/4/);
    expect(teks).toMatch(/omongan 3 2\/4/);
    expect(t7?.sumber).toContain('lingkar-agen-pemula-audit.md');
  });

  it('catatan m2d13-opus-2: audit satu soal o1 4/4 (sinyal), o3 1/4; penilai mutu Opus sekeluarga disebut', () => {
    const c = JSON.parse(readFileSync(join(SINI, 'rekaman', 'catatan.json'), 'utf8')) as { jalan: Record<string, { sesudah: string[]; sumber: string }> };
    const o = c.jalan['m2d13-opus-2'];
    const teks = o?.sesudah.join(' ') ?? '';
    expect(teks).toMatch(/omongan 1 4\/4/);
    expect(teks).toMatch(/sinyal, bukan patokan/);
    expect(teks).toMatch(/omongan 3 1\/4/);
    expect(teks).toMatch(/8,83/);
    expect(teks).toMatch(/sekeluarga/);
    expect(o?.sumber).toContain('eval/keluaran-m2d13/audit-opus/nilai.json');
  });
});
