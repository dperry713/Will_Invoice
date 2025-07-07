const express = require("express");
const cors = require("cors");
const nodemailer = require("nodemailer");
const helmet = require("helmet");
const compression = require("compression");
require("dotenv").config();

const app = express();

// Middleware
app.use(cors());
app.use(express.json({ limit: "10mb" })); // handle large PDFs
app.use(helmet());
app.use(compression());

// Environment Variables
const {
  SMTP_HOST,
  SMTP_PORT,
  SMTP_USER,
  SMTP_PASS,
  FROM_EMAIL,
  FROM_NAME,
  PORT,
} = process.env;

// Nodemailer Transporter
const transporter = nodemailer.createTransport({
  host: SMTP_HOST,
  port: Number(SMTP_PORT),
  secure: false, // false for port 587
  requireTLS: true,
  auth: {
    user: SMTP_USER,
    pass: SMTP_PASS,
  },
});

// Verify SMTP connection on startup
transporter.verify((error, success) => {
  if (error) {
    console.error("❌ SMTP Connection Error:", error.message);
  } else {
    console.log("✅ SMTP Connection Successful – Ready to send emails");
  }
});

// Send Email Endpoint
app.post("/send-email", async (req, res) => {
  const { invoiceId, projectName, recipientEmail, pdfBase64 } = req.body;

  // Validate Input
  if (!invoiceId || !projectName || !recipientEmail || !pdfBase64) {
    return res.status(400).json({ error: "Missing required fields" });
  }

  const isValidEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(recipientEmail);
  if (!isValidEmail) {
    return res.status(400).json({ error: "Invalid email address" });
  }

  const filename = `Invoice_${projectName}_${new Date()
    .toLocaleDateString()
    .replace(/\//g, "-")}.pdf`;

  const mailOptions = {
    from: `"${FROM_NAME}" <${FROM_EMAIL}>`,
    to: recipientEmail,
    subject: `Invoice #${invoiceId} for ${projectName}`,
    text: `Please find attached Invoice #${invoiceId} for ${projectName}. Thank you!`,
    html: `<p>Please find attached Invoice #${invoiceId} for ${projectName}.</p><p>Thank you!</p>`,
    attachments: [
      {
        filename,
        content: Buffer.from(pdfBase64, "base64"),
        contentType: "application/pdf",
      },
    ],
    headers: {
      "X-Mailer": "Nodemailer",
      "Content-Type": "text/html; charset=UTF-8",
    },
  };

  try {
    const info = await transporter.sendMail(mailOptions);
    console.log("📨 Email Sent:", info.messageId);
    res.json({ message: "Email sent successfully", messageId: info.messageId });
  } catch (error) {
    console.error("❌ Email Send Error:", {
      message: error.message,
      response: error.response,
    });
    res.status(500).json({ error: "Failed to send email: " + error.message });
  }
});

// Root Health Check
app.get("/", (req, res) => {
  res.send("✅ Email server is running!");
});

// Start Server
const SERVER_PORT = PORT || 3000;
app.listen(SERVER_PORT, () => {
  console.log(`🚀 Server listening on port ${SERVER_PORT}`);
});
