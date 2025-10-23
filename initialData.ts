import { Position } from './types';
import { SALARY_TO_TOTAL_SALARY_MULTIPLIER, TOTAL_SALARY_TO_OVERHEAD_MULTIPLIER, ANNUAL_BILLABLE_HOURS } from './constants';

const createPosition = (id: string, role: string, salary: number, rate: number, utilization: number, managerId: string | null): Position => {
    const totalSalary = salary * SALARY_TO_TOTAL_SALARY_MULTIPLIER;
    const overheadCost = totalSalary * TOTAL_SALARY_TO_OVERHEAD_MULTIPLIER;
    const totalCost = totalSalary + overheadCost;
    const revenue = rate * (utilization / 100) * ANNUAL_BILLABLE_HOURS;
    const profit = revenue - totalCost;
    const margin = revenue > 0 ? (profit / revenue) * 100 : 0;

    return { id, role, salary, rate, utilization, managerId, totalSalary, overheadCost, totalCost, revenue, profit, margin };
}

const ceo = 'ceo';
const coo = 'coo';
const cd = 'cd';
const dd = 'dd';
const dcs = 'dcs';

export const initialData: Position[] = [
    createPosition(ceo, 'CEO', 250000, 500, 20, null),
    createPosition(coo, 'COO', 200000, 400, 40, ceo),
    createPosition(cd, 'Creative Director', 160000, 300, 50, ceo),
    createPosition(dd, 'Development Director', 160000, 300, 60, coo),
    createPosition(dcs, 'Director of Client Services', 150000, 275, 55, coo),
    createPosition('ad', 'Art Director', 110000, 200, 75, cd),
    createPosition('sc', 'Senior Copywriter', 95000, 180, 80, cd),
    createPosition('ld', 'Lead Developer', 130000, 250, 85, dd),
    createPosition('sd', 'Senior Developer', 115000, 225, 90, dd),
    createPosition('pm', 'Project Manager', 90000, 175, 80, dcs),
    createPosition('am', 'Account Manager', 85000, 150, 70, dcs),
];
