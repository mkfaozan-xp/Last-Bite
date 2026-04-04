import { useEffect } from 'react';
import { collection, getDocs, query, where, updateDoc, doc } from 'firebase/firestore';
import { db } from '../../firebase';
import { createDonation } from '../../services/donationService';
import { toast } from 'sonner';

export function useExpiryEngine() {
  useEffect(() => {
    // Run the engine every minute
    const interval = setInterval(async () => {
      try {
        const q = query(collection(db, 'foodItems'), where('isAvailable', '==', true));
        const snap = await getDocs(q);
        const now = new Date();

        for (const document of snap.docs) {
          const item = document.data();
          const expiryTime = item.expiryTime?.toDate?.() || new Date();

          if (expiryTime <= now) {
            // Food item has expired. We try to convert it.
            // Mark as unavailable first to prevent double-processing
            const docRef = doc(db, 'foodItems', document.id);
            await updateDoc(docRef, { isAvailable: false });

            // Create donation
            const donationPayload = {
              restaurantId: item.restaurantId,
              restaurantName: item.restaurantName || 'Partner Restaurant',
              restaurantAddress: item.restaurantAddress || '',
              restaurantPhone: item.restaurantPhone || '',
              items: `${item.name} (${item.quantity})`,
              quantity: item.quantity,
              estimatedServings: item.quantity,
              pickupWindow: 'Anytime today',
              expiryHours: 24, // NGOs have some time to pick up
            };

            await createDonation(donationPayload);
            console.log(`[ExpiryEngine] Converted expired item ${item.name} to donation.`);
            
            // Note: the NGODashboard already listens to pending donations, 
            // so we don't need to fire UI toasts for *all* users here, 
            // but we could if we wanted. The dashboard will show the badge.
          }
        }
      } catch (err) {
        console.error('[ExpiryEngine] Error processing expired foods:', err);
      }
    }, 60000); // Check every 60 seconds

    return () => clearInterval(interval);
  }, []);
}
