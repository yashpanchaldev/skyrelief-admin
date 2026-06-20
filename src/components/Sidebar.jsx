'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard, Users, UserCircle, ShieldCheck, Heart, Wallet,
  FileText, BarChart3, Bell, Settings, Shield, Speaker, CheckSquare, X
} from 'lucide-react';
const mainNav = [
  { name: 'Dashboard', path: '/', icon: LayoutDashboard },
  { name: 'Insurance Management', path: '/insurance', icon: ShieldCheck },
  { name: 'Agents', path: '/agents', icon: UserCircle },
  { name: 'Members', path: '/members', icon: Users },
  { name: 'Marriage Programs', path: '/marriages', icon: Heart },
  { name: 'Payment Campaigns', path: '/payments', icon: Wallet },
];

export default function Sidebar({ isOpen, onClose }) {
  const pathname = usePathname();

  return (
    <aside className={`sidebar-aside ${isOpen ? 'sidebar-open' : ''}`}>

      {/* Logo */}
      <div style={{
        padding: '20px 20px 18px',
        display: 'flex', alignItems: 'center', gap: '12px',
        borderBottom: '1px solid var(--border)',
        justifyContent: 'space-between',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div style={{
            width: '40px', height: '40px', borderRadius: '12px', flexShrink: 0,
            background: '#ffffff',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            boxShadow: '0 2px 8px rgba(0, 0, 0, 0.05)',
            border: '1px solid #e2e8f0',
            overflow: 'hidden'
          }}>
            <img src="/logo-icon.png" alt="SkyRelief Icon" style={{ width: '85%', height: '85%', objectFit: 'contain', background: 'transparent' }} />
          </div>
          <div>
            <div style={{ fontSize: '1rem', fontWeight: '800', color: '#0f172a', letterSpacing: '-0.02em' }}>SkyRelief</div>
            <div style={{ fontSize: '0.68rem', color: '#64748b', fontWeight: '600', letterSpacing: '0.05em', textTransform: 'uppercase', marginTop: '1px' }}>Admin ERP</div>
          </div>
        </div>
        <button onClick={onClose} className="sidebar-close-btn" style={{
          display: 'none',
          padding: '4px',
          borderRadius: '8px',
          color: '#64748b',
        }}>
          <X size={20} />
        </button>
      </div>


      {/* Nav */}
      <nav style={{ flex: 1, overflowY: 'auto', padding: '16px 12px 12px', scrollbarWidth: 'none', msOverflowStyle: 'none' }}>



        <ul style={{ marginBottom: '24px' }}>
          {mainNav.map(({ name, path, icon: Icon }) => {
            const active = pathname === path;
            return (
              <li key={name}>
                <Link href={path} style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '10px',
                  padding: '9px 12px',
                  borderRadius: '10px',
                  marginBottom: '2px',
                  fontWeight: active ? '700' : '500',
                  fontSize: '0.875rem',
                  textDecoration: 'none',
                  color: active ? 'white' : '#475569',
                  background: active ? 'var(--primary-gradient)' : 'transparent',
                  boxShadow: active ? '0 4px 14px rgba(99, 102, 241, 0.35)' : 'none',
                  transition: 'all 0.18s ease',
                }}
                  onMouseEnter={e => { if (!active) { e.currentTarget.style.background = 'var(--primary-light)'; e.currentTarget.style.color = 'var(--primary)'; }}}
                  onMouseLeave={e => { if (!active) { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = '#475569'; }}}
                >
                  <Icon size={18} strokeWidth={active ? 2.5 : 2} style={{ flexShrink: 0 }} />
                  {name}
                </Link>
              </li>
            );
          })}
        </ul>


      </nav>


    </aside>
  );
}
