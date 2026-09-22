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
  const [search, setSearch] = useState('');

  useEffect(() => {
    feedApi.listPosts().then(setPosts).catch(() => setError('Could not load community feed.'));
  }, []);

  const query = search.trim().toLowerCase();
  const filteredPosts = posts?.filter((post) => (
    !query
    || post.title?.toLowerCase().includes(query)
    || post.body?.toLowerCase().includes(query)
  ));

  async function handleLike(post) {
    if (!user) {
      navigate('/login');
      return;
    }
    try {
      const result = await feedApi.toggleLike(post.id);
      setPosts((prev) => prev.map((p) => {
        if (p.id !== post.id) return p;
        const likers = result.liked_by_me
          ? [...p.likers.filter((l) => l.username !== user.username), { username: user.username, profile_picture: user.profile_picture || null }]
          : p.likers.filter((l) => l.username !== user.username);
        return { ...p, liked_by_me: result.liked_by_me, likes_count: result.likes_count, likers };
      }));
    } catch {
      // ignore — like is a low-stakes action, no need to surface an error banner
    }
  }

  return (
    <section className="section community-feeds">
      <div className="section-content">
        <h2 className="section-title" style={{ textAlign: 'center' }}>Community Feeds</h2>

        {posts && posts.length > 0 && (
          <div className="feed-search">
            <input
              type="search"
              className="form-control"
              placeholder="Search announcements and photos…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
        )}

        {error && <p className="form-error-banner">{error}</p>}
        {!posts && !error && <p className="loading-state">Loading community feed…</p>}
        {posts && posts.length === 0 && <p className="empty-state">No posts yet. Check back soon!</p>}
        {posts && posts.length > 0 && filteredPosts.length === 0 && (
          <p className="empty-state">No posts match &quot;{search}&quot;.</p>
        )}

        <div className="feeds-list">
          {filteredPosts?.map((post) => (
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
                <div className="like-button-wrap">
                  <button className="action-btn" type="button" onClick={() => handleLike(post)}>
                    {post.liked_by_me ? '❤️' : '🤍'} {post.likes_count} {post.likes_count === 1 ? 'Like' : 'Likes'}
                  </button>
                  {post.likers && post.likers.length > 0 && (
                    <div className="likers-popover">
                      {post.likers.map((liker) => (
                        <div key={liker.username} className="likers-popover-item">
                          <img src={liker.profile_picture || logo} alt="" />
                          <span>{liker.username}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
