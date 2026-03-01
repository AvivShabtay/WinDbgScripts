"use strict";

const log = (x) => host.diagnostics.debugLog(`${x}\n`);
const system = (x) => host.namespace.Debugger.Utility.Control.ExecuteCommand(x);

// Global
let etwTraceManager = null;

function getEtwTraceManager() {
  if (etwTraceManager == null) {
    throw new Error("EtwTraceManager isn't initialized yet");
  }

  return etwTraceManager;
}

class EtwTraceManager {
  static #isCombaseLoaded = false;
  static #etwEventsConfig = null;

  #etwTraceLogger = new Set();
  #conditionalBreakpoint = null;

  start() {
    log("[etwtrace] Loading combase.dll symbols...");
    this.#loadCombase();

    log("[etwtrace] Setting conditional breakpoint on NtTraceEvent...");
    this.#conditionalBreakpoint = new ConditionalBreakpoint(
      "ntdll!NtTraceEvent",
      "@$scriptContents.onNtTraceEventCall()",
    );

    log("[etwtrace] Started");
  }

  stop() {
    log("[etwtrace] Removing conditional breakpoint...");
    this.#conditionalBreakpoint.remove();

    log("[etwtrace] Stopped");
  }

  #loadCombase() {
    if (EtwTraceManager.#isCombaseLoaded) {
      return;
    }

    system(".reload /f combase.dll");
    // TODO Access to the loaded symbols and verify it's really loaded.

    EtwTraceManager.#isCombaseLoaded = true;
  }

  addLog(id, stack, caller) {
    this.#etwTraceLogger.add({
      id,
      stack,
      caller,
    });
  }

  loadEtwEventsConfig() {
    if (EtwTraceManager.#etwEventsConfig != null) {
      return;
    }
    EtwTraceManager.#etwEventsConfig = new EtwEventsConfig(
      readEtwEventsConfig(),
    );
  }

  getEtwEventsConfig() {
    return EtwTraceManager.#etwEventsConfig;
  }

  getLogs() {
    return this.#etwTraceLogger;
  }
}

/**
    https://www.geoffchappell.com/studies/windows/km/ntoskrnl/inc/api/ntwmi/traceheaders/index.htm
*/
const SYSTEM_HEADER_TYPES = [
  0x1, // TRACE_HEADER_TYPE_SYSTEM32
  0x2, // TRACE_HEADER_TYPE_SYSTEM64
  0x3, // TRACE_HEADER_TYPE_COMPACT32
  0x4, // TRACE_HEADER_TYPE_COMPACT64
];

/**
  Registry of events information.
*/
class EtwEventsConfig {
  #eventsByHookId;
  #groupsByType;

  constructor(json) {
    this.#eventsByHookId = new Map(
      json.events.map((e) => [parseInt(e.value, 16), e.name]),
    );

    this.#groupsByType = new Map(
      json.eventTypes.map((e) => [parseInt(e.type, 16), e.name]),
    );
  }

  getEventName(hookId) {
    return (
      this.#eventsByHookId.get(hookId) ??
      `<unknown event: 0x${hookId.toString(16)}>`
    );
  }

  getEventGroup(hookId) {
    return (
      this.#groupsByType.get(hookId & 0xff00) ??
      `<unknown group: 0x${(hookId & 0xff00).toString(16)}>`
    );
  }
}

class ConditionalBreakpoint {
  #id;

  constructor(location, condition) {
    system(`bp /w "${condition}" ${location}`);
    this.#id = this.#findBreakpoint(location, condition);
  }

  #findBreakpoint(location, condition) {
    for (let bp of host.currentProcess.Debug.Breakpoints) {
      if (bp.Location === location && bp.Condition === condition) {
        return bp.UniqueID;
      }
    }
    throw new Error("Could not find the conditional breakpoint ID");
  }

  remove() {
    host.currentProcess.Debug.Breakpoints[this.#id].Remove();
  }
}

/**
  Reads the `etw_events.json` file. 
  Unfortunately the Javascript extensions engine doesn't provide a way to get 
  the current-working-directory, so I used hard-coded path.
*/
function readEtwEventsConfig() {
  const fs = host.namespace.Debugger.Utility.FileSystem;
  const etwEventsFile = fs.OpenFile(
    "C:\\Dev\\WinDbgScripts\\scripts\\etw\\etw_events.json",
  );

  const reader = fs.CreateTextReader(etwEventsFile);

  let etwEventsData = "";
  for (let line of reader.ReadLineContents()) {
    etwEventsData += line.trim();
  }

  const etwEventsJson = JSON.parse(etwEventsData);

  etwEventsFile.Close();
  return etwEventsJson;
}

/**
  Captures the current thread's call stack.
  `host.currentThread.Stack.Frames` is a live reference to the debugger's thread
  state, so we need to store the data through the execution of the extension.
*/
function captureThreadStack() {
  return Array.from(host.currentThread.Stack.Frames).map((f) =>
    f.ToDisplayString(),
  );
}

/**
  Parses the `Fields` argument of NtTraceEvent as a `_SYSTEM_TRACE_HEADER`.
  Returns the extracted `hookId`.

  Currently supports only classic / NT kernel logger events.
  See: https://www.geoffchappell.com/studies/windows/km/ntoskrnl/inc/api/ntwmi/traceheaders/system_trace_header.htm

  TODO: Check HeaderType and add a separate path for manifest-based providers
  (EVENT_HEADER, HeaderType == 0).
*/
function parseSystemTraceHeader(eventDataPtr) {
  const traceHeader = host.createPointerObject(
    eventDataPtr,
    "combase",
    "_SYSTEM_TRACE_HEADER*",
  );

  // `HookId` tells what type of event is logged.
  // https://www.geoffchappell.com/studies/windows/km/ntoskrnl/inc/api/ntwmi/wmi_trace_packet/hookid.htm
  return { hookId: traceHeader.Packet.HookId };
}

/**
  Breakpoint callback for ntdll!NtTraceEvent.

  To manually register this breakpoint:
    `bp /w "@$scriptContents.onNtTraceEventCall()" ntdll!NtTraceEvent`

  To only log the HookId without this script:
    `bp ntdll!NtTraceEvent "dx ((combase!_SYSTEM_TRACE_HEADER*) @r9)->Packet->HookId"`
*/
function onNtTraceEventCall() {
  const { hookId } = parseSystemTraceHeader(
    host.currentThread.Registers.User.r9,
  );

  const mgr = getEtwTraceManager();
  mgr.loadEtwEventsConfig();
  const eventName = mgr.getEtwEventsConfig().getEventName(hookId);

  const stack = captureThreadStack();
  const caller = stack[1];

  mgr.addLog(hookId, stack, caller);
  log(
    `[NtTraceEvent]: HookId: ${hookId}, Event: ${eventName}, Caller: ${caller}`,
  );

  return false; // Do not break
}

function etwTraceLogs() {
  return getEtwTraceManager().getLogs();
}

function etwTraceStart() {
  if (etwTraceManager != null) {
    log("[etwtrace] Already started");
    return;
  }

  log("[etwtrace] Initializing...");
  etwTraceManager = new EtwTraceManager();
  etwTraceManager.start();
}

function etwTraceStop() {
  if (etwTraceManager == null) {
    log("[etwtrace] You must call `!etwtrace_start` first");
    return;
  }

  etwTraceManager.stop();
  etwTraceManager = null;
}

function etwTracePrintHelp() {
  log("etwtrace utility.");
  log("Usage:");
  log(" !etwtrace       - prints this help.");
  log(" !etwtrace_start - starts tracing ETW events.");
  log(" !etwtrace_stop  - stops tracing ETW events.");
  log(" !etwtrace_logs  - prints information about the collected ETW traces.");
  log("");
}

function initializeScript() {
  return [
    new host.apiVersionSupport(1, 9),
    new host.functionAlias(etwTracePrintHelp, "etwtrace"),
    new host.functionAlias(etwTraceStart, "etwtrace_start"),
    new host.functionAlias(etwTraceLogs, "etwtrace_logs"),
    new host.functionAlias(etwTraceStop, "etwtrace_stop"),
  ];
}
