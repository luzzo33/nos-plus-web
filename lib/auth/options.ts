import type { NextAuthOptions, Session } from 'next-auth';
import CredentialsProvider from 'next-auth/providers/credentials';
import { getNosApiBase } from '@/lib/api/monitorConfig';
import type { JWT } from 'next-auth/jwt';

const NOS_API_BASE = getNosApiBase();

type LoginResponse = {
  success: boolean;
  token: string;
  user: {
    id: string | number;
    email: string;
    status: string;
  };
};

type AuthorizedUser = {
  id: string;
  email: string;
  status: string;
  token: string;
};

type TokenWithExtras = JWT & {
  status?: string;
  accessToken?: string;
};

type SessionWithExtras = Session & {
  accessToken?: string;
  user?: Session['user'] & {
    id?: string;
    status?: string;
  };
};

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null;

const isLoginResponse = (value: unknown): value is LoginResponse => {
  if (!isRecord(value)) return false;
  if (typeof value.success !== 'boolean' || typeof value.token !== 'string') return false;
  if (!isRecord(value.user)) return false;
  const { id, email, status } = value.user;
  const validId = typeof id === 'string' || typeof id === 'number';
  return validId && typeof email === 'string' && typeof status === 'string';
};

const isAuthorizedUser = (value: unknown): value is AuthorizedUser => {
  if (!isRecord(value)) return false;
  const { id, email, status, token } = value;
  return (
    typeof id === 'string' &&
    typeof email === 'string' &&
    typeof status === 'string' &&
    typeof token === 'string'
  );
};

async function loginRequest(email: string, password: string): Promise<LoginResponse> {
  const res = await fetch(`${NOS_API_BASE}/v1/auth/login`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ email, password }),
  });

  if (!res.ok) {
    const error = (await res.json().catch(() => ({ error: { code: 'LOGIN_FAILED' } }))) as unknown;
    const message =
      isRecord(error) && isRecord(error.error) && typeof error.error.code === 'string'
        ? error.error.code
        : 'LOGIN_FAILED';
    throw new Error(message);
  }
  const data = (await res.json()) as unknown;
  if (!isLoginResponse(data)) {
    throw new Error('LOGIN_FAILED');
  }
  return data;
}

export const authOptions: NextAuthOptions = {
  providers: [
    CredentialsProvider({
      name: 'Credentials',
      credentials: {
        email: { label: 'Email', type: 'email' },
        password: { label: 'Password', type: 'password' },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          throw new Error('CREDENTIALS_REQUIRED');
        }
        const { success, token, user } = await loginRequest(
          credentials.email,
          credentials.password,
        );
        if (!success || !token || !user) {
          return null;
        }
        if (user.status !== 'active') {
          throw new Error('EMAIL_NOT_VERIFIED');
        }
        return {
          id: String(user.id),
          email: user.email,
          status: user.status,
          token,
        } satisfies AuthorizedUser;
      },
    }),
  ],
  session: {
    strategy: 'jwt',
  },
  callbacks: {
    async jwt({ token, user }): Promise<TokenWithExtras> {
      const enrichedToken: TokenWithExtras = { ...token };
      if (user && isAuthorizedUser(user)) {
        enrichedToken.sub = user.id;
        enrichedToken.email = user.email;
        enrichedToken.status = user.status;
        enrichedToken.accessToken = user.token;
      }
      return enrichedToken;
    },
    async session({ session, token }): Promise<SessionWithExtras> {
      const tokenWithExtras = token as TokenWithExtras;
      const sessionWithExtras: SessionWithExtras = {
        ...session,
        user: session.user
          ? {
              ...session.user,
              id: typeof token.sub === 'string' ? token.sub : session.user.id,
              email: typeof token.email === 'string' ? token.email : session.user.email,
              status:
                typeof tokenWithExtras.status === 'string' ? tokenWithExtras.status : undefined,
            }
          : session.user,
        accessToken:
          typeof tokenWithExtras.accessToken === 'string' ? tokenWithExtras.accessToken : undefined,
      };

      return sessionWithExtras;
    },
  },
  pages: {
    signIn: '/auth/login',
  },
};
