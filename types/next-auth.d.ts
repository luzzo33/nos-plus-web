import 'next-auth';

declare module 'next-auth' {
  interface Session {
    user: {
      id: string;
      email: string;
      status?: string;
    };
    accessToken?: string;
  }

  interface User {
    id: string;
    email: string;
    status?: string;
    token?: string;
  }
}

declare module 'next-auth/jwt' {
  interface JWT {
    accessToken?: string;
    status?: string;
  }
}
