# etwtrace

A WinDbg JavaScript extension for tracing ETW (Event Tracing for Windows) events by monitoring calls to `ntdll!NtTraceEvent`.

## Dependencies

| File              | Description                                     |
| ----------------- | ----------------------------------------------- |
| `etwtrace.js`     | The WinDbg JavaScript extension                 |
| `etw.h`           | ETW type definitions                            |
| `etw_events.json` | Event name/group lookup table keyed by `HookId` |

## Prerequisites

- The hardcoded paths `ETW_DEFINITIONS_FILE_PATH` and `ETW_EVENTS_CONFIG_FILE_PATH` at the top of the script must match where `etw.h` and `etw_events.json` live on disk (see [Known Limitations](#known-limitations))

## Loading the Script

```
.scriptload C:\Dev\WinDbgScripts\scripts\etw\etwtrace.js
```

## Commands

| Command           | Description                                                                                                         |
| ----------------- | ------------------------------------------------------------------------------------------------------------------- |
| `!etwtrace`       | Print help.                                                                                                         |
| `!etwtrace_start` | Start tracing and logging ETW events, loads symbols, fetches ETW configurations, and sets a conditional breakpoint. |
| `!etwtrace_stop`  | Stops tracing ETW events, removes the breakpoint, and clears collected logs.                                        |
| `!etwtrace_logs`  | Return the collected trace log entries.                                                                             |

### Typical Session

```
0:000> .scriptload C:\Dev\WinDbgScripts\scripts\etw\etwtrace.js

0:000> !etwtrace_start
[etwtrace] Initializing...
[etwtrace] Loading combase.dll symbols...
[etwtrace] Setting conditional breakpoint on NtTraceEvent...
[etwtrace] Started

0:000> g
[NtTraceEvent]: HookId: 7202, Event: PERFINFO_LOG_TYPE_TP_CALLBACK_START, Caller: ntdll!TppWorkpExecuteCallback + 0x...

0:000> !etwtrace_stop
[etwtrace] Removing conditional breakpoint...
[etwtrace] Stopped
```

### Inspecting Logs

[TODO]

`!etwtrace_logs` returns a `Set` of log entries. Each entry contains:

| Field    | Description                                            |
| -------- | ------------------------------------------------------ |
| `id`     | The raw `HookId` value                                 |
| `caller` | Display string of the immediate caller (stack frame 1) |
| `stack`  | Full stack frame collection at time of call            |

You can iterate over them in the WinDbg command window:

```
dx @$result = Debugger.State.Scripts.etwtrace.Contents.etwTraceLogs()
dx @$result
```

## How It Works

`ntdll!NtTraceEvent` is the syscall used to submit ETW events to the kernel:

```c
NTSTATUS NtTraceEvent(
  HANDLE  TraceHandle,  // rcx
  ULONG   Flags,        // rdx
  ULONG   FieldSize,    // r8
  PVOID   Fields        // r9  ← pointer to the trace header / event data
);
```

The extension supports analyzing the fourth argument: `Fields`, converting it to a pointer to `_SYSTEM_TRACE_HEADER` (see [Known Limitations](#known-limitations)), reading the `HookId` member that represents the event ID (high byte = `group`, low byte = `event type`), then fetching the event name from the prepared JSON file, and logging the event data and information about the event initiator.

## Known Limitations

### Hardcoded Path

The WinDbg JavaScript engine does not expose a current-working-directory API, so we use hard-coded paths. Make sure to update this path.

### Supported Events

The extension currently only handles **"classic" / NT kernel logger events**, where the `Fields` argument pass to `NtTraceEvent`, points to `_SYSTEM_TRACE_HEADER` data structure.

## References

- [Geoff Chappell — Trace Headers](https://www.geoffchappell.com/studies/windows/km/ntoskrnl/inc/api/ntwmi/traceheaders/index.htm)
- [Geoff Chappell — SYSTEM_TRACE_HEADER](https://www.geoffchappell.com/studies/windows/km/ntoskrnl/inc/api/ntwmi/traceheaders/system_trace_header.htm)
- [Geoff Chappell — WMI_TRACE_PACKET / HookId](https://www.geoffchappell.com/studies/windows/km/ntoskrnl/inc/api/ntwmi/wmi_trace_packet/hookid.htm)
- [WinDbg JavaScript Reference](https://learn.microsoft.com/en-us/windows-hardware/drivers/debugger/javascript-debugger-scripting)
