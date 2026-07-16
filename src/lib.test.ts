import { describe, expect, it } from 'vitest'
import { committedBudget, nextStage, pipelineBudget, projectApproved, voteProgress } from './lib'
import { createSeedState } from './seed'

describe('foundation domain calculations', () => {
  it('separates committed and pipeline budgets', () => {
    const state = createSeedState()

    expect(committedBudget(state)).toBe(114000)
    expect(pipelineBudget(state)).toBe(112000)
  })

  it('requires every member to approve a grant', () => {
    const state = createSeedState()
    const approved = state.projects.find((project) => project.id === 'project-1')!
    const awaiting = state.projects.find((project) => project.id === 'project-2')!

    expect(projectApproved(approved, state.members.length)).toBe(true)
    expect(projectApproved(awaiting, state.members.length)).toBe(false)
    expect(voteProgress(awaiting)).toBe(4)
  })

  it('advances through the grant workflow in order', () => {
    expect(nextStage('intake')).toBe('due-diligence')
    expect(nextStage('decision')).toBe('active')
    expect(nextStage('complete')).toBeUndefined()
  })
})
