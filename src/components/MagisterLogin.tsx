import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Button } from "./ui/button";

interface MagisterLoginProps {
  onLoginSuccess: () => void;
  onLoginError: (error: string) => void;
}

export default function MagisterLogin({
  onLoginSuccess,
  onLoginError,
}: MagisterLoginProps) {
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const [loginStep, setLoginStep] = useState<string>("");
  const { t } = useTranslation();

  const handleLogin = async () => {
    setIsLoggingIn(true);
    setLoginStep(t("magisterLoginOpening"));

    try {
      const result = await window.magisterAPI.authenticate();

      if (result.success) {
        setLoginStep(t("magisterLoginSuccess"));
        onLoginSuccess();
      } else {
        onLoginError(result.error || t("magisterLoginFailed"));
      }
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : t("magisterLoginFailed");
      if (
        errorMessage.includes("cancelled") ||
        errorMessage.includes("closed")
      ) {
        onLoginError(t("magisterLoginCancelled"));
      } else if (errorMessage.includes("timeout")) {
        onLoginError(t("magisterLoginTimedOut"));
      } else {
        onLoginError(errorMessage);
      }
    } finally {
      setIsLoggingIn(false);
      setLoginStep("");
    }
  };

  return (
    <div className="flex flex-col items-center justify-center gap-4 p-8">
      <div className="text-center">
        <h2 className="mb-2 text-2xl font-bold">{t("magisterLoginTitle")}</h2>
        <p className="text-muted-foreground mb-6">
          {t("magisterLoginDescription")}
        </p>
      </div>

      <Button
        onClick={handleLogin}
        disabled={isLoggingIn}
        className="min-w-[200px]"
      >
        {isLoggingIn
          ? loginStep || t("magisterLoggingIn")
          : t("magisterLoginButton")}
      </Button>

      <div className="text-muted-foreground max-w-md space-y-2 text-center text-sm">
        <p>{t("magisterLoginInfo")}</p>
        {isLoggingIn && (
          <div className="rounded-lg bg-blue-50 p-3 dark:bg-blue-950/20">
            <p className="font-medium">{t("magisterLoginInstructions")}</p>
            <ol className="mt-2 space-y-1 text-left">
              <li>{t("magisterLoginStep1")}</li>
              <li>{t("magisterLoginStep2")}</li>
              <li>{t("magisterLoginStep3")}</li>
              <li>{t("magisterLoginStep4")}</li>
            </ol>
          </div>
        )}
      </div>
    </div>
  );
}
