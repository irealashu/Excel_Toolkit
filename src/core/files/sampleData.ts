import * as XLSX from 'xlsx';
import { WorkbookData } from '../../registry/types';

export const SAMPLE_WORKBOOK: WorkbookData = {
  fileName: 'Company_Sales_Q3_Sample.xlsx',
  fileSizeBytes: 42560,
  activeSheetIndex: 0,
  metadata: {
    author: 'Finance & Analytics Ops',
    created: '2026-09-30',
    modified: '2026-10-15',
    application: 'Microsoft Excel 365',
    hasMacros: false,
  },
  sheets: [
    {
      name: 'Orders_Summary',
      headers: ['Order_ID', 'Customer_Name', 'Region', 'Product_Category', 'Quantity', 'Unit_Price', 'Total_Revenue', 'Order_Status'],
      rows: [
        ['ORD-9021', 'Apex Cloud Tech', 'North America', 'Enterprise Software', 5, 1200, 6000, 'Completed'],
        ['ORD-9022', 'Zenith Logistics', 'Europe', 'Cloud Hardware', 12, 350, 4200, 'Processing'],
        ['ORD-9023', 'BioHealth Pharma', 'Asia Pacific', 'Analytics Suite', 3, 2400, 7200, 'Completed'],
        ['ORD-9021', 'Apex Cloud Tech', 'North America', 'Enterprise Software', 5, 1200, 6000, 'Completed'],
        ['ORD-9025', 'Summit Retail Corp', 'North America', 'POS Terminals', 20, 180, 3600, 'Shipped'],
        ['ORD-9026', 'Solaria Energy', 'Latin America', 'Solar Telemetry', 8, 850, 6800, 'Completed'],
        ['ORD-9027', 'Quantum Labs', 'Europe', 'Analytics Suite', 4, 2400, 9600, 'Processing'],
        ['ORD-9028', 'Pacific Maritime', 'Asia Pacific', 'Fleet Tracking', 15, 420, 6300, 'Completed'],
        ['ORD-9029', 'Vanguard Finance', 'North America', 'Compliance Module', 2, 4500, 9000, 'Completed'],
        ['ORD-9030', 'Nova Media Group', 'Europe', 'Video Streamer Pro', 10, 290, 2900, 'Cancelled'],
        ['ORD-9031', 'Starlight Hospitality', 'North America', 'POS Terminals', 6, 180, 1080, 'Completed'],
        ['ORD-9032', 'Helios Robotics', 'Asia Pacific', 'Automation Node', 7, 1950, 13650, 'Completed'],
      ],
      totalRows: 12,
      totalCols: 8,
    },
    {
      name: 'Customer_Contacts',
      headers: ['Customer_ID', 'Company_Name', 'Primary_Contact', 'Email', 'Phone', 'Country'],
      rows: [
        ['CUST-101', 'Apex Cloud Tech', 'Sarah Jenkins', 's.jenkins@apexcloud.io', '+1-415-555-0199', 'United States'],
        ['CUST-102', 'Zenith Logistics', 'Marcus Vance', 'mvance@zenithlogistics.de', '+49-30-555-012', 'Germany'],
        ['CUST-103', 'BioHealth Pharma', 'Dr. Lin Wei', 'lin.wei@biohealth.sg', '+65-6789-0123', 'Singapore'],
        ['CUST-104', 'Summit Retail Corp', 'Elena Rostova', 'elena@summitretail.com', '+1-212-555-0177', 'United States'],
        ['CUST-105', 'Solaria Energy', 'Carlos Mendes', 'cmendes@solariaenergy.br', '+55-11-555-0144', 'Brazil'],
      ],
      totalRows: 5,
      totalCols: 6,
    },
    {
      name: 'Project_Schedule',
      headers: ['Event_Title', 'Start_Date', 'End_Date', 'Location', 'Description'],
      rows: [
        ['Q4 Budget Kickoff', '2026-12-01T09:00:00Z', '2026-12-01T10:30:00Z', 'Boardroom A', 'Quarterly operating budget review'],
        ['Data Pipeline Audit', '2026-12-04T14:00:00Z', '2026-12-04T15:30:00Z', 'Online Meeting', 'Review workbook security controls'],
        ['Release Freeze', '2026-12-10T17:00:00Z', '2026-12-10T18:00:00Z', 'Engineering Hub', 'Final QA sign-off before deployment'],
        ['Executive Quarterly Review', '2026-12-15T10:00:00Z', '2026-12-15T12:00:00Z', 'Conference Hall', 'Present Q4 metrics and forecast'],
      ],
      totalRows: 4,
      totalCols: 5,
    },
  ],
};

export function cloneSampleWorkbook(activeSheetIndex = 0): WorkbookData {
  const cloned = JSON.parse(JSON.stringify(SAMPLE_WORKBOOK)) as WorkbookData;
  cloned.activeSheetIndex = activeSheetIndex;
  return cloned;
}

// Synthesize a real binary XLSX File in memory for instant security inspection testing
export function createSampleXlsxFile(): File {
  const wb = XLSX.utils.book_new();
  (wb.Props as Record<string, unknown>) = {
    Author: 'Sarah Jenkins',
    Company: 'Apex Analytics Corp',
    Application: 'Microsoft Excel 365',
    Title: 'Q3 Financial Summary',
  };

  for (const sheet of SAMPLE_WORKBOOK.sheets) {
    const ws = XLSX.utils.aoa_to_sheet([sheet.headers, ...sheet.rows]);
    XLSX.utils.book_append_sheet(wb, ws, sheet.name);
  }

  // Mark the 3rd sheet as hidden to demonstrate hidden-sheet detection
  wb.Workbook = {
    Sheets: [
      { name: 'Orders_Summary', Hidden: 0 },
      { name: 'Customer_Contacts', Hidden: 0 },
      { name: 'Project_Schedule', Hidden: 1 },
    ],
  };

  const arrayBuf = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
  return new File([arrayBuf], 'Company_Sales_Q3_Audit_Sample.xlsx', {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  });
}
