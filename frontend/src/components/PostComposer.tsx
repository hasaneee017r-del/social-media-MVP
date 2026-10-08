import { useState, type FormEvent } from 'react';
import { ApiError, MAX_POST_LENGTH, type Post } from '../api';

interface Props {
  onSubmit: (content: string) => Promise<Post>;
}

export default function PostComposer({ onSubmit }: Props) {
  const [content, setContent] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const length = content.trim().length;
  const remaining = MAX_POST_LENGTH - length;
  const valid = length > 0 && remaining >= 0;

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!valid || submitting) return;
    setSubmitting(true);
    setError(null);
    try {
      await onSubmit(content.trim());
      setContent('');
    } catch (err) {
      // Keep the text so the user can retry.
      setError(err instanceof ApiError ? err.message : 'Could not publish your post');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form className="card composer" onSubmit={handleSubmit}>
      <label htmlFor="post-content" className="visually-hidden">
        What's happening?
      </label>
      <textarea
        id="post-content"
        placeholder="What's happening?"
        value={content}
        onChange={(e) => setContent(e.target.value)}
        rows={3}
        aria-describedby="post-counter"
        onKeyDown={(e) => {
          if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) handleSubmit(e);
        }}
      />
      {error && (
        <p className="error" role="alert">
          {error}
        </p>
      )}
      <div className="composer-footer">
        <span
          id="post-counter"
          className={remaining < 0 ? 'counter over' : remaining <= 20 ? 'counter warn' : 'counter'}
          aria-live="polite"
        >
          {remaining} characters left
        </span>
        <button type="submit" className="btn" disabled={!valid || submitting}>
          {submitting ? 'Posting…' : 'Post'}
        </button>
      </div>
    </form>
  );
}
