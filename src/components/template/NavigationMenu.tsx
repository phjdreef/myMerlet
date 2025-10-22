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
            <Link to="/magister">Magister</Link>
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
            <Link to="/students">Klassen</Link>
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
            <Link to="/planning">Planning</Link>
          </NavigationMenuLink>
        </NavigationMenuItem>
      </NavigationMenuList>
    </NavigationMenuBase>
  );
}
