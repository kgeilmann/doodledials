---
id: TASK-020
title: Add path label offset fields to Layer interface
status: To Do
assignee: []
created_date: '2026-04-12 01:12'
labels: []
dependencies: []
priority: high
ordinal: 1000
---

## Description

Add `labelOffsetX?: number` and `labelOffsetY?: number` optional fields to the Layer interface in `src/lib/types/doodledial.ts`

## Implementation Plan

### 1. Locate and Modify the Interface

- File: `src/lib/types/doodledial.ts`
- Current interface (lines 1-7):
  ```typescript
  export interface Layer {
  	id: string;
  	name: string;
  	index: number;
  	visible: boolean;
  	rotation: number;
  }
  ```
- Add two new optional properties after `rotation`:
  ```typescript
  export interface Layer {
  	id: string;
  	name: string;
  	index: number;
  	visible: boolean;
  	rotation: number;
  	labelOffsetX?: number;
  	labelOffsetY?: number;
  }
  ```

### 2. Type Justification

- Both fields are optional (`?`) so existing code works without changes
- Values represent pixel offsets from default label position
- Positive values move label right/down, negative move left/up

### 3. Verification

- Run `pnpm check` to verify TypeScript compiles
- Ensure no breaking changes to existing Layer usage
