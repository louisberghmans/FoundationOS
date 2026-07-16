import type { FoundationState, Project, ProjectStage } from './domain'

export const currency = (value: number, code = 'EUR') =>
  new Intl.NumberFormat('en-GB', {
    style: 'currency',
    currency: code,
    maximumFractionDigits: 0,
  }).format(value)

export const compactNumber = (value: number) =>
  new Intl.NumberFormat('en-GB', { notation: 'compact', maximumFractionDigits: 1 }).format(value)

export const projectApproved = (project: Project, memberCount: number) => {
  const choices = Object.values(project.votes)
  return choices.length === memberCount && choices.every((choice) => choice === 'approve')
}

export const voteProgress = (project: Project) =>
  Object.values(project.votes).filter((choice) => choice === 'approve').length

export const committedBudget = (state: FoundationState) =>
  state.projects
    .filter((project) => ['active', 'review', 'complete'].includes(project.stage))
    .reduce((total, project) => total + project.amount, 0)

export const pipelineBudget = (state: FoundationState) =>
  state.projects
    .filter((project) => ['intake', 'due-diligence', 'decision'].includes(project.stage))
    .reduce((total, project) => total + project.amount, 0)

export const nextStage = (stage: ProjectStage): ProjectStage | undefined => {
  const order: ProjectStage[] = ['intake', 'due-diligence', 'decision', 'active', 'review', 'complete']
  return order[order.indexOf(stage) + 1]
}

export const todayIso = () => new Date().toISOString().slice(0, 10)
