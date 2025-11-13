/**
 * Exam.net API Service
 * Handles authentication and data fetching from exam.net using Electron BrowserWindow
 *
 * APPROACH:
 * - Opens a visible BrowserWindow for login (like Magister)
 * - User logs in manually in the browser window
 * - Captures session cookies after successful login
 * - Uses the cookies to fetch and parse server-rendered data
 *
 * How it works:
 * 1. Open BrowserWindow to exam.net login page
 * 2. User logs in (supports email/password and SSO)
 * 3. Detect successful login (redirect to /admin/exams)
 * 4. Extract session cookies
 * 5. Use cookies to fetch HTML pages and parse Vue.js props
 */
import { BrowserWindow, session } from "electron";
import logger from "../utils/logger";
import * as fs from "fs";
import * as os from "os";
import * as path from "path";
import { jsonrepair } from "jsonrepair";

interface ExamnetTest {
  id: number;
  examkey: string;
  name: string;
  teacherid: number;
  created_at: string;
  updated_at: string;
  started: boolean;
  device_security: string;
  requirements: string[];
  [key: string]: unknown;
}

interface ExamnetTestResult {
  testId: string;
  studentId: string;
  studentName: string;
  score?: number;
  maxScore?: number;
  percentage?: number;
  submittedAt?: string;
  status: string;
}

interface ExamnetStudent {
  id: string;
  name: string;
  email?: string;
  classGroup?: string;
}

class ExamnetAPI {
  private readonly baseURL = "https://exam.net";
  private sessionCookies: string | null = null;
  private isAuthenticated = false;

  constructor() {
    logger.log("ExamnetAPI initialized (BrowserWindow authentication)");
  }

  /**
   * Opens a login window and handles the authentication flow
   */
  async authenticate(): Promise<{ success: boolean; message: string }> {
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

      const resolveAuth = (success: boolean, message: string) => {
        if (!isResolved) {
          isResolved = true;
          authWindow.close();
          resolve({ success, message });
        }
      };

      const rejectAuth = (error: Error) => {
        if (!isResolved) {
          isResolved = true;
          authWindow.close();
          reject(error);
        }
      };

      // Load the exam.net login page
      authWindow.loadURL(`${this.baseURL}/teacher-login`);

      // Monitor navigation to detect successful login
      authWindow.webContents.on("did-navigate", async (event, url) => {
        logger.log(`Navigated to: ${url}`);

        // Check if user successfully logged in (redirected to /admin/exams or /admin)
        if (url.includes("/admin/exams") || url.includes("/admin")) {
          logger.log("Login successful! Extracting session cookies...");

          try {
            // Get all cookies for exam.net
            const cookies = await session.defaultSession.cookies.get({
              domain: "exam.net",
            });

            if (cookies.length > 0) {
              // Store cookies as a cookie string
              this.sessionCookies = cookies
                .map((cookie) => `${cookie.name}=${cookie.value}`)
                .join("; ");

              this.isAuthenticated = true;
              logger.log(`Captured ${cookies.length} session cookies`);
              resolveAuth(true, "Login successful");
            } else {
              rejectAuth(new Error("No session cookies found"));
            }
          } catch (error) {
            logger.error("Failed to extract cookies:", error);
            rejectAuth(
              error instanceof Error
                ? error
                : new Error("Failed to extract cookies"),
            );
          }
        }
      });

      // Handle window close
      authWindow.on("closed", () => {
        if (!isResolved) {
          rejectAuth(new Error("Authentication window closed"));
        }
      });

      // Handle load failures
      authWindow.webContents.on(
        "did-fail-load",
        (event, errorCode, errorDescription) => {
          logger.error(`Failed to load: ${errorCode} - ${errorDescription}`);
          rejectAuth(new Error(`Failed to load: ${errorDescription}`));
        },
      );
    });
  }

  /**
   * Login method that opens the authentication window
   */
  async login(): Promise<{ success: boolean; message: string }> {
    // User logs in manually in the BrowserWindow
    logger.log("Opening exam.net login window...");
    return this.authenticate();
  }

  /**
   * Clean up session
   */
  async cleanup(): Promise<void> {
    logger.log("Cleaning up exam.net session...");
    this.sessionCookies = null;
    this.isAuthenticated = false;

    // Clear exam.net cookies
    try {
      const cookies = await session.defaultSession.cookies.get({
        domain: "exam.net",
      });
      for (const cookie of cookies) {
        await session.defaultSession.cookies.remove(
          `https://exam.net`,
          cookie.name,
        );
      }
    } catch (error) {
      logger.error("Failed to clear cookies:", error);
    }
  }

  private ensureAuthenticated(): void {
    logger.log(
      `Checking authentication... isAuthenticated: ${this.isAuthenticated}, hasCookies: ${!!this.sessionCookies}`,
    );
    if (!this.isAuthenticated || !this.sessionCookies) {
      throw new Error("Not authenticated. Please login first.");
    }
  }

  /**
   * Extract JSON data from HTML Vue.js prop attributes
   */
  private extractVueProp(html: string, propName: string): unknown {
    // First, find where the prop starts
    const propStart = html.indexOf(`:${propName}=`);
    if (propStart === -1) {
      logger.warn(`Could not find prop :${propName} in HTML`);
      return null;
    }

    // Find the quote character (' or ")
    const afterEquals = html.substring(propStart + `:${propName}=`.length);
    const quoteChar = afterEquals[0];

    if (quoteChar !== '"' && quoteChar !== "'") {
      logger.error(`Invalid quote character after :${propName}=`);
      return null;
    }

    // Find the matching closing quote
    // We need to handle escaped quotes inside the JSON
    let jsonStr = "";
    let i = 1; // Start after opening quote
    let escaped = false;

    while (i < afterEquals.length) {
      const char = afterEquals[i];

      if (escaped) {
        jsonStr += char;
        escaped = false;
      } else if (char === "\\") {
        jsonStr += char;
        escaped = true;
      } else if (char === quoteChar) {
        // Found the closing quote
        break;
      } else {
        jsonStr += char;
      }

      i++;
    }

    if (i >= afterEquals.length) {
      logger.error(`Could not find closing quote for prop :${propName}`);
      return null;
    }

    try {
      // Decode HTML entities first
      jsonStr = jsonStr
        .replace(/&quot;/g, '"')
        .replace(/&#34;/g, '"')
        .replace(/&amp;/g, "&")
        .replace(/&#38;/g, "&")
        .replace(/&lt;/g, "<")
        .replace(/&#60;/g, "<")
        .replace(/&gt;/g, ">")
        .replace(/&#62;/g, ">")
        .replace(/&#39;/g, "'")
        .replace(/&apos;/g, "'");

      // Use jsonrepair to fix malformed JSON (handles nested JSON strings with unescaped quotes)
      const repairedJson = jsonrepair(jsonStr);

      // Log the first 1000 chars for debugging
      logger.log(
        `Attempting to parse prop ${propName}, length: ${repairedJson.length}`,
      );
      if (repairedJson.length < 1000) {
        logger.log(`JSON preview: ${repairedJson}`);
      } else {
        logger.log(`JSON preview: ${repairedJson.substring(0, 1000)}...`);
      }

      return JSON.parse(repairedJson);
    } catch (error) {
      logger.error(`Failed to parse Vue prop ${propName}:`, error);

      // Save both original and repaired JSON for inspection
      try {
        const tmpPath = path.join(
          os.tmpdir(),
          `examnet-${propName}-error.json`,
        );
        fs.writeFileSync(tmpPath, jsonStr);
        logger.error(`Saved original JSON to ${tmpPath}`);

        try {
          const repairedJson = jsonrepair(jsonStr);
          const repairedPath = path.join(
            os.tmpdir(),
            `examnet-${propName}-repaired.json`,
          );
          fs.writeFileSync(repairedPath, repairedJson);
          logger.error(`Saved repaired JSON to ${repairedPath}`);
        } catch (repairError) {
          logger.error("jsonrepair also failed:", repairError);
        }
      } catch (fsError) {
        logger.error("Failed to save error JSON file:", fsError);
      }

      // Log context around the error position
      if (error instanceof SyntaxError) {
        const errorMatch = error.message.match(/position (\d+)/);
        if (errorMatch) {
          const pos = parseInt(errorMatch[1], 10);
          const start = Math.max(0, pos - 100);
          const end = Math.min(jsonStr.length, pos + 100);
          logger.error(
            `Context around error (pos ${pos}): ...${jsonStr.substring(start, end)}...`,
          );
          logger.error(
            `Character at position ${pos}: "${jsonStr[pos]}" (code: ${jsonStr.charCodeAt(pos)})`,
          );
          logger.error(
            `Previous 20 chars: "${jsonStr.substring(Math.max(0, pos - 20), pos)}"`,
          );
          logger.error(`Next 20 chars: "${jsonStr.substring(pos, pos + 20)}"`);
        }
      }

      return null;
    }
  }

  /**
   * Fetch HTML page with session cookies
   */
  private async fetchWithCookies(url: string): Promise<string> {
    logger.log(`[fetchWithCookies] Starting fetch to: ${url}`);
    this.ensureAuthenticated();

    logger.log(
      `[fetchWithCookies] Sending request with ${this.sessionCookies?.split(";").length || 0} cookies`,
    );
    const response = await fetch(url, {
      headers: {
        Cookie: this.sessionCookies!,
        "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)",
      },
    });

    logger.log(
      `[fetchWithCookies] Response status: ${response.status} ${response.statusText}`,
    );

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const text = await response.text();
    logger.log(`[fetchWithCookies] Received ${text.length} bytes of HTML`);
    return text;
  }

  /**
   * Logout from exam.net
   */
  async logout(): Promise<void> {
    logger.log("Logging out from exam.net...");
    await this.cleanup();
  }

  /**
   * Get all tests
   */
  async getTests(): Promise<ExamnetTest[]> {
    this.ensureAuthenticated();

    try {
      logger.log("Fetching tests from exam.net...");

      // Fetch the exams page HTML
      const html = await this.fetchWithCookies(`${this.baseURL}/admin/exams`);

      // Log HTML length and search for the exams prop
      logger.log(`Received HTML response, length: ${html.length} bytes`);

      // Search for any Vue.js props in the HTML
      const vuePropsPattern = /:[\w-]+=['"][^'"]*['"]/g;
      const foundProps = html.match(vuePropsPattern);
      if (foundProps) {
        logger.log(`Found ${foundProps.length} Vue.js props in HTML`);
        const propNames = foundProps.map((p) => p.split("=")[0]).slice(0, 10);
        logger.log(`First props found: ${propNames.join(", ")}`);
      }

      // Try to find the exams prop specifically
      if (html.includes(":exams=")) {
        logger.log("Found :exams prop in HTML");
      } else if (html.includes("v-bind:exams=")) {
        logger.log("Found v-bind:exams prop in HTML");
      } else {
        logger.warn("Could not find :exams or v-bind:exams in HTML");

        // Save HTML to temp file for inspection
        const fs = await import("fs");
        const path = await import("path");
        const os = await import("os");
        const tmpPath = path.join(os.tmpdir(), "examnet-debug.html");
        fs.writeFileSync(tmpPath, html);
        logger.log(`Saved HTML to ${tmpPath} for inspection`);
      }

      // Extract the :exams JSON from the HTML
      const examsData = this.extractVueProp(html, "exams") as {
        owned?: ExamnetTest[];
        shared?: ExamnetTest[];
        groups?: unknown[];
      } | null;

      if (!examsData) {
        logger.error("Could not find :exams attribute in HTML");
        throw new Error("Failed to parse exam data from page");
      }

      logger.log(`Found ${examsData.owned?.length || 0} owned exams`);
      return examsData.owned || [];
    } catch (error) {
      logger.error("Failed to fetch tests:", error);
      if (error instanceof Error) {
        throw new Error(error.message || "Failed to fetch tests from exam.net");
      }
      throw error;
    }
  }

  /**
   * Get test results for a specific test
   */
  async getTestResults(testId: string): Promise<ExamnetTestResult[]> {
    this.ensureAuthenticated();

    try {
      logger.log(`Fetching results for test ${testId}...`);

      // The results page has tabs - we need the results tab specifically
      // Try multiple possible URLs for the results page
      const urls = [
        `https://exam.net/admin/exams/${testId}?tab=results`,
        `https://exam.net/admin/exams/${testId}#results`,
        `https://exam.net/admin/exams/${testId}/results`,
        `https://exam.net/admin/exams/${testId}`,
      ];

      let html = "";
      let successUrl = "";

      for (const url of urls) {
        try {
          logger.log(`Trying URL: ${url}`);
          html = await this.fetchWithCookies(url);
          if (html && html.length > 1000) {
            successUrl = url;
            logger.log(`Successfully fetched from: ${url}`);
            break;
          }
        } catch (err) {
          logger.log(
            `Failed to fetch ${url}:`,
            err instanceof Error ? err.message : err,
          );
        }
      }

      if (!html) {
        throw new Error("Could not fetch results page");
      }

      // Save HTML for debugging
      try {
        const tmpPath = path.join(
          os.tmpdir(),
          `examnet-results-${testId}.html`,
        );
        fs.writeFileSync(tmpPath, html);
        logger.log(`Saved results HTML to ${tmpPath} (from ${successUrl})`);
      } catch (err) {
        logger.error("Failed to save debug HTML:", err);
      }

      // Try to extract results from Vue props on the page
      // Common prop names: :attempts, :results, :students, :grades, :exam-attempts
      let resultsData =
        this.extractVueProp(html, "attempts") ||
        this.extractVueProp(html, "results") ||
        this.extractVueProp(html, "students") ||
        this.extractVueProp(html, "grades") ||
        this.extractVueProp(html, "examAttempts") ||
        this.extractVueProp(html, "exam-attempts");

      if (!resultsData) {
        logger.error("Could not find results data in HTML");
        logger.log("Trying API endpoints instead...");

        // Try different API endpoint patterns
        const apiEndpoints = [
          `/api/students/exam/${testId}/grade`,
          `/api/students/exam/${testId}`,
          `/api/exam/${testId}/attempts`,
          `/api/exam/${testId}/results`,
          `/api/new-faster/exam/${testId}/students`,
        ];

        for (const endpoint of apiEndpoints) {
          try {
            logger.log(`Trying endpoint: ${this.baseURL}${endpoint}`);
            const response = await this.fetchWithCookies(
              `${this.baseURL}${endpoint}`,
            );
            resultsData = JSON.parse(response);
            logger.log(`Success! Found data at ${endpoint}`);
            break;
          } catch (err) {
            logger.log(
              `Failed at ${endpoint}:`,
              err instanceof Error ? err.message : err,
            );
          }
        }
      }

      if (!resultsData) {
        throw new Error("Could not find results data in HTML or API endpoints");
      }

      // Parse the results
      const results: ExamnetTestResult[] = [];

      // Handle different data structures
      let dataArray: unknown[] = [];

      if (Array.isArray(resultsData)) {
        dataArray = resultsData;
      } else if (resultsData && typeof resultsData === "object") {
        const data = resultsData as Record<string, unknown>;
        dataArray =
          (data.students as unknown[]) ||
          (data.attempts as unknown[]) ||
          (data.data as unknown[]) ||
          [];
      }

      for (const item of dataArray) {
        const record = item as Record<string, unknown>;
        results.push({
          testId: testId,
          studentId:
            (record.studentId as string) ||
            (record.student_id as string) ||
            (record.id as string) ||
            "",
          studentName:
            (record.studentName as string) ||
            (record.student_name as string) ||
            (record.name as string) ||
            (record.fullName as string) ||
            "Unknown",
          score:
            (record.score as number) ||
            (record.grade as number) ||
            (record.points as number) ||
            0,
          maxScore:
            (record.maxScore as number) ||
            (record.max_score as number) ||
            (record.total as number) ||
            (record.totalPoints as number) ||
            0,
          submittedAt:
            (record.submittedAt as string) ||
            (record.submitted_at as string) ||
            (record.timestamp as string) ||
            (record.finishedAt as string) ||
            new Date().toISOString(),
          status: (record.status as string) || "completed",
        });
      }

      logger.log(`Parsed ${results.length} test results`);
      return results;
    } catch (error) {
      logger.error("Failed to fetch test results:", error);
      if (error instanceof Error) {
        throw new Error(
          error.message || "Failed to fetch test results from exam.net",
        );
      }
      throw error;
    }
  }

  /**
   * Get students
   */
  async getStudents(): Promise<ExamnetStudent[]> {
    this.ensureAuthenticated();

    logger.warn(
      "Exam.net does not have a separate students API. Students will be extracted from exam results.",
    );
    return [];
  }

  /**
   * Sync all data
   */
  async syncData(): Promise<{
    tests: ExamnetTest[];
    results: ExamnetTestResult[];
    students: ExamnetStudent[];
  }> {
    logger.log("[syncData] Starting sync...");
    this.ensureAuthenticated();

    try {
      logger.log("[syncData] Starting full data sync from exam.net...");

      const tests = await this.getTests();
      logger.log(`[syncData] Retrieved ${tests.length} tests`);

      const students: ExamnetStudent[] = [];
      const results: ExamnetTestResult[] = [];

      // Fetch results for each test
      logger.log(`[syncData] Fetching results for ${tests.length} tests...`);
      for (const test of tests) {
        try {
          const testResults = await this.getTestResults(String(test.id));
          results.push(...testResults);
        } catch (error) {
          logger.error(`Failed to fetch results for test ${test.id}:`, error);
        }
      }

      logger.log(
        `[syncData] Data sync completed - ${tests.length} tests, ${results.length} results`,
      );
      return { tests, results, students };
    } catch (error) {
      logger.error("[syncData] Data sync failed:", error);
      throw error;
    }
  }
}

// Export singleton instance
export const examnetAPI = new ExamnetAPI();
