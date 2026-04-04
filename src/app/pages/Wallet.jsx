import { useState } from 'react';
import { motion } from 'motion/react';
import { Wallet as WalletIcon, Plus, ArrowUpRight, ArrowDownRight, Gift, CreditCard, History } from 'lucide-react';
import { Navigation } from '../components/Navigation';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Badge } from '../components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '../components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
import { useApp } from '../contexts/AppContext';
import { topUpWallet, sendGiftCard } from '../../services/walletService';
import { toast } from 'sonner';

export default function Wallet() {
  const { walletBalance, transactions, currentUser } = useApp();

  const [addMoneyAmount, setAddMoneyAmount] = useState('');
  const [giftCardAmount, setGiftCardAmount] = useState('');
  const [recipientEmail, setRecipientEmail] = useState('');
  const [showAddMoney, setShowAddMoney] = useState(false);
  const [showGiftCard, setShowGiftCard] = useState(false);
  const [loading, setLoading] = useState(false);

  const quickAmounts = [500, 1000, 2000, 5000];

  const handleAddMoney = async () => {
    if (!currentUser) { toast.error('Please sign in first'); return; }
    const amount = Number(addMoneyAmount);
    if (amount <= 0) { toast.error('Enter a valid amount'); return; }
    setLoading(true);
    try {
      await topUpWallet(currentUser.uid, amount);
      toast.success(`₹${amount} added to wallet! 💰`);
      setAddMoneyAmount('');
      setShowAddMoney(false);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to add money');
    } finally {
      setLoading(false);
    }
  };

  const handleSendGift = async () => {
    if (!currentUser) { toast.error('Please sign in first'); return; }
    const amount = Number(giftCardAmount);
    if (amount <= 0 || !recipientEmail) { toast.error('Please fill all fields'); return; }
    setLoading(true);
    try {
      await sendGiftCard(currentUser.uid, recipientEmail, amount);
      toast.success(`🎁 Gift card worth ₹${amount} sent to ${recipientEmail}!`);
      setGiftCardAmount('');
      setRecipientEmail('');
      setShowGiftCard(false);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to send gift card');
    } finally {
      setLoading(false);
    }
  };

  const credits = transactions.filter(t => t.type === 'credit');
  const debits = transactions.filter(t => t.type === 'debit');
  const totalSpent = debits.reduce((s, t) => s + t.amount, 0);
  const totalAdded = credits.reduce((s, t) => s + t.amount, 0);

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50/50 via-white to-blue-50/50 dark:from-gray-950 dark:via-gray-900 dark:to-gray-950">
      <Navigation />

      <div className="container mx-auto px-4 py-6 space-y-6">
        <div>
          <h1 className="text-3xl font-bold">My Wallet</h1>
          <p className="text-muted-foreground">Manage your balance and transactions</p>
        </div>

        {/* Balance Card */}
        <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}>
          <Card className="bg-gradient-to-br from-green-600 via-green-500 to-orange-500 text-white border-0 shadow-2xl overflow-hidden">
            <CardContent className="p-8 relative">
              <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full -translate-y-32 translate-x-32" />
              <div className="absolute bottom-0 left-0 w-48 h-48 bg-white/10 rounded-full translate-y-24 -translate-x-24" />
              <div className="relative space-y-6">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 bg-white/20 backdrop-blur rounded-full flex items-center justify-center">
                    <WalletIcon className="h-6 w-6" />
                  </div>
                  <div>
                    <p className="text-white/80 text-sm">Total Balance</p>
                    <p className="text-4xl font-bold">₹{walletBalance.toLocaleString()}</p>
                  </div>
                </div>
                <div className="flex gap-3">
                  {/* Add Money Dialog */}
                  <Dialog open={showAddMoney} onOpenChange={setShowAddMoney}>
                    <DialogTrigger asChild>
                      <Button className="flex-1 bg-white text-green-600 hover:bg-white/90">
                        <Plus className="h-4 w-4 mr-2" /> Add Money
                      </Button>
                    </DialogTrigger>
                    <DialogContent>
                      <DialogHeader><DialogTitle>Add Money to Wallet</DialogTitle></DialogHeader>
                      <div className="space-y-4">
                        <div className="grid grid-cols-4 gap-2">
                          {quickAmounts.map(a => (
                            <Button key={a} variant="outline" size="sm" onClick={() => setAddMoneyAmount(String(a))}>
                              ₹{a}
                            </Button>
                          ))}
                        </div>
                        <Input
                          type="number"
                          placeholder="Enter custom amount"
                          value={addMoneyAmount}
                          onChange={e => setAddMoneyAmount(e.target.value)}
                          className="h-12"
                        />
                        <div className="p-3 bg-muted rounded-lg text-sm space-y-1">
                          <div className="flex items-center gap-2"><CreditCard className="h-4 w-4" /> Secure payment via Razorpay</div>
                          <p className="text-muted-foreground">UPI, Net Banking, Cards accepted</p>
                        </div>
                        <Button onClick={handleAddMoney} disabled={loading} className="w-full bg-gradient-to-r from-green-600 to-orange-600">
                          {loading ? 'Processing...' : `Add ₹${addMoneyAmount || '0'} to Wallet`}
                        </Button>
                      </div>
                    </DialogContent>
                  </Dialog>

                  {/* Gift Card Dialog */}
                  <Dialog open={showGiftCard} onOpenChange={setShowGiftCard}>
                    <DialogTrigger asChild>
                      <Button variant="outline" className="flex-1 border-white text-white hover:bg-white/10">
                        <Gift className="h-4 w-4 mr-2" /> Gift Card
                      </Button>
                    </DialogTrigger>
                    <DialogContent>
                      <DialogHeader><DialogTitle>Send Gift Card</DialogTitle></DialogHeader>
                      <div className="space-y-4">
                        <Input
                          type="email"
                          placeholder="Recipient's LastBite email"
                          value={recipientEmail}
                          onChange={e => setRecipientEmail(e.target.value)}
                          className="h-12"
                        />
                        <Input
                          type="number"
                          placeholder="Amount (₹)"
                          value={giftCardAmount}
                          onChange={e => setGiftCardAmount(e.target.value)}
                          className="h-12"
                        />
                        <div className="p-3 bg-muted rounded-lg text-sm">
                          Your balance: <span className="font-bold text-green-600">₹{walletBalance}</span>
                        </div>
                        <Button onClick={handleSendGift} disabled={loading} className="w-full bg-gradient-to-r from-purple-600 to-pink-600">
                          {loading ? 'Sending...' : `Send ₹${giftCardAmount || '0'} Gift Card`}
                        </Button>
                      </div>
                    </DialogContent>
                  </Dialog>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Stats */}
        <div className="grid md:grid-cols-3 gap-4">
          <Card>
            <CardContent className="p-6 flex items-center gap-4">
              <div className="w-12 h-12 bg-green-100 dark:bg-green-950/30 rounded-xl flex items-center justify-center">
                <ArrowDownRight className="h-6 w-6 text-green-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Total Added</p>
                <p className="text-2xl font-bold text-green-600">₹{totalAdded.toLocaleString()}</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-6 flex items-center gap-4">
              <div className="w-12 h-12 bg-red-100 dark:bg-red-950/30 rounded-xl flex items-center justify-center">
                <ArrowUpRight className="h-6 w-6 text-red-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Total Spent</p>
                <p className="text-2xl font-bold text-red-600">₹{totalSpent.toLocaleString()}</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-6 flex items-center gap-4">
              <div className="w-12 h-12 bg-orange-100 dark:bg-orange-950/30 rounded-xl flex items-center justify-center">
                <Gift className="h-6 w-6 text-orange-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Cashback Earned</p>
                <p className="text-2xl font-bold text-orange-600">
                  ₹{credits.filter(t => t.source === 'cashback').reduce((s, t) => s + t.amount, 0)}
                </p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Transaction History */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <History className="h-5 w-5" /> Transaction History
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue="all">
              <TabsList>
                <TabsTrigger value="all">All</TabsTrigger>
                <TabsTrigger value="credit">Credits</TabsTrigger>
                <TabsTrigger value="debit">Debits</TabsTrigger>
              </TabsList>
              {['all', 'credit', 'debit'].map(tab => (
                <TabsContent key={tab} value={tab} className="space-y-3 mt-4">
                  {(tab === 'all' ? transactions : tab === 'credit' ? credits : debits).length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground">No transactions yet</div>
                  ) : (
                    (tab === 'all' ? transactions : tab === 'credit' ? credits : debits).map(txn => (
                      <motion.div
                        key={txn.id}
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50 transition-colors"
                      >
                        <div className="flex items-center gap-3">
                          <div className={`w-10 h-10 rounded-full flex items-center justify-center ${txn.type === 'credit' ? 'bg-green-100 dark:bg-green-950/30' : 'bg-red-100 dark:bg-red-950/30'}`}>
                            {txn.type === 'credit'
                              ? <ArrowDownRight className="h-5 w-5 text-green-600" />
                              : <ArrowUpRight className="h-5 w-5 text-red-600" />}
                          </div>
                          <div>
                            <p className="font-medium text-sm">{txn.description}</p>
                            <p className="text-xs text-muted-foreground">
                              {txn.createdAt?.toLocaleDateString()} {txn.createdAt?.toLocaleTimeString()}
                            </p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className={`font-bold ${txn.type === 'credit' ? 'text-green-600' : 'text-red-600'}`}>
                            {txn.type === 'credit' ? '+' : '-'}₹{txn.amount}
                          </p>
                          <p className="text-xs text-muted-foreground">Bal: ₹{txn.balance}</p>
                        </div>
                      </motion.div>
                    ))
                  )}
                </TabsContent>
              ))}
            </Tabs>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
