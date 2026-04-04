import {
  Home,
  Compass,
  ShoppingBag,
  Wallet,
  User,
  Sun,
  Moon,
  Microscope
} from "lucide-react"
import { Link, useLocation } from "react-router"
import { useTheme } from "next-themes"
import { useApp } from "../contexts/AppContext"
import { Button } from "./ui/button"

export function Navigation() {
  const location = useLocation()
  const { theme, setTheme } = useTheme()
  const { walletBalance, rewardsPoints, userAvatar, userName, userType } = useApp()

  const navItems = [
    { path: "/home", icon: Home, label: "Home" },
    { path: "/explore", icon: Compass, label: "Explore" },
    { path: "/food-scanner", icon: Microscope, label: "AI Scanner" },
    { path: "/orders", icon: ShoppingBag, label: "Orders" },
    { path: "/wallet", icon: Wallet, label: "Wallet" },
    { path: "/profile", icon: User, label: "Profile" }
  ]

  const inferUserTypeFromPath = () => {
    if (location.pathname.startsWith("/restaurant-dashboard")) return "restaurant"
    if (location.pathname.startsWith("/ngo-dashboard")) return "ngo"
    if (
      location.pathname.startsWith("/home") ||
      location.pathname.startsWith("/explore") ||
      location.pathname.startsWith("/orders") ||
      location.pathname.startsWith("/wallet")
    ) {
      return "customer"
    }
    return null
  }

  const resolvedUserType = userType ?? inferUserTypeFromPath()

  const getInitials = () => {
    const label = userName?.trim() || resolvedUserType || "LB"
    return label
      .split(/\s+/)
      .map(part => part[0]?.toUpperCase())
      .join("")
      .slice(0, 2)
  }

  const getHomeLink = () => {
    if (resolvedUserType === "restaurant") return "/restaurant-dashboard"
    if (resolvedUserType === "ngo") return "/ngo-dashboard"
    return "/home"
  }

  const getNavItems = () => {
    if (resolvedUserType === "restaurant") {
      return [
        { path: "/restaurant-dashboard", icon: Home, label: "Dashboard" },
        { path: "/food-scanner", icon: Microscope, label: "AI Scanner" },
        { path: "/orders", icon: ShoppingBag, label: "Orders" },
        { path: "/profile", icon: User, label: "Profile" }
      ]
    }
    if (resolvedUserType === "ngo") {
      return [
        { path: "/ngo-dashboard", icon: Home, label: "My NGO" },
        { path: "/food-scanner", icon: Microscope, label: "AI Scanner" },
        { path: "/profile", icon: User, label: "Profile" }
      ]
    }
    if (resolvedUserType === "customer") return navItems
    return [{ path: getHomeLink(), icon: Home, label: "Dashboard" }]
  }

  const displayNavItems = getNavItems()

  return (
    <nav className="sticky top-0 z-50 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container mx-auto flex min-h-16 flex-wrap items-center justify-between gap-3 px-4 py-3">
        <Link to={getHomeLink()} className="flex min-w-0 items-center gap-2">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-br from-green-500 to-orange-500">
            <span className="font-bold text-white text-xl">LB</span>
          </div>
          <span className="truncate bg-gradient-to-r from-green-600 to-orange-600 bg-clip-text text-lg font-bold text-transparent sm:text-xl">
            LastBite
          </span>
        </Link>

        <div className="hidden md:flex flex-1 items-center justify-center gap-3 lg:gap-6">
          {displayNavItems.map(item => {
            const isActive = location.pathname === item.path
            return (
              <Link
                key={item.path}
                to={item.path}
                className={`flex items-center gap-2 px-3 py-2 rounded-lg transition-all ${
                  isActive
                    ? "bg-gradient-to-r from-green-500 to-orange-500 text-white"
                    : "text-muted-foreground hover:text-foreground hover:bg-accent"
                }`}
              >
                <item.icon className="h-5 w-5" />
                <span>{item.label}</span>
              </Link>
            )
          })}
        </div>

        <div className="ml-auto flex items-center gap-2 sm:gap-3">
          {resolvedUserType === "customer" && (
            <div className="hidden xl:flex items-center gap-3">
              <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-green-500/10 border border-green-500/20">
                <Wallet className="h-4 w-4 text-green-600" />
                <span className="font-semibold">₹{walletBalance}</span>
              </div>
              <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-orange-500/10 border border-orange-500/20">
                <span className="text-orange-600">🏆</span>
                <span className="font-semibold">{rewardsPoints} pts</span>
              </div>
            </div>
          )}

          {/* Theme Toggle */}
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
            className="rounded-full"
          >
            <Sun className="h-5 w-5 rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
            <Moon className="absolute h-5 w-5 rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
            <span className="sr-only">Toggle theme</span>
          </Button>

          <Link to="/profile">
            {userAvatar ? (
              <img
                src={userAvatar}
                alt="Profile"
                className="h-10 w-10 rounded-full border-2 border-green-500 object-cover transition-colors hover:border-orange-500"
              />
            ) : (
              <div className="flex h-10 w-10 items-center justify-center rounded-full border-2 border-green-500 bg-gradient-to-br from-green-500/10 to-orange-500/10 font-semibold text-green-700 transition-colors hover:border-orange-500">
                {getInitials()}
              </div>
            )}
          </Link>
        </div>
      </div>

      <div className="md:hidden fixed bottom-0 left-0 right-0 z-50 border-t bg-background/95 px-2 pb-[max(0.5rem,env(safe-area-inset-bottom))] pt-2 backdrop-blur supports-[backdrop-filter]:bg-background/85">
        <div className="flex items-center justify-between gap-1 overflow-x-auto">
          {displayNavItems.map(item => {
            const isActive = location.pathname === item.path
            return (
              <Link
                key={item.path}
                to={item.path}
                className={`flex min-w-[58px] flex-1 flex-col items-center gap-1 rounded-xl px-2 py-2 transition-all ${
                  isActive ? "bg-green-500/10 text-green-600" : "text-muted-foreground"
                }`}
              >
                <item.icon className="h-5 w-5" />
                <span className="text-[10px] font-medium leading-tight text-center">{item.label}</span>
              </Link>
            )
          })}
        </div>
      </div>
    </nav>
  )
}
