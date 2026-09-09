import fetch from "node-fetch";
import {
  GlitchTipIssue,
  GlitchTipEvent,
  GlitchTipConfig,
  GlitchTipConnectionError,
  GlitchTipApiError,
  GlitchTipValidationError,
  GlitchTipPaginatedResponse,
  GlitchTipIssuesParams,
} from "./types.js";

function parseLinkHeader(header: string): Record<string, string> {
  const result: Record<string, string> = {};
  for (const part of header.split(",")) {
    const match = part.match(/<[^>]*\bcursor=([^&>]*)>;\s*rel="(\w+)"/);
    if (match) result[match[2]] = decodeURIComponent(match[1]);
  }
  return result;
}

export class GlitchTipClient {
  private config: GlitchTipConfig;

  constructor(config: GlitchTipConfig) {
    this.config = config;
    this.validateConfig();
  }

  private validateConfig(): void {
    if (!this.config.baseUrl) {
      throw new GlitchTipValidationError("Base URL is required");
    }
    if (!this.config.token && !this.config.sessionId) {
      throw new GlitchTipValidationError(
        "Either token or session ID is required",
      );
    }
    if (!this.config.organization) {
      throw new GlitchTipValidationError("Organization is required");
    }
    // Ensure baseUrl ends with /api/0
    if (!this.config.baseUrl.endsWith("/api/0")) {
      if (this.config.baseUrl.endsWith("/")) {
        this.config.baseUrl += "api/0";
      } else {
        this.config.baseUrl += "/api/0";
      }
    }
  }

  private getHeaders(): Record<string, string> {
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
      Accept: "application/json",
    };

    // Token has priority over session ID
    if (this.config.token) {
      headers["Authorization"] = `Bearer ${this.config.token}`;
    } else if (this.config.sessionId) {
      headers["Cookie"] = `sessionid=${this.config.sessionId}`;
    }

    return headers;
  }

  private async makeRequest<T>(endpoint: string): Promise<{
    data: T;
    nextCursor: string | null;
    previousCursor: string | null;
  }> {
    const url = `${this.config.baseUrl}${endpoint}`;

    try {
      const response = await fetch(url, {
        method: "GET",
        headers: this.getHeaders(),
      });

      if (!response.ok) {
        if (response.status === 401) {
          throw new GlitchTipApiError(
            "Authentication failed. Check your token or session ID.",
            response.status,
          );
        }
        if (response.status === 403) {
          throw new GlitchTipApiError(
            "Access forbidden. Check your permissions.",
            response.status,
          );
        }
        if (response.status === 404) {
          throw new GlitchTipApiError("Resource not found.", response.status);
        }
        throw new GlitchTipApiError(
          `HTTP ${response.status}: ${response.statusText}`,
          response.status,
        );
      }

      const data = (await response.json()) as T;

      const linkHeader = response.headers.get("Link");
      let nextCursor: string | null = null;
      let previousCursor: string | null = null;

      if (linkHeader) {
        const links = parseLinkHeader(linkHeader);
        nextCursor = links.next || null;
        previousCursor = links.previous || null;
      }

      return { data, nextCursor, previousCursor };
    } catch (error) {
      if (error instanceof GlitchTipApiError) {
        throw error;
      }
      throw new GlitchTipConnectionError(
        `Failed to connect to GlitchTip: ${error instanceof Error ? error.message : "Unknown error"}`,
      );
    }
  }

  /**
   * Get issues (errors) from GlitchTip with pagination support
   * @param params Optional params: status, cursor, perPage
   */
  async getIssues(
    params?: GlitchTipIssuesParams,
  ): Promise<GlitchTipPaginatedResponse<GlitchTipIssue>> {
    if (!this.config.organization) {
      throw new GlitchTipValidationError("Organization is required in config.");
    }

    let endpoint = `/organizations/${this.config.organization}/issues/`;
    const searchParams = new URLSearchParams();

    if (params?.status) {
      searchParams.set("query", `is:${params.status}`);
    }
    if (params?.cursor) {
      searchParams.set("cursor", params.cursor);
    }
    if (params?.perPage) {
      searchParams.set("per_page", String(params.perPage));
    }

    const queryString = searchParams.toString();
    if (queryString) endpoint += `?${queryString}`;

    return this.makeRequest<GlitchTipIssue[]>(endpoint);
  }

  /**
   * Get events for a specific issue
   * @param issueId The issue ID
   * @param latest If true, gets only the latest event
   */
  async getIssueEvents(
    issueId: string,
    latest: boolean = false,
  ): Promise<GlitchTipEvent | GlitchTipEvent[]> {
    const endpoint = latest
      ? `/issues/${issueId}/events/latest/`
      : `/issues/${issueId}/events/`;

    const result = await this.makeRequest<GlitchTipEvent | GlitchTipEvent[]>(
      endpoint,
    );
    return result.data;
  }
}
