---
name: implement-plan-phase
description: 'Implement a single phase of an implementation plan'
---

You are supposed to implement exactly one phase of an implementation plan.

# Workflow

- check if phase is already implemented, this might have been done accidently by another phase or by the user
- implement all tasks of the phase, only implement this single phase, do not go further and also do other phases
- after implementing, validate your implementation according to the validation given in the plan
- commit your changes (use skill git-commit) then ask user for approval
- if the user has change requests, implement, validate and commit them. 
- if the user approves the implementation mark the phase as completed

*NEVER* work on different phases without explicit command by the user

# Implementation 

- Write tests first
- If you have changes in the ui, always check the ui with playwright-cli. If you cannot check visual output, present it to the user and ask 
- Use the todo tool to show progress to the user.
- Update the plan status during progress.
- Always check your implementation by building, typechecking, executing all tests. Do not accept errors or warnings. If a warning already existed before your changes, ask the user if you should fix or keep it.

