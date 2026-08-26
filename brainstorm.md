# Project: Flow — Adaptive Computer Interface

## Role

You are the lead software engineer helping me build the first software prototype for a new consumer hardware company.

The eventual product is an intelligent, modular keyboard that adapts to how people work.

The software is called **Flow**.

The physical keyboard will be built later using a custom PCB, STM32 microcontroller, displays, rotary encoders, buttons, and modular hardware.

Your job right now is to build the **software brain and development platform** that will eventually communicate with that hardware.

Do NOT attempt to build the physical keyboard yet.

Build the software in a way that makes adding the hardware later straightforward.

---

# 1. Product Vision

The current keyboard is mostly static.

Flow is intended to make the computer interface adaptive.

The system should:

1. Detect which application the user is currently using.
2. Load a contextual profile for that application.
3. Change the functions shown on the Flow interface.
4. Allow the user to customize those functions.
5. Observe high-level workflow behavior with explicit user permission.
6. Identify repeated actions or sequences.
7. Suggest useful shortcuts/macros.
8. Learn from what the user accepts, rejects, or ignores.
9. Eventually communicate all of this to a physical modular keyboard.

The long-term product is:

**Hardware + Flow software + AI + modular ecosystem**

The first MVP is:

**Flow software + simulated keyboard**

---

# 2. Critical Privacy Principle

This is extremely important.

Flow must NOT secretly record everything the user types.

Do not store:

* raw typed text
* passwords
* message contents
* browser contents
* clipboard contents unless explicitly requested for a future feature
* screenshots without explicit permission
* sensitive personal information

The MVP should focus on **interaction metadata**, not content.

Examples of acceptable metadata:

* active application
* application name
* timestamp
* keyboard shortcut used
* number of times a shortcut was used
* sequence of shortcuts
* which Flow control was activated
* which suggestion the user accepted/rejected

Every workflow-monitoring feature must have:

**Enabled / Disabled**

and clearly explain what is being observed.

Build privacy into the architecture rather than adding it later.

---

# 3. Initial Platform

Build for **Windows first**, because that is my primary development environment.

However, architect the application so macOS support can be added later.

Use a clean abstraction layer for OS-specific functionality.

Recommended stack:

* Electron
* React
* TypeScript
* Vite
* Node.js
* SQLite for local persistence
* Rust or native Node modules only where necessary for Windows-level functionality
* Tailwind CSS or another lightweight styling system
* Vitest/Jest for unit testing
* Playwright for application-level testing where practical

Do not over-engineer the stack.

Prioritize a working product.

---

# 4. Application Architecture

Create a modular architecture similar to:

/src
/main
/os
/applications
/keyboard
/workflow
/ai
/hardware
/database
/renderer
/components
/pages
/hooks
/stores
/styles
/shared
/types
/constants

The following systems should be independent:

## Application Detection

Responsible for determining the currently active application.

Example:

VS Code

Adobe Premiere Pro

Chrome

Spotify

Figma

Photoshop

etc.

Expose a clean interface such as:

getActiveApplication()

which returns something like:

{
id: "vscode",
name: "Visual Studio Code",
processName: "Code.exe"
}

Do not hard-code the entire product around these examples.

Applications should be represented through configurable profiles.

---

# 5. Profile System

Create an application profile system.

Each application profile should contain:

* application ID
* application name
* icon
* controls
* shortcuts
* macros
* module recommendations
* user customizations

Example:

VS Code profile:

Control 1:
RUN

Control 2:
DEBUG

Control 3:
TERMINAL

Control 4:
SEARCH

Premiere profile:

Control 1:
CUT

Control 2:
RIPPLE DELETE

Control 3:
TIMELINE

Control 4:
EXPORT

Spotify profile:

Control 1:
PREVIOUS

Control 2:
PLAY/PAUSE

Control 3:
NEXT

Control 4:
VOLUME

These are only initial example profiles.

Make the profile system extensible.

---

# 6. Flow Dashboard

Create a beautiful desktop dashboard.

The visual direction should be:

* premium
* minimal
* dark
* technical
* consumer hardware
* understated
* NOT gamer/RGB/cyberpunk
* inspired by premium industrial design

Think:

Apple
Teenage Engineering
Nothing
Whoop
Linear

Do not copy any of these brands.

The interface should feel like a serious hardware startup.

---

# 7. Main Dashboard

The home screen should show:

## Current Application

Example:

Visual Studio Code

"Active profile: Developer"

## Current Controls

Show four contextual controls.

Example:

[ RUN ]

[ DEBUG ]

[ TERMINAL ]

[ SEARCH ]

Each control should be visually represented as if it were a physical keyboard module.

## Flow Status

Example:

Flow is learning your workflow.

Actions observed today: 147

Patterns detected: 8

Suggestions: 3

These numbers should come from actual local data.

Do not fake statistics in the final implementation.

---

# 8. Hardware Simulator

This is extremely important.

Before I manufacture the physical keyboard, I need to be able to simulate it.

Build a "Virtual Keyboard" page.

It should visually represent the eventual hardware.

Show:

* keyboard keys
* contextual buttons
* rotary encoders
* displays
* modular slots

The virtual keyboard should respond when:

* the active application changes
* the user changes profiles
* a control is activated
* a macro runs
* Flow makes a suggestion

For example:

Open Premiere.

The simulated keyboard should automatically change:

[ CUT ]

[ RIPPLE ]

[ ZOOM ]

[ SPEED ]

Open VS Code.

It should automatically change:

[ RUN ]

[ DEBUG ]

[ TERMINAL ]

[ SEARCH ]

This simulator will later be replaced/connected to the real STM32 hardware.

---

# 9. Hardware Abstraction Layer

Create a hardware interface that does not depend directly on the simulator.

For example:

interface HardwareDevice {
connect(): Promise<void>
disconnect(): Promise<void>
setControls(controls): Promise<void>
updateDisplay(displayId, content): Promise<void>
setLEDState(...): Promise<void>
sendCommand(...): Promise<void>
getStatus(): Promise<DeviceStatus>
}

Then implement:

1. VirtualHardwareDevice
2. Future USBHardwareDevice
3. Future SerialHardwareDevice

The virtual device should be fully functional now.

The future STM32 device should be easy to implement later.

Do NOT pretend that the real hardware exists.

---

# 10. Modular Hardware System

Create a software representation of modules.

Examples:

* Macro Module
* Rotary Encoder Module
* Slider Module
* Display Module
* Numpad Module
* Creator Module

Each module should have:

* ID
* name
* type
* capabilities
* controls
* position
* configuration

The user should be able to:

* add module
* remove module
* rearrange module
* configure module
* assign functions

The virtual keyboard should visually update when modules change.

---

# 11. Workflow Learning

This is the core of Flow.

Do NOT immediately build a generic chatbot.

Flow's AI should initially focus on understanding workflows.

Collect only approved interaction metadata.

Examples:

Application:
VS Code

Action:
Ctrl + Shift + P

Count:
47

Application:
Premiere

Action:
Cut

Count:
81

Sequence:

Copy → Switch Window → Paste

Count:
26

Flow should identify repeated behavior.

Initially, use deterministic/statistical logic rather than an expensive LLM for everything.

Build a pattern-detection engine that can identify:

* repeated shortcuts
* repeated actions
* repeated sequences
* frequently used controls
* underused controls
* application-specific behavior

---

# 12. AI Suggestion Engine

Build an AI/suggestion layer above the workflow engine.

The AI should turn detected patterns into useful suggestions.

Example:

"You've used Command Palette 47 times in VS Code today. Would you like to assign it to Control 1?"

Another:

"You've repeated Copy → Switch Window → Paste 26 times. Would you like to create a macro?"

Another:

"You frequently adjust timeline position in Premiere. A rotary encoder may be useful for this workflow."

The suggestions should have:

* explanation
* confidence
* accept button
* reject button
* dismiss button

Track whether the user accepts/rejects each suggestion.

This feedback should influence future suggestions.

---

# 13. AI Architecture

Create an abstraction:

AIProvider

with support for:

* Local/rule-based suggestions
* Optional LLM provider later

Do not make the entire application dependent on an external API.

The first MVP should function without an API key.

If an LLM integration is added, isolate it behind the AIProvider interface.

Never send raw keystrokes or private user content to an external AI model.

Only send sanitized workflow metadata when explicitly enabled.

---

# 14. Learning Loop

The core Flow loop should be:

OBSERVE

↓

IDENTIFY PATTERN

↓

GENERATE SUGGESTION

↓

USER ACCEPTS / REJECTS

↓

UPDATE USER MODEL

↓

IMPROVE FUTURE SUGGESTIONS

Build this as an explicit architecture.

---

# 15. User Profiles

Create user profiles.

A profile should contain:

* preferred applications
* control mappings
* modules
* macros
* accepted suggestions
* rejected suggestions
* learned workflow patterns
* preferences

Initially everything can remain local.

Eventually this can support cloud synchronization.

---

# 16. Macro System

Create a macro system.

A macro should contain:

* name
* application
* trigger
* sequence
* delay
* enabled/disabled

Example:

Name:
Open Development Environment

Trigger:
Flow Control 1

Actions:

1. Open VS Code
2. Open terminal
3. Open browser
4. Run development command

Make the system extensible.

However, be conservative about automating potentially dangerous actions.

Do not create destructive automation without confirmation.

---

# 17. Contextual UI

When the active application changes, the Flow interface should visibly transition.

Example:

User switches:

Chrome → VS Code

The interface updates.

Show a subtle transition:

"VS Code profile active"

Then update:

Controls
Modules
Shortcuts
Recommendations

The experience should feel instantaneous.

---

# 18. Keyboard Control Mapping

Create a visual editor.

The user should be able to select:

Control 1

and choose:

* Shortcut
* Application action
* Macro
* Launch application
* System command
* Flow action

For example:

Control 1:

Name:
Run

Shortcut:
Ctrl + F5

Application:
VS Code

---

# 19. Flow Insights

Create a page showing useful workflow analytics.

Examples:

Most used applications

Most used shortcuts

Most common action sequences

Time spent in applications

Most used Flow controls

Suggestions accepted

Suggestions rejected

Potential automation opportunities

Do not make this feel like a productivity surveillance dashboard.

The purpose is:

**"Understand how you work and help you improve your interface."**

---

# 20. Developer Mode

Create a developer mode for me as the hardware engineer.

It should expose:

* hardware connection status
* virtual device status
* USB/serial status
* module detection
* current control mappings
* incoming events
* outgoing commands
* display updates
* firmware communication logs

This will be essential when I build the STM32 hardware.

---

# 21. Future STM32 Protocol

Design a simple documented communication protocol between the software and future hardware.

For example:

HOST → DEVICE

SET_CONTROL

SET_DISPLAY

SET_LED

SET_PROFILE

PING

GET_STATUS

DEVICE → HOST

BUTTON_PRESS

ENCODER_ROTATE

MODULE_CONNECTED

MODULE_DISCONNECTED

DEVICE_STATUS

The exact protocol can be refined later.

Document it clearly in:

/docs/hardware-protocol.md

---

# 22. Branding

Use the temporary product/company name:

# FLOW

Do not permanently assume this will be the final company name.

Treat Flow as the name of the software/intelligence layer.

The eventual hardware company will have a separate brand.

Design the UI so the company name can easily be changed later.

---

# 23. Landing Page

Create a simple landing page inside the project that communicates the product concept.

Headline:

"Your computer changes. Your interface should too."

Supporting copy:

"Flow learns how you work and transforms your physical controls around the software you're using."

Show:

* contextual controls
* adaptive workflow
* modular hardware
* AI suggestions

This is a prototype landing page, not a production website.

---

# 24. Demo Mode

Build a polished demo mode.

I should be able to launch the application and demonstrate:

1. Start in VS Code.
2. Show contextual controls.
3. Switch to Premiere.
4. Show controls changing.
5. Simulate repetitive workflow.
6. Flow detects the pattern.
7. Flow generates a suggestion.
8. Accept the suggestion.
9. Show the new control assignment.
10. Switch applications.
11. Show the interface adapting again.

This demo is extremely important.

It will eventually be used for:

* YouTube
* TikTok
* Purdue Innovates
* investor presentations
* user testing

---

# 25. Development Philosophy

Do not build unnecessary features.

Prioritize:

1. Working functionality
2. Clean architecture
3. Excellent UX
4. Hardware extensibility
5. Privacy
6. Easy experimentation

Avoid:

* unnecessary microservices
* complex cloud infrastructure
* unnecessary authentication
* subscription systems
* fake AI
* fake analytics
* fake hardware
* unnecessary animations

This is an early-stage hardware startup prototype.

Speed matters.

---

# 26. Build Order

Do NOT try to implement everything simultaneously.

Follow this order:

## Phase 1

Set up the project.

Build:

* Electron
* React
* TypeScript
* database
* basic UI
* architecture

## Phase 2

Build:

* application detection
* profile system
* contextual controls

## Phase 3

Build:

* virtual keyboard
* virtual modules
* hardware abstraction layer

## Phase 4

Build:

* workflow event collection
* pattern detection
* local analytics

## Phase 5

Build:

* suggestion engine
* accept/reject feedback
* learning loop

## Phase 6

Build:

* macro system
* customizable controls

## Phase 7

Build:

* developer mode
* hardware protocol
* future STM32 interface

## Phase 8

Build:

* polished demo mode
* landing page
* onboarding
* documentation
* testing

---

# 27. How You Should Work

Before writing large amounts of code:

1. Inspect the repository.
2. Create the architecture.
3. Explain the implementation plan.
4. Implement one phase.
5. Run it.
6. Test it.
7. Fix problems.
8. Only then move to the next phase.

Do not generate a giant codebase without testing.

After each major phase, tell me:

* what was built
* what works
* what doesn't
* what files changed
* how to run it
* how I can test it manually
* what the next logical step is

---

# 28. Testing

Write tests for:

* application profile loading
* control mappings
* workflow pattern detection
* suggestion generation
* suggestion acceptance/rejection
* module management
* macro creation
* hardware abstraction
* database persistence

Create realistic test data.

Do not rely only on screenshots or manual testing.

---

# 29. The First Milestone

The first milestone is NOT the complete product.

The first milestone is:

## "The keyboard changes when I change applications."

I should be able to:

1. Launch Flow.
2. Open VS Code.
3. See VS Code controls.
4. Switch to Premiere.
5. See Premiere controls.
6. Open the virtual keyboard.
7. See the physical controls change.
8. Trigger a virtual control.
9. See the corresponding action execute.

Once this works, move on.

---

# 30. The Second Milestone

The second milestone is:

## "Flow learns something about me."

I should be able to:

1. Use an application.
2. Perform a repeated workflow.
3. Flow detects the pattern.
4. Flow explains what it found.
5. Flow suggests an optimization.
6. I accept it.
7. The keyboard/control mapping changes.
8. The system remembers the decision.

---

# 31. The Third Milestone

The third milestone is:

## "The software is ready for my hardware."

I should be able to replace:

VirtualHardwareDevice

with:

STM32HardwareDevice

without rewriting the application architecture.

The physical keyboard should eventually be able to:

* receive control mappings
* update displays
* receive LED commands
* send button events
* send encoder events
* report connected modules

---

# 32. Important Product Principle

The keyboard itself is NOT the product.

The product is:

# An adaptive human-computer interface.

The keyboard is the first hardware implementation.

Flow is the intelligence layer.

Modules are the physical ecosystem.

The long-term goal is to create hardware that adapts to the person rather than forcing the person to adapt to the hardware.

Keep this principle in mind when making architecture decisions.

---

# Start Now

Begin by inspecting the repository and environment.

Then:

1. Propose the initial architecture.
2. Create the project.
3. Build Phase 1.
4. Run the application.
5. Verify it works.
6. Continue into Phase 2 only after Phase 1 is functional.

Do not ask me unnecessary questions.

Make reasonable engineering decisions yourself.

If there are multiple viable options, choose the simplest one that keeps the system extensible.

The final result should be a **real, runnable desktop application**, not a mockup.

I will eventually build a custom STM32 keyboard that communicates with this software, so treat the hardware interface as a first-class architectural concern from day one.
