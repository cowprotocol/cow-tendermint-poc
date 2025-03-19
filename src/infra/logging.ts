import { Logger as TsLogger } from 'tslog';

// Convenient type alias for the specific logger type.
export type Logger = TsLogger<void>;

/**
 * Creates a new logger instance for the given component and configures it verbosity according to the `LOG_FILTER` environment variable.
 * E.g. `LOG_FILTER=INFO,signer=DEBUG` will set the log level to INFO for all components except the `signer` component, which will be set to DEBUG.
 *
 * @param component the sub-component name for which this logger is created
 * @returns a logger instance
 */
export function logger(component: string): TsLogger<void> {
    return new TsLogger({
        type: 'pretty',
        stylePrettyLogs: true,
        minLevel: minLogLevel(component),
        prettyLogStyles: {
            logLevelName: {
                '*': ['blue', 'bold'], // default style for all levels
                SILLY: ['magenta', 'dim'],
                TRACE: ['white', 'dim'],

                // Make DEBUG appear in a light gray / dim white:
                DEBUG: ['white', 'dim'],

                INFO: ['green', 'bold'],
                WARN: ['yellow', 'bold'],
                ERROR: ['red', 'bold'],
                FATAL: ['red', 'bold', 'underline'],
            },
            filePathWithLine: 'dim',
        },
        prettyInspectOptions: {
            depth: 4,
        },
    });
}

enum LogLevel {
    SILLY = 0,
    TRACE = 1,
    DEBUG = 2,
    INFO = 3,
    WARN = 4,
    ERROR = 5,
    FATAL = 6,
}

function isLogLevelKey(key: string): key is keyof typeof LogLevel {
    return key in LogLevel;
}

function minLogLevel(component: string): LogLevel {
    const logFilter = process.env.LOG_FILTER || '';
    const filters = logFilter
        .split(',')
        .map((s) => s.trim())
        .filter((s) => s.length > 0);

    let result = LogLevel.INFO;
    for (const filter of filters) {
        const [pattern, level] = filter.split('=').map((s) => s.trim());

        if (level) {
            // This filter is a mapping: pattern=level.
            const regex = new RegExp(pattern);
            if (regex.test(component)) {
                const upperLevel = level.toUpperCase();
                if (isLogLevelKey(upperLevel)) {
                    result = LogLevel[upperLevel];
                } else {
                    throw new Error(`Invalid log level: ${level}`);
                }
            }
        } else {
            // No "=" found, so treat the entire filter as a default log level.
            const upperLevel = pattern.toUpperCase();
            if (isLogLevelKey(upperLevel)) {
                result = LogLevel[upperLevel];
            } else {
                throw new Error(`Invalid log level: ${level}`);
            }
        }
    }
    return result;
}
