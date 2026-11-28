import React, { useEffect, useState } from 'react';
import UnifiedShell from './UnifiedShell.jsx';
import { api, AuthAPI, API_BASE } from './api.js';
import { useAuth } from './AuthContext.jsx';

export default function ProfilePage() {
  const { user, refresh } = useAuth();
  const [profile, setProfile] = useState(null);
  const [name, setName] = useState('');
  const [title, setTitle] = useState('');
  const [msg, setMsg] = useState('');
  const [err, setErr] = useState('');

  const [currPw, setCurrPw] = useState('');
  const [newPw, setNewPw] = useState('');
  const [sigTick, setSigTick] = useState(0);
  const [hasSig, setHasSig] = useState(false);

  const load = async () => {
    try {
      const res = await api.get('/api/profile');
      const p = res?.user || res?.profile || res;
      setProfile(p);
      setName(p?.name || user?.name || '');
      setTitle(p?.title || p?.position || '');
      setHasSig(Boolean(p?.has_signature || p?.hasSignature || p?.signature_mime));
    } catch (e) {
      setErr(e.message);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const handleSaveProfile = async (e) => {
    e.preventDefault();
    setMsg('');
    setErr('');
    try {
      await api.put('/api/profile', { name, title });
      await refresh();
      setMsg('Profile updated.');
    } catch (e2) {
      setErr(e2.message);
    }
  };

  const handleChangePw = async (e) => {
    e.preventDefault();
    setMsg('');
    setErr('');
    try {
      await AuthAPI.changePassword(currPw, newPw);
      setCurrPw('');
      setNewPw('');
      setMsg('Password updated successfully.');
    } catch (e2) {
      setErr(e2.message);
    }
  };

  const handleUploadSig = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setMsg('');
    setErr('');
    const fd = new FormData();
    fd.append('signature', file);
    try {
      await api.post('/api/profile/signature', fd);
      setHasSig(true);
      setSigTick((t) => t + 1);
      setMsg('E-Signature uploaded.');
    } catch (e2) {
      setErr(e2.message);
    }
  };

  const handleDeleteSig = async () => {
    setMsg('');
    setErr('');
    try {
      await api.del('/api/profile/signature');
      setHasSig(false);
      setMsg('E-Signature removed.');
    } catch (e2) {
      setErr(e2.message);
    }
  };

  return (
    <UnifiedShell title="My Profile & E-Signature" subtitle="Account settings, password security, and approval e-signature">
      {msg && <div className="lpms-alert lpms-alert-success">{msg}</div>}
      {err && <div className="lpms-alert lpms-alert-error">{err}</div>}

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))', gap: 18 }}>
        <div className="lpms-card">
          <h3 className="lpms-card-title">Account Information</h3>
          <form onSubmit={handleSaveProfile} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <div className="lpms-field">
              <label>Full Name</label>
              <input className="lpms-input" value={name} onChange={(e) => setName(e.target.value)} required />
            </div>
            <div className="lpms-field">
              <label>Email</label>
              <input className="lpms-input" value={profile?.email || user?.email || ''} disabled />
            </div>
            <div className="lpms-field">
              <label>Academic Title / Position</label>
              <input className="lpms-input" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. Associate Professor" />
            </div>
            <div>
              <button type="submit" className="lpms-btn lpms-btn-primary">Save Profile</button>
            </div>
          </form>
        </div>

        <div className="lpms-card">
          <h3 className="lpms-card-title">Digital E-Signature</h3>
          <p style={{ fontSize: 13, color: '#6b7280', marginTop: 0 }}>
            Used on approved Learning Plan PDFs, endorsement records, and consultant sign-offs.
          </p>
          {hasSig ? (
            <div style={{ border: '1px dashed #d1d5db', borderRadius: 10, padding: 14, textAlign: 'center', marginBottom: 12 }}>
              <img
                src={`${API_BASE}/api/profile/signature?t=${sigTick}`}
                alt="My E-Signature"
                style={{ maxHeight: 90, maxWidth: '100%', objectFit: 'contain' }}
              />
            </div>
          ) : (
            <div style={{ border: '1px dashed #d1d5db', borderRadius: 10, padding: 20, textAlign: 'center', color: '#9ca3af', marginBottom: 12, fontSize: 13 }}>
              No signature uploaded yet.
            </div>
          )}
          <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
            <label className="lpms-btn lpms-btn-primary" style={{ cursor: 'pointer' }}>
              Upload PNG/JPG Signature
              <input type="file" accept="image/png,image/jpeg" style={{ display: 'none' }} onChange={handleUploadSig} />
            </label>
            {hasSig && (
              <button type="button" className="lpms-btn" onClick={handleDeleteSig}>
                Remove Signature
              </button>
            )}
          </div>
        </div>

        <div className="lpms-card">
          <h3 className="lpms-card-title">Change Password</h3>
          <form onSubmit={handleChangePw} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <div className="lpms-field">
              <label>Current Password</label>
              <input type="password" className="lpms-input" value={currPw} onChange={(e) => setCurrPw(e.target.value)} required />
            </div>
            <div className="lpms-field">
              <label>New Password</label>
              <input type="password" className="lpms-input" value={newPw} onChange={(e) => setNewPw(e.target.value)} required minLength={8} />
            </div>
            <div>
              <button type="submit" className="lpms-btn lpms-btn-primary">Update Password</button>
            </div>
          </form>
        </div>
      </div>
    </UnifiedShell>
  );
}
