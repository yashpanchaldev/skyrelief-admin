'use client';
import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { ArrowLeft, Upload, Eye, EyeOff, Copy } from 'lucide-react';
import { apiRequest, showToast } from '@/lib/api';

const emptyForm = {
  first_name: '',
  middle_name: '',
  last_name: '',
  phone: '',
  email: '',
  gender: 'MALE',
  dob: '',
  alt_mobile: '',
  aadhaar: '',
  pan: '',
  plan_id: '',
  fees: '',
  age: '',
  occupation: '',
  guardian: '',
  relation: '',
  father: '',
  mother: '',
  notes: '',
  address: '',
  city: '',
  village: '',
  state: '',
  pin: '',
  password: '',
  agent_id: '',
};

const BASE_API_URL = process.env.NEXT_PUBLIC_API_URL || 'https://api.skyrelief.org';

export default function MemberFormPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const memberId = searchParams.get('id');
  const isEditMode = !!memberId;

  const getImageUrl = (path) => {
    if (!path) return "";
    if (path.startsWith("http")) return path;
    const cleanPath = path.startsWith('/') ? path : `/${path}`;
    return `${BASE_API_URL}${cleanPath}`;
  };

  const [form, setForm] = useState(emptyForm);
  const [plans, setPlans] = useState([]);
  const [agents, setAgents] = useState([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  // Files state
  const [profileFile, setProfileFile] = useState(null);
  const [panFile, setPanFile] = useState(null);
  const [aadhaarFrontFile, setAadhaarFrontFile] = useState(null);
  const [aadhaarBackFile, setAadhaarBackFile] = useState(null);

  // Image previews state
  const [previews, setPreviews] = useState({
    profile: '',
    pan_img: '',
    aadhaar_front: '',
    aadhaar_back: '',
  });

  const [showPassword, setShowPassword] = useState(false);

  const handleGeneratePassword = () => {
    let baseName = form.first_name ? form.first_name.trim() : 'User';
    if (baseName.length < 4) baseName += 'Pass';
    const namePart = baseName.charAt(0).toUpperCase() + baseName.slice(1).toLowerCase();
    
    let yearPart = '1234';
    if (form.dob) {
      const parts = form.dob.split('-');
      if (parts.length > 0) yearPart = parts[0];
    }
    
    const randomNum = Math.floor(10 + Math.random() * 90);
    let generated = `${namePart}@${yearPart}${randomNum}`;
    if (generated.length < 8) generated += 'xY';
    
    handleInputChange('password', generated);
  };

  const copyToClipboard = () => {
    if (form.password) {
      navigator.clipboard.writeText(form.password);
      showToast('Password copied!', 'success');
    }
  };

  // Fetch plans and agents
  const fetchDependencies = async () => {
    try {
      const [plansRes, agentsRes] = await Promise.all([
        apiRequest('/api/insurance/get-all?limit=100').catch(() => ({ s: 0, r: [] })),
        (!isEditMode ? apiRequest('/api/agent/get-all?limit=100').catch(() => ({ s: 0, r: [] })) : Promise.resolve({ s: 0, r: [] }))
      ]);

      if (plansRes.s === 1 && Array.isArray(plansRes.r)) {
        setPlans(plansRes.r);
        // Set default plan if creating
        if (!isEditMode && plansRes.r.length > 0) {
          setForm(prev => ({
            ...prev,
            plan_id: String(plansRes.r[0].id),
            fees: String(plansRes.r[0].joining_fee || 0)
          }));
        }
      }
      
      if (agentsRes.s === 1 && Array.isArray(agentsRes.r)) {
        setAgents(agentsRes.r);
      }
    } catch (err) {
      console.error('Error fetching dependencies:', err);
    }
  };

  useEffect(() => {
    fetchDependencies();
  }, [isEditMode]);

  // Fetch member info if edit mode
  useEffect(() => {
    if (isEditMode) {
      const fetchMemberDetails = async () => {
        setLoading(true);
        try {
          const res = await apiRequest(`/api/member/get?id=${memberId}`);
          if (res.s === 1 && res.r) {
            const data = res.r;
            const details = data.member_details || {};
            const address = data.address || {};
            const docs = data.documents || [];

            const profileImg = details.profile_image || details.profile_photo || data.profile_photo || data.profile || '';
            const panDoc = docs.find(d => d.document_type?.toUpperCase() === 'PAN');
            const aaFrontDoc = docs.find(d => d.document_type?.toUpperCase() === 'AADHAR_FRONT');
            const aaBackDoc = docs.find(d => d.document_type?.toUpperCase() === 'AADHAR_BACK');

            setForm({
              first_name: details.first_name || data.first_name || '',
              middle_name: details.middle_name || data.middle_name || '',
              last_name: details.last_name || data.last_name || '',
              phone: details.mobile || data.phone || data.mobile || '',
              email: details.email || data.email || '',
              gender: details.gender || data.gender || 'MALE',
              dob: details.dob || data.dob ? (details.dob || data.dob).split('T')[0] : '',
              alt_mobile: details.alternate_mobile || data.alt_mobile || data.alternate_mobile || '',
              aadhaar: details.aadhaar_number || data.aadhaar_number || data.aadhaar || '',
              pan: details.pan_number || data.pan_number || data.pan || '',
              plan_id: String(data.plan_id || details.plan_id || ''),
              fees: String(data.joining_fees || data.fees || ''),
              age: details.age !== null && details.age !== undefined ? String(details.age) : '',
              occupation: details.occupation || '',
              guardian: details.guardian_name || data.guardian || '',
              relation: details.guardian_relation || data.relation || '',
              father: details.father_name || data.father || '',
              mother: details.mother_name || data.mother || '',
              notes: details.notes || data.notes || '',
              address: address.address_line_1 || data.address || '',
              city: address.city || data.city || '',
              village: address.village || data.village || '',
              state: address.state || data.state || '',
              pin: address.pincode || address.pin_code || data.pin || '',
              profile: profileImg || '',
              pan_img: data.pan_img || panDoc?.file_url || '',
              aadhaar_front: data.aadhaar_front || aaFrontDoc?.file_url || '',
              aadhaar_back: data.aadhaar_back || aaBackDoc?.file_url || '',
            });
          } else {
            showToast(res.m || 'Failed to fetch member details', 'error');
          }
        } catch (err) {
          console.error('Error fetching member details:', err);
          showToast('Failed to load member details.', 'error');
        } finally {
          setLoading(false);
        }
      };
      fetchMemberDetails();
    }
  }, [memberId, isEditMode]);

  const handleInputChange = (field, val) => {
    setForm(prev => {
      const updated = { ...prev, [field]: val };
      // Auto fill joining fee if plan changes
      if (field === 'plan_id') {
        const selected = plans.find(p => String(p.id) === String(val));
        if (selected) {
          updated.fees = String(selected.joining_fee || 0);
        }
      }
      return updated;
    });
  };

  const handleFileChange = (e, field) => {
    const file = e.target.files[0];
    if (!file) return;

    const previewUrl = URL.createObjectURL(file);
    setPreviews(prev => ({ ...prev, [field]: previewUrl }));

    if (field === 'profile') setProfileFile(file);
    if (field === 'pan_img') setPanFile(file);
    if (field === 'aadhaar_front') setAadhaarFrontFile(file);
    if (field === 'aadhaar_back') setAadhaarBackFile(file);
  };

  const validateForm = () => {
    if (!form.first_name.trim()) {
      showToast('First Name is required.', 'error');
      return false;
    }
    if (!form.last_name.trim()) {
      showToast('Last Name is required.', 'error');
      return false;
    }
    if (!form.phone.trim()) {
      showToast('Mobile Number is required.', 'error');
      return false;
    }
    if (!/^\d{10}$/.test(form.phone.trim())) {
      showToast('Mobile Number must be exactly 10 digits.', 'error');
      return false;
    }
    if (form.alt_mobile && form.alt_mobile.trim() && !/^\d+$/.test(form.alt_mobile.trim())) {
      showToast('Alternate Mobile must contain numeric digits only.', 'error');
      return false;
    }
    if (form.email && form.email.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email.trim())) {
      showToast('Please enter a valid email address.', 'error');
      return false;
    }
    if (!form.gender) {
      showToast('Gender is required.', 'error');
      return false;
    }
    if (!form.dob) {
      showToast('Date of Birth is required.', 'error');
      return false;
    }
    if (!form.plan_id) {
      showToast('Insurance Plan is required.', 'error');
      return false;
    }
    if (form.aadhaar && form.aadhaar.trim() && !/^\d{12}$/.test(form.aadhaar.trim())) {
      showToast('Aadhaar Number must be exactly 12 digits.', 'error');
      return false;
    }
    if (form.pan && form.pan.trim() && !/^[A-Z]{5}[0-9]{4}[A-Z]{1}$/i.test(form.pan.trim())) {
      showToast('Please enter a valid PAN Number (e.g. ABCDE1234F).', 'error');
      return false;
    }
    if (form.pin && form.pin.trim() && !/^\d{6}$/.test(form.pin.trim())) {
      showToast('Pincode must be exactly 6 digits.', 'error');
      return false;
    }
    if (form.age && isNaN(Number(form.age))) {
      showToast('Age must be a numeric value.', 'error');
      return false;
    }
    if (!isEditMode && (!form.password || !form.password.trim())) {
      showToast('Password is required.', 'error');
      return false;
    }
    if (!isEditMode && agents.length > 0 && !form.agent_id) {
      showToast('Please select an Agent.', 'error');
      return false;
    }
    return true;
  };

  const handleSave = async (e) => {
    e.preventDefault();
    if (!validateForm()) return;

    setSaving(true);
    const formData = new FormData();

    // Add all flat fields to formData, excluding image path fields
    Object.keys(form).forEach(key => {
      if (!['profile', 'pan_img', 'aadhaar_front', 'aadhaar_back'].includes(key)) {
        formData.append(key, form[key]);
      }
    });

    // Add files if selected
    if (profileFile) formData.append('profile', profileFile);
    if (panFile) formData.append('pan_img', panFile);
    if (aadhaarFrontFile) formData.append('aadhaar_front', aadhaarFrontFile);
    if (aadhaarBackFile) formData.append('aadhaar_back', aadhaarBackFile);

    try {
      let res;
      if (isEditMode) {
        formData.append('id', memberId);
        res = await apiRequest('/api/member/update', {
          method: 'POST',
          body: formData,
        });
      } else {
        res = await apiRequest('/api/member/add', {
          method: 'POST',
          body: formData,
        });
      }

      if (res.s === 1) {
        showToast(
          isEditMode ? 'Member profile updated successfully!' : 'Member profile created successfully!',
          'success'
        );

        if (!isEditMode && res.r?.temp_password_info) {
          showToast(`Member password is: ${res.r.temp_password_info}`, 'info');
        }

        router.push(isEditMode ? `/members/${memberId}` : '/members');
      } else {
        showToast(res.m || 'Failed to save member profile.', 'error');
      }
    } catch (err) {
      console.error('Error saving member:', err);
      showToast('An error occurred while saving the member profile.', 'error');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '60vh', gap: '12px' }}>
        <div className="spinner" style={{ width: '40px', height: '40px', border: '4px solid #f1f5f9', borderTopColor: '#0ea5e9', borderRadius: '50%', animation: 'spin 1s linear infinite' }} />
        <span style={{ fontSize: '0.875rem', fontWeight: '600', color: '#64748b' }}>Loading member details...</span>
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  return (
    <div style={{ maxWidth: '960px', margin: '0 auto', paddingBottom: '40px' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '24px' }}>
        <button
          onClick={() => router.push(isEditMode ? `/members/${memberId}` : '/members')}
          className="btn-secondary"
          style={{ padding: '6px 12px', borderRadius: '9999px', border: '1px solid #e8edf2' }}
        >
          <ArrowLeft size={16} /> <span>Back</span>
        </button>
        <div>
          <h1 style={{ fontSize: '1.5rem', fontWeight: '800', color: '#0f172a', letterSpacing: '-0.025em' }}>
            {isEditMode ? 'Edit Member Profile' : 'Add New Member'}
          </h1>
          <p style={{ color: '#64748b', fontSize: '0.82rem', marginTop: '2px' }}>
            {isEditMode ? `Update details for ${form.first_name} ${form.last_name}` : 'Fill form fields to register a new member'}
          </p>
        </div>
      </div>

      <form onSubmit={handleSave} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
        {/* Card 1: Profile & Personal */}
        <div className="card" style={{ padding: '24px' }}>
          <h2 style={{ fontSize: '0.95rem', fontWeight: '800', color: '#0f172a', marginBottom: '18px', display: 'flex', alignItems: 'center', gap: '8px', borderBottom: '1px solid #f1f5f9', paddingBottom: '10px' }}>
            👤 Profile & Personal Information
          </h2>

          <div style={{ display: 'flex', gap: '24px', flexWrap: 'wrap', marginBottom: '20px' }}>
            {/* Profile Image Uploader */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', padding: '14px', background: '#f8fafc', borderRadius: '12px', border: '1px solid #e8edf2', width: '200px', boxSizing: 'border-box' }}>
              <span style={{ fontSize: '0.8rem', fontWeight: '700', color: '#334155' }}>Profile Photo</span>
              <div style={{ width: '100%', height: '120px', borderRadius: '8px', overflow: 'hidden', border: '1px solid #e2e8f0', background: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                {(previews.profile || form.profile) ? (
                  <img src={previews.profile || getImageUrl(form.profile)} alt="Profile" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                ) : (
                  <div style={{ textAlign: 'center', color: '#94a3b8' }}>
                    <Upload size={24} style={{ margin: '0 auto 6px' }} />
                    <span style={{ fontSize: '0.68rem' }}>No photo</span>
                  </div>
                )}
              </div>
              <input type="file" id="profile-upload" accept="image/*" onChange={e => handleFileChange(e, 'profile')} style={{ display: 'none' }} />
              <label htmlFor="profile-upload" className="btn-secondary" style={{ width: '100%', padding: '6px', fontSize: '0.75rem', fontWeight: '700', cursor: 'pointer', textAlign: 'center', boxSizing: 'border-box' }}>
                Upload Image
              </label>
            </div>

            {/* Personal Inputs */}
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '16px', minWidth: '280px' }}>
              <div className="grid-r-3" style={{ gap: '16px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: '600', color: '#64748b', marginBottom: '6px' }}>First Name *</label>
                  <input type="text" required value={form.first_name} onChange={e => handleInputChange('first_name', e.target.value)} className="premium-input" placeholder="Rahul" style={{ width: '100%' }} />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: '600', color: '#64748b', marginBottom: '6px' }}>Middle Name</label>
                  <input type="text" value={form.middle_name} onChange={e => handleInputChange('middle_name', e.target.value)} className="premium-input" placeholder="Kumar" style={{ width: '100%' }} />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: '600', color: '#64748b', marginBottom: '6px' }}>Last Name *</label>
                  <input type="text" required value={form.last_name} onChange={e => handleInputChange('last_name', e.target.value)} className="premium-input" placeholder="Patel" style={{ width: '100%' }} />
                </div>
              </div>

              <div className="grid-r-3" style={{ gap: '16px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: '600', color: '#64748b', marginBottom: '6px' }}>Mobile Number *</label>
                  <input type="text" required value={form.phone} onChange={e => handleInputChange('phone', e.target.value)} className="premium-input" placeholder="9876543211" style={{ width: '100%' }} />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: '600', color: '#64748b', marginBottom: '6px' }}>Gender *</label>
                  <select value={form.gender} onChange={e => handleInputChange('gender', e.target.value)} className="premium-input" style={{ width: '100%' }}>
                    <option value="MALE">Male</option>
                    <option value="FEMALE">Female</option>
                    <option value="OTHER">Other</option>
                  </select>
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: '600', color: '#64748b', marginBottom: '6px' }}>Date of Birth *</label>
                  <input type="date" required value={form.dob} onChange={e => handleInputChange('dob', e.target.value)} className="premium-input" style={{ width: '100%' }} />
                </div>
              </div>

              <div className="grid-r-2" style={{ gap: '16px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: '600', color: '#64748b', marginBottom: '6px' }}>Email Address</label>
                  <input type="email" value={form.email} onChange={e => handleInputChange('email', e.target.value)} className="premium-input" placeholder="rahul.patel@gmail.com" style={{ width: '100%' }} />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: '600', color: '#64748b', marginBottom: '6px' }}>Alternate Mobile</label>
                  <input type="text" value={form.alt_mobile} onChange={e => handleInputChange('alt_mobile', e.target.value)} className="premium-input" placeholder="9876543222" style={{ width: '100%' }} />
                </div>
                {!isEditMode && (
                  <div style={{ gridColumn: '1 / -1' }}>
                    <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: '600', color: '#64748b', marginBottom: '6px' }}>Password *</label>
                    <div style={{ display: 'flex', gap: '8px' }}>
                      <div style={{ position: 'relative', flex: 1, maxWidth: '400px' }}>
                        <input 
                          type={showPassword ? "text" : "password"} 
                          required={!isEditMode}
                          value={form.password || ''} 
                          onChange={e => handleInputChange('password', e.target.value)} 
                          className="premium-input" 
                          name="password"
                          placeholder="Enter password" 
                          style={{ width: '100%', paddingRight: '40px' }} 
                        />
                        <button 
                          type="button" 
                          onClick={() => setShowPassword(!showPassword)}
                          style={{ position: 'absolute', right: '10px', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: '#64748b', padding: '0', display: 'flex', alignItems: 'center' }}
                        >
                          {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                        </button>
                      </div>
                      <button 
                        type="button" 
                        onClick={handleGeneratePassword}
                        className="btn-secondary"
                        style={{ padding: '0 16px', borderRadius: '8px', fontSize: '0.85rem', fontWeight: '600' }}
                      >
                        Generate
                      </button>
                      {form.password && (
                        <button 
                          type="button" 
                          onClick={copyToClipboard}
                          className="btn-secondary"
                          style={{ padding: '0 12px', borderRadius: '8px', display: 'flex', alignItems: 'center' }}
                          title="Copy Password"
                        >
                          <Copy size={18} />
                        </button>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Card 2: Plan Selection */}
        <div className="card" style={{ padding: '24px' }}>
          <h2 style={{ fontSize: '0.95rem', fontWeight: '800', color: '#0f172a', marginBottom: '18px', display: 'flex', alignItems: 'center', gap: '8px', borderBottom: '1px solid #f1f5f9', paddingBottom: '10px' }}>
            💳 Insurance Plan Information
          </h2>
          <div className="grid-r-2" style={{ gap: '16px' }}>
            <div>
              <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: '600', color: '#64748b', marginBottom: '6px' }}>Insurance Plan *</label>
              <select value={form.plan_id} onChange={e => handleInputChange('plan_id', e.target.value)} className="premium-input" style={{ width: '100%' }}>
                <option value="">Select Plan</option>
                {plans.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
              </select>
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: '600', color: '#64748b', marginBottom: '6px' }}>Joining Fees (₹)</label>
              <input type="number" min="0" value={form.fees} onChange={e => handleInputChange('fees', e.target.value)} className="premium-input" placeholder="e.g. 500" style={{ width: '100%' }} />
            </div>
            {!isEditMode && agents.length > 0 && (
              <div>
                <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: '600', color: '#64748b', marginBottom: '6px' }}>Assign to Agent *</label>
                <select value={form.agent_id} onChange={e => handleInputChange('agent_id', e.target.value)} className="premium-input" style={{ width: '100%' }}>
                  <option value="">Select Agent</option>
                  {agents.map(a => <option key={a.id} value={a.id}>{a.first_name} {a.last_name}</option>)}
                </select>
              </div>
            )}
          </div>
        </div>

        {/* Card 3: Address Details */}
        <div className="card" style={{ padding: '24px' }}>
          <h2 style={{ fontSize: '0.95rem', fontWeight: '800', color: '#0f172a', marginBottom: '18px', display: 'flex', alignItems: 'center', gap: '8px', borderBottom: '1px solid #f1f5f9', paddingBottom: '10px' }}>
            📍 Address Information
          </h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div>
              <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: '600', color: '#64748b', marginBottom: '6px' }}>Street Address</label>
              <input type="text" value={form.address} onChange={e => handleInputChange('address', e.target.value)} className="premium-input" placeholder="123, Ring Road" style={{ width: '100%' }} />
            </div>

            <div className="grid-r-4" style={{ gap: '16px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: '600', color: '#64748b', marginBottom: '6px' }}>Village / Landmark</label>
                <input type="text" value={form.village} onChange={e => handleInputChange('village', e.target.value)} className="premium-input" placeholder="Near Temple" style={{ width: '100%' }} />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: '600', color: '#64748b', marginBottom: '6px' }}>City</label>
                <input type="text" value={form.city} onChange={e => handleInputChange('city', e.target.value)} className="premium-input" placeholder="Ahmedabad" style={{ width: '100%' }} />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: '600', color: '#64748b', marginBottom: '6px' }}>State</label>
                <input type="text" value={form.state} onChange={e => handleInputChange('state', e.target.value)} className="premium-input" placeholder="Gujarat" style={{ width: '100%' }} />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: '600', color: '#64748b', marginBottom: '6px' }}>PIN Code</label>
                <input type="text" value={form.pin} onChange={e => handleInputChange('pin', e.target.value)} className="premium-input" placeholder="380007" style={{ width: '100%' }} />
              </div>
            </div>
          </div>
        </div>

        {/* Card 4: KYC Details */}
        <div className="card" style={{ padding: '24px' }}>
          <h2 style={{ fontSize: '0.95rem', fontWeight: '800', color: '#0f172a', marginBottom: '18px', display: 'flex', alignItems: 'center', gap: '8px', borderBottom: '1px solid #f1f5f9', paddingBottom: '10px' }}>
            🪪 KYC Verification Information
          </h2>
          <div className="grid-r-2" style={{ gap: '16px', marginBottom: '20px' }}>
            <div>
              <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: '600', color: '#64748b', marginBottom: '6px' }}>Aadhaar Number</label>
              <input type="text" value={form.aadhaar} onChange={e => handleInputChange('aadhaar', e.target.value)} className="premium-input" placeholder="123412341234" style={{ width: '100%' }} />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: '600', color: '#64748b', marginBottom: '6px' }}>PAN Number</label>
              <input type="text" value={form.pan} onChange={e => handleInputChange('pan', e.target.value)} className="premium-input" placeholder="ABCDE1234F" style={{ width: '100%', textTransform: 'uppercase' }} />
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '16px' }}>
            {/* Aadhaar Front */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', padding: '14px', background: '#f8fafc', borderRadius: '12px', border: '1px solid #e8edf2' }}>
              <span style={{ fontSize: '0.8rem', fontWeight: '700', color: '#334155' }}>Aadhaar Front</span>
              <div style={{ width: '100%', height: '110px', borderRadius: '8px', overflow: 'hidden', border: '1px solid #e2e8f0', background: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                {(previews.aadhaar_front || form.aadhaar_front) ? (
                  <img src={previews.aadhaar_front || getImageUrl(form.aadhaar_front)} alt="Aadhaar Front" style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
                ) : (
                  <div style={{ textAlign: 'center', color: '#94a3b8' }}>
                    <Upload size={20} style={{ margin: '0 auto 4px' }} />
                    <span style={{ fontSize: '0.65rem' }}>No image</span>
                  </div>
                )}
              </div>
              <input type="file" id="aadhaar-front-upload" accept="image/*" onChange={e => handleFileChange(e, 'aadhaar_front')} style={{ display: 'none' }} />
              <label htmlFor="aadhaar-front-upload" className="btn-secondary" style={{ width: '100%', padding: '6px', fontSize: '0.72rem', fontWeight: '700', cursor: 'pointer', textAlign: 'center', boxSizing: 'border-box' }}>
                Select Front
              </label>
            </div>

            {/* Aadhaar Back */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', padding: '14px', background: '#f8fafc', borderRadius: '12px', border: '1px solid #e8edf2' }}>
              <span style={{ fontSize: '0.8rem', fontWeight: '700', color: '#334155' }}>Aadhaar Back</span>
              <div style={{ width: '100%', height: '110px', borderRadius: '8px', overflow: 'hidden', border: '1px solid #e2e8f0', background: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                {(previews.aadhaar_back || form.aadhaar_back) ? (
                  <img src={previews.aadhaar_back || getImageUrl(form.aadhaar_back)} alt="Aadhaar Back" style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
                ) : (
                  <div style={{ textAlign: 'center', color: '#94a3b8' }}>
                    <Upload size={20} style={{ margin: '0 auto 4px' }} />
                    <span style={{ fontSize: '0.65rem' }}>No image</span>
                  </div>
                )}
              </div>
              <input type="file" id="aadhaar-back-upload" accept="image/*" onChange={e => handleFileChange(e, 'aadhaar_back')} style={{ display: 'none' }} />
              <label htmlFor="aadhaar-back-upload" className="btn-secondary" style={{ width: '100%', padding: '6px', fontSize: '0.72rem', fontWeight: '700', cursor: 'pointer', textAlign: 'center', boxSizing: 'border-box' }}>
                Select Back
              </label>
            </div>

            {/* PAN Image */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', padding: '14px', background: '#f8fafc', borderRadius: '12px', border: '1px solid #e8edf2' }}>
              <span style={{ fontSize: '0.8rem', fontWeight: '700', color: '#334155' }}>PAN Card Image</span>
              <div style={{ width: '100%', height: '110px', borderRadius: '8px', overflow: 'hidden', border: '1px solid #e2e8f0', background: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                {(previews.pan_img || form.pan_img) ? (
                  <img src={previews.pan_img || getImageUrl(form.pan_img)} alt="PAN card" style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
                ) : (
                  <div style={{ textAlign: 'center', color: '#94a3b8' }}>
                    <Upload size={20} style={{ margin: '0 auto 4px' }} />
                    <span style={{ fontSize: '0.65rem' }}>No image</span>
                  </div>
                )}
              </div>
              <input type="file" id="pan-upload" accept="image/*" onChange={e => handleFileChange(e, 'pan_img')} style={{ display: 'none' }} />
              <label htmlFor="pan-upload" className="btn-secondary" style={{ width: '100%', padding: '6px', fontSize: '0.72rem', fontWeight: '700', cursor: 'pointer', textAlign: 'center', boxSizing: 'border-box' }}>
                Select PAN Card
              </label>
            </div>
          </div>
        </div>

        {/* Card 5: Family & Additional details */}
        <div className="card" style={{ padding: '24px' }}>
          <h2 style={{ fontSize: '0.95rem', fontWeight: '800', color: '#0f172a', marginBottom: '18px', display: 'flex', alignItems: 'center', gap: '8px', borderBottom: '1px solid #f1f5f9', paddingBottom: '10px' }}>
            👪 Family & Additional Information
          </h2>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div className="grid-r-4" style={{ gap: '16px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: '600', color: '#64748b', marginBottom: '6px' }}>Father Name</label>
                <input type="text" value={form.father} onChange={e => handleInputChange('father', e.target.value)} className="premium-input" placeholder="Father's full name" style={{ width: '100%' }} />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: '600', color: '#64748b', marginBottom: '6px' }}>Mother Name</label>
                <input type="text" value={form.mother} onChange={e => handleInputChange('mother', e.target.value)} className="premium-input" placeholder="Mother's full name" style={{ width: '100%' }} />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: '600', color: '#64748b', marginBottom: '6px' }}>Guardian Name</label>
                <input type="text" value={form.guardian} onChange={e => handleInputChange('guardian', e.target.value)} className="premium-input" placeholder="Guardian's name" style={{ width: '100%' }} />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: '600', color: '#64748b', marginBottom: '6px' }}>Guardian Relation</label>
                <input type="text" value={form.relation} onChange={e => handleInputChange('relation', e.target.value)} className="premium-input" placeholder="e.g. Uncle" style={{ width: '100%' }} />
              </div>
            </div>

            <div className="grid-r-3" style={{ gap: '16px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: '600', color: '#64748b', marginBottom: '6px' }}>Age (Years)</label>
                <input type="text" value={form.age} onChange={e => handleInputChange('age', e.target.value)} className="premium-input" placeholder="30" style={{ width: '100%' }} />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: '600', color: '#64748b', marginBottom: '6px' }}>Occupation</label>
                <input type="text" value={form.occupation} onChange={e => handleInputChange('occupation', e.target.value)} className="premium-input" placeholder="Private Job" style={{ width: '100%' }} />
              </div>
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: '600', color: '#64748b', marginBottom: '6px' }}>Administrative Notes</label>
              <textarea value={form.notes} onChange={e => handleInputChange('notes', e.target.value)} className="premium-input" placeholder="Notes about member..." rows={3} style={{ width: '100%', resize: 'none', fontFamily: 'inherit' }} />
            </div>
          </div>
        </div>

        {/* Submit Actions */}
        <div style={{ display: 'flex', gap: '16px', marginTop: '10px' }}>
          <button
            type="button"
            onClick={() => router.push(isEditMode ? `/members/${memberId}` : '/members')}
            className="btn-secondary"
            style={{ flex: 1, padding: '12px', borderRadius: '9999px', fontWeight: '600' }}
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={saving}
            className="btn-primary"
            style={{ flex: 2, padding: '12px', borderRadius: '9999px', fontWeight: '700', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}
          >
            {saving ? (
              <>
                <div className="spinner" style={{ width: '16px', height: '16px', border: '2px solid rgba(255,255,255,0.3)', borderTopColor: '#fff', borderRadius: '50%', animation: 'spin 1s linear infinite' }} />
                <span>Saving Profile...</span>
              </>
            ) : (
              <span>{isEditMode ? 'Update Member' : 'Create Member'}</span>
            )}
          </button>
        </div>
      </form>
    </div>
  );
}
