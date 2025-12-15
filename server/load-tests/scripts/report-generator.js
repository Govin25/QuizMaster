#!/usr/bin/env node

/**
 * Report Generator
 * Generates comprehensive HTML reports from Artillery JSON outputs
 */

const fs = require('fs').promises;
const path = require('path');

const REPORTS_DIR = path.join(__dirname, '../reports');

async function findReportFiles() {
    try {
        const files = await fs.readdir(REPORTS_DIR);
        return files
            .filter(f => f.endsWith('.json') && !f.includes('summary'))
            .map(f => path.join(REPORTS_DIR, f));
    } catch (err) {
        console.error('Error reading reports directory:', err.message);
        return [];
    }
}

async function parseReport(filePath) {
    try {
        const content = await fs.readFile(filePath, 'utf8');
        const data = JSON.parse(content);
        return {
            file: path.basename(filePath),
            data
        };
    } catch (err) {
        console.error(`Error parsing ${filePath}:`, err.message);
        return null;
    }
}

function generateHTMLReport(reports) {
    const html = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Quainy Load Test Report</title>
  <style>
    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }
    
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      min-height: 100vh;
      padding: 2rem;
    }
    
    .container {
      max-width: 1200px;
      margin: 0 auto;
      background: white;
      border-radius: 16px;
      box-shadow: 0 20px 60px rgba(0,0,0,0.3);
      overflow: hidden;
    }
    
    header {
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      color: white;
      padding: 2rem;
      text-align: center;
    }
    
    h1 {
      font-size: 2.5rem;
      margin-bottom: 0.5rem;
    }
    
    .timestamp {
      opacity: 0.9;
      font-size: 0.9rem;
    }
    
    .summary {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
      gap: 1rem;
      padding: 2rem;
      background: #f8f9fa;
    }
    
    .stat-card {
      background: white;
      padding: 1.5rem;
      border-radius: 12px;
      box-shadow: 0 2px 8px rgba(0,0,0,0.1);
      text-align: center;
    }
    
    .stat-value {
      font-size: 2rem;
      font-weight: bold;
      color: #667eea;
      margin-bottom: 0.5rem;
    }
    
    .stat-label {
      color: #666;
      font-size: 0.9rem;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }
    
    .report-section {
      padding: 2rem;
      border-bottom: 1px solid #e0e0e0;
    }
    
    .report-section:last-child {
      border-bottom: none;
    }
    
    h2 {
      color: #333;
      margin-bottom: 1rem;
      font-size: 1.5rem;
    }
    
    table {
      width: 100%;
      border-collapse: collapse;
      margin-top: 1rem;
    }
    
    th, td {
      padding: 0.75rem;
      text-align: left;
      border-bottom: 1px solid #e0e0e0;
    }
    
    th {
      background: #f8f9fa;
      font-weight: 600;
      color: #333;
    }
    
    tr:hover {
      background: #f8f9fa;
    }
    
    .success {
      color: #10b981;
      font-weight: bold;
    }
    
    .warning {
      color: #f59e0b;
      font-weight: bold;
    }
    
    .error {
      color: #ef4444;
      font-weight: bold;
    }
    
    .metric-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
      gap: 1rem;
      margin-top: 1rem;
    }
    
    .metric {
      padding: 1rem;
      background: #f8f9fa;
      border-radius: 8px;
    }
    
    .metric-name {
      font-size: 0.8rem;
      color: #666;
      margin-bottom: 0.5rem;
    }
    
    .metric-value {
      font-size: 1.25rem;
      font-weight: bold;
      color: #333;
    }
  </style>
</head>
<body>
  <div class="container">
    <header>
      <h1>🚀 Quainy Load Test Report</h1>
      <p class="timestamp">Generated: ${new Date().toLocaleString()}</p>
    </header>
    
    <div class="summary">
      <div class="stat-card">
        <div class="stat-value">${reports.length}</div>
        <div class="stat-label">Test Scenarios</div>
      </div>
      <div class="stat-card">
        <div class="stat-value">${calculateTotalRequests(reports)}</div>
        <div class="stat-label">Total Requests</div>
      </div>
      <div class="stat-card">
        <div class="stat-value">${calculateAvgLatency(reports)}ms</div>
        <div class="stat-label">Avg Latency</div>
      </div>
      <div class="stat-card">
        <div class="stat-value">${calculateErrorRate(reports)}%</div>
        <div class="stat-label">Error Rate</div>
      </div>
    </div>
    
    ${reports.map(report => generateReportSection(report)).join('')}
  </div>
</body>
</html>
  `;

    return html;
}

function calculateTotalRequests(reports) {
    return reports.reduce((sum, report) => {
        const completed = report.data?.aggregate?.counters?.['vusers.completed'] || 0;
        return sum + completed;
    }, 0);
}

function calculateAvgLatency(reports) {
    const latencies = reports
        .map(r => r.data?.aggregate?.latency?.median)
        .filter(l => l !== undefined);

    if (latencies.length === 0) return 0;

    const avg = latencies.reduce((sum, l) => sum + l, 0) / latencies.length;
    return Math.round(avg * 10) / 10;
}

function calculateErrorRate(reports) {
    let totalRequests = 0;
    let totalErrors = 0;

    reports.forEach(report => {
        const completed = report.data?.aggregate?.counters?.['vusers.completed'] || 0;
        const failed = report.data?.aggregate?.counters?.['vusers.failed'] || 0;
        const errors = report.data?.aggregate?.errors || {};

        totalRequests += completed + failed;
        totalErrors += failed + Object.values(errors).reduce((sum, count) => sum + count, 0);
    });

    if (totalRequests === 0) return 0;
    return Math.round((totalErrors / totalRequests) * 100 * 10) / 10;
}

function generateReportSection(report) {
    const agg = report.data?.aggregate || {};
    const counters = agg.counters || {};
    const latency = agg.latency || {};

    return `
    <div class="report-section">
      <h2>${report.file.replace('.json', '').replace(/-/g, ' ').toUpperCase()}</h2>
      
      <div class="metric-grid">
        <div class="metric">
          <div class="metric-name">Scenarios Completed</div>
          <div class="metric-value ${counters['vusers.completed'] > 0 ? 'success' : 'error'}">
            ${counters['vusers.completed'] || 0}
          </div>
        </div>
        <div class="metric">
          <div class="metric-name">Scenarios Failed</div>
          <div class="metric-value ${counters['vusers.failed'] > 0 ? 'error' : 'success'}">
            ${counters['vusers.failed'] || 0}
          </div>
        </div>
        <div class="metric">
          <div class="metric-name">Median Latency</div>
          <div class="metric-value">${latency.median ? latency.median.toFixed(2) : 'N/A'}ms</div>
        </div>
        <div class="metric">
          <div class="metric-name">P95 Latency</div>
          <div class="metric-value">${latency.p95 ? latency.p95.toFixed(2) : 'N/A'}ms</div>
        </div>
        <div class="metric">
          <div class="metric-name">P99 Latency</div>
          <div class="metric-value">${latency.p99 ? latency.p99.toFixed(2) : 'N/A'}ms</div>
        </div>
        <div class="metric">
          <div class="metric-name">Max Latency</div>
          <div class="metric-value">${latency.max ? latency.max.toFixed(2) : 'N/A'}ms</div>
        </div>
      </div>
      
      ${Object.keys(agg.errors || {}).length > 0 ? `
        <h3 style="margin-top: 1.5rem; color: #ef4444;">Errors</h3>
        <table>
          <thead>
            <tr>
              <th>Error</th>
              <th>Count</th>
            </tr>
          </thead>
          <tbody>
            ${Object.entries(agg.errors).map(([error, count]) => `
              <tr>
                <td>${error}</td>
                <td class="error">${count}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      ` : ''}
    </div>
  `;
}

async function main() {
    console.log('Generating load test reports...\n');

    const reportFiles = await findReportFiles();

    if (reportFiles.length === 0) {
        console.log('No report files found in', REPORTS_DIR);
        console.log('Run some load tests first!\n');
        return;
    }

    console.log(`Found ${reportFiles.length} report file(s)\n`);

    const reports = [];
    for (const file of reportFiles) {
        const report = await parseReport(file);
        if (report) {
            reports.push(report);
            console.log(`✓ Parsed: ${report.file}`);
        }
    }

    if (reports.length === 0) {
        console.log('\nNo valid reports to process.\n');
        return;
    }

    const html = generateHTMLReport(reports);
    const outputPath = path.join(REPORTS_DIR, 'load-test-report.html');

    await fs.writeFile(outputPath, html);

    console.log(`\n✓ HTML report generated: ${outputPath}\n`);
    console.log('Open the report in your browser to view detailed results.\n');
}

main().catch(err => {
    console.error('Report generation failed:', err);
    process.exit(1);
});
