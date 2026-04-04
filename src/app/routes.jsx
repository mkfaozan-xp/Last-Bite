import { createBrowserRouter, Navigate } from "react-router"
import Landing from "./pages/Landing"
import CustomerDashboard from "./pages/CustomerDashboard"
import RestaurantDashboard from "./pages/RestaurantDashboard"
import NGODashboard from "./pages/NGODashboard"
import Orders from "./pages/Orders"
import Wallet from "./pages/Wallet"
import Profile from "./pages/Profile"
import Explore from "./pages/Explore"
import FoodQualityPage from "./pages/FoodQualityPage"


export const router = createBrowserRouter([
  {
    path: "/",
    element: <Navigate to="/landing" replace />
  },
  {
    path: "/landing",
    element: <Landing />
  },
  {
    path: "/home",
    element: <CustomerDashboard />
  },
  {
    path: "/restaurant-dashboard",
    element: <RestaurantDashboard />
  },
  {
    path: "/ngo-dashboard",
    element: <NGODashboard />
  },
  {
    path: "/food-scanner",
    element: <FoodQualityPage />
  },
  {
    path: "/explore",
    element: <Explore />
  },
  {
    path: "/orders",
    element: <Orders />
  },
  {
    path: "/wallet",
    element: <Wallet />
  },
  {
    path: "/profile",
    element: <Profile />
  },
  {
    path: "*",
    element: <Navigate to="/landing" replace />
  }
])
