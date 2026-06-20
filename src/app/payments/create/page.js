'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Save, Users, Calculator, CheckSquare, Square, Info } from 'lucide-react';
import { apiRequest, showToast, formatCurrency } from '@/lib/api';

export default function CreateCampaignPage() {
  const router = useRouter();

  // Form State
  const [plans, setPlans] = useState([]);
  const [selectedPlan, setSelectedPlan] = useState('');
  const [perMarriageAmount, setPerMarriageAmount] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [dueDate, setDueDate] = useState('');

  // Data State
  const [marriedMembers, setMarriedMembers] = useState([]);
  const [selectedMemberIds, setSelectedMemberIds] = useState([]);

  // Preview State
  const [preview, setPreview] = useState(null);
  const [loadingPreview, setLoadingPreview] = useState(false);

  const [loadingPlans, setLoadingPlans] = useState(true);
  const [loadingMembers, setLoadingMembers] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Fetch plans on mount
  useEffect(() => {
    const fetchPlans = async () => {
      try {
        const res = await apiRequest('/api/insurance/get-all?limit=100');
        if (res.s === 1 && Array.isArray(res.r)) {
          setPlans(res.r);
        }
      } catch (err) {
        console.error(err);
      } finally {
        setLoadingPlans(false);
      }
    };
    fetchPlans();
  }, []);

  // When plan and dates change, fetch eligible married members
  useEffect(() => {
    if (!selectedPlan || !startDate || !endDate) {
      setMarriedMembers([]);
      setSelectedMemberIds([]);
      return;
    }

    const fetchPlanData = async () => {
      setLoadingMembers(true);
      try {
        const url = `/api/payment/available-married-members?plan_id=${selectedPlan}&start_date=${startDate}&end_date=${endDate}`;
        const marriagesRes = await apiRequest(url);
        if (marriagesRes.s === 1 && Array.isArray(marriagesRes.r)) {
          setMarriedMembers(marriagesRes.r);
        } else {
          setMarriedMembers([]);
        }

        // Clear previous selections
        setSelectedMemberIds([]);
      } catch (err) {
        console.error(err);
        showToast('Error loading eligible married members', 'error');
      } finally {
        setLoadingMembers(false);
      }
    };

    fetchPlanData();
  }, [selectedPlan, startDate, endDate]);

  const handleSelectAll = () => {
    if (selectedMemberIds.length === marriedMembers.length) {
      setSelectedMemberIds([]);
    } else {
      setSelectedMemberIds(marriedMembers.map(m => m.id));
    }
  };

  const toggleMember = (id) => {
    setSelectedMemberIds(prev => 
      prev.includes(id) ? prev.filter(mId => mId !== id) : [...prev, id]
    );
  };

  const pAmount = Number(perMarriageAmount) || 0;

  // Preview API calculation
  useEffect(() => {
    const fetchPreview = async () => {
      if (!selectedPlan || selectedMemberIds.length === 0 || pAmount <= 0 || !startDate || !endDate) {
        setPreview(null);
        return;
      }
      
      setLoadingPreview(true);
      try {
        const payload = {
          plan_id: selectedPlan,
          married_member_ids: selectedMemberIds,
          per_marriage_amount: pAmount,
          start_date: startDate,
          end_date: endDate
        };
        const res = await apiRequest('/api/payment/preview', {
          method: 'POST',
          body: JSON.stringify(payload)
        });
        if (res.s === 1) {
          setPreview(res.r);
        } else {
          setPreview(null);
        }
      } catch (err) {
        console.error(err);
        setPreview(null);
      } finally {
        setLoadingPreview(false);
      }
    };
    
    const timeoutId = setTimeout(() => {
      fetchPreview();
    }, 500); // debounce 500ms
    
    return () => clearTimeout(timeoutId);
  }, [selectedPlan, selectedMemberIds, pAmount, startDate, endDate]);

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!selectedPlan) return showToast('Please select a plan', 'error');
    if (selectedMemberIds.length === 0) return showToast('Please select at least one married member', 'error');
    if (pAmount <= 0) return showToast('Please enter a valid per marriage amount', 'error');
    if (!startDate || !endDate) return showToast('Please select a valid date range', 'error');
    if (new Date(endDate) < new Date(startDate)) return showToast('End Date must be after Start Date', 'error');
    if (!dueDate) return showToast('Please select a due date', 'error');

    setSubmitting(true);
    try {
      const payload = {
        plan_id: selectedPlan,
        per_marriage_amount: pAmount,
        start_date: startDate,
        end_date: endDate,
        due_date: dueDate,
        married_member_ids: selectedMemberIds
      };

      const res = await apiRequest('/api/payment/create', {
        method: 'POST',
        body: JSON.stringify(payload)
      });

      if (res.s === 1) {
        showToast('Payment Campaign created successfully', 'success');
        if (res.r && res.r.id) {
          router.push(`/payments/${res.r.id}`);
        } else {
          router.push('/payments');
        }
      } else {
        showToast(res.m || 'Failed to create campaign', 'error');
      }
    } catch (err) {
      console.error(err);
      showToast('Error creating campaign', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const getMemberName = (item) => {
    if (!item) return '-';
    return [item.first_name, item.middle_name, item.last_name].filter(Boolean).join(" ") || '-';
  };

  return (
    <div style={{ maxWidth: '1000px', margin: '0 auto', paddingBottom: '60px' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '24px' }}>
        <button onClick={() => router.push('/payments')} className="btn-secondary" style={{ padding: '8px' }}>
          <ArrowLeft size={18} />
        </button>
        <div>
          <h1 style={{ fontSize: '1.6rem', fontWeight: '800', color: '#0f172a', letterSpacing: '-0.02em' }}>Create Payment Campaign</h1>
          <p style={{ color: '#64748b', fontSize: '0.85rem' }}>Generate pending dues for active members based on specific date periods.</p>
        </div>
      </div>

      <div className="grid-r-split-2-1" style={{ alignItems: 'start' }}>
        {/* Left Column - Form */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          <form onSubmit={handleSubmit} className="premium-card" style={{ padding: '24px' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
              
              {/* Step 1: Select Plan */}
              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: '700', color: '#334155', marginBottom: '8px' }}>1. Select Plan *</label>
                <select 
                  value={selectedPlan} 
                  onChange={e => setSelectedPlan(e.target.value)}
                  required
                  className="premium-input"
                  style={{ width: '100%' }}
                >
                  <option value="">Select a Plan</option>
                  {plans.map(p => (
                    <option key={p.id} value={p.id}>{p.name}</option>
                  ))}
                </select>
              </div>

              {/* Step 2: Select Married Members */}
              {selectedPlan && (
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: '8px' }}>
                    <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: '700', color: '#334155' }}>2. Select Married Members *</label>
                    {marriedMembers.length > 0 && (
                      <button type="button" onClick={handleSelectAll} style={{ background: 'none', border: 'none', color: '#0ea5e9', fontSize: '0.75rem', fontWeight: '700', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px' }}>
                        {selectedMemberIds.length === marriedMembers.length ? <CheckSquare size={14} /> : <Square size={14} />}
                        Select All
                      </button>
                    )}
                  </div>
                  
                  <div style={{ border: '1px solid #e2e8f0', borderRadius: '8px', maxHeight: '300px', overflowY: 'auto', background: '#f8fafc' }}>
                    {loadingMembers ? (
                      <div style={{ padding: '20px', textAlign: 'center', color: '#64748b', fontSize: '0.8rem' }}>Loading married members...</div>
                    ) : marriedMembers.length === 0 ? (
                      <div style={{ padding: '20px', textAlign: 'center', color: '#64748b', fontSize: '0.8rem' }}>No eligible married members available for selected period.</div>
                    ) : (
                      <div style={{ display: 'flex', flexDirection: 'column' }}>
                        {marriedMembers.map(item => (
                          <label key={item.id} style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '12px 16px', borderBottom: '1px solid #e2e8f0', cursor: 'pointer', background: selectedMemberIds.includes(item.id) ? '#f0f9ff' : 'transparent', transition: 'background 0.2s' }}>
                            <input 
                              type="checkbox" 
                              checked={selectedMemberIds.includes(item.id)}
                              onChange={() => toggleMember(item.id)}
                              style={{ width: '16px', height: '16px', accentColor: '#0ea5e9' }}
                            />
                            <div>
                              <div style={{ fontSize: '0.85rem', fontWeight: '700', color: '#0f172a' }}>{getMemberName(item)}</div>
                              <div style={{ fontSize: '0.72rem', color: '#64748b' }}>Code: {item.member_code || '-'} | Marriage Date: {item.marriage_date ? item.marriage_date.split('T')[0] : '-'}</div>
                            </div>
                          </label>
                        ))}
                      </div>
                    )}
                  </div>
                  <div style={{ fontSize: '0.75rem', color: '#64748b', marginTop: '6px' }}>{selectedMemberIds.length} member(s) selected</div>
                </div>
              )}

              {/* Step 3: Dates */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: '700', color: '#334155', marginBottom: '8px' }}>3. Campaign Start Date *</label>
                  <input 
                    type="date"
                    required
                    value={startDate}
                    onChange={e => setStartDate(e.target.value)}
                    className="premium-input"
                    style={{ width: '100%' }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: '700', color: '#334155', marginBottom: '8px' }}>4. Campaign End Date *</label>
                  <input 
                    type="date"
                    required
                    value={endDate}
                    onChange={e => setEndDate(e.target.value)}
                    className="premium-input"
                    style={{ width: '100%' }}
                  />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: '700', color: '#334155', marginBottom: '8px' }}>5. Per Marriage Amount (₹) *</label>
                  <input 
                    type="number"
                    required
                    min="1"
                    value={perMarriageAmount}
                    onChange={e => setPerMarriageAmount(e.target.value)}
                    className="premium-input"
                    style={{ width: '100%' }}
                    placeholder="e.g. 100"
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: '700', color: '#334155', marginBottom: '8px' }}>6. Final Due Date *</label>
                  <input 
                    type="date"
                    required
                    value={dueDate}
                    onChange={e => setDueDate(e.target.value)}
                    className="premium-input"
                    style={{ width: '100%' }}
                  />
                </div>
              </div>

              {/* Submit Button */}
              <button 
                type="submit" 
                disabled={submitting || !selectedPlan || selectedMemberIds.length === 0 || pAmount <= 0 || !startDate || !endDate || !dueDate || loadingPreview}
                className="btn-primary" 
                style={{ width: '100%', padding: '12px', fontSize: '0.9rem', justifyContent: 'center', marginTop: '10px' }}
              >
                {submitting ? 'Creating Campaign...' : <><Save size={16} /> Create Campaign</>}
              </button>

            </div>
          </form>
        </div>

        {/* Right Column - Preview */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          <div className="premium-card" style={{ padding: '24px', background: 'linear-gradient(180deg, #f8fafc 0%, #ffffff 100%)' }}>
            <h2 style={{ fontSize: '1rem', fontWeight: '800', color: '#0f172a', marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '8px', borderBottom: '1px solid #e2e8f0', paddingBottom: '12px' }}>
              <Calculator size={18} color="#0ea5e9" />
              Calculation Preview
            </h2>

            {loadingPreview ? (
              <div style={{ padding: '20px', textAlign: 'center', color: '#64748b', fontSize: '0.9rem' }}>Calculating deduplication...</div>
            ) : preview ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: '0.85rem', color: '#64748b', fontWeight: '600' }}>Selected Marriages:</span>
                  <span style={{ fontSize: '1.1rem', color: '#0f172a', fontWeight: '800' }}>{preview.marriedCount}</span>
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: '0.85rem', color: '#64748b', fontWeight: '600' }}>Per Marriage Amount:</span>
                  <span style={{ fontSize: '1.1rem', color: '#0f172a', fontWeight: '800' }}>{formatCurrency(preview.perMarriageAmount)}</span>
                </div>

                <div style={{ height: '1px', background: '#e2e8f0', margin: '4px 0' }}></div>

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: '0.85rem', color: '#64748b', fontWeight: '600' }}>Member Payable Amount:</span>
                  <span style={{ fontSize: '1.2rem', color: '#1d4ed8', fontWeight: '800' }}>{formatCurrency(preview.memberPayableAmount)}</span>
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '12px' }}>
                  <span style={{ fontSize: '0.85rem', color: '#64748b', fontWeight: '600' }}>Total Active Members:</span>
                  <span style={{ fontSize: '1.1rem', color: '#0f172a', fontWeight: '800', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <Users size={16} color="#64748b" /> {preview.totalActiveMembers}
                  </span>
                </div>

                <div style={{ background: '#f8fafc', padding: '12px', borderRadius: '8px', border: '1px solid #e2e8f0', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontSize: '0.8rem', color: '#64748b' }}>Already Paid Members:</span>
                    <span style={{ fontSize: '0.9rem', color: '#166534', fontWeight: '700' }}>{preview.alreadyPaidCount}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontSize: '0.8rem', color: '#64748b' }}>Already Pending Members:</span>
                    <span style={{ fontSize: '0.9rem', color: '#b45309', fontWeight: '700' }}>{preview.alreadyPendingCount}</span>
                  </div>
                  <div style={{ height: '1px', background: '#e2e8f0' }}></div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontSize: '0.85rem', color: '#0f172a', fontWeight: '700' }}>New Dues To Create:</span>
                    <span style={{ fontSize: '1rem', color: '#0ea5e9', fontWeight: '800' }}>{preview.newDuesCount}</span>
                  </div>
                </div>

                <div style={{ background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: '12px', padding: '16px', marginTop: '12px' }}>
                  <span style={{ fontSize: '0.75rem', color: '#166534', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Total Collectable Amount</span>
                  <div style={{ fontSize: '1.6rem', color: '#15803d', fontWeight: '900', marginTop: '4px', letterSpacing: '-0.02em' }}>
                    {formatCurrency(preview.totalCollectableAmount)}
                  </div>
                </div>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '12px', padding: '20px', color: '#94a3b8' }}>
                <Info size={32} />
                <p style={{ fontSize: '0.85rem', textAlign: 'center' }}>Fill out all required fields to see the deduplication preview.</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
