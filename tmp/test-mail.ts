import nodemailer from "nodemailer";
import fs from "fs";

// Simple .env parser since dotenv is not available
const envFile = fs.readFileSync(".env", "utf8");
const env: Record<string, string> = {};
envFile.split("\n").forEach(line => {
  const [key, ...value] = line.split("=");
  if (key && value) {
    env[key.trim()] = value.join("=").trim().replace(/^["']|["']$/g, '');
  }
});

const transporter = nodemailer.createTransport({
  host: env.SMTP_HOST || "smtp.gmail.com",
  port: Number(env.SMTP_PORT) || 587,
  secure: false,
  auth: {
    user: env.SMTP_USER,
    pass: env.SMTP_PASS,
  },
});

async function test() {
  console.log("Testing SMTP connection with settings:", {
    host: env.SMTP_HOST,
    port: env.SMTP_PORT,
    user: env.SMTP_USER,
    from: env.SMTP_FROM,
  });

  if (!env.SMTP_USER || !env.SMTP_PASS) {
    console.error("FAILURE: SMTP_USER or SMTP_PASS missing in .env");
    return;
  }

  try {
    console.log("Verifying transporter...");
    await transporter.verify();
    console.log("SUCCESS: SMTP connection verified!");
    
    console.log("Sending test email...");
    const info = await transporter.sendMail({
      from: env.SMTP_FROM,
      to: env.SMTP_USER, // Send to self
      subject: "SMTP Test - LernenTech",
      text: "If you see this, your SMTP configuration is working correctly.",
    });
    console.log("SUCCESS: Test email sent!", info.messageId);
  } catch (error) {
    console.error("FAILURE: SMTP Error:", error);
  }
}

test();
