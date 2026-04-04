import { useEffect } from "react"
import { useNavigate } from "react-router"
import { useApp } from "../contexts/AppContext"

export function DashboardRouter() {
  const navigate = useNavigate()
  const { userType, isAuthenticated } = useApp()

  useEffect(() => {
    if (!isAuthenticated) {
      navigate("/landing")
      return
    }

    if (userType === "customer") {
      navigate("/home")
    } else if (userType === "restaurant") {
      navigate("/restaurant")
    } else if (userType === "ngo") {
      navigate("/ngo")
    }
  }, [userType, isAuthenticated, navigate])

  return null
}
