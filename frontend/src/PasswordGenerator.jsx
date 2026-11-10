import { useMemo, useState } from 'react';
import {
  Check, Clipboard, Copy, Dices, KeyRound, RefreshCw, TextCursorInput, X,
} from 'lucide-react';

const PASSWORD_CHARACTERS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
const SPECIAL_CHARACTERS = '!@#$%^&*()_+~|}{[]:;?><,./-=';
const SIMILAR_CHARACTERS = new Set(['I', 'l', '1', 'O', '0']);
const WORDS = [
  'apfel', 'atlas', 'blume', 'brise', 'canyon', 'donner', 'eiche', 'fenster',
  'feuer', 'fluss', 'garten', 'gipfel', 'hafen', 'himmel', 'insel', 'kaffee',
  'kiesel', 'komet', 'lampe', 'laterne', 'libelle', 'mond', 'morgen', 'nebel',
  'ozean', 'planet', 'regen', 'ruder', 'schnee', 'sonne', 'steg', 'tastatur',
  'ufer', 'welle', 'wolke', 'ziegel', 'zeit', 'zitrone', 'adler', 'anker',
  'bambus', 'delta', 'echo', 'feder', 'funke', 'horizont', 'korn', 'kompass',
  'leuchtturm', 'nordwind', 'pfad', 'quelle', 'saphir', 'segel', 'stern', 'vulkan',
];

const randomIndex = (maximum) => {
  const limit = Math.floor(0x100000000 / maximum) * maximum;
  const values = new Uint32Array(1);
  do {
    window.crypto.getRandomValues(values);
  } while (values[0] >= limit);
  return values[0] % maximum;
};

const generateValue = ({ mode, passwordLength, wordCount, separator, includeSpecial, avoidSimilar }) => {
  if (mode === 'passphrase') {
    return Array.from({ length: wordCount }, () => WORDS[randomIndex(WORDS.length)]).join(separator);
  }

  let characters = includeSpecial ? PASSWORD_CHARACTERS + SPECIAL_CHARACTERS : PASSWORD_CHARACTERS;
  if (avoidSimilar) {
    characters = [...characters].filter((character) => !SIMILAR_CHARACTERS.has(character)).join('');
  }
  return Array.from({ length: passwordLength }, () => characters[randomIndex(characters.length)]).join('');
};

const getStrength = ({ mode, value, passwordLength, includeSpecial }) => {
  if (mode === 'passphrase') {
    return { label: 'Sehr stark', color: 'good', width: 100 };
  }
  if (passwordLength < 12) return { label: 'Schwach', color: 'weak', width: 30 };
  if (passwordLength < 16 || !includeSpecial) return { label: 'Mittel', color: 'medium', width: 65 };
  return { label: value.length >= 16 ? 'Sehr stark' : 'Stark', color: 'good', width: 100 };
};

function PasswordGenerator({ isOpen, onClose, onUse, inline = false }) {
  const [mode, setMode] = useState('password');
  const [passwordLength, setPasswordLength] = useState(12);
  const [wordCount, setWordCount] = useState(4);
  const [separator, setSeparator] = useState('-');
  const [includeSpecial, setIncludeSpecial] = useState(false);
  const [avoidSimilar, setAvoidSimilar] = useState(false);
  const [generationSeed, setGenerationSeed] = useState(0);
  const [copied, setCopied] = useState(false);
  const [copyError, setCopyError] = useState('');

  const settings = useMemo(() => ({
    mode, passwordLength, wordCount, separator, includeSpecial, avoidSimilar,
  }), [mode, passwordLength, wordCount, separator, includeSpecial, avoidSimilar]);

  const generatedValue = useMemo(
    () => (isOpen ? generateValue({ ...settings, generationSeed }) : ''),
    [isOpen, settings, generationSeed],
  );

  const regenerate = () => {
    setGenerationSeed((current) => current + 1);
    setCopied(false);
    setCopyError('');
  };

  if (!isOpen) return null;

  const strength = getStrength({ ...settings, value: generatedValue });

  const copyValue = async () => {
    try {
      await navigator.clipboard.writeText(generatedValue);
      setCopied(true);
      setCopyError('');
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      setCopyError('Kopieren wurde vom Browser blockiert.');
    }
  };

  const content = (
    <>
      <div className="generator-header">
        <div><h2><KeyRound size={18} /> Generator</h2></div>
        <button className="modal-close" type="button" onClick={onClose} aria-label="Generator schließen"><X size={18} /></button>
      </div>
      <div className="generator-output">
        <code>{generatedValue}</code>
        <button className="generator-refresh" type="button" onClick={regenerate} aria-label="Neu generieren"><RefreshCw size={17} /></button>
      </div>
      <div className="generator-strength">
        <div><span>Stärke</span><strong className={strength.color}>{strength.label}</strong></div>
        <div className="generator-strength-track"><span className={strength.color} style={{ width: `${strength.width}%` }} /></div>
      </div>
      <div className="generator-mode-toggle">
        <button className={mode === 'password' ? 'active' : ''} type="button" onClick={() => setMode('password')}><Dices size={16} /> Passwort</button>
        <button className={mode === 'passphrase' ? 'active' : ''} type="button" onClick={() => setMode('passphrase')}><TextCursorInput size={16} /> Passphrase</button>
      </div>
      {mode === 'password' ? (
        <div className="generator-options">
          <label><span className="generator-option-title">LÄNGE: {passwordLength}</span><div className="generator-quick-options">{[8, 12, 16, 24].map((length) => <button className={passwordLength === length ? 'active' : ''} key={length} type="button" onClick={() => setPasswordLength(length)}>{length}</button>)}</div></label>
          <div className="generator-character-options"><span className="generator-option-title">ZEICHEN</span><div><button className={!includeSpecial ? 'active' : ''} type="button" onClick={() => setIncludeSpecial(false)}>A-Z, 0-9</button><button className={includeSpecial ? 'active' : ''} type="button" onClick={() => setIncludeSpecial(true)}>+ ! @ # $ % ^ &amp; *</button></div></div>
          <label className="generator-check"><input type="checkbox" checked={avoidSimilar} onChange={(event) => setAvoidSimilar(event.target.checked)} /> Ähnliche Zeichen vermeiden (I, l, 1, O, 0)</label>
        </div>
      ) : (
        <div className="generator-options">
          <label><span className="generator-option-title">WÖRTER: {wordCount}</span><div className="generator-quick-options">{[3, 4, 5].map((count) => <button className={wordCount === count ? 'active' : ''} key={count} type="button" onClick={() => setWordCount(count)}>{count}</button>)}</div></label>
          <label>Trennzeichen<select value={separator} onChange={(event) => setSeparator(event.target.value)}><option value="-">Bindestrich (-)</option><option value="_">Unterstrich (_)</option><option value=" ">Leerzeichen</option></select></label>
        </div>
      )}
      {copyError && <p className="generator-error">{copyError}</p>}
      <div className="generator-actions">
        {!inline && <button className="primary-button generator-copy-button" type="button" onClick={copyValue}>{copied ? <Check size={17} /> : <Copy size={17} />} {copied ? 'Kopiert' : 'In Zwischenablage kopieren'}</button>}
        {onUse && <button className="primary-button generator-copy-button" type="button" onClick={() => onUse(generatedValue)}><KeyRound size={16} /> Verwenden</button>}
      </div>
      {!inline && <p className="generator-local-note"><Clipboard size={13} /> Generierung erfolgt ausschließlich lokal im Browser.</p>}
    </>
  );

  return <div className={`generator-overlay ${inline ? 'generator-inline-overlay' : ''}`}><section className="generator-modal">{content}</section></div>;
}

export default PasswordGenerator;
