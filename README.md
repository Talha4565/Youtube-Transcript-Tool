# 🎬 YouTube Transcript Tool

> **Free, instant YouTube transcript extractor — no signup, no database, no fluff.**

Paste any YouTube URL and get a clean, readable transcript in seconds. Built for researchers, students, content creators, and developers who need transcripts fast.

---

## ✨ Features

- 🔗 **Paste any YouTube URL** → get a clean transcript instantly
- 🌙☀️ **Dark / Light theme** toggle (saved to localStorage)
- 📺 **Side-by-side video sync** — watch the video while the transcript highlights the current spoken segment in real time
- 🔍 **Search with highlighting** — find any word, jump to prev/next match
- 📄 **Paragraph & Segment views** with clickable timestamps
- **A- / A+** Font size controls (saved to localStorage)
- ⏳ **Reading time estimate**
- 📋 **Copy to clipboard** in one click
- ⬇️ **Export as TXT, SRT (subtitles), or PDF**
- 🌐 **Multi-language support** — auto-detects all available transcript languages
- ⚡ **In-memory LRU caching** — repeat requests are instant
- 🔒 **Rate limiting** — protected against abuse (10 req/min per IP)
- 📱 **Fully responsive** — works on mobile

## Run Locally

```bash
pip install -r requirements.txt
python app.py
```

Open http://localhost:5000

## Deploy to Render

1. Push this folder to a GitHub repo
2. Go to https://render.com → New Web Service
3. Connect your repo
4. Render auto-detects `render.yaml` — just click Deploy

## 🛠️ Tech Stack

| Layer | Tech |
|---|---|
| Backend | Python 3.11 + Flask |
| Transcript | youtube-transcript-api v1.x |
| PDF Export | ReportLab |
| Rate Limiting | flask-limiter |
| Frontend | Vanilla JS, HTML, CSS (no frameworks) |
| Video Sync | YouTube IFrame API |
| Caching | In-memory LRU (thread-safe) |
| Production | Gunicorn + Render.com |

## 🚀 Deploy to Render (Free)

1. Fork or clone this repo
2. Go to [render.com](https://render.com) → **New → Web Service**
3. Connect your GitHub repo
4. Render auto-detects `render.yaml` — click **Deploy**
5. Your app is live in ~2 minutes at `https://youtube-transcript-tool.onrender.com`

## 📄 API Endpoints

| Method | Endpoint | Description |
|---|---|---|
| POST | `/api/transcript` | Fetch transcript (10/min rate limit) |
| POST | `/api/languages` | List available languages (20/min) |
| POST | `/api/export/srt` | Download as SRT subtitle file |
| POST | `/api/export/pdf` | Download as formatted PDF |

## 📜 License

MIT — free to use, modify, and deploy.
