import React, { useEffect, useRef, useState } from 'react';
import { Upload, Cpu, Eye, Database, Search, Zap, CheckCircle } from 'lucide-react';

const steps = [
  { id: 1, icon: Upload,   color: '#eab308', label: 'Upload Document',  desc: 'Drop an Industrial Manual, TXT, P&ID or JSON file. The engine reads its raw content and prepares it for AI analysis.', tag: 'INPUT',       side: 'right' },
  { id: 2, icon: Cpu,      color: '#60a5fa', label: 'NLP Extraction',   desc: 'Groq Llama-3 processes the document text and identifies key entities, concepts, and semantic relationships.', tag: 'AI PROCESS',  side: 'left'  },
  { id: 3, icon: Eye,      color: '#a78bfa', label: 'Preview & Review', desc: 'A confirmation modal shows you every extracted node and link before any data is stored.', tag: 'USER REVIEW', side: 'right' },
  { id: 4, icon: Database, color: '#34d399', label: 'Graph DB Store',   desc: 'Approved entities (components, assets, systems) are permanently saved in SQLite with timestamps, types, and provenance.', tag: 'STORAGE',     side: 'left'  },
  { id: 5, icon: Search,   color: '#fb923c', label: 'Graph RAG Query',  desc: 'Your question triggers keyword-based retrieval — matching nodes and 1-hop connections form the context.', tag: 'RETRIEVAL',   side: 'right' },
  { id: 6, icon: Zap,      color: '#eab308', label: 'AI Answer',        desc: 'Groq LLM receives the graph context and generates a grounded, transparent answer citing its sources.', tag: 'OUTPUT',      side: 'left'  },
];

/* ── Card component shared between desktop and mobile ─────────────── */
function StepCard({ step, isRight, isActive, idx }) {
  return (
    <div
      className="relative overflow-hidden rounded-2xl p-4 sm:p-5 border cursor-default transition-all duration-300 w-full"
      style={{
        background: 'rgba(12,11,18,0.85)',
        backdropFilter: 'blur(12px)',
        borderColor: `${step.color}28`,
        boxShadow: `0 0 0 1px ${step.color}10, 0 8px 32px rgba(0,0,0,0.4)`,
        opacity: isActive ? 1 : 0,
        transform: isActive ? 'translateY(0)' : 'translateY(20px)',
        transition: `opacity 0.6s ease ${idx * 0.15 + 0.1}s, transform 0.6s cubic-bezier(0.22,1,0.36,1) ${idx * 0.15 + 0.1}s`,
      }}
      onMouseEnter={e => {
        e.currentTarget.style.borderColor = `${step.color}55`;
        e.currentTarget.style.boxShadow = `0 0 0 1px ${step.color}30, 0 0 28px 4px ${step.color}14, 0 8px 32px rgba(0,0,0,0.5)`;
        e.currentTarget.style.transform = `translateY(-3px)`;
      }}
      onMouseLeave={e => {
        e.currentTarget.style.borderColor = `${step.color}28`;
        e.currentTarget.style.boxShadow = `0 0 0 1px ${step.color}10, 0 8px 32px rgba(0,0,0,0.4)`;
        e.currentTarget.style.transform = 'translateY(0)';
      }}
    >
      {/* Big watermark number */}
      <span className="absolute select-none pointer-events-none font-black"
        style={{ fontSize: '72px', lineHeight: 1, color: `${step.color}07`, right: '10px', bottom: '-6px' }}>
        {step.id}
      </span>
      {/* Tag */}
      <span className="inline-flex text-[8px] font-bold tracking-widest px-2 py-0.5 rounded-full mb-4"
        style={{ background: `${step.color}12`, color: step.color, border: `1px solid ${step.color}30` }}>
        {step.tag}
      </span>
      {/* Title */}
      <h3 className="text-sm font-bold text-white tracking-wide mb-2 leading-snug">{step.label}</h3>
      {/* Desc */}
      <p className="text-[10px] text-gray-400 leading-relaxed relative z-10">{step.desc}</p>
      {/* Bottom accent */}
      <div className="absolute bottom-0 left-0 right-0 h-[2px] rounded-b-2xl"
        style={{ background: `linear-gradient(to right, transparent, ${step.color}40, transparent)` }} />
    </div>
  );
}

export default function WorkflowPipeline() {
  const sectionRef = useRef(null);
  const [visible, setVisible] = useState(false);
  const [activeStep, setActiveStep] = useState(-1);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) { setVisible(true); observer.disconnect(); } },
      { threshold: 0.08 }
    );
    if (sectionRef.current) observer.observe(sectionRef.current);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (!visible) return;
    let i = 0;
    const timer = setInterval(() => { setActiveStep(i); i++; if (i >= steps.length) clearInterval(timer); }, 230);
    return () => clearInterval(timer);
  }, [visible]);

  return (
    <section ref={sectionRef} className="w-full max-w-5xl mx-auto px-4 sm:px-6 pb-16 sm:pb-24 relative z-10">

      {/* Header */}
      <div className="mb-10 sm:mb-16 text-center"
        style={{ opacity: visible ? 1 : 0, transform: visible ? 'translateY(0)' : 'translateY(24px)', transition: 'opacity 0.7s ease, transform 0.7s ease' }}>
        <div className="inline-flex items-center space-x-2 px-3 py-1.5 rounded-full bg-[#eab308]/10 border border-[#eab308]/30 text-[#eab308] text-[10px] font-bold tracking-widest mb-4">
          <CheckCircle className="w-3.5 h-3.5" />
          <span>WORKFLOW PIPELINE</span>
        </div>
        <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-white uppercase">How It Works</h2>
        <p className="text-gray-500 text-xs mt-2 sm:mt-3 max-w-lg mx-auto leading-relaxed px-2">
          From raw document to grounded AI answer — fully automated, transparent, and auditable.
        </p>
      </div>

      {/* ── MOBILE layout: single column with icon above card ─── */}
      <div className="flex flex-col gap-6 sm:hidden">
        {steps.map((step, idx) => {
          const Icon = step.icon;
          const isActive = activeStep >= idx;
          return (
            <div key={step.id} className="flex flex-col items-center gap-3">
              {/* Icon node */}
              <div style={{ opacity: isActive ? 1 : 0, transform: isActive ? 'scale(1)' : 'scale(0.4)', transition: `opacity 0.5s ease ${idx * 0.15}s, transform 0.5s cubic-bezier(0.34,1.56,0.64,1) ${idx * 0.15}s` }}>
                <div className="relative rounded-full" style={{ width: '48px', height: '48px', border: `1px solid ${step.color}40`, animation: isActive ? 'ping-slow 2.5s cubic-bezier(0,0,0.2,1) infinite' : 'none', position: 'absolute' }} />
                <div className="relative w-12 h-12 rounded-xl flex items-center justify-center"
                  style={{ background: `linear-gradient(135deg, ${step.color}25 0%, ${step.color}10 100%)`, border: `1.5px solid ${step.color}50`, boxShadow: `0 0 20px 4px ${step.color}20` }}>
                  <Icon className="w-5 h-5" style={{ color: step.color }} />
                </div>
              </div>
              {/* Card full width */}
              <StepCard step={step} isRight={step.side === 'right'} isActive={isActive} idx={idx} />
              {/* Connector */}
              {idx < steps.length - 1 && (
                <div style={{ opacity: isActive ? 1 : 0, transition: `opacity 0.4s ease ${idx * 0.15 + 0.3}s` }}>
                  <div style={{ width: '2px', height: '24px', background: `linear-gradient(to bottom, ${step.color}50, ${steps[idx+1].color}50)`, margin: '0 auto' }} />
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* ── DESKTOP layout: 3-column (left | icon | right) ─────── */}
      <div className="hidden sm:block relative">
        {/* Central vertical line */}
        <div className="absolute left-1/2 top-0 bottom-0 w-px -translate-x-1/2"
          style={{ background: 'linear-gradient(to bottom, transparent, rgba(234,179,8,0.25) 10%, rgba(234,179,8,0.25) 90%, transparent)' }} />
        {/* Animated fill */}
        <div className="absolute left-1/2 top-0 w-px -translate-x-1/2"
          style={{ height: visible ? '100%' : '0%', background: 'linear-gradient(to bottom, #eab308, #60a5fa, #a78bfa, #34d399, #fb923c, #eab308)', transition: 'height 2.6s cubic-bezier(0.22,1,0.36,1)', opacity: 0.5 }} />

        <div className="flex flex-col gap-8">
          {steps.map((step, idx) => {
            const Icon = step.icon;
            const isActive = activeStep >= idx;
            const isRight = step.side === 'right';
            return (
              <div key={step.id} className="relative flex flex-row items-center w-full" style={{ minHeight: '140px' }}>

                {/* LEFT slot */}
                <div className="flex-1 flex justify-end pr-10"
                  style={{ opacity: isActive ? 1 : 0, transform: isActive ? 'translateX(0)' : 'translateX(-36px)', transition: `opacity 0.6s ease ${idx * 0.15 + 0.1}s, transform 0.6s cubic-bezier(0.22,1,0.36,1) ${idx * 0.15 + 0.1}s` }}>
                  {!isRight && <StepCard step={step} isRight={false} isActive={true} idx={0} />}
                </div>

                {/* CENTRE icon */}
                <div className="flex-none flex flex-col items-center z-20" style={{ width: '72px', opacity: isActive ? 1 : 0, transform: isActive ? 'scale(1)' : 'scale(0.4)', transition: `opacity 0.5s ease ${idx * 0.15}s, transform 0.5s cubic-bezier(0.34,1.56,0.64,1) ${idx * 0.15}s` }}>
                  <div className="absolute rounded-full" style={{ width: '56px', height: '56px', border: `1px solid ${step.color}40`, animation: isActive ? 'ping-slow 2.5s cubic-bezier(0,0,0.2,1) infinite' : 'none', animationDelay: `${idx * 0.3}s` }} />
                  <div className="relative w-11 h-11 rounded-xl flex items-center justify-center" style={{ background: `linear-gradient(135deg, ${step.color}25 0%, ${step.color}10 100%)`, border: `1.5px solid ${step.color}50`, boxShadow: `0 0 20px 4px ${step.color}20` }}>
                    <Icon className="w-5 h-5" style={{ color: step.color }} />
                  </div>
                </div>

                {/* RIGHT slot */}
                <div className="flex-1 flex justify-start pl-10"
                  style={{ opacity: isActive ? 1 : 0, transform: isActive ? 'translateX(0)' : 'translateX(36px)', transition: `opacity 0.6s ease ${idx * 0.15 + 0.1}s, transform 0.6s cubic-bezier(0.22,1,0.36,1) ${idx * 0.15 + 0.1}s` }}>
                  {isRight && <StepCard step={step} isRight={true} isActive={true} idx={0} />}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Keyframe */}
      <style>{`@keyframes ping-slow { 0% { transform:scale(1); opacity:0.6; } 80% { transform:scale(1.8); opacity:0; } 100% { transform:scale(1.8); opacity:0; } }`}</style>

      {/* Footer label */}
      <div className="mt-10 sm:mt-14 flex items-center justify-center space-x-3 text-[10px] font-mono text-gray-600 px-4 text-center"
        style={{ opacity: visible ? 1 : 0, transition: 'opacity 1s ease 2s' }}>
        <span className="hidden sm:block w-16 h-px" style={{ background: 'linear-gradient(to right, transparent, rgba(234,179,8,0.3))' }} />
        <span>Each upload permanently enriches the Knowledge Graph</span>
        <span className="hidden sm:block w-16 h-px" style={{ background: 'linear-gradient(to left, transparent, rgba(234,179,8,0.3))' }} />
      </div>
    </section>
  );
}
