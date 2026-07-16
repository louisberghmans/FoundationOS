export type Page = 'overview' | 'strategy' | 'projects' | 'decisions' | 'meetings'

export type ProjectStage =
  | 'intake'
  | 'due-diligence'
  | 'decision'
  | 'active'
  | 'review'
  | 'complete'

export type VoteChoice = 'approve' | 'block' | 'pending'

export interface Member {
  id: string
  name: string
  initials: string
  color: string
}

export interface Objective {
  id: string
  title: string
  thesis: string
  metric: string
  unit: string
  target: number
  current: number
  deadline: string
  scope: string
}

export interface Project {
  id: string
  name: string
  organization: string
  summary: string
  country: string
  stage: ProjectStage
  amount: number
  objectiveId: string
  contribution: number
  contributionUnit: string
  evidence: 'Strong' | 'Promising' | 'Early'
  fundingGap: 'Confirmed' | 'Likely' | 'Unclear'
  risk: 'Low' | 'Medium' | 'High'
  stewardId: string
  votes: Record<string, VoteChoice>
  nextAction: string
  nextActionDate: string
  updatedAt: string
  documents: number
}

export interface MeetingSlot {
  id: string
  label: string
  detail: string
  availableMemberIds: string[]
}

export interface AgendaItem {
  id: string
  title: string
  proposerId: string
  duration: number
  type: 'Decision' | 'Discussion' | 'Update'
}

export interface Meeting {
  id: string
  title: string
  status: 'polling' | 'scheduled'
  scheduledSlotId?: string
  slots: MeetingSlot[]
  agenda: AgendaItem[]
}

export interface FoundationState {
  familyName: string
  mission: string
  annualBudget: number
  currency: 'EUR' | 'USD' | 'GBP'
  year: number
  geography: string
  focusAreas: string[]
  decisionRule: 'Unanimous'
  members: Member[]
  currentMemberId: string
  objectives: Objective[]
  projects: Project[]
  meetings: Meeting[]
}

export const STAGES: { id: ProjectStage; label: string; shortLabel: string }[] = [
  { id: 'intake', label: 'Intake', shortLabel: 'Intake' },
  { id: 'due-diligence', label: 'Due diligence', shortLabel: 'Diligence' },
  { id: 'decision', label: 'Decision', shortLabel: 'Decision' },
  { id: 'active', label: 'Active grant', shortLabel: 'Active' },
  { id: 'review', label: 'Review', shortLabel: 'Review' },
  { id: 'complete', label: 'Complete', shortLabel: 'Complete' },
]
