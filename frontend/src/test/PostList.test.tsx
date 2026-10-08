import { render, screen, within } from '@testing-library/react';
import type { Post } from '../api';
import PostList from '../components/PostList';

const posts: Post[] = [
  { id: 2, content: 'Second post', createdAt: '2026-10-08T12:30:00.000Z', author: { id: 2, username: 'bob' } },
  { id: 1, content: 'First post', createdAt: '2026-10-08T09:00:00.000Z', author: { id: 1, username: 'alice' } },
];

describe('PostList (FR-08, FR-09)', () => {
  it('shows author, content and creation date for each post, in the given order', () => {
    render(<PostList posts={posts} />);
    const items = within(screen.getByRole('list', { name: 'Feed' })).getAllByRole('listitem');
    expect(items).toHaveLength(2);

    expect(items[0]).toHaveTextContent('@bob');
    expect(items[0]).toHaveTextContent('Second post');
    expect(items[0].querySelector('time')).toHaveAttribute('datetime', posts[0].createdAt);
    expect(items[1]).toHaveTextContent('@alice');
    expect(items[1]).toHaveTextContent('First post');
  });

  it('shows a friendly message when there are no posts', () => {
    render(<PostList posts={[]} />);
    expect(screen.getByText(/no posts yet/i)).toBeInTheDocument();
  });

  it('renders HTML in posts as literal text (NFR-05)', () => {
    const xss = '<img src=x onerror="alert(1)"><script>alert(1)</script>';
    const { container } = render(
      <PostList posts={[{ ...posts[0], content: xss }]} />,
    );
    expect(screen.getByText(xss)).toBeInTheDocument();
    expect(container.querySelector('script')).toBeNull();
    expect(container.querySelector('img[src="x"]')).toBeNull();
  });
});
