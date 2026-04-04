// src/types/index.ts

export type UserType = 'customer' | 'restaurant' | 'ngo';

export interface Address {
  line1:   string;
  line2?:  string;
  city:    string;
  state:   string;
  pincode: string;
  lat?:    number;
  lng?:    number;
}

export interface User {
  uid:            string;
  email:          string;
  name:           string;
  phone?:         string;
  userType:       UserType;
  avatar?:        string;
  walletBalance:  number;
  rewardsPoints:  number;
  membershipTier: 'silver' | 'gold' | 'platinum';
  address?:       Address;
  createdAt:      Date;
  updatedAt:      Date;
}

export interface Restaurant {
  id:          string;
  ownerId:     string;
  name:        string;
  logo?:       string;
  address?:    Address;
  phone?:      string;
  email:       string;
  isPartner:   boolean;
  isActive:    boolean;
  rating:      number;
  totalOrders: number;
  createdAt:   Date;
  updatedAt:   Date;
}

export interface FoodItem {
  id:              string;
  restaurantId:    string;
  restaurantName:  string;
  name:            string;
  description:     string;
  image?:          string;
  category:        'fast-food' | 'indian' | 'dessert' | 'healthy' | 'other';
  originalPrice:   number;
  discountedPrice: number;
  quantity:        number;
  batchId:         string;
  expiryHours:     number;
  expiryTime:      Date;
  distance?:       number;
  rating:          number;
  isAvailable:     boolean;
  isDonation:      boolean;
  isVeg?:          boolean;
  createdAt:       Date;
  updatedAt:       Date;
}

export interface OrderItem {
  foodItemId: string;
  name:       string;
  quantity:   number;
  price:      number;
}

export type OrderStatus =
  | 'pending' | 'confirmed' | 'ready' | 'picked_up' | 'delivered' | 'cancelled';

export interface TrainDelivery {
  trainNumber: string;
  seat:        string;
  station:     string;
}

export interface Order {
  id:             string;
  customerId:     string;
  restaurantId:   string;
  restaurantName: string;
  items:          OrderItem[];
  subtotal:       number;
  discount:       number;
  total:          number;
  walletUsed:     number;
  status:         OrderStatus;
  pickupTime:     string;
  address:        string;
  trainDelivery?: TrainDelivery;
  rating?:        number;
  review?:        string;
  cashback:       number;
  cashbackAwarded?: boolean;
  createdAt:      Date;
  updatedAt:      Date;
}

export type TransactionType   = 'credit' | 'debit';
export type TransactionSource =
  | 'topup' | 'order' | 'cashback' | 'refund' | 'gift_send' | 'gift_receive' | 'reward_redeem';

export interface Transaction {
  id:          string;
  userId:      string;
  type:        TransactionType;
  amount:      number;
  description: string;
  source:      TransactionSource;
  orderId?:    string;
  balance:     number;
  createdAt:   Date;
}

export type StockAlertStatus = 'active' | 'triggered' | 'expired';

export interface StockAlert {
  id:           string;
  userId:       string;
  foodItemId:   string;
  foodItemName: string;
  targetPrice:  number;
  currentPrice: number;
  status:       StockAlertStatus;
  createdAt:    Date;
  triggeredAt?: Date;
}

export type DonationStatus = 'pending' | 'accepted' | 'rejected' | 'picked_up';

export interface Donation {
  id:                string;
  restaurantId:      string;
  restaurantName:    string;
  restaurantPhone:   string;
  restaurantAddress: string;
  ngoId?:            string;
  items:             string;
  quantity:          number;
  estimatedServings: number;
  pickupWindow:      string;
  expiryHours:       number;
  status:            DonationStatus;
  createdAt:         Date;
  updatedAt:         Date;
}

export interface NGO {
  id:                     string;
  ownerId:                string;
  name:                   string;
  logo?:                  string;
  address?:               Address;
  phone?:                 string;
  email:                  string;
  totalDonationsReceived: number;
  mealsServed:            number;
  isVerified:             boolean;
  createdAt:              Date;
  updatedAt:              Date;
}

export interface AppNotification {
  id:          string;
  userId:      string;
  title:       string;
  body:        string;
  type:        'price_alert' | 'new_donation' | 'cashback' | 'order_update' | 'general';
  read:        boolean;
  itemId?:     string;
  donationId?: string;
  orderId?:    string;
  createdAt:   Date;
}
