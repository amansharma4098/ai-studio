import React from 'react'

const ReactFlow = ({ children }: any) => <div data-testid="react-flow">{children}</div>
export default ReactFlow

export const Background = () => <div data-testid="rf-background" />
export const Controls = () => <div data-testid="rf-controls" />
export const MiniMap = () => <div data-testid="rf-minimap" />
export const addEdge = jest.fn()
export const useNodesState = jest.fn().mockReturnValue([[], jest.fn(), jest.fn()])
export const useEdgesState = jest.fn().mockReturnValue([[], jest.fn(), jest.fn()])
export type Connection = any
export type Edge = any
