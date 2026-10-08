import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ApiError, type Post } from '../api';
import PostComposer from '../components/PostComposer';

const fakePost: Post = {
  id: 1,
  content: 'hi',
  createdAt: new Date().toISOString(),
  author: { id: 1, username: 'alice' },
};

describe('PostComposer (FR-06, FR-07)', () => {
  it('disables Post when empty and shows the remaining characters', async () => {
    render(<PostComposer onSubmit={vi.fn()} />);
    expect(screen.getByRole('button', { name: 'Post' })).toBeDisabled();
    expect(screen.getByText('280 characters left')).toBeInTheDocument();

    await userEvent.type(screen.getByLabelText(/what's happening/i), 'Hello');
    expect(screen.getByText('275 characters left')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Post' })).toBeEnabled();
  });

  it('disables Post for whitespace only and for more than 280 characters', async () => {
    render(<PostComposer onSubmit={vi.fn()} />);
    const box = screen.getByLabelText(/what's happening/i);

    await userEvent.type(box, '    ');
    expect(screen.getByRole('button', { name: 'Post' })).toBeDisabled();

    await userEvent.clear(box);
    await userEvent.click(box);
    await userEvent.paste('a'.repeat(281));
    expect(screen.getByText('-1 characters left')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Post' })).toBeDisabled();
  });

  it('submits trimmed content and clears the box on success', async () => {
    const onSubmit = vi.fn().mockResolvedValue(fakePost);
    render(<PostComposer onSubmit={onSubmit} />);
    const box = screen.getByLabelText(/what's happening/i);

    await userEvent.type(box, '  Hello Chirp  ');
    await userEvent.click(screen.getByRole('button', { name: 'Post' }));

    expect(onSubmit).toHaveBeenCalledWith('Hello Chirp');
    expect(box).toHaveValue('');
  });

  it('shows the error and keeps the text when publishing fails', async () => {
    const onSubmit = vi.fn().mockRejectedValue(new ApiError(400, 'Post cannot be empty'));
    render(<PostComposer onSubmit={onSubmit} />);
    const box = screen.getByLabelText(/what's happening/i);

    await userEvent.type(box, 'Keep me');
    await userEvent.click(screen.getByRole('button', { name: 'Post' }));

    expect(await screen.findByRole('alert')).toHaveTextContent('Post cannot be empty');
    expect(box).toHaveValue('Keep me');
  });
});
