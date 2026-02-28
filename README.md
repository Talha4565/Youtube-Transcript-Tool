# YT Transcript Grabber

Free, fast YouTube transcript extractor. No signup. No database.

## Features
- Paste any YouTube URL → instant transcript
- Search with highlighting and navigation
- Paragraph or segment view with clickable timestamps
- Copy to clipboard / Download as TXT
- Multi-language support
- In-memory LRU caching

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

## Stack
- Python 3.11 + Flask
- youtube-transcript-api
- Vanilla JS frontend (no frameworks)
- Gunicorn for production
