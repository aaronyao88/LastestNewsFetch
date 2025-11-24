import fs from 'fs';
import path from 'path';

const LOG_DIR = path.join(process.cwd(), 'logs');

if (!fs.existsSync(LOG_DIR)) {
    fs.mkdirSync(LOG_DIR, { recursive: true });
}

export function logAgent(message: string) {
    const timestamp = new Date().toISOString();
    const logMessage = `[${timestamp}] ${message}\n`;

    // Console log
    console.log(message);

    // File log
    const logFile = path.join(LOG_DIR, `agent-${new Date().toISOString().split('T')[0]}.log`);
    try {
        fs.appendFileSync(logFile, logMessage);
    } catch (e) {
        console.error("Failed to write to log file", e);
    }
}
