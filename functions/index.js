const functions = require("firebase-functions");
const admin = require("firebase-admin");
const { Resend } = require("resend");

admin.initializeApp();

/**
 * Generates the HTML for the order confirmation email.
 * @param {object} orderData - The data from the order document.
 * @return {string} The HTML content of the email.
 */
function getEmailHtml(orderData) {
  const orderId = orderData.id.slice(0, 8).toUpperCase();
  const itemsHtml = orderData.items.map((item) => `
    <tr style="border-bottom: 1px solid #eee;">
      <td style="padding: 10px 0;">${item.name} (${item.size})</td>
      <td style="padding: 10px 0; text-align: right;">${item.quantity} x ${item.price}</td>
    </tr>
  `).join("");

  return `
    <div style="font-family: 'Montserrat', sans-serif; color: #2D2D2D; max-width: 600px; margin: auto; border: 1px solid #eee; padding: 20px;">
      <h1 style="font-family: 'Playfair Display', serif; color: #D4AF37; text-align: center;">Thank You For Your Order!</h1>
      <p style="text-align: center;">Hi ${orderData.shipping.fullName}, we've received your order #${orderId} and are getting it ready.</p>
      
      <h2 style="font-family: 'Playfair Display', serif; border-bottom: 1px solid #eee; padding-bottom: 10px; margin-top: 30px;">Order Summary</h2>
      <table style="width: 100%; border-collapse: collapse;">
        ${itemsHtml}
      </table>

      <div style="text-align: right; margin-top: 20px;">
        <p><strong>Subtotal:</strong> ${orderData.subtotal || orderData.total} TND</p>
        <p><strong>Shipping:</strong> ${orderData.shippingFee > 0 ? orderData.shippingFee + ' TND' : 'Free'}</p>
        <h3 style="font-family: 'Playfair Display', serif; color: #D4AF37;">Total: ${orderData.total} TND</h3>
      </div>

      <div style="text-align: center; margin-top: 30px; font-size: 0.8rem; color: #999;">
        <p>&copy; 2026 DODCH. All Rights Reserved.</p>
      </div>
    </div>
  `;
}

exports.sendOrderConfirmationEmail = functions.region("europe-west1").firestore
    .document("orders/{orderId}")
    .onCreate(async (snap, context) => {
      const orderData = snap.data();
      orderData.id = context.params.orderId;

      // Initialize Resend safely inside the function
      const apiKey = functions.config().resend ? functions.config().resend.apikey : null;
      if (!apiKey) {
        functions.logger.error("Resend API key is missing. Run: firebase functions:config:set resend.apikey='YOUR_KEY'");
        return null;
      }
      const resend = new Resend(apiKey);

      try {
        await resend.emails.send({
          from: 'DODCH <order@dodch.com>',
          to: [orderData.shipping.email],
          subject: `Your DODCH Order Confirmation (#${orderData.id.slice(0, 8).toUpperCase()})`,
          html: getEmailHtml(orderData),
        });
        functions.logger.log("Confirmation email sent to:", orderData.shipping.email);
      } catch (error) {
        functions.logger.error("There was an error sending the email:", error);
      }

      return null;
    });

/**
 * Handles contact form submissions with server-side rate limiting.
 */
exports.submitContactMessage = functions.region("europe-west1").https.onCall(async (data, context) => {
  // 1. Enforce App Check (Security Hardening)
  if (!context.app) {
    throw new functions.https.HttpsError(
        "failed-precondition",
        "The function must be called from an App Check verified app."
    );
  }

  // 2. Validate Input
  if (!data.name || !data.email || !data.message) {
    throw new functions.https.HttpsError("invalid-argument", "Missing required fields.");
  }
  if (data.message.length > 2000) {
    throw new functions.https.HttpsError("invalid-argument", "Message is too long.");
  }

  // 3. Rate Limiting (IP-based)
  const clientIp = context.rawRequest ? (context.rawRequest.headers["x-forwarded-for"] || context.rawRequest.connection.remoteAddress) : "unknown_ip";
  const sanitizedIp = String(clientIp).replace(/[^a-zA-Z0-9]/g, "_");

  const db = admin.firestore();
  const rateLimitRef = db.collection("rateLimits").doc(sanitizedIp);
  const docSnap = await rateLimitRef.get();
  const now = Date.now();
  const COOLDOWN = 120000; // 2 minutes

  // Compute a simple hash of the message content to prevent exact duplicates
  const currentMessageContent = `${data.name}|${data.email}|${data.message}`.toLowerCase().trim();

  if (docSnap.exists) {
    const rateData = docSnap.data();
    const lastTimestamp = rateData.timestamp;
    const lastContent = rateData.lastContent;
    const violationCount = rateData.violationCount || 0;

    // Rule 1: Stealth Mode (Shadow Ban)
    // If the user has violated rules more than 3 times, they enter the "Black Hole"
    if (violationCount >= 3) {
      functions.logger.warn(`Stealth Mode active for IP: ${sanitizedIp}. Dropping request silently.`);
      // Add a small fake delay to simulate real processing time
      await new Promise(resolve => setTimeout(resolve, 800 + Math.random() * 600));
      return { success: true, status: 'stealth' };
    }

    // Rule 2: Time-based Rate Limit
    if (now - lastTimestamp < COOLDOWN) {
      await rateLimitRef.update({ violationCount: admin.firestore.FieldValue.increment(1) });
      throw new functions.https.HttpsError("resource-exhausted", "Too many requests. Please wait a few minutes.");
    }

    // Rule 3: Content-based Deduplication
    if (lastContent === currentMessageContent) {
      await rateLimitRef.update({ violationCount: admin.firestore.FieldValue.increment(1) });
      throw new functions.https.HttpsError("already-exists", "Duplicate message detected. Please don't spam identical content.");
    }
  }

  // 4. Save Message (Schema Updated for Admin Console)
  await db.collection("messages").add({
    name: data.name,
    email: data.email,
    message: data.message,
    status: "unread",
    createdAt: admin.firestore.FieldValue.serverTimestamp(),
    ip: clientIp // Audit log
  });

  // 5. Update Rate Limit & Content Reference (Reset violations on successful real message)
  await rateLimitRef.set({ 
    timestamp: now,
    lastContent: currentMessageContent,
    violationCount: 0 
  });

  return { success: true };
});

/**
 * Creates an order after verifying prices and stock server-side.
 */
exports.createOrder = functions.region("europe-west1").https.onCall(async (data, context) => {
  const db = admin.firestore();
  const items = data.items;
  const shipping = data.shipping;

  if (!items || !Array.isArray(items) || items.length === 0) {
    throw new functions.https.HttpsError('invalid-argument', 'Order must contain items.');
  }
  if (!shipping) {
    throw new functions.https.HttpsError('invalid-argument', 'Shipping information is missing.');
  }

  let calculatedTotal = 0;
  const verifiedItems = [];

  // Verify each item's price against the database
  for (const item of items) {
    const productId = item.productId;
    const sizeLabel = item.size;
    const quantity = item.quantity;

    if (!productId || !quantity) {
      throw new functions.https.HttpsError('invalid-argument', 'Invalid item data.');
    }

    const productDoc = await db.collection('products').doc(productId).get();
    if (!productDoc.exists) {
      throw new functions.https.HttpsError('not-found', `Product not found: ${productId}`);
    }
    const productData = productDoc.data();

    let price = parseFloat(productData.price); // Default base price

    // If product has sizes, find the specific size price
    if (productData.sizes && Array.isArray(productData.sizes) && productData.sizes.length > 0) {
      const sizeObj = productData.sizes.find(s => s.label === sizeLabel);
      if (!sizeObj) {
        throw new functions.https.HttpsError('invalid-argument', `Invalid size ${sizeLabel} for product ${productId}`);
      }
      price = parseFloat(sizeObj.price);
    }

    calculatedTotal += price * quantity;
    verifiedItems.push({ ...item, price: price.toFixed(2) }); // Store verified price
  }

  const SHIPPING_FEE = 7;
  const FREE_SHIPPING_THRESHOLD = 100;
  const shippingFee = calculatedTotal >= FREE_SHIPPING_THRESHOLD ? 0 : SHIPPING_FEE;
  const finalTotal = calculatedTotal + shippingFee;

  const orderReference = 'ORD-' + Date.now().toString(36).toUpperCase() + Math.random().toString(36).substr(2, 5).toUpperCase();
  const orderData = {
    orderReference,
    items: verifiedItems,
    shipping,
    subtotal: parseFloat(calculatedTotal.toFixed(2)),
    shippingFee: shippingFee,
    total: parseFloat(finalTotal.toFixed(2)),
    timestamp: admin.firestore.FieldValue.serverTimestamp(),
    status: 'Pending',
    userId: context.auth ? context.auth.uid : 'guest'
  };

  const docRef = await db.collection('orders').add(orderData);
  return { orderId: docRef.id, orderReference, total: orderData.total };
});
