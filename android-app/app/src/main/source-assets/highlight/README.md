## Highlight Source Assets

This folder stores the source sheets for high-intensity highlight components before manual cutout.

### General rule

- Keep slicing minimal.
- For same-category accents, keep one representative asset instead of many near-duplicates.
- Prefer one source sheet per highlight type, then cut only the pieces that are actually needed in app.
- Transparent background is required before final extraction into `drawable-nodpi`.

### Current source sheets

- `reversal/reversal_edge_woc_raw_v1.png`
- `reversal/reversal_edge_woc_raw_v2.png`
- `reversal/reversal_crack_cluster_raw_v1.png`
- `feel-good/feel_good_asset_sheet_raw_v1.png`
- `feel-good/feel_good_asset_sheet_raw_v2.png`
- `conflict/conflict_asset_sheet_raw_v1.png`
- `conflict/conflict_asset_sheet_raw_v2.png`
- `sweet/sweet_asset_sheet_raw_v1.png`
- `sweet/sweet_asset_sheet_raw_v2.png`
- `funny/funny_asset_sheet_raw_v1.png`

### Minimal cut guide

#### `feel_good`

Cut only these representative pieces:

- one hero gold `爽` badge
- one smaller edge-use `爽` badge
- one round `爽` button
- one burst flash / impact base
- one sparkle particle cluster
- one short streak / shockwave accent
- one golden shard cluster

Suggested final names:

- `highlight_feel_good_hero_shuang`
- `highlight_feel_good_edge_shuang`
- `highlight_feel_good_button_shuang`
- `highlight_feel_good_burst_flash`
- `highlight_feel_good_sparkle_cluster`
- `highlight_feel_good_streak_cluster`
- `highlight_feel_good_shard_cluster`

Preferred source:

- use `feel_good_asset_sheet_raw_v2.png`
- keep the center circular `爽` button as the default trigger asset
- keep the main gold `爽` emblem and one smaller secondary `爽`
- keep particle assets slightly richer than other types, but still as grouped clusters instead of scattered single points

Current extracted set:

- `feel-good/extracted/highlight_feel_good_hero_shuang.png`
- `feel-good/extracted/highlight_feel_good_edge_shuang.png`
- `feel-good/extracted/highlight_feel_good_button_shuang.png`
- `feel-good/extracted/highlight_feel_good_burst_flash.png`
- `feel-good/extracted/highlight_feel_good_sparkle_cluster.png`
- `feel-good/extracted/highlight_feel_good_streak_cluster.png`
- `feel-good/extracted/highlight_feel_good_shard_cluster.png`

#### `conflict`

Cut only these representative pieces:

- one center fire-core button
- one top flame edge
- one bottom flame edge
- one left flame edge
- one right flame edge
- one ember particle cluster
- one ash / spark streak cluster

Suggested final names:

- `highlight_conflict_button_fire_core`
- `highlight_conflict_edge_top_flame`
- `highlight_conflict_edge_bottom_flame`
- `highlight_conflict_edge_left_flame`
- `highlight_conflict_edge_right_flame`
- `highlight_conflict_ember_cluster`
- `highlight_conflict_spark_streak`

Preferred source:

- use `conflict_asset_sheet_raw_v2.png`
- only keep the center fire button and the four directional flame edges
- no extra text bubble and no extra particle-only cuts unless later implementation truly needs them

Current extracted set:

- `conflict/extracted/highlight_conflict_button_fire_core.png`
- `conflict/extracted/highlight_conflict_edge_top_flame.png`
- `conflict/extracted/highlight_conflict_edge_bottom_flame.png`
- `conflict/extracted/highlight_conflict_edge_left_flame.png`
- `conflict/extracted/highlight_conflict_edge_right_flame.png`

#### `sweet`

Cut only these representative pieces:

- one heart-core button
- one main warm heart emblem
- one floating heart cluster
- one soft halo patch
- one warm light particle cluster
- one gentle drift arc

Preferred source:

- use `sweet_asset_sheet_raw_v2.png`
- do not keep any text button or blank caption base
- the button should only preserve the glowing heart body itself

Current extracted set:

- `sweet/extracted/highlight_sweet_button_heart.png`
- `sweet/extracted/highlight_sweet_main_heart.png`
- `sweet/extracted/highlight_sweet_floating_heart_cluster_large.png`
- `sweet/extracted/highlight_sweet_floating_heart_cluster_small.png`
- `sweet/extracted/highlight_sweet_light_particle_cluster.png`
- `sweet/extracted/highlight_sweet_drift_arc.png`

Suggested final names:

- `highlight_sweet_button_heart`
- `highlight_sweet_main_heart`
- `highlight_sweet_floating_heart_cluster`
- `highlight_sweet_soft_halo`
- `highlight_sweet_light_particle_cluster`
- `highlight_sweet_drift_arc`
