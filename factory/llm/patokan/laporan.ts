/**
 * `npm run patokan:laporan` — laporan M2d-11 `docs/bukti/lingkar-agen-pemula.md`
 * (kontrak D-7). Angka di laporan dihitung dari keluaran tersimpan (kalibrasi
 * detektor, uji ulang, jalan TIRT, pemanasan) dan ledger; kalimat tafsiran
 * ditulis di sini dan ditandai sebagai tafsiran.
 */
import { existsSync, readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { AKAR } from '../env.ts';
import type { EntriLedger } from '../pagu.ts';
import { agregasiRotasi, type JawabanRotasi } from '../rotasi/rotasi.ts';
import type { HasilKalibrasiCacat } from '../cacat/kalibrasi.ts';
import { FOLDER_M2D11, PAGU_MILESTONE_M2D11, tagMilestoneM2d11 } from './konfig.ts';
import type { MentahUjiUlang, ringkasUjiUlang } from './uji-ulang.ts';

const AUDIT_ADA = existsSync(`${AKAR}eval/keluaran-m2d11/audit-opus/uji-ulang/nilai.json`) && existsSync(`${AKAR}eval/keluaran-m2d11/audit-opus/tirt-7/nilai.json`);

export const JALUR_LAPORAN_M2D11 = `${AKAR}docs/bukti/lingkar-agen-pemula.md`;

const pct = (x: number): string => `${(x * 100).toFixed(0)} %`;
const usd = (x: number): string => `US$${x.toFixed(4).replace('.', ',')}`;

/** Perubahan templat antar jalan TIRT (pra-registrasi §6; tiap perubahan di-commit sebelum jalan berikutnya). */
export const PERUBAHAN_TEMPLAT: ReadonlyArray<{ sesudah: number; isi: string }> = [
  { sesudah: 1, isi: 'angka-lain-waktu: pengecoh koreksi p3 = harga penutupan nyata hari lain berjarak seimbang dengan kunci (Rp89 vs Rp106 dari Rp97), menggantikan andaian Rp115 — ketiga keluarga memilih "koreksi yang paling masuk akal".' },
  { sesudah: 2, isi: 'susunan label berselang: pengecoh yang labelnya sama dengan kunci ditaruh di seberang kunci (k+2), sehingga heuristik "opsi Keliru pertama" (Haiku c→a→a→b) memilih kunci tepat 2/4 rotasi.' },
  { sesudah: 3, isi: 'tidak ada perubahan; jalan #4–#7 memakai kode yang sama (diulang sesuai pra-registrasi §6).' },
];

/** Agregasi peka: jawaban tak terbaca dibuang (bukan dihitung kunci). PASCA-DATA, hanya untuk laporan. */
export function agregasiTanpaTakTerbaca(j: readonly JawabanRotasi[]): ReturnType<typeof agregasiRotasi> {
  return agregasiRotasi(j.filter((x) => x.terbaca));
}

interface HasilJalan {
  lolos: boolean;
  berhenti: string | null;
  jumlah_versi: number;
  distribusi: Record<string, number>;
  versi: Array<{ no: number; rencana: string; versi: number; berhenti: string; alasan: string[] }>;
  kunci: Array<{ no: number; rencana: { pola: string }; omongan: { pesan: string; pilihan: Record<string, string>; kunci: string }; umpan_balik?: unknown }>;
  penyempurnaan: unknown[];
}

function ledgerM2d11(): EntriLedger[] {
  const j = `${AKAR}.cache/llm/ledger.jsonl`;
  if (!existsSync(j)) return [];
  return readFileSync(j, 'utf8').split(/\r?\n/).filter((b) => b.trim() !== '').map((b) => JSON.parse(b) as EntriLedger).filter((e) => tagMilestoneM2d11(e.tag));
}

export function bangunLaporan(): string {
  const kal = JSON.parse(readFileSync(`${FOLDER_M2D11}/cacat/kalibrasi.json`, 'utf8')) as HasilKalibrasiCacat;
  const ring = JSON.parse(readFileSync(`${FOLDER_M2D11}/uji-ulang/ringkasan.json`, 'utf8')) as ReturnType<typeof ringkasUjiUlang>;
  const mentah = (JSON.parse(readFileSync(`${FOLDER_M2D11}/uji-ulang/mentah.json`, 'utf8')) as { hasil: MentahUjiUlang[] }).hasil;
  const folderJalan = `${AKAR}eval/penyusun`;
  const jalan = readdirSync(folderJalan)
    .filter((x) => /^m2d11-tirt-\d+$/.test(x) && existsSync(`${folderJalan}/${x}/hasil.json`))
    .sort((a, b) => Number(a.split('-').at(-1)) - Number(b.split('-').at(-1)))
    .map((id) => ({ id, h: JSON.parse(readFileSync(`${folderJalan}/${id}/hasil.json`, 'utf8')) as HasilJalan }));
  const pem = existsSync(`${FOLDER_M2D11}/pemanasan/hasil.json`) ? (JSON.parse(readFileSync(`${FOLDER_M2D11}/pemanasan/hasil.json`, 'utf8')) as { lolos: boolean; rencana: string; berhenti: string | null; omongan: { pesan: string; pilihan: Record<string, string>; kunci: string; penjelasan: string } | null; umpan_balik: { penentu: string; per_pengecoh: Array<{ kalimat: string }>; pertanyaan_cek: string } | null; percobaan: Array<{ ke: number; menolak: Array<{ lokasi: string; alasan: string }>; kartu: unknown }>; biaya_usd: number }) : null;
  const led = ledgerM2d11();
  const L: string[] = [];
  const p = (...x: string[]): void => {
    L.push(...x);
  };

  const terbit = jalan.find((x) => x.h.lolos);
  const biaya = led.reduce((a, e) => a + e.biaya_usd, 0);
  p(
    '# Lingkar agen M2d-11 — patokan pemula: detektor cacat, tebak rotasi, uji ulang soal lama, jalan TIRT',
    '',
    '> Laporan ini dibangun skrip (`npm run patokan:laporan`, `factory/llm/patokan/laporan.ts`) dari keluaran tersimpan dan ledger OpenRouter. Kalimat bertanda **Tafsiran** adalah bacaan eksekutor, bukan hasil hitungan.',
    '',
    '## Ringkasan',
    '',
    `- **Pra-registrasi** \`docs/bukti/m2d11-praregistrasi.md\` di-commit sebelum panggilan berbayar pertama (dites). Satu amandemen teknis: GLM-5.3 menolak \`reasoning.enabled=false\` ("Reasoning is mandatory", HTTP 400, biaya 0) → penebak rotasi GLM memakai \`effort: "minimal"\`, \`max_tokens\` 3.000.`,
    `- **Kalibrasi detektor**: ambang awal riset menandai ${String(kal.tayang.ditandai_awal)}/6 soal tayang; aturan mekanis melonggarkan D6 → L2, D5 → L1, D2 → L1 sampai ${String(kal.tayang.ditandai_akhir)}/6 (DADA s2, "cuma" hanya di kunci). **Recall ${String(kal.recall.menolak)}/${String(kal.recall.total)}** omongan yang tertebak luar (target riset 80 % — tidak tercapai); omongan lama tak tertebak yang ditandai ${String(kal.lama_tidak_tertebak.menolak)}/${String(kal.lama_tidak_tertebak.total)}.`,
    `- **Uji ulang ${String(ring.terukur)} soal** (syarat 1–3): lulus ${String(ring.lulus_inti.length)} — ${ring.lulus_inti.join(', ')}. Tebak rotasi gagal ${String(ring.hitung['rotasi gagal'] ?? 0)}/${String(ring.terukur)}, termasuk ${String(ring.baris.filter((b) => b.kelompok === 'tayang' && b.putusan_rotasi === 'gagal').length)} dari ${String(ring.baris.filter((b) => b.kelompok === 'tayang').length)} soal tayang.`,
    `- **Jalan TIRT**: ${String(jalan.length)} jalan, ${terbit === undefined ? '**tidak ada yang terbit**' : `**terbit di ${terbit.id}**`}.`,
    `- **Biaya nyata milestone** ${usd(biaya)} dari pagu ${usd(PAGU_MILESTONE_M2D11)} (${String(led.length)} entri ledger).`,
    '',
  );

  // --- kalibrasi
  p('## 1. Detektor cacat (D-1): kalibrasi dan recall', '', '| langkah | ambang (anak tangga D1…D9) | soal tayang ditandai | per detektor | turun |', '|---|---|---|---|---|');
  kal.langkah.forEach((l, i) => p(`| ${String(i)} | ${Object.values(l.ambang).join(' ')} | ${String(l.ditandai.length)}/6 | ${JSON.stringify(l.per_detektor)} | ${l.turun ?? '—'} |`));
  p('', `Ambang akhir (dibekukan di \`factory/llm/cacat/ambang.ts\`, dites sama): ${JSON.stringify(kal.ambang_akhir)}.`, '');
  p('| detektor | soal tayang ditandai | recall (tertebak luar, n=12) | lama tak tertebak (n=15) |', '|---|---|---|---|');
  for (const [k, v] of Object.entries(kal.per_detektor_akhir)) p(`| ${k} | ${String(v.tayang)} | ${String(v.recall)} | ${String(v.lama_tidak_tertebak)} |`);
  p('', `Luput (tertebak luar tanpa bendera): ${kal.recall.luput.join(', ')}.`, '');
  p('**Tafsiran.** Detektor permukaan riset hampir tidak membedakan omongan yang dulu tertebak (4/12 ditandai) dari yang tidak (6/15). Sebagian besar "tertebak" luar ternyata tidak bisa dijelaskan cacat permukaan; uji ulang rotasi (§2) menunjukkan sebagian adalah artefak posisi dan sebagian lagi tertebak dari isi.', '');

  // --- uji ulang
  p('## 2. Uji ulang soal lama (D-3): putusan lama vs baru', '', `Biaya bagian uji ulang (tag \`m2d11/uji-ulang/\`): ${usd(led.filter((e) => e.tag.startsWith('m2d11/uji-ulang/')).reduce((a, e) => a + e.biaya_usd, 0))} dari US$0,80.`, '');
  p('| soal | kunci | penguji luar dulu (tebak buta, 1 urutan) | detektor | kartu r0/r2 | kunci pesan+pilihan | kunci pilihan-saja | tebak rotasi | putusan inti | perbandingan |', '|---|---|---|---|---|---|---|---|---|---|');
  for (const b of ring.baris) p(`| ${b.id} | ${b.kunci} | ${b.luar ?? '—'} | ${b.detektor.join(',') || '—'} | ${b.kartu} | ${b.rotasi_pesan_pilihan} | ${b.rotasi_pilihan_saja} | ${b.putusan_rotasi} | ${b.putusan.lulus ? '**LULUS**' : 'tidak'} | ${b.banding} |`);
  p('', '| hitungan | jumlah |', '|---|---|');
  for (const [k, v] of Object.entries(ring.hitung)) p(`| ${k} | ${String(v)} |`);
  const a1o2 = ring.baris.find((b) => b.id === 'm2d10a1-tirt-o2');
  const a2o1 = ring.baris.find((b) => b.id === 'm2d10a2-tirt-o1');
  p(
    '',
    `**Pasangan A-1 o2 (kunci d) vs A-2 o1 (kunci c)** — dulu 0/3 vs 3/3 tertebak luar. Kini: A-1 o2 pesan+pilihan ${a1o2?.rotasi_pesan_pilihan ?? '-'}, pilihan-saja ${a1o2?.rotasi_pilihan_saja ?? '-'} → ${a1o2?.putusan_rotasi ?? '-'}; A-2 o1 ${a2o1?.rotasi_pesan_pilihan ?? '-'} / ${a2o1?.rotasi_pilihan_saja ?? '-'} → ${a2o1?.putusan_rotasi ?? '-'}. **Tafsiran:** dengan posisi terkendali keduanya gagal; selisih 0/3 vs 3/3 dulu bukan bukti bahwa A-1 o2 aman — kunci d-nya kebetulan tidak dipilih penguji yang condong ke c.`,
    '',
  );
  // kepekaan tak terbaca
  const ubah: string[] = [];
  let takHaiku = 0;
  for (const m of mentah) {
    if (m.rotasi === null) continue;
    takHaiku += m.rotasi.jawaban.filter((j) => !j.terbaca && j.model.includes('haiku')).length;
    const lain = agregasiTanpaTakTerbaca(m.rotasi.jawaban).putusan;
    if (lain !== m.rotasi.putusan.putusan) ubah.push(`${m.id}: ${m.rotasi.putusan.putusan} → ${lain}`);
  }
  const takTotal = mentah.reduce((a, m) => a + (m.rotasi?.jawaban.filter((j) => !j.terbaca).length ?? 0), 0);
  p(
    `**Kepekaan (pasca-data, bukan putusan):** ${String(takTotal)} jawaban rotasi tak terbaca (${String(takHaiku)} dari Haiku — hampir semuanya penolakan "tidak dapat menjawab" di kondisi pilihan-saja). Pra-registrasi menghitungnya sebagai memilih isi kunci (konservatif). Bila jawaban tak terbaca dibuang, putusan tebak rotasi berubah di ${String(ubah.length)} soal: ${ubah.join('; ') || '—'}.`,
    '',
  );

  // --- H2
  p('## 3. Data hipotesis pemilik (D-6b, eksploratif)', '', '**H2 — perilaku menebak per keluarga dengan posisi terkendali** (33 soal × 4 rotasi × 2 kondisi = 264 jawaban per model):', '');
  p('| model | kunci pilihan-saja | kunci pesan+pilihan | isi kunci konsisten (ps / pp) | isi apa pun konsisten (ps / pp) | huruf konsisten (ps / pp) | prior huruf a/b/c/d | tak terbaca |', '|---|---|---|---|---|---|---|---|');
  for (const h of ring.h2) {
    const pr = h.prior_huruf as Record<string, number>;
    p(`| ${h.model} | ${pct(h.proporsi_kunci['pilihan-saja'] ?? 0)} | ${pct(h.proporsi_kunci['pesan-pilihan'] ?? 0)} | ${pct(h.laju_isi_kunci_konsisten['pilihan-saja'] ?? 0)} / ${pct(h.laju_isi_kunci_konsisten['pesan-pilihan'] ?? 0)} | ${pct(h.laju_isi_konsisten['pilihan-saja'] ?? 0)} / ${pct(h.laju_isi_konsisten['pesan-pilihan'] ?? 0)} | ${pct(h.laju_huruf_konsisten['pilihan-saja'] ?? 0)} / ${pct(h.laju_huruf_konsisten['pesan-pilihan'] ?? 0)} | ${String(pr['a'])}/${String(pr['b'])}/${String(pr['c'])}/${String(pr['d'])} | ${String(h.tak_terbaca)} |`);
  }
  p('', 'Proporsi kunci menghitung jawaban tak terbaca sebagai kunci (aturan pra-registrasi). Acak = 25 %.', '');
  if (AUDIT_ADA) p('**H3 — kesepakatan vonis tiap keluarga dengan audit Opus:** audit reviewer sudah dijalankan; hasil, tabel per keluarga, dan bias seleksinya di `docs/bukti/lingkar-agen-pemula-audit.md` (eksploratif; H3 belum terjawab).', '');
  else p('**H3 — kesepakatan vonis tiap keluarga dengan audit Opus: MENUNGGU audit reviewer.** Paket siap di `eval/keluaran-m2d11/audit-opus/` (5 soal lulus putusan inti × 4 rotasi × tanpa/dengan kartu); penilai `npm run patokan:audit -- --nilai uji-ulang`.', '');

  // --- mesin
  p(
    '## 4. Mesin templat M2d-11 (D-4)',
    '',
    '- Urutan gerbang per versi: kode lama + detektor (ambang kalibrasi) + label & umpan balik → tebak rotasi 24 panggilan → pembaca kartu r0+r2 → kritikus GLM "high" (Wafer) paling akhir.',
    '- Pengecoh berlabel 6 jenis kesalahan; label divalidasi dari proposisi (`factory/llm/templat/label.ts`); varian yang labelnya tidak sah dibuang. Pola **benar-berincian tidak dipakai**: pengecoh "menyangkal rangkaian yang tercatat" bukan satu dari enam jenis kesalahan membaca.',
    '- Umpan balik disusun kode: kartu penentu, satu kalimat per pengecoh (nama jenis + nomor kartu), satu pertanyaan cek per pola; disimpan di `hasil.json` (`kunci[].umpan_balik`), tidak dipasang ke produk.',
    '- Varian awal = kombinasi pertama tanpa bendera detektor dari pilihan saja; teks besaran-hitungan P2a tanpa angka selisih (D9) hanya di jalur M2d-11.',
    '',
    '**Perubahan templat antar jalan TIRT** (kata/struktur, bukan patokan; tiap perubahan di-commit sebelum jalan berikutnya):',
    '',
    ...PERUBAHAN_TEMPLAT.map((c) => `- sesudah jalan #${String(c.sesudah)}: ${c.isi}`),
    '',
  );

  // --- TIRT
  p('## 5. Jalan TIRT (D-5)', '', '| jalan | terbit | versi | distribusi berhenti | biaya nyata | berhenti |', '|---|---|---|---|---|---|');
  for (const j of jalan) {
    const b = led.filter((e) => e.tag.startsWith(`penyusun/${j.id}/`)).reduce((a, e) => a + e.biaya_usd, 0);
    const d = Object.entries(j.h.distribusi).filter(([, v]) => v > 0).map(([k, v]) => `${k} ${String(v)}`).join(', ');
    p(`| ${j.id} | ${j.h.lolos ? '**YA**' : 'tidak'} | ${String(j.h.jumlah_versi)} | ${d} | ${usd(b)} | ${(j.h.berhenti ?? '—').replace(/\|/g, '/')} |`);
  }
  p('');
  for (const j of jalan) {
    p(`<details><summary>${j.id}: versi</summary>`, '', '| omongan | rencana | versi | berhenti | alasan |', '|---|---|---|---|---|');
    for (const v of j.h.versi) p(`| ${String(v.no)} | ${v.rencana} | ${String(v.versi)} | ${v.berhenti} | ${(v.alasan[0] ?? '').replace(/\|/g, '/').slice(0, 300)} |`);
    p('', '</details>', '');
  }
  if (terbit !== undefined) {
    const versiTotal = jalan.reduce((x, j) => x + j.h.jumlah_versi, 0);
    p(
      `### Draf terbit (${terbit.id}) — tidak dipasang; menunggu audit Opus reviewer + penyetuju`,
      '',
      `Terbit di jalan ke-${String(jalan.indexOf(terbit) + 1)} dari ${String(jalan.length)} (total ${String(versiTotal)} versi omongan diperiksa di semua jalan). Patokan §1 pra-registrasi dipenuhi oleh gerbang di dalam mesin: nol bendera detektor, label & umpan balik sah, tebak rotasi lulus, pembaca kartu r0+r2 benar, kritikus tanpa keberatan, draf akhir lolos validator.`,
      '',
    );
    for (const k of terbit.h.kunci) {
      const v = (terbit.h.versi as Array<Record<string, unknown>>).find((x) => x['no'] === k.no && x['berhenti'] === 'lolos') as
        | { rotasi?: { putusan: { putusan: string; alasan: string[] } }; kartu_rotasi?: { per_rotasi: Array<{ r: number; kunci: string; pilihan: string | null }> }; kritik?: { arahan: string; panggilan: Array<{ penyedia?: string | null; token_penalaran?: number | null }> } }
        | undefined;
      const ub = k.umpan_balik as { penentu: string; per_pengecoh: Array<{ kalimat: string }>; pertanyaan_cek: string } | undefined;
      p(
        `**Omongan ${String(k.no)} — ${k.rencana.pola}** (kunci ${k.omongan.kunci})`,
        '',
        `Pesan: "${k.omongan.pesan}"`,
        '',
        ...Object.entries(k.omongan.pilihan).sort().map(([h, t]) => `- ${h}) ${t.replace(/\[\[[^|\]]+\|([^\]]+)\]\]/g, '$1')}`),
        '',
        `- tebak rotasi: ${v?.rotasi?.putusan.putusan ?? '-'} — ${(v?.rotasi?.putusan.alasan ?? []).join('; ')}`,
        `- pembaca kartu: ${(v?.kartu_rotasi?.per_rotasi ?? []).map((x) => `r${String(x.r)} memilih ${String(x.pilihan)} (kunci ${x.kunci})`).join(', ')}`,
        `- kritikus (${(v?.kritik?.panggilan ?? []).map((x) => `${String(x.penyedia)}, ${String(x.token_penalaran)} token penalaran`).join('; ')}): tanpa keberatan; arahan dicatat: "${v?.kritik?.arahan ?? ''}"`,
        ...(ub === undefined ? [] : [`- umpan balik: ${ub.penentu} ${ub.per_pengecoh.map((x) => x.kalimat).join(' ')} Pertanyaan cek: ${ub.pertanyaan_cek}`]),
        '',
      );
    }
    p(
      '**Catatan untuk penyetuju (pemilik).** (1) Omongan 1 lolos tebak rotasi di versi ke-3 jalan ke-7 sesudah berulang kali abu-abu tepat 6/12; omongan 3 lolos tepat di batas 5/12 — lulusnya rapuh dan sebagian karena kebetulan percobaan berulang. (2) Kritikus mencatat Rp89 di pengecoh omongan 1 tidak ada di kartu yang ditampilkan (harga 5 Desember); pemain tetap bisa menolaknya dari kartu 9 Desember, tetapi pengecoh itu tidak "menunjuk" kartu. (3) Pembaca kartu menandai kalimat teman ("Gw yakin banget…") sebagai membingungkan di kedua rotasi — dicatat, bukan penolakan. (4) ' + (AUDIT_ADA ? 'Audit Opus reviewer: dengan kartu 4/4 tiap omongan, TANPA kartu juga 4/4 tiap omongan (tertebak model kuat; sinyal ditinjau, bukan patokan) — lihat `docs/bukti/lingkar-agen-pemula-audit.md`.' : 'Audit Opus (paket `eval/keluaran-m2d11/audit-opus/tirt-7/`) belum dijalankan.') + ' Draf tidak dipasang.',
      '',
    );
  }

  // --- pemanasan
  p('## 6. Soal pemanasan (D-6)', '');
  const lama = ring.baris.find((b) => b.id === 'm2d10-pemanasan');
  p(`Soal pemanasan M2d-10 dinilai ulang: kartu ${lama?.kartu ?? '-'}, detektor ${lama?.detektor.join(',') || '—'}, putusan inti (tanpa syarat 3) ${lama?.putusan.lulus === true ? 'lulus' : 'tidak lulus'}; label pengecoh & umpan balik tidak ada di bentuk lama → ditulis ulang.`, '');
  if (pem === null) p('Penulisan ulang belum dijalankan.', '');
  else {
    p(`Penulisan ulang mesin M2d-11 (${pem.rencana}): **${pem.lolos ? 'LOLOS' : 'TIDAK LOLOS'}**${pem.berhenti === null ? '' : ` (${pem.berhenti})`}; ${String(pem.percobaan.length)} percobaan; ${usd(pem.biaya_usd)}.`, '');
    for (const c of pem.percobaan) p(`- percobaan ${String(c.ke)}: ${c.menolak.length === 0 ? 'lolos' : c.menolak.map((m) => `${m.lokasi}: ${m.alasan}`).join(' · ').slice(0, 400)}`);
    if (pem.omongan !== null && pem.umpan_balik !== null) {
      p('', `Soal (kunci ${pem.omongan.kunci}): pesan "${pem.omongan.pesan}"`, ...Object.entries(pem.omongan.pilihan).sort().map(([h, t]) => `- ${h}) ${t.replace(/\[\[[^|\]]+\|([^\]]+)\]\]/g, '$1')}`), '', `Umpan balik: ${pem.umpan_balik.penentu} ${pem.umpan_balik.per_pengecoh.map((x) => x.kalimat).join(' ')} Pertanyaan cek: ${pem.umpan_balik.pertanyaan_cek}`);
    }
    p('');
  }

  // --- biaya
  p('## 7. Biaya nyata (ledger, `usage.cost`)', '', '| model | entri | biaya |', '|---|---|---|');
  const perModel = new Map<string, { n: number; usd: number }>();
  for (const e of led) {
    const x = perModel.get(e.model) ?? { n: 0, usd: 0 };
    x.n += 1;
    x.usd += e.biaya_usd;
    perModel.set(e.model, x);
  }
  for (const [m, x] of [...perModel].sort()) p(`| ${m} | ${String(x.n)} | ${usd(x.usd)} |`);
  p(`| **total** | ${String(led.length)} | **${usd(biaya)}** |`, '');
  const bagian = [
    ['uji ulang', led.filter((e) => e.tag.startsWith('m2d11/uji-ulang/'))],
    ['pemanasan', led.filter((e) => e.tag.startsWith('m2d11/pemanasan/'))],
    ['jalan TIRT', led.filter((e) => e.tag.startsWith('penyusun/m2d11-'))],
  ] as const;
  p('| bagian | biaya |', '|---|---|', ...bagian.map(([n, x]) => `| ${n} | ${usd(x.reduce((a, e) => a + e.biaya_usd, 0))} |`), '');

  p(
    '## 8. Keterbatasan',
    '',
    '- Ambang detektor dan ambang tebak rotasi (5/12, 3/4) adalah **opini rekayasa dari riset**, dikalibrasi hanya pada 6 soal tayang.',
    '- **LLM bukan pemula.** Lulus/gagal tebak rotasi mengukur petunjuk permukaan bagi model, bukan kesulitan bagi pemain; data pemain n kecil.',
    '- Kondisi pilihan-saja ikut menentukan konsistensi isi kunci (pra-registrasi); banyak kegagalan terjadi di kondisi itu. Penolakan Haiku ("tidak dapat menjawab" tanpa pesan) dihitung kunci — lihat kepekaan §2.',
    '- Jalan TIRT diulang sampai lulus atau pagu habis (kontrak D-5); bila ada yang lulus, peluang lolos karena kebetulan bertambah dengan jumlah percobaan — jumlah jalan dan versi dilaporkan di §5.',
    AUDIT_ADA ? '- Audit Opus (reviewer, `docs/bukti/lingkar-agen-pemula-audit.md`): 6/8 soal yang lulus tebak rotasi tiga keluarga tetap ditebak Opus tanpa kartu — lulus patokan ≠ tidak tertebak model kuat.' : '- Audit Opus belum dijalankan (eksekutor tidak boleh memanggil Opus); H3 menunggu reviewer.',
    '- Schmucker & Moore: angka versi v1/v3 berbeda; cek versi terbit sebelum dikutip publik (dari sintesis riset).',
    '',
  );
  return L.join('\n');
}

if (/(^|[\\/])patokan[\\/]laporan\.ts$/.test(process.argv[1] ?? '')) {
  writeFileSync(JALUR_LAPORAN_M2D11, bangunLaporan() + '\n', 'utf8');
  console.log(`ditulis ${JALUR_LAPORAN_M2D11}`);
}
