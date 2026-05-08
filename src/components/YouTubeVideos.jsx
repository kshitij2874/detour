import { useState, useEffect } from 'react';
import PropTypes from 'prop-types';
import logger from '../lib/logger';

const YOUTUBE_KEY = import.meta.env.VITE_YOUTUBE_API_KEY;

/**
 * YouTubeVideos — fetches and displays 3 travel videos for the destination
 * using the YouTube Data API v3.
 *
 * @param {Object} props
 * @param {string} props.destination - Trip destination used as search query
 */
export default function YouTubeVideos({ destination }) {
  const [videos, setVideos] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!destination || !YOUTUBE_KEY) return;

    /** Fetch videos using async/await inside the effect. */
    async function fetchVideos() {
      setLoading(true);
      try {
        const res = await fetch(
          `https://www.googleapis.com/youtube/v3/search?part=snippet&q=${encodeURIComponent(
            `${destination} travel guide India`
          )}&type=video&maxResults=3&key=${YOUTUBE_KEY}`
        );
        const data = await res.json();
        if (data.error) {
          logger.warn('YouTube API error', data.error.message);
        } else {
          setVideos(data.items || []);
        }
      } catch (err) {
        logger.error('Failed to fetch YouTube videos', err);
      } finally {
        setLoading(false);
      }
    }

    fetchVideos();
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

YouTubeVideos.propTypes = {
  /** Trip destination — used as the YouTube search query. */
  destination: PropTypes.string.isRequired,
};
