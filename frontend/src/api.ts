export interface User {
  id: number;
  username: string;
}

export interface Post {
  id: number;
  content: string;
  createdAt: string;
  author: User;
}

export interface FeedPage {
  posts: Post[];
  nextCursor: string | null;
}

export const MAX_POST_LENGTH = 280;

export class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
    public fields: Record<string, string> = {},
  ) {
    super(message);
  }
}

async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
  const res = await fetch(`/api${path}`, {
    ...init,
    credentials: 'include',
    headers: { 'Content-Type': 'application/json', ...init.headers },
  });
  if (res.status === 204) return undefined as T;

  const body = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new ApiError(res.status, body.error ?? `Request failed (${res.status})`, body.fields);
  }
  return body as T;
}

export const api = {
  me: () => request<{ user: User }>('/auth/me'),
  register: (username: string, password: string) =>
    request<{ user: User }>('/auth/register', {
      method: 'POST',
      body: JSON.stringify({ username, password }),
    }),
  login: (username: string, password: string) =>
    request<{ user: User }>('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ username, password }),
    }),
  logout: () => request<void>('/auth/logout', { method: 'POST' }),
  feed: (cursor?: string) =>
    request<FeedPage>(`/posts${cursor ? `?cursor=${encodeURIComponent(cursor)}` : ''}`),
  createPost: (content: string) =>
    request<{ post: Post }>('/posts', { method: 'POST', body: JSON.stringify({ content }) }),
};
