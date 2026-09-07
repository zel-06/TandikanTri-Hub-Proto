"""Thin wrapper around the PayMongo Checkout Sessions + Webhooks API.

Docs: https://developers.paymongo.com/docs/checkout-api
"""
import base64
import hashlib
import hmac

import requests
from django.conf import settings

API_BASE = 'https://api.paymongo.com/v1'


def _auth_header():
    token = base64.b64encode(f'{settings.PAYMONGO_SECRET_KEY}:'.encode()).decode()
    return {'Authorization': f'Basic {token}', 'Content-Type': 'application/json'}


def create_checkout_session(payment, success_url, cancel_url):
    """Create a PayMongo-hosted checkout page for one Payment. Returns the session dict."""
    registration = payment.registration
    event = registration.event_category.event
    payload = {
        'data': {
            'attributes': {
                'send_email_receipt': False,
                'show_description': True,
                'show_line_items': True,
                'line_items': [{
                    'currency': 'PHP',
                    'amount': int(payment.amount * 100),  # centavos
                    'name': f'{event.title} — {registration.event_category.name}',
                    'quantity': 1,
                }],
                'payment_method_types': ['gcash', 'card', 'paymaya'],
                'description': f'Tandikan Tri-Hub registration #{registration.id}',
                'success_url': success_url,
                'cancel_url': cancel_url,
            },
        },
    }
    response = requests.post(f'{API_BASE}/checkout_sessions', headers=_auth_header(), json=payload, timeout=15)
    response.raise_for_status()
    return response.json()['data']


def get_checkout_session(checkout_id):
    response = requests.get(f'{API_BASE}/checkout_sessions/{checkout_id}', headers=_auth_header(), timeout=15)
    response.raise_for_status()
    return response.json()['data']


def get_payment_method_used(checkout_id):
    """Best-effort lookup of which method (gcash/card/paymaya) actually paid this session."""
    try:
        session = get_checkout_session(checkout_id)
        payments = session['attributes'].get('payments') or []
        if payments:
            return payments[0]['attributes'].get('source', {}).get('type', '')
    except Exception:
        pass
    return ''


def verify_webhook_signature(raw_body, signature_header):
    """PayMongo signs webhooks as 'Paymongo-Signature: t=<ts>,te=<test_sig>,li=<live_sig>'."""
    if not signature_header:
        return False
    parts = dict(part.split('=', 1) for part in signature_header.split(',') if '=' in part)
    timestamp = parts.get('t')
    candidate = parts.get('te') or parts.get('li')
    if not timestamp or not candidate:
        return False

    signed_payload = f'{timestamp}.{raw_body.decode()}'
    expected = hmac.new(
        settings.PAYMONGO_WEBHOOK_SECRET.encode(), signed_payload.encode(), hashlib.sha256
    ).hexdigest()
    return hmac.compare_digest(expected, candidate)
