import { useEffect, useState } from 'react';
import { ConsonantsTab } from './tabs/ConsonantsTab';
import { VowelsTab } from './tabs/VowelsTab';
import { TonesTab } from './tabs/TonesTab';
import { ClustersTab } from './tabs/ClustersTab';
import { TypingTab } from './tabs/TypingTab';
import { WritingTab } from './tabs/WritingTab';
import { QuirksTab } from './tabs/QuirksTab';

export type TabId = 'consonants' | 'vowels' | 'tones' | 'clusters' | 'typing' | 'writing' | 'quirks';
export type Font = 'serif' | 'sans';

const TABS: { id: TabId; label: string }[] = [
  { id: 'consonants', label: 'Consonants' },
  { id: 'vowels', label: 'Vowels' },
  { id: 'tones', label: 'Tones' },
  { id: 'clusters', label: 'Clusters' },
  { id: 'typing', label: 'Typing' },
  { id: 'writing', label: 'Writing' },
  { id: 'quirks', label: 'Quirks' },
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
      <p className="subtitle">Consonants, Vowels &amp; Tone Rules</p>

      <div className="font-toggle">
        <span style={{ fontSize: '0.85rem', fontWeight: 600, color: '#555' }}>Font:</span>
        <button className={`toggle-btn ${font === 'serif' ? 'active' : ''}`} onClick={() => setFont('serif')}>Traditional (Serif)</button>
        <button className={`toggle-btn ${font === 'sans' ? 'active' : ''}`} onClick={() => setFont('sans')}>Modern (Sans)</button>
      </div>

      <div className="tab-bar">
        {TABS.map(t => (
          <button
            key={t.id}
            className={`tab-btn ${tab === t.id ? 'active' : ''}`}
            onClick={() => setTab(t.id)}
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab === 'consonants' && <ConsonantsTab />}
      {tab === 'vowels' && <VowelsTab />}
      {tab === 'tones' && <TonesTab />}
      {tab === 'clusters' && <ClustersTab />}
      {tab === 'typing' && <TypingTab />}
      {tab === 'writing' && <WritingTab />}
      {tab === 'quirks' && <QuirksTab />}

      <p className="footer">Thai Cheat Sheet · built for quick reference</p>
    </>
  );
}
