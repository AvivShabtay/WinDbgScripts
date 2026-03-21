"use strict";

const log = (x) => host.diagnostics.debugLog(`${x}\n`);
const system = (x) => host.namespace.Debugger.Utility.Control.ExecuteCommand(x);
const asUint64 = (x) => host.evaluateExpression(`(unsigned int64) ${x}`);

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
const PFN_MASK = 0xfffffffff000; // From Intel SDM Volume 3c Section 29-12.
const PHYS_MASK_2MB = 0xfffffffe00000;
const PHYS_MASK_1GB = 0xfffffc0000000;

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

function readEptPtr() {
  const ept_root = 0x2466a01e;
  log(host.memory.physicalAddress(ept_root));
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

function getEptPml4() {
  const eptRoot = getCurrentEptPointer();
  return asUint64(eptRoot).bitwiseAnd(PFN_MASK);
}

class Address {
  constructor(address) {
    this.address = asUint64(address);
    this.pml4Index = this.address.bitwiseShiftRight(39).bitwiseAnd(0x1ff);
    this.pdptIndex = this.address.bitwiseShiftRight(30).bitwiseAnd(0x1ff);
    this.pdIndex = this.address.bitwiseShiftRight(21).bitwiseAnd(0x1ff);
    this.ptIndex = this.address.bitwiseShiftRight(12).bitwiseAnd(0x1ff);
    this.offsetInPhysAddressBase = this.address.bitwiseAnd(0x1ff);
  }
}

function getPdptBase(address) {
  const addressBits = new Address(address);
  const pml4Base = getEptPml4();

  let pdptBaseValue = read64(
    pml4Base.add(addressBits.pml4Index.multiply(8)),
    true,
  );
  pdptBaseValue = pdptBaseValue.bitwiseAnd(PFN_MASK);

  return pdptBaseValue;
}

function getPdBase(address) {
  const addressBits = new Address(address);
  const pdptBase = getPdptBase(address);

  let pdBaseValue = read64(
    pdptBase.add(addressBits.pdptIndex.multiply(8)),
    true,
  );
  pdBaseValue = pdBaseValue.bitwiseAnd(PFN_MASK);

  return pdBaseValue;
}

function getPtBase(address) {
  const addressBits = new Address(address);
  const pdBase = getPdBase(address);

  let ptBaseValue = read64(pdBase.add(addressBits.pdIndex.multiply(8)), true);
  ptBaseValue = ptBaseValue.bitwiseAnd(PFN_MASK);

  return ptBaseValue;
}

function getPte(address) {
  const addressBits = new Address(address);
  const ptBase = getPtBase(address);

  let pteValue = read64(ptBase.add(addressBits.ptIndex.multiply(8)), true);
  return pteValue;
}

function gpa2Hpa(gpa) {
  const eptPointer = getCurrentEptPointer();
  const pml4Base = eptPointer.bitwiseAnd(PFN_MASK);

  const address = new Address(gpa);

  // PML4 -> PDPT base
  const pml4Entry = read64(pml4Base.add(address.pml4Index.multiply(8)), true);
  const pdptBase = pml4Entry.bitwiseAnd(PFN_MASK);

  // PDPT -> PD base (or 1GB page)
  const pdptEntry = read64(pdptBase.add(address.pdptIndex.multiply(8)), true);
  if (pdptEntry.bitwiseAnd(0x80)) {
    // Huge page
    log(pdptEntry.toString(16));
    return pdptEntry
      .bitwiseAnd(PHYS_MASK_1GB)
      .bitwiseOr(gpa.bitwiseAnd(0x3fffffff));
  }

  const pdBase = pdptEntry.bitwiseAnd(PFN_MASK);

  // PD -> PT base (or 2MB page)
  const pdEntry = read64(pdBase.add(address.pdIndex.multiply(8)), true);
  if (pdEntry.bitwiseAnd(0x80)) {
    // Large Page
    return pdEntry
      .bitwiseAnd(PHYS_MASK_2MB)
      .bitwiseOr(gpa.bitwiseAnd(0x1fffff));
  }

  const ptBase = pdEntry.bitwiseAnd(PFN_MASK);

  // PT -> PTE
  const ptEntry = read64(ptBase.add(address.ptIndex.multiply(8)), true);

  // PTE -> HPA
  return ptEntry.bitwiseAnd(PFN_MASK).bitwiseOr(gpa.bitwiseAnd(0xfff));
}

function initializeScript() {
  return [
    new host.apiVersionSupport(1, 9),
    new host.functionAlias(gpa2Hpa, "gpa2hpa"),
  ];
}
