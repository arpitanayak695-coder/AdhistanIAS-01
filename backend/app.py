import os
import re
import html
import smtplib
import logging
from email.message import EmailMessage
from datetime import datetime, timezone

from flask import Flask, request, jsonify
from flask_cors import CORS
from dotenv import load_dotenv

load_dotenv()

logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(message)s")
log = logging.getLogger("adhisthan-enquiry")

app = Flask(__name__)

SMTP_HOST = os.getenv("SMTP_HOST", "smtp.gmail.com")
SMTP_PORT = int(os.getenv("SMTP_PORT", "587"))
SMTP_USERNAME = os.getenv("SMTP_USERNAME", "")
SMTP_PASSWORD = os.getenv("SMTP_PASSWORD", "")
SMTP_USE_TLS = os.getenv("SMTP_USE_TLS", "true").lower() == "true"   # STARTTLS on port 587
SMTP_USE_SSL = os.getenv("SMTP_USE_SSL", "false").lower() == "true"  # implicit SSL on port 465
COMPANY_EMAIL = os.getenv("COMPANY_EMAIL", "")
FROM_EMAIL = os.getenv("FROM_EMAIL") or SMTP_USERNAME
EMAIL_SUBJECT = os.getenv("EMAIL_SUBJECT", "New Student Inquiry — Adhisthan IAS")
ALLOWED_ORIGINS = [o.strip() for o in os.getenv("ALLOWED_ORIGINS", "*").split(",") if o.strip()]
MAX_BODY_BYTES = 16 * 1024  # 16 KB is far more than a six-field form needs


CORS(app, resources={r"/api/*": {"origins": ALLOWED_ORIGINS}}, methods=["POST", "GET", "OPTIONS"])

EMAIL_RE = re.compile(r"^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$")
PHONE_RE = re.compile(r"^[0-9]{7,15}$")          # applied after stripping +, spaces, -, ()
NAME_RE = re.compile(r"^[A-Za-z][A-Za-z .'\-]*$")

STAGE_OPTIONS = {
    "Just starting out",
    "Prelims preparation",
    "Mains preparation",
    "Repeating attempt",
}
PROGRAM_OPTIONS = {
    "Foundation Program",
    "Advanced CSE Program",
    "Mains Intensive",
    "Prelims Edge",
}

LIMITS = {
    "name": (2, 80),
    "email": (5, 120),
    "phone": (7, 20),
    "message": (10, 1000),
}


def _clean(value):
    """Coerce to a trimmed string. Non-string JSON types become ''."""
    if value is None or isinstance(value, (dict, list, bool)):
        return ""
    return str(value).strip()


def validate(payload):
    """Return (data, errors). errors maps field name -> human-readable message."""
    errors = {}
    data = {k: _clean(payload.get(k)) for k in ("name", "email", "phone", "stage", "program", "message")}

    # Full Name
    name = data["name"]
    if not name:
        errors["name"] = "Full Name is required."
    elif len(name) < LIMITS["name"][0]:
        errors["name"] = "Full Name must be at least 2 characters."
    elif len(name) > LIMITS["name"][1]:
        errors["name"] = "Full Name must be 80 characters or fewer."
    elif not NAME_RE.match(name):
        errors["name"] = "Full Name may only contain letters, spaces, apostrophes and hyphens."

    # Email
    email = data["email"]
    if not email:
        errors["email"] = "Email is required."
    elif len(email) > LIMITS["email"][1]:
        errors["email"] = "Email must be 120 characters or fewer."
    elif not EMAIL_RE.match(email):
        errors["email"] = "Please enter a valid email address."

    # Phone
    phone_digits = re.sub(r"[\s\-\(\)\+]", "", data["phone"])
    if not data["phone"]:
        errors["phone"] = "Phone Number is required."
    elif len(data["phone"]) > LIMITS["phone"][1] or not PHONE_RE.match(phone_digits):
        errors["phone"] = "Phone Number is invalid."

    # Current Preparation Stage
    if not data["stage"]:
        errors["stage"] = "Please select your Current Preparation Stage."
    elif data["stage"] not in STAGE_OPTIONS:
        errors["stage"] = "Please select a valid Current Preparation Stage."

    # Preferred Program
    if not data["program"]:
        errors["program"] = "Please select your Preferred Program."
    elif data["program"] not in PROGRAM_OPTIONS:
        errors["program"] = "Please select a valid Preferred Program."

    # Message
    message = data["message"]
    if not message:
        errors["message"] = "Message cannot be empty."
    elif len(message) < LIMITS["message"][0]:
        errors["message"] = "Message must be at least 10 characters."
    elif len(message) > LIMITS["message"][1]:
        errors["message"] = "Message must be 1000 characters or fewer."

    return data, errors

# Email composition + delivery

def build_email(data):
    received = datetime.now(timezone.utc).astimezone().strftime("%d %b %Y, %I:%M %p %Z")

    plain = f"""New student inquiry — Adhisthan IAS

Full Name ................ {data['name']}
Email .................... {data['email']}
Phone Number ............. {data['phone']}
Preparation Stage ........ {data['stage']}
Preferred Program ........ {data['program']}

Message
-------
{data['message']}

Received: {received}
Sent automatically by the Adhisthan IAS website enquiry form.
"""

    e = {k: html.escape(v) for k, v in data.items()}
    rows = "".join(
        f'<tr><td style="padding:6px 14px 6px 0;color:#6b6b6b;font:12px monospace;'
        f'white-space:nowrap;vertical-align:top;">{label}</td>'
        f'<td style="padding:6px 0;color:#20232a;font:14px Georgia,serif;">{value}</td></tr>'
        for label, value in (
            ("FULL NAME", e["name"]),
            ("EMAIL", f'<a href="mailto:{e["email"]}" style="color:#8a6a2f;">{e["email"]}</a>'),
            ("PHONE", e["phone"]),
            ("PREP STAGE", e["stage"]),
            ("PROGRAM", e["program"]),
        )
    )
    html_body = f"""<!doctype html>
<html><body style="margin:0;padding:24px;background:#f4f0e6;">
  <div style="max-width:620px;margin:auto;background:#fff;border:1px solid #d9d2c0;padding:28px;">
    <p style="margin:0 0 4px;font:12px monospace;letter-spacing:.08em;color:#8a6a2f;">ADHISTHAN IAS</p>
    <h2 style="margin:0 0 20px;font:22px Georgia,serif;color:#101522;">New Student Inquiry</h2>
    <table style="border-collapse:collapse;width:100%;">{rows}</table>
    <p style="margin:22px 0 6px;font:12px monospace;letter-spacing:.08em;color:#6b6b6b;">MESSAGE</p>
    <div style="border-left:3px solid #c8a951;padding-left:14px;font:14px/1.6 Georgia,serif;
         color:#20232a;white-space:pre-wrap;">{e['message']}</div>
    <p style="margin-top:26px;padding-top:14px;border-top:1px solid #e6e0d0;
       font:11px monospace;color:#9a9a9a;">Received {html.escape(received)} · website enquiry form</p>
  </div>
</body></html>"""

    msg = EmailMessage()
    msg["Subject"] = EMAIL_SUBJECT
    msg["From"] = FROM_EMAIL
    msg["To"] = COMPANY_EMAIL
    msg["Reply-To"] = data["email"]   # replying in your inbox goes straight to the student
    msg.set_content(plain)
    msg.add_alternative(html_body, subtype="html")
    return msg


def send_email(msg):
    """Send via SMTP. Raises on failure — the caller must not report success."""
    if SMTP_USE_SSL:
        server = smtplib.SMTP_SSL(SMTP_HOST, SMTP_PORT, timeout=20)
    else:
        server = smtplib.SMTP(SMTP_HOST, SMTP_PORT, timeout=20)
    try:
        server.ehlo()
        if SMTP_USE_TLS and not SMTP_USE_SSL:
            server.starttls()
            server.ehlo()
        server.login(SMTP_USERNAME, SMTP_PASSWORD)
        server.send_message(msg)
    finally:
        try:
            server.quit()
        except Exception:
            pass

# Routes

@app.get("/api/health")
def health():
    configured = all([SMTP_HOST, SMTP_USERNAME, SMTP_PASSWORD, COMPANY_EMAIL])
    return jsonify({"success": True, "status": "ok", "smtp_configured": configured}), 200


@app.post("/api/contact")
def contact():
    # Reject oversized bodies before parsing
    if request.content_length and request.content_length > MAX_BODY_BYTES:
        return jsonify({"success": False, "message": "Request body too large."}), 413

    # Reject anything that is not JSON
    payload = request.get_json(silent=True)
    if not isinstance(payload, dict):
        return jsonify({"success": False, "message": "Invalid request. Expected a JSON object."}), 400

    data, errors = validate(payload)
    if errors:
        return jsonify({
            "success": False,
            "message": "Please correct the highlighted fields.",
            "errors": errors,
        }), 422

    if not all([SMTP_HOST, SMTP_USERNAME, SMTP_PASSWORD, COMPANY_EMAIL]):
        log.error("SMTP is not configured — check SMTP_* and COMPANY_EMAIL in backend/.env")
        return jsonify({
            "success": False,
            "message": "We could not send your enquiry right now. Please email us directly or try again later.",
        }), 500

    try:
        send_email(build_email(data))
    except smtplib.SMTPAuthenticationError:
        log.exception("SMTP authentication failed")
        return jsonify({
            "success": False,
            "message": "We could not send your enquiry right now. Please try again later.",
        }), 502
    except (smtplib.SMTPException, OSError):
        log.exception("SMTP delivery failed")
        return jsonify({
            "success": False,
            "message": "We could not send your enquiry right now. Please try again in a few minutes.",
        }), 502

    log.info("Enquiry emailed to %s (from %s)", COMPANY_EMAIL, data["email"])
    return jsonify({
        "success": True,
        "message": "Your inquiry has been submitted successfully! Our team will contact you soon.",
    }), 200

# JSON error handlers — the API never returns an HTML error page

@app.errorhandler(404)
def not_found(_):
    return jsonify({"success": False, "message": "Endpoint not found."}), 404


@app.errorhandler(405)
def method_not_allowed(_):
    return jsonify({"success": False, "message": "Method not allowed. Use POST /api/contact."}), 405


@app.errorhandler(413)
def too_large(_):
    return jsonify({"success": False, "message": "Request body too large."}), 413


@app.errorhandler(500)
def server_error(_):
    return jsonify({"success": False, "message": "Something went wrong on our side."}), 500


if __name__ == "__main__":
    app.run(
        host=os.getenv("HOST", "127.0.0.1"),
        port=int(os.getenv("PORT", "5000")),
        debug=os.getenv("FLASK_DEBUG", "false").lower() == "true",
    )
