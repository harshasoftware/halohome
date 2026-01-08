/**
 * Compound Component Pattern
 *
 * Creates flexible, declarative component APIs that work together
 * while sharing implicit state through React Context.
 */

import React, {
  createContext,
  useContext,
  useState,
  useCallback,
  useMemo,
  ReactNode,
  ComponentType,
  Children,
  isValidElement,
  cloneElement,
} from 'react';

// ============================================================================
// Types
// ============================================================================

export interface CompoundComponentContext<T> {
  state: T;
  setState: React.Dispatch<React.SetStateAction<T>>;
}

interface CompoundConfig<T> {
  name: string;
  initialState: T;
  components: Record<string, ComponentType<any>>;
}

// ============================================================================
// createCompoundComponent - Factory for creating compound components
// ============================================================================

export function createCompoundComponent<T extends object>(config: CompoundConfig<T>) {
  const { name, initialState, components } = config;

  // Create context
  const CompoundContext = createContext<CompoundComponentContext<T> | null>(null);
  CompoundContext.displayName = `${name}Context`;

  // Hook to access context
  const useCompoundContext = () => {
    const context = useContext(CompoundContext);
    if (!context) {
      throw new Error(`${name} compound components must be used within a ${name} provider`);
    }
    return context;
  };

  // Root provider component
  interface RootProps {
    children: ReactNode;
    defaultState?: Partial<T>;
    onStateChange?: (state: T) => void;
  }

  const Root = ({ children, defaultState, onStateChange }: RootProps) => {
    const [state, setStateInternal] = useState<T>({
      ...initialState,
      ...defaultState,
    });

    const setState: React.Dispatch<React.SetStateAction<T>> = useCallback(
      (action) => {
        setStateInternal((prev) => {
          const next = typeof action === 'function' ? (action as (prev: T) => T)(prev) : action;
          onStateChange?.(next);
          return next;
        });
      },
      [onStateChange]
    );

    const value = useMemo(() => ({ state, setState }), [state, setState]);

    return (
      <CompoundContext.Provider value={value}>
        {children}
      </CompoundContext.Provider>
    );
  };

  Root.displayName = name;

  // Attach sub-components to Root
  const enhancedComponents: Record<string, ComponentType<any>> = {};
  for (const [key, Component] of Object.entries(components)) {
    const EnhancedComponent = (props: any) => {
      const context = useCompoundContext();
      return <Component {...props} {...context} />;
    };
    EnhancedComponent.displayName = `${name}.${key}`;
    enhancedComponents[key] = EnhancedComponent;
  }

  return Object.assign(Root, enhancedComponents, { useContext: useCompoundContext });
}

// ============================================================================
// Example: Tabs Compound Component
// ============================================================================

interface TabsState {
  activeTab: string;
}

const TabsListComponent = ({
  children,
  className = '',
}: {
  children: ReactNode;
  className?: string;
  state: TabsState;
  setState: React.Dispatch<React.SetStateAction<TabsState>>;
}) => (
  <div className={`flex gap-2 ${className}`} role="tablist">
    {children}
  </div>
);

const TabsTriggerComponent = ({
  value,
  children,
  className = '',
  state,
  setState,
}: {
  value: string;
  children: ReactNode;
  className?: string;
  state: TabsState;
  setState: React.Dispatch<React.SetStateAction<TabsState>>;
}) => {
  const isActive = state.activeTab === value;
  return (
    <button
      role="tab"
      aria-selected={isActive}
      className={`px-4 py-2 rounded-lg transition-colors ${
        isActive ? 'bg-purple-500/20 text-purple-400' : 'text-gray-400 hover:text-white'
      } ${className}`}
      onClick={() => setState({ activeTab: value })}
    >
      {children}
    </button>
  );
};

const TabsContentComponent = ({
  value,
  children,
  className = '',
  state,
}: {
  value: string;
  children: ReactNode;
  className?: string;
  state: TabsState;
  setState: React.Dispatch<React.SetStateAction<TabsState>>;
}) => {
  if (state.activeTab !== value) return null;
  return (
    <div role="tabpanel" className={className}>
      {children}
    </div>
  );
};

export const Tabs = createCompoundComponent<TabsState>({
  name: 'Tabs',
  initialState: { activeTab: '' },
  components: {
    List: TabsListComponent,
    Trigger: TabsTriggerComponent,
    Content: TabsContentComponent,
  },
});

// ============================================================================
// Example: Accordion Compound Component
// ============================================================================

interface AccordionState {
  openItems: string[];
  allowMultiple: boolean;
}

const AccordionItemComponent = ({
  value,
  children,
  className = '',
}: {
  value: string;
  children: ReactNode;
  className?: string;
  state: AccordionState;
  setState: React.Dispatch<React.SetStateAction<AccordionState>>;
}) => (
  <div className={`border-b border-white/10 ${className}`} data-value={value}>
    {Children.map(children, (child) => {
      if (isValidElement(child)) {
        return cloneElement(child, { itemValue: value } as any);
      }
      return child;
    })}
  </div>
);

const AccordionTriggerComponent = ({
  children,
  className = '',
  itemValue,
  state,
  setState,
}: {
  children: ReactNode;
  className?: string;
  itemValue?: string;
  state: AccordionState;
  setState: React.Dispatch<React.SetStateAction<AccordionState>>;
}) => {
  const isOpen = itemValue ? state.openItems.includes(itemValue) : false;

  const toggle = () => {
    if (!itemValue) return;
    setState((prev) => {
      if (prev.openItems.includes(itemValue)) {
        return { ...prev, openItems: prev.openItems.filter((i) => i !== itemValue) };
      }
      if (prev.allowMultiple) {
        return { ...prev, openItems: [...prev.openItems, itemValue] };
      }
      return { ...prev, openItems: [itemValue] };
    });
  };

  return (
    <button
      className={`w-full flex items-center justify-between py-4 text-left ${className}`}
      onClick={toggle}
      aria-expanded={isOpen}
    >
      {children}
      <span
        className={`transform transition-transform ${isOpen ? 'rotate-180' : ''}`}
      >
        ▼
      </span>
    </button>
  );
};

const AccordionContentComponent = ({
  children,
  className = '',
  itemValue,
  state,
}: {
  children: ReactNode;
  className?: string;
  itemValue?: string;
  state: AccordionState;
  setState: React.Dispatch<React.SetStateAction<AccordionState>>;
}) => {
  const isOpen = itemValue ? state.openItems.includes(itemValue) : false;
  if (!isOpen) return null;
  return <div className={`pb-4 ${className}`}>{children}</div>;
};

export const Accordion = createCompoundComponent<AccordionState>({
  name: 'Accordion',
  initialState: { openItems: [], allowMultiple: false },
  components: {
    Item: AccordionItemComponent,
    Trigger: AccordionTriggerComponent,
    Content: AccordionContentComponent,
  },
});

// ============================================================================
// Example: Modal Compound Component
// ============================================================================

interface ModalState {
  isOpen: boolean;
}

const ModalTriggerComponent = ({
  children,
  className = '',
  setState,
}: {
  children: ReactNode;
  className?: string;
  state: ModalState;
  setState: React.Dispatch<React.SetStateAction<ModalState>>;
}) => (
  <button
    className={className}
    onClick={() => setState({ isOpen: true })}
  >
    {children}
  </button>
);

const ModalContentComponent = ({
  children,
  className = '',
  state,
  setState,
}: {
  children: ReactNode;
  className?: string;
  state: ModalState;
  setState: React.Dispatch<React.SetStateAction<ModalState>>;
}) => {
  if (!state.isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={() => setState({ isOpen: false })}
      />
      <div
        className={`relative z-10 bg-gray-900 rounded-xl shadow-xl max-w-lg w-full mx-4 ${className}`}
      >
        {children}
      </div>
    </div>
  );
};

const ModalCloseComponent = ({
  children,
  className = '',
  setState,
}: {
  children?: ReactNode;
  className?: string;
  state: ModalState;
  setState: React.Dispatch<React.SetStateAction<ModalState>>;
}) => (
  <button
    className={`${className}`}
    onClick={() => setState({ isOpen: false })}
  >
    {children ?? '✕'}
  </button>
);

export const Modal = createCompoundComponent<ModalState>({
  name: 'Modal',
  initialState: { isOpen: false },
  components: {
    Trigger: ModalTriggerComponent,
    Content: ModalContentComponent,
    Close: ModalCloseComponent,
  },
});
