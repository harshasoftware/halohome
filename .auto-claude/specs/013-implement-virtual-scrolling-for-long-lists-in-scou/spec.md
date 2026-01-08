# Implement virtual scrolling for long lists in Scout and Cities panels

## Overview

The ScoutPanel displays lists of cities grouped by country, and CityInfoPanel can show many nearby places/attractions. Large lists force the browser to render all DOM nodes even when only a fraction are visible.

## Rationale

When a user clicks 'Find Cities' in Scout mode, potentially dozens of cities are rendered. Each city card has multiple elements (icon, text, badges). Without virtualization, scrolling through 50+ cities creates layout thrashing and jank.

---
*This spec was created from ideation and is pending detailed specification.*
