# React Design Patterns - Code Guidelines

This document defines rules and conventions for applying design patterns consistently across the codebase.

---

## 1. HOC Pattern Rules

### When to Use HOCs
- **Cross-cutting concerns**: Monitoring, authentication, error handling, feature flags
- **Composition of behaviors**: Wrapping components with multiple concerns
- **Consistent interfaces**: Enforcing props/behavior across component families

### Rules

```typescript
// RULE 1: HOC naming convention - use "with" prefix
export function withMonitoring<P>(Component: ComponentType<P>) { ... }
export function withAuth<P>(Component: ComponentType<P>) { ... }

// RULE 2: Always preserve displayName
const WithAuth = (props: P) => <Component {...props} />;
WithAuth.displayName = `withAuth(${Component.displayName || Component.name})`;

// RULE 3: Forward all props to wrapped component
const WithMonitoring = (props: P) => <WrappedComponent {...props} />;

// RULE 4: Use compose() for multiple HOCs (right to left)
const EnhancedComponent = compose(
  withErrorBoundary,
  withMonitoring,
  withAuth
)(BaseComponent);

// RULE 5: Keep HOCs pure - no side effects in HOC function itself
// Side effects go in the wrapper component's useEffect
```

### Anti-Patterns
```typescript
// BAD: Creating HOC inside render (creates new component each render)
const MyComponent = () => {
  const Enhanced = withAuth(SomeComponent); // Don't do this!
  return <Enhanced />;
};

// GOOD: Create HOC outside component
const Enhanced = withAuth(SomeComponent);
const MyComponent = () => <Enhanced />;
```

---

## 2. Compound Pattern Rules

### When to Use
- **Complex UI components** with multiple related parts (Tabs, Accordion, Modal)
- **Implicit state sharing** between parent and children
- **Flexible composition** where child order/presence varies

### Rules

```typescript
// RULE 1: Use createCompoundComponent factory for consistency
export const Tabs = createCompoundComponent<TabsState>({
  name: 'Tabs',
  initialState: { activeTab: '' },
  components: { List, Trigger, Content },
});

// RULE 2: Sub-components access context via implicit injection
const TabsTrigger = ({ state, setState, ...props }) => { ... };

// RULE 3: Usage follows Parent.Child pattern
<Tabs defaultState={{ activeTab: 'first' }}>
  <Tabs.List>
    <Tabs.Trigger value="first">First</Tabs.Trigger>
    <Tabs.Trigger value="second">Second</Tabs.Trigger>
  </Tabs.List>
  <Tabs.Content value="first">First content</Tabs.Content>
  <Tabs.Content value="second">Second content</Tabs.Content>
</Tabs>

// RULE 4: Expose useContext hook for custom child components
const { state, setState } = Tabs.useContext();

// RULE 5: Context errors should be descriptive
throw new Error('Tabs.Trigger must be used within a Tabs provider');
```

---

## 3. Container/Presentational Rules

### When to Use
- **Separating concerns**: Data fetching from rendering
- **Reusability**: Same presentational component with different data sources
- **Testing**: Pure presentational components are easier to test

### Rules

```typescript
// RULE 1: Presentational components are pure - props in, JSX out
interface UserCardProps {
  name: string;
  avatar: string;
  isOnline: boolean;
}
const UserCard = ({ name, avatar, isOnline }: UserCardProps) => (
  <div>...</div>
);

// RULE 2: Containers handle all data/state logic
const UserCardContainer = ({ userId }: { userId: string }) => {
  const { data, isLoading, error } = useUserQuery(userId);
  return <UserCard name={data?.name} avatar={data?.avatar} ... />;
};

// RULE 3: Use createContainer for consistency
const UserListContainer = createContainer(UserList, {
  name: 'UserList',
  fetchData: async (props) => fetchUsers(props.filter),
  dependencies: (props) => [props.filter],
});

// RULE 4: ContainerProps interface for data injection
interface ContainerProps<T> {
  data: T | null;
  isLoading: boolean;
  error: Error | null;
  refetch: () => void;
}

// RULE 5: Naming convention - append "Container" suffix
UserCard        // Presentational
UserCardContainer  // Container
```

---

## 4. Render Props Rules

### When to Use
- **Flexible rendering logic**: Consumer decides how to render
- **State/behavior sharing**: Without prop drilling
- **Avoiding HOC wrapper chains**: Single component encapsulates logic

### Rules

```typescript
// RULE 1: children as function OR explicit render prop
// Option A: Children function
<DataFetcher url="/api/users">
  {({ data, isLoading }) => isLoading ? <Spinner /> : <List data={data} />}
</DataFetcher>

// Option B: Render prop
<DataFetcher url="/api/users" render={({ data }) => <List data={data} />} />

// RULE 2: Expose all relevant state in render prop object
children: (state: {
  data: T | null;
  isLoading: boolean;
  error: Error | null;
  refetch: () => void;
}) => ReactNode;

// RULE 3: Include action callbacks for user interaction
<Toggle>
  {({ isOn, toggle, setOn, setOff }) => (
    <Switch checked={isOn} onChange={toggle} />
  )}
</Toggle>

// RULE 4: Memoize render prop callbacks when possible
const handleChange = useCallback(() => { ... }, [deps]);

// RULE 5: Consider performance - render props re-run on every render
// Use memo() on inner content if expensive
<MouseTracker>
  {(position) => <MemoizedMap position={position} />}
</MouseTracker>
```

---

## 5. Progressive Loading Rules

### When to Use
- **Performance optimization**: Load critical content first
- **Large lists**: Virtualization for 100+ items
- **Heavy components**: Defer non-critical UI
- **Above/below fold**: Load visible content first

### Rules

```typescript
// RULE 1: Assign priority based on visibility importance
<ProgressiveLoader priority="critical">  {/* Hero, navigation */}
<ProgressiveLoader priority="high">      {/* Main content */}
<ProgressiveLoader priority="medium">    {/* Secondary content */}
<ProgressiveLoader priority="low">       {/* Footer, sidebars */}
<ProgressiveLoader priority="idle">      {/* Analytics, prefetch */}

// RULE 2: Use SelectiveHydration for below-fold content
<SelectiveHydration when="visible" rootMargin="100px">
  <HeavyChartComponent />
</SelectiveHydration>

// RULE 3: Hydration strategies by content type
when="visible"     // Charts, images below fold
when="idle"        // Analytics, non-interactive
when="interaction" // Forms, interactive widgets
when="immediate"   // Critical above-fold

// RULE 4: Virtualize lists with 50+ items
<VirtualizedList
  items={users}
  itemHeight={60}
  containerHeight={400}
  renderItem={(user) => <UserRow user={user} />}
/>

// RULE 5: Use ChunkedRender for expensive list renders
<ChunkedRender
  items={data}
  chunkSize={20}
  renderItem={(item) => <ExpensiveCard item={item} />}
/>

// RULE 6: Preload components likely to be used
const Modal = createLazyComponent(() => import('./Modal'), { preload: true });
```

---

## 6. General Pattern Rules

### Composition Order
```typescript
// When combining patterns, follow this order:
// 1. Error boundaries (outermost)
// 2. Authentication
// 3. Data loading
// 4. Performance monitoring
// 5. Memoization (innermost)

const EnhancedComponent = compose(
  withErrorBoundary({ fallback: <ErrorUI /> }),
  withAuth({ redirectTo: '/login' }),
  withMonitoring({ name: 'Dashboard' }),
  withMemo(['userId'])
)(DashboardComponent);
```

### File Organization
```
/src/lib/patterns/
├── index.ts           # Public exports
├── hoc.tsx            # HOC patterns
├── compound.tsx       # Compound components
├── container.tsx      # Container pattern
├── render-props.tsx   # Render prop components
├── progressive.tsx    # Loading patterns
└── GUIDELINES.md      # This file
```

### Naming Conventions
| Pattern | Prefix/Suffix | Example |
|---------|---------------|---------|
| HOC | `with*` | `withAuth`, `withMonitoring` |
| Container | `*Container` | `UserListContainer` |
| Compound | Parent.Child | `Tabs.Trigger` |
| Render Prop | Noun | `DataFetcher`, `MouseTracker` |
| Hook | `use*` | `useCompoundContext` |

### Performance Considerations
1. **Memoize**: Use `memo()` for presentational components
2. **Callbacks**: Wrap in `useCallback` when passed to children
3. **State**: Keep state as local as possible
4. **Lazy load**: Defer heavy components with `createLazyComponent`
5. **Virtualize**: Lists with 50+ items should use `VirtualizedList`

### Testing Guidelines
1. **Presentational**: Snapshot + interaction tests
2. **Containers**: Mock data layer, test loading/error states
3. **HOCs**: Test wrapped behavior, not HOC internals
4. **Compound**: Test full compound usage, not individual parts
5. **Render Props**: Test all possible render states

---

## Quick Reference

| Need | Pattern | Example |
|------|---------|---------|
| Add auth to existing component | HOC | `withAuth(Dashboard)` |
| Related UI parts sharing state | Compound | `<Tabs>` |
| Reuse UI with different data | Container | `createContainer` |
| Flexible child rendering | Render Props | `<DataFetcher>` |
| Load content progressively | Progressive | `<ProgressiveLoader>` |
| Defer expensive renders | Progressive | `<DeferredRender>` |
| Long list performance | Progressive | `<VirtualizedList>` |
