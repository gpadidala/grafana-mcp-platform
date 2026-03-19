export interface MCPToolInputSchema {
  type: string
  properties: Record<string, unknown>
  required?: string[]
}

export interface MCPTool {
  name: string
  description: string
  input_schema: MCPToolInputSchema
  lastCallStatus?: 'idle' | 'running' | 'success' | 'error'
  lastCalledAt?: Date
}

export interface MCPResource {
  uri: string
  name: string
  description?: string
  mime_type?: string
}
