import React from "react";
import NavigationMenu from "@/components/template/NavigationMenu";
import { useRouter } from "@tanstack/react-router";

export default function BaseLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const currentPath = router.state.location.pathname;
  
  // Don't show navigation for editor page
  const showNavigation = currentPath !== "/editor";

  return (
    <>
      {showNavigation && <NavigationMenu />}
      <main className={showNavigation ? "h-screen pb-10 p-2" : "h-screen"}>{children}</main>
    </>
  );
}
