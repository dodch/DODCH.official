const functions = require("firebase-functions");
const admin = require("firebase-admin");
const { Resend } = require("resend");

admin.initializeApp();

// Initialize Resend with the API key from Firebase environment config
const resend = new Resend(functions.config().resend.apikey);

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
        <p><strong>Subtotal:</strong> $${orderData.total.toFixed(2)}</p>
        <p><strong>Shipping:</strong> Free</p>
        <h3 style="font-family: 'Playfair Display', serif; color: #D4AF37;">Total: $${orderData.total.toFixed(2)}</h3>
      </div>

      <div style="text-align: center; margin-top: 30px; font-size: 0.8rem; color: #999;">
        <p>&copy; 2026 DODCH. All Rights Reserved.</p>
      </div>
    </div>
  `;
}

exports.sendOrderConfirmationEmail = functions.firestore
    .document("orders/{orderId}")
    .onCreate(async (snap, context) => {
      const orderData = snap.data();
      orderData.id = context.params.orderId;

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
