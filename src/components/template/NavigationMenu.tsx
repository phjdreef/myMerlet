import { Link } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";
import {
  NavigationMenu as NavigationMenuBase,
  NavigationMenuItem,
  NavigationMenuLink,
  NavigationMenuList,
  navigationMenuTriggerStyle,
} from "../ui/navigation-menu";
import { cn } from "@/utils/tailwind";

export default function NavigationMenu() {
  const { t } = useTranslation();

  return (
    <NavigationMenuBase
      className="text-muted-foreground h-auto min-h-0 flex-none px-2 py-0"
      viewport={false}
    >
      <div className="flex w-full items-center justify-start">
        <NavigationMenuList className="gap-0.5">
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
              <Link to="/koppelingen">{t("koppelingen")}</Link>
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
          <NavigationMenuItem>
            <NavigationMenuLink
              asChild
              className={cn(
                navigationMenuTriggerStyle(),
                "h-7 py-0.5 leading-none",
              )}
            >
              <Link to="/tests">{t("tests")}</Link>
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
              <Link to="/settings">{t("settings")}</Link>
            </NavigationMenuLink>
          </NavigationMenuItem>
        </NavigationMenuList>
      </div>
    </NavigationMenuBase>
  );
}
