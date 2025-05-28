import { NextAuthOptions} from 'next-auth'
import GoogleProvider from 'next-auth/providers/google'

declare module 'next-auth' {
  interface Session {
    accessToken?: string
    user: {
      id?: string
      googleId?: string
      name?: string | null
      email?: string | null
      image?: string | null
    }
  }
}

export const authOptions: NextAuthOptions = {
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
      authorization: {
        params: {
          scope: 'openid email profile'
        }
      }
    })
  ],
  callbacks: {
    async jwt({ token, account, user }) {
      // Save the access token and refresh token on first login
      if (account && user) {
        token.accessToken = account.access_token
        token.refreshToken = account.refresh_token
        token.googleId = account.providerAccountId
      }
      return token
    },
    async session({ session, token }) {
      // Send properties to the client
      session.accessToken = token.accessToken as string
      session.user.googleId = token.googleId as string
      session.user.id = token.sub as string
      return session
    },
    async redirect({ url, baseUrl }) {
      // Redirect to dashboard after login
      if (url.startsWith('/')) return `${baseUrl}${url}`
      else if (new URL(url).origin === baseUrl) return url
      return `${baseUrl}/dashboard`
    }
  },
  pages: {
    signIn: '/auth/signin',
    error: '/auth/error'
  },
  session: {
    strategy: 'jwt'
  }
}