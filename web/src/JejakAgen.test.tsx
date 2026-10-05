/**
 * Bagian "Jejak AI agent" di halaman dapur, dirender tanpa peramban.
 *
 * Yang dijaga:
 * - BOCORAN JAWABAN: keadaan bawaan tertutup; sebelum pengunjung membukanya
 *   tidak satu kalimat pun dari rekaman (soal, pilihan, kunci, alasan tester)
 *   ada di halaman — hanya angka per tahap dan peringatannya.
 * - Ringkas: satu baris per langkah, tool yang dipilih, status dan alasan satu
 *   baris, dikelompokkan per tahap dengan jumlah langkah dan biayanya.
 * - Rinci: tool result lengkap dan setiap alasan penolakan, huruf demi huruf.
 * - Diagram: AI agent digambar sekali; garis hanya antara agent dan tool;
 *   tidak ada garis yang melewati kotak tool lain.
 * - Teks berpikir model tidak tampil; kode saham dan nama perusahaan tidak tampil.
 */
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { createElement as h } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import Dapur from './Dapur.tsx';
import JejakAgen, { DATA_JEJAK, peringatanJejak, ringkasJejak, type AwalJejak } from './JejakAgen.tsx';
import { angkaId } from './angka.ts';
import { dolar } from './dapur.ts';
import {
  BIDANG,
  KOTAK_AGEN,
  NAMA_TAHAP,
  TEMPAT,
  UKURAN_TOOL,
  alasanTolak,
  detik,
  dolarRinci,
  garisTool,
  satuBaris,
  simpulNyala,
  statusHasil,
  tanpaHasil,
  type Titik,
} from './jejak-agen.ts';

const DATA = DATA_JEJAK;

function render(awal: AwalJejak): string {
  return renderToStaticMarkup(h(JejakAgen, { awal }));
}

/** Teks tampil: tag dibuang, entitas yang dipakai React dikembalikan, spasi dirapatkan. */
function teksDari(html: string): string {
  return html
    .replace(/<[^>]+>/g, ' ')
    .replace(/&quot;/g, '"')
    .replace(/&#x27;/g, "'")
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&amp;/g, '&')
    .replace(/\s+/g, ' ');
}

/** Sama, tetapi tag dibuang tanpa spasi: nama tool dipatahkan `<wbr>` di garis bawah. */
function teksRapat(html: string): string {
  return teksDari(html.replace(/<wbr\/?>/g, '').replace(/<\/?span[^>]*>/g, ''));
}

function semuaTeks(nilai: unknown, keluar: string[] = []): string[] {
  if (typeof nilai === 'string') keluar.push(nilai);
  else if (Array.isArray(nilai)) for (const x of nilai) semuaTeks(x, keluar);
  else if (nilai !== null && typeof nilai === 'object') for (const x of Object.values(nilai)) semuaTeks(x, keluar);
  return keluar;
}

const rapat = (t: string): string => t.replace(/\s+/g, ' ').trim();

/** Setiap teks rekaman yang bisa membocorkan isi simulasi: tool result, ringkasan, ucapan agent. */
const TEKS_REKAMAN = [
  ...new Set(
    DATA.langkah.flatMap((l) => [
      ...(l.teks === null ? [] : [l.teks]),
      ...l.hasil.flatMap((x) => [x.ringkas, ...semuaTeks(x.hasil)]),
    ]),
  ),
].map(rapat);

const tertutup = render({});
const ringkas = render({ terbuka: true, tampilan: 'ringkas' });
const rinci = render({ terbuka: true, tampilan: 'rinci' });
const diagram = (no: number): string => render({ terbuka: true, tampilan: 'diagram', langkah: no });

describe('jejak AI agent — tertutup sampai pengunjung membukanya (bocoran jawaban)', () => {
  const teks = teksDari(tertutup);

  it('bawaan: peringatan, satu tombol, dan hanya angka per tahap', () => {
    expect(teks).toContain('Jejak AI agent');
    expect(peringatanJejak(DATA)).toBe('Rekaman ini memuat jawaban simulasi 15 Juni 2026.');
    expect(teks).toContain(peringatanJejak(DATA));
    expect(tertutup.match(/<button/g)).toHaveLength(1);
    expect(teks).toContain('Buka jejak dan jawabannya');
    for (const t of DATA.tahap) {
      expect(teks).toContain(`${NAMA_TAHAP[t.id]} : ${angkaId(t.jumlah_langkah)} langkah · ${dolar(t.biaya_usd)}`);
    }
    expect(teks).toContain(`${angkaId(DATA.jumlah.langkah)} langkah dalam ${angkaId(DATA.percobaan.length)} percobaan`);
    expect(teks).toContain(`biaya nyata ${dolar(DATA.jumlah.biaya_usd)}`);
  });

  it('tidak satu pun teks rekaman tampil sebelum dibuka; tanpa sakelar, tanpa diagram', () => {
    const panjang = TEKS_REKAMAN.filter((t) => t.length >= 12);
    expect(panjang.length).toBeGreaterThan(150);
    expect(panjang.filter((t) => teks.includes(t))).toEqual([]);
    for (const t of DATA.tool) expect(teksRapat(tertutup)).not.toContain(t.nama);
    expect(tertutup).not.toContain('jejak-agen-sakelar');
    expect(tertutup).not.toContain('<svg');
    expect(tertutup).not.toContain('jejak-agen:rincian');
  });

  it('SABOTASE di dalam tes: kalau dibuka, teks rekaman itu memang ada — pembandingnya tidak kosong', () => {
    const teksRinci = teksDari(rinci);
    const contoh = TEKS_REKAMAN.filter((t) => t.length >= 40).slice(0, 50);
    expect(contoh).toHaveLength(50);
    expect(contoh.filter((t) => !teksRinci.includes(t))).toEqual([]);
  });

  it('halaman dapur merender bagian ini tertutup, tepat sekali, dengan tautan dari puncak halaman', () => {
    const halaman = renderToStaticMarkup(h(Dapur));
    expect(halaman.match(/id="judul-jejak-agen"/g)).toHaveLength(1);
    expect(halaman).toContain('href="#judul-jejak-agen"');
    expect(teksDari(halaman)).toContain(ringkasJejak(DATA));
    expect(halaman).toContain('data-uid="jejak-agen:buka"');
    const teksHalaman = teksDari(halaman);
    // Seluruh halaman: kalimat (>= 25 karakter), seperti gerbang A-1 — slug fakta umum (mis. nama kartu) juga dipakai jalan lain.
    expect(TEKS_REKAMAN.filter((t) => t.length >= 25 && teksHalaman.includes(t))).toEqual([]);
  });

  it('kata-kata kami: "simulasi" bukan "kasus", tanpa "tayang", tanpa emoji', () => {
    expect(teks).not.toMatch(/\bkasus\b/i);
    for (const html of [tertutup, ringkas, rinci, diagram(5)]) {
      expect(teksDari(html)).not.toMatch(/tayang/i);
      expect(teksDari(html)).not.toMatch(/\p{Extended_Pictographic}/u);
      expect(teksDari(html)).not.toMatch(/NaN|undefined|\[object/);
    }
  });
});

describe('jejak AI agent — Ringkas', () => {
  const teks = teksRapat(ringkas);

  it('sakelar tiga tampilan; Ringkas yang terpilih', () => {
    expect(ringkas.match(/aria-pressed="true"/g)).toHaveLength(1);
    expect(ringkas).toMatch(/aria-pressed="true"[^>]*>Ringkas</);
    expect(ringkas.match(/aria-pressed="false"/g)).toHaveLength(2);
    expect(teks).toContain('Tutup jejak');
  });

  it('satu baris per langkah, dengan tool yang dipilih agent', () => {
    expect(ringkas.match(/<span class="meta">Langkah \d+ · tool call<\/span>/g)).toHaveLength(DATA.langkah.length);
    for (const l of DATA.langkah) {
      expect(teks).toContain(`Langkah ${angkaId(l.no)} · tool call ${l.memanggil.join(', ')}`);
    }
  });

  it('per tahap: nama, jumlah langkah, dan biaya', () => {
    expect(ringkas.match(/<h3>/g)).toHaveLength(DATA.tahap.length);
    for (const t of DATA.tahap) {
      expect(teks).toContain(`${NAMA_TAHAP[t.id]} ${angkaId(t.jumlah_langkah)} langkah · ${dolar(t.biaya_usd)}`);
    }
  });

  it('tiap tool result: ringkasan dari rekaman, status dari medan lolos, alasan penolakan satu baris', () => {
    const semua = DATA.langkah.flatMap((l) => l.hasil);
    const lolos = semua.filter((x) => statusHasil(x) === 'lolos').length;
    const ditolak = semua.filter((x) => statusHasil(x) === 'ditolak').length;
    expect(lolos).toBeGreaterThan(0);
    expect(ditolak).toBeGreaterThan(0);
    expect(ringkas.match(/jejak-agen-status-lolos/g)).toHaveLength(lolos);
    expect(ringkas.match(/jejak-agen-status-ditolak/g)).toHaveLength(ditolak);
    for (const x of semua) {
      expect(teks).toContain(rapat(x.ringkas));
      const alasan = alasanTolak(x);
      if (statusHasil(x) === 'ditolak') {
        expect(alasan.length, x.ringkas).toBeGreaterThan(0);
        expect(teks).toContain(satuBaris(alasan[0] ?? ''));
      } else {
        expect(alasan, x.ringkas).toEqual([]);
      }
    }
  });

  it('satuBaris: awalan teks aslinya, dipotong di batas kata, bertanda "…"', () => {
    expect(satuBaris('pendek saja')).toBe('pendek saja');
    const panjang = 'kata '.repeat(60).trim();
    const potong = satuBaris(panjang, 40);
    expect(potong.endsWith('…')).toBe(true);
    expect(potong.length).toBeLessThanOrEqual(41);
    expect(panjang.startsWith(potong.slice(0, -1))).toBe(true);
  });

  it('tool yang dipilih tanpa tool result di rekaman disebut apa adanya', () => {
    const kosong = DATA.langkah.filter((l) => tanpaHasil(l).length > 0);
    expect(ringkas.match(/tool result tidak tercatat di langkah ini/g) ?? []).toHaveLength(kosong.length);
  });
});

describe('jejak AI agent — Rinci', () => {
  const teks = teksDari(rinci);
  const teksNama = teksRapat(rinci);

  it('setiap teks tool result tampil utuh, huruf demi huruf', () => {
    const hilang = TEKS_REKAMAN.filter((t) => t !== '' && !teks.includes(t));
    expect(hilang).toEqual([]);
  });

  it('setiap alasan penolakan tester dan pemeriksa aturan tampil utuh di luar lipatan', () => {
    const luar = teksDari(rinci.replace(/<details[\s\S]*?<\/details>/g, ' '));
    let jumlah = 0;
    for (const l of DATA.langkah) {
      for (const x of l.hasil) {
        for (const a of alasanTolak(x)) {
          jumlah += 1;
          expect(luar).toContain(rapat(a));
        }
      }
    }
    expect(jumlah).toBeGreaterThanOrEqual(10);
  });

  it('per langkah: lama, biaya, jumlah token berpikir sebagai angka, dan ucapan agent bila ada', () => {
    for (const l of DATA.langkah) {
      expect(teks).toContain(`lama ${detik(l.latensi_ms)} · biaya model ${dolarRinci(l.biaya_usd)}`);
      expect(teks).toContain(`token berpikir ${angkaId(l.token_penalaran)} · token masuk ${angkaId(l.token_masuk)}`);
      if (l.biaya_tester_usd > 0) expect(teks).toContain(`biaya tester ${dolarRinci(l.biaya_tester_usd)}`);
      if (l.teks !== null) expect(teks).toContain(`Ucapan agent: “${l.teks}”`);
    }
    expect(DATA.langkah.some((l) => l.teks !== null)).toBe(true);
    expect(rinci.match(/Ucapan agent:/g)).toHaveLength(DATA.langkah.filter((l) => l.teks !== null).length);
  });

  it('satu lipatan tool result lengkap per tool result; rincian teknis menyebut tiap percobaan', () => {
    const jumlah = DATA.langkah.reduce((j, l) => j + l.hasil.length, 0);
    expect(rinci.match(/Lihat tool result lengkap/g)).toHaveLength(jumlah);
    for (const [i, p] of DATA.percobaan.entries()) {
      expect(teks).toContain(`Percobaan ${angkaId(i + 1)} · ${p.id}`);
      expect(teks).toContain(`${angkaId(p.jumlah_langkah)} langkah · ${dolar(p.biaya_usd)}`);
    }
    for (const l of DATA.langkah) expect(teksNama).toContain(l.memanggil.join(', '));
  });

  it('teks berpikir model tidak tampil; kode saham dan nama perusahaan tidak tampil', () => {
    for (const html of [tertutup, ringkas, rinci, diagram(1), diagram(DATA.langkah.length)]) {
      expect(html).not.toMatch(/penalaran<|"penalaran"/);
      expect(html).not.toMatch(/amag/i);
      expect(html).not.toMatch(/asuransi multi/i);
    }
  });
});

describe('jejak AI agent — Diagram', () => {
  const kotak = (cx: number, cy: number, lebar: number, tinggi: number) => ({
    x0: cx - lebar / 2,
    x1: cx + lebar / 2,
    y0: cy - tinggi / 2,
    y1: cy + tinggi / 2,
  });
  const agen = {
    x0: KOTAK_AGEN.x,
    x1: KOTAK_AGEN.x + KOTAK_AGEN.lebar,
    y0: KOTAK_AGEN.y,
    y1: KOTAK_AGEN.y + KOTAK_AGEN.tinggi,
  };
  const diDalam = (p: Titik, k: ReturnType<typeof kotak>, longgar = 0): boolean =>
    p.x > k.x0 - longgar && p.x < k.x1 + longgar && p.y > k.y0 - longgar && p.y < k.y1 + longgar;
  /** Jarak titik ke tepi kotak (0 bila di dalam). */
  const jarak = (p: Titik, k: ReturnType<typeof kotak>): number =>
    Math.hypot(Math.max(k.x0 - p.x, 0, p.x - k.x1), Math.max(k.y0 - p.y, 0, p.y - k.y1));

  it('AI agent digambar sekali; satu kotak per tool; satu garis per tool — tidak ada garis lain', () => {
    const html = diagram(1);
    expect(html.match(/class="jejak-agen-agen"/g)).toHaveLength(1);
    expect(html.match(/>AI agent</g)).toHaveLength(1);
    expect(html.match(/<svg/g)).toHaveLength(1);
    expect(html.match(/<line /g)).toHaveLength(DATA.tool.length);
    expect(html.match(/<polygon /g)).toHaveLength(2 * DATA.tool.length);
    const simpul = /<ul class="jejak-agen-simpul"[^>]*>([\s\S]*?)<\/ul>/.exec(html)?.[1] ?? '';
    expect(simpul.match(/<li/g)).toHaveLength(DATA.tool.length);
    expect(DATA.tool.length).toBeLessThanOrEqual(TEMPAT.length);
    for (const t of DATA.tool) expect(teksRapat(simpul)).toContain(t.nama);
  });

  it('geometri: tiap garis berujung di kotak agent dan di kotak tool-nya sendiri, tidak melewati kotak tool lain', () => {
    for (const [i, t] of TEMPAT.entries()) {
      const g = garisTool(t);
      const milik = kotak(t.cx, t.cy, UKURAN_TOOL.lebar, UKURAN_TOOL.tinggi);
      expect(jarak(g.agen, agen), `tempat ${String(i)}`).toBeLessThan(1.5);
      expect(jarak(g.tool, milik), `tempat ${String(i)}`).toBeLessThan(1.5);
      // Garis tidak masuk ke kotak mana pun, juga tidak ke kotaknya sendiri atau kotak agent.
      for (let s = 0; s <= 40; s += 1) {
        const p = { x: g.agen.x + ((g.tool.x - g.agen.x) * s) / 40, y: g.agen.y + ((g.tool.y - g.agen.y) * s) / 40 };
        expect(diDalam(p, agen), `tempat ${String(i)} menembus agent`).toBe(false);
        for (const [j, lain] of TEMPAT.entries()) {
          const k = kotak(lain.cx, lain.cy, UKURAN_TOOL.lebar, UKURAN_TOOL.tinggi);
          expect(diDalam(p, k, j === i ? 0 : 1), `tempat ${String(i)} melewati tool ${String(j)}`).toBe(false);
        }
      }
      // Mata panah di kedua ujung: tool call ke tool, tool result ke agent.
      expect(g.panahAgen[0]).toEqual(g.agen);
      expect(g.panahTool[0]).toEqual(g.tool);
    }
  });

  it('tata letak: kotak tidak bertumpuk dan semuanya di dalam bidang; tool mengelilingi agent di empat sisi', () => {
    const semua = TEMPAT.map((t) => kotak(t.cx, t.cy, UKURAN_TOOL.lebar, UKURAN_TOOL.tinggi));
    for (const [i, a] of semua.entries()) {
      expect(a.x0 >= 0 && a.y0 >= 0 && a.x1 <= BIDANG.lebar && a.y1 <= BIDANG.tinggi).toBe(true);
      for (const [j, b] of [...semua, agen].entries()) {
        if (i === j) continue;
        const tumpuk = a.x0 < b.x1 && b.x0 < a.x1 && a.y0 < b.y1 && b.y0 < a.y1;
        expect(tumpuk, `kotak ${String(i)} dan ${String(j)}`).toBe(false);
      }
    }
    expect(new Set(TEMPAT.map((t) => t.sisi))).toEqual(new Set(['atas', 'kanan', 'bawah', 'kiri']));
    expect(KOTAK_AGEN.x + KOTAK_AGEN.lebar / 2).toBe(BIDANG.lebar / 2);
    expect(KOTAK_AGEN.y + KOTAK_AGEN.tinggi / 2).toBe(BIDANG.tinggi / 2);
  });

  it('di tiap langkah, yang menyala tepat tool yang dipilih agent di langkah itu, dan hasilnya tampil', () => {
    for (const l of DATA.langkah) {
      const html = diagram(l.no);
      const nyala = simpulNyala(DATA, l);
      expect(nyala.length).toBeGreaterThan(0);
      expect(html.match(/aria-current="step"/g)).toHaveLength(nyala.length);
      expect(html.match(/<g class="jejak-agen-nyala">/g)).toHaveLength(nyala.length);
      const teks = teksRapat(html);
      expect(teks).toContain(`Langkah ${angkaId(l.no)} dari ${angkaId(DATA.langkah.length)} · ${NAMA_TAHAP[l.tahap]}`);
      expect(teks).toContain(`tool call ${l.memanggil.join(', ')}`);
      for (const x of l.hasil) {
        expect(teks).toContain(rapat(x.ringkas));
        for (const a of alasanTolak(x)) expect(teksDari(html)).toContain(rapat(a));
      }
    }
  });

  it('nama lama tool menyalakan simpul nama sekarang, dan itu dikatakan di bawah diagram', () => {
    const lama = DATA.langkah.find((l) => l.memanggil.includes('periksa_kode'));
    if (lama === undefined) throw new Error('rekaman tidak memuat periksa_kode');
    const i = simpulNyala(DATA, lama)[0];
    expect(DATA.tool[i ?? -1]?.nama).toBe('periksa_draft_dengan_aturan');
    expect(teksRapat(diagram(lama.no))).toContain(
      'Di rekaman awal, periksa_draft_dengan_aturan masih bernama periksa_kode.',
    );
  });

  it('maju dan mundur dengan tombol; di ujung jejak tombolnya tidak bisa ditekan', () => {
    const tombol = (html: string, uid: string): string =>
      new RegExp(`<button[^>]*data-uid="jejak-agen:${uid}"[^>]*>`).exec(html)?.[0] ?? '';
    const awal = diagram(1);
    const tengah = diagram(5);
    const akhir = diagram(DATA.langkah.length);
    expect(tombol(awal, 'mundur')).toContain('aria-disabled="true"');
    expect(tombol(awal, 'maju')).toContain('aria-disabled="false"');
    expect(tombol(tengah, 'mundur')).toContain('aria-disabled="false"');
    expect(tombol(tengah, 'maju')).toContain('aria-disabled="false"');
    expect(tombol(akhir, 'maju')).toContain('aria-disabled="true"');
    expect(tengah).toContain('aria-live="polite"');
    // Tidak ada animasi otomatis: komponen tidak punya pewaktu maupun efek.
    const sumber = readFileSync(fileURLToPath(new URL('./JejakAgen.tsx', import.meta.url)), 'utf8');
    expect(sumber).not.toMatch(/setInterval|setTimeout|requestAnimationFrame|useEffect|<animate/);
  });
});
