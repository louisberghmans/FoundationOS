import { FormEvent, ReactNode, useEffect, useMemo, useState } from 'react'
import {
  ArrowRight,
  BarChart3,
  CalendarDays,
  Check,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  CircleDollarSign,
  Clock3,
  FileText,
  Gauge,
  HandHeart,
  LayoutDashboard,
  ListChecks,
  MapPin,
  Menu,
  MessageSquareText,
  MoreHorizontal,
  Plus,
  RefreshCcw,
  Search,
  Settings2,
  ShieldCheck,
  Sparkles,
  Target,
  ThumbsUp,
  Users,
  Vote,
  X,
} from 'lucide-react'
import type { FoundationState, Objective, Page, Project, VoteChoice } from './domain'
import { STAGES } from './domain'
import { compactNumber, committedBudget, currency, nextStage, pipelineBudget, projectApproved, todayIso, voteProgress } from './lib'
import { createSeedState } from './seed'

const STORAGE_KEY = 'foundation-os-v1'

const navItems: { page: Page; label: string; icon: typeof LayoutDashboard }[] = [
  { page: 'overview', label: 'Overview', icon: LayoutDashboard },
  { page: 'strategy', label: 'Strategy', icon: Target },
  { page: 'projects', label: 'Projects', icon: BarChart3 },
  { page: 'decisions', label: 'Decisions', icon: Vote },
  { page: 'meetings', label: 'Meetings', icon: CalendarDays },
]

const pageMeta: Record<Page, { eyebrow: string; title: string; description: string }> = {
  overview: {
    eyebrow: 'Good morning, Louis',
    title: 'The family’s giving, in one view.',
    description: 'A clear line from shared purpose to funded outcomes.',
  },
  strategy: {
    eyebrow: 'Shared direction',
    title: 'Strategy & outcomes',
    description: 'Define what matters, how progress is measured, and where the family will focus.',
  },
  projects: {
    eyebrow: 'Grant workflow',
    title: 'Project portfolio',
    description: 'Move opportunities from first look to evidence-backed learning.',
  },
  decisions: {
    eyebrow: 'Family governance',
    title: 'Decisions',
    description: 'See what needs a vote and preserve the reasoning behind every commitment.',
  },
  meetings: {
    eyebrow: 'Time together',
    title: 'Meetings & agenda',
    description: 'Find the slot that works for everyone and arrive ready to decide.',
  },
}

function loadState(): FoundationState {
  try {
    const saved = localStorage.getItem(STORAGE_KEY)
    return saved ? (JSON.parse(saved) as FoundationState) : createSeedState()
  } catch {
    return createSeedState()
  }
}

export default function App() {
  const [state, setState] = useState<FoundationState>(loadState)
  const [page, setPage] = useState<Page>('overview')
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null)
  const [newProjectOpen, setNewProjectOpen] = useState(false)
  const [mobileNavOpen, setMobileNavOpen] = useState(false)
  const [toast, setToast] = useState<string | null>(null)

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state))
  }, [state])

  useEffect(() => {
    if (!toast) return
    const timeout = window.setTimeout(() => setToast(null), 2800)
    return () => window.clearTimeout(timeout)
  }, [toast])

  const selectedProject = state.projects.find((project) => project.id === selectedProjectId)
  const currentMember = state.members.find((member) => member.id === state.currentMemberId) ?? state.members[0]
  const meta = pageMeta[page]

  const goTo = (nextPage: Page) => {
    setPage(nextPage)
    setMobileNavOpen(false)
  }

  const updateProject = (projectId: string, update: Partial<Project>) => {
    setState((current) => ({
      ...current,
      projects: current.projects.map((project) =>
        project.id === projectId ? { ...project, ...update, updatedAt: 'Just now' } : project,
      ),
    }))
  }

  const castVote = (projectId: string, choice: VoteChoice) => {
    const project = state.projects.find((item) => item.id === projectId)
    if (!project) return
    const updatedVotes = { ...project.votes, [state.currentMemberId]: choice }
    const unanimous = state.members.every((member) => updatedVotes[member.id] === 'approve')
    updateProject(projectId, {
      votes: updatedVotes,
      nextAction: unanimous ? 'Assign grant agreement and payment date' : project.nextAction,
    })
    setToast(unanimous ? 'Unanimous approval recorded' : `${currentMember.name}’s vote was recorded`)
  }

  const advanceProject = (project: Project) => {
    const target = nextStage(project.stage)
    if (!target) return
    if (project.stage === 'decision' && !projectApproved(project, state.members.length)) {
      setToast('All five members must approve before funding')
      return
    }
    updateProject(project.id, { stage: target })
    setToast(`Moved to ${STAGES.find((stage) => stage.id === target)?.label}`)
  }

  const addProject = (project: Project) => {
    setState((current) => ({ ...current, projects: [project, ...current.projects] }))
    setNewProjectOpen(false)
    setSelectedProjectId(project.id)
    setToast('Opportunity added to intake')
  }

  const resetDemo = () => {
    setState(createSeedState())
    setSelectedProjectId(null)
    setToast('Demo workspace restored')
  }

  return (
    <div className="app-shell">
      <Sidebar
        state={state}
        page={page}
        open={mobileNavOpen}
        onNavigate={goTo}
        onClose={() => setMobileNavOpen(false)}
        onMemberChange={(memberId) => setState((current) => ({ ...current, currentMemberId: memberId }))}
        onReset={resetDemo}
      />
      <main className="main-content">
        <header className="topbar">
          <button className="icon-button mobile-menu" onClick={() => setMobileNavOpen(true)} aria-label="Open navigation">
            <Menu size={20} />
          </button>
          <div className="page-heading">
            <span className="eyebrow">{meta.eyebrow}</span>
            <h1>{meta.title}</h1>
            <p>{meta.description}</p>
          </div>
          <div className="topbar-actions">
            <button className="search-button" aria-label="Search">
              <Search size={17} />
              <span>Search</span>
              <kbd>⌘ K</kbd>
            </button>
            <button className="primary-button" onClick={() => setNewProjectOpen(true)}>
              <Plus size={17} />
              <span>New opportunity</span>
            </button>
          </div>
        </header>

        <div className="page-content">
          {page === 'overview' && (
            <OverviewPage state={state} onNavigate={goTo} onSelectProject={setSelectedProjectId} />
          )}
          {page === 'strategy' && <StrategyPage state={state} setState={setState} />}
          {page === 'projects' && (
            <ProjectsPage state={state} onSelectProject={setSelectedProjectId} onNew={() => setNewProjectOpen(true)} />
          )}
          {page === 'decisions' && (
            <DecisionsPage state={state} onSelectProject={setSelectedProjectId} onVote={castVote} />
          )}
          {page === 'meetings' && <MeetingsPage state={state} setState={setState} setToast={setToast} />}
        </div>
      </main>

      {selectedProject && (
        <ProjectDrawer
          project={selectedProject}
          state={state}
          onClose={() => setSelectedProjectId(null)}
          onAdvance={() => advanceProject(selectedProject)}
          onVote={(choice) => castVote(selectedProject.id, choice)}
          onUpdate={updateProject}
        />
      )}
      {newProjectOpen && (
        <NewProjectModal state={state} onClose={() => setNewProjectOpen(false)} onSubmit={addProject} />
      )}
      {toast && (
        <div className="toast" role="status">
          <CheckCircle2 size={18} /> {toast}
        </div>
      )}
    </div>
  )
}

function Sidebar({
  state,
  page,
  open,
  onNavigate,
  onClose,
  onMemberChange,
  onReset,
}: {
  state: FoundationState
  page: Page
  open: boolean
  onNavigate: (page: Page) => void
  onClose: () => void
  onMemberChange: (memberId: string) => void
  onReset: () => void
}) {
  const currentMember = state.members.find((member) => member.id === state.currentMemberId) ?? state.members[0]
  const decisions = state.projects.filter((project) => project.stage === 'decision' && project.votes[state.currentMemberId] === 'pending').length

  return (
    <>
      {open && <button className="nav-backdrop" onClick={onClose} aria-label="Close navigation" />}
      <aside className={`sidebar ${open ? 'open' : ''}`}>
        <div className="brand-row">
          <div className="brand-mark"><HandHeart size={20} strokeWidth={1.8} /></div>
          <div>
            <strong>Foundation OS</strong>
            <span>Family giving, aligned</span>
          </div>
          <button className="icon-button sidebar-close" onClick={onClose} aria-label="Close navigation"><X size={19} /></button>
        </div>

        <div className="workspace-switcher">
          <div className="workspace-monogram">BF</div>
          <div>
            <strong>Berghmans Family</strong>
            <span>{state.year} workspace</span>
          </div>
          <ChevronDown size={15} />
        </div>

        <nav className="main-nav" aria-label="Primary navigation">
          <span className="nav-label">Workspace</span>
          {navItems.map((item) => {
            const Icon = item.icon
            return (
              <button
                key={item.page}
                className={page === item.page ? 'active' : ''}
                onClick={() => onNavigate(item.page)}
              >
                <Icon size={18} strokeWidth={1.8} />
                <span>{item.label}</span>
                {item.page === 'decisions' && decisions > 0 && <em>{decisions}</em>}
              </button>
            )
          })}
        </nav>

        <div className="sidebar-note">
          <div className="note-icon"><Sparkles size={17} /></div>
          <strong>42% toward the north star</strong>
          <p>Your active water grants can reach another 18,000 people.</p>
          <button onClick={() => onNavigate('strategy')}>View outcomes <ArrowRight size={14} /></button>
        </div>

        <div className="sidebar-footer">
          <button className="member-switcher">
            <Avatar initials={currentMember.initials} color={currentMember.color} />
            <div>
              <strong>{currentMember.name}</strong>
              <span>Acting as member</span>
            </div>
            <select
              value={state.currentMemberId}
              onChange={(event) => onMemberChange(event.target.value)}
              aria-label="Act as family member"
            >
              {state.members.map((member) => <option value={member.id} key={member.id}>{member.name}</option>)}
            </select>
            <ChevronDown size={15} />
          </button>
          <button className="reset-button" onClick={onReset}><RefreshCcw size={14} /> Reset demo</button>
        </div>
      </aside>
    </>
  )
}

function OverviewPage({
  state,
  onNavigate,
  onSelectProject,
}: {
  state: FoundationState
  onNavigate: (page: Page) => void
  onSelectProject: (id: string) => void
}) {
  const committed = committedBudget(state)
  const pipeline = pipelineBudget(state)
  const activeProjects = state.projects.filter((project) => ['active', 'review'].includes(project.stage))
  const upcoming = [...state.projects]
    .filter((project) => project.nextAction !== 'Complete')
    .sort((a, b) => a.nextActionDate.localeCompare(b.nextActionDate))
    .slice(0, 4)
  const waterObjective = state.objectives[0]

  return (
    <div className="stack-xl">
      <section className="metric-grid">
        <MetricCard
          icon={<CircleDollarSign size={19} />}
          label={`${state.year} giving budget`}
          value={currency(state.annualBudget, state.currency)}
          note={`${currency(state.annualBudget - committed, state.currency)} still available`}
          tone="forest"
        />
        <MetricCard
          icon={<ShieldCheck size={19} />}
          label="Committed"
          value={currency(committed, state.currency)}
          note={`${Math.round((committed / state.annualBudget) * 100)}% of annual budget`}
          progress={(committed / state.annualBudget) * 100}
          tone="clay"
        />
        <MetricCard
          icon={<Gauge size={19} />}
          label="Opportunity pipeline"
          value={currency(pipeline, state.currency)}
          note={`${state.projects.filter((project) => ['intake', 'due-diligence', 'decision'].includes(project.stage)).length} opportunities in review`}
          tone="violet"
        />
        <MetricCard
          icon={<Target size={19} />}
          label="North-star progress"
          value={`${Math.round((waterObjective.current / waterObjective.target) * 100)}%`}
          note={`${compactNumber(waterObjective.current)} of ${compactNumber(waterObjective.target)} people`}
          progress={(waterObjective.current / waterObjective.target) * 100}
          tone="blue"
        />
      </section>

      <section className="overview-grid">
        <div className="panel portfolio-panel">
          <PanelHeader
            eyebrow="Portfolio"
            title="Active commitments"
            action={<button className="text-button" onClick={() => onNavigate('projects')}>View board <ArrowRight size={14} /></button>}
          />
          <div className="portfolio-list">
            {activeProjects.map((project) => {
              const objective = state.objectives.find((item) => item.id === project.objectiveId)
              const steward = state.members.find((member) => member.id === project.stewardId)
              return (
                <button className="portfolio-row" key={project.id} onClick={() => onSelectProject(project.id)}>
                  <div className={`project-sigil evidence-${project.evidence.toLowerCase()}`}>
                    {project.organization.slice(0, 1)}
                  </div>
                  <div className="portfolio-name">
                    <strong>{project.name}</strong>
                    <span>{project.organization} · {project.country}</span>
                  </div>
                  <div className="objective-link">
                    <span>Contributes to</span>
                    <strong>{objective?.title}</strong>
                  </div>
                  <div className="portfolio-amount">
                    <strong>{currency(project.amount, state.currency)}</strong>
                    <span>{compactNumber(project.contribution)} {project.contributionUnit}</span>
                  </div>
                  {steward && <Avatar initials={steward.initials} color={steward.color} size="small" />}
                  <ChevronRight size={16} />
                </button>
              )
            })}
          </div>
        </div>

        <div className="panel action-panel">
          <PanelHeader eyebrow="Your focus" title="Next actions" />
          <div className="action-list">
            {upcoming.map((project) => (
              <button key={project.id} onClick={() => onSelectProject(project.id)}>
                <span className="action-date">{new Date(`${project.nextActionDate}T12:00:00`).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' })}</span>
                <div>
                  <strong>{project.nextAction}</strong>
                  <span>{project.name}</span>
                </div>
                <ChevronRight size={15} />
              </button>
            ))}
          </div>
        </div>
      </section>

      <section className="panel outcome-panel">
        <PanelHeader
          eyebrow="Impact thesis"
          title="Progress toward shared outcomes"
          action={<button className="text-button" onClick={() => onNavigate('strategy')}>Open strategy <ArrowRight size={14} /></button>}
        />
        <div className="outcome-grid">
          {state.objectives.map((objective) => {
            const progress = Math.min(100, (objective.current / objective.target) * 100)
            const committedProjects = state.projects.filter((project) => project.objectiveId === objective.id && ['active', 'review', 'complete'].includes(project.stage))
            return (
              <article className="outcome-card" key={objective.id}>
                <div className="outcome-topline"><Target size={17} /><span>By {objective.deadline}</span></div>
                <h3>{objective.title}</h3>
                <p>{objective.scope}</p>
                <div className="progress-line"><span style={{ width: `${progress}%` }} /></div>
                <div className="outcome-stats">
                  <strong>{compactNumber(objective.current)} <small>/ {compactNumber(objective.target)}</small></strong>
                  <span>{Math.round(progress)}% · {committedProjects.length} grants</span>
                </div>
              </article>
            )
          })}
        </div>
      </section>
    </div>
  )
}

function StrategyPage({ state, setState }: { state: FoundationState; setState: React.Dispatch<React.SetStateAction<FoundationState>> }) {
  const [editing, setEditing] = useState(false)
  const [addingObjective, setAddingObjective] = useState(false)

  return (
    <div className="stack-xl">
      <section className="strategy-hero">
        <div className="strategy-copy">
          <span className="section-kicker"><Sparkles size={15} /> Our north star</span>
          <blockquote>“{state.mission}”</blockquote>
          <div className="scope-pills">
            <span><MapPin size={14} /> {state.geography}</span>
            {state.focusAreas.map((area) => <span key={area}>{area}</span>)}
          </div>
        </div>
        <div className="strategy-budget">
          <span>Annual allocation · {state.year}</span>
          <strong>{currency(state.annualBudget, state.currency)}</strong>
          <small>{state.decisionRule} decisions · {state.members.length} members</small>
          <button className="secondary-button" onClick={() => setEditing(true)}><Settings2 size={15} /> Edit foundation brief</button>
        </div>
      </section>

      <section>
        <div className="section-heading-row">
          <div>
            <span className="eyebrow">Theory of change</span>
            <h2>Measurable objectives</h2>
            <p>Each objective connects a long-term outcome to a metric, target, place, and time horizon.</p>
          </div>
          <button className="secondary-button" onClick={() => setAddingObjective(true)}><Plus size={16} /> Add objective</button>
        </div>
        <div className="objective-list">
          {state.objectives.map((objective, index) => {
            const projects = state.projects.filter((project) => project.objectiveId === objective.id)
            const progress = Math.min(100, (objective.current / objective.target) * 100)
            return (
              <article className="objective-detail" key={objective.id}>
                <div className="objective-index">0{index + 1}</div>
                <div className="objective-main">
                  <span className="objective-deadline">Outcome by {objective.deadline}</span>
                  <h3>{objective.title}</h3>
                  <p>{objective.thesis}</p>
                  <div className="objective-meta">
                    <span><Target size={14} /> {objective.metric}</span>
                    <span><MapPin size={14} /> {objective.scope}</span>
                  </div>
                </div>
                <div className="objective-progress">
                  <div className="ring" style={{ '--progress': `${progress * 3.6}deg` } as React.CSSProperties}>
                    <div><strong>{Math.round(progress)}%</strong><span>achieved</span></div>
                  </div>
                  <strong>{compactNumber(objective.current)} of {compactNumber(objective.target)}</strong>
                  <span>{projects.length} linked opportunities</span>
                </div>
              </article>
            )
          })}
        </div>
      </section>

      <section className="framework-strip">
        <div>
          <span className="section-kicker"><ListChecks size={15} /> Review framework</span>
          <h3>Judge each grant through six complementary lenses.</h3>
          <p>Adapted from the OECD DAC evaluation criteria, with evidence and cost-effectiveness captured during diligence.</p>
        </div>
        <div className="lens-list">
          {['Relevance', 'Coherence', 'Effectiveness', 'Efficiency', 'Impact', 'Sustainability'].map((lens, index) => (
            <span key={lens}><em>0{index + 1}</em>{lens}</span>
          ))}
        </div>
      </section>

      {editing && <StrategyModal state={state} onClose={() => setEditing(false)} onSave={(updates) => { setState((current) => ({ ...current, ...updates })); setEditing(false) }} />}
      {addingObjective && <ObjectiveModal onClose={() => setAddingObjective(false)} onSave={(objective) => { setState((current) => ({ ...current, objectives: [...current.objectives, objective] })); setAddingObjective(false) }} />}
    </div>
  )
}

function ProjectsPage({ state, onSelectProject, onNew }: { state: FoundationState; onSelectProject: (id: string) => void; onNew: () => void }) {
  const [filter, setFilter] = useState('all')
  const visibleStages = STAGES.filter((stage) => stage.id !== 'complete')

  return (
    <div className="stack-lg">
      <div className="board-toolbar">
        <div className="filter-tabs">
          {['all', ...state.objectives.map((objective) => objective.id)].map((id) => (
            <button key={id} className={filter === id ? 'active' : ''} onClick={() => setFilter(id)}>
              {id === 'all' ? 'All projects' : state.objectives.find((objective) => objective.id === id)?.title.split(' ').slice(0, 3).join(' ')}
            </button>
          ))}
        </div>
        <div className="board-summary">
          <strong>{currency(pipelineBudget(state), state.currency)}</strong>
          <span>in pipeline</span>
        </div>
      </div>

      <div className="kanban-scroll">
        <div className="kanban-board">
          {visibleStages.map((stage) => {
            const projects = state.projects.filter((project) => project.stage === stage.id && (filter === 'all' || project.objectiveId === filter))
            const total = projects.reduce((sum, project) => sum + project.amount, 0)
            return (
              <section className={`kanban-column stage-${stage.id}`} key={stage.id}>
                <header>
                  <div><span className="stage-dot" /><strong>{stage.label}</strong><em>{projects.length}</em></div>
                  <button aria-label={`More options for ${stage.label}`}><MoreHorizontal size={17} /></button>
                </header>
                <div className="column-total">{currency(total, state.currency)}</div>
                <div className="kanban-cards">
                  {projects.map((project) => (
                    <ProjectCard project={project} state={state} onClick={() => onSelectProject(project.id)} key={project.id} />
                  ))}
                  {projects.length === 0 && <div className="empty-column">No projects here</div>}
                  {stage.id === 'intake' && <button className="add-card-button" onClick={onNew}><Plus size={15} /> Add opportunity</button>}
                </div>
              </section>
            )
          })}
        </div>
      </div>
      <p className="board-footnote"><CheckCircle2 size={15} /> Completed projects are preserved in the portfolio history and still count toward outcomes.</p>
    </div>
  )
}

function ProjectCard({ project, state, onClick }: { project: Project; state: FoundationState; onClick: () => void }) {
  const objective = state.objectives.find((item) => item.id === project.objectiveId)
  const steward = state.members.find((member) => member.id === project.stewardId)
  const approvals = voteProgress(project)

  return (
    <button className="project-card" onClick={onClick}>
      <div className="card-topline">
        <span className={`evidence-pill evidence-${project.evidence.toLowerCase()}`}>{project.evidence} evidence</span>
        <MoreHorizontal size={16} />
      </div>
      <h3>{project.name}</h3>
      <p className="organization">{project.organization}</p>
      <span className="project-location"><MapPin size={13} />{project.country}</span>
      <div className="card-objective">
        <Target size={14} />
        <span>{objective?.title}</span>
      </div>
      <div className="card-impact">
        <div><span>Request</span><strong>{currency(project.amount, state.currency)}</strong></div>
        <div><span>Est. contribution</span><strong>{compactNumber(project.contribution)} {project.contributionUnit}</strong></div>
      </div>
      <div className="card-footer">
        {steward && <Avatar initials={steward.initials} color={steward.color} size="small" />}
        <span>{project.updatedAt}</span>
        {project.stage === 'decision' ? <strong className="vote-count"><Vote size={13} /> {approvals}/{state.members.length}</strong> : <strong><FileText size={13} /> {project.documents}</strong>}
      </div>
    </button>
  )
}

function DecisionsPage({ state, onSelectProject, onVote }: { state: FoundationState; onSelectProject: (id: string) => void; onVote: (id: string, choice: VoteChoice) => void }) {
  const decisions = state.projects.filter((project) => project.stage === 'decision')
  const approved = state.projects.filter((project) => projectApproved(project, state.members.length) && project.stage !== 'decision').slice(0, 3)
  const currentMember = state.members.find((member) => member.id === state.currentMemberId)!

  return (
    <div className="decision-layout">
      <div className="stack-lg">
        <section className="governance-banner">
          <div className="governance-icon"><ShieldCheck size={22} /></div>
          <div><strong>Unanimous by design</strong><p>A grant moves forward only after all {state.members.length} members approve. Every decision retains its votes, evidence, and steward.</p></div>
          <div className="family-avatars">{state.members.map((member) => <Avatar key={member.id} initials={member.initials} color={member.color} size="small" />)}</div>
        </section>

        <div className="section-heading-row compact"><div><span className="eyebrow">Open now</span><h2>Awaiting decision</h2></div><span className="count-badge">{decisions.length}</span></div>
        {decisions.length === 0 ? (
          <div className="empty-state"><CheckCircle2 size={30} /><h3>You’re all caught up</h3><p>No grants are waiting for a vote.</p></div>
        ) : decisions.map((project) => {
          const objective = state.objectives.find((item) => item.id === project.objectiveId)
          const ownVote = project.votes[state.currentMemberId]
          return (
            <article className="decision-card" key={project.id}>
              <div className="decision-main">
                <div className="decision-heading">
                  <div className={`project-sigil evidence-${project.evidence.toLowerCase()}`}>{project.organization.slice(0, 1)}</div>
                  <div><span>{project.organization} · {project.country}</span><h3>{project.name}</h3></div>
                  <strong>{currency(project.amount, state.currency)}</strong>
                </div>
                <p>{project.summary}</p>
                <div className="decision-facts">
                  <span><Target size={14} /> {compactNumber(project.contribution)} {project.contributionUnit} toward “{objective?.title}”</span>
                  <span><ShieldCheck size={14} /> {project.evidence} evidence · {project.risk} risk</span>
                </div>
                <div className="vote-row">
                  {state.members.map((member) => {
                    const choice = project.votes[member.id]
                    return (
                      <div key={member.id} className={`member-vote vote-${choice}`}>
                        <Avatar initials={member.initials} color={member.color} size="small" />
                        <span>{member.name}</span>
                        {choice === 'approve' ? <Check size={14} /> : choice === 'block' ? <X size={14} /> : <Clock3 size={14} />}
                      </div>
                    )
                  })}
                </div>
              </div>
              <div className="decision-actions">
                <span>Your vote as {currentMember.name}</span>
                <button className={`approve-button ${ownVote === 'approve' ? 'selected' : ''}`} onClick={() => onVote(project.id, 'approve')}><ThumbsUp size={16} /> Approve</button>
                <button className={`block-button ${ownVote === 'block' ? 'selected' : ''}`} onClick={() => onVote(project.id, 'block')}><MessageSquareText size={16} /> Raise concern</button>
                <button className="text-button" onClick={() => onSelectProject(project.id)}>Open full brief <ArrowRight size={14} /></button>
              </div>
            </article>
          )
        })}
      </div>

      <aside className="decision-history panel">
        <PanelHeader eyebrow="Decision log" title="Recently approved" />
        {approved.map((project) => {
          const steward = state.members.find((member) => member.id === project.stewardId)
          return (
            <button key={project.id} onClick={() => onSelectProject(project.id)}>
              <span className="history-check"><Check size={14} /></span>
              <div><strong>{project.name}</strong><span>{currency(project.amount, state.currency)} · {steward?.name} follows up</span></div>
              <ChevronRight size={15} />
            </button>
          )
        })}
        <div className="decision-rule">
          <span>Decision rule</span><strong>{state.decisionRule}</strong>
          <p>One accountable steward is assigned after approval; the full family retains visibility.</p>
        </div>
      </aside>
    </div>
  )
}

function MeetingsPage({ state, setState, setToast }: { state: FoundationState; setState: React.Dispatch<React.SetStateAction<FoundationState>>; setToast: (message: string) => void }) {
  const meeting = state.meetings[0]
  const [agendaTitle, setAgendaTitle] = useState('')
  const bestSlot = useMemo(() => [...meeting.slots].sort((a, b) => b.availableMemberIds.length - a.availableMemberIds.length)[0], [meeting.slots])

  const toggleAvailability = (slotId: string) => {
    setState((current) => ({
      ...current,
      meetings: current.meetings.map((item) => item.id !== meeting.id ? item : {
        ...item,
        slots: item.slots.map((slot) => slot.id !== slotId ? slot : {
          ...slot,
          availableMemberIds: slot.availableMemberIds.includes(current.currentMemberId)
            ? slot.availableMemberIds.filter((id) => id !== current.currentMemberId)
            : [...slot.availableMemberIds, current.currentMemberId],
        }),
      }),
    }))
  }

  const confirmBestSlot = () => {
    setState((current) => ({ ...current, meetings: current.meetings.map((item) => item.id === meeting.id ? { ...item, status: 'scheduled', scheduledSlotId: bestSlot.id } : item) }))
    setToast('Meeting scheduled for everyone')
  }

  const addAgenda = (event: FormEvent) => {
    event.preventDefault()
    if (!agendaTitle.trim()) return
    setState((current) => ({
      ...current,
      meetings: current.meetings.map((item) => item.id === meeting.id ? {
        ...item,
        agenda: [...item.agenda, { id: crypto.randomUUID(), title: agendaTitle.trim(), proposerId: current.currentMemberId, duration: 10, type: 'Discussion' }],
      } : item),
    }))
    setAgendaTitle('')
    setToast('Agenda item added')
  }

  return (
    <div className="meeting-layout">
      <section className="panel availability-panel">
        <PanelHeader eyebrow={meeting.status === 'scheduled' ? 'Scheduled' : 'Scheduling poll'} title={meeting.title} action={<span className={`status-chip ${meeting.status}`}>{meeting.status}</span>} />
        <p className="panel-intro">Select every slot you can attend. The best option updates automatically as family members respond.</p>
        <div className="availability-table">
          <div className="availability-head"><span>Proposed time</span>{state.members.map((member) => <div key={member.id}><Avatar initials={member.initials} color={member.color} size="small" /><small>{member.name}</small></div>)}</div>
          {meeting.slots.map((slot) => {
            const allAvailable = slot.availableMemberIds.length === state.members.length
            const isScheduled = meeting.scheduledSlotId === slot.id
            return (
              <div className={`availability-row ${allAvailable ? 'best' : ''} ${isScheduled ? 'scheduled' : ''}`} key={slot.id}>
                <div><strong>{slot.label}</strong><span>{slot.detail}</span>{allAvailable && <em>Everyone can make it</em>}</div>
                {state.members.map((member) => {
                  const available = slot.availableMemberIds.includes(member.id)
                  const isCurrent = member.id === state.currentMemberId
                  return (
                    <button key={member.id} className={available ? 'available' : ''} disabled={!isCurrent || meeting.status === 'scheduled'} onClick={() => toggleAvailability(slot.id)} aria-label={`${member.name} availability for ${slot.label}`}>
                      {available ? <Check size={16} /> : <X size={15} />}
                    </button>
                  )
                })}
              </div>
            )
          })}
        </div>
        {meeting.status === 'polling' ? (
          <div className="best-slot-bar"><div><CheckCircle2 size={20} /><span><strong>Best fit: {bestSlot.label}</strong>{bestSlot.detail} · {bestSlot.availableMemberIds.length}/{state.members.length} available</span></div><button className="primary-button" onClick={confirmBestSlot}>Confirm meeting</button></div>
        ) : (
          <div className="best-slot-bar confirmed"><div><CalendarDays size={20} /><span><strong>{bestSlot.label} is confirmed</strong>{bestSlot.detail}</span></div><span>Calendar invitation ready</span></div>
        )}
      </section>

      <aside className="panel agenda-panel">
        <PanelHeader eyebrow="Collaborative agenda" title="What we’ll cover" />
        <div className="agenda-list">
          {meeting.agenda.map((item, index) => {
            const proposer = state.members.find((member) => member.id === item.proposerId)
            return (
              <div className="agenda-item" key={item.id}>
                <span className="agenda-number">{index + 1}</span>
                <div><strong>{item.title}</strong><span><em className={`agenda-type ${item.type.toLowerCase()}`}>{item.type}</em>{item.duration} min · proposed by {proposer?.name}</span></div>
                <MoreHorizontal size={16} />
              </div>
            )
          })}
        </div>
        <form className="agenda-form" onSubmit={addAgenda}>
          <input value={agendaTitle} onChange={(event) => setAgendaTitle(event.target.value)} placeholder="Propose an agenda item…" />
          <button type="submit" aria-label="Add agenda item"><Plus size={17} /></button>
        </form>
        <div className="agenda-total"><Clock3 size={15} /><span>Total planned time</span><strong>{meeting.agenda.reduce((sum, item) => sum + item.duration, 0)} min</strong></div>
      </aside>
    </div>
  )
}

function ProjectDrawer({ project, state, onClose, onAdvance, onVote, onUpdate }: { project: Project; state: FoundationState; onClose: () => void; onAdvance: () => void; onVote: (choice: VoteChoice) => void; onUpdate: (id: string, update: Partial<Project>) => void }) {
  const objective = state.objectives.find((item) => item.id === project.objectiveId)
  const steward = state.members.find((member) => member.id === project.stewardId)
  const stageIndex = STAGES.findIndex((stage) => stage.id === project.stage)
  const target = nextStage(project.stage)

  return (
    <div className="drawer-layer">
      <button className="drawer-backdrop" onClick={onClose} aria-label="Close project details" />
      <aside className="project-drawer" role="dialog" aria-modal="true" aria-label={`${project.name} details`}>
        <header className="drawer-header">
          <div className={`project-sigil large evidence-${project.evidence.toLowerCase()}`}>{project.organization.slice(0, 1)}</div>
          <div><span>{project.organization}</span><h2>{project.name}</h2></div>
          <button className="icon-button" onClick={onClose} aria-label="Close"><X size={20} /></button>
        </header>
        <div className="stage-track">
          {STAGES.map((stage, index) => <div key={stage.id} className={`${index <= stageIndex ? 'done' : ''} ${index === stageIndex ? 'current' : ''}`}><span>{index < stageIndex ? <Check size={12} /> : index + 1}</span><small>{stage.shortLabel}</small></div>)}
        </div>
        <div className="drawer-body">
          <div className="drawer-summary"><p>{project.summary}</p><span><MapPin size={14} /> {project.country}</span></div>
          <div className="drawer-facts">
            <div><span>Grant request</span><strong>{currency(project.amount, state.currency)}</strong></div>
            <div><span>Contribution</span><strong>{compactNumber(project.contribution)} {project.contributionUnit}</strong></div>
            <div><span>Evidence</span><strong>{project.evidence}</strong></div>
            <div><span>Risk</span><strong>{project.risk}</strong></div>
          </div>
          <section className="drawer-section">
            <div className="drawer-section-title"><span><Target size={16} /> Objective fit</span><em>{objective ? Math.round((project.contribution / objective.target) * 100) : 0}% of target</em></div>
            <strong>{objective?.title}</strong>
            <p>{objective?.thesis}</p>
          </section>
          <section className="drawer-section">
            <div className="drawer-section-title"><span><ShieldCheck size={16} /> Decision record</span><em>{voteProgress(project)}/{state.members.length} approved</em></div>
            <div className="drawer-votes">{state.members.map((member) => <div key={member.id}><Avatar initials={member.initials} color={member.color} size="small" /><span>{member.name}</span><strong className={`vote-${project.votes[member.id]}`}>{project.votes[member.id]}</strong></div>)}</div>
            {project.stage === 'decision' && <div className="drawer-vote-buttons"><button className="approve-button" onClick={() => onVote('approve')}><ThumbsUp size={15} /> Approve as current member</button><button className="block-button" onClick={() => onVote('block')}><MessageSquareText size={15} /> Raise concern</button></div>}
          </section>
          <section className="drawer-section steward-section">
            <div className="drawer-section-title"><span><Users size={16} /> Accountable steward</span></div>
            <div className="steward-picker">
              {steward && <Avatar initials={steward.initials} color={steward.color} />}
              <div><strong>{steward?.name}</strong><span>Owns follow-up; everyone retains visibility</span></div>
              <select value={project.stewardId} onChange={(event) => onUpdate(project.id, { stewardId: event.target.value })} aria-label="Project steward">
                {state.members.map((member) => <option key={member.id} value={member.id}>{member.name}</option>)}
              </select>
              <ChevronDown size={15} />
            </div>
          </section>
          <section className="drawer-section next-action-section">
            <div className="drawer-section-title"><span><ListChecks size={16} /> Next action</span></div>
            <strong>{project.nextAction}</strong><span>Due {new Date(`${project.nextActionDate}T12:00:00`).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })}</span>
          </section>
        </div>
        <footer className="drawer-footer">
          <span><FileText size={15} /> {project.documents} documents</span>
          {target && <button className="primary-button" onClick={onAdvance}>Move to {STAGES.find((stage) => stage.id === target)?.label}<ArrowRight size={15} /></button>}
        </footer>
      </aside>
    </div>
  )
}

function NewProjectModal({ state, onClose, onSubmit }: { state: FoundationState; onClose: () => void; onSubmit: (project: Project) => void }) {
  const [form, setForm] = useState({ name: '', organization: '', country: '', amount: '', objectiveId: state.objectives[0]?.id ?? '', contribution: '', summary: '' })
  const submit = (event: FormEvent) => {
    event.preventDefault()
    const blankVotes = Object.fromEntries(state.members.map((member) => [member.id, 'pending'])) as Record<string, VoteChoice>
    onSubmit({
      id: crypto.randomUUID(), name: form.name, organization: form.organization, country: form.country,
      amount: Number(form.amount), objectiveId: form.objectiveId, contribution: Number(form.contribution),
      contributionUnit: state.objectives.find((objective) => objective.id === form.objectiveId)?.unit ?? 'people',
      summary: form.summary, stage: 'intake', evidence: 'Early', fundingGap: 'Unclear', risk: 'Medium',
      stewardId: state.currentMemberId, votes: blankVotes, nextAction: 'Complete initial screening', nextActionDate: todayIso(), updatedAt: 'Just now', documents: 0,
    })
  }
  return (
    <Modal title="Add an opportunity" eyebrow="Project intake" onClose={onClose}>
      <form className="modal-form" onSubmit={submit}>
        <div className="field-row"><Field label="Project name"><input required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="e.g. Rural water systems" /></Field><Field label="Organization"><input required value={form.organization} onChange={(e) => setForm({ ...form, organization: e.target.value })} placeholder="Organization name" /></Field></div>
        <Field label="Short summary"><textarea required value={form.summary} onChange={(e) => setForm({ ...form, summary: e.target.value })} placeholder="What would this grant fund, and why might it matter?" /></Field>
        <div className="field-row"><Field label="Country or region"><input required value={form.country} onChange={(e) => setForm({ ...form, country: e.target.value })} placeholder="DR Congo" /></Field><Field label={`Request (${state.currency})`}><input required type="number" min="1" value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} placeholder="25000" /></Field></div>
        <Field label="Linked objective"><select value={form.objectiveId} onChange={(e) => setForm({ ...form, objectiveId: e.target.value })}>{state.objectives.map((objective) => <option key={objective.id} value={objective.id}>{objective.title}</option>)}</select></Field>
        <Field label="Estimated contribution"><input required type="number" min="0" value={form.contribution} onChange={(e) => setForm({ ...form, contribution: e.target.value })} placeholder="Number reached" /></Field>
        <div className="form-actions"><button type="button" className="secondary-button" onClick={onClose}>Cancel</button><button className="primary-button" type="submit">Add to intake <ArrowRight size={15} /></button></div>
      </form>
    </Modal>
  )
}

function StrategyModal({ state, onClose, onSave }: { state: FoundationState; onClose: () => void; onSave: (update: Partial<FoundationState>) => void }) {
  const [mission, setMission] = useState(state.mission)
  const [budget, setBudget] = useState(String(state.annualBudget))
  const [geography, setGeography] = useState(state.geography)
  return <Modal eyebrow="Foundation brief" title="Edit shared direction" onClose={onClose}><form className="modal-form" onSubmit={(e) => { e.preventDefault(); onSave({ mission, annualBudget: Number(budget), geography }) }}><Field label="Mission"><textarea value={mission} onChange={(e) => setMission(e.target.value)} required /></Field><div className="field-row"><Field label={`Annual budget (${state.currency})`}><input type="number" value={budget} onChange={(e) => setBudget(e.target.value)} required /></Field><Field label="Geographic scope"><input value={geography} onChange={(e) => setGeography(e.target.value)} required /></Field></div><div className="form-actions"><button type="button" className="secondary-button" onClick={onClose}>Cancel</button><button className="primary-button">Save brief</button></div></form></Modal>
}

function ObjectiveModal({ onClose, onSave }: { onClose: () => void; onSave: (objective: Objective) => void }) {
  const [form, setForm] = useState({ title: '', thesis: '', metric: '', unit: 'people', target: '', deadline: '2030', scope: '' })
  return <Modal eyebrow="Theory of change" title="Add a measurable objective" onClose={onClose}><form className="modal-form" onSubmit={(e) => { e.preventDefault(); onSave({ id: crypto.randomUUID(), ...form, target: Number(form.target), current: 0 }) }}><Field label="Outcome statement"><input required value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="A measurable change for people or communities" /></Field><Field label="Why this should work"><textarea required value={form.thesis} onChange={(e) => setForm({ ...form, thesis: e.target.value })} placeholder="Describe the causal logic and key assumption" /></Field><div className="field-row"><Field label="Metric"><input required value={form.metric} onChange={(e) => setForm({ ...form, metric: e.target.value })} /></Field><Field label="Unit"><input required value={form.unit} onChange={(e) => setForm({ ...form, unit: e.target.value })} /></Field></div><div className="field-row"><Field label="Target"><input required type="number" value={form.target} onChange={(e) => setForm({ ...form, target: e.target.value })} /></Field><Field label="Deadline"><input required value={form.deadline} onChange={(e) => setForm({ ...form, deadline: e.target.value })} /></Field></div><Field label="Scope"><input required value={form.scope} onChange={(e) => setForm({ ...form, scope: e.target.value })} placeholder="Geography or population" /></Field><div className="form-actions"><button type="button" className="secondary-button" onClick={onClose}>Cancel</button><button className="primary-button">Add objective</button></div></form></Modal>
}

function Modal({ eyebrow, title, onClose, children }: { eyebrow: string; title: string; onClose: () => void; children: ReactNode }) {
  return <div className="modal-layer"><button className="modal-backdrop" onClick={onClose} aria-label="Close dialog" /><div className="modal" role="dialog" aria-modal="true" aria-label={title}><header><div><span className="eyebrow">{eyebrow}</span><h2>{title}</h2></div><button className="icon-button" onClick={onClose} aria-label="Close"><X size={20} /></button></header>{children}</div></div>
}

function Field({ label, children }: { label: string; children: ReactNode }) { return <label className="field"><span>{label}</span>{children}</label> }

function MetricCard({ icon, label, value, note, progress, tone }: { icon: ReactNode; label: string; value: string; note: string; progress?: number; tone: string }) {
  return <article className={`metric-card tone-${tone}`}><div className="metric-icon">{icon}</div><span>{label}</span><strong>{value}</strong>{progress !== undefined && <div className="mini-progress"><i style={{ width: `${Math.min(100, progress)}%` }} /></div>}<small>{note}</small></article>
}

function PanelHeader({ eyebrow, title, action }: { eyebrow: string; title: string; action?: ReactNode }) { return <header className="panel-header"><div><span className="eyebrow">{eyebrow}</span><h2>{title}</h2></div>{action}</header> }

function Avatar({ initials, color, size = 'normal' }: { initials: string; color: string; size?: 'normal' | 'small' }) { return <span className={`avatar avatar-${size}`} style={{ backgroundColor: color }}>{initials}</span> }
