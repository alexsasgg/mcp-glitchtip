export interface GlitchTipIssue {
  id: string;
  count: string;
  type: string;
  level: string;
  status: string;
  project: {
    id: string;
    platform: string;
    slug: string;
    name: string;
  };
  shortId: string;
  numComments: number;
  stats: {
    "24h": any[];
  };
  shareId: string | null;
  logger: string | null;
  permalink: string;
  statusDetails: Record<string, any>;
  subscriptionDetails: any;
  userCount: number;
  matchingEventId: string | null;
  firstSeen: string;
  lastSeen: string;
  title: string;
  metadata: Record<string, any>;
  culprit: string;
}

export interface GlitchTipEvent {
  platform: string;
  id: string;
  eventID: string;
  projectID: number;
  groupID: string;
  dateCreated: string;
  dateReceived: string;
  dist: string | null;
  culprit: string;
  packages: any;
  type: string;
  message: string;
  metadata: {
    type: string;
    value: string;
    filename: string;
    function: string;
  };
  tags: Array<{
    key: string;
    value: string;
  }>;
  entries: Array<{
    type: string;
    data: any;
  }>;
  contexts: Record<string, any>;
  context: Record<string, any>;
  user: any;
  sdk: {
    name: string;
    version: string;
    packages: Array<{
      name: string;
      version: string;
    }>;
    integrations: string[];
  };
  title: string;
  userReport: any;
  nextEventID: string | null;
  previousEventID: string | null;
}

export interface GlitchTipConfig {
  baseUrl: string;
  sessionId?: string;
  token?: string;
  organization: string;
}

export class GlitchTipConnectionError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "GlitchTipConnectionError";
  }
}

export class GlitchTipApiError extends Error {
  constructor(
    message: string,
    public statusCode?: number,
  ) {
    super(message);
    this.name = "GlitchTipApiError";
  }
}

export class GlitchTipValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "GlitchTipValidationError";
  }
}

export interface GlitchTipPaginatedResponse<T> {
  data: T[];
  nextCursor: string | null;
  previousCursor: string | null;
}

export interface GlitchTipIssuesParams {
  status?: "unresolved" | "resolved" | "all";
  cursor?: string;
  perPage?: number;
}
