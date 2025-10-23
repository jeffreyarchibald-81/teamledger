import React from 'react';
import { motion } from 'framer-motion';
import { Position } from '../types';

interface PositionCardProps {
  position: Position;
  onAddSubordinate: () => void;
  onEdit: () => void;
  onDelete: () => void;
  onDuplicate: () => void;
}

const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(value);
};

const PositionCard: React.FC<PositionCardProps> = ({ position, onAddSubordinate, onEdit, onDelete, onDuplicate }) => {
  const marginColor = position.margin >= 0 ? 'text-green-400' : 'text-red-400';

  return (
    <motion.div 
        className="card-gradient p-3 rounded-lg shadow-soft-glow transition-shadow border border-brand-border"
        whileHover={{ scale: 1.05, y: -5, boxShadow: '0 20px 40px -15px rgba(0, 0, 0, 0.4), 0 0 40px 0 rgba(34, 211, 238, 0.1)' }}
        transition={{ type: 'spring', stiffness: 300, damping: 20 }}
    >
      <div className="flex justify-between items-start">
        <div className="flex-grow">
          <h3 className="text-base font-bold text-white text-left">{position.role}</h3>
          <div className="text-xs text-gray-400 mt-2 text-left space-y-1">
            <p>Salary: <span className="font-semibold text-gray-300">{formatCurrency(position.salary)}</span></p>
            <p>Profit: <span className={`font-semibold ${marginColor}`}>{formatCurrency(position.profit)}</span></p>
            <p>Margin: <span className={`font-semibold ${marginColor}`}>{position.margin.toFixed(0)}%</span></p>
          </div>
        </div>
        <div className="flex flex-col space-y-1 ml-2">
            <button onClick={onAddSubordinate} title="Add Subordinate" className="p-1.5 rounded-full hover:bg-gray-600/50 transition-colors">
                <UserPlusIcon className="w-4 h-4 text-gray-300" />
            </button>
            <button onClick={onEdit} title="Edit Position" className="p-1.5 rounded-full hover:bg-gray-600/50 transition-colors">
                <PencilIcon className="w-4 h-4 text-gray-300" />
            </button>
             <button onClick={onDuplicate} title="Duplicate Position" className="p-1.5 rounded-full hover:bg-gray-600/50 transition-colors">
                <DocumentDuplicateIcon className="w-4 h-4 text-gray-300" />
            </button>
            <button onClick={onDelete} title="Delete Position" className="p-1.5 rounded-full hover:bg-red-500/20 transition-colors">
                <TrashIcon className="w-4 h-4 text-red-400" />
            </button>
        </div>
      </div>
    </motion.div>
  );
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

const TrashIcon: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" {...props}>
        <path strokeLinecap="round" strokeLinejoin="round" d="m14.74 9-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 0 1-2.244 2.077H8.084a2.25 2.25 0 0 1-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 0 0-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 0 1 3.478-.397m7.5 0v-.916c0-1.18-.91-2.134-2.09-2.201a51.964 51.964 0 0 0-3.32 0c-1.18.067-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 0 0-7.5 0" />
    </svg>
);

const DocumentDuplicateIcon: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" {...props}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 17.25v3.375c0 .621-.504 1.125-1.125 1.125h-9.75a1.125 1.125 0 0 1-1.125-1.125V7.875c0-.621.504-1.125 1.125-1.125H6.75a9.06 9.06 0 0 1 1.5.124m7.5 10.376h3.375c.621 0 1.125-.504 1.125-1.125V11.25c0-4.46-3.243-8.161-7.5-8.876a9.06 9.06 0 0 0-1.5-.124H9.375c-.621 0-1.125.504-1.125 1.125v3.5m7.5 10.375H9.375a1.125 1.125 0 0 1-1.125-1.125v-9.25m9.75 11.375c.621 0 1.125-.504 1.125-1.125v-9.25a3.375 3.375 0 0 0-3.375-3.375h-1.5a1.125 1.125 0 0 1-1.125-1.125v-1.5a3.375 3.375 0 0 0-3.375-3.375H9.75" />
    </svg>
);

export default PositionCard;