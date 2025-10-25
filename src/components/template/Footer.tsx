import { useTranslation } from "react-i18next";

export default function Footer() {
  const { t } = useTranslation();

  return (
    <footer className="font-tomorrow text-muted-foreground inline-flex justify-between text-[0.7rem] uppercase">
      <p>{t("footerMadeBy")}</p>
      <p>{t("footerPoweredBy")}</p>
    </footer>
  );
}
