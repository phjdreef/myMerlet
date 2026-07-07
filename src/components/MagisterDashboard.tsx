import { useState } from "react";
import { useTranslation } from "react-i18next";
import { useSchoolYear } from "../contexts/SchoolYearContext";
import { logger } from "../utils/logger";
import { Button } from "./ui/button";
import { Checkbox } from "./ui/checkbox";
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
  const [progressPercent, setProgressPercent] = useState<number | null>(null);
  const [progressStatus, setProgressStatus] = useState("");
  const [autoDownloadPhotos, setAutoDownloadPhotos] = useState(() => {
    const saved = localStorage.getItem("magister_auto_download_photos");
    return saved !== "false";
  });

  const setProgress = (status: string, percent: number | null) => {
    setProgressStatus(status);
    if (percent === null) {
      setProgressPercent(null);
      return;
    }

    setProgressPercent(Math.max(0, Math.min(100, percent)));
  };

  const handleCancel = () => {
    setCancelRequested(true);
    setLoading(false);
    setIsAuthenticating(false);
    setProgress("Geannuleerd", null);
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
      setData(null);
      setError(null);
      setProgress("Bezig met leerlingen ophalen uit Magister...", null);

      const response = await window.magisterAPI.getAllStudents();

      if (response.success && response.data) {
        const items = response.data.items || [];
        setProgress(
          `Bezig met opslaan van ${items.length} leerlingen...`,
          null,
        );

        // Add current school year to all students
        const studentsWithSchoolYear = items.map((student) => ({
          ...student,
          schoolYear: currentSchoolYear,
        }));

        // Save students to database
        try {
          await window.studentDBAPI.saveStudents(studentsWithSchoolYear);
          logger.debug(`Saved ${items.length} students to database`);
          setProgress("Leerlingen opgeslagen. Bezig met afronden...", null);
        } catch (err) {
          logger.error("Failed to save students to database:", err);
          setError(t("magisterSaveStudentsFailed"));
        }

        setData({
          message: t("magisterLoadSuccess"),
          count: items.length,
        });

        // Automatically download photos after loading students
        if (autoDownloadPhotos && items.length > 0 && !cancelRequested) {
          setError(t("downloadingPhotos"));
          setProgress("Bezig met foto's downloaden...", 0);
          let successCount = 0;
          let failCount = 0;
          const photoFailureDetails: string[] = [];

          for (const student of items) {
            if (cancelRequested) {
              break;
            }
            try {
              const photoResponse = await window.magisterAPI.fetchStudentPhoto(
                student.id,
                student.links?.foto?.href,
              );
              if (photoResponse.success && photoResponse.data) {
                // Use student.id for storing photos
                await window.studentDBAPI.savePhoto(
                  student.id,
                  photoResponse.data,
                );
                successCount++;
                const processedCount = successCount + failCount;
                setProgress(
                  `Bezig met foto's downloaden... (${processedCount}/${items.length})`,
                  Math.round((processedCount / items.length) * 100),
                );
                setError(
                  t("downloadedPhotos", {
                    count: successCount,
                    total: items.length,
                  }),
                );
              } else {
                failCount++;
                const processedCount = successCount + failCount;
                setProgress(
                  `Bezig met foto's downloaden... (${processedCount}/${items.length})`,
                  Math.round((processedCount / items.length) * 100),
                );
                if (photoResponse.error && photoFailureDetails.length < 5) {
                  photoFailureDetails.push(
                    `${student.roepnaam} ${student.achternaam}: ${photoResponse.error}`,
                  );
                }
              }
            } catch (err) {
              logger.error(
                `Failed to download photo for student ${student.id}:`,
                err,
              );
              failCount++;
              const processedCount = successCount + failCount;
              setProgress(
                `Bezig met foto's downloaden... (${processedCount}/${items.length})`,
                Math.round((processedCount / items.length) * 100),
              );
              if (photoFailureDetails.length < 5) {
                photoFailureDetails.push(
                  `${student.roepnaam} ${student.achternaam}: ${err instanceof Error ? err.message : "Unknown error"}`,
                );
              }
            }
          }

          setData((previous) => ({
            ...(previous ?? {}),
            photoSync: {
              success: successCount,
              failed: failCount,
              sampleFailures: photoFailureDetails,
            },
          }));

          const completionMessage = t("photoDownloadComplete", {
            success: successCount,
            failed: failCount,
          });
          setError(
            photoFailureDetails.length > 0
              ? `${completionMessage} Eerste fouten: ${photoFailureDetails.join(" | ")}`
              : completionMessage,
          );
          setTimeout(() => setError(null), 5000);
          setProgress("Synchronisatie afgerond", 100);
        } else if (!autoDownloadPhotos) {
          setData((previous) => ({
            ...(previous ?? {}),
            photoSync: {
              skipped: true,
            },
          }));
          setProgress("Synchronisatie afgerond", 100);
        } else {
          setProgress("Synchronisatie afgerond", 100);
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
          setProgress("Bezig met inloggen bij Magister...", null);
          setError(`${errorMsg} - ${t("magisterOpeningLogin")}`);
          try {
            const authResult = await window.magisterAPI.authenticate();
            if (authResult.success) {
              setProgress("Inloggen gelukt, opnieuw synchroniseren...", null);
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
              setProgress("Synchronisatie mislukt", null);
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
            setProgress("Synchronisatie mislukt", null);
          }
        } else {
          setError(errorMsg);
          setLoading(false);
          setProgress("Synchronisatie mislukt", null);
        }
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : t("magisterLoadFailed"));
      setLoading(false);
      setProgress("Synchronisatie mislukt", null);
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

          <label className="ml-2 flex items-center gap-2 text-sm">
            <Checkbox
              checked={autoDownloadPhotos}
              onCheckedChange={(checked) => {
                setAutoDownloadPhotos(checked);
                localStorage.setItem(
                  "magister_auto_download_photos",
                  String(checked),
                );
              }}
            />
            <span>{t("autoDownloadPhotos")}</span>
          </label>

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
          <LoadingSpinner />
          <div className="w-full max-w-md space-y-2">
            <div className="text-muted-foreground text-center text-sm">
              {progressStatus || "Bezig met synchroniseren..."}
            </div>
            <div className="bg-muted relative h-2 w-full overflow-hidden rounded-full border">
              {progressPercent === null ? (
                <div className="magister-progress-indeterminate bg-primary/70 absolute top-0 h-full w-1/3" />
              ) : (
                <div
                  className="bg-primary h-full transition-all duration-300 ease-out"
                  style={{ width: `${progressPercent}%` }}
                />
              )}
            </div>
            {progressPercent !== null && (
              <div className="text-muted-foreground text-center text-xs">
                {progressPercent}%
              </div>
            )}
          </div>
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
