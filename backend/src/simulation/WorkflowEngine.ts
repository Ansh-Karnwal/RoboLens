import { EventType, Position, RobotId, SimulationEvent } from '../types';
import { Robot } from './Robot';

interface WorkflowNode {
  id: string;
  type: string;
  data: Record<string, string>;
}

interface WorkflowEdge {
  id: string;
  source: string;
  target: string;
  sourceHandle?: string;
}

export interface WorkflowAction {
  action: string;
  triggeredBy: string;
}

const CHARGE_ZONE: Position = { x: 1, y: 1 };

export class WorkflowEngine {
  private nodes: WorkflowNode[] = [];
  private edges: WorkflowEdge[] = [];

  updateWorkflow(nodes: WorkflowNode[], edges: WorkflowEdge[]): void {
    this.nodes = nodes;
    this.edges = edges;
    console.log(`[WorkflowEngine] Updated: ${nodes.length} nodes, ${edges.length} edges`);
  }

  /**
   * Given a simulation event, find matching trigger nodes and
   * follow edges to collect the resulting actions.
   */
  evaluate(event: SimulationEvent, robots: Robot[]): WorkflowAction[] {
    const actions: WorkflowAction[] = [];

    // Find trigger nodes that match this event type
    const triggers = this.nodes.filter(
      (n) => n.type === 'triggerNode' && n.data.eventType === event.type
    );

    for (const trigger of triggers) {
      // Follow edges from this trigger
      this.followEdges(trigger.id, event, robots, actions, new Set());
    }

    return actions;
  }

  private followEdges(
    nodeId: string,
    event: SimulationEvent,
    robots: Robot[],
    actions: WorkflowAction[],
    visited: Set<string>
  ): void {
    if (visited.has(nodeId)) return;
    visited.add(nodeId);

    // Find all edges from this node
    const outEdges = this.edges.filter((e) => e.source === nodeId);

    for (const edge of outEdges) {
      const targetNode = this.nodes.find((n) => n.id === edge.target);
      if (!targetNode) continue;

      if (targetNode.type === 'conditionNode') {
        // Evaluate condition, then follow the appropriate branch
        const result = this.evaluateCondition(targetNode.data.condition, event, robots);
        const handle = result ? 'yes' : 'no';

        // Follow edges from this condition node with the matching handle
        const conditionEdges = this.edges.filter(
          (e) => e.source === targetNode.id && (e.sourceHandle === handle || (!e.sourceHandle && result))
        );
        for (const ce of conditionEdges) {
          const nextNode = this.nodes.find((n) => n.id === ce.target);
          if (nextNode) {
            this.processNode(nextNode, event, robots, actions, visited);
          }
        }
      } else {
        this.processNode(targetNode, event, robots, actions, visited);
      }
    }
  }

  private processNode(
    node: WorkflowNode,
    event: SimulationEvent,
    robots: Robot[],
    actions: WorkflowAction[],
    visited: Set<string>
  ): void {
    if (node.type === 'actionNode') {
      actions.push({ action: node.data.action, triggeredBy: node.id });
      // Continue following edges from this action (chaining)
      this.followEdges(node.id, event, robots, actions, visited);
    } else if (node.type === 'aiDecisionNode') {
      actions.push({ action: 'ask_gemini', triggeredBy: node.id });
      this.followEdges(node.id, event, robots, actions, visited);
    } else if (node.type === 'conditionNode') {
      // Condition node reached directly - evaluate and branch
      const result = this.evaluateCondition(node.data.condition, event, robots);
      const handle = result ? 'yes' : 'no';
      const conditionEdges = this.edges.filter(
        (e) => e.source === node.id && (e.sourceHandle === handle || (!e.sourceHandle && result))
      );
      for (const ce of conditionEdges) {
        const nextNode = this.nodes.find((n) => n.id === ce.target);
        if (nextNode) {
          this.processNode(nextNode, event, robots, actions, visited);
        }
      }
    }
  }

  private evaluateCondition(condition: string, event: SimulationEvent, robots: Robot[]): boolean {
    switch (condition) {
      case 'priority > 3':
      case 'priority_gt_3':
        return event.priority > 3;

      case 'battery_above_20': {
        const idleRobots = robots.filter((r) => r.state === 'IDLE');
        return idleRobots.some((r) => r.battery > 20);
      }

      case 'has_idle_robot':
      case 'zone_has_idle':
        return robots.some((r) => r.state === 'IDLE');

      default:
        return true;
    }
  }

  /**
   * Execute a list of workflow actions against the robot fleet.
   * Returns descriptions of what was done.
   */
  executeActions(
    actions: WorkflowAction[],
    event: SimulationEvent,
    robots: Robot[]
  ): string[] {
    const results: string[] = [];

    for (const wa of actions) {
      switch (wa.action) {
        case 'dispatch_nearest': {
          const nearest = this.findNearestIdle(robots, event.location);
          if (nearest) {
            nearest.navigateTo(event.location);
            results.push(`Workflow: ${nearest.id} dispatched to (${event.location.x}, ${event.location.y})`);
          }
          break;
        }

        case 'recharge_all': {
          for (const robot of robots) {
            if (robot.state !== 'CHARGING' && robot.data.currentTask?.type !== 'RECHARGE') {
              robot.forceRecharge();
              results.push(`Workflow: ${robot.id} sent to charging station`);
            }
          }
          break;
        }

        case 'recharge': {
          // Send nearest idle robot to charge
          const idle = this.findNearestIdle(robots, CHARGE_ZONE);
          if (idle) {
            idle.forceRecharge();
            results.push(`Workflow: ${idle.id} dispatched to charging zone`);
          }
          break;
        }

        case 'pause_all':
        case 'pause_zone': {
          for (const robot of robots) {
            if (robot.state === 'MOVING' || robot.state === 'WORKING') {
              robot.pause();
              results.push(`Workflow: ${robot.id} paused`);
            }
          }
          break;
        }

        case 'resume_all': {
          for (const robot of robots) {
            if (robot.state === 'PAUSED') {
              robot.resume();
              results.push(`Workflow: ${robot.id} resumed`);
            }
          }
          break;
        }

        case 'queue_task': {
          results.push(`Workflow: Task queued for event at (${event.location.x}, ${event.location.y})`);
          break;
        }

        case 'execute_ai':
        case 'ask_gemini': {
          results.push('Workflow: Gemini AI analysis requested');
          break;
        }

        case 'log_alert': {
          results.push(`Workflow: Alert logged — ${event.type} at (${event.location.x}, ${event.location.y})`);
          break;
        }

        default:
          results.push(`Workflow: Unknown action "${wa.action}"`);
      }
    }

    return results;
  }

  private findNearestIdle(robots: Robot[], target: Position): Robot | null {
    const idle = robots
      .filter((r) => r.state === 'IDLE' && r.battery > 15 && r.queueLength < 3)
      .sort((a, b) => {
        const dA = Math.abs(a.position.x - target.x) + Math.abs(a.position.y - target.y);
        const dB = Math.abs(b.position.x - target.x) + Math.abs(b.position.y - target.y);
        return dA - dB;
      });
    return idle[0] || null;
  }

  getNodeCount(): number {
    return this.nodes.length;
  }

  getEdgeCount(): number {
    return this.edges.length;
  }
}
