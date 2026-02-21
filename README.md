# � CyChat — Psikolog Virtual AI

CyChat adalah chatbot psikolog virtual berbasis AI untuk remaja dan dewasa muda usia **20-27 tahun** yang mengalami stres akibat beban kehidupan. Dibangun dengan tampilan yang hangat, tenang, dan terapeutik.

---

## ✨ Fitur

- **Psikolog Virtual** — AI berperan sebagai teman curhat yang empatik, menggunakan pendekatan CBT & mindfulness
- **Multi-model Fallback** — 7 model AI gratis dari OpenRouter, otomatis switch jika satu gagal
- **Topik Mental Health** — Burnout, overthinking, quarter-life crisis, kecemasan, kesepian, dll
- **Safety Net** — Deteksi tanda bahaya dan arahkan ke hotline profesional (119 ext. 8)
- **Markdown Rendering** — Heading, bold, list, code block di-render rapi
- **Chat History** — Riwayat tersimpan di LocalStorage
- **PWA** — Bisa diinstall di HP & desktop
- **Responsive** — Menyesuaikan semua ukuran layar

---

## 📁 Struktur File

```
Halochatbot/
├── index.html       # Halaman utama
├── app.js           # Logic (chat, API, system prompt, markdown parser)
├── style.css        # Styling terapeutik (sage green + warm beige)
├── .env             # API key OpenRouter (JANGAN commit!)
├── config.js        # Config tambahan (opsional)
├── sw.js            # Service Worker (PWA & cache)
├── manifest.json    # PWA manifest
├── README.md        # Dokumentasi ini
├── .gitignore       # Exclude .env dari Git
└── icons/
    ├── icon-192.svg
    └── icon-512.svg
```

---

## 🚀 Cara Menjalankan

### 1. Dapatkan API Key (Gratis, tanpa kartu kredit)

1. Buka [openrouter.ai/keys](https://openrouter.ai/keys)
2. Login pakai akun Google
3. Klik **"Create Key"** → copy key-nya (`sk-or-...`)

### 2. Konfigurasi

Edit file `.env`:

```
OPENROUTER_API_KEY=sk-or-v1-xxxxxxxxxxxxxxxxxxxxx
```

### 3. Jalankan

```bash
npx -y serve .
```

Buka [http://localhost:3000](http://localhost:3000)

---

## 🤖 Model AI (Gratis via OpenRouter)

| #   | Model                                          | Kecepatan |
| --- | ---------------------------------------------- | --------- |
| 1   | `google/gemma-3-27b-it`                        | ⚡ Cepat  |
| 2   | `meta-llama/llama-3.2-3b-instruct`             | ⚡ Cepat  |
| 3   | `nousresearch/deephermes-3-llama-3-8b-preview` | ⚡ Cepat  |
| 4   | `nvidia/llama-3.1-nemotron-nano-8b-v1`         | ⚡ Cepat  |
| 5   | `mistralai/mistral-small-3.1-24b-instruct`     | 🔵 Sedang |
| 6   | `deepseek/deepseek-chat-v3-0324`               | 🔵 Sedang |
| 7   | `deepseek/deepseek-r1-0528`                    | 🟡 Lambat |

Jika model pertama gagal (rate limit), otomatis coba model berikutnya.

---

## 🎨 Desain UI/UX

**Konsep:** Ruang konsultasi psikolog yang hangat dan aman.

- **Palet warna:** Sage green (#7c9a8e) + warm beige (#faf9f7)
- **Background chat:** Cream hangat (#f5f0ea)
- **Bubble bot:** Putih dengan border lembut
- **Bubble user:** Sage green gradient
- **Animasi:** Lambat & calming (orbit 12s, pulse 4s)
- **Font:** Inter — bersih dan mudah dibaca

| Ukuran Layar      | Lebar App  |
| ----------------- | ---------- |
| HP (< 768px)      | Full width |
| Tablet (768px+)   | 700px      |
| Laptop (1024px+)  | 850px      |
| Desktop (1440px+) | 950px      |

---

## 🔒 Keamanan

- API key disimpan di `.env`, dibaca via `fetch` (client-side)
- **Jangan commit `.env` ke Git** (sudah ada di `.gitignore`)
- Untuk production, gunakan backend proxy

---

## 📝 Lisensi

MIT License
