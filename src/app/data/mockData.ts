// Mock data for LastBite application

export interface FoodItem {
  id: string;
  name: string;
  restaurant: string;
  originalPrice: number;
  discountedPrice: number;
  image: string;
  category: string;
  isVeg: boolean;
  distance: number;
  stockLeft: number;
  expiryTime: Date;
  rating: number;
  priceHistory: { time: string; price: number }[];
}

export interface Restaurant {
  id: string;
  name: string;
  logo: string;
  rating: number;
  isPartner: boolean;
}

export interface Order {
  id: string;
  items: FoodItem[];
  total: number;
  status: 'pending' | 'confirmed' | 'delivered' | 'cancelled';
  date: Date;
  pickupTime?: string;
  trainDelivery?: {
    trainNumber: string;
    seat: string;
    station: string;
  };
}

export interface Transaction {
  id: string;
  type: 'credit' | 'debit';
  amount: number;
  description: string;
  date: Date;
}

export interface GameChallenge {
  id: string;
  title: string;
  description: string;
  reward: string;
  expiresIn: Date;
  type: 'guess' | 'spin' | 'daily';
}

export interface StockAlert {
  id: string;
  foodName: string;
  targetPrice: number;
  currentPrice: number;
  quantity: number;
  status: 'active' | 'triggered' | 'expired';
}

export const mockRestaurants: Restaurant[] = [
  { id: '1', name: 'Domino\'s Pizza', logo: 'https://images.unsplash.com/photo-1513104890138-7c749659a591?w=200&h=200&fit=crop', rating: 4.5, isPartner: true },
  { id: '2', name: 'KFC', logo: 'https://images.unsplash.com/photo-1626645738196-c2a7c87a8f58?w=200&h=200&fit=crop', rating: 4.3, isPartner: true },
  { id: '3', name: 'Starbucks', logo: 'https://images.unsplash.com/photo-1495474472287-4d71bcdd2085?w=200&h=200&fit=crop', rating: 4.7, isPartner: true },
  { id: '4', name: 'McDonald\'s', logo: 'https://images.unsplash.com/photo-1552566626-52f8b828add9?w=200&h=200&fit=crop', rating: 4.2, isPartner: true },
  { id: '5', name: 'Subway', logo: 'https://images.unsplash.com/photo-1555939594-58d7cb561ad1?w=200&h=200&fit=crop', rating: 4.4, isPartner: true },
  { id: '6', name: 'Burger King', logo: 'https://images.unsplash.com/photo-1571091718767-18b5b1457add?w=200&h=200&fit=crop', rating: 4.1, isPartner: true },
];

export const mockFoodItems: FoodItem[] = [
  {
    id: '1',
    name: 'Margherita Pizza',
    restaurant: 'Domino\'s Pizza',
    originalPrice: 399,
    discountedPrice: 120,
    image: 'https://images.unsplash.com/photo-1574071318508-1cdbab80d002?w=500&h=400&fit=crop',
    category: 'Fast Food',
    isVeg: true,
    distance: 0.8,
    stockLeft: 3,
    expiryTime: new Date(Date.now() + 2 * 60 * 60 * 1000), // 2 hours
    rating: 4.5,
    priceHistory: [
      { time: '10:00', price: 399 },
      { time: '12:00', price: 299 },
      { time: '14:00', price: 199 },
      { time: '16:00', price: 150 },
      { time: '18:00', price: 120 },
    ]
  },
  {
    id: '2',
    name: 'Chicken Biryani',
    restaurant: 'Biryani House',
    originalPrice: 280,
    discountedPrice: 99,
    image: 'https://images.unsplash.com/photo-1563379091339-03b21ab4a4f8?w=500&h=400&fit=crop',
    category: 'Indian',
    isVeg: false,
    distance: 1.2,
    stockLeft: 5,
    expiryTime: new Date(Date.now() + 1.5 * 60 * 60 * 1000),
    rating: 4.8,
    priceHistory: [
      { time: '10:00', price: 280 },
      { time: '12:00', price: 220 },
      { time: '14:00', price: 160 },
      { time: '16:00', price: 120 },
      { time: '18:00', price: 99 },
    ]
  },
  {
    id: '3',
    name: 'Chocolate Cake',
    restaurant: 'Sweet Treats',
    originalPrice: 450,
    discountedPrice: 150,
    image: 'https://images.unsplash.com/photo-1578985545062-69928b1d9587?w=500&h=400&fit=crop',
    category: 'Dessert',
    isVeg: true,
    distance: 2.1,
    stockLeft: 2,
    expiryTime: new Date(Date.now() + 3 * 60 * 60 * 1000),
    rating: 4.6,
    priceHistory: [
      { time: '10:00', price: 450 },
      { time: '12:00', price: 350 },
      { time: '14:00', price: 250 },
      { time: '16:00', price: 200 },
      { time: '18:00', price: 150 },
    ]
  },
  {
    id: '4',
    name: 'Veg Burger Combo',
    restaurant: 'Burger King',
    originalPrice: 199,
    discountedPrice: 79,
    image: 'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?w=500&h=400&fit=crop',
    category: 'Fast Food',
    isVeg: true,
    distance: 0.5,
    stockLeft: 8,
    expiryTime: new Date(Date.now() + 1 * 60 * 60 * 1000),
    rating: 4.3,
    priceHistory: [
      { time: '10:00', price: 199 },
      { time: '12:00', price: 149 },
      { time: '14:00', price: 119 },
      { time: '16:00', price: 99 },
      { time: '18:00', price: 79 },
    ]
  },
  {
    id: '5',
    name: 'Paneer Tikka',
    restaurant: 'Spice Garden',
    originalPrice: 320,
    discountedPrice: 110,
    image: 'https://images.unsplash.com/photo-1599487488170-d11ec9c172f0?w=500&h=400&fit=crop',
    category: 'Indian',
    isVeg: true,
    distance: 1.8,
    stockLeft: 4,
    expiryTime: new Date(Date.now() + 2.5 * 60 * 60 * 1000),
    rating: 4.7,
    priceHistory: [
      { time: '10:00', price: 320 },
      { time: '12:00', price: 250 },
      { time: '14:00', price: 180 },
      { time: '16:00', price: 140 },
      { time: '18:00', price: 110 },
    ]
  },
  {
    id: '6',
    name: 'Fresh Salad Bowl',
    restaurant: 'Healthy Bites',
    originalPrice: 250,
    discountedPrice: 90,
    image: 'https://images.unsplash.com/photo-1512621776951-a57141f2eefd?w=500&h=400&fit=crop',
    category: 'Healthy',
    isVeg: true,
    distance: 1.5,
    stockLeft: 6,
    expiryTime: new Date(Date.now() + 1.2 * 60 * 60 * 1000),
    rating: 4.4,
    priceHistory: [
      { time: '10:00', price: 250 },
      { time: '12:00', price: 190 },
      { time: '14:00', price: 140 },
      { time: '16:00', price: 110 },
      { time: '18:00', price: 90 },
    ]
  },
  {
    id: '7',
    name: 'Chicken Wings',
    restaurant: 'KFC',
    originalPrice: 350,
    discountedPrice: 130,
    image: 'https://images.unsplash.com/photo-1608039829572-78524f79c4c7?w=500&h=400&fit=crop',
    category: 'Fast Food',
    isVeg: false,
    distance: 0.9,
    stockLeft: 7,
    expiryTime: new Date(Date.now() + 2 * 60 * 60 * 1000),
    rating: 4.5,
    priceHistory: [
      { time: '10:00', price: 350 },
      { time: '12:00', price: 270 },
      { time: '14:00', price: 200 },
      { time: '16:00', price: 160 },
      { time: '18:00', price: 130 },
    ]
  },
  {
    id: '8',
    name: 'Ice Cream Sundae',
    restaurant: 'Sweet Treats',
    originalPrice: 180,
    discountedPrice: 60,
    image: 'https://images.unsplash.com/photo-1563805042-7684c019e1cb?w=500&h=400&fit=crop',
    category: 'Dessert',
    isVeg: true,
    distance: 2.1,
    stockLeft: 4,
    expiryTime: new Date(Date.now() + 0.8 * 60 * 60 * 1000),
    rating: 4.6,
    priceHistory: [
      { time: '10:00', price: 180 },
      { time: '12:00', price: 140 },
      { time: '14:00', price: 100 },
      { time: '16:00', price: 80 },
      { time: '18:00', price: 60 },
    ]
  },
];

export const mockGameChallenges: GameChallenge[] = [
  {
    id: '1',
    title: 'Guess the Leftover',
    description: 'Which food will have the most stock left at 10 PM?',
    reward: 'Free meal worth ₹200',
    expiresIn: new Date(Date.now() + 4 * 60 * 60 * 1000),
    type: 'guess'
  },
  {
    id: '2',
    title: 'Daily Spin',
    description: 'Spin the wheel to win discounts and free delivery',
    reward: 'Up to 70% off',
    expiresIn: new Date(Date.now() + 24 * 60 * 60 * 1000),
    type: 'spin'
  },
  {
    id: '3',
    title: 'Food Saver Challenge',
    description: 'Save 5 meals this week to unlock bonus points',
    reward: '500 bonus points',
    expiresIn: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000),
    type: 'daily'
  },
];

export const mockStockAlerts: StockAlert[] = [
  {
    id: '1',
    foodName: 'Margherita Pizza',
    targetPrice: 100,
    currentPrice: 120,
    quantity: 2,
    status: 'active'
  },
  {
    id: '2',
    foodName: 'Chicken Biryani',
    targetPrice: 80,
    currentPrice: 99,
    quantity: 1,
    status: 'active'
  },
];

export const impactStats = {
  mealsSaved: 127,
  co2Reduced: 342, // kg
  moneySaved: 15840, // ₹
  treesEquivalent: 23
};
