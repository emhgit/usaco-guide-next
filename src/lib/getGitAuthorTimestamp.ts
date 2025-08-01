import { execSync } from 'child_process';

export function getLastUpdated(filepath: string): string | null {
    try {
        const result = execSync(`git log -1 --format=%ct "${filepath}"`, {
            encoding: 'utf-8',
        });
        return new Date(parseInt(result.trim()) * 1000).toISOString();
    } catch {
        return null;
    }
}

