import express from "express";
import { createServer as createViteServer } from "vite";
import nodemailer from "nodemailer";
import path from "path";
import dotenv from "dotenv";

dotenv.config();

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // API Route for sending OTP via Gmail App Password
  app.post("/api/send-otp", async (req, res) => {
    const { email, otp } = req.body;

    if (!email || !otp) {
      return res.status(400).json({ error: "Email and OTP are required" });
    }

    const gmailUser = process.env.GMAIL_USER;
    const gmailAppPassword = process.env.GMAIL_APP_PASSWORD;

    if (!gmailUser || !gmailAppPassword) {
      console.error("GMAIL_USER or GMAIL_APP_PASSWORD not set in environment");
      return res.status(500).json({ error: "Server email configuration missing" });
    }

    try {
      const transporter = nodemailer.createTransport({
        service: "gmail",
        auth: {
          user: gmailUser,
          pass: gmailAppPassword,
        },
      });

      const mailOptions = {
        from: `"Educator App" <${gmailUser}>`,
        to: email,
        subject: "Your Verification Code",
        text: `Your verification code is: ${otp}`,
        html: `
          <div style="font-family: sans-serif; padding: 20px; border: 1px solid #eee; border-radius: 10px; max-width: 500px; margin: auto;">
            <h2 style="color: #2563eb; text-align: center;">Verification Code</h2>
            <p style="font-size: 16px; color: #4b5563;">Hello,</p>
            <p style="font-size: 16px; color: #4b5563;">Use the following code to verify your account in the Educator App:</p>
            <div style="background: #f3f4f6; padding: 15px; border-radius: 8px; text-align: center; margin: 20px 0;">
              <span style="font-size: 32px; font-weight: bold; letter-spacing: 5px; color: #1f2937;">${otp}</span>
            </div>
            <p style="font-size: 14px; color: #9ca3af; text-align: center;">If you didn't request this code, please ignore this email.</p>
          </div>
        `,
      };

      await transporter.sendMail(mailOptions);
      res.json({ success: true, message: "OTP sent successfully" });
    } catch (error) {
      console.error("Error sending email:", error);
      res.status(500).json({ error: "Failed to send email" });
    }
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
