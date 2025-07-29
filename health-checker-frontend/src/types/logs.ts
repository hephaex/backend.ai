export interface LogEntry {
  line: number;
  timestamp: string | null;
  level: string;
  message: string;
  source?: string;
  container?: string;
  path?: string;
}

export interface LogSource {
  source: 'file' | 'docker' | 'mock';
  path?: string;
  container?: string;
  total_lines: number;
  logs: LogEntry[];
}

export interface ServiceLog {
  service: string;
  type: string;
  timestamp: string;
  sources: LogSource[];
  errors?: string[];
}

export interface LogStats {
  service: string;
  sources: LogSourceStats[];
}

export interface LogSourceStats {
  type: 'file' | 'docker' | 'mock';
  path?: string;
  container?: string;
  size_bytes: number;
  modified?: string;
  available: boolean;
  error?: string;
}

export interface LogSearchResult {
  service: string;
  query: string;
  options: {
    lines: number;
    caseSensitive: boolean;
    regex: boolean;
  };
  total_matches: number;
  results: LogEntry[];
}

export interface LogService {
  name: string;
  displayName: string;
  description: string;
  types: string[];
}

export interface LogStreamMessage {
  timestamp: string;
  service: string;
  level?: string;
  message: string;
}