<?php
/**
 * HAM ORGE — per-product size chart on the WooCommerce product editor.
 *
 * Adds a "Size Chart (cm)" box to Products → Add New / Edit with a grid of
 * Chest / Front length / Back width × S / M / L / XL. The storefront reads it
 * from the product's `hamorge_size_chart` meta (returned in the REST API's
 * meta_data) and converts to inches automatically. Leave a whole row blank to
 * hide it; products with no chart entered fall back to a default chart.
 *
 * Add via the Snippets plugin (Snippets → Add New → paste this, PHP snippet,
 * "Run snippet everywhere", Save & Activate).
 */

function hamorge_size_chart_areas() {
    return ['Chest', 'Front length', 'Back width'];
}

function hamorge_size_chart_sizes() {
    return ['S', 'M', 'L', 'XL'];
}

add_action('add_meta_boxes', function () {
    add_meta_box('hamorge_size_chart', 'Size Chart (cm)', 'hamorge_size_chart_render', 'product', 'normal', 'default');
});

function hamorge_size_chart_render($post) {
    $saved = json_decode((string) get_post_meta($post->ID, 'hamorge_size_chart', true), true);
    if (!is_array($saved)) {
        $saved = [];
    }
    wp_nonce_field('hamorge_size_chart_save', 'hamorge_size_chart_nonce');
    echo '<p>Enter measurements in centimetres. Inches are calculated automatically on the site.</p>';
    echo '<table class="widefat" style="max-width:560px"><thead><tr><th>Area</th>';
    foreach (hamorge_size_chart_sizes() as $size) {
        echo '<th>' . esc_html($size) . '</th>';
    }
    echo '</tr></thead><tbody>';
    foreach (hamorge_size_chart_areas() as $area) {
        echo '<tr><td><strong>' . esc_html($area) . '</strong></td>';
        foreach (hamorge_size_chart_sizes() as $size) {
            $value = isset($saved[$area][$size]) ? $saved[$area][$size] : '';
            printf(
                '<td><input type="number" step="0.1" min="0" style="width:80px" name="hamorge_size_chart[%s][%s]" value="%s"></td>',
                esc_attr($area),
                esc_attr($size),
                esc_attr($value)
            );
        }
        echo '</tr>';
    }
    echo '</tbody></table>';
}

add_action('save_post_product', function ($post_id) {
    if (!isset($_POST['hamorge_size_chart_nonce']) || !wp_verify_nonce($_POST['hamorge_size_chart_nonce'], 'hamorge_size_chart_save')) {
        return;
    }
    if (defined('DOING_AUTOSAVE') && DOING_AUTOSAVE) {
        return;
    }
    if (!current_user_can('edit_post', $post_id)) {
        return;
    }

    $input = isset($_POST['hamorge_size_chart']) && is_array($_POST['hamorge_size_chart']) ? $_POST['hamorge_size_chart'] : [];
    $chart = [];
    foreach (hamorge_size_chart_areas() as $area) {
        foreach (hamorge_size_chart_sizes() as $size) {
            $raw = isset($input[$area][$size]) ? trim((string) $input[$area][$size]) : '';
            if ($raw !== '' && is_numeric($raw)) {
                $chart[$area][$size] = (float) $raw;
            }
        }
    }

    if (empty($chart)) {
        delete_post_meta($post_id, 'hamorge_size_chart');
    } else {
        update_post_meta($post_id, 'hamorge_size_chart', wp_json_encode($chart));
    }
});
