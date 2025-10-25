import { MoonIcon } from "@phosphor-icons/react";
import { Button } from "@/components/ui/button";
import { toggleTheme } from "@/helpers/theme_helpers";

export default function ToggleTheme() {
  return (
    <Button onClick={toggleTheme} size="icon">
      <MoonIcon size={16} />
    </Button>
  );
}
