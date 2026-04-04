import {
  Home,
  Compass,
  ShoppingBag,
  Wallet,
  User,
  Sun,
  Moon
} from "lucide-react"
import { Link, useLocation } from "react-router"
import { useTheme } from "next-themes"
import { useApp } from "../contexts/AppContext"
import { Button } from "./ui/button"

export function Navigation() {
  const location = useLocation()
  const { theme, setTheme } = useTheme()
  const { walletBalance, rewardsPoints, userAvatar, userType } = useApp()

  const navItems = [
    { path: "/home", icon: Home, label: "Home" },
    { path: "/explore", icon: Compass, label: "Explore" },
    { path: "/orders", icon: ShoppingBag, label: "Orders" },
    { path: "/wallet", icon: Wallet, label: "Wallet" },
    { path: "/profile", icon: User, label: "Profile" }
  ]

  // Show different home based on user type
  const getHomeLink = () => {
    if (userType === "restaurant") return "/restaurant-dashboard"
    if (userType === "ngo") return "/ngo-dashboard"
    return "/home"
  }

  // Update nav items based on user type
  const getNavItems = () => {
    if (userType === "restaurant") {
      return [
        { path: "/restaurant-dashboard", icon: Home, label: "Dashboard" },
        { path: "/orders", icon: ShoppingBag, label: "Orders" },
        { path: "/profile", icon: User, label: "Profile" }
      ]
    }
    if (userType === "ngo") {
      return [
        { path: "/ngo-dashboard", icon: Home, label: "My NGO" },
        { path: "/profile", icon: User, label: "Profile" }
      ]
    }
    return navItems
  }

  const displayNavItems = getNavItems()

  return (
    <nav className="sticky top-0 z-50 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container mx-auto flex h-16 items-center justify-between px-4">
        {/* Logo */}
        <Link to={getHomeLink()} className="flex items-center gap-2">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-br from-green-500 to-orange-500">
            <span className="font-bold text-white text-xl">LB</span>
          </div>
          <span className="font-bold text-xl bg-gradient-to-r from-green-600 to-orange-600 bg-clip-text text-transparent">
            LastBite
          </span>
        </Link>

        {/* Navigation Items - Desktop */}
        <div className="hidden md:flex items-center gap-6">
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

        {/* Right Section */}
        <div className="flex items-center gap-4">
          {/* Wallet & Points Display - Only show for customers */}
          {userType === "customer" && (
            <div className="hidden lg:flex items-center gap-4">
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

          {/* User Avatar */}
          <Link to="/profile">
            <img
              src={userAvatar}
              alt="Profile"
              className="h-10 w-10 rounded-full border-2 border-green-500 hover:border-orange-500 transition-colors cursor-pointer object-cover"
            />
          </Link>
        </div>
      </div>

      {/* Mobile Navigation */}
      <div className="md:hidden fixed bottom-0 left-0 right-0 z-50 border-t bg-background">
        <div className="flex items-center justify-around py-2">
          {displayNavItems.map(item => {
            const isActive = location.pathname === item.path
            return (
              <Link
                key={item.path}
                to={item.path}
                className={`flex flex-col items-center gap-1 px-3 py-2 rounded-lg transition-all ${
                  isActive ? "text-green-600" : "text-muted-foreground"
                }`}
              >
                <item.icon className="h-5 w-5" />
                <span className="text-xs">{item.label}</span>
              </Link>
            )
          })}
        </div>
      </div>
    </nav>
  )
}
