const express = require("express");
const axios = require("axios");
const cors = require("cors");
require("dotenv").config();

const app = express();

// Middleware
app.use(cors());
app.use(express.json());

// SMTP Configuration from environment variables
const SMTP_HOST = process.env.SMTP_HOST || "smtp.maileroo.com";
const SMTP_PORT = process.env.SMTP_PORT || 587;
const SMTP_USER = process.env.SMTP_USER; // your Maileroo username
const SMTP_PASS = process.env.SMTP_PASS; // your Maileroo password
const FROM_EMAIL = process.env.FROM_EMAIL || "your_email@gmail.com"; // Replace with your sender email
const FROM_NAME = process.env.FROM_NAME || "Construction Project Tracker";

// Debug: Log SMTP configuration (do not log passwords in production)
console.log("SMTP_HOST:", SMTP_HOST);
console.log("SMTP_PORT:", SMTP_PORT);
console.log("SMTP_USER:", SMTP_USER);
console.log("FROM_EMAIL:", FROM_EMAIL);
console.log("FROM_NAME:", FROM_NAME);

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

  // Prepare form data for Maileroo API
  let data = new FormData();
  data.append("from", `"${FROM_NAME}" <${FROM_EMAIL}>`);
  data.append("to", recipientEmail);
  data.append("subject", `Invoice #${invoiceId} for ${projectName}`);
  data.append(
    "plain",
    `Please find attached Invoice #${invoiceId} for ${projectName}.\n\nThank you for your business!\n\nTo opt out of future emails, reply with "Unsubscribe".`
  );
  data.append(
    "html",
    `<p>Please find attached Invoice #${invoiceId} for ${projectName}.</p><p>Thank you for your business!</p><p>To opt out of future emails, reply with "Unsubscribe".</p>`
  );
  data.append("attachment", Buffer.from(pdfBase64, "base64"), {
    filename: `Invoice_${projectName}_${new Date()
      .toLocaleDateString()
      .replace(/\//g, "-")}.pdf`,
    contentType: "application/pdf",
  });

  const config = {
    method: "post",
    url: "https://smtp.maileroo.com/send",
    headers: {
      "X-API-Key": process.env.MAILEROO_API_KEY, // Set this in your environment variables!
      ...data.getHeaders(),
    },
    data: data,
  };

  try {
    const response = await axios(config);
    console.log("Email sent successfully:", response.data);
    res.json({ message: "Email sent successfully", data: response.data });
  } catch (error) {
    console.error(
      "Error sending email:",
      error.response ? error.response.data : error.message
    );
    res.status(500).json({
      error:
        "Failed to send email: " +
        (error.response ? JSON.stringify(error.response.data) : error.message),
    });
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
