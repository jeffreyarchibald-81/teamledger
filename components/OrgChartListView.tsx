import React from 'react';
import { TreeNode, Position } from '../types';
import PositionCard from './PositionCard';

/**
 * @interface OrgChartListViewProps
 * @description Defines the props for the OrgChartListView component.
 */
interface OrgChartListViewProps {
  /** The hierarchical data structure of the organization to be rendered. */
  tree: TreeNode[];
  /** Callback function to add a new direct report to a position. */
  onAddSubordinate: (managerId: string) => void;
  /** Callback function to edit an existing position. */
  onEdit: (position: Position) => void;
  /** Callback function to delete a position. */
  onDelete: (id: string) => void;
  /** Callback function to duplicate a position. */
  onDuplicate: (position: Position) => void;
}

/**
 * @description A component that recursively renders the organizational chart in a linear, indented list format.
 * This provides an alternative, more compact view compared to the visual tree.
 */
const OrgChartListView: React.FC<OrgChartListViewProps> = ({ tree, onAddSubordinate, onEdit, onDelete, onDuplicate }) => {
  
  /**
   * @description Recursively renders a single node and its children in the list view.
   * @param {TreeNode} node - The tree node to render.
   * @returns {React.ReactElement} The rendered div element containing the card and its children.
   */
  const renderNode = (node: TreeNode) => (
    // The margin-left style creates the indentation based on the node's depth in the tree.
    <div key={node.id} style={{ marginLeft: `${node.depth > 0 ? 2 : 0}rem` }} className="mt-4">
      <PositionCard
        position={node}
        onAddSubordinate={() => onAddSubordinate(node.id)}
        onEdit={() => onEdit(node)}
        onDelete={() => onDelete(node.id)}
        onDuplicate={() => onDuplicate(node)}
      />
      {/* If the node has children, they are rendered within a container that has a visual connecting line. */}
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
