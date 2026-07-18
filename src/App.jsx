import React, { Suspense, useState, useEffect, useRef } from 'react';
import Spline from '@splinetool/react-spline';
import { Search, Network, MessageSquare, Zap, Upload, CheckCircle, AlertCircle, X, Database, ArrowRight, Clock, FileText, Brain, Shield, Cpu, Trash2 } from 'lucide-react';
import SplineErrorBoundary from './components/SplineErrorBoundary';
import GoldenStars from './components/GoldenStars';
import WorkflowPipeline from './components/WorkflowPipeline';
import AnswerRenderer from './components/AnswerRenderer';
import ChatPanel from './components/ChatPanel';

// Frontend baseline Knowledge Graph data (layout coordinates only)
const initialNodes = [
  { id: '1', label: '3D-SAFE', type: 'Platform', desc: 'Secure hosting & debugger for 3D web assets.', x: 250, y: 140 },
  { id: '2', label: 'Spline 3D', type: 'Technology', desc: '3D design tool for creating interactive web experiences.', x: 100, y: 90 },
  { id: '3', label: 'CORS Error', type: 'Issue', desc: 'Cross-Origin Resource Sharing blocks when loading external assets.', x: 80, y: 210 },
  { id: '4', label: '403 Forbidden', type: 'Issue', desc: 'Access denied when prod.spline.design links are rate-limited.', x: 250, y: 270 },
  { id: '5', label: 'End of Buffer', type: 'Issue', desc: 'Runtime crash caused by Spline library version mismatches.', x: 420, y: 210 },
  { id: '6', label: 'ErrorBoundary', type: 'Solution', desc: 'React wrapper that catches Spline loader errors.', x: 400, y: 90 },
  { id: '7', label: 'Local Hosting', type: 'Solution', desc: 'Hosting .splinecode in /public to bypass CORS/403.', x: 250, y: 35 },
  { id: '8', label: 'Groq LLM', type: 'Technology', desc: 'Ultra-fast Llama-3 model endpoint powering Graph RAG.', x: 420, y: 270 },
];

const initialLinks = [
  { source: '1', target: '2', label: 'INTEGRATES' },
  { source: '1', target: '3', label: 'RESOLVES' },
  { source: '1', target: '4', label: 'RESOLVES' },
  { source: '1', target: '5', label: 'RESOLVES' },
  { source: '2', target: '5', label: 'TRIGGERS' },
  { source: '3', target: '7', label: 'FIXED_BY' },
  { source: '4', target: '6', label: 'CAUGHT_BY' },
  { source: '5', target: '6', label: 'CAUGHT_BY' },
  { source: '1', target: '8', label: 'POWERED_BY' },
];

// Node type → colour mapping
const typeColors = {
  Platform:   '#eab308',
  Technology: '#60a5fa',
  Issue:      '#f87171',
  Solution:   '#34d399',
  Component:  '#a78bfa',
  Asset:      '#fb923c',
  Entity:     '#94a3b8',
};

function App() {
  const [nodes, setNodes] = useState(initialNodes);
  const [links, setLinks] = useState(initialLinks);
  const [query, setQuery] = useState('');
  const [answer, setAnswer] = useState('');
  const [loading, setLoading] = useState(false);
  const [retrievedNodes, setRetrievedNodes] = useState([]);
  const [retrievedLinks, setRetrievedLinks] = useState([]);
  const [latency, setLatency] = useState(null);
  const [splineLoaded, setSplineLoaded] = useState(false);
  const [dbHistory, setDbHistory] = useState([]);
  const [chatSessionKey, setChatSessionKey] = useState(0);
  const [adminPwd, setAdminPwd] = useState('');
  
  // Custom Password Modal States
  const [pwdModalOpen, setPwdModalOpen] = useState(false);
  const [pwdInput, setPwdInput] = useState('');
  const [pwdCallback, setPwdCallback] = useState(null);
  const [pwdTitle, setPwdTitle] = useState('');

  const requestPassword = (title) => {
    return new Promise((resolve) => {
      setPwdTitle(title);
      setPwdCallback(() => (pwd) => resolve(pwd));
      setPwdModalOpen(true);
    });
  };

  const handlePwdSubmit = (e) => {
    e.preventDefault();
    setAdminPwd(pwdInput);
    setPwdModalOpen(false);
    if (pwdCallback) pwdCallback(pwdInput);
    setPwdInput('');
  };

  const handlePwdCancel = () => {
    setPwdModalOpen(false);
    if (pwdCallback) pwdCallback(null);
    setPwdInput('');
  };

  // Upload states
  const [uploading, setUploading] = useState(false);
  const [uploadStatus, setUploadStatus] = useState('');
  const [dragActive, setDragActive] = useState(false);

  // Preview modal states (populated after /analyze, cleared after confirm/cancel)
  const [previewData, setPreviewData] = useState(null); // { fileName, extractedNodes, extractedLinks }
  const [confirming, setConfirming] = useState(false);

  // SVG graph dragging
  const [draggedNode, setDraggedNode] = useState(null);
  const svgRef = useRef(null);
  const fileInputRef = useRef(null);
  const splineAppRef = useRef(null);

  const handleNodeMouseDown = (nodeId) => setDraggedNode(nodeId);
  const handleMouseMove = (e) => {
    if (!draggedNode || !svgRef.current) return;
    const rect = svgRef.current.getBoundingClientRect();
    setNodes(prev => prev.map(n =>
      n.id === draggedNode
        ? { ...n, x: Math.max(15, Math.min(e.clientX - rect.left, 485)), y: Math.max(15, Math.min(e.clientY - rect.top, 285)) }
        : n
    ));
  };
  const handleMouseUp = () => setDraggedNode(null);

  // Refresh graph elements and history list from backend
  const fetchGraphAndHistory = () => {
    fetch('https://et-hackathon-backend.vercel.app/api/graph')
      .then(r => r.ok ? r.json() : null)
      .then(data => {
        if (!data) return;
        const loadedNodes = (data.nodes || []).map(node => {
          const existing = initialNodes.find(n => n.id === node.id);
          return { ...node, x: existing ? existing.x : node.x || Math.random() * 200 + 150, y: existing ? existing.y : node.y || Math.random() * 180 + 80 };
        });
        setNodes(loadedNodes);
        setLinks(data.links || []);
      })
      .catch(console.error);

    fetch('https://et-hackathon-backend.vercel.app/api/history')
      .then(r => r.ok ? r.json() : [])
      .then(setDbHistory)
      .catch(console.error);
  };

  // Load dynamic nodes + upload history from backend on mount
  useEffect(() => {
    fetchGraphAndHistory();
  }, []);

  // Delete all uploaded content from SQLite DB
  const handleClearAll = async () => {
    const pwd = await requestPassword("Enter Admin Password to clear the database.");
    if (!pwd) return;
    if (!window.confirm("Are you sure you want to permanently clear all documents, nodes, and relationships from the database?")) return;
    try {
      const resp = await fetch('https://et-hackathon-backend.vercel.app/api/graph/clear', {
        method: 'POST',
        headers: { 'x-admin-password': pwd }
      });
      const data = await resp.json();
      if (resp.ok) {
        setUploadStatus('Database cleared successfully.');
        setChatSessionKey(prev => prev + 1); // Reset conversational memory UI
        fetchGraphAndHistory();
      } else {
        setUploadStatus(`Clear failed: ${data.error}`);
      }
    } catch (err) {
      setUploadStatus(`Clear error: ${err.message}`);
    }
  };

  // Delete a single document and its associated graph elements
  const handleDeleteDocument = async (docId, filename) => {
    const pwd = await requestPassword(`Enter Admin Password to delete "${filename}".`);
    if (!pwd) return;
    if (!window.confirm(`Are you sure you want to delete "${filename}" and all its extracted nodes and relationships?`)) return;
    try {
      const resp = await fetch(`https://et-hackathon-backend.vercel.app/api/documents/${docId}`, {
        method: 'DELETE',
        headers: { 'x-admin-password': pwd }
      });
      const data = await resp.json();
      if (resp.ok) {
        setUploadStatus(`Deleted "${filename}" successfully.`);
        setChatSessionKey(prev => prev + 1); // Reset conversational memory UI
        fetchGraphAndHistory();
      } else {
        setUploadStatus(`Delete failed: ${data.error}`);
      }
    } catch (err) {
      setUploadStatus(`Delete error: ${err.message}`);
    }
  };

  // Spline head-follow-mouse
  useEffect(() => {
    const onMove = (e) => {
      if (!splineAppRef.current) return;
      const ox = (e.clientX - window.innerWidth / 2) / (window.innerWidth / 2);
      const oy = (e.clientY - window.innerHeight / 2) / (window.innerHeight / 2);
      const candidates = ['head','Head','neck','Neck','Face','face','Robot_Head','robot_head'];
      let obj = null;
      for (const n of candidates) { obj = splineAppRef.current.findObjectByName(n); if (obj) break; }
      if (obj) { obj.rotation.y = ox * 0.55; obj.rotation.x = oy * 0.4; }
      else {
        const grp = splineAppRef.current.findObjectByName('Group') || splineAppRef.current.findObjectByName('robot');
        if (grp) { grp.rotation.y = ox * 0.35; grp.rotation.x = oy * 0.25; }
      }
    };
    window.addEventListener('mousemove', onMove);
    return () => window.removeEventListener('mousemove', onMove);
  }, []);

  // ── RAG Query ──────────────────────────────────────────────────────────────
  const handleSearch = async (e) => {
    e.preventDefault();
    if (!query.trim()) return;
    setLoading(true);
    setAnswer('');
    const t0 = Date.now();
    try {
      const res = await fetch('https://et-hackathon-backend.vercel.app/api/query', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query })
      });
      if (!res.ok) throw new Error(`${res.status} ${res.statusText}`);
      const data = await res.json();
      setAnswer(data.answer);
      setRetrievedNodes(data.retrievedNodes || []);
      setRetrievedLinks(data.retrievedLinks || []);
      setLatency(Date.now() - t0);
    } catch (err) {
      setAnswer(`Error: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  // ── STEP 1: Analyze (extract preview, do NOT store) ────────────────────────
  const handleFileUpload = async (file) => {
    if (!file) return;
    if (fileInputRef.current) fileInputRef.current.value = ''; // Reset input to allow re-uploading the same file
    const pwd = await requestPassword("Enter Admin Password to analyze and upload a document.");
    if (!pwd) return;

    setUploading(true);
    setUploadStatus('Analyzing file with Groq NLP…');
    setPreviewData(null);

    const formData = new FormData();
    formData.append('file', file);

    try {
      const res = await fetch('https://et-hackathon-backend.vercel.app/api/upload/analyze', {
        method: 'POST', 
        headers: { 'x-admin-password': pwd },
        body: formData 
      });
      if (!res.ok) { const e = await res.json(); throw new Error(e.error || res.statusText); }
      const data = await res.json();
      setPreviewData(data);       // ← opens the preview modal
      setUploadStatus('');
    } catch (err) {
      setUploadStatus(`Analysis failed: ${err.message}`);
    } finally {
      setUploading(false);
    }
  };

  // ── STEP 2: Confirm (user approved → store in chroma_graph.json) ───────────
  const handleConfirm = async () => {
    if (!previewData) return;
    setConfirming(true);
    try {
      const res = await fetch('https://et-hackathon-backend.vercel.app/api/upload/confirm', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'x-admin-password': adminPwd 
        },
        body: JSON.stringify({
          fileName:       previewData.fileName,
          fileType:       previewData.fileType,
          extractedNodes: previewData.extractedNodes,
          extractedLinks: previewData.extractedLinks
        })
      });
      if (!res.ok) { const e = await res.json(); throw new Error(e.error || res.statusText); }
      const data = await res.json();
      setUploadStatus(data.message);

      // Append newly stored nodes/links to the live visualizer
      if (data.newNodes?.length) setNodes(prev => [...prev, ...data.newNodes]);
      if (data.newLinks?.length) setLinks(prev => [...prev, ...data.newLinks]);

      // Refresh document history from SQLite
      fetch('https://et-hackathon-backend.vercel.app/api/history')
        .then(r => r.ok ? r.json() : [])
        .then(setDbHistory)
        .catch(console.error);

      setPreviewData(null);
    } catch (err) {
      setUploadStatus(`Store failed: ${err.message}`);
      setPreviewData(null);
    } finally {
      setConfirming(false);
    }
  };

  const handleCancelPreview = () => { setPreviewData(null); setUploadStatus('Upload cancelled.'); };

  // Drag-and-drop zone handlers
  const handleDrag = (e) => { e.preventDefault(); e.stopPropagation(); setDragActive(e.type !== 'dragleave'); };
  const handleDrop  = (e) => { e.preventDefault(); e.stopPropagation(); setDragActive(false); if (e.dataTransfer.files?.[0]) handleFileUpload(e.dataTransfer.files[0]); };

  const splineSceneUrl = 'https://prod.spline.design/kZDDjO5HuC9GJUM2/scene.splinecode';

  return (
    <div className="min-h-screen bg-[#08070b] bg-grid-pattern relative overflow-hidden text-white flex flex-col justify-between">

      <GoldenStars />

      {/* 3D Background Robot */}
      <div className="fixed inset-0 w-full h-full z-0 pointer-events-none opacity-45 flex items-center justify-center">
        <Suspense fallback={null}>
          <SplineErrorBoundary>
            <Spline
              scene={splineSceneUrl}
              onLoad={(app) => { setSplineLoaded(true); splineAppRef.current = app; }}
              className="w-full h-full object-cover"
            />
          </SplineErrorBoundary>
        </Suspense>
      </div>

      {/* ── Golden ambient glows — all sides ── */}
      <div className="glow-effect z-1"></div>           {/* top-right */}
      <div className="glow-effect-left z-1"></div>      {/* bottom-left wide */}
      <div className="glow-effect-bottom-left z-1"></div>   {/* bottom-left bright */}
      <div className="glow-effect-top-left z-1"></div>      {/* top-left */}
      <div className="glow-effect-bottom-right z-1"></div>  {/* bottom-right */}
      <div className="glow-effect-top-center z-1"></div>    {/* top-center */}
      <div className="glow-effect-bottom-center z-1"></div> {/* bottom-center */}
      <div className="glow-effect-mid-left z-1"></div>      {/* mid-left */}
      <div className="glow-effect-mid-right z-1"></div>     {/* mid-right */}

      {/* ── Password Prompt Modal ─────────────────────────────────────────── */}
      {pwdModalOpen && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
          <div className="relative w-full max-w-sm bg-[#0d0c12] border border-[#eab308]/30 rounded-2xl shadow-2xl overflow-hidden p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-sm font-bold tracking-wider text-white uppercase flex items-center space-x-2">
                <Shield className="w-4 h-4 text-[#eab308]" />
                <span>Admin Access Required</span>
              </h2>
              <button onClick={handlePwdCancel} className="p-1 rounded-lg hover:bg-white/10 text-gray-400 hover:text-white transition-colors">
                <X className="w-4 h-4" />
              </button>
            </div>
            
            <p className="text-[11px] text-gray-400 mb-5 leading-relaxed">{pwdTitle}</p>
            
            <form onSubmit={handlePwdSubmit} className="space-y-4">
              <input
                type="password"
                value={pwdInput}
                onChange={(e) => setPwdInput(e.target.value)}
                placeholder="Enter password..."
                className="w-full bg-black/50 border border-white/10 focus:border-[#eab308]/50 rounded-xl px-4 py-2.5 text-sm text-white placeholder-gray-600 focus:outline-none focus:ring-1 focus:ring-[#eab308]/50 transition-all"
                autoFocus
              />
              <div className="flex items-center justify-end space-x-3 pt-2">
                <button type="button" onClick={handlePwdCancel} className="px-4 py-2 rounded-xl text-xs font-semibold text-gray-400 hover:text-white transition-colors">Cancel</button>
                <button type="submit" className="px-5 py-2 rounded-xl text-xs font-bold tracking-wider bg-[#eab308] text-black hover:bg-yellow-400 transition-all flex items-center space-x-1.5">
                  <Shield className="w-3.5 h-3.5" />
                  <span>Authenticate</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── NLP Extraction Preview Modal ──────────────────────────────────── */}
      {previewData && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
          <div className="relative w-full max-w-2xl bg-[#0d0c12] border border-[#eab308]/30 rounded-3xl shadow-2xl overflow-hidden">
            
            {/* Modal header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-white/5">
              <div>
                <h2 className="text-base font-bold tracking-wider text-white uppercase flex items-center space-x-2">
                  <Database className="w-4 h-4 text-[#eab308]" />
                  <span>NLP Extraction Preview</span>
                </h2>
                <p className="text-[10px] text-gray-500 mt-0.5 font-mono">
                  Review extracted entities from <span className="text-[#eab308]">{previewData.fileName}</span>. Click <strong>Confirm &amp; Store</strong> to save to the graph database.
                </p>
              </div>
              <button onClick={handleCancelPreview} className="p-1.5 rounded-xl hover:bg-white/10 transition-colors text-gray-400 hover:text-white">
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Modal body */}
            <div className="px-6 py-5 max-h-[65vh] overflow-y-auto space-y-5">

              {/* Extracted Nodes */}
              <div>
                <h3 className="text-[10px] font-bold tracking-widest text-gray-400 uppercase mb-2 flex items-center space-x-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#eab308]"></span>
                  <span>Extracted Entities ({previewData.extractedNodes.length} nodes)</span>
                </h3>
                <div className="grid grid-cols-1 gap-2">
                  {previewData.extractedNodes.map((node, i) => (
                    <div key={i} className="flex items-start space-x-3 bg-white/[0.03] border border-white/5 rounded-xl p-3">
                      <span
                        className="mt-0.5 px-2 py-0.5 rounded-full text-[9px] font-bold tracking-wider shrink-0"
                        style={{ backgroundColor: `${typeColors[node.type] || '#94a3b8'}20`, color: typeColors[node.type] || '#94a3b8', border: `1px solid ${typeColors[node.type] || '#94a3b8'}40` }}
                      >
                        {node.type}
                      </span>
                      <div>
                        <p className="text-xs font-semibold text-white">{node.label}</p>
                        <p className="text-[10px] text-gray-500 mt-0.5 leading-relaxed">{node.desc}</p>
                      </div>
                    </div>
                  ))}
                  {previewData.extractedNodes.length === 0 && (
                    <p className="text-xs text-gray-600 font-mono">No entities extracted.</p>
                  )}
                </div>
              </div>

              {/* Extracted Relationships */}
              {previewData.extractedLinks.length > 0 && (
                <div>
                  <h3 className="text-[10px] font-bold tracking-widest text-gray-400 uppercase mb-2 flex items-center space-x-1.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-blue-400"></span>
                    <span>Relationships ({previewData.extractedLinks.length} links)</span>
                  </h3>
                  <div className="grid grid-cols-1 gap-1.5">
                    {previewData.extractedLinks.map((link, i) => (
                      <div key={i} className="flex items-center space-x-2 bg-white/[0.02] border border-white/5 rounded-lg px-3 py-2 text-[10px] font-mono">
                        <span className="text-blue-300">{link.sourceNodeLabel}</span>
                        <ArrowRight className="w-3 h-3 text-gray-600 shrink-0" />
                        <span className="px-1.5 py-0.5 rounded bg-white/5 text-gray-400 text-[9px] tracking-widest">{link.label}</span>
                        <ArrowRight className="w-3 h-3 text-gray-600 shrink-0" />
                        <span className="text-blue-300">{link.targetNodeLabel}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Modal footer */}
            <div className="flex items-center justify-end space-x-3 px-6 py-4 border-t border-white/5 bg-black/20">
              <button
                onClick={handleCancelPreview}
                className="px-5 py-2 rounded-xl text-xs font-semibold text-gray-400 border border-white/10 hover:border-white/20 hover:text-white transition-all duration-200"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirm}
                disabled={confirming}
                className="px-6 py-2 rounded-xl text-xs font-bold tracking-wider bg-[#eab308] text-black hover:bg-yellow-400 transition-all duration-200 disabled:opacity-60 flex items-center space-x-2"
              >
                <Database className="w-3.5 h-3.5" />
                <span>{confirming ? 'Storing…' : 'Confirm & Store'}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Header ────────────────────────────────────────────────────────── */}
      <header className="w-full max-w-7xl mx-auto px-4 sm:px-6 py-4 sm:py-5 flex items-center justify-between border-b border-[#eab308]/20 relative z-10" style={{boxShadow:'0 1px 0 0 rgba(234,179,8,0.08)'}}>
        <span className="text-lg sm:text-xl font-bold tracking-wider font-mono text-white flex items-center">
          ASSET & OPERATIONS BRAIN
          <span className="inline-block w-2 h-2 rounded-full bg-[#eab308] ml-1 animate-pulse"></span>
        </span>
        <div className="flex items-center space-x-1.5 bg-emerald-950/40 border border-emerald-500/30 rounded-full px-2.5 sm:px-4 py-1 sm:py-1.5">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
          <span className="hidden sm:block text-[10px] text-gray-400 font-mono uppercase tracking-wider">Backend Service Active</span>
          <span className="sm:hidden text-[10px] text-emerald-400 font-mono">Active</span>
        </div>
      </header>

      {/* ── Main Grid ─────────────────────────────────────────────────────── */}
      <main className="w-full max-w-7xl mx-auto px-4 sm:px-6 py-6 sm:py-8 grid grid-cols-1 lg:grid-cols-12 gap-6 sm:gap-8 items-stretch relative z-10 flex-grow">

        {/* Left: Query Interface */}
        <section className="lg:col-span-7 flex flex-col space-y-4 sm:space-y-6">
          <div className="flex flex-col space-y-4">
            <div className="inline-flex items-center self-start space-x-2 px-3 py-1.5 rounded-full bg-[#eab308]/10 border border-[#eab308]/30 text-[#eab308] text-xs font-semibold tracking-wider">
              <Brain className="w-3.5 h-3.5" /><span>KNOWLEDGE GRAPH + LLM</span>
            </div>
            <h1 className="text-3xl md:text-4xl font-extrabold tracking-tight leading-tight uppercase">
              AI-Powered <br />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-white via-white to-gray-400">Asset & Operations Brain</span>
            </h1>
            <p className="text-gray-400 text-xs md:text-sm max-w-xl font-light leading-relaxed">
              Upload documents or ask questions. The engine retrieves relevant Knowledge Graph nodes and combines them with Groq Llama-3 reasoning to answer your query.
            </p>
          </div>

          {/* ── Conversational Chat Panel ──────────────────────── */}
          <div
            className="bg-black/50 border border-[#eab308]/20 rounded-2xl p-4 sm:p-5 flex flex-col flex-grow"
            style={{boxShadow:'0 0 0 1px rgba(234,179,8,0.05), inset 0 1px 0 0 rgba(234,179,8,0.06)'}}
          >
            <ChatPanel key={chatSessionKey} onNodesUpdate={(nodes, links) => { setRetrievedNodes(nodes); setRetrievedLinks(links); }} />
          </div>
        </section>

        {/* Right: Visualizer + Upload */}
        <section className="lg:col-span-5 flex flex-col space-y-4 sm:space-y-6 justify-between">

          {/* Knowledge Graph SVG Visualizer */}
          <div className="bg-black/40 border border-[#eab308]/25 rounded-3xl p-4 sm:p-5 flex flex-col h-[260px] sm:h-[340px]" style={{boxShadow:'0 0 0 1px rgba(234,179,8,0.06), 0 4px 24px 0 rgba(234,179,8,0.05)'}}>
            <div className="mb-2">
              <h3 className="text-sm font-bold tracking-wider uppercase flex items-center space-x-2">
                <Network className="w-4 h-4 text-[#eab308]" /><span>Knowledge Graph Visualizer</span>
              </h3>
              <p className="text-[10px] text-gray-500 mt-0.5">Drag nodes. Gold glow = RAG match. Colour = node type.</p>
            </div>
            <div className="flex-1 bg-black/30 border border-[#eab308]/15 rounded-2xl overflow-hidden">
              <svg ref={svgRef} onMouseMove={handleMouseMove} onMouseUp={handleMouseUp} onMouseLeave={handleMouseUp} className="w-full h-full select-none">
                <defs>
                  <marker id="arr" viewBox="0 0 10 10" refX="16" refY="5" markerWidth="4" markerHeight="4" orient="auto-start-reverse">
                    <path d="M0 0 L10 5 L0 10z" fill="rgba(255,255,255,0.12)" />
                  </marker>
                  <marker id="arr-active" viewBox="0 0 10 10" refX="16" refY="5" markerWidth="4" markerHeight="4" orient="auto-start-reverse">
                    <path d="M0 0 L10 5 L0 10z" fill="#eab308" />
                  </marker>
                </defs>

                {links.map((link, i) => {
                  const s = nodes.find(n => n.id === link.source);
                  const t = nodes.find(n => n.id === link.target);
                  if (!s || !t) return null;
                  const active = retrievedLinks.some(rl => rl.source === link.source && rl.target === link.target);
                  return (
                    <line key={i} x1={s.x} y1={s.y} x2={t.x} y2={t.y}
                      stroke={active ? '#eab308' : 'rgba(255,255,255,0.07)'}
                      strokeWidth={active ? 2 : 1}
                      markerEnd={`url(#${active ? 'arr-active' : 'arr'})`} />
                  );
                })}

                {nodes.map(node => {
                  const active = retrievedNodes.some(rn => rn.id === node.id);
                  const color  = typeColors[node.type] || '#94a3b8';
                  return (
                    <g key={node.id} transform={`translate(${node.x},${node.y})`}
                      onMouseDown={() => handleNodeMouseDown(node.id)} className="cursor-grab active:cursor-grabbing">
                      {active && <circle r={14} fill="none" stroke={color} strokeWidth={2} className="animate-ping opacity-25" />}
                      <circle r={8} fill={active ? color : 'rgba(255,255,255,0.04)'} stroke={color} strokeWidth={active ? 2 : 1} opacity={active ? 1 : 0.5} />
                      <text y={18} fill={active ? color : '#6b7280'} fontSize="7.5px" fontWeight="600" textAnchor="middle" className="select-none">
                        {node.label}
                      </text>
                    </g>
                  );
                })}
              </svg>
            </div>
          </div>

          {/* NLP Document Uploader */}
          <div className="bg-black/40 border border-[#eab308]/25 rounded-3xl p-4 sm:p-5 flex flex-col h-auto sm:h-[240px] min-h-[180px]" style={{boxShadow:'0 0 0 1px rgba(234,179,8,0.06), 0 4px 24px 0 rgba(234,179,8,0.05)'}}>
            <div className="mb-3">
              <h3 className="text-sm font-bold tracking-wider uppercase flex items-center space-x-2">
                <Upload className="w-4 h-4 text-[#eab308]" /><span>NLP Graph Uploader</span>
              </h3>
              <p className="text-[10px] text-gray-500 mt-0.5">Upload PDFs, P&IDs, TXT — AI extracts entities & relations. You review before storing.</p>
            </div>

            {/* Drop zone */}
            <div
              onDragEnter={handleDrag} onDragOver={handleDrag} onDragLeave={handleDrag} onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
              className={`flex-1 border-2 border-dashed rounded-2xl flex flex-col items-center justify-center cursor-pointer transition-all duration-200 ${
                dragActive ? 'border-[#eab308] bg-[#eab308]/8' : 'border-[#eab308]/20 hover:border-[#eab308]/45 bg-black/10'
              }`}
            >
              <input ref={fileInputRef} type="file" accept=".txt,.pdf,.json" onChange={e => e.target.files?.[0] && handleFileUpload(e.target.files[0])} className="hidden" />
              {uploading ? (
                <div className="flex flex-col items-center space-y-2">
                  <div className="w-6 h-6 rounded-full border-2 border-t-[#eab308] border-r-[#eab308]/30 border-b-transparent border-l-transparent animate-spin"></div>
                  <span className="text-[10px] text-gray-400 font-mono">Running NLP Extraction…</span>
                </div>
              ) : (
                <div className="flex flex-col items-center space-y-1 text-center px-4">
                  <Upload className="w-6 h-6 text-gray-500 mb-1" />
                  <span className="text-[11px] font-semibold text-gray-300">Drag & drop or click to upload</span>
                  <span className="text-[9px] text-gray-600">PDF · TXT · JSON — max 10 MB</span>
                </div>
              )}
            </div>

            {/* Status message */}
            {uploadStatus && (
              <div className={`mt-3 flex items-start space-x-1.5 p-2 rounded-xl text-[10px] border ${
                uploadStatus.toLowerCase().includes('fail') || uploadStatus.toLowerCase().includes('error') || uploadStatus.toLowerCase().includes('cancel')
                  ? 'bg-red-500/10 border-red-500/20 text-red-400'
                  : 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400'
              }`}>
                {uploadStatus.toLowerCase().includes('fail') || uploadStatus.toLowerCase().includes('error') || uploadStatus.toLowerCase().includes('cancel')
                  ? <AlertCircle className="w-3.5 h-3.5 mt-0.5 shrink-0" />
                  : <CheckCircle className="w-3.5 h-3.5 mt-0.5 shrink-0" />
                }
                <span>{uploadStatus}</span>
              </div>
            )}
          </div>

          {/* ── SQLite DB History Panel ────────────────────────────────── */}
          <div className="bg-black/40 border border-[#eab308]/25 rounded-3xl p-5 flex flex-col" style={{boxShadow:'0 0 0 1px rgba(234,179,8,0.06), 0 4px 24px 0 rgba(234,179,8,0.05)'}}>
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-bold tracking-wider uppercase flex items-center space-x-2">
                <Clock className="w-4 h-4 text-[#eab308]" />
                <span>Graph DB History</span>
              </h3>
              <div className="flex items-center space-x-2">
                {dbHistory.length > 0 && (
                  <button
                    onClick={handleClearAll}
                    className="flex items-center space-x-1 text-[9px] font-mono text-red-400 hover:text-red-300 border border-red-500/20 hover:border-red-500/40 bg-red-500/5 px-2 py-0.5 rounded-full transition-all duration-200"
                  >
                    <span>Clear All</span>
                  </button>
                )}
                <span className="text-[9px] text-gray-400 font-mono bg-[#eab308]/5 px-2 py-0.5 rounded-full border border-[#eab308]/20">
                  SQLite · graph_rag.db
                </span>
              </div>
            </div>

            {dbHistory.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-6 space-y-1 text-center">
                <Database className="w-6 h-6 text-gray-700 mb-1" />
                <p className="text-[10px] text-gray-600 font-mono">No documents stored yet.</p>
                <p className="text-[9px] text-gray-700">Upload a file and confirm to populate the database.</p>
              </div>
            ) : (
              <div className="space-y-2 max-h-40 overflow-y-auto pr-1">
                {dbHistory.map((doc) => (
                  <div key={doc.id} className="flex items-center justify-between bg-[#eab308]/[0.03] border border-[#eab308]/15 rounded-xl px-3 py-2.5 group">
                    <div className="flex items-start space-x-3 flex-1 min-w-0">
                      <FileText className="w-4 h-4 text-[#eab308] mt-0.5 shrink-0" />
                      <div className="flex-1 min-w-0">
                        <p className="text-[10px] font-semibold text-white truncate">{doc.filename}</p>
                        <p className="text-[9px] text-gray-500 mt-0.5">
                          {doc.node_count} entities · {doc.link_count} links · {doc.file_type}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center space-x-2 shrink-0 ml-2">
                      <span className="text-[8px] text-gray-600 font-mono group-hover:hidden block">
                        {doc.created_at?.slice(0, 16)}
                      </span>
                      <button
                        onClick={() => handleDeleteDocument(doc.id, doc.filename)}
                        className="group-hover:flex hidden items-center justify-center p-1 rounded hover:bg-red-500/10 border border-transparent hover:border-red-500/20 text-gray-500 hover:text-red-400 transition-all duration-200"
                        title="Delete this document and its graph elements"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Total stats bar */}
            {dbHistory.length > 0 && (
              <div className="mt-3 pt-3 border-t border-[#eab308]/15 flex items-center justify-between text-[9px] font-mono text-gray-500">
                <span>{dbHistory.length} document{dbHistory.length !== 1 ? 's' : ''} stored</span>
                <span>
                  {nodes.length - 8} custom nodes · {links.length - 9} custom links
                </span>
              </div>
            )}
          </div>
        </section>

      </main>

      {/* ── Workflow Pipeline ─────────────────────────────────────── */}
      <WorkflowPipeline />

      <footer className="w-full max-w-7xl mx-auto px-4 sm:px-6 py-4 sm:py-5 flex flex-col sm:flex-row items-center justify-between text-xs text-gray-500 border-t border-[#eab308]/15 relative z-10 gap-3 sm:gap-0">
        <p className="flex items-center space-x-1.5">
          <Cpu className="w-3 h-3 text-[#eab308]" />
          <span>&copy; {new Date().getFullYear()} Graph-RAG Engine. Powered by Groq.</span>
        </p>
        <div className="flex space-x-4 sm:space-x-6">
          <a href="#privacy" className="flex items-center space-x-1 hover:text-white transition-colors">
            <Shield className="w-3 h-3" /><span>Privacy Policy</span>
          </a>
          <a href="#terms" className="flex items-center space-x-1 hover:text-white transition-colors">
            <FileText className="w-3 h-3" /><span>Terms of Service</span>
          </a>
        </div>
      </footer>
    </div>
  );
}

export default App;
