// src/pages/Explore.jsx
import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { Search, MapPin, TrendingUp, Sparkles } from 'lucide-react';
import { Navigation }   from '../components/Navigation';
import { Input }        from '../components/ui/input';
import { Button }       from '../components/ui/button';
import { Card, CardContent } from '../components/ui/card';
import { Badge }        from '../components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
import { FoodCard } from '../components/FoodCard';
import { listenToAvailableItems } from '../../services/foodItemService';
import { getAllRestaurants }      from '../../services/restaurantService';

export default function Explore() {
  const [searchQuery, setSearchQuery] = useState('');
  const [foodItems,   setFoodItems]   = useState([]);
  const [restaurants, setRestaurants] = useState([]);
  const [loading,     setLoading]     = useState(true);

  const categories = [
    { id: 'all',       name: 'All',       icon: '🍽️' },
    { id: 'fast-food', name: 'Fast Food', icon: '🍔' },
    { id: 'indian',    name: 'Indian',    icon: '🍛' },
    { id: 'dessert',   name: 'Desserts',  icon: '🍰' },
    { id: 'healthy',   name: 'Healthy',   icon: '🥗' },
  ];
  const [activeCategory, setActiveCategory] = useState('all');

  const trendingSearches = ['Pizza', 'Biryani', 'Burger', 'Pasta', 'Cake', 'Salad'];

  // ── Load data ──────────────────────────────────────────────────────────────
  useEffect(() => {
    setLoading(true);
    getAllRestaurants().then(rests => setRestaurants(rests)).catch(console.error);
    const unsub = listenToAvailableItems(items => {
      setFoodItems(items);
      setLoading(false);
    });
    return () => unsub();
  }, []);

  const filtered = foodItems.filter(item => {
    const searchLower = searchQuery.toLowerCase();
    const name = item.name || '';
    const restName = item.restaurantName || '';
    const matchesSearch = !searchQuery || 
                          name.toLowerCase().includes(searchLower) ||
                          restName.toLowerCase().includes(searchLower);
    const matchesCategory = activeCategory === 'all' || item.category === activeCategory;
    return matchesSearch && matchesCategory;
  });

  const trending = [...filtered].sort((a, b) => b.totalOrders - a.totalOrders);
  const nearYou = [...filtered].sort((a, b) => a.distance - b.distance);



  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50/50 via-white to-purple-50/50 dark:from-gray-950 dark:via-gray-900 dark:to-gray-950">
      <Navigation />

      <div className="container mx-auto px-4 py-6 space-y-6">
        {/* Hero */}
        <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} className="text-center space-y-4">
          <div className="flex items-center justify-center gap-2">
            <Sparkles className="h-6 w-6 text-orange-500" />
            <h1 className="text-4xl font-bold">Explore Food Near You</h1>
            <Sparkles className="h-6 w-6 text-green-500" />
          </div>
          <p className="text-muted-foreground text-lg">Discover amazing deals from restaurants around you</p>

          <div className="max-w-2xl mx-auto relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
            <Input
              placeholder="Search for food, restaurants, cuisines..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="pl-12 h-14 text-lg shadow-xl border-2"
            />
            <Button className="absolute right-2 top-1/2 -translate-y-1/2 bg-gradient-to-r from-green-600 to-orange-600">
              Search
            </Button>
          </div>

          <div className="flex flex-wrap gap-2 justify-center">
            <span className="text-sm text-muted-foreground">Trending:</span>
            {trendingSearches.map(term => (
              <Badge key={term} variant="outline" className="cursor-pointer hover:bg-accent" onClick={() => setSearchQuery(term)}>
                {term}
              </Badge>
            ))}
          </div>
        </motion.div>

        {/* Categories */}
        <div className="flex gap-4 overflow-x-auto pb-2">
          {categories.map(cat => (
            <motion.div key={cat.id} whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
              <Card
                onClick={() => setActiveCategory(cat.id)}
                className={`cursor-pointer hover:shadow-lg transition-shadow min-w-[120px] ${activeCategory === cat.id ? 'border-2 border-green-500 bg-green-50 dark:bg-green-950/20' : ''}`}
              >
                <CardContent className="p-4 text-center">
                  <div className="text-3xl mb-2">{cat.icon}</div>
                  <p className="font-semibold text-sm">{cat.name}</p>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>

        {/* Tabs */}
        <Tabs defaultValue="near-you" className="w-full">
          <TabsList className="grid w-full max-w-2xl mx-auto grid-cols-3">
            <TabsTrigger value="near-you"><MapPin className="h-4 w-4 mr-2" /> Near You</TabsTrigger>
            <TabsTrigger value="trending"><TrendingUp className="h-4 w-4 mr-2" /> Trending</TabsTrigger>
            <TabsTrigger value="restaurants">Restaurants</TabsTrigger>
          </TabsList>

          {/* Near You */}
          <TabsContent value="near-you" className="mt-6">
            {loading ? (
              <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-6">
                {[1,2,3,4,5,6].map(i => <div key={i} className="h-72 rounded-xl bg-muted animate-pulse" />)}
              </div>
            ) : filtered.length === 0 ? (
              <div className="text-center py-16 text-muted-foreground">
                <div className="text-6xl mb-4">🍽️</div>
                <p className="text-lg font-medium">No items available right now</p>
                <p className="text-sm">Restaurants haven't listed surplus food yet. Check back soon!</p>
              </div>
            ) : (
              <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-6">
                {nearYou.slice(0, 6).map((item, i) => (
                  <motion.div key={item.id} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.1 }}>
                    <FoodCard item={item} />
                  </motion.div>
                ))}
              </div>
            )}
          </TabsContent>

          {/* Trending */}
          <TabsContent value="trending" className="mt-6">
            {loading ? (
              <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-6">
                {[1,2,3,4,5,6].map(i => <div key={i} className="h-72 rounded-xl bg-muted animate-pulse" />)}
              </div>
            ) : (
              <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-6">
                {trending.slice(0, 6).map((item, i) => (
                  <motion.div key={item.id} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.1 }}>
                    <FoodCard item={item} badge={
                      <Badge className="absolute top-2 left-2 bg-orange-600 flex items-center gap-1">
                        <TrendingUp className="h-3 w-3" /> Trending
                      </Badge>
                    } />
                  </motion.div>
                ))}
              </div>
            )}
          </TabsContent>

          {/* Restaurants */}
          <TabsContent value="restaurants" className="mt-6">
            {loading ? (
              <div className="grid md:grid-cols-3 gap-6">
                {[1,2,3].map(i => <div key={i} className="h-56 rounded-xl bg-muted animate-pulse" />)}
              </div>
            ) : restaurants.length === 0 ? (
              <div className="text-center py-16 text-muted-foreground">
                <div className="text-6xl mb-4">🏪</div>
                <p className="text-lg font-medium">No partner restaurants yet</p>
                <p className="text-sm">Restaurants will appear here once they join LastBite.</p>
              </div>
            ) : (
              <div className="grid md:grid-cols-3 gap-6">
                {restaurants.map((restaurant, i) => (
                  <motion.div key={restaurant.id} initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: i * 0.1 }}>
                    <Card className="hover:shadow-xl transition-shadow cursor-pointer overflow-hidden group">
                      <div className="relative">
                        {restaurant.logo ? (
                          <img src={restaurant.logo} alt={restaurant.name} className="w-full h-40 object-cover group-hover:scale-110 transition-transform" />
                        ) : (
                          <div className="w-full h-40 bg-gradient-to-br from-orange-100 to-red-100 dark:from-orange-950/30 dark:to-red-950/30 flex items-center justify-center text-5xl">🍽️</div>
                        )}
                        {restaurant.isPartner && (
                          <Badge className="absolute top-2 right-2 bg-green-600">Partner</Badge>
                        )}
                      </div>
                      <CardContent className="p-4">
                        <h3 className="font-bold text-lg mb-2">{restaurant.name}</h3>
                        <div className="flex items-center gap-2">
                          <span className="text-yellow-500">⭐</span>
                          <span className="font-semibold">{restaurant.rating.toFixed(1)}</span>
                          <span className="text-muted-foreground text-sm">• {restaurant.totalOrders}+ orders</span>
                        </div>
                        <Button className="w-full mt-4 bg-gradient-to-r from-green-600 to-orange-600">
                          View Menu
                        </Button>
                      </CardContent>
                    </Card>
                  </motion.div>
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
