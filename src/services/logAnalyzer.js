const fs = require('fs').promises;
const path = require('path');

class LogAnalyzer {
    constructor(logFilePath) {
        this.logFilePath = logFilePath;
    }

    async analyzeByDate(date) {
        const content = await fs.readFile(this.logFilePath, 'utf8');
        const lines = content.split('\n').filter(line => line);
        
        const dateStr = date.toISOString().split('T')[0];
        const dailyLogs = lines.filter(line => line.includes(dateStr));

        const analysis = {
            total: dailyLogs.length,
            byLevel: {},
            byFile: {},
            errorDetails: []
        };

        dailyLogs.forEach(log => {
            const { level, file, line, message } = this.parseLine(log);
            
            // Count by level
            analysis.byLevel[level] = (analysis.byLevel[level] || 0) + 1;
            
            // Group by file
            if (file) {
                if (!analysis.byFile[file]) {
                    analysis.byFile[file] = {
                        totalIssues: 0,
                        byLevel: {},
                        lineNumbers: new Set()
                    };
                }
                analysis.byFile[file].totalIssues++;
                analysis.byFile[file].byLevel[level] = (analysis.byFile[file].byLevel[level] || 0) + 1;
                analysis.byFile[file].lineNumbers.add(line);
            }

            // Collect error details
            if (level === 'error') {
                analysis.errorDetails.push({ file, line, message });
            }
        });

        // Convert Sets to Arrays for JSON serialization
        Object.values(analysis.byFile).forEach(fileData => {
            fileData.lineNumbers = Array.from(fileData.lineNumbers);
        });

        return {
            date: dateStr,
            ...analysis,
            recommendations: this.generateRecommendations(analysis)
        };
    }

    parseLine(line) {
        const levelMatch = /\] (error|warn|info|debug|verbose):/.exec(line);
        const fileMatch = /File: ([^,]+), Line: (\d+)/.exec(line);
        const messageMatch = /: ([^(]+)/.exec(line);

        return {
            level: levelMatch ? levelMatch[1] : 'unknown',
            file: fileMatch ? fileMatch[1] : null,
            line: fileMatch ? fileMatch[2] : null,
            message: messageMatch ? messageMatch[1].trim() : ''
        };
    }

    generateRecommendations(analysis) {
        const recommendations = [];
        const ERROR_THRESHOLD = 3;
        const WARN_THRESHOLD = 5;

        // Analyze files with high error counts
        Object.entries(analysis.byFile)
            .filter(([_, data]) => (data.byLevel.error || 0) >= ERROR_THRESHOLD)
            .forEach(([file, data]) => {
                recommendations.push({
                    priority: 'HIGH',
                    file,
                    message: `High error concentration (${data.byLevel.error} errors) in ${file}. Consider immediate code review.`,
                    affectedLines: data.lineNumbers
                });
            });

        // Analyze files with high warning counts
        Object.entries(analysis.byFile)
            .filter(([_, data]) => (data.byLevel.warn || 0) >= WARN_THRESHOLD)
            .forEach(([file, data]) => {
                recommendations.push({
                    priority: 'MEDIUM',
                    file,
                    message: `High warning concentration (${data.byLevel.warn} warnings) in ${file}. Schedule code review.`,
                    affectedLines: data.lineNumbers
                });
            });

        return recommendations;
    }

    async generateReport(date = new Date()) {
        // Si no se proporciona fecha, usa el día actual
        const analysis = await this.analyzeByDate(date);
        
        // Añadir fecha de generación del reporte
        const reportTimestamp = new Date().toISOString();
        const report = {
            date: analysis.date,
            summary: {
                totalLogs: analysis.total,
                errorCount: analysis.byLevel.error || 0,
                warnCount: analysis.byLevel.warn || 0,
                filesAffected: Object.keys(analysis.byFile).length
            },
            criticalFiles: Object.entries(analysis.byFile)
                .filter(([_, data]) => data.byLevel.error > 0)
                .map(([file, data]) => ({
                    file,
                    errors: data.byLevel.error,
                    warnings: data.byLevel.warn || 0,
                    lines: data.lineNumbers
                }))
                .sort((a, b) => b.errors - a.errors),
            recommendations: analysis.recommendations,
            errorDetails: analysis.errorDetails
        };

        return report;
    }
}

module.exports = LogAnalyzer;