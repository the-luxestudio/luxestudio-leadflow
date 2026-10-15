'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import {
  DndContext,
  DragOverlay,
  useDraggable,
  useDroppable,
  PointerSensor,
  useSensor,
  useSensors,
  DragStartEvent,
  DragEndEvent,
} from '@dnd-kit/core';
import {
  Plus,
  RefreshCw,
  Calendar,
  AlertCircle,
  Award,
  ChevronRight,
  TrendingUp,
  User,
  MapPin,
  ExternalLink,
} from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Modal } from '@/components/ui/Modal';

// Droppable Column Component
function KanbanColumn({
  stage,
  count,
  totalValue,
  children,
}: {
  stage: any;
  count: number;
  totalValue: number;
  children: React.ReactNode;
}) {
  const { setNodeRef, isOver } = useDroppable({
    id: stage.id,
  });

  return (
    <div
      ref={setNodeRef}
      className={`w-72 shrink-0 flex flex-col rounded-xl bg-charcoal-50/70 border transition-all ${
        isOver
          ? 'border-gold-500 bg-gold-500/5 ring-2 ring-gold-500/20'
          : 'border-charcoal-200'
      }`}
    >
      {/* Column Header */}
      <div className="p-3.5 border-b border-charcoal-200 flex items-center justify-between bg-white rounded-t-xl">
        <div className="flex items-center gap-2">
          <span
            className="w-2.5 h-2.5 rounded-full"
            style={{ backgroundColor: stage.color || '#C5A84D' }}
          />
          <h3 className="text-xs font-bold text-charcoal-900">{stage.name}</h3>
          <span className="px-1.5 py-0.2 rounded-full bg-charcoal-100 text-charcoal-600 text-[10px] font-semibold">
            {count}
          </span>
        </div>
        <span className="text-[11px] font-semibold text-charcoal-700">
          ₹{totalValue.toLocaleString('en-IN')}
        </span>
      </div>

      {/* Cards Scroll Area */}
      <div className="p-2.5 space-y-2.5 flex-1 min-h-[500px] overflow-y-auto max-h-[calc(100vh-220px)]">
        {children}
      </div>
    </div>
  );
}

// Draggable Lead Card Component
function KanbanCard({ lead, isOverlay = false }: { lead: any; isOverlay?: boolean }) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: lead.id,
  });

  const style = transform
    ? {
        transform: `translate3d(${transform.x}px, ${transform.y}px, 0)`,
      }
    : undefined;

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...listeners}
      {...attributes}
      className={`p-3.5 rounded-xl bg-white border border-charcoal-200 shadow-xs hover:border-gold-400 hover:shadow-subtle transition-all cursor-grab active:cursor-grabbing ${
        isDragging ? 'opacity-30' : ''
      } ${isOverlay ? 'shadow-2xl border-gold-500 ring-2 ring-gold-500/30 rotate-1' : ''}`}
    >
      <div className="flex items-start justify-between gap-1.5 mb-1.5">
        <Badge
          variant={
            lead.priority === 'URGENT'
              ? 'danger'
              : lead.priority === 'HIGH'
              ? 'warning'
              : 'default'
          }
          size="sm"
        >
          {lead.priority}
        </Badge>
        <span className="text-xs font-bold text-charcoal-900">
          {lead.dealValue ? `₹${lead.dealValue.toLocaleString('en-IN')}` : '—'}
        </span>
      </div>

      <Link
        href={`/leads/${lead.id}`}
        onClick={(e) => isDragging && e.preventDefault()}
        className="text-xs font-bold text-charcoal-900 hover:text-gold-600 transition-colors block line-clamp-1"
      >
        {lead.businessName}
      </Link>

      <p className="text-[11px] text-charcoal-500 line-clamp-1 mt-0.5">
        {lead.primaryContact ? lead.primaryContact.name : lead.category || 'Prospect'}
      </p>

      {/* Follow-up / Overdue Pill */}
      {lead.nextFollowUp && (
        <div
          className={`mt-2.5 px-2 py-1 rounded text-[10px] font-medium flex items-center justify-between ${
            lead.nextFollowUp.isOverdue
              ? 'bg-rose-50 text-rose-700 border border-rose-200 font-semibold'
              : 'bg-charcoal-50 text-charcoal-600 border border-charcoal-200'
          }`}
        >
          <span className="flex items-center gap-1">
            <Calendar className="w-3 h-3" />
            {lead.nextFollowUp.actionType}
          </span>
          <span>
            {new Date(lead.nextFollowUp.dueAt).toLocaleDateString('en-IN', {
              month: 'short',
              day: 'numeric',
            })}
          </span>
        </div>
      )}

      {/* Footer Info */}
      <div className="mt-2.5 pt-2 border-t border-charcoal-100 flex items-center justify-between text-[10px] text-charcoal-400">
        <span>Owner: {lead.owner?.displayName?.split(' ')[0] || 'Unassigned'}</span>
        <span className="text-gold-600 font-semibold hover:underline">View &rarr;</span>
      </div>
    </div>
  );
}

export default function PipelinePage() {
  const [columns, setColumns] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeDragLead, setActiveDragLead] = useState<any | null>(null);

  // Transition Modals for Won / Lost
  const [wonModalOpen, setWonModalOpen] = useState(false);
  const [lostModalOpen, setLostModalOpen] = useState(false);
  const [pendingTransition, setPendingTransition] = useState<{
    leadId: string;
    targetStageId: string;
    leadName: string;
    initialValue: number;
  } | null>(null);

  const [wonAgreedAmount, setWonAgreedAmount] = useState<number>(0);
  const [wonNotes, setWonNotes] = useState('');
  const [lostReason, setLostReason] = useState('Chose Competitor');
  const [lostNotes, setLostNotes] = useState('');
  const [transitioning, setTransitioning] = useState(false);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 5,
      },
    })
  );

  useEffect(() => {
    fetchBoard();
  }, []);

  const fetchBoard = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/pipeline');
      if (res.ok) {
        const json = await res.json();
        setColumns(json.columns || []);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleDragStart = (event: DragStartEvent) => {
    const leadId = event.active.id as string;
    for (const col of columns) {
      const found = col.leads.find((l: any) => l.id === leadId);
      if (found) {
        setActiveDragLead(found);
        break;
      }
    }
  };

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveDragLead(null);

    if (!over) return;

    const leadId = active.id as string;
    const targetStageId = over.id as string;

    // Find current stage
    let currentStageId = '';
    let draggedLead: any = null;
    for (const col of columns) {
      const match = col.leads.find((l: any) => l.id === leadId);
      if (match) {
        currentStageId = col.stage.id;
        draggedLead = match;
        break;
      }
    }

    if (currentStageId === targetStageId) return;

    // Check if target stage is Won or Lost
    const targetColumn = columns.find((c) => c.stage.id === targetStageId);
    if (!targetColumn) return;

    if (targetColumn.stage.isWon) {
      setPendingTransition({
        leadId,
        targetStageId,
        leadName: draggedLead?.businessName || 'Lead',
        initialValue: draggedLead?.dealValue || 0,
      });
      setWonAgreedAmount(draggedLead?.dealValue || 0);
      setWonModalOpen(true);
      return;
    }

    if (targetColumn.stage.isLost) {
      setPendingTransition({
        leadId,
        targetStageId,
        leadName: draggedLead?.businessName || 'Lead',
        initialValue: draggedLead?.dealValue || 0,
      });
      setLostModalOpen(true);
      return;
    }

    // Normal stage transition: Optimistic update
    const prevColumns = [...columns];
    setColumns((cols) =>
      cols.map((col) => {
        if (col.stage.id === currentStageId) {
          return {
            ...col,
            leads: col.leads.filter((l: any) => l.id !== leadId),
            count: col.count - 1,
            totalValue: col.totalValue - (draggedLead?.dealValue || 0),
          };
        }
        if (col.stage.id === targetStageId) {
          return {
            ...col,
            leads: [draggedLead, ...col.leads],
            count: col.count + 1,
            totalValue: col.totalValue + (draggedLead?.dealValue || 0),
          };
        }
        return col;
      })
    );

    try {
      const res = await fetch('/api/pipeline', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ leadId, targetStageId }),
      });
      if (!res.ok) {
        setColumns(prevColumns); // Revert on failure
      }
    } catch (err) {
      console.error(err);
      setColumns(prevColumns);
    }
  };

  const handleConfirmWon = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!pendingTransition) return;
    setTransitioning(true);

    try {
      const res = await fetch('/api/pipeline', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          leadId: pendingTransition.leadId,
          targetStageId: pendingTransition.targetStageId,
          wonDetails: {
            agreedAmount: Number(wonAgreedAmount),
            notes: wonNotes,
          },
        }),
      });

      if (res.ok) {
        setWonModalOpen(false);
        setPendingTransition(null);
        fetchBoard();
      }
    } catch (err) {
      console.error(err);
    } finally {
      setTransitioning(false);
    }
  };

  const handleConfirmLost = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!pendingTransition) return;
    setTransitioning(true);

    try {
      const res = await fetch('/api/pipeline', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          leadId: pendingTransition.leadId,
          targetStageId: pendingTransition.targetStageId,
          lostDetails: {
            reason: lostReason,
            notes: lostNotes,
          },
        }),
      });

      if (res.ok) {
        setLostModalOpen(false);
        setPendingTransition(null);
        fetchBoard();
      }
    } catch (err) {
      console.error(err);
    } finally {
      setTransitioning(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-charcoal-900 tracking-tight flex items-center gap-2">
            Sales Pipeline Kanban
            <TrendingUp className="w-4 h-4 text-gold-500" />
          </h1>
          <p className="text-xs text-charcoal-500 mt-0.5">
            Drag leads between stages to progress deals and record milestone activities.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={fetchBoard}>
            <RefreshCw className="w-3.5 h-3.5" />
            <span>Refresh</span>
          </Button>

          <Link href="/leads/new">
            <Button variant="gold" size="sm">
              <Plus className="w-4 h-4" />
              <span>Add Lead</span>
            </Button>
          </Link>
        </div>
      </div>

      {/* Board Scrollable Area */}
      {loading ? (
        <div className="bg-white p-12 rounded-xl border border-charcoal-200 text-center space-y-3">
          <RefreshCw className="w-6 h-6 animate-spin text-gold-600 mx-auto" />
          <p className="text-xs text-charcoal-500">Loading pipeline stages...</p>
        </div>
      ) : (
        <DndContext
          sensors={sensors}
          onDragStart={handleDragStart}
          onDragEnd={handleDragEnd}
        >
          <div className="flex gap-4 overflow-x-auto pb-6 pt-1">
            {columns.map((column) => (
              <KanbanColumn
                key={column.stage.id}
                stage={column.stage}
                count={column.count}
                totalValue={column.totalValue}
              >
                {column.leads.map((lead: any) => (
                  <KanbanCard key={lead.id} lead={lead} />
                ))}
              </KanbanColumn>
            ))}
          </div>

          <DragOverlay>
            {activeDragLead ? <KanbanCard lead={activeDragLead} isOverlay /> : null}
          </DragOverlay>
        </DndContext>
      )}

      {/* Won Stage Confirmation Modal */}
      <Modal
        isOpen={wonModalOpen}
        onClose={() => {
          setWonModalOpen(false);
          setPendingTransition(null);
        }}
        title="🎉 Confirm Won Deal"
        description={`Record final investment and close details for ${pendingTransition?.leadName}`}
      >
        <form onSubmit={handleConfirmWon} className="space-y-4">
          <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200">
            <div className="flex items-center gap-2 text-emerald-800 font-bold text-xs mb-1">
              <Award className="w-4 h-4 text-emerald-600" />
              <span>Winning Deal Milestone</span>
            </div>
            <p className="text-xs text-emerald-700">
              Moving to Won closes the opportunity, records celebration activity in the timeline, and completes sequence tasks.
            </p>
          </div>

          <div>
            <label className="block text-xs font-semibold text-charcoal-700 mb-1">
              Final Agreed Contract Value (INR) *
            </label>
            <input
              type="number"
              required
              min="1"
              value={wonAgreedAmount}
              onChange={(e) => setWonAgreedAmount(Number(e.target.value))}
              className="w-full text-xs border border-charcoal-300 rounded-lg p-2.5 text-charcoal-900 focus:outline-none focus:ring-2 focus:ring-emerald-500"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-charcoal-700 mb-1">
              Closing Notes & Milestones
            </label>
            <textarea
              rows={3}
              value={wonNotes}
              onChange={(e) => setWonNotes(e.target.value)}
              placeholder="e.g. 50% advance invoice sent. Sprint kickoff scheduled for Monday."
              className="w-full text-xs border border-charcoal-300 rounded-lg p-2.5 text-charcoal-900"
            />
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => {
                setWonModalOpen(false);
                setPendingTransition(null);
              }}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant="gold"
              size="sm"
              isLoading={transitioning}
              className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold"
            >
              Confirm Deal Won 🏆
            </Button>
          </div>
        </form>
      </Modal>

      {/* Lost Stage Confirmation Modal */}
      <Modal
        isOpen={lostModalOpen}
        onClose={() => {
          setLostModalOpen(false);
          setPendingTransition(null);
        }}
        title="Confirm Lost Lead"
        description={`Record reason for losing ${pendingTransition?.leadName}`}
      >
        <form onSubmit={handleConfirmLost} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-charcoal-700 mb-1">
              Primary Reason for Loss *
            </label>
            <select
              value={lostReason}
              onChange={(e) => setLostReason(e.target.value)}
              className="w-full text-xs border border-charcoal-300 rounded-lg p-2.5 text-charcoal-900 bg-white"
            >
              <option value="Chose Competitor">Chose Competitor</option>
              <option value="Budget Constraint">Budget Constraint</option>
              <option value="Built In-House">Built In-House</option>
              <option value="No Response / Ghosted">No Response / Ghosted</option>
              <option value="Not Qualified / Bad Fit">Not Qualified / Bad Fit</option>
              <option value="Project Postponed Indefinitely">Project Postponed Indefinitely</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-charcoal-700 mb-1">
              Loss Reflection / Notes
            </label>
            <textarea
              rows={3}
              value={lostNotes}
              onChange={(e) => setLostNotes(e.target.value)}
              placeholder="Key lessons, pricing objections, or competitor notes..."
              className="w-full text-xs border border-charcoal-300 rounded-lg p-2.5 text-charcoal-900"
            />
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => {
                setLostModalOpen(false);
                setPendingTransition(null);
              }}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant="danger"
              size="sm"
              isLoading={transitioning}
              className="font-bold"
            >
              Mark Lead as Lost
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
