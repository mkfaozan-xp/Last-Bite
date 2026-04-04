import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Leaf, DollarSign, Heart, TrendingDown, Eye, EyeOff, AlertCircle, 
  ChevronRight, Sparkles, ArrowRight, ShieldCheck, Zap,
  Globe, Clock, Users, Activity
} from 'lucide-react';
import { Button } from '../components/ui/button';
import { Input }  from '../components/ui/input';
import { Card, CardContent } from '../components/ui/card';
import { signUpWithEmail, signInWithEmail, signInWithGoogle } from '../../services/authService';
import { toast } from 'sonner';

export default function Landing() {
  const navigate = useNavigate();
  const [mode, setMode] = useState('signup');
  const [name, setName] = useState('');
  const [orgName, setOrgName] = useState('');
  const [address, setAddress] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPwd, setShowPwd] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [userTypeSelection, setUserTypeSelection] = useState('customer');
  const [ngoPeople, setNgoPeople] = useState('');
  
  // Agreements
  const [ngoAgreement, setNgoAgreement] = useState(false);
  const [restAgreement, setRestAgreement] = useState(false);
  const [restPackagingAgreement, setRestPackagingAgreement] = useState(false);
  const [privacyAgreement, setPrivacyAgreement] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 50);
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const redirectByType = (type) => {
    if (type === 'restaurant') return navigate('/restaurant-dashboard');
    if (type === 'ngo')        return navigate('/ngo-dashboard');
    navigate('/home');
  };

  const handleSubmit = async (e) => {
    if (e) e.preventDefault();
    setError('');
    
    if (!email || !password) { setError('Please fill in all fields'); return; }
    if (mode === 'signup' && !name) { setError('Please enter your name'); return; }
    if (mode === 'signup' && (userTypeSelection === 'restaurant' || userTypeSelection === 'ngo') && !orgName) {
      setError(`Please enter your ${userTypeSelection === 'restaurant' ? 'Restaurant' : 'NGO'} name`); 
      return; 
    }
    if (mode === 'signup' && (userTypeSelection === 'restaurant' || userTypeSelection === 'ngo') && !address) {
      setError(`Please enter your ${userTypeSelection === 'restaurant' ? 'Restaurant' : 'NGO'} address`);
      return;
    }
    if (mode === 'signup' && userTypeSelection === 'ngo' && !ngoPeople) {
      setError('Please disclose the number of people supported by your NGO.');
      return;
    }
    if (mode === 'signup' && userTypeSelection === 'ngo' && !ngoAgreement) {
      setError('You must agree to test the food before giving it to children.');
      return;
    }
    if (mode === 'signup' && userTypeSelection === 'restaurant' && !restAgreement) {
      setError('You must agree to automatically donate unsold food at the 24-hour mark.');
      return;
    }
    if (mode === 'signup' && userTypeSelection === 'restaurant' && !restPackagingAgreement) {
      setError('You must agree to maintain hygiene and packaging standards for donated food.');
      return;
    }
    if (mode === 'signup' && !privacyAgreement) {
      setError('You must agree to the Privacy Policy.');
      return;
    }
    if (password.length < 6) { setError('Password must be at least 6 characters'); return; }
    
    setLoading(true);
    try {
      if (mode === 'signup') {
        const user = await signUpWithEmail(email, password, name, userTypeSelection, orgName, address);
        toast.success(`Welcome to LastBite, ${user.name}! 🎉`);
        redirectByType(userTypeSelection);
      } else {
        const user = await signInWithEmail(email, password);
        toast.success(`Welcome back, ${user.name}!`);
        redirectByType(user.userType);
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Something went wrong';
      if (msg.includes('email-already-in-use')) setError('This email is already registered. Try signing in.');
      else if (msg.includes('user-not-found') || msg.includes('wrong-password') || msg.includes('invalid-credential')) setError('Invalid email or password.');
      else if (msg.includes('too-many-requests')) setError('Too many attempts. Please try again later.');
      else setError(msg);
    } finally {
      setLoading(false);
    }
  };

  const handleGoogle = async () => {
    setLoading(true);
    try {
      const user = await signInWithGoogle(userTypeSelection);
      toast.success(`Welcome, ${user.name}!`);
      redirectByType(user.userType);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Google sign-in failed');
    } finally {
      setLoading(false);
    }
  };

  // Modern UI Variants
  const fadeUp = {
    hidden: { opacity: 0, y: 30 },
    show: { opacity: 1, y: 0, transition: { duration: 0.6, ease: [0.16, 1, 0.3, 1] } }
  };
  
  const staggerContainer = {
    hidden: { opacity: 0 },
    show: { opacity: 1, transition: { staggerChildren: 0.1 } }
  };

  return (
    <div className="min-h-screen bg-[#fcfcfc] dark:bg-[#0a0a0a] text-slate-900 dark:text-slate-50 selection:bg-emerald-500/30 font-sans">
      
      {/* Dynamic Background */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none z-0">
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] rounded-full bg-emerald-500/10 dark:bg-emerald-500/5 blur-[120px] mix-blend-multiply dark:mix-blend-lighten" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] rounded-full bg-orange-500/10 dark:bg-orange-500/5 blur-[120px] mix-blend-multiply dark:mix-blend-lighten" />
        
        {/* Subtle motion orbs */}
        <motion.div 
          animate={{ x: [0, 100, 0], y: [0, -50, 0] }}
          transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
          className="absolute top-[20%] right-[20%] w-[30vw] h-[30vw] rounded-full bg-teal-400/5 blur-[100px]"
        />
      </div>

      {/* Modern Top Nav (simplified for landing) */}
      <motion.nav 
        initial={{ y: -100 }}
        animate={{ y: 0 }}
        className={`fixed top-0 inset-x-0 z-50 transition-all duration-300 ${
          scrolled ? 'bg-white/70 dark:bg-black/50 backdrop-blur-xl border-b border-white/20 dark:border-white/10 shadow-sm' : 'bg-transparent'
        }`}
      >
        <div className="container mx-auto px-6 h-20 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center shadow-lg shadow-emerald-500/20">
              <Leaf className="w-5 h-5 text-white" />
            </div>
            <span className="text-xl font-bold tracking-tight">LastBite</span>
          </div>
          <div className="hidden md:flex items-center gap-8 text-sm font-medium">
            <a href="#mission" className="hover:text-emerald-500 transition-colors">Mission</a>
            <a href="#impact" className="hover:text-emerald-500 transition-colors">Impact</a>
            <a href="#monitor" className="hover:text-emerald-500 transition-colors">Live Monitor</a>
          </div>
        </div>
      </motion.nav>

      {/* Hero Section */}
      <section className="relative pt-32 pb-20 lg:pt-48 lg:pb-32 z-10 px-4">
        <div className="container mx-auto">
          <div className="grid lg:grid-cols-12 gap-16 items-center">
            
            {/* Left Content */}
            <motion.div 
              variants={staggerContainer}
              initial="hidden"
              animate="show"
              className="lg:col-span-7 space-y-8"
            >
              <motion.div variants={fadeUp} className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-200 dark:border-emerald-500/20">
                <Sparkles className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                <span className="text-sm font-semibold text-emerald-700 dark:text-emerald-300">India's #1 Surplus Food Platform</span>
              </motion.div>
              
              <motion.h1 variants={fadeUp} className="text-5xl lg:text-7xl xl:text-8xl font-extrabold tracking-tighter leading-[1.1]">
                Save Food.<br />
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-600 to-teal-500 dark:from-emerald-400 dark:to-teal-300">
                  Save Money.
                </span><br />
                Save Lives.
              </motion.h1>
              
              <motion.p variants={fadeUp} className="text-lg lg:text-xl text-slate-600 dark:text-slate-400 max-w-2xl leading-relaxed">
                Join our revolutionary ecosystem. Access premium meals at up to 70% off, rescue surplus inventory, and ensure zero good food goes to waste.
              </motion.p>
              
              <motion.div variants={fadeUp} className="flex flex-wrap gap-4 pt-4">
                {[
                  { icon: TrendingDown, label: 'Up to 70% OFF' },
                  { icon: Globe, label: 'Eco-Friendly' },
                  { icon: Heart, label: 'Feed the Needy' },
                ].map(({ icon: Icon, label }) => (
                  <div key={label} className="flex items-center gap-2 px-5 py-3 rounded-2xl bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 shadow-sm backdrop-blur-sm">
                    <Icon className="w-5 h-5 text-emerald-500" />
                    <span className="text-sm font-semibold">{label}</span>
                  </div>
                ))}
              </motion.div>
            </motion.div>

            {/* Right Form Card */}
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.2, ease: [0.16, 1, 0.3, 1] }}
              className="lg:col-span-5 relative"
            >
              {/* Decorative elements behind form */}
              <div className="absolute -inset-0.5 bg-gradient-to-br from-emerald-500 to-orange-500 rounded-[2.5rem] blur opacity-20 dark:opacity-40" />
              
              <Card className="relative backdrop-blur-2xl bg-white/80 dark:bg-[#111111]/90 border border-white/40 dark:border-white/10 shadow-2xl rounded-[2.5rem] overflow-hidden">
                <CardContent className="p-8 sm:p-10">
                  
                  {/* Mode Switcher */}
                  <div className="flex p-1 bg-slate-100 dark:bg-white/5 rounded-2xl mb-8">
                    <button
                      onClick={() => setMode('signin')}
                      className={`flex-1 py-3 text-sm font-semibold rounded-xl transition-all duration-300 ${
                        mode === 'signin' 
                        ? 'bg-white dark:bg-white/10 shadow-md text-slate-900 dark:text-white' 
                        : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
                      }`}
                    >
                      Sign In
                    </button>
                    <button
                      onClick={() => setMode('signup')}
                      className={`flex-1 py-3 text-sm font-semibold rounded-xl transition-all duration-300 ${
                        mode === 'signup' 
                        ? 'bg-white dark:bg-white/10 shadow-md text-slate-900 dark:text-white' 
                        : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
                      }`}
                    >
                      Sign Up
                    </button>
                  </div>

                  <div className="mb-8">
                    <h3 className="text-3xl font-bold tracking-tight mb-2">
                      {mode === 'signup' ? 'Get Started' : 'Welcome Back'}
                    </h3>
                    <p className="text-slate-500 dark:text-slate-400">
                      {mode === 'signup' ? 'Create your account to start saving.' : 'Enter your details to sign in.'}
                    </p>
                  </div>

                  <form onSubmit={handleSubmit} className="space-y-5">
                    
                    {/* User Type Selection (Signup Only) */}
                    <AnimatePresence mode="popLayout">
                      {mode === 'signup' && (
                        <motion.div 
                          initial={{ opacity: 0, height: 0 }}
                          animate={{ opacity: 1, height: 'auto' }}
                          exit={{ opacity: 0, height: 0 }}
                          className="space-y-3"
                        >
                          <label className="text-sm font-semibold text-slate-700 dark:text-slate-300">I am joining as a:</label>
                          <div className="grid grid-cols-3 gap-3">
                            {['customer', 'restaurant', 'ngo'].map(type => (
                              <button
                                key={type}
                                type="button"
                                onClick={() => setUserTypeSelection(type)}
                                className={`py-3 rounded-xl text-sm font-medium capitalize transition-all border ${
                                  userTypeSelection === type 
                                  ? 'bg-emerald-500 text-white border-emerald-500 shadow-lg shadow-emerald-500/25' 
                                  : 'bg-transparent border-slate-200 dark:border-white/10 text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-white/5'
                                }`}
                              >
                                {type}
                              </button>
                            ))}
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>

                    {/* Inputs */}
                    <div className="space-y-4">
                      {mode === 'signup' && (
                        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                          <Input
                            placeholder={userTypeSelection === 'customer' ? 'Full Name' : 'Contact Person Name'}
                            value={name}
                            onChange={e => setName(e.target.value)}
                            className="bg-slate-50/50 dark:bg-[#0f0f0f] border-slate-200 dark:border-white/10 focus-visible:ring-emerald-500 h-14 rounded-xl px-4"
                          />
                        </motion.div>
                      )}
                      
                      {mode === 'signup' && (userTypeSelection === 'restaurant' || userTypeSelection === 'ngo') && (
                        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-4">
                          <Input
                            placeholder={userTypeSelection === 'restaurant' ? 'Restaurant / Business Name' : 'NGO Organization Name'}
                            value={orgName}
                            onChange={e => setOrgName(e.target.value)}
                            className="bg-slate-50/50 dark:bg-[#0f0f0f] border-slate-200 dark:border-white/10 focus-visible:ring-emerald-500 h-14 rounded-xl px-4"
                          />
                          <Input
                            placeholder="Full Address / Location"
                            value={address}
                            onChange={e => setAddress(e.target.value)}
                            className="bg-slate-50/50 dark:bg-[#0f0f0f] border-slate-200 dark:border-white/10 focus-visible:ring-emerald-500 h-14 rounded-xl px-4"
                          />
                        </motion.div>
                      )}
                      
                      {mode === 'signup' && userTypeSelection === 'ngo' && (
                        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                          <Input
                            type="number"
                            placeholder="Number of beneficiaries supported"
                            value={ngoPeople}
                            onChange={e => setNgoPeople(e.target.value)}
                            className="bg-slate-50/50 dark:bg-[#0f0f0f] border-slate-200 dark:border-white/10 focus-visible:ring-emerald-500 h-14 rounded-xl px-4"
                            min="1"
                          />
                        </motion.div>
                      )}

                      <Input
                        type="email"
                        placeholder="Email Address"
                        value={email}
                        onChange={e => setEmail(e.target.value)}
                        className="bg-slate-50/50 dark:bg-[#0f0f0f] border-slate-200 dark:border-white/10 focus-visible:ring-emerald-500 h-14 rounded-xl px-4"
                      />
                      
                      <div className="relative">
                        <Input
                          type={showPwd ? 'text' : 'password'}
                          placeholder="Password (min 6 characters)"
                          value={password}
                          onChange={e => setPassword(e.target.value)}
                          className="bg-slate-50/50 dark:bg-[#0f0f0f] border-slate-200 dark:border-white/10 focus-visible:ring-emerald-500 h-14 rounded-xl px-4 pr-12"
                        />
                        <button
                          type="button"
                          onClick={() => setShowPwd(!showPwd)}
                          className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-white transition-colors"
                        >
                          {showPwd ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                        </button>
                      </div>
                    </div>

                    {/* Legal Checkboxes */}
                    {mode === 'signup' && (
                      <div className="space-y-3 pt-2">
                        {userTypeSelection === 'ngo' && (
                          <div className="flex items-start gap-3 p-4 rounded-xl bg-orange-50/50 dark:bg-orange-500/5 border border-orange-200 dark:border-orange-500/20">
                            <input type="checkbox" id="ngo-agree" checked={ngoAgreement} onChange={e => setNgoAgreement(e.target.checked)} className="mt-1 w-4 h-4 rounded text-emerald-500 focus:ring-emerald-500" />
                            <label htmlFor="ngo-agree" className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed cursor-pointer">
                              <span className="font-semibold text-slate-800 dark:text-slate-200 block mb-1">Mandatory Policy</span>
                              I agree to strictly test and verify all received food quality before distribution.
                            </label>
                          </div>
                        )}
                        
                        {userTypeSelection === 'restaurant' && (
                          <>
                            <div className="flex items-start gap-3 p-4 rounded-xl bg-emerald-50/50 dark:bg-emerald-500/5 border border-emerald-200 dark:border-emerald-500/20">
                              <input type="checkbox" id="rest-agree" checked={restAgreement} onChange={e => setRestAgreement(e.target.checked)} className="mt-1 w-4 h-4 rounded text-emerald-500 focus:ring-emerald-500" />
                              <label htmlFor="rest-agree" className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed cursor-pointer">
                                <span className="font-semibold text-slate-800 dark:text-slate-200 block mb-1">Auto-Donation Sync</span>
                                I agree to auto-donate unsold listed inventory exactly at the 24-hour expiry mark.
                              </label>
                            </div>
                            <div className="flex items-start gap-3 p-4 rounded-xl bg-emerald-50/50 dark:bg-emerald-500/5 border border-emerald-200 dark:border-emerald-500/20">
                              <input type="checkbox" id="rest-pkg" checked={restPackagingAgreement} onChange={e => setRestPackagingAgreement(e.target.checked)} className="mt-1 w-4 h-4 rounded text-emerald-500 focus:ring-emerald-500" />
                              <label htmlFor="rest-pkg" className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed cursor-pointer">
                                <span className="font-semibold text-slate-800 dark:text-slate-200 block mb-1">Hygiene Standard</span>
                                I agree to maintain superior packaging and hygiene for all donated items.
                              </label>
                            </div>
                          </>
                        )}

                        <div className="flex items-start gap-3 p-1">
                          <input type="checkbox" id="privacy" checked={privacyAgreement} onChange={e => setPrivacyAgreement(e.target.checked)} className="mt-0.5 w-4 h-4 rounded text-emerald-500 focus:ring-emerald-500" />
                          <label htmlFor="privacy" className="text-xs text-slate-500 dark:text-slate-400 cursor-pointer">
                            I accept the <a href="#" className="underline hover:text-slate-800 dark:hover:text-white">Privacy Policy</a> & Terms of Service.
                          </label>
                        </div>
                      </div>
                    )}

                    {error && (
                      <motion.div initial={{ opacity: 0, y: -5 }} animate={{ opacity: 1, y: 0 }} className="flex items-center gap-2 p-3 bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/20 rounded-xl text-red-600 dark:text-red-400 text-sm font-medium">
                        <AlertCircle className="w-4 h-4 shrink-0" /> {error}
                      </motion.div>
                    )}

                    <div className="pt-2 space-y-3">
                      <Button 
                        type="submit" 
                        disabled={loading} 
                        className="w-full h-14 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold text-lg shadow-lg shadow-emerald-600/20 transition-all hover:-translate-y-0.5"
                      >
                        {loading ? (
                          <span className="flex items-center gap-2">
                            <span className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                            Processing...
                          </span>
                        ) : (
                          <span className="flex items-center gap-2">
                            {mode === 'signup' ? 'Create Account' : 'Sign In To Dashboard'}
                            <ArrowRight className="w-5 h-5" />
                          </span>
                        )}
                      </Button>
                      
                      <div className="relative flex items-center py-2">
                        <div className="flex-grow border-t border-slate-200 dark:border-white/10"></div>
                        <span className="flex-shrink-0 mx-4 text-xs font-semibold text-slate-400 uppercase tracking-wider">OR</span>
                        <div className="flex-grow border-t border-slate-200 dark:border-white/10"></div>
                      </div>

                      <Button
                        type="button"
                        variant="outline"
                        onClick={handleGoogle}
                        disabled={loading}
                        className="w-full h-14 rounded-xl font-semibold border-slate-200 dark:border-white/10 hover:bg-slate-50 dark:hover:bg-white/5 transition-all"
                      >
                        <svg className="w-5 h-5 mr-3" viewBox="0 0 24 24">
                          <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                          <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                          <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                          <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                        </svg>
                        Continue with Google
                      </Button>
                    </div>
                  </form>
                </CardContent>
              </Card>
            </motion.div>
          </div>
        </div>
      </section>

      {/* Impact Statistics Grid */}
      <section id="mission" className="py-24 bg-white dark:bg-[#070707] border-y border-slate-200 dark:border-white/5 relative z-10">
        <div className="container mx-auto px-4">
          <div className="text-center max-w-3xl mx-auto mb-20">
             <h2 className="text-4xl font-extrabold tracking-tight mb-4">The Crisis We Fight</h2>
             <p className="text-lg text-slate-500 dark:text-slate-400">Over $750 billion worth of food is discarded every year globally. We turn this massive loss into an opportunity to feed, save, and protect our planet.</p>
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6 lg:gap-8 max-w-6xl mx-auto">
            {[
              { stat: "30%+", suffix: "", title: "Food Insecure", desc: "Of India's population lacks consistent access to adequate food.", color: "text-red-500" },
              { stat: "78", suffix: "M", title: "Tonnes Wasted", desc: "Annually in India—equal to the entire food consumption of the UK.", color: "text-orange-500" },
              { stat: "86", suffix: "x", title: "More Potent", desc: "Methane from rotting food is 86x more harmful than CO₂ over 20yr.", color: "text-emerald-500" },
            ].map((item, i) => (
              <motion.div 
                key={i}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-100px" }}
                transition={{ duration: 0.6, delay: i * 0.1 }}
                className="group relative"
              >
                <div className="absolute inset-0 bg-gradient-to-b from-slate-50 to-white dark:from-white/5 dark:to-transparent rounded-3xl -z-10 transition-transform duration-300 group-hover:scale-105" />
                <div className="p-8 border border-slate-200 dark:border-white/10 rounded-3xl h-full backdrop-blur-sm">
                  <div className={`text-5xl lg:text-6xl font-black ${item.color} tracking-tighter mb-4`}>
                    {item.stat}<span className="text-3xl">{item.suffix}</span>
                  </div>
                  <h4 className="text-xl font-bold mb-2 text-slate-900 dark:text-white">{item.title}</h4>
                  <p className="text-slate-500 dark:text-slate-400 font-medium leading-relaxed">{item.desc}</p>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Feature / Value Props */}
      <section id="impact" className="py-24 relative overflow-hidden z-10">
        <div className="container mx-auto px-4 max-w-6xl">
          <div className="grid md:grid-cols-3 gap-12">
            {[
              { icon: Leaf, title: "Zero Waste Future", desc: "Building a circular economy where landfills starve and food is cherished." },
              { icon: Heart, title: "Empower Communities", desc: "Seamlessly connecting untouched surplus to those who need it most." },
              { icon: DollarSign, title: "Smart Economics", desc: "Slashing costs for consumers while recovering restaurant margins." },
            ].map((f, i) => (
              <motion.div 
                key={i}
                initial={{ opacity: 0, scale: 0.95 }}
                whileInView={{ opacity: 1, scale: 1 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: i * 0.1 }}
                className="text-center"
              >
                <div className="w-20 h-20 mx-auto rounded-3xl bg-emerald-100 dark:bg-emerald-500/10 flex items-center justify-center mb-6 transform -rotate-3 transition-transform hover:rotate-0 border border-emerald-200 dark:border-emerald-500/20">
                  <f.icon className="w-10 h-10 text-emerald-600 dark:text-emerald-400" />
                </div>
                <h3 className="text-2xl font-bold mb-3">{f.title}</h3>
                <p className="text-slate-500 dark:text-slate-400">{f.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Automated System Monitor */}
      <section id="monitor" className="py-24 border-t border-slate-200 dark:border-white/5 bg-slate-50 dark:bg-[#0a0a0a] z-10 relative">
        <div className="container mx-auto px-4">
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="max-w-4xl mx-auto rounded-[3rem] border border-slate-200 dark:border-white/10 bg-white dark:bg-[#111] shadow-2xl overflow-hidden"
          >
            <div className="p-10 lg:p-16 text-center relative">
              <div className="absolute top-0 inset-x-0 h-1 bg-gradient-to-r from-emerald-500 via-teal-400 to-orange-500" />
              
              <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-slate-100 dark:bg-white/5 border border-slate-200 dark:border-white/10 mb-8">
                <span className="relative flex h-2.5 w-2.5">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
                </span>
                <span className="text-xs font-bold tracking-widest uppercase text-slate-600 dark:text-slate-300">Live Infrastructure</span>
              </div>
              
              <h2 className="text-3xl lg:text-4xl font-extrabold mb-6">Automated Expiry Engine</h2>
              <p className="text-lg text-slate-500 dark:text-slate-400 max-w-2xl mx-auto mb-10 leading-relaxed">
                Our background systems constantly monitor inventory. Items within 24-48 hours of expiry get <strong>smart discounts (20%-50%)</strong>. Unpurchased items hitting the 24-hour mark are strictly removed from the marketplace and <strong>auto-donated to NGOs</strong>.
              </p>
              
              <Button 
                onClick={async () => {
                  try {
                    toast.loading("Simulating Engine Cycle...", { id: "cron" });
                    await processFoodExpiries();
                    toast.success("Cycle Complete: Discounts applied & Donations routed!", { id: "cron", duration: 5000 });
                  } catch (e) {
                    toast.error("Failed to run engine simulation.", { id: "cron" });
                  }
                }}
                className="h-16 px-10 rounded-2xl bg-slate-900 hover:bg-slate-800 dark:bg-white dark:hover:bg-slate-100 text-white dark:text-slate-900 font-bold text-lg transition-transform hover:scale-105 shadow-xl"
              >
                <Zap className="w-6 h-6 mr-3 text-emerald-500" />
                Run System Simulation
              </Button>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-[#050505] text-slate-400 py-16 border-t border-white/10 relative z-20">
        <div className="container mx-auto px-6 max-w-6xl">
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-12 mb-16">
            <div className="lg:col-span-1">
              <div className="flex items-center gap-2 mb-6">
                <Leaf className="w-6 h-6 text-emerald-500" />
                <span className="text-2xl font-bold text-white tracking-tight">LastBite</span>
              </div>
              <p className="text-sm leading-relaxed mb-6">India's premiere ecosystem connecting smart consumers and dedicated NGOs with high-quality surplus food.</p>
            </div>
            
            <div>
              <h4 className="text-white font-semibold mb-6">Platform</h4>
              <ul className="space-y-4 text-sm">
                <li><a href="#" className="hover:text-emerald-400 transition-colors">How it Works</a></li>
                <li><a href="#" className="hover:text-emerald-400 transition-colors">Partner Restaurants</a></li>
                <li><a href="#" className="hover:text-emerald-400 transition-colors">NGO Network</a></li>
              </ul>
            </div>

            <div>
              <h4 className="text-white font-semibold mb-6">Legal</h4>
              <ul className="space-y-4 text-sm">
                <li><a href="#" className="hover:text-emerald-400 transition-colors">Privacy Policy</a></li>
                <li><a href="#" className="hover:text-emerald-400 transition-colors">Terms of Service</a></li>
                <li><a href="#" className="hover:text-emerald-400 transition-colors">Trust & Safety</a></li>
              </ul>
            </div>

            <div>
              <h4 className="text-white font-semibold mb-6">Contact</h4>
              <ul className="space-y-4 text-sm">
                <li><a href="mailto:hello@lastbite.in" className="hover:text-emerald-400 transition-colors">hello@lastbite.in</a></li>
                <li><a href="tel:+917569190999" className="hover:text-emerald-400 transition-colors">+91 7569190999</a></li>
                <li><a href="tel:+919907131830" className="hover:text-emerald-400 transition-colors">+91 9907131830</a></li>
              </ul>
            </div>
          </div>
          
          <div className="pt-8 border-t border-white/10 flex flex-col md:flex-row items-center justify-between gap-4">
            <p className="text-xs text-slate-500">
              &copy; {new Date().getFullYear()} LastBite Technologies. Made with <Heart className="w-3 h-3 inline text-red-500 mx-1"/> in India.
            </p>
            <div className="flex gap-4">
               {/* Social Icons would go here */}
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}