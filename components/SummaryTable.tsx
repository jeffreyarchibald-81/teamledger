

import React, { useMemo, useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Position, PositionUpdate } from '../types';

const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 0 }).format(value);
};

const formatPercent = (value: number) => {
    return `${value.toFixed(0)}%`;
};

type EditableField = 'role' | 'salary' | 'rate' | 'utilization';

interface SummaryTableProps {
    positions: Position[];
    onUpdatePosition: (positionUpdate: PositionUpdate) => void;
    onAddSubordinate: (managerId: string) => void;
    onEdit: (position: Position) => void;
    onDuplicate: (position: Position) => void;
    onDelete: (id: string) => void;
}

const SummaryTable: React.FC<SummaryTableProps> = ({ positions, onUpdatePosition, onAddSubordinate, onEdit, onDuplicate, onDelete }) => {
  const [editingCell, setEditingCell] = useState<{ id: string; field: EditableField } | null>(null);
  const [editValue, setEditValue] = useState<string>('');
  const [activeMenu, setActiveMenu] = useState<string | null>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
        if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
            setActiveMenu(null);
        }
    };
    if (activeMenu) {
        document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
        document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [activeMenu]);


  const handleEdit = (pos: Position, field: EditableField) => {
    setEditingCell({ id: pos.id, field });
    setEditValue(String(pos[field]));
  };

  const handleSave = () => {
    if (!editingCell) return;
    
    const { id, field } = editingCell;
    const position = positions.find(p => p.id === id);
    if (!position) return;
  
    const newValue = field === 'role' ? editValue : parseFloat(editValue) || 0;
    
    if (position[field] !== newValue) {
        const updatePayload: PositionUpdate = {
            id: position.id,
            role: position.role,
            salary: position.salary,
            rate: position.rate,
            utilization: position.utilization,
            managerId: position.managerId,
            [field]: newValue,
        };
      onUpdatePosition(updatePayload);
    }
  
    setEditingCell(null);
    setEditValue('');
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
      if (e.key === 'Enter') {
          handleSave();
      }
      if (e.key === 'Escape') {
          setEditingCell(null);
          setEditValue('');
      }
  }

  const totals = useMemo(() => {
    const total = positions.reduce((acc, pos) => {
      acc.salary += pos.salary;
      acc.totalSalary += pos.totalSalary;
      acc.overheadCost += pos.overheadCost;
      acc.revenue += pos.revenue;
      acc.profit += pos.profit;
      return acc;
    }, { salary: 0, totalSalary: 0, overheadCost: 0, revenue: 0, profit: 0 });

    const totalPotentialRevenue = positions
        .filter(p => p.rate > 0)
        .reduce((acc, p) => acc + (p.rate * 1540), 0);
    
    const avgUtilization = totalPotentialRevenue > 0 ? (total.revenue / totalPotentialRevenue) * 100 : 0;
    const totalMargin = total.revenue > 0 ? (total.profit / total.revenue) * 100 : 0;

    return { ...total, avgUtilization, totalMargin };
  }, [positions]);

  const headers = [
    'Role', 'Salary', 'Total Salary', 'Overhead Cost', 'Rate', 'Utilization', 'Revenue', 'Profit', 'Margin', 'Actions'
  ];
  
  const renderCell = (pos: Position, field: EditableField, displayValue: string) => {
    if (editingCell?.id === pos.id && editingCell?.field === field) {
        return (
            <input
                type={field === 'role' ? 'text' : 'number'}
                value={editValue}
                onChange={e => setEditValue(e.target.value)}
                onBlur={handleSave}
                onKeyDown={handleKeyDown}
                autoFocus
                className="w-full bg-brand-dark border border-brand-accent rounded px-2 py-1 -m-2"
            />
        );
    }
    return <div onClick={() => handleEdit(pos, field)} className="cursor-pointer h-full w-full border-b border-dashed border-brand-accent hover:border-white">{displayValue}</div>;
  };

  const menuItems = (pos: Position) => [
      { label: 'Add Subordinate', icon: UserPlusIcon, action: () => onAddSubordinate(pos.id) },
      { label: 'Edit', icon: PencilIcon, action: () => onEdit(pos) },
      { label: 'Duplicate', icon: DocumentDuplicateIcon, action: () => onDuplicate(pos) },
      { label: 'Delete', icon: TrashIcon, action: () => onDelete(pos.id), isDestructive: true },
  ];

  return (
    <div className="overflow-x-auto bg-brand-surface rounded-lg shadow-soft-glow border border-brand-border">
      <table className="min-w-full text-sm text-left text-gray-300">
        <thead className="text-xs text-gray-400 uppercase bg-gray-900/50">
          <tr>
            {headers.map(header => (
              <th key={header} scope="col" className="px-6 py-3 whitespace-nowrap tracking-wider">{header}</th>
            ))}
          </tr>
        </thead>
        <motion.tbody>
          <AnimatePresence>
          {positions.map(pos => (
            <motion.tr 
                key={pos.id} 
                className="bg-brand-surface border-b border-brand-border hover:bg-gray-800/20 transition-colors"
                layout
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ type: 'spring', stiffness: 300, damping: 30 }}
            >
              <td className="px-6 py-4 font-medium text-white whitespace-nowrap">{renderCell(pos, 'role', pos.role)}</td>
              <td className="px-6 py-4">{renderCell(pos, 'salary', formatCurrency(pos.salary))}</td>
              <td className="px-6 py-4 text-gray-400">{formatCurrency(pos.totalSalary)}</td>
              <td className="px-6 py-4 text-gray-400">{formatCurrency(pos.overheadCost)}</td>
              <td className="px-6 py-4">{renderCell(pos, 'rate', formatCurrency(pos.rate))}</td>
              <td className="px-6 py-4">{renderCell(pos, 'utilization', formatPercent(pos.utilization))}</td>
              <td className="px-6 py-4 text-gray-400">{formatCurrency(pos.revenue)}</td>
              <td className={`px-6 py-4 font-semibold ${pos.profit >= 0 ? 'text-green-400' : 'text-red-400'}`}>{formatCurrency(pos.profit)}</td>
              <td className={`px-6 py-4 font-semibold ${pos.margin >= 0 ? 'text-green-400' : 'text-red-400'}`}>{formatPercent(pos.margin)}</td>
              <td className="px-6 py-4 text-center">
                <div className="relative inline-block text-left">
                    <button onClick={() => setActiveMenu(activeMenu === pos.id ? null : pos.id)} className="p-2 rounded-full hover:bg-gray-700 transition-colors">
                        <EllipsisVerticalIcon className="w-5 h-5" />
                    </button>
                     <AnimatePresence>
                        {activeMenu === pos.id && (
                            <motion.div 
                                ref={menuRef} 
                                className="origin-top-right absolute right-0 mt-2 w-48 rounded-md shadow-lg bg-gray-800 ring-1 ring-black ring-opacity-5 z-10"
                                initial={{ opacity: 0, scale: 0.95, y: -10 }}
                                animate={{ opacity: 1, scale: 1, y: 0 }}
                                exit={{ opacity: 0, scale: 0.95, y: -10 }}
                                transition={{ duration: 0.15 }}
                            >
                                <div className="py-1" role="menu" aria-orientation="vertical" aria-labelledby="options-menu">
                                    {menuItems(pos).map(item => (
                                        <button
                                            key={item.label}
                                            onClick={() => { item.action(); setActiveMenu(null); }}
                                            className={`w-full text-left flex items-center px-4 py-2 text-sm ${item.isDestructive ? 'text-red-400 hover:bg-red-500/10 hover:text-red-300' : 'text-gray-300 hover:bg-gray-700/50 hover:text-white'}`}
                                            role="menuitem"
                                        >
                                            <item.icon className={`w-4 h-4 mr-3 ${item.isDestructive ? '' : 'text-gray-400'}`} />
                                            {item.label}
                                        </button>
                                    ))}
                                </div>
                            </motion.div>
                        )}
                    </AnimatePresence>
                </div>
              </td>
            </motion.tr>
          ))}
          </AnimatePresence>
        </motion.tbody>
        <tfoot className="font-bold text-white bg-black">
            <tr>
                <td className="px-6 py-4">Totals</td>
                <td className="px-6 py-4">{formatCurrency(totals.salary)}</td>
                <td className="px-6 py-4">{formatCurrency(totals.totalSalary)}</td>
                <td className="px-6 py-4">{formatCurrency(totals.overheadCost)}</td>
                <td className="px-6 py-4 text-gray-500">-</td>
                <td className="px-6 py-4">{formatPercent(totals.avgUtilization)}</td>
                <td className="px-6 py-4">{formatCurrency(totals.revenue)}</td>
                <td className={`px-6 py-4 ${totals.profit >= 0 ? 'text-green-400' : 'text-red-400'}`}>{formatCurrency(totals.profit)}</td>
                <td className={`px-6 py-4 ${totals.totalMargin >= 0 ? 'text-green-400' : 'text-red-400'}`}>{formatPercent(totals.totalMargin)}</td>
                <td className="px-6 py-4"></td>
            </tr>
        </tfoot>
      </table>
    </div>
  );
};

const EllipsisVerticalIcon: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (
// FIX: Removed duplicate `fill` and `viewBox` attributes.
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" {...props}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 6.75a.75.75 0 1 1 0-1.5.75.75 0 0 1 0 1.5ZM12 12.75a.75.75 0 1 1 0-1.5.75.75 0 0 1 0 1.5ZM12 18.75a.75.75 0 1 1 0-1.5.75.75 0 0 1 0 1.5Z" />
    </svg>
);
const UserPlusIcon: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (
// FIX: Removed duplicate `fill` and `viewBox` attributes.
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" {...props}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M19 7.5v3m0 0v3m0-3h3m-3 0h-3m-2.25-4.125a3.375 3.375 0 1 1-6.75 0 3.375 3.375 0 0 1 6.75 0ZM3.375 19.5h17.25a2.25 2.25 0 0 0 2.25-2.25v-1.5a2.25 2.25 0 0 0-2.25-2.25H3.375a2.25 2.25 0 0 0-2.25 2.25v1.5a2.25 2.25 0 0 0 2.25 2.25Z" />
    </svg>
);

const PencilIcon: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (
// FIX: Removed duplicate `fill` and `viewBox` attributes.
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" {...props}>
        <path strokeLinecap="round" strokeLinejoin="round" d="m16.862 4.487 1.687-1.688a1.875 1.875 0 1 1 2.652 2.652L10.582 16.07a4.5 4.5 0 0 1-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 0 1 1.13-1.897l8.932-8.931Zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0 1 15.75 21H5.25A2.25 2.25 0 0 1 3 18.75V8.25A2.25 2.25 0 0 1 5.25 6H10" />
    </svg>
);

const TrashIcon: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (
// FIX: Removed duplicate `fill` and `viewBox` attributes.
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" {...props}>
        <path strokeLinecap="round" strokeLinejoin="round" d="m14.74 9-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 0 1-2.244 2.077H8.084a2.25 2.25 0 0 1-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 0 0-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 0 1 3.478-.397m7.5 0v-.916c0-1.18-.91-2.134-2.09-2.201a51.964 51.964 0 0 0-3.32 0c-1.18.067-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 0 0-7.5 0" />
    </svg>
);

const DocumentDuplicateIcon: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (
// FIX: Removed duplicate `fill` and `viewBox` attributes.
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" {...props}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 17.25v3.375c0 .621-.504 1.125-1.125 1.125h-9.75a1.125 1.125 0 0 1-1.125-1.125V7.875c0-.621.504-1.125 1.125-1.125H6.75a9.06 9.06 0 0 1 1.5.124m7.5 10.376h3.375c.621 0 1.125-.504 1.125-1.125V11.25c0-4.46-3.243-8.161-7.5-8.876a9.06 9.06 0 0 0-1.5-.124H9.375c-.621 0-1.125.504-1.125 1.125v3.5m7.5 10.375H9.375a1.125 1.125 0 0 1-1.125-1.125v-9.25m9.75 11.375c.621 0 1.125-.504 1.125-1.125v-9.25a3.375 3.375 0 0 0-3.375-3.375h-1.5a1.125 1.125 0 0 1-1.125-1.125v-1.5a3.375 3.375 0 0 0-3.375-3.375H9.75" />
    </svg>
);


export default SummaryTable;