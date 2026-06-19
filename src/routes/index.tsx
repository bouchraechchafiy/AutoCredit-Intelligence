import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import {
  BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Legend,
} from "recharts";
import {
  scoreApplicant, SAMPLE_APPLICANTS,
  type Applicant, type EmploymentType, type LoanPurpose,
} from "@/lib/credit-scoring";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "AutoCredit Intelligence — Risk Scoring & Portfolio" },
      { name: "description", content: "Score loan applicants, explain why they are risky, and view portfolio exposure." },
      { property: "og:title", content: "AutoCredit Intelligence" },
      { property: "og:description", content: "Credit risk scoring with explainability and a portfolio dashboard." },
    ],
  }),
  component: Index,
});

const DEFAULT_APPLICANT: Applicant = {
  id: "NEW",
  name: "Nouveau Demandeur",
  monthlyIncome: 9000,
  existingDebt: 1500,
  loanAmount: 80000,
  loanDurationMonths: 36,
  employmentType: "CDI",
  yearsEmployed: 4,
  previousDefault: false,
  loanPurpose: "Auto",
};

function decisionColor(d: string) {
  if (d === "Approve") return "bg-emerald-100 text-emerald-800 border-emerald-200";
  if (d === "Review") return "bg-amber-100 text-amber-800 border-amber-200";
  return "bg-rose-100 text-rose-800 border-rose-200";
}

function Index() {
  const [applicant, setApplicant] = useState<Applicant>(DEFAULT_APPLICANT);
  const result = useMemo(() => scoreApplicant(applicant), [applicant]);

  const portfolio = useMemo(() => {
    const current = { ...applicant, id: applicant.id === "NEW" ? "NEW" : applicant.id };
    const others = SAMPLE_APPLICANTS.filter((a) => a.id !== current.id);
    const all = [current, ...others];
    return all.map((a) => ({ applicant: a, score: scoreApplicant(a) }));
  }, [applicant]);

  const stats = useMemo(() => {
    const total = portfolio.length;
    const approved = portfolio.filter((p) => p.score.decision === "Approve").length;
    const review = portfolio.filter((p) => p.score.decision === "Review").length;
    const declined = portfolio.filter((p) => p.score.decision === "Decline").length;
    const avgScore = portfolio.reduce((s, p) => s + p.score.riskScore, 0) / total;
    const avgPd = portfolio.reduce((s, p) => s + p.score.probabilityOfDefault, 0) / total;
    return { total, approved, review, declined, avgScore, avgPd };
  }, [portfolio]);

  const riskDist = useMemo(() => {
    const buckets = { Low: 0, Medium: 0, High: 0 } as Record<string, number>;
    portfolio.forEach((p) => { buckets[p.score.riskLevel]++; });
    return Object.entries(buckets).map(([name, value]) => ({ name, value }));
  }, [portfolio]);

  const byPurpose = useMemo(() => {
    const m: Record<string, number> = {};
    portfolio.forEach((p) => { m[p.applicant.loanPurpose] = (m[p.applicant.loanPurpose] ?? 0) + 1; });
    return Object.entries(m).map(([name, count]) => ({ name, count }));
  }, [portfolio]);

  const byEmployment = useMemo(() => {
    const m: Record<string, number> = {};
    portfolio.forEach((p) => { m[p.applicant.employmentType] = (m[p.applicant.employmentType] ?? 0) + 1; });
    return Object.entries(m).map(([name, count]) => ({ name, count }));
  }, [portfolio]);

  const RISK_COLORS: Record<string, string> = { Low: "#10b981", Medium: "#f59e0b", High: "#ef4444" };


  function update<K extends keyof Applicant>(key: K, value: Applicant[K]) {
    setApplicant((prev) => ({ ...prev, [key]: value }));
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b bg-card">
        <div className="mx-auto max-w-7xl px-6 py-5 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">AutoCredit Intelligence</h1>
            <p className="text-sm text-muted-foreground">Credit risk scoring · explainability · portfolio dashboard</p>
          </div>
          <Badge variant="outline" className="text-xs">Demo · synthetic data</Badge>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-6 py-8 space-y-8">
        {/* Scoring */}
        <section className="grid grid-cols-1 lg:grid-cols-5 gap-6">
          <Card className="lg:col-span-2">
            <CardHeader>
              <CardTitle>Applicant</CardTitle>
              <CardDescription>Enter loan and borrower details</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <Field label="Name">
                  <Input value={applicant.name} onChange={(e) => update("name", e.target.value)} />
                </Field>
                <Field label="Monthly Income (MAD)">
                  <Input type="number" value={applicant.monthlyIncome} onChange={(e) => update("monthlyIncome", +e.target.value)} />
                </Field>
                <Field label="Existing Monthly Debt (MAD)">
                  <Input type="number" value={applicant.existingDebt} onChange={(e) => update("existingDebt", +e.target.value)} />
                </Field>
                <Field label="Loan Amount (MAD)">
                  <Input type="number" value={applicant.loanAmount} onChange={(e) => update("loanAmount", +e.target.value)} />
                </Field>
                <Field label="Loan Duration (months)">
                  <Input type="number" value={applicant.loanDurationMonths} onChange={(e) => update("loanDurationMonths", +e.target.value)} />
                </Field>
                <Field label="Employment Type">
                  <Select value={applicant.employmentType} onValueChange={(v) => update("employmentType", v as EmploymentType)}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {(["CDI","CDD","Self-Employed","Unemployed","Retired"] as EmploymentType[]).map((t) => (
                        <SelectItem key={t} value={t}>{t}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </Field>
                <Field label="Years Employed">
                  <Input type="number" value={applicant.yearsEmployed} onChange={(e) => update("yearsEmployed", +e.target.value)} />
                </Field>
                <Field label="Loan Purpose">
                  <Select value={applicant.loanPurpose} onValueChange={(v) => update("loanPurpose", v as LoanPurpose)}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {(["Home","Auto","Education","Personal","Business","Debt Consolidation"] as LoanPurpose[]).map((t) => (
                        <SelectItem key={t} value={t}>{t}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </Field>
                <div className="flex items-end gap-3">
                  <Switch id="pd" checked={applicant.previousDefault} onCheckedChange={(v) => update("previousDefault", v)} />
                  <Label htmlFor="pd">Previous default</Label>
                </div>
              </div>
              <Button variant="outline" className="w-full" onClick={() => setApplicant(DEFAULT_APPLICANT)}>Reset</Button>
            </CardContent>
          </Card>

          <Card className="lg:col-span-3">
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>Decision & Explainability</CardTitle>
                <CardDescription>Why this applicant is risky or safe</CardDescription>
              </div>
              <Badge className={`text-sm px-3 py-1 border ${decisionColor(result.decision)}`}>{result.decision}</Badge>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-3 gap-4">
                <Metric label="Risk Score" value={`${result.riskScore}`} sub={`${result.riskLevel} Risk`} />
                <Metric label="Probability of Default" value={`${(result.probabilityOfDefault * 100).toFixed(1)}%`} sub="Likelihood to miss repayment" />
                <Metric label="Debt-to-Income" value={`${(result.dti * 100).toFixed(0)}%`} sub={`Loan is ${result.lti.toFixed(1)}× annual income`} />
              </div>
              <div>
                <div className="flex justify-between text-xs text-muted-foreground mb-1">
                  <span>0 — High Risk</span><span>100 — Low Risk</span>
                </div>
                <Progress value={result.riskScore} />
              </div>

              <Separator />

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <h4 className="text-sm font-semibold text-emerald-700 mb-2">Positive factors</h4>
                  <ul className="space-y-2">
                    {result.positives.length === 0 && <li className="text-sm text-muted-foreground">None detected.</li>}
                    {result.positives.map((f, i) => (
                      <li key={i} className="text-sm border-l-2 border-emerald-400 pl-3">
                        <div className="font-medium">{f.label}</div>
                        <div className="text-muted-foreground text-xs">{f.detail}</div>
                      </li>
                    ))}
                  </ul>
                </div>
                <div>
                  <h4 className="text-sm font-semibold text-rose-700 mb-2">Risk factors</h4>
                  <ul className="space-y-2">
                    {result.negatives.length === 0 && <li className="text-sm text-muted-foreground">None detected.</li>}
                    {result.negatives.map((f, i) => (
                      <li key={i} className="text-sm border-l-2 border-rose-400 pl-3">
                        <div className="font-medium">{f.label}</div>
                        <div className="text-muted-foreground text-xs">{f.detail}</div>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </CardContent>
          </Card>
        </section>

        {/* Portfolio */}
        <section className="space-y-4">
          <div>
            <h2 className="text-xl font-semibold">Portfolio Overview</h2>
            <p className="text-sm text-muted-foreground">Aggregated view across {stats.total} applications.</p>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
            <StatCard label="Total" value={stats.total} />
            <StatCard label="Approved" value={stats.approved} tone="emerald" />
            <StatCard label="Review" value={stats.review} tone="amber" />
            <StatCard label="Declined" value={stats.declined} tone="rose" />
            <StatCard label="Avg Risk Score" value={stats.avgScore.toFixed(1)} />
            <StatCard label="Avg PD" value={`${(stats.avgPd * 100).toFixed(1)}%`} />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <ChartCard title="Risk Distribution">
              <ResponsiveContainer width="100%" height={240}>
                <PieChart>
                  <Pie data={riskDist} dataKey="value" nameKey="name" outerRadius={80} label>
                    {riskDist.map((d) => <Cell key={d.name} fill={RISK_COLORS[d.name]} />)}
                  </Pie>
                  <Tooltip />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            </ChartCard>

            <ChartCard title="Applications by Loan Purpose">
              <ResponsiveContainer width="100%" height={240}>
                <BarChart data={byPurpose}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                  <YAxis allowDecimals={false} />
                  <Tooltip />
                  <Bar dataKey="count" fill="#4f46e5" />
                </BarChart>
              </ResponsiveContainer>
            </ChartCard>

            <ChartCard title="Applications by Employment Type">
              <ResponsiveContainer width="100%" height={240}>
                <BarChart data={byEmployment}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                  <YAxis allowDecimals={false} />
                  <Tooltip />
                  <Bar dataKey="count" fill="#0891b2" />
                </BarChart>
              </ResponsiveContainer>
            </ChartCard>
          </div>

          <Card>
            <CardHeader><CardTitle>Applications</CardTitle></CardHeader>
            <CardContent className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="text-left text-muted-foreground border-b">
                  <tr>
                    <th className="py-2 pr-3">ID</th>
                    <th className="py-2 pr-3">Name</th>
                    <th className="py-2 pr-3">Purpose</th>
                    <th className="py-2 pr-3">Loan MAD</th>
                    <th className="py-2 pr-3">Income MAD</th>
                    <th className="py-2 pr-3">Score</th>
                    <th className="py-2 pr-3">PD</th>
                    <th className="py-2 pr-3">Decision</th>
                  </tr>
                </thead>
                <tbody>
                  {portfolio.map(({ applicant: a, score: s }) => (
                    <tr key={a.id} className="border-b last:border-0 hover:bg-muted/40 cursor-pointer" onClick={() => setApplicant(a)}>
                      <td className="py-2 pr-3 font-mono text-xs">{a.id}</td>
                      <td className="py-2 pr-3">{a.name}</td>
                      <td className="py-2 pr-3">{a.loanPurpose}</td>
                      <td className="py-2 pr-3">{a.loanAmount.toLocaleString()}</td>
                      <td className="py-2 pr-3">{a.monthlyIncome.toLocaleString()}</td>
                      <td className="py-2 pr-3 font-semibold">{s.riskScore}</td>
                      <td className="py-2 pr-3">{(s.probabilityOfDefault * 100).toFixed(1)}%</td>
                      <td className="py-2 pr-3"><Badge className={`border ${decisionColor(s.decision)}`}>{s.decision}</Badge></td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <p className="text-xs text-muted-foreground mt-3">Click a row to load that applicant into the scoring panel.</p>
            </CardContent>
          </Card>
        </section>
      </main>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1">
      <Label className="text-xs">{label}</Label>
      {children}
    </div>
  );
}

function Metric({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div className="rounded-lg border p-3 bg-card">
      <div className="text-xs text-muted-foreground">{label}</div>
      <div className="text-2xl font-bold mt-1">{value}</div>
      {sub && <div className="text-xs text-muted-foreground mt-1">{sub}</div>}
    </div>
  );
}

function StatCard({ label, value, tone }: { label: string; value: string | number; tone?: "emerald" | "amber" | "rose" }) {
  const toneCls =
    tone === "emerald" ? "text-emerald-700" :
    tone === "amber" ? "text-amber-700" :
    tone === "rose" ? "text-rose-700" : "text-foreground";
  return (
    <div className="rounded-lg border bg-card p-4">
      <div className="text-xs text-muted-foreground">{label}</div>
      <div className={`text-2xl font-bold mt-1 ${toneCls}`}>{value}</div>
    </div>
  );
}

function ChartCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <Card>
      <CardHeader className="pb-2"><CardTitle className="text-base">{title}</CardTitle></CardHeader>
      <CardContent>{children}</CardContent>
    </Card>
  );
}
