import React from 'react';
import { TreeNode, Position } from '../types';
import PositionCard from './PositionCard';

interface OrgChartProps {
  tree: TreeNode[];
  onAddSubordinate: (managerId: string) => void;
  onEdit: (position: Position) => void;
  onDelete: (id: string) => void;
  onDuplicate: (position: Position) => void;
  captureRef?: React.Ref<HTMLDivElement>;
}

const OrgChart: React.FC<OrgChartProps> = ({ tree, onAddSubordinate, onEdit, onDelete, onDuplicate, captureRef }) => {
  const renderNode = (node: TreeNode) => (
    <li key={node.id}>
        <PositionCard
          position={node}
          onAddSubordinate={() => onAddSubordinate(node.id)}
          onEdit={() => onEdit(node)}
          onDelete={() => onDelete(node.id)}
          onDuplicate={() => onDuplicate(node)}
        />
      {node.children && node.children.length > 0 && (
        <ul>
          {node.children.map(renderNode)}
        </ul>
      )}
    </li>
  );

  return (
    <div className="org-tree" ref={captureRef}>
        <ul>
            {tree.map(renderNode)}
        </ul>
    </div>
  );
};

export default OrgChart;