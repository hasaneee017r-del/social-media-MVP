import type { Post } from '../api';

const dateFormat = new Intl.DateTimeFormat(undefined, {
  dateStyle: 'medium',
  timeStyle: 'short',
});

export default function PostList({ posts }: { posts: Post[] }) {
  if (posts.length === 0) {
    return <p className="card center muted">No posts yet. Be the first to post something!</p>;
  }

  return (
    <ol className="post-list" aria-label="Feed">
      {posts.map((post) => (
        <li key={post.id} className="card post">
          <div className="post-meta">
            <span className="avatar" aria-hidden="true">
              {post.author.username.charAt(0).toUpperCase()}
            </span>
            <strong className="post-author">@{post.author.username}</strong>
            <time className="muted" dateTime={post.createdAt}>
              {dateFormat.format(new Date(post.createdAt))}
            </time>
          </div>
          {/* Rendered as text, never as HTML (NFR-05). */}
          <p className="post-content">{post.content}</p>
        </li>
      ))}
    </ol>
  );
}
