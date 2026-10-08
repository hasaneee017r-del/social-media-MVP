import { useCallback, useEffect, useState } from 'react';
import { api, ApiError, type Post } from '../api';
import { useAuth } from '../AuthContext';
import PostComposer from '../components/PostComposer';
import PostList from '../components/PostList';

export default function FeedPage() {
  const { sessionExpired } = useAuth();
  const [posts, setPosts] = useState<Post[]>([]);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const handleError = useCallback(
    (err: unknown) => {
      if (err instanceof ApiError && err.status === 401) sessionExpired();
      setError(err instanceof Error ? err.message : 'Something went wrong');
    },
    [sessionExpired],
  );

  const loadPage = useCallback(
    async (cursor?: string) => {
      setLoading(true);
      setError(null);
      try {
        const page = await api.feed(cursor);
        setPosts((prev) => (cursor ? [...prev, ...page.posts] : page.posts));
        setNextCursor(page.nextCursor);
      } catch (err) {
        handleError(err);
      } finally {
        setLoading(false);
      }
    },
    [handleError],
  );

  useEffect(() => {
    loadPage();
  }, [loadPage]);

  async function createPost(content: string) {
    try {
      const { post } = await api.createPost(content);
      setPosts((prev) => [post, ...prev]);
      return post;
    } catch (err) {
      if (err instanceof ApiError && err.status === 401) sessionExpired();
      throw err;
    }
  }

  return (
    <>
      <PostComposer onSubmit={createPost} />
      <div className="feed-header">
        <h1>Latest posts</h1>
        <button type="button" className="btn btn-secondary" onClick={() => loadPage()} disabled={loading}>
          Refresh
        </button>
      </div>
      {error && (
        <p className="error" role="alert">
          {error}
        </p>
      )}
      {loading && posts.length === 0 ? <p className="center muted">Loading posts…</p> : <PostList posts={posts} />}
      {nextCursor && (
        <div className="center">
          <button type="button" className="btn btn-secondary" onClick={() => loadPage(nextCursor)} disabled={loading}>
            {loading ? 'Loading…' : 'Load more'}
          </button>
        </div>
      )}
    </>
  );
}
