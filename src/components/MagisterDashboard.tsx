import { useState } from "react";
import { useTranslation } from "react-i18next";
import { useSchoolYear } from "../contexts/SchoolYearContext";
import { logger } from "../utils/logger";
import { Button } from "./ui/button";
import { ErrorBanner } from "./ui/error-banner";
import LoadingSpinner from "./LoadingSpinner";

export default function MagisterDashboard({
  onLogout,
}: {
  onLogout?: () => void;
} = {}) {
  const { t } = useTranslation();
  const { currentSchoolYear } = useSchoolYear();
  const [data, setData] = useState<Record<string, unknown> | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isAuthenticating, setIsAuthenticating] = useState(false);
  const [cancelRequested, setCancelRequested] = useState(false);

  const handleCancel = () => {
    setCancelRequested(true);
    setLoading(false);
    setIsAuthenticating(false);
    setError(t("operationCancelled"));
    setTimeout(() => {
      setError(null);
      setCancelRequested(false);
    }, 3000);
  };

  const loadAllStudents = async (skipAuth = false) => {
    setCancelRequested(false);
    try {
      setLoading(true);
      setError(null);

      const response = await window.magisterAPI.getAllStudents();

      if (response.success && response.data) {
        const items = response.data.items || [];

        // Add current school year to all students
        const studentsWithSchoolYear = items.map((student) => ({
          ...student,
          schoolYear: currentSchoolYear,
        }));

        // Save students to database
        try {
          await window.studentDBAPI.saveStudents(studentsWithSchoolYear);
          logger.debug(`Saved ${items.length} students to database`);
        } catch (err) {
          logger.error("Failed to save students to database:", err);
          setError(t("magisterSaveStudentsFailed"));
        }

        setData({
          message: t("magisterLoadSuccess"),
          count: items.length,
        });

        // Automatically download photos after loading students
        if (items.length > 0 && !cancelRequested) {
          setError(t("downloadingPhotos"));
          let successCount = 0;
          let failCount = 0;

          for (const student of items) {
            if (cancelRequested) {
              break;
            }
            try {
              const photoResponse = await window.magisterAPI.fetchStudentPhoto(
                student.id,
              );
              if (photoResponse.success && photoResponse.data) {
                // Use student.id for storing photos
                await window.studentDBAPI.savePhoto(
                  student.id,
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
          setError(`${errorMsg} - ${t("magisterOpeningLogin")}`);
          try {
            const authResult = await window.magisterAPI.authenticate();
            if (authResult.success) {
              setError(t("magisterAuthSuccessLoading"));
              setIsAuthenticating(false);
              // Wait a moment for token to be fully stored, then retry
              setTimeout(() => {
                loadAllStudents(true); // skipAuth = true to prevent infinite loop
              }, 500);
              return; // Exit early
            } else {
              setError(
                t("magisterAuthFailed", {
                  error: authResult.error || t("unknownError"),
                }),
              );
              setIsAuthenticating(false);
              setLoading(false);
            }
          } catch (authErr) {
            const authErrorMsg =
              authErr instanceof Error ? authErr.message : t("unknownError");
            if (authErrorMsg.includes("cancelled")) {
              setError(t("magisterLoginCancelledMessage"));
            } else {
              setError(
                t("magisterAuthFailed", {
                  error: authErrorMsg,
                }),
              );
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
      setError(err instanceof Error ? err.message : t("magisterLoadFailed"));
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
    <div className="flex flex-col">
      <div className="mb-6">
        <h1 className="mb-2 text-2xl font-bold">
          {t("magisterDashboardTitle")}
        </h1>
        <p className="text-muted-foreground mb-4">
          {t("magisterDashboardSubtitle")}
        </p>

        {/* Controls */}
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
            {t("logout")}
          </Button>
        </div>
      </div>

      <ErrorBanner
        error={error}
        variant={
          error?.startsWith("✅") || error?.startsWith("📸")
            ? "success"
            : error?.startsWith("⚠️")
              ? "warning"
              : "error"
        }
      />

      {loading && (
        <div className="flex flex-col items-center justify-center gap-4 py-8">
          <LoadingSpinner text={t("loading")} />
          <Button onClick={handleCancel} variant="outline" size="sm">
            {t("cancel")}
          </Button>
        </div>
      )}

      {data && (
        <div className="overflow-auto">
          <div className="bg-card rounded-lg border p-4">
            <h2 className="mb-3 text-lg font-semibold">{t("apiData")}</h2>
            <pre className="bg-muted overflow-auto rounded p-3 text-sm">
              {JSON.stringify(data, null, 2)}
            </pre>
          </div>
        </div>
      )}
    </div>
  );
}
