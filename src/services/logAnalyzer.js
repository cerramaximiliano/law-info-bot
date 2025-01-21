const fs = require("fs").promises;
const path = require("path");
const momentTz = require("moment-timezone");

const MAX_REPORTS = 10;
class LogAnalyzer {
  constructor(logFilePath) {
    this.logFilePath = logFilePath;
    this.reportDir = path.join(process.cwd(), "src", "files", "reports");
  }

  async cleanOldReports() {
    try {
      // Obtener todos los archivos en el directorio
      const files = await fs.readdir(this.reportDir);

      // Filtrar solo los archivos de reporte
      const reportFiles = files.filter((file) => file.startsWith("report-"));

      // Si hay más archivos que el máximo permitido
      if (reportFiles.length > MAX_REPORTS) {
        // Obtener stats de cada archivo para ordenar por fecha de creación
        const fileStats = await Promise.all(
          reportFiles.map(async (file) => ({
            name: file,
            path: path.join(this.reportDir, file),
            stats: await fs.stat(path.join(this.reportDir, file)),
          }))
        );

        // Ordenar por fecha de creación, más reciente primero
        fileStats.sort((a, b) => b.stats.ctime - a.stats.ctime);

        // Eliminar los archivos más antiguos que excedan el límite
        const filesToDelete = fileStats.slice(MAX_REPORTS);
        await Promise.all(filesToDelete.map((file) => fs.unlink(file.path)));
      }
    } catch (error) {
      console.error("Error cleaning old reports:", error);
    }
  }

  async analyzeByDate(date) {
    try {
      const content = await fs.readFile(this.logFilePath, "utf8");
      const lines = content.split("\n").filter((line) => line);
      const dateStr = momentTz(date)
        .tz("America/Argentina/Buenos_Aires")
        .format("YYYY-MM-DD");
      const dailyLogs = lines.filter((line) => line.includes(dateStr));

      // Contar inicializaciones
      const appInitializations = dailyLogs.filter((line) =>
        line.toLowerCase().includes("aplicación iniciada")
      ).length;

      const analysis = {
        total: dailyLogs.length,
        byLevel: {},
        byFile: {},
        errorDetails: [],
        appInitializations,
      };

      dailyLogs.forEach((log) => {
        const { level, file, line, message } = this.parseLine(log);

        analysis.byLevel[level] = (analysis.byLevel[level] || 0) + 1;

        if (file) {
          if (!analysis.byFile[file]) {
            analysis.byFile[file] = {
              totalIssues: 0,
              byLevel: {},
              lineNumbers: new Set(),
            };
          }
          analysis.byFile[file].totalIssues++;
          analysis.byFile[file].byLevel[level] =
            (analysis.byFile[file].byLevel[level] || 0) + 1;
          analysis.byFile[file].lineNumbers.add(line);
        }

        if (level === "error") {
          analysis.errorDetails.push({ file, line, message });
        }
      });

      Object.values(analysis.byFile).forEach((fileData) => {
        fileData.lineNumbers = Array.from(fileData.lineNumbers);
      });

      return {
        date: dateStr,
        ...analysis,
        dailyLogs, // Exponemos los logs
        recommendations: this.generateRecommendations(analysis),
      };
    } catch (error) {
      if (error.code === "ENOENT") {
        return {
          date: date.toISOString().split("T")[0],
          total: 0,
          byLevel: {},
          byFile: {},
          errorDetails: [],
          appInitializations: 0,
          dailyLogs: [],
          recommendations: [],
        };
      }
      throw error;
    }
  }

  parseLine(line) {
    const levelMatch =
      /\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2} (error|warn|info|debug|verbose):/.exec(
        line
      );
    const fileMatch = /File: ([^,]+), Line: (\d+)/.exec(line);
    const messageMatch = /: ([^(]+)/.exec(line);

    return {
      level: levelMatch ? levelMatch[1] : "unknown",
      file: fileMatch ? fileMatch[1] : null,
      line: fileMatch ? fileMatch[2] : null,
      message: messageMatch ? messageMatch[1].trim() : "",
    };
  }

  generateRecommendations(analysis) {
    const recommendations = [];
    const ERROR_THRESHOLD = 3;
    const WARN_THRESHOLD = 5;

    Object.entries(analysis.byFile)
      .filter(([_, data]) => (data.byLevel.error || 0) >= ERROR_THRESHOLD)
      .forEach(([file, data]) => {
        recommendations.push({
          priority: "HIGH",
          file,
          message: `High error concentration (${data.byLevel.error} errors) in ${file}. Consider immediate code review.`,
          affectedLines: data.lineNumbers,
        });
      });

    Object.entries(analysis.byFile)
      .filter(([_, data]) => (data.byLevel.warn || 0) >= WARN_THRESHOLD)
      .forEach(([file, data]) => {
        recommendations.push({
          priority: "MEDIUM",
          file,
          message: `High warning concentration (${data.byLevel.warn} warnings) in ${file}. Schedule code review.`,
          affectedLines: data.lineNumbers,
        });
      });

    return recommendations;
  }

  async generateReport(date = new Date()) {
    const analysis = await this.analyzeByDate(date);

    const report = {
      date: analysis.date,
      summary: {
        totalLogs: analysis.total,
        errorCount: analysis.byLevel.error || 0,
        warnCount: analysis.byLevel.warn || 0,
        filesAffected: Object.keys(analysis.byFile).length,
        appInitializations: analysis.appInitializations,
      },
      criticalFiles: Object.entries(analysis.byFile)
        .filter(([_, data]) => data.byLevel.error > 0)
        .map(([file, data]) => ({
          file,
          errors: data.byLevel.error,
          warnings: data.byLevel.warn || 0,
          lines: data.lineNumbers,
        }))
        .sort((a, b) => b.errors - a.errors),
      recommendations: analysis.recommendations,
      errorDetails: analysis.errorDetails,
      logs: analysis.dailyLogs, // Agregamos los logs al reporte
    };

    // Crear directorio si no existe
    const reportDir = path.join(process.cwd(), "src", "files", "reports");
    await fs.mkdir(reportDir, { recursive: true });

    // Generar nombre de archivo con timestamp
    const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
    const filename = `report-${analysis.date}-${timestamp}.json`;
    const filepath = path.join(reportDir, filename);

    // Guardar reporte
    await fs.writeFile(filepath, JSON.stringify(report, null, 2));
    report.filepath = filepath;

    await this.cleanOldReports();

    return report;
  }
}

module.exports = LogAnalyzer;
