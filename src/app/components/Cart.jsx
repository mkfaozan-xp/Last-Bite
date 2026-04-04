import { useState } from "react"
import { motion } from "motion/react"
import { ShoppingCart, Trash2, Plus, Minus } from "lucide-react"
import { Button } from "./ui/button"
import { Card, CardContent } from "./ui/card"
import { Badge } from "./ui/badge"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "./ui/dialog"
import { useApp } from "../contexts/AppContext"
import { toast } from "sonner"
import { placeOrder } from "../../services/orderService"

export function Cart() {
  const {
    cart,
    removeFromCart,
    clearCart,
    walletBalance,
    setWalletBalance,
    addOrder,
    addTransaction,
    currentUser
  } = useApp()
  const [isOpen, setIsOpen] = useState(false)
  const [quantities, setQuantities] = useState(
    cart.reduce((acc, item) => ({ ...acc, [item.id]: 1 }), {})
  )

  const updateQuantity = (itemId, change) => {
    setQuantities(prev => ({
      ...prev,
      [itemId]: Math.max(1, (prev[itemId] || 1) + change)
    }))
  }

  const total = cart.reduce(
    (sum, item) => sum + item.discountedPrice * (quantities[item.id] || 1),
    0
  )
  const savings = cart.reduce(
    (sum, item) =>
      sum +
      (item.originalPrice - item.discountedPrice) * (quantities[item.id] || 1),
    0
  )

  const handleCheckout = async () => {
    if (!currentUser) {
      toast.error("Please login to place an order");
      return;
    }

    if (total > walletBalance) {
      toast.error("Insufficient wallet balance!", {
        description: `Please add ₹${total - walletBalance} to your wallet`
      })
      return
    }

    try {
      const now = new Date();
      const pickupStart = new Date(now.getTime() + 30 * 60000);
      const pickupEnd = new Date(now.getTime() + 60 * 60000);
      const formatTime = (d) => d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      const dynamicPickupTime = `Today, ${formatTime(pickupStart)} - ${formatTime(pickupEnd)}`;

      const orderParams = {
        customerId: currentUser.uid,
        customerName: currentUser.name || "Customer",
        restaurantId: cart[0]?.restaurantId || "unknown",
        restaurantName: cart[0]?.restaurantName || "Restaurant",
        items: cart.map(item => ({
          foodItemId: item.id,
          name: item.name,
          price: item.discountedPrice * (quantities[item.id] || 1),
          quantity: quantities[item.id] || 1,
        })),
        pickupTime: dynamicPickupTime,
        address: "Store Pickup",
        useWallet: true
      };

      await placeOrder(orderParams);

      clearCart();
      setIsOpen(false);
      toast.success("Order placed successfully!", {
        description: `You saved ₹${savings} on this order!`
      });
    } catch (err) {
      toast.error("Failed to place order: " + err.message);
    }
  }

  return (
    <>
      {/* Floating Cart Button */}
      <motion.div
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        className="fixed bottom-20 md:bottom-6 right-6 z-40"
      >
        <Button
          onClick={() => setIsOpen(true)}
          size="lg"
          className="relative h-16 w-16 rounded-full bg-gradient-to-r from-green-600 to-orange-600 hover:from-green-700 hover:to-orange-700 shadow-2xl"
        >
          <ShoppingCart className="h-6 w-6" />
          {cart.length > 0 && (
            <Badge className="absolute -top-2 -right-2 h-7 w-7 rounded-full bg-red-500 flex items-center justify-center p-0">
              {cart.length}
            </Badge>
          )}
        </Button>
      </motion.div>

      {/* Cart Dialog */}
      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-2xl">
              <ShoppingCart className="h-6 w-6" />
              Your Cart
              <Badge variant="secondary">{cart.length} items</Badge>
            </DialogTitle>
          </DialogHeader>

          {cart.length === 0 ? (
            <div className="text-center py-12">
              <ShoppingCart className="h-16 w-16 mx-auto text-muted-foreground mb-4" />
              <p className="text-lg font-semibold mb-2">Your cart is empty</p>
              <p className="text-muted-foreground">
                Add some delicious food to get started!
              </p>
            </div>
          ) : (
            <div className="space-y-6">
              {/* Cart Items */}
              <div className="space-y-4">
                {cart.map(item => (
                  <Card key={item.id}>
                    <CardContent className="p-4">
                      <div className="flex gap-4">
                        <img
                          src={item.image}
                          alt={item.name}
                          className="w-20 h-20 rounded-lg object-cover"
                        />
                        <div className="flex-1 space-y-2">
                          <div className="flex items-start justify-between">
                            <div>
                              <h4 className="font-bold">{item.name}</h4>
                              <p className="text-sm text-muted-foreground">
                                {item.restaurantName}
                              </p>
                            </div>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => removeFromCart(item.id)}
                              className="text-red-600 hover:text-red-700 hover:bg-red-50"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>

                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                              <Button
                                variant="outline"
                                size="icon"
                                className="h-8 w-8"
                                onClick={() => updateQuantity(item.id, -1)}
                              >
                                <Minus className="h-4 w-4" />
                              </Button>
                              <span className="font-bold w-8 text-center">
                                {quantities[item.id] || 1}
                              </span>
                              <Button
                                variant="outline"
                                size="icon"
                                className="h-8 w-8"
                                onClick={() => updateQuantity(item.id, 1)}
                              >
                                <Plus className="h-4 w-4" />
                              </Button>
                            </div>

                            <div className="text-right">
                              <p className="text-lg font-bold text-green-600">
                                ₹
                                {item.discountedPrice *
                                  (quantities[item.id] || 1)}
                              </p>
                              <p className="text-xs text-muted-foreground line-through">
                                ₹
                                {item.originalPrice *
                                  (quantities[item.id] || 1)}
                              </p>
                            </div>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>

              {/* Summary */}
              <Card className="bg-gradient-to-br from-green-50 to-orange-50 dark:from-green-950/20 dark:to-orange-950/20 border-2 border-green-200 dark:border-green-900">
                <CardContent className="p-6 space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-muted-foreground">Subtotal</span>
                    <span className="font-semibold">₹{total}</span>
                  </div>
                  <div className="flex justify-between items-center text-green-600">
                    <span className="font-medium">You're saving</span>
                    <span className="font-bold text-lg">₹{savings}</span>
                  </div>
                  <div className="border-t pt-3 flex justify-between items-center">
                    <span className="font-bold text-lg">Total</span>
                    <span className="font-bold text-2xl text-green-600">
                      ₹{total}
                    </span>
                  </div>
                  <div className="bg-white dark:bg-gray-900 rounded-lg p-3 text-sm">
                    <p className="text-muted-foreground">
                      Wallet Balance: ₹{walletBalance}
                    </p>
                    {total > walletBalance && (
                      <p className="text-red-600 font-medium mt-1">
                        Insufficient balance! Add ₹{total - walletBalance} more
                      </p>
                    )}
                  </div>
                </CardContent>
              </Card>

              {/* Checkout Button */}
              <div className="flex gap-3">
                <Button
                  variant="outline"
                  onClick={clearCart}
                  className="flex-1"
                >
                  Clear Cart
                </Button>
                <Button
                  onClick={handleCheckout}
                  disabled={total > walletBalance}
                  className="flex-1 bg-gradient-to-r from-green-600 to-orange-600 hover:from-green-700 hover:to-orange-700 text-lg h-12"
                >
                  Place Order • ₹{total}
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  )
}
