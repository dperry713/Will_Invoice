const express = require("express");
const cors = require("cors");
const nodemailer = require("nodemailer");
require("dotenv").config();

const app = express();

// Middleware
app.use(cors());
app.use(express.json());

// SMTP Configuration for MailerSend
const SMTP_HOST = process.env.SMTP_HOST || "smtp.mailersend.net";
const SMTP_PORT = process.env.SMTP_PORT || 587;
const SMTP_USER = process.env.SMTP_USER;
const SMTP_PASS = process.env.SMTP_PASS;
const FROM_EMAIL = process.env.FROM_EMAIL || "your_email@gmail.com";
const FROM_NAME = process.env.FROM_NAME || "Construction Project Tracker";
const MAILERSEND_API_TOKEN = process.env.MAILERSEND_API_TOKEN;

// Debug: Log SMTP configuration (do not log passwords or tokens in production)
console.log("SMTP_HOST:", SMTP_HOST);
console.log("SMTP_PORT:", SMTP_PORT);
console.log("SMTP_USER:", SMTP_USER);
console.log("FROM_EMAIL:", FROM_EMAIL);
console.log("FROM_NAME:", FROM_NAME);
console.log(
  "MAILERSEND_API_TOKEN:",
  MAILERSEND_API_TOKEN ? "Loaded" : "Not set"
);

// Nodemailer transporter
const transporter = nodemailer.createTransport({
  host: SMTP_HOST,
  port: SMTP_PORT,
  secure: false, // true for 465, false for other ports
  auth: {
    user: SMTP_USER,
    pass: SMTP_PASS,
  },
});

// MailerSend API integration
const { MailerSend, Recipient, EmailParams } = require("mailersend");
const mailersend = new MailerSend({
  apiKey: process.env.MAILERSEND_API_TOKEN,
});

// Example endpoint to demonstrate API token usage
app.get("/api-token", (req, res) => {
  if (!MAILERSEND_API_TOKEN) {
    return res.status(500).json({ error: "MailerSend API token not set" });
  }
  // For security, do not send the token itself. Just confirm it's loaded.
  res.json({ message: "MailerSend API token is loaded and ready to use." });
});

// Endpoint to send email with invoice PDF
app.post("/send-email", async (req, res) => {
  console.log("POST /send-email called");
  const { invoiceId, projectName, recipientEmail, pdfBase64 } = req.body;

  // Debug: Log incoming request data (do not log pdfBase64 for large files)
  console.log("Request body:", {
    invoiceId,
    projectName,
    recipientEmail,
    pdfBase64Length: pdfBase64 ? pdfBase64.length : 0,
  });

  // Input validation
  if (!invoiceId || !projectName || !recipientEmail || !pdfBase64) {
    console.warn("Missing required fields in request");
    return res.status(400).json({ error: "Missing required fields" });
  }

  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(recipientEmail)) {
    console.warn("Invalid email address:", recipientEmail);
    return res.status(400).json({ error: "Invalid email address" });
  }

  // Prepare email options
  const mailOptions = {
    from: `"${FROM_NAME}" <${FROM_EMAIL}>`,
    to: recipientEmail,
    subject: `Invoice #${invoiceId} for ${projectName}`,
    text: `Please find attached Invoice #${invoiceId} for ${projectName}.\n\nThank you for your business!\n\nTo opt out of future emails, reply with "Unsubscribe".`,
    html: `<p>Please find attached Invoice #${invoiceId} for ${projectName}.</p><p>Thank you for your business!</p><p>To opt out of future emails, reply with "Unsubscribe".</p>`,
    attachments: [
      {
        filename: `Invoice_${projectName}_${new Date()
          .toLocaleDateString()
          .replace(/\//g, "-")}.pdf`,
        content: Buffer.from(pdfBase64, "base64"),
        contentType: "application/pdf",
      },
    ],
  };

  try {
    const info = await transporter.sendMail(mailOptions);
    console.log("Email sent successfully:", info.messageId);
    res.json({ message: "Email sent successfully", data: info });
  } catch (error) {
    console.error("Error sending email:", error);
    res.status(500).json({
      error: "Failed to send email: " + error.message,
    });
  }
});

// Endpoint to send email using MailerSend API
app.post("/send-api-email", async (req, res) => {
  const { invoiceId, projectName, recipientEmail, pdfBase64 } = req.body;

  if (!invoiceId || !projectName || !recipientEmail || !pdfBase64) {
    return res.status(400).json({ error: "Missing required fields" });
  }

  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(recipientEmail)) {
    return res.status(400).json({ error: "Invalid email address" });
  }

  const recipients = [new Recipient(recipientEmail, recipientEmail)];
  const emailParams = new EmailParams()
    .setFrom(process.env.FROM_EMAIL)
    .setFromName(process.env.FROM_NAME)
    .setRecipients(recipients)
    .setSubject(`Invoice #${invoiceId} for ${projectName}`)
    .setHtml(
      `<p>Please find attached Invoice #${invoiceId} for ${projectName}.</p><p>Thank you for your business!</p><p>To opt out of future emails, reply with "Unsubscribe".</p>`
    )
    .setText(
      `Please find attached Invoice #${invoiceId} for ${projectName}.\n\nThank you for your business!\n\nTo opt out of future emails, reply with "Unsubscribe".`
    )
    .setAttachments([
      {
        content: pdfBase64,
        filename: `Invoice_${projectName}_${new Date()
          .toLocaleDateString()
          .replace(/\//g, "-")}.pdf`,
        type: "application/pdf",
      },
    ]);

  try {
    const response = await mailersend.email.send(emailParams);
    res.json({ message: "Email sent via MailerSend API", data: response.body });
  } catch (error) {
    res.status(500).json({ error: "Failed to send email: " + error.message });
  }
});

// Start server
app.get("/", (req, res) => {
  res.send("Server is running!");
});

// Start server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
