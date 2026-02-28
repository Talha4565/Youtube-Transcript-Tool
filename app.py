import os
from flask import Flask, request, jsonify, send_from_directory, send_file
from flask_cors import CORS
import io
from flask_limiter import Limiter
from flask_limiter.util import get_remote_address
from utils.validator import extract_video_id
from utils.transcript import get_transcript
from utils.cache import LRUCache

app = Flask(__name__, static_folder='static', static_url_path='')
CORS(app)

# Rate limiter — keyed by client IP
limiter = Limiter(
    key_func=get_remote_address,
    app=app,
    default_limits=[],          # no global limit; set per-route
    storage_uri="memory://",    # in-memory (no Redis needed)
)

cache = LRUCache(maxsize=100)

@app.route('/')
def index():
    return send_from_directory('static', 'index.html')

@app.errorhandler(429)
def rate_limit_exceeded(e):
    return jsonify({'error': 'Too many requests. Please slow down and try again in a minute.'}), 429

@app.route('/api/transcript', methods=['POST'])
@limiter.limit("10 per minute; 50 per hour")
def transcript():
    data = request.get_json()
    if not data or 'url' not in data:
        return jsonify({'error': 'Missing URL'}), 400

    url = data['url'].strip()
    lang = data.get('lang', 'en')

    video_id = extract_video_id(url)
    if not video_id:
        return jsonify({'error': 'Invalid YouTube URL. Please enter a valid YouTube video link.'}), 400

    cache_key = f'{video_id}_{lang}'
    cached = cache.get(cache_key)
    if cached:
        return jsonify(cached)

    result = get_transcript(video_id, lang)
    if 'error' in result:
        return jsonify(result), 422

    cache.set(cache_key, result)
    return jsonify(result)

@app.route('/api/languages', methods=['POST'])
@limiter.limit("20 per minute")
def languages():
    data = request.get_json()
    if not data or 'url' not in data:
        return jsonify({'error': 'Missing URL'}), 400

    url = data['url'].strip()
    video_id = extract_video_id(url)
    if not video_id:
        return jsonify({'error': 'Invalid YouTube URL'}), 400

    from youtube_transcript_api import YouTubeTranscriptApi
    try:
        transcript_list = YouTubeTranscriptApi().list(video_id)
        langs = []
        for t in transcript_list:
            langs.append({
                'code': t.language_code,
                'name': t.language,
                'auto': t.is_generated
            })
        return jsonify({'languages': langs})
    except Exception as e:
        return jsonify({'error': str(e)}), 422

@app.route('/api/export/srt', methods=['POST'])
@limiter.limit("20 per minute")
def export_srt():
    data = request.get_json()
    if not data or 'url' not in data:
        return jsonify({'error': 'Missing URL'}), 400

    url = data['url'].strip()
    lang = data.get('lang', 'en')
    video_id = extract_video_id(url)
    if not video_id:
        return jsonify({'error': 'Invalid YouTube URL'}), 400

    cache_key = f'{video_id}_{lang}'
    cached = cache.get(cache_key)
    result = cached if cached else get_transcript(video_id, lang)
    if 'error' in result:
        return jsonify(result), 422
    if not cached:
        cache.set(cache_key, result)

    # Build SRT content
    lines = []
    for i, seg in enumerate(result['segments'], 1):
        start = seg['start']
        end = start + seg['duration']
        lines.append(str(i))
        lines.append(f"{_srt_time(start)} --> {_srt_time(end)}")
        lines.append(seg['text'])
        lines.append('')
    srt_content = '\n'.join(lines)

    buf = io.BytesIO(srt_content.encode('utf-8'))
    buf.seek(0)
    return send_file(
        buf,
        mimetype='text/plain',
        as_attachment=True,
        download_name=f'transcript_{video_id}.srt'
    )


def _srt_time(seconds: float) -> str:
    """Convert seconds to SRT timestamp format HH:MM:SS,mmm"""
    ms = int((seconds % 1) * 1000)
    s = int(seconds)
    m, s = divmod(s, 60)
    h, m = divmod(m, 60)
    return f"{h:02d}:{m:02d}:{s:02d},{ms:03d}"


@app.route('/api/export/pdf', methods=['POST'])
@limiter.limit("10 per minute")
def export_pdf():
    data = request.get_json()
    if not data or 'url' not in data:
        return jsonify({'error': 'Missing URL'}), 400

    url = data['url'].strip()
    lang = data.get('lang', 'en')
    video_id = extract_video_id(url)
    if not video_id:
        return jsonify({'error': 'Invalid YouTube URL'}), 400

    cache_key = f'{video_id}_{lang}'
    cached = cache.get(cache_key)
    result = cached if cached else get_transcript(video_id, lang)
    if 'error' in result:
        return jsonify(result), 422
    if not cached:
        cache.set(cache_key, result)

    try:
        from reportlab.lib.pagesizes import A4
        from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
        from reportlab.lib.units import cm
        from reportlab.lib import colors
        from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, HRFlowable
        from reportlab.lib.enums import TA_LEFT

        buf = io.BytesIO()
        doc = SimpleDocTemplate(
            buf,
            pagesize=A4,
            leftMargin=2*cm, rightMargin=2*cm,
            topMargin=2*cm, bottomMargin=2*cm
        )

        styles = getSampleStyleSheet()
        title_style = ParagraphStyle('Title', parent=styles['Heading1'], fontSize=16, spaceAfter=6, textColor=colors.HexColor('#CC0000'))
        meta_style  = ParagraphStyle('Meta',  parent=styles['Normal'],   fontSize=9,  textColor=colors.grey, spaceAfter=12)
        ts_style    = ParagraphStyle('TS',    parent=styles['Normal'],   fontSize=8,  textColor=colors.HexColor('#CC0000'), fontName='Courier', spaceAfter=2)
        body_style  = ParagraphStyle('Body',  parent=styles['Normal'],   fontSize=11, leading=16, spaceAfter=10)

        story = []
        story.append(Paragraph(f'YouTube Transcript', title_style))
        story.append(Paragraph(f'Video ID: {video_id} &nbsp;&nbsp;|&nbsp;&nbsp; Language: {result["language"]} &nbsp;&nbsp;|&nbsp;&nbsp; {result["word_count"]:,} words', meta_style))
        story.append(HRFlowable(width='100%', thickness=1, color=colors.HexColor('#dddddd'), spaceAfter=16))

        for para in result['paragraphs']:
            start = para['start']
            m, s = divmod(int(start), 60)
            h, m = divmod(m, 60)
            ts = f"{h:02d}:{m:02d}:{s:02d}" if h else f"{m:02d}:{s:02d}"
            story.append(Paragraph(f'[{ts}]', ts_style))
            story.append(Paragraph(para['text'], body_style))
            story.append(Spacer(1, 4))

        doc.build(story)
        buf.seek(0)
        return send_file(
            buf,
            mimetype='application/pdf',
            as_attachment=True,
            download_name=f'transcript_{video_id}.pdf'
        )
    except Exception as e:
        return jsonify({'error': f'PDF generation failed: {str(e)}'}), 500

if __name__ == '__main__':
    port = int(os.environ.get('PORT', 5000))
    app.run(host='0.0.0.0', port=port, debug=False)
