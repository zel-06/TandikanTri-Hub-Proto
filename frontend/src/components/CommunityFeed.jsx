import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import * as feedApi from '../api/feed';
import PhotoGallery from './PhotoGallery';
import logo from '../assets/images/logo.png';

const TAG_LABEL = { announcement: 'Announcement', gallery: 'Gallery' };

function timeAgo(dateStr) {
  const diffMs = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diffMs / 60000);
  if (mins < 1) return 'Just now';
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;
  return new Date(dateStr).toLocaleDateString();
}

export default function CommunityFeed() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [posts, setPosts] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    feedApi.listPosts().then(setPosts).catch(() => setError('Could not load community feed.'));
  }, []);

  async function handleLike(post) {
    if (!user) {
      navigate('/login');
      return;
    }
    try {
      const result = await feedApi.toggleLike(post.id);
      setPosts((prev) => prev.map((p) => (
        p.id === post.id ? { ...p, liked_by_me: result.liked_by_me, likes_count: result.likes_count } : p
      )));
    } catch {
      // ignore — like is a low-stakes action, no need to surface an error banner
    }
  }

  return (
    <section className="section community-feeds">
      <div className="section-content">
        <h2 className="section-title" style={{ textAlign: 'center' }}>Community Feeds</h2>

        {error && <p className="form-error-banner">{error}</p>}
        {!posts && !error && <p className="loading-state">Loading community feed…</p>}
        {posts && posts.length === 0 && <p className="empty-state">No posts yet. Check back soon!</p>}

        <div className="feeds-list">
          {posts?.map((post) => (
            <article
              key={post.id}
              className={`feed-card ${post.post_type === 'announcement' ? 'announcement-card' : 'gallery-card'}`}
            >
              <div className="feed-card-header">
                <img src={logo} alt="" className="feed-avatar" />
                <div className="feed-card-header-info">
                  <p className="feed-author">{post.author_name}</p>
                  <p className="feed-meta">{timeAgo(post.created_at)}</p>
                </div>
                <span className="feed-tag">{TAG_LABEL[post.post_type] || post.post_type}</span>
              </div>

              <h3>{post.title}</h3>
              {post.body && <p>{post.body}</p>}

              {post.images.length > 0 && (
                <PhotoGallery photos={post.images.map((img) => img.image)} />
              )}

              {post.post_type === 'announcement' && post.event && (
                <Link to={user ? `/events/${post.event}` : '/login'} className="event-view-btn feed-cta-btn">
                  View Full Details
                </Link>
              )}

              <div className="feed-actions">
                <button className="action-btn" type="button" onClick={() => handleLike(post)}>
                  {post.liked_by_me ? '❤️' : '🤍'} {post.likes_count} {post.likes_count === 1 ? 'Like' : 'Likes'}
                </button>
              </div>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
