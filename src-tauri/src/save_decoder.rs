use std::collections::{BTreeMap, BTreeSet};
use std::fs;
use std::io::Read;
use std::path::{Path, PathBuf};
use base64::Engine;
use brotli::{BrotliDecompressStream, BrotliResult, BrotliState, HeapAlloc};
use serde::Serialize;
use time::format_description::well_known::Rfc3339;
use time::OffsetDateTime;

const MAX_COMPRESSED_BYTES: usize = 16 * 1024 * 1024;
const MAX_DECOMPRESSED_BYTES: usize = 64 * 1024 * 1024;
const MAX_BASE64_BYTES: usize = MAX_COMPRESSED_BYTES.div_ceil(3) * 4;
const MAX_ENTRIES: usize = 100_000;
const MAX_STRING_BYTES: usize = 1024 * 1024;
const DECOMPRESS_BUFFER_BYTES: usize = 4096;
const DOTNET_UNIX_EPOCH_TICKS: i128 = 621_355_968_000_000_000;
const TICKS_PER_SECOND: i128 = 10_000_000;

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct DecodedSave {
    pub version: i32,
    pub uuid: String,
    pub name: String,
    pub mode: String,
    pub saved_at: String,
    pub demo: bool,
    pub total_level: i32,
    pub gp: String,
    pub slayer_coins: String,
    pub activity: Activity,
    pub skills: Vec<Skill>,
    pub bank: Bank,
    pub wallet: BTreeMap<String, String>,
    pub woodcutting_toolbelt: Option<BTreeMap<String, String>>,
    pub thieving_toolbelt: Option<BTreeMap<String, String>>,
    pub agility_technique_xp: Option<BTreeMap<String, f64>>,
    pub deedree_nodes: Option<BTreeSet<String>>,
    pub astrology_constellations: Option<BTreeMap<String, AstrologyConstellation>>,
    pub shop_purchases: Option<BTreeMap<String, i32>>,
    pub woodcutting_mastery_tasks: Option<BTreeMap<String, MasteryTaskState>>,
    pub woody_unlocked: Option<bool>,
    pub unknown_components: Vec<UnknownComponent>,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct AstrologyConstellation {
    pub knowledge: f64,
    pub minor_nodes: BTreeSet<String>,
    pub major_nodes: BTreeSet<String>,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct Activity {
    pub kind: Option<String>,
    pub target: Option<String>,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct Skill {
    pub name: String,
    pub level: Option<i32>,
    pub xp: f64,
}

#[derive(Debug, Default, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct Bank {
    pub stacks: usize,
    pub tabs: usize,
    pub items: BTreeMap<String, i64>,
    pub unknown_trailing_bytes: usize,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct UnknownComponent {
    pub entity: String,
    pub component: String,
    pub size_bytes: usize,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct MasteryTaskState {
    pub goal_complete: Option<bool>,
    pub trigger_met: bool,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct SaveFileEntry {
    pub name: String,
    pub size_bytes: u64,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct LoadedSave {
    pub file_name: String,
    pub save: DecodedSave,
}

pub fn decode_save_base64(payload: &str) -> Result<DecodedSave, String> {
    if payload.len() > MAX_BASE64_BYTES {
        return Err("Save input exceeds the maximum encoded size.".into());
    }

    let compact: String = payload.chars().filter(|character| !character.is_ascii_whitespace()).collect();
    if compact.is_empty() {
        return Err("Save input is empty.".into());
    }

    let compressed = base64::engine::general_purpose::STANDARD
        .decode(compact.as_bytes())
        .map_err(|_| "Save string is not valid Base64.".to_string())?;
    decode_compressed_save(&compressed)
}

pub fn list_save_files(directory: &str) -> Result<Vec<SaveFileEntry>, String> {
    let directory = canonical_directory(directory)?;
    let entries = fs::read_dir(&directory)
        .map_err(|_| "Could not read the selected save directory.".to_string())?;
    let mut saves = Vec::new();

    for entry in entries {
        let entry = entry.map_err(|_| "Could not read an entry in the save directory.".to_string())?;
        if !entry
            .file_type()
            .map_err(|_| "Could not inspect a save directory entry.".to_string())?
            .is_file()
        {
            continue;
        }

        let Some(file_name) = entry.file_name().to_str().map(str::to_owned) else {
            continue;
        };
        if !is_save_file_name(&file_name) {
            continue;
        }

        let canonical_file = entry
            .path()
            .canonicalize()
            .map_err(|_| "Could not resolve a save file path.".to_string())?;
        if canonical_file.parent() != Some(directory.as_path()) {
            continue;
        }
        let metadata = fs::metadata(canonical_file)
            .map_err(|_| "Could not inspect a save file.".to_string())?;
        saves.push(SaveFileEntry {
            name: file_name,
            size_bytes: metadata.len(),
        });
    }

    saves.sort_by(|left, right| left.name.cmp(&right.name));
    Ok(saves)
}

pub fn load_save_from_directory(directory: &str, file_name: &str) -> Result<LoadedSave, String> {
    if !is_save_file_name(file_name) {
        return Err("Choose a save file named save_*.sav.".into());
    }

    let directory = canonical_directory(directory)?;
    let path = directory
        .join(file_name)
        .canonicalize()
        .map_err(|_| "The selected save file could not be found.".to_string())?;
    if path.parent() != Some(directory.as_path()) || !path.is_file() {
        return Err("The selected save file is outside the chosen directory.".into());
    }

    let metadata = fs::metadata(&path).map_err(|_| "Could not inspect the selected save file.".to_string())?;
    if metadata.len() > MAX_COMPRESSED_BYTES as u64 {
        return Err("Save input exceeds the maximum compressed size.".into());
    }
    let mut file = fs::File::open(path).map_err(|_| "Could not read the selected save file.".to_string())?;
    let mut bytes = Vec::new();
    file.by_ref()
        .take((MAX_COMPRESSED_BYTES + 1) as u64)
        .read_to_end(&mut bytes)
        .map_err(|_| "Could not read the selected save file.".to_string())?;
    let save = decode_compressed_save(&bytes)?;
    Ok(LoadedSave {
        file_name: file_name.to_owned(),
        save,
    })
}

fn canonical_directory(directory: &str) -> Result<PathBuf, String> {
    let path = Path::new(directory)
        .canonicalize()
        .map_err(|_| "The selected save directory is not available.".to_string())?;
    if !path.is_dir() {
        return Err("The selected save path is not a directory.".into());
    }
    Ok(path)
}

fn is_save_file_name(file_name: &str) -> bool {
    let path = Path::new(file_name);
    path.components().count() == 1
        && path.file_name().and_then(|name| name.to_str()) == Some(file_name)
        && file_name.starts_with("save_")
        && file_name.ends_with(".sav")
        && file_name.len() > "save_.sav".len()
}

pub fn decode_compressed_save(compressed: &[u8]) -> Result<DecodedSave, String> {
    if compressed.is_empty() {
        return Err("Save input is empty.".into());
    }
    if compressed.len() > MAX_COMPRESSED_BYTES {
        return Err("Save input exceeds the maximum compressed size.".into());
    }

    let mut state = BrotliState::new(
        HeapAlloc::default(),
        HeapAlloc::default(),
        HeapAlloc::default(),
    );
    let mut available_in = compressed.len();
    let mut input_offset = 0;
    let mut total_out = 0;
    let mut decompressed = Vec::new();
    let mut output_buffer = [0_u8; DECOMPRESS_BUFFER_BYTES];

    loop {
        let previous_input = (available_in, input_offset);
        let mut available_out = output_buffer.len();
        let mut output_offset = 0;
        let result = BrotliDecompressStream(
            &mut available_in,
            &mut input_offset,
            compressed,
            &mut available_out,
            &mut output_offset,
            &mut output_buffer,
            &mut total_out,
            &mut state,
        );

        if decompressed.len().saturating_add(output_offset) > MAX_DECOMPRESSED_BYTES {
            return Err("Decompressed save exceeds the maximum allowed size.".into());
        }
        decompressed.extend_from_slice(&output_buffer[..output_offset]);

        match result {
            BrotliResult::ResultSuccess => {
                if available_in != 0 {
                    return Err("Save contains data after the Brotli stream.".into());
                }
                break;
            }
            BrotliResult::NeedsMoreOutput => {
                if output_offset == 0 && previous_input == (available_in, input_offset) {
                    return Err("Brotli decoder made no progress.".into());
                }
            }
            BrotliResult::NeedsMoreInput => {
                if available_in != 0 {
                    return Err("Brotli decoder stopped before consuming its input.".into());
                }
                if output_offset == 0 {
                    break;
                }
            }
            BrotliResult::ResultFailure => {
                return Err("Save data contains an invalid Brotli stream.".into());
            }
        }
    }

    parse_decompressed_save(&decompressed)
}

fn parse_decompressed_save(data: &[u8]) -> Result<DecodedSave, String> {
    let mut reader = Reader::new(data);
    let version = reader.i32()?;
    if version <= 0 {
        return Err("Save version is invalid.".into());
    }

    let uuid = format_uuid(reader.take(16)?);
    let name = reader.string()?;
    let mode = reader.string()?;
    let saved_at = datetime_from_binary(reader.i64()?)?;
    let activity_kind = reader.string()?;
    let _activity_kind_icon = reader.string()?;
    let activity_target = reader.string()?;
    let _activity_target_icon = reader.string()?;
    let total_level = reader.i32()?;
    let gp = reader.i64()?.to_string();
    let slayer_coins = reader.i64()?.to_string();
    let demo = reader.flag()?;
    let entities = reader
        .table()
        .map_err(|error| format!("Entity table: {error}"))?;

    let mut skills = Vec::new();
    let mut skill_names = BTreeSet::new();
    let mut bank = Bank::default();
    let mut wallet = BTreeMap::new();
    let mut woodcutting_toolbelt = None;
    let mut thieving_toolbelt = None;
    let mut agility_technique_xp = None;
    let mut deedree_nodes = None;
    let mut astrology_constellations = None;
    let mut shop_purchases = None;
    let mut woodcutting_mastery_tasks = None;
    let mut woody_unlocked = None;
    let mut unknown_components = Vec::new();

    for (entity_name, entity_payload) in entities {
        let entity_short = short_id(&entity_name).to_string();
        let components = Reader::new(entity_payload)
            .table()
            .map_err(|error| format!("Components for {entity_short}: {error}"))?;

        for (component_name, component_payload) in components {
            let component_short = short_id(&component_name).to_string();
            match (entity_name.as_str(), component_name.as_str()) {
                ("MelvorBase:Agility", "Techniques") if version == 32 && !demo => {
                    match parse_agility_techniques(component_payload) {
                        Ok(techniques) => agility_technique_xp = Some(techniques),
                        Err(_) => unknown_components.push(UnknownComponent {
                            entity: entity_short.clone(),
                            component: component_short,
                            size_bytes: component_payload.len(),
                        }),
                    }
                }
                ("MelvorBase:Woodcutting", "MasteryGuild") if version == 32 && !demo => {
                    match parse_mastery_tasks(component_payload) {
                        Ok(tasks) => woodcutting_mastery_tasks = Some(tasks),
                        Err(_) => unknown_components.push(UnknownComponent {
                            entity: entity_short.clone(),
                            component: component_short,
                            size_bytes: component_payload.len(),
                        }),
                    }
                }
                ("MelvorBase:Woodcutting", "Pets") if version == 32 && !demo => {
                    match parse_woody_unlocked(component_payload) {
                        Ok(unlocked) => woody_unlocked = Some(unlocked),
                        Err(_) => unknown_components.push(UnknownComponent {
                            entity: entity_short.clone(),
                            component: component_short,
                            size_bytes: component_payload.len(),
                        }),
                    }
                }
                ("MelvorBase:Shop", "Shop") if version == 32 && !demo => {
                    match parse_shop_purchases(component_payload) {
                        Ok(purchases) => shop_purchases = Some(purchases),
                        Err(_) => unknown_components.push(UnknownComponent {
                            entity: entity_short.clone(),
                            component: component_short,
                            size_bytes: component_payload.len(),
                        }),
                    }
                }
                ("MelvorBase:Astrology", "Action") if version == 32 && !demo => {
                    match parse_astrology_constellations(component_payload) {
                        Ok(constellations) => {
                            deedree_nodes = Some(constellations.get("Deedree")
                                .map(|entry| entry.minor_nodes.union(&entry.major_nodes).cloned().collect())
                                .unwrap_or_default());
                            astrology_constellations = Some(constellations);
                        }
                        Err(_) => unknown_components.push(UnknownComponent {
                            entity: entity_short.clone(),
                            component: component_short,
                            size_bytes: component_payload.len(),
                        }),
                    }
                }
                ("MelvorBase:Woodcutting" | "MelvorBase:Thieving", "Toolbelt") if version == 32 && !demo => {
                    let toolbelt = if entity_name == "MelvorBase:Woodcutting" {
                        &mut woodcutting_toolbelt
                    } else {
                        &mut thieving_toolbelt
                    };
                    match parse_toolbelt(component_payload) {
                        Ok(slots) => *toolbelt = Some(slots),
                        Err(_) => unknown_components.push(UnknownComponent {
                            entity: entity_short.clone(),
                            component: component_short,
                            size_bytes: component_payload.len(),
                        }),
                    }
                }
                (_, "Experience") => {
                    let skill_name = entity_short.clone();
                    if !skill_names.insert(skill_name.clone()) {
                        return Err("Save contains duplicate skill records.".into());
                    }
                    skills.push(parse_skill(skill_name, component_payload)?);
                }
                ("MelvorBase:Bank", "Inventory") => {
                    bank = parse_inventory(component_payload)?;
                }
                ("MelvorBase:Bank", "Wallet") => {
                    wallet = parse_wallet(component_payload)?;
                }
                _ => unknown_components.push(UnknownComponent {
                    entity: entity_short.clone(),
                    component: component_short,
                    size_bytes: component_payload.len(),
                }),
            }
        }
    }

    Ok(DecodedSave {
        version,
        uuid,
        name,
        mode,
        saved_at,
        demo,
        total_level,
        gp,
        slayer_coins,
        activity: Activity {
            kind: nonempty(activity_kind),
            target: nonempty(activity_target),
        },
        skills,
        bank,
        wallet,
        woodcutting_toolbelt,
        thieving_toolbelt,
        agility_technique_xp,
        deedree_nodes,
        astrology_constellations,
        shop_purchases,
        woodcutting_mastery_tasks,
        woody_unlocked,
        unknown_components,
    })
}

fn mastery_flag(reader: &mut Reader<'_>) -> Result<bool, String> {
    match reader.take(1)?[0] {
        0 => Ok(false),
        1 => Ok(true),
        _ => Err("Mastery or pet flag is invalid.".into()),
    }
}

fn parse_mastery_tasks(payload: &[u8]) -> Result<BTreeMap<String, MasteryTaskState>, String> {
    let mut reader = Reader::new(payload);
    if mastery_flag(&mut reader)? {
        reader.string()?; // Selected category
    }
    let mut tasks = BTreeMap::new();
    for (id, bytes) in reader.table()? {
        let mut task = Reader::new(bytes);
        let goal_complete = if mastery_flag(&mut task)? {
            task.string()?; // Goal identifier
            let length = usize::try_from(task.i32()?).map_err(|_| "Invalid mastery goal size.")?;
            let mut goal = Reader::new(task.take(length)?);
            goal.f64()?; // Progress
            let complete = mastery_flag(&mut goal)?;
            mastery_flag(&mut goal)?; // Additional v32 goal flag
            if !goal.is_empty() {
                return Err("Mastery goal has an unsupported layout.".into());
            }
            Some(complete)
        } else {
            None
        };
        let trigger_met = mastery_flag(&mut task)?;
        if id.is_empty() || id.len() > 256 || !task.is_empty() {
            return Err("Mastery task has an unsupported layout.".into());
        }
        tasks.insert(id, MasteryTaskState { goal_complete, trigger_met });
    }
    if !reader.is_empty() {
        return Err("Mastery Guild has an unsupported layout.".into());
    }
    Ok(tasks)
}

fn parse_woody_unlocked(payload: &[u8]) -> Result<bool, String> {
    let mut reader = Reader::new(payload);
    let pets = reader.table()?;
    if !reader.is_empty() {
        return Err("Pets have an unsupported layout.".into());
    }
    let Some((_, bytes)) = pets.iter().find(|(id, _)| id == "MelvorBase:Woody") else {
        return Ok(false);
    };
    let mut pet = Reader::new(bytes);
    let unlocked = mastery_flag(&mut pet)?;
    mastery_flag(&mut pet)?; // Additional v32 pet flag
    if !pet.is_empty() {
        return Err("Woody's pet record has an unsupported layout.".into());
    }
    Ok(unlocked)
}

fn parse_shop_purchases(payload: &[u8]) -> Result<BTreeMap<String, i32>, String> {
    let mut reader = Reader::new(payload);
    reader.take(11)?; // Shop display settings
    let mut purchases = BTreeMap::new();
    for _ in 0..reader.count()? {
        let quantity = reader.i32()?;
        let id = reader.string()?;
        if quantity < 0 || id.is_empty() || id.len() > 256 || purchases.insert(id, quantity).is_some() {
            return Err("Shop purchase entry is invalid.".into());
        }
    }
    if !reader.is_empty() {
        return Err("Shop purchases have an unsupported layout.".into());
    }
    Ok(purchases)
}

fn parse_astrology_constellations(payload: &[u8]) -> Result<BTreeMap<String, AstrologyConstellation>, String> {
    let mut reader = Reader::new(payload);
    // Started flag, action timer, and two view flags precede the constellation table.
    reader.take(16)?;
    let mut constellations = BTreeMap::new();
    for (id, bytes) in reader.table()? {
        let Some(name) = id.strip_prefix("MelvorBase:") else { continue };
        if !matches!(name, "Deedree" | "Terra" | "Ameria" | "Ceedyr" | "Iridan" | "Syllia" |
            "Arachi" | "Hyden" | "Vale" | "Ko" | "Tellus" | "Qimican") {
            continue;
        }
        let mut entry = Reader::new(bytes);
        let knowledge = entry.f64()?;
        if !knowledge.is_finite() || knowledge < 0.0 {
            return Err("Astrology knowledge is invalid.".into());
        }
        let minor_nodes = parse_astrology_nodes(&mut entry)?;
        let major_nodes = parse_astrology_nodes(&mut entry)?;
        if !entry.is_empty() || !minor_nodes.is_disjoint(&major_nodes) {
            return Err("Astrology constellation has an unsupported layout.".into());
        }
        constellations.insert(name.to_string(), AstrologyConstellation { knowledge, minor_nodes, major_nodes });
    }
    // The Action component continues with UI and action-selection state.
    Ok(constellations)
}

fn parse_astrology_nodes(reader: &mut Reader<'_>) -> Result<BTreeSet<String>, String> {
    let count = reader.count()?;
    if count > 64 {
        return Err("Astrology node list is too long.".into());
    }
    let mut nodes = BTreeSet::new();
    for _ in 0..count {
        let id = reader.string()?;
        if id.is_empty() || id.len() > 256 || !nodes.insert(id) {
            return Err("Astrology node list is invalid.".into());
        }
    }
    Ok(nodes)
}

fn parse_toolbelt(payload: &[u8]) -> Result<BTreeMap<String, String>, String> {
    let mut reader = Reader::new(payload);
    let mut slots = BTreeMap::new();
    for (slot, bytes) in reader.table()? {
        let mut entry = Reader::new(bytes);
        let quantity = entry.i32()?;
        match entry.take(1)?[0] {
            0 => {}
            1 if quantity > 0 => {
                let item = entry.string()?;
                if item.is_empty() || item.len() > 256 || slot.is_empty() || slot.len() > 256 {
                    return Err("Toolbelt identifier is invalid.".into());
                }
                slots.insert(slot, item);
            }
            _ => return Err("Toolbelt slot presence or quantity is invalid.".into()),
        }
        if !entry.is_empty() {
            return Err("Toolbelt slot has trailing data.".into());
        }
    }
    // The sampled release saves have no saved toolbelt loadouts.
    if reader.i32()? != 0 || !reader.is_empty() {
        return Err("Toolbelt trailer has an unsupported layout.".into());
    }
    Ok(slots)
}

fn parse_agility_techniques(payload: &[u8]) -> Result<BTreeMap<String, f64>, String> {
    let mut reader = Reader::new(payload);
    let mut techniques = BTreeMap::new();
    for (id, bytes) in reader.table()? {
        let name = id.strip_prefix("MelvorBase:").unwrap_or(&id);
        if !matches!(name, "Climbing" | "Jumping" | "Evading" | "Balancing" | "Rappelling") {
            continue;
        }
        if bytes.len() != 8 {
            return Err("Agility technique experience has an unsupported layout.".into());
        }
        let xp = parse_skill(name.to_string(), bytes)?.xp;
        if techniques.insert(name.to_string(), xp).is_some() {
            return Err("Duplicate Agility technique experience.".into());
        }
    }
    if !reader.is_empty() {
        return Err("Agility techniques have trailing data.".into());
    }
    Ok(techniques)
}

fn parse_skill(name: String, payload: &[u8]) -> Result<Skill, String> {
    let mut reader = Reader::new(payload);
    let xp = reader.f64()?;
    if !xp.is_finite() || xp < 0.0 {
        return Err("Skill XP is invalid.".into());
    }

    let level = match payload.len() {
        8 => None,
        12 => {
            let level = reader.i32()?;
            if !(1..=200).contains(&level) {
                return Err("Stored skill level is outside the supported range.".into());
            }
            Some(level)
        }
        _ => return Err("Skill experience component has an unsupported layout.".into()),
    };

    if !reader.is_empty() {
        return Err("Skill experience component has trailing data.".into());
    }

    Ok(Skill { name, level, xp })
}

fn parse_wallet(payload: &[u8]) -> Result<BTreeMap<String, String>, String> {
    let mut reader = Reader::new(payload);
    let count = reader.count()?;
    let mut wallet = BTreeMap::new();
    for _ in 0..count {
        let amount = reader.i64()?.to_string();
        let item = short_id(&reader.string()?).to_string();
        if wallet.insert(item, amount).is_some() {
            return Err("Wallet contains duplicate currency identifiers.".into());
        }
    }
    Ok(wallet)
}

fn parse_inventory(payload: &[u8]) -> Result<Bank, String> {
    let mut fallback = None;
    for trailing_tab_bytes in [0, 1] {
        match parse_inventory_layout(payload, trailing_tab_bytes) {
            Ok(bank) if bank.unknown_trailing_bytes == 0 => return Ok(bank),
            Ok(bank) => {
                if fallback.is_none() {
                    fallback = Some(bank);
                }
            }
            Err(_) => {}
        }
    }
    fallback.ok_or_else(|| "Bank inventory layout is not recognized.".into())
}

fn parse_inventory_layout(payload: &[u8], trailing_tab_bytes: usize) -> Result<Bank, String> {
    let mut reader = Reader::new(payload);
    let _default_tab = reader.i32()?;
    let tabs = reader.count()?;
    let mut bank = Bank {
        tabs,
        ..Bank::default()
    };

    for _ in 0..tabs {
        reader.take(14)?;
        let stacks = reader.count()?;
        bank.stacks = bank
            .stacks
            .checked_add(stacks)
            .ok_or_else(|| "Bank stack count overflowed.".to_string())?;

        for _ in 0..stacks {
            let quantity = reader.i32()?;
            reader.take(2)?;
            let item = short_id(&reader.string()?).to_string();
            if quantity > 0 {
                let entry = bank.items.entry(item).or_default();
                *entry = entry
                    .checked_add(i64::from(quantity))
                    .ok_or_else(|| "Bank item quantity overflowed.".to_string())?;
            }
        }

        let _tab_label = reader.string()?;
        let tags = reader.count()?;
        for _ in 0..tags {
            reader.take(2)?;
            let _tag = reader.string()?;
        }
        reader.take(trailing_tab_bytes)?;
    }

    bank.unknown_trailing_bytes = reader.remaining();
    Ok(bank)
}

fn datetime_from_binary(binary: i64) -> Result<String, String> {
    let ticks = i128::from(binary as u64 & 0x3fff_ffff_ffff_ffff);
    let unix_ticks = ticks - DOTNET_UNIX_EPOCH_TICKS;
    let seconds = i64::try_from(unix_ticks.div_euclid(TICKS_PER_SECOND))
        .map_err(|_| "Save timestamp is outside the supported range.".to_string())?;
    let nanoseconds = u32::try_from(unix_ticks.rem_euclid(TICKS_PER_SECOND) * 100)
        .map_err(|_| "Save timestamp is invalid.".to_string())?;
    let datetime = OffsetDateTime::from_unix_timestamp(seconds)
        .map_err(|_| "Save timestamp is invalid.".to_string())?;
    let datetime = datetime
        .replace_nanosecond(nanoseconds)
        .map_err(|_| "Save timestamp is invalid.".to_string())?;
    datetime
        .format(&Rfc3339)
        .map_err(|_| "Save timestamp is invalid.".to_string())
}

fn format_uuid(bytes: &[u8]) -> String {
    let first = u32::from_le_bytes(bytes[0..4].try_into().expect("UUID prefix length"));
    let second = u16::from_le_bytes(bytes[4..6].try_into().expect("UUID field length"));
    let third = u16::from_le_bytes(bytes[6..8].try_into().expect("UUID field length"));
    format!(
        "{first:08x}-{second:04x}-{third:04x}-{}-{}",
        hex_bytes(&bytes[8..10]),
        hex_bytes(&bytes[10..16])
    )
}

fn hex_bytes(bytes: &[u8]) -> String {
    bytes.iter().map(|byte| format!("{byte:02x}")).collect()
}

fn short_id(value: &str) -> &str {
    value.rsplit_once(':').map_or(value, |(_, short)| short)
}

fn nonempty(value: String) -> Option<String> {
    if value.is_empty() { None } else { Some(value) }
}

struct Reader<'a> {
    data: &'a [u8],
    position: usize,
}

impl<'a> Reader<'a> {
    fn new(data: &'a [u8]) -> Self {
        Self { data, position: 0 }
    }

    fn take(&mut self, size: usize) -> Result<&'a [u8], String> {
        let end = self
            .position
            .checked_add(size)
            .ok_or_else(|| "Save component size overflowed.".to_string())?;
        if end > self.data.len() {
            return Err(format!(
                "Save data is truncated at byte {} of {} while reading {} bytes.",
                self.position,
                self.data.len(),
                size,
            ));
        }
        let bytes = &self.data[self.position..end];
        self.position = end;
        Ok(bytes)
    }

    fn i32(&mut self) -> Result<i32, String> {
        Ok(i32::from_le_bytes(self.take(4)?.try_into().expect("i32 length")))
    }

    fn i64(&mut self) -> Result<i64, String> {
        Ok(i64::from_le_bytes(self.take(8)?.try_into().expect("i64 length")))
    }

    fn f64(&mut self) -> Result<f64, String> {
        Ok(f64::from_le_bytes(self.take(8)?.try_into().expect("f64 length")))
    }

    fn flag(&mut self) -> Result<bool, String> {
        Ok(self.take(1)?[0] != 0)
    }

    fn count(&mut self) -> Result<usize, String> {
        let count = self.i32()?;
        if count < 0 || count as usize > MAX_ENTRIES || count as usize > self.remaining() {
            return Err("Save contains an invalid entry count.".into());
        }
        Ok(count as usize)
    }

    fn string(&mut self) -> Result<String, String> {
        let mut length = 0_u32;
        let mut shift = 0;
        for index in 0..5 {
            let byte = self.take(1)?[0];
            if index == 4 && byte > 0x0f {
                return Err("Save string length is invalid.".into());
            }
            length |= u32::from(byte & 0x7f) << shift;
            if byte < 0x80 {
                let length = usize::try_from(length).map_err(|_| "Save string is too large.")?;
                if length > MAX_STRING_BYTES {
                    return Err("Save string exceeds the maximum allowed size.".into());
                }
                return String::from_utf8(self.take(length)?.to_vec())
                    .map_err(|_| "Save contains invalid UTF-8 text.".into());
            }
            shift += 7;
        }
        Err("Save string length encoding is invalid.".into())
    }

    fn table(&mut self) -> Result<Vec<(String, &'a [u8])>, String> {
        let count = self.count()?;
        let mut entries = Vec::with_capacity(count);
        let mut names = BTreeSet::new();
        for _ in 0..count {
            let name = self.string()?;
            let size = self.i32()?;
            if size < 0 {
                return Err("Save component has a negative size.".into());
            }
            if !names.insert(name.clone()) {
                return Err("Save contains duplicate component names.".into());
            }
            entries.push((name, self.take(size as usize)?));
        }
        Ok(entries)
    }

    fn remaining(&self) -> usize {
        self.data.len() - self.position
    }

    fn is_empty(&self) -> bool {
        self.position == self.data.len()
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::io::Write;
    use std::sync::atomic::{AtomicU64, Ordering};

    static NEXT_TEMP_DIRECTORY: AtomicU64 = AtomicU64::new(0);

    fn temporary_save_directory() -> PathBuf {
        let sequence = NEXT_TEMP_DIRECTORY.fetch_add(1, Ordering::Relaxed);
        let path = std::env::temp_dir().join(format!(
            "melvor-save-test-{}-{sequence}",
            std::process::id()
        ));
        std::fs::create_dir_all(&path).expect("create temporary save directory");
        path
    }

    fn write_i32(output: &mut Vec<u8>, value: i32) {
        output.extend_from_slice(&value.to_le_bytes());
    }

    fn write_i64(output: &mut Vec<u8>, value: i64) {
        output.extend_from_slice(&value.to_le_bytes());
    }

    fn write_f64(output: &mut Vec<u8>, value: f64) {
        output.extend_from_slice(&value.to_le_bytes());
    }

    fn write_string(output: &mut Vec<u8>, value: &str) {
        let mut length = value.len() as u32;
        while length >= 0x80 {
            output.push((length as u8) | 0x80);
            length >>= 7;
        }
        output.push(length as u8);
        output.extend_from_slice(value.as_bytes());
    }

    fn write_table(entries: Vec<(&str, Vec<u8>)>) -> Vec<u8> {
        let mut output = Vec::new();
        write_i32(&mut output, entries.len() as i32);
        for (name, payload) in entries {
            write_string(&mut output, name);
            write_i32(&mut output, payload.len() as i32);
            output.extend_from_slice(&payload);
        }
        output
    }

    fn synthetic_save() -> Vec<u8> {
        let mut experience_release = Vec::new();
        write_f64(&mut experience_release, 5_000.5);
        let mut experience_demo = Vec::new();
        write_f64(&mut experience_demo, 2_500.0);
        write_i32(&mut experience_demo, 25);

        let woodcutting = write_table(vec![
            ("Experience", experience_release),
            ("Unrecognized", vec![1, 2, 3]),
        ]);
        let mining = write_table(vec![("Experience", experience_demo)]);
        let bank = write_table(vec![
            ("Inventory", synthetic_inventory()),
            ("Wallet", synthetic_wallet()),
        ]);
        let entities = write_table(vec![
            ("MelvorBase:Woodcutting", woodcutting),
            ("MelvorBase:Mining", mining),
            ("MelvorBase:Bank", bank),
        ]);

        let mut save = Vec::new();
        write_i32(&mut save, 32);
        save.extend_from_slice(&[
            0x33, 0x22, 0x11, 0x00, 0x55, 0x44, 0x77, 0x66, 0x88, 0x99, 0xaa, 0xbb, 0xcc, 0xdd,
            0xee, 0xff,
        ]);
        write_string(&mut save, "Fixture");
        write_string(&mut save, "Normal");
        write_i64(&mut save, 621_355_968_000_000_000);
        write_string(&mut save, "Woodcutting");
        write_string(&mut save, "");
        write_string(&mut save, "NormalTree");
        write_string(&mut save, "");
        write_i32(&mut save, 12);
        write_i64(&mut save, 123_456);
        write_i64(&mut save, 789);
        save.push(0);
        save.extend_from_slice(&entities);
        save
    }

    fn synthetic_inventory() -> Vec<u8> {
        let mut inventory = Vec::new();
        write_i32(&mut inventory, 0);
        write_i32(&mut inventory, 1);
        inventory.extend_from_slice(&[0; 14]);
        write_i32(&mut inventory, 2);
        for (quantity, item) in [(50, "NormalLog"), (0, "EmptyStack")] {
            write_i32(&mut inventory, quantity);
            inventory.extend_from_slice(&[0; 2]);
            write_string(&mut inventory, &format!("MelvorBase:{item}"));
        }
        write_string(&mut inventory, "Main");
        write_i32(&mut inventory, 0);
        inventory.push(0);
        inventory
    }

    fn synthetic_wallet() -> Vec<u8> {
        let mut wallet = Vec::new();
        write_i32(&mut wallet, 1);
        write_i64(&mut wallet, 77_777);
        write_string(&mut wallet, "MelvorBase:GoldPieces");
        wallet
    }

    fn compress(data: &[u8]) -> Vec<u8> {
        let mut writer = brotli::CompressorWriter::new(Vec::new(), 4096, 5, 22);
        writer.write_all(data).expect("compress fixture");
        writer.into_inner()
    }

    #[test]
    fn parses_release_and_demo_skill_layouts_and_bank_data() {
        let decoded = parse_decompressed_save(&synthetic_save()).expect("parse fixture");

        assert_eq!(decoded.version, 32);
        assert_eq!(decoded.uuid, "00112233-4455-6677-8899-aabbccddeeff");
        assert_eq!(decoded.saved_at, "1970-01-01T00:00:00Z");
        assert_eq!(decoded.skills.len(), 2);
        assert_eq!(decoded.skills[0].name, "Woodcutting");
        assert_eq!(decoded.skills[0].level, None);
        assert_eq!(decoded.skills[0].xp, 5_000.5);
        assert_eq!(decoded.skills[1].level, Some(25));
        assert_eq!(decoded.bank.tabs, 1);
        assert_eq!(decoded.bank.stacks, 2);
        assert_eq!(decoded.bank.items.get("NormalLog"), Some(&50));
        assert_eq!(decoded.wallet.get("GoldPieces").map(String::as_str), Some("77777"));
        assert_eq!(decoded.unknown_components.len(), 1);
        assert_eq!(decoded.unknown_components[0].component, "Unrecognized");
    }

    #[test]
    fn decodes_a_brotli_stream() {
        let decoded = decode_compressed_save(&compress(&synthetic_save())).expect("decode fixture");
        assert_eq!(decoded.version, 32);
        assert_eq!(decoded.skills.len(), 2);
    }

    #[test]
    fn rejects_empty_invalid_and_oversized_inputs() {
        assert!(decode_save_base64("").is_err());
        assert!(decode_save_base64("not a save!").is_err());
        assert!(decode_compressed_save(&[]).is_err());
        assert!(decode_compressed_save(&vec![0; MAX_COMPRESSED_BYTES + 1]).is_err());
        assert!(parse_decompressed_save(&[0; 4]).is_err());
    }

    #[test]
    fn rejects_truncated_skill_components() {
        let mut reader = Reader::new(&[1, 2, 3]);
        assert!(reader.i64().is_err());
    }

    #[test]
    fn lists_and_rereads_only_save_files_in_the_selected_directory() {
        let directory = temporary_save_directory();
        let file_name = "save_fixture.sav";
        let original = compress(&synthetic_save());
        std::fs::write(directory.join(file_name), &original).expect("write synthetic save");
        std::fs::write(directory.join("other.sav"), &original).expect("write non-save file");
        std::fs::write(directory.join("save_fixture.txt"), &original).expect("write wrong extension");
        std::fs::create_dir(directory.join("save_folder.sav")).expect("create matching directory name");
        let directory_string = directory.to_string_lossy().into_owned();

        let entries = list_save_files(&directory_string).expect("list save directory");
        assert_eq!(entries.len(), 1);
        assert_eq!(entries[0].name, file_name);
        assert_eq!(entries[0].size_bytes, original.len() as u64);

        let loaded = load_save_from_directory(&directory_string, file_name).expect("read selected save");
        assert_eq!(loaded.file_name, file_name);
        assert_eq!(loaded.save.version, 32);
        assert_eq!(std::fs::read(directory.join(file_name)).expect("reread unchanged save"), original);
        assert!(load_save_from_directory(&directory_string, "../save_fixture.sav").is_err());
        assert!(load_save_from_directory(&directory_string, "other.sav").is_err());

        std::fs::remove_dir_all(directory).expect("remove temporary save directory");
    }

    #[test]
    fn distinguishes_mastery_completion_and_pet_unlock_flags() {
        let mut saved_goal = vec![1];
        write_string(&mut saved_goal, "0");
        write_i32(&mut saved_goal, 10);
        write_f64(&mut saved_goal, 200.0);
        saved_goal.extend([1, 0, 1]);
        let mut mastery = vec![0];
        mastery.extend(write_table(vec![
            ("MelvorBase:WoodcuttingTask1", saved_goal),
            ("MelvorBase:WoodcuttingTask76", vec![0, 1]),
        ]));
        let tasks = parse_mastery_tasks(&mastery).unwrap();
        assert_eq!(tasks["MelvorBase:WoodcuttingTask1"].goal_complete, Some(true));
        assert_eq!(tasks["MelvorBase:WoodcuttingTask76"].goal_complete, None);
        assert!(tasks["MelvorBase:WoodcuttingTask76"].trigger_met);
        mastery.pop();
        assert!(parse_mastery_tasks(&mastery).is_err());
        for unlocked in [false, true] {
            let pets = write_table(vec![("MelvorBase:Woody", vec![u8::from(unlocked), 0])]);
            assert_eq!(parse_woody_unlocked(&pets).unwrap(), unlocked);
        }
    }

    #[test]
    fn reads_shop_purchase_counts_and_rejects_truncated_data() {
        let mut payload = vec![0; 11];
        write_i32(&mut payload, 1);
        write_i32(&mut payload, 1);
        write_string(&mut payload, "MelvorBase:CopperAxeHead");
        assert_eq!(parse_shop_purchases(&payload).unwrap()["MelvorBase:CopperAxeHead"], 1);
        payload.pop();
        assert!(parse_shop_purchases(&payload).is_err());
    }

    #[test]
    fn reads_constellation_knowledge_and_nodes_and_rejects_truncated_data() {
        let mut deedree = 18.0_f64.to_le_bytes().to_vec();
        write_i32(&mut deedree, 2);
        write_string(&mut deedree, "MelvorBase:DeedreeA1");
        write_string(&mut deedree, "MelvorBase:DeedreeB1");
        write_i32(&mut deedree, 0);
        let mut terra = 290.5_f64.to_le_bytes().to_vec();
        write_i32(&mut terra, 0);
        write_i32(&mut terra, 1);
        write_string(&mut terra, "MelvorBase:TerraMajor1");
        let mut payload = vec![0; 16];
        payload.extend(write_table(vec![("MelvorBase:Deedree", deedree), ("MelvorBase:Terra", terra)]));
        let progress = parse_astrology_constellations(&payload).unwrap();
        assert_eq!(progress["Deedree"].knowledge, 18.0);
        assert_eq!(progress["Deedree"].minor_nodes, BTreeSet::from([
            "MelvorBase:DeedreeA1".to_string(),
            "MelvorBase:DeedreeB1".to_string(),
        ]));
        assert_eq!(progress["Terra"].knowledge, 290.5);
        assert!(progress["Terra"].major_nodes.contains("MelvorBase:TerraMajor1"));
        payload.pop();
        assert!(parse_astrology_constellations(&payload).is_err());
    }

    #[test]
    fn decodes_equipped_woodcutting_item_and_rejects_unsupported_tail() {
        let mut boots = 1_i32.to_le_bytes().to_vec();
        boots.push(1);
        write_string(&mut boots, "MelvorBase:TreesproutBoots");
        let mut empty_slot = (-1_i32).to_le_bytes().to_vec();
        empty_slot.push(0);
        let mut payload = write_table(vec![
            ("MelvorBase:WoodcuttingBoots", boots),
            ("MelvorBase:WoodcuttingTool", empty_slot),
        ]);
        assert!(parse_toolbelt(&payload).is_err());
        write_i32(&mut payload, 0);
        assert_eq!(parse_toolbelt(&payload).unwrap(), BTreeMap::from([
            ("MelvorBase:WoodcuttingBoots".to_string(), "MelvorBase:TreesproutBoots".to_string()),
        ]));
    }

    #[test]
    fn reads_agility_technique_xp_and_rejects_invalid_entries() {
        let techniques = write_table(vec![
            ("MelvorBase:Climbing", 1234.5_f64.to_le_bytes().to_vec()),
            ("MelvorBase:Jumping", 10.0_f64.to_le_bytes().to_vec()),
        ]);
        let result = parse_agility_techniques(&techniques).unwrap();
        assert_eq!(result["Climbing"], 1234.5);
        assert_eq!(result["Jumping"], 10.0);
        assert!(parse_agility_techniques(&techniques[..techniques.len() - 1]).is_err());
        let invalid = write_table(vec![("MelvorBase:Climbing", f64::NAN.to_le_bytes().to_vec())]);
        assert!(parse_agility_techniques(&invalid).is_err());
    }

    #[test]
    #[ignore = "reads the supplied local save samples without modifying them"]
    fn supplied_samples_decode_as_release_version_32() {
        let examples = std::path::Path::new(env!("CARGO_MANIFEST_DIR")).join("../examples");
        let sav_path = std::env::var_os("MELVOR_PLANNER_TEST_SAVE")
            .map(std::path::PathBuf::from)
            .unwrap_or_else(|| examples.join("sample.sav"));
        let sav = std::fs::read(sav_path)
            .expect("read local .sav sample");
        let save_string = std::fs::read_to_string(examples.join("save_string"))
            .expect("read local save string sample");
        let sav = decode_compressed_save(&sav).expect("decode local .sav sample");
        let save_string = decode_save_base64(&save_string).expect("decode local save string sample");

        assert_eq!(sav.version, 32);
        assert_eq!(save_string.version, 32);
        assert_eq!(sav.uuid, save_string.uuid);
        assert_eq!(sav.skills.len(), 25);
        assert_eq!(save_string.skills.len(), 25);
        assert_eq!(sav.bank.items.len(), 101);
        assert_eq!(save_string.bank.items.len(), 101);
        assert!(sav.woodcutting_toolbelt.is_some());
        assert!(save_string.woodcutting_toolbelt.is_some());
        assert!(sav.thieving_toolbelt.is_some());
        assert_eq!(sav.thieving_toolbelt, save_string.thieving_toolbelt);
        assert!(sav.agility_technique_xp.is_some());
        assert_eq!(sav.agility_technique_xp, save_string.agility_technique_xp);
        let nodes = sav.deedree_nodes.expect("decode Deedree nodes from local .sav");
        assert!(nodes.contains("MelvorBase:DeedreeA1"));
        assert!(nodes.contains("MelvorBase:DeedreeB1"));
        assert!(save_string.deedree_nodes.is_some());
        let deedree = &sav.astrology_constellations.unwrap()["Deedree"];
        assert!(deedree.knowledge >= 66.0);
        assert!(deedree.minor_nodes.contains("MelvorBase:DeedreeA1"));
        assert!(save_string.astrology_constellations.is_some());
        assert_eq!(sav.shop_purchases.unwrap()["MelvorBase:CopperAxeHead"], 1);
        assert!(save_string.shop_purchases.is_some());
        assert_eq!(sav.woody_unlocked, Some(false));
        assert_eq!(sav.woodcutting_mastery_tasks.unwrap().len(), 113);
        assert_eq!(save_string.woodcutting_mastery_tasks.unwrap().len(), 113);
    }
}
