
import React, { useState, useMemo, useCallback, useRef, useEffect } from 'react';
// FIX: import Variants to fix framer-motion type errors
import { motion, AnimatePresence, Variants } from 'framer-motion';
import html2canvas from 'html2canvas';
import { Position, PositionInput, PositionUpdate, TreeNode, AIAnalysisResult } from './types';
import { initialData } from './initialData';
import SummaryTable from './components/SummaryTable';
import PositionEditor from './components/PositionEditor';
import OrgChart from './components/OrgChart';
import OrgChartListView from './components/OrgChartListView';
import AIAnalysis from './components/AIAnalysis';
import { useAuth } from './auth';
import StickyHeader from './components/StickyHeader';

const POSITIONS_STORAGE_KEY = 'teamledger-positions';
const SETTINGS_STORAGE_KEY = 'teamledger-settings';
const MAX_HISTORY_SIZE = 30;

const calculateFinancials = (
  positionInput: { salary: number; rate: number; utilization: number; },
  benefitsMultiplier: number,
  overheadMultiplier: number,
  annualBillableHours: number,
): Pick<Position, 'totalSalary' | 'overheadCost' | 'totalCost' | 'revenue' | 'profit' | 'margin'> => {
  const totalSalary = positionInput.salary * benefitsMultiplier;
  const overheadCost = totalSalary * overheadMultiplier;
  const totalCost = totalSalary + overheadCost;
  const revenue = positionInput.rate * (positionInput.utilization / 100) * annualBillableHours;
  const profit = revenue - totalCost;
  const margin = revenue > 0 ? (profit / revenue) * 100 : (totalCost > 0 ? -100 : 0);

  return { totalSalary, overheadCost, totalCost, revenue, profit, margin };
};

const PlusIcon: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" {...props}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
    </svg>
);

const InformationCircleIcon: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (
  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" {...props}>
    <path strokeLinecap="round" strokeLinejoin="round" d="m11.25 11.25.041-.02a.75.75 0 0 1 1.063.852l-.708 2.836a.75.75 0 0 0 1.063.853l.041-.021M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Zm-9-3.75h.008v.008H12V8.25Z" />
  </svg>
);

const QuestionMarkCircleIcon: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" {...props}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M9.879 7.519c1.171-1.025 3.071-1.025 4.242 0 1.172 1.025 1.172 2.687 0 3.712-.203.179-.43.326-.67.442-.745.361-1.45.999-1.45 1.827v.75M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Zm-9 5.25h.008v.008H12v-.008Z" />
    </svg>
);

const ChevronDownIcon: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (
  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" {...props}>
    <path strokeLinecap="round" strokeLinejoin="round" d="m19.5 8.25-7.5 7.5-7.5-7.5" />
  </svg>
);

const ArrowPathIcon: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" {...props}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M16.023 9.348h4.992v-.001M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
        <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 12c0-2.22-1.01-4.22-2.63-5.63" />
    </svg>
);

const ArrowUpTrayIcon: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" {...props}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75V16.5m-13.5-9L12 3m0 0 4.5 4.5M12 3v13.5" />
    </svg>
);

const DocumentArrowDownIcon: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" {...props}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 0 0-3.375-3.375h-1.5A1.125 1.125 0 0 1 13.5 7.125v-1.5a3.375 3.375 0 0 0-3.375-3.375H8.25m.75 12 3 3m0 0 3-3m-3 3v-6m-1.5-9H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 0 0-9-9Z" />
    </svg>
);

const PhotoIcon: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" {...props}>
        <path strokeLinecap="round" strokeLinejoin="round" d="m2.25 15.75 5.159-5.159a2.25 2.25 0 0 1 3.182 0l5.159 5.159m-1.5-1.5 1.409-1.409a2.25 2.25 0 0 1 3.182 0l2.909 2.909m-18 3.75h16.5a1.5 1.5 0 0 0 1.5-1.5V6a1.5 1.5 0 0 0-1.5-1.5H3.75A1.5 1.5 0 0 0 2.25 6v12a1.5 1.5 0 0 0 1.5 1.5Zm10.5-11.25h.008v.008h-.008V8.25Zm.375 0a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Z" />
    </svg>
);

const TrashIcon: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" {...props}>
        <path strokeLinecap="round" strokeLinejoin="round" d="m14.74 9-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 0 1-2.244 2.077H8.084a2.25 2.25 0 0 1-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 0 0-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 0 1 3.478-.397m7.5 0v-.916c0-1.18-.91-2.134-2.09-2.201a51.964 51.964 0 0 0-3.32 0c-1.18.067-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 0 0-7.5 0" />
    </svg>
);

const SparklesIcon: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" {...props}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904 9 18.75l-.813-2.846a4.5 4.5 0 0 0-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 0 0 3.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 0 0 3.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 0 0-3.09 3.09ZM18.259 8.715 18 9.75l-.259-1.035a3.375 3.375 0 0 0-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 0 0 2.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 0 0 2.456 2.456L21.75 6l-1.035.259a3.375 3.375 0 0 0-2.456 2.456Z" />
    </svg>
);

const CheckCircleIcon: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" {...props}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75 11.25 15 15 9.75M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
    </svg>
);

const XIcon: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" {...props}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
    </svg>
);


const App: React.FC = () => {
  const { isUnlocked } = useAuth();

  const [benefitsPercent, setBenefitsPercent] = useState(30);
  const [overheadPercent, setOverheadPercent] = useState(15);
  const [workWeekHours, setWorkWeekHours] = useState(35);
  const [globalRate, setGlobalRate] = useState('');
  const [globalUtilization, setGlobalUtilization] = useState('');
  const [history, setHistory] = useState<Position[][]>([]);
  
  const benefitsMultiplier = useMemo(() => 1 + benefitsPercent / 100, [benefitsPercent]);
  const overheadMultiplier = useMemo(() => overheadPercent / 100, [overheadPercent]);
  const annualBillableHours = useMemo(() => workWeekHours * 44, [workWeekHours]); // Assume 44 billable weeks per year

  const saveStateForUndo = useCallback((currentState: Position[]) => {
    setHistory(prev => {
        const newHistory = [...prev, currentState];
        if (newHistory.length > MAX_HISTORY_SIZE) {
            return newHistory.slice(newHistory.length - MAX_HISTORY_SIZE);
        }
        return newHistory;
    });
  }, []);

  const [positions, setPositions] = useState<Position[]>(() => {
    const processPositions = (positions: any[]): Position[] => {
        return positions.map(p => {
            let position = { ...p };
            if (!position.roleType) {
                const cSuiteRegex = /^(ceo|coo|cfo|cto|cmo|chief)/i;
                position.roleType = cSuiteRegex.test(position.role) ? 'nonBillable' : 'billable';
            }
            if (position.roleType === 'nonBillable') {
                position.rate = 0;
                position.utilization = 0;
            }
            return position;
        });
    };

    const urlParams = new URLSearchParams(window.location.search);
    const data = urlParams.get('data');
    if (data) {
        try {
            const decodedData = atob(data);
            const parsedPositions = processPositions(JSON.parse(decodedData));
            if (Array.isArray(parsedPositions) && parsedPositions.every(p => 'id' in p && 'role' in p)) {
                window.history.replaceState({}, '', window.location.pathname);
                return parsedPositions;
            }
        } catch (error) {
            console.error("Failed to parse positions from URL, checking localStorage.", error);
        }
    }

    try {
        const savedPositions = window.localStorage.getItem(POSITIONS_STORAGE_KEY);
        if (savedPositions) {
            const parsed = processPositions(JSON.parse(savedPositions));
            if (Array.isArray(parsed) && parsed.length >= 0) {
                return parsed;
            }
        }
    } catch (error) {
        console.error("Failed to load positions from localStorage, loading sample data.", error);
    }
    
    return initialData.map(p => {
        const financials = calculateFinancials(p, 1 + 30 / 100, 15 / 100, 35 * 44);
        return { ...p, ...financials };
    });
  });
  
  const [editingPosition, setEditingPosition] = useState<Position | null>(null);
  const [isEditorOpen, setIsEditorOpen] = useState(false);
  const [newPositionParentId, setNewPositionParentId] = useState<string | null>(null);
  const [chartView, setChartView] = useState<'tree' | 'list'>('tree');
  const [isDeleteAllConfirmOpen, setIsDeleteAllConfirmOpen] = useState(false);
  const [isExportModalOpen, setIsExportModalOpen] = useState(false);
  const [isUnlockModalOpen, setIsUnlockModalOpen] = useState(false);
  const [duplicateSource, setDuplicateSource] = useState<Position | null>(null);
  const [isActionMenuOpen, setIsActionMenuOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [showUnlockToast, setShowUnlockToast] = useState(false);
  const [isStickyHeaderVisible, setIsStickyHeaderVisible] = useState(false);
  const [aiAnalysis, setAiAnalysis] = useState<AIAnalysisResult | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [autosaveStatus, setAutosaveStatus] = useState<'idle' | 'saving' | 'saved' | 'disabled'>('idle');
  const [isHelpModalOpen, setIsHelpModalOpen] = useState(false);
  const [isShowingSampleData, setIsShowingSampleData] = useState(false);
  const [isSampleNoticeVisible, setIsSampleNoticeVisible] = useState(false);
  
  const orgChartRef = useRef<HTMLDivElement>(null);
  const orgStructureRef = useRef<HTMLDivElement>(null);
  const logoRef = useRef<HTMLDivElement>(null);
  const isInitialLoad = useRef(true);
  
  useEffect(() => {
    try {
        const savedSettings = window.localStorage.getItem(SETTINGS_STORAGE_KEY);
        if (savedSettings) {
            const { benefitsPercent, overheadPercent, workWeekHours } = JSON.parse(savedSettings);
            setBenefitsPercent(benefitsPercent || 30);
            setOverheadPercent(overheadPercent || 15);
            setWorkWeekHours(workWeekHours || 35);
        }
    } catch (error) {
        console.error("Failed to load settings from localStorage", error);
    }
  }, []);

  useEffect(() => {
    const savedPositions = window.localStorage.getItem(POSITIONS_STORAGE_KEY);
    const urlParams = new URLSearchParams(window.location.search);
    const data = urlParams.get('data');
    if (!savedPositions && !data) {
        setIsShowingSampleData(true);
        setIsSampleNoticeVisible(true);
    }
  }, []);


  useEffect(() => {
    if (isInitialLoad.current) {
        setAutosaveStatus(isUnlocked ? 'saved' : 'disabled');
        isInitialLoad.current = false;
        return;
    }

    if (!isUnlocked) {
        setAutosaveStatus('disabled');
        return;
    }

    setAutosaveStatus('saving');

    const handler = setTimeout(() => {
        try {
            const settingsToSave = JSON.stringify({ benefitsPercent, overheadPercent, workWeekHours });
            window.localStorage.setItem(SETTINGS_STORAGE_KEY, settingsToSave);
            window.localStorage.setItem(POSITIONS_STORAGE_KEY, JSON.stringify(positions));
            setAutosaveStatus('saved');
        } catch (error) {
            console.error("Failed to save to localStorage", error);
        }
    }, 1000);

    return () => {
        clearTimeout(handler);
    };
  }, [positions, benefitsPercent, overheadPercent, workWeekHours, isUnlocked]);


  useEffect(() => {
    setPositions(currentPositions =>
        currentPositions.map(p => {
            const financials = calculateFinancials(p, benefitsMultiplier, overheadMultiplier, annualBillableHours);
            return { ...p, ...financials };
        })
    );
  }, [benefitsMultiplier, overheadMultiplier, annualBillableHours]);

  useEffect(() => {
    const handleScroll = () => {
        if (logoRef.current) {
            const { bottom } = logoRef.current.getBoundingClientRect();
            setIsStickyHeaderVisible(bottom <= 0);
        }
    };
    window.addEventListener('scroll', handleScroll);
    return () => {
        window.removeEventListener('scroll', handleScroll);
    };
  }, []);

  useEffect(() => {
    if (showUnlockToast) {
        const timer = setTimeout(() => {
            setShowUnlockToast(false);
        }, 5000);
        return () => clearTimeout(timer);
    }
  }, [showUnlockToast]);

  const addPosition = (positionInput: PositionInput) => {
    saveStateForUndo(positions);
    const financials = calculateFinancials(positionInput, benefitsMultiplier, overheadMultiplier, annualBillableHours);
    const newPosition: Position = {
      id: crypto.randomUUID(),
      ...positionInput,
      ...financials,
    };
    setPositions([...positions, newPosition]);
    setIsShowingSampleData(false);
    setIsSampleNoticeVisible(false);
  };

  const updatePosition = useCallback((positionUpdate: PositionUpdate) => {
    saveStateForUndo(positions);
    const financials = calculateFinancials(positionUpdate, benefitsMultiplier, overheadMultiplier, annualBillableHours);
    setPositions(currentPositions => currentPositions.map(p =>
      p.id === positionUpdate.id ? { ...p, ...positionUpdate, ...financials } : p
    ));
    setIsShowingSampleData(false);
    setIsSampleNoticeVisible(false);
  }, [benefitsMultiplier, overheadMultiplier, annualBillableHours, positions, saveStateForUndo]);

  const deletePosition = (id: string) => {
    saveStateForUndo(positions);
    setPositions(prev => {
        const positionToDelete = prev.find(p => p.id === id);
        if (!positionToDelete) return prev;
        
        const parentId = positionToDelete.managerId;
        const updatedPositions = prev.filter(p => p.id !== id)
          .map(p => p.managerId === id ? { ...p, managerId: parentId } : p);

        return updatedPositions;
    });
    setIsShowingSampleData(false);
    setIsSampleNoticeVisible(false);
  };

  const deleteAllPositions = () => {
    saveStateForUndo(positions);
    setPositions([]);
    setIsDeleteAllConfirmOpen(false);
    setIsShowingSampleData(false);
    setIsSampleNoticeVisible(false);
  };

  const loadSampleData = () => {
    saveStateForUndo(positions);
    const recalculatedSampleData = initialData.map(p => {
        const financials = calculateFinancials(p, benefitsMultiplier, overheadMultiplier, annualBillableHours);
        return { ...p, ...financials };
    });
    setPositions(recalculatedSampleData);
    setIsActionMenuOpen(false);
    setIsShowingSampleData(true);
    setIsSampleNoticeVisible(true);
    window.history.pushState({}, '', window.location.pathname);
  };

  const handleApplyGlobalRate = () => {
    const rateValue = parseFloat(globalRate);
    if (isNaN(rateValue)) return;
    
    saveStateForUndo(positions);
    setPositions(currentPositions =>
        currentPositions.map(p => {
            const updatedPos = p.roleType === 'billable' ? { ...p, rate: rateValue } : p;
            const financials = calculateFinancials(updatedPos, benefitsMultiplier, overheadMultiplier, annualBillableHours);
            return { ...updatedPos, ...financials };
        })
    );
    setGlobalRate('');
  };

  const handleApplyGlobalUtilization = () => {
    const utilValue = parseFloat(globalUtilization);
    if (isNaN(utilValue)) return;

    saveStateForUndo(positions);
    setPositions(currentPositions =>
        currentPositions.map(p => {
            const updatedPos = p.roleType === 'billable' ? { ...p, utilization: utilValue } : p;
            const financials = calculateFinancials(updatedPos, benefitsMultiplier, overheadMultiplier, annualBillableHours);
            return { ...updatedPos, ...financials };
        })
    );
    setGlobalUtilization('');
  };

  const handleUndo = () => {
    if (history.length === 0) return;
    const lastState = history[history.length - 1];
    setPositions(lastState);
    setHistory(prev => prev.slice(0, prev.length - 1));
    setIsActionMenuOpen(false);
  };

  const handleOpenEditorForNew = (managerId: string | null) => {
    setEditingPosition(null);
    setDuplicateSource(null);
    setNewPositionParentId(managerId);
    setIsEditorOpen(true);
  };
  
  const handleAddRootRole = () => {
    handleOpenEditorForNew(null);
    setIsActionMenuOpen(false);
  };
  
  const handleEditPosition = (position: Position) => {
    setEditingPosition(position);
    setDuplicateSource(null);
    setIsEditorOpen(true);
  };

  const handleDuplicatePosition = (position: Position) => {
    setEditingPosition(null);
    setDuplicateSource(position);
    setIsEditorOpen(true);
  };

  const handleSavePosition = (positionData: PositionInput | PositionUpdate) => {
    if ('id' in positionData) {
      updatePosition(positionData as PositionUpdate);
    } else {
      addPosition(positionData as PositionInput);
    }
    setIsEditorOpen(false);
    setEditingPosition(null);
    setNewPositionParentId(null);
    setDuplicateSource(null);
  };
  
  const handleCloseEditor = () => {
    setIsEditorOpen(false);
    setEditingPosition(null);
    setDuplicateSource(null);
  };

  const handleExport = (): { link: string; csv: string } => {
    const headers = ['Role', 'Salary', 'Total Salary', 'Overhead Cost', 'Rate', 'Utilization', 'Revenue', 'Profit'];
    const headerKeys: (keyof Position)[] = ['role', 'salary', 'totalSalary', 'overheadCost', 'rate', 'utilization', 'revenue', 'profit'];
    
    const csvRows = [
        headers.join(','),
        ...positions.map(pos => 
            headerKeys.map(header => {
                const value = pos[header];
                if (typeof value === 'string' && value.includes(',')) {
                    return `"${value}"`;
                }
                return value;
            }).join(',')
        )
    ];

    const totals = positions.reduce((acc, pos) => {
        acc.salary += pos.salary;
        acc.totalSalary += pos.totalSalary;
        acc.overheadCost += pos.overheadCost;
        acc.revenue += pos.revenue;
        acc.profit += pos.profit;
        return acc;
    }, { salary: 0, totalSalary: 0, overheadCost: 0, revenue: 0, profit: 0 });

    const totalsRow = [
        'Totals',
        totals.salary,
        totals.totalSalary,
        totals.overheadCost,
        '', 
        '', 
        totals.revenue,
        totals.profit
    ].join(',');

    csvRows.push(totalsRow);

    const csvContent = csvRows.join('\n');
    
    const dataString = JSON.stringify(positions);
    const encodedData = btoa(dataString);
    const link = `${window.location.origin}${window.location.pathname}?data=${encodedData}`;

    return { link, csv: csvContent };
  };
  
  const handleDownloadPng = async () => {
    if (!orgChartRef.current) {
        console.error("Org chart element not found for PNG export.");
        return;
    }
    const element = orgChartRef.current;
    const canvas = await html2canvas(element, {
        backgroundColor: '#161B22',
        scale: 2,
        useCORS: true,
        width: element.scrollWidth,
        height: element.scrollHeight,
        windowWidth: element.scrollWidth,
        windowHeight: element.scrollHeight,
    });
    const image = canvas.toDataURL('image/png');
    const link = document.createElement('a');
    link.download = 'org-chart.png';
    link.href = image;
    link.click();
  };

  const handleExportClick = () => {
    setIsActionMenuOpen(false);
    if (isUnlocked) {
        setIsExportModalOpen(true);
    } else {
        setIsUnlockModalOpen(true);
    }
  };

  const handleRunAnalysis = async () => {
    if (!isUnlocked) {
        setIsUnlockModalOpen(true);
        return;
    }

    setIsAnalyzing(true);
    setAiAnalysis(null);

    try {
        const positionsWithReportCount = positions.map(p => {
            const reports = positions.filter(r => r.managerId === p.id);
            return {
                ...p,
                directReports: reports.length
            };
        });

        const dataForAnalysis = {
            positions: positionsWithReportCount.map(({ id, managerId, ...rest }) => rest),
            settings: {
                benefitsPercent,
                overheadPercent,
                workWeekHours,
                annualBillableWeeks: 44,
            }
        };

        const response = await fetch('/api/analyze', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ dataForAnalysis }),
        });

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error || `API request failed with status ${response.status}`);
        }
        
        const analysisResult = await response.json() as AIAnalysisResult;
        setAiAnalysis(analysisResult);

    } catch (error) {
        console.error("AI analysis failed:", error);
    } finally {
        setIsAnalyzing(false);
    }
  };

  const tree = useMemo(() => {
    const buildTree = (items: Position[], parentId: string | null = null, depth = 0): TreeNode[] => {
      return items
        .filter(item => item.managerId === parentId)
        .map(item => ({
          ...item,
          depth,
          children: buildTree(items, item.id, depth + 1),
        }));
    };
    return buildTree(positions);
  }, [positions]);
  
  const mainContainerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: { staggerChildren: 0.15, delayChildren: 0.2 }
    }
  };
  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.5 } }
  };

  const handleGetStartedClick = () => {
    if (orgStructureRef.current) {
        // The sticky header is 64px (h-16). We add extra space for better visual alignment.
        const headerOffset = 80;
        const elementPosition = orgStructureRef.current.getBoundingClientRect().top + window.pageYOffset;
        const offsetPosition = elementPosition - headerOffset;

        window.scrollTo({
            top: offsetPosition,
            behavior: 'smooth'
        });
    }
  };

  return (
    <div className="min-h-screen text-gray-200 p-4 sm:p-6 lg:p-8">
      <AnimatePresence>
        {isStickyHeaderVisible && (
            <StickyHeader
                isUnlocked={isUnlocked}
                isActionMenuOpen={isActionMenuOpen}
                setIsActionMenuOpen={setIsActionMenuOpen}
                onExportClick={handleExportClick}
                onLoadSampleData={loadSampleData}
                onAddRootRole={handleAddRootRole}
                onDeleteAll={() => setIsDeleteAllConfirmOpen(true)}
                onSignInClick={() => setIsUnlockModalOpen(true)}
                autosaveStatus={autosaveStatus}
                onUndo={handleUndo}
                canUndo={history.length > 0}
            />
        )}
      </AnimatePresence>
      <div className="max-w-7xl mx-auto">
        <header className="text-center" style={{ margin: '2rem 0 6rem 0' }}>
            <div ref={logoRef} className="font-parkinsans" style={{ fontSize: '1.5rem', marginBottom: '4.5rem' }}>
                <span className="text-brand-accent">Team</span><span className="text-white">Ledger</span>
            </div>
            <h1 className="font-bold text-white max-w-4xl mx-auto text-4xl sm:text-5xl lg:text-[3.35rem] leading-[1.1]">A smarter organizational structure chart maker – so you can grow your business with confidence.</h1>
            <p className="text-gray-300 mt-4 max-w-3xl mx-auto" style={{ fontSize: '1.15rem' }}>
                TeamLedger is a free org chart tool that connects your team structure to real financial data. Model your growth, see the impact of every role, and get AI-powered insights to operate with confidence.
            </p>
            <div className="mt-8">
                <motion.button
                    onClick={handleGetStartedClick}
                    className="bg-brand-accent/80 hover:bg-brand-accent text-white font-bold py-3 px-8 rounded-lg transition-colors duration-200 text-lg shadow-soft-glow"
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                >
                    Get Started
                </motion.button>
            </div>
        </header>

        <motion.main 
          className="space-y-12"
          variants={mainContainerVariants}
          initial="hidden"
          animate="visible"
        >
          <motion.div variants={itemVariants} ref={orgStructureRef}>
            <div className="flex justify-between items-center mb-4 flex-wrap gap-4">
              <div className="flex items-center space-x-4">
                <h2 className="text-2xl font-semibold">Organizational Structure</h2>
                <div className="flex items-center rounded-lg bg-brand-surface p-1 border border-brand-border">
                  <button onClick={() => setChartView('tree')} className={`px-3 py-1 text-sm font-medium rounded-md transition-colors ${chartView === 'tree' ? 'bg-brand-accent/80 text-white' : 'text-gray-400 hover:bg-gray-700'}`}>Tree</button>
                  <button onClick={() => setChartView('list')} className={`px-3 py-1 text-sm font-medium rounded-md transition-colors ${chartView === 'list' ? 'bg-brand-accent/80 text-white' : 'text-gray-400 hover:bg-gray-700'}`}>List</button>
                </div>
              </div>
              <button
                onClick={() => setIsHelpModalOpen(true)}
                className="p-1.5 rounded-full text-gray-400 hover:bg-gray-700 hover:text-white transition-colors"
                aria-label="How to use this section"
              >
                  <QuestionMarkCircleIcon className="w-6 h-6" />
              </button>
            </div>
            <div className="bg-brand-surface/50 p-4 rounded-lg border border-brand-border overflow-x-auto relative min-h-[200px]">
              {isShowingSampleData && isSampleNoticeVisible && (
                <div className="absolute top-5 right-5 bg-yellow-900/60 border border-yellow-700 text-yellow-200 px-4 py-3 rounded-lg text-sm max-w-xs shadow-lg backdrop-blur-sm z-10">
                  <button
                      onClick={() => setIsSampleNoticeVisible(false)}
                      className="absolute -top-2 -right-2 p-1 rounded-full bg-yellow-800 hover:bg-yellow-700 transition-colors"
                      aria-label="Dismiss notice"
                  >
                      <XIcon className="w-4 h-4 text-yellow-200" />
                  </button>
                  <p>
                    This is a sample org chart. Customize it, or{' '}
                    <button
                      onClick={() => setIsDeleteAllConfirmOpen(true)}
                      className="font-semibold underline hover:text-white transition-colors"
                    >
                      delete it to start from scratch
                    </button>
                    .
                  </p>
                </div>
              )}
              <AnimatePresence mode="wait">
                  <motion.div
                      key={chartView}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      transition={{ duration: 0.2 }}
                  >
                  {tree.length > 0 ? (
                    <>
                    {chartView === 'tree' ? (
                      <OrgChart 
                        tree={tree}
                        onAddSubordinate={handleOpenEditorForNew}
                        onEdit={handleEditPosition}
                        onDelete={deletePosition}
                        onDuplicate={handleDuplicatePosition}
                        captureRef={orgChartRef}
                      />
                    ) : (
                      <OrgChartListView
                        tree={tree}
                        onAddSubordinate={handleOpenEditorForNew}
                        onEdit={handleEditPosition}
                        onDelete={deletePosition}
                        onDuplicate={handleDuplicatePosition}
                      />
                    )}
                    </>
                  ) : (
                      <div className="text-center text-gray-400 py-12 flex flex-col items-center">
                          <InformationCircleIcon className="w-16 h-16 text-gray-600 mb-4" />
                          <h3 className="text-lg font-semibold text-white">Your organizational chart is empty.</h3>
                          <p className="mt-2 max-w-sm">Create your first position to get started. A CEO or Founder is a great place to begin.</p>
                          <motion.button 
                              onClick={handleAddRootRole}
                              className="mt-6 bg-brand-accent/80 hover:bg-brand-accent text-white font-bold py-2 px-5 rounded-lg transition-colors duration-200 flex items-center"
                              whileHover={{ scale: 1.05 }}
                              whileTap={{ scale: 0.95 }}
                          >
                              <PlusIcon className="w-5 h-5 mr-2" />
                              Add First Role
                          </motion.button>
                      </div>
                  )}
                  </motion.div>
              </AnimatePresence>
            </div>
          </motion.div>
          
          <motion.div variants={itemVariants}>
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-2xl font-semibold">Financial Breakdown</h2>
              <motion.button
                  onClick={() => setIsSettingsOpen(prev => !prev)}
                  className="bg-brand-surface hover:bg-gray-800/60 text-white font-bold py-2 px-4 rounded-lg transition-colors duration-200 flex items-center border border-brand-border"
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
              >
                  Settings
                  <motion.div animate={{ rotate: isSettingsOpen ? 180 : 0 }}>
                      <ChevronDownIcon className="w-5 h-5 ml-2 -mr-1" />
                  </motion.div>
              </motion.button>
            </div>
             <AnimatePresence>
              {isSettingsOpen && (
                <motion.div
                  initial={{ height: 0, opacity: 0, y: -10 }}
                  animate={{ height: 'auto', opacity: 1, y: 0, transition: { y: { duration: 0.2 }, opacity: { duration: 0.3, delay: 0.1 } } }}
                  exit={{ height: 0, opacity: 0, y: -10, transition: { height: { duration: 0.3 }, opacity: { duration: 0.2 } } }}
                  className="overflow-hidden"
                >
                  <div className="bg-brand-surface/50 p-6 rounded-lg border border-brand-border mb-4">
                    <h3 className="text-lg font-semibold mb-4 text-white">Global Financial Settings</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-x-8 gap-y-6">
                      
                      {/* --- Multipliers --- */}
                      <div>
                        <label htmlFor="benefits-percent" className="block text-sm font-medium text-gray-300">Total Salary Multiplier</label>
                        <p className="mt-1 text-xs text-gray-400">Accounts for benefits, taxes, etc.</p>
                        <div className="mt-2 flex rounded-md shadow-sm">
                          <span className="inline-flex items-center px-3 rounded-l-md border border-r-0 border-brand-border bg-gray-700 text-gray-300 sm:text-sm">Salary +</span>
                          <input type="number" id="benefits-percent" value={benefitsPercent} onChange={e => setBenefitsPercent(parseFloat(e.target.value) || 0)} className="block w-full flex-1 rounded-none bg-gray-900 border border-brand-border px-3 py-2 text-white placeholder-gray-500 focus:ring-2 focus:ring-brand-accent focus:border-brand-accent sm:text-sm" />
                          <span className="inline-flex items-center px-3 rounded-r-md border border-l-0 border-brand-border bg-gray-700 text-gray-300 sm:text-sm">%</span>
                        </div>
                      </div>
                      <div>
                        <label htmlFor="overhead-percent" className="block text-sm font-medium text-gray-300">Overhead Cost Multiplier</label>
                        <p className="mt-1 text-xs text-gray-400">Accounts for rent, software, etc.</p>
                        <div className="mt-2 flex rounded-md shadow-sm">
                          <input type="number" id="overhead-percent" value={overheadPercent} onChange={e => setOverheadPercent(parseFloat(e.target.value) || 0)} className="block w-full flex-1 rounded-none rounded-l-md bg-gray-900 border border-brand-border px-3 py-2 text-white placeholder-gray-500 focus:ring-2 focus:ring-brand-accent focus:border-brand-accent sm:text-sm" />
                          <span className="inline-flex items-center px-3 rounded-r-md border border-l-0 border-brand-border bg-gray-700 text-gray-300 sm:text-sm">% of Total Salary</span>
                        </div>
                      </div>
                      <div>
                        <label htmlFor="work-week-hours" className="block text-sm font-medium text-gray-300">Work Week (Hours)</label>
                        <p className="mt-1 text-xs text-gray-400">Affects Revenue totals.</p>
                        <div className="mt-2 flex rounded-md shadow-sm">
                          <input type="number" id="work-week-hours" value={workWeekHours} onChange={e => setWorkWeekHours(parseFloat(e.target.value) || 0)} className="block w-full flex-1 rounded-md bg-gray-900 border border-brand-border px-3 py-2 text-white placeholder-gray-500 focus:ring-2 focus:ring-brand-accent focus:border-brand-accent sm:text-sm" />
                        </div>
                      </div>
                      
                      {/* --- Global Overwrites --- */}
                      <div className="md:col-span-2 lg:col-span-3 border-t border-brand-border pt-6 mt-2">
                        <h4 className="text-md font-semibold mb-3 text-white">Global Overwrites</h4>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-6">
                            <div>
                                <label htmlFor="global-rate" className="block text-sm font-medium text-gray-300">Global Rate ($/hr)</label>
                                <p className="mt-1 text-xs text-gray-400">Applies a single rate to all billable roles.</p>
                                <div className="mt-2 flex">
                                    <input type="number" id="global-rate" value={globalRate} onChange={e => setGlobalRate(e.target.value)} placeholder="e.g., 200" className="block w-full flex-1 rounded-none rounded-l-md bg-gray-900 border border-brand-border px-3 py-2 text-white placeholder-gray-500 focus:ring-2 focus:ring-brand-accent focus:border-brand-accent sm:text-sm" />
                                    <button onClick={handleApplyGlobalRate} className="px-4 py-2 bg-brand-accent/80 hover:bg-brand-accent text-white font-semibold rounded-r-md text-sm transition-colors disabled:opacity-50" disabled={!globalRate}>Apply</button>
                                </div>
                            </div>
                             <div>
                                <label htmlFor="global-utilization" className="block text-sm font-medium text-gray-300">Global Utilization (%)</label>
                                <p className="mt-1 text-xs text-gray-400">Applies a single utilization to all billable roles.</p>
                                <div className="mt-2 flex">
                                    <input type="number" id="global-utilization" value={globalUtilization} onChange={e => setGlobalUtilization(e.target.value)} placeholder="e.g., 80" className="block w-full flex-1 rounded-none rounded-l-md bg-gray-900 border border-brand-border px-3 py-2 text-white placeholder-gray-500 focus:ring-2 focus:ring-brand-accent focus:border-brand-accent sm:text-sm" />
                                    <button onClick={handleApplyGlobalUtilization} className="px-4 py-2 bg-brand-accent/80 hover:bg-brand-accent text-white font-semibold rounded-r-md text-sm transition-colors disabled:opacity-50" disabled={!globalUtilization}>Apply</button>
                                </div>
                            </div>
                        </div>
                      </div>

                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
            <SummaryTable 
              positions={positions} 
              onUpdatePosition={updatePosition} 
              onAddSubordinate={handleOpenEditorForNew}
              onEdit={handleEditPosition}
              onDelete={deletePosition}
              onDuplicate={handleDuplicatePosition}
              isUnlocked={isUnlocked}
              onUnlockRequest={() => setIsUnlockModalOpen(true)}
            />
          </motion.div>
          
          <motion.div variants={itemVariants}>
            <AIAnalysis
                isUnlocked={isUnlocked}
                onRunAnalysis={handleRunAnalysis}
                analysisResult={aiAnalysis}
                isAnalyzing={isAnalyzing}
                onUnlockRequest={() => setIsUnlockModalOpen(true)}
            />
          </motion.div>

          <motion.div variants={itemVariants} className="pt-16 pb-8">
              <div className="max-w-3xl mx-auto text-left space-y-12">
                  <h2 className="text-3xl font-bold mb-0 text-white text-center">About TeamLedger</h2>
                  <section>
                      <h3 className="text-2xl font-semibold mb-4 text-white">Why use TeamLedger as an organizational structure chart maker?</h3>
                      <p className="text-gray-300" style={{ fontSize: '1.15rem' }}>
                          Most org chart tools stop at boxes and lines. This one goes further, tying each role to salary, utilization, and overhead so you can see how your structure affects profitability.
                      </p>
                      <p className="text-gray-300 mt-4" style={{ fontSize: '1.15rem' }}>
                          Whether you’re mapping a five-person startup or a fifty-person agency, this organizational structure chart maker gives you the full picture: who reports to whom, what each role costs, and how changes ripple through your financial model.
                      </p>
                  </section>
                  
                  <section>
                      <h3 className="text-2xl font-semibold mb-4 text-white">What Does TeamLedger Do?</h3>
                      <p className="text-gray-300" style={{ fontSize: '1.15rem' }}>
                          With this free organizational structure chart maker, you can:
                      </p>
                      <ul className="list-disc list-inside text-gray-300 mt-4 space-y-2" style={{ fontSize: '1.15rem' }}>
                          <li>Build your team structure visually. Create, update, delete, and organize roles into clear hierarchies.</li>
                          <li>Attach financial data. Add salaries, billable rates, and capacity to every seat. Real costs are automatically calculated.</li>
                          <li>Plan future hires. Model “what-if” scenarios before you make your next hire.</li>
                      </ul>
                      <p className="text-gray-300 mt-4" style={{ fontSize: '1.15rem' }}>
                          It’s not just an organizational structure chart maker — it’s a planning tool for smarter growth.
                      </p>
                  </section>

                  <section>
                      <h3 className="text-2xl font-semibold mb-4 text-white">Who is this organizational structure chart maker for?</h3>
                      <p className="text-gray-300" style={{ fontSize: '1.15rem' }}>
                          TeamLedger is great for:
                      </p>
                      <ul className="list-disc list-inside text-gray-300 mt-4 space-y-2" style={{ fontSize: '1.15rem' }}>
                          <li>Agency owners who want to balance creative growth with profit.</li>
                          <li>Any service businesses who bill by the hour, or by fixed price.</li>
                          <li>Startup founders mapping their first org structure.</li>
                          <li>Operations leaders looking for improved department fiscal understanding.</li>
                      </ul>
                      <p className="text-gray-300 mt-4" style={{ fontSize: '1.15rem' }}>
                          If you care about both structure and sustainability, this tool was built for you.
                      </p>
                  </section>
                  <section>
                      <h3 className="text-2xl font-semibold mb-4 text-white">Who built TeamLedger?</h3>
                      <p className="text-gray-300" style={{ fontSize: '1.15rem' }}>
                          TeamLedger is a fun project by me, Jeff Archibald. I'm an <a href="https://jeffarchibald.ca" target="_blank" rel="noopener noreferrer" className="text-brand-accent hover:underline">agency consultant</a> who primarily works with creative firms and service businesses. I used a janky spreadsheet in the past to do this type of work, so I figured I'd try building a nicer web version of it. Tada!
                      </p>
                  </section>
              </div>
          </motion.div>
        </motion.main>
      </div>
      <AnimatePresence>
        {isEditorOpen && (
          <PositionEditor
            onClose={handleCloseEditor}
            onSave={handleSavePosition}
            existingPosition={editingPosition}
            positions={positions}
            parentId={newPositionParentId}
            duplicateSource={duplicateSource}
          />
        )}
      </AnimatePresence>
      <AnimatePresence>
        {isDeleteAllConfirmOpen && (
           <ConfirmDeleteModal 
              onClose={() => setIsDeleteAllConfirmOpen(false)}
              onConfirm={deleteAllPositions}
           />
        )}
      </AnimatePresence>
      <AnimatePresence>
        {isExportModalOpen && (
           <ExportModal 
              onClose={() => setIsExportModalOpen(false)}
              onConfirm={handleExport}
              onDownloadPng={handleDownloadPng}
              isPngExportAvailable={chartView === 'tree'}
           />
        )}
      </AnimatePresence>
      <AnimatePresence>
        {isUnlockModalOpen && (
            <UnlockModal 
                onClose={() => setIsUnlockModalOpen(false)}
                onUnlockSuccess={() => {
                    setIsUnlockModalOpen(false);
                    setShowUnlockToast(true);
                }}
            />
        )}
      </AnimatePresence>
      <AnimatePresence>
        {isHelpModalOpen && (
            <HelpModal 
                onClose={() => setIsHelpModalOpen(false)}
                isShowingSampleData={isShowingSampleData}
            />
        )}
      </AnimatePresence>
      <AnimatePresence>
        {showUnlockToast && <SuccessToast />}
      </AnimatePresence>
    </div>
  );
};

interface ConfirmDeleteModalProps {
  onClose: () => void;
  onConfirm: () => void;
}

const ConfirmDeleteModal: React.FC<ConfirmDeleteModalProps> = ({ onClose, onConfirm }) => {
    const backdropVariants = {
        hidden: { opacity: 0 },
        visible: { opacity: 1 }
    };
    // FIX: Add Variants type to fix framer-motion type error
    const modalVariants: Variants = {
        hidden: { opacity: 0, y: 30, scale: 0.95 },
        visible: { opacity: 1, y: 0, scale: 1, transition: { type: 'spring', stiffness: 300, damping: 25 } },
        exit: { opacity: 0, y: 20, scale: 0.95 }
    };
    return (
        <motion.div 
            className="fixed inset-0 bg-black bg-opacity-80 flex items-center justify-center z-50 p-4"
            variants={backdropVariants}
            initial="hidden"
            animate="visible"
            exit="hidden"
        >
          <motion.div 
            className="bg-brand-surface rounded-lg shadow-soft-glow-lg border border-brand-border w-full max-w-sm"
            variants={modalVariants}
          >
            <div className="p-6">
              <h3 className="text-xl font-bold text-white">Confirm Deletion</h3>
              <p className="text-gray-400 mt-2">Are you sure you want to delete all positions? This action cannot be undone.</p>
            </div>
            <div className="bg-gray-900/50 px-6 py-4 flex justify-end space-x-3 rounded-b-lg">
              <motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }} onClick={onClose} className="bg-gray-600 hover:bg-gray-500 text-white font-bold py-2 px-4 rounded-lg transition-colors">Cancel</motion.button>
              <motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }} onClick={onConfirm} className="bg-red-600 hover:bg-red-700 text-white font-bold py-2 px-4 rounded-lg transition-colors">Delete All</motion.button>
            </div>
          </motion.div>
        </motion.div>
    )
}

interface HelpModalProps {
    onClose: () => void;
    isShowingSampleData: boolean;
}

const HelpModal: React.FC<HelpModalProps> = ({ onClose, isShowingSampleData }) => {
    const backdropVariants = {
        hidden: { opacity: 0 },
        visible: { opacity: 1 }
    };
    const modalVariants: Variants = {
        hidden: { opacity: 0, y: 30, scale: 0.95 },
        visible: { opacity: 1, y: 0, scale: 1, transition: { type: 'spring', stiffness: 300, damping: 25 } },
        exit: { opacity: 0, y: 20, scale: 0.95 }
    };

    const UserPlusIcon: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (
        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" {...props}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M19 7.5v3m0 0v3m0-3h3m-3 0h-3m-2.25-4.125a3.375 3.375 0 1 1-6.75 0 3.375 3.375 0 0 1 6.75 0ZM3.375 19.5h17.25a2.25 2.25 0 0 0 2.25-2.25v-1.5a2.25 2.25 0 0 0-2.25-2.25H3.375a2.25 2.25 0 0 0-2.25 2.25v1.5a2.25 2.25 0 0 0 2.25 2.25Z" />
        </svg>
    );
    const PencilIcon: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (
        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" {...props}>
            <path strokeLinecap="round" strokeLinejoin="round" d="m16.862 4.487 1.687-1.688a1.875 1.875 0 1 1 2.652 2.652L10.582 16.07a4.5 4.5 0 0 1-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 0 1 1.13-1.897l8.932-8.931Zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0 1 15.75 21H5.25A2.25 2.25 0 0 1 3 18.75V8.25A2.25 2.25 0 0 1 5.25 6H10" />
        </svg>
    );
    
    return (
        <motion.div 
            className="fixed inset-0 bg-black bg-opacity-70 backdrop-blur-sm flex items-center justify-center z-50 p-4"
            variants={backdropVariants} initial="hidden" animate="visible" exit="hidden"
            onClick={onClose}
        >
            <motion.div 
                className="bg-brand-surface rounded-lg shadow-soft-glow-lg border border-brand-border w-full max-w-lg"
                variants={modalVariants}
                onClick={(e) => e.stopPropagation()}
            >
                <div className="p-6">
                    <h3 className="text-xl font-bold text-white">How to Use TeamLedger</h3>
                    {isShowingSampleData && (
                        <div className="mt-4 bg-yellow-900/50 border border-yellow-700 text-yellow-200 px-4 py-3 rounded-lg text-sm">
                            <p className="font-semibold">You're currently viewing a sample org chart.</p>
                            <p>Feel free to edit these roles, or use the "Actions" menu to delete them all and start fresh.</p>
                        </div>
                    )}
                    <ul className="space-y-3 mt-4 text-gray-300 list-disc list-inside">
                        <li><b>Build your chart:</b> Use the <UserPlusIcon className="w-4 h-4 inline-block -mt-1 mx-1" /> <PencilIcon className="w-4 h-4 inline-block -mt-1 mx-1" /> and <TrashIcon className="w-4 h-4 inline-block -mt-1 mx-1" /> icons on each card to add, edit, or delete roles. The "Actions" menu also allows you to add roles and clear the chart.</li>
                        <li><b>Change views:</b> Toggle between the "Tree" and "List" views to see your structure differently.</li>
                        <li><b>Quick edits:</b> Click on any Role, Salary, Rate, or Utilization value in the Financial Breakdown table to edit it directly.</li>
                        <li><b>Global settings:</b> Adjust the company-wide multipliers for benefits and overhead in the "Settings" section.</li>
                        <li><b>Export & Share:</b> Use the "Actions" menu to get a shareable link or download your data as a PNG or CSV.</li>
                        <li><b>Get insights:</b> Use the AI Analysis section to get a strategic overview of your team structure.</li>
                    </ul>
                </div>
                <div className="bg-gray-900/50 px-6 py-4 flex justify-end rounded-b-lg">
                    <motion.button 
                        onClick={onClose} 
                        whileHover={{ scale: 1.05 }} 
                        whileTap={{ scale: 0.95 }} 
                        className="bg-brand-accent/80 hover:bg-brand-accent text-white font-bold py-2 px-4 rounded-lg transition-colors"
                    >
                        Got it!
                    </motion.button>
                </div>
            </motion.div>
        </motion.div>
    );
};


interface UnlockModalProps {
    onClose: () => void;
    onUnlockSuccess: () => void;
}

const UnlockModal: React.FC<UnlockModalProps> = ({ onClose, onUnlockSuccess }) => {
    const { unlockApp } = useAuth();
    const [email, setEmail] = useState('');
    const [emailError, setEmailError] = useState('');
    const [status, setStatus] = useState<'idle' | 'submitting'>('idle');

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (status !== 'idle' || !email) return;

        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
            setEmailError('Please enter a valid email address.');
            return;
        }
        setEmailError('');

        setStatus('submitting');
        await unlockApp(email);
        onUnlockSuccess();
    };
    
    const backdropVariants = {
        hidden: { opacity: 0 },
        visible: { opacity: 1 }
    };
    const modalVariants: Variants = {
        hidden: { opacity: 0, y: 30, scale: 0.95 },
        visible: { opacity: 1, y: 0, scale: 1, transition: { type: 'spring', stiffness: 300, damping: 25 } },
        exit: { opacity: 0, y: 20, scale: 0.95 }
    };

    return (
        <motion.div 
            className="fixed inset-0 bg-black bg-opacity-70 backdrop-blur-sm flex items-center justify-center z-50 p-4"
            variants={backdropVariants}
            initial="hidden"
            animate="visible"
            exit="hidden"
            onClick={onClose}
        >
          <motion.div 
            className="bg-brand-surface rounded-lg shadow-soft-glow-lg border border-brand-border w-full max-w-md"
            variants={modalVariants}
            onClick={(e) => e.stopPropagation()}
          >
            <form onSubmit={handleSubmit}>
              <div className="p-6">
                <h3 className="text-xl font-bold text-white">Unlock All Features</h3>
                <p className="text-gray-400 mt-2">Get the full picture. Unlock these powerful features by entering your email:</p>
                
                <ul className="space-y-3 mt-4 text-gray-300">
                    <li className="flex items-start">
                        <CheckCircleIcon className="w-5 h-5 mr-3 mt-0.5 text-brand-accent flex-shrink-0" />
                        <span>Automatically save your work to this browser</span>
                    </li>
                    <li className="flex items-start">
                        <CheckCircleIcon className="w-5 h-5 mr-3 mt-0.5 text-brand-accent flex-shrink-0" />
                        <span>Unlock the complete financial breakdown</span>
                    </li>
                    <li className="flex items-start">
                        <CheckCircleIcon className="w-5 h-5 mr-3 mt-0.5 text-brand-accent flex-shrink-0" />
                        <span>Enable sharing & exporting</span>
                    </li>
                    <li className="flex items-start">
                        <CheckCircleIcon className="w-5 h-5 mr-3 mt-0.5 text-brand-accent flex-shrink-0" />
                        <span>Get custom AI insights and SWOT on your org structure so you can operate confidently</span>
                    </li>
                     <li className="flex items-start">
                        <CheckCircleIcon className="w-5 h-5 mr-3 mt-0.5 text-brand-accent flex-shrink-0" />
                        <span>Be notified of new feature releases</span>
                    </li>
                </ul>
                
                <p className="text-gray-400 mt-4 text-sm">No fees, no spam, and you can unsubscribe at any time.</p>
                
                <div className="mt-4">
                  <input
                      type="email"
                      value={email}
                      onChange={(e) => {
                          setEmail(e.target.value);
                          if (emailError) setEmailError('');
                      }}
                      placeholder="your@email.com"
                      required
                      className={`w-full bg-gray-900 border rounded-lg px-3 py-2 text-white placeholder-gray-500 focus:ring-2 focus:border-brand-accent ${emailError ? 'border-red-500 focus:ring-red-500' : 'border-brand-border focus:ring-brand-accent'}`}
                  />
                  {emailError && <p className="text-red-400 text-sm mt-1">{emailError}</p>}
                </div>
              </div>
              <div className="bg-gray-900/50 px-6 py-4 flex flex-col-reverse sm:flex-row sm:justify-start sm:items-center sm:space-x-4 rounded-b-lg">
                <motion.button 
                    type="submit" 
                    disabled={status === 'submitting' || !email} 
                    whileHover={{ scale: 1.05 }} 
                    whileTap={{ scale: 0.95 }} 
                    className="bg-brand-accent/80 hover:bg-brand-accent text-white font-bold py-2 px-4 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
                >
                    {status === 'submitting' ? 'Unlocking...' : 'Unlock Now'}
                    <SparklesIcon className="w-4 h-4 ml-2" />
                </motion.button>
                <motion.button 
                    type="button" 
                    whileHover={{ y: -2 }} 
                    whileTap={{ y: 0 }} 
                    onClick={onClose} 
                    className="text-gray-400 hover:text-white text-sm transition-colors font-semibold py-2 sm:py-0"
                >
                    Cancel
                </motion.button>
              </div>
            </form>
          </motion.div>
        </motion.div>
    );
};

const SuccessToast: React.FC = () => {
    return (
        <motion.div
            className="fixed bottom-5 right-5 bg-green-600/90 text-white px-6 py-3 rounded-lg shadow-2xl flex items-center z-[100] backdrop-blur-sm border border-green-500"
            initial={{ opacity: 0, y: 50, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.9 }}
            transition={{ type: 'spring', stiffness: 200, damping: 20 }}
        >
            <CheckCircleIcon className="w-6 h-6 mr-3 text-green-200" />
            <div>
                <p className="font-bold">App Unlocked!</p>
                <p className="text-sm text-green-100">Full features enabled & your work is now autosaved.</p>
            </div>
        </motion.div>
    );
};

interface ExportModalProps {
    onClose: () => void;
    onConfirm: () => { link: string; csv: string };
    onDownloadPng: () => Promise<void>;
    isPngExportAvailable: boolean;
}

const ExportModal: React.FC<ExportModalProps> = ({ onClose, onConfirm, onDownloadPng, isPngExportAvailable }) => {
    const [shareableLink, setShareableLink] = useState('');
    const [csvData, setCsvData] = useState('');
    const [copyStatus, setCopyStatus] = useState<'idle' | 'copied'>('idle');
    const [isGeneratingPng, setIsGeneratingPng] = useState(false);

    useEffect(() => {
        const { link, csv } = onConfirm();
        setShareableLink(link);
        setCsvData(csv);
    }, [onConfirm]);

    const backdropVariants = {
        hidden: { opacity: 0 },
        visible: { opacity: 1 }
    };
    const modalVariants: Variants = {
        hidden: { opacity: 0, y: 30, scale: 0.95 },
        visible: { opacity: 1, y: 0, scale: 1, transition: { type: 'spring', stiffness: 300, damping: 25 } },
        exit: { opacity: 0, y: 20, scale: 0.95 }
    };

    const handleCopyLink = () => {
        navigator.clipboard.writeText(shareableLink).then(() => {
            setCopyStatus('copied');
            setTimeout(() => setCopyStatus('idle'), 2500);
        });
    };

    const handleDownloadCsv = () => {
        const blob = new Blob([csvData], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        const url = URL.createObjectURL(blob);
        link.setAttribute('href', url);
        link.setAttribute('download', 'org-chart.csv');
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };
    
    const handleDownloadPng = async () => {
        if (!isPngExportAvailable) return;
        setIsGeneratingPng(true);
        try {
            await onDownloadPng();
        } catch (error) {
            console.error("Failed to generate PNG:", error);
        } finally {
            setIsGeneratingPng(false);
        }
    };


    return (
        <motion.div 
            className="fixed inset-0 bg-black bg-opacity-80 flex items-center justify-center z-50 p-4"
            variants={backdropVariants}
            initial="hidden"
            animate="visible"
            exit="hidden"
        >
          <motion.div 
            className="bg-brand-surface rounded-lg shadow-soft-glow-lg border border-brand-border w-full max-w-md"
            variants={modalVariants}
          >
            <div className="p-6">
                <div className="text-left">
                    <h3 className="text-xl font-bold text-white">Export & Share</h3>
                    <p className="text-gray-400 mt-2 mb-4">Here are your shareable link and export options.</p>
                    
                    <label className="block text-sm font-medium text-gray-300 mb-1">Shareable Link</label>
                    <div className="flex space-x-2">
                        <input
                            type="text"
                            readOnly
                            value={shareableLink}
                            className="w-full bg-gray-900 border border-brand-border rounded-lg px-3 py-2 text-white placeholder-gray-500 focus:ring-2 focus:ring-brand-accent focus:border-brand-accent"
                        />
                        <motion.button 
                            onClick={handleCopyLink} 
                            whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }} 
                            className="bg-gray-600 hover:bg-gray-500 text-white font-bold py-2 px-4 rounded-lg transition-colors"
                        >
                            {copyStatus === 'copied' ? 'Copied!' : 'Copy'}
                        </motion.button>
                    </div>

                    <div className="mt-6 grid grid-cols-1 sm:grid-cols-2 gap-3">
                        {isPngExportAvailable && (
                            <motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }} onClick={handleDownloadPng} disabled={isGeneratingPng} className="w-full flex justify-center items-center bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-2 px-4 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed">
                                <PhotoIcon className="w-5 h-5 mr-2" />
                                {isGeneratingPng ? 'Generating...' : 'Download PNG'}
                            </motion.button>
                        )}
                        <motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }} onClick={handleDownloadCsv} className="w-full flex justify-center items-center bg-brand-accent/80 hover:bg-brand-accent text-white font-bold py-2 px-4 rounded-lg transition-colors">
                            <DocumentArrowDownIcon className="w-5 h-5 mr-2" />
                            Download CSV
                        </motion.button>
                    </div>
                      <div className="mt-3">
                          <motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }} onClick={onClose} className="w-full bg-gray-600 hover:bg-gray-500 text-white font-bold py-2 px-4 rounded-lg transition-colors">
                            Close
                        </motion.button>
                      </div>
                </div>
            </div>
          </motion.div>
        </motion.div>
    )
}


export default App;
