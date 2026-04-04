// src/pages/NGODashboard.jsx
import { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { Package, Check, X, Phone, Mail, MapPin, Clock, Bell, Leaf, Droplets, Wind, TreePine, Microscope, Camera, ShieldCheck, ShieldAlert, ShieldX } from 'lucide-react';
import { Navigation } from '../components/Navigation';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Badge } from '../components/ui/badge';
import { Link } from 'react-router';
import { useApp } from '../contexts/AppContext';
import {
  listenToPendingDonations, acceptDonation, rejectDonation, markDonationPickedUp, listenToNgoDonations,
} from '../../services/donationService';
import { sendDonationStatusEmail } from '../../services/notificationService';
import { toast } from 'sonner';

export default function NGODashboard() {
  const { currentUser } = useApp();
  const ngoId = currentUser?.uid ?? '';

  const [pendingDonations, setPendingDonations] = useState([]);
  const [acceptedDonations, setAcceptedDonations] = useState([]);
  const [loading, setLoading] = useState({});

  const stats = {
    totalDonations: acceptedDonations.length,
    mealsServed: acceptedDonations.reduce((s, d) => s + d.estimatedServings, 0),
    partneredRestaurants: new Set(acceptedDonations.map(d => d.restaurantId)).size,
    pendingPickups: pendingDonations.length,
  };

  const foodSavedKg = stats.mealsServed * 0.5;
  const ecoMetrics = {
    co2Prevented: (foodSavedKg * 2.5).toFixed(1),
    methanePrevented: (foodSavedKg * 0.08).toFixed(2),
    waterSaved: Math.round(foodSavedKg * 1000),
    treesEquivalent: Math.max(0, Math.floor((foodSavedKg * 2.5) / 21))
  };

  // ── Real-time pending donations ──────────────────────────────────────────
  useEffect(() => {
    if (!ngoId) return;
    let initialLoad = true;
    const unsub = listenToPendingDonations(ngoId, (donations) => {
      setPendingDonations((prev) => {
        if (!initialLoad && donations.length > prev.length) {
          toast.info("🔔 New donation request available!");
        }
        return donations;
      });
      initialLoad = false;
    });
    return unsub;
  }, [ngoId]);

  // ── Load this NGO's accepted/picked-up donations ─────────────────────────
  useEffect(() => {
    if (!ngoId) return;
    const unsub = listenToNgoDonations(ngoId, setAcceptedDonations);
    return unsub;
  }, [ngoId]);

  const setItemLoading = (id, val) =>
    setLoading(prev => ({ ...prev, [id]: val }));

  const handleAccept = async (donationId) => {
    if (!ngoId) {
      toast.error('Please sign in as an NGO');
      return;
    }
    setItemLoading(donationId, true);
    try {
      await acceptDonation(donationId, ngoId);

      const donationObj = pendingDonations.find(d => d.id === donationId);
      if (donationObj && currentUser?.email) {
        toast.info("Dispatching email updates...");
        await sendDonationStatusEmail(currentUser.email, currentUser.name, donationObj, 'accepted');
      }

      toast.success('Donation accepted! Please pick up on time. 🤝');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to accept donation');
    } finally {
      setItemLoading(donationId, false);
    }
  };

  const handleReject = async (donationId) => {
    if (!ngoId) return;
    setItemLoading(donationId, true);
    try {
      await rejectDonation(donationId, ngoId);
      toast.info('Donation declined');
    } catch {
      toast.error('Failed to decline donation');
    } finally {
      setItemLoading(donationId, false);
    }
  };

  const handlePickedUp = async (donationId) => {
    setItemLoading(donationId, true);
    try {
      await markDonationPickedUp(donationId);

      const donationObj = acceptedDonations.find(d => d.id === donationId);
      if (donationObj && currentUser?.email) {
        await sendDonationStatusEmail(currentUser.email, currentUser.name, donationObj, 'picked_up');
      }

      toast.success('Marked as picked up! Great work! 🎉');
    } catch {
      toast.error('Failed to update status');
    } finally {
      setItemLoading(donationId, false);
    }
  };

  const DonationCard = ({ donation, type }) => (
    <motion.div
      key={donation.id}
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      className={`border-2 rounded-lg p-6 ${type === 'pending'
          ? 'border-orange-300 bg-orange-50 dark:bg-orange-950/20'
          : 'border-green-300 bg-green-50 dark:bg-green-950/20'
        }`}
    >
      <div className="space-y-4">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <div className="mb-2 flex flex-wrap items-center gap-2 sm:gap-3">
              <h3 className="text-xl font-bold">#{donation.id.slice(-6).toUpperCase()}</h3>
              <Badge className={type === 'pending' ? 'bg-orange-600' : 'bg-green-600'}>
                {donation.status.toUpperCase()}
              </Badge>
              {donation.expiryHours < 2 && (
                <Badge variant="destructive" className="animate-pulse">
                  URGENT — {donation.expiryHours}h left
                </Badge>
              )}
            </div>
            <p className="text-lg font-semibold text-green-600">{donation.restaurantName}</p>
          </div>
          <div className="text-left lg:text-right">
            <p className="text-2xl font-bold text-orange-600">{donation.quantity} items</p>
            <p className="text-sm text-muted-foreground">~{donation.estimatedServings} servings</p>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-900 rounded-lg p-4 space-y-1">
          <p className="font-medium text-sm">Items Available:</p>
          <p className="text-muted-foreground text-sm">{donation.items}</p>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <div className="flex items-start gap-2">
              <Clock className="h-5 w-5 text-muted-foreground mt-0.5 shrink-0" />
              <div>
                <p className="text-sm font-medium">Pickup Window</p>
                <p className="text-sm text-muted-foreground">{donation.pickupWindow}</p>
              </div>
            </div>
            <div className="flex items-start gap-2">
              <MapPin className="h-5 w-5 text-muted-foreground mt-0.5 shrink-0" />
              <div>
                <p className="text-sm font-medium">Address</p>
                <p className="text-sm text-muted-foreground">{donation.restaurantAddress}</p>
              </div>
            </div>
          </div>
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <Phone className="h-5 w-5 text-muted-foreground" />
              <a href={`tel:${donation.restaurantPhone}`} className="text-sm text-blue-600 hover:underline">
                {donation.restaurantPhone}
              </a>
            </div>
            <div className="flex items-center gap-2">
              <Mail className="h-5 w-5 text-muted-foreground" />
              {donation.restaurantEmail ? (
                <a href={`mailto:${donation.restaurantEmail}`} className="text-sm text-blue-600 hover:underline">
                  {donation.restaurantEmail}
                </a>
              ) : (
                <span className="text-sm text-muted-foreground">Contact via app</span>
              )}
            </div>
          </div>
        </div>

        {/* Action buttons */}
        {type === 'pending' && (
          <div className="flex flex-col gap-3 pt-4 sm:flex-row">
            <Button
              onClick={() => handleAccept(donation.id)}
              disabled={loading[donation.id]}
              className="flex-1 bg-green-600 hover:bg-green-700"
            >
              <Check className="h-4 w-4 mr-2" />
              {loading[donation.id] ? 'Accepting...' : 'Accept & Schedule Pickup'}
            </Button>
            <Button
              onClick={() => handleReject(donation.id)}
              disabled={loading[donation.id]}
              variant="outline"
              className="flex-1 border-red-300 text-red-600 hover:bg-red-50"
            >
              <X className="h-4 w-4 mr-2" /> Decline
            </Button>
          </div>
        )}

        {type === 'accepted' && donation.status === 'accepted' && (
          <div className="space-y-3">
            {/* Quality badges */}
            {(donation.restaurantQualityStatus || donation.ngoQualityStatus) && (
              <div className="flex items-center gap-2 pt-2 border-t">
                {donation.restaurantQualityStatus && (
                  <Badge variant="outline" className={`text-[10px] gap-1 ${
                    donation.restaurantQualityStatus === 'fresh' ? 'text-green-700 border-green-300' :
                    donation.restaurantQualityStatus === 'semi-rotten' ? 'text-amber-700 border-amber-300' :
                    'text-red-700 border-red-300'
                  }`}>
                    {donation.restaurantQualityStatus === 'fresh' ? <ShieldCheck className="h-3 w-3" /> :
                     donation.restaurantQualityStatus === 'semi-rotten' ? <ShieldAlert className="h-3 w-3" /> :
                     <ShieldX className="h-3 w-3" />}
                    🏪 Restaurant: {donation.restaurantQualityStatus === 'fresh' ? 'Fresh' : donation.restaurantQualityStatus === 'semi-rotten' ? 'Caution' : 'Rotten'}
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
            )}

              <div className="flex flex-col gap-3 rounded-lg bg-green-100 p-4 dark:bg-green-950/30 lg:flex-row lg:items-center lg:justify-between">
              <div className="flex items-center gap-2 text-green-700 dark:text-green-400">
                <Check className="h-5 w-5" />
                <span className="font-semibold">Pickup confirmed — Don't forget to collect!</span>
              </div>
              <div className="flex items-center gap-2">
                {!donation.ngoScanId && (
                  <Link to="/food-scanner">
                    <Button size="sm" variant="outline" className="text-xs gap-1.5 border-purple-300 text-purple-700 hover:bg-purple-50">
                      <Camera className="h-3.5 w-3.5" /> Scan at Pickup
                    </Button>
                  </Link>
                )}
                <Button
                  size="sm"
                  onClick={() => handlePickedUp(donation.id)}
                  disabled={loading[donation.id]}
                  className="bg-green-600"
                >
                  {loading[donation.id] ? '...' : 'Mark Picked Up ✅'}
                </Button>
              </div>
            </div>
          </div>
        )}

        {type === 'accepted' && donation.status === 'picked_up' && (
          <div className="bg-teal-50 dark:bg-teal-950/30 rounded-lg p-3 flex items-center gap-2 text-teal-700 dark:text-teal-400">
            <Check className="h-5 w-5" />
            <span className="text-sm font-medium">Picked up successfully! Thank you for making a difference.</span>
          </div>
        )}
      </div>
    </motion.div>
  );

  return (
    <div className="min-h-screen bg-gradient-to-br from-red-50/50 via-white to-orange-50/50 dark:from-gray-950 dark:via-gray-900 dark:to-gray-950">
      <Navigation />

      <div className="container mx-auto space-y-6 px-4 pb-24 pt-4 md:py-6">
        <div>
          <h1 className="text-3xl font-bold">NGO Dashboard</h1>
          <p className="text-muted-foreground">Manage food donations and help feed those in need</p>
        </div>

        {/* Stats */}
        <div className="grid gap-6 sm:grid-cols-2 xl:grid-cols-4">
          {[
            { label: 'Total Accepted', value: stats.totalDonations, sub: 'This month', color: 'from-red-500 to-red-600', icon: <Package className="h-12 w-12 opacity-50" /> },
            { label: 'Meals Served', value: stats.mealsServed, sub: 'Lives impacted', color: 'from-orange-500 to-orange-600', icon: <span className="text-5xl opacity-50">🍽️</span> },
            { label: 'Partner Restaurants', value: stats.partneredRestaurants, sub: 'Active donors', color: 'from-green-500 to-green-600', icon: <span className="text-5xl opacity-50">🤝</span> },
            { label: 'Pending Pickups', value: stats.pendingPickups, sub: 'Action needed', color: 'from-purple-500 to-purple-600', icon: <Bell className="h-12 w-12 opacity-50 animate-pulse" /> },
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

        {/* Eco Impact */}
        <Card className="bg-gradient-to-br from-green-600 to-emerald-800 text-white shadow-xl">
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
                <p className="text-3xl font-bold">{ecoMetrics.co2Prevented} <span className="text-lg font-normal text-white/80">kg</span></p>
              </div>
              <div className="bg-white/10 backdrop-blur rounded-xl p-4 border border-white/20">
                <div className="flex items-center gap-2 text-emerald-200 mb-2">
                  <span className="text-xl leading-none">☁️</span>
                  <p className="text-sm font-medium">Methane (CH₄)</p>
                </div>
                <p className="text-3xl font-bold">{ecoMetrics.methanePrevented} <span className="text-lg font-normal text-white/80">kg</span></p>
              </div>
              <div className="bg-white/10 backdrop-blur rounded-xl p-4 border border-white/20">
                <div className="flex items-center gap-2 text-blue-300 mb-2">
                  <Droplets className="h-5 w-5" />
                  <p className="text-sm font-medium">Water Preserved</p>
                </div>
                <p className="text-3xl font-bold">{ecoMetrics.waterSaved.toLocaleString()} <span className="text-lg font-normal text-white/80">Liters</span></p>
              </div>
              <div className="bg-white/10 backdrop-blur rounded-xl p-4 border border-white/20">
                <div className="flex items-center gap-2 text-green-300 mb-2">
                  <TreePine className="h-5 w-5" />
                  <p className="text-sm font-medium">Trees Equivalent</p>
                </div>
                <p className="text-3xl font-bold">{ecoMetrics.treesEquivalent} <span className="text-lg font-normal text-white/80">Planted</span></p>
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

        {/* Pending Donations */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Package className="h-5 w-5" />
              Incoming Donation Requests
              {pendingDonations.length > 0 && (
                <Badge variant="destructive" className="animate-pulse">
                  {pendingDonations.length} New
                </Badge>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {pendingDonations.length === 0 ? (
              <div className="py-12 text-center text-muted-foreground">
                <Package className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>No pending donation requests right now.</p>
                <p className="text-sm mt-1">You'll be notified when restaurants list surplus food.</p>
              </div>
            ) : (
              <div className="space-y-4">
                {pendingDonations.map(d => (
                  <DonationCard key={d.id} donation={d} type="pending" />
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Accepted Donations */}
        {acceptedDonations.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Check className="h-5 w-5 text-green-600" /> Your Accepted Donations
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {acceptedDonations.map(d => (
                  <DonationCard key={d.id} donation={d} type="accepted" />
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Notification Settings */}

      </div>
    </div>
  );
}
