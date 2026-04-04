// src/pages/Orders.jsx
import React, { useState } from 'react';
import { motion } from 'motion/react';
import { Package, CheckCircle, Clock, XCircle, MapPin, Phone, Train, Receipt, Star } from 'lucide-react';
import { Navigation } from '../components/Navigation';
import { Card, CardContent } from '../components/ui/card';
import { Badge } from '../components/ui/badge';
import { Button } from '../components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
import { useApp } from '../contexts/AppContext';
import { updateOrderStatus, cancelOrder, rateOrder } from '../../services/orderService';
import { toast } from 'sonner';

export default function Orders() {
  const { orders, currentUser, userType } = useApp();
  const [ratingMap, setRatingMap] = useState({});

  const activeOrders = orders.filter(o => !['delivered', 'cancelled', 'picked_up'].includes(o.status));
  const pastOrders   = orders.filter(o =>  ['delivered', 'cancelled', 'picked_up'].includes(o.status));

  const getStatusColor = (status) => {
    const map = {
      delivered: 'bg-green-500', confirmed: 'bg-blue-500',
      pending: 'bg-orange-500',  cancelled: 'bg-red-500',
      ready: 'bg-teal-500',      picked_up: 'bg-purple-500',
    };
    return map[status] ?? 'bg-gray-500';
  };

  const getStatusIcon = (status) => {
    if (status === 'delivered' || status === 'picked_up') return <CheckCircle className="h-5 w-5" />;
    if (status === 'cancelled') return <XCircle className="h-5 w-5" />;
    return <Clock className="h-5 w-5" />;
  };

  const handleCancel = async (orderId) => {
    try {
      await cancelOrder(orderId);
      toast.success('Order cancelled. Refund initiated if applicable.');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to cancel order');
    }
  };

  const handleRate = async (orderId, rating) => {
    try {
      await rateOrder(orderId, rating);
      setRatingMap(prev => ({ ...prev, [orderId]: rating }));
      toast.success('Thanks for your rating! ⭐');
    } catch {
      toast.error('Failed to submit rating');
    }
  };

  const handleUpdateStatus = async (orderId, status, message) => {
    try {
      await updateOrderStatus(orderId, status);
      toast.success(message);
    } catch (error) {
      toast.error('Failed to update order');
    }
  };

  const OrderCard = ({ order, isPast }) => (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
      <Card className={`hover:shadow-lg transition-shadow ${!isPast ? 'border-2' : ''}`}>
        <CardContent className="p-6">
          <div className="space-y-4">
            {/* Header */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className={`p-2 rounded-full ${getStatusColor(order.status)} text-white`}>
                  {getStatusIcon(order.status)}
                </div>
                <div>
                  <h3 className="font-bold text-lg">#{order.id.slice(-6).toUpperCase()}</h3>
                  <p className="text-xs text-muted-foreground">
                    {order.createdAt?.toLocaleDateString()} at {order.createdAt?.toLocaleTimeString()}
                  </p>
                </div>
              </div>
              <Badge className={getStatusColor(order.status)}>
                {order.status.replace('_', ' ').toUpperCase()}
              </Badge>
            </div>

            {/* Restaurant */}
            <div className="bg-gradient-to-r from-green-50 to-orange-50 dark:from-green-950/20 dark:to-orange-950/20 rounded-lg p-4">
              <p className="font-semibold text-lg">{order.restaurantName}</p>
              <div className="flex items-center gap-2 text-sm text-muted-foreground mt-1">
                <Clock className="h-4 w-4" />
                <span>Pickup: {order.pickupTime}</span>
              </div>
            </div>

            {/* Items */}
            <div className="space-y-2">
              {order.items.map((item, idx) => (
                <div key={idx} className="flex justify-between items-center text-sm">
                  <span>{item.name} × {item.quantity}</span>
                  <span className="font-medium">₹{item.price}</span>
                </div>
              ))}
              <div className="flex justify-between font-bold text-lg pt-2 border-t">
                <span>Total</span>
                <span className="text-green-600">₹{order.total}</span>
              </div>
              {order.cashback > 0 && (
                <div className="flex justify-between text-sm text-green-600">
                  <span>Cashback earned</span>
                  <span>₹{order.cashback}</span>
                </div>
              )}
            </div>

            {/* Train delivery badge */}
            {order.trainDelivery && (
              <div className="bg-blue-50 dark:bg-blue-950/20 rounded-lg p-4 flex items-start gap-3">
                <Train className="h-5 w-5 text-blue-600 mt-0.5" />
                <div>
                  <p className="font-semibold text-blue-900 dark:text-blue-100">Train Delivery</p>
                  <p className="text-sm text-muted-foreground">
                    Train: {order.trainDelivery.trainNumber} | Seat: {order.trainDelivery.seat}
                  </p>
                  <p className="text-sm text-muted-foreground">Station: {order.trainDelivery.station}</p>
                </div>
              </div>
            )}

            {/* Actions for active orders */}
            {!isPast && userType !== 'restaurant' && (
              <div className="flex gap-3 pt-2">
                <Button variant="outline" className="flex-1" size="sm">
                  <Phone className="h-4 w-4 mr-2" /> Contact Restaurant
                </Button>
                <Button variant="outline" className="flex-1" size="sm">
                  <MapPin className="h-4 w-4 mr-2" /> View Location
                </Button>
                {order.status === 'pending' && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleCancel(order.id)}
                    className="border-red-300 text-red-600 hover:bg-red-50"
                  >
                    Cancel
                  </Button>
                )}
              </div>
            )}
            
            {!isPast && userType === 'restaurant' && (
              <div className="flex gap-3 pt-2">
                {order.status === 'pending' && (
                  <>
                    <Button size="sm" variant="outline" onClick={() => handleCancel(order.id)} className="flex-1 border-red-300 text-red-600 hover:bg-red-50">
                      Cancel
                    </Button>
                    <Button size="sm" onClick={() => handleUpdateStatus(order.id, 'confirmed', 'Order Confirmed!')} className="flex-1 bg-green-600 text-white">
                      Confirm
                    </Button>
                  </>
                )}
                {order.status === 'confirmed' && (
                  <Button size="sm" onClick={() => handleUpdateStatus(order.id, 'ready', 'Order marked Ready!')} className="flex-1 bg-teal-600 text-white">
                    Mark Ready
                  </Button>
                )}
                {order.status === 'ready' && (
                  <Button size="sm" onClick={() => handleUpdateStatus(order.id, 'picked_up', 'Order Picked Up!')} className="flex-1 bg-blue-600 text-white">
                    Mark Picked Up
                  </Button>
                )}
              </div>
            )}

            {/* Rating for past delivered orders */}
            {isPast && (order.status === 'delivered' || order.status === 'picked_up') && userType !== 'restaurant' && (
              <div className="pt-2 border-t">
                <p className="text-sm font-medium mb-2">Rate your experience</p>
                <div className="flex gap-1">
                  {[1, 2, 3, 4, 5].map(star => (
                    <button
                      key={star}
                      onClick={() => handleRate(order.id, star)}
                      className="text-2xl hover:scale-110 transition-transform"
                    >
                      <Star className={`h-6 w-6 ${star <= (order.rating ?? ratingMap[order.id] ?? 0) ? 'text-yellow-500 fill-current' : 'text-gray-300'}`} />
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Past order actions */}
            {isPast && userType !== 'restaurant' && (
              <div className="flex gap-3 pt-2">
                <Button variant="outline" className="flex-1" size="sm">
                  <Receipt className="h-4 w-4 mr-2" /> Download Receipt
                </Button>
                <Button variant="outline" className="flex-1" size="sm">
                  Reorder
                </Button>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50/50 via-white to-purple-50/50 dark:from-gray-950 dark:via-gray-900 dark:to-gray-950">
      <Navigation />
      <div className="container mx-auto px-4 py-6 space-y-6">
        <div>
          <h1 className="text-3xl font-bold">My Orders</h1>
          <p className="text-muted-foreground">Track and manage your food orders</p>
        </div>

        <Tabs defaultValue="active" className="w-full">
          <TabsList className="grid w-full max-w-md grid-cols-2">
            <TabsTrigger value="active">Active ({activeOrders.length})</TabsTrigger>
            <TabsTrigger value="past">Past ({pastOrders.length})</TabsTrigger>
          </TabsList>

          <TabsContent value="active" className="space-y-4 mt-6">
            {activeOrders.length === 0 ? (
              <Card>
                <CardContent className="py-16 text-center">
                  <Package className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                  <h3 className="text-lg font-semibold mb-2">No active orders</h3>
                  <p className="text-muted-foreground">Start saving food and money now!</p>
                </CardContent>
              </Card>
            ) : (
              activeOrders.map(order => <OrderCard key={order.id} order={order} isPast={false} />)
            )}
          </TabsContent>

          <TabsContent value="past" className="space-y-4 mt-6">
            {pastOrders.length === 0 ? (
              <Card>
                <CardContent className="py-16 text-center">
                  <Package className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                  <h3 className="text-lg font-semibold mb-2">No past orders yet</h3>
                  <p className="text-muted-foreground">Your completed orders will appear here.</p>
                </CardContent>
              </Card>
            ) : (
              pastOrders.map(order => <OrderCard key={order.id} order={order} isPast={true} />)
            )}
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
