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

      const apiKey = functions.config().resend ? functions.config().resend.apikey : null;
      if (!apiKey) {
        functions.logger.error("Resend API key is missing.");
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
      } catch (error) {
        functions.logger.error("Error sending email:", error);
      }

      return null;
    });

/**
 * Shared Rate Limiter Logic
 */
async function checkRateLimit(ip, db, type = "contact") {
  const sanitizedIp = String(ip).replace(/[^a-zA-Z0-9]/g, "_");
  const rateLimitRef = db.collection("rateLimits").doc(`${type}_${sanitizedIp}`);
  const docSnap = await rateLimitRef.get();
  const now = Date.now();
  const COOLDOWN = 120000; // 2 minutes

  if (docSnap.exists) {
    const rateData = docSnap.data();
    const lastTimestamp = rateData.timestamp;
    const lastTimestampMillis = (typeof lastTimestamp === 'number') ? lastTimestamp : (lastTimestamp.toMillis ? lastTimestamp.toMillis() : 0);
    const violationCount = rateData.violationCount || 0;

    if (violationCount >= 5) {
      return { status: 'blocked', ref: rateLimitRef };
    }

    if (now - lastTimestampMillis < COOLDOWN) {
      await rateLimitRef.update({ violationCount: admin.firestore.FieldValue.increment(1) });
      return { status: 'rate-limited', ref: rateLimitRef };
    }
  }
  return { status: 'ok', ref: rateLimitRef };
}

/**
 * Handles contact form submissions
 */
exports.submitContactMessage = functions.region("europe-west1").https.onCall(async (data, context) => {
  if (!context.app) {
    throw new functions.https.HttpsError("failed-precondition", "App Check required.");
  }

  // 1. Strict Validation
  if (!data.name || data.name.length > 100 || !data.email || data.email.length > 150 || !data.message || data.message.length > 2000) {
    throw new functions.https.HttpsError("invalid-argument", "Invalid input.");
  }

  // 2. reCAPTCHA Verification
  const recaptchaSecret = functions.config().recaptcha ? functions.config().recaptcha.secret : null;
  if (!recaptchaSecret) {
    throw new functions.https.HttpsError("internal", "Security misconfiguration.");
  }

  const verifyResponse = await fetch(`https://www.google.com/recaptcha/api/siteverify?secret=${recaptchaSecret}&response=${data.recaptchaToken}`, { method: "POST" });
  const verifyData = await verifyResponse.json();
  if (!verifyData.success || verifyData.score < 0.5) {
    throw new functions.https.HttpsError("permission-denied", "Security check failed.");
  }

  // 3. Rate Limiting
  const db = admin.firestore();
  const clientIp = context.rawRequest ? (context.rawRequest.ip || context.rawRequest.headers["x-forwarded-for"] || context.rawRequest.connection.remoteAddress) : "unknown_ip";
  const limit = await checkRateLimit(clientIp, db, "contact");

  if (limit.status === 'blocked') {
    await new Promise(r => setTimeout(r, 1000));
    return { success: true, stealth: true };
  }
  if (limit.status === 'rate-limited') {
    throw new functions.https.HttpsError("resource-exhausted", "Please wait before sending another message.");
  }

  // 4. Save
  await db.collection("messages").add({
    name: data.name,
    email: data.email,
    message: data.message,
    status: "unread",
    createdAt: admin.firestore.FieldValue.serverTimestamp(),
    ip: clientIp
  });

  await limit.ref.set({ timestamp: Date.now(), violationCount: 0 });
  return { success: true };
});

/**
 * Handles newsletter subscriptions
 */
exports.subscribeNewsletter = functions.region("europe-west1").https.onCall(async (data, context) => {
  if (!context.app) {
    throw new functions.https.HttpsError("failed-precondition", "App Check required.");
  }

  if (!data.email || data.email.length > 150) {
    throw new functions.https.HttpsError("invalid-argument", "Invalid email.");
  }

  const db = admin.firestore();
  const clientIp = context.rawRequest ? (context.rawRequest.ip || context.rawRequest.headers["x-forwarded-for"] || context.rawRequest.connection.remoteAddress) : "unknown_ip";
  const limit = await checkRateLimit(clientIp, db, "newsletter");

  if (limit.status !== 'ok') {
    throw new functions.https.HttpsError("resource-exhausted", "Too many attempts.");
  }

  await db.collection("newsletter").add({
    email: data.email,
    createdAt: admin.firestore.FieldValue.serverTimestamp(),
    ip: clientIp
  });

  await limit.ref.set({ timestamp: Date.now(), violationCount: 0 });
  return { success: true };
});

/**
 * Creates an order
 */
exports.createOrder = functions.region("europe-west1").https.onCall(async (data, context) => {
  const db = admin.firestore();
  const items = data.items;
  const shipping = data.shipping;

  if (!items || !Array.isArray(items) || items.length === 0 || !shipping) {
    throw new functions.https.HttpsError('invalid-argument', 'Invalid order data.');
  }

  let calculatedTotal = 0;
  const verifiedItems = [];

  for (const item of items) {
    const productDoc = await db.collection('products').doc(item.productId).get();
    if (!productDoc.exists) throw new functions.https.HttpsError('not-found', 'Product not found.');
    const productData = productDoc.data();
    let price = parseFloat(productData.price);

    if (productData.sizes && Array.isArray(productData.sizes) && productData.sizes.length > 0) {
      const sizeObj = productData.sizes.find(s => s.label === item.size);
      if (sizeObj) price = parseFloat(sizeObj.price);
    }

    calculatedTotal += price * item.quantity;
    verifiedItems.push({ ...item, price: price.toFixed(2) });
  }

  const SHIPPING_FEE = 7;
  const FREE_SHIPPING_THRESHOLD = 100;
  const shippingFee = calculatedTotal >= FREE_SHIPPING_THRESHOLD ? 0 : SHIPPING_FEE;
  const finalTotal = calculatedTotal + shippingFee;

  const orderReference = 'ORD-' + Date.now().toString(36).toUpperCase();
  const orderData = {
    orderReference,
    items: verifiedItems,
    shipping,
    subtotal: parseFloat(calculatedTotal.toFixed(2)),
    shippingFee,
    total: parseFloat(finalTotal.toFixed(2)),
    timestamp: admin.firestore.FieldValue.serverTimestamp(),
    status: 'Pending',
    userId: context.auth ? context.auth.uid : 'guest'
  };

  const docRef = await db.collection('orders').add(orderData);
  return { orderId: docRef.id, orderReference, total: orderData.total };
});
