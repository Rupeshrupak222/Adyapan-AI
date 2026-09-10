import nodemailer from "nodemailer";
import * as dotenv from "dotenv";

// Load environment variables
dotenv.config();

async function testSMTPConnection() {
  console.log("🔍 Testing SMTP Configuration...\n");
  
  // Display current SMTP settings (hide password)
  console.log("📧 SMTP Settings:");
  console.log(`   Host: ${process.env.SMTP_HOST || "NOT SET"}`);
  console.log(`   Port: ${process.env.SMTP_PORT || "NOT SET"}`);
  console.log(`   User: ${process.env.SMTP_USER || "NOT SET"}`);
  console.log(`   Pass: ${process.env.SMTP_PASS ? "***" + process.env.SMTP_PASS.slice(-4) : "NOT SET"}`);
  console.log(`   Admin Email: ${process.env.ADMIN_EMAIL || "NOT SET"}\n`);

  // Check if credentials are set
  if (!process.env.SMTP_HOST || !process.env.SMTP_USER || !process.env.SMTP_PASS) {
    console.error("❌ SMTP credentials are missing in .env file!");
    console.error("\nRequired variables:");
    console.error("  - SMTP_HOST");
    console.error("  - SMTP_PORT");
    console.error("  - SMTP_USER");
    console.error("  - SMTP_PASS (Gmail App Password required)\n");
    console.error("📝 To get Gmail App Password:");
    console.error("   1. Enable 2-Step Verification on your Google Account");
    console.error("   2. Go to: https://myaccount.google.com/apppasswords");
    console.error("   3. Generate an App Password");
    console.error("   4. Copy the 16-character password (no spaces)");
    console.error("   5. Set it as SMTP_PASS in your .env file\n");
    process.exit(1);
  }

  // Check for placeholder password
  if (process.env.SMTP_PASS === "your_gmail_app_password_here") {
    console.error("❌ SMTP_PASS still has placeholder value!");
    console.error("\n📝 Please replace 'your_gmail_app_password_here' with actual Gmail App Password");
    console.error("\nTo get Gmail App Password:");
    console.error("   1. Enable 2-Step Verification: https://myaccount.google.com/security");
    console.error("   2. Create App Password: https://myaccount.google.com/apppasswords");
    console.error("   3. Select 'Mail' and your device");
    console.error("   4. Copy the generated 16-character password");
    console.error("   5. Update SMTP_PASS in .env file\n");
    process.exit(1);
  }

  // Create transporter
  const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: parseInt(process.env.SMTP_PORT || "465"),
    secure: true, // SSL for port 465
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
  });

  try {
    console.log("⏳ Verifying SMTP connection...");
    
    // Test connection
    await transporter.verify();
    
    console.log("✅ SMTP connection successful!\n");

    // Send test email
    console.log("📨 Sending test email...");
    
    const testEmail = process.env.ADMIN_EMAIL || process.env.SMTP_USER;
    
    const info = await transporter.sendMail({
      from: `"Adyapan AI Test" <${process.env.SMTP_USER}>`,
      to: testEmail,
      subject: "✅ SMTP Test Successful - Adyapan AI",
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="UTF-8">
        </head>
        <body style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="background: #12121e; padding: 20px; border-radius: 10px 10px 0 0;">
            <h1 style="color: #ffffff; margin: 0; font-size: 24px;">
              Adyapan <span style="color: #f59e0b;">AI</span>
            </h1>
          </div>
          
          <div style="background: #ffffff; padding: 30px; border: 1px solid #e2e8f0; border-top: none; border-radius: 0 0 10px 10px;">
            <h2 style="color: #0f172a; margin-top: 0;">🎉 SMTP Configuration Test Successful!</h2>
            
            <p style="color: #475569; line-height: 1.6;">
              Your SMTP configuration is working correctly. The email system is ready to send:
            </p>
            
            <ul style="color: #475569; line-height: 1.8;">
              <li>Contact form notifications</li>
              <li>Password reset emails</li>
              <li>Verification emails</li>
              <li>Admin alerts</li>
            </ul>
            
            <div style="background: #f0fdf4; border-left: 4px solid #22c55e; padding: 15px; margin: 20px 0; border-radius: 0 8px 8px 0;">
              <p style="margin: 0; color: #166534; font-weight: 600;">
                ✅ All systems are operational
              </p>
            </div>
            
            <p style="color: #64748b; font-size: 12px; margin-bottom: 0;">
              Test conducted on: ${new Date().toLocaleString("en-IN", { timeZone: "Asia/Kolkata" })} IST
            </p>
          </div>
          
          <div style="text-align: center; padding: 15px; color: #94a3b8; font-size: 11px;">
            Adyapan Edutech Pvt Ltd | support@adyapan.com
          </div>
        </body>
        </html>
      `,
      text: `SMTP Test Successful!\n\nYour SMTP configuration is working correctly.\n\nTest conducted on: ${new Date().toLocaleString("en-IN", { timeZone: "Asia/Kolkata" })} IST`,
    });

    console.log("✅ Test email sent successfully!");
    console.log(`   Message ID: ${info.messageId}`);
    console.log(`   Recipient: ${testEmail}\n`);
    
    console.log("🎉 All SMTP tests passed!");
    console.log("📬 Check your inbox at:", testEmail);
    
  } catch (error: any) {
    console.error("\n❌ SMTP Test Failed!\n");
    
    if (error.code === "EAUTH") {
      console.error("🔐 Authentication Error:");
      console.error("   Invalid username or password\n");
      console.error("💡 Common issues:");
      console.error("   1. Wrong Gmail App Password");
      console.error("   2. Using regular Gmail password (won't work - need App Password)");
      console.error("   3. 2-Step Verification not enabled");
      console.error("\n📝 Fix:");
      console.error("   Generate new App Password: https://myaccount.google.com/apppasswords\n");
    } else if (error.code === "ECONNECTION" || error.code === "ETIMEDOUT") {
      console.error("🌐 Connection Error:");
      console.error("   Cannot connect to SMTP server\n");
      console.error("💡 Check:");
      console.error("   1. Internet connectivity");
      console.error("   2. Firewall settings (allow port 465)");
      console.error("   3. SMTP_HOST is correct (smtp.gmail.com)\n");
    } else if (error.code === "ESOCKET") {
      console.error("🔌 Socket Error:");
      console.error("   Port or SSL/TLS issue\n");
      console.error("💡 Verify:");
      console.error("   1. SMTP_PORT is 465 for SSL");
      console.error("   2. Or use port 587 with STARTTLS\n");
    } else {
      console.error("Error details:");
      console.error(`   Code: ${error.code || "N/A"}`);
      console.error(`   Message: ${error.message}\n`);
    }
    
    console.error("Full error:", error);
    process.exit(1);
  }
}

// Run the test
testSMTPConnection().catch(console.error);
