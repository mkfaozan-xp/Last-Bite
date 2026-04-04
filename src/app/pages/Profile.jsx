// src/pages/Profile.jsx
import { useState, useRef, useEffect } from 'react';
import { motion } from 'motion/react';
import { User, Mail, Phone, MapPin, Edit, Award, ShoppingBag, Leaf, Settings, LogOut, Bell, Lock, Camera, Droplets, Wind, TreePine } from 'lucide-react';
import { Navigation }   from '../components/Navigation';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button }       from '../components/ui/button';
import { Input }        from '../components/ui/input';
import { Badge }        from '../components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '../components/ui/dialog';
import { useApp }       from '../contexts/AppContext';
import { updateUserProfile, uploadAvatar } from '../../services/userService';
import { logOut }       from '../../services/authService';
import { listenToNgoDonations } from '../../services/donationService';
import { useNavigate }  from 'react-router';
import { toast }        from 'sonner';
import { calculateEcoImpact } from '../../utils/ecoCalculator';

export default function Profile() {
  const navigate = useNavigate();
  const { currentUser, userName, setUserName, userAvatar, setUserAvatar, rewardsPoints, walletBalance, orders } = useApp();

  const [isEditing,  setIsEditing]  = useState(false);
  const [editName,   setEditName]   = useState(userName);
  const [editEmail,  setEditEmail]  = useState(currentUser?.email ?? '');
  const [editPhone,  setEditPhone]  = useState(currentUser?.phone ?? '');
  const [saving,     setSaving]     = useState(false);
  const [uploading,  setUploading]  = useState(false);
  const fileInputRef = useRef(null);

  const [ngoDonations, setNgoDonations] = useState([]);

  useEffect(() => {
    if (currentUser?.userType === 'ngo') {
      const unsub = listenToNgoDonations(currentUser.uid, setNgoDonations);
      return unsub;
    }
  }, [currentUser]);

  const restaurantBreakdown = Object.entries(
    ngoDonations.reduce((acc, d) => {
      const name = d.restaurantName || 'Unknown Restaurant';
      if (!acc[name]) acc[name] = 0;
      acc[name] += (d.quantity || 0);
      return acc;
    }, {})
  ).sort((a, b) => b[1] - a[1]);

  const mealsSaved = currentUser?.userType === 'ngo' 
    ? ngoDonations.reduce((s, d) => s + (d.estimatedServings || 0), 0)
    : orders
        .filter(o => o.status !== 'cancelled')
        .reduce((total, order) => {
          const orderQty = (order.items || []).reduce((sum, item) => sum + (item.quantity || 0), 0);
          return total + orderQty;
        }, 0);

  const ecoImpact = calculateEcoImpact(mealsSaved);

  const badges = [
    { id: 1, name: 'Food Saver',       icon: '🌟', description: 'Saved 50+ meals',    earned: mealsSaved >= 50 },
    { id: 2, name: 'Eco Warrior',      icon: '🌱', description: 'Reduced 100kg CO₂',  earned: Number(ecoImpact.co2Prevented) >= 100 },
    { id: 3, name: 'Early Adopter',    icon: '🚀', description: 'First 1000 users',   earned: true },
    { id: 4, name: 'Consistent Saver', icon: '🔥', description: '30 day streak',      earned: false },
    { id: 5, name: 'Community Hero',   icon: '❤️', description: 'Donated 10+ meals',  earned: false },
    { id: 6, name: 'Big Spender',      icon: '💰', description: 'Spent ₹10,000+',     earned: false },
  ];

  const totalSaved = orders
    .filter(o => o.status !== 'cancelled')
    .reduce((s, o) => s + (o.subtotal - o.total), 0);

  const handleSaveProfile = async () => {
    if (!currentUser) return;
    setSaving(true);
    try {
      await updateUserProfile(currentUser.uid, { name: editName, phone: editPhone });
      setUserName(editName);
      toast.success('Profile updated successfully!');
      setIsEditing(false);
    } catch (err) {
      toast.error('Failed to update profile');
    } finally {
      setSaving(false);
    }
  };

  const handleAvatarChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file || !currentUser) return;
    setUploading(true);
    try {
      const url = await uploadAvatar(currentUser.uid, file);
      setUserAvatar(url);
      toast.success('Profile photo updated!');
    } catch (err) {
      toast.error('Failed to upload photo');
    } finally {
      setUploading(false);
    }
  };

  const handleLogout = async () => {
    try {
      await logOut();
      toast.success('Logged out successfully');
      navigate('/landing');
    } catch {
      toast.error('Failed to log out');
    }
  };

  const tierColors = {
    silver:   'from-gray-400 to-gray-600',
    gold:     'from-yellow-400 to-orange-500',
    platinum: 'from-purple-400 to-pink-500',
  };
  const tier = currentUser?.membershipTier ?? 'silver';

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50/50 via-white to-pink-50/50 dark:from-gray-950 dark:via-gray-900 dark:to-gray-950">
      <Navigation />

      <div className="container mx-auto px-4 py-6 space-y-6">
        {/* Profile Header */}
        <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }}>
          <Card className="bg-gradient-to-br from-green-600 via-green-500 to-orange-500 text-white border-0 shadow-2xl">
            <CardContent className="p-8">
              <div className="flex flex-col md:flex-row items-center gap-6">
                {/* Avatar with upload */}
                <div className="relative">
                  {userAvatar ? (
                    <img src={userAvatar} alt={userName} className="w-32 h-32 rounded-full border-4 border-white shadow-xl object-cover" />
                  ) : (
                    <div className="w-32 h-32 rounded-full border-4 border-white shadow-xl bg-white/20 flex items-center justify-center text-5xl font-bold">
                      {userName.charAt(0).toUpperCase()}
                    </div>
                  )}
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    disabled={uploading}
                    className="absolute bottom-0 right-0 w-9 h-9 rounded-full bg-white text-green-600 flex items-center justify-center hover:bg-white/90 shadow-lg transition"
                  >
                    {uploading ? <span className="h-4 w-4 border-2 border-green-600/30 border-t-green-600 rounded-full animate-spin" /> : <Camera className="h-4 w-4" />}
                  </button>
                  <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleAvatarChange} />
                </div>

                {/* Info */}
                <div className="flex-1 text-center md:text-left space-y-2">
                  <h1 className="text-3xl font-bold">{userName}</h1>
                  <div className="flex flex-wrap items-center gap-3 justify-center md:justify-start">
                    <div className="flex items-center gap-2 text-sm">
                      <Mail className="h-4 w-4" /> {currentUser?.email}
                    </div>
                    {currentUser?.phone && (
                      <div className="flex items-center gap-2 text-sm">
                        <Phone className="h-4 w-4" /> {currentUser.phone}
                      </div>
                    )}
                  </div>
                  <div className="flex gap-3 justify-center md:justify-start pt-2">
                    <Badge className="bg-white text-green-600">
                      <Award className="h-3 w-3 mr-1" /> {rewardsPoints} Points
                    </Badge>
                    <Badge className={`bg-gradient-to-r ${tierColors[tier]} border-0 capitalize`}>
                      {tier} Member
                    </Badge>
                  </div>
                </div>

                {/* Edit Button */}
                <Dialog open={isEditing} onOpenChange={setIsEditing}>
                  <DialogTrigger asChild>
                    <Button className="bg-white text-green-600 hover:bg-white/90">
                      <Edit className="h-4 w-4 mr-2" /> Edit Profile
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader><DialogTitle>Edit Profile</DialogTitle></DialogHeader>
                    <div className="space-y-4">
                      <div>
                        <label className="text-sm font-medium mb-2 block">Name</label>
                        <Input value={editName} onChange={e => setEditName(e.target.value)} />
                      </div>
                      <div>
                        <label className="text-sm font-medium mb-2 block">Email</label>
                        <Input type="email" value={editEmail} disabled className="opacity-60" />
                        <p className="text-xs text-muted-foreground mt-1">Email cannot be changed</p>
                      </div>
                      <div>
                        <label className="text-sm font-medium mb-2 block">Phone</label>
                        <Input type="tel" value={editPhone} onChange={e => setEditPhone(e.target.value)} />
                      </div>
                      <Button onClick={handleSaveProfile} disabled={saving} className="w-full bg-gradient-to-r from-green-600 to-orange-600">
                        {saving ? 'Saving...' : 'Save Changes'}
                      </Button>
                    </div>
                  </DialogContent>
                </Dialog>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        <div className="grid lg:grid-cols-3 gap-6">
          {/* Left Column */}
          <div className="lg:col-span-2 space-y-6">
            {/* Stats */}
            {currentUser?.userType === 'ngo' ? (
              <div className="grid md:grid-cols-3 gap-6">
                <Card>
                  <CardContent className="p-6 flex items-center justify-between">
                    <div>
                      <p className="text-sm text-muted-foreground">Total Donations</p>
                      <p className="text-3xl font-bold text-green-600">{ngoDonations.length}</p>
                    </div>
                    <ShoppingBag className="h-8 w-8 text-green-600" />
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="p-6 flex items-center justify-between">
                    <div>
                      <p className="text-sm text-muted-foreground">Meals Saved</p>
                      <p className="text-3xl font-bold text-orange-600">
                        {mealsSaved}
                      </p>
                    </div>
                    <span className="text-4xl">🍽️</span>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="p-6 flex items-center justify-between">
                    <div>
                      <p className="text-sm text-muted-foreground">Partners</p>
                      <p className="text-3xl font-bold text-green-600">
                        {new Set(ngoDonations.map(d => d.restaurantId)).size}
                      </p>
                    </div>
                    <span className="text-4xl">🤝</span>
                  </CardContent>
                </Card>
              </div>
            ) : (
              <div className="grid md:grid-cols-3 gap-6">
                <Card>
                  <CardContent className="p-6 flex items-center justify-between">
                    <div>
                      <p className="text-sm text-muted-foreground">Total Orders</p>
                      <p className="text-3xl font-bold text-green-600">{orders.length}</p>
                    </div>
                    <ShoppingBag className="h-8 w-8 text-green-600" />
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="p-6 flex items-center justify-between">
                    <div>
                      <p className="text-sm text-muted-foreground">Money Saved</p>
                      <p className="text-3xl font-bold text-orange-600">₹{totalSaved.toLocaleString()}</p>
                    </div>
                    <span className="text-4xl">💰</span>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="p-6 flex items-center justify-between">
                    <div>
                      <p className="text-sm text-muted-foreground">CO₂ Reduced</p>
                      <p className="text-3xl font-bold text-green-600">{ecoImpact.co2Prevented}kg</p>
                    </div>
                    <Leaf className="h-8 w-8 text-green-600" />
                  </CardContent>
                </Card>
              </div>
            )}

            {/* Badges / Restaurants */}
            {currentUser?.userType === 'ngo' ? (
              <>
                <Card>
                  <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <ShoppingBag className="h-5 w-5" /> Restaurant Contributions
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {restaurantBreakdown.length > 0 ? (
                    <div className="space-y-4">
                      {restaurantBreakdown.map(([name, quantity], idx) => (
                        <div key={idx} className="flex justify-between items-center p-4 bg-gray-50 dark:bg-gray-900 rounded-lg">
                          <div>
                            <p className="font-bold">{name}</p>
                            <p className="text-sm text-muted-foreground">Partner Restaurant</p>
                          </div>
                          <div className="text-right">
                            <span className="text-xl font-bold text-orange-600">{quantity}</span>
                            <p className="text-xs text-muted-foreground">Items Recovered</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-muted-foreground text-center py-6">No donations accepted yet.</p>
                  )}
                </CardContent>
              </Card>

              {/* Eco Impact Module */}
              <Card className="bg-gradient-to-br from-green-600 to-emerald-800 text-white shadow-xl mt-6">
                <CardHeader>
                  <CardTitle className="text-white flex items-center gap-2">
                    <Leaf className="h-6 w-6 text-green-300" /> Complete Environmental Impact
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div className="bg-white/10 backdrop-blur rounded-xl p-4 border border-white/20">
                      <div className="flex items-center gap-2 text-green-200 mb-2">
                        <Wind className="h-5 w-5" />
                        <p className="text-sm font-medium">CO₂ Prevented</p>
                      </div>
                      <p className="text-3xl font-bold">{ecoImpact.co2Prevented} <span className="text-lg font-normal text-white/80">kg</span></p>
                    </div>
                    <div className="bg-white/10 backdrop-blur rounded-xl p-4 border border-white/20">
                      <div className="flex items-center gap-2 text-emerald-200 mb-2">
                        <span className="text-xl leading-none">☁️</span>
                        <p className="text-sm font-medium">Methane (CH₄)</p>
                      </div>
                      <p className="text-3xl font-bold">{ecoImpact.methanePrevented} <span className="text-lg font-normal text-white/80">kg</span></p>
                    </div>
                    <div className="bg-white/10 backdrop-blur rounded-xl p-4 border border-white/20">
                      <div className="flex items-center gap-2 text-blue-300 mb-2">
                        <Droplets className="h-5 w-5" />
                        <p className="text-sm font-medium">Water Preserved</p>
                      </div>
                      <p className="text-3xl font-bold">{ecoImpact.waterSaved.toLocaleString()} <span className="text-lg font-normal text-white/80">Liters</span></p>
                    </div>
                    <div className="bg-white/10 backdrop-blur rounded-xl p-4 border border-white/20">
                      <div className="flex items-center gap-2 text-green-300 mb-2">
                        <TreePine className="h-5 w-5" />
                        <p className="text-sm font-medium">Trees Equivalent</p>
                      </div>
                      <p className="text-3xl font-bold">{ecoImpact.treesEquivalent} <span className="text-lg font-normal text-white/80">Planted</span></p>
                    </div>
                  </div>
                  
                  <div className="mt-4 pt-4 border-t border-white/20 text-xs text-emerald-100/70 text-right italic space-x-4">
                    <span>* 1 meal ≈ 0.5kg food waste</span>
                    <span>* CO₂ & Methane ratios via FAO & EPA</span>
                    <span>* Water ratios via Water Footprint Network</span>
                    <span>* Tree equivalent via Arbor Day Foundation</span>
                  </div>
                </CardContent>
              </Card>
              </>
            ) : (
              <>
                {/* Badges */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Award className="h-5 w-5" /> Badges & Achievements
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid md:grid-cols-3 gap-4">
                      {badges.map(badge => (
                        <motion.div
                          key={badge.id}
                          initial={{ opacity: 0, scale: 0.9 }}
                          animate={{ opacity: 1, scale: 1 }}
                          whileHover={{ scale: 1.05 }}
                          className={`p-4 border-2 rounded-lg text-center transition-all ${
                            badge.earned
                              ? 'border-green-500 bg-green-50 dark:bg-green-950/20'
                              : 'border-gray-300 bg-gray-50 dark:bg-gray-900 opacity-50'
                          }`}
                        >
                          <div className="text-4xl mb-2">{badge.icon}</div>
                          <h4 className="font-bold mb-1 text-sm">{badge.name}</h4>
                          <p className="text-xs text-muted-foreground">{badge.description}</p>
                          {badge.earned && <Badge className="mt-2 bg-green-600 text-xs">Earned</Badge>}
                        </motion.div>
                      ))}
                    </div>
                  </CardContent>
                </Card>

                {/* Eco Impact */}
                <Card className="bg-gradient-to-br from-green-500 to-orange-500 text-white">
                  <CardHeader>
                    <CardTitle className="text-white flex items-center gap-2">
                      <Leaf className="h-5 w-5" /> Your Environmental Impact
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid md:grid-cols-2 gap-4">
                      <div className="bg-white/10 backdrop-blur rounded-lg p-4">
                        <p className="text-white/80 text-sm mb-1">Meals Saved</p>
                        <p className="text-3xl font-bold">{ecoImpact.mealsSaved}</p>
                      </div>
                      <div className="bg-white/10 backdrop-blur rounded-lg p-4">
                        <p className="text-white/80 text-sm mb-1">Trees Equivalent</p>
                        <p className="text-3xl font-bold">🌳 {ecoImpact.treesEquivalent}</p>
                      </div>
                    </div>
                    <div className="bg-white/10 backdrop-blur rounded-lg p-4">
                      <p className="text-center">
                        <span className="text-2xl font-bold">{ecoImpact.co2Prevented}kg</span> of CO₂ emissions prevented
                      </p>
                      <div className="w-full bg-white/20 rounded-full h-2 mt-3">
                        <div className="bg-white h-2 rounded-full transition-all" style={{ width: `${Math.min((Number(ecoImpact.co2Prevented) / 100) * 100, 100)}%` }} />
                      </div>
                      <p className="text-xs text-center mt-2 text-white/80">
                        {Math.max(0, 100 - Number(ecoImpact.co2Prevented)).toFixed(1)}kg more to Climate Champion
                      </p>
                    </div>
                  </CardContent>
                </Card>
              </>
            )}
          </div>

          {/* Right Column */}
          <div className="space-y-6">
            {/* Settings */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Settings className="h-5 w-5" /> Settings
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <Button variant="outline" className="w-full justify-start">
                  <Bell className="h-4 w-4 mr-2" /> Notifications
                </Button>
                <Button variant="outline" className="w-full justify-start">
                  <Lock className="h-4 w-4 mr-2" /> Privacy & Security
                </Button>
                <Button variant="outline" className="w-full justify-start">
                  <MapPin className="h-4 w-4 mr-2" /> Saved Addresses
                </Button>
                <Button variant="outline" className="w-full justify-start">
                  <Settings className="h-4 w-4 mr-2" /> App Preferences
                </Button>
              </CardContent>
            </Card>

            {/* Membership */}
            {currentUser?.userType !== 'ngo' && (
              <Card>
                <CardHeader><CardTitle>Subscription Plan</CardTitle></CardHeader>
                <CardContent className="space-y-4">
                  <div className={`bg-gradient-to-br ${
                    tier === 'platinum' ? 'from-purple-50 to-pink-50 dark:from-purple-950/20 dark:to-pink-950/20 border-purple-300 dark:border-purple-800' :
                    tier === 'gold'     ? 'from-yellow-50 to-orange-50 dark:from-yellow-950/20 dark:to-orange-950/20 border-yellow-300 dark:border-yellow-800' :
                                         'from-gray-50 to-slate-50 dark:from-gray-950/20 dark:to-slate-950/20 border-gray-300 dark:border-gray-800'
                  } rounded-lg p-4 border-2`}>
                    <Badge className={`mb-2 bg-gradient-to-r ${tierColors[tier]} border-0 capitalize`}>
                      {tier} Member
                    </Badge>
                    <p className="font-bold text-lg mb-1">Your Benefits</p>
                    <ul className="text-sm space-y-1 text-muted-foreground">
                      <li>✓ {tier === 'silver' ? '3%' : tier === 'gold' ? '5%' : '8%'} cashback on orders</li>
                      {tier !== 'silver'   && <li>✓ Priority customer support</li>}
                      {tier !== 'silver'   && <li>✓ Early access to deals</li>}
                      {tier === 'platinum' && <li>✓ Free delivery on all orders</li>}
                    </ul>
                  </div>
                  {tier !== 'platinum' && (
                    <Button className="w-full bg-gradient-to-r from-purple-600 to-pink-600">
                      Upgrade to {tier === 'silver' ? 'Gold' : 'Platinum'}
                    </Button>
                  )}
                  <p className="text-xs text-muted-foreground text-center">
                    {tier === 'silver' ? `${500 - rewardsPoints} pts to Gold` :
                     tier === 'gold'   ? `${2000 - rewardsPoints} pts to Platinum` : 'You are at the highest tier! 🎉'}
                  </p>
                </CardContent>
              </Card>
            )}

            {/* Logout etc. */}
            <Card>
              <CardContent className="p-6 space-y-3">
                <Button variant="outline" className="w-full justify-start text-muted-foreground">
                  Help & Support
                </Button>
                <Button variant="outline" className="w-full justify-start text-muted-foreground">
                  Terms & Conditions
                </Button>
                <Button
                  variant="outline"
                  onClick={handleLogout}
                  className="w-full justify-start text-red-600 hover:text-red-700 hover:bg-red-50"
                >
                  <LogOut className="h-4 w-4 mr-2" /> Logout
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
