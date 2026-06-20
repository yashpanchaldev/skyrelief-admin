'use client';
import { useState, useEffect, use } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Phone, MapPin, Mail, Edit, Info, FileText, CreditCard, Calendar, Users, Ban, Trash2, Eye, EyeOff, Copy, Key, Heart } from 'lucide-react';
import { apiRequest, formatCurrency, showToast } from '@/lib/api';

const statusStyle = {
  1: { bg: '#dcfce7', color: '#15803d', label: 'Active', class: 'active' },
  0: { bg: '#fef3c7', color: '#92400e', label: 'Suspended', class: 'pending' },
  2: { bg: '#fef3c7', color: '#92400e', label: 'Suspended', class: 'pending' },
  '-1': { bg: '#fee2e2', color: '#991b1b', label: 'Deleted', class: 'inactive' },
};

const BASE_API_URL = process.env.NEXT_PUBLIC_API_URL || 'https://api.skyrelief.org';

export default function MemberProfilePage({ params: paramsPromise }) {
  const router = useRouter();
  const params = use(paramsPromise);
  const { memberId } = params;

  const [member, setMember] = useState(null);
  const [plans, setPlans] = useState([]);
  const [agents, setAgents] = useState([]);
  const [loading, setLoading] = useState(true);

  // Zoom lightbox state
  const [zoomImage, setZoomImage] = useState(null);
  const [zoomTitle, setZoomTitle] = useState('');

  // Password state
  const [passwordData, setPasswordData] = useState(null);
  const [loadingPassword, setLoadingPassword] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const fetchPassword = async (userId) => {
    if (!userId) return;
    setLoadingPassword(true);
    try {
      const res = await apiRequest(`/api/user/get-password?user_id=${userId}`);
      if (res.s === 1 && res.r) {
        setPasswordData(res.r?.password || (typeof res.r === 'string' ? res.r : res.r?.password_text || null));
      } else {
        setPasswordData(null);
      }
    } catch (err) {
      console.error('Error fetching password:', err);
      setPasswordData(null);
    } finally {
      setLoadingPassword(false);
    }
  };

  // Delete & Suspend confirmation states
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [confirmSuspend, setConfirmSuspend] = useState(false);

  const loadData = async () => {
    setLoading(true);
    try {
      // Fetch dropdown dependencies
      const [plansRes, agentsRes] = await Promise.all([
        apiRequest('/api/insurance/get-all?limit=100').catch(() => ({ s: 0, r: [] })),
        apiRequest('/api/agent/get-all?limit=100').catch(() => ({ s: 0, r: [] }))
      ]);
      
      if (plansRes.s === 1 && Array.isArray(plansRes.r)) {
        setPlans(plansRes.r);
      }
      if (agentsRes.s === 1 && Array.isArray(agentsRes.r)) {
        setAgents(agentsRes.r);
      }

      // Fetch member profile
      const res = await apiRequest(`/api/member/get?id=${memberId}`);
      if (res.s === 1 && res.r) {
        const memberData = Array.isArray(res?.r) ? res.r[0] : res?.r;
        if (memberData) {
          setMember(memberData);
          const userId = memberData.user_id;
          if (userId) {
            fetchPassword(userId);
          }
        } else {
          showToast('Member not found.', 'error');
        }
      } else {
        showToast(res.m || 'Failed to fetch member details.', 'error');
      }
    } catch (err) {
      console.error('Error loading member profile:', err);
      showToast('Error loading member profile details.', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [memberId]);

  const handleToggleSuspend = async () => {
    const nextStatus = member.status === 1 ? 0 : 1; // Toggle between active 1 and suspended 0
    try {
      const formData = new FormData();
      formData.append('id', memberId);
      formData.append('status', String(nextStatus));

      const res = await apiRequest('/api/member/status', {
        method: 'POST',
        body: formData,
      });

      if (res.s === 1) {
        showToast('Member status updated successfully', 'success');
        setConfirmSuspend(false);
        loadData();
      } else {
        const resJson = await apiRequest('/api/member/status', {
          method: 'POST',
          body: JSON.stringify({ id: memberId, status: nextStatus }),
        });
        if (resJson.s === 1) {
          showToast('Member status updated successfully', 'success');
          setConfirmSuspend(false);
          loadData();
        } else {
          showToast(resJson.m || 'Failed to update status', 'error');
        }
      }
    } catch (err) {
      console.error('Error toggling status:', err);
    }
  };

  const handleDeleteMember = async () => {
    try {
      const res = await apiRequest('/api/member/delete', {
        method: 'POST',
        body: JSON.stringify({ id: memberId, member_id: memberId })
      });
      if (res.s === 1) {
        showToast('Member deleted successfully', 'success');
        router.push('/members');
      } else {
        showToast(res.m || 'Failed to delete member', 'error');
      }
    } catch (err) {
      console.error('Error deleting member:', err);
    }
  };

  if (loading) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '60vh', gap: '12px' }}>
        <div className="spinner" style={{ width: '40px', height: '40px', border: '4px solid #f1f5f9', borderTopColor: '#0ea5e9', borderRadius: '50%', animation: 'spin 1s linear infinite' }} />
        <span style={{ fontSize: '0.875rem', fontWeight: '600', color: '#64748b' }}>Loading member profile...</span>
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  if (!member) {
    return (
      <div style={{ padding: '40px', textAlign: 'center', background: '#fff', borderRadius: '16px', border: '1.5px solid #bee3f8', maxWidth: '600px', margin: '40px auto' }}>
        <div style={{ fontSize: '2rem', marginBottom: '10px' }}>⚠️</div>
        <h2 style={{ fontSize: '1.2rem', fontWeight: '800', color: '#0f172a', marginBottom: '8px' }}>Member Not Found</h2>
        <p style={{ color: '#64748b', fontSize: '0.82rem', marginBottom: '20px' }}>The member you are looking for does not exist or has been deleted.</p>
        <button onClick={() => router.push('/members')} className="btn-secondary">
          <ArrowLeft size={16} /> <span>Back to Members</span>
        </button>
      </div>
    );
  }

  const firstName = member.first_name || '—';
  const middleName = member.middle_name || '—';
  const lastName = member.last_name || '—';
  const fullName = member.full_name || 'Member';
  const initials = `${firstName !== '—' && firstName ? firstName[0] : ''}${lastName !== '—' && lastName ? lastName[0] : ''}`.toUpperCase() || 'MB';
  
  const displayStatus = member.insurance_status_text || 'Pending';
  const statusClass = 
    displayStatus === 'Active' ? 'active' : 
    displayStatus === 'Married' ? 'active' : 
    displayStatus === 'Removed' ? 'inactive' : 'pending';

  const getImageUrl = (path) => {
    if (!path || path === "null" || path === "undefined") return "";
    let clean = String(path).trim();
    if (!clean) return "";
    if (clean.startsWith("http")) return clean;
    clean = clean.replace(/^\/uploads\/uploads\//, "/uploads/");
    if (!clean.startsWith("/")) clean = "/" + clean;
    return `${BASE_API_URL}${clean}`;
  };

  const profilePhotoUrl = getImageUrl(member.profile);
  const panDocUrl = getImageUrl(member.pan_img);
  const aaFrontUrl = getImageUrl(member.aadhaar_front);
  const aaBackUrl = getImageUrl(member.aadhaar_back);

  const planName = member.plan_name || '—';
  const agentName = member.agent_name || '—';
  const agentCode = member.agent_code || '—';

  const formatDate = (dateStr) => {
    if (!dateStr) return '—';
    try {
      const d = new Date(dateStr);
      if (isNaN(d.getTime())) return '—';
      return d.toISOString().split('T')[0];
    } catch {
      return '—';
    }
  };

  const formatAmount = (amt) => {
    if (!amt) return '—';
    return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(amt);
  };

  return (
    <div>
      {/* Back Button */}
      <button 
        onClick={() => router.push('/members')} 
        className="btn-secondary"
        style={{ marginBottom: '20px', padding: '6px 14px', borderRadius: '9999px' }}
      >
        <ArrowLeft size={16} strokeWidth={2.5} /> 
        <span>Back to Member List</span>
      </button>

      {/* Header Profile Box */}
      <div className="premium-card" style={{ display: 'flex', gap: '24px', alignItems: 'center', marginBottom: '24px', padding: '24px', position: 'relative', overflow: 'hidden' }}>
        <div style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '48px', background: 'var(--primary-gradient)' }}></div>

        <div style={{ position: 'relative', zIndex: 1, marginTop: '20px' }}>
          {profilePhotoUrl ? (
            <img 
              src={profilePhotoUrl} 
              alt={fullName}
              onClick={() => { setZoomImage(profilePhotoUrl); setZoomTitle('Profile Photo'); }}
              style={{ 
                width: '72px', height: '72px', 
                borderRadius: '50%', 
                border: '3px solid white',
                boxShadow: 'var(--shadow-md)',
                objectFit: 'cover',
                cursor: 'zoom-in'
              }}
            />
          ) : (
            <div style={{ 
              width: '72px', height: '72px', 
              borderRadius: '50%', 
              background: '#0ea5e9', color: 'white', 
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: '1.4rem', fontWeight: '800', border: '3px solid white',
              boxShadow: 'var(--shadow-md)'
            }}>
              {initials}
            </div>
          )}
        </div>

        <div style={{ flex: 1, position: 'relative', zIndex: 1, marginTop: '20px', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '16px' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
              <h1 style={{ fontSize: '1.35rem', fontWeight: '800', color: 'var(--text-dark)', letterSpacing: '-0.02em', lineHeight: 1.1 }}>{fullName}</h1>
              <span className={`status-badge ${statusClass}`} style={{ fontSize: '0.65rem' }}>
                ● {displayStatus} Member
              </span>
            </div>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.75rem', fontWeight: '600', display: 'flex', gap: '16px', alignItems: 'center', marginTop: '6px', flexWrap: 'wrap' }}>
              <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}><CreditCard size={14} /> Code: {member.member_code || member.member_id || '—'}</span>
              <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}><Users size={14} /> Agent: {agentName} ({agentCode})</span>
            </p>
          </div>
          
          {/* Action Buttons */}
          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
            <button className="btn-secondary" onClick={() => router.push(`/members/form?id=${memberId}`)} style={{ color: 'var(--primary)', padding: '6px 12px', fontSize: '0.75rem' }}>
              <Edit size={14} /> <span>Edit Member</span>
            </button>
            <button className="btn-secondary" onClick={() => setConfirmSuspend(true)} style={{ color: member.status === 1 ? 'var(--warning)' : 'var(--success)', padding: '6px 12px', fontSize: '0.75rem' }}>
              <Ban size={14} />
              <span>{member.status === 1 ? 'Suspend' : 'Reactivate'}</span>
            </button>
            <button className="btn-secondary" onClick={() => setConfirmDelete(true)} style={{ color: 'var(--danger)', padding: '6px 12px', fontSize: '0.75rem' }}>
              <Trash2 size={14} /> <span>Delete Member</span>
            </button>
          </div>
        </div>
      </div>

      {/* Main Grid */}
      <div className="grid-r-split-2-1" style={{ alignItems: 'start' }}>
        
        {/* Left Column - Details */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          
          {/* Card 1: Profile Information */}
          <div className="premium-card" style={{ padding: '20px' }}>
            <h2 style={{ fontSize: '0.95rem', fontWeight: '800', color: 'var(--text-dark)', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px', borderBottom: '1px solid var(--border)', paddingBottom: '8px' }}>
              <Info size={16} color="var(--primary)" />
              <span>Profile Information</span>
            </h2>
            
            <div className="grid-r-2" style={{ gap: '12px', fontSize: '0.8rem' }}>
              <div>
                <span style={{ color: 'var(--text-muted)', fontWeight: '600' }}>First Name:</span>
                <span style={{ color: 'var(--text-dark)', fontWeight: '700', marginLeft: '6px' }}>{firstName}</span>
              </div>
              <div>
                <span style={{ color: 'var(--text-muted)', fontWeight: '600' }}>Middle Name:</span>
                <span style={{ color: 'var(--text-dark)', fontWeight: '700', marginLeft: '6px' }}>{middleName}</span>
              </div>
              <div>
                <span style={{ color: 'var(--text-muted)', fontWeight: '600' }}>Last Name:</span>
                <span style={{ color: 'var(--text-dark)', fontWeight: '700', marginLeft: '6px' }}>{lastName}</span>
              </div>
              <div>
                <span style={{ color: 'var(--text-muted)', fontWeight: '600' }}>Gender:</span>
                <span style={{ color: 'var(--text-dark)', fontWeight: '700', marginLeft: '6px' }}>{member.gender || '—'}</span>
              </div>
              <div>
                <span style={{ color: 'var(--text-muted)', fontWeight: '600' }}>Date of Birth:</span>
                <span style={{ color: 'var(--text-dark)', fontWeight: '700', marginLeft: '6px' }}>{formatDate(member.dob)}</span>
              </div>
              <div>
                <span style={{ color: 'var(--text-muted)', fontWeight: '600' }}>Age:</span>
                <span style={{ color: 'var(--text-dark)', fontWeight: '700', marginLeft: '6px' }}>{member.age || '—'}</span>
              </div>
              <div>
                <span style={{ color: 'var(--text-muted)', fontWeight: '600' }}>Mobile:</span>
                <span style={{ color: 'var(--text-dark)', fontWeight: '700', marginLeft: '6px' }}><Phone size={11} style={{ display: 'inline', marginRight: '4px' }} />{member.phone || '—'}</span>
              </div>
              <div>
                <span style={{ color: 'var(--text-muted)', fontWeight: '600' }}>Alternate Mobile:</span>
                <span style={{ color: 'var(--text-dark)', fontWeight: '700', marginLeft: '6px' }}><Phone size={11} style={{ display: 'inline', marginRight: '4px' }} />{member.alt_mobile || '—'}</span>
              </div>
              <div>
                <span style={{ color: 'var(--text-muted)', fontWeight: '600' }}>Email Address:</span>
                <span style={{ color: 'var(--text-dark)', fontWeight: '700', marginLeft: '6px' }}><Mail size={11} style={{ display: 'inline', marginRight: '4px' }} />{member.email || '—'}</span>
              </div>
            </div>
          </div>

          {/* Card 2: Family Information */}
          <div className="premium-card" style={{ padding: '20px' }}>
            <h2 style={{ fontSize: '0.95rem', fontWeight: '800', color: 'var(--text-dark)', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px', borderBottom: '1px solid var(--border)', paddingBottom: '8px' }}>
              <Users size={16} color="var(--primary)" />
              <span>Family Information</span>
            </h2>
            <div className="grid-r-2" style={{ gap: '12px', fontSize: '0.8rem' }}>
              <div>
                <span style={{ color: 'var(--text-muted)', fontWeight: '600' }}>Guardian Name:</span>
                <span style={{ color: 'var(--text-dark)', fontWeight: '700', marginLeft: '6px' }}>{member.guardian || '—'}</span>
              </div>
              <div>
                <span style={{ color: 'var(--text-muted)', fontWeight: '600' }}>Guardian Relation:</span>
                <span style={{ color: 'var(--text-dark)', fontWeight: '700', marginLeft: '6px' }}>{member.relation || '—'}</span>
              </div>
              <div>
                <span style={{ color: 'var(--text-muted)', fontWeight: '600' }}>Father Name:</span>
                <span style={{ color: 'var(--text-dark)', fontWeight: '700', marginLeft: '6px' }}>{member.father || '—'}</span>
              </div>
              <div>
                <span style={{ color: 'var(--text-muted)', fontWeight: '600' }}>Mother Name:</span>
                <span style={{ color: 'var(--text-dark)', fontWeight: '700', marginLeft: '6px' }}>{member.mother || '—'}</span>
              </div>
            </div>
          </div>

          {/* Card 3: Address Details */}
          <div className="premium-card" style={{ padding: '20px' }}>
            <h2 style={{ fontSize: '0.95rem', fontWeight: '800', color: 'var(--text-dark)', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px', borderBottom: '1px solid var(--border)', paddingBottom: '8px' }}>
              <MapPin size={16} color="var(--primary)" />
              <span>Address Details</span>
            </h2>
            <div className="grid-r-2" style={{ gap: '12px', fontSize: '0.8rem' }}>
              <div style={{ gridColumn: 'span 2' }}>
                <span style={{ color: 'var(--text-muted)', fontWeight: '600' }}>Address:</span>
                <span style={{ color: 'var(--text-dark)', fontWeight: '700', marginLeft: '6px' }}>{member.address || '—'}</span>
              </div>
              <div>
                <span style={{ color: 'var(--text-muted)', fontWeight: '600' }}>Village / Landmark:</span>
                <span style={{ color: 'var(--text-dark)', fontWeight: '700', marginLeft: '6px' }}>{member.village || '—'}</span>
              </div>
              <div>
                <span style={{ color: 'var(--text-muted)', fontWeight: '600' }}>City:</span>
                <span style={{ color: 'var(--text-dark)', fontWeight: '700', marginLeft: '6px' }}>{member.city || '—'}</span>
              </div>
              <div>
                <span style={{ color: 'var(--text-muted)', fontWeight: '600' }}>State:</span>
                <span style={{ color: 'var(--text-dark)', fontWeight: '700', marginLeft: '6px' }}>{member.state || '—'}</span>
              </div>
              <div>
                <span style={{ color: 'var(--text-muted)', fontWeight: '600' }}>PIN Code:</span>
                <span style={{ color: 'var(--text-dark)', fontWeight: '700', marginLeft: '6px' }}>{member.pin || '—'}</span>
              </div>
            </div>
          </div>

          {/* Card 4: identity Documents */}
          <div className="premium-card" style={{ padding: '20px' }}>
            <h2 style={{ fontSize: '0.95rem', fontWeight: '800', color: 'var(--text-dark)', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px', borderBottom: '1px solid var(--border)', paddingBottom: '8px' }}>
              <FileText size={16} color="var(--primary)" />
              <span>KYC Identity Documents</span>
            </h2>
            
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '16px' }}>
              {/* Aadhaar Front */}
              {(() => {
                const imgUrl = aaFrontUrl || null;
                return (
                  <div style={{ border: '1px solid var(--border)', padding: '12px', borderRadius: '8px', backgroundColor: '#f8fafc', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'space-between', minHeight: '190px' }}>
                    <div style={{ width: '100%', textAlign: 'center' }}>
                      <span style={{ fontSize: '0.75rem', fontWeight: '700', color: 'var(--text-muted)', marginBottom: '8px', display: 'block' }}>Aadhaar Card (Front)</span>
                      {imgUrl ? (
                        <img 
                          src={imgUrl} 
                          alt="Aadhaar Front"
                          style={{ width: '100%', height: '110px', objectFit: 'contain', borderRadius: '4px', border: '1px solid var(--border)', cursor: 'zoom-in' }}
                          onClick={() => { setZoomImage(imgUrl); setZoomTitle('Aadhaar Card (Front)'); }}
                        />
                      ) : (
                        <div style={{ height: '110px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)', fontSize: '0.72rem', background: '#f1f5f9', width: '100%', borderRadius: '4px', border: '1px dashed var(--border)' }}>
                          <span>No Document Uploaded</span>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })()}

              {/* Aadhaar Back */}
              {(() => {
                const imgUrl = aaBackUrl || null;
                return (
                  <div style={{ border: '1px solid var(--border)', padding: '12px', borderRadius: '8px', backgroundColor: '#f8fafc', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'space-between', minHeight: '190px' }}>
                    <div style={{ width: '100%', textAlign: 'center' }}>
                      <span style={{ fontSize: '0.75rem', fontWeight: '700', color: 'var(--text-muted)', marginBottom: '8px', display: 'block' }}>Aadhaar Card (Back)</span>
                      {imgUrl ? (
                        <img 
                          src={imgUrl} 
                          alt="Aadhaar Back"
                          style={{ width: '100%', height: '110px', objectFit: 'contain', borderRadius: '4px', border: '1px solid var(--border)', cursor: 'zoom-in' }}
                          onClick={() => { setZoomImage(imgUrl); setZoomTitle('Aadhaar Card (Back)'); }}
                        />
                      ) : (
                        <div style={{ height: '110px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)', fontSize: '0.72rem', background: '#f1f5f9', width: '100%', borderRadius: '4px', border: '1px dashed var(--border)' }}>
                          <span>No Document Uploaded</span>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })()}

              {/* PAN Card */}
              {(() => {
                const imgUrl = panDocUrl || null;
                return (
                  <div style={{ border: '1px solid var(--border)', padding: '12px', borderRadius: '8px', backgroundColor: '#f8fafc', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'space-between', minHeight: '190px' }}>
                    <div style={{ width: '100%', textAlign: 'center' }}>
                      <span style={{ fontSize: '0.75rem', fontWeight: '700', color: 'var(--text-muted)', marginBottom: '8px', display: 'block' }}>PAN Card</span>
                      {imgUrl ? (
                        <img 
                          src={imgUrl} 
                          alt="PAN Image"
                          style={{ width: '100%', height: '110px', objectFit: 'contain', borderRadius: '4px', border: '1px solid var(--border)', cursor: 'zoom-in' }}
                          onClick={() => { setZoomImage(imgUrl); setZoomTitle('PAN Card Image'); }}
                        />
                      ) : (
                        <div style={{ height: '110px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)', fontSize: '0.72rem', background: '#f1f5f9', width: '100%', borderRadius: '4px', border: '1px dashed var(--border)' }}>
                          <span>No Document Uploaded</span>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })()}
            </div>
          </div>

        </div>

        {/* Right Column - Status/Insurance Sidebar */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          
          {/* Card 5: Insurance Info */}
          <div className="premium-card" style={{ padding: '20px' }}>
            <h2 style={{ fontSize: '0.85rem', fontWeight: '800', color: 'var(--text-dark)', marginBottom: '14px', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Insurance Details</h2>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', fontSize: '0.8rem' }}>
              <div style={{ background: '#f8fafc', borderRadius: '10px', padding: '10px 12px', border: '1px solid var(--border)' }}>
                <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', fontWeight: '700', display: 'block', marginBottom: '2px' }}>Insurance Plan</span>
                <span style={{ fontSize: '0.85rem', fontWeight: '750', color: '#0f172a' }}>{planName}</span>
              </div>
              <div style={{ background: '#f0fdf4', borderRadius: '10px', padding: '10px 12px', border: '1px solid #bbf7d0' }}>
                <span style={{ fontSize: '0.7rem', color: '#166534', fontWeight: '700', display: 'block', marginBottom: '2px' }}>Joining Fees Paid</span>
                <span style={{ fontSize: '1.1rem', fontWeight: '800', color: '#15803d' }}>{formatAmount(member.joining_amount)}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', borderTop: '1px solid #f1f5f9', paddingTop: '8px' }}>
                <span style={{ color: 'var(--text-muted)', fontWeight: '600' }}>Agent Name:</span>
                <span style={{ color: 'var(--text-dark)', fontWeight: '700' }}>{agentName}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: 'var(--text-muted)', fontWeight: '600' }}>Agent Code:</span>
                <span style={{ color: 'var(--text-dark)', fontWeight: '700' }}>{agentCode}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: 'var(--text-muted)', fontWeight: '600' }}>Enrollment Date:</span>
                <span style={{ color: 'var(--text-dark)', fontWeight: '700' }}>{formatDate(member.joining_date)}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: 'var(--text-muted)', fontWeight: '600' }}>Insurance Status:</span>
                <span style={{ color: member.insurance_status_text === 'Active' ? '#15803d' : member.insurance_status_text === 'Removed' ? '#991b1b' : '#92400e', fontWeight: '700' }}>{member.insurance_status_text || '—'}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: 'var(--text-muted)', fontWeight: '600' }}>Marriage Status:</span>
                <span style={{ color: member.marriage_status_text === 'Married' ? '#1e3a8a' : member.marriage_status_text === 'Upcoming' ? '#c2410c' : '#475569', fontWeight: '700' }}>{member.marriage_status_text || '—'}</span>
              </div>
            </div>
          </div>

          {/* Card 6: Marriage Information */}
          <div className="premium-card" style={{ padding: '20px' }}>
            <h2 style={{ fontSize: '0.85rem', fontWeight: '800', color: 'var(--text-dark)', marginBottom: '14px', textTransform: 'uppercase', letterSpacing: '0.04em', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <Heart size={14} color="#e11d48" />
              Marriage Information
            </h2>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', fontSize: '0.8rem' }}>
              {!member.is_married && member.marriage_status_text !== 'Upcoming' ? (
                <div style={{ padding: '12px', background: '#f1f5f9', borderRadius: '8px', color: '#64748b', textAlign: 'center', fontWeight: '600' }}>
                  No Marriage Record
                </div>
              ) : (
                <>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: 'var(--text-muted)', fontWeight: '600' }}>Marriage Status:</span>
                    <span style={{ color: member.marriage_status_text === 'Married' ? '#e11d48' : '#c2410c', fontWeight: '700' }}>
                      {member.marriage_status_text || '—'}
                    </span>
                  </div>
                  {member.marriage_date && (
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span style={{ color: 'var(--text-muted)', fontWeight: '600' }}>Marriage Date:</span>
                      <span style={{ color: 'var(--text-dark)', fontWeight: '700' }}>{formatDate(member.marriage_date)}</span>
                    </div>
                  )}
                </>
              )}
            </div>
          </div>

          {/* Card 6: Additional Information */}
          <div className="premium-card" style={{ padding: '20px' }}>
            <h2 style={{ fontSize: '0.85rem', fontWeight: '800', color: 'var(--text-dark)', marginBottom: '14px', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Additional Information</h2>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', fontSize: '0.8rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: 'var(--text-muted)', fontWeight: '600' }}>Occupation:</span>
                <span style={{ color: 'var(--text-dark)', fontWeight: '700' }}>{member.occupation || '—'}</span>
              </div>
              <div>
                <span style={{ color: 'var(--text-muted)', fontWeight: '600', display: 'block', marginBottom: '4px' }}>Administrative Notes:</span>
                <p style={{ color: 'var(--text-dark)', background: '#f8fafc', padding: '8px 10px', borderRadius: '6px', border: '1px solid var(--border)', fontSize: '0.78rem', lineHeight: 1.4 }}>{member.notes || 'No notes available.'}</p>
              </div>
            </div>
          </div>

          {/* Card 7: KYC Meta */}
          <div className="premium-card" style={{ padding: '20px' }}>
            <h2 style={{ fontSize: '0.85rem', fontWeight: '800', color: 'var(--text-dark)', marginBottom: '14px', textTransform: 'uppercase', letterSpacing: '0.04em' }}>KYC Metadata</h2>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '0.8rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: 'var(--text-muted)', fontWeight: '600' }}>Aadhaar No:</span>
                <span style={{ color: 'var(--text-dark)', fontWeight: '700' }}>{member.aadhaar || '—'}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: 'var(--text-muted)', fontWeight: '600' }}>PAN Number:</span>
                <span style={{ color: 'var(--text-dark)', fontWeight: '700', textTransform: 'uppercase' }}>{member.pan || '—'}</span>
              </div>
            </div>
          </div>

          {/* Card 8: Login Information */}
          <div className="premium-card" style={{ padding: '20px' }}>
            <h2 style={{ fontSize: '0.85rem', fontWeight: '800', color: 'var(--text-dark)', marginBottom: '14px', textTransform: 'uppercase', letterSpacing: '0.04em', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <Key size={14} color="var(--primary)" />
              Login Information
            </h2>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', fontSize: '0.8rem' }}>
              <span style={{ color: 'var(--text-muted)', fontWeight: '600' }}>Password:</span>
              {loadingPassword ? (
                <div style={{ color: '#0ea5e9', fontWeight: '600' }}>Loading password...</div>
              ) : !passwordData ? (
                <div style={{ color: '#94a3b8', fontWeight: '600' }}>Password not available</div>
              ) : (
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <div style={{ 
                    flex: 1, 
                    background: '#f8fafc', 
                    padding: '8px 12px', 
                    borderRadius: '8px', 
                    border: '1px solid var(--border)',
                    fontFamily: 'monospace',
                    fontSize: '0.9rem',
                    fontWeight: '600',
                    color: 'var(--text-dark)'
                  }}>
                    {showPassword ? passwordData : '••••••••'}
                  </div>
                  <button 
                    onClick={() => setShowPassword(!showPassword)}
                    className="btn-secondary"
                    style={{ padding: '8px', borderRadius: '8px' }}
                    title={showPassword ? 'Hide Password' : 'Show Password'}
                  >
                    {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                  <button 
                    onClick={() => {
                      navigator.clipboard.writeText(passwordData);
                      showToast('Password copied!', 'success');
                    }}
                    className="btn-secondary"
                    style={{ padding: '8px', borderRadius: '8px' }}
                    title="Copy Password"
                  >
                    <Copy size={16} />
                  </button>
                </div>
              )}
            </div>
          </div>

        </div>

      </div>

      {/* Lightbox Zoom Modal */}
      {zoomImage && (
        <div 
          style={{ position: 'fixed', inset: 0, zIndex: 600, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(15,23,42,0.7)', backdropFilter: 'blur(4px)' }}
          onClick={() => setZoomImage(null)}
        >
          <div 
            style={{ position: 'relative', maxWidth: '85vw', maxHeight: '85vh', background: 'white', borderRadius: '16px', padding: '10px', boxShadow: '0 25px 50px -12px rgba(0,0,0,0.5)' }}
            onClick={e => e.stopPropagation()}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '6px 12px 10px', borderBottom: '1px solid #f1f5f9', marginBottom: '10px' }}>
              <span style={{ fontWeight: '800', fontSize: '0.875rem', color: '#0f172a' }}>{zoomTitle || 'Image Preview'}</span>
              <button 
                onClick={() => setZoomImage(null)}
                style={{ cursor: 'pointer', padding: '4px', fontWeight: '700', color: '#64748b', border: 'none', background: 'none', fontFamily: 'inherit' }}
              >
                Close (X)
              </button>
            </div>
            <img src={zoomImage} alt="Lightbox Zoom" style={{ maxWidth: '100%', maxHeight: '70vh', objectFit: 'contain', borderRadius: '8px' }} />
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {confirmDelete && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 500, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.4)' }} onClick={() => setConfirmDelete(false)} />
          <div style={{ position: 'relative', background: 'white', borderRadius: '16px', padding: '28px', width: '380px', boxShadow: '0 20px 60px rgba(0,0,0,0.2)' }}>
            <div style={{ fontSize: '2.2rem', textAlign: 'center', marginBottom: '10px' }}>⚠️</div>
            <div style={{ fontWeight: '800', fontSize: '1.1rem', color: '#0f172a', textAlign: 'center', marginBottom: '8px' }}>Delete Member</div>
            <div style={{ fontSize: '0.82rem', color: '#64748b', marginBottom: '22px', lineHeight: '1.4' }}>
              <p style={{ marginBottom: '8px', textAlign: 'center' }}>Are you sure you want to delete this member?</p>
              <p style={{ fontWeight: '700', color: '#334155', marginBottom: '6px' }}>This action will:</p>
              <ul style={{ listStyleType: 'disc', paddingLeft: '16px', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                <li>Soft delete member</li>
                <li>Disable login access</li>
                <li>Preserve insurance history</li>
                <li>Preserve payment records</li>
              </ul>
            </div>
            <div style={{ display: 'flex', gap: '10px' }}>
              <button onClick={() => setConfirmDelete(false)} className="btn-secondary" style={{ flex: 1, padding: '10px', borderRadius: '9999px', fontSize: '0.82rem' }}>Cancel</button>
              <button onClick={handleDeleteMember} className="btn-primary" style={{ flex: 1, padding: '10px', borderRadius: '9999px', background: '#ef4444', color: 'white', boxShadow: 'none', border: 'none', fontSize: '0.82rem' }}
                onMouseEnter={e => e.currentTarget.style.background = '#dc2626'}
                onMouseLeave={e => e.currentTarget.style.background = '#ef4444'}
              >Delete Member</button>
            </div>
          </div>
        </div>
      )}

      {/* Suspend Confirmation Modal */}
      {confirmSuspend && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 500, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.4)' }} onClick={() => setConfirmSuspend(false)} />
          <div style={{ position: 'relative', background: 'white', borderRadius: '16px', padding: '28px', width: '380px', boxShadow: '0 20px 60px rgba(0,0,0,0.2)' }}>
            <div style={{ fontSize: '2.2rem', textAlign: 'center', marginBottom: '10px' }}>⚠️</div>
            <div style={{ fontWeight: '800', fontSize: '1.1rem', color: '#0f172a', textAlign: 'center', marginBottom: '8px' }}>
              {member.status === 1 ? 'Suspend Member' : 'Reactivate Member'}
            </div>
            <div style={{ fontSize: '0.82rem', color: '#64748b', marginBottom: '22px', textAlign: 'center' }}>
              Are you sure you want to {member.status === 1 ? 'suspend' : 'reactivate'} this member's access?
            </div>
            <div style={{ display: 'flex', gap: '10px' }}>
              <button onClick={() => setConfirmSuspend(false)} className="btn-secondary" style={{ flex: 1, padding: '10px', borderRadius: '9999px', fontSize: '0.82rem' }}>Cancel</button>
              <button onClick={handleToggleSuspend} className="btn-primary" style={{ flex: 1, padding: '10px', borderRadius: '9999px', fontSize: '0.82rem' }}>Confirm</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
