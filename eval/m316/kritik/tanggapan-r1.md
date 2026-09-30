# Tanggapan kritik desain M3.16 r0 — satu putaran perbaikan

Kritikus: subagent Opus baru, sinkron. Kritik mentah ada di `kritik-desain-r0.txt`. Bahannya `.cache/e2e/m316/sesudah-r0/` (32 gambar) ditambah `sebelum/`. Hasil perbaikannya ada di `.cache/e2e/m316/sesudah/`.

| # | prio | putusan | yang dikerjakan / alasan |
|---|---|---|---|
| 1 | TINGGI | **dikerjakan** | Bingkai dipindah ke tepi lubang. `.sorotan-lubang` diberi `outline: 2px solid var(--tinta)`, jatuh di luar klip, jadi terlihat. Selama sorotan tampil, cincin `.disorot` di elemen dibuat `outline-color: transparent`. Hasilnya satu batas bersudut siku yang sama di kedua tema. Di langkah 3 bingkainya memeluk judul dan pilihan sekaligus, dan ia meluncur bersama lubang karena transisinya sama. E-63a memeriksa lebar bingkai 2px dan cincin yang transparan. |
| 2 | SEDANG | **dikerjakan** | `body:has(.sorotan) .penanda::after { inset: 0 0 -1px }`. Garis bawah keping sekarang ikut redup. |
| 3 | SEDANG | **dikerjakan** | `--selubung` terang dinaikkan dari 55% ke 65% (`rgba(20,33,61,.65)` / `color-mix` tinta 65%). Gelap tetap `--kertas` 72%, sesuai putusan kritikus. |
| 4 | SEDANG | **dikerjakan** | `data-lubang="omongan"` dipindah dari `figure.pesan` ke `blockquote.pesan-balon`, di layar soal maupun pemanasan. Lubang langkah 1 kini selebar gelembung. Tes render menyesuaikan diri. |
| 5 | SEDANG | **dikerjakan (inti)** | Gulir langkah dijalankan ulang saat orientasi berganti. Pemicunya `matchMedia('(orientation: portrait)')` `change`, bukan setiap `resize`: bilah alamat ponsel juga menyalakan `resize` saat digulir, dan kalau gulir dipaksa di situ, pemain kehilangan kendali atas jarinya sendiri. E-63b memeriksa bahwa kepala kartu berada di bawah keping sesudah diputar mendatar dan kembali tegak. Sabotase (tanpa pendengar) merah: -27 px. **Tidak dikerjakan:** panel satu baris untuk mode mendatar. Pembaca kita memegang ponsel tegak, dan tata letak panel sudah dijaga tes M3.14. Sesudah gulir ulang, kepala kartu sudah terlihat. |
| 6 | SEDANG | **dikerjakan** | Panel diberi `border-top: 2px solid var(--garis-tegas)` dan bantalan atas dikurangi 1px supaya tingginya tetap. |
| 7 | SEDANG | **dikerjakan** | Ketukan pada lapisan (di luar lubang) memasang `.pemandu-colek` selama 600 ms. Selama itu garis atas panel `--stempel`, dengan transisi `--gerak` yang dimatikan untuk reduced-motion. Tidak ada aksi di bawah lapisan yang dijalankan, jadi D-2 tetap berlaku. E-63c memeriksanya. Pelacakan: ketukan lapisan sudah tercatat oleh `ketuk` yang ada sejak T-01 sebagai `uid: "sorotan"`, `mati: true`, karena lapisan membawa `data-uid`. Tidak ada peristiwa baru, dan `pemandu:*` tidak berubah. |
| 8 | RENDAH | **sebagian** | Pudar masuk 140 ms lewat `@starting-style` (`.sorotan` dan selubung keping), dimatikan untuk reduced-motion. **Pudar keluar tidak dikerjakan:** kontrak D-2 meminta "Lewati menutup lapisan seketika". |
| 9 | RENDAH | **tidak ada tindakan** | Kritikus menilai ukuran lubang sudah pas. Kalimat pengantar tidak dimasukkan ke lubang langkah 2. |

"Yang sudah benar" dari kritikus tidak diubah: lapisan tunggal dalam koordinat dokumen, panel paling atas, isi lubang tidak berubah, selubung gelap 72%, tanpa buram/bayangan/gradasi, balon melayang disingkirkan, keping berselubung, ketukan di dalam lubang tetap berfungsi, transisi 140 ms dan reduced-motion, keadaan sesudah "Tunjukkan".
