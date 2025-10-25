import { Link } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";
import {
  NavigationMenu as NavigationMenuBase,
  NavigationMenuItem,
  NavigationMenuLink,
  NavigationMenuList,
  navigationMenuTriggerStyle,
  NavigationMenuTrigger,
  NavigationMenuContent,
} from "../ui/navigation-menu";

import { ThemeSelector } from "../ui/ThemeSelector";
import { cn } from "@/utils/tailwind";

export default function NavigationMenu() {
  const { t } = useTranslation();

  return (
    <NavigationMenuBase
      className="text-muted-foreground h-auto min-h-0 flex-none px-2 py-0"
      viewport={false}
    >
      <div className="flex w-full items-center justify-between">
        <NavigationMenuList className="gap-0.5">
          <NavigationMenuItem>
            <NavigationMenuLink
              asChild
              className={cn(
                navigationMenuTriggerStyle(),
                "h-7 py-0.5 leading-none",
              )}
            >
              <Link to="/">{t("titleHomePage")}</Link>
            </NavigationMenuLink>
          </NavigationMenuItem>
          <NavigationMenuItem>
            <NavigationMenuLink
              asChild
              className={cn(
                navigationMenuTriggerStyle(),
                "h-7 py-0.5 leading-none",
              )}
            >
              <Link to="/second">{t("titleSecondPage")}</Link>
            </NavigationMenuLink>
          </NavigationMenuItem>
          <NavigationMenuItem>
            <NavigationMenuLink
              asChild
              className={cn(
                navigationMenuTriggerStyle(),
                "h-7 py-0.5 leading-none",
              )}
            >
              <Link to="/magister">{t("magister")}</Link>
            </NavigationMenuLink>
          </NavigationMenuItem>
          <NavigationMenuItem>
            <NavigationMenuLink
              asChild
              className={cn(
                navigationMenuTriggerStyle(),
                "h-7 py-0.5 leading-none",
              )}
            >
              <Link to="/students">{t("classes")}</Link>
            </NavigationMenuLink>
          </NavigationMenuItem>
          <NavigationMenuItem>
            <NavigationMenuLink
              asChild
              className={cn(
                navigationMenuTriggerStyle(),
                "h-7 py-0.5 leading-none",
              )}
            >
              <Link to="/planning">{t("planning")}</Link>
            </NavigationMenuLink>
          </NavigationMenuItem>
        </NavigationMenuList>
        <NavigationMenuList className="ml-auto">
          <NavigationMenuItem>
            <NavigationMenuTrigger className="h-7 py-0.5 leading-none">
              {t("theme")}
            </NavigationMenuTrigger>
            <NavigationMenuContent className="min-w-40 p-2">
              <ThemeSelector />
            </NavigationMenuContent>
          </NavigationMenuItem>
        </NavigationMenuList>
      </div>
    </NavigationMenuBase>
  );
}
