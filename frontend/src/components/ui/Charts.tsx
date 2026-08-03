'use client';

import * as React from 'react';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  BarChart,
  Bar,
  Cell,
  PieChart,
  Pie,
} from 'recharts';
import { cn } from '@/lib/utils';
import { Card } from './Card';

export function ChartTooltip({ active, payload, label, formatter }: any) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-xl border border-border bg-card px-3.5 py-2.5 shadow-card">
      {label && <p className="mb-1.5 text-xs font-semibold text-muted-foreground">{label}</p>}
      {payload.map((entry: any, i: number) => (
        <div key={i} className="flex items-center gap-2 text-sm">
          <span className="h-2 w-2 rounded-full" style={{ background: entry.color || entry.fill }} />
          <span className="text-muted-foreground">{entry.name}:</span>
          <span className="font-semibold">{formatter ? formatter(entry.value, entry) : entry.value}</span>
        </div>
      ))}
    </div>
  );
}

export function RevenueAreaChart({ data, height = 280, formatter }: {
  data: Array<{ date: string; revenue?: number; sales?: number; [k: string]: any }>;
  height?: number;
  formatter?: (v: number) => string;
}) {
  return (
    <ResponsiveContainer width="100%" height={height}>
      <AreaChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
        <defs>
          <linearGradient id="rev" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#eb2027" stopOpacity={0.35} />
            <stop offset="100%" stopColor="#eb2027" stopOpacity={0} />
          </linearGradient>
          <linearGradient id="sales" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#06b6d4" stopOpacity={0.3} />
            <stop offset="100%" stopColor="#06b6d4" stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
        <XAxis
          dataKey="date"
          tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }}
          tickLine={false}
          axisLine={false}
          tickFormatter={(v: string) => (data.length > 8 ? v.slice(5) : v)}
          interval="preserveStartEnd"
        />
        <YAxis
          tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }}
          tickLine={false}
          axisLine={false}
          width={46}
          tickFormatter={(v: number) => (formatter ? formatter(v) : String(v))}
        />
        <Tooltip content={<ChartTooltip formatter={(v: number) => (formatter ? formatter(v) : v)} />} />
        {data.some((d) => d.revenue !== undefined) && (
          <Area type="monotone" dataKey="revenue" name="Revenue" stroke="#eb2027" strokeWidth={2.5} fill="url(#rev)" />
        )}
        {data.some((d) => d.sales !== undefined) && (
          <Area type="monotone" dataKey="sales" name="Sales" stroke="#06b6d4" strokeWidth={2} fill="url(#sales)" />
        )}
      </AreaChart>
    </ResponsiveContainer>
  );
}

const PIE_COLORS = ['#eb2027', '#06b6d4', '#10b981', '#f59e0b', '#e11d48', '#6366f1', '#3b82f6', '#14b8a6'];

export function DonutChart({ data, height = 260, centerLabel, centerValue, formatter }: {
  data: Array<{ name: string; value: number }>;
  height?: number;
  centerLabel?: string;
  centerValue?: React.ReactNode;
  formatter?: (v: number) => string;
}) {
  return (
    <div className="relative" style={{ height }}>
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Tooltip content={<ChartTooltip formatter={(v: number) => (formatter ? formatter(v) : v)} />} />
          <Pie
            data={data}
            dataKey="value"
            nameKey="name"
            cx="50%"
            cy="50%"
            innerRadius="62%"
            outerRadius="88%"
            paddingAngle={2}
            strokeWidth={0}
          >
            {data.map((_, i) => (
              <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
            ))}
          </Pie>
        </PieChart>
      </ResponsiveContainer>
      {(centerLabel || centerValue) && (
        <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
          {centerValue && <div className="font-display text-2xl font-bold">{centerValue}</div>}
          {centerLabel && <div className="text-xs text-muted-foreground">{centerLabel}</div>}
        </div>
      )}
    </div>
  );
}

export function BarsChart({ data, height = 260, dataKey = 'value', name, formatter, colors }: {
  data: Array<Record<string, any>>;
  height?: number;
  dataKey?: string;
  name?: string;
  formatter?: (v: number) => string;
  colors?: string[];
}) {
  return (
    <ResponsiveContainer width="100%" height={height}>
      <BarChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
        <XAxis dataKey="name" tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }} tickLine={false} axisLine={false} interval={0} />
        <YAxis tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }} tickLine={false} axisLine={false} width={40} tickFormatter={(v: number) => (formatter ? formatter(v) : String(v))} />
        <Tooltip content={<ChartTooltip formatter={(v: number) => (formatter ? formatter(v) : v)} />} />
        <Bar dataKey={dataKey} name={name} radius={[6, 6, 0, 0]} maxBarSize={34}>
          {data.map((entry, i) => (
            <Cell key={i} fill={(colors && colors[i % colors.length]) || PIE_COLORS[i % PIE_COLORS.length]} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}

export function ChartCard({ title, subtitle, action, children, className }: {
  title: string; subtitle?: string; action?: React.ReactNode; children: React.ReactNode; className?: string;
}) {
  return (
    <Card className={cn('p-5', className)}>
      <div className="mb-4 flex items-start justify-between gap-3">
        <div>
          <h3 className="font-display text-sm font-bold">{title}</h3>
          {subtitle && <p className="mt-0.5 text-xs text-muted-foreground">{subtitle}</p>}
        </div>
        {action}
      </div>
      {children}
    </Card>
  );
}
