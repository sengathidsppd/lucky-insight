"""Email sending utility for password resets and system notifications."""

import smtplib
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText
from app.core.config import get_settings
from app.core.logging import get_logger

logger = get_logger(__name__)
settings = get_settings()


def send_password_reset_email(to_email: str, reset_url: str) -> None:
    """Send a password reset HTML email to the user if SMTP is configured.

    Otherwise, log the simulation link to the terminal.
    """
    subject = "Lucky Insight - Password Reset Request"
    body_html = f"""
    <html>
        <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
            <div style="max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e0e0e0; border-radius: 8px; background-color: #ffffff;">
                <div style="text-align: center; margin-bottom: 20px;">
                    <span style="font-size: 2.5rem;">🍀</span>
                    <h2 style="color: #4f46e5; margin-top: 10px;">Lucky Insight</h2>
                </div>
                <p>Hello,</p>
                <p>We received a request to reset the password for your Lucky Insight account. Click the button below to choose a new password:</p>
                <div style="text-align: center; margin: 30px 0;">
                    <a href="{reset_url}" style="background-color: #4f46e5; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold; display: inline-block;">Reset Password</a>
                </div>
                <p>If you did not request a password reset, you can safely ignore this email. This link will expire in 30 minutes.</p>
                <p>If the button doesn't work, copy and paste the link below into your browser:</p>
                <p style="word-break: break-all; color: #4f46e5;">{reset_url}</p>
                <hr style="border: 0; border-top: 1px solid #eaeaea; margin: 20px 0;" />
                <p style="font-size: 0.8rem; color: #777; text-align: center;">Lucky Insight Team</p>
            </div>
        </body>
    </html>
    """

    # Check if SMTP is configured
    if not all([settings.SMTP_HOST, settings.SMTP_USERNAME, settings.SMTP_PASSWORD]):
        logger.info("=== [SMTP SIMULATION] ===")
        logger.info("To: %s", to_email)
        logger.info("Subject: %s", subject)
        logger.info("Reset Link: %s", reset_url)
        logger.info("=========================")
        return

    # Send real email
    try:
        msg = MIMEMultipart("alternative")
        msg["Subject"] = subject
        msg["From"] = settings.SMTP_SENDER or "noreply@lucky-insight.com"
        msg["To"] = to_email

        msg.attach(MIMEText(body_html, "html"))

        # Setup SMTP connection
        port = settings.SMTP_PORT or 587
        if port == 465:
            server = smtplib.SMTP_SSL(settings.SMTP_HOST, port)
        else:
            server = smtplib.SMTP(settings.SMTP_HOST, port)
            server.starttls()

        server.login(settings.SMTP_USERNAME, settings.SMTP_PASSWORD)
        server.sendmail(msg["From"], to_email, msg.as_string())
        server.quit()
        logger.info("Password reset email sent successfully to %s", to_email)
    except Exception as exc:
        logger.error("Failed to send password reset email to %s: %s", to_email, exc)
