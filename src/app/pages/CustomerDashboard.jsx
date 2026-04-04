import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { Search, Filter, TrendingUp, Clock, MapPin, Star, Leaf, ChevronDown, ShoppingCart, Zap, Award, Target, Globe, TreePine, Lightbulb } from 'lucide-react';
import { Button }       from '../components/ui/button';
import { Input }        from '../components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Badge }        from '../components/ui/badge';
import { Slider }       from '../components/ui/slider';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '../components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
import { Navigation }   from '../components/Navigation';
import { useApp }       from '../contexts/AppContext';
import { toast }        from 'sonner';
import { Cart }         from '../components/Cart';
import { FoodCard }     from '../components/FoodCard';
import { listenToAvailableItems } from '../../services/foodItemService';
import { createStockAlert }       from '../../services/stockAlertService';
import { calculateEcoImpact } from '../../utils/ecoCalculator';

export default function CustomerDashboard() {
  const { addToCart, cart, rewardsPoints, setRewardsPoints, currentUser, orders } = useApp();

  const totalMealsSaved = orders
    .filter(o => o.status !== 'cancelled')
    .reduce((total, order) => {
      const orderQty = (order.items || []).reduce((sum, item) => sum + (item.quantity || 0), 0);
      return total + orderQty;
    }, 0);

  const ecoImpact = calculateEcoImpact(totalMealsSaved);

  const [foodItems,     setFoodItems]     = useState([]);
  const [filteredItems, setFilteredItems] = useState([]);
  const [loading,       setLoading]       = useState(true);
  const [searchQuery,   setSearchQuery]   = useState('');
  const [showFilters,   setShowFilters]   = useState(false);
  const [vegFilter,     setVegFilter]     = useState('all');
  const [priceRange,    setPriceRange]    = useState([0, 5000]);
  const [maxDistance,   setMaxDistance]   = useState(20);
  const [categoryFilter, setCategoryFilter] = useState('all');

  useEffect(() => {
    setLoading(true);
    const unsub = listenToAvailableItems((items) => {
      setFoodItems(items);
      setLoading(false);
    });
    return unsub;
  }, []);

  useEffect(() => {
    let filtered = foodItems.filter(item => {
      const searchLower = searchQuery.toLowerCase();
      const name = item.name || '';
      const restName = item.restaurantName || '';
      const matchesSearch   = name.toLowerCase().includes(searchLower) ||
                              restName.toLowerCase().includes(searchLower);
      const matchesVeg      = vegFilter === 'all' ||
                              (vegFilter === 'veg' && item.isVeg) ||
                              (vegFilter === 'nonveg' && !item.isVeg);
      const matchesPrice    = item.discountedPrice >= priceRange[0] && item.discountedPrice <= priceRange[1];
      const matchesDist     = !item.distance || item.distance <= maxDistance;
      const matchesCat      = categoryFilter === 'all' || item.category === categoryFilter;
      return matchesSearch && matchesVeg && matchesPrice && matchesDist && matchesCat;
    });
    setFilteredItems(filtered);
  }, [searchQuery, foodItems, vegFilter, priceRange, maxDistance, categoryFilter]);

  const handleAddToCart = (item) => {
    addToCart(item);
    toast.success(`${item.name} added to cart!`, { description: `₹${item.discountedPrice} • ${item.restaurantName}` });
  };

  const handleSetStockAlert = async (item, targetPrice) => {
    if (!currentUser || targetPrice <= 0) return;
    try {
      await createStockAlert({
        userId:       currentUser.uid,
        foodItemId:   item.id,
        foodItemName: item.name,
        targetPrice:  targetPrice,
        currentPrice: item.discountedPrice,
      });
      toast.success('Price alert set! 🔔', {
        description: `You'll be notified when ${item.name} drops to ₹${targetPrice}`,
      });
    } catch (err) {
      toast.error('Failed to set alert');
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50/50 via-white to-orange-50/50 dark:from-gray-950 dark:via-gray-900 dark:to-gray-950">
      <Navigation />
      <Cart />

      <div className="container mx-auto space-y-6 px-4 pb-24 pt-4 md:py-6">
        <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} className="flex flex-col gap-3 sm:flex-row">
          <div className="relative flex-1">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
            <Input
              placeholder="Search for food, restaurants..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="h-14 border-2 pl-12 text-base shadow-lg sm:text-lg"
            />
          </div>
          <Button
            variant="outline"
            className="h-14 w-full sm:w-auto"
            onClick={() => setShowFilters(!showFilters)}
          >
            <Filter className="mr-2 h-4 w-4" /> Filters
            <ChevronDown className={`ml-1 h-4 w-4 transition-transform ${showFilters ? 'rotate-180' : ''}`} />
          </Button>
        </motion.div>

        {/* Filters */}
        {showFilters && (
          <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}>
            <Card>
              <CardContent className="grid gap-6 p-6 md:grid-cols-2 xl:grid-cols-4">
                <div>
                  <label className="text-sm font-medium mb-2 block">Dietary</label>
                  <Select value={vegFilter} onValueChange={(v) => setVegFilter(v)}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All</SelectItem>
                      <SelectItem value="veg">🥗 Veg Only</SelectItem>
                      <SelectItem value="nonveg">🍗 Non-Veg</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <label className="text-sm font-medium mb-2 block">Price Range: ₹{priceRange[0]} – ₹{priceRange[1]}</label>
                  <Slider min={0} max={5000} step={50} value={priceRange} onValueChange={setPriceRange} />
                </div>
                <div>
                  <label className="text-sm font-medium mb-2 block">Max Distance: {maxDistance} km</label>
                  <Slider min={1} max={20} step={1} value={[maxDistance]} onValueChange={v => setMaxDistance(v[0])} />
                </div>
                <div>
                  <label className="text-sm font-medium mb-2 block">Category</label>
                  <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Categories</SelectItem>
                      <SelectItem value="fast-food">Fast Food</SelectItem>
                      <SelectItem value="indian">Indian</SelectItem>
                      <SelectItem value="dessert">Desserts</SelectItem>
                      <SelectItem value="healthy">Healthy</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        )}

        <div className="grid lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">
            <Tabs defaultValue="deals" className="w-full">
              <TabsList className="grid h-auto w-full grid-cols-1 gap-2 bg-transparent p-0 sm:grid-cols-3">
                <TabsTrigger value="deals"><Zap className="h-4 w-4 mr-1" /> Flash Deals</TabsTrigger>
                <TabsTrigger value="trending"><TrendingUp className="h-4 w-4 mr-1" /> Trending</TabsTrigger>
                <TabsTrigger value="nearby"><MapPin className="h-4 w-4 mr-1" /> Nearby</TabsTrigger>
              </TabsList>

              {['deals', 'trending', 'nearby'].map(tab => {
                let tabItems = [...filteredItems];
                if (tab === 'deals') {
                  tabItems.sort((a, b) => (1 - b.discountedPrice / b.originalPrice) - (1 - a.discountedPrice / a.originalPrice));
                } else if (tab === 'trending') {
                  tabItems.sort((a, b) => b.totalOrders - a.totalOrders);
                } else if (tab === 'nearby') {
                  tabItems.sort((a, b) => a.distance - b.distance);
                }
                
                return (
                <TabsContent key={tab} value={tab} className="mt-4">
                  {loading ? (
                    <div className="grid md:grid-cols-2 gap-4">
                      {[1, 2, 3, 4].map(i => (
                        <div key={i} className="h-72 rounded-xl bg-muted animate-pulse" />
                      ))}
                    </div>
                  ) : tabItems.length === 0 ? (
                    <Card>
                      <CardContent className="py-16 text-center">
                        <div className="text-6xl mb-4">🍽️</div>
                        <h3 className="text-lg font-semibold mb-2">No items available right now</h3>
                        <p className="text-muted-foreground">Check back soon — restaurants update their listings throughout the day!</p>
                      </CardContent>
                    </Card>
                  ) : (
                    <div className="grid md:grid-cols-2 gap-4">
                      {tabItems.map((item, i) => (
                        <motion.div
                          key={item.id}
                          initial={{ opacity: 0, y: 20 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: i * 0.05 }}
                        >
                          <FoodCard 
                            item={item} 
                            showActions={true} 
                            onAddToCart={handleAddToCart} 
                            onSetAlert={handleSetStockAlert} 
                          />
                        </motion.div>
                      ))}
                    </div>
                  )}
                </TabsContent>
              );
              })}
            </Tabs>
          </div>

          {/* Right Sidebar */}
          <div className="space-y-6 lg:sticky lg:top-24 h-fit">
            {/* Eco Impact Only */}
            <Card className="bg-gradient-to-br from-green-500 to-teal-500 text-white border-0 shadow-lg">
              <CardContent className="p-6 space-y-4">
                <div className="flex items-center gap-2 mb-2">
                  <Leaf className="h-6 w-6" />
                  <h4 className="font-bold text-lg">Your Eco Impact</h4>
                </div>
                <div className="grid grid-cols-2 gap-3 mb-2">
                  <div className="bg-white/20 rounded-xl p-4 text-center shadow-inner">
                    <p className="text-3xl font-black mb-1">{ecoImpact.mealsSaved}</p>
                    <p className="text-xs text-green-50 font-medium">Meals Saved</p>
                  </div>
                  <div className="bg-white/20 rounded-xl p-4 text-center shadow-inner">
                    <p className="text-3xl font-black mb-1">{ecoImpact.co2Prevented}kg</p>
                    <p className="text-xs text-green-50 font-medium">CO₂ Prevented</p>
                  </div>
                </div>

                <div className="bg-black/10 rounded-xl p-4 space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-sm font-medium text-green-50">Agricultural Water Conserved:</span>
                    <span className="text-lg font-bold">{ecoImpact.waterSaved.toLocaleString()} L</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm font-medium text-green-50">Methane Prevented:</span>
                    <span className="text-lg font-bold">{ecoImpact.methanePrevented} kg</span>
                  </div>
                </div>

                <div className="bg-white/10 rounded-xl p-4 text-xs leading-relaxed border border-white/20">
                  <p className="font-bold mb-1 opacity-90">Based on real data from legit sources:</p>
                  <ul className="space-y-1 opacity-80 list-disc list-inside">
                    <li><strong>Water:</strong> Research from <em>Too Good To Go</em> estimates saving 1 meal (~1 kg of food) prevents the waste of ~810 L of agricultural water invested in growing and processing the meal.</li>
                    <li><strong>Methane:</strong> Data from the <em>U.S. EPA</em> indicates 1 kg of landfilled food waste releases ~0.034 kg of fugitive methane.</li>
                    <li><em>Impact calculated for {ecoImpact.mealsSaved} rescued meals.</em></li>
                  </ul>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
