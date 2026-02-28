# TranscriptGrab — Free YouTube Transcript Tool

Extract, search, and download YouTube video transcripts instantly.
No signup. No ads. No cost. Open source.

🔗 **Live:** https://youtube-transcript-tool.onrender.com/

---

## Why TranscriptGrab?

| Feature | TranscriptGrab | YouTube Built-in | Tactiq | YouTubeTranscript.com |
|---|---|---|---|---|
| No signup required | ✅ | ✅ | ❌ | ✅ |
| Side-by-side video sync | ✅ | ❌ | ❌ | ❌ |
| Search with highlighting | ✅ | ❌ | ❌ | ❌ |
| Export as TXT | ✅ | ❌ | ✅ | ✅ |
| Export as SRT | ✅ | ❌ | ✅ | ❌ |
| Export as PDF | ✅ | ❌ | ❌ | ❌ |
| No ads | ✅ | ✅ | ❌ | ❌ |
| Open source | ✅ | ❌ | ❌ | ❌ |
| Multi-language | ✅ | ✅ | ✅ | ✅ |

---

## Features

- **Instant extraction** — Paste any YouTube URL, get transcript in under 3 seconds
- **Side-by-side mode** — Video plays on left, transcript scrolls on right, synced in real time
- **Search** — Find any word in the transcript with highlighting and match navigation
- **Multiple exports** — Download as TXT, SRT (subtitle file), or PDF
- **Multi-language** — Supports any language the video has captions for
- **Dark/Light theme** — Toggle based on preference
- **No account needed** — Zero friction, paste and go
- **No ads** — Clean, distraction-free interface

---

## Use Cases

- 🎓 **Students:** Extract searchable notes from lecture videos
- 🎬 **Content creators:** Research competitor videos quickly
- 🔬 **Researchers:** Quote specific parts of video interviews
- 📰 **Journalists:** Reference video sources accurately
- 💻 **Developers:** Extract video text data programmatically
- 📖 **Accessibility:** Read videos instead of watching them

---

## Tech Stack

- Python 3.11 + Flask
- youtube-transcript-api
- ReportLab (PDF generation)
- Vanilla HTML/CSS/JS frontend
- Docker + Gunicorn
- Deployed on Render.com

---

## Run Locally

```bash
git clone https://github.com/Talha4565/Youtube-Transcript-Tool.git
cd Youtube-Transcript-Tool
pip install -r requirements.txt
python app.py
# Open http://localhost:5000
```

---

## API Endpoints

| Endpoint | Method | Description |
|---|---|---|
| `/api/transcript` | POST | Extract transcript for a YouTube URL |
| `/api/languages` | POST | List available languages for a video |
| `/api/export/srt` | POST | Download transcript as SRT file |
| `/api/export/pdf` | POST | Download transcript as PDF |

---

## License

MIT — Use it however you want.

---

## Author

Built by [Talha](https://github.com/Talha4565) — open to feedback and contributions.
