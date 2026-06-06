const functions = require("firebase-functions");
const admin = require("firebase-admin");
const { Resend } = require("resend");

admin.initializeApp();

/**
 * Generates the HTML for the order confirmation email.
 */
function getEmailHtml(orderData) {
  const orderId = orderData.id.slice(0, 8).toUpperCase();
  const itemsHtml = orderData.items.map((item) => `
    <tr style="border-bottom: 1px solid #eee;">
      <td style="padding: 15px 0;">
        <div style="font-weight: 600;">${item.name} (${item.size})</div>
        <div style="font-size: 0.75rem; color: #888; margin-top: 4px;">Batch: ${item.batchNumber || 'N/A'} | Exp: ${item.expiryDate || 'N/A'}</div>
      </td>
      <td style="padding: 15px 0; text-align: right; vertical-align: top;">${item.quantity} x ${item.price}</td>
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

      const apiKey = functions.config().resend ? functions.config().resend.apikey : null;
      if (!apiKey) {
        functions.logger.error("Resend API key is missing.");
        return;
      }

      const resend = new Resend(apiKey);
      try {
        await resend.emails.send({
          from: "DODCH Cosmetics <orders@dodch.com>",
          to: [orderData.shipping.email],
          subject: `Order Confirmation #${orderData.orderReference || orderData.id.slice(0, 8)}`,
          html: getEmailHtml(orderData),
        });
        functions.logger.log("Confirmation email sent to:", orderData.shipping.email);
      } catch (error) {
        functions.logger.error("Failed to send email:", error);
      }
    });

/**
 * Handles newsletter subscription
 */
exports.subscribeNewsletter = functions.region("europe-west1").https.onCall(async (data, context) => {
  const email = data.email;
  if (!email || !email.includes("@")) {
    throw new functions.https.HttpsError("invalid-argument", "Invalid email.");
  }

  const db = admin.firestore();
  await db.collection("subscribers").doc(email).set({
    email,
    timestamp: admin.firestore.FieldValue.serverTimestamp(),
  });

  return { success: true };
});

/**
 * Handles contact form messages
 */
exports.submitContactMessage = functions.region("europe-west1").https.onCall(async (data, context) => {
  if (!context.app) {
    throw new functions.https.HttpsError("failed-precondition", "App Check required.");
  }

  const { name, email, message } = data;
  if (!name || !email || !message) {
    throw new functions.https.HttpsError("invalid-argument", "Missing fields.");
  }

  const db = admin.firestore();
  
  // Anti-spam check
  const clientIp = context.rawRequest ? (context.rawRequest.ip || context.rawRequest.headers["x-forwarded-for"] || "unknown") : "unknown";
  const limitRef = db.collection("system").doc("limits").collection("messages").doc(clientIp.replace(/\./g, "_"));
  const limit = await limitRef.get();
  
  if (limit.exists()) {
    const lastMsg = limit.data().timestamp;
    if (Date.now() - lastMsg < 60000) {
      throw new functions.https.HttpsError("resource-exhausted", "Too many messages. Wait 1 minute.");
    }
  }

  await db.collection("messages").add({
    name,
    email,
    message,
    status: 'unread',
    createdAt: admin.firestore.FieldValue.serverTimestamp(),
    ip: clientIp
  });

  await limitRef.set({ timestamp: Date.now() });
  return { success: true };
});

/**
 * Creates an order
 */
exports.createOrder = functions.region("europe-west1").https.onCall(async (data, context) => {
  try {
    const db = admin.firestore();
    const items = data.items;
    const shipping = data.shipping;

    if (!items || !Array.isArray(items) || items.length === 0 || !shipping) {
      throw new functions.https.HttpsError('invalid-argument', 'Invalid order data.');
    }

    // Validate shipping info
    if (!shipping.email || !shipping.fullName || !shipping.address || !shipping.city) {
      throw new functions.https.HttpsError('invalid-argument', 'Incomplete shipping information.');
    }

    let calculatedTotal = 0;
    const verifiedItems = [];

    // Process items - verify prices against Firebase prices collection
    for (const item of items) {
      const pid = item.productId || item.id;
      if (!pid) {
        throw new functions.https.HttpsError('invalid-argument', `Missing product ID for item: ${item.name}`);
      }

      const quantity = parseInt(item.quantity) || 1;
      let verifiedPrice = parseFloat(item.price);
      
      // Look up price from Firebase if available
      try {
        let priceDoc = await db.collection('prices').doc(pid).get();
        if (!priceDoc.exists) {
          priceDoc = await db.collection('products').doc(pid).get();
        }

        if (priceDoc.exists) {
          const priceData = priceDoc.data();
          let authoritativePrice = verifiedPrice;
          
          if (item.size && priceData.sizes && !Array.isArray(priceData.sizes) && priceData.sizes[item.size]) {
            authoritativePrice = parseFloat(priceData.sizes[item.size]);
          } 
          else if (item.size && priceData.sizes && Array.isArray(priceData.sizes)) {
            const sizeObj = priceData.sizes.find(s => s.label === item.size);
            if (sizeObj && sizeObj.price) authoritativePrice = parseFloat(sizeObj.price);
          }
          else if (priceData.price) {
            authoritativePrice = parseFloat(priceData.price);
          }
          else if (priceData.basePrice) {
            authoritativePrice = parseFloat(priceData.basePrice);
          }
          
          verifiedPrice = authoritativePrice;
        }
      } catch (err) {
        functions.logger.warn(`Could not verify price for ${pid}:`, err);
      }
      
      if (verifiedPrice <= 0 || verifiedPrice > 1000) {
        throw new functions.https.HttpsError('out-of-range', `Price for ${item.name} is out of range.`);
      }

      calculatedTotal += verifiedPrice * quantity;
      verifiedItems.push({
        ...item,
        price: verifiedPrice.toFixed(2),
        productId: pid,
        quantity: quantity,
        subtotal: parseFloat((verifiedPrice * quantity).toFixed(2))
      });
    }

    const shippingFee = parseFloat(data.shippingFee) || 7;
    const finalTotal = parseFloat((calculatedTotal + shippingFee).toFixed(2));

    const orderReference = data.orderReference || ('ORD-' + Date.now().toString(36).toUpperCase());
    
    const orderData = {
      orderReference,
      items: verifiedItems,
      shipping,
      subtotal: parseFloat(calculatedTotal.toFixed(2)),
      shippingFee,
      total: finalTotal,
      timestamp: admin.firestore.FieldValue.serverTimestamp(),
      status: 'Pending',
      userId: context.auth ? context.auth.uid : 'guest',
      ip: context.rawRequest ? (context.rawRequest.ip || context.rawRequest.headers["x-forwarded-for"] || 'unknown') : 'unknown'
    };

    const docRef = await db.collection("orders").add(orderData);

    return {
      success: true,
      orderId: docRef.id,
      orderReference: orderReference,
      total: finalTotal
    };
  } catch (error) {
    functions.logger.error("Error in createOrder:", error);
    if (error instanceof functions.https.HttpsError) {
      throw error;
    }
    throw new functions.https.HttpsError('internal', error.message || 'Unknown error occurred');
  }
});
