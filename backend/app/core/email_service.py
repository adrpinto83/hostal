import smtplib
from email.message import EmailMessage
import structlog

from app.core.config import settings

log = structlog.get_logger()


def send_email(subject: str, to_email: str, text_body: str, html_body: str | None = None) -> None:
    """Envía un correo usando la configuración SMTP. Si no hay SMTP configurado, se registra en logs."""
    if not settings.SMTP_HOST:
        log.warning(
            "smtp_not_configured", subject=subject, to=to_email, preview=text_body[:120]
        )
        return

    message = EmailMessage()
    message["Subject"] = subject
    message["From"] = settings.EMAIL_FROM or settings.SMTP_USERNAME or "no-reply@hostal.local"
    message["To"] = to_email
    message.set_content(text_body)
    if html_body:
        message.add_alternative(html_body, subtype="html")

    try:
        if settings.SMTP_TLS:
            server = smtplib.SMTP(settings.SMTP_HOST, settings.SMTP_PORT or 587)
            server.starttls()
        else:
            server = smtplib.SMTP(settings.SMTP_HOST, settings.SMTP_PORT or 25)

        if settings.SMTP_USERNAME and settings.SMTP_PASSWORD:
            server.login(settings.SMTP_USERNAME, settings.SMTP_PASSWORD)

        server.send_message(message)
        server.quit()
        log.info("email_sent", to=to_email, subject=subject)
    except Exception as exc:
        log.error("email_send_failed", error=str(exc), to=to_email)
