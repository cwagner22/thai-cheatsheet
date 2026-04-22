import { useEffect, useState } from 'react';
import { ConsonantsTab } from './tabs/ConsonantsTab';
import { VowelsTab } from './tabs/VowelsTab';
import { TonesTab } from './tabs/TonesTab';
import { ClustersTab } from './tabs/ClustersTab';
import { TypingTab } from './tabs/TypingTab';
import { WritingTab } from './tabs/WritingTab';
import { IPATab } from './tabs/IPATab';

export type TabId = 'consonants' | 'vowels' | 'tones' | 'reading' | 'ipa' | 'typing' | 'writing';
export type Font = 'serif' | 'sans';

const TABS: { id: TabId; label: string; icon: string }[] = [
  { id: 'consonants', label: 'Consonants', icon: 'ก' },
  { id: 'vowels',     label: 'Vowels',     icon: 'อา' },
  { id: 'tones',      label: 'Tones',      icon: '🎵' },
  { id: 'reading',    label: 'Reading',    icon: '📖' },
  { id: 'ipa',        label: 'IPA',        icon: 'ɪ' },
  { id: 'typing',     label: 'Typing',     icon: '⌨️' },
  { id: 'writing',    label: 'Writing',    icon: '✏️' },
];

export function App() {
  const [tab, setTab] = useState<TabId>('consonants');
  const [font, setFont] = useState<Font>('serif');

  useEffect(() => {
    document.body.classList.toggle('sans', font === 'sans');
  }, [font]);

  return (
    <>
      <h1>Thai Cheat Sheet</h1>

      <div className="font-toggle">
        <span style={{ fontSize: '0.85rem', fontWeight: 600, color: '#555' }}>Font:</span>
        <button className={`toggle-btn ${font === 'serif' ? 'active' : ''}`} onClick={() => setFont('serif')}>Traditional (Serif)</button>
        <button className={`toggle-btn ${font === 'sans' ? 'active' : ''}`} onClick={() => setFont('sans')}>Modern (Sans)</button>
      </div>

      <div className="tab-bar">
        {TABS.map(t => {
          const isThai = t.icon === 'ก' || t.icon === 'อา';
          return (
            <button
              key={t.id}
              className={`tab-btn ${tab === t.id ? 'active' : ''}`}
              onClick={() => setTab(t.id)}
            >
              <span
                className="tab-icon"
                style={isThai ? { fontFamily: 'var(--thai-font)' } : undefined}
                aria-hidden
              >
                {t.icon}
              </span>
              {t.label}
            </button>
          );
        })}
      </div>

      {tab === 'consonants' && <ConsonantsTab />}
      {tab === 'vowels' && <VowelsTab />}
      {tab === 'tones' && <TonesTab />}
      {tab === 'reading' && <ClustersTab />}
      {tab === 'ipa' && <IPATab />}
      {tab === 'typing' && <TypingTab />}
      {tab === 'writing' && <WritingTab />}

      <p className="footer">Thai Cheat Sheet · built for quick reference</p>
    </>
  );
}
