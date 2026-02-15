import { TabView } from '../../types';

interface NavigationProps {
  activeTab: TabView;
  onTabChange: (tab: TabView) => void;
}

const TABS: { id: TabView; label: string; icon: string }[] = [
  { id: 'dashboard', label: 'Dashboard', icon: '◉' },
  { id: 'cameras', label: 'Cameras', icon: '◎' },
  { id: 'workflow', label: 'Workflow Builder', icon: '⬡' },
  { id: 'analytics', label: 'Analytics', icon: '◈' },
];

export default function Navigation({ activeTab, onTabChange }: NavigationProps) {
  return (
    <nav className="flex gap-1">
      {TABS.map((tab) => (
        <button
          key={tab.id}
          onClick={() => onTabChange(tab.id)}
          className={`px-4 py-2 text-xs font-heading font-semibold rounded-md transition-smooth ${
            activeTab === tab.id
              ? 'bg-rl-cyan/10 text-rl-cyan border border-rl-cyan/30'
              : 'text-gray-500 hover:text-gray-300 border border-transparent hover:border-rl-border'
          }`}
        >
          <span className="mr-1.5">{tab.icon}</span>
          {tab.label}
        </button>
      ))}
    </nav>
  );
}
