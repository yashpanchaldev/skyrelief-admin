'use client';
import { useState, useEffect, use } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Edit, Calendar, Info, FileText } from 'lucide-react';
import { formatCurrency, apiRequest, showToast } from '@/lib/api';

const statusStyle = {
  1: { bg: '#dcfce7', color: '#15803d', label: 'Active' },
  0: { bg: '#fef3c7', color: '#92400e', label: 'Inactive' },
  '-1': { bg: '#fee2e2', color: '#991b1b', label: 'Deleted' },
};

const BASE_API_URL = process.env.NEXT_PUBLIC_API_URL || 'https://api.skyrelief.org';

export default function InsuranceDetailsPage({ params: paramsPromise }) {
  const router = useRouter();
  const params = use(paramsPromise);
  const { insuranceId } = params;

  const [plan, setPlan] = useState(null);
  const [loading, setLoading] = useState(true);

  // Visible Member Count State
  const [visibleCountData, setVisibleCountData] = useState(null);
  const [editingVisibleCount, setEditingVisibleCount] = useState(false);
  const [newVisibleCount, setNewVisibleCount] = useState('');
  const [savingVisibleCount, setSavingVisibleCount] = useState(false);

  const loadVisibleCount = async () => {
    try {
      const res = await apiRequest(`/api/insurance/get-visible-count?plan_id=${insuranceId}`);
      if (res.s === 1 && res.r) {
        setVisibleCountData(res.r);
        setNewVisibleCount(res.r.visible_member_count !== null ? res.r.visible_member_count : '');
      }
    } catch (err) {
      console.error('Error loading visible count:', err);
    }
  };

  const loadData = async () => {
    setLoading(true);
    try {
      const res = await apiRequest(`/api/insurance/get?id=${insuranceId}`);
      if (res.s === 1 && res.r) {
        setPlan(res.r);
      } else {
        showToast(res.m || 'Failed to fetch insurance details.', 'error');
      }
    } catch (err) {
      console.error('Error loading insurance details:', err);
      showToast('Error loading insurance details.', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
    loadVisibleCount();
  }, [insuranceId]);

  const handleSaveVisibleCount = async () => {
    setSavingVisibleCount(true);
    try {
      const val = newVisibleCount === '' ? null : Number(newVisibleCount);
      const res = await apiRequest('/api/insurance/update-visible-count', {
        method: 'POST',
        body: JSON.stringify({
          plan_id: insuranceId,
          visible_member_count: val
        })
      });
      if (res.s === 1) {
        showToast(res.m || 'Visible member count updated.', 'success');
        setEditingVisibleCount(false);
        loadVisibleCount(); // reload data
      } else {
        showToast(res.m || 'Failed to update visible count.', 'error');
      }
    } catch (err) {
      showToast('Error updating visible count.', 'error');
    } finally {
      setSavingVisibleCount(false);
    }
  };

  const handleResetVisibleCount = async () => {
    setSavingVisibleCount(true);
    try {
      const res = await apiRequest('/api/insurance/update-visible-count', {
        method: 'POST',
        body: JSON.stringify({
          plan_id: insuranceId,
          visible_member_count: null
        })
      });
      if (res.s === 1) {
        showToast('Reset to actual count successfully.', 'success');
        setEditingVisibleCount(false);
        loadVisibleCount(); 
      } else {
        showToast(res.m || 'Failed to reset visible count.', 'error');
      }
    } catch (err) {
      showToast('Error resetting visible count.', 'error');
    } finally {
      setSavingVisibleCount(false);
    }
  };

  if (loading) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '60vh', gap: '12px' }}>
        <div className="spinner" style={{ width: '40px', height: '40px', border: '4px solid #f1f5f9', borderTopColor: '#0ea5e9', borderRadius: '50%', animation: 'spin 1s linear infinite' }} />
        <span style={{ fontSize: '0.875rem', fontWeight: '600', color: '#64748b' }}>Loading insurance details...</span>
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  if (!plan) {
    return (
      <div style={{ padding: '40px', textAlign: 'center', background: '#fff', borderRadius: '16px', border: '1.5px solid #bee3f8', maxWidth: '600px', margin: '40px auto' }}>
        <div style={{ fontSize: '2rem', marginBottom: '10px' }}>⚠️</div>
        <h2 style={{ fontSize: '1.2rem', fontWeight: '800', color: '#0f172a', marginBottom: '8px' }}>Insurance Plan Not Found</h2>
        <p style={{ color: '#64748b', fontSize: '0.82rem', marginBottom: '20px' }}>The plan you are looking for does not exist or has been deleted.</p>
        <button onClick={() => router.push('/insurance')} className="btn-secondary">
          <ArrowLeft size={16} /> <span>Back to Insurance List</span>
        </button>
      </div>
    );
  }

  const displayStatus = statusStyle[plan.status]?.label || 'Pending';
  const statusInfo = statusStyle[plan.status] || { bg: '#f1f5f9', color: '#475569' };
  const imageUrl = plan.image ? (plan.image.startsWith('http') ? plan.image : `${BASE_API_URL}${plan.image}`) : null;

  return (
    <div style={{ maxWidth: '960px', margin: '0 auto', paddingBottom: '40px' }}>
      {/* Back Button */}
      <button 
        onClick={() => router.push('/insurance')} 
        className="btn-secondary"
        style={{ marginBottom: '20px', padding: '6px 14px', borderRadius: '9999px' }}
      >
        <ArrowLeft size={16} strokeWidth={2.5} /> 
        <span>Back to Insurance List</span>
      </button>

      {/* Header Profile Box */}
      <div className="premium-card" style={{ display: 'flex', gap: '24px', alignItems: 'center', marginBottom: '24px', padding: '24px', position: 'relative', overflow: 'hidden' }}>
        <div style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '48px', background: 'var(--primary-gradient)' }}></div>

        <div style={{ position: 'relative', zIndex: 1, marginTop: '20px' }}>
          <div style={{ width: '80px', height: '80px', borderRadius: '16px', background: '#f1f5f9', overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '3px solid white', boxShadow: 'var(--shadow-md)' }}>
            {imageUrl ? (
              <img src={imageUrl} alt={plan.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
            ) : (
              <span style={{ fontSize: '2rem' }}>🛡️</span>
            )}
          </div>
        </div>

        <div style={{ flex: 1, position: 'relative', zIndex: 1, marginTop: '20px', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '16px' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
              <h1 style={{ fontSize: '1.35rem', fontWeight: '800', color: 'var(--text-dark)', letterSpacing: '-0.02em', lineHeight: 1.1 }}>{plan.name}</h1>
              <span style={{ padding: '3px 10px', borderRadius: '9999px', fontSize: '0.65rem', fontWeight: '700', background: statusInfo.bg, color: statusInfo.color }}>
                ● {displayStatus} Plan
              </span>
            </div>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.75rem', fontWeight: '600', display: 'flex', gap: '16px', alignItems: 'center', marginTop: '6px', flexWrap: 'wrap' }}>
              <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}><Calendar size={14} /> Created: {plan.created_at ? plan.created_at.split('T')[0] : 'N/A'}</span>
              {plan.updated_at && (
                <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}><Calendar size={14} /> Updated: {plan.updated_at.split('T')[0]}</span>
              )}
            </p>
          </div>
          
          {/* Action Button */}
          <div>
            <button className="btn-primary" onClick={() => router.push(`/insurance/form?id=${insuranceId}`)} style={{ padding: '8px 16px', fontSize: '0.8rem' }}>
              <Edit size={14} /> <span>Edit Plan Details</span>
            </button>
          </div>
        </div>
      </div>

      {/* Main Grid */}
      <div className="grid-r-split-2-1" style={{ alignItems: 'start' }}>
        
        {/* Left Column - Details */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          
          {/* Card 1: Scheme Description */}
          <div className="premium-card" style={{ padding: '20px' }}>
            <h2 style={{ fontSize: '0.95rem', fontWeight: '800', color: 'var(--text-dark)', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px', borderBottom: '1px solid var(--border)', paddingBottom: '8px' }}>
              <Info size={16} color="var(--primary)" />
              <span>Description & Benefits</span>
            </h2>
            <div style={{ fontSize: '0.875rem', color: '#475569', lineHeight: '1.6', whiteSpace: 'pre-wrap' }}>
              {plan.description || 'No description provided for this scheme.'}
            </div>
          </div>

          {/* Card 2: Terms & Conditions */}
          <div className="premium-card" style={{ padding: '20px' }}>
            <h2 style={{ fontSize: '0.95rem', fontWeight: '800', color: 'var(--text-dark)', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px', borderBottom: '1px solid var(--border)', paddingBottom: '8px' }}>
              <FileText size={16} color="var(--primary)" />
              <span>Terms & Conditions</span>
            </h2>
            <div style={{ fontSize: '0.875rem', color: '#475569', lineHeight: '1.6', whiteSpace: 'pre-wrap' }}>
              {plan.term_condition || 'No terms & conditions defined.'}
            </div>
          </div>

        </div>

        {/* Right Column - Pricing Sidebar */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          
          {/* Pricing Info Card */}
          <div className="premium-card" style={{ padding: '20px' }}>
            <h2 style={{ fontSize: '0.85rem', fontWeight: '800', color: 'var(--text-dark)', marginBottom: '16px', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Pricing & Fees</h2>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              
              <div style={{ background: '#f8fafc', borderRadius: '12px', padding: '12px 16px', border: '1px solid var(--border)' }}>
                <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', fontWeight: '700', textTransform: 'uppercase', display: 'block', marginBottom: '4px' }}>Joining Fee</span>
                <span style={{ fontSize: '1.25rem', fontWeight: '800', color: '#0f172a' }}>{formatCurrency(plan.joining_fee)}</span>
              </div>

              <div style={{ background: '#f0fdf4', borderRadius: '12px', padding: '12px 16px', border: '1px solid #bbf7d0' }}>
                <span style={{ fontSize: '0.72rem', color: '#166534', fontWeight: '700', textTransform: 'uppercase', display: 'block', marginBottom: '4px' }}>Instalment Fees</span>
                <span style={{ fontSize: '1.25rem', fontWeight: '800', color: '#15803d' }}>{formatCurrency(plan.instalment_fees)}</span>
              </div>

            </div>
          </div>

          {/* Visible Member Count Card */}
          <div className="premium-card" style={{ padding: '20px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <h2 style={{ fontSize: '0.85rem', fontWeight: '800', color: 'var(--text-dark)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Member Count Settings</h2>
              {!editingVisibleCount ? (
                <div style={{ display: 'flex', gap: '8px' }}>
                  {visibleCountData?.visible_member_count !== null && (
                    <button onClick={handleResetVisibleCount} disabled={savingVisibleCount} style={{ background: 'none', border: 'none', color: '#ef4444', fontSize: '0.75rem', fontWeight: '700', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px' }}>
                      Reset
                    </button>
                  )}
                  <button onClick={() => setEditingVisibleCount(true)} style={{ background: 'none', border: 'none', color: 'var(--primary)', fontSize: '0.75rem', fontWeight: '700', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <Edit size={12} /> Edit
                  </button>
                </div>
              ) : (
                <div style={{ display: 'flex', gap: '8px' }}>
                  <button onClick={() => { setEditingVisibleCount(false); setNewVisibleCount(visibleCountData?.visible_member_count !== null ? visibleCountData?.visible_member_count : ''); }} style={{ background: 'none', border: 'none', color: '#64748b', fontSize: '0.75rem', fontWeight: '700', cursor: 'pointer' }}>
                    Cancel
                  </button>
                  <button onClick={handleSaveVisibleCount} disabled={savingVisibleCount} style={{ background: 'var(--primary)', border: 'none', color: 'white', padding: '4px 10px', borderRadius: '4px', fontSize: '0.75rem', fontWeight: '700', cursor: savingVisibleCount ? 'not-allowed' : 'pointer' }}>
                    {savingVisibleCount ? 'Saving...' : 'Save'}
                  </button>
                </div>
              )}
            </div>

            {visibleCountData ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', fontSize: '0.8rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid #f8fafc', paddingBottom: '6px' }}>
                  <span style={{ color: 'var(--text-muted)', fontWeight: '600' }}>Actual Active:</span>
                  <span style={{ color: 'var(--text-dark)', fontWeight: '700' }}>{visibleCountData.actual_active_member_count}</span>
                </div>
                
                <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid #f8fafc', paddingBottom: '6px', alignItems: 'center' }}>
                  <span style={{ color: 'var(--text-muted)', fontWeight: '600' }}>Visible Count:</span>
                  {editingVisibleCount ? (
                    <input 
                      type="number" 
                      value={newVisibleCount} 
                      onChange={(e) => setNewVisibleCount(e.target.value)} 
                      placeholder="Actual" 
                      style={{ width: '80px', padding: '4px 8px', border: '1px solid #cbd5e1', borderRadius: '4px', fontSize: '0.8rem', textAlign: 'right' }} 
                      min="0"
                    />
                  ) : (
                    <span style={{ color: 'var(--text-dark)', fontWeight: '700' }}>{visibleCountData.visible_member_count !== null ? visibleCountData.visible_member_count : 'Not Set'}</span>
                  )}
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', background: '#f0fdf4', padding: '8px 12px', borderRadius: '6px' }}>
                  <span style={{ color: '#166534', fontWeight: '700' }}>Member App Shows:</span>
                  <span style={{ color: '#15803d', fontWeight: '800' }}>{visibleCountData.display_member_count}</span>
                </div>
              </div>
            ) : (
              <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Loading...</div>
            )}
          </div>

          {/* Quick Stats Card */}
          <div className="premium-card" style={{ padding: '20px' }}>
            <h2 style={{ fontSize: '0.85rem', fontWeight: '800', color: 'var(--text-dark)', marginBottom: '14px', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Scheme Metadata</h2>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', fontSize: '0.8rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid #f8fafc', paddingBottom: '6px' }}>
                <span style={{ color: 'var(--text-muted)', fontWeight: '600' }}>Scheme ID:</span>
                <span style={{ color: 'var(--text-dark)', fontWeight: '700' }}>{plan.id}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: 'var(--text-muted)', fontWeight: '600' }}>Status:</span>
                <span style={{ color: statusInfo.color, fontWeight: '700' }}>{displayStatus}</span>
              </div>
            </div>
          </div>

        </div>

      </div>
    </div>
  );
}
