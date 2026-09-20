import { useEffect, useState, type CSSProperties } from 'react';
import { ConsonantsTab } from './tabs/ConsonantsTab';
import { VowelsTab } from './tabs/VowelsTab';
import { TonesTab } from './tabs/TonesTab';
import { ClustersTab } from './tabs/ClustersTab';
import { TypingTab } from './tabs/TypingTab';
import { WritingTab } from './tabs/WritingTab';
import { IPATab } from './tabs/IPATab';
import { SpeakingTab } from './tabs/SpeakingTab';
import { readRoute, writeRoute } from './lib/route';

export type TabId = 'consonants' | 'vowels' | 'tones' | 'reading' | 'ipa' | 'speaking' | 'typing' | 'writing';
export type Font = 'serif' | 'sans';

interface Tab { id: TabId; label: string; icon: string; thaiIcon?: boolean }

/** The practice tabs come first and larger: they are what the app is for.
 *  The rest is the reference a learner reaches for while practising. */
const PRACTISE: Tab[] = [
  { id: 'speaking', label: 'Speaking', icon: '◎' },
  { id: 'typing',   label: 'Typing',   icon: '⌨' },
  { id: 'writing',  label: 'Writing',  icon: '✎' },
];
const REFERENCE: Tab[] = [
  { id: 'consonants', label: 'Consonants', icon: 'ก', thaiIcon: true },
  { id: 'vowels',     label: 'Vowels',     icon: 'อา', thaiIcon: true },
  { id: 'tones',      label: 'Tones',      icon: '♪' },
  { id: 'reading',    label: 'Reading',    icon: '▤' },
  { id: 'ipa',        label: 'IPA',        icon: 'ɪ' },
];
const TABS = [...PRACTISE, ...REFERENCE];

/** Item pitch of each group, in px: button height plus the 2px gap. */
const PITCH = { practise: 48, reference: 42 } as const;

function NavGroup({ title, tabs, kind, active, onPick }: {
  title: string;
  tabs: Tab[];
  kind: keyof typeof PITCH;
  active: TabId;
  onPick: (id: TabId) => void;
}) {
  const index = tabs.findIndex(t => t.id === active);
  return (
    <>
      <div className="nav-group">{title}</div>
      <div className={`nav-items ${kind}`}>
        <span
          className={`nav-marker ${index < 0 ? 'hidden' : ''}`}
          style={{ '--y': `${Math.max(0, index) * PITCH[kind]}px` } as CSSProperties}
          aria-hidden
        />
        {tabs.map(t => (
          <button
            key={t.id}
            type="button"
            className={active === t.id ? 'active' : ''}
            onClick={() => onPick(t.id)}
            aria-current={active === t.id ? 'page' : undefined}
          >
            <span className="nav-icon" style={t.thaiIcon ? { fontFamily: 'var(--thai-font)' } : undefined} aria-hidden>
              {t.icon}
            </span>
            {t.label}
          </button>
        ))}
      </div>
    </>
  );
}

const isTab = (id: string): id is TabId => TABS.some(t => t.id === id);

export function App() {
  const [tab, setTab] = useState<TabId>(() => {
    const { tab } = readRoute();
    return isTab(tab) ? tab : 'consonants';
  });
  const [font, setFont] = useState<Font>('serif');

  useEffect(() => {
    if (readRoute().tab !== tab) writeRoute(tab);
    const onHash = () => {
      const { tab: next } = readRoute();
      if (isTab(next)) setTab(next);
    };
    window.addEventListener('hashchange', onHash);
    return () => window.removeEventListener('hashchange', onHash);
  }, [tab]);

  useEffect(() => {
    document.body.classList.toggle('sans', font === 'sans');
  }, [font]);

  const current = TABS.find(t => t.id === tab)!;
  const section = PRACTISE.some(t => t.id === tab) ? 'Practise' : 'Reference';

  return (
    <div className="shell">
      <nav className="side" aria-label="Sections">
        <div className="brand"><span className="brand-mark">ก</span>Thai Lab</div>
        <NavGroup title="Practise" tabs={PRACTISE} kind="practise" active={tab} onPick={setTab} />
        <NavGroup title="Reference" tabs={REFERENCE} kind="reference" active={tab} onPick={setTab} />
        <div className="side-foot">
          <div className="nav-group">Thai letters</div>
          <div className="seg" role="group" aria-label="Thai font">
            <button type="button" className={font === 'serif' ? 'active' : ''} onClick={() => setFont('serif')}>
              <span className="seg-glyph" style={{ fontFamily: "'Noto Serif Thai', serif" }}>ก</span>Serif
            </button>
            <button type="button" className={font === 'sans' ? 'active' : ''} onClick={() => setFont('sans')}>
              <span className="seg-glyph sans">ก</span>Sans
            </button>
          </div>
        </div>
      </nav>

      <main className="page" key={tab}>
        <p className="crumb">{section} · <b>{current.label}</b></p>
        {tab === 'consonants' && <ConsonantsTab />}
        {tab === 'vowels' && <VowelsTab />}
        {tab === 'tones' && <TonesTab />}
        {tab === 'reading' && <ClustersTab />}
        {tab === 'ipa' && <IPATab />}
        {tab === 'speaking' && <SpeakingTab />}
        {tab === 'typing' && <TypingTab />}
        {tab === 'writing' && <WritingTab />}

        <p className="footer">Thai Lab · speak, type, write — and look it up</p>
      </main>
    </div>
  );
}
