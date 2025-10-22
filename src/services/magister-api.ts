import { BrowserWindow, session } from "electron";
import { logger } from "../utils/logger";

export interface MagisterAuthData {
  token: string;
  refreshToken?: string;
  expiresAt: number;
  userInfo?: Record<string, unknown>;
}

export interface MagisterUserInfo {
  id: string;
  name: string;
  email?: string;
  class?: string;
}

export interface MagisterScheduleItem {
  id: string;
  title: string;
  start: string;
  end: string;
  location?: string;
  teacher?: string;
  subject?: string;
}

export interface MagisterTodayInfo {
  schedule: MagisterScheduleItem[];
  announcements?: string[];
  assignments?: string[];
}

export class MagisterAPI {
  private baseUrl = "https://merletcollege.magister.net";
  private authData: MagisterAuthData | null = null;

  constructor() {
    // Don't load stored auth in constructor, wait for app ready
  }

  /**
   * Opens a login window and handles the authentication flow
   */
  async authenticate(): Promise<MagisterAuthData | null> {
    return new Promise((resolve, reject) => {
      let isResolved = false;

      const authWindow = new BrowserWindow({
        width: 1000,
        height: 700,
        show: true,
        webPreferences: {
          nodeIntegration: false,
          contextIsolation: true,
          webSecurity: true,
        },
      });

      const resolveAuth = (data: MagisterAuthData | null) => {
        if (!isResolved) {
          isResolved = true;
          authWindow.close();
          if (data) {
            resolve(data);
          } else {
            reject(new Error("No authentication data found"));
          }
        }
      };

      const rejectAuth = (error: Error) => {
        if (!isResolved) {
          isResolved = true;
          authWindow.close();
          reject(error);
        }
      };

      // Load the Magister login page
      authWindow.loadURL(`${this.baseUrl}/op/#/vandaag`);

      // Add manual authentication and cancel buttons
      authWindow.webContents.on("dom-ready", () => {
        authWindow.webContents.executeJavaScript(`
          (function() {
            // Listen for cancel/extract auth messages
            window.addEventListener('message', function(event) {
              if (event.data.type === 'CANCEL_AUTH') {
                // Signal cancellation by setting a flag
                localStorage.setItem('__auth_cancelled__', 'true');
                window.close();
              } else if (event.data.type === 'EXTRACT_AUTH') {
                // Signal manual extraction
                localStorage.setItem('__manual_extract__', 'true');
                console.log('Manual extraction triggered - checking for tokens...');
              }
            });
            
            // Create a cancel button
            const cancelButton = document.createElement('button');
            cancelButton.innerHTML = '✕ Cancel Login';
            cancelButton.style.position = 'fixed';
            cancelButton.style.top = '10px';
            cancelButton.style.left = '10px';
            cancelButton.style.zIndex = '10000';
            cancelButton.style.padding = '10px 15px';
            cancelButton.style.backgroundColor = '#dc2626';
            cancelButton.style.color = 'white';
            cancelButton.style.border = 'none';
            cancelButton.style.borderRadius = '5px';
            cancelButton.style.cursor = 'pointer';
            cancelButton.style.fontSize = '14px';
            cancelButton.style.fontWeight = 'bold';
            
            cancelButton.onclick = function() {
              window.postMessage({ type: 'CANCEL_AUTH' }, '*');
            };
            
            document.body.appendChild(cancelButton);
            
            // Create a debug button
            const debugButton = document.createElement('button');
            debugButton.innerHTML = 'Extract Auth (Debug)';
            debugButton.style.position = 'fixed';
            debugButton.style.top = '10px';
            debugButton.style.right = '10px';
            debugButton.style.zIndex = '10000';
            debugButton.style.padding = '10px';
            debugButton.style.backgroundColor = '#007ACC';
            debugButton.style.color = 'white';
            debugButton.style.border = 'none';
            debugButton.style.borderRadius = '5px';
            debugButton.style.cursor = 'pointer';
            
            debugButton.onclick = function() {
              console.log('Extract Auth button clicked');
              window.postMessage({ type: 'EXTRACT_AUTH' }, '*');
              
              // Give visual feedback
              debugButton.innerHTML = 'Extracting...';
              debugButton.style.backgroundColor = '#fbbf24';
            };
            
            document.body.appendChild(debugButton);
          })();
        `);

        // Check for manual extraction trigger
        authWindow.webContents.executeJavaScript(`
          (function() {
            setInterval(function() {
              const manualExtract = localStorage.getItem('__manual_extract__');
              if (manualExtract === 'true') {
                localStorage.removeItem('__manual_extract__');
                console.log('Manual extraction flag detected');
                // This will be picked up by the main process
                document.title = 'EXTRACT_NOW';
              }
            }, 500);
          })();
        `);
      });

      // Listen for navigation events
      authWindow.webContents.on("did-navigate", async (event, url) => {
        // Check if we're on a page that might have authentication data
        if (
          url.includes("magister.net") &&
          !url.includes("/login") &&
          !url.includes("/auth")
        ) {
          setTimeout(async () => {
            try {
              const tokenData = await this.extractTokenFromBrowser(authWindow);
              if (tokenData) {
                this.authData = tokenData;
                await this.storeAuth(tokenData);
                resolveAuth(tokenData);
              }
            } catch (error) {
              logger.error("Error extracting token after navigation:", error);
            }
          }, 2000); // Wait 2 seconds for page to fully load
        }
      });

      // Listen for page load completion
      authWindow.webContents.on("did-finish-load", async () => {
        const currentUrl = authWindow.webContents.getURL();

        // Try token extraction on page load
        if (
          currentUrl.includes("magister.net") &&
          !currentUrl.includes("/login")
        ) {
          setTimeout(async () => {
            try {
              const tokenData = await this.extractTokenFromBrowser(authWindow);
              if (tokenData) {
                this.authData = tokenData;
                await this.storeAuth(tokenData);
                resolveAuth(tokenData);
              }
            } catch (error) {
              logger.error("Error extracting token on page load:", error);
            }
          }, 1000);
        }
      });

      // Listen for manual extraction trigger (via page title change)
      authWindow.webContents.on("page-title-updated", async (event, title) => {
        if (title === "EXTRACT_NOW") {
          logger.debug("Manual extraction triggered via title");
          try {
            const tokenData = await this.extractTokenFromBrowser(authWindow);
            if (tokenData) {
              this.authData = tokenData;
              await this.storeAuth(tokenData);
              resolveAuth(tokenData);
            } else {
              logger.error("No token found during manual extraction");
            }
          } catch (error) {
            logger.error("Error during manual extraction:", error);
          }
        }
      });

      // Handle window closed by user
      authWindow.on("closed", async () => {
        if (!isResolved) {
          // Check if it was cancelled by the user via the cancel button
          try {
            const wasCancelled = await authWindow.webContents
              .executeJavaScript(`localStorage.getItem('__auth_cancelled__')`)
              .catch(() => null);

            if (wasCancelled === "true") {
              rejectAuth(new Error("Login cancelled by user"));
            } else {
              rejectAuth(new Error("Authentication window was closed"));
            }
          } catch {
            rejectAuth(new Error("Authentication window was closed"));
          }
        }
      });

      // Set a timeout for authentication
      setTimeout(() => {
        if (!isResolved) {
          rejectAuth(new Error("Authentication timeout - please try again"));
        }
      }, 300000); // 5 minutes timeout
    });
  }

  /**
   * Extracts JWT token from the browser session
   */
  private async extractTokenFromBrowser(
    window: BrowserWindow,
  ): Promise<MagisterAuthData | null> {
    try {
      // Execute JavaScript in the renderer to get tokens from various sources
      const result = await window.webContents.executeJavaScript(`
        (function() {
          // Check all possible localStorage keys
          const localStorageKeys = Object.keys(localStorage);
          
          const localStorageToken = localStorage.getItem('access_token') || 
                                   localStorage.getItem('token') ||
                                   localStorage.getItem('jwt') ||
                                   localStorage.getItem('authToken') ||
                                   localStorage.getItem('auth_token') ||
                                   localStorage.getItem('accessToken') ||
                                   localStorage.getItem('magister_token') ||
                                   localStorage.getItem('bearer_token');
          
          // Check sessionStorage
          const sessionStorageKeys = Object.keys(sessionStorage);
          
          const sessionStorageToken = sessionStorage.getItem('access_token') || 
                                     sessionStorage.getItem('token') ||
                                     sessionStorage.getItem('jwt') ||
                                     sessionStorage.getItem('authToken') ||
                                     sessionStorage.getItem('auth_token') ||
                                     sessionStorage.getItem('accessToken') ||
                                     sessionStorage.getItem('magister_token') ||
                                     sessionStorage.getItem('bearer_token');

          // Check cookies
          const cookies = document.cookie;
          
          // Look for JWT patterns in cookies
          const jwtPattern = /[a-zA-Z0-9_-]{20,}\\.[a-zA-Z0-9_-]{20,}\\.[a-zA-Z0-9_-]{20,}/g;
          const potentialTokens = cookies.match(jwtPattern) || [];
          
          // Check for tokens in all localStorage values
          const allLocalStorageTokens = [];
          for (const key of localStorageKeys) {
            const value = localStorage.getItem(key);
            if (value && jwtPattern.test(value)) {
              allLocalStorageTokens.push({ key, value });
            }
          }
          
          // Check for tokens in all sessionStorage values
          const allSessionStorageTokens = [];
          for (const key of sessionStorageKeys) {
            const value = sessionStorage.getItem(key);
            if (value && jwtPattern.test(value)) {
              allSessionStorageTokens.push({ key, value });
            }
          }
          
          // Check if we can access any authentication objects in the global scope
          let authObject = null;
          try {
            // Common authentication object names
            authObject = window.auth || window.authentication || window.user || window.currentUser;
          } catch (e) {
            // No global auth object available
          }
          
          return {
            localStorage: localStorageToken,
            sessionStorage: sessionStorageToken,
            cookies: cookies,
            potentialTokens: potentialTokens,
            allLocalStorageTokens: allLocalStorageTokens,
            allSessionStorageTokens: allSessionStorageTokens,
            authObject: authObject,
            url: window.location.href,
            localStorageKeys: localStorageKeys,
            sessionStorageKeys: sessionStorageKeys
          };
        })()
      `);

      // Try to find a valid JWT token from various sources
      let token = result.localStorage || result.sessionStorage;

      // If no direct token found, try from discovered tokens
      if (
        !token &&
        result.allLocalStorageTokens &&
        result.allLocalStorageTokens.length > 0
      ) {
        token = result.allLocalStorageTokens[0].value;
      }

      if (
        !token &&
        result.allSessionStorageTokens &&
        result.allSessionStorageTokens.length > 0
      ) {
        // Check if this is an OIDC token structure
        const sessionValue = result.allSessionStorageTokens[0].value;

        try {
          // Try to parse as JSON (OIDC structure)
          const oidcData = JSON.parse(sessionValue);
          if (oidcData.access_token) {
            token = oidcData.access_token;
          } else if (oidcData.id_token) {
            token = oidcData.id_token;
          } else {
            token = sessionValue;
          }
        } catch {
          // If not JSON, use as-is
          token = sessionValue;
        }
      }

      if (
        !token &&
        result.potentialTokens &&
        result.potentialTokens.length > 0
      ) {
        token = result.potentialTokens[0];
      }

      // Try to extract from auth object
      if (!token && result.authObject) {
        try {
          token =
            result.authObject.token ||
            result.authObject.accessToken ||
            result.authObject.jwt;
        } catch {
          // Could not extract token from auth object
        }
      }

      if (token) {
        return {
          token,
          expiresAt: Date.now() + 24 * 60 * 60 * 1000, // Default 24 hours
        };
      }

      return null;
    } catch (error) {
      logger.error("Error extracting token from browser:", error);
      return null;
    }
  }

  /**
   * Makes an authenticated request to the Magister API
   */
  async makeAuthenticatedRequest(
    endpoint: string,
    options: RequestInit = {},
  ): Promise<unknown> {
    if (!this.authData || this.isTokenExpired()) {
      throw new Error("Not authenticated or token expired");
    }

    const url = endpoint.startsWith("http")
      ? endpoint
      : `${this.baseUrl}${endpoint}`;

    logger.debug(`Making API request to: ${url}`);

    const response = await fetch(url, {
      ...options,
      headers: {
        Authorization: `Bearer ${this.authData.token}`,
        "Content-Type": "application/json",
        Accept: "application/json",
        ...options.headers,
      },
    });

    logger.debug(`API Response: ${response.status} ${response.statusText}`);

    if (!response.ok) {
      const responseText = await response.text();
      logger.debug(`API Error Response: ${responseText}`);
      throw new Error(
        `API request failed: ${response.status} ${response.statusText} - ${responseText}`,
      );
    }

    const responseData = await response.json();
    logger.debug("API Response Data:", responseData);
    return responseData;
  }

  /**
   * Get today's schedule/information
   */
  async getTodayInfo(): Promise<MagisterTodayInfo> {
    try {
      // Get today's date in the format Magister expects
      const today = new Date();
      const dateStr = today.toISOString().split("T")[0];

      // Test the known working endpoint first to verify API access
      logger.debug("Testing known working endpoint first...");
      try {
        const testResponse = await this.makeAuthenticatedRequest(
          "/api/leerlingen/zoeken?q=**&top=1&skip=0&orderby=roepnaam%20asc&peildatum=2025-08-01&velden=stamnummer&velden=naam",
        );
        logger.debug("Test endpoint successful! API access confirmed.");
        logger.debug("Test response:", testResponse);
      } catch (error) {
        logger.debug("Test endpoint failed:", error);
      }

      // Try schedule/agenda endpoints based on the working API pattern
      const endpoints = [
        `/api/leerlingen/afspraken?vanaf=${dateStr}&tot=${dateStr}`,
        `/api/leerlingen/agenda?vanaf=${dateStr}&tot=${dateStr}`,
        `/api/leerlingen/rooster?vanaf=${dateStr}&tot=${dateStr}`,
        `/api/personen/leerling/afspraken?vanaf=${dateStr}&tot=${dateStr}`,
        `/api/personen/leerling/agenda?vanaf=${dateStr}&tot=${dateStr}`,
        `/api/personen/leerling/rooster?vanaf=${dateStr}&tot=${dateStr}`,
        `/api/agenda?vanaf=${dateStr}&tot=${dateStr}`,
        `/api/afspraken?vanaf=${dateStr}&tot=${dateStr}`,
        `/api/rooster?vanaf=${dateStr}&tot=${dateStr}`,
      ];

      for (const endpoint of endpoints) {
        try {
          const data = await this.makeAuthenticatedRequest(endpoint);
          return data as MagisterTodayInfo;
        } catch {
          logger.debug(`Endpoint ${endpoint} failed, trying next...`);
        }
      }

      throw new Error("No working endpoints found");
    } catch (error) {
      logger.error("Error fetching today info:", error);
      throw error;
    }
  }

  /**
   * Get user profile information
   */
  async getUserInfo(): Promise<MagisterUserInfo> {
    try {
      // Test the search endpoint to get current user info
      logger.debug("Testing user search endpoint...");
      try {
        const searchResponse = await this.makeAuthenticatedRequest(
          "/api/leerlingen/zoeken?q=**&top=10&skip=0&orderby=roepnaam%20asc&peildatum=2025-08-01&velden=stamnummer&velden=naam&velden=klassen&velden=emailadres",
        );
        logger.debug("User search successful:", searchResponse);

        // Try to extract current user from search results
        const searchData = searchResponse as { items?: unknown[] };
        if (
          searchData &&
          Array.isArray(searchData.items) &&
          searchData.items.length > 0
        ) {
          // For now, return the first user (this might need refinement)
          const user = searchData.items[0] as Record<string, unknown>;
          return {
            id: (user.stamnummer as string) || (user.id as string) || "unknown",
            name:
              ((user.naam as Record<string, unknown>)
                ?.volledigeNaam as string) ||
              (user.roepnaam as string) ||
              "Unknown User",
            email: user.emailadres as string,
            class:
              (user.klassen as unknown[]) &&
              (user.klassen as unknown[]).length > 0
                ? ((user.klassen as Record<string, unknown>[])[0]
                    .naam as string)
                : undefined,
          } as MagisterUserInfo;
        }
      } catch (error) {
        logger.debug("User search endpoint failed:", error);
      }

      // Try other user info endpoints
      const endpoints = [
        "/api/leerlingen/me",
        "/api/personen/leerling",
        "/api/account/me",
        "/api/leerling/me",
        "/api/personen/leerling/basisprofiel",
        "/api/personen/leerling/profiel",
      ];

      for (const endpoint of endpoints) {
        try {
          const data = await this.makeAuthenticatedRequest(endpoint);
          return data as MagisterUserInfo;
        } catch {
          logger.debug(`Endpoint ${endpoint} failed, trying next...`);
        }
      }

      throw new Error("No working user info endpoints found");
    } catch (error) {
      logger.error("Error fetching user info:", error);
      throw error;
    }
  }

  /**
   * Check if the current token is expired
   */
  private isTokenExpired(): boolean {
    return !this.authData || Date.now() > this.authData.expiresAt;
  }

  /**
   * Store authentication data securely
   */
  private async storeAuth(authData: MagisterAuthData): Promise<void> {
    try {
      // In a real app, you'd want to encrypt this data
      await session.defaultSession.cookies.set({
        url: "https://local-storage",
        name: "magister_auth",
        value: JSON.stringify(authData),
        secure: true,
        httpOnly: true,
      });
    } catch (error) {
      logger.error("Error storing auth data:", error);
    }
  }

  /**
   * Load stored authentication data
   */
  private async loadStoredAuth(): Promise<void> {
    try {
      const cookies = await session.defaultSession.cookies.get({
        url: "https://local-storage",
        name: "magister_auth",
      });

      if (cookies.length > 0) {
        const authData = JSON.parse(cookies[0].value);
        if (!this.isTokenExpiredForData(authData)) {
          this.authData = authData;
        }
      }
    } catch (error) {
      logger.error("Error loading stored auth:", error);
    }
  }

  private isTokenExpiredForData(authData: MagisterAuthData): boolean {
    return Date.now() > authData.expiresAt;
  }

  /**
   * Clear stored authentication data
   */
  async logout(): Promise<void> {
    this.authData = null;
    try {
      await session.defaultSession.cookies.remove(
        "https://local-storage",
        "magister_auth",
      );
    } catch (error) {
      logger.error("Error clearing auth data:", error);
    }
  }

  /**
   * Test API connectivity with known working endpoint (limited to 5 students)
   */
  async testAPI(): Promise<{
    success: boolean;
    data?: unknown;
    error?: string;
  }> {
    try {
      logger.debug("Testing Magister API connectivity...");
      const response = await this.makeAuthenticatedRequest(
        "/api/leerlingen/zoeken?q=**&top=5&skip=0&orderby=roepnaam%20asc&peildatum=2025-08-01&velden=stamnummer&velden=naam&velden=klassen&velden=emailadres",
      );
      return { success: true, data: response };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : "API test failed",
      };
    }
  }

  /**
   * Fetch all students from the API
   */
  async getAllStudents(): Promise<{
    success: boolean;
    data?: unknown;
    error?: string;
  }> {
    try {
      logger.debug("Fetching all students from Magister API...");
      // Fetch all students by setting top to a high number (the API showed totalCount: 146)
      const response = await this.makeAuthenticatedRequest(
        "/api/leerlingen/zoeken?q=**&top=200&skip=0&orderby=roepnaam%20asc&peildatum=2025-08-01&velden=stamnummer&velden=naam&velden=klassen&velden=emailadres",
      );
      const responseData = response as { items?: unknown[] };
      logger.debug(
        `Successfully fetched ${responseData.items?.length || 0} students from API`,
      );
      return { success: true, data: response };
    } catch (error) {
      return {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : "Failed to fetch all students",
      };
    }
  }

  /**
   * Check if user is currently authenticated
   */
  async isAuthenticated(): Promise<boolean> {
    // Load stored auth if not already loaded
    if (this.authData === null) {
      await this.loadStoredAuth();
    }
    return this.authData !== null && !this.isTokenExpired();
  }

  /**
   * Fetch student photo with authentication
   */
  async fetchStudentPhoto(
    studentId: number,
  ): Promise<{ success: boolean; data?: string; error?: string }> {
    try {
      if (!this.authData || !this.authData.token) {
        return { success: false, error: "Not authenticated" };
      }

      const url = `${this.baseUrl}/api/leerlingen/${studentId}/foto?redirect_type=body`;
      logger.debug(`Fetching student photo: ${url}`);

      const response = await fetch(url, {
        headers: {
          Authorization: `Bearer ${this.authData.token}`,
          Accept: "image/*",
        },
      });

      if (!response.ok) {
        logger.debug(
          `Photo fetch failed: ${response.status} ${response.statusText}`,
        );
        return {
          success: false,
          error: `Failed to fetch photo: ${response.status}`,
        };
      }

      // Convert response to base64 data URL (works across Electron processes)
      const blob = await response.blob();
      const arrayBuffer = await blob.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);
      const base64 = buffer.toString("base64");
      const mimeType = blob.type || "image/jpeg"; // fallback to jpeg
      const dataUrl = `data:${mimeType};base64,${base64}`;

      logger.debug(
        `Successfully fetched photo for student ${studentId} (${mimeType}, ${buffer.length} bytes)`,
      );
      return { success: true, data: dataUrl };
    } catch (error) {
      logger.error("Error fetching student photo:", error);
      return {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      };
    }
  }

  /**
   * Clear all authentication data and session
   */
  async clearToken(): Promise<void> {
    logger.debug("Clearing authentication token and session data...");

    this.authData = null;

    // Clear from localStorage
    try {
      localStorage.removeItem("magister_auth");
      logger.debug("Cleared authentication data from localStorage");
    } catch (error) {
      logger.warn("Failed to clear localStorage:", error);
    }

    // Clear any session data
    try {
      const defaultSession = session.defaultSession;
      await defaultSession.clearStorageData({
        storages: ["cookies", "localstorage"],
        origin: "https://merletcollege.magister.net",
      });
      logger.debug("Cleared Magister session data");
    } catch (error) {
      logger.warn("Failed to clear session data:", error);
    }
  }
}

// Export singleton instance (created lazily)
let _magisterAPI: MagisterAPI | null = null;

export const magisterAPI = {
  get instance(): MagisterAPI {
    if (!_magisterAPI) {
      _magisterAPI = new MagisterAPI();
    }
    return _magisterAPI;
  },
};
