import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import App from '../App';
import { AuthProvider } from '../AuthContext';

function jsonResponse(status: number, body: unknown) {
  return Promise.resolve(
    new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } }),
  );
}

function renderApp(path = '/') {
  return render(
    <MemoryRouter initialEntries={[path]} future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
      <AuthProvider>
        <App />
      </AuthProvider>
    </MemoryRouter>,
  );
}

afterEach(() => vi.restoreAllMocks());

describe('App routing and auth flow', () => {
  it('sends signed-out visitors to the sign-in page', async () => {
    vi.spyOn(globalThis, 'fetch').mockImplementation(() => jsonResponse(401, { error: 'Authentication required' }));
    renderApp('/');
    expect(await screen.findByRole('heading', { name: 'Sign in to Chirp' })).toBeInTheDocument();
  });

  it('shows the API error when sign-in fails (FR-04)', async () => {
    vi.spyOn(globalThis, 'fetch').mockImplementation((input) =>
      String(input).endsWith('/auth/login')
        ? jsonResponse(401, { error: 'Invalid username or password' })
        : jsonResponse(401, { error: 'Authentication required' }),
    );
    renderApp('/login');

    await userEvent.type(await screen.findByLabelText('Username'), 'alice');
    await userEvent.type(screen.getByLabelText('Password'), 'wrong-password');
    await userEvent.click(screen.getByRole('button', { name: 'Sign in' }));

    expect(await screen.findByRole('alert')).toHaveTextContent('Invalid username or password');
  });

  it('signs in, shows the feed, and signs out (FR-03, FR-05, FR-08)', async () => {
    const user = { id: 1, username: 'alice' };
    const feed = {
      posts: [{ id: 1, content: 'Hello world', createdAt: '2026-10-08T09:00:00.000Z', author: user }],
      nextCursor: null,
    };
    vi.spyOn(globalThis, 'fetch').mockImplementation((input) => {
      const url = String(input);
      if (url.endsWith('/auth/me')) return jsonResponse(401, { error: 'Authentication required' });
      if (url.endsWith('/auth/login')) return jsonResponse(200, { user });
      if (url.endsWith('/auth/logout')) return Promise.resolve(new Response(null, { status: 204 }));
      if (url.includes('/posts')) return jsonResponse(200, feed);
      return jsonResponse(404, {});
    });
    renderApp('/login');

    await userEvent.type(await screen.findByLabelText('Username'), 'alice');
    await userEvent.type(screen.getByLabelText('Password'), 'password123');
    await userEvent.click(screen.getByRole('button', { name: 'Sign in' }));

    expect(await screen.findByText('Hello world')).toBeInTheDocument();
    expect(screen.getByText('@alice', { selector: 'strong.post-author' })).toBeInTheDocument();

    await userEvent.click(screen.getByRole('button', { name: 'Sign out' }));
    expect(await screen.findByRole('heading', { name: 'Sign in to Chirp' })).toBeInTheDocument();
  });
});
