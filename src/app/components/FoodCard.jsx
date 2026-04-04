import React, { useState, useEffect } from 'react';
import { Clock, MapPin, Star, Target, ShoppingCart, TrendingUp } from 'lucide-react';
import { Card, CardContent } from './ui/card';
import { Badge } from './ui/badge';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from './ui/dialog';

const CountdownTimer = ({ expiryTime }) => {
  const [timeLeft, setTimeLeft] = useState('');
  useEffect(() => {
    const tick = () => {
      const dist = expiryTime.getTime() - Date.now();
      if (dist < 0) { setTimeLeft('EXPIRED'); return; }
      const h = Math.floor(dist / 3600000);
      const m = Math.floor((dist % 3600000) / 60000);
      const s = Math.floor((dist % 60000) / 1000);
      setTimeLeft(`${h}h ${m}m ${s}s`);
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [expiryTime]);
  return (
    <div className="flex items-center gap-1 text-xs font-medium text-red-600 dark:text-red-400">
      <Clock className="h-3 w-3" />{timeLeft}
    </div>
  );
};

export function FoodCard({ 
  item, 
  badge, 
  showActions = false, 
  onAddToCart, 
  onSetAlert 
}) {
  const [stockAlertPrice, setStockAlertPrice] = useState(0);
  const [isAlertOpen, setIsAlertOpen] = useState(false);

  const handleSetAlert = async () => {
    if (onSetAlert && stockAlertPrice > 0) {
      await onSetAlert(item, stockAlertPrice);
      setIsAlertOpen(false);
      setStockAlertPrice(0);
    }
  };

  return (
    <Card className="hover:shadow-xl transition-all cursor-pointer overflow-hidden group border-2 hover:border-green-300">
      <div className="relative">
        {item.image ? (
          <img src={item.image} alt={item.name} className="w-full h-44 object-cover group-hover:scale-105 transition-transform" />
        ) : (
          <div className="w-full h-44 bg-gradient-to-br from-green-100 to-orange-100 dark:from-green-950/30 dark:to-orange-950/30 flex items-center justify-center text-6xl">
            {item.category === 'fast-food' ? '🍔' : item.category === 'indian' ? '🍛' : item.category === 'dessert' ? '🍰' : '🥗'}
          </div>
        )}
        <Badge className="absolute top-2 right-2 bg-green-600">
          {Math.round((1 - item.discountedPrice / item.originalPrice) * 100)}% OFF
        </Badge>
        {item.isVeg && (
          <div className="absolute top-2 left-2 w-5 h-5 border-2 border-green-600 rounded flex items-center justify-center bg-white shadow-sm">
            <div className="w-2 h-2 rounded-full bg-green-600" />
          </div>
        )}
        {badge && (
          <div className="absolute top-2 left-8">
            {badge}
          </div>
        )}
        <div className="absolute bottom-2 left-2 px-2 py-1 bg-black/60 backdrop-blur rounded text-white text-xs flex items-center gap-1">
          <CountdownTimer expiryTime={item.expiryTime} />
        </div>
      </div>
      <CardContent className="p-4 space-y-3">
        <div>
          <h3 className="font-bold text-base">{item.name}</h3>
          <p className="text-sm text-muted-foreground">{item.restaurantName}</p>
        </div>
        <div className="flex items-center gap-2">
          <Star className="h-3 w-3 text-yellow-500 fill-current" />
          <span className="text-xs">{item.rating || 'New'}</span>
          {item.distance && (
            <>
              <MapPin className="h-3 w-3 text-muted-foreground ml-2" />
              <span className="text-xs text-muted-foreground">{item.distance} km</span>
            </>
          )}
        </div>
        <div className="flex items-center justify-between">
          <div>
            <span className="text-2xl font-bold text-green-600">₹{item.discountedPrice}</span>
            <span className="text-sm text-muted-foreground line-through ml-2">₹{item.originalPrice}</span>
          </div>
          {showActions && (
            <div className="flex gap-2">
              <Dialog open={isAlertOpen} onOpenChange={setIsAlertOpen}>
                <DialogTrigger asChild>
                  <Button variant="outline" size="sm">
                    <Target className="h-4 w-4" />
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Set Price Alert — {item.name}</DialogTitle>
                  </DialogHeader>
                  <div className="space-y-4 pt-2">
                    <div className="p-3 bg-muted rounded-lg text-sm">
                      Current price: <span className="font-bold text-green-600">₹{item.discountedPrice}</span>
                    </div>
                    <Input
                      type="number"
                      placeholder="Alert me when price drops to ₹..."
                      value={stockAlertPrice || ''}
                      onChange={e => setStockAlertPrice(Number(e.target.value))}
                    />
                    <Button onClick={handleSetAlert} className="w-full bg-gradient-to-r from-green-600 to-orange-600">
                      Set Alert 🔔
                    </Button>
                  </div>
                </DialogContent>
              </Dialog>
              <Button size="sm" onClick={() => onAddToCart && onAddToCart(item)} className="bg-gradient-to-r from-green-600 to-orange-600">
                <ShoppingCart className="h-4 w-4 mr-1" /> Add
              </Button>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
