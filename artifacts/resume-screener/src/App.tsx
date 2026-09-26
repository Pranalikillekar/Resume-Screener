import { type ChangeEvent, type ReactNode, useMemo, useRef, useState } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import {
  ArrowDown,
  ArrowUp,
  ArrowUpRight,
  BarChart3,
  Check,
  CheckCircle2,
  ChevronDown,
  CircleHelp,
  Clipboard,
  FileText,
  Fingerprint,
  FolderOpen,
  Info,
  LayoutDashboard,
  LoaderCircle,
  LockKeyhole,
  MoreHorizontal,
  Plus,
  RotateCcw,
  ScanSearch,
  ShieldCheck,
  Sparkles,
  UsersRound,
  X,
} from 'lucide-react';
import { ErrorBoundary } from '@/components/error-boundary';
import { Toaster } from '@/components/ui/toaster';
import { TooltipProvider } from '@/components/ui/tooltip';
import NotFound from '@/pages/not-found';
import { Route, Switch, useLocation, Router as WouterRouter } from 'wouter';

const queryClient = new QueryClient();

type Candidate = {
  id: string;
  name: string;
  fileName: string;
  sourceText?: string;
  size: string;
  score: number;
  skills: string[];
  missing: string[];
  summary: string;
  initials: string;
  color: string;
};

const defaultJobDescription = `We are looking for a Product Analyst to help turn customer behavior into better product decisions.

You will partner with product, research, and engineering to define metrics, build dashboards, and communicate clear recommendations. The strongest candidates bring 3+ years of experience with SQL and product analytics, comfort with experimentation, and a habit of making complex findings understandable.`;

const sampleCandidates: Candidate[] = [
  {
    id: 'aisha-patel',
    name: 'Aisha Patel',
    fileName: 'aisha-patel-product-analytics.pdf',
    size: '284 KB',
    score: 92,
    skills: ['SQL', 'Product analytics', 'Experimentation', 'Looker'],
    missing: ['Python'],
    summary: 'Strong evidence of owning product metrics and partnering with cross-functional teams. Her experimentation work maps closely to the role’s first 90 days.',
    initials: 'AP',
    color: 'bg-[#dce76b]',
  },
  {
    id: 'marcus-chen',
    name: 'Marcus Chen',
    fileName: 'marcus-chen-resume.pdf',
    size: '191 KB',
    score: 84,
    skills: ['SQL', 'A/B testing', 'Tableau', 'Stakeholder communication'],
    missing: ['Product research'],
    summary: 'Well-rounded analytics background with a clear record of translating analysis into decisions. Less direct product discovery experience, but a credible fit.',
    initials: 'MC',
    color: 'bg-[#f3c7a8]',
  },
  {
    id: 'leonie-bauer',
    name: 'Leonie Bauer',
    fileName: 'leonie-bauer-cv.pdf',
    size: '342 KB',
    score: 73,
    skills: ['SQL', 'Data visualization', 'Cohort analysis'],
    missing: ['Experimentation', 'Product partnership'],
    summary: 'Good analytical foundation and strong communication signals. The resume gives less evidence of experimentation ownership than the brief requests.',
    initials: 'LB',
    color: 'bg-[#bedbd4]',
  },
  {
    id: 'david-okafor',
    name: 'David Okafor',
    fileName: 'david-okafor-profile.pdf',
    size: '256 KB',
    score: 61,
    skills: ['Reporting', 'Excel', 'Data quality'],
    missing: ['SQL', 'Product analytics', 'Experimentation'],
    summary: 'Relevant reporting experience, though the current resume does not show enough of the product analytics or experimentation depth needed for this role.',
    initials: 'DO',
    color: 'bg-[#d6c8e4]',
  },
];

const skillLibrary = ['SQL', 'Product analytics', 'Experimentation', 'Looker', 'Tableau', 'Python', 'Data visualization'];

const stopWords = new Set([
  'about', 'after', 'again', 'also', 'and', 'are', 'been', 'being', 'between',
  'build', 'clear', 'could', 'from', 'have', 'into', 'more', 'most', 'other',
  'our', 'role', 'should', 'that', 'their', 'there', 'these', 'they', 'this',
  'through', 'using', 'will', 'with', 'you', 'your',
]);

function normalizeForMatching(text: string) {
  return text
    .toLowerCase()
    .replace(/c\+\+/g, 'cpp')
    .replace(/c#/g, 'csharp')
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function redactForScoring(text: string) {
  const lines = text.split(/\r?\n/);
  const firstContentLine = lines.findIndex((line) => line.trim().length > 0);
  if (firstContentLine >= 0) lines[firstContentLine] = '[NAME REMOVED]';

  return lines
    .join('\n')
    .replace(/\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/gi, ' [EMAIL REMOVED] ')
    .replace(/\+?\d[\d\s().-]{7,}\d/g, ' [PHONE REMOVED] ')
    .replace(/\b(?:mr|mrs|ms|miss|he|she|him|her|his|hers|himself|herself|man|woman|male|female|husband|wife|boyfriend|girlfriend|sir|madam)\b/gi, ' [IDENTITY TERM REMOVED] ');
}

function getJobSignals(jobDescription: string) {
  const normalizedJob = normalizeForMatching(jobDescription);
  const phraseSignals = skillLibrary.filter((skill) => normalizedJob.includes(normalizeForMatching(skill)));
  const counts = new Map<string, number>();

  normalizedJob
    .split(' ')
    .filter((token) => token.length > 2 && !stopWords.has(token))
    .forEach((token) => counts.set(token, (counts.get(token) ?? 0) + 1));

  const keywordSignals = [...counts.entries()]
    .sort(([, countA], [, countB]) => countB - countA)
    .slice(0, 10)
    .map(([token]) => token);

  return [...new Set([...phraseSignals, ...keywordSignals])].slice(0, 14);
}

function prettifySignal(signal: string) {
  const knownSkill = skillLibrary.find((skill) => normalizeForMatching(skill) === signal);
  if (knownSkill) return knownSkill;
  return signal.replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function screenCandidate(candidate: Candidate, jobDescription: string) {
  const signals = getJobSignals(jobDescription);
  const redactedText = normalizeForMatching(redactForScoring(candidate.sourceText ?? ''));
  const matched = signals.filter((signal) => redactedText.includes(normalizeForMatching(signal)));
  const missing = signals.filter((signal) => !matched.includes(signal)).slice(0, 3);
  const score = signals.length ? Math.round((matched.length / signals.length) * 100) : 0;

  return {
    ...candidate,
    score,
    skills: matched.slice(0, 6).map(prettifySignal),
    missing: missing.map(prettifySignal),
    summary: matched.length
      ? `Matched ${matched.length} of ${signals.length} visible role signals, including ${matched.slice(0, 3).map(prettifySignal).join(', ')}. ${missing.length ? `Explore ${missing.map(prettifySignal).join(', ')} in a structured conversation.` : 'The resume covers the strongest visible signals.'}`
      : 'No role signals were found in readable resume text. Review the source document before making a decision.',
  };
}

function createCandidateFromFile(file: File, index: number, sourceText = ''): Candidate {
  const name = file.name
    .replace(/\.(md|txt)$/i, '')
    .replace(/[-_]+/g, ' ')
    .replace(/\b\w/g, (letter) => letter.toUpperCase())
    .trim() || `Resume ${index + 1}`;
  const initials = name
    .split(' ')
    .slice(0, 2)
    .map((part) => part[0])
    .join('')
    .toUpperCase();
  const colors = ['bg-[#dce76b]', 'bg-[#f3c7a8]', 'bg-[#bedbd4]', 'bg-[#d6c8e4]'];
  return {
    id: `${file.name}-${file.lastModified}-${index}`,
    name,
    fileName: file.name,
    sourceText,
    size: `${Math.max(1, Math.round(file.size / 1024))} KB`,
    score: 0,
    skills: [],
    missing: [],
    summary: 'Ready for a local screening pass.',
    initials: initials || 'R',
    color: colors[index % colors.length],
  };
}

function ScoreRing({ score, size = 'md' }: { score: number; size?: 'sm' | 'md' | 'lg' }) {
  const dimensions = size === 'lg' ? 'h-[84px] w-[84px]' : size === 'sm' ? 'h-12 w-12' : 'h-16 w-16';
  const text = size === 'lg' ? 'text-2xl' : size === 'sm' ? 'text-sm' : 'text-lg';
  const circumference = 2 * Math.PI * 22;
  const offset = circumference - (score / 100) * circumference;
  return (
    <div className={`relative shrink-0 ${dimensions}`} aria-label={`${score} percent fit`}>
      <svg className="h-full w-full -rotate-90" viewBox="0 0 52 52">
        <circle cx="26" cy="26" r="22" fill="none" stroke="hsl(154 17% 86%)" strokeWidth="4" />
        <circle
          cx="26"
          cy="26"
          r="22"
          fill="none"
          stroke={score >= 80 ? 'hsl(190 35% 27%)' : score >= 65 ? 'hsl(35 72% 53%)' : 'hsl(5 66% 55%)'}
          strokeLinecap="round"
          strokeWidth="4"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
        />
      </svg>
      <span className={`absolute inset-0 flex items-center justify-center font-mono font-bold text-[#17343a] ${text}`}>{score}</span>
    </div>
  );
}

function Sidebar({
  candidateCount,
  onSample,
  onNavigate,
}: {
  candidateCount: number;
  onSample: () => void;
  onNavigate: (sectionId: string) => void;
}) {
  return (
    <aside className="flex w-full shrink-0 flex-col bg-[#17343a] text-[#eff4e9] md:min-h-screen md:w-[232px]">
      <div className="flex items-center justify-between px-5 py-5 md:block">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center bg-[#dce76b] text-[#17343a]">
            <ScanSearch size={19} strokeWidth={2.4} />
          </div>
          <div>
            <div className="font-mono text-[11px] uppercase tracking-[0.18em] text-[#dce76b]">Tally</div>
            <div className="text-[15px] font-semibold tracking-tight">Screening desk</div>
          </div>
        </div>
        <button className="rounded p-2 text-[#a9bfba] transition hover:bg-[#294b4e] md:hidden" data-testid="button-open-menu" aria-label="Open menu">
          <MoreHorizontal size={20} />
        </button>
      </div>

      <div className="hidden flex-1 px-3 md:block">
        <div className="mb-3 px-3 pt-7 font-mono text-[10px] uppercase tracking-[0.18em] text-[#789692]">Workspace</div>
        <nav className="space-y-1">
          <button onClick={() => onNavigate('screening-desk')} className="flex w-full items-center gap-3 bg-[#294b4e] px-3 py-2.5 text-left text-sm font-semibold text-[#eff4e9]" data-testid="button-nav-screening">
            <LayoutDashboard size={16} className="text-[#dce76b]" />
            Screening desk
            <span className="ml-auto font-mono text-[10px] text-[#aec4bf]">01</span>
          </button>
          <button onClick={() => onNavigate('candidate-pool')} className="flex w-full items-center gap-3 px-3 py-2.5 text-left text-sm text-[#a9bfba] transition hover:bg-[#234347] hover:text-[#eff4e9]" data-testid="button-nav-candidates">
            <UsersRound size={16} />
            Candidate pool
            <span className="ml-auto font-mono text-[10px] text-[#789692]">{candidateCount.toString().padStart(2, '0')}</span>
          </button>
          <button onClick={() => onNavigate('review-notes')} className="flex w-full items-center gap-3 px-3 py-2.5 text-left text-sm text-[#a9bfba] transition hover:bg-[#234347] hover:text-[#eff4e9]" data-testid="button-nav-notes">
            <Clipboard size={16} />
            Review notes
          </button>
        </nav>

        <div className="mb-3 mt-10 px-3 font-mono text-[10px] uppercase tracking-[0.18em] text-[#789692]">Read first</div>
        <button
          onClick={() => document.getElementById('fairness-boundary')?.scrollIntoView({ behavior: 'smooth' })}
          className="flex w-full items-start gap-3 px-3 py-2.5 text-left text-sm leading-5 text-[#a9bfba] transition hover:bg-[#234347] hover:text-[#eff4e9]"
          data-testid="button-nav-fairness"
        >
          <ShieldCheck size={16} className="mt-0.5 shrink-0 text-[#dce76b]" />
          <span>Fairness boundary</span>
        </button>
      </div>

      <div className="hidden border-t border-[#2b5051] p-4 md:block">
        <div className="mb-3 flex items-center gap-2 text-xs text-[#a9bfba]">
          <LockKeyhole size={13} className="text-[#dce76b]" />
          <span>Private by default</span>
        </div>
        <p className="mb-4 text-[11px] leading-5 text-[#789692]">Documents stay in this browser. No candidate data leaves this workspace.</p>
        <button onClick={onSample} className="flex items-center gap-2 text-xs font-semibold text-[#dce76b] transition hover:text-[#f0f5b2]" data-testid="button-load-sample-sidebar">
          <Sparkles size={13} />
          Load a sample desk
          <ArrowUpRight size={13} />
        </button>
      </div>
    </aside>
  );
}

function ResumeQueue({
  candidates,
  onAdd,
  onRemove,
}: {
  candidates: Candidate[];
  onAdd: (event: ChangeEvent<HTMLInputElement>) => void;
  onRemove: (id: string) => void;
}) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  return (
    <section id="candidate-pool" className="scroll-mt-6 rounded-[2px] border border-[#d8e1d7] bg-[#fbfcf9] p-5 shadow-[0_2px_10px_rgba(23,52,58,0.025)] sm:p-6" data-testid="section-resume-queue">
      <div className="mb-5 flex items-start justify-between gap-4">
        <div>
          <div className="mb-1 flex items-center gap-2">
            <span className="font-mono text-[10px] font-bold uppercase tracking-[0.17em] text-[#68817c]">02 / source material</span>
            <span className="rounded-full bg-[#edf3db] px-2 py-0.5 font-mono text-[10px] text-[#536a54]">local only</span>
          </div>
          <h2 className="text-xl font-semibold tracking-[-0.03em] text-[#17343a]">Add resumes</h2>
          <p className="mt-1 text-sm text-[#68817c]">Plain text or Markdown. Add as many as you need.</p>
        </div>
        <div className="hidden rounded-full border border-[#d8e1d7] p-2 text-[#68817c] sm:block">
          <FolderOpen size={17} />
        </div>
      </div>

      <input ref={fileInputRef} onChange={onAdd} className="hidden" type="file" accept=".txt,.md,text/plain,text/markdown" multiple data-testid="input-resume-files" />
      <button
        onClick={() => fileInputRef.current?.click()}
        className="group flex min-h-[104px] w-full flex-col items-center justify-center border border-dashed border-[#b8c9b7] bg-[#f4f8ed] px-4 text-center transition hover:border-[#708c78] hover:bg-[#edf3db]"
        data-testid="button-add-resumes"
      >
        <span className="mb-2 flex h-8 w-8 items-center justify-center rounded-full bg-[#17343a] text-[#dce76b] transition group-hover:scale-105">
          <Plus size={17} />
        </span>
        <span className="text-sm font-semibold text-[#355459]">Choose resume files</span>
        <span className="mt-1 text-xs text-[#79918c]">or drop them here</span>
      </button>

      {candidates.length > 0 ? (
        <div className="mt-4 divide-y divide-[#e2e9df]">
          {candidates.map((candidate) => (
            <div key={candidate.id} className="flex items-center gap-3 py-3 first:pt-1" data-testid={`row-resume-${candidate.id}`}>
              <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-sm font-mono text-[11px] font-bold text-[#17343a] ${candidate.color}`}>
                <FileText size={15} />
              </div>
              <div className="min-w-0 flex-1">
                <div className="truncate text-sm font-semibold text-[#26474c]">{candidate.name}</div>
                <div className="mt-0.5 flex items-center gap-2 font-mono text-[10px] text-[#829791]">
                  <span className="truncate">{candidate.fileName}</span>
                  <span>·</span>
                  <span>{candidate.size}</span>
                </div>
              </div>
              <button onClick={() => onRemove(candidate.id)} className="rounded p-2 text-[#9aada5] transition hover:bg-[#f9e9e3] hover:text-[#b34f43]" aria-label={`Remove ${candidate.name}`} data-testid={`button-remove-resume-${candidate.id}`}>
                <X size={15} />
              </button>
            </div>
          ))}
        </div>
      ) : (
        <div className="mt-5 flex items-center gap-2 text-xs text-[#829791]">
          <Info size={14} />
          Your candidate list will appear here before screening.
        </div>
      )}
    </section>
  );
}

function CandidateResult({
  candidate,
  rank,
  selected,
  onSelect,
}: {
  candidate: Candidate;
  rank: number;
  selected: boolean;
  onSelect: () => void;
}) {
  return (
    <button
      onClick={onSelect}
      className={`group w-full border-b border-[#e1e8df] px-5 py-4 text-left transition last:border-b-0 hover:bg-[#f4f8ed] sm:px-6 ${selected ? 'bg-[#f4f8ed]' : 'bg-[#fbfcf9]'}`}
      data-testid={`button-candidate-${candidate.id}`}
    >
      <div className="flex items-start gap-3">
        <div className="w-5 pt-1 font-mono text-[11px] text-[#9aada5]">0{rank}</div>
        <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-xs font-bold text-[#17343a] ${candidate.color}`}>{candidate.initials}</div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center justify-between gap-3">
            <div className="truncate text-sm font-semibold text-[#17343a]">{candidate.name}</div>
            <div className="flex items-center gap-2">
              <ScoreRing score={candidate.score} size="sm" />
              {rank === 1 ? <ArrowUp size={13} className="text-[#56766c]" /> : rank === 2 ? <ArrowUp size={13} className="text-[#8aa391]" /> : <ArrowDown size={13} className="text-[#b7c4b5]" />}
            </div>
          </div>
          <div className="mt-2 flex flex-wrap gap-1.5">
            {candidate.skills.slice(0, 3).map((skill) => (
              <span key={skill} className="rounded-sm bg-[#e9f0e5] px-2 py-1 text-[10px] font-medium text-[#49665f]">{skill}</span>
            ))}
            {candidate.skills.length > 3 && <span className="px-1 py-1 text-[10px] text-[#78918a]">+{candidate.skills.length - 3}</span>}
          </div>
        </div>
        <ChevronDown size={15} className={`mt-1 shrink-0 text-[#91a49e] transition ${selected ? 'rotate-180' : ''}`} />
      </div>
      {selected && (
        <div className="ml-8 mt-4 border-l-2 border-[#dce76b] pl-3 text-xs leading-5 text-[#5f7971]">
          <div className="mb-1 font-mono text-[10px] uppercase tracking-[0.1em] text-[#779087]">Why it surfaced</div>
          {candidate.summary}
        </div>
      )}
    </button>
  );
}

function ResultsPanel({
  candidates,
  hasRun,
  isScreening,
  selectedId,
  onSelect,
  onLoadSample,
  onExport,
}: {
  candidates: Candidate[];
  hasRun: boolean;
  isScreening: boolean;
  selectedId: string | null;
  onSelect: (id: string) => void;
  onLoadSample: () => void;
  onExport: () => void;
}) {
  const average = candidates.length ? Math.round(candidates.reduce((sum, candidate) => sum + candidate.score, 0) / candidates.length) : 0;
  return (
    <section id="review-notes" className="scroll-mt-6 flex min-h-[570px] flex-col overflow-hidden rounded-[2px] border border-[#cad9cd] bg-[#fbfcf9] shadow-[0_4px_18px_rgba(23,52,58,0.05)]" data-testid="section-results">
      <div className="border-b border-[#dfe8dd] bg-[#eef4e8] px-5 py-5 sm:px-6">
        <div className="flex items-start justify-between gap-4">
          <div>
            <div className="mb-1 flex items-center gap-2">
              <span className="font-mono text-[10px] font-bold uppercase tracking-[0.17em] text-[#68817c]">03 / fit signal</span>
              {hasRun && !isScreening && <span className="flex items-center gap-1 rounded-full bg-[#dce9da] px-2 py-0.5 font-mono text-[10px] text-[#4e6c59]"><CheckCircle2 size={11} /> ready</span>}
            </div>
            <h2 className="text-xl font-semibold tracking-[-0.03em] text-[#17343a]">Ranked candidates</h2>
          </div>
          {hasRun && !isScreening && (
            <button onClick={onExport} className="flex items-center gap-1.5 rounded-sm border border-[#cbd9ce] bg-[#fbfcf9] px-2.5 py-2 text-[11px] font-semibold text-[#537168] transition hover:border-[#91a89a] hover:text-[#17343a]" data-testid="button-export-results">
              <ArrowUpRight size={13} />
              Export notes
            </button>
          )}
        </div>
        {hasRun && !isScreening && (
          <div className="mt-5 flex items-end gap-6">
            <div>
              <div className="font-mono text-3xl font-bold tracking-[-0.08em] text-[#17343a]">{average}<span className="ml-1 text-sm tracking-normal text-[#75908a]">avg</span></div>
              <div className="mt-1 text-[11px] text-[#78918a]">fit across {candidates.length} {candidates.length === 1 ? 'resume' : 'resumes'}</div>
            </div>
            <div className="h-9 w-px bg-[#cad8cc]" />
            <div>
              <div className="font-mono text-3xl font-bold tracking-[-0.08em] text-[#17343a]">{candidates.filter((candidate) => candidate.score >= 80).length}</div>
              <div className="mt-1 text-[11px] text-[#78918a]">strong signals</div>
            </div>
          </div>
        )}
      </div>

      {isScreening ? (
        <div className="scan-shimmer flex flex-1 flex-col justify-center px-6 py-10" data-testid="status-screening">
          <div className="mx-auto w-full max-w-[320px] text-center">
            <div className="mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-full bg-[#17343a] text-[#dce76b]">
              <LoaderCircle size={25} className="animate-spin" />
            </div>
            <h3 className="text-base font-semibold text-[#17343a]">Reading for evidence</h3>
            <p className="mt-2 text-sm leading-6 text-[#78918a]">Matching job signals to resume text in this browser. Personal identifiers are not part of the ranking pass.</p>
            <div className="mt-6 space-y-2 text-left">
              {[1, 2, 3].map((item) => <div key={item} className="h-2 animate-pulse bg-[#e6eee2]" style={{ width: `${72 + item * 8}%` }} />)}
            </div>
          </div>
        </div>
      ) : hasRun && candidates.length > 0 ? (
        <div className="quiet-scroll flex-1 overflow-y-auto" data-testid="list-ranked-candidates">
          {candidates.map((candidate, index) => (
            <CandidateResult key={candidate.id} candidate={candidate} rank={index + 1} selected={selectedId === candidate.id} onSelect={() => onSelect(candidate.id)} />
          ))}
          <div className="m-5 flex items-start gap-3 border border-[#d9e4d6] bg-[#f4f8ed] p-3.5 text-xs leading-5 text-[#607970] sm:mx-6">
            <CircleHelp size={15} className="mt-0.5 shrink-0 text-[#6c8a79]" />
            <span><strong className="font-semibold text-[#35584f]">Fit is a starting point, not a verdict.</strong> Open the source resume and use structured conversation to validate what matters.</span>
          </div>
        </div>
      ) : (
        <div className="paper-grid flex flex-1 flex-col items-center justify-center px-8 py-12 text-center" data-testid="empty-results">
          <div className="mb-5 flex h-14 w-14 items-center justify-center border border-[#c6d5c4] bg-[#fbfcf9] text-[#6c8a79]">
            <BarChart3 size={25} strokeWidth={1.5} />
          </div>
          <h3 className="text-lg font-semibold tracking-[-0.02em] text-[#294b4e]">Your desk is clear</h3>
          <p className="mt-2 max-w-[270px] text-sm leading-6 text-[#78918a]">Add a role brief and a few resumes. We’ll show the evidence behind each fit signal here.</p>
          <button onClick={onLoadSample} className="mt-6 flex items-center gap-2 border-b border-[#6c8a79] pb-1 text-xs font-semibold text-[#46675d] transition hover:border-[#17343a] hover:text-[#17343a]" data-testid="button-load-sample-empty">
            <Sparkles size={13} />
            See a sample result
          </button>
        </div>
      )}
    </section>
  );
}

function FairnessBoundary() {
  const [expanded, setExpanded] = useState(false);
  return (
    <section id="fairness-boundary" className="mt-8 border-y border-[#cad9cd] py-5" data-testid="section-fairness-boundary">
      <button onClick={() => setExpanded((value) => !value)} className="flex w-full items-center justify-between gap-4 text-left" data-testid="button-toggle-fairness-boundary">
        <div className="flex items-start gap-3">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center bg-[#dce76b] text-[#17343a]"><Fingerprint size={16} /></div>
          <div>
            <div className="flex items-center gap-2 text-sm font-semibold text-[#294b4e]">The fairness boundary</div>
            <p className="mt-1 text-xs leading-5 text-[#78918a]">What we redact, what we retain, and where human judgment comes back in.</p>
          </div>
        </div>
        <ChevronDown size={17} className={`shrink-0 text-[#779087] transition ${expanded ? 'rotate-180' : ''}`} />
      </button>
      {expanded && (
        <div className="ml-11 mt-5 grid gap-4 border-l border-[#d1ded0] pl-4 text-xs leading-5 text-[#68817c] sm:grid-cols-3" data-testid="content-fairness-boundary">
          <div><div className="mb-1 font-mono text-[10px] uppercase tracking-[0.12em] text-[#4c6a60]">Excluded</div>Names, photos, email addresses, location, graduation year, and demographic clues do not contribute to the fit score.</div>
          <div><div className="mb-1 font-mono text-[10px] uppercase tracking-[0.12em] text-[#4c6a60]">Retained</div>Role-relevant evidence such as tools, scope, outcomes, and collaboration language is compared with the brief.</div>
          <div><div className="mb-1 font-mono text-[10px] uppercase tracking-[0.12em] text-[#4c6a60]">Still yours</div>A score cannot see potential, context, or a great conversation. Use it to choose what to read first, never who to dismiss.</div>
        </div>
      )}
    </section>
  );
}

function Home() {
  const [jobDescription, setJobDescription] = useState(defaultJobDescription);
  const [queue, setQueue] = useState<Candidate[]>([]);
  const [results, setResults] = useState<Candidate[]>([]);
  const [hasRun, setHasRun] = useState(false);
  const [isScreening, setIsScreening] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [notice, setNotice] = useState('');

  const sortedResults = useMemo(() => [...results].sort((a, b) => b.score - a.score), [results]);
  const navigateToSection = (sectionId: string) => {
    document.getElementById(sectionId)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  const addFiles = async (event: ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files ?? []);
    if (!files.length) return;
    const supportedFiles = files.filter((file) => /\.(txt|md)$/i.test(file.name));
    const rejectedCount = files.length - supportedFiles.length;
    if (!supportedFiles.length) {
      setNotice('This local build reads plain text or Markdown files. Convert PDF or DOCX resumes to text before adding them.');
      event.target.value = '';
      return;
    }
    const localText = await Promise.all(supportedFiles.map((file) => file.text().catch(() => '')));
    setQueue((current) => {
      const additions = supportedFiles.map((file, index) => createCandidateFromFile(file, current.length + index, localText[index]));
      const existingNames = new Set(current.map((candidate) => candidate.fileName));
      return [...current, ...additions.filter((candidate) => !existingNames.has(candidate.fileName))];
    });
    setHasRun(false);
    setNotice(`${supportedFiles.length} ${supportedFiles.length === 1 ? 'resume is' : 'resumes are'} ready to screen.${rejectedCount ? ` ${rejectedCount} unsupported file${rejectedCount === 1 ? '' : 's'} skipped.` : ''}`);
    event.target.value = '';
  };

  const runScreening = () => {
    if (!jobDescription.trim()) {
      setNotice('Add a job description first so the fit signal has something to compare against.');
      return;
    }
    if (!queue.length) {
      setNotice('Add at least one resume to start a local screening pass.');
      return;
    }
    setNotice('');
    setIsScreening(true);
    setHasRun(true);
    setResults([]);
    window.setTimeout(() => {
      const adjusted = queue.map((candidate) => screenCandidate(candidate, jobDescription));
      setResults(adjusted);
      setIsScreening(false);
      setSelectedId(adjusted[0]?.id ?? null);
      setNotice('Screening complete. Review the evidence behind each signal.');
    }, 1300);
  };

  const loadSample = () => {
    setQueue(sampleCandidates);
    setResults(sampleCandidates);
    setHasRun(true);
    setIsScreening(false);
    setSelectedId(sampleCandidates[0].id);
    setNotice('Sample desk loaded. Nothing was uploaded or sent anywhere.');
  };

  const exportResults = () => {
    const payload = sortedResults.map(({ name, score, skills, missing, summary }) => ({ name, fitScore: score, matchedSkills: skills, gapsToExplore: missing, rationale: summary }));
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'tally-screening-notes.json';
    link.click();
    URL.revokeObjectURL(url);
    setNotice('Notes exported locally as JSON.');
  };

  return (
    <div className="min-h-[100dvh] bg-[#f0f5ed] text-[#17343a]">
      <div className="flex min-h-[100dvh] flex-col md:flex-row">
        <Sidebar candidateCount={queue.length} onSample={loadSample} onNavigate={navigateToSection} />
        <main id="screening-desk" className="min-w-0 flex-1">
          <header className="flex flex-wrap items-center justify-between gap-3 border-b border-[#d6e1d5] bg-[#f7faf5] px-5 py-4 sm:px-8">
            <div className="flex items-center gap-2 text-xs text-[#75908a]">
              <span className="font-mono text-[10px] uppercase tracking-[0.16em] text-[#46675d]">Workspace / first pass</span>
              <span className="text-[#bac8ba]">·</span>
              <span className="hidden sm:inline">No account required</span>
            </div>
            <div className="flex items-center gap-3">
              <span className="flex items-center gap-1.5 font-mono text-[10px] uppercase tracking-[0.12em] text-[#5e7d70]"><span className="h-1.5 w-1.5 rounded-full bg-[#8fae65]" /> local mode</span>
              <div className="flex h-7 w-7 items-center justify-center rounded-full bg-[#d6c8e4] text-[10px] font-bold text-[#17343a]" data-testid="avatar-user">RM</div>
            </div>
          </header>

          <div className="mx-auto max-w-[1440px] px-5 py-8 sm:px-8 sm:py-10">
            <div className="desk-in mb-8 flex flex-col justify-between gap-5 lg:flex-row lg:items-end">
              <div>
                <div className="mb-3 flex items-center gap-2 font-mono text-[10px] font-bold uppercase tracking-[0.2em] text-[#678379]">
                  <span className="h-px w-6 bg-[#dce76b]" />
                  A clearer first pass
                </div>
                <h1 className="max-w-[660px] font-serif text-[2.7rem] leading-[0.96] tracking-[-0.04em] text-[#17343a] sm:text-[3.65rem]">Find the signal.<br /><em className="text-[#69816f]">Keep the judgment.</em></h1>
                <p className="mt-4 max-w-[570px] text-sm leading-6 text-[#68817c] sm:text-[15px]">A quiet workspace for reading a stack of resumes against one role. Tally gives you a transparent fit signal, then gets out of the way.</p>
              </div>
              <div className="flex max-w-[260px] items-start gap-2 border-l-2 border-[#dce76b] pl-3 text-xs leading-5 text-[#68817c]">
                <LockKeyhole size={15} className="mt-0.5 shrink-0 text-[#55796d]" />
                <span>Resumes stay on this device. Screening is local, not a black box upload.</span>
              </div>
            </div>

            {notice && (
              <div className="desk-in-delay-1 mb-5 flex items-center justify-between gap-3 border border-[#d4e2cf] bg-[#eaf2df] px-4 py-3 text-xs text-[#55705e]" role="status" data-testid="status-notice">
                <div className="flex items-center gap-2"><Check size={14} className="text-[#698b5e]" />{notice}</div>
                <button onClick={() => setNotice('')} className="p-1 text-[#779087] hover:text-[#17343a]" aria-label="Dismiss notification" data-testid="button-dismiss-notice"><X size={14} /></button>
              </div>
            )}

            <div className="grid gap-6 lg:grid-cols-[minmax(0,0.93fr)_minmax(420px,1.07fr)] xl:gap-8">
              <div className="desk-in desk-in-delay-1 min-w-0">
                <section className="rounded-[2px] border border-[#d8e1d7] bg-[#fbfcf9] p-5 shadow-[0_2px_10px_rgba(23,52,58,0.025)] sm:p-6" data-testid="section-job-description">
                  <div className="mb-5 flex items-start justify-between gap-4">
                    <div>
                      <div className="mb-1 flex items-center gap-2"><span className="font-mono text-[10px] font-bold uppercase tracking-[0.17em] text-[#68817c]">01 / role brief</span><span className="rounded-full bg-[#e8edf0] px-2 py-0.5 font-mono text-[10px] text-[#587078]">required</span></div>
                      <h2 className="text-xl font-semibold tracking-[-0.03em] text-[#17343a]">What are you hiring for?</h2>
                      <p className="mt-1 text-sm text-[#68817c]">Paste the role description. Keep the details that define good work.</p>
                    </div>
                    <FileText size={18} className="mt-1 shrink-0 text-[#7c958d]" />
                  </div>
                  <textarea value={jobDescription} onChange={(event) => setJobDescription(event.target.value)} className="min-h-[210px] w-full resize-y border border-[#d5e0d3] bg-[#f7faf5] p-4 text-sm leading-6 text-[#355459] outline-none transition placeholder:text-[#9aac9e] focus:border-[#819b83] focus:ring-2 focus:ring-[#dce76b]/50" placeholder="Paste the job description here…" data-testid="textarea-job-description" />
                  <div className="mt-3 flex items-center justify-between gap-3 text-[10px] text-[#829791]">
                    <span className="font-mono">{jobDescription.length.toLocaleString()} characters</span>
                    <button onClick={() => setJobDescription('')} className="flex items-center gap-1 font-semibold text-[#718b83] hover:text-[#b34f43]" data-testid="button-clear-job-description"><RotateCcw size={12} /> Clear brief</button>
                  </div>
                </section>

                <div className="mt-6">
                  <ResumeQueue candidates={queue} onAdd={addFiles} onRemove={(id) => { setQueue((current) => current.filter((candidate) => candidate.id !== id)); setHasRun(false); setNotice('Resume removed from this screening desk.'); }} />
                </div>

                <FairnessBoundary />

                <button onClick={runScreening} disabled={isScreening} className="mt-6 flex w-full items-center justify-center gap-2 bg-[#17343a] px-5 py-3.5 text-sm font-semibold text-[#eff4e9] shadow-[4px_4px_0_#dce76b] transition hover:bg-[#294b4e] active:translate-x-[1px] active:translate-y-[1px] disabled:cursor-wait disabled:opacity-80" data-testid="button-run-screening">
                  {isScreening ? <LoaderCircle size={16} className="animate-spin" /> : <ScanSearch size={16} />}
                  {isScreening ? 'Screening locally…' : 'Run local screening'}
                  {!isScreening && <ArrowUpRight size={16} className="ml-1" />}
                </button>
                <p className="mt-3 text-center font-mono text-[10px] uppercase tracking-[0.08em] text-[#879b92]">No data leaves this browser · results are advisory</p>
              </div>

              <div className="desk-in desk-in-delay-2 min-w-0">
                <ResultsPanel candidates={sortedResults} hasRun={hasRun} isScreening={isScreening} selectedId={selectedId} onSelect={setSelectedId} onLoadSample={loadSample} onExport={exportResults} />
              </div>
            </div>

            <footer className="mt-10 flex flex-col justify-between gap-2 border-t border-[#d6e1d5] pt-4 text-[10px] text-[#829791] sm:flex-row">
              <span className="font-mono uppercase tracking-[0.14em]">Tally / a human-first screening desk</span>
              <span className="flex items-center gap-1.5"><ShieldCheck size={12} /> Designed for a thoughtful first read</span>
            </footer>
          </div>
        </main>
      </div>
    </div>
  );
}

function Router() {
  return (
    <RoutedErrorBoundary>
      <Switch>
        <Route path="/" component={Home} />
        <Route component={NotFound} />
      </Switch>
    </RoutedErrorBoundary>
  );
}

function RoutedErrorBoundary({ children }: { children: ReactNode }) {
  const [location] = useLocation();
  return <ErrorBoundary resetKey={location}>{children}</ErrorBoundary>;
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, '')}>
          <Router />
        </WouterRouter>
        <Toaster />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;