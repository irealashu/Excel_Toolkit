export interface SpreadsheetTemplate {
  id: string;
  name: string;
  category: 'Finance' | 'Operations' | 'Project' | 'HR' | 'Sales';
  description: string;
  sheets: {
    name: string;
    headers: string[];
    rows: (string | number | boolean | null)[][];
  }[];
}

export const TEMPLATES: SpreadsheetTemplate[] = [
  {
    id: 'monthly-budget',
    name: 'Monthly Operating Budget',
    category: 'Finance',
    description: 'Category-level expense tracking, budgeted vs actual variances, and monthly savings calculation.',
    sheets: [
      {
        name: 'Budget_Overview',
        headers: ['Category', 'Subcategory', 'Budgeted ($)', 'Actual ($)', 'Variance ($)', 'Status'],
        rows: [
          ['Housing', 'Office Rent', 3500, 3500, 0, 'On Track'],
          ['Housing', 'Utilities & Internet', 450, 420, 30, 'Favorable'],
          ['Software', 'Cloud Infrastructure', 1800, 2150, -350, 'Over Budget'],
          ['Software', 'SaaS Licenses', 650, 600, 50, 'Favorable'],
          ['Payroll', 'Contract Engineering', 8500, 8500, 0, 'On Track'],
          ['Marketing', 'Digital Ads', 2500, 2750, -250, 'Over Budget'],
          ['Marketing', 'Content Creation', 1200, 950, 250, 'Favorable'],
          ['Travel', 'Client Visits', 1500, 1100, 400, 'Favorable'],
        ],
      },
    ],
  },
  {
    id: 'commercial-invoice',
    name: 'Commercial Invoice & Line Items',
    category: 'Finance',
    description: 'B2B billing invoice with itemized line items, tax rate computation, and total due.',
    sheets: [
      {
        name: 'Invoice_1042',
        headers: ['Item_No', 'Description', 'Quantity', 'Unit_Rate ($)', 'Total_Amount ($)', 'Taxable'],
        rows: [
          ['ITEM-01', 'Frontend Architecture Consulting', 40, 150, 6000, true],
          ['ITEM-02', 'High-Performance Grid Integration', 25, 160, 4000, true],
          ['ITEM-03', 'Automated Verification Suite Setup', 15, 140, 2100, true],
          ['ITEM-04', 'Documentation & Knowledge Transfer', 10, 120, 1200, false],
        ],
      },
    ],
  },
  {
    id: 'purchase-order',
    name: 'Purchase Order (PO)',
    category: 'Operations',
    description: 'Vendor procurement order with SKU tracking, delivery dates, and approval status.',
    sheets: [
      {
        name: 'PO_7721',
        headers: ['SKU', 'Part_Description', 'Vendor', 'Qty_Ordered', 'Unit_Cost ($)', 'Extended_Cost ($)', 'ETA'],
        rows: [
          ['HW-209', 'Rackmount Server Chassis 2U', 'SuperSys Supply', 4, 1250, 5000, '2026-11-15'],
          ['NW-401', 'Managed 10GbE Switch 24-Port', 'CiscoNet Pro', 2, 2800, 5600, '2026-11-18'],
          ['CB-105', 'Fiber Patch Cable 10m Multi-mode', 'OpticDirect', 50, 14, 700, '2026-11-10'],
        ],
      },
    ],
  },
  {
    id: 'expense-report',
    name: 'Employee Expense Report',
    category: 'Finance',
    description: 'Reimbursement log with receipt tracking, expense categories, and approval fields.',
    sheets: [
      {
        name: 'Expense_Claim',
        headers: ['Date', 'Merchant', 'Category', 'Purpose', 'Payment_Method', 'Amount ($)', 'Approved'],
        rows: [
          ['2026-10-02', 'United Airlines', 'Airfare', 'Client Onsite Summit', 'Corporate Card', 642.5, true],
          ['2026-10-03', 'Marriott Downtown', 'Lodging', 'Client Onsite Lodging (2 nights)', 'Corporate Card', 489.12, true],
          ['2026-10-03', 'Metro Cab Co', 'Ground Transport', 'Airport to Hotel Transfer', 'Personal Card', 45.0, true],
          ['2026-10-04', 'Bistro Verde', 'Meals', 'Dinner with Client Stakeholders', 'Corporate Card', 188.4, true],
        ],
      },
    ],
  },
  {
    id: 'inventory-stock',
    name: 'Inventory Stock & Reorder Tracker',
    category: 'Operations',
    description: 'Stock levels, warehouse bins, reorder points, and automated replenishment indicators.',
    sheets: [
      {
        name: 'Inventory',
        headers: ['Item_Code', 'Product_Name', 'Warehouse_Bin', 'Stock_On_Hand', 'Reorder_Point', 'Unit_Value ($)', 'Reorder_Needed'],
        rows: [
          ['INV-001', 'Wireless Ergonomic Keyboard', 'A-12-04', 142, 50, 65.0, false],
          ['INV-002', 'Precision Optical Mouse', 'A-12-05', 38, 50, 32.5, true],
          ['INV-003', 'USB-C Dual 4K Hub', 'B-03-01', 89, 30, 85.0, false],
          ['INV-004', '27-inch 4K IPS Monitor', 'C-01-08', 12, 25, 340.0, true],
          ['INV-005', 'Thunderbolt 4 Cable 2m', 'B-03-09', 240, 75, 24.0, false],
        ],
      },
    ],
  },
  {
    id: 'employee-timesheet',
    name: 'Weekly Employee Timesheet',
    category: 'HR',
    description: 'Daily hour tracking, regular hours, overtime breakdown, and task activity codes.',
    sheets: [
      {
        name: 'Timesheet_Week42',
        headers: ['Employee_Name', 'Project_Code', 'Mon (hrs)', 'Tue (hrs)', 'Wed (hrs)', 'Thu (hrs)', 'Fri (hrs)', 'Total_Hours'],
        rows: [
          ['Alex Rivera', 'PRJ-TOOLKIT', 8.0, 8.5, 8.0, 9.0, 7.5, 41.0],
          ['Devon Brooks', 'PRJ-FINANCE', 8.0, 8.0, 8.0, 8.0, 8.0, 40.0],
          ['Chloe Martin', 'PRJ-TOOLKIT', 7.5, 8.0, 8.5, 8.0, 8.0, 40.0],
          ['Liam Patel', 'PRJ-INFRA', 9.0, 9.0, 8.5, 8.0, 6.5, 41.0],
        ],
      },
    ],
  },
  {
    id: 'crm-contacts',
    name: 'Sales CRM & Lead Pipeline',
    category: 'Sales',
    description: 'Sales lead tracking with deal stages, estimated value, expected close date, and win probabilities.',
    sheets: [
      {
        name: 'Leads_Pipeline',
        headers: ['Lead_ID', 'Company_Name', 'Contact_Person', 'Deal_Stage', 'Deal_Value ($)', 'Win_Probability (%)', 'Expected_Close'],
        rows: [
          ['LEAD-501', 'Nordic Health Systems', 'Astrid Lind', 'Negotiation', 75000, 80, '2026-11-30'],
          ['LEAD-502', 'AeroDynamics Global', 'David Chen', 'Discovery', 120000, 30, '2026-12-15'],
          ['LEAD-503', 'FinTech Sentinel', 'Rachel Cohen', 'Proposal Sent', 45000, 60, '2026-11-20'],
          ['LEAD-504', 'Apex OmniCorp', 'Marcus Bell', 'Contract Review', 180000, 90, '2026-11-05'],
        ],
      },
    ],
  },
  {
    id: 'profit-and-loss',
    name: 'Profit & Loss (P&L) Statement',
    category: 'Finance',
    description: 'Quarterly revenue, COGS, operating expenses, and EBITDA net margin modeling.',
    sheets: [
      {
        name: 'Quarterly_PnL',
        headers: ['Financial_Metric', 'Q1 2026 ($)', 'Q2 2026 ($)', 'Q3 2026 ($)', 'Q4 Projected ($)', 'Full Year ($)'],
        rows: [
          ['Gross Revenue', 340000, 385000, 420000, 460000, 1605000],
          ['Cost of Goods Sold (COGS)', 85000, 92000, 105000, 115000, 397000],
          ['Gross Profit', 255000, 293000, 315000, 345000, 1208000],
          ['Operating Expenses (R&D)', 95000, 102000, 110000, 115000, 422000],
          ['Sales & Marketing', 60000, 68000, 75000, 80000, 283000],
          ['General & Administrative', 40000, 42000, 44000, 45000, 171000],
          ['Net Operating Income (EBIT)', 60000, 81000, 86000, 105000, 332000],
        ],
      },
    ],
  },
  {
    id: 'gantt-project-data',
    name: 'Gantt Chart & Milestone Schedule',
    category: 'Project',
    description: 'Task dependencies, assignees, progress percentage, start and completion dates.',
    sheets: [
      {
        name: 'Project_Schedule',
        headers: ['Task_ID', 'Task_Name', 'Assignee', 'Start_Date', 'End_Date', 'Duration (Days)', 'Percent_Complete', 'Predecessor'],
        rows: [
          ['TSK-1', 'Requirements Definition', 'Lead Architect', '2026-10-01', '2026-10-08', 7, 100, 'None'],
          ['TSK-2', 'Core Engine & Transforms', 'Sr. Engineer', '2026-10-09', '2026-10-18', 9, 100, 'TSK-1'],
          ['TSK-3', 'Spreadsheet Grid & Editor', 'UI Specialist', '2026-10-19', '2026-10-28', 9, 85, 'TSK-2'],
          ['TSK-4', 'End-to-End Automated Testing', 'QA Lead', '2026-10-29', '2026-11-04', 6, 40, 'TSK-3'],
          ['TSK-5', 'Production Release', 'DevOps Lead', '2026-11-05', '2026-11-06', 1, 0, 'TSK-4'],
        ],
      },
    ],
  },
  {
    id: 'amortization-schedule',
    name: 'Loan Amortization Schedule',
    category: 'Finance',
    description: 'Monthly principal and interest amortization breakdown with remaining loan balance.',
    sheets: [
      {
        name: 'Amortization',
        headers: ['Period (Month)', 'Beginning_Balance ($)', 'Monthly_Payment ($)', 'Principal ($)', 'Interest ($)', 'Ending_Balance ($)'],
        rows: [
          [1, 250000.0, 1610.46, 672.96, 937.5, 249327.04],
          [2, 249327.04, 1610.46, 675.49, 934.98, 248651.55],
          [3, 248651.55, 1610.46, 678.02, 932.44, 247973.53],
          [4, 247973.53, 1610.46, 680.56, 929.9, 247292.97],
          [5, 247292.97, 1610.46, 683.11, 927.35, 246609.86],
          [6, 246609.86, 1610.46, 685.67, 924.79, 245924.19],
        ],
      },
    ],
  },
  {
    id: 'payroll-calculator',
    name: 'Payroll & Withholding Calculator',
    category: 'HR',
    description: 'Gross salary, federal/state tax withholdings, retirement benefits, and net take-home pay.',
    sheets: [
      {
        name: 'Payroll_Summary',
        headers: ['Employee_ID', 'Employee_Name', 'Department', 'Gross_Pay ($)', 'Tax_Withholding ($)', 'Benefits ($)', 'Net_Pay ($)'],
        rows: [
          ['EMP-01', 'Sarah Jenkins', 'Engineering', 9500.0, 2375.0, 550.0, 6575.0],
          ['EMP-02', 'Marcus Vance', 'Product', 8800.0, 2200.0, 480.0, 6120.0],
          ['EMP-03', 'Elena Rostova', 'Design', 8200.0, 2050.0, 450.0, 5700.0],
          ['EMP-04', 'David Kim', 'Marketing', 7400.0, 1850.0, 420.0, 5130.0],
        ],
      },
    ],
  },
  {
    id: 'mileage-log',
    name: 'Vehicle Business Mileage Log',
    category: 'Operations',
    description: 'IRS standard mileage tracking for business travel, start/end odometer, and deduction values.',
    sheets: [
      {
        name: 'Mileage_Tracker',
        headers: ['Date', 'Vehicle', 'Destination / Client', 'Purpose', 'Start_Odo', 'End_Odo', 'Miles', 'Deduction ($)'],
        rows: [
          ['2026-10-05', '2024 Honda CR-V', 'TechHub Convention Center', 'Keynote Presentation', 14210, 14264, 54, 36.18],
          ['2026-10-08', '2024 Honda CR-V', 'Apex Labs Campus', 'Hardware Architecture Review', 14350, 14392, 42, 28.14],
          ['2026-10-12', '2024 Honda CR-V', 'Supplier Logistics Warehouse', 'Component Inspection', 14500, 14578, 78, 52.26],
        ],
      },
    ],
  },
  {
    id: 'rent-ledger',
    name: 'Property Rent & Lease Ledger',
    category: 'Finance',
    description: 'Tenant lease terms, monthly rent due, received date, payment method, and outstanding balance.',
    sheets: [
      {
        name: 'Tenant_Ledger',
        headers: ['Unit_No', 'Tenant_Name', 'Monthly_Rent ($)', 'Due_Date', 'Paid_Date', 'Amount_Paid ($)', 'Balance_Due ($)', 'Status'],
        rows: [
          ['101-A', 'Jonathan Green', 1950, '2026-10-01', '2026-09-30', 1950, 0, 'Paid On Time'],
          ['102-B', 'Miriam Al-Hassan', 2200, '2026-10-01', '2026-10-02', 2200, 0, 'Paid On Time'],
          ['201-A', 'Lucas Sterling', 1850, '2026-10-01', '2026-10-07', 1850, 0, 'Late Payment'],
          ['202-B', 'Aria Montgomery', 2400, '2026-10-01', null, 0, 2400, 'Overdue'],
        ],
      },
    ],
  },
];
