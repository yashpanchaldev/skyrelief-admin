'use client';
import { useState, useEffect } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import Sidebar from "@/components/Sidebar";
import Header from "@/components/Header";
import ToastContainer from "@/components/Toast";
import { getAuth } from '@/lib/api';  
import { Hammer, ArrowLeft } from 'lucide-react';

export default function ClientLayout({ children }) {
  const pathname = usePathname();
  const router = useRouter();
  const [mounted, setMounted] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  const publicPaths = ['/login', '/privacy-policy', '/delete-account'];

  useEffect(() => {
    setMounted(true);
    const { token } = getAuth();
    const isPublicPath = publicPaths.includes(pathname);
    if (!token) {
      setIsAuthenticated(false);
      if (!isPublicPath) {
        router.push('/login');
      }
    } else {
      setIsAuthenticated(true);
      if (pathname === '/login') {
        router.push('/');
      }
    }
  }, [pathname, router]);

  const [sidebarOpen, setSidebarOpen] = useState(false);

  useEffect(() => {
    setSidebarOpen(false);
  }, [pathname]);

  if (!mounted) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', alignItems: 'center', justifyContent: 'center', background: '#eef6fb', gap: '16px' }}>
        <img src="/logo-icon.png" alt="Loading" style={{ width: '48px', height: '48px', objectFit: 'contain' }} className="animate-pulse" />
        <div style={{ fontWeight: '800', color: '#0ea5e9' }}>Loading...</div>
      </div>
    );
  }

  const isPublicPage = publicPaths.includes(pathname);

  if (isPublicPage) {
    return (
      <>
        {children}
        <ToastContainer />
      </>
    );
  }

  if (!isAuthenticated) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', alignItems: 'center', justifyContent: 'center', background: '#eef6fb', gap: '16px' }}>
        <img src="/logo-icon.png" alt="Checking Auth" style={{ width: '48px', height: '48px', objectFit: 'contain' }} className="animate-pulse" />
        <div style={{ fontWeight: '800', color: '#0ea5e9' }}>Checking authorization...</div>
        <ToastContainer />
      </div>
    );
  }

  const underDevPaths = [
    '/donations',
    '/documents',
    '/reports',
    '/notifications',
    '/announcements',
    '/tasks',
    '/roles',
    '/audit',
    '/support'
  ];

  const isSettingsProfile = pathname === '/settings' && typeof window !== 'undefined' && window.location.search.includes('profile=true');
  const isUnderDev = underDevPaths.includes(pathname) || (pathname === '/settings' && !isSettingsProfile);

  return (
    <div className="app-container">
      {sidebarOpen && (
        <div className="sidebar-overlay" onClick={() => setSidebarOpen(false)} />
      )}
      <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />
      <div className="main-content-wrapper">
        <Header onMenuClick={() => setSidebarOpen(!sidebarOpen)} />
        <main className="content-area">
          {isUnderDev ? (
            <div style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              minHeight: '60vh',
              textAlign: 'center',
              padding: '40px 20px',
              background: '#fff',
              borderRadius: '16px',
              border: '1.5px solid #bee3f8',
              boxShadow: '0 4px 20px rgba(14,165,233,0.05)',
              margin: '20px auto',
              maxWidth: '600px'
            }}>
              <div style={{
                width: '80px',
                height: '80px',
                borderRadius: '50%',
                background: '#f0f9ff',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                marginBottom: '24px',
                color: '#0ea5e9',
                boxShadow: '0 8px 20px rgba(14,165,233,0.15)'
              }}>
                <Hammer size={40} />
              </div>
              <h2 style={{ fontSize: '1.5rem', fontWeight: '800', color: '#0f172a', marginBottom: '12px' }}>
                Under Development
              </h2>
              <p style={{ color: '#64748b', fontSize: '0.95rem', maxWidth: '400px', lineHeight: '1.6', marginBottom: '32px' }}>
                This module is currently under development and will be available in a future update.
              </p>
              <button 
                onClick={() => router.back()} 
                className="btn-primary"
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  padding: '10px 24px',
                  borderRadius: '9999px',
                  fontWeight: '700',
                  fontSize: '0.875rem'
                }}
              >
                <ArrowLeft size={16} strokeWidth={2.5} />
                <span>Go Back</span>
              </button>
            </div>
          ) : (
            children
          )}
        </main>
      </div>
      <ToastContainer />
    </div>
  );
}

