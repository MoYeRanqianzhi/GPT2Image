import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Settings,
  PlusCircle,
  Menu,
  X,
  Sun,
  Moon,
} from 'lucide-react';
import { useThemeStore } from '../lib/theme';

interface HeaderProps {
  activeTab?: string;
  showNewChat?: boolean;
}

const TABS = [
  { id: 'create', label: 'Create' },
  { id: 'gallery', label: 'Gallery' },
  { id: 'waterfall', label: 'Waterfall' },
  { id: 'history', label: 'History' },
];

export function Header({ activeTab = 'create', showNewChat = false }: HeaderProps) {
  const navigate = useNavigate();
  const darkMode = useThemeStore((s) => s.isDark);
  const toggle = useThemeStore((s) => s.toggle);
  const [menuOpen, setMenuOpen] = useState(false);
  const headerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!menuOpen) return;
    function handleDocClick(e: MouseEvent) {
      if (headerRef.current && !headerRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    }
    document.addEventListener('click', handleDocClick);
    return () => document.removeEventListener('click', handleDocClick);
  }, [menuOpen]);

  function handleTab(tabId: string) {
    navigate(`/${tabId}`);
    setMenuOpen(false);
  }

  function handleThemeToggle(e: React.MouseEvent<HTMLButtonElement>) {
    const rect = e.currentTarget.getBoundingClientRect();
    const cx = rect.left + rect.width / 2;
    const cy = rect.top + rect.height / 2;
    toggle(cx, cy);
  }

  return (
    <div className="header" ref={headerRef}>
      <div className="header-logo" onClick={() => navigate('/create')} style={{ cursor: 'pointer' }}>
        <img src="assets/icon.png" alt="GPT2IMAGE" className="header-logo-icon" />
        <span className="header-logo-text">GPT2IMAGE</span>
      </div>
      <div className="header-actions">
        {showNewChat && (
          <button className="header-btn" onClick={() => handleTab('create')}>
            <PlusCircle size={16} />
            <span className="header-btn-label">New</span>
          </button>
        )}
        <div className="header-tabs">
          {TABS.map((t) => (
            <div
              key={t.id}
              className={`tab${t.id === activeTab ? ' active' : ''}`}
              onClick={() => handleTab(t.id)}
            >
              {t.label}
            </div>
          ))}
        </div>
        <button
          className="header-icon-btn"
          title="Menu"
          onClick={(e) => {
            e.stopPropagation();
            setMenuOpen((v) => !v);
          }}
        >
          {menuOpen ? <X size={20} /> : <Menu size={20} />}
        </button>
        <button
          className="header-icon-btn"
          title={darkMode ? 'Light mode' : 'Dark mode'}
          onClick={handleThemeToggle}
        >
          {darkMode ? <Sun size={18} /> : <Moon size={18} />}
        </button>
        <button className="header-icon-btn" onClick={() => navigate('/settings')}>
          <Settings size={18} />
        </button>
      </div>
      <div className={`mobile-menu${menuOpen ? ' open' : ''}`}>
        {TABS.map((t) => (
          <div
            key={t.id}
            className={`mobile-menu-item${t.id === activeTab ? ' active' : ''}`}
            onClick={() => handleTab(t.id)}
          >
            {t.label}
          </div>
        ))}
      </div>
    </div>
  );
}
