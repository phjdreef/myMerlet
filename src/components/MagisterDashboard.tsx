import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Button } from "./ui/button";
import StudentDirectory from "./StudentDirectory";
import { logger } from "../utils/logger";

export default function MagisterDashboard({
  onLogout,
}: {
  onLogout?: () => void;
} = {}) {
  const { t } = useTranslation();
  const [activeTab, setActiveTab] = useState<"overview" | "students">(
    "overview",
  );
  const [data, setData] = useState<unknown | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [students, setStudents] = useState<
    Array<{ id: number; [key: string]: unknown }>
  >([]);

  const loadAllStudents = async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await window.magisterAPI.getAllStudents();

      if (response.success && response.data) {
        const responseData = response.data as {
          items?: Array<{ id: number; [key: string]: unknown }>;
        };
        const items = responseData.items || [];
        setStudents(items);
        setData({
          message: "Students loaded successfully!",
          count: items.length,
        });
      } else {
        const errorMsg = response.error || "Failed to load students";
        setError(errorMsg);

        // Auto-trigger login on auth error
        if (
          errorMsg.includes("Not authenticated") ||
          errorMsg.includes("token expired")
        ) {
          try {
            const authResult = await window.magisterAPI.authenticate();
            if (authResult.success) {
              setError("✅ Authentication successful! Please try again.");
            }
          } catch {
            setError("❌ Authentication cancelled or failed.");
          }
        }
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load students");
    } finally {
      setLoading(false);
    }
  };

  const downloadAllPhotos = async () => {
    if (students.length === 0) {
      setError(t("noStudentsLoaded"));
      return;
    }

    try {
      setLoading(true);
      setError(t("downloadingPhotos"));

      let successCount = 0;
      let failCount = 0;

      for (const student of students) {
        try {
          const response = await window.magisterAPI.fetchStudentPhoto(
            student.id,
          );
          if (response.success && response.data) {
            await window.studentDBAPI.savePhoto(student.id, response.data);
            successCount++;
            setError(
              t("downloadedPhotos", {
                count: successCount,
                total: students.length,
              }),
            );
          } else {
            failCount++;
          }
        } catch (err) {
          logger.error(
            `Failed to download photo for student ${student.id}:`,
            err,
          );
          failCount++;
        }
      }

      setError(
        t("photoDownloadComplete", {
          success: successCount,
          failed: failCount,
        }),
      );
      setTimeout(() => setError(null), 5000);
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : t("failedToDownloadPhotos");

      if (
        errorMessage.includes("Not authenticated") ||
        errorMessage.includes("token expired")
      ) {
        setError("⚠️ Not authenticated. Please log in first.");

        try {
          const authResult = await window.magisterAPI.authenticate();
          if (authResult.success) {
            setError(t("authSuccessRetrying"));
            setTimeout(() => downloadAllPhotos(), 1000);
          }
        } catch {
          setError("❌ Authentication cancelled or failed.");
        }
      } else {
        setError(`❌ ${errorMessage}`);
      }
    } finally {
      setLoading(false);
    }
  };

  const loadData = async () => {
    setLoading(true);
    setError(null);

    try {
      // You can add your API calls here
      logger.debug("Loading Magister data...");

      // Placeholder for now
      setData({ message: "Connected to Magister!" });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load data");
    } finally {
      setLoading(false);
    }
  };

  const testAPI = async () => {
    setLoading(true);
    setError(null);

    try {
      logger.debug("Testing Magister API...");

      const response = await window.magisterAPI.testAPI();
      logger.debug("API Test Response:", response);

      if (response.success) {
        setData(response.data as unknown);
        logger.debug("API test successful!", response.data);
      } else {
        setError(response.error || "API test failed");
      }
    } catch (err) {
      logger.error("API test error:", err);
      setError(err instanceof Error ? err.message : "API test failed");
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    try {
      await window.magisterAPI.clearToken();
      onLogout?.();
    } catch (err) {
      logger.error("Logout error:", err);
      // Still proceed with logout even if clearing fails
      onLogout?.();
    }
  };

  return (
    <div className="flex h-full flex-col p-4">
      <div className="mb-6">
        <h1 className="mb-2 text-2xl font-bold">Magister Dashboard</h1>
        <p className="text-muted-foreground mb-4">Connected to Magister API</p>

        {/* Tab Navigation */}
        <div className="mb-4 flex gap-1">
          <Button
            onClick={() => setActiveTab("overview")}
            variant={activeTab === "overview" ? "default" : "outline"}
            size="sm"
          >
            Overview
          </Button>
          <Button
            onClick={() => setActiveTab("students")}
            variant={activeTab === "students" ? "default" : "outline"}
            size="sm"
          >
            Students
          </Button>
        </div>

        {/* Controls for Overview tab */}
        {activeTab === "overview" && (
          <div className="flex flex-wrap gap-2">
            <Button onClick={loadData} disabled={loading} size="sm">
              Refresh Data
            </Button>
            <Button
              onClick={testAPI}
              disabled={loading}
              variant="outline"
              size="sm"
            >
              Test API
            </Button>

            {/* Student API Controls */}
            <div className="flex gap-2 border-l pl-2">
              <Button onClick={loadAllStudents} disabled={loading} size="sm">
                {t("refreshFromAPI")}
              </Button>
              <Button
                onClick={downloadAllPhotos}
                disabled={loading || students.length === 0}
                size="sm"
                variant="outline"
              >
                {t("downloadAllPhotos")}
              </Button>
            </div>

            <Button
              onClick={handleLogout}
              variant="outline"
              size="sm"
              className="ml-auto"
            >
              Logout
            </Button>
          </div>
        )}
      </div>

      {/* Content based on active tab */}
      {activeTab === "overview" && (
        <>
          {error && (
            <div
              className={`mb-4 rounded-md border px-4 py-3 ${
                error.startsWith("✅") || error.startsWith("📸")
                  ? "border-green-200 bg-green-50 text-green-800"
                  : error.startsWith("⚠️")
                    ? "border-yellow-200 bg-yellow-50 text-yellow-800"
                    : "bg-destructive/10 border-destructive/20 text-destructive"
              }`}
            >
              <p className="text-sm font-medium">
                {error.startsWith("✅") ||
                error.startsWith("📸") ||
                error.startsWith("⚠️")
                  ? error
                  : `Error: ${error}`}
              </p>
            </div>
          )}

          {loading && (
            <div className="flex items-center justify-center py-8">
              <div className="border-primary mr-3 h-8 w-8 animate-spin rounded-full border-b-2"></div>
              <p>Loading...</p>
            </div>
          )}

          {data && (
            <div className="flex-1 overflow-auto">
              <div className="bg-card rounded-lg border p-4">
                <h2 className="mb-3 text-lg font-semibold">API Data</h2>
                <pre className="bg-muted overflow-auto rounded p-3 text-sm">
                  {JSON.stringify(data, null, 2)}
                </pre>
              </div>
            </div>
          )}
        </>
      )}

      {activeTab === "students" && (
        <div className="flex-1 overflow-hidden">
          <StudentDirectory />
        </div>
      )}
    </div>
  );
}
