/**
 * electron/services/telegramService.ts
 * 
 * Core Telegram service - handles authentication and client management
 */

import { TelegramClient, sessions, errors } from 'telegram'
import { Api } from 'telegram'
import QRCode from 'qrcode'
const { StringSession } = sessions

export type AuthStatus =
  | 'idle'
  | 'restoring'
  | 'connecting'
  | 'qr_waiting'
  | 'qr_scanned'
  | 'waiting_for_phone'
  | 'waiting_for_code'
  | 'waiting_for_password'
  | 'authenticated'
  | 'expired'
  | 'error'

export interface AuthState {
  status: AuthStatus
  error?: string
  phoneNumber?: string
  qrCode?: string // base64 QR code image
}

export interface SessionData {
  session: string
  phoneNumber?: string
}

export class TelegramService {
  // Created ONCE in constructor — never recreated during QR / phone flows
  private readonly client: TelegramClient
  private connectPromise: Promise<boolean> | null = null

  private apiId: number
  private apiHash: string
  private authState: AuthState = { status: 'idle' }
  private statusCallback?: (state: AuthState) => void

  // Auth flow resolvers
  private phoneResolver: ((phone: string) => void) | null = null
  private codeResolver: ((code: string) => void) | null = null
  private passwordResolver: ((password: string) => void) | null = null

  // QR Login
  private qrLoginTimer: NodeJS.Timeout | null = null
  private qrPollingTimer: NodeJS.Timeout | null = null
  private qrToken: Buffer | null = null

  /**
   * @param apiId   Telegram API id
   * @param apiHash Telegram API hash
   * @param sessionStr Optional saved session string — loaded at construction so
   *                   connect() reuses it without creating a second client.
   */
  constructor(apiId: number, apiHash: string, sessionStr: string = '') {
    this.apiId = apiId
    this.apiHash = apiHash
    // Single TelegramClient for the entire app lifetime
    this.client = new TelegramClient(
      new StringSession(sessionStr),
      apiId,
      apiHash,
      { connectionRetries: 5 }
    )
  }
  
  /**
   * Set callback for auth status changes
   */
  onStatusChange(callback: (state: AuthState) => void): void {
    this.statusCallback = callback
  }
  
  /**
   * Update auth status and notify
   */
  private setAuthStatus(status: AuthStatus, error?: string, extras?: Partial<AuthState>): void {
    this.authState = {
      status,
      error,
      ...extras
    }
    
    if (this.statusCallback) {
      this.statusCallback(this.authState)
    }
  }
  
  /**
   * Get current auth state
   */
  getAuthState(): AuthState {
    return this.authState
  }
  
  /**
   * Get active client (throws if not authenticated)
   */
  getClient(): TelegramClient {
    if (this.authState.status !== 'authenticated') {
      throw new Error('Not authenticated. Please login first.')
    }
    return this.client
  }

  /**
   * Check if client is authenticated
   */
  isAuthenticated(): boolean {
    return this.authState.status === 'authenticated'
  }

  /**
   * Connect to Telegram exactly once per app launch.
   * Subsequent calls are no-ops — they await the same promise.
   */
  private ensureConnected(): Promise<boolean> {
    if (!this.connectPromise) {
      this.connectPromise = this.client.connect()
    }
    return this.connectPromise!
  }

  /**
   * Restore session from saved data.
   * The session string was already loaded into the client at construction time.
   * This method just verifies the session is still valid.
   */
  async restoreSession(sessionData: SessionData): Promise<boolean> {
    try {
      this.setAuthStatus('restoring')

      await this.ensureConnected()

      // Verify the session is still valid
      const me = await this.client.getMe()
      if (!me) {
        throw new Error('Invalid session')
      }

      this.setAuthStatus('authenticated', undefined, {
        phoneNumber: sessionData.phoneNumber
      })

      return true
    } catch (err) {
      // Don't null out this.client — the same client is reused for QR/phone login
      this.setAuthStatus('idle', 'Session expired. Please login again.')
      return false
    }
  }
  
  /**
   * Start QR Login flow
   */
  async startQRLogin(): Promise<void> {
    try {
      this.setAuthStatus('connecting')

      await this.ensureConnected()
      const client = this.client

      // Try to export login token
      try {
        const result = await client.invoke(
          new Api.auth.ExportLoginToken({
            apiId: this.apiId,
            apiHash: this.apiHash,
            exceptIds: [],
          })
        )

        if (result instanceof Api.auth.LoginTokenMigrateTo) {
          // Must switch to the correct DC before continuing
          await client._switchDC(result.dcId)

          // Re-export token from the new DC
          const migratedResult = await client.invoke(
            new Api.auth.ImportLoginToken({ token: result.token })
          )

          if (migratedResult instanceof Api.auth.LoginTokenSuccess) {
            this.setAuthStatus('authenticated')
            return
          }
          // If we got another token, continue with normal flow
          if ('token' in migratedResult) {
            this.qrToken = (migratedResult as any).token
          }
        } else if (result instanceof Api.auth.LoginToken) {
          this.qrToken = result.token
        } else if (result instanceof Api.auth.LoginTokenSuccess) {
          // Already authorized
          this.setAuthStatus('authenticated')
          return
        }

        if (this.qrToken) {
          // Convert token to base64url (RFC 4648) — Telegram requires tg://login?token=<base64url>
          const tokenBase64 = this.qrToken
            .toString('base64')
            .replace(/\+/g, '-')
            .replace(/\//g, '_')
            .replace(/=+$/, '')
          const qrUrl = `tg://login?token=${tokenBase64}`

          // Generate QR code as data URL
          const qrDataUrl = await QRCode.toDataURL(qrUrl, {
            width: 300,
            margin: 1,
            color: {
              dark: '#000000',
              light: '#ffffff'
            }
          })

          this.setAuthStatus('qr_waiting', undefined, { qrCode: qrDataUrl })

          // Start polling for QR scan
          this.startQRPolling()

          // Auto-refresh QR every 60 seconds
          this.qrLoginTimer = setInterval(() => {
            this.refreshQRCode()
          }, 60000)
        }
      } catch (qrErr) {
        // QR login not supported or failed, fallback to phone
        console.warn('QR login not available, falling back to phone login:', qrErr)
        await this.startPhoneLogin()
      }
    } catch (err) {
      const error = err instanceof Error ? err.message : String(err)
      this.setAuthStatus('error', error)
      throw err
    }
  }
  
  /**
   * Poll for QR code scan
   */
  private startQRPolling(): void {
    // Clear any existing polling timer
    if (this.qrPollingTimer) {
      clearInterval(this.qrPollingTimer)
    }

    this.qrPollingTimer = setInterval(async () => {
      if (!this.qrToken || this.authState.status !== 'qr_waiting') {
        return
      }

      const client = this.client!

      try {
        const result = await client.invoke(
          new Api.auth.ImportLoginToken({
            token: this.qrToken,
          })
        )

        if (result instanceof Api.auth.LoginTokenSuccess) {
          // Successfully logged in!
          this.stopQRPolling()
          this.setAuthStatus('authenticated')
          console.log('QR login successful, session saved')
        } else if (result instanceof Api.auth.LoginTokenMigrateTo) {
          // Must switch to the correct DC and re-import
          console.log(`QR login: migrating to DC ${result.dcId}`)
          await client._switchDC(result.dcId)

          // Re-import token on the new DC
          const migratedResult = await client.invoke(
            new Api.auth.ImportLoginToken({ token: result.token })
          )

          if (migratedResult instanceof Api.auth.LoginTokenSuccess) {
            this.stopQRPolling()
            this.setAuthStatus('authenticated')
            console.log('QR login successful after DC migration')
          }
        }
        // LoginToken response means still waiting — continue polling
      } catch (err: any) {
        const errMsg = err?.message || String(err)

        // SESSION_PASSWORD_NEEDED means 2FA is required
        if (errMsg.includes('SESSION_PASSWORD_NEEDED')) {
          this.stopQRPolling()
          this.setAuthStatus('waiting_for_password')
        } else if (errMsg.includes('AUTH_TOKEN_EXPIRED') || errMsg.includes('AUTH_TOKEN_INVALID')) {
          // Token expired, refresh QR
          console.log('QR token expired, refreshing...')
          await this.refreshQRCode()
        } else {
          // Continue polling on other errors
          console.log('QR poll error (continuing):', errMsg)
        }
      }
    }, 2000)
  }
  
  /**
   * Refresh QR code
   */
  private async refreshQRCode(): Promise<void> {
    try {
      const client = this.client!
      const result = await client.invoke(
        new Api.auth.ExportLoginToken({
          apiId: this.apiId,
          apiHash: this.apiHash,
          exceptIds: [],
        })
      )

      if (result instanceof Api.auth.LoginTokenMigrateTo) {
        // Switch DC and re-import
        await client._switchDC(result.dcId)
        const migratedResult = await client.invoke(
          new Api.auth.ImportLoginToken({ token: result.token })
        )
        if (migratedResult instanceof Api.auth.LoginTokenSuccess) {
          this.stopQRPolling()
          this.setAuthStatus('authenticated')
          return
        }
      } else if (result instanceof Api.auth.LoginToken) {
        this.qrToken = result.token
        const tokenBase64 = result.token
          .toString('base64')
          .replace(/\+/g, '-')
          .replace(/\//g, '_')
          .replace(/=+$/, '')
        const qrUrl = `tg://login?token=${tokenBase64}`
        const qrDataUrl = await QRCode.toDataURL(qrUrl, { width: 300, margin: 1 })

        this.setAuthStatus('qr_waiting', undefined, { qrCode: qrDataUrl })
      } else if (result instanceof Api.auth.LoginTokenSuccess) {
        this.stopQRPolling()
        this.setAuthStatus('authenticated')
      }
    } catch (err) {
      console.error('Failed to refresh QR code:', err)
    }
  }
  
  /**
   * Stop QR polling
   */
  private stopQRPolling(): void {
    if (this.qrPollingTimer) {
      clearInterval(this.qrPollingTimer)
      this.qrPollingTimer = null
    }
    if (this.qrLoginTimer) {
      clearInterval(this.qrLoginTimer)
      this.qrLoginTimer = null
    }
    this.qrToken = null
  }
  
  /**
   * Start phone login flow (fallback)
   */
  async startPhoneLogin(): Promise<void> {
    try {
      // Stop any ongoing QR login
      this.stopQRPolling()

      this.setAuthStatus('connecting')

      await this.ensureConnected()
      const client = this.client

      // Start interactive auth
      await client.start({
        phoneNumber: async () => {
          return new Promise<string>((resolve) => {
            this.setAuthStatus('waiting_for_phone')
            this.phoneResolver = resolve
          })
        },
        password: async () => {
          return new Promise<string>((resolve) => {
            this.setAuthStatus('waiting_for_password')
            this.passwordResolver = resolve
          })
        },
        phoneCode: async () => {
          return new Promise<string>((resolve) => {
            this.setAuthStatus('waiting_for_code')
            this.codeResolver = resolve
          })
        },
        onError: (err: Error) => {
          this.setAuthStatus('error', err.message)
        },
      })
      
      this.setAuthStatus('authenticated')
    } catch (err) {
      const error = err instanceof Error ? err.message : String(err)
      this.setAuthStatus('error', error)
      throw err
    }
  }

  /**
   * Submit phone number
   */
  submitPhone(phone: string): void {
    if (this.phoneResolver) {
      this.phoneResolver(phone)
      this.phoneResolver = null
    }
  }
  
  /**
   * Submit verification code
   */
  submitCode(code: string): void {
    if (this.codeResolver) {
      this.codeResolver(code)
      this.codeResolver = null
    }
  }
  
  /**
   * Submit 2FA password
   */
  submitPassword(password: string): void {
    if (this.passwordResolver) {
      this.passwordResolver(password)
      this.passwordResolver = null
    }
  }
  
  /**
   * Get current session string for saving
   */
  getSessionString(): string {
    return this.client.session.save() as unknown as string
  }
  
  /**
   * Logout and disconnect
   */
  async logout(): Promise<void> {
    this.stopQRPolling()

    try {
      await this.client.invoke(new Api.auth.LogOut())
      await this.client.disconnect()
    } catch (err) {
      console.error('Logout error:', err)
    }

    // Reset connect guard so next login flow reconnects cleanly
    this.connectPromise = null

    this.setAuthStatus('idle')
  }
  
  /**
   * Disconnect without logging out
   */
  async disconnect(): Promise<void> {
    this.stopQRPolling()
    try {
      await this.client.disconnect()
    } catch {
      // ignore
    }
  }
}
