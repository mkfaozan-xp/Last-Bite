import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  useRef
} from "react"
import { onAuthChange } from "../../services/authService";
import { getUserProfile } from "../../services/userService";
import { listenToTransactions } from "../../services/walletService";
import { listenToUserAlerts } from "../../services/stockAlertService";
import { listenToCustomerOrders, listenToAllRestaurantOrders } from "../../services/orderService";
import { toast } from "sonner";

const AppContext = createContext(undefined)

export const AppProvider = ({ children }) => {
  // ── Firebase auth state ────────────────────────────────────────────────────
  const [firebaseUser, setFirebaseUser] = useState(null)
  const [currentUser, setCurrentUser] = useState(null)
  const [isAuthenticated, setIsAuthenticated] = useState(false)

  // ── User-derived state (synced from Firestore profile) ─────────────────────
  const [walletBalance, setWalletBalance] = useState(0)
  const [rewardsPoints, setRewardsPoints] = useState(0)
  const [userName, setUserName] = useState("")
  const [userAvatar, setUserAvatar] = useState("")
  const [userType, setUserType] = useState(null)

  // ── Real-time Firestore lists ──────────────────────────────────────────────
  const [transactions, setTransactions] = useState([])
  const [stockAlerts, setStockAlerts] = useState([])
  const [orders, setOrders] = useState([])
  const ordersRef = useRef([])

  // ── Client-side cart ───────────────────────────────────────────────────────
  const [cart, setCart] = useState([])

  // ── 1. Listen to Firebase Auth ─────────────────────────────────────────────
  useEffect(() => {
    const unsub = onAuthChange(async fbUser => {
      setFirebaseUser(fbUser)
      if (fbUser) {
        try {
          const profile = await getUserProfile(fbUser.uid)
          if (profile) {
            setCurrentUser(profile)
            setIsAuthenticated(true)
            setWalletBalance(profile.walletBalance ?? 0)
            setRewardsPoints(profile.rewardsPoints ?? 0)
            setUserName(profile.name ?? "")
            setUserAvatar(profile.avatar ?? "")
            setUserType(profile.userType ?? "customer")
          }
        } catch (err) {
          console.error("Failed to load user profile:", err)
        }
      } else {
        // Signed out — reset everything
        setCurrentUser(null)
        setIsAuthenticated(false)
        setWalletBalance(0)
        setRewardsPoints(0)
        setUserName("")
        setUserAvatar("")
        setUserType(null)
        setTransactions([])
        setStockAlerts([])
        setOrders([])
        setCart([])
      }
    })
    return unsub
  }, [])

  useEffect(() => {
    if (!firebaseUser) return
    const unsub = listenToTransactions(firebaseUser.uid, txns => {
      setTransactions(txns)

      if (txns.length > 0) setWalletBalance(txns[0].balance)
    })
    return unsub
  }, [firebaseUser])

  // ── 3. Real-time stock alerts ──────────────────────────────────────────────
  useEffect(() => {
    if (!firebaseUser) return
    const unsub = listenToUserAlerts(firebaseUser.uid, setStockAlerts)
    return unsub
  }, [firebaseUser])

  // ── 4. Real-time orders (customers and restaurants) ───────────────────────
  useEffect(() => {
    if (!firebaseUser || !userType) return;
    
    if (userType === "customer") {
      const unsub = listenToCustomerOrders(firebaseUser.uid, (newOrders) => {
        if (ordersRef.current.length > 0) {
          newOrders.forEach(newO => {
            const oldO = ordersRef.current.find(o => o.id === newO.id);
            if (oldO) {
              if (oldO.status !== 'cancelled' && newO.status === 'cancelled') {
                toast.error(`Order #${newO.id.slice(-6).toUpperCase()} at ${newO.restaurantName} was cancelled by the restaurant.`);
              } else if (oldO.status === 'pending' && newO.status === 'confirmed') {
                toast.success(`Order #${newO.id.slice(-6).toUpperCase()} was confirmed by ${newO.restaurantName}!`);
              } else if (oldO.status === 'confirmed' && newO.status === 'ready') {
                toast.success(`Order #${newO.id.slice(-6).toUpperCase()} is ready for pickup!`);
              }
            }
          });
        }
        ordersRef.current = newOrders;
        setOrders(newOrders);
      });
      return unsub;
    } else if (userType === "restaurant") {
      const unsub = listenToAllRestaurantOrders(firebaseUser.uid, setOrders);
      return unsub;
    }
  }, [firebaseUser, userType])

  // ── Cart helpers ───────────────────────────────────────────────────────────
  const addToCart = useCallback(item => setCart(c => [...c, item]), [])
  const removeFromCart = useCallback(
    id => setCart(c => c.filter(i => i.id !== id)),
    []
  )
  const clearCart = useCallback(() => setCart([]), [])

  // ── Order helpers ──────────────────────────────────────────────────────────
  // addOrder is kept for backward-compat; real orders arrive via the listener
  const addOrder = useCallback(o => setOrders(prev => [o, ...prev]), [])
  const addTransaction = useCallback(t => setTransactions(p => [t, ...p]), [])
  const addStockAlert = useCallback(a => setStockAlerts(p => [...p, a]), [])
  const updateStockAlert = useCallback(
    (id, status) =>
      setStockAlerts(p => p.map(a => (a.id === id ? { ...a, status } : a))),
    []
  )

  return (
    <AppContext.Provider
      value={{
        userType,
        setUserType,
        isAuthenticated,
        setIsAuthenticated,
        currentUser,
        walletBalance,
        setWalletBalance,
        transactions,
        addTransaction,
        stockAlerts,
        addStockAlert,
        updateStockAlert,
        rewardsPoints,
        setRewardsPoints,
        userName,
        setUserName,
        userAvatar,
        setUserAvatar,
        cart,
        addToCart,
        removeFromCart,
        clearCart,
        orders,
        addOrder
      }}
    >
      {children}
    </AppContext.Provider>
  )
}

export const useApp = () => {
  const ctx = useContext(AppContext)
  if (!ctx) throw new Error("useApp must be used within AppProvider")
  return ctx
}
