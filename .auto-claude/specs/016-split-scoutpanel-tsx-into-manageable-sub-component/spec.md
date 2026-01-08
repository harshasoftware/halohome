# Split ScoutPanel.tsx into manageable sub-components

## Overview

ScoutPanel.tsx is 2010 lines long and contains inline data structures (COUNTRY_NAMES mapping with 100+ entries), multiple sub-components defined inline, complex filtering logic, pagination, and UI rendering. The file has grown to handle city lists, country grouping, category filtering, authentication gating, and premium features all in one place.

## Rationale

Like GlobePage.tsx, this component has grown beyond maintainable size. The inline COUNTRY_NAMES object alone is 35 lines of static data that should be extracted. Multiple concerns (data, business logic, UI) are mixed together, making the component hard to test and modify.

---
*This spec was created from ideation and is pending detailed specification.*
