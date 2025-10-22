import React from "react";
import DragWindowRegion from "@/components/DragWindowRegion";
import NavigationMenu from "@/components/template/NavigationMenu";

export default function BaseLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex h-screen flex-col">
      <DragWindowRegion title="myMerlet" />
      <NavigationMenu />
      <main className="flex-1 overflow-auto">{children}</main>
    </div>
  );
}
