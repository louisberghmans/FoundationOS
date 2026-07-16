import { HttpError } from './core.mjs'

export const ROLE_CAPABILITIES = {
  administrator: ['*'],
  foundation_manager: [
    'foundation.read', 'strategy.manage', 'member.read', 'organization.manage', 'opportunity.manage',
    'decision.manage', 'decision.respond', 'grant.manage', 'opportunity.review', 'document.manage', 'meeting.manage', 'audit.read',
  ],
  voting_member: ['foundation.read', 'strategy.read', 'member.read', 'organization.read', 'opportunity.read', 'decision.read', 'decision.respond', 'grant.read', 'document.read', 'meeting.manage'],
  finance_manager: ['foundation.read', 'strategy.read', 'member.read', 'organization.read', 'opportunity.read', 'decision.read', 'grant.read', 'grant.manage', 'finance.manage', 'document.read', 'audit.read'],
  project_steward: ['foundation.read', 'strategy.read', 'member.read', 'organization.read', 'opportunity.read', 'opportunity.update_assigned', 'decision.read', 'grant.read', 'grant.update_assigned', 'document.manage_assigned', 'meeting.read'],
  reviewer: ['foundation.read', 'strategy.read', 'member.read', 'organization.read', 'opportunity.read', 'opportunity.review', 'decision.read', 'grant.read', 'document.read', 'meeting.read'],
  viewer: ['foundation.read', 'strategy.read', 'member.read', 'organization.read', 'opportunity.read', 'decision.read', 'grant.read', 'document.read', 'meeting.read'],
}

export function capabilitiesFor(role) {
  return ROLE_CAPABILITIES[role] ?? []
}

export function can(user, capability) {
  const capabilities = capabilitiesFor(user?.role)
  return capabilities.includes('*') || capabilities.includes(capability)
}

export function requireCapability(user, capability) {
  if (!user) throw new HttpError(401, 'Sign in is required.', 'authentication_required')
  if (!can(user, capability)) throw new HttpError(403, 'You do not have permission to perform this action.', 'permission_denied')
}
