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
  const [isAuthenticating, setIsAuthenticating] = useState(false);

  const loadAllStudents = async (skipAuth = false) => {
    try {
      setLoading(true);
      setError(null);

      const response = await window.magisterAPI.getAllStudents();

      if (response.success && response.data) {
        const responseData = response.data as {
          items?: Array<{ id: number; [key: string]: unknown }>;
        };
        const items = responseData.items || [];

        // Save students to database
        try {
          await window.studentDBAPI.saveStudents(items);
          logger.debug(`Saved ${items.length} students to database`);
        } catch (err) {
          logger.error("Failed to save students to database:", err);
          setError("⚠️ Students loaded but failed to save to database");
        }

        setData({
          message: "Students loaded successfully!",
          count: items.length,
        });

        // Automatically download photos after loading students
        if (items.length > 0) {
          setError(t("downloadingPhotos"));
          let successCount = 0;
          let failCount = 0;

          for (const student of items) {
            try {
              const photoResponse = await window.magisterAPI.fetchStudentPhoto(
                student.id,
              );
              if (photoResponse.success && photoResponse.data) {
                // Use externeId as the key for storing photos
                const externeId = student.externeId as string;
                if (externeId) {
                  await window.studentDBAPI.savePhoto(
                    externeId,
                    photoResponse.data,
                  );
                  successCount++;
                  setError(
                    t("downloadedPhotos", {
                      count: successCount,
                      total: items.length,
                    }),
                  );
                } else {
                  logger.error(`Student ${student.id} has no externeId`);
                  failCount++;
                }
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
        }

        setLoading(false);
      } else {
        const errorMsg = response.error || "Failed to load students";

        // Auto-trigger login on auth error (but only if not already authenticating)
        if (
          !skipAuth &&
          !isAuthenticating &&
          (errorMsg.includes("Not authenticated") ||
            errorMsg.includes("token expired"))
        ) {
          setIsAuthenticating(true);
          setError(errorMsg + " - Opening login window...");
          try {
            const authResult = await window.magisterAPI.authenticate();
            if (authResult.success) {
              setError("✅ Authentication successful! Loading students...");
              setIsAuthenticating(false);
              // Wait a moment for token to be fully stored, then retry
              setTimeout(() => {
                loadAllStudents(true); // skipAuth = true to prevent infinite loop
              }, 500);
              return; // Exit early
            } else {
              setError(
                `❌ Authentication failed: ${authResult.error || "Unknown error"}`,
              );
              setIsAuthenticating(false);
              setLoading(false);
            }
          } catch (authErr) {
            const authErrorMsg =
              authErr instanceof Error ? authErr.message : "Unknown error";
            if (authErrorMsg.includes("cancelled")) {
              setError(
                "❌ Login cancelled. Click 'Refresh From API' to try again.",
              );
            } else {
              setError(`❌ Authentication failed: ${authErrorMsg}`);
            }
            setIsAuthenticating(false);
            setLoading(false);
          }
        } else {
          setError(errorMsg);
          setLoading(false);
        }
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load students");
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
            {/* Student API Controls */}
            <Button
              onClick={() => loadAllStudents(false)}
              disabled={loading}
              size="sm"
            >
              {t("refreshFromAPI")}
            </Button>

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
