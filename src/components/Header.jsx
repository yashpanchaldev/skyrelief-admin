'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Search, Bell, Moon, Sun, ChevronDown, Globe, LogOut, User, Key, Menu } from 'lucide-react';
import { getAuth, clearAuth, showToast } from '@/lib/api';
import { ConfirmModal } from '@/components/Modal';

export default function Header({ onMenuClick }) {
  const router = useRouter();
  const [user, setUser] = useState({ full_name: 'System Admin', email: 'admin@skyrelief.com' });
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);

  useEffect(() => {
    const auth = getAuth();
    if (auth?.user) {
      setUser(auth.user);
    }

    const handleUserUpdate = () => {
      const freshAuth = getAuth();
      if (freshAuth?.user) {
        setUser(freshAuth.user);
      }
    };
    window.addEventListener('sky-user-updated', handleUserUpdate);
    return () => {
      window.removeEventListener('sky-user-updated', handleUserUpdate);
    };
  }, []);

  const handleLogout = () => {
    clearAuth();
    showToast('Logged out successfully', 'success');
    router.push('/login');
  };

  const [isDark, setIsDark] = useState(false);

  useEffect(() => {
    const savedTheme = localStorage.getItem('sky_theme');
    if (savedTheme === 'dark') {
      setIsDark(true);
      document.documentElement.classList.add('dark');
    } else {
      setIsDark(false);
      document.documentElement.classList.remove('dark');
    }
  }, []);

  const toggleTheme = () => {
    if (isDark) {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('sky_theme', 'light');
      setIsDark(false);
    } else {
      document.documentElement.classList.add('dark');
      localStorage.setItem('sky_theme', 'dark');
      setIsDark(true);
    }
  };

  const getInitials = (name) => {
    if (!name) return 'SA';
    return name
      .split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  const getSafeProfileImage = (profilePath) => {
    if (!profilePath) return null;
    let path = String(profilePath).trim();
    if (path.startsWith('http')) return path;
    if (path.startsWith('/uploads/uploads/')) {
      path = path.replace('/uploads/uploads/', '/uploads/');
    }
    if (!path.startsWith('/')) {
      path = '/' + path;
    }
    const BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'https://api.skyrelief.org';
    return BASE_URL + path;
  };

  const profileImageUrl = getSafeProfileImage(user?.profile);

  return (
    <header style={{
      height: 'var(--header-height)',
      position: 'sticky',
      top: 0,
      zIndex: 90,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      padding: '0 28px',
      background: 'rgba(255,255,255,0.92)',
      backdropFilter: 'blur(20px)',
      WebkitBackdropFilter: 'blur(20px)',
      borderBottom: '1.5px solid #bee3f8',
      boxShadow: '0 2px 16px rgba(14,165,233,0.1)',
      gap: '12px',
    }}>

      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
        {/* Hamburger Menu Button */}
        <button onClick={onMenuClick} className="header-menu-btn">
          <Menu size={20} />
        </button>
      </div>

      {/* Right side */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>

        {/* Moon / Sun */}
        <button onClick={toggleTheme} className="header-theme-btn" style={{
          width: '36px', height: '36px', borderRadius: '9px',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          color: '#64748b', border: 'none', background: 'transparent', transition: 'background 0.15s',
          cursor: 'pointer',
        }}
          onMouseEnter={e => e.currentTarget.style.background = '#e0f2fe'}
          onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
        >
          {isDark ? <Sun size={17} strokeWidth={2} /> : <Moon size={17} strokeWidth={2} />}
        </button>


        {/* Bell */}
        <button className="header-bell-btn" style={{
          width: '36px', height: '36px', borderRadius: '9px',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          color: '#64748b', border: 'none', background: 'transparent',
          position: 'relative', transition: 'background 0.15s',
        }}
          onMouseEnter={e => e.currentTarget.style.background = '#e0f2fe'}
          onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
        >
          <Bell size={17} strokeWidth={2} />
          <span style={{
            position: 'absolute', top: '7px', right: '7px',
            width: '8px', height: '8px', borderRadius: '50%',
            background: '#ef4444', border: '2px solid white',
          }} />
        </button>

        {/* Divider */}
        <div className="header-divider" style={{ width: '1px', height: '28px', background: '#bee3f8', margin: '0 8px' }} />

        {/* User Dropdown */}
        <div style={{ position: 'relative' }}>
          <div style={{
            display: 'flex', alignItems: 'center', gap: '10px',
            padding: '6px 10px', borderRadius: '12px',
            cursor: 'pointer', transition: 'background 0.15s',
            border: '1.5px solid transparent',
            background: dropdownOpen ? '#f0f9ff' : 'transparent',
            borderColor: dropdownOpen ? '#bee3f8' : 'transparent',
          }}
            onClick={() => router.push('/settings?profile=true')}
            onMouseEnter={e => { if(!dropdownOpen) { e.currentTarget.style.background = '#f0f9ff'; e.currentTarget.style.borderColor = '#bee3f8'; } }}
            onMouseLeave={e => { if(!dropdownOpen) { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.borderColor = 'transparent'; } }}
          >
            {profileImageUrl ? (
              <img
                src={profileImageUrl}
                alt="Profile"
                style={{
                  width: '36px', height: '36px', borderRadius: '50%', flexShrink: 0,
                  objectFit: 'cover',
                  boxShadow: '0 3px 10px rgba(14,165,233,0.35)',
                  border: '1.5px solid #bee3f8'
                }}
                onError={(e) => {
                  e.target.style.display = 'none';
                  e.target.nextSibling.style.display = 'flex';
                }}
              />
            ) : null}
            <div style={{
              display: profileImageUrl ? 'none' : 'flex',
              width: '36px', height: '36px', borderRadius: '50%', flexShrink: 0,
              background: 'linear-gradient(135deg, #0ea5e9, #6366f1)',
              color: 'white', alignItems: 'center', justifyContent: 'center',
              fontWeight: '800', fontSize: '0.78rem', letterSpacing: '0.03em',
              boxShadow: '0 3px 10px rgba(14,165,233,0.35)',
            }}>
              {getInitials(user.full_name)}
            </div>
            <div className="header-user-text">
              <div style={{ fontSize: '0.85rem', fontWeight: '700', color: '#0f172a', lineHeight: 1.2 }}>{user.full_name}</div>
              <div style={{ fontSize: '0.72rem', color: '#0ea5e9', fontWeight: '600' }}>{user.email}</div>
            </div>
            <ChevronDown className="header-user-chevron" size={14} strokeWidth={2.5} style={{ color: '#94a3b8', flexShrink: 0 }} />
          </div>

          {/* Dropdown Menu */}
          {dropdownOpen && (
            <div style={{
              position: 'absolute',
              right: 0,
              top: '52px',
              background: 'white',
              border: '1.5px solid #bee3f8',
              borderRadius: '14px',
              boxShadow: '0 12px 32px rgba(14, 165, 233, 0.15)',
              zIndex: 100,
              width: '200px',
              padding: '6px',
              animation: 'slideUp 0.2s cubic-bezier(0.16, 1, 0.3, 1) forwards',
            }}>
              <button
                onClick={() => { setDropdownOpen(false); router.push('/settings?profile=true'); }}
                style={{
                  display: 'flex', alignItems: 'center', gap: '10px',
                  width: '100%', padding: '10px 14px', borderRadius: '8px',
                  fontSize: '0.82rem', fontWeight: '600', color: '#334155',
                  transition: 'background 0.15s',
                }}
                onMouseEnter={e => e.currentTarget.style.background = '#f0f9ff'}
                onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
              >
                <User size={15} /> Settings Profile
              </button>
              
              <div style={{ height: '1.5px', background: '#bee3f8', margin: '4px 0' }} />

              <button
                onClick={() => { setDropdownOpen(false); setShowLogoutConfirm(true); }}
                style={{
                  display: 'flex', alignItems: 'center', gap: '10px',
                  width: '100%', padding: '10px 14px', borderRadius: '8px',
                  fontSize: '0.82rem', fontWeight: '600', color: '#ef4444',
                  transition: 'background 0.15s',
                }}
                onMouseEnter={e => e.currentTarget.style.background = '#fee2e2'}
                onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
              >
                <LogOut size={15} /> Sign Out
              </button>
            </div>
          )}
        </div>
      </div>

      <ConfirmModal
        open={showLogoutConfirm}
        onClose={() => setShowLogoutConfirm(false)}
        onConfirm={handleLogout}
        title="Sign Out"
        message="Are you sure you want to sign out of SkyRelief Admin ERP?"
        danger={true}
      />
    </header>
  );
}
