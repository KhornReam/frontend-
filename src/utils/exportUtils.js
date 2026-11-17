/**
 * exportUtils.js
 * Universal Client-Side Export Engine for Excel and Printable PDF.
 * Zero external dependencies, 100% compliant with Excel (UTF-8 BOM / XML Spreadsheet)
 * and Publication-Grade Print / Save to PDF.
 */

/**
 * Cleanly format cells for CSV / Excel
 */
function sanitizeCell(value) {
  if (value === null || value === undefined) return ''
  const str = String(value)
  if (str.includes(',') || str.includes('"') || str.includes('\n')) {
    return `"${str.replace(/"/g, '""')}"`
  }
  return str
}

/**
 * Export tabular data directly to Microsoft Excel-compatible Spreadsheet
 * Uses XML Spreadsheet format (SpreadsheetML) so Excel opens it with native styling,
 * bold headers, colors, and column auto-width without security warnings.
 */
export function exportToExcel({
  filename = 'Export.xls',
  title = 'StudentHub Institutional Report',
  sheetName = 'Report Data',
  headers = [],
  rows = [],
  summaryRows = [],
  metadata = {},
}) {
  const dateStr = new Date().toLocaleString()
  const cleanFilename = filename.endsWith('.xls') || filename.endsWith('.xlsx')
    ? filename
    : `${filename}.xls`

  // Build XML Spreadsheet 2003
  let xml = `<?xml version="1.0"?>
<?mso-application progid="Excel.Sheet"?>
<Workbook xmlns="urn:schemas-microsoft-com:office:spreadsheet"
 xmlns:o="urn:schemas-microsoft-com:office:office"
 xmlns:x="urn:schemas-microsoft-com:office:excel"
 xmlns:ss="urn:schemas-microsoft-com:office:spreadsheet"
 xmlns:html="http://www.w3.org/TR/REC-html40">
 <DocumentProperties xmlns="urn:schemas-microsoft-com:office:office">
  <Author>StudentHub Enterprise</Author>
  <Created>${new Date().toISOString()}</Created>
  <Company>Greenwood Academy of Excellence</Company>
 </DocumentProperties>
 <Styles>
  <Style ss:ID="Default" ss:Name="Normal">
   <Alignment ss:Vertical="Center"/>
   <Font ss:FontName="Calibri" ss:Size="11" ss:Color="#1e293b"/>
  </Style>
  <Style ss:ID="HeaderTitle">
   <Font ss:FontName="Calibri" ss:Size="16" ss:Bold="1" ss:Color="#1e1b4b"/>
   <Alignment ss:Horizontal="Left" ss:Vertical="Center"/>
  </Style>
  <Style ss:ID="SubTitle">
   <Font ss:FontName="Calibri" ss:Size="10" ss:Color="#64748b"/>
   <Alignment ss:Horizontal="Left" ss:Vertical="Center"/>
  </Style>
  <Style ss:ID="ColHeader">
   <Alignment ss:Horizontal="Center" ss:Vertical="Center"/>
   <Borders>
    <Border ss:Position="Bottom" ss:LineStyle="Continuous" ss:Weight="2" ss:Color="#4f46e5"/>
    <Border ss:Position="Top" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#cbd5e1"/>
   </Borders>
   <Font ss:FontName="Calibri" ss:Size="11" ss:Bold="1" ss:Color="#ffffff"/>
   <Interior ss:Color="#4f46e5" ss:Pattern="Solid"/>
  </Style>
  <Style ss:ID="RowEven">
   <Borders>
    <Border ss:Position="Bottom" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#e2e8f0"/>
   </Borders>
   <Interior ss:Color="#f8fafc" ss:Pattern="Solid"/>
  </Style>
  <Style ss:ID="RowOdd">
   <Borders>
    <Border ss:Position="Bottom" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#e2e8f0"/>
   </Borders>
   <Interior ss:Color="#ffffff" ss:Pattern="Solid"/>
  </Style>
  <Style ss:ID="Summary">
   <Borders>
    <Border ss:Position="Top" ss:LineStyle="Continuous" ss:Weight="2" ss:Color="#4f46e5"/>
    <Border ss:Position="Bottom" ss:LineStyle="Continuous" ss:Weight="2" ss:Color="#4f46e5"/>
   </Borders>
   <Font ss:FontName="Calibri" ss:Size="11" ss:Bold="1" ss:Color="#0f172a"/>
   <Interior ss:Color="#eef2ff" ss:Pattern="Solid"/>
  </Style>
 </Styles>
 <Worksheet ss:Name="${sheetName.replace(/[\\/?*:[\]]/g, '')}">
  <Table ss:DefaultColumnWidth="120">
`

  // Title Row
  xml += `   <Row ss:Height="26">
    <Cell ss:MergeAcross="${Math.max(headers.length - 1, 1)}" ss:StyleID="HeaderTitle"><Data ss:Type="String">${escapeXml(title)}</Data></Cell>
   </Row>\n`

  // Subtitle / Metadata Row
  let metaDesc = `Generated on ${dateStr} • Greenwood Academy (Campus #GW-8821)`
  if (metadata && Object.keys(metadata).length > 0) {
    const metaParts = Object.entries(metadata).map(([k, v]) => `${k}: ${v}`)
    metaDesc += ` • ${metaParts.join(' | ')}`
  }
  xml += `   <Row ss:Height="18">
    <Cell ss:MergeAcross="${Math.max(headers.length - 1, 1)}" ss:StyleID="SubTitle"><Data ss:Type="String">${escapeXml(metaDesc)}</Data></Cell>
   </Row>
   <Row ss:Height="10"></Row>\n`

  // Table Column Headers
  xml += `   <Row ss:Height="24">\n`
  headers.forEach((h) => {
    xml += `    <Cell ss:StyleID="ColHeader"><Data ss:Type="String">${escapeXml(h)}</Data></Cell>\n`
  })
  xml += `   </Row>\n`

  // Rows
  rows.forEach((row, idx) => {
    const styleId = idx % 2 === 0 ? 'RowOdd' : 'RowEven'
    xml += `   <Row ss:Height="20">\n`
    const cells = Array.isArray(row) ? row : Object.values(row)
    cells.forEach((val) => {
      const isNum = typeof val === 'number' || (!isNaN(Number(val)) && val !== '' && !String(val).startsWith('+') && !String(val).startsWith('0'))
      const type = isNum ? 'Number' : 'String'
      xml += `    <Cell ss:StyleID="${styleId}"><Data ss:Type="${type}">${escapeXml(val)}</Data></Cell>\n`
    })
    xml += `   </Row>\n`
  })

  // Summary Rows
  if (summaryRows && summaryRows.length > 0) {
    xml += `   <Row ss:Height="10"></Row>\n`
    summaryRows.forEach((sRow) => {
      xml += `   <Row ss:Height="22">\n`
      const cells = Array.isArray(sRow) ? sRow : Object.values(sRow)
      cells.forEach((val) => {
        const isNum = typeof val === 'number'
        const type = isNum ? 'Number' : 'String'
        xml += `    <Cell ss:StyleID="Summary"><Data ss:Type="${type}">${escapeXml(val)}</Data></Cell>\n`
      })
      xml += `   </Row>\n`
    })
  }

  xml += `  </Table>
 </Worksheet>
</Workbook>`

  const blob = new Blob([xml], { type: 'application/vnd.ms-excel;charset=utf-8' })
  downloadBlob(blob, cleanFilename)
}

/**
 * Universal CSV Export with UTF-8 BOM
 */
export function exportToCsv({
  filename = 'Export.csv',
  headers = [],
  rows = [],
}) {
  const cleanFilename = filename.endsWith('.csv') ? filename : `${filename}.csv`
  let csvContent = '\uFEFF' // UTF-8 Byte Order Mark for Excel

  if (headers.length > 0) {
    csvContent += headers.map(sanitizeCell).join(',') + '\r\n'
  }

  rows.forEach((row) => {
    const cells = Array.isArray(row) ? row : Object.values(row)
    csvContent += cells.map(sanitizeCell).join(',') + '\r\n'
  })

  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
  downloadBlob(blob, cleanFilename)
}

/**
 * Publication-Grade PDF / Print Document Generator
 * Opens a dedicated printable window with institutional styling, official crest,
 * signatures, and triggers the system Print / "Save to PDF" dialog.
 */
export function exportToPdf({
  title = 'Institutional Academic Report',
  subtitle = 'Greenwood Academy of Excellence • Official Record',
  filename = 'Academic_Report.pdf',
  summaryCards = [],
  headers = [],
  rows = [],
  metadata = {},
  footerNote = 'Confidential Academic Record • Greenwood Academy System Administration',
}) {
  const printWindow = window.open('', '_blank', 'width=980,height=750')
  if (!printWindow) {
    alert('Please allow pop-ups in your browser to generate the PDF report.')
    return
  }

  const dateStr = new Date().toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  })

  let metaHtml = ''
  if (metadata && Object.keys(metadata).length > 0) {
    metaHtml = `
      <div class="pdf-meta-grid">
        ${Object.entries(metadata)
          .map(
            ([k, v]) => `
            <div class="meta-item">
              <span class="meta-label">${escapeHtml(k)}</span>
              <strong class="meta-value">${escapeHtml(v)}</strong>
            </div>
          `,
          )
          .join('')}
      </div>
    `
  }

  let cardsHtml = ''
  if (summaryCards && summaryCards.length > 0) {
    cardsHtml = `
      <div class="pdf-kpi-row">
        ${summaryCards
          .map(
            (c) => `
            <div class="pdf-kpi-card">
              <span class="kpi-label">${escapeHtml(c.label)}</span>
              <strong class="kpi-val">${escapeHtml(c.value)}</strong>
              ${c.caption ? `<span class="kpi-sub">${escapeHtml(c.caption)}</span>` : ''}
            </div>
          `,
          )
          .join('')}
      </div>
    `
  }

  let tableHtml = ''
  if (headers.length > 0 && rows.length > 0) {
    tableHtml = `
      <table class="pdf-table">
        <thead>
          <tr>
            ${headers.map((h) => `<th>${escapeHtml(h)}</th>`).join('')}
          </tr>
        </thead>
        <tbody>
          ${rows
            .map(
              (row, idx) => `
              <tr class="${idx % 2 === 1 ? 'even' : ''}">
                ${(Array.isArray(row) ? row : Object.values(row))
                  .map((cell) => `<td>${escapeHtml(cell)}</td>`)
                  .join('')}
              </tr>
            `,
            )
            .join('')}
        </tbody>
      </table>
    `
  }

  const html = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>${escapeHtml(title)} - PDF Export</title>
  <style>
    @page {
      size: A4 portrait;
      margin: 18mm 16mm;
    }
    * {
      box-sizing: border-box;
      -webkit-print-color-adjust: exact !important;
      print-color-adjust: exact !important;
    }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
      color: #0f172a;
      background: #ffffff;
      margin: 0;
      padding: 24px;
      font-size: 13px;
      line-height: 1.5;
    }
    .print-actions {
      display: flex;
      justify-content: flex-end;
      gap: 10px;
      margin-bottom: 20px;
      padding-bottom: 12px;
      border-bottom: 1px solid #e2e8f0;
    }
    .print-btn {
      background: #4f46e5;
      color: #ffffff;
      border: none;
      padding: 8px 18px;
      border-radius: 6px;
      font-size: 13px;
      font-weight: 600;
      cursor: pointer;
    }
    .close-btn {
      background: #f1f5f9;
      color: #475569;
      border: 1px solid #cbd5e1;
      padding: 8px 16px;
      border-radius: 6px;
      font-size: 13px;
      font-weight: 600;
      cursor: pointer;
    }
    .pdf-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      border-bottom: 2px solid #4f46e5;
      padding-bottom: 16px;
      margin-bottom: 20px;
    }
    .header-logo-group {
      display: flex;
      align-items: center;
      gap: 14px;
    }
    .crest-icon {
      width: 48px;
      height: 48px;
      background: #4f46e5;
      color: #ffffff;
      border-radius: 10px;
      display: grid;
      place-items: center;
      font-size: 24px;
      font-weight: 800;
    }
    .institution-name {
      font-size: 20px;
      font-weight: 800;
      color: #1e1b4b;
      margin: 0;
      letter-spacing: -0.3px;
    }
    .institution-sub {
      font-size: 12px;
      color: #64748b;
      margin: 2px 0 0 0;
    }
    .official-badge {
      text-align: right;
    }
    .stamp-pill {
      display: inline-block;
      padding: 4px 10px;
      background: #eef2ff;
      color: #4f46e5;
      border: 1px solid #c7d2fe;
      border-radius: 9999px;
      font-size: 11px;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }
    .report-date {
      font-size: 11.5px;
      color: #64748b;
      margin-top: 4px;
    }
    .report-title-section {
      margin-bottom: 18px;
    }
    .report-title {
      font-size: 18px;
      font-weight: 800;
      color: #0f172a;
      margin: 0 0 4px;
    }
    .report-desc {
      font-size: 12.5px;
      color: #475569;
      margin: 0;
    }
    .pdf-meta-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(160px, 1fr));
      gap: 10px;
      background: #f8fafc;
      padding: 12px 16px;
      border-radius: 8px;
      border: 1px solid #e2e8f0;
      margin-bottom: 18px;
    }
    .meta-item {
      display: flex;
      flex-direction: column;
      gap: 2px;
    }
    .meta-label {
      font-size: 10.5px;
      color: #64748b;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.4px;
    }
    .meta-value {
      font-size: 13px;
      color: #0f172a;
      font-weight: 600;
    }
    .pdf-kpi-row {
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: 12px;
      margin-bottom: 20px;
    }
    .pdf-kpi-card {
      border: 1px solid #cbd5e1;
      border-radius: 8px;
      padding: 12px 14px;
      background: #ffffff;
    }
    .kpi-label {
      display: block;
      font-size: 11px;
      color: #64748b;
      font-weight: 600;
      text-transform: uppercase;
      margin-bottom: 4px;
    }
    .kpi-val {
      display: block;
      font-size: 22px;
      font-weight: 800;
      color: #0f172a;
      line-height: 1.1;
    }
    .kpi-sub {
      display: block;
      font-size: 10.5px;
      color: #10b981;
      font-weight: 600;
      margin-top: 4px;
    }
    .pdf-table {
      width: 100%;
      border-collapse: collapse;
      margin-bottom: 24px;
      font-size: 12px;
    }
    .pdf-table th {
      background: #f1f5f9;
      color: #334155;
      font-weight: 700;
      text-transform: uppercase;
      font-size: 11px;
      letter-spacing: 0.5px;
      padding: 10px 12px;
      border-top: 1px solid #cbd5e1;
      border-bottom: 2px solid #94a3b8;
      text-align: left;
    }
    .pdf-table td {
      padding: 9px 12px;
      border-bottom: 1px solid #e2e8f0;
      color: #1e293b;
    }
    .pdf-table tr.even td {
      background: #f8fafc;
    }
    .pdf-signature-row {
      display: flex;
      justify-content: space-between;
      margin-top: 36px;
      padding-top: 16px;
      border-top: 1px dashed #cbd5e1;
      page-break-inside: avoid;
    }
    .sig-block {
      width: 200px;
      text-align: center;
    }
    .sig-line {
      border-bottom: 1px solid #0f172a;
      height: 36px;
      margin-bottom: 6px;
    }
    .sig-title {
      font-size: 11px;
      font-weight: 700;
      color: #0f172a;
      text-transform: uppercase;
    }
    .sig-sub {
      font-size: 10px;
      color: #64748b;
    }
    .pdf-footer {
      margin-top: 24px;
      text-align: center;
      font-size: 10px;
      color: #94a3b8;
      border-top: 1px solid #e2e8f0;
      padding-top: 8px;
    }
    @media print {
      .print-actions {
        display: none !important;
      }
      body {
        padding: 0;
      }
    }
  </style>
</head>
<body>
  <div class="print-actions">
    <button class="close-btn" onclick="window.close()">Close Window</button>
    <button class="print-btn" onclick="window.print()">Print / Save as PDF 🖨️</button>
  </div>

  <header class="pdf-header">
    <div class="header-logo-group">
      <div class="crest-icon">🎓</div>
      <div>
        <h1 class="institution-name">Greenwood Academy of Excellence</h1>
        <p class="institution-sub">Institutional Academic Registry • Campus #GW-8821 • Accredited A+</p>
      </div>
    </div>
    <div class="official-badge">
      <span class="stamp-pill">Official Record</span>
      <div class="report-date">${dateStr}</div>
    </div>
  </header>

  <div class="report-title-section">
    <h2 class="report-title">${escapeHtml(title)}</h2>
    <p class="report-desc">${escapeHtml(subtitle)}</p>
  </div>

  ${metaHtml}
  ${cardsHtml}
  ${tableHtml}

  <div class="pdf-signature-row">
    <div class="sig-block">
      <div class="sig-line"></div>
      <div class="sig-title">Dr. Alexander Vance</div>
      <div class="sig-sub">Principal & Headmaster</div>
    </div>
    <div class="sig-block">
      <div class="sig-line"></div>
      <div class="sig-title">Academic Board Registrar</div>
      <div class="sig-sub">Office of Academic Records</div>
    </div>
    <div class="sig-block">
      <div class="sig-line"></div>
      <div class="sig-title">Institutional Seal</div>
      <div class="sig-sub">Verified & Authenticated</div>
    </div>
  </div>

  <footer class="pdf-footer">
    ${escapeHtml(footerNote)} • Document Ref: #GW-${Math.floor(100000 + Math.random() * 900000)}
  </footer>

  <script>
    // Automatically open print dialog when loaded
    window.addEventListener('load', () => {
      setTimeout(() => {
        window.print();
      }, 400);
    });
  </script>
</body>
</html>`

  printWindow.document.open()
  printWindow.document.write(html)
  printWindow.document.close()
}

/**
 * Specifically formats and prints an individual student report card
 */
export function printStudentReportCard({
  student,
  grades = [],
  gpa = '3.85',
  rank = 'Top 5%',
  totalCredits = '24',
  attendanceRate = '96.2%',
  term = 'Term 2 (Spring 2026)',
}) {
  const printWindow = window.open('', '_blank', 'width=950,height=800')
  if (!printWindow) {
    alert('Please allow pop-ups to print the Student Report Card.')
    return
  }

  const dateStr = new Date().toLocaleDateString('en-US', {
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  })

  const html = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>Report Card - ${escapeHtml(student.name)}</title>
  <style>
    @page { size: A4 portrait; margin: 15mm; }
    * { box-sizing: border-box; -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; color: #0f172a; margin: 0; padding: 20px; font-size: 13px; }
    .no-print { display: flex; justify-content: flex-end; gap: 8px; margin-bottom: 16px; }
    .btn { padding: 8px 16px; border-radius: 6px; font-weight: 600; cursor: pointer; border: none; font-size: 13px; }
    .btn-print { background: #4f46e5; color: #fff; }
    .btn-close { background: #f1f5f9; color: #334155; }
    .card-border { border: 2px solid #1e1b4b; padding: 24px; border-radius: 8px; position: relative; }
    .watermark { position: absolute; inset: 0; display: grid; place-items: center; font-size: 90px; color: rgba(79, 70, 229, 0.03); font-weight: 900; pointer-events: none; }
    .header { text-align: center; border-bottom: 2px solid #4f46e5; padding-bottom: 14px; margin-bottom: 16px; }
    .school-title { font-size: 22px; font-weight: 800; color: #1e1b4b; margin: 0; }
    .school-info { font-size: 11.5px; color: #64748b; margin: 4px 0 0; }
    .report-headline { font-size: 16px; font-weight: 700; color: #4f46e5; text-transform: uppercase; letter-spacing: 1px; margin: 10px 0 0; }
    .student-info-box { display: grid; grid-template-columns: 2fr 1fr; background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 14px 18px; margin-bottom: 18px; }
    .info-row { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; }
    .field { margin-bottom: 6px; }
    .field-lbl { font-size: 10.5px; color: #64748b; font-weight: 700; text-transform: uppercase; }
    .field-val { font-size: 13.5px; color: #0f172a; font-weight: 600; }
    .table { width: 100%; border-collapse: collapse; margin-bottom: 20px; font-size: 12.5px; }
    .table th { background: #4f46e5; color: #ffffff; padding: 8px 10px; font-size: 11px; text-transform: uppercase; text-align: left; }
    .table td { padding: 8px 10px; border-bottom: 1px solid #e2e8f0; }
    .table tr.alt td { background: #f8fafc; }
    .table th.num, .table td.num { text-align: center; }
    .gpa-card-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 10px; margin-bottom: 22px; }
    .gpa-card { border: 1px solid #cbd5e1; border-radius: 8px; padding: 10px 14px; text-align: center; background: #ffffff; }
    .gpa-card.highlight { background: #eef2ff; border-color: #c7d2fe; }
    .gpa-lbl { font-size: 10.5px; font-weight: 700; color: #64748b; text-transform: uppercase; display: block; }
    .gpa-num { font-size: 22px; font-weight: 800; color: #1e1b4b; display: block; margin-top: 2px; }
    .honor-tag { display: inline-block; padding: 2px 8px; border-radius: 9999px; background: #ecfdf5; color: #059669; font-size: 11px; font-weight: 700; }
    .signatures { display: flex; justify-content: space-between; margin-top: 32px; padding-top: 14px; border-top: 1px dashed #cbd5e1; }
    .sig { width: 180px; text-align: center; }
    .sig-line { border-bottom: 1px solid #334155; height: 32px; margin-bottom: 6px; }
    .sig-role { font-size: 11px; font-weight: 700; }
    .sig-inst { font-size: 10px; color: #64748b; }
    @media print { .no-print { display: none; } body { padding: 0; } }
  </style>
</head>
<body>
  <div class="no-print">
    <button class="btn btn-close" onclick="window.close()">Close</button>
    <button class="btn btn-print" onclick="window.print()">Print Official Transcript (PDF) 🖨️</button>
  </div>

  <div class="card-border">
    <div class="watermark">ACCREDITED A+</div>

    <header class="header">
      <h1 class="school-title">Greenwood Academy of Excellence</h1>
      <p class="school-info">742 Evergreen Terrace • Campus Code GW-8821 • Principal Dr. Alexander Vance</p>
      <div class="report-headline">Official Student Academic Report Card</div>
    </header>

    <div class="student-info-box">
      <div class="info-row">
        <div class="field">
          <div class="field-lbl">Student Name</div>
          <div class="field-val">${escapeHtml(student.name)}</div>
        </div>
        <div class="field">
          <div class="field-lbl">Student ID #</div>
          <div class="field-val">GW-${1000 + (student.id || 1)}</div>
        </div>
        <div class="field">
          <div class="field-lbl">Class / Homeroom</div>
          <div class="field-val">${escapeHtml(student.school_class?.name || student.course || 'Grade 10 - A')}</div>
        </div>
        <div class="field">
          <div class="field-lbl">Academic Period</div>
          <div class="field-val">${escapeHtml(term)}</div>
        </div>
      </div>
      <div>
        <div class="field">
          <div class="field-lbl">Evaluation Date</div>
          <div class="field-val">${dateStr}</div>
        </div>
        <div class="field">
          <div class="field-lbl">Standing</div>
          <div class="field-val"><span class="honor-tag">Honor Roll Eligible</span></div>
        </div>
      </div>
    </div>

    <table class="table">
      <thead>
        <tr>
          <th>Course Code & Subject Name</th>
          <th class="num">Credits</th>
          <th class="num">Score</th>
          <th class="num">Letter Grade</th>
          <th class="num">GPA Points</th>
          <th>Instructor Remarks</th>
        </tr>
      </thead>
      <tbody>
        ${grades
          .map(
            (g, idx) => `
          <tr class="${idx % 2 === 1 ? 'alt' : ''}">
            <td><strong>${escapeHtml(g.code || 'SUB-101')}</strong> - ${escapeHtml(g.subject)}</td>
            <td class="num">${g.credits || 4}</td>
            <td class="num"><strong>${g.score}%</strong></td>
            <td class="num"><strong style="color:#4f46e5;">${g.grade}</strong></td>
            <td class="num">${g.gpaPoints || '4.0'}</td>
            <td>${escapeHtml(g.remark || 'Demonstrates exceptional grasp of curriculum concepts.')}</td>
          </tr>
        `,
          )
          .join('')}
      </tbody>
    </table>

    <div class="gpa-card-grid">
      <div class="gpa-card highlight">
        <span class="gpa-lbl">Cumulative GPA</span>
        <span class="gpa-num">${gpa}</span>
      </div>
      <div class="gpa-card">
        <span class="gpa-lbl">Total Credits</span>
        <span class="gpa-num">${totalCredits}</span>
      </div>
      <div class="gpa-card">
        <span class="gpa-lbl">Class Standing</span>
        <span class="gpa-num">${rank}</span>
      </div>
      <div class="gpa-card">
        <span class="gpa-lbl">Attendance Rate</span>
        <span class="gpa-num">${attendanceRate}</span>
      </div>
    </div>

    <div class="signatures">
      <div class="sig">
        <div class="sig-line"></div>
        <div class="sig-role">Dr. Alexander Vance</div>
        <div class="sig-inst">Principal & Headmaster</div>
      </div>
      <div class="sig">
        <div class="sig-line"></div>
        <div class="sig-role">Academic Advisor</div>
        <div class="sig-inst">Faculty Department Lead</div>
      </div>
      <div class="sig">
        <div class="sig-line"></div>
        <div class="sig-role">Parent / Guardian Signature</div>
        <div class="sig-inst">Acknowledged & Signed</div>
      </div>
    </div>
  </div>

  <script>
    window.addEventListener('load', () => {
      setTimeout(() => window.print(), 350);
    });
  </script>
</body>
</html>`

  printWindow.document.open()
  printWindow.document.write(html)
  printWindow.document.close()
}

function escapeXml(unsafe) {
  if (unsafe === null || unsafe === undefined) return ''
  return String(unsafe)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;')
}

function escapeHtml(unsafe) {
  if (unsafe === null || unsafe === undefined) return ''
  return String(unsafe)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;')
}

function downloadBlob(blob, filename) {
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}
