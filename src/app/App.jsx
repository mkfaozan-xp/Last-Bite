import { RouterProvider } from "react-router"
import { router } from "./routes"
import { AppProvider } from "./contexts/AppContext"
import { ThemeProvider } from "./contexts/ThemeProvider"
import { Toaster } from "./components/ui/sonner"
import { useExpiryEngine } from "./hooks/useExpiryEngine"

export default function App() {
  useExpiryEngine();

  return (
    <ThemeProvider attribute="class" defaultTheme="light" enableSystem>
      <AppProvider>
        <RouterProvider router={router} />
        <Toaster position="top-right" richColors />
      </AppProvider>
    </ThemeProvider>
  )
}
