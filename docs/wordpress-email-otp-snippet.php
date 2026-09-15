<?php
/**
 * HAM ORGE — Email OTP for registration verification.
 *
 * Interim solution while MSG91's DLT registration is pending (India requires
 * DLT-registered sender/template for any transactional SMS — that approval
 * takes 1-2+ days regardless of provider). This uses your own WordPress mail
 * sending instead, so it works immediately with zero registration wait.
 *
 * Add via the Snippets plugin (Snippets → Add New → paste this, PHP snippet,
 * "Run snippet everywhere", Save & Activate) or your theme's functions.php.
 *
 * Exposes two REST routes, both public (no auth) since this runs BEFORE the
 * account exists — same trust level as the registration form itself:
 *   POST /wp-json/hamorge/v1/email-otp/send    { email }
 *   POST /wp-json/hamorge/v1/email-otp/verify  { email, otp }
 *
 * Unlike the login OTP snippet (which looks up an EXISTING user), this one
 * works for brand-new registrants — there's no WP user yet, so the code is
 * keyed by the email address itself via a WordPress transient (temporary,
 * auto-expiring option), not user meta.
 *
 * The code is hashed with wp_hash_password() before it touches the database —
 * never stored or logged in plain text — and expires after 5 minutes. A
 * 30-second cooldown between sends and a 5-attempt cap per code keep this from
 * being usable as a brute-force or spam vector.
 */

add_action('rest_api_init', function () {
    register_rest_route('hamorge/v1', '/email-otp/send', [
        'methods' => 'POST',
        'callback' => 'hamorge_email_otp_send',
        'permission_callback' => '__return_true',
    ]);
    register_rest_route('hamorge/v1', '/email-otp/verify', [
        'methods' => 'POST',
        'callback' => 'hamorge_email_otp_verify',
        'permission_callback' => '__return_true',
    ]);
});

function hamorge_email_otp_key($email) {
    return 'hamorge_reg_otp_' . md5(strtolower(trim($email)));
}

function hamorge_email_otp_send(WP_REST_Request $req) {
    $email = sanitize_email($req->get_param('email'));
    if (!$email || !is_email($email)) {
        return new WP_Error('invalid_email', 'Enter a valid email address.', ['status' => 400]);
    }

    if (email_exists($email)) {
        return new WP_Error('already_registered', 'An account with this email already exists. Please log in instead.', ['status' => 409]);
    }

    $key = hamorge_email_otp_key($email);
    $existing = get_transient($key);
    if ($existing && (time() - $existing['sent_at']) < 30) {
        return new WP_Error('rate_limited', 'Please wait a moment before requesting another code.', ['status' => 429]);
    }

    $otp = strval(random_int(100000, 999999));

    set_transient($key, [
        'hash' => wp_hash_password($otp),
        'sent_at' => time(),
        'attempts' => 0,
    ], 5 * MINUTE_IN_SECONDS);

    $sent = wp_mail(
        $email,
        'Your HAM ORGE verification code',
        "Your verification code is: {$otp}\n\nThis code expires in 5 minutes. If you didn't request this, you can safely ignore this email."
    );

    if (!$sent) {
        delete_transient($key);
        return new WP_Error('mail_failed', 'Could not send the email. Please try again.', ['status' => 500]);
    }

    return ['ok' => true];
}

function hamorge_email_otp_verify(WP_REST_Request $req) {
    $email = sanitize_email($req->get_param('email'));
    $otp = sanitize_text_field($req->get_param('otp'));

    if (!$email || !$otp) {
        return new WP_Error('invalid_request', 'Email and code are required.', ['status' => 400]);
    }

    $key = hamorge_email_otp_key($email);
    $entry = get_transient($key);

    if (!$entry) {
        return new WP_Error('no_otp', 'No code was requested, or it has expired. Please request a new one.', ['status' => 400]);
    }
    if ($entry['attempts'] >= 5) {
        delete_transient($key);
        return new WP_Error('too_many_attempts', 'Too many incorrect attempts. Please request a new code.', ['status' => 429]);
    }

    if (!wp_check_password($otp, $entry['hash'])) {
        $entry['attempts']++;
        set_transient($key, $entry, 5 * MINUTE_IN_SECONDS);
        return new WP_Error('invalid_otp', 'Incorrect code. Please try again.', ['status' => 400]);
    }

    // One-time use — clear it so the same code can't be replayed.
    delete_transient($key);

    return ['ok' => true];
}
