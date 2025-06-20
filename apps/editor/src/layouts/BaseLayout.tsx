import React from "react";
import { useRouter } from "@tanstack/react-router";
import { Toaster } from "sonner";

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
      <main className={showNavigation ? "h-screen pb-10 p-2" : "h-screen"}>{children}</main>
      <Toaster position="top-right" richColors closeButton theme="dark" />
    </>
  );
}
