import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext.jsx';
import api from '../services/api.js';
import { Upload, Database, CheckCircle2, AlertTriangle, ArrowRight, RefreshCw, FileText } from 'lucide-react';

export const ImportCSV = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  
  // Setup group selection
  const [groups, setGroups] = useState([]);
  const [selectedGroupId, setSelectedGroupId] = useState('');
  
  // Importer wizard stages: upload, review, report
  const [stage, setStage] = useState('upload'); // upload, review, report
  const [file, setFile] = useState(null);
  
  // Session details
  const [importSessionId, setImportSessionId] = useState('');
  const [anomaliesQueue, setAnomaliesQueue] = useState([]); // List of rows needing review
  const [groupMembers, setGroupMembers] = useState([]);
  
  // Tracking user resolutions: rowNumber -> resolution details
  const [resolutions, setResolutions] = useState({});
  
  // Final Import Report results
  const [importReport, setImportReport] = useState(null);

  // Loading / Error states
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchGroups = async () => {
      try {
        const res = await api.get('/groups');
        setGroups(res.data.groups);
        if (res.data.groups.length > 0) {
          setSelectedGroupId(res.data.groups[0].id);
        }
      } catch (err) {
        console.error('Error fetching groups:', err);
      }
    };
    fetchGroups();
  }, []);

  useEffect(() => {
    // If a group is selected, fetch its members to populate selectors inside the wizard
    const fetchMembers = async () => {
      if (!selectedGroupId) return;
      try {
        const res = await api.get(`/groups/${selectedGroupId}/members`);
        setGroupMembers(res.data.members);
      } catch (err) {
        console.error('Error fetching group members:', err);
      }
    };
    fetchMembers();
  }, [selectedGroupId]);

  const handleFileChange = (e) => {
    if (e.target.files && e.target.files.length > 0) {
      setFile(e.target.files[0]);
    }
  };

  const handleUploadSubmit = async (e) => {
    e.preventDefault();
    setError('');
    
    if (!file || !selectedGroupId) {
      return setError('Please select both a group and a CSV file.');
    }

    setLoading(true);
    const formData = new FormData();
    formData.append('file', file);
    formData.append('groupId', selectedGroupId);

    try {
      const res = await api.post('/import/parse', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      
      const { importSessionId: sessionId, anomalies } = res.data;
      setImportSessionId(sessionId);
      
      if (anomalies.length === 0) {
        // No anomalies! Commit clean import automatically
        const commitRes = await api.post('/import/confirm', {
          importSessionId: sessionId,
          resolutions: []
        });
        setImportReport(commitRes.data);
        setStage('report');
      } else {
        setAnomaliesQueue(anomalies);
        
        // Pre-initialize resolutions state for each anomaly row
        const initialResolutions = {};
        anomalies.forEach(row => {
          // Default first action
          const mainAnomaly = row.anomalies[0];
          initialResolutions[row.rowNumber] = {
            rowNumber: row.rowNumber,
            issueType: mainAnomaly.type,
            action: mainAnomaly.options ? mainAnomaly.options[0] : 'auto_fix'
          };
        });
        setResolutions(initialResolutions);
        setStage('review');
      }
    } catch (err) {
      setError(err.response?.data?.error || 'Error uploading and parsing CSV.');
    } finally {
      setLoading(false);
    }
  };

  const handleResolutionChange = (rowNumber, updates) => {
    setResolutions(prev => ({
      ...prev,
      [rowNumber]: {
        ...prev[rowNumber],
        ...updates
      }
    }));
  };

  const handleConfirmSubmit = async () => {
    setLoading(true);
    setError('');

    try {
      const list = Object.values(resolutions);
      const res = await api.post('/import/confirm', {
        importSessionId,
        resolutions: list
      });
      setImportReport(res.data);
      setStage('report');
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to apply resolutions and import.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto px-4 py-8 space-y-8">
      {/* Header card */}
      <div className="space-y-1">
        <h1 className="text-3xl font-bold tracking-tight text-white flex items-center space-x-2">
          <Database className="text-[#06B6D4]" />
          <span>Interactive CSV Importer</span>
        </h1>
        <p className="text-sm text-gray-400">
          Upload and import your flatmates shared expenses sheet securely.
        </p>
      </div>

      {error && (
        <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm font-semibold text-center">
          {error}
        </div>
      )}

      {/* STAGE 1: UPLOAD */}
      {stage === 'upload' && (
        <form onSubmit={handleUploadSubmit} className="glass-card rounded-2xl p-8 space-y-6 max-w-xl mx-auto">
          <div className="space-y-2">
            <label className="text-xs font-bold uppercase tracking-wider text-gray-400">
              1. Select Destination Group
            </label>
            <select
              value={selectedGroupId}
              onChange={(e) => setSelectedGroupId(e.target.value)}
              className="w-full rounded-lg bg-white/5 border border-white/10 px-4 py-2.5 text-sm text-white focus:outline-none focus:border-[#06B6D4]"
            >
              {groups.map(g => (
                <option key={g.id} value={g.id} className="bg-[#0f172a]">{g.name}</option>
              ))}
            </select>
          </div>

          <div className="space-y-2">
            <label className="text-xs font-bold uppercase tracking-wider text-gray-400 font-sans">
              2. Upload expenses_export.csv
            </label>
            
            <div className="border-2 border-dashed border-white/10 hover:border-white/20 rounded-2xl p-8 text-center cursor-pointer transition-all relative">
              <input
                type="file"
                accept=".csv"
                onChange={handleFileChange}
                className="absolute inset-0 opacity-0 cursor-pointer"
              />
              <div className="space-y-3">
                <div className="mx-auto w-12 h-12 rounded-xl bg-white/5 flex items-center justify-center text-gray-400">
                  <Upload size={24} />
                </div>
                <div className="text-sm font-bold text-white">
                  {file ? file.name : 'Click to select or drag CSV file'}
                </div>
                <p className="text-xs text-gray-500">Only CSV files up to 5MB are supported</p>
              </div>
            </div>
          </div>

          <button
            type="submit"
            disabled={loading || !file}
            className="w-full flex items-center justify-center space-x-2 py-3 rounded-lg bg-gradient-to-r from-[#8B5CF6] to-[#06B6D4] font-semibold text-sm text-white hover:opacity-90 disabled:opacity-50"
          >
            {loading ? (
              <RefreshCw className="animate-spin" size={16} />
            ) : (
              <>
                <span>Parse CSV File</span>
                <ArrowRight size={16} />
              </>
            )}
          </button>
        </form>
      )}

      {/* STAGE 2: REVIEW ANOMALIES */}
      {stage === 'review' && (
        <div className="space-y-6">
          <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-400 text-sm flex items-center space-x-3">
            <AlertTriangle size={20} />
            <span>
              We found <strong>{anomaliesQueue.length}</strong> rows containing anomalies. Please choose resolutions below.
            </span>
          </div>

          <div className="space-y-6">
            {anomaliesQueue.map((row) => {
              const rowRes = resolutions[row.rowNumber] || {};
              const mainAnomaly = row.anomalies[0];

              return (
                <div key={row.rowNumber} className="glass-card rounded-2xl p-6 space-y-4 border-l-4 border-l-amber-500">
                  {/* Row Details Header */}
                  <div className="flex items-start justify-between">
                    <div className="space-y-1">
                      <h4 className="text-sm font-bold text-white">Row {row.rowNumber}: "{row.description}"</h4>
                      <p className="text-xs text-gray-400">Detected Issues: {row.anomalies.map(a => a.type).join(', ')}</p>
                    </div>
                  </div>

                  {/* Resolution Input */}
                  <div className="p-4 rounded-xl bg-white/5 border border-white/5 space-y-4 text-xs">
                    <div className="text-gray-300 font-semibold flex items-center space-x-1.5">
                      <AlertTriangle size={14} className="text-amber-500" />
                      <span>{mainAnomaly.description}</span>
                    </div>

                    {/* Resolution choices mapping options */}
                    <div className="flex flex-wrap items-center gap-3">
                      <span className="text-gray-400 uppercase tracking-wider font-bold">Action:</span>

                      {/* Dropdown select actions */}
                      {mainAnomaly.options && (
                        <select
                          value={rowRes.action}
                          onChange={(e) => handleResolutionChange(row.rowNumber, { action: e.target.value })}
                          className="rounded-lg bg-white/10 border border-white/10 px-3 py-1.5 text-xs text-white"
                        >
                          {mainAnomaly.options.map(opt => (
                            <option key={opt} value={opt} className="bg-[#0f172a] capitalize">
                              {opt.replace(/_/g, ' ')}
                            </option>
                          ))}
                        </select>
                      )}

                      {/* Missing Payer Choice helper dropdown */}
                      {rowRes.action === 'assign_payer' && (
                        <select
                          value={rowRes.selectedUserId || ''}
                          onChange={(e) => handleResolutionChange(row.rowNumber, { selectedUserId: e.target.value })}
                          className="rounded-lg bg-white/10 border border-[#06B6D4] px-3 py-1.5 text-xs text-white"
                        >
                          <option value="" className="bg-[#0f172a]" disabled>Select member...</option>
                          {groupMembers.map(m => (
                            <option key={m.user_id} value={m.user_id} className="bg-[#0f172a]">{m.name}</option>
                          ))}
                        </select>
                      )}

                      {/* Ambiguous Date Choice helper */}
                      {rowRes.action === 'select_date' && mainAnomaly.choices && (
                        <div className="flex items-center space-x-2">
                          {mainAnomaly.choices.map(choice => (
                            <button
                              key={choice}
                              type="button"
                              onClick={() => handleResolutionChange(row.rowNumber, { selectedDate: choice })}
                              className={`px-3 py-1 rounded border text-xs font-semibold ${
                                rowRes.selectedDate === choice
                                  ? 'bg-[#06B6D4]/10 border-[#06B6D4] text-[#06B6D4]'
                                  : 'border-white/10 text-gray-300'
                              }`}
                            >
                              {new Date(choice).toLocaleDateString()}
                            </button>
                          ))}
                        </div>
                      )}

                      {/* Non Group Member: mapping user helper */}
                      {rowRes.action === 'map_member' && (
                        <select
                          value={rowRes.targetUserId || ''}
                          onChange={(e) => handleResolutionChange(row.rowNumber, { targetUserId: e.target.value })}
                          className="rounded-lg bg-white/10 border border-[#06B6D4] px-3 py-1.5 text-xs text-white"
                        >
                          <option value="" className="bg-[#0f172a]" disabled>Map to member...</option>
                          {groupMembers.map(m => (
                            <option key={m.user_id} value={m.user_id} className="bg-[#0f172a]">{m.name}</option>
                          ))}
                        </select>
                      )}

                      {/* Non Group Member: create user timeline helper name */}
                      {rowRes.action === 'add_member' && (
                        <input
                          type="text"
                          value={rowRes.memberName || mainAnomaly.memberName || ''}
                          onChange={(e) => handleResolutionChange(row.rowNumber, { memberName: e.target.value })}
                          className="rounded-lg bg-white/10 border border-[#06B6D4] px-3 py-1.5 text-xs text-white focus:outline-none"
                          placeholder="Member name"
                        />
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          <div className="flex items-center justify-between pt-6 border-t border-white/5">
            <button
              onClick={() => { setStage('upload'); setAnomaliesQueue([]); setFile(null); }}
              className="px-4 py-2 text-sm font-semibold text-gray-400 hover:text-white"
            >
              Back to Upload
            </button>
            <button
              onClick={handleConfirmSubmit}
              disabled={loading}
              className="flex items-center space-x-2 px-6 py-2.5 rounded-lg bg-gradient-to-r from-[#8B5CF6] to-[#06B6D4] text-sm font-semibold text-white hover:opacity-90 disabled:opacity-50 shadow-md shadow-cyan-500/20"
            >
              {loading ? (
                <RefreshCw className="animate-spin" size={16} />
              ) : (
                <>
                  <span>Commit Import Resolutions</span>
                  <CheckCircle2 size={16} />
                </>
              )}
            </button>
          </div>
        </div>
      )}

      {/* STAGE 3: IMPORT REPORT */}
      {stage === 'report' && importReport && (
        <div className="space-y-6">
          <div className="glass-card rounded-2xl p-8 text-center space-y-4 max-w-xl mx-auto">
            <CheckCircle2 className="mx-auto text-[#22C55E]" size={56} />
            <h2 className="text-2xl font-bold text-white">Import Successfully Completed</h2>
            
            <div className="grid grid-cols-3 gap-4 border-y border-white/10 py-6 my-2 text-sm">
              <div>
                <div className="text-xs text-gray-400">Total Parsed</div>
                <div className="text-xl font-bold text-white">{importReport.report.summary.total}</div>
              </div>
              <div>
                <div className="text-xs text-gray-[#22C55E]">Imported</div>
                <div className="text-xl font-bold text-[#22C55E]">{importReport.imported_count}</div>
              </div>
              <div>
                <div className="text-xs text-gray-400">Skipped</div>
                <div className="text-xl font-bold text-gray-300">{importReport.skipped_count}</div>
              </div>
            </div>
            
            <div className="flex items-center justify-center space-x-4 pt-2">
              <button
                onClick={() => navigate(`/groups/${selectedGroupId}`)}
                className="px-6 py-2 rounded-lg bg-gradient-to-r from-[#8B5CF6] to-[#06B6D4] text-sm font-semibold text-white"
              >
                Go to Group Ledger
              </button>
              <button
                onClick={() => { setStage('upload'); setFile(null); setImportReport(null); }}
                className="px-6 py-2 rounded-lg bg-white/5 border border-white/10 hover:bg-white/10 text-sm font-semibold text-gray-300"
              >
                Import Another File
              </button>
            </div>
          </div>

          {/* Import Timeline Log details (Report!) */}
          <div className="glass-card rounded-2xl p-6 space-y-4">
            <h3 className="text-lg font-bold text-white flex items-center space-x-2">
              <FileText size={18} />
              <span>Import Resolution Logs (Audit Timeline)</span>
            </h3>

            <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
              {importReport.report.logs.map((log, idx) => (
                <div key={idx} className="p-2.5 rounded bg-white/5 border border-white/5 text-xs text-gray-300 font-mono">
                  {log}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
export default ImportCSV;
