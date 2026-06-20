'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Plus, Eye, Trash2, Search, Wallet, Ban } from 'lucide-react';
import { apiRequest, showToast, formatCurrency } from '@/lib/api';

const statusStyle = {
  0: { bg: '#dbeafe', color: '#1d4ed8', label: 'Active' },
  1: { bg: '#dcfce7', color: '#15803d', label: 'Completed' },
  '-1': { bg: '#fee2e2', color: '#991b1b', label: 'Cancelled' },
};

export default function PaymentCampaignsListPage() {
  const router = useRouter();
  const [list, setList] = useState([]);
  const [plans, setPlans] = useState([]);
  const [loading, setLoading] = useState(true);

  // Filters State
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');
  const [selectedPlan, setSelectedPlan] = useState('');

  // Pagination State
  const [page, setPage] = useState(1);
  const [meta, setMeta] = useState(null);

  // Modal States
  const [cancelId, setCancelId] = useState(null);
  const [cancelling, setCancelling] = useState(false);

  // Fetch insurance plans for dropdown filter
  const fetchPlans = async () => {
    try {
      const res = await apiRequest('/api/insurance/get-all?limit=100');
      if (res.s === 1 && Array.isArray(res.r)) {
        setPlans(res.r);
      }
    } catch (err) {
      console.error('Error fetching plans for filter:', err);
    }
  };

  // Fetch campaigns from backend API
  const fetchCampaigns = async () => {
    setLoading(true);
    try {
      let endpoint = `/api/payment/get-all?page=${page}&limit=10`;
      
      if (search.trim()) {
        endpoint += `&search=${encodeURIComponent(search.trim())}`;
      }
      if (selectedPlan) {
        endpoint += `&plan_id=${selectedPlan}`;
      }
      if (statusFilter !== 'All') {
        const sVal = statusFilter === 'Active' ? 0 : statusFilter === 'Completed' ? 1 : statusFilter === 'Cancelled' ? -1 : '';
        if (sVal !== '') endpoint += `&status=${sVal}`;
      }

      const res = await apiRequest(endpoint);
      if (res.s === 1 && Array.isArray(res.r)) {
        setList(res.r);
        setMeta(res.meta || {
          total: res.r.length,
          skip: (page - 1) * 10,
          limit: 10,
          hasPrev: page > 1,
          hasNext: res.r.length === 10
        });
      } else {
        setList([]);
        setMeta(null);
      }
    } catch (err) {
      console.error('Error fetching campaigns list:', err);
      setList([]);
      setMeta(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPlans();
  }, []);

  useEffect(() => {
    fetchCampaigns();
  }, [page, search, statusFilter, selectedPlan]);

  // Actions
  const handleSearchChange = (e) => {
    setSearch(e.target.value);
    setPage(1);
  };

  const handlePlanChange = (e) => {
    setSelectedPlan(e.target.value);
    setPage(1);
  };

  const handleStatusChange = (status) => {
    setStatusFilter(status);
    setPage(1);
  };

  // Cancel Confirm
  const handleCancelConfirm = async () => {
    setCancelling(true);
    try {
      const res = await apiRequest('/api/payment/cancel', {
        method: 'POST',
        body: JSON.stringify({ campaign_id: cancelId })
      });

      if (res.s === 1) {
        showToast('Campaign cancelled successfully', 'success');
        setCancelId(null);
        fetchCampaigns();
      } else {
        showToast(res.m || 'Failed to cancel campaign', 'error');
      }
    } catch (err) {
      console.error('Error cancelling campaign:', err);
      showToast('Error occurred while cancelling the campaign.', 'error');
    } finally {
      setCancelling(false);
    }
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return "-";
    try {
      const d = new Date(dateStr);
      if (isNaN(d.getTime())) return "-";
      const day = String(d.getDate()).padStart(2, '0');
      const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
      const month = months[d.getMonth()];
      const year = d.getFullYear();
      return `${day} ${month} ${year}`;
    } catch (e) {
      return "-";
    }
  };

  return (
    <div style={{ maxWidth: '1200px', margin: '0 auto', paddingBottom: '40px' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '22px', flexWrap: 'wrap', gap: '12px' }}>
        <div>
          <h1 style={{ fontSize: '1.6rem', fontWeight: '800', color: '#0f172a', letterSpacing: '-0.025em' }}>Payment Campaigns</h1>
          <p style={{ color: '#64748b', fontSize: '0.82rem', marginTop: '3px' }}>Manage and track internal cash collections</p>
        </div>
        <button className="btn-primary" onClick={() => router.push('/payments/create')}>
          <Plus size={15} strokeWidth={2.5} /> Create Campaign
        </button>
      </div>

      {/* Main Grid */}
      <div className="card" style={{ padding: '0', overflow: 'visible', marginBottom: '24px' }}>
        {/* Filters Panel */}
        <div style={{ padding: '16px 20px', display: 'flex', flexDirection: 'column', gap: '12px', borderBottom: '1px solid #f1f5f9' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
            {/* Search */}
            <div style={{ position: 'relative', width: '280px' }}>
              <Search size={14} style={{ position: 'absolute', left: '12px', top: '10px', color: '#94a3b8' }} />
              <input
                type="text"
                value={search}
                onChange={handleSearchChange}
                placeholder="Search campaigns..."
                style={{ padding: '7px 12px 7px 34px', borderRadius: '8px', border: '1.5px solid #e8edf2', fontSize: '0.82rem', outline: 'none', width: '100%', fontFamily: 'inherit', background: '#f8fafc', color: '#0f172a', boxSizing: 'border-box' }}
              />
            </div>

            {/* Status Filter Tabs */}
            <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
              {['All', 'Active', 'Completed', 'Cancelled'].map(t => (
                <button
                  key={t}
                  onClick={() => handleStatusChange(t)}
                  style={{
                    padding: '5px 14px',
                    borderRadius: '9999px',
                    fontSize: '0.78rem',
                    fontWeight: '600',
                    border: statusFilter === t ? 'none' : '1px solid #e8edf2',
                    background: statusFilter === t ? 'linear-gradient(135deg,#0ea5e9,#6366f1)' : '#fff',
                    color: statusFilter === t ? 'white' : '#64748b',
                    cursor: 'pointer',
                    transition: 'all 0.15s'
                  }}
                >
                  {t}
                </button>
              ))}
            </div>
          </div>

          {/* Secondary Dropdown Filters */}
          <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap', alignItems: 'center' }}>
            {/* Plan Filter */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ fontSize: '0.75rem', fontWeight: '600', color: '#64748b' }}>Plan:</span>
              <select
                value={selectedPlan}
                onChange={handlePlanChange}
                style={{ padding: '6px 12px', borderRadius: '8px', border: '1.5px solid #e8edf2', fontSize: '0.8rem', color: '#334155', background: '#f8fafc', outline: 'none', fontFamily: 'inherit' }}
              >
                <option value="">All Plans</option>
                {plans.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
              </select>
            </div>
          </div>
        </div>

        {/* Loading / Table Panel */}
        {loading ? (
          <div style={{ padding: '80px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '12px' }}>
            <div className="spinner" style={{ width: '30px', height: '30px', border: '3px solid #f1f5f9', borderTopColor: '#0ea5e9', borderRadius: '50%', animation: 'spin 1s linear infinite' }} />
            <span style={{ fontSize: '0.82rem', fontWeight: '600', color: '#64748b' }}>Loading campaigns...</span>
            <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: '900px' }}>
              <thead>
                <tr style={{ background: '#f8fafc' }}>
                  {['CAMPAIGN', 'COLLECTION INFO', 'PROGRESS', 'PERIOD', 'DUE DATE', 'STATUS', 'ACTIONS'].map(h => (
                    <th key={h} style={{ padding: '12px 16px', textAlign: 'left', fontSize: '0.68rem', fontWeight: '700', color: '#94a3b8', letterSpacing: '0.08em', textTransform: 'uppercase', borderBottom: '1px solid #f1f5f9' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {list.map((item) => {
                  const statusInfo = statusStyle[item.status] || { bg: '#f1f5f9', color: '#475569', label: item.status || 'Unknown' };

                  return (
                    <tr key={item.id} style={{ borderBottom: '1px solid #f8fafc' }}
                      onMouseEnter={e => e.currentTarget.style.background = '#fafcff'}
                      onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                    >
                      {/* Campaign column */}
                      <td style={{ padding: '12px 16px' }}>
                        <div style={{ fontWeight: '700', color: '#0f172a', fontSize: '0.85rem' }}>{item.campaign_no || '-'}</div>
                        <div style={{ fontSize: '0.72rem', color: '#94a3b8', marginTop: '2px' }}>{item.plan_name || '-'}</div>
                        <div style={{ fontSize: '0.72rem', color: '#94a3b8', marginTop: '2px' }}>{item.married_count || 0} Marriages @ {formatCurrency(item.per_marriage_amount || 0)}</div>
                      </td>

                      {/* Collection Info */}
                      <td style={{ padding: '12px 16px', fontSize: '0.82rem', color: '#334155' }}>
                        <div>Total Members: <span style={{ fontWeight: '600', color: '#0f172a' }}>{item.total_active_members || 0}</span></div>
                        <div style={{ marginTop: '2px' }}>New Dues: <span style={{ fontWeight: '600', color: '#0ea5e9' }}>{(Number(item.paid_count) || 0) + (Number(item.pending_count) || 0)}</span></div>
                        <div style={{ marginTop: '2px' }}>Goal: <span style={{ fontWeight: '600', color: '#15803d' }}>{formatCurrency(item.total_collectable_amount || 0)}</span></div>
                        <div style={{ marginTop: '2px' }}>Per Member: <span style={{ fontWeight: '600', color: '#0f172a' }}>{formatCurrency(item.member_payable_amount || 0)}</span></div>
                      </td>

                      {/* Progress */}
                      <td style={{ padding: '12px 16px', fontSize: '0.82rem', color: '#334155' }}>
                        <div style={{ color: '#15803d', fontWeight: '600' }}>Paid: {formatCurrency(item.paid_amount || 0)} ({item.paid_count || 0})</div>
                        <div style={{ color: '#991b1b', fontWeight: '600', marginTop: '2px' }}>Pending: {formatCurrency(item.pending_amount || 0)} ({item.pending_count || 0})</div>
                      </td>

                      {/* Period */}
                      <td style={{ padding: '12px 16px', fontSize: '0.75rem', color: '#334155' }}>
                        {formatDate(item.start_date)}<br/>
                        <span style={{color: '#94a3b8', fontSize: '0.7rem'}}>to</span><br/>
                        {formatDate(item.end_date)}
                      </td>

                      {/* Due Date */}
                      <td style={{ padding: '12px 16px', fontSize: '0.82rem', color: '#334155' }}>
                        {formatDate(item.due_date)}
                      </td>

                      {/* Status */}
                      <td style={{ padding: '12px 16px' }}>
                        <span style={{ padding: '4px 12px', borderRadius: '9999px', fontSize: '0.72rem', fontWeight: '700', background: statusInfo.bg, color: statusInfo.color, display: 'inline-block' }}>
                          {statusInfo.label}
                        </span>
                      </td>

                      {/* Actions */}
                      <td style={{ padding: '12px 16px' }}>
                        <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                          <button
                            title="View Campaign"
                            onClick={() => router.push(`/payments/${item.id}`)}
                            style={{ color: '#0ea5e9', cursor: 'pointer', padding: '5px', borderRadius: '6px', border: 'none', background: 'none' }}
                            onMouseEnter={e => e.currentTarget.style.background = '#e0f2fe'}
                            onMouseLeave={e => e.currentTarget.style.background = 'none'}
                          >
                            <Eye size={15} />
                          </button>

                          {(Number(item.status) === 0) && (
                            <button
                              title="Cancel Campaign"
                              onClick={() => setCancelId(item.id)}
                              style={{ color: '#ef4444', cursor: 'pointer', padding: '5px', borderRadius: '6px', border: 'none', background: 'none' }}
                              onMouseEnter={e => e.currentTarget.style.background = '#fee2e2'}
                              onMouseLeave={e => e.currentTarget.style.background = 'none'}
                            >
                              <Ban size={15} />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {!loading && list.length === 0 && (
          <div style={{ textAlign: 'center', padding: '50px', color: '#94a3b8', fontSize: '0.875rem' }}>
            No payment campaigns found.
          </div>
        )}

        {/* Pagination Controls */}
        {meta && meta.total > 0 && (
          <div style={{ padding: '14px 20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px solid #f1f5f9', flexWrap: 'wrap', gap: '10px' }}>
            <div style={{ fontSize: '0.78rem', color: '#64748b', fontWeight: '500' }}>
              Showing <span style={{ fontWeight: '700', color: '#0f172a' }}>{meta.skip + 1}</span> to{' '}
              <span style={{ fontWeight: '700', color: '#0f172a' }}>{Math.min(meta.skip + meta.limit, meta.total)}</span> of{' '}
              <span style={{ fontWeight: '700', color: '#0f172a' }}>{meta.total}</span> records
            </div>
            <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
              <button
                disabled={!meta.hasPrev}
                onClick={() => setPage(p => Math.max(1, p - 1))}
                style={{
                  padding: '5px 12px',
                  borderRadius: '6px',
                  fontSize: '0.78rem',
                  fontWeight: '600',
                  border: '1px solid #e8edf2',
                  background: meta.hasPrev ? '#fff' : '#f8fafc',
                  color: meta.hasPrev ? '#475569' : '#94a3b8',
                  cursor: meta.hasPrev ? 'pointer' : 'not-allowed',
                  transition: 'all 0.15s',
                }}
              >
                Previous
              </button>
              <span style={{ fontSize: '0.78rem', color: '#475569', fontWeight: '700', minWidth: '40px', textAlign: 'center' }}>
                {page}
              </span>
              <button
                disabled={!meta.hasNext}
                onClick={() => setPage(p => p + 1)}
                style={{
                  padding: '5px 12px',
                  borderRadius: '6px',
                  fontSize: '0.78rem',
                  fontWeight: '600',
                  border: '1px solid #e8edf2',
                  background: meta.hasNext ? '#fff' : '#f8fafc',
                  color: meta.hasNext ? '#475569' : '#94a3b8',
                  cursor: meta.hasNext ? 'pointer' : 'not-allowed',
                  transition: 'all 0.15s',
                }}
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Cancel Confirmation Modal */}
      {cancelId && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 500, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.4)', backdropFilter: 'blur(3px)' }} onClick={() => setCancelId(null)} />
          <div style={{ position: 'relative', background: 'white', borderRadius: '16px', padding: '28px', width: '380px', boxShadow: '0 20px 60px rgba(0,0,0,0.2)', boxSizing: 'border-box' }}>
            <div style={{ fontSize: '2.2rem', textAlign: 'center', marginBottom: '10px' }}>⚠️</div>
            <div style={{ fontWeight: '800', fontSize: '1.1rem', color: '#0f172a', textAlign: 'center', marginBottom: '8px' }}>Cancel Campaign</div>
            <div style={{ fontSize: '0.82rem', color: '#64748b', marginBottom: '22px', lineHeight: '1.4' }}>
              <p style={{ marginBottom: '8px', textAlign: 'center' }}>Are you sure you want to cancel this campaign?</p>
              <p style={{ fontWeight: '700', color: '#334155', marginBottom: '6px' }}>This action will:</p>
              <ul style={{ listStyleType: 'disc', paddingLeft: '16px', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                <li>Set campaign status to cancelled</li>
                <li>Remove pending dues for members</li>
              </ul>
            </div>
            <div style={{ display: 'flex', gap: '10px' }}>
              <button onClick={() => setCancelId(null)} className="btn-secondary" style={{ flex: 1, padding: '10px', borderRadius: '9999px', fontSize: '0.82rem' }}>Close</button>
              <button onClick={handleCancelConfirm} disabled={cancelling} className="btn-primary" style={{ flex: 1, padding: '10px', borderRadius: '9999px', background: '#ef4444', color: 'white', boxShadow: 'none', border: 'none', fontSize: '0.82rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}
                onMouseEnter={e => e.currentTarget.style.background = '#dc2626'}
                onMouseLeave={e => e.currentTarget.style.background = '#ef4444'}
              >
                {cancelling ? 'Cancelling...' : 'Confirm Cancel'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
