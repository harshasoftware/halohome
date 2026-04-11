/**
 * HeroScanDemo — Rotating scan stages inside the Iphone hero component.
 *
 * Cycles through 4 stages: Scanning → Processing → 3D Layout → Remedies
 * Each stage has its own animated visualization and a label bar at the bottom.
 * Designed to fill the Iphone screen area (100% width/height, dark bg).
 */

import React, { useState, useEffect, useRef, memo } from 'react';
import { Scan, Box, Sparkles, Smartphone } from 'lucide-react';

type ScanStage = 'scanning' | 'processing' | 'layout' | 'remedies';

const STAGES: { id: ScanStage; label: string; icon: React.ReactNode }[] = [
  { id: 'scanning', label: 'Scanning', icon: <Scan className="w-3 h-3" /> },
  { id: 'layout', label: '3D Layout', icon: <Smartphone className="w-3 h-3" /> },
  { id: 'processing', label: 'Processing', icon: <Box className="w-3 h-3" /> },
  { id: 'remedies', label: 'Remedies', icon: <Sparkles className="w-3 h-3" /> },
];

const REMEDIES = [
  { id: 1, text: 'Move bed to Southwest for better sleep', zone: 'SW' },
  { id: 2, text: 'Add plants in Northeast for prosperity', zone: 'NE' },
  { id: 3, text: 'Place desk facing East for career growth', zone: 'E' },
];

// --- Stage Visualizations ---

const ScanningStage = memo(() => {
  const [progress, setProgress] = useState(0);
  const [points, setPoints] = useState<{ x: number; y: number; o: number }[]>([]);

  useEffect(() => {
    setProgress(0);
    setPoints([]);
    const interval = setInterval(() => {
      setProgress((p) => {
        if (p >= 100) { clearInterval(interval); return 100; }
        return p + 2;
      });
      if (Math.random() > 0.6) {
        setPoints((prev) => [...prev.slice(-40), { x: Math.random() * 100, y: Math.random() * 100, o: 0.3 + Math.random() * 0.7 }]);
      }
    }, 50);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="absolute inset-0 flex flex-col items-center justify-center">
      {/* Grid overlay */}
      <div className="absolute inset-0 opacity-20" style={{
        backgroundImage: 'linear-gradient(rgba(240,166,179,0.3) 1px, transparent 1px), linear-gradient(90deg, rgba(240,166,179,0.3) 1px, transparent 1px)',
        backgroundSize: '25% 25%',
      }} />
      {/* LiDAR points */}
      {points.map((p, i) => (
        <div key={i} className="absolute w-1 h-1 rounded-full bg-[#F0A6B3] animate-pulse" style={{ left: `${p.x}%`, top: `${p.y}%`, opacity: p.o }} />
      ))}
      {/* Center indicator */}
      <div className="relative z-10 flex flex-col items-center gap-2">
        <Scan className="w-6 h-6 text-[#F0A6B3] animate-pulse" />
        <span className="text-white/80 text-[10px] font-medium">Scanning Room...</span>
      </div>
      {/* Progress bar */}
      <div className="absolute bottom-10 left-4 right-4">
        <div className="h-1 rounded-full bg-white/10 overflow-hidden">
          <div className="h-full bg-[#F0A6B3] rounded-full transition-all duration-100" style={{ width: `${progress}%` }} />
        </div>
        <p className="text-[9px] text-white/50 text-center mt-1">{Math.round(progress)}% complete</p>
      </div>
    </div>
  );
});

const VASTU_RULES: { text: string; passed: boolean }[] = [
  { text: 'Entrance faces East — auspicious', passed: true },
  { text: 'Kitchen in Southeast — fire aligned', passed: true },
  { text: 'Bedroom in Southwest — stability', passed: false },
  { text: 'No beam above bed — clear energy', passed: true },
  { text: 'Water element in Northeast', passed: false },
  { text: 'Living room in North — social', passed: true },
  { text: 'Staircase clockwise — flow', passed: true },
  { text: 'Toilet not in Northeast', passed: false },
  { text: 'Mirror not facing bed — sleep', passed: true },
  { text: 'Plants in East — growth energy', passed: true },
  { text: 'Desk faces North — focus zone', passed: false },
  { text: 'No clutter at entrance — chi flow', passed: true },
];

const ProcessingStage = memo(() => {
  const [progress, setProgress] = useState(0);
  const [ruleIndex, setRuleIndex] = useState(0);

  useEffect(() => {
    setProgress(0);
    setRuleIndex(0);
    const progressInterval = setInterval(() => {
      setProgress((p) => {
        if (p >= 100) { clearInterval(progressInterval); return 100; }
        return p + 0.5;
      });
    }, 40);
    const ruleInterval = setInterval(() => {
      setRuleIndex((i) => (i + 1) % VASTU_RULES.length);
    }, 1200);
    return () => { clearInterval(progressInterval); clearInterval(ruleInterval); };
  }, []);

  const rule = VASTU_RULES[ruleIndex];

  return (
    <div className="absolute inset-0 flex flex-col bg-[#0a0a12]">
      {/* Center rule card */}
      <div className="flex-1 flex items-center justify-center px-4">
        <div
          key={ruleIndex}
          className="w-full flex items-center gap-2.5 py-3 px-3 rounded-xl bg-white shadow-lg"
          style={{ animation: 'hh-fadeInUp 0.3s ease-out both' }}
        >
          <div className={`w-5 h-5 rounded-full flex items-center justify-center shrink-0 ${
            rule.passed ? 'bg-emerald-500/20' : 'bg-red-500/20'
          }`}>
            {rule.passed ? (
              <span className="text-[9px] text-emerald-500 font-bold">&#10003;</span>
            ) : (
              <span className="text-[9px] text-red-500 font-bold">&#10007;</span>
            )}
          </div>
          <span className="text-gray-800 text-[11px] leading-snug flex-1">{rule.text}</span>
          <span className={`text-[8px] font-semibold shrink-0 px-1.5 py-0.5 rounded-full ${
            rule.passed ? 'bg-emerald-50 text-emerald-600' : 'bg-red-50 text-red-500'
          }`}>
            {rule.passed ? 'Pass' : 'Fault'}
          </span>
        </div>
      </div>

      {/* Bottom progress bar — solid bg, no overlap */}
      <div className="shrink-0 px-3 pb-10 pt-2 bg-[#0a0a12]">
        <div className="flex items-center gap-2 mb-1.5">
          <Box className="w-3.5 h-3.5 text-[#F0A6B3]" style={{ animation: 'hh-pulse3d 2s ease-in-out infinite' }} />
          <span className="text-white text-[10px] font-medium">Evaluating Vastu rules...</span>
        </div>
        <div className="h-1 rounded-full bg-white/10 overflow-hidden">
          <div
            className="h-full rounded-full transition-all duration-150"
            style={{
              width: `${progress}%`,
              background: 'linear-gradient(90deg, #F0A6B3, #DBCBB0)',
            }}
          />
        </div>
        <span className="text-[8px] text-white/50 font-medium mt-1 block">{Math.round(progress)}% — {ruleIndex + 1}/{VASTU_RULES.length} rules checked</span>
      </div>
    </div>
  );
});

const LayoutStage = memo(() => (
  <div className="absolute inset-0 flex items-center justify-center">
    <picture className="w-full h-full">
      <source srcSet="/images/scan-layout-demo.webp" type="image/webp" />
      <img
        src="/images/scan-layout-demo-cropped.jpg"
        alt="3D room layout from LiDAR scan"
        className="w-full h-full object-cover"
      />
    </picture>
    {/* Overlay label */}
    <div className="absolute top-10 left-2 flex items-center gap-1 px-2 py-0.5 rounded-full bg-white backdrop-blur-sm shadow-sm">
      <Smartphone className="w-2.5 h-2.5 text-[#F0A6B3]" />
      <span className="text-[9px] text-gray-800 font-medium">3D Layout View</span>
    </div>
  </div>
));

const RemediesStage = memo(() => (
  <div className="absolute inset-0 flex flex-col">
    {/* Background layout image */}
    <div className="absolute inset-0">
      <picture className="w-full h-full">
        <source srcSet="/images/scan-layout-demo.webp" type="image/webp" />
        <img src="/images/scan-layout-demo-cropped.jpg" alt="" className="w-full h-full object-cover opacity-40" />
      </picture>
      <div className="absolute inset-0 bg-gradient-to-b from-black/20 via-transparent to-black/60" />
    </div>

    {/* iOS-style glass bottom sheet */}
    <div
      className="absolute bottom-0 left-0 right-0 z-10 flex flex-col"
      style={{ animation: 'hh-slideUp 0.5s cubic-bezier(0.2, 0.8, 0.2, 1) both' }}
    >
      {/* Grab handle */}
      <div className="flex justify-center pt-2 pb-1.5">
        <div className="w-8 h-[3px] rounded-full bg-white/30" />
      </div>

      {/* Sheet content */}
      <div
        className="px-3 pb-14 pt-1 rounded-t-2xl border-t border-white/20"
        style={{
          background: 'rgba(255, 255, 255, 0.85)',
          backdropFilter: 'blur(40px) saturate(180%)',
          WebkitBackdropFilter: 'blur(40px) saturate(180%)',
        }}
      >
        {/* Header */}
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-1.5">
            <div className="w-5 h-5 rounded-full bg-[#F0A6B3]/15 flex items-center justify-center">
              <Sparkles className="w-3 h-3 text-[#F0A6B3]" />
            </div>
            <span className="text-[11px] font-semibold text-gray-900">Vastu Remedies</span>
          </div>
          <span className="text-[9px] text-gray-400 font-medium">{REMEDIES.length} found</span>
        </div>

        {/* Remedy cards */}
        <div className="flex flex-col gap-1.5">
          {REMEDIES.map((r, i) => (
            <div
              key={r.id}
              className="flex items-center gap-2 p-2 rounded-xl bg-white/80 border border-gray-100 shadow-[0_1px_2px_rgba(0,0,0,0.04)]"
              style={{ animationDelay: `${200 + i * 120}ms`, animation: 'hh-fadeInUp 0.4s ease-out both' }}
            >
              <div className="shrink-0 w-6 h-6 rounded-lg bg-gradient-to-br from-[#F0A6B3]/20 to-[#F0A6B3]/10 flex items-center justify-center">
                <span className="text-[8px] font-bold text-[#F0A6B3]">{r.zone}</span>
              </div>
              <span className="text-gray-700 text-[10px] leading-snug flex-1">{r.text}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  </div>
));

// --- Main Component ---

const HeroScanDemo: React.FC = () => {
  const [stageIndex, setStageIndex] = useState(0);
  const stage = STAGES[stageIndex].id;

  // Auto-cycle every 4 seconds
  useEffect(() => {
    const timer = setInterval(() => {
      setStageIndex((i) => (i + 1) % STAGES.length);
    }, 4000);
    return () => clearInterval(timer);
  }, []);

  return (
    <div className="relative w-full h-full bg-[#0a0a12] overflow-hidden">
      {/* Stage content */}
      {stage === 'scanning' && <ScanningStage />}
      {stage === 'processing' && <ProcessingStage />}
      {stage === 'layout' && <LayoutStage />}
      {stage === 'remedies' && <RemediesStage />}

      {/* Bottom stage indicator */}
      <div className="absolute bottom-0 left-0 right-0 z-20 flex items-center justify-center gap-2 pb-3 pt-4 bg-gradient-to-t from-black/70 via-black/30 to-transparent">
        <div className="flex items-center gap-1 px-2.5 py-1 rounded-full bg-[#F0A6B3] text-white text-[9px] font-medium">
          {STAGES[stageIndex].icon}
          <span>{STAGES[stageIndex].label}</span>
        </div>
        <div className="flex items-center gap-1">
          {STAGES.map((_, i) => (
            <div
              key={i}
              className={`rounded-full transition-all duration-300 ${
                i === stageIndex ? 'w-4 h-1.5 bg-[#F0A6B3]' : 'w-1.5 h-1.5 bg-white/30'
              }`}
            />
          ))}
        </div>
      </div>
    </div>
  );
};

export default memo(HeroScanDemo);
