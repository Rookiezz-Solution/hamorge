<?php
/**
 * HAM ORGE — "Cancel this order" button in the customer order emails.
 *
 * Adds a button under the order table of the customer "Processing order" and
 * "Order on hold" emails. It opens https://www.hamorge.com/cancel-order with the
 * order number and WooCommerce's own secret order key, so it works for guests
 * (no account needed). The page asks the customer to confirm before anything is
 * cancelled, and the site only allows it while the order hasn't shipped.
 *
 * Add via the Snippets plugin (Snippets → Add New → paste this, PHP snippet,
 * "Run snippet everywhere", Save & Activate).
 *
 * Also needs: WooCommerce → Settings → Emails → "Processing order" → Enable.
 */

add_action('woocommerce_email_after_order_table', function ($order, $sent_to_admin, $plain_text, $email) {
    if ($sent_to_admin || !($order instanceof WC_Order)) {
        return;
    }
    if (!in_array($email->id, ['customer_processing_order', 'customer_on_hold_order'], true)) {
        return;
    }
    if (!$order->has_status(['pending', 'processing', 'on-hold'])) {
        return;
    }

    $url = add_query_arg(
        ['order' => $order->get_id(), 'key' => $order->get_order_key()],
        'https://www.hamorge.com/cancel-order'
    );

    if ($plain_text) {
        echo "\n" . "Need to cancel? You can cancel this order until it ships: " . esc_url_raw($url) . "\n";
        return;
    }

    echo '<div style="margin:28px 0 8px;text-align:left;">';
    echo '<p style="margin:0 0 12px;font-size:14px;color:#555;">Changed your mind? You can cancel this order until it ships.</p>';
    echo '<a href="' . esc_url($url) . '" style="display:inline-block;background:#000000;color:#ffffff;'
        . 'text-decoration:none;font-size:13px;letter-spacing:1.5px;padding:14px 28px;">CANCEL THIS ORDER</a>';
    echo '</div>';
}, 10, 4);
