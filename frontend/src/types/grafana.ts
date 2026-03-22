export interface GrafanaDashboard {
  uid: string
  id?: number
  title: string
  url?: string
  tags?: string[]
  folderId?: number
  folderTitle?: string
  folderUrl?: string
  type?: string
  isStarred?: boolean
  panelCount?: number
  sortMeta?: number
}

export interface GrafanaDatasource {
  id: number
  uid: string
  name: string
  type: string
  url: string
  isDefault?: boolean
  jsonData?: Record<string, unknown>
}

export interface GrafanaAlert {
  id: number
  uid?: string
  panelId?: number
  dashboardId?: number
  dashboardUid?: string
  dashboardSlug?: string
  alertRuleUID?: string
  title: string
  message?: string
  state: 'ok' | 'alerting' | 'pending' | 'nodata' | 'paused'
  newStateDate?: string
  evalDate?: string
  evalData?: Record<string, unknown>
  executionError?: string
  url?: string
  labels?: Record<string, string>
  annotations?: Record<string, string>
}

export interface GrafanaFolder {
  id: number
  uid: string
  title: string
  url?: string
  hasAcl?: boolean
  canSave?: boolean
  canEdit?: boolean
  canAdmin?: boolean
}

export interface GrafanaAnnotation {
  id: number
  alertId?: number
  alertName?: string
  dashboardId?: number
  dashboardUID?: string
  panelId?: number
  userId?: number
  newState?: string
  prevState?: string
  time: number
  timeEnd?: number
  text?: string
  title?: string
  tags?: string[]
  login?: string
  email?: string
  avatarUrl?: string
  data?: Record<string, unknown>
}
