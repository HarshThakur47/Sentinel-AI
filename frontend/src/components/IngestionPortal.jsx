import React, { useState, useRef } from 'react';
import { UploadCloud, FileText, Trash2, Play, AlertCircle, CheckCircle, Zap, Terminal, RefreshCw } from 'lucide-react';

const API_BASE = 'http://localhost:5000/api/v1';

const IngestionPortal = () => {
  const [selectedFiles, setSelectedFiles] = useState([]);
  const [isParallel, setIsParallel] = useState(true);
  const [isUploading, setIsUploading] = useState(false);
  const [logs, setLogs] = useState([]);
  const [uploadResults, setUploadResults] = useState(null);
  const fileInputRef = useRef(null);

  const addLog = (message, type = 'info') => {
    const timestamp = new Date().toLocaleTimeString();
    setLogs((prev) => [...prev, { timestamp, message, type }]);
  };

  const handleDragOver = (e) => {
    e.preventDefault();
  };

  const handleDrop = (e) => {
    e.preventDefault();
    if (isUploading) return;
    const files = Array.from(e.dataTransfer.files).filter(file => file.type === 'application/pdf');
    if (files.length === 0) {
      addLog('Dropped files were not PDFs. Only PDF files are supported.', 'error');
      return;
    }
    addFilesToQueue(files);
  };

  const handleFileSelect = (e) => {
    const files = Array.from(e.target.files).filter(file => file.type === 'application/pdf');
    addFilesToQueue(files);
  };

  const addFilesToQueue = (files) => {
    const newFiles = files.filter(
      (file) => !selectedFiles.some((f) => f.name === file.name)
    );
    if (newFiles.length === 0) return;
    setSelectedFiles((prev) => [...prev, ...newFiles]);
    addLog(`Added ${newFiles.length} file(s) to queue.`, 'info');
  };

  const removeFile = (index) => {
    if (isUploading) return;
    const removedFile = selectedFiles[index];
    setSelectedFiles((prev) => prev.filter((_, i) => i !== index));
    addLog(`Removed file from queue: ${removedFile.name}`, 'warning');
  };

  const triggerUpload = async () => {
    if (selectedFiles.length === 0 || isUploading) return;
    setIsUploading(true);
    setUploadResults(null);
    setLogs([]);
    addLog(`Starting ingestion pipeline for ${selectedFiles.length} document(s)...`, 'info');
    addLog(`Ingestion mode: ${isParallel ? 'PARALLEL processing enabled' : 'SEQUENTIAL processing enabled'}`, 'info');

    const formData = new FormData();
    selectedFiles.forEach((file) => {
      formData.append('documents', file);
    });
    formData.append('parallel', isParallel.toString());

    const startTime = performance.now();

    try {
      addLog('Uploading files to backend...', 'info');
      const response = await fetch(`${API_BASE}/documents/upload`, {
        method: 'POST',
        body: formData,
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || `HTTP ${response.status}`);
      }

      const endTime = performance.now();
      const durationSec = ((endTime - startTime) / 1000).toFixed(2);

      addLog(`Backend processing complete in ${durationSec} seconds.`, 'success');
      
      if (data.results) {
        data.results.forEach((res) => {
          addLog(`✓ ${res.filename}: Ingested into ${res.chunksGenerated} text chunks.`, 'success');
        });
      }

      setUploadResults({
        success: true,
        duration: durationSec,
        results: data.results || [],
      });
      setSelectedFiles([]);
    } catch (err) {
      addLog(`Ingestion failed: ${err.message}`, 'error');
      setUploadResults({
        success: false,
        error: err.message,
      });
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div className="ingestion-portal animate-fade-in">
      <div className="portal-header">
        <h2>Knowledge Base Ingestion</h2>
        <p>Convert medical guidelines, research publications, or manuals into searchable vectors in your database.</p>
      </div>

      <div className="portal-grid">
        <div className="portal-main-panel">
          {/* Drag and Drop Zone */}
          <div 
            className={`dropzone ${isUploading ? 'disabled' : ''}`}
            onDragOver={handleDragOver}
            onDrop={handleDrop}
            onClick={() => !isUploading && fileInputRef.current?.click()}
          >
            <input 
              type="file" 
              multiple 
              accept=".pdf"
              ref={fileInputRef} 
              style={{ display: 'none' }} 
              onChange={handleFileSelect}
              disabled={isUploading}
            />
            <UploadCloud size={48} className="upload-icon" />
            <h3>Drag & Drop PDF Documents</h3>
            <p>or click to browse files from your computer (PDF only)</p>
          </div>

          {/* Files List Queue */}
          {selectedFiles.length > 0 && (
            <div className="queue-section animate-slide-up">
              <div className="section-title">
                <h4>Files In Queue ({selectedFiles.length})</h4>
              </div>
              <div className="files-list">
                {selectedFiles.map((file, idx) => (
                  <div key={idx} className="file-item">
                    <FileText size={20} className="file-icon" />
                    <div className="file-details">
                      <span className="file-name">{file.name}</span>
                      <span className="file-size">{(file.size / 1024 / 1024).toFixed(2)} MB</span>
                    </div>
                    <button 
                      className="remove-btn" 
                      onClick={(e) => { e.stopPropagation(); removeFile(idx); }}
                      disabled={isUploading}
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Ingestion Settings */}
          <div className="settings-section animate-slide-up">
            <h4>Ingestion Engine Settings</h4>
            <div className="settings-card">
              <div className="setting-row">
                <div className="setting-info">
                  <div className="setting-title">
                    <Zap size={16} className="accent-color" />
                    <span>Parallel Processing Mode</span>
                  </div>
                  <p>Splits PDFs and generates embeddings concurrently. Speed is up to 5x faster, but may exceed limits on free-tier API keys.</p>
                </div>
                <label className="toggle-switch">
                  <input 
                    type="checkbox" 
                    checked={isParallel} 
                    onChange={(e) => setIsParallel(e.target.checked)}
                    disabled={isUploading}
                  />
                  <span className="slider"></span>
                </label>
              </div>
            </div>
          </div>

          {/* Action Trigger */}
          <button 
            className="action-button primary-btn"
            disabled={selectedFiles.length === 0 || isUploading}
            onClick={triggerUpload}
          >
            {isUploading ? (
              <>
                <RefreshCw className="spinner" size={20} />
                <span>Processing & Indexing Vector DB...</span>
              </>
            ) : (
              <>
                <Play size={20} />
                <span>Start Ingestion Process</span>
              </>
            )}
          </button>
        </div>

        {/* Console / Monitoring Sidebar */}
        <div className="portal-side-panel">
          <div className="logs-panel-header">
            <Terminal size={18} />
            <h4>Live Pipeline Monitor</h4>
          </div>
          <div className="logs-container">
            {logs.length === 0 ? (
              <div className="empty-logs">
                <p>Waiting for ingestion to start. Monitor chunking, embeddings, and vector DB uploads here.</p>
              </div>
            ) : (
              logs.map((log, idx) => (
                <div key={idx} className={`log-entry ${log.type}`}>
                  <span className="log-time">[{log.timestamp}]</span>
                  <span className="log-message">{log.message}</span>
                </div>
              ))
            )}
          </div>

          {/* Results Summary */}
          {uploadResults && (
            <div className="results-panel animate-fade-in">
              {uploadResults.success ? (
                <div className="results-card success">
                  <div className="card-header">
                    <CheckCircle className="text-success" size={24} />
                    <h5>Ingestion Successful</h5>
                  </div>
                  <p>Documents successfully parsed, chunked, embedded, and index-upserted.</p>
                  <div className="stats-row">
                    <div className="stat">
                      <span className="stat-val">{uploadResults.duration}s</span>
                      <span className="stat-lbl">Time Elapsed</span>
                    </div>
                    <div className="stat">
                      <span className="stat-val">
                        {uploadResults.results.reduce((acc, curr) => acc + curr.chunksGenerated, 0)}
                      </span>
                      <span className="stat-lbl">Total Chunks</span>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="results-card failure">
                  <div className="card-header">
                    <AlertCircle className="text-danger" size={24} />
                    <h5>Ingestion Failed</h5>
                  </div>
                  <p>{uploadResults.error}</p>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default IngestionPortal;
