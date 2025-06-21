import { NextAuthOptions } from 'next-auth';
import GoogleProvider from 'next-auth/providers/google';
import { JWT } from 'next-auth/jwt';

declare module 'next-auth' {
  interface Session {
    accessToken?: string;
    refreshToken?: string;
    expiresAt?: number;
    user: {
      id?: string;
      googleId?: string;
      name?: string | null;
      email?: string | null;
      image?: string | null;
      backendId?: string;
    };
  }
}

declare module 'next-auth/jwt' {
  interface JWT {
    accessToken?: string;
    refreshToken?: string;
    expiresAt?: number;
    backendId?: string;
    googleId?: string;
  }
}

// Function to refresh the token
async function refreshAccessToken(token: JWT) {
  try {
    const response = await fetch(
      `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'}/api/auth/refresh`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          refreshToken: token.refreshToken,
        }),
      }
    );

    const refreshedTokens = await response.json();

    if (!response.ok) {
      throw refreshedTokens;
    }

    return {
      ...token,
      accessToken: refreshedTokens.accessToken,
      refreshToken: refreshedTokens.refreshToken,
      expiresAt: Date.now() + refreshedTokens.expiresIn * 1000,
    };
  } catch (error) {
    console.error('Error refreshing access token:', error);

    // The error property will be used client-side to handle the refresh token error
    return {
      ...token,
      error: 'RefreshAccessTokenError',
    };
  }
}

export const authOptions: NextAuthOptions = {
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
      authorization: {
        params: {
          scope: 'openid email profile',
        },
      },
    }),
  ],
  callbacks: {
    async jwt({ token, account, user }) {
      // Initial sign in
      if (account && user) {
        if (account.access_token) token.accessToken = account.access_token;
        if (account.refresh_token) token.refreshToken = account.refresh_token;
        token.googleId = account.providerAccountId;

        // Sync with backend
        if (account.access_token) {
          try {
            // Call your backend to register/update the user
            const response = await fetch(
              `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'}/api/auth/sync`,
              {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                  googleId: account.providerAccountId,
                  email: user.email,
                  name: user.name,
                  picture: user.image,
                }),
              }
            );

            if (response.ok) {
              const data = await response.json();
              // Store backend tokens and expiry
              token.accessToken = data.accessToken;
              token.refreshToken = data.refreshToken;
              token.expiresAt = Date.now() + data.expiresIn * 1000;
              token.backendId = data.userId;
            }
          } catch (error) {
            console.error('Error syncing with backend:', error);
            // Continue even if backend sync fails
          }
        }

        return token;
      }

      // Return previous token if the access token has not expired yet
      if (token.expiresAt && Date.now() < token.expiresAt) {
        return token;
      }

      // Access token has expired, try to refresh it
      return refreshAccessToken(token);
    },
    async session({ session, token }) {
      // Send properties to the client
      if (token.accessToken) session.accessToken = token.accessToken;
      if (token.refreshToken) session.refreshToken = token.refreshToken;
      if (token.expiresAt) session.expiresAt = token.expiresAt;
      session.user.googleId = token.googleId as string;
      session.user.id = token.sub as string;

      // Include backend ID if available
      if (token.backendId) {
        session.user.backendId = token.backendId as string;
      }

      // Forward the error to the client for handling
      if (token.error) {
        // @ts-ignore
        session.error = token.error;
      }

      return session;
    },
    async redirect({ url, baseUrl }) {
      // Redirect to dashboard after login
      if (url.startsWith('/')) return `${baseUrl}${url}`;
      else if (new URL(url).origin === baseUrl) return url;
      return `${baseUrl}/dashboard`;
    },
  },
  pages: {
    signIn: '/auth/signin',
    error: '/auth/error',
  },
  session: {
    strategy: 'jwt',
    maxAge: 7 * 24 * 60 * 60, // 7 days
  },
};
