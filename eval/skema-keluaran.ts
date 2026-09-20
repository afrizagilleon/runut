// D-4 — Skema keluaran yang WAJIB dipenuhi ketiga lengan.
// Diturunkan dari skema kasus M1 (factory/skema/tipe.ts) tetapi disederhanakan:
// tanpa kartu konsep, tanpa nama samaran, tanpa catatan pemeriksaan aturan,
// karena lengan A dan S tidak punya konsep "aturan" sama sekali.
//
// Keluaran yang tidak lolos skema TIDAK diperbaiki. Ia disimpan apa adanya dan
// dinilai sebagai pelanggaran (aturan pelaporan 3).

export const VERSI_SKEMA_KELUARAN = 1;

export interface FaktaKeluaran {
  fact_id: string;
  /** Satu kalimat yang bisa dibaca pemain. */
  klaim: string;
  nilai: number | string | null;
  satuan: string | null;
  /** Endpoint API atau nama berkas yang bisa ditelusuri. Kosong = klaim tanpa sumber. */
  sumber: string;
  /** Tanggal fakta bisa diketahui publik (ISO). `null` = tidak bisa ditentukan. */
  tersedia_sejak: string | null;
}

export interface AngkaTemuanKeluaran {
  label: string;
  nilai: number;
  satuan: string;
}

export interface TemuanKeluaran {
  /** Kode aturan kalau lengan memakainya; `null` kalau tidak punya sistem aturan. */
  aturan: string | null;
  ringkasan: string;
  angka: AngkaTemuanKeluaran[];
}

export interface PilihanKeluaran {
  kunci: string;
  teks: string;
}

export interface SoalKeluaran {
  soal_id: string;
  batang: string;
  pilihan: PilihanKeluaran[];
  jawaban: string;
  penjelasan: string;
  fact_ids: string[];
}

export interface PembukaanKeluaran {
  paragraf: string[];
  /** Fakta sesudah T; hanya boleh muncul di sini, tidak di fakta_terlihat. */
  fakta_sesudah_t: FaktaKeluaran[];
}

export interface KeluaranLengan {
  skema_versi: number;
  kasus_id: string;
  emiten: string;
  tanggal_t: string;
  /** Fakta yang dilihat pemain sebelum menjawab. Semuanya harus tersedia pada T. */
  fakta_terlihat: FaktaKeluaran[];
  /** Tepat tiga soal. */
  soal: SoalKeluaran[];
  pembukaan: PembukaanKeluaran;
  /** Kejanggalan data yang ditemukan lengan ini. Boleh kosong. */
  temuan: TemuanKeluaran[];
}

export interface MasalahSkema {
  kode: string;
  pesan: string;
}

function adalahObyek(n: unknown): n is Record<string, unknown> {
  return typeof n === 'object' && n !== null && !Array.isArray(n);
}

function periksaFakta(n: unknown, tempat: string, masalah: MasalahSkema[]): void {
  if (!adalahObyek(n)) {
    masalah.push({ kode: 'fakta-bukan-obyek', pesan: `${tempat} bukan obyek` });
    return;
  }
  for (const k of ['fact_id', 'klaim', 'sumber']) {
    if (typeof n[k] !== 'string' || (n[k] as string).length === 0) {
      masalah.push({ kode: 'fakta-field-hilang', pesan: `${tempat}.${k} bukan teks berisi` });
    }
  }
  const nilai = n['nilai'];
  if (nilai !== null && typeof nilai !== 'number' && typeof nilai !== 'string') {
    masalah.push({ kode: 'fakta-nilai-salah-tipe', pesan: `${tempat}.nilai harus angka, teks, atau null` });
  }
  const tersedia = n['tersedia_sejak'];
  if (tersedia !== null && typeof tersedia !== 'string') {
    masalah.push({ kode: 'fakta-tanggal-salah-tipe', pesan: `${tempat}.tersedia_sejak harus teks ISO atau null` });
  }
  if (!('satuan' in n)) {
    masalah.push({ kode: 'fakta-field-hilang', pesan: `${tempat}.satuan tidak ada` });
  }
}

/** Mengembalikan daftar pelanggaran skema. Larik kosong = lolos. */
export function periksaSkema(n: unknown): MasalahSkema[] {
  const masalah: MasalahSkema[] = [];
  if (!adalahObyek(n)) {
    return [{ kode: 'akar-bukan-obyek', pesan: 'keluaran bukan obyek JSON' }];
  }
  if (n['skema_versi'] !== VERSI_SKEMA_KELUARAN) {
    masalah.push({ kode: 'versi-salah', pesan: `skema_versi harus ${VERSI_SKEMA_KELUARAN}` });
  }
  for (const k of ['kasus_id', 'emiten', 'tanggal_t']) {
    if (typeof n[k] !== 'string' || (n[k] as string).length === 0) {
      masalah.push({ kode: 'field-akar-hilang', pesan: `${k} bukan teks berisi` });
    }
  }

  const terlihat = n['fakta_terlihat'];
  if (!Array.isArray(terlihat) || terlihat.length === 0) {
    masalah.push({ kode: 'fakta-terlihat-kosong', pesan: 'fakta_terlihat harus larik berisi' });
  } else {
    terlihat.forEach((f, i) => periksaFakta(f, `fakta_terlihat[${i}]`, masalah));
  }

  const soal = n['soal'];
  if (!Array.isArray(soal) || soal.length !== 3) {
    masalah.push({ kode: 'soal-bukan-tiga', pesan: `soal harus tepat 3, ada ${Array.isArray(soal) ? soal.length : 0}` });
  } else {
    soal.forEach((s, i) => {
      if (!adalahObyek(s)) {
        masalah.push({ kode: 'soal-bukan-obyek', pesan: `soal[${i}] bukan obyek` });
        return;
      }
      for (const k of ['soal_id', 'batang', 'jawaban', 'penjelasan']) {
        if (typeof s[k] !== 'string' || (s[k] as string).length === 0) {
          masalah.push({ kode: 'soal-field-hilang', pesan: `soal[${i}].${k} bukan teks berisi` });
        }
      }
      const pilihan = s['pilihan'];
      if (!Array.isArray(pilihan) || pilihan.length < 2) {
        masalah.push({ kode: 'soal-pilihan-kurang', pesan: `soal[${i}].pilihan harus >= 2` });
      } else {
        const kunci = new Set<string>();
        pilihan.forEach((p, j) => {
          if (!adalahObyek(p) || typeof p['kunci'] !== 'string' || typeof p['teks'] !== 'string') {
            masalah.push({ kode: 'pilihan-bentuk-salah', pesan: `soal[${i}].pilihan[${j}] harus {kunci, teks}` });
            return;
          }
          kunci.add(p['kunci']);
        });
        if (typeof s['jawaban'] === 'string' && kunci.size > 0 && !kunci.has(s['jawaban'])) {
          masalah.push({ kode: 'jawaban-di-luar-pilihan', pesan: `soal[${i}].jawaban tidak ada di pilihan` });
        }
      }
      if (!Array.isArray(s['fact_ids'])) {
        masalah.push({ kode: 'soal-fact-ids-hilang', pesan: `soal[${i}].fact_ids harus larik` });
      }
    });
  }

  const pembukaan = n['pembukaan'];
  if (!adalahObyek(pembukaan)) {
    masalah.push({ kode: 'pembukaan-hilang', pesan: 'pembukaan bukan obyek' });
  } else {
    if (!Array.isArray(pembukaan['paragraf']) || pembukaan['paragraf'].length === 0) {
      masalah.push({ kode: 'pembukaan-paragraf-kosong', pesan: 'pembukaan.paragraf harus larik berisi' });
    }
    const sesudah = pembukaan['fakta_sesudah_t'];
    if (!Array.isArray(sesudah)) {
      masalah.push({ kode: 'pembukaan-fakta-hilang', pesan: 'pembukaan.fakta_sesudah_t harus larik' });
    } else {
      sesudah.forEach((f, i) => periksaFakta(f, `pembukaan.fakta_sesudah_t[${i}]`, masalah));
    }
  }

  const temuan = n['temuan'];
  if (!Array.isArray(temuan)) {
    masalah.push({ kode: 'temuan-hilang', pesan: 'temuan harus larik (boleh kosong)' });
  } else {
    temuan.forEach((t, i) => {
      if (!adalahObyek(t)) {
        masalah.push({ kode: 'temuan-bukan-obyek', pesan: `temuan[${i}] bukan obyek` });
        return;
      }
      if (typeof t['ringkasan'] !== 'string' || (t['ringkasan'] as string).length === 0) {
        masalah.push({ kode: 'temuan-ringkasan-hilang', pesan: `temuan[${i}].ringkasan bukan teks berisi` });
      }
      if (!Array.isArray(t['angka'])) {
        masalah.push({ kode: 'temuan-angka-hilang', pesan: `temuan[${i}].angka harus larik` });
      }
    });
  }

  return masalah;
}

/** Contoh bentuk keluaran, ditempel ke prompt lengan A dan S apa adanya. */
export const CONTOH_BENTUK = `{
  "skema_versi": 1,
  "kasus_id": "<kode emiten huruf kecil>-<tanggal T>",
  "emiten": "<kode emiten>",
  "tanggal_t": "<YYYY-MM-DD>",
  "fakta_terlihat": [
    {
      "fact_id": "<kode pendek unik>",
      "klaim": "<satu kalimat bahasa Indonesia>",
      "nilai": <angka atau teks atau null>,
      "satuan": "<satuan atau null>",
      "sumber": "<endpoint API atau nama berkas yang bisa ditelusuri>",
      "tersedia_sejak": "<YYYY-MM-DD atau null>"
    }
  ],
  "soal": [
    {
      "soal_id": "s1",
      "batang": "<pertanyaan>",
      "pilihan": [{ "kunci": "a", "teks": "<pilihan>" }],
      "jawaban": "<kunci pilihan yang benar>",
      "penjelasan": "<alasan, menyebut angka dan sumbernya>",
      "fact_ids": ["<fact_id yang dipakai>"]
    }
  ],
  "pembukaan": {
    "paragraf": ["<apa yang sebenarnya terjadi sesudah T>"],
    "fakta_sesudah_t": [
      {
        "fact_id": "<kode>",
        "klaim": "<kalimat>",
        "nilai": <angka atau teks atau null>,
        "satuan": "<satuan atau null>",
        "sumber": "<endpoint atau berkas>",
        "tersedia_sejak": "<YYYY-MM-DD atau null>"
      }
    ]
  },
  "temuan": [
    {
      "aturan": "<kode aturan atau null>",
      "ringkasan": "<kejanggalan data yang kamu temukan>",
      "angka": [{ "label": "<label>", "nilai": <angka>, "satuan": "<satuan>" }]
    }
  ]
}`;
