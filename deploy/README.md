# Deploy alpha Runut

Untuk orang yang belum pernah melihat repo ini. Semua perintah dijalankan dari
akar repo kecuali disebut lain.

Hasil akhirnya: satu subdomain yang menyajikan aplikasi statis, dengan `/e` dan
`/sehat` diteruskan ke pengumpul peristiwa di loopback. Aplikasi dan pengumpul
berada di **satu asal**, jadi tidak ada CORS sama sekali.

```
laptop  --tar.gz lewat ssh-->  runut-terima  -->  /var/www/runut-alpha
                                                        ^
peramban pemain  --https-->  Caddy  ---------------------+
                               |
                               +-- /e, /sehat --> 127.0.0.1:8787 (pengumpul)
                                                        |
                                                 /var/lib/runut-alpha/data/*.jsonl
                                                        |
laptop  <--tar.gz lewat ssh--  kunci data (hanya-baca) --+
```

## Prasyarat

**Di laptop (Windows + Git Bash sudah cukup):**

- `ssh` dan `tar` — keduanya ada di Git Bash. **`rsync` tidak diperlukan.**
- Node 20 atau lebih baru.
- Dua alias host di `~/.ssh/config` (lihat di bawah).

**Di VPS (Linux):**

- Caddy v2 (diuji dengan 2.11) — TLS otomatis.
- Node 20 atau lebih baru (diuji dengan v22).
- `rsync` (hanya dipakai di dalam server, oleh `runut-terima`).
- Port 80 dan 443 terbuka ke internet.

## Yang harus diisi sendiri

| tempat | isi |
|---|---|
| `deploy/Caddyfile.contoh` | ganti `runut.contoh.id` dengan subdomain sungguhan |
| `~/.ssh/config` di laptop | alias `runut-alpha` dan `runut-alpha-data` |
| `authorized_keys` di server | dua kunci dengan perintah paksa |
| `deploy/kolektor.contoh.service` | ganti `User=`/`Group=` kalau bukan `runut` |

Tidak ada nama host, nama pengguna, port, atau jalur kunci di dalam repo. Kalau
kamu menemukannya di sini, itu bug.

## DNS

Satu rekaman **A** untuk subdomain yang menunjuk ke alamat IP VPS.

Kalau DNS-nya di Cloudflare, saat pemasangan pertama setel awan menjadi
**abu-abu (DNS only)**, bukan oranye. Caddy perlu menjawab tantangan ACME
langsung dari server itu untuk mengambil sertifikatnya sendiri; dengan proxy
oranye, tantangannya tidak pernah sampai. Sesudah sertifikat terbit dan situsnya
hidup, awannya boleh dioranyekan lagi kalau memang diinginkan.

## Pemasangan sekali di VPS

### 1. Pengguna dan direktori

```bash
sudo useradd --system --create-home --home-dir /opt/runut --shell /usr/sbin/nologin runut
sudo mkdir -p /opt/runut/server /var/www/runut-alpha /var/lib/runut-alpha/data
sudo chown -R runut:runut /opt/runut /var/lib/runut-alpha
sudo chown -R "$USER":"$USER" /var/www/runut-alpha
```

### 2. Pengumpul

Salin `server/kolektor.mjs` dari repo ke `/opt/runut/server/kolektor.mjs`, lalu:

```bash
sudo cp deploy/kolektor.contoh.service /etc/systemd/system/runut-kolektor.service
sudo systemctl daemon-reload
sudo systemctl enable --now runut-kolektor
curl -s http://127.0.0.1:8787/sehat        # harus mencetak: sehat
```

Pengumpul **hanya** mendengarkan di `127.0.0.1`. Firewall VPS ini tidak aktif,
jadi mengubah `HOST` menjadi `0.0.0.0` akan langsung membuka pengumpul ke
internet tanpa TLS dan tanpa pembatas. Jangan.

### 3. Caddy

```bash
sudo cp deploy/Caddyfile.contoh /etc/caddy/Caddyfile
sudo nano /etc/caddy/Caddyfile        # ganti runut.contoh.id
sudo systemctl reload caddy
```

Caddyfile contoh sengaja **tanpa direktif `log`**: Caddy tidak menulis log akses
kecuali diminta, dan INV-9 melarang menyimpan alamat IP.

### 4. Pengguna deploy terbatas

Dua kunci, masing-masing dipaksa ke satu perintah. Keduanya **tanpa shell,
tanpa sudo, tanpa port forwarding**, dan tidak bisa dipakai untuk apa pun selain
tugasnya.

Pasang skrip penerima:

```bash
sudo cp deploy/server/runut-terima.sh /usr/local/bin/runut-terima
sudo chmod 755 /usr/local/bin/runut-terima
```

Buat dua pasang kunci **di laptop** (tanpa frasa sandi supaya skrip tidak
menggantung):

```bash
ssh-keygen -t ed25519 -f ~/.ssh/runut-kirim -C runut-kirim -N ""
ssh-keygen -t ed25519 -f ~/.ssh/runut-data  -C runut-data  -N ""
```

Tambahkan **kunci publiknya** ke `~/.ssh/authorized_keys` pengguna deploy di
server, masing-masing satu baris:

```
command="/usr/local/bin/runut-terima",no-pty,no-agent-forwarding,no-port-forwarding,no-X11-forwarding,no-user-rc ssh-ed25519 AAAA...kirim... runut-kirim
command="tar -cz -C /var/lib/runut-alpha/data .",no-pty,no-agent-forwarding,no-port-forwarding,no-X11-forwarding,no-user-rc ssh-ed25519 AAAA...data... runut-data
```

Kunci kedua hanya bisa **membaca**: ia mengeluarkan isi direktori data sebagai
arsip dan tidak punya jalan untuk menulis apa pun.

Lalu di laptop, `~/.ssh/config`:

```
Host runut-alpha
    HostName <alamat-vps>
    User <pengguna-deploy>
    IdentityFile ~/.ssh/runut-kirim
    IdentitiesOnly yes

Host runut-alpha-data
    HostName <alamat-vps>
    User <pengguna-deploy>
    IdentityFile ~/.ssh/runut-data
    IdentitiesOnly yes
```

## Menerbitkan

```bash
# 1. Bangun dengan alamat pengumpul relatif (satu asal).
#    DI GIT BASH, MSYS_NO_PATHCONV=1 WAJIB — lihat "Kalau gagal".
MSYS_NO_PATHCONV=1 VITE_KOLEKTOR_URL=/e npx vite build

# 2. Kirim.
bash deploy/kirim.sh
```

Di PowerShell, bentuk yang setara:

```powershell
$env:VITE_KOLEKTOR_URL = '/e'; npm run build; Remove-Item Env:\VITE_KOLEKTOR_URL
```

Periksa hasilnya:

```bash
curl -si https://<subdomain>/sehat | head -1     # HTTP/2 200
curl -s  https://<subdomain>/ | head -5          # HTML aplikasi
```

Dan periksa bahwa build-nya benar-benar membawa alamat pengumpul:

```bash
grep -c '"/e"' web/dist/assets/*.js              # harus 1, bukan 0
```

## Mengambil data

```bash
bash deploy/ambil-data.sh
npm run alpha:ringkas -- .cache/alpha/peristiwa-*.jsonl
```

## Mematikan

```bash
sudo systemctl disable --now runut-kolektor      # pengumpul berhenti
sudo rm /etc/caddy/Caddyfile && sudo systemctl reload caddy   # situs mati
```

Menghapus data alpha sepenuhnya:

```bash
sudo rm -rf /var/lib/runut-alpha/data/*.jsonl
```

Dan hapus kedua baris kunci dari `authorized_keys` supaya laptop tidak lagi
punya jalan masuk.

## Kalau gagal

### `/e` diam-diam menjadi `E:/`

**Gejala:** situs hidup, permainan jalan, tetapi tidak satu pun peristiwa
sampai ke pengumpul, dan `grep -c '"/e"' web/dist/assets/*.js` menjawab `0`.

**Sebab:** di Git Bash, MSYS menerjemahkan nilai variabel lingkungan yang mirip
jalur POSIX menjadi jalur Windows. `VITE_KOLEKTOR_URL=/e` sampai ke Node sebagai
`E:/`. Tidak ada satu pun pesan galat; build-nya "berhasil" dan salah.

Bisa dibuktikan sendiri:

```bash
VITE_KOLEKTOR_URL=/e node -e 'console.log(process.env.VITE_KOLEKTOR_URL)'
# E:/
```

**Jalan keluar di Git Bash** — matikan penerjemahan jalur untuk perintah itu:

```bash
MSYS_NO_PATHCONV=1 VITE_KOLEKTOR_URL=/e npx vite build
```

**Atau lewat PowerShell**, yang tidak menerjemahkan apa pun:

```powershell
$env:VITE_KOLEKTOR_URL = '/e'; npm run build; Remove-Item Env:\VITE_KOLEKTOR_URL
```

Sesudah itu `grep -c '"/e"' web/dist/assets/*.js` harus menjawab `1`.
Kalau ia menjawab `0`, build-nya salah dan tidak boleh dikirim.

### Arsip rusak, atau "Pseudo-terminal will not be allocated"

**Gejala:** `tar: Unexpected EOF in archive`, atau server mengeluh arsipnya
tidak bisa dibuka, atau ssh mencetak "Pseudo-terminal will not be allocated for
this host".

**Sebab:** server mencetak banner login panjang ke **stderr**. Dua kesalahan yang
menyebabkannya:

1. memanggil `ssh` tanpa `-T`, sehingga ssh mencoba mengalokasikan terminal;
2. menggabungkan stderr ke stdout (`2>&1`) di sekitar pipa tar. Aliran tar
   adalah data biner; mencampurnya dengan teks banner merusak arsipnya.

**Jalan keluar:** selalu `ssh -T`, dan **jangan pernah** menulis `2>&1` di dekat
pipa tar. Biarkan stderr tampil apa adanya, atau alihkan ke berkas terpisah.
Kedua skrip di `deploy/` sudah begitu.

### `Cannot connect to C: resolve failed`

**Sebab:** GNU tar di Git Bash membaca jalur yang berawalan huruf drive dan titik
dua (`C:\Users\...`) sebagai **host jauh**, karena bentuk `host:jalur` adalah
sintaks tar untuk arsip di mesin lain.

**Jalan keluar:** jangan pernah memberi tar nama berkas Windows absolut. Pakai
pipa stdin/stdout dan `-C` dengan jalur relatif, seperti kedua skrip di sini.
Kalau benar-benar perlu jalur absolut, tambahkan `--force-local`.

Uji cepat bahwa sambungan datanya sehat:

```bash
ssh -T -o BatchMode=yes runut-alpha-data > /tmp/uji.tgz
tar -tz < /tmp/uji.tgz      # harus mencetak setidaknya: ./
```

### Skrip menggantung menunggu masukan

Kedua skrip memakai `-o BatchMode=yes`, jadi ssh gagal keras alih-alih meminta
frasa sandi atau menanyakan sidik jari host. Kalau gagal dengan
`Host key verification failed`, hubungkan sekali secara manual untuk menerima
sidik jari hostnya, lalu jalankan skripnya lagi.

### Caddy tidak mendapat sertifikat

Periksa berurutan: rekaman A menunjuk ke IP yang benar; Cloudflare dalam mode
**DNS only**; port 80 dan 443 terbuka; lalu `sudo journalctl -u caddy -n 50`.
