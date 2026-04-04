import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../firebase';

/**
 * Fires an automated email by writing a document to the standard 'mail'
 * collection, which is monitored by Firebase's SendGrid or Trigger Email extension.
 */
export async function sendEmailNotification(to, subject, htmlBody) {
  try {
    await addDoc(collection(db, 'mail'), {
      to,
      message: {
        subject,
        html: htmlBody,
      },
      createdAt: serverTimestamp(),
      status: 'pending' // Processed asynchronously by the database backend
    });
    console.log(`[Notification Service] Registered email dispatcher target: ${to}`);
  } catch (err) {
    console.error('Failed to queue email notification:', err);
  }
}

/**
 * Specific template constructor for donation updates
 */
export async function sendDonationStatusEmail(ngoEmail, ngoName, donation, actionType) {
  if (!ngoEmail) return;

  const subject = actionType === 'accepted' 
    ? '✅ Donation Pick-up Scheduled!' 
    : '🎉 Donation Pick-up Completed!';
    
  let html = `
    <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
      <h2 style="color: #16a34a;">LastBite Update</h2>
      <p>Hello ${ngoName},</p>
  `;

  if (actionType === 'accepted') {
    html += `
      <p>You have successfully accepted a donation from <strong>${donation.restaurantName}</strong>.</p>
      <div style="background: #f1f5f9; padding: 15px; border-radius: 8px;">
        <p><strong>Quantity:</strong> ${donation.quantity} items (~${donation.estimatedServings} servings)</p>
        <p><strong>Pickup Time:</strong> ${donation.pickupWindow || 'Anytime today'}</p>
        <p><strong>Address:</strong> ${donation.restaurantAddress || 'Check dashboard for location details'}</p>
        <p><strong>Phone:</strong> ${donation.restaurantPhone || 'N/A'}</p>
      </div>
      <p>Please make sure to arrive within the pickup window. Thank you for your service!</p>
    `;
  } else if (actionType === 'picked_up') {
    html += `
      <p>We've registered your successful pickup from <strong>${donation.restaurantName}</strong>.</p>
      <p>Thank you for partnering with LastBite to eliminate food waste and support communities directly. The meals you transported today make a real difference.</p>
    `;
  }

  html += `
      <p style="color: #64748b; font-size: 12px; margin-top: 30px;">
        Automated message from LastBite Platform
      </p>
    </div>
  `;

  await sendEmailNotification(ngoEmail, subject, html);
}
