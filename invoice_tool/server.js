const express = require("express");
const nodemailer = require("nodemailer");
const cors = require("cors");
require("dotenv").config();

const app = express();

// Middleware
app.use(cors());
app.use(express.json());

// SMTP Configuration from environment variables
const SMTP_HOST = process.env.SMTP_HOST || "smtp.gmail.com";
const SMTP_PORT = process.env.SMTP_PORT || 587;
const SMTP_USER = process.env.SMTP_USER || "your_email@gmail.com"; // Replace with your SMTP email
const SMTP_PASS = process.env.SMTP_PASS || "your_app_password"; // Replace with your SMTP password or app-specific password
const FROM_EMAIL = process.env.FROM_EMAIL || "your_email@gmail.com"; // Replace with your sender email
const FROM_NAME = process.env.FROM_NAME || "Construction Project Tracker";

// Create Nodemailer transporter
const transporter = nodemailer.createTransport({
  host: SMTP_HOST,
  port: SMTP_PORT,
  secure: SMTP_PORT === 465, // Use true for port 465 (SSL), false for 587 (TLS)
  auth: {
    user: SMTP_USER,
    pass: SMTP_PASS,
  },
});

// Endpoint to send email with invoice PDF
app.post("/send-email", async (req, res) => {
  const { invoiceId, projectName, recipientEmail, pdfBase64 } = req.body;

  // Input validation
  if (!invoiceId || !projectName || !recipientEmail || !pdfBase64) {
    return res.status(400).json({ error: "Missing required fields" });
  }

  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(recipientEmail)) {
    return res.status(400).json({ error: "Invalid email address" });
  }

  const mailOptions = {
    from: `"${FROM_NAME}" <${FROM_EMAIL}>`,
    to: recipientEmail,
    subject: `Invoice #${invoiceId} for ${projectName}`,
    text: `Please find attached Invoice #${invoiceId} for ${projectName}.\n\nThank you for your business!\n\nTo opt out of future emails, reply with "Unsubscribe".`,
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
    res.json({ message: "Email sent successfully", messageId: info.messageId });
  } catch (error) {
    console.error("Error sending email:", error.message);
    res.status(500).json({ error: "Failed to send email: " + error.message });
  }
});

// Start server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
