import { useState } from "react";
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

  const handleLogin = async () => {
    setIsLoggingIn(true);
    setLoginStep("Opening authentication window...");

    try {
      const result = await window.magisterAPI.authenticate();

      if (result.success) {
        setLoginStep("Authentication successful!");
        onLoginSuccess();
      } else {
        onLoginError(result.error || "Authentication failed");
      }
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Authentication failed";
      if (
        errorMessage.includes("cancelled") ||
        errorMessage.includes("closed")
      ) {
        onLoginError(
          "Login was cancelled. Please try again and complete the login process.",
        );
      } else if (errorMessage.includes("timeout")) {
        onLoginError(
          "Login timed out. Please try again and complete the login process within 5 minutes.",
        );
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
        <h2 className="mb-2 text-2xl font-bold">Magister Login</h2>
        <p className="text-muted-foreground mb-6">
          Log in to your Magister account to view your schedule and information
        </p>
      </div>

      <Button
        onClick={handleLogin}
        disabled={isLoggingIn}
        className="min-w-[200px]"
      >
        {isLoggingIn ? loginStep || "Logging in..." : "Login to Magister"}
      </Button>

      <div className="text-muted-foreground max-w-md space-y-2 text-center text-sm">
        <p>
          This will open a secure browser window where you can log in to your
          Magister account. Your credentials are not stored by this application.
        </p>
        {isLoggingIn && (
          <div className="rounded-lg bg-blue-50 p-3 dark:bg-blue-950/20">
            <p className="font-medium">Instructions:</p>
            <ol className="mt-2 space-y-1 text-left">
              <li>1. Complete the login process in the browser window</li>
              <li>2. Wait for the dashboard to load completely</li>
              <li>
                3. You can click the "Extract Auth (Debug)" button if needed
              </li>
              <li>4. The window will close automatically when done</li>
            </ol>
          </div>
        )}
      </div>
    </div>
  );
}
