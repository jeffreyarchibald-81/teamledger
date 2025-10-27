

import React, { useState, useEffect } from 'react';
// FIX: import Variants to fix framer-motion type error
import { motion, Variants } from 'framer-motion';
import { Position, PositionInput, PositionUpdate } from '../types';

interface PositionEditorProps {
  onClose: () => void;
  onSave: (position: PositionInput | PositionUpdate) => void;
  existingPosition: Position | null;
  positions: Position[];
  parentId?: string | null;
  duplicateSource?: Position | null;
}

const PositionEditor: React.FC<PositionEditorProps> = ({ onClose, onSave, existingPosition, positions, parentId, duplicateSource }) => {
  const [role, setRole] = useState('');
  const [salary, setSalary] = useState('');
  const [rate, setRate] = useState('');
  const [utilization, setUtilization] = useState('');
  const [managerId, setManagerId] = useState<string | null>(null);
  const [roleType, setRoleType] = useState<'billable' | 'nonBillable'>('billable');

  useEffect(() => {
    if (existingPosition) {
      setRole(existingPosition.role);
      setSalary(String(existingPosition.salary));
      setRate(String(existingPosition.rate));
      setUtilization(String(existingPosition.utilization));
      setManagerId(existingPosition.managerId);
      setRoleType(existingPosition.roleType || 'billable');
    } else if (duplicateSource) {
      setRole(duplicateSource.role);
      setSalary(String(duplicateSource.salary));
      setRate(String(duplicateSource.rate));
      setUtilization(String(duplicateSource.utilization));
      setManagerId(duplicateSource.managerId);
      setRoleType(duplicateSource.roleType || 'billable');
    } else {
      setRole('');
      setSalary('');
      setRate('');
      setUtilization('');
      setManagerId(parentId || null);
      setRoleType('billable');
    }
  }, [existingPosition, parentId, duplicateSource]);
  
  useEffect(() => {
    if (roleType === 'nonBillable') {
        setRate('0');
        setUtilization('0');
    }
  }, [roleType]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const isNonBillable = roleType === 'nonBillable';
    const positionData = {
      role,
      salary: parseFloat(salary) || 0,
      rate: isNonBillable ? 0 : parseFloat(rate) || 0,
      utilization: isNonBillable ? 0 : parseFloat(utilization) || 0,
      managerId,
      roleType,
    };

    if (existingPosition) {
      onSave({ ...positionData, id: existingPosition.id });
    } else {
      onSave(positionData);
    }
  };

  const availableManagers = positions.filter(p => p.id !== existingPosition?.id);

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
        className="bg-brand-surface rounded-lg shadow-soft-glow-lg border border-brand-border w-full max-w-md"
        variants={modalVariants}
      >
        <form onSubmit={handleSubmit}>
          <div className="p-6">
            <h2 className="text-2xl font-bold text-white mb-6">{existingPosition ? 'Edit Position' : 'Add New Position'}</h2>
            <div className="space-y-4">
              <InputField label="Role Title" value={role} onChange={e => setRole(e.target.value)} placeholder="e.g., Senior Developer" required />
              
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Role Type</label>
                <div className="flex rounded-lg bg-gray-900 border border-brand-border p-1">
                  <button type="button" onClick={() => setRoleType('billable')} className={`flex-1 py-1.5 text-sm font-semibold rounded-md transition-colors ${roleType === 'billable' ? 'bg-brand-accent/80 text-white' : 'text-gray-400 hover:bg-gray-800'}`}>
                    Billable
                  </button>
                  <button type="button" onClick={() => setRoleType('nonBillable')} className={`flex-1 py-1.5 text-sm font-semibold rounded-md transition-colors ${roleType === 'nonBillable' ? 'bg-brand-accent/80 text-white' : 'text-gray-400 hover:bg-gray-800'}`}>
                    Non-Billable
                  </button>
                </div>
              </div>

              <InputField label="Salary ($)" type="number" value={salary} onChange={e => setSalary(e.target.value)} placeholder="e.g., 90000" required />
              <InputField label="Billable Rate ($/hr)" type="number" value={rate} onChange={e => setRate(e.target.value)} placeholder="e.g., 175" disabled={roleType === 'nonBillable'} />
              <InputField label="Utilization (%)" type="number" value={utilization} onChange={e => setUtilization(e.target.value)} placeholder="e.g., 75" disabled={roleType === 'nonBillable'} />
              
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">Manager</label>
                <select
                  value={managerId ?? ''}
                  onChange={e => setManagerId(e.target.value || null)}
                  className="w-full bg-gray-900 border border-brand-border rounded-lg px-3 py-2 text-white focus:ring-2 focus:ring-brand-accent focus:border-brand-accent"
                >
                  <option value="">-- No Manager --</option>
                  {availableManagers.map(p => (
                    <option key={p.id} value={p.id}>{p.role}</option>
                  ))}
                </select>
              </div>
            </div>
          </div>
          <div className="bg-gray-900/50 px-6 py-4 flex justify-end space-x-3 rounded-b-lg">
            <motion.button type="button" onClick={onClose} whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }} className="bg-gray-600 hover:bg-gray-500 text-white font-bold py-2 px-4 rounded-lg transition-colors">Cancel</motion.button>
            <motion.button type="submit" whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }} className="bg-brand-accent/80 hover:bg-brand-accent text-white font-bold py-2 px-4 rounded-lg transition-colors">Save</motion.button>
          </div>
        </form>
      </motion.div>
    </motion.div>
  );
};

interface InputFieldProps extends React.InputHTMLAttributes<HTMLInputElement> {
    label: string;
}

const InputField: React.FC<InputFieldProps> = ({ label, ...props }) => (
    <div>
        <label className="block text-sm font-medium text-gray-300 mb-1">{label}</label>
        <input
            {...props}
            className={`w-full border border-brand-border rounded-lg px-3 py-2 text-white placeholder-gray-500 focus:ring-2 focus:ring-brand-accent focus:border-brand-accent transition-colors ${props.disabled ? 'bg-gray-800 text-gray-500 cursor-not-allowed' : 'bg-gray-900'}`}
        />
    </div>
);

export default PositionEditor;