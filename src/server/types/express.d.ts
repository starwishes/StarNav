import type { AuthenticatedUser } from '../middleware/auth.js'

declare global {
  namespace Express {
    interface Request {
      user?: AuthenticatedUser
      authToken?: string
      authTokenSource?: 'bearer' | 'cookie' | null
    }
  }
}

export {}
