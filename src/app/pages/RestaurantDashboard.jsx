// src/pages/RestaurantDashboard.jsx
import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { TrendingUp, Package, DollarSign, Clock, Upload, Plus, BarChart3, AlertCircle, Leaf, Microscope, ShieldCheck, ShieldAlert, ShieldX } from 'lucide-react';
import { Navigation } from '../components/Navigation';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Textarea } from '../components/ui/textarea';
import { Badge } from '../components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '../components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar } from 'recharts';
import { Link } from 'react-router';
import { useApp } from '../contexts/AppContext';
import {
  addFoodItem, getRestaurantFoodItems, updateItemPrice, deleteFoodItem,
} from '../../services/foodItemService';
import { listenToRestaurantOrders, updateOrderStatus, cancelOrder } from '../../services/orderService';
import { listenToRestaurantDonations } from '../../services/donationService';
import { getRestaurantDashboardStats } from '../../services/restaurantService';
import { toast } from 'sonner';


export default function RestaurantDashboard() {
  const { currentUser } = useApp();
  const restaurantId = currentUser?.uid ?? '';

  const [showAddDialog, setShowAddDialog] = useState(false);
  const [inventoryItems, setInventoryItems] = useState([]);
  const [liveOrders, setLiveOrders] = useState([]);
  const [donations, setDonations] = useState([]);
  const [stats, setStats] = useState({ todayEarnings: 0, monthlyEarnings: 0, pendingOrders: 0, totalItems: 0 });
  const [newPrices, setNewPrices] = useState({});
  const [imageFile, setImageFile] = useState(null);
  const [addLoading, setAddLoading] = useState(false);

  // Add item form state
  const [form, setForm] = useState({
    name: '',
    originalPrice: '',
    discountedPrice: '',
    quantity: '',
    category: 'fast-food',
    expiryHours: '',
    description: '',
    isVeg: true,
  });

  const earningsData = [
    { day: 'Mon', earnings: stats.monthlyEarnings * 0.12 },
    { day: 'Tue', earnings: stats.monthlyEarnings * 0.14 },
    { day: 'Wed', earnings: stats.monthlyEarnings * 0.16 },
    { day: 'Thu', earnings: stats.monthlyEarnings * 0.15 },
    { day: 'Fri', earnings: stats.monthlyEarnings * 0.18 },
    { day: 'Sat', earnings: stats.monthlyEarnings * 0.13 },
    { day: 'Sun', earnings: stats.todayEarnings },
  ].map(d => ({ ...d, earnings: Math.round(d.earnings) }));

  const demandPrediction = [
    { time: '6 PM', demand: 20 },
    { time: '7 PM', demand: 45 },
    { time: '8 PM', demand: 70 },
    { time: '9 PM', demand: 55 },
    { time: '10 PM', demand: 30 },
  ];


  useEffect(() => {
    if (!restaurantId) return;

    // Load inventory
    getRestaurantFoodItems(restaurantId).then(setInventoryItems).catch(console.error);

    // Load stats
    getRestaurantDashboardStats(restaurantId).then(setStats).catch(console.error);

    // Real-time live orders
    const unsub = listenToRestaurantOrders(restaurantId, (orders) => {
      setLiveOrders(orders);
      setStats(prev => ({ ...prev, pendingOrders: orders.filter(o => o.status === 'pending').length }));
    });

    // Real-time donations
    const unsubDonations = listenToRestaurantDonations(restaurantId, (docs) => {
      setDonations(docs);
    });

    return () => {
      unsub();
      unsubDonations();
    };
  }, [restaurantId]);

  // ── Add food item ──────────────────────────────────────────────────────────
  const handleAddItem = async () => {
    if (!form.name || !form.originalPrice || !form.discountedPrice || !form.quantity || !form.expiryHours) {
      toast.error('Please fill in all required fields');
      return;
    }
    setAddLoading(true);
    try {
      await addFoodItem(
        {
          restaurantId,
          restaurantName: currentUser?.name ?? 'Restaurant',
          name: form.name,
          description: form.description,
          category: form.category,
          originalPrice: Number(form.originalPrice),
          discountedPrice: Number(form.discountedPrice),
          quantity: Number(form.quantity),
          expiryHours: Number(form.expiryHours),
          batchId: `B${Date.now()}`,
          rating: 0,
          isAvailable: true,
          isDonation: false,
          isVeg: form.isVeg,
        },
        imageFile ?? undefined
      );
      toast.success('Item added to platform! 🎉');
      setShowAddDialog(false);
      setForm({ name: '', originalPrice: '', discountedPrice: '', quantity: '', category: 'fast-food', expiryHours: '', description: '', isVeg: true });
      setImageFile(null);
      // Refresh inventory
      const items = await getRestaurantFoodItems(restaurantId);
      console.log(items);
      setInventoryItems(items);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to add item');
    } finally {
      setAddLoading(false);
    }
  };

  // ── Update price ───────────────────────────────────────────────────────────
  const handlePriceUpdate = async (itemId) => {
    const newPrice = Number(newPrices[itemId]);
    if (!newPrice || newPrice <= 0) {
      toast.error('Enter a valid price');
      return;
    }
    try {
      await updateItemPrice(itemId, newPrice);
      setInventoryItems(prev => prev.map(i => i.id === itemId ? { ...i, discountedPrice: newPrice } : i));
      setNewPrices(prev => ({ ...prev, [itemId]: '' }));
      toast.success('Price updated dynamically! 📈');
    } catch (error) {
      toast.error('Failed to update price');
    }
  };

  // ── Confirm order ──────────────────────────────────────────────────────────
  const handleConfirmOrder = async (orderId) => {
    try {
      await updateOrderStatus(orderId, 'confirmed');
      toast.success('Order confirmed!');
    } catch (error) {
      toast.error('Failed to confirm order');
    }
  };

  // ── Mark ready ─────────────────────────────────────────────────────────────
  const handleMarkReady = async (orderId) => {
    try {
      await updateOrderStatus(orderId, 'ready');
      toast.success('Order marked as ready for pickup!');
    } catch (error) {
      toast.error('Failed to update order');
    }
  };

  // ── Cancel Order ───────────────────────────────────────────────────────────
  const handleCancelOrder = async (orderId) => {
    try {
      await cancelOrder(orderId);
      toast.success('Order cancelled. Refund initiated if applicable.');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to cancel order');
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50/50 via-white to-purple-50/50 dark:from-gray-950 dark:via-gray-900 dark:to-gray-950">
      <Navigation />

      <div className="container mx-auto space-y-6 px-4 pb-24 pt-4 md:py-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-3xl font-bold">Restaurant Dashboard</h1>
            <p className="text-muted-foreground">Manage your inventory and earnings</p>
          </div>
          <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
            <DialogTrigger asChild>
              <Button className="bg-gradient-to-r from-blue-600 to-purple-600">
                <Plus className="h-4 w-4 mr-2" /> Add New Item
              </Button>
            </DialogTrigger>
            <DialogContent className="max-h-[90vh] overflow-y-auto">
              <DialogHeader><DialogTitle>Add New Food Item</DialogTitle></DialogHeader>
              <div className="space-y-4">
                <div>
                  <Label>Item Name *</Label>
                  <Input placeholder="e.g., Margherita Pizza" value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))} />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Original Price (₹) *</Label>
                    <Input type="number" placeholder="399" value={form.originalPrice} onChange={e => setForm(p => ({ ...p, originalPrice: e.target.value }))} />
                  </div>
                  <div>
                    <Label>Discounted Price (₹) *</Label>
                    <Input type="number" placeholder="199" value={form.discountedPrice} onChange={e => setForm(p => ({ ...p, discountedPrice: e.target.value }))} />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Quantity *</Label>
                    <Input type="number" placeholder="10" value={form.quantity} onChange={e => setForm(p => ({ ...p, quantity: e.target.value }))} />
                  </div>
                  <div>
                    <Label>Expiry (hours) *</Label>
                    <Input type="number" placeholder="3" value={form.expiryHours} onChange={e => setForm(p => ({ ...p, expiryHours: e.target.value }))} />
                  </div>
                </div>
                <div>
                  <Label>Category</Label>
                  <Select value={form.category} onValueChange={v => setForm(p => ({ ...p, category: v }))}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="fast-food">Fast Food</SelectItem>
                      <SelectItem value="indian">Indian</SelectItem>
                      <SelectItem value="dessert">Dessert</SelectItem>
                      <SelectItem value="healthy">Healthy</SelectItem>
                      <SelectItem value="other">Other</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Type</Label>
                  <div className="flex gap-3 mt-1">
                    <button
                      onClick={() => setForm(p => ({ ...p, isVeg: true }))}
                      className={`flex-1 py-2 rounded-lg border-2 text-sm font-medium transition-colors ${form.isVeg ? 'border-green-500 bg-green-50 text-green-700' : 'border-muted'}`}
                    >🥗 Vegetarian</button>
                    <button
                      onClick={() => setForm(p => ({ ...p, isVeg: false }))}
                      className={`flex-1 py-2 rounded-lg border-2 text-sm font-medium transition-colors ${!form.isVeg ? 'border-red-500 bg-red-50 text-red-700' : 'border-muted'}`}
                    >🍗 Non-Vegetarian</button>
                  </div>
                </div>
                <div>
                  <Label>Description</Label>
                  <Textarea placeholder="Brief description..." value={form.description} onChange={e => setForm(p => ({ ...p, description: e.target.value }))} />
                </div>
                <div>
                  <Label>Item Photo</Label>
                  <div className="mt-1">
                    <label className="flex items-center justify-center gap-2 w-full h-24 border-2 border-dashed rounded-lg cursor-pointer hover:border-blue-400 hover:bg-blue-50 dark:hover:bg-blue-950/20 transition-colors">
                      <Upload className="h-5 w-5 text-muted-foreground" />
                      <span className="text-sm text-muted-foreground">
                        {imageFile ? imageFile.name : 'Click to upload image'}
                      </span>
                      <input type="file" accept="image/*" className="hidden" onChange={e => setImageFile(e.target.files?.[0] ?? null)} />
                    </label>
                  </div>
                </div>
                <Button onClick={handleAddItem} disabled={addLoading} className="w-full bg-gradient-to-r from-blue-600 to-purple-600">
                  {addLoading ? 'Adding...' : 'Add Item to Platform'}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        {/* Stats Cards */}
        <div className="grid gap-6 sm:grid-cols-2 xl:grid-cols-4">
          {[
            { label: "Today's Earnings", value: `₹${stats.todayEarnings.toLocaleString()}`, sub: 'Live', color: 'from-green-500 to-green-600', icon: <DollarSign className="h-12 w-12 opacity-50" /> },
            { label: 'Monthly Total', value: `₹${stats.monthlyEarnings.toLocaleString()}`, sub: 'This month', color: 'from-blue-500 to-blue-600', icon: <TrendingUp className="h-12 w-12 opacity-50" /> },
            { label: 'Live Inventory', value: stats.totalItems, sub: 'Active items', color: 'from-purple-500 to-purple-600', icon: <Package className="h-12 w-12 opacity-50" /> },
            { label: 'Pending Orders', value: stats.pendingOrders, sub: 'Confirm now', color: 'from-orange-500 to-orange-600', icon: <Clock className="h-12 w-12 opacity-50" /> },
          ].map((s, i) => (
            <motion.div key={i} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.1 }}>
              <Card className={`bg-gradient-to-br ${s.color} text-white`}>
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-white/80 text-sm">{s.label}</p>
                      <p className="text-3xl font-bold mt-2">{s.value}</p>
                      <p className="text-white/80 text-sm mt-1">{s.sub}</p>
                    </div>
                    {s.icon}
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>

        <div className="grid lg:grid-cols-2 gap-6">
          {/* Earnings Chart */}
          <Card>
            <CardHeader><CardTitle>Weekly Earnings</CardTitle></CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={250}>
                <BarChart data={earningsData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="day" />
                  <YAxis />
                  <Tooltip formatter={(v) => [`₹${v}`, 'Earnings']} />
                  <Bar dataKey="earnings" fill="#16a34a" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          {/* AI Demand Prediction */}
          <Card className="border-2 border-purple-200 dark:border-purple-900">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BarChart3 className="h-5 w-5 text-purple-600" />
                AI Demand Prediction
                <Badge className="bg-purple-600">SMART</Badge>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={200}>
                <LineChart data={demandPrediction}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="time" />
                  <YAxis />
                  <Tooltip />
                  <Line type="monotone" dataKey="demand" stroke="#9333ea" strokeWidth={3} dot={{ r: 4 }} />
                </LineChart>
              </ResponsiveContainer>
              <div className="mt-4 p-3 bg-purple-50 dark:bg-purple-950/30 rounded-lg text-sm">
                <strong>AI Suggestion:</strong> Peak demand at 8 PM. Consider pricing surge for high-demand items.
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Live Inventory */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Package className="h-5 w-5" /> Live Inventory & Batch Tracking
              {inventoryItems.length === 0 && (
                <span className="text-sm font-normal text-muted-foreground ml-2">— Add items to get started</span>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {inventoryItems.length === 0 ? (
              <div className="py-12 text-center text-muted-foreground">
                <Package className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>No food items yet. Click "Add New Item" to list your surplus food.</p>
              </div>
            ) : (
              <div className="space-y-4">
                {inventoryItems.map(item => (
                  <div key={item.id} className="flex flex-col gap-4 rounded-lg border p-4 transition-shadow hover:shadow-md xl:flex-row xl:items-center xl:justify-between">
                    <div className="space-y-3">
                      <div className="h-24 w-full overflow-hidden rounded-lg border bg-muted sm:w-32">
                        {item.image ? (
                          <img src={item.image} alt={item.name} className="h-full w-full object-cover" />
                        ) : (
                          <div className="flex h-full w-full items-center justify-center text-3xl">
                            {item.category === 'fast-food' ? '🍔' : item.category === 'indian' ? '🍛' : item.category === 'dessert' ? '🍰' : '🥗'}
                          </div>
                        )}
                      </div>
                      <div className="flex flex-wrap items-center gap-2 sm:gap-3">
                        <h4 className="font-semibold">{item.name}</h4>
                        <Badge variant="secondary">Batch: {item.batchId}</Badge>
                        {item.isVeg && <Badge className="bg-green-600 text-xs">VEG</Badge>}
                        {item.expiryHours < 2 && (
                          <Badge variant="destructive" className="animate-pulse">
                            <AlertCircle className="h-3 w-3 mr-1" /> Expiring Soon!
                          </Badge>
                        )}
                        {!item.isAvailable && <Badge variant="secondary">Sold Out</Badge>}
                      </div>
                      <div className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground sm:gap-4">
                        <span>Qty: {item.quantity} units</span>
                        <span>•</span>
                        <span className="flex items-center gap-1">
                          <Clock className="h-3 w-3" /> {item.expiryHours}h left
                        </span>
                        <span>•</span>
                        <span>Original: ₹{item.originalPrice}</span>
                      </div>
                    </div>
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-end xl:items-center">
                      <div className="text-left sm:text-right">
                        <p className="text-sm text-muted-foreground">Current Price</p>
                        <p className="text-2xl font-bold text-green-600">₹{item.discountedPrice}</p>
                      </div>
                      <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row">
                        <Input
                          type="number"
                          placeholder="New price"
                          className="w-full sm:w-24"
                          value={newPrices[item.id] ?? ''}
                          onChange={e => setNewPrices(prev => ({ ...prev, [item.id]: e.target.value }))}
                        />
                        <Button size="sm" onClick={() => handlePriceUpdate(item.id)} className="bg-blue-600">
                          Update
                        </Button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Donations Section */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Package className="h-5 w-5 text-green-600" />
              Donations Claimed by NGOs
              {donations.filter(d => d.status === 'accepted').length > 0 && (
                <Badge className="bg-green-600 animate-pulse">
                  {donations.filter(d => d.status === 'accepted').length} Accepted
                </Badge>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {donations.length === 0 ? (
              <div className="py-12 text-center text-muted-foreground">
                <Leaf className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>No food donations yet.</p>
              </div>
            ) : (
              <div className="space-y-4">
                {donations.map(donation => (
                  <div key={donation.id} className="space-y-3 rounded-lg border p-4 transition-shadow hover:shadow-sm">
                    <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                      <div className="space-y-1">
                        <div className="flex flex-wrap items-center gap-2 sm:gap-3">
                          <h4 className="font-semibold">#{donation.id.slice(-6).toUpperCase()}</h4>
                          <Badge className={
                            donation.status === 'picked_up' ? 'bg-teal-500' :
                            donation.status === 'accepted' ? 'bg-green-500' : 'bg-orange-500'
                          }>
                            {donation.status.toUpperCase()}
                          </Badge>
                          {/* Quality scan status badges */}
                          {donation.restaurantQualityStatus && (
                            <Badge variant="outline" className={`text-[10px] gap-1 ${
                              donation.restaurantQualityStatus === 'fresh' ? 'text-green-700 border-green-300' :
                              donation.restaurantQualityStatus === 'semi-rotten' ? 'text-amber-700 border-amber-300' :
                              'text-red-700 border-red-300'
                            }`}>
                              {donation.restaurantQualityStatus === 'fresh' ? <ShieldCheck className="h-3 w-3" /> :
                               donation.restaurantQualityStatus === 'semi-rotten' ? <ShieldAlert className="h-3 w-3" /> :
                               <ShieldX className="h-3 w-3" />}
                              🏪 {donation.restaurantQualityStatus === 'fresh' ? 'Fresh' : donation.restaurantQualityStatus === 'semi-rotten' ? 'Caution' : 'Rotten'}
                            </Badge>
                          )}
                          {donation.ngoQualityStatus && (
                            <Badge variant="outline" className={`text-[10px] gap-1 ${
                              donation.ngoQualityStatus === 'fresh' ? 'text-green-700 border-green-300' :
                              donation.ngoQualityStatus === 'semi-rotten' ? 'text-amber-700 border-amber-300' :
                              'text-red-700 border-red-300'
                            }`}>
                              {donation.ngoQualityStatus === 'fresh' ? <ShieldCheck className="h-3 w-3" /> :
                               donation.ngoQualityStatus === 'semi-rotten' ? <ShieldAlert className="h-3 w-3" /> :
                               <ShieldX className="h-3 w-3" />}
                              🤝 NGO: {donation.ngoQualityStatus === 'fresh' ? 'Verified' : donation.ngoQualityStatus === 'semi-rotten' ? 'Caution' : 'Rejected'}
                            </Badge>
                          )}
                        </div>
                        <p className="text-sm font-medium text-green-600">
                          {donation.ngoOrgName || donation.ngoName || 'NGO Partner'}
                        </p>
                        <p className="text-sm text-muted-foreground">
                          Items: {donation.items}
                        </p>
                      </div>
                      <div className="space-y-1 text-left lg:text-right">
                        <p className="text-lg font-bold text-orange-600">{donation.quantity} units</p>
                        <p className="text-xs text-muted-foreground">
                          {donation.status === 'accepted' ? 'Accepted' : 'Updated'}: {donation.updatedAt?.toLocaleTimeString()}
                        </p>
                        {/* Scan before pickup button */}
                        {donation.status === 'accepted' && !donation.restaurantScanId && (
                          <Link to="/food-scanner">
                            <Button size="sm" variant="outline" className="text-xs gap-1.5 mt-1 border-purple-300 text-purple-700 hover:bg-purple-50">
                              <Microscope className="h-3.5 w-3.5" /> Scan Before Pickup
                            </Button>
                          </Link>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Live Orders */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              Recent Orders
              {liveOrders.filter(o => o.status === 'pending').length > 0 && (
                <Badge variant="destructive" className="animate-pulse">
                  {liveOrders.filter(o => o.status === 'pending').length} Pending
                </Badge>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {liveOrders.length === 0 ? (
              <div className="py-12 text-center text-muted-foreground">
                <Clock className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>No active orders right now.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {liveOrders.map(order => (
                  <div key={order.id} className="flex flex-col gap-4 rounded-lg border p-4 transition-shadow hover:shadow-sm lg:flex-row lg:items-center lg:justify-between">
                    <div className="space-y-1">
                      <div className="flex flex-wrap items-center gap-2 sm:gap-3">
                        <h4 className="font-semibold">#{order.id.slice(-6).toUpperCase()}</h4>
                        {order.customerName && (
                          <span className="text-sm font-medium text-blue-600">({order.customerName})</span>
                        )}
                        <Badge className={
                          order.status === 'confirmed' ? 'bg-blue-500' :
                            order.status === 'ready' ? 'bg-teal-500' : 'bg-orange-500'
                        }>
                          {order.status.toUpperCase()}
                        </Badge>
                      </div>
                      <p className="text-sm text-muted-foreground">
                        {order.items.map(item => `${item.name} x${item.quantity}`).join(", ")}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {order.createdAt?.toLocaleTimeString()}
                      </p>
                    </div>
                    <div className="space-y-2 text-left lg:text-right">
                      <p className="text-xl font-bold text-green-600">₹{order.total}</p>
                      {order.status === 'pending' && (
                        <div className="flex flex-col gap-2 w-full max-w-[100px] ml-auto">
                          <Button size="sm" onClick={() => handleConfirmOrder(order.id)} className="bg-green-600 w-full">
                            Confirm
                          </Button>
                          <Button size="sm" variant="outline" onClick={() => handleCancelOrder(order.id)} className="border-red-300 text-red-600 hover:bg-red-50 w-full">
                            Cancel
                          </Button>
                        </div>
                      )}
                      {order.status === 'confirmed' && (
                        <Button size="sm" onClick={() => handleMarkReady(order.id)} className="bg-teal-600">
                          Mark Ready
                        </Button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
