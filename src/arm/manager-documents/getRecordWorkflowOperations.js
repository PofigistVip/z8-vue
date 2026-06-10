import { getContractorId } from '../../stores/userStore.js'

export const DOCUMENT_TRACKER_REQUEST = 'ru.ivk.homer.module.document.model.DocumentTracker'

const WF_STATUS_ACTIVE = 1
const FLOW_DEFINITION_KEY = 'flow.definition'
const FLOW_RECORD_ID_KEY = 'flow.recordId'

function parseFlowDefinition(record) {
  if (!record || typeof record !== 'object') return null
  const raw = record[FLOW_DEFINITION_KEY]
  if (typeof raw !== 'string' || !raw.trim()) return null
  try {
    const parsed = JSON.parse(raw)
    return parsed && typeof parsed === 'object' ? parsed : null
  } catch {
    return null
  }
}

function getExecutorAgentId(task, actors) {
  const executors = task?.executors
  if (!Array.isArray(executors)) return null
  const actorId = executors.find((id) => id !== null && id !== undefined && String(id).length > 0)
  if (!actorId) return null
  const actor = (Array.isArray(actors) ? actors : []).find(
    (item) => item && String(item.id) === String(actorId)
  )
  const agentId = actor?.agentId
  return agentId !== undefined && agentId !== null ? String(agentId) : null
}

function findMyTask(definition, contractorId) {
  if (!definition || !contractorId) return null
  const actors = definition.actors
  const targetId = String(contractorId)
  let match = null

  function visit(elements) {
    if (!Array.isArray(elements)) return
    for (const element of elements) {
      if (!element || typeof element !== 'object') continue
      if (element.type === 'task') {
        const agentId = getExecutorAgentId(element, actors)
        if (agentId && agentId === targetId) {
          match = element
        }
      }
      visit(element.elements)
    }
  }

  visit(definition.elements)
  return match
}

function operationsFromTask(task, definition) {
  if (!task || task.status !== WF_STATUS_ACTIVE) return []

  const taskId = task.id
  const links = (Array.isArray(definition?.links) ? definition.links : []).filter(
    (link) => link && String(link.sourceId) === String(taskId)
  )

  if (links.length > 0) {
    return links
      .map((link) => {
        const text = typeof link.name === 'string' && link.name.trim() ? link.name.trim() : ''
        if (!text || link.id === undefined || link.id === null) return null
        return {
          text,
          taskAction: 'transition',
          linkId: String(link.id),
          taskId: String(taskId),
        }
      })
      .filter(Boolean)
  }

  const exits = Array.isArray(task.exits) ? task.exits : []
  return exits
    .map((exit) => {
      const text = typeof exit?.name === 'string' && exit.name.trim() ? exit.name.trim() : ''
      if (!text || exit.id === undefined || exit.id === null) return null
      return {
        text,
        taskAction: 'close',
        exitId: String(exit.id),
        taskId: String(taskId),
        commentRequired: Boolean(exit.flags & 1),
      }
    })
    .filter(Boolean)
}

export function getRecordWorkflowOperations(record, contractorId = getContractorId()) {
  if (!contractorId) return []

  const definition = parseFlowDefinition(record)
  if (!definition) return []

  const task = findMyTask(definition, contractorId)
  if (!task) return []

  return operationsFromTask(task, definition)
}

export function buildProcessTaskPayload(record, operation, comment) {
  if (!record || !operation) return null

  const flowId = record[FLOW_RECORD_ID_KEY]
  if (flowId === undefined || flowId === null || String(flowId).length === 0) return null

  const payload = {
    action: 'content',
    request: DOCUMENT_TRACKER_REQUEST,
    method: 'processTask',
    taskAction: operation.taskAction,
    taskId: operation.taskId,
    flowId: String(flowId),
    comment: typeof comment === 'string' ? comment : '',
  }

  if (operation.exitId) payload.exitId = operation.exitId
  if (operation.linkId) payload.linkId = operation.linkId

  return payload
}
