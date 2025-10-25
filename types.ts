

export interface Position {
  id: string;
  role: string;
  managerId: string | null;

  // User Inputs
  salary: number;
  rate: number;
  utilization: number; // percentage

  // Calculated
  totalSalary: number;
  overheadCost: number;
  totalCost: number;
  revenue: number;
  profit: number;
  margin: number; // percentage
}

export type PositionInput = Omit<Position, 'id' | 'totalSalary' | 'overheadCost' | 'totalCost' | 'revenue' | 'profit' | 'margin'>;
export type PositionUpdate = Omit<Position, 'totalSalary' | 'overheadCost' | 'totalCost' | 'revenue' | 'profit' | 'margin'>;

export interface TreeNode extends Position {
  children: TreeNode[];
  depth: number;
}

export interface AIAnalysisResult {
  strengths: string[];
  risks_opportunities: string[];
  key_observations: string[];
}
