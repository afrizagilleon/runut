# Arsitektur AI agent Runut

Diagram ini disetujui pemilik pada 5 Okt 2026 untuk dipakai di README. AI agent digambar sekali di tengah; tiap tool menempel ke agent dengan panah bolak-balik (tool call ⇄ tool result). Tidak ada panah dari satu tool ke tool lain: urutan pemanggilan diputuskan agent, bukan kode.

```mermaid
flowchart LR
    P(["Penyusun<br/>kode saham + budget"])
    Y(["Reviewer manusia<br/>periksa, sunting, setuju"])

    subgraph UH["usulkan_hari · tool gratis"]
        direction TB
        UH1["data harga, dividen, suspensi,<br/>laporan kepemilikan saham itu"] --> UH2["cari peristiwa:<br/>ex-dividend, lonjakan harga, suspensi,<br/>insider filing"] --> UH3["tiga hari teratas<br/>+ jumlah kartu fakta yang lolos"]
    end

    subgraph PS["periksa_saham · tool gratis"]
        direction TB
        PS1["data Sectors API<br/>untuk hari pilihan"] --> PS2{"33 aturan verifikasi R<br/>dijalankan kode"}
        PS2 -->|lolos| PS3["kartu fakta<br/>nama emiten disamarkan"]
        PS2 -->|gagal| PS4["fakta disingkirkan<br/>+ alasannya"]
    end

    subgraph LB["lihat_fakta · lihat_bank · tool gratis"]
        direction TB
        LB1["kartu fakta hari itu"]
        LB2["omongan yang sudah lolos<br/>+ pilihan dan kunci jawabannya"]
        LB3["apa yang masih kurang:<br/>kartu penentu, jawaban Betul, jawaban Keliru"]
        LB4["pola penolakan sebelumnya<br/>+ sisa budget"]
        LB1 ~~~ LB2 ~~~ LB3 ~~~ LB4
    end

    subgraph LS["lihat_simulasi · tool gratis"]
        direction TB
        LS1["tiga omongan versi asal"]
        LS2["score blind guesser<br/>score Opus tester"]
        LS3["alasan blind guesser memilih kunci jawaban<br/>= petunjuk yang bocor"]
        LS1 ~~~ LS2 ~~~ LS3
    end

    subgraph AGEN["RUNUT AGENT · OPUS WRITER · AI AGENT"]
        direction TB
        A1(("reasoning")) --> A2["memilih tool<br/>dan isinya sendiri"]
        A2 --> A3["membaca tool result"]
        A3 --> A4{"memutuskan"}
        A4 -->|"tulis draft baru"| A1
        A4 -->|"perbaiki kalimat"| A1
        A4 -->|"ganti topik"| A1
        A4 -->|"lanjut naikkan kesulitan"| A1
        A4 -->|"cukup sampai di sini"| A5(["berhenti"])
    end

    subgraph PK["periksa_draft_dengan_aturan · tool gratis"]
        direction TB
        PK1["1 sampai 3 draft"] --> PK2{"aturan cacat soal D1-D9<br/>+ kontrak bentuk K"}
        PK2 -->|lolos| PK3["id_draf"]
        PK2 -->|gagal| PK4["penolakan apa adanya"]
    end

    subgraph AJ["ajukan · tool berbayar"]
        direction TB
        AJ0["1 sampai 3 id_draf<br/>tiap draft diuji sendiri, paralel"] --> AJ1{"Blind guesser<br/>menebak tanpa kartu"}
        AJ1 -->|lolos| AJ2{"Card reader<br/>menjawab dengan kartu"}
        AJ2 -->|lolos| AJ3["Opus tester<br/>menebak tanpa kartu,<br/>hanya memberi warning"]
        AJ3 --> AJ4{"Critic<br/>memeriksa makna"}
        AJ4 -->|lolos| AJ5["LOLOS<br/>+ warning Opus tester"]
        AJ1 -->|tolak| AJ6["DITOLAK<br/>tester mana + alasannya<br/>+ alasan blind guesser"]
        AJ2 -->|tolak| AJ6
        AJ4 -->|tolak| AJ6
    end

    subgraph TK["tingkatkan · tool berbayar"]
        direction TB
        TK0["id_asal + id_draf<br/>kartu penentu dan jawaban<br/>harus sama dengan versi asal"] --> TK1{"empat tester<br/>yang sama"}
        TK1 -->|lolos| TK2{"dibanding versi asal:<br/>blind guesser lebih jarang benar?<br/>Opus tester tidak lebih sering benar?"}
        TK2 -->|ya| TK3["LEBIH SULIT<br/>+ score baru"]
        TK2 -->|tidak| TK4["TIDAK LEBIH SULIT<br/>versi asal dipertahankan"]
        TK1 -->|tolak| TK4
    end

    subgraph LK["tahap lengkapi · tiga tool gratis, satu berbayar"]
        direction TB
        LK1["lihat_soal_terkunci · lihat_sesudahnya<br/>tiga omongan terkunci<br/>+ fakta sesudah tanggal simulasi"] --> LK2["draft lampiran:<br/>judul, istilah, teks kartu,<br/>layar sesudahnya"]
        LK2 --> LK3{"periksa_kasus_dengan_aturan<br/>validator produk, dijalankan kode"}
        LK3 -->|lolos| LK4{"ajukan_kasus · berbayar<br/>Critic memeriksa lampiran"}
        LK3 -->|gagal| LK5["masalahnya<br/>apa adanya"]
        LK4 -->|lolos| LK6["kasus.json ditulis<br/>ke folder percobaan"]
        LK4 -->|tolak| LK5
    end

    subgraph HASIL["Yang tersimpan selama agent bekerja"]
        direction TB
        H1[("Omongan yang lolos<br/>+ score-nya")]
        H2[("Simulasi tingkat biasa<br/>3 omongan, 3 kartu penentu berbeda<br/>minimal satu Betul dan satu Keliru")]
        H3[("Versi sulit<br/>di samping versi asal")]
        H4[("kasus.json<br/>simulasi lengkap, siap diperiksa")]
        H1 ~~~ H2 ~~~ H3 ~~~ H4
    end

    JAGA["Guardrail (kode)<br/>budget cap · step limit"]

    P --> AGEN
    UH <-->|"tool call ⇄ tiga hari"| AGEN
    PS <-->|"tanggal ⇄ kartu fakta"| AGEN
    LB <-->|"tool call ⇄ isi bank"| AGEN
    LS <-->|"tool call ⇄ score"| AGEN
    AGEN <-->|"draft ⇄ id_draf / penolakan"| PK
    AGEN <-->|"id_draf ⇄ lolos / ditolak + alasan"| AJ
    AGEN <-->|"versi baru ⇄ lebih sulit / tidak"| TK
    AGEN <-->|"draft lampiran ⇄ masalah / lolos"| LK
    AJ -.->|"yang lolos"| HASIL
    TK -.->|"yang lebih sulit"| HASIL
    LK -.->|"kasus lengkap"| HASIL
    HASIL --> Y
    JAGA -.- AGEN

    classDef agen fill:#3C3489,stroke:#AFA9EC,color:#EEEDFE
    classDef hasil fill:#27500A,stroke:#97C459,color:#EAF3DE
    class A1,A2,A3,A4,A5 agen
    class H1,H2,H3,H4 hasil
    style AGEN stroke:#7F77DD,stroke-width:3px
```

## Istilah di diagram

| Istilah | Arti |
|---|---|
| AI agent | Model (Opus) yang memilih sendiri tool mana yang dipanggil, kapan, dan berapa kali |
| Tool call ⇄ tool result | Agent memanggil tool; tool mengembalikan hasilnya ke agent |
| Blind guesser | Model murah yang menebak jawaban TANPA melihat kartu. Makin jarang ia benar, makin sulit soalnya |
| Card reader | Model yang menjawab DENGAN kartu. Ia harus benar; kalau tidak, soalnya kabur |
| Opus tester | Opus yang menebak tanpa kartu. Hanya memberi warning |
| Critic | Model yang memeriksa makna soal dan penjelasannya |
| Score | Berapa kali tester menebak benar tanpa kartu (mis. 3 dari 12) |
| Guardrail | Batas yang dijaga kode: budget cap dan step limit |

Yang diputuskan agent: hari, topik tiap omongan, isi draft, tool mana dan kapan, memperbaiki atau ganti topik, omongan mana yang dinaikkan kesulitannya, kapan berhenti. Yang diputuskan kode: 33 aturan R, aturan bentuk, urutan empat tester di dalam `ajukan` dan `tingkatkan`, dan budget.
