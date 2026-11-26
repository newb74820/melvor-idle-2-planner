# Save Format

The desktop app has a read-only importer for local `.sav` files and Base64 save strings. The Rust implementation was compared with Idlewatch using two private snapshots of the same character.

The optional `supplied_samples_decode_as_release_version_32` Rust test uses the original validation fixtures. It reads the Base64 snapshot from `examples/save_string` and the binary snapshot from `examples/sample.sav` or the path set in `MELVOR_PLANNER_TEST_SAVE`. These fixtures stay local.

## Decoder research

The current candidate is [Idlewatch](https://github.com/AlexAgo83/idlewatch), a Python 3.11+ read-only Melvor Idle 2 save decoder. Its repository declares the MIT License and documents support for demo saves and release save version 31. The license permits reuse and modification, provided the copyright and permission notice is retained in copies or substantial portions.

Idlewatch describes the save as a Brotli stream containing a .NET `BinaryWriter` layout. It reports that the game leaves the Brotli stream unfinished, so its implementation uses incremental decompression rather than a one-shot helper. The decoded header and component tables contain version, UUID, character metadata, skill XP, bank inventory, and wallet data. It also decodes some other component data and deliberately leaves some fields unknown. Its parser can be used as a format reference, but it is Python and is not a drop-in dependency for this TypeScript/Tauri app.

The upstream README documents release save version 31 support. Against the provided examples, Idlewatch parsed both as release version 32 (`demo: false`), each with 25 skills and 101 bank item IDs. The two saves share a UUID but have different skill and bank data, so they represent different snapshots of the same character. The local Rust tests now decode both same-layout version-32 samples; that does not verify every field against the game or guarantee compatibility with future versions. If adapting implementation code, retain the MIT notice and preserve the upstream read-only behavior.

## App Decoder

The Tauri command `decode_save` accepts a Base64 payload. The UI reads a selected `.sav` file locally and Base64-encodes it, or passes a pasted save string; Rust decodes the text and runs a bounded Brotli stream decoder. The compressed input limit is 16 MiB and the decompressed limit is 64 MiB. The decoder accepts the game's unfinished stream only when input is exhausted and the decompressed structure then parses successfully.

For directory imports, `list_save_files` only returns regular files directly inside the user-selected directory whose names match `save_*.sav`. `load_save_from_directory` accepts the selected basename, canonicalizes both paths, verifies the file remains inside that directory, applies the compressed-size limit, and opens it read-only. The selected directory and filename are stored locally so the refresh control can call the same read path again; decoded values are not persisted.

Decoded fields include save version, UUID, name, mode, timestamp, total level, currencies, activity, skill XP and stored levels, bank item quantities, and wallet balances. 64-bit currencies cross the IPC boundary as decimal strings to avoid JavaScript precision loss. Release skills that store XP without a level are mapped to a level in the UI using the selected XP table.

Unknown component names/sizes and unrecognized bank trailing-byte counts are reported, but their raw payload bytes are not retained or interpreted. Imports remain in memory until the user explicitly saves a character profile. The profile stores validated decoded fields in IndexedDB, not the compressed source save. The importer never writes to the original save.

The ported parsing approach is attributed in [THIRD_PARTY_NOTICES.md](../src-tauri/THIRD_PARTY_NOTICES.md). Future game versions still require fixtures and field-level verification before being treated as supported.

The `aevv/melvor` repository is also MIT-licensed and contains Melvor Idle 2 tools, including a browser save editor. Since this planner must never write saves, that editor is not the selected decoder basis.

The Rust parser validates input and component bounds, runs locally, reports unsupported data, and never writes back to the original save.

Release version-32 saves can also supply equipped Woodcutting toolbelt slots. The slot layout was cross-checked against the local samples and the [melvor2sim format reference](https://github.com/jtwilli/melvor2sim/blob/main/read_save.py). An empty map is a decoded toolbelt with no equipped items. A missing or null field means the toolbelt is unavailable, including older stored profiles. Rereading the source save supplies the newer field when its layout is supported. Unexpected slot layouts remain listed as unknown components.

The release version-32 Astrology Action component supplies Deedree's unlocked node IDs. The layout was checked against the local samples. An empty list indicates that no Deedree nodes were found, while a missing or null field indicates unavailable data. Reread older saves to populate the new field.

The release version-32 Shop component stores purchase counts keyed by game ID. The planner reads those counts locally and applies supported permanent bonuses once for each purchased upgrade. Reread older saves to populate this field.

The release version-32 Woodcutting Mastery Guild component stores task IDs, optional progress-goal completion flags, and trigger flags. The payload can be absent for a progress goal that has yet to record an event. The skill's Pets component stores a separate Woody unlock flag. The decoder was checked with both local save formats. Missing or unfamiliar components leave the feature unavailable, and existing profiles can pick up the new fields by rereading the original save.

Woodcutting also has Action and RareEvents components. The local samples do not establish the offsets or units for active Overgrowth stacks or Aurora charges. The toolbelt parser identifies an equipped potion by item ID when present. An occupied-potion fixture is still needed to validate the equipped quantity and how it changes with one hit.
