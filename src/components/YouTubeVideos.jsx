import { useState, useEffect } from 'react';

const YOUTUBE_KEY = import.meta.env.VITE_YOUTUBE_API_KEY;

export default function YouTubeVideos({ destination }) {
  const [videos, setVideos] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!destination || !YOUTUBE_KEY) return;
    setLoading(true);
    fetch(
      `https://www.googleapis.com/youtube/v3/search?part=snippet&q=${encodeURIComponent(
        destination + ' travel guide India'
      )}&type=video&maxResults=3&key=${YOUTUBE_KEY}`
    )
      .then((r) => r.json())
      .then((data) => {
        if (!data.error) setVideos(data.items || []);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [destination]);

  if (!YOUTUBE_KEY || (!loading && videos.length === 0)) return null;

  return (
    <section className="youtube-section" aria-label="Destination travel videos">
      <h2 className="youtube-title">🎬 Watch {destination} Travel Videos</h2>
      {loading ? (
        <div className="youtube-loading">
          <div className="spinner" style={{ width: 28, height: 28, borderWidth: 2 }}></div>
        </div>
      ) : (
        <div className="youtube-grid">
          {videos.map((video) => (
            <a
              key={video.id.videoId}
              href={`https://www.youtube.com/watch?v=${video.id.videoId}`}
              target="_blank"
              rel="noopener noreferrer"
              className="youtube-card"
              aria-label={`Watch: ${video.snippet.title}`}
            >
              <div className="youtube-thumb-wrap">
                <img
                  src={video.snippet.thumbnails.medium.url}
                  alt={video.snippet.title}
                  className="youtube-thumb"
                  loading="lazy"
                />
                <div className="youtube-play-btn">▶</div>
              </div>
              <div className="youtube-info">
                <p className="youtube-video-title">{video.snippet.title}</p>
                <p className="youtube-channel">{video.snippet.channelTitle}</p>
              </div>
            </a>
          ))}
        </div>
      )}
    </section>
  );
}
