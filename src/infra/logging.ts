import { Logger } from "tslog";

enum LogLevel {
  SILLY = 0,
  TRACE = 1,
  DEBGUG = 2,
  INFO = 3,
  WARN = 4,
  ERROR = 5,
  FATAL = 6,
}

function minLogLevel(component): LogLevel {
  const logFilter = process.env.LOG_FILTER || "";
  const filters = logFilter.split(',')
    .map(s => s.trim())
    .filter(s => s.length > 0);

  let result = LogLevel.INFO;
  for (const filter of filters) {
    const [pattern, level] = filter.split('=').map(s => s.trim());

    if (level) {
      // This filter is a mapping: pattern=level.
      const regex = new RegExp(pattern);
      if (regex.test(component)) {
        result = LogLevel[level.toUpperCase()];
      }
    } else {
      // No "=" found, so treat the entire filter as a default log level.
      result = LogLevel[pattern.toUpperCase()];
    }
  }
  return result;
}

export function logger(component: string) { 
  return new Logger({
    type: "pretty",
    stylePrettyLogs: true,
    minLevel: minLogLevel(component),
    prettyLogStyles: {
      logLevelName: {
        "*": ["blue", "bold"], // default style for all levels
        SILLY: ["magenta", "dim"],
        TRACE: ["white", "dim"],
  
        // Make DEBUG appear in a light gray / dim white:
        DEBUG: ["white", "dim"],
  
        INFO: ["green", "bold"],
        WARN: ["yellow", "bold"],
        ERROR: ["red", "bold"],
        FATAL: ["red", "bold", "underline"],
      },
      filePathWithLine: "dim",
    },
    prettyInspectOptions: {
      depth: 4,
    },
  });
 };

export { Logger } from "tslog";
