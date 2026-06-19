export type EmploymentType = "CDI" | "CDD" | "Self-Employed" | "Unemployed" | "Retired";
export type LoanPurpose = "Home" | "Auto" | "Education" | "Personal" | "Business" | "Debt Consolidation";
export type Decision = "Approve" | "Review" | "Decline";
export type RiskLevel = "Low" | "Medium" | "High";

export interface Applicant {
  id: string;
  name: string;
  monthlyIncome: number;
  existingDebt: number;
  loanAmount: number;
  loanDurationMonths: number;
  employmentType: EmploymentType;
  yearsEmployed: number;
  previousDefault: boolean;
  loanPurpose: LoanPurpose;
}

export interface Factor {
  label: string;
  impact: number; // positive = good, negative = bad
  detail: string;
}

export interface ScoreResult {
  riskScore: number; // 0-100, higher = safer
  probabilityOfDefault: number; // 0-1
  decision: Decision;
  riskLevel: RiskLevel;
  positives: Factor[];
  negatives: Factor[];
  dti: number;
  lti: number;
}

export function scoreApplicant(a: Applicant): ScoreResult {
  const positives: Factor[] = [];
  const negatives: Factor[] = [];

  // Debt-to-income (max ~20)
  const dti = a.monthlyIncome > 0 ? a.existingDebt / a.monthlyIncome : 5;
  let dtiPts = 0;
  if (dti < 0.2) { dtiPts = 20; positives.push({ label: "Low debt burden", impact: 20, detail: `DTI ${(dti*100).toFixed(0)}% is comfortable.` }); }
  else if (dti < 0.4) dtiPts = 12;
  else if (dti < 0.6) { dtiPts = 4; negatives.push({ label: "Elevated debt-to-income", impact: -8, detail: `DTI ${(dti*100).toFixed(0)}% reduces repayment capacity.` }); }
  else { dtiPts = -10; negatives.push({ label: "High debt-to-income", impact: -20, detail: `DTI ${(dti*100).toFixed(0)}% is risky.` }); }

  // Loan-to-income (annual) (max ~20)
  const annualIncome = Math.max(1, a.monthlyIncome * 12);
  const lti = a.loanAmount / annualIncome;
  let ltiPts = 0;
  if (lti < 0.5) { ltiPts = 20; positives.push({ label: "Small loan vs income", impact: 15, detail: `Loan is ${(lti*100).toFixed(0)}% of annual income.` }); }
  else if (lti < 1.5) ltiPts = 12;
  else if (lti < 3) { ltiPts = 2; negatives.push({ label: "Large loan vs income", impact: -10, detail: `Loan is ${lti.toFixed(1)}x annual income.` }); }
  else { ltiPts = -10; negatives.push({ label: "Loan far exceeds income", impact: -20, detail: `Loan is ${lti.toFixed(1)}x annual income.` }); }

  // Employment (max ~15)
  const empBase: Record<EmploymentType, number> = {
    "CDI": 12, "Retired": 9, "CDD": 6, "Self-Employed": 5, "Unemployed": -10,
  };
  let empPts = empBase[a.employmentType];
  const tenureBonus = Math.min(8, a.yearsEmployed);
  empPts += tenureBonus;
  if (a.employmentType === "CDI" && a.yearsEmployed >= 2) positives.push({ label: "Stable CDI employment", impact: 12, detail: `${a.yearsEmployed} years tenure.` });
  if (a.employmentType === "Unemployed") negatives.push({ label: "No active employment", impact: -10, detail: "Income stability is uncertain." });
  if (a.yearsEmployed < 1 && a.employmentType !== "Retired") negatives.push({ label: "Short employment history", impact: -5, detail: `${a.yearsEmployed} years on current job.` });

  // Previous default (max 15 pts swing)
  let defaultPts = a.previousDefault ? -20 : 15;
  if (a.previousDefault) negatives.push({ label: "Previous default on record", impact: -20, detail: "Historical default raises risk materially." });
  else positives.push({ label: "Clean repayment history", impact: 10, detail: "No prior defaults found." });

  // Loan duration sanity (small)
  const durPts = a.loanDurationMonths > 72 ? -3 : 2;

  const raw = 45 + dtiPts * 1.2 + ltiPts * 0.9 + empPts * 1.0 + defaultPts * 1.0 + durPts;
  const riskScore = Math.max(0, Math.min(100, Math.round(raw)));

  // Probability of default: logistic on (50 - riskScore)
  const x = (50 - riskScore) / 12;
  const probabilityOfDefault = 1 / (1 + Math.exp(-x));

  let riskLevel: RiskLevel;
  let decision: Decision;
  if (riskScore >= 80) { riskLevel = "Low"; decision = "Approve"; }
  else if (riskScore >= 50) { riskLevel = "Medium"; decision = "Review"; }
  else { riskLevel = "High"; decision = "Decline"; }

  return {
    riskScore,
    probabilityOfDefault,
    decision,
    riskLevel,
    positives: positives.sort((a, b) => b.impact - a.impact),
    negatives: negatives.sort((a, b) => a.impact - b.impact),
    dti,
    lti,
  };
}

export const SAMPLE_APPLICANTS: Applicant[] = [
  { id: "A-1001", name: "Youssef El Amrani", monthlyIncome: 12000, existingDebt: 1500, loanAmount: 120000, loanDurationMonths: 36, employmentType: "CDI", yearsEmployed: 6, previousDefault: false, loanPurpose: "Auto" },
  { id: "A-1002", name: "Salma Bennani", monthlyIncome: 4500, existingDebt: 2800, loanAmount: 180000, loanDurationMonths: 60, employmentType: "CDD", yearsEmployed: 1, previousDefault: true, loanPurpose: "Debt Consolidation" },
  { id: "A-1003", name: "Khalid Tazi", monthlyIncome: 22000, existingDebt: 3000, loanAmount: 900000, loanDurationMonths: 240, employmentType: "CDI", yearsEmployed: 10, previousDefault: false, loanPurpose: "Home" },
  { id: "A-1004", name: "Karim Benslimane", monthlyIncome: 9000, existingDebt: 1200, loanAmount: 70000, loanDurationMonths: 24, employmentType: "Self-Employed", yearsEmployed: 4, previousDefault: false, loanPurpose: "Business" },
  { id: "A-1005", name: "Imane Chraibi", monthlyIncome: 3200, existingDebt: 2200, loanAmount: 90000, loanDurationMonths: 48, employmentType: "Unemployed", yearsEmployed: 0, previousDefault: true, loanPurpose: "Personal" },
  { id: "A-1006", name: "Mehdi Alaoui", monthlyIncome: 15000, existingDebt: 1800, loanAmount: 200000, loanDurationMonths: 60, employmentType: "CDI", yearsEmployed: 8, previousDefault: false, loanPurpose: "Auto" },
  { id: "A-1007", name: "Nadia Haddad", monthlyIncome: 7500, existingDebt: 800, loanAmount: 60000, loanDurationMonths: 36, employmentType: "CDI", yearsEmployed: 3, previousDefault: false, loanPurpose: "Education" },
  { id: "A-1008", name: "Rachid Idrissi", monthlyIncome: 8500, existingDebt: 5200, loanAmount: 300000, loanDurationMonths: 72, employmentType: "CDD", yearsEmployed: 2, previousDefault: false, loanPurpose: "Personal" },
  { id: "A-1009", name: "Lina Berrada", monthlyIncome: 13500, existingDebt: 1100, loanAmount: 110000, loanDurationMonths: 36, employmentType: "CDI", yearsEmployed: 5, previousDefault: false, loanPurpose: "Auto" },
  { id: "A-1010", name: "Hamza Ouazzani", monthlyIncome: 4200, existingDebt: 3400, loanAmount: 150000, loanDurationMonths: 60, employmentType: "Self-Employed", yearsEmployed: 1, previousDefault: true, loanPurpose: "Debt Consolidation" },
  { id: "A-1011", name: "Chaimae Fassi", monthlyIncome: 18000, existingDebt: 1000, loanAmount: 250000, loanDurationMonths: 60, employmentType: "CDI", yearsEmployed: 7, previousDefault: false, loanPurpose: "Home" },
  { id: "A-1012", name: "Anas Sebti", monthlyIncome: 6000, existingDebt: 1600, loanAmount: 85000, loanDurationMonths: 36, employmentType: "CDD", yearsEmployed: 2, previousDefault: false, loanPurpose: "Education" },
];