"use strict";

const log = (x) => host.diagnostics.debugLog(`${x}\n`);
const system = (x) => host.namespace.Debugger.Utility.Control.ExecuteCommand(x);
const asUint64 = (x) => host.evaluateExpression(`(unsigned __int64) ${x}`);

function bits(value, offset, size) {
  let mask = host.Int64(1).bitwiseShiftLeft(size).subtract(1);
  return value.bitwiseShiftRight(offset).bitwiseAnd(mask).asNumber();
}

// Symbol Files
const SYMBOLS_FILE_PATHS = [
  "C:\\Dev\\WinDbgScripts\\scripts\\hyperv\\VMCS.h",
  "C:\\Dev\\WinDbgScripts\\scripts\\hyperv\\EPT.h",
];
let g_isSymbolsLoaded = false;

function loadHyperVTypes() {
  if (g_isSymbolsLoaded) {
    return;
  }

  for (let path of SYMBOLS_FILE_PATHS) {
    host.namespace.Debugger.Utility.Analysis.SyntheticTypes.ReadHeader(
      path,
      "hv",
    );
  }

  g_isSymbolsLoaded = true; // Cache
}

// For 25H2
const VMCS_OFFSET_FROM_GS_BASE = 0x2c680;
const VIRTUAL_PROCESSOR_OFFSET_FROM_GS_BASE = 0x358;
const VTL_OFFSET_FROM_VIRTUAL_PROCESSOR = 0x3c0;

// Globals
const PFN_MASK = 0x000fffffffff000;
const PFN_MASK_2M = 0x000ffffffe00000;
const PFN_MASK_1G = 0x000ffffffc00000;

const u8 = (x) => host.memory.readMemoryValues(x, 1, 1)[0];
const u16 = (x) => host.memory.readMemoryValues(x, 1, 2)[0];
const u32 = (x) => host.memory.readMemoryValues(x, 1, 4)[0];
const u64 = (x) => host.memory.readMemoryValues(x, 1, 8)[0];

function read64(x, phy = false) {
  if (phy) {
    x = host.memory.physicalAddress(x);
  }

  return host.memory.readMemoryValues(x, 1, 8)[0];
}

function getGsBase() {
  return host.parseInt64(system("dq gs:[0] L1")[0].split(" ")[2], 16);
}

function getCurrentVtlNumber() {
  const gsBase = getGsBase();
  const vp_address = u64(gsBase.add(VIRTUAL_PROCESSOR_OFFSET_FROM_GS_BASE));
  const vtl_number = u8(vp_address.add(VTL_OFFSET_FROM_VIRTUAL_PROCESSOR));
  return vtl_number;
}

function getCurrentVmcs() {
  const gsBase = getGsBase();
  const vmcs_address = u64(gsBase.add(VMCS_OFFSET_FROM_GS_BASE));

  loadHyperVTypes();
  return host.namespace.Debugger.Utility.Analysis.SyntheticTypes.CreateInstance(
    "HV_VMX_ENLIGHTENED_VMCS",
    vmcs_address,
  );
}

function getCurrentEptPointer() {
  const currentVmcs = getCurrentVmcs();
  const eptRoot = currentVmcs.EptRoot;
  return eptRoot;
}

class Address {
  constructor(address) {
    this.address = asUint64(address);
    this.pml4Index = bits(this.address, 39, 9);
    this.pdptIndex = bits(this.address, 30, 9);
    this.pdIndex = bits(this.address, 21, 9);
    this.ptIndex = bits(this.address, 12, 9);
  }
}

class EptEntry {
  constructor(raw) {
    this.raw = asUint64(raw);
  }

  isPresent() {
    return !(this.raw.bitwiseAnd(0x7) == 0);
  }

  isLargePage() {
    return !(this.raw.bitwiseAnd(0x80) == 0);
  }

  entry(index) {
    return this.raw.bitwiseAnd(PFN_MASK).add(index.multiply(8));
  }
}

function gpa2Hpa(gpa) {
  const address = new Address(gpa);

  const pml4 = new EptEntry(getCurrentEptPointer());
  if (!pml4.isPresent()) return;

  const pdpt = new EptEntry(read64(pml4.entry(address.pml4Index), true));
  if (!pdpt.isPresent()) return;

  const pd = new EptEntry(read64(pdpt.entry(address.pdptIndex), true));
  if (!pd.isPresent()) return;

  // 1GB huge page
  if (pd.isLargePage()) {
    return pd.raw.bitwiseAnd(PFN_MASK_1G).bitwiseOr(gpa.bitwiseAnd(0x3fffffff));
  }

  const pde = new EptEntry(read64(pd.entry(address.pdIndex), true));
  if (!pde.isPresent()) return;

  // 2MB large page
  if (pde.isLargePage()) {
    return pde.raw.bitwiseAnd(PFN_MASK_2M).bitwiseOr(gpa.bitwiseAnd(0x1fffff));
  }

  // 4KB page
  const pte = new EptEntry(read64(pde.entry(address.ptIndex), true));
  return pte.raw.bitwiseAnd(PFN_MASK).bitwiseOr(gpa.bitwiseAnd(0xfff));
}

function printUsage() {
  log(" HyperV Research Tools:");
  log("   !gpa2hpa <gpa>      ");
  log("   !vmcs               ");
  log("   !vtl                ");
}

function initializeScript() {
  printUsage();
  return [
    new host.apiVersionSupport(1, 9),
    new host.functionAlias(gpa2Hpa, "gpa2hpa"),
    new host.functionAlias(getCurrentVmcs, "vmcs"),
    new host.functionAlias(getCurrentVtlNumber, "vtl"),
  ];
}
