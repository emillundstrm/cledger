export interface InjuryResponse {
    id: string;
    location: string;
    note: string | null;
}

export interface SessionResponse {
    id: string;
    date: string;
    types: string[];
    intensity: string;
    performance: string;
    productivity: string;
    durationMinutes: number | null;
    notes: string | null;
    maxGrade: string | null;
    venue: string | null;
    injuries: InjuryResponse[];
    createdAt: string;
    updatedAt: string;
}

export interface InjuryRequest {
    location: string;
    note?: string;
}

export interface SessionRequest {
    date: string;
    types: string[];
    intensity: string;
    performance: string;
    productivity: string;
    durationMinutes?: number;
    notes?: string;
    maxGrade?: string;
    venue?: string;
    injuries?: InjuryRequest[];
}

export interface PainFlagCount {
    location: string;
    count: number;
}

export interface WeeklySessionCount {
    weekStart: string;
    count: number;
}

export interface WeeklyTrend {
    weekStart: string;
    average: number | null;
}

export interface InsightResponse {
    id: string;
    content: string;
    pinned: boolean;
    createdAt: string;
    updatedAt: string;
}

export interface InsightRequest {
    content: string;
    pinned: boolean;
}

export interface AnalyticsResponse {
    sessionsThisWeek: number;
    hardSessionsLast7Days: number;
    daysSinceLastRestDay: number;
    painFlagsLast30Days: PainFlagCount[];
    weeklySessionCounts: WeeklySessionCount[];
    performanceTrend: WeeklyTrend[];
    productivityTrend: WeeklyTrend[];
}
