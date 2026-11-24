import React, { useState, useEffect } from 'react';
import { Plus, Trash2, Play, Users, Sun } from 'lucide-react';
import { api } from '../api';
import ErrorBanner from '../components/ErrorBanner';

export default function Admin() {
  const [tab, setTab] = useState('plants');
  const [plants, setPlants] = useState([]);
  const [users, setUsers] = useState([]);
  const [error, setError] = useState(null);
  const [testResult, setTestResult] = useState(null);
  const [newDeviceKey, setNewDeviceKey] = useState(null);

  // Form states
  const [pName, setPName] = useState('');
  const [pCap, setPCap] = useState('5.0');
  const [pRate, setPRate] = useState('7.0');
  const [uName, setUName] = useState('');
  const [uEmail, setUEmail] = useState('');
  const [uPass, setUPass] = useState('');
  const [uRole, setURole] = useState('viewer');

  const loadData = async () => {
    try {
      const [pList, uList] = await Promise.all([api.getPlants(), api.getUsers()]);
      setPlants(pList);
      setUsers(uList);
    } catch (e) { setError(e.message); }
  };

  useEffect(() => { loadData(); }, []);

  const handleCreatePlant = async (e) => {
    e.preventDefault();
    if (!pName) return;
    try {
      const res = await api.createPlant({ name: pName, capacityKw: parseFloat(pCap), unitRateInr: parseFloat(pRate), sourceType: 'mock' });
      setNewDeviceKey(res.deviceKey);
      setPName('');
      loadData();
    } catch (e) { setError(e.message); }
  };

  const handleCreateUser = async (e) => {
    e.preventDefault();
    if (!uName || !uEmail || !uPass) return;
    try {
      await api.createUser({ name: uName, email: uEmail, password: uPass, role: uRole });
      setUName(''); setUEmail(''); setUPass('');
      loadData();
    } catch (e) { setError(e.message); }
  };

  const handleTestCollector = async (plantId) => {
    setTestResult('Testing...');
    try {
      const res = await api.testCollector(plantId);
      setTestResult(JSON.stringify(res.reading, null, 2));
    } catch (e) { setTestResult('Error: ' + e.message); }
  };

  const toggleAccess = async (userId, plantId, currentIds) => {
    const next = currentIds.includes(plantId) ? currentIds.filter(id => id !== plantId) : [...currentIds, plantId];
    try {
      await api.setUserPlants(userId, next);
      loadData();
    } catch (e) { setError(e.message); }
  };

  return (
    <div>
      <h2 style={{ fontSize: '20px', fontWeight: 800, marginBottom: '14px' }}>Admin Management</h2>
      <ErrorBanner message={error} onRetry={() => setError(null)} />

      <div style={{ display: 'flex', backgroundColor: 'var(--bg-card)', borderRadius: '12px', padding: '4px', marginBottom: '16px' }}>
        <button onClick={() => setTab('plants')} style={{ flex: 1, minHeight: '36px', borderRadius: '8px', fontSize: '13px', backgroundColor: tab === 'plants' ? 'var(--sun-yellow)' : 'transparent', color: tab === 'plants' ? '#000' : 'var(--text-muted)' }}>
          Plants ({plants.length})
        </button>
        <button onClick={() => setTab('users')} style={{ flex: 1, minHeight: '36px', borderRadius: '8px', fontSize: '13px', backgroundColor: tab === 'users' ? 'var(--sun-yellow)' : 'transparent', color: tab === 'users' ? '#000' : 'var(--text-muted)' }}>
          Users ({users.length})
        </button>
      </div>

      {newDeviceKey && (
        <div className="card" style={{ backgroundColor: 'var(--sun-glow)', borderColor: 'var(--sun-yellow)', marginBottom: '14px' }}>
          <strong>Device Key Generated (shown once):</strong>
          <code style={{ display: 'block', padding: '6px', marginTop: '4px', background: 'var(--bg-card)', borderRadius: '6px' }}>{newDeviceKey}</code>
        </div>
      )}

      {testResult && (
        <div className="card" style={{ marginBottom: '14px', fontSize: '12px' }}>
          <strong>Collector Test Result:</strong>
          <pre style={{ overflowX: 'auto', marginTop: '6px' }}>{testResult}</pre>
          <button onClick={() => setTestResult(null)} style={{ marginTop: '6px', fontSize: '11px', minHeight: '28px', padding: '2px 8px' }}>Close</button>
        </div>
      )}

      {tab === 'plants' ? (
        <div>
          <form onSubmit={handleCreatePlant} className="card" style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '14px' }}>
            <strong>Add Plant</strong>
            <input placeholder="Plant Name" value={pName} onChange={e => setPName(e.target.value)} style={{ padding: '8px', borderRadius: '8px', border: '1px solid var(--border)', background: 'var(--bg-app)', color: 'var(--text-main)' }} />
            <div style={{ display: 'flex', gap: '8px' }}>
              <input type="number" step="0.1" placeholder="Capacity kW" value={pCap} onChange={e => setPCap(e.target.value)} style={{ flex: 1, padding: '8px', borderRadius: '8px', border: '1px solid var(--border)', background: 'var(--bg-app)', color: 'var(--text-main)' }} />
              <input type="number" step="0.1" placeholder="Rate ₹/kWh" value={pRate} onChange={e => setPRate(e.target.value)} style={{ flex: 1, padding: '8px', borderRadius: '8px', border: '1px solid var(--border)', background: 'var(--bg-app)', color: 'var(--text-main)' }} />
            </div>
            <button type="submit" style={{ background: 'var(--sun-yellow)', color: '#000', fontWeight: 700, minHeight: '38px' }}>Add Plant</button>
          </form>

          {plants.map(p => (
            <div key={p.id} className="card" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <div style={{ fontWeight: 700 }}>{p.name}</div>
                <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>{p.capacityKw} kW · ₹{p.unitRateInr || 7}/unit</div>
              </div>
              <div style={{ display: 'flex', gap: '6px' }}>
                <button onClick={() => handleTestCollector(p.id)} title="Test Collector" style={{ background: 'var(--bg-app)', border: '1px solid var(--border)', padding: '6px', minHeight: '36px', minWidth: '36px', color: 'var(--text-main)' }}><Play size={16} /></button>
                <button onClick={() => api.deletePlant(p.id).then(loadData)} style={{ background: 'var(--bg-app)', border: '1px solid var(--border)', padding: '6px', minHeight: '36px', minWidth: '36px', color: 'var(--status-fault)' }}><Trash2 size={16} /></button>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div>
          <form onSubmit={handleCreateUser} className="card" style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '14px' }}>
            <strong>Add User</strong>
            <input placeholder="Name" value={uName} onChange={e => setUName(e.target.value)} style={{ padding: '8px', borderRadius: '8px', border: '1px solid var(--border)', background: 'var(--bg-app)', color: 'var(--text-main)' }} />
            <input placeholder="Email" value={uEmail} onChange={e => setUEmail(e.target.value)} style={{ padding: '8px', borderRadius: '8px', border: '1px solid var(--border)', background: 'var(--bg-app)', color: 'var(--text-main)' }} />
            <input type="password" placeholder="Password" value={uPass} onChange={e => setUPass(e.target.value)} style={{ padding: '8px', borderRadius: '8px', border: '1px solid var(--border)', background: 'var(--bg-app)', color: 'var(--text-main)' }} />
            <select value={uRole} onChange={e => setURole(e.target.value)} style={{ padding: '8px', borderRadius: '8px', border: '1px solid var(--border)', background: 'var(--bg-app)', color: 'var(--text-main)' }}>
              <option value="viewer">Viewer</option>
              <option value="admin">Admin</option>
            </select>
            <button type="submit" style={{ background: 'var(--sun-yellow)', color: '#000', fontWeight: 700, minHeight: '38px' }}>Create User</button>
          </form>

          {users.map(u => (
            <div key={u.id} className="card">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <div style={{ fontWeight: 700 }}>{u.name} ({u.role})</div>
                  <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>{u.email}</div>
                </div>
                <button onClick={() => api.deleteUser(u.id).then(loadData)} style={{ background: 'var(--bg-app)', border: '1px solid var(--border)', padding: '6px', minHeight: '36px', minWidth: '36px', color: 'var(--status-fault)' }}><Trash2 size={16} /></button>
              </div>
              {u.role !== 'admin' && (
                <div style={{ marginTop: '10px', paddingTop: '8px', borderTop: '1px solid var(--border)', fontSize: '12px' }}>
                  <span style={{ color: 'var(--text-muted)' }}>Plant Access:</span>
                  <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginTop: '4px' }}>
                    {plants.map(p => (
                      <label key={p.id} style={{ display: 'flex', alignItems: 'center', gap: '4px', cursor: 'pointer' }}>
                        <input type="checkbox" checked={(u.plantIds || []).includes(p.id)} onChange={() => toggleAccess(u.id, p.id, u.plantIds || [])} />
                        {p.name}
                      </label>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
