import React from 'react';
import { TreeNode, Position } from '../types';
import PositionCard from './PositionCard';

interface OrgChartListViewProps {
  tree: TreeNode[];
  onAddSubordinate: (managerId: string) => void;
  onEdit: (position: Position) => void;
  onDelete: (id: string) => void;
  onDuplicate: (position: Position) => void;
}

const OrgChartListView: React.FC<OrgChartListViewProps> = ({ tree, onAddSubordinate, onEdit, onDelete, onDuplicate }) => {
  const renderNode = (node: TreeNode) => (
    <div key={node.id} style={{ marginLeft: `${node.depth > 0 ? 2 : 0}rem` }} className="mt-4">
      <PositionCard
        position={node}
        onAddSubordinate={() => onAddSubordinate(node.id)}
        onEdit={() => onEdit(node)}
        onDelete={() => onDelete(node.id)}
        onDuplicate={() => onDuplicate(node)}
      />
      {node.children && node.children.length > 0 && (
        <div className="border-l-2 border-gray-700 pl-4">
          {node.children.map(renderNode)}
        </div>
      )}
    </div>
  );

  return (
    <div>
        {tree.map(renderNode)}
    </div>
  );
};

export default OrgChartListView;