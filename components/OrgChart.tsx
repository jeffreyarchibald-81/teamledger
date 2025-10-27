import React from 'react';
import { TreeNode, Position } from '../types';
import PositionCard from './PositionCard';

/**
 * @interface OrgChartProps
 * @description Defines the props for the OrgChart component.
 */
interface OrgChartProps {
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
  /** A ref passed to the root element, used for capturing the chart as a PNG. */
  captureRef?: React.Ref<HTMLDivElement>;
}

/**
 * @description A component that recursively renders the organizational chart in a visual tree layout.
 * It uses a nested list structure (`<ul>` and `<li>`) and relies on CSS for the connecting lines.
 */
const OrgChart: React.FC<OrgChartProps> = ({ tree, onAddSubordinate, onEdit, onDelete, onDuplicate, captureRef }) => {
  
  /**
   * @description Recursively renders a single node (and its children) of the org chart.
   * @param {TreeNode} node - The tree node to render.
   * @returns {React.ReactElement} The rendered list item element.
   */
  const renderNode = (node: TreeNode) => (
    <li key={node.id}>
        <PositionCard
          position={node}
          onAddSubordinate={() => onAddSubordinate(node.id)}
          onEdit={() => onEdit(node)}
          onDelete={() => onDelete(node.id)}
          onDuplicate={() => onDuplicate(node)}
        />
      {/* If the node has children, recursively render them in a nested list. */}
      {node.children && node.children.length > 0 && (
        <ul>
          {node.children.map(renderNode)}
        </ul>
      )}
    </li>
  );

  return (
    // The main container for the org chart, with the ref for image capture.
    <div className="org-tree" ref={captureRef}>
        <ul>
            {tree.map(renderNode)}
        </ul>
    </div>
  );
};

export default OrgChart;
