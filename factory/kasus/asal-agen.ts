/**
 * Kasus di `cases/` yang soalnya ditulis AI agent, bukan manusia.
 *
 * Sampai kasus AMAG ada, "isi folder `cases/`" dan "soal tulisan manusia yang
 * sedang tayang" adalah hal yang sama, dan dua bagian repo mengandaikannya:
 *
 * - gerbang lingkar LLM menurunkan batas G-panjang serta ambang G-mirip dan
 *   G-kembar dari "soal manusia di `cases/*.json`", dan anti-bocor melarang
 *   draf menyalin kalimat maupun nama pengirim "kasus tayang"
 *   (`kasus-manusia.ts` menjaga himpunan itu tetap DADA dan ULTJ);
 * - aplikasi menulis di layar pembukaan bahwa soalnya disusun Claude bersama
 *   pemilik (`web/src/isi-kasus.ts` kini membedakannya per simulasi).
 *
 * Modul daun TANPA impor apa pun — juga tanpa `node:fs` — supaya pabrik,
 * lingkar LLM, dan aplikasi web bisa mengimpornya. `dari-agen.test.ts` menjaga
 * daftar ini sama dengan kasus yang didaftarkan `factory/bangun-kasus.ts`
 * sebagai kasus agent.
 */

/** `kasus_id` tiap kasus yang dibangun `dariAgen` (soalnya tulisan agent). */
export const KASUS_DARI_AGEN: readonly string[] = ['amag-2026-06-15'];

export function kasusDariAgen(kasus_id: string): boolean {
  return KASUS_DARI_AGEN.includes(kasus_id);
}
