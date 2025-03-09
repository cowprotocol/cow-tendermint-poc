import { Logger, ILogObj } from "tslog";

// Create a logger with the "pretty" format:
const logger = new Logger({
  type: "pretty",
  stylePrettyLogs: true,
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

export { logger };
