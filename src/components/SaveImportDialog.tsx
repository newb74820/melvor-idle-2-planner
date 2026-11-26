import { invoke, isTauri } from '@tauri-apps/api/core';
import { open } from '@tauri-apps/plugin-dialog';
import { AlertTriangle, Check, FileUp, FolderOpen, RefreshCw, Save, Trash2, X } from 'lucide-react';
import { useEffect, useState, type ChangeEvent } from 'react';
import { levelForXp } from '../data/xp-table';
import type { CharacterProfile, DecodedSave, LoadedSave, SaveDirectoryPreference, SaveFileEntry } from '../schemas/save';
import { deleteCharacterProfile, listCharacterProfiles, saveCharacterProfile } from '../storage/profiles';

const MAX_COMPRESSED_BYTES = 16 * 1024 * 1024;

interface SaveImportDialogProps {
  onClose: () => void;
  initialLocation: SaveDirectoryPreference | null;
  onLocationChange: (location: SaveDirectoryPreference) => void;
  onLoaded: (save: DecodedSave) => void;
  onUseWoodcuttingXp: (xp: number) => void;
}

function bytesToBase64(bytes: Uint8Array): string {
  let binary = '';
  const chunkSize = 0x8000;
  for (let offset = 0; offset < bytes.length; offset += chunkSize) {
    binary += String.fromCharCode(...bytes.subarray(offset, offset + chunkSize));
  }
  return btoa(binary);
}

function formatInteger(value: string): string {
  try {
    return BigInt(value).toLocaleString('en-US');
  } catch {
    return value;
  }
}

function errorText(error: unknown): string {
  if (typeof error === 'string') return error;
  if (error instanceof Error) return error.message;
  return 'The save could not be decoded.';
}

function formatBytes(bytes: number): string {
  return `${(bytes / (1024 * 1024)).toFixed(2)} MiB`;
}

function SaveImportDialog({ onClose, initialLocation, onLocationChange, onLoaded, onUseWoodcuttingXp }: SaveImportDialogProps) {
  const [mode, setMode] = useState<'folder' | 'file' | 'paste'>('folder');
  const [directory, setDirectory] = useState(initialLocation?.directory ?? '');
  const [fileName, setFileName] = useState(initialLocation?.fileName ?? '');
  const [saveFiles, setSaveFiles] = useState<SaveFileEntry[]>([]);
  const [saveString, setSaveString] = useState('');
  const [decoded, setDecoded] = useState<DecodedSave | null>(null);
  const [profiles, setProfiles] = useState<CharacterProfile[]>([]);
  const [profileBusy, setProfileBusy] = useState(false);
  const [profileMessage, setProfileMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const woodcutting = decoded?.skills.find((skill) => skill.name.toLowerCase() === 'woodcutting');

  async function decodePayload(payload: string) {
    setBusy(true);
    setError(null);
    setDecoded(null);
    try {
      const result = await invoke<DecodedSave>('decode_save', { payload });
      setDecoded(result);
      onLoaded(result);
    } catch (reason) {
      setError(errorText(reason));
    } finally {
      setBusy(false);
    }
  }

  async function handleFileChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.currentTarget.files?.[0];
    event.currentTarget.value = '';
    if (!file) return;
    if (file.size > MAX_COMPRESSED_BYTES) {
      setError('The selected file exceeds the 16 MiB compressed-save limit.');
      setDecoded(null);
      return;
    }

    try {
      setError(null);
      await decodePayload(bytesToBase64(new Uint8Array(await file.arrayBuffer())));
    } catch (reason) {
      setError(errorText(reason));
    }
  }

  function handlePasteSubmit() {
    void decodePayload(saveString);
  }

  async function refreshFileList(path = directory, preferredFileName = fileName) {
    if (!path) {
      setError('Choose a save directory first.');
      return;
    }
    setBusy(true);
    setError(null);
    setDirectory(path);
    try {
      const files = await invoke<SaveFileEntry[]>('list_save_files', { directory: path });
      const selectedFile = files.some((file) => file.name === preferredFileName)
        ? preferredFileName
        : files[0]?.name ?? '';
      setDirectory(path);
      setSaveFiles(files);
      setFileName(selectedFile);
      onLocationChange({ directory: path, fileName: selectedFile });
      if (files.length === 0) setError('No save_*.sav files were found in this directory.');
    } catch (reason) {
      setSaveFiles([]);
      setFileName('');
      onLocationChange({ directory: path, fileName: '' });
      setError(errorText(reason));
    } finally {
      setBusy(false);
    }
  }

  async function chooseDirectory() {
    try {
      const selected = await open({
        directory: true,
        multiple: false,
        title: 'Choose Melvor Idle 2 save directory',
        ...(directory ? { defaultPath: directory } : {}),
      });
      if (typeof selected === 'string') await refreshFileList(selected, '');
    } catch (reason) {
      setError(errorText(reason));
    }
  }

  async function loadSelectedSave() {
    if (!directory || !fileName) return;
    setBusy(true);
    setError(null);
    setDecoded(null);
    try {
      const result = await invoke<LoadedSave>('load_save_from_directory', { directory, fileName });
      setDecoded(result.save);
      onLocationChange({ directory, fileName: result.fileName });
      onLoaded(result.save);
    } catch (reason) {
      setError(errorText(reason));
    } finally {
      setBusy(false);
    }
  }

  useEffect(() => {
    void loadProfiles();
    if (initialLocation?.directory) {
      void refreshFileList(initialLocation.directory, initialLocation.fileName);
    }
  }, []);

  async function loadProfiles() {
    try {
      setProfiles(await listCharacterProfiles());
    } catch (reason) {
      setProfileMessage(errorText(reason));
    }
  }

  async function persistDecodedProfile() {
    if (!decoded) return;
    setProfileBusy(true);
    setProfileMessage(null);
    try {
      await saveCharacterProfile(decoded);
      await loadProfiles();
      setProfileMessage('Profile saved on this device.');
    } catch (reason) {
      setProfileMessage(errorText(reason));
    } finally {
      setProfileBusy(false);
    }
  }

  function loadSavedProfile(profile: CharacterProfile) {
    setDecoded(profile.data);
    onLoaded(profile.data);
    setProfileMessage(null);
  }

  async function removeSavedProfile(profile: CharacterProfile) {
    setProfileBusy(true);
    setProfileMessage(null);
    try {
      await deleteCharacterProfile(profile.id);
      await loadProfiles();
      if (decoded?.uuid === profile.id) setDecoded(null);
    } catch (reason) {
      setProfileMessage(errorText(reason));
    } finally {
      setProfileBusy(false);
    }
  }

  return (
    <div className="modal-backdrop" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}>
      <section className="save-dialog" role="dialog" aria-modal="true" aria-labelledby="save-dialog-title">
        <header className="save-dialog-header">
          <div><p className="section-kicker">LOCAL CHARACTER DATA</p><h2 id="save-dialog-title">Import save</h2></div>
          <button className="icon-button" type="button" title="Close" aria-label="Close save import" onClick={onClose}><X size={17} /></button>
        </header>

        {!isTauri() ? <p className="import-error">Save decoding is available in the desktop app only.</p> : <>
          {profiles.length > 0 && !decoded && <section className="saved-profiles">
            <div className="profiles-heading"><span className="field-label">SAVED PROFILES</span><span>{profiles.length}</span></div>
            <ul>
              {profiles.map((profile) => <li key={profile.id}>
                <button className="profile-load-button" type="button" onClick={() => loadSavedProfile(profile)} disabled={profileBusy}>
                  <strong>{profile.name || 'Unnamed character'}</strong>
                  <span>{profile.mode} · {profile.data.skills.length} skills · saved {new Date(profile.importedAt).toLocaleDateString()}</span>
                </button>
                <button className="profile-delete-button" type="button" title={`Delete ${profile.name}`} aria-label={`Delete ${profile.name}`} onClick={() => void removeSavedProfile(profile)} disabled={profileBusy}><Trash2 size={14} /></button>
              </li>)}
            </ul>
          </section>}
          {!decoded && <>
            <div className="target-mode import-mode" role="group" aria-label="Save input method">
              <button type="button" className={mode === 'folder' ? 'selected' : ''} aria-pressed={mode === 'folder'} onClick={() => { setMode('folder'); setError(null); }}>Save directory</button>
              <button type="button" className={mode === 'file' ? 'selected' : ''} aria-pressed={mode === 'file'} onClick={() => { setMode('file'); setError(null); }}>Choose .sav</button>
              <button type="button" className={mode === 'paste' ? 'selected' : ''} aria-pressed={mode === 'paste'} onClick={() => { setMode('paste'); setError(null); }}>Paste string</button>
            </div>

            {mode === 'folder' ? <div className="save-directory-picker">
              <button className="secondary-button choose-directory-button" type="button" onClick={() => void chooseDirectory()} disabled={busy}>
                <FolderOpen size={15} />{directory ? 'Change save directory' : 'Choose save directory'}
              </button>
              {directory && <div className="directory-path" title={directory}>{directory}</div>}
              {directory && <button className="refresh-list-button" type="button" onClick={() => void refreshFileList()} disabled={busy}>
                <RefreshCw size={13} className={busy ? 'spinning' : ''} />Refresh file list
              </button>}
              {saveFiles.length > 0 && <>
                <label className="field-label" htmlFor="save-file-select">CHARACTER SAVE</label>
                <span className="select-wrap save-file-select-wrap">
                  <select id="save-file-select" value={fileName} onChange={(event) => {
                    setFileName(event.target.value);
                    onLocationChange({ directory, fileName: event.target.value });
                  }} disabled={busy}>
                    {saveFiles.map((file) => <option key={file.name} value={file.name}>{file.name} · {formatBytes(file.sizeBytes)}</option>)}
                  </select>
                  <span className="select-caret" aria-hidden="true">⌄</span>
                </span>
                <button className="primary-button decode-button" type="button" onClick={() => void loadSelectedSave()} disabled={busy || !fileName}>
                  {busy ? 'Reading save…' : 'Import selected save'}
                </button>
              </>}
            </div> : mode === 'file' ? <label className="save-file-picker">
              <FileUp size={21} />
              <strong>Choose a local save file</strong>
              <span>.sav files up to 16 MiB</span>
              <input type="file" accept=".sav,application/octet-stream" onChange={(event) => void handleFileChange(event)} disabled={busy} />
            </label> : <>
              <label className="field-label" htmlFor="save-string-input">EXPORTED SAVE STRING</label>
              <textarea
                id="save-string-input"
                className="save-string-input"
                value={saveString}
                onChange={(event) => setSaveString(event.target.value)}
                placeholder="Paste the exported Base64 save string"
                spellCheck={false}
                disabled={busy}
              />
              <button className="primary-button decode-button" type="button" onClick={handlePasteSubmit} disabled={busy || !saveString.trim()}>
                {busy ? 'Decoding…' : 'Decode save'}
              </button>
            </>}
          </>}

          {busy && <p className="import-status" role="status">Reading save locally…</p>}
          {error && <p className="import-error" role="alert"><AlertTriangle size={15} />{error}</p>}
          {profileMessage && <p className="profile-message" role="status">{profileMessage}</p>}

          {decoded && <div className="decoded-save" aria-live="polite">
            <div className="decoded-save-heading"><span className="decoded-check"><Check size={15} /></span><div><strong>{decoded.name || 'Unnamed character'}</strong><span>{decoded.mode || 'Unknown mode'} · Save version {decoded.version}</span></div></div>
            <dl className="save-facts">
              <div><dt>SAVED</dt><dd>{decoded.savedAt}</dd></div>
              <div><dt>TOTAL LEVEL</dt><dd>{decoded.totalLevel.toLocaleString('en-US')}</dd></div>
              <div><dt>SKILLS</dt><dd>{decoded.skills.length}</dd></div>
              <div><dt>BANK ITEMS</dt><dd>{Object.keys(decoded.bank.items).length}</dd></div>
              <div><dt>GOLD PIECES</dt><dd>{formatInteger(decoded.gp)}</dd></div>
              <div><dt>BANK STACKS</dt><dd>{decoded.bank.stacks}</dd></div>
            </dl>
            {woodcutting && <p className="woodcutting-found">Woodcutting: level {woodcutting.level ?? levelForXp(woodcutting.xp)} · {woodcutting.xp.toLocaleString('en-US')} XP</p>}
            {(decoded.unknownComponents.length > 0 || decoded.bank.unknownTrailingBytes > 0) && <p className="import-warning"><AlertTriangle size={14} />Some save components remain unparsed. They are not used in calculations.</p>}
            <details className="import-skills">
              <summary>Skills ({decoded.skills.length})</summary>
              <ul>{decoded.skills.map((skill) => <li key={skill.name}><span>{skill.name}</span><span>Lv. {skill.level ?? levelForXp(skill.xp)} · {skill.xp.toLocaleString('en-US')} XP</span></li>)}</ul>
            </details>
            <div className="dialog-actions">
              <button className="secondary-button" type="button" onClick={onClose}>Close</button>
              <button className="secondary-button" type="button" onClick={() => void persistDecodedProfile()} disabled={profileBusy}><Save size={14} />{profileBusy ? 'Saving…' : 'Save profile'}</button>
              <button className="primary-button" type="button" disabled={!woodcutting} onClick={() => woodcutting && onUseWoodcuttingXp(woodcutting.xp)}>Use Woodcutting XP</button>
            </div>
          </div>}
          <p className="dialog-privacy">Read-only import. The source save is never modified. The directory setting is stored locally; decoded character data is session-only.</p>
        </>}
      </section>
    </div>
  );
}

export default SaveImportDialog;