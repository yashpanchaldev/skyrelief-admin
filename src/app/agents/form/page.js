'use client';
import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { ArrowLeft, Upload, Eye, EyeOff, Copy } from 'lucide-react';
import { apiRequest, showToast } from '@/lib/api';

const emptyForm = {
  first_name: '',
  middle_name: '',
  last_name: '',
  gender: 'Male',
  dob: '',
  age: '',
  occupation: '',
  phone: '',
  alt_mobile: '',
  email: '',
  aadhaar: '',
  pan: '',
  address: '',
  city: '',
  village: '',
  state: '',
  pin: '',
  commission_percentage: '',
  notes: '',
  password: ''
};

export default function AgentFormPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const agentId = searchParams.get('id');
  const isEditMode = !!agentId;

  const [form, setForm] = useState(emptyForm);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  // Files state
  const [profileFile, setProfileFile] = useState(null);
  const [panImgFile, setPanImgFile] = useState(null);
  const [aadhaarFrontFile, setAadhaarFrontFile] = useState(null);
  const [aadhaarBackFile, setAadhaarBackFile] = useState(null);

  // Previews state
  const [previews, setPreviews] = useState({
    profile: '',
    pan_img: '',
    aadhaar_front: '',
    aadhaar_back: ''
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

  const cleanEmail = (emailStr) => {
    if (!emailStr) return '';
    if (emailStr.includes('[')) {
      const match = emailStr.match(/\[(.*?)\]/);
      return match ? match[1] : emailStr;
    }
    return emailStr;
  };

  const formatDOB = (dobStr) => {
    if (!dobStr) return '';
    return dobStr.split('T')[0];
  };

  useEffect(() => {
    if (isEditMode) {
      const fetchAgentDetails = async () => {
        setLoading(true);
        try {
          const res = await apiRequest(`/api/agent/get?id=${agentId}`);
          if (res.s === 1 && res.r) {
            const details = res.r || {};
            
            setForm({
              first_name: details.first_name || '',
              middle_name: details.middle_name || '',
              last_name: details.last_name || '',
              gender: details.gender || 'Male',
              dob: formatDOB(details.dob),
              age: details.age !== null && details.age !== undefined ? String(details.age) : '',
              occupation: details.occupation || '',
              phone: details.phone || '',
              alt_mobile: details.alt_mobile || details.alternate_mobile || '',
              email: cleanEmail(details.email),
              aadhaar: details.aadhaar || details.aadhaar_number || '',
              pan: details.pan || details.pan_number || '',
              address: details.address || '',
              city: details.city || '',
              village: details.village || '',
              state: details.state || '',
              pin: details.pin || details.pin_code || '',
              commission_percentage: details.commission_percentage !== null && details.commission_percentage !== undefined ? String(details.commission_percentage) : '',
              notes: details.notes || ''
            });

            setPreviews({
              profile: details.profile || '',
              pan_img: details.pan_img || '',
              aadhaar_front: details.aadhaar_front || '',
              aadhaar_back: details.aadhaar_back || ''
            });
          } else {
            showToast(res.m || 'Failed to fetch agent details', 'error');
          }
        } catch (err) {
          console.error(err);
          showToast('Failed to load agent details.', 'error');
        } finally {
          setLoading(false);
        }
      };
      fetchAgentDetails();
    } else {
      setForm(emptyForm);
      setPreviews({
        profile: '',
        pan_img: '',
        aadhaar_front: '',
        aadhaar_back: ''
      });
      setProfileFile(null);
      setPanImgFile(null);
      setAadhaarFrontFile(null);
      setAadhaarBackFile(null);
    }
  }, [agentId, isEditMode]);

  const handleInputChange = (field, val) => {
    setForm(prev => ({ ...prev, [field]: val }));
  };

  const handleFileChange = (e, field) => {
    const file = e.target.files[0];
    if (!file) return;

    const previewUrl = URL.createObjectURL(file);

    setPreviews(prev => ({ ...prev, [field]: previewUrl }));

    if (field === 'profile') setProfileFile(file);
    if (field === 'pan_img') setPanImgFile(file);
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
      showToast('Phone Number is required.', 'error');
      return false;
    }
    if (!/^\d{10}$/.test(form.phone.trim())) {
      showToast('Phone Number must be exactly 10 digits and numeric only.', 'error');
      return false;
    }
    if (form.alt_mobile && form.alt_mobile.trim() && !/^\d+$/.test(form.alt_mobile.trim())) {
      showToast('Alternate Mobile must contain numeric digits only.', 'error');
      return false;
    }
    if (!form.email.trim()) {
      showToast('Email Address is required.', 'error');
      return false;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email.trim())) {
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
    if (form.age && isNaN(form.age)) {
      showToast('Age must be a valid number.', 'error');
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
      showToast('Pincode must be exactly 6 digits and numeric.', 'error');
      return false;
    }
    if (form.commission_percentage === undefined || form.commission_percentage === null || form.commission_percentage === '') {
      showToast('Commission Percentage is required.', 'error');
      return false;
    }
    const comm = Number(form.commission_percentage);
    if (isNaN(comm) || comm < 0 || comm > 100) {
      showToast('Commission Percentage must be a number between 0 and 100.', 'error');
      return false;
    }
    if (!isEditMode && (!form.password || !form.password.trim())) {
      showToast('Password is required.', 'error');
      return false;
    }
    return true;
  };

  const handleSave = async (e) => {
    e.preventDefault();
    if (!validateForm()) return;

    setSaving(true);
    const formData = new FormData();
    
    // Append all form inputs
    Object.keys(form).forEach(key => {
      formData.append(key, form[key]);
    });

    // Append files if selected
    if (profileFile) formData.append('profile', profileFile);
    if (panImgFile) formData.append('pan_img', panImgFile);
    if (aadhaarFrontFile) formData.append('aadhaar_front', aadhaarFrontFile);
    if (aadhaarBackFile) formData.append('aadhaar_back', aadhaarBackFile);

    try {
      let res;
      if (isEditMode) {
        formData.append('id', agentId);
        res = await apiRequest('/api/agent/update', {
          method: 'POST',
          body: formData
        });
      } else {
        res = await apiRequest('/api/agent/create', {
          method: 'POST',
          body: formData
        });
      }

      if (res.s === 1) {
        showToast(isEditMode ? 'Agent profile updated successfully!' : 'Agent profile created successfully!', 'success');
        
        if (!isEditMode && res.r?.temp_password_info) {
          showToast(`Agent password is: ${res.r.temp_password_info}`, 'info');
        }

        // Redirect
        router.push(isEditMode ? `/agents/${agentId}` : '/agents');
      } else {
        showToast(res.m || 'Operation failed', 'error');
      }
    } catch (err) {
      console.error(err);
      showToast('An error occurred while saving the agent profile.', 'error');
    } finally {
      setSaving(false);
    }
  };

  const getMediaUrl = (urlPath) => {
    if (!urlPath) return '';
    if (urlPath.startsWith('blob:') || urlPath.startsWith('http:') || urlPath.startsWith('https:')) return urlPath;
    const base = process.env.NEXT_PUBLIC_API_URL || 'https://api.skyrelief.org';
    return `${base}${urlPath.startsWith('/') ? '' : '/'}${urlPath}`;
  };

  if (loading) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '60vh', gap: '12px' }}>
        <div className="spinner" style={{ width: '40px', height: '40px', border: '4px solid #f1f5f9', borderTopColor: '#0ea5e9', borderRadius: '50%', animation: 'spin 1s linear infinite' }} />
        <span style={{ fontSize: '0.875rem', fontWeight: '600', color: '#64748b' }}>Loading agent profile...</span>
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  return (
    <div style={{ maxWidth: '960px', margin: '0 auto', paddingBottom: '40px' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '24px' }}>
        <button 
          onClick={() => router.push(isEditMode ? `/agents/${agentId}` : '/agents')} 
          className="btn-secondary"
          style={{ padding: '6px 12px', borderRadius: '9999px', border: '1px solid #e8edf2' }}
        >
          <ArrowLeft size={16} /> <span>Back</span>
        </button>
        <div>
          <h1 style={{ fontSize: '1.5rem', fontWeight: '800', color: '#0f172a', letterSpacing: '-0.025em' }}>
            {isEditMode ? 'Edit Agent Profile' : 'Add New Agent'}
          </h1>
          <p style={{ color: '#64748b', fontSize: '0.82rem', marginTop: '2px' }}>
            {isEditMode ? `Update details for ${form.first_name} ${form.last_name}` : 'Fill form fields to register a new agent'}
          </p>
        </div>
      </div>

      <form onSubmit={handleSave} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
        
        {/* Card 1: Profile Information */}
        <div className="card" style={{ padding: '24px' }}>
          <h2 style={{ fontSize: '0.95rem', fontWeight: '800', color: '#0f172a', marginBottom: '18px', display: 'flex', alignItems: 'center', gap: '8px', borderBottom: '1px solid #f1f5f9', paddingBottom: '10px' }}>
            👤 Profile Information
          </h2>
          
          <div style={{ display: 'flex', gap: '24px', flexWrap: 'wrap', marginBottom: '20px' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', padding: '14px', background: '#f8fafc', borderRadius: '12px', border: '1px solid #e8edf2', width: '200px' }}>
              <span style={{ fontSize: '0.8rem', fontWeight: '700', color: '#334155' }}>Profile Photo</span>
              
              <div style={{ width: '100%', height: '120px', borderRadius: '8px', overflow: 'hidden', border: '1px solid #e2e8f0', background: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                {previews.profile ? (
                  <img src={getMediaUrl(previews.profile)} alt="Profile Preview" style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
                ) : (
                  <div style={{ textAlign: 'center', color: '#94a3b8' }}>
                    <Upload size={24} style={{ margin: '0 auto 6px' }} />
                    <span style={{ fontSize: '0.68rem' }}>No profile selected</span>
                  </div>
                )}
              </div>
              
              <input type="file" id="profile-upload" accept="image/*" onChange={e => handleFileChange(e, 'profile')} style={{ display: 'none' }} />
              <label htmlFor="profile-upload" className="btn-secondary" style={{ width: '100%', padding: '6px', fontSize: '0.75rem', fontWeight: '700', cursor: 'pointer', textAlign: 'center', boxSizing: 'border-box' }}>
                Upload Image
              </label>
            </div>
            
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

              <div className="grid-r-2" style={{ gap: '16px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: '600', color: '#64748b', marginBottom: '6px' }}>Gender *</label>
                  <select value={form.gender} onChange={e => handleInputChange('gender', e.target.value)} className="premium-input" style={{ width: '100%' }}>
                    <option value="Male">Male</option>
                    <option value="Female">Female</option>
                    <option value="Other">Other</option>
                  </select>
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: '600', color: '#64748b', marginBottom: '6px' }}>Date of Birth *</label>
                  <input type="date" required value={form.dob} onChange={e => handleInputChange('dob', e.target.value)} className="premium-input" style={{ width: '100%' }} />
                </div>
              </div>

              <div className="grid-r-3" style={{ gap: '16px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: '600', color: '#64748b', marginBottom: '6px' }}>Age (Years)</label>
                  <input type="text" value={form.age} onChange={e => handleInputChange('age', e.target.value)} className="premium-input" placeholder="32" style={{ width: '100%' }} />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: '600', color: '#64748b', marginBottom: '6px' }}>Occupation</label>
                  <input type="text" value={form.occupation} onChange={e => handleInputChange('occupation', e.target.value)} className="premium-input" placeholder="Insurance Consultant" style={{ width: '100%' }} />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: '600', color: '#64748b', marginBottom: '6px' }}>Commission Percentage *</label>
                  <input type="number" min="0" max="100" required value={form.commission_percentage} onChange={e => handleInputChange('commission_percentage', e.target.value)} className="premium-input" placeholder="Enter commission percentage" style={{ width: '100%' }} />
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Card 2: Contact Information */}
        <div className="card" style={{ padding: '24px' }}>
          <h2 style={{ fontSize: '0.95rem', fontWeight: '800', color: '#0f172a', marginBottom: '18px', display: 'flex', alignItems: 'center', gap: '8px', borderBottom: '1px solid #f1f5f9', paddingBottom: '10px' }}>
            📞 Contact Information
          </h2>
          
          <div className="grid-r-3" style={{ gap: '16px' }}>
            <div>
              <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: '600', color: '#64748b', marginBottom: '6px' }}>Phone Number *</label>
              <input 
                type="text" 
                required 
                readOnly={isEditMode}
                value={form.phone} 
                onChange={e => handleInputChange('phone', e.target.value)} 
                className="premium-input" 
                placeholder="9876543211" 
                style={{ width: '100%', background: isEditMode ? '#f1f5f9' : '#f8fbff', cursor: isEditMode ? 'not-allowed' : 'text' }} 
              />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: '600', color: '#64748b', marginBottom: '6px' }}>Alternate Mobile</label>
              <input type="text" value={form.alt_mobile} onChange={e => handleInputChange('alt_mobile', e.target.value)} className="premium-input" placeholder="9876543222" style={{ width: '100%' }} />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: '600', color: '#64748b', marginBottom: '6px' }}>Email Address *</label>
              <input type="email" required value={form.email} onChange={e => handleInputChange('email', e.target.value)} className="premium-input" placeholder="rahul.patel@gmail.com" style={{ width: '100%' }} />
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

        {/* Card 3: Address Information */}
        <div className="card" style={{ padding: '24px' }}>
          <h2 style={{ fontSize: '0.95rem', fontWeight: '800', color: '#0f172a', marginBottom: '18px', display: 'flex', alignItems: 'center', gap: '8px', borderBottom: '1px solid #f1f5f9', paddingBottom: '10px' }}>
            📍 Address Information
          </h2>
          
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div className="grid-r-2" style={{ gap: '16px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: '600', color: '#64748b', marginBottom: '6px' }}>Street Address</label>
                <input type="text" value={form.address} onChange={e => handleInputChange('address', e.target.value)} className="premium-input" placeholder="123, Ring Road" style={{ width: '100%' }} />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: '600', color: '#64748b', marginBottom: '6px' }}>Village / Landmark</label>
                <input type="text" value={form.village} onChange={e => handleInputChange('village', e.target.value)} className="premium-input" placeholder="Near Temple" style={{ width: '100%' }} />
              </div>
            </div>

            <div className="grid-r-3" style={{ gap: '16px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: '600', color: '#64748b', marginBottom: '6px' }}>City</label>
                <input type="text" value={form.city} onChange={e => handleInputChange('city', e.target.value)} className="premium-input" placeholder="Ahmedabad" style={{ width: '100%' }} />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: '600', color: '#64748b', marginBottom: '6px' }}>State</label>
                <input type="text" value={form.state} onChange={e => handleInputChange('state', e.target.value)} className="premium-input" placeholder="Gujarat" style={{ width: '100%' }} />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: '600', color: '#64748b', marginBottom: '6px' }}>Pincode</label>
                <input type="text" value={form.pin} onChange={e => handleInputChange('pin', e.target.value)} className="premium-input" placeholder="380007" style={{ width: '100%' }} />
              </div>
            </div>
          </div>
        </div>

        {/* Card 4: KYC Information */}
        <div className="card" style={{ padding: '24px' }}>
          <h2 style={{ fontSize: '0.95rem', fontWeight: '800', color: '#0f172a', marginBottom: '18px', display: 'flex', alignItems: 'center', gap: '8px', borderBottom: '1px solid #f1f5f9', paddingBottom: '10px' }}>
            🪪 KYC Information
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

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '16px', marginTop: '20px' }}>
            {/* Aadhaar Front Uploader */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', padding: '14px', background: '#f8fafc', borderRadius: '12px', border: '1px solid #e8edf2' }}>
              <span style={{ fontSize: '0.8rem', fontWeight: '700', color: '#334155' }}>Aadhaar Front</span>
              <div style={{ width: '100%', height: '110px', borderRadius: '8px', overflow: 'hidden', border: '1px solid #e2e8f0', background: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                {previews.aadhaar_front ? (
                  <img src={getMediaUrl(previews.aadhaar_front)} alt="Aadhaar Front" style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
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

            {/* Aadhaar Back Uploader */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', padding: '14px', background: '#f8fafc', borderRadius: '12px', border: '1px solid #e8edf2' }}>
              <span style={{ fontSize: '0.8rem', fontWeight: '700', color: '#334155' }}>Aadhaar Back</span>
              <div style={{ width: '100%', height: '110px', borderRadius: '8px', overflow: 'hidden', border: '1px solid #e2e8f0', background: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                {previews.aadhaar_back ? (
                  <img src={getMediaUrl(previews.aadhaar_back)} alt="Aadhaar Back" style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
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

            {/* PAN Image Uploader */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', padding: '14px', background: '#f8fafc', borderRadius: '12px', border: '1px solid #e8edf2' }}>
              <span style={{ fontSize: '0.8rem', fontWeight: '700', color: '#334155' }}>PAN Image</span>
              <div style={{ width: '100%', height: '110px', borderRadius: '8px', overflow: 'hidden', border: '1px solid #e2e8f0', background: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                {previews.pan_img ? (
                  <img src={getMediaUrl(previews.pan_img)} alt="PAN Card" style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
                ) : (
                  <div style={{ textAlign: 'center', color: '#94a3b8' }}>
                    <Upload size={20} style={{ margin: '0 auto 4px' }} />
                    <span style={{ fontSize: '0.65rem' }}>No image</span>
                  </div>
                )}
              </div>
              <input type="file" id="pan-image-upload" accept="image/*" onChange={e => handleFileChange(e, 'pan_img')} style={{ display: 'none' }} />
              <label htmlFor="pan-image-upload" className="btn-secondary" style={{ width: '100%', padding: '6px', fontSize: '0.72rem', fontWeight: '700', cursor: 'pointer', textAlign: 'center', boxSizing: 'border-box' }}>
                Select PAN
              </label>
            </div>
          </div>
        </div>

        {/* Card 5: Additional Notes */}
        <div className="card" style={{ padding: '24px' }}>
          <h2 style={{ fontSize: '0.95rem', fontWeight: '800', color: '#0f172a', marginBottom: '18px', display: 'flex', alignItems: 'center', gap: '8px', borderBottom: '1px solid #f1f5f9', paddingBottom: '10px' }}>
            📝 Additional Notes
          </h2>
          <div>
            <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: '600', color: '#64748b', marginBottom: '6px' }}>Administrative Notes</label>
            <textarea value={form.notes} onChange={e => handleInputChange('notes', e.target.value)} className="premium-input" placeholder="Add custom notes..." rows={3} style={{ width: '100%', resize: 'none', fontFamily: 'inherit' }} />
          </div>
        </div>

        {/* Submit Actions */}
        <div style={{ display: 'flex', gap: '16px', marginTop: '10px' }}>
          <button 
            type="button" 
            onClick={() => router.push(isEditMode ? `/agents/${agentId}` : '/agents')} 
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
              <span>{isEditMode ? 'Update Agent' : 'Create Agent'}</span>
            )}
          </button>
        </div>

      </form>
    </div>
  );
}
