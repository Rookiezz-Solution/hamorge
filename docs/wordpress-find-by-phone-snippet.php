<?php
/**
 * HAM ORGE — Find a WordPress account by registered phone number.
 *
 * Used by login (so "email or phone" identifiers both work) and by forgot-
 * password (which now sends a WhatsApp OTP to the registered number instead
 * of an emailed reset link). WooCommerce's own customer search endpoint
 * doesn't reliably match on billing phone, so this reads wp_usermeta
 * (billing_phone) directly instead.
 *
 * Add via the Snippets plugin (Snippets → Add New → paste this, PHP snippet,
 * "Run snippet everywhere", Save & Activate) or your theme's functions.php.
 *
 * Exposes one public REST route (no auth needed — it only reveals whether a
 * phone number has an account and that account's email, the same
 * information the login/forgot-password forms already imply by their
 * success/failure messages):
 *   POST /wp-json/hamorge/v1/find-by-phone  { phone }
 */

add_action('rest_api_init', function () {
    register_rest_route('hamorge/v1', '/find-by-phone', [
        'methods' => 'POST',
        'callback' => 'hamorge_find_by_phone',
        'permission_callback' => '__return_true',
    ]);
});

function hamorge_find_by_phone(WP_REST_Request $req) {
    $phone = sanitize_text_field($req->get_param('phone'));
    if (!$phone) {
        return new WP_Error('invalid_phone', 'Phone number is required.', ['status' => 400]);
    }

    $users = get_users([
        'meta_key' => 'billing_phone',
        'meta_value' => $phone,
        'number' => 1,
        'fields' => ['ID', 'user_email'],
    ]);

    if (empty($users)) {
        return new WP_Error('not_found', 'No account found with that phone number.', ['status' => 404]);
    }

    return ['id' => $users[0]->ID, 'email' => $users[0]->user_email];
}
