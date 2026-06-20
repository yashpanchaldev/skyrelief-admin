'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { use } from 'react';
import { ArrowLeft, Phone, MapPin, Mail, Edit, Info, FileText, ShieldAlert, CreditCard, Calendar, Eye, Pencil, EyeOff, Copy, Key } from 'lucide-react';
import { apiRequest, showToast } from '@/lib/api';

const statusStyle = {
  1: { bg: '#dcfce7', color: '#15803d', label: 'Active', class: 'active' },
  0: { bg: '#fef3c7', color: '#92400e', label: 'Suspended', class: 'pending' },
  2: { bg: '#fef3c7', color: '#92400e', label: 'Suspended', class: 'pending' },
  '-1': { bg: '#fee2e2', color: '#991b1b', label: 'Deleted', class: 'inactive' },
};

const avatarColors = ['#0ea5e9', '#22c55e', '#8b5cf6', '#f59e0b', '#ef4444', '#06b6d4', '#ec4899', '#14b8a6'];

export default function AgentDetailsPage({ params: paramsPromise }) {
  const router = useRouter();
  const params = use(paramsPromise);
  const { agentId } = params;

  const [agent, setAgent] = useState(null);
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

  // Members state
  const [members, setMembers] = useState([]);
  const [plans, setPlans] = useState([]);
  const [membersMeta, setMembersMeta] = useState(null);
  const [membersPage, setMembersPage] = useState(1);
  const [loadingMembers, setLoadingMembers] = useState(false);

  // Tabs & Summary
  const [activeTab, setActiveTab] = useState('All');
  const [counts, setCounts] = useState({ all: 0, active: 0, upcoming: 0, married: 0 });

  const getBadge = (item) => {
    if (item.marriage_status === 2 || item.insurance_status === 2) {
      return { bg: '#dbeafe', color: '#1e3a8a', label: 'Married' };
    }
    if (item.marriage_status === 1) {
      return { bg: '#ffedd5', color: '#c2410c', label: 'Upcoming Marriage' };
    }
    if (item.insurance_status === 1) {
      return { bg: '#dcfce7', color: '#15803d', label: 'Active' };
    }
    if (item.insurance_status === 3) return { bg: '#f3e8ff', color: '#7e22ce', label: 'Invoice Generated' };
    if (item.insurance_status === -1) return { bg: '#fee2e2', color: '#991b1b', label: 'Removed' };
    return { bg: '#f1f5f9', color: '#475569', label: 'Unknown' };
  };

  const fetchPlans = async () => {
    try {
      const res = await apiRequest('/api/insurance/get-all?limit=100');
      if (res.s === 1 && Array.isArray(res.r)) {
        setPlans(res.r);
      }
    } catch (e) {
      console.error('Error fetching plans:', e);
    }
  };

  const fetchCounts = async () => {
    try {
      const [allRes, activeRes, upcomingRes, marriedRes] = await Promise.all([
        apiRequest(`/api/member/get-all?agent_id=${agentId}&limit=1`),
        apiRequest(`/api/member/get-all?agent_id=${agentId}&insurance_status=1&limit=1`),
        apiRequest(`/api/member/get-all?agent_id=${agentId}&marriage_status=1&limit=1`),
        apiRequest(`/api/member/get-all?agent_id=${agentId}&marriage_status=2&limit=1`)
      ]);
      setCounts({
        all: allRes?.meta?.total || 0,
        active: activeRes?.meta?.total || 0,
        upcoming: upcomingRes?.meta?.total || 0,
        married: marriedRes?.meta?.total || 0
      });
    } catch(err) {
      console.error("Error fetching counts:", err);
    }
  };

  const fetchMembers = async () => {
    setLoadingMembers(true);
    let query = `/api/member/get-all?page=${membersPage}&limit=10&agent_id=${agentId}`;
    if (activeTab === 'Active') query += '&insurance_status=1';
    if (activeTab === 'Upcoming') query += '&marriage_status=1';
    if (activeTab === 'Married') query += '&marriage_status=2';

    try {
      const res = await apiRequest(query);
      if (res.s === 1 && Array.isArray(res.r)) {
        setMembers(res.r);
        setMembersMeta(res.meta || null);
      } else {
        setMembers([]);
        setMembersMeta(null);
      }
    } catch (err) {
      console.error('Error fetching members:', err);
      setMembers([]);
      setMembersMeta(null);
    } finally {
      setLoadingMembers(false);
    }
  };

  const getMemberName = (item) => {
    const details = item.member_details || {};
    const fName = details.first_name || item.first_name || '';
    const lName = details.last_name || item.last_name || '';
    return `${fName} ${lName}`.replace(/\s+/g, ' ').trim() || item.name || 'Member';
  };

  const getMemberInitials = (item) => {
    const details = item.member_details || {};
    const fName = details.first_name || item.first_name || '';
    const lName = details.last_name || item.last_name || '';
    return `${fName?.[0] || ''}${lName?.[0] || ''}`.toUpperCase() || 'MB';
  };

  const getMemberProfileImage = (item) => {
    const details = item.member_details || {};
    const imgPath = details.profile_image || details.profile_photo || item.profile_photo || item.profile;
    return imgPath ? getMediaUrl(imgPath) : null;
  };

  const getPlanName = (item) => {
    const planId = item.plan_id;
    const matched = plans.find(p => String(p.id) === String(planId));
    if (matched) return matched.name;
    return item.scheme_name || item.scheme || 'N/A';
  };

  const getMarriageMemberName = (item) => {
    return [item.first_name, item.middle_name, item.last_name].filter(Boolean).join(' ') || item.name || 'Member';
  };

  const formatMarriageDate = (dateStr) => {
    if (!dateStr) return "N/A";
    try {
      const d = new Date(dateStr);
      if (isNaN(d.getTime())) return "N/A";
      const day = String(d.getDate()).padStart(2, '0');
      const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
      const month = months[d.getMonth()];
      const year = d.getFullYear();
      return `${day} ${month} ${year}`;
    } catch (e) {
      return "N/A";
    }
  };

  const loadData = async () => {
    setLoading(true);
    try {
      const res = await apiRequest(`/api/agent/get?id=${agentId}`);
      if (res.s === 1 && res.r) {
        setAgent(res.r);
        const userId = res.r.user_id || (res.r.agent_details && res.r.agent_details.user_id);
        if (userId) {
          fetchPassword(userId);
        }
      } else {
        showToast(res.m || 'Failed to fetch agent details.', 'error');
      }
    } catch (err) {
      console.error(err);
      showToast('Error loading agent details.', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
    fetchPlans();
  }, [agentId]);

  useEffect(() => {
    if (agent) {
      fetchCounts();
    }
  }, [agentId, agent]);

  useEffect(() => {
    if (agent) {
      fetchMembers();
    }
  }, [agentId, membersPage, activeTab, agent]);

  if (loading) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '60vh', gap: '12px' }}>
        <div className="spinner" style={{ width: '40px', height: '40px', border: '4px solid #f1f5f9', borderTopColor: '#0ea5e9', borderRadius: '50%', animation: 'spin 1s linear infinite' }} />
        <span style={{ fontSize: '0.875rem', fontWeight: '600', color: '#64748b' }}>Loading agent details...</span>
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  if (!agent) {
    return (
      <div style={{ padding: '40px', textAlign: 'center', background: '#fff', borderRadius: '16px', border: '1.5px solid #bee3f8', maxWidth: '600px', margin: '40px auto' }}>
        <div style={{ fontSize: '2rem', marginBottom: '10px' }}>⚠️</div>
        <h2 style={{ fontSize: '1.2rem', fontWeight: '800', color: '#0f172a', marginBottom: '8px' }}>Agent Not Found</h2>
        <p style={{ color: '#64748b', fontSize: '0.82rem', marginBottom: '20px' }}>The agent you are looking for does not exist or has been deleted.</p>
        <button onClick={() => router.push('/agents')} className="btn-secondary">
          <ArrowLeft size={16} /> <span>Back to Agents</span>
        </button>
      </div>
    );
  }

  const firstName = agent.first_name || '';
  const middleName = agent.middle_name || '';
  const lastName = agent.last_name || '';
  const fullName = `${firstName}${middleName ? ' ' + middleName : ''} ${lastName}`.trim() || 'Agent';
  const initials = `${firstName?.[0] || ''}${lastName?.[0] || ''}`.toUpperCase() || 'AG';
  const displayStatus = statusStyle[agent.status]?.label || 'Pending';
  const statusClass = statusStyle[agent.status]?.class || 'pending';

  const getMediaUrl = (path) => {
    if (!path) return '';
    if (path.startsWith('blob:') || path.startsWith('http:') || path.startsWith('https:')) return path;
    const base = process.env.NEXT_PUBLIC_API_URL || 'https://api.skyrelief.org';
    return `${base}${path.startsWith('/') ? '' : '/'}${path}`;
  };

  const profilePhotoUrl = getMediaUrl(agent.profile || agent.profile_photo);
  const matchedColor = avatarColors[Math.abs(fullName.charCodeAt(0) || 0) % avatarColors.length];

  return (
    <div>
      {/* Back Button */}
      <button 
        onClick={() => router.push('/agents')} 
        className="btn-secondary"
        style={{ marginBottom: '20px', padding: '6px 14px', borderRadius: '9999px' }}
      >
        <ArrowLeft size={16} strokeWidth={2.5} /> 
        <span>Back to Agent List</span>
      </button>

      {/* Header Profile Box */}
      <div className="premium-card" style={{ display: 'flex', gap: '24px', alignItems: 'center', marginBottom: '24px', padding: '24px', position: 'relative', overflow: 'hidden' }}>
        <div style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '48px', background: 'var(--primary-gradient)' }}></div>

        <div style={{ position: 'relative', zIndex: 1, marginTop: '20px' }}>
          {profilePhotoUrl ? (
            <img 
              src={profilePhotoUrl} 
              alt={fullName}
              onClick={() => setZoomImage(profilePhotoUrl)}
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
              background: matchedColor, color: 'white', 
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
                ● {displayStatus} Agent
              </span>
            </div>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.75rem', fontWeight: '600', display: 'flex', gap: '16px', alignItems: 'center', marginTop: '6px', flexWrap: 'wrap' }}>
              <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}><CreditCard size={14} /> Code: {agent.agent_code || 'Pending'}</span>
              <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}><Calendar size={14} /> Registered: {agent.created_at ? agent.created_at.split('T')[0] : 'N/A'}</span>
            </p>
          </div>
          
          {/* Action Button */}
          <div>
            <button className="btn-primary" onClick={() => router.push(`/agents/form?id=${agentId}`)} style={{ padding: '8px 16px', fontSize: '0.8rem' }}>
              <Edit size={14} /> <span>Edit Agent Details</span>
            </button>
          </div>
        </div>
      </div>

      {/* Main Grid */}
      <div className="grid-r-split-2-1" style={{ alignItems: 'start' }}>
        
        {/* Left Column - Details */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          
          {/* Card 1: Basic & Personal Information */}
          <div className="premium-card" style={{ padding: '20px' }}>
            <h2 style={{ fontSize: '0.95rem', fontWeight: '800', color: 'var(--text-dark)', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px', borderBottom: '1px solid var(--border)', paddingBottom: '8px' }}>
              <Info size={16} color="var(--primary)" />
              <span>Personal Details</span>
            </h2>
            
            <div className="grid-r-2" style={{ gap: '12px', fontSize: '0.8rem' }}>
              <div>
                <span style={{ color: 'var(--text-muted)', fontWeight: '600' }}>Agent Code:</span>
                <span style={{ color: 'var(--text-dark)', fontWeight: '700', marginLeft: '6px' }}>{agent.agent_code || 'Pending'}</span>
              </div>
              <div>
                <span style={{ color: 'var(--text-muted)', fontWeight: '600' }}>First Name:</span>
                <span style={{ color: 'var(--text-dark)', fontWeight: '700', marginLeft: '6px' }}>{agent.first_name || '—'}</span>
              </div>
              <div>
                <span style={{ color: 'var(--text-muted)', fontWeight: '600' }}>Middle Name:</span>
                <span style={{ color: 'var(--text-dark)', fontWeight: '700', marginLeft: '6px' }}>{agent.middle_name || '—'}</span>
              </div>
              <div>
                <span style={{ color: 'var(--text-muted)', fontWeight: '600' }}>Last Name:</span>
                <span style={{ color: 'var(--text-dark)', fontWeight: '700', marginLeft: '6px' }}>{agent.last_name || '—'}</span>
              </div>
              <div>
                <span style={{ color: 'var(--text-muted)', fontWeight: '600' }}>Gender:</span>
                <span style={{ color: 'var(--text-dark)', fontWeight: '700', marginLeft: '6px' }}>{agent.gender || '—'}</span>
              </div>
              <div>
                <span style={{ color: 'var(--text-muted)', fontWeight: '600' }}>Date of Birth:</span>
                <span style={{ color: 'var(--text-dark)', fontWeight: '700', marginLeft: '6px' }}>{agent.dob ? agent.dob.split('T')[0] : '—'}</span>
              </div>
              <div>
                <span style={{ color: 'var(--text-muted)', fontWeight: '600' }}>Age:</span>
                <span style={{ color: 'var(--text-dark)', fontWeight: '700', marginLeft: '6px' }}>{agent.age || '—'}</span>
              </div>
              <div>
                <span style={{ color: 'var(--text-muted)', fontWeight: '600' }}>Occupation:</span>
                <span style={{ color: 'var(--text-dark)', fontWeight: '700', marginLeft: '6px' }}>{agent.occupation || '—'}</span>
              </div>
              <div>
                <span style={{ color: 'var(--text-muted)', fontWeight: '600' }}>Phone:</span>
                <span style={{ color: 'var(--text-dark)', fontWeight: '700', marginLeft: '6px' }}><Phone size={11} style={{ display: 'inline', marginRight: '4px' }} />{agent.phone || '—'}</span>
              </div>
              <div>
                <span style={{ color: 'var(--text-muted)', fontWeight: '600' }}>Alternate Mobile:</span>
                <span style={{ color: 'var(--text-dark)', fontWeight: '700', marginLeft: '6px' }}>{agent.alt_mobile || agent.alternate_mobile || '—'}</span>
              </div>
              <div>
                <span style={{ color: 'var(--text-muted)', fontWeight: '600' }}>Email Address:</span>
                <span style={{ color: 'var(--text-dark)', fontWeight: '700', marginLeft: '6px' }}><Mail size={11} style={{ display: 'inline', marginRight: '4px' }} />{agent.email || '—'}</span>
              </div>
              <div>
                <span style={{ color: 'var(--text-muted)', fontWeight: '600' }}>Commission Percentage:</span>
                <span style={{ color: 'var(--primary)', fontWeight: '800', marginLeft: '6px' }}>{agent.commission_percentage !== null && agent.commission_percentage !== undefined ? `${agent.commission_percentage}%` : '—'}</span>
              </div>
              <div style={{ gridColumn: 'span 2' }}>
                <span style={{ color: 'var(--text-muted)', fontWeight: '600' }}>Administrative Notes:</span>
                <p style={{ color: 'var(--text-dark)', fontWeight: '600', marginTop: '4px', background: '#f8fafc', padding: '8px 12px', borderRadius: '8px', border: '1px solid var(--border)' }}>{agent.notes || 'No administrative notes recorded.'}</p>
              </div>
            </div>
          </div>

          {/* Card 2: Address Details */}
          <div className="premium-card" style={{ padding: '20px' }}>
            <h2 style={{ fontSize: '0.95rem', fontWeight: '800', color: 'var(--text-dark)', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px', borderBottom: '1px solid var(--border)', paddingBottom: '8px' }}>
              <MapPin size={16} color="var(--primary)" />
              <span>Address Details</span>
            </h2>
            <div className="grid-r-2" style={{ gap: '12px', fontSize: '0.8rem' }}>
              <div>
                <span style={{ color: 'var(--text-muted)', fontWeight: '600' }}>Street Address:</span>
                <span style={{ color: 'var(--text-dark)', fontWeight: '700', marginLeft: '6px' }}>{agent.address || '—'}</span>
              </div>
              <div>
                <span style={{ color: 'var(--text-muted)', fontWeight: '600' }}>Village / Landmark:</span>
                <span style={{ color: 'var(--text-dark)', fontWeight: '700', marginLeft: '6px' }}>{agent.village || '—'}</span>
              </div>
              <div>
                <span style={{ color: 'var(--text-muted)', fontWeight: '600' }}>City:</span>
                <span style={{ color: 'var(--text-dark)', fontWeight: '700', marginLeft: '6px' }}>{agent.city || '—'}</span>
              </div>
              <div>
                <span style={{ color: 'var(--text-muted)', fontWeight: '600' }}>State:</span>
                <span style={{ color: 'var(--text-dark)', fontWeight: '700', marginLeft: '6px' }}>{agent.state || '—'}</span>
              </div>
              <div>
                <span style={{ color: 'var(--text-muted)', fontWeight: '600' }}>Pincode:</span>
                <span style={{ color: 'var(--text-dark)', fontWeight: '700', marginLeft: '6px' }}>{agent.pin || '—'}</span>
              </div>
            </div>
          </div>

          {/* Card 3: Verification Documents */}
          <div className="premium-card" style={{ padding: '20px' }}>
            <h2 style={{ fontSize: '0.95rem', fontWeight: '800', color: 'var(--text-dark)', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px', borderBottom: '1px solid var(--border)', paddingBottom: '8px' }}>
              <FileText size={16} color="var(--primary)" />
              <span>KYC Verification Documents</span>
            </h2>
            
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '16px' }}>
              {/* Aadhaar Front */}
              {(() => {
                const imageUrl = agent.aadhaar_front ? getMediaUrl(agent.aadhaar_front) : null;
                return (
                  <div style={{ border: '1px solid var(--border)', padding: '12px', borderRadius: '8px', backgroundColor: '#f8fafc', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'space-between', minHeight: '200px' }}>
                    <div style={{ width: '100%', textAlign: 'center' }}>
                      <span style={{ fontSize: '0.75rem', fontWeight: '700', color: 'var(--text-muted)', marginBottom: '8px', display: 'block' }}>Aadhaar Card (Front)</span>
                      {imageUrl ? (
                        <img 
                          src={imageUrl} 
                          alt="Aadhaar Front"
                          style={{ width: '100%', height: '120px', objectFit: 'contain', borderRadius: '4px', border: '1px solid var(--border)', cursor: 'zoom-in' }}
                          onClick={() => { setZoomImage(imageUrl); setZoomTitle('Aadhaar Card (Front)'); }}
                        />
                      ) : (
                        <div style={{ height: '120px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)', fontSize: '0.72rem', background: '#f1f5f9', width: '100%', borderRadius: '4px', border: '1px dashed var(--border)', gap: '4px' }}>
                          <ShieldAlert size={20} style={{ opacity: 0.5 }} />
                          <span>Not Uploaded</span>
                        </div>
                      )}
                    </div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-dark)', fontWeight: '700', marginTop: '10px' }}>No: {agent.aadhaar || '—'}</div>
                  </div>
                );
              })()}

              {/* Aadhaar Back */}
              {(() => {
                const imageUrl = agent.aadhaar_back ? getMediaUrl(agent.aadhaar_back) : null;
                return (
                  <div style={{ border: '1px solid var(--border)', padding: '12px', borderRadius: '8px', backgroundColor: '#f8fafc', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'space-between', minHeight: '200px' }}>
                    <div style={{ width: '100%', textAlign: 'center' }}>
                      <span style={{ fontSize: '0.75rem', fontWeight: '700', color: 'var(--text-muted)', marginBottom: '8px', display: 'block' }}>Aadhaar Card (Back)</span>
                      {imageUrl ? (
                        <img 
                          src={imageUrl} 
                          alt="Aadhaar Back"
                          style={{ width: '100%', height: '120px', objectFit: 'contain', borderRadius: '4px', border: '1px solid var(--border)', cursor: 'zoom-in' }}
                          onClick={() => { setZoomImage(imageUrl); setZoomTitle('Aadhaar Card (Back)'); }}
                        />
                      ) : (
                        <div style={{ height: '120px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)', fontSize: '0.72rem', background: '#f1f5f9', width: '100%', borderRadius: '4px', border: '1px dashed var(--border)', gap: '4px' }}>
                          <ShieldAlert size={20} style={{ opacity: 0.5 }} />
                          <span>Not Uploaded</span>
                        </div>
                      )}
                    </div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-dark)', fontWeight: '700', marginTop: '10px' }}>No: {agent.aadhaar || '—'}</div>
                  </div>
                );
              })()}

              {/* PAN Card */}
              {(() => {
                const imageUrl = agent.pan_img ? getMediaUrl(agent.pan_img) : null;
                return (
                  <div style={{ border: '1px solid var(--border)', padding: '12px', borderRadius: '8px', backgroundColor: '#f8fafc', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'space-between', minHeight: '200px' }}>
                    <div style={{ width: '100%', textAlign: 'center' }}>
                      <span style={{ fontSize: '0.75rem', fontWeight: '700', color: 'var(--text-muted)', marginBottom: '8px', display: 'block' }}>PAN Card</span>
                      {imageUrl ? (
                        <img 
                          src={imageUrl} 
                          alt="PAN Card"
                          style={{ width: '100%', height: '120px', objectFit: 'contain', borderRadius: '4px', border: '1px solid var(--border)', cursor: 'zoom-in' }}
                          onClick={() => { setZoomImage(imageUrl); setZoomTitle('PAN Card'); }}
                        />
                      ) : (
                        <div style={{ height: '120px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)', fontSize: '0.72rem', background: '#f1f5f9', width: '100%', borderRadius: '4px', border: '1px dashed var(--border)', gap: '4px' }}>
                          <ShieldAlert size={20} style={{ opacity: 0.5 }} />
                          <span>Not Uploaded</span>
                        </div>
                      )}
                    </div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-dark)', fontWeight: '700', marginTop: '10px' }}>No: {agent.pan || '—'}</div>
                  </div>
                );
              })()}
            </div>
          </div>

        </div>

        {/* Right Column - Status Sidebar */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          
          {/* KYC Card */}
          <div className="premium-card" style={{ padding: '20px' }}>
            <h2 style={{ fontSize: '0.85rem', fontWeight: '800', color: 'var(--text-dark)', marginBottom: '14px', textTransform: 'uppercase', letterSpacing: '0.04em' }}>KYC Information</h2>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', fontSize: '0.8rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid #f8fafc', paddingBottom: '6px' }}>
                <span style={{ color: 'var(--text-muted)', fontWeight: '600' }}>Aadhaar:</span>
                <span style={{ color: 'var(--text-dark)', fontWeight: '700' }}>{agent.aadhaar || '—'}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', paddingBottom: '2px' }}>
                <span style={{ color: 'var(--text-muted)', fontWeight: '600' }}>PAN Number:</span>
                <span style={{ color: 'var(--text-dark)', fontWeight: '700' }}>{agent.pan || '—'}</span>
              </div>
            </div>
          </div>

          {/* Login Information Card */}
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

      {/* Members Section */}
      <div className="card" style={{ marginTop: '24px', padding: '0', overflow: 'visible' }}>
        <div style={{ padding: '16px 20px', borderBottom: '1px solid #f1f5f9' }}>
          <h2 style={{ fontSize: '1rem', fontWeight: '800', color: '#0f172a', margin: 0 }}>
            Members
          </h2>
        </div>
        
        {/* Summary Cards */}
        <div style={{ padding: '20px', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px', borderBottom: '1px solid #f1f5f9' }}>
          <div style={{ background: '#f8fafc', padding: '16px', borderRadius: '12px', border: '1px solid #e8edf2' }}>
            <div style={{ fontSize: '0.75rem', fontWeight: '700', color: '#64748b', textTransform: 'uppercase', marginBottom: '8px' }}>Total Members</div>
            <div style={{ fontSize: '1.5rem', fontWeight: '800', color: '#0f172a' }}>{counts.all}</div>
          </div>
          <div style={{ background: '#f0fdf4', padding: '16px', borderRadius: '12px', border: '1px solid #bbf7d0' }}>
            <div style={{ fontSize: '0.75rem', fontWeight: '700', color: '#16a34a', textTransform: 'uppercase', marginBottom: '8px' }}>Active Members</div>
            <div style={{ fontSize: '1.5rem', fontWeight: '800', color: '#15803d' }}>{counts.active}</div>
          </div>
          <div style={{ background: '#fff7ed', padding: '16px', borderRadius: '12px', border: '1px solid #fed7aa' }}>
            <div style={{ fontSize: '0.75rem', fontWeight: '700', color: '#ea580c', textTransform: 'uppercase', marginBottom: '8px' }}>Upcoming Marriages</div>
            <div style={{ fontSize: '1.5rem', fontWeight: '800', color: '#c2410c' }}>{counts.upcoming}</div>
          </div>
          <div style={{ background: '#eff6ff', padding: '16px', borderRadius: '12px', border: '1px solid #bfdbfe' }}>
            <div style={{ fontSize: '0.75rem', fontWeight: '700', color: '#2563eb', textTransform: 'uppercase', marginBottom: '8px' }}>Married Members</div>
            <div style={{ fontSize: '1.5rem', fontWeight: '800', color: '#1d4ed8' }}>{counts.married}</div>
          </div>
        </div>

        {/* Filter Tabs */}
        <div style={{ display: 'flex', gap: '10px', padding: '16px 20px 0', borderBottom: '1px solid #f1f5f9', overflowX: 'auto' }}>
          {['All', 'Active', 'Upcoming', 'Married'].map(tab => (
            <button
              key={tab}
              onClick={() => { setActiveTab(tab); setMembersPage(1); }}
              style={{
                padding: '10px 20px',
                border: 'none',
                background: 'none',
                fontSize: '0.85rem',
                fontWeight: '700',
                color: activeTab === tab ? '#0ea5e9' : '#64748b',
                borderBottom: activeTab === tab ? '2px solid #0ea5e9' : '2px solid transparent',
                cursor: 'pointer',
                transition: 'all 0.2s',
                whiteSpace: 'nowrap'
              }}
            >
              {tab}
            </button>
          ))}
        </div>

        {loadingMembers ? (
          <div style={{ padding: '40px', textAlign: 'center', color: '#0ea5e9', fontWeight: 'bold' }}>
            Loading members...
          </div>
        ) : members.length === 0 ? (
          <div style={{ padding: '40px', textAlign: 'center', color: '#94a3b8', fontSize: '0.85rem' }}>
            No members found for this tab.
          </div>
        ) : (
          <>
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ background: '#f8fafc' }}>
                    {['PROFILE', 'MEMBER CODE', 'FULL NAME', 'PHONE', 'PLAN NAME', 'STATUS'].map(h => (
                      <th key={h} style={{ padding: '12px 16px', textAlign: 'left', fontSize: '0.68rem', fontWeight: '700', color: '#94a3b8', letterSpacing: '0.08em', textTransform: 'uppercase', borderBottom: '1px solid #f1f5f9' }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {members.map(item => {
                    const memberId = item.member_id || item.id;
                    const name = getMemberName(item);
                    const code = item.member_code || memberId || '';
                    const phone = item.member_details?.mobile || item.phone || item.mobile || 'N/A';
                    const plan = getPlanName(item);
                    const badge = getBadge(item);
                    const profileUrl = getMemberProfileImage(item);

                    return (
                      <tr key={memberId} style={{ borderBottom: '1px solid #f8fafc' }}
                        onMouseEnter={e => e.currentTarget.style.background = '#fafcff'}
                        onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                      >
                        <td style={{ padding: '12px 16px' }}>
                          <div style={{ width: '32px', height: '32px', borderRadius: '50%', background: '#0ea5e9', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.7rem', fontWeight: '700', overflow: 'hidden' }}>
                            {profileUrl ? (
                              <img src={profileUrl} alt={name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                            ) : (
                              getMemberInitials(item)
                            )}
                          </div>
                        </td>
                        <td style={{ padding: '12px 16px', fontSize: '0.82rem', fontWeight: '700', color: '#475569' }}>{code}</td>
                        <td style={{ padding: '12px 16px', fontSize: '0.85rem', fontWeight: '700', color: '#0f172a' }}>{name}</td>
                        <td style={{ padding: '12px 16px', fontSize: '0.82rem', color: '#334155' }}>{phone}</td>
                        <td style={{ padding: '12px 16px' }}>
                          <span style={{ padding: '3px 8px', borderRadius: '6px', fontSize: '0.72rem', fontWeight: '600', background: '#f1f5f9', color: '#475569' }}>
                            {plan}
                          </span>
                        </td>
                        <td style={{ padding: '12px 16px' }}>
                          <span style={{ padding: '4px 10px', borderRadius: '9999px', fontSize: '0.72rem', fontWeight: '700', background: badge.bg, color: badge.color }}>
                            ● {badge.label}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {membersMeta && membersMeta.total > 0 && (
              <div style={{ padding: '14px 20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px solid #f1f5f9', flexWrap: 'wrap', gap: '10px' }}>
                <div style={{ fontSize: '0.78rem', color: '#64748b', fontWeight: '500' }}>
                  Showing <span style={{ fontWeight: '700', color: '#0f172a' }}>{membersMeta.skip + 1}</span> to{' '}
                  <span style={{ fontWeight: '700', color: '#0f172a' }}>{Math.min(membersMeta.skip + membersMeta.limit, membersMeta.total)}</span> of{' '}
                  <span style={{ fontWeight: '700', color: '#0f172a' }}>{membersMeta.total}</span> members
                </div>
                <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                  <button
                    disabled={!membersMeta.hasPrev}
                    onClick={() => setMembersPage(p => Math.max(1, p - 1))}
                    style={{ padding: '5px 12px', borderRadius: '6px', fontSize: '0.78rem', fontWeight: '600', border: '1px solid #e8edf2', background: membersMeta.hasPrev ? '#fff' : '#f8fafc', color: membersMeta.hasPrev ? '#475569' : '#94a3b8', cursor: membersMeta.hasPrev ? 'pointer' : 'not-allowed', transition: 'all 0.15s' }}
                  >
                    Previous
                  </button>
                  <span style={{ fontSize: '0.78rem', color: '#475569', fontWeight: '700', minWidth: '30px', textAlign: 'center' }}>
                    {membersPage}
                  </span>
                  <button
                    disabled={!membersMeta.hasNext}
                    onClick={() => setMembersPage(p => p + 1)}
                    style={{ padding: '5px 12px', borderRadius: '6px', fontSize: '0.78rem', fontWeight: '600', border: '1px solid #e8edf2', background: membersMeta.hasNext ? '#fff' : '#f8fafc', color: membersMeta.hasNext ? '#475569' : '#94a3b8', cursor: membersMeta.hasNext ? 'pointer' : 'not-allowed', transition: 'all 0.15s' }}
                  >
                    Next
                  </button>
                </div>
              </div>
            )}
          </>
        )}
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

    </div>
  );
}
