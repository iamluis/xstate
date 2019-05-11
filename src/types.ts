import { StateNode } from './StateNode';
import { State } from './State';
import { StateTree } from './StateTree';
import { Interpreter, Clock } from './interpreter';
import { Actor } from './Actor';

export type EventType = string;
export type ActionType = string;
export type MetaObject = Record<string, any>;

/**
 * The full definition of an event, with a string `type`.
 */
export interface EventObject {
  /**
   * The type of event that is sent.
   */
  type: string;
  /**
   * The unique ID that identifies this specific event instance.
   */
  id?: string | number;
  [other: string]: any;
}

/**
 * The full definition of an action, with a string `type` and an
 * `exec` implementation function.
 */
export interface ActionObject<TContext, TEvent extends EventObject> {
  /**
   * The type of action that is executed.
   */
  type: string;
  /**
   * The implementation for executing the action.
   */
  exec?: ActionFunction<TContext, TEvent>;
  [other: string]: any;
}

export type DefaultContext = Record<string, any> | undefined;

/**
 * The specified string event types or the specified event objects.
 */
export type Event<TEvent extends EventObject> = TEvent['type'] | TEvent;

/**
 * Represents the specified event types or the full event objects,
 * as well as the built in event types and/or objects.
 */
export type OmniEvent<TEvent extends EventObject> =
  | TEvent['type']
  | BuiltInEvent<TEvent>['type']
  | OmniEventObject<TEvent>;

export interface ActionMeta<TContext, TEvent extends EventObject>
  extends StateMeta<TContext, TEvent> {
  action: ActionObject<TContext, TEvent>;
}

export interface ActionFunction<TContext, TEvent extends EventObject> {
  (context: TContext, event: TEvent, meta: ActionMeta<TContext, TEvent>):
    | any
    | void;
  name: string;
}
// export type InternalAction<TContext> = SendAction | AssignAction<TContext>;
export type Action<TContext, TEvent extends EventObject> =
  | ActionType
  | ActionObject<TContext, TEvent>
  | ActionFunction<TContext, TEvent>;
export type StateKey = string | State<any>;

export interface StateValueMap {
  [key: string]: StateValue;
}

/**
 * The string or object representing the state value relative to the parent state node.
 *
 * - For a child atomic state node, this is a string, e.g., `"pending"`.
 * - For complex state nodes, this is an object, e.g., `{ success: "someChildState" }`.
 */
export type StateValue = string | StateValueMap;

export interface HistoryValue {
  states: Record<string, HistoryValue | undefined>;
  current: StateValue | undefined;
}

export type ConditionPredicate<TContext, TEvent extends EventObject> = (
  context: TContext,
  event: TEvent,
  meta: GuardMeta<TContext, TEvent>
) => boolean;

export interface GuardPredicate<TContext, TEvent extends EventObject> {
  type: 'xstate.cond';
  predicate: ConditionPredicate<TContext, OmniEventObject<TEvent>>;
}

export type Guard<TContext, TEvent extends EventObject> =
  | GuardPredicate<TContext, TEvent>
  | Record<string, any> & {
      type: string;
    };

export interface GuardMeta<TContext, TEvent extends EventObject>
  extends StateMeta<TContext, TEvent> {
  cond: Guard<TContext, TEvent>;
}

export type Condition<TContext, TEvent extends EventObject> =
  | string
  | ConditionPredicate<TContext, TEvent>
  | Guard<TContext, TEvent>;

export interface TransitionConfig<TContext, TEvent extends EventObject> {
  cond?: Condition<TContext, TEvent>;
  actions?: SingleOrArray<Action<TContext, TEvent>>;
  in?: StateValue;
  internal?: boolean;
  target?: string | string[];
  meta?: Record<string, any>;
}

export interface TargetTransitionConfig<TContext, TEvent extends EventObject>
  extends TransitionConfig<TContext, TEvent> {
  target: string | string[] | undefined;
}

export type ConditionalTransitionConfig<
  TContext,
  TEvent extends EventObject = EventObject
> = Array<TransitionConfig<TContext, TEvent>>;

export type Transition<TContext, TEvent extends EventObject = EventObject> =
  | string
  | TransitionConfig<TContext, TEvent>
  | ConditionalTransitionConfig<TContext, TEvent>;

export type DisposeActivityFunction = () => void;

export type ActivityConfig<TContext, TEvent extends EventObject> = (
  ctx: TContext,
  activity: ActivityDefinition<TContext, TEvent>
) => DisposeActivityFunction | void;

export type Activity<TContext, TEvent extends EventObject> =
  | string
  | ActivityDefinition<TContext, TEvent>;

export interface ActivityDefinition<TContext, TEvent extends EventObject>
  extends ActionObject<TContext, TEvent> {
  id: string;
  type: string;
}

export type Sender<TEvent extends EventObject> = (event: Event<TEvent>) => void;
export type Receiver<TEvent extends EventObject> = (
  listener: (event: TEvent) => void
) => void;

export type InvokeCallback = ((
  sender: Sender<any>,
  onEvent: Receiver<EventObject>
) => any);

/**
 * Returns either a Promises or a callback handler (for streams of events) given the
 * machine's current `context` and `event` that invoked the service.
 *
 * For Promises, the only events emitted to the parent will be:
 * - `done.invoke.<id>` with the `data` containing the resolved payload when the promise resolves, or:
 * - `error.execution` with the `data` containing the caught error, and `src` containing the service `id`.
 *
 * For callback handlers, the `sender` will be provided, which will send events to the parent service.
 *
 * @param context The current machine `context`
 * @param event The event that invoked the service
 */
export type InvokeCreator<TFinalContext, TContext> = (
  context: TContext,
  event: EventObject
) =>
  | PromiseLike<TFinalContext>
  | StateMachine<TFinalContext, any, any>
  | Subscribable<any>
  | InvokeCallback;

export interface InvokeDefinition<TContext, TEvent extends EventObject>
  extends ActivityDefinition<TContext, TEvent> {
  /**
   * The source of the machine to be invoked, or the machine itself.
   */
  src: string;
  /**
   * If `true`, events sent to the parent service will be forwarded to the invoked service.
   *
   * Default: `false`
   */
  forward?: boolean;
  /**
   * Data from the parent machine's context to set as the (partial or full) context
   * for the invoked child machine.
   *
   * Data should be mapped to match the child machine's context shape.
   */
  data?: Mapper<TContext, TEvent> | PropertyMapper<TContext, TEvent>;
}

export interface Delay {
  id: string;
  /**
   * The time to delay the event, in milliseconds.
   */
  delay: number;
}

export type DelayedTransitions<TContext, TEvent extends EventObject> =
  | Record<
      string | number,
      string | SingleOrArray<TransitionConfig<TContext, TEvent>>
    >
  | Array<
      TransitionConfig<TContext, TEvent> & {
        delay: number | string | Expr<TContext, TEvent, number>;
      }
    >;

export type StateTypes =
  | 'atomic'
  | 'compound'
  | 'parallel'
  | 'final'
  | 'history'
  | string; // TODO: remove once TS fixes this type-widening issue

export type SingleOrArray<T> = T[] | T;

export type StateNodesConfig<
  TContext,
  TStateSchema extends StateSchema,
  TEvent extends EventObject
> = {
  [K in keyof TStateSchema['states']]: StateNode<
    TContext,
    TStateSchema['states'][K],
    TEvent
  >
};

export type StatesConfig<
  TContext,
  TStateSchema extends StateSchema,
  TEvent extends EventObject
> = {
  [K in keyof TStateSchema['states']]: StateNodeConfig<
    TContext,
    TStateSchema['states'][K],
    TEvent
  >
};

export type StatesDefinition<
  TContext,
  TStateSchema extends StateSchema,
  TEvent extends EventObject
> = {
  [K in keyof TStateSchema['states']]: StateNodeDefinition<
    TContext,
    TStateSchema['states'][K],
    TEvent
  >
};

export type TransitionsConfig<TContext, TEvent extends EventObject> = {
  [K in TEvent['type'] | BuiltInEvent<TEvent>['type']]?:
    | string
    | number
    | StateNode<TContext>
    | SingleOrArray<TransitionConfig<TContext, Extract<TEvent, { type: K }>>>
};

export type TransitionsDefinition<TContext, TEvent extends EventObject> = {
  [K in TEvent['type']]: Array<
    TransitionDefinition<TContext, Extract<TEvent, { type: K }>>
  >
};

export type InvokeConfig<TContext, TEvent extends EventObject> =
  | {
      /**
       * The unique identifier for the invoked machine. If not specified, this
       * will be the machine's own `id`, or the URL (from `src`).
       */
      id?: string;
      /**
       * The source of the machine to be invoked, or the machine itself.
       */
      src: string | StateMachine<any, any, any> | InvokeCreator<any, TContext>;
      /**
       * If `true`, events sent to the parent service will be forwarded to the invoked service.
       *
       * Default: `false`
       */
      forward?: boolean;
      /**
       * Data from the parent machine's context to set as the (partial or full) context
       * for the invoked child machine.
       *
       * Data should be mapped to match the child machine's context shape.
       */
      data?: Mapper<TContext, TEvent> | PropertyMapper<TContext, TEvent>;
      /**
       * The transition to take upon the invoked child machine reaching its final top-level state.
       */
      onDone?:
        | string
        | SingleOrArray<TransitionConfig<TContext, DoneInvokeEvent<any>>>;
      /**
       * The transition to take upon the invoked child machine sending an error event.
       */
      onError?:
        | string
        | SingleOrArray<TransitionConfig<TContext, DoneInvokeEvent<any>>>;
    }
  | StateMachine<any, any, any>;

export type InvokesConfig<TContext, TEvent extends EventObject> = SingleOrArray<
  InvokeConfig<TContext, TEvent>
>;

export interface StateNodeConfig<
  TContext,
  TStateSchema extends StateSchema,
  TEvent extends EventObject
> {
  /**
   * The relative key of the state node, which represents its location in the overall state value.
   * This is automatically determined by the configuration shape via the key where it was defined.
   */
  key?: string;
  /**
   * The initial state node key.
   */
  initial?: keyof TStateSchema['states'] | undefined;
  /**
   * @deprecated
   */
  parallel?: boolean | undefined;
  /**
   * The type of this state node:
   *
   *  - `'atomic'` - no child state nodes
   *  - `'compound'` - nested child state nodes (XOR)
   *  - `'parallel'` - orthogonal nested child state nodes (AND)
   *  - `'history'` - history state node
   *  - `'final'` - final state node
   */
  type?: StateTypes;
  /**
   * The initial context (extended state) of the machine.
   */
  context?: TContext;
  /**
   * Indicates whether the state node is a history state node, and what
   * type of history:
   * shallow, deep, true (shallow), false (none), undefined (none)
   */
  history?: 'shallow' | 'deep' | boolean | undefined;
  /**
   * The mapping of state node keys to their state node configurations (recursive).
   */
  states?: StatesConfig<TContext, TStateSchema, TEvent> | undefined;
  /**
   * The services to invoke upon entering this state node. These services will be stopped upon exiting this state node.
   */
  invoke?: InvokesConfig<TContext, TEvent>;
  /**
   * The mapping of event types to their potential transition(s).
   */
  on?: TransitionsConfig<TContext, TEvent>;
  /**
   * The action(s) to be executed upon entering the state node.
   *
   * @deprecated Use `entry` instead.
   */
  onEntry?: SingleOrArray<Action<TContext, TEvent>>; // TODO: deprecate
  /**
   * The action(s) to be executed upon entering the state node.
   */
  entry?: SingleOrArray<Action<TContext, TEvent>>;
  /**
   * The action(s) to be executed upon exiting the state node.
   *
   * @deprecated Use `exit` instead.
   */
  onExit?: SingleOrArray<Action<TContext, TEvent>>; // TODO: deprecate
  /**
   * The action(s) to be executed upon exiting the state node.
   */
  exit?: SingleOrArray<Action<TContext, TEvent>>;
  /**
   * The potential transition(s) to be taken upon reaching a final child state node.
   *
   * This is equivalent to defining a `[done(id)]` transition on this state node's `on` property.
   */
  onDone?: string | SingleOrArray<TransitionConfig<TContext, DoneEventObject>>;
  /**
   * Updates from spawned Actors, e.g., from state transitions for spawned machines.
   *
   * Update events will have two properties:
   * - `id` - the ID of the spawned Actor
   * - `state` - the state of the spawned Actor after the transition
   *
   * This is equivalent to defining a `[actionTypes.update]` transition on this state node's `on` property.
   */
  onUpdate?: string | SingleOrArray<TransitionConfig<TContext, UpdateObject>>;
  /**
   * The mapping (or array) of delays (in milliseconds) to their potential transition(s).
   * The delayed transitions are taken after the specified delay in an interpreter.
   */
  after?: DelayedTransitions<TContext, TEvent>;
  /**
   * The activities to be started upon entering the state node,
   * and stopped upon exiting the state node.
   */
  activities?: SingleOrArray<Activity<TContext, TEvent>>;
  /**
   * @private
   */
  parent?: StateNode<TContext>;
  strict?: boolean | undefined;
  /**
   * The meta data associated with this state node, which will be returned in State instances.
   */
  meta?: TStateSchema extends { meta: infer D } ? D : any;
  /**
   * The data sent with the "done.state._id_" event if this is a final state node.
   *
   * The data will be evaluated with the current `context` and placed on the `.data` property
   * of the event.
   */
  data?: Mapper<TContext, TEvent> | PropertyMapper<TContext, TEvent>;
  /**
   * The unique ID of the state node, which can be referenced as a transition target via the
   * `#id` syntax.
   */
  id?: string | undefined;
  /**
   * The string delimiter for serializing the path to a string. The default is "."
   */
  delimiter?: string;
  /**
   * The order this state node appears. Corresponds to the implicit SCXML document order.
   */
  order?: number;
}

export interface StateNodeDefinition<
  TContext,
  TStateSchema extends StateSchema,
  TEvent extends EventObject
> extends StateNodeConfig<TContext, TStateSchema, TEvent> {
  id: string;
  version: string | undefined;
  key: string;
  type: StateTypes;
  initial: StateNodeConfig<TContext, TStateSchema, TEvent>['initial'];
  history: boolean | 'shallow' | 'deep' | undefined;
  states: StatesDefinition<TContext, TStateSchema, TEvent>;
  on: TransitionsDefinition<TContext, TEvent>;
  onEntry: Array<ActionObject<TContext, TEvent>>;
  onExit: Array<ActionObject<TContext, TEvent>>;
  activities: Array<ActivityDefinition<TContext, TEvent>>;
  meta: any;
  order: number;
  data?: FinalStateNodeConfig<TContext, TEvent>['data'];
}

export type AnyStateNodeDefinition = StateNodeDefinition<any, any, any>;
export interface AtomicStateNodeConfig<TContext, TEvent extends EventObject>
  extends StateNodeConfig<TContext, StateSchema, TEvent> {
  initial?: undefined;
  parallel?: false | undefined;
  states?: undefined;
  onDone?: undefined;
}

export interface HistoryStateNodeConfig<TContext, TEvent extends EventObject>
  extends AtomicStateNodeConfig<TContext, TEvent> {
  history: 'shallow' | 'deep' | true;
  target: StateValue | undefined;
}

export interface FinalStateNodeConfig<TContext, TEvent extends EventObject>
  extends AtomicStateNodeConfig<TContext, TEvent> {
  type: 'final';
  /**
   * The data to be sent with the "done.state.<id>" event. The data can be
   * static or dynamic (based on assigners).
   */
  data?: Assigner<TContext, TEvent> | PropertyAssigner<TContext, TEvent> | any;
}

export interface CompoundStateNodeConfig<
  TContext,
  TStateSchema extends StateSchema,
  TEvent extends EventObject
> extends StateNodeConfig<TContext, TStateSchema, TEvent> {
  parallel?: boolean;
  states: StateNodeConfig<TContext, TStateSchema, TEvent>['states'];
}

export type SimpleOrCompoundStateNodeConfig<
  TContext,
  TStateSchema extends StateSchema,
  TEvent extends EventObject
> =
  | AtomicStateNodeConfig<TContext, TEvent>
  | CompoundStateNodeConfig<TContext, TStateSchema, TEvent>;

export type ActionFunctionMap<TContext, TEvent extends EventObject> = Record<
  string,
  ActionObject<TContext, TEvent> | ActionFunction<TContext, TEvent>
>;

export type ServiceConfig<TContext> =
  | string
  | StateMachine<any, any, any>
  | InvokeCreator<any, TContext>;

export type DelayConfig<TContext, TEvent extends EventObject> =
  | number
  | Expr<TContext, OmniEventObject<TEvent>, number>;

export interface MachineOptions<TContext, TEvent extends EventObject> {
  guards: Record<string, ConditionPredicate<TContext, TEvent>>;
  actions: ActionFunctionMap<TContext, TEvent>;
  activities: Record<string, ActivityConfig<TContext, TEvent>>;
  services: Record<string, ServiceConfig<TContext>>;
  delays: Record<string, DelayConfig<TContext, TEvent>>;
  updater: Updater<TContext, TEvent>;
}
export interface MachineConfig<
  TContext,
  TStateSchema extends StateSchema,
  TEvent extends EventObject
> extends CompoundStateNodeConfig<TContext, TStateSchema, TEvent> {
  /**
   * The initial context (extended state)
   */
  context?: TContext;
  /**
   * The machine's own version.
   */
  version?: string;
}

export interface StandardMachineConfig<
  TContext,
  TStateSchema extends StateSchema,
  TEvent extends EventObject
> extends CompoundStateNodeConfig<TContext, TStateSchema, TEvent> {}

export interface ParallelMachineConfig<
  TContext,
  TStateSchema extends StateSchema,
  TEvent extends EventObject
> extends CompoundStateNodeConfig<TContext, TStateSchema, TEvent> {
  initial?: undefined;
  type?: 'parallel';
}

export interface EntryExitEffectMap<TContext, TEvent extends EventObject> {
  entry: Array<ActionObject<TContext, TEvent>>;
  exit: Array<ActionObject<TContext, TEvent>>;
}

export interface HistoryStateNode<TContext> extends StateNode<TContext> {
  history: 'shallow' | 'deep';
  target: StateValue | undefined;
}

export interface StateMachine<
  TContext,
  TStateSchema extends StateSchema,
  TEvent extends EventObject
> extends StateNode<TContext, TStateSchema, TEvent> {
  id: string;
  states: StateNode<TContext, TStateSchema, TEvent>['states'];
}

export interface ActionMap<TContext, TEvent extends EventObject> {
  onEntry: Array<Action<TContext, TEvent>>;
  actions: Array<Action<TContext, TEvent>>;
  onExit: Array<Action<TContext, TEvent>>;
}

export interface EntryExitStates<TContext> {
  entry: Set<StateNode<TContext>>;
  exit: Set<StateNode<TContext>>;
}

export interface EntryExitStateArrays<TContext> {
  entry: Array<StateNode<TContext>>;
  exit: Array<StateNode<TContext>>;
}

export interface ActivityMap {
  [activityKey: string]: ActivityDefinition<any, any> | false;
}

// tslint:disable-next-line:class-name
export interface StateTransition<TContext, TEvent extends EventObject> {
  tree: StateTree | undefined;
  /**
   * The source state that preceded the transition.
   */
  source: State<TContext> | undefined;
  actions: Array<ActionObject<TContext, TEvent>>;
}

export interface TransitionData<TContext, TEvent extends EventObject> {
  value: StateValue | undefined;
  actions: ActionMap<TContext, TEvent>;
  activities?: ActivityMap;
}

export enum ActionTypes {
  Start = 'xstate.start',
  Stop = 'xstate.stop',
  Raise = 'xstate.raise',
  Send = 'xstate.send',
  Cancel = 'xstate.cancel',
  NullEvent = '',
  Assign = 'xstate.assign',
  After = 'xstate.after',
  DoneState = 'done.state',
  DoneInvoke = 'done.invoke',
  Log = 'xstate.log',
  Init = 'xstate.init',
  Invoke = 'xstate.invoke',
  ErrorExecution = 'error.execution',
  ErrorCommunication = 'error.communication',
  Update = 'xstate.update',
  Pure = 'xstate.pure'
}

export interface RaisedEvent<TEvent extends EventObject> {
  type: ActionTypes.Raise;
  event: TEvent;
}
export interface RaiseEvent<TContext, TEvent extends EventObject>
  extends ActionObject<TContext, TEvent> {
  event: Event<TEvent>;
}

export interface DoneInvokeEvent<TData> extends EventObject {
  data: TData;
}

export interface ErrorExecutionEvent extends EventObject {
  src: string;
  type: ActionTypes.ErrorExecution;
  data: any;
}

export interface DoneEventObject extends EventObject {
  data?: any;
  toString(): string;
}

export interface UpdateObject extends EventObject {
  id: string | number;
  state: State<any, any>;
}

export type DoneEvent = DoneEventObject & string;

export type BuiltInEvent<TEvent extends EventObject> =
  | { type: ActionTypes.NullEvent }
  | { type: ActionTypes.Init }
  | RaisedEvent<TEvent>
  | ErrorExecutionEvent
  | DoneEventObject;

/**
 * Represents the specified events and the built-in internal events.
 */
export type OmniEventObject<TEvent extends EventObject> =
  | TEvent
  | BuiltInEvent<TEvent>;

export interface ActivityActionObject<TContext, TEvent extends EventObject>
  extends ActionObject<TContext, TEvent> {
  type: ActionTypes.Start | ActionTypes.Stop;
  activity: ActivityDefinition<TContext, TEvent>;
  exec: ActionFunction<TContext, TEvent> | undefined;
}

export interface SendAction<TContext, TEvent extends EventObject>
  extends ActionObject<TContext, TEvent> {
  to:
    | string
    | number
    | Actor
    | Expr<TContext, TEvent, string | number | Actor>
    | undefined;
  event: TEvent | SendExpr<TContext, TEvent>; // TODO: use Expr type
  delay?: number | string | Expr<TContext, TEvent, number>;
  id: string | number;
}

export interface SendActionObject<TContext, TEvent extends EventObject>
  extends SendAction<TContext, TEvent> {
  to: string | number | Actor | undefined;
  event: TEvent;
  delay?: number | string;
  id: string | number;
}

export type Expr<TContext, TEvent extends EventObject, T> = (
  context: TContext,
  event: TEvent
) => T;

export type SendExpr<TContext, TEvent extends EventObject> = (
  context: TContext,
  event: TEvent
) => OmniEvent<TEvent>;

export enum SpecialTargets {
  Parent = '#_parent',
  Internal = '#_internal'
}

export interface SendActionOptions<TContext, TEvent extends EventObject> {
  id?: string | number;
  delay?: number | string | Expr<TContext, TEvent, number>;
  to?: string | Expr<TContext, TEvent, string | number | Actor>;
}

export interface CancelAction extends ActionObject<any, any> {
  sendId: string | number;
}

export type Assigner<TContext, TEvent extends EventObject> = (
  context: TContext,
  event: TEvent
) => Partial<TContext>;

export type PropertyAssigner<TContext, TEvent extends EventObject> = Partial<
  {
    [K in keyof TContext]:
      | ((context: TContext, event: TEvent) => TContext[K])
      | TContext[K]
  }
>;

export type Mapper<TContext, TEvent extends EventObject> = (
  context: TContext,
  event: TEvent
) => any;

export type PropertyMapper<TContext, TEvent extends EventObject> = Partial<{
  [key: string]: ((context: TContext, event: TEvent) => any) | any;
}>;

export type Updater<
  TContext,
  TEvent extends EventObject,
  TAssignAction extends AnyAssignAction<TContext, TEvent> = AnyAssignAction<
    TContext,
    TEvent
  >
> = (
  context: TContext,
  event: OmniEventObject<TEvent>,
  assignActions: TAssignAction[]
) => TContext;

export interface AnyAssignAction<TContext, TEvent extends EventObject>
  extends ActionObject<TContext, TEvent> {
  type: ActionTypes.Assign;
  assignment: any;
}

export interface AssignAction<TContext, TEvent extends EventObject>
  extends ActionObject<TContext, TEvent> {
  type: ActionTypes.Assign;
  assignment: Assigner<TContext, TEvent> | PropertyAssigner<TContext, TEvent>;
}

export interface PureAction<TContext, TEvent extends EventObject>
  extends ActionObject<TContext, TEvent> {
  type: ActionTypes.Pure;
  get: (
    context: TContext,
    event: OmniEventObject<TEvent>
  ) => SingleOrArray<ActionObject<TContext, TEvent>> | undefined;
}

export interface TransitionDefinition<TContext, TEvent extends EventObject>
  extends TransitionConfig<TContext, TEvent> {
  target: string[] | undefined;
  actions: Array<ActionObject<TContext, TEvent>>;
  cond?: Guard<TContext, TEvent>;
  event: string;
}

export interface DelayedTransitionDefinition<
  TContext,
  TEvent extends EventObject
> extends TransitionDefinition<TContext, TEvent> {
  delay: number | string | Expr<TContext, TEvent, number>;
}

export interface Edge<
  TContext,
  TEvent extends EventObject,
  TEventType extends TEvent['type'] = string
> {
  event: TEventType;
  source: StateNode<TContext>;
  target: StateNode<TContext>;
  cond?: Condition<TContext, TEvent & { type: TEventType }>;
  actions: Array<Action<TContext, TEvent>>;
  meta?: MetaObject;
  transition: TransitionDefinition<TContext, TEvent>;
}
export interface NodesAndEdges<TContext, TEvent extends EventObject> {
  nodes: StateNode[];
  edges: Array<Edge<TContext, TEvent, TEvent['type']>>;
}

export interface Segment<TContext, TEvent extends EventObject> {
  /**
   * From state.
   */
  state: State<TContext, TEvent>;
  /**
   * Event from state.
   */
  event: TEvent;
}

export interface PathItem<TContext, TEvent extends EventObject> {
  state: State<TContext, TEvent>;
  path: Array<Segment<TContext, TEvent>>;
  weight?: number;
}

export interface PathMap<TContext, TEvent extends EventObject> {
  [key: string]: PathItem<TContext, TEvent>;
}

export interface PathsItem<TContext, TEvent extends EventObject> {
  state: State<TContext, TEvent>;
  paths: Array<Array<Segment<TContext, TEvent>>>;
}

export interface PathsMap<TContext, TEvent extends EventObject> {
  [key: string]: PathsItem<TContext, TEvent>;
}

export interface TransitionMap {
  state: StateValue | undefined;
}

export interface AdjacencyMap {
  [stateId: string]: Record<string, TransitionMap>;
}

export interface ValueAdjacencyMap<TContext, TEvent extends EventObject> {
  [stateId: string]: Record<string, State<TContext, TEvent>>;
}

export interface StateMeta<TContext, TEvent extends EventObject> {
  state: State<TContext, TEvent>;
  // _event: SCXML.Event;
}

export interface StateInterface<
  TContext = DefaultContext,
  TEvent extends EventObject = EventObject
> {
  value: StateValue;
  tree?: StateTree;
  history?: State<TContext>;
  historyValue?: HistoryValue | undefined;
  actions: Array<ActionObject<TContext, TEvent>>;
  activities: ActivityMap;
  meta: any;
  events: TEvent[];
  context: TContext;
  toStrings: () => string[];
}

export interface StateConfig<TContext, TEvent extends EventObject> {
  value: StateValue;
  context: TContext;
  event: OmniEventObject<TEvent>;
  historyValue?: HistoryValue | undefined;
  history?: State<TContext>;
  actions?: Array<ActionObject<TContext, TEvent>>;
  activities?: ActivityMap;
  meta?: any;
  events?: TEvent[];
  tree?: StateTree;
}

export interface StateSchema {
  meta?: any;
  states?: Record<string | number, StateSchema>;
}

export interface InterpreterOptions {
  /**
   * Whether state actions should be executed immediately upon transition. Defaults to `true`.
   */
  execute: boolean;
  clock: Clock;
  logger: (...args: any[]) => void;
  parent?: Interpreter<any, any, any>;
  /**
   * If `true`, defers processing of sent events until the service
   * is initialized (`.start()`). Otherwise, an error will be thrown
   * for events sent to an uninitialized service.
   *
   * Default: `true`
   */
  deferEvents: boolean;
  /**
   * The custom `id` for referencing this service.
   */
  id?: string;
  /**
   * If `true`, states and events will be logged to Redux DevTools.
   *
   * Default: `false`
   */
  devTools: boolean;
}

export namespace SCXML {
  // tslint:disable-next-line:no-shadowed-variable
  export interface Event {
    /**
     * This is a character string giving the name of the event.
     * The SCXML Processor must set the name field to the name of this event.
     * It is what is matched against the 'event' attribute of <transition>.
     * Note that transitions can do additional tests by using the value of this field
     * inside boolean expressions in the 'cond' attribute.
     */
    name: string;
    /**
     * This field describes the event type.
     * The SCXML Processor must set it to: "platform" (for events raised by the platform itself, such as error events),
     * "internal" (for events raised by <raise> and <send> with target '_internal')
     * or "external" (for all other events).
     */
    type: 'platform' | 'internal' | 'external';
    /**
     * If the sending entity has specified a value for this, the Processor must set this field to that value
     * (see C Event I/O Processors for details).
     * Otherwise, in the case of error events triggered by a failed attempt to send an event,
     * the Processor must set this field to the send id of the triggering <send> element.
     * Otherwise it must leave it blank.
     */
    sendid: string | undefined;
    /**
     * This is a URI, equivalent to the 'target' attribute on the <send> element.
     * For external events, the SCXML Processor should set this field to a value which,
     * when used as the value of 'target', will allow the receiver of the event to <send>
     * a response back to the originating entity via the Event I/O Processor specified in 'origintype'.
     * For internal and platform events, the Processor must leave this field blank.
     */
    origin: string | undefined;
    /**
     * This is equivalent to the 'type' field on the <send> element.
     * For external events, the SCXML Processor should set this field to a value which,
     * when used as the value of 'type', will allow the receiver of the event to <send>
     * a response back to the originating entity at the URI specified by 'origin'.
     * For internal and platform events, the Processor must leave this field blank.
     */
    origintype: string | undefined;
    /**
     * If this event is generated from an invoked child process, the SCXML Processor
     * must set this field to the invoke id of the invocation that triggered the child process.
     * Otherwise it must leave it blank.
     */
    invokeid: string | undefined;
    /**
     * This field contains whatever data the sending entity chose to include in this event.
     * The receiving SCXML Processor should reformat this data to match its data model,
     * but must not otherwise modify it.
     *
     * If the conversion is not possible, the Processor must leave the field blank
     * and must place an error 'error.execution' in the internal event queue.
     */
    data: Record<string, any> | undefined;
    /**
     * @private
     */
    $$type: 'scxml';
  }
}

// Taken from RxJS
export interface Unsubscribable {
  unsubscribe(): any | void;
}
export interface Subscribable<T> {
  subscribe(
    next?: (value: T) => void,
    error?: (error: any) => void,
    complete?: () => void
  ): Unsubscribable;
}
