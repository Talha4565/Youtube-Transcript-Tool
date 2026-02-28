import traceback
from youtube_transcript_api import YouTubeTranscriptApi, NoTranscriptFound, TranscriptsDisabled, VideoUnavailable

def get_transcript(video_id: str, lang: str = 'en') -> dict:
    """Fetch transcript for a YouTube video, returns dict with segments and metadata."""
    try:
        ytt = YouTubeTranscriptApi()
        transcript_list = ytt.list(video_id)

        transcript = None
        try:
            transcript = transcript_list.find_transcript([lang])
        except NoTranscriptFound:
            try:
                transcript = transcript_list.find_generated_transcript([lang])
            except NoTranscriptFound:
                # Fall back to first available
                for t in transcript_list:
                    transcript = t
                    break

        if transcript is None:
            return {'error': 'No transcript available for this video.'}

        data = transcript.fetch()
        segments = []
        full_text_parts = []

        for entry in data:
            text = entry.text.strip()
            if text:
                segments.append({
                    'start': round(entry.start, 2),
                    'duration': round(entry.duration, 2),
                    'text': text
                })
                full_text_parts.append(text)

        full_text = ' '.join(full_text_parts)

        # Build paragraphs (group every 8 segments)
        paragraphs = []
        chunk_size = 8
        for i in range(0, len(segments), chunk_size):
            chunk = segments[i:i+chunk_size]
            para_text = ' '.join(s['text'] for s in chunk)
            paragraphs.append({
                'start': chunk[0]['start'],
                'text': para_text
            })

        return {
            'video_id': video_id,
            'language': transcript.language,
            'language_code': transcript.language_code,
            'is_generated': transcript.is_generated,
            'segments': segments,
            'paragraphs': paragraphs,
            'full_text': full_text,
            'word_count': len(full_text.split())
        }

    except TranscriptsDisabled:
        return {'error': 'Transcripts are disabled for this video.'}
    except VideoUnavailable:
        return {'error': 'This video is unavailable or private.'}
    except Exception as e:
        print(traceback.format_exc())
        return {'error': f'Could not fetch transcript: {str(e)}'}
