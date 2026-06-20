'use client';
import { useState, useEffect, use } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Wallet, CheckCircle, Clock, Search } from 'lucide-react';
import { apiRequest, showToast, formatCurrency } from '@/lib/api';

const statusStyle = {
  0: { bg: '#dbeafe', color: '#1d4ed8', label: 'Active' },
  1: { bg: '#dcfce7', color: '#15803d', label: 'Completed' },
  '-1': { bg: '#fee2e2', color: '#991b1b', label: 'Cancelled' },
};

const dueStatusStyle = {
  0: { bg: '#fef3c7', color: '#92400e', label: 'Pending' },
  1: { bg: '#dcfce7', color: '#15803d', label: 'Paid' },
};

export default function CampaignDetailsPage({ params: paramsPromise }) {
  const router = useRouter();
  const params = use(paramsPromise);
  const { id: campaignId } = params;

  const [loading, setLoading] = useState(true);
  const [summary, setSummary] = useState(null);
  const [marriedMembers, setMarriedMembers] = useState([]);
  const [duesList, setDuesList] = useState([]);

  // Dues tabs & filter
  const [duesTab, setDuesTab] = useState('All');
  const [duesSearch, setDuesSearch] = useState('');

  // Mark Paid State
  const [showMarkPaidModal, setShowMarkPaidModal] = useState(false);
  const [selectedDue, setSelectedDue] = useState(null);
  const [markPaidAmount, setMarkPaidAmount] = useState('');
  const [markPaidNotes, setMarkPaidNotes] = useState('');
  const [submittingPaid, setSubmittingPaid] = useState(false);

  const openMarkPaidModal = (due) => {
    setSelectedDue(due);
    setMarkPaidAmount(due.amount || '');
    setMarkPaidNotes('');
    setShowMarkPaidModal(true);
  };

  const handleMarkPaid = async (e) => {
    e.preventDefault();
    if (!selectedDue || !markPaidAmount) return;
    
    setSubmittingPaid(true);
    try {
      const payload = {
        due_id: selectedDue.due_id || selectedDue.id,
        amount: Number(markPaidAmount),
        notes: markPaidNotes
      };
      
      const res = await apiRequest('/api/payment/mark-cash-paid', {
        method: 'POST',
        body: JSON.stringify(payload)
      });
      
      if (res.s === 1) {
        showToast('Payment marked as paid', 'success');
        setShowMarkPaidModal(false);
        loadData(); // refresh
      } else {
        showToast(res.m || 'Failed to mark payment', 'error');
      }
    } catch (err) {
      console.error(err);
      showToast('Error marking payment as paid', 'error');
    } finally {
      setSubmittingPaid(false);
    }
  };

  const loadData = async () => {
    setLoading(true);
    try {
      const res = await apiRequest(`/api/payment/get?id=${campaignId}`);
      if (res.s === 1 && res.r) {
        // Handle varying backend shapes safely
        const payload = Array.isArray(res.r) ? res.r[0] : res.r;
        if (payload) {
          setSummary(payload.summary || payload);
          setMarriedMembers(payload.married_members || []);
          setDuesList(payload.dues_list || payload.dues || []);
        } else {
          showToast('Campaign not found', 'error');
        }
      } else {
        showToast(res.m || 'Failed to load campaign details', 'error');
      }
    } catch (err) {
      console.error(err);
      showToast('Error loading campaign details', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [campaignId]);

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

  const filteredDues = duesList.filter(due => {
    // Tab Filter
    if (duesTab === 'Pending' && Number(due.status) !== 0) return false;
    if (duesTab === 'Paid' && Number(due.status) !== 1) return false;
    
    // Search Filter
    if (duesSearch.trim()) {
      const q = duesSearch.toLowerCase();
      const code = (due.member_code || '').toLowerCase();
      const name = (due.member_name || due.full_name || '').toLowerCase();
      const phone = (due.phone || '').toLowerCase();
      const agent = (due.agent_name || '').toLowerCase();
      return code.includes(q) || name.includes(q) || phone.includes(q) || agent.includes(q);
    }
    return true;
  });

  if (loading) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '60vh', gap: '12px' }}>
        <div className="spinner" style={{ width: '40px', height: '40px', border: '4px solid #f1f5f9', borderTopColor: '#0ea5e9', borderRadius: '50%', animation: 'spin 1s linear infinite' }} />
        <span style={{ fontSize: '0.875rem', fontWeight: '600', color: '#64748b' }}>Loading campaign details...</span>
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  if (!summary) {
    return (
      <div style={{ padding: '40px', textAlign: 'center', background: '#fff', borderRadius: '16px', border: '1.5px solid #bee3f8', maxWidth: '600px', margin: '40px auto' }}>
        <div style={{ fontSize: '2rem', marginBottom: '10px' }}>⚠️</div>
        <h2 style={{ fontSize: '1.2rem', fontWeight: '800', color: '#0f172a', marginBottom: '8px' }}>Campaign Not Found</h2>
        <button onClick={() => router.push('/payments')} className="btn-secondary">
          <ArrowLeft size={16} /> <span>Back to Campaigns</span>
        </button>
      </div>
    );
  }

  const sStatus = statusStyle[summary.status] || { bg: '#f1f5f9', color: '#475569', label: summary.status || 'Unknown' };

  return (
    <div style={{ maxWidth: '1200px', margin: '0 auto', paddingBottom: '60px' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '24px', flexWrap: 'wrap', gap: '16px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <button onClick={() => router.push('/payments')} className="btn-secondary" style={{ padding: '8px' }}>
            <ArrowLeft size={18} />
          </button>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <h1 style={{ fontSize: '1.5rem', fontWeight: '800', color: '#0f172a', letterSpacing: '-0.02em' }}>{summary.campaign_no || 'Campaign Details'}</h1>
              <span style={{ padding: '4px 10px', borderRadius: '9999px', fontSize: '0.7rem', fontWeight: '700', background: sStatus.bg, color: sStatus.color }}>
                {sStatus.label}
              </span>
            </div>
            <p style={{ color: '#64748b', fontSize: '0.85rem' }}>Plan: {summary.plan_name || '-'}</p>
          </div>
        </div>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
        
        {/* Campaign Summary Widget Grid */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '16px' }}>
          
          <div className="premium-card" style={{ padding: '20px', background: 'linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%)' }}>
            <h3 style={{ fontSize: '0.75rem', fontWeight: '700', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <Wallet size={14} color="#0ea5e9" /> Financial Overview
            </h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ fontSize: '0.82rem', color: '#475569', fontWeight: '600' }}>Per Marriage Amount</span>
                <span style={{ fontSize: '0.9rem', color: '#0f172a', fontWeight: '700' }}>{formatCurrency(summary.per_marriage_amount || 0)}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ fontSize: '0.82rem', color: '#475569', fontWeight: '600' }}>Member Payable Amount</span>
                <span style={{ fontSize: '1rem', color: '#1d4ed8', fontWeight: '800' }}>{formatCurrency(summary.member_payable_amount || 0)}</span>
              </div>
              <div style={{ height: '1px', background: '#e2e8f0' }}></div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ fontSize: '0.82rem', color: '#475569', fontWeight: '600' }}>Total Collectable</span>
                <span style={{ fontSize: '1.2rem', color: '#15803d', fontWeight: '900' }}>{formatCurrency(summary.total_collectable_amount || 0)}</span>
              </div>
            </div>
          </div>

          <div className="premium-card" style={{ padding: '20px', background: 'linear-gradient(135deg, #f0fdf4 0%, #ecfdf5 100%)', border: '1px solid #bbf7d0' }}>
            <h3 style={{ fontSize: '0.75rem', fontWeight: '700', color: '#166534', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <CheckCircle size={14} color="#15803d" /> Collections Progress
            </h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ fontSize: '0.82rem', color: '#166534', fontWeight: '600' }}>Collected</span>
                <span style={{ fontSize: '1.1rem', color: '#15803d', fontWeight: '800' }}>{formatCurrency(summary.paid_amount || 0)}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ fontSize: '0.82rem', color: '#991b1b', fontWeight: '600' }}>Pending</span>
                <span style={{ fontSize: '1.1rem', color: '#991b1b', fontWeight: '800' }}>{formatCurrency(summary.pending_amount || 0)}</span>
              </div>
            </div>
          </div>

          <div className="premium-card" style={{ padding: '20px' }}>
            <h3 style={{ fontSize: '0.75rem', fontWeight: '700', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <Clock size={14} color="#8b5cf6" /> Campaign Meta
            </h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ fontSize: '0.82rem', color: '#475569', fontWeight: '600' }}>Married Members Included</span>
                <span style={{ fontSize: '0.9rem', color: '#0f172a', fontWeight: '700' }}>{summary.married_count || 0}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ fontSize: '0.82rem', color: '#475569', fontWeight: '600' }}>Total Active Members</span>
                <span style={{ fontSize: '0.9rem', color: '#0f172a', fontWeight: '700' }}>{summary.total_active_members || 0}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ fontSize: '0.82rem', color: '#475569', fontWeight: '600' }}>New Dues Count</span>
                <span style={{ fontSize: '0.9rem', color: '#0ea5e9', fontWeight: '700' }}>{(Number(summary.paid_count) || 0) + (Number(summary.pending_count) || 0)}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', borderTop: '1px solid #f1f5f9', paddingTop: '10px' }}>
                <span style={{ fontSize: '0.82rem', color: '#475569', fontWeight: '600' }}>Campaign Period</span>
                <span style={{ fontSize: '0.85rem', color: '#0f172a', fontWeight: '700', textAlign: 'right' }}>
                  {formatDate(summary.start_date)} to {formatDate(summary.end_date)}
                </span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', borderTop: '1px solid #f1f5f9', paddingTop: '10px' }}>
                <span style={{ fontSize: '0.82rem', color: '#475569', fontWeight: '600' }}>Due Date</span>
                <span style={{ fontSize: '0.9rem', color: '#0f172a', fontWeight: '700' }}>{formatDate(summary.due_date)}</span>
              </div>
            </div>
          </div>
          
        </div>

        {/* Selected Married Members Table */}
        <div className="premium-card" style={{ padding: '0', overflow: 'hidden' }}>
          <div style={{ padding: '16px 20px', borderBottom: '1px solid #f1f5f9', background: '#fafcff' }}>
            <h2 style={{ fontSize: '1.05rem', fontWeight: '800', color: '#0f172a' }}>Selected Married Members</h2>
            <p style={{ fontSize: '0.8rem', color: '#64748b' }}>Members whose marriages triggered this collection.</p>
          </div>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ background: '#f8fafc' }}>
                  <th style={{ padding: '12px 20px', textAlign: 'left', fontSize: '0.7rem', fontWeight: '700', color: '#94a3b8', textTransform: 'uppercase' }}>Member Code</th>
                  <th style={{ padding: '12px 20px', textAlign: 'left', fontSize: '0.7rem', fontWeight: '700', color: '#94a3b8', textTransform: 'uppercase' }}>Member Name</th>
                  <th style={{ padding: '12px 20px', textAlign: 'left', fontSize: '0.7rem', fontWeight: '700', color: '#94a3b8', textTransform: 'uppercase' }}>Marriage Date</th>
                  <th style={{ padding: '12px 20px', textAlign: 'left', fontSize: '0.7rem', fontWeight: '700', color: '#94a3b8', textTransform: 'uppercase' }}>Amount Given</th>
                </tr>
              </thead>
              <tbody>
                {marriedMembers.map((m, i) => (
                  <tr key={i} style={{ borderBottom: '1px solid #f1f5f9' }}>
                    <td style={{ padding: '12px 20px', fontSize: '0.82rem', fontWeight: '600', color: '#0f172a' }}>{m.member_code || '-'}</td>
                    <td style={{ padding: '12px 20px', fontSize: '0.82rem', color: '#334155' }}>{m.member_name || m.full_name || '-'}</td>
                    <td style={{ padding: '12px 20px', fontSize: '0.82rem', color: '#334155' }}>{formatDate(m.marriage_date)}</td>
                    <td style={{ padding: '12px 20px', fontSize: '0.82rem', fontWeight: '600', color: '#15803d' }}>{formatCurrency(m.amount_given || 0)}</td>
                  </tr>
                ))}
                {marriedMembers.length === 0 && (
                  <tr>
                    <td colSpan="4" style={{ padding: '30px', textAlign: 'center', color: '#94a3b8', fontSize: '0.85rem' }}>No married members recorded.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Payment Dues Table */}
        <div className="premium-card" style={{ padding: '0', overflow: 'hidden' }}>
          <div style={{ padding: '16px 20px', borderBottom: '1px solid #f1f5f9', background: '#fafcff' }}>
            <h2 style={{ fontSize: '1.05rem', fontWeight: '800', color: '#0f172a' }}>Payment Dues</h2>
            <p style={{ fontSize: '0.8rem', color: '#64748b' }}>Track collection statuses from all active members.</p>
          </div>
          
          <div style={{ padding: '16px 20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #f1f5f9', flexWrap: 'wrap', gap: '12px' }}>
            {/* Tabs */}
            <div style={{ display: 'flex', gap: '6px' }}>
              {['All', 'Pending', 'Paid'].map(t => (
                <button
                  key={t}
                  onClick={() => setDuesTab(t)}
                  style={{
                    padding: '6px 16px',
                    borderRadius: '9999px',
                    fontSize: '0.8rem',
                    fontWeight: '600',
                    border: duesTab === t ? 'none' : '1px solid #e8edf2',
                    background: duesTab === t ? 'linear-gradient(135deg,#0ea5e9,#6366f1)' : '#fff',
                    color: duesTab === t ? 'white' : '#64748b',
                    cursor: 'pointer',
                    transition: 'all 0.15s'
                  }}
                >
                  {t}
                </button>
              ))}
            </div>

            {/* Search */}
            <div style={{ position: 'relative', width: '280px' }}>
              <Search size={14} style={{ position: 'absolute', left: '12px', top: '10px', color: '#94a3b8' }} />
              <input
                type="text"
                value={duesSearch}
                onChange={e => setDuesSearch(e.target.value)}
                placeholder="Search by name, code, phone, agent..."
                style={{ padding: '7px 12px 7px 34px', borderRadius: '8px', border: '1.5px solid #e8edf2', fontSize: '0.82rem', outline: 'none', width: '100%', fontFamily: 'inherit', background: '#f8fafc', color: '#0f172a', boxSizing: 'border-box' }}
              />
            </div>
          </div>

          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: '800px' }}>
              <thead>
                <tr style={{ background: '#f8fafc' }}>
                  <th style={{ padding: '12px 20px', textAlign: 'left', fontSize: '0.7rem', fontWeight: '700', color: '#94a3b8', textTransform: 'uppercase' }}>Member</th>
                  <th style={{ padding: '12px 20px', textAlign: 'left', fontSize: '0.7rem', fontWeight: '700', color: '#94a3b8', textTransform: 'uppercase' }}>Phone</th>
                  <th style={{ padding: '12px 20px', textAlign: 'left', fontSize: '0.7rem', fontWeight: '700', color: '#94a3b8', textTransform: 'uppercase' }}>Agent</th>
                  <th style={{ padding: '12px 20px', textAlign: 'left', fontSize: '0.7rem', fontWeight: '700', color: '#94a3b8', textTransform: 'uppercase' }}>Amount</th>
                  <th style={{ padding: '12px 20px', textAlign: 'left', fontSize: '0.7rem', fontWeight: '700', color: '#94a3b8', textTransform: 'uppercase' }}>Status</th>
                  <th style={{ padding: '12px 20px', textAlign: 'left', fontSize: '0.7rem', fontWeight: '700', color: '#94a3b8', textTransform: 'uppercase' }}>Payment Mode</th>
                  <th style={{ padding: '12px 20px', textAlign: 'left', fontSize: '0.7rem', fontWeight: '700', color: '#94a3b8', textTransform: 'uppercase' }}>Paid At</th>
                  <th style={{ padding: '12px 20px', textAlign: 'right', fontSize: '0.7rem', fontWeight: '700', color: '#94a3b8', textTransform: 'uppercase' }}>Action</th>
                </tr>
              </thead>
              <tbody>
                {filteredDues.map((due, i) => {
                  const dStatus = dueStatusStyle[due.status] || { bg: '#f1f5f9', color: '#475569', label: 'Unknown' };
                  return (
                    <tr key={i} style={{ borderBottom: '1px solid #f1f5f9' }}
                      onMouseEnter={e => e.currentTarget.style.background = '#fafcff'}
                      onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                    >
                      <td style={{ padding: '12px 20px' }}>
                        <div style={{ fontSize: '0.82rem', fontWeight: '700', color: '#0f172a' }}>{due.member_name || due.full_name || '-'}</div>
                        <div style={{ fontSize: '0.7rem', color: '#64748b', marginTop: '2px' }}>{due.member_code || '-'}</div>
                      </td>
                      <td style={{ padding: '12px 20px', fontSize: '0.82rem', color: '#334155' }}>{due.phone || '-'}</td>
                      <td style={{ padding: '12px 20px', fontSize: '0.82rem', color: '#334155' }}>{due.agent_name || '-'}</td>
                      <td style={{ padding: '12px 20px', fontSize: '0.82rem', fontWeight: '700', color: '#0f172a' }}>{formatCurrency(due.amount || 0)}</td>
                      <td style={{ padding: '12px 20px' }}>
                        <span style={{ padding: '4px 10px', borderRadius: '9999px', fontSize: '0.7rem', fontWeight: '700', background: dStatus.bg, color: dStatus.color }}>
                          {dStatus.label}
                        </span>
                      </td>
                      <td style={{ padding: '12px 20px', fontSize: '0.82rem', color: '#334155', textTransform: 'capitalize' }}>
                        {due.payment_mode || '-'}
                      </td>
                      <td style={{ padding: '12px 20px', fontSize: '0.82rem', color: '#334155' }}>
                        {formatDate(due.paid_at)}
                      </td>
                      <td style={{ padding: '12px 20px', textAlign: 'right' }}>
                        {due.status === 0 ? (
                          <button
                            onClick={() => openMarkPaidModal(due)}
                            className="btn-primary"
                            style={{ padding: '4px 12px', fontSize: '0.75rem', borderRadius: '4px' }}
                          >
                            Mark Cash Paid
                          </button>
                        ) : (
                          <span style={{ fontSize: '0.75rem', color: '#15803d', fontWeight: '700' }}>Paid</span>
                        )}
                      </td>
                    </tr>
                  )
                })}
                {filteredDues.length === 0 && (
                  <tr>
                    <td colSpan="7" style={{ padding: '40px', textAlign: 'center', color: '#94a3b8', fontSize: '0.85rem' }}>No dues found matching filters.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Mark Cash Paid Modal */}
      {showMarkPaidModal && selectedDue && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(15, 23, 42, 0.4)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '20px' }}>
          <div style={{ background: '#fff', borderRadius: '16px', width: '100%', maxWidth: '400px', boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.1)', overflow: 'hidden', animation: 'scaleIn 0.2s cubic-bezier(0.16, 1, 0.3, 1)' }}>
            <div style={{ padding: '20px', borderBottom: '1px solid #f1f5f9', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h2 style={{ fontSize: '1.1rem', fontWeight: '800', color: '#0f172a' }}>Mark Cash Paid</h2>
            </div>
            
            <form onSubmit={handleMarkPaid} style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div style={{ background: '#f8fafc', padding: '12px', borderRadius: '8px', fontSize: '0.82rem', color: '#334155' }}>
                <div style={{ fontWeight: '700', color: '#0f172a', marginBottom: '4px' }}>Member: {selectedDue.member_name || selectedDue.full_name}</div>
                <div style={{ color: '#64748b' }}>Code: {selectedDue.member_code}</div>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: '700', color: '#334155', marginBottom: '8px' }}>Amount Received (₹) *</label>
                <input 
                  type="number" 
                  required
                  value={markPaidAmount}
                  onChange={e => setMarkPaidAmount(e.target.value)}
                  className="premium-input"
                  style={{ width: '100%' }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: '700', color: '#334155', marginBottom: '8px' }}>Notes</label>
                <textarea 
                  value={markPaidNotes}
                  onChange={e => setMarkPaidNotes(e.target.value)}
                  className="premium-input"
                  style={{ width: '100%', minHeight: '80px', resize: 'vertical' }}
                  placeholder="Optional notes about the payment..."
                />
              </div>

              <div style={{ display: 'flex', gap: '12px', marginTop: '10px' }}>
                <button 
                  type="button" 
                  onClick={() => setShowMarkPaidModal(false)}
                  className="btn-secondary" 
                  style={{ flex: 1, padding: '10px', fontSize: '0.9rem', justifyContent: 'center' }}
                  disabled={submittingPaid}
                >
                  Cancel
                </button>
                <button 
                  type="submit" 
                  className="btn-primary" 
                  style={{ flex: 1, padding: '10px', fontSize: '0.9rem', justifyContent: 'center' }}
                  disabled={submittingPaid}
                >
                  {submittingPaid ? 'Saving...' : 'Confirm Paid'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      
      <style>{`
        @keyframes scaleIn {
          from { opacity: 0; transform: scale(0.95); }
          to { opacity: 1; transform: scale(1); }
        }
      `}</style>
    </div>
  );
}
