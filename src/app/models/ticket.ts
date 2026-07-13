export type TicketStatus = 'Open' | 'Resolved' | 'Closed';
export type TicketSeverity = 'Critical' | 'High' | 'Medium' | 'Low';
export type ServiceCategory = 'VPS' | 'App Deployment' | 'VPN Access' | 'Object Storage' | 'Databases' | 'Domains' | 'AI/MCP' | 'Other/Platform';

export interface TicketAttachment {
  id: string;
  name: string;
  type: string; // mimeType
  size: number;
  url: string; // public object storage URL
}

export interface Ticket {
  id: string;
  title: string;
  service: ServiceCategory;
  subCategory: string;
  status: TicketStatus;
  severity: TicketSeverity;
  dateReported: string;
  description: string;
  observed: string;
  stepsToReproduce: string;
  expectedOutcome: string;
  actualOutcome: string;
  rootCause: string;
  environment: string;
  attachments: TicketAttachment[];
}

export interface Workspace {
  id: string;
  name: string;
  createdAt: string;
  ownerId?: string;
  role?: 'OWNER' | 'MEMBER';
}

export const STATUS_OPTIONS: TicketStatus[] = ['Open', 'Resolved', 'Closed'];
export const SEVERITY_OPTIONS: TicketSeverity[] = ['Critical', 'High', 'Medium', 'Low'];
export const SERVICE_OPTIONS: ServiceCategory[] = ['VPS', 'App Deployment', 'VPN Access', 'Object Storage', 'Databases', 'Domains', 'AI/MCP', 'Other/Platform'];

export const VPS_OS_IMAGES = ['General', 'Ubuntu 22.04', 'Ubuntu 24.04', 'Debian 12'];
export const APP_FRAMEWORKS = ['General', 'Static HTML', 'PHP/Laravel', 'Vite/React', 'Angular', 'Java/Spring Boot', 'Python/Odoo', 'Next.js', 'Node.js'];
export const DB_ENGINES = ['General', 'MySQL', 'PostgreSQL', 'MongoDB'];
export const AI_MCP_TYPES = ['General', 'Claude Code', 'MCP Server', 'API Integration', 'Agent Behavior'];

export function getSubCategoryOptions(service: ServiceCategory): string[] | null {
  switch (service) {
    case 'VPS': return VPS_OS_IMAGES;
    case 'App Deployment': return APP_FRAMEWORKS;
    case 'Databases': return DB_ENGINES;
    case 'AI/MCP': return AI_MCP_TYPES;
    default: return null;
  }
}
