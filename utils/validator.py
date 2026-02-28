import re
from urllib.parse import urlparse, parse_qs

def extract_video_id(url: str) -> str | None:
    """Extract YouTube video ID from various URL formats."""
    if not url:
        return None

    # Plain video ID (11 chars)
    if re.match(r'^[a-zA-Z0-9_-]{11}$', url.strip()):
        return url.strip()

    patterns = [
        r'(?:youtube\.com/watch\?v=|youtu\.be/|youtube\.com/embed/|youtube\.com/v/|youtube\.com/shorts/)([a-zA-Z0-9_-]{11})',
        r'youtube\.com/watch\?.*&v=([a-zA-Z0-9_-]{11})',
    ]

    for pattern in patterns:
        match = re.search(pattern, url)
        if match:
            return match.group(1)

    # Try parsing query string
    try:
        parsed = urlparse(url)
        qs = parse_qs(parsed.query)
        if 'v' in qs:
            return qs['v'][0]
    except Exception:
        pass

    return None
