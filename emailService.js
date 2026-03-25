const nodemailer = require('nodemailer');

// Email-Konfiguration
const transporter = nodemailer.createTransport({
  host: process.env.EMAIL_HOST,
  port: process.env.EMAIL_PORT,
  secure: true, // true für 465, false für andere Ports
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASSWORD,
  },
});

// HTML-Vorlage für Rechnung
function generateInvoiceHTML(invoiceData) {
  const {
    customerName,
    customerEmail,
    productName,
    amount,
    paymentId,
    date,
    shopName,
  } = invoiceData;

  const formattedDate = new Date(date).toLocaleDateString('de-DE');

  return `
    <!DOCTYPE html>
    <html lang="de">
    <head>
      <meta charset="UTF-8">
      <style>
        body {
          font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
          line-height: 1.6;
          color: #333;
          background: #f5f5f5;
          margin: 0;
          padding: 20px;
        }
        .container {
          max-width: 600px;
          margin: 0 auto;
          background: white;
          padding: 40px;
          border-radius: 8px;
          box-shadow: 0 2px 8px rgba(0,0,0,0.1);
        }
        .header {
          border-bottom: 3px solid #A67C5B;
          padding-bottom: 20px;
          margin-bottom: 30px;
        }
        .logo {
          font-size: 24px;
          font-weight: bold;
          color: #2C2820;
          margin-bottom: 5px;
        }
        .subtitle {
          color: #9A8D80;
          font-size: 14px;
        }
        .invoice-number {
          background: #F8F4EE;
          padding: 15px;
          border-radius: 4px;
          margin-bottom: 30px;
          border-left: 4px solid #A67C5B;
        }
        .customer-info {
          margin-bottom: 30px;
        }
        .customer-info h3 {
          color: #A67C5B;
          font-size: 12px;
          text-transform: uppercase;
          letter-spacing: 1px;
          margin: 0 0 10px 0;
        }
        .customer-info p {
          margin: 5px 0;
          color: #555;
        }
        .invoice-items {
          margin-bottom: 30px;
        }
        .invoice-items table {
          width: 100%;
          border-collapse: collapse;
        }
        .invoice-items th {
          background: #F8F4EE;
          padding: 12px;
          text-align: left;
          font-weight: 600;
          color: #2C2820;
          border-bottom: 2px solid #D4C4B0;
        }
        .invoice-items td {
          padding: 12px;
          border-bottom: 1px solid #E8DDD0;
        }
        .amount-col {
          text-align: right;
        }
        .total-row {
          background: #F8F4EE;
          font-weight: 600;
          color: #A67C5B;
          font-size: 16px;
        }
        .footer {
          margin-top: 40px;
          padding-top: 20px;
          border-top: 1px solid #E8DDD0;
          color: #9A8D80;
          font-size: 12px;
          text-align: center;
        }
        .thanks {
          margin-top: 30px;
          padding: 20px;
          background: #F8F4EE;
          border-radius: 4px;
          text-align: center;
          color: #5C7361;
        }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <div class="logo">${shopName}</div>
          <div class="subtitle">Wellness & Massage</div>
        </div>

        <div class="invoice-number">
          <strong>Rechnung Nr:</strong> #${paymentId.substring(0, 8).toUpperCase()}<br>
          <strong>Datum:</strong> ${formattedDate}
        </div>

        <div class="customer-info">
          <h3>Kundeninformation</h3>
          <p><strong>${customerName}</strong></p>
          <p>${customerEmail}</p>
        </div>

        <div class="invoice-items">
          <table>
            <thead>
              <tr>
                <th>Leistung</th>
                <th class="amount-col">Betrag</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>${productName}</td>
                <td class="amount-col">€ ${(amount / 100).toFixed(2)}</td>
              </tr>
              <tr class="total-row">
                <td><strong>Gesamtbetrag</strong></td>
                <td class="amount-col"><strong>€ ${(amount / 100).toFixed(2)}</strong></td>
              </tr>
            </tbody>
          </table>
        </div>

        <div class="thanks">
          <p><strong>Vielen Dank für dein Vertrauen!</strong></p>
          <p>Wir freuen uns, dich bald in unserem Studio begrüßen zu dürfen.</p>
        </div>

        <div class="footer">
          <p>© ${new Date().getFullYear()} ${shopName}. Alle Rechte vorbehalten.</p>
          <p>Diese Rechnung wurde automatisch generiert.</p>
        </div>
      </div>
    </body>
    </html>
  `;
}

// Rechnung versenden
async function sendInvoice(invoiceData) {
  try {
    const htmlContent = generateInvoiceHTML(invoiceData);

    // Email an Kunde
    await transporter.sendMail({
      from: process.env.EMAIL_FROM,
      to: invoiceData.customerEmail,
      subject: `✓ Zahlung erhalten - Rechnung #${invoiceData.paymentId.substring(0, 8).toUpperCase()}`,
      html: htmlContent,
    });

    console.log('✓ Rechnung an Kunde versandt:', invoiceData.customerEmail);

    // Email an Shop-Owner
    await transporter.sendMail({
      from: process.env.EMAIL_FROM,
      to: process.env.SHOP_EMAIL,
      subject: `💰 Neue Zahlung: ${invoiceData.productName} (€ ${(invoiceData.amount / 100).toFixed(2)})`,
      html: htmlContent,
    });

    console.log('✓ Rechnung an Shop versandt:', process.env.SHOP_EMAIL);
    return true;
  } catch (error) {
    console.error('✗ Fehler beim Versenden der Rechnung:', error);
    return false;
  }
}

module.exports = { sendInvoice };
