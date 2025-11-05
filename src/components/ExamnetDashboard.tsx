import { useState } from "react";
import { Button } from "./ui/button";
import { logger } from "../utils/logger";

interface ExamnetTest {
  id: number;
  examkey: string;
  name: string;
  created_at: string;
  updated_at: string;
  started: boolean;
  [key: string]: unknown;
}

interface ExamnetTestResult {
  testId: string;
  studentId: string;
  studentName: string;
  score: number;
  maxScore: number;
  submittedAt: string;
  status: string;
}

interface ExamnetData {
  tests?: ExamnetTest[];
  results?: unknown[];
  students?: unknown[];
}

export default function ExamnetDashboard() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<ExamnetData | null>(null);
  const [selectedExamId, setSelectedExamId] = useState<number | null>(null);
  const [examResults, setExamResults] = useState<ExamnetTestResult[] | null>(
    null,
  );
  const [loadingResults, setLoadingResults] = useState(false);

  const handleLogin = async () => {
    try {
      setLoading(true);
      setError(null);

      // Login opens a BrowserWindow where user logs in manually
      // No username/password needed - user authenticates in the browser
      const response = await window.examnetAPI.login("", "");

      if (response.success) {
        setIsAuthenticated(true);
        logger.log("Successfully logged in to exam.net");
      } else {
        setError(response.error || "Login failed");
      }
    } catch (err) {
      logger.error("Login error:", err);
      setError(err instanceof Error ? err.message : "Login failed");
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    try {
      setLoading(true);
      await window.examnetAPI.logout();
      setIsAuthenticated(false);
      setData(null);
      logger.log("Logged out from exam.net");
    } catch (err) {
      logger.error("Logout error:", err);
      setError(err instanceof Error ? err.message : "Logout failed");
    } finally {
      setLoading(false);
    }
  };

  const handleSyncData = async () => {
    try {
      console.log("[ExamnetDashboard] Sync data button clicked");
      setLoading(true);
      setError(null);

      console.log("[ExamnetDashboard] Calling window.examnetAPI.syncData()");
      const response = await window.examnetAPI.syncData();
      console.log("[ExamnetDashboard] Sync response:", response);

      if (response.success) {
        setData(response.data as ExamnetData);
        logger.log("Successfully synced data from exam.net");
      } else {
        setError(response.error || "Failed to sync data");
      }
    } catch (err) {
      console.error("[ExamnetDashboard] Sync error:", err);
      logger.error("Sync error:", err);
      setError(err instanceof Error ? err.message : "Failed to sync data");
    } finally {
      setLoading(false);
    }
  };

  const handleViewResults = async (examId: number) => {
    try {
      setLoadingResults(true);
      setSelectedExamId(examId);
      setError(null);

      logger.log(`Fetching results for exam ${examId}...`);
      const response = await window.examnetAPI.getTestResults(
        examId.toString(),
      );

      if (response.success) {
        setExamResults(response.data as ExamnetTestResult[]);
        logger.log(
          `Successfully fetched ${(response.data as ExamnetTestResult[])?.length || 0} results`,
        );
      } else {
        setError(response.error || "Failed to fetch results");
        setExamResults(null);
      }
    } catch (err) {
      logger.error("Fetch results error:", err);
      setError(err instanceof Error ? err.message : "Failed to fetch results");
      setExamResults(null);
    } finally {
      setLoadingResults(false);
    }
  };

  return (
    <div className="container mx-auto max-w-4xl space-y-6 p-6">
      <div className="space-y-2">
        <h1 className="text-3xl font-semibold tracking-tight">Exam.net</h1>
        <p className="text-muted-foreground">
          Connect to exam.net to import tests and results
        </p>
      </div>

      {error && (
        <div className="bg-destructive/10 text-destructive rounded-lg border p-4">
          <p className="font-medium">Error</p>
          <p className="text-sm">{error}</p>
        </div>
      )}

      {!isAuthenticated ? (
        <div className="bg-card rounded-lg border p-6 shadow-sm">
          <h2 className="mb-4 text-xl font-semibold">Login to exam.net</h2>
          <p className="text-muted-foreground mb-4 text-sm">
            Click the button below to open a login window. You can use
            email/password or SSO login.
          </p>
          <Button onClick={handleLogin} disabled={loading}>
            {loading ? "Opening login window..." : "Login"}
          </Button>
        </div>
      ) : (
        <div className="space-y-4">
          <div className="bg-card rounded-lg border p-6 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-xl font-semibold">Connected</h2>
                <p className="text-muted-foreground text-sm">
                  Successfully logged in to exam.net
                </p>
              </div>
              <Button
                variant="outline"
                onClick={handleLogout}
                disabled={loading}
              >
                Logout
              </Button>
            </div>
          </div>

          <div className="bg-card rounded-lg border p-6 shadow-sm">
            <h2 className="mb-4 text-xl font-semibold">Sync Data</h2>
            <p className="text-muted-foreground mb-4 text-sm">
              Import tests, results, and students from exam.net
            </p>
            <Button onClick={handleSyncData} disabled={loading}>
              {loading ? "Syncing..." : "Sync Data"}
            </Button>
          </div>

          {data !== null && (
            <div className="bg-card space-y-6 rounded-lg border p-6 shadow-sm">
              <div>
                <h2 className="mb-4 text-xl font-semibold">
                  Exams from exam.net
                </h2>
                {data.tests && data.tests.length > 0 ? (
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm">
                      <thead className="bg-muted/50 border-b">
                        <tr>
                          <th className="px-4 py-3 font-medium">Exam Key</th>
                          <th className="px-4 py-3 font-medium">Name</th>
                          <th className="px-4 py-3 font-medium">Created</th>
                          <th className="px-4 py-3 font-medium">Status</th>
                          <th className="px-4 py-3 font-medium">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y">
                        {data.tests.map((test) => (
                          <tr key={test.id} className="hover:bg-muted/30">
                            <td className="px-4 py-3 font-mono text-xs">
                              {test.examkey}
                            </td>
                            <td className="px-4 py-3">{test.name}</td>
                            <td className="text-muted-foreground px-4 py-3">
                              {new Date(test.created_at).toLocaleDateString(
                                "nl-NL",
                              )}
                            </td>
                            <td className="px-4 py-3">
                              <span
                                className={`inline-flex rounded-full px-2 py-1 text-xs font-medium ${
                                  test.started
                                    ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400"
                                    : "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300"
                                }`}
                              >
                                {test.started ? "Started" : "Not Started"}
                              </span>
                            </td>
                            <td className="px-4 py-3">
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleViewResults(test.id)}
                                disabled={loadingResults}
                              >
                                {loadingResults && selectedExamId === test.id
                                  ? "Loading..."
                                  : "View Results"}
                              </Button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                    <p className="text-muted-foreground mt-4 text-sm">
                      Total: {data.tests.length} exam
                      {data.tests.length !== 1 ? "s" : ""}
                    </p>
                  </div>
                ) : (
                  <p className="text-muted-foreground text-sm">
                    No exams found
                  </p>
                )}
              </div>

              {examResults && examResults.length > 0 && (
                <div>
                  <h2 className="mb-4 text-xl font-semibold">
                    Exam Results
                    {selectedExamId && (
                      <span className="text-muted-foreground ml-2 text-sm font-normal">
                        (Exam ID: {selectedExamId})
                      </span>
                    )}
                  </h2>
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm">
                      <thead className="bg-muted/50 border-b">
                        <tr>
                          <th className="px-4 py-3 font-medium">Student</th>
                          <th className="px-4 py-3 font-medium">Score</th>
                          <th className="px-4 py-3 font-medium">Submitted</th>
                          <th className="px-4 py-3 font-medium">Status</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y">
                        {examResults.map((result, index) => (
                          <tr key={index} className="hover:bg-muted/30">
                            <td className="px-4 py-3">{result.studentName}</td>
                            <td className="px-4 py-3">
                              {result.score} / {result.maxScore}
                            </td>
                            <td className="text-muted-foreground px-4 py-3">
                              {new Date(result.submittedAt).toLocaleString(
                                "nl-NL",
                              )}
                            </td>
                            <td className="px-4 py-3">
                              <span
                                className={`inline-flex rounded-full px-2 py-1 text-xs font-medium ${
                                  result.status === "completed"
                                    ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400"
                                    : "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400"
                                }`}
                              >
                                {result.status}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                    <p className="text-muted-foreground mt-4 text-sm">
                      Total: {examResults.length} result
                      {examResults.length !== 1 ? "s" : ""}
                    </p>
                  </div>
                </div>
              )}

              {data.results && data.results.length > 0 && (
                <div>
                  <h3 className="mb-4 text-lg font-semibold">Results</h3>
                  <p className="text-muted-foreground text-sm">
                    {data.results.length} result
                    {data.results.length !== 1 ? "s" : ""} found
                  </p>
                </div>
              )}

              {data.students && data.students.length > 0 && (
                <div>
                  <h3 className="mb-4 text-lg font-semibold">Students</h3>
                  <p className="text-muted-foreground text-sm">
                    {data.students.length} student
                    {data.students.length !== 1 ? "s" : ""} found
                  </p>
                </div>
              )}

              {/* Debug raw data - can be removed later */}
              <details className="mt-6">
                <summary className="text-muted-foreground cursor-pointer text-sm hover:underline">
                  View Raw Data
                </summary>
                <pre className="bg-muted mt-2 overflow-auto rounded p-4 text-xs">
                  {JSON.stringify(data, null, 2)}
                </pre>
              </details>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
