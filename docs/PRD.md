# Orca Controller — MVP PRD

## 1. Purpose

Create a **controller-first fork of Orca Mobile** optimized around controlling and monitoring Orca/AI coding environments remotely.

The MVP should preserve compatibility with the existing Orca ecosystem while allowing the UX to diverge substantially from the stock mobile experience.

The fork is an **experimental UX/product layer first**, with the option to extract the mature experience into a standalone application later.

## 2. Goals

* Fork and remain compatible with the upstream Orca Mobile application/protocol.
* Redesign the mobile experience around **controller workflows**, rather than reproducing a mobile IDE.
* Provide visibility and control over:

  * projects
  * sessions
  * agents
  * messages/tasks
  * terminal/activity
  * connection/pairing
* Keep the actual project files and file tree accessible where useful.
* Make UX experimentation cheap and reversible.
* Keep the core product logic independent enough to extract into a standalone application later.

## 3. Non-goals for MVP

* Rebuild Orca Desktop.
* Build a full mobile IDE.
* Replace Orca's underlying agent/runtime.
* Introduce a new backend or persistence architecture unnecessarily.
* Design the final standalone product before the controller UX has been validated.
* Maintain pixel/UX parity with upstream Orca Mobile.

## 4. Product principles

**Controller first.**
The primary job is observing, steering and managing remote work.

**Information over simulation.**
Expose the useful state of the development environment without pretending the phone is a desktop.

**UX is experimental.**
Navigation, information hierarchy and interaction patterns must remain easy to change.

**Orca-compatible, not Orca-dependent.**
Use Orca as the initial runtime adapter while keeping product capabilities behind application ports.

**No premature abstraction.**
Only abstract boundaries that enable compatibility, testing or eventual extraction.

## 5. MVP surface

Initial surface should cover:

* connection / pairing
* projects and workspaces
* active sessions
* session status and activity
* conversation / agent interaction
* task steering and intervention
* terminal/output where useful
* file tree / file inspection
* basic session/project navigation

Exact UX and information architecture remain intentionally open for iteration.

## 6. Compatibility constraint

The fork must remain compatible with the relevant upstream Orca Mobile interfaces and protocol.

Orca-specific implementation must therefore be isolated behind an explicit adapter boundary.

Upstream changes should be incorporable without requiring a rewrite of the controller product layer.

## 7. Extraction criterion

The controller experience becomes a candidate standalone application once its UX and capability model have stabilized.

Extraction should primarily consist of replacing/removing the Orca adapter and application shell—not rewriting the features themselves.
