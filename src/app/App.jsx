import { useEffect } from "react"
import { RouterProvider } from "react-router"
import { router } from "./routes"
import { AppProvider } from "./contexts/AppContext"
import { ThemeProvider } from "./contexts/ThemeProvider"
import { Toaster } from "./components/ui/sonner"
import { useExpiryEngine } from "./hooks/useExpiryEngine"

export default function App() {
  useExpiryEngine();

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (window.location.hostname !== "127.0.0.1") return;

    const nextUrl = new URL(window.location.href);
    nextUrl.hostname = "localhost";
    window.location.replace(nextUrl.toString());
  }, []);

  return (
    <ThemeProvider attribute="class" defaultTheme="light" enableSystem>
      <AppProvider>
        <RouterProvider router={router} />
        <Toaster position="top-right" richColors />
      </AppProvider>
    </ThemeProvider>
  )
}
